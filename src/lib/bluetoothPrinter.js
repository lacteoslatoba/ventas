/**
 * bluetoothPrinter.js
 * Librería para impresoras térmicas Bluetooth (ESC/POS) via Web Bluetooth API.
 * Compatible con impresoras de 58mm/80mm como Xprinter, GOOJPRT, ZJ-5805, etc.
 */

// UUID estándar de servicio Serial Port (SPP) para impresoras BT
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

// Algunos modelos usan el servicio genérico de Serial (Nordic UART)
const NORDIC_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NORDIC_TX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

// ─── ESC/POS Commands ────────────────────────────────────────────────────────
const ESC = 0x1B;
const GS = 0x1D;

const CMD = {
    INIT: [ESC, 0x40],           // Inicializar
    ALIGN_CENTER: [ESC, 0x61, 0x01],
    ALIGN_LEFT: [ESC, 0x61, 0x00],
    ALIGN_RIGHT: [ESC, 0x61, 0x02],
    BOLD_ON: [ESC, 0x45, 0x01],
    BOLD_OFF: [ESC, 0x45, 0x00],
    DOUBLE_SIZE: [GS, 0x21, 0x11],     // Alto x2 + Ancho x2
    NORMAL_SIZE: [GS, 0x21, 0x00],
    CUT: [GS, 0x56, 0x00],     // Corte total
    FEED: [ESC, 0x64, 0x03],     // Avanza 3 líneas
    LINE_FEED: [0x0A],
};

// ─── Codificación de texto ────────────────────────────────────────────────────
function encodeText(text) {
    // Reemplazar caracteres especiales del español a ASCII básico
    const map = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
        'ñ': 'n', 'Ñ': 'N', 'ü': 'u', 'Ü': 'U',
        '¿': '?', '¡': '!',
    };
    const normalized = text.replace(/[áéíóúÁÉÍÓÚñÑüÜ¿¡]/g, c => map[c] || c);
    const encoder = new TextEncoder();
    return encoder.encode(normalized);
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


function centerText(text, width = 32) {
    if (text.length >= width) return text.slice(0, width);
    const pad = Math.floor((width - text.length) / 2);
    return ' '.repeat(pad) + text;
}

function alignTextStr(text, align, width = 32) {
    if (text.length >= width) return text.slice(0, width);
    if (align === 'center') return centerText(text, width);
    if (align === 'right') return ' '.repeat(width - text.length) + text;
    return text; // left
}


