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
    knownCols.forEach(col => {
        if (item[col] !== undefined) filtered[col] = item[col];
    });

    // Mapear campos camelCase locales a columnas lowercase de Supabase
    Object.entries(REVERSE_COLUMN_MAP).forEach(([camel, lower]) => {
        if (knownCols.includes(lower) && item[camel] !== undefined && filtered[lower] === undefined) {
            filtered[lower] = item[camel];
        }
    });

    return filtered;
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
