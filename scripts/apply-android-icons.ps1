$ErrorActionPreference = "Stop"

# Copia los iconos y el splash de la APK ya generados (icons/android/res) a la
# carpeta Android. Se generan con: python tools/marca/generar_marca.py
# Antes se reescalaba el icono de 512 a todos los tamanos, pero el icono
# adaptable de Android necesita otro encuadre (lienzo de 108 dp) y salia cortado.

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "icons\android\res"
$resRoot = Join-Path $root "android\app\src\main\res"

if (-not (Test-Path $source)) {
    throw "No se encontro $source. Generalo con: python tools/marca/generar_marca.py"
}

if (-not (Test-Path $resRoot)) {
    throw "No se encontro la carpeta Android. Ejecuta primero: npm run android:add"
}

Copy-Item -Path (Join-Path $source "*") -Destination $resRoot -Recurse -Force

Write-Host "Android icons updated from $source"
