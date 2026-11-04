function WelcomeScreen({ onStart, onGoBack, cliente, userRol, onMisReservas, onCatalogo, onLogout }) {
  window.useIdioma();
  const t = window.t;
  const [config, setConfig] = React.useState(null);
  const [cargando, setCargando] = React.useState(true);
  const [imagenCargada, setImagenCargada] = React.useState(false);
  const [proxima, setProxima] = React.useState(null);
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
  const sticker = "✨";
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
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "client-welcome-screen relative min-h-screen w-full overflow-y-auto"
    },
    /* @__PURE__ */ React.createElement("div", { className: "client-welcome-background fixed inset-0 z-0 bg-gradient-to-br from-pink-200 via-pink-300 to-pink-400" }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: fondoPortada.image,
        alt: t("Fondo de salón"),
        onLoad: () => setImagenCargada(true),
        className: `client-welcome-background-image w-full h-full object-cover transition-opacity duration-700 ${imagenCargada ? "opacity-100" : "opacity-0"}`
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "client-welcome-overlay absolute inset-0 bg-black/40" })),
    onGoBack && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onGoBack,
        className: "client-welcome-back fixed top-4 left-4 z-20 w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors border",
        style: {
          backgroundColor: hexToRgba(colorPrimario, 0.86),
          borderColor: hexToRgba(colorSecundario, 0.75)
        },
        title: t("Volver")
      },
      /* @__PURE__ */ React.createElement("i", { className: "icon-arrow-left text-white text-xl" })
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "client-welcome-content relative z-10 flex flex-col items-center justify-center px-4",
        style: { minHeight: "100svh", paddingTop: "max(56px, env(safe-area-inset-top))", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "client-welcome-card w-full max-w-sm bg-black/15 backdrop-blur-[1px] p-4 rounded-2xl shadow-2xl border",
          style: {
            borderColor: hexToRgba(colorSecundario, 0.42),
            boxShadow: `0 16px 48px ${hexToRgba(colorPrimario, 0.22)}`
          }
        },
        /* @__PURE__ */ React.createElement("div", { className: "text-center space-y-3" }, config?.logo_url ? /* @__PURE__ */ React.createElement(
          "img",
          {
            src: config.logo_url,
            alt: config.nombre,
            className: "w-14 h-14 object-contain mx-auto rounded-xl shadow-lg ring-2",
            style: { "--tw-ring-color": hexToRgba(colorSecundario, 0.45) }
          }
        ) : /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "w-14 h-14 rounded-xl mx-auto flex items-center justify-center shadow-lg ring-2",
            style: { background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`, "--tw-ring-color": hexToRgba(colorSecundario, 0.45) }
          },
          /* @__PURE__ */ React.createElement("span", { className: "text-3xl" }, sticker)
        ), /* @__PURE__ */ React.createElement("div", null, cliente ? /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-extrabold text-white leading-tight" }, t("Hola, {nombre}", { nombre: String(cliente.nombre || "").split(" ")[0] })) : /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-white/80" }, t("Bienvenida a")), /* @__PURE__ */ React.createElement(
          "div",
          {
            className: `${cliente ? "text-base" : "text-xl"} font-bold break-words leading-tight`,
            style: { color: colorSecundario, textShadow: `0 2px 12px ${hexToRgba(colorPrimario, 0.45)}` }
          },
          config?.nombre || t("Mi Salón")
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: `text-white/85 text-xs max-w-xs mx-auto leading-snug whitespace-pre-line ${mensajeCompleto ? "" : "line-clamp-4"}` }, config?.mensaje_bienvenida || t("¡Bienvenida a nuestro salón!")), String(config?.mensaje_bienvenida || "").length > 160 && /* @__PURE__ */ React.createElement("button", { onClick: () => setMensajeCompleto(!mensajeCompleto), className: "text-xs font-bold text-white underline underline-offset-2 mt-1" }, mensajeCompleto ? t("Ver menos") : t("Ver más"))), tieneRedes && /* @__PURE__ */ React.createElement("div", { className: "flex justify-center gap-3" }, tieneWhatsApp && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: abrirWhatsApp,
            title: t("WhatsApp"),
            className: "w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center border border-white/30 hover:scale-105 transition-transform"
          },
          /* @__PURE__ */ React.createElement("i", { className: "icon-message-circle text-white text-lg" })
        ), tieneInstagram && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: abrirInstagram,
            title: t("Instagram"),
            className: "w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-full flex items-center justify-center border border-white/30 hover:scale-105 transition-transform"
          },
          /* @__PURE__ */ React.createElement("i", { className: "icon-instagram text-white text-lg" })
        ), tieneFacebook && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: abrirFacebook,
            title: t("Facebook"),
            className: "w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center border border-white/30 hover:scale-105 transition-transform"
          },
          /* @__PURE__ */ React.createElement("i", { className: "icon-facebook text-white text-lg" })
        )), proxima && onMisReservas && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: onMisReservas,
            className: "w-full text-left bg-white/95 rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3"
          },
          /* @__PURE__ */ React.createElement("span", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "block text-xs font-bold uppercase tracking-wide text-gray-500" }, t("Tu próxima cita")), /* @__PURE__ */ React.createElement("span", { className: "block font-bold text-gray-900 truncate" }, window.formatFechaCompleta ? window.formatFechaCompleta(proxima.fecha) : proxima.fecha, " · ", window.formatTo12Hour ? window.formatTo12Hour(proxima.hora_inicio) : proxima.hora_inicio), /* @__PURE__ */ React.createElement("span", { className: `block text-sm truncate ${proxima.estado === "Pendiente" ? "text-amber-700 font-semibold" : "text-gray-600"}` }, proxima.estado === "Pendiente" ? t("Falta el anticipo · toca para enviarlo") : proxima.servicio)),
          /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 text-xl" }, "›")
        ), cliente && window.TarjetaFidelidad && /* @__PURE__ */ React.createElement(window.TarjetaFidelidad, { cliente, config, onReservar: onStart }), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: onStart,
            className: "w-full text-white font-bold py-3 rounded-full shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 border",
            style: {
              background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`,
              borderColor: hexToRgba(colorSecundario, 0.7),
              boxShadow: `0 10px 28px ${hexToRgba(colorPrimario, 0.35)}`
            }
          },
          /* @__PURE__ */ React.createElement("span", null, "💖"),
          /* @__PURE__ */ React.createElement("span", null, t("Reservar cita")),
          /* @__PURE__ */ React.createElement("span", null, "✨")
        ), hayCatalogo && onCatalogo && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: onCatalogo,
            className: "w-full text-white/90 font-medium py-2.5 rounded-full border border-white/30 hover:bg-white/10 transition flex items-center justify-center gap-2"
          },
          /* @__PURE__ */ React.createElement("span", null, "✨"),
          /* @__PURE__ */ React.createElement("span", null, t("Explorar catálogo"))
        ), cliente && onMisReservas && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: onMisReservas,
            className: "w-full text-white/90 font-medium py-2.5 rounded-full border border-white/30 hover:bg-white/10 transition flex items-center justify-center gap-2"
          },
          /* @__PURE__ */ React.createElement("i", { className: "icon-calendar" }),
          /* @__PURE__ */ React.createElement("span", null, t("Mis Citas"))
        ), config?.horario_atencion && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-white/70" }, "🕐 ", config.horario_atencion), cliente && onLogout && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: onLogout,
            className: "text-white/60 text-xs hover:text-white/90 transition mx-auto block underline underline-offset-2"
          },
          t("Cerrar sesión")
        ), esApkConRecientes && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => {
              window.location.href = "app-clientes.html";
            },
            className: "text-white/50 text-xs hover:text-white/80 transition mx-auto block underline underline-offset-2"
          },
          "🔄 ",
          t("Cambiar de salón")
        ))
      )
    )
  );
}
