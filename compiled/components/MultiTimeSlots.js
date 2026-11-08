function MultiTimeSlots({ service, date, profesional, cliente, onTimeSelect, selectedTime, onNoAvailability }) {
  window.useIdioma();
  const t = window.t;
  const [slots, setSlots] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [minAntelacionHoras, setMinAntelacionHoras] = React.useState(2);
  const [recortadas, setRecortadas] = React.useState(false);
  const [hayHorasPosibles, setHayHorasPosibles] = React.useState(false);
  const asignaciones = profesional?.asignaciones || [];
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = String(timeStr || "00:00").split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };
  const minutesToTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  React.useEffect(() => {
    const cargar = async () => {
      if (!service?.esMultiple || !date || !profesional?.esMultiple) return;
      setLoading(true);
      setError(null);
      try {
        const config = window.salonConfig ? await window.salonConfig.get() : {};
        const minHoras = config?.min_antelacion_horas ?? 2;
        setMinAntelacionHoras(minHoras);
        const [year, month, day] = date.split("-").map(Number);
        const fechaLocal = new Date(year, month - 1, day);
        const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
        const diaSemana = diasSemana[fechaLocal.getDay()];
        const datos = await Promise.all(asignaciones.map(async (item) => {
          const horarios = await window.salonConfig.getHorariosPorDia(item.profesional.id);
          const descansos = window.salonConfig.getDescansosPorDia ? await window.salonConfig.getDescansosPorDia(item.profesional.id) : {};
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
          baseSlots = baseSlots.filter((slot) => servicioPermiteHorario(primerServicio, slot, diaSemana));
        }
        const totalBase = baseSlots.length;
        baseSlots = baseSlots.filter((slot) => horaCumpleAntelacion(date, slot, minHoras));
        setRecortadas(baseSlots.length < totalBase);
        setHayHorasPosibles(baseSlots.length > 0);
        const disponibles = baseSlots.filter((slot) => {
          let cursor = timeToMinutes(slot);
          if (primerServicioSinHorario(datos.map((item) => item.servicio), cursor, diaSemana)) return false;
          for (let index = 0; index < datos.length; index++) {
            const item = datos[index];
            const duracion = parseInt(item.servicio.duracion, 10) || 60;
            const inicio = cursor;
            const fin = inicio + duracion;
            const indicesDelDia = item.horarios[diaSemana] || [];
            if (indicesDelDia.length === 0) return false;
            if (slotTieneDescanso(inicio, fin, item.descansos[diaSemana] || [])) return false;
            const conflicto = item.bookings.some((booking) => {
              const bStart = timeToMinutes(booking.hora_inicio);
              const bEnd = timeToMinutes(booking.hora_fin);
              return inicio < bEnd && fin > bStart;
            });
            if (conflicto) return false;
            cursor = fin;
          }
          return true;
        });
        const slotsDisponibles = disponibles.sort();
        setSlots(slotsDisponibles);
      } catch (err) {
        console.error("Error calculando horarios multiservicio:", err);
        setError(t("Error al cargar horarios"));
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [service, date, profesional, onNoAvailability]);
  if (!service?.esMultiple || !date || !profesional?.esMultiple) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-pink-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "⏰"), t("4. Elige horario de inicio"), selectedTime && /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2" }, t("Seleccionado"))), /* @__PURE__ */ React.createElement("p", { className: "flex items-center gap-2 text-sm text-gray-700 bg-white/90 px-4 py-3 rounded-2xl border border-pink-100 shadow-sm" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex w-7 h-7 shrink-0 rounded-full bg-pink-50 items-center justify-center", "aria-hidden": "true" }, "🔗"), t("Los servicios se reservarán en secuencia desde la hora seleccionada.")), loading ? /* @__PURE__ */ React.createElement("div", { className: "flex justify-center py-8" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" })) : error ? /* @__PURE__ */ React.createElement(AvisoSinHoras, { icono: "⏳", titulo: error }) : slots.length === 0 && hayHorasPosibles ? (
    // Sin hueco seguido para todo el combo: la lista de espera es lo unico que hay, abierta.
    /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      AvisoSinHoras,
      {
        icono: "💗",
        titulo: t("Este día está lleno"),
        texto: t("Pero las citas a veces se cancelan.")
      }
    ), /* @__PURE__ */ React.createElement(
      AvisameListaEspera,
      {
        service,
        date,
        profesional,
        cliente,
        asignaciones,
        abiertoAlInicio: true,
        fechaTexto: window.formatFechaCompleta ? window.formatFechaCompleta(date) : date
      }
    ))
  ) : slots.length === 0 ? recortadas ? /* @__PURE__ */ React.createElement(
    AvisoSinHoras,
    {
      icono: "🕒",
      titulo: t("Ya no quedan horas para este día"),
      texto: t("Se reserva con al menos {n} h de anticipación. Prueba con otro día.", { n: minAntelacionHoras })
    }
  ) : /* @__PURE__ */ React.createElement(
    AvisoSinHoras,
    {
      icono: "🗓️",
      titulo: t("No hay horarios seguidos para estos servicios ese día."),
      texto: t("Prueba con otra fecha en el calendario de arriba.")
    }
  ) : /* @__PURE__ */ React.createElement(React.Fragment, null, recortadas && /* @__PURE__ */ React.createElement(NotaAntelacion, { horas: minAntelacionHoras }), /* @__PURE__ */ React.createElement(GruposDeHoras, { slots, selectedTime, onTimeSelect }), /* @__PURE__ */ React.createElement(
    AvisameListaEspera,
    {
      service,
      date,
      profesional,
      cliente,
      asignaciones,
      fechaTexto: window.formatFechaCompleta ? window.formatFechaCompleta(date) : date
    }
  )));
}
