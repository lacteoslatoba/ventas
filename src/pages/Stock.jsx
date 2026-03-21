import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Package, Calendar as CalendarIcon, Layers, Weight } from 'lucide-react';

export default function Stock() {
    const { sales, currentUser } = useStore();
    // Default to today in local YYYY-MM-DD
    const today = new Date().toLocaleDateString('en-CA'); // en-CA formats to YYYY-MM-DD local time
    const [selectedDate, setSelectedDate] = useState(today);

    const isAdmin = currentUser?.role === 'admin';

    // Obtener ventas del día actual y del usuario (si no es admin)
    const filteredSales = useMemo(() => {
        let currentSales = sales.filter(s => {
            // Local date string from the sale ISO date
            const saleDateLocal = new Date(s.date).toLocaleDateString('en-CA');
            return saleDateLocal === selectedDate;
        });
        if (!isAdmin) {
            currentSales = currentSales.filter(s => s.userId === currentUser?.id);
        }
        return currentSales;
    }, [sales, selectedDate, isAdmin, currentUser]);

    // Calcular Totales Generales
    const { totalPieces, totalKg } = useMemo(() => {
        let pz = 0;
        let kg = 0;

        filteredSales.forEach(sale => {
            sale.items?.forEach(item => {
                const qty = Number(item.quantity) || 0;
                if (item.unit === 'Kg' || item.unit === 'kg') {
                    kg += qty;
                } else {
                    pz += qty;
                }
            });
        });

        return { totalPieces: pz, totalKg: kg };
    }, [filteredSales]);

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                        <Package size={26} strokeWidth={2.5} />
                    </div>
                    Stock del Día
                </h1>
                
                <div className="w-full sm:w-auto flex items-center gap-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-2.5 px-4 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                    <CalendarIcon size={22} className="text-blue-500" />
                    <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent border-none outline-none font-bold text-slate-700 py-1 text-base cursor-pointer w-full text-center"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-8 mb-8">
                {/* Total Piezas */}
                <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200/60 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="w-16 h-16 bg-blue-100/50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 z-10">
                        <Layers size={32} />
                    </div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 z-10">Piezas Vendidas</p>
                    <p className="text-5xl font-black text-slate-800 tracking-tighter mb-1 z-10">{totalPieces}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 z-10 bg-slate-50 px-3 py-1 rounded-full">PZ / UNIDADES</p>
                </div>

                {/* Total KG */}
                <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200/60 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-emerald-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="w-16 h-16 bg-emerald-100/50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 z-10">
                        <Weight size={32} />
                    </div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 z-10">Kilos Vendidos</p>
                    <p className="text-5xl font-black text-slate-800 tracking-tighter mb-1 z-10">{totalKg.toFixed(2)}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 z-10 bg-slate-50 px-3 py-1 rounded-full">KILOGRAMOS</p>
                </div>
            </div>

            <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-6 text-center border font-medium text-slate-500 border-slate-100">
                Resumen de ventas correspondientes al <strong className="text-slate-700 capitalize">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
                {!isAdmin && " (Muestra únicamente tus ventas personales en ruta)."}
            </div>
        </div>
    );
}
