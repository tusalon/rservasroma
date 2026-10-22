// components/MyBookings.js
//
// "Mis reservas" de la clienta. Trabaja con TURNOS, no con filas sueltas: lo que reservo en una visita
// (uno o varios servicios seguidos) se ve junto y se cambia junto. La logica de mover, quitar y anadir
// servicios vive en utils/turnos.js (con prueba en tests/turnos.test.js).

function MyBookings({ cliente, onVolver }) {
    window.useIdioma();
    const t = window.t;
    const [bookings, setBookings] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    // Guarda el ID del turno en proceso de cancelación (no un booleano
    // global: si no, TODOS los botones de cancelar mostraban "Cancelando...").
    const [cancelando, setCancelando] = React.useState(null);
    const [filtro, setFiltro] = React.useState('proximas');
    const [mensajeError, setMensajeError] = React.useState('');
    const [negocioId, setNegocioId] = React.useState(null);
    const [minCancelacionHoras, setMinCancelacionHoras] = React.useState(1);

    // Reprogramación (mueve el turno entero)
    const [reprogramando, setReprogramando] = React.useState(false);
    const [reservaReprogramando, setReservaReprogramando] = React.useState(null);
    const [reprogramacionFecha, setReprogramacionFecha] = React.useState('');
    const [reprogramacionHora, setReprogramacionHora] = React.useState('');
    const [horariosReprogramacion, setHorariosReprogramacion] = React.useState([]);
    const [cargandoHorariosReprogramacion, setCargandoHorariosReprogramacion] = React.useState(false);
    const [mensajeReprogramacion, setMensajeReprogramacion] = React.useState('');

    // Añadir un servicio a un turno (pantalla compartida: components/AnadirServicioTurno.js)
    const [anadiendoA, setAnadiendoA] = React.useState(null);

    // Quitar un servicio de un turno
    const [confirmandoQuitar, setConfirmandoQuitar] = React.useState(null);
    const [quitando, setQuitando] = React.useState(false);

    // Confirmación de cancelación (reemplaza confirm() nativo)
    const [confirmandoCancelacion, setConfirmandoCancelacion] = React.useState(null);

    // Toast de éxito/error inline
    const [toast, setToast] = React.useState(null);

    // Valoración post-visita: la clienta puntúa el SERVICIO recibido en turnos
    // Completados (distinta de `valoracion`, que califica la experiencia de
    // reservar y se pide en la pantalla de confirmación).
    const [guardandoValoracion, setGuardandoValoracion] = React.useState(null);

    const valorarServicio = async (booking, n) => {
        if (guardandoValoracion) return;
        setGuardandoValoracion(booking.id);
        try {
            const res = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${booking.id}`,
                { method: 'PATCH', headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ valoracion_servicio: n, valoracion_servicio_at: new Date().toISOString() }) }
            );
            if (!res.ok) throw new Error();
            setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, valoracion_servicio: n } : b));
            mostrarToast('ok', t('¡Gracias por valorar tu visita!'));
        } catch {
            mostrarToast('error', t('No se pudo guardar la valoración. Intenta de nuevo.'));
        } finally {
            setGuardandoValoracion(null);
        }
    };

    const mostrarToast = (tipo, texto) => {
        setToast({ tipo, texto });
        setTimeout(() => setToast(null), 3500);
    };

    React.useEffect(() => {
        const id = localStorage.getItem('negocioId') || window.NEGOCIO_ID_POR_DEFECTO;
        setNegocioId(id);
    }, []);

    React.useEffect(() => {
        if (!window.salonConfig) return;
        window.salonConfig.get().then(config => {
            if (config && config.min_cancelacion_horas !== undefined) {
                setMinCancelacionHoras(config.min_cancelacion_horas);
            }
        }).catch(() => {});
    }, []);

    React.useEffect(() => {
        if (cliente?.whatsapp && negocioId) cargarReservas();
    }, [cliente, negocioId]);

    const cargarReservas = async () => {
        setLoading(true);
        setMensajeError('');
        try {
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&cliente_whatsapp=eq.${cliente.whatsapp}&order=fecha.desc,hora_inicio.desc`,
                { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` } }
            );
            if (!response.ok) throw new Error();
            const data = await response.json();
            setBookings(Array.isArray(data) ? data : []);
        } catch {
            setMensajeError(t('Error al cargar tus reservas. Intenta de nuevo.'));
        } finally {
            setLoading(false);
        }
    };

    const puedeCancelar = (fecha, horaInicio) => {
        try {
            const [year, month, day] = fecha.split('-').map(Number);
            const [hours, minutes] = horaInicio.split(':').map(Number);
            const diffMs = new Date(year, month - 1, day, hours, minutes, 0) - new Date();
            return Math.floor(diffMs / 60000) > (minCancelacionHoras * 60);
        } catch { return false; }
    };

    const getMensajeTiempoRestante = (fecha, horaInicio) => {
        try {
            const [year, month, day] = fecha.split('-').map(Number);
            const [hours, minutes] = horaInicio.split(':').map(Number);
            const diffMs = new Date(year, month - 1, day, hours, minutes, 0) - new Date();
            const diffMinutos = Math.floor(diffMs / 60000);
            const diffHoras = Math.floor(diffMinutos / 60);
            const mins = diffMinutos % 60;
            if (diffMinutos <= 0) return '⏰ ' + t('El turno ya pasó');
            if (diffMinutos <= minCancelacionHoras * 60) return '⚠️ ' + t('Faltan {tiempo} — ya no se puede cancelar desde la app', { tiempo: diffHoras > 0 ? `${diffHoras}h ${mins}m` : `${diffMinutos} min` });
            return '🕐 ' + t('Faltan {tiempo} — puedes cancelar', { tiempo: diffHoras > 0 ? `${diffHoras}h ${mins}m` : `${diffMinutos} min` });
        } catch { return ''; }
    };

    const formatDateInput = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getTodayLocalString = () => formatDateInput(new Date());

    // Un turno vigente se puede cambiar mientras falte más que el mínimo para cancelar. Es la MISMA antelación que pide cancelar: si no, soltar el turno a última hora
    // sería una forma de saltarse esa regla. Un turno cancelado no se reactiva desde aquí: se reserva de nuevo.
    const puedeModificar = (turno) => {
        if (!turno || ['Cancelado', 'Completado', 'Ausente'].includes(turno.estado)) return false;
        return puedeCancelar(turno.fecha, turno.hora_inicio);
    };

    const fechaLegible = (fecha) => (window.formatFechaCompleta ? window.formatFechaCompleta(fecha) : fecha);
    const horaLegible = (hora) => (window.formatTo12Hour ? window.formatTo12Hour(hora) : hora);

    // Mismos mensajes para todo lo que puede rechazar la base (horario tomado, sin espacio...).
    const textoDeError = (error, porDefecto) => (
        error && (error.code === 'HORARIO_OCUPADO' || error.code === 'CLIENTE_BLOQUEADO' || error.code === 'NO_SE_PUEDE_QUITAR')
            ? error.message : porDefecto
    );

    const handleCancelarReserva = async (turno) => {
        if (!puedeCancelar(turno.fecha, turno.hora_inicio)) {
            const telefonoDuenno = await window.getTelefonoDuenno();
            const tel = window.formatearTelefono ? window.formatearTelefono(telefonoDuenno) : `+${telefonoDuenno}`;
            mostrarToast('error', t('No puedes cancelar con menos de {n}h de anticipación. Escribe al {tel}', { n: minCancelacionHoras, tel }));
            return;
        }
        setConfirmandoCancelacion(turno);
    };

    const confirmarCancelacion = async () => {
        const turno = confirmandoCancelacion;
        setConfirmandoCancelacion(null);
        setCancelando(turno.id);
        try {
            for (const fila of turno.filas) {
                const res = await fetch(
                    `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${fila.id}`,
                    { method: 'PATCH', headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'Cancelado' }) }
                );
                if (!res.ok) throw new Error();
            }
            if (window.notificarCancelacion) await window.notificarCancelacion({ ...turno, cancelado_por: 'cliente' });
            for (const fila of turno.filas) await window.notificarListaEsperaTurnoLiberado?.(fila);
            mostrarToast('ok', t('Turno cancelado correctamente.'));
            await cargarReservas();
        } catch {
            mostrarToast('error', t('Error al cancelar el turno. Intenta de nuevo.'));
            await cargarReservas();
        } finally {
            setCancelando(null);
        }
    };

    // ---- Cambiar fecha y hora: se mueve el turno entero ----
    React.useEffect(() => {
        if (!reservaReprogramando || !reprogramacionFecha) { setHorariosReprogramacion([]); return; }
        let vigente = true;
        setCargandoHorariosReprogramacion(true);
        setMensajeReprogramacion('');
        setReprogramacionHora('');
        window.turnos.horasLibresParaTurno(reservaReprogramando, reprogramacionFecha)
            .then(({ horas, mensaje }) => { if (vigente) { setHorariosReprogramacion(horas); setMensajeReprogramacion(mensaje); } })
            .catch(() => { if (vigente) { setMensajeReprogramacion(t('Error cargando horarios.')); setHorariosReprogramacion([]); } })
            .finally(() => { if (vigente) setCargandoHorariosReprogramacion(false); });
        return () => { vigente = false; };
    }, [reservaReprogramando, reprogramacionFecha, negocioId]);

    const abrirReprogramacion = (turno) => {
        if (!puedeModificar(turno)) { mostrarToast('error', t('Ya no se puede cambiar este turno desde la app. Escribe al salón.')); return; }
        setReservaReprogramando(turno);
        setReprogramacionFecha('');
        setReprogramacionHora('');
        setHorariosReprogramacion([]);
        setMensajeReprogramacion('');
    };

    const cerrarReprogramacion = () => {
        setReservaReprogramando(null);
        setReprogramacionFecha('');
        setReprogramacionHora('');
        setHorariosReprogramacion([]);
        setMensajeReprogramacion('');
    };

    const notificarReprogramacion = async (nuevo, anterior) => {
        try {
            const config = window.cargarConfiguracionNegocio ? await window.cargarConfiguracionNegocio(true) : {};
            const fA = fechaLegible(anterior.fecha);
            const fN = fechaLegible(nuevo.fecha);
            const hA = horaLegible(anterior.hora_inicio);
            const hN = horaLegible(nuevo.hora_inicio);
            const msg = `CITA REPROGRAMADA - ${config?.nombre || 'Salón'}\n\nCliente: ${nuevo.cliente_nombre}\nWhatsApp: ${nuevo.cliente_whatsapp}\nServicio: ${nuevo.servicio}\nProfesional: ${nuevo.profesional_nombre || 'No asignada'}\n\nAntes: ${fA} a las ${hA}\nAhora: ${fN} a las ${hN}`;
            if (window.enviarNotificacionPush) await window.enviarNotificacionPush(`${config?.nombre || 'Salón'} - Cita reprogramada`, msg, 'calendar', 'default', { profesionalId: nuevo.profesional_id || nuevo.trabajador_id || nuevo.barbero_id });
            if (window.enviarWhatsApp && config?.telefono) window.enviarWhatsApp(config.telefono, msg);
            // Push a la clienta cuando admin reprograma — se detecta si el que reprograma es admin
            if (window.enviarPushCliente && nuevo.cliente_whatsapp) {
                window.enviarPushCliente({
                    whatsapp: nuevo.cliente_whatsapp,
                    title: `📅 ${t('Cita reprogramada')} — ${config?.nombre || t('Tu salón')}`,
                    body: t('{servicio}: ahora el {fecha} a las {hora}', { servicio: nuevo.servicio, fecha: fN, hora: hN }),
                }).catch(() => {});
            }
        } catch {}
    };

    const handleGuardarReprogramacion = async () => {
        if (!reservaReprogramando || !reprogramacionFecha || !reprogramacionHora) {
            mostrarToast('error', t('Selecciona fecha y hora para reprogramar.'));
            return;
        }
        setReprogramando(true);
        try {
            const { horas } = await window.turnos.horasLibresParaTurno(reservaReprogramando, reprogramacionFecha);
            if (!horas.includes(reprogramacionHora)) {
                setHorariosReprogramacion(horas);
                mostrarToast('error', t('Ese horario ya no está disponible. Elige otro.'));
                return;
            }
            const anterior = reservaReprogramando;
            await window.turnos.moverTurno(anterior, reprogramacionFecha, reprogramacionHora);
            await notificarReprogramacion({ ...anterior, fecha: reprogramacionFecha, hora_inicio: reprogramacionHora }, anterior);
            mostrarToast('ok', t('Turno reprogramado correctamente.'));
            cerrarReprogramacion();
            await cargarReservas();
        } catch (error) {
            mostrarToast('error', textoDeError(error, t('Error al reprogramar el turno. Intenta de nuevo.')));
            await cargarReservas();
        } finally {
            setReprogramando(false);
        }
    };

    // ---- Añadir un servicio al turno ----
    const abrirAnadir = (turno) => {
        if (!puedeModificar(turno)) { mostrarToast('error', t('Ya no se puede cambiar este turno desde la app. Escribe al salón.')); return; }
        setAnadiendoA(turno);
    };

    // ---- Quitar un servicio del turno ----
    const confirmarQuitar = async () => {
        const { turno, item } = confirmandoQuitar;
        setConfirmandoQuitar(null);
        setQuitando(true);
        try {
            const plan = await window.turnos.quitarServicio(turno, item);
            if (plan.tipo === 'cancelarTurno') {
                if (window.notificarCancelacion) await window.notificarCancelacion({ ...turno, cancelado_por: 'cliente' });
            } else {
                await window.turnos.avisarCambio('Servicio quitado', [
                    `Servicio quitado: ${item.nombre}`,
                    `Su turno ahora: ${turno.items.filter(otro => otro !== item).map(otro => otro.nombre).join(' + ')}`,
                    `Fecha: ${fechaLegible(turno.fecha)} a las ${horaLegible(turno.hora_inicio)}`
                ], turno);
            }
            mostrarToast('ok', t('Servicio quitado de tu turno.'));
        } catch (error) {
            mostrarToast('error', textoDeError(error, t('No se pudo quitar el servicio. Intenta de nuevo.')));
        } finally {
            setQuitando(false);
            await cargarReservas();
        }
    };

    // Fecha LOCAL, no UTC: con toISOString(), en Cuba (UTC-4) a partir de las
    // 8pm "hoy" ya era mañana y las citas de esta noche desaparecían de Próximas.
    const hoy = formatDateInput(new Date());
    const turnos = React.useMemo(() => window.turnos.agruparTurnos(bookings).sort((a, b) =>
        `${b.fecha} ${b.hora_inicio}`.localeCompare(`${a.fecha} ${a.hora_inicio}`)), [bookings]);
    const esPasado = (b) => b.fecha < hoy || b.estado === 'Completado' || b.estado === 'Ausente';
    const esProximo = (b) => !esPasado(b) && b.estado !== 'Cancelado';

    const reservasFiltradas = turnos.filter(b =>
        filtro === 'proximas'   ? esProximo(b) :
        filtro === 'historial'  ? esPasado(b) :
        filtro === 'canceladas' ? b.estado === 'Cancelado' : true
    );
    const proximasCount   = turnos.filter(esProximo).length;
    const historialCount  = turnos.filter(esPasado).length;
    const canceladasCount = turnos.filter(b => b.estado === 'Cancelado').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 pb-20">

            {/* Toast inline */}
            {toast && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all
                    ${toast.tipo === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                    style={{ maxWidth: '90vw' }}>
                    <span>{toast.tipo === 'ok' ? '✅' : '❌'}</span>
                    <span>{toast.texto}</span>
                </div>
            )}

            {/* Modal confirmación cancelación */}
            {confirmandoCancelacion && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold text-pink-800 mb-2">{t('¿Cancelar turno?')}</h3>
                        <p className="text-sm text-pink-600 mb-1">{fechaLegible(confirmandoCancelacion.fecha)}</p>
                        <p className="text-sm text-pink-600 mb-4">
                            {horaLegible(confirmandoCancelacion.hora_inicio)} — {confirmandoCancelacion.servicio}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmandoCancelacion(null)}
                                className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 font-medium">
                                {t('No, volver')}
                            </button>
                            <button onClick={confirmarCancelacion}
                                className="flex-1 py-2 rounded-lg bg-red-500 text-white font-medium">
                                {t('Sí, cancelar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal confirmación: quitar un servicio */}
            {confirmandoQuitar && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold text-pink-800 mb-2">{t('¿Quitar este servicio?')}</h3>
                        <p className="text-sm text-pink-600 mb-4">{confirmandoQuitar.item.nombre}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmandoQuitar(null)}
                                className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 font-medium">
                                {t('No, volver')}
                            </button>
                            <button onClick={confirmarQuitar}
                                className="flex-1 py-2 rounded-lg bg-red-500 text-white font-medium">
                                {t('Sí, quitar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-10 border-b border-pink-200">
                <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
                    <button onClick={onVolver} className="flex items-center gap-2 text-pink-600 hover:text-pink-800 transition">
                        <i className="icon-arrow-left text-xl"></i>
                        <span className="font-medium">{t('Volver')}</span>
                    </button>
                    <h1 className="text-xl font-bold text-pink-800">✨ {t('Mis Reservas')}</h1>
                    <div className="w-20"></div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6">

                <div className="bg-white/80 backdrop-blur-sm border border-pink-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                            {cliente.nombre.charAt(0)}
                        </div>
                        <div>
                            <p className="font-medium text-pink-800">{cliente.nombre}</p>
                            <p className="text-sm text-pink-600">{cliente.whatsapp}</p>
                        </div>
                    </div>
                </div>

                {mensajeError && (
                    <div className="bg-pink-100 border border-pink-300 text-pink-700 p-3 rounded-lg mb-4 text-sm">{mensajeError}</div>
                )}

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {[
                        ['proximas',   t('Próximas ({n})', { n: proximasCount })],
                        ['historial',  t('Historial ({n})', { n: historialCount })],
                        ['canceladas', t('Canceladas ({n})', { n: canceladasCount })],
                    ].map(([key, label]) => (
                        <button key={key} onClick={() => setFiltro(key)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap
                                ${filtro === key ? 'bg-pink-500 text-white shadow-md' : 'bg-pink-100 text-pink-700 hover:bg-pink-200'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {filtro === 'historial' && historialCount > 0 && (
                    <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                        <span className="text-3xl">✨</span>
                        <div>
                            <p className="font-semibold text-pink-800">{t('{n} visita{s} en total', { n: historialCount, s: historialCount !== 1 ? 's' : '' })}</p>
                            <p className="text-xs text-pink-500">{t('Gracias por elegirnos siempre')}</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                        <p className="text-pink-500 mt-4">{t('Cargando tus reservas...')}</p>
                    </div>
                ) : reservasFiltradas.length === 0 ? (
                    <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-pink-200">
                        <div className="text-6xl mb-4">{filtro === 'historial' ? '📖' : '📅'}</div>
                        <p className="text-pink-600 mb-2">
                            {filtro === 'proximas' ? t('No tienes turnos próximos') :
                             filtro === 'historial' ? t('Aún no tienes visitas pasadas') :
                             t('No tienes turnos cancelados')}
                        </p>
                        {filtro === 'proximas' && (
                            <button onClick={onVolver} className="text-pink-500 font-medium hover:underline">{t('Reservar un turno')}</button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reservasFiltradas.map(booking => {
                            const puedeCancelarBooking = booking.estado !== 'Cancelado' && puedeCancelar(booking.fecha, booking.hora_inicio);
                            const puedeModificarBooking = puedeModificar(booking);
                            const tiempoRestante = getMensajeTiempoRestante(booking.fecha, booking.hora_inicio);
                            const fechaConDia = fechaLegible(booking.fecha);
                            const profesional = booking.profesional_nombre || booking.trabajador_nombre || t('No asignada');
                            const calendarLink = window.generarLinkCalendarioCliente ? window.generarLinkCalendarioCliente(booking) : '';
                            const varios = booking.items.length > 1;

                            return (
                                <div key={booking.id} className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border-l-4 overflow-hidden border border-pink-200
                                    ${booking.estado === 'Cancelado' ? 'border-l-pink-400 opacity-70' : 'border-l-pink-500'}`}>
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="text-sm text-pink-600 font-medium block mb-1">{fechaConDia}</span>
                                                <h3 className="font-bold text-pink-800 text-lg">{varios ? t('Tu turno') : booking.servicio}</h3>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold
                                                ${booking.estado === 'Reservado' || booking.estado === 'Confirmado' ? 'bg-green-100 text-green-700' :
                                                  booking.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' :
                                                  booking.estado === 'Completado' ? 'bg-pink-200 text-pink-800' :
                                                  booking.estado === 'Cancelado' ? 'bg-gray-100 text-gray-500' : 'bg-pink-100 text-pink-500'}`}>
                                                {booking.estado === 'Reservado' || booking.estado === 'Confirmado' ? '✅ ' + t('Confirmado') :
                                                 booking.estado === 'Pendiente' ? '⏳ ' + t('Falta el anticipo') :
                                                 booking.estado === 'Completado' ? '✨ ' + t('Completado') :
                                                 booking.estado === 'Ausente' ? t('No asististe') :
                                                 booking.estado}
                                            </span>
                                        </div>

                                        {varios && (
                                            <ul className="mb-3 space-y-2">
                                                {booking.items.map((item, indice) => (
                                                    <li key={`${item.filaId}-${indice}`} className="flex items-center justify-between gap-3 bg-pink-50 border border-pink-100 rounded-lg px-3 py-2">
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-pink-800 truncate">{item.nombre}</p>
                                                            {item.profesional_nombre && <p className="text-xs text-pink-500 truncate">{item.profesional_nombre}</p>}
                                                        </div>
                                                        {puedeModificarBooking && (
                                                            <button onClick={() => setConfirmandoQuitar({ turno: booking, item })}
                                                                disabled={quitando}
                                                                className="shrink-0 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-full px-3 py-1 hover:bg-red-50 disabled:opacity-50">
                                                                {t('Quitar')}
                                                            </button>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                            <div className="flex items-center gap-2 text-pink-600">
                                                <span className="text-pink-400">⏰</span>
                                                <span>{horaLegible(booking.hora_inicio)}{varios ? ` – ${horaLegible(booking.hora_fin)}` : ''}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-pink-600">
                                                <span className="text-pink-400">⏱️</span>
                                                <span>{booking.duracion} min</span>
                                            </div>
                                            {!varios && (
                                                <div className="flex items-center gap-2 text-pink-600 col-span-2">
                                                    <span className="text-pink-400">👩‍🎨</span>
                                                    <span>{t('Profesional:')} {profesional}</span>
                                                </div>
                                            )}
                                        </div>

                                        {booking.estado !== 'Cancelado' && booking.estado !== 'Completado' && (
                                            <div className={`text-xs p-2 rounded-lg mb-3 flex items-center gap-2
                                                ${puedeCancelarBooking ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-pink-100 text-pink-700 border border-pink-300'}`}>
                                                <span>{puedeCancelarBooking ? '💡' : '⚠️'}</span>
                                                <span>{tiempoRestante}{!puedeModificarBooking && booking.estado !== 'Ausente' ? ' ' + t('Tampoco se puede cambiar la fecha ni los servicios.') : ''}</span>
                                            </div>
                                        )}

                                        {/* Valoración post-visita: solo en turnos completados */}
                                        {booking.estado === 'Completado' && (
                                            Number(booking.valoracion_servicio) > 0 ? (
                                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 text-center">
                                                    <p className="text-xs text-yellow-700 font-medium mb-1">{t('Tu valoración de esta visita')}</p>
                                                    <div className="text-xl leading-none">
                                                        {[1,2,3,4,5].map(n => (
                                                            <span key={n} style={{ filter: Number(booking.valoracion_servicio) >= n ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 text-center">
                                                    <p className="text-sm text-yellow-800 font-semibold mb-0.5">{t('¿Cómo estuvo tu visita?')}</p>
                                                    <p className="text-xs text-yellow-600 mb-2">{t('Tu opinión ayuda al salón a mejorar')}</p>
                                                    <div className="flex justify-center gap-1.5">
                                                        {[1,2,3,4,5].map(n => (
                                                            <button key={n} type="button"
                                                                onClick={() => valorarServicio(booking, n)}
                                                                disabled={guardandoValoracion !== null}
                                                                className="text-2xl transition-transform active:scale-95 disabled:opacity-50"
                                                                style={{ filter: 'grayscale(1) opacity(0.45)' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.filter = 'none'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.filter = 'grayscale(1) opacity(0.45)'; }}>
                                                                ⭐
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {guardandoValoracion === booking.id && (
                                                        <p className="text-xs text-yellow-600 mt-2">{t('Guardando...')}</p>
                                                    )}
                                                </div>
                                            )
                                        )}

                                        {booking.estado !== 'Cancelado' && calendarLink && (
                                            <a href={calendarLink} target="_blank" rel="noopener noreferrer"
                                                className="w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 mb-2">
                                                <i className="icon-calendar text-base"></i>
                                                {t('Agregar al calendario')}
                                            </a>
                                        )}

                                        {puedeModificarBooking && (
                                            <button onClick={() => abrirReprogramacion(booking)}
                                                className="w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 mb-2">
                                                <i className="icon-calendar text-base"></i>
                                                {t('Cambiar fecha y hora')}
                                            </button>
                                        )}

                                        {puedeModificarBooking && (
                                            <button onClick={() => abrirAnadir(booking)}
                                                className="w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 mb-2">
                                                <span>➕</span>
                                                {t('Añadir un servicio')}
                                            </button>
                                        )}

                                        {booking.estado !== 'Cancelado' && (
                                            <button onClick={() => handleCancelarReserva(booking)}
                                                disabled={cancelando !== null || !puedeCancelarBooking}
                                                className={`w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2
                                                    ${puedeCancelarBooking ? 'bg-pink-100 hover:bg-pink-200 text-pink-700' : 'bg-pink-50 text-pink-400 cursor-not-allowed'}
                                                    disabled:opacity-50 disabled:cursor-not-allowed`}>
                                                {cancelando === booking.id ? (
                                                    <><div className="animate-spin h-4 w-4 border-2 border-pink-600 border-t-transparent rounded-full"></div>{t('Cancelando...')}</>
                                                ) : (
                                                    <><span>❌</span>{puedeCancelarBooking ? t('Cancelar turno') : t('No se puede cancelar aún')}</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal reprogramación */}
            {reservaReprogramando && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-pink-100 p-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-pink-800">{t('Cambiar fecha y hora')}</h2>
                                <p className="text-sm text-pink-500">{reservaReprogramando.servicio}</p>
                            </div>
                            <button onClick={cerrarReprogramacion} disabled={reprogramando}
                                className="w-9 h-9 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 disabled:opacity-50 text-lg">
                                ✕
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="rounded-lg bg-pink-50 border border-pink-100 p-3 text-sm text-pink-700">
                                {reservaReprogramando.items.length > 1
                                    ? t('Se mueve todo tu turno, con sus {n} servicios. Los servicios y las profesionales se mantienen igual.', { n: reservaReprogramando.items.length })
                                    : t('Solo cambia la fecha y hora. El servicio, profesional y duración se mantienen igual.')}
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-gray-500">{t('Profesional')}</p>
                                    <p className="font-semibold text-gray-800">{reservaReprogramando.profesional_nombre || t('No asignada')}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-gray-500">{t('Duración')}</p>
                                    <p className="font-semibold text-gray-800">{reservaReprogramando.duracion || 60} min</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('Nueva fecha')}</label>
                                <input type="date" min={getTodayLocalString()} value={reprogramacionFecha}
                                    onChange={(e) => setReprogramacionFecha(e.target.value)}
                                    className="w-full border border-pink-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400" />
                            </div>

                            {reprogramacionFecha && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Nueva hora')}</label>
                                    {cargandoHorariosReprogramacion ? (
                                        <div className="flex justify-center py-6">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                                        </div>
                                    ) : horariosReprogramacion.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {horariosReprogramacion.map(hora => (
                                                <button key={hora} type="button" onClick={() => setReprogramacionHora(hora)}
                                                    className={`py-2 px-3 rounded-lg text-sm font-medium ${reprogramacionHora === hora ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-700 hover:bg-pink-100'}`}>
                                                    {horaLegible(hora)}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-3 rounded-lg bg-pink-50 text-pink-700 border border-pink-100 text-sm">
                                            {mensajeReprogramacion || t('No hay horarios disponibles para esa fecha.')}
                                        </div>
                                    )}
                                </div>
                            )}

                            {mensajeReprogramacion && horariosReprogramacion.length > 0 && (
                                <p className="text-sm text-pink-600">{mensajeReprogramacion}</p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button onClick={cerrarReprogramacion} disabled={reprogramando}
                                    className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-50">
                                    {t('Cancelar')}
                                </button>
                                <button onClick={handleGuardarReprogramacion}
                                    disabled={reprogramando || !reprogramacionFecha || !reprogramacionHora}
                                    className="flex-1 py-2 rounded-full bg-pink-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                                    {reprogramando ? t('Guardando...') : t('Guardar cambio')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: añadir un servicio */}
            {anadiendoA && (
                <AnadirServicioTurno
                    turno={anadiendoA}
                    onCerrar={() => setAnadiendoA(null)}
                    onError={(mensaje) => mostrarToast('error', mensaje)}
                    onListo={async () => {
                        mostrarToast('ok', t('Servicio añadido a tu turno.'));
                        setAnadiendoA(null);
                        await cargarReservas();
                    }}
                />
            )}
        </div>
    );
}
