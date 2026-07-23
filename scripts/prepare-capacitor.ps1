$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$www = Join-Path $root "www"

if (Test-Path $www) {
    Remove-Item -LiteralPath $www -Recurse -Force
}

New-Item -ItemType Directory -Path $www | Out-Null

$files = @(
    "index.html",
    "app-clientes.html",
    "admin.html",
    "admin-login.html",
    "editar-negocio.html",
    "setup-wizard.html",
    "calendar.html",
    "offline-panel.html",
    "404.html",
    "manifest.json",
    "sw.js",
    "app.js",
    "client-app.js",
    "admin-app.js"
)

# "compiled" es OBLIGATORIO: desde que el JSX se pre-compila, los HTML cargan
# compiled/** y ya no components/**. Sin esta carpeta la APK arranca en blanco
# porque todos los <script> apuntan a archivos que no existen en el paquete.
$directories = @(
    "compiled",
    "components",
    "utils",
    "icons",
    "images",
    "vendor",
    "trickle"
)

foreach ($file in $files) {
    $source = Join-Path $root $file
    if (Test-Path $source) {
        Copy-Item -LiteralPath $source -Destination (Join-Path $www $file) -Force
    }
}

foreach ($directory in $directories) {
    $source = Join-Path $root $directory
    if (Test-Path $source) {
        Copy-Item -LiteralPath $source -Destination (Join-Path $www $directory) -Recurse -Force
    }
}

Write-Host "Capacitor web assets prepared in $www"
