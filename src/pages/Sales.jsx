import { useState } from 'react';
import { useStore } from '../store';
import { ShoppingCart, Trash2, ChevronUp, ArrowLeft, Droplets, GlassWater, Snowflake, Plus, PackageOpen } from 'lucide-react';
import ProductDialog from '../components/sales/ProductDialog';
import SuccessModal from '../components/sales/SuccessModal';
import ModernDatePicker from '../components/Calendar';

export default function Sales() {
    const {
        products, clients, users, addSale, addDelivery, currentUser, ticketConfig,
        cart, updateCart, selectedCartClient, updateSelectedCartClient, showToast
    } = useStore();
    
    const todayStr = new Date().toISOString().split('T')[0];
    const [saleDate, setSaleDate] = useState(todayStr);
    const [generatedTicket, setGeneratedTicket] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('efectivo');

    // Producción del día
    const [litrosPurificados, setLitrosPurificados] = useState('');
    const [ventaGalones, setVentaGalones] = useState('');
    const [bolsasHielo, setBolsasHielo] = useState('');

    // Mobile Cart State
    const [mobileCartOpen, setMobileCartOpen] = useState(false);
    const [clientError, setClientError] = useState(false);

    // Product Selection Modal State
    const [selectedProductDialog, setSelectedProductDialog] = useState(null);

    // Lista de precios activa del usuario
    const userPriceList = currentUser?.priceList || currentUser?.pricelist || 'A';
    const getPrecio = (p) => {
        if (!p) return 0;
        if (userPriceList === 'B') return Number(p.priceB || p.priceb) || Number(p.priceA || p.pricea || p.price) || 0;
        if (userPriceList === 'C') return Number(p.priceC || p.pricec) || Number(p.priceA || p.pricea || p.price) || 0;
        return Number(p.priceA || p.pricea || p.price) || 0;
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
        const newCart = cart.filter(item => item.productId !== productId);
        updateCart(newCart);
        if (newCart.length === 0) setMobileCartOpen(false);
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const processSale = () => {
        const effectiveUserId = currentUser?.id;

        if (!effectiveUserId) { showToast('No hay usuario activo', 'error'); return; }
        if (!selectedCartClient) { setClientError(true); showToast('Selecciona un cliente', 'warning'); return; }
        if (cart.length === 0) { showToast('Carrito vacío', 'warning'); return; }
        setClientError(false);

        const now = new Date();
        const [y, m, d] = saleDate.split('-').map(Number);
        const saleDateTime = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
        
        const sale = {
            userId: effectiveUserId,
            clientId: selectedCartClient,
            items: cart,
            total,
            paymentMethod,
            date: saleDateTime.toISOString()
        };

        addSale(sale);

        if (litrosPurificados || ventaGalones || bolsasHielo) {
            addDelivery({
                userId: effectiveUserId,
                date: saleDate,
                litrosPurificados: litrosPurificados || '0',
                ventaGalones: ventaGalones || '0',
                bolsasHielo: bolsasHielo || '0',
            });
        }

        // eslint-disable-next-line react-hooks/purity
        setGeneratedTicket({ ...sale, id: Date.now().toString() });
        updateCart([]);
        updateSelectedCartClient('');
        setPaymentMethod('efectivo');
        setLitrosPurificados('');
        setVentaGalones('');
        setBolsasHielo('');
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

    const cartPanel = () => (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 lg:rounded-[2.5rem] lg:shadow-2xl border-t lg:border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            {/* Header Carrito */}
            <div className="p-6 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <ShoppingCart size={14} /> Carrito de Venta
                </h2>
                {cart.length > 0 && (
                    <button onClick={() => updateCart([])} className="text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-xl active:scale-95 transition-all uppercase tracking-wider">
                        Vaciar
                    </button>
                )}
            </div>
            
            {/* Configuración de Venta */}
            <div className="px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-4">
                {/* Selector Cliente */}
                <div>
                    <label className="block text-slate-400 dark:text-slate-500 font-black mb-2 uppercase text-[9px] tracking-widest ml-1">Cliente Destino</label>
                    <select
                        value={selectedCartClient}
                        onChange={e => { updateSelectedCartClient(e.target.value); setClientError(false); }}
                        className={`w-full p-4 rounded-2xl font-black outline-none transition-all appearance-none ${
                            clientError && !selectedCartClient 
                                ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-400 text-red-700 dark:text-red-400' 
                                : 'bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/30 text-slate-800 dark:text-slate-100'
                        }`}
                    >
                        <option value="">-- Seleccionar Cliente --</option>
                        {clients
                            .filter(c => currentUser?.role === 'admin' ? true : c.userId === currentUser?.id)
                            .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* Forma de Pago */}
                <div>
                    <label className="block text-slate-400 dark:text-slate-500 font-black mb-2 uppercase text-[9px] tracking-widest ml-1">Forma de Pago</label>
                    <div className="flex gap-2">
                        {['efectivo', 'transferencia'].map(opt => (
                            <button
                                key={opt}
                                onClick={() => setPaymentMethod(opt)}
                                className={`flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                                    paymentMethod === opt 
                                        ? 'border-primary bg-primary/5 text-primary' 
                                        : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Producción (Mini inputs) */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Litros', icon: Droplets, color: 'text-blue-500', val: litrosPurificados, set: setLitrosPurificados },
                        { label: 'Galones', icon: GlassWater, color: 'text-cyan-500', val: ventaGalones, set: setVentaGalones },
                        { label: 'Hielo', icon: Snowflake, color: 'text-sky-500', val: bolsasHielo, set: setBolsasHielo }
                    ].map(field => (
                        <div key={field.label}>
                            <div className="flex items-center gap-1 mb-1 ml-1">
                                <field.icon size={10} className={field.color} />
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{field.label}</span>
                            </div>
                            <input
                                type="number"
                                value={field.val}
                                onChange={e => field.set(e.target.value)}
                                placeholder="0"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-primary/50 rounded-xl py-2 px-2 text-sm font-black text-slate-800 dark:text-slate-100 outline-none text-center"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Lista de Productos en el Carrito */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 grayscale py-10">
                        <PackageOpen size={60} strokeWidth={1} />
                        <p className="font-black text-[10px] uppercase tracking-[0.2em] mt-4">Carrito Vacío</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {cart.map((item) => (
                            <div key={item.productId} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in slide-in-from-right-2 duration-300">
                                <div className="flex-1 min-w-0 pr-3">
                                    <p className="font-black text-slate-800 dark:text-slate-100 text-sm leading-tight truncate">{item.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{item.quantity} {item.unit || 'u'} × ${item.price}</span>
                                        {item.pieces > 0 && <span className="text-[8px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-lg">+{item.pieces} pzas</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="font-black text-slate-900 dark:text-white text-base">${(item.quantity * item.price).toFixed(2)}</p>
                                    <button onClick={() => removeFromCart(item.productId)} className="text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Total y Botón de Cobro */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-end mb-5">
                    <span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] text-[9px]">Total a Pagar</span>
                    <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">${total.toFixed(2)}</span>
                </div>
                <button
                    onClick={processSale}
                    disabled={cart.length === 0 || !selectedCartClient}
                    className="w-full py-5 rounded-[1.5rem] font-black text-lg transition-all active:scale-[0.98] shadow-xl disabled:opacity-30 disabled:grayscale bg-primary text-white shadow-primary/20"
                >
                    {!selectedCartClient && cart.length > 0 ? 'Selecciona Cliente' : 'Finalizar Venta'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-6 lg:p-10 flex flex-col lg:flex-row gap-8 h-full min-h-0 relative animate-in fade-in duration-500">

            {/* Lado Izquierdo: Catálogo */}
            <div className="flex-1 flex flex-col pb-32 lg:pb-0">
                <div className="mb-8 px-2 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-2">Punto de Venta</p>
                        <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none">Nueva Venta</h1>
                    </div>
                    
                    <div className="w-full sm:w-64 shrink-0">
                        <ModernDatePicker 
                            label="Fecha de Registro"
                            value={saleDate}
                            onChange={setSaleDate}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...products].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999)).map(p => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedProductDialog(p)}
                            className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 text-left transition-all relative overflow-hidden group hover:border-primary/50 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none active:scale-[0.97]"
                        >
                            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-700/50 transition-transform group-hover:scale-125"></div>
                            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base leading-tight mb-6 relative z-10">{p.name}</h3>
                            
                            <div className="flex justify-between items-end relative z-10">
                                <div>
                                    <p className="text-primary font-black text-2xl tracking-tighter">${getPrecio(p)}</p>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">/{p.unit || 'u'}</span>
                                </div>
                                <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                                    <Plus size={22} strokeWidth={3} />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Carrito Desktop (Visible solo en LG+) */}
            <div className="hidden lg:block w-[420px] shrink-0 h-full">
                {cartPanel()}
            </div>

            {/* Carrito Móvil (Barra Flotante) */}
            <div className="lg:hidden">
                {!mobileCartOpen && cart.length > 0 && (
                    <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,20px))] left-4 right-4 z-40 animate-in slide-in-from-bottom-8 duration-500">
                        <button
                            onClick={() => setMobileCartOpen(true)}
                            className="w-full h-[72px] bg-slate-900 dark:bg-slate-800 rounded-[2rem] text-white shadow-2xl shadow-slate-900/40 px-6 flex items-center justify-between active:scale-[0.98] transition-all border border-slate-700"
                        >
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <ShoppingCart size={24} />
                                    <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-black w-5 h-5 flex justify-center items-center rounded-full border-2 border-slate-900">{cart.length}</span>
                                </div>
                                <span className="font-black text-lg tracking-tight">Ver Carrito</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black">${total.toFixed(2)}</span>
                                <ChevronUp size={24} className="opacity-40" />
                            </div>
                        </button>
                    </div>
                )}

                {/* Modal Carrito Móvil Full Screen */}
                <div className={`fixed inset-0 z-[100] bg-slate-50 dark:bg-[#0f172a] flex flex-col transition-transform duration-500 ease-out-expo ${mobileCartOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                    <div className="flex items-center justify-between px-6 h-[70px] border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                        <button onClick={() => setMobileCartOpen(false)} className="p-2 text-primary bg-primary/5 rounded-xl"><ArrowLeft size={24} /></button>
                        <h1 className="text-lg font-black tracking-tighter uppercase">Carrito de Venta</h1>
                        <div className="w-10"></div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {cartPanel()}
                    </div>
                </div>
            </div>

            {/* Diálogo de Producto */}
            {selectedProductDialog && (
                <ProductDialog 
                    product={selectedProductDialog} 
                    price={getPrecio(selectedProductDialog)} 
                    onClose={() => setSelectedProductDialog(null)} 
                    onAdd={handleAddToCart} 
                    showToast={showToast} 
                />
            )}

        </div>
    );
}
