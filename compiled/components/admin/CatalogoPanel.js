function CatalogoPanel() {
  window.useIdioma();
  const t = window.t;
  const [disenos, setDisenos] = React.useState([]);
  const [servicios, setServicios] = React.useState([]);
  const [cargando, setCargando] = React.useState(true);
  const [subiendo, setSubiendo] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);
  const [editando, setEditando] = React.useState(null);
  const formVacio = {
    titulo: "",
    descripcion: "",
    imagen_url: "",
    categoria: "",
    servicio_id: "",
    orden: "99"
  };
  const [form, setForm] = React.useState(formVacio);
  const [urlCatalogo, setUrlCatalogo] = React.useState("");
  const [copiado, setCopiado] = React.useState(false);
  const [votos, setVotos] = React.useState({});
  const [cargandoVotos, setCargandoVotos] = React.useState(null);
  const [guardandoOrden, setGuardandoOrden] = React.useState(false);
  const cargar = React.useCallback(async () => {
    setCargando(true);
    window.catalogoInvalidarCache();
    const [lista, serviciosLista] = await Promise.all([
      window.catalogoObtenerDisenos({ incluirOcultos: true, forzar: true }),
      window.salonServicios.getAll(true)
    ]);
    setDisenos(lista || []);
    setServicios(serviciosLista || []);
    setCargando(false);
    try {
      const config = await window.cargarConfiguracionNegocio();
      setUrlCatalogo(window.construirUrlCatalogoNegocio?.(config) || "");
    } catch (e) {
      console.error("No se pudo armar el enlace del catálogo:", e);
    }
  }, []);
  React.useEffect(() => {
    cargar();
  }, [cargar]);
  const grupos = React.useMemo(() => window.catalogoAgrupar(disenos), [disenos]);
  const categoriasUsadas = React.useMemo(
    () => window.catalogoCategorias(disenos).map((c) => c.nombre),
    [disenos]
  );
  const compartirCatalogo = async () => {
    if (!urlCatalogo) return;
    const nombre = await window.getNombreNegocio?.() || "nuestro salón";
    const texto = t("✨ Mira el catálogo de {nombre} y pide tu cita:", { nombre });
    try {
      if (navigator.share) {
        await navigator.share({ title: t("Catálogo"), text: texto, url: urlCatalogo });
        return;
      }
      await navigator.clipboard.writeText(`${texto} ${urlCatalogo}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (e) {
    }
  };
  const copiarEnlace = async () => {
    if (!urlCatalogo) return;
    try {
      await navigator.clipboard.writeText(urlCatalogo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (e) {
      alert(t("No se pudo copiar. Copia el enlace a mano."));
    }
  };
  const moverDiseno = async (diseno, direccion) => {
    const grupo = grupos.find((g) => g.disenos.some((d) => d.id === diseno.id));
    if (!grupo) return;
    const indice = grupo.disenos.findIndex((d) => d.id === diseno.id);
    const destino = indice + direccion;
    if (destino < 0 || destino >= grupo.disenos.length) return;
    const reordenado = [...grupo.disenos];
    [reordenado[indice], reordenado[destino]] = [reordenado[destino], reordenado[indice]];
    const listaPlana = grupos.flatMap((g) => g.nombre === grupo.nombre ? reordenado : g.disenos);
    setDisenos(listaPlana.map((d, i) => ({ ...d, orden: i + 1 })));
    setGuardandoOrden(true);
    const resultado = await window.catalogoReordenar(listaPlana);
    setGuardandoOrden(false);
    if (!resultado.success) {
      alert(t("No se pudo guardar el orden. Revisa tu conexión."));
      cargar();
    }
  };
  const alternarVotos = async (diseno) => {
    if (votos[diseno.id]) {
      setVotos((actual) => {
        const copia = { ...actual };
        delete copia[diseno.id];
        return copia;
      });
      return;
    }
    setCargandoVotos(diseno.id);
    const lista = await window.catalogoObtenerVotos(diseno.id);
    setCargandoVotos(null);
    setVotos((actual) => ({ ...actual, [diseno.id]: lista }));
  };
  const subirFoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!window.subirImagenCatalogo) {
      alert(t("No se cargó el subidor de imágenes. Recarga la página."));
      return;
    }
    setSubiendo(true);
    try {
      const resultado = await window.subirImagenCatalogo(file, form.titulo || "diseno");
      if (resultado?.url) setForm((actual) => ({ ...actual, imagen_url: resultado.url }));
    } finally {
      setSubiendo(false);
    }
  };
  const abrirEdicion = (diseno) => {
    setEditando(diseno.id);
    setForm({
      titulo: diseno.titulo || "",
      descripcion: diseno.descripcion || "",
      imagen_url: diseno.imagen_url || "",
      categoria: diseno.categoria || "",
      servicio_id: diseno.servicio_id || "",
      orden: String(diseno.orden ?? 99)
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelar = () => {
    setEditando(null);
    setForm(formVacio);
  };
  const guardar = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) {
      alert(t("Ponle un título a la foto."));
      return;
    }
    if (!form.imagen_url) {
      alert(t("Sube la foto."));
      return;
    }
    const servicio = servicios.find((s) => String(s.id) === String(form.servicio_id));
    const datos = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      imagen_url: form.imagen_url,
      categoria: form.categoria.trim() || "general",
      servicio_id: form.servicio_id || null,
      servicio_nombre: servicio?.nombre || null,
      orden: parseInt(form.orden, 10) || 99
    };
    setGuardando(true);
    const resultado = editando ? await window.catalogoActualizarDiseno(editando, datos) : await window.catalogoCrearDiseno(datos);
    setGuardando(false);
    if (!resultado.success) {
      alert(t("No se pudo guardar la foto."));
      return;
    }
    cancelar();
    cargar();
  };
  const alternarVisible = async (diseno) => {
    await window.catalogoActualizarDiseno(diseno.id, { activo: !diseno.activo });
    cargar();
  };
  const eliminar = async (diseno) => {
    if (!confirm(t('¿Eliminar "{titulo}" del catálogo?', { titulo: diseno.titulo }))) return;
    const resultado = await window.catalogoEliminarDiseno(diseno.id, diseno.imagen_url);
    if (!resultado.success) {
      alert(t("No se pudo eliminar."));
      return;
    }
    cargar();
  };
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, urlCatalogo && disenos.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-r from-pink-500 to-pink-400 rounded-xl shadow-sm p-5 text-white" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-bold" }, "🔗 ", t("Comparte tu catálogo")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-white/90 mt-1" }, t("Pégalo en tu biografía de Instagram o mándalo por WhatsApp: abre directo en tu catálogo.")), /* @__PURE__ */ React.createElement("p", { className: "text-xs bg-white/20 rounded-lg px-3 py-2 mt-3 break-all font-mono" }, urlCatalogo), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mt-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: compartirCatalogo,
      className: "px-4 py-2 rounded-lg bg-white text-pink-600 text-sm font-bold hover:bg-pink-50"
    },
    t("Compartir catálogo")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: copiarEnlace,
      className: "px-4 py-2 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30"
    },
    copiado ? t("¡Copiado!") : t("Copiar enlace")
  ))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold mb-1" }, editando ? t("Editar foto") : t("Añadir foto al catálogo")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 mb-4" }, t("Tus clientas verán estas fotos y podrán pedir cita para lo que más les guste.")), /* @__PURE__ */ React.createElement("form", { onSubmit: guardar, className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-24 h-24 rounded-xl bg-pink-50 border border-pink-100 overflow-hidden flex items-center justify-center shrink-0" }, form.imagen_url ? /* @__PURE__ */ React.createElement("img", { src: window.urlImagenCloudinary(form.imagen_url, 200), alt: "", className: "w-full h-full object-cover" }) : /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "📸")), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("label", { className: `inline-block px-4 py-2 rounded-lg bg-pink-500 text-white text-sm font-bold cursor-pointer hover:bg-pink-600 ${subiendo ? "opacity-60 pointer-events-none" : ""}` }, subiendo ? t("Subiendo...") : t("Elegir foto"), /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", onChange: subirFoto, className: "hidden", disabled: subiendo })), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-2" }, t("La foto se comprime sola antes de subirse. Usa una foto clara del trabajo terminado.")))), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: form.titulo,
      maxLength: 90,
      onChange: (e) => setForm({ ...form, titulo: e.target.value }),
      placeholder: t("Título de la foto (ej. Francés con flores doradas)"),
      className: "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
    }
  ), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: form.descripcion,
      rows: 3,
      maxLength: 900,
      onChange: (e) => setForm({ ...form, descripcion: e.target.value }),
      placeholder: t("Descripción: colores, acabado, ocasión... (opcional)"),
      className: "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: form.categoria,
      maxLength: 40,
      list: "catalogo-categorias",
      onChange: (e) => setForm({ ...form, categoria: e.target.value }),
      placeholder: t("Categoría"),
      className: "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
    }
  ), /* @__PURE__ */ React.createElement("datalist", { id: "catalogo-categorias" }, categoriasUsadas.map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c })))), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: form.servicio_id,
      onChange: (e) => setForm({ ...form, servicio_id: e.target.value }),
      className: "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, t("Servicio (opcional)")),
    servicios.map((s) => /* @__PURE__ */ React.createElement("option", { key: s.id, value: s.id }, s.nombre))
  )), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400" }, t("Si eliges un servicio, la clienta que pida cita desde esta foto lo tendrá ya seleccionado."), " ", t("El orden se ajusta después con las flechas de cada foto.")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "submit",
      disabled: guardando,
      className: "px-5 py-2 rounded-lg bg-pink-500 text-white text-sm font-bold hover:bg-pink-600 disabled:opacity-60"
    },
    guardando ? t("Guardando...") : editando ? t("Guardar cambios") : t("Publicar foto")
  ), editando && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: cancelar,
      className: "px-5 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium"
    },
    t("Cancelar")
  )))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-bold mb-4" }, t("Publicados ({n})", { n: disenos.length })), cargando ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-400" }, t("Cargando...")) : disenos.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-400" }, t("Todavía no has subido ninguna foto. Empieza con tus 5 mejores trabajos.")) : (
    /* Agrupado igual que en la app de la clienta: así la dueña
       ve el catálogo tal como queda publicado. */
    /* @__PURE__ */ React.createElement("div", { className: "space-y-5" }, grupos.map((grupo) => /* @__PURE__ */ React.createElement("section", { key: grupo.nombre }, /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline justify-between mb-2 pb-1 border-b border-gray-100" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold text-gray-700" }, grupo.nombre), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400" }, grupo.disenos.length === 1 ? t("1 foto") : t("{n} fotos", { n: grupo.disenos.length }))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, grupo.disenos.map((diseno, indice) => {
      const promedio = window.catalogoPromedio(diseno);
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: diseno.id,
          className: `flex gap-3 border rounded-xl p-3 ${diseno.activo ? "border-gray-100" : "border-gray-200 bg-gray-50 opacity-70"}`
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex flex-col justify-center gap-1 shrink-0" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => moverDiseno(diseno, -1),
            disabled: indice === 0 || guardandoOrden,
            title: t("Subir"),
            className: "w-7 h-7 rounded-lg bg-gray-100 text-gray-600 text-xs disabled:opacity-30"
          },
          "▲"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => moverDiseno(diseno, 1),
            disabled: indice === grupo.disenos.length - 1 || guardandoOrden,
            title: t("Bajar"),
            className: "w-7 h-7 rounded-lg bg-gray-100 text-gray-600 text-xs disabled:opacity-30"
          },
          "▼"
        )),
        /* @__PURE__ */ React.createElement(
          "img",
          {
            src: window.urlImagenCloudinary(diseno.imagen_url, 160),
            alt: diseno.titulo,
            loading: "lazy",
            className: "w-16 h-16 rounded-lg object-cover shrink-0"
          }
        ),
        /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-gray-800 truncate" }, diseno.titulo), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 truncate" }, diseno.categoria, diseno.servicio_nombre && ` · ${diseno.servicio_nombre}`), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-pink-500 mt-0.5" }, promedio === null ? t("Sin votos todavía") : t("❤️ {p}% · {n} voto(s)", { p: promedio, n: diseno.votos_conteo })), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-3 mt-1.5 text-xs font-medium" }, /* @__PURE__ */ React.createElement("button", { onClick: () => abrirEdicion(diseno), className: "text-blue-600" }, t("Editar")), /* @__PURE__ */ React.createElement("button", { onClick: () => alternarVisible(diseno), className: "text-gray-600" }, diseno.activo ? t("Ocultar") : t("Mostrar")), promedio !== null && /* @__PURE__ */ React.createElement("button", { onClick: () => alternarVotos(diseno), className: "text-pink-600" }, votos[diseno.id] ? t("Ocultar votos") : t("Ver quién votó")), /* @__PURE__ */ React.createElement("button", { onClick: () => eliminar(diseno), className: "text-red-500" }, t("Eliminar"))), cargandoVotos === diseno.id && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-2" }, t("Cargando votos...")), votos[diseno.id] && /* @__PURE__ */ React.createElement("div", { className: "mt-2 rounded-lg bg-pink-50 border border-pink-100 p-2 space-y-1 max-h-40 overflow-y-auto" }, votos[diseno.id].length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400" }, t("Sin votos todavía")) : votos[diseno.id].map((voto, i) => /* @__PURE__ */ React.createElement("p", { key: i, className: "text-xs text-gray-700 flex justify-between gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "truncate" }, voto.nombre || t("Alguien sin nombre")), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-pink-600 shrink-0" }, voto.puntuacion, "%")))))
      );
    })))))
  )));
}
