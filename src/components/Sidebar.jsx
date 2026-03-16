import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, ShoppingCart, Banknote, LogOut, 
  Tag, Warehouse, Users, Store, Settings 
} from 'lucide-react';
import { useStore } from '../store';

const SidebarItem = ({ to, icon: IconComponent, label, active, onClick }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-primary text-white shadow-lg shadow-primary/30' 
        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary'
    }`}
  >
    <IconComponent size={20} strokeWidth={active ? 2.5 : 2} />
    <span className={`font-bold text-sm ${active ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
      {label}
    </span>
  </Link>
);

export default function Sidebar() {
  const location = useLocation();
  const { currentUser, logout, ticketConfig } = useStore();
  const isActive = (path) => location.pathname === path || (path === '/' && location.pathname === '/ventas');
  const isAdmin = currentUser?.role === 'admin';

  return (
    <aside className="hidden md:flex flex-col w-64 bg-cheese-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full p-4 no-print z-50">
      {/* Logo / Header */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <Store size={24} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-black tracking-tighter text-slate-800 dark:text-white leading-tight uppercase">
            {ticketConfig?.businessName || 'LA TOBA'}
          </h1>
          <span className="text-[10px] font-bold text-slate-400 leading-none">SISTEMA DE VENTAS</span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1">
        <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-2">Principal</p>
        
        <SidebarItem 
          to="/" 
          icon={ShoppingCart} 
          label="Vender" 
          active={isActive('/')} 
        />
        
        <SidebarItem 
          to="/reportes" 
          icon={Banknote} 
          label="Reportes" 
          active={isActive('/reportes')} 
        />

        {isAdmin && (
          <>
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-6">Administración</p>
            
            <SidebarItem 
              to="/productos" 
              icon={Tag} 
              label="Productos" 
              active={isActive('/productos')} 
            />
            
            <SidebarItem 
              to="/inventario" 
              icon={Warehouse} 
              label="Inventario" 
              active={isActive('/inventario')} 
            />
            
            <SidebarItem 
              to="/usuarios" 
              icon={Users} 
              label="Repartidores" 
              active={isActive('/usuarios')} 
            />
            
            <SidebarItem 
              to="/clientes" 
              icon={Store} 
              label="Clientes" 
              active={isActive('/clientes')} 
            />

            <SidebarItem 
              to="/ticket" 
              icon={LayoutGrid} 
              label="Config. Ticket" 
              active={isActive('/ticket')} 
            />
          </>
        )}

        <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-6">Sistema</p>
        <SidebarItem 
          to="/impresora" 
          icon={Settings} 
          label="Impresora" 
          active={isActive('/impresora')} 
        />
      </div>

      {/* User Footer */}
      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs uppercase">
            {currentUser?.name?.charAt(0)}
          </div>
          <div className="flex flex-col truncate">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{currentUser?.name}</p>
            <p className="text-[10px] font-medium text-slate-400 uppercase">{isAdmin ? 'Admin' : 'Repartidor'}</p>
          </div>
        </div>
        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-bold text-sm"
        >
          <LogOut size={20} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
