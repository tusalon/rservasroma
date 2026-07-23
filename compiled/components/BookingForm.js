function BookingForm({ service, profesional, date, time, onSubmit, onCancel, cliente }) {
  window.useIdioma();
  const t = window.t;
  const [submitting, setSubmitting] = React.useState(false);
  const submittingRef = React.useRef(false);
  const [error, setError] = React.useState(null);
  const [anticipoInfo, setAnticipoInfo] = React.useState(null);
  React.useEffect(() => {
    let vigente = true;
    const cargarAnticipo = async () => {
      try {
        const configNegocio = await window.cargarConfiguracionNegocio();
        const monto = window.calcularMontoAnticipoReservaSync ? window.calcularMontoAnticipoReservaSync(configNegocio, service) : 0;
        const requiere = configNegocio?.requiere_anticipo === true && (!configNegocio?.anticipos_por_servicio || monto > 0);
        const moneda = window.getPreferenciasWhatsAppNegocio ? window.getPreferenciasWhatsAppNegocio().moneda || "" : "";
        if (vigente) setAnticipoInfo({ requiere, monto, moneda });
      } catch (e) {
      }
    };
    cargarAnticipo();
    return () => {
      vigente = false;
    };
  }, [service]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      if (service.esMultiple && profesional.esMultiple) {
        const configNegocio2 = await window.cargarConfiguracionNegocio();
        const configGlobal2 = window.salonConfig ? await window.salonConfig.get() : {};
        const minAntelacionHoras2 = configGlobal2?.min_antelacion_horas ?? 2;
        const montoAnticipoReserva2 = window.calcularMontoAnticipoReservaSync ? window.calcularMontoAnticipoReservaSync(configNegocio2, service) : 0;
        const requiereAnticipo2 = configNegocio2?.requiere_anticipo === true && (!configNegocio2?.anticipos_por_servicio || montoAnticipoReserva2 > 0);
        const [year2, month2, day2] = date.split("-").map(Number);
        const [hours2, minutes2] = time.split(":").map(Number);
        const fechaTurno2 = new Date(year2, month2 - 1, day2, hours2, minutes2, 0);
        const minFechaPermitida2 = new Date(Date.now() + minAntelacionHoras2 * 60 * 60 * 1e3);
        const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
        const diaSemana = diasSemana[new Date(year2, month2 - 1, day2).getDay()];
        if (fechaTurno2 < minFechaPermitida2) {
          setError(t("Solo se puede reservar con al menos {n} hora(s) de anticipación.", { n: minAntelacionHoras2 }));
          setSubmitting(false);
          return;
        }
        let cursor = time;
        const tramos = [];
        for (let index = 0; index < profesional.asignaciones.length; index++) {
          const item = profesional.asignaciones[index];
          const servicioItem = item.servicio;
          const profesionalItem = item.profesional;
          const bookings2 = await getBookingsByDateAndProfesional(date, profesionalItem.id);
          const horarioFecha = await window.salonConfig.getHorariosProfesionalParaFecha(profesionalItem.id, date);
          const horariosPorDia = horarioFecha.horariosPorDia || {};
          const descansosPorDia = horarioFecha.descansosPorDia || {};
          const inicioMin = timeToMinutes(cursor);
          const finMin = inicioMin + (parseInt(servicioItem.duracion, 10) || 60);
          const trabajaEseDia = (horariosPorDia[diaSemana] || []).length > 0;
          const tocaDescanso = slotTieneDescanso(inicioMin, finMin, descansosPorDia[diaSemana] || []);
          const tieneConflicto = bookings2.some((booking) => {
            const bookingStart = timeToMinutes(booking.hora_inicio);
            const bookingEnd = timeToMinutes(booking.hora_fin);
            return inicioMin < bookingEnd && finMin > bookingStart;
          });
          const horarioPermitido = index > 0 || servicioPermiteHorario(servicioItem, cursor);
          if (!trabajaEseDia || tocaDescanso || tieneConflicto || !horarioPermitido) {
            setError(t("El horario de {servicio} con {nombre} ya no está disponible.", { servicio: servicioItem.nombre, nombre: profesionalItem.nombre }));
            setSubmitting(false);
            return;
          }
          const endTime2 = calculateEndTime(cursor, servicioItem.duracion);
          tramos.push({
            cliente_nombre: cliente.nombre,
            cliente_whatsapp: cliente.whatsapp,
            servicio: servicioItem.nombre,
            duracion: servicioItem.duracion,
            profesional_id: profesionalItem.id,
            profesional_nombre: profesionalItem.nombre,
            fecha: date,
            hora_inicio: cursor,
            hora_fin: endTime2,
            estado: requiereAnticipo2 ? "Pendiente" : "Reservado"
          });
          cursor = endTime2;
        }
        const creadas = [];
        try {
          for (const tramo of tramos) {
            const result2 = await createBooking(tramo);
            if (!result2.success || !result2.data) throw new Error("No se pudo crear una de las reservas");
            creadas.push(result2.data);
          }
        } catch (errCreacion) {
          for (const reservaCreada of creadas) {
            try {
              await window.updateBookingStatus(reservaCreada.id, "Cancelado");
            } catch (errRollback) {
              console.error("No se pudo revertir la reserva", reservaCreada.id, errRollback);
            }
          }
          throw errCreacion;
        }
        const bookingResumen = {
          ...creadas[0],
          servicio: service.nombre,
          duracion: service.duracion,
          profesional_nombre: profesional.asignaciones.map((item) => `${item.servicio.nombre}: ${item.profesional.nombre}`).join(" | "),
          hora_inicio: time,
          hora_fin: cursor,
          reservas_relacionadas: creadas,
          _montoAnticipo: requiereAnticipo2 ? montoAnticipoReserva2 : 0
        };
        try {
          if (requiereAnticipo2) {
            if (window.notificarReservaPendiente) await window.notificarReservaPendiente(bookingResumen);
          } else {
            if (window.notificarNuevaReserva) await window.notificarNuevaReserva(bookingResumen);
          }
        } catch (errPosterior) {
          console.error("Reserva creada; falló la notificación al salón:", errPosterior);
        }
        onSubmit(bookingResumen);
        return;
      }
      const bookings = await getBookingsByDateAndProfesional(date, profesional.id);
      const baseSlots = [time];
      const available = filterAvailableSlots(baseSlots, service.duracion, bookings);
      if (available.length === 0) {
        setError(t("Ese horario ya no está disponible."));
        setSubmitting(false);
        return;
      }
      const endTime = calculateEndTime(time, service.duracion);
      const configNegocio = await window.cargarConfiguracionNegocio();
      const configGlobal = window.salonConfig ? await window.salonConfig.get() : {};
      const minAntelacionHoras = configGlobal?.min_antelacion_horas ?? 2;
      const montoAnticipoReserva = window.calcularMontoAnticipoReservaSync ? window.calcularMontoAnticipoReservaSync(configNegocio, service) : 0;
      const requiereAnticipo = configNegocio?.requiere_anticipo === true && (!configNegocio?.anticipos_por_servicio || montoAnticipoReserva > 0);
      const [year, month, day] = date.split("-").map(Number);
      const [hours, minutes] = time.split(":").map(Number);
      const fechaTurno = new Date(year, month - 1, day, hours, minutes, 0);
      const minFechaPermitida = new Date(Date.now() + minAntelacionHoras * 60 * 60 * 1e3);
      if (fechaTurno < minFechaPermitida) {
        setError(`Solo se puede reservar con al menos ${minAntelacionHoras} hora(s) de anticipación.`);
        setSubmitting(false);
        return;
      }
      const bookingData = {
        cliente_nombre: cliente.nombre,
        cliente_whatsapp: cliente.whatsapp,
        servicio: service.nombre,
        duracion: service.duracion,
        profesional_id: profesional.id,
        profesional_nombre: profesional.nombre,
        fecha: date,
        hora_inicio: time,
        hora_fin: endTime,
        estado: requiereAnticipo ? "Pendiente" : "Reservado"
      };
      const result = await createBooking(bookingData);
      if (result.success && result.data) {
        console.log(` ✅ Reserva creada en estado ${result.data.estado}`);
        try {
          if (requiereAnticipo) {
            if (window.notificarReservaPendiente) {
              await window.notificarReservaPendiente(result.data);
            }
            console.log(" 📱 Dueña notificada: RESERVA PENDIENTE DE PAGO (con datos + push)");
          } else {
            if (window.notificarNuevaReserva) {
              await window.notificarNuevaReserva(result.data);
            }
            console.log(" 📱 Dueña notificada: NUEVO TURNO AGENDADO (con push)");
          }
        } catch (errPosterior) {
          console.error("Reserva creada; falló la notificación al salón:", errPosterior);
        }
        onSubmit({ ...result.data, _montoAnticipo: requiereAnticipo ? montoAnticipoReserva : 0 });
      } else {
        setError(t("No se pudo guardar la reserva. Intenta de nuevo."));
      }
    } catch (err) {
      console.error("Error:", err);
      if (err && (err.code === "HORARIO_OCUPADO" || err.code === "CLIENTE_BLOQUEADO")) {
        setError(err.message);
      } else {
        setError(t("Ocurrió un error al guardar la reserva."));
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl space-y-6 border-2 border-pink-300" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center border-b border-pink-200 pb-4" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-pink-800 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "✨"), t("Confirmar Reserva")), /* @__PURE__ */ React.createElement("button", { onClick: onCancel, className: "text-pink-400 hover:text-pink-600" }, /* @__PURE__ */ React.createElement("i", { className: "icon-x text-2xl" }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-r from-pink-50 to-pink-100 p-4 rounded-xl border border-pink-200 space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 text-pink-700" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, service.nombre.toLowerCase().includes("corte") ? "💇‍♀️" : service.nombre.toLowerCase().includes("peinado") ? "💆‍♀️" : service.nombre.toLowerCase().includes("maquillaje") ? "💄" : service.nombre.toLowerCase().includes("pesta") ? "👁️" : "💅"), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, service.nombre)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 text-pink-700" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "👩‍🎨"), /* @__PURE__ */ React.createElement("span", null, t("Con:"), " ", /* @__PURE__ */ React.createElement("strong", null, profesional.nombre))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 text-pink-700" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "📅"), /* @__PURE__ */ React.createElement("span", null, window.formatFechaCompleta ? window.formatFechaCompleta(date) : date)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 text-pink-700" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "⏰"), /* @__PURE__ */ React.createElement("span", null, window.formatTo12Hour ? window.formatTo12Hour(time) : time, " (", service.duracion, " min)")), !service.esMultiple && window.formatearPrecioServicio && window.formatearPrecioServicio(service) && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 text-pink-700" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "💵"), /* @__PURE__ */ React.createElement("span", null, t("Precio:"), " ", /* @__PURE__ */ React.createElement("strong", null, window.formatearPrecioServicio(service)))), anticipoInfo?.requiere && anticipoInfo.monto > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 text-amber-700 bg-amber-50 -mx-2 px-2 py-1 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "💰"), /* @__PURE__ */ React.createElement("span", null, t("Anticipo para confirmar:"), " ", /* @__PURE__ */ React.createElement("strong", null, anticipoInfo.monto, " ", anticipoInfo.moneda)))), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-pink-50 p-3 rounded-lg border border-pink-200" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-700" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, t("Tus datos:")), " ", cliente.nombre, " - +", cliente.whatsapp)), error && /* @__PURE__ */ React.createElement("div", { className: "text-pink-600 text-sm bg-pink-100 p-3 rounded-lg flex items-start gap-2 border border-pink-300" }, /* @__PURE__ */ React.createElement("span", { className: "text-pink-500" }, "⚠️"), error), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "submit",
      disabled: submitting,
      className: "w-full py-3.5 rounded-xl font-bold transition-colors disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg",
      style: {
        background: submitting ? "linear-gradient(135deg, #5b21b6, #7c3aed)" : "linear-gradient(135deg, #5b21b6, #db2777)",
        color: "#fff",
        WebkitTextFillColor: "#fff",
        border: "1px solid rgba(91, 33, 182, 0.35)",
        opacity: 1
      }
    },
    submitting ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" }), t("Procesando...")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "✨"), t("Confirmar Reserva"), /* @__PURE__ */ React.createElement("span", null, "💅"))
  )))));
}
