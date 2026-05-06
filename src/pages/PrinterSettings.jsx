import React, { useState, useEffect } from 'react';
import {
    Bluetooth, BluetoothConnected, BluetoothOff, BluetoothSearching,
    Printer, CheckCircle2, AlertCircle, Trash2, Zap, Info, ChevronRight, ArrowLeft, FileText
} from 'lucide-react';
import {
    connectPrinter, reconnectSaved, printTestPage, printTicket,
    getSavedPrinterName, getPrinterDisplayName, clearSavedPrinter
} from '../lib/bluetoothPrinter';
import { useStore } from '../store';

import { useBTPrinter } from '../lib/useBTPrinter';

export default function PrinterSettings() {
    const { printer, setPrinter, isReconnecting } = useBTPrinter();
    const { ticketConfig } = useStore();
    const [status, setStatus] = useState('idle'); // idle | connecting | connected | error | disconnected
    const [statusMsg, setStatusMsg] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [btSupported, setBtSupported] = useState(true);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        setBtSupported(!!navigator.bluetooth);
    }, []);

    const isSamsungBrowser = /SamsungBrowser/i.test(navigator.userAgent);
    const isUnsupportedBrowser = !navigator.bluetooth;
    const targetUrl = window.location.href;

    // Sincronizar estado local con el hook global
    useEffect(() => {
        if (printer) {
            setStatus('connected');
            setStatusMsg(`Conectado a: ${printer.device.name || 'Impresora BT'}`);
        } else if (isReconnecting) {
            setStatus('connecting');
            setStatusMsg('Intentando reconexión automática...');
        } else if (status === 'connected') {
            setStatus('disconnected');
            setStatusMsg('Se perdió la conexión.');
        }
    }, [printer, isReconnecting, status]);

    const handleConnect = async () => {
        setStatus('connecting');
        setStatusMsg('Buscando impresoras Bluetooth...');
        try {
            const result = await connectPrinter();
            setPrinter(result);
        } catch (err) {
            if (err.name === 'NotFoundError' || err.name === 'UserCancelledError') {
                setStatus('idle');
                setStatusMsg('');
            } else {
                setStatus('error');
                setStatusMsg(err.message || 'Error al conectar');
            }
        }
    };

    const handleReconnect = async () => {
        if (!getSavedPrinterName()) { handleConnect(); return; }
        setStatus('connecting');
        setStatusMsg(`Conectando con ${getPrinterDisplayName()}...`);
        try {
            const result = await reconnectSaved();
            if (!result) throw new Error('No se pudo conectar');
            setPrinter(result);
        } catch (err) {
            if (err.name === 'NotFoundError' || err.name === 'UserCancelledError') { setStatus('idle'); setStatusMsg(''); }
            else { setStatus('error'); setStatusMsg(err.message || 'Error al conectar'); }
        }
    };

    const handleDisconnect = () => {
        setPrinter(null);
        clearSavedPrinter();
    };

    const handleTest = async () => {
        if (!printer?.characteristic) return;
        setIsTesting(true);
        try {
            await printTestPage(printer.characteristic);
            setStatusMsg('✓ Página de prueba enviada correctamente');
        } catch (err) {
            setStatusMsg(`Error al imprimir: ${err.message}`);
            setStatus('error');
        } finally {
            setIsTesting(false);
        }
    };

    const handleTestReal = async () => {
        if (!printer?.characteristic) return;
        setIsTesting(true);
        try {
            const dummySale = {
                id: 'TEST123',
                date: new Date().toISOString(),
                total: 165.00,
                items: [
                    { name: 'QUESO OAXACA', quantity: 2, price: 60.00, unit: 'Kg' },
                    { name: 'REQUESON', quantity: 1, price: 45.00, unit: 'pza' }
                ]
            };
            await printTicket({
                ticket: dummySale,
                user: { name: 'SISTEMA' },
                client: { name: 'TIENDA DE PRUEBA' },
                characteristic: printer.characteristic,
                config: ticketConfig
            });
            setStatusMsg('✓ Ticket de prueba enviado');
        } catch (err) {
            setStatusMsg(`Error: ${err.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    const isConnected = status === 'connected' && printer;

    if (isUnsupportedBrowser) {
        const chromeUrl = isSamsungBrowser
            ? `intent://${targetUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
            : null;
        return (
            <div className="p-6 max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
                <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center">
                    <BluetoothOff size={36} className="text-red-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Bluetooth no disponible</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        La impresión Bluetooth requiere <strong>Google Chrome</strong> en Android.
                        Este navegador no soporta Web Bluetooth.
                    </p>
                </div>
                {chromeUrl ? (
                    <a href={chromeUrl}
                        className="w-full bg-primary text-white font-bold py-4 px-6 rounded-2xl text-center">
                        Abrir en Google Chrome
                    </a>
                ) : (
                    <p className="text-xs text-slate-400 bg-slate-50 rounded-2xl p-4">
                        Abre esta app desde <strong>Google Chrome</strong> para usar la impresora Bluetooth.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <Bluetooth size={22} className="text-primary" />
                    </div>
                    Impresora Bluetooth
                </h1>
                <p className="text-slate-500 font-medium mt-2 ml-1">
                    Configura tu impresora térmica inalámbrica
                </p>
            </div>

            {/* Acceso directo habilitado */}

            {/* Estado actual */}
            <div className={`rounded-3xl p-6 mb-6 border transition-all ${isConnected
                ? 'bg-emerald-50 border-emerald-200'
                : status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : status === 'connecting'
                        ? 'bg-blue-50 border-blue-200 animate-pulse'
                        : 'bg-white border-slate-200 shadow-sm'
                }`}>
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isConnected ? 'bg-emerald-100' :
                        status === 'error' ? 'bg-red-100' :
                            status === 'connecting' ? 'bg-blue-100' :
                                'bg-slate-100'
                        }`}>
                        {isConnected && <BluetoothConnected size={26} className="text-emerald-600" />}
                        {status === 'connecting' && <BluetoothSearching size={26} className="text-blue-500 animate-pulse" />}
                        {status === 'error' && <BluetoothOff size={26} className="text-red-500" />}
                        {(status === 'idle' || status === 'disconnected') && <Bluetooth size={26} className="text-slate-400" />}
                    </div>
                    <div className="flex-1">
                        <p className={`font-bold text-lg leading-tight ${isConnected ? 'text-emerald-800' :
                            status === 'error' ? 'text-red-800' :
                                'text-slate-700'
                            }`}>
                            {isConnected ? (printer.name || 'Impresora Bluetooth') :
                                status === 'connecting' ? 'Buscando dispositivo...' :
                                    status === 'error' ? 'Error de conexión' :
                                        status === 'disconnected' ? 'Desconectada' :
                                            'Sin Impresora'}
                        </p>
                        <p className={`text-sm font-medium mt-0.5 ${isConnected ? 'text-emerald-600' :
                            status === 'error' ? 'text-red-600' :
                                'text-slate-400'
                            }`}>
                            {statusMsg || (status === 'idle' ? 'Ninguna impresora conectada' : '')}
                        </p>
                    </div>
                    {isConnected && (
                        <CheckCircle2 size={28} className="text-emerald-500 shrink-0" />
                    )}
                </div>
            </div>

            {/* Botones de acción */}
            <div className="space-y-3 mb-8">
                {!isConnected ? (
                    <button
                        onClick={handleConnect}
                        disabled={!btSupported || status === 'connecting'}
                        className="w-full flex items-center justify-between bg-primary hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <BluetoothSearching size={22} />
                            <span>{status === 'connecting' ? 'Conectando...' : 'Conectar Impresora'}</span>
                        </div>
                        <ChevronRight size={20} className="opacity-70" />
                    </button>
                ) : (
                    <>
                        <button
                            onClick={handleTest}
                            disabled={isTesting}
                            className="w-full flex items-center justify-between bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all mb-3"
                        >
                            <div className="flex items-center gap-3">
                                <Printer size={22} />
                                <span>{isTesting ? 'Imprimiendo...' : 'Página de Prueba (Simple)'}</span>
                            </div>
                            <Zap size={18} className="opacity-70" />
                        </button>

                        <button
                            onClick={handleTestReal}
                            disabled={isTesting}
                            className="w-full flex items-center justify-between bg-primary hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <FileText size={22} className="text-white" />
                                <span>{isTesting ? 'Imprimiendo...' : 'Imprimir Ticket de Venta Real'}</span>
                            </div>
                            <CheckCircle2 size={18} className="opacity-70" />
                        </button>

                        <button
                            onClick={handleDisconnect}
                            className="w-full flex items-center justify-between bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 font-bold py-4 px-6 rounded-2xl active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <Trash2 size={20} />
                                <span>Desconectar Impresora</span>
                            </div>
                        </button>
                    </>
                )}
            </div>

            {/* Última impresora */}
            {getPrinterDisplayName() && !isConnected && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Bluetooth size={18} className="text-slate-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Último dispositivo</p>
                        <p className="font-bold text-slate-700">{getPrinterDisplayName()}</p>
                    </div>
                    <button
                        onClick={handleReconnect}
                        className="text-xs bg-white border border-slate-200 hover:border-primary hover:text-primary text-slate-500 font-bold px-3 py-2 rounded-xl transition-all"
                    >
                        Reconectar
                    </button>
                </div>
            )}

            {/* Info / Ayuda (Opcional) */}
            <div className="mt-8 text-center">
                <button
                    onClick={() => setShowHelp(!showHelp)}
                    className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                    <Info size={14} />
                    {showHelp ? 'Ocultar Ayuda' : '¿Necesitas ayuda para conectar?'}
                </button>
            </div>

            {showHelp && (
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-5 space-y-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-primary mb-3">
                        <Info size={18} />
                        <span className="font-bold text-sm uppercase tracking-wider">Ayuda de Conexión</span>
                    </div>
                    {[
                        { title: 'Impresoras compatibles', desc: 'Impresoras térmicas de 58mm o 80mm con Bluetooth: Xprinter, GOOJPRT, MUNBYN, ZJ-5805, RPP02N, PeriPage, etc.' },
                        { title: 'Cómo conectar', desc: '1. Enciende y empareja la impresora en los ajustes Bluetooth del teléfono/PC. 2. Pulsa "Conectar Impresora" y selecciona tu dispositivo de la lista.' },
                        { title: 'Requisitos', desc: 'Necesitas Google Chrome o Edge. En iPhone/Safari no funciona por limitaciones de Apple.' },
                        { title: 'Si no aparece tu impresora', desc: 'Asegúrate de que esté emparejada previamente en la configuración Bluetooth del sistema.' },
                    ].map(({ title, desc }) => (
                        <div key={title} className="border-b border-blue-100/70 pb-3 last:border-0 last:pb-0">
                            <p className="font-bold text-blue-800 text-sm mb-0.5">{title}</p>
                            <p className="text-blue-600 text-sm leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
