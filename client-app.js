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

// Tarjeta para las clientas que ya estaban registradas y aun no dijeron su
// cumpleaños. Solo sale si ese salon tiene la bonificacion activa (si no, no
// hay nada que ofrecerles a cambio) y se puede aplazar 30 dias. Si las columnas
// aun no existen (falta sql-cumpleanos.sql) las consultas fallan y no sale nada.
function CumpleClienteCard({ cliente }) {
    const t = window.t;
    const [estado, setEstado] = React.useState('oculta'); // oculta | pregunta | listo
    const [bono, setBono] = React.useState(null);
    const [salon, setSalon] = React.useState('');
    const [dia, setDia] = React.useState('');
    const [mes, setMes] = React.useState('');
    const [error, setError] = React.useState('');
    const [guardando, setGuardando] = React.useState(false);
    const whatsapp = cliente?.whatsapp;
    const negocioId = window.getNegocioId?.();
    const claveAplazo = `cumpleClienteAplazadoHasta:${negocioId}:${whatsapp}`;

    React.useEffect(() => {
        if (!whatsapp || !negocioId || !window.cumpleanos) return;
        try {
            if (Date.now() < (Number(localStorage.getItem(claveAplazo)) || 0)) return;
        } catch (e) {}
        let cancelado = false;
        const headers = { apikey: window.SUPABASE_ANON_KEY, Authorization: `Bearer ${window.SUPABASE_ANON_KEY}` };
        (async () => {
            try {
                const [rn, rc] = await Promise.all([
                    fetch(`${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${encodeURIComponent(negocioId)}&select=nombre,cumple_bonificacion_activa,cumple_bonificacion_tipo,cumple_bonificacion_valor,cumple_bonificacion_regalo,cumple_bonificacion_ventana`, { headers }),
                    fetch(`${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${encodeURIComponent(negocioId)}&whatsapp=eq.${encodeURIComponent(whatsapp)}&select=cumple_dia,cumple_mes`, { headers })
                ]);
                if (!rn.ok || !rc.ok) return;
                const negocio = (await rn.json())[0];
                const fila = (await rc.json())[0];
                if (cancelado || !negocio || !fila) return;
                const config = window.cumpleanos.bonificacionConfig(negocio);
                if (window.cumpleanos.cumpleDe(fila, 'cumple_dia', 'cumple_mes')) return;
                setBono(config);
                setSalon(negocio.nombre || '');
                setEstado('pregunta');
            } catch (e) {
                console.warn('No se pudo preparar la tarjeta de cumpleaños:', e);
            }
        })();
        return () => { cancelado = true; };
    }, [whatsapp, negocioId]);

    if (estado === 'oculta' || !bono) return null;

    const aplazar = () => {
        try { localStorage.setItem(claveAplazo, String(Date.now() + 7 * 86400000)); } catch (e) {}
        setEstado('oculta');
    };
    const guardar = async () => {
        const cumple = window.cumpleanos.normalizarCumple(dia, mes);
        if (!dia || !mes) return setError(t('Elige el día y el mes.'));
        if (!cumple) return setError(t('Esa fecha no existe.'));
        setGuardando(true);
        setError('');
        let ok = false;
        try {
            ok = await window.guardarCumpleCliente(whatsapp, cumple);
        } catch (e) {
            console.warn('No se pudo guardar el cumpleaños:', e);
        }
        setGuardando(false);
        if (!ok) return setError(t('No se pudo guardar. Inténtalo de nuevo.'));
        setEstado('listo');
    };

    if (estado === 'listo') {
        return (
            <div role="status" className="bg-white rounded-2xl shadow-sm p-4 text-sm text-gray-800">
                🎂 {t('¡Anotado! Tu salón te lo tendrá en cuenta.')}
            </div>
        );
    }

    return (
        <section className="bg-white rounded-2xl shadow-sm p-4 border border-pink-100" aria-labelledby="cumple-titulo">
            <h2 id="cumple-titulo" className="font-bold text-gray-900">🎂 {t('¿Cuándo es tu cumpleaños?')}</h2>
            <p className="text-sm text-gray-700 mt-1">
                {!bono.activa
                    ? t('{salon} quiere felicitarte en tu cumpleaños.', { salon: salon || t('Tu salón') })
                    : bono.tipo === 'regalo'
                        ? t('{salon} tiene un regalo para ti en tu cumpleaños: {regalo}.', { salon: salon || t('Tu salón'), regalo: bono.regalo })
                        : t('{salon} tiene {pct}% de descuento para ti en tu cumpleaños.', { salon: salon || t('Tu salón'), pct: bono.pct })}
            </p>
            <div className="mt-3">
                <SelectorCumple dia={dia} mes={mes} claro onCambio={(d, m) => { setDia(d); setMes(m); setError(''); }} />
            </div>
            {error && <p role="alert" className="text-sm text-red-700 mt-2">{error}</p>}
            <div className="flex gap-2 mt-3">
                <button type="button" onClick={aplazar} className="flex-1 min-h-[44px] rounded-full border border-gray-300 bg-white font-semibold text-gray-800">{t('Ahora no')}</button>
                <button type="button" onClick={guardar} disabled={guardando} className="flex-1 min-h-[44px] rounded-full bg-pink-500 font-bold text-white disabled:opacity-50">{guardando ? t('Guardando…') : t('Guardar')}</button>
            </div>
        </section>
    );
}

