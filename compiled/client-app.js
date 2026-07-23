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
function ClientApp() {
  const [step, setStep] = React.useState("auth");
  const [cliente, setCliente] = React.useState(null);
  const [selectedService, setSelectedService] = React.useState(null);
  const [selectedProfesional, setSelectedProfesional] = React.useState(null);
  const [selectedDate, setSelectedDate] = React.useState("");
  const [selectedTime, setSelectedTime] = React.useState("");
  const [bookingConfirmed, setBookingConfirmed] = React.useState(null);
  const [userRol, setUserRol] = React.useState("cliente");
  const [history, setHistory] = React.useState(["auth"]);
  const [horariosPorDia, setHorariosPorDia] = React.useState({});
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slugCliente = params.get("s");
    const esEntradaClienteMaster = Boolean(slugCliente && slugCliente.trim());
    const adminAuth = localStorage.getItem("adminAuth") === "true";
    const profesionalAuth = localStorage.getItem("profesionalAuth");
    const clienteAuth = window.getClienteAuthActual?.();
    if (!esEntradaClienteMaster && adminAuth) {
      console.log("👑 Usuario admin detectado, redirigiendo a admin.html");
      window.location.href = "admin.html";
      return;
    }
    if (!esEntradaClienteMaster && profesionalAuth) {
      console.log("👤 Usuario profesional detectado, redirigiendo a admin.html");
      window.location.href = "admin.html";
      return;
    }
    if (clienteAuth) {
      try {
        const clienteData = clienteAuth;
        setCliente(clienteData);
        setUserRol("cliente");
        const irCitas = params.get("ir") === "citas";
        setStep(irCitas ? "mybookings" : "welcome");
        setHistory(irCitas ? ["auth", "welcome", "mybookings"] : ["auth", "welcome"]);
        try {
          window.history.replaceState({ step: "auth" }, "");
          window.history.pushState({ step: "welcome" }, "");
          if (irCitas) window.history.pushState({ step: "mybookings" }, "");
        } catch (e) {
        }
        return;
      } catch (e) {
        console.error("Error al parsear clienteAuth", e);
        window.borrarClienteAuthActual?.();
      }
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
  const goBack = () => {
    if (history.length <= 1) return;
    window.history.back();
  };
  React.useEffect(() => {
    if (selectedService) {
      setTimeout(() => {
        document.getElementById("profesional-section")?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }, 300);
    }
  }, [selectedService]);
  React.useEffect(() => {
    if (selectedProfesional) {
      setTimeout(() => {
        document.getElementById("calendar-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedProfesional]);
  React.useEffect(() => {
    if (selectedDate) {
      setTimeout(() => {
        document.getElementById("time-section")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  }, [selectedDate]);
  const handleAccessGranted = (nombre, whatsapp) => {
    const clienteData = window.guardarClienteAuthActual({ nombre, whatsapp });
    setCliente(clienteData);
    setUserRol("cliente");
    navigateTo("welcome");
  };
  const handleStartBooking = () => {
    navigateTo("service");
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
          setTimeout(() => {
            document.getElementById("calendar-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 150);
          return;
        }
      }
    } catch (e) {
      console.error("Error auto-seleccionando profesional:", e);
    }
    setTimeout(() => {
      document.getElementById("profesional-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
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
    setSelectedService(null);
    setSelectedProfesional(null);
    setSelectedDate("");
    setSelectedTime("");
    setStep("service");
    setBookingConfirmed(null);
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
            onGoBack: history.length > 1 ? goBack : null
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
            onMisReservas: goToMyBookings
          }
        );
      case "mybookings":
        return /* @__PURE__ */ React.createElement(
          MyBookings,
          {
            cliente,
            onVolver: handleVolverDeMyBookings
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
        ), /* @__PURE__ */ React.createElement("div", { className: "max-w-3xl mx-auto px-4 py-4 space-y-4 pb-20" }, /* @__PURE__ */ React.createElement(
          ServiceSelection,
          {
            onSelect: handleServiceSelect,
            selectedService
          }
        ), selectedService && /* @__PURE__ */ React.createElement("div", { id: "profesional-section" }, selectedService.esMultiple ? /* @__PURE__ */ React.createElement(
          MultiProfesionalSelector,
          {
            onSelect: setSelectedProfesional,
            selectedProfesional,
            selectedService
          }
        ) : /* @__PURE__ */ React.createElement(
          ProfesionalSelector,
          {
            onSelect: setSelectedProfesional,
            selectedProfesional,
            selectedService
          }
        )), selectedProfesional && /* @__PURE__ */ React.createElement("div", { id: "calendar-section" }, /* @__PURE__ */ React.createElement(
          Calendar,
          {
            onDateSelect: setSelectedDate,
            selectedDate,
            profesional: selectedProfesional?.esMultiple ? selectedProfesional.asignaciones[0]?.profesional : selectedProfesional,
            profesionalCompleto: selectedProfesional,
            service: selectedService,
            onHorariosCargados: setHorariosPorDia
          }
        )), selectedDate && /* @__PURE__ */ React.createElement("div", { id: "time-section" }, selectedService.esMultiple ? /* @__PURE__ */ React.createElement(
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
        )), selectedTime && /* @__PURE__ */ React.createElement(
          BookingForm,
          {
            service: selectedService,
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
