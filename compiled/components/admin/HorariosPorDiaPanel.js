function HorariosPorDiaPanel({ profesionalId, profesionalNombre, onGuardar, onCancelar }) {
  const idioma = window.useIdioma();
  const t = window.t;
  const [horariosPorDia, setHorariosPorDia] = React.useState({});
  const [descansosPorDia, setDescansosPorDia] = React.useState({});
  const [cargando, setCargando] = React.useState(true);
  const [diaSeleccionado, setDiaSeleccionado] = React.useState("lunes");
  const [horasDisponibles, setHorasDisponibles] = React.useState([]);
  const [nuevoDescanso, setNuevoDescanso] = React.useState({ inicio: "13:00", fin: "14:00" });
  const formatearHora = (hora) => window.formatTo12Hour ? window.formatTo12Hour(hora) : hora;
  const dias = idioma === "en" ? [
    { id: "lunes", nombre: "Monday" },
    { id: "martes", nombre: "Tuesday" },
    { id: "miercoles", nombre: "Wednesday" },
    { id: "jueves", nombre: "Thursday" },
    { id: "viernes", nombre: "Friday" },
    { id: "sabado", nombre: "Saturday" },
    { id: "domingo", nombre: "Sunday" }
  ] : [
    { id: "lunes", nombre: "Lunes" },
    { id: "martes", nombre: "Martes" },
    { id: "miercoles", nombre: "Miércoles" },
    { id: "jueves", nombre: "Jueves" },
    { id: "viernes", nombre: "Viernes" },
    { id: "sabado", nombre: "Sábado" },
    { id: "domingo", nombre: "Domingo" }
  ];
  const todasLasHoras = React.useMemo(() => {
    const horas = [];
    for (let i = 0; i < 48; i++) {
      const hora = Math.floor(i / 2);
      const minutos = i % 2 === 0 ? "00" : "30";
      horas.push({
        indice: i,
        legible: `${hora.toString().padStart(2, "0")}:${minutos}`,
        label: formatearHora(`${hora.toString().padStart(2, "0")}:${minutos}`)
      });
    }
    return horas;
  }, []);
  React.useEffect(() => {
    if (profesionalId) {
      cargarHorarios();
    }
  }, [profesionalId]);
  const cargarHorarios = async () => {
    setCargando(true);
    try {
      const horarios = await window.salonConfig.getHorariosPorDia(profesionalId);
      const descansos = window.salonConfig.getDescansosPorDia ? await window.salonConfig.getDescansosPorDia(profesionalId) : {};
      console.log("📋 Horarios cargados por día:", horarios);
      const horariosInicializados = {};
      const descansosInicializados = {};
      dias.forEach((dia) => {
        horariosInicializados[dia.id] = horarios[dia.id] || [];
        descansosInicializados[dia.id] = descansos[dia.id] || [];
      });
      setHorariosPorDia(horariosInicializados);
      setDescansosPorDia(descansosInicializados);
      setHorasDisponibles(horariosInicializados[diaSeleccionado] || []);
    } catch (error) {
      console.error("Error cargando horarios:", error);
      alert(t("Error al cargar horarios"));
    } finally {
      setCargando(false);
    }
  };
  const handleDiaChange = (diaId) => {
    setDiaSeleccionado(diaId);
    setHorasDisponibles(horariosPorDia[diaId] || []);
  };
  const toggleHora = (indice) => {
    const nuevasHoras = [...horariosPorDia[diaSeleccionado] || []];
    if (nuevasHoras.includes(indice)) {
      const index = nuevasHoras.indexOf(indice);
      nuevasHoras.splice(index, 1);
    } else {
      nuevasHoras.push(indice);
      nuevasHoras.sort((a, b) => a - b);
    }
    const nuevosHorarios = {
      ...horariosPorDia,
      [diaSeleccionado]: nuevasHoras
    };
    setHorariosPorDia(nuevosHorarios);
    setHorasDisponibles(nuevasHoras);
  };
  const toggleTodasLasHoras = () => {
    const horasActuales = horariosPorDia[diaSeleccionado] || [];
    if (horasActuales.length === todasLasHoras.length) {
      const nuevosHorarios = {
        ...horariosPorDia,
        [diaSeleccionado]: []
      };
      setHorariosPorDia(nuevosHorarios);
      setHorasDisponibles([]);
    } else {
      const todas = todasLasHoras.map((h) => h.indice);
      const nuevosHorarios = {
        ...horariosPorDia,
        [diaSeleccionado]: todas
      };
      setHorariosPorDia(nuevosHorarios);
      setHorasDisponibles(todas);
    }
  };
  const copiarHorarios = (desdeDia) => {
    const horasACopiar = horariosPorDia[desdeDia] || [];
    const nuevosHorarios = {
      ...horariosPorDia,
      [diaSeleccionado]: [...horasACopiar]
    };
    setHorariosPorDia(nuevosHorarios);
    setHorasDisponibles(horasACopiar);
  };
  const limpiarDia = () => {
    const nuevosHorarios = {
      ...horariosPorDia,
      [diaSeleccionado]: []
    };
    setHorariosPorDia(nuevosHorarios);
    setHorasDisponibles([]);
  };
  const agregarDescanso = () => {
    if (!nuevoDescanso.inicio || !nuevoDescanso.fin) return;
    if (nuevoDescanso.inicio >= nuevoDescanso.fin) {
      alert(t("La hora de inicio del descanso debe ser menor que la hora final."));
      return;
    }
    const descansosActuales = descansosPorDia[diaSeleccionado] || [];
    setDescansosPorDia({
      ...descansosPorDia,
      [diaSeleccionado]: [...descansosActuales, { ...nuevoDescanso }]
    });
  };
  const eliminarDescanso = (index) => {
    const descansosActuales = descansosPorDia[diaSeleccionado] || [];
    setDescansosPorDia({
      ...descansosPorDia,
      [diaSeleccionado]: descansosActuales.filter((_, i) => i !== index)
    });
  };
  const handleGuardar = async () => {
    try {
      await window.salonConfig.guardarHorariosPorDia(profesionalId, horariosPorDia, descansosPorDia);
      onGuardar(horariosPorDia);
    } catch (error) {
      console.error("Error guardando:", error);
    }
  };
  if (cargando) {
    return /* @__PURE__ */ React.createElement("div", { className: "text-center py-8" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" }), /* @__PURE__ */ React.createElement("p", { className: "text-gray-500 mt-2" }, t("Cargando horarios...")));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold mb-4" }, "📅 ", t("Horarios de {nombre} por día", { nombre: profesionalNombre })), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "md:col-span-1 space-y-2" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-700 mb-2" }, t("Días de la semana")), dias.map((dia) => {
    const cantidadHoras = horariosPorDia[dia.id]?.length || 0;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: dia.id,
        onClick: () => handleDiaChange(dia.id),
        className: `
                                    w-full text-left px-4 py-3 rounded-lg transition-all
                                    ${diaSeleccionado === dia.id ? "bg-amber-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
                                `
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("span", null, dia.nombre), cantidadHoras > 0 && /* @__PURE__ */ React.createElement("span", { className: `
                                            text-xs px-2 py-1 rounded-full
                                            ${diaSeleccionado === dia.id ? "bg-amber-500 text-white" : "bg-gray-300 text-gray-700"}
                                        ` }, t("{n} hs", { n: cantidadHoras })))
    );
  })), /* @__PURE__ */ React.createElement("div", { className: "md:col-span-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-4" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-700" }, t("Horas para {dia}", { dia: dias.find((d) => d.id === diaSeleccionado)?.nombre }), horasDisponibles.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "ml-2 text-sm text-amber-600" }, "(", t("{n} horarios", { n: horasDisponibles.length }), ")")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: toggleTodasLasHoras,
      className: "px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
    },
    horasDisponibles.length === todasLasHoras.length ? t("Quitar todas") : t("Agregar todas")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: limpiarDia,
      className: "px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
    },
    t("Limpiar día")
  ))), /* @__PURE__ */ React.createElement("div", { className: "mb-4 p-3 bg-gray-50 rounded-lg flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm text-gray-600" }, t("Copiar horarios de:")), /* @__PURE__ */ React.createElement(
    "select",
    {
      onChange: (e) => copiarHorarios(e.target.value),
      className: "border rounded-lg px-2 py-1 text-sm",
      value: ""
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, t("Seleccionar día")),
    dias.filter((d) => d.id !== diaSeleccionado).map((dia) => /* @__PURE__ */ React.createElement("option", { key: dia.id, value: dia.id }, dia.nombre, " (", t("{n} hs", { n: horariosPorDia[dia.id]?.length || 0 }), ")"))
  )), /* @__PURE__ */ React.createElement("div", { className: "mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200" }, /* @__PURE__ */ React.createElement("h5", { className: "font-medium text-amber-800 mb-3" }, t("Descansos / almuerzo")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 mb-3" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "time",
      value: nuevoDescanso.inicio,
      onChange: (e) => setNuevoDescanso({ ...nuevoDescanso, inicio: e.target.value }),
      className: "border rounded-lg px-3 py-2 text-sm"
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "time",
      value: nuevoDescanso.fin,
      onChange: (e) => setNuevoDescanso({ ...nuevoDescanso, fin: e.target.value }),
      className: "border rounded-lg px-3 py-2 text-sm"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: agregarDescanso,
      className: "bg-amber-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-amber-700"
    },
    t("Agregar")
  )), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, (descansosPorDia[diaSeleccionado] || []).length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-700" }, t("Sin descansos para este dia.")) : (descansosPorDia[diaSeleccionado] || []).map((descanso, index) => /* @__PURE__ */ React.createElement("div", { key: `${descanso.inicio}-${descanso.fin}-${index}`, className: "flex justify-between items-center bg-white border border-amber-100 rounded-lg px-3 py-2 text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-700" }, formatearHora(descanso.inicio), " - ", formatearHora(descanso.fin)), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => eliminarDescanso(index),
      className: "text-red-600 hover:text-red-800"
    },
    t("Quitar")
  ))))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-96 overflow-y-auto p-2 border rounded-lg" }, todasLasHoras.map((hora) => {
    const activa = horasDisponibles.includes(hora.indice);
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: hora.indice,
        onClick: () => toggleHora(hora.indice),
        className: `
                                        px-2 py-1 text-xs font-medium rounded transition-all
                                        ${activa ? "bg-amber-600 text-white shadow-md hover:bg-amber-700" : "bg-white border border-gray-300 text-gray-700 hover:border-amber-400 hover:bg-amber-50"}
                                    `
      },
      hora.label
    );
  })), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mt-2" }, "⏰ ", t("Horarios cada 30 minutos. Selecciona las horas en las que {nombre} trabaja este día.", { nombre: profesionalNombre })))), /* @__PURE__ */ React.createElement("div", { className: "mt-6 pt-4 border-t" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-700 mb-3" }, t("Resumen semanal:")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2" }, dias.map((dia) => {
    const cantidad = horariosPorDia[dia.id]?.length || 0;
    return /* @__PURE__ */ React.createElement("div", { key: dia.id, className: "text-center p-2 bg-gray-50 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500" }, dia.nombre.substring(0, 3)), /* @__PURE__ */ React.createElement("div", { className: `font-bold ${cantidad > 0 ? "text-amber-600" : "text-gray-400"}` }, t("{n} hs", { n: cantidad })));
  }))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 mt-6" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onCancelar,
      className: "px-4 py-2 border rounded-lg hover:bg-gray-100"
    },
    t("Cancelar")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleGuardar,
      className: "px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
    },
    t("Guardar Horarios")
  )));
}
