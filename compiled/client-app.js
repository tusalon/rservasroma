console.log("🚀 CLIENT-APP.JS VERSIÓN:", "2024-03-01");
window.addEventListener("error", function(e) {
  if (!e || !e.message) return;
  console.error("❌ Error detectado, posible versión antigua:", e.message);
  if (e.message.includes("Failed to load") || e.message.includes("Unexpected token")) {
    let intentosRecarga = 0;
    try {
      intentosRecarga = parseInt(sessionStorage.getItem("recargasPorError") || "0", 10) || 0;
    } catch (err) {
    }
    if (intentosRecarga >= 2) {
      console.warn("🔁 Límite de recargas por error alcanzado; no se recarga más.");
      return;
    }
    try {
      sessionStorage.setItem("recargasPorError", String(intentosRecarga + 1));
    } catch (err) {
    }
    console.log("🔄 Forzando recarga por posible versión antigua...");
    if (window.swRegistration) {
      window.swRegistration.unregister().then(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  }
});
setTimeout(function() {
  try {
    sessionStorage.removeItem("recargasPorError");
  } catch (err) {
  }
}, 15e3);
function getClienteAuthScope() {
  const slugUrl = new URLSearchParams(window.location.search).get("s");
  const slug = window._rservasSlugActual || slugUrl || localStorage.getItem("negocioSlug") || "";
  if (slug) return `slug:${String(slug).toLowerCase().trim()}`;
  const negocioId = window.getNegocioId?.() || window.NEGOCIO_ID_POR_DEFECTO || "";
  return negocioId ? `id:${negocioId}` : "";
}
function getClienteAuthStorageKey() {
  const scope = getClienteAuthScope();
  return scope ? `clienteAuth:${scope}` : "clienteAuth";
}
window.getClienteAuthActual = function() {
  const scope = getClienteAuthScope();
  const scopedKey = getClienteAuthStorageKey();
  const scoped = localStorage.getItem(scopedKey);
  if (scoped) return JSON.parse(scoped);
  const legacy = localStorage.getItem("clienteAuth");
  if (!legacy) return null;
  const cliente = JSON.parse(legacy);
  if (cliente?.negocio_scope && cliente.negocio_scope !== scope) return null;
  if (scope) {
    const migrado = { ...cliente, negocio_scope: scope };
    localStorage.setItem(scopedKey, JSON.stringify(migrado));
    localStorage.setItem("clienteAuth", JSON.stringify(migrado));
    return migrado;
  }
  return cliente;
};
window.guardarClienteAuthActual = function(cliente) {
  const scope = getClienteAuthScope();
  const scoped = { ...cliente, negocio_scope: scope || void 0 };
  localStorage.setItem(getClienteAuthStorageKey(), JSON.stringify(scoped));
  localStorage.setItem("clienteAuth", JSON.stringify(scoped));
  return scoped;
};
window.borrarClienteAuthActual = function() {
  const scope = getClienteAuthScope();
  localStorage.removeItem(getClienteAuthStorageKey());
  try {
    const legacy = JSON.parse(localStorage.getItem("clienteAuth") || "null");
    if (!legacy?.negocio_scope || legacy.negocio_scope === scope) {
      localStorage.removeItem("clienteAuth");
    }
  } catch (error) {
    localStorage.removeItem("clienteAuth");
  }
};
function CumpleClienteCard({ cliente }) {
  const t = window.t;
  const [estado, setEstado] = React.useState("oculta");
  const [bono, setBono] = React.useState(null);
  const [salon, setSalon] = React.useState("");
  const [dia, setDia] = React.useState("");
  const [mes, setMes] = React.useState("");
  const [error, setError] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);
  const whatsapp = cliente?.whatsapp;
  const negocioId = window.getNegocioId?.();
  const claveAplazo = `cumpleClienteAplazadoHasta:${negocioId}:${whatsapp}`;
  React.useEffect(() => {
    if (!whatsapp || !negocioId || !window.cumpleanos) return;
    try {
      if (Date.now() < (Number(localStorage.getItem(claveAplazo)) || 0)) return;
    } catch (e) {
    }
    let cancelado = false;
    const headers = { apikey: window.SUPABASE_ANON_KEY, Authorization: `Bearer ${window.SUPABASE_ANON_KEY}` };
    (async () => {
      try {
        const [rn, rc] = await Promise.all([
          fetch(`${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${encodeURIComponent(negocioId)}&select=nombre,cumple_bonificacion_activa,cumple_bonificacion_tipo,cumple_bonificacion_valor,cumple_bonificacion_regalo,cumple_bonificacion_ventana`, { headers }),
          fetch(`${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${encodeURIComponent(negocioId)}&whatsapp=eq.${encodeURIComponent(whatsapp)}&select=cumple_dia,cumple_mes`, { headers })
        ]);
        if (!rn.ok || !rc.ok) return;
        const negocio = (await rn.json())[0];
        const fila = (await rc.json())[0];
        if (cancelado || !negocio || !fila) return;
        const config = window.cumpleanos.bonificacionConfig(negocio);
        if (window.cumpleanos.cumpleDe(fila, "cumple_dia", "cumple_mes")) return;
        setBono(config);
        setSalon(negocio.nombre || "");
        setEstado("pregunta");
      } catch (e) {
        console.warn("No se pudo preparar la tarjeta de cumpleaños:", e);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [whatsapp, negocioId]);
  if (estado === "oculta" || !bono) return null;
  const aplazar = () => {
    try {
      localStorage.setItem(claveAplazo, String(Date.now() + 7 * 864e5));
    } catch (e) {
    }
    setEstado("oculta");
  };
  const guardar = async () => {
    const cumple = window.cumpleanos.normalizarCumple(dia, mes);
    if (!dia || !mes) return setError(t("Elige el día y el mes."));
    if (!cumple) return setError(t("Esa fecha no existe."));
    setGuardando(true);
    setError("");
    let ok = false;
    try {
      ok = await window.guardarCumpleCliente(whatsapp, cumple);
    } catch (e) {
      console.warn("No se pudo guardar el cumpleaños:", e);
    }
    setGuardando(false);
    if (!ok) return setError(t("No se pudo guardar. Inténtalo de nuevo."));
    setEstado("listo");
  };
  if (estado === "listo") {
    return /* @__PURE__ */ React.createElement("div", { role: "status", className: "bg-white rounded-2xl shadow-sm p-4 text-sm text-gray-800" }, "🎂 ", t("¡Anotado! Tu salón te lo tendrá en cuenta."));
  }
  return /* @__PURE__ */ React.createElement("section", { className: "bg-white rounded-2xl shadow-sm p-4 border border-pink-100", "aria-labelledby": "cumple-titulo" }, /* @__PURE__ */ React.createElement("h2", { id: "cumple-titulo", className: "font-bold text-gray-900" }, "🎂 ", t("¿Cuándo es tu cumpleaños?")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-700 mt-1" }, !bono.activa ? t("{salon} quiere felicitarte en tu cumpleaños.", { salon: salon || t("Tu salón") }) : bono.tipo === "regalo" ? t("{salon} tiene un regalo para ti en tu cumpleaños: {regalo}.", { salon: salon || t("Tu salón"), regalo: bono.regalo }) : t("{salon} tiene {pct}% de descuento para ti en tu cumpleaños.", { salon: salon || t("Tu salón"), pct: bono.pct })), /* @__PURE__ */ React.createElement("div", { className: "mt-3" }, /* @__PURE__ */ React.createElement(SelectorCumple, { dia, mes, claro: true, onCambio: (d, m) => {
    setDia(d);
    setMes(m);
    setError("");
  } })), error && /* @__PURE__ */ React.createElement("p", { role: "alert", className: "text-sm text-red-700 mt-2" }, error), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mt-3" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: aplazar, className: "flex-1 min-h-[44px] rounded-full border border-gray-300 bg-white font-semibold text-gray-800" }, t("Ahora no")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: guardar, disabled: guardando, className: "flex-1 min-h-[44px] rounded-full bg-pink-500 font-bold text-white disabled:opacity-50" }, guardando ? t("Guardando…") : t("Guardar"))));
}
function ClientApp() {
  const [step, setStep] = React.useState("auth");
  const [cliente, setCliente] = React.useState(null);
  const [selectedService, setSelectedService] = React.useState(null);
  const [selectedProfesional, setSelectedProfesional] = React.useState(null);
  const [selectedDate, setSelectedDate] = React.useState("");
  const [selectedTime, setSelectedTime] = React.useState("");
  const [bookingConfirmed, setBookingConfirmed] = React.useState(null);
  const [paso, setPaso] = React.useState(0);
  const [userRol, setUserRol] = React.useState("cliente");
  const [history, setHistory] = React.useState(["auth"]);
  const [horariosPorDia, setHorariosPorDia] = React.useState({});
  const [disenoElegido, setDisenoElegido] = React.useState(null);
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slugCliente = params.get("s");
    const esEntradaClienteMaster = Boolean(slugCliente && slugCliente.trim());
    const adminAuth = localStorage.getItem("adminAuth") === "true";
    const profesionalAuth = localStorage.getItem("profesionalAuth");
    const clienteAuth = window.getClienteAuthActual?.();
    if (!esEntradaClienteMaster && adminAuth) {
      console.log("👑 Usuario admin detectado, redirigiendo a admin.html");
      window.location.href = window.construirRutaConSlug("admin.html");
      return;
    }
    if (!esEntradaClienteMaster && profesionalAuth) {
      console.log("👤 Usuario profesional detectado, redirigiendo a admin.html");
      window.location.href = window.construirRutaConSlug("admin.html");
      return;
    }
    if (clienteAuth) {
      try {
        const clienteData = clienteAuth;
        setCliente(clienteData);
        setUserRol("cliente");
        const ir = params.get("ir");
        const destino = ir === "citas" ? "mybookings" : ir === "catalogo" ? "catalogo" : null;
        setStep(destino || "welcome");
        setHistory(destino ? ["auth", "welcome", destino] : ["auth", "welcome"]);
        try {
          window.history.replaceState({ step: "auth" }, "");
          window.history.pushState({ step: "welcome" }, "");
          if (destino) window.history.pushState({ step: destino }, "");
        } catch (e) {
        }
        return;
      } catch (e) {
        console.error("Error al parsear clienteAuth", e);
        window.borrarClienteAuthActual?.();
      }
    }
    if (params.get("ir") === "catalogo") {
      setStep("catalogo");
      setHistory(["auth", "catalogo"]);
      try {
        window.history.replaceState({ step: "auth" }, "");
        window.history.pushState({ step: "catalogo" }, "");
      } catch (e) {
      }
      return;
    }
    try {
      window.history.replaceState({ step: "auth" }, "");
    } catch (e) {
    }
  }, []);
  React.useEffect(() => {
    const handlePopState = (event) => {
      const pasoAnterior = event.state && event.state.step;
      if (!pasoAnterior) return;
      setStep(pasoAnterior);
      if (pasoAnterior === "service") setPaso(event.state.paso || 0);
      setHistory((prev) => {
        const idx = prev.lastIndexOf(pasoAnterior);
        return idx >= 0 ? prev.slice(0, idx + 1) : [pasoAnterior];
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const navigateTo = (newStep) => {
    setHistory((prev) => [...prev, newStep]);
    setStep(newStep);
    try {
      window.history.pushState({ step: newStep }, "");
    } catch (e) {
    }
  };
  const irAPaso = (n) => {
    setPaso(n);
    try {
      window.history.pushState({ step: "service", paso: n }, "");
    } catch (e) {
    }
  };
  const goBack = () => {
    if (history.length <= 1) return;
    window.history.back();
  };
  React.useEffect(() => {
    if (step === "service") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [paso, step]);
  const handleAccessGranted = (nombre, whatsapp) => {
    const clienteData = window.guardarClienteAuthActual({ nombre, whatsapp });
    setCliente(clienteData);
    setUserRol("cliente");
    if (disenoElegido) {
      navigateTo("service");
      preseleccionarServicioDeDiseno(disenoElegido);
      return;
    }
    navigateTo("welcome");
  };
  const handleStartBooking = () => {
    setDisenoElegido(null);
    setPaso(0);
    navigateTo("service");
  };
  const handleVerCatalogo = () => {
    navigateTo("catalogo");
  };
  const handleReservarDiseno = async (diseno) => {
    setDisenoElegido(diseno);
    if (!cliente) {
      navigateTo("auth");
      return;
    }
    navigateTo("service");
    preseleccionarServicioDeDiseno(diseno);
  };
  const preseleccionarServicioDeDiseno = async (diseno) => {
    if (!diseno?.servicio_id) return;
    try {
      const servicios = await window.salonServicios?.getAll?.(true);
      const servicio = (servicios || []).find((s) => String(s.id) === String(diseno.servicio_id));
      if (servicio) await handleServiceSelect(servicio);
    } catch (e) {
      console.error("No se pudo preseleccionar el servicio del diseño:", e);
    }
  };
  const handleServiceSelect = async (service) => {
    setSelectedService(service);
    setSelectedProfesional(null);
    setSelectedDate("");
    setSelectedTime("");
    setHorariosPorDia({});
    try {
      if (!service?.esMultiple) {
        const profesionales = await window.salonProfesionales?.getAll?.();
        let candidatos = (profesionales || []).filter((p) => p.activo !== false);
        if (window.getProfesionalesPorServicio && service?.id) {
          const asignados = await window.getProfesionalesPorServicio(service.id);
          const idsAsignados = (asignados || []).map((p) => p.id);
          if (idsAsignados.length > 0) {
            candidatos = candidatos.filter((p) => idsAsignados.includes(p.id));
          }
        }
        if (candidatos.length === 1) {
          setSelectedProfesional(candidatos[0]);
          irAPaso(2);
          return;
        }
      }
    } catch (e) {
      console.error("Error auto-seleccionando profesional:", e);
    }
    irAPaso(1);
  };
  const handleNoAvailability = React.useCallback(() => {
    setSelectedDate("");
    setSelectedTime("");
  }, []);
  const handleLogout = () => {
    if (!confirm(window.t("¿Cerrar tu sesión?"))) return;
    window.borrarClienteAuthActual?.();
    setCliente(null);
    setSelectedService(null);
    setSelectedProfesional(null);
    setSelectedDate("");
    setSelectedTime("");
    setUserRol("cliente");
    setHistory(["auth"]);
    setStep("auth");
    window.location.href = "index.html" + window.location.search;
  };
  const resetBooking = () => {
    setDisenoElegido(null);
    setSelectedService(null);
    setSelectedProfesional(null);
    setSelectedDate("");
    setSelectedTime("");
    setPaso(0);
    setStep("service");
    setBookingConfirmed(null);
  };
  const handleRepetir = async (turno) => {
    setDisenoElegido(null);
    navigateTo("service");
    try {
      const servicios = await window.salonServicios?.getAll?.(true);
      const servicio = (servicios || []).find((s) => s.nombre === turno.servicio);
      if (!servicio) return;
      await handleServiceSelect(servicio);
      const profesionales = await window.salonProfesionales?.getAll?.();
      const profesional = (profesionales || []).find((p) => String(p.id) === String(turno.profesional_id || turno.trabajador_id));
      const asignados = window.getProfesionalesPorServicio ? await window.getProfesionalesPorServicio(servicio.id) : [];
      const lahace = !asignados?.length || asignados.some((p) => String(p.id) === String(profesional?.id));
      if (profesional && profesional.activo !== false && lahace) {
        setSelectedProfesional(profesional);
        irAPaso(2);
      }
    } catch (e) {
      console.error("No se pudo repetir la cita:", e);
    }
  };
  const goToMyBookings = () => {
    navigateTo("mybookings");
  };
  const handleVolverDeMyBookings = () => {
    goBack();
  };
  const renderStep = () => {
    switch (step) {
      case "auth":
        return /* @__PURE__ */ React.createElement(
          ClientAuthScreen,
          {
            onAccessGranted: handleAccessGranted,
            onGoBack: history.length > 1 ? goBack : null,
            disenoPendiente: disenoElegido
          }
        );
      case "welcome":
        return /* @__PURE__ */ React.createElement(
          WelcomeScreen,
          {
            onStart: handleStartBooking,
            onGoBack: goBack,
            cliente,
            userRol,
            onMisReservas: goToMyBookings,
            onCatalogo: handleVerCatalogo,
            onLogout: handleLogout
          }
        );
      case "catalogo":
        return /* @__PURE__ */ React.createElement(
          Catalogo,
          {
            cliente,
            onGoBack: goBack,
            onReservarDiseno: handleReservarDiseno
          }
        );
      case "mybookings":
        return /* @__PURE__ */ React.createElement(
          MyBookings,
          {
            cliente,
            onVolver: handleVolverDeMyBookings,
            onRepetir: handleRepetir
          }
        );
      case "service":
        return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gradient-to-b from-pink-50 to-pink-100" }, /* @__PURE__ */ React.createElement(
          Header,
          {
            cliente,
            onLogout: handleLogout,
            onMisReservas: goToMyBookings,
            onGoBack: goBack,
            userRol,
            showBackButton: true
          }
        ), /* @__PURE__ */ React.createElement("div", { className: "max-w-3xl mx-auto px-4 py-4 space-y-4 pb-20" }, disenoElegido && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 bg-white rounded-2xl shadow-sm p-3" }, /* @__PURE__ */ React.createElement(
          "img",
          {
            src: window.urlImagenCloudinary(disenoElegido.imagen_url, 120),
            alt: disenoElegido.titulo,
            className: "w-14 h-14 rounded-xl object-cover"
          }
        ), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-pink-500 font-medium" }, window.t("Elegido del catálogo")), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-gray-800 truncate" }, disenoElegido.titulo)), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setDisenoElegido(null),
            className: "text-gray-400 text-sm px-2"
          },
          "✕"
        )), (() => {
          const t = window.t;
          const clave = (p) => p?.esMultiple ? (p.asignaciones || []).map((a) => a.profesional?.id).join(",") : p?.id;
          const alcanzable = [true, !!selectedService, !!(selectedService && selectedProfesional), !!(selectedService && selectedProfesional && selectedDate)];
          const visible = alcanzable[paso] ? paso : alcanzable.lastIndexOf(true);
          const fechaCorta = (f) => {
            const d = /* @__PURE__ */ new Date(`${f}T12:00:00`);
            return Number.isNaN(d.getTime()) ? f : d.toLocaleDateString(window.getIdioma?.() === "en" ? "en" : "es", { weekday: "short", day: "numeric", month: "short" });
          };
          const ticket = [
            [t("Servicio"), selectedService?.nombre],
            [t("Con"), selectedProfesional ? selectedProfesional.esMultiple ? t("Varias") : selectedProfesional.nombre : ""],
            [t("Día"), selectedDate ? fechaCorta(selectedDate) : ""],
            [t("Hora"), selectedTime && window.formatTo12Hour ? window.formatTo12Hour(selectedTime) : selectedTime]
          ];
          const pregunta = [t("¿Qué te hacemos hoy?"), t("¿Con quién?"), t("¿Qué día?"), t("¿A qué hora?")][visible];
          const partes = pregunta.match(/^(.*\s)(\S+)(\?)$/);
          const elegirProfesional = (p) => {
            const cambio = clave(p) !== clave(selectedProfesional);
            setSelectedProfesional(p);
            if (p && (!p.esMultiple || cambio)) irAPaso(2);
          };
          return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-sm p-1.5 grid gap-1", style: { gridTemplateColumns: "repeat(4, minmax(0, 1fr))" } }, ticket.map(([etiqueta, valor], n) => /* @__PURE__ */ React.createElement(
            "button",
            {
              key: n,
              type: "button",
              disabled: !alcanzable[n],
              onClick: () => irAPaso(n),
              className: `min-w-0 text-left rounded-xl px-2 py-1.5 transition-colors ${n === visible ? "bg-pink-50" : ""}`
            },
            /* @__PURE__ */ React.createElement("span", { className: `block text-[11px] font-bold uppercase tracking-wide ${n === visible ? "text-pink-600" : "text-gray-500"}` }, etiqueta),
            /* @__PURE__ */ React.createElement("span", { className: `block text-sm font-bold truncate ${valor ? "text-gray-900" : "text-gray-300"}` }, valor || "—")
          ))), /* @__PURE__ */ React.createElement("div", { className: "h-1 rounded-full bg-gray-200 overflow-hidden" }, /* @__PURE__ */ React.createElement(
            "div",
            {
              className: "h-full bg-pink-500 rounded-full transition-all duration-300",
              style: { width: `${selectedTime ? 100 : (visible + 1) * 20}%` }
            }
          )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold uppercase tracking-wider text-gray-500" }, t("Paso {n} de 4", { n: visible + 1 })), /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-extrabold text-gray-900 mt-1" }, partes ? /* @__PURE__ */ React.createElement(React.Fragment, null, partes[1], /* @__PURE__ */ React.createElement("span", { className: "text-pink-600" }, partes[2]), partes[3]) : pregunta)), /* @__PURE__ */ React.createElement("div", { key: visible, className: "paso-reserva animate-fade-in space-y-4" }, visible === 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(CumpleClienteCard, { cliente }), /* @__PURE__ */ React.createElement(ServiceSelection, { onSelect: handleServiceSelect, selectedService })), visible === 1 && (selectedService.esMultiple ? /* @__PURE__ */ React.createElement(MultiProfesionalSelector, { onSelect: elegirProfesional, selectedProfesional, selectedService }) : /* @__PURE__ */ React.createElement(ProfesionalSelector, { onSelect: elegirProfesional, selectedProfesional, selectedService })), visible === 2 && /* @__PURE__ */ React.createElement(
            Calendar,
            {
              onDateSelect: (fecha) => {
                setSelectedDate(fecha);
                setSelectedTime("");
                irAPaso(3);
              },
              selectedDate,
              profesional: selectedProfesional?.esMultiple ? selectedProfesional.asignaciones[0]?.profesional : selectedProfesional,
              profesionalCompleto: selectedProfesional,
              service: selectedService,
              onHorariosCargados: setHorariosPorDia
            }
          ), visible === 3 && (selectedService.esMultiple ? /* @__PURE__ */ React.createElement(
            MultiTimeSlots,
            {
              service: selectedService,
              date: selectedDate,
              profesional: selectedProfesional,
              onTimeSelect: setSelectedTime,
              selectedTime,
              onNoAvailability: handleNoAvailability
            }
          ) : /* @__PURE__ */ React.createElement(
            TimeSlots,
            {
              service: selectedService,
              date: selectedDate,
              profesional: selectedProfesional,
              cliente,
              onTimeSelect: setSelectedTime,
              selectedTime,
              horariosPorDia
            }
          ))));
        })(), selectedTime && /* @__PURE__ */ React.createElement(
          BookingForm,
          {
            service: selectedService,
            diseno: disenoElegido,
            profesional: selectedProfesional,
            date: selectedDate,
            time: selectedTime,
            cliente,
            onSubmit: (booking) => {
              setBookingConfirmed(booking);
              try {
                const negocioId = window.getNegocioId?.() || "";
                if (negocioId && booking?.servicio) {
                  localStorage.setItem("ultimoServicio:" + negocioId, booking.servicio);
                }
              } catch (e) {
              }
              setSelectedTime("");
              setSelectedDate("");
              setPaso(0);
              navigateTo("confirmation");
            },
            onCancel: () => setSelectedTime("")
          }
        ), /* @__PURE__ */ React.createElement(WhatsAppButton, null)));
      case "confirmation":
        return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gradient-to-b from-pink-50 to-pink-100" }, /* @__PURE__ */ React.createElement(
          Header,
          {
            cliente,
            onLogout: handleLogout,
            onGoBack: goBack,
            userRol,
            showBackButton: true
          }
        ), /* @__PURE__ */ React.createElement(
          Confirmation,
          {
            booking: bookingConfirmed,
            onReset: resetBooking
          }
        ));
      default:
        return null;
    }
  };
  return renderStep();
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ React.createElement(ClientApp, null));
