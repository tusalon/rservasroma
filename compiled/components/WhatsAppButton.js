function WhatsAppButton() {
  window.useIdioma();
  const t = window.t;
  const [telefono, setTelefono] = React.useState("55002272");
  const [codigoPais, setCodigoPais] = React.useState("");
  const [nombreNegocio, setNombreNegocio] = React.useState("");
  const telefonoWhatsApp = window.normalizarTelefonoInternacional ? window.normalizarTelefonoInternacional(telefono, codigoPais) : String(telefono || "").replace(/\D/g, "");
  React.useEffect(() => {
    window.getTelefonoDuenno().then((tel) => {
      setTelefono(tel);
    });
    window.getNombreNegocio().then((nombre) => {
      setNombreNegocio(nombre);
    });
    if (window.getCodigoPaisNegocio) {
      window.getCodigoPaisNegocio().then((codigo) => {
        setCodigoPais(codigo);
      });
    }
  }, []);
  return /* @__PURE__ */ React.createElement(
    "a",
    {
      href: `https://api.whatsapp.com/send?phone=${telefonoWhatsApp}&text=Hola%2C%20quiero%20consultar%20sobre%20turnos`,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "fixed z-50 bg-white w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105 group",
      style: { right: 16, bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)", boxShadow: "0 4px 8px rgba(17,12,46,.06), 0 12px 28px rgba(17,12,46,.14)" },
      title: t("Chat en WhatsApp"),
      "aria-label": t("Chat en WhatsApp")
    },
    /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 720 720", width: "30", height: "30", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { fill: "#25D366", d: "M360,0C161.18,0,0,161.18,0,360c0,65.41,17.45,126.75,47.94,179.61L0,720l187.02-44.21c51.34,28.18,110.28,44.21,172.98,44.21,198.82,0,360-161.18,360-360S558.82,0,360,0ZM360,655.52c-60.17,0-116.13-17.98-162.82-48.87l-110.49,28.14,30.99-105.61c-33.53-47.93-53.2-106.26-53.2-169.19,0-163.21,132.31-295.52,295.52-295.52s295.52,132.31,295.52,295.52-132.31,295.52-295.52,295.52Z" }), /* @__PURE__ */ React.createElement("path", { fill: "#25D366", d: "M444.35,407.52l87.1,41.06c4,1.88,6.56,5.94,6.2,10.34-.94,11.46-5.54,34.43-26.13,55.02-58.12,58.12-162.49-7.64-166.74-10.18-25.67-13.79-50.06-32.24-73.19-55.36-23.12-23.12-41.58-47.52-55.37-73.19-2.55-4.24-68.31-108.61-10.18-166.74,20.59-20.59,43.56-25.19,55.02-26.13,4.41-.36,8.46,2.2,10.34,6.2l41.07,87.1c1.94,4.12,1.09,9.02-2.13,12.24l-30.61,30.61c-6.62,6.62-8.56,16.93-4,25.11,11.17,20.03,26.19,39.32,43.59,57.07,17.75,17.4,37.04,32.43,57.07,43.59,8.18,4.56,18.48,2.62,25.11-4l30.61-30.61c3.22-3.22,8.12-4.08,12.24-2.13Z" })),
    /* @__PURE__ */ React.createElement("span", { className: "absolute right-full mr-3 bg-gray-800 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-gray-600" }, t("¡Agenda tu cita!"))
  );
}
