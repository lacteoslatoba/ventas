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
    FONT_A:       [ESC, 0x4D, 0x00],
    FONT_B:       [ESC, 0x4D, 0x01],
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

async function processImage(url, maxWidth = 200) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Redimensionar manteniendo proporción
            const ratio = img.width / img.height;
            const width = Math.min(maxWidth, img.width);
            const height = Math.round(width / ratio);
            
            // Ancho debe ser múltiplo de 8 para ESC/POS
            const finalWidth = Math.ceil(width / 8) * 8;
            
            canvas.width = finalWidth;
            canvas.height = height;
            
            // Dibujar en blanco y negro (umbral simple)
            ctx.drawImage(img, 0, 0, finalWidth, height);
            const imageData = ctx.getImageData(0, 0, finalWidth, height);
            const data = imageData.data;
            
            const pixels = new Uint8Array(finalWidth * height);
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i+1] + data[i+2]) / 3;
                pixels[i / 4] = avg < 128 ? 1 : 0; // Negro si es oscuro
            }
            
            // Empacar bits en bytes
            const bytesWidth = finalWidth / 8;
            const buffer = new Uint8Array(8 + bytesWidth * height);
            
            // Comando GS v 0
            buffer[0] = 0x1D; buffer[1] = 0x76; buffer[2] = 0x30; buffer[3] = 0;
            buffer[4] = bytesWidth & 0xFF; buffer[5] = (bytesWidth >> 8) & 0xFF;
            buffer[6] = height & 0xFF; buffer[7] = (height >> 8) & 0xFF;
            
            let pos = 8;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < bytesWidth; x++) {
                    let b = 0;
                    for (let bit = 0; bit < 8; bit++) {
                        if (pixels[y * finalWidth + (x * 8 + bit)]) {
                            b |= (1 << (7 - bit));
                        }
                    }
                    buffer[pos++] = b;
                }
            }
            resolve(buffer);
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

