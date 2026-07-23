function MultiTimeSlots({ service, date, profesional, onTimeSelect, selectedTime, onNoAvailability }) {
  window.useIdioma();
  const t = window.t;
  const [slots, setSlots] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [minAntelacionHoras, setMinAntelacionHoras] = React.useState(2);
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
  const getCurrentLocalDate = () => {
    const hoy = /* @__PURE__ */ new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
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
          const bookings = await getBookingsByDateAndProfesional(date, item.profesional.id);
          return { ...item, horarios, descansos, bookings };
        }));
        if (datos.length !== asignaciones.length) {
          setSlots([]);
          return;
        }
        let baseSlots = (datos[0].horarios[diaSemana] || []).map(indiceToHoraLegible);
        const primerServicio = datos[0].servicio;
        if (primerServicio.horarios_permitidos?.length) {
          baseSlots = baseSlots.filter((slot) => servicioPermiteHorario(primerServicio, slot));
        }
        const esHoy = date === getCurrentLocalDate();
        const ahora = /* @__PURE__ */ new Date();
        const minAllowed = ahora.getHours() * 60 + ahora.getMinutes() + minHoras * 60;
        const disponibles = baseSlots.filter((slot) => {
          let cursor = timeToMinutes(slot);
          if (esHoy && cursor < minAllowed) return false;
          for (let index = 0; index < datos.length; index++) {
            const item = datos[index];
            const duracion = parseInt(item.servicio.duracion, 10) || 60;
            const inicio = cursor;
            const fin = inicio + duracion;
            const indicesDelDia = item.horarios[diaSemana] || [];
            if (indicesDelDia.length === 0) return false;
            if (index === 0 && !servicioPermiteHorario(item.servicio, minutesToTime(inicio))) return false;
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
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-pink-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "⏰"), t("4. Elige horario de inicio"), selectedTime && /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2" }, t("Seleccionado"))), /* @__PURE__ */ React.createElement("div", { className: "text-sm bg-pink-50 p-4 rounded-xl border border-pink-200 text-pink-700" }, t("Los servicios se reservarán en secuencia desde la hora seleccionada.")), loading ? /* @__PURE__ */ React.createElement("div", { className: "flex justify-center py-8" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" })) : error ? /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-pink-50 text-pink-600 rounded-lg text-sm border border-pink-200" }, error) : slots.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "p-6 bg-white/90 rounded-xl border-2 border-pink-200 text-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl block mb-2" }, "😔"), /* @__PURE__ */ React.createElement("p", { className: "text-pink-700 font-semibold" }, t("No hay horarios seguidos para estos servicios ese día.")), /* @__PURE__ */ React.createElement("p", { className: "text-pink-500 text-sm mt-1" }, t("Prueba con otra fecha en el calendario de arriba."))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4" }, slots.map((time24h) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: time24h,
      onClick: () => onTimeSelect(time24h),
      className: `py-3 px-2 rounded-lg text-base font-semibold transition-all transform ${selectedTime === time24h ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg scale-105 ring-2 ring-pink-300" : "bg-white text-pink-700 border-2 border-pink-200 hover:border-pink-400 hover:bg-pink-50 hover:scale-105 hover:shadow-md"}`
    },
    window.formatTo12Hour ? window.formatTo12Hour(time24h) : time24h
  ))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-pink-400 mt-3 text-center" }, t("Mínimo {n} hora(s) de anticipación.", { n: minAntelacionHoras }))));
}
