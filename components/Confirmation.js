// components/Confirmation.js - VERSIÓN SIMPLIFICADA (SIN ENVÍO AUTOMÁTICO)

function Confirmation({ booking, onReset }) {
    window.useIdioma();
    const t = window.t;
    // Sin defaults de prueba: si la config tarda o falla, no mostramos un
    // número/nombre inventado a la clienta (antes se veía "Negocio de Prueba"
    // y "+55002272" como contacto real).
    const [telefonoDuenno, setTelefonoDuenno] = React.useState('');
    const [codigoPaisDuenno, setCodigoPaisDuenno] = React.useState('');
    const [nombreNegocio, setNombreNegocio] = React.useState('');
    const [estrellas, setEstrellas] = React.useState(0);
    const [valoracionEnviada, setValoracionEnviada] = React.useState(false);
    const [hoverEstrella, setHoverEstrella] = React.useState(0);
    // Mensaje de confirmacion propio de la admin (vacio = el de siempre).
    const [mensajePropio, setMensajePropio] = React.useState('');
    // Recordatorios: se piden aquí, cuando ya hay una cita que no quiere olvidar
    // (antes estaban en la bienvenida, antes de tener cita).
    const pushUIVisible = window.RSERVAS_PUSH_UI_VISIBLE === true;
    const cliente = { whatsapp: booking?.cliente_whatsapp };
    const [pushEstado, setPushEstado] = React.useState(() => {
        if (window.Capacitor?.isNativePlatform?.()) {
            return typeof window.clientePushActivo === 'function' && window.clientePushActivo() ? 'granted' : 'default';
        }
        return 'Notification' in window ? Notification.permission : 'unsupported';
    });
    const [activandoPush, setActivandoPush] = React.useState(false);
    const [pushMensaje, setPushMensaje] = React.useState('');

    React.useEffect(() => {
        const cargarDatos = async () => {
            try {
                const tel = await window.getTelefonoDuenno();
                const nombre = await window.getNombreNegocio();
                setTelefonoDuenno(tel);
                setNombreNegocio(nombre);
                if (window.getCodigoPaisNegocio) {
                    setCodigoPaisDuenno(await window.getCodigoPaisNegocio());
                }
                // Si la admin encendio su propio mensaje de confirmacion, se muestra ese.
                if (window.bienvenida && window.cargarConfiguracionNegocio) {
                    const config = await window.cargarConfiguracionNegocio(true);
                    const fecha = booking?.fecha ? new Date(`${booking.fecha}T12:00:00`) : null;
                    setMensajePropio(window.bienvenida.textoConfirmacion(config, {
                        cliente: booking?.cliente_nombre || '',
                        nombre_negocio: nombre || config?.nombre || '',
                        servicio: booking?.servicio || '',
                        fecha: fecha && !Number.isNaN(fecha.getTime())
                            ? fecha.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
                            : '',
                        hora: String(booking?.hora_inicio || '').slice(0, 5),
                        profesional: booking?.profesional_nombre || booking?.trabajador_nombre || '',
                        direccion: config?.direccion || ''
                    }, { pantalla: true })); // el ticket de abajo ya enseña los datos de la cita
                }
            } catch (error) {}
        };
        cargarDatos();
        // Ver si ya valoró esta reserva
        if (booking?.id) {
            const ya = localStorage.getItem(`val_${booking.id}`);
            if (ya) { setEstrellas(parseInt(ya)); setValoracionEnviada(true); }
        }
    }, []);

    const enviarValoracion = (n) => {
        setEstrellas(n);
        setValoracionEnviada(true);
        if (!booking?.id) return;
        // Guarda local (evita volver a pedir la valoración de esta reserva)...
        localStorage.setItem(`val_${booking.id}`, String(n));
        // ...y la persiste en la reserva para que el salón realmente la vea.
        // Antes la valoración solo vivía en localStorage y nunca llegaba al negocio.
        // Si la columna aún no existe (falta correr la migración), el PATCH falla
        // en silencio y la UI sigue funcionando igual.
        try {
            fetch(`${window.SUPABASE_URL}/rest/v1/reservas?id=eq.${encodeURIComponent(booking.id)}`, {
                method: 'PATCH',
                headers: {
                    apikey: window.SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ valoracion: n, valoracion_at: new Date().toISOString() })
            }).catch(() => {});
        } catch (e) {}
    };

    const activarNotificaciones = async () => {
        const isNative = Boolean(window.Capacitor?.isNativePlatform?.());
        if (isNative) {
            setActivandoPush(true);
            setPushMensaje('');
            try {
                const ok = typeof window.solicitarNativePushRservasRoma === 'function' &&
                    await window.solicitarNativePushRservasRoma({
                        role: 'cliente',
                        clienteWhatsapp: cliente?.whatsapp
                    });
                setPushEstado(ok ? 'granted' : 'default');
                if (!ok) setPushMensaje(t('No se pudo activar. Instala la version mas reciente de la app.'));
            } catch (error) {
                console.warn('Push nativo cliente:', error);
                setPushEstado('default');
                setPushMensaje(t('No se pudo activar: {msg}', { msg: String(error.message || error).substring(0, 60) }));
            } finally {
                setActivandoPush(false);
            }
            return;
        }

        if (!('Notification' in window)) { setPushEstado('unsupported'); return; }
        setActivandoPush(true);
        setPushMensaje('');

        pedirPermisoYSuscribir();

        function pedirPermisoYSuscribir() {
            const permissionPromise = Notification.permission === 'default'
                ? Notification.requestPermission()
                : Promise.resolve(Notification.permission);

            permissionPromise.then(permiso => {
                setPushEstado(permiso);
                if (permiso !== 'granted') {
                    setPushMensaje(permiso === 'denied' ? t('Permiso bloqueado en el navegador') : t('Permiso no concedido'));
                    setActivandoPush(false);
                    return;
                }
                if (typeof window.solicitarPushRservasRoma !== 'function') {
                    setPushEstado('granted');
                    setActivandoPush(false);
                    return;
                }
                window.solicitarPushRservasRoma({ permission: permiso, defaultRole: 'cliente', clienteWhatsapp: cliente?.whatsapp })
                    .then(res => {
                        if (res?.ok) {
                            setPushMensaje('');
                        } else {
                            const msg = res?.error || 'error';
                            console.warn('Push resultado:', msg);
                            if (msg === 'sw_not_ready') {
                                setPushMensaje(t('Instala la app en tu pantalla de inicio para recibir avisos'));
                            } else if (msg.includes('applicationServerKey') || msg.includes('VAPID') || msg.includes('key')) {
                                setPushMensaje(t('Recarga la app y vuelve a intentarlo'));
                            } else {
                                setPushMensaje(t('No se pudo activar: {msg}', { msg: msg.substring(0, 60) }));
                            }
                        }
                    })
                    .catch(err => {
                        console.warn('Push error:', err);
                        setPushMensaje(t('Error: {err}', { err: String(err).substring(0, 60) }));
                    })
                    .finally(() => setActivandoPush(false));
            }).catch(() => setActivandoPush(false));
        }
    };

    // ⚡ ELIMINADO: useEffect con setTimeout que causaba problemas en iOS
    // Ahora el WhatsApp se envía en BookingForm.js inmediatamente

    if (!booking) {
        console.error('❌ booking no definido');
        return null;
    }

    const fechaConDia = window.formatFechaCompleta ?
        window.formatFechaCompleta(booking.fecha) :
        booking.fecha;
    const calendarLink = window.generarLinkCalendarioCliente ?
        window.generarLinkCalendarioCliente(booking) :
        '';
    const telefonoContacto = window.formatearTelefono ? window.formatearTelefono(telefonoDuenno) : `+${telefonoDuenno}`;

    // Con anticipo, la reserva queda "Pendiente" y se libera si no se paga:
    // la pantalla debe decirlo claramente, no dar el turno por confirmado.
    const esPendientePago = booking.estado === 'Pendiente';
    const montoAnticipo = Number(booking._montoAnticipo || 0);
    const monedaNegocio = window.getPreferenciasWhatsAppNegocio ? (window.getPreferenciasWhatsAppNegocio().moneda || '') : '';
    // _monedaAnticipo la pone BookingForm con la regla unica (moneda del servicio);
    // la del negocio queda solo para reservas que llegan sin ella.
    const textoAnticipo = montoAnticipo > 0 ? `${montoAnticipo} ${booking._monedaAnticipo || monedaNegocio}`.trim() : '';
    // Sin normalizar, un movil local (8 digitos en Cuba) llegaba a wa.me sin
    // codigo de pais y WhatsApp respondia "numero invalido".
    const telefonoAnticipo = telefonoDuenno && window.normalizarTelefonoInternacional
        ? window.normalizarTelefonoInternacional(telefonoDuenno, codigoPaisDuenno)
        : String(telefonoDuenno || '').replace(/\D/g, '');
    const linkWhatsAppAnticipo = telefonoAnticipo
        ? `https://wa.me/${telefonoAnticipo}?text=${encodeURIComponent(`Hola! Acabo de reservar ${booking.servicio} para el ${fechaConDia} y quiero coordinar el anticipo.`)}`
        : '';
    // Nota: el mensaje de WhatsApp de arriba se mantiene en español a propósito —
    // es texto dirigido a la dueña del salón, no a la clienta que lee la pantalla.

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in bg-gradient-to-b from-pink-50 to-pink-100">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-xl ring-4 ${esPendientePago ? 'bg-amber-500 ring-amber-300' : 'bg-pink-500 ring-pink-300'}`}>
                <span className="text-4xl text-white">{esPendientePago ? '⏳' : '✅'}</span>
            </div>

            {esPendientePago ? (
                <>
                    <h2 className="text-2xl font-bold text-amber-700 mb-2">{t('¡Ya casi! Falta el anticipo')}</h2>
                    <p className="text-amber-700 mb-5 max-w-xs mx-auto">
                        {textoAnticipo
                            ? t('Tu cita quedará confirmada cuando envíes el anticipo de {monto}. Si no se recibe a tiempo, el horario se libera.', { monto: textoAnticipo })
                            : t('Tu cita quedará confirmada cuando envíes el anticipo. Si no se recibe a tiempo, el horario se libera.')}
                    </p>
                    {/* Es lo único que la clienta tiene que hacer aquí: arriba,
                        antes del resumen, no al fondo de la pantalla. */}
                    {linkWhatsAppAnticipo && (
                        <a
                            href={linkWhatsAppAnticipo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full max-w-sm mb-6 bg-green-500 text-white py-4 rounded-full font-bold text-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-md"
                        >
                            {textoAnticipo
                                ? t('Enviar anticipo de {monto} por WhatsApp', { monto: textoAnticipo })
                                : t('Coordinar el anticipo por WhatsApp')}
                        </a>
                    )}
                </>
            ) : (
                <>
                    <h2 className="text-2xl font-bold text-pink-800 mb-2">{t('¡Cita reservada!')}</h2>
                    <p className="text-pink-600 mb-6 max-w-xs mx-auto" style={mensajePropio ? { whiteSpace: 'pre-line' } : undefined}>
                        {mensajePropio || t('Tu cita ha sido agendada correctamente')}
                    </p>
                </>
            )}

            {/* El ticket de la cita, el mismo que se fue llenando al reservar. Si
                quedó confirmada recibe el sello "Reservada" (animación en index.html). */}
            <div className="relative bg-white p-5 rounded-2xl shadow-lg w-full max-w-sm mb-6 text-left">
                {!esPendientePago && (
                    <span className="sello-reserva absolute right-3 -top-3 bg-white border-[3px] border-green-600 text-green-700 font-extrabold tracking-widest text-sm px-2.5 py-1 rounded-lg"
                        style={{ transform: 'rotate(-12deg)' }}>
                        {t('RESERVADA')}
                    </span>
                )}
                <div className="divide-y divide-dashed divide-gray-200 text-sm">
                    {[
                        [t('Servicio'), `${booking.servicio} · ${booking.duracion} min`],
                        [t('Fecha'), fechaConDia],
                        [t('Hora'), window.formatTo12Hour ? window.formatTo12Hour(booking.hora_inicio) : booking.hora_inicio],
                        [t('Profesional'), booking.profesional_nombre || booking.trabajador_nombre || t('No asignada')],
                        [t('Cliente'), booking.cliente_nombre]
                    ].map(([etiqueta, valor]) => (
                        <div key={etiqueta} className="flex justify-between gap-4 py-2.5">
                            <span className="text-gray-500">{etiqueta}</span>
                            <span className="font-semibold text-gray-900 text-right">{valor}</span>
                        </div>
                    ))}
                </div>
            </div>

            {esPendientePago ? (
                <p className="text-sm text-amber-800 mb-6 max-w-sm">
                    {t('El salón ya recibió tu solicitud')}. {t('Si cierras esta pantalla, el botón del anticipo también está en «Mis Citas».')}
                </p>
            ) : (
                <div className="bg-pink-100 border border-pink-300 rounded-lg p-4 mb-6 max-w-sm w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white text-xl">
                            📱
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-pink-800">{t('El salón ya recibió tu reserva')}</p>
                            <p className="text-xs text-pink-600">{t('Si necesitas cambiarla, hazlo desde "Mis Citas"')}</p>
                        </div>
                    </div>
                </div>
            )}

            {pushUIVisible && pushEstado !== 'denied' && (
                <div className="w-full max-w-sm mb-4 bg-white/90 p-4 rounded-2xl border border-pink-200 text-left">
                    {pushEstado === 'granted' ? (
                        <p className="font-semibold text-green-700">{t('Recordatorios activados')} ✓</p>
                    ) : pushEstado === 'unsupported' ? (
                        /iPhone|iPad|iPod/i.test(navigator.userAgent) && window.navigator.standalone !== true && (
                            <p className="text-sm text-gray-700 leading-relaxed">
                                {t('Para recibir recordatorios de tus citas, instala la app:')}{' '}
                                {t('toca')} <strong>{t('Compartir ⬆️')}</strong> {t('y luego')} <strong>{t('«Añadir a pantalla de inicio»')}</strong>
                            </p>
                        )
                    ) : (
                        <>
                            <p className="font-bold text-gray-900">{t('¿Te avisamos un día antes?')}</p>
                            <p className="text-sm text-gray-600 mb-3">{t('Te llega un aviso al móvil con la hora de tu cita.')}</p>
                            <button onClick={activarNotificaciones} disabled={activandoPush}
                                className="px-5 py-2.5 rounded-full bg-pink-500 text-white font-bold text-sm disabled:opacity-60">
                                {activandoPush ? t('Activando...') : t('Sí, avísame')}
                            </button>
                        </>
                    )}
                    {pushMensaje && <p className="text-sm text-amber-700 mt-2">{pushMensaje}</p>}
                </div>
            )}

            {/* Valoración */}
            <div className="w-full max-w-sm mb-4 bg-white/90 backdrop-blur-sm p-5 rounded-2xl border-2 border-pink-200 shadow-sm text-center">
                {!valoracionEnviada ? (
                    <>
                        <p className="font-semibold text-pink-800 mb-1">{t('¿Qué te pareció reservar con nosotras?')}</p>
                        <p className="text-xs text-pink-500 mb-3">{t('Califica la experiencia de agendar tu cita')}</p>
                        <div className="flex justify-center gap-2">
                            {[1,2,3,4,5].map(n => (
                                <button key={n}
                                    onClick={() => enviarValoracion(n)}
                                    onMouseEnter={() => setHoverEstrella(n)}
                                    onMouseLeave={() => setHoverEstrella(0)}
                                    className="text-3xl transition-transform hover:scale-110 active:scale-95"
                                    style={{ filter: (hoverEstrella || estrellas) >= n ? 'none' : 'grayscale(1) opacity(0.4)' }}>
                                    ⭐
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-1 text-2xl mb-1">
                            {[1,2,3,4,5].map(n => (
                                <span key={n} style={{ filter: estrellas >= n ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</span>
                            ))}
                        </div>
                        <p className="font-semibold text-pink-700">
                            {estrellas >= 5 ? t('¡Gracias, eso nos encanta!') :
                             estrellas >= 4 ? t('¡Gracias por tu valoración!') :
                             estrellas >= 3 ? t('Gracias, seguiremos mejorando.') :
                             t('Gracias, tomaremos nota para mejorar.')}
                        </p>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                {calendarLink && (
                    <a
                        href={calendarLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-white text-pink-700 border-2 border-pink-300 py-4 rounded-xl font-bold hover:bg-pink-50 transition-colors flex items-center justify-center gap-2 text-lg shadow-sm"
                    >
                        <i className="icon-calendar text-xl"></i>
                        {t('Agregar al calendario')}
                    </a>
                )}

                <button
                    onClick={onReset}
                    className="w-full bg-pink-500 text-white py-4 rounded-full font-bold hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 text-lg shadow-md"
                >
                    {t('Reservar otra cita')}
                </button>

                {telefonoDuenno && (
                    <div className="text-sm text-pink-600 bg-white/80 backdrop-blur-sm p-4 rounded-lg flex items-center justify-center gap-2 border border-pink-300">
                       <span className="text-pink-500 text-xl">📱</span>
                       <span>{t('Contacto:')} {telefonoContacto}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
