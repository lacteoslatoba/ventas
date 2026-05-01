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

    // Totales por método de pago
    const efectivoTotal = sortedSales
        .filter(s => (s.paymentMethod || s.paymentmethod || 'efectivo') !== 'transferencia')
        .reduce((acc, s) => acc + Number(s.total), 0);
    const transferTotal = sortedSales
        .filter(s => (s.paymentMethod || s.paymentmethod) === 'transferencia')
        .reduce((acc, s) => acc + Number(s.total), 0);
    const granTotal = sortedSales.reduce((acc, s) => acc + Number(s.total), 0);

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

    // Gastos del día (operador)
    const dayExpenses = useMemo(() => {
        if (isAdmin) return [];
        const dateKey = repDateFilter || todayStr;
        return (expenses || []).filter(e =>
            (e.userId || e.userid) === currentUser?.id && toLocalDate(e.date) === dateKey
        );
    }, [expenses, repDateFilter, currentUser, isAdmin]);

    const totalExpenses = useMemo(() =>
        dayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [dayExpenses]);

    // Datos para el PDF del operador (agrupados por cliente + gastos)
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

    // Generar imagen PNG renderizando HTML (idéntico al PDF)
    const generateImage = async () => {
        await generateReportImage({
            operatorPDFData, sales, clients, currentUser, repDateFilter, todayStr, ticketConfig
        });
    };

    // Generar PDF directo con jsPDF (carga diferida para no aumentar el bundle inicial)
    const generatePDF = async () => {
        await generateReportPDF({
            operatorPDFData, sales, clients, currentUser, repDateFilter, todayStr, ticketConfig
        });
    };

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
        <div className="min-h-screen bg-white">

            {/* ── HEADER ── */}
            <div className="px-4 pt-5 pb-4 md:px-8 flex items-center justify-between border-b-2 border-gray-900">
                <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">{ticketConfig?.businessName || 'Lacteos La Toba'}</p>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mt-0.5">Reporte de Ventas</h1>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => showConfirm({
                            message: '¿Vaciar TODAS las ventas? Esta acción no se puede deshacer.',
                            confirmText: 'Vaciar todo', danger: true,
                            onConfirm: async () => { await clearAllSales(); showToast('Ventas eliminadas', 'success'); },
                        })}
                        className="w-9 h-9 bg-white border border-gray-300 text-gray-400 rounded-lg flex items-center justify-center active:scale-90 transition-all hover:border-red-400 hover:text-red-400"
                        title="Vaciar todas las ventas"
                    >
                        <span className="material-symbols-outlined" style={{fontSize:18}}>delete_sweep</span>
                    </button>
                )}
            </div>

            {/* ── BLOQUE EXCLUSIVO ADMIN ── */}
            {isAdmin && (
                <div className="px-4 md:px-8 space-y-3 mb-2 pt-4">

                    {/* Selector de repartidor — pills */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setFilterUser('')}
                            className={`shrink-0 px-3 py-1.5 rounded text-[11px] font-black uppercase tracking-wider transition-all border ${!filterUser ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-500 hover:border-gray-900'}`}
                        >
                            Todos
                        </button>
                        {users.filter(u => u.pin && (u.name || '').toLowerCase() !== 'administrador').map(u => (
                            <button
                                key={u.id}
                                onClick={() => setFilterUser(u.id)}
                                className={`shrink-0 px-3 py-1.5 rounded text-[11px] font-black uppercase tracking-wider transition-all border ${filterUser === u.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-500 hover:border-gray-900'}`}
                            >
                                {u.name.split(' ')[0]}
                            </button>
                        ))}
                    </div>

                    {/* ── CALENDARIO ── */}
                    <div className="bg-white border border-gray-300 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <button onClick={prevMonth} className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center active:scale-90 transition-all hover:border-gray-900">
                                <ChevronLeft size={14} className="text-gray-600" />
                            </button>
                            <p className="text-xs font-black text-gray-900 capitalize tracking-wide">
                                {MONTHS[calMonth.month]} {calMonth.year}
                            </p>
                            <button onClick={nextMonth} className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center active:scale-90 transition-all hover:border-gray-900">
                                <ChevronRight size={14} className="text-gray-600" />
                            </button>
                        </div>
                        <div className="grid grid-cols-7 mb-1 border-b border-gray-200 pb-1">
                            {DAYS_SHORT.map(d => (
                                <div key={d} className="text-center text-[9px] font-black text-gray-400 uppercase">{d}</div>
                            ))}
                        </div>
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
                                        className={`flex flex-col items-center justify-center w-full py-1.5 rounded transition-all active:scale-90
                                            ${isSelected ? 'bg-gray-900 text-white'
                                            : isToday    ? 'ring-2 ring-gray-900 text-gray-900 font-black'
                                            : 'hover:bg-gray-50 text-gray-700'}`}
                                    >
                                        <span className="text-[12px] font-black leading-none">{day}</span>
                                        {hasSales && (
                                            <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white/70' : 'bg-gray-900'}`} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── STATS DEL DÍA ── */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-4 border border-gray-900 rounded-lg">
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total del día</p>
                            <p className="text-2xl font-black text-gray-900 leading-none">${dayTotal.toFixed(2)}</p>
                            <p className="text-[9px] text-gray-500 font-medium mt-1 capitalize truncate">{selDateLabel}</p>
                            <div className="mt-2 h-0.5 bg-gray-900 w-8" />
                        </div>
                        <div className="bg-white p-4 border border-gray-300 rounded-lg">
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2">Transacciones</p>
                            <p className="text-2xl font-black text-gray-900 leading-none">{dayCount}</p>
                            <p className="text-[9px] text-gray-500 font-medium mt-1">{dayCount === 1 ? 'venta registrada' : 'ventas registradas'}</p>
                            <div className="mt-2 h-0.5 bg-gray-300 w-8" />
                        </div>
                    </div>

                    {/* ── DESGLOSE POR PRODUCTO ── */}
                    {productTotals.length > 0 && (
                        <div className="bg-white border border-gray-900 rounded-lg overflow-hidden">
                            {/* Título sección */}
                            <div className="px-3 py-2 border-b border-gray-900 flex items-center justify-between">
                                <p className="text-[9px] font-black text-gray-900 uppercase tracking-[0.2em]">Desglose por Producto</p>
                                <p className="text-[9px] font-bold text-gray-400">{selDateLabel}</p>
                            </div>
                            {/* Encabezado tabla */}
                            <div className="grid grid-cols-[1fr_52px_52px_84px] px-3 py-2.5 bg-gray-900">
                                <p className="text-[9px] font-bold text-white uppercase tracking-widest">Producto</p>
                                <p className="text-[9px] font-bold text-white uppercase tracking-widest text-right">Cant.</p>
                                <p className="text-[9px] font-bold text-white uppercase tracking-widest text-right">Pzas</p>
                                <p className="text-[9px] font-bold text-white uppercase tracking-widest text-right">Importe</p>
                            </div>
                            {/* Filas */}
                            <div className="divide-y divide-gray-100">
                                {productTotals.map(([name, { qty, pieces, money, unit }], idx) => (
                                    <div key={name} className={`grid grid-cols-[1fr_52px_52px_84px] items-center px-3 py-2.5 ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center shrink-0">
                                                <span className="text-[9px] font-black text-gray-600 uppercase">{name.charAt(0)}</span>
                                            </div>
                                            <p className="text-xs font-bold text-gray-800 truncate">{name}</p>
                                        </div>
                                        <div className="text-right pr-1">
                                            <span className="text-xs font-black text-gray-700">{qty % 1 === 0 ? qty : qty.toFixed(2)}</span>
                                            <span className="text-[9px] text-gray-400 ml-0.5">{unit === 'Kg' ? 'kg' : 'u'}</span>
                                        </div>
                                        <div className="text-right pr-1">
                                            {pieces > 0
                                                ? <span className="text-xs font-black text-gray-800">{pieces}</span>
                                                : <span className="text-gray-300 text-xs">—</span>
                                            }
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-black text-gray-900">${money.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Fila totales */}
                            <div className="grid grid-cols-[1fr_52px_52px_84px] items-center px-3 py-3 bg-gray-50 border-t-2 border-gray-900">
                                <p className="text-[9px] font-black text-gray-900 uppercase tracking-widest">TOTALES</p>
                                <div className="text-right pr-1">
                                    <span className="text-sm font-black text-gray-700">{grandTotalQty % 1 === 0 ? grandTotalQty : grandTotalQty.toFixed(2)}</span>
                                </div>
                                <div className="text-right pr-1">
                                    <span className="text-sm font-black text-gray-900">{grandTotalPieces}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-black text-gray-900">${grandTotalMoney.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* ── CALENDARIO FIJO + BOTONES (OPERADOR) ── */}
            {!isAdmin && (
                <div className="px-4 md:px-8 mb-3 space-y-2 pt-4">
                    {/* Calendario */}
                    <div className="bg-white border border-gray-300 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <button onClick={prevMonth} className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center active:scale-90 transition-all hover:border-gray-900">
                                <ChevronLeft size={14} className="text-gray-600" />
                            </button>
                            <p className="text-xs font-black text-gray-900 capitalize tracking-wide">
                                {MONTHS[calMonth.month]} {calMonth.year}
                            </p>
                            <button onClick={nextMonth} className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center active:scale-90 transition-all hover:border-gray-900">
                                <ChevronRight size={14} className="text-gray-600" />
                            </button>
                        </div>
                        <div className="grid grid-cols-7 mb-1 border-b border-gray-200 pb-1">
                            {DAYS_SHORT.map(d => (
                                <div key={d} className="text-center text-[9px] font-black text-gray-400 uppercase">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-y-0.5">
                            {Array.from({ length: new Date(calMonth.year, calMonth.month, 1).getDay() }).map((_, i) => <div key={`e${i}`} />)}
                            {Array.from({ length: new Date(calMonth.year, calMonth.month + 1, 0).getDate() }).map((_, i) => {
                                const day = i + 1;
                                const dateStr = `${calMonth.year}-${String(calMonth.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                                const isSelected = dateStr === repDateFilter;
                                const isToday    = dateStr === todayStr;
                                const hasSales   = daysWithSales.has(dateStr);
                                return (
                                    <button
                                        key={day}
                                        onClick={() => setRepDateFilter(dateStr)}
                                        className={`flex flex-col items-center justify-center w-full py-1.5 rounded transition-all active:scale-90
                                            ${isSelected ? 'bg-gray-900 text-white'
                                            : isToday    ? 'ring-2 ring-gray-900 text-gray-900 font-black'
                                            : 'hover:bg-gray-50 text-gray-700'}`}
                                    >
                                        <span className="text-[12px] font-black leading-none">{day}</span>
                                        {hasSales && <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white/70' : 'bg-gray-900'}`} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Info + botones */}
                    <div className="flex items-center justify-between py-1">
                        <div>
                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest capitalize">
                                {new Date(repDateFilter + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            <p className="text-[9px] text-gray-400 font-bold">{sortedSales.length} {sortedSales.length === 1 ? 'venta registrada' : 'ventas registradas'}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={generateImage}
                                className="flex items-center gap-1.5 bg-white border border-gray-900 text-gray-900 font-black text-xs px-3 py-2 rounded active:scale-95 transition-all uppercase tracking-wide hover:bg-gray-900 hover:text-white"
                            >
                                <span className="material-symbols-outlined" style={{fontSize:15}}>image</span>
                                IMG
                            </button>
                            <button
                                onClick={generatePDF}
                                className="flex items-center gap-1.5 bg-gray-900 text-white font-black text-xs px-3 py-2 rounded active:scale-95 transition-all uppercase tracking-wide hover:bg-gray-700"
                            >
                                <span className="material-symbols-outlined" style={{fontSize:15}}>picture_as_pdf</span>
                                PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── LISTA DE VENTAS ── */}
            <div className="px-4 md:px-8 pb-6">

                {/* Cabecera tabla */}
                <div className="bg-gray-900 grid grid-cols-[72px_1fr_90px] px-3 py-2 rounded-t-lg mt-1">
                    <span className="text-[9px] font-bold text-white uppercase tracking-[0.2em]">
                        {isAdmin ? 'Hora' : 'Fecha'}
                    </span>
                    <span className="text-[9px] font-bold text-white uppercase tracking-[0.2em]">Cliente / Productos</span>
                    <span className="text-[9px] font-bold text-white uppercase tracking-[0.2em] text-right">Total</span>
                </div>

                <div className="border border-gray-900 border-t-0 rounded-b-lg overflow-hidden animate-in fade-in duration-300">
                    {sortedSales.length === 0 && (
                        <div className="text-center py-16 text-gray-400 bg-white">
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
                                className={`w-full grid grid-cols-[72px_1fr_90px] items-stretch text-left border-b border-gray-100 last:border-b-0 hover:bg-gray-50 active:bg-gray-100 transition-colors animate-in fade-in ${i % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
                            >
                                <div className="shrink-0 px-3 py-3 border-r border-gray-100">
                                    {isAdmin ? (
                                        <>
                                            <p className="text-xs font-black text-gray-900 leading-tight">{hora}</p>
                                            <p className="text-[10px] font-bold text-gray-500 leading-tight mt-0.5">{seller}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs font-black text-gray-900 leading-tight">{fecha}</p>
                                            <p className="text-[10px] font-semibold text-gray-400 leading-tight mt-0.5">{hora}</p>
                                        </>
                                    )}
                                </div>
                                <div className="min-w-0 px-3 py-3">
                                    <p className="text-sm font-bold text-gray-900 leading-snug">{client?.name || 'General'}</p>
                                    {sale.items?.length > 0 && (
                                        <p className="text-[10px] text-gray-400 font-medium leading-tight truncate mt-0.5">
                                            {sale.items.map(it => it.name).join(', ')}
                                        </p>
                                    )}
                                    <span className={`inline-flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 border rounded ${
                                        isTransfer ? 'bg-white text-gray-600 border-gray-300' : 'bg-white text-gray-600 border-gray-300'
                                    }`}>
                                        <span className="material-symbols-outlined" style={{fontSize:10}}>{isTransfer ? 'account_balance' : 'payments'}</span>
                                        {isTransfer ? 'Transferencia' : 'Efectivo'}
                                    </span>
                                </div>
                                <div className="text-right shrink-0 px-3 py-3 border-l border-gray-100">
                                    <p className="text-base font-black text-gray-900 whitespace-nowrap">${Number(sale.total).toFixed(2)}</p>
                                    <p className="text-[9px] text-gray-400 font-bold">{sale.items?.length || 0} art.</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* ── RESUMEN POR MÉTODO DE PAGO ── */}
                {sortedSales.length > 0 && (
                    <div className="mt-3 mb-24 bg-white border border-gray-900 rounded-lg overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-900 flex items-center justify-between">
                            <p className="text-[9px] font-bold text-white uppercase tracking-widest">Resumen de Cobro</p>
                            <p className="text-[9px] font-bold text-gray-400">{sortedSales.length} {sortedSales.length === 1 ? 'venta' : 'ventas'}</p>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {efectivoTotal > 0 && (
                                <div className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-gray-500" style={{fontSize:15}}>payments</span>
                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Efectivo</span>
                                    </div>
                                    <span className="text-sm font-black text-gray-900">${efectivoTotal.toFixed(2)}</span>
                                </div>
                            )}
                            {transferTotal > 0 && (
                                <div className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-gray-500" style={{fontSize:15}}>account_balance</span>
                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Transferencia</span>
                                    </div>
                                    <span className="text-sm font-black text-gray-900">${transferTotal.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t-2 border-gray-900">
                                <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Total del Día</span>
                                <span className="text-lg font-black text-gray-900">${granTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── GASTOS DEL DÍA (solo operador) ── */}
            {!isAdmin && (
                <div className="px-4 md:px-8 pb-24">
                    <div className="bg-white border border-gray-900 rounded-lg overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-900 flex items-center justify-between">
                            <p className="text-[9px] font-bold text-white uppercase tracking-widest">Gastos del Día</p>
                            <button
                                onClick={() => setShowExpenseModal(true)}
                                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wide transition-all active:scale-95"
                            >
                                <Plus size={10} />
                                Agregar
                            </button>
                        </div>

                        {dayExpenses.length === 0 ? (
                            <p className="text-center text-xs text-gray-400 font-medium py-6">Sin gastos registrados</p>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {dayExpenses.map(exp => (
                                    <div key={exp.id} className="flex items-center gap-3 px-4 py-3 bg-white animate-in fade-in">
                                        <span className="material-symbols-outlined text-gray-400" style={{fontSize:16}}>receipt_long</span>
                                        <p className="flex-1 text-sm font-bold text-gray-700 truncate">{exp.description}</p>
                                        <p className="text-sm font-black text-gray-900 shrink-0">-${Number(exp.amount).toFixed(2)}</p>
                                        <button
                                            onClick={() => deleteExpense(exp.id)}
                                            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 active:scale-90 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Resumen ventas – gastos – neto */}
                        <div className="border-t-2 border-gray-900 divide-y divide-gray-100">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Ventas</span>
                                <span className="text-sm font-black text-gray-900">${dayTotal.toFixed(2)}</span>
                            </div>
                            {totalExpenses > 0 && (
                                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Gastos</span>
                                    <span className="text-sm font-black text-gray-700">-${totalExpenses.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between px-4 py-3 bg-white">
                                <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">Neto del Día</span>
                                <span className="text-xl font-black text-gray-900">${(dayTotal - totalExpenses).toFixed(2)}</span>
                            </div>
                        </div>
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

            {/* ── DETALLE DE VENTA ── */}
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
