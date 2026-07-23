function WhatsAppButton() {
  window.useIdioma();
  const t = window.t;
  const [telefono, setTelefono] = React.useState("55002272");
  const [nombreNegocio, setNombreNegocio] = React.useState("");
  const telefonoWhatsApp = window.normalizarTelefonoInternacional ? window.normalizarTelefonoInternacional(telefono) : String(telefono || "").replace(/\D/g, "");
  React.useEffect(() => {
    window.getTelefonoDuenno().then((tel) => {
      setTelefono(tel);
    });
    window.getNombreNegocio().then((nombre) => {
      setNombreNegocio(nombre);
    });
  }, []);
  return /* @__PURE__ */ React.createElement(
    "a",
    {
      href: `https://api.whatsapp.com/send?phone=${telefonoWhatsApp}&text=Hola%2C%20quiero%20consultar%20sobre%20turnos`,
      target: "_blank",
      className: "fixed bottom-6 right-6 z-50 bg-[#25D366] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-[#20bd5a] transition-all transform hover:scale-110 group",
      title: t("Chat en WhatsApp")
    },
    /* @__PURE__ */ React.createElement("div", { className: "icon-message-circle text-3xl" }),
    /* @__PURE__ */ React.createElement("span", { className: "absolute right-full mr-3 bg-gray-800 text-amber-400 px-3 py-1 rounded-lg text-sm font-medium shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-amber-600" }, t("¡Agenda tu turno!"))
  );
}
