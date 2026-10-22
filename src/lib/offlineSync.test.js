import { describe, it, expect } from 'vitest';
import {
    mergeStateHelper,
    preserveReferencedClients,
    placeholderClientFor,
    uploadRows,
} from './syncLogic';

// ─────────────────────────────────────────────────────────────────────────────
// Sincronización tras una ruta offline (sales_clientId_fkey)
//
// Caso real: un repartidor trabajó toda la ruta sin internet y al reconectar
// quedaron 23 registros sin subir porque UNA venta apuntaba a un cliente que no
// existía en la nube — el upsert en lote es todo-o-nada y bloqueaba todo.
// ─────────────────────────────────────────────────────────────────────────────

// Supabase simulado: upsert todo-o-nada por lote, con la llave foránea sales → clients.
function fakeCloud({ clients = [], rejectClients = false, failAfterCalls = Infinity } = {}) {
    const db = { clients: new Map(clients.map(c => [c.id, c])), sales: new Map() };
    let calls = 0;
    const upsert = async (table, rows) => {
        if (++calls > failAfterCalls) throw new Error('Tiempo de espera agotado (sales)');
        if (table === 'clients' && rejectClients) {
            return { error: { message: 'new row violates row-level security policy' } };
        }
        if (table === 'sales' && rows.some(r => !db.clients.has(r.clientId))) {
            return { error: { message: 'insert or update on table "sales" violates foreign key constraint "sales_clientId_fkey"' } };
        }
        rows.forEach(r => db[table].set(r.id, r));
        return { error: null };
    };
    return { db, upsert };
}

const sale = (id, clientId, extra = {}) =>
    ({ id, clientId, userId: 'rep1', total: 100, date: '2026-10-10T12:00:00Z', items: [], synced: false, ...extra });

describe('uploadRows', () => {
    it('sube todo el lote cuando no hay errores', async () => {
        const { db, upsert } = fakeCloud({ clients: [{ id: 'c1' }] });
        const res = await uploadRows({ tableName: 'sales', rows: [sale('s1', 'c1'), sale('s2', 'c1')], upsert });
        expect(res.error).toBeNull();
        expect([...res.uploadedIds]).toEqual(['s1', 's2']);
        expect(db.sales.size).toBe(2);
    });

    it('no llama a la nube si no hay pendientes', async () => {
        let called = false;
        const res = await uploadRows({ tableName: 'sales', rows: [], upsert: async () => { called = true; return {}; } });
        expect(called).toBe(false);
        expect(res.uploadedIds.size).toBe(0);
    });

    it('una venta huérfana NO bloquea a las demás: re-sube su cliente local', async () => {
        const { db, upsert } = fakeCloud({ clients: [{ id: 'c1' }] });
        const localClient = { id: 'c-offline', name: 'Abarrotes Lupita', userId: 'rep1' };
        const rows = [sale('s1', 'c1'), sale('s2', 'c-offline'), sale('s3', 'c1')];

        const res = await uploadRows({
            tableName: 'sales', rows, upsert,
            findClient: id => (id === 'c-offline' ? localClient : undefined),
        });

        expect(res.error).toBeNull();
        expect([...res.uploadedIds].sort()).toEqual(['s1', 's2', 's3']);
        expect(res.uploadedClients).toEqual([localClient]);
        expect(db.clients.get('c-offline').name).toBe('Abarrotes Lupita');
    });

    it('si el cliente no existe en ningún lado, crea "Cliente recuperado" y la venta sube igual', async () => {
        const { db, upsert } = fakeCloud();
        const res = await uploadRows({ tableName: 'sales', rows: [sale('s1', 'c-borrado')], upsert });

        expect(res.error).toBeNull();
        expect(res.uploadedIds.has('s1')).toBe(true);
        expect(db.clients.get('c-borrado')).toMatchObject({ name: 'Cliente recuperado', userId: 'rep1' });
    });

    it('si el cliente no se puede subir, solo esa venta queda pendiente y el error lo explica', async () => {
        const { db, upsert } = fakeCloud({ clients: [{ id: 'c1' }], rejectClients: true });
        const res = await uploadRows({
            tableName: 'sales', rows: [sale('s1', 'c1'), sale('s2', 'c-x')], upsert,
            findClient: () => ({ id: 'c-x', name: 'Tienda X' }),
        });

        expect([...res.uploadedIds]).toEqual(['s1']);
        expect(db.sales.has('s2')).toBe(false);
        expect(res.error).toMatch(/Tienda X/);
        expect(res.error).toMatch(/row-level security/);
    });

    it('un timeout del lote se propaga (sin red no reintenta fila por fila)', async () => {
        const { upsert } = fakeCloud({ failAfterCalls: 0 });
        await expect(uploadRows({ tableName: 'sales', rows: [sale('s1', 'c1')], upsert }))
            .rejects.toThrow(/Tiempo de espera/);
    });

    it('si se cae la red a media pasada, conserva lo subido y deja el resto pendiente', async () => {
        // llamada 1: lote (falla por FK), 2: s1 ok, 3: s2 → timeout
        const { upsert } = fakeCloud({ clients: [{ id: 'c1' }], failAfterCalls: 2 });
        const res = await uploadRows({
            tableName: 'sales', rows: [sale('s1', 'c1'), sale('s2', 'c-x'), sale('s3', 'c1')], upsert,
        });

        expect([...res.uploadedIds]).toEqual(['s1']);
        expect(res.error).toMatch(/Tiempo de espera/);
    });

    it('en otras tablas aísla la fila mala sin intentar rescates de cliente', async () => {
        const upsert = async (_t, rows) =>
            rows.some(r => r.bad) ? { error: { message: 'violates check constraint' } } : { error: null };
        const res = await uploadRows({ tableName: 'expenses', rows: [{ id: 'e1' }, { id: 'e2', bad: true }], upsert });
        expect([...res.uploadedIds]).toEqual(['e1']);
        expect(res.uploadedClients).toEqual([]);
        expect(res.error).toMatch(/check constraint/);
    });
});

