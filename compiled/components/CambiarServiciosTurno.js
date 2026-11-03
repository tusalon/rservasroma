function CambiarServiciosTurno({ turno, esAdmin = false, onCerrar, onListo, onError }) {
  window.useIdioma();
  const t = window.t;
  const turnos = window.turnos;
  const [servicios, setServicios] = React.useState([]);
  const [profesionalesTodas, setProfesionalesTodas] = React.useState([]);
  const [porServicio, setPorServicio] = React.useState({});
  const [entradas, setEntradas] = React.useState([]);
  const [cargando, setCargando] = React.useState(true);
  const [fecha, setFecha] = React.useState(turno.fecha);
  const [hora, setHora] = React.useState(String(turno.hora_inicio).slice(0, 5));
  const [horas, setHoras] = React.useState([]);
  const [buscando, setBuscando] = React.useState(false);
  const [mensaje, setMensaje] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);
  const [reintento, setReintento] = React.useState(0);
  const consulta = React.useRef(0);
  const clave = React.useRef(0);
  const fechaLegible = (f) => window.formatFechaCompleta ? window.formatFechaCompleta(f) : f;
  const horaLegible = (h) => window.formatTo12Hour ? window.formatTo12Hour(h) : h;
  const hoy = (() => {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const porNombre = (lista, nombre) => lista.find((s) => turnos.normalizar(s.nombre) === turnos.normalizar(nombre));
  const profesionalesDe = async (servicio) => {
    if (!servicio) return profesionalesTodas;
    if (porServicio[servicio.id]) return porServicio[servicio.id];
    let lista = [];
    try {
      lista = (await (window.getProfesionalesPorServicio ? window.getProfesionalesPorServicio(servicio.id) : []) || []).filter((p) => p && p.activo !== false);
    } catch {
      lista = [];
    }
    if (!lista.length) lista = profesionalesTodas;
    setPorServicio((actual) => ({ ...actual, [servicio.id]: lista }));
    return lista;
  };
  React.useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const lista = (window.salonServicios ? await window.salonServicios.getAll(true) : []) || [];
        const todas = ((window.salonProfesionales ? await window.salonProfesionales.getAll() : []) || []).filter((p) => p && p.activo !== false);
        const mapa = {};
        for (const servicio of lista) {
          if (!turno.filas.some((f) => turnos.normalizar(f.servicio) === turnos.normalizar(servicio.nombre))) continue;
          try {
            mapa[servicio.id] = (await (window.getProfesionalesPorServicio ? window.getProfesionalesPorServicio(servicio.id) : []) || []).filter((p) => p && p.activo !== false);
          } catch {
            mapa[servicio.id] = [];
          }
          if (!mapa[servicio.id].length) mapa[servicio.id] = todas;
        }
        if (!vigente) return;
        setServicios(lista);
        setProfesionalesTodas(todas);
        setPorServicio(mapa);
        const ordenadas = [...turno.filas].sort((a, b) => turnos.aMin(a.hora_inicio) - turnos.aMin(b.hora_inicio));
        setEntradas(ordenadas.map((fila) => {
          const servicio = porNombre(lista, fila.servicio);
          return {
            clave: ++clave.current,
            filaId: fila.id,
            nombre: fila.servicio,
            servicioId: servicio ? servicio.id : null,
            duracion: turnos.duracionDeFila(fila),
            profesional_id: fila.profesional_id,
            profesional_nombre: fila.profesional_nombre || fila.trabajador_nombre || ""
          };
        }));
      } catch {
        if (vigente) onError && onError(t("Error cargando horarios."));
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [turno]);
  const completas = entradas.length > 0 && entradas.every((e) => e.nombre && e.profesional_id);
  const paraGuardar = entradas.map((e) => ({ filaId: e.filaId, nombre: e.nombre, duracion: e.duracion, profesional_id: e.profesional_id, profesional_nombre: e.profesional_nombre }));
  const firma = paraGuardar.map((e) => `${e.filaId || "n"}:${e.nombre}:${e.duracion}:${e.profesional_id}`).join("|") + `@${fecha}`;
  React.useEffect(() => {
    if (cargando || !completas || !fecha) {
      setHoras([]);
      return void 0;
    }
    const mia = ++consulta.current;
    setBuscando(true);
    const espera = setTimeout(async () => {
      try {
        const resultado = await turnos.horasParaReorganizar(turno, paraGuardar, fecha, { esAdmin });
        if (mia !== consulta.current) return;
        setHoras(resultado.horas);
        setMensaje(resultado.mensaje || "");
        setHora((actual) => resultado.horas.includes(actual) ? actual : "");
      } catch {
        if (mia === consulta.current) {
          setHoras([]);
          setMensaje(t("Error cargando horarios."));
        }
      } finally {
        if (mia === consulta.current) setBuscando(false);
      }
    }, 250);
    return () => clearTimeout(espera);
  }, [firma, cargando, reintento]);
  const cambiarEntrada = (claveEntrada, parche) => setEntradas((lista) => lista.map((e) => e.clave === claveEntrada ? { ...e, ...parche } : e));
  const elegirServicio = async (entrada, servicioId) => {
    const servicio = servicios.find((s) => String(s.id) === String(servicioId));
    if (!servicio) return;
    const opciones = await profesionalesDe(servicio);
    const mantiene = opciones.find((p) => String(p.id) === String(entrada.profesional_id));
    const quien = mantiene || opciones[0] || null;
    cambiarEntrada(entrada.clave, {
      nombre: servicio.nombre,
      servicioId: servicio.id,
      duracion: parseInt(servicio.duracion, 10) || 60,
      profesional_id: quien ? quien.id : "",
      profesional_nombre: quien ? quien.nombre : ""
    });
  };
  const elegirProfesional = (entrada, profesionalId, opciones) => {
    const quien = opciones.find((p) => String(p.id) === String(profesionalId));
    cambiarEntrada(entrada.clave, { profesional_id: quien ? quien.id : "", profesional_nombre: quien ? quien.nombre : "" });
  };
  const mover = (indice, delta) => setEntradas((lista) => {
    const destino = indice + delta;
    if (destino < 0 || destino >= lista.length) return lista;
    const copia = [...lista];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    return copia;
  });
  const quitar = (claveEntrada) => setEntradas((lista) => lista.length > 1 ? lista.filter((e) => e.clave !== claveEntrada) : lista);
  const anadir = () => setEntradas((lista) => [...lista, { clave: ++clave.current, filaId: null, nombre: "", servicioId: null, duracion: 0, profesional_id: "", profesional_nombre: "" }]);
  const inicioActual = String(turno.hora_inicio).slice(0, 5);
  const plan = completas ? turnos.planReorganizar(turno, paraGuardar, { fecha, inicio: hora || inicioActual }) : null;
  const hayCambios = !!plan && (!plan.sinCambios || fecha !== turno.fecha || hora && hora !== inicioActual);
  const totalMin = entradas.reduce((total, e) => total + (parseInt(e.duracion, 10) || 0), 0);
  const guardar = async () => {
    if (!completas || !hora || guardando || !hayCambios) return;
    setGuardando(true);
    try {
      const aplicado = await turnos.reorganizarTurno(turno, paraGuardar, { fecha, hora, esAdmin });
      await turnos.avisarCambio("Cita modificada", [
        `Antes: ${turno.servicio}`,
        `Ahora: ${paraGuardar.map((e) => `${e.nombre}${e.profesional_nombre ? ` (${e.profesional_nombre})` : ""}`).join(" + ")}`,
        `Cuándo: ${fechaLegible(fecha)} a las ${horaLegible(hora)}`
      ], turno);
      onListo && onListo(aplicado);
    } catch (error) {
      const claro = error && ["HORARIO_OCUPADO", "CLIENTE_BLOQUEADO", "SIN_SERVICIOS"].includes(error.code);
      onError && onError(claro ? error.message : t("No se pudo guardar el cambio. Intenta de nuevo."));
      if (error && error.code === "HORARIO_OCUPADO") setReintento((n) => n + 1);
    } finally {
      setGuardando(false);
    }
  };
  const campo = "w-full border border-pink-200 rounded-lg px-3 py-2 bg-white text-sm text-pink-900 disabled:opacity-50";
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4", "data-name": "cambiar-servicios-turno", "data-file": "components/CambiarServiciosTurno.js" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "sticky top-0 z-10 bg-white border-b border-pink-100 p-4 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-bold text-pink-800" }, t("Cambiar servicios o profesionales")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-500 truncate" }, fechaLegible(turno.fecha), " · ", horaLegible(inicioActual))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onCerrar,
      disabled: guardando,
      "aria-label": t("Cerrar"),
      className: "w-9 h-9 shrink-0 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 disabled:opacity-50 text-lg"
    },
    "✕"
  )), /* @__PURE__ */ React.createElement("div", { className: "p-4 space-y-4" }, cargando ? /* @__PURE__ */ React.createElement("div", { className: "flex justify-center py-8" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" })) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-700" }, t("Cambia un servicio por otro, quién lo hace o el orden. También puedes añadir o quitar servicios.")), /* @__PURE__ */ React.createElement("ul", { className: "space-y-3" }, entradas.map((entrada, indice) => {
    const servicio = servicios.find((s) => String(s.id) === String(entrada.servicioId));
    const opciones = servicio ? porServicio[servicio.id] || profesionalesTodas : profesionalesTodas;
    const sinLista = entrada.nombre && !servicio;
    return /* @__PURE__ */ React.createElement("li", { key: entrada.clave, className: "rounded-xl border border-pink-200 bg-pink-50/40 p-3 space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-pink-600" }, t("Servicio {n}", { n: indice + 1 }), entrada.duracion ? ` · ${entrada.duracion} min` : ""), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => mover(indice, -1),
        disabled: indice === 0 || guardando,
        "aria-label": t("Subir"),
        className: "w-8 h-8 rounded-full bg-white border border-pink-200 text-pink-600 disabled:opacity-30"
      },
      "↑"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => mover(indice, 1),
        disabled: indice === entradas.length - 1 || guardando,
        "aria-label": t("Bajar"),
        className: "w-8 h-8 rounded-full bg-white border border-pink-200 text-pink-600 disabled:opacity-30"
      },
      "↓"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => quitar(entrada.clave),
        disabled: entradas.length <= 1 || guardando,
        "aria-label": t("Quitar"),
        className: "w-8 h-8 rounded-full bg-white border border-red-200 text-red-600 disabled:opacity-30"
      },
      "✕"
    ))), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: servicio ? String(servicio.id) : sinLista ? "__actual" : "",
        disabled: guardando,
        onChange: (e) => e.target.value && e.target.value !== "__actual" && elegirServicio(entrada, e.target.value),
        className: campo
      },
      !entrada.nombre && /* @__PURE__ */ React.createElement("option", { value: "" }, t("Elige un servicio")),
      sinLista && /* @__PURE__ */ React.createElement("option", { value: "__actual" }, entrada.nombre),
      servicios.map((s) => /* @__PURE__ */ React.createElement("option", { key: s.id, value: String(s.id) }, s.nombre, " · ", s.duracion, " min"))
    ), entrada.nombre && /* @__PURE__ */ React.createElement(
      "select",
      {
        value: entrada.profesional_id ? String(entrada.profesional_id) : "",
        disabled: guardando,
        onChange: (e) => elegirProfesional(entrada, e.target.value, opciones),
        className: campo
      },
      !entrada.profesional_id && /* @__PURE__ */ React.createElement("option", { value: "" }, t("Elige quién lo hace")),
      opciones.map((p) => /* @__PURE__ */ React.createElement("option", { key: p.id, value: String(p.id) }, p.nombre)),
      entrada.profesional_id && !opciones.some((p) => String(p.id) === String(entrada.profesional_id)) && /* @__PURE__ */ React.createElement("option", { value: String(entrada.profesional_id) }, entrada.profesional_nombre)
    ));
  })), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: anadir, disabled: guardando, className: "text-sm font-semibold text-pink-600 underline disabled:opacity-50" }, "➕ ", t("Añadir otro servicio")), /* @__PURE__ */ React.createElement("div", { className: "rounded-lg bg-pink-50 border border-pink-100 px-3 py-2 text-sm text-pink-800" }, t("Duración total: {min} min", { min: totalMin }), plan && hora && /* @__PURE__ */ React.createElement("span", null, " · ", t("Termina a las {hora}", { hora: horaLegible(plan.fin) }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-pink-800" }, t("Día y hora")), /* @__PURE__ */ React.createElement("input", { type: "date", value: fecha, min: hoy, disabled: guardando, onChange: (e) => {
    setFecha(e.target.value);
    setHora("");
  }, className: campo }), buscando ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-sm text-pink-500 py-2" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500" }), t("Buscando horarios...")) : !completas ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-600" }, t("Elige el servicio y quién lo hace para ver las horas.")) : horas.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "p-3 rounded-lg bg-pink-50 text-pink-700 border border-pink-100 text-sm" }, mensaje || t("No hay horarios disponibles para esa fecha.")) : /* @__PURE__ */ React.createElement(React.Fragment, null, !hora && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-600" }, t("A la hora de antes no cabe la cita con estos cambios. Elige otra hora.")), /* @__PURE__ */ React.createElement("div", { className: "grid gap-2", style: { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" } }, horas.map((h) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: h,
      type: "button",
      onClick: () => setHora(h),
      disabled: guardando,
      "aria-pressed": hora === h,
      className: `py-2 rounded-lg text-sm font-medium ${hora === h ? "bg-pink-500 text-white" : "bg-pink-50 text-pink-700 hover:bg-pink-100"}`
    },
    horaLegible(h)
  )))))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-2" }, /* @__PURE__ */ React.createElement("button", { onClick: onCerrar, disabled: guardando, className: "flex-1 py-2 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-50" }, t("Cancelar")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: guardar,
      disabled: guardando || cargando || !completas || !hora || !hayCambios,
      className: "flex-1 py-2 rounded-full bg-pink-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    },
    guardando ? t("Guardando...") : hayCambios ? t("Guardar cambios") : t("Sin cambios")
  )))));
}
window.__I18N_EN__ = window.__I18N_EN__ || {};
Object.assign(window.__I18N_EN__, {
  "Cambiar servicios o profesionales": "Change services or professionals",
  "Cambia un servicio por otro, quién lo hace o el orden. También puedes añadir o quitar servicios.": "Swap a service for another, change who does it or the order. You can also add or remove services.",
  "Servicio {n}": "Service {n}",
  "Elige un servicio": "Choose a service",
  "Elige quién lo hace": "Choose who does it",
  "Subir": "Move up",
  "Bajar": "Move down",
  "Añadir otro servicio": "Add another service",
  "Duración total: {min} min": "Total duration: {min} min",
  "Termina a las {hora}": "Ends at {hora}",
  "Día y hora": "Day and time",
  "Elige el servicio y quién lo hace para ver las horas.": "Choose the service and who does it to see the times.",
  "A la hora de antes no cabe la cita con estos cambios. Elige otra hora.": "The appointment does not fit at the earlier time with these changes. Choose another time.",
  "Guardar cambios": "Save changes",
  "Sin cambios": "No changes",
  "Cita modificada.": "Appointment updated.",
  "Cita modificada correctamente.": "Appointment updated."
});
window.CambiarServiciosTurno = CambiarServiciosTurno;
