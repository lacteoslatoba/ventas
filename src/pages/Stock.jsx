import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { Calendar as CalendarIcon, Droplet, Package, Snowflake, Save, CheckCircle2 } from 'lucide-react';

const toLocalDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const todayStr = toLocalDate(new Date());

export default function Stock() {
    const { deliveries, addDelivery, currentUser, showToast } = useStore();
    const [selectedDate, setSelectedDate] = useState(todayStr);

    const isAdmin = currentUser?.role === 'admin';
    const isBeto = currentUser?.name?.toLowerCase().includes('beto');
    const currentUserId = currentUser?.id;

    const [form, setForm] = useState({
        clientId: '',
        clientName: '',
        litrosPurificados: '',
        ventaGalones: '',
        bolsasHielo: ''
    });

    const existingDelivery = useMemo(() => {
        const myDeliveries = deliveries.filter(d =>
            d.date === selectedDate &&
            (isAdmin ? true : d.userId === currentUserId) &&
            (form.clientId ? d.clientId === form.clientId : !d.clientId)
        );
        return myDeliveries[0] || null;
    }, [deliveries, selectedDate, isAdmin, currentUserId, form.clientId]);

    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (existingDelivery) {
            setForm(prev => ({
                ...prev,
                litrosPurificados: existingDelivery.litrosPurificados || '',
                ventaGalones: existingDelivery.ventaGalones || '',
                bolsasHielo: existingDelivery.bolsasHielo || ''
            }));
        } else {
            setForm(prev => ({
                ...prev,
                litrosPurificados: '',
                ventaGalones: '',
                bolsasHielo: ''
            }));
        }
        setSaved(false);
    }, [existingDelivery, selectedDate]);

    const handleSave = () => {
        addDelivery({
            date: selectedDate,
            userId: currentUserId,
            userName: currentUser?.name || 'Admin',
            clientId: form.clientId || '',
            clientName: form.clientName || '',
            litrosPurificados: Number(form.litrosPurificados) || 0,
            ventaGalones: Number(form.ventaGalones) || 0,
            bolsasHielo: Number(form.bolsasHielo) || 0,
            timestamp: new Date().toISOString()
        });
        showToast('¡Registro guardado!', 'success');
        setForm({ clientId: '', clientName: '', litrosPurificados: '', ventaGalones: '', bolsasHielo: '' });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const clients = useStore(s => s.clients);

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto animate-in fade-in duration-300">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-4 mb-5">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">Registro de Entregas</h1>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">Control por cliente</p>
                </div>
            </div>

            {/* ── Selector de fecha ── */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2.5 px-4 mb-5 focus-within:ring-2 focus-within:ring-primary/20 self-start">
                <CalendarIcon size={18} className="text-primary" />
                <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="bg-transparent border-none outline-none font-bold text-slate-700 dark:text-slate-200 py-0.5 text-sm cursor-pointer"
                />
            </div>

            {/* ── FORMULARIO DE REGISTRO ── */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
                    <CalendarIcon size={16} className="text-primary" /> 
                    Captura del {selectedDate.split('-').reverse().join('/')}
                </h3>
                
                <div className="space-y-4">
                    {/* Selector de Cliente */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Cliente</label>
                        <select 
                            value={form.clientId}
                            onChange={e => {
                                const clientId = e.target.value;
                                const clientName = clients.find(c => c.id === clientId)?.name || '';
                                setForm(f => ({...f, clientId, clientName}));
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-black text-base rounded-2xl py-3 px-4 focus:outline-none focus:border-primary transition-colors"
                        >
                            <option value="">-- Seleccionar Cliente (General) --</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Campo: Litros Purificados */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Litros Purificados</label>
                        <div className="relative flex items-center">
                            <div className="absolute left-4 w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Droplet size={18} strokeWidth={2.5} />
                            </div>
                            <input 
                                type="number" 
                                value={form.litrosPurificados}
                                onChange={e => setForm({...form, litrosPurificados: e.target.value})}
                                placeholder="0"
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-black text-lg rounded-2xl py-3 pl-14 pr-4 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Campo: Venta de galones */}
                    {!isBeto && (
                        <div>
                            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Venta de Galones</label>
                            <div className="relative flex items-center">
                                <div className="absolute left-4 w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <Package size={18} strokeWidth={2.5} />
                                </div>
                                <input 
                                    type="number" 
                                    value={form.ventaGalones}
                                    onChange={e => setForm({...form, ventaGalones: e.target.value})}
                                    placeholder="0"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-black text-lg rounded-2xl py-3 pl-14 pr-4 focus:outline-none focus:border-amber-500 dark:focus:border-amber-500 transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    {/* Campo: Bolsas de hielo */}
                    {!isBeto && (
                        <div>
                            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Bolsas de Hielo</label>
                            <div className="relative flex items-center">
                                <div className="absolute left-4 w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                                    <Snowflake size={18} strokeWidth={2.5} />
                                </div>
                                <input 
                                    type="number" 
                                    value={form.bolsasHielo}
                                    onChange={e => setForm({...form, bolsasHielo: e.target.value})}
                                    placeholder="0"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-black text-lg rounded-2xl py-3 pl-14 pr-4 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <button 
                        onClick={handleSave}
                        className={`w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 flex items-center justify-center gap-2
                            ${saved 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                                : 'bg-primary text-white shadow-lg shadow-primary/30'
                            }`}
                    >
                        {saved ? (
                            <>
                                <CheckCircle2 size={22} strokeWidth={2.5} />
                                ¡Guardado!
                            </>
                        ) : (
                            <>
                                <Save size={20} strokeWidth={2.5} />
                                Guardar Registro
                            </>
                        )}
                    </button>
                </div>
            </div>

            {existingDelivery && (
                <p className="text-center text-xs font-bold text-slate-400 mt-4">
                    Última actualización: {new Date(existingDelivery.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
            )}

        </div>
    );
}
