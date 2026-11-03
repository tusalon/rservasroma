function Catalogo({ onGoBack, onReservarDiseno, cliente }) {
  window.useIdioma();
  const t = window.t;
  const [disenos, setDisenos] = React.useState([]);
  const [cargando, setCargando] = React.useState(true);
  const [categoria, setCategoria] = React.useState("todas");
  const [abierto, setAbierto] = React.useState(null);
  const [config, setConfig] = React.useState(null);
  const [precios, setPrecios] = React.useState({});
  const [servicios, setServicios] = React.useState([]);
  React.useEffect(() => {
    let vivo = true;
    Promise.all([
      window.catalogoObtenerDisenos(),
      window.cargarConfiguracionNegocio(),
      // El .catch() no sobra: sin el, un fallo pidiendo los servicios
      // tumba el Promise.all entero y la galeria sale vacia aunque las
      // fotos ya estuvieran descargadas. Los precios son un adorno; los
      // disenos, no.
      window.salonServicios ? window.salonServicios.getAll(true).catch(() => null) : Promise.resolve(null)
    ]).then(([lista, configData, servicios2]) => {
      if (!vivo) return;
      setDisenos(lista || []);
      setConfig(configData);
      const pedido = new URLSearchParams(window.location.search).get("d");
      const encontrado = pedido && (lista || []).find((d) => String(d.id) === pedido);
      if (encontrado) setAbierto(encontrado);
      if (servicios2) {
        setPrecios(window.catalogoMapaPrecios?.(servicios2) || {});
        setServicios(servicios2);
      }
      setCargando(false);
    }).catch(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, []);
  const colorPrimario = window.asegurarColorVisible ? window.asegurarColorVisible(config?.color_primario, "#ec4899") : config?.color_primario || "#ec4899";
  const grupos = React.useMemo(() => window.catalogoAgrupar(disenos), [disenos]);
  const gruposVisibles = React.useMemo(() => categoria === "todas" ? grupos : grupos.filter((g) => g.nombre === categoria), [grupos, categoria]);
  const enVisor = gruposVisibles.flatMap((g) => g.disenos);
  const posicion = abierto ? enVisor.findIndex((d) => d.id === abierto.id) : -1;
  const moverVisor = (paso) => {
    if (enVisor.length < 2 || posicion < 0) return;
    setAbierto(enVisor[(posicion + paso + enVisor.length) % enVisor.length]);
  };
  const enlaceDiseno = (diseno) => {
    try {
      const url = new URL(window.construirUrlCatalogoNegocio?.(config) || window.location.href);
      url.searchParams.set("ir", "catalogo");
      url.searchParams.set("d", diseno.id);
      return url.toString();
    } catch (e) {
      return window.location.href;
    }
  };
  if (cargando) {
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex items-center justify-center bg-pink-50" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500" }));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gradient-to-b from-pink-50 to-pink-100" }, /* @__PURE__ */ React.createElement(
    Header,
    {
      cliente,
      onGoBack,
      userRol: "cliente",
      showBackButton: true
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "max-w-3xl mx-auto px-4 pb-20" }, /* @__PURE__ */ React.createElement("div", { className: "pt-4 pb-2 text-center" }, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-gray-800" }, "✨ ", t("Nuestro catálogo")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 mt-1" }, t("Elige lo que te enamore y pide tu cita."))), disenos.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-sm p-8 text-center mt-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-4xl mb-3" }, "📸"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-600 font-medium" }, t("Todavía no hay fotos en el catálogo")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-400 mt-1" }, t("Vuelve pronto: el salón está preparando su catálogo."))) : /* @__PURE__ */ React.createElement(React.Fragment, null, grupos.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "sticky top-0 z-10 -mx-4 px-4 py-3 bg-pink-50/90 backdrop-blur" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto pb-1" }, /* @__PURE__ */ React.createElement(
    BotonCategoria,
    {
      activo: categoria === "todas",
      color: colorPrimario,
      onClick: () => setCategoria("todas"),
      texto: `${t("Todas")} · ${disenos.length}`
    }
  ), grupos.map((g) => /* @__PURE__ */ React.createElement(
    BotonCategoria,
    {
      key: g.nombre,
      activo: categoria === g.nombre,
      color: colorPrimario,
      onClick: () => setCategoria(g.nombre),
      texto: `${g.nombre} · ${g.disenos.length}`
    }
  )))), /* @__PURE__ */ React.createElement("div", { className: "pt-3 space-y-6" }, gruposVisibles.map((grupo) => /* @__PURE__ */ React.createElement("section", { key: grupo.nombre }, /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline justify-between mb-2" }, /* @__PURE__ */ React.createElement("h2", { className: "text-base font-bold text-gray-800" }, grupo.nombre), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400" }, grupo.disenos.length === 1 ? t("1 foto") : t("{n} fotos", { n: grupo.disenos.length }))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3" }, grupo.disenos.map((diseno) => /* @__PURE__ */ React.createElement(
    TarjetaDiseno,
    {
      key: diseno.id,
      diseno,
      precio: precios[String(diseno.servicio_id)],
      onClick: () => setAbierto(diseno)
    }
  )))))))), abierto && /* @__PURE__ */ React.createElement(
    ModalDiseno,
    {
      key: abierto.id,
      diseno: disenos.find((d) => d.id === abierto.id) || abierto,
      posicion,
      total: enVisor.length,
      onAnterior: () => moverVisor(-1),
      onSiguiente: () => moverVisor(1),
      enlace: enlaceDiseno(abierto),
      precio: precios[String(abierto.servicio_id)],
      servicio: servicios.find((s) => String(s.id) === String(abierto.servicio_id)),
      colorPrimario,
      cliente,
      onCerrar: () => setAbierto(null),
      onReservar: onReservarDiseno,
      onVotoEnviado: (id, promedio, conteo) => {
        setDisenos((actual) => actual.map((d) => d.id === id ? { ...d, votos_suma: promedio * conteo, votos_conteo: conteo } : d));
      }
    }
  ));
}
function BotonCategoria({ activo, color, onClick, texto }) {
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick,
      className: `whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium border transition ${activo ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-200"}`,
      style: activo ? { backgroundColor: color } : void 0
    },
    texto
  );
}
function TarjetaDiseno({ diseno, onClick, precio }) {
  const [cargada, setCargada] = React.useState(false);
  const meGusta = parseInt(diseno.votos_conteo, 10) || 0;
  const miniatura = window.urlImagenCloudinary(diseno.imagen_url, 500);
  const borrosa = window.urlImagenCloudinary(diseno.imagen_url, 24);
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick,
      className: "text-left bg-white rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition"
    },
    /* @__PURE__ */ React.createElement("div", { className: "relative aspect-square bg-pink-100" }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: borrosa,
        alt: "",
        "aria-hidden": "true",
        className: "absolute inset-0 w-full h-full object-cover blur-lg scale-110"
      }
    ), /* @__PURE__ */ React.createElement(
      "img",
      {
        src: miniatura,
        alt: diseno.titulo,
        loading: "lazy",
        onLoad: () => setCargada(true),
        className: `relative w-full h-full object-cover transition-opacity duration-500 ${cargada ? "opacity-100" : "opacity-0"}`
      }
    ), meGusta > 0 && /* @__PURE__ */ React.createElement("span", { className: "absolute right-2 top-2 bg-white/90 text-pink-600 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm" }, "♥ ", meGusta)),
    /* @__PURE__ */ React.createElement("div", { className: "p-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-gray-800 line-clamp-2" }, diseno.titulo), diseno.servicio_nombre && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-0.5 truncate" }, diseno.servicio_nombre), precio && /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold text-gray-700 mt-0.5 truncate" }, precio))
  );
}
function ModalDiseno({ diseno, precio, servicio, colorPrimario, cliente, onCerrar, onReservar, onVotoEnviado, posicion, total, onAnterior, onSiguiente, enlace }) {
  window.useIdioma();
  const t = window.t;
  const votoPrevio = window.catalogoVotoPropio(diseno.id);
  const [meEncanta, setMeEncanta] = React.useState(votoPrevio !== null);
  const [enviando, setEnviando] = React.useState(false);
  const [textoCompleto, setTextoCompleto] = React.useState(false);
  const meGusta = parseInt(diseno.votos_conteo, 10) || 0;
  const inicioToque = React.useRef(null);
  const alSoltar = (e) => {
    if (inicioToque.current === null) return;
    const dx = e.changedTouches[0].clientX - inicioToque.current;
    inicioToque.current = null;
    if (Math.abs(dx) > 50) (dx < 0 ? onSiguiente : onAnterior)();
  };
  const descripcion = String(diseno.descripcion || "");
  const descripcionLarga = descripcion.length > 220;
  const marcarMeEncanta = async () => {
    if (meEncanta || enviando) return;
    setEnviando(true);
    const nombre = cliente?.nombre || window.catalogoNombreGuardado() || "";
    const resultado = await window.catalogoVotar(diseno.id, 100, nombre, diseno.titulo);
    setEnviando(false);
    if (!resultado.success) return;
    setMeEncanta(true);
    const conteo = meGusta + 1;
    const suma = (parseInt(diseno.votos_suma, 10) || 0) + 100;
    onVotoEnviado(diseno.id, Math.round(suma / conteo), conteo);
  };
  const compartir = async () => {
    const datos = {
      title: diseno.titulo,
      text: `${diseno.titulo} ✨`,
      url: enlace || window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(datos);
      } else {
        await navigator.clipboard.writeText(`${datos.text} ${datos.url}`);
        alert(t("Enlace copiado"));
      }
    } catch (e) {
    }
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4",
      onClick: onCerrar
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto",
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "relative",
          onTouchStart: (e) => {
            inicioToque.current = e.touches[0].clientX;
          },
          onTouchEnd: alSoltar
        },
        /* @__PURE__ */ React.createElement(
          "img",
          {
            src: window.urlImagenCloudinary(diseno.imagen_url, 900),
            alt: diseno.titulo,
            className: "w-full max-h-[55vh] object-contain bg-pink-50 rounded-t-3xl"
          }
        ),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: onCerrar,
            "aria-label": t("Cerrar"),
            className: "absolute right-3 top-3 w-9 h-9 rounded-full bg-white/90 shadow text-gray-600 text-lg leading-none"
          },
          "✕"
        ),
        total > 1 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: onAnterior,
            "aria-label": t("Diseño anterior"),
            className: "absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow text-gray-800 text-2xl leading-none"
          },
          "‹"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: onSiguiente,
            "aria-label": t("Diseño siguiente"),
            className: "absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow text-gray-800 text-2xl leading-none"
          },
          "›"
        ), /* @__PURE__ */ React.createElement("span", { className: "absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/55 text-white text-xs font-bold px-2.5 py-1 rounded-full tabular-nums" }, posicion + 1, " / ", total))
      ),
      /* @__PURE__ */ React.createElement("div", { className: "p-4 space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-bold text-gray-800" }, diseno.titulo), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mt-0.5" }, diseno.categoria), precio && /* @__PURE__ */ React.createElement("p", { className: "text-base font-bold mt-1", style: { color: colorPrimario } }, precio)), descripcion && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: `text-sm text-gray-600 whitespace-pre-line ${textoCompleto || !descripcionLarga ? "" : "line-clamp-4"}` }, descripcion), descripcionLarga && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setTextoCompleto(!textoCompleto),
          className: "text-xs font-medium mt-1",
          style: { color: colorPrimario }
        },
        textoCompleto ? t("Ver menos") : t("Ver más")
      )), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => onReservar(diseno),
          className: "w-full text-white font-bold py-3 rounded-full shadow-lg active:scale-[0.98] transition flex items-center justify-center gap-2",
          style: { backgroundColor: colorPrimario }
        },
        /* @__PURE__ */ React.createElement("span", null, t("Pedir mi cita"))
      ), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 text-center -mt-2" }, servicio ? t("Se reserva como: {servicio}", { servicio: [servicio.nombre, servicio.duracion ? `${servicio.duracion} min` : "", precio].filter(Boolean).join(" · ") }) : t("Al pedir la cita, elige el servicio que más se parezca.")), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: marcarMeEncanta,
          disabled: enviando,
          className: `w-full py-2.5 rounded-full text-sm font-bold border-2 transition ${meEncanta ? "border-pink-500 bg-pink-50 text-pink-600" : "border-gray-200 text-gray-700"}`
        },
        meEncanta ? `♥ ${t("Te encanta")}` : `♡ ${t("Me encanta")}`,
        meGusta > 0 ? ` · ${meGusta}` : ""
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: compartir,
          className: "w-full py-2.5 rounded-full border border-gray-200 text-gray-600 text-sm font-medium"
        },
        "🔗 ",
        t("Compartir este diseño")
      ))
    )
  );
}
