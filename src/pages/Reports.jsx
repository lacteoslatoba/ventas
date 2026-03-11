import React, { useState } from 'react';
import { useStore } from '../store';
import { Printer, X, ShoppingBag, Calendar, User, Store, Bluetooth, ArrowLeft } from 'lucide-react';
import { printTicket } from '../lib/bluetoothPrinter';

export default function Reports() {
    const { sales, users, clients, currentUser, ticketConfig } = useStore();
    const [filterUser, setFilterUser] = useState('');
    const [selectedSale, setSelectedSale] = useState(null);
    const [btPrinting, setBtPrinting] = useState(false);

    const isAdmin = currentUser?.role === 'admin';
    const effectiveFilterUser = isAdmin ? filterUser : currentUser?.id;

    const filteredSales = effectiveFilterUser ? sales.filter(s => s.userId === effectiveFilterUser) : sales;
    const totalEarned = filteredSales.reduce((sum, s) => sum + s.total, 0);



    const handleBTPrint = async (sale) => {
        const btPrinter = window.__btPrinter;
        if (!btPrinter) return;

        setBtPrinting(true);
        try {
            // Asegurar que encontramos el nombre del repartidor y cliente
            const user = sale.userId === 'admin' ? { name: 'Administrador' } : users.find(u => u.id === sale.userId);
            const client = clients.find(c => c.id === sale.clientId) || { name: 'General' };

            await printTicket({
                ticket: sale,
                user,
                client,
                isReprint: true,
                characteristic: btPrinter.characteristic,
                config: ticketConfig,
            });
        } catch (err) {
            console.error('Error reimprimiendo:', err);
            alert('No se pudo imprimir el ticket. Verifica la conexión.');
        } finally {
            setBtPrinting(false);
        }
    };

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Reportes de Venta</h1>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                {isAdmin ? (
                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Filtrar por Repartidor</label>
                        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="w-full sm:w-64 border border-slate-200 rounded-lg p-2 outline-none">
                            <option value="">Todos los repartidores</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm font-black uppercase tracking-widest text-primary mb-1">Mis ventas</p>
                        <p className="text-slate-500 font-medium">Resumen personal de hoy</p>
                    </div>
                )}
                <div className="text-right">
                    <p className="text-sm text-slate-500 font-medium">Total Vendido</p>
                    <p className="text-4xl font-black text-green-600">${totalEarned.toFixed(2)}</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto backdrop-blur-sm">
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Historial de Transacciones</h2>
                        <p className="text-sm text-slate-500 font-medium">Pulsa una venta para ver el detalle o imprimir</p>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="py-4 px-6 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Fecha / Hora</th>
                                    <th className="py-4 px-6 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Cliente / Destino</th>
                                    <th className="py-4 px-6 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Total Venta</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.slice().reverse().map(sale => {
                                    const client = clients.find(c => c.id === sale.clientId);
                                    return (
                                        <tr
                                            key={sale.id}
                                            onClick={() => setSelectedSale(sale)}
                                            className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group"
                                        >
                                            <td className="py-4 px-6 text-sm text-slate-500 font-normal group-hover:text-primary transition-colors">{new Date(sale.date).toLocaleString()}</td>
                                            <td className="py-4 px-6 text-sm font-normal text-slate-700">{client?.name || 'Cliente'}</td>
                                            <td className="py-4 px-6 text-base font-normal text-slate-900 text-right tracking-tight">${sale.total.toFixed(2)}</td>
                                        </tr>
                                    )
                                })}
                                {filteredSales.length === 0 && <tr><td colSpan="3" className="p-16 text-center text-slate-400 italic font-medium">No se han registrado transacciones aún.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* DETALLE DE VENTA - INTERFAZ PREMIUM */}
            {selectedSale && (
                <div className="fixed inset-0 z-[100] bg-background-light dark:bg-background-dark animate-in slide-in-from-bottom duration-300 no-print flex flex-col items-center">
                    <div className="relative flex h-full w-full max-w-md mx-auto flex-col bg-white dark:bg-background-dark overflow-x-hidden shadow-2xl">
                        
                        {/* Top App Bar */}
                        <div className="flex items-center bg-white dark:bg-background-dark p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                            <button 
                                onClick={() => setSelectedSale(null)}
                                className="text-slate-900 dark:text-slate-100 flex size-10 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
                            </button>
                            <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight tracking-tight flex-1 ml-2">
                                Venta #{selectedSale.id.slice(-6)}
                            </h2>
                            <button className="flex items-center justify-center rounded-lg h-10 w-10 text-slate-400">
                                <span className="material-symbols-outlined text-2xl">more_vert</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 p-4 pb-32">
                            {/* Status Badge */}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-full w-fit">
                                <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                                <span className="text-[10px] font-black uppercase tracking-wider">Venta Finalizada</span>
                            </div>

                            {/* Customer Section */}
                            <section>
                                <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Información del Cliente</h3>
                                {(() => {
                                    const client = clients.find(c => c.id === selectedSale.clientId);
                                    return (
                                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                                            <div className="bg-primary/10 flex items-center justify-center rounded-full h-14 w-14 border-2 border-white dark:border-slate-700 shadow-sm text-primary font-black text-xl">
                                                {client?.name?.charAt(0) || 'C'}
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <p className="text-slate-900 dark:text-white text-lg font-black leading-none mb-1 truncate">{client?.name || 'Cliente General'}</p>
                                                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium truncate">{client?.address || 'Sin dirección registrada'}</p>
                                                <p className="text-primary text-sm font-bold mt-1">{client?.phone || 'Sin teléfono'}</p>
                                            </div>
                                            {client?.phone && (
                                                <a href={`tel:${client.phone}`} className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/20 active:scale-90 transition-all">
                                                    <span className="material-symbols-outlined text-xl">phone</span>
                                                </a>
                                            )}
                                        </div>
                                    );
                                })()}
                            </section>

                            {/* Order Items Section */}
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Resumen del Pedido</h3>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        {selectedSale.items.length} {selectedSale.items.length === 1 ? 'Producto' : 'Productos'}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {selectedSale.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4 bg-white dark:bg-background-dark py-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                            <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                                                <span className="material-symbols-outlined text-slate-300">inventory_2</span>
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <p className="text-slate-900 dark:text-white text-base font-black leading-tight truncate">{item.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold">{item.quantity}{item.unit || 'u'} × ${item.price.toFixed(2)}</p>
                                                    {item.pieces > 0 && (
                                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg border border-amber-100">
                                                            {item.pieces} pzas
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-slate-900 dark:text-white text-base font-black tracking-tight">${(item.quantity * item.price).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Payment Breakdown */}
                            <section className="mt-2 space-y-2 bg-slate-50 dark:bg-slate-900/30 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-center text-slate-500">
                                    <span className="text-xs font-bold uppercase tracking-wider">Subtotal</span>
                                    <span className="text-sm font-black">${selectedSale.total.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-500">
                                    <span className="text-xs font-bold uppercase tracking-wider">Envío</span>
                                    <span className="text-sm font-black text-emerald-500">GRATIS</span>
                                </div>
                                <div className="pt-4 mt-2 border-t-2 border-dashed border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Total Cobrado</span>
                                    <span className="text-3xl font-black text-primary tracking-tighter">${selectedSale.total.toFixed(2)}</span>
                                </div>
                            </section>

                            {/* Info Extra (User / Time) */}
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                        <span className="material-symbols-outlined text-lg">person</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atendió</p>
                                        <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                                            {selectedSale.userId === 'admin' ? 'Administración' : (users.find(u => u.id === selectedSale.userId)?.name?.split(' ')[0] || 'Repartidor')}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                        <span className="material-symbols-outlined text-lg">schedule</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hora</p>
                                        <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                                            {new Date(selectedSale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Area - Sticky Bottom */}
                        <div className="mt-auto p-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                            <button 
                                onClick={async () => {
                                    const btPrinter = window.__btPrinter;
                                    if (btPrinter) {
                                        await handleBTPrint(selectedSale);
                                    } else {
                                        window.print();
                                    }
                                }}
                                disabled={btPrinting}
                                className="w-full bg-primary hover:bg-blue-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-primary/25 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {btPrinting ? (
                                    <span className="material-symbols-outlined animate-spin">refresh</span>
                                ) : (
                                    <span className="material-symbols-outlined">print</span>
                                )}
                                <span className="text-lg">{btPrinting ? 'Imprimiendo...' : 'Reimprimir Ticket'}</span>
                            </button>
                            
                            <div className="flex gap-3">
                                {(() => {
                                    const client = clients.find(c => c.id === selectedSale.clientId);
                                    return client?.address ? (
                                        <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
                                        >
                                            <span className="material-symbols-outlined text-xl">map</span>
                                            <span>Ver Mapa</span>
                                        </a>
                                    ) : (
                                        <div className="flex-1 opacity-30 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-sm">
                                            <span className="material-symbols-outlined text-xl">map_off</span>
                                            <span>Sin Mapa</span>
                                        </div>
                                    );
                                })()}
                                <button 
                                    onClick={() => setSelectedSale(null)}
                                    className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
                                >
                                    <span className="material-symbols-outlined text-xl">close</span>
                                    <span>Cerrar</span>
                                </button>
                            </div>
                        </div>

                        {/* Bottom Spacer for mobile chin */}
                        <div className="h-6 bg-white dark:bg-background-dark"></div>
                    </div>
                </div>
            )}

            {/* TICKET IMPRIMIBLE (REIMPRESIÓN) - 58mm */}
            {selectedSale && (
                <div id="ticket-print-area" className="hidden print:block">
                    <div style={{ fontFamily: 'monospace', fontSize: '8pt', lineHeight: '1.2', width: `${(ticketConfig.paperWidth || 58) - 2}mm`, margin: '0', padding: '2mm 0', color: '#000' }}>

                        {/* Encabezado negocio */}
                        <div style={{ textAlign: 'center', marginBottom: '3px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '11pt', lineHeight: '1.2' }}>
                                {ticketConfig.businessName || 'MI NEGOCIO'}
                            </div>
                            {ticketConfig.subtitle && <div>{ticketConfig.subtitle}</div>}
                            {ticketConfig.address && <div>{ticketConfig.address}</div>}
                            {ticketConfig.phone && <div>Tel: {ticketConfig.phone}</div>}
                            {ticketConfig.extraLine1 && <div>{ticketConfig.extraLine1}</div>}
                            {ticketConfig.extraLine2 && <div>{ticketConfig.extraLine2}</div>}
                            <div style={{ marginTop: '2px', fontWeight: 'bold' }}>** REIMPRESION **</div>
                        </div>

                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />

                        <div>Ticket : #{selectedSale.id.slice(-6).toUpperCase()}</div>
                        <div>Fecha  : {new Date(selectedSale.date).toLocaleDateString('es-MX')}</div>
                        <div>Hora   : {new Date(selectedSale.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>

                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />

                        <div>Repartidor: {selectedSale.userId === 'admin' ? 'Administrador' : (users.find(u => u.id === selectedSale.userId)?.name || 'Repartidor')}</div>
                        <div>Cliente   : {clients.find(c => c.id === selectedSale.clientId)?.name || 'General'}</div>

                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />

                        <div style={{ fontWeight: 'bold' }}>CANT CONCEPTO         IMPORTE</div>
                        <div style={{ borderTop: '1px dashed #000', margin: '2px 0' }} />
                        {selectedSale.items.map((item, idx) => (
                            <div key={idx} style={{ marginBottom: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{item.quantity}{item.unit === 'Kg' ? 'kg' : 'x'} {item.name.slice(0, 16)}</span>
                                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7pt' }}>
                                    <span style={{ color: '#666' }}>@ ${item.price.toFixed(2)}/u {item.pieces > 0 ? `[${item.pieces} pzas]` : ''}</span>
                                </div>
                            </div>
                        ))}

                        <div style={{ borderTop: '2px solid #000', margin: '3px 0' }} />

                        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '13pt' }}>
                            TOTAL ${selectedSale.total.toFixed(2)}
                        </div>

                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />

                        <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '8pt' }}>
                            {ticketConfig.footerLine1 && <div>{ticketConfig.footerLine1}</div>}
                            {ticketConfig.footerLine2 && <div>{ticketConfig.footerLine2}</div>}
                        </div>

                        {ticketConfig.showSignature && (
                            <div style={{ marginTop: '12px' }}>Firma: ________________________</div>
                        )}

                        <div style={{ marginTop: '20px' }} />
                    </div>
                </div>
            )}
        </div>
    );
}

