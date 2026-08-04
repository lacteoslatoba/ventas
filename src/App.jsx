import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';

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

import NetworkIndicator from './components/NetworkIndicator';
import PrinterAutoConnect from './components/PrinterAutoConnect';
import MobileHeader from './components/MobileHeader';
import BottomNavigation from './components/BottomNavigation';
import InstallBanner from './components/InstallBanner';
import OfflineBanner from './components/OfflineBanner';
import GlobalConfirmDialog from './components/GlobalConfirmDialog';

const AdminRoute = ({ children, currentUser }) => {
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const { currentUser, isSyncing } = useStore();

  useEffect(() => { useStore.getState().initAuth(); }, []);

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
              <MobileHeader
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
