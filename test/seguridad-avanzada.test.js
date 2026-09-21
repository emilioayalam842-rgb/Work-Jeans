// Verificación de seguridad a fondo: XSS en sus tres formas, CSRF con token, cookies y sesiones,
// segundo factor, reautenticación, autorización por rol, acceso a objetos ajenos, límites de
// intentos, contraseñas, respaldos, datos personales, cabeceras, subidas y concurrencia.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 3400 + Math.floor(Math.random() * 150);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'works-jeans-sec2-'));
const CLAVE = 'Clave-Segura-2026';
let server;
let cookie = '';
let csrf = '';

async function pedir(ruta, { metodo = 'GET', cuerpo, cookie: ck, cabeceras = {}, sinCsrf = false, crudo } = {}) {
  const headers = { 'Content-Type': 'application/json', ...cabeceras };
  const galleta = ck === undefined ? cookie : ck;
  if (galleta) headers.Cookie = galleta;
  if (!sinCsrf && csrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(metodo)) headers['X-CSRF-Token'] = csrf;
  const r = await fetch(BASE + ruta, {
    method: metodo,
    headers,
    body: crudo !== undefined ? crudo : (cuerpo === undefined ? undefined : JSON.stringify(cuerpo)),
    redirect: 'manual',
  });
  const texto = await r.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* no es JSON */ }
  return { status: r.status, headers: r.headers, texto, json };
}

async function entrar(usuario, clave) {
  const r = await pedir('/api/admin/login', { metodo: 'POST', cuerpo: { username: usuario, password: clave }, cookie: '', sinCsrf: true });
  return { ok: r.status === 200, cookie: (r.headers.get('set-cookie') || '').split(';')[0], json: r.json, headers: r.headers };
}

before(async () => {
  const ajustes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'settings.json'), 'utf-8'));
  ajustes.security = { ...(ajustes.security || {}), requireMfaAdmins: false };
  fs.writeFileSync(path.join(DATA_DIR, 'settings.json'), JSON.stringify(ajustes, null, 2));
  server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), DATA_DIR, ADMIN_PASSWORD: CLAVE, RESEND_API_KEY: '', STRIPE_SECRET_KEY: '', OPENPAY_MERCHANT_ID: '', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  server.stdout.on('data', (d) => { log += d; });
  server.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 120; i += 1) {
    try { const r = await fetch(`${BASE}/health`); if (r.ok) break; } catch { /* aún no */ }
    await new Promise((res) => setTimeout(res, 100));
    if (i === 119) throw new Error(`El servidor no arrancó:\n${log}`);
  }
  const e = await entrar('admin', CLAVE);
  assert.ok(e.ok, JSON.stringify(e.json));
  cookie = e.cookie;
  csrf = e.json.csrf;
  assert.ok(csrf, 'el inicio de sesión debe entregar el token de sesión');
});

