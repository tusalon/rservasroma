// components/TimeSlots.js - Versión femenina con filtro de horarios permitidos por servicio

function TimeSlots({ service, date, profesional, cliente, onTimeSelect, selectedTime }) {
    const idioma = window.useIdioma();
    const t = window.t;
    const [slots, setSlots] = React.useState([]);
    const [occupiedSlots, setOccupiedSlots] = React.useState([]);
    const [waitlistSlots, setWaitlistSlots] = React.useState({});
    const [joiningWaitlist, setJoiningWaitlist] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [horariosPorDia, setHorariosPorDia] = React.useState({});
    const [descansosPorDia, setDescansosPorDia] = React.useState({});
    const [diaTrabaja, setDiaTrabaja] = React.useState(true);
    const [verificacionCompleta, setVerificacionCompleta] = React.useState(false);
    const [maxAntelacionDias, setMaxAntelacionDias] = React.useState(30);
    const [minAntelacionHoras, setMinAntelacionHoras] = React.useState(2);

    // indiceToHoraLegible, timeToMinutes, variantesHorarioPermitido, servicioPermiteHorario
    // y slotTieneDescanso viven en utils/timeLogic.js (cargado antes que este componente).

    React.useEffect(() => {
        const cargarConfiguracion = async () => {
            try {
                if (window.salonConfig) {
                    const config = await window.salonConfig.get();
                    console.log('⚙️ Configuración cargada en TimeSlots:', config);
                    if (config && config.max_antelacion_dias !== undefined) {
                        setMaxAntelacionDias(config.max_antelacion_dias);
                    }
                    if (config && config.min_antelacion_horas !== undefined) {
                        setMinAntelacionHoras(config.min_antelacion_horas);
                    }
                }
            } catch (error) {
                console.error('Error cargando configuración:', error);
            }
        };
        
        cargarConfiguracion();
    }, []);

    const formatDateLocal = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString();
    };

    const getCurrentLocalDate = () => {
        const hoy = new Date();
        const year = hoy.getFullYear();
        const month = (hoy.getMonth() + 1).toString().padStart(2, '0');
        const day = hoy.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const normalizeTimeKey = (value) => String(value || '').slice(0, 5);

    // crearBloquesTrabajo se eliminó: no tenía ningún sitio de llamada en el archivo (código muerto).

    React.useEffect(() => {
        if (!profesional) return;
        
        const cargarHorarios = async () => {
            setVerificacionCompleta(false);
            try {
                console.log(`📅 Cargando horarios por día de ${profesional.nombre}...`);
                const horarios = await window.salonConfig.getHorariosPorDia(profesional.id);
                const descansos = window.salonConfig.getDescansosPorDia ?
                    await window.salonConfig.getDescansosPorDia(profesional.id) :
                    {};
                console.log(`✅ Horarios por día de ${profesional.nombre}:`, horarios);
                setHorariosPorDia(horarios);
                setDescansosPorDia(descansos);
                
                const tieneHorarios = Object.keys(horarios).length > 0;
                if (!tieneHorarios) {
                    console.log('⚠️ No hay horarios configurados para este profesional');
                }
            } catch (error) {
                console.error('Error cargando horarios:', error);
                setHorariosPorDia({});
            }
        };
        
        cargarHorarios();
    }, [profesional]);

    React.useEffect(() => {
        if (!profesional || !date) {
            setVerificacionCompleta(false);
            return;
        }

        console.log('🔍 Verificando disponibilidad para:', {
            profesional: profesional.nombre,
            fecha: date,
            horariosPorDia
        });

        const [año, mes, día] = date.split('-').map(Number);
        const fechaLocal = new Date(año, mes - 1, día);
        
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaSemana = diasSemana[fechaLocal.getDay()];
        
        const horariosDelDia = horariosPorDia[diaSemana] || [];
        const trabaja = horariosDelDia.length > 0;
        
        console.log(`🎯 ¿${profesional.nombre} trabaja el ${diaSemana}?`, trabaja);
        if (!trabaja && horariosDelDia.length === 0) {
            console.log(`⚠️ No hay horarios configurados para ${diaSemana}`);
        }
        
        setDiaTrabaja(trabaja);
        setVerificacionCompleta(true);
        
    }, [profesional, horariosPorDia, date]);

    React.useEffect(() => {
        if (!service || !date || !profesional || !verificacionCompleta) return;

        const loadSlots = async () => {
            setLoading(true);
            setError(null);
            try {
                // Validar antelación máxima
                const hoy = new Date();
                const fechaSeleccionada = new Date(date + 'T00:00:00');
                const diffTime = fechaSeleccionada - hoy;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (Number(maxAntelacionDias) > 0 && diffDays > Number(maxAntelacionDias)) {
                    console.log(`🚫 Fecha ${date} supera antelación máxima de ${maxAntelacionDias} días`);
                    setError(t('Solo se puede reservar con hasta {dias} días de antelación', { dias: maxAntelacionDias }));
                    setSlots([]);
                    setOccupiedSlots([]);
                    setLoading(false);
                    return;
                }
                
                const [year, month, day] = date.split('-').map(Number);
                const fechaLocal = new Date(year, month - 1, day);
                const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                const diaSemana = diasSemana[fechaLocal.getDay()];
                
                const indicesDelDia = horariosPorDia[diaSemana] || [];
                const descansosDelDia = descansosPorDia[diaSemana] || [];
                
                if (indicesDelDia.length === 0) {
                    console.log(`No hay horas base configuradas para ${diaSemana}; se revisan turnos ocupados para lista de espera.`);
                }
                
                // Slots base (todos los horarios del profesional para ese día)
                let baseSlots = indicesDelDia.map(indice => indiceToHoraLegible(indice));
                
                // 🔥 FILTRO POR HORARIOS PERMITIDOS DEL SERVICIO (si existen)
                if (service.horarios_permitidos && service.horarios_permitidos.length > 0) {
                    baseSlots = baseSlots.filter(slot => servicioPermiteHorario(service, slot));
                    console.log(`📋 Slots filtrados por horarios permitidos del servicio:`, baseSlots);
                }
                
                console.log(`📋 Slots base para ${diaSemana} (después de filtro de servicio):`, baseSlots);
                
                const todayStr = getCurrentLocalDate();
                const esHoy = date === todayStr;
                
                const ahora = new Date();
                const horaActual = ahora.getHours();
                const minutosActuales = ahora.getMinutes();
                const totalMinutosActual = horaActual * 60 + minutosActuales;
                const minAllowedMinutes = totalMinutosActual + (minAntelacionHoras * 60);
                
                console.log('🕐 Hora actual:', `${horaActual}:${minutosActuales}`);
                console.log('⏱️ Hora mínima permitida (actual + 2h):', 
                    `${Math.floor(minAllowedMinutes / 60)}:${minAllowedMinutes % 60}`);
                console.log('📅 Fecha seleccionada:', date, 'es hoy?', esHoy);
                
                let bookings = await getBookingsByDateAndProfesional(date, profesional.id);
                if (bookings.length === 0 && window.getBookingsByDate) {
                    const reservasDia = await window.getBookingsByDate(date);
                    const nombreProfesional = String(profesional.nombre || '').trim().toLowerCase();
                    bookings = (reservasDia || []).filter(booking => {
                        const mismoId = String(booking.profesional_id || '') === String(profesional.id || '');
                        const mismoNombre = String(booking.profesional_nombre || booking.trabajador_nombre || '').trim().toLowerCase() === nombreProfesional;
                        return mismoId || mismoNombre;
                    });
                }
                const waitlist = window.getListaEsperaPorFechaProfesional
                    ? await window.getListaEsperaPorFechaProfesional(date, profesional.id)
                    : [];
                const waitlistMap = {};
                (waitlist || []).forEach(item => {
                    waitlistMap[normalizeTimeKey(item.hora_inicio)] = item;
                });
                setWaitlistSlots(waitlistMap);
                
                const occupiedMap = {};
                const esReservaOcupada = (booking) => {
                    const estado = String(booking.estado || '').toLowerCase();
                    return estado !== 'cancelado' && estado !== 'cancelada' && estado !== 'completado' && estado !== 'completada' && estado !== 'ausente';
                };
                const agregarTurnoOcupado = (booking) => {
                    if (!booking?.hora_inicio || !esReservaOcupada(booking)) return;
                    const hora = normalizeTimeKey(booking.hora_inicio);
                    const inicioOcupado = timeToMinutes(hora);
                    if (esHoy && inicioOcupado < minAllowedMinutes) return;
                    if (!occupiedMap[hora]) {
                        occupiedMap[hora] = {
                            hora,
                            hora_fin: booking.hora_fin,
                            booking
                        };
                    }
                };
                bookings.forEach(agregarTurnoOcupado);
                let availableSlots = baseSlots.filter(slotStartStr => {
                    const slotStart = timeToMinutes(slotStartStr);
                    const slotEnd = slotStart + service.duracion;

                    if (esHoy && slotStart < minAllowedMinutes) {
                        console.log(`⏰ Slot ${slotStartStr} es menor a hora mínima - EXCLUIDO`);
                        return false;
                    }

                    if (slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) {
                        return false;
                    }

                    const bookingConflict = bookings.find(booking => {
                        const bookingStart = timeToMinutes(booking.hora_inicio);
                        const bookingEnd = timeToMinutes(booking.hora_fin);
                        return (slotStart < bookingEnd) && (slotEnd > bookingStart);
                    });

                    if (!bookingConflict) {
                        console.log(`✅ Slot ${slotStartStr} disponible`);
                        return true;
                    } else {
                        console.log(`❌ Slot ${slotStartStr} tiene conflicto - EXCLUIDO`);
                        return false;
                    }
                });
                
                availableSlots.sort();
                const occupied = Object.values(occupiedMap);
                occupied.sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));
                console.log(`✅ Slots disponibles para ${profesional.nombre} el ${date}:`, availableSlots);
                console.log(`Lista de espera - turnos ocupados para ${profesional.nombre} el ${date}:`, occupied);
                setSlots(availableSlots);
                setOccupiedSlots(occupied);
            } catch (err) {
                console.error(err);
                setError(t('Error al cargar horarios'));
            } finally {
                setLoading(false);
            }
        };

        loadSlots();
    }, [service, date, profesional, horariosPorDia, descansosPorDia, diaTrabaja, verificacionCompleta, maxAntelacionDias, minAntelacionHoras]);

    const handleUnirseListaEspera = async (slot) => {
        if (!cliente?.nombre || !cliente?.whatsapp) {
            alert(t('Necesitas ingresar con tu WhatsApp para anotarte en lista de espera.'));
            return;
        }
        if (!window.unirseListaEspera) {
            alert(t('La lista de espera todavia no esta disponible.'));
            return;
        }

        setJoiningWaitlist(slot.hora);
        try {
            const result = await window.unirseListaEspera({
                cliente_nombre: cliente.nombre,
                cliente_whatsapp: cliente.whatsapp,
                servicio: service.nombre,
                duracion: service.duracion,
                profesional_id: profesional.id,
                profesional_nombre: profesional.nombre,
                fecha: date,
                hora_inicio: slot.hora,
                hora_fin: slot.hora_fin || slot.booking?.hora_fin
            });

            if (result.success) {
                setWaitlistSlots(prev => ({ ...prev, [slot.hora]: result.data }));
                alert(t('Listo. Quedaste en lista de espera para ese turno.'));
            } else if (result.reason === 'occupied') {
                alert(t('Ese turno ya tiene una clienta en lista de espera.'));
                setWaitlistSlots(prev => ({ ...prev, [slot.hora]: result.data || true }));
            } else {
                alert(t('No se pudo anotarte en lista de espera. Intenta de nuevo.'));
            }
        } finally {
            setJoiningWaitlist('');
        }
    };

    if (!service || !date || !profesional) return null;

    if (!verificacionCompleta) {
        return (
            <div className="space-y-4 animate-fade-in">
                <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                    <span className="text-2xl">⏰</span>
                    {t('4. Elige un horario con {nombre}', { nombre: profesional.nombre })}
                </h2>
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                </div>
            </div>
        );
    }

    if (!diaTrabaja && occupiedSlots.length === 0) {
        const [year, month, day] = date.split('-').map(Number);
        const fechaLocal = new Date(year, month - 1, day);
        const diasSemanaPlural = idioma === 'en'
            ? ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']
            : ['domingos', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabados'];
        const diaSemana = diasSemanaPlural[fechaLocal.getDay()];
        const diaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

        return (
            <div className="space-y-4 animate-fade-in">
                <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                    <span className="text-2xl">⏰</span>
                    {t('4. Elige un horario con {nombre}', { nombre: profesional.nombre })}
                </h2>
                <div className="text-center p-8 bg-pink-50 rounded-xl border border-pink-200">
                    <div className="text-5xl text-pink-400 mb-3">📅❌</div>
                    <p className="text-pink-700 font-medium">
                        {t('{nombre} no trabaja los {dia}', { nombre: profesional.nombre, dia: diaCapitalizado })}
                    </p>
                    <p className="text-sm text-pink-500 mt-1">{t('Elige otro día de la semana')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                <span className="text-2xl">⏰</span>
                {t('4. Elige un horario con {nombre}', { nombre: profesional.nombre })}
                {selectedTime && (
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2">
                        ✓ {t('Horario seleccionado')}
                    </span>
                )}
            </h2>

            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                </div>
            ) : error ? (
                <div className="p-4 bg-pink-50 text-pink-600 rounded-lg text-sm border border-pink-200">{error}</div>
            ) : slots.length === 0 && occupiedSlots.length === 0 ? (
                <div className="text-center p-8 bg-pink-50 rounded-xl border border-pink-200">
                    <div className="text-5xl text-pink-400 mb-3">⏰❌</div>
                    <p className="text-pink-700 font-medium">
                        {t('No hay horarios disponibles para {nombre} el {fecha}', { nombre: profesional.nombre, fecha: formatDateLocal(date) })}
                    </p>
                    <p className="text-sm text-pink-500 mt-1">{t('Prueba con otra fecha')}</p>
                </div>
            ) : (
                <>
                    <div className="text-sm bg-gradient-to-r from-pink-50 to-pink-100 p-4 rounded-xl border border-pink-200">
                        <div className="flex items-center gap-2 text-pink-700">
                            <span className="text-pink-500">⏰</span>
                            <span className="font-medium">
                                {t('Horarios disponibles de {nombre} para {fecha}:', { nombre: profesional.nombre, fecha: formatDateLocal(date) })}
                            </span>
                        </div>
                    </div>

                    {date === getCurrentLocalDate() && (
                        <div className="text-sm text-pink-600 bg-pink-50 p-3 rounded-lg flex items-center gap-2 border border-pink-200">
                            <span className="text-pink-500">⏰</span>
                            <span>
                                {t('Hoy solo se muestran horarios con al menos {n} hora{s} de anticipación.', {
                                    n: minAntelacionHoras,
                                    s: minAntelacionHoras === 1 ? '' : 's'
                                })}
                            </span>
                        </div>
                    )}
                    
                    {slots.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
                        {slots.map(time24h => {
                            const time12h = formatTo12Hour(time24h);
                            const isSelected = selectedTime === time24h;
                            const esMediaHora = time24h.includes(':30');
                            
                            return (
                                <button
                                    key={time24h}
                                    onClick={() => onTimeSelect(time24h)}
                                    className={`
                                        py-3 px-2 rounded-lg text-base font-semibold transition-all transform flex flex-col items-center
                                        ${isSelected
                                            ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg scale-105 ring-2 ring-pink-300'
                                            : 'bg-white text-pink-700 border-2 border-pink-200 hover:border-pink-400 hover:bg-pink-50 hover:scale-105 hover:shadow-md'}
                                    `}
                                >
                                    <span className="text-sm">{esMediaHora ? '⏱️' : '⌛'}</span>
                                    <span>{time12h}</span>
                                </button>
                            );
                        })}
                    </div>
                    )}

                    {occupiedSlots.length > 0 && (
                        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <div className="mb-3">
                                <p className="font-semibold text-amber-800">{t('Turnos ocupados con lista de espera')}</p>
                                <p className="text-sm text-amber-700">{t('Puedes anotarte en un turno ocupado. Solo se permite una clienta en espera por horario.')}</p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {occupiedSlots.map(slot => {
                                    const yaTieneEspera = Boolean(waitlistSlots[slot.hora]);
                                    const cargando = joiningWaitlist === slot.hora;
                                    return (
                                        <button
                                            key={slot.hora}
                                            type="button"
                                            onClick={() => handleUnirseListaEspera(slot)}
                                            disabled={yaTieneEspera || cargando}
                                            className={`py-3 px-2 rounded-lg text-sm font-semibold transition flex flex-col items-center border
                                                ${yaTieneEspera
                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                    : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'}`}
                                        >
                                            <span>{window.formatTo12Hour ? window.formatTo12Hour(slot.hora) : slot.hora}</span>
                                            <span className="text-xs font-medium mt-1">
                                                {cargando ? t('Guardando...') : yaTieneEspera ? t('Lista ocupada') : t('Lista de espera')}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    <p className="text-xs text-pink-400 mt-3 text-center">
                        ⏰ {t('Toca un horario para continuar')}
                    </p>
                </>
            )}
        </div>
    );
}