// ─── Crear buffer ESC/POS del ticket ─────────────────────────────────────────
export function buildTicketBuffer({ ticket, user, client, isReprint = false, config = {} }) {
    const LINE_WIDTH = 32; // 58mm → ~32 chars por línea con fuente estándar
    const SEP = '-'.repeat(LINE_WIDTH) + '\n';
    const SEP2 = '='.repeat(LINE_WIDTH) + '\n';

    const {
        businessName = 'MI NEGOCIO',
        subtitle = '',
        address = '',
        phone = '',
        extraLine1 = '',
        extraLine2 = '',
        footerLine1 = '¡Gracias por su compra!',
        footerLine2 = '',
        showSignature = true,
        
        // Nuevas opciones
        titleAlignment = 'center', // left, center, right
        showAddress = true,
        showPhone = true,
        showDate = true,
        showTime = true,
        showSeller = true,
        showCustomer = true,
        useFontB = false, // Fuente más pequeña si la soporta
        ticketTemplate = 'standard', // 'standard' o 'latoba'
    } = config;



    const chunks = [];
    const add = (...parts) => chunks.push(toBytes(...parts));

    // ==========================================
    // PLANTILLA: LACTEOS LA TOBA
    // ==========================================
    // ==========================================
    // PLANTILLA: LACTEOS LA TOBA (REDiseñada para ser robusta)
    // ==========================================
    if (ticketTemplate === 'latoba') {
        const LAT_WIDTH = config.paperWidth === 80 ? 48 : 32;
        const LAT_SEP = '-'.repeat(LAT_WIDTH) + '\n';
        
        add(CMD.INIT);
        if (useFontB) add([0x1B, 0x4D, 0x01]);

        // Encabezado
        add(CMD.ALIGN_CENTER);
        add(CMD.DOUBLE_SIZE);
        add(CMD.BOLD_ON);
        add((businessName || 'LACTEOS LA TOBA').toUpperCase() + '\n');
        add(CMD.BOLD_OFF);
        add(CMD.NORMAL_SIZE);
        
        if (subtitle) add(subtitle.toUpperCase() + '\n');
        if (showAddress && address) add(address.toUpperCase() + '\n');
        if (showPhone && phone) add(`TEL: ${phone}\n`);
        
        if (extraLine1) add(extraLine1.toUpperCase() + '\n');
        if (extraLine2) add(extraLine2.toUpperCase() + '\n');

        add(CMD.ALIGN_LEFT);
        add(LAT_SEP);
        
        // Info de cabecera (Fecha y Hora)
        const dateObj = ticket.date ? new Date(ticket.date) : new Date();
        const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '').toUpperCase();
        const timeStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        if (showDate && showTime) {
            const spacesDt = Math.max(1, LAT_WIDTH - dateStr.length - timeStr.length);
            add(`${dateStr}${' '.repeat(spacesDt)}${timeStr}\n`);
        } else {
            if (showDate) add(dateStr + '\n');
            if (showTime) add(timeStr + '\n');
        }
        
        const tNum = `#${(ticket.id || '').slice(-6).toUpperCase()}`;
        add(`${'Numero de ticket'.padEnd(LAT_WIDTH - tNum.length)}${tNum}\n`);
        
        if (showCustomer) {
            const cName = (client?.name || 'General').toUpperCase().slice(0, LAT_WIDTH - 8);
            add(`${'Cliente'.padEnd(LAT_WIDTH - cName.length)}${cName}\n`);
        }
        if (showSeller) {
            const sName = (user?.name || 'Vendedor').toUpperCase().slice(0, LAT_WIDTH - 7);
            add(`${'Cajero'.padEnd(LAT_WIDTH - sName.length)}${sName}\n`);
        }
        
        add(LAT_SEP);
        add(CMD.BOLD_ON);
        add(`${'ITEM'.padEnd(LAT_WIDTH - 6)}PRECIO\n`);
        add(CMD.BOLD_OFF);
        add(LAT_SEP);
        
        // Productos
        const items = ticket.items || [];
        if (items.length === 0) {
            add('SIN PRODUCTOS REGISTRADOS\n');
        }

        items.forEach(item => {
            const name = (item.name || 'Producto').toUpperCase();
            add(CMD.BOLD_ON);
            add(name + '\n');
            add(CMD.BOLD_OFF);
            
            const unitSuffix = item.unit === 'Kg' ? 'kg' : 'pza';
            const qtyStr = `${item.quantity} ${unitSuffix} x $${item.price.toFixed(2)}`;
            const priceVal = item.price * item.quantity;
            const priceStr = `$${priceVal.toFixed(2)}`;
            const spacesItem = Math.max(1, LAT_WIDTH - qtyStr.length - priceStr.length);
            
            add(`${qtyStr}${' '.repeat(spacesItem)}${priceStr}\n\n`);
        });
        
        add(LAT_SEP);
        
        // Totales
        const totalVal = Number(ticket.total) || 0;
        const tStr = `$${totalVal.toFixed(2)}`;
        const subTxt = `SUBTOTAL: ${tStr}`;
        add(`${' '.repeat(Math.max(0, LAT_WIDTH - subTxt.length))}${subTxt}\n\n`);
        
        add(CMD.ALIGN_CENTER);
        add(CMD.DOUBLE_SIZE);
        add(CMD.BOLD_ON);
        add(`TOTAL ${tStr}\n`);
        add(CMD.BOLD_OFF);
        add(CMD.NORMAL_SIZE);
        
        add(CMD.ALIGN_LEFT);
        add('\n' + LAT_SEP);
        
        // Pago
        add(`${'EFECTIVO:'.padEnd(LAT_WIDTH - tStr.length)}${tStr}\n`);
        add(`${'CAMBIO:'.padEnd(LAT_WIDTH - 5)}$0.00\n`);
        
        add(LAT_SEP);
        add('\n');
        
        add(CMD.ALIGN_CENTER);
        if (footerLine1) add(footerLine1.toUpperCase() + '\n');
        if (footerLine2) add(footerLine2.toUpperCase() + '\n');

        if (showSignature) {
            add('\n\nFIRMA: ________________________\n\n');
        }

        // Corte
        add(CMD.FEED, CMD.FEED, CMD.CUT);
        
        const totalBufferLen = chunks.reduce((n, c) => n + c.length, 0);
        const finalBuffer = new Uint8Array(totalBufferLen);
        let offset = 0;
        chunks.forEach(c => { finalBuffer.set(c, offset); offset += c.length; });
        return finalBuffer;
    }

    // ==========================================
    // PLANTILLA: ESTÁNDAR
    // ==========================================
    // Inicializar
    add(CMD.INIT);
    
    if (useFontB) {
        add([0x1B, 0x4D, 0x01]); // Comando ESC M 1 para Fuente B
    }

    // Encabezado del negocio
    add(CMD.BOLD_ON);
    add(alignTextStr(businessName.toUpperCase(), titleAlignment, LINE_WIDTH) + '\n');
    add(CMD.BOLD_OFF);
    
    if (subtitle) add(alignTextStr(subtitle, titleAlignment, LINE_WIDTH) + '\n');
    if (showAddress && address) add(alignTextStr(address, titleAlignment, LINE_WIDTH) + '\n');
    if (showPhone && phone) add(alignTextStr(`Tel: ${phone}`, titleAlignment, LINE_WIDTH) + '\n');
    if (extraLine1) add(centerText(extraLine1, LINE_WIDTH) + '\n');
    if (extraLine2) add(centerText(extraLine2, LINE_WIDTH) + '\n');


    if (isReprint) {
        add(CMD.BOLD_ON);
        add(centerText('** REIMPRESION **', LINE_WIDTH) + '\n');
        add(CMD.BOLD_OFF);
    }
    
    add(SEP);

    // Info del ticket
    add(`Ticket : #${ticket.id.slice(-6).toUpperCase()}\n`);
    if (showDate) add(`Fecha  : ${new Date(ticket.date).toLocaleDateString('es-MX')}\n`);
    if (showTime) add(`Hora   : ${new Date(ticket.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}\n`);

    
    add(SEP);

    // Repartidor y cliente
    if (showSeller || showCustomer) add(SEP);
    if (showSeller) add(`Repartidor: ${user?.name || 'Administrador'}\n`);
    if (showCustomer) add(`Cliente   : ${client?.name || 'General'}\n`);
    
    add(SEP);

    // Cabecera tabla (MAYUSCULAS CENTRADAS O ALINEADAS)
    add(CMD.BOLD_ON);
    add('CANT CONCEPTO         IMPORTE\n');
    add(CMD.BOLD_OFF);
    add(SEP);

    // Items
    const items = ticket.items || [];
    items.forEach(item => {
        const name = (item.name || 'Producto').slice(0, 16);
        const qty = `${item.quantity}${item.unit === 'Kg' ? 'kg' : 'x'}`.padEnd(5);
        const price = `$${(item.price * item.quantity).toFixed(2)}`;
        
        // Espaciado dinámico para que el importe quede a la derecha
        const spaces = LINE_WIDTH - qty.length - price.length;
        const concept = name.padEnd(spaces);
        
        add(`${qty}${concept}${price}\n`);
        
        // Detalle secundario (Precio unitario y piezas)
        let detail = `  @ $${item.price.toFixed(2)}/u`;
        if (item.pieces > 0) detail += ` [${item.pieces} pzas]`;
        add(detail + '\n');
    });

    // Total (DESTACADO)
    add(SEP2);
    const totalStr = `TOTAL $${ticket.total.toFixed(2)}`;
    add(CMD.BOLD_ON);
    // Intentamos centrado manual del total para que luzca mejor
    add(centerText(totalStr, LINE_WIDTH) + '\n');
    add(CMD.BOLD_OFF);
    add(SEP);

    // Pie de página (CENTRADO)
    if (footerLine1) add(centerText(footerLine1, LINE_WIDTH) + '\n');
    if (footerLine2) add(centerText(footerLine2, LINE_WIDTH) + '\n');
    add('\n');

    if (showSignature) {
        add('Firma: ________________________\n\n');
    }

    // Corte
    add(CMD.FEED, CMD.CUT);

    // Concatenar todo
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const buffer = new Uint8Array(total);
    let offset = 0;
    chunks.forEach(c => { buffer.set(c, offset); offset += c.length; });
    return buffer;
}



