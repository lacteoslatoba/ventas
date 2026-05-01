import React from 'react';
import { Save, CheckCheck } from 'lucide-react';

export default function Section({ title, icon: Icon, children, onSave, saved }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={16} className="text-primary" />}
                    <h2 className="font-black text-slate-700 text-sm uppercase tracking-wider">{title}</h2>
                </div>
                {onSave && (
                    <button
                        onClick={onSave}
                        className={`text-xs font-black px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm ${saved ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:bg-blue-700 shadow-blue-500/20'
                            }`}
                    >
                        {saved ? (
                            <><CheckCheck size={14} /> Guardado</>
                        ) : (
                            <><Save size={14} /> Guardar</>
                        )}
                    </button>
                )}
            </div>
            <div className="p-5 space-y-4">{children}</div>
        </div>
    );
}
