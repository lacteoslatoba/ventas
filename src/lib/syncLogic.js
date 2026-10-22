// ─────────────────────────────────────────────────────────────────────────────
// syncLogic.js — Lógica pura de sincronización (sin dependencias de Supabase/DOM)
//
// Extraída de store.js para:
//   1. Poder testearla de forma aislada (Vitest).
//   2. Reducir el riesgo de errores silenciosos al agregar campos nuevos.
//   3. Mantener store.js más pequeño y legible.
//
// IMPORTANTE: Si agregas un campo camelCase nuevo a una tabla, debes:
//   - Añadirlo a COLUMN_MAP (lowercase → camelCase) para la LECTURA.
//   - Añadirlo a REVERSE_COLUMN_MAP (camelCase → lowercase) para la ESCRITURA.
//   - Añadirlo a FALLBACK_COLUMNS si no existe aún en la nube.
// ─────────────────────────────────────────────────────────────────────────────

// Mapa global lowercase→camelCase (PostgreSQL devuelve columnas en minúsculas)
export const COLUMN_MAP = {
    userid: 'userId', clientid: 'clientId', paymentmethod: 'paymentMethod',
    pricelist: 'priceList', pricea: 'priceA', priceb: 'priceB', pricec: 'priceC',
    lugar1activo: 'lugar1Activo', lugar2activo: 'lugar2Activo',
};

// Inverso: camelCase local → columna lowercase en Supabase
export const REVERSE_COLUMN_MAP = Object.fromEntries(
    Object.entries(COLUMN_MAP).map(([lower, camel]) => [camel, lower])
);

export const FALLBACK_COLUMNS = {
    products: ['id', 'name', 'code', 'price', 'unit', 'stock', 'pricea', 'priceb', 'pricec', 'orden'],
    users: ['id', 'name', 'phone', 'pin', 'vehicle', 'pricelist', 'lugar1', 'lugar2', 'lugar1activo', 'lugar2activo', 'auth_id'],
    clients: ['id', 'name', 'phone', 'address', 'userid', 'paymentmethod'],
    sales: ['id', 'userid', 'clientid', 'total', 'items', 'date', 'paymentmethod'],
    inventory: ['id', 'productid', 'type', 'quantity', 'notes', 'date'],
    expenses: ['id', 'userid', 'date', 'description', 'amount'],
    ticket_config: ['id', 'header', 'footer', 'doubleCopy', 'centerTotal', 'spaceBetweenItems', 'showCashAndChange']
};

/**
 * Fusiona datos locales con datos frescos del servidor.
 * Un item local NO sincronizado siempre gana sobre la versión remota del mismo id
 * (editado offline, o el upload aún no terminó).
 *
 * @param {Array} localItems  Items locales (pueden tener `synced: false`)
 * @param {Array} freshItems  Items frescos del servidor
 * @returns {Array} Resultado fusionado
 */
export function mergeStateHelper(localItems, freshItems) {
    if (!freshItems) return localItems || [];
    const local = localItems || [];
    const localUnsynced = local.filter(item => !item.synced);
    const unsyncedIds = new Set(localUnsynced.map(item => item.id));
    const serverKept = freshItems
        .filter(item => !unsyncedIds.has(item.id))
        .map(i => ({ ...i, synced: true }));
    return [...serverKept, ...localUnsynced];
}

/**
 * Normaliza una fila de Supabase: agrega los aliases camelCase a partir de las
 * columnas lowercase que devuelve PostgreSQL.
 *
 * @param {string} _tableName  Nombre de la tabla (reservado para uso futuro)
 * @param {Object} item        Fila cruda de Supabase
 * @returns {Object} Fila con aliases camelCase agregados
 */
export function normalizeRow(_tableName, item) {
    const n = { ...item };
    Object.keys(n).forEach(col => {
        const camel = COLUMN_MAP[col];
        if (camel && n[camel] === undefined) n[camel] = n[col];
    });
    return n;
}

/**
 * Construye el payload seguro para un upsert: filtra solo las columnas conocidas
 * y mapea campos camelCase locales a columnas lowercase de Supabase.
 *
 * @param {Object} item        Item local (camelCase)
 * @param {string} tableName   Nombre de la tabla
 * @param {Object} cloudColumns Historial de columnas conocidas en Supabase
 * @returns {Object} Payload filtrado y mapeado
 */
export function buildSafePayload(item, tableName, cloudColumns) {
    const rawCols = cloudColumns?.[tableName];
    const knownCols = (rawCols && rawCols.length > 0) ? rawCols : FALLBACK_COLUMNS[tableName];
    if (!knownCols) return item;

    const filtered = {};

    // Mapear primero camelCase local → columna lowercase: es la fuente de verdad de la
    // app (lo que acaba de editar el usuario). Va ANTES del paso siguiente a propósito:
    // un item normalizado desde Supabase (normalizeRow) trae también la columna lowercase
    // original como mirror (ej. paymentmethod) además del alias camelCase (paymentMethod).
    // Si luego se edita solo el campo camelCase, ese mirror lowercase queda con el valor
    // viejo — copiarlo primero pisaría silenciosamente la edición nueva.
    Object.entries(REVERSE_COLUMN_MAP).forEach(([camel, lower]) => {
        if (knownCols.includes(lower) && item[camel] !== undefined) {
            filtered[lower] = item[camel];
        }
    });

    // Columnas conocidas tal cual, sin pisar lo que ya vino del mapeo camelCase de arriba.
    knownCols.forEach(col => {
        if (item[col] !== undefined && filtered[col] === undefined) filtered[col] = item[col];
    });

    return filtered;
}

