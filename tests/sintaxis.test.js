// Un error de sintaxis en un archivo cargado por <script> deja la página sin textos
// (window.t no existe) y rompe el acceso. Esta prueba lo atrapa antes de publicar.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const dirs = ['utils', 'compiled', 'compiled/components', 'compiled/components/admin'];
let fallos = 0;
for (const d of dirs) {
    const dir = path.join(raiz, d);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.js'))) {
        try { execFileSync(process.execPath, ['--check', path.join(dir, f)], { stdio: 'pipe' }); }
        catch (e) { fallos++; console.error('Sintaxis rota en ' + d + '/' + f + ': ' + String(e.stderr).split('\n').slice(0, 4).join(' | ')); }
    }
}
if (fallos) process.exit(1);
console.log('OK: sintaxis de utils y compiled');
