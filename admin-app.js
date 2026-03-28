// admin-app.js - Panel de administración (VERSIÓN GENÉRICA)
// SIN NINGÚN NOMBRE DE CLIENTE HARCODEADO

console.log('🚀 ADMIN-APP.JS - Panel de administración');

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
// COMPONENTE PRINCIPAL
// ============================================
function AdminApp() {
    const [bookings, setBookings] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filterDate, setFilterDate] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('activas');
    
    const [userRole, setUserRole] = React.useState('admin');
    const [userNivel, setUserNivel] = React.useState(3);
    const [profesional, setProfesional] = React.useState(null);
    const [nombreNegocio, setNombreNegocio] = React.useState('Mi Negocio');
    
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
        hora_inicio: ''
    });

    const [serviciosList, setServiciosList] = React.useState([]);
    const [profesionalesList, setProfesionalesList] = React.useState([]);
    const [horariosDisponibles, setHorariosDisponibles] = React.useState([]);
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [diasLaborales, setDiasLaborales] = React.useState([]);
    const [fechasConHorarios, setFechasConHorarios] = React.useState({});

    // ============================================
    // CARGAR NOMBRE DEL NEGOCIO Y CONFIGURACIÓN
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
            console.log('✅ Configuración recargada:', configData);
        } catch (error) {
            console.error('Error cargando config:', error);
        }
    };

    // ============================================
    // DETECTAR ROL Y NIVEL DEL USUARIO AL INICIAR
    // ============================================
    React.useEffect(() => {
        const profesionalAuth = window.getProfesionalAutenticado?.();
        if (profesionalAuth) {
            console.log('👤 Usuario detectado como profesional:', profesionalAuth);
            setUserRole('profesional');
            setProfesional(profesionalAuth);
            setUserNivel(profesionalAuth.nivel || 1);
            
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
                estado: "Reservado"
            };

            console.log('📤 Creando reserva manual:', bookingData);
            
            const result = await createBooking(bookingData);
            
            if (result.success) {
                alert('✅ Reserva creada exitosamente');
                
                setShowNuevaReservaModal(false);
                setNuevaReservaData({
                    cliente_nombre: '',
                    cliente_whatsapp: '',
                    servicio: '',
                    profesional_id: userRole === 'profesional' ? profesional?.id : '',
                    fecha: '',
                    hora_inicio: ''
                });
                
                fetchBookings();
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
            fetchBookings(); // Recargar la lista
            
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
            window.location.href = 'index.html'; // Cambiado de admin-login.html a index.html
        }
    };

    // ============================================
    // FILTROS
    // ============================================
    const getFilteredBookings = () => {
        console.log('🔄 Aplicando filtros a', bookings.length, 'reservas');
        
        let filtradas = filterDate
            ? bookings.filter(b => b.fecha === filterDate)
            : [...bookings];
        
        console.log('📊 Después filtro fecha:', filtradas.length);
        
        let resultado;
        if (statusFilter === 'activas') {
            resultado = filtradas.filter(b => b.estado === 'Reservado');
        } else if (statusFilter === 'pendientes') {
            resultado = filtradas.filter(b => b.estado === 'Pendiente');
        } else if (statusFilter === 'completadas') {
            resultado = filtradas.filter(b => b.estado === 'Completado');
        } else if (statusFilter === 'canceladas') {
            resultado = filtradas.filter(b => b.estado === 'Cancelado');
        } else {
            resultado = filtradas;
        }
        
        console.log('📊 Resultado final:', resultado.length);
        
        return resultado;
    };

    const activasCount = bookings.filter(b => b.estado === 'Reservado').length;
    const pendientesCount = bookings.filter(b => b.estado === 'Pendiente').length;
    const completadasCount = bookings.filter(b => b.estado === 'Completado').length;
    const canceladasCount = bookings.filter(b => b.estado === 'Cancelado').length;
    const filteredBookings = getFilteredBookings();

    const getTabsDisponibles = () => {
        const tabs = [];
        tabs.push({ id: 'reservas', icono: '📅', label: userRole === 'profesional' ? 'Mis Reservas' : 'Reservas' });
        
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
            hora_inicio: ''
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
            <div className="max-w-6xl mx-auto space-y-4">
                
                {/* HEADER */}
                <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-pink-500">
                    {/* Título y logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform">
                            <span className="text-2xl text-white">
                                {config?.especialidad?.toLowerCase().includes('uñas') ? '💅' : 
                                 config?.especialidad?.toLowerCase().includes('pelo') ? '💇‍♀️' : '💖'}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-pink-800">{nombreNegocio}</h1>
                            <p className="text-xs text-pink-500">Panel de Administración</p>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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

                {/* MODAL NUEVA RESERVA */}
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
                                                        
                                                        let className = "h-10 w-full flex items-center justify-center rounded-lg text-sm font-medium transition-all relative";
                                                        
                                                        if (selected) {
                                                            className += " bg-pink-500 text-white shadow-md ring-2 ring-pink-300";
                                                        } else if (!available) {
                                                            className += " text-gray-300 cursor-not-allowed bg-gray-50";
                                                        } else {
                                                            className += " text-gray-700 hover:bg-pink-50 hover:text-pink-600 hover:scale-105 cursor-pointer";
                                                        }
                                                        
                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => handleDateSelect(date)}
                                                                disabled={!available}
                                                                className={className}
                                                            >
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

                {/* CONTENIDO */}
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
                    <div className="space-y-4">
                        {cargandoClientes && (
                            <div className="bg-pink-50 p-3 rounded-lg flex items-center gap-2">
                                <div className="animate-spin h-4 w-4 border-2 border-pink-600 border-t-transparent rounded-full"></div>
                                <span className="text-pink-600">Cargando datos...</span>
                            </div>
                        )}

                        {/* CLIENTES REGISTRADOS */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
                            <button
                                onClick={() => {
                                    setShowClientesRegistrados(!showClientesRegistrados);
                                    if (!showClientesRegistrados) loadClientesRegistrados();
                                }}
                                className="flex items-center justify-between w-full"
                            >
                                <div className="flex items-center gap-2">
                                    <span>✅</span>
                                    <span className="font-medium">Clientes Registrados</span>
                                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">{clientesRegistrados.length}</span>
                                </div>
                                <span>{showClientesRegistrados ? '▲' : '▼'}</span>
                            </button>
                            
                            {showClientesRegistrados && (
                                <div className="mt-4">
                                    <div className="space-y-3 max-h-80 overflow-y-auto">
                                        {clientesRegistrados.length === 0 ? (
                                            <div className="text-center py-6 text-gray-500">
                                                <p>No hay clientes registrados</p>
                                            </div>
                                        ) : (
                                            clientesRegistrados.map((cliente, index) => (
                                                <div key={index} className="bg-green-50 p-4 rounded-lg border border-green-200">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold text-gray-800">{cliente.nombre}</p>
                                                            <p className="text-sm text-gray-600">📱 +{cliente.whatsapp}</p>
                                                            {cliente.fecha_registro && (
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    📅 Registrado: {new Date(cliente.fecha_registro).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {(userRole === 'admin' || userNivel >= 3) && (
                                                            <button 
                                                                onClick={() => handleEliminarCliente(cliente.whatsapp)}
                                                                className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                                                            >
                                                                Quitar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* RESERVAS */}
                {tabActivo === 'reservas' && (
                    <>
                        {userRole === 'profesional' && profesional && (
                            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                                <p className="text-pink-800 font-medium">
                                    Hola {profesional.nombre} 👋 - Mostrando tus reservas ({filteredBookings.length})
                                </p>
                            </div>
                        )}

                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                            <div className="flex flex-wrap gap-3 items-center">
                                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                                {filterDate && <button onClick={() => setFilterDate('')} className="text-pink-500 text-sm">Limpiar filtro</button>}
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                                <button onClick={() => setStatusFilter('activas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'activas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Activas ({activasCount})</button>
                                <button onClick={() => setStatusFilter('pendientes')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'pendientes' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Pendientes ({pendientesCount})</button>
                                <button onClick={() => setStatusFilter('completadas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'completadas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Completadas ({completadasCount})</button>
                                <button onClick={() => setStatusFilter('canceladas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'canceladas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Canceladas ({canceladasCount})</button>
                                <button onClick={() => setStatusFilter('todas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'todas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Todas ({bookings.length})</button>
                                
                                {/* 🔥 BOTÓN PARA BORRAR CANCELADAS - SOLO EN PESTAÑA CANCELADAS */}
                                {statusFilter === 'canceladas' && (
                                    <button
                                        onClick={borrarCanceladas}
                                        className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 transition flex items-center gap-2"
                                        title="Borrar todas las reservas canceladas"
                                    >
                                        <span>🗑️</span>
                                        Borrar todas
                                    </button>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                                <p className="text-pink-500 mt-4">Cargando reservas...</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredBookings.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl">
                                        <p className="text-gray-500">No hay reservas para mostrar</p>
                                    </div>
                                ) : (
                                    filteredBookings.map(b => (
                                        <div key={b.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${
                                            b.estado === 'Reservado' ? 'border-l-pink-500' :
                                            b.estado === 'Pendiente' ? 'border-l-yellow-500' :
                                            b.estado === 'Completado' ? 'border-l-green-500' :
                                            'border-l-red-500'
                                        }`}>
                                            <div className="flex justify-between mb-2">
                                                <span className="font-semibold">{window.formatFechaCompleta ? window.formatFechaCompleta(b.fecha) : b.fecha}</span>
                                                <span className="text-sm bg-pink-100 text-pink-700 px-2 py-1 rounded-full">{formatTo12Hour(b.hora_inicio)}</span>
                                            </div>
                                            <div className="text-sm space-y-1">
                                                <p><span className="font-medium">👤 Cliente:</span> {b.cliente_nombre}</p>
                                                <p><span className="font-medium">📱 WhatsApp:</span> {b.cliente_whatsapp}</p>
                                                <p><span className="font-medium">💈 Servicio:</span> {b.servicio}</p>
                                                <p><span className="font-medium">👩‍🎨 Profesional:</span> {b.profesional_nombre || b.trabajador_nombre}</p>
                                            </div>
                                            <div className="flex justify-between items-center mt-3 pt-2 border-t">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                                    ${b.estado === 'Reservado' ? 'bg-pink-100 text-pink-700' : 
                                                      b.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' :
                                                      b.estado === 'Completado' ? 'bg-green-100 text-green-700' : 
                                                      'bg-red-100 text-red-700'}`}>
                                                    {b.estado}
                                                </span>
                                                <div className="flex gap-2">
                                                    {b.estado === 'Pendiente' && (
                                                        <button 
                                                            onClick={() => confirmarPago(b.id, b)} 
                                                            className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 flex items-center gap-1"
                                                        >
                                                            <span>✅</span> Confirmar pago
                                                        </button>
                                                    )}
                                                    {b.estado === 'Reservado' && (
                                                        <button onClick={() => handleCancel(b.id, b)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 flex items-center gap-1">
                                                            <span>❌</span> Cancelar
                                                        </button>
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

// Renderizar la aplicación
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminApp />);