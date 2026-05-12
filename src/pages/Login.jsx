import React, { useState } from 'react';
import { useStore } from '../store';
import { Lock, LogIn, CloudOff, Eye, EyeOff, RefreshCw } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [lastSync, setLastSync] = useState(() => localStorage.getItem('lastSync') || null);
    const { login, isOnline, isSyncing, fetchFromSupabase } = useStore();

    const handleSync = async () => {
        await fetchFromSupabase();
        const now = new Date().toISOString();
        localStorage.setItem('lastSync', now);
        setLastSync(now);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Ingresa usuario y contraseña');
            return;
        }

        const success = await login(username, password);
        if (success) {
            // Intentar reconectar impresora al iniciar sesión
            try {
                const { autoConnectPrinter, getSavedPrinterName } = await import('../lib/bluetoothPrinter');
                const savedName = getSavedPrinterName();
                if (savedName && !window.__btPrinter) {
                    const result = await autoConnectPrinter(savedName);
                    if (result) {
                        window.__btPrinter = result;
                        console.log('Impresora reconectada tras inicio de sesión');
                    }
                }
            } catch (err) {
                console.warn('Error al auto-reconectar impresora en login:', err);
            }
        } else {
            setError('Usuario o contraseña incorrectos.');
            setPassword('');
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center px-4 pt-14 pb-10 font-sans">
            {/* Aviso de Modo Offline / Sync */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-10 duration-500 w-full max-w-xs px-4 flex flex-col gap-2">
                {!isOnline && (
                    <div className="bg-orange-500 text-white px-4 py-3 rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-center gap-3 border border-orange-400/50">
                        <div className="bg-white/20 p-1.5 rounded-full">
                            <CloudOff size={15} strokeWidth={3} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-widest leading-none">Modo Offline</span>
                            <span className="text-[10px] font-bold opacity-80">Puedes entrar sin internet</span>
                        </div>
                    </div>
                )}
                {isSyncing && (
                    <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 border border-blue-400/50">
                        <div className="bg-white/20 p-1.5 rounded-full">
                            <RefreshCw size={15} strokeWidth={3} className="animate-spin" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-widest leading-none">Actualizando...</span>
                            <span className="text-[10px] font-bold opacity-80">Descargando base de datos</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header estilo Ventas */}
                <div className="mb-6 px-1 flex justify-between items-start border-b-2 border-gray-900 pb-4">
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">Purificadora Mar de Hielo</p>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mt-0.5">Iniciar Sesión</h1>
                    </div>
                    <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`} title={isOnline ? 'En línea' : 'Sin conexión'} />
                </div>

                {/* Logo card estilo producto */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center mb-5 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-blue-50 transition-transform group-hover:scale-125" />
                    <div className="absolute -left-6 -bottom-6 w-20 h-20 rounded-full bg-slate-50" />
                    <img
                        src="/pwa-logo.png"
                        alt="Mar de Hielo Logo"
                        className="w-36 h-36 object-contain relative z-10"
                    />
                </div>

                {/* Form card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in zoom-in-95 duration-500 delay-100">
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em] ml-1 mb-2">
                                Usuario
                            </label>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full text-base font-bold bg-slate-50 border-2 border-slate-100 focus:border-primary focus:bg-white rounded-xl py-3.5 px-4 outline-none transition-all text-slate-800 placeholder:text-slate-300 shadow-sm"
                                placeholder="Nombre de usuario"
                                autoComplete="username"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em] ml-1 mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full text-base font-bold bg-slate-50 border-2 border-slate-100 focus:border-primary focus:bg-white rounded-xl py-3.5 px-4 pr-12 outline-none transition-all text-slate-800 placeholder:text-slate-300 shadow-sm"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-primary transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 rounded-xl border border-red-100 animate-in shake duration-300">
                                <p className="text-center text-sm font-bold text-red-500">{error}</p>
                            </div>
                        )}

                        <div className="pt-1 flex flex-col gap-3">
                            <button
                                type="submit"
                                className="w-full flex justify-center gap-2 items-center py-4 px-4 border-2 border-primary bg-white text-primary rounded-2xl shadow-xl shadow-blue-500/5 text-lg font-black active:scale-95 transition-all hover:bg-blue-50 group"
                            >
                                <LogIn size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                                Ingresar
                            </button>

                            {isOnline && (
                                <div className="flex flex-col items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSync}
                                        disabled={isSyncing}
                                        className="w-full flex justify-center gap-2 items-center py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-200 text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
                                        {isSyncing ? "Actualizando Base de Datos..." : "Actualizar Datos Online"}
                                    </button>
                                    <div className="flex flex-col items-center gap-1">
                                        <p className="text-[10px] text-slate-400 font-medium">
                                            Última actualización:{' '}
                                            <span className="font-black text-slate-500">
                                                {lastSync ? new Date(lastSync).toLocaleString('es-MX', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                }) : '—'}
                                            </span>
                                        </p>
                                        <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[11px] font-black tracking-wide shadow-sm">
                                            v {__BUILD_TIME__}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Help link */}
                <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                    <a
                        href="/instalar.html"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 text-xs font-bold hover:bg-slate-50 hover:text-primary transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-[18px]">help_outline</span>
                        ¿Problemas al instalar? Ayuda aquí
                    </a>
                </div>
            </div>
        </div>
    );
}
