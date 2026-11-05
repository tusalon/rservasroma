function SelectorCumple({ dia, mes, onCambio, claro = false }) {
  const normal = claro ? "bg-gray-100 text-gray-800" : "bg-white/15 text-white";
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-2", style: { gridTemplateColumns: "repeat(4, minmax(0, 1fr))" } }, Array.from({ length: 12 }, (_, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: i,
      type: "button",
      onClick: () => onCambio("", String(i + 1)),
      className: `py-2.5 rounded-full text-sm font-bold capitalize ${mes === String(i + 1) ? "bg-pink-500 text-white" : normal}`
    },
    window.cumpleanos.nombreMes(i + 1, window.getIdioma?.()).slice(0, 3)
  ))), mes && /* @__PURE__ */ React.createElement("div", { className: "grid gap-1.5", style: { gridTemplateColumns: "repeat(7, minmax(0, 1fr))" } }, Array.from({ length: new Date(2024, Number(mes), 0).getDate() }, (_, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: i,
      type: "button",
      onClick: () => onCambio(String(i + 1), mes),
      className: `aspect-square rounded-lg text-sm font-bold ${dia === String(i + 1) ? "bg-pink-500 text-white" : normal}`
    },
    i + 1
  ))));
}
function ClientAuthScreen({ onAccessGranted, onGoBack, disenoPendiente }) {
  window.useIdioma();
  const t = window.t;
  const [config, setConfig] = React.useState(null);
  const [cargando, setCargando] = React.useState(true);
  const [imagenCargada, setImagenCargada] = React.useState(false);
  const [nombre, setNombre] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [error, setError] = React.useState("");
  const [clienteBloqueado, setClienteBloqueado] = React.useState(null);
  const [clientePendiente, setClientePendiente] = React.useState(null);
  const [verificando, setVerificando] = React.useState(false);
  const [necesitaNombre, setNecesitaNombre] = React.useState(false);
  const [esProfesional, setEsProfesional] = React.useState(false);
  const [profesionalInfo, setProfesionalInfo] = React.useState(null);
  const [profesionalPassword, setProfesionalPassword] = React.useState("");
  const [esAdmin, setEsAdmin] = React.useState(false);
  const [codigoPaisCliente, setCodigoPaisCliente] = React.useState("53");
  const [cumpleDia, setCumpleDia] = React.useState("");
  const [cumpleMes, setCumpleMes] = React.useState("");
  const [pasoCumple, setPasoCumple] = React.useState(false);
  React.useEffect(() => {
    const cargarDatos = async () => {
      const configData = await window.cargarConfiguracionNegocio();
      setConfig(configData);
      setCodigoPaisCliente(window.getCodigoPaisTelefono ? window.getCodigoPaisTelefono(configData) : "53");
      setCargando(false);
    };
    cargarDatos();
  }, []);
  const getNegocioActual = () => {
    return window.NEGOCIO_ID_POR_DEFECTO || (typeof window.getNegocioId === "function" ? window.getNegocioId() : localStorage.getItem("negocioId"));
  };
  const guardarNegocioEnSesion = () => {
    const negocioId = getNegocioActual();
    if (negocioId) localStorage.setItem("negocioId", negocioId);
    if (config?.nombre) localStorage.setItem("negocioNombre", config.nombre);
  };
  const resetCliente = () => {
    setNecesitaNombre(false);
    setClienteBloqueado(null);
    setEsProfesional(false);
    setProfesionalInfo(null);
    setProfesionalPassword("");
    setEsAdmin(false);
    setError("");
    setPasoCumple(false);
  };
  const debounceTelefonoRef = React.useRef(null);
  const verificacionIdRef = React.useRef(0);
  const manejarCambioTelefono = (valor) => {
    const codigoPais = codigoPaisCliente || (window.getCodigoPaisTelefono ? window.getCodigoPaisTelefono(config) : "53");
    const paisTelefono2 = window.getPhoneCountryConfig ? window.getPhoneCountryConfig({ codigo_pais: codigoPais }) : { localLength: 8 };
    const numeroLimpio = window.normalizarTelefonoLocal ? window.normalizarTelefonoLocal(valor, codigoPais) : valor.replace(/\D/g, "");
    setWhatsapp(numeroLimpio);
    if (debounceTelefonoRef.current) clearTimeout(debounceTelefonoRef.current);
    if (numeroLimpio.length < (paisTelefono2.localLength || 8)) {
      resetCliente();
      return;
    }
    debounceTelefonoRef.current = setTimeout(() => verificarNumero(numeroLimpio), 450);
  };
  const verificarNumero = async (numero) => {
    const codigoPais = codigoPaisCliente || (window.getCodigoPaisTelefono ? window.getCodigoPaisTelefono(config) : "53");
    const paisTelefono2 = window.getPhoneCountryConfig ? window.getPhoneCountryConfig({ codigo_pais: codigoPais }) : { localLength: 8 };
    const numeroLimpio = window.normalizarTelefonoLocal ? window.normalizarTelefonoLocal(numero, codigoPais) : numero.replace(/\D/g, "");
    setWhatsapp(numeroLimpio);
    if (numeroLimpio.length < Math.min(7, paisTelefono2.localLength || 8)) {
      resetCliente();
      return;
    }
    const miVerificacion = ++verificacionIdRef.current;
    setVerificando(true);
    setError("");
    setNecesitaNombre(false);
    setClienteBloqueado(null);
    setEsProfesional(false);
    setProfesionalInfo(null);
    setProfesionalPassword("");
    setEsAdmin(false);
    const numeroCompleto = window.normalizarTelefonoInternacional ? window.normalizarTelefonoInternacional(numeroLimpio, codigoPais) : `53${numeroLimpio}`;
    try {
      const telefonoDuennoLocal = window.normalizarTelefonoLocal ? window.normalizarTelefonoLocal(config?.telefono || "", codigoPais) : String(config?.telefono || "").replace(/\D/g, "");
      if (numeroLimpio === telefonoDuennoLocal) {
        guardarNegocioEnSesion();
        const tieneSesion = window.sesionPanelVigente("adminLoginTime");
        window.location.href = window.construirRutaConSlug(tieneSesion ? "admin.html" : "admin-login.html");
        return;
      }
      if (window.verificarProfesionalPorTelefono) {
        const profesional = await window.verificarProfesionalPorTelefono(numeroLimpio);
        if (verificacionIdRef.current !== miVerificacion) return;
        if (profesional) {
          setEsProfesional(true);
          setProfesionalInfo(profesional);
          setProfesionalPassword("");
          setEsAdmin(false);
          setNecesitaNombre(false);
          return;
        }
      }
      const bloqueo = await window.getClienteBloqueado?.(numeroCompleto);
      if (verificacionIdRef.current !== miVerificacion) return;
      if (bloqueo) {
        setClienteBloqueado(bloqueo);
        setNecesitaNombre(false);
        setError(t("Este número no tiene permiso para registrarse ni reservar. Contacta al negocio."));
        return;
      }
      const cliente = await window.verificarAccesoCliente(numeroCompleto);
      if (verificacionIdRef.current !== miVerificacion) return;
      if (cliente?.pendiente) {
        setClientePendiente(cliente);
        setNecesitaNombre(false);
        return;
      }
      if (cliente) {
        guardarNegocioEnSesion();
        onAccessGranted(cliente.nombre, numeroCompleto);
        return;
      }
      setNecesitaNombre(true);
    } catch (err) {
      if (verificacionIdRef.current !== miVerificacion) return;
      console.error("Error verificando teléfono:", err);
      setError(t("No pudimos verificar el número. Revisa tu conexión e intenta de nuevo."));
    } finally {
      if (verificacionIdRef.current === miVerificacion) setVerificando(false);
    }
  };
  const ingresarComoProfesional = async () => {
    if (!profesionalInfo) return;
    if (!String(profesionalPassword || "").trim()) {
      setError(t("Ingresa tu contraseña profesional."));
      return;
    }
    setVerificando(true);
    setError("");
    try {
      const profesional = await window.loginProfesional?.(whatsapp, profesionalPassword);
      if (!profesional) {
        setError(t("Teléfono o contraseña profesional incorrectos."));
        return;
      }
      guardarNegocioEnSesion();
      if (typeof window.borrarClienteAuthActual === "function") window.borrarClienteAuthActual();
      else localStorage.removeItem("clienteAuth");
      localStorage.removeItem("adminAuth");
      localStorage.removeItem("adminLoginTime");
      const slugSesionProfesional = window._rservasSlugActual || localStorage.getItem("negocioSlug") || "";
      if (slugSesionProfesional) localStorage.setItem("adminSlug", slugSesionProfesional);
      localStorage.setItem("profesionalAuth", JSON.stringify({
        id: profesional.id,
        nombre: profesional.nombre,
        telefono: profesional.telefono,
        nivel: profesional.nivel || 1
      }));
      localStorage.setItem("profesionalLoginTime", Date.now());
      window.location.href = window.construirRutaConSlug("admin.html");
    } catch (err) {
      console.error("Error ingresando como profesional:", err);
      setError(t("Error al iniciar sesión profesional. Intenta de nuevo."));
    } finally {
      setVerificando(false);
    }
  };
  const handleSubmit = async (e, sinCumple = false) => {
    e.preventDefault();
    const codigoPais = codigoPaisCliente || (window.getCodigoPaisTelefono ? window.getCodigoPaisTelefono(config) : "53");
    const paisTelefono2 = window.getPhoneCountryConfig ? window.getPhoneCountryConfig({ codigo_pais: codigoPais }) : { localLength: 8 };
    const numeroLimpio = window.normalizarTelefonoLocal ? window.normalizarTelefonoLocal(whatsapp, codigoPais) : whatsapp.replace(/\D/g, "");
    const numeroCompleto = window.normalizarTelefonoInternacional ? window.normalizarTelefonoInternacional(numeroLimpio, codigoPais) : `53${numeroLimpio}`;
    if (numeroLimpio.length < Math.min(7, paisTelefono2.localLength || 8)) {
      setError(t("Ingresa un número de WhatsApp válido."));
      return;
    }
    if (esAdmin || esProfesional) return;
    if (!necesitaNombre) {
      await verificarNumero(numeroLimpio);
      return;
    }
    if (!nombre.trim()) {
      setError(t("Ingresa tu nombre completo para registrarte."));
      return;
    }
    if (window.cumpleanos && !pasoCumple) {
      setError("");
      setPasoCumple(true);
      return;
    }
    setVerificando(true);
    setError("");
    try {
      const bloqueo = await window.getClienteBloqueado?.(numeroCompleto);
      if (bloqueo) {
        setClienteBloqueado(bloqueo);
        setError(t("Este número no tiene permiso para registrarse ni reservar. Contacta al negocio."));
        return;
      }
      const clienteExistente = await window.verificarAccesoCliente(numeroCompleto);
      if (clienteExistente?.pendiente) {
        setClientePendiente(clienteExistente);
        return;
      }
      if (clienteExistente) {
        guardarNegocioEnSesion();
        onAccessGranted(clienteExistente.nombre, numeroCompleto);
        return;
      }
      const cumpleElegido = sinCumple ? null : window.cumpleanos?.normalizarCumple(cumpleDia, cumpleMes);
      const nuevoCliente = await window.crearCliente(nombre.trim(), numeroCompleto, cumpleElegido);
      if (nuevoCliente?.pendiente) {
        setClientePendiente(nuevoCliente);
      } else if (nuevoCliente) {
        guardarNegocioEnSesion();
        onAccessGranted(nuevoCliente.nombre || nombre.trim(), numeroCompleto);
      } else {
        setError(window.ultimoErrorCliente || t("Error al crear el cliente. Intenta más tarde."));
      }
    } catch (err) {
      console.error("Error registrando cliente:", err);
      setError(t("Error en el sistema. Intenta más tarde."));
    } finally {
      setVerificando(false);
    }
  };
  if (cargando) {
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-pink-200" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500" }));
  }
  const nombreNegocio = config?.nombre || "Mi Salón";
  const logoUrl = config?.logo_url;
  const inicial = String(nombreNegocio).trim().charAt(0).toUpperCase() || "✨";
  const paisTelefono = window.getPhoneCountryConfig ? window.getPhoneCountryConfig({ codigo_pais: codigoPaisCliente }) : { codigo: "53", bandera: "🇨🇺", ejemplo: "51234567", localLength: 8 };
  const paisesTelefono = window.PHONE_COUNTRIES || [paisTelefono];
  const fondoPortada = {
    image: window.getHeroBackgroundImage ? window.getHeroBackgroundImage(config) : config?.imagen_fondo_url || "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=60&w=800&auto=format&fit=crop",
    label: "Fondo de salon"
  };
  const degradadoMarca = "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))";
  const totalPasos = window.cumpleanos ? 2 : 1;
  const pasoActual = pasoCumple ? 2 : 1;
  const titulo = !necesitaNombre ? t("Entra con tu WhatsApp") : pasoCumple ? t("¿Cuándo es tu cumple?") : t("¡Qué bueno conocerte!");
  const apoyo = !necesitaNombre ? esProfesional ? "" : t("Si ya reservaste antes, entrarás directo sin contraseña.") : pasoCumple ? window.cumpleanos?.bonificacionConfig(config).activa ? t("Tu salón puede tener un detalle para ti ese día.") : t("Así tu salón podrá felicitarte ese día.") : t("Número nuevo — solo necesitamos tu nombre para registrarte.");
  const campo = "w-full px-4 py-3.5 rounded-2xl outline-none transition text-base";
  return /* @__PURE__ */ React.createElement("div", { className: "client-auth-screen min-h-screen flex items-center justify-center p-4 relative overflow-y-auto" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "client-auth-background absolute inset-0 z-0",
      style: { background: degradadoMarca }
    },
    /* @__PURE__ */ React.createElement(
      "img",
      {
        src: fondoPortada.image,
        alt: t("Fondo de salón"),
        onLoad: () => setImagenCargada(true),
        className: `client-auth-background-image w-full h-full object-cover transition-opacity duration-700 ${imagenCargada ? "opacity-100" : "opacity-0"}`
      }
    ),
    /* @__PURE__ */ React.createElement("div", { className: "client-auth-overlay absolute inset-0" })
  ), onGoBack && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onGoBack,
      className: "client-auth-back absolute top-4 left-4 z-20 rounded-full flex items-center justify-center transition-colors",
      style: { backgroundColor: "rgba(255,255,255,0.88)", boxShadow: "0 4px 14px rgba(20,8,14,0.25)" },
      title: t("Volver")
    },
    /* @__PURE__ */ React.createElement("i", { className: "icon-arrow-left text-xl", style: { color: "#1f2937" } })
  ), /* @__PURE__ */ React.createElement("div", { className: "client-auth-content relative z-10 max-w-md w-full mx-auto", style: { paddingTop: 48 } }, /* @__PURE__ */ React.createElement("div", { className: "client-auth-card" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "mx-auto flex items-center justify-center rounded-full overflow-hidden",
      style: { width: 88, height: 88, marginTop: -44, background: "#fff", border: "4px solid #fff", boxShadow: "0 10px 26px rgb(var(--brand-primary-rgb) / 0.32)" }
    },
    logoUrl ? /* @__PURE__ */ React.createElement("img", { src: logoUrl, alt: nombreNegocio, className: "w-full h-full object-contain" }) : /* @__PURE__ */ React.createElement(
      "span",
      {
        className: "w-full h-full flex items-center justify-center text-4xl font-extrabold text-white",
        style: { background: degradadoMarca }
      },
      inicial
    )
  ), /* @__PURE__ */ React.createElement("div", { className: "text-center mt-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500" }, t("Bienvenida a")), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-extrabold text-gray-900 leading-tight break-words" }, nombreNegocio)), disenoPendiente && /* @__PURE__ */ React.createElement("div", { className: "mt-5 flex items-center gap-3 rounded-2xl p-3", style: { background: "#f4ece9" } }, /* @__PURE__ */ React.createElement(
    "img",
    {
      src: window.urlImagenCloudinary ? window.urlImagenCloudinary(disenoPendiente.imagen_url, 120) : disenoPendiente.imagen_url,
      alt: disenoPendiente.titulo,
      className: "w-14 h-14 rounded-xl object-cover shrink-0"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 text-left" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 font-medium" }, t("Para pedir tu cita")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-900 font-bold truncate" }, disenoPendiente.titulo), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-600 mt-0.5" }, t("Entra con tu WhatsApp: es un paso y ya quedas registrada.")))), clientePendiente && /* @__PURE__ */ React.createElement("div", { className: "mt-5 rounded-2xl p-5 text-center", style: { background: "#fff7e6" } }, /* @__PURE__ */ React.createElement("p", { className: "text-4xl mb-2" }, "⏳"), /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-bold text-gray-900 mb-2" }, t("Tu solicitud ya llegó")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-700 leading-relaxed" }, t("{negocio} tiene que aceptarte antes de que puedas reservar. Te avisamos por aquí mismo: vuelve a entrar con tu WhatsApp más tarde.", { negocio: nombreNegocio || t("El salón") }))), !clientePendiente && /* @__PURE__ */ React.createElement("div", { className: "text-center mt-5 mb-4" }, necesitaNombre && !esProfesional && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "flex items-center justify-center gap-2 mb-2",
      role: "img",
      "aria-label": t("Paso {n} de {total}", { n: pasoActual, total: totalPasos })
    },
    Array.from({ length: totalPasos }, (_, i) => /* @__PURE__ */ React.createElement(
      "span",
      {
        key: i,
        className: "rounded-full transition-all",
        style: { height: 6, width: i + 1 === pasoActual ? 26 : 10, background: i + 1 <= pasoActual ? "var(--brand-primary)" : "#e7dcd8" }
      }
    ))
  ), /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-900" }, titulo), apoyo && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 mt-1 leading-snug" }, apoyo)), !clientePendiente && /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { hidden: pasoCumple }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-gray-700 mb-1.5" }, t("Tu número de WhatsApp")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "select",
    {
      value: codigoPaisCliente,
      onChange: (e) => {
        const nuevoCodigo = e.target.value;
        const local = window.normalizarTelefonoLocal ? window.normalizarTelefonoLocal(whatsapp, nuevoCodigo) : whatsapp.replace(/\D/g, "");
        setCodigoPaisCliente(nuevoCodigo);
        setWhatsapp(local);
        resetCliente();
      },
      className: "px-2 py-3.5 rounded-2xl outline-none text-sm font-semibold",
      style: { width: 112 }
    },
    paisesTelefono.map((pais) => /* @__PURE__ */ React.createElement("option", { key: pais.id, value: pais.codigo }, pais.bandera, " +", pais.codigo))
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "tel",
      name: "telefono",
      inputMode: "numeric",
      autoComplete: "tel-national",
      value: whatsapp,
      onChange: (e) => manejarCambioTelefono(e.target.value),
      className: `${campo} min-w-0 flex-1`,
      placeholder: paisTelefono.ejemplo || "51234567",
      required: true
    }
  ))), necesitaNombre && !clienteBloqueado && !esAdmin && !esProfesional && !pasoCumple && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-gray-700 mb-1.5" }, t("Tu nombre completo")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      name: "nombre",
      autoComplete: "name",
      autoCapitalize: "words",
      value: nombre,
      onChange: (e) => setNombre(e.target.value),
      className: campo,
      placeholder: t("Ej: María Pérez"),
      autoFocus: true
    }
  )), necesitaNombre && pasoCumple && window.cumpleanos && /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement(
    SelectorCumple,
    {
      dia: cumpleDia,
      mes: cumpleMes,
      claro: true,
      onCambio: (d, m) => {
        setCumpleDia(d);
        setCumpleMes(m);
      }
    }
  ), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setPasoCumple(false), className: "text-sm font-semibold text-gray-600" }, "← ", t("Atrás"))), verificando && /* @__PURE__ */ React.createElement("div", { className: "text-gray-700 text-sm p-2.5 rounded-2xl flex items-center gap-2", style: { background: "#f4ece9" } }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-4 w-4 border-2 border-t-transparent rounded-full", style: { borderColor: "var(--brand-primary)", borderTopColor: "transparent" } }), t("Verificando...")), esProfesional && profesionalInfo && !verificando && /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl p-4", style: { background: "#f4ece9" } }, /* @__PURE__ */ React.createElement("p", { className: "text-gray-900 font-bold text-xl" }, t("¡Hola, {nombre}!", { nombre: profesionalInfo.nombre })), /* @__PURE__ */ React.createElement("p", { className: "text-gray-600 text-sm" }, t("Ingresa tu contraseña para acceder al panel."))), esProfesional && profesionalInfo && !verificando && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-gray-700 mb-1.5" }, t("Contraseña profesional")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "password",
      value: profesionalPassword,
      onChange: (e) => setProfesionalPassword(e.target.value),
      className: campo,
      placeholder: t("Tu contraseña"),
      autoComplete: "current-password",
      autoFocus: true
    }
  )), error && !esAdmin && /* @__PURE__ */ React.createElement("div", { className: "text-sm p-3 rounded-2xl flex items-start gap-2 bg-red-50 text-red-700 border border-red-200" }, /* @__PURE__ */ React.createElement("i", { className: "icon-triangle-alert mt-0.5" }), /* @__PURE__ */ React.createElement("span", null, error)), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 pt-1" }, esProfesional && profesionalInfo && !verificando && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: ingresarComoProfesional,
      className: "w-full bg-gray-900 text-white py-4 rounded-full font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-xl" }, "✂️"),
    t("Ingresar como Profesional")
  ), !esProfesional && !clienteBloqueado && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "submit",
      disabled: verificando,
      className: "w-full text-white py-4 rounded-full font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg",
      style: { background: degradadoMarca, boxShadow: "0 12px 26px rgb(var(--brand-primary-rgb) / 0.38)" }
    },
    verificando ? t("Verificando...") : necesitaNombre && (pasoCumple || !window.cumpleanos) ? t("Registrarme y reservar") : t("Continuar")
  ), necesitaNombre && pasoCumple && !verificando && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: (e) => handleSubmit(e, true),
      className: "w-full py-2 text-sm font-semibold text-gray-500"
    },
    t("Prefiero no decirlo")
  ))))));
}
