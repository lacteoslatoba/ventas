import React, { useState } from 'react';
import { useStore } from '../store';
import {
    Settings2, Save, FileText, Building2, Phone,
    MapPin, AlignCenter, CheckCheck, Printer, Eye, EyeOff,
    ChevronRight, Info, AlignLeft, AlignRight, Type, Calendar, User, ArrowLeft,
    Image as ImageIcon, Upload, Trash2, RefreshCw, Minus, Plus
} from 'lucide-react';

import TicketPreview from '../components/TicketPreview';

import Field from '../components/ui/Field';
import Toggle from '../components/ui/Toggle';
import Section from '../components/ui/Section';

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function TicketConfig() {
    const { ticketConfig, updateTicketConfig, showToast } = useStore();
    const [form, setForm] = useState(ticketConfig);
    const [saved, setSaved] = useState(false);
    const [showPreview, setShowPreview] = useState(true);

    React.useEffect(() => {
        if (ticketConfig) {
            setForm(prev => ({ 
                ...prev, 
                ...ticketConfig,
                // Si el logoUrl del store es diferente al del form, lo actualizamos
                logoUrl: ticketConfig.logoUrl 
            }));
        }
    }, [ticketConfig]);

    const update = (field) => (value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            update('logoUrl')(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        update('logoUrl')(null);
    };

    const [isSaving, setIsSaving] = useState(false);
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateTicketConfig(form);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Error al guardar:', error);
            showToast('Se guardó localmente (sin conexión)', 'warning');
        } finally {
            setIsSaving(false);
        }
    };

    if (!form) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-slate-500 font-bold animate-pulse">Cargando configuración...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto pb-48 md:pb-32">
            {/* Header */}
            <div className="mb-10 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <FileText size={24} className="text-primary" />
                        </div>
                        Configurar Ticket
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 ml-1">
                        Personaliza el encabezado y pie de página del recibo
                    </p>
                </div>
                <button
                    onClick={() => setShowPreview(p => !p)}
                    className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl transition-all shrink-0 shadow-sm ${
                        showPreview 
                        ? 'bg-slate-200 text-slate-700' 
                        : 'bg-primary text-white shadow-primary/20'
                    }`}
                >
                    {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
                    {showPreview ? 'Ocultar' : 'Vista previa'}
                </button>
            </div>

            <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-[1fr_220px]' : ''}`}>
                {/* Formulario */}
                <div className="space-y-5">

                    {/* Diseño Template */}
                    <Section title="Estilo Base del Ticket" icon={FileText}>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { value: 'standard', label: 'Estándar', desc: 'Diseño clásico' },
                                { value: 'latoba', label: 'Ticket La Toba', desc: 'Adaptado p/ báscula' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, ticketTemplate: opt.value }))}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all ${form.ticketTemplate === opt.value
                                        ? 'border-primary bg-primary/5 shadow-sm'
                                        : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`font-black text-sm md:text-base ${form.ticketTemplate === opt.value ? 'text-primary' : 'text-slate-700'}`}>
                                            {opt.label}
                                        </span>
                                        {form.ticketTemplate === opt.value && (
                                            <CheckCheck size={18} className="text-primary" />
                                        )}
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-medium leading-none">{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                    </Section>

                    {/* Identificación del negocio */}
                    <Section title="Datos del Negocio" icon={Building2}>
                        <div className="mb-6">
                            <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                <ImageIcon size={14} /> Logo del Negocio
                            </label>
                            
                            <div className="flex items-center gap-4">
                                <div className="relative w-24 h-24 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group">
                                    {form.logoUrl ? (
                                        <>
                                            <img src={form.logoUrl} alt="Logo preview" className="w-full h-full object-contain p-2" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={handleRemoveLogo}
                                                    className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                                    title="Eliminar logo"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-slate-300">
                                            <ImageIcon size={32} />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-1 space-y-2">
                                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                                        <Upload size={16} className="text-primary" />
                                        {form.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*" 
                                            onChange={handleLogoChange} 
                                        />
                                    </label>
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                        Se recomienda una imagen cuadrada o rectangular (máx 1MB). Aparecerá en la parte superior del ticket.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Visibilidad Nombre</h3>
                            <Toggle
                                id="showBusinessName"
                                checked={form.showBusinessName}
                                onChange={update('showBusinessName')}
                            />
                        </div>

                        <Field
                            id="businessName"
                            label="Nombre del Negocio"
                            icon={Building2}
                            value={form.businessName}
                            onChange={update('businessName')}
                            placeholder="QUESOS EL BUEN SABOR"
                            maxLength={20}
                            hint="Aparece grande en la parte superior del ticket"
                        />
                        
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                            <label className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                <span className="flex items-center gap-2"><Type size={14} /> Tamaño de Letra (Nombre)</span>
                            </label>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => update('businessNameSize')(Math.max(10, (form.businessNameSize || 13) - 1))}
                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-sm"
                                >
                                    <Minus size={18} />
                                </button>
                                <div className="flex-1 text-center bg-white py-2 rounded-xl border border-slate-100 font-black text-primary">
                                    {form.businessNameSize || 13}px
                                </div>
                                <button 
                                    onClick={() => update('businessNameSize')(Math.min(24, (form.businessNameSize || 13) + 1))}
                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-sm"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                             <div className="flex-1">
                                <Field
                                    id="subtitle"
                                    label="Subtítulo / Giro"
                                    icon={AlignCenter}
                                    value={form.subtitle}
                                    onChange={update('subtitle')}
                                    placeholder="Productos Lácteos"
                                    maxLength={32}
                                />
                             </div>
                             <div className="pt-7 shrink-0">
                                <Toggle
                                    id="showSubtitle"
                                    checked={form.showSubtitle}
                                    onChange={update('showSubtitle')}
                                />
                             </div>
                        </div>
                        <div className="flex items-start gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                             <div className="flex-1">
                                <Field
                                    id="address"
                                    label="Dirección"
                                    icon={MapPin}
                                    value={form.address}
                                    onChange={update('address')}
                                    placeholder="Av. Principal #123, Col. Centro"
                                    maxLength={38}
                                />
                             </div>
                             <div className="pt-7 shrink-0">
                                <Toggle
                                    id="showAddress"
                                    checked={form.showAddress}
                                    onChange={update('showAddress')}
                                />
                             </div>
                        </div>

                        <div className="flex items-start gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                             <div className="flex-1">
                                <Field
                                    id="phone"
                                    label="Teléfono / WhatsApp"
                                    icon={Phone}
                                    value={form.phone}
                                    onChange={update('phone')}
                                    placeholder="(618) 123-4567"
                                    maxLength={20}
                                />
                             </div>
                             <div className="pt-7 shrink-0">
                                <Toggle
                                    id="showPhone"
                                    checked={form.showPhone}
                                    onChange={update('showPhone')}
                                />
                             </div>
                        </div>


                    </Section>

                    {/* Campos Visibles */}
                    <Section title="Campos Visibles" icon={Eye}>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                            <Toggle
                                id="showAddress"
                                label="Dirección"
                                checked={form.showAddress}
                                onChange={update('showAddress')}
                            />
                            <Toggle
                                id="showPhone"
                                label="Teléfono"
                                checked={form.showPhone}
                                onChange={update('showPhone')}
                            />
                            <Toggle
                                id="showDate"
                                label="Fecha"
                                checked={form.showDate}
                                onChange={update('showDate')}
                            />
                            <Toggle
                                id="showTime"
                                label="Hora"
                                checked={form.showTime}
                                onChange={update('showTime')}
                            />
                            <Toggle
                                id="showSeller"
                                label="Vendedor / Usuario"
                                checked={form.showSeller}
                                onChange={update('showSeller')}
                            />
                            <Toggle
                                id="showCustomer"
                                label="Cliente"
                                checked={form.showCustomer}
                                onChange={update('showCustomer')}
                            />
                            <Toggle
                                id="showMainTitle"
                                label="Título 'TICKET DE VENTA'"
                                desc="Oculta el texto TICKET DE VENTA arriba del logo"
                                checked={form.showMainTitle}
                                onChange={update('showMainTitle')}
                            />
                            <Toggle
                                id="showBusinessName"
                                label="Nombre del Negocio (Texto)"
                                desc="Oculta el nombre si ya está incluido en tu logotipo"
                                checked={form.showBusinessName}
                                onChange={update('showBusinessName')}
                            />
                            <Toggle
                                id="showLabels"
                                label="Etiquetas (Fecha:, Ticket:, etc.)"
                                desc="Solo imprime los datos, ahorrando espacio"
                                checked={form.showLabels}
                                onChange={update('showLabels')}
                            />
                            <Toggle
                                id="showLogo"
                                label="Imprimir Logotipo"
                                desc="Muestra el logo de la empresa en la parte superior"
                                checked={form.showLogo}
                                onChange={update('showLogo')}
                            />
                            <Toggle
                                id="showItemsHeader"
                                label="Encabezado ITEM / PRECIO"
                                checked={form.showItemsHeader}
                                onChange={update('showItemsHeader')}
                                desc="Muestra u oculta los títulos ITEM y PRECIO arriba de los productos"
                            />
                            <Toggle
                                id="multiLineItems"
                                label="Diseño de Items (Dos Líneas)"
                                checked={form.multiLineItems}
                                onChange={update('multiLineItems')}
                                desc="Recomendado: Nombre arriba y detalles (cantidad/precio) abajo para tickets angostos"
                            />
                            <Toggle
                                id="showCashAndChange"
                                label="Efectivo y Cambio"
                                checked={form.showCashAndChange}
                                onChange={update('showCashAndChange')}
                                desc="Muestra u oculta un desglose del pago en efectivo y el cambio"
                            />
                            <Toggle
                                id="showPaymentMethod"
                                label="Forma de Pago"
                                checked={form.showPaymentMethod ?? true}
                                onChange={update('showPaymentMethod')}
                                desc="Muestra Efectivo o Transferencia en el ticket"
                            />
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <label className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                    <span className="flex items-center gap-2"><Type size={14} /> Tamaño de Datos (Fecha, Ticket, etc.)</span>
                                </label>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => update('metadataSize')(Math.max(7, (form.metadataSize || 10) - 1))}
                                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-sm"
                                    >
                                        <Minus size={18} />
                                    </button>
                                    <div className="flex-1 text-center bg-white py-2 rounded-xl border border-slate-100 font-black text-primary">
                                        {form.metadataSize || 10}px
                                    </div>
                                    <button 
                                        onClick={() => update('metadataSize')(Math.min(14, (form.metadataSize || 10) + 1))}
                                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-sm"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>
                            
                            <Toggle
                                id="metadataUppercase"
                                label="Texto en Mayúsculas"
                                desc="Convierte automáticamente a mayúsculas la fecha, cliente y vendedor"
                                checked={form.metadataUppercase}
                                onChange={update('metadataUppercase')}
                            />

                            <div className="pt-4 border-t border-slate-100">
                                <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                    <AlignCenter size={14} /> Alineación de Datos
                                </label>
                                <div className="flex bg-slate-100 p-1.5 rounded-xl">
                                    {[
                                        { id: 'left', icon: AlignLeft, label: 'Izq.' },
                                        { id: 'center', icon: AlignCenter, label: 'Cent.' },
                                        { id: 'right', icon: AlignRight, label: 'Der.' },
                                        { id: 'between', icon: CheckCheck, label: 'Columnas' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => update('metadataAlignment')(opt.id)}
                                            className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${form.metadataAlignment === opt.id || (opt.id === 'between' && !form.metadataAlignment) ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                        >
                                            <opt.icon size={16} />
                                            <span className="text-[9px] mt-0.5">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                                <label className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                    <span className="flex items-center gap-2"><Type size={14} /> Espaciado entre Líneas</span>
                                </label>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => update('metadataSpacing')(Math.max(0, (form.metadataSpacing || 0) - 1))}
                                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-sm"
                                    >
                                        <Minus size={18} />
                                    </button>
                                    <div className="flex-1 text-center bg-white py-2 rounded-xl border border-slate-100 font-black text-primary">
                                        {form.metadataSpacing || 0}px
                                    </div>
                                    <button 
                                        onClick={() => update('metadataSpacing')(Math.min(20, (form.metadataSpacing || 0) + 1))}
                                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-sm"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Section>

                    {/* Diseño y Apariencia */}
                    <Section title="Diseño y Apariencia" icon={Type}>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <Field
                                    id="itemsHeaderLeft"
                                    label="Título Izq. (Items)"
                                    value={form.itemsHeaderLeft}
                                    onChange={update('itemsHeaderLeft')}
                                    placeholder="CANT/ITEM"
                                    maxLength={15}
                                />
                                <Field
                                    id="itemsHeaderRight"
                                    label="Título Der. (Precio)"
                                    value={form.itemsHeaderRight}
                                    onChange={update('itemsHeaderRight')}
                                    placeholder="IMPORTE"
                                    maxLength={10}
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                    <AlignCenter size={14} /> Alineación de Títulos
                                </label>
                                <div className="flex bg-slate-100 p-1.5 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => update('titleAlignment')('left')}
                                        className={`flex-1 flex justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${form.titleAlignment === 'left' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                    >
                                        <AlignLeft size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => update('titleAlignment')('center')}
                                        className={`flex-1 flex justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${form.titleAlignment === 'center' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                    >
                                        <AlignCenter size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => update('titleAlignment')('right')}
                                        className={`flex-1 flex justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${form.titleAlignment === 'right' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                    >
                                        <AlignRight size={18} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="pt-2 border-t border-slate-100">
                                <Toggle
                                    id="printCopy"
                                    label="Imprimir Doble Copia"
                                    desc="Imprime el ticket automáticamente dos veces (uno para ti, uno para el cliente)"
                                    checked={form.printCopy}
                                    onChange={update('printCopy')}
                                />
                            </div>
                            <div className="pt-2 border-t border-slate-100">
                                <Toggle
                                    id="spaceBetweenItems"
                                    label="Espacio entre Productos"
                                    desc="Añade un salto de línea adicional entre cada producto para facilitar la lectura"
                                    checked={form.spaceBetweenItems}
                                    onChange={update('spaceBetweenItems')}
                                />
                            </div>
                            <div className="pt-2 border-t border-slate-100">
                                <Toggle
                                    id="centerTotal"
                                    label="Total Centrado"
                                    desc="Muestra el importe TOTAL centrado en el ticket en lugar de alinearlo a la derecha"
                                    checked={form.centerTotal}
                                    onChange={update('centerTotal')}
                                />
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                                <label className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                    <span className="flex items-center gap-2"><Type size={14} /> Tamaño TOTAL</span>
                                </label>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => update('totalFontSize')(Math.max(10, (form.totalFontSize || 14) - 1))}
                                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-sm"
                                    >
                                        <Minus size={18} />
                                    </button>
                                    <div className="flex-1 text-center bg-white py-2 rounded-xl border border-slate-100 font-black text-primary">
                                        {form.totalFontSize || 14}px
                                    </div>
                                    <button 
                                        onClick={() => update('totalFontSize')(Math.min(24, (form.totalFontSize || 14) + 1))}
                                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-sm"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-3">
                                    {form.totalFontSize > 16 ? '⚠️ La impresora usará modo DOBLE TAMAÑO' : 'Se usará modo TAMAÑO NORMAL'}
                                </p>
                            </div>
                            <div className="pt-2 border-t border-slate-100">
                                <Toggle
                                    id="useFontB"
                                    label="Usar Fuente Pequeña (Modo B)"
                                    desc="Reduce el tamaño de letra si tu impresora lo soporta"
                                    checked={form.useFontB}
                                    onChange={update('useFontB')}
                                />
                            </div>
                        </div>
                    </Section>

                    {/* Layout y Estructura */}
                    <Section title="Layout y Estructura Detallada" icon={Settings2}>
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                    <Type size={14} /> Estilo de Separadores
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['dashed', 'solid'].map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => update('separatorStyle')(s)}
                                            className={`py-2 rounded-lg text-xs font-bold transition-all border ${form.separatorStyle === s ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                        >
                                            {s === 'dashed' ? '--- Guiones ---' : '___ Línea Sólida ___'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Visibilidad de Separadores</h3>
                                <Toggle
                                    id="showSeparatorHeader"
                                    label="Línea tras Encabezado"
                                    checked={form.showSeparatorHeader}
                                    onChange={update('showSeparatorHeader')}
                                />
                                <Toggle
                                    id="showSeparatorItems"
                                    label="Línea tras Datos (Fecha/ETC)"
                                    checked={form.showSeparatorItems}
                                    onChange={update('showSeparatorItems')}
                                />
                                <Toggle
                                    id="showSeparatorFooter"
                                    label="Línea antes del Total"
                                    checked={form.showSeparatorFooter}
                                    onChange={update('showSeparatorFooter')}
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 space-y-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Márgenes y Separación</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 text-left">
                                            Márgenes Sup.
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => update('headerSpacing')(Math.max(0, (form.headerSpacing || 0) - 2))}
                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <div className="flex-1 bg-white py-1 rounded-lg border border-slate-100 text-xs font-black text-primary">
                                                {form.headerSpacing || 0}
                                            </div>
                                            <button 
                                                onClick={() => update('headerSpacing')(Math.min(20, (form.headerSpacing || 0) + 2))}
                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 text-left">
                                            Salto tras Productos
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => update('itemsSectionSpacing')(Math.max(0, (form.itemsSectionSpacing || 0) - 5))}
                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <div className="flex-1 bg-white py-1 rounded-lg border border-slate-100 text-xs font-black text-primary">
                                                {form.itemsSectionSpacing || 0}
                                            </div>
                                            <button 
                                                onClick={() => update('itemsSectionSpacing')(Math.min(20, (form.itemsSectionSpacing || 0) + 5))}
                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 space-y-2">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Resaltado (Negritas)</h3>
                                <Toggle
                                    id="businessNameBold"
                                    label="Nombre de Negocio en Negrita"
                                    checked={form.businessNameBold}
                                    onChange={update('businessNameBold')}
                                />
                                <Toggle
                                    id="metadataBold"
                                    label="Datos (Fecha, Cliente) en Negrita"
                                    checked={form.metadataBold}
                                    onChange={update('metadataBold')}
                                />
                                <Toggle
                                    id="itemsBold"
                                    label="Productos en Negrita"
                                    checked={form.itemsBold}
                                    onChange={update('itemsBold')}
                                />
                                <Toggle
                                    id="totalBold"
                                    label="Total General en Negrita"
                                    checked={form.totalBold}
                                    onChange={update('totalBold')}
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 space-y-2">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Contenido Extra</h3>
                                <Toggle
                                    id="showSubtotal"
                                    label="Mostrar Subtotal"
                                    checked={form.showSubtotal}
                                    onChange={update('showSubtotal')}
                                />
                                {form.showSubtotal && (
                                    <div className="pl-4 pt-2 space-y-4 border-l-2 border-slate-100 ml-2">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                                <AlignCenter size={12} /> Alineación Subtotal
                                            </label>
                                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                                {[
                                                    { id: 'left', icon: AlignLeft, label: 'Izq.' },
                                                    { id: 'center', icon: AlignCenter, label: 'Cent.' },
                                                    { id: 'right', icon: AlignRight, label: 'Der.' },
                                                    { id: 'between', icon: CheckCheck, label: 'Columnas' }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => update('subtotalAlignment')(opt.id)}
                                                        className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-bold transition-all ${form.subtotalAlignment === opt.id ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        <opt.icon size={14} />
                                                        <span className="text-[8px] mt-0.5">{opt.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                                Espacio Subtotal → Total
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => update('subtotalTotalSpacing')(Math.max(0, (form.subtotalTotalSpacing || 0) - 1))}
                                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <div className="flex-1 bg-white py-1 rounded-lg border border-slate-100 text-xs font-black text-primary text-center">
                                                    {form.subtotalTotalSpacing || 0}
                                                </div>
                                                <button 
                                                    onClick={() => update('subtotalTotalSpacing')(Math.min(15, (form.subtotalTotalSpacing || 0) + 1))}
                                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                            Avance de papel al final (líneas)
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <button 
                                                onClick={() => update('footerSpacing')(Math.max(0, (form.footerSpacing || 0) - 2))}
                                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-sm"
                                            >
                                                <Minus size={18} />
                                            </button>
                                            <div className="flex-1 text-center bg-white py-2 rounded-xl border border-slate-100 font-black text-primary">
                                                {form.footerSpacing || 0}px
                                            </div>
                                            <button 
                                                onClick={() => update('footerSpacing')(Math.min(20, (form.footerSpacing || 0) + 2))}
                                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-sm"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Section>

                            {/* Pie de página */}
                    <Section title="Pie de Página" icon={Settings2}>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                <div className="flex-1">
                                    <Field
                                        id="footerLine1"
                                        label="Mensaje de despedida 1"
                                        value={form.footerLine1}
                                        onChange={update('footerLine1')}
                                        placeholder="¡Gracias por su compra!"
                                        maxLength={38}
                                    />
                                </div>
                                <div className="pt-7 shrink-0">
                                    <Toggle
                                        id="showFooterLine1"
                                        checked={form.showFooterLine1}
                                        onChange={update('showFooterLine1')}
                                    />
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                <div className="flex-1">
                                    <Field
                                        id="footerLine2"
                                        label="Mensaje de despedida 2"
                                        value={form.footerLine2}
                                        onChange={update('footerLine2')}
                                        placeholder="Visítenos de nuevo"
                                        maxLength={38}
                                    />
                                </div>
                                <div className="pt-7 shrink-0">
                                    <Toggle
                                        id="showFooterLine2"
                                        checked={form.showFooterLine2}
                                        onChange={update('showFooterLine2')}
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Espacio Total → Despedida */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                Espacio entre Total y Despedida
                            </label>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => update('totalToFooterSpacing')(Math.max(0, (form.totalToFooterSpacing || 0) - 1))}
                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-sm"
                                >
                                    <Minus size={18} />
                                </button>
                                <div className="flex-1 text-center bg-white py-2 rounded-xl border border-slate-100 font-black text-primary">
                                    {form.totalToFooterSpacing || 0}
                                </div>
                                <button
                                    onClick={() => update('totalToFooterSpacing')(Math.min(20, (form.totalToFooterSpacing || 0) + 1))}
                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-sm"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Estilo del mensaje de despedida */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2 space-y-3">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">
                                Estilo del Mensaje de Despedida
                            </label>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-500 w-20">Tamaño</span>
                                <div className="flex items-center gap-2 flex-1">
                                    <button
                                        onClick={() => update('footerFontSize')(Math.max(7, (form.footerFontSize || 9) - 1))}
                                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <div className="flex-1 bg-white py-1 rounded-lg border border-slate-100 text-xs font-black text-primary text-center">
                                        {form.footerFontSize || 9}px
                                    </div>
                                    <button
                                        onClick={() => update('footerFontSize')(Math.min(18, (form.footerFontSize || 9) + 1))}
                                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                            <Toggle
                                id="footerBold"
                                label="Negrita en despedida"
                                checked={form.footerBold || false}
                                onChange={update('footerBold')}
                            />
                        </div>

                        <div className="pt-4 space-y-3 border-t border-slate-100 mt-4">
                            <Toggle
                                id="showSignature"
                                label="Mostrar línea de firma"
                                desc="Agrega un espacio para firma al final del ticket"
                                checked={form.showSignature}
                                onChange={update('showSignature')}
                            />
                        </div>
                    </Section>

                    {/* Papel */}
                    <Section title="Tamaño de Papel" icon={Printer}>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { value: 58, label: '58 mm', desc: 'Estándar móvil' },
                                { value: 80, label: '80 mm', desc: 'Ancho profesional' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, paperWidth: opt.value }))}
                                    className={`${form.paperWidth === opt.value
                                        ? 'border-primary bg-primary/5 shadow-sm'
                                        : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`font-black text-lg ${form.paperWidth === opt.value ? 'text-primary' : 'text-slate-700'}`}>
                                            {opt.label}
                                        </span>
                                        {form.paperWidth === opt.value && (
                                            <CheckCheck size={18} className="text-primary" />
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium">{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                            <Info size={12} />
                            Selecciona el ancho de papel de tu impresora térmica
                        </p>
                    </Section>
                    
                    {/* Botón único de guardado al final */}
                    <div className="pt-6 pb-8">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`w-full relative overflow-hidden rounded-3xl transition-all duration-300 active:scale-[0.97] disabled:cursor-not-allowed ${
                                saved
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xl shadow-emerald-500/30'
                                    : isSaving
                                        ? 'bg-slate-200'
                                        : 'bg-gradient-to-r from-primary to-blue-500 shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:from-blue-600 hover:to-primary'
                            }`}
                        >
                            {/* Shimmer effect cuando no está guardado */}
                            {!isSaving && !saved && (
                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            )}
                            <div className="relative flex items-center justify-center gap-3 py-5 px-6">
                                {isSaving ? (
                                    <>
                                        <RefreshCw size={20} className="animate-spin text-slate-400" />
                                        <span className="font-black text-sm uppercase tracking-widest text-slate-400">Sincronizando...</span>
                                    </>
                                ) : saved ? (
                                    <>
                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                            <CheckCheck size={18} className="text-white" />
                                        </div>
                                        <span className="font-black text-sm uppercase tracking-widest text-white">¡Guardado en la nube!</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                                            <Save size={18} className="text-white" />
                                        </div>
                                        <span className="font-black text-sm uppercase tracking-widest text-white">Guardar Configuración</span>
                                    </>
                                )}
                            </div>
                        </button>
                        <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-4">
                            Se aplica a todos los usuarios y dispositivos
                        </p>
                    </div>
                </div>

                {/* Vista previa (sticky) */}
                {showPreview && (
                    <div className="lg:sticky lg:top-4 space-y-3 h-fit">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">
                            Vista previa
                        </p>
                        <TicketPreview config={form} />
                        <p className="text-[10px] text-slate-400 text-center">
                            Simulación de papel 58mm
                        </p>
                    </div>
                )}
            </div>

        </div>
    );
}
