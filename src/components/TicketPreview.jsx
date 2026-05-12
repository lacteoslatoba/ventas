const Separator = ({ separatorStyle }) => (
    <div className={`border-t ${separatorStyle === 'dashed' ? 'border-dashed' : 'border-solid'} border-black my-1`} />
);

export default function TicketPreview({ config, sale, user, client }) {
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
        metadataAlignment = 'between',
        metadataSpacing = 0,
        multiLineItems = true,
        totalFontSize = 14,
        itemsHeaderLeft = 'CANT/CONCEPTO',
        itemsHeaderRight = 'IMPORTE',
        showLogo = true,
        logoUrl = null,
        // Nuevas
        businessNameBold = true,
        metadataBold = false,
        totalBold = true,
        itemsBold = false,
        showSubtotal = true,
        showSeparatorHeader = true,
        showSeparatorItems = true,
        showSeparatorFooter = true,
        separatorStyle = 'dashed',
        showSubtitle = true,
        subtotalAlignment = 'right',
        subtotalTotalSpacing = 0,
        showExtraLine1 = true,
        showExtraLine2 = true,
        showFooterLine1 = true,
        showFooterLine2 = true,
        footerFontSize = 9,
        footerBold = false,
        totalToFooterSpacing = 0,
        itemsSectionSpacing = 0,
        headerSpacing = 0,
        showPaymentMethod = true,
    } = config || {};


    const isPreviewOnly = !sale;
    
    const displaySale = sale || {
        id: 'PREVIEW',
        date: new Date().toISOString(),
        total: 165.00,
        paymentMethod: 'efectivo',
        items: [
            { name: 'QUESO OAXACA', quantity: 2, price: 60, unit: 'kg' },
            { name: 'REQUESON', quantity: 1, price: 45, unit: 'u' }
        ]
    };

    const displayUser = user || { name: 'Vendedor Prueba' };
    const displayClient = client || { name: 'Cliente Prueba' };

    const metaStyle = { 
        fontSize: `${metadataSize}px`, 
        textTransform: metadataUppercase ? 'uppercase' : 'none',
        fontWeight: metadataBold ? 'bold' : 'normal',
        marginTop: `${metadataSpacing}px`
    };

    const dateStr = new Date(displaySale.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    const timeStr = new Date(displaySale.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (ticketTemplate === 'latoba') {
        return (
            <div className={`bg-white ${isPreviewOnly ? 'border-2 border-dashed border-slate-200 rounded-2xl p-4' : 'p-2 shadow-2xl'} flex justify-center`}>
                <div
                    className="font-mono leading-snug text-black bg-white overflow-hidden"
                    style={{ 
                        width: '200px', 
                        minHeight: '300px', 
                        fontSize: `${useFontB ? 8.5 : 10}px`,
                        paddingTop: `${headerSpacing}px`
                    }}
                >
                    {showLogo && logoUrl && (
                        <div className="flex justify-center mb-2">
                            <img src={logoUrl} alt="Logo" className="max-w-[100px] max-h-[60px] object-contain grayscale" />
                        </div>
                    )}
                    {showBusinessName && (
                        <div className="text-center mb-0.5 leading-tight uppercase" style={{ fontSize: `${businessNameSize}px`, fontWeight: businessNameBold ? 'bold' : 'normal' }}>
                            {businessName || 'LACTEOS LA TOBA'}
                        </div>
                    )}
                    {showSubtitle && subtitle && <div className="text-center uppercase">{subtitle}</div>}
                    {showAddress && address && <div className="text-center uppercase">{address}</div>}
                    {showPhone && phone && <div className="text-center uppercase">TEL: {phone}</div>}
                    {showExtraLine1 && extraLine1 && <div className="text-center uppercase">{extraLine1}</div>}
                    {showExtraLine2 && extraLine2 && <div className="text-center uppercase">{extraLine2}</div>}

                    {showSeparatorHeader && <Separator separatorStyle={separatorStyle} />}

                    <div style={metaStyle} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}>
                        {showDate && <span>{showLabels ? 'FECHA: ' : ''}{dateStr}</span>}
                        {showTime && <span>{showLabels ? 'HORA: ' : ''}{timeStr}</span>}
                    </div>
                    <div style={metaStyle} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}>
                        <span>{showLabels ? 'Ticket' : ''}</span><span>#{displaySale.id.slice(-6).toUpperCase()}</span>
                    </div>
                    
                    {showCustomer && <div style={metaStyle} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}><span>{showLabels ? 'Cliente' : ''}</span><span className="uppercase text-right">{displayClient.name}</span></div>}
                    {showSeller && <div style={metaStyle} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}><span>{showLabels ? 'Repartidor' : ''}</span><span className="uppercase text-right">{displayUser.name}</span></div>}
                    {showPaymentMethod && <div style={metaStyle} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}><span>{showLabels ? 'Pago' : ''}</span><span className="uppercase text-right">{(displaySale.paymentMethod || 'efectivo') === 'transferencia' ? 'TRANSFERENCIA' : 'EFECTIVO'}</span></div>}

                    {showSeparatorItems && <Separator separatorStyle={separatorStyle} />}

                    {showItemsHeader && (
                        <>
                            <div className="flex justify-between uppercase font-bold"><span>{itemsHeaderLeft}</span><span>{itemsHeaderRight}</span></div>
                            <Separator separatorStyle={separatorStyle} />
                        </>
                    )}

                    <div style={{ fontWeight: itemsBold ? 'bold' : 'normal' }}>
                        {displaySale.items.map((item, idx) => (
                            multiLineItems ? (
                                <div key={idx} className={spaceBetweenItems ? 'mb-4' : 'mb-2'}>
                                    <div className="uppercase">{item.name}</div>
                                    <div className="flex justify-between uppercase text-[9px] text-slate-500">
                                        <span>{item.quantity} {item.unit || 'u'} x ${Number(item.price).toFixed(2)}</span>
                                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div key={idx} className={`flex justify-between uppercase ${spaceBetweenItems ? 'mb-3' : 'mb-1'}`}>
                                    <span>{item.quantity}{item.unit || 'u'} {item.name.slice(0, 12)}</span>
                                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            )
                        ))}
                    </div>

                    <div style={{ marginTop: `${itemsSectionSpacing}px` }} className="uppercase text-[9px] mt-1 opacity-70">ARTICULOS: {displaySale.items.length}</div>
                    
                    {showSubtotal && (
                        <div 
                            className={`mt-1 font-bold uppercase text-[9px] ${subtotalAlignment === 'between' ? 'flex justify-between' : `text-${subtotalAlignment}`}`}
                            style={{ marginBottom: `${subtotalTotalSpacing}px` }}
                        >
                            {subtotalAlignment === 'between' ? (
                                <><span>SUBTOTAL:</span><span>${displaySale.total.toFixed(2)}</span></>
                            ) : (
                                `SUBTOTAL: $${displaySale.total.toFixed(2)}`
                            )}
                        </div>
                    )}
                    
                    {showSeparatorFooter && <Separator separatorStyle={separatorStyle} />}

                    <div className={`${centerTotal ? 'text-center' : 'text-right'} leading-[1.2] mt-1 mb-1 uppercase`} style={{ fontSize: `${totalFontSize}px`, fontWeight: totalBold ? 'bold' : 'normal' }}>TOTAL ${displaySale.total.toFixed(2)}</div>

                    {showSeparatorFooter && <Separator separatorStyle={separatorStyle} />}

                    {showCashAndChange && (
                        <div className="text-[9px] opacity-70">
                            <div className="flex justify-between uppercase"><span>EFECTIVO:</span><span>${displaySale.total.toFixed(2)}</span></div>
                            <div className="flex justify-between uppercase"><span>CAMBIO:</span><span>$0.00</span></div>
                            <Separator separatorStyle={separatorStyle} />
                        </div>
                    )}

                    <div
                        className="text-center uppercase"
                        style={{ marginTop: `${(totalToFooterSpacing || 0) * 3 + 4}px`, fontSize: `${footerFontSize}px`, fontWeight: footerBold ? 'bold' : 'normal' }}
                    >
                        {showFooterLine1 && (footerLine1 || '¡GRACIAS POR SU COMPRA!')}
                    </div>
                    {showFooterLine2 && (footerLine2 || '') && (
                        <div className="text-center uppercase" style={{ fontSize: `${footerFontSize}px`, fontWeight: footerBold ? 'bold' : 'normal' }}>{footerLine2}</div>
                    )}
                    {showSignature && <div className="mt-4 uppercase border-t border-black/20 pt-1 text-center text-[8px]">FIRMA DEL CLIENTE</div>}
                </div>
            </div>
        );
    }

    const alignClass = titleAlignment === 'left' ? 'text-left' : titleAlignment === 'right' ? 'text-right' : 'text-center';
    
    return (
        <div className={`bg-white ${isPreviewOnly ? 'border-2 border-dashed border-slate-200 rounded-2xl p-4' : 'p-2 shadow-2xl'} flex justify-center`}>
            <div
                className="font-mono leading-snug text-black bg-white overflow-hidden"
                style={{ 
                    width: '200px', 
                    minHeight: '300px', 
                    fontSize: `${useFontB ? 8.5 : 10}px`,
                    paddingTop: `${headerSpacing}px`
                }}
            >
                {showLogo && logoUrl && (
                    <div className="flex justify-center mb-2">
                        <img src={logoUrl} alt="Logo" className="max-w-[100px] max-h-[60px] object-contain grayscale" />
                    </div>
                )}
                {showMainTitle && <div className="text-center font-bold text-[10px] mb-1">TICKET DE VENTA</div>}
                
                {showBusinessName && (
                    <div className={`${alignClass} mb-0.5 leading-tight`} style={{ fontSize: `${businessNameSize}px`, fontWeight: businessNameBold ? 'bold' : 'normal' }}>
                        {businessName || 'MI NEGOCIO'}
                    </div>
                )}
                {showSubtitle && subtitle && <div className={`${alignClass} opacity-80 text-[8px]`}>{subtitle}</div>}
                {showAddress && address && <div className={`${alignClass} text-[8px]`}>{address}</div>}
                {showPhone && phone && <div className={`${alignClass} text-[8px]`}>Tel: {phone}</div>}

                {showSeparatorHeader && <Separator separatorStyle={separatorStyle} />}

                <div>
                    <div style={metaStyle} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}>
                        <span>{showLabels ? 'Ticket :' : ''}</span> <span>#{displaySale.id.slice(-6).toUpperCase()}</span>
                    </div>
                    {showDate && (
                        <div style={metaStyle} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}>
                            <span>{showLabels ? 'Fecha  :' : ''}</span> <span>{new Date(displaySale.date).toLocaleDateString('es-MX')}</span>
                        </div>
                    )}
                    {showTime && (
                        <div style={metaStyle} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}>
                            <span>{showLabels ? 'Hora   :' : ''}</span> <span>{new Date(displaySale.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )}
                    {showSeller && (
                        <div style={metaStyle} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}>
                            <span>{showLabels ? 'Vendedor:' : ''}</span> <span className="uppercase">{displayUser.name}</span>
                        </div>
                    )}
                    {showCustomer && (
                        <div style={metaStyle} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}>
                            <span>{showLabels ? 'Cliente :' : ''}</span> <span className="uppercase">{displayClient.name}</span>
                        </div>
                    )}
                    {showPaymentMethod && (
                        <div style={metaStyle} className={metadataAlignment === 'between' ? 'flex justify-between' : `text-${metadataAlignment}`}>
                            <span>{showLabels ? 'Pago   :' : ''}</span> <span className="uppercase">{(displaySale.paymentMethod || 'efectivo') === 'transferencia' ? 'Transferencia' : 'Efectivo'}</span>
                        </div>
                    )}
                </div>

                {showSeparatorItems && <Separator separatorStyle={separatorStyle} />}

                {showItemsHeader && (
                    <>
                        <div className="flex justify-between font-bold uppercase"><span>{itemsHeaderLeft}</span><span>{itemsHeaderRight}</span></div>
                        <Separator separatorStyle={separatorStyle} />
                    </>
                )}

                <div style={{ fontWeight: itemsBold ? 'bold' : 'normal' }}>
                    {displaySale.items.map((item, idx) => (
                        multiLineItems ? (
                            <div key={idx}>
                                <div>{item.name.toUpperCase()}</div>
                                <div className={`flex justify-between text-[9px] opacity-70 ${spaceBetweenItems ? 'mb-3' : 'mb-1'}`}>
                                    <span>{item.quantity}x @ ${Number(item.price).toFixed(2)}</span>
                                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            </div>
                        ) : (
                            <div key={idx} className={`flex justify-between ${spaceBetweenItems ? 'mb-2' : ''}`}>
                                <span>{item.quantity}x {item.name.toUpperCase()}</span>
                                <span>${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        )
                    ))}
                </div>

                <div style={{ marginTop: `${itemsSectionSpacing}px` }} />

                {showSeparatorFooter && <Separator separatorStyle={separatorStyle} />}

                {showSubtotal && (
                    <div 
                        className={`text-[9px] opacity-70 uppercase ${subtotalAlignment === 'between' ? 'flex justify-between' : `text-${subtotalAlignment}`}`}
                        style={{ marginBottom: `${subtotalTotalSpacing}px` }}
                    >
                        {subtotalAlignment === 'between' ? (
                            <><span>SUBTOTAL:</span><span>${displaySale.total.toFixed(2)}</span></>
                        ) : (
                            `SUBTOTAL $${displaySale.total.toFixed(2)}`
                        )}
                    </div>
                )}
                <div className={`${centerTotal ? 'text-center' : 'text-right'} leading-[1.2] uppercase`} style={{ fontSize: `${totalFontSize}px`, fontWeight: totalBold ? 'bold' : 'normal' }}>TOTAL ${displaySale.total.toFixed(2)}</div>
                
                {showSeparatorFooter && <Separator separatorStyle={separatorStyle} />}

                {showCashAndChange && (
                    <div className="text-[8px] opacity-70">
                        <div className="flex justify-between"><span>Efectivo:</span><span>${displaySale.total.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Cambio:</span><span>$0.00</span></div>
                        <Separator separatorStyle={separatorStyle} />
                    </div>
                )}

                <div
                    className="text-center"
                    style={{ marginTop: `${(totalToFooterSpacing || 0) * 3 + 4}px`, fontSize: `${footerFontSize}px`, fontWeight: footerBold ? 'bold' : 'normal' }}
                >
                    {showFooterLine1 && (footerLine1 || '¡Gracias por su compra!')}
                </div>
                {showFooterLine2 && (footerLine2 || '') && (
                    <div className="text-center" style={{ fontSize: `${footerFontSize}px`, fontWeight: footerBold ? 'bold' : 'normal' }}>{footerLine2}</div>
                )}
                {showSignature && (
                    <div className="mt-4 text-[8px] border-t border-black/20 pt-1 text-center">Firma: ________________________</div>
                )}
            </div>
        </div>
    );
}
