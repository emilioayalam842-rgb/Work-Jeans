// Pruebas del asistente de WhatsApp: qué entiende, qué contesta y cuándo pasa a una persona.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const montar = require('../whatsapp.js');
const { normalizar, detectar } = montar;

test('normaliza acentos, mayúsculas y signos', () => {
  assert.strictEqual(normalizar('¿CUÁNTO cuesta?'), 'cuanto cuesta');
  assert.strictEqual(normalizar('Envíos  a  México'), 'envios a mexico');
});

test('reconoce las dudas más comunes', () => {
  const casos = [
    ['hola buenas tardes', 'saludo'],
    ['cuanto cuesta el pantalon', 'catalogo'],
    ['que talla me queda si mido 90 de cintura', 'tallas'],
    ['manejan mayoreo para mi empresa', 'mayoreo'],
    ['hacen envios a guadalajara', 'envios'],
    ['necesito factura con mi rfc', 'factura'],
    ['puedo pagar con transferencia', 'pago'],
    ['cual es su direccion y horario', 'tienda'],
    ['tienen ropa reflejante', 'reflejante'],
    ['le pueden poner el logo de mi empresa', 'logo'],
    ['quiero hacer un cambio de talla', 'cambios'],
    ['de que material es la mezclilla', 'material'],
    ['quiero hablar con una persona', 'humano'],
  ];
  for (const [texto, esperado] of casos) {
    const i = detectar(texto);
    assert.ok(i, `sin intención para: ${texto}`);
    assert.strictEqual(i.clave, esperado, `${texto} → ${i.clave}`);
  }
});

test('no inventa intención con texto sin sentido', () => {
  assert.strictEqual(detectar('xkcd zzzz qqq'), null);
});

function montarDePrueba(pedidos = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wj-wa-'));
  const rutas = [];
  const app = { get: (r) => rutas.push(['get', r]), post: (r) => rutas.push(['post', r]) };
  const correos = [];
  const api = montar(app, {
    express: { raw: () => (req, res, next) => next() },
    DATA_DIR: dir,
    writeFileSafe: (f, d) => fs.writeFileSync(f, d),
    getOrders: () => pedidos,
    getSettings: () => ({}),
    logError: () => {},
    logSeguridad: () => {},
    sendEmail: async (m) => { correos.push(m); return true; },
    escapeHtml: (x) => String(x),
  });
  return { api, correos, rutas, dir };
}

test('registra las dos rutas del webhook', () => {
  const { rutas } = montarDePrueba();
  assert.deepStrictEqual(rutas, [['get', '/api/whatsapp/webhook'], ['post', '/api/whatsapp/webhook']]);
});

test('contesta el estado de un pedido cuando le mandan el número', async () => {
  const pedido = {
    id: 'ord_123_abc', status: 'enviado', totalCents: 45000,
    items: [{ quantity: 2 }], customerPhone: '8112345678',
    tracking: { carrier: 'Estafeta', number: 'ABC999' },
  };
  const { api } = montarDePrueba([pedido]);
  const r = await api.responderA('5218112345678', 'hola, mi pedido ord_123_abc que onda');
  assert.match(r.texto, /ord_123_abc/);
  assert.match(r.texto, /enviado/);
  assert.match(r.texto, /Estafeta ABC999/);
});

test('encuentra el pedido por el teléfono de quien escribe', async () => {
  const pedido = { id: 'ord_999', status: 'pagado', totalCents: 20000, items: [{ quantity: 1 }], customerPhone: '81 8765 4321' };
  const { api } = montarDePrueba([pedido]);
  const r = await api.responderA('528187654321', 'mi pedido');
  assert.match(r.texto, /ord_999/);
});

test('avisa que no encontró el pedido en vez de inventarlo', async () => {
  const { api } = montarDePrueba([]);
  const r = await api.responderA('5210000000000', 'mi pedido ord_no_existe');
  assert.match(r.texto, /No encontré/);
});

test('a la segunda vez que no entiende, pasa la charla a una persona y avisa por correo', async () => {
  const { api, correos } = montarDePrueba();
  const primera = await api.responderA('521999', 'zzzz qqqq xxxx');
  assert.ok(primera.botones, 'la primera vez ofrece opciones');
  const segunda = await api.responderA('521999', 'wwww vvvv');
  assert.match(segunda.texto, /una persona/);
  assert.strictEqual(correos.length, 1);
  assert.match(correos[0].subject, /hablar con una persona/);
});

test('mientras espera a una persona, el asistente se calla', async () => {
  const { api } = montarDePrueba();
  await api.responderA('521888', 'quiero hablar con una persona');
  const siguiente = await api.responderA('521888', 'sigo aquí');
  assert.strictEqual(siguiente, null);
});

test('los botones contestan su tema', async () => {
  const { api } = montarDePrueba();
  const r = await api.responderA('521777', 'envios', { esBoton: true });
  assert.match(r.texto, /paquetería/);
});

test('queda apagado si no hay token ni identificador de número', () => {
  const { api } = montarDePrueba();
  assert.strictEqual(api.activo(), false);
});
