import React, { useState } from 'react';
import { useStore } from '../store';
import { ShoppingCart, Printer, Delete, Trash2, CheckCircle, ChevronUp, X, PackageOpen, Minus, Plus, ArrowLeft, Bluetooth, Banknote, LogOut, Users, LayoutGrid, Package } from 'lucide-react';

import { Link, useNavigate } from 'react-router-dom';
import TicketPreview from '../components/TicketPreview';
import ProductDialog from '../components/sales/ProductDialog';
import SuccessModal from '../components/sales/SuccessModal';
function CartPanel({ cart, clients, currentUser, selectedCartClient, updateSelectedCartClient, paymentMethod, setPaymentMethod, clearCart, removeFromCart, total, processSale }) {
    return (
        <div className="flex flex-col h-full bg-white lg:rounded-3xl lg:shadow-xl border-t lg:border border-slate-100 relative">
            <div className="p-5 flex justify-between items-center bg-slate-50/50 border-b border-slate-100 shrink-0">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">🛒 Detalle del Carrito</h2>
                {cart.length > 0 && (
                    <button onClick={clearCart} className="text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-wider">
                        <Trash2 size={12} /> Vaciar Borrador
                    </button>
                )}
            </div>

            <div className="px-5 py-4 bg-white border-b border-slate-100 shrink-0 space-y-3">
                <div>
                    <label className="block text-slate-400 font-black mb-1.5 uppercase text-[10px] tracking-widest">Información de Entrega</label>
                    <select value={selectedCartClient} onChange={e => updateSelectedCartClient(e.target.value)} className="w-full bg-slate-50 border-none shadow-inner focus:ring-2 focus:ring-primary/20 p-4 rounded-2xl font-black outline-none text-slate-800 transition-all">
                        <option value="">Selecciona Cliente / Tienda...</option>
                        {clients
                            .filter(c => currentUser?.role === 'admin' ? true : c.userId === currentUser?.id)
                            .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-slate-400 font-black mb-2 uppercase text-[10px] tracking-widest">Forma de Pago</label>
                    <div className="flex gap-2">
                        {[
                            { value: 'efectivo',       label: 'Efectivo',       icon: 'payments',         activeClass: 'border-emerald-500 bg-emerald-50', dotClass: 'border-emerald-500 bg-emerald-500', textClass: 'text-emerald-700' },
                            { value: 'transferencia',  label: 'Crédito',        icon: 'credit_card',      activeClass: 'border-blue-500 bg-blue-50',        dotClass: 'border-blue-500 bg-blue-500',        textClass: 'text-blue-700'    },
                        ].map(opt => (
                            <label
                                key={opt.value}
                                className={`flex-1 flex items-center gap-2.5 px-3.5 py-3 rounded-2xl cursor-pointer transition-all border-2 select-none ${paymentMethod === opt.value ? opt.activeClass : 'border-slate-200 bg-slate-50'}`}
                            >
                                <input type="radio" name="paymentMethod" value={opt.value} checked={paymentMethod === opt.value} onChange={() => setPaymentMethod(opt.value)} className="hidden" />
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${paymentMethod === opt.value ? opt.dotClass : 'border-slate-300 bg-white'}`}>
                                    {paymentMethod === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <span className={`text-xs font-black uppercase tracking-wide leading-none ${paymentMethod === opt.value ? opt.textClass : 'text-slate-500'}`}>{opt.label}</span>
                            </label>
                        ))}
                    </div>
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
                                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                                        <p className="text-xs font-semibold text-slate-500">{item.quantity} {item.unit || 'u'} × ${item.price.toFixed(2)}</p>
                                        {item.pieces > 0 && (
                                            <span className="text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                                {item.pieces} pza{item.pieces !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
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

            <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-slate-100 bg-white lg:bg-slate-50/90 lg:backdrop-blur-md lg:rounded-b-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-end mb-5 px-1">
                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total Venta</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tight">${total.toFixed(2)}</span>
                </div>
                <button
                    onClick={processSale}
                    disabled={cart.length === 0}
                    className={`w-full py-5 rounded-2xl font-black flex justify-center items-center gap-2 text-lg transition-all active:scale-95 border-2 ${cart.length === 0 ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed shadow-none' : 'border-primary bg-white text-primary shadow-xl shadow-blue-500/5 hover:bg-blue-50'}`}
                >
                    Generar Recibo
                </button>
            </div>
        </div>
    );
}

export default function Sales() {
    const {
        products, clients, users, addSale, currentUser, ticketConfig,
        cart, updateCart, selectedCartClient, updateSelectedCartClient, showToast
    } = useStore();
    const navigate = useNavigate();
    const todayStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD en local
    const [saleDate, setSaleDate] = useState(todayStr);
    const [generatedTicket, setGeneratedTicket] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('efectivo');

    // Mobile Cart State
    const [mobileCartOpen, setMobileCartOpen] = useState(false);

    // Product Selection Modal State
    const [selectedProductDialog, setSelectedProductDialog] = useState(null);

    // Lista de precios activa del usuario (soporta camelCase y lowercase de Supabase)
    const userPriceList = currentUser?.priceList || currentUser?.pricelist || 'A';
    const getPrecio = (p) => {
        if (!p) return 0;
        if (userPriceList === 'B') return Number(p.priceB || p.priceb) || Number(p.priceA || p.pricea || p.price) || 0;
        if (userPriceList === 'C') return Number(p.priceC || p.pricec) || Number(p.priceA || p.pricea || p.price) || 0;
        return Number(p.priceA || p.pricea || p.price) || 0;
    };

    const openProductDialog = (product) => {
        setSelectedProductDialog(product);
    };

    const handleAddToCart = (numQty, numPieces) => {
        const productPrice = getPrecio(selectedProductDialog);
        updateCart(currentCart => {
            const existing = currentCart.find(item => item.productId === selectedProductDialog.id);
            if (existing) {
                return currentCart.map(item => item.productId === selectedProductDialog.id
                    ? { ...item, quantity: item.quantity + numQty, pieces: (item.pieces || 0) + numPieces }
                    : item);
            } else {
                return [...currentCart, {
                    productId: selectedProductDialog.id,
                    name: selectedProductDialog.name,
                    price: productPrice,
                    quantity: numQty,
                    pieces: numPieces,
                    unit: selectedProductDialog.unit || 'u'
                }];
            }
        });
        setSelectedProductDialog(null);
    };

    const removeFromCart = (productId) => {
        updateCart(cart.filter(item => item.productId !== productId));
        if (cart.length === 1) setMobileCartOpen(false); // Close if last item removed
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const processSale = React.useCallback(() => {
        const effectiveUserId = currentUser?.id;

        if (!effectiveUserId) { showToast('No hay usuario activo', 'error'); return; }
        if (!selectedCartClient) { showToast('Selecciona un cliente destino', 'warning'); return; }
        if (cart.length === 0) { showToast('El carrito está vacío', 'warning'); return; }

        const now = new Date();
        const [y, m, d] = saleDate.split('-').map(Number);
        const saleDateTime = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
        const sale = {
            id: crypto.randomUUID(),
            userId: effectiveUserId,
            clientId: selectedCartClient,
            items: cart,
            total,
            paymentMethod,
            date: saleDateTime.toISOString()
        };

        addSale(sale);
        setGeneratedTicket(sale);
        updateCart([]);
        updateSelectedCartClient('');
        setPaymentMethod('efectivo');
        setMobileCartOpen(false);
    }, [currentUser, selectedCartClient, cart, total, paymentMethod, saleDate, addSale, showToast, updateCart, updateSelectedCartClient]);

    const clearCart = () => {
        if (cart.length === 0) return;
        updateCart([]);
        updateSelectedCartClient('');
        setMobileCartOpen(false);
    };

    if (generatedTicket) {
        return (
            <SuccessModal 
                generatedTicket={generatedTicket} 
                setGeneratedTicket={setGeneratedTicket} 
                users={users} 
                clients={clients} 
                ticketConfig={ticketConfig} 
                showToast={showToast} 
            />
        );
    }

    const cartPanelProps = { cart, clients, currentUser, selectedCartClient, updateSelectedCartClient, paymentMethod, setPaymentMethod, clearCart, removeFromCart, total, processSale };

    return (
        <div className="p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 h-full min-h-0 relative">

            {/* Products Left Side */}
            <div className="flex-1 flex flex-col pb-[140px] lg:pb-0">
                <div className="mb-6 px-1 flex justify-between items-start border-b-2 border-gray-900 pb-4">
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">{ticketConfig?.businessName || 'Lacteos La Toba'}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Venta Rápida</h1>
                            <input 
                                type="date" 
                                value={saleDate} 
                                onChange={(e) => setSaleDate(e.target.value)} 
                                className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border-none outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                            />
                        </div>
                    </div>
                    {currentUser?.role === 'admin' && (
                        <Link to="/menu" className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all active:scale-90 lg:hidden">
                            <X size={24} />
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                    {[...products].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999)).map(p => (
                        <button
                            key={p.id}
                            onClick={() => openProductDialog(p)}
                            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-left transition-all relative overflow-hidden group hover:border-primary/40 hover:shadow-md hover:shadow-blue-500/5 active:scale-[0.98]"
                        >
                            <div className="absolute -right-6 -top-6 w-16 h-16 rounded-full transition-transform group-hover:scale-125 bg-blue-50"></div>
                            <h3 className="font-bold text-slate-800 text-sm md:text-base leading-tight mb-4 relative z-10">{p.name}</h3>

                            <div className="flex justify-between items-end relative z-10">
                                <div>
                                    <p className="text-primary font-black text-lg md:text-xl">${getPrecio(p).toFixed(2)}</p>
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
                <CartPanel {...cartPanelProps} />
            </div>

            {/* Cart Mobile Floating Bar -> Modal */}
            <div className="lg:hidden">
                {/* Fixed Bottom Bar (Covers Bottom Nav) */}
                {!mobileCartOpen && cart.length > 0 && (
                    <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,20px))] left-0 right-0 z-40 animate-in slide-in-from-bottom-2 duration-300">
                        <button
                            onClick={() => setMobileCartOpen(true)}
                            className="w-full h-[64px] bg-slate-900 border-t border-slate-800 text-white shadow-[0_-8px_30px_rgba(0,0,0,0.15)] px-6 flex items-center justify-between transition-colors active:bg-slate-800"
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
                <div className={`fixed inset-0 z-[60] bg-slate-50 dark:bg-background-dark no-print flex flex-col transition-transform duration-300 ease-out-expo ${mobileCartOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                    {/* Header estilo App */}
                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 h-[56px] shrink-0">
                        <button onClick={() => setMobileCartOpen(false)} className="p-2 text-primary bg-primary/5 rounded-xl active:scale-90 transition-all">
                            <ArrowLeft size={24} />
                        </button>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-0.5">Venta Actual</span>
                            <h1 className="text-base font-black tracking-tight text-slate-800 dark:text-white leading-none uppercase">PEDIDO</h1>
                        </div>
                        <div className="w-10"></div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <CartPanel {...cartPanelProps} />
                    </div>

                    {/* Footer estilo App */}
                    <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-around items-center px-4 h-[60px]">
                        <button onClick={() => setMobileCartOpen(false)} className="flex flex-col items-center justify-center gap-1 w-20 pt-1 pb-1 text-primary">
                            <ShoppingCart size={22} fill="currentColor" strokeWidth={2} />
                            <span className="text-[10px] font-black uppercase tracking-tight leading-none mt-1">Vender</span>
                        </button>
                        <button 
                            onClick={() => {
                                setMobileCartOpen(false);
                                navigate('/reportes');
                            }}
                            className="flex flex-col items-center justify-center gap-1 w-20 pt-1 pb-1 text-slate-500"
                        >
                            <Banknote size={22} strokeWidth={2} />
                            <span className="text-[10px] font-black uppercase tracking-tight leading-none mt-1">Reportes</span>
                        </button>
                        {currentUser?.role === 'admin' ? (
                            <button 
                                onClick={() => {
                                    setMobileCartOpen(false);
                                    navigate('/menu');
                                }}
                                className="flex flex-col items-center justify-center gap-1 w-20 pt-1 pb-1 text-slate-500"
                            >
                                <LayoutGrid size={22} strokeWidth={2} />
                                <span className="text-[10px] font-black uppercase tracking-tight leading-none mt-1">Menú</span>
                            </button>
                        ) : (
                            <button 
                                onClick={() => {
                                    setMobileCartOpen(false);
                                    navigate('/stock');
                                }}
                                className="flex flex-col items-center justify-center gap-1 w-20 pt-1 pb-1 text-slate-500"
                            >
                                <Package size={22} strokeWidth={2} />
                                <span className="text-[10px] font-black uppercase tracking-tight leading-none mt-1">Stock</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Seleccionar Cantidad Modal con Teclado Integrado */}
            {selectedProductDialog && (
                <ProductDialog 
                    product={selectedProductDialog} 
                    price={getPrecio(selectedProductDialog)} 
                    priceListName={userPriceList} 
                    onClose={() => setSelectedProductDialog(null)} 
                    onAdd={handleAddToCart} 
                    showToast={showToast} 
                />
            )}

        </div>
    );
}
