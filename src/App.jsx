import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, LayoutGrid, ShoppingCart, Banknote, LogOut, Settings, Users, Menu, Package, WifiOff } from 'lucide-react';
import { useStore } from './store';
import { useBTPrinter } from './lib/useBTPrinter';
import { getSavedPrinterName } from './lib/bluetoothPrinter';

import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import UsersPage from './pages/Users';
import Clients from './pages/Clients';
import Sales from './pages/Sales';
import Stock from './pages/Stock';
import Reports from './pages/Reports';
import Login from './pages/Login';
import PrinterSettings from './pages/PrinterSettings';
import TicketConfig from './pages/TicketConfig';
import Sidebar from './components/Sidebar';
import MenuPage from './pages/Menu';

const NetworkIndicator = () => {
  const { isOnline, setOnlineStatus } = useStore();

  useEffect(() => {
    // ── Al recuperar conexión: renovar sesión + subir pendientes + bajar frescos ──
    const handleOnline = () => {
      setOnlineStatus(true);
      // 800 ms para que la red se estabilice antes de la primera llamada
      setTimeout(() => useStore.getState().syncOnReconnect(), 800);
    };

    const handleOffline = () => setOnlineStatus(false);

    // ── Al volver al foco (app minimizada o tab oculta) ──
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const s = useStore.getState();
      // Si el navegador sabe que hay red pero el store dice offline, corregirlo
      if (navigator.onLine && !s.isOnline) s.setOnlineStatus(true);
      if (!navigator.onLine || !s.isOnline) return;
      // Sincronizar si el último sync fue hace más de 2 minutos
      const TWO_MIN = 2 * 60 * 1000;
      const stale = !s.lastSync || Date.now() - new Date(s.lastSync).getTime() > TWO_MIN;
      if (stale) setTimeout(() => useStore.getState().syncOnReconnect(), 800);
    };

    // ── Actualización automática de PWA ──
    const checkForUpdates = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) reg.update();
        });
      }
    };

    // ── Altura estable para móviles (evita brincos del menú) ──
    const updateHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // ── Verificación activa de red (Capacitor Android no emite 'online' al arrancar) ──
    const checkAndSync = () => {
      const realOnline = navigator.onLine;
      const s = useStore.getState();
      if (realOnline !== s.isOnline) s.setOnlineStatus(realOnline);
      if (realOnline) {
        const TWO_MIN = 2 * 60 * 1000;
        const stale = !s.lastSync || Date.now() - new Date(s.lastSync).getTime() > TWO_MIN;
        if (stale || !s.lastSync) s.syncOnReconnect();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('resize', updateHeight);
    window.addEventListener('focus', checkForUpdates);
    document.addEventListener('visibilitychange', handleVisibility);
    updateHeight();
    checkForUpdates();

    // Sync inicial al montar — usar navigator.onLine directo, no el valor del store
    // (el store puede tener isOnline: false guardado del localStorage)
    setTimeout(checkAndSync, 1000);

    // Re-verificar cada 30 s por si el WebView no emitió el evento 'online'
    const intervalId = setInterval(checkAndSync, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('focus', checkForUpdates);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(intervalId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

// Componente persistente para manejar reconexión de impresora usando el hook global
const PrinterAutoConnect = () => {
  useBTPrinter(); // Activa la lógica de auto-reconexión del hook
  return null;
};




const MobileHeader = ({ currentUser, isSyncing, location, navigate }) => {
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
          <span className={`material-symbols-outlined text-xl ${
            printer ? 'text-emerald-500' :
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

// Componente interno para botón
// eslint-disable-next-line no-unused-vars
export const NavItem = ({ to, icon: Icon, label, active, onClick }) => {
  const content = (
    <div className={`flex flex-col items-center justify-center gap-1 w-20 pt-1 pb-1 transition-colors ${active ? 'text-primary' : 'text-slate-500'}`}>
      <Icon size={22} fill={active ? "currentColor" : "none"} strokeWidth={2} />
      <span className="text-[10px] font-black uppercase tracking-tight leading-none mt-1">{label}</span>
    </div>
  );

  if (onClick) {
    return <button onClick={onClick} className="focus:outline-none">{content}</button>;
  }

  return <Link to={to} className="focus:outline-none">{content}</Link>;
};

const BottomNavigation = ({ currentUser }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-around items-center px-4 h-[calc(60px+env(safe-area-inset-bottom,20px))] pb-[env(safe-area-inset-bottom,20px)] z-50 select-none no-print shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <NavItem to="/" icon={ShoppingCart} label="Vender" active={isActive('/') || isActive('/ventas')} />
      
      <NavItem to="/reportes" icon={Banknote} label="Reportes" active={isActive('/reportes')} />
 
      {isAdmin ? (
         <NavItem to="/menu" icon={LayoutGrid} label="Menú" active={isActive('/menu')} />
      ) : (
         <NavItem to="/stock" icon={Package} label="Registro" active={isActive('/stock')} />
      )}
    </div>
  );
};

const MobileHeaderWrapper = ({ currentUser, isSyncing }) => {
  const location = useLocation();
  const navigate = useNavigate();
  return <MobileHeader currentUser={currentUser} isSyncing={isSyncing} location={location} navigate={navigate} />;
};

const InstallBanner = () => {
  const [prompt, setPrompt] = React.useState(null);
  const [dismissed, setDismissed] = React.useState(
    () => sessionStorage.getItem('pwa-install-dismissed') === '1'
  );

  React.useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!prompt || dismissed) return null;

  const install = async () => {
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setPrompt(null);
  };

  const dismiss = () => {
    sessionStorage.setItem('pwa-install-dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-[185px] left-3 right-3 z-[90] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
        <img src="/pwa-logo.png" alt="icono" className="w-11 h-11 rounded-xl shrink-0 object-cover" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-tight">Instalar App</p>
          <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">Agrega al inicio para acceso rápido</p>
        </div>
        <button
          onClick={dismiss}
          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-300 shrink-0"
        >
          <span className="material-symbols-outlined" style={{fontSize:18}}>close</span>
        </button>
        <button
          onClick={install}
          className="bg-primary text-white text-xs font-black px-4 py-2 rounded-xl active:scale-95 transition-all shrink-0"
        >
          Instalar
        </button>
      </div>
    </div>
  );
};

const OfflineBanner = () => {
  const { isOnline, isSyncing, products, users, clients, sales, inventory, expenses, ticketConfig } = useStore();

  const pendingCount = React.useMemo(() => {
    const tables = [products, users, clients, sales, inventory, expenses];
    let count = tables.reduce((acc, t) => acc + (t || []).filter(i => !i.synced).length, 0);
    if (ticketConfig && !ticketConfig.synced) count++;
    return count;
  }, [products, users, clients, sales, inventory, expenses, ticketConfig]);

  // ── Sin conexión ──────────────────────────────────────────────────────────
  if (!isOnline) {
    return (
      <div className="flex-shrink-0 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-black no-print select-none">
        <WifiOff size={13} />
        <span>
          Sin conexión
          {pendingCount > 0 && ` · ${pendingCount} cambio${pendingCount !== 1 ? 's' : ''} sin subir`}
        </span>
      </div>
    );
  }

  // ── Online + sincronizando ────────────────────────────────────────────────
  if (isSyncing) {
    return (
      <div className="flex-shrink-0 bg-blue-500 text-white px-4 py-1.5 flex items-center justify-center gap-2 text-[11px] font-bold no-print select-none">
        <RefreshCw size={11} className="animate-spin" />
        <span>Sincronizando{pendingCount > 0 ? ` ${pendingCount} cambio${pendingCount !== 1 ? 's' : ''}` : ''}…</span>
      </div>
    );
  }

  // ── Online + hay pendientes sin subir (sync falló o aún no corrió) ────────
  if (pendingCount > 0) {
    return (
      <button
        onClick={() => useStore.getState().syncOnReconnect()}
        className="flex-shrink-0 bg-orange-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-black no-print select-none w-full active:bg-orange-600 transition-colors"
      >
        <RefreshCw size={12} />
        <span>
          {pendingCount} cambio{pendingCount !== 1 ? 's' : ''} sin subir · Toca para sincronizar
        </span>
      </button>
    );
  }

  return null;
};

const GlobalConfirmDialog = () => {
  const { confirmDialog, hideConfirm } = useStore();
  if (!confirmDialog) return null;
  const { message, onConfirm, confirmText = 'Confirmar', danger = false } = confirmDialog;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xs bg-white rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-150">
        <p className="text-base font-black text-slate-800 mb-6 leading-snug">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={() => hideConfirm()}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm active:scale-95 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => { hideConfirm(); onConfirm(); }}
            className={`flex-1 py-3 rounded-2xl font-black text-sm text-white active:scale-95 transition-all ${danger ? 'bg-red-500' : 'bg-gray-900'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminRoute = ({ children, currentUser }) => {
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const { currentUser, isSyncing, initAuth } = useStore();

  useEffect(() => { initAuth(); }, [initAuth]);

  // Ya no se fuerza Fullscreen porque el usuario prefiere su barra de navegación y para evitar bugs de teclado en Android.

  return (
    <>
      <GlobalConfirmDialog />
      <NetworkIndicator />
      <InstallBanner />
      {!currentUser ? (
        <Login />
      ) : (
        <Router>
          <PrinterAutoConnect />
          <div 
            className="flex flex-col md:flex-row bg-[#f6f6f8] dark:bg-[#101622] overflow-hidden font-sans text-slate-900 pt-safe pb-safe"
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
          >
            <Sidebar />
            
            <div 
              className="flex-1 flex flex-col overflow-hidden h-full"
            >
              <MobileHeaderWrapper
                currentUser={currentUser}
                isSyncing={isSyncing}
              />
              <OfflineBanner />


            <main 
              className="flex-1 overflow-hidden w-full relative scroll-smooth"
            >
              <div className="h-full overflow-y-auto pb-44 md:pb-8 relative custom-scrollbar">
                <Routes>
                  <Route path="/" element={<Sales />} />
                  <Route path="/ventas" element={<Sales />} />
                  <Route path="/reportes" element={<Reports />} />
                  <Route path="/stock" element={<Stock />} />
                  <Route path="/clientes" element={<Clients />} />
                  
                  {/* Rutas Protegidas de Admin */}
                  <Route path="/menu" element={<AdminRoute currentUser={currentUser}><MenuPage /></AdminRoute>} />
                  <Route path="/productos" element={<AdminRoute currentUser={currentUser}><Products /></AdminRoute>} />
                  <Route path="/inventario" element={<AdminRoute currentUser={currentUser}><Inventory /></AdminRoute>} />
                  <Route path="/usuarios" element={<AdminRoute currentUser={currentUser}><UsersPage /></AdminRoute>} />
                  <Route path="/impresora" element={<PrinterSettings />} />
                  <Route path="/ticket" element={<AdminRoute currentUser={currentUser}><TicketConfig /></AdminRoute>} />
                </Routes>
              </div>
            </main>

              <BottomNavigation currentUser={currentUser} />
            </div>
          </div>
        </Router>
      )}
    </>
  );
}

export default App;
