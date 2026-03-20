import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, Edit2, Trash2, User, X } from 'lucide-react';

export default function Clients() {
    const { clients, currentUser, addClient, deleteClient, updateClient } = useStore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', address: '', userId: currentUser?.role !== 'admin' ? currentUser?.id : '' });
    const [editId, setEditId] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);

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

            {/* CUADRÍCULA DE CLIENTES (SOLO NOMBRES) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleClients.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 italic font-medium bg-slate-50 rounded-2xl border border-slate-100">
                        Aún no tienes clientes registrados.
                    </div>
                )}
                {visibleClients.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedClient(c)}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-left transition-all hover:border-primary/40 hover:shadow-md active:scale-95 flex items-center gap-4 group"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                            <User size={24} />
                        </div>
                        <h3 className="font-bold text-slate-800 text-[15px] leading-tight line-clamp-2">{c.name}</h3>
                    </button>
                ))}
            </div>

            {/* MODAL: DETALLES DEL CLIENTE */}
            {selectedClient && !isFormOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-xl text-slate-800 tracking-tight">Detalle Cliente</h3>
                            <button
                                onClick={() => setSelectedClient(null)}
                                className="p-2 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95 shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre Comercial</p>
                                <p className="text-xl font-bold text-slate-800">{selectedClient.name}</p>
                            </div>

                            {currentUser?.role !== 'admin' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Teléfono</p>
                                        <p className="text-base font-medium text-slate-600">{selectedClient.phone || 'No registrado'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lugar</p>
                                        <p className="text-base font-medium text-slate-600">{selectedClient.address || 'No registrado'}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => handleDelete(selectedClient.id)}
                                className="flex-1 py-3 px-4 flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-500 font-bold rounded-xl border border-red-100 active:scale-95 transition-all text-sm"
                            >
                                <Trash2 size={18} /> Eliminar
                            </button>
                            <button
                                onClick={() => edit(selectedClient)}
                                className="flex-1 py-3 px-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm"
                            >
                                <Edit2 size={18} /> Editar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: FORMULARIO ALTA / EDICIÓN */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-xl text-slate-800 tracking-tight">{editId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                            <button
                                onClick={() => { setIsFormOpen(false); if (!editId) setFormData({ name: '', phone: '', address: '', userId: currentUser?.role !== 'admin' ? currentUser?.id : '' }); }}
                                className="p-2 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95 shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Nombre Comercial</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:ring-0 rounded-xl py-3 px-4 outline-none transition-colors font-bold text-slate-800"
                                    placeholder="Ej: Tienda La Esquina"
                                    autoFocus
                                />
                            </div>

                            {currentUser?.role !== 'admin' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Teléfono (Opcional)</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:ring-0 rounded-xl py-3 px-4 outline-none transition-colors font-medium text-slate-700"
                                            placeholder="555-000-0000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Lugar</label>
                                        {currentUser?.name?.toLowerCase() === 'beto' ? (
                                            <select
                                                required
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:ring-0 rounded-xl py-3 px-4 outline-none transition-colors font-medium text-slate-700 appearance-none"
                                            >
                                                <option value="">Selecciona Lugar...</option>
                                                <option value="Constitucion">Constitucion</option>
                                                <option value="La toba">La toba</option>
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                required
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:ring-0 rounded-xl py-3 px-4 outline-none transition-colors font-medium text-slate-700"
                                                placeholder="Lugar del cliente..."
                                            />
                                        )}
                                    </div>
                                </>
                            )}
                            
                            <div className="pt-2">
                                <button type="submit" className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                                    {editId ? 'Actualizar Cliente' : 'Guardar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
