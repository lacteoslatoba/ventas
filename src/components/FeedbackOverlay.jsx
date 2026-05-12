import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useStore } from '../store';

export const OfflineBanner = () => {
  const { isOnline, isSyncing, products, users, clients, sales, inventory, deliveries, ticketConfig } = useStore();
  const [show, setShow] = React.useState(true);

  const pendingCount = React.useMemo(() => {
    const tables = [products, users, clients, sales, inventory, deliveries];
    let count = tables.reduce((acc, t) => acc + t.filter(i => !i.synced).length, 0);
    if (ticketConfig && !ticketConfig.synced) count++;
    return count;
  }, [products, users, clients, sales, inventory, deliveries, ticketConfig]);

  React.useEffect(() => { setShow(true); }, [isSyncing, isOnline]);

  if (!show || (isOnline && !isSyncing && pendingCount === 0)) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[35] w-max max-w-[90%] animate-in slide-in-from-top-2 duration-500">
      <div className={`px-4 py-2 rounded-full shadow-lg border backdrop-blur-md flex items-center gap-2.5 text-[10px] font-black uppercase tracking-wider relative ${
        isOnline ? 'bg-emerald-500/90 text-white border-emerald-400/30' : 'bg-amber-500/90 text-white border-amber-400/30'
      }`}>
        {isOnline ? <RefreshCw size={12} className="animate-spin" /> : <WifiOff size={12} className="animate-pulse" />}
        <span className="truncate pr-2">
          {isOnline ? `Sincronizando ${pendingCount > 0 ? `${pendingCount} cambios` : 'datos'}...` : `Sin conexión · ${pendingCount > 0 ? `${pendingCount} pendientes` : 'modo local'}`}
        </span>
        <button onClick={() => setShow(false)} className="w-5 h-5 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center pointer-events-auto">
          <span className="material-symbols-outlined text-[14px]">close</span>
        </button>
      </div>
    </div>
  );
};

export const GlobalConfirmDialog = () => {
  const { confirmDialog, hideConfirm } = useStore();
  if (!confirmDialog) return null;
  const { message, onConfirm, confirmText = 'Confirmar', danger = false } = confirmDialog;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xs bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-150 text-center">
        <p className="text-base font-black text-slate-800 dark:text-slate-100 mb-6 leading-snug">{message}</p>
        <div className="flex gap-3">
          <button onClick={hideConfirm} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm">Cancelar</button>
          <button onClick={() => { hideConfirm(); onConfirm(); }} className={`flex-1 py-3 rounded-2xl font-black text-sm text-white ${danger ? 'bg-red-500' : 'bg-primary'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const InstallBanner = () => {
  const [prompt, setPrompt] = React.useState(null);
  const [dismissed, setDismissed] = React.useState(() => sessionStorage.getItem('pwa-install-dismissed') === '1');

  React.useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!prompt || dismissed) return null;

  const install = async () => {
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setPrompt(null);
  };

  return (
    <div className="fixed bottom-[185px] left-3 right-3 z-[90] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 border border-slate-700">
        <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center font-black text-lg shrink-0">MH</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black leading-tight">Instalar App</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Agrega al inicio para acceso rápido</p>
        </div>
        <button onClick={() => { sessionStorage.setItem('pwa-install-dismissed', '1'); setDismissed(true); }} className="text-slate-500 hover:text-white px-2">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
        <button onClick={install} className="bg-primary text-white text-xs font-black px-4 py-2 rounded-xl active:scale-95 transition-all">Instalar</button>
      </div>
    </div>
  );
};
