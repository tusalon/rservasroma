// client-app.js - Aplicación de clientes con flujo completo y PWA
// MEJORA: Redirección automática según rol al iniciar

console.log('🚀 CLIENT-APP.JS VERSIÓN:', '2024-03-01');

window.addEventListener('error', function(e) {
    // Errores de recursos (img/script) no traen message: ignorarlos aquí.
    if (!e || !e.message) return;
    console.error('❌ Error detectado, posible versión antigua:', e.message);

    if (e.message.includes('Failed to load') || e.message.includes('Unexpected token')) {
        // Tope de recargas: en conexiones lentas el mismo error puede repetirse
        // al recargar, y sin límite la app queda en un loop infinito quemando datos.
        let intentosRecarga = 0;
        try { intentosRecarga = parseInt(sessionStorage.getItem('recargasPorError') || '0', 10) || 0; } catch (err) {}
        if (intentosRecarga >= 2) {
            console.warn('🔁 Límite de recargas por error alcanzado; no se recarga más.');
            return;
        }
        try { sessionStorage.setItem('recargasPorError', String(intentosRecarga + 1)); } catch (err) {}

        console.log('🔄 Forzando recarga por posible versión antigua...');

        if (window.swRegistration) {
            window.swRegistration.unregister().then(() => {
                window.location.reload();
            });
        } else {
            window.location.reload();
        }
    }
});

// Si la app sobrevive 15s sin recargarse, se considera sana y se libera el tope.
setTimeout(function() {
    try { sessionStorage.removeItem('recargasPorError'); } catch (err) {}
}, 15000);

function getClienteAuthScope() {
    const slugUrl = new URLSearchParams(window.location.search).get('s');
    const slug = window._rservasSlugActual || slugUrl || localStorage.getItem('negocioSlug') || '';
    if (slug) return `slug:${String(slug).toLowerCase().trim()}`;
    const negocioId = window.getNegocioId?.() || window.NEGOCIO_ID_POR_DEFECTO || '';
    return negocioId ? `id:${negocioId}` : '';
}

function getClienteAuthStorageKey() {
    const scope = getClienteAuthScope();
    return scope ? `clienteAuth:${scope}` : 'clienteAuth';
}

window.getClienteAuthActual = function() {
    const scope = getClienteAuthScope();
    const scopedKey = getClienteAuthStorageKey();
    const scoped = localStorage.getItem(scopedKey);
    if (scoped) return JSON.parse(scoped);

    const legacy = localStorage.getItem('clienteAuth');
    if (!legacy) return null;
    const cliente = JSON.parse(legacy);
    if (cliente?.negocio_scope && cliente.negocio_scope !== scope) return null;

    if (scope) {
        const migrado = { ...cliente, negocio_scope: scope };
        localStorage.setItem(scopedKey, JSON.stringify(migrado));
        localStorage.setItem('clienteAuth', JSON.stringify(migrado));
        return migrado;
    }
    return cliente;
};

window.guardarClienteAuthActual = function(cliente) {
    const scope = getClienteAuthScope();
    const scoped = { ...cliente, negocio_scope: scope || undefined };
    localStorage.setItem(getClienteAuthStorageKey(), JSON.stringify(scoped));
    localStorage.setItem('clienteAuth', JSON.stringify(scoped));
    return scoped;
};

window.borrarClienteAuthActual = function() {
    const scope = getClienteAuthScope();
    localStorage.removeItem(getClienteAuthStorageKey());
    try {
        const legacy = JSON.parse(localStorage.getItem('clienteAuth') || 'null');
        if (!legacy?.negocio_scope || legacy.negocio_scope === scope) {
            localStorage.removeItem('clienteAuth');
        }
    } catch (error) {
        localStorage.removeItem('clienteAuth');
    }
};

