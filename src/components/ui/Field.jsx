import React from 'react';

export default function Field({ label, icon: Icon, id, value, onChange, placeholder, maxLength, hint }) {
    return (
        <div>
            <label htmlFor={id} className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                {Icon && <Icon size={12} />}
                {label}
                {maxLength && <span className="ml-auto font-normal normal-case tracking-normal text-slate-400">{(value || '').length}/{maxLength}</span>}
            </label>
            <input
                id={id}
                type="text"
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/15 px-4 py-3 rounded-xl font-medium text-slate-800 outline-none transition-all placeholder:text-slate-300 text-sm"
            />
            {hint && <p className="text-xs text-slate-400 mt-1 ml-1">{hint}</p>}
        </div>
    );
}
