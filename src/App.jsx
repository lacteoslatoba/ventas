import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import { useBTPrinter } from './lib/useBTPrinter';

// Pages
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import UsersPage from './pages/Users';
import Clients from './pages/Clients';
import Sales from './pages/Sales';
import Entregas from './pages/Stock';
import Reports from './pages/Reports';
import Login from './pages/Login';
import PrinterSettings from './pages/PrinterSettings';
import TicketConfig from './pages/TicketConfig';
import MenuPage from './pages/Menu';

// Components
import Sidebar from './components/Sidebar';
import { MobileHeader, BottomNavigation } from './components/Navigation';
import { OfflineBanner, GlobalConfirmDialog, InstallBanner } from './components/FeedbackOverlay';

// ── Logic Components ──────────────────────────────────────────────────

const AppLogic = () => {
  const { isOnline, setOnlineStatus, syncToSupabase, fetchFromSupabase, showToast } = useStore();

  useEffect(() => {
    // Dark Mode Sync
    const updateTheme = (e) => document.documentElement.classList.toggle('dark', e ? e.matches : window.matchMedia('(prefers-color-scheme: dark)').matches);
    const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    updateTheme();
    themeMedia.addEventListener('change', updateTheme);

    const handleOnline = () => {
      setOnlineStatus(true);
      showToast('En línea — Sincronizando...', 'success');
      fetchFromSupabase().then(() => syncToSupabase(true));
    };
    const handleOffline = () => {
      setOnlineStatus(false);
      showToast('Modo Offline activado', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial Sync
    if (isOnline) {
      setTimeout(() => {
        useStore.getState().fetchFromSupabase().then(() => syncToSupabase());
      }, 1500);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      themeMedia.removeEventListener('change', updateTheme);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

const PrinterService = () => {
  useBTPrinter();
  return null;
};

// ── Routes & Protection ──────────────────────────────────────────────

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { currentUser } = useStore();
  if (!currentUser) return <Login />;
  if (adminOnly && currentUser.role !== 'admin') return <Navigate to="/" replace />;
  
  // Redirección especial para Choferes al entrar a la raíz
  const isChofer = currentUser.role === 'chofer' || currentUser.name?.toLowerCase().includes('beto');
  if (isChofer && window.location.pathname === '/') return <Navigate to="/entregas" replace />;
  
  return children;
};

// ── Main App ─────────────────────────────────────────────────────────

export default function App() {
  const { currentUser, isSyncing, initAuth } = useStore();

  useEffect(() => { initAuth(); }, [initAuth]);

  // Viewport Height Fix for Mobile
  useEffect(() => {
    const vh = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    window.addEventListener('resize', vh);
    vh();
    return () => window.removeEventListener('resize', vh);
  }, []);

  if (!currentUser) return <Login />;

  return (
    <Router>
      <AppLogic />
      <PrinterService />
      <GlobalConfirmDialog />
      <InstallBanner />
      
      <div 
        className="flex flex-col md:flex-row bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden font-sans text-slate-900 pt-safe pb-safe"
        style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
      >
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden h-full">
          <MobileHeader currentUser={currentUser} isSyncing={isSyncing} />
          <OfflineBanner />

          <main className="flex-1 overflow-hidden w-full relative">
            <div className="h-full overflow-y-auto pb-32 md:pb-8 custom-scrollbar">
              <Routes>
                {/* Public / Common Routes */}
                <Route path="/" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
                <Route path="/ventas" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
                <Route path="/reportes" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/entregas" element={<ProtectedRoute><Entregas /></ProtectedRoute>} />
                <Route path="/clientes" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                <Route path="/impresora" element={<ProtectedRoute><PrinterSettings /></ProtectedRoute>} />

                {/* Admin Only Routes */}
                <Route path="/menu" element={<ProtectedRoute adminOnly><MenuPage /></ProtectedRoute>} />
                <Route path="/productos" element={<ProtectedRoute adminOnly><Products /></ProtectedRoute>} />
                <Route path="/inventario" element={<ProtectedRoute adminOnly><Inventory /></ProtectedRoute>} />
                <Route path="/usuarios" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
                <Route path="/ticket" element={<ProtectedRoute adminOnly><TicketConfig /></ProtectedRoute>} />
                
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>

          <BottomNavigation currentUser={currentUser} />
        </div>
      </div>
    </Router>
  );
}
