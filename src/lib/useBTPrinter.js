/**
 * useBTPrinter.js
 * Hook compartido para acceder a la instancia global de impresora Bluetooth.
 */
import { useState, useEffect, useCallback } from 'react';
import { autoConnectPrinter, getSavedPrinterName } from './bluetoothPrinter';

function getGlobalPrinter() { return window.__btPrinter || null; }
function setGlobalPrinter(p) { window.__btPrinter = p; }

export function useBTPrinter() {
    const [printer, setPrinterState] = useState(getGlobalPrinter);
    const [reconnecting, setReconnecting] = useState(!!window.__isBTReconnecting);

    const setPrinter = useCallback((p) => {
        setGlobalPrinter(p);
        setPrinterState(p);
    }, []);

    // Intento de reconexión automática al montar el hook
    useEffect(() => {
        const tryReconnect = async () => {
            const current = getGlobalPrinter();
            // Si ya está conectado y funcionando, no hacemos nada
            if (current?.device?.gatt?.connected || window.__isBTReconnecting) return;
            
            const lastPrinter = getSavedPrinterName();
            if (lastPrinter) {
                console.log('Iniciando reconexión automática con:', lastPrinter);
                window.__isBTReconnecting = true;
                setReconnecting(true);
                try {
                    const result = await autoConnectPrinter(lastPrinter);
                    if (result) {
                        setPrinter(result);
                        result.device.addEventListener('gattserverdisconnected', () => {
                            setPrinter(null);
                        });
                    }
                } catch (e) {
                    console.warn('Fallo reconexión:', e);
                } finally {
                    window.__isBTReconnecting = false;
                    setReconnecting(false);
                }
            }
        };

        // Intentar al montar
        tryReconnect();

        // También intentar en el primer clic del usuario (por restricciones de Chrome)
        const handleFirstClick = () => {
            tryReconnect();
            window.removeEventListener('click', handleFirstClick);
            window.removeEventListener('touchstart', handleFirstClick);
        };
        window.addEventListener('click', handleFirstClick);
        window.addEventListener('touchstart', handleFirstClick);

        return () => {
            window.removeEventListener('click', handleFirstClick);
            window.removeEventListener('touchstart', handleFirstClick);
        };
    }, [setPrinter]);

    // Polling para detectar cambios globales
    useEffect(() => {
        const interval = setInterval(() => {
            const current = getGlobalPrinter();
            if (printer !== current) setPrinterState(current);
            
            const isRec = !!window.__isBTReconnecting;
            if (reconnecting !== isRec) setReconnecting(isRec);
        }, 500);
        return () => clearInterval(interval);
    }, [printer, reconnecting]);

    return { printer, setPrinter, isReconnecting: reconnecting };
}
