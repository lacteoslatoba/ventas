import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Calendar as CalendarIcon, Droplet, BarChart3, Trash2 } from 'lucide-react';

const toLocalDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const todayStr = toLocalDate(new Date());

export default function DeliveryReport() {
    const { deliveries, currentUser, clients, deleteDelivery, showConfirm } = useStore();
    
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

            {/* ── FILTRO DE FECHAS COMPACTO ── */}
            <div className="mb-5 space-y-3">
                {/* Pills de acceso rápido */}
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                    {[
                        { label: 'Hoy', fn: () => { setFromDate(todayStr); setToDate(todayStr); } },
                        { label: '7 días', fn: () => { const d = new Date(); d.setDate(d.getDate()-6); setFromDate(toLocalDate(d)); setToDate(todayStr); } },
                        { label: 'Este mes', fn: () => { const n = new Date(); setFromDate(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`); setToDate(todayStr); } },
                        { label: 'Mes pasado', fn: () => { const n = new Date(); const y = n.getMonth()===0 ? n.getFullYear()-1 : n.getFullYear(); const m = n.getMonth()===0 ? 12 : n.getMonth(); const last = new Date(y, m, 0).getDate(); setFromDate(`${y}-${String(m).padStart(2,'0')}-01`); setToDate(`${y}-${String(m).padStart(2,'0')}-${last}`); } },
                    ].map(({ label, fn }) => (
                        <button
                            key={label}
                            onClick={fn}
                            className="shrink-0 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-[11px] uppercase tracking-widest hover:bg-primary hover:text-white active:scale-95 transition-all"
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Chips de fechas (tocan el input nativo) */}
                <div className="flex items-center gap-2">
                    <label className="relative flex-1">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Desde</span>
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 cursor-pointer hover:border-primary transition-colors">
                            <CalendarIcon size={13} className="text-primary shrink-0" />
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                                {new Date(fromDate + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </span>
                        </div>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                    </label>

                    <span className="text-slate-300 dark:text-slate-600 font-black text-lg mt-4">→</span>

                    <label className="relative flex-1">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Hasta</span>
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 cursor-pointer hover:border-primary transition-colors">
                            <CalendarIcon size={13} className="text-primary shrink-0" />
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                                {new Date(toDate + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </span>
                        </div>
                        <input
                            type="date"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                    </label>
                </div>
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
                    <div className="flex items-end gap-2 h-40 overflow-x-auto pb-2 scrollbar-none snap-x">
                        {chartData.map((d, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 snap-center group w-12 shrink-0">
                                <span className="text-[10px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                    {d.total}
                                </span>
                                <div className="w-8 bg-slate-100 dark:bg-slate-700 rounded-t-lg relative flex items-end overflow-hidden h-full">
                                    <div
                                        className="w-full rounded-t-lg transition-all duration-700"
                                        style={{ height: `${d.heightPercent}%`, backgroundColor: '#3b82f6' }}
                                    />
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">
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
