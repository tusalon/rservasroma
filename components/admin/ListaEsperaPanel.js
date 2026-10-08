// components/admin/ListaEsperaPanel.js
//
// Clientas anotadas en turnos ocupados. Cuando el turno se libera, la admin lo ve
// aqui marcado "Turno libre" y con un boton para avisar a la clienta por WhatsApp.
// Cuentas puras y mensaje: utils/lista-espera.js. Estados: ver ese archivo.

function ListaEsperaPanel({ profesionalId = null, nombreSalon = '', onCambio }) {
    window.useIdioma();
    const t = window.t;
    const [filas, setFilas] = React.useState([]);
    const [libres, setLibres] = React.useState({});
    const [cargando, setCargando] = React.useState(true);
    const [error, setError] = React.useState('');
    const [aviso, setAviso] = React.useState('');
    const [trabajando, setTrabajando] = React.useState(null);

    const cabeceras = () => ({
        apikey: window.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
    });

    // Reservas activas de esos dias, agrupadas por "fecha|profesional". Lanza si la
    // consulta falla: un fallo no puede pasar por "turno libre".
    const reservasDe = async (fechas) => {
        const negocioId = window.getNegocioId();
        const lista = Array.from(new Set(fechas));
        const res = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=in.(${lista.join(',')})&estado=neq.Cancelado&select=fecha,profesional_id,hora_inicio,hora_fin,estado`,
            { headers: cabeceras(), cache: 'no-store' }
        );
        if (!res.ok) throw new Error(await res.text());
        const mapa = {};
        (await res.json()).forEach(r => {
            const clave = `${r.fecha}|${r.profesional_id}`;
            (mapa[clave] = mapa[clave] || []).push(r);
        });
        return mapa;
    };

    const cargar = React.useCallback(async () => {
        try {
            const negocioId = window.getNegocioId();
            const hoy = window.getCurrentLocalDate();
            let url = `${window.SUPABASE_URL}/rest/v1/lista_espera?negocio_id=eq.${negocioId}&fecha=gte.${hoy}&estado=in.(esperando,notificada,avisada)&select=*&order=fecha.asc,hora_inicio.asc`;
            if (profesionalId) url += `&profesional_id=eq.${profesionalId}`;
            const res = await fetch(url, { headers: cabeceras(), cache: 'no-store' });
            if (!res.ok) throw new Error(await res.text());
            const datos = await res.json();
            const mapa = datos.length ? await reservasDe(datos.map(f => f.fecha)) : {};
            const nuevosLibres = {};
            datos.forEach(f => {
                nuevosLibres[f.id] = !window.listaEspera.turnoOcupado(mapa[`${f.fecha}|${f.profesional_id}`], f);
            });
            setLibres(nuevosLibres);
            setFilas(datos);
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

    const cambiarEstado = async (fila, estado) => {
        const negocioId = window.getNegocioId();
        const res = await fetch(
            `${window.SUPABASE_URL}/rest/v1/lista_espera?negocio_id=eq.${negocioId}&id=eq.${fila.id}`,
            { method: 'PATCH', headers: cabeceras(), body: JSON.stringify({ estado }) }
        );
        if (!res.ok) throw new Error(await res.text());
        setFilas(actuales => actuales.map(f => (f.id === fila.id ? { ...f, estado } : f)).filter(f => f.estado !== 'cerrada'));
        onCambio?.();
    };

    const avisar = async (fila) => {
        setTrabajando(fila.id);
        setAviso('');
        try {
            // El turno pudo ocuparse desde que se cargo la lista: se mira otra vez.
            const mapa = await reservasDe([fila.fecha]);
            if (window.listaEspera.turnoOcupado(mapa[`${fila.fecha}|${fila.profesional_id}`], fila)) {
                setLibres(l => ({ ...l, [fila.id]: false }));
                setAviso(t('Ese turno ya se ocupó de nuevo.'));
                return;
            }
            const fecha = window.formatFechaCompleta ? window.formatFechaCompleta(fila.fecha) : fila.fecha;
            const hora = window.formatTo12Hour ? window.formatTo12Hour(fila.hora_inicio) : fila.hora_inicio;
            const texto = window.listaEspera.mensajeAvisoListaEspera({ nombre: fila.cliente_nombre, fecha, hora, salon: nombreSalon });
            // Accion manual de la admin: va aunque el envio automatico este apagado.
            window.enviarWhatsApp(fila.cliente_whatsapp, texto, { forzar: true });
            await cambiarEstado(fila, 'avisada');
        } catch (e) {
            console.error('Error avisando a la clienta en espera:', e);
            setAviso(t('No se pudo actualizar. Inténtalo de nuevo.'));
        } finally {
            setTrabajando(null);
        }
    };

    const quitar = async (fila) => {
        if (!confirm(t('¿Quitar a {nombre} de la lista de espera?', { nombre: fila.cliente_nombre || '' }))) return;
        setTrabajando(fila.id);
        setAviso('');
        try {
            await cambiarEstado(fila, 'cerrada');
        } catch (e) {
            console.error('Error quitando de la lista de espera:', e);
            setAviso(t('No se pudo actualizar. Inténtalo de nuevo.'));
        } finally {
            setTrabajando(null);
        }
    };

    const ordenadas = window.listaEspera.ordenarListaEspera(filas, libres);

    return (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold">{t('Lista de espera')}</h2>
                <button
                    type="button"
                    onClick={cargar}
                    className="px-4 min-h-11 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    {t('Actualizar')}
                </button>
            </div>

            {aviso && (
                <p role="alert" className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">{aviso}</p>
            )}
            {error && (
                <p role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{error}</p>
            )}

            {cargando ? (
                <p className="text-sm text-gray-500">{t('Cargando...')}</p>
            ) : ordenadas.length === 0 ? (
                <p className="text-sm text-gray-600 py-6 text-center">{t('Cuando una clienta se anote en un turno lleno, aparecerá aquí.')}</p>
            ) : (
                <ul className="space-y-3">
                    {ordenadas.map(f => {
                        const libre = libres[f.id] === true;
                        const fecha = window.formatFechaCompleta ? window.formatFechaCompleta(f.fecha) : f.fecha;
                        const hora = window.formatTo12Hour ? window.formatTo12Hour(f.hora_inicio) : f.hora_inicio;
                        return (
                            <li key={f.id} className={`rounded-xl border p-4 ${libre && f.estado !== 'avisada' ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 break-words">{f.cliente_nombre}</p>
                                        <p className="text-sm text-gray-600 break-words">{f.servicio}{f.profesional_nombre ? ` · ${f.profesional_nombre}` : ''}</p>
                                        <p className="text-sm text-gray-800 mt-1">{fecha} · {hora}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {f.estado === 'avisada' && (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">{t('Avisada')}</span>
                                        )}
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${libre ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                            {libre ? t('Turno libre') : t('Turno ocupado')}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {libre && (
                                        <button
                                            type="button"
                                            disabled={trabajando === f.id}
                                            onClick={() => avisar(f)}
                                            className="px-4 min-h-11 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {t('Avisar por WhatsApp')}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={trabajando === f.id}
                                        onClick={() => quitar(f)}
                                        className="px-4 min-h-11 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
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
