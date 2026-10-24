import React from 'react';
import TicketPreview from '../TicketPreview';

export default function SaleDetailModal({
    selectedSale,
    clients,
    users,
    ticketConfig,
    btPrinting,
    handleBTPrint,
    deleteSale,
    updateSale,
    setSelectedSale,
    showConfirm
}) {
    const [editPm, setEditPm] = React.useState('efectivo');
    // "Reimprimir" muestra primero cómo saldrá el ticket; se imprime al confirmar
    const [showPreview, setShowPreview] = React.useState(false);

    React.useEffect(() => {
        if (selectedSale) {
            setEditPm(selectedSale.paymentMethod || selectedSale.paymentmethod || 'efectivo');
        }
        setShowPreview(false);
    }, [selectedSale]);

    if (!selectedSale) return null;

    const client = clients.find(c => c.id === selectedSale.clientId);
    const seller = selectedSale.userId === 'admin' ? 'Administración' : (users.find(u => u.id === selectedSale.userId)?.name || 'Repartidor');
    const dateObj = new Date(selectedSale.date);
    const fecha = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    const hora = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    function changePm(pm) {
        setEditPm(pm);
        if (updateSale) updateSale(selectedSale.id, { paymentMethod: pm });
    }

    const saleToPrint = { ...selectedSale, paymentMethod: editPm };
    const printerConnected = !!window.__btPrinter;

    async function print() {
        if (window.__btPrinter) await handleBTPrint(saleToPrint);
        else window.print();
    }

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

                {showPreview ? (
                    <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-center mb-3">Vista previa del ticket</p>
                        <TicketPreview
                            config={ticketConfig}
                            sale={saleToPrint}
                            user={{ name: seller }}
                            client={{ name: client?.name || 'General' }}
                        />
                        {!printerConnected && (
                            <p className="mt-3 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                                Impresora Bluetooth no conectada. Conéctala desde el ícono de impresora para imprimir.
                            </p>
                        )}
                    </div>
                ) : (
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

                    {/* ── Forma de pago (editable) ── */}
                    <div className="mx-4 mt-3">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">Forma de Pago</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => changePm('efectivo')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-black text-xs transition-all active:scale-95 ${editPm !== 'transferencia' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>payments</span>
                                Efectivo
                            </button>
                            <button
                                onClick={() => changePm('transferencia')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-black text-xs transition-all active:scale-95 ${editPm === 'transferencia' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>credit_card</span>
                                Transferencia
                            </button>
                        </div>
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
                )}

                {/* ── Acciones ── */}
                {showPreview ? (
                <div className="px-4 py-3 border-t-2 border-gray-900 flex gap-2 bg-white">
                    <button
                        onClick={() => setShowPreview(false)}
                        className="px-4 flex items-center justify-center gap-1.5 bg-white text-gray-700 border border-gray-300 font-black py-3 rounded-lg active:scale-95 transition-all text-xs uppercase tracking-wide hover:border-gray-900"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>arrow_back</span>
                        Volver
                    </button>
                    <button
                        onClick={print}
                        disabled={btPrinting}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-black py-3 rounded-lg active:scale-95 transition-all disabled:opacity-50 text-xs uppercase tracking-wide"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>{btPrinting ? 'refresh' : 'print'}</span>
                        {btPrinting ? 'Imprimiendo…' : 'Imprimir'}
                    </button>
                </div>
                ) : (
                <div className="px-4 py-3 border-t-2 border-gray-900 flex gap-2 bg-white">
                    <button
                        onClick={() => setShowPreview(true)}
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
                )}
            </div>
        </div>
    );
}
