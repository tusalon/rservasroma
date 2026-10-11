// components/admin/ClientasNuevasPanel.js
//
// Clientas que acaban de hacer su PRIMERA reserva. La admin les envia la bienvenida por
// WhatsApp con un toque: el mensaje sale ya escrito (el suyo si lo personalizo en Configuracion,
// el de RservasRoma si no). Cuentas y textos: utils/bienvenida.js.
// Hace falta haber ejecutado sql-mensajes-bienvenida.sql (clientes_autorizados.bienvenida_enviada_at).

const CLAVE_SALUDADAS_LOCAL = 'rservas:bienvenida-enviada:';

function leerSaludadasLocal(negocioId) {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_SALUDADAS_LOCAL + negocioId) || '[]');
    } catch (e) {
        return [];
    }
}

function guardarSaludadaLocal(negocioId, clave) {
    try {
        const lista = Array.from(new Set([...leerSaludadasLocal(negocioId), clave])).slice(-500);
        localStorage.setItem(CLAVE_SALUDADAS_LOCAL + negocioId, JSON.stringify(lista));
    } catch (e) {
        // sin almacenamiento: la clienta sigue en la lista hasta recargar
    }
}

// Devuelve { disponible, nuevas, clientes }. disponible=false si falta la columna nueva o falla
// la consulta: asi la pestana no aparece y no se muestra un error a la admin.
window.cargarClientasNuevas = async function () {
    try {
        if (!window.bienvenida) return { disponible: false, nuevas: [], clientes: [] };
        const negocioId = window.getNegocioId();
        if (!negocioId) return { disponible: false, nuevas: [], clientes: [] };
        const cabeceras = { apikey: window.SUPABASE_ANON_KEY, Authorization: `Bearer ${window.SUPABASE_ANON_KEY}` };
        const hoy = window.getCurrentLocalDate();
        const desde = new Date(`${hoy}T12:00:00`);
        desde.setDate(desde.getDate() - window.bienvenida.DIAS_VENTANA);

        const pedir = async (ruta) => {
            const res = await fetch(`${window.SUPABASE_URL}/rest/v1/${ruta}`, { headers: cabeceras, cache: 'no-store' });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        };

        // 1) Reservas recientes (candidatas) y 2) todas las reservas de esas clientas, para saber si es la primera.
        const recientes = await pedir(
            `reservas?negocio_id=eq.${negocioId}&estado=neq.Cancelado&created_at=gte.${encodeURIComponent(desde.toISOString())}` +
            '&select=id,cliente_nombre,cliente_whatsapp,servicio,fecha,hora_inicio,profesional_nombre,estado,created_at&order=created_at.desc&limit=100'
        );
        if (recientes.length === 0) return { disponible: await columnaDisponible(pedir, negocioId), nuevas: [], clientes: [] };

        const telefonos = Array.from(new Set(recientes.map((r) => r.cliente_whatsapp).filter(Boolean)));
        const filtroTelefonos = encodeURIComponent(`(${telefonos.map((t) => `"${t}"`).join(',')})`);
        const todas = await pedir(
            `reservas?negocio_id=eq.${negocioId}&estado=neq.Cancelado&cliente_whatsapp=in.${filtroTelefonos}` +
            '&select=id,cliente_whatsapp,estado,created_at,fecha&limit=2000'
        );
        // 3) Las que ya recibieron la bienvenida (columna nueva: si no existe, esto lanza y la pestana no sale).
        const clientes = await pedir(
            `clientes_autorizados?negocio_id=eq.${negocioId}&whatsapp=in.${filtroTelefonos}&select=whatsapp,nombre,bienvenida_enviada_at`
        );

        const locales = leerSaludadasLocal(negocioId).map((clave) => ({ whatsapp: clave, bienvenida_enviada_at: 'local' }));
        const nuevas = window.bienvenida.clientasNuevas(todas, [...clientes, ...locales], hoy)
            .map((n) => ({ ...n, reserva: recientes.find((r) => r.id === n.reserva.id) || n.reserva }));
        return { disponible: true, nuevas, clientes };
    } catch (error) {
        return { disponible: false, nuevas: [], clientes: [] };
    }
};

// Sin reservas recientes no se toca clientes_autorizados; se comprueba aparte que la columna exista.
async function columnaDisponible(pedir, negocioId) {
    try {
        await pedir(`clientes_autorizados?negocio_id=eq.${negocioId}&select=bienvenida_enviada_at&limit=1`);
        return true;
    } catch (e) {
        return false;
    }
}

