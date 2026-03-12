import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './lib/supabase';

export const useStore = create(
    persist(
        (set, get) => ({
            products: [],
            inventory: [],
            users: [],
            clients: [],
            sales: [],
            cloudColumns: {}, // Historial de columnas conocidas en Supabase

            // Configuración del Ticket
            ticketConfig: {
                businessName: 'QUESOS EL BUEN SABOR',
                subtitle: '',
                address: '',
                phone: '',
                extraLine1: '',
                extraLine2: '',
                footerLine1: '¡Gracias por su compra!',
                footerLine2: '',
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
            },
            updateTicketConfig: (config) => {
                set((state) => ({ ticketConfig: { ...state.ticketConfig, ...config, synced: false } }));
                get().syncToSupabase();
            },

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

                    // Sincronización especial de Ticket Config
                    if (state.ticketConfig && !state.ticketConfig.synced) {
                        const { synced: _synced, ...payload } = state.ticketConfig;
                        
                        // ─── Sincronización Inteligente para Ticket Config ───
                        const knownCols = state.cloudColumns?.['ticket_config'];
                        let safePayload = { id: 'main', ...payload };
                        
                        if (knownCols) {
                            const filtered = { id: 'main' };
                            knownCols.forEach(col => {
                                if (payload[col] !== undefined) filtered[col] = payload[col];
                            });
                            safePayload = filtered;
                        }

                        const { error } = await supabase.from('ticket_config').upsert(safePayload);
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

                    // 1. Descargar datos de tablas maestras y detectar sus columnas
                    for (const tableName of tablesToPull) {
                        const { data, error } = await supabase.from(tableName).select('*');
                        if (!error && data) {
                            freshData[tableName] = data.map(item => ({ ...item, synced: true }));
                            if (data.length > 0) cloudColumns[tableName] = Object.keys(data[0]);
                        }
                    }

                    // 2. Solo detectar columnas de tablas transaccionales (sin bajar todos los datos)
                    for (const tableName of tablesToCheckCols) {
                        const { data, error } = await supabase.from(tableName).select('*').limit(1);
                        if (!error && data && data.length > 0) {
                            cloudColumns[tableName] = Object.keys(data[0]);
                        }
                    }

                    set((state) => {
                        // Función para fusionar preservando los cambios locales sin sincronizar
                        const mergeState = (tableName) => {
                            const newArray = freshData[tableName];
                            if (!newArray) return state[tableName];

                            const pendingLocal = state[tableName].filter(item => !item.synced);

                            // Iniciamos con los que vienen de la nube y sobreescribimos con los pendientes locales
                            const merged = newArray.map(remoteItem => {
                                const localItem = pendingLocal.find(p => p.id === remoteItem.id);
                                return localItem ? localItem : remoteItem;
                            });

                            // Agregamos aquellos que fueron creados localmente y no están en la nube
                            const locallyCreated = pendingLocal.filter(p => !newArray.find(r => r.id === p.id));
                            return [...merged, ...locallyCreated];
                        };

                        return {
                            ...state,
                            products: mergeState('products'),
                            users: mergeState('users'),
                            clients: mergeState('clients'),
                            cloudColumns: { ...state.cloudColumns, ...cloudColumns } // Persistir conocimiento de la estructura
                        };
                    });

                    // Descarga especial de Ticket Config
                    const { data: configData, error: configError } = await supabase.from('ticket_config').select('*').eq('id', 'main').single();
                    if (!configError && configData) {
                        set(s => {
                            // Solo sobreescribimos si no tenemos cambios locales sin sincronizar
                            if (s.ticketConfig?.synced) {
                                return { 
                                    ticketConfig: { ...configData, synced: true },
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
        }
    )
);
