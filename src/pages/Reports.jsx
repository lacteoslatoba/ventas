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
        if (!operatorPDFData) return;

        const { default: html2canvas } = await import('html2canvas');

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
            return [client?.name || 'General', pieces > 0 ? pieces : '—', kg > 0 ? kg.toFixed(2) : '—', `$${Number(sale.total).toFixed(2)}`, pm];
        });

        const footPieces  = saleRows.reduce((s, r) => s + (r[1] === '—' ? 0 : Number(r[1])), 0);
        const footKg      = saleRows.reduce((s, r) => s + (r[2] === '—' ? 0 : parseFloat(r[2])), 0);
        const efectivoImg = ventasPDF.filter(s => (s.paymentMethod || s.paymentmethod || 'efectivo') !== 'transferencia').reduce((s, x) => s + Number(x.total), 0);
        const transferImg = ventasPDF.filter(s => (s.paymentMethod || s.paymentmethod) === 'transferencia').reduce((s, x) => s + Number(x.total), 0);
        const fechaCap    = operatorPDFData.fechaLabel.charAt(0).toUpperCase() + operatorPDFData.fechaLabel.slice(1);
        const bizName     = (ticketConfig?.businessName || 'LACTEOS LA TOBA').toUpperCase();

        const esc = t => String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

        const tableHTML = (headers, rows, foot, colStyles) => `
            <table style="width:100%;border-collapse:collapse;margin-bottom:14px;border:1px solid #000;font-family:Arial,sans-serif">
                <thead><tr>${headers.map((h,i) => `<th style="background:#000;color:#fff;font-size:11px;font-weight:700;padding:10px 12px;text-align:${colStyles[i]||'left'}">${esc(h)}</th>`).join('')}</tr></thead>
                <tbody>${rows.map((r,ri) => `<tr style="background:${ri%2===1?'#f8f8f8':'#fff'}">${r.map((c,i) => `<td style="font-size:12px;padding:8px 12px;color:#141414;border:0.5px solid #c8c8c8;text-align:${colStyles[i]||'left'}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
                <tfoot><tr style="border-top:2px solid #000">${foot.map((c,i) => `<td style="font-size:12px;font-weight:700;padding:9px 12px;background:#f8f8f8;border:0.5px solid #c8c8c8;text-align:${colStyles[i]||'left'}">${esc(c)}</td>`).join('')}</tr></tfoot>
            </table>`;

        const html = `
        <div style="width:794px;background:#fff;padding:44px;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;color:#141414">
            <div style="border-top:2px solid #000;margin-bottom:14px"></div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
                <div>
                    <div style="font-size:20px;font-weight:800;color:#141414;margin-bottom:4px">${esc(bizName)}</div>
                    <div style="font-size:11px;color:#787878">REPORTE DE VENTAS</div>
                </div>
                <div style="text-align:right;font-size:10px;color:#787878;line-height:1.8">
                    <div>${esc(fechaCap)}</div>
                    <div>Repartidor: ${esc(currentUser?.name || '')}</div>
                    <div>${operatorPDFData.ventasCount} venta${operatorPDFData.ventasCount !== 1 ? 's' : ''}</div>
                </div>
            </div>
            <div style="border-top:1px solid #000;margin-bottom:14px"></div>

            <div style="font-size:10px;font-weight:700;color:#787878;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">DETALLE DE VENTAS</div>
            ${tableHTML(
                ['Cliente','Piezas','Kg','Importe','Forma de Pago'],
                saleRows.length > 0 ? saleRows : [['Sin ventas registradas','','','','']],
                ['TOTAL', footPieces > 0 ? footPieces : '—', footKg > 0 ? footKg.toFixed(2) : '—', `$${operatorPDFData.totalMoney.toFixed(2)}`, ''],
                ['left','center','center','right','center']
            )}

            <div style="font-size:10px;font-weight:700;color:#787878;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">RESUMEN DE COBRO</div>
            ${tableHTML(
                ['Forma de Pago','Importe'],
                [['Efectivo',`$${efectivoImg.toFixed(2)}`],['Transferencia',`$${transferImg.toFixed(2)}`]],
                ['TOTAL VENTAS',`$${operatorPDFData.totalMoney.toFixed(2)}`],
                ['left','right']
            )}

            ${operatorPDFData.expenses.length > 0 ? `
            <div style="font-size:10px;font-weight:700;color:#787878;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">GASTOS DEL DÍA</div>
            ${tableHTML(
                ['Descripción','Monto'],
                operatorPDFData.expenses.map(e => [e.description, `$${Number(e.amount).toFixed(2)}`]),
                ['Total Gastos',`$${operatorPDFData.totalExpenses.toFixed(2)}`],
                ['left','right']
            )}` : ''}

            <div style="border-top:2px solid #000;padding-top:14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <span style="font-size:16px;font-weight:800">Total Neto del Día:</span>
                <span style="font-size:16px;font-weight:800">$${operatorPDFData.netTotal.toFixed(2)}</span>
            </div>
            <div style="border-top:0.5px solid #c8c8c8;padding-top:10px;text-align:center;font-size:10px;color:#787878;font-style:italic">
                ${esc(ticketConfig?.footerLine1 || '¡Gracias por su trabajo!')}
            </div>
        </div>`;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:794px';
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);

        try {
            const canvas = await html2canvas(wrapper.firstElementChild, {
                scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 794,
            });
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a   = document.createElement('a');
                a.href    = url;
                a.download = `Reporte_${(currentUser?.name || 'Repartidor').replace(/\s+/g,'_')}_${repDateFilter || todayStr}.png`;
                document.body.appendChild(a); a.click();
                document.body.removeChild(a); URL.revokeObjectURL(url);
            }, 'image/png');
        } finally {
            document.body.removeChild(wrapper);
        }
    };

    // Generar PDF directo con jsPDF (carga diferida para no aumentar el bundle inicial)
    const generatePDF = async () => {
        if (!operatorPDFData) return;
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const businessName = (ticketConfig?.businessName || 'LACTEOS LA TOBA').toUpperCase();

        // ── Paleta monocromática (mismo tema que la UI) ───────────────────
        const BLACK     = [0,   0,   0  ];
        const WHITE     = [255, 255, 255];
        const GRAY_50   = [248, 248, 248];
        const GRAY_200  = [200, 200, 200];
        const GRAY_400  = [120, 120, 120];
        const GRAY_900  = [20,  20,  20 ];

        // ── Encabezado ────────────────────────────────────────────────────
        // Línea superior negra
        doc.setDrawColor(...BLACK); doc.setLineWidth(0.8);
        doc.line(14, 12, pageWidth - 14, 12);

        doc.setFontSize(16); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GRAY_900);
        doc.text(businessName, 14, 22);

        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY_400);
        doc.text('REPORTE DE VENTAS', 14, 29);

        // Info derecha
        const fechaCap = operatorPDFData.fechaLabel.charAt(0).toUpperCase() + operatorPDFData.fechaLabel.slice(1);
        doc.setFontSize(8); doc.setTextColor(...GRAY_400);
        doc.text(fechaCap, pageWidth - 14, 22, { align: 'right' });
        doc.text(`Repartidor: ${currentUser?.name || ''}`, pageWidth - 14, 28, { align: 'right' });
        doc.text(`${operatorPDFData.ventasCount} venta${operatorPDFData.ventasCount !== 1 ? 's' : ''}`, pageWidth - 14, 34, { align: 'right' });

        // Línea separadora bajo encabezado
        doc.setDrawColor(...BLACK); doc.setLineWidth(0.5);
        doc.line(14, 37, pageWidth - 14, 37);

        // ── Filas por venta ───────────────────────────────────────────────
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

        const COL_ALIGN = ['left', 'center', 'center', 'right', 'center'];
        const fixAlign  = (data) => { data.cell.styles.halign = COL_ALIGN[data.column.index] || 'left'; };

        // Label sección
        doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GRAY_400);
        doc.text('DETALLE DE VENTAS', 14, 44);

        autoTable(doc, {
            startY: 46,
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
            headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: 'bold', fontSize: 9, lineColor: BLACK, lineWidth: 0.3 },
            footStyles: { fillColor: GRAY_50, textColor: GRAY_900, fontStyle: 'bold', fontSize: 9, lineColor: GRAY_200, lineWidth: 0.3 },
            bodyStyles: { fontSize: 9, textColor: GRAY_900, lineColor: GRAY_200, lineWidth: 0.2 },
            alternateRowStyles: { fillColor: GRAY_50 },
            tableLineColor: BLACK, tableLineWidth: 0.3,
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 16 },
                2: { cellWidth: 16 },
                3: { cellWidth: 26 },
                4: { cellWidth: 28 },
            },
            didParseCell: (data) => {
                fixAlign(data);
                if (data.section === 'foot' && data.row.index === 0) {
                    data.cell.styles.lineColor  = BLACK;
                    data.cell.styles.lineWidth  = { top: 0.6, right: 0.2, bottom: 0.2, left: 0.2 };
                }
            },
        });

        // ── Resumen por forma de pago ─────────────────────────────────────
        const efectivoTotal      = ventasPDF
            .filter(s => (s.paymentMethod || s.paymentmethod || 'efectivo') !== 'transferencia')
            .reduce((s, sale) => s + Number(sale.total), 0);
        const transferenciaTotal = ventasPDF
            .filter(s => (s.paymentMethod || s.paymentmethod) === 'transferencia')
            .reduce((s, sale) => s + Number(sale.total), 0);

        const pmY = doc.lastAutoTable.finalY + 7;
        doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GRAY_400);
        doc.text('RESUMEN DE COBRO', 14, pmY);

        autoTable(doc, {
            startY: pmY + 2,
            margin: { left: 14, right: 14 },
            head: [['Forma de Pago', 'Importe']],
            body: [
                ['Efectivo',      `$${efectivoTotal.toFixed(2)}`],
                ['Transferencia', `$${transferenciaTotal.toFixed(2)}`],
            ],
            foot: [['TOTAL VENTAS', `$${operatorPDFData.totalMoney.toFixed(2)}`]],
            headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: 'bold', fontSize: 9, lineColor: BLACK, lineWidth: 0.3 },
            footStyles: { fillColor: GRAY_50, textColor: GRAY_900, fontStyle: 'bold', fontSize: 9, lineColor: GRAY_200, lineWidth: 0.3 },
            bodyStyles: { fontSize: 9, textColor: GRAY_900, lineColor: GRAY_200, lineWidth: 0.2 },
            alternateRowStyles: { fillColor: GRAY_50 },
            tableLineColor: BLACK, tableLineWidth: 0.3,
            columnStyles: {
                0: { cellWidth: 'auto', halign: 'left'  },
                1: { cellWidth: 36,     halign: 'right' },
            },
            didParseCell: (data) => {
                if (data.section === 'foot') data.cell.styles.halign = data.column.index === 1 ? 'right' : 'left';
            },
        });

        // ── Gastos del día ────────────────────────────────────────────────
        if (operatorPDFData.expenses.length > 0) {
            const gY = doc.lastAutoTable.finalY + 7;
            doc.setFontSize(7); doc.setFont('helvetica', 'bold');
            doc.setTextColor(...GRAY_400);
            doc.text('GASTOS DEL DÍA', 14, gY);

            autoTable(doc, {
                startY: gY + 2,
                margin: { left: 14, right: 14 },
                head: [['Descripción', 'Monto']],
                body: operatorPDFData.expenses.map(e => [e.description, `$${Number(e.amount).toFixed(2)}`]),
                foot: [['Total Gastos', `$${operatorPDFData.totalExpenses.toFixed(2)}`]],
                headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: 'bold', fontSize: 9, lineColor: BLACK, lineWidth: 0.3 },
                footStyles: { fillColor: GRAY_50, textColor: GRAY_900, fontStyle: 'bold', fontSize: 9, lineColor: GRAY_200, lineWidth: 0.3 },
                bodyStyles: { fontSize: 9, textColor: GRAY_900, lineColor: GRAY_200, lineWidth: 0.2 },
                alternateRowStyles: { fillColor: GRAY_50 },
                tableLineColor: BLACK, tableLineWidth: 0.3,
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
        const netY = doc.lastAutoTable.finalY + 8;
        doc.setDrawColor(...BLACK); doc.setLineWidth(0.8);
        doc.line(14, netY, pageWidth - 14, netY);

        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GRAY_900);
        doc.text('Total Neto del Día:', 14, netY + 8);
        doc.text(`$${operatorPDFData.netTotal.toFixed(2)}`, pageWidth - 14, netY + 8, { align: 'right' });

        doc.setDrawColor(...GRAY_200); doc.setLineWidth(0.3);
        doc.line(14, netY + 12, pageWidth - 14, netY + 12);

        // ── Pie ───────────────────────────────────────────────────────────
        doc.setFontSize(7); doc.setFont('helvetica', 'italic');
        doc.setTextColor(...GRAY_400);
        doc.text(ticketConfig?.footerLine1 || '¡Gracias por su trabajo!', pageWidth / 2, netY + 20, { align: 'center' });

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
                const pm      = selectedSale.paymentMethod || selectedSale.paymentmethod || 'efectivo';
                const isTransfer = pm === 'transferencia';

                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print">
                        <div onClick={() => setSelectedSale(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <div
                            onClick={e => e.stopPropagation()}
                            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-250"
                        >
                            {/* ── Header ── */}
                            <div className="px-4 py-3 border-b-2 border-gray-900 flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedSale(null)}
                                    className="w-9 h-9 rounded border border-gray-300 flex items-center justify-center active:scale-90 transition-all shrink-0 hover:border-gray-900"
                                >
                                    <span className="material-symbols-outlined text-gray-600" style={{fontSize:20}}>arrow_back</span>
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Venta</p>
                                    <p className="text-sm font-black text-gray-900">#{selectedSale.id.slice(-6).toUpperCase()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{fecha}</p>
                                    <p className="text-xs font-black text-gray-900 leading-tight">{hora}</p>
                                    <p className="text-lg font-black text-gray-900 leading-tight mt-0.5">${selectedSale.total.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto">

                                {/* ── Info grid ── */}
                                <div className="grid grid-cols-2 gap-2 mx-4 mt-4">
                                    <div className="bg-white p-3 border border-gray-300 rounded-lg">
                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cliente</p>
                                        <p className="text-sm font-black text-gray-900 truncate">{client?.name || 'General'}</p>
                                    </div>
                                    <div className="bg-white p-3 border border-gray-300 rounded-lg">
                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Atendió</p>
                                        <p className="text-sm font-black text-gray-900 truncate">{seller}</p>
                                    </div>
                                </div>

                                {/* ── Forma de pago ── */}
                                <div className="mx-4 mt-2 flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-gray-500" style={{fontSize:18}}>
                                            {isTransfer ? 'account_balance' : 'payments'}
                                        </span>
                                        <div>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Forma de Pago</p>
                                            <p className="text-sm font-black text-gray-900">{isTransfer ? 'Transferencia' : 'Efectivo'}</p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-wide border border-gray-200 px-2 py-1 rounded">
                                        {isTransfer ? 'TRANSF.' : 'EFECTIVO'}
                                    </span>
                                </div>

                                {/* ── Productos ── */}
                                <div className="mx-4 mt-3 mb-4">
                                    {/* Encabezado tabla */}
                                    <div className="bg-gray-900 grid grid-cols-[1fr_auto] px-3 py-2 rounded-t-lg">
                                        <span className="text-[9px] font-bold text-white uppercase tracking-widest">Producto</span>
                                        <span className="text-[9px] font-bold text-white uppercase tracking-widest text-right">Importe</span>
                                    </div>
                                    <div className="border border-gray-900 border-t-0 rounded-b-lg overflow-hidden">
                                        {selectedSale.items.map((item, idx) => (
                                            <div key={idx} className={`grid grid-cols-[1fr_auto] items-center px-3 py-2.5 border-b border-gray-100 last:border-0 ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                                                <div className="min-w-0 pr-3">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                                    <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                                                        {item.quantity}{item.unit || 'u'} × ${item.price.toFixed(2)}
                                                        {item.pieces > 0 && <span className="ml-1.5 font-black text-gray-600">· {item.pieces} pzas</span>}
                                                    </p>
                                                </div>
                                                <p className="text-sm font-black text-gray-900 whitespace-nowrap">${(item.quantity * item.price).toFixed(2)}</p>
                                            </div>
                                        ))}
                                        {/* Total artículos */}
                                        <div className="grid grid-cols-[1fr_auto] items-center px-3 py-2.5 bg-gray-50 border-t-2 border-gray-900">
                                            <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">{selectedSale.items.length} {selectedSale.items.length === 1 ? 'artículo' : 'artículos'}</span>
                                            <span className="text-base font-black text-gray-900">${selectedSale.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* ── Acciones ── */}
                            <div className="px-4 py-3 border-t-2 border-gray-900 flex gap-2 bg-white">
                                <button
                                    onClick={async () => {
                                        const btPrinter = window.__btPrinter;
                                        if (btPrinter) await handleBTPrint(selectedSale);
                                        else window.print();
                                    }}
                                    disabled={btPrinting}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-black py-3 rounded-lg active:scale-95 transition-all disabled:opacity-50 text-xs uppercase tracking-wide"
                                >
                                    <span className="material-symbols-outlined" style={{fontSize:17}}>{btPrinting ? 'refresh' : 'print'}</span>
                                    {btPrinting ? 'Imprimiendo…' : 'Reimprimir'}
                                </button>
                                <button
                                    onClick={() => showConfirm({
                                        message: '¿Eliminar esta venta?',
                                        confirmText: 'Eliminar', danger: true,
                                        onConfirm: async () => {
                                            await deleteSale(selectedSale.id);
                                            setSelectedSale(null);
                                        },
                                    })}
                                    className="w-12 h-12 bg-white text-gray-400 border border-gray-300 rounded-lg flex items-center justify-center active:scale-90 transition-all hover:border-red-400 hover:text-red-500"
                                >
                                    <span className="material-symbols-outlined" style={{fontSize:19}}>delete</span>
                                </button>
                            </div>
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
