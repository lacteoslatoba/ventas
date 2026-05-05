/**
 * useBTPrinter.js
 * Hook compartido para acceder a la instancia global de impresora Bluetooth.
 * Auto-reconecta al iniciar sesión con reintentos cada 5s por ~1 minuto.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { autoConnectPrinter, getSavedPrinterName } from './bluetoothPrinter';

function getGlobalPrinter() { return window.__btPrinter || null; }
function setGlobalPrinter(p) { window.__btPrinter = p; }

const MAX_RETRIES = 12;   // 12 intentos × 5s = ~1 minuto
const RETRY_DELAY = 5000;

export function useBTPrinter() {
    const [printer, setPrinterState] = useState(getGlobalPrinter);
    const [reconnecting, setReconnecting] = useState(false);
    const retryTimerRef = useRef(null);
    const retryCountRef = useRef(0);
    const mountedRef = useRef(true);

    const setPrinter = useCallback((p) => {
        setGlobalPrinter(p);
        setPrinterState(p);
    }, []);

    const stopRetry = useCallback(() => {
        clearTimeout(retryTimerRef.current);
        window.__isBTReconnecting = false;
        if (mountedRef.current) setReconnecting(false);
    }, []);

    const scheduleRetry = useCallback((connectFn) => {
        clearTimeout(retryTimerRef.current);
        if (retryCountRef.current >= MAX_RETRIES) {
            stopRetry();
            return;
        }
        window.__isBTReconnecting = true;
        if (mountedRef.current) setReconnecting(true);

        retryTimerRef.current = setTimeout(async () => {
            if (!mountedRef.current) return;
            retryCountRef.current += 1;
            try {
                const result = await connectFn();
                if (result && mountedRef.current) {
                    setGlobalPrinter(result);
                    setPrinterState(result);
                    stopRetry();
                    result.device.addEventListener('gattserverdisconnected', () => {
                        setGlobalPrinter(null);
                        if (mountedRef.current) setPrinterState(null);
                        // Reiniciar loop al desconectarse inesperadamente
                        retryCountRef.current = 0;
                        scheduleRetry(connectFn);
                    });
                } else {
                    scheduleRetry(connectFn);
                }
            } catch {
                scheduleRetry(connectFn);
            }
        }, RETRY_DELAY);
    }, [stopRetry]);

    const startAutoConnect = useCallback(() => {
        const savedName = getSavedPrinterName();
        if (!savedName) return;
        if (getGlobalPrinter()?.device?.gatt?.connected) return;
        if (window.__isBTReconnecting) return;

        retryCountRef.current = 0;
        window.__isBTReconnecting = true;
        if (mountedRef.current) setReconnecting(true);

        // Primer intento inmediato
        const connectFn = () => autoConnectPrinter(savedName);
        connectFn().then(result => {
            if (!mountedRef.current) return;
            if (result) {
                setGlobalPrinter(result);
                setPrinterState(result);
                stopRetry();
                result.device.addEventListener('gattserverdisconnected', () => {
                    setGlobalPrinter(null);
                    if (mountedRef.current) setPrinterState(null);
                    retryCountRef.current = 0;
                    scheduleRetry(connectFn);
                });
            } else {
                scheduleRetry(connectFn);
            }
        }).catch(() => {
            if (mountedRef.current) scheduleRetry(connectFn);
        });
    }, [scheduleRetry, stopRetry]);

    useEffect(() => {
        mountedRef.current = true;

        // Auto-conectar al montar (inicio de sesión)
        startAutoConnect();

        // Reconectar cuando el usuario vuelve a la app
        const handleVisible = () => {
            if (document.visibilityState === 'visible') {
                if (!getGlobalPrinter()?.device?.gatt?.connected) {
                    retryCountRef.current = 0;
                    startAutoConnect();
                }
            }
        };
        const handleFocus = () => {
            if (!getGlobalPrinter()?.device?.gatt?.connected) {
                retryCountRef.current = 0;
                startAutoConnect();
            }
        };

        document.addEventListener('visibilitychange', handleVisible);
        window.addEventListener('focus', handleFocus);

        return () => {
            mountedRef.current = false;
            document.removeEventListener('visibilitychange', handleVisible);
            window.removeEventListener('focus', handleFocus);
            clearTimeout(retryTimerRef.current);
        };
    }, [startAutoConnect]);

    // Polling para sincronizar estado global → React state
    useEffect(() => {
        const interval = setInterval(() => {
            if (!mountedRef.current) return;
            const current = getGlobalPrinter();
            if (printer !== current) setPrinterState(current);
            const isRec = !!window.__isBTReconnecting;
            if (reconnecting !== isRec) setReconnecting(isRec);
        }, 500);
        return () => clearInterval(interval);
    }, [printer, reconnecting]);

    return { printer, setPrinter, isReconnecting: reconnecting, startAutoConnect };
}
