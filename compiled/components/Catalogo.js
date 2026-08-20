function Catalogo({ onGoBack, onReservarDiseno, cliente }) {
  window.useIdioma();
  const t = window.t;
  const [disenos, setDisenos] = React.useState([]);
  const [cargando, setCargando] = React.useState(true);
  const [categoria, setCategoria] = React.useState("todas");
  const [abierto, setAbierto] = React.useState(null);
  const [config, setConfig] = React.useState(null);
  React.useEffect(() => {
    let vivo = true;
    Promise.all([
      window.catalogoObtenerDisenos(),
      window.cargarConfiguracionNegocio()
    ]).then(([lista, configData]) => {
      if (!vivo) return;
      setDisenos(lista || []);
      setConfig(configData);
      setCargando(false);
    }).catch(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, []);
  const colorPrimario = window.asegurarColorVisible ? window.asegurarColorVisible(config?.color_primario, "#ec4899") : config?.color_primario || "#ec4899";
  const grupos = React.useMemo(() => window.catalogoAgrupar(disenos), [disenos]);
  const gruposVisibles = React.useMemo(() => categoria === "todas" ? grupos : grupos.filter((g) => g.nombre === categoria), [grupos, categoria]);
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
      onClick: () => setAbierto(diseno)
    }
  )))))))), abierto && /* @__PURE__ */ React.createElement(
    ModalDiseno,
    {
      diseno: disenos.find((d) => d.id === abierto.id) || abierto,
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
function TarjetaDiseno({ diseno, onClick }) {
  const [cargada, setCargada] = React.useState(false);
  const promedio = window.catalogoPromedio(diseno);
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
    ), promedio !== null && /* @__PURE__ */ React.createElement("span", { className: "absolute right-2 top-2 bg-white/90 text-pink-600 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm" }, "❤️ ", promedio, "%")),
    /* @__PURE__ */ React.createElement("div", { className: "p-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-gray-800 line-clamp-2" }, diseno.titulo), diseno.servicio_nombre && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-0.5 truncate" }, diseno.servicio_nombre))
  );
}
function ModalDiseno({ diseno, colorPrimario, cliente, onCerrar, onReservar, onVotoEnviado }) {
  window.useIdioma();
  const t = window.t;
  const votoPrevio = window.catalogoVotoPropio(diseno.id);
  const [puntuacion, setPuntuacion] = React.useState(votoPrevio === null ? 80 : votoPrevio);
  const [enviando, setEnviando] = React.useState(false);
  const [votado, setVotado] = React.useState(votoPrevio !== null);
  const [textoCompleto, setTextoCompleto] = React.useState(false);
  const [nombre, setNombre] = React.useState(
    () => cliente?.nombre || window.catalogoNombreGuardado() || ""
  );
  const promedio = window.catalogoPromedio(diseno);
  const descripcion = String(diseno.descripcion || "");
  const descripcionLarga = descripcion.length > 220;
  const enviarVoto = async () => {
    setEnviando(true);
    const resultado = await window.catalogoVotar(diseno.id, puntuacion, nombre, diseno.titulo);
    setEnviando(false);
    if (!resultado.success) {
      alert(t("No se pudo enviar tu voto. Revisa tu conexión."));
      return;
    }
    setVotado(true);
    const conteo = (parseInt(diseno.votos_conteo, 10) || 0) + (votoPrevio === null ? 1 : 0);
    const suma = (parseInt(diseno.votos_suma, 10) || 0) - (votoPrevio || 0) + puntuacion;
    onVotoEnviado(diseno.id, Math.round(suma / Math.max(1, conteo)), conteo);
  };
  const compartir = async () => {
    const datos = {
      title: diseno.titulo,
      text: `${diseno.titulo} 💅`,
      url: window.location.href
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
      /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
        "img",
        {
          src: window.urlImagenCloudinary(diseno.imagen_url, 900),
          alt: diseno.titulo,
          className: "w-full max-h-[55vh] object-contain bg-pink-50 rounded-t-3xl"
        }
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: onCerrar,
          className: "absolute right-3 top-3 w-9 h-9 rounded-full bg-white/90 shadow text-gray-600 text-lg leading-none"
        },
        "✕"
      )),
      /* @__PURE__ */ React.createElement("div", { className: "p-4 space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-bold text-gray-800" }, diseno.titulo), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-0.5" }, diseno.categoria, promedio !== null && ` · ❤️ ${promedio}% (${diseno.votos_conteo})`)), descripcion && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: `text-sm text-gray-600 whitespace-pre-line ${textoCompleto || !descripcionLarga ? "" : "line-clamp-4"}` }, descripcion), descripcionLarga && /* @__PURE__ */ React.createElement(
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
        /* @__PURE__ */ React.createElement("span", null, "💖"),
        /* @__PURE__ */ React.createElement("span", null, t("Pedir mi cita"))
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: compartir,
          className: "w-full py-2.5 rounded-full border border-gray-200 text-gray-600 text-sm font-medium"
        },
        "🔗 ",
        t("Compartir")
      ), /* @__PURE__ */ React.createElement("div", { className: "bg-pink-50 rounded-2xl p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-gray-700 mb-2" }, votado ? t("Tu voto: {n}%", { n: puntuacion }) : t("¿Cuánto te gusta?")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0",
          max: "100",
          step: "5",
          value: puntuacion,
          onChange: (e) => setPuntuacion(parseInt(e.target.value, 10)),
          className: "flex-1 accent-pink-500"
        }
      ), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold w-12 text-right", style: { color: colorPrimario } }, puntuacion, "%")), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          value: nombre,
          maxLength: 60,
          onChange: (e) => setNombre(e.target.value),
          placeholder: t("¿Cómo te llamas? (opcional)"),
          className: "w-full mt-3 px-3 py-2 rounded-xl border border-pink-200 bg-white text-sm outline-none focus:border-pink-400"
        }
      ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-1" }, t("Así el salón sabe a quién le gustó su trabajo 💕")), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: enviarVoto,
          disabled: enviando,
          className: "w-full mt-3 py-2 rounded-full text-white text-sm font-bold disabled:opacity-60",
          style: { backgroundColor: colorPrimario }
        },
        enviando ? t("Enviando...") : votado ? t("Cambiar mi voto") : t("Enviar mi voto")
      )))
    )
  );
}
