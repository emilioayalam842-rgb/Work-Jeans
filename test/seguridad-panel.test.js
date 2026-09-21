// Pruebas de seguridad del panel: permisos por rol contra los endpoints reales (no menús ocultos),
// XSS almacenado, origen de las peticiones, reautenticación, límite de intentos y validación de respaldos.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 3600 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'works-jeans-sec-'));
const CLAVE_ADMIN = 'prueba-segura-1234';
let server;

const api = async (ruta, { metodo = 'GET', cuerpo, cookie, cabeceras = {} } = {}) => {
  const r = await fetch(BASE + ruta, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...cabeceras,
    },
    body: cuerpo === undefined ? undefined : (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)),
    redirect: 'manual',
  });
  const texto = await r.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* no es JSON */ }
  return { status: r.status, headers: r.headers, texto, json };
};

const entrar = async (usuario, clave) => {
  const r = await api('/api/admin/login', { metodo: 'POST', cuerpo: { username: usuario, password: clave } });
  return { ok: r.status === 200, cookie: (r.headers.get('set-cookie') || '').split(';')[0], json: r.json };
};

let cookieSuper = '';

before(async () => {
  // El panel exige verificación en dos pasos por omisión. Estas pruebas trabajan con contraseña,
  // así que se deja la configuración lista antes de arrancar el servidor.
  const ajustes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'settings.json'), 'utf-8'));
  ajustes.security = { ...(ajustes.security || {}), requireMfaAdmins: false };
  fs.writeFileSync(path.join(DATA_DIR, 'settings.json'), JSON.stringify(ajustes, null, 2));

  server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), DATA_DIR, ADMIN_PASSWORD: CLAVE_ADMIN, RESEND_API_KEY: '', STRIPE_SECRET_KEY: '', OPENPAY_MERCHANT_ID: '', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  server.stdout.on('data', (d) => { log += d; });
  server.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 100; i += 1) {
    try { const r = await fetch(`${BASE}/health`); if (r.ok) break; } catch { /* aún no */ }
    await new Promise((res) => setTimeout(res, 100));
    if (i === 99) throw new Error(`El servidor no arrancó:\n${log}`);
  }
  const e = await entrar('admin', CLAVE_ADMIN);
  assert.ok(e.ok, `no se pudo entrar: ${JSON.stringify(e.json)}`);
  cookieSuper = e.cookie;
});