const getClientId = (sale) => sale.clientId ?? sale.clientid;

/**
 * Tras un fetch, el merge descarta los clientes que ya no están en la nube (ej. borrados
 * desde otro equipo). Si una venta hecha offline todavía apunta a uno de ellos, perderlo
 * dejaría esa venta sin forma de subir nunca (sales_clientId_fkey). Este paso los conserva
 * y los marca synced: false para que se vuelvan a subir antes que la venta.
 *
 * @param {Array} mergedClients  Resultado de mergeStateHelper para clients
 * @param {Array} localClients   Clientes locales antes del merge
 * @param {Array} sales          Ventas ya fusionadas (las pendientes son las que importan)
 * @returns {Array} Clientes con los referenciados por ventas pendientes garantizados
 */
export function preserveReferencedClients(mergedClients, localClients, sales) {
    const present = new Set(mergedClients.map(c => c.id));
    const needed = new Set(
        (sales || []).filter(s => !s.synced).map(getClientId).filter(id => id && !present.has(id))
    );
    if (needed.size === 0) return mergedClients;
    const rescued = (localClients || [])
        .filter(c => needed.has(c.id))
        .map(c => ({ ...c, synced: false }));
    return [...mergedClients, ...rescued];
}

/**
 * Cliente de respaldo para una venta cuyo cliente no existe ni en la nube ni en el
 * teléfono. Conserva el id original para que la venta suba tal cual; el admin puede
 * renombrarlo después.
 */
export function placeholderClientFor(sale) {
    return {
        id: getClientId(sale),
        name: 'Cliente recuperado',
        phone: '',
        address: '',
        userId: sale.userId ?? sale.userid,
        paymentMethod: sale.paymentMethod ?? sale.paymentmethod ?? 'efectivo',
    };
}

const isForeignKeyError = (error) => /foreign key/i.test(error?.message || '');

/**
 * Sube los registros pendientes de una tabla sin que uno malo bloquee a los demás.
 *
 * El upsert en lote de Supabase es todo-o-nada: una sola venta offline con un cliente
 * inexistente bloqueaba TODA la tabla de ventas indefinidamente. Si el lote falla, se
 * reintenta fila por fila; y si una venta falla por la llave foránea del cliente, se sube
 * primero ese cliente (el local, o uno de respaldo si ya no existe en ningún lado).
 *
 * @param {Object}   opts
 * @param {string}   opts.tableName
 * @param {Array}    opts.rows        Registros pendientes (sin filtrar columnas)
 * @param {Function} opts.upsert      async (tableName, rows) => ({ error }) — puede lanzar (timeout)
 * @param {Function} [opts.findClient] (id) => cliente local o undefined
 * @returns {Promise<{uploadedIds: Set, uploadedClients: Array, error: string|null}>}
 *   uploadedClients: clientes que se subieron para rescatar ventas (incluye los de respaldo).
 */
export async function uploadRows({ tableName, rows, upsert, findClient = () => undefined }) {
    const uploadedIds = new Set();
    const uploadedClients = [];
    if (rows.length === 0) return { uploadedIds, uploadedClients, error: null };

    // Un throw aquí (timeout) se propaga: sin red no tiene caso reintentar fila por fila.
    const { error: batchError } = await upsert(tableName, rows);
    if (!batchError) {
        rows.forEach(r => uploadedIds.add(r.id));
        return { uploadedIds, uploadedClients, error: null };
    }

    let firstError = null;
    for (const row of rows) {
        let rowError;
        try {
            ({ error: rowError } = await upsert(tableName, [row]));

            const clientId = getClientId(row);
            if (rowError && tableName === 'sales' && clientId && isForeignKeyError(rowError)) {
                const client = findClient(clientId) || placeholderClientFor(row);
                const { error: clientError } = await upsert('clients', [client]);
                if (clientError) {
                    rowError = { message: `cliente "${client.name}" no se pudo subir: ${clientError.message}` };
                } else {
                    uploadedClients.push(client);
                    ({ error: rowError } = await upsert(tableName, [row]));
                }
            }
        } catch (e) {
            // Se cayó la red a media pasada: lo que falte queda pendiente para el próximo ciclo.
            firstError = firstError || e.message;
            break;
        }
        if (rowError) firstError = firstError || rowError.message;
        else uploadedIds.add(row.id);
    }
    return { uploadedIds, uploadedClients, error: firstError };
}

/**
 * Cuenta cuántos items están sin sincronizar en un conjunto de tablas.
 *
 * @param {Object} state  Estado con las tablas (products, users, clients, sales, inventory, expenses)
 * @param {Object} ticketConfig Configuración del ticket (opcional)
 * @returns {number} Total de items pendientes
 */
export function countPending(state, ticketConfig) {
    const tables = ['products', 'users', 'clients', 'inventory', 'sales', 'expenses'];
    const count = tables.reduce(
        (acc, t) => acc + ((state[t] || []).filter(i => !i.synced).length), 0
    );
    return count + (ticketConfig && !ticketConfig.synced ? 1 : 0);
}