describe('placeholderClientFor', () => {
    it('conserva el id del cliente y el repartidor de la venta (acepta columnas lowercase)', () => {
        expect(placeholderClientFor({ clientid: 'c9', userid: 'rep2', paymentmethod: 'transferencia' }))
            .toMatchObject({ id: 'c9', userId: 'rep2', paymentMethod: 'transferencia', name: 'Cliente recuperado' });
    });
});

describe('preserveReferencedClients', () => {
    it('conserva un cliente borrado en la nube si una venta pendiente lo usa', () => {
        const local = [{ id: 'c1', synced: true }, { id: 'c2', name: 'Lupita', synced: true }];
        const merged = [{ id: 'c1', synced: true }]; // c2 ya no viene del servidor
        const result = preserveReferencedClients(merged, local, [sale('s1', 'c2')]);
        expect(result.find(c => c.id === 'c2')).toEqual({ id: 'c2', name: 'Lupita', synced: false });
    });

    it('deja ir clientes borrados si solo los usan ventas ya sincronizadas', () => {
        const result = preserveReferencedClients([], [{ id: 'c2', synced: true }], [sale('s1', 'c2', { synced: true })]);
        expect(result).toEqual([]);
    });

    it('no duplica clientes que siguen en el servidor', () => {
        const merged = [{ id: 'c1', synced: true }];
        expect(preserveReferencedClients(merged, merged, [sale('s1', 'c1')])).toBe(merged);
    });
});

describe('ruta offline completa', () => {
    it('23 pendientes, cliente creado offline y borrado de la nube → fetch + upload sube todo', async () => {
        const localClients = [{ id: 'c-nuevo', name: 'Cremería Sol', userId: 'rep1', synced: true }];
        const localSales = Array.from({ length: 23 }, (_, i) => sale(`s${i}`, i === 5 ? 'c-nuevo' : 'c1'));
        const { db, upsert } = fakeCloud({ clients: [{ id: 'c1' }] });

        // Igual que fetchFromSupabase: merge con lo del servidor, rescatando clientes referenciados
        const sales = mergeStateHelper(localSales, []);
        const clients = preserveReferencedClients(
            mergeStateHelper(localClients, [...db.clients.values()]), localClients, sales
        );
        const pendingClients = clients.filter(c => !c.synced);
        expect(pendingClients.map(c => c.id)).toEqual(['c-nuevo']);

        // Igual que syncToSupabase: clients antes que sales
        await uploadRows({ tableName: 'clients', rows: pendingClients, upsert });
        const res = await uploadRows({ tableName: 'sales', rows: sales.filter(s => !s.synced), upsert });

        expect(res.error).toBeNull();
        expect(res.uploadedIds.size).toBe(23);
        expect(db.clients.get('c-nuevo').name).toBe('Cremería Sol');
    });
});