// ─── Enviar datos en chunks (BT tiene límite de MTU ~20 bytes) ───────────────
async function sendInChunks(characteristic, data, chunkSize = 512) {
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);
        // Pequeña pausa para no saturar el buffer de la impresora
        await new Promise(r => setTimeout(r, 20));
    }
}

// ─── Conectar a impresora ─────────────────────────────────────────────────────
export async function connectPrinter() {
    if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth no está disponible en este navegador. Usa Chrome o Edge.');
    }

    const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
            PRINTER_SERVICE_UUID,
            NORDIC_SERVICE_UUID,
            '0000ff00-0000-1000-8000-00805f9b34fb',
            '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        ],
    });

    const server = await device.gatt.connect();

    let characteristic = null;
    const serviceUUIDs = [
        { service: PRINTER_SERVICE_UUID, char: PRINTER_CHAR_UUID },
        { service: NORDIC_SERVICE_UUID, char: NORDIC_TX_CHAR_UUID },
        { service: '0000ff00-0000-1000-8000-00805f9b34fb', char: '0000ff02-0000-1000-8000-00805f9b34fb' },
    ];

    for (const { service, char } of serviceUUIDs) {
        try {
            const svc = await server.getPrimaryService(service);
            characteristic = await svc.getCharacteristic(char);
            break;
        } catch { continue; }
    }

    if (!characteristic) {
        const services = await server.getPrimaryServices();
        for (const svc of services) {
            const chars = await svc.getCharacteristics();
            const writable = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
            if (writable) { characteristic = writable; break; }
        }
    }

    if (!characteristic) {
        throw new Error('No se encontró canal de escritura en la impresora.');
    }

    return { device, server, characteristic };
}

