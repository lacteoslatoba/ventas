import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';

export default function Clients() {
    const { clients, users, currentUser, addClient, deleteClient, updateClient } = useStore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', address: '', userId: currentUser?.role !== 'admin' ? currentUser?.id : '' });
    const [editId, setEditId] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        try {
            const finalData = { ...formData };
            if (currentUser?.role !== 'admin') {
                finalData.userId = currentUser.id;
            }

            if (editId) updateClient(editId, finalData);
            else addClient(finalData);

            setFormData({ name: '', phone: '', address: '', userId: currentUser?.role !== 'admin' ? currentUser?.id : '' });
            setEditId(null);
            setIsFormOpen(false);
            alert("✅ Guardado correctamente en el sistema.");
        } catch (err) {
            alert("Error al guardar: " + err.message);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm("¿Seguro que deseas eliminar a este cliente?")) {
            deleteClient(id);
        }
    };

    const edit = (client) => {
        setFormData({ name: client.name, phone: client.phone || '', address: client.address || '', userId: client.userId || '' });
        setEditId(client.id);
        setIsFormOpen(true);
    };

    const visibleClients = currentUser?.role === 'admin' ? clients : clients.filter(c => c.userId === currentUser?.id);

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                    Clientes
                </h1>
                <button
                    onClick={() => { setEditId(null); setFormData({ name: '', phone: '', address: '', userId: currentUser?.role !== 'admin' ? currentUser?.id : '' }); setIsFormOpen(!isFormOpen); }}
                    className="bg-cheese-500 hover:bg-cheese-600 text-slate-900 font-semibold px-4 py-2 rounded-xl shadow flex items-center gap-2"
                >
                    <Plus size={20} /> <span className="hidden sm:inline">Nuevo Cliente</span>
                </button>
            </div>

            {isFormOpen && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
                    <h2 className="text-xl font-bold mb-4">{editId ? 'Editar Cliente' : 'Agregar Cliente'}</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Nombre Comercial</label>
                            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 outline-none" placeholder="Tienda La Esquina" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Teléfono</label>
                            <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 outline-none" placeholder="555-000-0000" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Lugar</label>
                            <select 
                                required
                                value={formData.address} 
                                onChange={e => setFormData({ ...formData, address: e.target.value })} 
                                className="w-full border border-slate-200 rounded-lg p-2 outline-none bg-white"
                            >
                                <option value="">Selecciona Lugar...</option>
                                <option value="BETO CONSTITUCION">BETO CONSTITUCION</option>
                                <option value="LA TOBA">LA TOBA</option>
                            </select>
                        </div>
                        {currentUser?.role === 'admin' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-500 mb-1">Repartidor Asignado</label>
                                <select value={formData.userId || ''} onChange={e => setFormData({ ...formData, userId: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 outline-none bg-white">
                                    <option value="">Sin Asignar / Todos</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="md:col-span-full flex justify-end gap-3 mt-2">
                            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg shadow font-medium">Guardar</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Vista para Desktop */}
            <div className="hidden md:block overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-slate-200">
                            <th className="py-4 px-2 font-black text-slate-400 uppercase tracking-widest text-[10px]">Nombre</th>
                            {currentUser?.role === 'admin' && <th className="py-4 px-2 font-black text-slate-400 uppercase tracking-widest text-[10px]">Repartidor</th>}
                            <th className="py-4 px-2 font-black text-slate-400 uppercase tracking-widest text-[10px]">Teléfono</th>
                            <th className="py-4 px-2 font-black text-slate-400 uppercase tracking-widest text-[10px]">Lugar</th>
                            <th className="py-4 px-2 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {visibleClients.length === 0 && <tr><td colSpan={currentUser?.role === 'admin' ? "5" : "4"} className="text-center py-16 text-slate-400 italic font-medium">Sin clientes registrados</td></tr>}
                        {visibleClients.map((c) => (
                            <tr key={c.id} className="hover:bg-primary/5 transition-colors group">
                                <td className="py-4 px-2 font-bold text-slate-800">{c.name}</td>
                                {currentUser?.role === 'admin' && (
                                    <td className="py-4 px-2">
                                        <span className="bg-primary/10 text-primary text-[10px] font-black uppercase px-2 py-1 rounded-lg">
                                            {users.find(u => u.id === c.userId)?.name || 'Todos'}
                                        </span>
                                    </td>
                                )}
                                <td className="py-4 px-2 text-slate-500 font-medium">{c.phone || '-'}</td>
                                <td className="py-4 px-2 text-slate-500 font-medium">{c.address || '-'}</td>
                                <td className="py-4 px-2 flex justify-end gap-2">
                                    <button onClick={() => edit(c)} className="p-2 text-blue-500 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-blue-100 transition-all" title="Editar"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(c.id)} className="p-2 text-red-500 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-red-100 transition-all" title="Eliminar"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Vista para Móvil (Tarjetas Transparentes) */}
            <div className="md:hidden space-y-4">
                {visibleClients.length === 0 && <p className="text-center py-16 text-slate-400 italic font-medium">Sin clientes registrados</p>}
                {visibleClients.map((c) => (
                    <div key={c.id} className="py-5 border-b border-slate-100 relative group">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 pr-4">
                                <h3 className="font-black text-slate-800 text-lg leading-tight mb-1">{c.name}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {c.phone && <span className="text-slate-500 text-[10px] font-bold flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-lg border border-slate-100">{c.phone}</span>}
                                    {currentUser?.role === 'admin' && (
                                        <span className="bg-primary/5 text-primary text-[10px] uppercase font-black px-2 py-0.5 rounded-lg border border-primary/10">
                                            {users.find(u => u.id === c.userId)?.name || 'Todos'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => edit(c)}
                                    className="w-10 h-10 bg-white text-blue-600 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 active:scale-90 transition-all"
                                    title="Editar"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(c.id)}
                                    className="w-10 h-10 bg-white text-red-600 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 active:scale-90 transition-all"
                                    title="Eliminar"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        {c.address && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                                <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Lugar:</span>
                                <span className="font-medium">{c.address}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
