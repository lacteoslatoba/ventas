/**
 * useBTPrinter.js
 * Hook compartido para acceder a la instancia global de impresora Bluetooth.
 * Intenta reconectar automáticamente al:
 *   - montar la app
 *   - primer toque del usuario (requerido por Chrome)
 *   - regresar a la app desde segundo plano (visibilitychange / focus)
 *   - perder la conexión (gattserverdisconnected)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { autoConnectPrinter, getSavedPrinterName } from './bluetoothPrinter';

function getGlobalPrinter() { return window.__btPrinter || null; }
function setGlobalPrinter(p) { window.__btPrinter = p; }

export function useBTPrinter() {
    const [printer, setPrinterState] = useState(getGlobalPrinter);
    const [reconnecting, setReconnecting] = useState(!!window.__isBTReconnecting);
    const retryTimeoutRef = useRef(null);

    const setPrinter = useCallback((p) => {
        setGlobalPrinter(p);
        setPrinterState(p);
    }, []);

    const tryReconnect = useCallback(async ({ silent = false } = {}) => {
        const current = getGlobalPrinter();
        if (current?.device?.gatt?.connected || window.__isBTReconnecting) return;

        const lastPrinter = getSavedPrinterName();
        if (!lastPrinter) return;

        window.__isBTReconnecting = true;
        if (!silent) setReconnecting(true);

        try {
            const result = await autoConnectPrinter(lastPrinter);
            if (result) {
                setGlobalPrinter(result);
                setPrinterState(result);

                // Al desconectarse, reintenta automáticamente una vez tras 2s
                result.device.addEventListener('gattserverdisconnected', () => {
                    setGlobalPrinter(null);
                    setPrinterState(null);
                    clearTimeout(retryTimeoutRef.current);
                    retryTimeoutRef.current = setTimeout(() => {
                        tryReconnect({ silent: true });
                    }, 2000);
                });
            }
        } catch (e) {
            console.warn('Fallo reconexión BT:', e.message);
        } finally {
            window.__isBTReconnecting = false;
            setReconnecting(false);
        }
    }, []);

    useEffect(() => {
        // Intento inicial al montar
        tryReconnect();

        // Reconectar cuando el usuario vuelve a la app (pantalla encendida / cambio de pestaña)
        const handleVisible = () => {
            if (document.visibilityState === 'visible') tryReconnect({ silent: true });
        };
        const handleFocus = () => tryReconnect({ silent: true });

        // También al primer gesto del usuario (requisito de Chrome para BT)
        const handleGesture = () => {
            tryReconnect({ silent: true });
            window.removeEventListener('click', handleGesture);
            window.removeEventListener('touchstart', handleGesture);
        };

        document.addEventListener('visibilitychange', handleVisible);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('click', handleGesture);
        window.addEventListener('touchstart', handleGesture);

        return () => {
            document.removeEventListener('visibilitychange', handleVisible);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('click', handleGesture);
            window.removeEventListener('touchstart', handleGesture);
            clearTimeout(retryTimeoutRef.current);
        };
    }, [tryReconnect]);

    // Polling ligero para sincronizar estado global con el estado de React
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
