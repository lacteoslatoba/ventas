import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, LayoutGrid, LogOut, Settings, Users, Menu } from 'lucide-react';
import { useStore } from '../store';
import { useBTPrinter } from '../lib/useBTPrinter';
import { getSavedPrinterName } from '../lib/bluetoothPrinter';

const MobileHeader = ({ currentUser, isSyncing, location }) => {
    const navigate = useNavigate();
    const isAdmin = currentUser?.role === 'admin';
    const isHome = location.pathname === '/' || (!isAdmin && location.pathname === '/ventas');
    const [showSettings, setShowSettings] = React.useState(false);
    const [showDriverMenu, setShowDriverMenu] = React.useState(false);
    const [showSyncModal, setShowSyncModal] = React.useState(false);
    const [modal, setModal] = React.useState(null); // { title, message, onConfirm }
    const { showToast, isOnline, lastSync, syncError, sales, clients, products, users, inventory, expenses, ticketConfig } = useStore();
    const { printer, isReconnecting, startAutoConnect } = useBTPrinter();

    const pendingCount = [sales, clients, products, users, inventory, expenses]
        .reduce((acc, t) => acc + (t || []).filter(i => !i.synced).length, 0)
        + (ticketConfig && !ticketConfig.synced ? 1 : 0);

    const openModal = (title, message, onConfirm) =>
        setModal({ title, message, onConfirm });
    const closeModal = () => setModal(null);

    const doRefresh = () => {
        if ('caches' in window) {
            caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))));
        }
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs =>
                Promise.all(regs.map(r => r.unregister())).then(() => window.location.reload())
            );
        } else {
            window.location.reload();
        }
    };

    const handleRefresh = () => {
        if (!navigator.onLine) {
            showToast('Conéctate a Internet para actualizar', 'error');
            return;
        }
        // Si hay ventas/datos sin subir, sincronizar PRIMERO para no perder nada
        const s = useStore.getState();
        const tables = [s.products, s.users, s.clients, s.sales, s.inventory, s.expenses];
        const pending = tables.reduce((acc, t) => acc + (t || []).filter(i => !i.synced).length, 0)
            + (s.ticketConfig && !s.ticketConfig.synced ? 1 : 0);
        if (pending > 0) {
            openModal(
                '⚠️ Hay datos sin subir',
                `${pending} registro${pending !== 1 ? 's' : ''} (ventas/gastos) aún no se ha${pending !== 1 ? 'n' : ''} sincronizado con la nube. Al confirmar se subirán primero y luego se actualizará la app.`,
                async () => {
                    showToast('Subiendo datos a la nube…', 'success');
                    await useStore.getState().syncOnReconnect();
                    // Verificar si quedaron items sin subir después del sync
                    const after = useStore.getState();
                    const stillPending = ['products', 'users', 'clients', 'sales', 'inventory', 'expenses']
                        .reduce((acc, t) => acc + (after[t] || []).filter(i => !i.synced).length, 0);
                    if (stillPending > 0) {
                        showToast(`No se pudieron subir ${stillPending} registro${stillPending !== 1 ? 's' : ''}. Revisa tu conexión e intenta de nuevo.`, 'error');
                        return; // NO recargar si hay datos sin subir
                    }
                    setTimeout(doRefresh, 1500);
                }
            );
        } else {
            openModal('Actualizar App', '¿Buscar actualizaciones y refrescar la aplicación?', doRefresh);
        }
    };

    return (
        <div className="md:hidden flex-shrink-0 flex items-center justify-between bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 no-print z-40 relative">
            {/* Izquierda: Regresar o Hamburger/Menú */}
            <div className="w-10 relative">
                <button
                    onClick={() => {
                        if (isHome) {
                            if (isAdmin) navigate('/menu');
                            else setShowDriverMenu(!showDriverMenu);
                        } else {
                            navigate(-1);
                        }
                    }}
                    className={`p-2 -ml-2 rounded-xl text-primary bg-primary/5 active:scale-90 transition-all relative`}
                >
                    {isHome ? (isAdmin ? <LayoutGrid size={24} /> : <Menu size={24} />) : <ArrowLeft size={24} />}
                    {isHome && !isAdmin && pendingCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center leading-none">
                            {pendingCount > 9 ? '!' : pendingCount}
                        </span>
                    )}
                </button>

                {/* Dropdown de Repartidor */}
                {showDriverMenu && !isAdmin && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowDriverMenu(false)} />
                        <div className="absolute left-0 top-12 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                            <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-700 mb-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentUser?.name}</p>
                                <p className="text-[9px] font-bold text-primary uppercase">Opciones de Repartidor</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowDriverMenu(false);
                                    navigate('/clientes');
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <Users size={18} className="text-slate-400" /> Clientes
                            </button>
                            <button
                                onClick={() => {
                                    setShowDriverMenu(false);
                                    navigate('/impresora');
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <div className="w-5 flex justify-center"><span className="material-symbols-outlined text-[18px] text-slate-400">print</span></div> Config. Impresora
                            </button>
                            <button
                                onClick={() => {
                                    setShowDriverMenu(false);
                                    setShowSyncModal(true);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors relative"
                            >
                                <div className="w-5 flex justify-center relative">
                                    <span className="material-symbols-outlined text-[18px] text-slate-400">cloud_sync</span>
                                    {pendingCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] font-black flex items-center justify-center">{pendingCount > 9 ? '!' : pendingCount}</span>
                                    )}
                                </div>
                                Estado de Sync
                                {pendingCount > 0 && <span className="ml-auto text-[10px] font-black text-amber-500">{pendingCount} pendientes</span>}
                            </button>
                            <button
                                onClick={() => {
                                    setShowDriverMenu(false);
                                    handleRefresh();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                            >
                                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} /> Actualizar App
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Modal de Debug / Estado de Sincronización */}
            {showSyncModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => setShowSyncModal(false)}>
                    <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Estado de Sincronización</h3>
                            <button onClick={() => setShowSyncModal(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">✕</button>
                        </div>

                        <div className="space-y-3 text-sm mb-5">
                            {/* Conexión */}
                            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-500 font-bold">Conexión</span>
                                <span className={`flex items-center gap-1.5 font-black ${isOnline ? 'text-emerald-600' : 'text-red-500'}`}>
                                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                                    {isOnline ? 'En línea' : 'Sin internet'}
                                </span>
                            </div>

                            {/* Pendientes */}
                            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-500 font-bold">Datos pendientes</span>
                                <span className={`font-black ${pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {pendingCount > 0 ? `${pendingCount} sin subir` : '✓ Todo subido'}
                                </span>
                            </div>

                            {/* Último sync */}
                            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-500 font-bold">Último sync</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-right text-xs max-w-[150px]">
                                    {lastSync ? new Date(lastSync).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
                                </span>
                            </div>

                            {/* Sincronizando */}
                            {isSyncing && (
                                <div className="flex items-center gap-2 py-2 text-blue-600 font-bold">
                                    <RefreshCw size={14} className="animate-spin" />
                                    Sincronizando ahora…
                                </div>
                            )}

                            {/* Error */}
                            {syncError && (
                                <div className="py-2 px-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-0.5">Último error</p>
                                    <p className="text-xs text-red-700 dark:text-red-400 font-mono break-all">{syncError}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    if (!isOnline) { showToast('Sin internet — conéctate e intenta de nuevo', 'error'); return; }
                                    setShowSyncModal(false);
                                    showToast('Sincronizando con el servidor…', 'success');
                                    await useStore.getState().syncOnReconnect();
                                }}
                                disabled={isSyncing || !isOnline}
                                className="flex-1 py-3 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                                Forzar Sync
                            </button>
                            <button
                                onClick={() => setShowSyncModal(false)}
                                className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm active:scale-95 transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Centro: nombre usuario — absolute para quedar siempre centrado en pantalla sin importar el ancho de los botones laterales */}
            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-0.5">
                    {isHome ? 'Bienvenido' : 'Navegación'}
                </span>
                <h1 className="text-base font-black tracking-tight text-slate-800 dark:text-white leading-none">
                    {isHome ? currentUser?.name?.split(' ')[0] : location.pathname.substring(1).toUpperCase()}
                </h1>
            </div>

            {/* Derecha: Ajustes y Salir */}
            <div className="flex items-center gap-1 relative justify-end">

                {/* Indicador impresora BT */}
                <button
                    onClick={() => {
                        if (printer) { navigate('/impresora'); return; }
                        if (isReconnecting) return;
                        if (getSavedPrinterName()) {
                            startAutoConnect();
                        } else {
                            navigate('/impresora');
                        }
                    }}
                    title={printer ? 'Impresora conectada' : isReconnecting ? 'Buscando impresora...' : 'Toca para reintentar'}
                    className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all"
                >
                    <span className={`material-symbols-outlined text-xl ${printer ? 'text-emerald-500' :
                            isReconnecting ? 'text-amber-400 animate-pulse' :
                                'text-slate-300'
                        }`}>
                        {printer ? 'print' : isReconnecting ? 'bluetooth_searching' : 'print_disabled'}
                    </span>
                </button>

                <button
                    onClick={() => openModal('Cerrar sesión', '¿Seguro que deseas salir?', () => useStore.getState().logout())}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-red-500 active:scale-95 transition-all"
                >
                    <LogOut size={22} />
                </button>

                {isAdmin && (
                    <button
                        onClick={handleRefresh}
                        className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 active:scale-95 transition-all relative overflow-hidden"
                        title="Refrescar aplicación"
                    >
                        <span className={`material-symbols-outlined text-2xl ${isSyncing ? 'animate-spin' : ''}`}>
                            sync
                        </span>
                    </button>
                )}

                {isAdmin && (
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-all"
                    >
                        <Settings size={22} className={showSettings ? 'rotate-90' : ''} />
                    </button>
                )}

                {/* Dropdown de Ajustes Admin */}
                {showSettings && isAdmin && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                        <div className="absolute right-0 top-12 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                            <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-700 mb-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentUser?.name}</p>
                                <p className="text-[9px] font-bold text-primary uppercase">Administrador</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowSettings(false);
                                    navigate('/impresora');
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                    <span className="material-symbols-outlined text-lg">print</span>
                                </div>
                                Conexión Impresora
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Modal de confirmación personalizado */}
            {modal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1">{modal.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{modal.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={closeModal}
                                className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm active:scale-95 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => { closeModal(); modal.onConfirm(); }}
                                className="flex-1 py-3 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileHeader;
