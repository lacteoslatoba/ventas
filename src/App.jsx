import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Warehouse, Users, Store, ShoppingCart, FileBarChart, Menu, X, Cloud, RefreshCw, PrinterIcon, FileText, Settings2, LogOut, Bluetooth, ArrowLeft } from 'lucide-react';
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

// Componente para manejar reconexión de impresora una vez logueado
const PrinterAutoConnect = () => {
  useEffect(() => {
    const tryAutoConnect = async () => {
      if (window.__btPrinter) return;

      const savedName = getSavedPrinterName();
      if (!savedName) return;

      try {
        const result = await autoConnectPrinter(savedName);
        if (result) {
          window.__btPrinter = result;
          console.log('Impresora reconectada automáticamente tras login:', result.device.name);
          
          result.device.addEventListener('gattserverdisconnected', () => {
            window.__btPrinter = null;
          });
        }
      } catch (err) {
        console.warn('No se pudo reconectar la impresora automáticamente:', err);
      }
    };

    const timer = setTimeout(tryAutoConnect, 1500);
    return () => clearTimeout(timer);
  }, []);

  return null;
};


const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const navGroups = [
    {
      label: 'Operación',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Venta Rápida', path: '/ventas', icon: ShoppingCart },
        { name: 'Reportes', path: '/reportes', icon: FileBarChart },
        { name: 'Clientes', path: '/clientes', icon: Store },
      ],
    },
    {
      label: 'Inventario',
      items: [
        { name: 'Productos', path: '/productos', icon: Package },
        { name: 'Inventario', path: '/inventario', icon: Warehouse },
        { name: 'Repartidores', path: '/usuarios', icon: Users },
      ],
    },
    {
      label: 'Configuración',
      items: [
        { name: 'Impresora BT', path: '/impresora', icon: PrinterIcon },
        { name: 'Config. Ticket', path: '/ticket', icon: FileText },
      ],
    },
  ];

  const handleLinkClick = () => setIsOpen(false);

  const { currentUser, isSyncing } = useStore();
  if (!currentUser || currentUser.role !== 'admin') return null;

  return (
    <>
      {/* Black Overlay for Mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <nav className={`
        fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-40
        w-[280px] md:w-64 bg-white text-slate-800 h-full no-print flex flex-col shadow-2xl md:shadow-none border-r border-slate-200
      `}>
        <div className="flex items-center justify-between md:justify-center h-16 md:h-20 px-4 md:px-0 border-b border-slate-100 bg-white">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-primary flex items-center gap-2 md:gap-3">
            QuesoApp
            {isSyncing && <RefreshCw size={16} className="animate-spin text-slate-400" />}
          </h1>
          <button onClick={() => setIsOpen(false)} className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 px-4 mb-1">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={handleLinkClick}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium ${isActive
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                      <Icon size={18} className={isActive ? 'text-primary' : 'text-slate-400'} />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* PWA Install Button Prompter */}
        {deferredPrompt && (
          <div className="p-4 border-t border-slate-100 bg-white">
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all text-sm"
            >
              <Cloud size={18} />
              Instalar App
            </button>
          </div>
        )}
        <div className="p-4 border-t border-slate-100 bg-white mt-auto">
          <button
            onClick={() => useStore.getState().logout()}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl active:scale-95 transition-all text-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>
    </>
  );
};

