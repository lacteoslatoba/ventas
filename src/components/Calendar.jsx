import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS_SHORT = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

const toLocalDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function InlineRangePicker({ fromDate, toDate, onFromChange, onToChange }) {
    const [viewDate, setViewDate] = useState(() => new Date(fromDate + 'T12:00:00'));
    const [step, setStep] = useState('from');

    const todayStr = toLocalDate(new Date());
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekDay = new Date(year, month, 1).getDay();

    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

    const handleDay = (day) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (step === 'from') {
            onFromChange(dateStr);
            if (dateStr > toDate) onToChange(dateStr);
            setStep('to');
        } else {
            if (dateStr < fromDate) {
                onFromChange(dateStr);
                onToChange(fromDate);
            } else {
                onToChange(dateStr);
            }
            setStep('from');
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-4 shadow-sm">
            {/* Desde / Hasta */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setStep('from')}
                    className={`flex-1 text-center py-2 px-3 rounded-2xl text-xs font-black transition-all ${step === 'from' ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                >
                    <span className="text-[9px] block opacity-70 uppercase tracking-widest mb-0.5">Desde</span>
                    {new Date(fromDate + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                </button>
                <div className="flex items-center text-slate-300 dark:text-slate-600 font-black px-1">→</div>
                <button
                    onClick={() => setStep('to')}
                    className={`flex-1 text-center py-2 px-3 rounded-2xl text-xs font-black transition-all ${step === 'to' ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                >
                    <span className="text-[9px] block opacity-70 uppercase tracking-widest mb-0.5">Hasta</span>
                    {new Date(toDate + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                </button>
            </div>

            {/* Navegación mes */}
            <div className="flex items-center justify-between mb-3 px-1">
                <button onClick={prevMonth} className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500 active:scale-90 transition-all hover:bg-primary/10 hover:text-primary">
                    <ChevronLeft size={18} />
                </button>
                <div className="text-center">
                    <p className="text-sm font-black text-slate-800 dark:text-white capitalize tracking-tight">{MONTHS[month]}</p>
                    <p className="text-[10px] font-bold text-slate-400 leading-none">{year}</p>
                </div>
                <button onClick={nextMonth} className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500 active:scale-90 transition-all hover:bg-primary/10 hover:text-primary">
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Cabecera días */}
            <div className="grid grid-cols-7 mb-1">
                {DAYS_SHORT.map(d => (
                    <div key={d} className="text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase py-1">{d}</div>
                ))}
            </div>

            {/* Cuadrícula */}
            <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: firstWeekDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isFrom = dateStr === fromDate;
                    const isTo = dateStr === toDate;
                    const inRange = fromDate !== toDate && dateStr > fromDate && dateStr < toDate;
                    const isToday = dateStr === todayStr;
                    return (
                        <button
                            key={day}
                            onClick={() => handleDay(day)}
                            className={`relative flex items-center justify-center w-full aspect-square text-sm font-bold transition-all duration-150
                                ${(isFrom || isTo) ? 'bg-primary text-white rounded-xl shadow-md shadow-primary/30 scale-105 z-10' : ''}
                                ${inRange ? 'bg-primary/15 text-primary dark:text-primary rounded-none' : ''}
                                ${!isFrom && !isTo && !inRange ? 'rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300' : ''}
                                ${isToday && !isFrom && !isTo ? 'ring-2 ring-primary/30 dark:ring-primary/40' : ''}
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            <p className="text-center text-[10px] font-bold text-primary/70 mt-3 uppercase tracking-widest">
                {step === 'from' ? '↑ Toca un día para inicio' : '↑ Toca un día para fin'}
            </p>
        </div>
    );
}

export default function ModernDatePicker({ value, onChange, label }) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date(value + 'T12:00:00'));

    const todayStr = toLocalDate(new Date());
    const selectedDateStr = value;

    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const firstWeekDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

    const prevMonth = (e) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };
    const nextMonth = (e) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDayClick = (day) => {
        const newDate = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(newDate);
        setIsOpen(false);
    };

    const displayDate = new Date(value + 'T12:00:00').toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    return (
        <div className="relative w-full">
            {label && <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{label}</label>}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 hover:border-primary/50 transition-all active:scale-[0.98] shadow-sm shadow-slate-100/50 dark:shadow-none"
            >
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <CalendarIcon size={16} strokeWidth={2.5} />
                </div>
                <span className="font-black text-slate-700 dark:text-slate-200 text-sm truncate uppercase tracking-tight">
                    {displayDate}
                </span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[60] bg-black/5 backdrop-blur-[1px]"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 z-[70] w-full min-w-[280px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-5 shadow-2xl shadow-slate-300 dark:shadow-none animate-in zoom-in-95 duration-200 origin-top">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center active:scale-90 transition-all hover:bg-primary/10 hover:text-primary text-slate-500 dark:text-slate-400">
                                <ChevronLeft size={20} />
                            </button>
                            <div className="text-center">
                                <p className="text-sm font-black text-slate-900 dark:text-white capitalize tracking-tight">
                                    {MONTHS[viewDate.getMonth()]}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 leading-none">{viewDate.getFullYear()}</p>
                            </div>
                            <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center active:scale-90 transition-all hover:bg-primary/10 hover:text-primary text-slate-500 dark:text-slate-400">
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 mb-2">
                            {DAYS_SHORT.map(d => (
                                <div key={d} className="text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase py-2">
                                    {d}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: firstWeekDay }).map((_, i) => <div key={`e${i}`} />)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const isSelected = dateStr === selectedDateStr;
                                const isToday = dateStr === todayStr;

                                return (
                                    <button
                                        key={day}
                                        onClick={(e) => { e.stopPropagation(); handleDayClick(day); }}
                                        className={`relative flex items-center justify-center w-full aspect-square rounded-xl transition-all duration-200 text-sm font-bold ${
                                            isSelected
                                                ? 'bg-primary text-white shadow-lg shadow-primary/30 z-10 scale-105'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        } ${isToday && !isSelected ? 'ring-2 ring-primary/20 dark:ring-primary/40' : ''}`}
                                    >
                                        {day}
                                        {isToday && isSelected && (
                                            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-white" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
