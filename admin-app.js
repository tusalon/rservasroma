// admin-app.js - Panel de administración (VERSIÓN GENÉRICA)
// CON BOTÓN DE NUEVA RESERVA MANUAL, ENVÍO DE WHATSAPP AL CLIENTE, DÍAS CERRADOS
// Y VISTA DE CALENDARIO SEMANAL

console.log('🚀 ADMIN-APP.JS - Panel de administración con Calendario Semanal');

window.addEventListener('error', function(e) {
    console.error('❌ Error detectado, posible versión antigua:', e.message);
    
    if (e.message.includes('Failed to load') || e.message.includes('Unexpected token')) {
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

// ============================================
// FUNCIÓN PARA OBTENER NEGOCIO_ID
// ============================================
function getNegocioId() {
    const localId = localStorage.getItem('negocioId');
    if (localId) {
        console.log('📌 AdminApp usando negocioId de localStorage:', localId);
        return localId;
    }
    
    if (window.NEGOCIO_ID_POR_DEFECTO) {
        console.log('📌 AdminApp usando NEGOCIO_ID_POR_DEFECTO:', window.NEGOCIO_ID_POR_DEFECTO);
        return window.NEGOCIO_ID_POR_DEFECTO;
    }
    
    if (typeof window.getNegocioId === 'function') {
        const id = window.getNegocioId();
        console.log('📌 AdminApp usando window.getNegocioId():', id);
        return id;
    }
    
    console.error('❌ No se pudo obtener negocioId');
    return null;
}

// ============================================
// FUNCIONES DE SUPABASE
// ============================================

async function getAllBookings() {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) {
            console.error('❌ No hay negocioId disponible');
            return [];
        }
        
        console.log('📋 Obteniendo reservas para negocio:', negocioId);
        
        const res = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&select=*&order=fecha.desc,hora_inicio.asc`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!res.ok) {
            console.error('Error en respuesta:', await res.text());
            return [];
        }
        
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }
}

async function cancelBooking(id) {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) {
            console.error('❌ No hay negocioId disponible');
            return false;
        }
        
        console.log(`🗑️ Cancelando reserva ${id} para negocio:`, negocioId);
        
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
            console.error('❌ No hay negocioId disponible');
            return { success: false, error: 'No hay negocioId' };
        }
        
        const dataWithNegocio = {
            ...bookingData,
            negocio_id: negocioId
        };
        
        console.log('📤 Creando reserva para negocio:', negocioId, dataWithNegocio);
        
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

// ============================================
// FUNCIÓN PARA MARCAR TURNOS COMO COMPLETADOS
// ============================================
async function marcarTurnosCompletados() {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) {
            console.error('❌ No hay negocioId disponible');
            return;
        }
        
        const ahora = new Date();
        const año = ahora.getFullYear();
        const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
        const dia = ahora.getDate().toString().padStart(2, '0');
        const hoy = `${año}-${mes}-${dia}`;
        
        const horaActual = ahora.getHours();
        const minutosActuales = ahora.getMinutes();
        const totalMinutosActual = horaActual * 60 + minutosActuales;
        
        console.log('⏰ Verificando turnos para marcar como completados...');
        console.log('📅 Fecha LOCAL actual:', hoy);
        console.log('🕐 Hora LOCAL actual:', `${horaActual}:${minutosActuales}`);
        
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
        
        console.log(`📊 Turnos de días pasados (fecha < ${hoy}): ${turnosPasados.length}`);
        console.log(`📊 Turnos de hoy terminados: ${turnosHoyTerminados.length}`);
        
        const turnosACompletar = [...turnosPasados, ...turnosHoyTerminados];
        
        if (turnosACompletar.length > 0) {
            console.log(`✅ ${turnosACompletar.length} turnos a marcar como completados`);
            
            for (const turno of turnosACompletar) {
                console.log(`📝 Completando turno de ${turno.cliente_nombre} - ${turno.fecha} ${turno.hora_inicio} a ${turno.hora_fin}`);
                
                await fetch(
                    `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${turno.id}`,
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
            }
            
            console.log(`✅ ${turnosACompletar.length} turnos marcados como completados`);
        } else {
            console.log('⏰ No hay turnos para completar');
        }
        
    } catch (error) {
        console.error('Error marcando turnos completados:', error);
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

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

const indiceToHoraLegible = (indice) => {
    const horas = Math.floor(indice / 2);
    const minutos = indice % 2 === 0 ? '00' : '30';
    return `${horas.toString().padStart(2, '0')}:${minutos}`;
};

// ============================================
// FUNCIONES PARA CALENDARIO SEMANAL
// ============================================
function getWeekDates(baseDate) {
    const date = new Date(baseDate);
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        weekDates.push(dayDate);
    }
    return weekDates;
}

function formatDateShort(date) {
    return `${date.getDate()}/${date.getMonth() + 1}`;
}

function formatDateFull(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDayName(date) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
}

function getDayNameShort(date) {
    const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return days[date.getDay()];
}

function getHoursRange() {
    const hours = [];
    for (let i = 9; i <= 20; i++) {
        hours.push(`${i.toString().padStart(2, '0')}:00`);
        hours.push(`${i.toString().padStart(2, '0')}:30`);
    }
    return hours;
}

function getBookingsForCell(bookings, dateStr, hourStr, profesionalIdFilter) {
    return bookings.filter(booking => {
        if (booking.fecha !== dateStr) return false;
        if (booking.hora_inicio !== hourStr) return false;
        if (profesionalIdFilter && booking.profesional_id !== profesionalIdFilter) return false;
        return true;
    });
}

function getEstadoColor(estado) {
    switch(estado) {
        case 'Reservado': return 'bg-green-500 text-white';
        case 'Pendiente': return 'bg-yellow-500 text-white';
        case 'Completado': return 'bg-gray-400 text-white';
        case 'Cancelado': return 'bg-red-400 text-white line-through';
        default: return 'bg-pink-500 text-white';
    }
}

function getEstadoIcon(estado) {
    switch(estado) {
        case 'Reservado': return '✅';
        case 'Pendiente': return '💰';
        case 'Completado': return '✓';
        case 'Cancelado': return '❌';
        default: return '📅';
    }
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
function AdminApp() {
    const [bookings, setBookings] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [statusFilter, setStatusFilter] = React.useState('activas');
    const [vistaCalendario, setVistaCalendario] = React.useState('semana');
    const [fechaActual, setFechaActual] = React.useState(new Date());
    const [profesionalFiltro, setProfesionalFiltro] = React.useState(null);
    
    const [userRole, setUserRole] = React.useState('admin');
    const [userNivel, setUserNivel] = React.useState(3);
    const [profesional, setProfesional] = React.useState(null);
    const [nombreNegocio, setNombreNegocio] = React.useState('Mi Negocio');
    const [logoNegocio, setLogoNegocio] = React.useState(null);
    
    const [config, setConfig] = React.useState(null);
    const [configVersion, setConfigVersion] = React.useState(0);
    
    const [tabActivo, setTabActivo] = React.useState('reservas');
    
    const [showClientesRegistrados, setShowClientesRegistrados] = React.useState(false);
    const [clientesRegistrados, setClientesRegistrados] = React.useState([]);
    const [errorClientes, setErrorClientes] = React.useState('');
    const [cargandoClientes, setCargandoClientes] = React.useState(false);

    const [showNuevaReservaModal, setShowNuevaReservaModal] = React.useState(false);
    const [nuevaReservaData, setNuevaReservaData] = React.useState({
        cliente_nombre: '',
        cliente_whatsapp: '',
        servicio: '',
        profesional_id: '',
        fecha: '',
        hora_inicio: '',
        requiereAnticipo: false
    });
    
    const [diasCerradosFechas, setDiasCerradosFechas] = React.useState([]);

    const [serviciosList, setServiciosList] = React.useState([]);
    const [profesionalesList, setProfesionalesList] = React.useState([]);
    const [horariosDisponibles, setHorariosDisponibles] = React.useState([]);
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [diasLaborales, setDiasLaborales] = React.useState([]);
    const [fechasConHorarios, setFechasConHorarios] = React.useState({});

    // ============================================
    // CARGAR CONFIGURACIÓN Y LOGO
    // ============================================
    React.useEffect(() => {
        window.getNombreNegocio().then(nombre => {
            setNombreNegocio(nombre);
        });
        
        cargarConfiguracion();
    }, [configVersion]);

    const cargarConfiguracion = async () => {
        try {
            const configData = await window.cargarConfiguracionNegocio(true);
            setConfig(configData);
            if (configData?.nombre) {
                setNombreNegocio(configData.nombre);
            }
            if (configData?.logo_url) {
                setLogoNegocio(configData.logo_url);
            }
            console.log('✅ Configuración recargada:', configData);
        } catch (error) {
            console.error('Error cargando config:', error);
        }
    };

    // ============================================
    // DETECTAR ROL DEL USUARIO
    // ============================================
    React.useEffect(() => {
        const profesionalAuth = window.getProfesionalAutenticado?.();
        if (profesionalAuth) {
            console.log('👤 Usuario detectado como profesional:', profesionalAuth);
            setUserRole('profesional');
            setProfesional(profesionalAuth);
            setUserNivel(profesionalAuth.nivel || 1);
            setProfesionalFiltro(profesionalAuth.id);
            
            setNuevaReservaData(prev => ({
                ...prev,
                profesional_id: profesionalAuth.id
            }));
        } else {
            console.log('👑 Usuario detectado como admin');
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
            }
        };
        cargarDatosModal();
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

    React.useEffect(() => {
        if (showNuevaReservaModal) {
            const cargarDiasCerrados = async () => {
                if (window.getDiasCerradosFechas) {
                    const fechas = await window.getDiasCerradosFechas();
                    setDiasCerradosFechas(fechas);
                }
            };
            cargarDiasCerrados();
        }
    }, [showNuevaReservaModal]);

    React.useEffect(() => {
        const cargarHorarios = async () => {
            if (!nuevaReservaData.profesional_id || !nuevaReservaData.fecha || !nuevaReservaData.servicio) {
                setHorariosDisponibles([]);
                return;
            }

            try {
                const servicio = serviciosList.find(s => s.nombre === nuevaReservaData.servicio);
                if (!servicio) return;

                const horarios = await window.salonConfig.getHorariosProfesional(nuevaReservaData.profesional_id);
                const horasTrabajo = horarios.horas || [];
                
                const slotsTrabajo = horasTrabajo.map(indice => indiceToHoraLegible(indice));
                
                const response = await fetch(
                    `${window.SUPABASE_URL}/rest/v1/reservas?fecha=eq.${nuevaReservaData.fecha}&profesional_id=eq.${nuevaReservaData.profesional_id}&estado=neq.Cancelado&select=hora_inicio,hora_fin`,
                    {
                        headers: {
                            'apikey': window.SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                        }
                    }
                );
                
                const reservas = await response.json();

                const ahora = new Date();
                const horaActual = ahora.getHours();
                const minutosActuales = ahora.getMinutes();
                const totalMinutosActual = horaActual * 60 + minutosActuales;
                const minAllowedMinutes = totalMinutosActual + 120;

                const hoy = new Date().toISOString().split('T')[0];
                const esHoy = nuevaReservaData.fecha === hoy;

                const disponibles = slotsTrabajo.filter(slot => {
                    const [horas, minutos] = slot.split(':').map(Number);
                    const slotStart = horas * 60 + minutos;
                    const slotEnd = slotStart + servicio.duracion;

                    if (esHoy && slotStart < minAllowedMinutes) {
                        return false;
                    }

                    const tieneConflicto = reservas.some(reserva => {
                        const reservaStart = timeToMinutes(reserva.hora_inicio);
                        const reservaEnd = timeToMinutes(reserva.hora_fin);
                        return (slotStart < reservaEnd) && (slotEnd > reservaStart);
                    });

                    return !tieneConflicto;
                });

                disponibles.sort((a, b) => {
                    const [hA, mA] = a.split(':').map(Number);
                    const [hB, mB] = b.split(':').map(Number);
                    return (hA * 60 + mA) - (hB * 60 + mB);
                });

                setHorariosDisponibles(disponibles);

            } catch (error) {
                console.error('Error cargando horarios:', error);
                setHorariosDisponibles([]);
            }
        };

        cargarHorarios();
    }, [nuevaReservaData.profesional_id, nuevaReservaData.fecha, nuevaReservaData.servicio, serviciosList]);

    const cargarDisponibilidadMes = async (fecha, profesionalId) => {
        if (!profesionalId) return;
        
        try {
            const year = fecha.getFullYear();
            const month = fecha.getMonth();
            
            const horarios = await window.salonConfig.getHorariosProfesional(profesionalId);
            const horasTrabajo = horarios.horas || [];
            
            if (horasTrabajo.length === 0) {
                setFechasConHorarios({});
                return;
            }
            
            const primerDia = new Date(year, month, 1);
            const ultimoDia = new Date(year, month + 1, 0);
            
            const fechaInicio = primerDia.toISOString().split('T')[0];
            const fechaFin = ultimoDia.toISOString().split('T')[0];
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?fecha=gte.${fechaInicio}&fecha=lte.${fechaFin}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=fecha,hora_inicio,hora_fin`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            const reservas = await response.json();
            
            const reservasPorFecha = {};
            (reservas || []).forEach(r => {
                if (!reservasPorFecha[r.fecha]) {
                    reservasPorFecha[r.fecha] = [];
                }
                reservasPorFecha[r.fecha].push(r);
            });
            
            const disponibilidad = {};
            const diasEnMes = ultimoDia.getDate();
            
            for (let d = 1; d <= diasEnMes; d++) {
                const fechaStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                
                let tieneDisponibilidad = false;
                
                for (const horaIndice of horasTrabajo) {
                    const slotStr = indiceToHoraLegible(horaIndice);
                    const [horas, minutos] = slotStr.split(':').map(Number);
                    const slotStart = horas * 60 + minutos;
                    const slotEnd = slotStart + 60;
                    
                    const reservasDia = reservasPorFecha[fechaStr] || [];
                    const tieneConflicto = reservasDia.some(reserva => {
                        const reservaStart = timeToMinutes(reserva.hora_inicio);
                        const reservaEnd = timeToMinutes(reserva.hora_fin);
                        return (slotStart < reservaEnd) && (slotEnd > reservaStart);
                    });
                    
                    if (!tieneConflicto) {
                        tieneDisponibilidad = true;
                        break;
                    }
                }
                
                disponibilidad[fechaStr] = tieneDisponibilidad;
            }
            
            setFechasConHorarios(disponibilidad);
        } catch (error) {
            console.error('Error cargando disponibilidad:', error);
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

    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
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
        
        if (diasCerradosFechas.includes(fechaStr)) {
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
            setNuevaReservaData({...nuevaReservaData, fecha: fechaStr, hora_inicio: ''});
        }
    };

    // ============================================
    // FUNCIÓN CORREGIDA: CREAR RESERVA MANUAL CON OPCIÓN DE ANTICIPO
    // ============================================
    const handleCrearReservaManual = async () => {
        if (!nuevaReservaData.cliente_nombre || !nuevaReservaData.cliente_whatsapp || 
            !nuevaReservaData.servicio || !nuevaReservaData.profesional_id || 
            !nuevaReservaData.fecha || !nuevaReservaData.hora_inicio) {
            alert('Completá todos los campos');
            return;
        }

        try {
            const servicio = serviciosList.find(s => s.nombre === nuevaReservaData.servicio);
            if (!servicio) {
                alert('Servicio no encontrado');
                return;
            }
            
            const profesional = profesionalesList.find(p => p.id === parseInt(nuevaReservaData.profesional_id));
            if (!profesional) {
                alert('Profesional no encontrado');
                return;
            }
            
            const endTime = calculateEndTime(nuevaReservaData.hora_inicio, servicio.duracion);
            const configNegocio = await window.cargarConfiguracionNegocio();
            const requiereAnticipo = nuevaReservaData.requiereAnticipo;
            
            const bookingData = {
                cliente_nombre: nuevaReservaData.cliente_nombre,
                cliente_whatsapp: `53${nuevaReservaData.cliente_whatsapp.replace(/\D/g, '')}`,
                servicio: nuevaReservaData.servicio,
                duracion: servicio.duracion,
                profesional_id: nuevaReservaData.profesional_id,
                profesional_nombre: profesional.nombre,
                fecha: nuevaReservaData.fecha,
                hora_inicio: nuevaReservaData.hora_inicio,
                hora_fin: endTime,
                estado: requiereAnticipo ? "Pendiente" : "Reservado"
            };

            console.log('📤 Creando reserva manual. Requiere anticipo:', requiereAnticipo);
            console.log('📤 Estado:', bookingData.estado);
            
            const result = await createBooking(bookingData);
            
            if (result.success && result.data) {
                alert(`✅ Reserva creada exitosamente como "${result.data.estado}"`);
                
                console.log('📱 Enviando mensaje al cliente...');
                
                try {
                    if (requiereAnticipo) {
                        if (window.enviarMensajePago) {
                            await window.enviarMensajePago(result.data, configNegocio);
                            console.log('✅ Mensaje con datos de pago enviado al cliente');
                        } else {
                            console.warn('⚠️ window.enviarMensajePago no está disponible');
                            alert('⚠️ Reserva creada pero no se pudo enviar mensaje de pago.');
                        }
                    } else {
                        if (window.enviarConfirmacionReserva) {
                            await window.enviarConfirmacionReserva(result.data, configNegocio);
                            console.log('✅ Confirmación de turno enviada al cliente');
                        } else {
                            console.warn('⚠️ window.enviarConfirmacionReserva no está disponible');
                            alert('⚠️ Reserva creada pero no se pudo enviar confirmación.');
                        }
                    }
                } catch (whatsappError) {
                    console.error('❌ Error enviando WhatsApp:', whatsappError);
                    alert('⚠️ Reserva creada, pero hubo un error al enviar el mensaje al cliente.');
                }
                
                setShowNuevaReservaModal(false);
                setNuevaReservaData({
                    cliente_nombre: '',
                    cliente_whatsapp: '',
                    servicio: '',
                    profesional_id: userRole === 'profesional' ? profesional?.id : '',
                    fecha: '',
                    hora_inicio: '',
                    requiereAnticipo: false
                });
                
                fetchBookings();
            } else {
                alert('❌ Error al crear la reserva: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error creando reserva:', error);
            alert('❌ Error al crear la reserva: ' + error.message);
        }
    };

    // ============================================
    // FUNCIONES DE CLIENTES
    // ============================================
    
    const loadClientesRegistrados = async () => {
        console.log('🔄 Cargando clientes registrados...');
        setCargandoClientes(true);
        try {
            if (typeof window.getClientesRegistrados !== 'function') {
                console.error('❌ getClientesRegistrados no está definida');
                setClientesRegistrados([]);
                return;
            }
            
            const registrados = await window.getClientesRegistrados();
            console.log('📋 Registrados obtenidos:', registrados.length);
            
            if (Array.isArray(registrados)) {
                setClientesRegistrados(registrados);
            } else {
                console.error('❌ registrados no es un array:', registrados);
                setClientesRegistrados([]);
            }
        } catch (error) {
            console.error('Error cargando registrados:', error);
            setClientesRegistrados([]);
        } finally {
            setCargandoClientes(false);
        }
    };

    const handleEliminarCliente = async (whatsapp) => {
        if (!confirm('¿Seguro que querés eliminar este cliente? Perderá el acceso a la app.')) return;
        console.log('🗑️ Eliminando cliente:', whatsapp);
        try {
            if (typeof window.eliminarCliente !== 'function') {
                alert('Error: Función no disponible');
                return;
            }
            const resultado = await window.eliminarCliente(whatsapp);
            if (resultado) {
                await loadClientesRegistrados();
                alert(`✅ Cliente eliminado`);
            }
        } catch (error) {
            console.error('Error eliminando cliente:', error);
            alert('Error al eliminar cliente');
        }
    };

    // ============================================
    // FUNCIONES DE RESERVAS
    // ============================================
    const fetchBookings = async () => {
        setLoading(true);
        try {
            let data;
            
            if (userRole === 'profesional' && profesional) {
                console.log(`📋 Cargando reservas de profesional ${profesional.id}...`);
                data = await window.getReservasPorProfesional?.(profesional.id, false) || [];
            } else {
                data = await getAllBookings();
            }
            
            if (Array.isArray(data)) {
                data.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));
                
                await marcarTurnosCompletados();
                
                if (userRole === 'profesional' && profesional) {
                    data = await window.getReservasPorProfesional?.(profesional.id, false) || [];
                } else {
                    data = await getAllBookings();
                }
                
                setBookings(Array.isArray(data) ? data : []);
            } else {
                setBookings([]);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            alert('Error al cargar las reservas');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        const intervalo = setInterval(() => {
            console.log('⏰ Verificando turnos para completar...');
            
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
        }
        
        console.log('🔍 Verificando auth:', {
            userRole,
            userNivel,
            profesional
        });
    }, [userRole, userNivel, profesional]);

    // ============================================
    // FUNCIÓN PARA CONFIRMAR PAGO
    // ============================================
    const confirmarPago = async (id, bookingData) => {
        if (!confirm(`¿Confirmar que se recibió el pago de ${bookingData.cliente_nombre}? El turno pasará a "Reservado".`)) return;
        
        try {
            console.log(`💰 Confirmando pago para reserva ${id}`);
            
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
            
            console.log('📤 Enviando confirmación de turno al cliente...');
            
            const configNegocio = await window.cargarConfiguracionNegocio();
            
            const fechaConDia = window.formatFechaCompleta ? 
                window.formatFechaCompleta(bookingData.fecha) : 
                bookingData.fecha;
            
            const horaFormateada = window.formatTo12Hour ? 
                window.formatTo12Hour(bookingData.hora_inicio) : 
                bookingData.hora_inicio;
            
            const nombreNegocio = configNegocio?.nombre || await window.getNombreNegocio ? 
                await window.getNombreNegocio() : 
                'Mi Negocio';
            
            const mensajeCliente = 
`💅 *${nombreNegocio} - Turno Confirmado* 🎉

Hola *${bookingData.cliente_nombre}*, ¡tu turno ha sido CONFIRMADO!

📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
💅 *Servicio:* ${bookingData.servicio}
👩‍🎨 *Profesional:* ${bookingData.profesional_nombre || bookingData.trabajador_nombre}

✅ *Pago recibido correctamente*

Te esperamos 💖
Cualquier cambio, podés cancelarlo desde la app con hasta 1 hora de anticipación.`;

            window.enviarWhatsApp(bookingData.cliente_whatsapp, mensajeCliente);
            
            alert('✅ Pago confirmado. Turno reservado y cliente notificado.');
            fetchBookings();
            
        } catch (error) {
            console.error('Error confirmando pago:', error);
            alert('❌ Error al confirmar el pago');
        }
    };

    // ============================================
    // FUNCIÓN PARA BORRAR TODAS LAS RESERVAS CANCELADAS
    // ============================================
    const borrarCanceladas = async () => {
        if (!confirm('¿Estás segura de querer borrar TODAS las reservas canceladas? Esta acción no se puede deshacer.')) return;
        
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
                alert('❌ Error al borrar las reservas canceladas');
                return;
            }
            
            alert(`✅ Se borraron todas las reservas canceladas correctamente`);
            fetchBookings();
            
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error al conectar con el servidor');
        }
    };

    // ============================================
    // HANDLE CANCEL
    // ============================================
    const handleCancel = async (id, bookingData) => {
        if (!confirm(`¿Cancelar reserva de ${bookingData.cliente_nombre}?`)) return;
        
        const ok = await cancelBooking(id);
        if (ok) {
            console.log('📤 Enviando notificaciones de cancelación por admin...');
            
            bookingData.cancelado_por = 'admin';
            
            if (window.notificarCancelacion) {
                await window.notificarCancelacion(bookingData);
            }
            
            alert('✅ Reserva cancelada');
            fetchBookings();
        } else {
            alert('❌ Error al cancelar');
        }
    };

    const handleLogout = () => {
        if (confirm('¿Cerrar sesión?')) {
            localStorage.removeItem('adminAuth');
            localStorage.removeItem('adminUser');
            localStorage.removeItem('adminLoginTime');
            localStorage.removeItem('profesionalAuth');
            localStorage.removeItem('userRole');
            localStorage.removeItem('clienteAuth');
            localStorage.removeItem('negocioId');
            
            console.log('🚪 Sesión cerrada, redirigiendo a index.html');
            window.location.href = 'index.html';
        }
    };

    // ============================================
    // FUNCIONES PARA CALENDARIO SEMANAL
    // ============================================
    const semanaActual = getWeekDates(fechaActual);
    const horasDelDia = getHoursRange();
    
    const cambiarSemana = (direccion) => {
        const nuevaFecha = new Date(fechaActual);
        nuevaFecha.setDate(fechaActual.getDate() + (direccion * 7));
        setFechaActual(nuevaFecha);
    };
    
    const irAHoy = () => {
        setFechaActual(new Date());
    };
    
    const getBookingsFiltradas = () => {
        let filtradas = [...bookings];
        
        if (statusFilter === 'activas') {
            filtradas = filtradas.filter(b => b.estado === 'Reservado');
        } else if (statusFilter === 'pendientes') {
            filtradas = filtradas.filter(b => b.estado === 'Pendiente');
        } else if (statusFilter === 'completadas') {
            filtradas = filtradas.filter(b => b.estado === 'Completado');
        } else if (statusFilter === 'canceladas') {
            filtradas = filtradas.filter(b => b.estado === 'Cancelado');
        }
        
        return filtradas;
    };

    const activasCount = bookings.filter(b => b.estado === 'Reservado').length;
    const pendientesCount = bookings.filter(b => b.estado === 'Pendiente').length;
    const completadasCount = bookings.filter(b => b.estado === 'Completado').length;
    const canceladasCount = bookings.filter(b => b.estado === 'Cancelado').length;
    const bookingsFiltradas = getBookingsFiltradas();

    // ============================================
    // PESTAÑAS
    // ============================================
    const getTabsDisponibles = () => {
        const tabs = [];
        tabs.push({ id: 'reservas', icono: '📅', label: userRole === 'profesional' ? 'Mis Reservas' : 'Reservas' });
        
        if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 3)) {
            tabs.push({ id: 'diasCerrados', icono: '🚫', label: 'Días Cerrados' });
        }
        
        if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 2)) {
            tabs.push({ id: 'configuracion', icono: '⚙️', label: 'Configuración' });
            tabs.push({ id: 'clientes', icono: '👤', label: 'Clientes' });
        }
        
        if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 3)) {
            tabs.push({ id: 'servicios', icono: '💈', label: 'Servicios' });
            tabs.push({ id: 'profesionales', icono: '👥', label: 'Profesionales' });
        }
        
        return tabs;
    };

    const abrirModalNuevaReserva = () => {
        setNuevaReservaData({
            cliente_nombre: '',
            cliente_whatsapp: '',
            servicio: '',
            profesional_id: userRole === 'profesional' ? profesional?.id : '',
            fecha: '',
            hora_inicio: '',
            requiereAnticipo: false
        });
        setCurrentDate(new Date());
        setDiasLaborales([]);
        setFechasConHorarios({});
        setShowNuevaReservaModal(true);
    };

    const tabsDisponibles = getTabsDisponibles();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const days = getDaysInMonth();

    return (
        <div className="min-h-screen bg-pink-50 p-3 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-4">
                
                {/* HEADER CON LOGO */}
                <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-pink-500">
                    <div className="flex items-center gap-3">
                        {/* 🔥 LOGO DEL NEGOCIO */}
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
                                        parent.innerHTML = '<div class="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg flex items-center justify-center"><span class="text-2xl text-white">💖</span></div>';
                                    }
                                }}
                            />
                        ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg flex items-center justify-center">
                                <span className="text-2xl text-white">💖</span>
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-pink-800">{nombreNegocio}</h1>
                            <p className="text-xs text-pink-500">Panel de Administración</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={abrirModalNuevaReserva}
                            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md border border-green-400 flex-1 sm:flex-none justify-center"
                        >
                            <span className="text-lg">📅</span>
                            <span className="font-medium">Nueva Reserva</span>
                        </button>

                        <button
                            onClick={() => window.location.href = 'editar-negocio.html'}
                            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md border border-pink-400 flex-1 sm:flex-none justify-center"
                        >
                            <span className="text-lg">💖</span>
                            <span className="font-medium">Editar Negocio</span>
                        </button>

                        <button 
                            onClick={() => {
                                cargarConfiguracion();
                                setConfigVersion(prev => prev + 1);
                            }} 
                            className="p-2 bg-pink-50 rounded-full hover:bg-pink-100 transition-all hover:scale-105 border border-pink-200"
                            title="Recargar datos del negocio"
                        >
                            <i className="icon-refresh-cw text-pink-600"></i>
                        </button>

                        <button 
                            onClick={fetchBookings} 
                            className="p-2 bg-pink-50 rounded-full hover:bg-pink-100 transition-all hover:scale-105 border border-pink-200"
                            title="Actualizar reservas"
                        >
                            <i className="icon-refresh-cw text-pink-600"></i>
                        </button>

                        <button 
                            onClick={handleLogout}
                            className="p-2 bg-pink-50 rounded-full hover:bg-pink-100 transition-all hover:scale-105 border border-pink-200"
                            title="Cerrar sesión"
                        >
                            <i className="icon-log-out text-pink-600"></i>
                        </button>
                    </div>
                </div>

                {/* MODAL NUEVA RESERVA COMPLETO */}
                {showNuevaReservaModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">📅 Nueva Reserva Manual</h3>
                                <button 
                                    onClick={() => setShowNuevaReservaModal(false)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Cliente *</label>
                                    <input
                                        type="text"
                                        value={nuevaReservaData.cliente_nombre}
                                        onChange={(e) => setNuevaReservaData({...nuevaReservaData, cliente_nombre: e.target.value})}
                                        className="w-full border rounded-lg px-3 py-2"
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp del Cliente *</label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500">+53</span>
                                        <input
                                            type="tel"
                                            value={nuevaReservaData.cliente_whatsapp}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '');
                                                setNuevaReservaData({...nuevaReservaData, cliente_whatsapp: value});
                                            }}
                                            className="w-full px-4 py-2 rounded-r-lg border border-gray-300"
                                            placeholder="55002272"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">8 dígitos después del +53</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Servicio *</label>
                                    <select
                                        value={nuevaReservaData.servicio}
                                        onChange={(e) => setNuevaReservaData({...nuevaReservaData, servicio: e.target.value})}
                                        className="w-full border rounded-lg px-3 py-2"
                                    >
                                        <option value="">Seleccionar servicio</option>
                                        {serviciosList.map(s => (
                                            <option key={s.id} value={s.nombre}>
                                                {s.nombre} ({s.duracion} min - ${s.precio})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Profesional *</label>
                                    {userRole === 'profesional' && userNivel <= 2 ? (
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <p className="text-sm text-blue-700">
                                                Reserva asignada a vos: <strong>{profesional?.nombre}</strong>
                                            </p>
                                        </div>
                                    ) : (
                                        <select
                                            value={nuevaReservaData.profesional_id}
                                            onChange={(e) => setNuevaReservaData({...nuevaReservaData, profesional_id: e.target.value})}
                                            className="w-full border rounded-lg px-3 py-2"
                                        >
                                            <option value="">Seleccionar profesional</option>
                                            {profesionalesList.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nombre} - {p.especialidad}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* CHECKBOX PARA ELEGIR SI REQUIERE ANTICIPO */}
                                {userRole === 'admin' && (
                                    <div className="flex items-center gap-3 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                        <input
                                            type="checkbox"
                                            id="requiereAnticipo"
                                            checked={nuevaReservaData.requiereAnticipo}
                                            onChange={(e) => setNuevaReservaData({...nuevaReservaData, requiereAnticipo: e.target.checked})}
                                            className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                                        />
                                        <label htmlFor="requiereAnticipo" className="text-sm font-medium text-yellow-800">
                                            💰 Requerir anticipo al cliente
                                        </label>
                                        <div className="text-xs text-yellow-600 ml-auto">
                                            {nuevaReservaData.requiereAnticipo ? '⚠️ Cliente deberá pagar para confirmar' : '✅ Reserva confirmada automáticamente'}
                                        </div>
                                    </div>
                                )}

                                {nuevaReservaData.profesional_id && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Fecha *</label>
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                            <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-100">
                                                <button onClick={() => cambiarMes(-1)} className="p-2 hover:bg-white rounded-full transition-colors">◀</button>
                                                <span className="font-bold text-gray-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                                                <button onClick={() => cambiarMes(1)} className="p-2 hover:bg-white rounded-full transition-colors">▶</button>
                                            </div>

                                            <div className="p-3">
                                                <div className="grid grid-cols-7 mb-2 text-center text-xs font-medium text-gray-400">
                                                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (<div key={i}>{d}</div>))}
                                                </div>
                                                
                                                <div className="grid grid-cols-7 gap-1">
                                                    {days.map((date, idx) => {
                                                        if (!date) return <div key={idx} className="h-10" />;

                                                        const fechaStr = formatDate(date);
                                                        const available = isDateAvailable(date);
                                                        const selected = nuevaReservaData.fecha === fechaStr;
                                                        const esCerrado = diasCerradosFechas.includes(fechaStr);
                                                        
                                                        let className = "h-10 w-full flex items-center justify-center rounded-lg text-sm font-medium transition-all relative";
                                                        
                                                        if (selected) {
                                                            className += " bg-pink-500 text-white shadow-md ring-2 ring-pink-300";
                                                        } else if (!available) {
                                                            className += " text-gray-300 cursor-not-allowed bg-gray-50";
                                                        } else {
                                                            className += " text-gray-700 hover:bg-pink-50 hover:text-pink-600 hover:scale-105 cursor-pointer";
                                                        }
                                                        
                                                        let title = "";
                                                        if (esCerrado) {
                                                            title = "🚫 Día cerrado (feriado/vacaciones)";
                                                        } else if (!available) {
                                                            title = "No disponible (día no laborable o sin horarios)";
                                                        } else {
                                                            title = "Disponible";
                                                        }
                                                        
                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => handleDateSelect(date)}
                                                                disabled={!available}
                                                                className={className}
                                                                title={title}
                                                            >
                                                                {date.getDate()}
                                                                {esCerrado && (
                                                                    <span className="absolute top-0 right-0 text-[10px] text-red-500">🚫</span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        {diasCerradosFechas.length > 0 && (
                                            <p className="text-xs text-red-500 mt-1">
                                                🚫 {diasCerradosFechas.length} día(s) cerrado(s) este mes
                                            </p>
                                        )}
                                    </div>
                                )}

                                {nuevaReservaData.fecha && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Hora de inicio *</label>
                                        {horariosDisponibles.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                {horariosDisponibles.map(hora => (
                                                    <button
                                                        key={hora}
                                                        type="button"
                                                        onClick={() => setNuevaReservaData({...nuevaReservaData, hora_inicio: hora})}
                                                        className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                                                            nuevaReservaData.hora_inicio === hora
                                                                ? 'bg-pink-500 text-white'
                                                                : 'bg-gray-100 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {formatTo12Hour(hora)}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                                                No hay horarios disponibles para esta fecha
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => setShowNuevaReservaModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100">Cancelar</button>
                                    <button onClick={handleCrearReservaManual} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Crear Reserva</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PESTAÑAS */}
                <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2">
                    {tabsDisponibles.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setTabActivo(tab.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                tabActivo === tab.id 
                                    ? 'bg-pink-500 text-white shadow-md scale-105' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <span>{tab.icono}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* CONTENIDO - RESERVAS CON CALENDARIO SEMANAL */}
                {tabActivo === 'reservas' && (
                    <>
                        {/* Filtros superiores */}
                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                            {/* Filtro de profesional */}
                            {userRole === 'admin' && profesionalesList.length > 0 && (
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="text-sm font-medium text-gray-700">👩‍🎨 Profesional:</label>
                                    <select
                                        value={profesionalFiltro || ''}
                                        onChange={(e) => setProfesionalFiltro(e.target.value || null)}
                                        className="border rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">Todos los profesionales</option>
                                        {profesionalesList.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                    {profesionalFiltro && (
                                        <button 
                                            onClick={() => setProfesionalFiltro(null)}
                                            className="text-xs text-pink-500 hover:text-pink-700"
                                        >
                                            Limpiar filtro ✕
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Navegación del calendario */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => cambiarSemana(-1)} 
                                        className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm transition"
                                    >
                                        ◀ Semana anterior
                                    </button>
                                    <button 
                                        onClick={irAHoy} 
                                        className="px-3 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 text-sm transition"
                                    >
                                        📅 Hoy
                                    </button>
                                    <button 
                                        onClick={() => cambiarSemana(1)} 
                                        className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm transition"
                                    >
                                        Semana siguiente ▶
                                    </button>
                                </div>
                                <div className="text-lg font-semibold text-pink-700">
                                    {semanaActual[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - {semanaActual[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <button 
                                        onClick={() => setStatusFilter('activas')} 
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${statusFilter === 'activas' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                                    >
                                        Activas ({activasCount})
                                    </button>
                                    <button 
                                        onClick={() => setStatusFilter('pendientes')} 
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${statusFilter === 'pendientes' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                                    >
                                        Pendientes ({pendientesCount})
                                    </button>
                                    <button 
                                        onClick={() => setStatusFilter('completadas')} 
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${statusFilter === 'completadas' ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                                    >
                                        Completadas ({completadasCount})
                                    </button>
                                    <button 
                                        onClick={() => setStatusFilter('canceladas')} 
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${statusFilter === 'canceladas' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                                    >
                                        Canceladas ({canceladasCount})
                                    </button>
                                    <button 
                                        onClick={() => setStatusFilter('todas')} 
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${statusFilter === 'todas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                                    >
                                        Todas ({bookings.length})
                                    </button>
                                    
                                    {statusFilter === 'canceladas' && (
                                        <button
                                            onClick={borrarCanceladas}
                                            className="px-3 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 transition"
                                        >
                                            🗑️ Borrar todas
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* CALENDARIO SEMANAL */}
                        {loading ? (
                            <div className="text-center py-12 bg-white rounded-xl">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                                <p className="text-pink-500 mt-4">Cargando reservas...</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                                <div className="min-w-[800px]">
                                    {/* Cabecera con días */}
                                    <div className="grid grid-cols-8 border-b bg-gray-50 sticky top-0">
                                        <div className="p-3 text-center text-sm font-semibold text-gray-600 border-r">Hora</div>
                                        {semanaActual.map((date, idx) => {
                                            const dateStr = formatDateFull(date);
                                            const isToday = dateStr === getCurrentLocalDate();
                                            const esDiaCerrado = diasCerradosFechas.includes(dateStr);
                                            return (
                                                <div key={idx} className={`p-3 text-center border-r ${isToday ? 'bg-pink-100' : ''} ${esDiaCerrado ? 'bg-red-50' : ''}`}>
                                                    <div className="font-bold text-pink-700">{getDayNameShort(date)}</div>
                                                    <div className="text-sm text-gray-600">{date.getDate()}</div>
                                                    {esDiaCerrado && (
                                                        <div className="text-[10px] text-red-500 mt-1">Cerrado</div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Filas de horas */}
                                    {horasDelDia.map(hora => (
                                        <div key={hora} className="grid grid-cols-8 border-b hover:bg-gray-50 transition">
                                            <div className="p-2 text-sm font-medium text-gray-600 border-r text-center bg-gray-50">
                                                {formatTo12Hour(hora)}
                                            </div>
                                            {semanaActual.map((date, idx) => {
                                                const dateStr = formatDateFull(date);
                                                const esDiaCerrado = diasCerradosFechas.includes(dateStr);
                                                const reservasEnCelda = getBookingsForCell(bookingsFiltradas, dateStr, hora, profesionalFiltro);
                                                
                                                if (esDiaCerrado) {
                                                    return (
                                                        <div key={idx} className="p-1 border-r min-h-[80px] bg-red-50/30">
                                                            <div className="text-center text-xs text-red-400 py-6">
                                                                🚫 Cerrado
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                
                                                return (
                                                    <div key={idx} className="p-1 border-r min-h-[80px]">
                                                        {reservasEnCelda.map(booking => (
                                                            <div 
                                                                key={booking.id} 
                                                                className={`${getEstadoColor(booking.estado)} rounded-lg p-2 mb-1 text-xs cursor-pointer hover:opacity-80 transition-all shadow-sm`}
                                                                onClick={() => {
                                                                    if (booking.estado === 'Pendiente') {
                                                                        confirmarPago(booking.id, booking);
                                                                    } else if (booking.estado === 'Reservado') {
                                                                        handleCancel(booking.id, booking);
                                                                    } else {
                                                                        alert(`Cliente: ${booking.cliente_nombre}\nServicio: ${booking.servicio}\nWhatsApp: ${booking.cliente_whatsapp}\nEstado: ${booking.estado}`);
                                                                    }
                                                                }}
                                                                title={booking.estado === 'Pendiente' ? 'Click para confirmar pago' : booking.estado === 'Reservado' ? 'Click para cancelar' : 'Click para ver detalles'}
                                                            >
                                                                <div className="font-bold truncate">{booking.cliente_nombre}</div>
                                                                <div className="truncate text-xs opacity-90">{booking.servicio}</div>
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <span>{getEstadoIcon(booking.estado)}</span>
                                                                    <span className="text-xs">
                                                                        {booking.estado === 'Pendiente' ? 'Pagar' : 
                                                                         booking.estado === 'Reservado' ? 'Cancelar' : 
                                                                         booking.estado === 'Completado' ? 'Completado' : ''}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {reservasEnCelda.length === 0 && (
                                                            <div className="text-xs text-gray-300 text-center py-2">
                                                                ─
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Leyenda de colores */}
                        <div className="bg-white p-3 rounded-xl shadow-sm flex flex-wrap gap-4 text-xs">
                            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded"></div><span>Reservado (click para cancelar)</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-500 rounded"></div><span>Pendiente (click para confirmar pago)</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-400 rounded"></div><span>Completado</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-400 rounded"></div><span>Cancelado</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div><span>Día cerrado (sin reservas)</span></div>
                        </div>
                    </>
                )}

                {/* OTROS PANELES */}
                {tabActivo === 'diasCerrados' && (userRole === 'admin' || userNivel >= 3) && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <p className="text-center text-gray-500">Componente DiasCerradosPanel - Pendiente de implementación</p>
                    </div>
                )}

                {tabActivo === 'configuracion' && (
                    <ConfigPanel 
                        profesionalId={userRole === 'profesional' ? profesional?.id : null}
                        modoRestringido={userRole === 'profesional' && userNivel === 2}
                    />
                )}

                {tabActivo === 'servicios' && (userRole === 'admin' || userNivel >= 3) && (
                    <ServiciosPanel />
                )}

                {tabActivo === 'profesionales' && (userRole === 'admin' || userNivel >= 3) && (
                    <ProfesionalesPanel />
                )}

                {tabActivo === 'clientes' && (userRole === 'admin' || userNivel >= 2) && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span>👥</span>
                                Clientes Registrados
                                <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">{clientesRegistrados.length}</span>
                            </h2>
                            <button 
                                onClick={() => { 
                                    setShowClientesRegistrados(!showClientesRegistrados); 
                                    if (!showClientesRegistrados) loadClientesRegistrados(); 
                                }}
                                className="text-pink-600 text-sm hover:underline"
                            >
                                {showClientesRegistrados ? '▲ Ocultar' : '▼ Mostrar'}
                            </button>
                        </div>
                        
                        {cargandoClientes && (
                            <div className="text-center py-8">
                                <div className="animate-spin h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
                                <p className="text-gray-500 mt-2">Cargando...</p>
                            </div>
                        )}
                        
                        {showClientesRegistrados && !cargandoClientes && (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {clientesRegistrados.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No hay clientes registrados</p>
                                    </div>
                                ) : (
                                    clientesRegistrados.map((cliente, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                                            <div>
                                                <p className="font-medium text-gray-800">{cliente.nombre}</p>
                                                <p className="text-sm text-gray-500">📱 +{cliente.whatsapp}</p>
                                                {cliente.fecha_registro && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        📅 {new Date(cliente.fecha_registro).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                            {(userRole === 'admin' || userNivel >= 3) && (
                                                <button 
                                                    onClick={() => handleEliminarCliente(cliente.whatsapp)}
                                                    className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
                                                >
                                                    Quitar
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminApp />);