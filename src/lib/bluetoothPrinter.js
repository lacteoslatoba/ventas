/**
 * bluetoothPrinter.js
 * Librería para impresoras térmicas Bluetooth (ESC/POS) via Web Bluetooth API.
 */

// UUID genéricos para servicios de impresora
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHAR_UUID    = '00002af1-0000-1000-8000-00805f9b34fb';
const NORDIC_SERVICE_UUID  = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NORDIC_TX_CHAR_UUID  = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

const ESC = 0x1B;
const GS  = 0x1D;

const CMD = {
    INIT: [ESC, 0x40],
    ALIGN_CENTER: [ESC, 0x61, 0x01],
    ALIGN_LEFT:   [ESC, 0x61, 0x00],
    ALIGN_RIGHT:  [ESC, 0x61, 0x02],
    BOLD_ON:      [ESC, 0x45, 0x01],
    BOLD_OFF:     [ESC, 0x45, 0x00],
    DOUBLE_SIZE:  [GS, 0x21, 0x11], 
    NORMAL_SIZE:  [GS, 0x21, 0x00],
    CUT:          [GS, 0x56, 0x00],
    FEED:         [ESC, 0x64, 0x03],
};

function encodeText(text) {
    const map = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
        'ñ': 'n', 'Ñ': 'N', 'ü': 'u', 'Ü': 'U',
        '¿': '?', '¡': '!',
    };
    const normalized = text.replace(/[áéíóúÁÉÍÓÚñÑüÜ¿¡]/g, c => map[c] || c);
    return new TextEncoder().encode(normalized);
}

function toBytes(...parts) {
    const arrays = parts.map(p => {
        if (Array.isArray(p)) return new Uint8Array(p);
        if (p instanceof Uint8Array) return p;
        if (typeof p === 'string') return encodeText(p);
        return new Uint8Array([p]);
    });
    const total = arrays.reduce((n, a) => n + a.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    arrays.forEach(a => { out.set(a, offset); offset += a.length; });
    return out;
}

function centerText(text, width = 31) {
    if (text.length >= width) return text.slice(0, width);
    const pad = Math.floor((width - text.length) / 2);
    return ' '.repeat(pad) + text;
}

function alignTextStr(text, align, width = 31) {
    if (text.length >= width) return text.slice(0, width);
    if (align === 'center') return centerText(text, width);
    if (align === 'right') return ' '.repeat(width - text.length) + text;
    return text;
}

export function buildTicketBuffer({ ticket, user, client, config = {} }) {
    const {
        businessName = 'LACTEOS LA TOBA',
        subtitle = '', address = '', phone = '',
        extraLine1 = '', extraLine2 = '',
        footerLine1 = '¡Gracias por su compra!',
        footerLine2 = '',
        showSignature = true,
        showDate = true, showTime = true,
        showSeller = true, showCustomer = true,
        ticketTemplate = 'standard'
    } = config;

    const chunks = [];
    const add = (...parts) => chunks.push(toBytes(...parts));

    // Forzamos un ancho más seguro para impresoras de 58mm (generalmente 32 caps)
    const WIDTH = config.paperWidth === 80 ? 48 : 31;
    const SEP = '-'.repeat(WIDTH) + '\r\n';

    // Función auxiliar para formatear líneas de dos columnas
    const col2 = (l, r) => {
        const spaces = Math.max(1, WIDTH - l.length - r.length);
        return l + ' '.repeat(spaces) + r + '\r\n';
    };

    if (ticketTemplate === 'latoba') {
        add(CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON);
        add((businessName || 'LACTEOS LA TOBA').toUpperCase() + '\r\n');
        add(CMD.BOLD_OFF);
        
        if (subtitle) add(subtitle.toUpperCase() + '\r\n');
        if (address) add(address.toUpperCase() + '\r\n');
        if (phone) add(`TEL: ${phone}\r\n`);
        if (extraLine1) add(extraLine1.toUpperCase() + '\r\n');
        if (extraLine2) add(extraLine2.toUpperCase() + '\r\n');

        add(CMD.ALIGN_LEFT, SEP);
        
        const dateObj = new Date(ticket.date || Date.now());
        const dStr = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        const tStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        
        add(col2(dStr, tStr));

        const tId = `#${(ticket.id || '').toUpperCase().slice(-6)}`;
        add(col2('TICKET', tId));
        
        if (showCustomer) {
            const cName = (client?.name || 'GENERAL').toUpperCase().slice(0, 15);
            add(col2('CLIENTE', cName));
        }
        if (showSeller) {
            const sName = (user?.name || 'VENDEDOR').toUpperCase().slice(0, 15);
            add(col2('CAJERO', sName));
        }

        if (config.showItemsHeader !== false) {
            add(SEP, CMD.BOLD_ON);
            add(col2('ITEM', 'PRECIO'));
            add(CMD.BOLD_OFF, SEP);
        } else {
            add(SEP);
        }

        const items = ticket.items || [];
        items.forEach(item => {
            // Nombre en una sola línea (negrita opcional removida para estabilidad)
            const name = (item.name || 'PRODUCTO').toUpperCase().slice(0, WIDTH);
            add(name + '\r\n');
            
            // Cantidad y total abajo
            const qtyStr = `${item.quantity || 0}${item.unit === 'Kg' ? 'kg' : 'x'} x $${Number(item.price || 0).toFixed(2)}`;
            const totStr = `$${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}`;
            add(col2(qtyStr, totStr));
            if (config.spaceBetweenItems) add('\r\n');
        });

        add(SEP);
        const finalTot = `$${Number(ticket.total || 0).toFixed(2)}`;
        add(col2('SUBTOTAL:', finalTot));
        
        add(CMD.BOLD_ON);
        add(col2('TOTAL:', finalTot));
        add(CMD.BOLD_OFF, SEP);

        add(col2('EFECTIVO:', finalTot));
        add(col2('CAMBIO:', '$0.00'));
        add('\r\n', CMD.ALIGN_CENTER);
        
        if (footerLine1) add(footerLine1.toUpperCase() + '\r\n');
        if (footerLine2) add(footerLine2.toUpperCase() + '\r\n');
        if (showSignature) add('\r\nFIRMA: __________________\r\n');
        
        add('\r\n\r\n\r\n\r\n', [ESC, 0x69]); // Intento de comando de corte alternativo

    } else {
        // Estándar muy robusto
        add(CMD.INIT, CMD.ALIGN_CENTER, 'TICKET DE VENTA\r\n');
        add(businessName.toUpperCase() + '\r\n', SEP, CMD.ALIGN_LEFT);
        
        if (config.showItemsHeader !== false) {
            add(col2('CANT/ITEM', 'IMPORTE'));
            add(SEP);
        }

        (ticket.items || []).forEach(item => {
            const rowTotal = (Number(item.price) * Number(item.quantity)).toFixed(2);
            add(`${item.quantity} ${item.name.toUpperCase().slice(0, 10)} $${rowTotal}\r\n`);
            if (config.spaceBetweenItems) add('\r\n');
        });
        
        add(SEP, CMD.ALIGN_RIGHT, CMD.BOLD_ON);
        add(`TOTAL: $${Number(ticket.total).toFixed(2)}\r\n`);
        add(CMD.BOLD_OFF, '\r\n\r\n\r\n\r\n');
    }

    const totalLen = chunks.reduce((n, c) => n + c.length, 0);
    const finalBuffer = new Uint8Array(totalLen);
    let offset = 0;
    chunks.forEach(c => { finalBuffer.set(c, offset); offset += c.length; });
    return finalBuffer;
}

async function sendInChunks(characteristic, data) {
    const chunkSize = 20; 
    for (let i = 0; i < data.length; i += chunkSize) {
        await characteristic.writeValue(data.slice(i, i + chunkSize));
        await new Promise(r => setTimeout(r, 40)); // Aumentado a 40ms para estabilidad BLE
    }
}

export async function connectPrinter() {
    const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [PRINTER_SERVICE_UUID, NORDIC_SERVICE_UUID, '0000ff00-0000-1000-8000-00805f9b34fb']
    });
    const server = await device.gatt.connect();
    let char = null;
    try {
        const svc = await server.getPrimaryService(PRINTER_SERVICE_UUID);
        char = await svc.getCharacteristic(PRINTER_CHAR_UUID);
    } catch {
        const svc = await server.getPrimaryService(NORDIC_SERVICE_UUID);
        char = await svc.getCharacteristic(NORDIC_TX_CHAR_UUID);
    }
    return { device, server, characteristic: char };
}

