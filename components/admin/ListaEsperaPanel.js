// components/admin/ListaEsperaPanel.js
//
// Lista de espera POR DIA (sql-lista-espera-dia.sql). Las clientas se anotan a un dia lleno; cuando se
// cancela algo, la base se lo ofrece sola a la primera de la fila y se lo guarda 30 minutos. Aqui la duena
// ve quien espera y a quien se le esta guardando una hora, y puede:
//   * "Reservársela": crea la cita y le manda el WhatsApp de cita hecha (ahi si es verdad que la tiene).
//   * "Avisar por WhatsApp": le recuerda que tiene una hora guardada, con el enlace para reservarla.
//   * "Quitar de la lista".
// La lista tiene telefonos: se lee con la sesion del panel (utils/panel-sesion.js), no con la clave publica.
// Cuentas y mensajes: utils/lista-espera.js.

function ListaEsperaPanel({ profesionalId = null, nombreSalon = '', onCambio }) {
    window.useIdioma();
    const t = window.t;
    const le = window.listaEspera;
    const [filas, setFilas] = React.useState([]);
    const [cargando, setCargando] = React.useState(true);
    const [sinSesion, setSinSesion] = React.useState(false);
    const [error, setError] = React.useState('');
    const [aviso, setAviso] = React.useState('');
    const [trabajando, setTrabajando] = React.useState(null);

    const cargar = React.useCallback(async () => {
        const token = window.panelSesion?.token?.();
        if (!token) { setSinSesion(true); setCargando(false); return; }
        try {
            const negocioId = window.getNegocioId();
            const hoy = window.getCurrentLocalDate();
            let url = `${window.SUPABASE_URL}/rest/v1/lista_espera?negocio_id=eq.${negocioId}&tipo=eq.dia&fecha=gte.${hoy}&estado=in.(esperando,ofrecida)&select=*&order=fecha.asc,created_at.asc`;
            if (profesionalId) url += `&or=(profesional_id.eq.${profesionalId},profesional_id.is.null,oferta_profesional_id.eq.${profesionalId})`;
            const res = await fetch(url, { headers: window.panelSesion.cabeceras(token), cache: 'no-store' });
            if (res.status === 401 || res.status === 403) { window.panelSesion.limpiar(); setSinSesion(true); return; }
            if (!res.ok) throw new Error(await res.text());
            setFilas(await res.json());
            setSinSesion(false);
            setError('');
        } catch (e) {
            console.error('Error cargando lista de espera:', e);
            setError(t('No se pudo cargar la lista de espera.'));
        } finally {
            setCargando(false);
        }
    }, [profesionalId]);

    React.useEffect(() => {
        cargar();
        const cadaMinuto = setInterval(cargar, 60000);
        const alVolver = () => { if (!document.hidden) cargar(); };
        document.addEventListener('visibilitychange', alVolver);
        window.addEventListener('rservas:lista-espera-cambio', cargar);
        return () => {
            clearInterval(cadaMinuto);
            document.removeEventListener('visibilitychange', alVolver);
            window.removeEventListener('rservas:lista-espera-cambio', cargar);
        };
    }, [cargar]);

    const entrar = async () => {
        if (await window.panelSesion?.asegurar?.()) { setCargando(true); cargar(); }
    };

    const fechaTxt = (f) => (window.formatFechaCompleta ? window.formatFechaCompleta(f) : f);
    const horaTxt = (h) => (window.formatTo12Hour ? window.formatTo12Hour(h) : h);
    const hastaTxt = (iso) => le.horaLimite(iso);
    const enlaceSalon = () => {
        const slug = localStorage.getItem('adminSlug') || localStorage.getItem('negocioSlug') || '';
        return slug ? `https://tusalon.github.io/rservasroma/?s=${encodeURIComponent(slug)}` : '';
    };

    const reservarsela = async (f) => {
        setTrabajando(f.id);
        setAviso('');
        try {
            // Un servicio, o los de un combo uno detrás de otro (como BookingForm); si un tramo falla se
            // cancelan los ya creados para no dejar una cita a medias en la agenda.
            const tramos = [];
            const aMin = (h) => le.aMinutos(h);
            const aHora = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
            if (Array.isArray(f.combo) && f.combo.length > 1) {
                let cursor = aMin(f.oferta_hora);
                for (const item of f.combo) {
                    const dur = Number(item.duracion) || 30;
                    tramos.push({ servicio: item.servicio, duracion: dur, hora_inicio: aHora(cursor), hora_fin: aHora(cursor + dur) });
                    cursor += dur;
                }
            } else {
                tramos.push({ servicio: f.servicio, duracion: f.duracion, hora_inicio: String(f.oferta_hora).slice(0, 5), hora_fin: String(f.oferta_hora_fin || '').slice(0, 5) || null });
            }
            const creadas = [];
            try {
                for (const tramo of tramos) {
                    const r = await window.createBooking({
                        cliente_nombre: f.cliente_nombre,
                        cliente_whatsapp: f.cliente_whatsapp,
                        servicio: tramo.servicio,
                        duracion: tramo.duracion,
                        profesional_id: f.oferta_profesional_id,
                        profesional_nombre: f.oferta_profesional_nombre,
                        fecha: f.fecha,
                        hora_inicio: tramo.hora_inicio,
                        hora_fin: tramo.hora_fin,
                        estado: 'Reservado'
                    });
                    if (!r?.success || !r.data) throw new Error('No se pudo crear un tramo');
                    creadas.push(r.data);
                }
            } catch (errTramo) {
                for (const c of creadas) { try { await window.updateBookingStatus(c.id, 'Cancelado'); } catch (e) { console.error('No se pudo revertir', c.id, e); } }
                throw errTramo;
            }
            // La base cierra su espera al crear la cita (trigger reservas_lista_espera_reservo).
            window.enviarWhatsApp(f.cliente_whatsapp, le.mensajeReservada({
                nombre: f.cliente_nombre, fecha: fechaTxt(f.fecha), hora: horaTxt(f.oferta_hora),
                profesional: f.oferta_profesional_nombre, salon: nombreSalon
            }), { forzar: true });
            setAviso(t('Cita creada para {nombre}.', { nombre: f.cliente_nombre }));
            setFilas(l => l.filter(x => x.id !== f.id));
            onCambio?.();
            window.dispatchEvent(new CustomEvent('rservas:reservas-cambio'));
        } catch (e) {
            console.error('No se pudo reservar desde la lista de espera:', e);
            setAviso(e?.code === 'HORARIO_OCUPADO' ? t('Esa hora ya se ocupó.') : t('No se pudo actualizar. Inténtalo de nuevo.'));
        } finally {
            setTrabajando(null);
        }
    };

    const avisar = (f) => {
        // Accion manual de la duena: va aunque el envio automatico este apagado.
        window.enviarWhatsApp(f.cliente_whatsapp, le.mensajeOferta({
            nombre: f.cliente_nombre, fecha: fechaTxt(f.fecha), hora: horaTxt(f.oferta_hora),
            profesional: f.oferta_profesional_nombre, salon: nombreSalon,
            hasta: hastaTxt(f.oferta_hasta), enlace: enlaceSalon()
        }), { forzar: true });
    };

    // Combo con varias profesionales: no se le guarda una hora sola; la duena pregunta y lo organiza.
    const escribir = (f) => {
        window.enviarWhatsApp(f.cliente_whatsapp, le.mensajeBuscarHueco({
            nombre: f.cliente_nombre, fecha: fechaTxt(f.fecha), servicio: f.servicio, salon: nombreSalon
        }), { forzar: true });
    };

    const quitar = async (f) => {
        if (!(await window.confirmar(t('¿Quitar a {nombre} de la lista de espera?', { nombre: f.cliente_nombre || '' })))) return;
        setTrabajando(f.id);
        setAviso('');
        // Misma funcion que usa la clienta: si tenia una hora guardada, vuelve a ofrecerse a la siguiente.
        const ok = await le.salir(f.id, { whatsapp: f.cliente_whatsapp });
        if (ok) { setFilas(l => l.filter(x => x.id !== f.id)); onCambio?.(); }
        else setAviso(t('No se pudo actualizar. Inténtalo de nuevo.'));
        setTrabajando(null);
    };

    const ordenadas = le.ordenarListaEspera(filas);

    return (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="text-xl font-bold">⏳ {t('Lista de espera')}</h2>
                {!sinSesion && (
                    <button type="button" onClick={cargar}
                        className="px-4 min-h-11 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        {t('Actualizar')}
                    </button>
                )}
            </div>
            <p className="text-sm text-gray-500 mb-4">{t('Cuando una clienta se anote en un día lleno, aparecerá aquí. Si se libera una hora, la app se la ofrece sola a la primera de la fila y se la guarda 30 minutos.')}</p>

            {aviso && <p role="status" className="mb-4 rounded-xl bg-pink-50 border border-pink-200 px-3 py-2 text-sm text-pink-900">{aviso}</p>}
            {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{error}</p>}

            {sinSesion ? (
                <div className="rounded-2xl bg-pink-50 border border-pink-100 p-5 text-center">
                    <p className="text-3xl mb-2" aria-hidden="true">🔒</p>
                    <p className="text-sm text-gray-700 mb-4">{t('La lista de espera tiene teléfonos de tus clientas: confirma tu contraseña para verla.')}</p>
                    <button type="button" onClick={entrar}
                        className="px-6 min-h-11 rounded-full text-white font-bold shadow-md" style={{ background: '#FF1493' }}>
                        {t('Ver la lista')}
                    </button>
                </div>
            ) : cargando ? (
                <p className="text-sm text-gray-500">{t('Cargando...')}</p>
            ) : ordenadas.length === 0 ? null : (
                <ul className="space-y-3">
                    {ordenadas.map(f => {
                        const guardada = le.ofertaVigente(f);
                        return (
                            <li key={f.id} className={`rounded-2xl border p-4 ${guardada ? 'border-pink-300 bg-pink-50/60' : 'border-gray-200 bg-white'}`}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 break-words">{f.cliente_nombre}</p>
                                        <p className="text-sm text-gray-600 break-words">
                                            {f.servicio} · {Array.isArray(f.combo) && le.comboConVariasProfesionales(f.combo)
                                                ? t('Varias profesionales')
                                                : (f.profesional_nombre || t('Cualquier profesional'))}
                                        </p>
                                        <p className="text-sm text-gray-800 mt-1">
                                            {fechaTxt(f.fecha)} · {guardada
                                                ? `${horaTxt(f.oferta_hora)}${f.oferta_profesional_nombre ? ` · ${f.oferta_profesional_nombre}` : ''}`
                                                : t(le.textoFranja(f.franja))}
                                        </p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${guardada ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                        {guardada ? t('Guardada hasta las {hora}', { hora: hastaTxt(f.oferta_hasta) }) : t('Esperando')}
                                    </span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {guardada && (
                                        <>
                                            <button type="button" disabled={trabajando === f.id} onClick={() => reservarsela(f)}
                                                className="px-4 min-h-11 rounded-full text-white text-sm font-bold shadow-sm disabled:opacity-50" style={{ background: '#FF1493' }}>
                                                {t('Reservársela')}
                                            </button>
                                            <button type="button" disabled={trabajando === f.id} onClick={() => avisar(f)}
                                                className="px-4 min-h-11 rounded-full bg-green-600 text-white text-sm font-semibold disabled:opacity-50">
                                                {t('Avisar por WhatsApp')}
                                            </button>
                                        </>
                                    )}
                                    {!guardada && Array.isArray(f.combo) && le.comboConVariasProfesionales(f.combo) && (
                                        <button type="button" disabled={trabajando === f.id} onClick={() => escribir(f)}
                                            className="px-4 min-h-11 rounded-full bg-green-600 text-white text-sm font-semibold disabled:opacity-50">
                                            {t('Escribirle por WhatsApp')}
                                        </button>
                                    )}
                                    <button type="button" disabled={trabajando === f.id} onClick={() => quitar(f)}
                                        className="px-4 min-h-11 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                                        {t('Quitar de la lista')}
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
