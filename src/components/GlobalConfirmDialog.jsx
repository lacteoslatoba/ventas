import React from 'react';
import { useStore } from '../store';

// Diálogo de confirmación global (usado por showConfirm del store).
const GlobalConfirmDialog = () => {
    const { confirmDialog, hideConfirm } = useStore();
    if (!confirmDialog) return null;
    const { message, onConfirm, confirmText = 'Confirmar', danger = false } = confirmDialog;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-xs bg-white rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-150">
                <p className="text-base font-black text-slate-800 mb-6 leading-snug">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => hideConfirm()}
                        className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm active:scale-95 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => { hideConfirm(); onConfirm(); }}
                        className={`flex-1 py-3 rounded-2xl font-black text-sm text-white active:scale-95 transition-all ${danger ? 'bg-red-500' : 'bg-gray-900'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GlobalConfirmDialog;
