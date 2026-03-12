import React, { useState } from 'react';
import { useStore } from '../store';
import {
    Settings2, Save, RotateCcw, FileText, Building2, Phone,
    MapPin, AlignCenter, CheckCheck, Printer, Eye, EyeOff,
    ChevronRight, Info, AlignLeft, AlignRight, Type, Calendar, User, Eye as EyeIcon, ArrowLeft
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
    } = config;

    const alignClass = titleAlignment === 'left' ? 'text-left' : titleAlignment === 'right' ? 'text-right' : 'text-center';
    const fontClass = useFontB ? 'text-[8.5px]' : 'text-[10px]';

    if (ticketTemplate === 'latoba') {
        const dateStr = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        const timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        return (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4 flex justify-center">
                <div
                    className={`font-mono leading-snug text-black bg-white ${fontClass} uppercase`}
                    style={{ width: '200px', minHeight: '300px' }}
                >
                    <div className="text-center font-bold text-[13px] mb-0.5 leading-tight">
                        {businessName || 'LACTEOS LA TOBA'}
                    </div>
                    {subtitle && <div className="text-center">{subtitle}</div>}
                    {showAddress && address && <div className="text-center">{address}</div>}
                    {showPhone && phone && <div className="text-center">TEL: {phone}</div>}

                    <div className="border-t border-dashed border-black my-1" />

                    <div className="flex justify-between">
                        {showDate && <span>{dateStr}</span>}
                        {showTime && <span>{timeStr}</span>}
                    </div>
                    <div className="flex justify-between">
                        <span>NUMERO DE TICKET</span><span>#A1B2C3</span>
                    </div>
                    
                    {showCustomer && <div className="flex justify-between"><span>CLIENTE</span><span>TIENDA LA FE</span></div>}
                    {showSeller && <div className="flex justify-between"><span>CAJERO</span><span>JUAN PEREZ</span></div>}

                    {showItemsHeader && (
                        <>
                            <div className="border-t border-dashed border-black my-1" />
                            <div className="flex justify-between"><span>ITEM</span><span>PRECIO</span></div>
                            <div className="border-t border-dashed border-black my-1" />
                        </>
                    )}

                    <div className={spaceBetweenItems ? 'mb-4' : 'mb-2'}>
                        <div>QUESO OAXACA</div>
                        <div className="flex justify-between"><span>2 kg x $60.00/kg</span><span>$120.00</span></div>
                    </div>
                    <div className={spaceBetweenItems ? 'mb-4' : 'mb-2'}>
                        <div>REQUESON</div>
                        <div className="flex justify-between"><span>1 x $45.00/u</span><span>$45.00</span></div>
                    </div>

                    <div>NUMERO DE ARTICULOS: 2</div>
                    
                    <div className="text-right mt-2 font-bold">SUBTOTAL: $165.00</div>
                    <div className="text-center font-bold text-[14px] leading-[14px] mt-2 mb-1">TOTAL $165.00</div>

                    {showCashAndChange && (
                        <>
                            <div className="border-t border-dashed border-black my-1" />
                            <div className="flex justify-between"><span>EFECTIVO:</span><span>$165.00</span></div>
                            <div className="flex justify-between"><span>CAMBIO:</span><span>$0.00</span></div>
                        </>
                    )}
                    <div className="border-t border-dashed border-black my-1" />

                    <div className="text-center mt-2">{footerLine1 || '¡GRACIAS POR SU COMPRA!'}</div>
                    {footerLine2 && <div className="text-center">{footerLine2}</div>}
                    {showSignature && <div className="mt-3">FIRMA: ________________________</div>}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4 flex justify-center">
            <div
                className={`font-mono leading-snug text-black bg-white ${fontClass}`}
                style={{ width: '200px', minHeight: '300px' }}
            >
                {/* Encabezado */}
                <div className={`${alignClass} font-bold text-[13px] mb-0.5 leading-tight`}>
                    {businessName || 'MI NEGOCIO'}
                </div>
                {subtitle && <div className={`${alignClass} ${useFontB ? 'text-[7px]' : 'text-[9px]'}`}>{subtitle}</div>}
                {showAddress && address && <div className={alignClass}>{address}</div>}
                {showPhone && phone && <div className={alignClass}>Tel: {phone}</div>}
                {extraLine1 && <div className="text-center">{extraLine1}</div>}
                {extraLine2 && <div className="text-center">{extraLine2}</div>}

                <div className="border-t border-dashed border-black my-1" />

                {/* Info ticket */}
                <div>Ticket : #A1B2C3</div>
                {showDate && <div>Fecha  : {new Date().toLocaleDateString('es-MX')}</div>}
                {showTime && <div>Hora   : {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>}

                <div className="border-t border-dashed border-black my-1" />
                
                {(showSeller || showCustomer) && (
                    <>
                        {showSeller && <div>Repartidor: Juan Pérez</div>}
                        {showCustomer && <div>Cliente   : Tienda La Fe</div>}
                        <div className="border-t border-dashed border-black my-1" />
                    </>
                )}


                {showItemsHeader && (
                    <>
                        <div className="font-bold">CANT  CONCEPTO    IMPORTE</div>
                        <div className="border-t border-dashed border-black my-0.5" />
                    </>
                )}
                <div>2x    Queso Oax.  $120.00</div>
                <div className={`text-right text-[9px] ${spaceBetweenItems ? 'mb-3' : ''}`}>@ $60.00/u</div>
                <div>1x    Requesón    $45.00</div>
                <div className={`text-right text-[9px] ${spaceBetweenItems ? 'mb-3' : ''}`}>@ $45.00/u</div>
                <div className="border-t-2 border-black my-0.5" />
                <div className="text-right font-bold text-[12px]">TOTAL $165.00</div>
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
    const [form, setForm] = useState({ ...ticketConfig });
    const [saved, setSaved] = useState(false);
    const [showPreview, setShowPreview] = useState(true);

    const update = (field) => (value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSave = () => {
        updateTicketConfig(form);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleReset = () => {
        const defaults = {
            businessName: 'QUESOS EL BUEN SABOR',
            subtitle: '',
            address: '',
            phone: '',
            extraLine1: '',
            extraLine2: '',
            footerLine1: '¡Gracias por su compra!',
            footerLine2: '',
            showSignature: true,
            paperWidth: 58,
            titleAlignment: 'center',
            showAddress: true,
            showPhone: true,
            showDate: true,
            showTime: true,
            showSeller: true,
            showCustomer: true,
            useFontB: false,
            ticketTemplate: 'standard',
            showItemsHeader: true,
            printCopy: false,
            spaceBetweenItems: false,
            showCashAndChange: true,
        };

        setForm(defaults);
    };

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto pb-48 md:pb-32">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <button onClick={() => window.history.back()} className="md:hidden p-2 -ml-2 text-primary hover:bg-slate-100 rounded-xl transition-colors">
                            <ArrowLeft size={24} />
                        </button>
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
                    <Section title="Estilo Base del Ticket" icon={FileText} onSave={handleSave} saved={saved}>
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
                                id="showItemsHeader"
                                label="Encabezado ITEM / PRECIO"
                                checked={form.showItemsHeader}
                                onChange={update('showItemsHeader')}
                                desc="Muestra u oculta los títulos ITEM y PRECIO arriba de los productos"
                            />
                            <Toggle
                                id="showCashAndChange"
                                label="Efectivo y Cambio"
                                checked={form.showCashAndChange}
                                onChange={update('showCashAndChange')}
                                desc="Muestra u oculta un desglose del pago en efectivo y el cambio"
                            />
                        </div>
                    </Section>

                    {/* Diseño y Apariencia */}
                    <Section title="Diseño y Apariencia" icon={Type}>
                        <div className="space-y-6">
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

            {/* Barra de acciones fija - Elevada para que no tape el menú móvil (z-index mayor y más bottom) */}
            <div className="fixed bottom-[80px] md:bottom-0 left-0 right-0 md:left-64 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 flex gap-3 z-[45] shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all active:scale-95 text-sm"
                >
                    <RotateCcw size={16} />
                    Restablecer
                </button>
                <button
                    onClick={handleSave}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 font-bold rounded-xl transition-all active:scale-95 text-sm shadow-lg ${saved
                        ? 'bg-emerald-500 text-white shadow-emerald-500/25'
                        : 'bg-primary hover:bg-blue-700 text-white shadow-blue-500/25'
                        }`}
                >
                    {saved ? (
                        <><CheckCheck size={18} /> Guardado</>
                    ) : (
                        <><Save size={18} /> Guardar Configuración</>
                    )}
                </button>
            </div>
        </div>
    );
}
