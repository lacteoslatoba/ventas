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
        footerLine1 = '¡Gracias por su compra!',
        footerLine2 = '',
        showLabels = true,
        showSignature = true,
        showSeller = true, showCustomer = true,
        showAddress = true, showPhone = true,
        ticketTemplate = 'standard',
        metadataUppercase = false,
        metadataAlignment = 'between',
        metadataSpacing = 0,
        showMainTitle = true,
        showBusinessName = true,
        metadataSize = 10,
        multiLineItems = true,
        totalFontSize = 14,
        itemsHeaderLeft = 'CANT/CONCEPTO',
        itemsHeaderRight = 'IMPORTE',
        showItemsHeader = true,
        spaceBetweenItems = false,
        showCashAndChange = true,
        centerTotal = false,
        showLogo = true,
        logoUrl = null,
        paperWidth = 58,
        // Nuevas
        businessNameBold = true,
        metadataBold = false,
        totalBold = true,
        itemsBold = false,
        showSubtotal = true,
        showSeparatorHeader = true,
        showSeparatorItems = true,
        showSeparatorFooter = true,
        separatorStyle = 'dashed',
        headerSpacing = 0,
        footerSpacing = 0,
        showSubtitle = true,
        subtotalAlignment = 'right',
        subtotalTotalSpacing = 0,
        showFooterLine1 = true,
        showFooterLine2 = true,
        footerFontSize = 9,
        footerBold = false,
        totalToFooterSpacing = 0,
        itemsSectionSpacing = 0,
        showPaymentMethod = true,
    } = config;

    console.log('[DEBUG IMPRESORA] Config de pie de página:', {
        showFooterLine1,
        showFooterLine2,
        footerLine1,
        footerLine2,
        ticketTemplate,
        showCashAndChange,
        showSignature,
        raw_showFooterLine1: config.showFooterLine1,
    });

    const chunks = [];
    const add = (...parts) => chunks.push(toBytes(...parts));

    // Forzamos un ancho más seguro para impresoras de 58mm (generalmente 32 caps)
    const WIDTH = paperWidth === 80 ? 48 : 31;
    const SEP_CHAR = separatorStyle === 'solid' ? '_' : '-';
    const SEP = SEP_CHAR.repeat(WIDTH) + '\r\n';

    const formatMetaLine = (l, r = '') => {
        const align = metadataAlignment || 'between';
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

        const truncated = line.slice(0, WIDTH);
        const finalLine = metadataUppercase ? truncated.toUpperCase() : truncated;
        return spacing + finalLine + '\r\n';
    };

    const col2 = (l, r) => {
        const spaces = Math.max(1, WIDTH - String(l).length - String(r).length);
        return String(l) + ' '.repeat(spaces) + String(r) + '\r\n';
    };

    if (ticketTemplate === 'latoba') {
        add(CMD.INIT);
        if (headerSpacing > 0) {
            let hLines = headerSpacing > 10 ? 2 : 1;
            add('\r\n'.repeat(hLines));
        }
        add(CMD.ALIGN_CENTER);

        // Procesar Logo si existe y está habilitado
        if (showLogo && logoUrl) {
            const logoBytes = await processImage(logoUrl, WIDTH * 8);
            if (logoBytes) add(logoBytes, '\r\n');
        }

        if (showBusinessName !== false) {
            if (businessNameBold) add(CMD.BOLD_ON);
            
            if (config.businessNameSize > 16) {
                add(CMD.DOUBLE_SIZE);
            }
            
            add((businessName || 'LACTEOS LA TOBA').toUpperCase() + '\r\n');
            add(CMD.NORMAL_SIZE);
            if (businessNameBold) add(CMD.BOLD_OFF);
        }
        
        if (showSubtitle && subtitle) add(subtitle.toUpperCase() + '\r\n');
        if (showAddress && address) add(address.toUpperCase() + '\r\n');
        if (showPhone && phone) add(`TEL: ${phone}\r\n`);

        if (showSeparatorHeader) add(SEP);
        add(CMD.ALIGN_LEFT);
        
        const dateObj = new Date(ticket.date || Date.now());
        const dStr = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
        const tStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        
        if (metadataBold) add(CMD.BOLD_ON);

        const labelFecha = showLabels ? 'FECHA' : '';
        const labelHora = showLabels ? 'HORA' : '';
        add(formatMetaLine(showLabels ? `${labelFecha}: ${dStr}` : dStr, showLabels ? `${labelHora}: ${tStr}` : tStr));

        const tId = `#${(ticket.id || '').toUpperCase().slice(-6)}`;
        add(formatMetaLine(showLabels ? 'Ticket' : '', tId));

        if (showCustomer) {
            const cName = (client?.name || 'GENERAL').slice(0, 15);
            add(formatMetaLine(showLabels ? 'Cliente' : '', cName));
        }
        if (showSeller) {
            const sName = (user?.name || 'VENDEDOR').slice(0, 15);
            add(formatMetaLine(showLabels ? 'Repartidor' : '', sName));
        }
        if (showPaymentMethod) {
            const pm = ticket.paymentMethod === 'transferencia' ? 'TRANSFERENCIA' : 'EFECTIVO';
            add(formatMetaLine(showLabels ? 'Pago' : '', pm));
        }

        if (metadataBold) add(CMD.BOLD_OFF);

        if (showSeparatorItems) add(SEP);

        if (showItemsHeader) {
            add(CMD.BOLD_ON);
            add(formatMetaLine(itemsHeaderLeft.toUpperCase(), itemsHeaderRight.toUpperCase()));
            add(CMD.BOLD_OFF);
            add(SEP);
        }

        if (itemsBold) add(CMD.BOLD_ON);
        for (const item of ticket.items || []) {
            if (multiLineItems) {
                // Estilo solicitado: Nombre arriba, Qty y Precio abajo
                add(item.name.toUpperCase().slice(0, WIDTH) + '\r\n');
                
                const qtyStr = `${item.quantity || 0}${item.unit === 'Kg' ? 'kg' : 'x'} x $${Number(item.price || 0).toFixed(2)}`;
                const totStr = `$${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}`;
                add(col2(qtyStr, totStr));
            } else {
                // Estilo compacto (una sola línea)
                const qtyStr = `${item.quantity}${item.unit === 'Kg' ? 'k' : 'x'}`;
                const nameStr = item.name.toUpperCase().slice(0, WIDTH - 12);
                const totStr = `$${(Number(item.price) * Number(item.quantity)).toFixed(2)}`;
                add(col2(`${qtyStr} ${nameStr}`, totStr));
            }
            if (spaceBetweenItems) add('\r\n');
        }
        if (itemsBold) add(CMD.BOLD_OFF);

        if (itemsSectionSpacing > 0) {
            let itemSpacingLines = 0;
            if (itemsSectionSpacing > 0) itemSpacingLines = 1;
            if (itemsSectionSpacing > 10) itemSpacingLines = 2;
            if (itemSpacingLines > 0) add('\r\n'.repeat(itemSpacingLines));
        }

        if (showSeparatorFooter) add(SEP);

        if (showSubtotal) {
             const subtotalStr = `SUBTOTAL: $${ticket.total?.toFixed(2)}`;
             if (subtotalAlignment === 'center') add(CMD.ALIGN_CENTER, subtotalStr + '\r\n');
             else if (subtotalAlignment === 'left') add(CMD.ALIGN_LEFT, subtotalStr + '\r\n');
             else if (subtotalAlignment === 'between') add(formatMetaLine('SUBTOTAL', `$${ticket.total?.toFixed(2)}`));
             else add(CMD.ALIGN_RIGHT, subtotalStr + '\r\n');
             
             let subSpacingLines = 0;
             if (subtotalTotalSpacing > 0) subSpacingLines = 1;
             if (subtotalTotalSpacing > 10) subSpacingLines = 2;
             if (subSpacingLines > 0) add('\r\n'.repeat(subSpacingLines));
        }

        if (totalBold) add(CMD.BOLD_ON);
        if (totalFontSize > 16) add(CMD.DOUBLE_SIZE);
        if (centerTotal) add(CMD.ALIGN_CENTER);
        
        add(`TOTAL $${ticket.total?.toFixed(2)}\r\n`);
        
        add(CMD.NORMAL_SIZE);
        if (totalBold) add(CMD.BOLD_OFF);
        add(CMD.ALIGN_CENTER);

        if (showSeparatorFooter) add(SEP);

        if (showCashAndChange !== false) {
            add(formatMetaLine('EFECTIVO:', `$${ticket.total?.toFixed(2)}`)); // Assuming cash paid is total for now
            add(formatMetaLine('CAMBIO:', '$0.00')); // Assuming no change for now
            add(SEP);
        }
        
        // Espacio entre TOTAL y mensaje de despedida
        const footerExtraLines = totalToFooterSpacing > 10 ? 2 : totalToFooterSpacing > 0 ? 1 : 0;
        if (footerExtraLines > 0) add('\r\n'.repeat(footerExtraLines));
        add(CMD.ALIGN_CENTER);

        if (footerBold) add(CMD.BOLD_ON);
        if (footerFontSize > 12) add(CMD.DOUBLE_SIZE);

        const f1 = footerLine1 || '¡Gracias por su compra!';
        const f2 = footerLine2 || '';
        if (showFooterLine1) add(f1.toUpperCase() + '\r\n');
        if (showFooterLine2 && f2) add(f2.toUpperCase() + '\r\n');

        if (footerFontSize > 12) add(CMD.NORMAL_SIZE);
        if (footerBold) add(CMD.BOLD_OFF);

        if (showSignature) add('\r\nFIRMA: __________________\r\n');

        // footerSpacing = líneas de avance de papel al final
        add('\r\n'.repeat(footerSpacing > 0 ? footerSpacing : 6), [ESC, 0x69]);
    } else {
        // Estándar muy robusto
        add(CMD.INIT);
        if (headerSpacing > 0) {
            let hLines = headerSpacing > 10 ? 2 : 1;
            add('\r\n'.repeat(hLines));
        }
        add(CMD.ALIGN_CENTER);

        // Procesar Logo si existe y está habilitado
        if (showLogo && logoUrl) {
            const logoBytes = await processImage(logoUrl, WIDTH * 8);
            if (logoBytes) add(logoBytes, '\r\n');
        }

        if (showMainTitle !== false) add('TICKET DE VENTA\r\n');
        
        if (showBusinessName !== false) {
            if (businessNameBold) add(CMD.BOLD_ON);
            if (config.businessNameSize > 16) add(CMD.DOUBLE_SIZE);
            add(businessName.toUpperCase() + '\r\n');
            if (config.businessNameSize > 16) add(CMD.NORMAL_SIZE);
            if (businessNameBold) add(CMD.BOLD_OFF);
        }

        if (showSubtitle && subtitle) add(subtitle.toUpperCase() + '\r\n');
        if (showAddress && address) add(address.toUpperCase() + '\r\n');
        if (showPhone && phone) add(`TEL: ${phone}\r\n`);

        if (showSeparatorHeader) add(SEP);
        add(CMD.ALIGN_LEFT);

        if (metadataBold) add(CMD.BOLD_ON);

        const dateObj = new Date(ticket.date || Date.now());
        const dStr = dateObj.toLocaleDateString('es-MX');
        const tStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        const tId = `#${(ticket.id || '').toUpperCase().slice(-6)}`;

        add(formatMetaLine(showLabels ? 'Fecha' : '', `${dStr} ${tStr}`));
        add(formatMetaLine(showLabels ? 'Ticket' : '', tId));

        if (showSeller) add(formatMetaLine(showLabels ? 'Repartidor' : '', user?.name || 'Vendedor'));
        if (showCustomer) add(formatMetaLine(showLabels ? 'Cliente' : '', client?.name || 'General'));
        if (showPaymentMethod) {
            const pm = ticket.paymentMethod === 'transferencia' ? 'TRANSFERENCIA' : 'EFECTIVO';
            add(formatMetaLine(showLabels ? 'Pago' : '', pm));
        }

        if (metadataBold) add(CMD.BOLD_OFF);

        if (showSeparatorItems) add(SEP);
        
        if (showItemsHeader) {
            add(CMD.BOLD_ON);
            add(formatMetaLine(itemsHeaderLeft.toUpperCase(), itemsHeaderRight.toUpperCase()));
            add(CMD.BOLD_OFF);
            add(SEP);
        }

        if (itemsBold) add(CMD.BOLD_ON);
        for (const item of ticket.items || []) {
            if (multiLineItems) {
                add(item.name.toUpperCase().slice(0, WIDTH) + '\r\n');
                const qtyStr = `${item.quantity || 0}${item.unit === 'Kg' ? 'kg' : 'x'} x $${Number(item.price || 0).toFixed(2)}`;
                const totStr = `$${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}`;
                add(col2(qtyStr, totStr));
            } else {
                const rowTotal = (Number(item.price) * Number(item.quantity)).toFixed(2);
                add(col2(`${item.quantity} ${item.name.toUpperCase().slice(0, WIDTH - 10)}`, `$${rowTotal}`));
            }
            if (spaceBetweenItems) add('\r\n');
        }
        if (itemsBold) add(CMD.BOLD_OFF);

        if (itemsSectionSpacing > 0) {
            let itemSpacingLines = 0;
            if (itemsSectionSpacing > 0) itemSpacingLines = 1;
            if (itemsSectionSpacing > 10) itemSpacingLines = 2;
            if (itemSpacingLines > 0) add('\r\n'.repeat(itemSpacingLines));
        }
        
        if (showSeparatorFooter) add(SEP);
        
        if (showSubtotal) {
             const subtotalStr = `SUBTOTAL: $${ticket.total?.toFixed(2)}`;
             if (subtotalAlignment === 'center') add(CMD.ALIGN_CENTER, subtotalStr + '\r\n');
             else if (subtotalAlignment === 'left') add(CMD.ALIGN_LEFT, subtotalStr + '\r\n');
             else if (subtotalAlignment === 'between') add(formatMetaLine('SUBTOTAL', `$${ticket.total?.toFixed(2)}`));
             else add(CMD.ALIGN_RIGHT, subtotalStr + '\r\n');

             let subSpacingLines = 0;
             if (subtotalTotalSpacing > 0) subSpacingLines = 1;
             if (subtotalTotalSpacing > 10) subSpacingLines = 2;
             if (subSpacingLines > 0) add('\r\n'.repeat(subSpacingLines));
        }

        if (totalBold) add(CMD.BOLD_ON);
        const finalTotStr = `$${Number(ticket.total).toFixed(2)}`;
        
        if (totalFontSize > 16) add(CMD.DOUBLE_SIZE);
        
        if (centerTotal) {
            add(CMD.ALIGN_CENTER, `TOTAL: ${finalTotStr}\r\n`);
        } else {
            add(col2('TOTAL:', finalTotStr));
        }
        
        if (totalFontSize > 16) add(CMD.NORMAL_SIZE);
        if (totalBold) add(CMD.BOLD_OFF);
        add(CMD.ALIGN_CENTER);
        
        if (showSeparatorFooter) add(SEP);

        // Espacio entre TOTAL y mensaje de despedida
        const footerExtraLinesStd = totalToFooterSpacing > 10 ? 2 : totalToFooterSpacing > 0 ? 1 : 0;
        if (footerExtraLinesStd > 0) add('\r\n'.repeat(footerExtraLinesStd));

        if (footerBold) add(CMD.BOLD_ON);
        if (footerFontSize > 12) add(CMD.DOUBLE_SIZE);

        const f1Std = footerLine1 || '¡Gracias por su compra!';
        const f2Std = footerLine2 || '';
        if (showFooterLine1) add(f1Std.toUpperCase() + '\r\n');
        if (showFooterLine2 && f2Std) add(f2Std.toUpperCase() + '\r\n');

        if (footerFontSize > 12) add(CMD.NORMAL_SIZE);
        if (footerBold) add(CMD.BOLD_OFF);

        // footerSpacing = líneas de avance de papel al final
        add('\r\n'.repeat(footerSpacing > 0 ? footerSpacing : 6), [ESC, 0x69]);
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
    if (!navigator.bluetooth) throw new Error('Bluetooth no disponible. Usa Google Chrome en Android.');
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

// Reconecta usando requestDevice con filtro por nombre guardado.
// Requiere gesto del usuario pero pre-selecciona la impresora correcta.
export async function reconnectByName(name) {
    const device = await navigator.bluetooth.requestDevice({
        filters: [{ name }],
        optionalServices: [PRINTER_SERVICE_UUID, NORDIC_SERVICE_UUID, '0000ff00-0000-1000-8000-00805f9b34fb']
    });
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
