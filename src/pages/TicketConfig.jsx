import React, { useState } from 'react';
import { useStore } from '../store';
import {
    Settings2, Save, FileText, Building2, Phone,
    MapPin, AlignCenter, CheckCheck, Printer, Eye, EyeOff,
    ChevronRight, Info, AlignLeft, AlignRight, Type, Calendar, User, Eye as EyeIcon, ArrowLeft,
    Image as ImageIcon, Upload, Trash2
} from 'lucide-react';

// ─── Preview del ticket (HTML) ───────────────────────────────────────────────
function TicketPreview({ config }) {
    const {
        businessName, subtitle, address, phone,
        extraLine1, extraLine2,
        footerLine1, footerLine2, showSignature,
        titleAlignment = 'center', showAddress = true, showPhone = true,
        showDate = true, showTime = true, showSeller = true, showCustomer = true,
        useFontB = false,
        ticketTemplate = 'standard',
        showItemsHeader = true,
        spaceBetweenItems = false,
        showCashAndChange = true,
        centerTotal = false,
        businessNameSize = 13,
        showMainTitle = true,
        showBusinessName = true,
        showLabels = true,
        metadataSize = 10,
        metadataUppercase = false,
        metadataAlignment = 'between', // 'between' (columnas) o 'left', 'center', 'right'
        metadataSpacing = 0, // Margen extra arriba de cada línea
        multiLineItems = true,
        totalFontSize = 14,
        itemsHeaderLeft = 'CANT/CONCEPTO',
        itemsHeaderRight = 'IMPORTE',
        logoUrl = null,
    } = config;

    const alignClass = titleAlignment === 'left' ? 'text-left' : titleAlignment === 'right' ? 'text-right' : 'text-center';
    const fontClass = useFontB ? 'text-[8.5px]' : 'text-[10px]';
    const metaStyle = { 
        fontSize: `${metadataSize}px`, 
        textTransform: metadataUppercase ? 'uppercase' : 'none' 
    };

    if (ticketTemplate === 'latoba') {
        const dateStr = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        const timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        return (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4 flex justify-center">
                <div
                    className={`font-mono leading-snug text-black bg-white`}
                    style={{ width: '200px', minHeight: '300px', fontSize: `${useFontB ? 8.5 : 10}px` }}
                >
                    {logoUrl && (
                        <div className="flex justify-center mb-2">
                            <img src={logoUrl} alt="Logo" className="max-w-[100px] max-h-[60px] object-contain grayscale" />
                        </div>
                    )}
                    <div className="text-center font-bold mb-0.5 leading-tight uppercase" style={{ fontSize: `${businessNameSize}px` }}>
                        {businessName || 'LACTEOS LA TOBA'}
                    </div>
                    {subtitle && <div className="text-center uppercase">{subtitle}</div>}
                    {showAddress && address && <div className="text-center uppercase">{address}</div>}
                    {showPhone && phone && <div className="text-center uppercase">TEL: {phone}</div>}
                    {extraLine1 && <div className="text-center">{extraLine1}</div>}
                    {extraLine2 && <div className="text-center">{extraLine2}</div>}

                    <div className="border-t border-dashed border-black my-1" />

                    <div style={{ ...metaStyle, marginTop: `${metadataSpacing}px` }} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}>
                        {showDate && <span>{showLabels ? 'FECHA: ' : ''}{dateStr}</span>}
                        {showTime && <span>{showLabels ? 'HORA: ' : ''}{timeStr}</span>}
                    </div>
                    <div style={{ ...metaStyle, marginTop: `${metadataSpacing}px` }} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}>
                        <span>{showLabels ? 'Ticket' : ''}</span><span>#A1B2C3</span>
                    </div>
                    
                    {showCustomer && <div style={{ ...metaStyle, marginTop: `${metadataSpacing}px` }} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}><span>{showLabels ? 'Cliente' : ''}</span><span>Tienda La Fe</span></div>}
                    {showSeller && <div style={{ ...metaStyle, marginTop: `${metadataSpacing}px` }} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}><span>{showLabels ? 'Repartidor' : ''}</span><span>Juan Pérez</span></div>}

                    {showItemsHeader && (
                        <>
                            <div className="border-t border-dashed border-black my-1" />
                            <div className="flex justify-between uppercase"><span>{itemsHeaderLeft}</span><span>{itemsHeaderRight}</span></div>
                            <div className="border-t border-dashed border-black my-1" />
                        </>
                    )}

                    {multiLineItems ? (
                        <>
                            <div className={spaceBetweenItems ? 'mb-4' : 'mb-2'}>
                                <div className="uppercase">QUESO OAXACA</div>
                                <div className="flex justify-between uppercase text-[9px] text-slate-500"><span>2 kg x $60.00/kg</span><span>$120.00</span></div>
                            </div>
                            <div className={spaceBetweenItems ? 'mb-4' : 'mb-2'}>
                                <div className="uppercase">REQUESON</div>
                                <div className="flex justify-between uppercase text-[9px] text-slate-500"><span>1 x $45.00/u</span><span>$45.00</span></div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={`flex justify-between uppercase ${spaceBetweenItems ? 'mb-3' : 'mb-1'}`}>
                                <span>2kg QUESO OAX.</span>
                                <span>$120.00</span>
                            </div>
                            <div className={`flex justify-between uppercase ${spaceBetweenItems ? 'mb-3' : 'mb-1'}`}>
                                <span>1x REQUESON</span>
                                <span>$45.00</span>
                            </div>
                        </>
                    )}

                    <div className="uppercase">NUMERO DE ARTICULOS: 2</div>
                    
                    <div className="text-right mt-2 font-bold uppercase">SUBTOTAL: $165.00</div>
                    <div className={`${centerTotal ? 'text-center' : 'text-right'} font-bold leading-[1.2] mt-2 mb-1 uppercase`} style={{ fontSize: `${totalFontSize}px` }}>TOTAL $165.00</div>

                    {showCashAndChange && (
                        <>
                            <div className="border-t border-dashed border-black my-1" />
                            <div className="flex justify-between uppercase"><span>EFECTIVO:</span><span>$165.00</span></div>
                            <div className="flex justify-between uppercase"><span>CAMBIO:</span><span>$0.00</span></div>
                        </>
                    )}
                    <div className="border-t border-dashed border-black my-1" />

                    <div className="text-center mt-2 uppercase">{footerLine1 || '¡GRACIAS POR SU COMPRA!'}</div>
                    {footerLine2 && <div className="text-center uppercase">{footerLine2}</div>}
                    {showSignature && <div className="mt-3 uppercase">FIRMA: ________________________</div>}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4 flex justify-center">
            <div
                className={`font-mono leading-snug text-black bg-white`}
                style={{ width: '200px', minHeight: '300px', fontSize: `${useFontB ? 8.5 : 10}px` }}
            >
                {logoUrl && (
                    <div className="flex justify-center mb-2">
                        <img src={logoUrl} alt="Logo" className="max-w-[100px] max-h-[60px] object-contain grayscale" />
                    </div>
                )}
                {/* Encabezado */}
                {showMainTitle && <div className="text-center font-bold text-[10px] mb-1">TICKET DE VENTA</div>}
                
                {showBusinessName && (
                    <div className={`${alignClass} font-bold mb-0.5 leading-tight`} style={{ fontSize: `${businessNameSize}px` }}>
                        {businessName || 'MI NEGOCIO'}
                    </div>
                )}
                {subtitle && <div className={`${alignClass} ${useFontB ? 'text-[7px]' : 'text-[9px]'}`}>{subtitle}</div>}
                {showAddress && address && <div className={alignClass}>{address}</div>}
                {showPhone && phone && <div className={alignClass}>Tel: {phone}</div>}
                {extraLine1 && <div className="text-center">{extraLine1}</div>}
                {extraLine2 && <div className="text-center">{extraLine2}</div>}

                <div className="border-t border-dashed border-black my-1" />

                {/* Info ticket */}
                <div style={{ ...metaStyle, textAlign: metadataAlignment === 'between' ? 'left' : metadataAlignment }}>
                    <div style={{ marginTop: `${metadataSpacing}px` }} className={metadataAlignment === 'between' ? 'flex justify-between' : ''}>
                        <span>{showLabels ? 'Ticket :' : ''}</span> <span>#A1B2C3</span>
                    </div>
                    {showDate && (
                        <div style={{ marginTop: `${metadataSpacing}px` }} className={metadataAlignment === 'between' ? 'flex justify-between' : ''}>
                            <span>{showLabels ? 'Fecha  :' : ''}</span> <span>{new Date().toLocaleDateString('es-MX')}</span>
                        </div>
                    )}
                    {showTime && (
                        <div style={{ marginTop: `${metadataSpacing}px` }} className={metadataAlignment === 'between' ? 'flex justify-between' : ''}>
                            <span>{showLabels ? 'Hora   :' : ''}</span> <span>{new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )}
                </div>

                <div className="border-t border-dashed border-black my-1" />
                
                {(showSeller || showCustomer) && (
                    <>
                        <div style={{ ...metaStyle, textAlign: metadataAlignment === 'between' ? 'left' : metadataAlignment }}>
                            {showSeller && (
                                <div style={{ marginTop: `${metadataSpacing}px` }} className={metadataAlignment === 'between' ? 'flex justify-between' : ''}>
                                    <span>{showLabels ? 'Repartidor:' : ''}</span> <span>Juan Pérez</span>
                                </div>
                            )}
                            {showCustomer && (
                                <div style={{ marginTop: `${metadataSpacing}px` }} className={metadataAlignment === 'between' ? 'flex justify-between' : ''}>
                                    <span>{showLabels ? 'Cliente   :' : ''}</span> <span>Tienda La Fe</span>
                                </div>
                            )}
                        </div>
                        <div className="border-t border-dashed border-black my-1" />
                    </>
                )}


                {showItemsHeader && (
                    <>
                        <div className="flex justify-between font-bold uppercase overflow-hidden"><span>{itemsHeaderLeft}</span><span>{itemsHeaderRight}</span></div>
                        <div className="border-t border-dashed border-black my-0.5" />
                    </>
                )}
                {multiLineItems ? (
                    <>
                        <div>QUESO OAXACA</div>
                        <div className={`flex justify-between text-[9px] opacity-70 ${spaceBetweenItems ? 'mb-3' : 'mb-1'}`}><span>2x @ $60.00/u</span><span>$120.00</span></div>
                        <div>REQUESON</div>
                        <div className={`flex justify-between text-[9px] opacity-70 ${spaceBetweenItems ? 'mb-3' : 'mb-1'}`}><span>1x @ $45.00/u</span><span>$45.00</span></div>
                    </>
                ) : (
                    <>
                        <div className={`flex justify-between ${spaceBetweenItems ? 'mb-2' : ''}`}><span>2x QUESO OAXACA</span><span>$120.00</span></div>
                        <div className={`flex justify-between ${spaceBetweenItems ? 'mb-2' : ''}`}><span>1x REQUESON</span><span>$45.00</span></div>
                    </>
                )}
                <div className="border-t-2 border-black my-0.5" />
                <div className={`${centerTotal ? 'text-center' : 'text-right'} font-bold leading-[1.2] uppercase`} style={{ fontSize: `${totalFontSize}px` }}>TOTAL $165.00</div>
                <div className="border-t border-dashed border-black my-0.5" />

                {showCashAndChange && (
                    <>
                        <div className="flex justify-between text-[11px]"><span>Efectivo:</span><span>$165.00</span></div>
                        <div className="flex justify-between text-[11px]"><span>Cambio:</span><span>$0.00</span></div>
                        <div className="border-t border-dashed border-black my-0.5" />
                    </>
                )}

                {/* Pie */}
                <div className="text-center mt-1 text-[9px]">
                    {footerLine1 || '¡Gracias por su compra!'}
                </div>
                {footerLine2 && <div className="text-center text-[9px]">{footerLine2}</div>}
                {showSignature && (
                    <div className="mt-3 text-[9px]">Firma: ________________________</div>
                )}
            </div>
        </div>
    );
}

