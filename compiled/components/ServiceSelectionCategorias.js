function normalizarCategoriaServicio(texto) {
  return String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function catId(categoria) {
  return categoria?.slug || categoria?.id || "otros";
}
function catNombre(categoria) {
  return categoria?.nombre || categoria?.label || window.t("Otros");
}
function catIcono(categoria) {
  return categoria?.icono || "⭐";
}
function categoriaCoincideCliente(categoria, valorNormalizado) {
  if (!categoria || !valorNormalizado) return false;
  return [catId(categoria), categoria.id, categoria.slug, catNombre(categoria)].some((valor) => normalizarCategoriaServicio(valor) === valorNormalizado);
}
function resolverCategoriaGuardadaCliente(valor, categorias = []) {
  const normalizada = normalizarCategoriaServicio(valor);
  if (!normalizada) return "";
  const categoria = categorias.find((item) => categoriaCoincideCliente(item, normalizada));
  if (categoria) return catId(categoria);
  const conocidas = ["manicura", "pedicura", "faciales", "barberia", "cejas", "combos", "otros"];
  return conocidas.includes(normalizada) ? normalizada : "";
}
function inferirCategoriaCliente(servicio, categorias = []) {
  const categoriaGuardada = resolverCategoriaGuardadaCliente(servicio?.categoria, categorias);
  if (categoriaGuardada) return categoriaGuardada;
  const texto = normalizarCategoriaServicio(`${servicio?.nombre || ""} ${servicio?.descripcion || ""}`);
  if (texto.includes("pedic") || texto.includes("pie")) return "pedicura";
  if (texto.includes("facial") || texto.includes("limpieza") || texto.includes("dermap")) return "faciales";
  if (texto.includes("barba") || texto.includes("corte") || texto.includes("barber")) return "barberia";
  if (texto.includes("ceja") || texto.includes("pestana")) return "cejas";
  if (texto.includes("combo") || texto.includes("paquete")) return "combos";
  if (texto.includes("manic") || texto.includes("una") || texto.includes("uña") || texto.includes("gel") || texto.includes("polygel") || texto.includes("builder")) return "manicura";
  return categorias.some((c) => catId(c) === "otros") ? "otros" : catId(categorias[0]);
}
function getCategoriaCliente(servicio, categorias = []) {
  const id = inferirCategoriaCliente(servicio, categorias);
  return categorias.find((c) => catId(c) === id) || categorias.find((c) => catId(c) === "otros") || { id: "otros", nombre: "Otros", icono: "⭐" };
}
function ServiceSelection({ onSelect, selectedService }) {
  const idioma = window.useIdioma();
  const t = window.t;
  const [services, setServices] = React.useState([]);
  const [categorias, setCategorias] = React.useState(window.salonCategoriasServicios?.defaults || []);
  const [cargando, setCargando] = React.useState(true);
  const datosCargadosRef = React.useRef(false);
  const [categoriaActiva, setCategoriaActiva] = React.useState("todos");
  const [serviciosSeleccionados, setServiciosSeleccionados] = React.useState([]);
  const [busqueda, setBusqueda] = React.useState("");
  const [imagenAmpliada, setImagenAmpliada] = React.useState(null);
  React.useEffect(() => {
    cargarDatos();
    const refresh = () => cargarDatos();
    window.addEventListener("serviciosActualizados", refresh);
    window.addEventListener("categoriasServiciosActualizadas", refresh);
    return () => {
      window.removeEventListener("serviciosActualizados", refresh);
      window.removeEventListener("categoriasServiciosActualizadas", refresh);
    };
  }, []);
  const cargarDatos = async () => {
    const mostrarIndicador = !datosCargadosRef.current;
    if (mostrarIndicador) setCargando(true);
    try {
      const [serviciosActivos, categoriasActivas] = await Promise.all([
        window.salonServicios?.getAll(true) || [],
        window.salonCategoriasServicios?.getAll(true) || []
      ]);
      setServices(serviciosActivos || []);
      setCategorias((categoriasActivas?.length ? categoriasActivas : window.salonCategoriasServicios?.defaults) || []);
    } catch (error) {
      console.error("Error cargando servicios/categorias:", error);
      setServices([]);
    } finally {
      datosCargadosRef.current = true;
      if (mostrarIndicador) setCargando(false);
    }
  };
  const categoriasVisibles = React.useMemo(() => {
    const visibles = categorias.filter(
      (categoria) => services.some((servicio) => inferirCategoriaCliente(servicio, categorias) === catId(categoria))
    );
    return services.length > 0 ? [{ id: "todos", slug: "todos", nombre: t("Todos"), icono: "📋" }, ...visibles] : [];
  }, [services, categorias, idioma]);
  React.useEffect(() => {
    if (categoriaActiva !== "todos" && !categoriasVisibles.some((categoria) => catId(categoria) === categoriaActiva)) {
      setCategoriaActiva("todos");
    }
  }, [categoriasVisibles, categoriaActiva]);
  const normalizar = (t2) => String(t2 || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const serviciosFiltrados = React.useMemo(() => {
    let lista = categoriaActiva === "todos" ? services : services.filter((s) => inferirCategoriaCliente(s, categorias) === categoriaActiva);
    if (busqueda.trim()) {
      const q = normalizar(busqueda);
      lista = lista.filter((s) => normalizar(s.nombre).includes(q) || normalizar(s.descripcion).includes(q));
    }
    return lista;
  }, [services, categorias, categoriaActiva, busqueda]);
  const totalSeleccion = React.useMemo(() => {
    return serviciosSeleccionados.reduce((total, servicio) => ({
      duracion: total.duracion + (parseInt(servicio.duracion, 10) || 0),
      precio: total.precio + (window.getPrecioServicioBase ? window.getPrecioServicioBase(servicio) : parseFloat(servicio.precio) || 0),
      monedas: total.monedas.includes(window.getMonedaServicio ? window.getMonedaServicio(servicio) : "CUP") ? total.monedas : [...total.monedas, window.getMonedaServicio ? window.getMonedaServicio(servicio) : "CUP"]
    }), { duracion: 0, precio: 0, monedas: [] });
  }, [serviciosSeleccionados]);
  const toggleServicio = (servicio) => {
    setServiciosSeleccionados((prev) => {
      const existe = prev.some((item) => item.id === servicio.id);
      return existe ? prev.filter((item) => item.id !== servicio.id) : [...prev, servicio];
    });
  };
  const servicioUltimoTurno = React.useMemo(() => {
    try {
      const negocioId = window.getNegocioId?.() || "";
      if (!negocioId) return null;
      const nombreGuardado = localStorage.getItem("ultimoServicio:" + negocioId);
      if (!nombreGuardado) return null;
      return services.find((s) => s.nombre === nombreGuardado) || null;
    } catch (e) {
      return null;
    }
  }, [services]);
  const repetirUltimoTurno = () => {
    if (!servicioUltimoTurno) return;
    setServiciosSeleccionados([servicioUltimoTurno]);
    onSelect(servicioUltimoTurno);
  };
  const combinarHorariosPermitidos = (seleccionados) => {
    const listas = seleccionados.map((servicio) => Array.isArray(servicio.horarios_permitidos) ? servicio.horarios_permitidos : []).filter((lista) => lista.length > 0);
    if (listas.length === 0) return [];
    return listas.reduce((base, lista) => base.filter((hora) => lista.includes(hora)));
  };
  const continuar = () => {
    if (serviciosSeleccionados.length === 0) return;
    if (serviciosSeleccionados.length === 1) {
      onSelect(serviciosSeleccionados[0]);
      return;
    }
    onSelect({
      id: `multi-${serviciosSeleccionados.map((s) => s.id).join("-")}`,
      esMultiple: true,
      servicios: serviciosSeleccionados,
      nombre: serviciosSeleccionados.map((s) => s.nombre).join(" + "),
      duracion: totalSeleccion.duracion,
      precio: totalSeleccion.precio,
      precio_desde: totalSeleccion.precio,
      precio_moneda: totalSeleccion.monedas.length === 1 ? totalSeleccion.monedas[0] : "CUP",
      categoria: "combos",
      horarios_permitidos: combinarHorariosPermitidos(serviciosSeleccionados)
    });
  };
  if (cargando) {
    return /* @__PURE__ */ React.createElement("div", { className: "space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-pink-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "✨"), t("1. Elige tu servicio")), /* @__PURE__ */ React.createElement("div", { className: "text-center py-8" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-8 w-8 border-b-2 border-pink-500 rounded-full mx-auto" }), /* @__PURE__ */ React.createElement("p", { className: "text-pink-400 mt-4" }, t("Cargando servicios..."))));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-pink-700 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "✨"), t("1. Elige tu servicio"), serviciosSeleccionados.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-1" }, t("{n} seleccionados", { n: serviciosSeleccionados.length }))), services.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-pink-200 space-y-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-pink-600 font-medium" }, t("Los turnos online aún no están listos")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-pink-500" }, t("Escríbenos por WhatsApp y coordinamos tu cita 💖")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => window.contactarSalonWhatsApp?.(),
      className: "bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-3 rounded-xl shadow-sm transition-colors"
    },
    "💬 ",
    t("Reservar por WhatsApp")
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, servicioUltimoTurno && serviciosSeleccionados.length === 0 && !selectedService && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: repetirUltimoTurno,
      className: "w-full flex items-center justify-between gap-3 bg-pink-50 p-4 rounded-2xl shadow-sm transition-colors"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-left min-w-0" }, /* @__PURE__ */ React.createElement("span", { className: "block text-xs font-bold text-pink-600" }, "↻ ", t("¿Repetir tu último turno?")), /* @__PURE__ */ React.createElement("span", { className: "block font-bold text-gray-900 truncate" }, servicioUltimoTurno.nombre)),
    /* @__PURE__ */ React.createElement("span", { className: "text-2xl text-pink-600" }, "→")
  ), services.length > 5 && /* @__PURE__ */ React.createElement("div", { className: "flex items-center rounded-full bg-white shadow-sm focus-within:ring-2 focus-within:ring-pink-400" }, /* @__PURE__ */ React.createElement("span", { className: "pl-3 text-base flex-shrink-0" }, "🔍"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: busqueda,
      onChange: (e) => {
        setBusqueda(e.target.value);
        setCategoriaActiva("todos");
      },
      placeholder: t("Buscar servicio..."),
      className: "flex-1 px-3 py-2.5 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
    }
  ), busqueda && /* @__PURE__ */ React.createElement("button", { onClick: () => setBusqueda(""), className: "pr-3 text-pink-400 hover:text-pink-600 text-sm" }, "✕")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" }, categoriasVisibles.map((categoria) => {
    const id = catId(categoria);
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: id,
        onClick: () => setCategoriaActiva(id),
        className: `shrink-0 px-3.5 py-2 rounded-full text-sm font-bold transition-colors ${categoriaActiva === id ? "bg-gray-900 text-white" : "bg-white text-gray-700 shadow-sm"}`
      },
      /* @__PURE__ */ React.createElement("span", { className: "mr-1" }, catIcono(categoria)),
      catNombre(categoria)
    );
  })), busqueda && serviciosFiltrados.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "text-center py-6 text-pink-400 text-sm" }, t('No hay servicios que coincidan con "{busqueda}"', { busqueda })), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 gap-3" }, serviciosFiltrados.map((service) => {
    const categoria = getCategoriaCliente(service, categorias);
    const estaSeleccionado = serviciosSeleccionados.some((item) => item.id === service.id);
    const verFoto = (e) => {
      e.stopPropagation();
      setImagenAmpliada({ url: service.imagen, nombre: service.nombre });
    };
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: service.id,
        onClick: () => toggleServicio(service),
        "aria-pressed": estaSeleccionado,
        className: `w-full p-3 rounded-2xl bg-white text-left shadow-sm transition-shadow ${estaSeleccionado ? "ring-2 ring-pink-500" : "hover:shadow-md"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, service.imagen ? /* @__PURE__ */ React.createElement(
        "span",
        {
          role: "button",
          tabIndex: 0,
          onClick: verFoto,
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              verFoto(e);
            }
          },
          className: "h-16 w-16 rounded-xl overflow-hidden shrink-0 cursor-zoom-in",
          "aria-label": t("Ver foto de {nombre}", { nombre: service.nombre })
        },
        /* @__PURE__ */ React.createElement("img", { src: service.imagen, alt: service.nombre, loading: "lazy", decoding: "async", className: "h-full w-full object-cover" })
      ) : /* @__PURE__ */ React.createElement("span", { className: "h-16 w-16 rounded-xl bg-pink-50 shrink-0 flex items-center justify-center text-3xl" }, catIcono(categoria)), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "block font-bold text-gray-900 leading-snug break-words" }, service.nombre), /* @__PURE__ */ React.createElement("span", { className: "block text-sm text-gray-500 mt-0.5" }, service.duracion, " min · ", catNombre(categoria)), /* @__PURE__ */ React.createElement("span", { className: "block font-extrabold text-pink-600 mt-0.5 break-words" }, window.formatearPrecioServicio ? window.formatearPrecioServicio(service) : `$${service.precio}`)), /* @__PURE__ */ React.createElement(
        "span",
        {
          "aria-hidden": "true",
          className: `h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-lg font-bold ${estaSeleccionado ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-500"}`
        },
        estaSeleccionado ? "✓" : "+"
      )),
      service.descripcion && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 leading-relaxed break-words mt-2 line-clamp-2" }, service.descripcion)
    );
  }))), serviciosSeleccionados.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "sticky bottom-3 z-20 bg-white shadow-xl rounded-2xl p-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-gray-900" }, t("{n} servicio{s} · {duracion} min · {precio} {moneda}", {
    n: serviciosSeleccionados.length,
    s: serviciosSeleccionados.length === 1 ? "" : "s",
    duracion: totalSeleccion.duracion,
    precio: totalSeleccion.precio % 1 === 0 ? totalSeleccion.precio.toFixed(0) : totalSeleccion.precio.toFixed(2),
    moneda: totalSeleccion.monedas.length === 1 ? totalSeleccion.monedas[0] : t("base")
  })), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 truncate" }, serviciosSeleccionados.map((s) => s.nombre).join(" + "))), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: continuar,
      className: "bg-pink-500 text-white px-6 py-3 rounded-full font-bold transition"
    },
    t("Continuar"),
    " →"
  ))), imagenAmpliada && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4",
      onClick: () => setImagenAmpliada(null),
      role: "dialog",
      "aria-modal": "true",
      "aria-label": imagenAmpliada.nombre
    },
    /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setImagenAmpliada(null),
        className: "absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 text-pink-700 text-xl font-bold flex items-center justify-center shadow-lg",
        "aria-label": t("Cerrar")
      },
      "✕"
    ),
    /* @__PURE__ */ React.createElement("div", { className: "max-w-lg w-full", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: imagenAmpliada.url,
        alt: imagenAmpliada.nombre,
        className: "w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-center text-white font-semibold text-lg drop-shadow" }, imagenAmpliada.nombre))
  ));
}
