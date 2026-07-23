function WelcomeScreen({ onStart, onGoBack, cliente, userRol, onMisReservas }) {
  window.useIdioma();
  const t = window.t;
  const [config, setConfig] = React.useState(null);
  const [cargando, setCargando] = React.useState(true);
  const [imagenCargada, setImagenCargada] = React.useState(false);
  const [pushEstado, setPushEstado] = React.useState("");
  const [activandoPush, setActivandoPush] = React.useState(false);
  const [pushMensaje, setPushMensaje] = React.useState("");
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
    if (!pushUIVisible) return;
    const isNative = Boolean(window.Capacitor?.isNativePlatform?.());
    if (isNative) {
      const activo = typeof window.clientePushActivo === "function" ? window.clientePushActivo() : false;
      setPushEstado(activo ? "granted" : "default");
      return;
    }
    if (!("Notification" in window)) {
      setPushEstado("unsupported");
      return;
    }
    const permiso = Notification.permission;
    setPushEstado(permiso);
    if (permiso === "granted" && cliente?.whatsapp) {
      if (typeof window.solicitarPushRservasRoma === "function") {
        window.solicitarPushRservasRoma({ permission: "granted", defaultRole: "cliente", clienteWhatsapp: cliente.whatsapp }).catch(() => {
        });
      }
    }
  }, []);
  const activarNotificaciones = async () => {
    const isNative = Boolean(window.Capacitor?.isNativePlatform?.());
    if (isNative) {
      setActivandoPush(true);
      setPushMensaje("");
      try {
        const ok = typeof window.solicitarNativePushRservasRoma === "function" && await window.solicitarNativePushRservasRoma({
          role: "cliente",
          clienteWhatsapp: cliente?.whatsapp
        });
        setPushEstado(ok ? "granted" : "default");
        if (!ok) setPushMensaje(t("No se pudo activar. Instala la version mas reciente de la app."));
      } catch (error) {
        console.warn("Push nativo cliente:", error);
        setPushEstado("default");
        setPushMensaje(t("No se pudo activar: {msg}", { msg: String(error.message || error).substring(0, 60) }));
      } finally {
        setActivandoPush(false);
      }
      return;
    }
    if (!("Notification" in window)) {
      setPushEstado("unsupported");
      return;
    }
    setActivandoPush(true);
    setPushMensaje("");
    pedirPermisoYSuscribir();
    function pedirPermisoYSuscribir() {
      const permissionPromise = Notification.permission === "default" ? Notification.requestPermission() : Promise.resolve(Notification.permission);
      permissionPromise.then((permiso) => {
        setPushEstado(permiso);
        if (permiso !== "granted") {
          setPushMensaje(permiso === "denied" ? t("Permiso bloqueado en el navegador") : t("Permiso no concedido"));
          setActivandoPush(false);
          return;
        }
        if (typeof window.solicitarPushRservasRoma !== "function") {
          setPushEstado("granted");
          setActivandoPush(false);
          return;
        }
        window.solicitarPushRservasRoma({ permission: permiso, defaultRole: "cliente", clienteWhatsapp: cliente?.whatsapp }).then((res) => {
          if (res?.ok) {
            setPushMensaje("");
          } else {
            const msg = res?.error || "error";
            console.warn("Push resultado:", msg);
            if (msg === "sw_not_ready") {
              setPushMensaje(t("Instala la app en tu pantalla de inicio para recibir avisos"));
            } else if (msg.includes("applicationServerKey") || msg.includes("VAPID") || msg.includes("key")) {
              setPushMensaje(t("Recarga la app y vuelve a intentarlo"));
            } else {
              setPushMensaje(t("No se pudo activar: {msg}", { msg: msg.substring(0, 60) }));
            }
          }
        }).catch((err) => {
          console.warn("Push error:", err);
          setPushMensaje(t("Error: {err}", { err: String(err).substring(0, 60) }));
        }).finally(() => setActivandoPush(false));
      }).catch(() => setActivandoPush(false));
    }
  };
  React.useEffect(() => {
    const cargarDatos = async () => {
      const configData = await window.cargarConfiguracionNegocio();
      console.log("📱 WelcomeScreen - Config cargada:", configData);
      setConfig(configData);
      setCargando(false);
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
  const fondoPortada = window.getHeroBackgroundOption ? window.getHeroBackgroundOption(config?.imagen_fondo_tipo) : { image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=60&w=800&auto=format&fit=crop", label: "Fondo de salon" };
  const sticker = config?.especialidad?.toLowerCase().includes("uñas") ? "💅" : config?.especialidad?.toLowerCase().includes("pelo") ? "💇‍♀️" : config?.especialidad?.toLowerCase().includes("belleza") ? "🌸" : "💖";
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
        ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-white/80" }, t("Bienvenida a")), /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "text-xl font-bold break-words leading-tight",
            style: { color: colorSecundario, textShadow: `0 2px 12px ${hexToRgba(colorPrimario, 0.45)}` }
          },
          config?.nombre || t("Mi Salón")
        )), cliente && /* @__PURE__ */ React.createElement("p", { className: "text-white/90 text-sm bg-black/20 inline-block px-3 py-0.5 rounded-full" }, "✨ ", cliente.nombre, " ✨"), /* @__PURE__ */ React.createElement("p", { className: "text-white/80 text-xs max-w-xs mx-auto leading-snug" }, config?.mensaje_bienvenida || t("¡Bienvenida a nuestro salón!")), tieneRedes && /* @__PURE__ */ React.createElement("div", { className: "flex justify-center gap-3" }, tieneWhatsApp && /* @__PURE__ */ React.createElement(
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
        )), pushUIVisible && pushEstado === "denied" && /* @__PURE__ */ React.createElement("p", { className: "text-white/50 text-xs text-center" }, "🔔 ", t("Notificaciones bloqueadas — actívalas en Ajustes del teléfono")), pushUIVisible && pushEstado === "unsupported" && /iPhone|iPad|iPod/i.test(navigator.userAgent) && window.navigator.standalone !== true && /* @__PURE__ */ React.createElement("p", { className: "text-white/60 text-xs text-center leading-relaxed" }, "🔔 ", t("Para recibir recordatorios de tus citas, instala la app:"), /* @__PURE__ */ React.createElement("br", null), t("toca"), " ", /* @__PURE__ */ React.createElement("strong", null, t("Compartir ⬆️")), " ", t("y luego"), " ", /* @__PURE__ */ React.createElement("strong", null, t("«Añadir a pantalla de inicio»"))), pushUIVisible && pushEstado !== "unsupported" && pushEstado !== "denied" && /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, pushEstado === "granted" ? /* @__PURE__ */ React.createElement("p", { className: "text-white/60 text-xs flex items-center justify-center gap-1" }, "🔔 ", t("Recordatorios activados")) : /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: activarNotificaciones,
            disabled: activandoPush,
            className: "text-white/80 text-xs border border-white/30 rounded-full px-4 py-1.5 hover:bg-white/10 transition flex items-center gap-1.5 mx-auto disabled:opacity-50"
          },
          "🔔 ",
          activandoPush ? t("Activando...") : t("Activar recordatorios")
        ), pushMensaje && /* @__PURE__ */ React.createElement("p", { className: "text-yellow-300/80 text-xs text-center" }, pushMensaje)), /* @__PURE__ */ React.createElement(
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
          /* @__PURE__ */ React.createElement("span", null, t("Reservar Turno")),
          /* @__PURE__ */ React.createElement("span", null, "✨")
        ), cliente && onMisReservas && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: onMisReservas,
            className: "w-full text-white/90 font-medium py-2.5 rounded-full border border-white/30 hover:bg-white/10 transition flex items-center justify-center gap-2"
          },
          /* @__PURE__ */ React.createElement("i", { className: "icon-calendar" }),
          /* @__PURE__ */ React.createElement("span", null, t("Mis Reservas"))
        ), config?.horario_atencion && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-white/70" }, "🕐 ", config.horario_atencion), esApkConRecientes && /* @__PURE__ */ React.createElement(
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
