function RomaHubActivacion() {
  const t = window.t;
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [acceso, setAcceso] = React.useState(null);
  const [yaActivada, setYaActivada] = React.useState(false);
  const [copiado, setCopiado] = React.useState("");
  const activar = async (event) => {
    try {
      event?.preventDefault?.();
      setCargando(true);
      setError("");
      setAcceso(null);
      if (password.length < 6) {
        throw new Error(t("Escribe tu contraseña actual de RservasRoma."));
      }
      const negocioId = window.getNegocioId ? window.getNegocioId() : localStorage.getItem("negocioId");
      if (!negocioId) throw new Error(t("No se encontró tu negocio. Vuelve a iniciar sesión."));
      const res = await fetch(`${window.SUPABASE_URL}/functions/v1/activar-tienda-romahub`, {
        method: "POST",
        headers: {
          apikey: window.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ negocio_id: negocioId, password, website })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("No se pudo sincronizar tu acceso. Intenta de nuevo."));
      setPassword("");
      setAcceso(data.acceso);
      setYaActivada(data.yaActivada === true);
    } catch (err) {
      console.error("RomaHubActivacion.activar error:", err);
      setError(err.message || t("No se pudo sincronizar tu acceso."));
    } finally {
      setCargando(false);
    }
  };
  const copiar = async (tipo, texto) => {
    try {
      await navigator.clipboard?.writeText(texto);
      setCopiado(tipo);
      window.setTimeout(() => setCopiado(""), 1800);
    } catch (e) {
    }
  };
  if (acceso) {
    return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6 border border-green-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "✅"), /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-gray-900" }, yaActivada ? t("Acceso de RomaHub sincronizado") : t("¡Tu tienda de RomaHub está lista!"))), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 mb-4" }, t("Desde ahora entras a RomaHub con el WhatsApp del negocio y la misma contraseña de RservasRoma.")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-3 bg-gray-50 rounded-lg p-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] uppercase tracking-wide text-gray-400 font-bold" }, t("Usuario (tu WhatsApp)")), /* @__PURE__ */ React.createElement("p", { className: "text-base font-bold text-gray-900" }, acceso.usuario)), /* @__PURE__ */ React.createElement("button", { type: "button", className: "text-xs font-semibold text-pink-600 hover:text-pink-700", onClick: () => copiar("usuario", acceso.usuario) }, copiado === "usuario" ? t("Copiado") : t("Copiar"))), /* @__PURE__ */ React.createElement("div", { className: "bg-pink-50 border border-pink-100 rounded-lg p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] uppercase tracking-wide text-pink-500 font-bold" }, t("Contraseña")), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-gray-800 mt-1" }, t("La misma que usas para entrar a RservasRoma"))), /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] uppercase tracking-wide text-amber-700 font-bold" }, t("Nuevo código de recuperación")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-800 mt-1 mb-2" }, t("Guárdalo ahora. Se muestra una sola vez y sustituye cualquier código anterior.")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-3 bg-white rounded-lg border border-amber-200 p-3" }, /* @__PURE__ */ React.createElement("code", { className: "text-sm font-bold tracking-wider text-gray-900" }, acceso.codigo_recuperacion), /* @__PURE__ */ React.createElement("button", { type: "button", className: "text-xs font-semibold text-pink-600 hover:text-pink-700", onClick: () => copiar("codigo", acceso.codigo_recuperacion) }, copiado === "codigo" ? t("Copiado") : t("Copiar"))))), /* @__PURE__ */ React.createElement(
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
  return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6 border border-pink-100" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "🛍️"), /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-gray-900" }, t("Un mismo acceso para RservasRoma y RomaHub"))), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 mb-4" }, t("Escribe tu contraseña actual de RservasRoma para activar o recuperar RomaHub. Al terminar usarás la misma contraseña en las dos aplicaciones.")), /* @__PURE__ */ React.createElement("form", { onSubmit: activar }, /* @__PURE__ */ React.createElement("label", { className: "block", htmlFor: "romahub-password-rservas" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-gray-600" }, t("Contraseña actual de RservasRoma")), /* @__PURE__ */ React.createElement(
    "input",
    {
      id: "romahub-password-rservas",
      className: "mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300",
      type: "password",
      autoComplete: "current-password",
      value: password,
      onChange: (event) => {
        setPassword(event.target.value);
        setError("");
      },
      placeholder: t("Tu contraseña actual"),
      minLength: "6",
      maxLength: "72",
      required: true
    }
  )), /* @__PURE__ */ React.createElement("label", { className: "hidden", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("span", null, t("Sitio web")), /* @__PURE__ */ React.createElement("input", { tabIndex: "-1", "aria-hidden": "true", autoComplete: "off", value: website, onChange: (event) => setWebsite(event.target.value) })), error ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-red-600 mt-3", role: "alert" }, error) : null, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "submit",
      disabled: cargando,
      className: "mt-4 w-full bg-pink-600 text-white rounded-full py-2.5 font-semibold text-sm hover:bg-pink-700 transition disabled:opacity-60"
    },
    cargando ? t("Verificando...") : t("Activar o sincronizar RomaHub")
  )), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mt-3" }, t("Por seguridad, la contraseña se verifica en el servidor y nunca se guarda ni se muestra.")));
}
window.RomaHubActivacion = RomaHubActivacion;
