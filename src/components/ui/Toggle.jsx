import React from 'react';

export default function Toggle({ label, desc, checked, onChange, id }) {
    return (
        <div className="flex items-center justify-between gap-4 py-1">
            <div>
                <p className="font-bold text-slate-700 text-sm">{label}</p>
                {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
            </div>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${checked ? 'bg-primary' : 'bg-slate-200'}`}
            >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );
}
