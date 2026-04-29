import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { printTicket } from '../lib/bluetoothPrinter';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

const toLocalDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const todayStr = toLocalDate(new Date());
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_SHORT = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

export default function Reports() {
    const { sales, users, clients, expenses, currentUser, ticketConfig, showToast, showConfirm, clearAllSales, addExpense, deleteExpense } = useStore();
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

    // Generar PDF directo con jsPDF (carga diferida para no aumentar el bundle inicial)
    const generatePDF = async () => {
        if (!operatorPDFData) return;
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const businessName = (ticketConfig?.businessName || 'LACTEOS LA TOBA').toUpperCase();

        // Paleta de colores clara
        const C_HEAD_BG   = [241, 245, 249]; // slate-100
        const C_HEAD_TEXT = [30,  41,  59];  // slate-800
        const C_FOOT_BG   = [226, 232, 240]; // slate-200
        const C_BORDER    = [203, 213, 225]; // slate-300
        const C_ALT       = [248, 250, 252]; // slate-50
        const C_RED_BG    = [254, 226, 226]; // red-100
        const C_RED_TEXT  = [153, 27,  27];  // red-800

        // ── Encabezado del documento ──────────────────────────────────────
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text(businessName, pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(11); doc.setFont('helvetica', 'normal');
        doc.text('Reporte de Ventas del Día', pageWidth / 2, 28, { align: 'center' });
        doc.setFontSize(9);
        const fechaCap = operatorPDFData.fechaLabel.charAt(0).toUpperCase() + operatorPDFData.fechaLabel.slice(1);
        doc.text(fechaCap, pageWidth / 2, 35, { align: 'center' });
        doc.text(`Repartidor: ${currentUser?.name || ''}`, pageWidth / 2, 41, { align: 'center' });
        doc.text(`${operatorPDFData.ventasCount} venta${operatorPDFData.ventasCount !== 1 ? 's' : ''} registrada${operatorPDFData.ventasCount !== 1 ? 's' : ''}`, pageWidth / 2, 47, { align: 'center' });

        // ── Filas por venta individual con método de pago ─────────────────
        const fechaPDF  = repDateFilter || todayStr;
        const ventasPDF = (sales || []).filter(s =>
            s?.userId === currentUser?.id && toLocalDate(s.date) === fechaPDF
        );

        const saleRows = ventasPDF.map(sale => {
            const client = clients.find(c => c.id === sale.clientId);
            const pieces = (sale.items || []).reduce((s, it) => s + (Number(it.pieces) || 0), 0);
            const kg     = (sale.items || [])
                .filter(it => (it.unit || '').toLowerCase() === 'kg')
                .reduce((s, it) => s + (Number(it.quantity) || 0), 0);
            const pm = (sale.paymentMethod || sale.paymentmethod || 'efectivo') === 'transferencia'
                ? 'Transferencia' : 'Efectivo';
            return [
                client?.name || 'General',
                pieces > 0 ? String(pieces) : '—',
                kg > 0 ? kg.toFixed(2) : '—',
                `$${Number(sale.total).toFixed(2)}`,
                pm,
            ];
        });

        const footPieces = saleRows.reduce((s, r) => s + (r[1] === '—' ? 0 : Number(r[1])), 0);
        const footKg     = saleRows.reduce((s, r) => s + (r[2] === '—' ? 0 : Number(r[2])), 0);

        // Alineación por columna (índice → halign)
        const COL_ALIGN = ['left', 'center', 'center', 'right', 'center'];
        const fixAlign = (data) => {
            data.cell.styles.halign = COL_ALIGN[data.column.index] || 'left';
        };

        autoTable(doc, {
            startY: 54,
            margin: { left: 14, right: 14 },
            head: [['Cliente', 'Piezas', 'Kg', 'Importe', 'Forma de Pago']],
            body: saleRows.length > 0
                ? saleRows
                : [['Sin ventas registradas', '', '', '', '']],
            foot: [[
                'TOTAL',
                footPieces > 0 ? String(footPieces) : '—',
                footKg     > 0 ? footKg.toFixed(2)  : '—',
                `$${operatorPDFData.totalMoney.toFixed(2)}`,
                '',
            ]],
            headStyles: { fillColor: C_HEAD_BG, textColor: C_HEAD_TEXT, fontStyle: 'bold', fontSize: 9, lineColor: C_BORDER, lineWidth: 0.3 },
            footStyles: { fillColor: C_FOOT_BG, textColor: C_HEAD_TEXT, fontStyle: 'bold', fontSize: 9, lineColor: C_BORDER, lineWidth: 0.3 },
            bodyStyles: { fontSize: 9, lineColor: C_BORDER, lineWidth: 0.2 },
            alternateRowStyles: { fillColor: C_ALT },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 16 },
                2: { cellWidth: 16 },
                3: { cellWidth: 26 },
                4: { cellWidth: 28 },
            },
            didParseCell: fixAlign,
        });

        // ── Resumen por forma de pago ─────────────────────────────────────
        const efectivoTotal      = ventasPDF
            .filter(s => (s.paymentMethod || s.paymentmethod || 'efectivo') !== 'transferencia')
            .reduce((s, sale) => s + Number(sale.total), 0);
        const transferenciaTotal = ventasPDF
            .filter(s => (s.paymentMethod || s.paymentmethod) === 'transferencia')
            .reduce((s, sale) => s + Number(sale.total), 0);

        const pmY = doc.lastAutoTable.finalY + 8;
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C_HEAD_TEXT);
        doc.text('Resumen por Forma de Pago', 14, pmY);

        const C_GREEN_BG   = [220, 252, 231]; // emerald-100
        const C_GREEN_TEXT = [6,   95,  70];  // emerald-900
        const C_BLUE_BG    = [219, 234, 254]; // blue-100
        const C_BLUE_TEXT  = [30,  64,  175]; // blue-800

        autoTable(doc, {
            startY: pmY + 3,
            margin: { left: 14, right: 14 },
            body: [
                ['💵  Efectivo',      `$${efectivoTotal.toFixed(2)}`],
                ['🏦  Transferencia', `$${transferenciaTotal.toFixed(2)}`],
            ],
            foot: [['TOTAL VENTAS', `$${operatorPDFData.totalMoney.toFixed(2)}`]],
            bodyStyles: { fontSize: 9, lineColor: C_BORDER, lineWidth: 0.2 },
            footStyles: { fillColor: C_FOOT_BG, textColor: C_HEAD_TEXT, fontStyle: 'bold', fontSize: 9, lineColor: C_BORDER, lineWidth: 0.3 },
            alternateRowStyles: { fillColor: C_ALT },
            columnStyles: {
                0: { cellWidth: 'auto', halign: 'left'  },
                1: { cellWidth: 36,     halign: 'right' },
            },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    if (data.row.index === 0) {
                        data.cell.styles.fillColor = C_GREEN_BG;
                        data.cell.styles.textColor = C_GREEN_TEXT;
                    } else {
                        data.cell.styles.fillColor = C_BLUE_BG;
                        data.cell.styles.textColor = C_BLUE_TEXT;
                    }
                }
                if (data.section === 'foot') {
                    data.cell.styles.halign = data.column.index === 1 ? 'right' : 'left';
                }
            },
        });

        // ── Gastos del día ────────────────────────────────────────────────
        if (operatorPDFData.expenses.length > 0) {
            const gY = doc.lastAutoTable.finalY + 8;
            doc.setFontSize(9); doc.setFont('helvetica', 'bold');
            doc.setTextColor(...C_RED_TEXT);
            doc.text('Gastos del Día', 14, gY);
            doc.setTextColor(0, 0, 0);
            autoTable(doc, {
                startY: gY + 3,
                margin: { left: 14, right: 14 },
                head: [['Descripción', 'Monto']],
                body: operatorPDFData.expenses.map(e => [e.description, `$${Number(e.amount).toFixed(2)}`]),
                foot: [['Total Gastos', `$${operatorPDFData.totalExpenses.toFixed(2)}`]],
                headStyles: { fillColor: C_RED_BG, textColor: C_RED_TEXT, fontStyle: 'bold', fontSize: 9, lineColor: [252, 165, 165], lineWidth: 0.3 },
                footStyles: { fillColor: C_RED_BG, textColor: C_RED_TEXT, fontStyle: 'bold', fontSize: 9, lineColor: [252, 165, 165], lineWidth: 0.3 },
                bodyStyles: { fontSize: 9, lineColor: C_BORDER, lineWidth: 0.2 },
                alternateRowStyles: { fillColor: [255, 241, 242] },
                columnStyles: {
                    0: { cellWidth: 'auto', halign: 'left'  },
                    1: { cellWidth: 30,     halign: 'right' },
                },
                didParseCell: (data) => {
                    if (data.section === 'foot') data.cell.styles.halign = data.column.index === 1 ? 'right' : 'left';
                },
            });
        }

        // ── Total neto ────────────────────────────────────────────────────
        const netY = doc.lastAutoTable.finalY + 10;
        doc.setDrawColor(...C_BORDER);
        doc.setLineWidth(0.4);
        doc.line(14, netY - 3, pageWidth - 14, netY - 3);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C_HEAD_TEXT);
        doc.text('Total Neto del Día:', 14, netY + 3);
        doc.text(`$${operatorPDFData.netTotal.toFixed(2)}`, pageWidth - 14, netY + 3, { align: 'right' });

        // ── Pie ───────────────────────────────────────────────────────────
        doc.setFontSize(8); doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text(ticketConfig?.footerLine1 || '¡Gracias por su trabajo!', pageWidth / 2, netY + 14, { align: 'center' });

        const fileName = `Reporte_${(currentUser?.name || 'Repartidor').replace(/\s+/g, '_')}_${repDateFilter || todayStr}.pdf`;
        doc.save(fileName);
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
                        <div className="bg-white rounded-2xl p-3 border-2 border-blue-200 shadow-sm">
                            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Total del día</p>
                            <p className="text-xl font-black text-blue-700 leading-none">${dayTotal.toFixed(2)}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5 capitalize truncate">{selDateLabel}</p>
                        </div>
                        <div className="bg-white rounded-2xl p-3 border-2 border-blue-100 shadow-sm">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Transacciones</p>
                            <p className="text-xl font-black text-slate-800 leading-none">{dayCount}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">{dayCount === 1 ? 'venta registrada' : 'ventas registradas'}</p>
                        </div>
                    </div>

                    {/* ── DESGLOSE POR PRODUCTO ── */}
                    {productTotals.length > 0 && (
                        <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm overflow-hidden">
                            {/* Encabezado */}
                            <div className="grid grid-cols-[1fr_52px_52px_84px] px-3 pt-3 pb-2 border-b border-blue-100 bg-blue-50">
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Producto</p>
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest text-right">Cant.</p>
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest text-right">Pzas</p>
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest text-right">Importe</p>
                            </div>

                            {/* Filas */}
                            <div className="divide-y divide-slate-100">
                                {productTotals.map(([name, { qty, pieces, money, unit }]) => (
                                    <div key={name} className="grid grid-cols-[1fr_52px_52px_84px] items-center px-3 py-2.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                                <span className="text-[9px] font-black text-blue-500 uppercase">{name.charAt(0)}</span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-700 truncate">{name}</p>
                                        </div>
                                        <div className="text-right pr-1">
                                            <span className="text-xs font-black text-slate-700">{qty % 1 === 0 ? qty : qty.toFixed(2)}</span>
                                            <span className="text-[9px] text-slate-400 ml-0.5">{unit === 'Kg' ? 'kg' : 'u'}</span>
                                        </div>
                                        <div className="text-right pr-1">
                                            {pieces > 0
                                                ? <span className="text-xs font-black text-blue-600">{pieces}</span>
                                                : <span className="text-slate-300 text-xs">—</span>
                                            }
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-black text-slate-800">${money.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Fila de totales */}
                            <div className="grid grid-cols-[1fr_52px_52px_84px] items-center px-3 py-3 bg-blue-50 border-t-2 border-blue-200 rounded-b-2xl">
                                <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest">TOTALES</p>
                                <div className="text-right pr-1">
                                    <span className="text-sm font-black text-slate-700">{grandTotalQty % 1 === 0 ? grandTotalQty : grandTotalQty.toFixed(2)}</span>
                                </div>
                                <div className="text-right pr-1">
                                    <span className="text-sm font-black text-blue-600">{grandTotalPieces}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-black text-blue-700">${grandTotalMoney.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* ── CALENDARIO FIJO + BOTÓN PDF (OPERADOR) ── */}
            {!isAdmin && (
                <div className="px-4 md:px-8 mb-3 space-y-2">
                    {/* Calendario */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3">
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
                        <div className="grid grid-cols-7 mb-1">
                            {DAYS_SHORT.map(d => (
                                <div key={d} className="text-center text-[9px] font-black text-slate-300 uppercase">{d}</div>
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
                                        className={`flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all active:scale-90
                                            ${isSelected ? 'bg-primary text-white shadow-sm shadow-primary/30'
                                            : isToday    ? 'ring-2 ring-primary/30 text-primary font-black'
                                            : 'hover:bg-slate-50 text-slate-700'}`}
                                    >
                                        <span className={`text-[12px] font-black leading-none ${isSelected ? 'text-white' : ''}`}>{day}</span>
                                        {hasSales && <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white/70' : 'bg-emerald-500'}`} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Info + PDF */}
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest capitalize">
                            {new Date(repDateFilter + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                            {' · '}{sortedSales.length} {sortedSales.length === 1 ? 'venta' : 'ventas'}
                        </p>
                        <button
                            onClick={generatePDF}
                            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white font-black text-xs px-4 py-2 rounded-xl shadow-md shadow-red-500/25 active:scale-95 transition-all uppercase tracking-wide"
                        >
                            <span className="material-symbols-outlined" style={{fontSize:16}}>picture_as_pdf</span>
                            PDF
                        </button>
                    </div>
                </div>
            )}

            {/* ── LISTA DE VENTAS ── */}
            <div className="px-4 md:px-8 pb-6">
                {/* Cabecera columnas */}
                <div className="grid grid-cols-[72px_1fr_90px] gap-2 px-3 mb-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {isAdmin ? 'Hora' : 'Fecha'}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Cliente / Productos</span>
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
                        const pm      = sale.paymentMethod || sale.paymentmethod || 'efectivo';
                        const isTransfer = pm === 'transferencia';

                        return (
                            <button
                                key={sale.id}
                                onClick={() => setSelectedSale(sale)}
                                style={{ animationDelay: `${i * 25}ms` }}
                                className="w-full grid grid-cols-[72px_1fr_90px] gap-2 items-start bg-white rounded-2xl px-3 py-3 shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md active:scale-[0.98] transition-all text-left animate-in fade-in"
                            >
                                <div className="shrink-0 pt-0.5">
                                    {isAdmin ? (
                                        <>
                                            <p className="text-xs font-black text-slate-800 leading-tight">{hora}</p>
                                            <p className="text-[10px] font-bold text-blue-500 leading-tight mt-0.5">{seller}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs font-black text-slate-800 leading-tight">{fecha}</p>
                                            <p className="text-[10px] font-semibold text-slate-400 leading-tight mt-0.5">{hora}</p>
                                        </>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 leading-snug">{client?.name || 'General'}</p>
                                    {sale.items?.length > 0 && (
                                        <p className="text-[10px] text-slate-400 font-medium leading-tight truncate">
                                            {sale.items.map(it => it.name).join(', ')}
                                        </p>
                                    )}
                                    <span className={`inline-flex items-center gap-1 mt-1 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                                        isTransfer ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}>
                                        <span className="material-symbols-outlined" style={{fontSize:10}}>{isTransfer ? 'account_balance' : 'payments'}</span>
                                        {isTransfer ? 'Transferencia' : 'Efectivo'}
                                    </span>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-base font-black text-slate-800 whitespace-nowrap">${Number(sale.total).toFixed(2)}</p>
                                    <p className="text-[9px] text-slate-400 font-bold">{sale.items?.length || 0} art.</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* ── RESUMEN TOTAL POR MÉTODO DE PAGO ── */}
                {sortedSales.length > 0 && (
                    <div className="mt-3 mb-24 bg-white rounded-2xl border-2 border-blue-200 overflow-hidden shadow-sm">
                        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Resumen de Cobro</p>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {efectivoTotal > 0 && (
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-emerald-500" style={{fontSize:16}}>payments</span>
                                        <span className="text-xs font-bold text-slate-600">Efectivo</span>
                                    </div>
                                    <span className="text-sm font-black text-emerald-700">${efectivoTotal.toFixed(2)}</span>
                                </div>
                            )}
                            {transferTotal > 0 && (
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-blue-500" style={{fontSize:16}}>account_balance</span>
                                        <span className="text-xs font-bold text-slate-600">Transferencia</span>
                                    </div>
                                    <span className="text-sm font-black text-blue-700">${transferTotal.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between px-4 py-3 bg-blue-50">
                                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">Total del Día</span>
                                <span className="text-base font-black text-blue-700">${granTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── GASTOS DEL DÍA (solo operador) ── */}
            {!isAdmin && (
                <div className="px-4 md:px-8 pb-24">
                    <div className="flex items-center justify-between mb-2 mt-2">
                        <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Gastos del Día</p>
                        <button
                            onClick={() => setShowExpenseModal(true)}
                            className="w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center active:scale-90 transition-all shadow-sm shadow-primary/25"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {dayExpenses.length === 0 ? (
                        <p className="text-center text-xs text-slate-300 font-medium py-4">Sin gastos registrados</p>
                    ) : (
                        <div className="space-y-1.5">
                            {dayExpenses.map(exp => (
                                <div key={exp.id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100 animate-in fade-in">
                                    <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-red-400" style={{fontSize:16}}>receipt_long</span>
                                    </div>
                                    <p className="flex-1 text-sm font-bold text-slate-700 truncate">{exp.description}</p>
                                    <p className="text-sm font-black text-red-500 shrink-0">-${Number(exp.amount).toFixed(2)}</p>
                                    <button
                                        onClick={() => deleteExpense(exp.id)}
                                        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 active:scale-90 transition-all rounded-lg"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}

                            {/* Resumen de totales */}
                            <div className="mt-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 grid grid-cols-2 gap-2 shadow-sm">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ventas</p>
                                    <p className="text-base font-black text-emerald-600">${dayTotal.toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Gastos</p>
                                    <p className="text-base font-black text-red-500">-${totalExpenses.toFixed(2)}</p>
                                </div>
                                <div className="col-span-2 border-t border-slate-100 pt-2 flex items-center justify-between">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Neto del día</p>
                                    <p className="text-lg font-black text-slate-800">${(dayTotal - totalExpenses).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal agregar gasto */}
            {showExpenseModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-4">Agregar Gasto</h3>
                        <div className="space-y-3 mb-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Descripción</label>
                                <input
                                    type="text"
                                    value={expenseDesc}
                                    onChange={e => setExpenseDesc(e.target.value)}
                                    placeholder="Ej: Gasto"
                                    autoFocus
                                    className="w-full bg-slate-50 dark:bg-slate-700 rounded-2xl px-4 py-3 font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Monto ($)</label>
                                <input
                                    type="number"
                                    value={expenseAmount}
                                    onChange={e => setExpenseAmount(e.target.value)}
                                    placeholder="0.00"
                                    inputMode="decimal"
                                    className="w-full bg-slate-50 dark:bg-slate-700 rounded-2xl px-4 py-3 font-black text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 text-lg"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowExpenseModal(false); setExpenseDesc(''); setExpenseAmount(''); }}
                                className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm active:scale-95 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    const amount = Number(expenseAmount);
                                    if (!expenseDesc.trim() || !amount || amount <= 0) { showToast('Completa descripción y monto', 'warning'); return; }
                                    addExpense({
                                        userId: currentUser.id,
                                        date: new Date(repDateFilter + 'T12:00:00').toISOString(),
                                        description: expenseDesc.trim(),
                                        amount,
                                    });
                                    setShowExpenseModal(false);
                                    setExpenseDesc('');
                                    setExpenseAmount('');
                                }}
                                className="flex-1 py-3 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

                                {/* Forma de pago */}
                                {(() => {
                                    const pm = selectedSale.paymentMethod || selectedSale.paymentmethod || 'efectivo';
                                    const isTransfer = pm === 'transferencia';
                                    return (
                                        <div className={`mx-4 mt-2 flex items-center gap-3 px-4 py-3 rounded-xl border ${isTransfer ? 'bg-blue-50 border-blue-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                            <span className="material-symbols-outlined" style={{fontSize:20, color: isTransfer ? '#3b82f6' : '#10b981'}}>
                                                {isTransfer ? 'account_balance' : 'payments'}
                                            </span>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Forma de Pago</p>
                                                <p className={`text-sm font-black ${isTransfer ? 'text-blue-700' : 'text-emerald-700'}`}>
                                                    {isTransfer ? 'Transferencia' : 'Efectivo'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}

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
