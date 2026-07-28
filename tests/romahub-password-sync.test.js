const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const functionSource = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'functions', 'activar-tienda-romahub', 'index.ts'),
    'utf8'
);
const componentSource = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'admin', 'RomaHubActivacion.js'),
    'utf8'
);

assert.match(functionSource, /import \{ compare \} from "npm:bcryptjs@3\.0\.3"/);
assert.match(functionSource, /await compare\(password, passwordHash\)/);
assert.match(functionSource, /isOriginAllowed\(req\)/);
assert.match(functionSource, /enforceRateLimits\(/);
assert.match(functionSource, /codigo_recuperacion_hash: recoveryHash/);
assert.match(functionSource, /password_recuperacion: null/);
assert.doesNotMatch(functionSource, /password_recuperacion:\s*password/);
assert.doesNotMatch(functionSource, /acceso:\s*\{[^}]*password[,}]/s);

assert.match(componentSource, /JSON\.stringify\(\{ negocio_id: negocioId, password, website \}\)/);
assert.match(componentSource, /type="password"/);
assert.match(componentSource, /autoComplete="current-password"/);
assert.match(componentSource, /acceso\.codigo_recuperacion/);
assert.doesNotMatch(componentSource, /acceso\.password/);

console.log('OK: sincronización segura de RomaHub verificada');
