function normalizarTextoServicio(texto) {
  return String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function categoriaId(categoria) {
  return categoria?.slug || categoria?.id || "otros";
}
function categoriaNombre(categoria) {
  return categoria?.nombre || categoria?.label || window.t("Otros");
}
function categoriaIcono(categoria) {
  return categoria?.icono || "⭐";
}
function formatearListaHorasAdmin(horas = []) {
  return horas.map((hora) => window.formatTo12Hour ? window.formatTo12Hour(hora) : hora).join(", ");
}
function categoriaCoincideServicio(categoria, valorNormalizado) {
  if (!categoria || !valorNormalizado) return false;
  return [categoriaId(categoria), categoria.id, categoria.slug, categoriaNombre(categoria)].some((valor) => normalizarTextoServicio(valor) === valorNormalizado);
}
function resolverCategoriaGuardadaServicio(valor, categorias = []) {
  const normalizada = normalizarTextoServicio(valor);
  if (!normalizada) return "";
  const categoria = categorias.find((item) => categoriaCoincideServicio(item, normalizada));
  if (categoria) return categoriaId(categoria);
  const conocidas = ["manicura", "pedicura", "faciales", "barberia", "cejas", "combos", "otros"];
  return conocidas.includes(normalizada) ? normalizada : "";
}
function inferirCategoriaServicio(servicio, categorias = []) {
  const categoriaGuardada = resolverCategoriaGuardadaServicio(servicio?.categoria, categorias);
  if (categoriaGuardada) return categoriaGuardada;
  const texto = normalizarTextoServicio(`${servicio?.nombre || ""} ${servicio?.descripcion || ""}`);
  if (texto.includes("pedic") || texto.includes("pie")) return "pedicura";
  if (texto.includes("facial") || texto.includes("limpieza") || texto.includes("dermap")) return "faciales";
  if (texto.includes("barba") || texto.includes("corte") || texto.includes("barber")) return "barberia";
  if (texto.includes("ceja") || texto.includes("pestana")) return "cejas";
  if (texto.includes("combo") || texto.includes("paquete")) return "combos";
  if (texto.includes("manic") || texto.includes("una") || texto.includes("uña") || texto.includes("gel") || texto.includes("polygel") || texto.includes("builder")) return "manicura";
  return categorias.some((c) => categoriaId(c) === "otros") ? "otros" : categoriaId(categorias[0]);
}
function getCategoriaServicio(servicio, categorias = []) {
  const id = inferirCategoriaServicio(servicio, categorias);
  return categorias.find((c) => categoriaId(c) === id) || categorias.find((c) => categoriaId(c) === "otros") || { id: "otros", nombre: "Otros", icono: "⭐" };
}
function ServiciosPanel() {
  const idioma = window.useIdioma();
  const t = window.t;
  const [servicios, setServicios] = React.useState([]);
  const [categorias, setCategorias] = React.useState(window.salonCategoriasServicios?.defaults || []);
  const [mostrarForm, setMostrarForm] = React.useState(false);
  const [editando, setEditando] = React.useState(null);
  const [cargando, setCargando] = React.useState(true);
  const datosCargadosRef = React.useRef(false);
  const [busqueda, setBusqueda] = React.useState("");
  const [categoriaActiva, setCategoriaActiva] = React.useState("todos");
  const [servicioParaAsignar, setServicioParaAsignar] = React.useState(null);
  const [mostrarCategorias, setMostrarCategorias] = React.useState(false);
  const [mostrarImportar, setMostrarImportar] = React.useState(false);
  const [profesionalesDelNegocio, setProfesionalesDelNegocio] = React.useState([]);
  React.useEffect(() => {
    if (!mostrarImportar || profesionalesDelNegocio.length) return;
    window.salonProfesionales?.getAll(true).then((p) => setProfesionalesDelNegocio(p || [])).catch(() => setProfesionalesDelNegocio([]));
  }, [mostrarImportar]);
  const formularioRef = React.useRef(null);
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
      const [listaServicios, listaCategorias] = await Promise.all([
        window.salonServicios?.getAll(false) || [],
        window.salonCategoriasServicios?.getAll(false) || []
      ]);
      setServicios(listaServicios || []);
      setCategorias((listaCategorias?.length ? listaCategorias : window.salonCategoriasServicios?.defaults) || []);
    } catch (error) {
      console.error("Error cargando servicios/categorias:", error);
    } finally {
      datosCargadosRef.current = true;
      if (mostrarIndicador) setCargando(false);
    }
  };
  const categoriasFiltro = React.useMemo(() => [
    { id: "todos", slug: "todos", nombre: t("Todos"), icono: "📋", activo: true },
    ...categorias.filter((c) => c.activo !== false),
    { id: "inactivos", slug: "inactivos", nombre: t("Inactivos"), icono: "⏸️", activo: true }
  ], [categorias, idioma]);
  React.useEffect(() => {
    if (!categoriasFiltro.some((categoria) => categoriaId(categoria) === categoriaActiva)) {
      setCategoriaActiva("todos");
    }
  }, [categoriasFiltro, categoriaActiva]);
  const serviciosFiltrados = React.useMemo(() => {
    const q = normalizarTextoServicio(busqueda);
    return servicios.filter((servicio) => {
      const cat = inferirCategoriaServicio(servicio, categorias);
      const coincideCategoria = categoriaActiva === "todos" || (categoriaActiva === "inactivos" ? servicio.activo === false : cat === categoriaActiva && servicio.activo !== false);
      const coincideBusqueda = !q || normalizarTextoServicio(`${servicio.nombre} ${servicio.descripcion}`).includes(q);
      return coincideCategoria && coincideBusqueda;
    });
  }, [servicios, categorias, busqueda, categoriaActiva]);
  const conteoCategoria = (id) => {
    if (id === "todos") return servicios.filter((s) => s.activo !== false).length;
    if (id === "inactivos") return servicios.filter((s) => s.activo === false).length;
    return servicios.filter((s) => s.activo !== false && inferirCategoriaServicio(s, categorias) === id).length;
  };
  const guardarServicio = async (servicio) => {
    const resultado = editando ? await window.salonServicios.actualizar(editando.id, servicio) : await window.salonServicios.crear(servicio);
    if (!resultado) {
      alert(t("No se pudo guardar el servicio. Revisa la consola para ver el detalle de Supabase."));
      return;
    }
    setMostrarForm(false);
    setEditando(null);
    await cargarDatos();
  };
  const duplicarServicio = async (servicio) => {
    await window.salonServicios.crear({
      nombre: `${servicio.nombre} (${t("copia")})`,
      categoria: inferirCategoriaServicio(servicio, categorias),
      duracion: servicio.duracion,
      precio: servicio.precio,
      precio_desde: servicio.precio_desde ?? servicio.precio,
      precio_hasta: servicio.precio_hasta || null,
      precio_moneda: servicio.precio_moneda || "CUP",
      requiere_anticipo: servicio.requiere_anticipo === true,
      tipo_anticipo: servicio.tipo_anticipo || "fijo",
      valor_anticipo: servicio.valor_anticipo || null,
      descripcion: servicio.descripcion || "",
      imagen: servicio.imagen || null,
      horarios_permitidos: servicio.horarios_permitidos || []
    });
    await cargarDatos();
  };
  const eliminarServicio = async (id) => {
    if (!confirm(t("¿Eliminar este servicio? También se eliminarán las asignaciones de profesionales."))) return;
    await window.salonServicios.eliminar(id);
    await cargarDatos();
  };
  const toggleActivo = async (servicio) => {
    await window.salonServicios.actualizar(servicio.id, { activo: !servicio.activo });
    await cargarDatos();
  };
  const abrirFormularioServicio = (servicio = null) => {
    setEditando(servicio);
    setMostrarForm(true);
    setTimeout(() => {
      formularioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };
  if (cargando) {
    return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6 text-center py-12" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto" }), /* @__PURE__ */ React.createElement("p", { className: "text-gray-500 mt-4" }, t("Cargando servicios...")));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-5" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm border border-gray-100 p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-gray-900 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "💅"), " ", t("Servicios")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 mt-1" }, t("Controla servicios, categorías, precios, duración y profesionales."))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setMostrarImportar(true), className: "border border-amber-300 text-amber-700 px-4 py-3 rounded-lg hover:bg-amber-50 font-semibold", title: t("Pega tu lista de servicios y se crean solos") }, "📋 ", t("Importar lista")), /* @__PURE__ */ React.createElement("button", { onClick: () => setMostrarCategorias(!mostrarCategorias), className: "border border-pink-200 text-pink-700 px-4 py-3 rounded-lg hover:bg-pink-50 font-semibold" }, "⚙️ ", t("Categorías")), /* @__PURE__ */ React.createElement("button", { onClick: () => abrirFormularioServicio(), className: "bg-pink-600 text-white px-4 py-3 rounded-lg hover:bg-pink-700 font-semibold shadow-sm" }, "+ ", t("Nuevo servicio")))), /* @__PURE__ */ React.createElement("div", { className: "mt-5 flex flex-col md:flex-row gap-3" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "search",
      value: busqueda,
      onChange: (e) => setBusqueda(e.target.value),
      className: "flex-1 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none",
      placeholder: t("Buscar por nombre o descripción")
    }
  ), /* @__PURE__ */ React.createElement("button", { onClick: () => setBusqueda(""), className: "px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50" }, t("Limpiar"))), /* @__PURE__ */ React.createElement("div", { className: "mt-5 flex gap-2 overflow-x-auto pb-1" }, categoriasFiltro.map((categoria) => {
    const id = categoriaId(categoria);
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: id,
        onClick: () => setCategoriaActiva(id),
        className: `shrink-0 px-3 py-2 rounded-full border text-sm font-medium transition ${categoriaActiva === id ? "bg-pink-600 text-white border-pink-600 shadow-sm" : "bg-white text-gray-700 border-gray-200 hover:border-pink-300 hover:bg-pink-50"}`
      },
      /* @__PURE__ */ React.createElement("span", { className: "mr-1" }, categoriaIcono(categoria)),
      categoriaNombre(categoria),
      /* @__PURE__ */ React.createElement("span", { className: `ml-2 text-xs ${categoriaActiva === id ? "text-white/80" : "text-gray-400"}` }, conteoCategoria(id))
    );
  }))), mostrarCategorias && /* @__PURE__ */ React.createElement(
    CategoriasServiciosManager,
    {
      categorias,
      servicios,
      onChange: cargarDatos
    }
  ), mostrarForm && /* @__PURE__ */ React.createElement("div", { ref: formularioRef, className: "scroll-mt-4" }, /* @__PURE__ */ React.createElement(
    ServicioFormCategorias,
    {
      servicio: editando,
      categorias,
      onGuardar: guardarServicio,
      onCancelar: () => {
        setMostrarForm(false);
        setEditando(null);
      }
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 xl:grid-cols-2 gap-3" }, serviciosFiltrados.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "xl:col-span-2 bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium" }, t("No hay servicios para este filtro.")), /* @__PURE__ */ React.createElement("p", { className: "text-sm mt-1" }, t("Crea uno nuevo o cambia de categoría."))) : serviciosFiltrados.map((servicio) => {
    const categoria = getCategoriaServicio(servicio, categorias);
    return /* @__PURE__ */ React.createElement("div", { key: servicio.id, className: `bg-white border rounded-xl p-4 shadow-sm transition hover:shadow-md ${servicio.activo === false ? "opacity-60 border-gray-200 bg-gray-50" : "border-gray-100"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-3" }, servicio.imagen && /* @__PURE__ */ React.createElement(
      "img",
      {
        src: servicio.imagen,
        alt: servicio.nombre,
        className: "h-20 w-20 rounded-lg object-cover border border-gray-100 shrink-0",
        loading: "lazy"
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, categoriaIcono(categoria)), /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-900 text-lg truncate" }, servicio.nombre), /* @__PURE__ */ React.createElement("span", { className: "text-xs px-2 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-100" }, categoriaNombre(categoria))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex flex-wrap gap-2 text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "px-2 py-1 bg-gray-100 rounded-full text-gray-700" }, servicio.duracion, " min"), /* @__PURE__ */ React.createElement("span", { className: "px-2 py-1 bg-gray-100 rounded-full text-gray-700" }, window.formatearPrecioServicio ? window.formatearPrecioServicio(servicio) : `$${servicio.precio}`), /* @__PURE__ */ React.createElement("button", { onClick: () => toggleActivo(servicio), className: `px-2 py-1 rounded-full text-xs font-semibold ${servicio.activo !== false ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}` }, servicio.activo !== false ? t("Activo") : t("Inactivo"))), servicio.descripcion && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 mt-3 line-clamp-2" }, servicio.descripcion), servicio.horarios_permitidos?.length > 0 && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-pink-600 mt-3" }, "🕐 ", t("Horarios permitidos:"), " ", formatearListaHorasAdmin(servicio.horarios_permitidos))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1 shrink-0" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setServicioParaAsignar(servicio), className: "w-9 h-9 rounded-lg hover:bg-purple-50 text-purple-600", title: t("Asignar profesionales") }, "👥"), /* @__PURE__ */ React.createElement("button", { onClick: () => abrirFormularioServicio(servicio), className: "w-9 h-9 rounded-lg hover:bg-blue-50 text-blue-600", title: t("Editar") }, "✏️"), /* @__PURE__ */ React.createElement("button", { onClick: () => duplicarServicio(servicio), className: "w-9 h-9 rounded-lg hover:bg-amber-50 text-amber-600", title: t("Duplicar") }, "📄"), /* @__PURE__ */ React.createElement("button", { onClick: () => eliminarServicio(servicio.id), className: "w-9 h-9 rounded-lg hover:bg-red-50 text-red-600", title: t("Eliminar") }, "🗑️"))));
  })), servicioParaAsignar && /* @__PURE__ */ React.createElement(AsignarProfesionalesModal, { servicio: servicioParaAsignar, onClose: () => setServicioParaAsignar(null) }), mostrarImportar && /* @__PURE__ */ React.createElement(
    ImportarServiciosModal,
    {
      monedaNegocio: servicios[0]?.precio_moneda || "CUP",
      profesionales: profesionalesDelNegocio,
      onCerrar: () => setMostrarImportar(false),
      onImportado: (creados) => {
        setMostrarImportar(false);
        cargarDatos();
        alert(t("✅ Se crearon {n} servicios").replace("{n}", creados));
      }
    }
  ));
}
function CategoriasServiciosManager({ categorias, servicios, onChange }) {
  window.useIdioma();
  const t = window.t;
  const [form, setForm] = React.useState({ nombre: "", icono: "✨", orden: 99 });
  const [editando, setEditando] = React.useState(null);
  const reset = () => {
    setForm({ nombre: "", icono: "✨", orden: 99 });
    setEditando(null);
  };
  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      alert(t("Escribe el nombre de la categoría."));
      return;
    }
    const payload = {
      nombre: form.nombre.trim(),
      slug: form.slug || form.nombre.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
      icono: form.icono || "⭐",
      orden: parseInt(form.orden, 10) || 99,
      activo: true
    };
    const result = editando ? await window.salonCategoriasServicios?.actualizar(editando.id, payload) : await window.salonCategoriasServicios?.crear(payload);
    if (!result) {
      alert(t("No se pudo guardar la categoría. Revisa si ya corriste el SQL de categorías."));
      return;
    }
    reset();
    await onChange();
  };
  const editar = (categoria) => {
    setEditando(categoria);
    setForm({
      nombre: categoriaNombre(categoria),
      slug: categoriaId(categoria),
      icono: categoriaIcono(categoria),
      orden: categoria.orden || 99
    });
  };
  const eliminar = async (categoria) => {
    const id = categoriaId(categoria);
    const usados = servicios.filter((s) => inferirCategoriaServicio(s, categorias) === id);
    if (!confirm(t('¿Eliminar la categoría "{nombre}"? {aviso}', { nombre: categoriaNombre(categoria), aviso: usados.length ? t("Sus servicios pasarán a Otros.") : "" }))) return;
    for (const servicio of usados) {
      await window.salonServicios.actualizar(servicio.id, { categoria: "otros" });
    }
    const ok = await window.salonCategoriasServicios?.eliminar(categoria.id);
    if (!ok) {
      alert(t("No se pudo eliminar la categoría. Revisa si ya corriste el SQL de categorías."));
      return;
    }
    await onChange();
  };
  const toggle = async (categoria) => {
    const ok = await window.salonCategoriasServicios?.actualizar(categoria.id, { activo: categoria.activo === false });
    if (!ok) {
      alert(t("No se pudo cambiar el estado de la categoría."));
      return;
    }
    await onChange();
  };
  return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl border border-pink-100 shadow-sm p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col lg:flex-row gap-5" }, /* @__PURE__ */ React.createElement("form", { onSubmit: guardar, className: "lg:w-80 space-y-3" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-900" }, editando ? t("Editar categoría") : t("Nueva categoría")), /* @__PURE__ */ React.createElement("input", { value: form.nombre, onChange: (e) => setForm({ ...form, nombre: e.target.value }), className: "w-full border border-gray-200 rounded-lg px-3 py-2", placeholder: t("Nombre: Faciales premium") }), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2" }, /* @__PURE__ */ React.createElement("input", { value: form.icono, onChange: (e) => setForm({ ...form, icono: e.target.value }), className: "w-full border border-gray-200 rounded-lg px-3 py-2", placeholder: t("Emoji"), maxLength: "4" }), /* @__PURE__ */ React.createElement("input", { value: form.orden, onChange: (e) => setForm({ ...form, orden: e.target.value.replace(/\D/g, "") }), className: "w-full border border-gray-200 rounded-lg px-3 py-2", placeholder: t("Orden"), inputMode: "numeric" })), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("button", { type: "submit", className: "flex-1 bg-pink-600 text-white px-3 py-2 rounded-lg hover:bg-pink-700" }, editando ? t("Actualizar") : t("Crear")), editando && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: reset, className: "px-3 py-2 border rounded-lg hover:bg-gray-50" }, t("Cancelar")))), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-900 mb-3" }, t("Categorías actuales")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2" }, categorias.map((categoria) => {
    const id = categoriaId(categoria);
    const usados = servicios.filter((s) => inferirCategoriaServicio(s, categorias) === id).length;
    return /* @__PURE__ */ React.createElement("div", { key: `${categoria.id}-${id}`, className: `border rounded-lg p-3 flex items-center gap-3 ${categoria.activo === false ? "bg-gray-50 opacity-60" : "bg-white"}` }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, categoriaIcono(categoria)), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-gray-800 truncate" }, categoriaNombre(categoria)), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500" }, t("{n} servicios · orden {orden}", { n: usados, orden: categoria.orden || 99 }))), /* @__PURE__ */ React.createElement("button", { onClick: () => editar(categoria), className: "text-blue-600 hover:bg-blue-50 rounded-lg w-8 h-8", title: t("Editar") }, "✏️"), /* @__PURE__ */ React.createElement("button", { onClick: () => toggle(categoria), className: "text-amber-600 hover:bg-amber-50 rounded-lg w-8 h-8", title: t("Activar/desactivar") }, categoria.activo === false ? "▶️" : "⏸️"), /* @__PURE__ */ React.createElement("button", { onClick: () => eliminar(categoria), className: "text-red-600 hover:bg-red-50 rounded-lg w-8 h-8", title: t("Eliminar") }, "🗑️"));
  })))));
}
function ServicioFormCategorias({ servicio, categorias, onGuardar, onCancelar }) {
  window.useIdioma();
  const t = window.t;
  const categoriaInicial = servicio ? inferirCategoriaServicio(servicio, categorias) : categoriaId(categorias.find((c) => c.activo !== false) || categorias[0]);
  const [form, setForm] = React.useState({
    nombre: servicio?.nombre || "",
    categoria: categoriaInicial || "otros",
    duracion: String(servicio?.duracion || "45"),
    precio_desde: String(servicio?.precio_desde ?? servicio?.precio ?? "0"),
    precio_hasta: String(servicio?.precio_hasta ?? ""),
    precio_moneda: String(servicio?.precio_moneda || "CUP").toUpperCase(),
    requiere_anticipo: servicio?.requiere_anticipo === true,
    tipo_anticipo: servicio?.tipo_anticipo || "fijo",
    valor_anticipo: String(servicio?.valor_anticipo ?? ""),
    descripcion: servicio?.descripcion || "",
    imagen: servicio?.imagen || "",
    horarios_permitidos: servicio?.horarios_permitidos || []
  });
  const [horariosStr, setHorariosStr] = React.useState(servicio?.horarios_permitidos ? servicio.horarios_permitidos.join(", ") : "");
  const [subiendoImagen, setSubiendoImagen] = React.useState(false);
  const handleImagenChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!window.subirImagenServicio) {
      alert(t("No se cargó el subidor de imágenes. Recarga la página."));
      return;
    }
    setSubiendoImagen(true);
    try {
      const resultado = await window.subirImagenServicio(file, form.nombre || "servicio");
      if (resultado?.url) setForm((actual) => ({ ...actual, imagen: resultado.url }));
    } finally {
      setSubiendoImagen(false);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    const duracion = parseInt(form.duracion, 10);
    const precioDesde = window.parsePrecioServicio ? window.parsePrecioServicio(form.precio_desde, NaN) : parseFloat(String(form.precio_desde).replace(",", "."));
    const precioHasta = form.precio_hasta === "" ? null : window.parsePrecioServicio ? window.parsePrecioServicio(form.precio_hasta, NaN) : parseFloat(String(form.precio_hasta).replace(",", "."));
    const valorAnticipo = form.valor_anticipo === "" ? null : window.parsePrecioServicio ? window.parsePrecioServicio(form.valor_anticipo, NaN) : parseFloat(String(form.valor_anticipo).replace(",", "."));
    if (!form.nombre.trim()) return alert(t("El nombre del servicio es obligatorio"));
    if (isNaN(duracion) || duracion < 3) return alert(t("La duración debe ser al menos 3 minutos"));
    if (isNaN(precioDesde) || precioDesde < 0) return alert(t("El precio desde debe ser válido"));
    if (precioHasta !== null && (isNaN(precioHasta) || precioHasta < precioDesde)) return alert(t("El precio hasta debe ser mayor o igual al precio desde"));
    if (form.requiere_anticipo && (valorAnticipo === null || isNaN(valorAnticipo) || valorAnticipo <= 0)) return alert(t("El anticipo del servicio debe ser mayor que cero"));
    let horarios = [];
    if (horariosStr.trim()) {
      horarios = horariosStr.split(",").map((h) => h.trim()).filter((h) => h.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/));
      if (horarios.length === 0) return alert(t("Formato de horarios inválido. Usa HH:MM separados por comas."));
    }
    onGuardar({
      ...form,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      imagen: form.imagen || null,
      duracion,
      precio: precioDesde,
      precio_desde: precioDesde,
      precio_hasta: precioHasta,
      precio_moneda: ["CUP", "USD", "EUR", "MXN"].includes(form.precio_moneda) ? form.precio_moneda : "CUP",
      requiere_anticipo: form.requiere_anticipo,
      tipo_anticipo: form.tipo_anticipo === "porcentaje" ? "porcentaje" : "fijo",
      valor_anticipo: form.requiere_anticipo ? valorAnticipo : null,
      horarios_permitidos: horarios
    });
  };
  return /* @__PURE__ */ React.createElement("form", { onSubmit: submit, className: "bg-white rounded-xl border border-pink-100 shadow-sm p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-4 mb-5" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-gray-900" }, servicio ? "✏️ " + t("Editar servicio") : "➕ " + t("Nuevo servicio")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 mt-1" }, t("Completa la información que verá la clienta al reservar."))), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onCancelar, className: "text-gray-400 hover:text-gray-700 text-2xl leading-none" }, "×")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("section", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("h4", { className: "font-semibold text-gray-800" }, t("Información básica")), /* @__PURE__ */ React.createElement("input", { value: form.nombre, onChange: (e) => setForm({ ...form, nombre: e.target.value }), className: "w-full border border-gray-200 rounded-lg px-3 py-2", placeholder: t("Nombre del servicio"), required: true }), /* @__PURE__ */ React.createElement("select", { value: form.categoria, onChange: (e) => setForm({ ...form, categoria: e.target.value }), className: "w-full border border-gray-200 rounded-lg px-3 py-2 bg-white" }, categorias.filter((c) => c.activo !== false).map((categoria) => /* @__PURE__ */ React.createElement("option", { key: categoriaId(categoria), value: categoriaId(categoria) }, categoriaIcono(categoria), " ", categoriaNombre(categoria)))), /* @__PURE__ */ React.createElement("textarea", { value: form.descripcion, onChange: (e) => setForm({ ...form, descripcion: e.target.value }), className: "w-full border border-gray-200 rounded-lg px-3 py-2", rows: "4", placeholder: t("Descripción") }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 pt-1" }, /* @__PURE__ */ React.createElement("div", { className: "h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center" }, subiendoImagen ? /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-gray-500" }, t("Subiendo")) : form.imagen ? /* @__PURE__ */ React.createElement("img", { src: form.imagen, alt: t("Foto del servicio"), className: "h-full w-full object-cover" }) : /* @__PURE__ */ React.createElement("span", { className: "text-xl" }, "📷")), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mb-1.5" }, t("Foto del servicio (opcional)")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement("input", { id: "servicio-imagen-input", type: "file", accept: "image/*", onChange: handleImagenChange, className: "hidden" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => document.getElementById("servicio-imagen-input").click(),
      disabled: subiendoImagen,
      className: "px-3 py-1.5 text-xs font-semibold rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60"
    },
    subiendoImagen ? t("Subiendo...") : form.imagen ? t("Cambiar foto") : t("Subir foto")
  ), form.imagen && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setForm({ ...form, imagen: "" }),
      className: "px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
    },
    t("Quitar")
  ))))), /* @__PURE__ */ React.createElement("section", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("h4", { className: "font-semibold text-gray-800" }, t("Precio, duración y disponibilidad")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("input", { value: form.duracion, onChange: (e) => setForm({ ...form, duracion: e.target.value.replace(/\D/g, "") }), className: "w-full border border-gray-200 rounded-lg px-3 py-2", placeholder: t("Duración"), inputMode: "numeric" }), /* @__PURE__ */ React.createElement("select", { value: form.precio_moneda, onChange: (e) => setForm({ ...form, precio_moneda: e.target.value }), className: "w-full border border-gray-200 rounded-lg px-3 py-2 bg-white" }, /* @__PURE__ */ React.createElement("option", { value: "CUP" }, "CUP"), /* @__PURE__ */ React.createElement("option", { value: "USD" }, "USD"), /* @__PURE__ */ React.createElement("option", { value: "EUR" }, "EUR"), /* @__PURE__ */ React.createElement("option", { value: "MXN" }, "MXN"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("input", { value: form.precio_desde, onChange: (e) => setForm({ ...form, precio_desde: e.target.value.replace(/[^0-9.,]/g, "") }), className: "w-full border border-gray-200 rounded-lg px-3 py-2", placeholder: t("Precio desde"), inputMode: "decimal" }), /* @__PURE__ */ React.createElement("input", { value: form.precio_hasta, onChange: (e) => setForm({ ...form, precio_hasta: e.target.value.replace(/[^0-9.,]/g, "") }), className: "w-full border border-gray-200 rounded-lg px-3 py-2", placeholder: t("Precio hasta opcional"), inputMode: "decimal" })), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400" }, t('Si no hay rango, deja vacío "precio hasta". El cálculo usa el precio desde.')), /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-amber-100 bg-amber-50 p-3 space-y-3" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center justify-between gap-3 cursor-pointer" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-amber-800" }, t("Anticipo propio de este servicio")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: form.requiere_anticipo,
      onChange: (e) => setForm({ ...form, requiere_anticipo: e.target.checked }),
      className: "w-5 h-5 text-amber-600"
    }
  )), form.requiere_anticipo && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("select", { value: form.tipo_anticipo, onChange: (e) => setForm({ ...form, tipo_anticipo: e.target.value }), className: "w-full border border-amber-200 rounded-lg px-3 py-2 bg-white" }, /* @__PURE__ */ React.createElement("option", { value: "fijo" }, t("Monto fijo")), /* @__PURE__ */ React.createElement("option", { value: "porcentaje" }, t("Porcentaje"))), /* @__PURE__ */ React.createElement("input", { value: form.valor_anticipo, onChange: (e) => setForm({ ...form, valor_anticipo: e.target.value.replace(/[^0-9.,]/g, "") }), className: "w-full border border-amber-200 rounded-lg px-3 py-2", placeholder: form.tipo_anticipo === "porcentaje" ? t("Ej: 30") : t("Ej: 500"), inputMode: "decimal" })), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-700" }, t("Solo se usa si en Editar negocio activas los anticipos por servicio."))), /* @__PURE__ */ React.createElement("input", { value: horariosStr, onChange: (e) => setHorariosStr(e.target.value), className: "w-full border border-gray-200 rounded-lg px-3 py-2", placeholder: t("Horarios permitidos: 09:00, 11:00") }), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400" }, t("Déjalo vacío para usar todos los horarios del profesional.")))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row justify-end gap-2 mt-5 pt-4 border-t" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onCancelar, className: "px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50" }, t("Cancelar")), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold" }, servicio ? t("Actualizar servicio") : t("Guardar servicio"))));
}
function AsignarProfesionalesModal({ servicio, onClose }) {
  window.useIdioma();
  const t = window.t;
  const [profesionales, setProfesionales] = React.useState([]);
  const [asignados, setAsignados] = React.useState([]);
  const [cargando, setCargando] = React.useState(true);
  const [guardando, setGuardando] = React.useState(false);
  React.useEffect(() => {
    cargarDatos();
  }, [servicio]);
  const cargarDatos = async () => {
    setCargando(true);
    try {
      if (window.salonProfesionales) {
        const todos = await window.salonProfesionales.getAll(true);
        setProfesionales(todos || []);
      }
      if (window.getProfesionalesPorServicio) {
        const asignadosData = await window.getProfesionalesPorServicio(servicio.id);
        setAsignados(asignadosData.map((p) => p.id));
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setCargando(false);
    }
  };
  const toggleProfesional = async (profesionalId) => {
    setGuardando(true);
    try {
      if (asignados.includes(profesionalId)) {
        if (window.removerProfesionalDeServicio) {
          const ok = await window.removerProfesionalDeServicio(servicio.id, profesionalId);
          if (ok) {
            setAsignados(asignados.filter((id) => id !== profesionalId));
          }
        }
      } else {
        if (window.asignarProfesionalAServicio) {
          const ok = await window.asignarProfesionalAServicio(servicio.id, profesionalId);
          if (ok) {
            setAsignados([...asignados, profesionalId]);
          }
        }
      }
    } catch (error) {
      console.error("Error cambiando asignación:", error);
      alert(t("Error al asignar profesional"));
    } finally {
      setGuardando(false);
    }
  };
  if (cargando) {
    return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl p-6" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-8 w-8 border-b-2 border-pink-500 mx-auto" }), /* @__PURE__ */ React.createElement("p", { className: "text-gray-500 mt-4" }, t("Cargando profesionales..."))));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "sticky top-0 bg-white p-4 border-b flex justify-between items-center" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold" }, "👥 ", t('Profesionales para "{servicio}"', { servicio: servicio.nombre })), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "text-gray-500 hover:text-gray-700 text-2xl" }, "×")), /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 mb-4" }, t("Selecciona qué profesionales pueden realizar este servicio."), /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { className: "text-pink-600 text-xs" }, t("Los clientes solo verán los profesionales marcados aquí."))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, profesionales.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-center text-gray-500 py-4" }, t("No hay profesionales activos."), /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { className: "text-xs" }, t('Crea profesionales en la pestaña "Profesionales"'))) : profesionales.map((prof) => {
    const isSelected = asignados.includes(prof.id);
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: prof.id,
        onClick: () => toggleProfesional(prof.id),
        disabled: guardando,
        className: `
                                            w-full flex items-center gap-3 p-3 rounded-lg border transition-all
                                            ${isSelected ? "border-pink-500 bg-pink-50" : "border-gray-200 hover:border-pink-300 hover:bg-pink-50/50"}
                                            ${guardando ? "opacity-50 cursor-wait" : ""}
                                        `
      },
      /* @__PURE__ */ React.createElement("div", { className: `w-10 h-10 ${prof.color || "bg-pink-500"} rounded-full flex items-center justify-center text-white text-lg` }, prof.avatar || "👤"),
      /* @__PURE__ */ React.createElement("div", { className: "flex-1 text-left" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-gray-800" }, prof.nombre), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500" }, prof.especialidad)),
      isSelected && /* @__PURE__ */ React.createElement("div", { className: "text-pink-500 text-xl" }, "✅")
    );
  }))), /* @__PURE__ */ React.createElement("div", { className: "sticky bottom-0 bg-white p-4 border-t" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-500" }, t("{asignados} de {total} profesionales seleccionados", { asignados: asignados.length, total: profesionales.length })), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onClose,
      className: "px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
    },
    t("Cerrar")
  )))));
}
