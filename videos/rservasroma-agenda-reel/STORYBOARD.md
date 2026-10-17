---
format: 1080x1920
duration: 30s
message: "Con Rservasroma tus clientas reservan y confirman solas: se acaba el caos de agendar por WhatsApp."
arc: PAS (Pain → Agitation → Solution → CTA)
audience: Dueñas de salones de belleza que hoy agendan citas por WhatsApp
music: confident minimal upbeat underscore
mode: collaborative
---

## Video direction

- **Paleta** — de `frame.md` (broadside remixado): tres registros, uno por escena, nunca mezclados.
  - Blanco: fondo `#FFFFFF`, tinta `#1A1A1A` — registro añadido a mano, fuera de los dos que trae
    el preset original, porque el guion lo pide explícitamente (ver nota de la sesión anterior).
  - Oscuro: fondo `#1A1A1A`, texto `#FFFFFF` — el registro "dark" propio de broadside.
  - Rosa: fondo `#FF1493`, texto `#1A1A1A` — el registro "orange" propio de broadside, con el
    fucsia de marca en vez del naranja original.
- **Gramática de movimiento** — asentamientos `power3` de cola larga en todo el video; nada de
  rebote/`back.out`/`elastic.out` salvo la única excepción explícita del frame 9 (el CTA). Cada
  revelación llega en el instante exacto en que la narración la nombra — ningún elemento aparece
  antes de su pista hablada.
- **Reparto de quietud** — los frames 1, 4 y 6 son una sola frase que llega entera y se sostiene
  (nada que revelar después); son las "respiraciones" del video. Los frames 2, 3, 7 y 8 revelan por
  partes porque su línea tiene más de una cláusula. El frame 9 sostiene desde su golpe hasta el
  final del video.
- **Lista negativa** — sin rebote salvo la excepción nombrada; sin diapositivas (nada se vuelca
  entero al inicio y se congela); sin respiración/loops circulares; sin capturas ni maquetas de UI
  real (no existen — todo es tipografía); sin un segundo color de acento fuera del rosa fucsia.

## Frame 1 — Agenda llena

- scene: Fondo blanco, la frase "Agenda llena toda la semana" entra golpeando
- voiceover: "Agenda llena toda la semana..."
- duration: 1.899s
- transition_in: cut
- status: animated
- src: compositions/frames/01-agenda-llena.html
- type: hook
- persuasion: Pain validation
- beat: tension
- blueprint: kinetic-type-beats
- asset_candidates:

narrativeRole: Abre con una afirmación que cualquier dueña de salón reconoce de inmediato — agenda llena no es garantía de nada.
keyMessage: Tener la agenda llena no es lo mismo que tener ingresos asegurados.

Reproduce (kinetic-type-beats, variante Hook flash): la frase completa es la única cláusula del
frame — no hay escalada, un solo golpe que sostiene.

Scene 1 (0.0–1.899s): fondo blanco. "agenda llena / toda la semana" entra por hard-cut / flash
(`discrete-text-sequence`), sin fundido ni deslizamiento, anclada arriba-izquierda (lean-left del
sistema); Barlow display 900 minúscula. Sostiene entera hasta el corte de salida.

## Frame 2 — La pregunta que duele

- scene: Fondo blanco, misma composición que el frame anterior, texto nuevo entra
- voiceover: "Y aun así no sabes cuántas clientas perdiste por no confirmar."
- duration: 3.605s
- transition_in: crossfade
- status: animated
- src: compositions/frames/02-pregunta.html
- type: pain_point
- persuasion: Pain agitation
- beat: anxiety
- blueprint: kinetic-type-beats
- asset_candidates:

narrativeRole: Convierte la afirmación inicial en una pregunta incómoda y personal — nombra el dolor exacto.
keyMessage: No confirmar una cita es dinero perdido que ni siquiera se nota hasta que es tarde.

Reproduce (kinetic-type-beats, variante Problem): una sola cláusula larga, revelada por partes en
vez de volcada de golpe.

Scene 1 (0.0–1.4s): fondo blanco continúa desde el frame anterior (crossfade). "¿sabes cuántas"
revela por palabra (`dynamic-content-sequencing`), anclada arriba-izquierda.
Scene 2 (1.4–3.605s): con la VO nombrando "clientas perdiste", esa frase revela en acento rosa
fucsia (`dynamic-content-sequencing` + color de rol); "por no confirmar" cierra la línea en el
mismo tramo. Sostiene completa hasta el corte.

## Frame 3 — El caos de WhatsApp

