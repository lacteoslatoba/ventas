import React, { useState, useEffect } from 'react';
import {
    Bluetooth, BluetoothConnected, BluetoothOff, BluetoothSearching,
    Printer, CheckCircle2, AlertCircle, Trash2, Zap, Info, ChevronRight
} from 'lucide-react';
import {
    connectPrinter, printTestPage,
    savePrinterName, getSavedPrinterName, clearSavedPrinter
} from '../lib/bluetoothPrinter';

import { useBTPrinter } from '../lib/useBTPrinter';

export default function PrinterSettings() {
    const { printer, setPrinter } = useBTPrinter();
    const [status, setStatus] = useState('idle'); // idle | connecting | connected | error | disconnected
    const [statusMsg, setStatusMsg] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [btSupported, setBtSupported] = useState(true);

    useEffect(() => {
        if (!navigator.bluetooth) {
            setBtSupported(false);
        }
    }, []);

    // Sincronizar estado local con el hook global
    useEffect(() => {
        if (printer) {
            setStatus('connected');
            setStatusMsg(`Conectado a: ${printer.device.name || 'Impresora BT'}`);
        } else if (status === 'connected') {
            setStatus('disconnected');
            setStatusMsg('Se perdió la conexión.');
        }
    }, [printer]);

    const handleConnect = async () => {
        setStatus('connecting');
        setStatusMsg('Buscando impresoras Bluetooth...');
        try {
            const result = await connectPrinter();

            setPrinter(result);
            savePrinterName(result.device.name || 'Impresora BT');

            // Escuchar desconexión
            result.device.addEventListener('gattserverdisconnected', () => {
                setPrinter(null);
            });

        } catch (err) {
            if (err.name === 'NotFoundError') {
                setStatus('idle');
                setStatusMsg('');
            } else {
                setStatus('error');
                setStatusMsg(err.message || 'Error al conectar');
            }
        }
    };

    const handleDisconnect = () => {
        if (printer?.device?.gatt?.connected) {
            printer.device.gatt.disconnect();
        }
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

    const isConnected = status === 'connected' && printer;

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

            {/* Soporte BT */}
            {!btSupported && (
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={22} />
                    <div>
                        <p className="font-bold text-amber-800">Navegador no compatible</p>
                        <p className="text-sm text-amber-700 mt-1">
                            Web Bluetooth requiere <strong>Google Chrome</strong> o <strong>Microsoft Edge</strong> en Android, Windows o macOS.
                            No funciona en Safari ni Firefox.
                        </p>
                    </div>
                </div>
            )}

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
                            {isConnected ? (printer.device.name || 'Impresora Bluetooth') :
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
                            className="w-full flex items-center justify-between bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <Printer size={22} />
                                <span>{isTesting ? 'Imprimiendo...' : 'Imprimir Página de Prueba'}</span>
                            </div>
                            <Zap size={18} className="opacity-70" />
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
            {getSavedPrinterName() && !isConnected && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Bluetooth size={18} className="text-slate-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Último dispositivo</p>
                        <p className="font-bold text-slate-700">{getSavedPrinterName()}</p>
                    </div>
                    <button
                        onClick={handleConnect}
                        className="text-xs bg-white border border-slate-200 hover:border-primary hover:text-primary text-slate-500 font-bold px-3 py-2 rounded-xl transition-all"
                    >
                        Reconectar
                    </button>
                </div>
            )}

            {/* Info / Ayuda */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-primary mb-3">
                    <Info size={18} />
                    <span className="font-bold text-sm uppercase tracking-wider">Información</span>
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
        </div>
    );
}
