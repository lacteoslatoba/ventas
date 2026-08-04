import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Banknote, LayoutGrid, Package } from 'lucide-react';

// Componente interno para botón de navegación
export const NavItem = ({ to, icon: Icon, label, active, onClick }) => { // eslint-disable-line no-unused-vars
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

export default BottomNavigation;
