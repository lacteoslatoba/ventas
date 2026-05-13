import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '../store';
import { printTicket } from '../lib/bluetoothPrinter';
import { generateReportImage, generateReportPDF } from '../lib/reportExports';
import { Plus, Trash2 } from 'lucide-react';
import SaleDetailModal from '../components/reports/SaleDetailModal';
import ExpenseModal from '../components/reports/ExpenseModal';
import DeliveryReport from './DeliveryReport';
import ModernDatePicker from '../components/Calendar';

const toLocalDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const todayStr = toLocalDate(new Date());
const defaultStart = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-01`;

export default function Reports() {
    const { sales, users, clients, expenses, currentUser, ticketConfig, showToast, showConfirm, clearAllSales, addExpense, deleteExpense, deleteSale } = useStore();
    const isChofer = currentUser?.role === 'chofer';
    const isAdmin  = currentUser?.role === 'admin';

    // ── Todos los hooks ANTES del return condicional ──────────────────────
    const [filterUser,       setFilterUser]       = useState('');
    const [fromDate,         setFromDate]         = useState(defaultStart);
    const [toDate,           setToDate]           = useState(todayStr);
    const [selectedSale,     setSelectedSale]     = useState(null);
    const [btPrinting,       setBtPrinting]       = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseDesc,      setExpenseDesc]      = useState('');
    const [expenseAmount,    setExpenseAmount]    = useState('');

    // ── Filtro de fechas ─────────────────────────────────────────────────
    const filterStart = fromDate;
    const filterEnd   = toDate >= fromDate ? toDate : fromDate;

    const inDateFilter = useCallback((dateStr) => {
        if (!dateStr) return false;
        const d = toLocalDate(dateStr);
        return d >= filterStart && d <= filterEnd;
    }, [filterStart, filterEnd]);

    // ── Datos filtrados ──────────────────────────────────────────────────
    const effectiveFilterUser = isAdmin ? filterUser : currentUser?.id;

    const userSales = useMemo(() =>
        effectiveFilterUser
            ? (sales || []).filter(s => s?.userId === effectiveFilterUser)
            : (sales || [])
    , [sales, effectiveFilterUser]);

    const daySales   = userSales.filter(s => s?.date && inDateFilter(s.date));
    const sortedSales = [...daySales].reverse();

    const dayTotal = daySales.reduce((s, sale) => s + (Number(sale?.total) || 0), 0);
    const dayCount = daySales.length;

    const efectivoTotal = sortedSales.filter(s => (s.paymentMethod || s.paymentmethod || 'efectivo') !== 'transferencia').reduce((acc, s) => acc + Number(s.total), 0);
    const transferTotal = sortedSales.filter(s => (s.paymentMethod || s.paymentmethod) === 'transferencia').reduce((acc, s) => acc + Number(s.total), 0);
    const granTotal     = sortedSales.reduce((acc, s) => acc + Number(s.total), 0);

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
    const productTotals    = Object.entries(productMap).sort((a, b) => b[1].money - a[1].money);
    const grandTotalPieces = productTotals.reduce((s, [, v]) => s + v.pieces, 0);
    const grandTotalQty    = productTotals.reduce((s, [, v]) => s + v.qty, 0);
    const grandTotalMoney  = productTotals.reduce((s, [, v]) => s + v.money, 0);

    const dayExpenses = useMemo(() => {
        if (isAdmin) return [];
        return (expenses || []).filter(e =>
            (e.userId || e.userid) === currentUser?.id && inDateFilter(e.date)
        );
    }, [expenses, inDateFilter, currentUser, isAdmin]);

    const totalExpenses = dayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const operatorPDFData = useMemo(() => {
        if (isAdmin) return null;
        const ventasPDF = (sales || []).filter(s => s?.userId === currentUser?.id && inDateFilter(s.date));
        const fechaLabel = fromDate === toDate
            ? new Date(fromDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            : `${new Date(fromDate + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – ${new Date(toDate + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        const clientMap = {};
        ventasPDF.forEach(sale => {
            const client = clients.find(c => c.id === sale.clientId);
            const key = sale.clientId || '__general__';
            if (!clientMap[key]) clientMap[key] = { name: client?.name || 'General', pieces: 0, kg: 0, money: 0 };
            (sale.items || []).forEach(it => {
                clientMap[key].pieces += Number(it.pieces) || 0;
                if ((it.unit || '').toLowerCase() === 'kg') clientMap[key].kg += Number(it.quantity) || 0;
                clientMap[key].money += (Number(it.quantity) || 0) * (Number(it.price) || 0);
            });
        });
        const clientRows   = Object.values(clientMap).sort((a, b) => b.money - a.money);
        const expensesForDay = (expenses || []).filter(e => (e.userId || e.userid) === currentUser?.id && inDateFilter(e.date));
        const totalMoney   = clientRows.reduce((s, r) => s + r.money, 0);
        const expTotal     = expensesForDay.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return {
            fechaLabel, ventasCount: ventasPDF.length, clientRows,
            totalPieces: clientRows.reduce((s, r) => s + r.pieces, 0),
            totalKg:     clientRows.reduce((s, r) => s + r.kg, 0),
            totalMoney, expenses: expensesForDay, totalExpenses: expTotal, netTotal: totalMoney - expTotal,
        };
    }, [isAdmin, inDateFilter, fromDate, toDate, sales, clients, currentUser, expenses]);

    const generateImage = async () => generateReportImage({ operatorPDFData, sales, clients, currentUser, repDateFilter: filterStart, todayStr, ticketConfig });
    const generatePDF   = async () => generateReportPDF({ operatorPDFData, sales, clients, currentUser, repDateFilter: filterStart, todayStr, ticketConfig });

    if (isChofer) return <DeliveryReport />;

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

    const periodLabel = fromDate === toDate
        ? new Date(fromDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
        : `${new Date(fromDate + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} → ${new Date(toDate + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    const datePickers = (
        <div className="grid grid-cols-2 gap-3">
            <ModernDatePicker label="Desde" value={fromDate} onChange={setFromDate} />
            <ModernDatePicker label="Hasta" value={toDate} onChange={setToDate} />
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto animate-in fade-in duration-300">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-4 mb-5">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">Reporte de Ventas</h1>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">{ticketConfig?.businessName || 'Purificadora Mar de Hielo'}</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => showConfirm({
                            message: '¿Vaciar TODAS las ventas? Esta acción no se puede deshacer.',
                            confirmText: 'Vaciar todo', danger: true,
                            onConfirm: async () => { await clearAllSales(); showToast('Ventas eliminadas', 'success'); },
                        })}
                        className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 rounded-2xl flex items-center justify-center active:scale-95 transition-all hover:border-red-400 hover:text-red-400 shadow-sm"
                        title="Vaciar todas las ventas"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>

            {/* ── ADMIN: filtro usuario + calendario ── */}
            {isAdmin && (
                <div className="space-y-3 mb-2">
                    {/* Pills repartidores */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none mb-2">
                        <button
                            onClick={() => setFilterUser('')}
                            className={`shrink-0 px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest transition-all ${!filterUser ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                        >Todos</button>
                        {users.filter(u => u.pin && (u.name || '').toLowerCase() !== 'administrador').map(u => (
                            <button key={u.id} onClick={() => setFilterUser(u.id)}
                                className={`shrink-0 px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest transition-all ${filterUser === u.id ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                            >{u.name.split(' ')[0]}</button>
                        ))}
                    </div>

                    {datePickers}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -z-0"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Ingresos</p>
                            <p className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-none tracking-tighter relative z-10">${dayTotal.toFixed(2)}</p>
                            <p className="text-[10px] text-slate-500 font-bold mt-2 capitalize truncate relative z-10">{periodLabel}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-slate-100 dark:bg-slate-700/50 rounded-bl-full -z-0"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Transacciones</p>
                            <p className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-none tracking-tighter relative z-10">{dayCount}</p>
                            <p className="text-[10px] text-slate-500 font-bold mt-2 relative z-10">{dayCount === 1 ? 'venta' : 'ventas'}</p>
                        </div>
                    </div>

                    {/* Desglose productos */}
                    {productTotals.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-5">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Desglose por Producto</p>
                                <p className="text-[10px] font-bold text-slate-400 capitalize truncate max-w-[120px]">{periodLabel}</p>
                            </div>
                            <div className="grid grid-cols-[1fr_52px_52px_84px] px-5 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cant.</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Pzas</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Importe</p>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-700/30">
                                {productTotals.map(([name, { qty, pieces, money, unit }]) => (
                                    <div key={name} className="grid grid-cols-[1fr_52px_52px_84px] items-center px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                <span className="text-xs font-black uppercase">{name.charAt(0)}</span>
                                            </div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{name}</p>
                                        </div>
                                        <div className="text-right pr-1">
                                            <span className="text-sm font-black text-slate-700 dark:text-slate-300">{qty % 1 === 0 ? qty : qty.toFixed(2)}</span>
                                            <span className="text-[10px] text-slate-400 ml-1 font-bold">{unit === 'Kg' ? 'kg' : 'u'}</span>
                                        </div>
                                        <div className="text-right pr-1">
                                            {pieces > 0 ? <span className="text-sm font-black text-slate-800 dark:text-slate-200">{pieces}</span> : <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-base font-black text-slate-900 dark:text-white">${money.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-[1fr_52px_52px_84px] items-center px-5 py-4 bg-primary/5 dark:bg-primary/10 border-t border-primary/20">
                                <p className="text-[11px] font-black text-primary uppercase tracking-widest">TOTALES</p>
                                <div className="text-right pr-1"><span className="text-sm font-black text-slate-800 dark:text-slate-200">{grandTotalQty % 1 === 0 ? grandTotalQty : grandTotalQty.toFixed(2)}</span></div>
                                <div className="text-right pr-1"><span className="text-sm font-black text-slate-800 dark:text-slate-200">{grandTotalPieces}</span></div>
                                <div className="text-right"><span className="text-base font-black text-slate-900 dark:text-white">${grandTotalMoney.toFixed(2)}</span></div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── OPERADOR: calendario + botones ── */}
            {!isAdmin && (
                <div className="mb-5 space-y-4">
                    {datePickers}
                    <div className="flex items-center justify-between py-1 bg-white dark:bg-slate-800 rounded-3xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="px-2">
                            <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest capitalize truncate max-w-[150px]">{periodLabel}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1">{sortedSales.length} {sortedSales.length === 1 ? 'venta registrada' : 'ventas registradas'}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={generateImage} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs px-4 py-2.5 rounded-2xl active:scale-95 transition-all uppercase tracking-wide hover:bg-slate-200 dark:hover:bg-slate-600">
                                <span className="material-symbols-outlined" style={{fontSize:16}}>image</span>IMG
                            </button>
                            <button onClick={generatePDF} className="flex items-center gap-1.5 bg-primary text-white font-black text-xs px-4 py-2.5 rounded-2xl active:scale-95 transition-all uppercase tracking-wide hover:bg-primary/90 shadow-sm shadow-primary/30">
                                <span className="material-symbols-outlined" style={{fontSize:16}}>picture_as_pdf</span>PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── LISTA DE VENTAS ── */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        Transacciones
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sortedSales.length} {sortedSales.length === 1 ? 'registro' : 'registros'}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-5">
                    <div className="grid grid-cols-[80px_1fr_90px] px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isAdmin ? 'Hora' : 'Fecha'}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalle</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</span>
                    </div>

                    <div className="divide-y divide-slate-50 dark:divide-slate-700/30">
                        {sortedSales.length === 0 && (
                            <div className="text-center py-12">
                                <p className="font-bold text-sm text-slate-400">{isAdmin ? 'Sin ventas en el período seleccionado' : 'Sin transacciones registradas'}</p>
                            </div>
                        )}
                        {sortedSales.map((sale, i) => {
                            const client   = clients.find(c => c.id === sale.clientId);
                            const seller   = sale.userId === 'admin' ? 'Admin' : users.find(u => u.id === sale.userId)?.name?.split(' ')[0] || '—';
                            const dateObj  = new Date(sale.date);
                            const fecha    = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
                            const hora     = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                            const pm       = sale.paymentMethod || sale.paymentmethod || 'efectivo';
                            const isTransfer = pm === 'transferencia';
                            return (
                                <button key={sale.id} onClick={() => setSelectedSale(sale)}
                                    style={{ animationDelay: `${i * 20}ms` }}
                                    className="w-full grid grid-cols-[80px_1fr_90px] items-center text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors animate-in fade-in"
                                >
                                    <div className="px-5 py-4 border-r border-slate-50 dark:border-slate-700/30">
                                        {isAdmin ? (
                                            <><p className="text-sm font-black text-slate-800 dark:text-slate-200">{hora}</p><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{seller}</p></>
                                        ) : (
                                            <><p className="text-sm font-black text-slate-800 dark:text-slate-200">{fecha}</p><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{hora}</p></>
                                        )}
                                    </div>
                                    <div className="min-w-0 px-4 py-4">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug truncate">{client?.name || 'General'}</p>
                                        {sale.items?.length > 0 && <p className="text-[10px] text-slate-400 font-bold leading-tight truncate mt-1">{sale.items.map(it => it.name).join(', ')}</p>}
                                        <div className="mt-2.5">
                                            <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isTransfer ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                                                <span className="material-symbols-outlined" style={{fontSize:12}}>{isTransfer ? 'account_balance' : 'payments'}</span>
                                                {isTransfer ? 'Transf.' : 'Efectivo'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right px-5 py-4 border-l border-slate-50 dark:border-slate-700/30">
                                        <p className="text-base font-black text-slate-900 dark:text-white">${Number(sale.total).toFixed(2)}</p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{sale.items?.length || 0} art.</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Resumen pago */}
                {sortedSales.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-5">
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Resumen de Cobro</p>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-slate-700/30">
                            {efectivoTotal > 0 && (
                                <div className="flex items-center justify-between px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                            <span className="material-symbols-outlined" style={{fontSize:20}}>payments</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Efectivo</span>
                                    </div>
                                    <span className="text-base font-black text-slate-900 dark:text-white">${efectivoTotal.toFixed(2)}</span>
                                </div>
                            )}
                            {transferTotal > 0 && (
                                <div className="flex items-center justify-between px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                            <span className="material-symbols-outlined" style={{fontSize:20}}>account_balance</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Transferencia</span>
                                    </div>
                                    <span className="text-base font-black text-slate-900 dark:text-white">${transferTotal.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between px-5 py-5 bg-primary/5 dark:bg-primary/10 border-t border-primary/20">
                                <span className="text-[11px] font-black text-primary uppercase tracking-widest">Total del Período</span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">${granTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── GASTOS (solo operador) ── */}
            {!isAdmin && (
                <div className="mb-24">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Gastos</p>
                            <button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm">
                                <Plus size={14} />Agregar
                            </button>
                        </div>
                        {dayExpenses.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 font-bold py-8">Sin gastos registrados</p>
                        ) : (
                            <div className="divide-y divide-slate-50 dark:divide-slate-700/30">
                                {dayExpenses.map(exp => (
                                    <div key={exp.id} className="flex items-center gap-4 px-5 py-4 bg-white dark:bg-slate-800 animate-in fade-in">
                                        <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined" style={{fontSize:20}}>receipt_long</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{exp.description}</p>
                                        </div>
                                        <p className="text-base font-black text-orange-600 dark:text-orange-400 shrink-0">-${Number(exp.amount).toFixed(2)}</p>
                                        <button onClick={() => deleteExpense(exp.id)} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90 transition-all ml-1 shrink-0"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50">
                            <div className="flex items-center justify-between px-5 py-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ventas Totales</span>
                                <span className="text-base font-black text-slate-800 dark:text-slate-200">${dayTotal.toFixed(2)}</span>
                            </div>
                            {totalExpenses > 0 && (
                                <div className="flex items-center justify-between px-5 py-4">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gastos Totales</span>
                                    <span className="text-base font-black text-orange-600 dark:text-orange-400">-${totalExpenses.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between px-5 py-5 bg-primary/5 dark:bg-primary/10">
                                <span className="text-[11px] font-black text-primary uppercase tracking-widest">Neto del Período</span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white">${(dayTotal - totalExpenses).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modales */}
            {showExpenseModal && (
                <ExpenseModal
                    expenseDesc={expenseDesc} setExpenseDesc={setExpenseDesc}
                    expenseAmount={expenseAmount} setExpenseAmount={setExpenseAmount}
                    setShowExpenseModal={setShowExpenseModal}
                    addExpense={addExpense} currentUser={currentUser}
                    repDateFilter={filterStart} showToast={showToast}
                />
            )}

            <SaleDetailModal
                selectedSale={selectedSale} clients={clients} users={users}
                btPrinting={btPrinting} handleBTPrint={handleBTPrint}
                deleteSale={deleteSale} setSelectedSale={setSelectedSale} showConfirm={showConfirm}
            />

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
                        <div>Usuario: {selectedSale.userId === 'admin' ? 'Administrador' : (users.find(u => u.id === selectedSale.userId)?.name || 'Usuario')}</div>
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
