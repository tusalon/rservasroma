function WelcomeScreen({ onStart, onGoBack, cliente, userRol, onMisReservas, onCatalogo, onLogout, onReservarOferta }) {
  window.useIdioma();
  const t = window.t;
  const [config, setConfig] = React.useState(null);
  const [cargando, setCargando] = React.useState(true);
  const [imagenCargada, setImagenCargada] = React.useState(false);
  const [proxima, setProxima] = React.useState(null);
  const [oferta, setOferta] = React.useState(null);
  const [mensajeCompleto, setMensajeCompleto] = React.useState(false);
  const [hayCatalogo, setHayCatalogo] = React.useState(false);
  const pushUIVisible = window.RSERVAS_PUSH_UI_VISIBLE === true;
  const esApkConRecientes = React.useMemo(() => {
    try {
      const ua = navigator.userAgent || "";
      const esApk = window.location.hostname === "tusalon.github.io" && (ua.indexOf("RservasromaClientes") !== -1 || /\bwv\b/.test(ua) || !!window.Capacitor);
      if (!esApk) return false;
      const recientes = window.getNegociosRecientes ? window.getNegociosRecientes() : [];
      return recientes.length > 0;
    } catch (e) {
      return false;
    }
  }, []);
  React.useEffect(() => {
    if (!pushUIVisible || !cliente?.whatsapp || !("Notification" in window)) return;
    if (Notification.permission === "granted" && typeof window.solicitarPushRservasRoma === "function") {
      window.solicitarPushRservasRoma({ permission: "granted", defaultRole: "cliente", clienteWhatsapp: cliente.whatsapp }).catch(() => {
      });
    }
  }, []);
  React.useEffect(() => {
    const negocioId = localStorage.getItem("negocioId") || window.NEGOCIO_ID_POR_DEFECTO;
    if (!cliente?.whatsapp || !negocioId) return;
    const d = /* @__PURE__ */ new Date();
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    fetch(
      `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&cliente_whatsapp=eq.${cliente.whatsapp}&fecha=gte.${hoy}&estado=not.in.(Cancelado,Completado,Ausente)&order=fecha.asc,hora_inicio.asc&limit=1&select=servicio,fecha,hora_inicio,estado`,
      { headers: { "apikey": window.SUPABASE_ANON_KEY, "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}` } }
    ).then((r) => r.ok ? r.json() : []).then((lista) => setProxima(Array.isArray(lista) && lista[0] ? lista[0] : null)).catch(() => {
    });
  }, []);
  React.useEffect(() => {
    if (!cliente?.whatsapp || !window.listaEspera?.mias) return;
    window.listaEspera.mias(cliente).then((lista) => setOferta((lista || []).find((f) => window.listaEspera.ofertaVigente(f)) || null)).catch(() => {
    });
  }, []);
  React.useEffect(() => {
    const cargarDatos = async () => {
      const configData = await window.cargarConfiguracionNegocio();
      console.log("📱 WelcomeScreen - Config cargada:", configData);
      setConfig(configData);
      setCargando(false);
      window.catalogoObtenerDisenos?.().then((lista) => setHayCatalogo((lista || []).length > 0)).catch(() => {
      });
    };
    cargarDatos();
  }, []);
  if (cargando) {
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex items-center justify-center bg-pink-50" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500" }));
  }
  const colorPrimario = config?.color_primario || "#ec4899";
  const colorSecundario = config?.color_secundario || "#f9a8d4";
  const hexToRgba = (hex, alpha = 1) => {
    const limpio = String(hex || "").replace("#", "");
    if (limpio.length !== 6) return `rgba(236, 72, 153, ${alpha})`;
    const r = parseInt(limpio.slice(0, 2), 16);
    const g = parseInt(limpio.slice(2, 4), 16);
    const b = parseInt(limpio.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const fondoPortada = {
    image: window.getHeroBackgroundImage ? window.getHeroBackgroundImage(config) : config?.imagen_fondo_url || "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=60&w=800&auto=format&fit=crop",
    label: "Fondo de salon"
  };
  const abrirWhatsApp = () => {
    if (!config?.telefono) {
      alert("📱 " + t("El número de WhatsApp no está configurado"));
      return;
    }
    const telefonoWhatsApp = window.normalizarTelefonoInternacional ? window.normalizarTelefonoInternacional(config.telefono, config.codigo_pais) : config.telefono.replace(/\D/g, "");
    const mensaje = encodeURIComponent(`Hola! Quiero consultar sobre turnos en ${config?.nombre || t("el salón")}`);
    window.open(`https://wa.me/${telefonoWhatsApp}?text=${mensaje}`, "_blank");
  };
  const abrirInstagram = () => {
    if (!config?.instagram) {
      alert("📷 " + t("El usuario de Instagram no está configurado"));
      return;
    }
    let usuario = config.instagram.replace("@", "").trim();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `instagram://user?username=${usuario}`;
      setTimeout(() => {
        window.open(`https://instagram.com/${usuario}`, "_blank");
      }, 1e3);
    } else {
      window.open(`https://instagram.com/${usuario}`, "_blank");
    }
  };
  const abrirFacebook = () => {
    if (!config?.facebook) {
      alert("👤 " + t("La página de Facebook no está configurada"));
      return;
    }
    let pagina = config.facebook.trim();
    if (!pagina.startsWith("http")) {
      pagina = pagina.replace("@", "");
      pagina = `https://facebook.com/${pagina}`;
    }
    window.open(pagina, "_blank");
  };
  const tieneWhatsApp = config?.telefono && config.telefono.length >= 8;
  const tieneInstagram = config?.instagram && config.instagram.trim() !== "";
  const tieneFacebook = config?.facebook && config.facebook.trim() !== "";
  const tieneRedes = tieneWhatsApp || tieneInstagram || tieneFacebook;
  const nombreSalon = config?.nombre || t("Mi Salón");
  const primerNombre = cliente ? String(cliente.nombre || "").split(" ")[0] : "";
  const inicial = String(nombreSalon).trim().charAt(0).toUpperCase() || "✨";
  const sombraTexto = "0 2px 14px rgba(20, 8, 14, 0.55)";
  const botonSuave = {
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.45)"
  };
  return /* @__PURE__ */ React.createElement("div", { className: "client-welcome-screen relative min-h-screen w-full overflow-y-auto" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "client-welcome-background fixed inset-0 z-0",
      style: { background: `linear-gradient(160deg, ${colorPrimario}, ${colorSecundario})` }
    },
    /* @__PURE__ */ React.createElement(
      "img",
      {
        src: fondoPortada.image,
        alt: t("Fondo de salón"),
        onLoad: () => setImagenCargada(true),
        className: `client-welcome-background-image w-full h-full object-cover transition-opacity duration-700 ${imagenCargada ? "opacity-100" : "opacity-0"}`
      }
    ),
    /* @__PURE__ */ React.createElement("div", { className: "client-welcome-overlay absolute inset-0" })
  ), onGoBack && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onGoBack,
      className: "client-welcome-back fixed top-4 left-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
      style: { backgroundColor: "rgba(255,255,255,0.88)", boxShadow: "0 4px 14px rgba(20,8,14,0.25)" },
      title: t("Volver")
    },
    /* @__PURE__ */ React.createElement("i", { className: "icon-arrow-left text-xl", style: { color: "#1f2937" } })
  ), /* @__PURE__ */ React.createElement("div", { className: "client-welcome-content relative z-10" }, /* @__PURE__ */ React.createElement("header", { className: "text-center px-3 pt-4 pb-20" }, cliente ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-white/90", style: { textShadow: sombraTexto } }, t("Qué alegría verte otra vez")), /* @__PURE__ */ React.createElement("h1", { className: "text-3xl font-extrabold text-white leading-tight mt-1", style: { textShadow: sombraTexto } }, t("Hola, {nombre}", { nombre: primerNombre }), " ", /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "👋"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-white/90", style: { textShadow: sombraTexto } }, t("Bienvenida a")), /* @__PURE__ */ React.createElement("h1", { className: "text-3xl font-extrabold text-white leading-tight mt-1 break-words", style: { textShadow: sombraTexto } }, nombreSalon))), /* @__PURE__ */ React.createElement("div", { className: "client-welcome-card mt-auto mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "text-center space-y-4" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "mx-auto flex items-center justify-center rounded-full overflow-hidden",
      style: { width: 80, height: 80, marginTop: -66, background: "#fff", border: "4px solid #fff", boxShadow: `0 10px 26px ${hexToRgba(colorPrimario, 0.32)}` }
    },
    config?.logo_url ? /* @__PURE__ */ React.createElement("img", { src: config.logo_url, alt: nombreSalon, className: "w-full h-full object-contain" }) : /* @__PURE__ */ React.createElement(
      "span",
      {
        className: "w-full h-full flex items-center justify-center text-3xl font-extrabold text-white",
        style: { background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})` }
      },
      inicial
    )
  ), cliente && /* @__PURE__ */ React.createElement("p", { className: "text-lg font-bold text-white break-words leading-tight", style: { marginTop: 10 } }, nombreSalon), /* @__PURE__ */ React.createElement("div", { className: "text-left rounded-2xl px-4 py-3", style: { background: "rgba(255,255,255,0.16)" } }, /* @__PURE__ */ React.createElement("p", { className: `text-[14px] text-white leading-relaxed whitespace-pre-line ${mensajeCompleto ? "" : "line-clamp-4"}` }, config?.mensaje_bienvenida || t("¡Bienvenida a nuestro salón!")), String(config?.mensaje_bienvenida || "").length > 160 && /* @__PURE__ */ React.createElement("button", { onClick: () => setMensajeCompleto(!mensajeCompleto), className: "text-xs font-bold underline underline-offset-2 mt-1 text-white" }, mensajeCompleto ? t("Ver menos") : t("Ver más"))), (config?.horario_atencion || tieneRedes) && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center gap-3 flex-wrap" }, config?.horario_atencion && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-white/90 flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "🕐"), config.horario_atencion), tieneRedes && /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, tieneWhatsApp && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: abrirWhatsApp,
      title: t("WhatsApp"),
      "aria-label": t("WhatsApp"),
      style: { width: 40, height: 40, minWidth: 0, minHeight: 0 },
      className: "bg-[#25D366] rounded-full flex items-center justify-center active:scale-95 transition-transform"
    },
    /* @__PURE__ */ React.createElement("i", { className: "icon-message-circle text-white text-lg" })
  ), tieneInstagram && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: abrirInstagram,
      title: t("Instagram"),
      "aria-label": t("Instagram"),
      style: { width: 40, height: 40, minWidth: 0, minHeight: 0 },
      className: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-full flex items-center justify-center active:scale-95 transition-transform"
    },
    /* @__PURE__ */ React.createElement("i", { className: "icon-instagram text-white text-lg" })
  ), tieneFacebook && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: abrirFacebook,
      title: t("Facebook"),
      "aria-label": t("Facebook"),
      style: { width: 40, height: 40, minWidth: 0, minHeight: 0 },
      className: "bg-[#1877F2] rounded-full flex items-center justify-center active:scale-95 transition-transform"
    },
    /* @__PURE__ */ React.createElement("i", { className: "icon-facebook text-white text-lg" })
  ))), oferta && onReservarOferta && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onReservarOferta(oferta),
      className: "w-full text-left rounded-2xl px-4 py-3 flex items-center gap-3",
      style: { background: "#fff", border: `2px solid ${colorPrimario}`, boxShadow: `0 10px 24px ${hexToRgba(colorPrimario, 0.22)}` }
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-3xl", "aria-hidden": "true" }, "🎉"),
    /* @__PURE__ */ React.createElement("span", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] font-bold uppercase tracking-wide", style: { color: colorPrimario } }, t("¡Se liberó una hora para ti!")), /* @__PURE__ */ React.createElement("span", { className: "block font-bold text-gray-900 leading-snug" }, window.formatFechaCompleta ? window.formatFechaCompleta(oferta.fecha) : oferta.fecha, " · ", window.formatTo12Hour ? window.formatTo12Hour(oferta.oferta_hora) : oferta.oferta_hora), /* @__PURE__ */ React.createElement("span", { className: "block text-sm text-gray-600" }, oferta.servicio, oferta.oferta_profesional_nombre ? ` · ${oferta.oferta_profesional_nombre}` : "", " · ", t("Te la guardamos hasta las {hora}.", { hora: window.listaEspera.horaLimite(oferta.oferta_hasta) }))),
    /* @__PURE__ */ React.createElement("span", { className: "shrink-0 rounded-full px-3 py-1.5 text-sm font-bold text-white", style: { background: colorPrimario } }, t("Reservarla"))
  ), proxima && onMisReservas && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onMisReservas,
      className: "w-full text-left rounded-2xl px-4 py-3 flex items-center gap-3",
      style: { background: "#fff", border: `1px solid ${hexToRgba(colorPrimario, 0.22)}`, borderLeft: `5px solid ${colorPrimario}`, boxShadow: `0 6px 18px ${hexToRgba(colorPrimario, 0.12)}` }
    },
    /* @__PURE__ */ React.createElement("span", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] font-bold uppercase tracking-wide text-gray-500" }, t("Tu próxima cita")), /* @__PURE__ */ React.createElement("span", { className: "block font-bold text-gray-900 leading-snug" }, window.formatFechaCompleta ? window.formatFechaCompleta(proxima.fecha) : proxima.fecha, " · ", window.formatTo12Hour ? window.formatTo12Hour(proxima.hora_inicio) : proxima.hora_inicio), /* @__PURE__ */ React.createElement("span", { className: `block text-sm ${proxima.estado === "Pendiente" ? "text-amber-700 font-semibold" : "text-gray-600"}` }, proxima.estado === "Pendiente" ? t("Falta el anticipo · toca para enviarlo") : proxima.servicio)),
    /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 text-xl" }, "›")
  ), cliente && window.TarjetaFidelidad && /* @__PURE__ */ React.createElement(window.TarjetaFidelidad, { cliente, config, onReservar: onStart }), /* @__PURE__ */ React.createElement("div", { className: "space-y-2.5 pt-1" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onStart,
      className: "w-full text-white font-bold py-3.5 rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[17px]",
      style: {
        background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`,
        boxShadow: `0 12px 26px ${hexToRgba(colorPrimario, 0.38)}`
      }
    },
    /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "💖"),
    /* @__PURE__ */ React.createElement("span", null, t("Reservar cita"))
  ), cliente && onMisReservas && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onMisReservas,
      style: botonSuave,
      className: "w-full font-semibold py-3 rounded-full transition flex items-center justify-center gap-2 text-white active:scale-[0.98]"
    },
    /* @__PURE__ */ React.createElement("i", { className: "icon-calendar" }),
    /* @__PURE__ */ React.createElement("span", null, t("Mis Citas"))
  ), hayCatalogo && onCatalogo && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onCatalogo,
      style: botonSuave,
      className: "w-full font-semibold py-3 rounded-full transition flex items-center justify-center gap-2 text-white active:scale-[0.98]"
    },
    /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "✨"),
    /* @__PURE__ */ React.createElement("span", null, t("Explorar catálogo"))
  )), cliente && onLogout && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onLogout,
      className: "text-white/80 text-xs hover:text-white transition mx-auto block underline underline-offset-2 py-1"
    },
    t("Cerrar sesión")
  ), esApkConRecientes && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        window.location.href = "app-clientes.html";
      },
      className: "text-white/80 text-xs hover:text-white transition mx-auto block underline underline-offset-2 py-1"
    },
    "🔄 ",
    t("Cambiar de salón")
  )))));
}
