import React from 'react';

export default function ExpenseModal({
    expenseDesc,
    setExpenseDesc,
    expenseAmount,
    setExpenseAmount,
    setShowExpenseModal,
    addExpense,
    currentUser,
    repDateFilter,
    showToast
}) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-4">Agregar Gasto</h3>
                <div className="space-y-3 mb-5">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Descripción</label>
                        <input
                            type="text"
                            value={expenseDesc}
                            onChange={e => setExpenseDesc(e.target.value)}
                            placeholder="Ej: Gasto"
                            autoFocus
                            className="w-full bg-slate-50 dark:bg-slate-700 rounded-2xl px-4 py-3 font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Monto ($)</label>
                        <input
                            type="number"
                            value={expenseAmount}
                            onChange={e => setExpenseAmount(e.target.value)}
                            placeholder="0.00"
                            inputMode="decimal"
                            className="w-full bg-slate-50 dark:bg-slate-700 rounded-2xl px-4 py-3 font-black text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 text-lg"
                        />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setShowExpenseModal(false); setExpenseDesc(''); setExpenseAmount(''); }}
                        className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm active:scale-95 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            const amount = Number(expenseAmount);
                            if (!expenseDesc.trim() || !amount || amount <= 0) { showToast('Completa descripción y monto', 'warning'); return; }
                            addExpense({
                                userId: currentUser.id,
                                date: new Date(repDateFilter + 'T12:00:00').toISOString(),
                                description: expenseDesc.trim(),
                                amount,
                            });
                            setShowExpenseModal(false);
                            setExpenseDesc('');
                            setExpenseAmount('');
                        }}
                        className="flex-1 py-3 rounded-2xl bg-primary text-white font-black text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}
