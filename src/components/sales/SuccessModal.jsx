import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TicketPreview from '../TicketPreview';
import { printTicket } from '../../lib/bluetoothPrinter';

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
    const navigate = useNavigate();

    if (!generatedTicket) return null;

    const user = generatedTicket.userId === 'admin' ? { name: 'Administrador' } : users.find(u => u.id === generatedTicket.userId);
    const client = clients.find(c => c.id === generatedTicket.clientId) || { name: 'General' };
    const printerConnected = !!window.__btPrinter;

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
            canvas.toBlob(async (blob) => {
                const fileName = `ticket-${generatedTicket.id.slice(-6).toUpperCase()}.png`;
                const file = new File([blob], fileName, { type: 'image/png' });
                if (navigator.share && navigator.canShare?.({ files: [file] })) {
                    await navigator.share({ files: [file], title: `Ticket ${client.name}` });
                } else {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            }, 'image/png');
        } catch (err) {
            showToast('Error al compartir: ' + err.message, 'error');
        } finally {
            setSharing(false);
        }
    };

    const handleConnectPrinter = () => {
        setGeneratedTicket(null);
        navigate('/impresora');
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
                    <div ref={ticketRef}>
                        <TicketPreview
                            config={ticketConfig}
                            sale={generatedTicket}
                            user={user}
                            client={client}
                        />
                    </div>
                </div>

                {/* Acciones principales */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3 shrink-0 relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] pb-6 md:pb-4">
                    <div className={`flex gap-3 ${printerConnected ? 'h-[60px]' : 'min-h-[60px]'}`}>
                        <button
                            onClick={() => setGeneratedTicket(null)}
                            className="w-[30%] self-stretch bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 font-bold rounded-[1.25rem] active:scale-95 transition-all text-[11px] uppercase tracking-wider flex flex-col items-center justify-center gap-0.5"
                        >
                            <span className="material-symbols-outlined text-xl leading-none">add_shopping_cart</span>
                            <span className="mt-1">Nueva</span>
                        </button>

                        {printerConnected ? (
                            <button
                                onClick={handlePrint}
                                disabled={btPrinting}
                                className="w-[70%] h-full bg-primary hover:bg-blue-700 disabled:opacity-60 text-white font-black rounded-[1.25rem] shadow-lg shadow-primary/25 flex items-center justify-center gap-2 text-base active:scale-95 transition-all"
                            >
                                {btPrinting
                                    ? <span className="material-symbols-outlined animate-spin">refresh</span>
                                    : <span className="material-symbols-outlined">print</span>
                                }
                                {btPrinting ? 'Imprimiendo...' : 'Imprimir Ticket'}
                            </button>
                        ) : (
                            <div className="w-[70%] flex flex-col gap-2">
                                <button
                                    onClick={handleShare}
                                    disabled={sharing}
                                    className="flex-1 bg-primary hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-[1rem] shadow-lg shadow-primary/25 flex items-center justify-center gap-2 text-sm active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined text-base">share</span>
                                    {sharing ? 'Generando...' : 'Compartir imagen'}
                                </button>
                                <button
                                    onClick={handleConnectPrinter}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-[1rem] flex items-center justify-center gap-2 text-sm active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined text-base">bluetooth</span>
                                    Conectar impresora
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-6 bg-white dark:bg-background-dark"></div>
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
