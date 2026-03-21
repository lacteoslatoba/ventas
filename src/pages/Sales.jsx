import React, { useState } from 'react';
import { useStore } from '../store';
import { ShoppingCart, Printer, Delete, Trash2, CheckCircle, ChevronUp, X, PackageOpen, Minus, Plus, ArrowLeft, Bluetooth, Banknote, LogOut, Users, LayoutGrid, Package } from 'lucide-react';
import { printTicket } from '../lib/bluetoothPrinter';
import { Link } from 'react-router-dom';
import TicketPreview from '../components/TicketPreview';

export default function Sales() {
    const { 
        products, clients, users, addSale, currentUser, ticketConfig,
        cart, updateCart, selectedCartClient, updateSelectedCartClient 
    } = useStore();
    const [generatedTicket, setGeneratedTicket] = useState(null);
    const [btPrinting, setBtPrinting] = useState(false);

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
                // Limitar decimales o largo si es necesario, pero sencillo por ahora
                setSelectedQuantity(prev => prev + val);
            }
        } else {
            if (val === '.') return; // No decimales en piezas
            setSelectedPieces(prev => prev + val);
        }
    };

    const confirmAddToCart = () => {
        if (!selectedProductDialog) return;

        // Limpiar el string de cualquier caracter no numérico y convertir
        const rawQty = (selectedQuantity || "0").toString().trim();
        const numQty = parseFloat(rawQty);

        if (isNaN(numQty) || numQty <= 0) {
            return alert('Por favor, ingresa una cantidad válida');
        }

        const rawPieces = (selectedPieces || "0").toString().trim();
        const numPieces = parseInt(rawPieces) || 0;

        if (numPieces <= 0) {
            return alert('Por favor, ingresa el número de piezas (Mandatorio)');
        }

        // Obtener el precio dinámico basado en la lista del usuario
        let productPrice = Number(selectedProductDialog.price) || 0;
        const userPriceList = currentUser?.priceList || 'A';
        
        if (userPriceList === 'A') productPrice = Number(selectedProductDialog.priceA || selectedProductDialog.price) || 0;
        else if (userPriceList === 'B') productPrice = Number(selectedProductDialog.priceB || selectedProductDialog.price) || 0;
        else if (userPriceList === 'C') productPrice = Number(selectedProductDialog.priceC || selectedProductDialog.price) || 0;

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

        // Limpiar y cerrar modal
        setSelectedProductDialog(null);
        setSelectedQuantity('');
        setSelectedPieces('');

        // Notificación visual opcional o simplemente dejamos que el usuario vea el cambio
        // En móvil, si no está abierto el carrito, a veces el usuario no sabe si se agregó.
    };

    const removeFromCart = (productId) => {
        updateCart(cart.filter(item => item.productId !== productId));
        if (cart.length === 1) setMobileCartOpen(false); // Close if last item removed
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const processSale = () => {
        const effectiveUserId = currentUser?.id;

        if (!effectiveUserId) return alert('No hay usuario activo');
        if (!selectedCartClient) return alert('Selecciona un cliente destino');
        if (cart.length === 0) return alert('El carrito está vacío');

        const sale = {
            userId: effectiveUserId,
            clientId: selectedCartClient,
            items: cart,
            total,
            date: new Date().toISOString()
        };

        addSale(sale);
        setGeneratedTicket({ ...sale, id: Date.now().toString() });
        updateCart([]);
        updateSelectedCartClient('');
        setMobileCartOpen(false);
    };

    const clearCart = () => {
        if (cart.length === 0) return;
        updateCart([]);
        updateSelectedCartClient('');
        setMobileCartOpen(false);
    };

    if (generatedTicket) {
        const user = generatedTicket.userId === 'admin' ? { name: 'Administrador' } : users.find(u => u.id === generatedTicket.userId);
        const client = clients.find(c => c.id === generatedTicket.clientId) || { name: 'General' };

        // ── Imprimir Ticket (BT si hay impresora, si no sistema) ──────────────
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
            <div className="fixed inset-0 z-[100] bg-background-light dark:bg-background-dark no-print flex flex-col items-center">
                <div className="relative flex h-full w-full max-w-md mx-auto flex-col bg-white dark:bg-background-dark overflow-x-hidden shadow-2xl">
                    
                    <div className="flex items-center p-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10">
                        <button onClick={() => setGeneratedTicket(null)} className="p-2 -ml-1 mr-2 text-slate-400 hover:text-slate-900 transition-colors">
                            <X size={24} />
                        </button>
                        <h2 className="flex-1 text-center mr-8 text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
                             <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                             Venta Exitosa
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto w-full flex flex-col items-center py-6 bg-slate-50/50 dark:bg-slate-900/50 relative">
                        <TicketPreview 
                            config={ticketConfig} 
                            sale={generatedTicket} 
                            user={user} 
                            client={client} 
                        />
                    </div>

                    {/* Acciones principales */}
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3 shrink-0 relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] pb-6 md:pb-4">
                        <div className="flex gap-3 h-[60px]">
                            <button
                                onClick={() => setGeneratedTicket(null)}
                                className="w-[30%] h-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 font-bold rounded-[1.25rem] active:scale-95 transition-all text-[11px] uppercase tracking-wider flex flex-col items-center justify-center gap-0.5"
                            >
                                <span className="material-symbols-outlined text-xl leading-none">add_shopping_cart</span>
                                <span className="mt-1">Nueva</span>
                            </button>
                            <button
                                onClick={handlePrint}
                                disabled={btPrinting}
                                className="w-[70%] h-full bg-primary hover:bg-blue-700 disabled:opacity-60 text-white font-black rounded-[1.25rem] shadow-lg shadow-primary/25 flex items-center justify-center gap-2 text-base active:scale-95 transition-all"
                            >
                                {btPrinting ? (
                                    <span className="material-symbols-outlined animate-spin hidden md:block">refresh</span>
                                ) : (
                                    <span className="material-symbols-outlined hidden md:block">print</span>
                                )}
                                {btPrinting ? 'Imprimiendo...' : 'Imprimir Ticket'}
                            </button>
                        </div>
                    </div>

                    <div className="h-6 bg-white dark:bg-background-dark"></div>
                </div>

                {/* TICKET IMPRIMIBLE */}
                <div id="ticket-print-area" className="hidden print:block">
                    <div style={{ fontFamily: 'monospace', fontSize: ticketConfig.useFontB ? '7pt' : '8pt', lineHeight: '1.2', width: `${(ticketConfig.paperWidth || 58) - 2}mm`, margin: '0', padding: '2mm 0', color: '#000' }}>
                        {/* (Contenido del ticket mantenido igual por compatibilidad con impresora térmica) */}
                        <div style={{ textAlign: ticketConfig.titleAlignment || 'center', marginBottom: '3px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: ticketConfig.useFontB ? '9pt' : '11pt', lineHeight: '1.2' }}>{ticketConfig.businessName || 'MI NEGOCIO'}</div>
                            {ticketConfig.subtitle && <div style={{ fontSize: ticketConfig.useFontB ? '6pt' : '8pt' }}>{ticketConfig.subtitle}</div>}
                            {ticketConfig.showAddress !== false && ticketConfig.address && <div>{ticketConfig.address}</div>}
                            {ticketConfig.showPhone !== false && ticketConfig.phone && <div>Tel: {ticketConfig.phone}</div>}
                        </div>
                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />
                        <div>Ticket : #{generatedTicket.id.slice(-6).toUpperCase()}</div>
                        {ticketConfig.showDate !== false && <div>Fecha  : {new Date(generatedTicket.date).toLocaleDateString('es-MX')}</div>}
                        {ticketConfig.showTime !== false && <div>Hora   : {new Date(generatedTicket.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>}
                        
                        {(ticketConfig.showSeller !== false || ticketConfig.showCustomer !== false) && (
                            <>
                                <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />
                                {ticketConfig.showSeller !== false && <div>Repartidor: {user?.name || 'Administrador'}</div>}
                                {ticketConfig.showCustomer !== false && <div>Cliente   : {client?.name || 'General'}</div>}
                            </>
                        )}
                        
                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />
                        <div style={{ fontWeight: 'bold' }}>CANT CONCEPTO         IMPORTE</div>
                        <div style={{ borderTop: '1px dashed #000', margin: '2px 0' }} />
                        {generatedTicket.items.map((item, idx) => (
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
                        <div style={{ textAlign: ticketConfig.centerTotal ? 'center' : 'right', fontWeight: 'bold', fontSize: '13pt' }}>TOTAL ${generatedTicket.total.toFixed(2)}</div>
                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />
                        <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '8pt' }}>
                            {ticketConfig.footerLine1 && <div>{ticketConfig.footerLine1}</div>}
                            {ticketConfig.footerLine2 && <div>{ticketConfig.footerLine2}</div>}
                        </div>
                        <div style={{ marginTop: '20px' }} />
                    </div>
                </div>


            </div>
        );
    }

    // Elemento del Carrito (Reutilizable en Desktop / Móvil)
    const renderCartPanel = () => (
        <div className="flex flex-col h-full bg-white lg:rounded-3xl lg:shadow-xl border-t lg:border border-slate-100 relative">
            <div className="p-5 flex justify-between items-center bg-slate-50/50 border-b border-slate-100 shrink-0">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">🛒 Detalle del Carrito</h2>
                {cart.length > 0 && (
                    <button onClick={clearCart} className="text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-wider">
                        <Trash2 size={12} /> Vaciar Borrador
                    </button>
                )}
            </div>
            
            <div className="px-5 py-4 bg-white border-b border-slate-100 shrink-0">
                <label className="block text-slate-400 font-black mb-1.5 uppercase text-[10px] tracking-widest">Información de Entrega</label>
                <select value={selectedCartClient} onChange={e => updateSelectedCartClient(e.target.value)} className="w-full bg-slate-50 border-none shadow-inner focus:ring-2 focus:ring-primary/20 p-4 rounded-2xl font-black outline-none text-slate-800 transition-all">
                    <option value="">Selecciona Cliente / Tienda...</option>
                    {clients
                        .filter(c => currentUser?.role === 'admin' ? true : c.userId === currentUser?.id)
                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
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

    return (
        <div className="p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 h-full min-h-0 relative">

            {/* Products Left Side */}
            <div className="flex-1 flex flex-col pb-8 lg:pb-0">
                <div className="mb-6 px-1 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            Venta Rápida
                        </h1>
                        <p className="text-slate-500 font-medium text-sm mt-1">Selecciona productos para armar el pedido</p>
                    </div>
                    {currentUser?.role === 'admin' && (
                        <Link to="/menu" className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all active:scale-90 lg:hidden">
                            <X size={24} />
                        </Link>
                    )}
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
                    <div className="fixed bottom-[60px] left-0 right-0 z-40 animate-in slide-in-from-bottom-2 duration-300">
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
                        {renderCartPanel()}
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
                                window.location.href = '/reportes';
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
                                    window.location.href = '/menu';
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
                                    window.location.href = '/stock';
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedProductDialog(null)}>
                    <div 
                        onClick={e => e.stopPropagation()}
                        className="bg-white w-full max-w-sm h-full md:h-auto md:max-h-[90vh] md:rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden"
                    >
                        {/* Header Header */}
                        <div className="p-5 flex flex-row items-center justify-between border-b border-slate-100 shrink-0 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <PackageOpen size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-slate-800 leading-tight">{selectedProductDialog.name}</h3>
                                    <p className="text-primary font-bold text-sm">
                                        Precio Lista {currentUser?.priceList || 'A'}: ${
                                            currentUser?.priceList === 'B' ? (selectedProductDialog.priceB || selectedProductDialog.price) : 
                                            currentUser?.priceList === 'C' ? (selectedProductDialog.priceC || selectedProductDialog.price) : 
                                            (selectedProductDialog.priceA || selectedProductDialog.price)
                                        } / {selectedProductDialog.unit || 'u'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedProductDialog(null)}
                                className="p-2.5 bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all active:scale-90"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto flex flex-col p-4">
                            {/* Inputs Visuales */}
                            <div className="flex flex-col gap-3 mb-4">
                                <div 
                                    onClick={() => setActiveField('qty')}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all cursor-pointer ${activeField === 'qty' ? 'border-primary bg-blue-50 ring-4 ring-primary/5' : 'border-slate-100 bg-slate-50 opacity-70'}`}
                                >
                                    <label className="block text-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cantidad ({selectedProductDialog.unit || 'u'})</label>
                                    <div className="text-center text-3xl font-black text-slate-800 min-h-[36px]">
                                        {selectedQuantity || <span className="text-slate-200">0</span>}
                                        {activeField === 'qty' && <span className="inline-block w-1 h-8 bg-primary ml-1 animate-pulse align-middle" />}
                                    </div>
                                </div>
 
                                <div 
                                    onClick={() => setActiveField('pieces')}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all cursor-pointer ${activeField === 'pieces' ? 'border-amber-500 bg-amber-50 ring-4 ring-amber-500/5' : 'border-slate-100 bg-slate-50 opacity-70'}`}
                                >
                                    <label className="block text-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Piezas (Mandatorio)</label>
                                    <div className="text-center text-3xl font-black text-slate-800 min-h-[36px]">
                                        {selectedPieces || <span className="text-slate-200">0</span>}
                                        {activeField === 'pieces' && <span className="inline-block w-1 h-8 bg-amber-500 ml-1 animate-pulse align-middle" />}
                                    </div>
                                </div>
                            </div>

                            {/* Teclado Numérico */}
                            <div className="grid grid-cols-3 gap-2.5 flex-1 max-h-[400px]">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'backspace'].map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => handleKeypadPress(key)}
                                        className={`h-[72px] rounded-2xl flex items-center justify-center transition-all active:scale-95 active:brightness-90 ${
                                            key === 'backspace' 
                                            ? 'bg-slate-200 text-slate-600 shadow-inner' 
                                            : 'bg-white border-2 border-slate-200 text-3xl font-black text-slate-800 shadow-md hover:border-primary/30'
                                        }`}
                                    >
                                        {key === 'backspace' ? <Delete size={28} /> : key}
                                    </button>
                                ))}
                            </div>

                            {/* Botón Acción */}
                            <button
                                onClick={confirmAddToCart}
                                className="w-full bg-slate-900 text-white font-black h-16 rounded-2xl shadow-xl mt-4 active:scale-95 transition-all text-lg flex justify-center gap-3 items-center group shrink-0"
                            >
                                <ShoppingCart size={22} className="group-hover:-rotate-12 transition-transform" />
                                AGREGAR • <span className="text-blue-400 font-black">${((
                                    currentUser?.priceList === 'B' ? (selectedProductDialog.priceB || selectedProductDialog.price) : 
                                    currentUser?.priceList === 'C' ? (selectedProductDialog.priceC || selectedProductDialog.price) : 
                                    (selectedProductDialog.priceA || selectedProductDialog.price)
                                ) * (parseFloat(selectedQuantity) || 0)).toFixed(2)}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
