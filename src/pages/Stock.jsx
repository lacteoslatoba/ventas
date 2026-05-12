import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Calendar as CalendarIcon, Droplet, Package, Snowflake, Plus, Trash2, Save } from 'lucide-react';

const toLocalDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const todayStr = toLocalDate(new Date());

export default function Stock() {
    const { deliveries, addDelivery, currentUser, showToast } = useStore();
    const clients = useStore(s => s.clients);

    const isAdmin = currentUser?.role === 'admin';
    const isBeto  = currentUser?.name?.toLowerCase().includes('beto');
    const currentUserId = currentUser?.id;

    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [form, setForm] = useState({ clientId: '', clientName: '', litrosPurificados: '', ventaGalones: '', bolsasHielo: '' });
    const [cart, setCart] = useState([]);

    const handleAdd = () => {
        if (!form.litrosPurificados && !form.ventaGalones && !form.bolsasHielo) return;
        setCart(prev => [...prev, {
            clientId:   form.clientId,
            clientName: form.clientName || 'General',
            litrosPurificados: Number(form.litrosPurificados) || 0,
            ventaGalones:      Number(form.ventaGalones)      || 0,
            bolsasHielo:       Number(form.bolsasHielo)       || 0,
        }]);
        setForm({ clientId: '', clientName: '', litrosPurificados: '', ventaGalones: '', bolsasHielo: '' });
    };

    const handleRemove = (idx) => setCart(prev => prev.filter((_, i) => i !== idx));

    const handleSaveAll = () => {
        if (cart.length === 0) return;
        cart.forEach(item => {
            addDelivery({
                date: selectedDate,
                userId: currentUserId,
                userName: currentUser?.name || '',
                clientId:   item.clientId,
                clientName: item.clientName,
                litrosPurificados: item.litrosPurificados,
                ventaGalones:      item.ventaGalones,
                bolsasHielo:       item.bolsasHielo,
                timestamp: new Date().toISOString(),
            });
        });
        showToast(`${cart.length} registro${cart.length > 1 ? 's' : ''} guardado${cart.length > 1 ? 's' : ''} ✓`, 'success');
        setCart([]);
    };

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto animate-in fade-in duration-300">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-4 mb-5">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">Registro de Entregas</h1>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">Selecciona fecha y agrega por cliente</p>
                </div>
            </div>

            {/* Selector de fecha */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2.5 px-4 mb-5 focus-within:ring-2 focus-within:ring-primary/20 self-start">
                <CalendarIcon size={18} className="text-primary" />
                <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="bg-transparent border-none outline-none font-bold text-slate-700 dark:text-slate-200 py-0.5 text-sm cursor-pointer"
                />
            </div>

            {/* Formulario de captura */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 mb-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-4">Agregar entrega</h3>

                <div className="space-y-3">
                    {/* Cliente */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Cliente</label>
                        <select
                            value={form.clientId}
                            onChange={e => {
                                const clientId = e.target.value;
                                const clientName = clients.find(c => c.id === clientId)?.name || '';
                                setForm(f => ({ ...f, clientId, clientName }));
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-black text-base rounded-2xl py-3 px-4 focus:outline-none focus:border-primary transition-colors"
                        >
                            <option value="">-- General --</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Litros */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Litros Purificados</label>
                        <div className="relative flex items-center">
                            <div className="absolute left-4 w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Droplet size={18} strokeWidth={2.5} />
                            </div>
                            <input
                                type="number"
                                value={form.litrosPurificados}
                                onChange={e => setForm(f => ({ ...f, litrosPurificados: e.target.value }))}
                                placeholder="0"
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-black text-lg rounded-2xl py-3 pl-14 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Galones */}
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
                                    onChange={e => setForm(f => ({ ...f, ventaGalones: e.target.value }))}
                                    placeholder="0"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-black text-lg rounded-2xl py-3 pl-14 pr-4 focus:outline-none focus:border-amber-500 transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    {/* Bolsas */}
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
                                    onChange={e => setForm(f => ({ ...f, bolsasHielo: e.target.value }))}
                                    placeholder="0"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-black text-lg rounded-2xl py-3 pl-14 pr-4 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleAdd}
                    disabled={!form.litrosPurificados && !form.ventaGalones && !form.bolsasHielo}
                    className="mt-5 w-full py-3.5 rounded-2xl font-black text-base flex items-center justify-center gap-2 bg-primary text-white shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Plus size={20} strokeWidth={2.5} />
                    Agregar al registro
                </button>
            </div>

            {/* Lista del carrito */}
            {cart.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-4">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                        <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                            Por guardar — {selectedDate.split('-').reverse().join('/')}
                        </p>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/30">
                        {cart.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between px-5 py-4">
                                <div>
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">{item.clientName}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
                                        {item.litrosPurificados > 0 && `${item.litrosPurificados} L`}
                                        {!isBeto && item.ventaGalones > 0 && ` · ${item.ventaGalones} gal`}
                                        {!isBeto && item.bolsasHielo > 0 && ` · ${item.bolsasHielo} bolsas`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleRemove(idx)}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90 transition-all"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-700/50">
                        <button
                            onClick={handleSaveAll}
                            className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
                        >
                            <Save size={20} strokeWidth={2.5} />
                            Guardar {cart.length} registro{cart.length > 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