function ClientApp() {
    const [step, setStep] = React.useState('auth');
    const [cliente, setCliente] = React.useState(null);
    const [selectedService, setSelectedService] = React.useState(null);
    const [selectedProfesional, setSelectedProfesional] = React.useState(null);
    const [selectedDate, setSelectedDate] = React.useState('');
    const [selectedTime, setSelectedTime] = React.useState('');
    const [bookingConfirmed, setBookingConfirmed] = React.useState(null);
    const [userRol, setUserRol] = React.useState('cliente');
    const [history, setHistory] = React.useState(['auth']);
    const [horariosPorDia, setHorariosPorDia] = React.useState({});
    // Diseño del catálogo que eligió la clienta (si vino por ahí). Viaja hasta
    // la reserva para que el salón sepa exactamente qué trabajo se pidió.
    const [disenoElegido, setDisenoElegido] = React.useState(null);

    // ============================================
    // DETECTAR SESIÓN AL INICIAR Y REDIRIGIR SEGÚN ROL
    // ============================================
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const slugCliente = params.get('s');
        const esEntradaClienteMaster = Boolean(slugCliente && slugCliente.trim());
        const adminAuth = localStorage.getItem('adminAuth') === 'true';
        const profesionalAuth = localStorage.getItem('profesionalAuth');
        const clienteAuth = window.getClienteAuthActual?.();
        
        if (!esEntradaClienteMaster && adminAuth) {
            console.log('👑 Usuario admin detectado, redirigiendo a admin.html');
            window.location.href = window.construirRutaConSlug('admin.html');
            return;
        }
        
        if (!esEntradaClienteMaster && profesionalAuth) {
            console.log('👤 Usuario profesional detectado, redirigiendo a admin.html');
            window.location.href = window.construirRutaConSlug('admin.html');
            return;
        }
        
        // Anclar el primer paso en el historial del navegador para que el
        // botón atrás del teléfono navegue entre pasos en vez de salir de la app.
        if (clienteAuth) {
            try {
                const clienteData = clienteAuth;
                setCliente(clienteData);
                setUserRol('cliente');
                // Deep links: ?ir=citas es el acceso directo del ícono (manifest
                // shortcuts) y ?ir=catalogo el enlace que comparte el salón.
                const ir = params.get('ir');
                const destino = ir === 'citas' ? 'mybookings' : (ir === 'catalogo' ? 'catalogo' : null);
                setStep(destino || 'welcome');
                setHistory(destino ? ['auth', 'welcome', destino] : ['auth', 'welcome']);
                try {
                    window.history.replaceState({ step: 'auth' }, '');
                    window.history.pushState({ step: 'welcome' }, '');
                    if (destino) window.history.pushState({ step: destino }, '');
                } catch (e) {}
                return;
            } catch (e) {
                console.error('Error al parsear clienteAuth', e);
                window.borrarClienteAuthActual?.();
            }
        }
        // Sin sesión, el enlace compartido del catálogo abre igualmente la
        // galería: es material de captación y pedir nombre y WhatsApp antes de
        // ver una sola foto espantaría a la clienta nueva. El acceso se pide
        // solo cuando toca "Reservar este diseño".
        if (params.get('ir') === 'catalogo') {
            setStep('catalogo');
            setHistory(['auth', 'catalogo']);
            try {
                window.history.replaceState({ step: 'auth' }, '');
                window.history.pushState({ step: 'catalogo' }, '');
            } catch (e) {}
            return;
        }

        try { window.history.replaceState({ step: 'auth' }, ''); } catch (e) {}
    }, []);

    // ============================================
    // MANEJO DEL BOTÓN FÍSICO "ATRÁS"
    // Cada navigateTo hace pushState, así el atrás físico dispara popstate
    // y retrocede un paso dentro de la app. En el primer paso ya no quedan
    // entradas propias y el navegador sale normalmente.
    // ============================================
    React.useEffect(() => {
        const handlePopState = (event) => {
            const pasoAnterior = event.state && event.state.step;
            if (!pasoAnterior) return;
            setStep(pasoAnterior);
            setHistory(prev => {
                const idx = prev.lastIndexOf(pasoAnterior);
                return idx >= 0 ? prev.slice(0, idx + 1) : [pasoAnterior];
            });
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // ============================================
    // FUNCIONES DE NAVEGACIÓN
    // ============================================
    const navigateTo = (newStep) => {
        setHistory(prev => [...prev, newStep]);
        setStep(newStep);
        try { window.history.pushState({ step: newStep }, ''); } catch (e) {}
    };

    const goBack = () => {
        if (history.length <= 1) return;
        // popstate sincroniza step e history internos.
        window.history.back();
    };

    // ============================================
    // FUNCIONES DE SCROLL AUTOMÁTICO
    // ============================================
    React.useEffect(() => {
        if (selectedService) {
            setTimeout(() => {
                document.getElementById('profesional-section')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 300);
        }
    }, [selectedService]);

    React.useEffect(() => {
        if (selectedProfesional) {
            setTimeout(() => {
                document.getElementById('calendar-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [selectedProfesional]);

    React.useEffect(() => {
        if (selectedDate) {
            setTimeout(() => {
                document.getElementById('time-section')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }, [selectedDate]);

    // ============================================
    // MANEJO DE ACCESO
    // ============================================
    const handleAccessGranted = (nombre, whatsapp) => {
        const clienteData = window.guardarClienteAuthActual({ nombre, whatsapp });
        setCliente(clienteData);
        setUserRol('cliente');
        // Venía de "Reservar este diseño" en el catálogo público: retomar ahí.
        if (disenoElegido) {
            navigateTo('service');
            preseleccionarServicioDeDiseno(disenoElegido);
            return;
        }
        navigateTo('welcome');
    };

    const handleStartBooking = () => {
        setDisenoElegido(null);
        navigateTo('service');
    };

    const handleVerCatalogo = () => {
        navigateTo('catalogo');
    };

    // Del catálogo directo a reservar: si el diseño tiene servicio vinculado se
    // preselecciona para que la clienta caiga ya en el paso del profesional.
    const handleReservarDiseno = async (diseno) => {
        setDisenoElegido(diseno);

        // Si llegó por el enlace compartido y todavía no tiene sesión, se le
        // pide el acceso aquí y handleAccessGranted la devuelve al diseño.
        if (!cliente) {
            navigateTo('auth');
            return;
        }

        navigateTo('service');
        preseleccionarServicioDeDiseno(diseno);
    };

    const preseleccionarServicioDeDiseno = async (diseno) => {
        if (!diseno?.servicio_id) return;
        try {
            const servicios = await window.salonServicios?.getAll?.(true);
            const servicio = (servicios || []).find(s => String(s.id) === String(diseno.servicio_id));
            if (servicio) await handleServiceSelect(servicio);
        } catch (e) {
            console.error('No se pudo preseleccionar el servicio del diseño:', e);
        }
    };

    const handleServiceSelect = async (service) => {
        setSelectedService(service);
        setSelectedProfesional(null);
        setSelectedDate('');
        setSelectedTime('');
        setHorariosPorDia({});

        // Si solo hay 1 profesional activo QUE REALICE este servicio, auto-seleccionarlo
        // y saltar al calendario. Antes no se validaba el servicio y el selector lo
        // anulaba un instante después (flash del calendario). Los combos no se
        // auto-seleccionan: MultiProfesionalSelector arma sus propias asignaciones.
        try {
            if (!service?.esMultiple) {
                const profesionales = await window.salonProfesionales?.getAll?.();
                let candidatos = (profesionales || []).filter(p => p.activo !== false);

                if (window.getProfesionalesPorServicio && service?.id) {
                    const asignados = await window.getProfesionalesPorServicio(service.id);
                    const idsAsignados = (asignados || []).map(p => p.id);
                    if (idsAsignados.length > 0) {
                        candidatos = candidatos.filter(p => idsAsignados.includes(p.id));
                    }
                }

                if (candidatos.length === 1) {
                    setSelectedProfesional(candidatos[0]);
                    setTimeout(() => {
                        document.getElementById('calendar-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 150);
                    return;
                }
            }
        } catch (e) {
            console.error('Error auto-seleccionando profesional:', e);
        }

        setTimeout(() => {
            document.getElementById('profesional-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
    };

    const handleNoAvailability = React.useCallback(() => {
        setSelectedDate('');
        setSelectedTime('');
    }, []);

    const handleLogout = () => {
        if (!confirm(window.t('¿Cerrar tu sesión?'))) return;
        window.borrarClienteAuthActual?.();
        setCliente(null);
        setSelectedService(null);
        setSelectedProfesional(null);
        setSelectedDate('');
        setSelectedTime('');
        setUserRol('cliente');
        setHistory(['auth']);
        setStep('auth');
        // Conservar ?s=slug: sin él, index.html manda al login de ADMIN.
        window.location.href = 'index.html' + window.location.search;
    };

    const resetBooking = () => {
        setDisenoElegido(null);
        setSelectedService(null);
        setSelectedProfesional(null);
        setSelectedDate('');
        setSelectedTime('');
        setStep('service');
        setBookingConfirmed(null);
    };

    const goToMyBookings = () => {
        navigateTo('mybookings');
    };

    const handleVolverDeMyBookings = () => {
        goBack();
    };

    // ============================================
    // RENDERIZADO DE PANTALLAS
    // ============================================
    const renderStep = () => {
        switch(step) {
            case 'auth':
                return (
                    <ClientAuthScreen 
                        onAccessGranted={handleAccessGranted}
                        onGoBack={history.length > 1 ? goBack : null}
                    />
                );
            
            case 'welcome':
                return (
                    <WelcomeScreen
                        onStart={handleStartBooking}
                        onGoBack={goBack}
                        cliente={cliente}
                        userRol={userRol}
                        onMisReservas={goToMyBookings}
                        onCatalogo={handleVerCatalogo}
                    />
                );

            case 'catalogo':
                return (
                    <Catalogo
                        cliente={cliente}
                        onGoBack={goBack}
                        onReservarDiseno={handleReservarDiseno}
                    />
                );

            case 'mybookings':
                return (
                    <MyBookings 
                        cliente={cliente} 
                        onVolver={handleVolverDeMyBookings}
                    />
                );
            
            case 'service':
                return (
                    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-pink-100">
                        <Header 
                            cliente={cliente} 
                            onLogout={handleLogout}
                            onMisReservas={goToMyBookings}
                            onGoBack={goBack}
                            userRol={userRol}
                            showBackButton={true}
                        />
                        
                        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4 pb-20">
                            {/* Diseño traído del catálogo: se muestra durante todo
                                el flujo para que la clienta no dude de que reserva
                                el trabajo que eligió. */}
                            {disenoElegido && (
                                <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm p-3">
                                    <img
                                        src={window.urlImagenCloudinary(disenoElegido.imagen_url, 120)}
                                        alt={disenoElegido.titulo}
                                        className="w-14 h-14 rounded-xl object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-pink-500 font-medium">{window.t('Diseño elegido')}</p>
                                        <p className="text-sm font-bold text-gray-800 truncate">{disenoElegido.titulo}</p>
                                    </div>
                                    <button onClick={() => setDisenoElegido(null)}
                                        className="text-gray-400 text-sm px-2">✕</button>
                                </div>
                            )}

                            {/* SECCIÓN 1: SERVICIOS */}
                            <ServiceSelection 
                                onSelect={handleServiceSelect} 
                                selectedService={selectedService}
                            />
                            
                            {/* SECCIÓN 2: PROFESIONALES - CON selectedService */}
                            {selectedService && (
                                <div id="profesional-section">
                                    {selectedService.esMultiple ? (
                                        <MultiProfesionalSelector
                                            onSelect={setSelectedProfesional}
                                            selectedProfesional={selectedProfesional}
                                            selectedService={selectedService}
                                        />
                                    ) : (
                                        <ProfesionalSelector
                                            onSelect={setSelectedProfesional}
                                            selectedProfesional={selectedProfesional}
                                            selectedService={selectedService}
                                        />
                                    )}
                                </div>
                            )}
                            
                            {/* SECCIÓN 3: CALENDARIO */}
                            {selectedProfesional && (
                                <div id="calendar-section">
                                    <Calendar 
                                        onDateSelect={setSelectedDate} 
                                        selectedDate={selectedDate}
                                        profesional={selectedProfesional?.esMultiple ? selectedProfesional.asignaciones[0]?.profesional : selectedProfesional}
                                        profesionalCompleto={selectedProfesional}
                                        service={selectedService}
                                        onHorariosCargados={setHorariosPorDia}
                                    />
                                </div>
                            )}
                            
                            {/* SECCIÓN 4: HORARIOS */}
                            {selectedDate && (
                                <div id="time-section">
                                    {selectedService.esMultiple ? (
                                        <MultiTimeSlots
                                            service={selectedService}
                                            date={selectedDate}
                                            profesional={selectedProfesional}
                                            onTimeSelect={setSelectedTime}
                                            selectedTime={selectedTime}
                                            onNoAvailability={handleNoAvailability}
                                        />
                                    ) : (
                                        <TimeSlots
                                            service={selectedService}
                                            date={selectedDate}
                                            profesional={selectedProfesional}
                                            cliente={cliente}
                                            onTimeSelect={setSelectedTime}
                                            selectedTime={selectedTime}
                                            horariosPorDia={horariosPorDia}
                                        />
                                    )}
                                </div>
                            )}
                            
                            {/* SECCIÓN 5: CONFIRMACIÓN */}
                            {selectedTime && (
                                <BookingForm
                                    service={selectedService}
                                    diseno={disenoElegido}
                                    profesional={selectedProfesional}
                                    date={selectedDate}
                                    time={selectedTime}
                                    cliente={cliente}
                                    onSubmit={(booking) => {
                                        setBookingConfirmed(booking);
                                        // Recordar el último servicio reservado (por negocio)
                                        // para ofrecer el atajo "Repetir tu último turno".
                                        try {
                                            const negocioId = window.getNegocioId?.() || '';
                                            if (negocioId && booking?.servicio) {
                                                localStorage.setItem('ultimoServicio:' + negocioId, booking.servicio);
                                            }
                                        } catch (e) {}
                                        // Limpiar la selección: si vuelve atrás desde la
                                        // confirmación, el formulario no debe reaparecer
                                        // relleno (riesgo de reservar duplicado).
                                        setSelectedTime('');
                                        setSelectedDate('');
                                        navigateTo('confirmation');
                                    }}
                                    onCancel={() => setSelectedTime('')}
                                />
                            )}
                            
                            {/* WhatsApp Button */}
                            <WhatsAppButton />
                        </div>
                    </div>
                );
            
            case 'confirmation':
                return (
                    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-pink-100">
                        <Header 
                            cliente={cliente} 
                            onLogout={handleLogout}
                            onGoBack={goBack}
                            userRol={userRol}
                            showBackButton={true}
                        />
                        <Confirmation 
                            booking={bookingConfirmed} 
                            onReset={resetBooking}
                        />
                    </div>
                );
            
            default:
                return null;
        }
    };

    return renderStep();
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ClientApp />);
