import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, Trash2, Edit2 } from 'lucide-react';

export default function Products() {
    const { products, addProduct, deleteProduct, updateProduct } = useStore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', priceA: '', priceB: '', priceC: '', unit: 'Pieza', code: '' });
    const [editId, setEditId] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        const productData = {
            ...formData,
            priceA: Number(formData.priceA) || 0,
            priceB: Number(formData.priceB) || 0,
            priceC: Number(formData.priceC) || 0
        };
        if (editId) {
            updateProduct(editId, productData);
        } else {
            addProduct({ ...productData, stock: 0 });
        }
        setFormData({ name: '', priceA: '', priceB: '', priceC: '', unit: 'Pieza', code: '' });
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
            code: product.code || '' 
        });
        setEditId(product.id);
        setIsFormOpen(true);
    };

    return (
        <div className="p-4 md:p-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight drop-shadow-sm">
                    Productos
                </h1>
                <button
                    onClick={() => { setEditId(null); setFormData({ name: '', priceA: '', priceB: '', priceC: '', unit: 'Pieza', code: '' }); setIsFormOpen(!isFormOpen); }}
                    className="bg-gradient-to-r from-cheese-400 to-cheese-500 hover:from-cheese-500 hover:to-cheese-600 text-slate-900 font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-cheese-500/30 flex items-center gap-2 active:scale-95 transition-all"
                >
                    <Plus size={22} /> <span className="hidden sm:inline">Nuevo Producto</span>
                </button>
            </div>

            {isFormOpen && (
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-white mb-8 animate-in slide-in-from-top-4 duration-300">
                    <h2 className="text-2xl font-black mb-6 tracking-tight text-slate-800">{editId ? 'Editar Producto' : 'Agregar Producto'}</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-500 mb-1">Nombre</label>
                            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-cheese-400 outline-none" placeholder="Queso Oaxaca..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Código</label>
                            <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-cheese-400 outline-none" placeholder="OAX-500G" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Unidad</label>
                            <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-cheese-400 outline-none">
                                <option>Pieza</option>
                                <option>Kg</option>
                                <option>Gramo</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Precio A ($)</label>
                            <input required type="number" step="0.01" value={formData.priceA} onChange={e => setFormData({ ...formData, priceA: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-cheese-400 outline-none" placeholder="100.00" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Precio B ($)</label>
                            <input required type="number" step="0.01" value={formData.priceB} onChange={e => setFormData({ ...formData, priceB: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-cheese-400 outline-none" placeholder="95.00" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Precio C ($)</label>
                            <input required type="number" step="0.01" value={formData.priceC} onChange={e => setFormData({ ...formData, priceC: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-cheese-400 outline-none" placeholder="90.00" />
                        </div>
                        
                        <div className="lg:col-span-4 flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                            {editId && (
                                <button 
                                    type="button" 
                                    onClick={() => { if(window.confirm('¿Estás seguro de eliminar este producto?')) { deleteProduct(editId); setIsFormOpen(false); } }} 
                                    className="flex items-center gap-2 px-6 py-2.5 text-red-600 hover:bg-red-50 rounded-2xl font-bold transition-colors w-full sm:w-auto justify-center"
                                >
                                    <Trash2 size={20} /> Eliminar Producto
                                </button>
                            )}
                            <div className="flex gap-3 w-full sm:w-auto sm:ml-auto">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 sm:flex-none px-6 py-2.5 text-slate-500 hover:bg-slate-100 rounded-2xl font-bold transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 sm:flex-none px-8 py-2.5 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-900/20 font-bold transition-all active:scale-95">Guardar</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Vista para Desktop */}
            <div className="hidden md:block bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white overflow-hidden mt-4">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-slate-100/50 border-b border-slate-200/60 backdrop-blur-md">
                            <tr>
                                <th className="py-4 px-5 font-bold text-slate-500 uppercase tracking-wider text-sm">Producto</th>
                                <th className="py-4 px-5 font-bold text-slate-500 uppercase tracking-wider text-sm">Cod</th>
                                <th className="py-4 px-5 font-bold text-slate-500 uppercase tracking-wider text-sm">Stock</th>
                                <th className="py-4 px-5 font-bold text-slate-500 uppercase tracking-wider text-sm">Pr. A</th>
                                <th className="py-4 px-5 font-bold text-slate-500 uppercase tracking-wider text-sm">Pr. B</th>
                                <th className="py-4 px-5 font-bold text-slate-500 uppercase tracking-wider text-sm">Pr. C</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-slate-400">Sin productos registrados</td>
                                </tr>
                            ) : (
                                products.map((p) => (
                                    <tr 
                                        key={p.id} 
                                        onClick={() => edit(p)}
                                        className="border-b border-slate-100/50 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="py-4 px-5 font-bold text-slate-800 text-[15px] group-hover:text-primary transition-colors">
                                            {p.name} 
                                            <span className="text-xs text-slate-400 font-semibold ml-1 bg-slate-100 px-2 py-1 rounded-md">({p.unit})</span>
                                        </td>
                                        <td className="py-4 px-5 text-slate-500 font-mono text-sm font-semibold">{p.code || '-'}</td>
                                        <td className="py-4 px-5">
                                            <span className={`px-3 py-1.5 rounded-xl text-sm font-black shadow-sm ${p.stock > 10 ? 'bg-green-100 text-green-700' : p.stock > 0 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                                {Number(p.stock || 0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 text-slate-900 font-bold text-[14px]">${Number(p.priceA || p.price).toFixed(2)}</td>
                                        <td className="py-4 px-5 text-slate-600 font-medium text-[14px]">${Number(p.priceB || 0).toFixed(2)}</td>
                                        <td className="py-4 px-5 text-slate-600 font-medium text-[14px]">${Number(p.priceC || 0).toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Vista para Móvil (Tarjetas) */}
            <div className="md:hidden space-y-4 mt-4">
                {products.length === 0 && (
                    <p className="text-center py-8 text-slate-400 bg-white rounded-2xl border border-slate-100 italic">
                        Sin productos registrados
                    </p>
                )}
                {products.map((p) => (
                    <div 
                        key={p.id} 
                        onClick={() => edit(p)}
                        className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 pr-4">
                                <h3 className="font-black text-slate-800 text-lg leading-tight mb-1 group-hover:text-primary transition-colors">{p.name}</h3>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="text-primary font-black">A: ${Number(p.priceA || p.price).toFixed(2)}</span>
                                    <span className="text-slate-500 font-bold">B: ${Number(p.priceB || 0).toFixed(2)}</span>
                                    <span className="text-slate-500 font-bold">C: ${Number(p.priceC || 0).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl text-slate-400 group-hover:text-primary transition-colors">
                                <Edit2 size={18} />
                            </div>
                        </div>
                        <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Existencia</span>
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${p.stock > 10 ? 'bg-green-100 text-green-700' : p.stock > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-50 text-red-600'}`}>
                                    {Number(p.stock || 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
