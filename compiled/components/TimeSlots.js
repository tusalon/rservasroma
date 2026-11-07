function GruposDeHoras({ slots, selectedTime, onTimeSelect }) {
  const t = window.t;
  const grupos = [
    ["☀️", t("Por la mañana"), slots.filter((h) => h < "12:00")],
    ["🌙", t("Por la tarde"), slots.filter((h) => h >= "12:00")]
  ].filter(([, , lista]) => lista.length > 0);
  return grupos.map(([icono, titulo, lista]) => /* @__PURE__ */ React.createElement("div", { key: titulo, className: "rounded-3xl bg-white/90 p-4 shadow-sm border border-pink-100" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-gray-800" }, /* @__PURE__ */ React.createElement("span", { className: "mr-1.5", "aria-hidden": "true" }, icono), titulo), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-pink-700 bg-pink-50 px-2.5 py-1 rounded-full" }, lista.length === 1 ? t("1 hora libre") : t("{n} horas libres", { n: lista.length }))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-2", style: { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" } }, lista.map((hora) => {
    const elegida = selectedTime === hora;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: hora,
        type: "button",
        onClick: () => onTimeSelect(hora),
        "aria-pressed": elegida,
        className: `py-3 px-1 rounded-2xl text-[15px] font-bold tabular-nums whitespace-nowrap transition-all active:scale-95
                                ${elegida ? "bg-pink-500 text-white shadow-lg" : "bg-white text-gray-800 border border-pink-200 hover:border-pink-400"}`
      },
      window.formatTo12Hour ? window.formatTo12Hour(hora) : hora
    );
  }))));
}
function AvisoSinHoras({ icono, titulo, texto }) {
  return /* @__PURE__ */ React.createElement("div", { className: "text-center px-6 py-8 rounded-3xl bg-pink-50 border border-pink-200" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto mb-3 w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-3xl", "aria-hidden": "true" }, icono), /* @__PURE__ */ React.createElement("p", { className: "font-bold text-gray-900" }, titulo), texto && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 mt-1" }, texto));
}
function NotaAntelacion({ horas }) {
  const t = window.t;
  if (!(Number(horas) > 0)) return null;
  return /* @__PURE__ */ React.createElement("p", { className: "flex items-center gap-2 text-xs font-medium text-gray-600" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex w-6 h-6 rounded-full bg-pink-50 items-center justify-center", "aria-hidden": "true" }, "🕒"), t("Se reserva con al menos {n} h de anticipación.", { n: horas }));
}
function TimeSlots({ service, date, profesional, cliente, onTimeSelect, selectedTime }) {
  const idioma = window.useIdioma();
  const t = window.t;
  const [slots, setSlots] = React.useState([]);
  const [occupiedSlots, setOccupiedSlots] = React.useState([]);
  const [waitlistSlots, setWaitlistSlots] = React.useState({});
  const [joiningWaitlist, setJoiningWaitlist] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [horariosPorDia, setHorariosPorDia] = React.useState({});
  const [descansosPorDia, setDescansosPorDia] = React.useState({});
  const [diaTrabaja, setDiaTrabaja] = React.useState(true);
  const [verificacionCompleta, setVerificacionCompleta] = React.useState(false);
  const [maxAntelacionDias, setMaxAntelacionDias] = React.useState(30);
  const [minAntelacionHoras, setMinAntelacionHoras] = React.useState(2);
  const [configCargada, setConfigCargada] = React.useState(false);
  const [recortadasPorAntelacion, setRecortadasPorAntelacion] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [verEspera, setVerEspera] = React.useState(false);
  const toastTimerRef = React.useRef(null);
  const mostrarToast = (tipo, texto) => {
    setToast({ tipo, texto });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };
  React.useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);
  React.useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        if (window.salonConfig) {
          const config = await window.salonConfig.get();
          console.log("⚙️ Configuración cargada en TimeSlots:", config);
          if (config && config.max_antelacion_dias !== void 0) {
            setMaxAntelacionDias(config.max_antelacion_dias);
          }
          if (config && config.min_antelacion_horas !== void 0) {
            setMinAntelacionHoras(config.min_antelacion_horas);
          }
        }
      } catch (error2) {
        console.error("Error cargando configuración:", error2);
      } finally {
        setConfigCargada(true);
      }
    };
    cargarConfiguracion();
  }, []);
  const formatDateLocal = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };
  const getCurrentLocalDate = () => {
    const hoy = /* @__PURE__ */ new Date();
    const year = hoy.getFullYear();
    const month = (hoy.getMonth() + 1).toString().padStart(2, "0");
    const day = hoy.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const normalizeTimeKey = (value) => String(value || "").slice(0, 5);
  React.useEffect(() => {
    if (!profesional) return;
    const cargarHorarios = async () => {
      setVerificacionCompleta(false);
      try {
        console.log(`📅 Cargando horarios por día de ${profesional.nombre}...`);
        const horarios = await window.salonConfig.getHorariosPorDia(profesional.id);
        const descansos = window.salonConfig.getDescansosPorDia ? await window.salonConfig.getDescansosPorDia(profesional.id) : {};
        console.log(`✅ Horarios por día de ${profesional.nombre}:`, horarios);
        setHorariosPorDia(horarios);
        setDescansosPorDia(descansos);
        const tieneHorarios = Object.keys(horarios).length > 0;
        if (!tieneHorarios) {
          console.log("⚠️ No hay horarios configurados para este profesional");
        }
      } catch (error2) {
        console.error("Error cargando horarios:", error2);
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
    console.log("🔍 Verificando disponibilidad para:", {
      profesional: profesional.nombre,
      fecha: date,
      horariosPorDia
    });
    const [año, mes, día] = date.split("-").map(Number);
    const fechaLocal = new Date(año, mes - 1, día);
    const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
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
    if (!service || !date || !profesional || !verificacionCompleta || !configCargada) return;
    const loadSlots = async () => {
      setLoading(true);
      setError(null);
      try {
        const hoy = /* @__PURE__ */ new Date();
        const fechaSeleccionada = /* @__PURE__ */ new Date(date + "T00:00:00");
        const diffTime = fechaSeleccionada - hoy;
        const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
        if (Number(maxAntelacionDias) > 0 && diffDays > Number(maxAntelacionDias)) {
          console.log(`🚫 Fecha ${date} supera antelación máxima de ${maxAntelacionDias} días`);
          setError(t("Solo se puede reservar con hasta {dias} días de antelación", { dias: maxAntelacionDias }));
          setSlots([]);
          setOccupiedSlots([]);
          setLoading(false);
          return;
        }
        const [year, month, day] = date.split("-").map(Number);
        const fechaLocal = new Date(year, month - 1, day);
        const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
        const diaSemana = diasSemana[fechaLocal.getDay()];
        const indicesDelDia = horariosPorDia[diaSemana] || [];
        const descansosDelDia = descansosPorDia[diaSemana] || [];
        if (indicesDelDia.length === 0) {
          console.log(`No hay horas base configuradas para ${diaSemana}; se revisan turnos ocupados para lista de espera.`);
        }
        let baseSlots = indicesDelDia.map((indice) => indiceToHoraLegible(indice));
        if (servicioRestringeHorarios(service, diaSemana)) {
          baseSlots = baseSlots.filter((slot) => servicioPermiteHorario(service, slot, diaSemana));
          console.log(`📋 Slots filtrados por horarios permitidos del servicio:`, baseSlots);
        }
        console.log(`📋 Slots base para ${diaSemana} (después de filtro de servicio):`, baseSlots);
        const cumpleAntelacion = (hora) => horaCumpleAntelacion(date, hora, minAntelacionHoras);
        const totalBase = baseSlots.length;
        baseSlots = baseSlots.filter(cumpleAntelacion);
        setRecortadasPorAntelacion(baseSlots.length < totalBase);
        let bookings = await getBookingsByDateAndProfesional(date, profesional.id, service);
        if (bookings.length === 0 && window.getBookingsByDate) {
          const reservasDia = await window.getBookingsByDate(date);
          const nombreProfesional = String(profesional.nombre || "").trim().toLowerCase();
          bookings = (reservasDia || []).filter((booking) => {
            const mismoId = String(booking.profesional_id || "") === String(profesional.id || "");
            const mismoNombre = String(booking.profesional_nombre || booking.trabajador_nombre || "").trim().toLowerCase() === nombreProfesional;
            return mismoId || mismoNombre;
          });
        }
        const waitlist = window.getListaEsperaPorFechaProfesional ? await window.getListaEsperaPorFechaProfesional(date, profesional.id) : [];
        const waitlistMap = {};
        (waitlist || []).forEach((item) => {
          waitlistMap[normalizeTimeKey(item.hora_inicio)] = item;
        });
        setWaitlistSlots(waitlistMap);
        const occupiedMap = {};
        const esReservaOcupada = (booking) => {
          const estado = String(booking.estado || "").toLowerCase();
          return !booking.bloqueo_espacios && estado !== "cancelado" && estado !== "cancelada" && estado !== "completado" && estado !== "completada" && estado !== "ausente";
        };
        const agregarTurnoOcupado = (booking) => {
          if (!booking?.hora_inicio || !esReservaOcupada(booking)) return;
          const hora = normalizeTimeKey(booking.hora_inicio);
          if (!cumpleAntelacion(hora)) return;
          if (!occupiedMap[hora]) {
            occupiedMap[hora] = {
              hora,
              hora_fin: booking.hora_fin,
              booking
            };
          }
        };
        bookings.forEach(agregarTurnoOcupado);
        let availableSlots = baseSlots.filter((slotStartStr) => {
          const slotStart = timeToMinutes(slotStartStr);
          const slotEnd = slotStart + service.duracion;
          if (slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) {
            return false;
          }
          const bookingConflict = bookings.find((booking) => {
            const bookingStart = timeToMinutes(booking.hora_inicio);
            const bookingEnd = timeToMinutes(booking.hora_fin);
            return slotStart < bookingEnd && slotEnd > bookingStart;
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
        setError(t("Error al cargar horarios"));
      } finally {
        setLoading(false);
      }
    };
    loadSlots();
  }, [service, date, profesional, horariosPorDia, descansosPorDia, diaTrabaja, verificacionCompleta, maxAntelacionDias, minAntelacionHoras, configCargada]);
  const handleUnirseListaEspera = async (slot) => {
    if (!cliente?.nombre || !cliente?.whatsapp) {
      mostrarToast("error", t("Necesitas ingresar con tu WhatsApp para anotarte en lista de espera."));
      return;
    }
    if (!window.unirseListaEspera) {
      mostrarToast("error", t("La lista de espera todavia no esta disponible."));
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
        setWaitlistSlots((prev) => ({ ...prev, [slot.hora]: result.data }));
        mostrarToast("ok", t("Listo. Quedaste en lista de espera para ese horario."));
      } else if (result.reason === "occupied") {
        mostrarToast("error", t("Ese horario ya tiene una clienta en lista de espera."));
        setWaitlistSlots((prev) => ({ ...prev, [slot.hora]: result.data || true }));
      } else {
        mostrarToast("error", t("No se pudo anotarte en lista de espera. Intenta de nuevo."));
      }
    } finally {
      setJoiningWaitlist("");
    }
  };
  if (!service || !date || !profesional) return null;
  if (!verificacionCompleta) {
    return /* @__PURE__ */ React.createElement("div", { className: "space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-pink-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "⏰"), t("4. Elige un horario con {nombre}", { nombre: profesional.nombre })), /* @__PURE__ */ React.createElement("div", { className: "flex justify-center py-8" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" })));
  }
  if (!diaTrabaja && occupiedSlots.length === 0) {
    const [year, month, day] = date.split("-").map(Number);
    const fechaLocal = new Date(year, month - 1, day);
    const diasSemanaPlural = idioma === "en" ? ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"] : ["domingos", "lunes", "martes", "miercoles", "jueves", "viernes", "sabados"];
    const diaSemana = diasSemanaPlural[fechaLocal.getDay()];
    const diaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
    return /* @__PURE__ */ React.createElement("div", { className: "space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-pink-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "⏰"), t("4. Elige un horario con {nombre}", { nombre: profesional.nombre })), /* @__PURE__ */ React.createElement(
      AvisoSinHoras,
      {
        icono: "🌿",
        titulo: t("{nombre} no trabaja los {dia}", { nombre: profesional.nombre, dia: diaCapitalizado }),
        texto: t("Elige otro día de la semana")
      }
    ));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-4 animate-fade-in" }, toast && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2
                    ${toast.tipo === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`,
      style: { maxWidth: "90vw" }
    },
    /* @__PURE__ */ React.createElement("span", null, toast.tipo === "ok" ? "✅" : "❌"),
    /* @__PURE__ */ React.createElement("span", null, toast.texto)
  ), /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-pink-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "⏰"), t("4. Elige un horario con {nombre}", { nombre: profesional.nombre }), selectedTime && /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2" }, "✓ ", t("Horario seleccionado"))), loading ? /* @__PURE__ */ React.createElement("div", { className: "flex justify-center py-8" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" })) : error ? /* @__PURE__ */ React.createElement(AvisoSinHoras, { icono: "⏳", titulo: error }) : slots.length === 0 && occupiedSlots.length === 0 ? recortadasPorAntelacion ? /* @__PURE__ */ React.createElement(
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
      titulo: t("No hay horarios disponibles para {nombre} el {fecha}", { nombre: profesional.nombre, fecha: formatDateLocal(date) }),
      texto: t("Prueba con otra fecha")
    }
  ) : /* @__PURE__ */ React.createElement(React.Fragment, null, recortadasPorAntelacion && /* @__PURE__ */ React.createElement(NotaAntelacion, { horas: minAntelacionHoras }), /* @__PURE__ */ React.createElement(GruposDeHoras, { slots, selectedTime, onTimeSelect }), occupiedSlots.length > 0 && slots.length > 0 && !verEspera && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setVerEspera(true),
      className: "w-full rounded-2xl border border-dashed border-pink-300 bg-white/70 py-3 text-sm font-semibold text-pink-700"
    },
    t("¿No ves tu hora? Ponte en lista de espera")
  ), occupiedSlots.length > 0 && (verEspera || slots.length === 0) && /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-amber-200 bg-amber-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-amber-800" }, t("Horarios ocupados con lista de espera")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-amber-700" }, t("Puedes anotarte en un horario ocupado. Solo se permite una clienta en espera por horario."))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3" }, occupiedSlots.map((slot) => {
    const yaTieneEspera = Boolean(waitlistSlots[slot.hora]);
    const cargando = joiningWaitlist === slot.hora;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: slot.hora,
        type: "button",
        onClick: () => handleUnirseListaEspera(slot),
        disabled: yaTieneEspera || cargando,
        className: `py-3 px-2 rounded-2xl text-sm font-semibold transition flex flex-col items-center border
                                                ${yaTieneEspera ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-amber-800 border-amber-300 hover:bg-amber-100"}`
      },
      /* @__PURE__ */ React.createElement("span", null, window.formatTo12Hour ? window.formatTo12Hour(slot.hora) : slot.hora),
      /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium mt-1" }, cargando ? t("Guardando...") : yaTieneEspera ? t("Lista ocupada") : t("Lista de espera"))
    );
  })))));
}
