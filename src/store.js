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

                            const { error } = await supabase.from(tableName).upsert(payload);
                            if (error) {
                                console.error(`Error Syncing ${tableName}:`, error.message);
                                if (error.message.includes('column')) {
                                    alert(`ERROR DE NUBE: La tabla "${tableName}" no está actualizada. Falta una columna (como el PIN). Por favor comunícate para añadirla en Supabase.`);
                                }
                                // Mantenemos registro del error pero continuamos con las demás tablas
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
                        // Forzamos un id único para configuraciones globales
                        const { error } = await supabase.from('ticket_config').upsert({ id: 'main', ...payload });
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
                    const tablesToSync = ['products', 'users', 'clients'];
                    const freshData = {};

                    for (const tableName of tablesToSync) {
                        const { data, error } = await supabase.from(tableName).select('*');
                        if (!error && data) {
                            // Mapear los datos de bajada para que la app sepa que ya están sincronizados
                            freshData[tableName] = data.map(item => ({ ...item, synced: true }));
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
                            clients: mergeState('clients')
                        };
                    });

                    // Descarga especial de Ticket Config
                    const { data: configData, error: configError } = await supabase.from('ticket_config').select('*').eq('id', 'main').single();
                    if (!configError && configData) {
                        set(s => {
                            // Solo sobreescribimos si no tenemos cambios locales sin sincronizar
                            if (s.ticketConfig?.synced) {
                                return { ticketConfig: { ...configData, synced: true } };
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
                set((state) => ({ products: [...state.products, { ...product, id: Date.now().toString(), synced: false }] }));
                get().syncToSupabase();
            },
            updateProduct: (id, product) => {
                set((state) => ({ products: state.products.map(p => p.id === id ? { ...p, ...product, synced: false } : p) }));
                get().syncToSupabase();
            },
            deleteProduct: async (id) => {
                set((state) => ({ products: state.products.filter(p => p.id !== id) }));
                if (get().isOnline && supabase) {
                    await supabase.from('products').delete().eq('id', id);
                }
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
                set((state) => ({ users: [...state.users, { ...user, id: Date.now().toString(), synced: false }] }));
                get().syncToSupabase();
            },
            updateUser: (id, user) => {
                set((state) => ({ users: state.users.map(u => u.id === id ? { ...u, ...user, synced: false } : u) }));
                get().syncToSupabase();
            },
            deleteUser: async (id) => {
                set((state) => ({ users: state.users.filter(u => u.id !== id) }));
                if (get().isOnline && supabase) {
                    const { error } = await supabase.from('users').delete().eq('id', id);
                    if (error) console.error("Error Delete User:", error);
                }
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
