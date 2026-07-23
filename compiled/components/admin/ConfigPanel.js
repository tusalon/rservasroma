function ConfigPanel({ profesionalId, modoRestringido }) {
  const idioma = window.useIdioma();
  const t = window.t;
  const [profesionales, setProfesionales] = React.useState([]);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = React.useState(null);
  const [mostrarEditorPorDia, setMostrarEditorPorDia] = React.useState(false);
  const [configGlobal, setConfigGlobal] = React.useState({
    duracion_turnos: 60,
    intervalo_entre_turnos: 0,
    modo_24h: false,
    max_antelacion_dias: 30,
    min_antelacion_horas: 2,
    min_cancelacion_horas: 1
  });
  const [cargando, setCargando] = React.useState(true);
  const [nombreNegocio, setNombreNegocio] = React.useState("");
  React.useEffect(() => {
    if (window.getNombreNegocio) {
      window.getNombreNegocio().then((nombre) => {
        setNombreNegocio(nombre);
      });
    }
  }, []);
  const opcionesDuracion = [
    { value: 30, label: "30 min", icon: "⏱️" },
    { value: 45, label: "45 min", icon: "⏰" },
    { value: 60, label: "60 min", icon: "⌛" },
    { value: 75, label: "75 min", icon: "⏳" },
    { value: 90, label: "90 min", icon: "🕐" },
    { value: 120, label: "120 min", icon: "🕑" }
  ];
  const diasLabel = (n) => idioma === "en" ? `${n} day${n === 1 ? "" : "s"}` : `${n} día${n === 1 ? "" : "s"}`;
  const opcionesAntelacion = [
    { value: 3, label: diasLabel(3), icon: "🔜" },
    { value: 4, label: diasLabel(4), icon: "📅" },
    { value: 5, label: diasLabel(5), icon: "📆" },
    { value: 6, label: diasLabel(6), icon: "🗓️" },
    { value: 7, label: diasLabel(7), icon: "📆" },
    { value: 15, label: diasLabel(15), icon: "📅" },
    { value: 30, label: diasLabel(30), icon: "📅" },
    { value: 60, label: diasLabel(60), icon: "📆" },
    { value: 0, label: t("Indefinido"), icon: "∞" }
  ];
  React.useEffect(() => {
    cargarDatos();
  }, []);
  React.useEffect(() => {
    if (modoRestringido && profesionalId) {
      setProfesionalSeleccionado(profesionalId);
    }
  }, [modoRestringido, profesionalId]);
  const cargarDatos = async () => {
    setCargando(true);
    try {
      if (window.salonProfesionales) {
        const lista = await window.salonProfesionales.getAll(true);
        setProfesionales(lista || []);
        if (!modoRestringido && lista && lista.length > 0) {
          setProfesionalSeleccionado(lista[0].id);
        }
      }
      if (!modoRestringido && window.salonConfig) {
        const config = await window.salonConfig.get();
        setConfigGlobal(config || {
          duracion_turnos: 60,
          intervalo_entre_turnos: 0,
          modo_24h: false,
          max_antelacion_dias: 30,
          min_antelacion_horas: 2,
          min_cancelacion_horas: 1
        });
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setCargando(false);
    }
  };
  const abrirEditorPorDia = () => {
    if (!profesionalSeleccionado) {
      alert(t("Selecciona un profesional primero"));
      return;
    }
    setMostrarEditorPorDia(true);
  };
  const handleGuardarConfigGlobal = async () => {
    if (modoRestringido) return;
    try {
      await window.salonConfig.guardar(configGlobal);
      alert("✅ " + t("Configuración global guardada"));
    } catch (error) {
      alert(t("Error al guardar configuración global"));
    }
  };
  if (cargando) {
    return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6" }, /* @__PURE__ */ React.createElement("div", { className: "text-center py-12" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto" }), /* @__PURE__ */ React.createElement("p", { className: "text-gray-500 mt-4" }, t("Cargando configuración..."))));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold mb-6" }, modoRestringido ? "⚙️ " + t("Mi Configuración") : "⚙️ " + t("Configuración de {nombre}", { nombre: nombreNegocio })), !modoRestringido && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "mb-6 p-4 bg-gray-50 rounded-lg border" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-lg mb-4" }, "⚙️ ", t("Configuración General")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, t("Duración por defecto (min)")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-3 gap-2" }, opcionesDuracion.map((opcion) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: opcion.value,
      type: "button",
      onClick: () => setConfigGlobal({
        ...configGlobal,
        duracion_turnos: opcion.value
      }),
      className: `
                                                py-2 px-1 rounded-lg text-xs font-medium transition-all flex flex-col items-center
                                                ${configGlobal.duracion_turnos === opcion.value ? "bg-amber-600 text-white shadow-md ring-2 ring-amber-300" : "bg-white border border-gray-300 text-gray-700 hover:border-amber-400 hover:bg-amber-50"}
                                            `
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-lg mb-1" }, opcion.icon),
    /* @__PURE__ */ React.createElement("span", null, opcion.label)
  )))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Intervalo entre turnos (min)")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      value: configGlobal.intervalo_entre_turnos || 0,
      onChange: (e) => setConfigGlobal({
        ...configGlobal,
        intervalo_entre_turnos: parseInt(e.target.value) || 0
      }),
      className: "w-full border rounded-lg px-3 py-2 text-sm",
      min: "0",
      step: "5"
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, t("Antelacion maxima para reservar")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-4 sm:grid-cols-5 gap-2" }, opcionesAntelacion.map((opcion) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: opcion.value,
      type: "button",
      onClick: () => setConfigGlobal({
        ...configGlobal,
        max_antelacion_dias: opcion.value
      }),
      className: `
                                            py-2 px-1 rounded-lg text-xs font-medium transition-all flex flex-col items-center
                                            ${configGlobal.max_antelacion_dias === opcion.value ? "bg-amber-600 text-white shadow-md ring-2 ring-amber-300" : "bg-white border border-gray-300 text-gray-700 hover:border-amber-400 hover:bg-amber-50"}
                                        `
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-lg mb-1" }, opcion.icon),
    /* @__PURE__ */ React.createElement("span", null, opcion.label)
  )))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Antelacion minima para reservar (horas)")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      value: configGlobal.min_antelacion_horas ?? 2,
      onChange: (e) => setConfigGlobal({
        ...configGlobal,
        min_antelacion_horas: Math.max(0, parseInt(e.target.value) || 0)
      }),
      className: "w-full border rounded-lg px-3 py-2 text-sm",
      min: "0",
      step: "1"
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mt-1" }, t("Ej: 2 evita reservar turnos con menos de 2 horas."))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Antelacion minima para cancelar (horas)")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      value: configGlobal.min_cancelacion_horas ?? 1,
      onChange: (e) => setConfigGlobal({
        ...configGlobal,
        min_cancelacion_horas: Math.max(0, parseInt(e.target.value) || 0)
      }),
      className: "w-full border rounded-lg px-3 py-2 text-sm",
      min: "0",
      step: "1"
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mt-1" }, t("Ej: 1 evita cancelar cuando falta menos de 1 hora.")))), /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-3 cursor-pointer" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: configGlobal.modo_24h || false,
      onChange: (e) => setConfigGlobal({
        ...configGlobal,
        modo_24h: e.target.checked
      }),
      className: "w-5 h-5 text-amber-600"
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-gray-700" }, t("Modo 24 horas")))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleGuardarConfigGlobal,
      className: "bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition text-sm"
    },
    t("Guardar Configuración Global")
  )), /* @__PURE__ */ React.createElement(DiasCerradosGlobalesPanel, null)), /* @__PURE__ */ React.createElement("div", { className: "mb-6 p-4 border rounded-lg bg-white shadow-sm mt-6" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-lg mb-4" }, "👥 ", t("Configuración del Profesional")), !modoRestringido && /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, t("Seleccionar Profesional")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "select",
    {
      value: profesionalSeleccionado || "",
      onChange: (e) => setProfesionalSeleccionado(parseInt(e.target.value)),
      className: "flex-1 border rounded-lg px-3 py-2"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, t("Seleccione un profesional")),
    profesionales.map((p) => /* @__PURE__ */ React.createElement("option", { key: p.id, value: p.id }, p.nombre))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: abrirEditorPorDia,
      disabled: !profesionalSeleccionado,
      className: "bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
    },
    t("Horarios por día")
  )), profesionales.length === 0 && !cargando && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-amber-600 mt-2" }, "⚠️ ", t("No hay profesionales activos."))), modoRestringido && profesionalId && /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: abrirEditorPorDia,
      className: "w-full bg-amber-600 text-white px-4 py-3 rounded-lg hover:bg-amber-700 font-medium"
    },
    t("Configurar mis horarios por día")
  )), profesionalSeleccionado && /* @__PURE__ */ React.createElement(
    FechasLibresPanel,
    {
      profesionalId: profesionalSeleccionado,
      profesionales,
      onActualizar: cargarDatos
    }
  )), mostrarEditorPorDia && profesionalSeleccionado && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" }, /* @__PURE__ */ React.createElement(
    HorariosPorDiaPanel,
    {
      profesionalId: profesionalSeleccionado,
      profesionalNombre: profesionales.find((p) => p.id === profesionalSeleccionado)?.nombre || "Profesional",
      onGuardar: (horarios) => {
        setMostrarEditorPorDia(false);
      },
      onCancelar: () => setMostrarEditorPorDia(false)
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "px-6 pb-6" }, /* @__PURE__ */ React.createElement(
    HorariosExcepcionPanel,
    {
      profesionalId: profesionalSeleccionado,
      profesionalNombre: profesionales.find((p) => p.id === profesionalSeleccionado)?.nombre || "Profesional",
      onCerrar: () => setMostrarEditorPorDia(false)
    }
  )))));
}
function FechasLibresPanel({ profesionalId, profesionales, onActualizar }) {
  window.useIdioma();
  const t = window.t;
  const [fechas, setFechas] = React.useState([]);
  const [nuevaFecha, setNuevaFecha] = React.useState("");
  const profesional = profesionales.find((p) => p.id === profesionalId);
  React.useEffect(() => {
    if (profesional) {
      setFechas(profesional.fechas_libres || []);
    }
  }, [profesionalId, profesional]);
  const handleAgregar = async () => {
    if (!nuevaFecha) return;
    if (fechas.includes(nuevaFecha)) {
      alert(t("Esta fecha ya está en la lista de días libres"));
      return;
    }
    const nuevasFechas = [...fechas, nuevaFecha].sort();
    setFechas(nuevasFechas);
    setNuevaFecha("");
    await guardarFechas(nuevasFechas);
  };
  const handleEliminar = async (fechaAEliminar) => {
    const nuevasFechas = fechas.filter((f) => f !== fechaAEliminar);
    setFechas(nuevasFechas);
    await guardarFechas(nuevasFechas);
  };
  const guardarFechas = async (nuevasFechas) => {
    try {
      if (window.salonProfesionales && window.salonProfesionales.actualizar) {
        await window.salonProfesionales.actualizar(profesionalId, { fechas_libres: nuevasFechas });
        if (onActualizar) onActualizar();
      }
    } catch (error) {
      console.error("Error al guardar fechas libres:", error);
      alert(t("Error al guardar la fecha."));
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "mt-6 p-4 bg-orange-50 rounded-lg border border-orange-100" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-lg text-orange-800 mb-2 flex items-center gap-2" }, "✈️ ", t("Días Libres / Vacaciones de {nombre}", { nombre: profesional?.nombre })), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-orange-600 mb-4" }, t("El profesional NO recibirá turnos estos días.")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap sm:flex-nowrap gap-2 mb-4" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: nuevaFecha,
      onChange: (e) => setNuevaFecha(e.target.value),
      className: "border border-orange-200 rounded-lg px-3 py-2 text-sm flex-1 focus:ring-orange-500"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleAgregar,
      disabled: !nuevaFecha,
      className: "bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
    },
    "+ ",
    t("Agregar")
  )), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 max-h-48 overflow-y-auto pr-1" }, fechas.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 italic bg-white p-3 rounded text-center border" }, t("No hay días libres programados.")) : fechas.map((fecha) => /* @__PURE__ */ React.createElement("div", { key: fecha, className: "flex justify-between items-center bg-white p-2 rounded border border-orange-100 shadow-sm" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-700 ml-2" }, window.formatFechaCompleta ? window.formatFechaCompleta(fecha) : fecha), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleEliminar(fecha),
      className: "text-red-500 hover:bg-red-50 px-3 py-1 rounded transition"
    },
    "🗑️"
  )))));
}
function DiasCerradosGlobalesPanel() {
  window.useIdioma();
  const t = window.t;
  const [dias, setDias] = React.useState([]);
  const [fecha, setFecha] = React.useState("");
  const [motivo, setMotivo] = React.useState("");
  const [cargando, setCargando] = React.useState(true);
  const getNegocioId = () => {
    const localId = localStorage.getItem("negocioId");
    if (localId) return localId;
    if (window.NEGOCIO_ID_POR_DEFECTO) return window.NEGOCIO_ID_POR_DEFECTO;
    if (typeof window.getNegocioId === "function") return window.getNegocioId();
    return null;
  };
  const cargarDias = async () => {
    setCargando(true);
    try {
      const negocioId = getNegocioId();
      if (!negocioId || !window.SUPABASE_URL) {
        setCargando(false);
        return;
      }
      const response = await fetch(
        `${window.SUPABASE_URL}/rest/v1/dias_cerrados?negocio_id=eq.${negocioId}&order=fecha.asc`,
        {
          headers: {
            "apikey": window.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        const hoy = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const diasFuturos = (data || []).filter((d) => d.fecha >= hoy);
        setDias(diasFuturos);
      }
    } catch (error) {
      console.error("Error cargando días cerrados:", error);
    } finally {
      setCargando(false);
    }
  };
  React.useEffect(() => {
    cargarDias();
    const handleActualizacion = () => cargarDias();
    window.addEventListener("diasCerradosActualizados", handleActualizacion);
    return () => {
      window.removeEventListener("diasCerradosActualizados", handleActualizacion);
    };
  }, []);
  const handleAgregar = async () => {
    if (!fecha) {
      alert(t("Por favor, seleccioná una fecha."));
      return;
    }
    const negocioId = getNegocioId();
    if (!negocioId) {
      alert(t("Error: No se pudo identificar el negocio"));
      return;
    }
    try {
      const response = await fetch(
        `${window.SUPABASE_URL}/rest/v1/dias_cerrados`,
        {
          method: "POST",
          headers: {
            "apikey": window.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify({
            negocio_id: negocioId,
            fecha,
            motivo: motivo || t("Cerrado por feriado/descanso")
          })
        }
      );
      if (response.ok) {
        setFecha("");
        setMotivo("");
        cargarDias();
        if (window.dispatchEvent) {
          window.dispatchEvent(new Event("diasCerradosActualizados"));
        }
      } else {
        const error = await response.text();
        console.error("Error al agregar:", error);
        alert(t("Error al agregar el día cerrado. Verificá tu conexión."));
      }
    } catch (error) {
      console.error("Error:", error);
      alert(t("Error al conectar con el servidor"));
    }
  };
  const handleEliminar = async (id) => {
    if (!confirm(t("¿Seguro que quieres volver a abrir el local este día?"))) return;
    try {
      const response = await fetch(
        `${window.SUPABASE_URL}/rest/v1/dias_cerrados?id=eq.${id}`,
        {
          method: "DELETE",
          headers: {
            "apikey": window.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
          }
        }
      );
      if (response.ok) {
        cargarDias();
        if (window.dispatchEvent) {
          window.dispatchEvent(new Event("diasCerradosActualizados"));
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-red-50 rounded-lg border border-red-200" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-lg text-red-800 mb-2 flex items-center gap-2" }, "🚫 ", t("Días Cerrados del Local")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-red-600 mb-4" }, t("El local completo estará cerrado estos días."), " ", /* @__PURE__ */ React.createElement("b", null, t("Ningún profesional")), " ", t("recibirá turnos.")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row gap-2 mb-4 bg-white p-3 rounded shadow-sm border border-red-100" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: fecha,
      onChange: (e) => setFecha(e.target.value),
      className: "border rounded-lg px-3 py-2 text-sm focus:ring-red-500",
      min: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: motivo,
      onChange: (e) => setMotivo(e.target.value),
      placeholder: t("Motivo (ej: Feriado Nacional)"),
      className: "border rounded-lg px-3 py-2 text-sm flex-1 focus:ring-red-500"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleAgregar,
      disabled: !fecha,
      className: "bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
    },
    t("Cerrar Local")
  )), cargando ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 text-center py-2" }, t("Cargando...")) : /* @__PURE__ */ React.createElement("div", { className: "space-y-2 max-h-48 overflow-y-auto" }, dias.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 italic bg-white p-3 rounded text-center border" }, t("El local no tiene días de cierre global programados.")) : dias.map((d) => /* @__PURE__ */ React.createElement("div", { key: d.id, className: "flex justify-between items-center bg-white p-3 rounded border border-red-100 shadow-sm" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-gray-800" }, window.formatFechaCompleta ? window.formatFechaCompleta(d.fecha) : d.fecha), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500" }, d.motivo)), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleEliminar(d.id),
      className: "text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded transition"
    },
    t("Abrir Local")
  )))));
}
