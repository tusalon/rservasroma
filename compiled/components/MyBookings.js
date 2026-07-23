function MyBookings({ cliente, onVolver }) {
  window.useIdioma();
  const t = window.t;
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [cancelando, setCancelando] = React.useState(null);
  const [filtro, setFiltro] = React.useState("proximas");
  const [mensajeError, setMensajeError] = React.useState("");
  const [negocioId, setNegocioId] = React.useState(null);
  const [minCancelacionHoras, setMinCancelacionHoras] = React.useState(1);
  const [configGlobal, setConfigGlobal] = React.useState({});
  const [reprogramando, setReprogramando] = React.useState(false);
  const [reservaReprogramando, setReservaReprogramando] = React.useState(null);
  const [reprogramacionFecha, setReprogramacionFecha] = React.useState("");
  const [reprogramacionHora, setReprogramacionHora] = React.useState("");
  const [horariosReprogramacion, setHorariosReprogramacion] = React.useState([]);
  const [cargandoHorariosReprogramacion, setCargandoHorariosReprogramacion] = React.useState(false);
  const [mensajeReprogramacion, setMensajeReprogramacion] = React.useState("");
  const [confirmandoCancelacion, setConfirmandoCancelacion] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [guardandoValoracion, setGuardandoValoracion] = React.useState(null);
  const valorarServicio = async (booking, n) => {
    if (guardandoValoracion) return;
    setGuardandoValoracion(booking.id);
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${booking.id}`,
        { method: "PATCH", headers: { "apikey": window.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ valoracion_servicio: n, valoracion_servicio_at: (/* @__PURE__ */ new Date()).toISOString() }) }
      );
      if (!res.ok) throw new Error();
      setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, valoracion_servicio: n } : b));
      mostrarToast("ok", t("¡Gracias por valorar tu visita!"));
    } catch {
      mostrarToast("error", t("No se pudo guardar la valoración. Intenta de nuevo."));
    } finally {
      setGuardandoValoracion(null);
    }
  };
  const mostrarToast = (tipo, texto) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 3500);
  };
  React.useEffect(() => {
    const id = localStorage.getItem("negocioId") || window.NEGOCIO_ID_POR_DEFECTO;
    setNegocioId(id);
  }, []);
  React.useEffect(() => {
    if (!window.salonConfig) return;
    window.salonConfig.get().then((config) => {
      setConfigGlobal(config || {});
      if (config && config.min_cancelacion_horas !== void 0) {
        setMinCancelacionHoras(config.min_cancelacion_horas);
      }
    }).catch(() => {
    });
  }, []);
  React.useEffect(() => {
    if (cliente?.whatsapp && negocioId) cargarReservas();
  }, [cliente, negocioId]);
  const cargarReservas = async () => {
    setLoading(true);
    setMensajeError("");
    try {
      const response = await fetch(
        `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&cliente_whatsapp=eq.${cliente.whatsapp}&order=fecha.desc,hora_inicio.desc`,
        { headers: { "apikey": window.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}` } }
      );
      if (!response.ok) throw new Error();
      const data = await response.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setMensajeError(t("Error al cargar tus reservas. Intenta de nuevo."));
    } finally {
      setLoading(false);
    }
  };
  const puedeCancelar = (fecha, horaInicio) => {
    try {
      const [year, month, day] = fecha.split("-").map(Number);
      const [hours, minutes] = horaInicio.split(":").map(Number);
      const diffMs = new Date(year, month - 1, day, hours, minutes, 0) - /* @__PURE__ */ new Date();
      return Math.floor(diffMs / 6e4) > minCancelacionHoras * 60;
    } catch {
      return false;
    }
  };
  const getMensajeTiempoRestante = (fecha, horaInicio) => {
    try {
      const [year, month, day] = fecha.split("-").map(Number);
      const [hours, minutes] = horaInicio.split(":").map(Number);
      const diffMs = new Date(year, month - 1, day, hours, minutes, 0) - /* @__PURE__ */ new Date();
      const diffMinutos = Math.floor(diffMs / 6e4);
      const diffHoras = Math.floor(diffMinutos / 60);
      const mins = diffMinutos % 60;
      if (diffMinutos <= 0) return "⏰ " + t("El turno ya pasó");
      if (diffMinutos <= minCancelacionHoras * 60) return "⚠️ " + t("Faltan {tiempo} — ya no se puede cancelar desde la app", { tiempo: diffHoras > 0 ? `${diffHoras}h ${mins}m` : `${diffMinutos} min` });
      return "🕐 " + t("Faltan {tiempo} — puedes cancelar", { tiempo: diffHoras > 0 ? `${diffHoras}h ${mins}m` : `${diffMinutos} min` });
    } catch {
      return "";
    }
  };
  const formatDateInput = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const getTodayLocalString = () => formatDateInput(/* @__PURE__ */ new Date());
  const timeToMinutes = (t2) => {
    const [h, m] = String(t2 || "0:0").split(":").map(Number);
    return h * 60 + m;
  };
  const minutesToTime = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const calcularHoraFin = (inicio, dur) => minutesToTime(timeToMinutes(inicio) + (parseInt(dur, 10) || 60));
  const obtenerServicioReserva = async (booking) => {
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/servicios?negocio_id=eq.${negocioId}&select=*`,
        { headers: { "apikey": window.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}` } }
      );
      const servicios = res.ok ? await res.json() : [];
      const nombres = String(booking.servicio || "").split(" + ").map((s) => s.trim());
      return servicios.find((s) => s.nombre === booking.servicio) || servicios.find((s) => s.nombre === nombres[0]) || { nombre: booking.servicio, duracion: booking.duracion || 60 };
    } catch {
      return { nombre: booking.servicio, duracion: booking.duracion || 60 };
    }
  };
  const calcularHorariosReprogramacion = async (booking, fecha) => {
    if (!booking || !fecha || !negocioId) return [];
    const [year, month, day] = fecha.split("-").map(Number);
    const fechaLocal = new Date(year, month - 1, day);
    const hoy2 = /* @__PURE__ */ new Date();
    hoy2.setHours(0, 0, 0, 0);
    if (fechaLocal < hoy2) return [];
    const maxDias = configGlobal?.max_antelacion_dias ?? 30;
    const minHoras = configGlobal?.min_antelacion_horas ?? 2;
    const diffDias = Math.ceil((fechaLocal - hoy2) / 864e5);
    if (Number(maxDias) > 0 && diffDias > Number(maxDias)) {
      setMensajeReprogramacion(t("Solo puedes reservar con hasta {dias} días de anticipación.", { dias: maxDias }));
      return [];
    }
    const diasCerrados = typeof window.getDiasCerrados === "function" ? await window.getDiasCerrados() : [];
    if ((diasCerrados || []).some((d) => d.fecha === fecha)) {
      setMensajeReprogramacion(t("Ese día está cerrado para reservas."));
      return [];
    }
    const horarios = await window.salonConfig.getHorariosProfesionalParaFecha(booking.profesional_id, fecha);
    const descansosPorDia = horarios?.descansosPorDia || {};
    const profRes = await fetch(
      `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&id=eq.${booking.profesional_id}&select=id,nombre,fechas_libres`,
      { headers: { "apikey": window.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}` } }
    );
    const profesional = profRes.ok ? (await profRes.json())[0] : {};
    if (profesional?.fechas_libres?.includes(fecha)) {
      setMensajeReprogramacion(t("La profesional tiene ese día marcado como libre."));
      return [];
    }
    const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    const diaSemana = diasSemana[fechaLocal.getDay()];
    const indicesDelDia = horarios?.horariosPorDia?.[diaSemana] || [];
    if (!indicesDelDia.length) {
      setMensajeReprogramacion(t("No hay horarios para ese día."));
      return [];
    }
    const servicio = await obtenerServicioReserva(booking);
    const duracion = parseInt(booking.duracion || servicio?.duracion || 60, 10);
    const descansosDelDia = descansosPorDia?.[diaSemana] || [];
    const resRes = await fetch(
      `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=eq.${fecha}&profesional_id=eq.${booking.profesional_id}&estado=neq.Cancelado&select=id,hora_inicio,hora_fin`,
      { headers: { "apikey": window.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}` } }
    );
    const reservas = resRes.ok ? await resRes.json() : [];
    const minFechaPermitida = new Date(Date.now() + minHoras * 36e5);
    let baseSlots = indicesDelDia.map(indiceToHoraLegible);
    if (servicio?.horarios_permitidos?.length) baseSlots = baseSlots.filter((s) => servicioPermiteHorario(servicio, s));
    const disponibles = baseSlots.filter((slot) => {
      const slotStart = timeToMinutes(slot);
      const slotEnd = slotStart + duracion;
      const [h, m] = slot.split(":").map(Number);
      if (new Date(year, month - 1, day, h, m) < minFechaPermitida) return false;
      if (slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) return false;
      return !(reservas || []).some((r) => String(r.id) !== String(booking.id) && slotStart < timeToMinutes(r.hora_fin) && slotEnd > timeToMinutes(r.hora_inicio));
    });
    setMensajeReprogramacion(disponibles.length ? "" : t("No hay horarios disponibles para esa fecha."));
    return [...new Set(disponibles)].sort();
  };
  const handleCancelarReserva = async (booking) => {
    if (!puedeCancelar(booking.fecha, booking.hora_inicio)) {
      const telefonoDuenno = await window.getTelefonoDuenno();
      const tel = window.formatearTelefono ? window.formatearTelefono(telefonoDuenno) : `+${telefonoDuenno}`;
      mostrarToast("error", t("No puedes cancelar con menos de {n}h de anticipación. Escribe al {tel}", { n: minCancelacionHoras, tel }));
      return;
    }
    setConfirmandoCancelacion(booking);
  };
  const confirmarCancelacion = async () => {
    const booking = confirmandoCancelacion;
    setConfirmandoCancelacion(null);
    setCancelando(booking.id);
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${booking.id}`,
        { method: "PATCH", headers: { "apikey": window.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ estado: "Cancelado" }) }
      );
      if (!res.ok) throw new Error();
      booking.cancelado_por = "cliente";
      if (window.notificarCancelacion) await window.notificarCancelacion(booking);
      await window.notificarListaEsperaTurnoLiberado?.(booking);
      mostrarToast("ok", t("Turno cancelado correctamente."));
      await cargarReservas();
    } catch {
      mostrarToast("error", t("Error al cancelar el turno. Intenta de nuevo."));
    } finally {
      setCancelando(null);
    }
  };
  React.useEffect(() => {
    if (!reservaReprogramando || !reprogramacionFecha) {
      setHorariosReprogramacion([]);
      return;
    }
    setCargandoHorariosReprogramacion(true);
    setMensajeReprogramacion("");
    setReprogramacionHora("");
    calcularHorariosReprogramacion(reservaReprogramando, reprogramacionFecha).then(setHorariosReprogramacion).catch(() => {
      setMensajeReprogramacion(t("Error cargando horarios."));
      setHorariosReprogramacion([]);
    }).finally(() => setCargandoHorariosReprogramacion(false));
  }, [reservaReprogramando, reprogramacionFecha, negocioId, configGlobal]);
  const puedeReprogramar = (booking) => {
    if (!booking || booking.estado === "Completado" || booking.estado === "Ausente") return false;
    if (booking.estado === "Cancelado") return true;
    try {
      const [y, mo, d] = booking.fecha.split("-").map(Number);
      const [h, m] = booking.hora_inicio.split(":").map(Number);
      return new Date(y, mo - 1, d, h, m) > /* @__PURE__ */ new Date();
    } catch {
      return false;
    }
  };
  const abrirReprogramacion = (booking) => {
    if (!puedeReprogramar(booking)) {
      mostrarToast("error", t("Esta cita ya no se puede reprogramar."));
      return;
    }
    setReservaReprogramando(booking);
    setReprogramacionFecha("");
    setReprogramacionHora("");
    setHorariosReprogramacion([]);
    setMensajeReprogramacion("");
  };
  const cerrarReprogramacion = () => {
    setReservaReprogramando(null);
    setReprogramacionFecha("");
    setReprogramacionHora("");
    setHorariosReprogramacion([]);
    setMensajeReprogramacion("");
  };
  const notificarReprogramacion = async (nuevo, anterior) => {
    try {
      const config = window.cargarConfiguracionNegocio ? await window.cargarConfiguracionNegocio(true) : {};
      const fA = window.formatFechaCompleta ? window.formatFechaCompleta(anterior.fecha) : anterior.fecha;
      const fN = window.formatFechaCompleta ? window.formatFechaCompleta(nuevo.fecha) : nuevo.fecha;
      const hA = window.formatTo12Hour ? window.formatTo12Hour(anterior.hora_inicio) : anterior.hora_inicio;
      const hN = window.formatTo12Hour ? window.formatTo12Hour(nuevo.hora_inicio) : nuevo.hora_inicio;
      const msg = `CITA REPROGRAMADA - ${config?.nombre || "Salón"}

Cliente: ${nuevo.cliente_nombre}
WhatsApp: ${nuevo.cliente_whatsapp}
Servicio: ${nuevo.servicio}
Profesional: ${nuevo.profesional_nombre || "No asignada"}

Antes: ${fA} a las ${hA}
Ahora: ${fN} a las ${hN}`;
      if (window.enviarNotificacionPush) await window.enviarNotificacionPush(`${config?.nombre || "Salón"} - Cita reprogramada`, msg, "calendar", "default", { profesionalId: nuevo.profesional_id || nuevo.trabajador_id || nuevo.barbero_id });
      if (window.enviarWhatsApp && config?.telefono) window.enviarWhatsApp(config.telefono, msg);
      if (window.enviarPushCliente && nuevo.cliente_whatsapp) {
        window.enviarPushCliente({
          whatsapp: nuevo.cliente_whatsapp,
          title: `📅 ${t("Cita reprogramada")} — ${config?.nombre || t("Tu salón")}`,
          body: t("{servicio}: ahora el {fecha} a las {hora}", { servicio: nuevo.servicio, fecha: fN, hora: hN })
        }).catch(() => {
        });
      }
    } catch {
    }
  };
  const handleGuardarReprogramacion = async () => {
    if (!reservaReprogramando || !reprogramacionFecha || !reprogramacionHora) {
      mostrarToast("error", t("Selecciona fecha y hora para reprogramar."));
      return;
    }
    setReprogramando(true);
    try {
      const horariosVigentes = await calcularHorariosReprogramacion(reservaReprogramando, reprogramacionFecha);
      if (!horariosVigentes.includes(reprogramacionHora)) {
        setHorariosReprogramacion(horariosVigentes);
        mostrarToast("error", t("Ese horario ya no está disponible. Elige otro."));
        return;
      }
      const horaFin = calcularHoraFin(reprogramacionHora, reservaReprogramando.duracion || 60);
      const payload = { fecha: reprogramacionFecha, hora_inicio: reprogramacionHora, hora_fin: horaFin, estado: reservaReprogramando.estado === "Cancelado" ? "Reservado" : reservaReprogramando.estado };
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${reservaReprogramando.id}`,
        { method: "PATCH", headers: { "apikey": window.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" }, body: JSON.stringify(payload) }
      );
      if (!res.ok) throw new Error();
      const actualizadas = await res.json();
      await notificarReprogramacion(actualizadas?.[0] || { ...reservaReprogramando, ...payload }, reservaReprogramando);
      await window.notificarListaEsperaTurnoLiberado?.(reservaReprogramando);
      mostrarToast("ok", t("Turno reprogramado correctamente."));
      cerrarReprogramacion();
      await cargarReservas();
    } catch {
      mostrarToast("error", t("Error al reprogramar el turno. Intenta de nuevo."));
    } finally {
      setReprogramando(false);
    }
  };
  const hoy = formatDateInput(/* @__PURE__ */ new Date());
  const esPasado = (b) => b.fecha < hoy || b.estado === "Completado" || b.estado === "Ausente";
  const esProximo = (b) => !esPasado(b) && b.estado !== "Cancelado";
  const reservasFiltradas = bookings.filter(
    (b) => filtro === "proximas" ? esProximo(b) : filtro === "historial" ? esPasado(b) : filtro === "canceladas" ? b.estado === "Cancelado" : true
  );
  const proximasCount = bookings.filter(esProximo).length;
  const historialCount = bookings.filter(esPasado).length;
  const canceladasCount = bookings.filter((b) => b.estado === "Cancelado").length;
  const activasCount = proximasCount;
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 pb-20" }, toast && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all
                    ${toast.tipo === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`,
      style: { maxWidth: "90vw" }
    },
    /* @__PURE__ */ React.createElement("span", null, toast.tipo === "ok" ? "✅" : "❌"),
    /* @__PURE__ */ React.createElement("span", null, toast.texto)
  ), confirmandoCancelacion && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-pink-800 mb-2" }, t("¿Cancelar turno?")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-600 mb-1" }, window.formatFechaCompleta ? window.formatFechaCompleta(confirmandoCancelacion.fecha) : confirmandoCancelacion.fecha), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-600 mb-4" }, window.formatTo12Hour ? window.formatTo12Hour(confirmandoCancelacion.hora_inicio) : confirmandoCancelacion.hora_inicio, " — ", confirmandoCancelacion.servicio), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setConfirmandoCancelacion(null),
      className: "flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 font-medium"
    },
    t("No, volver")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: confirmarCancelacion,
      className: "flex-1 py-2 rounded-lg bg-red-500 text-white font-medium"
    },
    t("Sí, cancelar")
  )))), /* @__PURE__ */ React.createElement("div", { className: "bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-10 border-b border-pink-200" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-3xl mx-auto px-4 py-4 flex justify-between items-center" }, /* @__PURE__ */ React.createElement("button", { onClick: onVolver, className: "flex items-center gap-2 text-pink-600 hover:text-pink-800 transition" }, /* @__PURE__ */ React.createElement("i", { className: "icon-arrow-left text-xl" }), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, t("Volver"))), /* @__PURE__ */ React.createElement("h1", { className: "text-xl font-bold text-pink-800" }, "✨ ", t("Mis Reservas")), /* @__PURE__ */ React.createElement("div", { className: "w-20" }))), /* @__PURE__ */ React.createElement("div", { className: "max-w-3xl mx-auto px-4 py-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white/80 backdrop-blur-sm border border-pink-200 rounded-lg p-4 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold" }, cliente.nombre.charAt(0)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-pink-800" }, cliente.nombre), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-600" }, cliente.whatsapp)))), mensajeError && /* @__PURE__ */ React.createElement("div", { className: "bg-pink-100 border border-pink-300 text-pink-700 p-3 rounded-lg mb-4 text-sm" }, mensajeError), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-6 overflow-x-auto pb-2" }, [
    ["proximas", t("Próximas ({n})", { n: proximasCount })],
    ["historial", t("Historial ({n})", { n: historialCount })],
    ["canceladas", t("Canceladas ({n})", { n: canceladasCount })]
  ].map(([key, label]) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key,
      onClick: () => setFiltro(key),
      className: `px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap
                                ${filtro === key ? "bg-pink-500 text-white shadow-md" : "bg-pink-100 text-pink-700 hover:bg-pink-200"}`
    },
    label
  ))), filtro === "historial" && historialCount > 0 && /* @__PURE__ */ React.createElement("div", { className: "bg-pink-50 border border-pink-200 rounded-xl p-4 mb-4 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl" }, "💅"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-pink-800" }, t("{n} visita{s} en total", { n: historialCount, s: historialCount !== 1 ? "s" : "" })), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-pink-500" }, t("Gracias por elegirnos siempre")))), loading ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-12" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto" }), /* @__PURE__ */ React.createElement("p", { className: "text-pink-500 mt-4" }, t("Cargando tus reservas..."))) : reservasFiltradas.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-pink-200" }, /* @__PURE__ */ React.createElement("div", { className: "text-6xl mb-4" }, filtro === "historial" ? "📖" : "📅"), /* @__PURE__ */ React.createElement("p", { className: "text-pink-600 mb-2" }, filtro === "proximas" ? t("No tienes turnos próximos") : filtro === "historial" ? t("Aún no tienes visitas pasadas") : t("No tienes turnos cancelados")), filtro === "proximas" && /* @__PURE__ */ React.createElement("button", { onClick: onVolver, className: "text-pink-500 font-medium hover:underline" }, t("Reservar un turno"))) : /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, reservasFiltradas.map((booking) => {
    const puedeCancelarBooking = booking.estado !== "Cancelado" && puedeCancelar(booking.fecha, booking.hora_inicio);
    const puedeReprogramarBooking = puedeReprogramar(booking);
    const tiempoRestante = getMensajeTiempoRestante(booking.fecha, booking.hora_inicio);
    const fechaConDia = window.formatFechaCompleta ? window.formatFechaCompleta(booking.fecha) : booking.fecha;
    const profesional = booking.profesional_nombre || booking.trabajador_nombre || t("No asignada");
    const calendarLink = window.generarLinkCalendarioCliente ? window.generarLinkCalendarioCliente(booking) : "";
    return /* @__PURE__ */ React.createElement("div", { key: booking.id, className: `bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border-l-4 overflow-hidden border border-pink-200
                                    ${booking.estado === "Cancelado" ? "border-l-pink-400 opacity-70" : "border-l-pink-500"}` }, /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start mb-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-sm text-pink-600 font-medium block mb-1" }, fechaConDia), /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-pink-800 text-lg" }, booking.servicio)), /* @__PURE__ */ React.createElement("span", { className: `px-3 py-1 rounded-full text-xs font-semibold
                                                ${booking.estado === "Reservado" || booking.estado === "Confirmado" ? "bg-green-100 text-green-700" : booking.estado === "Pendiente" ? "bg-amber-100 text-amber-700" : booking.estado === "Completado" ? "bg-pink-200 text-pink-800" : booking.estado === "Cancelado" ? "bg-gray-100 text-gray-500" : "bg-pink-100 text-pink-500"}` }, booking.estado === "Reservado" || booking.estado === "Confirmado" ? "✅ " + t("Confirmado") : booking.estado === "Pendiente" ? "⏳ " + t("Falta el anticipo") : booking.estado === "Completado" ? "💅 " + t("Completado") : booking.estado === "Ausente" ? t("No asististe") : booking.estado)), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3 text-sm mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-pink-600" }, /* @__PURE__ */ React.createElement("span", { className: "text-pink-400" }, "⏰"), /* @__PURE__ */ React.createElement("span", null, window.formatTo12Hour ? window.formatTo12Hour(booking.hora_inicio) : booking.hora_inicio)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-pink-600" }, /* @__PURE__ */ React.createElement("span", { className: "text-pink-400" }, "⏱️"), /* @__PURE__ */ React.createElement("span", null, booking.duracion, " min")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-pink-600 col-span-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-pink-400" }, "👩‍🎨"), /* @__PURE__ */ React.createElement("span", null, t("Profesional:"), " ", profesional))), booking.estado !== "Cancelado" && booking.estado !== "Completado" && /* @__PURE__ */ React.createElement("div", { className: `text-xs p-2 rounded-lg mb-3 flex items-center gap-2
                                                ${puedeCancelarBooking ? "bg-pink-50 text-pink-700 border border-pink-200" : "bg-pink-100 text-pink-700 border border-pink-300"}` }, /* @__PURE__ */ React.createElement("span", null, puedeCancelarBooking ? "💡" : "⚠️"), /* @__PURE__ */ React.createElement("span", null, tiempoRestante)), booking.estado === "Completado" && (Number(booking.valoracion_servicio) > 0 ? /* @__PURE__ */ React.createElement("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-yellow-700 font-medium mb-1" }, t("Tu valoración de esta visita")), /* @__PURE__ */ React.createElement("div", { className: "text-xl leading-none" }, [1, 2, 3, 4, 5].map((n) => /* @__PURE__ */ React.createElement("span", { key: n, style: { filter: Number(booking.valoracion_servicio) >= n ? "none" : "grayscale(1) opacity(0.3)" } }, "⭐")))) : /* @__PURE__ */ React.createElement("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-yellow-800 font-semibold mb-0.5" }, t("¿Cómo estuvo tu visita?")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-yellow-600 mb-2" }, t("Tu opinión ayuda al salón a mejorar")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-center gap-1.5" }, [1, 2, 3, 4, 5].map((n) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: n,
        type: "button",
        onClick: () => valorarServicio(booking, n),
        disabled: guardandoValoracion !== null,
        className: "text-2xl transition-transform active:scale-95 disabled:opacity-50",
        style: { filter: "grayscale(1) opacity(0.45)" },
        onMouseEnter: (e) => {
          e.currentTarget.style.filter = "none";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.filter = "grayscale(1) opacity(0.45)";
        }
      },
      "⭐"
    ))), guardandoValoracion === booking.id && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-yellow-600 mt-2" }, t("Guardando...")))), booking.estado !== "Cancelado" && calendarLink && /* @__PURE__ */ React.createElement(
      "a",
      {
        href: calendarLink,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 mb-2"
      },
      /* @__PURE__ */ React.createElement("i", { className: "icon-calendar text-base" }),
      t("Agregar al calendario")
    ), puedeReprogramarBooking && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => abrirReprogramacion(booking),
        className: "w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 mb-2"
      },
      /* @__PURE__ */ React.createElement("i", { className: "icon-calendar text-base" }),
      t("Cambiar fecha y hora")
    ), booking.estado !== "Cancelado" && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => handleCancelarReserva(booking),
        disabled: cancelando !== null || !puedeCancelarBooking,
        className: `w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2
                                                    ${puedeCancelarBooking ? "bg-pink-100 hover:bg-pink-200 text-pink-700" : "bg-pink-50 text-pink-400 cursor-not-allowed"}
                                                    disabled:opacity-50 disabled:cursor-not-allowed`
      },
      cancelando === booking.id ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-4 w-4 border-2 border-pink-600 border-t-transparent rounded-full" }), t("Cancelando...")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "❌"), puedeCancelarBooking ? t("Cancelar turno") : t("No se puede cancelar aún"))
    )));
  }))), reservaReprogramando && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "sticky top-0 bg-white border-b border-pink-100 p-4 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-bold text-pink-800" }, t("Cambiar fecha y hora")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-500" }, reservaReprogramando.servicio)), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: cerrarReprogramacion,
      disabled: reprogramando,
      className: "w-9 h-9 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 disabled:opacity-50 text-lg"
    },
    "✕"
  )), /* @__PURE__ */ React.createElement("div", { className: "p-4 space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-lg bg-pink-50 border border-pink-100 p-3 text-sm text-pink-700" }, t("Solo cambia la fecha y hora. El servicio, profesional y duración se mantienen igual.")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3 text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 rounded-lg p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-gray-500" }, t("Profesional")), /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-gray-800" }, reservaReprogramando.profesional_nombre || t("No asignada"))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 rounded-lg p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-gray-500" }, t("Duración")), /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-gray-800" }, reservaReprogramando.duracion || 60, " min"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Nueva fecha")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      min: getTodayLocalString(),
      value: reprogramacionFecha,
      onChange: (e) => setReprogramacionFecha(e.target.value),
      className: "w-full border border-pink-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400"
    }
  )), reprogramacionFecha && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, t("Nueva hora")), cargandoHorariosReprogramacion ? /* @__PURE__ */ React.createElement("div", { className: "flex justify-center py-6" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" })) : horariosReprogramacion.length > 0 ? /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-2" }, horariosReprogramacion.map((hora) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: hora,
      type: "button",
      onClick: () => setReprogramacionHora(hora),
      className: `py-2 px-3 rounded-lg text-sm font-medium ${reprogramacionHora === hora ? "bg-pink-500 text-white" : "bg-pink-50 text-pink-700 hover:bg-pink-100"}`
    },
    window.formatTo12Hour ? window.formatTo12Hour(hora) : hora
  ))) : /* @__PURE__ */ React.createElement("div", { className: "p-3 rounded-lg bg-pink-50 text-pink-700 border border-pink-100 text-sm" }, mensajeReprogramacion || t("No hay horarios disponibles para esa fecha."))), mensajeReprogramacion && horariosReprogramacion.length > 0 && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-600" }, mensajeReprogramacion), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: cerrarReprogramacion,
      disabled: reprogramando,
      className: "flex-1 py-2 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-50"
    },
    t("Cancelar")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleGuardarReprogramacion,
      disabled: reprogramando || !reprogramacionFecha || !reprogramacionHora,
      className: "flex-1 py-2 rounded-lg bg-pink-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    },
    reprogramando ? t("Guardando...") : t("Guardar cambio")
  ))))));
}
