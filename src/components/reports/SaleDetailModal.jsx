import React from 'react';

export default function SaleDetailModal({ 
    selectedSale, 
    clients, 
    users, 
    btPrinting, 
    handleBTPrint, 
    deleteSale, 
    setSelectedSale, 
    showConfirm 
}) {
    if (!selectedSale) return null;

    const client = clients.find(c => c.id === selectedSale.clientId);
    const seller = selectedSale.userId === 'admin' ? 'Administración' : (users.find(u => u.id === selectedSale.userId)?.name || 'Repartidor');
    const dateObj = new Date(selectedSale.date);
    const fecha = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    const hora = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const pm = selectedSale.paymentMethod || selectedSale.paymentmethod || 'efectivo';
    const isTransfer = pm === 'transferencia';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print">
            <div onClick={() => setSelectedSale(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-250"
            >
                {/* ── Header ── */}
                <div className="px-4 py-3 border-b-2 border-gray-900 flex items-center gap-3">
                    <button
                        onClick={() => setSelectedSale(null)}
                        className="w-9 h-9 rounded border border-gray-300 flex items-center justify-center active:scale-90 transition-all shrink-0 hover:border-gray-900"
                    >
                        <span className="material-symbols-outlined text-gray-600" style={{ fontSize: 20 }}>arrow_back</span>
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Venta</p>
                        <p className="text-sm font-black text-gray-900">#{selectedSale.id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{fecha}</p>
                        <p className="text-xs font-black text-gray-900 leading-tight">{hora}</p>
                        <p className="text-lg font-black text-gray-900 leading-tight mt-0.5">${selectedSale.total.toFixed(2)}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* ── Info grid ── */}
                    <div className="grid grid-cols-2 gap-2 mx-4 mt-4">
                        <div className="bg-white p-3 border border-gray-300 rounded-lg">
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cliente</p>
                            <p className="text-sm font-black text-gray-900 truncate">{client?.name || 'General'}</p>
                        </div>
                        <div className="bg-white p-3 border border-gray-300 rounded-lg">
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Atendió</p>
                            <p className="text-sm font-black text-gray-900 truncate">{seller}</p>
                        </div>
                    </div>

                    {/* ── Forma de pago ── */}
                    <div className="mx-4 mt-2 flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-gray-500" style={{ fontSize: 18 }}>
                                {isTransfer ? 'credit_card' : 'payments'}
                            </span>
                            <div>
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Forma de Pago</p>
                                <p className="text-sm font-black text-gray-900">{isTransfer ? 'Crédito' : 'Efectivo'}</p>
                            </div>
                        </div>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-wide border border-gray-200 px-2 py-1 rounded">
                            {isTransfer ? 'CRÉDITO' : 'EFECTIVO'}
                        </span>
                    </div>

                    {/* ── Productos ── */}
                    <div className="mx-4 mt-3 mb-4">
                        <div className="bg-gray-900 grid grid-cols-[1fr_auto] px-3 py-2 rounded-t-lg">
                            <span className="text-[9px] font-bold text-white uppercase tracking-widest">Producto</span>
                            <span className="text-[9px] font-bold text-white uppercase tracking-widest text-right">Importe</span>
                        </div>
                        <div className="border border-gray-900 border-t-0 rounded-b-lg overflow-hidden">
                            {selectedSale.items.map((item, idx) => (
                                <div key={idx} className={`grid grid-cols-[1fr_auto] items-center px-3 py-2.5 border-b border-gray-100 last:border-0 ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                                    <div className="min-w-0 pr-3">
                                        <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                        <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                                            {item.quantity}{item.unit || 'u'} × ${item.price.toFixed(2)}
                                            {item.pieces > 0 && <span className="ml-1.5 font-black text-gray-600">· {item.pieces} pzas</span>}
                                        </p>
                                    </div>
                                    <p className="text-sm font-black text-gray-900 whitespace-nowrap">${(item.quantity * item.price).toFixed(2)}</p>
                                </div>
                            ))}
                            <div className="grid grid-cols-[1fr_auto] items-center px-3 py-2.5 bg-gray-50 border-t-2 border-gray-900">
                                <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">{selectedSale.items.length} {selectedSale.items.length === 1 ? 'artículo' : 'artículos'}</span>
                                <span className="text-base font-black text-gray-900">${selectedSale.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Acciones ── */}
                <div className="px-4 py-3 border-t-2 border-gray-900 flex gap-2 bg-white">
                    <button
                        onClick={async () => {
                            const btPrinter = window.__btPrinter;
                            if (btPrinter) await handleBTPrint(selectedSale);
                            else window.print();
                        }}
                        disabled={btPrinting}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-black py-3 rounded-lg active:scale-95 transition-all disabled:opacity-50 text-xs uppercase tracking-wide"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{btPrinting ? 'refresh' : 'print'}</span>
                        {btPrinting ? 'Imprimiendo…' : 'Reimprimir'}
                    </button>
                    <button
                        onClick={() => showConfirm({
                            message: '¿Eliminar esta venta?',
                            confirmText: 'Eliminar', danger: true,
                            onConfirm: async () => {
                                await deleteSale(selectedSale.id);
                                setSelectedSale(null);
                            },
                        })}
                        className="w-12 h-12 bg-white text-gray-400 border border-gray-300 rounded-lg flex items-center justify-center active:scale-90 transition-all hover:border-red-400 hover:text-red-500"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 19 }}>delete</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
