import React, { useState } from 'react';
import { useStore } from '../store';
import { Lock, LogIn, CloudOff, Eye, EyeOff, RefreshCw } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login, isOnline, isSyncing, fetchFromSupabase } = useStore();

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Ingresa usuario y contraseña');
            return;
        }

        const success = login(username, password);
        if (!success) {
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
                <div className="flex justify-center mb-6 text-primary">
                    <div className="p-4 bg-white rounded-[2rem] shadow-2xl border border-slate-100 flex items-center justify-center relative">
                        {isOnline ? (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-sm shadow-green-500/50"></div>
                        ) : (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-4 border-white shadow-sm shadow-orange-500/50"></div>
                        )}
                        <Lock size={40} className="text-primary" strokeWidth={2.5} />
                    </div>
                </div>
                <h2 className="mt-2 text-center text-4xl font-black tracking-tighter text-slate-900 leading-tight">
                    QuesoApp
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
                                <button
                                    type="button"
                                    onClick={() => fetchFromSupabase()}
                                    disabled={isSyncing}
                                    className="w-full flex justify-center gap-2 items-center py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl border border-slate-100 text-xs font-bold transition-all disabled:opacity-50"
                                >
                                    <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                                    {isSyncing ? "Actualizando Base de Datos..." : "Actualizar Datos Online"}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
