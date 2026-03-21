import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, Trash2, User, CheckCircle, AlertTriangle, ChevronRight, ArrowLeft } from 'lucide-react';

export default function Clients() {
    const { clients, currentUser, addClient, deleteClient, updateClient } = useStore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', address: '', userId: currentUser?.role !== 'admin' ? currentUser?.id : '' });
    const [editId, setEditId] = useState(null);
    const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

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
            showToast('Guardado correctamente en el sistema.');
        } catch (err) {
            showToast(err.message || 'Error al guardar.', 'error');
        }
    };

    const handleDelete = (id) => {
        setConfirmDeleteId(id);
    };

    const confirmDeleteAction = () => {
        if (confirmDeleteId) {
            deleteClient(confirmDeleteId);
            setConfirmDeleteId(null);
            setIsFormOpen(false);
            showToast('Cliente eliminado.', 'success');
        }
    };

    const openEditForm = (client) => {
        setFormData({ name: client.name, phone: client.phone || '', address: client.address || '', userId: client.userId || '' });
        setEditId(client.id);
        setIsFormOpen(true);
    };

    const openNewForm = () => {
        setEditId(null);
        setFormData({ name: '', phone: '', address: '', userId: currentUser?.role !== 'admin' ? currentUser?.id : '' });
        setIsFormOpen(true);
    };

    const visibleClients = currentUser?.role === 'admin' ? clients : clients.filter(c => c.userId === currentUser?.id);

    return (
        <>
            {isFormOpen ? (
                <div className="p-4 md:p-8 max-w-2xl mx-auto animate-in slide-in-from-right-8 duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={() => setIsFormOpen(false)}
                            className="bg-white hover:bg-slate-50 text-slate-600 p-3 rounded-xl shadow-sm border border-slate-200 transition-colors active:scale-95 flex items-center gap-2 font-bold text-sm"
                        >
                            <ArrowLeft size={20} /> <span className="hidden md:inline">Volver a Lista</span>
                        </button>
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight text-center flex-1">
                            {editId ? 'Editar Cliente' : 'Nuevo Cliente'}
                        </h2>
                        <div className="w-[48px] md:w-[140px] opacity-0 flex-shrink-0"></div> {/* Spacer for centering */}
                    </div>

                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Nombre Comercial</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:ring-0 rounded-xl py-3 px-4 outline-none transition-colors font-bold text-slate-800 text-lg"
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
                                            className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:ring-0 rounded-xl py-3 px-4 outline-none transition-colors font-medium text-slate-700 text-base"
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
                                                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:ring-0 rounded-xl py-3 px-4 outline-none transition-colors font-medium text-slate-700 text-base appearance-none"
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
                                                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:ring-0 rounded-xl py-3 px-4 outline-none transition-colors font-medium text-slate-700 text-base"
                                                placeholder="Lugar del cliente..."
                                            />
                                        )}
                                    </div>
                                </>
                            )}
                            
                            <div className="pt-6 flex flex-col gap-3">
                                <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-base flex justify-center items-center gap-2">
                                    <CheckCircle size={20} /> {editId ? 'Guardar Cambios' : 'Registrar Cliente'}
                                </button>
                                
                                {editId && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(editId)}
                                        className="w-full py-4 bg-white border-2 border-slate-100 hover:bg-red-50 text-red-500 font-bold rounded-xl active:scale-95 transition-all flex justify-center items-center gap-2 mt-2"
                                    >
                                        <Trash2 size={20} /> Eliminar Cliente
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="p-4 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                            Clientes
                        </h1>
                        <button
                            onClick={openNewForm}
                            className="bg-cheese-500 hover:bg-cheese-600 text-slate-900 font-semibold px-4 py-3 sm:py-2 rounded-xl shadow flex items-center gap-2 active:scale-95 transition-all"
                        >
                            <Plus size={20} /> <span className="hidden sm:inline">Nuevo Cliente</span>
                        </button>
                    </div>

                    {/* LISTA DE CLIENTES */}
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 overflow-hidden">
                        {visibleClients.length === 0 && (
                            <div className="py-12 text-center text-slate-400 italic font-medium bg-slate-50">
                                Aún no tienes clientes registrados.
                            </div>
                        )}
                        {visibleClients.length > 0 && (
                            <div className="flex flex-col">
                                {visibleClients.map((c, index) => (
                                    <div
                                        key={c.id}
                                        onClick={() => openEditForm(c)}
                                        className={`w-full px-4 py-3 text-left flex items-center gap-3 cursor-pointer ${index !== visibleClients.length - 1 ? 'border-b border-slate-100/50' : ''}`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                            <User size={18} />
                                        </div>
                                        <h3 className="font-medium text-slate-700 text-sm leading-tight flex-1 truncate">{c.name}</h3>
                                        <div className="text-slate-300">
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL CONFIRMAR ELIMINAR */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-xs shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar Cliente?</h3>
                        <p className="text-slate-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl active:scale-95 transition-all text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDeleteAction}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 active:scale-95 transition-all text-sm"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TOAST FLOTANTE */}
            {toast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-6 duration-300">
                    <div className={`flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl font-medium text-sm border backdrop-blur-md ${
                        toast.type === 'error' 
                            ? 'bg-red-50/90 text-red-700 border-red-100' 
                            : 'bg-slate-900/90 text-white border-slate-800'
                    }`}>
                        {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} className="text-emerald-400" />}
                        {toast.message}
                    </div>
                </div>
            )}
        </>
    );
}
