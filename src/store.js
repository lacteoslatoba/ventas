import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './lib/supabase';

// UUID seguro en contextos HTTP (crypto.randomUUID requiere HTTPS/secure context)
function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try { return crypto.randomUUID(); } catch { /* HTTP context */ }
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// navigator.onLine seguro (puede no existir en SSR o WebView frío)
function isOnline() {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' && navigator.onLine;
}

// Evita que una llamada a Supabase quede colgada para siempre en redes de ruta con señal intermitente
// (el request nunca resuelve ni rechaza, dejando isSyncing atascado en true)
function withTimeout(promise, ms = 15000, label = 'request') {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Tiempo de espera agotado (${label})`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Mapa global lowercase→camelCase (PostgreSQL devuelve columnas en minúsculas)
const COLUMN_MAP = {
    userid: 'userId', clientid: 'clientId', paymentmethod: 'paymentMethod',
    pricelist: 'priceList', pricea: 'priceA', priceb: 'priceB', pricec: 'priceC',
    lugar1activo: 'lugar1Activo', lugar2activo: 'lugar2Activo',
};
// Inverso: camelCase local → columna lowercase en Supabase
const REVERSE_COLUMN_MAP = Object.fromEntries(
    Object.entries(COLUMN_MAP).map(([lower, camel]) => [camel, lower])
);

const FALLBACK_COLUMNS = {
    products: ['id', 'name', 'code', 'price', 'unit', 'stock', 'pricea', 'priceb', 'pricec', 'orden'],
    users: ['id', 'name', 'phone', 'pin', 'vehicle', 'pricelist', 'lugar1', 'lugar2', 'lugar1activo', 'lugar2activo', 'auth_id'],
    clients: ['id', 'name', 'phone', 'address', 'userid'],
    sales: ['id', 'userid', 'clientid', 'total', 'items', 'date', 'paymentmethod'],
    inventory: ['id', 'productid', 'type', 'quantity', 'notes', 'date'],
    expenses: ['id', 'userid', 'date', 'description', 'amount'],
    ticket_config: ['id', 'header', 'footer', 'doubleCopy', 'centerTotal', 'spaceBetweenItems', 'showCashAndChange']
};

const mergeStateHelper = (localItems, freshItems) => {
    if (!freshItems) return localItems || [];
    const local = localItems || [];
    // Un item local no sincronizado siempre gana sobre la versión remota del mismo id
    // (editado offline, o el upload aún no terminó) — sin importar si ese id ya existe
    // en el servidor. Antes solo se preservaban items enteramente nuevos (creados
    // offline), así que una edición local sobre un registro YA existente en el servidor
    // (ej. descuento de stock de una venta) se perdía en silencio en el próximo fetch.
    const localUnsynced = local.filter(item => !item.synced);
    const unsyncedIds = new Set(localUnsynced.map(item => item.id));
    const serverKept = freshItems
        .filter(item => !unsyncedIds.has(item.id))
        .map(i => ({ ...i, synced: true }));
    return [...serverKept, ...localUnsynced];
};

export const useStore = create(
    persist(
        (set, get) => ({
            products: [],
            inventory: [],
            users: [],
            clients: [],
            sales: [],
            expenses: [],
            cart: [],
            selectedCartClient: '', // Cambiado de selectedClient para evitar confusión
            cloudColumns: {}, // Historial de columnas conocidas en Supabase
            pendingDeletes: {}, // { tableName: string[] } — eliminaciones hechas offline

            // Configuración del Ticket
            ticketConfig: {
                businessName: 'LACTEOS LA TOBA',
                subtitle: '',
                address: '',
                phone: '',
                footerLine1: '¡Gracias por su compra!',
                footerLine2: '',
                showMainTitle: true,
                showBusinessName: true,
                showLabels: true,
                showSignature: true,
                paperWidth: 58, // mm: 58 o 80
                synced: true, // Por defecto asumimos sincronizado si no se ha cambiado
                titleAlignment: 'center', // left, center, right
                showAddress: true,
                showPhone: true,
                showDate: true,
                showTime: true,
                showSeller: true,
                showCustomer: true,
                useFontB: false,
                ticketTemplate: 'standard', // 'standard' o 'latoba'
                showItemsHeader: true,
                printCopy: false,
                spaceBetweenItems: false,
                showCashAndChange: true,
                centerTotal: false,
                businessNameSize: 13,
                metadataSize: 10,
                metadataUppercase: false,
                multiLineItems: true,
                totalFontSize: 14,
                itemsHeaderLeft: 'CANT/CONCEPTO',
                itemsHeaderRight: 'IMPORTE',
                showLogo: true,
                logoUrl: 'https://i.ibb.co/w2Kw4S4/la.png',
                // Nuevas opciones granulares
                businessNameBold: true,
                metadataBold: false,
                totalBold: true,
                itemsBold: false,
                showSubtotal: true,
                showSeparatorHeader: true,
                showSeparatorItems: true,
                showSeparatorFooter: true,
                separatorStyle: 'dashed', // 'dashed' o 'solid'
                headerSpacing: 0,
                footerSpacing: 0,
                metadataAlignment: 'between',
                metadataSpacing: 0,
                showSubtitle: true,
                subtotalAlignment: 'right',
                subtotalTotalSpacing: 0,
                showExtraLine1: true,
                showExtraLine2: true,
                showFooterLine1: true,
                showFooterLine2: true,
                footerFontSize: 9,
                footerBold: false,
                totalToFooterSpacing: 0,
                itemsSectionSpacing: 0,
                showPaymentMethod: true,
            },
            updateTicketConfig: (config) => {
                set((state) => ({ ticketConfig: { ...state.ticketConfig, ...config, synced: false } }));
                return get().syncToSupabase();
            },

            // Diálogo de confirmación global
            confirmDialog: null,
            showConfirm: ({ message, onConfirm, confirmText = 'Confirmar', danger = false }) => {
                set({ confirmDialog: { message, onConfirm, confirmText, danger } });
            },
            hideConfirm: () => set({ confirmDialog: null }),

            // Toast global
            toast: null,
            showToast: (msg, type = 'success') => {
                set({ toast: { msg, type } });
                setTimeout(() => set({ toast: null }), 3000);
            },

            updateCart: (update) => {
                if (typeof update === 'function') {
                    set((state) => ({ cart: update(state.cart) }));
                } else {
                    set({ cart: update });
                }
            },
            updateSelectedCartClient: (clientId) => set({ selectedCartClient: clientId }),

            // Autenticación y Roles
            currentUser: null,
            login: async (username, password) => {
                const cleanUsername = username.trim().toLowerCase();
                const cleanPassword = password.trim();
                const state = get();

                // ── ONLINE: intentar Supabase Auth (activa RLS) ──────────────
                if (state.isOnline && supabase) {
                    const slug = cleanUsername === 'admin' ? 'administrador' : cleanUsername;
                    const email = `${slug}@lacteoslatoba.local`;
                    const { data, error } = await supabase.auth.signInWithPassword({ email, password: cleanPassword });

                    if (!error && data.session) {
                        if (cleanUsername === 'admin') {
                            set({ currentUser: { id: 'admin', name: 'Administrador', role: 'admin' } });
                            get().fetchFromSupabase();
                            return true;
                        }
                        const { data: userData } = await supabase
                            .from('users')
                            .select('*')
                            .eq('auth_id', data.user.id)
                            .single();
                        if (userData) {
                            set({
                                currentUser: {
                                    ...userData,
                                    priceList: userData.priceList || userData.pricelist || 'A',
                                    role: userData.role || 'repartidor'
                                }
                            });
                            get().fetchFromSupabase();
                            return true;
                        }
                    }
                }

                // ── OFFLINE o usuario sin cuenta Auth aún: validación local ──
                if (cleanUsername === 'admin' && cleanPassword === '5151') {
                    set({ currentUser: { id: 'admin', name: 'Administrador', role: 'admin' } });
                    return true;
                }
                const user = state.users.find(u =>
                    (u.name || '').trim().toLowerCase() === cleanUsername && u.pin === cleanPassword
                );
                if (user) {
                    set({
                        currentUser: {
                            ...user,
                            priceList: user.priceList || user.pricelist || 'A',
                            role: user.role || 'repartidor'
                        }
                    });
                    return true;
                }
                return false;
            },
            logout: async () => {
                if (supabase) await supabase.auth.signOut().catch(() => { });
                set({ currentUser: null, cart: [], selectedCartClient: '' });
            },
            // Restaura sesión Supabase Auth al recargar (si existe).
            // El estado local offline ya lo restaura Zustand persist automáticamente.
            initAuth: async () => {
                if (!supabase) return;

                // Si ya hay usuario en estado persistido y estamos offline, usarlo directamente
                const persisted = get().currentUser;
                if (persisted && !isOnline()) return;

                let session = null;
                try {
                    const { data } = await supabase.auth.getSession();
                    session = data?.session;
                } catch {
                    // Sin internet: si hay usuario persistido, mantenerlo
                    if (persisted) return;
                    return;
                }
                if (!session) return;

                const username = (session.user.email || '').split('@')[0];
                if (username === 'administrador') {
                    set({ currentUser: { id: 'admin', name: 'Administrador', role: 'admin' } });
                    get().fetchFromSupabase();
                    return;
                }

                try {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('*')
                        .eq('auth_id', session.user.id)
                        .single();
                    if (userData) {
                        set({
                            currentUser: {
                                ...userData,
                                priceList: userData.priceList || userData.pricelist || 'A',
                                role: userData.role || 'repartidor'
                            }
                        });
                        get().fetchFromSupabase();
                    } else if (persisted) {
                        // Query falló pero hay usuario guardado, mantenerlo
                    }
                } catch {
                    // Sin internet durante query de usuario: mantener persistido
                }
            },

            // Estado de Red / Nube — inicia en true; onRehydrateStorage lo corrige tras cargar localStorage
            isOnline: true,
            isSyncing: false,
            lastSync: null,
            syncError: null,

            setOnlineStatus: (status) => set({ isOnline: status }),

            // Sincronización completa al reconectar desde offline
            // 1) Renueva sesión Supabase (puede expirar tras offline prolongado)
            // 2) Sube cambios pendientes locales
            // 3) Baja datos frescos del servidor
            // 4) Reintenta una vez si falla
            syncOnReconnect: async () => {
                const state = get();
                if (!state.isOnline || !supabase) return;
                if (state.isSyncing) return; // ya hay un sync en curso, no apilar otro

                // Renovar token antes de cualquier llamada (evita 401 tras offline largo)
                try { await supabase.auth.refreshSession(); } catch (_) { /* ignore token refresh failure */ }

                // Contar pendientes para el toast
                const tables = ['products', 'users', 'clients', 'inventory', 'sales', 'expenses'];
                const pending = tables.reduce(
                    (acc, t) => acc + ((get()[t] || []).filter(i => !i.synced).length), 0
                ) + (get().ticketConfig && !get().ticketConfig.synced ? 1 : 0);

                const attempt = async () => {
                    await get().syncToSupabase(false);   // ① Sube cambios locales
                    await get().fetchFromSupabase();      // ② Baja datos del servidor
                };

                try {
                    await attempt();
                    if (pending > 0) {
                        get().showToast(
                            `${pending} cambio${pending !== 1 ? 's' : ''} sincronizado${pending !== 1 ? 's' : ''} ✓`,
                            'success'
                        );
                    }
                } catch (err) {
                    console.warn('Sync inicial falló, reintentando en 4 s…', err);
                    // Reintento automático a los 4 segundos
                    setTimeout(async () => {
                        if (!get().isOnline) return;
                        try {
                            await supabase.auth.refreshSession().catch(() => { });
                            await attempt();
                            if (pending > 0) {
                                get().showToast(
                                    `${pending} cambio${pending !== 1 ? 's' : ''} sincronizado${pending !== 1 ? 's' : ''} ✓`,
                                    'success'
                                );
                            }
                        } catch (e2) {
                            console.error('Reintento de sync también falló:', e2);
                            set({ syncError: e2?.message || 'Error al reintentar sincronización' });
                            get().showToast(`Sin conexión al servidor: ${e2?.message || 'Error desconocido'}`, 'error');
                        }
                    }, 4000);
                }
            },

            // Motor de Sincronización Automática (Subida)
            syncToSupabase: async (notify = false) => {
                const state = get();
                if (!state.isOnline || !supabase) return;

                set({ isSyncing: true });
                // Red de seguridad: aunque cada llamada individual ya tiene su propio timeout,
                // esto garantiza que isSyncing nunca quede atascado en true por un caso no previsto.
                const safetyTimer = setTimeout(() => {
                    if (get().isSyncing) {
                        console.warn('[sync] Timeout global: forzando isSyncing = false (upload)');
                        set({ isSyncing: false });
                    }
                }, 120000);

                try {
                    const tablesToSync = ['products', 'users', 'clients', 'inventory', 'sales', 'expenses'];
                    const totalPending = tablesToSync.reduce((acc, t) => acc + (state[t]?.filter(i => !i.synced).length || 0), 0)
                        + (state.ticketConfig && !state.ticketConfig.synced ? 1 : 0);
                    const successTables = [];
                    let hadError = false;

                    for (const tableName of tablesToSync) {
                        const pendingData = state[tableName].filter(item => !item.synced);
                        if (pendingData.length > 0) {
                            const payload = pendingData.map(({ synced: _synced, ...rest }) => rest);

                            const safePayload = payload.map(item => {
                                const rawCols = state.cloudColumns?.[tableName];
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
                            });

                            try {
                                const { error } = await withTimeout(
                                    supabase.from(tableName).upsert(safePayload),
                                    15000,
                                    tableName
                                );
                                if (error) {
                                    console.error(`Error Syncing ${tableName}:`, error.message);
                                    set({ syncError: `[${tableName}] ${error.message}` });
                                    hadError = true;
                                    get().showToast(`Error al subir ${tableName}: ${error.message}`, 'error');
                                    if (error.message.includes('column') && !state.cloudColumns?.[tableName]) {
                                        get().fetchFromSupabase();
                                    }
                                } else {
                                    successTables.push(tableName);
                                }
                            } catch (timeoutErr) {
                                console.error(`Timeout sincronizando ${tableName}:`, timeoutErr.message);
                                set({ syncError: `[${tableName}] ${timeoutErr.message}` });
                                hadError = true;
                                get().showToast(`Sin respuesta del servidor al subir ${tableName}, se reintentará`, 'error');
                            }
                        } else {
                            successTables.push(tableName);
                        }
                    }

                    set((s) => {
                        // No pisar syncError con null si alguna tabla falló en este ciclo —
                        // antes esto ocultaba errores persistentes (ej. registros que nunca
                        // logran subir), mostrando "todo bien" en el modal de diagnóstico.
                        const nextState = { lastSync: new Date().toISOString() };
                        if (!hadError) nextState.syncError = null;
                        successTables.forEach(t => {
                            nextState[t] = s[t].map(x => ({ ...x, synced: true }));
                        });
                        return nextState;
                    });

                    if (state.ticketConfig && !state.ticketConfig.synced) {
                        const { synced: _synced, ...payload } = state.ticketConfig;
                        const knownCols = state.cloudColumns?.['ticket_config'];
                        const dbColumns = [
                            'id', 'header', 'footer', 'doubleCopy', 'centerTotal',
                            'spaceBetweenItems', 'showCashAndChange'
                        ];
                        const availableCols = knownCols && knownCols.length > 0 ? knownCols : dbColumns;

                        let finalPayload = { id: 'main' };
                        const extraData = {};
                        const legacyMap = {
                            businessName: 'header',
                            footerLine1: 'footer',
                            printCopy: 'doubleCopy'
                        };

                        // Campos que siempre deben ser true — no guardar en Supabase para no contaminar
                        const alwaysTrueFields = new Set(['showFooterLine1', 'showFooterLine2']);

                        Object.keys(payload).forEach(key => {
                            if (alwaysTrueFields.has(key)) return; // omitir — se restauran como true al cargar
                            const dbCol = legacyMap[key] || key;
                            // Busca la columna ignorando mayúsculas (PostgreSQL puede devolver todo en minúsculas)
                            const actualCol = availableCols.find(c => c.toLowerCase() === dbCol.toLowerCase()) || dbCol;
                            if (availableCols.some(c => c.toLowerCase() === dbCol.toLowerCase())) {
                                finalPayload[actualCol] = payload[key];
                            } else {
                                extraData[key] = payload[key];
                            }
                        });

                        if (Object.keys(extraData).length > 0) {
                            const currentFooter = payload.footerLine1 || '';
                            finalPayload.footer = `JSON_CONFIG:${JSON.stringify({ ...extraData, _realFooter: currentFooter })}`;
                        }

                        try {
                            const { error } = await withTimeout(
                                supabase.from('ticket_config').upsert(finalPayload),
                                15000,
                                'ticket_config'
                            );
                            if (!error) {
                                set(s => ({ ticketConfig: { ...s.ticketConfig, synced: true } }));
                            } else {
                                console.error(`Error Syncing ticket_config:`, error.message);
                            }
                        } catch (timeoutErr) {
                            console.error('Timeout sincronizando ticket_config:', timeoutErr.message);
                        }
                    }

                    // Flush de eliminaciones offline pendientes
                    const pendingDels = get().pendingDeletes;
                    if (pendingDels && Object.keys(pendingDels).length > 0) {
                        for (const [table, ids] of Object.entries(pendingDels)) {
                            for (const id of ids) {
                                try {
                                    await withTimeout(supabase.from(table).delete().eq('id', id), 15000, `delete ${table}`);
                                } catch (e) {
                                    console.warn(`[sync] No se pudo eliminar ${table}/${id}:`, e);
                                }
                            }
                        }
                        set({ pendingDeletes: {} });
                    }

                    if (notify && totalPending > 0) {
                        get().showToast(`${totalPending} cambio${totalPending !== 1 ? 's' : ''} sincronizado${totalPending !== 1 ? 's' : ''} ✓`, 'success');
                    }

                } catch (error) {
                    console.error('Error sincronizando con la nube:', error);
                } finally {
                    clearTimeout(safetyTimer);
                    set({ isSyncing: false });
                }
            },

            // Descarga de datos oficiales desde Supabase
            fetchFromSupabase: async () => {
                if (!get().isOnline || !supabase) return;

                // getSession puede lanzar si no hay red; si falla o cuelga, no bloquear isSyncing
                let session;
                try {
                    const { data } = await withTimeout(supabase.auth.getSession(), 10000, 'getSession');
                    session = data?.session;
                } catch {
                    return;
                }
                if (!session) return;
                set({ isSyncing: true });
                // Red de seguridad: cada llamada de red ya tiene su propio timeout (withTimeout),
                // esto solo cubre un caso no previsto para que isSyncing nunca quede atascado
                const safetyTimer = setTimeout(() => {
                    if (get().isSyncing) {
                        console.warn('[sync] Timeout global: forzando isSyncing = false (download)');
                        set({ isSyncing: false });
                    }
                }, 120000);
                try {
                    const tablesToPull = ['products', 'users', 'clients', 'sales', 'inventory', 'expenses'];
                    const freshData = {};
                    const cloudColumns = {};

                    const normalizeRow = (_tableName, item) => {
                        const n = { ...item };
                        Object.keys(n).forEach(col => {
                            const camel = COLUMN_MAP[col];
                            if (camel && n[camel] === undefined) n[camel] = n[col];
                        });
                        return n;
                    };

                    for (const tableName of tablesToPull) {
                        try {
                            const { data, error } = await withTimeout(
                                supabase.from(tableName).select('*'),
                                15000,
                                tableName
                            );
                            if (!error && data) {
                                freshData[tableName] = data.map(item => ({ ...normalizeRow(tableName, item), synced: true }));
                                if (data.length > 0) cloudColumns[tableName] = Object.keys(data[0]);
                            }
                        } catch (timeoutErr) {
                            console.error(`Timeout descargando ${tableName}:`, timeoutErr.message);
                        }
                    }

                    set((state) => {
                        const mergedUsers = mergeStateHelper(state.users, freshData['users']);

                        // Refrescar currentUser si es repartidor para que tenga priceList actualizado
                        let refreshedUser = state.currentUser;
                        if (state.currentUser && state.currentUser.role !== 'admin') {
                            const updated = mergedUsers.find(u => u.id === state.currentUser.id);
                            if (updated) {
                                refreshedUser = {
                                    ...updated,
                                    priceList: updated.priceList || updated.pricelist || 'A',
                                    role: 'repartidor'
                                };
                            }
                        }

                        return {
                            ...state,
                            products: mergeStateHelper(state.products, freshData['products']),
                            users: mergedUsers,
                            clients: mergeStateHelper(state.clients, freshData['clients']),
                            sales: mergeStateHelper(state.sales, freshData['sales']),
                            inventory: mergeStateHelper(state.inventory, freshData['inventory']),
                            expenses: mergeStateHelper(state.expenses, freshData['expenses']),
                            cloudColumns: { ...state.cloudColumns, ...cloudColumns },
                            currentUser: refreshedUser,
                        };
                    });

                    let configData, configError;
                    try {
                        const res = await withTimeout(
                            supabase.from('ticket_config').select('*').eq('id', 'main').single(),
                            15000,
                            'ticket_config'
                        );
                        configData = res.data;
                        configError = res.error;
                    } catch (timeoutErr) {
                        console.error('Timeout descargando ticket_config:', timeoutErr.message);
                    }
                    if (!configError && configData) {
                        set(s => {
                            if (s.ticketConfig?.synced || !s.ticketConfig) {
                                let finalConfig = { ...configData };

                                if (configData.footer && configData.footer.startsWith('JSON_CONFIG:')) {
                                    try {
                                        const jsonStr = configData.footer.replace('JSON_CONFIG:', '');
                                        const unpacked = JSON.parse(jsonStr);
                                        const { _realFooter, ...rest } = unpacked;
                                        finalConfig = { ...finalConfig, ...rest, footer: _realFooter };
                                    } catch (e) {
                                        console.error('Error al desempaquetar config:', e);
                                    }
                                }

                                const mappedConfig = {
                                    ...finalConfig,
                                    businessName: finalConfig.header !== undefined ? finalConfig.header : finalConfig.businessName,
                                    footerLine1: finalConfig.footer !== undefined ? finalConfig.footer : finalConfig.footerLine1,
                                    printCopy: finalConfig.doubleCopy !== undefined ? finalConfig.doubleCopy :
                                        finalConfig.doublecopy !== undefined ? finalConfig.doublecopy :
                                            finalConfig.printCopy
                                };

                                // Eliminar versiones crudas para evitar conflictos en syncToSupabase
                                ['header', 'footer', 'doubleCopy', 'doublecopy'].forEach(k => delete mappedConfig[k]);

                                const cleanData = {};
                                Object.keys(mappedConfig).forEach(key => {
                                    if (mappedConfig[key] !== null && mappedConfig[key] !== undefined) {
                                        cleanData[key] = mappedConfig[key];
                                    }
                                });

                                // Siempre mostrar líneas de pie de página (nunca dejar que
                                // Supabase deshabilite la impresión de "Gracias por su compra")
                                cleanData.showFooterLine1 = true;
                                cleanData.showFooterLine2 = true;
                                // showFooterLine1 siempre forzado a true (independiente del valor en Supabase)

                                return {
                                    ticketConfig: { ...s.ticketConfig, ...cleanData, synced: true },
                                    cloudColumns: { ...s.cloudColumns, ticket_config: Object.keys(configData) }
                                };
                            }
                            return {};
                        });
                    }

                } catch (error) {
                    console.error('Error descargando desde Supabase:', error);
                } finally {
                    clearTimeout(safetyTimer);
                    set({ isSyncing: false });
                }
            },


            // Productos
            addProduct: (product) => {
                const newProduct = {
                    ...product,
                    id: generateId(),
                    synced: false,
                    priceA: Number(product.priceA) || 0,
                    priceB: Number(product.priceB) || 0,
                    priceC: Number(product.priceC) || 0,
                    price: Number(product.priceA) || 0
                };
                set((state) => ({ products: [...state.products, newProduct] }));
                get().syncToSupabase();
            },
            updateProduct: (id, data) => {
                set((state) => ({
                    products: state.products.map((p) => {
                        if (p.id === id) {
                            const updated = { ...p, ...data, synced: false };
                            if (data.priceA !== undefined) {
                                updated.priceA = Number(data.priceA);
                                updated.price = Number(data.priceA);
                            }
                            if (data.priceB !== undefined) updated.priceB = Number(data.priceB);
                            if (data.priceC !== undefined) updated.priceC = Number(data.priceC);
                            return updated;
                        }
                        return p;
                    }),
                }));
                get().syncToSupabase();
            },
            deleteProduct: async (id) => {
                const wasOnServer = get().products.find(p => p.id === id)?.synced === true;
                set((state) => ({
                    products: state.products.filter(p => p.id !== id),
                    ...(!get().isOnline && wasOnServer ? {
                        pendingDeletes: { ...state.pendingDeletes, products: [...new Set([...(state.pendingDeletes?.products || []), id])] }
                    } : {})
                }));
                if (get().isOnline && supabase) {
                    await supabase.from('products').delete().eq('id', id);
                }
            },
            resetAllStock: () => {
                set((state) => ({
                    products: state.products.map(p => ({ ...p, stock: 0, synced: false }))
                }));
                get().syncToSupabase();
            },

            // Inventario (Entradas/Salidas)
            addInventory: (item) => {
                set((state) => ({
                    inventory: [...state.inventory, { ...item, id: generateId(), date: new Date().toISOString(), synced: false }],
                    products: state.products.map(p => {
                        if (p.id === item.productId) {
                            return {
                                ...p,
                                stock: (p.stock || 0) + (item.type === 'IN' ? Number(item.quantity) : -Number(item.quantity)),
                                synced: false
                            };
                        }
                        return p;
                    })
                }));
                get().syncToSupabase();
            },

            // Usuarios
            addUser: (user) => {
                const newUser = {
                    ...user,
                    id: generateId(),
                    synced: false,
                    priceList: user.priceList || 'A'
                };
                set((state) => ({ users: [...state.users, newUser] }));
                get().syncToSupabase();
            },
            updateUser: (id, data) => {
                set((state) => ({
                    users: state.users.map((u) => (u.id === id ? { ...u, ...data, synced: false } : u)),
                }));
                get().syncToSupabase();
            },
            deleteUser: async (id) => {
                const wasOnServer = get().users.find(u => u.id === id)?.synced === true;
                set((state) => ({
                    users: state.users.filter((u) => u.id !== id),
                    ...(!get().isOnline && wasOnServer ? {
                        pendingDeletes: { ...state.pendingDeletes, users: [...new Set([...(state.pendingDeletes?.users || []), id])] }
                    } : {})
                }));
                if (get().isOnline && supabase) {
                    await supabase.from('users').delete().eq('id', id);
                }
            },

            // Clientes
            addClient: (client) => {
                set((state) => ({ clients: [...state.clients, { ...client, id: generateId(), synced: false }] }));
                get().syncToSupabase();
            },
            updateClient: (id, client) => {
                set((state) => ({ clients: state.clients.map(c => c.id === id ? { ...c, ...client, synced: false } : c) }));
                get().syncToSupabase();
            },
            deleteClient: async (id) => {
                const wasOnServer = get().clients.find(c => c.id === id)?.synced === true;
                set((state) => ({
                    clients: state.clients.filter(c => c.id !== id),
                    ...(!get().isOnline && wasOnServer ? {
                        pendingDeletes: { ...state.pendingDeletes, clients: [...new Set([...(state.pendingDeletes?.clients || []), id])] }
                    } : {})
                }));
                if (get().isOnline && supabase) {
                    await supabase.from('clients').delete().eq('id', id);
                }
            },

            // Ventas
            addSale: (sale) => {
                set((state) => {
                    const newSale = { ...sale, id: sale.id ?? generateId(), date: sale.date ?? new Date().toISOString(), synced: false };

                    const updatedProducts = state.products.map(p => {
                        const saleItem = sale.items.find(i => i.productId === p.id);
                        if (saleItem) {
                            return { ...p, stock: (p.stock || 0) - Number(saleItem.quantity), synced: false };
                        }
                        return p;
                    });

                    return {
                        sales: [...state.sales, newSale],
                        products: updatedProducts
                    };
                });
                get().syncToSupabase();
            },
            updateSale: (saleId, data) => {
                set((s) => ({
                    sales: s.sales.map(sale => {
                        if (sale.id !== saleId) return sale;
                        const updated = { ...sale, ...data, synced: false };
                        // Mantener aliases lowercase en sinc con camelCase para evitar que
                        // el sync mande el valor viejo (el fetch guarda ambas formas)
                        if (data.paymentMethod !== undefined) updated.paymentmethod = data.paymentMethod;
                        if (data.userId !== undefined) updated.userid = data.userId;
                        if (data.clientId !== undefined) updated.clientid = data.clientId;
                        return updated;
                    })
                }));
                get().syncToSupabase();
            },
            deleteSale: async (saleId) => {
                const state = get();
                const saleToDelete = state.sales.find(s => s.id === saleId);
                if (!saleToDelete) return;
                const wasOnServer = saleToDelete.synced === true;

                set((s) => ({
                    sales: s.sales.filter(s => s.id !== saleId),
                    products: s.products.map(p => {
                        const item = saleToDelete.items.find(i => i.productId === p.id);
                        if (item) {
                            return { ...p, stock: (p.stock || 0) + Number(item.quantity), synced: false };
                        }
                        return p;
                    }),
                    ...(!state.isOnline && wasOnServer ? {
                        pendingDeletes: { ...s.pendingDeletes, sales: [...new Set([...(s.pendingDeletes?.sales || []), saleId])] }
                    } : {})
                }));

                if (state.isOnline && supabase) {
                    try {
                        await supabase.from('sales').delete().eq('id', saleId);
                        get().syncToSupabase();
                    } catch (error) {
                        console.error('Error eliminando venta en la nube:', error);
                    }
                }
            },

            // Gastos operativos
            addExpense: (expense) => {
                const newExpense = { ...expense, id: generateId(), synced: false };
                set(state => ({ expenses: [...state.expenses, newExpense] }));
                get().syncToSupabase();
            },
            deleteExpense: async (id) => {
                const wasOnServer = get().expenses.find(e => e.id === id)?.synced === true;
                set(state => ({
                    expenses: state.expenses.filter(e => e.id !== id),
                    ...(!get().isOnline && wasOnServer ? {
                        pendingDeletes: { ...state.pendingDeletes, expenses: [...new Set([...(state.pendingDeletes?.expenses || []), id])] }
                    } : {})
                }));
                if (get().isOnline && supabase) {
                    await supabase.from('expenses').delete().eq('id', id);
                }
            },

            clearAllSales: async () => {
                set({ sales: [] });
                const state = get();
                if (state.isOnline && supabase) {
                    try {
                        await supabase.from('sales').delete().not('id', 'is', null);
                    } catch (error) {
                        console.error('Error vaciando ventas en la nube:', error);
                    }
                }
            },
        }),
        {
            name: 'ventas-quesos-storage',
            version: 3,
            migrate: (persistedState, version) => {
                if (version <= 2) {
                    // Corregir campos booleanos que pudieron quedar en false — sin marcar synced:false
                    // para no bloquear fetchFromSupabase y no sobreescribir config más nueva del servidor
                    return {
                        ...persistedState,
                        ticketConfig: {
                            ...(persistedState.ticketConfig || {}),
                            showFooterLine1: true,
                            showFooterLine2: persistedState.ticketConfig?.showFooterLine2 ?? true,
                        }
                    };
                }
                return persistedState;
            },
            // Al restaurar desde localStorage, siempre releer el estado de red real
            // (Capacitor Android WebView puede guardar isOnline: false y no emitir evento 'online' al arrancar)
            onRehydrateStorage: () => (state, error) => {
                if (error) {
                    console.error('[store] Error al restaurar estado persistido:', error);
                    return;
                }
                if (state) {
                    state.isOnline = isOnline();
                    state.isSyncing = false;
                    state.syncError = null;
                }
            },
        }
    )
);
