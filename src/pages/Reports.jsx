import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { printTicket } from '../lib/bluetoothPrinter';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const toLocalDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const todayStr = toLocalDate(new Date());
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_SHORT = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

export default function Reports() {
    const { sales, users, clients, currentUser, ticketConfig, showToast, showConfirm, clearAllSales } = useStore();
    const [filterUser, setFilterUser] = useState('');
    const [repDateFilter, setRepDateFilter] = useState('');
    const [selectedSale, setSelectedSale] = useState(null);
    const [btPrinting, setBtPrinting] = useState(false);

    const now = new Date();
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [calMonth, setCalMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });

    const isAdmin = currentUser?.role === 'admin';
    const effectiveFilterUser = isAdmin ? filterUser : currentUser?.id;

    const userSales = effectiveFilterUser
        ? (sales || []).filter(s => s?.userId === effectiveFilterUser)
        : (sales || []);

    const daysWithSales = useMemo(() => {
        const s = new Set();
        userSales.forEach(sale => { if (sale?.date) s.add(toLocalDate(sale.date)); });
        return s;
    }, [sales, effectiveFilterUser]);

    const daySales = isAdmin
        ? userSales.filter(s => s?.date && toLocalDate(s.date) === selectedDate)
        : repDateFilter
            ? userSales.filter(s => s?.date && toLocalDate(s.date) === repDateFilter)
            : userSales;

    const sortedSales = [...daySales].reverse();

    const dayTotal = daySales.reduce((s, sale) => s + (Number(sale?.total) || 0), 0);
    const dayCount = daySales.length;

    const productMap = {};
    daySales.forEach(sale => {
        (sale?.items || []).forEach(it => {
            if (!it.name) return;
            if (!productMap[it.name]) productMap[it.name] = { qty: 0, pieces: 0, money: 0, unit: it.unit || 'u' };
            productMap[it.name].qty    += (Number(it.quantity) || 0);
            productMap[it.name].pieces += (Number(it.pieces)   || 0);
            productMap[it.name].money  += (Number(it.quantity) || 0) * (Number(it.price) || 0);
        });
    });
    const productTotals = Object.entries(productMap).sort((a, b) => b[1].money - a[1].money);
    const grandTotalPieces = productTotals.reduce((s, [, v]) => s + v.pieces, 0);
    const grandTotalQty    = productTotals.reduce((s, [, v]) => s + v.qty, 0);
    const grandTotalMoney  = productTotals.reduce((s, [, v]) => s + v.money, 0);

    // Calendar
    const daysInMonth   = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
    const firstWeekDay  = new Date(calMonth.year, calMonth.month, 1).getDay();
    const prevMonth = () => setCalMonth(p => p.month === 0 ? { year: p.year-1, month: 11 } : { ...p, month: p.month-1 });
    const nextMonth = () => setCalMonth(p => p.month === 11 ? { year: p.year+1, month: 0 } : { ...p, month: p.month+1 });

    const handleBTPrint = async (sale) => {
        const btPrinter = window.__btPrinter;
        if (!btPrinter) return;
        setBtPrinting(true);
        try {
            const user   = sale.userId === 'admin' ? { name: 'Administrador' } : users.find(u => u.id === sale.userId);
            const client = clients.find(c => c.id === sale.clientId) || { name: 'General' };
            await printTicket({ ticket: sale, user, client, isReprint: true, characteristic: btPrinter.characteristic, config: ticketConfig });
        } catch { showToast('No se pudo imprimir. Verifica la conexión.', 'error'); }
        finally { setBtPrinting(false); }
    };

    // Format selected date for display
    const selDateObj = new Date(selectedDate + 'T12:00:00');
    const selDateLabel = selDateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="min-h-screen bg-transparent">

            {/* ── HEADER ── */}
            <div className="px-4 pt-5 pb-3 md:px-8 flex items-center justify-between">
                <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">Sistema de ventas</p>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">Reporte de Ventas</h1>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => showConfirm({
                            message: '¿Vaciar TODAS las ventas? Esta acción no se puede deshacer.',
                            confirmText: 'Vaciar todo', danger: true,
                            onConfirm: async () => { await clearAllSales(); showToast('Ventas eliminadas', 'success'); },
                        })}
                        className="w-9 h-9 bg-red-50 border border-red-100 text-red-400 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                        title="Vaciar todas las ventas"
                    >
                        <span className="material-symbols-outlined" style={{fontSize:18}}>delete_sweep</span>
                    </button>
                )}
            </div>

            {/* ── BLOQUE EXCLUSIVO ADMIN ── */}
            {isAdmin && (
                <div className="px-4 md:px-8 space-y-3 mb-2">

                    {/* Selector de repartidor — pills */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setFilterUser('')}
                            className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${!filterUser ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-white border border-slate-200 text-slate-500'}`}
                        >
                            Todos
                        </button>
                        {users.filter(u => u.pin && (u.name || '').toLowerCase() !== 'administrador').map(u => (
                            <button
                                key={u.id}
                                onClick={() => setFilterUser(u.id)}
                                className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${filterUser === u.id ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-white border border-slate-200 text-slate-500'}`}
                            >
                                {u.name.split(' ')[0]}
                            </button>
                        ))}
                    </div>

                    {/* ── CALENDARIO ── */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3">
                        {/* Nav mes */}
                        <div className="flex items-center justify-between mb-2">
                            <button onClick={prevMonth} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
                                <ChevronLeft size={14} className="text-slate-500" />
                            </button>
                            <p className="text-xs font-black text-slate-800 capitalize">
                                {MONTHS[calMonth.month]} {calMonth.year}
                            </p>
                            <button onClick={nextMonth} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
                                <ChevronRight size={14} className="text-slate-500" />
                            </button>
                        </div>

                        {/* Días de semana */}
                        <div className="grid grid-cols-7 mb-1">
                            {DAYS_SHORT.map(d => (
                                <div key={d} className="text-center text-[9px] font-black text-slate-300 uppercase">{d}</div>
                            ))}
                        </div>

                        {/* Celdas del mes */}
                        <div className="grid grid-cols-7 gap-y-0.5">
                            {Array.from({ length: firstWeekDay }).map((_, i) => (
                                <div key={`e${i}`} />
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day  = i + 1;
                                const dateStr = `${calMonth.year}-${String(calMonth.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                                const isSelected = dateStr === selectedDate;
                                const isToday    = dateStr === todayStr;
                                const hasSales   = daysWithSales.has(dateStr);

                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDate(dateStr)}
                                        className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all active:scale-90
                                            ${isSelected ? 'bg-primary text-white shadow-sm shadow-primary/30'
                                            : isToday    ? 'ring-2 ring-primary/30 text-primary font-black'
                                            : 'hover:bg-slate-50 text-slate-700'}`}
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

                    {/* ── STATS DEL DÍA ── */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-3 shadow-md shadow-emerald-500/20">
                            <p className="text-[8px] font-black text-emerald-100 uppercase tracking-widest mb-1">Total del día</p>
                            <p className="text-xl font-black text-white leading-none">${dayTotal.toFixed(2)}</p>
                            <p className="text-[9px] text-emerald-200 font-bold mt-0.5 capitalize truncate">{selDateLabel}</p>
                        </div>
                        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Transacciones</p>
                            <p className="text-xl font-black text-slate-800 leading-none">{dayCount}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">{dayCount === 1 ? 'venta registrada' : 'ventas registradas'}</p>
                        </div>
                    </div>

                    {/* ── DESGLOSE POR PRODUCTO ── */}
                    {productTotals.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            {/* Encabezado */}
                            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1 px-3 pt-3 pb-2 border-b border-slate-100 bg-slate-50">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Producto</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-12">Cant.</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-12">Pzas</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right w-18">Precio</p>
                            </div>

                            {/* Filas */}
                            <div className="divide-y divide-slate-50">
                                {productTotals.map(([name, { qty, pieces, money, unit }]) => (
                                    <div key={name} className="grid grid-cols-[1fr_auto_auto_auto] gap-1 items-center px-3 py-2.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                <span className="text-[9px] font-black text-primary uppercase">{name.charAt(0)}</span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-700 truncate">{name}</p>
                                        </div>
                                        <div className="w-12 text-center">
                                            <span className="text-xs font-black text-slate-700">
                                                {qty % 1 === 0 ? qty : qty.toFixed(2)}
                                            </span>
                                            <span className="text-[9px] text-slate-400 ml-0.5">{unit === 'Kg' ? 'kg' : 'u'}</span>
                                        </div>
                                        <div className="w-12 text-center">
                                            {pieces > 0
                                                ? <span className="text-xs font-black text-blue-600">{pieces}</span>
                                                : <span className="text-slate-300 text-xs">—</span>
                                            }
                                        </div>
                                        <div className="w-18 text-right">
                                            <span className="text-sm font-black text-emerald-600">${money.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Fila de totales */}
                            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1 items-center px-3 py-3 bg-slate-800 rounded-b-2xl">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">TOTALES</p>
                                <div className="w-12 text-center">
                                    <span className="text-sm font-black text-slate-300">
                                        {grandTotalQty % 1 === 0 ? grandTotalQty : grandTotalQty.toFixed(2)}
                                    </span>
                                </div>
                                <div className="w-12 text-center">
                                    <span className="text-sm font-black text-blue-300">{grandTotalPieces}</span>
                                </div>
                                <div className="w-18 text-right">
                                    <span className="text-sm font-black text-white">${grandTotalMoney.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* ── FILTRO FECHA REPARTIDOR ── */}
            {!isAdmin && (
                <div className="px-4 md:px-8 mb-3">
                    <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-2.5">
                        <span className="material-symbols-outlined text-slate-400" style={{fontSize:18}}>calendar_month</span>
                        <input
                            type="date"
                            value={repDateFilter}
                            onChange={e => setRepDateFilter(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-700"
                        />
                        {repDateFilter && (
                            <button
                                onClick={() => setRepDateFilter('')}
                                className="text-slate-400 hover:text-slate-600 active:scale-90 transition-all"
                            >
                                <span className="material-symbols-outlined" style={{fontSize:18}}>close</span>
                            </button>
                        )}
                    </div>
                    {repDateFilter && (
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1.5 ml-1">
                            {new Date(repDateFilter + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                            {' · '}{sortedSales.length} {sortedSales.length === 1 ? 'venta' : 'ventas'}
                        </p>
                    )}
                </div>
            )}

            {/* ── LISTA DE VENTAS ── */}
            <div className="px-4 md:px-8 pb-24">
                {/* Cabecera columnas */}
                <div className="grid grid-cols-[70px_1fr_auto] gap-2 px-3 mb-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {isAdmin ? 'Hora' : 'Fecha'}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Cliente</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Total</span>
                </div>

                <div className="space-y-1.5 animate-in fade-in duration-300">
                    {sortedSales.length === 0 && (
                        <div className="text-center py-16 text-slate-400">
                            <div className="text-4xl mb-3">📋</div>
                            <p className="font-bold text-sm">
                                {isAdmin ? 'Sin ventas en este día' : 'Sin transacciones registradas'}
                            </p>
                        </div>
                    )}

                    {sortedSales.map((sale, i) => {
                        const client  = clients.find(c => c.id === sale.clientId);
                        const seller  = sale.userId === 'admin' ? 'Admin' : users.find(u => u.id === sale.userId)?.name?.split(' ')[0] || '—';
                        const dateObj = new Date(sale.date);
                        const fecha   = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
                        const hora    = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

                        return (
                            <button
                                key={sale.id}
                                onClick={() => setSelectedSale(sale)}
                                style={{ animationDelay: `${i * 25}ms` }}
                                className="w-full grid grid-cols-[70px_1fr_auto] gap-2 items-center bg-white rounded-2xl px-3 py-3 shadow-sm border border-slate-100 hover:border-primary/30 hover:shadow-md active:scale-[0.98] transition-all text-left animate-in fade-in"
                            >
                                <div className="shrink-0">
                                    {isAdmin ? (
                                        <>
                                            <p className="text-xs font-black text-slate-800 leading-tight">{hora}</p>
                                            <p className="text-[10px] font-bold text-primary/70 leading-tight mt-0.5">{seller}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs font-black text-slate-800 leading-tight">{fecha}</p>
                                            <p className="text-[10px] font-semibold text-slate-400 leading-tight mt-0.5">{hora}</p>
                                        </>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 leading-snug break-words">{client?.name || 'General'}</p>
                                    {sale.items?.length > 0 && (
                                        <p className="text-[10px] text-slate-400 font-medium leading-tight truncate">
                                            {sale.items.map(it => it.name).join(', ')}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-emerald-600 whitespace-nowrap">${Number(sale.total).toFixed(2)}</p>
                                    <p className="text-[9px] text-slate-300 font-bold">{sale.items?.length || 0} art.</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── DETALLE DE VENTA ── */}
            {selectedSale && (() => {
                const client  = clients.find(c => c.id === selectedSale.clientId);
                const seller  = selectedSale.userId === 'admin' ? 'Administración' : (users.find(u => u.id === selectedSale.userId)?.name || 'Repartidor');
                const dateObj = new Date(selectedSale.date);
                const fecha   = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
                const hora    = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print">
                        <div onClick={() => setSelectedSale(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <div
                            onClick={e => e.stopPropagation()}
                            className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-300"
                        >
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                                <button onClick={() => setSelectedSale(null)} className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center active:scale-90 transition-all shrink-0">
                                    <span className="material-symbols-outlined text-slate-600" style={{fontSize:24}}>arrow_back</span>
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Venta</p>
                                    <p className="text-sm font-black text-slate-800">#{selectedSale.id.slice(-6).toUpperCase()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{fecha}</p>
                                    <p className="text-xs font-black text-primary leading-tight">{hora}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <div className="mx-4 mt-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-emerald-500/20">
                                    <div>
                                        <p className="text-emerald-100 text-[9px] font-black uppercase tracking-widest mb-1">Total cobrado</p>
                                        <p className="text-white text-3xl font-black tracking-tighter">${selectedSale.total.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-white/20 rounded-xl p-2.5">
                                        <span className="material-symbols-outlined text-white" style={{fontSize:28}}>check_circle</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mx-4 mt-2">
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Cliente</p>
                                        <p className="text-sm font-black text-slate-700 truncate">{client?.name || 'General'}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Atendió</p>
                                        <p className="text-sm font-black text-slate-700 truncate">{seller}</p>
                                    </div>
                                </div>

                                <div className="mx-4 mt-3 mb-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Productos</p>
                                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{selectedSale.items.length} art.</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                                        {selectedSale.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
                                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                                                    <span className="material-symbols-outlined text-slate-300" style={{fontSize:16}}>inventory_2</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-slate-800 truncate">{item.name}</p>
                                                    <p className="text-[10px] font-medium text-slate-400">
                                                        {item.quantity}{item.unit || 'u'} × ${item.price.toFixed(2)}
                                                        {item.pieces > 0 && <span className="ml-1 text-amber-500 font-bold">· {item.pieces} pzas</span>}
                                                    </p>
                                                </div>
                                                <p className="text-sm font-black text-slate-800 shrink-0">${(item.quantity * item.price).toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="h-4" />
                            </div>

                            <div className="px-4 py-3 border-t border-slate-100 flex gap-2 bg-white">
                                <button
                                    onClick={async () => {
                                        const btPrinter = window.__btPrinter;
                                        if (btPrinter) await handleBTPrint(selectedSale);
                                        else window.print();
                                    }}
                                    disabled={btPrinting}
                                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-black py-3.5 rounded-2xl shadow-lg shadow-primary/25 active:scale-95 transition-all disabled:opacity-50 text-xs uppercase tracking-wide"
                                >
                                    <span className="material-symbols-outlined" style={{fontSize:18}}>{btPrinting ? 'refresh' : 'print'}</span>
                                    {btPrinting ? 'Imprimiendo…' : 'Reimprimir'}
                                </button>
                                <button
                                    onClick={() => showConfirm({
                                        message: '¿Eliminar esta venta?',
                                        confirmText: 'Eliminar', danger: true,
                                        onConfirm: async () => {
                                            const { deleteSale } = useStore.getState();
                                            await deleteSale(selectedSale.id);
                                            setSelectedSale(null);
                                        },
                                    })}
                                    className="w-12 h-12 bg-red-50 text-red-500 border border-red-100 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
                                >
                                    <span className="material-symbols-outlined" style={{fontSize:20}}>delete</span>
                                </button>
                            </div>
                            <div className="h-2 bg-white" />
                        </div>
                    </div>
                );
            })()}

            {/* TICKET IMPRIMIBLE */}
            {selectedSale && (
                <div id="ticket-print-area" className="hidden print:block">
                    <div style={{ fontFamily: 'monospace', fontSize: '8pt', lineHeight: '1.2', width: `${(ticketConfig.paperWidth || 58) - 2}mm`, margin: '0', padding: '2mm 0', color: '#000' }}>
                        <div style={{ textAlign: 'center', marginBottom: '3px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>{ticketConfig.businessName || 'MI NEGOCIO'}</div>
                            {ticketConfig.subtitle && <div>{ticketConfig.subtitle}</div>}
                            {ticketConfig.address && <div>{ticketConfig.address}</div>}
                            {ticketConfig.phone && <div>Tel: {ticketConfig.phone}</div>}
                            <div style={{ marginTop: '2px', fontWeight: 'bold' }}>** REIMPRESION **</div>
                        </div>
                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />
                        <div>Ticket : #{selectedSale.id.slice(-6).toUpperCase()}</div>
                        <div>Fecha  : {new Date(selectedSale.date).toLocaleDateString('es-MX')}</div>
                        <div>Hora   : {new Date(selectedSale.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />
                        <div>Repartidor: {selectedSale.userId === 'admin' ? 'Administrador' : (users.find(u => u.id === selectedSale.userId)?.name || 'Repartidor')}</div>
                        <div>Cliente   : {clients.find(c => c.id === selectedSale.clientId)?.name || 'General'}</div>
                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />
                        <div style={{ fontWeight: 'bold' }}>CANT CONCEPTO         IMPORTE</div>
                        <div style={{ borderTop: '1px dashed #000', margin: '2px 0' }} />
                        {selectedSale.items.map((item, idx) => (
                            <div key={idx} style={{ marginBottom: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{item.quantity}{item.unit === 'Kg' ? 'kg' : 'x'} {item.name.slice(0, 16)}</span>
                                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                        <div style={{ borderTop: '2px solid #000', margin: '3px 0' }} />
                        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '13pt' }}>TOTAL ${selectedSale.total.toFixed(2)}</div>
                        <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />
                        <div style={{ textAlign: 'center', marginTop: '4px' }}>
                            {ticketConfig.footerLine1 && <div>{ticketConfig.footerLine1}</div>}
                        </div>
                        <div style={{ marginTop: '20px' }} />
                    </div>
                </div>
            )}
        </div>
    );
}
