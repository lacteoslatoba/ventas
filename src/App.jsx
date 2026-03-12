import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, LayoutGrid, ShoppingCart, Banknote, LogOut } from 'lucide-react';
import { useStore } from './store';
import { autoConnectPrinter, getSavedPrinterName } from './lib/bluetoothPrinter';

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

// Componente para manejar reconexión de impresora usando un "User Gesture" (toque en pantalla)
const PrinterAutoConnect = () => {
  useEffect(() => {
    let attempts = 0;
    
    const tryAutoConnect = async () => {
      // Evitar reconectar si ya hay impresora
      if (window.__btPrinter) return;

      const savedName = getSavedPrinterName();
      if (!savedName) return;

      try {
        attempts++;
        const result = await autoConnectPrinter(savedName);
        if (result) {
          window.__btPrinter = result;
          console.log('Impresora reconectada automáticamente tras interacción:', result.device.name);
          
          result.device.addEventListener('gattserverdisconnected', () => {
            console.log('Impresora desconectada');
            window.__btPrinter = null;
          });
          
          // Limpiar eventos si ya conectó
          removeListeners();
        }
      } catch (err) {
        console.warn('No se pudo reconectar la impresora automáticamente:', err);
      }
    };

    const handleInteraction = () => {
      // Intentar una o dos veces al interactuar
      if (attempts < 2 && !window.__btPrinter) {
        tryAutoConnect();
      }
    };

    const removeListeners = () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction, { once: false });
    document.addEventListener('touchstart', handleInteraction, { once: false });

    // Intentar también automáticamente con delay por si el navegador lo permite
    const timer = setTimeout(tryAutoConnect, 1500);

    return () => {
      clearTimeout(timer);
      removeListeners();
    };
  }, []);

  return null;
};




const MobileHeader = ({ currentUser, isSyncing }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/' || (currentUser?.role !== 'admin' && location.pathname === '/ventas');

  return (
    <div className="md:hidden flex-shrink-0 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 no-print z-20">
      {/* Izquierda: Regresar o Hamburger */}
      <div className="w-10">
        {!isHome && (
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-xl text-primary bg-primary/5 active:scale-90 transition-all"
          >
            <ArrowLeft size={24} />
          </button>
        )}
      </div>

      {/* Centro: nombre usuario */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-0.5">
          {isHome ? 'Bienvenido' : 'Navegación'}
        </span>
        <h1 className="text-base font-black tracking-tight text-slate-800 dark:text-white leading-none">
          {isHome ? currentUser?.name?.split(' ')[0] : location.pathname.replace('/', '').toUpperCase()}
        </h1>
      </div>

      {/* Derecha: avatar + icono red */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs border border-primary/20 relative">
          {currentUser?.name?.charAt(0)}
          {isSyncing && (
            <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
              <RefreshCw size={10} className="animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BottomNavigation = ({ currentUser }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const logout = useStore(state => state.logout);

  // Componente interno para botón
  const NavItem = ({ to, icon: Icon, label, active, onClick }) => {
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

  return (
    <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 h-[68px] flex justify-around items-center z-30 shadow-[0_-8px_25px_rgba(0,0,0,0.05)] pb-safe select-none`}>
      <NavItem to="/menu" icon={LayoutGrid} label="Menú" active={isActive('/menu')} />
      
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
            <MobileHeader 
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

            {/* MENÚ INFERIOR */}
            <BottomNavigation currentUser={currentUser} />
          </div>
        </Router>
      )}
    </>
  );
}

export default App;
