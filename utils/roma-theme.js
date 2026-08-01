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
//
// La tipografía se define aquí solo para Tailwind (clases font-sans, text-*).
// El @font-face de Inter y las reglas base viven en utils/roma-typography.css,
// que sí llega a las páginas sin Tailwind y a iOS antiguo.
(function () {
  var theme = document.createElement('style');
  theme.setAttribute('type', 'text/tailwindcss');
  theme.textContent = [
    '@theme {',
    // Inter servida desde vendor/fonts (48 KB, subset latino). Sin fuentes
    // externas: la app es PWA offline y sus usuarias pagan datos.
    '  --font-sans: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
    '',
    // Tracking negativo progresivo en los tamaños de titular. Las sans-serif
    // se ven sueltas de 20px para arriba; los tamaños de cuerpo no se tocan
    // porque apretarlos empeora la lectura en móvil.
    '  --text-lg--letter-spacing: -0.008em;',
    '  --text-xl--letter-spacing: -0.014em;',
    '  --text-2xl--letter-spacing: -0.021em;',
    '  --text-3xl--letter-spacing: -0.024em;',
    '  --text-4xl--letter-spacing: -0.028em;',
    '  --text-5xl--letter-spacing: -0.032em;',
    '  --text-6xl--letter-spacing: -0.032em;',
    '  --text-7xl--letter-spacing: -0.032em;',
    '',
    // Sombras en dos capas en vez de la capa única y gris de Tailwind: una
    // corta que define el borde del elemento y otra larga y difusa que da la
    // altura. El tinte es azul-noche (17 12 46), NO el color de marca: la app
    // es white-label y una sombra teñida del color del salón chocaría con la
    // mitad de las paletas. El azul oscuro favorece a todas.
    '  --shadow-2xs: 0 1px 2px rgba(17, 12, 46, 0.04);',
    '  --shadow-xs: 0 1px 2px rgba(17, 12, 46, 0.05), 0 1px 3px rgba(17, 12, 46, 0.04);',
    '  --shadow-sm: 0 1px 2px rgba(17, 12, 46, 0.05), 0 2px 6px rgba(17, 12, 46, 0.05);',
    '  --shadow-md: 0 2px 4px rgba(17, 12, 46, 0.04), 0 6px 16px rgba(17, 12, 46, 0.08);',
    '  --shadow-lg: 0 4px 8px rgba(17, 12, 46, 0.04), 0 12px 28px rgba(17, 12, 46, 0.10);',
    '  --shadow-xl: 0 8px 16px rgba(17, 12, 46, 0.05), 0 20px 44px rgba(17, 12, 46, 0.12);',
    '  --shadow-2xl: 0 16px 32px rgba(17, 12, 46, 0.08), 0 32px 68px rgba(17, 12, 46, 0.16);',
    '}'
  ].join('\n');
  document.head.appendChild(theme);
})();
