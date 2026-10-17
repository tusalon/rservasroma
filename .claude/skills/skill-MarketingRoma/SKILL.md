---
name: skill-MarketingRoma
description: Superskill de marketing que actúa como router sobre 6 skills instaladas en este proyecto — seo-audit, programmatic-seo, ai-seo, cro, ad-creative y marketing-psychology. Actívala SIEMPRE que se pida algo de SEO, tráfico, rankings, conversión, ads o copy publicitario, o psicología de ventas — incluso si el usuario no nombra ninguna de esas 6 skills por su nombre, o solo dice cosas como "no me está llegando gente", "esta página no convierte", "hazme anuncios para X", "por qué no aparezco en Google" o "cómo lo hago sonar más persuasivo".
---

# MarketingRoma

Router de marketing. No dupliques el contenido de las 6 skills que orquesta — cada una ya tiene su propio SKILL.md con instrucciones completas. El trabajo de esta skill es decidir **cuál(es) usar y en qué orden**, y luego seguir las instrucciones de esa(s) skill(s) tal cual.

## Paso 0 — Si el trabajo es para una app o marca de Rservasroma

Antes de escribir cualquier copy, anuncio o mensaje dirigido a clientes reales del ecosistema (RomaHub, RomaFinanzas, RomaCrece, ExoticNailsByYuli, la landing, etc.), revisa el tono ya establecido en la skill `ventas-rservasroma`: directo, humano, de comunidad — no de vendedor agresivo. `ad-creative`, `cro` y `marketing-psychology` por defecto empujan hacia un tono genérico de urgencia/venta que puede chocar con eso. Usa esas skills para la técnica (estructura del anuncio, qué principio psicológico aplicar, qué probar), pero filtra el resultado final por el tono ya validado antes de entregarlo.

Si el trabajo es SEO técnico (`seo-audit`, `programmatic-seo`, `ai-seo`) esto no aplica igual — ahí el criterio de marca no interfiere, solo procede con el criterio propio de cada skill.

## Paso 1 — Clasifica el pedido

| El usuario pide... | Usa | Por qué |
|---|---|---|
| Diagnosticar por qué no rankea, cayó tráfico, o revisar SEO on-page | `seo-audit` | Punto de entrada por defecto ante cualquier queja de SEO, aunque sea vaga |
| Crear muchas páginas similares para distintas keywords/ciudades/comparativas | `programmatic-seo` | Páginas a escala desde templates + data |
| Aparecer citado en respuestas de ChatGPT/Perplexity/IA, no solo en Google | `ai-seo` | GEO/AEO — optimización para motores de respuesta, no de búsqueda clásica |
| Subir conversión de una página, landing, pricing o formulario | `cro` | Optimización de la página/flujo en sí |
| Generar o escalar copy de anuncios (headlines, variaciones, creatividades) | `ad-creative` | Producción de copy publicitario en volumen |
| Entender o aplicar por qué la gente compra/decide (sesgos, anchoring, escasez, prueba social) | `marketing-psychology` | Principios de comportamiento aplicados a marketing |

## Paso 2 — Combina cuando aplique

- **"Mi página no convierte"** → `cro` (diagnóstico y rediseño de la página) + `marketing-psychology` (qué principio de decisión está fallando: falta de prueba social, framing de precio, etc.)
- **"No aparezco en Google" / caída de tráfico** → `seo-audit` primero (diagnóstico); si el hallazgo es que faltan páginas para ciertas keywords/ubicaciones, sigue con `programmatic-seo` para escalar la solución.
- **"Necesito más anuncios" / "escala esta campaña"** → `ad-creative` (producción de variaciones) + `marketing-psychology` (qué gatillo usar en el hook de cada variación).
- **"Quiero que me citen las IAs" / presencia en respuestas de ChatGPT** → `ai-seo` sola, salvo que también haya problemas de SEO tradicional, en cuyo caso corre `seo-audit` primero para no arreglar sobre una base rota.
- **Campaña completa (SEO + landing + ads)** → orden natural: `seo-audit`/`programmatic-seo` (que te encuentren) → `cro` (que conviertan al llegar) → `ad-creative` (que atraigan tráfico pago) → `marketing-psychology` como lente transversal en cada etapa.

## Paso 3 — Si no está claro

Si el pedido es ambiguo entre dos rutas (por ejemplo, no queda claro si el problema es de tráfico o de conversión), pregunta brevemente antes de elegir — no ejecutes las seis a la vez "por si acaso".
