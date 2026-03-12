import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, Trash2, Edit2, ArrowLeft, Save } from 'lucide-react';

export default function Products() {
    const { products, addProduct, deleteProduct, updateProduct } = useStore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', priceA: '', priceB: '', priceC: '', unit: 'Pieza', code: '', stock: '' });
    const [editId, setEditId] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
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
            <div className="min-h-screen bg-[#f6f6f8] dark:bg-slate-900 animate-in fade-in slide-in-from-right-10 duration-300">
                <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 h-16 flex items-center justify-between sticky top-0 z-20">
                    <button onClick={resetForm} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                        {editId ? 'Configurar Producto' : 'Nuevo Producto'}
                    </h2>
                    <div className="w-10" />
                </div>

                <div className="p-4 max-w-2xl mx-auto pb-32">
                    <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nombre del Producto</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-primary/20 outline-none text-lg" placeholder="Ej. Queso Oaxaca" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Código</label>
                                    <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-primary/20 outline-none" placeholder="OAX-01" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Unidad</label>
                                    <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none">
                                        <option>Pieza</option>
                                        <option>Kg</option>
                                        <option>Gramo</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Existencia (Stock)</label>
                                <input required type="number" step="0.01" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl p-4 text-primary font-black focus:ring-2 focus:ring-primary/20 outline-none text-2xl" placeholder="0.00" />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Precios ($)</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-900/10 p-1 rounded-2xl pr-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-xs">P. A</div>
                                    <input required type="number" step="0.01" value={formData.priceA} onChange={e => setFormData({ ...formData, priceA: e.target.value })} className="flex-1 bg-transparent border-none p-2 text-emerald-700 dark:text-emerald-400 font-black text-xl outline-none" placeholder="0.00" />
                                </div>
                                <div className="flex items-center gap-4 bg-blue-50 dark:bg-blue-900/10 p-1 rounded-2xl pr-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white font-black text-xs">P. B</div>
                                    <input required type="number" step="0.01" value={formData.priceB} onChange={e => setFormData({ ...formData, priceB: e.target.value })} className="flex-1 bg-transparent border-none p-2 text-blue-700 dark:text-blue-400 font-black text-xl outline-none" placeholder="0.00" />
                                </div>
                                <div className="flex items-center gap-4 bg-purple-50 dark:bg-purple-900/10 p-1 rounded-2xl pr-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center text-white font-black text-xs">P. C</div>
                                    <input required type="number" step="0.01" value={formData.priceC} onChange={e => setFormData({ ...formData, priceC: e.target.value })} className="flex-1 bg-transparent border-none p-2 text-purple-700 dark:text-purple-400 font-black text-xl outline-none" placeholder="0.00" />
                                </div>
                            </div>
                        </div>

                        {editId && (
                            <button type="button" onClick={() => { if(window.confirm('¿Eliminar producto?')) { deleteProduct(editId); resetForm(); } }} className="w-full p-5 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-[2rem] font-black uppercase text-[10px] tracking-widest">
                                Eliminar del Catálogo
                            </button>
                        )}
                    </form>
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-30">
                    <button form="productForm" type="submit" className="w-full max-w-2xl mx-auto bg-primary text-white py-5 rounded-[2rem] shadow-xl shadow-primary/30 font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all text-xs">
                        <Save size={18} /> Guardar Cambios
                    </button>
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
                <button
                    onClick={() => { setEditId(null); setFormData({ name: '', priceA: '', priceB: '', priceC: '', unit: 'Pieza', code: '', stock: '' }); setIsFormOpen(true); }}
                    className="bg-primary text-white p-4 rounded-3xl shadow-xl shadow-primary/20 active:scale-90 transition-all"
                >
                    <Plus size={24} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.length === 0 ? (
                    <div className="col-span-full py-20 text-center opacity-50 font-bold uppercase tracking-widest text-xs">Sin productos registrados</div>
                ) : (
                    products.map((p) => (
                        <div key={p.id} onClick={() => edit(p)} className="bg-white dark:bg-slate-800 p-5 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-5 active:scale-[0.97] transition-all cursor-pointer group">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center text-primary font-black text-2xl shadow-inner group-hover:bg-primary group-hover:text-white transition-colors capitalize">
                                {p.name.charAt(0)}
                            </div>
                            <div className="flex-1 truncate">
                                <h3 className="font-black text-slate-800 dark:text-white text-lg leading-tight truncate uppercase tracking-tight">{p.name}</h3>
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md">${Number(p.priceA || p.price).toFixed(2)}</span>
                                    <span className={`px-2 py-0.5 rounded-md ${p.stock > 10 ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-xs' : p.stock > 0 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 text-xs' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-xs'}`}>
                                        Stock: {Number(p.stock || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl text-slate-300 group-hover:text-primary transition-colors">
                                <Edit2 size={16} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
