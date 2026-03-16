import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, LayoutGrid, ShoppingCart, Banknote, LogOut, Settings } from 'lucide-react';
import { useStore } from './store';
import { useBTPrinter } from './lib/useBTPrinter';

import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import UsersPage from './pages/Users';
import Clients from './pages/Clients';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Login from './pages/Login';
import PrinterSettings from './pages/PrinterSettings';
import TicketConfig from './pages/TicketConfig';
import Sidebar from './components/Sidebar';
import MenuPage from './pages/Menu';

const NetworkIndicator = () => {
  const { isOnline, setOnlineStatus, syncToSupabase } = useStore();

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      syncToSupabase();
    };
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Al iniciar, tratamos de bajar primero el catálogo oficial y luego subir lo pendiente
    if (isOnline) {
      useStore.getState().fetchFromSupabase().then(() => {
        syncToSupabase();
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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

  return (
    <div className="md:hidden flex-shrink-0 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 no-print z-40 relative">
      {/* Izquierda: Regresar o Hamburger/Menú */}
      <div className="w-10">
        <button 
          onClick={() => {
            if (isHome) {
              if (isAdmin) navigate('/menu');
            } else {
              navigate(-1);
            }
          }} 
          className={`p-2 -ml-2 rounded-xl text-primary bg-primary/5 active:scale-90 transition-all ${(isHome && !isAdmin) ? 'opacity-0 pointer-events-none' : ''}`}
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* Centro: nombre usuario */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-0.5">
          {isHome ? 'Bienvenido' : 'Navegación'}
        </span>
        <h1 className="text-base font-black tracking-tight text-slate-800 dark:text-white leading-none">
          {isHome ? currentUser?.name?.split(' ')[0] : location.pathname.substring(1).toUpperCase()}
        </h1>
      </div>

      {/* Derecha: Configuración */}
      <div className="flex items-center gap-2 relative">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-all"
        >
          <Settings size={22} className={showSettings ? 'rotate-90' : ''} />
          {isSyncing && (
            <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
              <RefreshCw size={10} className="animate-spin text-primary" />
            </div>
          )}
        </button>

        {/* Dropdown de Ajustes */}
        {showSettings && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
            <div className="absolute right-0 top-12 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
              <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-700 mb-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentUser?.name}</p>
                <p className="text-[9px] font-bold text-primary uppercase">{isAdmin ? 'Administrador' : 'Repartidor'}</p>
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
    </div>
  );
};

// Componente interno para botón
// eslint-disable-next-line no-unused-vars
const NavItem = ({ to, icon: IconComponent, label, active, onClick }) => {
  const content = (
    <div className={`flex flex-col items-center justify-center gap-1 w-20 pt-1 pb-1 transition-colors ${active ? 'text-primary' : 'text-slate-500'}`}>
      <IconComponent size={22} fill={active ? "currentColor" : "none"} strokeWidth={2} />
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
  const logout = useStore(state => state.logout);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 h-[68px] flex justify-around items-center z-30 shadow-[0_-8px_25px_rgba(0,0,0,0.05)] pb-safe select-none`}>
      {isAdmin && (
        <NavItem to="/menu" icon={LayoutGrid} label="Menú" active={isActive('/menu')} />
      )}
      
      <NavItem to="/" icon={ShoppingCart} label="Vender" active={isActive('/') || isActive('/ventas')} />
      
      <NavItem to="/reportes" icon={Banknote} label="Reportes" active={isActive('/reportes')} />

      <NavItem 
        onClick={() => logout()} 
        icon={LogOut} 
        label="Salir" 
        active={false} 
      />
    </div>
  );
};

const MobileHeaderWrapper = ({ currentUser, isSyncing }) => {
  const location = useLocation();
  const navigate = useNavigate();
  return <MobileHeader currentUser={currentUser} isSyncing={isSyncing} location={location} navigate={navigate} />;
};

function App() {
  const { currentUser, isSyncing } = useStore();

  // Ya no se fuerza Fullscreen porque el usuario prefiere su barra de navegación y para evitar bugs de teclado en Android.

  return (
    <>
      <NetworkIndicator />
      {!currentUser ? (
        <Login />
      ) : (
        <Router>
          <PrinterAutoConnect />
          <div className="flex flex-col md:flex-row h-screen bg-[#f6f6f8] dark:bg-[#101622] overflow-hidden font-sans text-slate-900">
            <Sidebar />
            
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
              <MobileHeaderWrapper 
                currentUser={currentUser} 
                isSyncing={isSyncing} 
              />





            <main className="flex-1 overflow-x-hidden w-full relative h-[calc(100dvh-64px)] md:h-screen scroll-smooth">
              <div className="h-full overflow-y-auto pb-24 md:pb-8 relative custom-scrollbar">
                <Routes>
                  <Route path="/" element={<Sales />} />
                  <Route path="/menu" element={<MenuPage />} />
                  <Route path="/ventas" element={<Sales />} />
                  <Route path="/productos" element={<Products />} />
                  <Route path="/inventario" element={<Inventory />} />
                  <Route path="/usuarios" element={<UsersPage />} />
                  <Route path="/clientes" element={<Clients />} />
                  <Route path="/reportes" element={<Reports />} />
                  <Route path="/impresora" element={<PrinterSettings />} />
                  <Route path="/ticket" element={<TicketConfig />} />
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
