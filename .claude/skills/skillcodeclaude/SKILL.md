---
name: skillcodeclaude
description: Superskill de flujo de desarrollo que actúa como router sobre el paquete "Superpowers" (14 skills de planning/TDD/git/code-review), más mcp-builder, skill-creator y webapp-testing. Actívala SIEMPRE que el trabajo sea construir o modificar código de este proyecto, planear una feature, depurar un bug, revisar código antes de mergear, crear/editar una skill, o construir/conectar un servidor MCP — incluso si el usuario no lo pide con esas palabras exactas, por ejemplo "agrégale esto a la app", "por qué falla esto", "revisa este cambio antes de subirlo" o "conectá esto con [herramienta externa]".
---

# skillcodeclaude

Router de flujo de desarrollo. No dupliques el contenido de las skills que orquesta — cada una ya tiene su propio SKILL.md. El trabajo de esta skill es decidir **cuál(es) usar y en qué orden**.

Cubre 6 cosas del post original, pero son de dos naturalezas distintas:

- **4 son skills instaladas de verdad** (archivos en `.claude/skills/`, disponibles siempre): el paquete Superpowers (14 sub-skills), `mcp-builder`, `skill-creator`, `webapp-testing`.
- **2 no son skills sino herramientas externas** que todavía no están conectadas en este proyecto: `Context7` (servidor MCP de documentación) y `Claude-Mem` (memoria persistente entre sesiones). Ver el Paso 3 antes de asumir que están disponibles.

## Paso 1 — El paquete Superpowers (disciplina de trabajo)

Este es el corazón del flujo. Antes de escribir código nuevo o tocar comportamiento existente, sigue esta cadena — no saltes directo a implementar:

| Situación | Skill | Cuándo |
|---|---|---|
| Vas a construir algo nuevo (feature, componente, cambio de comportamiento) | `brainstorming` | SIEMPRE antes de implementar — explora intención y requisitos antes de tocar código |
| Ya tienes spec/requisitos claros para algo de varios pasos | `writing-plans` | Antes de tocar código, para bajar el plan a tareas concretas |
| Tienes un plan escrito y lo vas a ejecutar en otra sesión con checkpoints | `executing-plans` | Ejecución con revisión intermedia |
| Vas a ejecutar tareas independientes del plan en la sesión actual | `subagent-driven-development` | Cuando conviene paralelizar con subagentes |
| Hay 2+ tareas independientes sin estado compartido | `dispatching-parallel-agents` | Paralelización general, no solo de un plan |
| Vas a implementar cualquier feature o bugfix | `test-driven-development` | Antes de escribir el código de implementación |
| Aparece un bug, test que falla, o comportamiento inesperado | `systematic-debugging` | Antes de proponer arreglos a ciegas |
| Vas a empezar trabajo que necesita aislarse del workspace actual | `using-git-worktrees` | Antes de ejecutar un plan que podría chocar con otro trabajo en curso |
| Terminaste una tarea, feature grande, o vas a mergear | `requesting-code-review` | Para verificar que el trabajo cumple lo pedido antes de integrar |
| Te llega feedback de un code review | `receiving-code-review` | Verificar y razonar el feedback, no aceptarlo ni implementarlo a ciegas |
| La implementación está lista y todos los tests pasan | `finishing-a-development-branch` | Decidir cómo integrar (mergear, PR, etc.) |
| Estás por afirmar que algo quedó arreglado, terminado o pasando tests | `verification-before-completion` | Corre la verificación real antes de decir que algo funciona |
| Vas a crear o editar una skill | `writing-skills` | Reglas de cómo escribir skills que sí funcionan |

**Orden típico de una feature real**: `brainstorming` → `writing-plans` → `using-git-worktrees` (si aplica) → `test-driven-development` (con `systematic-debugging` si algo falla en el camino) → `verification-before-completion` → `requesting-code-review` → `finishing-a-development-branch`.

## Paso 2 — Las otras 2 skills instaladas

| El usuario pide... | Usa | Por qué |
|---|---|---|
| Crear una skill nueva, editar una existente, o medir si una skill funciona bien | `skill-creator` | Proceso completo: draft → test → eval → iterar |
| Construir un servidor MCP para conectar Claude con una API/servicio externo | `mcp-builder` | Guía para diseñar herramientas MCP bien hechas (naming, cobertura de endpoints, auth) |
| Probar la app corriendo en un browser real, verificar UI, capturar screenshots/logs | `webapp-testing` | Playwright contra la app local — úsala junto con `test-driven-development` cuando el bug/feature es de frontend |

## Paso 3 — Context7 y Claude-Mem (no son skills — requieren conexión aparte)

Estas dos NO aparecen en la lista de skills disponibles porque no son archivos de skill — son herramientas que se conectan distinto. No asumas que están activas; si el pedido las necesita, dile al usuario cómo activarlas en vez de fingir que ya funcionan:

- **Context7** (documentación actualizada de librerías, evita que Claude alucine APIs viejas): se conecta como servidor MCP con
  ```
  claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
  ```
  Una vez conectado, aparece como herramienta MCP (no como skill) y se usa agregando "usa context7" al pedido, o dejando que se dispare sola si el prompt menciona una librería específica.

- **Claude-Mem** (memoria persistente entre sesiones, más allá de la memoria nativa ya configurada en este entorno): es un plugin aparte (`thedotmack/claude-mem`) con demonio en segundo plano y almacenamiento vectorial local. Se instala con su propio comando de npx/npm — pídele al usuario que lo corra él mismo, no lo ejecutes por tu cuenta.

Si el usuario pide algo que claramente necesita una de estas dos y no está conectada, dilo explícitamente y ofrece el comando — no inventes que ya está disponible.

## Paso 4 — Si no está claro

Si no es obvio qué skill de Superpowers aplica primero, por defecto empieza por `brainstorming` (para construir algo nuevo) o `systematic-debugging` (para un bug) — son los puntos de entrada más comunes del paquete.
