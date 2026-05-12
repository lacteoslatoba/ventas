import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Droplet, BarChart3, Trash2 } from 'lucide-react';
import ModernDatePicker from '../components/Calendar';

const toLocalDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const todayStr = toLocalDate(new Date());

export default function DeliveryReport() {
    const { deliveries, currentUser, deleteDelivery, showConfirm } = useStore();
    
    // Filtro por defecto: de inicio de mes a hoy
    const defaultStart = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-01`;
    const [fromDate, setFromDate] = useState(defaultStart);
    const [toDate, setToDate] = useState(todayStr);

    const currentUserId = currentUser?.id;

    // Entregas filtradas para el rango y usuario actual (Beto)
    const filteredDeliveries = useMemo(() => {
        return deliveries.filter(d => {
            if (d.userId !== currentUserId) return false;
            if (!d.date) return false;
            return d.date >= fromDate && d.date <= toDate;
        }).sort((a, b) => a.date.localeCompare(b.date));
    }, [deliveries, currentUserId, fromDate, toDate]);

    // Calcular el total
    const totalLitros = useMemo(() => {
        return filteredDeliveries.reduce((sum, d) => sum + (Number(d.litrosPurificados) || 0), 0);
    }, [filteredDeliveries]);

    // Agrupar por fecha para la gráfica de barras
    const chartData = useMemo(() => {
        const grouped = {};
        filteredDeliveries.forEach(d => {
            if (!grouped[d.date]) grouped[d.date] = 0;
            grouped[d.date] += (Number(d.litrosPurificados) || 0);
        });

        // Convertir a array y ordenar
        const arr = Object.entries(grouped)
            .map(([date, total]) => ({ date, total }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const maxTotal = Math.max(...arr.map(a => a.total), 1); // evitar div por 0

        return arr.map(a => ({
            ...a,
            heightPercent: (a.total / maxTotal) * 100,
            formattedDate: new Date(a.date + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
        }));
    }, [filteredDeliveries]);

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto animate-in fade-in duration-300">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-4 mb-5">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">Mis Reportes</h1>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">Total de litros entregados</p>
                </div>
            </div>

            {/* ── FILTRO DE FECHAS ── */}
            <div className="flex items-center gap-4 mb-6">
                <ModernDatePicker 
                    label="Desde" 
                    value={fromDate} 
                    onChange={setFromDate} 
                />
                <div className="mt-5 hidden sm:block">
                    <span className="text-slate-300 dark:text-slate-600 font-black text-lg">→</span>
                </div>
                <ModernDatePicker 
                    label="Hasta" 
                    value={toDate} 
                    onChange={setToDate} 
                />
            </div>

            {/* ── TOTAL DE LITROS ── */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-inner">
                    <Droplet size={30} strokeWidth={2.5} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Entregado</p>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-black text-slate-800 dark:text-slate-100 leading-none tracking-tighter">{totalLitros}</span>
                        <span className="text-sm font-bold text-slate-500">Litros</span>
                    </div>
                </div>
            </div>

            {/* ── GRÁFICA DE BARRAS ── */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 mb-5">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                    <BarChart3 size={16} className="text-primary" /> 
                    Gráfica de Entregas Diarias
                </h3>
                
                {chartData.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                        Sin entregas en este rango
                    </div>
                ) : (
                    <div className="flex items-end gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {chartData.map((d, i) => (
                            <div key={i} className="flex flex-col items-center shrink-0" style={{ width: '36px' }}>
                                <span className="text-[9px] font-black text-blue-700 mb-1 leading-none">
                                    {d.total}
                                </span>
                                <div className="relative overflow-hidden rounded-md w-5" style={{ height: '90px', backgroundColor: '#cbd5e1' }}>
                                    <div
                                        className="absolute bottom-0 left-0 right-0 rounded-md transition-all duration-700"
                                        style={{ height: `${d.heightPercent}%`, backgroundColor: '#1d4ed8' }}
                                    />
                                </div>
                                <span className="text-[8px] font-bold text-slate-400 uppercase mt-1 text-center leading-tight">
                                    {d.formattedDate}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── LISTA DE ENTREGAS DEL PERÍODO ── */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-24">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 p-5 pb-3 border-b border-slate-100 dark:border-slate-800/50">
                    Desglose
                </h3>
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {filteredDeliveries.map(d => (
                        <div key={d.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div>
                                <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                                    {d.clientName || 'General'}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {new Date(d.date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <p className="text-base font-black text-primary">{d.litrosPurificados || 0} L</p>
                                <button
                                    onClick={() => showConfirm({
                                        message: '¿Eliminar este registro de entrega?',
                                        confirmText: 'Eliminar', danger: true,
                                        onConfirm: () => deleteDelivery(d.id),
                                    })}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90 transition-all"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredDeliveries.length === 0 && (
                        <div className="p-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            No hay entregas detalladas
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
