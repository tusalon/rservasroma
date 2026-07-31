// Alinea el tema de Tailwind con la identidad de Rservasroma.
//
// OJO con los colores: la app es white-label. Cada salón guarda su
// color_primario y aplicarTemaNegocio() (utils/config-negocio-master.js) lo
// inyecta como --brand-primary, que unas reglas !important mapean sobre las
// clases pink-N. O sea que "pink-500" significa "el color de este salón", no
// rosa. Por eso aquí NO se redefine la escala pink: hacerlo pintaría de
// fucsia justo los tonos que esas reglas no alcanzan, y el resultado sería
// una pantalla con dos colores de marca peleándose.
// El fucsia de marca vive donde corresponde: como valor por defecto cuando el
// salón no eligió color.
(function () {
  var theme = document.createElement('style');
  theme.setAttribute('type', 'text/tailwindcss');
  theme.textContent = [
    '@theme {',
    // Sin fuentes externas: la app es PWA offline y sus usuarias pagan datos.
    '  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
    '}'
  ].join('\n');
  document.head.appendChild(theme);
})();
