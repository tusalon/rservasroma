// tools/panel-simulado.js — abre el panel de administración con Supabase SIMULADO.
// Datos inventados (Salón de Prueba): no toca ningún salón real ni pide contraseña.
// Para probar el panel en un navegador sin entrar a un salón de verdad.
// Uso (con el servidor local en :3457, ver .claude/launch.json):
//   NODE_PATH=<carpeta con playwright> node tools/panel-simulado.js
//   o:  const { abrir } = require('./tools/panel-simulado.js'); const { page } = await abrir();
const { chromium } = require('playwright');
const ID = 'sim-0000-0000-0000-000000000001';
const hoy = new Date();
const f = (d) => { const x = new Date(hoy.getTime() + d * 864e5); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };

const DIAS_LAB = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const TABLAS = {
  negocios: [{
    id: ID, slug: 'salon-prueba', nombre: 'Salón de Prueba', telefono: '53555555', codigo_pais: '53', configurado: true,
    color_primario: '#FF1493', color_secundario: '#f9a8d4', acceso_finanzas: false, requiere_anticipo: true,
    tipo_anticipo: 'fijo', valor_anticipo: 300, horario_atencion: 'Lun-Sáb 9:00-18:00', cumple_bonificacion_activa: false,
    duracion_por_defecto: 60, intervalo_turnos: 30, min_antelacion_horas: 2, max_antelacion_dias: 60, min_cancelacion_horas: 24,
    url_clientes: 'https://tusalon.github.io/rservasroma/?s=salon-prueba'
  }],
  profesionales: [
    { id: 1, negocio_id: ID, nombre: 'Ana', especialidad: 'Uñas', activo: true, nivel: 3, telefono: '53111111', color: 'bg-pink-500', avatar: '💅', fechas_libres: [] },
    { id: 2, negocio_id: ID, nombre: 'Dayannis', especialidad: 'Cejas', activo: true, nivel: 2, telefono: '53222222', color: 'bg-purple-500', avatar: '👁️', fechas_libres: [f(5)] },
    { id: 3, negocio_id: ID, nombre: 'Leyanis', especialidad: 'Pedicura', activo: true, nivel: 1, telefono: '53333333', color: 'bg-teal-500', avatar: '🦶', fechas_libres: [] }
  ],
  servicios: [
    { id: 11, negocio_id: ID, nombre: 'Manicura en gel', duracion: 60, precio: 1500, precio_moneda: 'CUP', activo: true, categoria: 'manicura', horarios_permitidos: [] },
    { id: 12, negocio_id: ID, nombre: 'Pedicura spa', duracion: 45, precio: 1200, precio_moneda: 'CUP', activo: true, categoria: 'pedicura', horarios_permitidos: ['09:00', '10:00', '14:00'] },
    { id: 13, negocio_id: ID, nombre: 'Diseño de cejas', duracion: 30, precio: 600, precio_moneda: 'CUP', activo: true, categoria: 'cejas', horarios_permitidos: [] }
  ],
  reservas: [
    { id: 101, negocio_id: ID, fecha: f(0), hora_inicio: '10:00', hora_fin: '11:00', duracion: 60, cliente_nombre: 'María Pérez', cliente_whatsapp: '5351234567', servicio: 'Manicura en gel', profesional_id: 1, profesional_nombre: 'Ana', estado: 'Reservado' },
    { id: 102, negocio_id: ID, fecha: f(0), hora_inicio: '11:30', hora_fin: '12:15', duracion: 45, cliente_nombre: 'Lisandra Gil', cliente_whatsapp: '5352223344', servicio: 'Pedicura spa', profesional_id: 3, profesional_nombre: 'Leyanis', estado: 'Pendiente' },
    { id: 103, negocio_id: ID, fecha: f(1), hora_inicio: '09:00', hora_fin: '09:30', duracion: 30, cliente_nombre: 'Yanet Ruiz', cliente_whatsapp: '5353334455', servicio: 'Diseño de cejas', profesional_id: 2, profesional_nombre: 'Dayannis', estado: 'Reservado' },
    { id: 104, negocio_id: ID, fecha: f(-3), hora_inicio: '15:00', hora_fin: '16:00', duracion: 60, cliente_nombre: 'Rosa Díaz', cliente_whatsapp: '5354445566', servicio: 'Manicura en gel', profesional_id: 1, profesional_nombre: 'Ana', estado: 'Completado' }
  ],
  // Lun-Sáb de 9:00 a 18:00 (índices de media hora 18..35), el formato que lee utils/config.js.
  horarios_profesionales: [1, 2, 3].map((p) => ({
    id: p, negocio_id: ID, profesional_id: p, horas: Array.from({ length: 18 }, (_, i) => 18 + i), dias: DIAS_LAB,
    horarios_por_dia: Object.fromEntries(DIAS_LAB.map((d) => [d, Array.from({ length: 18 }, (_, i) => 18 + i)])), descansos_por_dia: {}
  })),
  // Quién hace qué: Ana manicura y cejas, Dayannis cejas, Leyanis pedicura y manicura.
  servicios_profesionales: [[11, 1], [13, 1], [13, 2], [12, 3], [11, 3]].map(([sv, pr], i) => ({ id: i + 1, negocio_id: ID, servicio_id: sv, profesional_id: pr })),
  categorias_servicios: [{ id: 1, slug: 'manicura', nombre: 'Manicura', icono: '💅', activo: true, orden: 1 }, { id: 2, slug: 'pedicura', nombre: 'Pedicura', icono: '🦶', activo: true, orden: 2 }, { id: 3, slug: 'cejas', nombre: 'Cejas', icono: '👁️', activo: true, orden: 3 }],
  dias_cerrados: [{ id: 1, negocio_id: ID, fecha: f(10), motivo: 'Feriado' }]
};

