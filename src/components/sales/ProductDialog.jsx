import React, { useState } from 'react';
import { PackageOpen, X, Delete, ShoppingCart } from 'lucide-react';

export default function ProductDialog({ product, price, priceListName, onClose, onAdd, showToast }) {
    const [selectedQuantity, setSelectedQuantity] = useState('');
    const [selectedPieces, setSelectedPieces] = useState('');
    const [activeField, setActiveField] = useState('qty');

    const handleKeypadPress = (val) => {
        if (val === 'backspace') {
            if (activeField === 'qty') setSelectedQuantity(prev => prev.slice(0, -1));
            else setSelectedPieces(prev => prev.slice(0, -1));
            return;
        }

        if (activeField === 'qty') {
            if (val === '.') {
                if (!selectedQuantity.includes('.')) setSelectedQuantity(prev => prev === '' ? '0.' : prev + '.');
            } else {
                setSelectedQuantity(prev => prev + val);
            }
        } else {
            if (val === '.') return; // No decimales en piezas
            setSelectedPieces(prev => prev + val);
        }
    };

    const confirmAddToCart = () => {
        const rawQty = (selectedQuantity || "0").toString().trim();
        const numQty = parseFloat(rawQty);

        if (isNaN(numQty) || numQty <= 0) {
            showToast('Ingresa una cantidad válida', 'warning');
            return;
        }

        const rawPieces = (selectedPieces || "0").toString().trim();
        const numPieces = parseInt(rawPieces) || 0;

        if (numPieces <= 0) {
            showToast('¡Falta el número de piezas!', 'warning');
            return;
        }

        onAdd(numQty, numPieces);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div 
                onClick={e => e.stopPropagation()}
                className="bg-white w-full max-w-sm h-full md:h-auto md:max-h-[90vh] md:rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden"
            >
                {/* Header Header */}
                <div className="p-5 flex flex-row items-center justify-between border-b border-slate-100 shrink-0 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <PackageOpen size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-lg text-slate-800 leading-tight">{product.name}</h3>
                            <p className="text-primary font-bold text-sm">
                                Precio Lista {priceListName}: ${price.toFixed(2)} / {product.unit || 'u'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all active:scale-90"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col p-4">
                    {/* Inputs Visuales */}
                    <div className="flex flex-col gap-3 mb-4">
                        <div 
                            onClick={() => setActiveField('qty')}
                            className={`w-full p-4 rounded-2xl border-2 transition-all cursor-pointer ${activeField === 'qty' ? 'border-primary bg-blue-50 ring-4 ring-primary/5' : 'border-slate-100 bg-slate-50 opacity-70'}`}
                        >
                            <label className="block text-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cantidad ({product.unit || 'u'})</label>
                            <div className="text-center text-3xl font-black text-slate-800 min-h-[36px]">
                                {selectedQuantity || <span className="text-slate-200">0</span>}
                                {activeField === 'qty' && <span className="inline-block w-1 h-8 bg-primary ml-1 animate-pulse align-middle" />}
                            </div>
                        </div>

                        <div 
                            onClick={() => setActiveField('pieces')}
                            className={`w-full p-4 rounded-2xl border-2 transition-all cursor-pointer ${activeField === 'pieces' ? 'border-amber-500 bg-amber-50 ring-4 ring-amber-500/5' : 'border-slate-100 bg-slate-50 opacity-70'}`}
                        >
                            <label className="block text-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Piezas (Mandatorio)</label>
                            <div className="text-center text-3xl font-black text-slate-800 min-h-[36px]">
                                {selectedPieces || <span className="text-slate-200">0</span>}
                                {activeField === 'pieces' && <span className="inline-block w-1 h-8 bg-amber-500 ml-1 animate-pulse align-middle" />}
                            </div>
                        </div>
                    </div>

                    {/* Teclado Numérico */}
                    <div className="grid grid-cols-3 gap-2.5 flex-1 max-h-[400px]">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'backspace'].map((key) => (
                            <button
                                key={key}
                                onClick={() => handleKeypadPress(key)}
                                className={`h-[72px] rounded-2xl flex items-center justify-center transition-all active:scale-95 active:brightness-90 ${
                                    key === 'backspace' 
                                    ? 'bg-slate-200 text-slate-600 shadow-inner' 
                                    : 'bg-white border-2 border-slate-200 text-3xl font-black text-slate-800 shadow-md hover:border-primary/30'
                                }`}
                            >
                                {key === 'backspace' ? <Delete size={28} /> : key}
                            </button>
                        ))}
                    </div>

                    {/* Botón Acción */}
                    <button
                        onClick={confirmAddToCart}
                        className="w-full bg-slate-900 text-white font-black h-16 rounded-2xl shadow-xl mt-4 active:scale-95 transition-all text-lg flex justify-center gap-3 items-center group shrink-0"
                    >
                        <ShoppingCart size={22} className="group-hover:-rotate-12 transition-transform" />
                        AGREGAR • <span className="text-blue-400 font-black">${(price * (parseFloat(selectedQuantity) || 0)).toFixed(2)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
