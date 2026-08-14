/**
 * Exportación de datos a Excel (CSV) y JSON
 * Cierra el 15% pendiente: Exportación de reportes
 */

// ─── Helper: formatear fecha para nombre de archivo ───
const toDateStamp = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const dateStamp = () => toDateStamp(new Date());

// ─── CSV Export ────────────────────────────────────────────────────────
function exportToCSV(data, filename, dateStr = dateStamp()) {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h]?.toString() || '';
        // Escapar comillas y encerrar en comillas si tiene coma o salto de línea
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${dateStr}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ─── JSON Export ──────────────────────────────────────────────────────
function exportToJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${dateStamp()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ─── Exportar Ventas ──────────────────────────────────────────────────
export function exportSales(sales, clients, users, filename = 'ventas') {
  const rows = sales.map(sale => {
    const client = clients.find(c => c.id === sale.clientId);
    const user = users.find(u => u.id === sale.userId);
    return {
      Folio: sale.id?.slice(-8).toUpperCase() || '',
      Fecha: new Date(sale.date).toLocaleDateString('es-MX'),
      Hora: new Date(sale.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      Repartidor: user?.name || 'Admin',
      Cliente: client?.name || 'General',
      Total: Number(sale.total).toFixed(2),
      Pago: sale.paymentMethod === 'transferencia' ? 'Crédito' : 'Efectivo',
      Productos: sale.items?.map(i => `${i.name} x${i.quantity}`).join(' | ') || '',
    };
  });
  exportToCSV(rows, filename);
}

// ─── Exportar Productos ──────────────────────────────────────────────
export function exportProducts(products, filename = 'productos') {
  const rows = products.map(p => ({
    Código: p.code || '',
    Nombre: p.name,
    'Precio A': Number(p.priceA || p.price).toFixed(2),
    'Precio B': Number(p.priceB || 0).toFixed(2),
    'Precio C': Number(p.priceC || 0).toFixed(2),
    Unidad: p.unit || 'u',
    Stock: Number(p.stock || 0).toFixed(2),
    Orden: p.orden ?? '',
  }));
  exportToCSV(rows, filename);
}

// ─── Exportar Clientes ──────────────────────────────────────────────
export function exportClients(clients, filename = 'clientes') {
  const rows = clients.map(c => ({
    Nombre: c.name,
    Teléfono: c.phone || '',
    Dirección: c.address || '',
  }));
  exportToCSV(rows, filename);
}

// ─── Exportar Reporte Diario (Resumen) ──────────────────────────────
export function exportDailyReport({ sales, clients, users, expenses, date, currentUser, filename = 'reporte_diario' }) {
  const rows = [];
  
  // Ventas del día
  sales.forEach(sale => {
    const client = clients.find(c => c.id === sale.clientId);
    const user = users.find(u => u.id === sale.userId);
    
    if (sale.items) {
      sale.items.forEach(item => {
        rows.push({
          Tipo: 'Venta',
          Hora: new Date(sale.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          Repartidor: user?.name || 'Admin',
          Cliente: client?.name || 'General',
          Concepto: item.name,
          Cantidad: item.quantity,
          Unidad: item.unit || 'u',
          Piezas: item.pieces || 0,
          'Precio Unit.': Number(item.price).toFixed(2),
          Importe: (Number(item.quantity) * Number(item.price)).toFixed(2),
          'Forma Pago': sale.paymentMethod === 'transferencia' ? 'Crédito' : 'Efectivo',
        });
      });
    }
  });

  // Gastos del día
  expenses.forEach(exp => {
    rows.push({
      Tipo: 'Gasto',
      Hora: new Date(exp.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      Repartidor: currentUser?.name || '',
      Cliente: '',
      Concepto: exp.description,
      Cantidad: '',
      Unidad: '',
      Piezas: '',
      'Precio Unit.': '',
      Importe: Number(exp.amount).toFixed(2),
      'Forma Pago': '',
    });
  });

  // Ordenar por hora
  rows.sort((a, b) => a.Hora.localeCompare(b.Hora));

  const stamp = date ? toDateStamp(date) : dateStamp();
  exportToCSV(rows, filename, stamp);
}

// ─── Exportar JSON (copia de seguridad completa) ────────────────────
export function exportFullBackup(data, filename = 'backup_app') {
  exportToJSON(data, `${filename}_${dateStamp()}`);
}
