function Calendar({ onDateSelect, selectedDate, profesional, profesionalCompleto, service, onHorariosCargados }) {
  const idioma = window.useIdioma();
  const t = window.t;
  const [currentDate, setCurrentDate] = React.useState(/* @__PURE__ */ new Date());
  const [diasCerrados, setDiasCerrados] = React.useState([]);
  const [cargandoHorarios, setCargandoHorarios] = React.useState(false);
  const [fechasLibresProfesional, setFechasLibresProfesional] = React.useState([]);
  const [horariosPorDia, setHorariosPorDia] = React.useState({});
  const [descansosPorDia, setDescansosPorDia] = React.useState({});
  const [fechasConHorariosConfigurados, setFechasConHorariosConfigurados] = React.useState([]);
  const [fechasSinDisponibilidad, setFechasSinDisponibilidad] = React.useState([]);
  const [cargandoDisponibilidad, setCargandoDisponibilidad] = React.useState(false);
  const [disponibilidadVerificada, setDisponibilidadVerificada] = React.useState(false);
  const [minAntelacionHoras, setMinAntelacionHoras] = React.useState(2);
  const [maxAntelacionDias, setMaxAntelacionDias] = React.useState(30);
  const [libresPorFecha, setLibresPorFecha] = React.useState({});
  const [vistaMes, setVistaMes] = React.useState(false);
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = String(timeStr || "00:00").split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const getNegocioIdLocal = () => {
    if (typeof window.getNegocioIdFromConfig === "function") return window.getNegocioIdFromConfig();
    if (typeof window.getNegocioId === "function") return window.getNegocioId();
    return localStorage.getItem("negocioId");
  };
  const getReservasPorFechaProfesional = async (negocioId, profesionalId, fechaInicio, fechaFin, servicio) => {
    const response = await fetch(
      `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=gte.${fechaInicio}&fecha=lte.${fechaFin}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=fecha,hora_inicio,hora_fin`,
      {
        headers: {
          "apikey": window.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
        }
      }
    );
    const propias = response.ok ? await response.json() : [];
    const reservas = await window.espacios?.reservasConEspacios(profesionalId, fechaInicio, fechaFin, propias, null, servicio) ?? propias;
    return (reservas || []).reduce((acc, reserva) => {
      if (!acc[reserva.fecha]) acc[reserva.fecha] = [];
      acc[reserva.fecha].push(reserva);
      return acc;
    }, {});
  };
  const slotDisponible = ({ slotStr, duracion, descansosDelDia, reservasDia, fechaHoraSlot, minFechaPermitida }) => {
    const slotStart = timeToMinutes(slotStr);
    const slotEnd = slotStart + (parseInt(duracion, 10) || 60);
    if (fechaHoraSlot < minFechaPermitida) return false;
    if (slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) return false;
    return !reservasDia.some((reserva) => {
      const reservaStart = timeToMinutes(reserva.hora_inicio);
      const reservaEnd = timeToMinutes(reserva.hora_fin);
      return slotStart < reservaEnd && slotEnd > reservaStart;
    });
  };
  React.useEffect(() => {
    if (!profesional) return;
    const cargarDisponibilidad = async () => {
      setCargandoHorarios(true);
      try {
        const config = window.salonConfig ? await window.salonConfig.get() : {};
        setMinAntelacionHoras(config?.min_antelacion_horas ?? 2);
        setMaxAntelacionDias(config?.max_antelacion_dias ?? 30);
        const horarios = await window.salonConfig.getHorariosProfesional(profesional.id);
        const porDia = horarios.horariosPorDia || {};
        const descansos = window.salonConfig.getDescansosPorDia ? await window.salonConfig.getDescansosPorDia(profesional.id) : {};
        setHorariosPorDia(porDia);
        setDescansosPorDia(descansos || {});
        if (onHorariosCargados) onHorariosCargados(porDia);
        const diasCerradosList = await window.getDiasCerrados();
        setDiasCerrados((diasCerradosList || []).map((d) => d.fecha));
        setFechasLibresProfesional(profesional.fechas_libres || []);
        await verificarDisponibilidadMes(porDia, descansos || {}, config);
      } catch (error) {
        console.error("Error cargando disponibilidad:", error);
        setDiasCerrados([]);
        setFechasLibresProfesional([]);
        setHorariosPorDia({});
        setDescansosPorDia({});
      } finally {
        setCargandoHorarios(false);
      }
    };
    cargarDisponibilidad();
    const handleActualizacion = () => cargarDisponibilidad();
    window.addEventListener("diasCerradosActualizados", handleActualizacion);
    return () => {
      window.removeEventListener("diasCerradosActualizados", handleActualizacion);
    };
  }, [profesional, service]);
  React.useEffect(() => {
    if (Object.keys(horariosPorDia).length > 0) {
      verificarDisponibilidadMes(horariosPorDia, descansosPorDia);
    }
  }, [currentDate, service]);
  React.useEffect(() => {
    if (!selectedDate || cargandoDisponibilidad || !disponibilidadVerificada) return;
  }, [selectedDate, fechasSinDisponibilidad, cargandoDisponibilidad, disponibilidadVerificada]);
  const peticionMesRef = React.useRef(0);
  const verificarDisponibilidadMes = async (horarios, descansos = {}, configOverride = null) => {
    if (!service || !profesional) {
      setFechasSinDisponibilidad([]);
      setDisponibilidadVerificada(false);
      return;
    }
    const miPeticion = ++peticionMesRef.current;
    setCargandoDisponibilidad(true);
    setDisponibilidadVerificada(false);
    try {
      const negocioId = getNegocioIdLocal();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const diasEnMes = new Date(year, month + 1, 0).getDate();
      const fechaInicio = formatDate(new Date(year, month, 1));
      const fechaFin = formatDate(new Date(year, month + 1, 0));
      const minHoras = configOverride?.min_antelacion_horas ?? minAntelacionHoras;
      const maxDias = configOverride?.max_antelacion_dias ?? maxAntelacionDias;
      const asignacionesMultiples = service?.esMultiple && profesionalCompleto?.esMultiple ? profesionalCompleto.asignaciones || [] : [];
      const fechasDelMes = [];
      for (let d = 1; d <= diasEnMes; d++) {
        fechasDelMes.push(formatDate(new Date(year, month, d)));
      }
      const datosMultiples = asignacionesMultiples.length > 0 ? await Promise.all(asignacionesMultiples.map(async (item) => {
        const [reservasItem, horariosPorFechaItem] = await Promise.all([
          getReservasPorFechaProfesional(negocioId, item.profesional.id, fechaInicio, fechaFin, item.servicio),
          window.salonConfig.getHorariosProfesionalParaFechas(item.profesional.id, fechasDelMes)
        ]);
        return { ...item, reservasPorFecha: reservasItem || {}, horariosPorFecha: horariosPorFechaItem || {} };
      })) : [];
      const [reservasPorFecha, horariosPorFechaProfesional] = asignacionesMultiples.length > 0 ? [{}, {}] : await Promise.all([
        getReservasPorFechaProfesional(negocioId, profesional.id, fechaInicio, fechaFin, service),
        window.salonConfig.getHorariosProfesionalParaFechas(profesional.id, fechasDelMes)
      ]);
      const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
      const sinDisponibilidad = [];
      const conHorariosConfigurados = [];
      const libres = {};
      const ahora = /* @__PURE__ */ new Date();
      const minFechaPermitida = new Date(Date.now() + minHoras * 60 * 60 * 1e3);
      for (let d = 1; d <= diasEnMes; d++) {
        const fecha = new Date(year, month, d);
        const fechaStr = formatDate(fecha);
        const diaSemana = diasSemana[fecha.getDay()];
        const diffDias = Math.ceil((/* @__PURE__ */ new Date(`${fechaStr}T00:00:00`) - /* @__PURE__ */ new Date(formatDate(ahora) + "T00:00:00")) / (1e3 * 60 * 60 * 24));
        const horariosFecha = horariosPorFechaProfesional[fechaStr] || {};
        const horariosFechaPorDia = horariosFecha.horariosPorDia || {};
        const descansosFechaPorDia = horariosFecha.descansosPorDia || {};
        let baseSlots = (horariosFechaPorDia[diaSemana] || []).map(indiceToHoraLegible);
        if (!service?.esMultiple && servicioRestringeHorarios(service, diaSemana)) {
          baseSlots = baseSlots.filter((slot) => servicioPermiteHorario(service, slot, diaSemana));
        }
        if (Number(maxDias) > 0 && diffDias > Number(maxDias)) {
          sinDisponibilidad.push(fechaStr);
          continue;
        }
        if (datosMultiples.length === 0 && baseSlots.length === 0) {
          sinDisponibilidad.push(fechaStr);
          continue;
        }
        let tieneHorarioFuturo = false;
        let huecos = 0;
        if (datosMultiples.length > 0) {
          const primerItem = datosMultiples[0];
          const primerHorario = primerItem.horariosPorFecha[fechaStr] || {};
          baseSlots = ((primerHorario.horariosPorDia || {})[diaSemana] || []).map(indiceToHoraLegible);
          if (servicioRestringeHorarios(primerItem.servicio, diaSemana)) {
            baseSlots = baseSlots.filter((slot) => servicioPermiteHorario(primerItem.servicio, slot, diaSemana));
          }
          if (baseSlots.length === 0) {
            sinDisponibilidad.push(fechaStr);
            continue;
          }
          conHorariosConfigurados.push(fechaStr);
          for (const slotStr of baseSlots) {
            let cursor = timeToMinutes(slotStr);
            const fechaHoraSlot = new Date(year, month, d, Math.floor(cursor / 60), cursor % 60, 0);
            if (fechaHoraSlot < minFechaPermitida) continue;
            if (primerServicioSinHorario(datosMultiples.map((item) => item.servicio), cursor, diaSemana)) continue;
            let slotCompletoDisponible = true;
            for (const item of datosMultiples) {
              const horarioItem = item.horariosPorFecha[fechaStr] || {};
              const horariosItemPorDia = horarioItem.horariosPorDia || {};
              const descansosItemPorDia = horarioItem.descansosPorDia || {};
              const duracion = parseInt(item.servicio?.duracion, 10) || 60;
              const inicio = cursor;
              const fin = inicio + duracion;
              const slotsDia = horariosItemPorDia[diaSemana] || [];
              if (slotsDia.length === 0 || slotTieneDescanso(inicio, fin, descansosItemPorDia[diaSemana] || [])) {
                slotCompletoDisponible = false;
                break;
              }
              const conflicto = (item.reservasPorFecha[fechaStr] || []).some((reserva) => {
                const reservaStart = timeToMinutes(reserva.hora_inicio);
                const reservaEnd = timeToMinutes(reserva.hora_fin);
                return inicio < reservaEnd && fin > reservaStart;
              });
              if (conflicto) {
                slotCompletoDisponible = false;
                break;
              }
              cursor = fin;
            }
            if (slotCompletoDisponible) huecos++;
          }
          tieneHorarioFuturo = huecos > 0;
        } else {
          conHorariosConfigurados.push(fechaStr);
          huecos = baseSlots.filter((slotStr) => {
            const slotStart = timeToMinutes(slotStr);
            const fechaHoraSlot = new Date(year, month, d, Math.floor(slotStart / 60), slotStart % 60, 0);
            return slotDisponible({
              slotStr,
              duracion: service.duracion,
              slotsDia: baseSlots,
              descansosDelDia: descansosFechaPorDia[diaSemana] || [],
              reservasDia: reservasPorFecha[fechaStr] || [],
              fechaHoraSlot,
              minFechaPermitida
            });
          }).length;
          tieneHorarioFuturo = huecos > 0;
        }
        libres[fechaStr] = huecos;
        if (!tieneHorarioFuturo) {
          sinDisponibilidad.push(fechaStr);
        }
      }
      if (peticionMesRef.current !== miPeticion) return;
      setFechasSinDisponibilidad(sinDisponibilidad);
      setFechasConHorariosConfigurados(conHorariosConfigurados);
      setLibresPorFecha(libres);
      setDisponibilidadVerificada(true);
    } catch (error) {
      console.error("Error verificando disponibilidad real del mes:", error);
      if (peticionMesRef.current !== miPeticion) return;
      setFechasSinDisponibilidad([]);
      setDisponibilidadVerificada(true);
    } finally {
      if (peticionMesRef.current === miPeticion) setCargandoDisponibilidad(false);
    }
  };
  const isPastDate = (date) => {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };
  const esDiaCerrado = (date) => diasCerrados.includes(formatDate(date));
  const esDiaLibreProfesional = (date) => (fechasLibresProfesional || []).includes(formatDate(date));
  const esDiaSinDisponibilidad = (date) => fechasSinDisponibilidad.includes(formatDate(date));
  const estaDentroDeAntelacion = (date) => {
    if (Number(maxAntelacionDias) <= 0) return true;
    const hoy2 = /* @__PURE__ */ new Date();
    hoy2.setHours(0, 0, 0, 0);
    const fecha = new Date(date);
    fecha.setHours(0, 0, 0, 0);
    const diffDias = Math.ceil((fecha - hoy2) / (1e3 * 60 * 60 * 24));
    return diffDias <= Number(maxAntelacionDias);
  };
  const tieneHorariosConfigurados = (date) => {
    return fechasConHorariosConfigurados.includes(formatDate(date));
  };
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days2 = [];
    for (let i = 0; i < firstDay.getDay(); i++) days2.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days2.push(new Date(year, month, i));
    return days2;
  };
  const days = getDaysInMonth();
  const monthNames = idioma === "en" ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] : ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  if (cargandoHorarios) {
    return /* @__PURE__ */ React.createElement("div", { className: "space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-pink-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "📅"), t("3. Selecciona una fecha"), profesional && /* @__PURE__ */ React.createElement("span", { className: "text-sm bg-pink-100 text-pink-700 px-3 py-1 rounded-full ml-2" }, t("con {nombre}", { nombre: profesional.nombre }))), /* @__PURE__ */ React.createElement("div", { className: "text-center py-8" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-8 w-8 border-b-2 border-pink-500 rounded-full mx-auto" }), /* @__PURE__ */ React.createElement("p", { className: "text-pink-400 mt-4" }, t("Cargando disponibilidad..."))));
  }
  const estadoDia = (date) => {
    const past = isPastDate(date);
    const cerrado = esDiaCerrado(date);
    const diaLibreProfesional = esDiaLibreProfesional(date);
    const sinDisponibilidad = esDiaSinDisponibilidad(date);
    const tieneHorarios = tieneHorariosConfigurados(date);
    const dentroDeAntelacion = estaDentroDeAntelacion(date);
    const verificado = disponibilidadVerificada && !cargandoDisponibilidad;
    const posible = !past && !cerrado && !diaLibreProfesional && dentroDeAntelacion;
    return {
      // Lleno pero con horarios: se elige para ver la lista de espera.
      lleno: verificado && posible && sinDisponibilidad && tieneHorarios,
      libre: verificado && posible && !sinDisponibilidad && tieneHorarios,
      // Mientras se verifica, los candidatos se ven "cargando", no vacíos:
      // si se pintan igual, la clienta cree que no hay nada y se va.
      verificando: !verificado && posible,
      libres: libresPorFecha[formatDate(date)] || 0
    };
  };
  const diaCorto = idioma === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const hoy = /* @__PURE__ */ new Date();
  const limiteDias = Number(maxAntelacionDias) > 0 ? Number(maxAntelacionDias) : 90;
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + limiteDias);
  const meses = [];
  for (let m = new Date(hoy.getFullYear(), hoy.getMonth(), 1); m <= ultimoDia && meses.length < 6; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    meses.push(m);
  }
  const esMesActual = (m) => m.getFullYear() === currentDate.getFullYear() && m.getMonth() === currentDate.getMonth();
  const diasTira = days.filter(Boolean).map((date) => ({ date, ...estadoDia(date) })).filter((d) => d.libre || d.lleno || d.verificando);
  const primerLibre = diasTira.find((d) => d.libre);
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-pink-700 flex items-center gap-2 flex-wrap" }, t("3. Selecciona una fecha"), profesional && /* @__PURE__ */ React.createElement("span", { className: "text-sm bg-pink-100 text-pink-700 px-3 py-1 rounded-full" }, t("con {nombre}", { nombre: profesional.nombre }))), primerLibre && !selectedDate && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => onDateSelect(formatDate(primerLibre.date)),
      className: "w-full flex items-center gap-3 rounded-2xl bg-gray-900 text-white p-4 text-left shadow-md"
    },
    /* @__PURE__ */ React.createElement("span", { className: "w-10 h-10 shrink-0 rounded-xl bg-pink-500 flex items-center justify-center text-lg" }, "⚡"),
    /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "block font-bold" }, t("Lo antes posible")), /* @__PURE__ */ React.createElement("span", { className: "block text-sm text-white/75" }, diaCorto[primerLibre.date.getDay()], " ", primerLibre.date.getDate(), " · ", t("{n} libre{s}", { n: primerLibre.libres, s: primerLibre.libres === 1 ? "" : "s" })))
  ), meses.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto pb-1" }, meses.map((m) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: m.getTime(),
      type: "button",
      onClick: () => setCurrentDate(m),
      className: `whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors
                                ${esMesActual(m) ? "bg-gray-900 text-white" : "bg-white text-gray-600 shadow-sm"}`
    },
    monthNames[m.getMonth()]
  ))), !vistaMes ? diasTira.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 bg-white/80 rounded-xl p-4 text-center" }, t("No quedan días con horarios este mes. Prueba con el mes siguiente.")) : /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" }, diasTira.map((d) => {
    const dateStr = formatDate(d.date);
    const selected = selectedDate === dateStr;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: dateStr,
        type: "button",
        onClick: () => !d.verificando && onDateSelect(dateStr),
        disabled: d.verificando,
        className: `shrink-0 w-[4.5rem] rounded-2xl py-2.5 text-center transition-colors
                                        ${selected ? "bg-pink-500 text-white shadow-md" : d.verificando ? "bg-gray-100 text-gray-400 animate-pulse" : d.lleno ? "bg-white/70 text-gray-500 border border-gray-200" : "bg-white text-gray-800 shadow-sm"}`
      },
      /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] font-bold uppercase tracking-wide opacity-80" }, diaCorto[d.date.getDay()]),
      /* @__PURE__ */ React.createElement("span", { className: "block text-2xl font-extrabold leading-tight" }, d.date.getDate()),
      /* @__PURE__ */ React.createElement("span", { className: `block text-[11px] font-bold whitespace-nowrap ${selected ? "text-white" : d.lleno ? "text-gray-500" : "text-green-700"}` }, d.verificando ? "…" : d.lleno ? t("Lleno") : t("{n} libre{s}", { n: d.libres, s: d.libres === 1 ? "" : "s" }))
    );
  })) : /* @__PURE__ */ React.createElement("div", { className: "bg-white/90 rounded-2xl shadow-sm p-3" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-7 mb-1 text-center" }, (idioma === "en" ? ["S", "M", "T", "W", "T", "F", "S"] : ["D", "L", "M", "M", "J", "V", "S"]).map((d, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "text-xs font-semibold text-gray-500 py-1" }, d))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-7 gap-1" }, days.map((date, idx) => {
    if (!date) return /* @__PURE__ */ React.createElement("div", { key: idx });
    const d = estadoDia(date);
    const dateStr = formatDate(date);
    const selected = selectedDate === dateStr;
    const tocable = d.libre || d.lleno;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: idx,
        type: "button",
        onClick: () => tocable && onDateSelect(dateStr),
        disabled: !tocable,
        className: `relative aspect-square rounded-xl text-sm font-bold flex items-center justify-center
                                        ${selected ? "bg-pink-500 text-white" : d.verificando ? "bg-gray-100 text-gray-400 animate-pulse" : d.libre ? "bg-white text-gray-800 shadow-sm" : d.lleno ? "text-gray-500 line-through" : "text-gray-300"}`
      },
      date.getDate(),
      d.libre && !selected && /* @__PURE__ */ React.createElement("span", { className: "absolute bottom-1 w-1.5 h-1.5 rounded-full bg-green-600" })
    );
  }))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-3 text-xs text-gray-500" }, /* @__PURE__ */ React.createElement("span", null, vistaMes ? t("Punto verde: hay huecos. Tachado: lleno.") : t("Desliza para ver más días.")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setVistaMes(!vistaMes), className: "font-bold text-pink-600 whitespace-nowrap py-1" }, vistaMes ? t("Ver tira de días") : t("Ver mes completo"))));
}
