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

    // ============================================
    // DETECTAR SESIÓN AL INICIAR Y REDIRIGIR SEGÚN ROL
    // ============================================
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const slugCliente = params.get('s');
        const esEntradaClienteMaster = Boolean(slugCliente && slugCliente.trim());
        const adminAuth = localStorage.getItem('adminAuth') === 'true';
        const profesionalAuth = localStorage.getItem('profesionalAuth');
        const clienteAuth = localStorage.getItem('clienteAuth');
        
        if (!esEntradaClienteMaster && adminAuth) {
            console.log('👑 Usuario admin detectado, redirigiendo a admin.html');
            window.location.href = 'admin.html';
            return;
        }
        
        if (!esEntradaClienteMaster && profesionalAuth) {
            console.log('👤 Usuario profesional detectado, redirigiendo a admin.html');
            window.location.href = 'admin.html';
            return;
        }
        
        // Anclar el primer paso en el historial del navegador para que el
        // botón atrás del teléfono navegue entre pasos en vez de salir de la app.
        if (clienteAuth) {
            try {
                const clienteData = JSON.parse(clienteAuth);
                setCliente(clienteData);
                setUserRol('cliente');
                // Deep link del acceso directo del ícono (manifest shortcuts):
                // ?ir=citas abre directo Mis Citas si ya hay sesión.
                const irCitas = params.get('ir') === 'citas';
                setStep(irCitas ? 'mybookings' : 'welcome');
                setHistory(irCitas ? ['auth', 'welcome', 'mybookings'] : ['auth', 'welcome']);
                try {
                    window.history.replaceState({ step: 'auth' }, '');
                    window.history.pushState({ step: 'welcome' }, '');
                    if (irCitas) window.history.pushState({ step: 'mybookings' }, '');
                } catch (e) {}
                return;
            } catch (e) {
                console.error('Error al parsear clienteAuth', e);
                localStorage.removeItem('clienteAuth');
            }
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
        const clienteData = { nombre, whatsapp };
        setCliente(clienteData);
        setUserRol('cliente');
        localStorage.setItem('clienteAuth', JSON.stringify(clienteData));
        navigateTo('welcome');
    };

    const handleStartBooking = () => {
        navigateTo('service');
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
        localStorage.removeItem('clienteAuth');
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
