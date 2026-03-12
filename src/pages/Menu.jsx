import React from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Truck, DollarSign, FileText, LayoutList,
  Tags, ArrowRightLeft, Inbox, CalendarDays, Users, UserCircle,
  Palette, BarChart2, Factory, PlayCircle, Tag
} from 'lucide-react';

export default function Menu() {
  const navigate = useNavigate();
  const { currentUser, ticketConfig } = useStore();

  const menuItems = [
    { icon: DollarSign, label: 'Ventas', color: 'text-emerald-500', path: '/ventas' },
    { icon: Tag, label: 'Productos', color: 'text-orange-500', path: '/productos' },
    { icon: Users, label: 'Clientes', color: 'text-teal-600', path: '/clientes' },
    { icon: BarChart2, label: 'Reportes', color: 'text-blue-500', path: '/reportes' },
  ];

  return (
    <div className="bg-[#f6f6f8] dark:bg-slate-900 min-h-screen pb-24">
      <div className="p-4">
        {/* Header Profile Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200 font-bold text-lg border border-slate-200 dark:border-slate-600 shrink-0">
            {currentUser?.name?.charAt(0).toUpperCase() || 'M'}
          </div>
          <div className="flex flex-col truncate">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-[13px] uppercase truncate">{ticketConfig?.businessName || 'LACTEOS LA TOBA'}</h2>
            <p className="text-slate-400 text-xs font-medium uppercase truncate">{currentUser?.name || 'MIGUEL P'}</p>
          </div>
        </div>

        {/* Grid of Menus */}
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            // Solo marcar opacidad para los que no tienen path real
            const isPlaceholder = item.path === '#';
            return (
              <button
                key={index}
                onClick={() => {
                  if (!isPlaceholder) {
                    navigate(item.path);
                  } else {
                    alert('Esta sección estará disponible en futuras actualizaciones.');
                  }
                }}
                className={`bg-white dark:bg-slate-800 rounded-xl p-4 flex flex-col items-start gap-4 shadow-sm border border-slate-100 dark:border-slate-700 transition-all text-left active:scale-95 ${isPlaceholder ? 'opacity-60' : 'hover:shadow-md hover:border-slate-200'}`}
              >
                <Icon className={item.color} size={22} strokeWidth={2.5} />
                <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs leading-tight tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
