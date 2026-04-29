import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Package, Calendar as CalendarIcon, Layers, Weight, DollarSign } from 'lucide-react';

export default function Stock() {
    const { sales, currentUser } = useStore();
    const today = new Date().toLocaleDateString('en-CA');
    const [selectedDate, setSelectedDate] = useState(today);

    const isAdmin = currentUser?.role === 'admin';

    const filteredSales = useMemo(() => {
        let result = sales.filter(s => {
            const saleDateLocal = new Date(s.date).toLocaleDateString('en-CA');
            return saleDateLocal === selectedDate;
        });
        if (!isAdmin) {
            result = result.filter(s => s.userId === currentUser?.id);
        }
        return result;
    }, [sales, selectedDate, isAdmin, currentUser]);

    // Agrupar por producto
    const productRows = useMemo(() => {
        const map = {};
        filteredSales.forEach(sale => {
            sale.items?.forEach(item => {
                const key = item.productId || item.name;
                if (!map[key]) {
                    map[key] = {
                        name: item.name,
                        unit: item.unit || 'u',
                        pieces: 0,
                        kg: 0,
                        money: 0,
                    };
                }
                const qty = Number(item.quantity) || 0;
                const pieces = Number(item.pieces) || 0;
                map[key].pieces += pieces;
                if ((item.unit || '').toLowerCase() === 'kg') {
                    map[key].kg += qty;
                }
                map[key].money += qty * (Number(item.price) || 0);
            });
        });
        return Object.values(map).sort((a, b) => b.money - a.money);
    }, [filteredSales]);

    const totals = useMemo(() => productRows.reduce(
        (acc, r) => ({ pieces: acc.pieces + r.pieces, kg: acc.kg + r.kg, money: acc.money + r.money }),
        { pieces: 0, kg: 0, money: 0 }
    ), [productRows]);

    const fechaLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto animate-in fade-in duration-300">

            {/* Header */}
            <div className="sticky top-0 z-40 bg-[#f6f6f8] dark:bg-[#101622] -mx-4 px-4 sm:-mx-8 sm:px-8 py-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/50 dark:border-slate-800/50">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Package size={22} strokeWidth={2.5} />
                    </div>
                    Stock del Día
                </h1>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2.5 px-4 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                    <CalendarIcon size={18} className="text-blue-500 dark:text-blue-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="bg-transparent border-none outline-none font-bold text-slate-700 dark:text-slate-200 py-0.5 text-sm cursor-pointer"
                    />
                </div>
            </div>

            {/* Tarjetas resumen */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center">
                    <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 mb-2">
                        <Layers size={18} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Piezas</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{totals.pieces}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center">
                    <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center text-emerald-600 mb-2">
                        <Weight size={18} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Kilos</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{totals.kg.toFixed(2)}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center">
                    <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center text-amber-600 mb-2">
                        <DollarSign size={18} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white">${totals.money.toFixed(0)}</p>
                </div>
            </div>

            {/* Tabla de productos */}
            {productRows.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
                    <Package size={40} className="mx-auto text-slate-200 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Sin ventas para el <span className="capitalize font-bold text-slate-700 dark:text-slate-200">{fechaLabel}</span></p>
                    {!isAdmin && <p className="text-xs text-slate-400 mt-1">Solo se muestran tus ventas personales.</p>}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">

                    {/* Encabezado tabla */}
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-14">Pzas</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-14">Kg</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-20">Importe</span>
                    </div>

                    {/* Filas */}
                    {productRows.map((row, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-3.5 items-center border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors"
                        >
                            <div>
                                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{row.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{row.unit}</p>
                            </div>
                            <div className="w-14 text-center">
                                <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                                    {row.pieces > 0 ? row.pieces : <span className="text-slate-300">—</span>}
                                </span>
                            </div>
                            <div className="w-14 text-center">
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                    {row.kg > 0 ? row.kg.toFixed(2) : <span className="text-slate-300">—</span>}
                                </span>
                            </div>
                            <div className="w-20 text-right">
                                <span className="text-sm font-black text-slate-800 dark:text-slate-100">${row.money.toFixed(2)}</span>
                            </div>
                        </div>
                    ))}

                    {/* Fila de totales */}
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-4 bg-slate-800 dark:bg-slate-900 items-center rounded-b-2xl">
                        <span className="text-xs font-black text-slate-300 uppercase tracking-widest">TOTALES</span>
                        <div className="w-14 text-center">
                            <span className="text-base font-black text-blue-300">{totals.pieces}</span>
                        </div>
                        <div className="w-14 text-center">
                            <span className="text-base font-black text-emerald-300">{totals.kg > 0 ? totals.kg.toFixed(2) : '—'}</span>
                        </div>
                        <div className="w-20 text-right">
                            <span className="text-base font-black text-white">${totals.money.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}

            {!isAdmin && productRows.length > 0 && (
                <p className="text-center text-xs text-slate-400 mt-4">Solo se muestran tus ventas personales en ruta.</p>
            )}
        </div>
    );
}