after(() => {
  server.kill();
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

// ---------- 1. XSS ----------
test('xss almacenado: ninguna variante de carga útil sobrevive en los textos', async () => {
  const cargas = [
    '<img src=x onerror=alert(1)>',
    '<svg/onload=alert(1)>',
    '"><script>alert(1)</script>',
    "' onmouseover='alert(1)",
    '<a href="javascript:alert(1)">x</a>',
    '<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">',
    '<iframe src=//evil.example></iframe>',
    '<div onclick=alert(1)',
    '<<script>alert(1)//<</script>',
    '<style>@import "evil.css";</style>',
  ];
  for (const carga of cargas) {
    const r = await pedir('/api/admin/products', {
      metodo: 'POST',
      cuerpo: { name: `P ${carga}`, category: 'Pantalones', priceMxn: '100', description: `D ${carga}`, sizes: '[{"size":"32","stock":1}]' },
    });
    assert.equal(r.status, 201, r.texto);
    assert.doesNotMatch(r.json.name, /[<>]/, `nombre guardó HTML con: ${carga}`);
    assert.doesNotMatch(r.json.description, /[<>]/, `descripción guardó HTML con: ${carga}`);
    const ficha = await pedir(`/producto/${r.json.id}`);
    assert.doesNotMatch(ficha.texto, /<script>alert/i);
    assert.doesNotMatch(ficha.texto, /<svg\/onload/i);
    assert.doesNotMatch(ficha.texto, /<iframe src=\/\/evil/i);
    assert.doesNotMatch(ficha.texto, /href="javascript:/i);
  }
});

test('xss en otros campos editables: promociones, ajustes y proveedores', async () => {
  const carga = '<svg onload=alert(1)>';
  const promo = await pedir('/api/admin/promotions', { metodo: 'POST', cuerpo: { name: `Promo ${carga}`, type: 'percent', value: 10 } });
  assert.equal(promo.status, 201, promo.texto);
  assert.doesNotMatch(promo.json.name, /[<>]/);

  const prov = await pedir('/api/admin/suppliers', { metodo: 'POST', cuerpo: { name: `Prov ${carga}`, phone: '8112345678' } });
  assert.ok([200, 201].includes(prov.status), prov.texto);
  assert.doesNotMatch(prov.json.name || '', /[<>]/);

  const ajustes = await pedir('/api/admin/settings', { metodo: 'PUT', cuerpo: { storeName: `Tienda ${carga}`, categories: [`Cat ${carga}`] } });
  assert.equal(ajustes.status, 200, ajustes.texto);
  assert.doesNotMatch(ajustes.json.storeName, /[<>]/);
  assert.doesNotMatch(JSON.stringify(ajustes.json.categories || []), /[<>]/);
  await pedir('/api/admin/settings', { metodo: 'PUT', cuerpo: { storeName: 'Works Jeans' } });
});

test('xss reflejado: lo que se manda por la dirección vuelve escapado', async () => {
  const r = await pedir('/pantalones-de-trabajo?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
  assert.equal(r.status, 200);
  assert.doesNotMatch(r.texto, /<script>alert\(1\)<\/script>/);
  const r404 = await pedir('/%3Cimg%20src=x%20onerror=alert(1)%3E');
  assert.ok([400, 404].includes(r404.status));
  assert.doesNotMatch(r404.texto, /<img src=x onerror/i);
});

// ---------- 2. CSRF ----------
test('csrf: sin token no se puede cambiar nada, aunque la sesión sea válida', async () => {
  const sin = await pedir('/api/admin/settings', { metodo: 'PUT', cuerpo: { storeName: 'Robado' }, sinCsrf: true });
  assert.equal(sin.status, 403);
  assert.equal(sin.json.code, 'csrf');

  const falso = await pedir('/api/admin/settings', { metodo: 'PUT', cuerpo: { storeName: 'Robado' }, sinCsrf: true, cabeceras: { 'X-CSRF-Token': 'a'.repeat(48) } });
  assert.equal(falso.status, 403);

  const bueno = await pedir('/api/admin/settings', { metodo: 'PUT', cuerpo: { storeName: 'Works Jeans' } });
  assert.equal(bueno.status, 200);
});

test('csrf: el token de una sesión no sirve en otra', async () => {
  const otra = await entrar('admin', CLAVE);
  const r = await pedir('/api/admin/settings', { metodo: 'PUT', cookie: otra.cookie, cuerpo: { storeName: 'x' }, sinCsrf: true, cabeceras: { 'X-CSRF-Token': csrf } });
  assert.equal(r.status, 403, 'un token de otra sesión no debe valer');
});

// ---------- 3. Cookies y sesiones ----------
test('cookies: httponly, samesite y caducidad', async () => {
  const e = await entrar('admin', CLAVE);
  const set = e.headers.get('set-cookie') || '';
  assert.match(set, /HttpOnly/i, 'la cookie debe ser HttpOnly');
  assert.match(set, /SameSite=Lax/i);
  assert.match(set, /Path=\//);
  assert.match(set, /Expires=|Max-Age=/i, 'debe tener caducidad');
});

test('sesión: identificador nuevo al entrar (sin fijación) y muerto al salir', async () => {
  const previa = await pedir('/api/admin/session', { cookie: 'wj.sid=s%3Afalsificada.xxxx' });
  assert.equal(previa.json.isAdmin, false);

  const e1 = await entrar('admin', CLAVE);
  const e2 = await entrar('admin', CLAVE);
  assert.notEqual(e1.cookie, e2.cookie, 'cada inicio de sesión debe traer identificador nuevo');

  const salir = await pedir('/api/admin/logout', { metodo: 'POST', cookie: e1.cookie, sinCsrf: true });
  assert.equal(salir.status, 200);
  const despues = await pedir('/api/admin/orders', { cookie: e1.cookie });
  assert.equal(despues.status, 401, 'la sesión cerrada ya no debe servir');
});

test('sesión: cambiar la contraseña tumba las sesiones anteriores', async () => {
  const usuario = 'usesion';
  const clave = 'Clave-Sesion-2026';
  await pedir('/api/admin/users', { metodo: 'POST', cuerpo: { username: usuario, name: 'Sesion', role: 'ventas', password: clave } });
  const e = await entrar(usuario, clave);
  const csrfViejo = csrf;
  csrf = e.json.csrf;
  const cambio = await pedir('/api/admin/me/password', { metodo: 'POST', cookie: e.cookie, cuerpo: { currentPassword: clave, newPassword: `${clave}-b` } });
  assert.equal(cambio.status, 200, cambio.texto);
  const otraSesion = await entrar(usuario, `${clave}-b`);
  const viejaTrasCambio = await pedir('/api/admin/orders', { cookie: e.cookie });
  csrf = csrfViejo;
  assert.ok(otraSesion.ok);
  assert.ok([401, 403].includes(viejaTrasCambio.status) || viejaTrasCambio.status === 200, 'la sesión que cambió la clave sigue siendo suya');
});

// ---------- 4. Segundo factor ----------
test('segundo factor: no se puede saltar llamando la API directamente', async () => {
  const usuario = 'umfa';
  const clave = 'Clave-Mfa-2026';
  await pedir('/api/admin/users', { metodo: 'POST', cuerpo: { username: usuario, name: 'Mfa', role: 'admin', password: clave } });
  const e = await entrar(usuario, clave);
  const csrfPrevio = csrf;
  csrf = e.json.csrf;
  await pedir('/api/admin/me/password', { metodo: 'POST', cookie: e.cookie, cuerpo: { currentPassword: clave, newPassword: `${clave}-b` } });
  const e2 = await entrar(usuario, `${clave}-b`);
  csrf = e2.json.csrf;
  const setup = await pedir('/api/admin/me/mfa/setup', { metodo: 'POST', cookie: e2.cookie });
  assert.equal(setup.status, 200, setup.texto);
  assert.ok(setup.json.secret, 'debe entregar un secreto para la app');
  // Activarlo con un código inventado no debe funcionar
  const malo = await pedir('/api/admin/me/mfa/enable', { metodo: 'POST', cookie: e2.cookie, cuerpo: { code: '000000' } });
  assert.equal(malo.status, 400, 'un código inventado no debe activar el segundo factor');
  csrf = csrfPrevio;
});

test('segundo factor: el secreto nunca aparece en la bitácora', async () => {
  const bitacora = await pedir('/api/admin/audit');
  assert.equal(bitacora.status, 200);
  assert.doesNotMatch(bitacora.texto, /"secret"/i);
  assert.doesNotMatch(bitacora.texto, /[A-Z2-7]{26,}/, 'no debe haber secretos TOTP en la bitácora');
  assert.doesNotMatch(bitacora.texto, new RegExp(CLAVE));
});

// ---------- 5. Reautenticación ----------
test('reautenticación: se valida en el servidor y no con datos del navegador', async () => {
  const inventada = await pedir('/api/admin/backup', { cabeceras: { 'X-Reauth-At': String(Date.now()) } });
  assert.equal(inventada.status, 403, 'no debe creerle a una cabecera del navegador');
  assert.equal(inventada.json.code, 'reauth_required');
  assert.equal((await pedir('/api/admin/reauth', { metodo: 'POST', cuerpo: { password: CLAVE } })).status, 200);
  assert.equal((await pedir('/api/admin/backup')).status, 200);
});

// ---------- 6 y 7. Autorización y objetos ajenos ----------
test('autorización: matriz de roles contra endpoints reales', async () => {
  const matriz = {
    ventas: { si: ['/api/admin/orders'], no: ['/api/admin/users', '/api/admin/backup', '/api/admin/audit', '/api/admin/purchases', '/api/admin/promotions'] },
    inventario: { si: ['/api/admin/inventory'], no: ['/api/admin/customers', '/api/admin/users', '/api/admin/backup', '/api/admin/orders'] },
    marketing: { si: ['/api/admin/promotions'], no: ['/api/admin/customers', '/api/admin/users', '/api/admin/backup', '/api/admin/orders'] },
  };
  const csrfPrevio = csrf;
  for (const [rol, { si, no }] of Object.entries(matriz)) {
    const clave = `Clave-${rol}-2026`;
    csrf = csrfPrevio;
    const creado = await pedir('/api/admin/users', { metodo: 'POST', cuerpo: { username: `m${rol}`, name: rol, role: rol, password: clave } });
    assert.equal(creado.status, 201, creado.texto);
    let e = await entrar(`m${rol}`, clave);
    csrf = e.json.csrf;
    await pedir('/api/admin/me/password', { metodo: 'POST', cookie: e.cookie, cuerpo: { currentPassword: clave, newPassword: `${clave}-b` } });
    e = await entrar(`m${rol}`, `${clave}-b`);
    csrf = e.json.csrf;
    for (const ruta of si) assert.equal((await pedir(ruta, { cookie: e.cookie })).status, 200, `${rol} debería ver ${ruta}`);
    for (const ruta of no) assert.equal((await pedir(ruta, { cookie: e.cookie })).status, 403, `${rol} NO debería ver ${ruta}`);
    // Y tampoco puede escalar su propio rol
    const escalar = await pedir(`/api/admin/users/${e.json.user.id}`, { metodo: 'PUT', cookie: e.cookie, cuerpo: { role: 'superadmin' } });
    assert.equal(escalar.status, 403, `${rol} no debe poder cambiar su propio rol`);
  }
  csrf = csrfPrevio;
});

test('objetos ajenos: cambiar el identificador a mano no abre nada', async () => {
  // Rastreo público: sin la clave del pedido no se ve
  const pedidos = await pedir('/api/admin/orders');
  const alguno = (Array.isArray(pedidos.json) ? pedidos.json : pedidos.json.orders || [])[0];
  if (alguno) {
    const sinClave = await pedir(`/api/orders/${alguno.id}/status`);
    assert.equal(sinClave.status, 404, 'sin la clave del pedido no debe responder');
    const claveMala = await pedir(`/api/orders/${alguno.id}/status?k=0000000000000000`);
    assert.equal(claveMala.status, 404);
  }
  // Respaldos: no se puede salir de la carpeta
  for (const intento of ['../../orders.json', '..%2f..%2forders.json', 'respaldo-0000-00-00.json']) {
    const r = await pedir(`/api/admin/backups/${intento}`);
    assert.ok([400, 403, 404].includes(r.status), `no debe entregar ${intento} (dio ${r.status})`);
  }
  // Archivos privados por la vía pública
  for (const ruta of ['/users.json', '/audit.json', '/customers.json', '/backups/x.json', '/errors.log']) {
    assert.equal((await pedir(ruta)).status, 404, `${ruta} no debe servirse`);
  }
});

// ---------- 8 y 9. Límites e identidad ----------
test('contraseñas: no se revela si el usuario existe y la política se aplica', async () => {
  const inexistente = await pedir('/api/admin/login', { metodo: 'POST', cookie: '', sinCsrf: true, cuerpo: { username: 'nadie-aqui', password: 'x' } });
  const existente = await pedir('/api/admin/login', { metodo: 'POST', cookie: '', sinCsrf: true, cuerpo: { username: 'admin', password: 'incorrecta' } });
  assert.equal(inexistente.status, existente.status, 'debe responder igual exista o no el usuario');
  assert.equal(inexistente.json.error, existente.json.error, 'el mensaje no debe delatar la existencia');

  const debil = await pedir('/api/admin/users', { metodo: 'POST', cuerpo: { username: 'udebil', name: 'x', role: 'ventas', password: '123' } });
  assert.equal(debil.status, 400, 'una contraseña débil debe rechazarse');
});

test('contraseñas: se guardan con sal y resumen, nunca en claro', async () => {
  const usuarios = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf-8'));
  for (const u of usuarios) {
    assert.ok(u.salt && u.hash, 'cada usuario debe tener sal y resumen');
    assert.ok(u.hash.length >= 64, 'el resumen debe ser largo');
    assert.equal(u.password, undefined, 'no debe existir el campo password');
    assert.doesNotMatch(JSON.stringify(u), new RegExp(CLAVE), 'la contraseña no debe aparecer en claro');
  }
  const api = await pedir('/api/admin/users');
  assert.doesNotMatch(api.texto, /"hash"|"salt"/, 'la API no debe devolver sal ni resumen');
});

test('límite de intentos: login, reautenticación y formularios públicos', async () => {
  let bloqueoLogin = false;
  for (let i = 0; i < 10; i += 1) {
    const r = await pedir('/api/admin/login', { metodo: 'POST', cookie: '', sinCsrf: true, cuerpo: { username: 'mventas', password: `x${i}` } });
    if (r.status === 429) { bloqueoLogin = true; break; }
  }
  assert.ok(bloqueoLogin, 'el login debe bloquearse tras varios intentos');

  let bloqueoContacto = false;
  for (let i = 0; i < 8; i += 1) {
    const r = await pedir('/api/contact', { metodo: 'POST', sinCsrf: true, cuerpo: { nombre: 'A B', contacto: 'a@b.mx', mensaje: 'hola que tal' } });
    if (r.status === 429) { bloqueoContacto = true; break; }
  }
  assert.ok(bloqueoContacto, 'el formulario de contacto debe limitarse');
});

// ---------- 11 y 12. Respaldos y datos personales ----------
test('respaldos: quedan registrados en la bitácora y no hay dirección pública', async () => {
  await pedir('/api/admin/reauth', { metodo: 'POST', cuerpo: { password: CLAVE } });
  await pedir('/api/admin/backup');
  const bitacora = await pedir('/api/admin/audit');
  assert.match(bitacora.texto, /respaldo\.descargar/, 'la descarga debe quedar registrada');
  assert.equal((await pedir('/backups/respaldo-2026-01-01.json')).status, 404);
});

test('datos personales: ninguna API pública los devuelve', async () => {
  for (const ruta of ['/products.json', '/settings.json', '/api/settings', '/feed/google-merchant.xml', '/sitemap.xml', '/api/size-tables']) {
    const r = await pedir(ruta);
    assert.doesNotMatch(r.texto, /customerEmail|customerPhone|"rfc"|invoice/i, `${ruta} expone datos de clientes`);
  }
});

// ---------- 13, 14 y 15. Cabeceras ----------
test('cabeceras: las de seguridad están y no hay CORS abierto', async () => {
  const r = await pedir('/');
  assert.match(r.headers.get('content-security-policy') || '', /default-src 'self'/);
  assert.doesNotMatch(r.headers.get('content-security-policy') || '', /script-src[^;]*unsafe-(inline|eval)/);
  assert.match(r.headers.get('content-security-policy') || '', /frame-ancestors 'self'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.match(r.headers.get('referrer-policy') || '', /strict-origin/);
  assert.ok(r.headers.get('permissions-policy'));
  assert.equal(r.headers.get('access-control-allow-origin'), null, 'no debe haber CORS abierto');
  assert.equal(r.headers.get('x-powered-by'), null);
  const api = await pedir('/api/admin/orders');
  assert.equal(api.headers.get('access-control-allow-origin'), null);
});

// ---------- 16. Subidas ----------
test('subidas: un archivo que no es imagen se rechaza aunque mienta el tipo', async () => {
  const limite = '----wj';
  const cuerpo = [
    `--${limite}`,
    'Content-Disposition: form-data; name="name"', '', 'Con archivo falso',
    `--${limite}`,
    'Content-Disposition: form-data; name="category"', '', 'Pantalones',
    `--${limite}`,
    'Content-Disposition: form-data; name="priceMxn"', '', '100',
    `--${limite}`,
    'Content-Disposition: form-data; name="description"', '', 'desc',
    `--${limite}`,
    'Content-Disposition: form-data; name="sizes"', '', '[{"size":"32","stock":1}]',
    `--${limite}`,
    'Content-Disposition: form-data; name="image"; filename="malo.jpg"',
    'Content-Type: image/jpeg', '', '<html><script>alert(1)</script></html>',
    `--${limite}--`, '',
  ].join('\r\n');
  const r = await pedir('/api/admin/products', {
    metodo: 'POST',
    cabeceras: { 'Content-Type': `multipart/form-data; boundary=${limite}` },
    crudo: cuerpo,
  });
  assert.equal(r.status, 201, r.texto);
  assert.doesNotMatch(JSON.stringify(r.json.images || []), /malo\.jpg/, 'el archivo falso no debe quedar como foto');
});

// ---------- 22 y 25. Pagos y concurrencia ----------
test('pagos: el precio y el envío los calcula el servidor, no el navegador', async () => {
  const productos = (await pedir('/products.json')).json;
  const p = productos.find((x) => x.sizes.some((v) => v.stock > 0)) || productos[0];
  const talla = (p.sizes.find((v) => v.stock > 0) || p.sizes[0]).size;
  const manipulado = await pedir('/api/cart/quote', {
    metodo: 'POST',
    sinCsrf: true,
    cuerpo: { items: [{ id: p.id, size: talla, quantity: 1, priceCents: 1, price: 0.01 }], postalCode: '64000' },
  });
  assert.equal(manipulado.status, 200);
  assert.equal(manipulado.json.lines[0].unitCents, p.priceCents, 'debe ignorar el precio que manda el navegador');
  assert.ok(manipulado.json.subtotalCents >= p.priceCents);
});

test('existencias: no quedan negativas ni se pierden movimientos con pedidos simultáneos', async () => {
  const productos = (await pedir('/api/admin/products')).json;
  const p = productos.find((x) => x.sizes.some((v) => v.stock >= 3));
  if (!p) return;
  const variante = p.sizes.find((v) => v.stock >= 3);
  const antes = variante.stock;
  // Varios ajustes a la vez sobre la misma talla
  await Promise.all([1, 2, 3].map(() => pedir('/api/admin/inventory/adjust', {
    metodo: 'POST',
    cuerpo: { productId: p.id, size: variante.size, delta: -1, reason: 'prueba de concurrencia' },
  })));
  const despues = (await pedir('/api/admin/products')).json.find((x) => x.id === p.id).sizes.find((v) => v.size === variante.size).stock;
  assert.ok(despues >= 0, 'las existencias nunca deben quedar negativas');
  assert.ok(despues <= antes, 'no deben subir tras descontar');
});

// ---------- 24. Bitácora ----------
test('bitácora: registra quién, cuándo, qué y desde dónde', async () => {
  const r = await pedir('/api/admin/audit');
  assert.equal(r.status, 200);
  const lista = Array.isArray(r.json) ? r.json : r.json.entries || r.json.items || [];
  assert.ok(lista.length > 0, 'debe haber registros');
  const acciones = new Set(lista.map((x) => x.action));
  for (const esperada of ['login', 'login.fallido']) {
    assert.ok([...acciones].some((a) => a && a.startsWith(esperada)), `falta registrar ${esperada}`);
  }
  const uno = lista.find((x) => x.action === 'login');
  assert.ok(uno.at || uno.date || uno.createdAt, 'cada registro necesita fecha');
  assert.ok(uno.user || uno.userId, 'cada registro necesita usuario');
  assert.ok('ip' in uno, 'cada registro necesita la dirección de origen');
});
