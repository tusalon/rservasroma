function AnadirServicioTurno({ turno, esAdmin = false, onCerrar, onListo, onError }) {
  window.useIdioma();
  const t = window.t;
  const [servicios, setServicios] = React.useState([]);
  const [cargandoServicios, setCargandoServicios] = React.useState(true);
  const [servicio, setServicio] = React.useState(null);
  const [sugerencias, setSugerencias] = React.useState([]);
  const [elegida, setElegida] = React.useState(null);
  const [buscando, setBuscando] = React.useState(false);
  const [mensaje, setMensaje] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);
  const fechaLegible = (fecha) => window.formatFechaCompleta ? window.formatFechaCompleta(fecha) : fecha;
  const horaLegible = (hora) => window.formatTo12Hour ? window.formatTo12Hour(hora) : hora;
  React.useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const actuales = new Set(turno.items.map((item) => window.turnos.normalizar(item.nombre)));
        const lista = window.salonServicios ? await window.salonServicios.getAll(true) : [];
        if (vigente) setServicios((lista || []).filter((candidato) => !actuales.has(window.turnos.normalizar(candidato.nombre))));
      } catch {
        if (vigente) setServicios([]);
      } finally {
        if (vigente) setCargandoServicios(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [turno]);
  const elegirServicio = async (nuevo) => {
    setServicio(nuevo);
    setSugerencias([]);
    setElegida(null);
    setMensaje("");
    setBuscando(true);
    try {
      const { sugerencias: encontradas, mensaje: aviso } = await window.turnos.sugerirParaServicio(turno, nuevo, { esAdmin });
      setSugerencias(encontradas);
      setMensaje(aviso);
      if (encontradas.length > 0) setElegida(encontradas[0]);
    } catch {
      setMensaje(t("Error cargando horarios."));
    } finally {
      setBuscando(false);
    }
  };
  const volverALaLista = () => {
    setServicio(null);
    setSugerencias([]);
    setElegida(null);
    setMensaje("");
  };
  const confirmar = async () => {
    if (!servicio || !elegida || guardando) return;
    setGuardando(true);
    try {
      await window.turnos.anadirServicio(turno, servicio, elegida, { esAdmin });
      await window.turnos.avisarCambio("Servicio añadido", [
        `Servicio añadido: ${servicio.nombre}`,
        `Cuándo: ${fechaLegible(elegida.fecha)} a las ${horaLegible(elegida.hora_inicio)}`,
        `Profesional: ${elegida.profesional_nombre || "No asignada"}`,
        `Su turno: ${turno.servicio}`
      ], turno);
      onListo && onListo({ servicio, sugerencia: elegida });
    } catch (error) {
      const claro = error && ["HORARIO_OCUPADO", "CLIENTE_BLOQUEADO"].includes(error.code);
      onError && onError(claro ? error.message : t("No se pudo añadir el servicio. Intenta de nuevo."));
      if (error && error.code === "HORARIO_OCUPADO") await elegirServicio(servicio);
    } finally {
      setGuardando(false);
    }
  };
  const etiquetas = { contigua: esAdmin ? t("Justo después de la cita") : t("Justo después de tu cita"), mismo_dia: t("Ese mismo día"), otro_dia: t("Otros días") };
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4", "data-name": "anadir-servicio-turno", "data-file": "components/AnadirServicioTurno.js" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "sticky top-0 bg-white border-b border-pink-100 p-4 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-bold text-pink-800" }, t("Añadir un servicio")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-500 truncate" }, fechaLegible(turno.fecha), " · ", turno.servicio)), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onCerrar,
      disabled: guardando,
      className: "w-9 h-9 shrink-0 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 disabled:opacity-50 text-lg"
    },
    "✕"
  )), /* @__PURE__ */ React.createElement("div", { className: "p-4 space-y-4" }, !servicio && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-700" }, esAdmin ? t("Elige el servicio que quieres añadir a este turno.") : t("Elige el servicio que quieres añadir a tu turno.")), cargandoServicios ? /* @__PURE__ */ React.createElement("div", { className: "flex justify-center py-6" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" })) : servicios.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "p-3 rounded-lg bg-pink-50 text-pink-700 border border-pink-100 text-sm" }, t("No hay más servicios para añadir.")) : /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, servicios.map((candidato) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: candidato.id,
      type: "button",
      onClick: () => elegirServicio(candidato),
      className: "w-full text-left p-3 rounded-lg border border-pink-200 bg-white hover:bg-pink-50 transition"
    },
    /* @__PURE__ */ React.createElement("p", { className: "font-medium text-pink-800" }, candidato.nombre),
    /* @__PURE__ */ React.createElement("p", { className: "text-xs text-pink-500 mt-0.5" }, candidato.duracion, " min", window.formatearPrecioServicio ? ` · ${window.formatearPrecioServicio(candidato)}` : "")
  )))), servicio && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-3 rounded-lg bg-pink-50 border border-pink-100 p-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-pink-800" }, servicio.nombre), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-pink-500" }, servicio.duracion, " min")), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: volverALaLista,
      disabled: guardando,
      className: "text-xs font-semibold text-pink-600 underline disabled:opacity-50"
    },
    t("Cambiar")
  )), buscando ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center py-6" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" }), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-500 mt-3" }, t("Buscando horarios..."))) : sugerencias.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "p-3 rounded-lg bg-pink-50 text-pink-700 border border-pink-100 text-sm" }, mensaje || t("No encontramos horarios libres en los próximos días. Escribe al salón.")) : /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, ["contigua", "mismo_dia", "otro_dia"].filter((tipo) => sugerencias.some((s) => s.tipo === tipo)).map((tipo) => /* @__PURE__ */ React.createElement("div", { key: tipo }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-pink-800 mb-2" }, etiquetas[tipo]), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, sugerencias.filter((s) => s.tipo === tipo).map((s) => {
    const activa = elegida && elegida.fecha === s.fecha && elegida.hora_inicio === s.hora_inicio && elegida.profesional_id === s.profesional_id;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: `${s.fecha}-${s.hora_inicio}-${s.profesional_id}`,
        type: "button",
        onClick: () => setElegida(s),
        className: `w-full text-left px-3 py-2 rounded-lg border text-sm ${activa ? "bg-pink-500 border-pink-500 text-white" : "bg-white border-pink-200 text-pink-800 hover:bg-pink-50"}`
      },
      /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, tipo === "otro_dia" ? `${fechaLegible(s.fecha)} · ` : "", horaLegible(s.hora_inicio)),
      s.profesional_nombre && /* @__PURE__ */ React.createElement("span", { className: activa ? "text-pink-100" : "text-pink-500" }, " · ", s.profesional_nombre)
    );
  })))))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onCerrar,
      disabled: guardando,
      className: "flex-1 py-2 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-50"
    },
    t("Cancelar")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: confirmar,
      disabled: guardando || !servicio || !elegida,
      className: "flex-1 py-2 rounded-full bg-pink-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    },
    guardando ? t("Guardando...") : t("Añadir este servicio")
  )))));
}
window.AnadirServicioTurno = AnadirServicioTurno;
