import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Package, Calendar as CalendarIcon, Layers, Weight, DollarSign } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const toLocalDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const todayStr = toLocalDate(new Date());
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_SHORT = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

export default function Stock() {
    const { sales, currentUser, ticketConfig } = useStore();
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const now = new Date();
    const [calMonth, setCalMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });

    const isAdmin = currentUser?.role === 'admin';

    const filteredSales = useMemo(() => {
        let result = sales.filter(s => toLocalDate(s.date) === selectedDate);
        if (!isAdmin) result = result.filter(s => s.userId === currentUser?.id);
        return result;
    }, [sales, selectedDate, isAdmin, currentUser]);

    // Días con ventas (para el calendario)
    const daysWithSales = useMemo(() => {
        const set = new Set();
        const source = isAdmin ? sales : sales.filter(s => s.userId === currentUser?.id);
        source.forEach(s => { if (s?.date) set.add(toLocalDate(s.date)); });
        return set;
    }, [sales, isAdmin, currentUser]);

    // Agrupar por producto
    const productRows = useMemo(() => {
        const map = {};
        filteredSales.forEach(sale => {
            sale.items?.forEach(item => {
                const key = item.productId || item.name;
                if (!map[key]) map[key] = { name: item.name, unit: item.unit || 'u', pieces: 0, kg: 0, money: 0 };
                const qty = Number(item.quantity) || 0;
                map[key].pieces += Number(item.pieces) || 0;
                if ((item.unit || '').toLowerCase() === 'kg') map[key].kg += qty;
                map[key].money += qty * (Number(item.price) || 0);
            });
        });
        return Object.values(map).sort((a, b) => b.money - a.money);
    }, [filteredSales]);

    const totals = useMemo(() => productRows.reduce(
        (acc, r) => ({ pieces: acc.pieces + r.pieces, kg: acc.kg + r.kg, money: acc.money + r.money }),
        { pieces: 0, kg: 0, money: 0 }
    ), [productRows]);

    // Calendario
    const daysInMonth  = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
    const firstWeekDay = new Date(calMonth.year, calMonth.month, 1).getDay();
    const prevMonth = () => setCalMonth(p => p.month === 0 ? { year: p.year-1, month: 11 } : { ...p, month: p.month-1 });
    const nextMonth = () => setCalMonth(p => p.month === 11 ? { year: p.year+1, month: 0  } : { ...p, month: p.month+1 });

    const fechaLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto animate-in fade-in duration-300">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between border-b-2 border-gray-900 pb-4 mb-5">
                <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">{ticketConfig?.businessName || 'Lacteos La Toba'}</p>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mt-0.5">Registro del Día</h1>
                </div>
            </div>

            {/* ── MODO ADMIN: date input + tarjetas ── */}
            {isAdmin && (
                <>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2.5 px-4 mb-5 focus-within:ring-2 focus-within:ring-blue-500/20 self-start">
                        <CalendarIcon size={18} className="text-blue-500" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none outline-none font-bold text-slate-700 dark:text-slate-200 py-0.5 text-sm cursor-pointer"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center">
                            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-2"><Layers size={18} /></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Piezas</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-white">{totals.pieces}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center">
                            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-2"><Weight size={18} /></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Kilos</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-white">{totals.kg.toFixed(2)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center">
                            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-2"><DollarSign size={18} /></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white">${totals.money.toFixed(0)}</p>
                        </div>
                    </div>
                </>
            )}

            {/* ── MODO OPERADOR: calendario fijo ── */}
            {!isAdmin && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-3 mb-5">
                    {/* Nav mes */}
                    <div className="flex items-center justify-between mb-2">
                        <button onClick={prevMonth} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center active:scale-90 transition-all">
                            <ChevronLeft size={14} className="text-slate-500" />
                        </button>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100 capitalize">
                            {MONTHS[calMonth.month]} {calMonth.year}
                        </p>
                        <button onClick={nextMonth} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center active:scale-90 transition-all">
                            <ChevronRight size={14} className="text-slate-500" />
                        </button>
                    </div>

                    {/* Días de la semana */}
                    <div className="grid grid-cols-7 mb-1">
                        {DAYS_SHORT.map(d => (
                            <div key={d} className="text-center text-[9px] font-black text-slate-300 uppercase">{d}</div>
                        ))}
                    </div>

                    {/* Celdas */}
                    <div className="grid grid-cols-7 gap-y-0.5">
                        {Array.from({ length: firstWeekDay }).map((_, i) => <div key={`e${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dateStr = `${calMonth.year}-${String(calMonth.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                            const isSelected = dateStr === selectedDate;
                            const isToday    = dateStr === todayStr;
                            const hasSales   = daysWithSales.has(dateStr);
                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDate(dateStr)}
                                    className={`flex flex-col items-center justify-center w-full py-1.5 transition-all active:scale-90
                                        ${isSelected ? 'rounded-full bg-primary text-white shadow-sm shadow-primary/30'
                                        : isToday    ? 'rounded-xl ring-2 ring-primary/30 text-primary font-black'
                                        : 'rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                                >
                                    <span className={`text-[12px] font-black leading-none ${isSelected ? 'text-white' : ''}`}>{day}</span>
                                    {hasSales && (
                                        <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white/70' : 'bg-emerald-500'}`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── TABLA DE PRODUCTOS ── */}
            {productRows.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
                    <Package size={40} className="mx-auto text-slate-200 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium capitalize">{fechaLabel}</p>
                    <p className="text-xs text-slate-400 mt-1">Sin ventas registradas</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    {/* Encabezado */}
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-14">Pzas</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16">Kg</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-24">Importe</span>
                    </div>

                    {/* Filas */}
                    {productRows.map((row, i) => (
                        <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-3 items-center border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                            <div>
                                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{row.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{row.unit}</p>
                            </div>
                            <div className="w-14 text-center">
                                <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                                    {row.pieces > 0 ? row.pieces : <span className="text-slate-300">—</span>}
                                </span>
                            </div>
                            <div className="w-16 text-center">
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                    {row.kg > 0 ? row.kg.toFixed(2) : <span className="text-slate-300">—</span>}
                                </span>
                            </div>
                            <div className="w-24 text-right">
                                <span className="text-sm font-black text-slate-800 dark:text-slate-100">${row.money.toFixed(2)}</span>
                            </div>
                        </div>
                    ))}

                    {/* Totales */}
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-4 bg-slate-800 dark:bg-slate-900 rounded-b-2xl items-center">
                        <span className="text-xs font-black text-slate-300 uppercase tracking-widest">TOTALES</span>
                        <div className="w-14 text-center">
                            <span className="text-base font-black text-blue-300">{totals.pieces}</span>
                        </div>
                        <div className="w-16 text-center">
                            <span className="text-base font-black text-emerald-300">{totals.kg > 0 ? totals.kg.toFixed(2) : '—'}</span>
                        </div>
                        <div className="w-24 text-right">
                            <span className="text-base font-black text-white">${totals.money.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}

            {!isAdmin && productRows.length > 0 && (
                <p className="text-center text-xs text-slate-400 mt-4">Solo tus ventas personales · <span className="capitalize">{fechaLabel}</span></p>
            )}
        </div>
    );
}
