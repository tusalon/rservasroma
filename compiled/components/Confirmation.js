function Confirmation({ booking, onReset }) {
  window.useIdioma();
  const t = window.t;
  const [telefonoDuenno, setTelefonoDuenno] = React.useState("");
  const [nombreNegocio, setNombreNegocio] = React.useState("");
  const [estrellas, setEstrellas] = React.useState(0);
  const [valoracionEnviada, setValoracionEnviada] = React.useState(false);
  const [hoverEstrella, setHoverEstrella] = React.useState(0);
  React.useEffect(() => {
    const cargarDatos = async () => {
      try {
        const tel = await window.getTelefonoDuenno();
        const nombre = await window.getNombreNegocio();
        setTelefonoDuenno(tel);
        setNombreNegocio(nombre);
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
  const textoAnticipo = montoAnticipo > 0 ? `${montoAnticipo} ${monedaNegocio}`.trim() : "";
  const linkWhatsAppAnticipo = telefonoDuenno ? `https://wa.me/${String(telefonoDuenno).replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Acabo de reservar ${booking.servicio} para el ${fechaConDia} y quiero coordinar el anticipo.`)}` : "";
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-[60vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in bg-gradient-to-b from-pink-50 to-pink-100" }, /* @__PURE__ */ React.createElement("div", { className: `w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-xl ring-4 ${esPendientePago ? "bg-amber-500 ring-amber-300" : "bg-pink-500 ring-pink-300"}` }, /* @__PURE__ */ React.createElement("span", { className: "text-4xl text-white" }, esPendientePago ? "⏳" : "✅")), esPendientePago ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-amber-700 mb-2" }, "⏳ ", t("¡Ya casi! Falta el anticipo")), /* @__PURE__ */ React.createElement("p", { className: "text-amber-700 mb-6 max-w-xs mx-auto" }, textoAnticipo ? t("Tu turno quedará confirmado cuando envíes el anticipo de {monto}. Si no se recibe a tiempo, el horario se libera.", { monto: textoAnticipo }) : t("Tu turno quedará confirmado cuando envíes el anticipo. Si no se recibe a tiempo, el horario se libera."))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-pink-800 mb-2" }, "✨ ", t("¡Turno Reservado!"), " ✨"), /* @__PURE__ */ React.createElement("p", { className: "text-pink-600 mb-6 max-w-xs mx-auto" }, t("Tu cita ha sido agendada correctamente"))), /* @__PURE__ */ React.createElement("div", { className: "bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border-2 border-pink-300 w-full max-w-sm mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4 text-left" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-pink-400 uppercase tracking-wider font-semibold mb-1" }, t("Cliente")), /* @__PURE__ */ React.createElement("div", { className: "font-medium text-pink-700 text-lg" }, booking.cliente_nombre)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-pink-400 uppercase tracking-wider font-semibold mb-1" }, "WhatsApp"), /* @__PURE__ */ React.createElement("div", { className: "font-medium text-pink-700" }, "+", String(booking.cliente_whatsapp || "").replace(/^\+/, ""))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-pink-400 uppercase tracking-wider font-semibold mb-1" }, t("Servicio")), /* @__PURE__ */ React.createElement("div", { className: "font-medium text-pink-700" }, booking.servicio), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-pink-500" }, booking.duracion, " min")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-pink-400 uppercase tracking-wider font-semibold mb-1" }, t("Fecha")), /* @__PURE__ */ React.createElement("div", { className: "font-medium text-pink-700 text-sm" }, fechaConDia)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-pink-400 uppercase tracking-wider font-semibold mb-1" }, t("Hora")), /* @__PURE__ */ React.createElement("div", { className: "font-medium text-pink-700" }, window.formatTo12Hour ? window.formatTo12Hour(booking.hora_inicio) : booking.hora_inicio))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-pink-400 uppercase tracking-wider font-semibold mb-1" }, t("Profesional")), /* @__PURE__ */ React.createElement("div", { className: "font-medium text-pink-700" }, booking.profesional_nombre || booking.trabajador_nombre || t("No asignada"))))), esPendientePago ? /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6 max-w-sm w-full" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white text-xl" }, "💰"), /* @__PURE__ */ React.createElement("div", { className: "text-left" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-amber-800" }, t("El salón ya recibió tu solicitud")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-700" }, textoAnticipo ? t("Envía el anticipo de {monto} para confirmar tu turno", { monto: textoAnticipo }) : t("Envía el anticipo para confirmar tu turno")))), linkWhatsAppAnticipo && /* @__PURE__ */ React.createElement(
    "a",
    {
      href: linkWhatsAppAnticipo,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
    },
    "💬 ",
    t("Coordinar el anticipo por WhatsApp")
  )) : /* @__PURE__ */ React.createElement("div", { className: "bg-pink-100 border border-pink-300 rounded-lg p-4 mb-6 max-w-sm w-full" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white text-xl" }, "📱"), /* @__PURE__ */ React.createElement("div", { className: "text-left" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-pink-800" }, t("El salón ya recibió tu reserva")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-pink-600" }, t('Si necesitas cambiarla, hazlo desde "Mis Reservas"'))))), /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-sm mb-4 bg-white/90 backdrop-blur-sm p-5 rounded-2xl border-2 border-pink-200 shadow-sm text-center" }, !valoracionEnviada ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-pink-800 mb-1" }, t("¿Qué te pareció reservar con nosotras?")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-pink-500 mb-3" }, t("Califica la experiencia de agendar tu turno")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-center gap-2" }, [1, 2, 3, 4, 5].map((n) => /* @__PURE__ */ React.createElement(
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
      className: "w-full bg-pink-500 text-white py-4 rounded-xl font-bold hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 text-lg shadow-md"
    },
    /* @__PURE__ */ React.createElement("span", null, "✨"),
    t("Reservar otro turno"),
    /* @__PURE__ */ React.createElement("span", null, "💅")
  ), telefonoDuenno && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-pink-600 bg-white/80 backdrop-blur-sm p-4 rounded-lg flex items-center justify-center gap-2 border border-pink-300" }, /* @__PURE__ */ React.createElement("span", { className: "text-pink-500 text-xl" }, "📱"), /* @__PURE__ */ React.createElement("span", null, t("Contacto:"), " ", telefonoContacto))));
}