const MobileHeader = ({ currentUser, isSyncing, setIsSidebarOpen, setIsConfigOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/' || (currentUser?.role !== 'admin' && location.pathname === '/ventas');

  return (
    <div className="md:hidden flex-shrink-0 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 no-print z-20">
      {/* Izquierda: Regresar o Hamburger */}
      <div className="w-10">
        {!isHome ? (
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-xl text-primary bg-primary/5 active:scale-90 transition-all"
          >
            <ArrowLeft size={24} />
          </button>
        ) : (
          currentUser?.role === 'admin' ? (
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors active:scale-95">
              <Menu size={24} />
            </button>
          ) : null
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

      {/* Derecha: avatar + botón configuración */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs border border-primary/20 relative">
          {currentUser?.name?.charAt(0)}
          {isSyncing && (
            <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
              <RefreshCw size={10} className="animate-spin text-primary" />
            </div>
          )}
        </div>
        <button
          onClick={() => setIsConfigOpen(true)}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 active:scale-90 transition-all font-black"
        >
          <Settings2 size={16} />
        </button>
      </div>
    </div>
  );
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const { currentUser, isSyncing } = useStore();

  // Forzar Fullscreen al primer toque si es PWA
  useEffect(() => {
    const enableFullscreen = () => {
      if (!document.fullscreenElement && (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches)) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    window.addEventListener('click', enableFullscreen, { once: true });
    return () => window.removeEventListener('click', enableFullscreen);
  }, []);

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
              setIsSidebarOpen={setIsSidebarOpen} 
              setIsConfigOpen={setIsConfigOpen} 
            />

            {/* SHEET FLOTANTE DE CONFIGURACIÓN */}
            {isConfigOpen && (
              <div
                className="md:hidden fixed inset-0 z-50 flex items-end"
                onClick={() => setIsConfigOpen(false)}
              >
                {/* Overlay */}
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                {/* Panel */}
                <div
                  className="relative w-full bg-white rounded-t-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Handle */}
                  <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />

                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-black text-slate-800 text-lg tracking-tight">Configuración</h2>
                    <button onClick={() => setIsConfigOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <Link
                      to="/impresora"
                      onClick={() => setIsConfigOpen(false)}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-primary transition-all active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Bluetooth size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Impresora Bluetooth</p>
                        <p className="text-xs text-slate-400 font-medium">Conectar impresora térmica</p>
                      </div>
                    </Link>

                    <Link
                      to="/clientes"
                      onClick={() => setIsConfigOpen(false)}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-primary transition-all active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-cheese-100 flex items-center justify-center">
                        <Store size={20} className="text-cheese-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Alta de Clientes</p>
                        <p className="text-xs text-slate-400 font-medium">Registrar nuevo local o tienda</p>
                      </div>
                    </Link>

                    {currentUser?.role === 'admin' && (
                      <Link
                        to="/ticket"
                        onClick={() => setIsConfigOpen(false)}
                        className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-primary transition-all active:scale-[0.98]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                          <FileText size={20} className="text-violet-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">Configurar Ticket</p>
                          <p className="text-xs text-slate-400 font-medium">Encabezado, pie de página y más</p>
                        </div>
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <button
                      onClick={() => useStore.getState().logout()}
                      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 transition-all active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                        <LogOut size={20} className="text-red-500" />
                      </div>
                      <p className="font-bold text-sm">Cerrar Sesión</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <main className="flex-1 overflow-x-hidden w-full relative h-[calc(100dvh-64px)] md:h-screen scroll-smooth">
              <div className="h-full overflow-y-auto pb-24 md:pb-8 relative custom-scrollbar">
                <Routes>
                  <Route path="/" element={currentUser.role === 'admin' ? <Dashboard /> : <Sales />} />
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
            <div className={`${currentUser?.role === 'admin' ? 'md:hidden' : ''} fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 px-6 py-2 flex justify-between items-center z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]`}>
              <Link to="/ventas" className="flex flex-col items-center gap-1 text-slate-400 focus:text-primary active:text-primary transition-colors">
                <ShoppingCart size={20} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Venta</span>
              </Link>
              <Link to="/reportes" className="flex flex-col items-center gap-1 text-slate-400 focus:text-primary active:text-primary transition-colors">
                <FileBarChart size={20} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Reportes</span>
              </Link>
              {currentUser?.role === 'admin' ? (
                <button onClick={() => setIsSidebarOpen(true)} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors">
                  <Menu size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Más</span>
                </button>
              ) : (
                <button onClick={() => useStore.getState().logout()} className="flex flex-col items-center gap-1 text-slate-400 focus:text-red-500 transition-colors">
                  <RefreshCw size={20} className="rotate-45" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Salir</span>
                </button>
              )}
            </div>
          </div>
        </Router>
      )}
    </>
  );
}

export default App;
