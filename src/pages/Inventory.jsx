import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, ArrowDownToLine, ArrowUpFromLine, ArrowLeft } from 'lucide-react';

export default function Inventory() {
    const { products, inventory, addInventory } = useStore();
    const [formData, setFormData] = useState({ productId: '', quantity: '', type: 'IN', notes: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.productId) return;
        addInventory({ ...formData, quantity: Number(formData.quantity) });
        setFormData({ productId: '', quantity: '', type: 'IN', notes: '' });
    };

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <button onClick={() => window.history.back()} className="md:hidden p-2 -ml-2 text-primary hover:bg-slate-100 rounded-xl transition-colors">
                    <ArrowLeft size={24} />
                </button>
                Movimientos de Inventario
            </h1>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
                <h2 className="text-xl font-bold mb-4">Registrar Movimiento</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-slate-500 mb-1">Producto</label>
                        <select required value={formData.productId} onChange={e => setFormData({ ...formData, productId: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-cheese-400 outline-none bg-white">
                            <option value="">Selecciona un producto...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock || 0})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Tipo</label>
                        <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-cheese-400 outline-none bg-white">
                            <option value="IN">Entrada (+)</option>
                            <option value="OUT">Salida (-)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Cantidad</label>
                        <input required type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-cheese-400 outline-none" placeholder="0" />
                    </div>
                    <div>
                        <button type="submit" className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow font-medium flex justify-center items-center gap-2">
                            <Plus size={18} /> Registrar
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="py-3 px-4 font-medium text-slate-500">Fecha</th>
                                <th className="py-3 px-4 font-medium text-slate-500">Tipo</th>
                                <th className="py-3 px-4 font-medium text-slate-500">Producto</th>
                                <th className="py-3 px-4 font-medium text-slate-500">Cantidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventory.slice().reverse().map((item) => {
                                const product = products.find(p => p.id === item.productId);
                                const isEntry = item.type === 'IN';
                                return (
                                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50">
                                        <td className="py-3 px-4 text-slate-600">{new Date(item.date).toLocaleString()}</td>
                                        <td className="py-3 px-4">
                                            <span className={`flex items-center gap-1 w-max px-2 py-1 rounded-md text-xs font-bold ${isEntry ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {isEntry ? <ArrowDownToLine size={14} /> : <ArrowUpFromLine size={14} />}
                                                {isEntry ? 'Entrada' : 'Salida'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-medium text-slate-800">{product?.name || 'Producto eliminado'}</td>
                                        <td className={`py-3 px-4 font-bold ${isEntry ? 'text-green-600' : 'text-red-600'}`}>
                                            {isEntry ? '+' : '-'}{item.quantity}
                                        </td>
                                    </tr>
                                );
                            })}
                            {inventory.length === 0 && <tr><td colSpan="4" className="text-center py-8 text-slate-400">Sin movimientos registrados.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