function ClientasNuevasPanel({ nombreSalon = '', onCambio }) {
    window.useIdioma();
    const t = window.t;
    const [estado, setEstado] = React.useState({ cargando: true, nuevas: [], clientes: [], disponible: true });
    const [config, setConfig] = React.useState(null);
    const [trabajando, setTrabajando] = React.useState(null);

    const cargar = React.useCallback(async () => {
        const resultado = await window.cargarClientasNuevas();
        setEstado({ cargando: false, ...resultado });
    }, []);

    React.useEffect(() => {
        cargar();
        (async () => {
            try { setConfig(await window.cargarConfiguracionNegocio()); } catch (e) { /* se usa el mensaje de RservasRoma */ }
        })();
    }, [cargar]);

    const datosDe = (reserva) => {
        const fecha = reserva.fecha ? new Date(`${reserva.fecha}T12:00:00`) : null;
        return {
            cliente: reserva.cliente_nombre || '',
            nombre_negocio: nombreSalon || config?.nombre || '',
            servicio: reserva.servicio || '',
            fecha: fecha && !Number.isNaN(fecha.getTime())
                ? fecha.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
                : '',
            hora: String(reserva.hora_inicio || '').slice(0, 5),
            profesional: reserva.profesional_nombre || ''
        };
    };

    const marcarSaludada = async (fila) => {
        const negocioId = window.getNegocioId();
        const cliente = estado.clientes.find((c) => window.bienvenida.soloDigitos(c.whatsapp) === fila.clave);
        let guardada = false;
        if (cliente) {
            try {
                const res = await fetch(
                    `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&whatsapp=eq.${encodeURIComponent(cliente.whatsapp)}`,
                    {
                        method: 'PATCH',
                        headers: {
                            apikey: window.SUPABASE_ANON_KEY,
                            Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            Prefer: 'return=minimal'
                        },
                        body: JSON.stringify({ bienvenida_enviada_at: new Date().toISOString() })
                    }
                );
                guardada = res.ok;
            } catch (e) {
                guardada = false;
            }
        }
        // Sin fila en clientes_autorizados, o si fallo la red: se recuerda en este dispositivo.
        if (!guardada) guardarSaludadaLocal(negocioId, fila.clave);
        setEstado((anterior) => ({ ...anterior, nuevas: anterior.nuevas.filter((n) => n.clave !== fila.clave) }));
        window.dispatchEvent(new CustomEvent('rservas:clientas-nuevas-cambio'));
        if (onCambio) onCambio();
    };

    const enviar = async (fila) => {
        setTrabajando(fila.clave);
        try {
            const texto = window.bienvenida.textoPrimeraVez(config, datosDe(fila.reserva));
            window.enviarWhatsApp(fila.whatsapp, texto);
            await marcarSaludada(fila);
        } finally {
            setTrabajando(null);
        }
    };

    const descartar = async (fila) => {
        setTrabajando(fila.clave);
        try {
            await marcarSaludada(fila);
        } finally {
            setTrabajando(null);
        }
    };

    const propio = config?.mensaje_primera_vez_activo === true && String(config?.mensaje_primera_vez || '').trim();

    if (estado.cargando) {
        return <div className="p-6 text-center text-gray-500">{t('Cargando...')}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-pink-100 p-4">
                <h2 className="text-lg font-bold text-gray-900">{t('Clientas nuevas')}</h2>
                <p className="text-sm text-gray-600 mt-1">
                    {t('Clientas que acaban de hacer su primera reserva. Envíales la bienvenida por WhatsApp con un toque.')}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                    {propio ? t('Se envía tu mensaje de bienvenida.') : t('Se envía el mensaje de bienvenida de RservasRoma.')}{' '}
                    <a className="underline text-pink-700" href={window.construirRutaConSlug ? window.construirRutaConSlug('editar-negocio.html') : 'editar-negocio.html'}>
                        {t('Cambiar mensaje')}
                    </a>
                </p>
            </div>

            {estado.nuevas.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-500">
                    {t('No hay clientas nuevas por saludar. Cuando alguien reserve por primera vez, aparecerá aquí.')}
                </div>
            )}

            {estado.nuevas.map((fila) => {
                const reserva = fila.reserva;
                const ocupada = trabajando === fila.clave;
                return (
                    <div key={fila.clave} className="bg-white rounded-xl border border-pink-100 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="font-semibold text-gray-900 break-words">{reserva.cliente_nombre || t('Clienta nueva')}</p>
                            <p className="text-sm text-gray-600 break-words">
                                {reserva.servicio} · {datosDe(reserva).fecha} {datosDe(reserva).hora && `· ${datosDe(reserva).hora}`}
                            </p>
                            <p className="text-xs text-gray-400 break-all">{fila.whatsapp}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                type="button"
                                disabled={ocupada}
                                onClick={() => enviar(fila)}
                                className="px-4 min-h-11 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
                            >
                                💬 {t('Enviar bienvenida')}
                            </button>
                            <button
                                type="button"
                                disabled={ocupada}
                                onClick={() => descartar(fila)}
                                className="px-4 min-h-11 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 disabled:opacity-60"
                            >
                                {t('Descartar')}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
