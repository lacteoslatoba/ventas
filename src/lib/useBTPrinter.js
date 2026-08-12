/**
 * useBTPrinter.js
 * Hook compartido para acceder a la instancia global de impresora Bluetooth.
 * Auto-reconecta al iniciar sesión con reintentos cada 5s por ~1 minuto.
 *
 * El hook se monta en varios lugares a la vez (PrinterAutoConnect global,
 * PrinterSettings, MobileHeader...). El bucle de reintentos vive a nivel de
 * MÓDULO (no por instancia de hook) para que sea un único bucle real: así,
 * cancelarlo desde cualquier pantalla lo detiene de verdad en todos lados,
 * en vez de solo silenciar la bandera de una instancia mientras otra sigue
 * reintentando en segundo plano contra un dispositivo que ya no existe.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { autoConnectPrinter, getSavedPrinterName } from './bluetoothPrinter';

function getGlobalPrinter() { return window.__btPrinter || null; }
function setGlobalPrinter(p) { window.__btPrinter = p; }

const MAX_RETRIES = 12;   // 12 intentos × 5s = ~1 minuto
const RETRY_DELAY = 5000;

// --- Estado singleton del bucle de reintentos (compartido por todas las instancias) ---
let retryTimer = null;
let retryCount = 0;
let retryGeneration = 0; // se incrementa al cancelar, para invalidar callbacks en vuelo

function stopRetryGlobal() {
    clearTimeout(retryTimer);
    retryTimer = null;
    retryGeneration += 1;
    window.__isBTReconnecting = false;
}

// Detiene el bucle de reintentos por completo (llamable desde cualquier pantalla).
export function cancelAutoConnect() {
    retryCount = MAX_RETRIES;
    stopRetryGlobal();
}

function scheduleRetryGlobal(connectFn) {
    clearTimeout(retryTimer);
    if (retryCount >= MAX_RETRIES) {
        stopRetryGlobal();
        return;
    }
    window.__isBTReconnecting = true;
    const myGeneration = retryGeneration;

    retryTimer = setTimeout(async () => {
        if (myGeneration !== retryGeneration) return; // se canceló mientras esperábamos
        retryCount += 1;
        try {
            const handleDisconnect = () => {
                if (myGeneration !== retryGeneration) return;
                const curr = getGlobalPrinter();
                if (curr) curr.isConnected = false;
                setGlobalPrinter(null);
                retryCount = 0;
                scheduleRetryGlobal(connectFn);
            };

            const result = await connectFn(handleDisconnect);
            if (myGeneration !== retryGeneration) return; // se canceló durante el connect()
            if (result) {
                setGlobalPrinter(result);
                stopRetryGlobal();
            } else {
                scheduleRetryGlobal(connectFn);
            }
        } catch {
            if (myGeneration !== retryGeneration) return;
            scheduleRetryGlobal(connectFn);
        }
    }, RETRY_DELAY);
}

function startAutoConnectGlobal() {
    const savedDeviceId = getSavedPrinterName();
    if (!savedDeviceId) return;
    if (getGlobalPrinter()?.isConnected) return;
    if (window.__isBTReconnecting) return;

    retryCount = 0;
    window.__isBTReconnecting = true;
    const myGeneration = retryGeneration;

    const connectFn = (onDisc) => autoConnectPrinter(savedDeviceId, onDisc || handleDisconnect);

    const handleDisconnect = () => {
        if (myGeneration !== retryGeneration) return;
        const curr = getGlobalPrinter();
        if (curr) curr.isConnected = false;
        setGlobalPrinter(null);
        retryCount = 0;
        scheduleRetryGlobal(connectFn);
    };

    connectFn().then(result => {
        if (myGeneration !== retryGeneration) return;
        if (result) {
            setGlobalPrinter(result);
            stopRetryGlobal();
        } else {
            scheduleRetryGlobal(connectFn);
        }
    }).catch(() => {
        if (myGeneration !== retryGeneration) return;
        scheduleRetryGlobal(connectFn);
    });
}

export function useBTPrinter() {
    const [printer, setPrinterState] = useState(getGlobalPrinter);
    const [reconnecting, setReconnecting] = useState(false);
    const mountedRef = useRef(true);

    const setPrinter = useCallback((p) => {
        setGlobalPrinter(p);
        setPrinterState(p);
    }, []);

    const startAutoConnect = useCallback(() => {
        startAutoConnectGlobal();
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        // Auto-conectar al montar (inicio de sesión)
        setTimeout(() => {
            if (mountedRef.current) startAutoConnect();
        }, 0);

        // Reconectar cuando el usuario vuelve a la app
        const handleVisible = () => {
            if (document.visibilityState === 'visible' && !getGlobalPrinter()?.isConnected) {
                startAutoConnect();
            }
        };
        const handleFocus = () => {
            if (!getGlobalPrinter()?.isConnected) startAutoConnect();
        };

        document.addEventListener('visibilitychange', handleVisible);
        window.addEventListener('focus', handleFocus);

        return () => {
            mountedRef.current = false;
            document.removeEventListener('visibilitychange', handleVisible);
            window.removeEventListener('focus', handleFocus);
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

    return { printer, setPrinter, isReconnecting: reconnecting, startAutoConnect, cancelAutoConnect };
}
