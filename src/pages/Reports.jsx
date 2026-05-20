import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { printTicket } from '../lib/bluetoothPrinter';
import { generateReportImage, generateReportPDF } from '../lib/reportExports';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import SaleDetailModal from '../components/reports/SaleDetailModal';
import ExpenseModal from '../components/reports/ExpenseModal';

const toLocalDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const todayStr = toLocalDate(new Date());
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_SHORT = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

export default function Reports() {
    const { sales, users, clients, expenses, currentUser, ticketConfig, showToast, showConfirm, clearAllSales, addExpense, deleteExpense, deleteSale } = useStore();
    const [filterUser, setFilterUser] = useState('');
    const [repDateFilter, setRepDateFilter] = useState(todayStr);
    const [selectedSale, setSelectedSale] = useState(null);
    const [btPrinting, setBtPrinting] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseDesc, setExpenseDesc] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [activeTab, setActiveTab] = useState('ventas');

    const now = new Date();
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [calMonth, setCalMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });

    const isAdmin = currentUser?.role === 'admin';
    const effectiveFilterUser = isAdmin ? filterUser : currentUser?.id;

    const activeDate = isAdmin ? selectedDate : (repDateFilter || todayStr);

    const userSales = useMemo(() => {
        return effectiveFilterUser
            ? (sales || []).filter(s => s?.userId === effectiveFilterUser)
            : (sales || []);
    }, [sales, effectiveFilterUser]);

    const daysWithSales = useMemo(() => {
        const s = new Set();
        userSales.forEach(sale => { if (sale?.date) s.add(toLocalDate(sale.date)); });
        return s;
    }, [userSales]);

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

    const dayExpenses = useMemo(() => {
        return (expenses || []).filter(e => {
            const uid = isAdmin ? effectiveFilterUser : currentUser?.id;
            const matchUser = uid ? (e.userId || e.userid) === uid : true;
            return matchUser && toLocalDate(e.date) === activeDate;
        });
    }, [expenses, activeDate, currentUser, isAdmin, effectiveFilterUser]);

    const totalExpenses = useMemo(() =>
        dayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [dayExpenses]);

    const operatorPDFData = useMemo(() => {
        if (isAdmin) return null;
        const fechaPDF = repDateFilter || todayStr;
        const ventasPDF = (sales || []).filter(s =>
            s?.userId === currentUser?.id && toLocalDate(s.date) === fechaPDF
        );
        const fechaLabel = new Date(fechaPDF + 'T12:00:00').toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
        const clientMap = {};
        ventasPDF.forEach(sale => {
            const client = clients.find(c => c.id === sale.clientId);
            const key = sale.clientId || '__general__';
            const name = client?.name || 'General';
            if (!clientMap[key]) clientMap[key] = { name, pieces: 0, kg: 0, money: 0 };
            (sale.items || []).forEach(it => {
                clientMap[key].pieces += Number(it.pieces) || 0;
                if ((it.unit || '').toLowerCase() === 'kg') clientMap[key].kg += Number(it.quantity) || 0;
                clientMap[key].money += (Number(it.quantity) || 0) * (Number(it.price) || 0);
            });
        });
        const clientRows = Object.values(clientMap).sort((a, b) => b.money - a.money);
        const expensesForDay = (expenses || []).filter(e =>
            (e.userId || e.userid) === currentUser?.id && toLocalDate(e.date) === fechaPDF
        );
        const totalMoney    = clientRows.reduce((s, r) => s + r.money, 0);
        const expTotal      = expensesForDay.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return {
            fechaLabel,
            ventasCount: ventasPDF.length,
            clientRows,
            totalPieces:    clientRows.reduce((s, r) => s + r.pieces, 0),
            totalKg:        clientRows.reduce((s, r) => s + r.kg, 0),
            totalMoney,
            expenses:       expensesForDay,
            totalExpenses:  expTotal,
            netTotal:       totalMoney - expTotal,
        };
    }, [isAdmin, repDateFilter, sales, clients, currentUser, expenses]);

    const generateImage = async () => {
        await generateReportImage({
            operatorPDFData, sales, clients, currentUser, repDateFilter, todayStr, ticketConfig
        });
    };

    const generatePDF = async () => {
        await generateReportPDF({
            operatorPDFData, sales, clients, currentUser, repDateFilter, todayStr, ticketConfig
        });
    };

    const daysInMonth  = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
    const firstWeekDay = new Date(calMonth.year, calMonth.month, 1).getDay();
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

    const selDateObj   = new Date(selectedDate + 'T12:00:00');
    const selDateLabel = selDateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

    /* ── Calendario compartido (se reutiliza en admin y operador) ── */
    const renderCalendar = (activeDateStr, onSelect) => (
        <div className="bg-white border border-indigo-100 rounded-2xl p-2 shadow-sm">
            <div className="flex items-center justify-between mb-1">
                <button onClick={prevMonth} className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center active:scale-90 transition-all hover:border-indigo-400 hover:text-indigo-600">
                    <ChevronLeft size={12} className="text-slate-500" />
                </button>
                <p className="text-xs font-black text-indigo-700 capitalize tracking-wide">
                    {MONTHS[calMonth.month]} {calMonth.year}
                </p>
                <button onClick={nextMonth} className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center active:scale-90 transition-all hover:border-indigo-400 hover:text-indigo-600">
                    <ChevronRight size={12} className="text-slate-500" />
                </button>
            </div>
            <div className="grid grid-cols-7 mb-0.5 border-b border-indigo-100 pb-1">
                {DAYS_SHORT.map(d => (
                    <div key={d} className="text-center text-[9px] font-black text-indigo-400 uppercase">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
                {Array.from({ length: firstWeekDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day     = i + 1;
                    const dateStr = `${calMonth.year}-${String(calMonth.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const isSel   = dateStr === activeDateStr;
                    const isToday = dateStr === todayStr;
                    const hasSales = daysWithSales.has(dateStr);
                    return (
                        <button
                            key={day}
                            onClick={() => onSelect(dateStr)}
                            className={`flex flex-col items-center justify-center w-full py-1 transition-all active:scale-90
                                ${isSel   ? 'rounded-full bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                                : isToday ? 'rounded-lg ring-2 ring-indigo-400 text-indigo-700 font-black bg-indigo-50'
                                : 'rounded-lg hover:bg-indigo-50 text-slate-600'}`}
                        >
                            <span className="text-[12px] font-black leading-none">{day}</span>
                            {hasSales && <span className={`w-1 h-1 rounded-full mt-0.5 ${isSel ? 'bg-white/80' : 'bg-indigo-500'}`} />}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    /* ── Tab switcher ── */
    const renderTabs = () => (
        <div className="flex gap-1 bg-slate-200/60 p-1 rounded-2xl">
            <button
                onClick={() => setActiveTab('ventas')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'ventas'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                }`}
            >
                <span className="material-symbols-outlined" style={{fontSize:14}}>receipt</span>
                Ventas
            </button>
            <button
                onClick={() => setActiveTab('gastos')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'gastos'
                        ? 'bg-white text-rose-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                }`}
            >
                <span className="material-symbols-outlined" style={{fontSize:14}}>receipt_long</span>
                Gastos
            </button>
            {!isAdmin && (
                <button
                    onClick={() => setActiveTab('informe')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        activeTab === 'informe'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <span className="material-symbols-outlined" style={{fontSize:14}}>analytics</span>
                    Informe
                </button>
            )}
        </div>
    );

    /* ── Panel de Gastos (compartido) ── */
    const renderGastosPanel = () => (
        <div className="pb-24 space-y-3 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Header tipo carrito */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-rose-500" style={{fontSize:18}}>receipt_long</span>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-wide">Gastos del día</p>
                    </div>
                    {!isAdmin && (
                        <button
                            onClick={() => setShowExpenseModal(true)}
                            className="flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition-all active:scale-95"
                        >
                            <Plus size={12} />
                            Agregar
                        </button>
                    )}
                </div>

                {dayExpenses.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-slate-300 text-4xl">receipt_long</span>
                        <p className="text-sm text-slate-400 font-medium mt-2">Sin gastos registrados</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {dayExpenses.map(exp => (
                            <div key={exp.id} className="flex items-center gap-3 px-4 py-3 bg-white animate-in fade-in">
                                <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-rose-400" style={{fontSize:16}}>receipt_long</span>
                                </div>
                                <p className="flex-1 text-sm font-bold text-slate-700 truncate">{exp.description}</p>
                                <p className="text-sm font-black text-rose-600 shrink-0">-${Number(exp.amount).toFixed(2)}</p>
                                {!isAdmin && (
                                    <button
                                        onClick={() => deleteExpense(exp.id)}
                                        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 active:scale-90 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Resumen total gastos */}
                <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Gastos</span>
                    <span className="text-xl font-black text-rose-600">-${totalExpenses.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">

            {/* ── HEADER ── */}
            <div className="bg-white border-b border-slate-200 px-4 pt-5 pb-4 md:px-8 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">{ticketConfig?.businessName || 'Lacteos La Toba'}</p>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-0.5">Reporte de Ventas</h1>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => showConfirm({
                            message: '¿Vaciar TODAS las ventas? Esta acción no se puede deshacer.',
                            confirmText: 'Vaciar todo', danger: true,
                            onConfirm: async () => { await clearAllSales(); showToast('Ventas eliminadas', 'success'); },
                        })}
                        className="w-9 h-9 bg-slate-100 border border-slate-200 text-slate-400 rounded-lg flex items-center justify-center active:scale-90 transition-all hover:bg-red-50 hover:border-red-300 hover:text-red-500"
                        title="Vaciar todas las ventas"
                    >
                        <span className="material-symbols-outlined" style={{fontSize:18}}>delete_sweep</span>
                    </button>
                )}
            </div>

            {/* ── BLOQUE EXCLUSIVO ADMIN ── */}
            {isAdmin && (
                <div className="px-4 md:px-8 space-y-3 mb-2 pt-4">

                    {/* Pills repartidor */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setFilterUser('')}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-black uppercase tracking-wider transition-all border ${!filterUser ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-300' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'}`}
                        >
                            Todos
                        </button>
                        {users.filter(u => u.pin && (u.name || '').toLowerCase() !== 'administrador').map(u => (
                            <button
                                key={u.id}
                                onClick={() => setFilterUser(u.id)}
                                className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-black uppercase tracking-wider transition-all border ${filterUser === u.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-300' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'}`}
                            >
                                {u.name.split(' ')[0]}
                            </button>
                        ))}
                    </div>

                    {/* Tabs */}
                    {renderTabs()}

                    {/* Calendario */}
                    {renderCalendar(selectedDate, setSelectedDate)}

                    {/* TAB: VENTAS */}
                    {activeTab === 'ventas' && (
                        <div className="space-y-3 animate-in fade-in duration-200">
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-4 rounded-2xl shadow-md shadow-indigo-200">
                                    <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-widest mb-2">Total del día</p>
                                    <p className="text-3xl font-black text-white leading-none">${dayTotal.toFixed(2)}</p>
                                    <p className="text-[10px] text-indigo-200 font-medium mt-1 capitalize truncate">{selDateLabel}</p>
                                    <div className="mt-2 h-0.5 bg-white/30 w-8" />
                                </div>
                                <div className="bg-white p-4 border border-violet-200 rounded-2xl shadow-sm">
                                    <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mb-2">Transacciones</p>
                                    <p className="text-3xl font-black text-violet-700 leading-none">{dayCount}</p>
                                    <p className="text-[10px] text-slate-400 font-medium mt-1">{dayCount === 1 ? 'venta' : 'ventas'}</p>
                                    <div className="mt-2 h-0.5 bg-violet-400 w-8" />
                                </div>
                            </div>

                            {/* Desglose por producto */}
                            {productTotals.length > 0 && (
                                <div className="bg-white border border-indigo-100 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="px-3 py-2 border-b border-indigo-100 flex items-center justify-between bg-indigo-50">
                                        <p className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.2em]">Desglose por Producto</p>
                                        <p className="text-[10px] font-bold text-indigo-400">{selDateLabel}</p>
                                    </div>
                                    <div className="grid grid-cols-[1fr_56px_48px_88px] px-3 py-2.5 bg-gradient-to-r from-indigo-700 to-violet-700">
                                        <p className="text-[10px] font-bold text-white uppercase tracking-widest">Producto</p>
                                        <p className="text-[10px] font-bold text-white uppercase tracking-widest text-right">Cant.</p>
                                        <p className="text-[10px] font-bold text-white uppercase tracking-widest text-right">Pzas</p>
                                        <p className="text-[10px] font-bold text-white uppercase tracking-widest text-right">Importe</p>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {productTotals.map(([name, { qty, pieces, money, unit }], idx) => (
                                            <div key={name} className={`grid grid-cols-[1fr_56px_48px_88px] items-center px-3 py-2.5 ${idx % 2 === 1 ? 'bg-indigo-50/40' : 'bg-white'}`}>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-5 h-5 rounded-md bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
                                                        <span className="text-[9px] font-black text-indigo-700 uppercase">{name.charAt(0)}</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
                                                </div>
                                                <div className="text-right pr-1">
                                                    <span className="text-xs font-black text-slate-700">{qty % 1 === 0 ? qty : qty.toFixed(2)}</span>
                                                    <span className="text-[9px] text-slate-400 ml-0.5">{unit === 'Kg' ? 'kg' : 'u'}</span>
                                                </div>
                                                <div className="text-right pr-1">
                                                    {pieces > 0
                                                        ? <span className="text-xs font-black text-slate-800">{pieces}</span>
                                                        : <span className="text-slate-300 text-xs">—</span>
                                                    }
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-indigo-700">${money.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-[1fr_56px_48px_88px] items-center px-3 py-3 bg-indigo-50 border-t-2 border-indigo-500">
                                        <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">TOTALES</p>
                                        <div className="text-right pr-1">
                                            <span className="text-sm font-black text-slate-700">{grandTotalQty % 1 === 0 ? grandTotalQty : grandTotalQty.toFixed(2)}</span>
                                        </div>
                                        <div className="text-right pr-1">
                                            <span className="text-sm font-black text-slate-800">{grandTotalPieces}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-black text-indigo-700">${grandTotalMoney.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: GASTOS (admin) */}
                    {activeTab === 'gastos' && renderGastosPanel()}

                </div>
            )}

            {/* ── BLOQUE OPERADOR ── */}
            {!isAdmin && (
                <div className="px-4 md:px-8 mb-3 space-y-2 pt-4">
                    {/* Tabs */}
                    {renderTabs()}

                    {/* Calendario */}
                    {renderCalendar(repDateFilter, setRepDateFilter)}

                    {/* Info */}
                    {activeTab !== 'informe' && <div className="flex items-center justify-between py-1">
                        <div>
                            <p className="text-[11px] font-black text-indigo-800 uppercase tracking-widest capitalize">
                                {new Date(repDateFilter + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">
                                {activeTab === 'gastos'
                                    ? `${dayExpenses.length} ${dayExpenses.length === 1 ? 'gasto registrado' : 'gastos registrados'}`
                                    : activeTab === 'informe'
                                    ? `${sortedSales.length} ${sortedSales.length === 1 ? 'venta' : 'ventas'} y ${dayExpenses.length} ${dayExpenses.length === 1 ? 'gasto' : 'gastos'}`
                                    : `${sortedSales.length} ${sortedSales.length === 1 ? 'venta registrada' : 'ventas registradas'}`
                                }
                            </p>
                        </div>
                    </div>}

                    {/* TAB: GASTOS (operador) */}
                    {activeTab === 'gastos' && renderGastosPanel()}

                    {/* TAB: INFORME (operador) */}
                    {activeTab === 'informe' && (
                        <div className="pb-24 space-y-3 animate-in fade-in duration-200">
                            <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden shadow-sm">
                                <div className="px-4 py-3 bg-gradient-to-r from-violet-700 to-indigo-700 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Generar Informe</p>
                                        <p className="text-xs font-black text-white capitalize mt-0.5">
                                            {new Date(repDateFilter + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </p>
                                    </div>
                                    <span className="material-symbols-outlined text-white/80" style={{fontSize:20}}>analytics</span>
                                </div>

                                <div className="p-4 space-y-3 bg-white">
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                            <span>Ventas ({sortedSales.length})</span>
                                            <span className="font-black text-indigo-700">${dayTotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                            <span>Gastos ({dayExpenses.length})</span>
                                            <span className="font-black text-rose-600">-${totalExpenses.toFixed(2)}</span>
                                        </div>
                                        <div className="border-t border-slate-100 my-1" />
                                        <div className="flex justify-between items-center text-sm font-black text-slate-800 pt-1">
                                            <span>Neto del día</span>
                                            <span className="text-emerald-600">${(dayTotal - totalExpenses).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                                        <button
                                            onClick={generateImage}
                                            className="flex items-center justify-center gap-1.5 bg-white border border-violet-400 text-violet-700 font-black text-xs py-2.5 rounded-xl active:scale-95 transition-all uppercase tracking-wide hover:bg-violet-600 hover:text-white hover:border-violet-600 shadow-sm"
                                        >
                                            <span className="material-symbols-outlined" style={{fontSize:14}}>image</span>
                                            Imagen (IMG)
                                        </button>
                                        <button
                                            onClick={generatePDF}
                                            className="flex items-center justify-center gap-1.5 bg-indigo-600 text-white font-black text-xs py-2.5 rounded-xl active:scale-95 transition-all uppercase tracking-wide hover:bg-indigo-700 shadow-sm shadow-indigo-300"
                                        >
                                            <span className="material-symbols-outlined" style={{fontSize:14}}>picture_as_pdf</span>
                                            Documento (PDF)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── LISTA DE VENTAS (solo tab ventas) ── */}
            {activeTab === 'ventas' && (
                <div className="px-4 md:px-8 pb-24">
                    <div className="bg-gradient-to-r from-slate-800 to-indigo-900 grid grid-cols-[64px_1fr_88px] px-3 py-2 rounded-t-xl mt-1">
                        <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em]">
                            {isAdmin ? 'Hora' : 'Fecha'}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em]">Cliente / Productos</span>
                        <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em] text-right">Total</span>
                    </div>

                    <div className="border border-slate-200 border-t-0 rounded-b-xl overflow-hidden animate-in fade-in duration-300 shadow-sm">
                        {sortedSales.length === 0 && (
                            <div className="text-center py-16 text-slate-400 bg-white">
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
                            const pm      = sale.paymentMethod || sale.paymentmethod || 'efectivo';
                            const isTransfer = pm === 'transferencia';

                            return (
                                <button
                                    key={sale.id}
                                    onClick={() => setSelectedSale(sale)}
                                    style={{ animationDelay: `${i * 20}ms` }}
                                    className={`w-full grid grid-cols-[64px_1fr_88px] items-stretch text-left border-b border-slate-100 last:border-b-0 hover:bg-indigo-50/50 active:bg-indigo-100/50 transition-colors animate-in fade-in ${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
                                >
                                    <div className="shrink-0 px-2 py-3 border-r border-slate-100">
                                        {isAdmin ? (
                                            <>
                                                <p className="text-xs font-black text-slate-800 leading-tight">{hora}</p>
                                                <p className="text-[10px] font-bold text-slate-500 leading-tight mt-0.5 truncate">{seller}</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-xs font-black text-slate-800 leading-tight">{fecha}</p>
                                                <p className="text-[10px] font-semibold text-slate-400 leading-tight mt-0.5">{hora}</p>
                                            </>
                                        )}
                                    </div>
                                    <div className="min-w-0 px-3 py-3">
                                        <p className="text-sm font-bold text-slate-800 leading-snug">{client?.name || 'General'}</p>
                                        {sale.items?.length > 0 && (
                                            <p className="text-[10px] text-slate-400 font-medium leading-tight truncate mt-0.5">
                                                {sale.items.map(it => it.name).join(', ')}
                                            </p>
                                        )}
                                        <span className={`inline-flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 border rounded-full ${
                                            isTransfer
                                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        }`}>
                                            <span className="material-symbols-outlined" style={{fontSize:9}}>{isTransfer ? 'account_balance' : 'payments'}</span>
                                            {isTransfer ? 'Transfer.' : 'Efectivo'}
                                        </span>
                                    </div>
                                    <div className="text-right shrink-0 px-2 py-3 border-l border-slate-100">
                                        <p className="text-sm font-black text-indigo-700 whitespace-nowrap">${Number(sale.total).toFixed(2)}</p>
                                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">{sale.items?.length || 0} art.</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal agregar gasto */}
            {showExpenseModal && (
                <ExpenseModal
                    expenseDesc={expenseDesc}
                    setExpenseDesc={setExpenseDesc}
                    expenseAmount={expenseAmount}
                    setExpenseAmount={setExpenseAmount}
                    setShowExpenseModal={setShowExpenseModal}
                    addExpense={addExpense}
                    currentUser={currentUser}
                    repDateFilter={repDateFilter}
                    showToast={showToast}
                />
            )}

            {/* Detalle de venta */}
            <SaleDetailModal
                selectedSale={selectedSale}
                clients={clients}
                users={users}
                btPrinting={btPrinting}
                handleBTPrint={handleBTPrint}
                deleteSale={deleteSale}
                setSelectedSale={setSelectedSale}
                showConfirm={showConfirm}
            />

            {/* Ticket imprimible */}
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
