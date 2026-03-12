import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';

export default function Users() {
    const { users, addUser, deleteUser, updateUser } = useStore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', vehicle: '', pin: '', priceList: 'A' });
    const [editId, setEditId] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        try {
            if (editId) updateUser(editId, formData);
            else addUser(formData);
            setFormData({ name: '', phone: '', vehicle: '', pin: '', priceList: 'A' });
            setEditId(null);
            setIsFormOpen(false);
            alert("✅ Guardado correctamente en el sistema.");
        } catch (err) {
            alert("Error al guardar: " + err.message);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm("¿Seguro que deseas eliminar a este repartidor?")) {
            deleteUser(id);
        }
    };

    const edit = (user) => {
        setFormData({ 
            name: user.name, 
            phone: user.phone || '', 
            vehicle: user.vehicle || '', 
            pin: user.pin || '',
            priceList: user.priceList || 'A'
        });
        setEditId(user.id);
        setIsFormOpen(true);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                    <button onClick={() => window.history.back()} className="md:hidden p-2 -ml-2 text-primary hover:bg-slate-100 rounded-xl transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    Repartidores
                </h1>
                <button
                    onClick={() => { setEditId(null); setFormData({ name: '', phone: '', vehicle: '', pin: '', priceList: 'A' }); setIsFormOpen(!isFormOpen); }}
                    className="bg-cheese-500 hover:bg-cheese-600 text-slate-900 font-semibold px-4 py-2 rounded-xl shadow flex items-center gap-2"
                >
                    <Plus size={20} /> <span className="hidden sm:inline">Nuevo Repartidor</span>
                </button>
            </div>

            {isFormOpen && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
                    <h2 className="text-xl font-bold mb-4">{editId ? 'Editar Repartidor' : 'Agregar Repartidor'}</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Nombre Completo</label>
                            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 outline-none" placeholder="Juan Pérez" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Teléfono</label>
                            <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 outline-none" placeholder="555-000-0000" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Vehículo / Placa</label>
                            <input type="text" value={formData.vehicle} onChange={e => setFormData({ ...formData, vehicle: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 outline-none" placeholder="Moto 123" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Contraseña de Acceso</label>
                            <input type="text" maxLength="20" value={formData.pin} onChange={e => setFormData({ ...formData, pin: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 outline-none font-mono" placeholder="Ej. clave123" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Lista de Precios</label>
                            <select value={formData.priceList} onChange={e => setFormData({ ...formData, priceList: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 outline-none">
                                <option value="A">Lista A (Normal)</option>
                                <option value="B">Lista B (Mayoreo)</option>
                                <option value="C">Lista C (Especial)</option>
                            </select>
                        </div>
                        <div className="md:col-span-4 flex justify-end gap-3 mt-2">
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
                            <th className="py-3 px-4 font-medium text-slate-500">Nombre (Usuario)</th>
                            <th className="py-3 px-4 font-medium text-slate-500">Contraseña</th>
                            <th className="py-3 px-4 font-medium text-slate-500">Teléfono</th>
                            <th className="py-3 px-4 font-medium text-slate-500">Vehículo</th>
                            <th className="py-3 px-4 font-medium text-slate-500">Lista</th>
                            <th className="py-3 px-4 font-medium text-slate-500 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-400">Sin repartidores registrados</td></tr>}
                        {users.map((u) => (
                            <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="py-3 px-4 font-semibold text-slate-800">{u.name}</td>
                                <td className="py-3 px-4"><span className="bg-slate-100 text-slate-600 font-mono px-2 py-1 rounded text-sm">{u.pin || 'Sin Clave'}</span></td>
                                <td className="py-3 px-4 text-slate-600">{u.phone || '-'}</td>
                                <td className="py-3 px-4 text-slate-600">{u.vehicle || '-'}</td>
                                <td className="py-3 px-4 text-slate-600">
                                    <span className={`px-2 py-1 rounded text-xs font-black ${u.priceList === 'A' ? 'bg-blue-50 text-blue-600' : u.priceList === 'B' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'}`}>
                                        LISTA {u.priceList || 'A'}
                                    </span>
                                </td>
                                <td className="py-3 px-4 flex justify-end gap-2">
                                    <button onClick={() => edit(u)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Editar"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Vista para Móvil (Tarjetas) */}
            <div className="md:hidden space-y-4">
                {users.length === 0 && <p className="text-center py-8 text-slate-400 bg-white rounded-2xl border border-slate-100 italic">Sin repartidores registrados</p>}
                {users.map((u) => (
                    <div key={u.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1 pr-4">
                                <h3 className="font-black text-slate-800 text-lg leading-tight mb-1">{u.name}</h3>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded-lg text-xs font-bold ring-1 ring-slate-200">Clave: {u.pin || '---'}</span>
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black tracking-widest ${u.priceList === 'A' ? 'bg-blue-50 text-blue-600' : u.priceList === 'B' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'}`}>LISTA {u.priceList || 'A'}</span>
                                    {u.phone && <span className="text-slate-500 text-xs font-semibold flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{u.phone}</span>}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => edit(u)}
                                    className="p-3 bg-blue-50 text-blue-600 rounded-2xl active:scale-90 transition-transform shadow-sm shadow-blue-200/50"
                                    title="Editar"
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button
                                    onClick={() => handleDelete(u.id)}
                                    className="p-3 bg-red-50 text-red-600 rounded-2xl active:scale-90 transition-transform shadow-sm shadow-red-200/50"
                                    title="Eliminar"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                        {u.vehicle && (
                            <div className="pt-3 border-t border-slate-50 flex items-center gap-2 text-sm">
                                <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Vehículo</span>
                                <span className="text-slate-600 font-bold">{u.vehicle}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
