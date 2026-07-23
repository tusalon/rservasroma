function EditarNegocio() {
  window.useIdioma();
  const t = window.t;
  const [negocioId, setNegocioId] = React.useState(null);
  const [monedaEditadaManualmente, setMonedaEditadaManualmente] = React.useState(false);
  const [cargando, setCargando] = React.useState(true);
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState("");
  const [exito, setExito] = React.useState(false);
  const [config, setConfig] = React.useState({
    nombre: "",
    telefono: "",
    codigo_pais: "53",
    email: "",
    direccion: "",
    provincia: "",
    municipio: "",
    logo_url: "",
    logo_preview: "",
    logo_file: null,
    color_primario: "#ec4899",
    color_secundario: "#f9a8d4",
    imagen_fondo_tipo: "unas",
    mensaje_bienvenida: "",
    mensaje_confirmacion: "",
    mensaje_inasistencia: "Hola {cliente}, registramos que no asististe a tu turno en {nombre_negocio}.\n\nServicio: {servicio}\nFecha: {fecha}\nHora: {hora}\nProfesional: {profesional}\n\nSi necesitas reprogramar, por favor escribenos por este WhatsApp.",
    instagram: "",
    facebook: "",
    horario_atencion: "",
    // 🆕 NUEVOS CAMPOS DE ANTICIPO
    requiere_anticipo: false,
    anticipos_por_servicio: false,
    tipo_anticipo: "fijo",
    valor_anticipo: "",
    mensaje_pago: "Para confirmar tu turno, realiza el pago del anticipo de ${monto_anticipo} a la siguiente cuenta:\n\nCBU: {cbu}\nAlias: {alias}\nTitular: {titular}\n\nTienes {tiempo_vencimiento} horas para realizar el pago. Si no se confirma el pago en ese tiempo, el turno se liberará automáticamente.",
    cbu: "",
    alias: "",
    titular: "",
    banco: "",
    tiempo_vencimiento: 2,
    whatsapp_moneda: "CUP",
    whatsapp_mostrar_costos: true
  });
  const paisesTelefono = window.PHONE_COUNTRIES || [
    { id: "CU", nombre: "Cuba", bandera: "🇨🇺", codigo: "53", ejemplo: "53066647", localLength: 8 },
    { id: "ES", nombre: "Espana", bandera: "🇪🇸", codigo: "34", ejemplo: "612345678", localLength: 9 },
    { id: "MX", nombre: "Mexico", bandera: "🇲🇽", codigo: "52", ejemplo: "5512345678", localLength: 10 },
    { id: "US", nombre: "USA", bandera: "🇺🇸", codigo: "1", ejemplo: "3055551234", localLength: 10 },
    { id: "RU", nombre: "Rusia", bandera: "🇷🇺", codigo: "7", ejemplo: "9123456789", localLength: 10 },
    { id: "VE", nombre: "Venezuela", bandera: "🇻🇪", codigo: "58", ejemplo: "4121234567", localLength: 10 },
    { id: "CO", nombre: "Colombia", bandera: "🇨🇴", codigo: "57", ejemplo: "3001234567", localLength: 10 },
    { id: "GY", nombre: "Guyana", bandera: "🇬🇾", codigo: "592", ejemplo: "6123456", localLength: 7 }
  ];
  React.useEffect(() => {
    const id = localStorage.getItem("negocioId");
    console.log("📌 negocioId desde localStorage:", id);
    if (!id) {
      console.log("🚫 No hay negocioId, redirigiendo a login");
      window.location.href = "admin-login.html";
      return;
    }
    setNegocioId(id);
    cargarDatos(id);
  }, []);
  const cargarDatos = async (id) => {
    try {
      console.log("📥 Cargando configuración del negocio...");
      const configData = await window.cargarConfiguracionNegocio(true);
      const idResuelto = window.getNegocioId ? window.getNegocioId() : "";
      if (idResuelto && idResuelto !== id) {
        console.log("🔁 negocioId corregido por slug de URL:", idResuelto);
        setNegocioId(idResuelto);
      }
      if (configData) {
        console.log("✅ Datos cargados:", configData);
        setConfig({
          nombre: configData.nombre || "",
          telefono: configData.telefono || "",
          codigo_pais: window.getCodigoPaisTelefono ? window.getCodigoPaisTelefono(configData) : configData.codigo_pais || "53",
          email: configData.email || "",
          direccion: configData.direccion || "",
          provincia: configData.provincia || "",
          municipio: configData.municipio || "",
          logo_url: configData.logo_url || "",
          logo_preview: configData.logo_url || "",
          logo_file: null,
          color_primario: configData.color_primario || "#ec4899",
          color_secundario: configData.color_secundario || "#f9a8d4",
          imagen_fondo_tipo: configData.imagen_fondo_tipo || "unas",
          mensaje_bienvenida: configData.mensaje_bienvenida || "¡Bienvenido!",
          mensaje_confirmacion: configData.mensaje_confirmacion || "Tu turno ha sido reservado",
          mensaje_inasistencia: configData.mensaje_inasistencia || "Hola {cliente}, registramos que no asististe a tu turno en {nombre_negocio}.\n\nServicio: {servicio}\nFecha: {fecha}\nHora: {hora}\nProfesional: {profesional}\n\nSi necesitas reprogramar, por favor escribenos por este WhatsApp.",
          instagram: configData.instagram || "",
          facebook: configData.facebook || "",
          horario_atencion: configData.horario_atencion || "",
          // 🆕 CARGAR CAMPOS DE ANTICIPO
          requiere_anticipo: configData.requiere_anticipo || false,
          anticipos_por_servicio: configData.anticipos_por_servicio === true,
          tipo_anticipo: configData.tipo_anticipo || "fijo",
          valor_anticipo: configData.valor_anticipo || "",
          mensaje_pago: configData.mensaje_pago || "Para confirmar tu turno, realiza el pago del anticipo de ${monto_anticipo} a la siguiente cuenta:\n\nCBU: {cbu}\nAlias: {alias}\nTitular: {titular}\n\nTienes {tiempo_vencimiento} horas para realizar el pago. Si no se confirma el pago en ese tiempo, el turno se liberará automáticamente.",
          cbu: configData.cbu || "",
          alias: configData.alias || "",
          titular: configData.titular || "",
          banco: configData.banco || "",
          tiempo_vencimiento: configData.tiempo_vencimiento || 2,
          whatsapp_moneda: ["CUP", "USD", "EUR", "MXN"].includes(String(configData.whatsapp_moneda || "").toUpperCase()) ? String(configData.whatsapp_moneda).toUpperCase() : "CUP",
          whatsapp_mostrar_costos: configData.whatsapp_mostrar_costos !== false
        });
      }
    } catch (error2) {
      console.error("❌ Error cargando datos:", error2);
      setError(t("Error al cargar los datos"));
    } finally {
      setCargando(false);
    }
  };
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError(t("Solo se permiten imágenes"));
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError(t("La imagen no puede superar los 2MB"));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig({
          ...config,
          logo_file: file,
          logo_preview: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };
  const subirLogo = async () => {
    if (!config.logo_file) return config.logo_url;
    try {
      const fileExt = config.logo_file.name.split(".").pop();
      const fileName = `logo-${negocioId}-${Date.now()}.${fileExt}`;
      console.log("📤 Subiendo logo:", fileName);
      const response = await fetch(
        `${window.SUPABASE_URL}/storage/v1/object/negocios-logos/${fileName}`,
        {
          method: "POST",
          headers: {
            "apikey": window.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
          },
          body: config.logo_file
        }
      );
      if (!response.ok) {
        const error2 = await response.text();
        console.error("❌ Error subiendo logo:", error2);
        return config.logo_url;
      }
      const publicUrl = `${window.SUPABASE_URL}/storage/v1/object/public/negocios-logos/${fileName}`;
      console.log("✅ Logo subido:", publicUrl);
      return publicUrl;
    } catch (error2) {
      console.error("❌ Error en subirLogo:", error2);
      return config.logo_url;
    }
  };
  const handleGuardar = async () => {
    setGuardando(true);
    setError("");
    try {
      console.log("🔍 Verificando negocioId:", negocioId);
      if (!negocioId) {
        throw new Error(t("No hay ID de negocio. Por favor, iniciá sesión nuevamente."));
      }
      let logo_url = config.logo_url;
      if (config.logo_file) {
        const nuevaLogoUrl = await subirLogo();
        if (nuevaLogoUrl) {
          logo_url = nuevaLogoUrl;
        }
      }
      const datosActualizar = {
        nombre: config.nombre,
        telefono: config.telefono,
        codigo_pais: config.codigo_pais || "53",
        email: config.email || null,
        direccion: config.direccion || null,
        provincia: config.provincia || null,
        municipio: config.municipio || null,
        mensaje_bienvenida: config.mensaje_bienvenida,
        mensaje_confirmacion: config.mensaje_confirmacion,
        mensaje_inasistencia: config.mensaje_inasistencia || null,
        instagram: config.instagram || null,
        facebook: config.facebook || null,
        horario_atencion: config.horario_atencion || null,
        logo_url,
        color_primario: config.color_primario || "#ec4899",
        color_secundario: config.color_secundario || "#f9a8d4",
        imagen_fondo_tipo: config.imagen_fondo_tipo || "unas",
        // 🆕 INCLUIR CAMPOS DE ANTICIPO
        requiere_anticipo: config.requiere_anticipo,
        anticipos_por_servicio: config.anticipos_por_servicio === true,
        tipo_anticipo: config.tipo_anticipo,
        valor_anticipo: config.valor_anticipo ? parseFloat(config.valor_anticipo) : null,
        mensaje_pago: config.mensaje_pago || null,
        cbu: config.cbu || null,
        alias: config.alias || null,
        titular: config.titular || null,
        banco: config.banco || null,
        tiempo_vencimiento: config.tiempo_vencimiento ? parseInt(config.tiempo_vencimiento) : 2,
        whatsapp_moneda: ["CUP", "USD", "EUR", "MXN"].includes(String(config.whatsapp_moneda || "").toUpperCase()) ? String(config.whatsapp_moneda).toUpperCase() : "CUP",
        whatsapp_mostrar_costos: config.whatsapp_mostrar_costos !== false,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      console.log("📤 Enviando datos completos:", datosActualizar);
      if (window.setCodigoPaisTelefono) {
        window.setCodigoPaisTelefono(datosActualizar.codigo_pais);
      }
      const url = `${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${negocioId}`;
      console.log("🔗 URL:", url);
      let response = await fetch(url, {
        method: "PATCH",
        headers: {
          "apikey": window.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify(datosActualizar)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);
        if (errorText.includes("codigo_pais") || errorText.includes("whatsapp_moneda") || errorText.includes("whatsapp_mostrar_costos") || errorText.includes("anticipos_por_servicio") || errorText.includes("municipio") || errorText.includes("provincia")) {
          const datosCompatibles = { ...datosActualizar };
          if (errorText.includes("codigo_pais")) delete datosCompatibles.codigo_pais;
          if (errorText.includes("anticipos_por_servicio")) delete datosCompatibles.anticipos_por_servicio;
          if (errorText.includes("municipio")) delete datosCompatibles.municipio;
          if (errorText.includes("provincia")) delete datosCompatibles.provincia;
          if (errorText.includes("whatsapp_moneda") || errorText.includes("whatsapp_mostrar_costos")) {
            delete datosCompatibles.whatsapp_moneda;
            delete datosCompatibles.whatsapp_mostrar_costos;
          }
          response = await fetch(url, {
            method: "PATCH",
            headers: {
              "apikey": window.SUPABASE_ANON_KEY,
              "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation"
            },
            body: JSON.stringify(datosCompatibles)
          });
          if (!response.ok) {
            const retryText = await response.text();
            throw new Error(`Error HTTP: ${response.status} - ${retryText}`);
          }
        } else {
          throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
        }
      }
      const data = await response.json();
      console.log("✅ Datos guardados:", data);
      setExito(true);
      setTimeout(() => {
        window.location.href = "admin.html";
      }, 2e3);
    } catch (error2) {
      console.error("❌ Error completo:", error2);
      setError(t("Error al guardar: {mensaje}", { mensaje: error2.message }));
    } finally {
      setGuardando(false);
    }
  };
  if (cargando) {
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex items-center justify-center" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" }));
  }
  if (exito) {
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white p-8 rounded-2xl shadow-xl max-w-md text-center animate-fade-in" }, /* @__PURE__ */ React.createElement("div", { className: "w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6" }, /* @__PURE__ */ React.createElement("i", { className: "icon-check text-4xl text-white" })), /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-gray-900 mb-2" }, t("¡Cambios guardados!")), /* @__PURE__ */ React.createElement("p", { className: "text-gray-600 mb-4" }, t("La configuración se actualizó correctamente.")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500" }, t("Redirigiendo al panel...")), /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto mt-4" })));
  }
  const paisTelefonoActual = paisesTelefono.find((pais) => pais.codigo === config.codigo_pais) || paisesTelefono[0];
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gray-100 py-8 px-4" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-4xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-6 pb-4 border-b" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center" }, /* @__PURE__ */ React.createElement("i", { className: "icon-building text-2xl text-white" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-gray-900" }, t("Editar Negocio")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500" }, t("Modificá los datos de tu negocio")))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(window.LanguageToggle, null), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => window.location.href = "admin.html",
      className: "px-4 py-2 border rounded-lg hover:bg-gray-100 transition flex items-center gap-2"
    },
    /* @__PURE__ */ React.createElement("i", { className: "icon-x" }),
    t("Cancelar")
  ))), error && /* @__PURE__ */ React.createElement("div", { className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("i", { className: "icon-alert-circle" }), error), /* @__PURE__ */ React.createElement("div", { className: "space-y-8" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("i", { className: "icon-info text-amber-500" }), t("Datos básicos")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Nombre del negocio")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.nombre,
      onChange: (e) => setConfig({ ...config, nombre: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Teléfono")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "select",
    {
      value: config.codigo_pais,
      onChange: (e) => {
        const nuevoCodigo = e.target.value;
        const telefonoLocal = window.normalizarTelefonoLocal ? window.normalizarTelefonoLocal(config.telefono, nuevoCodigo) : config.telefono.replace(/\D/g, "");
        const monedaSugerida = !monedaEditadaManualmente && window.getMonedaSugeridaPorCodigoPais ? window.getMonedaSugeridaPorCodigoPais(nuevoCodigo) : null;
        setConfig({
          ...config,
          codigo_pais: nuevoCodigo,
          telefono: telefonoLocal,
          ...monedaSugerida ? { whatsapp_moneda: monedaSugerida } : {}
        });
        if (window.setCodigoPaisTelefono) window.setCodigoPaisTelefono(nuevoCodigo);
      },
      className: "w-36 border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
    },
    paisesTelefono.map((pais) => /* @__PURE__ */ React.createElement("option", { key: pais.id, value: pais.codigo }, pais.bandera, " +", pais.codigo, " ", pais.nombre))
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.telefono,
      onChange: (e) => setConfig({
        ...config,
        telefono: window.normalizarTelefonoLocal ? window.normalizarTelefonoLocal(e.target.value, config.codigo_pais) : e.target.value.replace(/\D/g, "")
      }),
      className: "w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500",
      placeholder: paisTelefonoActual?.ejemplo || "53066647"
    }
  )), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mt-1" }, t("Se usara como {telefono}.", { telefono: window.formatearTelefono ? window.formatearTelefono(config.telefono, config.codigo_pais) : `+${config.codigo_pais} ${config.telefono}` }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Email"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "email",
      value: config.email,
      onChange: (e) => setConfig({ ...config, email: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Dirección")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.direccion,
      onChange: (e) => setConfig({ ...config, direccion: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Provincia")), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: config.provincia,
      onChange: (e) => setConfig({ ...config, provincia: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, t("Selecciona provincia")),
    ["Pinar del Río", "Artemisa", "La Habana", "Mayabeque", "Matanzas", "Cienfuegos", "Villa Clara", "Sancti Spíritus", "Ciego de Ávila", "Camagüey", "Las Tunas", "Holguín", "Granma", "Santiago de Cuba", "Guantánamo", "Isla de la Juventud"].map((prov) => /* @__PURE__ */ React.createElement("option", { key: prov, value: prov }, prov))
  ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mt-1" }, t("Así te encuentran en el directorio de RomaHub."))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Municipio")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.municipio,
      onChange: (e) => setConfig({ ...config, municipio: e.target.value }),
      placeholder: t("Ej: Playa, Centro Habana, Bauta..."),
      className: "w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
    }
  )))), /* @__PURE__ */ React.createElement("div", { className: "pt-4 border-t" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("i", { className: "icon-palette text-amber-500" }), t("Personalización")), /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, t("Logo del negocio")), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-amber-500 transition cursor-pointer",
      onClick: () => document.getElementById("logo-input").click()
    },
    /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "logo-input",
        type: "file",
        accept: "image/*",
        onChange: handleLogoChange,
        className: "hidden"
      }
    ),
    config.logo_preview ? /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("img", { src: config.logo_preview, alt: "Logo", className: "h-24 object-contain mx-auto" }), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600" }, t("Haz clic para cambiar el logo"))) : /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("i", { className: "icon-upload-cloud text-5xl text-gray-400 mb-3" }), /* @__PURE__ */ React.createElement("p", { className: "text-gray-600" }, t("Haz clic para subir un logo")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-1" }, t("PNG, JPG hasta 2MB")))
  )), /* @__PURE__ */ React.createElement("div", { className: "mb-4 grid grid-cols-1 md:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-gray-200 p-4 bg-gray-50" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, t("Color principal")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "color",
      value: config.color_primario,
      onChange: (e) => setConfig({ ...config, color_primario: e.target.value }),
      className: "h-11 w-14 rounded border border-gray-300 bg-white"
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.color_primario,
      onChange: (e) => setConfig({ ...config, color_primario: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2 text-sm",
      placeholder: "#ec4899"
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-gray-200 p-4 bg-gray-50" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, t("Color secundario")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "color",
      value: config.color_secundario,
      onChange: (e) => setConfig({ ...config, color_secundario: e.target.value }),
      className: "h-11 w-14 rounded border border-gray-300 bg-white"
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.color_secundario,
      onChange: (e) => setConfig({ ...config, color_secundario: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2 text-sm",
      placeholder: "#f9a8d4"
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "md:col-span-2 rounded-xl overflow-hidden border border-gray-200" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "p-4 text-white",
      style: { background: `linear-gradient(135deg, ${config.color_primario}, ${config.color_secundario})` }
    },
    /* @__PURE__ */ React.createElement("p", { className: "font-semibold" }, t("Vista previa de colores")),
    /* @__PURE__ */ React.createElement("p", { className: "text-sm opacity-90" }, t("Estos colores se aplican en la bienvenida, botones y detalles principales."))
  ))), /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, t("Imagen de fondo para clientes")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" }, (window.HERO_BACKGROUND_OPTIONS || []).map((opcion) => /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      key: opcion.id,
      onClick: () => setConfig({ ...config, imagen_fondo_tipo: opcion.id }),
      className: `overflow-hidden rounded-lg border-2 bg-white text-left transition ${config.imagen_fondo_tipo === opcion.id ? "border-amber-600 ring-2 ring-amber-200" : "border-gray-200 hover:border-amber-300"}`
    },
    /* @__PURE__ */ React.createElement("img", { src: opcion.image, alt: opcion.label, className: "h-24 w-full object-cover" }),
    /* @__PURE__ */ React.createElement("div", { className: "p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-gray-900" }, t(opcion.label)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mt-1" }, t(opcion.description)))
  ))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mt-2" }, t("Esta imagen se vera en la pantalla de acceso y bienvenida de la clienta."))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Horario de atención")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.horario_atencion,
      onChange: (e) => setConfig({ ...config, horario_atencion: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2",
      placeholder: t("Lun-Vie 9:00-20:00, Sáb 9:00-18:00")
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "pt-4 border-t" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("i", { className: "icon-coin-stack text-amber-500" }), "💰 ", t("Anticipos")), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between bg-gray-50 p-4 rounded-lg" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "font-medium text-gray-700" }, t("Requerir anticipo para reservas")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mt-1" }, t("Si activás, los clientes deberán pagar un anticipo para confirmar el turno"))), /* @__PURE__ */ React.createElement("label", { className: "relative inline-flex items-center cursor-pointer" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: config.requiere_anticipo,
      onChange: (e) => setConfig({ ...config, requiere_anticipo: e.target.checked }),
      className: "sr-only peer"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600" }))), config.requiere_anticipo && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between bg-amber-50 p-4 rounded-lg border border-amber-100" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "font-medium text-amber-800" }, t("Usar anticipo diferente por servicio")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-700 mt-1" }, t("Si activas esto, cada servicio define su propio anticipo desde Servicios."))), /* @__PURE__ */ React.createElement("label", { className: "relative inline-flex items-center cursor-pointer" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: config.anticipos_por_servicio === true,
      onChange: (e) => setConfig({ ...config, anticipos_por_servicio: e.target.checked }),
      className: "sr-only peer"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600" }))), /* @__PURE__ */ React.createElement("div", { className: config.anticipos_por_servicio ? "opacity-60" : "" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, t("Tipo de anticipo global")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setConfig({ ...config, tipo_anticipo: "fijo" }),
      className: `p-4 rounded-lg border-2 transition-all ${config.tipo_anticipo === "fijo" ? "border-amber-600 bg-amber-50" : "border-gray-200 hover:border-amber-300"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "text-2xl mb-2" }, "💰"),
    /* @__PURE__ */ React.createElement("div", { className: "font-medium" }, t("Monto fijo")),
    /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 mt-1" }, t("Ej: $500 por turno"))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setConfig({ ...config, tipo_anticipo: "porcentaje" }),
      className: `p-4 rounded-lg border-2 transition-all ${config.tipo_anticipo === "porcentaje" ? "border-amber-600 bg-amber-50" : "border-gray-200 hover:border-amber-300"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "text-2xl mb-2" }, "📊"),
    /* @__PURE__ */ React.createElement("div", { className: "font-medium" }, t("Porcentaje")),
    /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 mt-1" }, t("Ej: 30% del servicio"))
  ))), /* @__PURE__ */ React.createElement("div", { className: config.anticipos_por_servicio ? "opacity-60" : "" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, config.tipo_anticipo === "fijo" ? t("Monto global del anticipo ($)") : t("Porcentaje global del servicio (%)")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      value: config.valor_anticipo,
      onChange: (e) => setConfig({ ...config, valor_anticipo: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2",
      placeholder: config.tipo_anticipo === "fijo" ? t("Ej: 500") : t("Ej: 30"),
      min: "0",
      step: config.tipo_anticipo === "fijo" ? "1" : "0.1"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Tiempo para pagar (horas)")), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: config.tiempo_vencimiento,
      onChange: (e) => setConfig({ ...config, tiempo_vencimiento: parseInt(e.target.value) }),
      className: "w-full border rounded-lg px-3 py-2"
    },
    /* @__PURE__ */ React.createElement("option", { value: "1" }, t("1 hora")),
    /* @__PURE__ */ React.createElement("option", { value: "2" }, t("{n} horas", { n: 2 })),
    /* @__PURE__ */ React.createElement("option", { value: "3" }, t("{n} horas", { n: 3 })),
    /* @__PURE__ */ React.createElement("option", { value: "6" }, t("{n} horas", { n: 6 })),
    /* @__PURE__ */ React.createElement("option", { value: "12" }, t("{n} horas", { n: 12 })),
    /* @__PURE__ */ React.createElement("option", { value: "24" }, t("{n} horas", { n: 24 })),
    /* @__PURE__ */ React.createElement("option", { value: "48" }, t("{n} horas", { n: 48 }))
  ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mt-1" }, t("Si no paga en este tiempo, la reserva se elimina y el horario queda libre automaticamente"))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 p-4 bg-gray-50 rounded-lg" }, /* @__PURE__ */ React.createElement("h3", { className: "font-medium text-gray-700" }, t("Datos de la cuenta")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-500 mb-1" }, t("Banco")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.banco,
      onChange: (e) => setConfig({ ...config, banco: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2 text-sm",
      placeholder: "Ej: Banco Santander"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-500 mb-1" }, t("CBU (22 dígitos)")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.cbu,
      onChange: (e) => setConfig({ ...config, cbu: e.target.value.replace(/\D/g, "") }),
      className: "w-full border rounded-lg px-3 py-2 text-sm",
      placeholder: "0000000000000000000000",
      maxLength: "22"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-500 mb-1" }, t("Alias")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.alias,
      onChange: (e) => setConfig({ ...config, alias: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2 text-sm",
      placeholder: "Ej: SALON.BELLEZA"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-500 mb-1" }, t("Titular")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.titular,
      onChange: (e) => setConfig({ ...config, titular: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2 text-sm",
      placeholder: "Ej: María González"
    }
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Mensaje para el cliente")), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: config.mensaje_pago,
      onChange: (e) => setConfig({ ...config, mensaje_pago: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2",
      rows: "8"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 p-3 rounded-lg mt-2 text-xs" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-blue-700 mb-2" }, t("Variables disponibles:")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2 text-blue-600" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("code", null, "{monto_anticipo}"), " - ", t("Monto calculado")), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("code", null, "{servicio}"), " - ", t("Nombre del servicio")), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("code", null, "{fecha}"), " - ", t("Fecha del turno")), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("code", null, "{hora}"), " - ", t("Hora del turno")), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("code", null, "{profesional}"), " - ", t("Profesional")), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("code", null, "{cbu}"), " - CBU"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("code", null, "{alias}"), " - ", t("Alias")), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("code", null, "{titular}"), " - ", t("Titular")), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("code", null, "{banco}"), " - ", t("Banco")), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("code", null, "{tiempo_vencimiento}"), " - ", t("Horas para pagar")))))))), /* @__PURE__ */ React.createElement("div", { className: "pt-4 border-t" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("i", { className: "icon-message-square text-amber-500" }), t("Mensajes")), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Mensaje de bienvenida")), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: config.mensaje_bienvenida,
      onChange: (e) => setConfig({ ...config, mensaje_bienvenida: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2",
      rows: "3"
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-1" }, t("Se muestra al abrir la app"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Confirmación de reserva")), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: config.mensaje_confirmacion,
      onChange: (e) => setConfig({ ...config, mensaje_confirmacion: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2",
      rows: "3"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Mensaje por inasistencia")), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: config.mensaje_inasistencia,
      onChange: (e) => setConfig({ ...config, mensaje_inasistencia: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2",
      rows: "6"
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-1" }, t("Variables:"), " ", "{cliente}", ", ", "{nombre_negocio}", ", ", "{servicio}", ", ", "{fecha}", ", ", "{hora}", ", ", "{profesional}", ".")), /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-amber-100 bg-amber-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-4 mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-gray-900" }, t("Costos en WhatsApp")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-600 mt-1" }, t("Define si los mensajes de reserva muestran importes y en que moneda se escriben."))), /* @__PURE__ */ React.createElement("label", { className: "relative inline-flex items-center cursor-pointer shrink-0" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: config.whatsapp_mostrar_costos !== false,
      onChange: (e) => setConfig({ ...config, whatsapp_mostrar_costos: e.target.checked }),
      className: "sr-only peer"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600" }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Moneda para mensajes")), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: config.whatsapp_moneda || "CUP",
      onChange: (e) => {
        setMonedaEditadaManualmente(true);
        setConfig({ ...config, whatsapp_moneda: e.target.value });
      },
      className: "w-full border border-amber-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
    },
    /* @__PURE__ */ React.createElement("option", { value: "CUP" }, "CUP - Pesos cubanos"),
    /* @__PURE__ */ React.createElement("option", { value: "USD" }, "USD - Dolares"),
    /* @__PURE__ */ React.createElement("option", { value: "EUR" }, "EUR - Euros"),
    /* @__PURE__ */ React.createElement("option", { value: "MXN" }, "MXN - Pesos mexicanos")
  ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 mt-2" }, t("Si desactivas los costos, se ocultan los totales de los mensajes generados por WhatsApp.")))))), /* @__PURE__ */ React.createElement("div", { className: "pt-4 border-t" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("i", { className: "icon-share-2 text-amber-500" }), t("Redes sociales")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Instagram"), /* @__PURE__ */ React.createElement("div", { className: "flex" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50" }, "@"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.instagram,
      onChange: (e) => setConfig({ ...config, instagram: e.target.value }),
      className: "w-full px-4 py-2 rounded-r-lg border border-gray-300",
      placeholder: t("usuario")
    }
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Facebook"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.facebook,
      onChange: (e) => setConfig({ ...config, facebook: e.target.value }),
      className: "w-full border rounded-lg px-3 py-2",
      placeholder: t("/página")
    }
  ))))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 mt-8 pt-4 border-t" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => window.location.href = "admin.html",
      className: "px-6 py-2 border rounded-lg hover:bg-gray-100 transition"
    },
    t("Cancelar")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleGuardar,
      disabled: guardando,
      className: "px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
    },
    guardando ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" }), t("Guardando...")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("i", { className: "icon-check" }), t("Guardar Cambios"))
  )))));
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ React.createElement(EditarNegocio, null));
