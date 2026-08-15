import { describe, it, expect } from 'vitest';
import {
    COLUMN_MAP,
    REVERSE_COLUMN_MAP,
    FALLBACK_COLUMNS,
    mergeStateHelper,
    normalizeRow,
    buildSafePayload,
    countPending,
} from './syncLogic';

// ─────────────────────────────────────────────────────────────────────────────
// mergeStateHelper
// ─────────────────────────────────────────────────────────────────────────────
describe('mergeStateHelper', () => {
    it('devuelve localItems si freshItems es null/undefined', () => {
        const local = [{ id: '1', synced: false }];
        expect(mergeStateHelper(local, null)).toEqual(local);
        expect(mergeStateHelper(local, undefined)).toEqual(local);
    });

    it('devuelve [] si ambos son vacíos', () => {
        expect(mergeStateHelper([], [])).toEqual([]);
    });

    it('marca los items del servidor como synced: true', () => {
        const fresh = [{ id: 'a', name: 'Queso' }];
        const result = mergeStateHelper([], fresh);
        expect(result).toEqual([{ id: 'a', name: 'Queso', synced: true }]);
    });

    it('preserva items locales NO sincronizados sobre la versión del servidor', () => {
        const local = [{ id: 'x', name: 'Local editado', synced: false }];
        const fresh = [{ id: 'x', name: 'Versión servidor', synced: true }];
        const result = mergeStateHelper(local, fresh);
        // El item local sin sync gana; el del servidor se descarta
        expect(result).toEqual([{ id: 'x', name: 'Local editado', synced: false }]);
    });

    it('combina items nuevos del servidor con items locales sin sync', () => {
        const local = [{ id: 'local1', synced: false }];
        const fresh = [{ id: 'server1', name: 'S1' }, { id: 'server2', name: 'S2' }];
        const result = mergeStateHelper(local, fresh);
        expect(result).toHaveLength(3);
        // Los del servidor quedan marcados como synced
        expect(result.filter(i => i.synced === true)).toHaveLength(2);
        // El local sin sync se conserva
        expect(result.find(i => i.id === 'local1').synced).toBe(false);
    });

    it('no duplica items que ya están sincronizados localmente', () => {
        const local = [{ id: 'a', name: 'Queso', synced: true }];
        const fresh = [{ id: 'a', name: 'Queso fresco' }];
        const result = mergeStateHelper(local, fresh);
        // El local sincronizado se reemplaza por la versión fresca del servidor
        expect(result).toEqual([{ id: 'a', name: 'Queso fresco', synced: true }]);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// normalizeRow
// ─────────────────────────────────────────────────────────────────────────────
describe('normalizeRow', () => {
    it('agrega aliases camelCase a partir de columnas lowercase', () => {
        const row = { userid: 'u1', clientid: 'c1', paymentmethod: 'efectivo', pricea: 10 };
        const result = normalizeRow('sales', row);
        expect(result.userId).toBe('u1');
        expect(result.clientId).toBe('c1');
        expect(result.paymentMethod).toBe('efectivo');
        expect(result.priceA).toBe(10);
    });

    it('no sobreescribe un camelCase que ya existe', () => {
        const row = { userid: 'u1', userId: 'u2' };
        const result = normalizeRow('sales', row);
        expect(result.userId).toBe('u2');
    });

    it('deja intactas las columnas sin alias', () => {
        const row = { id: '1', name: 'Queso', total: 50 };
        const result = normalizeRow('products', row);
        expect(result).toEqual({ id: '1', name: 'Queso', total: 50 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildSafePayload
// ─────────────────────────────────────────────────────────────────────────────
describe('buildSafePayload', () => {
    it('filtra solo las columnas conocidas de la nube', () => {
        const item = { id: '1', name: 'Queso', extraCampo: 'x', synced: false };
        const cloudColumns = { products: ['id', 'name'] };
        const result = buildSafePayload(item, 'products', cloudColumns);
        expect(result).toEqual({ id: '1', name: 'Queso' });
        expect(result.extraCampo).toBeUndefined();
    });

    it('usa FALLBACK_COLUMNS si no hay cloudColumns', () => {
        const item = { id: '1', name: 'Queso', priceA: 10 };
        const result = buildSafePayload(item, 'products', {});
        // priceA debe mapearse a pricea (columna lowercase en fallback)
        expect(result.pricea).toBe(10);
        expect(result.priceA).toBeUndefined();
    });

    it('mapea camelCase local a lowercase de Supabase', () => {
        const item = { id: '1', userId: 'u1', clientId: 'c1' };
        const cloudColumns = { sales: ['id', 'userid', 'clientid'] };
        const result = buildSafePayload(item, 'sales', cloudColumns);
        expect(result.userid).toBe('u1');
        expect(result.clientid).toBe('c1');
        expect(result.userId).toBeUndefined();
    });

    it('devuelve el item completo si no hay columnas conocidas', () => {
        const item = { id: '1', name: 'Queso' };
        const result = buildSafePayload(item, 'tabla_desconocida', {});
        expect(result).toEqual(item);
    });

    it('el camelCase editado gana sobre un mirror lowercase desactualizado', () => {
        // Reproduce normalizeRow() (trae paymentmethod original) + una edición local que
        // solo toca el alias camelCase (updateClient hace {...clienteViejo, ...cambios}) —
        // el objeto queda con ambas claves y valores distintos. La subida debe respetar
        // la editada (camelCase), no la vieja (lowercase).
        const item = { id: '1', name: 'Cliente', paymentmethod: 'efectivo', paymentMethod: 'transferencia' };
        const cloudColumns = { clients: ['id', 'name', 'paymentmethod'] };
        const result = buildSafePayload(item, 'clients', cloudColumns);
        expect(result.paymentmethod).toBe('transferencia');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// countPending
// ─────────────────────────────────────────────────────────────────────────────
describe('countPending', () => {
    it('cuenta items sin sincronizar en todas las tablas', () => {
        const state = {
            products: [{ synced: true }, { synced: false }],
            users: [{ synced: false }],
            clients: [],
            inventory: [],
            sales: [{ synced: true }],
            expenses: [],
        };
        expect(countPending(state, { synced: true })).toBe(2);
    });

    it('suma 1 si ticketConfig no está sincronizado', () => {
        const state = {
            products: [], users: [], clients: [], inventory: [], sales: [], expenses: [],
        };
        expect(countPending(state, { synced: false })).toBe(1);
        expect(countPending(state, { synced: true })).toBe(0);
    });

    it('maneja tablas undefined', () => {
        const state = {};
        expect(countPending(state, null)).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mapas de columnas (integridad)
// ─────────────────────────────────────────────────────────────────────────────
describe('Mapas de columnas', () => {
    it('REVERSE_COLUMN_MAP es el inverso exacto de COLUMN_MAP', () => {
        Object.entries(COLUMN_MAP).forEach(([lower, camel]) => {
            expect(REVERSE_COLUMN_MAP[camel]).toBe(lower);
        });
    });

    it('FALLBACK_COLUMNS contiene las columnas lowercase esperadas', () => {
        expect(FALLBACK_COLUMNS.products).toContain('pricea');
        expect(FALLBACK_COLUMNS.sales).toContain('userid');
        expect(FALLBACK_COLUMNS.users).toContain('pricelist');
        expect(FALLBACK_COLUMNS.clients).toContain('paymentmethod');
    });
});
