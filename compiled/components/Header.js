function Header({ cliente, onLogout, onMisReservas, onGoBack, userRol, showBackButton }) {
  window.useIdioma();
  const t = window.t;
  const [mostrarOpcionesAdmin, setMostrarOpcionesAdmin] = React.useState(false);
  const [nombreNegocio, setNombreNegocio] = React.useState("Mi Salón");
  React.useEffect(() => {
    window.getNombreNegocio().then((nombre) => {
      setNombreNegocio(nombre);
    });
  }, []);
  const goToAdmin = () => {
    const isAdmin = localStorage.getItem("adminAuth") === "true";
    const profesionalAuth = localStorage.getItem("profesionalAuth");
    if (isAdmin || profesionalAuth) {
      window.location.href = "admin.html";
    }
  };
  const tieneAcceso = userRol === "admin" || userRol === "profesional";
  return /* @__PURE__ */ React.createElement("header", { className: "bg-white shadow-sm sticky top-0 z-50" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-3xl mx-auto px-4 py-4 flex justify-between items-center" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, showBackButton && onGoBack && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onGoBack,
      className: "w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors mr-2",
      title: t("Volver")
    },
    /* @__PURE__ */ React.createElement("i", { className: "icon-arrow-left text-gray-600" })
  ), /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white" }, /* @__PURE__ */ React.createElement("i", { className: "icon-calendar text-lg" })), /* @__PURE__ */ React.createElement("h1", { className: "text-xl font-bold text-gray-800" }, nombreNegocio)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, cliente && /* @__PURE__ */ React.createElement("div", { className: "hidden sm:flex items-center gap-1 text-sm text-gray-600" }, /* @__PURE__ */ React.createElement("i", { className: "icon-user-check text-green-500" }), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, cliente.nombre)), cliente && onMisReservas && userRol === "cliente" && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onMisReservas,
      className: "flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-2 rounded-full transition-all",
      title: t("Mis Reservas")
    },
    /* @__PURE__ */ React.createElement("i", { className: "icon-calendar" }),
    /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium" }, t("Mis Citas"))
  ), tieneAcceso && /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: goToAdmin,
      className: "flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-3 py-2 rounded-full transition-all transform hover:scale-105 shadow-md border border-amber-400",
      title: userRol === "admin" ? t("Panel de Administración") : t("Mi Panel de Trabajo"),
      onMouseEnter: () => setMostrarOpcionesAdmin(true),
      onMouseLeave: () => setMostrarOpcionesAdmin(false)
    },
    /* @__PURE__ */ React.createElement("i", { className: userRol === "admin" ? "icon-shield-check" : "icon-briefcase" }),
    /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium hidden sm:inline" }, userRol === "admin" ? t("Admin") : t("Mi Panel")),
    /* @__PURE__ */ React.createElement("span", { className: "w-2 h-2 bg-green-400 rounded-full animate-pulse" })
  ), mostrarOpcionesAdmin && /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-amber-700 p-2 text-xs text-gray-300 z-50" }, userRol === "admin" ? /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-amber-400" }, "👑 ", t("Acceso como administrador")), /* @__PURE__ */ React.createElement("p", { className: "text-gray-400" }, t("Puede gestionar todo el sistema"))) : /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-amber-400" }, "✂️ ", t("Acceso como profesional")), /* @__PURE__ */ React.createElement("p", { className: "text-gray-400" }, t("Bienvenido, {nombre}", { nombre: cliente?.nombre })), /* @__PURE__ */ React.createElement("p", { className: "text-gray-500 text-xs" }, t("Puedes ver tus reservas"))))), /* @__PURE__ */ React.createElement(window.LanguageToggle, null), cliente && onLogout && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onLogout,
      className: "w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors group relative",
      title: t("Cerrar sesión")
    },
    /* @__PURE__ */ React.createElement("i", { className: "icon-log-out text-gray-500 group-hover:text-red-600" })
  ))));
}
