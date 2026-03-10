/**
 * useBTPrinter.js
 * Hook compartido para acceder a la instancia global de impresora Bluetooth.
 */
import { useState, useEffect, useCallback } from 'react';

function getGlobalPrinter() { return window.__btPrinter || null; }
function setGlobalPrinter(p) { window.__btPrinter = p; }

export function useBTPrinter() {
    const [printer, setPrinterState] = useState(getGlobalPrinter);

    const setPrinter = useCallback((p) => {
        setGlobalPrinter(p);
        setPrinterState(p);
    }, []);

    // Polling para detectar cambios desde otros componentes
    useEffect(() => {
        const interval = setInterval(() => {
            const current = getGlobalPrinter();
            setPrinterState(prev => prev !== current ? current : prev);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return { printer, setPrinter };
}
