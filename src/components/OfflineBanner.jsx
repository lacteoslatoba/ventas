import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useStore } from '../store';

// Banner que muestra el estado de conexión y sincronización.
const OfflineBanner = () => {
    const { isOnline, isSyncing, products, users, clients, sales, inventory, expenses, ticketConfig } = useStore();

    const pendingCount = React.useMemo(() => {
        const tables = [products, users, clients, sales, inventory, expenses];
        let count = tables.reduce((acc, t) => acc + (t || []).filter(i => !i.synced).length, 0);
        if (ticketConfig && !ticketConfig.synced) count++;
        return count;
    }, [products, users, clients, sales, inventory, expenses, ticketConfig]);

    // ── Sin conexión ──────────────────────────────────────────────────────────
    if (!isOnline) {
        return (
            <div className="flex-shrink-0 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-black no-print select-none">
                <WifiOff size={13} />
                <span>
                    Sin conexión
                    {pendingCount > 0 && ` · ${pendingCount} cambio${pendingCount !== 1 ? 's' : ''} sin subir`}
                </span>
            </div>
        );
    }

    // ── Online + sincronizando ────────────────────────────────────────────────
    if (isSyncing) {
        return (
            <div className="flex-shrink-0 bg-blue-500 text-white px-4 py-1.5 flex items-center justify-center gap-2 text-[11px] font-bold no-print select-none">
                <RefreshCw size={11} className="animate-spin" />
                <span>Sincronizando{pendingCount > 0 ? ` ${pendingCount} cambio${pendingCount !== 1 ? 's' : ''}` : ''}…</span>
            </div>
        );
    }

    // ── Online + hay pendientes sin subir (sync falló o aún no corrió) ────────
    if (pendingCount > 0) {
        return (
            <button
                onClick={() => useStore.getState().syncOnReconnect()}
                className="flex-shrink-0 bg-orange-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-black no-print select-none w-full active:bg-orange-600 transition-colors"
            >
                <RefreshCw size={12} />
                <span>
                    {pendingCount} cambio{pendingCount !== 1 ? 's' : ''} sin subir · Toca para sincronizar
                </span>
            </button>
        );
    }

    return null;
};

export default OfflineBanner;
