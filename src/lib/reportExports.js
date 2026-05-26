import { saveAndOpenFile } from './nativeFiles';

const toLocalDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const generateReportImage = async ({
    operatorPDFData,
    sales,
    clients,
    currentUser,
    repDateFilter,
    todayStr,
    ticketConfig
}) => {
    if (!operatorPDFData) return;

    const { default: html2canvas } = await import('html2canvas');

    const fechaPDF = repDateFilter || todayStr;
    const ventasPDF = (sales || []).filter(s =>
        s?.userId === currentUser?.id && toLocalDate(s.date) === fechaPDF
    );

    const saleRows = ventasPDF.map(sale => {
        const client = clients.find(c => c.id === sale.clientId);
        const pieces = (sale.items || []).reduce((s, it) => s + (Number(it.pieces) || 0), 0);
        const kg = (sale.items || [])
            .filter(it => (it.unit || '').toLowerCase() === 'kg')
            .reduce((s, it) => s + (Number(it.quantity) || 0), 0);
        const pm = (sale.paymentMethod || sale.paymentmethod || 'efectivo') === 'transferencia'
            ? 'Crédito' : 'Efectivo';
        return [client?.name || 'General', pieces > 0 ? pieces : '—', kg > 0 ? kg.toFixed(2) : '—', `$${Number(sale.total).toFixed(2)}`, pm];
    });

    const footPieces = saleRows.reduce((s, r) => s + (r[1] === '—' ? 0 : Number(r[1])), 0);
    const footKg = saleRows.reduce((s, r) => s + (r[2] === '—' ? 0 : parseFloat(r[2])), 0);
    const efectivoImg = ventasPDF.filter(s => (s.paymentMethod || s.paymentmethod || 'efectivo') !== 'transferencia').reduce((s, x) => s + Number(x.total), 0);
    const transferImg = ventasPDF.filter(s => (s.paymentMethod || s.paymentmethod) === 'transferencia').reduce((s, x) => s + Number(x.total), 0);
    const fechaCap = operatorPDFData.fechaLabel.charAt(0).toUpperCase() + operatorPDFData.fechaLabel.slice(1);
    const bizName = (ticketConfig?.businessName || 'LACTEOS LA TOBA').toUpperCase();

    const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const tableHTML = (headers, rows, foot, colStyles) => `
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;border:1px solid #000;font-family:Arial,sans-serif">
            <thead><tr>${headers.map((h, i) => `<th style="background:#000;color:#fff;font-size:11px;font-weight:700;padding:10px 12px;text-align:${colStyles[i] || 'left'}">${esc(h)}</th>`).join('')}</tr></thead>
            <tbody>${rows.map((r, ri) => `<tr style="background:${ri % 2 === 1 ? '#f8f8f8' : '#fff'}">${r.map((c, i) => `<td style="font-size:12px;padding:8px 12px;color:#141414;border:0.5px solid #c8c8c8;text-align:${colStyles[i] || 'left'}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
            <tfoot><tr style="border-top:2px solid #000">${foot.map((c, i) => `<td style="font-size:12px;font-weight:700;padding:9px 12px;background:#f8f8f8;border:0.5px solid #c8c8c8;text-align:${colStyles[i] || 'left'}">${esc(c)}</td>`).join('')}</tr></tfoot>
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
            ['Cliente', 'Piezas', 'Kg', 'Importe', 'Forma de Pago'],
            saleRows.length > 0 ? saleRows : [['Sin ventas registradas', '', '', '', '']],
            ['TOTAL', footPieces > 0 ? footPieces : '—', footKg > 0 ? footKg.toFixed(2) : '—', `$${operatorPDFData.totalMoney.toFixed(2)}`, ''],
            ['left', 'center', 'center', 'right', 'center']
        )}

        <div style="font-size:10px;font-weight:700;color:#787878;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">RESUMEN DE COBRO</div>
        ${tableHTML(
            ['Forma de Pago', 'Importe'],
            [['Efectivo', `$${efectivoImg.toFixed(2)}`], ['Crédito', `$${transferImg.toFixed(2)}`]],
            ['TOTAL VENTAS', `$${operatorPDFData.totalMoney.toFixed(2)}`],
            ['left', 'right']
        )}

        ${operatorPDFData.expenses.length > 0 ? `
        <div style="font-size:10px;font-weight:700;color:#787878;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">GASTOS DEL DÍA</div>
        ${tableHTML(
            ['Descripción', 'Monto'],
            operatorPDFData.expenses.map(e => [e.description, `$${Number(e.amount).toFixed(2)}`]),
            ['Total Gastos', `$${operatorPDFData.totalExpenses.toFixed(2)}`],
            ['left', 'right']
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
        canvas.toBlob(async blob => {
            const fileName = `Reporte_${(currentUser?.name || 'Repartidor').replace(/\s+/g, '_')}_${repDateFilter || todayStr}.png`;
            try {
                await saveAndOpenFile(blob, fileName, 'image/png');
            } catch (err) {
                console.error('Error exporting image:', err);
            }
        }, 'image/png');
    } finally {
        document.body.removeChild(wrapper);
    }
};

export const generateReportPDF = async ({
    operatorPDFData,
    sales,
    clients,
    currentUser,
    repDateFilter,
    todayStr,
    ticketConfig
}) => {
    if (!operatorPDFData) return;
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const businessName = (ticketConfig?.businessName || 'LACTEOS LA TOBA').toUpperCase();

    const BLACK = [0, 0, 0];
    const WHITE = [255, 255, 255];
    const GRAY_50 = [248, 248, 248];
    const GRAY_200 = [200, 200, 200];
    const GRAY_400 = [120, 120, 120];
    const GRAY_900 = [20, 20, 20];
    const HEADER_BG = [71, 85, 105];

    // ── Encabezado ────────────────────────────────────────────────────
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

    doc.setDrawColor(...BLACK); doc.setLineWidth(0.5);
    doc.line(14, 37, pageWidth - 14, 37);

    // ── Filas por venta ───────────────────────────────────────────────
    const fechaPDF = repDateFilter || todayStr;
    const ventasPDF = (sales || []).filter(s =>
        s?.userId === currentUser?.id && toLocalDate(s.date) === fechaPDF
    );

    const saleRows = ventasPDF.map(sale => {
        const client = clients.find(c => c.id === sale.clientId);
        const pieces = (sale.items || []).reduce((s, it) => s + (Number(it.pieces) || 0), 0);
        const kg = (sale.items || [])
            .filter(it => (it.unit || '').toLowerCase() === 'kg')
            .reduce((s, it) => s + (Number(it.quantity) || 0), 0);
        const pm = (sale.paymentMethod || sale.paymentmethod || 'efectivo') === 'transferencia'
            ? 'Crédito' : 'Efectivo';
        return [
            client?.name || 'General',
            pieces > 0 ? String(pieces) : '—',
            kg > 0 ? kg.toFixed(2) : '—',
            `$${Number(sale.total).toFixed(2)}`,
            pm,
        ];
    });

    const footPieces = saleRows.reduce((s, r) => s + (r[1] === '—' ? 0 : Number(r[1])), 0);
    const footKg = saleRows.reduce((s, r) => s + (r[2] === '—' ? 0 : Number(r[2])), 0);

    const COL_ALIGN = ['left', 'center', 'center', 'right', 'center'];
    const fixAlign = (data) => { data.cell.styles.halign = COL_ALIGN[data.column.index] || 'left'; };

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
            footKg > 0 ? footKg.toFixed(2) : '—',
            `$${operatorPDFData.totalMoney.toFixed(2)}`,
            '',
        ]],
        headStyles: { fillColor: HEADER_BG, textColor: WHITE, fontStyle: 'bold', fontSize: 9, lineColor: HEADER_BG, lineWidth: 0.3 },
        footStyles: { fillColor: GRAY_50, textColor: GRAY_900, fontStyle: 'bold', fontSize: 9, lineColor: GRAY_200, lineWidth: 0.3 },
        bodyStyles: { fontSize: 9, textColor: GRAY_900, lineColor: GRAY_200, lineWidth: 0.2 },
        alternateRowStyles: { fillColor: GRAY_50 },
        tableLineColor: HEADER_BG, tableLineWidth: 0.3,
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
                data.cell.styles.lineColor = BLACK;
                data.cell.styles.lineWidth = { top: 0.6, right: 0.2, bottom: 0.2, left: 0.2 };
            }
        },
    });

    // ── Resumen por forma de pago ─────────────────────────────────────
    const efectivoTotal = ventasPDF
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
            ['Efectivo', `$${efectivoTotal.toFixed(2)}`],
            ['Crédito', `$${transferenciaTotal.toFixed(2)}`],
        ],
        foot: [['TOTAL VENTAS', `$${operatorPDFData.totalMoney.toFixed(2)}`]],
        headStyles: { fillColor: HEADER_BG, textColor: WHITE, fontStyle: 'bold', fontSize: 9, lineColor: HEADER_BG, lineWidth: 0.3 },
        footStyles: { fillColor: GRAY_50, textColor: GRAY_900, fontStyle: 'bold', fontSize: 9, lineColor: GRAY_200, lineWidth: 0.3 },
        bodyStyles: { fontSize: 9, textColor: GRAY_900, lineColor: GRAY_200, lineWidth: 0.2 },
        alternateRowStyles: { fillColor: GRAY_50 },
        tableLineColor: HEADER_BG, tableLineWidth: 0.3,
        columnStyles: {
            0: { cellWidth: 'auto', halign: 'left' },
            1: { cellWidth: 36, halign: 'right' },
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
            headStyles: { fillColor: HEADER_BG, textColor: WHITE, fontStyle: 'bold', fontSize: 9, lineColor: HEADER_BG, lineWidth: 0.3 },
            footStyles: { fillColor: GRAY_50, textColor: GRAY_900, fontStyle: 'bold', fontSize: 9, lineColor: GRAY_200, lineWidth: 0.3 },
            bodyStyles: { fontSize: 9, textColor: GRAY_900, lineColor: GRAY_200, lineWidth: 0.2 },
            alternateRowStyles: { fillColor: GRAY_50 },
            tableLineColor: HEADER_BG, tableLineWidth: 0.3,
            columnStyles: {
                0: { cellWidth: 'auto', halign: 'left' },
                1: { cellWidth: 30, halign: 'right' },
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
    
    // For native, we get the blob instead of calling save()
    const blob = doc.output('blob');
    await saveAndOpenFile(blob, fileName, 'application/pdf');
};
