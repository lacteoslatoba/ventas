import React, { useState } from 'react';
import { useStore } from '../store';
import { ShoppingCart, Printer, Delete, Trash2, CheckCircle, ChevronUp, X, PackageOpen, Minus, Plus, ArrowLeft, Bluetooth } from 'lucide-react';
import { printTicket } from '../lib/bluetoothPrinter';
import { Link } from 'react-router-dom';

export default function Sales() {
    const { products, clients, users, addSale, currentUser, ticketConfig } = useStore();
    const [cart, setCart] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [generatedTicket, setGeneratedTicket] = useState(null);
    const [btPrinting, setBtPrinting] = useState(false);
    const [showVirtualTicket, setShowVirtualTicket] = useState(false);

    // Mobile Cart State
    const [mobileCartOpen, setMobileCartOpen] = useState(false);

    // Product Selection Modal State
    const [selectedProductDialog, setSelectedProductDialog] = useState(null);
    const [selectedQuantity, setSelectedQuantity] = useState('');
    const [selectedPieces, setSelectedPieces] = useState('');
    const [activeField, setActiveField] = useState('qty'); // 'qty' or 'pieces'

    const openProductDialog = (product) => {
        setSelectedProductDialog(product);
        setSelectedQuantity('');
        setSelectedPieces('');
        setActiveField('qty');
    };

    const handleKeypadPress = (val) => {
        if (val === 'backspace') {
            if (activeField === 'qty') setSelectedQuantity(prev => prev.slice(0, -1));
            else setSelectedPieces(prev => prev.slice(0, -1));
            return;
        }

        if (activeField === 'qty') {
            if (val === '.') {
                if (!selectedQuantity.includes('.')) setSelectedQuantity(prev => prev === '' ? '0.' : prev + '.');
            } else {
                setSelectedQuantity(prev => prev + val);
            }
        } else {
            if (val === '.') return; // No decimales en piezas
            setSelectedPieces(prev => prev + val);
        }
    };

    const confirmAddToCart = () => {
        if (!selectedProductDialog) return;

        const rawQty = (selectedQuantity || "0").toString().trim();
        const numQty = parseFloat(rawQty);

        if (isNaN(numQty) || numQty <= 0) {
            return alert('Por favor, ingresa una cantidad válida');
        }

        const rawPieces = (selectedPieces || "0").toString().trim();
        const numPieces = parseInt(rawPieces) || 0;

        let productPrice = Number(selectedProductDialog.price) || 0;
        const userPriceList = currentUser?.priceList || 'A';
        
        if (userPriceList === 'A') productPrice = Number(selectedProductDialog.priceA || selectedProductDialog.price) || 0;
        else if (userPriceList === 'B') productPrice = Number(selectedProductDialog.priceB || selectedProductDialog.price) || 0;
        else if (userPriceList === 'C') productPrice = Number(selectedProductDialog.priceC || selectedProductDialog.price) || 0;

        setCart(currentCart => {
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
        setSelectedQuantity('');
        setSelectedPieces('');
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.productId !== productId));
        if (cart.length === 1) setMobileCartOpen(false);
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
        const user = generatedTicket.userId === 'admin' ? { name: 'Administrador' } : users.find(u => u.id === generatedTicket.userId);
        const client = clients.find(c => c.id === generatedTicket.clientId) || { name: 'General' };

        const handlePrint = async () => {
            const btPrinter = window.__btPrinter;
            if (btPrinter) {
                setBtPrinting(true);
                try {
                    await printTicket({
                        ticket: generatedTicket,
                        user,
                        client,
                        isReprint: false,
                        characteristic: btPrinter.characteristic,
                        config: ticketConfig,
                    });
                } catch (err) {
                    alert('Error al imprimir: ' + err.message);
                } finally {
                    setBtPrinting(false);
                }
            } else {
                window.print();
            }
        };

        return (
            <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 no-print flex flex-col items-center animate-in fade-in duration-300 overflow-hidden">
                {/* Header de Éxito */}
                <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 sticky top-0 z-50 flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <CheckCircle size={24} className="text-emerald-500" />
                        Venta Exitosa
                    </h2>
                    <button onClick={() => setGeneratedTicket(null)} className="p-2 text-slate-400 hover:text-slate-900">
                        <X size={24} />
                    </button>
                </div>

                {/* Ticket Virtual */}
                <div className="flex-1 overflow-y-auto w-full flex flex-col items-center py-8 bg-slate-50 dark:bg-slate-900/50">
                    {/* (Mismo contenido del ticket...) */}
                    <div className="bg-white shadow-2xl rounded-2xl p-6 mb-8 select-none" style={{ fontFamily: 'monospace', width: '300px', fontSize: '12px' }}>
                        <div className="text-center font-black text-lg mb-1 uppercase tracking-tighter">{ticketConfig.businessName || 'MI NEGOCIO'}</div>
                        {ticketConfig.subtitle && <div className="text-center text-[10px] opacity-60 uppercase mb-4">{ticketConfig.subtitle}</div>}
                        
                        <div className="border-t border-dashed border-slate-300 my-4"></div>
                        
                        <div className="flex justify-between mb-1"><span>TICKET:</span><span className="font-bold">#{generatedTicket.id.slice(-6).toUpperCase()}</span></div>
                        <div className="flex justify-between mb-4"><span>FECHA:</span><span>{new Date(generatedTicket.date).toLocaleDateString()}</span></div>
                        
                        <div className="font-black mb-2 uppercase text-[10px] tracking-widest opacity-40">Pedido</div>
                        <div className="space-y-3">
                            {generatedTicket.items.map((item, i) => (
                                <div key={i} className="flex justify-between items-start text-[11px]">
                                    <div className="flex-1 pr-4">
                                        <div className="font-bold uppercase truncate">{item.name}</div>
                                        <div className="opacity-60">{item.quantity} {item.unit} x ${item.price.toFixed(2)}</div>
                                    </div>
                                    <div className="font-bold">${(item.quantity * item.price).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="border-t-2 border-slate-900 my-4"></div>
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                            <span className="font-black">TOTAL</span>
                            <span className="text-xl font-black">${total.toFixed(2)}</span>
                        </div>
                        
                        <div className="text-center mt-6 text-[10px] opacity-50 uppercase tracking-widest leading-relaxed">
                            {ticketConfig.footerLine1 || '¡GRACIAS POR SU COMPRA!'}
                            <br />
                            {ticketConfig.footerLine2}
                        </div>
                    </div>
                </div>

                {/* Acciones del Ticket */}
                <div className="w-full max-w-md p-4 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-50">
                    <button onClick={handlePrint} className="w-full bg-primary text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3">
                        <Printer size={20} /> Imprimir Recibo
                    </button>
                    <button onClick={() => setGeneratedTicket(null)} className="w-full py-4 text-slate-500 font-bold uppercase text-xs tracking-widest hover:bg-slate-50 rounded-2xl">
                        Nueva Venta
                    </button>
                    <Link to="/menu" className="w-full block text-center py-2 text-slate-400 font-medium text-xs">
                        Ir al Menú Principal
                    </Link>
                </div>
                
                {/* Print area hidden... */}
                <div id="ticket-print-area" className="hidden print:block">
                    <div style={{ fontFamily: 'monospace', fontSize: '8pt', width: '56mm' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold' }}>{ticketConfig.businessName}</div>
                        <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>
                        <div>TICKET: #{generatedTicket.id.slice(-6).toUpperCase()}</div>
                        <div>FECHA: {new Date(generatedTicket.date).toLocaleString()}</div>
                        <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>
                        {generatedTicket.items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{item.quantity} {item.unit} {item.name.slice(0, 10)}</span>
                                <span>${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                        <div style={{ borderTop: '1px solid #000', margin: '4px 0' }}></div>
                        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '10pt' }}>TOTAL: ${total.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        );
    }

    const renderCartPanel = () => (
        <div className="flex flex-col h-full bg-white lg:rounded-3xl shadow-2xl lg:shadow-xl border-t lg:border border-slate-100 relative">
            <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50/50 lg:rounded-t-3xl text-sm space-y-4">
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
                <div className="mb-6 px-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <Link to="/menu" className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-slate-900 transition-all active:scale-90 shadow-sm border border-slate-200/50">
                                <ArrowLeft size={22} />
                            </Link>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                                Venta Rápida
                            </h1>
                        </div>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mt-3 ml-14">Catálogo de Productos</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                    {products.map(p => (
                        <button
                            key={p.id}
                            onClick={() => openProductDialog(p)}
                            className="bg-white dark:bg-slate-800 p-5 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 text-left transition-all relative overflow-hidden group hover:border-primary/40 hover:shadow-md active:scale-[0.96]"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center text-primary font-black text-xl mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                                {p.name.charAt(0)}
                            </div>
                            <h3 className="font-black text-slate-800 dark:text-white text-md leading-tight mb-2 truncate uppercase tracking-tight">{p.name}</h3>
                            <div className="flex justify-between items-center">
                                <p className="text-primary font-black text-xl">${Number(p.price).toFixed(2)}</p>
                                <div className="text-[10px] font-black uppercase text-slate-300 opacity-60">/{p.unit}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Cart Desktop Side */}
            <div className="hidden lg:block w-[380px] xl:w-[420px] shrink-0 h-full pb-8">
                {renderCartPanel()}
            </div>

            {/* Cart Mobile Floating Bar */}
            <div className="lg:hidden">
                {!mobileCartOpen && cart.length > 0 && (
                    <div className="fixed bottom-24 left-4 right-4 z-40 animate-in slide-in-from-bottom-5 duration-500">
                        <button
                            onClick={() => setMobileCartOpen(true)}
                            className="w-full h-16 bg-slate-900 text-white rounded-[2rem] shadow-2xl shadow-slate-900/40 px-6 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
                                    <ShoppingCart size={20} />
                                </div>
                                <span className="font-black text-sm uppercase tracking-widest">Ver Pedido ({cart.length})</span>
                            </div>
                            <span className="text-xl font-black">${total.toFixed(2)}</span>
                        </button>
                    </div>
                )}

                <div className={`fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${mobileCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <div className={`absolute inset-x-0 bottom-0 top-[10vh] bg-slate-50 rounded-t-[3rem] transition-transform duration-300 ease-out-expo ${mobileCartOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                        {renderCartPanel()}
                    </div>
                </div>
            </div>

            {/* Keypad Modal */}
            {selectedProductDialog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedProductDialog(null)}>
                    <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-sm h-full md:h-auto md:max-h-[90vh] md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-6 flex flex-row items-center justify-between border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl uppercase">{selectedProductDialog.name.charAt(0)}</div>
                                <div>
                                    <h3 className="font-black text-lg text-slate-800 leading-tight uppercase tracking-tight">{selectedProductDialog.name}</h3>
                                    <p className="text-primary font-black text-sm uppercase text-[10px] tracking-widest">
                                        Precio: ${Number(
                                            currentUser?.priceList === 'B' ? (selectedProductDialog.priceB || selectedProductDialog.price) : 
                                            currentUser?.priceList === 'C' ? (selectedProductDialog.priceC || selectedProductDialog.price) : 
                                            (selectedProductDialog.priceA || selectedProductDialog.price)
                                        ).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedProductDialog(null)} className="p-2 text-slate-300 hover:text-slate-600 transition-all"><X size={24} /></button>
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div onClick={() => setActiveField('qty')} className={`p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer ${activeField === 'qty' ? 'border-primary bg-blue-50' : 'border-slate-50 bg-slate-50'}`}>
                                    <label className="block text-center text-[8px] font-black uppercase text-slate-400 mb-2">Cantidad</label>
                                    <div className="text-center text-2xl font-black text-slate-900">{selectedQuantity || '0'}</div>
                                </div>
                                <div onClick={() => setActiveField('pieces')} className={`p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer ${activeField === 'pieces' ? 'border-amber-500 bg-amber-50' : 'border-slate-50 bg-slate-50'}`}>
                                    <label className="block text-center text-[8px] font-black uppercase text-slate-400 mb-2">Piezas</label>
                                    <div className="text-center text-2xl font-black text-slate-900">{selectedPieces || '0'}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-6">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'backspace'].map((key) => (
                                    <button key={key} onClick={() => handleKeypadPress(key)} className={`h-16 rounded-2xl font-black text-xl transition-all active:scale-95 ${key === 'backspace' ? 'bg-slate-100 text-slate-400' : 'bg-white border-2 border-slate-100 text-slate-800'}`}>
                                        {key === 'backspace' ? <Delete /> : key}
                                    </button>
                                ))}
                            </div>

                            <button onClick={confirmAddToCart} className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all">
                                Agregar al Pedido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