// ─── Campo de formulario ─────────────────────────────────────────────────────
function Field({ label, icon: Icon, id, value, onChange, placeholder, maxLength, hint }) {
    return (
        <div>
            <label htmlFor={id} className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                {Icon && <Icon size={12} />}
                {label}
                {maxLength && <span className="ml-auto font-normal normal-case tracking-normal text-slate-400">{(value || '').length}/{maxLength}</span>}
            </label>
            <input
                id={id}
                type="text"
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/15 px-4 py-3 rounded-xl font-medium text-slate-800 outline-none transition-all placeholder:text-slate-300 text-sm"
            />
            {hint && <p className="text-xs text-slate-400 mt-1 ml-1">{hint}</p>}
        </div>
    );
}

// ─── Toggle Switch ───────────────────────────────────────────────────────────
function Toggle({ label, desc, checked, onChange, id }) {
    return (
        <div className="flex items-center justify-between gap-4 py-1">
            <div>
                <p className="font-bold text-slate-700 text-sm">{label}</p>
                {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
            </div>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${checked ? 'bg-primary' : 'bg-slate-200'}`}
            >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );
}

// ─── Sección con título ───────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, onSave, saved }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={16} className="text-primary" />}
                    <h2 className="font-black text-slate-700 text-sm uppercase tracking-wider">{title}</h2>
                </div>
                {onSave && (
                    <button
                        onClick={onSave}
                        className={`text-xs font-black px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm ${saved ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:bg-blue-700 shadow-blue-500/20'
                            }`}
                    >
                        {saved ? (
                            <><CheckCheck size={14} /> Guardado</>
                        ) : (
                            <><Save size={14} /> Guardar</>
                        )}
                    </button>
                )}
            </div>
            <div className="p-5 space-y-4">{children}</div>
        </div>
    );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function TicketConfig() {
    const { ticketConfig, updateTicketConfig } = useStore();
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

    const handleSave = () => {
        updateTicketConfig(form);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto pb-48 md:pb-32">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <FileText size={20} className="text-primary" />
                        </div>
                        Configurar Ticket
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 ml-1">
                        Personaliza el encabezado y pie de página del recibo
                    </p>
                </div>
                <button
                    onClick={() => setShowPreview(p => !p)}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-all shrink-0"
                >
                    {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
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
                        
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <label className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                <span className="flex items-center gap-2"><Type size={14} /> Tamaño de Letra (Nombre)</span>
                                <span className="text-primary font-black bg-white px-2 py-0.5 rounded-lg shadow-sm">{form.businessNameSize || 13}px</span>
                            </label>
                            <input 
                                type="range" 
                                min="10" 
                                max="24" 
                                step="1"
                                value={form.businessNameSize || 13}
                                onChange={(e) => update('businessNameSize')(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between mt-1 px-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Chico</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Grande</span>
                            </div>
                        </div>
                        <Field
                            id="subtitle"
                            label="Subtítulo / Giro"
                            icon={AlignCenter}
                            value={form.subtitle}
                            onChange={update('subtitle')}
                            placeholder="Productos Lácteos"
                            maxLength={32}
                        />
                        <Field
                            id="address"
                            label="Dirección"
                            icon={MapPin}
                            value={form.address}
                            onChange={update('address')}
                            placeholder="Av. Principal #123, Col. Centro"
                            maxLength={38}
                        />
                        <Field
                            id="phone"
                            label="Teléfono / WhatsApp"
                            icon={Phone}
                            value={form.phone}
                            onChange={update('phone')}
                            placeholder="(618) 123-4567"
                            maxLength={20}
                        />
                    </Section>

                    {/* Campos Visibles */}
                    <Section title="Campos Visibles" icon={EyeIcon}>
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
                                label="Repartidor/Vendedor"
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
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <label className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                                    <span className="flex items-center gap-2"><Type size={14} /> Tamaño de Datos (Fecha, Ticket, etc.)</span>
                                    <span className="text-primary font-black bg-white px-2 py-0.5 rounded-lg shadow-sm">{form.metadataSize || 10}px</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="7" 
                                    max="14" 
                                    step="1"
                                    value={form.metadataSize || 10}
                                    onChange={(e) => update('metadataSize')(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                            
                            <Toggle
                                id="metadataUppercase"
                                label="Texto en Mayúsculas"
                                desc="Convierte automáticamente a mayúsculas la fecha, cliente y repartidor"
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
                                    <span className="text-primary font-black bg-white px-2 py-0.5 rounded-lg shadow-sm">{form.metadataSpacing || 0}px</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="20" 
                                    step="1"
                                    value={form.metadataSpacing || 0}
                                    onChange={(e) => update('metadataSpacing')(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between mt-1 px-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Pegado</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Separado</span>
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
                                    <span className={`font-black bg-white px-2 py-0.5 rounded-lg shadow-sm ${form.totalFontSize > 16 ? 'text-primary' : 'text-slate-500'}`}>
                                        {form.totalFontSize > 16 ? 'GRANDE' : 'NORMAL'} ({form.totalFontSize || 14}px)
                                    </span>
                                </label>
                                <input 
                                    type="range" 
                                    min="10" 
                                    max="24" 
                                    step="1"
                                    value={form.totalFontSize || 14}
                                    onChange={(e) => update('totalFontSize')(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">
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

                    {/* Líneas extra */}

                    <Section title="Líneas Adicionales del Encabezado" icon={AlignCenter}>
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2 text-xs text-blue-600">
                            <Info size={14} className="shrink-0 mt-0.5" />
                            <span>Estas líneas aparecen debajo del teléfono. Puedes dejarlas vacías.</span>
                        </div>
                        <Field
                            id="extraLine1"
                            label="Línea Extra 1"
                            value={form.extraLine1}
                            onChange={update('extraLine1')}
                            placeholder="RFC: XAXX010101000"
                            maxLength={38}
                        />
                        <Field
                            id="extraLine2"
                            label="Línea Extra 2"
                            value={form.extraLine2}
                            onChange={update('extraLine2')}
                            placeholder="Horario: Lun–Sab 7am–2pm"
                            maxLength={38}
                        />
                    </Section>

                    {/* Pie de página */}
                    <Section title="Pie de Página" icon={Settings2}>
                        <Field
                            id="footerLine1"
                            label="Mensaje de despedida 1"
                            value={form.footerLine1}
                            onChange={update('footerLine1')}
                            placeholder="¡Gracias por su compra!"
                            maxLength={38}
                        />
                        <Field
                            id="footerLine2"
                            label="Mensaje de despedida 2"
                            value={form.footerLine2}
                            onChange={update('footerLine2')}
                            placeholder="Visítenos de nuevo"
                            maxLength={38}
                        />
                        <div className="pt-2 space-y-3 border-t border-slate-100">
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
                                    className={`p-4 rounded-2xl border-2 text-left transition-all ${form.paperWidth === opt.value
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
                    <div className="pt-4 pb-8">
                        <button
                            onClick={handleSave}
                            className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest transition-all active:scale-[0.98] border-2 shadow-sm flex items-center justify-center gap-3 ${
                                saved 
                                ? 'bg-white border-emerald-500 text-emerald-500 shadow-emerald-500/10' 
                                : 'bg-white border-primary text-primary hover:bg-blue-50 shadow-blue-500/10'
                            }`}
                        >
                            {saved ? (
                                <><CheckCheck size={22} /> ¡CAMBIOS GUARDADOS!</>
                            ) : (
                                <><Save size={22} /> GUARDAR LOS CAMBIOS</>
                            )}
                        </button>
                        <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-4">
                            Toca para aplicar cambios en todos los tickets
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