const peticiones = {};
// `cliente`: abre la app de las clientas (index.html) con esa clienta ya registrada en vez del panel.
// `tablas`: filas que se suman o sustituyen a las de TABLAS (p. ej. { reservas: [...], negocios: [...] }).
async function abrir({ ancho = 390, alto = 844, extra = '', cliente = null, tablas = {} } = {}) {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, hasTouch: ancho < 700 });
  Object.assign(TABLAS, tablas);
  if (cliente) {
    await ctx.addInitScript(([id, c]) => {
      localStorage.setItem('negocioId', id); localStorage.setItem('negocioSlug', 'salon-prueba'); localStorage.setItem('negocioNombre', 'Salón de Prueba');
      const dato = JSON.stringify({ ...c, negocio_scope: 'slug:salon-prueba' });
      localStorage.setItem('clienteAuth:slug:salon-prueba', dato); localStorage.setItem('clienteAuth', dato);
    }, [ID, cliente]);
  }
  if (!cliente) await ctx.addInitScript((id) => {
    localStorage.setItem('adminAuth', 'true'); localStorage.setItem('adminUser', 'sim'); localStorage.setItem('adminLoginTime', String(Date.now()));
    localStorage.setItem('negocioId', id); localStorage.setItem('adminSlug', 'salon-prueba'); localStorage.setItem('negocioSlug', 'salon-prueba');
    localStorage.setItem('negocioNombre', 'Salón de Prueba'); localStorage.setItem('userRole', 'admin');
    localStorage.setItem('rservas_frase_cerrada', String(Date.now()));
  }, ID);
  await ctx.route('**/rest/v1/**', (route) => {
    const u = new URL(route.request().url());
    const tabla = u.pathname.split('/rest/v1/')[1].split('/')[0];
    peticiones[tabla] = (peticiones[tabla] || 0) + 1;
    const m = route.request().method();
    if (m !== 'GET' && m !== 'HEAD') return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    // Filtros simples de PostgREST (col=eq.x, neq, lt, lte, gt, gte, in.(a,b)): sin ellos las consultas
    // "citas ya pasadas" devolvían TODO y el panel marcaba como completadas hasta las de mañana.
    const datos = (TABLAS[tabla] || []).filter((fila) => {
      for (const [col, val] of u.searchParams) {
        if (['select', 'order', 'limit', 'offset', 'negocio_id'].includes(col)) continue;
        const m2 = /^(eq|neq|lt|lte|gt|gte|in)\.(.*)$/.exec(val);
        if (!m2 || !(col in fila)) continue;
        const [, op, arg] = m2; const v = String(fila[col]);
        if (op === 'eq' && v !== arg) return false;
        if (op === 'neq' && v === arg) return false;
        if (op === 'lt' && !(v < arg)) return false;
        if (op === 'lte' && !(v <= arg)) return false;
        if (op === 'gt' && !(v > arg)) return false;
        if (op === 'gte' && !(v >= arg)) return false;
        if (op === 'in' && !arg.replace(/^\(|\)$/g, '').split(',').includes(v)) return false;
      }
      return true;
    });
    const accept = route.request().headers()['accept'] || '';
    const unico = accept.includes('vnd.pgrst.object');
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-' + Math.max(0, datos.length - 1) + '/' + datos.length }, body: JSON.stringify(unico ? (datos[0] || null) : datos) });
  });
  await ctx.route('**/functions/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await ctx.route(/(cloudinary|googleapis|gstatic|unsplash|ntfy)/, (r) => r.abort());
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errores.push('console: ' + m.text().slice(0, 160)); });
  await page.goto('http://localhost:3457/' + (cliente ? '' : 'admin.html') + '?s=salon-prueba' + extra);
  await page.waitForTimeout(3500);
  return { browser, page, errores };
}
module.exports = { abrir, peticiones, ID, TABLAS };

if (require.main === module) {
  (async () => {
    const { browser, page, errores } = await abrir();
    console.log('url:', page.url());
    console.log('texto:', (await page.innerText('body')).replace(/\n+/g, ' | ').slice(0, 400));
    console.log('tablas pedidas:', JSON.stringify(peticiones));
    console.log('errores:', errores.slice(0, 8));
    await page.screenshot({ path: process.env.TEMP + '/sim1.png' });
    await browser.close();
  })();
}
