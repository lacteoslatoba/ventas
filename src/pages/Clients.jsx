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
                    <button onClick={() => window.history.back()} className="md:hidden p-2 -ml-2 text-primary hover:bg-slate-100 rounded-xl transition-colors">
                        <ArrowLeft size={24} />
                    </button>
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
                            <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 outline-none" placeholder="Calle 1 #123" />
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
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="py-3 px-4 font-medium text-slate-500">Nombre</th>
                            {currentUser?.role === 'admin' && <th className="py-3 px-4 font-medium text-slate-500">Repartidor</th>}
                            <th className="py-3 px-4 font-medium text-slate-500">Teléfono</th>
                            <th className="py-3 px-4 font-medium text-slate-500">Lugar</th>
                            <th className="py-3 px-4 font-medium text-slate-500 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleClients.length === 0 && <tr><td colSpan={currentUser?.role === 'admin' ? "5" : "4"} className="text-center py-8 text-slate-400">Sin clientes registrados</td></tr>}
                        {visibleClients.map((c) => (
                            <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="py-3 px-4 font-semibold text-slate-800">{c.name}</td>
                                {currentUser?.role === 'admin' && (
                                    <td className="py-3 px-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm">{users.find(u => u.id === c.userId)?.name || 'Todos'}</span></td>
                                )}
                                <td className="py-3 px-4 text-slate-600">{c.phone || '-'}</td>
                                <td className="py-3 px-4 text-slate-600">{c.address || '-'}</td>
                                <td className="py-3 px-4 flex justify-end gap-2">
                                    <button onClick={() => edit(c)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Editar"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Vista para Móvil (Tarjetas) */}
            <div className="md:hidden space-y-4">
                {visibleClients.length === 0 && <p className="text-center py-8 text-slate-400 bg-white rounded-2xl border border-slate-100 italic">Sin clientes registrados</p>}
                {visibleClients.map((c) => (
                    <div key={c.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 pr-4">
                                <h3 className="font-black text-slate-800 text-lg leading-tight mb-1">{c.name}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {c.phone && <span className="text-slate-500 text-xs font-semibold flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{c.phone}</span>}
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
                                    className="p-3 bg-blue-50 text-blue-600 rounded-2xl active:scale-90 transition-transform shadow-sm shadow-blue-200/50"
                                    title="Editar"
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button
                                    onClick={() => handleDelete(c.id)}
                                    className="p-3 bg-red-50 text-red-600 rounded-2xl active:scale-90 transition-transform shadow-sm shadow-red-200/50"
                                    title="Eliminar"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                        {c.address && (
                            <div className="pt-3 border-t border-slate-50 flex items-center gap-2 text-sm text-slate-600 italic">
                                <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest not-italic">Lugar:</span> {c.address}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
