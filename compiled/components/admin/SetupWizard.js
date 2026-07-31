const MONEDA_POR_PAIS = {
  "53": "CUP",
  // Cuba
  "34": "EUR",
  // España
  "52": "MXN",
  // México
  "1": "USD",
  "57": "COP",
  "58": "USD",
  "51": "PEN",
  "56": "CLP",
  "593": "USD",
  "39": "EUR",
  // Italia
  "33": "EUR",
  // Francia
  "49": "EUR",
  // Alemania
  "351": "EUR"
  // Portugal
};
const SLOTS_DIA = (() => {
  const slots = [];
  for (let i = 0; i < 48; i++) {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    slots.push({ indice: i, label: `${h12}:${m} ${ampm}` });
  }
  return slots;
})();
const GRUPOS_HORARIO = [
  { id: "manana", titulo: "Mañana", desde: 12, hasta: 23 },
  // 6:00 AM - 11:30 AM
  { id: "tarde", titulo: "Tarde", desde: 24, hasta: 35 },
  // 12:00 PM - 5:30 PM
  { id: "noche", titulo: "Noche", desde: 36, hasta: 47 }
  // 6:00 PM - 11:30 PM
];
const GRUPO_MADRUGADA = { id: "madrugada", titulo: "Madrugada", desde: 0, hasta: 11 };
function turnosCadaHora(horaInicio, horaFin) {
  const indices = [];
  for (let h = horaInicio; h < horaFin; h++) indices.push(h * 2);
  return indices;
}
function crearProfesionalWizard() {
  return {
    nombre: "",
    especialidad: "",
    telefono: "",
    password: "",
    nivel: 1,
    color: "bg-amber-600",
    avatar: "👤"
  };
}
function crearServicioWizard(moneda = "CUP") {
  return {
    nombre: "",
    categoria: null,
    descripcion: "",
    duracion: "60",
    precio_desde: "",
    precio_hasta: "",
    precio_moneda: moneda,
    requiere_anticipo: false,
    tipo_anticipo: "fijo",
    valor_anticipo: "",
    horarios_permitidos: "",
    // Solo controla si se muestra el campo de abajo; no se envia a la
    // base de datos (handleGuardar solo lee horarios_permitidos).
    mostrar_horarios_especiales: false
  };
}
function SetupWizard() {
  window.useIdioma();
  const t = window.t;
  const idioma = window.getIdioma ? window.getIdioma() : "es";
  const [step, setStep] = React.useState(0);
  const [negocioId, setNegocioId] = React.useState(null);
  const [monedaSugerida, setMonedaSugerida] = React.useState("CUP");
  const [cargando, setCargando] = React.useState(true);
  const [guardando, setGuardando] = React.useState(false);
  const [progresoGuardado, setProgresoGuardado] = React.useState("");
  const [error, setError] = React.useState("");
  const [exito, setExito] = React.useState(false);
  const [diaEditando, setDiaEditando] = React.useState(null);
  const [verMadrugada, setVerMadrugada] = React.useState(false);
  const DIAS = idioma === "en" ? [
    { id: "lunes", corto: "Mon", nombre: "Monday" },
    { id: "martes", corto: "Tue", nombre: "Tuesday" },
    { id: "miercoles", corto: "Wed", nombre: "Wednesday" },
    { id: "jueves", corto: "Thu", nombre: "Thursday" },
    { id: "viernes", corto: "Fri", nombre: "Friday" },
    { id: "sabado", corto: "Sat", nombre: "Saturday" },
    { id: "domingo", corto: "Sun", nombre: "Sunday" }
  ] : [
    { id: "lunes", corto: "Lun", nombre: "Lunes" },
    { id: "martes", corto: "Mar", nombre: "Martes" },
    { id: "miercoles", corto: "Mié", nombre: "Miércoles" },
    { id: "jueves", corto: "Jue", nombre: "Jueves" },
    { id: "viernes", corto: "Vie", nombre: "Viernes" },
    { id: "sabado", corto: "Sáb", nombre: "Sábado" },
    { id: "domingo", corto: "Dom", nombre: "Domingo" }
  ];
  const PAISES_TELEFONO = window.PHONE_COUNTRIES || [
    { id: "CU", nombre: "Cuba", bandera: "🇨🇺", codigo: "53", ejemplo: "53066647", localLength: 8 }
  ];
  const [config, setConfig] = React.useState({
    // Paso 1: negocio
    nombre: "",
    telefono_whatsapp: "",
    codigo_pais: "53",
    email: "",
    provincia: "",
    municipio: "",
    // Paso 2: profesionales
    // El primer profesional que se agrega aqui es, casi siempre, la
    // propia dueña configurando su negocio: arranca en Avanzado (nivel 3)
    // para que no tenga que descubrir por su cuenta que necesita subir su
    // propio nivel de acceso para ver todo el panel. Los que se agreguen
    // despues con "Añadir profesional" si arrancan en Basico (empleadas).
    profesionales: [{ ...crearProfesionalWizard(), nivel: 3 }],
    // Paso 3: servicios
    servicios: [crearServicioWizard("CUP")],
    // Paso 4: horarios disponibles (lista de slots) independientes por día
    horarios_dias: {
      lunes: { activo: true, horas: turnosCadaHora(9, 18) },
      martes: { activo: true, horas: turnosCadaHora(9, 18) },
      miercoles: { activo: true, horas: turnosCadaHora(9, 18) },
      jueves: { activo: true, horas: turnosCadaHora(9, 18) },
      viernes: { activo: true, horas: turnosCadaHora(9, 18) },
      sabado: { activo: true, horas: turnosCadaHora(9, 14) },
      domingo: { activo: false, horas: [] }
    },
    // Paso 5: estética (opcional)
    color_primario: "#c49b63",
    color_secundario: "#f59e0b",
    imagen_fondo_tipo: "unas",
    logo: null,
    logo_preview: "",
    // Defaults conservados para el negocio (editables luego en el panel)
    direccion: "",
    mensaje_bienvenida: "¡Bienvenido a nuestro salón!",
    mensaje_confirmacion: "Tu turno ha sido reservado con éxito",
    instagram: "",
    facebook: ""
  });
  React.useEffect(() => {
    const id = localStorage.getItem("negocioId");
    if (!id) {
      window.location.href = window.construirRutaConSlug("admin-login.html");
      return;
    }
    setNegocioId(id);
    cargarDatosNegocio(id);
  }, []);
  const cargarDatosNegocio = async (id) => {
    try {
      const response = await fetch(
        `${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${id}&select=nombre,telefono,email,provincia,municipio,imagen_fondo_tipo,codigo_pais`,
        {
          headers: {
            "apikey": window.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data[0]) {
          const codigoPais = String(data[0].codigo_pais || "53");
          if (window.setCodigoPaisTelefono) window.setCodigoPaisTelefono(codigoPais);
          const telefonoLocal = window.normalizarTelefonoLocal ? window.normalizarTelefonoLocal(data[0].telefono || "", codigoPais) : String(data[0].telefono || "").replace(/\D/g, "");
          setMonedaSugerida(MONEDA_POR_PAIS[codigoPais] || "CUP");
          const provincia = String(data[0].provincia || "").trim();
          const municipio = window.normalizarMunicipio ? window.normalizarMunicipio(provincia, data[0].municipio) : String(data[0].municipio || "").trim();
          setConfig((prev) => ({
            ...prev,
            nombre: data[0].nombre || "",
            telefono_whatsapp: telefonoLocal,
            codigo_pais: codigoPais,
            email: data[0].email || "",
            provincia,
            municipio,
            imagen_fondo_tipo: data[0].imagen_fondo_tipo || "unas"
          }));
        }
      }
    } catch (error2) {
      console.error("Error cargando datos:", error2);
    } finally {
      setCargando(false);
    }
  };
  const precioNumerico = (valor) => window.parsePrecioServicio ? window.parsePrecioServicio(valor, 0) : parseFloat(String(valor).replace(",", ".")) || 0;
  const profesionalesValidos = () => config.profesionales.filter(
    (p) => p.nombre.trim() && p.telefono.trim() && p.password.trim()
  );
  const serviciosValidos = () => config.servicios.filter(
    (s) => s.nombre.trim() && precioNumerico(s.precio_desde) >= 0 && parseInt(s.duracion, 10) >= 3
  );
  const paisTelefono = () => PAISES_TELEFONO.find((p) => String(p.codigo) === String(config.codigo_pais)) || PAISES_TELEFONO[0];
  const esNegocioCuba = String(config.codigo_pais || "53").replace(/\D/g, "") === "53";
  const diasActivos = () => DIAS.filter((d) => config.horarios_dias[d.id] && config.horarios_dias[d.id].activo);
  const validarPaso = () => {
    if (step === 1) {
      const pais = paisTelefono();
      if (!config.nombre.trim()) return t("El nombre del negocio es obligatorio");
      if (!config.codigo_pais) return t("Selecciona el pais del telefono");
      if (!config.telefono_whatsapp || config.telefono_whatsapp.length < Math.min(Number(pais.localLength || 8), 8)) return t("Ingresa un telefono valido");
      if (config.email && !config.email.includes("@")) return t("El email no es valido");
      if (!config.provincia.trim()) return esNegocioCuba ? t("Selecciona la provincia de tu negocio") : t("Escribe el estado o provincia de tu negocio");
      if (!config.municipio.trim()) return esNegocioCuba ? t("Selecciona el municipio de tu negocio") : t("Escribe la ciudad o municipio de tu negocio");
      if (esNegocioCuba) {
        const municipiosProvincia = window.CUBA_MUNICIPIOS && window.CUBA_MUNICIPIOS[config.provincia] || [];
        const municipioValido = municipiosProvincia.some(
          (municipio) => municipio.toLowerCase() === config.municipio.trim().toLowerCase()
        );
        if (!municipioValido) return t("Selecciona un municipio válido para la provincia");
      }
      return "";
    }
    if (step === 2) {
      if (profesionalesValidos().length === 0) return t("Agrega al menos un profesional con WhatsApp y contrasena");
      const incompleto = config.profesionales.find((p) => p.nombre.trim() && (!p.telefono.trim() || !p.password.trim()));
      if (incompleto) return t("Cada profesional con nombre necesita WhatsApp y contrasena");
      return "";
    }
    if (step === 3) {
      if (serviciosValidos().length === 0) return t("Agrega al menos un servicio con nombre y precio");
      const anticipoInvalido = config.servicios.find((s) => s.nombre.trim() && s.requiere_anticipo && precioNumerico(s.valor_anticipo) <= 0);
      if (anticipoInvalido) return t("El anticipo del servicio debe ser mayor que cero");
      return "";
    }
    if (step === 4) {
      const activos = diasActivos();
      if (activos.length === 0) return t("Selecciona al menos un día de trabajo");
      const sinHoras = activos.some((d) => (config.horarios_dias[d.id].horas || []).length === 0);
      if (sinHoras) return t("Cada día que trabajas necesita al menos un turno. Toca «Elegir horas» en el día que quedó vacío.");
    }
    return "";
  };
  const handleNext = () => {
    const err = validarPaso();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep(step + 1);
  };
  const handlePrev = () => {
    setError("");
    setStep(step - 1);
  };
  const actualizarServicio = (index, campo, valor) => {
    const nuevos = config.servicios.map((s, i) => i === index ? { ...s, [campo]: valor } : s);
    setConfig({ ...config, servicios: nuevos });
  };
  const actualizarProfesional = (index, campo, valor) => {
    const nuevos = config.profesionales.map((p, i) => i === index ? { ...p, [campo]: valor } : p);
    setConfig({ ...config, profesionales: nuevos });
  };
  const agregarProfesional = () => {
    setConfig({ ...config, profesionales: [...config.profesionales, crearProfesionalWizard()] });
  };
  const quitarProfesional = (index) => {
    if (config.profesionales.length === 1) return;
    setConfig({ ...config, profesionales: config.profesionales.filter((_, i) => i !== index) });
  };
  const agregarServicio = () => {
    setConfig({ ...config, servicios: [...config.servicios, crearServicioWizard(monedaSugerida)] });
  };
  const quitarServicio = (index) => {
    if (config.servicios.length === 1) return;
    setConfig({ ...config, servicios: config.servicios.filter((_, i) => i !== index) });
  };
  const cambiarCodigoPais = (codigo) => {
    const limpio = String(codigo || "53").replace(/\D/g, "") || "53";
    const cambioPais = limpio !== String(config.codigo_pais || "53").replace(/\D/g, "");
    const monedaAnterior = monedaSugerida;
    const telefonoLocal = window.normalizarTelefonoLocal ? window.normalizarTelefonoLocal(config.telefono_whatsapp, limpio) : String(config.telefono_whatsapp || "").replace(/\D/g, "");
    if (window.setCodigoPaisTelefono) window.setCodigoPaisTelefono(limpio);
    const moneda = window.getMonedaSugeridaPorCodigoPais && window.getMonedaSugeridaPorCodigoPais(limpio) || MONEDA_POR_PAIS[limpio] || monedaSugerida || "CUP";
    setMonedaSugerida(moneda);
    setConfig({
      ...config,
      codigo_pais: limpio,
      telefono_whatsapp: telefonoLocal,
      provincia: cambioPais ? "" : config.provincia,
      municipio: cambioPais ? "" : config.municipio,
      servicios: config.servicios.map((s) => ({
        ...s,
        precio_moneda: !s.precio_moneda || s.precio_moneda === monedaAnterior ? moneda : s.precio_moneda
      }))
    });
  };
  const cambiarProvincia = (provincia) => {
    const municipios = window.CUBA_MUNICIPIOS && window.CUBA_MUNICIPIOS[provincia] || [];
    const municipioActual = String(config.municipio || "").trim();
    const municipioCompatible = municipios.some(
      (municipio) => municipio.toLowerCase() === municipioActual.toLowerCase()
    );
    setConfig({
      ...config,
      provincia,
      municipio: municipioCompatible ? config.municipio : ""
    });
  };
  const toggleDiaActivo = (diaId) => {
    const actual = config.horarios_dias[diaId];
    const activando = !actual.activo;
    const horas = activando && (actual.horas || []).length === 0 ? turnosCadaHora(9, 18) : actual.horas;
    setConfig({ ...config, horarios_dias: { ...config.horarios_dias, [diaId]: { activo: activando, horas } } });
    if (activando) setDiaEditando(diaId);
  };
  const toggleSlot = (diaId, indice) => {
    const actual = config.horarios_dias[diaId];
    const horas = actual.horas.includes(indice) ? actual.horas.filter((i) => i !== indice) : [...actual.horas, indice].sort((a, b) => a - b);
    setConfig({ ...config, horarios_dias: { ...config.horarios_dias, [diaId]: { ...actual, horas } } });
  };
  const limpiarHorasDia = (diaId) => {
    const actual = config.horarios_dias[diaId];
    setConfig({ ...config, horarios_dias: { ...config.horarios_dias, [diaId]: { ...actual, horas: [] } } });
  };
  const copiarHorasDia = (diaDestino, diaOrigen) => {
    if (!diaOrigen || diaOrigen === diaDestino) return;
    const origen = config.horarios_dias[diaOrigen];
    const actual = config.horarios_dias[diaDestino];
    setConfig({ ...config, horarios_dias: { ...config.horarios_dias, [diaDestino]: { ...actual, horas: [...origen.horas] } } });
  };
  const turnosDelDiaLegibles = (diaId) => {
    const horas = (config.horarios_dias[diaId]?.horas || []).slice().sort((a, b) => a - b);
    return horas.map(labelSlot);
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
      reader.onloadend = () => setConfig((prev) => ({ ...prev, logo: file, logo_preview: reader.result }));
      reader.readAsDataURL(file);
    }
  };
  const subirLogo = async () => {
    if (!config.logo) return null;
    try {
      const fileExt = config.logo.name.split(".").pop();
      const fileName = `logo-${negocioId}-${Date.now()}.${fileExt}`;
      const response = await fetch(
        `${window.SUPABASE_URL}/storage/v1/object/negocios-logos/${fileName}`,
        {
          method: "POST",
          headers: {
            "apikey": window.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
          },
          body: config.logo
        }
      );
      if (!response.ok) {
        console.error("Error subiendo logo:", await response.text());
        return null;
      }
      return `${window.SUPABASE_URL}/storage/v1/object/public/negocios-logos/${fileName}`;
    } catch (error2) {
      console.error("Error:", error2);
      return null;
    }
  };
  const guardarHorariosProfesional = async (profesionalId) => {
    const horariosPorDia = {};
    const dias = [];
    const todasLasHoras = /* @__PURE__ */ new Set();
    DIAS.forEach((d) => {
      const cfg = config.horarios_dias[d.id];
      if (cfg && cfg.activo && (cfg.horas || []).length > 0) {
        const indices = [...cfg.horas].sort((a, b) => a - b);
        horariosPorDia[d.id] = indices;
        dias.push(d.id);
        indices.forEach((i) => todasLasHoras.add(i));
      } else {
        horariosPorDia[d.id] = [];
      }
    });
    const horas = Array.from(todasLasHoras).sort((a, b) => a - b);
    const response = await fetch(`${window.SUPABASE_URL}/rest/v1/horarios_profesionales`, {
      method: "POST",
      headers: {
        "apikey": window.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        negocio_id: negocioId,
        profesional_id: profesionalId,
        horarios_por_dia: horariosPorDia,
        horas,
        dias
      })
    });
    return response.ok;
  };
  const labelSlot = (indice) => {
    const s = SLOTS_DIA.find((x) => x.indice === indice);
    return s ? s.label : "";
  };
  const textoHorarioLegible = () => {
    const partes = DIAS.filter((d) => config.horarios_dias[d.id] && config.horarios_dias[d.id].activo && config.horarios_dias[d.id].horas.length).map((d) => `${d.corto} (${config.horarios_dias[d.id].horas.length})`);
    return partes.join(" · ");
  };
  const normalizarSetupTexto = (valor) => String(valor || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const limpiarDatosDemo = async () => {
    if (!negocioId || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;
    const headers = {
      "apikey": window.SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    };
    const [profRes, servRes] = await Promise.all([
      fetch(`${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&select=id,nombre`, { headers }),
      fetch(`${window.SUPABASE_URL}/rest/v1/servicios?negocio_id=eq.${negocioId}&select=id,nombre`, { headers })
    ]);
    const profesionales = profRes.ok ? await profRes.json() : [];
    const servicios = servRes.ok ? await servRes.json() : [];
    const idsProfesionalesDemo = profesionales.filter((p) => ["profesional principal", "profesional de prueba"].includes(normalizarSetupTexto(p.nombre))).map((p) => p.id);
    const idsServiciosDemo = servicios.filter((s) => normalizarSetupTexto(s.nombre) === "servicio de prueba").map((s) => s.id);
    if (idsProfesionalesDemo.length) {
      const ids = idsProfesionalesDemo.join(",");
      await fetch(`${window.SUPABASE_URL}/rest/v1/horarios_profesionales?negocio_id=eq.${negocioId}&profesional_id=in.(${ids})`, { method: "DELETE", headers }).catch(() => {
      });
      await fetch(`${window.SUPABASE_URL}/rest/v1/servicios_profesionales?negocio_id=eq.${negocioId}&profesional_id=in.(${ids})`, { method: "DELETE", headers }).catch(() => {
      });
      await fetch(`${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&id=in.(${ids})`, { method: "DELETE", headers }).catch(() => {
      });
    }
    if (idsServiciosDemo.length) {
      const ids = idsServiciosDemo.join(",");
      await fetch(`${window.SUPABASE_URL}/rest/v1/servicios_profesionales?negocio_id=eq.${negocioId}&servicio_id=in.(${ids})`, { method: "DELETE", headers }).catch(() => {
      });
      await fetch(`${window.SUPABASE_URL}/rest/v1/servicios?negocio_id=eq.${negocioId}&id=in.(${ids})`, { method: "DELETE", headers }).catch(() => {
      });
    }
  };
  const handleGuardar = async () => {
    setGuardando(true);
    setError("");
    try {
      if (negocioId) window.NEGOCIO_ID_POR_DEFECTO = negocioId;
      setProgresoGuardado(t("Limpiando datos de prueba..."));
      await limpiarDatosDemo();
      setProgresoGuardado(t("Creando profesionales..."));
      const profesionalesCreados = [];
      for (const p of profesionalesValidos()) {
        const telefono = window.normalizarTelefonoLocal ? window.normalizarTelefonoLocal(p.telefono, config.codigo_pais) : String(p.telefono || "").replace(/\D/g, "");
        const creado = await window.salonProfesionales.crear({
          nombre: p.nombre.trim(),
          especialidad: p.especialidad.trim() || t("General"),
          telefono,
          password: p.password,
          nivel: parseInt(p.nivel, 10) || 1,
          color: p.color || "bg-amber-600",
          avatar: p.avatar || "👤"
        });
        if (creado && creado.id) profesionalesCreados.push(creado);
      }
      if (profesionalesCreados.length === 0) throw new Error(t("No se pudo crear el profesional. Intenta de nuevo."));
      setProgresoGuardado(t("Creando servicios..."));
      const idsServicios = [];
      for (const s of serviciosValidos()) {
        const precioDesde = precioNumerico(s.precio_desde);
        const precioHasta = String(s.precio_hasta || "").trim() ? precioNumerico(s.precio_hasta) : null;
        const valorAnticipo = String(s.valor_anticipo || "").trim() ? precioNumerico(s.valor_anticipo) : null;
        const horarios = String(s.horarios_permitidos || "").trim() ? String(s.horarios_permitidos).split(",").map((h) => h.trim()).filter((h) => h.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) : [];
        const creado = await window.salonServicios.crear({
          nombre: s.nombre.trim(),
          duracion: parseInt(s.duracion) || 60,
          precio: precioDesde,
          precio_desde: precioDesde,
          precio_hasta: precioHasta,
          precio_moneda: s.precio_moneda || monedaSugerida,
          categoria: s.categoria || null,
          descripcion: String(s.descripcion || "").trim(),
          requiere_anticipo: s.requiere_anticipo === true,
          tipo_anticipo: s.tipo_anticipo === "porcentaje" ? "porcentaje" : "fijo",
          valor_anticipo: s.requiere_anticipo ? valorAnticipo : null,
          horarios_permitidos: horarios
        });
        if (creado && creado.id) idsServicios.push(creado.id);
      }
      setProgresoGuardado(t("Vinculando servicios..."));
      for (const sid of idsServicios) {
        for (const prof of profesionalesCreados) {
          await window.asignarProfesionalAServicio(sid, prof.id);
        }
      }
      setProgresoGuardado(t("Guardando horarios..."));
      for (const prof of profesionalesCreados) {
        await guardarHorariosProfesional(prof.id);
      }
      let logo_url = null;
      if (config.logo) {
        setProgresoGuardado(t("Subiendo logo..."));
        logo_url = await subirLogo();
      }
      setProgresoGuardado(t("Finalizando..."));
      const datosNegocio = {
        nombre: config.nombre,
        telefono: config.telefono_whatsapp,
        codigo_pais: config.codigo_pais,
        email: config.email || null,
        direccion: config.direccion || null,
        provincia: config.provincia.trim(),
        municipio: config.municipio.trim(),
        color_primario: config.color_primario,
        color_secundario: config.color_secundario,
        imagen_fondo_tipo: config.imagen_fondo_tipo || "unas",
        mensaje_bienvenida: config.mensaje_bienvenida,
        mensaje_confirmacion: config.mensaje_confirmacion,
        horario_atencion: textoHorarioLegible() || null,
        configurado: true,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (logo_url) datosNegocio.logo_url = logo_url;
      const response = await fetch(
        `${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${negocioId}`,
        {
          method: "PATCH",
          headers: {
            "apikey": window.SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify(datosNegocio)
        }
      );
      if (!response.ok) {
        console.error("Error PATCH negocio:", await response.text());
        throw new Error(t("Error guardando configuración"));
      }
      setExito(true);
      const slug = (new URLSearchParams(window.location.search).get("s") || localStorage.getItem("adminSlug") || localStorage.getItem("negocioSlug") || "").toLowerCase().trim();
      setTimeout(() => {
        window.location.href = "admin.html" + (slug ? "?s=" + encodeURIComponent(slug) : "");
      }, 2e3);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || t("Error al guardar la configuración"));
    } finally {
      setGuardando(false);
      setProgresoGuardado("");
    }
  };
  const PASOS = [
    t("Negocio"),
    t("Profesional"),
    t("Servicios"),
    t("Horarios"),
    t("Listo")
  ];
  if (cargando) {
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex items-center justify-center" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" }));
  }
  if (exito) {
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white p-8 rounded-2xl shadow-xl max-w-md text-center animate-fade-in" }, /* @__PURE__ */ React.createElement("div", { className: "text-6xl mb-4" }, "🎉"), /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-gray-900 mb-2" }, t("¡Tu salón está listo!")), /* @__PURE__ */ React.createElement("p", { className: "text-gray-600 mb-4" }, t("Ya puedes recibir reservas. Redirigiendo al panel...")), /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto" })));
  }
  if (step === 0) {
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center px-4 py-12" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-fade-in" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-end mb-2 -mt-2 -mr-2" }, /* @__PURE__ */ React.createElement(window.LanguageToggle, null)), /* @__PURE__ */ React.createElement("div", { className: "w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4" }, "💅"), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-gray-900" }, t("¡Vamos a dejar tu salón listo!")), /* @__PURE__ */ React.createElement("p", { className: "text-gray-600 mt-3 leading-relaxed" }, t("Para que tus clientas puedan reservar necesitamos algunos datos: tu negocio, quien atiende, que servicios ofreces y tus horarios. Puedes cambiar todo despues desde el panel.")), /* @__PURE__ */ React.createElement("div", { className: "mt-6 space-y-2 text-left" }, PASOS.map((nombre, i) => /* @__PURE__ */ React.createElement("div", { key: nombre, className: "flex items-center gap-3 text-sm text-gray-700" }, /* @__PURE__ */ React.createElement("span", { className: "w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0" }, i + 1), nombre))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-5" }, t("Toma unos minutos. Vamos paso a paso.")), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setStep(1),
        className: "mt-6 w-full px-6 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition"
      },
      t("Empezar"),
      " →"
    )));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gray-100 py-12 px-4" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-3xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-end mb-2" }, /* @__PURE__ */ React.createElement(window.LanguageToggle, null)), /* @__PURE__ */ React.createElement("div", { className: "text-center mb-8" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center text-3xl" }, "💅")), /* @__PURE__ */ React.createElement("h1", { className: "text-3xl font-bold text-gray-900" }, t("Configura tu salón")), /* @__PURE__ */ React.createElement("p", { className: "text-gray-600 mt-2" }, t("Unos pasos rápidos y empiezas a recibir reservas"))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between mb-8" }, [1, 2, 3, 4, 5].map((s) => /* @__PURE__ */ React.createElement("div", { key: s, className: "flex-1 text-center" }, /* @__PURE__ */ React.createElement("div", { className: `
                                w-10 h-10 rounded-full mx-auto flex items-center justify-center font-bold transition-all
                                ${s === step ? "bg-amber-600 text-white shadow-md scale-110" : s < step ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}
                            ` }, s < step ? "✓" : s), /* @__PURE__ */ React.createElement("div", { className: "text-xs mt-1 text-gray-600" }, PASOS[s - 1])))), error && /* @__PURE__ */ React.createElement("div", { className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "⚠️"), /* @__PURE__ */ React.createElement("span", null, error))), step === 1 && /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6 space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold mb-4" }, "🏠 ", t("Datos del negocio")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Nombre del negocio *")), /* @__PURE__ */ React.createElement("input", { type: "text", value: config.nombre, onChange: (e) => setConfig({ ...config, nombre: e.target.value }), className: "w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500", placeholder: t("Ej: BennetSalon"), autoFocus: true })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "WhatsApp *"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-[minmax(130px,190px)_1fr] gap-2" }, /* @__PURE__ */ React.createElement("select", { value: config.codigo_pais, onChange: (e) => cambiarCodigoPais(e.target.value), className: "w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500" }, PAISES_TELEFONO.map((pais) => /* @__PURE__ */ React.createElement("option", { key: pais.codigo, value: pais.codigo }, pais.bandera || "", " ", pais.nombre, " +", pais.codigo))), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "tel",
      value: config.telefono_whatsapp,
      onChange: (e) => setConfig({ ...config, telefono_whatsapp: window.normalizarTelefonoLocal ? window.normalizarTelefonoLocal(e.target.value, config.codigo_pais) : e.target.value.replace(/\D/g, "") }),
      className: "w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500",
      placeholder: paisTelefono()?.ejemplo || "54438629"
    }
  )), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-1" }, t("Se usara como"), " ", window.formatearTelefono ? window.formatearTelefono(config.telefono_whatsapp, config.codigo_pais) : "+" + config.codigo_pais + " " + config.telefono_whatsapp)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Email"), /* @__PURE__ */ React.createElement("input", { type: "email", value: config.email, onChange: (e) => setConfig({ ...config, email: e.target.value }), className: "w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500", placeholder: "salon@gmail.com" })), /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-amber-200 bg-amber-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3 mb-3" }, /* @__PURE__ */ React.createElement("i", { className: "icon-map-pin text-amber-700 text-xl mt-0.5" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-amber-950" }, t("Ubicación del negocio")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-800 mt-1" }, esNegocioCuba ? t("Estos datos permiten que encuentren tu salón por provincia y municipio en RomaHub.") : t("Para otros países, escribe manualmente el estado o provincia y la ciudad o municipio.")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-700 mt-1" }, t("El país seleccionado para WhatsApp se usará también como país del negocio.")))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, esNegocioCuba ? t("Provincia *") : t("Estado o provincia *")), esNegocioCuba ? /* @__PURE__ */ React.createElement(
    "select",
    {
      value: config.provincia,
      onChange: (e) => cambiarProvincia(e.target.value),
      className: "w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, t("Selecciona provincia")),
    (window.CUBA_PROVINCIAS || []).map((provincia) => /* @__PURE__ */ React.createElement("option", { key: provincia, value: provincia }, provincia))
  ) : /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.provincia,
      onChange: (e) => setConfig({ ...config, provincia: e.target.value }),
      maxLength: "80",
      className: "w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500",
      placeholder: t("Escribe el estado o provincia")
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, esNegocioCuba ? t("Municipio *") : t("Ciudad o municipio *")), esNegocioCuba ? /* @__PURE__ */ React.createElement(
    "select",
    {
      value: config.municipio,
      onChange: (e) => setConfig({ ...config, municipio: e.target.value }),
      disabled: !config.provincia,
      className: "w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:text-gray-400"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, config.provincia ? t("Selecciona municipio") : t("Elige primero la provincia")),
    (window.CUBA_MUNICIPIOS && window.CUBA_MUNICIPIOS[config.provincia] || []).map((municipio) => /* @__PURE__ */ React.createElement("option", { key: municipio, value: municipio }, municipio))
  ) : /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.municipio,
      onChange: (e) => setConfig({ ...config, municipio: e.target.value }),
      maxLength: "80",
      className: "w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500",
      placeholder: t("Escribe la ciudad o municipio")
    }
  ))))), step === 2 && /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6 space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold mb-1" }, "👥 ", t("Quien atiende")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 mb-3" }, t("Agrega uno o varios profesionales con acceso al panel."))), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: agregarProfesional, className: "px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700" }, t("Anadir profesional"))), config.profesionales.map((p, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "border rounded-xl p-4 space-y-3 bg-gray-50" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-gray-800" }, t("Profesional"), " ", i + 1), config.profesionales.length > 1 && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => quitarProfesional(i), className: "text-sm text-red-600 hover:underline" }, t("Quitar"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: p.nombre, onChange: (e) => actualizarProfesional(i, "nombre", e.target.value), className: "w-full border rounded-lg px-3 py-2", placeholder: t("Nombre *") }), /* @__PURE__ */ React.createElement("input", { type: "text", value: p.especialidad, onChange: (e) => actualizarProfesional(i, "especialidad", e.target.value), className: "w-full border rounded-lg px-3 py-2", placeholder: t("Especialidad") })), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3" }, /* @__PURE__ */ React.createElement("select", { value: p.nivel, onChange: (e) => actualizarProfesional(i, "nivel", parseInt(e.target.value, 10)), className: "w-full border rounded-lg px-3 py-2 bg-white" }, /* @__PURE__ */ React.createElement("option", { value: "1" }, "🔰 ", t("Basico")), /* @__PURE__ */ React.createElement("option", { value: "2" }, "⭐ ", t("Intermedio")), /* @__PURE__ */ React.createElement("option", { value: "3" }, "👑 ", t("Avanzado"))), /* @__PURE__ */ React.createElement("input", { type: "tel", value: p.telefono, onChange: (e) => actualizarProfesional(i, "telefono", window.normalizarTelefonoLocal ? window.normalizarTelefonoLocal(e.target.value, config.codigo_pais) : e.target.value.replace(/\D/g, "")), className: "w-full border rounded-lg px-3 py-2", placeholder: "WhatsApp +" + config.codigo_pais }), /* @__PURE__ */ React.createElement("input", { type: "password", value: p.password, onChange: (e) => actualizarProfesional(i, "password", e.target.value), className: "w-full border rounded-lg px-3 py-2", placeholder: t("Contrasena de acceso *") })), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 -mt-2" }, t("👑 Avanzado ve todo el negocio (recomendado si es la dueña). ⭐ Intermedio ve agenda y clientes. 🔰 Basico solo ve su propia agenda.")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("select", { value: p.avatar, onChange: (e) => actualizarProfesional(i, "avatar", e.target.value), className: "w-full border rounded-lg px-3 py-2 bg-white" }, ["👤", "💇", "💅", "👑", "⭐", "🔰"].map((a) => /* @__PURE__ */ React.createElement("option", { key: a, value: a }, a))), /* @__PURE__ */ React.createElement("select", { value: p.color, onChange: (e) => actualizarProfesional(i, "color", e.target.value), className: "w-full border rounded-lg px-3 py-2 bg-white" }, /* @__PURE__ */ React.createElement("option", { value: "bg-amber-600" }, t("Ambar")), /* @__PURE__ */ React.createElement("option", { value: "bg-pink-500" }, t("Rosa")), /* @__PURE__ */ React.createElement("option", { value: "bg-purple-500" }, t("Purpura")), /* @__PURE__ */ React.createElement("option", { value: "bg-blue-500" }, t("Azul")), /* @__PURE__ */ React.createElement("option", { value: "bg-green-500" }, t("Verde"))))))), step === 3 && /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6 space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold mb-1" }, "💅 ", t("Servicios")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 mb-3" }, t("Empieza con uno y agrega los que necesites con precio, duracion y reglas."))), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: agregarServicio, className: "px-3 py-2 bg-pink-600 text-white rounded-full text-sm font-semibold hover:bg-pink-700" }, t("Anadir servicio"))), config.servicios.map((s, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "border rounded-xl p-4 space-y-3 bg-gray-50" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-gray-800" }, t("Servicio"), " ", i + 1), config.servicios.length > 1 && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => quitarServicio(i), className: "text-sm text-red-600 hover:underline" }, t("Quitar"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: s.nombre, onChange: (e) => actualizarServicio(i, "nombre", e.target.value), className: "w-full border rounded-lg px-3 py-2", placeholder: t("Nombre del servicio *") }), /* @__PURE__ */ React.createElement("input", { type: "text", value: s.duracion, onChange: (e) => actualizarServicio(i, "duracion", e.target.value.replace(/\D/g, "")), className: "w-full border rounded-lg px-3 py-2", placeholder: t("Duracion en minutos"), inputMode: "numeric" })), /* @__PURE__ */ React.createElement("textarea", { value: s.descripcion, onChange: (e) => actualizarServicio(i, "descripcion", e.target.value), className: "w-full border rounded-lg px-3 py-2", rows: "3", placeholder: t("Descripcion") }), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3" }, /* @__PURE__ */ React.createElement("select", { value: s.precio_moneda || monedaSugerida, onChange: (e) => actualizarServicio(i, "precio_moneda", e.target.value), className: "w-full border rounded-lg px-3 py-2 bg-white" }, /* @__PURE__ */ React.createElement("option", { value: "CUP" }, "CUP"), /* @__PURE__ */ React.createElement("option", { value: "USD" }, "USD"), /* @__PURE__ */ React.createElement("option", { value: "EUR" }, "EUR"), /* @__PURE__ */ React.createElement("option", { value: "MXN" }, "MXN"), /* @__PURE__ */ React.createElement("option", { value: "COP" }, "COP"), /* @__PURE__ */ React.createElement("option", { value: "PEN" }, "PEN"), /* @__PURE__ */ React.createElement("option", { value: "CLP" }, "CLP")), /* @__PURE__ */ React.createElement("input", { type: "text", value: s.precio_desde, onChange: (e) => actualizarServicio(i, "precio_desde", e.target.value.replace(/[^0-9.,]/g, "")), className: "w-full border rounded-lg px-3 py-2", placeholder: t("Precio desde *"), inputMode: "decimal" }), /* @__PURE__ */ React.createElement("input", { type: "text", value: s.precio_hasta, onChange: (e) => actualizarServicio(i, "precio_hasta", e.target.value.replace(/[^0-9.,]/g, "")), className: "w-full border rounded-lg px-3 py-2", placeholder: t("Precio hasta opcional"), inputMode: "decimal" })), /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-amber-100 bg-amber-50 p-3 space-y-3" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center justify-between gap-3 cursor-pointer" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-amber-800" }, t("Anticipo propio de este servicio")), /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: s.requiere_anticipo, onChange: (e) => actualizarServicio(i, "requiere_anticipo", e.target.checked), className: "w-5 h-5 text-amber-600" })), s.requiere_anticipo && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("select", { value: s.tipo_anticipo, onChange: (e) => actualizarServicio(i, "tipo_anticipo", e.target.value), className: "w-full border border-amber-200 rounded-lg px-3 py-2 bg-white" }, /* @__PURE__ */ React.createElement("option", { value: "fijo" }, t("Monto fijo")), /* @__PURE__ */ React.createElement("option", { value: "porcentaje" }, t("Porcentaje"))), /* @__PURE__ */ React.createElement("input", { value: s.valor_anticipo, onChange: (e) => actualizarServicio(i, "valor_anticipo", e.target.value.replace(/[^0-9.,]/g, "")), className: "w-full border border-amber-200 rounded-lg px-3 py-2", placeholder: s.tipo_anticipo === "porcentaje" ? t("Ej: 30") : t("Ej: 500"), inputMode: "decimal" }))), /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center justify-between gap-3 cursor-pointer" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-gray-700" }, t("Este servicio solo se reserva en horarios especiales")), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: s.mostrar_horarios_especiales,
      onChange: (e) => {
        const marcado = e.target.checked;
        const nuevos = config.servicios.map((s2, idx) => idx === i ? { ...s2, mostrar_horarios_especiales: marcado, horarios_permitidos: marcado ? s2.horarios_permitidos : "" } : s2);
        setConfig({ ...config, servicios: nuevos });
      },
      className: "w-5 h-5 text-amber-600"
    }
  )), s.mostrar_horarios_especiales ? /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("input", { value: s.horarios_permitidos, onChange: (e) => actualizarServicio(i, "horarios_permitidos", e.target.value), className: "w-full border rounded-lg px-3 py-2", placeholder: t("Ej: 09:00, 11:00, 15:00") }), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-1" }, t("Escribe las horas exactas separadas por coma."))) : /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500" }, t("La mayoria de los servicios no necesita esto: se reserva en cualquier horario del profesional.")))))), step === 4 && /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6 space-y-4 animate-fade-in" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold mb-1" }, "🕐 ", t("¿A qué hora empiezan tus turnos?")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500" }, t("Marca la hora a la que empieza cada cita. Tus clientas verán exactamente esas horas para reservar."))), /* @__PURE__ */ React.createElement("div", { className: "rounded-lg bg-blue-50 border border-blue-200 p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-blue-900 leading-relaxed" }, t("Ejemplo: si atiendes a las 9, a las 11 y a la 1, marca solo esas tres. No hace falta marcar todas las horas que estás abierta."))), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-gray-700" }, t("Toca un día para abrirlo y elegir sus turnos:")), DIAS.map((d) => {
    const cfg = config.horarios_dias[d.id];
    const editando = diaEditando === d.id;
    return /* @__PURE__ */ React.createElement("div", { key: d.id, className: `rounded-lg border transition-all ${cfg.activo ? "border-amber-200 bg-amber-50/40" : "border-gray-200 bg-gray-50"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 p-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => toggleDiaActivo(d.id),
        className: `w-14 shrink-0 px-2 py-2 rounded-lg text-sm font-bold transition-all ${cfg.activo ? "bg-amber-600 text-white shadow" : "bg-gray-200 text-gray-500"}`
      },
      d.corto
    ), cfg.activo ? /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-700 truncate" }, cfg.horas.length > 0 ? `${cfg.horas.length} ${cfg.horas.length === 1 ? t("turno") : t("turnos")}: ${turnosDelDiaLegibles(d.id).join(" · ")}` : t("Sin turnos — toca «Elegir horas»"))) : /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 text-sm flex-1" }, t("Cerrado")), cfg.activo && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setDiaEditando(editando ? null : d.id),
        className: "text-xs font-semibold text-amber-700 hover:underline shrink-0"
      },
      editando ? t("Cerrar") : t("Elegir horas")
    )), cfg.activo && editando && /* @__PURE__ */ React.createElement("div", { className: "px-3 pb-3" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-lg bg-white border border-amber-200 p-3 mb-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-gray-500 mb-1.5" }, t("Tus clientas verán estos turnos:")), cfg.horas.length > 0 ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1.5" }, turnosDelDiaLegibles(d.id).map((hora) => /* @__PURE__ */ React.createElement("span", { key: hora, className: "px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-bold" }, hora))) : /* @__PURE__ */ React.createElement("p", { className: "text-xs text-red-600 font-semibold" }, t("Ninguno todavía. Marca abajo las horas en que atiendes."))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 mb-3" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => limpiarHorasDia(d.id), className: "text-xs px-2.5 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" }, t("Quitar todos")), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: "",
        onChange: (e) => {
          copiarHorasDia(d.id, e.target.value);
          e.target.value = "";
        },
        className: "text-xs border rounded px-2 py-1.5 bg-white"
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, t("Copiar turnos de otro día…")),
      DIAS.filter((x) => x.id !== d.id && config.horarios_dias[x.id].horas.length > 0).map((x) => /* @__PURE__ */ React.createElement("option", { key: x.id, value: x.id }, x.nombre, " (", config.horarios_dias[x.id].horas.length, ")"))
    )), (verMadrugada ? [GRUPO_MADRUGADA, ...GRUPOS_HORARIO] : GRUPOS_HORARIO).map((grupo) => /* @__PURE__ */ React.createElement("div", { key: grupo.id, className: "mb-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5" }, t(grupo.titulo)), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-4 sm:grid-cols-6 gap-1.5" }, SLOTS_DIA.filter((s) => s.indice >= grupo.desde && s.indice <= grupo.hasta).map((slot) => {
      const activa = cfg.horas.includes(slot.indice);
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: slot.indice,
          type: "button",
          onClick: () => toggleSlot(d.id, slot.indice),
          className: `px-1 py-2 text-xs font-semibold rounded-lg transition-all ${activa ? "bg-amber-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-amber-400"}`
        },
        slot.label
      );
    })))), !verMadrugada && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setVerMadrugada(true), className: "text-xs text-gray-500 hover:text-amber-700 underline" }, t("¿Atiendes de madrugada? Mostrar esas horas"))));
  })), step === 5 && /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-sm p-6 space-y-5 animate-fade-in" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold mb-1" }, "✨ ", t("Toque final (opcional)")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500" }, t("Puedes saltar esto y cambiarlo luego desde el panel.")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Color principal")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "color",
      value: config.color_primario,
      onChange: (e) => setConfig({ ...config, color_primario: e.target.value }),
      className: "w-10 h-10 rounded border"
    }
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: config.color_primario,
      onChange: (e) => setConfig({ ...config, color_primario: e.target.value }),
      className: "flex-1 border rounded-lg px-3 py-2",
      placeholder: "#c49b63"
    }
  ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, t("Logo del negocio")), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-amber-500 transition cursor-pointer",
      onClick: () => document.getElementById("logo-input").click()
    },
    /* @__PURE__ */ React.createElement("input", { id: "logo-input", type: "file", accept: "image/*", onChange: handleLogoChange, className: "hidden" }),
    config.logo_preview ? /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("img", { src: config.logo_preview, alt: "Preview", className: "h-20 object-contain mx-auto" }), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500" }, t("Haz clic para cambiar"))) : /* @__PURE__ */ React.createElement("div", { className: "py-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-3xl mb-1" }, "🖼️"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-600 text-sm" }, t("Haz clic para subir un logo")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-1" }, t("PNG, JPG hasta 2MB")))
  )), (window.HERO_BACKGROUND_OPTIONS || []).length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, t("Imagen de fondo para clientes")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-3 gap-3" }, (window.HERO_BACKGROUND_OPTIONS || []).map((opcion) => /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      key: opcion.id,
      onClick: () => setConfig({ ...config, imagen_fondo_tipo: opcion.id }),
      className: `overflow-hidden rounded-lg border-2 bg-white text-left transition ${config.imagen_fondo_tipo === opcion.id ? "border-amber-600 ring-2 ring-amber-200" : "border-gray-200 hover:border-amber-300"}`
    },
    /* @__PURE__ */ React.createElement("img", { src: opcion.image, alt: opcion.label, className: "h-20 w-full object-cover" }),
    /* @__PURE__ */ React.createElement("div", { className: "p-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-gray-900" }, t(opcion.label)))
  )))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 rounded-lg p-4 space-y-2 text-sm" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-gray-700" }, "📋 ", t("Resumen")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-[auto_1fr] gap-x-3 gap-y-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-500" }, t("Negocio:")), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, config.nombre), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500" }, t("Ubicación:")), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, [config.municipio, config.provincia].filter(Boolean).join(", ") || "—"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500" }, t("Profesional:")), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, profesionalesValidos().map((p) => p.nombre.trim()).join(", ") || "—"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500" }, t("Servicios:")), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, serviciosValidos().map((s) => s.nombre.trim()).join(", ") || "—"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500" }, t("Horario:")), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, textoHorarioLegible() || "—")))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between mt-6" }, step > 1 ? /* @__PURE__ */ React.createElement("button", { onClick: handlePrev, className: "px-6 py-2 border rounded-lg hover:bg-gray-100 transition", disabled: guardando }, "← ", t("Atrás")) : /* @__PURE__ */ React.createElement("div", null), step < 5 ? /* @__PURE__ */ React.createElement("button", { onClick: handleNext, className: "px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition", disabled: guardando }, t("Continuar"), " →") : /* @__PURE__ */ React.createElement("button", { onClick: handleGuardar, className: "px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2", disabled: guardando }, guardando ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" }), progresoGuardado || t("Guardando...")) : /* @__PURE__ */ React.createElement(React.Fragment, null, "✓ ", t("Finalizar y abrir mi salón")))), /* @__PURE__ */ React.createElement("div", { className: "text-center mt-4 text-sm text-gray-500" }, t("Paso {n} de 5", { n: step }))));
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ React.createElement(SetupWizard, null));
