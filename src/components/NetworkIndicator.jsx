import React, { useEffect } from 'react';
import { useStore } from '../store';

// Indicador de red + sincronización automática al reconectar.
// Se monta una sola vez en App.jsx.
const NetworkIndicator = () => {
    const { setOnlineStatus } = useStore();

    useEffect(() => {
        // ── Al recuperar conexión: renovar sesión + subir pendientes + bajar frescos ──
        const handleOnline = () => {
            setOnlineStatus(true);
            // 800 ms para que la red se estabilice antes de la primera llamada
            setTimeout(() => useStore.getState().syncOnReconnect(), 800);
        };

        const handleOffline = () => setOnlineStatus(false);

        // ── Al volver al foco (app minimizada o tab oculta) ──
        const handleVisibility = () => {
            if (document.visibilityState !== 'visible') return;
            const s = useStore.getState();
            // Si el navegador sabe que hay red pero el store dice offline, corregirlo
            if (navigator.onLine && !s.isOnline) s.setOnlineStatus(true);
            if (!navigator.onLine || !s.isOnline) return;
            // Sincronizar si el último sync fue hace más de 2 minutos
            const TWO_MIN = 2 * 60 * 1000;
            const stale = !s.lastSync || Date.now() - new Date(s.lastSync).getTime() > TWO_MIN;
            if (stale) setTimeout(() => useStore.getState().syncOnReconnect(), 800);
        };

        // ── Actualización automática de PWA ──
        const checkForUpdates = () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistration().then(reg => {
                    if (reg) reg.update();
                });
            }
        };

        // ── Altura estable para móviles (evita brincos del menú) ──
        const updateHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        // ── Verificación activa de red (Capacitor Android no emite 'online' al arrancar) ──
        const checkAndSync = () => {
            const realOnline = navigator.onLine;
            const s = useStore.getState();
            if (realOnline !== s.isOnline) s.setOnlineStatus(realOnline);
            if (realOnline) {
                const TWO_MIN = 2 * 60 * 1000;
                const stale = !s.lastSync || Date.now() - new Date(s.lastSync).getTime() > TWO_MIN;
                if (stale || !s.lastSync) s.syncOnReconnect();
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('resize', updateHeight);
        window.addEventListener('focus', checkForUpdates);
        document.addEventListener('visibilitychange', handleVisibility);
        updateHeight();
        checkForUpdates();

        // Sync inicial al montar — usar navigator.onLine directo, no el valor del store
        // (el store puede tener isOnline: false guardado del localStorage)
        setTimeout(checkAndSync, 1000);

        // Re-verificar cada 30 s por si el WebView no emitió el evento 'online'
        const intervalId = setInterval(checkAndSync, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('resize', updateHeight);
            window.removeEventListener('focus', checkForUpdates);
            document.removeEventListener('visibilitychange', handleVisibility);
            clearInterval(intervalId);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return null;
};

export default NetworkIndicator;