- scene: Fondo blanco, referencia tipográfica a un chat (burbujas de mensaje estilizadas, sin captura real) mostrando el ciclo escribir-esperar-silencio
- voiceover: "Pasa todo el tiempo. Escribes por WhatsApp... esperas respuesta... y la clienta nunca confirma."
- duration: 5.376s
- transition_in: crossfade
- status: animated
- src: compositions/frames/03-whatsapp-caos.html
- type: pain_point
- persuasion: Pain agitation
- beat: overwhelm
- blueprint: compose
- asset_candidates:

narrativeRole: Aterriza el dolor abstracto en la escena concreta y diaria que todas viven — el WhatsApp que no responde.
keyMessage: El canal que usan para agendar (WhatsApp) es precisamente el que no da certeza.

Compose: overwhelm-surround pide un mockup real que muta en avatar — no hay ningún asset real
aquí (todo es tipografía), así que su movimiento insignia no aplica. Se compone desde el
vocabulario general: burbujas de chat estilizadas más un titular que revela por palabra.

Scene 1 (0.0–1.8s): fondo blanco. Tres burbujas de chat (referencia tipográfica, no captura real)
entran en cluster→outward expansion (`center-outward-expansion`) apilándose a la derecha, una por
una, según la VO nombra "escribes por WhatsApp".
Scene 2 (1.8–3.6s): mientras la VO dice "esperas respuesta", la burbuja del medio sostiene con un
jitter sutil de baja amplitud (`sine-wave-loop`) — el único signo de vida durante la espera, nada
de burbujas nuevas.
Scene 3 (3.6–5.376s): con "y la clienta nunca confirma", el titular "escribes... esperas... y
nunca confirma" revela palabra por palabra (`dynamic-content-sequencing`) bajo las burbujas; todo
sostiene hasta el corte.

## Frame 4 — No es tu culpa

- scene: Corte a fondo negro, tipografía en blanco, frase corta y calma
- voiceover: "El problema no es tu trabajo."
- duration: 1.813s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/04-no-es-tu-culpa.html
- type: pain_point
- persuasion: Negative contrast
- beat: relief
- blueprint: kinetic-type-beats
- asset_candidates:

narrativeRole: Pivote emocional — quita la culpa antes de nombrar la causa real, para que la clienta se quede escuchando en vez de sentirse juzgada.
keyMessage: El trabajo de la dueña del salón nunca fue el problema.

Reproduce (kinetic-type-beats, variante Hook/Problem flash): golpe único, calmo, sin escalada.

Scene 1 (0.0–1.813s): corte a fondo oscuro (registro dark). "el problema / no es tu trabajo" entra
por hard-cut (`discrete-text-sequence`) en cream sobre tinta, anclada arriba-izquierda. Sostiene
entera hasta el corte.

## Frame 5 — Agendando a ciegas

- scene: Mismo fondo negro, la frase anterior se desvanece y entra esta
- voiceover: "Es que estás agendando a ciegas."
- duration: 1.856s
- transition_in: crossfade
- status: animated
- src: compositions/frames/05-a-ciegas.html
- type: pain_point
- persuasion: Friction reduction
- beat: clarity
- blueprint: kinetic-type-beats
- asset_candidates:

narrativeRole: Nombra la causa raíz en una frase — el diagnóstico que prepara la solución.
keyMessage: Sin confirmación real, cualquier agenda es una apuesta a ciegas.

Reproduce (kinetic-type-beats, variante Problem, sub-forma A): la línea fija se resuelve palabra
por palabra, sin cambiar de fondo respecto al frame anterior.

Scene 1 (0.0–1.856s): mismo fondo oscuro (crossfade desde el frame 4). "estás agendando" entra por
hard-cut; "a ciegas" (acento rosa fucsia) completa la frase en el mismo golpe
(`discrete-text-sequence`). Sostiene hasta el corte.

## Frame 6 — Aparece Rservasroma

- scene: Corte a fondo rosa fucsia de marca, el nombre "Rservasroma" se resuelve al final de la frase
- voiceover: "Con Rservasroma, tus clientas reservan solas..."
- duration: 2.987s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/06-rservasroma.html
- type: product_intro
- persuasion: Show-don't-tell proof
- beat: relief + control
- blueprint: kinetic-type-beats
- asset_candidates:

narrativeRole: Presenta el producto por su nombre justo en el momento de mayor tensión acumulada — la resolución de las tres escenas de dolor.
keyMessage: La solución tiene nombre y hace la parte que antes recaía en la dueña del salón.

Reproduce (kinetic-type-beats, variante Product_Intro namedrop): el nombre de marca ya llega por
el kicker, así que el titular es directamente la carga útil, no un logo aparte.

