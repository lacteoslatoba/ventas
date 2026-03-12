import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, Trash2, Edit2, ArrowLeft, Save, ChevronRight } from 'lucide-react';

export default function Products() {
    const { products, addProduct, deleteProduct, updateProduct, resetAllStock } = useStore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', priceA: '', priceB: '', priceC: '', unit: 'Pieza', code: '', stock: '' });
    const [editId, setEditId] = useState(null);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        const productData = {
            ...formData,
            priceA: Number(formData.priceA) || 0,
            priceB: Number(formData.priceB) || 0,
            priceC: Number(formData.priceC) || 0,
            stock: Number(formData.stock) || 0
        };
        if (editId) {
            updateProduct(editId, productData);
        } else {
            addProduct(productData);
        }
        resetForm();
    };

    const resetForm = () => {
        setFormData({ name: '', priceA: '', priceB: '', priceC: '', unit: 'Pieza', code: '', stock: '' });
        setEditId(null);
        setIsFormOpen(false);
    };

    const edit = (product) => {
        setFormData({ 
            name: product.name, 
            priceA: product.priceA || product.price || '', 
            priceB: product.priceB || '', 
            priceC: product.priceC || '', 
            unit: product.unit || 'Pieza', 
            code: product.code || '',
            stock: product.stock || 0
        });
        setEditId(product.id);
        setIsFormOpen(true);
    };

    if (isFormOpen) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 animate-in fade-in slide-in-from-right-8 duration-300">
                <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 h-16 flex items-center sticky top-0 z-40">
                    <button onClick={resetForm} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors shrink-0">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="flex-1 text-center mr-8 text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">
                        {editId ? 'Configurar Producto' : 'Nuevo Producto'}
                    </h2>
                </div>

                <div className="p-4 max-w-2xl mx-auto pb-24">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Información Básica</label>
                            
                            <div className="space-y-5">
                                <div>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-primary/20 rounded-2xl p-4 text-slate-800 dark:text-white font-bold outline-none text-lg transition-all" placeholder="Nombre completo" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-primary/20 rounded-2xl p-4 text-slate-800 dark:text-white font-bold outline-none" placeholder="Código" />
                                    <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:border-primary/20 rounded-2xl p-4 text-slate-800 dark:text-white font-bold outline-none appearance-none">
                                        <option>Pieza</option>
                                        <option>Kg</option>
                                        <option>Gramo</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Existencia en Bodega</label>
                                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-2 pr-4 border-2 border-transparent focus-within:border-primary/20 transition-all">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-black"><ChevronRight size={18} /></div>
                                        <input required type="number" step="0.01" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} className="flex-1 bg-transparent border-none p-2 text-primary font-black text-xl outline-none" placeholder="0.00" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Listas de Precios</label>
                            
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500 flex flex-col items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
                                        <span className="text-[8px] font-black opacity-60 uppercase tracking-tighter">Lista</span>
                                        <span className="text-lg font-black leading-none">A</span>
                                    </div>
                                    <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-3 flex items-center border-2 border-transparent focus-within:border-emerald-500/30 transition-all">
                                        <span className="text-emerald-600 font-black mr-2 text-lg">$</span>
                                        <input required type="number" step="0.01" value={formData.priceA} onChange={e => setFormData({ ...formData, priceA: e.target.value })} className="flex-1 bg-transparent border-none p-0 text-emerald-700 dark:text-emerald-400 font-black text-xl outline-none" placeholder="0.00" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500 flex flex-col items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                                        <span className="text-[8px] font-black opacity-60 uppercase tracking-tighter">Lista</span>
                                        <span className="text-lg font-black leading-none">B</span>
                                    </div>
                                    <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-3 flex items-center border-2 border-transparent focus-within:border-blue-500/30 transition-all">
                                        <span className="text-blue-600 font-black mr-2 text-lg">$</span>
                                        <input required type="number" step="0.01" value={formData.priceB} onChange={e => setFormData({ ...formData, priceB: e.target.value })} className="flex-1 bg-transparent border-none p-0 text-blue-700 dark:text-blue-400 font-black text-xl outline-none" placeholder="0.00" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500 flex flex-col items-center justify-center text-white shadow-lg shadow-purple-500/20 shrink-0">
                                        <span className="text-[8px] font-black opacity-60 uppercase tracking-tighter">Lista</span>
                                        <span className="text-lg font-black leading-none">C</span>
                                    </div>
                                    <div className="flex-1 bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-3 flex items-center border-2 border-transparent focus-within:border-purple-500/30 transition-all">
                                        <span className="text-purple-600 font-black mr-2 text-lg">$</span>
                                        <input required type="number" step="0.01" value={formData.priceC} onChange={e => setFormData({ ...formData, priceC: e.target.value })} className="flex-1 bg-transparent border-none p-0 text-purple-700 dark:text-purple-400 font-black text-xl outline-none" placeholder="0.00" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button 
                                type="submit" 
                                className="flex-1 bg-primary text-white py-5 rounded-[2rem] shadow-xl shadow-primary/20 font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all text-xs"
                            >
                                <Save size={20} /> Guardar Producto
                            </button>
                            
                            {editId && (
                                <button 
                                    type="button" 
                                    onClick={() => { if(window.confirm('¿Eliminar producto permanentemente?')) { deleteProduct(editId); resetForm(); } }} 
                                    className="p-5 text-red-500 bg-white border border-red-100 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
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
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none uppercase">Productos</h1>
                    <p className="text-slate-400 text-[10px] font-black mt-2 uppercase tracking-widest">{products.length} Registrados</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { if(window.confirm('¿Poner TODOS los stocks en 0?')) resetAllStock(); }}
                        className="bg-red-50 text-red-600 px-4 py-2 rounded-2xl border border-red-100 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-sm"
                    >
                        Stock 0
                    </button>
                    <button
                        onClick={() => { setEditId(null); setFormData({ name: '', priceA: '', priceB: '', priceC: '', unit: 'Pieza', code: '', stock: '' }); setIsFormOpen(true); }}
                        className="bg-primary text-white p-4 rounded-3xl shadow-xl shadow-primary/20 active:scale-90 transition-all"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.length === 0 ? (
                    <div className="col-span-full py-20 text-center opacity-50 font-bold uppercase tracking-widest text-[10px]">Sin productos en catálogo</div>
                ) : (
                    products.map((p) => (
                        <div 
                            key={p.id} 
                            onClick={() => edit(p)} 
                            className="bg-white dark:bg-slate-800 p-4 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 active:scale-[0.97] transition-all cursor-pointer group"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center text-primary font-black text-xl shadow-inner group-hover:bg-primary group-hover:text-white transition-colors uppercase">
                                {p.name.charAt(0)}
                            </div>
                            <div className="flex-1 truncate">
                                <h3 className="font-black text-slate-800 dark:text-white text-md leading-tight truncate uppercase tracking-tight">{p.name}</h3>
                                <div className="flex items-center gap-2 mt-1 font-black uppercase text-[9px] tracking-tighter">
                                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">A: ${Number(p.priceA || p.price).toFixed(2)}</span>
                                    <span className={`px-2 py-0.5 rounded-md ${p.stock > 10 ? 'bg-green-100 text-green-700' : p.stock > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-50 text-red-600'}`}>
                                        Stock: {Number(p.stock || 0).toFixed(2)}
                                    </span>
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
