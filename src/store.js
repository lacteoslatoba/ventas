import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './lib/supabase';

const mergeStateHelper = (localItems, freshItems) => {
    if (!freshItems) return localItems;
    const pendingLocal = localItems.filter(item => !item.synced);
    const merged = freshItems.map(remoteItem => {
        const localItem = pendingLocal.find(p => p.id === remoteItem.id);
        return localItem ? localItem : remoteItem;
    });
    const locallyCreated = pendingLocal.filter(p => !freshItems.find(r => r.id === p.id));
    return [...merged, ...locallyCreated];
};

export const useStore = create(
    persist(
        (set, get) => ({
            products: [],
            inventory: [],
            users: [],
            clients: [],
            sales: [],
            cart: [],
            selectedCartClient: '', // Cambiado de selectedClient para evitar confusión
            cloudColumns: {}, // Historial de columnas conocidas en Supabase

            // Configuración del Ticket
            ticketConfig: {
                businessName: 'LACTEOS LA TOBA',
                subtitle: '',
                address: '',
                phone: '',
                extraLine1: '',
                extraLine2: '',
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
                logoUrl: 'https://i.ibb.co/w2Kw4S4/la.png',
            },
            updateTicketConfig: (config) => {
                set((state) => ({ ticketConfig: { ...state.ticketConfig, ...config, synced: false } }));
                get().syncToSupabase();
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
            login: (username, password) => {
                const state = get();
                const cleanUsername = username.trim().toLowerCase();
                const cleanPassword = password.trim();

                // Admin hardcoded con nueva clave
                if (cleanUsername === 'admin' && cleanPassword === '5151') {
                    set({ currentUser: { id: 'admin', name: 'Administrador', role: 'admin' } });
                    return true;
                }
                // Usuarios de la base de datos
                const user = state.users.find(u => (u.name || '').trim().toLowerCase() === cleanUsername && u.pin === cleanPassword);
                if (user) {
                    set({ currentUser: { ...user, role: 'repartidor' } });
                    return true;
                }
                return false;
            },
            logout: () => set({ currentUser: null }),

            // Estado de Red / Nube
            isOnline: navigator.onLine,
            isSyncing: false,
            lastSync: null,

            setOnlineStatus: (status) => set({ isOnline: status }),

            // Motor de Sincronización Automática (Subida)
            syncToSupabase: async () => {
                const state = get();
                if (!state.isOnline || !supabase) return;

                set({ isSyncing: true });

                try {
                    const tablesToSync = ['products', 'users', 'clients', 'inventory', 'sales'];
                    const successTables = [];

                    for (const tableName of tablesToSync) {
                        const pendingData = state[tableName].filter(item => !item.synced);
                        if (pendingData.length > 0) {
                            // Remove the 'synced' property from the payload sent to the cloud
                            // Remove userId if it's 'admin' to avoid foreign key violation if the DB allows nulls,
                            // or replace it with a valid system UUID if known.
                            // For now, we'll try to omit it or set it to null if it's 'admin'.
                            const payload = pendingData.map(({ synced: _synced, ...rest }) => {
                                if (rest.userId === 'admin') {
                                    // If 'admin' is not a valid UUID, we might need to omit it or use a fallback.
                                    // Most Supabase schemas for 'sales' will require a valid user_id.
                                    // We'll keep it as is for now but add a comment, 
                                    // or we could try to 'borrow' the first real user ID if any exists as a fallback.
                                    const firstRealUser = state.users[0]?.id;
                                    if (firstRealUser) {
                                        return { ...rest, userId: firstRealUser };
                                    }
                                }
                                return rest;
                            });

                            // ─── Sincronización Inteligente (Filtrado de columnas) ───
                            const safePayload = payload.map(item => {
                                const knownCols = state.cloudColumns?.[tableName];
                                if (!knownCols) return item; // Si no conocemos las columnas, probamos suerte

                                // Solo dejamos los campos que existen en la nube
                                const filtered = {};
                                knownCols.forEach(col => {
                                    if (item[col] !== undefined) filtered[col] = item[col];
                                });
                                return filtered;
                            });

                            const { error } = await supabase.from(tableName).upsert(safePayload);
                            if (error) {
                                console.error(`Error Syncing ${tableName}:`, error.message);
                                // Si falló por columnas y no teníamos guardado el esquema, avisamos una vez
                                if (error.message.includes('column') && !state.cloudColumns?.[tableName]) {
                                    console.warn(`Esquema desactualizado en ${tableName}. Refrescando columnas...`);
                                    get().fetchFromSupabase(); // Intentar aprender el esquema real
                                }
                            } else {
                                successTables.push(tableName);
                            }
                        } else {
                            successTables.push(tableName);
                        }
                    }

                    // Marcamos como sincronizadas SOLO las tablas que tuvieron éxito
                    set((s) => {
                        const nextState = { lastSync: new Date().toISOString() };
                        successTables.forEach(t => {
                            nextState[t] = s[t].map(x => ({ ...x, synced: true }));
                        });
                        return nextState;
                    });

                    // Sincronización especial de Ticket Config (con Empaquetado JSON para campos faltantes)
                    if (state.ticketConfig && !state.ticketConfig.synced) {
                        const { synced: _synced, ...payload } = state.ticketConfig;
                        const knownCols = state.cloudColumns?.['ticket_config'];
                        
                        let finalPayload = { id: 'main' };
                        
                        if (knownCols) {
                            const extraData = {};
                            const legacyMap = {
                                businessName: 'header',
                                footerLine1: 'footer',
                                printCopy: 'doubleCopy'
                            };

                            Object.keys(payload).forEach(key => {
                                const dbCol = legacyMap[key] || key;
                                if (knownCols.includes(dbCol)) {
                                    finalPayload[dbCol] = payload[key];
                                } else {
                                    extraData[key] = payload[key];
                                }
                            });

                            if (Object.keys(extraData).length > 0 && knownCols.includes('footer')) {
                                const currentFooter = payload.footerLine1 || '';
                                finalPayload.footer = `JSON_CONFIG:${JSON.stringify({ ...extraData, _realFooter: currentFooter })}`;
                            }
                        } else {
                            finalPayload = { id: 'main', ...payload };
                        }

                        const { error } = await supabase.from('ticket_config').upsert(finalPayload);
                        if (!error) {
                            set(s => ({ ticketConfig: { ...s.ticketConfig, synced: true } }));
                        } else {
                            console.error(`Error Syncing ticket_config:`, error.message);
                        }
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
                set({ isSyncing: true });
                try {
                    const tablesToPull = ['products', 'users', 'clients'];
                    const tablesToCheckCols = ['inventory', 'sales'];
                    const freshData = {};
                    const cloudColumns = {};

                    for (const tableName of tablesToPull) {
                        const { data, error } = await supabase.from(tableName).select('*');
                        if (!error && data) {
                            freshData[tableName] = data.map(item => ({ ...item, synced: true }));
                            if (data.length > 0) cloudColumns[tableName] = Object.keys(data[0]);
                        }
                    }

                    for (const tableName of tablesToCheckCols) {
                        const { data, error } = await supabase.from(tableName).select('*').limit(1);
                        if (!error && data && data.length > 0) {
                            cloudColumns[tableName] = Object.keys(data[0]);
                        }
                    }

                    set((state) => ({
                        ...state,
                        products: mergeStateHelper(state.products, freshData['products']),
                        users: mergeStateHelper(state.users, freshData['users']),
                        clients: mergeStateHelper(state.clients, freshData['clients']),
                        cloudColumns: { ...state.cloudColumns, ...cloudColumns }
                    }));

                    // Descarga especial de Ticket Config (con Desempaquetado JSON)
                    const { data: configData, error: configError } = await supabase.from('ticket_config').select('*').eq('id', 'main').single();
                    if (!configError && configData) {
                        set(s => {
                            if (s.ticketConfig?.synced) {
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
                                    businessName: finalConfig.header || finalConfig.businessName,
                                    footerLine1: finalConfig.footer || finalConfig.footerLine1,
                                    printCopy: finalConfig.doubleCopy !== undefined ? finalConfig.doubleCopy : finalConfig.printCopy
                                };

                                const cleanData = {};
                                Object.keys(mappedConfig).forEach(key => {
                                    if (mappedConfig[key] !== null && mappedConfig[key] !== undefined) {
                                        cleanData[key] = mappedConfig[key];
                                    }
                                });

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
                    price: Number(product.priceA) || 0 // Por compatibilidad
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
                                updated.price = Number(data.priceA); // Sincronizar legacy price
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
                // Considerar soft delete si se sincroniza con servidor
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
                    const newSale = { ...sale, id: Date.now().toString(), date: new Date().toISOString(), synced: false };

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
        }),
        {
            name: 'ventas-quesos-storage',
            version: 2,
        }
    )
);
