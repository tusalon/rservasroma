---
name: reelscreation
description: Flujo de producción colaborativo para armar un Reel de Rservasroma en HyperFrames + CapCut, en el que Claude y el usuario se pasan trabajo de ida y vuelta por carpeta — Claude da la idea y describe las imágenes por escena, el usuario las genera en CapCut, Claude las anima con HyperFrames y corta los silencios del audio, y ambos montan el corte final juntos en CapCut. Actívala cuando el usuario diga cosas como "hagamos un reel", "te paso las imágenes que generé", "anímame esto en hyperframe", "córtame los silencios del audio", o retome un reel ya empezado con este ir y venir. Para el guion/gancho/caption/hashtags de un reel, usa primero `reels-virales-rservasroma` — esta skill es la producción visual, no el copy.
---

# ReelsCreation

Producción de un Reel real, no solo su guion. Complementa a `reels-virales-rservasroma` (esa da el gancho, narración, caption y hashtags; esta skill mueve esas piezas hasta un MP4 animado que el usuario termina de cortar en CapCut).

## Los dos roles, sin ambigüedad

**Claude entrega:**
- La idea/concepto del reel y su guion técnico (arco, escenas, duración) — ver `hyperframes-agenda-reel` u otro proyecto HyperFrames ya iniciado con `/hyperframes`.
- Una **descripción de imagen por escena** (brief de arte): qué debe mostrar, en qué proporción, con qué mood — para que el usuario la genere en CapCut.
- El **audio ya generado** (narración TTS existente), con los silencios/pausas largas recortadas para que el ritmo sea más dinámico — nunca genera el audio desde cero en esta skill, solo lo edita.
- La **animación** de cada imagen que el usuario entregue, usando HyperFrames (GSAP, timelines, sub-composiciones), respetando `frame.md` si el proyecto ya tiene un sistema de diseño definido.
- Cada escena como **clip de video independiente**, sin transición horneada, lista para que el usuario la monte en su propio orden en CapCut.

**El usuario entrega:**
- Las imágenes generadas en CapCut, una por escena, colocadas en la carpeta que Claude indique.
- Confirmación de qué audio usar si hay más de una versión.
- El montaje final, los subtítulos y su temporización, y cualquier música/efecto — todo eso vive en CapCut, no en HyperFrames.

## Convención de carpeta (fija, no negociable)

Dentro del proyecto HyperFrames activo (`videos/<nombre-proyecto>/`):

```
capture/assets/images/01-nombre-escena.png
capture/assets/images/02-nombre-escena.png
...
```

El número y nombre de cada imagen debe calzar exactamente con su archivo hermano en `compositions/frames/NN-nombre-escena.html`. Si Claude aún no ha creado esas composiciones (proyecto nuevo), primero fija los nombres de escena en `STORYBOARD.md` y comunícalos antes de pedir las imágenes — nunca al revés.

## Flujo paso a paso

1. **Idea y briefs de imagen.** Claude propone el concepto del reel (si no existe ya un `STORYBOARD.md`) y escribe, escena por escena, una descripción de imagen corta y concreta (sujeto, encuadre, mood, paleta) — no un prompt técnico de un generador específico, sino algo que el usuario pueda usar directamente en CapCut.
2. **Espera activa.** Claude no anima nada hasta que el usuario confirme que dejó imágenes en la carpeta. Cuando el usuario avise, Claude lista qué encontró y a qué escena corresponde cada archivo antes de tocar nada — si un nombre no calza o falta una escena, pregunta, no asume.
3. **Edición de audio.** Sobre el audio ya generado: detecta pausas internas largas (medir con `ffmpeg silencedetect`, no a ojo) y recórtalas a una duración natural corta, sin tocar el contenido hablado. Nunca borra una pausa que sea parte intencional del guion (ej. un "..." dramático) sin confirmarlo primero si no es evidente.
4. **Animación.** Por cada imagen recibida, Claude construye o actualiza la sub-composición HyperFrames correspondiente: la imagen como fondo/foco, movimiento con la disciplina de `hyperframes-animation` (asentamientos suaves, revelado ritmado a la narración, nada de rebote salvo excepción explícita), y el texto en pantalla ya definido en el guion.
5. **Entrega.** Un clip de video por escena (imagen animada + su audio ya sincronizado), sin transición entre ellos — el usuario decide el corte y la transición en CapCut.
6. **Montaje conjunto.** El usuario arma el corte final, subtítulos y timing en CapCut. Claude no genera subtítulos ni asume su temporización salvo que se le pida explícitamente.

## Criterios de calidad

- Cero ambigüedad de nombre de archivo entre lo que Claude pide y lo que el usuario coloca.
- El audio editado no tiene silencios muertos perceptibles, pero conserva las pausas dramáticas intencionales del guion.
- Cada escena animada pasa `hyperframes lint`/`check` sin errores antes de entregarse.
- Las imágenes se usan tal como las entrega el usuario — Claude no las regenera ni las reemplaza por su cuenta; si una imagen no sirve para animarse bien (proporción rota, sujeto cortado), lo señala y pide una nueva en vez de forzarla.

## Errores que evitar

- No generar las imágenes con otra herramienta "para adelantar" — eso rompe la división de roles que el usuario pidió explícitamente.
- No recortar audio sin haber medido primero dónde está el silencio real.
- No mezclar esta skill con `reels-virales-rservasroma`: si lo que hace falta es el gancho/narración/caption, esa es la skill correcta, no esta.
- No montar el corte final ni definir subtítulos — eso es trabajo del usuario en CapCut.