export async function autoConnectPrinter(lastDeviceName) {
    if (!navigator.bluetooth?.getDevices) return null;
    const devices = await navigator.bluetooth.getDevices();
    const device = devices.find(d => d.name === lastDeviceName) || devices[0];
    if (!device) return null;
    const server = await device.gatt.connect();
    let char = null;
    try {
        const svc = await server.getPrimaryService(PRINTER_SERVICE_UUID);
        char = await svc.getCharacteristic(PRINTER_CHAR_UUID);
    } catch {
        try {
            const svc = await server.getPrimaryService(NORDIC_SERVICE_UUID);
            char = await svc.getCharacteristic(NORDIC_TX_CHAR_UUID);
        } catch { return null; }
    }
    return { device, server, characteristic: char };
}

export async function printTicket({ ticket, user, client, characteristic, config }) {
    const buffer = buildTicketBuffer({ ticket, user, client, config });
    await sendInChunks(characteristic, buffer);

    if (config?.printCopy) {
        await new Promise(r => setTimeout(r, 1500)); // Pausa de 1.5s entre tickets
        await sendInChunks(characteristic, buffer);
    }
}

export async function printTestPage(characteristic) {
    const test = toBytes(CMD.INIT, CMD.ALIGN_CENTER, 'PRUEBA DE IMPRESION\n', CMD.FEED, CMD.CUT);
    await sendInChunks(characteristic, test);
}

export function savePrinterName(name) { localStorage.setItem('bt_printer_name', name); }
export function getSavedPrinterName() { return localStorage.getItem('bt_printer_name'); }
export function clearSavedPrinter() { localStorage.removeItem('bt_printer_name'); }
