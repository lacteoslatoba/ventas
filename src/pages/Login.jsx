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
        <div className="min-h-screen bg-[#f6f6f8] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
            {/* Aviso de Modo Offline / Sync */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-10 duration-500 w-full max-w-xs px-4 flex flex-col gap-2">
                {!isOnline && (
                    <div className="bg-orange-500 text-white px-4 py-3 rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-center gap-3 border border-orange-400/50 backdrop-blur-md">
                        <div className="bg-white/20 p-1.5 rounded-full ring-4 ring-white/10">
                            <CloudOff size={16} strokeWidth={3} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-widest leading-none">Modo Offline</span>
                            <span className="text-[10px] font-bold opacity-80">Puedes entrar sin internet</span>
                        </div>
                    </div>
                )}
                {isSyncing && (
                    <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 border border-blue-400/50 backdrop-blur-md">
                        <div className="bg-white/20 p-1.5 rounded-full ring-4 ring-white/10">
                            <RefreshCw size={16} strokeWidth={3} className="animate-spin" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-widest leading-none">Actualizando...</span>
                            <span className="text-[10px] font-bold opacity-80">Descargando base de datos</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-center mb-6">
                    <div className="p-1 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex items-center justify-center relative overflow-hidden group">
                        {isOnline ? (
                            <div className="absolute top-4 right-4 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-sm shadow-green-500/50 z-10"></div>
                        ) : (
                            <div className="absolute top-4 right-4 w-4 h-4 bg-orange-500 rounded-full border-4 border-white shadow-sm shadow-orange-500/50 z-10"></div>
                        )}
                        <img 
                            src="/pwa-logo.png" 
                            alt="Lácteos La Toba Logo" 
                            className="w-40 h-40 object-contain group-hover:scale-110 transition-transform duration-700"
                        />
                    </div>
                </div>
                <h2 className="mt-2 text-center text-4xl font-black tracking-tighter text-slate-900 leading-tight uppercase font-sans">
                    Lácteos La Toba
                </h2>
                <p className="mt-3 text-center text-base text-slate-500 font-medium">
                    Ingresa tus credenciales para continuar
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
                <div className="bg-white py-10 px-6 sm:px-10 shadow-2xl shadow-slate-200/60 border border-slate-100/50 sm:rounded-[2.5rem] animate-in fade-in zoom-in-95 duration-500 delay-100">
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2">
                                Usuario
                            </label>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full text-lg font-bold bg-slate-50 border-2 border-slate-100 focus:border-primary focus:bg-white rounded-2xl py-4 px-5 outline-none transition-all text-slate-800 placeholder:text-slate-300 shadow-sm"
                                placeholder="Nombre de usuario"
                                autoComplete="username"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full text-lg font-bold bg-slate-50 border-2 border-slate-100 focus:border-primary focus:bg-white rounded-2xl py-4 px-5 pr-14 outline-none transition-all text-slate-800 placeholder:text-slate-300 shadow-sm"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-primary transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 rounded-xl border border-red-100 animate-in shake duration-300 mt-2">
                                <p className="text-center text-sm font-bold text-red-500">
                                    {error}
                                </p>
                            </div>
                        )}

                        <div className="pt-2 flex flex-col gap-3">
                            <button
                                type="submit"
                                className="w-full flex justify-center gap-3 items-center py-4 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.25rem] shadow-xl shadow-slate-900/10 text-lg font-black active:scale-95 transition-all group"
                            >
                                <LogIn size={22} className="group-hover:translate-x-1 transition-transform duration-300" />
                                Iniciar Sesión
                            </button>

                            {isOnline && (
                                <div className="flex flex-col items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={handleSync}
                                        disabled={isSyncing}
                                        className="w-full flex justify-center gap-2 items-center py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl border border-slate-100 text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                                        {isSyncing ? "Actualizando Base de Datos..." : "Actualizar Datos Online"}
                                    </button>
                                        <div className="flex flex-col items-center">
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                Última actualización:{' '}
                                                <span className="font-black text-slate-500">
                                                    {new Date(lastSync).toLocaleString('es-MX', {
                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit',
                                                    })}
                                                </span>
                                            </p>
                                            <div className="mt-2 bg-blue-600 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                                                Versión 1.2.4 (Nueva)
                                            </div>
                                        </div>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                <a 
                    href="/instalar.html" 
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full text-slate-500 dark:text-slate-400 text-sm font-black hover:bg-white dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary transition-all shadow-sm"
                >
                    <span className="material-symbols-outlined text-[20px]">help_outline</span>
                    ¿Problemas al instalar? Ayuda aquí
                </a>
            </div>
        </div>
    </div>
    );
}