function ClientApp() {
    const [step, setStep] = React.useState('auth');
    const [cliente, setCliente] = React.useState(null);
    const [selectedService, setSelectedService] = React.useState(null);
    const [selectedProfesional, setSelectedProfesional] = React.useState(null);
    const [selectedDate, setSelectedDate] = React.useState('');
    const [selectedTime, setSelectedTime] = React.useState('');
    const [bookingConfirmed, setBookingConfirmed] = React.useState(null);
    // La reserva va de a un paso por pantalla: 0 servicio, 1 profesional,
    // 2 día, 3 hora. Arriba, un ticket que se llena con cada elección.
    const [paso, setPaso] = React.useState(0);
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
            if (pasoAnterior === 'service') setPaso(event.state.paso || 0);
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

    // Cada paso de la reserva entra en el historial: el atrás del teléfono
    // vuelve al paso anterior, no fuera de la reserva.
    const irAPaso = (n) => {
        setPaso(n);
        try { window.history.pushState({ step: 'service', paso: n }, ''); } catch (e) {}
    };

    const goBack = () => {
        if (history.length <= 1) return;
        // popstate sincroniza step e history internos.
        window.history.back();
    };

    // Cada paso empieza arriba, con el ticket a la vista.
    React.useEffect(() => {
        if (step === 'service') window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [paso, step]);

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
        setPaso(0);
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
                    irAPaso(2);
                    return;
                }
            }
        } catch (e) {
            console.error('Error auto-seleccionando profesional:', e);
        }

        irAPaso(1);
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
        setPaso(0);
        setStep('service');
        setBookingConfirmed(null);
    };

    // "Repetir esta cita" desde Mis Reservas: mismo servicio y, si sigue
    // haciéndolo, la misma profesional; la clienta solo elige día y hora.
    const handleRepetir = async (turno) => {
        setDisenoElegido(null);
        navigateTo('service');
        try {
            const servicios = await window.salonServicios?.getAll?.(true);
            const servicio = (servicios || []).find(s => s.nombre === turno.servicio);
            if (!servicio) return;
            await handleServiceSelect(servicio);
            const profesionales = await window.salonProfesionales?.getAll?.();
            const profesional = (profesionales || []).find(p => String(p.id) === String(turno.profesional_id || turno.trabajador_id));
            const asignados = window.getProfesionalesPorServicio ? await window.getProfesionalesPorServicio(servicio.id) : [];
            const lahace = !asignados?.length || asignados.some(p => String(p.id) === String(profesional?.id));
            if (profesional && profesional.activo !== false && lahace) {
                setSelectedProfesional(profesional);
                irAPaso(2);
            }
        } catch (e) {
            console.error('No se pudo repetir la cita:', e);
        }
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
                        disenoPendiente={disenoElegido}
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
                        onRepetir={handleRepetir}
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
                                        <p className="text-xs text-pink-500 font-medium">{window.t('Elegido del catálogo')}</p>
                                        <p className="text-sm font-bold text-gray-800 truncate">{disenoElegido.titulo}</p>
                                    </div>
                                    <button onClick={() => setDisenoElegido(null)}
                                        className="text-gray-400 text-sm px-2">✕</button>
                                </div>
                            )}

                            {(() => {
                                const t = window.t;
                                const clave = (p) => p?.esMultiple ? (p.asignaciones || []).map(a => a.profesional?.id).join(',') : p?.id;
                                const alcanzable = [true, !!selectedService, !!(selectedService && selectedProfesional), !!(selectedService && selectedProfesional && selectedDate)];
                                const visible = alcanzable[paso] ? paso : alcanzable.lastIndexOf(true);
                                const fechaCorta = (f) => {
                                    const d = new Date(`${f}T12:00:00`);
                                    return Number.isNaN(d.getTime()) ? f : d.toLocaleDateString(window.getIdioma?.() === 'en' ? 'en' : 'es', { weekday: 'short', day: 'numeric', month: 'short' });
                                };
                                const ticket = [
                                    [t('Servicio'), selectedService?.nombre],
                                    [t('Con'), selectedProfesional ? (selectedProfesional.esMultiple ? t('Varias') : selectedProfesional.nombre) : ''],
                                    [t('Día'), selectedDate ? fechaCorta(selectedDate) : ''],
                                    [t('Hora'), selectedTime && window.formatTo12Hour ? window.formatTo12Hour(selectedTime) : selectedTime]
                                ];
                                const pregunta = [t('¿Qué te hacemos hoy?'), t('¿Con quién?'), t('¿Qué día?'), t('¿A qué hora?')][visible];
                                const partes = pregunta.match(/^(.*\s)(\S+)(\?)$/);
                                // Al volver al paso de profesional, el selector de combos
                                // repite la misma elección al montarse: solo se avanza si cambió.
                                const elegirProfesional = (p) => {
                                    const cambio = clave(p) !== clave(selectedProfesional);
                                    setSelectedProfesional(p);
                                    if (p && (!p.esMultiple || cambio)) irAPaso(2);
                                };
                                return (
                                    <>
                                        {/* El ticket de la cita: se llena con cada elección y cada
                                            hueco lleva de vuelta a ese paso. */}
                                        <div className="bg-white rounded-2xl shadow-sm p-1.5 grid gap-1" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                                            {ticket.map(([etiqueta, valor], n) => (
                                                <button key={n} type="button" disabled={!alcanzable[n]} onClick={() => irAPaso(n)}
                                                    className={`min-w-0 text-left rounded-xl px-2 py-1.5 transition-colors ${n === visible ? 'bg-pink-50' : ''}`}>
                                                    <span className={`block text-[11px] font-bold uppercase tracking-wide ${n === visible ? 'text-pink-600' : 'text-gray-500'}`}>{etiqueta}</span>
                                                    <span className={`block text-sm font-bold truncate ${valor ? 'text-gray-900' : 'text-gray-300'}`}>{valor || '—'}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="h-1 rounded-full bg-gray-200 overflow-hidden">
                                            <div className="h-full bg-pink-500 rounded-full transition-all duration-300"
                                                style={{ width: `${selectedTime ? 100 : (visible + 1) * 20}%` }}></div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('Paso {n} de 4', { n: visible + 1 })}</p>
                                            <h2 className="text-2xl font-extrabold text-gray-900 mt-1">
                                                {partes ? <>{partes[1]}<span className="text-pink-600">{partes[2]}</span>{partes[3]}</> : pregunta}
                                            </h2>
                                        </div>

                                        {/* paso-reserva oculta el título numerado de cada
                                            componente ("1. Elige tu servicio"...): aquí la
                                            pregunta grande hace ese papel. Ver index.html. */}
                                        <div key={visible} className="paso-reserva animate-fade-in space-y-4">
                                            {visible === 0 && (
                                                <>
                                                    <CumpleClienteCard cliente={cliente} />
                                                    <ServiceSelection onSelect={handleServiceSelect} selectedService={selectedService} />
                                                </>
                                            )}
                                            {visible === 1 && (selectedService.esMultiple ? (
                                                <MultiProfesionalSelector onSelect={elegirProfesional} selectedProfesional={selectedProfesional} selectedService={selectedService} />
                                            ) : (
                                                <ProfesionalSelector onSelect={elegirProfesional} selectedProfesional={selectedProfesional} selectedService={selectedService} />
                                            ))}
                                            {visible === 2 && (
                                                <Calendar
                                                    onDateSelect={(fecha) => { setSelectedDate(fecha); setSelectedTime(''); irAPaso(3); }}
                                                    selectedDate={selectedDate}
                                                    profesional={selectedProfesional?.esMultiple ? selectedProfesional.asignaciones[0]?.profesional : selectedProfesional}
                                                    profesionalCompleto={selectedProfesional}
                                                    service={selectedService}
                                                    onHorariosCargados={setHorariosPorDia}
                                                />
                                            )}
                                            {visible === 3 && (selectedService.esMultiple ? (
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
                                            ))}
                                        </div>
                                    </>
                                );
                            })()}

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
                                        setPaso(0);
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
