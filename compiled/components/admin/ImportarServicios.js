(function() {
  "use strict";
  const CATEGORIAS_CONOCIDAS = [
    { clave: "manicura", palabras: ["manicura", "manicure", "uñas", "unas", "acrilico", "acrílico", "gel", "esmaltado"] },
    { clave: "pedicura", palabras: ["pedicura", "pedicure", "pies"] },
    { clave: "cejas", palabras: ["ceja", "cejas"] },
    { clave: "pestanas", palabras: ["pestaña", "pestanas", "pestañas", "lash", "lashes", "extensiones"] },
    { clave: "faciales", palabras: ["facial", "faciales", "limpieza facial"] },
    { clave: "peluqueria", palabras: ["corte", "peinado", "tinte de pelo", "cabello", "peluqueria", "peluquería"] },
    { clave: "barberia", palabras: ["barba", "barberia", "barbería", "afeitado"] },
    { clave: "masajes", palabras: ["masaje", "masajes", "relajante"] }
  ];
  const MONEDAS = { usd: "USD", dolar: "USD", dólar: "USD", cup: "CUP", eur: "EUR", euro: "EUR", mxn: "MXN", peso: "MXN" };
  function quitarPrefijoWhatsApp(linea) {
    return linea.replace(/^\s*\[?\d{1,2}\/\d{1,2}(\/\d{2,4})?,?\s*\d{1,2}:\d{2}\s*(a\.?\s?m\.?|p\.?\s?m\.?)?\]?\s*/i, "").replace(/^\s*\+?\d[\d\s\-()]{5,}\s*:\s*/, "").replace(/^\s*~?[^:\n]{1,40}:\s(?=[A-ZÁÉÍÓÚÑ])/, "");
  }
  function normalizar(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function aNumero(txt) {
    const n = parseFloat(String(txt).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  function extraerDuracion(texto) {
    const t = normalizar(texto);
    let m = t.match(/(\d{1,3})\s*(min|minutos)\b/);
    if (m) return parseInt(m[1]);
    m = t.match(/(\d{1,2})\s*(h|hora|horas)\b\s*(?:y\s*)?(\d{1,2})?/);
    if (m) {
      const horas = parseInt(m[1]) || 0;
      const mins = m[3] ? parseInt(m[3]) : 0;
      const total = horas * 60 + mins;
      if (total > 0) return total;
    }
    m = t.match(/tiempo[:\s]*(\d{1,3})\b/);
    if (m) return parseInt(m[1]);
    return null;
  }
  function extraerMoneda(texto) {
    const t = normalizar(texto);
    for (const clave of Object.keys(MONEDAS)) {
      if (new RegExp("\\b" + clave).test(t)) return MONEDAS[clave];
    }
    return null;
  }
  function extraerPrecios(texto) {
    const t = normalizar(texto);
    let m = t.match(/desde\s*\$?\s*(\d+(?:[.,]\d+)?)\s*(?:usd|cup|eur|mxn|dolares?|pesos?)?\s*(?:hasta|a)\.?\s*\$?\s*(\d+(?:[.,]\d+)?)/);
    if (!m) m = t.match(/\b(\d+(?:[.,]\d+)?)\s*(?:usd|cup|eur|mxn)?\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*(?:usd|cup|eur|mxn)/);
    if (m) {
      const a = aNumero(m[1]), b = aNumero(m[2]);
      if (a !== null && b !== null) return { desde: Math.min(a, b), hasta: Math.max(a, b) };
    }
    m = t.match(/precio[:\s]*\$?\s*(\d+(?:[.,]\d+)?)/);
    if (!m) m = t.match(/\$\s*(\d+(?:[.,]\d+)?)/);
    if (!m) m = t.match(/\b(\d+(?:[.,]\d+)?)\s*(?:usd|cup|eur|mxn|dolares?)\b/);
    if (m) {
      const v = aNumero(m[1]);
      if (v !== null) return { desde: v, hasta: null };
    }
    return { desde: null, hasta: null };
  }
  function detectarCategoria(texto) {
    const t = normalizar(texto);
    for (const cat of CATEGORIAS_CONOCIDAS) {
      for (const p of cat.palabras) {
        if (t.includes(normalizar(p))) return cat.clave;
      }
    }
    return null;
  }
  function esLineaDePrecioOTiempo(linea) {
    const t = normalizar(linea);
    if (!t.trim()) return false;
    const soloPrecio = /^(precio|desde|tiempo|duracion)\b/.test(t);
    const tieneMonedaOMin = /(usd|cup|eur|mxn|\bmin\b|minutos|\bhoras?\b)/.test(t);
    const tieneNumero = /\d/.test(t);
    const palabras = t.split(/\s+/).filter(Boolean).length;
    return soloPrecio && tieneNumero || tieneMonedaOMin && tieneNumero && palabras <= 8;
  }
  const CORTES_DESCRIPCION = /\s+(?:para|que|segun|según|porque|incluye|incluyendo|ideal)\s+/i;
  const COLGANTES = /\s+(?:para|con|de|del|en|y|a|the|por|sin)$/i;
  function limpiarNombre(linea) {
    let n = linea.trim();
    n = n.split(/\s+precio\b/i)[0];
    n = n.split(/\s*,\s*/)[0];
    n = n.split(CORTES_DESCRIPCION)[0];
    n = n.replace(/[.;:]+\s*$/, "").trim();
    if (n.split(/\s+/).length > 4) {
      const enPos = n.split(/\s+en\s+/i);
      if (enPos.length > 1 && enPos[0].split(/\s+/).length >= 2) n = enPos[0];
    }
    const palabras = n.split(/\s+/);
    if (palabras.length > 7) n = palabras.slice(0, 7).join(" ");
    while (COLGANTES.test(n)) n = n.replace(COLGANTES, "");
    return n.trim();
  }
  function dividirEnBloques(texto) {
    const lineas = String(texto || "").split(/\r?\n/);
    const bloques = [];
    let actual = [];
    const esInicioWhatsApp = (l) => /^\s*\[?\d{1,2}\/\d{1,2}(\/\d{2,4})?,?\s*\d{1,2}:\d{2}/.test(l);
    lineas.forEach((lineaCruda) => {
      const inicioNuevo = esInicioWhatsApp(lineaCruda);
      const linea = quitarPrefijoWhatsApp(lineaCruda);
      const vacia = !linea.trim();
      if (inicioNuevo || vacia && actual.length) {
        if (actual.length) {
          bloques.push(actual);
          actual = [];
        }
        if (inicioNuevo && linea.trim()) actual.push(linea);
        return;
      }
      if (!vacia) actual.push(linea);
    });
    if (actual.length) bloques.push(actual);
    return bloques.filter((b) => b.join(" ").trim().length > 3);
  }
  function parsearBloque(lineas, monedaPorDefecto) {
    const textoCompleto = lineas.join("\n");
    const duracion = extraerDuracion(textoCompleto);
    const { desde, hasta } = extraerPrecios(textoCompleto);
    const moneda = extraerMoneda(textoCompleto) || monedaPorDefecto || "CUP";
    const utiles = lineas.filter((l) => l.trim() && !esLineaDePrecioOTiempo(l));
    if (!utiles.length) return null;
    let idxNombre = 0;
    const primeraEsCategoria = utiles.length > 1 && utiles[0].trim().split(/\s+/).length <= 2 && detectarCategoria(utiles[0]) !== null;
    if (primeraEsCategoria) idxNombre = 1;
    const nombre = limpiarNombre(utiles[idxNombre] || utiles[0]);
    if (!nombre) return null;
    const descripcion = utiles.slice(idxNombre).join(" ").replace(/\s+/g, " ").replace(new RegExp("^" + nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*", "i"), "").trim();
    const categoria = detectarCategoria(primeraEsCategoria ? utiles[0] : textoCompleto);
    return {
      nombre,
      descripcion,
      categoria: categoria || "otros",
      duracion: duracion || 60,
      precio_desde: desde,
      precio_hasta: hasta,
      precio_moneda: moneda,
      _duracionDetectada: duracion !== null,
      _precioDetectado: desde !== null
    };
  }
  function parsearServiciosTexto(texto, monedaPorDefecto) {
    return dividirEnBloques(texto).map((b) => parsearBloque(b, monedaPorDefecto)).filter(Boolean);
  }
  window.parsearServiciosTexto = parsearServiciosTexto;
})();
function ImportarServiciosModal({ onCerrar, onImportado, monedaNegocio, profesionales }) {
  const t = window.t || ((s) => s);
  const [texto, setTexto] = React.useState("");
  const [detectados, setDetectados] = React.useState(null);
  const [guardando, setGuardando] = React.useState(false);
  const [progreso, setProgreso] = React.useState("");
  const [error, setError] = React.useState("");
  const analizar = () => {
    setError("");
    const r = window.parsearServiciosTexto(texto, monedaNegocio);
    if (!r.length) {
      setError(t("No se reconoció ningún servicio. Revisa que cada uno esté en su propio párrafo."));
      setDetectados(null);
      return;
    }
    setDetectados(r.map((s, i) => ({ ...s, _id: i, _incluir: true })));
  };
  const actualizar = (id, campo, valor) => {
    setDetectados((prev) => prev.map((s) => s._id === id ? { ...s, [campo]: valor } : s));
  };
  const guardar = async () => {
    const aCrear = detectados.filter((s) => s._incluir && s.nombre.trim());
    if (!aCrear.length) {
      setError(t("No hay servicios marcados para crear."));
      return;
    }
    setGuardando(true);
    setError("");
    let creados = 0;
    const idsProf = (profesionales || []).filter((p) => p.activo !== false).map((p) => p.id);
    try {
      for (let i = 0; i < aCrear.length; i++) {
        const s = aCrear[i];
        setProgreso(t("Creando {n} de {total}...").replace("{n}", i + 1).replace("{total}", aCrear.length));
        const precio = Number(s.precio_desde) || 0;
        const nuevo = await window.salonServicios.crear({
          nombre: s.nombre.trim(),
          descripcion: s.descripcion || "",
          categoria: s.categoria || null,
          duracion: parseInt(s.duracion) || 60,
          precio,
          precio_desde: precio,
          precio_hasta: s.precio_hasta ? Number(s.precio_hasta) : null,
          precio_moneda: s.precio_moneda || monedaNegocio || "CUP"
        });
        if (nuevo && nuevo.id) {
          creados++;
          for (const pid of idsProf) {
            await window.asignarProfesionalAServicio(nuevo.id, pid);
          }
        }
      }
      setProgreso("");
      onImportado && onImportado(creados);
    } catch (e) {
      setError(e.message || t("Error creando los servicios"));
    } finally {
      setGuardando(false);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "p-5 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-xl" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold" }, "📋 ", t("Importar servicios desde texto")), /* @__PURE__ */ React.createElement("button", { onClick: onCerrar, className: "text-gray-400 hover:text-gray-700 text-xl" }, "✕")), /* @__PURE__ */ React.createElement("div", { className: "p-5 space-y-4" }, error && /* @__PURE__ */ React.createElement("div", { className: "bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm" }, error), !detectados && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600" }, t("Pega aquí tu lista de servicios tal como la tienes escrita (por ejemplo, el mensaje de WhatsApp). Se detectan solos el precio y la duración, y luego puedes corregir todo antes de guardar.")), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: texto,
      onChange: (e) => setTexto(e.target.value),
      rows: "10",
      className: "w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500",
      placeholder: "Manicura\nAcrílico, diseño incluido\nDesde 7 usd hasta 15 usd\nTiempo 120 min\n\nPedicura Spa\nLimpieza profunda y masajes\nPrecio 8 usd\nTiempo 60 min"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: onCerrar, className: "px-4 py-2 border rounded-lg hover:bg-gray-100" }, t("Cancelar")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: analizar,
      disabled: !texto.trim(),
      className: "px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
    },
    t("Analizar"),
    " →"
  ))), detectados && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800" }, t("Se encontraron {n} servicios. Revísalos y corrige lo que haga falta antes de guardar.").replace("{n}", detectados.length)), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, detectados.map((s) => /* @__PURE__ */ React.createElement("div", { key: s._id, className: `border rounded-lg p-3 ${s._incluir ? "bg-white" : "bg-gray-100 opacity-60"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: s._incluir,
      onChange: (e) => actualizar(s._id, "_incluir", e.target.checked),
      className: "w-4 h-4"
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: s.nombre,
      onChange: (e) => actualizar(s._id, "nombre", e.target.value),
      className: "flex-1 border rounded px-2 py-1 font-medium"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2 pl-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-500" }, t("Precio")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: s.precio_desde ?? "",
      onChange: (e) => actualizar(s._id, "precio_desde", e.target.value),
      className: `w-full border rounded px-2 py-1 text-sm ${!s._precioDetectado ? "border-amber-400 bg-amber-50" : ""}`,
      placeholder: "—"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-500" }, t("Hasta (opcional)")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: s.precio_hasta ?? "",
      onChange: (e) => actualizar(s._id, "precio_hasta", e.target.value),
      className: "w-full border rounded px-2 py-1 text-sm",
      placeholder: "—"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-500" }, t("Duración")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      value: s.duracion,
      onChange: (e) => actualizar(s._id, "duracion", e.target.value),
      className: `w-full border rounded px-2 py-1 text-sm ${!s._duracionDetectada ? "border-amber-400 bg-amber-50" : ""}`
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-500" }, t("Categoría")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: s.categoria,
      onChange: (e) => actualizar(s._id, "categoria", e.target.value),
      className: "w-full border rounded px-2 py-1 text-sm"
    }
  ))), !s._precioDetectado && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-700 mt-1 pl-6" }, "⚠️ ", t("No se encontró el precio, complétalo"))))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center gap-2 pt-2 border-t" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setDetectados(null),
      disabled: guardando,
      className: "px-4 py-2 border rounded-lg hover:bg-gray-100 text-sm"
    },
    "← ",
    t("Volver")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: guardar,
      disabled: guardando,
      className: "px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 flex items-center gap-2"
    },
    guardando ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" }), progreso || t("Guardando...")) : /* @__PURE__ */ React.createElement(React.Fragment, null, "✓ ", t("Crear {n} servicios").replace("{n}", detectados.filter((s) => s._incluir).length))
  ))))));
}
