Object.assign(window.__I18N_EN__ = window.__I18N_EN__ || {}, {
  "Opciones avanzadas": "Advanced options",
  "Espacios del salón": "Salon spaces",
  "Úsalo si tu salón tiene sillas, cabinas o puestos limitados y varias profesionales comparten algunos.": "Use it if your salon has a limited number of chairs, rooms or stations that several professionals share.",
  "Activar espacios": "Turn on spaces",
  "¿Cuántos espacios hay?": "How many spaces are there?",
  "Espacio {n}": "Space {n}",
  "Marca a qué espacios puede ir cada profesional. Si una profesional no tiene ninguno marcado, no tiene restricción.": "Mark which spaces each professional can use. A professional with none marked has no restriction.",
  "Sin espacios marcados": "No spaces marked",
  "Guardar espacios": "Save spaces",
  "Esta opción todavía no está activada en la base de datos. Avisa a soporte.": "This option is not yet enabled in the database. Contact support.",
  "Espacios guardados.": "Spaces saved.",
  "No se pudieron guardar los espacios.": "The spaces could not be saved.",
  "Estas citas ya coincidían en el tiempo y no caben en los espacios; siguen en tu agenda sin espacio:": "These bookings already overlapped and do not fit in the spaces; they stay in your calendar without a space:",
  "Con la función activada, una cita ocupa un espacio mientras dura. Si todos los espacios de la profesional están ocupados, ese horario no se ofrece.": "With this on, a booking uses a space while it lasts. If all of the professional's spaces are taken, that time is not offered."
});
function EspaciosPanel() {
  const idioma = window.useIdioma();
  const t = window.t;
  const [estado, setEstado] = React.useState("cargando");
  const [activo, setActivo] = React.useState(false);
  const [cantidad, setCantidad] = React.useState(3);
  const [profesionales, setProfesionales] = React.useState([]);
  const [marcados, setMarcados] = React.useState({});
  const [guardando, setGuardando] = React.useState(false);
  const cabeceras = () => ({ apikey: window.SUPABASE_ANON_KEY, Authorization: `Bearer ${window.SUPABASE_ANON_KEY}` });
  const cargar = async () => {
    setEstado("cargando");
    try {
      const id = window.getNegocioId();
      const [resConfig, resProf] = await Promise.all([
        fetch(`${window.SUPABASE_URL}/rest/v1/configuracion?negocio_id=eq.${id}&select=espacios_activos,espacios_cantidad`, { headers: cabeceras() }),
        fetch(`${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${id}&activo=eq.true&select=id,nombre,espacios&order=id.asc`, { headers: cabeceras() })
      ]);
      if (!resConfig.ok || !resProf.ok) {
        setEstado("noActivada");
        return;
      }
      const cfg = (await resConfig.json())[0] || {};
      const profs = await resProf.json();
      setActivo(!!cfg.espacios_activos);
      setCantidad(Math.max(1, parseInt(cfg.espacios_cantidad, 10) || 3));
      setProfesionales(profs || []);
      const inicial = {};
      (profs || []).forEach((p) => {
        inicial[p.id] = Array.isArray(p.espacios) ? p.espacios : [];
      });
      setMarcados(inicial);
      setEstado("listo");
    } catch (error) {
      console.error("Espacios: no se pudo cargar", error);
      setEstado("noActivada");
    }
  };
  React.useEffect(() => {
    cargar();
  }, []);
  const alternar = (profesionalId, n) => {
    const actuales = marcados[profesionalId] || [];
    const nuevos = actuales.includes(n) ? actuales.filter((x) => x !== n) : [...actuales, n].sort((a, b) => a - b);
    setMarcados({ ...marcados, [profesionalId]: nuevos });
  };
  const guardar = async () => {
    setGuardando(true);
    try {
      const total2 = Math.min(20, Math.max(1, parseInt(cantidad, 10) || 1));
      for (const p of profesionales) {
        const validos = (marcados[p.id] || []).filter((n) => n >= 1 && n <= total2);
        await window.espacios.guardarEspaciosProfesional(p.id, validos);
      }
      await window.espacios.guardarConfig(activo, total2);
      let aviso = t("Espacios guardados.");
      if (activo) {
        const { sinCupo } = await window.espacios.asignarCitasFuturas();
        if (sinCupo && sinCupo.length) {
          aviso += "\n\n" + t("Estas citas ya coincidían en el tiempo y no caben en los espacios; siguen en tu agenda sin espacio:") + "\n• " + sinCupo.map((c) => `${c.fecha} ${String(c.hora_inicio).slice(0, 5)} · ${c.cliente_nombre || ""}`).join("\n• ");
        }
      }
      setCantidad(total2);
      alert(aviso);
    } catch (error) {
      console.error("Espacios: no se pudo guardar", error);
      alert(t("No se pudieron guardar los espacios."));
    } finally {
      setGuardando(false);
    }
  };
  const total = Math.min(20, Math.max(1, parseInt(cantidad, 10) || 1));
  return /* @__PURE__ */ React.createElement("details", { className: "mt-6 border rounded-xl bg-white shadow-sm" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer select-none px-4 py-3 text-sm text-gray-500" }, t("Opciones avanzadas")), /* @__PURE__ */ React.createElement("div", { className: "px-4 pb-4" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-lg mb-1" }, t("Espacios del salón")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mb-4" }, t("Úsalo si tu salón tiene sillas, cabinas o puestos limitados y varias profesionales comparten algunos.")), estado === "cargando" && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500" }, t("Cargando configuración...")), estado === "noActivada" && /* @__PURE__ */ React.createElement("p", { role: "alert", className: "text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3" }, t("Esta opción todavía no está activada en la base de datos. Avisa a soporte.")), estado === "listo" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-3 cursor-pointer mb-3" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: activo, onChange: (e) => setActivo(e.target.checked), className: "w-5 h-5" }), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-gray-700" }, t("Activar espacios"))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mb-4" }, t("Con la función activada, una cita ocupa un espacio mientras dura. Si todos los espacios de la profesional están ocupados, ese horario no se ofrece.")), activo && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("¿Cuántos espacios hay?")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      min: "1",
      max: "20",
      value: cantidad,
      onChange: (e) => setCantidad(e.target.value),
      className: "w-24 border rounded-lg px-3 py-2 text-sm mb-4"
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mb-2" }, t("Marca a qué espacios puede ir cada profesional. Si una profesional no tiene ninguno marcado, no tiene restricción.")), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 mb-4" }, profesionales.map((p) => {
    const suyos = (marcados[p.id] || []).filter((n) => n <= total);
    return /* @__PURE__ */ React.createElement("div", { key: p.id, className: "border rounded-lg p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold mb-2" }, p.nombre, suyos.length === 0 && /* @__PURE__ */ React.createElement("span", { className: "ml-2 text-xs font-normal text-gray-400" }, t("Sin espacios marcados"))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, Array.from({ length: total }, (_, i) => i + 1).map((n) => /* @__PURE__ */ React.createElement("label", { key: n, className: `px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${suyos.includes(n) ? "bg-amber-600 text-white border-amber-600" : "bg-white text-gray-700"}` }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", className: "sr-only", checked: suyos.includes(n), onChange: () => alternar(p.id, n) }), t("Espacio {n}", { n })))));
  }))), /* @__PURE__ */ React.createElement("button", { onClick: guardar, disabled: guardando, className: "bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition text-sm disabled:opacity-50" }, guardando ? t("Guardando...") : t("Guardar espacios")))));
}
window.EspaciosPanel = EspaciosPanel;
