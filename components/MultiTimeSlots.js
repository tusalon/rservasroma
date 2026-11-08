// components/MultiTimeSlots.js - horarios secuenciales para varios servicios/profesionales

function MultiTimeSlots({ service, date, profesional, cliente, onTimeSelect, selectedTime, onNoAvailability }) {
    window.useIdioma();
    const t = window.t;
    const [slots, setSlots] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [minAntelacionHoras, setMinAntelacionHoras] = React.useState(2);
    const [recortadas, setRecortadas] = React.useState(false);
    // ¿Quedan horas de inicio que aun se pueden reservar (aunque no haya hueco seguido para todo el combo)?
    const [hayHorasPosibles, setHayHorasPosibles] = React.useState(false);

    const asignaciones = profesional?.asignaciones || [];

    // indiceToHoraLegible, variantesHorarioPermitido y servicioPermiteHorario viven en
    // utils/timeLogic.js (cargado antes que este componente). timeToMinutes se mantiene
    // local: esta versión tolera timeStr undefined/NaN, a diferencia de la global.
    const timeToMinutes = (timeStr) => {
        const [hours, minutes] = String(timeStr || '00:00').split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    };

    const minutesToTime = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // slotTieneDescanso (utils/timeLogic.js) ya valida descanso.inicio/fin antes de llamar
    // timeToMinutes, así que usar la versión global ahí no reintroduce el problema de
    // undefined que motivó mantener el timeToMinutes local de este archivo.
    // estaDentroBloqueTrabajo se eliminó: no tenía ningún sitio de llamada (código muerto).

    React.useEffect(() => {
        const cargar = async () => {
            if (!service?.esMultiple || !date || !profesional?.esMultiple) return;
            setLoading(true);
            setError(null);
            try {
                const config = window.salonConfig ? await window.salonConfig.get() : {};
                const minHoras = config?.min_antelacion_horas ?? 2;
                setMinAntelacionHoras(minHoras);

                const [year, month, day] = date.split('-').map(Number);
                const fechaLocal = new Date(year, month - 1, day);
                const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                const diaSemana = diasSemana[fechaLocal.getDay()];

                const datos = await Promise.all(asignaciones.map(async item => {
                    const horarios = await window.salonConfig.getHorariosPorDia(item.profesional.id);
                    const descansos = window.salonConfig.getDescansosPorDia
                        ? await window.salonConfig.getDescansosPorDia(item.profesional.id)
                        : {};
                    const bookings = await getBookingsByDateAndProfesional(date, item.profesional.id, item.servicio);
                    return { ...item, horarios, descansos, bookings };
                }));

                if (datos.length !== asignaciones.length) {
                    setSlots([]);
                    return;
                }

                let baseSlots = (datos[0].horarios[diaSemana] || []).map(indiceToHoraLegible);
                const primerServicio = datos[0].servicio;
                if (servicioRestringeHorarios(primerServicio, diaSemana)) {
                    baseSlots = baseSlots.filter(slot => servicioPermiteHorario(primerServicio, slot, diaSemana));
                }

                // Fuera las horas que ya pasaron o no llegan a la antelación mínima,
                // sea el día que sea (utils/timeLogic.js).
                const totalBase = baseSlots.length;
                baseSlots = baseSlots.filter(slot => horaCumpleAntelacion(date, slot, minHoras));
                setRecortadas(baseSlots.length < totalBase);
                setHayHorasPosibles(baseSlots.length > 0);

                const disponibles = baseSlots.filter(slot => {
                    let cursor = timeToMinutes(slot);
                    // Cada servicio del combo debe aceptar la hora en que le toca empezar, no solo el primero.
                    if (primerServicioSinHorario(datos.map(item => item.servicio), cursor, diaSemana)) return false;

                    for (let index = 0; index < datos.length; index++) {
                        const item = datos[index];
                        const duracion = parseInt(item.servicio.duracion, 10) || 60;
                        const inicio = cursor;
                        const fin = inicio + duracion;
                        const indicesDelDia = item.horarios[diaSemana] || [];
                        if (indicesDelDia.length === 0) return false;
                        if (slotTieneDescanso(inicio, fin, item.descansos[diaSemana] || [])) return false;

                        const conflicto = item.bookings.some(booking => {
                            const bStart = timeToMinutes(booking.hora_inicio);
                            const bEnd = timeToMinutes(booking.hora_fin);
                            return (inicio < bEnd) && (fin > bStart);
                        });
                        if (conflicto) return false;

                        cursor = fin;
                    }

                    return true;
                });

                const slotsDisponibles = disponibles.sort();
                setSlots(slotsDisponibles);
                // Antes: con 0 horarios se llamaba onNoAvailability(), que borraba
                // la fecha en el padre y desmontaba esta sección — la clienta veía
                // desaparecer todo sin explicación. Ahora se muestra el mensaje.
            } catch (err) {
                console.error('Error calculando horarios multiservicio:', err);
                setError(t('Error al cargar horarios'));
                setSlots([]);
            } finally {
                setLoading(false);
            }
        };

        cargar();
    }, [service, date, profesional, onNoAvailability]);

    if (!service?.esMultiple || !date || !profesional?.esMultiple) return null;

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                <span className="text-2xl">⏰</span>
                {t('4. Elige horario de inicio')}
                {selectedTime && <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2">{t('Seleccionado')}</span>}
            </h2>

            <p className="flex items-center gap-2 text-sm text-gray-700 bg-white/90 px-4 py-3 rounded-2xl border border-pink-100 shadow-sm">
                <span className="inline-flex w-7 h-7 shrink-0 rounded-full bg-pink-50 items-center justify-center" aria-hidden="true">🔗</span>
                {t('Los servicios se reservarán en secuencia desde la hora seleccionada.')}
            </p>

            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                </div>
            ) : error ? (
                <AvisoSinHoras icono="⏳" titulo={error} />
            ) : slots.length === 0 && hayHorasPosibles ? (
                // Sin hueco seguido para todo el combo: la lista de espera es lo unico que hay, abierta.
                <>
                    <AvisoSinHoras
                        icono="💗"
                        titulo={t('Este día está lleno')}
                        texto={t('Pero las citas a veces se cancelan.')}
                    />
                    <AvisameListaEspera service={service} date={date} profesional={profesional} cliente={cliente}
                        asignaciones={asignaciones} abiertoAlInicio
                        fechaTexto={window.formatFechaCompleta ? window.formatFechaCompleta(date) : date} />
                </>
            ) : slots.length === 0 ? (
                recortadas ? (
                    <AvisoSinHoras
                        icono="🕒"
                        titulo={t('Ya no quedan horas para este día')}
                        texto={t('Se reserva con al menos {n} h de anticipación. Prueba con otro día.', { n: minAntelacionHoras })}
                    />
                ) : (
                    <AvisoSinHoras
                        icono="🗓️"
                        titulo={t('No hay horarios seguidos para estos servicios ese día.')}
                        texto={t('Prueba con otra fecha en el calendario de arriba.')}
                    />
                )
            ) : (
                <>
                    {recortadas && <NotaAntelacion horas={minAntelacionHoras} />}
                    <GruposDeHoras slots={slots} selectedTime={selectedTime} onTimeSelect={onTimeSelect} />
                    <AvisameListaEspera service={service} date={date} profesional={profesional} cliente={cliente}
                        asignaciones={asignaciones}
                        fechaTexto={window.formatFechaCompleta ? window.formatFechaCompleta(date) : date} />
                </>
            )}
        </div>
    );
}
