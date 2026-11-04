(function() {
  if (typeof document === "undefined" || document.getElementById("roma-asistente-css")) return;
  const estilo = document.createElement("style");
  estilo.id = "roma-asistente-css";
  estilo.textContent = `
        @keyframes roma-respira { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-4px) scale(1.03); } }
        @keyframes roma-saluda { 0%, 86%, 100% { transform: rotate(0); } 89% { transform: rotate(-9deg); } 93% { transform: rotate(8deg); } 97% { transform: rotate(-5deg); } }
        @keyframes roma-aro { 0% { box-shadow: 0 0 0 0 rgba(255,20,147,.45); } 70%, 100% { box-shadow: 0 0 0 14px rgba(255,20,147,0); } }
        @keyframes roma-entra { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes roma-punto { 0%, 80%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
        .roma-boton { animation: roma-respira 3.2s ease-in-out infinite; }
        .roma-cara { animation: roma-saluda 9s ease-in-out infinite; transform-origin: 50% 80%; }
        .roma-aro { animation: roma-aro 2.4s ease-out infinite; }
        .roma-hoja { animation: roma-entra .26s ease-out; }
        .roma-punto { animation: roma-punto 1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .roma-boton, .roma-cara, .roma-aro, .roma-hoja, .roma-punto { animation: none !important; } }
    `;
  document.head.appendChild(estilo);
})();
function AsistenteRoma({ idioma = "es", contexto = {}, disponible = () => true, onIr, onAccion }) {
  window.useIdioma();
  const t = window.t;
  const [abierto, setAbierto] = React.useState(false);
  const [mensajes, setMensajes] = React.useState([]);
  const [texto, setTexto] = React.useState("");
  const [escribiendo, setEscribiendo] = React.useState(false);
  const [globo, setGlobo] = React.useState(false);
  const finRef = React.useRef(null);
  React.useEffect(() => {
    let visto = false;
    try {
      visto = sessionStorage.getItem("romaGloboVisto") === "1";
    } catch (e) {
    }
    if (visto) return void 0;
    const aparece = setTimeout(() => {
      setGlobo(true);
      try {
        sessionStorage.setItem("romaGloboVisto", "1");
      } catch (e) {
      }
    }, 3500);
    const desaparece = setTimeout(() => setGlobo(false), 10500);
    return () => {
      clearTimeout(aparece);
      clearTimeout(desaparece);
    };
  }, []);
  React.useEffect(() => {
    if (finRef.current) finRef.current.scrollIntoView({ block: "end" });
  }, [mensajes, escribiendo, abierto]);
  const accionesVisibles = (acciones) => (acciones || []).filter((a) => a.tab ? disponible(a.tab) : true);
  const abrir = () => {
    setGlobo(false);
    setAbierto(true);
    if (mensajes.length === 0) {
      const s = window.romaAsistente.saludo(contexto, idioma);
      setMensajes([{ de: "roma", texto: s.texto, acciones: accionesVisibles(s.acciones) }]);
    }
  };
  const preguntar = (pregunta) => {
    const limpio = String(pregunta || "").trim();
    if (!limpio || escribiendo) return;
    setMensajes((prev) => [...prev, { de: "yo", texto: limpio }]);
    setTexto("");
    setEscribiendo(true);
    const r = window.romaAsistente.responder(limpio, idioma);
    setTimeout(() => {
      setEscribiendo(false);
      setMensajes((prev) => [...prev, { de: "roma", texto: r.texto, acciones: accionesVisibles(r.acciones) }]);
    }, 450);
  };
  const usar = (a) => {
    if (a.tab) {
      setAbierto(false);
      onIr && onIr(a.tab);
      return;
    }
    if (a.accion === "copiar-enlace") {
      onAccion && onAccion(a.accion);
      setMensajes((prev) => [...prev, { de: "roma", texto: idioma === "en" ? "Done, your link is copied. Paste it wherever you want to share it." : "Listo, tu enlace está copiado. Pégalo donde quieras compartirlo." }]);
      return;
    }
    setAbierto(false);
    onAccion && onAccion(a.accion);
  };
  const sugerencias = window.romaAsistente.sugerencias(idioma);
  const soloSaludo = mensajes.length <= 1;
  return /* @__PURE__ */ React.createElement(React.Fragment, null, !abierto && /* @__PURE__ */ React.createElement("div", { className: "fixed z-30 flex flex-col items-end gap-2", style: { right: "12px", bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)" } }, globo && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: abrir, className: "roma-hoja max-w-[200px] rounded-2xl rounded-br-sm bg-white px-3 py-2 text-left text-[13px] font-semibold text-pink-900 shadow-lg border border-pink-100" }, t("¿Te ayudo?")), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: abrir,
      "aria-label": t("Roma, tu asistente"),
      title: t("Roma, tu asistente"),
      className: "roma-boton relative rounded-full"
    },
    /* @__PURE__ */ React.createElement("span", { className: "roma-aro absolute inset-0 rounded-full" }),
    /* @__PURE__ */ React.createElement(
      "img",
      {
        src: "images/roma/roma-cara-96.webp",
        alt: "",
        width: "60",
        height: "60",
        className: "roma-cara relative rounded-full object-cover border-2 border-white shadow-lg",
        style: { width: "60px", height: "60px" }
      }
    )
  )), abierto && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 flex items-end justify-center bg-black/40", onClick: () => setAbierto(false) }, /* @__PURE__ */ React.createElement(
    "div",
    {
      role: "dialog",
      "aria-label": t("Roma, tu asistente"),
      className: "roma-hoja flex w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl",
      style: { height: "min(82vh, 640px)" },
      onClick: (e) => e.stopPropagation()
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 border-b border-pink-100 px-4 py-3", style: { background: "linear-gradient(135deg, #FFE4F1 0%, #FFF1F8 100%)" } }, /* @__PURE__ */ React.createElement("img", { src: "images/roma/roma-cara-256.webp", alt: "", width: "48", height: "48", className: "rounded-full object-cover border-2 border-white shadow", style: { width: "48px", height: "48px" } }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-base font-extrabold leading-tight text-pink-900" }, "Roma"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-pink-700" }, t("Tu asistente en RservasRoma"))), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setAbierto(false), "aria-label": t("Cerrar"), className: "h-10 w-10 rounded-full text-2xl leading-none text-pink-700 hover:bg-white/70" }, "×")),
    /* @__PURE__ */ React.createElement("div", { className: "flex-1 space-y-3 overflow-y-auto px-4 py-4" }, mensajes.map((m, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: m.de === "yo" ? "flex justify-end" : "flex items-start gap-2" }, m.de === "roma" && /* @__PURE__ */ React.createElement("img", { src: "images/roma/roma-cara-96.webp", alt: "", className: "mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover" }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 max-w-[85%]" }, /* @__PURE__ */ React.createElement(
      "p",
      {
        className: m.de === "yo" ? "rounded-2xl rounded-br-sm px-3 py-2 text-[15px] leading-snug text-white" : "rounded-2xl rounded-tl-sm bg-pink-50 px-3 py-2 text-[15px] leading-snug text-pink-950",
        style: m.de === "yo" ? { background: "linear-gradient(135deg, #FF1493 0%, #FF5CAD 100%)" } : void 0
      },
      m.texto
    ), m.acciones && m.acciones.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex flex-wrap gap-2" }, m.acciones.map((a, j) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: j,
        type: "button",
        onClick: () => usar(a),
        className: "min-h-[36px] rounded-full border border-pink-300 bg-white px-3 text-[13px] font-bold text-pink-700 hover:bg-pink-50"
      },
      a.etq,
      " ›"
    )))))), escribiendo && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("img", { src: "images/roma/roma-cara-96.webp", alt: "", className: "h-8 w-8 shrink-0 rounded-full object-cover" }), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1 rounded-2xl rounded-tl-sm bg-pink-50 px-3 py-3", "aria-label": t("Roma está escribiendo") }, [0, 1, 2].map((n) => /* @__PURE__ */ React.createElement("span", { key: n, className: "roma-punto h-2 w-2 rounded-full bg-pink-400", style: { animationDelay: n * 0.15 + "s" } })))), soloSaludo && !escribiendo && /* @__PURE__ */ React.createElement("div", { className: "pt-1" }, /* @__PURE__ */ React.createElement("p", { className: "mb-2 text-xs font-semibold text-gray-500" }, t("Preguntas frecuentes")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, sugerencias.map((p) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: p,
        type: "button",
        onClick: () => preguntar(p),
        className: "min-h-[36px] rounded-full bg-gray-100 px-3 text-[13px] font-semibold text-gray-800 hover:bg-gray-200"
      },
      p
    )))), /* @__PURE__ */ React.createElement("div", { ref: finRef })),
    /* @__PURE__ */ React.createElement(
      "form",
      {
        className: "flex items-center gap-2 border-t border-gray-100 px-3 py-3",
        style: { paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" },
        onSubmit: (e) => {
          e.preventDefault();
          preguntar(texto);
        }
      },
      /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          value: texto,
          onChange: (e) => setTexto(e.target.value),
          maxLength: 200,
          placeholder: t("Escribe tu pregunta..."),
          "aria-label": t("Escribe tu pregunta..."),
          className: "h-11 min-w-0 flex-1 rounded-full bg-gray-100 px-4 text-[15px] text-gray-900 outline-none focus:ring-2 focus:ring-pink-300"
        }
      ),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "submit",
          disabled: !texto.trim() || escribiendo,
          className: "h-11 shrink-0 rounded-full bg-pink-500 px-4 text-sm font-bold text-white disabled:opacity-50"
        },
        t("Enviar")
      )
    )
  )));
}
(function() {
  const en = window.__I18N_EN__ || (window.__I18N_EN__ = {});
  Object.assign(en, {
    "¿Te ayudo?": "Need a hand?",
    "Roma, tu asistente": "Roma, your assistant",
    "Tu asistente en RservasRoma": "Your assistant in RservasRoma",
    "Roma está escribiendo": "Roma is typing",
    "Preguntas frecuentes": "Frequently asked",
    "Escribe tu pregunta...": "Type your question...",
    "Enviar": "Send"
  });
})();
window.AsistenteRoma = AsistenteRoma;