after(() => {
  server.kill();
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

test('sesión: sin cookie no se llega a ningún dato del panel', async () => {
  for (const ruta of ['/api/admin/orders', '/api/admin/products', '/api/admin/customers', '/api/admin/users', '/api/admin/backup', '/api/admin/audit']) {
    assert.equal((await api(ruta)).status, 401, `${ruta} debería exigir sesión`);
  }
});

test('cabeceras: el panel no se guarda en caché y no delata el servidor', async () => {
  const r = await api('/workmapadmin.html');
  assert.match(r.headers.get('cache-control') || '', /no-store/);
  assert.equal(r.headers.get('x-powered-by'), null);
  const datos = await api('/api/admin/orders', { cookie: cookieSuper });
  assert.match(datos.headers.get('cache-control') || '', /no-store/);
});

test('salud: solo dice si responde, sin datos de infraestructura', async () => {
  const r = await api('/health');
  assert.deepEqual(r.json, { ok: true });
});

test('origen: se rechaza una petición que viene de otro sitio', async () => {
  const ajena = await api('/api/admin/products', { metodo: 'POST', cookie: cookieSuper, cabeceras: { Origin: 'https://sitio-malicioso.example' }, cuerpo: { name: 'x' } });
  assert.equal(ajena.status, 403);
  assert.match(ajena.json.error, /otro sitio/i);
  const propia = await api('/api/admin/orders', { cookie: cookieSuper, cabeceras: { Origin: `http://127.0.0.1:${PORT}` } });
  assert.equal(propia.status, 200);
});

test('xss: el servidor no guarda etiquetas HTML en los textos', async () => {
  const r = await api('/api/admin/products', {
    metodo: 'POST',
    cookie: cookieSuper,
    cuerpo: { name: 'Malo <img src=x onerror=alert(1)>', category: 'Pantalones', priceMxn: '100', description: '<script>alert(2)</script>desc', sizes: '[{"size":"32","stock":1}]' },
  });
  assert.equal(r.status, 201, r.texto);
  assert.doesNotMatch(r.json.name, /[<>]/, 'el nombre guardó HTML');
  assert.doesNotMatch(r.json.description, /[<>]/, 'la descripción guardó HTML');
  // En la tienda el texto puede aparecer dentro de un atributo, pero nunca como etiqueta propia
  const ficha = await api(`/producto/${r.json.id}`);
  assert.doesNotMatch(ficha.texto, /<img src=x/i, 'se coló la etiqueta inyectada');
  assert.doesNotMatch(ficha.texto, /<script>alert/i, 'se coló un script inyectado');
  // El panel tampoco debe recibir el texto con signos de menor o mayor
  const lista = await api('/api/admin/products', { cookie: cookieSuper });
  const guardado = lista.json.find((x) => x.id === r.json.id);
  assert.doesNotMatch(guardado.name, /[<>]/);
});

test('reautenticación: los respaldos piden la contraseña otra vez', async () => {
  const sinConfirmar = await api('/api/admin/backup', { cookie: cookieSuper });
  assert.equal(sinConfirmar.status, 403);
  assert.equal(sinConfirmar.json.code, 'reauth_required');

  const mala = await api('/api/admin/reauth', { metodo: 'POST', cookie: cookieSuper, cuerpo: { password: 'incorrecta' } });
  assert.equal(mala.status, 401);

  const buena = await api('/api/admin/reauth', { metodo: 'POST', cookie: cookieSuper, cuerpo: { password: CLAVE_ADMIN } });
  assert.equal(buena.status, 200, buena.texto);
  const conConfirmacion = await api('/api/admin/backup', { cookie: cookieSuper });
  assert.equal(conConfirmacion.status, 200);
  assert.equal(conConfirmacion.json.app, 'works-jeans');
  assert.ok(Array.isArray(conConfirmacion.json.imagenes), 'el respaldo debe incluir el inventario de fotos');
});

test('respaldo: se rechaza un archivo inválido con el motivo exacto', async () => {
  const casos = [
    [{}, /no es un respaldo/i],
    [{ app: 'otra-tienda', products: [], orders: [], settings: {} }, /Works Jeans/i],
    [{ app: 'works-jeans', version: 99, products: [], orders: [], settings: {} }, /versión/i],
    [{ app: 'works-jeans', products: 'no-es-lista', orders: [], settings: {} }, /productos o los pedidos/i],
    [{ app: 'works-jeans', products: [], orders: [], settings: null }, /configuración/i],
    [{ app: 'works-jeans', products: [{ sinId: 1 }], orders: [], settings: {} }, /identificador/i],
  ];
  for (const [cuerpo, esperado] of casos) {
    const r = await api('/api/admin/restore', { metodo: 'POST', cookie: cookieSuper, cuerpo });
    assert.equal(r.status, 400, JSON.stringify(cuerpo).slice(0, 60));
    assert.match(r.json.error, esperado);
  }
});

test('permisos: cada rol solo llega a lo suyo, comprobado contra los endpoints', async () => {
  const roles = [
    { rol: 'ventas', permitido: ['/api/admin/orders', '/api/admin/products'], prohibido: ['/api/admin/users', '/api/admin/backup', '/api/admin/audit', '/api/admin/purchases'] },
    { rol: 'inventario', permitido: ['/api/admin/products', '/api/admin/inventory', '/api/admin/purchases'], prohibido: ['/api/admin/customers', '/api/admin/users', '/api/admin/backup', '/api/admin/orders'] },
    { rol: 'marketing', permitido: ['/api/admin/promotions'], prohibido: ['/api/admin/customers', '/api/admin/backup', '/api/admin/users', '/api/admin/orders'] },
    { rol: 'contabilidad', permitido: [], prohibido: ['/api/admin/users', '/api/admin/backup'] },
    { rol: 'atencion', permitido: ['/api/admin/orders'], prohibido: ['/api/admin/users', '/api/admin/backup', '/api/admin/purchases'] },
  ];
  for (const { rol, permitido, prohibido } of roles) {
    const clave = `Clave-${rol}-2026`;
    const creado = await api('/api/admin/users', { metodo: 'POST', cookie: cookieSuper, cuerpo: { username: `u${rol}`, name: rol, role: rol, password: clave } });
    assert.equal(creado.status, 201, `no se creó ${rol}: ${creado.texto}`);
    assert.equal(creado.json.user?.mustChangePassword ?? true, true, 'debe exigir cambio de contraseña al entrar');
    assert.doesNotMatch(creado.texto, new RegExp(clave), 'la respuesta no debe devolver la contraseña');

    const e = await entrar(`u${rol}`, clave);
    assert.ok(e.ok, `${rol} no pudo entrar`);
    // Primero debe cambiar la contraseña: hasta entonces el panel no le abre nada
    const bloqueado = await api('/api/admin/orders', { cookie: e.cookie });
    assert.equal(bloqueado.status, 403);
    assert.equal(bloqueado.json.code, 'password_change_required');

    const cambio = await api('/api/admin/me/password', { metodo: 'POST', cookie: e.cookie, cuerpo: { currentPassword: clave, newPassword: `${clave}-nueva` } });
    assert.equal(cambio.status, 200, cambio.texto);
    const e2 = await entrar(`u${rol}`, `${clave}-nueva`);
    assert.ok(e2.ok);

    for (const ruta of permitido) {
      assert.equal((await api(ruta, { cookie: e2.cookie })).status, 200, `${rol} debería poder ver ${ruta}`);
    }
    for (const ruta of prohibido) {
      const r = await api(ruta, { cookie: e2.cookie });
      assert.equal(r.status, 403, `${rol} NO debería llegar a ${ruta} (respondió ${r.status})`);
    }
    // Y tampoco puede borrar pedidos ni tocar la configuración
    const borrar = await api('/api/admin/orders/inexistente', { metodo: 'DELETE', cookie: e2.cookie });
    assert.equal(borrar.status, 403, `${rol} no debería poder borrar pedidos`);
    const config = await api('/api/admin/settings', { metodo: 'PUT', cookie: e2.cookie, cuerpo: { storeName: 'Hackeado' } });
    assert.equal(config.status, 403, `${rol} no debería poder cambiar la configuración`);
  }
});

test('límite de intentos: la contraseña no se puede adivinar a fuerza bruta', async () => {
  let bloqueado = false;
  for (let i = 0; i < 8; i += 1) {
    const r = await api('/api/admin/login', { metodo: 'POST', cuerpo: { username: 'uventas', password: `intento-${i}` } });
    if (r.status === 429) { bloqueado = true; break; }
  }
  assert.ok(bloqueado, 'debería bloquear tras varios intentos fallidos');
});
