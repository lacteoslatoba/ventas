import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, LayoutGrid, ShoppingCart, Banknote, LogOut, Settings, Users, Menu, Package, Truck, WifiOff } from 'lucide-react';
import { useStore } from './store';
import { useBTPrinter } from './lib/useBTPrinter';
import { getSavedPrinterName } from './lib/bluetoothPrinter';

import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import UsersPage from './pages/Users';
import Clients from './pages/Clients';
import Sales from './pages/Sales';
import Entregas from './pages/Stock'; // Reused file for Entregas
import Reports from './pages/Reports';
import Login from './pages/Login';
import PrinterSettings from './pages/PrinterSettings';
import TicketConfig from './pages/TicketConfig';
import Sidebar from './components/Sidebar';
import MenuPage from './pages/Menu';

const NetworkIndicator = () => {
  const { isOnline, setOnlineStatus, syncToSupabase, fetchFromSupabase, showToast } = useStore();

  useEffect(() => {
    // Dark Mode Handling
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);

    const handleOnline = () => {
      setOnlineStatus(true);
      showToast('Conexión restaurada — sincronizando...', 'success');
      fetchFromSupabase().then(() => syncToSupabase(true));
    };
    const handleOffline = () => {
      setOnlineStatus(false);
      showToast('Sin conexión — los datos se guardan localmente', 'error');
    };

    // Listen for system theme changes
    const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e) => document.documentElement.classList.toggle('dark', e.matches);
    themeMedia.addEventListener('change', handleThemeChange);

    // Sistema de actualización automática de PWA
    const checkForUpdates = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) reg.update();
        });
      }
    };

    // Sistema de altura estable para móviles (evita brincos del menú)
    const updateHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('resize', updateHeight);
    window.addEventListener('focus', checkForUpdates);
    updateHeight();
    checkForUpdates();

    if (isOnline) {
      useStore.getState().fetchFromSupabase().then(() => {
        syncToSupabase();
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('focus', checkForUpdates);
      themeMedia.removeEventListener('change', handleThemeChange);
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
  const isBeto = currentUser?.name?.toLowerCase().includes('beto');
  const isChofer = currentUser?.role === 'chofer' || isBeto;
  const isHome = location.pathname === '/' || (!isAdmin && location.pathname === '/ventas') || (isChofer && location.pathname === '/entregas');
  const [showSettings, setShowSettings] = React.useState(false);
  const [showDriverMenu, setShowDriverMenu] = React.useState(false);
  const [modal, setModal] = React.useState(null); // { title, message, onConfirm }
  const [showChangePwd, setShowChangePwd] = React.useState(false);
  const [pwdForm, setPwdForm] = React.useState({ current: '', next: '', confirm: '' });
  const [pwdLoading, setPwdLoading] = React.useState(false);
  const { showToast, changePassword } = useStore();
  const { printer, setPrinter, isReconnecting, startAutoConnect } = useBTPrinter();

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
    openModal('Actualizar App', '¿Buscar actualizaciones y refrescar la aplicación?', doRefresh);
  };

  return (
    <div className="md:hidden flex-shrink-0 flex items-center justify-between glass border-b border-slate-200 dark:border-slate-800 px-4 h-[60px] no-print z-40 relative shadow-sm">
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
          className={`p-2 -ml-2 rounded-xl text-primary bg-primary/5 active:scale-90 transition-all`}
        >
          {isHome ? (isAdmin ? <LayoutGrid size={24} /> : <Menu size={24} />) : <ArrowLeft size={24} />}
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
              {!isBeto && (
                <button 
                  onClick={() => {
                    setShowDriverMenu(false);
                    navigate('/impresora');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="w-5 flex justify-center"><span className="material-symbols-outlined text-[18px] text-slate-400">print</span></div> Config. Impresora
                </button>
              )}
              <button
                onClick={() => {
                  setShowDriverMenu(false);
                  setPwdForm({ current: '', next: '', confirm: '' });
                  setShowChangePwd(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Settings size={18} className="text-slate-400" /> Cambiar Contraseña
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

      {/* Centro: nombre usuario */}
      <div className="flex flex-col items-center pointer-events-none">
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
        {!isBeto && (
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
        )}

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

      {/* Modal cambiar contraseña */}
      {showChangePwd && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1">Cambiar Contraseña</h3>
            <p className="text-xs text-slate-400 mb-5">Ingresa tu contraseña actual y la nueva</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contraseña actual</label>
                <input
                  type="password"
                  value={pwdForm.current}
                  onChange={e => setPwdForm(f => ({ ...f, current: e.target.value }))}
                  placeholder="••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-slate-800 dark:text-slate-100 font-bold text-base focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nueva contraseña</label>
                <input
                  type="password"
                  value={pwdForm.next}
                  onChange={e => setPwdForm(f => ({ ...f, next: e.target.value }))}
                  placeholder="••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-slate-800 dark:text-slate-100 font-bold text-base focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={pwdForm.confirm}
                  onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="••••"
                  className={`w-full bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl px-4 py-3 text-slate-800 dark:text-slate-100 font-bold text-base focus:outline-none transition-colors ${
                    pwdForm.confirm && pwdForm.confirm !== pwdForm.next
                      ? 'border-red-400 focus:border-red-400'
                      : 'border-slate-200 dark:border-slate-700 focus:border-primary'
                  }`}
                />
                {pwdForm.confirm && pwdForm.confirm !== pwdForm.next && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Las contraseñas no coinciden</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowChangePwd(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                disabled={!pwdForm.current || !pwdForm.next || pwdForm.next !== pwdForm.confirm || pwdLoading}
                onClick={async () => {
                  setPwdLoading(true);
                  const res = await changePassword(pwdForm.current, pwdForm.next);
                  setPwdLoading(false);
                  if (res.ok) {
                    showToast('Contraseña actualizada ✓', 'success');
                    setShowChangePwd(false);
                  } else {
                    showToast(res.msg, 'error');
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pwdLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
  const isChofer = currentUser?.role === 'chofer' || currentUser?.name?.toLowerCase().includes('beto');

  const navClass = "md:hidden fixed bottom-0 left-0 right-0 glass border-t border-slate-100 dark:border-slate-800 flex justify-around items-center px-4 z-50 select-none no-print shadow-[0_-8px_30px_rgba(0,0,0,0.08)]";
  const navStyle = { height: 'calc(65px + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' };

  if (isChofer) {
    return (
      <div className={navClass} style={navStyle}>
        <NavItem to="/entregas" icon={Truck} label="Entregas" active={isActive('/entregas')} />
        <NavItem to="/reportes" icon={Banknote} label="Reportes" active={isActive('/reportes')} />
      </div>
    );
  }

  return (
    <div className={navClass} style={navStyle}>
      <NavItem to="/" icon={ShoppingCart} label="Ventas" active={isActive('/') || isActive('/ventas')} />
      <NavItem to="/reportes" icon={Banknote} label="Reportes" active={isActive('/reportes')} />
      {isAdmin ? (
        <NavItem to="/menu" icon={LayoutGrid} label="Menú" active={isActive('/menu')} />
      ) : (
        <NavItem to="/entregas" icon={Truck} label="Entregas" active={isActive('/entregas')} />
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
  const { isOnline, isSyncing, products, users, clients, sales, inventory, deliveries, ticketConfig } = useStore();

  const pendingCount = React.useMemo(() => {
    const tables = [products, users, clients, sales, inventory, deliveries];
    let count = tables.reduce((acc, t) => acc + t.filter(i => !i.synced).length, 0);
    if (ticketConfig && !ticketConfig.synced) count++;
    return count;
  }, [products, users, clients, sales, inventory, deliveries, ticketConfig]);

  if (isOnline && !isSyncing && pendingCount === 0) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[35] w-max max-w-[90%] pointer-events-none animate-in slide-in-from-top-2 duration-500">
      <div className={`px-4 py-2 rounded-full shadow-lg border backdrop-blur-md flex items-center gap-2.5 text-[10px] font-black uppercase tracking-wider ${
        isOnline 
          ? 'bg-emerald-500/90 text-white border-emerald-400/30' 
          : 'bg-amber-500/90 text-white border-amber-400/30'
      }`}>
        {isOnline ? (
          <RefreshCw size={12} className="animate-spin" />
        ) : (
          <WifiOff size={12} className="animate-pulse" />
        )}
        
        <span className="truncate">
          {isOnline 
            ? `Sincronizando ${pendingCount > 0 ? `${pendingCount} cambios` : 'datos'}...` 
            : `Sin conexión · ${pendingCount > 0 ? `${pendingCount} pendientes` : 'modo local'}`
          }
        </span>
      </div>
    </div>
  );
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

const ChoferRoute = ({ children, currentUser }) => {
  const isChofer = currentUser?.role === 'chofer' || currentUser?.name?.toLowerCase().includes('beto');
  if (isChofer) {
    return <Navigate to="/entregas" replace />;
  }
  return children;
};

function App() {
  const { currentUser, isSyncing, initAuth } = useStore();

  useEffect(() => { initAuth(); }, []);

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
                  <Route path="/" element={<ChoferRoute currentUser={currentUser}><Sales /></ChoferRoute>} />
                  <Route path="/ventas" element={<ChoferRoute currentUser={currentUser}><Sales /></ChoferRoute>} />
                  <Route path="/reportes" element={<Reports />} />
                  <Route path="/entregas" element={<Entregas />} />
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
