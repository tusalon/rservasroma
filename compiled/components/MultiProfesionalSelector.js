function MultiProfesionalSelector({ selectedService, selectedProfesional, onSelect }) {
  window.useIdioma();
  const t = window.t;
  const servicios = selectedService?.servicios || [];
  const [opciones, setOpciones] = React.useState({});
  const [seleccion, setSeleccion] = React.useState(selectedProfesional?.asignaciones || []);
  const [cargando, setCargando] = React.useState(true);
  React.useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const entradas = await Promise.all(servicios.map(async (servicio) => {
          const profesionales = await window.getProfesionalesPorServicio?.(servicio.id);
          return [servicio.id, profesionales || []];
        }));
        setOpciones(Object.fromEntries(entradas));
      } catch (error) {
        console.error("Error cargando profesionales por servicio:", error);
        setOpciones({});
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [selectedService]);
  React.useEffect(() => {
    if (seleccion.length === servicios.length && servicios.length > 0) {
      onSelect({
        esMultiple: true,
        nombre: t("Varios profesionales"),
        asignaciones: servicios.map((servicio) => {
          const item = seleccion.find((s) => s.servicio.id === servicio.id);
          return item;
        }).filter(Boolean)
      });
    } else {
      onSelect(null);
    }
  }, [seleccion]);
  const elegir = (servicio, profesional) => {
    setSeleccion((prev) => [
      ...prev.filter((item) => item.servicio.id !== servicio.id),
      { servicio, profesional }
    ]);
  };
  if (cargando) {
    return /* @__PURE__ */ React.createElement("div", { className: "space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-pink-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "✨"), t("2. Elige profesional por servicio")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-center py-8" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" })));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-pink-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "✨"), t("2. Elige profesional por servicio"), seleccion.length === servicios.length && /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2" }, t("Completo"))), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, servicios.map((servicio, index) => {
    const profesionales = opciones[servicio.id] || [];
    const elegido = seleccion.find((item) => item.servicio.id === servicio.id)?.profesional;
    return /* @__PURE__ */ React.createElement("div", { key: servicio.id, className: "bg-white/90 border border-pink-200 rounded-xl p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-3 mb-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-pink-800" }, index + 1, ". ", servicio.nombre), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-pink-500" }, servicio.duracion, " min · ", window.formatearPrecioServicio ? window.formatearPrecioServicio(servicio) : `$${servicio.precio}`)), elegido && /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full" }, elegido.nombre)), profesionales.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-sm bg-pink-50 border border-pink-200 rounded-lg p-3 space-y-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-pink-700" }, t('"{servicio}" aún no tiene turnos online.', { servicio: servicio.nombre })), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => window.contactarSalonWhatsApp?.(`Hola! Quiero reservar "${servicio.nombre}" pero no aparece disponible en la app 💅`),
        className: "bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-lg transition-colors"
      },
      "💬 ",
      t("Reservar por WhatsApp")
    )) : /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2" }, profesionales.map((prof) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: prof.id,
        type: "button",
        onClick: () => elegir(servicio, prof),
        className: `p-3 rounded-xl border text-center transition ${elegido?.id === prof.id ? "border-pink-500 bg-pink-50 ring-2 ring-pink-300" : "border-pink-200 bg-white hover:bg-pink-50 hover:border-pink-400"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: `w-12 h-12 ${prof.color || "bg-pink-500"} rounded-full flex items-center justify-center text-2xl mx-auto mb-2 text-white` }, prof.avatar || "✨"),
      /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-pink-800" }, prof.nombre),
      /* @__PURE__ */ React.createElement("div", { className: "text-xs text-pink-500" }, prof.especialidad)
    ))));
  })), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-pink-500 bg-pink-50 p-3 rounded-lg border border-pink-200" }, t("La agenda se calculará en secuencia: cada servicio empieza cuando termina el anterior.")));
}
