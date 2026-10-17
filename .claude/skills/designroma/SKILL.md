---
name: designroma
description: Superskill de diseño que actúa como router sobre 6 skills instaladas en este proyecto — frontend-design, ui-ux-pro-max, canvas-design, algorithmic-art, web-artifacts-builder y slack-gif-creator. Actívala SIEMPRE que se pida crear, mejorar o revisar cualquier cosa de diseño visual: pantallas o componentes de UI, paletas de color, tipografía, layout, accesibilidad, animaciones, dashboards o artifacts HTML complejos, posters o arte estático, arte generativo/algorítmico, o GIFs animados para Slack — incluso si el usuario no menciona ninguna de esas 6 skills por su nombre, o solo dice cosas como "hazme una pantalla más bonita", "dame una paleta", "necesito un poster" o "un gif para el equipo".
---

# DesignRoma

Router de diseño. No dupliques el contenido de las 6 skills que orquesta — cada una ya tiene su propio SKILL.md con instrucciones completas. El trabajo de esta skill es decidir **cuál(es) usar y en qué orden**, y luego seguir las instrucciones de esa(s) skill(s) tal cual.

## Paso 0 — Si el trabajo es para una app de Rservasroma

Antes de aplicar cualquier criterio "genérico" de las skills de abajo, revisa si el pedido es para una app del ecosistema Rservasroma (RomaHub, RomaFinanzas, RomaCrece, SuperAdmin, ExoticNailsByYuli, la landing, etc.). Si lo es, la identidad de marca ya establecida (paleta, tipografía, radios, tono) manda sobre las sugerencias "distintivas" o de paleta libre que dan `frontend-design` y `ui-ux-pro-max` — usa la skill `diseno-rservasroma` (o el conocimiento de marca ya guardado) como fuente de verdad de color/tipografía/tono, y las 6 skills de abajo como fuente de técnica (composición, motion, accesibilidad, cómo construir el artifact). No dejes que `ui-ux-pro-max` proponga una paleta de su base de datos que choque con la marca ya definida.

Si el trabajo NO es de marca Rservasroma (ej. un poster suelto, un experimento, un GIF interno), procede libremente con el criterio de cada skill.

## Paso 1 — Clasifica el pedido

| El usuario pide... | Usa | Por qué |
|---|---|---|
| Diseñar/rehacer una pantalla, componente o flujo de UI real (producto) | `frontend-design` | Dirección estética intencional, evita look de template |
| Elegir/justificar paleta, tipografía, espaciado, iconos, motion o gráficas concretas | `ui-ux-pro-max` | Tiene bases de datos buscables (paletas, font pairings, presets GSAP, tipos de chart) por stack |
| Un artifact HTML complejo con estado, rutas o componentes shadcn/ui | `web-artifacts-builder` | Es el kit para artifacts multi-componente, no para HTML/JSX simple |
| Un poster, pieza de arte estática, imagen conceptual en PNG/PDF | `canvas-design` | Filosofía de diseño para arte estático, con referencia sutil embebida |
| Arte generativo/algorítmico (flow fields, partículas, p5.js, "código que genera arte") | `algorithmic-art` | Randomness con semilla, exploración de parámetros |
| Un GIF animado para Slack (emoji, reacción, mini-animación) | `slack-gif-creator` | Valida las restricciones de tamaño/formato de Slack |

## Paso 2 — Combina cuando aplique

La mayoría de pedidos reales de UI necesitan **más de una** skill a la vez. Patrones comunes:

- **Pantalla o componente de producto** → `frontend-design` (dirección estética y decisiones que no se sientan genéricas) + `ui-ux-pro-max` (paleta/tipografía/espaciado concretos y checks de accesibilidad) que respeten el Paso 0 si es de marca. Si además el artifact necesita estado/routing/shadcn, suma `web-artifacts-builder` para la parte de construcción.
- **Dashboard o artifact interactivo** → `web-artifacts-builder` (estructura técnica) + `ui-ux-pro-max` (qué tipo de chart usar y cómo, con qué paleta).
- **Poster o pieza gráfica con intención conceptual** → `canvas-design` sola, salvo que el usuario también quiera versión animada/generativa, en cuyo caso complementa con `algorithmic-art`.
- **"Necesito algo llamativo para anunciar/celebrar X en Slack"** → `slack-gif-creator` sola; si el usuario quiere primero explorar un concepto visual antes de animarlo, puedes usar `canvas-design` o `algorithmic-art` para bocetar la idea y luego `slack-gif-creator` para el GIF final.

Cuando combines skills, aplica primero la que define la **dirección** (qué se va a hacer y con qué criterio: `frontend-design`, `canvas-design`, `algorithmic-art`) y después la que aporta **valores concretos o construcción técnica** (`ui-ux-pro-max`, `web-artifacts-builder`, `slack-gif-creator`).

## Paso 3 — Si no está claro

Si el pedido es ambiguo entre dos rutas (por ejemplo, no queda claro si quieren un componente de producto o un poster suelto), pregunta brevemente antes de elegir — no ejecutes las seis a la vez "por si acaso".
