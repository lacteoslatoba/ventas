import React, { useState } from 'react';
import { useStore } from '../store';
import { ShoppingCart, Printer, Trash2, CheckCircle, ChevronUp, X, PackageOpen, Minus, Plus, ArrowLeft, Bluetooth } from 'lucide-react';
import { printTicket } from '../lib/bluetoothPrinter';

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

    const openProductDialog = (product) => {
        setSelectedProductDialog(product);
        setSelectedQuantity('');
        setSelectedPieces('');
    };

    const confirmAddToCart = () => {
        if (!selectedProductDialog) return;

        const numQty = parseFloat(selectedQuantity);
        if (isNaN(numQty) || numQty <= 0) return alert('Por favor, ingresa una cantidad válida');

        const numPieces = parseInt(selectedPieces) || 0;

        const existing = cart.find(item => item.productId === selectedProductDialog.id);
        if (existing) {
            setCart(cart.map(item => item.productId === selectedProductDialog.id
                ? { ...item, quantity: item.quantity + numQty, pieces: (item.pieces || 0) + numPieces }
                : item));
        } else {
            setCart([...cart, {
                productId: selectedProductDialog.id,
                name: selectedProductDialog.name,
                price: Number(selectedProductDialog.price),
                quantity: numQty,
                pieces: numPieces,
                unit: selectedProductDialog.unit
            }]);
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
                    
                    {/* Header Minimal */}
                    <div className="flex items-center justify-between p-6">
                        <div className="size-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                             <span className="material-symbols-outlined">analytics</span>
                        </div>
                        {/* Botón X eliminado a petición del usuario */}
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 flex flex-col items-center text-center">
                        {/* Animación de éxito */}
                        <div className="bg-emerald-500/10 text-emerald-500 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mb-6 animate-bounce duration-1000">
                            <span className="material-symbols-outlined text-5xl font-black">check_circle</span>
                        </div>

                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">¡Venta Exitosa!</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-8">Ticket #{generatedTicket.id.slice(-6)}</p>

                        {/* Card del Cliente */}
                        <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 mb-6 text-left flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                                {client?.name?.charAt(0) || 'C'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Entregado a</p>
                                <p className="text-lg font-black text-slate-800 dark:text-white truncate">{client?.name || 'Cliente General'}</p>
                            </div>
                        </div>

                        {/* Resumen rápido */}
                        <div className="w-full grid grid-cols-2 gap-4 mb-8">
                             <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 text-left">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monto Total</p>
                                <p className="text-2xl font-black text-primary tracking-tighter">${generatedTicket.total.toFixed(2)}</p>
                             </div>
                             <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 text-left">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Productos</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">{generatedTicket.items.length}</p>
                             </div>
                        </div>
                    </div>

                    {/* Acciones principales */}
                    <div className="p-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                        <button
                            onClick={handlePrint}
                            disabled={btPrinting}
                            className="w-full py-5 bg-primary hover:bg-blue-700 disabled:opacity-60 text-white font-black rounded-3xl shadow-xl shadow-primary/25 flex items-center justify-center gap-3 text-lg active:scale-95 transition-all"
                        >
                            {btPrinting ? (
                                <span className="material-symbols-outlined animate-spin">refresh</span>
                            ) : (
                                <span className="material-symbols-outlined">print</span>
                            )}
                            {btPrinting ? 'Enviando...' : 'Imprimir Ticket'}
                        </button>

                        <button
                            onClick={() => setGeneratedTicket(null)}
                            className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
                            NUEVA VENTA
                        </button>
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
                        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '13pt' }}>TOTAL ${generatedTicket.total.toFixed(2)}</div>
                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />
                        <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '8pt' }}>
                            {ticketConfig.footerLine1 && <div>{ticketConfig.footerLine1}</div>}
                            {ticketConfig.footerLine2 && <div>{ticketConfig.footerLine2}</div>}
                        </div>
                        <div style={{ marginTop: '20px' }} />
                    </div>
                </div>

                {/* Ticket Virtual Modal (opcionalmente igual pero con botón cerrar premium) */}
                {showVirtualTicket && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print" onClick={() => setShowVirtualTicket(false)}>
                        <div className="relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                             {/* ... contenido ticket papel ... */}
                             <div className="bg-white shadow-2xl" style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.45', width: '260px', padding: '16px 18px 24px' }}>
                                <div style={{ borderTop: '2px dashed #e2e8f0', marginBottom: '14px' }} />
                                <div style={{ textAlign: ticketConfig.titleAlignment || 'center', marginBottom: '8px' }}>
                                    <div style={{ fontWeight: '900', fontSize: '15px' }}>{ticketConfig.businessName || 'MI NEGOCIO'}</div>
                                    {ticketConfig.showAddress !== false && ticketConfig.address && <div style={{ fontSize: '11px', color: '#64748b' }}>{ticketConfig.address}</div>}
                                    {ticketConfig.showPhone !== false && ticketConfig.phone && <div style={{ fontSize: '11px', color: '#64748b' }}>Tel: {ticketConfig.phone}</div>}
                                </div>
                                <div style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />
                                <div style={{ fontSize: '11px' }}>Ticket : <strong>#{generatedTicket.id.slice(-6)}</strong></div>
                                <div style={{ fontSize: '11px' }}>Total  : <strong>${generatedTicket.total.toFixed(2)}</strong></div>
                                <div style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />
                                {generatedTicket.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                        <span>{item.name}</span>
                                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                                <div style={{ borderTop: '2px solid #1e293b', margin: '10px 0' }} />
                                <div style={{ textAlign: 'center', fontSize: '11px' }}>{ticketConfig.footerLine1}</div>
                                <div style={{ borderBottom: '2px dashed #e2e8f0', marginTop: '16px' }} />
                             </div>
                             <button onClick={() => setShowVirtualTicket(false)} className="w-full mt-3 py-4 bg-white text-slate-900 font-black rounded-2xl shadow active:scale-95 transition-all text-sm">CERRAR</button>
                        </div>
                    </div>
                )}
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
                <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedProductDialog(null)}>
                    <div 
                        onClick={e => e.stopPropagation()}
                        className="bg-white rounded-t-[2rem] md:rounded-[2rem] w-full max-w-sm shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] md:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-full md:zoom-in-95 duration-200 border-t md:border border-white/20 flex flex-col shrink-0 max-h-[95vh]"
                    >
                        <div className="p-5 flex flex-row items-start justify-between border-b border-slate-100 shrink-0">
                            <div>
                                <h3 className="font-black text-xl md:text-2xl text-slate-800 pr-2 leading-tight tracking-tight">{selectedProductDialog.name}</h3>
                                <p className="text-primary font-black text-xl md:text-2xl mt-0.5 tracking-tighter">${selectedProductDialog.price}</p>
                            </div>
                            <button
                                onClick={() => setSelectedProductDialog(null)}
                                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all active:scale-90 shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 md:p-6 overflow-y-auto shrink-0 touch-pan-y">
                            <div className="flex flex-row gap-3 mb-5 md:mb-6">
                                {/* Campo Cantidad */}
                                <div className="flex-1">
                                    <label className="block text-center text-slate-500 font-bold mb-2 uppercase text-[10px] md:text-xs tracking-wider">
                                        Cantidad <span className="text-slate-400 lowercase">({selectedProductDialog.unit || 'u'})</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="qty-input"
                                            type="number"
                                            inputMode="decimal"
                                            step="any"
                                            min="0.01"
                                            value={selectedQuantity}
                                            onChange={(e) => setSelectedQuantity(e.target.value)}
                                            className="w-full text-center text-2xl md:text-4xl font-black text-primary bg-blue-50/50 border-[3px] border-blue-100 focus:border-primary focus:ring-0 rounded-[1.25rem] py-3 md:py-5 px-2 outline-none transition-all placeholder:text-blue-200 shadow-inner"
                                            placeholder="0"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Campo Piezas */}
                                <div className="flex-1">
                                    <label className="block text-center text-amber-600 font-bold mb-2 uppercase text-[10px] md:text-xs tracking-wider flex items-center justify-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                                        Piezas <span className="text-amber-400 lowercase">(opc)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="pieces-input"
                                            type="number"
                                            inputMode="numeric"
                                            step="1"
                                            min="0"
                                            value={selectedPieces}
                                            onChange={(e) => setSelectedPieces(e.target.value)}
                                            className="w-full text-center text-2xl md:text-4xl font-black text-amber-600 bg-amber-50/50 border-[3px] border-amber-100/80 focus:border-amber-400 focus:ring-0 rounded-[1.25rem] py-3 md:py-5 px-2 outline-none transition-all placeholder:text-amber-200 shadow-inner"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={confirmAddToCart}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-[1.25rem] shadow-[0_8px_20px_rgba(0,0,0,0.15)] active:scale-95 transition-all text-base md:text-lg flex justify-center gap-2 items-center group mb-2 md:mb-0"
                            >
                                <ShoppingCart size={20} className="group-hover:-rotate-12 transition-transform" />
                                Al Carrito • <span className="text-blue-400">${(selectedProductDialog.price * (parseFloat(selectedQuantity) || 0)).toFixed(2)}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
