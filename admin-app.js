// admin-app.js - Panel de administración (VERSIÓN CORREGIDA CON HORARIOS POR DÍA)
// CON BOTÓN DE NUEVA RESERVA MANUAL, CALENDARIO DE DISPONIBILIDAD

// ─── VERSIÓN DEL APK ADMIN ────────────────────────────────────────────────────
// Aviso de "nueva versión disponible" / actualización obligatoria DESACTIVADO:
// admin_apk_url en Supabase está vacío (no hay a dónde mandar a descargar) y
// no hay un proceso real que distribuya un APK admin nativo. Para reactivar:
// quitar el "return" de abajo y mantener APP_VERSION sincronizado a mano con
// admin_version en config_global (Supabase) cada vez que haga falta avisar.
const APP_VERSION = '1.0.51';

(async function checkAppVersion() {
    return; // desactivado — ver nota arriba
    try {
        const headers = { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` };
        const base = window.SUPABASE_URL + '/rest/v1/config_global?select=clave,valor&clave=in.(admin_version,admin_version_minima,admin_apk_url)';
        const rows = await fetch(base, { headers }).then(r => r.json());
        if (!Array.isArray(rows) || !rows.length) return;

        const get = k => rows.find(r => r.clave === k)?.valor || '';
        const latest = get('admin_version')         || APP_VERSION;
        const minima = get('admin_version_minima')  || APP_VERSION;
        const apkUrl = get('admin_apk_url');

        const parseV = v => v.split('.').map(Number);
        const gt = (a, b) => {
            const [a0,a1,a2] = parseV(a), [b0,b1,b2] = parseV(b);
            return a0 > b0 || (a0 === b0 && a1 > b1) || (a0 === b0 && a1 === b1 && a2 > b2);
        };

        if (gt(minima, APP_VERSION)) {
            document.body.insertAdjacentHTML('afterbegin', `
                <div id="modal-version-critica" style="
                    position:fixed;inset:0;background:rgba(0,0,0,0.92);
                    display:flex;align-items:center;justify-content:center;
                    z-index:999999;font-family:system-ui,sans-serif;padding:24px;box-sizing:border-box;">
                    <div style="background:#1A1A1A;border:1px solid #FF1493;border-radius:20px;
                        padding:32px 24px;max-width:340px;width:100%;text-align:center;">
                        <div style="font-size:48px;margin-bottom:16px;">🔄</div>
                        <h2 style="color:#fff;font-size:20px;margin:0 0 10px;">Actualización requerida</h2>
                        <p style="color:#999;font-size:14px;margin:0 0 24px;line-height:1.5;">
                            Esta versión ya no es compatible. Instala la versión <strong style="color:#FF1493">${latest}</strong> para continuar.
                        </p>
                        ${apkUrl ? `<a href="${apkUrl}" style="
                            display:block;background:#FF1493;color:#fff;text-decoration:none;
                            border-radius:12px;padding:14px;font-size:15px;font-weight:700;">
                            Descargar actualización
                        </a>` : '<p style="color:#666;font-size:13px;">Contacta a tu administrador de Rservasroma.</p>'}
                    </div>
                </div>`);
        } else if (gt(latest, APP_VERSION)) {
            // No repetir el aviso de la MISMA versión una vez descartado — antes
            // no se guardaba nada al cerrarlo y volvía a aparecer en cada carga
            // de admin.html. Sí debe volver a aparecer si Supabase anuncia una
            // versión más nueva todavía que la que ya se descartó.
            let yaDescartada = '';
            try { yaDescartada = localStorage.getItem('adminUpdateDismissed') || ''; } catch (e) {}
            if (yaDescartada === latest) return;

            document.body.insertAdjacentHTML('afterbegin', `
                <div id="banner-update" style="
                    position:fixed;top:0;left:0;right:0;
                    background:linear-gradient(135deg,#FF1493,#c01070);
                    padding:10px 16px;display:flex;align-items:center;gap:8px;
                    z-index:99997;font-family:system-ui,sans-serif;">
                    <span style="color:#fff;font-size:13px;flex:1;">
                        ✨ Nueva versión disponible (${latest})
                    </span>
                    ${apkUrl ? `<a href="${apkUrl}" style="
                        background:#fff;color:#FF1493;text-decoration:none;
                        border-radius:8px;padding:10px 14px;font-size:13px;font-weight:700;white-space:nowrap;
                        min-height:24px;display:inline-flex;align-items:center;">
                        Actualizar
                    </a>` : ''}
                    <button id="btn-cerrar-banner-update" style="
                        background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:8px;
                        min-width:36px;min-height:36px;font-size:18px;cursor:pointer;line-height:1;
                        display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
                </div>`);

            const banner = document.getElementById('banner-update');
            // Empujar el contenido hacia abajo en vez de taparlo.
            document.body.style.paddingTop = banner.offsetHeight + 'px';

            document.getElementById('btn-cerrar-banner-update').onclick = function() {
                try { localStorage.setItem('adminUpdateDismissed', latest); } catch (e) {}
                banner.remove();
                document.body.style.paddingTop = '';
            };
        }
    } catch(e) { /* sin internet o tabla inexistente — silencioso */ }
})();
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener('error', function(e) {
    // Errores de recursos (img/script) no traen message: ignorarlos aquí.
    if (!e || !e.message) return;
    console.error('❌ Error detectado, posible versión antigua:', e.message);

    if (e.message.includes('Failed to load') || e.message.includes('Unexpected token')) {
        // Tope de recargas para no entrar en loop infinito con conexión lenta.
        let intentosRecarga = 0;
        try { intentosRecarga = parseInt(sessionStorage.getItem('recargasPorError') || '0', 10) || 0; } catch (err) {}
        if (intentosRecarga >= 2) {
            console.warn('🔁 Límite de recargas por error alcanzado; no se recarga más.');
            return;
        }
        try { sessionStorage.setItem('recargasPorError', String(intentosRecarga + 1)); } catch (err) {}

        if (window.swRegistration) {
            window.swRegistration.unregister().then(() => {
                window.location.reload();
            });
        } else {
            window.location.reload();
        }
    }
});

// Si la app sobrevive 15s sin recargarse, se libera el tope.
setTimeout(function() {
    try { sessionStorage.removeItem('recargasPorError'); } catch (err) {}
}, 15000);
// getNegocioId() la define utils/config-negocio-master.js (window.getNegocioId),
// cargado antes que admin-app.js en admin.html.

async function getAllBookings() {
    try {
        const negocioId = getNegocioId();
        
        if (!negocioId) {
            console.error('❌ No hay negocioId disponible');
            return [];
        }
        
        const url = `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&select=*&order=fecha.desc,hora_inicio.asc`;
        
        const res = await fetch(url, {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
            }
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error('❌ Error en respuesta:', errorText);
            return [];
        }
        
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }
}

async function deleteExpiredPendingBookings(configNegocio = {}) {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) return 0;

        const horasVencimiento = Number(configNegocio?.tiempo_vencimiento || 2);
        if (!Number.isFinite(horasVencimiento) || horasVencimiento <= 0) return 0;

        const limite = new Date(Date.now() - (horasVencimiento * 60 * 60 * 1000)).toISOString();
        const url = `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&estado=eq.Pendiente&created_at=lt.${encodeURIComponent(limite)}&select=*`;

        const res = await fetch(url, {
            method: 'DELETE',
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                'Prefer': 'return=representation'
            }
        });

        if (!res.ok) {
            console.error('Error eliminando reservas pendientes vencidas:', await res.text());
            return 0;
        }

        const eliminadas = await res.json();
        if (Array.isArray(eliminadas) && eliminadas.length > 0) {
            for (const booking of eliminadas) {
                await window.notificarListaEsperaTurnoLiberado?.(booking);
            }
        }

        return Array.isArray(eliminadas) ? eliminadas.length : 0;
    } catch (error) {
        console.error('Error limpiando reservas pendientes vencidas:', error);
        return 0;
    }
}

async function cancelBooking(id, bookingData = null) {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) {
            console.error('a No hay negocioId disponible');
            return false;
        }
        
        const res = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: 'Cancelado' })
            }
        );
        
        if (!res.ok) {
            console.error('Error al cancelar:', await res.text());
            return false;
        }

        if (bookingData) {
            await window.notificarListaEsperaTurnoLiberado?.(bookingData);
        }
        
        return true;
    } catch (error) {
        console.error('Error cancel booking:', error);
        return false;
    }
}

async function createBooking(bookingData) {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) {
            console.error('a No hay negocioId disponible');
            return { success: false, error: 'No hay negocioId' };
        }

        const bloqueo = await window.getClienteBloqueado?.(bookingData.cliente_whatsapp);
        if (bloqueo) {
            return { success: false, error: 'Este cliente no tiene permiso para reservar.' };
        }
        
        const dataWithNegocio = {
            ...bookingData,
            negocio_id: negocioId
        };
        
        const res = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas`,
            {
                method: 'POST',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(dataWithNegocio)
            }
        );
        
        if (!res.ok) {
            const error = await res.text();
            console.error('Error al crear reserva:', error);
            return { success: false, error };
        }
        
        const data = await res.json();
        return { success: true, data: Array.isArray(data) ? data[0] : data };
    } catch (error) {
        console.error('Error creating booking:', error);
        return { success: false, error: error.message };
    }
}
async function marcarTurnosCompletados() {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) {
            console.error('a No hay negocioId disponible');
            return;
        }
        
        const ahora = new Date();
        const ano = ahora.getFullYear();
        const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
        const dia = ahora.getDate().toString().padStart(2, '0');
        const hoy = `${ano}-${mes}-${dia}`;
        
        const horaActual = ahora.getHours();
        const minutosActuales = ahora.getMinutes();
        const totalMinutosActual = horaActual * 60 + minutosActuales;
        
        const responsePasados = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&estado=eq.Reservado&fecha=lt.${hoy}&select=id,fecha,hora_inicio,hora_fin,cliente_nombre,servicio,profesional_nombre`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!responsePasados.ok) {
            console.error('Error al buscar turnos pasados para completar');
            return;
        }
        
        const turnosPasados = await responsePasados.json();
        
        const responseHoy = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&estado=eq.Reservado&fecha=eq.${hoy}&select=id,fecha,hora_inicio,hora_fin,cliente_nombre,servicio,profesional_nombre`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        
        const turnosHoy = responseHoy.ok ? await responseHoy.json() : [];
        
        const turnosHoyTerminados = turnosHoy.filter(turno => {
            const [horas, minutos] = turno.hora_fin.split(':').map(Number);
            const totalMinutosFin = horas * 60 + minutos;
            return totalMinutosFin <= totalMinutosActual;
        });
        
        const turnosACompletar = [...turnosPasados, ...turnosHoyTerminados];

        if (turnosACompletar.length > 0) {
            const ids = turnosACompletar.map(turno => turno.id);

            await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=in.(${ids.join(',')})`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ estado: 'Completado' })
                }
            );

            return ids;
        }

        return [];

    } catch (error) {
        console.error('Error marcando turnos completados:', error);
        return [];
    }
}
// timeToMinutes, indiceToHoraLegible, variantesHorarioPermitido, servicioPermiteHorario
// y slotTieneDescanso viven en utils/timeLogic.js (cargado antes que admin-app.js).
// estaDentroBloqueTrabajo se eliminó: no tenía ningún sitio de llamada en el archivo (código muerto).

const formatTo12Hour = (time) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
};

const calculateEndTime = (startTime, duration) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};

const getCurrentLocalDate = () => {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = (ahora.getMonth() + 1).toString().padStart(2, '0');
    const day = ahora.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getCurrentLocalMinutes = () => {
    const ahora = new Date();
    return ahora.getHours() * 60 + ahora.getMinutes();
};

const minutesToHoraLegible = (minutosTotales) => {
    const horas = Math.floor(minutosTotales / 60);
    const minutos = minutosTotales % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
};
function AdminApp() {
    const idioma = window.useIdioma();
    const t = window.t;
    const profesionalInicial = window.getProfesionalAutenticado?.() || null;
    const [bookings, setBookings] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filterDate, setFilterDate] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('activas');
    
    const [userRole, setUserRole] = React.useState(profesionalInicial ? 'profesional' : 'admin');
    const [userNivel, setUserNivel] = React.useState(profesionalInicial?.nivel || 3);
    const [profesional, setProfesional] = React.useState(profesionalInicial);
    const [nombreNegocio, setNombreNegocio] = React.useState(
        localStorage.getItem('negocioNombre') || 'Mi Negocio'
    );
    const [logoNegocio, setLogoNegocio] = React.useState(
        localStorage.getItem('negocioLogo') || null
    );
    const [urlCliente, setUrlCliente] = React.useState(
        localStorage.getItem('negocioUrlClientes') || ''
    );
    
    const [config, setConfig] = React.useState(null);
    const [configVersion, setConfigVersion] = React.useState(0);
    
    const [tabActivo, setTabActivo] = React.useState('reservas');
    const [agendaDate, setAgendaDate] = React.useState(new Date());
    const [agendaMode, setAgendaMode] = React.useState('dia');
    const [agendaDetalleBooking, setAgendaDetalleBooking] = React.useState(null);
    const [estadisticasPeriodo, setEstadisticasPeriodo] = React.useState('mes');
    const [estadisticasFecha, setEstadisticasFecha] = React.useState(getCurrentLocalDate());
    
    const [showClientesRegistrados, setShowClientesRegistrados] = React.useState(false);
    const [clientesRegistrados, setClientesRegistrados] = React.useState([]);
    const [errorClientes, setErrorClientes] = React.useState('');
    const [cargandoClientes, setCargandoClientes] = React.useState(false);
    const [importandoClientesCsv, setImportandoClientesCsv] = React.useState(false);
    const [clientesBloqueados, setClientesBloqueados] = React.useState([]);
    const [cargandoBloqueados, setCargandoBloqueados] = React.useState(false);
    const [nuevoBloqueo, setNuevoBloqueo] = React.useState({ nombre: '', whatsapp: '', codigo_pais: '53', motivo: '' });
    const [busquedaClienteManual, setBusquedaClienteManual] = React.useState('');
    const [busquedaClientes, setBusquedaClientes] = React.useState('');
    const [clienteDetalle, setClienteDetalle] = React.useState(null);

    const [showNuevaReservaModal, setShowNuevaReservaModal] = React.useState(false);
    const [creandoReservaManual, setCreandoReservaManual] = React.useState(false);
    const creandoReservaManualRef = React.useRef(false);
    const [reservaEditando, setReservaEditando] = React.useState(null);
    const [nuevaReservaData, setNuevaReservaData] = React.useState({
        cliente_nombre: '',
        cliente_whatsapp: '',
        cliente_codigo_pais: '53',
        servicio: '',
        profesional_id: '',
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        duracion_personalizada: '',
        requiereAnticipo: false
    });
    const [serviciosManualSeleccionados, setServiciosManualSeleccionados] = React.useState([]);
    
    // Estado para el modal de disponibilidad
    const [showDisponibilidadModal, setShowDisponibilidadModal] = React.useState(false);
    const [disponibilidadFecha, setDisponibilidadFecha] = React.useState(new Date());
    const [disponibilidadHoras, setDisponibilidadHoras] = React.useState([]);
    const [disponibilidadCargando, setDisponibilidadCargando] = React.useState(false);
    const [disponibilidadDias, setDisponibilidadDias] = React.useState({});
    const [disponibilidadConteos, setDisponibilidadConteos] = React.useState({});
    const [modoDisponibilidad, setModoDisponibilidad] = React.useState('mes');
    const [disponibilidadSemanal, setDisponibilidadSemanal] = React.useState([]);
    const [diasCerradosFechas, setDiasCerradosFechas] = React.useState([]);
    const [profesionalSeleccionadoDispo, setProfesionalSeleccionadoDispo] = React.useState(null);
    const [cobroEditando, setCobroEditando] = React.useState(null);
    const [cobroForm, setCobroForm] = React.useState({ monto_cobrado: '', notas_cobro: '' });
    const [guardandoCobro, setGuardandoCobro] = React.useState(false);

    const [serviciosList, setServiciosList] = React.useState([]);
    const [profesionalesList, setProfesionalesList] = React.useState([]);
    const [profesionalesManualFiltrados, setProfesionalesManualFiltrados] = React.useState([]);
    const [horariosDisponibles, setHorariosDisponibles] = React.useState([]);
    const [modoHorarioManualCompleto, setModoHorarioManualCompleto] = React.useState(false);
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [diasLaborales, setDiasLaborales] = React.useState([]);
    const [fechasConHorarios, setFechasConHorarios] = React.useState({});

    const esAdminPanel = userRole === 'admin';
    const esProfesionalPanel = userRole === 'profesional';
    const puedeGestionarReservas = esAdminPanel || (esProfesionalPanel && userNivel >= 2);
    const puedeGestionarAvanzado = esAdminPanel || (esProfesionalPanel && userNivel >= 3);
    const normalizarTextoProfesional = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    const esReservaDelProfesional = (booking, profesionalActual = profesional) => {
        if (!profesionalActual) return true;

        const profesionalIdReserva = booking?.profesional_id ?? booking?.trabajador_id ?? booking?.barbero_id;
        if (profesionalIdReserva !== undefined && profesionalIdReserva !== null && String(profesionalIdReserva) !== '') {
            return Number(profesionalIdReserva) === Number(profesionalActual.id);
        }

        const nombreReserva = normalizarTextoProfesional(
            booking?.profesional_nombre || booking?.trabajador_nombre || booking?.barbero_nombre
        );
        const nombreProfesional = normalizarTextoProfesional(profesionalActual.nombre);

        if (!nombreReserva || !nombreProfesional) return false;
        return nombreReserva === nombreProfesional || nombreReserva.includes(nombreProfesional);
    };
    const filtrarReservasDelProfesional = (reservas, profesionalActual = profesional) => {
        if (!esProfesionalPanel || !profesionalActual) return Array.isArray(reservas) ? reservas : [];
        return (Array.isArray(reservas) ? reservas : []).filter(reserva => esReservaDelProfesional(reserva, profesionalActual));
    };
    const codigoPaisNegocio = window.getCodigoPaisTelefono ? window.getCodigoPaisTelefono(config) : '53';
    const codigoPaisClienteManual = nuevaReservaData.cliente_codigo_pais || codigoPaisNegocio;
    const paisTelefono = window.getPhoneCountryConfig ? window.getPhoneCountryConfig({ codigo_pais: codigoPaisClienteManual }) : { codigo: '53', bandera: '🇨🇺', ejemplo: '55002272' };
    const paisesTelefono = window.PHONE_COUNTRIES || [paisTelefono];

    const getServicioManual = (servicioNombre = nuevaReservaData.servicio) => {
        if (!servicioNombre) return null;
        const servicio = serviciosList.find(s => s.nombre === servicioNombre);
        if (servicio) return servicio;

        const primerNombre = String(servicioNombre).split(' + ')[0]?.trim();
        return serviciosList.find(s => s.nombre === primerNombre) || null;
    };

    const getServiciosManualSeleccionados = () => {
        const nombres = serviciosManualSeleccionados.length > 0
            ? serviciosManualSeleccionados
            : String(nuevaReservaData.servicio || '').split(' + ').map(nombre => nombre.trim()).filter(Boolean);

        const servicios = nombres
            .map(nombre => serviciosList.find(s => s.nombre === nombre))
            .filter(Boolean);

        const servicioUnico = getServicioManual();
        return servicios.length > 0 ? servicios : (servicioUnico ? [servicioUnico] : []);
    };

    const getDuracionManualConfigurada = (serviciosSeleccionados = getServiciosManualSeleccionados()) => {
        return serviciosSeleccionados.reduce((total, servicio) => total + Number(servicio.duracion || 60), 0);
    };

    const getTotalManualServicios = (serviciosSeleccionados = getServiciosManualSeleccionados()) => {
        return serviciosSeleccionados.reduce((total, servicio) => {
            const precio = window.getPrecioServicioBase ? window.getPrecioServicioBase(servicio) : parseFloat(servicio.precio);
            return total + (Number.isFinite(precio) ? precio : 0);
        }, 0);
    };

    const getDuracionManualTotal = (serviciosSeleccionados = getServiciosManualSeleccionados()) => {
        if (nuevaReservaData.hora_inicio && nuevaReservaData.hora_fin) {
            const inicio = timeToMinutes(nuevaReservaData.hora_inicio);
            const fin = timeToMinutes(nuevaReservaData.hora_fin);
            if (Number.isFinite(inicio) && Number.isFinite(fin)) return fin - inicio;
        }

        const personalizada = parseInt(nuevaReservaData.duracion_personalizada, 10);
        if (!Number.isNaN(personalizada) && personalizada > 0) return personalizada;
        return getDuracionManualConfigurada(serviciosSeleccionados);
    };

    const getHoraFinManual = (serviciosSeleccionados = getServiciosManualSeleccionados()) => {
        if (nuevaReservaData.hora_fin) return nuevaReservaData.hora_fin;
        if (!nuevaReservaData.hora_inicio) return '';
        return calculateEndTime(nuevaReservaData.hora_inicio, getDuracionManualTotal(serviciosSeleccionados));
    };

    const tieneDuracionManualPersonalizada = () => {
        const personalizada = parseInt(nuevaReservaData.duracion_personalizada, 10);
        return Boolean(nuevaReservaData.hora_fin) || (!Number.isNaN(personalizada) && personalizada > 0);
    };

    const toggleServicioManual = (nombreServicio) => {
        const existe = serviciosManualSeleccionados.includes(nombreServicio);
        const actualizados = existe
            ? serviciosManualSeleccionados.filter(nombre => nombre !== nombreServicio)
            : [...serviciosManualSeleccionados, nombreServicio];

        setServiciosManualSeleccionados(actualizados);
        setNuevaReservaData(data => ({
            ...data,
            servicio: actualizados.join(' + '),
            fecha: '',
            hora_inicio: '',
            hora_fin: ''
        }));
    };

    const normalizarBusquedaCliente = (valor) => String(valor || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const normalizarTelefonoLocalSeguro = (valor, codigoPais = codigoPaisClienteManual) => {
        if (window.normalizarTelefonoLocal) return window.normalizarTelefonoLocal(valor, codigoPais);
        return String(valor || '').replace(/\D/g, '');
    };

    const normalizarTelefonoCompletoSeguro = (valor, codigoPais = codigoPaisClienteManual) => {
        if (window.normalizarTelefonoInternacional) return window.normalizarTelefonoInternacional(valor, codigoPais);
        const local = normalizarTelefonoLocalSeguro(valor, codigoPais);
        return local ? `53${local}` : '';
    };

    const limpiarTelefonoCliente = normalizarTelefonoLocalSeguro;

    const inferirCodigoPaisCliente = (telefono, fallback = codigoPaisClienteManual) => {
        const detectado = window.detectarPaisTelefono ? window.detectarPaisTelefono(telefono) : null;
        return detectado?.codigo || fallback || codigoPaisNegocio;
    };

    const clientesManualFiltrados = React.useMemo(() => {
        const queryTexto = normalizarBusquedaCliente(busquedaClienteManual);
        const queryNumero = String(busquedaClienteManual || '').replace(/\D/g, '');
        if (!queryTexto && !queryNumero) return clientesRegistrados;

        return clientesRegistrados
            .filter(cliente => {
                const nombreOriginal = String(cliente.nombre || '').toLowerCase().trim();
                const nombreNormalizado = normalizarBusquedaCliente(cliente.nombre);
                const whatsapp = normalizarTelefonoLocalSeguro(cliente.whatsapp);
                const textoCliente = normalizarBusquedaCliente(Object.values(cliente || {}).join(' '));
                const coincideNombre =
                    nombreNormalizado.includes(queryTexto) ||
                    nombreOriginal.includes(String(busquedaClienteManual || '').toLowerCase().trim());
                const coincideTelefono = queryNumero && whatsapp.includes(queryNumero);
                const coincideTexto = queryTexto && textoCliente.includes(queryTexto);
                return coincideNombre || coincideTelefono || coincideTexto;
            });
    }, [busquedaClienteManual, clientesRegistrados, config?.codigo_pais]);

    const seleccionarClienteManual = (cliente) => {
        setNuevaReservaData(prev => {
            const codigoCliente = inferirCodigoPaisCliente(cliente.whatsapp, prev.cliente_codigo_pais);
            return {
                ...prev,
                cliente_nombre: cliente.nombre || '',
                cliente_whatsapp: limpiarTelefonoCliente(cliente.whatsapp, codigoCliente),
                cliente_codigo_pais: codigoCliente
            };
        });
        setBusquedaClienteManual('');
    };
    const cargarDiasCerradosDirecto = async () => {
        try {
            const negocioId = getNegocioId();
            if (!negocioId) return [];
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/dias_cerrados?negocio_id=eq.${negocioId}&select=fecha`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            if (!response.ok) return [];
            
            const data = await response.json();
            const fechas = data.map(d => d.fecha);
            setDiasCerradosFechas(fechas);
            return fechas;
        } catch (error) {
            console.error('Error cargando días cerrados:', error);
            return [];
        }
    };
    React.useEffect(() => {
        window.getNombreNegocio().then(nombre => {
            setNombreNegocio(nombre);
        });
        
        cargarConfiguracion();
    }, [configVersion]);

    React.useEffect(() => {
        window.getUrlClientes?.().then(url => {
            if (url) {
                setUrlCliente(url);
                localStorage.setItem('negocioUrlClientes', url);
            }
        });
    }, []);

    const cargarConfiguracion = async () => {
        try {
            const configData = await window.cargarConfiguracionNegocio(true);
            setConfig(configData);
            if (configData?.nombre) {
                setNombreNegocio(configData.nombre);
            }
            if (configData?.logo_url) {
                setLogoNegocio(configData.logo_url);
                localStorage.setItem('negocioLogo', configData.logo_url);
            }
            const urlClientesActual = window.construirUrlClientesNegocio
                ? window.construirUrlClientesNegocio(configData)
                : (await window.getUrlClientes?.());
            if (urlClientesActual) {
                setUrlCliente(urlClientesActual);
                localStorage.setItem('negocioUrlClientes', urlClientesActual);
            }
        } catch (error) {
            console.error('Error cargando config:', error);
        }
    };
    React.useEffect(() => {
        const profesionalAuth = window.getProfesionalAutenticado?.();
        if (profesionalAuth) {
            setUserRole('profesional');
            setProfesional(profesionalAuth);
            setUserNivel(profesionalAuth.nivel || 1);
            setProfesionalSeleccionadoDispo(profesionalAuth.id);
            
            setNuevaReservaData(prev => ({
                ...prev,
                profesional_id: profesionalAuth.id
            }));
        } else {
            setUserRole('admin');
            setUserNivel(3);
        }
    }, []);

    React.useEffect(() => {
        const cargarDatosModal = async () => {
            if (window.salonServicios) {
                const servicios = await window.salonServicios.getAll(true);
                setServiciosList(servicios || []);
            }
            if (window.salonProfesionales) {
                const profesionales = await window.salonProfesionales.getAll(true);
                setProfesionalesList(profesionales || []);
                setProfesionalesManualFiltrados(profesionales || []);
            }
        };
        cargarDatosModal();
    }, []);

    React.useEffect(() => {
        const filtrarProfesionalesManual = async () => {
            if (!nuevaReservaData.servicio) {
                setProfesionalesManualFiltrados(profesionalesList);
                return;
            }

            try {
                const serviciosSeleccionados = getServiciosManualSeleccionados();
                if (!window.getProfesionalesPorServicio || serviciosSeleccionados.length === 0) {
                    setProfesionalesManualFiltrados(profesionalesList);
                    return;
                }

                const idsPorServicio = await Promise.all(serviciosSeleccionados.map(async servicio => {
                    const profesionalesDelServicio = await window.getProfesionalesPorServicio(servicio.id);
                    return profesionalesDelServicio.map(prof => Number(prof.id)).filter(Boolean);
                }));

                const idsConRestriccion = idsPorServicio.filter(ids => ids.length > 0);
                const idsPermitidos = idsConRestriccion.length > 0
                    ? idsConRestriccion.reduce((permitidos, ids) => permitidos.filter(id => ids.includes(id)))
                    : [];
                const filtrados = idsConRestriccion.length > 0
                    ? profesionalesList.filter(prof => idsPermitidos.includes(Number(prof.id)))
                    : profesionalesList;
                setProfesionalesManualFiltrados(filtrados);

                if (nuevaReservaData.profesional_id && !filtrados.some(prof => prof.id === parseInt(nuevaReservaData.profesional_id))) {
                    setNuevaReservaData(prev => ({
                        ...prev,
                        profesional_id: '',
                        fecha: '',
                        hora_inicio: '',
                        hora_fin: ''
                    }));
                }
            } catch (error) {
                console.error('Error filtrando profesionales del modal:', error);
                setProfesionalesManualFiltrados(profesionalesList);
            }
        };

        filtrarProfesionalesManual();
    }, [nuevaReservaData.servicio, serviciosManualSeleccionados, profesionalesList, serviciosList]);

    // CARGAR DÍAS CERRADOS AL INICIO
    React.useEffect(() => {
        cargarDiasCerradosDirecto();
    }, []);

    React.useEffect(() => {
        const cargarDiasLaborales = async () => {
            if (nuevaReservaData.profesional_id) {
                try {
                    const horarios = await window.salonConfig.getHorariosProfesional(nuevaReservaData.profesional_id);
                    setDiasLaborales(horarios.dias || []);
                    await cargarDisponibilidadMes(currentDate, nuevaReservaData.profesional_id);
                } catch (error) {
                    console.error('Error cargando días laborales:', error);
                    setDiasLaborales([]);
                }
            }
        };
        cargarDiasLaborales();
    }, [nuevaReservaData.profesional_id]);

    // CARGAR DÍAS CERRADOS CUANDO SE ABRE EL MODAL
    React.useEffect(() => {
        if (showNuevaReservaModal) {
            cargarDiasCerradosDirecto();
        }
    }, [showNuevaReservaModal]);

    React.useEffect(() => {
        if (showNuevaReservaModal && nuevaReservaData.profesional_id) {
            cargarDisponibilidadMes(currentDate, nuevaReservaData.profesional_id);
        }
    }, [showNuevaReservaModal, nuevaReservaData.servicio, nuevaReservaData.profesional_id, nuevaReservaData.duracion_personalizada, nuevaReservaData.hora_inicio, nuevaReservaData.hora_fin, reservaEditando]);

    const ordenarHorarios = (horarios = []) => Array.from(new Set(horarios)).sort((a, b) => {
        const [hA, mA] = a.split(':').map(Number);
        const [hB, mB] = b.split(':').map(Number);
        return (hA * 60 + mA) - (hB * 60 + mB);
    });

    const calcularHorariosDisponiblesManual = async (fecha, profesionalId, serviciosSeleccionados) => {
        if (!fecha || !profesionalId || serviciosSeleccionados.length === 0) {
            setModoHorarioManualCompleto(false);
            return [];
        }

        const profesionalObj = profesionalesList.find(p => p.id === parseInt(profesionalId));
        const adminPuedeForzarHorario = userRole === 'admin';
        const fechaBloqueada = diasCerradosFechas.includes(fecha) || profesionalObj?.fechas_libres?.includes(fecha);
        if (fechaBloqueada && !adminPuedeForzarHorario) {
            setModoHorarioManualCompleto(false);
            return [];
        }

        const duracionTotal = getDuracionManualTotal(serviciosSeleccionados);
        const configGlobal = window.salonConfig ? await window.salonConfig.get() : {};
        const minAntelacionHoras = configGlobal?.min_antelacion_horas ?? 2;
        const maxAntelacionDias = configGlobal?.max_antelacion_dias ?? 30;
        const respetarLimitesAntelacion = userRole !== 'admin' && !reservaEditando;

        const horarios = await window.salonConfig.getHorariosProfesionalParaFecha(profesionalId, fecha);
        const [year, month, day] = fecha.split('-').map(Number);
        const fechaLocal = new Date(year, month - 1, day);
        const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaSemana = nombresDias[fechaLocal.getDay()];
        const diasTrabajo = horarios.dias || [];
        let horasTrabajo = horarios.horariosPorDia?.[diaSemana] || horarios.horas || [];
        const descansosDelDia = horarios.descansosPorDia?.[diaSemana] || [];
        const diaSinJornada = diasTrabajo.length > 0 && !diasTrabajo.includes(diaSemana);
        const sinHorasConfiguradas = horasTrabajo.length === 0;
        const usarHorarioManualCompleto = adminPuedeForzarHorario && (fechaBloqueada || diaSinJornada || sinHorasConfiguradas);

        setModoHorarioManualCompleto(usarHorarioManualCompleto);

        if (diaSinJornada && !usarHorarioManualCompleto) return [];
        if (sinHorasConfiguradas && !usarHorarioManualCompleto) return [];

        const primerServicio = serviciosSeleccionados[0];
        let horasTrabajoFiltradas = horasTrabajo;
        if (!usarHorarioManualCompleto && primerServicio?.horarios_permitidos?.length) {
            horasTrabajoFiltradas = horasTrabajo.filter(indice => servicioPermiteHorario(primerServicio, indiceToHoraLegible(indice)));
        }
        const slotsTrabajo = usarHorarioManualCompleto
            ? Array.from(
                { length: Math.floor((24 * 60) / Math.max(15, Number(configGlobal?.intervalo_entre_turnos || 30))) },
                (_, index) => minutesToHoraLegible(index * Math.max(15, Number(configGlobal?.intervalo_entre_turnos || 30)))
            )
            : horasTrabajoFiltradas.map(indice => indiceToHoraLegible(indice));

        const negocioId = typeof getNegocioId === "function" ? getNegocioId() : (window.getNegocioIdFromConfig ? window.getNegocioIdFromConfig() : localStorage.getItem("negocioId"));
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=eq.${fecha}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=id,hora_inicio,hora_fin`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );

        if (!response.ok) throw new Error(await response.text());
        const reservas = (await response.json()).filter(reserva => reserva.id !== reservaEditando?.id);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const diffDias = Math.ceil((new Date(year, month - 1, day) - hoy) / (1000 * 60 * 60 * 24));
        const minFechaPermitida = new Date(Date.now() + (minAntelacionHoras * 60 * 60 * 1000));

        if (respetarLimitesAntelacion && Number(maxAntelacionDias) > 0 && diffDias > Number(maxAntelacionDias)) return [];

        const disponibles = slotsTrabajo.filter(slot => {
            const [horas, minutos] = slot.split(':').map(Number);
            const slotStart = horas * 60 + minutos;
            const slotEnd = slotStart + duracionTotal;
            const fechaHoraSlot = new Date(year, month - 1, day, horas, minutos, 0);

            if (usarHorarioManualCompleto && slotEnd > 24 * 60) return false;
            if (respetarLimitesAntelacion && fechaHoraSlot < minFechaPermitida) return false;

            if (!usarHorarioManualCompleto && slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) {
                return false;
            }

            return !reservas.some(reserva => {
                const reservaStart = timeToMinutes(reserva.hora_inicio);
                const reservaEnd = timeToMinutes(reserva.hora_fin);
                return (slotStart < reservaEnd) && (slotEnd > reservaStart);
            });
        });

        if (reservaEditando?.fecha === fecha && reservaEditando?.hora_inicio) {
            disponibles.push(reservaEditando.hora_inicio);
        }

        return ordenarHorarios(disponibles);
    };

    React.useEffect(() => {
        const cargarHorarios = async () => {
            if (!nuevaReservaData.profesional_id || !nuevaReservaData.fecha || !nuevaReservaData.servicio) {
                setHorariosDisponibles([]);
                setModoHorarioManualCompleto(false);
                return;
            }

            try {
                const serviciosSeleccionados = getServiciosManualSeleccionados();
                if (serviciosSeleccionados.length === 0) {
                    setModoHorarioManualCompleto(false);
                    return;
                }
                const disponibles = await calcularHorariosDisponiblesManual(
                    nuevaReservaData.fecha,
                    nuevaReservaData.profesional_id,
                    serviciosSeleccionados
                );

                setHorariosDisponibles(disponibles);

            } catch (error) {
                console.error('Error cargando horarios:', error);
                setHorariosDisponibles([]);
                setModoHorarioManualCompleto(false);
            }
        };

        cargarHorarios();
    }, [nuevaReservaData.profesional_id, nuevaReservaData.fecha, nuevaReservaData.servicio, nuevaReservaData.duracion_personalizada, nuevaReservaData.hora_inicio, nuevaReservaData.hora_fin, serviciosManualSeleccionados, serviciosList, reservaEditando]);
    
    const cargarDisponibilidadMes = async (fecha, profesionalId) => {
        if (!profesionalId) return;
        
        try {
            const year = fecha.getFullYear();
            const month = fecha.getMonth();
            const serviciosSeleccionados = getServiciosManualSeleccionados();
            if (serviciosSeleccionados.length === 0 && !reservaEditando) {
                setFechasConHorarios({});
                return;
            }
            const duracion = getDuracionManualTotal(serviciosSeleccionados);
            const configGlobal = window.salonConfig ? await window.salonConfig.get() : {};
            const minAntelacionHoras = configGlobal?.min_antelacion_horas ?? 2;
            const maxAntelacionDias = configGlobal?.max_antelacion_dias ?? 30;
            const respetarLimitesAntelacion = userRole !== 'admin' && !reservaEditando;
            
            const primerDia = new Date(year, month, 1);
            const ultimoDia = new Date(year, month + 1, 0);
            
            const fechaInicio = primerDia.toISOString().split('T')[0];
            const fechaFin = ultimoDia.toISOString().split('T')[0];
            
            const negocioId = typeof getNegocioId === "function" ? getNegocioId() : (window.getNegocioIdFromConfig ? window.getNegocioIdFromConfig() : localStorage.getItem("negocioId"));
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=gte.${fechaInicio}&fecha=lte.${fechaFin}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=id,fecha,hora_inicio,hora_fin`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            if (!response.ok) throw new Error(await response.text());
            const reservas = (await response.json()).filter(reserva => reserva.id !== reservaEditando?.id);
            
            const reservasPorFecha = {};
            (reservas || []).forEach(r => {
                if (!reservasPorFecha[r.fecha]) {
                    reservasPorFecha[r.fecha] = [];
                }
                reservasPorFecha[r.fecha].push(r);
            });
            
            const disponibilidad = {};
            const conteosDisponibles = {};
            const diasEnMes = ultimoDia.getDate();
            const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const profesionalObj = profesionalesList.find(p => p.id === parseInt(profesionalId));
            const fechasLibresPersonales = profesionalObj?.fechas_libres || [];
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const minFechaPermitida = new Date(Date.now() + (minAntelacionHoras * 60 * 60 * 1000));

            const fechasDelMes = Array.from({ length: diasEnMes }, (_, i) => `${year}-${(month + 1).toString().padStart(2, '0')}-${(i + 1).toString().padStart(2, '0')}`);
            const horariosPorFecha = await window.salonConfig.getHorariosProfesionalParaFechas(profesionalId, fechasDelMes);

            for (let d = 1; d <= diasEnMes; d++) {
                const fechaStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                const fechaActual = new Date(year, month, d);
                const diaSemana = nombresDias[fechaActual.getDay()];
                const horarios = horariosPorFecha[fechaStr] || {};
                const horasTrabajo = horarios.horas || [];
                const diasTrabajo = horarios.dias || [];
                const horariosPorDia = horarios.horariosPorDia || {};
                const descansosPorDia = horarios.descansosPorDia || {};
                const diffDias = Math.ceil((fechaActual - hoy) / (1000 * 60 * 60 * 24));

                if (respetarLimitesAntelacion && Number(maxAntelacionDias) > 0 && diffDias > Number(maxAntelacionDias)) {
                    disponibilidad[fechaStr] = false;
                    conteosDisponibles[fechaStr] = 0;
                    continue;
                }

                if (diasCerradosFechas.includes(fechaStr) || fechasLibresPersonales.includes(fechaStr)) {
                    disponibilidad[fechaStr] = false;
                    conteosDisponibles[fechaStr] = 0;
                    continue;
                }

                if (diasTrabajo.length > 0 && !diasTrabajo.includes(diaSemana)) {
                    disponibilidad[fechaStr] = false;
                    conteosDisponibles[fechaStr] = 0;
                    continue;
                }

                let horariosDelDia = horariosPorDia[diaSemana] || horasTrabajo;
                const primerServicio = serviciosSeleccionados[0];
                if (primerServicio?.horarios_permitidos?.length) {
                    horariosDelDia = horariosDelDia.filter(indice => servicioPermiteHorario(primerServicio, indiceToHoraLegible(indice)));
                }

                if (horariosDelDia.length === 0) {
                    disponibilidad[fechaStr] = false;
                    conteosDisponibles[fechaStr] = 0;
                    continue;
                }

                const descansosDelDia = descansosPorDia[diaSemana] || [];
                const reservasDia = reservasPorFecha[fechaStr] || [];
                const tieneSlotLibre = horariosDelDia.some(horaIndice => {
                    const slotStr = indiceToHoraLegible(horaIndice);
                    const slotStart = timeToMinutes(slotStr);
                    const slotEnd = slotStart + duracion;
                    const fechaHoraSlot = new Date(year, month, d, Math.floor(slotStart / 60), slotStart % 60, 0);

                    if (respetarLimitesAntelacion && fechaHoraSlot < minFechaPermitida) {
                        return false;
                    }

                    if (slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) {
                        return false;
                    }

                    return !reservasDia.some(reserva => {
                        const reservaStart = timeToMinutes(reserva.hora_inicio);
                        const reservaEnd = timeToMinutes(reserva.hora_fin);
                        return (slotStart < reservaEnd) && (slotEnd > reservaStart);
                    });
                });
                
                disponibilidad[fechaStr] = tieneSlotLibre;
            }
            
            setFechasConHorarios(disponibilidad);
        } catch (error) {
            console.error('Error cargando disponibilidad:', error);
        }
    };

    const cargarDisponibilidadDelMes = async (fecha, profesionalId = null) => {
        if (!profesionalId && profesionalesList.length > 0) {
            profesionalId = profesionalesList[0]?.id;
        }
        if (!profesionalId) {
            setDisponibilidadDias({});
            setDisponibilidadConteos({});
            return;
        }
        
        setDisponibilidadCargando(true);
        try {
            const year = fecha.getFullYear();
            const month = fecha.getMonth();
            
            const profesionalObj = profesionalesList.find(p => p.id === profesionalId);
            const fechasLibresPersonales = profesionalObj?.fechas_libres || [];
            
            const primerDia = new Date(year, month, 1);
            const ultimoDia = new Date(year, month + 1, 0);
            
            const fechaInicio = primerDia.toISOString().split('T')[0];
            const fechaFin = ultimoDia.toISOString().split('T')[0];
            
            const negocioId = typeof getNegocioId === "function" ? getNegocioId() : (window.getNegocioIdFromConfig ? window.getNegocioIdFromConfig() : localStorage.getItem("negocioId"));
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=gte.${fechaInicio}&fecha=lte.${fechaFin}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=fecha,hora_inicio,hora_fin`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            if (!response.ok) throw new Error(await response.text());
            const reservas = await response.json();
            
            const reservasPorFecha = {};
            (reservas || []).forEach(r => {
                if (!reservasPorFecha[r.fecha]) {
                    reservasPorFecha[r.fecha] = [];
                }
                reservasPorFecha[r.fecha].push(r);
            });
            
            const disponibilidad = {};
            const conteosDisponibles = {};
            const diasEnMes = ultimoDia.getDate();
            const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

            const fechasDelMes = Array.from({ length: diasEnMes }, (_, i) => `${year}-${(month + 1).toString().padStart(2, '0')}-${(i + 1).toString().padStart(2, '0')}`);
            const horariosPorFecha = await window.salonConfig.getHorariosProfesionalParaFechas(profesionalId, fechasDelMes);

            for (let d = 1; d <= diasEnMes; d++) {
                const fechaStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

                if (fechasLibresPersonales.includes(fechaStr)) {
                    disponibilidad[fechaStr] = false;
                    conteosDisponibles[fechaStr] = 0;
                    continue;
                }

                const fechaActual = new Date(year, month, d);
                const diaSemana = nombresDias[fechaActual.getDay()];
                const horarios = horariosPorFecha[fechaStr] || {};
                const horasTrabajo = horarios.horas || [];
                const diasTrabajo = horarios.dias || [];
                const horariosPorDia = horarios.horariosPorDia || {};
                const descansosPorDia = horarios.descansosPorDia || {};
                
                const horariosDelDia = (horariosPorDia[diaSemana] && horariosPorDia[diaSemana].length ? horariosPorDia[diaSemana] : horasTrabajo) || [];
                const descansosDelDia = descansosPorDia[diaSemana] || [];
                
                if (horariosDelDia.length === 0) {
                    disponibilidad[fechaStr] = false;
                    conteosDisponibles[fechaStr] = 0;
                    continue;
                }
                
                let trabajaEsteDia = true;
                if (diasTrabajo.length > 0 && !diasTrabajo.includes(diaSemana)) {
                    trabajaEsteDia = false;
                }
                
                if (!trabajaEsteDia) {
                    disponibilidad[fechaStr] = false;
                    conteosDisponibles[fechaStr] = 0;
                    continue;
                }
                
                let horariosOcupados = 0;
                let horariosDisponiblesDia = 0;
                const reservasDia = reservasPorFecha[fechaStr] || [];
                
                const hoy = getCurrentLocalDate();
                if (fechaStr === hoy) {
                    console.log(`   Horarios del día:`, horariosDelDia.map(i => indiceToHoraLegible(i)));
                }
                
                for (const horaIndice of horariosDelDia) {
                    const slotStr = indiceToHoraLegible(horaIndice);
                    const [horas, minutos] = slotStr.split(':').map(Number);
                    const slotStart = horas * 60 + minutos;
                    const slotEnd = slotStart + 60;

                    if (slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) {
                        continue;
                    }

                    horariosDisponiblesDia++;
                    
                    const tieneConflicto = reservasDia.some(reserva => {
                        const reservaStart = timeToMinutes(reserva.hora_inicio);
                        const reservaEnd = timeToMinutes(reserva.hora_fin);
                        return (slotStart < reservaEnd) && (slotEnd > reservaStart);
                    });
                    
                    if (tieneConflicto) {
                        horariosOcupados++;
                        if (fechaStr === hoy) {
                        }
                    } else {
                        if (fechaStr === hoy) {
                        }
                    }
                }
                
                const tieneDisponibilidad = horariosDisponiblesDia > 0 && horariosOcupados < horariosDisponiblesDia;
                
                if (fechaStr === hoy) {
                }
                
                disponibilidad[fechaStr] = tieneDisponibilidad;
                conteosDisponibles[fechaStr] = Math.max(0, horariosDisponiblesDia - horariosOcupados);
            }
            
            setDisponibilidadDias(disponibilidad);
            setDisponibilidadConteos(conteosDisponibles);
        } catch (error) {
            console.error('Error cargando disponibilidad del mes:', error);
        } finally {
            setDisponibilidadCargando(false);
        }
    };

    const cargarDisponibilidadSemanal = async (fecha, profesionalId = null) => {
        if (!profesionalId && profesionalesList.length > 0) profesionalId = profesionalesList[0]?.id;
        if (!profesionalId) {
            setDisponibilidadSemanal([]);
            return;
        }

        setDisponibilidadCargando(true);
        try {
            const profesionalObj = profesionalesList.find(p => p.id === parseInt(profesionalId));
            const fechasLibresPersonales = profesionalObj?.fechas_libres || [];
            const diasSemanaVista = getDiasSemanaDisponibilidad(fecha);
            const fechaInicio = formatDate(diasSemanaVista[0]);
            const fechaFin = formatDate(diasSemanaVista[6]);
            const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const negocioId = typeof getNegocioId === "function" ? getNegocioId() : (window.getNegocioIdFromConfig ? window.getNegocioIdFromConfig() : localStorage.getItem("negocioId"));
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=gte.${fechaInicio}&fecha=lte.${fechaFin}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=fecha,hora_inicio,hora_fin,cliente_nombre,servicio,estado`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );

            if (!response.ok) throw new Error(await response.text());
            const reservas = await response.json();
            const reservasPorFecha = {};
            (reservas || []).forEach(r => {
                if (!reservasPorFecha[r.fecha]) reservasPorFecha[r.fecha] = [];
                reservasPorFecha[r.fecha].push(r);
            });

            const fechasSemana = diasSemanaVista.map(formatDate);
            const horariosPorFecha = await window.salonConfig.getHorariosProfesionalParaFechas(profesionalId, fechasSemana);

            const semana = diasSemanaVista.map(dia => {
                const fechaStr = formatDate(dia);
                const diaSemana = nombresDias[dia.getDay()];
                const horarios = horariosPorFecha[fechaStr] || {};
                const horasTrabajo = horarios.horas || [];
                const diasTrabajo = horarios.dias || [];
                const horariosPorDia = horarios.horariosPorDia || {};
                const descansosPorDia = horarios.descansosPorDia || {};
                const reservasDia = reservasPorFecha[fechaStr] || [];
                const horariosDelDia = (horariosPorDia[diaSemana] && horariosPorDia[diaSemana].length ? horariosPorDia[diaSemana] : horasTrabajo) || [];
                const descansosDelDia = descansosPorDia[diaSemana] || [];
                const esCerrado = diasCerradosFechas.includes(fechaStr);
                const esPasado = fechaStr < getCurrentLocalDate();
                const esLibre = fechasLibresPersonales.includes(fechaStr);
                const trabaja = !(diasTrabajo.length > 0 && !diasTrabajo.includes(diaSemana));

                const turnos = horariosDelDia.map(horaIndice => {
                    const hora = indiceToHoraLegible(horaIndice);
                    const slotStart = timeToMinutes(hora);
                    const slotEnd = slotStart + 60;

                    if (esCerrado) return { hora, estado: 'Cerrado', detalle: t('Local cerrado') };
                    if (esPasado) return { hora, estado: 'Pasado', detalle: t('Fecha pasada') };
                    if (esLibre) return { hora, estado: 'Libre', detalle: t('{nombre} no trabaja', { nombre: profesionalObj?.nombre || t('Profesional') }) };
                    if (!trabaja) return { hora, estado: 'No trabaja', detalle: t('Dia no laboral') };
                    if (slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) return { hora, estado: 'Descanso', detalle: t('Descanso configurado') };

                    const reserva = reservasDia.find(item => {
                        const reservaStart = timeToMinutes(item.hora_inicio);
                        const reservaEnd = timeToMinutes(item.hora_fin);
                        return (slotStart < reservaEnd) && (slotEnd > reservaStart);
                    });

                    if (reserva) {
                        return { hora, estado: 'Ocupado', detalle: `${reserva.cliente_nombre || t('Cliente')} - ${reserva.servicio || t('Servicio')}` };
                    }

                    return { hora, estado: 'Disponible', detalle: t('Disponible') };
                });

                return {
                    fecha: fechaStr,
                    diaNombre: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
                    turnos,
                    libres: turnos.filter(t => t.estado === 'Disponible').length
                };
            });

            setDisponibilidadSemanal(semana);
        } catch (error) {
            console.error('Error cargando disponibilidad semanal:', error);
            setDisponibilidadSemanal([]);
        } finally {
            setDisponibilidadCargando(false);
        }
    };
    
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days = [];
        
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }
        
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        
        return days;
    };
    
    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    
    const isDateAvailable = (date) => {
        if (!date || !nuevaReservaData.profesional_id) return false;
        
        const fechaStr = formatDate(date);
        
        const hoy = getCurrentLocalDate();
        if (fechaStr < hoy) {
            return false;
        }

        if (userRole === 'admin') {
            return true;
        }

        if (diasCerradosFechas.includes(fechaStr)) {
            return false;
        }
        
        const profesional = profesionalesList.find(p => p.id === parseInt(nuevaReservaData.profesional_id));
        if (profesional && profesional.fechas_libres && profesional.fechas_libres.includes(fechaStr)) {
            return false;
        }
        
        const diaSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][date.getDay()];
        if (diasLaborales.length > 0 && !diasLaborales.includes(diaSemana)) {
            return false;
        }
        
        return fechasConHorarios[fechaStr] || false;
    };
    
    const handleDateSelect = (date) => {
        if (isDateAvailable(date)) {
            const fechaStr = formatDate(date);
            setNuevaReservaData({...nuevaReservaData, fecha: fechaStr, hora_inicio: '', hora_fin: ''});
        }
    };
    
    const cambiarMes = (direccion) => {
        const nuevaFecha = new Date(currentDate);
        nuevaFecha.setMonth(currentDate.getMonth() + direccion);
        setCurrentDate(nuevaFecha);
        
        if (nuevaReservaData.profesional_id) {
            cargarDisponibilidadMes(nuevaFecha, nuevaReservaData.profesional_id);
        }
    };
    
    const cambiarMesDisponibilidad = (direccion) => {
        const nuevaFecha = new Date(disponibilidadFecha);
        nuevaFecha.setMonth(disponibilidadFecha.getMonth() + direccion);
        setDisponibilidadFecha(nuevaFecha);
        if (modoDisponibilidad === 'semana') {
            cargarDisponibilidadSemanal(nuevaFecha, profesionalSeleccionadoDispo);
        } else {
            cargarDisponibilidadDelMes(nuevaFecha, profesionalSeleccionadoDispo);
        }
    };

    const inicioSemana = (date) => {
        const base = new Date(date);
        base.setHours(0, 0, 0, 0);
        const dia = base.getDay();
        const diff = dia === 0 ? -6 : 1 - dia;
        base.setDate(base.getDate() + diff);
        return base;
    };

    const getDiasSemanaDisponibilidad = (date) => {
        const inicio = inicioSemana(date);
        return Array.from({ length: 7 }, (_, index) => {
            const dia = new Date(inicio);
            dia.setDate(inicio.getDate() + index);
            return dia;
        });
    };

    const cambiarSemanaDisponibilidad = (direccion) => {
        const nuevaFecha = new Date(disponibilidadFecha);
        nuevaFecha.setDate(disponibilidadFecha.getDate() + (direccion * 7));
        setDisponibilidadFecha(nuevaFecha);
        cargarDisponibilidadSemanal(nuevaFecha, profesionalSeleccionadoDispo);
    };

    const compartirDisponibilidadSemanalTexto = () => {
        const profesional = profesionalesList.find(p => p.id === parseInt(profesionalSeleccionadoDispo));
        const lineas = [
            `Disponibilidad semanal - ${nombreNegocio}`,
            profesional ? `Profesional: ${profesional.nombre}` : '',
            ''
        ].filter(Boolean);

        disponibilidadSemanal.forEach(dia => {
            const disponibles = dia.turnos.filter(t => t.estado === 'Disponible').map(t => formatTo12Hour(t.hora));
            const ocupados = dia.turnos.filter(t => t.estado === 'Ocupado').map(t => `${formatTo12Hour(t.hora)} ocupado`);
            const estado = disponibles.length > 0 ? disponibles.join(', ') : 'Sin turnos disponibles';
            lineas.push(`${dia.diaNombre} ${dia.fecha}: ${estado}`);
            if (ocupados.length > 0) lineas.push(`Ocupados: ${ocupados.join(', ')}`);
        });

        const texto = encodeURIComponent(lineas.join('\n'));
        window.open(`https://wa.me/?text=${texto}`, '_blank');
    };

    const canvasToBlob = (canvas) => new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));

    const blobToBase64 = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    const compartirImagenDesdeCanvas = async (canvas, fileName, title, text) => {
        const blob = await canvasToBlob(canvas);
        if (!blob) return false;

        const capacitor = window.Capacitor;
        const plugins = capacitor?.Plugins || {};
        const Filesystem = plugins.Filesystem;
        const Share = plugins.Share;
        const Directory = Filesystem?.Directory || window.Capacitor?.FilesystemDirectory;

        if (Filesystem?.writeFile && Share?.share) {
            try {
                const data = await blobToBase64(blob);
                const saved = await Filesystem.writeFile({
                    path: fileName,
                    data,
                    directory: Directory?.Cache || 'CACHE',
                    recursive: true
                });
                await Share.share({
                    title,
                    text,
                    files: [saved.uri]
                });
                return true;
            } catch (error) {
                console.warn('No se pudo compartir con Capacitor, usando fallback:', error);
            }
        }

        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
            await navigator.share({ title, text, files: [file] });
            return true;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return false;
    };

    const dibujarTextoCentrado = (ctx, texto, x, y, maxWidth, lineHeight) => {
        const palabras = String(texto || '').split(' ');
        const lineas = [];
        let linea = '';

        palabras.forEach(palabra => {
            const prueba = linea ? `${linea} ${palabra}` : palabra;
            if (ctx.measureText(prueba).width > maxWidth && linea) {
                lineas.push(linea);
                linea = palabra;
            } else {
                linea = prueba;
            }
        });
        if (linea) lineas.push(linea);

        lineas.forEach((item, index) => ctx.fillText(item, x, y + (index * lineHeight)));
        return y + (lineas.length * lineHeight);
    };

    const generarImagenDisponibilidadSemanal = async () => {
        const profesional = profesionalesList.find(p => p.id === parseInt(profesionalSeleccionadoDispo));
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');
        const semanaInicio = disponibilidadSemanal[0]?.fecha || formatDate(getDiasSemanaDisponibilidad(disponibilidadFecha)[0]);
        const semanaFin = disponibilidadSemanal[6]?.fecha || formatDate(getDiasSemanaDisponibilidad(disponibilidadFecha)[6]);

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#fff7fb');
        gradient.addColorStop(0.45, '#ffffff');
        gradient.addColorStop(1, '#fdf2f8');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#be185d';
        ctx.beginPath();
        ctx.arc(980, 120, 180, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(244,114,182,0.22)';
        ctx.beginPath();
        ctx.arc(120, 1820, 220, 0, Math.PI * 2);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#831843';
        ctx.font = '800 58px Arial';
        dibujarTextoCentrado(ctx, nombreNegocio || 'Exotic Nails by Yuly', 540, 145, 850, 64);

        ctx.fillStyle = '#374151';
        ctx.font = '700 34px Arial';
        ctx.fillText('Disponibilidad semanal', 540, 265);

        ctx.fillStyle = '#6b7280';
        ctx.font = '500 28px Arial';
        ctx.fillText(`${semanaInicio} - ${semanaFin}`, 540, 312);
        if (profesional?.nombre) {
            ctx.fillText(`Profesional: ${profesional.nombre}`, 540, 355);
        }

        const cardX = 70;
        const cardY = 430;
        const cardW = 940;
        const cardH = 1230;
        const columnW = cardW / 7;
        const radius = 34;

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(15, 23, 42, 0.14)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 14;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, radius);
        ctx.fill();
        ctx.shadowColor = 'transparent';

        disponibilidadSemanal.forEach((dia, index) => {
            const x = cardX + (index * columnW);
            const disponibles = dia.turnos.filter(turno => turno.estado === 'Disponible');
            const headerH = 150;

            ctx.fillStyle = disponibles.length > 0 ? '#ecfdf5' : '#f3f4f6';
            ctx.beginPath();
            ctx.rect(x, cardY, columnW, headerH);
            ctx.fill();

            if (index > 0) {
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, cardY);
                ctx.lineTo(x, cardY + cardH);
                ctx.stroke();
            }

            ctx.textAlign = 'center';
            ctx.fillStyle = '#111827';
            ctx.font = '800 27px Arial';
            ctx.fillText(dia.diaNombre.slice(0, 3).toUpperCase(), x + columnW / 2, cardY + 58);
            ctx.fillStyle = '#6b7280';
            ctx.font = '600 21px Arial';
            ctx.fillText(dia.fecha.slice(5), x + columnW / 2, cardY + 94);

            const slotX = x + 12;
            let y = cardY + headerH + 42;
            const slotW = columnW - 24;
            const slotH = 82;
            const gap = 24;

            if (disponibles.length === 0) {
                ctx.strokeStyle = '#d1d5db';
                ctx.setLineDash([8, 8]);
                ctx.strokeRect(slotX, y, slotW, 190);
                ctx.setLineDash([]);
                ctx.fillStyle = '#9ca3af';
                ctx.font = '700 20px Arial';
                dibujarTextoCentrado(ctx, 'Sin turnos', x + columnW / 2, y + 90, slotW - 16, 24);
            } else {
                disponibles.slice(0, 8).forEach(turno => {
                    const g = ctx.createLinearGradient(slotX, y, slotX, y + slotH);
                    g.addColorStop(0, '#34d399');
                    g.addColorStop(1, '#16a34a');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.roundRect(slotX, y, slotW, slotH, 22);
                    ctx.fill();

                    ctx.fillStyle = '#ffffff';
                    ctx.font = '900 24px Arial';
                    ctx.fillText(formatTo12Hour(turno.hora).replace(' ', ''), x + columnW / 2, y + 50);
                    y += slotH + gap;
                });
            }
        });

        ctx.fillStyle = '#831843';
        ctx.font = '800 34px Arial';
        ctx.fillText('Reserva tu turno', 540, 1740);
        ctx.fillStyle = '#6b7280';
        ctx.font = '500 26px Arial';
        ctx.fillText('Horarios sujetos a disponibilidad al momento de reservar', 540, 1790);

        ctx.fillStyle = '#be185d';
        ctx.font = '800 30px Arial';
        ctx.fillText('ByReservasRoma', 540, 1850);

        return canvas;
    };

    const compartirDisponibilidadSemanal = async () => {
        try {
            if (!disponibilidadSemanal.length) return;
            const canvas = await generarImagenDisponibilidadSemanal();
            const compartido = await compartirImagenDesdeCanvas(
                canvas,
                `disponibilidad-${nombreNegocio || 'salon'}.png`,
                `Disponibilidad semanal - ${nombreNegocio}`,
                `Disponibilidad semanal de ${nombreNegocio}`
            );
            if (!compartido) alert(t('Imagen generada. Si no se abrio el menu de compartir, revisa Descargas.'));
        } catch (error) {
            console.error('Error generando imagen de disponibilidad:', error);
            compartirDisponibilidadSemanalTexto();
        }
    };

    const generarImagenDisponibilidadMensual = async () => {
        const profesional = profesionalesList.find(p => p.id === parseInt(profesionalSeleccionadoDispo));
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');
        const year = disponibilidadFecha.getFullYear();
        const month = disponibilidadFecha.getMonth();
        const monthTitle = `${monthNames[month]} ${year}`;
        const diasDelMes = getDaysInMonth(disponibilidadFecha);

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#fff7fb');
        gradient.addColorStop(0.48, '#ffffff');
        gradient.addColorStop(1, '#fdf2f8');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#be185d';
        ctx.beginPath();
        ctx.arc(970, 120, 180, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(244,114,182,0.22)';
        ctx.beginPath();
        ctx.arc(120, 1810, 220, 0, Math.PI * 2);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#831843';
        ctx.font = '800 58px Arial';
        dibujarTextoCentrado(ctx, nombreNegocio || 'Exotic Nails by Yuly', 540, 145, 850, 64);

        ctx.fillStyle = '#374151';
        ctx.font = '700 34px Arial';
        ctx.fillText('Disponibilidad mensual', 540, 265);

        ctx.fillStyle = '#6b7280';
        ctx.font = '500 28px Arial';
        ctx.fillText(monthTitle, 540, 312);
        if (profesional?.nombre) {
            ctx.fillText(`Profesional: ${profesional.nombre}`, 540, 355);
        }

        const cardX = 70;
        const cardY = 430;
        const cardW = 940;
        const cardH = 1150;
        const colW = cardW / 7;
        const headerH = 86;
        const rowH = (cardH - headerH) / 6;
        const diasCabecera = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(15, 23, 42, 0.14)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 14;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 34);
        ctx.fill();
        ctx.shadowColor = 'transparent';

        diasCabecera.forEach((dia, index) => {
            const x = cardX + index * colW;
            ctx.fillStyle = index === 0 || index === 6 ? '#fdf2f8' : '#f9fafb';
            ctx.fillRect(x, cardY, colW, headerH);
            ctx.fillStyle = '#831843';
            ctx.font = '800 23px Arial';
            ctx.fillText(dia, x + colW / 2, cardY + 54);
        });

        diasDelMes.forEach((date, idx) => {
            const col = idx % 7;
            const row = Math.floor(idx / 7);
            const x = cardX + col * colW;
            const y = cardY + headerH + row * rowH;

            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, colW, rowH);

            if (!date) return;

            const fechaStr = formatDate(date);
            const disponible = disponibilidadDias[fechaStr] === true;
            const conteo = disponibilidadConteos[fechaStr] || 0;
            const esCerrado = diasCerradosFechas.includes(fechaStr);
            const esPasado = fechaStr < getCurrentLocalDate();
            let fill = '#f3f4f6';
            let text = '#9ca3af';

            if (esCerrado || esPasado || !disponible) {
                fill = '#f3f4f6';
                text = '#9ca3af';
            } else if (conteo >= 4) {
                fill = '#dcfce7';
                text = '#15803d';
            } else if (conteo === 3) {
                fill = '#fef3c7';
                text = '#b45309';
            } else if (conteo > 0) {
                fill = '#fee2e2';
                text = '#b91c1c';
            }

            ctx.fillStyle = fill;
            ctx.fillRect(x + 8, y + 8, colW - 16, rowH - 16);
            ctx.fillStyle = text;
            ctx.font = '800 30px Arial';
            ctx.fillText(String(date.getDate()), x + colW / 2, y + 52);

            ctx.font = '800 22px Arial';
            if (esCerrado) {
                ctx.fillText('Cerrado', x + colW / 2, y + 100);
            } else if (!esPasado && disponible) {
                ctx.fillText(`${conteo} turnos`, x + colW / 2, y + 100);
            } else {
                ctx.fillText('Sin turnos', x + colW / 2, y + 100);
            }
        });

        const legendY = 1645;
        const legendas = [
            ['#dcfce7', '#15803d', '4+ tranquilo'],
            ['#fef3c7', '#b45309', '3 medio'],
            ['#fee2e2', '#b91c1c', '1-2 urgente'],
            ['#f3f4f6', '#9ca3af', 'Sin turnos']
        ];

        legendas.forEach((item, index) => {
            const x = 150 + index * 220;
            ctx.fillStyle = item[0];
            ctx.beginPath();
            ctx.roundRect(x, legendY, 38, 38, 10);
            ctx.fill();
            ctx.fillStyle = item[1];
            ctx.font = '700 21px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(item[2], x + 50, legendY + 27);
        });

        ctx.textAlign = 'center';
        ctx.fillStyle = '#831843';
        ctx.font = '800 34px Arial';
        ctx.fillText('Reserva tu turno', 540, 1740);
        ctx.fillStyle = '#6b7280';
        ctx.font = '500 26px Arial';
        ctx.fillText('Los numeros indican turnos disponibles por dia', 540, 1790);
        ctx.fillStyle = '#be185d';
        ctx.font = '800 30px Arial';
        ctx.fillText('ByReservasRoma', 540, 1850);

        return canvas;
    };

    const compartirDisponibilidadMensual = async () => {
        try {
            const canvas = await generarImagenDisponibilidadMensual();
            const compartido = await compartirImagenDesdeCanvas(
                canvas,
                `disponibilidad-mensual-${nombreNegocio || 'salon'}.png`,
                `Disponibilidad mensual - ${nombreNegocio}`,
                `Disponibilidad mensual de ${nombreNegocio}`
            );
            if (!compartido) alert(t('Imagen mensual generada. Si no se abrio el menu de compartir, revisa Descargas.'));
        } catch (error) {
            console.error('Error generando imagen mensual:', error);
            alert(t('No se pudo generar la imagen mensual.'));
        }
    };

    const validarRangoReservaManual = async ({ fecha, profesionalId, horaInicio, horaFin }) => {
        if (!fecha || !profesionalId || !horaInicio || !horaFin) {
            return { ok: false, mensaje: 'Completa fecha, hora de inicio y hora de fin.' };
        }

        const inicio = timeToMinutes(horaInicio);
        const fin = timeToMinutes(horaFin);
        if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin <= inicio) {
            return { ok: false, mensaje: 'La hora de fin debe ser mayor que la hora de inicio.' };
        }

        const horarios = await window.salonConfig.getHorariosProfesionalParaFecha(profesionalId, fecha);
        const [year, month, day] = fecha.split('-').map(Number);
        const fechaLocal = new Date(year, month - 1, day);
        const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaSemana = nombresDias[fechaLocal.getDay()];
        const descansosDelDia = horarios?.descansosPorDia?.[diaSemana] || [];

        if (slotTieneDescanso(inicio, fin, descansosDelDia)) {
            return { ok: false, mensaje: 'Ese rango cruza un descanso o espacio bloqueado del profesional.' };
        }

        const negocioId = typeof getNegocioId === "function" ? getNegocioId() : (window.getNegocioIdFromConfig ? window.getNegocioIdFromConfig() : localStorage.getItem("negocioId"));
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=eq.${fecha}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=id,hora_inicio,hora_fin`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );

        if (!response.ok) {
            return { ok: false, mensaje: await response.text() };
        }

        const reservas = (await response.json()).filter(reserva => reserva.id !== reservaEditando?.id);
        const conflicto = reservas.find(reserva => {
            const reservaStart = timeToMinutes(reserva.hora_inicio);
            const reservaEnd = timeToMinutes(reserva.hora_fin);
            return (inicio < reservaEnd) && (fin > reservaStart);
        });

        if (conflicto) {
            return {
                ok: false,
                mensaje: `Ese rango cruza otra cita (${formatTo12Hour(conflicto.hora_inicio)} - ${formatTo12Hour(conflicto.hora_fin)}).`
            };
        }

        return { ok: true };
    };
    const handleCrearReservaManual = async () => {
        if (!puedeGestionarReservas) {
            alert(t('Tu nivel de acceso solo permite ver reservas.'));
            return;
        }
        if (creandoReservaManualRef.current) return;

        if (!nuevaReservaData.cliente_nombre || !nuevaReservaData.cliente_whatsapp || 
            !nuevaReservaData.servicio || !nuevaReservaData.profesional_id || 
            !nuevaReservaData.fecha || !nuevaReservaData.hora_inicio) {
            alert(t('Completa todos los campos'));
            return;
        }

        creandoReservaManualRef.current = true;
        setCreandoReservaManual(true);

        try {
            const serviciosSeleccionados = getServiciosManualSeleccionados();
            if (serviciosSeleccionados.length === 0) {
                alert(t('Servicio no encontrado'));
                return;
            }
            
            const profesional = profesionalesList.find(p => p.id === parseInt(nuevaReservaData.profesional_id));
            if (!profesional) {
                alert(t('Profesional no encontrado'));
                return;
            }
            
            const duracionTotal = getDuracionManualTotal(serviciosSeleccionados);
            const totalServiciosManual = getTotalManualServicios(serviciosSeleccionados);
            const usaDuracionPersonalizada = tieneDuracionManualPersonalizada();
            if (duracionTotal <= 0) {
                alert(t('La duracion de la cita debe ser mayor que 0 minutos.'));
                return;
            }
            const endTime = getHoraFinManual(serviciosSeleccionados);
            const validacionRango = await validarRangoReservaManual({
                fecha: nuevaReservaData.fecha,
                profesionalId: nuevaReservaData.profesional_id,
                horaInicio: nuevaReservaData.hora_inicio,
                horaFin: endTime
            });
            if (!validacionRango.ok) {
                const horariosVigentes = await calcularHorariosDisponiblesManual(
                    nuevaReservaData.fecha,
                    nuevaReservaData.profesional_id,
                    serviciosSeleccionados
                );
                setHorariosDisponibles(horariosVigentes);
                alert(validacionRango.mensaje || 'Ese horario ya no esta disponible. Elegi otro horario.');
                return;
            }
            const configNegocio = await window.cargarConfiguracionNegocio();
            const requiereAnticipo = nuevaReservaData.requiereAnticipo;
            if (requiereAnticipo && configNegocio?.anticipos_por_servicio && window.calcularMontoAnticipoReservaSync) {
                const montoAnticipoManual = window.calcularMontoAnticipoReservaSync(configNegocio, {
                    esMultiple: serviciosSeleccionados.length > 1,
                    servicios: serviciosSeleccionados
                });
                if (!montoAnticipoManual || montoAnticipoManual <= 0) {
                    alert(t('Este servicio no tiene anticipo configurado. Configuralo en Servicios o desmarca requerir anticipo.'));
                    return;
                }
            }
            
            const bookingData = {
                cliente_nombre: nuevaReservaData.cliente_nombre,
                cliente_whatsapp: normalizarTelefonoCompletoSeguro(nuevaReservaData.cliente_whatsapp),
                servicio: nuevaReservaData.servicio,
                duracion: duracionTotal,
                profesional_id: nuevaReservaData.profesional_id,
                profesional_nombre: profesional.nombre,
                fecha: nuevaReservaData.fecha,
                hora_inicio: nuevaReservaData.hora_inicio,
                hora_fin: endTime,
                estado: requiereAnticipo ? "Pendiente" : "Reservado"
            };
            
            let result;
            if (reservaEditando) {
                const response = await fetch(
                    `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${getNegocioId()}&id=eq.${reservaEditando.id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'apikey': window.SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                            servicio: bookingData.servicio,
                            duracion: bookingData.duracion,
                            profesional_id: bookingData.profesional_id,
                            profesional_nombre: bookingData.profesional_nombre,
                            fecha: bookingData.fecha,
                            hora_inicio: bookingData.hora_inicio,
                            hora_fin: bookingData.hora_fin
                        })
                    }
                );

                if (!response.ok) {
                    result = { success: false, error: await response.text() };
                } else {
                    const data = await response.json();
                    result = { success: true, data: Array.isArray(data) ? data[0] : data };
                }
            } else if (usaDuracionPersonalizada || serviciosSeleccionados.length === 1) {
                const reservaServicio = {
                    ...bookingData,
                    servicio: bookingData.servicio,
                    duracion: duracionTotal,
                    hora_inicio: nuevaReservaData.hora_inicio,
                    hora_fin: endTime
                };

                result = await createBooking(reservaServicio);
            } else {
                const reservasCreadas = [];
                let horaActual = nuevaReservaData.hora_inicio;

                for (const servicioSeleccionado of serviciosSeleccionados) {
                    const horaFin = calculateEndTime(horaActual, servicioSeleccionado.duracion);
                    const reservaServicio = {
                        ...bookingData,
                        servicio: servicioSeleccionado.nombre,
                        duracion: servicioSeleccionado.duracion,
                        hora_inicio: horaActual,
                        hora_fin: horaFin
                    };

                    const resultadoServicio = await createBooking(reservaServicio);
                    if (!resultadoServicio.success || !resultadoServicio.data) {
                        result = resultadoServicio;
                        break;
                    }

                    reservasCreadas.push(resultadoServicio.data);
                    horaActual = horaFin;
                }

                if (reservasCreadas.length === serviciosSeleccionados.length) {
                    result = {
                        success: true,
                        data: {
                            ...reservasCreadas[0],
                            servicio: reservasCreadas.map(reserva => reserva.servicio).join(' + '),
                            duracion: duracionTotal,
                            hora_inicio: reservasCreadas[0].hora_inicio,
                            hora_fin: reservasCreadas[reservasCreadas.length - 1].hora_fin,
                            precio_original: totalServiciosManual,
                            precio_final: totalServiciosManual,
                            total_pagar: totalServiciosManual,
                            monto_total: totalServiciosManual,
                            _reservasGrupo: reservasCreadas
                        }
                    };
                } else if (reservasCreadas.length > 0) {
                    result = { success: true, data: reservasCreadas[0], parcial: true };
                }
            }
            
            if (result.success && result.data) {
                if (!reservaEditando && typeof window.crearCliente === 'function') {
                    try {
                        await window.crearCliente(bookingData.cliente_nombre, bookingData.cliente_whatsapp);
                        await loadClientesRegistrados?.();
                    } catch (clienteError) {
                        console.error('Error registrando cliente manual:', clienteError);
                    }
                }

                alert(result.parcial
                    ? t('Se crearon algunos servicios, pero uno falló. Revisa la agenda.')
                    : t('Reserva creada exitosamente como "{estado}"', { estado: t(result.data.estado) }));
                
                try {
                    if (reservaEditando) {
                        const fechaConDia = window.formatFechaCompleta ? window.formatFechaCompleta(result.data.fecha) : result.data.fecha;
                        const horaFormateada = window.formatTo12Hour ? window.formatTo12Hour(result.data.hora_inicio) : result.data.hora_inicio;
                        const lineaCalendario = typeof generarLineaCalendarioCliente === 'function' ? generarLineaCalendarioCliente(result.data) : '';
                        const mensajeCliente = `Hola *${result.data.cliente_nombre}*, tu turno fue reprogramado.\n\n*Servicio:* ${result.data.servicio}\n*Fecha:* ${fechaConDia}\n*Hora:* ${horaFormateada}\n*Profesional:* ${result.data.profesional_nombre || result.data.trabajador_nombre}\n${lineaCalendario}\nTe esperamos.`;
                        window.enviarWhatsApp(result.data.cliente_whatsapp, mensajeCliente);
                    } else if (requiereAnticipo) {
                        if (window.enviarMensajePago) {
                            await window.enviarMensajePago(result.data, configNegocio);
                        }
                    } else {
                        if (window.enviarConfirmacionReserva) {
                            await window.enviarConfirmacionReserva(result.data, configNegocio);
                        }
                        if (window.enviarNotificacionPush) {
                            const cfg = configNegocio || {};
                            const fecha = window.formatFechaCompleta ? window.formatFechaCompleta(result.data.fecha) : result.data.fecha;
                            const hora = window.formatTo12Hour ? window.formatTo12Hour(result.data.hora_inicio) : result.data.hora_inicio;
                            window.enviarNotificacionPush(
                                `${cfg.nombre || 'Salon'} - Reserva manual`,
                                `👤 ${result.data.cliente_nombre}\n💅 ${result.data.servicio}\n📅 ${fecha} ${hora}`,
                                'calendar', 'default',
                                { profesionalId: result.data.profesional_id || result.data.trabajador_id || result.data.barbero_id }
                            ).catch(e => console.warn('ntfy:', e));
                        }
                    }
                } catch (whatsappError) {
                    console.error('Error enviando WhatsApp:', whatsappError);
                    alert(t('Reserva creada, pero hubo un error al enviar el mensaje al cliente.'));
                }
                
                setShowNuevaReservaModal(false);
                setReservaEditando(null);
                setNuevaReservaData({
                    cliente_nombre: '',
                    cliente_whatsapp: '',
                    cliente_codigo_pais: codigoPaisNegocio,
                    servicio: '',
                    profesional_id: userRole === 'profesional' ? profesional?.id : '',
                    fecha: '',
                    hora_inicio: '',
                    hora_fin: '',
                    duracion_personalizada: '',
                    requiereAnticipo: false
                });
                setServiciosManualSeleccionados([]);
                setBusquedaClienteManual('');
                
                fetchBookings();
            } else {
                alert(t('Error al crear la reserva: {error}', { error: result.error || t('Error desconocido') }));
            }
        } catch (error) {
            console.error('Error creando reserva:', error);
            alert(t('Error al crear la reserva: {error}', { error: error.message }));
        } finally {
            creandoReservaManualRef.current = false;
            setCreandoReservaManual(false);
        }
    };

    const parseCsvLine = (linea, separador = ',') => {
        const valores = [];
        let actual = '';
        let entreComillas = false;
        for (let i = 0; i < linea.length; i++) {
            const char = linea[i];
            const siguiente = linea[i + 1];
            if (char === '"' && entreComillas && siguiente === '"') {
                actual += '"';
                i++;
            } else if (char === '"') {
                entreComillas = !entreComillas;
            } else if (char === separador && !entreComillas) {
                valores.push(actual.trim());
                actual = '';
            } else {
                actual += char;
            }
        }
        valores.push(actual.trim());
        return valores;
    };

    const parseClientesCsv = (texto) => {
        const lineas = String(texto || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lineas.length === 0) return [];

        const separador = (lineas[0].match(/;/g) || []).length > (lineas[0].match(/,/g) || []).length ? ';' : ',';
        const primera = parseCsvLine(lineas[0], separador).map(h => h.toLowerCase().replace(/\s+/g, '_'));
        const tieneHeader = primera.some(h => ['nombre', 'name', 'whatsapp', 'telefono', 'phone', 'celular'].includes(h));
        const headers = tieneHeader ? primera : ['nombre', 'whatsapp'];
        const datos = tieneHeader ? lineas.slice(1) : lineas;

        const idxNombre = Math.max(headers.indexOf('nombre'), headers.indexOf('name'));
        const idxWhatsapp = ['whatsapp', 'telefono', 'phone', 'celular', 'numero'].map(h => headers.indexOf(h)).find(i => i >= 0);

        return datos.map(linea => {
            const valores = parseCsvLine(linea, separador);
            const nombre = valores[idxNombre >= 0 ? idxNombre : 0] || '';
            const whatsapp = valores[idxWhatsapp >= 0 ? idxWhatsapp : 1] || '';
            return { nombre: nombre.trim(), whatsapp: whatsapp.trim() };
        }).filter(cliente => cliente.nombre && cliente.whatsapp);
    };

    const handleImportarClientesCsv = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!puedeGestionarReservas && userRole !== 'admin' && userNivel < 3) {
            alert(t('No tienes permiso para importar clientes.'));
            return;
        }

        setImportandoClientesCsv(true);
        try {
            const texto = await file.text();
            const clientes = parseClientesCsv(texto);
            if (clientes.length === 0) {
                alert(t('No se encontraron clientes validos. Usa columnas nombre,whatsapp.'));
                return;
            }

            let creados = 0;
            let fallidos = 0;
            for (const cliente of clientes) {
                const whatsapp = normalizarTelefonoCompletoSeguro(cliente.whatsapp);
                const creado = await window.crearCliente?.(cliente.nombre, whatsapp);
                if (creado) creados++;
                else fallidos++;
            }

            await loadClientesRegistrados();
            alert(t('CSV procesado. Clientes creados/actualizados: {creados}. Fallidos: {fallidos}.', { creados, fallidos }));
        } catch (error) {
            console.error('Error importando CSV de clientes:', error);
            alert(t('No se pudo importar el CSV. Revisa el formato.'));
        } finally {
            setImportandoClientesCsv(false);
        }
    };
    
    const loadClientesRegistrados = async () => {
        setCargandoClientes(true);
        try {
            if (typeof window.getClientesRegistrados !== 'function') {
                console.error('getClientesRegistrados no esta definida');
                setClientesRegistrados([]);
                return;
            }
            
            const registrados = await window.getClientesRegistrados();
            
            if (Array.isArray(registrados)) {
                setClientesRegistrados(registrados);
            } else {
                console.error('a registrados no es un array:', registrados);
                setClientesRegistrados([]);
            }
        } catch (error) {
            console.error('Error cargando registrados:', error);
            setClientesRegistrados([]);
        } finally {
            setCargandoClientes(false);
        }
    };

    const loadClientesBloqueados = async () => {
        setCargandoBloqueados(true);
        try {
            const bloqueados = await window.getClientesBloqueados?.();
            setClientesBloqueados(Array.isArray(bloqueados) ? bloqueados : []);
        } catch (error) {
            console.error('Error cargando lista negra:', error);
            setClientesBloqueados([]);
        } finally {
            setCargandoBloqueados(false);
        }
    };

    const handleBloquearCliente = async (cliente = null) => {
        if (!puedeGestionarAvanzado) {
            alert(t('No tienes permiso para bloquear clientes.'));
            return;
        }
        const nombre = cliente?.nombre || nuevoBloqueo.nombre;
        const whatsapp = cliente?.whatsapp || normalizarTelefonoCompletoSeguro(nuevoBloqueo.whatsapp, nuevoBloqueo.codigo_pais || codigoPaisNegocio);
        const motivo = cliente ? prompt('Motivo del bloqueo (opcional):', '') : nuevoBloqueo.motivo;

        if (!whatsapp) {
            alert(t('Escribe el WhatsApp del cliente.'));
            return;
        }

        if (!confirm(t('Bloquear al cliente +{telefono}?', { telefono: String(whatsapp).replace(/\D/g, '') }))) return;

        const ok = await window.bloquearCliente?.({ nombre, whatsapp, motivo });
        if (ok) {
            setNuevoBloqueo({ nombre: '', whatsapp: '', codigo_pais: codigoPaisNegocio, motivo: '' });
            await loadClientesRegistrados();
            await loadClientesBloqueados();
            alert(t('Cliente bloqueado. Ya no podrá registrarse ni reservar.'));
        } else {
            alert(t('No se pudo bloquear el cliente. Revisa que la tabla clientes_bloqueados exista en Supabase.'));
        }
    };

    const handleDesbloquearCliente = async (whatsapp) => {
        if (!puedeGestionarAvanzado) {
            alert(t('No tienes permiso para desbloquear clientes.'));
            return;
        }
        if (!confirm(t('Desbloquear al cliente +{telefono}?', { telefono: String(whatsapp).replace(/\D/g, '') }))) return;
        const ok = await window.desbloquearCliente?.(whatsapp);
        if (ok) {
            await loadClientesBloqueados();
            alert(t('Cliente desbloqueado.'));
        } else {
            alert(t('No se pudo desbloquear el cliente.'));
        }
    };

    const handleEliminarCliente = async (whatsapp) => {
        if (!puedeGestionarAvanzado) {
            alert(t('No tienes permiso para eliminar clientes.'));
            return;
        }
        if (!confirm(t('¿Seguro que quieres eliminar este cliente? Perderá el acceso a la app.'))) return;
        try {
            if (typeof window.eliminarCliente !== 'function') {
                alert(t('Error: Función no disponible'));
                return;
            }
            const resultado = await window.eliminarCliente(whatsapp);
            if (resultado) {
                await loadClientesRegistrados();
                alert(t('Cliente eliminado'));
            }
        } catch (error) {
            console.error('Error eliminando cliente:', error);
            alert(t('Error al eliminar cliente'));
        }
    };
    const fetchBookings = async () => {
        setLoading(true);
        try {
            let data;
            
            if (userRole === 'profesional' && profesional) {
                data = await window.getReservasPorProfesional?.(profesional.id, false) || [];
            } else {
                const configActual = config || (window.cargarConfiguracionNegocio ? await window.cargarConfiguracionNegocio(true) : {});
                await deleteExpiredPendingBookings(configActual);
                data = await getAllBookings();
            }
            
            if (Array.isArray(data)) {
                data = filtrarReservasDelProfesional(data);
                data.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));

                const idsCompletados = await marcarTurnosCompletados() || [];
                if (idsCompletados.length > 0) {
                    const setCompletados = new Set(idsCompletados);
                    data = data.map(b => setCompletados.has(b.id) ? { ...b, estado: 'Completado' } : b);
                }

                const reservasActualizadas = Array.isArray(data) ? data : [];
                setBookings(reservasActualizadas);

                if (window.RservasOffline?.syncFromBookings) {
                    window.RservasOffline.syncFromBookings(reservasActualizadas);
                }
            } else {
                setBookings([]);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            alert(t('Error al cargar las reservas'));
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        const intervalo = setInterval(() => {
            
            marcarTurnosCompletados().then(() => {
                fetchBookings();
            });
            
        }, 60000);
        
        return () => clearInterval(intervalo);
    }, []);

    React.useEffect(() => {
        fetchBookings();

        if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 2)) {
            loadClientesRegistrados();
            loadClientesBloqueados();
        }
    }, [userRole, userNivel, profesional]);
    const confirmarPago = async (id, bookingData) => {
        if (!puedeGestionarReservas) {
            alert(t('Tu nivel de acceso solo permite ver reservas.'));
            return;
        }
        const reservasGrupo = bookingData?._reservasGrupo || [];
        if (bookingData?._grupoVisual && reservasGrupo.length > 1) {
            if (!confirm(t('Confirmar que se recibió el pago de {nombre}? Los {n} servicios pasarán a "Reservado".', { nombre: bookingData.cliente_nombre, n: reservasGrupo.length }))) return;

            try {
                for (const reserva of reservasGrupo) {
                    const response = await fetch(
                        `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${getNegocioId()}&id=eq.${reserva.id}`,
                        {
                            method: 'PATCH',
                            headers: {
                                'apikey': window.SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ estado: 'Reservado' })
                        }
                    );

                    if (!response.ok) {
                        throw new Error('Error al confirmar pago del grupo');
                    }
                }

                const configNegocio = await window.cargarConfiguracionNegocio();
                const fechaConDia = window.formatFechaCompleta ?
                    window.formatFechaCompleta(bookingData.fecha) :
                    bookingData.fecha;
                const horaFormateada = window.formatTo12Hour ?
                    window.formatTo12Hour(bookingData.hora_inicio) :
                    bookingData.hora_inicio;
                const nombreNegocio = configNegocio?.nombre || (window.getNombreNegocio ? await window.getNombreNegocio() : 'Mi Negocio');
                const lineaCalendario = typeof generarLineaCalendarioCliente === 'function' ? generarLineaCalendarioCliente(bookingData) : '';

                const mensajeCliente =
`*${nombreNegocio} - Turno Confirmado*

Hola *${bookingData.cliente_nombre}*, tu turno ha sido CONFIRMADO.

*Fecha:* ${fechaConDia}
*Hora:* ${horaFormateada}
*Servicios:* ${bookingData.servicio}
*Profesionales:* ${bookingData.profesional_nombre || bookingData.trabajador_nombre}

*Pago recibido correctamente*

${lineaCalendario}

Te esperamos.
Cualquier cambio, puedes cancelarlo desde la app.`;

                window.enviarWhatsApp(bookingData.cliente_whatsapp, mensajeCliente);

                if (window.enviarNotificacionPush) window.enviarNotificacionPush(`${nombreNegocio} - Pago confirmado`, `✅ ${bookingData.cliente_nombre}\n💅 ${bookingData.servicio}\n📅 ${fechaConDia} ${horaFormateada}`, 'white_check_mark', 'default', { profesionalId: bookingData.profesional_id || bookingData.trabajador_id || bookingData.barbero_id }).catch(() => {});
                if (window.enviarPushCliente) window.enviarPushCliente({ whatsapp: bookingData.cliente_whatsapp, title: `✅ Pago confirmado — ${nombreNegocio}`, body: `Tu cita de ${bookingData.servicio} el ${fechaConDia} a las ${horaFormateada} está confirmada.` }).catch(() => {});

                fetchBookings();
                return;
            } catch (error) {
                console.error('Error confirmando pago del grupo:', error);
                alert(t('Error al confirmar pago del grupo'));
                return;
            }
        }

        if (!confirm(t('Confirmar que se recibió el pago de {nombre}? El turno pasará a "Reservado".', { nombre: bookingData.cliente_nombre }))) return;

        try {

            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${getNegocioId()}&id=eq.${id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ estado: 'Reservado' })
                }
            );

            if (!response.ok) {
                throw new Error('Error al confirmar pago');
            }

            const configNegocio = await window.cargarConfiguracionNegocio();
            const fechaConDia = window.formatFechaCompleta ?
                window.formatFechaCompleta(bookingData.fecha) :
                bookingData.fecha;
            const horaFormateada = window.formatTo12Hour ?
                window.formatTo12Hour(bookingData.hora_inicio) :
                bookingData.hora_inicio;
            const nombreNegocio = configNegocio?.nombre || (window.getNombreNegocio ? await window.getNombreNegocio() : 'Mi Negocio');
            const lineaCalendario = typeof generarLineaCalendarioCliente === 'function' ? generarLineaCalendarioCliente(bookingData) : '';

            const mensajeCliente =
