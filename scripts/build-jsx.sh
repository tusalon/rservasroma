#!/usr/bin/env bash
# Compila los archivos JSX (antes type="text/babel") a JS plano en compiled/.
# Así el navegador ya no necesita vendor/babel.min.js (3.1 MB + transpilar en
# el teléfono): la primera carga en conexiones lentas baja drásticamente.
#
# REGLA DE ORO: tras editar cualquier componente o *-app.js, correr este
# script y commitear compiled/ JUNTO con el código fuente (mismo commit).
# El workflow .github/workflows/build-jsx.yml es solo red de seguridad.
#
# Uso:  bash scripts/build-jsx.sh
set -euo pipefail
cd "$(dirname "$0")/.."

npx --yes esbuild@0.24.0 \
  client-app.js \
  admin-app.js \
  components/*.js \
  components/admin/*.js \
  --loader:.js=jsx \
  --charset=utf8 \
  --outdir=compiled \
  --outbase=. \
  --log-level=warning

echo "OK: JSX compilado en compiled/"
