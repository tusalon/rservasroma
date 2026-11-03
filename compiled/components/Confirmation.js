function Confirmation({ booking, onReset }) {
  window.useIdioma();
  const t = window.t;
  const [telefonoDuenno, setTelefonoDuenno] = React.useState("");
  const [codigoPaisDuenno, setCodigoPaisDuenno] = React.useState("");
  const [nombreNegocio, setNombreNegocio] = React.useState("");
  const [estrellas, setEstrellas] = React.useState(0);
  const [valoracionEnviada, setValoracionEnviada] = React.useState(false);
  const [hoverEstrella, setHoverEstrella] = React.useState(0);
  const [mensajePropio, setMensajePropio] = React.useState("");
  const pushUIVisible = window.RSERVAS_PUSH_UI_VISIBLE === true;
  const cliente = { whatsapp: booking?.cliente_whatsapp };
  const [pushEstado, setPushEstado] = React.useState(() => {
    if (window.Capacitor?.isNativePlatform?.()) {
      return typeof window.clientePushActivo === "function" && window.clientePushActivo() ? "granted" : "default";
    }
    return "Notification" in window ? Notification.permission : "unsupported";
  });
  const [activandoPush, setActivandoPush] = React.useState(false);
  const [pushMensaje, setPushMensaje] = React.useState("");
  React.useEffect(() => {
    const cargarDatos = async () => {
      try {
        const tel = await window.getTelefonoDuenno();
        const nombre = await window.getNombreNegocio();
        setTelefonoDuenno(tel);
        setNombreNegocio(nombre);
        if (window.getCodigoPaisNegocio) {
          setCodigoPaisDuenno(await window.getCodigoPaisNegocio());
        }
        if (window.bienvenida && window.cargarConfiguracionNegocio) {
          const config = await window.cargarConfiguracionNegocio(true);
          const fecha = booking?.fecha ? /* @__PURE__ */ new Date(`${booking.fecha}T12:00:00`) : null;
          setMensajePropio(window.bienvenida.textoConfirmacion(config, {
            cliente: booking?.cliente_nombre || "",
            nombre_negocio: nombre || config?.nombre || "",
            servicio: booking?.servicio || "",
            fecha: fecha && !Number.isNaN(fecha.getTime()) ? fecha.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" }) : "",
            hora: String(booking?.hora_inicio || "").slice(0, 5),
            profesional: booking?.profesional_nombre || booking?.trabajador_nombre || "",
            direccion: config?.direccion || ""
          }));
        }
      } catch (error) {
      }
    };
    cargarDatos();
    if (booking?.id) {
      const ya = localStorage.getItem(`val_${booking.id}`);
      if (ya) {
        setEstrellas(parseInt(ya));
        setValoracionEnviada(true);
      }
    }
  }, []);
  const enviarValoracion = (n) => {
    setEstrellas(n);
    setValoracionEnviada(true);
    if (!booking?.id) return;
    localStorage.setItem(`val_${booking.id}`, String(n));
    try {
      fetch(`${window.SUPABASE_URL}/rest/v1/reservas?id=eq.${encodeURIComponent(booking.id)}`, {
        method: "PATCH",
        headers: {
          apikey: window.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ valoracion: n, valoracion_at: (/* @__PURE__ */ new Date()).toISOString() })
      }).catch(() => {
      });
    } catch (e) {
    }
  };
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
  if (!booking) {
    console.error("❌ booking no definido");
    return null;
  }
  const fechaConDia = window.formatFechaCompleta ? window.formatFechaCompleta(booking.fecha) : booking.fecha;
  const calendarLink = window.generarLinkCalendarioCliente ? window.generarLinkCalendarioCliente(booking) : "";
  const telefonoContacto = window.formatearTelefono ? window.formatearTelefono(telefonoDuenno) : `+${telefonoDuenno}`;
  const esPendientePago = booking.estado === "Pendiente";
  const montoAnticipo = Number(booking._montoAnticipo || 0);
  const monedaNegocio = window.getPreferenciasWhatsAppNegocio ? window.getPreferenciasWhatsAppNegocio().moneda || "" : "";
  const textoAnticipo = montoAnticipo > 0 ? `${montoAnticipo} ${booking._monedaAnticipo || monedaNegocio}`.trim() : "";
  const telefonoAnticipo = telefonoDuenno && window.normalizarTelefonoInternacional ? window.normalizarTelefonoInternacional(telefonoDuenno, codigoPaisDuenno) : String(telefonoDuenno || "").replace(/\D/g, "");
  const linkWhatsAppAnticipo = telefonoAnticipo ? `https://wa.me/${telefonoAnticipo}?text=${encodeURIComponent(`Hola! Acabo de reservar ${booking.servicio} para el ${fechaConDia} y quiero coordinar el anticipo.`)}` : "";
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-[60vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in bg-gradient-to-b from-pink-50 to-pink-100" }, /* @__PURE__ */ React.createElement("div", { className: `w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-xl ring-4 ${esPendientePago ? "bg-amber-500 ring-amber-300" : "bg-pink-500 ring-pink-300"}` }, /* @__PURE__ */ React.createElement("span", { className: "text-4xl text-white" }, esPendientePago ? "⏳" : "✅")), esPendientePago ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-amber-700 mb-2" }, t("¡Ya casi! Falta el anticipo")), /* @__PURE__ */ React.createElement("p", { className: "text-amber-700 mb-5 max-w-xs mx-auto" }, textoAnticipo ? t("Tu cita quedará confirmada cuando envíes el anticipo de {monto}. Si no se recibe a tiempo, el horario se libera.", { monto: textoAnticipo }) : t("Tu cita quedará confirmada cuando envíes el anticipo. Si no se recibe a tiempo, el horario se libera.")), linkWhatsAppAnticipo && /* @__PURE__ */ React.createElement(
    "a",
    {
      href: linkWhatsAppAnticipo,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "w-full max-w-sm mb-6 bg-green-500 text-white py-4 rounded-full font-bold text-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-md"
    },
    textoAnticipo ? t("Enviar anticipo de {monto} por WhatsApp", { monto: textoAnticipo }) : t("Coordinar el anticipo por WhatsApp")
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-pink-800 mb-2" }, t("¡Cita reservada!")), /* @__PURE__ */ React.createElement("p", { className: "text-pink-600 mb-6 max-w-xs mx-auto", style: mensajePropio ? { whiteSpace: "pre-line" } : void 0 }, mensajePropio || t("Tu cita ha sido agendada correctamente"))), /* @__PURE__ */ React.createElement("div", { className: "relative bg-white p-5 rounded-2xl shadow-lg w-full max-w-sm mb-6 text-left" }, !esPendientePago && /* @__PURE__ */ React.createElement(
    "span",
    {
      className: "sello-reserva absolute right-3 -top-3 bg-white border-[3px] border-green-600 text-green-700 font-extrabold tracking-widest text-sm px-2.5 py-1 rounded-lg",
      style: { transform: "rotate(-12deg)" }
    },
    t("RESERVADA")
  ), /* @__PURE__ */ React.createElement("div", { className: "divide-y divide-dashed divide-gray-200 text-sm" }, [
    [t("Servicio"), `${booking.servicio} · ${booking.duracion} min`],
    [t("Fecha"), fechaConDia],
    [t("Hora"), window.formatTo12Hour ? window.formatTo12Hour(booking.hora_inicio) : booking.hora_inicio],
    [t("Profesional"), booking.profesional_nombre || booking.trabajador_nombre || t("No asignada")],
    [t("Cliente"), booking.cliente_nombre]
  ].map(([etiqueta, valor]) => /* @__PURE__ */ React.createElement("div", { key: etiqueta, className: "flex justify-between gap-4 py-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-500" }, etiqueta), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-gray-900 text-right" }, valor))))), esPendientePago ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-amber-800 mb-6 max-w-sm" }, t("El salón ya recibió tu solicitud"), ". ", t("Si cierras esta pantalla, el botón del anticipo también está en «Mis Citas».")) : /* @__PURE__ */ React.createElement("div", { className: "bg-pink-100 border border-pink-300 rounded-lg p-4 mb-6 max-w-sm w-full" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white text-xl" }, "📱"), /* @__PURE__ */ React.createElement("div", { className: "text-left" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-pink-800" }, t("El salón ya recibió tu reserva")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-pink-600" }, t('Si necesitas cambiarla, hazlo desde "Mis Citas"'))))), pushUIVisible && pushEstado !== "denied" && /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-sm mb-4 bg-white/90 p-4 rounded-2xl border border-pink-200 text-left" }, pushEstado === "granted" ? /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-green-700" }, t("Recordatorios activados"), " ✓") : pushEstado === "unsupported" ? /iPhone|iPad|iPod/i.test(navigator.userAgent) && window.navigator.standalone !== true && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-700 leading-relaxed" }, t("Para recibir recordatorios de tus citas, instala la app:"), " ", t("toca"), " ", /* @__PURE__ */ React.createElement("strong", null, t("Compartir ⬆️")), " ", t("y luego"), " ", /* @__PURE__ */ React.createElement("strong", null, t("«Añadir a pantalla de inicio»"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-gray-900" }, t("¿Te avisamos un día antes?")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 mb-3" }, t("Te llega un aviso al móvil con la hora de tu cita.")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: activarNotificaciones,
      disabled: activandoPush,
      className: "px-5 py-2.5 rounded-full bg-pink-500 text-white font-bold text-sm disabled:opacity-60"
    },
    activandoPush ? t("Activando...") : t("Sí, avísame")
  )), pushMensaje && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-amber-700 mt-2" }, pushMensaje)), /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-sm mb-4 bg-white/90 backdrop-blur-sm p-5 rounded-2xl border-2 border-pink-200 shadow-sm text-center" }, !valoracionEnviada ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-pink-800 mb-1" }, t("¿Qué te pareció reservar con nosotras?")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-pink-500 mb-3" }, t("Califica la experiencia de agendar tu cita")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-center gap-2" }, [1, 2, 3, 4, 5].map((n) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: n,
      onClick: () => enviarValoracion(n),
      onMouseEnter: () => setHoverEstrella(n),
      onMouseLeave: () => setHoverEstrella(0),
      className: "text-3xl transition-transform hover:scale-110 active:scale-95",
      style: { filter: (hoverEstrella || estrellas) >= n ? "none" : "grayscale(1) opacity(0.4)" }
    },
    "⭐"
  )))) : /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center gap-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-1 text-2xl mb-1" }, [1, 2, 3, 4, 5].map((n) => /* @__PURE__ */ React.createElement("span", { key: n, style: { filter: estrellas >= n ? "none" : "grayscale(1) opacity(0.3)" } }, "⭐"))), /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-pink-700" }, estrellas >= 5 ? t("¡Gracias, eso nos encanta!") : estrellas >= 4 ? t("¡Gracias por tu valoración!") : estrellas >= 3 ? t("Gracias, seguiremos mejorando.") : t("Gracias, tomaremos nota para mejorar.")))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3 w-full max-w-xs" }, calendarLink && /* @__PURE__ */ React.createElement(
    "a",
    {
      href: calendarLink,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "w-full bg-white text-pink-700 border-2 border-pink-300 py-4 rounded-xl font-bold hover:bg-pink-50 transition-colors flex items-center justify-center gap-2 text-lg shadow-sm"
    },
    /* @__PURE__ */ React.createElement("i", { className: "icon-calendar text-xl" }),
    t("Agregar al calendario")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onReset,
      className: "w-full bg-pink-500 text-white py-4 rounded-full font-bold hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 text-lg shadow-md"
    },
    t("Reservar otra cita")
  ), telefonoDuenno && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-pink-600 bg-white/80 backdrop-blur-sm p-4 rounded-lg flex items-center justify-center gap-2 border border-pink-300" }, /* @__PURE__ */ React.createElement("span", { className: "text-pink-500 text-xl" }, "📱"), /* @__PURE__ */ React.createElement("span", null, t("Contacto:"), " ", telefonoContacto))));
}
