import React, { useState } from 'react';
import { useStore } from '../store';
import { Printer, X, ShoppingBag, Calendar, User, Store, Bluetooth } from 'lucide-react';
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

    const handlePrintSelected = () => {
        window.print();
    };

    const handleBTPrint = async (sale) => {
        const btPrinter = window.__btPrinter;
        if (!btPrinter) return;
        const user = users.find(u => u.id === sale.userId);
        const client = clients.find(c => c.id === sale.clientId);
        setBtPrinting(true);
        try {
            await printTicket({
                ticket: sale,
                user,
                client,
                isReprint: true,
                characteristic: btPrinter.characteristic,
                config: ticketConfig,
            });
        } catch (err) {
            alert('Error al imprimir: ' + err.message);
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
                                            <td className="py-4 px-6 text-sm text-slate-600 font-medium group-hover:text-primary transition-colors">{new Date(sale.date).toLocaleString()}</td>
                                            <td className="py-4 px-6 text-sm font-black text-slate-800">{client?.name || 'Cliente'}</td>
                                            <td className="py-4 px-6 text-lg font-black text-slate-900 text-right tracking-tight">${sale.total.toFixed(2)}</td>
                                        </tr>
                                    )
                                })}
                                {filteredSales.length === 0 && <tr><td colSpan="3" className="p-16 text-center text-slate-400 italic font-medium">No se han registrado transacciones aún.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* DETALLE DE VENTA MODAL */}
            {selectedSale && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 no-print">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Detalle de Venta</h3>
                                <p className="text-xs text-slate-400 font-mono font-bold mt-0.5 uppercase tracking-wider italic">Ticket #{selectedSale.id.slice(-6)}</p>
                            </div>
                            <button onClick={() => setSelectedSale(null)} className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all active:scale-90">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Calendar size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Fecha</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">{new Date(selectedSale.date).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <User size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Repartidor</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700 truncate">{selectedSale.userId === 'admin' ? 'Administrador' : (users.find(u => u.id === selectedSale.userId)?.name || 'Admin')}</p>
                                </div>
                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 col-span-2">
                                    <div className="flex items-center gap-2 text-primary mb-1">
                                        <Store size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Cliente / Tienda</span>
                                    </div>
                                    <p className="text-base font-black text-slate-800">{clients.find(c => c.id === selectedSale.clientId)?.name || 'General'}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Productos Vendidos</p>
                                {selectedSale.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-white border border-slate-50 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group">
                                                <ShoppingBag size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                                                <p className="text-xs text-slate-400 font-medium">{item.quantity} {item.unit || 'u'} x ${item.price.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <p className="font-black text-slate-900">${(item.quantity * item.price).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-end">
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Venta</p>
                                    <p className="text-4xl font-black text-slate-900 tracking-tighter">${selectedSale.total.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {window.__btPrinter ? (
                                        <button
                                            onClick={() => handleBTPrint(selectedSale)}
                                            disabled={btPrinting}
                                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 text-sm"
                                        >
                                            <Bluetooth size={16} />
                                            {btPrinting ? 'Enviando...' : 'BT'}
                                        </button>
                                    ) : (
                                        <a
                                            href="/impresora"
                                            className="px-3 py-2.5 border border-dashed border-slate-300 text-slate-400 hover:text-primary hover:border-primary font-bold rounded-xl flex items-center gap-1.5 text-xs active:scale-95 transition-all"
                                        >
                                            <Bluetooth size={14} /> Config BT
                                        </a>
                                    )}
                                    <button
                                        onClick={handlePrintSelected}
                                        className="px-4 py-2.5 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 text-sm"
                                    >
                                        <Printer size={16} /> Imprimir
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TICKET IMPRIMIBLE (REIMPRESIÓN) - 58mm */}
            {selectedSale && (
                <div id="ticket-print-area" className="hidden print:block">
                    <div style={{ fontFamily: 'monospace', fontSize: '8pt', lineHeight: '1.3', width: '56mm', margin: '0', padding: '2mm 0', color: '#000' }}>

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

                        <div>Ticket : #{selectedSale.id.slice(-6)}</div>
                        <div>Fecha  : {new Date(selectedSale.date).toLocaleDateString('es-MX')}</div>
                        <div>Hora   : {new Date(selectedSale.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>

                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />

                        <div>Repartidor: {selectedSale.userId === 'admin' ? 'Administrador' : (users.find(u => u.id === selectedSale.userId)?.name || 'Admin')}</div>
                        <div>Cliente   : {clients.find(c => c.id === selectedSale.clientId)?.name || 'General'}</div>

                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />

                        <div style={{ fontWeight: 'bold' }}>Cant Concepto     Importe</div>
                        <div style={{ borderTop: '1px dashed #000', margin: '2px 0' }} />
                        {selectedSale.items.map((item, idx) => (
                            <div key={idx}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{item.quantity}{item.unit || 'u'} {item.name.slice(0, 14)}</span>
                                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                                {item.pieces > 0 && (
                                    <div style={{ fontSize: '7pt', color: '#b45309' }}>└ {item.pieces} pza{item.pieces !== 1 ? 's' : ''}</div>
                                )}
                                <div style={{ textAlign: 'right', color: '#555', fontSize: '7pt' }}>@ ${item.price.toFixed(2)}/u</div>
                            </div>
                        ))}

                        <div style={{ borderTop: '2px solid #000', margin: '3px 0' }} />

                        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '12pt' }}>
                            TOTAL ${selectedSale.total.toFixed(2)}
                        </div>

                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />

                        <div style={{ textAlign: 'center', marginTop: '4px' }}>
                            {ticketConfig.footerLine1 && <div>{ticketConfig.footerLine1}</div>}
                            {ticketConfig.footerLine2 && <div>{ticketConfig.footerLine2}</div>}
                            <div style={{ fontSize: '6pt', marginTop: '2px', color: '#888' }}>Copia de historial</div>
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

