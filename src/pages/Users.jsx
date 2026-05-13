import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, Edit2, Trash2, ArrowLeft, Save, User as UserIcon, Lock, List, MapPin } from 'lucide-react';

const EMPTY_FORM = { name: '', pin: '', priceList: 'A', lugar1: '', lugar2: '', lugar1activo: false, lugar2activo: false };

export default function Users() {
    const { users, addUser, deleteUser, updateUser, showToast, showConfirm } = useStore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [editId, setEditId] = useState(null);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        try {
            if (editId) updateUser(editId, formData);
            else addUser(formData);
            resetForm();
            showToast('Guardado correctamente');
        } catch (err) {
            showToast('Error al guardar: ' + err.message, 'error');
        }
    };

    const resetForm = () => {
        setFormData(EMPTY_FORM);
        setEditId(null);
        setIsFormOpen(false);
    };

    const handleDelete = (id) => {
        showConfirm({
            message: '¿Eliminar este usuario permanentemente?',
            confirmText: 'Eliminar',
            danger: true,
            onConfirm: () => { deleteUser(id); resetForm(); },
        });
    };

    const edit = (user) => {
        setFormData({
            name: user.name,
            pin: user.pin || '',
            priceList: user.priceList || 'A',
            lugar1: user.lugar1 || '',
            lugar2: user.lugar2 || '',
            lugar1activo: user.lugar1activo ?? false,
            lugar2activo: user.lugar2activo ?? false,
        });
        setEditId(user.id);
        setIsFormOpen(true);
    };

    if (isFormOpen) {
        return (
            <div className="min-h-screen bg-slate-50 animate-in fade-in slide-in-from-right-8 duration-300">
                {/* Header Móvil Estilo Premium */}
                <div className="bg-white border-b border-slate-200 px-4 h-16 flex items-center sticky top-0 z-40">
                    <button onClick={resetForm} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="flex-1 text-center mr-8 text-sm font-black text-slate-800 uppercase tracking-widest">
                        {editId ? 'Configurar Usuario' : 'Nuevo Usuario'}
                    </h2>
                </div>

                <div className="p-4 max-w-2xl mx-auto pb-24">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                                    <UserIcon size={12} /> Nombre del Usuario
                                </label>
                                <input 
                                    required 
                                    type="text" 
                                    value={formData.name} 
                                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 rounded-2xl p-4 text-slate-800 font-bold outline-none text-lg transition-all" 
                                    placeholder="Ej. Juan Pérez" 
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                                        <Lock size={12} /> PIN de Acceso (App)
                                    </label>
                                    <input 
                                        type="text" 
                                        maxLength="20" 
                                        value={formData.pin} 
                                        onChange={e => setFormData({ ...formData, pin: e.target.value })} 
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500/20 rounded-2xl p-4 text-slate-800 font-bold outline-none font-mono transition-all" 
                                        placeholder="1234" 
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                                        <List size={12} /> Lista de Precios
                                    </label>
                                    <select 
                                        value={formData.priceList} 
                                        onChange={e => setFormData({ ...formData, priceList: e.target.value })} 
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500/20 rounded-2xl p-4 text-slate-800 font-bold outline-none appearance-none cursor-pointer transition-all"
                                    >
                                        <option value="A">Lista A (Normal)</option>
                                        <option value="B">Lista B (Mayoreo)</option>
                                        <option value="C">Lista C (Especial)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Zonas de reparto */}
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-5">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                <MapPin size={12} /> Zonas de Reparto
                            </label>

                            {[1, 2].map((n) => {
                                const lugarKey = `lugar${n}`;
                                const activoKey = `lugar${n}activo`;
                                const isActive = formData[activoKey];
                                return (
                                    <div key={n} className={`flex items-end gap-3 p-4 rounded-2xl border-2 transition-all ${isActive ? 'border-emerald-400/50 bg-emerald-50/60' : 'border-transparent bg-slate-50'}`}>
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest mb-2 ml-1 transition-colors" style={{ color: isActive ? '#059669' : '#94a3b8' }}>
                                                Opción {n}
                                            </p>
                                            <input
                                                type="text"
                                                value={formData[lugarKey]}
                                                onChange={e => setFormData({ ...formData, [lugarKey]: e.target.value })}
                                                className="w-full bg-white border-2 border-transparent focus:border-primary/20 rounded-xl p-3 text-slate-800 font-bold outline-none transition-all text-sm"
                                                placeholder={n === 1 ? 'Ej. Centro' : 'Ej. Colonia Norte'}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, [activoKey]: !isActive })}
                                            className={`flex-shrink-0 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                                isActive
                                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                                    : 'bg-white border border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-500'
                                            }`}
                                        >
                                            {isActive ? '✓ Activo' : 'Activar'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="submit"
                                className="flex-1 bg-primary text-white py-5 rounded-[2.5rem] shadow-xl shadow-primary/20 font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all text-xs"
                            >
                                <Save size={20} /> Guardar Usuario
                            </button>
                            
                            {editId && (
                                <button 
                                    type="button" 
                                    onClick={() => handleDelete(editId)} 
                                    className="p-5 text-red-500 bg-white border border-red-100 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} /> Eliminar
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 animate-in fade-in duration-500 pb-32">
            <div className="flex justify-between items-center mb-8 px-2">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">Usuarios</h1>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 ml-1">{users.length} Registrados</p>
                </div>
                <button
                    onClick={() => { setEditId(null); setFormData(EMPTY_FORM); setIsFormOpen(true); }}
                    className="bg-primary text-white p-4 rounded-3xl shadow-xl shadow-primary/20 active:scale-90 transition-all shrink-0"
                >
                    <Plus size={24} />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.length === 0 ? (
                    <div className="col-span-full py-20 text-center opacity-50 font-bold uppercase tracking-widest text-[10px]">
                        Sin usuarios registrados
                    </div>
                ) : (
                    users.map((u) => (
                        <div 
                            key={u.id} 
                            onClick={() => edit(u)} 
                            className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-4 active:scale-[0.97] transition-all cursor-pointer group"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-primary font-black text-xl shadow-inner group-hover:bg-primary group-hover:text-white transition-colors uppercase">
                                {u.name.charAt(0)}
                            </div>
                            <div className="flex-1 truncate">
                                <h3 className="font-black text-slate-800 text-md leading-tight truncate uppercase tracking-tight">{u.name}</h3>
                                <div className="flex items-center gap-2 mt-1 font-black uppercase text-[9px] tracking-tighter flex-wrap">
                                    <span className={`px-2 py-0.5 rounded-md ${u.priceList === 'A' ? 'bg-blue-50 text-blue-600' : u.priceList === 'B' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'}`}>
                                        LISTA {u.priceList || 'A'}
                                    </span>
                                    {[{ l: u.lugar1, a: u.lugar1activo }, { l: u.lugar2, a: u.lugar2activo }]
                                        .filter(x => x.l && x.a)
                                        .map(x => (
                                            <span key={x.l} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center gap-1">
                                                <MapPin size={8} /> {x.l}
                                            </span>
                                        ))
                                    }
                                </div>
                            </div>
                            <div className="text-slate-200 group-hover:text-primary transition-colors">
                                <Edit2 size={16} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