Scene 1 (0.0–1.2s): corte a fondo rosa fucsia (registro orange). El kicker mono "con rservasroma"
type-on con caret parpadeante (`discrete-text-sequence` + `context-sensitive-cursor`), anclado
arriba-izquierda.
Scene 2 (1.2–2.987s): con la VO diciendo "tus clientas reservan solas", el titular "tus clientas /
reservan solas" entra por hard-cut bajo el kicker. Sostiene hasta el corte.

## Frame 7 — Confirman sin que escribas nada

- scene: Mismo fondo rosa, texto continúa en dos líneas cortas
- voiceover: "...ven tus horarios reales... y confirman su cita sin que tú escribas nada."
- duration: 4.139s
- transition_in: crossfade
- status: animated
- src: compositions/frames/07-confirman-solas.html
- type: benefit_highlight
- persuasion: Feature-to-benefit translation
- beat: control + ease
- blueprint: titlecard-reveal
- asset_candidates:

narrativeRole: Traduce la función (ver horarios, confirmar) directamente al beneficio emocional (dejar de escribir, dejar de esperar).
keyMessage: La clienta hace sola exactamente lo que antes exigía ida y vuelta por WhatsApp.

Adapt (titlecard-reveal, variante Benefits): en vez de titular + línea calificadora separada, son
dos cláusulas de la misma idea — se mantiene el único slide-up crossfade como el único movimiento,
sin segunda fase de desarrollo.

Scene 1 (0.0–2.0s): mismo fondo rosa (continúa desde el frame 6). "ven tus horarios reales" entra
con fade-in centrado escalando levemente 95%→100% (`scale-swap-transition`), asentamiento suave.
Scene 2 (2.0–4.139s): con la VO diciendo "y confirman su cita sin que tú escribas nada", esa
cláusula entra con slide-up crossfade bajo la primera (`discrete-text-sequence`). Ambas líneas
sostienen hasta el corte.

## Frame 8 — Menos caos, más control

- scene: Corte a fondo blanco, tres frases cortas se apilan una tras otra
- voiceover: "Menos caos. Menos cancelaciones de último minuto. Más control de tu agenda."
- duration: 4.459s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/08-menos-caos.html
- type: benefit_highlight
- persuasion: Value stacking
- beat: confidence
- blueprint: grid-card-assemble
- asset_candidates:

narrativeRole: Cierra el argumento con una lista de tres beneficios acumulados — el remate antes del CTA.
keyMessage: El resultado se resume en tres ganancias concretas, no una promesa vaga.

Reproduce (grid-card-assemble, variante Benefits vertical-list, sub-modo BUILD): tres líneas que
se acumulan una por una y quedan todas encendidas — nada se apaga ni se reemplaza.

Scene 1 (0.0–1.5s): corte a fondo blanco. "/ menos caos" entra por spring-pop de marcador
(`spring-pop-entrance`) en el primer renglón de la lista, anclada arriba-izquierda.
Scene 2 (1.5–3.0s): con la VO nombrando "menos cancelaciones de último minuto", "/ menos
cancelaciones" entra igual en el segundo renglón.
Scene 3 (3.0–4.459s): con "más control de tu agenda", "/ más control" entra en el tercer renglón;
las tres líneas sostienen juntas, co-residentes, hasta el corte.

## Frame 9 — Comenta AGENDA

- scene: Corte a fondo rosa fucsia, CTA final con la palabra AGENDA resaltada y animada
- voiceover: "Comenta AGENDA y te envío los detalles."
- duration: 2.475s
- transition_in: crossfade
- status: animated
- src: compositions/frames/09-cta.html
- type: cta
- persuasion: Risk reversal
- beat: motivation
- blueprint: kinetic-type-beats
- asset_candidates:

narrativeRole: Un solo llamado a la acción, claro y de bajo compromiso — comentar una palabra, no rellenar un formulario.
keyMessage: El siguiente paso es tan simple como escribir una palabra en los comentarios.

Reproduce (kinetic-type-beats, variante CTA): último frame del video — sostiene hasta el final,
sin salida propia.

Scene 1 (0.0–1.0s): corte a fondo rosa fucsia. "comenta" entra por fade centrado, arriba de la
composición.
Scene 2 (1.0–2.475s): con la VO diciendo "AGENDA", la palabra entra en mayúsculas, grande y
centrada, vía spring-pop-entrance con overshoot — la única excepción de rebote del video, marcada
en Video direction, justificada porque es el golpe de marca del CTA; "y te envío los detalles"
entra por fade debajo en el mismo tramo. Sostiene hasta el final del video (no hay corte de
salida, es el último frame).
