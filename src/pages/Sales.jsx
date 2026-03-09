import React, { useState } from 'react';
import { useStore } from '../store';
import { ShoppingCart, Printer, Trash2, CheckCircle, ChevronUp, ChevronDown, X, PackageOpen, Minus, Plus, ArrowLeft } from 'lucide-react';

export default function Sales() {
    const { products, clients, users, addSale, currentUser } = useStore();
    const [cart, setCart] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [generatedTicket, setGeneratedTicket] = useState(null);

    // Mobile Cart State
    const [mobileCartOpen, setMobileCartOpen] = useState(false);

    // Product Selection Modal State
    const [selectedProductDialog, setSelectedProductDialog] = useState(null);
    const [selectedQuantity, setSelectedQuantity] = useState('');

    const openProductDialog = (product) => {
        setSelectedProductDialog(product);
        setSelectedQuantity('');
    };

    const confirmAddToCart = () => {
        if (!selectedProductDialog) return;

        const numQty = parseFloat(selectedQuantity);
        if (isNaN(numQty) || numQty <= 0) return alert('Por favor, ingresa una cantidad válida');

        const existing = cart.find(item => item.productId === selectedProductDialog.id);
        if (existing) {
            setCart(cart.map(item => item.productId === selectedProductDialog.id ? { ...item, quantity: item.quantity + numQty } : item));
        } else {
            setCart([...cart, { productId: selectedProductDialog.id, name: selectedProductDialog.name, price: Number(selectedProductDialog.price), quantity: numQty, unit: selectedProductDialog.unit }]);
        }

        setSelectedProductDialog(null);
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.productId !== productId));
        if (cart.length === 1) setMobileCartOpen(false); // Close if last item removed
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const processSale = () => {
        const effectiveUserId = currentUser?.id;

        if (!effectiveUserId) return alert('No hay usuario activo');
        if (!selectedClient) return alert('Selecciona un cliente destino');
        if (cart.length === 0) return alert('El carrito está vacío');

        const sale = {
            userId: effectiveUserId,
            clientId: selectedClient,
            items: cart,
            total,
            date: new Date().toISOString()
        };

        addSale(sale);
        // eslint-disable-next-line
        setGeneratedTicket({ ...sale, id: Date.now().toString() });
        setCart([]);
        setSelectedClient('');
        setMobileCartOpen(false);
    };

    const clearCart = () => {
        if (cart.length === 0) return;
        setCart([]);
        setSelectedClient('');
        setMobileCartOpen(false);
    };

    if (generatedTicket) {
        const user = users.find(u => u.id === generatedTicket.userId);
        const client = clients.find(c => c.id === generatedTicket.clientId);

        return (
            <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[70vh]">
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 max-w-sm w-full no-print mb-6 text-center animate-in zoom-in duration-300">
                    <div className="bg-green-100 text-green-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Venta Exitosa</h2>
                    <p className="text-slate-500 mb-8 font-medium">Ticket #{generatedTicket.id.slice(-6)} generado</p>
                    <div className="flex flex-col gap-3 justify-center">
                        <button onClick={() => window.print()} className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 text-lg active:scale-95 transition-transform">
                            <Printer size={22} /> Imprimir Ticket
                        </button>
                        <button onClick={() => setGeneratedTicket(null)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl active:scale-95 transition-transform">
                            Nueva Venta
                        </button>
                    </div>
                </div>

                {/* PRINTABLE TICKET */}
                <div id="ticket-print-area" className="bg-white p-6 w-[80mm] text-black hidden print:block text-xs font-mono mx-auto">
                    <div className="text-center mb-4">
                        <h1 className="text-lg font-bold">QUESOS EL BUEN SABOR</h1>
                        <p>Ticket: #{generatedTicket.id.slice(-6)}</p>
                        <p>{new Date(generatedTicket.date).toLocaleString()}</p>
                    </div>
                    <div className="mb-4 border-t border-b border-black py-2 border-dashed">
                        <p><strong>Repartidor:</strong> {user?.name}</p>
                        <p><strong>Cliente:</strong> {client?.name}</p>
                    </div>
                    <table className="w-full text-left mb-4">
                        <thead>
                            <tr className="border-b border-black border-dashed">
                                <th>Cant</th>
                                <th>Concepto</th>
                                <th className="text-right">Importe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {generatedTicket.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="align-top py-1 text-center">{item.quantity}</td>
                                    <td className="align-top py-1">{item.name} <div className="text-[10px] text-gray-600">${item.price}/u</div></td>
                                    <td className="text-right align-top py-1">${((item.price) * (item.quantity)).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="text-right border-t border-black border-dashed pt-2 font-bold mb-4">
                        <p className="text-base">TOTAL: ${generatedTicket.total.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                        <p>¡Gracias por su compra!</p>
                        <p className="mt-8 mb-4 break-words">Firma: ________________</p>
                    </div>
                </div>
            </div>
        );
    }

    // Elemento del Carrito (Reutilizable en Desktop / Móvil)
    const renderCartPanel = () => (
        <div className="flex flex-col h-full bg-white lg:rounded-3xl shadow-2xl lg:shadow-xl border-t lg:border border-slate-100 relative">
            <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50/50 lg:rounded-t-3xl text-sm space-y-4">
                {/* Header with Title, Back Arrow (Mobile) and Clear Cart */}
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setMobileCartOpen(false)} className="lg:hidden p-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-slate-700 active:scale-95 transition-all">
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ShoppingCart size={22} className="text-primary hidden lg:block" /> Pedido</h2>
                    </div>
                    {cart.length > 0 && (
                        <button onClick={clearCart} className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg active:scale-95 transition-all flex items-center gap-1.5">
                            <Trash2 size={14} /> Vaciar
                        </button>
                    )}
                </div>

                <div>
                    <label className="block text-slate-500 font-bold mb-1.5 uppercase text-xs tracking-wider">Cliente / Tienda</label>
                    <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 p-3 rounded-xl font-medium outline-none text-slate-800 transition-all shadow-sm">
                        <option value="">Selecciona dónde se deja...</option>
                        {clients
                            .filter(c => currentUser?.role === 'admin' ? true : c.userId === currentUser?.id)
                            .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 md:p-5 pb-[120px] lg:pb-5">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 min-h-[200px]">
                        <div className="bg-slate-50 border border-slate-100 w-24 h-24 rounded-full flex items-center justify-center mb-2">
                            <PackageOpen size={40} className="text-slate-300" />
                        </div>
                        <p className="font-medium text-slate-500">Canasta vacía</p>
                    </div>
                ) : (
                    <div className="space-y-3 py-2">
                        {cart.map((item) => (
                            <div key={item.productId} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800 text-sm leading-tight mb-0.5">{item.name}</p>
                                    <p className="text-xs font-semibold text-slate-500">{item.quantity} x ${item.price.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="font-bold text-slate-900 text-base">${(item.quantity * item.price).toFixed(2)}</p>
                                    <button onClick={() => removeFromCart(item.productId)} className="text-slate-400 p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg active:scale-90 transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 border-t border-slate-100 bg-white lg:bg-slate-50/90 lg:backdrop-blur-md lg:rounded-b-3xl">
                <div className="flex justify-between items-end mb-4 px-2">
                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total Venta</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tight">${total.toFixed(2)}</span>
                </div>
                <button
                    onClick={processSale}
                    disabled={cart.length === 0}
                    className={`w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 text-base transition-all active:scale-95 ${cart.length === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-primary text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700'}`}
                >
                    Generar Recibo
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 h-full min-h-0 relative">

            {/* Products Left Side */}
            <div className="flex-1 flex flex-col pb-8 lg:pb-0">
                <div className="mb-6 px-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Venta Rápida</h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Selecciona productos para armar el pedido</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                    {products.map(p => (
                        <button
                            key={p.id}
                            onClick={() => openProductDialog(p)}
                            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-left transition-all relative overflow-hidden group hover:border-primary/40 hover:shadow-md hover:shadow-blue-500/5 active:scale-[0.98]"
                        >
                            <div className="absolute -right-6 -top-6 w-16 h-16 rounded-full transition-transform group-hover:scale-125 bg-blue-50"></div>
                            <h3 className="font-bold text-slate-800 text-sm md:text-base leading-tight mb-4 relative z-10">{p.name}</h3>

                            <div className="flex justify-between items-end relative z-10">
                                <div>
                                    <p className="text-primary font-black text-lg md:text-xl">${Number(p.price).toFixed(2)}</p>
                                    <span className="text-xs text-slate-400 font-medium block">/{p.unit || 'u'}</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                                    <Plus size={18} />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

            </div>

            {/* Cart Desktop Side */}
            <div className="hidden lg:block w-[380px] xl:w-[420px] shrink-0 h-full pb-8">
                {renderCartPanel()}
            </div>

            {/* Cart Mobile Floating Bar -> Modal */}
            <div className="lg:hidden">
                {/* Fixed Bottom Bar (Covers Bottom Nav) */}
                {!mobileCartOpen && cart.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom-2 duration-300">
                        <button
                            onClick={() => setMobileCartOpen(true)}
                            className="w-full h-[64px] pb-safe bg-slate-900 border-t border-slate-800 text-white shadow-[0_-8px_30px_rgba(0,0,0,0.15)] px-6 flex items-center justify-between transition-colors active:bg-slate-800"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <ShoppingCart size={24} className="text-white" />
                                    <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-black min-w-[1.25rem] h-5 px-1 flex justify-center items-center rounded-full border-2 border-slate-900">
                                        {cart.length}
                                    </span>
                                </div>
                                <span className="font-bold text-[17px] tracking-tight">Ver Pedido</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-black">${total.toFixed(2)}</span>
                                <ChevronUp size={22} className="text-slate-400 opacity-70" />
                            </div>
                        </button>
                    </div>
                )}

                {/* Mobile Full Screen Cart Overlay */}
                <div className={`fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${mobileCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <div className={`absolute inset-x-0 bottom-0 top-[10vh] bg-slate-50 rounded-t-[2rem] transition-transform duration-300 ease-out-expo ${mobileCartOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                        {renderCartPanel()}
                    </div>
                </div>
            </div>

            {/* Seleccionar Cantidad Modal (Desktop & Mobile) */}
            {selectedProductDialog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 relative">
                            <button
                                onClick={() => setSelectedProductDialog(null)}
                                className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <h3 className="font-bold text-xl text-slate-800 pr-8">{selectedProductDialog.name}</h3>
                            <p className="text-primary font-bold text-xl mt-1">${selectedProductDialog.price}</p>
                        </div>

                        <div className="p-6">
                            <label className="block text-center text-slate-500 font-bold mb-4 uppercase text-xs tracking-wider">Cantidad a agregar</label>

                            <div className="flex flex-col items-center justify-center gap-4 mb-8">
                                <div className="relative w-full">
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        step="any"
                                        min="0.01"
                                        value={selectedQuantity}
                                        onChange={(e) => setSelectedQuantity(e.target.value)}
                                        className="w-full text-center text-5xl font-black text-slate-800 bg-slate-50 border-[3px] border-slate-200 focus:border-primary focus:ring-0 rounded-2xl py-6 px-4 outline-none transition-colors"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">{selectedProductDialog.unit || 'u'}</div>
                                </div>
                            </div>

                            <button
                                onClick={confirmAddToCart}
                                className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all text-lg flex justify-center gap-2 items-center"
                            >
                                <ShoppingCart size={20} />
                                Al Carrito • ${(selectedProductDialog.price * (parseFloat(selectedQuantity) || 0)).toFixed(2)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