`*${nombreNegocio} - Turno Confirmado*

Hola *${bookingData.cliente_nombre}*, tu turno ha sido CONFIRMADO.

*Fecha:* ${fechaConDia}
*Hora:* ${horaFormateada}
*Servicio:* ${bookingData.servicio}
*Profesional:* ${bookingData.profesional_nombre || bookingData.trabajador_nombre}

*Pago recibido correctamente*

${lineaCalendario}

Te esperamos.
Cualquier cambio, puedes cancelarlo desde la app.`;

            window.enviarWhatsApp(bookingData.cliente_whatsapp, mensajeCliente);

            if (window.enviarNotificacionPush) window.enviarNotificacionPush(`${nombreNegocio} - Pago confirmado`, `✅ ${bookingData.cliente_nombre}\n💅 ${bookingData.servicio}\n📅 ${fechaConDia} ${horaFormateada}`, 'white_check_mark', 'default', { profesionalId: bookingData.profesional_id || bookingData.trabajador_id || bookingData.barbero_id }).catch(() => {});
            if (window.enviarPushCliente) window.enviarPushCliente({ whatsapp: bookingData.cliente_whatsapp, title: `✅ Pago confirmado — ${nombreNegocio}`, body: `Tu cita de ${bookingData.servicio} el ${fechaConDia} a las ${horaFormateada} está confirmada.` }).catch(() => {});

            fetchBookings();

        } catch (error) {
            console.error('Error confirmando pago:', error);
            alert(t('Error al confirmar el pago'));
        }
    };

    // FUNCIÓN PARA BORRAR TODAS LAS RESERVAS CANCELADAS
    // ============================================
    const borrarCanceladas = async () => {
        if (!puedeGestionarAvanzado) {
            alert(t('No tienes permiso para borrar reservas canceladas.'));
            return;
        }
        if (!confirm(t('Estas segura de querer borrar TODAS las reservas canceladas? Esta accion no se puede deshacer.'))) return;
        
        try {
            const negocioId = getNegocioId();
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&estado=eq.Cancelado`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.ok) {
                const error = await response.text();
                console.error('Error al borrar:', error);
                alert(t('Error al borrar las reservas canceladas'));
                return;
            }
            
            alert(t('Se borraron todas las reservas canceladas correctamente'));
            fetchBookings();
            
        } catch (error) {
            console.error('Error:', error);
            alert(t('Error al conectar con el servidor'));
        }
    };

    const eliminarReservaHistorial = async (bookingData) => {
        if (!puedeGestionarAvanzado) {
            alert(t('No tenes permiso para eliminar citas del historial.'));
            return;
        }

        const estado = bookingData?.estado;
        if (estado !== 'Cancelado' && estado !== 'Completado' && estado !== 'Ausente') {
            alert(t('Solo se pueden eliminar citas canceladas, completadas o ausentes.'));
            return;
        }

        const reservasGrupo = bookingData?._reservasGrupo || [];
        const ids = reservasGrupo.length > 0 ? reservasGrupo.map(reserva => reserva.id) : [bookingData.id];
        const detalle = reservasGrupo.length > 1 ? `la cita completa (${reservasGrupo.length} servicios)` : 'esta cita';
        if (!confirm(t('Eliminar {detalle} del historial? Esta accion no se puede deshacer.', { detalle }))) return;

        try {
            const negocioId = getNegocioId();
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=in.(${ids.join(',')})`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error('Error eliminando cita:', await response.text());
                alert(t('Error al eliminar la cita'));
                return;
            }

            alert(t('Cita eliminada del historial'));
            fetchBookings();
        } catch (error) {
            console.error('Error eliminando cita:', error);
            alert(t('Error al conectar con el servidor'));
        }
    };

    const abrirModalCobro = (bookingData) => {
        if (!puedeGestionarReservas) {
            alert(t('No tenes permiso para registrar cobros.'));
            return;
        }
        if (bookingData?.estado !== 'Completado') {
            alert(t('Solo se puede registrar cobro real en citas completadas.'));
            return;
        }

        const montoActual = Number(bookingData.monto_cobrado || 0);
        setCobroEditando(bookingData);
        setCobroForm({
            monto_cobrado: montoActual > 0 ? String(montoActual) : '',
            notas_cobro: bookingData.notas_cobro || ''
        });
    };

    const guardarCobroReal = async () => {
        if (!cobroEditando || guardandoCobro) return;

        const monto = Number(String(cobroForm.monto_cobrado || '').replace(',', '.'));
        if (Number.isNaN(monto) || monto < 0) {
            alert(t('Ingresa un monto cobrado valido.'));
            return;
        }

        setGuardandoCobro(true);
        try {
            const negocioId = getNegocioId();
            const reservasGrupo = cobroEditando?._reservasGrupo || [];
            const reservas = reservasGrupo.length > 0 ? reservasGrupo : [cobroEditando];
            const precios = reservas.map(reserva => getPrecioServicioAgenda(reserva.servicio));
            const totalPrecios = precios.reduce((total, precio) => total + precio, 0);
            let acumulado = 0;

            for (let index = 0; index < reservas.length; index++) {
                const reserva = reservas[index];
                const esUltima = index === reservas.length - 1;
                const montoReserva = reservas.length === 1
                    ? monto
                    : esUltima
                        ? Number((monto - acumulado).toFixed(2))
                        : Number((monto * (totalPrecios > 0 ? precios[index] / totalPrecios : 1 / reservas.length)).toFixed(2));
                acumulado += montoReserva;

                const response = await fetch(
                    `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${reserva.id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'apikey': window.SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            monto_cobrado: montoReserva,
                            notas_cobro: cobroForm.notas_cobro || null,
                            cobro_registrado_at: new Date().toISOString()
                        })
                    }
                );

                if (!response.ok) {
                    throw new Error(await response.text());
                }
            }

            alert(t('Cobro real guardado'));
            setCobroEditando(null);
            setCobroForm({ monto_cobrado: '', notas_cobro: '' });
            fetchBookings();
        } catch (error) {
            console.error('Error guardando cobro real:', error);
            alert(t('Error al guardar el cobro real. Verifica que ejecutaste el SQL de cobro real.'));
        } finally {
            setGuardandoCobro(false);
        }
    };

    const turnoYaPaso = (bookingData) => {
        if (!bookingData?.fecha) return false;
        const hoy = getCurrentLocalDate();
        if (bookingData.fecha < hoy) return true;
        if (bookingData.fecha > hoy) return false;
        const fin = bookingData.hora_fin || calculateEndTime(bookingData.hora_inicio, bookingData.duracion || 60);
        return timeToMinutes(fin) <= getCurrentLocalMinutes();
    };

    const marcarAusencia = async (bookingData) => {
        if (!puedeGestionarReservas) {
            alert(t('No tenes permiso para marcar ausencias.'));
            return;
        }

        if (!turnoYaPaso(bookingData)) {
            alert(t('Solo se puede marcar ausencia en turnos que ya pasaron.'));
            return;
        }

        const estado = bookingData?.estado;
        if (estado === 'Cancelado' || estado === 'Ausente') {
            alert(t('Esta cita no se puede marcar como ausencia.'));
            return;
        }

        const reservasGrupo = bookingData?._reservasGrupo || [];
        const reservas = reservasGrupo.length > 0 ? reservasGrupo : [bookingData];
        const ids = reservas.map(reserva => reserva.id).filter(Boolean);
        const detalle = reservas.length > 1 ? `la cita completa (${reservas.length} servicios)` : 'esta cita';
        if (!ids.length) return;

        if (!confirm(t('Marcar {detalle} como AUSENTE?', { detalle }))) return;
        const enviarMensaje = confirm(t('Quieres enviarle ahora el mensaje de inasistencia por WhatsApp?'));

        try {
            const negocioId = getNegocioId();
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=in.(${ids.join(',')})`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ estado: 'Ausente' })
                }
            );

            if (!response.ok) {
                throw new Error(await response.text());
            }

            if (enviarMensaje && window.enviarMensajeInasistencia) {
                await window.enviarMensajeInasistencia(bookingData, config);
            }

            alert(enviarMensaje ? 'Ausencia marcada y WhatsApp preparado.' : 'Ausencia marcada.');
            fetchBookings();
        } catch (error) {
            console.error('Error marcando ausencia:', error);
            alert(t('Error al marcar la ausencia.'));
        }
    };
    const handleCancel = async (id, bookingData) => {
        if (!puedeGestionarReservas) {
            alert(t('Tu nivel de acceso solo permite ver reservas.'));
            return;
        }
        const reservasGrupo = bookingData?._reservasGrupo || [];
        if (bookingData?._grupoVisual && reservasGrupo.length > 1) {
            if (!confirm(t('¿Cancelar la cita completa de {nombre}? Se cancelarán {n} servicios.', { nombre: bookingData.cliente_nombre, n: reservasGrupo.length }))) return;

            let todoOk = true;
            for (const reserva of reservasGrupo) {
                const ok = await cancelBooking(reserva.id, reserva);
                if (!ok) todoOk = false;
            }

            if (todoOk) {
                bookingData.cancelado_por = 'admin';

                if (window.notificarCancelacion) {
                    await window.notificarCancelacion(bookingData);
                }

                alert(t('Cita completa cancelada'));
                fetchBookings();
            } else {
                alert(t('Error al cancelar uno o más servicios del grupo'));
                fetchBookings();
            }
            return;
        }

        if (!confirm(t('¿Cancelar reserva de {nombre}?', { nombre: bookingData.cliente_nombre }))) return;
        
        const ok = await cancelBooking(id, bookingData);
        if (ok) {
            
            bookingData.cancelado_por = 'admin';
            
            if (window.notificarCancelacion) {
                await window.notificarCancelacion(bookingData);
            }
            
            alert(t('Reserva cancelada'));
            fetchBookings();
        } else {
            alert(t('Error al cancelar'));
        }
    };

    const handleLogout = () => {
        if (confirm(t('¿Cerrar sesión?'))) {
            localStorage.removeItem('adminAuth');
            localStorage.removeItem('adminUser');
            localStorage.removeItem('adminLoginTime');
            localStorage.removeItem('profesionalAuth');
            localStorage.removeItem('profesionalLoginTime');
            localStorage.removeItem('userRole');
            localStorage.removeItem('clienteAuth');
            localStorage.removeItem('negocioId');
            localStorage.removeItem('adminSlug');
            window.location.href = 'index.html';
        }
    };
    // Memoizado: solo se recalcula cuando cambian bookings/userRole/profesional, en vez de
    // en cada render de todo el componente AdminApp. Dependencias trazadas a mano hasta el
    // final de la cadena (filtrarReservasDelProfesional -> esProfesionalPanel/esReservaDelProfesional
    // -> userRole/profesional), sin dependencias ocultas adicionales.
    const bookingsVisiblesPorRol = React.useMemo(
        () => filtrarReservasDelProfesional(bookings),
        [bookings, userRole, profesional]
    );
    const activasCount = bookingsVisiblesPorRol.filter(b => b.estado === 'Reservado').length;
    const pendientesCount = bookingsVisiblesPorRol.filter(b => b.estado === 'Pendiente').length;
    const completadasCount = bookingsVisiblesPorRol.filter(b => b.estado === 'Completado').length;
    const ausentesCount = bookingsVisiblesPorRol.filter(b => b.estado === 'Ausente').length;
    const canceladasCount = bookingsVisiblesPorRol.filter(b => b.estado === 'Cancelado').length;
    const filteredBookings = React.useMemo(() => {
        const filtradas = filterDate
            ? bookingsVisiblesPorRol.filter(b => b.fecha === filterDate)
            : bookingsVisiblesPorRol;

        if (statusFilter === 'activas') return filtradas.filter(b => b.estado === 'Reservado');
        if (statusFilter === 'pendientes') return filtradas.filter(b => b.estado === 'Pendiente');
        if (statusFilter === 'completadas') return filtradas.filter(b => b.estado === 'Completado');
        if (statusFilter === 'ausentes') return filtradas.filter(b => b.estado === 'Ausente');
        if (statusFilter === 'canceladas') return filtradas.filter(b => b.estado === 'Cancelado');
        return filtradas;
    }, [bookingsVisiblesPorRol, filterDate, statusFilter]);


    const construirResumenGrupoVisual = (grupo) => {
        if (grupo.length <= 1) return grupo[0];

        const ordenadas = [...grupo].sort((a, b) => String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || '')));
        const primera = ordenadas[0];
        const ultima = ordenadas[ordenadas.length - 1];
        const servicios = ordenadas.map(b => b.servicio).filter(Boolean);
        const profesionales = ordenadas.map(b => {
            const profesional = b.profesional_nombre || b.trabajador_nombre || 'Sin profesional';
            return `${b.servicio}: ${profesional}`;
        });
        const duracionTotal = ordenadas.reduce((total, b) => total + Number(b.duracion || Math.max(0, timeToMinutes(b.hora_fin || b.hora_inicio) - timeToMinutes(b.hora_inicio)) || 0), 0);
        const montoCobradoTotal = ordenadas.reduce((total, b) => total + Number(b.monto_cobrado || 0), 0);
        const notasCobro = ordenadas.map(b => b.notas_cobro).filter(Boolean).join(' | ');

        return {
            ...primera,
            id: primera.id,
            _grupoVisual: true,
            _reservasGrupo: ordenadas,
            _grupoVisualId: `grupo-${ordenadas.map(b => b.id).join('-')}`,
            servicio: servicios.join(' + '),
            profesional_nombre: profesionales.join(' | '),
            trabajador_nombre: profesionales.join(' | '),
            hora_inicio: primera.hora_inicio,
            hora_fin: ultima.hora_fin || calculateEndTime(ultima.hora_inicio, ultima.duracion || 60),
            duracion: duracionTotal,
            monto_cobrado: montoCobradoTotal || primera.monto_cobrado,
            notas_cobro: notasCobro || primera.notas_cobro,
            cobro_registrado_at: ordenadas.find(b => b.cobro_registrado_at)?.cobro_registrado_at || primera.cobro_registrado_at,
            estado: primera.estado
        };
    };

    const agruparReservasVisuales = (reservas) => {
        const normalizarTelefonoLocal = normalizarTelefonoLocalSeguro;
        const ordenadas = [...reservas].sort((a, b) =>
            String(a.fecha || '').localeCompare(String(b.fecha || '')) ||
            String(a.cliente_whatsapp || '').localeCompare(String(b.cliente_whatsapp || '')) ||
            String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || ''))
        );
        const grupos = [];

        ordenadas.forEach((reserva) => {
            const ultimoGrupo = grupos[grupos.length - 1];
            const ultimaReserva = ultimoGrupo ? ultimoGrupo[ultimoGrupo.length - 1] : null;
            const mismoCliente = ultimaReserva &&
                normalizarTelefonoLocal(ultimaReserva.cliente_whatsapp) === normalizarTelefonoLocal(reserva.cliente_whatsapp) &&
                String(ultimaReserva.cliente_nombre || '').trim().toLowerCase() === String(reserva.cliente_nombre || '').trim().toLowerCase();
            const esConsecutiva = ultimaReserva &&
                ultimaReserva.fecha === reserva.fecha &&
                ultimaReserva.estado === reserva.estado &&
                (ultimaReserva.hora_fin || calculateEndTime(ultimaReserva.hora_inicio, ultimaReserva.duracion || 60)) === reserva.hora_inicio;

            if (mismoCliente && esConsecutiva) {
                ultimoGrupo.push(reserva);
            } else {
                grupos.push([reserva]);
            }
        });

        return grupos
            .map(construirResumenGrupoVisual)
            .sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')) || String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || '')));
    };

    const filteredVisualBookings = agruparReservasVisuales(filteredBookings)
        .sort((a, b) => `${b.fecha || ''} ${b.hora_inicio || ''}`.localeCompare(`${a.fecha || ''} ${a.hora_inicio || ''}`));

    // ── TURNOS DE MAÑANA: recordatorios manuales por WhatsApp ──
    // (Va DESPUÉS de agruparReservasVisuales: es const, sin hoisting, y el
    // useMemo se ejecuta sincrónicamente durante el render. No usa addDays
    // porque esa const se declara más abajo.)
    // Turnos activos de mañana (respeta el rol: cada profesional ve los suyos).
    const fechaManana = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return formatDate(d); })();
    const turnosManana = React.useMemo(() => {
        const activos = bookingsVisiblesPorRol.filter(b =>
            b.fecha === fechaManana &&
            ['Reservado', 'Confirmado', 'Pendiente'].includes(b.estado)
        );
        return agruparReservasVisuales(activos)
            .sort((a, b) => String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || '')));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookingsVisiblesPorRol, fechaManana]);

    // "Recordado" se guarda por dispositivo (localStorage) con la fecha del
    // turno como valor, para poder limpiar las claves de días pasados.
    const [recordatoriosEnviados, setRecordatoriosEnviados] = React.useState(() => {
        const enviados = new Set();
        try {
            const hoy = getCurrentLocalDate();
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const clave = localStorage.key(i);
                if (!clave || !clave.startsWith('recordatorioManana:')) continue;
                const fechaGuardada = localStorage.getItem(clave) || '';
                if (fechaGuardada < hoy) localStorage.removeItem(clave);
                else enviados.add(clave.slice('recordatorioManana:'.length));
            }
        } catch (e) {}
        return enviados;
    });

    const enviarRecordatorioManana = (b) => {
        const hora = formatTo12Hour(b.hora_inicio);
        const fechaLegible = window.formatFechaCompleta ? window.formatFechaCompleta(b.fecha) : b.fecha;
        const profesionalNombre = b.profesional_nombre || b.trabajador_nombre || '';
        const lineas = [
            `Hola ${String(b.cliente_nombre || '').trim()}! 💖 Te recordamos tu turno de MAÑANA en ${nombreNegocio}:`,
            '',
            `🗓️ ${fechaLegible}`,
            `🕐 ${hora}`,
            `💅 Servicio: ${b.servicio}`
        ];
        if (profesionalNombre) lineas.push(`👩‍🎨 Profesional: ${profesionalNombre}`);
        lineas.push('', 'Si no puedes asistir, avísanos por aquí. ¡Te esperamos! ✨');

        window.enviarWhatsApp?.(b.cliente_whatsapp, lineas.join('\n'));

        const claveId = String(b._grupoVisualId || b.id);
        try { localStorage.setItem('recordatorioManana:' + claveId, b.fecha); } catch (e) {}
        setRecordatoriosEnviados(prev => new Set(prev).add(claveId));
    };

    const startOfWeek = (date) => {
        const base = new Date(date);
        const day = base.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        base.setDate(base.getDate() + diff);
        base.setHours(0, 0, 0, 0);
        return base;
    };

    const addDays = (date, daysToAdd) => {
        const next = new Date(date);
        next.setDate(next.getDate() + daysToAdd);
        return next;
    };

    const agendaWeekStart = startOfWeek(agendaDate);
    const agendaDays = Array.from({ length: 7 }, (_, index) => addDays(agendaWeekStart, index));
    const agendaStartStr = formatDate(agendaDays[0]);
    const agendaEndStr = formatDate(agendaDays[6]);
    const agendaBookings = agruparReservasVisuales(bookingsVisiblesPorRol
        .filter(b => b.fecha >= agendaStartStr && b.fecha <= agendaEndStr && b.estado !== 'Cancelado')
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio)));
    const agendaDateStr = formatDate(agendaDate);
    const agendaDayBookings = agendaBookings.filter(b => b.fecha === agendaDateStr);
    const agendaVisibleBookings = agendaMode === 'dia' ? agendaDayBookings : agendaBookings;
    const agendaToday = getCurrentLocalDate();
    const agendaHours = Array.from({ length: 14 }, (_, index) => index + 7);
    const agendaStartMinutes = 7 * 60;
    const agendaPxPerMinute = 1.2;
    const agendaGridHeight = 14 * 60 * agendaPxPerMinute;
    const agendaStatusStyle = {
        Reservado: 'bg-cyan-50 border-l-cyan-600 border-cyan-100 text-slate-900',
        Pendiente: 'bg-amber-50 border-l-amber-500 border-amber-100 text-amber-950',
        Completado: 'bg-emerald-50 border-l-emerald-600 border-emerald-100 text-emerald-950',
        Ausente: 'bg-slate-100 border-l-slate-500 border-slate-200 text-slate-800',
        Cancelado: 'bg-red-50 border-l-red-500 border-red-100 text-red-900'
    };
    const estadoNormalizado = (estado) => String(estado || '').trim().toLowerCase();
    const puedeEditarReserva = (booking) => {
        const estado = estadoNormalizado(booking.estado);
        if (!puedeGestionarReservas) return false;
        if (userRole === 'profesional' && profesional && !esReservaDelProfesional(booking)) return false;
        return estado !== 'cancelado' && estado !== 'cancelada' && estado !== 'completado' && estado !== 'completada' && estado !== 'ausente';
    };

    const getAgendaDayBookings = (date) => {
        const dateStr = formatDate(date);
        return agendaBookings.filter(b => b.fecha === dateStr);
    };

    const getBookingEndMinutes = (booking) => {
        const start = timeToMinutes(booking.hora_inicio);
        const end = timeToMinutes(booking.hora_fin || calculateEndTime(booking.hora_inicio, booking.duracion || 60));
        return end > start ? end : start + Number(booking.duracion || 60);
    };

    const getAgendaLayoutBookings = (dayBookings = []) => {
        const sorted = [...dayBookings].sort((a, b) => {
            const startDiff = timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio);
            if (startDiff !== 0) return startDiff;
            return getBookingEndMinutes(a) - getBookingEndMinutes(b);
        });

        const clusters = [];
        let cluster = [];
        let clusterEnd = -1;

        sorted.forEach(booking => {
            const start = timeToMinutes(booking.hora_inicio);
            const end = getBookingEndMinutes(booking);

            if (cluster.length === 0 || start < clusterEnd) {
                cluster.push(booking);
                clusterEnd = Math.max(clusterEnd, end);
            } else {
                clusters.push(cluster);
                cluster = [booking];
                clusterEnd = end;
            }
        });

        if (cluster.length > 0) clusters.push(cluster);

        return clusters.flatMap(group => {
            const columnEnds = [];
            const positioned = group.map(booking => {
                const start = timeToMinutes(booking.hora_inicio);
                const end = getBookingEndMinutes(booking);
                let columnIndex = columnEnds.findIndex(columnEnd => start >= columnEnd);

                if (columnIndex === -1) {
                    columnIndex = columnEnds.length;
                    columnEnds.push(end);
                } else {
                    columnEnds[columnIndex] = end;
                }

                return { ...booking, _agendaColumn: columnIndex };
            });

            const columnCount = Math.max(1, columnEnds.length);
            return positioned.map(booking => ({
                ...booking,
                _agendaColumns: columnCount
            }));
        });
    };

    const getAgendaBookingStyle = (booking) => {
        const columns = Math.max(1, booking._agendaColumns || 1);
        const column = Math.min(columns - 1, Math.max(0, booking._agendaColumn || 0));
        const widthPercent = 100 / columns;
        const leftPercent = column * widthPercent;
        const rightPercent = 100 - leftPercent - widthPercent;
        const halfGap = columns > 1 ? 3 : 0;

        return {
            top: `${getBookingTop(booking)}px`,
            height: `${getBookingHeight(booking)}px`,
            left: `calc(${leftPercent}% + 0.5rem + ${column > 0 ? halfGap : 0}px)`,
            right: `calc(${rightPercent}% + 0.5rem + ${column < columns - 1 ? halfGap : 0}px)`
        };
    };

    const getBookingTop = (booking) => {
        return Math.max(0, (timeToMinutes(booking.hora_inicio) - agendaStartMinutes) * agendaPxPerMinute);
    };

    const getBookingHeight = (booking) => {
        const start = timeToMinutes(booking.hora_inicio);
        const end = timeToMinutes(booking.hora_fin || calculateEndTime(booking.hora_inicio, booking.duracion || 60));
        return Math.max(44, (end - start) * agendaPxPerMinute - 4);
    };

    const agendaDayLayoutBookings = getAgendaLayoutBookings(agendaDayBookings);
    const agendaDayMaxColumns = Math.max(1, ...agendaDayLayoutBookings.map(b => b._agendaColumns || 1));
    const agendaDayMinWidth = Math.max(0, 72 + (agendaDayMaxColumns * 180));

    const normalizePhone = normalizarTelefonoLocalSeguro;

    const getReservasCliente = (cliente) => {
        const phone = normalizePhone(cliente?.whatsapp);
        if (!phone) return [];

        return bookings
            .filter(b => normalizePhone(b.cliente_whatsapp) === phone)
            .sort((a, b) => `${b.fecha || ''} ${b.hora_inicio || ''}`.localeCompare(`${a.fecha || ''} ${a.hora_inicio || ''}`));
    };

    const getClienteScore = (cliente) => {
        const phone = normalizePhone(cliente.whatsapp);
        const reservasCliente = getReservasCliente(cliente);
        const total = reservasCliente.length;
        const completadas = reservasCliente.filter(b => b.estado === 'Completado').length;
        const canceladas = reservasCliente.filter(b => b.estado === 'Cancelado').length;
        const pendientes = reservasCliente.filter(b => b.estado === 'Pendiente').length;
        const activas = reservasCliente.filter(b => b.estado === 'Reservado').length;
        const cancelRate = total ? Math.round((canceladas / total) * 100) : 0;
        const completionRate = total ? Math.round((completadas / total) * 100) : 0;
        const score = Math.max(0, Math.min(100, 50 + completadas * 12 + activas * 4 - canceladas * 18 - pendientes * 3));
        const sorted = [...reservasCliente].sort((a, b) => `${b.fecha} ${b.hora_inicio}`.localeCompare(`${a.fecha} ${a.hora_inicio}`));
        const ultima = sorted[0] || null;

        let label = t('Nuevo');
        let tone = 'bg-gray-100 text-gray-700 border-gray-200';
        if (total >= 3 && cancelRate >= 50) {
            label = t('Riesgo alto');
            tone = 'bg-red-50 text-red-700 border-red-200';
        } else if (score >= 80) {
            label = t('Excelente');
            tone = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else if (total >= 3) {
            label = t('Frecuente');
            tone = 'bg-blue-50 text-blue-700 border-blue-200';
        } else if (pendientes > 0) {
            label = t('Pendiente');
            tone = 'bg-amber-50 text-amber-700 border-amber-200';
        }

        return {
            total,
            completadas,
            canceladas,
            pendientes,
            activas,
            cancelRate,
            completionRate,
            score,
            label,
            tone,
            ultima
        };
    };

    const getAgendaTitle = () => {
        const localeFecha = idioma === 'en' ? 'en-US' : 'es-CU';
        if (agendaMode === 'dia') {
            return agendaDate.toLocaleDateString(localeFecha, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }
        return `${agendaDays[0].toLocaleDateString(localeFecha, { day: 'numeric', month: 'short' })} - ${agendaDays[6].toLocaleDateString(localeFecha, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    };

    const normalizarServicioAgenda = (value) => {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    };

    const limpiarNombreServicioAgenda = (value) => {
        return String(value || '')
            .replace(/\s*:\s*[^|+]+$/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const extraerNombresServicioAgenda = (value) => {
        return String(value || '')
            .split(/\s+\|\s+|\s+\+\s+/)
            .map(limpiarNombreServicioAgenda)
            .filter(Boolean);
    };

    const buscarServicioAgenda = (nombreServicio) => {
        const nombreLimpio = limpiarNombreServicioAgenda(nombreServicio);
        const normalizado = normalizarServicioAgenda(nombreLimpio);
        if (!normalizado) return null;

        const exacto = serviciosList.find(item => normalizarServicioAgenda(item.nombre) === normalizado);
        if (exacto) return exacto;

        return serviciosList.find(item => {
            const nombreCatalogo = normalizarServicioAgenda(item.nombre);
            return nombreCatalogo.length > 4 && (normalizado.includes(nombreCatalogo) || nombreCatalogo.includes(normalizado));
        }) || null;
    };

    const getAgendaServicios = (booking) => {
        const reservasGrupo = booking?._reservasGrupo || [];
        return reservasGrupo.length > 0 ? reservasGrupo : [booking].filter(Boolean);
    };

    const getPrecioServicioAgenda = (nombreServicio) => {
        return extraerNombresServicioAgenda(nombreServicio).reduce((total, nombre) => {
            const servicio = buscarServicioAgenda(nombre);
            const precio = servicio && window.getPrecioServicioBase ? window.getPrecioServicioBase(servicio) : Number(servicio?.precio || 0);
            return total + precio;
        }, 0);
    };

    const getAgendaResumenCobro = (booking) => {
        const reservas = getAgendaServicios(booking);
        const costoServicios = reservas.reduce((total, reserva) => total + getPrecioServicioAgenda(reserva.servicio), 0);
        const cobroReal = reservas.reduce((total, reserva) => total + Number(reserva.monto_cobrado || 0), 0);
        const anticipoPorServicio = config?.anticipos_por_servicio && window.getAnticipoServicio
            ? reservas.reduce((total, reserva) => {
                return total + extraerNombresServicioAgenda(reserva.servicio).reduce((suma, nombre) => {
                    const servicio = buscarServicioAgenda(nombre);
                    return suma + (servicio ? window.getAnticipoServicio(servicio, config) : 0);
                }, 0);
            }, 0)
            : 0;
        const requiereAnticipo = booking?.estado === 'Pendiente' || booking?.requiere_anticipo || booking?.requiereAnticipo || booking?.anticipo_recibido || (config?.requiere_anticipo === true && (!config?.anticipos_por_servicio || anticipoPorServicio > 0));
        const valorAnticipo = Number(config?.valor_anticipo ?? config?.monto_anticipo ?? 0);
        const monedaNegocio = String(config?.whatsapp_moneda || 'CUP').toUpperCase();
        const anticipoCalculado = config?.anticipos_por_servicio
            ? anticipoPorServicio
            : config?.tipo_anticipo === 'porcentaje'
            ? (monedaNegocio === 'USD'
                ? Math.round(costoServicios * (valorAnticipo / 100) * 100) / 100
                : Math.round(costoServicios * (valorAnticipo / 100)))
            : valorAnticipo;
        const anticipo = requiereAnticipo ? anticipoCalculado : 0;
        const totalMostrar = cobroReal > 0 ? cobroReal : costoServicios;
        return {
            costoServicios,
            cobroReal,
            anticipo,
            requiereAnticipo,
            tipoAnticipo: config?.tipo_anticipo || 'fijo',
            valorAnticipo,
            totalMostrar,
            pendiente: Math.max(0, totalMostrar - anticipo)
        };
    };

    const getAgendaEstadoPago = (booking) => {
        const resumen = getAgendaResumenCobro(booking);
        if (booking?.estado === 'Pendiente') return 'Anticipo pendiente';
        if (resumen.requiereAnticipo) return `Anticipo requerido ${formatMoneyEstadistica(resumen.anticipo)}`;
        return 'Sin anticipo';
    };

    const parseMontoEstadistica = (value) => {
        const normalized = String(value || '0').replace(',', '.').replace(/[^\d.-]/g, '');
        const monto = Number(normalized);
        return Number.isFinite(monto) ? monto : 0;
    };

    const formatMoneyEstadistica = (value) => {
        const monto = Number(value || 0);
        const decimales = monto % 1 === 0 ? 0 : 2;
        const localeMonto = idioma === 'en' ? 'en-US' : 'es-CU';
        return `$${monto.toLocaleString(localeMonto, { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}`;
    };

    const getDateFromInput = (value) => {
        const [year, month, day] = String(value || getCurrentLocalDate()).split('-').map(Number);
        return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
    };

    const getServicioPrecioEstadistica = (nombreServicio) => {
        return extraerNombresServicioAgenda(nombreServicio).reduce((total, nombre) => {
            const servicio = buscarServicioAgenda(nombre);
            const precio = servicio && window.getPrecioServicioBase ? window.getPrecioServicioBase(servicio) : parseMontoEstadistica(servicio?.precio);
            return total + precio;
        }, 0);
    };

    const getRangoEstadisticas = () => {
        const base = getDateFromInput(estadisticasFecha);
        let inicio = new Date(base);
        let fin = new Date(base);
        let titulo = '';

        const localeRango = idioma === 'en' ? 'en-US' : 'es-CU';
        if (estadisticasPeriodo === 'semana') {
            inicio = startOfWeek(base);
            fin = addDays(inicio, 6);
            titulo = `${inicio.toLocaleDateString(localeRango, { day: 'numeric', month: 'short' })} - ${fin.toLocaleDateString(localeRango, { day: 'numeric', month: 'short', year: 'numeric' })}`;
        } else if (estadisticasPeriodo === 'ano') {
            inicio = new Date(base.getFullYear(), 0, 1);
            fin = new Date(base.getFullYear(), 11, 31);
            titulo = `${base.getFullYear()}`;
        } else {
            inicio = new Date(base.getFullYear(), base.getMonth(), 1);
            fin = new Date(base.getFullYear(), base.getMonth() + 1, 0);
            titulo = base.toLocaleDateString(localeRango, { month: 'long', year: 'numeric' });
        }

        return {
            inicio: formatDate(inicio),
            fin: formatDate(fin),
            titulo
        };
    };

    const topEstadistica = (mapa, campo = 'total', limite = 5) => {
        return Object.values(mapa)
            .sort((a, b) => Number(b[campo] || 0) - Number(a[campo] || 0))
            .slice(0, limite);
    };

    const calcularEstadisticas = () => {
        const rango = getRangoEstadisticas();
        const reservasPeriodo = bookings.filter(b => b.fecha >= rango.inicio && b.fecha <= rango.fin);
        const citasVisuales = agruparReservasVisuales(reservasPeriodo);
        const estados = {
            Reservado: 0,
            Pendiente: 0,
            Completado: 0,
            Cancelado: 0,
            Ausente: 0
        };
        const porProfesional = {};
        const porServicio = {};
        const porDia = {};

        citasVisuales.forEach(cita => {
            const estado = estados[cita.estado] !== undefined ? cita.estado : 'Reservado';
            estados[estado] += 1;
        });

        reservasPeriodo.forEach(reserva => {
            const estado = estados[reserva.estado] !== undefined ? reserva.estado : 'Reservado';
            const cobro = parseMontoEstadistica(reserva.monto_cobrado);
            const estimado = getServicioPrecioEstadistica(reserva.servicio);
            const profesionalNombre = reserva.profesional_nombre || reserva.trabajador_nombre || t('Sin profesional');
            const servicioNombre = reserva.servicio || t('Sin servicio');
            const diaKey = reserva.fecha || 'Sin fecha';
            const diaLabel = reserva.fecha
                ? getDateFromInput(reserva.fecha).toLocaleDateString(idioma === 'en' ? 'en-US' : 'es-CU', { weekday: 'short', day: 'numeric', month: 'short' })
                : t('Sin fecha');

            if (!porProfesional[profesionalNombre]) {
                porProfesional[profesionalNombre] = { nombre: profesionalNombre, total: 0, completadas: 0, canceladas: 0, ausentes: 0, cobro: 0 };
            }
            porProfesional[profesionalNombre].total += 1;
            porProfesional[profesionalNombre].cobro += cobro;
            if (estado === 'Completado') porProfesional[profesionalNombre].completadas += 1;
            if (estado === 'Cancelado') porProfesional[profesionalNombre].canceladas += 1;
            if (estado === 'Ausente') porProfesional[profesionalNombre].ausentes += 1;

            if (!porServicio[servicioNombre]) {
                porServicio[servicioNombre] = { nombre: servicioNombre, total: 0, completadas: 0, canceladas: 0, cobro: 0, estimado: 0 };
            }
            porServicio[servicioNombre].total += 1;
            porServicio[servicioNombre].cobro += cobro;
            porServicio[servicioNombre].estimado += estimado;
            if (estado === 'Completado') porServicio[servicioNombre].completadas += 1;
            if (estado === 'Cancelado') porServicio[servicioNombre].canceladas += 1;

            if (!porDia[diaKey]) {
                porDia[diaKey] = { fecha: diaKey, label: diaLabel, total: 0, completadas: 0, canceladas: 0, pendientes: 0, ausentes: 0, cobro: 0 };
            }
            porDia[diaKey].total += 1;
            porDia[diaKey].cobro += cobro;
            if (estado === 'Completado') porDia[diaKey].completadas += 1;
            if (estado === 'Cancelado') porDia[diaKey].canceladas += 1;
            if (estado === 'Pendiente') porDia[diaKey].pendientes += 1;
            if (estado === 'Ausente') porDia[diaKey].ausentes += 1;
        });

        const cobroReal = reservasPeriodo.reduce((total, reserva) => total + parseMontoEstadistica(reserva.monto_cobrado), 0);
        const ingresoEstimado = reservasPeriodo
            .filter(reserva => reserva.estado !== 'Cancelado' && reserva.estado !== 'Ausente')
            .reduce((total, reserva) => total + getServicioPrecioEstadistica(reserva.servicio), 0);
        const citasCompletadas = citasVisuales.filter(cita => cita.estado === 'Completado');
        const citasSinCobro = citasCompletadas.filter(cita => parseMontoEstadistica(cita.monto_cobrado) <= 0).length;
        const ticketPromedio = estados.Completado > 0 ? cobroReal / estados.Completado : 0;
        const totalCitas = citasVisuales.length;

        // Valoración de la experiencia de reserva (estrellas que deja la clienta
        // en la pantalla de confirmación). Se promedia sobre las reservas del
        // periodo que tengan valoración.
        const reservasValoradas = reservasPeriodo.filter(reserva => Number(reserva.valoracion) > 0);
        const valoracionesCount = reservasValoradas.length;
        const valoracionPromedio = valoracionesCount
            ? reservasValoradas.reduce((total, reserva) => total + Number(reserva.valoracion), 0) / valoracionesCount
            : 0;

        return {
            rango,
            reservasPeriodo,
            citasVisuales,
            estados,
            totalCitas,
            totalServicios: reservasPeriodo.length,
            cobroReal,
            ingresoEstimado,
            diferenciaCobro: cobroReal - ingresoEstimado,
            ticketPromedio,
            valoracionPromedio,
            valoracionesCount,
            citasSinCobro,
            tasaCompletadas: totalCitas ? Math.round((estados.Completado / totalCitas) * 100) : 0,
            tasaCanceladas: totalCitas ? Math.round((estados.Cancelado / totalCitas) * 100) : 0,
            tasaAusentes: totalCitas ? Math.round((estados.Ausente / totalCitas) * 100) : 0,
            topProfesionales: topEstadistica(porProfesional, 'cobro'),
            topServicios: topEstadistica(porServicio, 'total'),
            dias: Object.values(porDia).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
        };
    };

    const crearResumenEstadisticasTexto = (stats) => {
        const lineas = [
            t('Resumen de {nombre}', { nombre: nombreNegocio }),
            t('Periodo: {periodo}', { periodo: stats.rango.titulo }),
            '',
            t('Cobro real: {monto}', { monto: formatMoneyEstadistica(stats.cobroReal) }),
            t('Ingreso estimado: {monto}', { monto: formatMoneyEstadistica(stats.ingresoEstimado) }),
            t('Ticket promedio: {monto}', { monto: formatMoneyEstadistica(stats.ticketPromedio) }),
            stats.valoracionesCount
                ? t('Valoracion de reserva: {promedio}/5 ({n} valoraciones)', { promedio: stats.valoracionPromedio.toFixed(1), n: stats.valoracionesCount })
                : t('Valoracion de reserva: sin datos'),
            '',
            t('Citas: {n}', { n: stats.totalCitas }),
            t('Completadas: {n}', { n: stats.estados.Completado }),
            t('Reservadas: {n}', { n: stats.estados.Reservado }),
            t('Pendientes: {n}', { n: stats.estados.Pendiente }),
            t('Canceladas: {n}', { n: stats.estados.Cancelado }),
            t('Ausentes: {n}', { n: stats.estados.Ausente }),
            t('Sin cobro registrado: {n}', { n: stats.citasSinCobro })
        ];

        if (stats.topProfesionales.length) {
            lineas.push('', t('Profesionales destacados:'));
            stats.topProfesionales.slice(0, 3).forEach(item => {
                lineas.push(t('- {nombre}: {monto} / {n} completadas', { nombre: item.nombre, monto: formatMoneyEstadistica(item.cobro), n: item.completadas }));
            });
        }

        if (stats.topServicios.length) {
            lineas.push('', t('Servicios mas pedidos:'));
            stats.topServicios.slice(0, 3).forEach(item => {
                lineas.push(`- ${item.nombre}: ${item.total}`);
            });
        }

        return lineas.join('\n');
    };

    const copiarResumenEstadisticas = async () => {
        const texto = crearResumenEstadisticasTexto(calcularEstadisticas());
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(texto);
                alert(t('Resumen copiado'));
            } else {
                window.prompt(t('Copia el resumen:'), texto);
            }
        } catch (error) {
            console.error('Error copiando resumen:', error);
            window.prompt(t('Copia el resumen:'), texto);
        }
    };

    const descargarEstadisticasCSV = () => {
        const stats = calcularEstadisticas();
        const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const filas = [
            [t('Fecha'), t('Total servicios'), t('Completadas'), t('Canceladas'), t('Pendientes'), t('Ausentes'), t('Cobro real')],
            ...stats.dias.map(dia => [dia.fecha, dia.total, dia.completadas, dia.canceladas, dia.pendientes, dia.ausentes, dia.cobro])
        ];
        const csv = filas.map(fila => fila.map(escapeCsv).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `estadisticas-${estadisticasPeriodo}-${stats.rango.inicio}-${stats.rango.fin}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const renderEstadisticas = () => {
        const stats = calcularEstadisticas();
        const cards = [
            { label: t('Cobro real'), value: formatMoneyEstadistica(stats.cobroReal), tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
            { label: t('Ingreso estimado'), value: formatMoneyEstadistica(stats.ingresoEstimado), tone: 'text-pink-700 bg-pink-50 border-pink-100' },
            { label: t('Completadas'), value: stats.estados.Completado, tone: 'text-blue-700 bg-blue-50 border-blue-100' },
            { label: t('Canceladas'), value: stats.estados.Cancelado, tone: 'text-red-700 bg-red-50 border-red-100' },
            { label: t('Ausentes'), value: stats.estados.Ausente, tone: 'text-slate-700 bg-slate-50 border-slate-100' },
            { label: t('Sin cobro'), value: stats.citasSinCobro, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
            { label: t('Valoracion'), value: stats.valoracionesCount ? `⭐ ${stats.valoracionPromedio.toFixed(1)} (${stats.valoracionesCount})` : t('Sin datos'), tone: 'text-yellow-700 bg-yellow-50 border-yellow-100' }
        ];

        return (
            <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-pink-500 font-bold">{t('Estadisticas')}</p>
                            <h2 className="text-2xl font-bold text-gray-900">{stats.rango.titulo}</h2>
                            <p className="text-sm text-gray-500">{t('Desde {inicio} hasta {fin}', { inicio: stats.rango.inicio, fin: stats.rango.fin })}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex bg-gray-100 rounded-lg p-1">
                                {[
                                    ['semana', t('Semana')],
                                    ['mes', t('Mes')],
                                    ['ano', t('Ano')]
                                ].map(([id, label]) => (
                                    <button key={id} onClick={() => setEstadisticasPeriodo(id)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${estadisticasPeriodo === id ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-600'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <input type="date" value={estadisticasFecha} onChange={(e) => setEstadisticasFecha(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white" />
                            <button onClick={copiarResumenEstadisticas} className="px-3 py-2 rounded-lg bg-pink-500 text-white text-sm font-bold hover:bg-pink-600">{t('Copiar resumen')}</button>
                            <button onClick={descargarEstadisticasCSV} className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-black">CSV</button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                    {cards.map(card => (
                        <div key={card.label} className={`rounded-xl border p-4 ${card.tone}`}>
                            <p className="text-xs font-semibold uppercase">{card.label}</p>
                            <p className="text-2xl font-black mt-1">{card.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">{t('Resumen de citas')}</h3>
                        <div className="space-y-3">
                            {[
                                [t('Total citas'), stats.totalCitas],
                                [t('Servicios vendidos/reservados'), stats.totalServicios],
                                [t('Reservadas'), stats.estados.Reservado],
                                [t('Pendientes'), stats.estados.Pendiente],
                                [t('Completadas'), `${stats.estados.Completado} (${stats.tasaCompletadas}%)`],
                                [t('Canceladas'), `${stats.estados.Cancelado} (${stats.tasaCanceladas}%)`],
                                [t('Ausentes'), `${stats.estados.Ausente} (${stats.tasaAusentes}%)`],
                                [t('Ticket promedio real'), formatMoneyEstadistica(stats.ticketPromedio)],
                                [t('Valoracion de reserva'), stats.valoracionesCount ? `⭐ ${stats.valoracionPromedio.toFixed(1)} / 5 (${stats.valoracionesCount})` : t('Sin datos')]
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between gap-3 text-sm border-b border-gray-100 pb-2 last:border-b-0">
                                    <span className="text-gray-500">{label}</span>
                                    <span className="font-bold text-gray-900">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">{t('Profesionales')}</h3>
                        <div className="space-y-3">
                            {stats.topProfesionales.length === 0 ? <p className="text-sm text-gray-500">{t('No hay datos en este periodo.')}</p> : stats.topProfesionales.map(item => (
                                <div key={item.nombre} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                                    <div className="flex justify-between gap-3">
                                        <p className="font-bold text-gray-900 truncate">{item.nombre}</p>
                                        <p className="font-bold text-emerald-700">{formatMoneyEstadistica(item.cobro)}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{t('{completadas} completadas - {canceladas} canceladas - {ausentes} ausentes', { completadas: item.completadas, canceladas: item.canceladas, ausentes: item.ausentes })}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">{t('Servicios mas pedidos')}</h3>
                        <div className="space-y-3">
                            {stats.topServicios.length === 0 ? <p className="text-sm text-gray-500">{t('No hay datos en este periodo.')}</p> : stats.topServicios.map(item => (
                                <div key={item.nombre} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                                    <div className="flex justify-between gap-3">
                                        <p className="font-bold text-gray-900 truncate">{item.nombre}</p>
                                        <p className="font-bold text-gray-900">{item.total}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{t('{completadas} completadas - {cobro} real', { completadas: item.completadas, cobro: formatMoneyEstadistica(item.cobro) })}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <h3 className="font-bold text-gray-900">{t('Detalle por dia')}</h3>
                        <p className="text-sm text-gray-500">{t('{n} dias con movimiento', { n: stats.dias.length })}</p>
                    </div>
                    {stats.dias.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('No hay reservas en este periodo.')}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b">
                                        <th className="py-2 pr-3">{t('Dia')}</th>
                                        <th className="py-2 pr-3">{t('Total')}</th>
                                        <th className="py-2 pr-3">{t('Completadas')}</th>
                                        <th className="py-2 pr-3">{t('Pendientes')}</th>
                                        <th className="py-2 pr-3">{t('Canceladas')}</th>
                                        <th className="py-2 pr-3">{t('Ausentes')}</th>
                                        <th className="py-2 pr-3">{t('Cobro real')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.dias.map(dia => (
                                        <tr key={dia.fecha} className="border-b last:border-b-0">
                                            <td className="py-2 pr-3 font-medium text-gray-900">{dia.label}</td>
                                            <td className="py-2 pr-3">{dia.total}</td>
                                            <td className="py-2 pr-3 text-emerald-700 font-semibold">{dia.completadas}</td>
                                            <td className="py-2 pr-3 text-amber-700 font-semibold">{dia.pendientes}</td>
                                            <td className="py-2 pr-3 text-red-700 font-semibold">{dia.canceladas}</td>
                                            <td className="py-2 pr-3 text-slate-700 font-semibold">{dia.ausentes}</td>
                                            <td className="py-2 pr-3 font-bold">{formatMoneyEstadistica(dia.cobro)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const getTabsDisponibles = () => {
        const tabs = [];
        const puedeVerEstadisticas = userRole === 'admin' || (userRole === 'profesional' && userNivel >= 2);
        tabs.push({ id: 'reservas', icono: '📅', label: userRole === 'profesional' ? t('Mis Reservas') : t('Reservas') });

        tabs.push({ id: 'agenda', icono: '📋', label: t('Agenda') });

        if (puedeVerEstadisticas) {
            tabs.push({ id: 'estadisticas', icono: 'Stats', label: t('Estadisticas') });
        }
        if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 2)) {
            tabs.push({ id: 'configuracion', icono: '⚙️', label: t('Configuración') });
            tabs.push({ id: 'clientes', icono: '👥', label: t('Clientes') });
        }

        if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 3)) {
            tabs.push({ id: 'servicios', icono: '💅', label: t('Servicios') });
            tabs.push({ id: 'profesionales', icono: '👩‍💼', label: t('Profesionales') });
        }

        return tabs;
    };

    const abrirModalNuevaReserva = () => {
        if (!puedeGestionarReservas) {
            alert(t('Tu nivel de acceso solo permite ver reservas.'));
            return;
        }
        setReservaEditando(null);
        setNuevaReservaData({
            cliente_nombre: '',
            cliente_whatsapp: '',
            cliente_codigo_pais: codigoPaisNegocio,
            servicio: '',
            profesional_id: userRole === 'profesional' ? profesional?.id : '',
            fecha: '',
            hora_inicio: '',
            hora_fin: '',
            duracion_personalizada: '',
            requiereAnticipo: false
        });
        setCurrentDate(new Date());
        setDiasLaborales([]);
        setFechasConHorarios({});
        setServiciosManualSeleccionados([]);
        setBusquedaClienteManual('');
        loadClientesRegistrados();
        setShowNuevaReservaModal(true);
    };

    const abrirModalReprogramar = (booking) => {
        if (!puedeGestionarReservas) {
            alert(t('Tu nivel de acceso solo permite ver reservas.'));
            return;
        }
        if (userRole === 'profesional' && profesional && Number(booking.profesional_id) !== Number(profesional.id)) {
            alert(t('Solo puedes editar tus propias reservas.'));
            return;
        }
        const servicio = serviciosList.find(s => s.nombre === booking.servicio);
        setAgendaDetalleBooking(null);
        setReservaEditando(booking);
        setNuevaReservaData({
            cliente_nombre: booking.cliente_nombre || '',
            cliente_whatsapp: normalizarTelefonoLocalSeguro(booking.cliente_whatsapp),
            cliente_codigo_pais: '',
            servicio: booking.servicio || '',
            profesional_id: booking.profesional_id || '',
            fecha: booking.fecha || '',
            hora_inicio: booking.hora_inicio || '',
            hora_fin: booking.hora_fin || '',
            duracion_personalizada: booking.duracion ? String(booking.duracion) : '',
            requiereAnticipo: booking.estado === 'Pendiente'
        });
        setCurrentDate(booking.fecha ? new Date(`${booking.fecha}T00:00:00`) : new Date());
        setDiasLaborales([]);
        setFechasConHorarios({});
        setServiciosManualSeleccionados([booking.servicio].filter(Boolean));
        if (booking.fecha && booking.hora_inicio) {
            setHorariosDisponibles(prev => Array.from(new Set([...(prev || []), booking.hora_inicio])).sort());
        }
        setBusquedaClienteManual('');
        loadClientesRegistrados();
        setShowNuevaReservaModal(true);
    };

    const abrirDetalleAgenda = (booking) => {
        setAgendaDetalleBooking(booking);
    };

    const abrirModalDisponibilidad = () => {
        const fechaActual = new Date();
        const profesionalId = profesionalSeleccionadoDispo || profesionalesList[0]?.id || null;
        setDisponibilidadFecha(fechaActual);
        if (profesionalId) {
            setProfesionalSeleccionadoDispo(profesionalId);
        }
        setModoDisponibilidad('mes');
        setShowDisponibilidadModal(true);
        cargarDisponibilidadDelMes(fechaActual, profesionalId);
    };

    const tabsDisponibles = getTabsDisponibles();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const days = getDaysInMonth(currentDate);
    const disponibilidadDays = getDaysInMonth(disponibilidadFecha);

    return (
        <div className="min-h-screen bg-pink-50 p-3 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-4">
                
                {/* HEADER CON LOGO */}
                <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-pink-500">
                    <div className="flex items-center gap-3">
                        {logoNegocio ? (
                            <img 
                                src={logoNegocio} 
                                alt={nombreNegocio} 
                                className="w-12 h-12 object-contain rounded-xl shadow-lg ring-2 ring-pink-300 bg-white p-1"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    const parent = e.target.parentElement;
                                    if (parent) {
                                        parent.innerHTML = '<div class="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg flex items-center justify-center"><span class="text-2xl text-white"><i class="icon-calendar"></i></span></div>';
                                    }
                                }}
                            />
                        ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg flex items-center justify-center">
                                <span className="text-2xl text-white">💅</span>
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-pink-800">{nombreNegocio}</h1>
                            <p className="text-xs text-pink-500">{t('Panel de Administración')}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {/* BOTÓN NUEVA RESERVA */}
                        <button
                            onClick={abrirModalNuevaReserva}
                            className={`${puedeGestionarReservas ? 'flex' : 'hidden'} items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md border border-green-400 flex-1 sm:flex-none justify-center`}
                        >
                            <span className="text-lg">➕</span>
                            <span className="font-medium">{t('Nueva Reserva')}</span>
                        </button>

                        {/* BOTÓN CALENDARIO DE DISPONIBILIDAD */}
                        <button
                            onClick={abrirModalDisponibilidad}
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md border border-blue-400 flex-1 sm:flex-none justify-center"
                            title={t('Ver disponibilidad mensual')}
                        >
                            <span className="text-lg">📆</span>
                            <span className="font-medium">{t('Ver Disponibilidad')}</span>
                        </button>

                        <button
                            onClick={() => {
                                // Llevar el salón de ESTA pestaña (?s= de su URL), no el
                                // de localStorage: con varios salones abiertos en pestañas,
                                // localStorage puede apuntar a otro y se editaría el
                                // negocio equivocado. El guard de editar-negocio valida.
                                const slugTab = window._rservasSlugActual ||
                                    localStorage.getItem('adminSlug') ||
                                    localStorage.getItem('negocioSlug') || '';
                                window.location.href = 'editar-negocio.html' + (slugTab ? '?s=' + encodeURIComponent(slugTab) : '');
                            }}
                            className={`${puedeGestionarAvanzado ? 'flex' : 'hidden'} items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md border border-pink-400 flex-1 sm:flex-none justify-center`}
                        >
                            <span className="text-lg">🏢</span>
                            <span className="font-medium">{t('Editar Negocio')}</span>
                        </button>

                        <button
                            onClick={() => {
                                cargarConfiguracion();
                                setConfigVersion(prev => prev + 1);
                            }}
                            className="p-2 bg-pink-50 rounded-full hover:bg-pink-100 transition-all hover:scale-105 border border-pink-200"
                            title={t('Recargar datos del negocio')}
                        >
                            <i className="icon-refresh-cw text-pink-600"></i>
                        </button>

                        <button
                            onClick={fetchBookings}
                            className="p-2 bg-pink-50 rounded-full hover:bg-pink-100 transition-all hover:scale-105 border border-pink-200"
                            title={t('Actualizar reservas')}
                        >
                            <i className="icon-refresh-cw text-pink-600"></i>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="p-2 bg-pink-50 rounded-full hover:bg-pink-100 transition-all hover:scale-105 border border-pink-200"
                            title={t('Cerrar sesión')}
                        >
                            <i className="icon-log-out text-pink-600"></i>
                        </button>

                        <window.LanguageToggle />
                    </div>

                    {(() => {
                        return urlCliente ? (
                            <div style={{
                                marginTop: '8px',
                                background: 'rgba(236,72,153,0.07)',
                                border: '1px solid rgba(236,72,153,0.2)',
                                borderRadius: '10px',
                                padding: '8px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                flexWrap: 'wrap',
                                width: '100%'
                            }}>
                                <span style={{ fontSize: '12px', color: '#9d174d', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    🔗 Enlace de clientes:
                                </span>
                                <span style={{ fontSize: '12px', color: '#be185d', wordBreak: 'break-all', flex: 1 }}>
                                    {urlCliente}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(urlCliente).then(() => {
                                            const btn = document.getElementById('btn-copiar-url');
                                            if (btn) { btn.textContent = '✅'; setTimeout(() => { btn.textContent = '📋'; }, 1500); }
                                        });
                                    }}
                                    id="btn-copiar-url"
                                    style={{
                                        background: '#ec4899',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '4px 10px',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        flexShrink: 0
                                    }}
                                    title={t('Copiar enlace')}
                                >📋</button>
                            </div>
                        ) : null;
                    })()}
                </div>

                {/* MODAL NUEVA RESERVA */}
                {showNuevaReservaModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">{t('Nueva Reserva Manual')}</h3>
                                    <button
                                        onClick={() => setShowNuevaReservaModal(false)}
                                        disabled={creandoReservaManual}
                                        className="text-gray-500 hover:text-gray-700 text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    >×</button>
                            </div>
                            <div className="space-y-4">
                                {!reservaEditando && (
                                    <div className="bg-pink-50/70 border border-pink-100 rounded-xl p-3">
                                        <label className="block text-sm font-semibold text-pink-800 mb-2">
                                            {t('Elegir cliente registrado')}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="search"
                                                value={busquedaClienteManual}
                                                onChange={(e) => setBusquedaClienteManual(e.target.value)}
                                                onFocus={() => {
                                                    if (clientesRegistrados.length === 0 && !cargandoClientes) {
                                                        loadClientesRegistrados();
                                                    }
                                                }}
                                                className="w-full border border-pink-200 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                                                placeholder={t('Buscar por nombre o WhatsApp')}
                                            />
                                            <span className="absolute right-3 top-2.5 text-pink-400">🔎</span>
                                        </div>
                                        <p className="text-xs text-pink-600/70 mt-1">
                                            {t('Puedes elegir de la lista o buscar por nombre/WhatsApp. Si no existe, escribe los datos manualmente.')}
                                        </p>
                                        {cargandoClientes && (
                                            <p className="text-xs text-pink-500 mt-2">{t('Cargando clientes...')}</p>
                                        )}
                                        {busquedaClienteManual && !cargandoClientes && clientesManualFiltrados.length === 0 && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                {t('No encontramos ese cliente. Puedes escribir los datos manualmente y se guardará al crear la reserva.')}
                                            </p>
                                        )}
                                        {!cargandoClientes && clientesRegistrados.length === 0 && (
                                            <p className="text-xs text-gray-500 mt-2">{t('Aún no hay clientes registrados.')}</p>
                                        )}
                                        {clientesManualFiltrados.length > 0 && (
                                            <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-pink-100 bg-white divide-y divide-pink-50">
                                                {clientesManualFiltrados.map(cliente => (
                                                    <button
                                                        key={`${cliente.whatsapp}-${cliente.id || cliente.fecha_registro || cliente.nombre}`}
                                                        type="button"
                                                        onClick={() => seleccionarClienteManual(cliente)}
                                                        className="w-full px-3 py-2 text-left hover:bg-pink-50 flex items-center justify-between gap-3"
                                                    >
                                                        <span className="min-w-0">
                                                            <span className="block font-medium text-gray-800 truncate">{cliente.nombre || t('Cliente sin nombre')}</span>
                                                            <span className="block text-xs text-gray-500">+{String(cliente.whatsapp || '').replace(/\D/g, '')}</span>
                                                        </span>
                                                        <span className="text-xs text-pink-600 font-semibold shrink-0">{t('Usar')}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('Nombre del Cliente *')}</label>
                                    <input type="text" value={nuevaReservaData.cliente_nombre} onChange={(e) => setNuevaReservaData({...nuevaReservaData, cliente_nombre: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder={t('Ej: Juan Pérez')} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('WhatsApp del Cliente *')}</label>
                                    <div className="flex">
                                        <select
                                            value={codigoPaisClienteManual}
                                            onChange={(e) => {
                                                const nuevoCodigo = e.target.value;
                                                setNuevaReservaData({
                                                    ...nuevaReservaData,
                                                    cliente_codigo_pais: nuevoCodigo,
                                                    cliente_whatsapp: String(nuevaReservaData.cliente_whatsapp || '').replace(/\D/g, '')
                                                });
                                            }}
                                            className="w-32 px-2 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-sm"
                                        >
                                            {paisesTelefono.map((pais) => (
                                                <option key={pais.id} value={pais.codigo}>{pais.bandera} +{pais.codigo}</option>
                                            ))}
                                        </select>
                                        <input type="tel" value={nuevaReservaData.cliente_whatsapp} onChange={(e) => setNuevaReservaData({...nuevaReservaData, cliente_whatsapp: String(e.target.value || '').replace(/\D/g, '')})} className="w-full px-4 py-2 rounded-r-lg border border-gray-300" placeholder={paisTelefono.ejemplo || '55002272'} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {!reservaEditando ? t('Servicios *') : t('Servicio *')}
                                    </label>
                                    {reservaEditando ? (
                                        <select
                                            value={nuevaReservaData.servicio}
                                            onChange={(e) => {
                                                setServiciosManualSeleccionados([e.target.value].filter(Boolean));
                                                setNuevaReservaData({...nuevaReservaData, servicio: e.target.value, fecha: '', hora_inicio: '', hora_fin: ''});
                                            }}
                                            className="w-full border rounded-lg px-3 py-2"
                                        >
                                            <option value="">{t('Seleccionar servicio')}</option>
                                            {serviciosList.map(s => (
                                                <option key={s.id} value={s.nombre}>{s.nombre} ({s.duracion} min - {window.formatearPrecioServicio ? window.formatearPrecioServicio(s) : `$${s.precio}`})</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="border rounded-xl p-2 max-h-60 overflow-y-auto bg-white space-y-2">
                                            {serviciosList.map(s => {
                                                const seleccionado = serviciosManualSeleccionados.includes(s.nombre);
                                                return (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => toggleServicioManual(s.nombre)}
                                                        className={`w-full text-left p-3 rounded-lg border transition ${seleccionado ? 'bg-pink-50 border-pink-300 text-pink-800' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="font-medium">{s.nombre}</span>
                                                            <span className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${seleccionado ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-300'}`}>
                                                                {seleccionado ? '✓' : ''}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">{s.duracion} min - {window.formatearPrecioServicio ? window.formatearPrecioServicio(s) : `$${s.precio}`}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {!reservaEditando && serviciosManualSeleccionados.length > 0 && (
                                        <p className="text-xs text-pink-600 mt-2">
                                            {t('{n} servicio{s} - {min} min', { n: serviciosManualSeleccionados.length, s: serviciosManualSeleccionados.length === 1 ? '' : 's', min: getServiciosManualSeleccionados().reduce((total, s) => total + Number(s.duracion || 60), 0) })}
                                        </p>
                                    )}
                                </div>
                                {userRole === 'admin' && nuevaReservaData.servicio && (
                                    <div className="rounded-xl border border-pink-100 bg-pink-50 p-3">
                                        <label className="block text-sm font-medium text-pink-800 mb-1">{t('Duracion para esta cita (min)')}</label>
                                        <input
                                            type="number"
                                            min="5"
                                            step="5"
                                            value={nuevaReservaData.duracion_personalizada}
                                            onChange={(e) => setNuevaReservaData({
                                                ...nuevaReservaData,
                                                duracion_personalizada: e.target.value.replace(/\D/g, ''),
                                                fecha: '',
                                                hora_inicio: '',
                                                hora_fin: ''
                                            })}
                                            className="w-full border border-pink-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-300 focus:border-pink-400"
                                            placeholder={t('Usar {min} min', { min: getDuracionManualConfigurada(getServiciosManualSeleccionados()) })}
                                        />
                                        <p className="text-xs text-pink-700 mt-1">
                                            {t('Dejalo vacio para usar la duracion configurada. Si escribes un tiempo, solo aplica a esta cita.')}
                                        </p>
                                        {tieneDuracionManualPersonalizada() && (
                                            <p className="text-xs font-semibold text-pink-800 mt-1">
                                                {t('Esta reserva se calculara con {min} min.', { min: getDuracionManualTotal(getServiciosManualSeleccionados()) })}
                                            </p>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('Profesional *')}</label>
                                    <select value={nuevaReservaData.profesional_id} onChange={(e) => setNuevaReservaData({...nuevaReservaData, profesional_id: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                                        <option value="">{t('Seleccionar profesional')}</option>
                                        {profesionalesManualFiltrados.map(p => (<option key={p.id} value={p.id}>{p.nombre} - {p.especialidad}</option>))}
                                    </select>
                                    {nuevaReservaData.servicio && profesionalesManualFiltrados.length === 0 && (
                                        <p className="text-xs text-red-500 mt-1">{t('No hay profesionales asignados a este servicio.')}</p>
                                    )}
                                </div>
                                {userRole === 'admin' && (
                                    <div className="flex items-center gap-3 bg-yellow-50 p-3 rounded-lg">
                                        <input type="checkbox" id="requiereAnticipo" checked={nuevaReservaData.requiereAnticipo} onChange={(e) => setNuevaReservaData({...nuevaReservaData, requiereAnticipo: e.target.checked})} />
                                        <label htmlFor="requiereAnticipo" className="text-sm font-medium text-yellow-800">{t('Requerir anticipo al cliente')}</label>
                                    </div>
                                )}
                                {nuevaReservaData.servicio && nuevaReservaData.profesional_id && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('Fecha *')}</label>
                                        <div className="bg-white rounded-xl border">
                                            <div className="flex justify-between p-3 bg-gray-50 border-b">
                                                <button onClick={() => cambiarMes(-1)}>›</button>
                                                <span className="font-bold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                                                <button onClick={() => cambiarMes(1)}>›</button>
                                            </div>
                                            <div className="p-3">
                                                <div className="grid grid-cols-7 mb-2 text-center text-xs text-gray-400">
                                                    {(idioma === 'en' ? ['S','M','T','W','T','F','S'] : ['D','L','M','M','J','V','S']).map((d, i) => <div key={i}>{d}</div>)}
                                                </div>
                                                <div className="grid grid-cols-7 gap-1">
                                                    {days.map((date, idx) => {
                                                        if (!date) return <div key={idx} className="h-10" />;
                                                        const fechaStr = formatDate(date);
                                                        const available = isDateAvailable(date);
                                                        const selected = nuevaReservaData.fecha === fechaStr;
                                                        const esCerrado = diasCerradosFechas.includes(fechaStr);
                                                        const esPasado = fechaStr < getCurrentLocalDate();
                                                        const adminPuedeForzarFecha = userRole === 'admin';
                                                        const fechaDeshabilitada = esPasado || (!adminPuedeForzarFecha && (!available || esCerrado));
                                                        
                                                        let className = "h-10 w-full rounded-lg text-sm font-medium";
                                                        if (selected) className += " bg-pink-500 text-white shadow-md";
                                                        else if (fechaDeshabilitada) className += " text-gray-300 cursor-not-allowed bg-gray-50 line-through";
                                                        else if (adminPuedeForzarFecha && esCerrado) className += " text-amber-700 hover:bg-amber-50 cursor-pointer border border-amber-200";
                                                        else className += " text-gray-700 hover:bg-pink-50 cursor-pointer";
                                                        
                                                        return (
                                                            <button key={idx} onClick={() => handleDateSelect(date)} disabled={fechaDeshabilitada} className={className} title={esCerrado ? t('Dia cerrado, disponible para admin') : esPasado ? t('Fecha pasada') : ""}>
                                                                {date.getDate()}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {nuevaReservaData.fecha && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('Horario de la cita *')}</label>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">{t('Inicio')}</label>
                                                <input
                                                    type="time"
                                                    value={nuevaReservaData.hora_inicio}
                                                    onChange={(e) => setNuevaReservaData({
                                                        ...nuevaReservaData,
                                                        hora_inicio: e.target.value
                                                    })}
                                                    className="w-full border rounded-lg px-3 py-2"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">{t('Fin')}</label>
                                                <input
                                                    type="time"
                                                    value={nuevaReservaData.hora_fin}
                                                    onChange={(e) => setNuevaReservaData({
                                                        ...nuevaReservaData,
                                                        hora_fin: e.target.value,
                                                        duracion_personalizada: ''
                                                    })}
                                                    className="w-full border rounded-lg px-3 py-2"
                                                />
                                            </div>
                                        </div>
                                        {nuevaReservaData.hora_inicio && (
                                            <p className="text-xs text-gray-500 mb-3">
                                                {nuevaReservaData.hora_fin
                                                    ? t('Duracion calculada: {min} min segun inicio y fin.', { min: getDuracionManualTotal(getServiciosManualSeleccionados()) })
                                                    : t('Duracion calculada: {min} min segun el servicio o la duracion personalizada.', { min: getDuracionManualTotal(getServiciosManualSeleccionados()) })}
                                            </p>
                                        )}
                                        {modoHorarioManualCompleto && horariosDisponibles.length > 0 && (
                                            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                                {t('Modo admin: este dia no tiene horario normal para el profesional. Puedes elegir cualquier hora libre del dia, siempre que no choque con otra cita.')}
                                            </div>
                                        )}
                                        {horariosDisponibles.length > 0 ? (
                                            <div className={`${modoHorarioManualCompleto ? 'max-h-64 overflow-y-auto pr-1' : ''} grid grid-cols-3 gap-2`}>
                                                {horariosDisponibles.map(hora => (
                                                    <button key={hora} type="button" onClick={() => setNuevaReservaData({...nuevaReservaData, hora_inicio: hora})} className={`py-2 px-3 rounded-lg text-sm font-medium ${nuevaReservaData.hora_inicio === hora ? 'bg-pink-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                                        {formatTo12Hour(hora)}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : <p className="text-sm text-gray-500">{t('No hay horarios disponibles')}</p>}
                                    </div>
                                )}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => { setShowNuevaReservaModal(false); setReservaEditando(null); setServiciosManualSeleccionados([]); }}
                                        disabled={creandoReservaManual}
                                        className="flex-1 px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {t('Cancelar')}
                                    </button>
                                    {puedeGestionarReservas && reservaEditando?.estado === 'Pendiente' && (
                                        <button
                                            onClick={async () => {
                                                await confirmarPago(reservaEditando.id, reservaEditando);
                                                setShowNuevaReservaModal(false);
                                                setReservaEditando(null);
                                            }}
                                            className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg"
                                        >
                                            {t('Confirmar pago')}
                                        </button>
                                    )}
                                    <button
                                        onClick={handleCrearReservaManual}
                                        disabled={creandoReservaManual}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {creandoReservaManual ? t('Guardando...') : reservaEditando ? t('Guardar cambios') : t('Crear Reserva')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {agendaDetalleBooking && (() => {
                    const resumen = getAgendaResumenCobro(agendaDetalleBooking);
                    const serviciosDetalle = getAgendaServicios(agendaDetalleBooking);
                    const horaFinDetalle = agendaDetalleBooking.hora_fin || calculateEndTime(agendaDetalleBooking.hora_inicio, agendaDetalleBooking.duracion || 60);
                    const duracionDetalle = Math.max(0, timeToMinutes(horaFinDetalle) - timeToMinutes(agendaDetalleBooking.hora_inicio));
                    const estadoClase = agendaDetalleBooking.estado === 'Pendiente'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : agendaDetalleBooking.estado === 'Completado'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : agendaDetalleBooking.estado === 'Ausente'
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : agendaDetalleBooking.estado === 'Cancelado'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-cyan-50 text-cyan-700 border-cyan-200';

                    return (
                    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
                        <div className="bg-white w-full sm:max-w-xl max-h-[96vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl">
                            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-5 py-4 flex items-center justify-between">
                                <button onClick={() => setAgendaDetalleBooking(null)} className="w-10 h-10 rounded-full hover:bg-gray-100 text-2xl leading-none">x</button>
                                <h3 className="text-xl font-bold text-gray-900">{t('Cita')}</h3>
                                {puedeEditarReserva(agendaDetalleBooking) ? (
                                    <button onClick={() => abrirModalReprogramar(agendaDetalleBooking)} className="w-16 h-10 rounded-full hover:bg-gray-100 text-sm font-bold">{t('Editar')}</button>
                                ) : <span className="w-10"></span>}
                            </div>

                            <div className="px-5 py-5">
                                <div className="mb-5">
                                    <h2 className="text-2xl font-extrabold leading-tight text-gray-950">{agendaDetalleBooking.servicio || t('Servicio')}</h2>
                                    <p className="mt-2 text-xl font-bold text-gray-900">{t('Total:')} {formatMoneyEstadistica(resumen.totalMostrar)}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${estadoClase}`}>{agendaDetalleBooking.estado ? t(agendaDetalleBooking.estado) : t('Sin estado')}</span>
                                        <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">{getAgendaEstadoPago(agendaDetalleBooking)}</span>
                                    </div>
                                </div>

                                <div className="mb-5 space-y-1 text-gray-700">
                                    <p className="font-semibold">{window.formatFechaCompleta ? window.formatFechaCompleta(agendaDetalleBooking.fecha) : agendaDetalleBooking.fecha}</p>
                                    <p>{t('de {inicio} a {fin} ({min} min)', { inicio: formatTo12Hour(agendaDetalleBooking.hora_inicio), fin: formatTo12Hour(horaFinDetalle), min: duracionDetalle })}</p>
                                    <p className="font-semibold">{agendaDetalleBooking.profesional_nombre || agendaDetalleBooking.trabajador_nombre || t('Sin profesional')}</p>
                                    {config?.direccion && <p className="text-sm text-gray-500">{config.direccion}</p>}
                                </div>

                                <div className="divide-y rounded-xl border bg-white">
                                    <div className="flex items-center justify-between p-4"><span className="font-semibold text-gray-800">{t('Cliente')}</span><span className="text-right text-gray-600">{agendaDetalleBooking.cliente_nombre || t('Sin nombre')} &gt;</span></div>
                                    <div className="flex items-center justify-between p-4"><span className="font-semibold text-gray-800">WhatsApp</span><button onClick={() => window.enviarWhatsApp?.(agendaDetalleBooking.cliente_whatsapp, `Hola ${agendaDetalleBooking.cliente_nombre || ''}`)} className="text-right text-pink-600 font-semibold">+{agendaDetalleBooking.cliente_whatsapp || t('Sin numero')} &gt;</button></div>
                                    <div className="flex items-center justify-between p-4"><span className="font-semibold text-gray-800">{t('Precio del servicio')}</span><span className="font-bold text-gray-900">{formatMoneyEstadistica(resumen.costoServicios)}</span></div>
                                    <div className="flex items-center justify-between p-4"><span className="font-semibold text-gray-800">{t('Anticipo requerido')}</span><span className={`font-bold ${resumen.requiereAnticipo ? 'text-amber-700' : 'text-gray-500'}`}>{resumen.requiereAnticipo ? t('Si') : t('No')}</span></div>
                                    {resumen.requiereAnticipo && <div className="flex items-center justify-between p-4"><div><p className="font-semibold text-gray-800">{t('Monto del anticipo')}</p><p className="text-sm text-gray-500">{resumen.tipoAnticipo === 'porcentaje' ? t('{n}% del servicio', { n: resumen.valorAnticipo }) : t('Monto fijo')}</p></div><span className="font-bold text-amber-700">{formatMoneyEstadistica(resumen.anticipo)}</span></div>}
                                    <div className="flex items-center justify-between p-4"><span className="font-semibold text-gray-800">{t('Coste de servicios')}</span><span className="text-gray-600">{formatMoneyEstadistica(resumen.costoServicios)}</span></div>
                                    <div className="flex items-center justify-between p-4"><span className="font-semibold text-gray-800">{t('Descuento')}</span><span className="text-gray-600">{t('No')}</span></div>
                                    <div className="flex items-center justify-between p-4"><span className="font-semibold text-gray-800">{t('Coste total')}</span><span className="text-gray-600">{formatMoneyEstadistica(resumen.totalMostrar)}</span></div>
                                    <div className="flex items-center justify-between p-4"><div><p className="font-semibold text-gray-800">{t('Deposito')}</p><p className="text-sm text-gray-500">{resumen.requiereAnticipo ? (agendaDetalleBooking.estado === 'Pendiente' ? t('Pendiente de recibir') : t('Aplica para esta cita')) : t('No aplica')}</p></div><span className="text-gray-600">{formatMoneyEstadistica(resumen.anticipo)}</span></div>
                                    <div className="flex items-center justify-between p-4"><span className="font-semibold text-gray-800">{t('Total pendiente')}</span><span className="font-bold text-gray-900">{formatMoneyEstadistica(resumen.pendiente)}</span></div>
                                    <div className="flex items-center justify-between p-4"><span className="font-semibold text-gray-800">{t('Cobro real')}</span><span className="font-bold text-emerald-700">{resumen.cobroReal > 0 ? formatMoneyEstadistica(resumen.cobroReal) : t('Sin registrar')}</span></div>
                                </div>

                                {Number(agendaDetalleBooking.valoracion) > 0 && (
                                    <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                                        <p className="text-xs font-bold uppercase text-yellow-600 mb-1">{t('Valoracion de la clienta')}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl leading-none">{'⭐'.repeat(Number(agendaDetalleBooking.valoracion))}</span>
                                            <span className="font-bold text-gray-900">{Number(agendaDetalleBooking.valoracion)}/5</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{t('Sobre la experiencia de reservar en la app')}</p>
                                    </div>
                                )}

                                {serviciosDetalle.length > 1 && (
                                    <div className="mt-5 rounded-xl border border-pink-100 bg-pink-50 p-4">
                                        <p className="text-xs font-bold uppercase text-pink-500 mb-3">{t('Servicios del turno')}</p>
                                        <div className="space-y-2">
                                            {serviciosDetalle.map(item => (
                                                <div key={item.id} className="flex justify-between gap-3 text-sm">
                                                    <span className="font-semibold text-gray-800">{item.servicio}</span>
                                                    <span className="text-gray-500">{formatTo12Hour(item.hora_inicio)} - {formatTo12Hour(item.hora_fin || calculateEndTime(item.hora_inicio, item.duracion || 60))}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-5 rounded-xl border bg-gray-50 p-4">
                                    <p className="font-bold text-gray-900 mb-3">{t('Acciones')}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {agendaDetalleBooking.estado === 'Pendiente' && puedeGestionarReservas && <button onClick={() => confirmarPago(agendaDetalleBooking.id, agendaDetalleBooking)} className="px-3 py-2 rounded-lg bg-green-600 text-white font-bold text-sm">{t('Confirmar pago')}</button>}
                                        {puedeEditarReserva(agendaDetalleBooking) && <button onClick={() => abrirModalReprogramar(agendaDetalleBooking)} className="px-3 py-2 rounded-lg bg-pink-500 text-white font-bold text-sm">{t('Editar')}</button>}
                                        {turnoYaPaso(agendaDetalleBooking) && agendaDetalleBooking.estado !== 'Ausente' && puedeGestionarReservas && <button onClick={() => marcarAusencia(agendaDetalleBooking)} className="px-3 py-2 rounded-lg bg-slate-700 text-white font-bold text-sm">{t('Ausencia')}</button>}
                                        {agendaDetalleBooking.estado === 'Completado' && puedeGestionarReservas && <button onClick={() => abrirModalCobro(agendaDetalleBooking)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm">{t('Cobro real')}</button>}
                                        {puedeEditarReserva(agendaDetalleBooking) && <button onClick={() => handleCancel(agendaDetalleBooking.id, agendaDetalleBooking)} className="px-3 py-2 rounded-lg bg-red-500 text-white font-bold text-sm">{t('Cancelar')}</button>}
                                        {puedeGestionarAvanzado && ['Cancelado', 'Completado', 'Ausente'].includes(agendaDetalleBooking.estado) && <button onClick={() => eliminarReservaHistorial(agendaDetalleBooking)} className="px-3 py-2 rounded-lg bg-gray-900 text-white font-bold text-sm">{t('Eliminar')}</button>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    );
                })()}

                {/* MODAL CALENDARIO DE DISPONIBILIDAD */}
                {showDisponibilidadModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
                        <div className="bg-white rounded-xl max-w-5xl w-full p-3 sm:p-6 max-h-[96vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg sm:text-xl font-bold">📆 {t('Disponibilidad')}</h3>
                                <button onClick={() => setShowDisponibilidadModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                            </div>

                            {userRole === 'admin' && profesionalesList.length > 0 && (
                                <div className="mb-3">
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{t('Profesional:')}</label>
                                    <select
                                        value={profesionalSeleccionadoDispo || ''}
                                        onChange={(e) => {
                                            const id = e.target.value ? parseInt(e.target.value) : null;
                                            setProfesionalSeleccionadoDispo(id);
                                            if (modoDisponibilidad === 'semana') cargarDisponibilidadSemanal(disponibilidadFecha, id);
                                            else cargarDisponibilidadDelMes(disponibilidadFecha, id);
                                        }}
                                        className="w-full border rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">{t('Seleccionar profesional')}</option>
                                        {profesionalesList.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-2 mb-3">
                                <button onClick={() => { setModoDisponibilidad('mes'); cargarDisponibilidadDelMes(disponibilidadFecha, profesionalSeleccionadoDispo); }} className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${modoDisponibilidad === 'mes' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{t('Mensual')}</button>
                                <button onClick={() => { setModoDisponibilidad('semana'); cargarDisponibilidadSemanal(disponibilidadFecha, profesionalSeleccionadoDispo); }} className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${modoDisponibilidad === 'semana' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{t('Semanal')}</button>
                            </div>

                            <div className="flex justify-between items-center mb-3">
                                <button onClick={() => modoDisponibilidad === 'semana' ? cambiarSemanaDisponibilidad(-1) : cambiarMesDisponibilidad(-1)} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">‹</button>
                                <span className="text-sm sm:text-lg font-bold text-center px-2">
                                    {modoDisponibilidad === 'semana' ? `${formatDate(getDiasSemanaDisponibilidad(disponibilidadFecha)[0])} - ${formatDate(getDiasSemanaDisponibilidad(disponibilidadFecha)[6])}` : `${monthNames[disponibilidadFecha.getMonth()]} ${disponibilidadFecha.getFullYear()}`}
                                </span>
                                <button onClick={() => modoDisponibilidad === 'semana' ? cambiarSemanaDisponibilidad(1) : cambiarMesDisponibilidad(1)} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">›</button>
                            </div>
                            
                            {disponibilidadCargando ? (
                                <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-b-2 border-pink-500 mx-auto"></div><p className="mt-2">{t('Cargando disponibilidad...')}</p></div>
                            ) : modoDisponibilidad === 'semana' ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{t('Disponibilidad semanal')}</p>
                                            <p className="text-xs text-gray-500">{t('Turnos libres en verde para compartir.')}</p>
                                        </div>
                                        <button
                                            onClick={compartirDisponibilidadSemanal}
                                            disabled={disponibilidadSemanal.length === 0}
                                            className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-green-700 disabled:opacity-50 shadow-sm"
                                        >
                                            {t('Compartir')}
                                        </button>
                                    </div>

                                    <div className="rounded-2xl border border-pink-100 bg-white overflow-hidden shadow-sm">
                                        <div className="grid grid-cols-7 divide-x divide-gray-200">
                                            {disponibilidadSemanal.map(dia => {
                                                const disponibles = dia.turnos.filter(turno => turno.estado === 'Disponible');
                                                const diaCorto = dia.diaNombre.slice(0, 3);
                                                const fechaCorta = dia.fecha.slice(5);

                                                return (
                                                <div key={dia.fecha} className="bg-gradient-to-b from-white to-pink-50/50 min-w-0 min-h-[190px] sm:min-h-[260px]">
                                                    <div className={`px-1 py-3 sm:p-4 border-b text-center ${dia.libres > 0 ? 'bg-green-50 border-green-100' : 'bg-gray-100 border-gray-200'}`}>
                                                        <p className="font-extrabold text-gray-900 leading-tight text-[11px] sm:text-base uppercase truncate">{diaCorto}</p>
                                                        <p className="text-[9px] sm:text-xs text-gray-500 leading-tight mt-1">{fechaCorta}</p>
                                                    </div>

                                                    <div className="px-1.5 py-3 sm:p-4 space-y-2 sm:space-y-3">
                                                        {disponibles.length === 0 ? (
                                                            <div className="h-24 sm:h-32 rounded-xl border border-dashed border-gray-200 bg-white/70 text-gray-400 text-[9px] sm:text-xs flex items-center justify-center text-center px-1 leading-tight">
                                                                {t('Sin turnos')}
                                                            </div>
                                                        ) : (
                                                            disponibles.map(turno => (
                                                                <div key={`${dia.fecha}-${turno.hora}`} className="rounded-xl border border-green-600 bg-gradient-to-b from-emerald-400 to-green-600 text-white px-1 py-3 sm:py-4 text-center shadow-md" title={turno.detalle}>
                                                                    <div className="text-[12px] sm:text-lg font-extrabold leading-none whitespace-nowrap">{formatTo12Hour(turno.hora).replace(' ', '')}</div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            );})}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3 text-[11px] sm:text-xs text-gray-600">
                                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span>{t('Disponible')}</span>
                                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></span>{t('Sin turnos')}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{t('Disponibilidad mensual')}</p>
                                            <p className="text-xs text-gray-500">{t('Calendario listo para compartir.')}</p>
                                        </div>
                                        <button
                                            onClick={compartirDisponibilidadMensual}
                                            className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-green-700 shadow-sm"
                                        >
                                            {t('Compartir')}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-7 mb-2 text-center">
                                        {(idioma === 'en' ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['D', 'L', 'M', 'M', 'J', 'V', 'S']).map((d, i) => <div key={i} className="text-xs font-medium text-gray-500">{d}</div>)}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {disponibilidadDays.map((date, idx) => {
                                            if (!date) return <div key={idx} className="h-12" />;
                                            const fechaStr = formatDate(date);
                                            const disponible = disponibilidadDias[fechaStr] === true;
                                            const disponiblesDia = disponibilidadConteos[fechaStr] || 0;
                                            const esCerrado = diasCerradosFechas.includes(fechaStr);
                                            const esPasado = fechaStr < getCurrentLocalDate();
                                            const tonoConteo = disponiblesDia >= 4
                                                ? 'bg-green-100 text-green-700 border-green-300'
                                                : disponiblesDia === 3
                                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                                    : disponiblesDia > 0
                                                        ? 'bg-red-100 text-red-700 border-red-300'
                                                        : 'bg-gray-100 text-gray-400 border-gray-200';
                                            
                                            let className = "h-14 w-full rounded-lg text-sm font-medium flex flex-col items-center justify-center border transition";
                                            if (esCerrado) className += " bg-red-50 text-red-400 border-red-100 line-through";
                                            else if (esPasado) className += " bg-gray-100 text-gray-400 border-gray-200";
                                            else if (disponible) className += " bg-white text-gray-800 border-gray-200 hover:bg-gray-50";
                                            else className += " bg-gray-100 text-gray-400 border-gray-200";
                                            
                                            return (
                                                <div key={idx} className={className} title={esCerrado ? t('Día cerrado') : esPasado ? t('Fecha pasada') : disponible ? t('{n} turno(s) disponible(s)', { n: disponiblesDia }) : t('Sin horarios disponibles')}>
                                                    <span className="text-base leading-tight">{date.getDate()}</span>
                                                    {!esCerrado && !esPasado && (
                                                        <span className={`mt-0.5 min-w-5 px-1.5 py-0.5 rounded-full border text-[11px] font-bold leading-none ${tonoConteo}`}>
                                                            {disponiblesDia}
                                                        </span>
                                                    )}
                                                    {esCerrado && <span className="text-xs">x</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            {modoDisponibilidad === 'mes' && <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2"><div className="w-5 h-5 bg-green-100 border border-green-300 rounded-full flex items-center justify-center text-[10px] font-bold text-green-700">6</div><span>{t('4+ tranquilo')}</span></div>
                                    <div className="flex items-center gap-2"><div className="w-5 h-5 bg-yellow-100 border border-yellow-300 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-700">3</div><span>{t('3 medio')}</span></div>
                                    <div className="flex items-center gap-2"><div className="w-5 h-5 bg-red-100 border border-red-300 rounded-full flex items-center justify-center text-[10px] font-bold text-red-700">2</div><span>{t('1-2 urgente')}</span></div>
                                    <div className="flex items-center gap-2"><div className="w-5 h-5 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-400">0</div><span>{t('Sin horarios')}</span></div>
                                </div>
                            </div>}
                        </div>
                    </div>
                )}

                {/* PESTAÑAS */}
                <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2">
                    {tabsDisponibles.map(tab => (
                        <button key={tab.id} onClick={() => setTabActivo(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tabActivo === tab.id ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            <span>{tab.icono}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* CONTENIDO */}
                {tabActivo === 'estadisticas' && (
                    renderEstadisticas()
                )}

                {tabActivo === 'configuracion' && (
                    <ConfigPanel profesionalId={userRole === 'profesional' ? profesional?.id : null} modoRestringido={userRole === 'profesional' && userNivel === 2} />
                )}

                {tabActivo === 'servicios' && (userRole === 'admin' || userNivel >= 3) && (
                    <ServiciosPanel />
                )}

                {tabActivo === 'profesionales' && (userRole === 'admin' || userNivel >= 3) && (
                    <ProfesionalesPanel />
                )}

                {tabActivo === 'clientes' && (userRole === 'admin' || userNivel >= 2) && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
                            <h2 className="text-xl font-bold">{t('Clientes Registrados ({n})', { n: clientesRegistrados.length })}</h2>
                            <p className="text-sm text-gray-500">{t('Score calculado con el historial de reservas, completadas y canceladas.')}</p>
                            <div className="flex flex-wrap gap-2">
                                {(userRole === 'admin' || userNivel >= 3) && (
                                    <label className={`px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-black cursor-pointer ${importandoClientesCsv ? 'opacity-60 pointer-events-none' : ''}`}>
                                        {importandoClientesCsv ? t('Importando...') : t('Cargar CSV')}
                                        <input type="file" accept=".csv,text/csv" onChange={handleImportarClientesCsv} className="hidden" disabled={importandoClientesCsv} />
                                    </label>
                                )}
                                <button onClick={() => { setShowClientesRegistrados(!showClientesRegistrados); if (!showClientesRegistrados) { loadClientesRegistrados(); loadClientesBloqueados(); } }} className="px-4 py-2 rounded-lg bg-pink-50 text-pink-600 text-sm font-medium hover:bg-pink-100">
                                    {showClientesRegistrados ? t('Ocultar') : t('Mostrar')}
                                </button>
                            </div>
                        </div>
                        {showClientesRegistrados && (
                            <div className="space-y-5 max-h-[42rem] overflow-y-auto pr-1">
                                {clientesRegistrados.length > 0 && (
                                    <div className="flex items-center gap-2 border border-pink-200 rounded-xl bg-pink-50/50 px-3 py-2">
                                        <span className="text-pink-400 text-sm">🔍</span>
                                        <input
                                            type="text"
                                            value={busquedaClientes}
                                            onChange={e => setBusquedaClientes(e.target.value)}
                                            placeholder={t('Buscar por nombre o número...')}
                                            className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-pink-300"
                                        />
                                        {busquedaClientes && (
                                            <button onClick={() => setBusquedaClientes('')} className="text-pink-400 hover:text-pink-600 text-xs">✕</button>
                                        )}
                                    </div>
                                )}
                                {(userRole === 'admin' || userNivel >= 3) && (
                                    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                                        <h3 className="font-bold text-red-700 mb-3">{t('Lista negra')}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                            <input type="text" value={nuevoBloqueo.nombre} onChange={(e) => setNuevoBloqueo({...nuevoBloqueo, nombre: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" placeholder={t('Nombre opcional')} />
                                            <div className="flex">
                                                <select
                                                    value={nuevoBloqueo.codigo_pais || codigoPaisNegocio}
                                                    onChange={(e) => setNuevoBloqueo({
                                                        ...nuevoBloqueo,
                                                        codigo_pais: e.target.value,
                                                        whatsapp: String(nuevoBloqueo.whatsapp || '').replace(/\D/g, '')
                                                    })}
                                                    className="w-28 rounded-l-lg border border-r-0 px-2 py-2 text-sm bg-white"
                                                >
                                                    {paisesTelefono.map((pais) => (
                                                        <option key={pais.id} value={pais.codigo}>{pais.bandera} +{pais.codigo}</option>
                                                    ))}
                                                </select>
                                                <input type="tel" value={nuevoBloqueo.whatsapp} onChange={(e) => setNuevoBloqueo({...nuevoBloqueo, whatsapp: String(e.target.value || '').replace(/\D/g, '')})} className="border rounded-r-lg px-3 py-2 text-sm" placeholder="WhatsApp" />
                                            </div>
                                            <input type="text" value={nuevoBloqueo.motivo} onChange={(e) => setNuevoBloqueo({...nuevoBloqueo, motivo: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" placeholder={t('Motivo opcional')} />
                                            <button onClick={() => handleBloquearCliente()} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700">{t('Bloquear')}</button>
                                        </div>

                                        <div className="mt-4 space-y-2">
                                            {cargandoBloqueados ? <p className="text-sm text-red-600">{t('Cargando lista negra...')}</p> : clientesBloqueados.length === 0 ? <p className="text-sm text-red-500">{t('No hay clientes bloqueados.')}</p> :
                                                clientesBloqueados.map((cliente) => (
                                                    <div key={cliente.id || cliente.whatsapp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-white border border-red-100 p-3">
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{cliente.nombre || t('Sin nombre')} <span className="text-sm text-gray-500">+{cliente.whatsapp}</span></p>
                                                            {cliente.motivo && <p className="text-xs text-gray-500">{t('Motivo:')} {cliente.motivo}</p>}
                                                        </div>
                                                        <button onClick={() => handleDesbloquearCliente(cliente.whatsapp)} className="px-3 py-2 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">{t('Desbloquear')}</button>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                                {cargandoClientes ? <p className="text-center text-pink-500">{t('Cargando clientes...')}</p> : clientesRegistrados.length === 0 ? <p className="text-center text-gray-500">{t('No hay clientes registrados')}</p> :
                                    (() => {
                                        const q = busquedaClientes.toLowerCase().trim();
                                        const qNum = busquedaClientes.replace(/\D/g, '');
                                        const filtrados = q ? clientesRegistrados.filter(c =>
                                            (c.nombre || '').toLowerCase().includes(q) ||
                                            (qNum && (c.whatsapp || '').includes(qNum))
                                        ) : clientesRegistrados;
                                        if (filtrados.length === 0) return <p className="text-center text-gray-400 text-sm py-4">{t('No hay clientes que coincidan con "{busqueda}"', { busqueda: busquedaClientes })}</p>;
                                        return filtrados.map((cliente, idx) => {
                                        const score = getClienteScore(cliente);
                                        const reservasCliente = getReservasCliente(cliente);
                                        const ultimaCita = score.ultima
                                            ? `${window.formatFechaCompleta ? window.formatFechaCompleta(score.ultima.fecha) : score.ultima.fecha} ${formatTo12Hour(score.ultima.hora_inicio)}`
                                            : t('Sin citas');

                                        return (
                                            <div
                                                key={idx}
                                                role="button"
                                                tabIndex="0"
                                                onClick={() => setClienteDetalle({ cliente, reservas: reservasCliente, score })}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        setClienteDetalle({ cliente, reservas: reservasCliente, score });
                                                    }
                                                }}
                                                className="p-4 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer hover:border-pink-200 hover:bg-pink-50/30 transition"
                                            >
                                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="font-bold text-gray-900 truncate">{cliente.nombre}</p>
                                                            <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${score.tone}`}>{score.label}</span>
                                                            <span className="px-2.5 py-1 rounded-full bg-white border text-xs font-semibold text-gray-700">{t('Score {n}/100', { n: score.score })}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 mt-1">+{cliente.whatsapp}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{t('Ultima cita:')} {ultimaCita}</p>
                                                        <p className="text-xs font-semibold text-pink-600 mt-2">{t('Tocar para ver todos sus turnos')}</p>
                                                    </div>

                                                    {(userRole === 'admin' || userNivel >= 3) && (
                                                        <div className="flex flex-wrap gap-2">
                                                            <button onClick={(event) => { event.stopPropagation(); handleBloquearCliente(cliente); }} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black">
                                                                {t('Bloquear')}
                                                            </button>
                                                            <button onClick={(event) => { event.stopPropagation(); handleEliminarCliente(cliente.whatsapp); }} className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
                                                                {t('Quitar')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                                                    <div className="bg-white rounded-lg p-3 border">
                                                        <p className="text-xs text-gray-500">{t('Total')}</p>
                                                        <p className="text-lg font-bold text-gray-900">{score.total}</p>
                                                    </div>
                                                    <div className="bg-white rounded-lg p-3 border">
                                                        <p className="text-xs text-gray-500">{t('Activas')}</p>
                                                        <p className="text-lg font-bold text-pink-600">{score.activas}</p>
                                                    </div>
                                                    <div className="bg-white rounded-lg p-3 border">
                                                        <p className="text-xs text-gray-500">{t('Pendientes')}</p>
                                                        <p className="text-lg font-bold text-amber-600">{score.pendientes}</p>
                                                    </div>
                                                    <div className="bg-white rounded-lg p-3 border">
                                                        <p className="text-xs text-gray-500">{t('Completadas')}</p>
                                                        <p className="text-lg font-bold text-emerald-600">{score.completadas}</p>
                                                    </div>
                                                    <div className="bg-white rounded-lg p-3 border">
                                                        <p className="text-xs text-gray-500">{t('Canceladas')}</p>
                                                        <p className="text-lg font-bold text-red-600">{score.canceladas}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-3">
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>{t('Completadas {n}%', { n: score.completionRate })}</span>
                                                        <span>{t('Cancelación {n}%', { n: score.cancelRate })}</span>
                                                    </div>
                                                    <div className="h-2 bg-white rounded-full overflow-hidden border">
                                                        <div className="h-full bg-emerald-400" style={{ width: `${score.completionRate}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                    })()}
                            </div>
                        )}
                    </div>
                )}

                {clienteDetalle && (
                    <div className="fixed inset-0 bg-black/50 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setClienteDetalle(null)}>
                        <div className="bg-white w-full sm:max-w-2xl max-h-[88vh] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
                            <div className="p-5 border-b bg-gradient-to-r from-white to-pink-50 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase text-pink-500 tracking-wide">{t('Historial del cliente')}</p>
                                    <h3 className="text-2xl font-bold text-gray-900 truncate">{clienteDetalle.cliente.nombre || t('Cliente')}</h3>
                                    <p className="text-sm text-gray-500">+{clienteDetalle.cliente.whatsapp}</p>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${clienteDetalle.score.tone}`}>{clienteDetalle.score.label}</span>
                                        <span className="px-2.5 py-1 rounded-full bg-white border text-xs font-semibold text-gray-700">{t('Score {n}/100', { n: clienteDetalle.score.score })}</span>
                                        <span className="px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-100 text-xs font-semibold">{t('{n} turnos', { n: clienteDetalle.reservas.length })}</span>
                                    </div>
                                </div>
                                <button onClick={() => setClienteDetalle(null)} className="w-10 h-10 rounded-full bg-white border text-gray-500 hover:text-gray-900 hover:bg-gray-50 text-xl leading-none">×</button>
                            </div>

                            <div className="p-5 overflow-y-auto max-h-[68vh] space-y-3">
                                {clienteDetalle.reservas.length === 0 ? (
                                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
                                        <p className="text-gray-500">{t('Este cliente aún no tiene turnos registrados.')}</p>
                                    </div>
                                ) : (
                                    clienteDetalle.reservas.map((reserva, index) => {
                                        const estado = reserva.estado || 'Reservado';
                                        const estadoClass = agendaStatusStyle[estado] || 'bg-gray-50 border-l-gray-400 border-gray-100 text-gray-900';
                                        const fecha = window.formatFechaCompleta ? window.formatFechaCompleta(reserva.fecha) : reserva.fecha;
                                        const horaInicio = formatTo12Hour(reserva.hora_inicio);
                                        const horaFin = reserva.hora_fin ? formatTo12Hour(reserva.hora_fin) : '';
                                        const cobro = Number(reserva.monto_cobrado || 0);

                                        return (
                                            <div key={reserva.id || index} className={`rounded-xl border border-l-4 p-4 ${estadoClass}`}>
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold">{fecha}</p>
                                                        <p className="text-lg font-extrabold">{horaInicio}{horaFin ? ` - ${horaFin}` : ''}</p>
                                                        <p className="font-semibold mt-2">{reserva.servicio || t('Servicio sin nombre')}</p>
                                                        <p className="text-sm opacity-80">{t('Profesional:')} {reserva.profesional_nombre || t('No asignado')}</p>
                                                    </div>
                                                    <span className="self-start px-3 py-1 rounded-full bg-white/80 border text-xs font-bold">{t(estado)}</span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-sm">
                                                    <div className="bg-white/70 rounded-lg p-2 border">
                                                        <p className="text-xs opacity-70">WhatsApp</p>
                                                        <p className="font-semibold">+{reserva.cliente_whatsapp || clienteDetalle.cliente.whatsapp}</p>
                                                    </div>
                                                    <div className="bg-white/70 rounded-lg p-2 border">
                                                        <p className="text-xs opacity-70">{t('Cobro real')}</p>
                                                        <p className="font-semibold">{cobro > 0 ? `$${cobro}` : t('Sin registrar')}</p>
                                                    </div>
                                                    <div className="bg-white/70 rounded-lg p-2 border">
                                                        <p className="text-xs opacity-70">{t('ID cita')}</p>
                                                        <p className="font-semibold truncate">{reserva.id || '-'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* AGENDA CALENDARIO */}
                {tabActivo === 'agenda' && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-white to-pink-50">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-pink-500 font-bold">{agendaMode === 'dia' ? t('Agenda diaria') : t('Agenda semanal')}</p>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {getAgendaTitle()}
                                    </h2>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="inline-flex bg-gray-100 rounded-lg p-1">
                                        <button onClick={() => setAgendaMode('dia')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${agendaMode === 'dia' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-600'}`}>{t('Dia')}</button>
                                        <button onClick={() => setAgendaMode('semana')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${agendaMode === 'semana' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-600'}`}>{t('Semana')}</button>
                                    </div>
                                    <button onClick={() => setAgendaDate(addDays(agendaDate, agendaMode === 'dia' ? -1 : -7))} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm font-medium">{agendaMode === 'dia' ? t('Día anterior') : t('Semana anterior')}</button>
                                    <button onClick={() => setAgendaDate(new Date())} className="px-3 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 text-sm font-medium">{t('Hoy')}</button>
                                    <button onClick={() => setAgendaDate(addDays(agendaDate, agendaMode === 'dia' ? 1 : 7))} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm font-medium">{agendaMode === 'dia' ? t('Día siguiente') : t('Semana siguiente')}</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1 mt-5 rounded-xl bg-white border border-gray-100 p-2">
                                {agendaDays.map(day => {
                                    const dateStr = formatDate(day);
                                    const selected = dateStr === agendaDateStr;
                                    const isToday = dateStr === agendaToday;
                                    return (
                                        <button
                                            key={dateStr}
                                            onClick={() => { setAgendaDate(day); setAgendaMode('dia'); }}
                                            className={`py-2 rounded-lg text-center transition ${selected ? 'bg-gray-900 text-white shadow-sm' : isToday ? 'bg-pink-50 text-pink-700' : 'hover:bg-gray-50 text-gray-700'}`}
                                        >
                                            <span className="block text-xs font-semibold uppercase">{day.toLocaleDateString(idioma === 'en' ? 'en-US' : 'es-CU', { weekday: 'short' }).charAt(0)}</span>
                                            <span className="block text-lg font-bold leading-tight">{day.getDate()}</span>
                                            <span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${getAgendaDayBookings(day).length ? selected ? 'bg-white' : 'bg-pink-500' : 'bg-transparent'}`}></span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                                <div className="rounded-lg border border-pink-100 bg-white p-3">
                                    <p className="text-xs text-gray-500">{t('Turnos')}</p>
                                    <p className="text-2xl font-bold text-gray-900">{agendaVisibleBookings.length}</p>
                                </div>
                                <div className="rounded-lg border border-amber-100 bg-white p-3">
                                    <p className="text-xs text-gray-500">{t('Pendientes')}</p>
                                    <p className="text-2xl font-bold text-amber-600">{agendaVisibleBookings.filter(b => b.estado === 'Pendiente').length}</p>
                                </div>
                                <div className="rounded-lg border border-emerald-100 bg-white p-3">
                                    <p className="text-xs text-gray-500">{t('Completados')}</p>
                                    <p className="text-2xl font-bold text-emerald-600">{agendaVisibleBookings.filter(b => b.estado === 'Completado').length}</p>
                                </div>
                                <div className="rounded-lg border border-blue-100 bg-white p-3">
                                    <p className="text-xs text-gray-500">{t('Profesionales')}</p>
                                    <p className="text-2xl font-bold text-blue-600">{new Set(agendaVisibleBookings.map(b => b.profesional_id || b.profesional_nombre)).size}</p>
                                </div>
                            </div>
                        </div>

                        {agendaMode === 'dia' && (
                            <div className="p-3 sm:p-5 overflow-x-auto">
                                <div className="relative border rounded-xl overflow-hidden bg-white" style={{ height: `${agendaGridHeight}px`, minWidth: `${agendaDayMinWidth}px` }}>
                                    <div className="absolute left-0 top-0 bottom-0 w-16 bg-gray-50 border-r z-0">
                                        {agendaHours.map(hour => (
                                            <div key={hour} className="relative border-b border-gray-100 text-right pr-2 text-xs text-gray-400" style={{ height: `${60 * agendaPxPerMinute}px` }}>
                                                <span className="relative -top-2">{formatTo12Hour(`${String(hour).padStart(2, '0')}:00`).replace(':00', '')}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="absolute left-16 right-0 top-0 bottom-0">
                                        {agendaHours.map(hour => (
                                            <div key={hour} className="border-b border-gray-100" style={{ height: `${60 * agendaPxPerMinute}px` }}></div>
                                        ))}

                                        {agendaDayBookings.length === 0 && (
                                            <div className="absolute inset-x-4 top-8 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-gray-500">
                                                {t('No hay citas para este día')}
                                            </div>
                                        )}

                                        {agendaDayLayoutBookings.map(booking => {
                                            const statusClass = agendaStatusStyle[booking.estado] || 'bg-gray-50 border-l-gray-500 border-gray-100 text-gray-900';
                                            const isShort = getBookingHeight(booking) < 76;
                                            return (
                                                <div
                                                    key={booking._grupoVisualId || booking.id}
                                                    className={`absolute rounded-xl border border-l-4 shadow-sm hover:shadow-md transition ${isShort ? 'p-2' : 'p-3'} overflow-hidden cursor-pointer ${statusClass}`}
                                                    style={getAgendaBookingStyle(booking)}
                                                    onClick={() => abrirDetalleAgenda(booking)}
                                                >
                                                    <div className="flex h-full flex-col gap-1">
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-bold leading-tight opacity-90">{formatTo12Hour(booking.hora_inicio)} - {formatTo12Hour(booking.hora_fin || calculateEndTime(booking.hora_inicio, booking.duracion || 60))}</p>
                                                            {!isShort && <p className="text-sm font-bold truncate">{booking.cliente_nombre}</p>}
                                                            {!isShort && <p className="text-xs truncate opacity-90">{booking._grupoVisual ? `${booking._reservasGrupo.length} servicios - ${booking.servicio}` : booking.servicio}</p>}
                                                            {!isShort && <p className="text-[11px] truncate opacity-80">{booking.profesional_nombre || booking.trabajador_nombre || t('Sin profesional')}</p>}
                                                        </div>
                                                        <button onClick={(event) => { event.stopPropagation(); abrirDetalleAgenda(booking); }} className="mt-auto w-full rounded-md py-1 text-[11px] bg-white/80 hover:bg-white text-gray-700 font-bold">
                                                            {t('Detalles')}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {agendaMode === 'semana' && (
                        <div className="overflow-x-auto">
                            <div className="min-w-[1440px]">
                                <div className="grid grid-cols-[72px_repeat(7,minmax(190px,1fr))] border-b bg-white sticky top-0 z-10">
                                    <div className="p-3 text-xs font-semibold text-gray-400 border-r">{t('Hora')}</div>
                                    {agendaDays.map(day => {
                                        const dateStr = formatDate(day);
                                        const dayBookings = getAgendaDayBookings(day);
                                        const isToday = dateStr === agendaToday;
                                        return (
                                            <div key={dateStr} className={`p-3 border-r last:border-r-0 ${isToday ? 'bg-pink-50' : ''}`}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold uppercase text-gray-500">{day.toLocaleDateString(idioma === 'en' ? 'en-US' : 'es-CU', { weekday: 'short' })}</p>
                                                        <p className={`text-xl font-bold ${isToday ? 'text-pink-600' : 'text-gray-900'}`}>{day.getDate()}</p>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${dayBookings.length ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                        {dayBookings.length}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="grid grid-cols-[72px_repeat(7,minmax(190px,1fr))] relative" style={{ height: `${agendaGridHeight}px` }}>
                                    <div className="border-r bg-gray-50">
                                        {agendaHours.map(hour => (
                                            <div key={hour} className="relative border-b border-gray-100 text-right pr-2 text-xs text-gray-400" style={{ height: `${60 * agendaPxPerMinute}px` }}>
                                                <span className="relative -top-2">{formatTo12Hour(`${String(hour).padStart(2, '0')}:00`)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {agendaDays.map(day => {
                                        const dateStr = formatDate(day);
                                        const dayBookings = getAgendaDayBookings(day);
                                        const dayLayoutBookings = getAgendaLayoutBookings(dayBookings);
                                        const isToday = dateStr === agendaToday;
                                        return (
                                            <div key={dateStr} className={`relative border-r last:border-r-0 ${isToday ? 'bg-pink-50/40' : 'bg-white'}`}>
                                                {agendaHours.map(hour => (
                                                    <div key={hour} className="border-b border-gray-100" style={{ height: `${60 * agendaPxPerMinute}px` }}></div>
                                                ))}

                                                {dayLayoutBookings.map(booking => {
                                                    const statusClass = agendaStatusStyle[booking.estado] || 'bg-gray-50 border-l-gray-500 border-gray-100 text-gray-900';
                                                    const isShort = getBookingHeight(booking) < 76;
                                                    return (
                                                        <div
                                                            key={booking._grupoVisualId || booking.id}
                                                            className={`absolute rounded-xl border border-l-4 shadow-sm hover:shadow-md transition p-2 overflow-hidden cursor-pointer ${statusClass}`}
                                                            style={getAgendaBookingStyle(booking)}
                                                            title={`${booking.cliente_nombre} - ${booking._grupoVisual ? `${booking._reservasGrupo.length} servicios: ` : ''}${booking.servicio}`}
                                                            onClick={() => abrirDetalleAgenda(booking)}
                                                        >
                                                            <div className="flex h-full flex-col gap-1">
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold leading-tight">{formatTo12Hour(booking.hora_inicio)} - {formatTo12Hour(booking.hora_fin || calculateEndTime(booking.hora_inicio, booking.duracion || 60))}</p>
                                                                    {!isShort && <p className="font-bold text-sm truncate">{booking.cliente_nombre}</p>}
                                                                    {!isShort && <p className="text-xs truncate opacity-90">{booking._grupoVisual ? `${booking._reservasGrupo.length} servicios - ${booking.servicio}` : booking.servicio}</p>}
                                                                    {!isShort && <p className="text-xs truncate opacity-80">{booking.profesional_nombre || booking.trabajador_nombre || 'Sin profesional'}</p>}
                                                                </div>
                                                                <button onClick={(event) => { event.stopPropagation(); abrirDetalleAgenda(booking); }} className="mt-auto w-full bg-white/80 hover:bg-white text-gray-700 rounded px-2 py-1 text-[11px] font-bold">
                                                                    Detalles
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        )}

                        <div className="p-4 border-t bg-gray-50 flex flex-wrap gap-3 text-xs">
                            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-pink-500"></span>{t('Reservado')}</span>
                            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-400"></span>{t('Pendiente')}</span>
                            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500"></span>{t('Completado')}</span>
                        </div>
                    </div>
                )}

                {cobroEditando && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl">
                            <div className="flex items-start justify-between gap-4 border-b pb-3 mb-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-emerald-600 font-bold">{t('Cobro real')}</p>
                                    <h3 className="text-xl font-bold text-gray-900">{cobroEditando.cliente_nombre || t('Cliente sin nombre')}</h3>
                                    <p className="text-sm text-gray-500">{cobroEditando.servicio}</p>
                                </div>
                                <button onClick={() => setCobroEditando(null)} disabled={guardandoCobro} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('Monto cobrado real')}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={cobroForm.monto_cobrado}
                                        onChange={(e) => setCobroForm({...cobroForm, monto_cobrado: e.target.value})}
                                        className="w-full border rounded-lg px-3 py-2"
                                        placeholder={t('Ej: 2500')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('Nota opcional')}</label>
                                    <textarea
                                        value={cobroForm.notas_cobro}
                                        onChange={(e) => setCobroForm({...cobroForm, notas_cobro: e.target.value})}
                                        className="w-full border rounded-lg px-3 py-2 min-h-24"
                                        placeholder={t('Ej: ajuste por diseño extra, descuento, propina...')}
                                    />
                                </div>
                                {cobroEditando._grupoVisual && (
                                    <p className="text-xs text-gray-500">
                                        {t('Esta cita tiene varios servicios. El monto se distribuirá entre ellos para que las estadísticas sumen correctamente.')}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3 mt-5">
                                <button onClick={() => setCobroEditando(null)} disabled={guardandoCobro} className="flex-1 px-4 py-2 border rounded-lg disabled:opacity-50">{t('Cancelar')}</button>
                                <button onClick={guardarCobroReal} disabled={guardandoCobro} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold disabled:opacity-60">
                                    {guardandoCobro ? t('Guardando...') : t('Guardar cobro')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* RESERVAS */}
                {tabActivo === 'reservas' && (
                    <>
                        {userRole === 'profesional' && profesional && (
                            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                                <p className="text-pink-800 font-medium">{t('Hola {nombre} - Mostrando tus reservas ({n})', { nombre: profesional.nombre, n: filteredVisualBookings.length })}</p>
                            </div>
                        )}

                        {/* TURNOS DE MAÑANA — recordatorios por WhatsApp */}
                        {turnosManana.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-amber-400 overflow-hidden">
                                <div className="p-4 bg-gradient-to-r from-amber-50 to-white border-b border-amber-100">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <span className="text-xl">🔔</span>
                                        {t('Turnos de mañana ({n})', { n: turnosManana.length })}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">{t('Envía el recordatorio por WhatsApp con un toque. Quedará marcado como recordado en este dispositivo.')}</p>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {turnosManana.map(b => {
                                        const claveId = String(b._grupoVisualId || b.id);
                                        const yaRecordado = recordatoriosEnviados.has(claveId);
                                        return (
                                            <div key={claveId} className="p-3 sm:p-4 flex flex-wrap sm:flex-nowrap items-center gap-3">
                                                <span className="shrink-0 text-sm font-bold bg-pink-100 text-pink-700 px-2.5 py-1 rounded-full">{formatTo12Hour(b.hora_inicio)}</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-gray-900 truncate">{b.cliente_nombre}</p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {b.servicio}{(b.profesional_nombre || b.trabajador_nombre) ? ` · ${b.profesional_nombre || b.trabajador_nombre}` : ''}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => enviarRecordatorioManana(b)}
                                                    className={`shrink-0 px-3 py-2 rounded-lg text-sm font-bold transition ${yaRecordado
                                                        ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                                                        : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'}`}
                                                    title={yaRecordado ? t('Ya se envió; puedes reenviarlo') : t('Enviar recordatorio por WhatsApp')}
                                                >
                                                    {yaRecordado ? '✅ ' + t('Recordado') : '💬 ' + t('Recordar')}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                            <div className="space-y-2">
                                <p className="text-xs uppercase tracking-wide text-gray-500 font-bold">{t('Filtrar por día')}</p>
                                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-center">
                                    <input
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="col-span-2 sm:col-span-1 border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm min-h-[42px]"
                                        style={{ colorScheme: 'light' }}
                                    />
                                    <button onClick={() => setFilterDate(getCurrentLocalDate())} className={`px-3 py-2 rounded-lg text-sm font-bold border ${filterDate === getCurrentLocalDate() ? 'bg-pink-500 text-white border-pink-500' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>{t('Hoy')}</button>
                                    <button onClick={() => setFilterDate(formatDate(addDays(new Date(), 1)))} className={`px-3 py-2 rounded-lg text-sm font-bold border ${filterDate === formatDate(addDays(new Date(), 1)) ? 'bg-pink-500 text-white border-pink-500' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>{t('Mañana')}</button>
                                    <button onClick={() => setFilterDate('')} className={`px-3 py-2 rounded-lg text-sm font-bold border ${!filterDate ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>{t('Todas')}</button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                                <button onClick={() => setStatusFilter('activas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'activas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>{t('Activas ({n})', { n: activasCount })}</button>
                                <button onClick={() => setStatusFilter('pendientes')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'pendientes' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700'}`}>{t('Pendientes ({n})', { n: pendientesCount })}</button>
                                <button onClick={() => setStatusFilter('completadas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'completadas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>{t('Completadas ({n})', { n: completadasCount })}</button>
                                <button onClick={() => setStatusFilter('ausentes')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'ausentes' ? 'bg-slate-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{t('Ausentes ({n})', { n: ausentesCount })}</button>
                                <button onClick={() => setStatusFilter('canceladas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'canceladas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>{t('Canceladas ({n})', { n: canceladasCount })}</button>
                                <button onClick={() => setStatusFilter('todas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'todas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>{t('Todas ({n})', { n: bookings.length })}</button>
                                {puedeGestionarAvanzado && statusFilter === 'canceladas' && (
                                    <button onClick={borrarCanceladas} className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm">🗑️ {t('Borrar todas')}</button>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div><p className="text-pink-500 mt-4">{t('Cargando reservas...')}</p></div>
                        ) : (
                            <div className="space-y-3">
                                {filteredVisualBookings.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl"><p className="text-gray-500">{t('No hay reservas para mostrar')}</p></div>
                                ) : (
                                    filteredVisualBookings.map(b => (
                                        <div key={b._grupoVisualId || b.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${
                                            b.estado === 'Reservado' ? 'border-l-pink-500' :
                                            b.estado === 'Pendiente' ? 'border-l-yellow-500' :
                                            b.estado === 'Completado' ? 'border-l-green-500' :
                                            b.estado === 'Ausente' ? 'border-l-slate-500' :
                                            'border-l-red-500'
                                        }`}>
                                            <div className="flex justify-between mb-2">
                                                <span className="font-semibold">{window.formatFechaCompleta ? window.formatFechaCompleta(b.fecha) : b.fecha}</span>
                                                <span className="text-sm bg-pink-100 text-pink-700 px-2 py-1 rounded-full">{formatTo12Hour(b.hora_inicio)}{b._grupoVisual ? ` - ${formatTo12Hour(b.hora_fin)}` : ''}</span>
                                            </div>
                                            <div className="text-sm space-y-1">
                                                <p><span className="font-medium">{t('Cliente:')}</span> {b.cliente_nombre}</p>
                                                <p><span className="font-medium">WhatsApp:</span> {b.cliente_whatsapp}</p>
                                                <p><span className="font-medium">{t('Servicio:')}</span> {b.servicio}</p>
                                                <p><span className="font-medium">👩‍🎨 {t('Profesional:')}</span> {b.profesional_nombre || b.trabajador_nombre}</p>
                                                {b._grupoVisual && (
                                                    <div className="mt-2 rounded-lg bg-pink-50 border border-pink-100 p-2 space-y-1">
                                                        <p className="text-xs font-bold text-pink-700">{t('Cita agrupada: {n} servicios consecutivos', { n: b._reservasGrupo.length })}</p>
                                                        {b._reservasGrupo.map(item => (
                                                            <p key={item.id} className="text-xs text-gray-700">
                                                                {formatTo12Hour(item.hora_inicio)} - {formatTo12Hour(item.hora_fin || calculateEndTime(item.hora_inicio, item.duracion || 60))} - {item.servicio} - {item.profesional_nombre || item.trabajador_nombre || t('Sin profesional')}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                                {Number(b.monto_cobrado || 0) > 0 && (
                                                    <div className="mt-2 rounded-lg bg-green-50 border border-green-100 p-2">
                                                        <p className="text-xs font-bold text-green-700">{t('Cobro real: {monto}', { monto: '$' + Number(b.monto_cobrado).toLocaleString(idioma === 'en' ? 'en-US' : 'es-CU') })}</p>
                                                        {b.notas_cobro && <p className="text-xs text-green-700 mt-1">{b.notas_cobro}</p>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center mt-3 pt-2 border-t">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${b.estado === 'Reservado' ? 'bg-pink-100 text-pink-700' : b.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' : b.estado === 'Completado' ? 'bg-green-100 text-green-700' : b.estado === 'Ausente' ? 'bg-slate-100 text-slate-700' : 'bg-red-100 text-red-700'}`}>
                                                    {t(b.estado)}
                                                </span>
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    {puedeEditarReserva(b) && (b.estado === 'Pendiente' || b.estado === 'Reservado') && (
                                                        <button onClick={() => abrirModalReprogramar(b)} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">{t('Reprogramar')}</button>
                                                    )}
                                                    {puedeGestionarReservas && b.estado === 'Pendiente' && (
                                                        <button onClick={() => confirmarPago(b.id, b)} className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">{t('Confirmar pago')}</button>
                                                    )}
                                                    {puedeGestionarReservas && b.estado === 'Reservado' && (
                                                        <button onClick={() => handleCancel(b.id, b)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">❌ {t('Cancelar')}</button>
                                                    )}
                                                    {puedeGestionarReservas && b.estado === 'Completado' && (
                                                        <button onClick={() => abrirModalCobro(b)} className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                                                            {Number(b.monto_cobrado || 0) > 0 ? t('Editar cobro') : t('Cobro real')}
                                                        </button>
                                                    )}
                                                    {puedeGestionarReservas && turnoYaPaso(b) && b.estado !== 'Cancelado' && b.estado !== 'Ausente' && (
                                                        <button onClick={() => marcarAusencia(b)} className="px-3 py-1 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700">{t('Marcar ausencia')}</button>
                                                    )}
                                                    {puedeGestionarAvanzado && (b.estado === 'Cancelado' || b.estado === 'Completado' || b.estado === 'Ausente') && (
                                                        <button onClick={() => eliminarReservaHistorial(b)} className="px-3 py-1 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-800">{t('Eliminar')}</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminApp />);
