import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import TicketPreview from '../TicketPreview';
import { printTicket } from '../../lib/bluetoothPrinter';
import { saveAndOpenFile } from '../../lib/nativeFiles';

export default function SuccessModal({
    generatedTicket,
    setGeneratedTicket,
    users,
    clients,
    ticketConfig,
    showToast
}) {
    const [btPrinting, setBtPrinting] = useState(false);
    const [sharing, setSharing] = useState(false);
    const ticketRef = useRef(null);

    if (!generatedTicket) return null;

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
                showToast('Error al imprimir: ' + err.message, 'error');
            } finally {
                setBtPrinting(false);
            }
        } else {
            window.print();
        }
    };

    const handleShare = async () => {
        if (!ticketRef.current) return;
        setSharing(true);
        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(ticketRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
            });
            
            // Wrap toBlob in a promise to await the saveAndOpenFile call
            await new Promise((resolve, reject) => {
                canvas.toBlob(async (blob) => {
                    try {
                        const fileName = `ticket-${generatedTicket.id.slice(-6).toUpperCase()}.png`;
                        await saveAndOpenFile(blob, fileName, 'image/png');
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                }, 'image/png');
            });
            
            showToast('Imagen generada correctamente', 'success');
        } catch (err) {
            console.error('Share error:', err);
            showToast('Error al compartir: ' + err.message, 'error');
        } finally {
            setSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm no-print flex flex-col items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
            <div className="relative flex h-full w-full max-w-md mx-auto flex-col bg-white dark:bg-slate-900 overflow-hidden shadow-2xl md:rounded-[2.5rem] animate-in slide-in-from-bottom-10 duration-500 ease-out-expo">

                <div className="flex items-center p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10">
                    <button 
                        onClick={() => setGeneratedTicket(null)} 
                        className="p-2 -ml-1 mr-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90"
                    >
                        <X size={24} />
                    </button>
                    <div className="flex-1 flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-0.5">Operación Completada</span>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
                             Venta Exitosa
                        </h2>
                    </div>
                    <button
                        onClick={handleShare}
                        disabled={sharing}
                        className="p-2 -mr-1 ml-2 text-slate-400 hover:text-primary disabled:opacity-50 transition-all active:scale-90"
                        title="Compartir imagen"
                    >
                        <span className="material-symbols-outlined text-[22px]">{sharing ? 'hourglass_empty' : 'share'}</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto w-full flex flex-col items-center py-8 bg-slate-50/50 dark:bg-slate-950/30 custom-scrollbar">
                    {/* Success Burst Animation Placeholder or Icon */}
                    <div className="mb-6 relative">
                        <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full animate-pulse-soft"></div>
                        <div className="relative bg-emerald-500 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-float">
                            <span className="material-symbols-outlined text-4xl">check</span>
                        </div>
                    </div>

                    <div ref={ticketRef} className="shadow-2xl shadow-slate-200 dark:shadow-none rounded-sm overflow-hidden transform hover:scale-[1.01] transition-transform duration-300">
                        <TicketPreview
                            config={ticketConfig}
                            sale={generatedTicket}
                            user={user}
                            client={client}
                        />
                    </div>

                    <div className="mt-8 px-8 text-center">
                        <p className="text-slate-400 dark:text-slate-500 text-xs font-medium max-w-[200px]">
                            El ticket ha sido generado y registrado en el historial local.
                        </p>
                    </div>
                </div>

                {/* Acciones principales */}
                <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4 shrink-0 relative z-20 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] pb-8 md:pb-6">
                    <div className="flex gap-4 h-[64px]">
                        <button
                            onClick={() => setGeneratedTicket(null)}
                            className="flex-1 h-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl active:scale-95 transition-all text-sm flex flex-col items-center justify-center gap-0.5"
                        >
                            <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
                            <span>Nueva Venta</span>
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={btPrinting}
                            className="flex-[2] h-full bg-primary hover:bg-blue-700 disabled:opacity-60 text-white font-black rounded-2xl shadow-xl shadow-primary/25 flex items-center justify-center gap-3 text-base active:scale-95 transition-all"
                        >
                            {btPrinting
                                ? <span className="material-symbols-outlined animate-spin">refresh</span>
                                : <span className="material-symbols-outlined">print</span>
                            }
                            {btPrinting ? 'Imprimiendo...' : 'Imprimir Recibo'}
                        </button>
                    </div>
                </div>
                <div className="h-6 bg-white dark:bg-slate-900 shrink-0"></div>
            </div>

            {/* TICKET IMPRIMIBLE */}
            <div id="ticket-print-area" className="hidden print:block">
                <div style={{ fontFamily: 'monospace', fontSize: ticketConfig.useFontB ? '7pt' : '8pt', lineHeight: '1.2', width: `${(ticketConfig.paperWidth || 58) - 2}mm`, margin: '0', padding: '2mm 0', color: '#000' }}>
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
