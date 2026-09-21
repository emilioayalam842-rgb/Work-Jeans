// Pruebas básicas: arrancan el servidor con datos temporales y comprueban tienda, API pública y panel.
// Ejecutar con: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 3900 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'works-jeans-test-'));
let server;
let cookie = '';

const api = async (route, opts = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(opts.headers || {}) };
  const r = await fetch(BASE + route, { ...opts, headers, body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body, redirect: 'manual' });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* no es JSON */ }
  return { status: r.status, headers: r.headers, text, json };
};

before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), DATA_DIR, ADMIN_PASSWORD: 'prueba-1234', RESEND_API_KEY: '', STRIPE_SECRET_KEY: '', OPENPAY_MERCHANT_ID: '', OPENPAY_PRIVATE_KEY: '', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  server.stdout.on('data', (d) => { log += d; });
  server.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 100; i += 1) {
    try { const r = await fetch(`${BASE}/health`); if (r.ok) return; } catch { /* aún no arranca */ }
    await new Promise((res) => setTimeout(res, 100));
  }
  throw new Error(`El servidor no arrancó:\n${log}`);
});

after(() => {
  server.kill();
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

test('salud: /health responde ok', async () => {
  const r = await api('/health');
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
});

test('tienda: inicio con tarjetas de producto y carrito', async () => {
  const r = await api('/');
  assert.equal(r.status, 200);
  assert.match(r.text, /id="productsGrid"/);
  assert.match(r.text, /id="cartDrawer"/);
  assert.match(r.text, /footer-credit/);
});

test('tienda: ficha de producto, categoría, artículos y página de contenido', async () => {
  const products = (await api('/products.json')).json;
  assert.ok(Array.isArray(products) && products.length > 0);
  const ficha = await api(`/producto/${products[0].id}`);
  assert.equal(ficha.status, 200);
  assert.match(ficha.text, /pdp-buy/);
  assert.equal((await api('/pantalones-de-trabajo')).status, 200);
  assert.equal((await api('/articulos')).status, 200);
  assert.equal((await api('/preguntas-frecuentes')).status, 200);
  assert.equal((await api('/rastrear.html')).status, 200);
});

test('seo: preguntas frecuentes, ficha de negocio e imágenes en el sitemap', async () => {
  // Todos los artículos y las dos categorías deben traer el bloque de preguntas.
  const sitemap = (await api('/sitemap.xml')).text;
  const rutas = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const sinFaq = [];
  for (const ruta of rutas.filter((r) => r.startsWith('/articulos/') || r === '/camisas-de-trabajo' || r === '/pantalones-de-trabajo')) {
    const html = (await api(ruta)).text;
    if (!html.includes('"FAQPage"')) sinFaq.push(ruta);
  }
  assert.deepEqual(sinFaq, [], `sin preguntas frecuentes:\n${sinFaq.join('\n')}`);

  // Páginas locales con la ficha del negocio.
  for (const ruta of ['/contacto', '/nosotros', '/ropa-de-trabajo-apodaca']) {
    assert.match((await api(ruta)).text, /"ClothingStore"/, `${ruta} sin ficha de negocio`);
  }

  // Sitemap con imágenes de producto.
  assert.match(sitemap, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
  const productos = (await api('/products.json')).json;
  const imagenes = [...sitemap.matchAll(/<image:loc>/g)].length;
  assert.ok(imagenes >= productos.length, `esperaba al menos ${productos.length} imágenes, hubo ${imagenes}`);
});

test('seo: la ficha declara envío, tiempo de entrega y devoluciones para Google', async () => {
  const products = (await api('/products.json')).json;
  const html = (await api(`/producto/${products[0].id}`)).text;
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const product = blocks.flatMap((b) => b['@graph'] || [b]).find((n) => n['@type'] === 'Product');
  assert.ok(product, 'falta el bloque de producto');
  const ship = [].concat(product.offers.shippingDetails)[0];
  assert.equal(ship['@type'], 'OfferShippingDetails');
  assert.equal(ship.deliveryTime.handlingTime.unitCode, 'DAY');
  assert.ok(ship.deliveryTime.transitTime.maxValue >= ship.deliveryTime.transitTime.minValue);
  const ret = product.offers.hasMerchantReturnPolicy;
  assert.equal(ret.merchantReturnDays, 15);
  assert.match(ret.merchantReturnLink, /\/envios-y-devoluciones$/);
  assert.match((await api('/feed/google-merchant.xml')).text, /<g:return_policy_days>15<\/g:return_policy_days>/);
});

test('seo: títulos y descripciones dentro del límite de Google', async () => {
  const sitemap = (await api('/sitemap.xml')).text;
  const rutas = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const largos = [];
  for (const ruta of rutas) {
    const html = (await api(ruta === '/' ? '/' : ruta)).text;
    const t = (html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1].trim();
    const d = (html.match(/<meta name="description" content="([\s\S]*?)"/) || [, ''])[1].trim();
    if (t.length > 60 || d.length > 158 || d.length < 100) largos.push(`${ruta} título ${t.length} descripción ${d.length}`);
  }
  assert.deepEqual(largos, [], `fuera de rango:\n${largos.join('\n')}`);
});

test('tienda: 404 y archivos privados bloqueados', async () => {
  assert.equal((await api('/pagina-que-no-existe')).status, 404);
  assert.equal((await api('/orders.json')).status, 404);
  assert.equal((await api('/server.js')).status, 404);
  assert.equal((await api('/backups/respaldo-2026-01-01.json')).status, 404);
});

test('seo: una sola dirección por página (las .html redirigen)', async () => {
  for (const name of ['aviso-de-privacidad', 'envios-y-devoluciones']) {
    const r = await api(`/${name}.html`);
    assert.equal(r.status, 301, `${name}.html debería redirigir`);
    assert.equal(r.headers.get('location'), `/${name}`);
    const limpia = await api(`/${name}`);
    assert.equal(limpia.status, 200);
    assert.match(limpia.text, new RegExp(`rel="canonical" href="[^"]*/${name}"`));
  }
  const home = await api('/index.html');
  assert.equal(home.status, 301);
  assert.equal(home.headers.get('location'), '/');
});

test('seo: sitemap y robots', async () => {
  const s = await api('/sitemap.xml');
  assert.equal(s.status, 200);
  assert.match(s.text, /<loc>[^<]*\/pantalones-de-trabajo<\/loc>/);
  assert.doesNotMatch(s.text, /<loc>[^<]*\.html<\/loc>/, 'el sitemap no debe listar direcciones .html');
  assert.doesNotMatch(s.text, /<loc>[^<]*\/rastrear<\/loc>/, 'la página de rastreo no va en el sitemap');
  const fechas = [...s.text.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
  assert.ok(fechas.every((f) => /^\d{4}-\d{2}-\d{2}$/.test(f)), 'fechas con formato de día');
  assert.equal((await api('/robots.txt')).status, 200);
});

test('caché: css versionado se guarda un año, html se revalida', async () => {
  const css = await api('/styles.css?v=prueba');
  assert.equal(css.status, 200);
  assert.match(css.headers.get('cache-control'), /max-age=31536000/);
  const html = await api('/');
  assert.match(html.headers.get('cache-control'), /max-age=0/);
});

test('carrito: cotización con talla válida', async () => {
  const products = (await api('/products.json')).json;
  const p = products.find((x) => x.sizes && x.sizes.some((s) => s.stock > 0)) || products[0];
  const size = (p.sizes.find((s) => s.stock > 0) || p.sizes[0]).size;
  const r = await api('/api/cart/quote', { method: 'POST', body: { items: [{ id: p.id, size, quantity: 1 }], postalCode: '64000' } });
  assert.equal(r.status, 200);
  assert.ok(r.json.lines.length === 1);
  assert.ok(r.json.subtotalCents > 0);
});

test('carrito: escalones de envío por cantidad de piezas', async () => {
  // El envío sube por escalones porque la paquetería cobra por peso y caja.
  const login = await api('/api/admin/login', { method: 'POST', body: { username: 'admin', password: 'prueba-1234' } });
  const sesion = (login.headers.get('set-cookie') || '').split(';')[0];
  const ajustes = await api('/api/settings');
  const envio = { ...ajustes.json.shipping, freeFromCents: 0, quoteFromQty: 0 };
  envio.zones = envio.zones.map((z, i) => (i === 0
    ? { ...z, tiers: [{ maxQty: 3, costCents: 9900 }, { maxQty: 10, costCents: 18000 }] }
    : { ...z, tiers: [] }));
  const guardar = await api('/api/admin/settings', { method: 'PUT', headers: { Cookie: sesion }, body: { shipping: envio } });
  assert.equal(guardar.status, 200, guardar.text);

  const productos = (await api('/products.json')).json;
  const p = productos.find((x) => x.sizes.some((v) => v.stock > 0)) || productos[0];
  const talla = (p.sizes.find((v) => v.stock > 0) || p.sizes[0]).size;
  const cotizar = async (cantidad) => {
    const r = await api('/api/cart/quote', { method: 'POST', body: { items: [{ id: p.id, size: talla, quantity: cantidad }], postalCode: '64000' } });
    return r.json.shipping;
  };
  assert.equal((await cotizar(1)).costCents, 9900, 'una pieza cae en el primer escalón');
  assert.equal((await cotizar(3)).costCents, 9900, 'el tope del escalón se incluye');
  assert.equal((await cotizar(4)).costCents, 18000, 'al pasar el tope sube al siguiente');
  assert.equal((await cotizar(11)).status, 'pending_rates', 'arriba del último escalón se cotiza aparte');

  // Google recibe la tarifa de una pieza
  const ficha = (await api(`/producto/${p.id}`)).text;
  assert.match(ficha, /"value": ?"99\.00"/);
  await api('/api/admin/logout', { method: 'POST', headers: { Cookie: sesion } });
});

test('api: cuerpo inválido devuelve 400 con mensaje, no 500', async () => {
  const r = await api('/api/cart/quote', { method: 'POST', body: '{esto no es json' });
  assert.equal(r.status, 400);
  assert.ok(r.json && r.json.error);
});

test('rastreo: pedido inexistente no revela nada', async () => {
  const r = await api('/api/orders/track', { method: 'POST', body: { id: 'ord_no_existe', contact: 'nadie@ejemplo.com' } });
  assert.ok(r.status === 404 || r.status === 400);
});

test('seguridad: política de contenido y formularios públicos', async () => {
  const home = await api('/');
  const csp = home.headers.get('content-security-policy');
  assert.ok(csp, 'falta la política de contenido');
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/, 'los scripts en línea deben estar prohibidos');
  assert.match(csp, /frame-ancestors 'self'/);
  // Contacto: valida en el servidor y responde con mensaje claro
  const vacio = await api('/api/contact', { method: 'POST', body: { nombre: '', contacto: '', mensaje: '' } });
  assert.equal(vacio.status, 400);
  assert.ok(vacio.json.error);
  const bot = await api('/api/contact', { method: 'POST', body: { nombre: 'Bot', contacto: 'b@b.com', mensaje: 'hola', website: 'spam' } });
  assert.equal(bot.status, 200, 'la trampa de bots responde sin error para no delatarse');
  const ok = await api('/api/contact', { method: 'POST', body: { nombre: 'Ana Ruiz', contacto: 'ana@ejemplo.mx', telefono: '8112345678', empresa: 'Constructora X', mensaje: 'Necesito 40 pantalones para mi cuadrilla.' } });
  assert.equal(ok.status, 200);
});

test('seo: atajos de dirección y landing de uniformes industriales', async () => {
  for (const [corta, destino] of [['/mayoreo', '/mayoreo-ropa-de-trabajo'], ['/pantalon-de-trabajo-reflejante', '/pantalon-de-mezclilla-con-reflejante'], ['/faq', '/preguntas-frecuentes']]) {
    const r = await api(corta);
    assert.equal(r.status, 301, `${corta} debería redirigir`);
    assert.equal(r.headers.get('location'), destino);
  }
  const p = await api('/uniformes-industriales');
  assert.equal(p.status, 200);
  assert.match(p.text, /"FAQPage"/);
  assert.match(p.text, /href="\/empresas"/);
  // El formulario de contacto vive en la página de contacto
  assert.match((await api('/contacto')).text, /id="contactForm"/);
});

test('panel: contraseña incorrecta rechazada', async () => {
  const r = await api('/api/admin/login', { method: 'POST', body: { username: 'admin', password: 'mala' } });
  assert.equal(r.status, 401);
  assert.equal((await api('/api/admin/orders')).status, 401);
});

test('panel: inicio de sesión y lectura de pedidos', async () => {
  const r = await api('/api/admin/login', { method: 'POST', body: { username: 'admin', password: 'prueba-1234' } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ok, true);
  cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  assert.ok(cookie);
  const orders = await api('/api/admin/orders');
  assert.equal(orders.status, 200);
});

test('panel: crear pedido manual, cambiar estado y verlo en el rastreo', async () => {
  const products = (await api('/products.json')).json;
  const p = products.find((x) => x.sizes && x.sizes.some((s) => s.stock > 0)) || products[0];
  const size = (p.sizes.find((s) => s.stock > 0) || p.sizes[0]).size;
  const created = await api('/api/admin/orders', { method: 'POST', body: { customerName: 'Cliente Prueba', customerEmail: 'cliente@ejemplo.com', customerPhone: '8112345678', items: [{ id: p.id, size, quantity: 1 }], paymentMethod: 'transferencia' } });
  assert.equal(created.status, 201, created.text);
  const order = created.json.order || created.json;
  assert.ok(order.id);
  const upd = await api(`/api/admin/orders/${order.id}`, { method: 'PUT', body: { status: 'pagado' } });
  assert.equal(upd.status, 200, upd.text);
  const track = await api('/api/orders/track', { method: 'POST', body: { id: order.id, contact: 'cliente@ejemplo.com' } });
  assert.equal(track.status, 200, track.text);
  assert.equal(track.json.status || track.json.order?.status, 'pagado');
});

test('panel: respaldo automático, lista y descarga', async () => {
  const run = await api('/api/admin/backups/run', { method: 'POST' });
  assert.equal(run.status, 200, run.text);
  assert.ok(run.json.backups.length >= 1);
  const name = run.json.backups[0].name;
  const file = await api(`/api/admin/backups/${name}`);
  assert.equal(file.status, 200);
  assert.equal(file.json.app, 'works-jeans');
  assert.ok(Array.isArray(file.json.orders));
  assert.equal((await api('/api/admin/backups/../../orders.json')).status, 404);
  const status = await api('/api/admin/system-status');
  assert.equal(status.status, 200);
  assert.equal(status.json.data.writable, true);
});

test('panel: textos del inicio editables y etiqueta de envío', async () => {
  const before = await api('/');
  assert.match(before.text, /data-t="heroTitle">Pantalones<br>de trabajo<br>de mezclilla\./);
  assert.doesNotMatch(before.text, /class="promo-bar"[^>]*>[^<]/);
  const put = await api('/api/admin/site-texts', { method: 'PUT', body: { texts: { heroTitle: 'Uniformes\nque aguantan.', promo: 'Envío gratis esta semana <b>x</b>' /* las etiquetas se eliminan */ } } });
  assert.equal(put.status, 200, put.text);
  const after = await api('/');
  assert.match(after.text, /data-t="heroTitle">Uniformes<br>que aguantan\.</);
  assert.match(after.text, /class="promo-bar" data-t="promo">Envío gratis esta semana bx\/b</);
  assert.match(after.text, /data-t="heroLead">Pantalones y camisas/);
  await api('/api/admin/site-texts', { method: 'PUT', body: { texts: {} } });
  assert.match((await api('/')).text, /data-t="heroTitle">Pantalones<br>/);
  const orders = (await api('/api/admin/orders')).json;
  const list = Array.isArray(orders) ? orders : orders.orders;
  const et = await api(`/api/admin/orders/${list[0].id}/etiqueta`);
  assert.equal(et.status, 200, et.text);
  assert.ok(et.json.qr.startsWith('data:image/png'));
  assert.match(et.json.trackUrl, /\/rastrear\?pedido=/);
  assert.equal((await api('/etiqueta.html')).status, 200);
});

test('panel: cerrar sesión', async () => {
  const r = await api('/api/admin/logout', { method: 'POST' });
  assert.ok(r.status === 200 || r.status === 204);
  cookie = '';
  assert.equal((await api('/api/admin/orders')).status, 401);
});