export async function buildTicketBuffer({ ticket, user, client, config = {} }) {
    const {
        businessName = 'LACTEOS LA TOBA',
        subtitle = '', address = '', phone = '',
        extraLine1 = '', extraLine2 = '',
        footerLine1 = '¡Gracias por su compra!',
        footerLine2 = '',
        showSignature = true,
        showDate = true, showTime = true,
        showSeller = true, showCustomer = true,
        ticketTemplate = 'standard',
        metadataUppercase = false,
        metadataAlignment = 'between',
        metadataSpacing = 0,
        metadataSize = 10,
        logoUrl = null
    } = config;

    const chunks = [];
    const add = (...parts) => chunks.push(toBytes(...parts));

    // Forzamos un ancho más seguro para impresoras de 58mm (generalmente 32 caps)
    const WIDTH = config.paperWidth === 80 ? 48 : 31;
    const SEP = '-'.repeat(WIDTH) + '\r\n';

    // Función auxiliar para formatear líneas de dos columnas o alineadas
    const formatMetaLine = (l, r = '') => {
        const align = metadataAlignment || 'between';
        // En impresoras térmicas, el "espaciado" se simula con saltos de línea
        // Si el usuario pone > 0, añadimos al menos un salto. Si es > 10, dos.
        let spacingLines = 0;
        if (metadataSpacing > 0) spacingLines = 1;
        if (metadataSpacing > 12) spacingLines = 2;
        
        const spacing = '\r\n'.repeat(spacingLines);
        
        let line = '';
        const cleanL = String(l);
        const cleanR = String(r);

        if (align === 'between') {
            const spaces = Math.max(1, WIDTH - cleanL.length - cleanR.length);
            line = cleanL + ' '.repeat(spaces) + cleanR;
        } else if (align === 'center') {
            const combined = cleanL + (cleanR ? `: ${cleanR}` : '');
            const pad = Math.floor((WIDTH - combined.length) / 2);
            line = ' '.repeat(Math.max(0, pad)) + combined;
        } else if (align === 'right') {
            const combined = cleanL + (cleanR ? `: ${cleanR}` : '');
            line = ' '.repeat(Math.max(0, WIDTH - combined.length)) + combined;
        } else {
            line = cleanL + (cleanR ? `: ${cleanR}` : '');
        }

        // Truncar si la línea excedió el ancho por alguna razón
        const truncated = line.slice(0, WIDTH);
        const finalLine = metadataUppercase ? truncated.toUpperCase() : truncated;
        return spacing + finalLine + '\r\n';
    };

    if (ticketTemplate === 'latoba') {
        add(CMD.INIT, CMD.ALIGN_CENTER);

        // Procesar Logo si existe
        if (logoUrl) {
            const logoBytes = await processImage(logoUrl, WIDTH * 8);
            if (logoBytes) add(logoBytes, '\r\n');
        }

        add(CMD.BOLD_ON);
        
        if (config.businessNameSize > 16) {
            add(CMD.DOUBLE_SIZE);
        }
        
        add((businessName || 'LACTEOS LA TOBA').toUpperCase() + '\r\n');
        
        if (config.businessNameSize > 16) {
            add(CMD.NORMAL_SIZE);
        }
        
        add(CMD.BOLD_OFF);
        
        if (subtitle) add(subtitle.toUpperCase() + '\r\n');
        if (address) add(address.toUpperCase() + '\r\n');
        if (phone) add(`TEL: ${phone}\r\n`);
        if (extraLine1) add(extraLine1.toUpperCase() + '\r\n');
        if (extraLine2) add(extraLine2.toUpperCase() + '\r\n');

        add(CMD.ALIGN_LEFT, SEP);
        
        const dateObj = new Date(ticket.date || Date.now());
        const dStr = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
        const tStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        
        // Aplicar fuente B si el tamaño es muy pequeño
        if (metadataSize < 9) add(CMD.FONT_B);
        
        add(formatMetaLine(dStr, tStr));

        const tId = `#${(ticket.id || '').toUpperCase().slice(-6)}`;
        add(formatMetaLine('Ticket', tId));
        
        if (showCustomer) {
            const cName = (client?.name || 'GENERAL').slice(0, 15);
            add(formatMetaLine('Cliente', cName));
        }
        if (showSeller) {
            const sName = (user?.name || 'VENDEDOR').slice(0, 15);
            add(formatMetaLine('Repartidor', sName));
        }

        if (metadataSize < 9) add(CMD.FONT_A); // Volver a fuente normal

        if (config.showItemsHeader !== false) {
            add(SEP, CMD.BOLD_ON);
            add(formatMetaLine('ITEM', 'PRECIO'));
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
        add(formatMetaLine('SUBTOTAL:', finalTot));
        
        add(CMD.BOLD_ON);
        if (config.centerTotal) {
            add(CMD.ALIGN_CENTER, `TOTAL: ${finalTot}\r\n`, CMD.ALIGN_LEFT);
        } else {
            add(formatMetaLine('TOTAL:', finalTot));
        }
        add(CMD.BOLD_OFF, SEP);

        if (config.showCashAndChange !== false) {
            add(formatMetaLine('EFECTIVO:', finalTot));
            add(formatMetaLine('CAMBIO:', '$0.00'));
            add(SEP);
        }
        
        add('\r\n', CMD.ALIGN_CENTER);
        
        if (footerLine1) add(footerLine1.toUpperCase() + '\r\n');
        if (footerLine2) add(footerLine2.toUpperCase() + '\r\n');
        if (showSignature) add('\r\nFIRMA: __________________\r\n');
        
        add('\r\n\r\n\r\n\r\n', [ESC, 0x69]); // Intento de comando de corte alternativo

    } else {
        // Estándar muy robusto
        add(CMD.INIT, CMD.ALIGN_CENTER);

        // Procesar Logo si existe
        if (logoUrl) {
            const logoBytes = await processImage(logoUrl, WIDTH * 8);
            if (logoBytes) add(logoBytes, '\r\n');
        }

        add('TICKET DE VENTA\r\n');
        
        if (config.businessNameSize > 16) add(CMD.DOUBLE_SIZE);
        add(businessName.toUpperCase() + '\r\n');
        if (config.businessNameSize > 16) add(CMD.NORMAL_SIZE);
        
        add(SEP, CMD.ALIGN_LEFT);

        if (metadataSize < 9) add(CMD.FONT_B);

        const dateObj = new Date(ticket.date || Date.now());
        const dStr = dateObj.toLocaleDateString('es-MX');
        const tStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        const tId = `#${(ticket.id || '').toUpperCase().slice(-6)}`;

        add(formatMetaLine('Fecha', `${dStr} ${tStr}`));
        add(formatMetaLine('Ticket', tId));

        if (showSeller) add(formatMetaLine('Repartidor', user?.name || 'Vendedor'));
        if (showCustomer) add(formatMetaLine('Cliente', client?.name || 'General'));
        
        if (metadataSize < 9) add(CMD.FONT_A);
        
        add(SEP);
        
        if (config.showItemsHeader !== false) {
            add(formatMetaLine('CANT/ITEM', 'IMPORTE'));
            add(SEP);
        }

        (ticket.items || []).forEach(item => {
            const rowTotal = (Number(item.price) * Number(item.quantity)).toFixed(2);
            add(`${item.quantity} ${item.name.toUpperCase().slice(0, 10)} $${rowTotal}\r\n`);
            if (config.spaceBetweenItems) add('\r\n');
        });
        
        add(SEP, config.centerTotal ? CMD.ALIGN_CENTER : CMD.ALIGN_RIGHT, CMD.BOLD_ON);
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
    const buffer = await buildTicketBuffer({ ticket, user, client, config });
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
