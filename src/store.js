import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './lib/supabase';

const mergeStateHelper = (localItems, freshItems) => {
    if (!freshItems) return localItems || [];
    const local = localItems || [];
    const pendingLocalMap = new Map(local.filter(item => !item.synced).map(item => [item.id, item]));
    
    // Map fresh items and replace with local pending ones if they match
    const merged = freshItems.map(remoteItem => {
        const localItem = pendingLocalMap.get(remoteItem.id);
        if (localItem) {
            pendingLocalMap.delete(remoteItem.id);
            return localItem;
        }
        return remoteItem;
    });
    
    // Add locally created items that are not yet on the server
    return [...merged, ...Array.from(pendingLocalMap.values())];
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
            deliveries: [],
            cart: [],
            selectedCartClient: '', // Cambiado de selectedClient para evitar confusión
            cloudColumns: {}, // Historial de columnas conocidas en Supabase

            // Configuración del Ticket
            ticketConfig: {
                businessName: 'PURIFICADORA MAR DE HIELO',
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
                    const slug  = cleanUsername === 'admin' ? 'administrador' : cleanUsername;
                    const email = `${slug}@mardehielo.local`;
                    // Supabase requiere mínimo 6 caracteres; rellenamos con ceros si el PIN es corto
                    const authPassword = cleanPassword.length < 6 ? cleanPassword.padEnd(6, '0') : cleanPassword;
                    const { data, error } = await supabase.auth.signInWithPassword({ email, password: authPassword });

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
                            set({ currentUser: {
                                ...userData,
                                priceList: userData.priceList || userData.pricelist || 'A',
                                role: userData.role || 'repartidor'
                            }});
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
                    set({ currentUser: {
                        ...user,
                        priceList: user.priceList || user.pricelist || 'A',
                        role: user.role || 'repartidor'
                    }});
                    return true;
                }
                return false;
            },
            logout: async () => {
                if (supabase) await supabase.auth.signOut().catch(() => {});
                set({ currentUser: null, cart: [], selectedCartClient: '' });
            },
            // Restaura sesión Supabase Auth al recargar (si existe).
            // El estado local offline ya lo restaura Zustand persist automáticamente.
            initAuth: async () => {
                if (!supabase) return;

                // Si ya hay usuario en estado persistido y estamos offline, usarlo directamente
                const persisted = get().currentUser;
                if (persisted && !navigator.onLine) return;

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
                if (username === 'administrador' || username === 'admin') {
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
                        set({ currentUser: {
                            ...userData,
                            priceList: userData.priceList || userData.pricelist || 'A',
                            role: userData.role || 'repartidor'
                        }});
                        get().fetchFromSupabase();
                    } else if (persisted) {
                        // Query falló pero hay usuario guardado, mantenerlo
                    }
                } catch {
                    // Sin internet durante query de usuario: mantener persistido
                }
            },

            // Estado de Red / Nube
            isOnline: navigator.onLine,
            isSyncing: false,
            lastSync: null,

            setOnlineStatus: (status) => set({ isOnline: status }),

            // Motor de Sincronización Automática (Subida)
            syncToSupabase: async (notify = false) => {
                const state = get();
                if (!state.isOnline || !supabase) return;

                set({ isSyncing: true });

                try {
                    const tablesToSync = ['products', 'users', 'clients', 'inventory', 'sales', 'expenses', 'deliveries'];
                    const totalPending = tablesToSync.reduce((acc, t) => acc + (state[t]?.filter(i => !i.synced).length || 0), 0)
                        + (state.ticketConfig && !state.ticketConfig.synced ? 1 : 0);
                    const successTables = [];

                    for (const tableName of tablesToSync) {
                        const pendingData = state[tableName].filter(item => !item.synced);
                        if (pendingData.length > 0) {
                            const payload = pendingData.map(({ synced: _synced, ...rest }) => rest);

                            // Inverso de COLUMN_MAP — camelCase local → columna lowercase en Supabase
                            const REVERSE_COLUMN_MAP = {
                                userId: 'userid', clientId: 'clientid', clientName: 'clientname',
                                paymentMethod: 'paymentmethod',
                                priceList: 'pricelist', priceA: 'pricea', priceB: 'priceb', priceC: 'pricec',
                                lugar1Activo: 'lugar1activo', lugar2Activo: 'lugar2activo',
                                userName: 'username', litrosPurificados: 'litrospurificados',
                                ventaGalones: 'ventagalones', bolsasHielo: 'bolsashielo',
                            };

                            const safePayload = payload.map(item => {
                                // Normalizar camelCase → lowercase ANTES del filtro,
                                // para que funcione incluso cuando cloudColumns está vacío
                                const normalized = { ...item };
                                Object.entries(REVERSE_COLUMN_MAP).forEach(([camel, lower]) => {
                                    if (normalized[camel] !== undefined) {
                                        normalized[lower] = normalized[camel];
                                        delete normalized[camel];
                                    }
                                });

                                const knownCols = state.cloudColumns?.[tableName];
                                if (!knownCols) return normalized;

                                const filtered = {};
                                knownCols.forEach(col => {
                                    if (normalized[col] !== undefined) filtered[col] = normalized[col];
                                });

                                return filtered;
                            });

                            const { error } = await supabase.from(tableName).upsert(safePayload);
                            if (error) {
                                console.error(`Error Syncing ${tableName}:`, error.message);
                                if (error.message.includes('column') && !state.cloudColumns?.[tableName]) {
                                    get().fetchFromSupabase();
                                }
                            } else {
                                successTables.push(tableName);
                            }
                        } else {
                            successTables.push(tableName);
                        }
                    }

                    set((s) => {
                        const nextState = { lastSync: new Date().toISOString() };
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

                        const { error } = await supabase.from('ticket_config').upsert(finalPayload);
                        if (!error) {
                            set(s => ({ ticketConfig: { ...s.ticketConfig, synced: true } }));
                        } else {
                            console.error(`Error Syncing ticket_config:`, error.message);
                        }
                    }

                    if (notify && totalPending > 0) {
                        get().showToast(`${totalPending} cambio${totalPending !== 1 ? 's' : ''} sincronizado${totalPending !== 1 ? 's' : ''} ✓`, 'success');
                    }

                } catch (error) {
                    console.error('Error sincronizando con la nube:', error);
                } finally {
                    set({ isSyncing: false });
                }
            },

            // Descarga de datos oficiales desde Supabase
            fetchFromSupabase: async () => {
                if (!get().isOnline || !supabase) return;
                // Con RLS activo, las lecturas requieren sesión Auth
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                set({ isSyncing: true });
                try {
                    const tablesToPull = ['products', 'users', 'clients', 'sales', 'inventory', 'expenses', 'deliveries'];
                    const freshData = {};
                    const cloudColumns = {};

                    // Mapea columnas que PostgreSQL devuelve en minúsculas a camelCase
                    // Mapa global lowercase→camelCase para todas las tablas.
                    // Agregar aquí cualquier columna nueva — nunca más editar por tabla.
                    const COLUMN_MAP = {
                        userid: 'userId', clientid: 'clientId', paymentmethod: 'paymentMethod',
                        pricelist: 'priceList', pricea: 'priceA', priceb: 'priceB', pricec: 'priceC',
                        lugar1activo: 'lugar1Activo', lugar2activo: 'lugar2Activo',
                        username: 'userName', litrospurificados: 'litrosPurificados',
                        ventagalones: 'ventaGalones', bolsashielo: 'bolsasHielo',
                    };
                    const normalizeRow = (_tableName, item) => {
                        const n = { ...item };
                        Object.keys(n).forEach(col => {
                            const camel = COLUMN_MAP[col];
                            if (camel && n[camel] === undefined) n[camel] = n[col];
                        });
                        return n;
                    };

                    // Columnas conocidas por tabla (para cuando la tabla esté vacía)
                    const KNOWN_COLUMNS = {
                        clients:   ['id', 'name', 'phone', 'address', 'ownername', 'note', 'userid'],
                        products:  ['id', 'name', 'stock', 'unit', 'pricea', 'priceb', 'pricec'],
                        users:     ['id', 'name', 'pin', 'role', 'pricelist', 'auth_id'],
                        sales:     ['id', 'date', 'items', 'total', 'userid', 'clientid', 'paymentmethod', 'cash', 'change'],
                        inventory: ['id', 'productid', 'quantity', 'date', 'type', 'note'],
                        expenses:  ['id', 'date', 'amount', 'description', 'userid'],
                        deliveries:['id', 'date', 'userid', 'clientid', 'clientname', 'litrospurificados', 'ventagalones', 'bolsashielo', 'note'],
                    };

                    for (const tableName of tablesToPull) {
                        const { data, error } = await supabase.from(tableName).select('*');
                        if (!error && data) {
                            freshData[tableName] = data.map(item => ({ ...normalizeRow(tableName, item), synced: true }));
                            cloudColumns[tableName] = data.length > 0
                                ? Object.keys(data[0])
                                : (KNOWN_COLUMNS[tableName] || []);
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
                                    role: updated.role || 'repartidor'
                                };
                            }
                        }

                        return {
                            ...state,
                            products:  mergeStateHelper(state.products,  freshData['products']),
                            users:     mergedUsers,
                            clients:   mergeStateHelper(state.clients,   freshData['clients']),
                            sales:     mergeStateHelper(state.sales,     freshData['sales']),
                            inventory: mergeStateHelper(state.inventory, freshData['inventory']),
                            expenses:  mergeStateHelper(state.expenses,  freshData['expenses']),
                            deliveries: mergeStateHelper(state.deliveries, freshData['deliveries']),
                            cloudColumns: { ...state.cloudColumns, ...cloudColumns },
                            currentUser: refreshedUser,
                        };
                    });

                    const { data: configData, error: configError } = await supabase.from('ticket_config').select('*').eq('id', 'main').single();
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
                    set({ isSyncing: false });
                }
            },


            // Productos
            addProduct: (product) => {
                const newProduct = { 
                    ...product, 
                    id: crypto.randomUUID(), 
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
                set((state) => ({ products: state.products.filter(p => p.id !== id) }));
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
                    inventory: [...state.inventory, { ...item, id: Date.now().toString(), date: new Date().toISOString(), synced: false }],
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
                    id: crypto.randomUUID(),
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
            deleteUser: (id) => {
                set((state) => ({ users: state.users.filter((u) => u.id !== id) }));
            },

            // Clientes
            addClient: (client) => {
                set((state) => ({ clients: [...state.clients, { ...client, id: Date.now().toString(), synced: false }] }));
                get().syncToSupabase();
            },
            updateClient: (id, client) => {
                set((state) => ({ clients: state.clients.map(c => c.id === id ? { ...c, ...client, synced: false } : c) }));
                get().syncToSupabase();
            },
            deleteClient: async (id) => {
                set((state) => ({ clients: state.clients.filter(c => c.id !== id) }));
                if (get().isOnline && supabase) {
                    await supabase.from('clients').delete().eq('id', id);
                }
            },

            // Ventas
            addSale: (sale) => {
                set((state) => {
                    const newSale = { id: Date.now().toString(), date: new Date().toISOString(), ...sale, synced: false };

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
            deleteSale: async (saleId) => {
                const state = get();
                const saleToDelete = state.sales.find(s => s.id === saleId);
                if (!saleToDelete) return;

                set((s) => ({
                    sales: s.sales.filter(s => s.id !== saleId),
                    products: s.products.map(p => {
                        const item = saleToDelete.items.find(i => i.productId === p.id);
                        if (item) {
                            return { ...p, stock: (p.stock || 0) + Number(item.quantity), synced: false };
                        }
                        return p;
                    })
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
                const newExpense = { ...expense, id: crypto.randomUUID(), synced: false };
                set(state => ({ expenses: [...state.expenses, newExpense] }));
                get().syncToSupabase();
            },
            deleteExpense: async (id) => {
                set(state => ({ expenses: state.expenses.filter(e => e.id !== id) }));
                const state = get();
                if (state.isOnline && supabase) {
                    await supabase.from('expenses').delete().eq('id', id);
                }
            },

            // Entregas de Día
            addDelivery: (delivery) => {
                const newDelivery = { ...delivery, id: crypto.randomUUID(), synced: false };
                set(state => {
                    // Ahora una entrega se identifica por fecha, usuario y cliente.
                    const existingIndex = state.deliveries.findIndex(d => 
                        d.date === delivery.date && 
                        d.userId === delivery.userId &&
                        (d.clientId || '') === (delivery.clientId || '')
                    );
                    if (existingIndex >= 0) {
                        const newDeliveries = [...state.deliveries];
                        newDeliveries[existingIndex] = { ...newDeliveries[existingIndex], ...delivery, synced: false };
                        return { deliveries: newDeliveries };
                    }
                    return { deliveries: [...state.deliveries, newDelivery] };
                });
                get().syncToSupabase();
            },
            deleteDelivery: async (id) => {
                set(state => ({ deliveries: state.deliveries.filter(d => d.id !== id) }));
                const state = get();
                if (state.isOnline && supabase) {
                    await supabase.from('deliveries').delete().eq('id', id);
                }
            },

            clearAllSales: async () => {
                set({ sales: [] });
                const state = get();
                if (state.isOnline && supabase) {
                    try {
                        await supabase.from('sales').delete().neq('id', 'placeholder');
                    } catch (error) {
                        console.error('Error vaciando ventas en la nube:', error);
                    }
                }
            },
        }),
        {
            name: 'mardehielo-storage',
            version: 3,
            migrate: (persistedState, version) => {
                if (version <= 2) {
                    // Restablecer campos booleanos de pie de página que pudieron quedar en false por error
                    return {
                        ...persistedState,
                        ticketConfig: {
                            ...persistedState.ticketConfig,
                            showFooterLine1: true,
                            showFooterLine2: persistedState.ticketConfig?.showFooterLine2 ?? true,
                            synced: false, // Forzar re-sincronización para actualizar Supabase con valores corregidos
                        }
                    };
                }
                return persistedState;
            }
        }
    )
);
