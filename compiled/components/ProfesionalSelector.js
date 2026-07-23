function ProfesionalSelector({ onSelect, selectedProfesional, selectedService }) {
  window.useIdioma();
  const t = window.t;
  const [profesionales, setProfesionales] = React.useState([]);
  const [cargando, setCargando] = React.useState(true);
  const [todosProfesionales, setTodosProfesionales] = React.useState([]);
  React.useEffect(() => {
    cargarTodosProfesionales();
  }, []);
  React.useEffect(() => {
    if (todosProfesionales.length > 0) {
      filtrarPorServicio();
    }
  }, [selectedService, todosProfesionales]);
  const cargarTodosProfesionales = async () => {
    setCargando(true);
    try {
      if (window.salonProfesionales) {
        const activos = await window.salonProfesionales.getAll(true);
        setTodosProfesionales(activos || []);
        filtrarPorServicio(activos || []);
      }
    } catch (error) {
      console.error("Error cargando profesionales:", error);
    } finally {
      setCargando(false);
    }
  };
  const filtrarPorServicio = async (profesionalesList = todosProfesionales) => {
    if (!selectedService) {
      setProfesionales(profesionalesList);
      return;
    }
    try {
      if (window.getProfesionalesPorServicio) {
        let idsDelServicio = [];
        if (selectedService.esMultiple && Array.isArray(selectedService.servicios)) {
          const listas = await Promise.all(
            selectedService.servicios.map((servicio) => window.getProfesionalesPorServicio(servicio.id))
          );
          const listasIds = listas.map((lista) => lista.map((p) => p.id));
          idsDelServicio = listasIds.reduce((comunes, ids) => comunes.filter((id) => ids.includes(id)));
        } else {
          const profesionalesDelServicio = await window.getProfesionalesPorServicio(selectedService.id);
          idsDelServicio = profesionalesDelServicio.map((p) => p.id);
        }
        const filtrados = profesionalesList.filter((p) => idsDelServicio.includes(p.id));
        setProfesionales(filtrados);
        if (selectedProfesional && !filtrados.find((p) => p.id === selectedProfesional.id)) {
          onSelect(null);
        }
      } else {
        setProfesionales(profesionalesList);
      }
    } catch (error) {
      console.error("Error filtrando profesionales:", error);
      setProfesionales(profesionalesList);
    }
  };
  if (cargando) {
    return /* @__PURE__ */ React.createElement("div", { className: "space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-pink-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "✨"), t("2. Elige tu profesional")), /* @__PURE__ */ React.createElement("div", { className: "text-center py-8" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-8 w-8 border-b-2 border-pink-500 rounded-full mx-auto" }), /* @__PURE__ */ React.createElement("p", { className: "text-pink-400 mt-4" }, t("Cargando profesionales..."))));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-pink-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "✨"), t("2. Elige tu profesional"), selectedProfesional && /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2" }, t("Seleccionada"))), selectedService && profesionales.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center p-8 bg-pink-50 rounded-xl border border-pink-200 space-y-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-pink-700 font-medium" }, t('"{servicio}" aún no tiene turnos online', { servicio: selectedService.nombre })), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-600" }, t("Escríbenos y te lo coordinamos directamente 💖")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => window.contactarSalonWhatsApp?.(`Hola! Quiero reservar "${selectedService.nombre}" pero no aparece disponible en la app 💅`),
      className: "bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-3 rounded-xl shadow-sm transition-colors"
    },
    "💬 ",
    t("Reservar por WhatsApp")
  )) : profesionales.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-pink-200 space-y-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-pink-600 font-medium" }, t("Aún no hay profesionales con turnos online")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => window.contactarSalonWhatsApp?.(),
      className: "bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-3 rounded-xl shadow-sm transition-colors"
    },
    "💬 ",
    t("Reservar por WhatsApp")
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, selectedService && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-pink-600 bg-pink-50 p-2 rounded-lg border border-pink-200" }, t('Mostrando solo profesionales que realizan "{servicio}"', { servicio: selectedService.nombre })), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" }, profesionales.map((prof) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: prof.id,
      onClick: () => onSelect(prof),
      className: `p-4 rounded-xl border-2 text-left transition-all duration-200 transform hover:scale-105 ${selectedProfesional?.id === prof.id ? "border-pink-500 bg-pink-50 ring-2 ring-pink-300 shadow-lg" : "border-pink-200 bg-white/80 backdrop-blur-sm hover:border-pink-400 hover:bg-pink-50/50 hover:shadow-md"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center text-center" }, /* @__PURE__ */ React.createElement("div", { className: `w-16 h-16 ${prof.color || "bg-pink-500"} rounded-full flex items-center justify-center text-3xl mb-3 shadow-md ring-2 ring-pink-300/50` }, prof.avatar || "✨"), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-pink-800 text-lg block" }, prof.nombre), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-pink-500 mt-1" }, prof.especialidad), selectedProfesional?.id === prof.id && /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-pink-600 text-sm font-semibold" }, t("Seleccionada")))
  )))), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-pink-500 bg-pink-50 p-3 rounded-lg border border-pink-200" }, t("Cada profesional tiene su propia agenda. Despues de elegir, podras ver sus horarios disponibles.")));
}
