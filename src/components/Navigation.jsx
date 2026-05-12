import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, LayoutGrid, ShoppingCart, Banknote, LogOut, Settings, Users, Menu, Package, Truck, WifiOff } from 'lucide-react';
import { useStore } from '../store';
import { useBTPrinter } from '../lib/useBTPrinter';
import { getSavedPrinterName } from '../lib/bluetoothPrinter';

export const MobileHeader = ({ currentUser, isSyncing }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'admin';
  const isBeto = currentUser?.name?.toLowerCase().includes('beto');
  const isChofer = currentUser?.role === 'chofer' || isBeto;
  const isHome = location.pathname === '/' || (!isAdmin && location.pathname === '/ventas') || (isChofer && location.pathname === '/entregas');
  
  const [showDriverMenu, setShowDriverMenu] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [modal, setModal] = React.useState(null);
  const [showChangePwd, setShowChangePwd] = React.useState(false);
  const [pwdForm, setPwdForm] = React.useState({ current: '', next: '', confirm: '' });
  const [pwdLoading, setPwdLoading] = React.useState(false);
  
  const { showToast, changePassword, logout } = useStore();
  const { printer, isReconnecting, startAutoConnect } = useBTPrinter();

  const openModal = (title, message, onConfirm) => setModal({ title, message, onConfirm });
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
                onClick={() => { setShowDriverMenu(false); navigate('/clientes'); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Users size={18} className="text-slate-400" /> Clientes
              </button>
              {!isBeto && (
                <button 
                  onClick={() => { setShowDriverMenu(false); navigate('/impresora'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="w-5 flex justify-center"><span className="material-symbols-outlined text-[18px] text-slate-400">print</span></div> Config. Impresora
                </button>
              )}
              <button
                onClick={() => { setShowDriverMenu(false); setPwdForm({ current: '', next: '', confirm: '' }); setShowChangePwd(true); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Settings size={18} className="text-slate-400" /> Cambiar Contraseña
              </button>
              <button
                onClick={() => { setShowDriverMenu(false); handleRefresh(); }}
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
        {!isBeto && (
          <button
            onClick={() => {
              if (printer) { navigate('/impresora'); return; }
              if (isReconnecting) return;
              if (getSavedPrinterName()) startAutoConnect();
              else navigate('/impresora');
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all"
          >
            <span className={`material-symbols-outlined text-xl ${
              printer ? 'text-emerald-500' : isReconnecting ? 'text-amber-400 animate-pulse' : 'text-slate-300'
            }`}>
              {printer ? 'print' : isReconnecting ? 'bluetooth_searching' : 'print_disabled'}
            </span>
          </button>
        )}

        <button
          onClick={() => openModal('Cerrar sesión', '¿Seguro que deseas salir?', logout)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-red-500 active:scale-95 transition-all"
        >
          <LogOut size={22} />
        </button>

        {isAdmin && (
          <button 
            onClick={handleRefresh}
            className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 active:scale-95 transition-all"
          >
            <span className={`material-symbols-outlined text-2xl ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
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

        {showSettings && isAdmin && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
            <div className="absolute right-0 top-12 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
              <button 
                onClick={() => { setShowSettings(false); navigate('/impresora'); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-lg text-blue-600">print</span> Conexión Impresora
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modals are kept in App.jsx for global consistency or moved here if they are header-specific */}
      {/* Actually, keeping the modals in the common parent is better, but since these are triggered by header, I'll keep them here for now */}
      {showChangePwd && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6">
            <h3 className="text-base font-black mb-1">Cambiar Contraseña</h3>
            <div className="space-y-3 mt-4">
              <input type="password" value={pwdForm.current} onChange={e => setPwdForm(f => ({ ...f, current: e.target.value }))} placeholder="Actual" className="w-full bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl px-4 py-3" />
              <input type="password" value={pwdForm.next} onChange={e => setPwdForm(f => ({ ...f, next: e.target.value }))} placeholder="Nueva" className="w-full bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl px-4 py-3" />
              <input type="password" value={pwdForm.confirm} onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Confirmar" className="w-full bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl px-4 py-3" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowChangePwd(false)} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 font-black">Cancelar</button>
              <button 
                onClick={async () => {
                  setPwdLoading(true);
                  const res = await changePassword(pwdForm.current, pwdForm.next);
                  setPwdLoading(false);
                  if (res.ok) { showToast('Actualizada ✓', 'success'); setShowChangePwd(false); }
                  else showToast(res.msg, 'error');
                }}
                className="flex-1 py-3 rounded-2xl bg-primary text-white font-black"
              >
                {pwdLoading ? '...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6">
            <h3 className="text-base font-black mb-1">{modal.title}</h3>
            <p className="text-sm text-slate-500 mb-6">{modal.message}</p>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 font-black">Cancelar</button>
              <button onClick={() => { closeModal(); modal.onConfirm(); }} className="flex-1 py-3 rounded-2xl bg-primary text-white font-black">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NavItem = ({ to, icon, label, active }) => {
  const Icon = icon;
  return (
  <Link to={to} className={`flex flex-col items-center justify-center gap-1 w-20 pt-1 pb-1 transition-colors ${active ? 'text-primary' : 'text-slate-500'}`}>
    <Icon size={22} fill={active ? "currentColor" : "none"} />
    <span className="text-[10px] font-black uppercase tracking-tight mt-1">{label}</span>
  </Link>
  );
};

export const BottomNavigation = ({ currentUser }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const isAdmin = currentUser?.role === 'admin';
  const isChofer = currentUser?.role === 'chofer' || currentUser?.name?.toLowerCase().includes('beto');

  const navClass = "md:hidden fixed bottom-0 left-0 right-0 glass border-t border-slate-100 dark:border-slate-800 flex justify-around items-center px-4 z-50 no-print shadow-[0_-8px_30px_rgba(0,0,0,0.08)]";
  const navStyle = { height: 'calc(65px + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' };

  return (
    <div className={navClass} style={navStyle}>
      <NavItem to={isChofer ? "/entregas" : "/ventas"} icon={isChofer ? Truck : ShoppingCart} label={isChofer ? "Entregas" : "Ventas"} active={isActive('/') || isActive('/ventas') || isActive('/entregas')} />
      <NavItem to="/reportes" icon={Banknote} label="Reportes" active={isActive('/reportes')} />
      {isAdmin ? (
        <NavItem to="/menu" icon={LayoutGrid} label="Menú" active={isActive('/menu')} />
      ) : (
        <NavItem to="/clientes" icon={Users} label="Clientes" active={isActive('/clientes')} />
      )}
    </div>
  );
};