/**
 * Intenta reconectar a una impresora previamente autorizada.
 */
export async function autoConnectPrinter(lastDeviceName = null) {
    if (!navigator.bluetooth || !navigator.bluetooth.getDevices) return null;

    try {
        const devices = await navigator.bluetooth.getDevices();
        if (devices.length === 0) return null;

        let device = null;
        if (lastDeviceName) {
            device = devices.find(d => d.name === lastDeviceName);
        }
        
        if (!device && devices.length === 1) {
            device = devices[0];
        }

        if (!device) return null;

        // Intentar conectar GATT
        const server = await device.gatt.connect();

        let characteristic = null;
        const serviceUUIDs = [
            { service: PRINTER_SERVICE_UUID, char: PRINTER_CHAR_UUID },
            { service: NORDIC_SERVICE_UUID, char: NORDIC_TX_CHAR_UUID },
            { service: '0000ff00-0000-1000-8000-00805f9b34fb', char: '0000ff02-0000-1000-8000-00805f9b34fb' },
        ];

        for (const { service, char } of serviceUUIDs) {
            try {
                const svc = await server.getPrimaryService(service);
                characteristic = await svc.getCharacteristic(char);
                break;
            } catch { continue; }
        }

        if (!characteristic) {
            const services = await server.getPrimaryServices();
            for (const svc of services) {
                const chars = await svc.getCharacteristics();
                characteristic = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
                if (characteristic) break;
            }
        }

        if (!characteristic) return null;

        return { device, server, characteristic };
    } catch (err) {
        console.warn('Auto-reconexión fallida:', err);
        return null;
    }
}

// ─── Imprimir ticket completo ─────────────────────────────────────────────────
export async function printTicket({ ticket, user, client, isReprint = false, characteristic, config = {} }) {
    const buffer = buildTicketBuffer({ ticket, user, client, isReprint, config });
    await sendInChunks(characteristic, buffer);
}

// ─── Test de conexión (imprime línea de prueba) ───────────────────────────────
export async function printTestPage(characteristic) {
    const buffer = toBytes(
        CMD.INIT,
        CMD.ALIGN_CENTER,
        CMD.BOLD_ON,
        CMD.DOUBLE_SIZE,
        'QUESOS EL BUEN SABOR\n',
        CMD.NORMAL_SIZE,
        CMD.BOLD_OFF,
        '----------------------------\n',
        'Conexion Exitosa!\n',
        `${new Date().toLocaleString('es-MX')}\n`,
        '----------------------------\n\n\n',
        CMD.CUT
    );
    await sendInChunks(characteristic, buffer);
}

// ─── Persistencia en localStorage ────────────────────────────────────────────
export function savePrinterName(name) {
    localStorage.setItem('bt_printer_name', name);
}

export function getSavedPrinterName() {
    return localStorage.getItem('bt_printer_name') || null;
}

export function clearSavedPrinter() {
    localStorage.removeItem('bt_printer_name');
}
