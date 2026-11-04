function BookingForm({ service, profesional, date, time, onSubmit, onCancel, cliente, diseno }) {
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
        const moneda = window.getMonedaAnticipo ? window.getMonedaAnticipo(configNegocio, service) : window.getPreferenciasWhatsAppNegocio ? window.getPreferenciasWhatsAppNegocio().moneda || "" : "";
        if (vigente) setAnticipoInfo({ requiere, monto, moneda });
      } catch (e) {
      }
    };
    cargarAnticipo();
    return () => {
      vigente = false;
    };
  }, [service]);
  const [descuentoFidelidad, setDescuentoFidelidad] = React.useState(0);
  React.useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        if (!window.cargarTarjetaClienta || !cliente?.whatsapp) return;
        const configNegocio = await window.cargarConfiguracionNegocio();
        const tarjeta = await window.cargarTarjetaClienta(configNegocio, cliente);
        if (vigente && tarjeta && tarjeta.premiada && !tarjeta.pendientes) setDescuentoFidelidad(tarjeta.pct);
      } catch (e) {
      }
    })();
    return () => {
      vigente = false;
    };
  }, [cliente?.whatsapp]);
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
          const bookings2 = await getBookingsByDateAndProfesional(date, profesionalItem.id, servicioItem);
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
          const horarioPermitido = servicioPermiteHorario(servicioItem, String(cursor).slice(0, 5), diaSemana);
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
            estado: requiereAnticipo2 ? "Pendiente" : "Reservado",
            // Solo en el primer tramo del combo: si no, la agenda
            // repetiría la misma foto en cada servicio.
            diseno_titulo: index === 0 ? diseno?.titulo || null : null,
            diseno_imagen_url: index === 0 ? diseno?.imagen_url || null : null
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
          _montoAnticipo: requiereAnticipo2 ? montoAnticipoReserva2 : 0,
          _monedaAnticipo: window.getMonedaAnticipo ? window.getMonedaAnticipo(configNegocio2, service) : ""
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
      const bookings = await getBookingsByDateAndProfesional(date, profesional.id, service);
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
        estado: requiereAnticipo ? "Pendiente" : "Reservado",
        diseno_titulo: diseno?.titulo || null,
        diseno_imagen_url: diseno?.imagen_url || null
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
        onSubmit({ ...result.data, _montoAnticipo: requiereAnticipo ? montoAnticipoReserva : 0, _monedaAnticipo: window.getMonedaAnticipo ? window.getMonedaAnticipo(configNegocio, service) : "" });
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
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl space-y-6 border-2 border-pink-300" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center border-b border-pink-200 pb-4" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-pink-800" }, t("Confirmar Reserva")), /* @__PURE__ */ React.createElement("button", { onClick: onCancel, className: "text-pink-400 hover:text-pink-600" }, /* @__PURE__ */ React.createElement("i", { className: "icon-x text-2xl" }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-pink-200 px-4 divide-y divide-dashed divide-pink-200 text-sm" }, [
    [t("Servicio"), `${service.nombre} · ${service.duracion} min`],
    [t("Profesional"), profesional.nombre],
    [t("Fecha"), window.formatFechaCompleta ? window.formatFechaCompleta(date) : date],
    [t("Hora"), window.formatTo12Hour ? window.formatTo12Hour(time) : time],
    !service.esMultiple && window.formatearPrecioServicio && window.formatearPrecioServicio(service) ? [t("Precio"), window.formatearPrecioServicio(service)] : null
  ].filter(Boolean).map(([etiqueta, valor]) => /* @__PURE__ */ React.createElement("div", { key: etiqueta, className: "flex justify-between gap-4 py-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-500" }, etiqueta), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-gray-800 text-right" }, valor))), anticipoInfo?.requiere && anticipoInfo.monto > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-4 py-2.5 text-amber-800" }, /* @__PURE__ */ React.createElement("span", null, t("Anticipo para confirmar:")), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-right" }, anticipoInfo.monto, " ", anticipoInfo.moneda))), descuentoFidelidad > 0 && /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold" }, t("🎁 ¡Esta cita lleva {pct}% de descuento!", { pct: descuentoFidelidad })), /* @__PURE__ */ React.createElement("p", { className: "text-xs mt-0.5" }, t("Es tu premio de fidelidad: se aplica solo cuando te cobren."))), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500" }, t("Tus datos:"), " ", cliente.nombre, " · +", cliente.whatsapp), error && /* @__PURE__ */ React.createElement("div", { className: "text-pink-600 text-sm bg-pink-100 p-3 rounded-lg flex items-start gap-2 border border-pink-300" }, /* @__PURE__ */ React.createElement("span", { className: "text-pink-500" }, "⚠️"), error), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "submit",
      disabled: submitting,
      className: "w-full py-3.5 rounded-full font-bold text-lg transition-opacity disabled:cursor-not-allowed disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg",
      style: { background: "var(--brand-primary, #FF1493)", color: "#fff", WebkitTextFillColor: "#fff" }
    },
    submitting ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" }), t("Procesando...")) : t("Confirmar Reserva")
  )))));
}
