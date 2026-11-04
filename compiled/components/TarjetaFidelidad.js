(function() {
  if (typeof document === "undefined" || document.getElementById("tarjeta-fidelidad-css")) return;
  const estilo = document.createElement("style");
  estilo.id = "tarjeta-fidelidad-css";
  estilo.textContent = `
        @keyframes fid-latido { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245,158,11,.45); } 50% { transform: scale(1.07); box-shadow: 0 0 0 8px rgba(245,158,11,0); } }
        @keyframes fid-sello { from { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } to { transform: scale(1); } }
        .fid-premio { animation: fid-latido 1.8s ease-in-out infinite; }
        .fid-sello { animation: fid-sello .4s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .fid-premio, .fid-sello { animation: none !important; } }
    `;
  document.head.appendChild(estilo);
})();
function TarjetaFidelidad({ cliente, config: configProp, onReservar }) {
  window.useIdioma();
  const t = window.t;
  const [config, setConfig] = React.useState(configProp || null);
  const [tarjeta, setTarjeta] = React.useState(null);
  React.useEffect(() => {
    if (configProp) setConfig(configProp);
  }, [configProp]);
  React.useEffect(() => {
    if (configProp || !window.cargarConfiguracionNegocio) return void 0;
    let vigente = true;
    window.cargarConfiguracionNegocio().then((c) => {
      if (vigente && c) setConfig(c);
    }).catch(() => {
    });
    return () => {
      vigente = false;
    };
  }, []);
  React.useEffect(() => {
    const fid = config && window.getFidelizacionConfig ? window.getFidelizacionConfig(config) : null;
    if (!fid || !fid.activa || !cliente?.whatsapp || !window.cargarTarjetaClienta) {
      setTarjeta(null);
      return void 0;
    }
    let vigente = true;
    window.cargarTarjetaClienta(config, cliente).then((t2) => {
      if (vigente) setTarjeta(t2);
    });
    return () => {
      vigente = false;
    };
  }, [config, cliente?.whatsapp]);
  if (!tarjeta || !tarjeta.activa) return null;
  const c1 = config?.color_primario || "#FF1493";
  const c2 = config?.color_secundario || "#f9a8d4";
  const alfa = (hex, a) => {
    const h = String(hex).replace("#", "");
    const n = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    const v = parseInt(n, 16);
    return Number.isFinite(v) ? `rgba(${v >> 16 & 255}, ${v >> 8 & 255}, ${v & 255}, ${a})` : hex;
  };
  const { sellos, llenos, faltan, premiada, pct, recienPremiada, pendientes } = tarjeta;
  const yaReservada = premiada && pendientes > 0;
  const tam = sellos <= 6 ? 40 : sellos <= 10 ? 32 : 26;
  const titulo = yaReservada ? t("🎁 ¡Tu cita reservada lleva {pct}% de descuento!", { pct }) : premiada ? t("🎁 ¡Tu próxima cita tiene {pct}% de descuento!", { pct }) : faltan === 1 ? t("¡Solo te falta 1 cita!") : t("Te faltan {n} citas", { n: faltan });
  const detalle = yaReservada ? t("Se aplica solo, al cobrar tu próxima cita.") : premiada ? t("Resérvala y el descuento se aplica al cobrar.") : faltan === 1 ? t("Y tu siguiente cita tendrá {pct}% de descuento.", { pct }) : t("Completa tus citas y la siguiente tendrá {pct}% de descuento.", { pct });
  return /* @__PURE__ */ React.createElement(
    "section",
    {
      "aria-label": t("Tu tarjeta de fidelidad"),
      className: "w-full rounded-2xl shadow-lg",
      style: { padding: "16px", background: "#ffffff", border: `1px solid ${alfa(c1, 0.25)}` }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline justify-between gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold uppercase tracking-wide text-gray-500" }, t("Tu tarjeta de fidelidad")), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold tabular-nums", style: { color: c1 } }, llenos, "/", sellos)),
    /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-lg font-extrabold leading-snug text-gray-900" }, titulo),
    /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600" }, detalle),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "img",
        "aria-label": t("{n} de {total} sellos", { n: llenos, total: sellos }),
        className: "mt-3 flex flex-wrap items-center justify-center",
        style: { gap: "8px" }
      },
      Array.from({ length: sellos }, (_, i) => i < llenos ? /* @__PURE__ */ React.createElement(
        "span",
        {
          key: i,
          className: "fid-sello flex items-center justify-center rounded-full",
          style: { width: tam, height: tam, background: `linear-gradient(135deg, ${c1}, ${c2})`, boxShadow: `0 4px 10px ${alfa(c1, 0.35)}`, animationDelay: `${i * 60}ms` }
        },
        /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: Math.round(tam * 0.5), height: Math.round(tam * 0.5), fill: "#fff", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" }))
      ) : /* @__PURE__ */ React.createElement(
        "span",
        {
          key: i,
          className: "flex items-center justify-center rounded-full text-xs font-bold text-gray-500",
          style: { width: tam, height: tam, border: `2px dashed ${alfa(c1, 0.5)}`, background: alfa(c1, 0.05) }
        },
        i + 1
      )),
      /* @__PURE__ */ React.createElement(
        "span",
        {
          className: `flex items-center justify-center rounded-full ${premiada ? "fid-premio" : ""}`,
          style: {
            width: tam,
            height: tam,
            fontSize: Math.round(tam * 0.5),
            background: premiada ? "linear-gradient(135deg, #FCD34D, #F59E0B)" : "#FFFBEB",
            border: `2px solid ${premiada ? "#F59E0B" : "#FCD34D"}`
          }
        },
        "🎁"
      )
    ),
    premiada && !yaReservada && onReservar && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: onReservar,
        className: "mt-4 w-full rounded-full py-3 font-bold text-white shadow-md transition-all active:scale-[0.98]",
        style: { background: `linear-gradient(135deg, ${c1}, ${c2})`, minHeight: "44px" }
      },
      t("Reservar mi cita con descuento")
    ),
    !premiada && recienPremiada && llenos === 0 && /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-center text-sm font-semibold", style: { color: c1 } }, t("¡Completaste tu cita premiada! Empieza una tarjeta nueva.")),
    /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-center text-xs text-gray-500" }, t("Cada visita completada suma un sello, aunque lleve varios servicios."))
  );
}
(function() {
  const en = window.__I18N_EN__ || (window.__I18N_EN__ = {});
  Object.assign(en, {
    "Tu tarjeta de fidelidad": "Your loyalty card",
    "🎁 ¡Tu próxima cita tiene {pct}% de descuento!": "🎁 Your next appointment has {pct}% off!",
    "🎁 ¡Tu cita reservada lleva {pct}% de descuento!": "🎁 Your booked appointment has {pct}% off!",
    "Se aplica solo, al cobrar tu próxima cita.": "It is applied automatically when your next appointment is charged.",
    "¡Solo te falta 1 cita!": "Just 1 appointment to go!",
    "Te faltan {n} citas": "{n} appointments to go",
    "Completa tus citas y la siguiente tendrá {pct}% de descuento.": "Complete your appointments and the next one gets {pct}% off.",
    "Y tu siguiente cita tendrá {pct}% de descuento.": "And your next appointment gets {pct}% off.",
    "Resérvala y el descuento se aplica al cobrar.": "Book it and the discount is applied when you pay.",
    "{n} de {total} sellos": "{n} of {total} stamps",
    "Reservar mi cita con descuento": "Book my discounted appointment",
    "¡Completaste tu cita premiada! Empieza una tarjeta nueva.": "You completed your reward appointment! A new card starts now.",
    "Cada visita completada suma un sello, aunque lleve varios servicios.": "Each completed visit adds a stamp, even with several services."
  });
})();
window.TarjetaFidelidad = TarjetaFidelidad;
