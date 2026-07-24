function RomaHubActivacion() {
  const t = window.t;
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState("");
  const [acceso, setAcceso] = React.useState(null);
  const [yaActivada, setYaActivada] = React.useState(false);
  const activar = async () => {
    try {
      setCargando(true);
      setError("");
      const negocioId = window.getNegocioId ? window.getNegocioId() : localStorage.getItem("negocioId");
      if (!negocioId) throw new Error("No se encontró tu negocio. Vuelve a iniciar sesión.");
      const res = await fetch(`${window.SUPABASE_URL}/functions/v1/activar-tienda-romahub`, {
        method: "POST",
        headers: {
          apikey: window.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ negocio_id: negocioId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo activar tu tienda. Intenta de nuevo.");
      setAcceso(data.acceso);
      setYaActivada(data.yaActivada === true);
    } catch (err) {
      console.error("RomaHubActivacion.activar error:", err);
      setError(err.message || "No se pudo activar tu tienda.");
    } finally {
      setCargando(false);
    }
  };
  const copiar = (texto) => {
    try {
      navigator.clipboard?.writeText(texto);
    } catch (e) {
    }
  };
  if (acceso) {
    return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6 border border-pink-100" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "🛍️"), /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-gray-900" }, yaActivada ? t("Tu tienda ya estaba activada") : t("¡Tu tienda de RomaHub está lista!"))), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 mb-4" }, t("Usa estos datos para entrar al panel de productos y cursos en RomaHub. Guárdalos.")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-3 bg-gray-50 rounded-lg p-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] uppercase tracking-wide text-gray-400 font-bold" }, t("Usuario (tu WhatsApp)")), /* @__PURE__ */ React.createElement("p", { className: "text-base font-bold text-gray-900" }, acceso.usuario)), /* @__PURE__ */ React.createElement("button", { type: "button", className: "text-xs font-semibold text-pink-600 hover:text-pink-700", onClick: () => copiar(acceso.usuario) }, t("Copiar"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-3 bg-gray-50 rounded-lg p-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] uppercase tracking-wide text-gray-400 font-bold" }, t("Contraseña")), /* @__PURE__ */ React.createElement("p", { className: "text-base font-bold text-gray-900 font-mono tracking-wider" }, acceso.password)), /* @__PURE__ */ React.createElement("button", { type: "button", className: "text-xs font-semibold text-pink-600 hover:text-pink-700", onClick: () => copiar(acceso.password) }, t("Copiar")))), /* @__PURE__ */ React.createElement(
      "a",
      {
        href: "https://tusalon.github.io/RomaHub/login.html",
        target: "_blank",
        rel: "noopener noreferrer",
        className: "mt-4 w-full inline-flex items-center justify-center gap-2 bg-pink-600 text-white rounded-lg py-2.5 font-semibold text-sm hover:bg-pink-700 transition"
      },
      t("Entrar a mi tienda en RomaHub"),
      " →"
    ));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6 border border-pink-100" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "🛍️"), /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-gray-900" }, t("Vende en RomaHub"))), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 mb-4" }, t("Activa tu tienda gratis en RomaHub y publica productos y cursos que tus clientas podrán comprar por WhatsApp — además de sus reservas.")), error ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-red-600 mb-3" }, error) : null, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: activar,
      disabled: cargando,
      className: "w-full bg-pink-600 text-white rounded-lg py-2.5 font-semibold text-sm hover:bg-pink-700 transition disabled:opacity-60"
    },
    cargando ? t("Activando...") : t("Activar mi tienda en RomaHub")
  ));
}
window.RomaHubActivacion = RomaHubActivacion;
