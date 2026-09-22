// Asistente de WhatsApp: contesta las dudas frecuentes, consulta el estado de un pedido y
// pasa la conversación a una persona cuando hace falta.
//
// Necesita cuatro variables en el servidor: WHATSAPP_TOKEN (token permanente de la app de Meta),
// WHATSAPP_PHONE_ID (identificador del número), WHATSAPP_VERIFY_TOKEN (una palabra que tú
// inventas y también escribes en Meta al dar de alta el webhook) y WHATSAPP_APP_SECRET (para
// comprobar que cada aviso viene de verdad de Meta). Sin ellas el módulo queda apagado y el
// sitio funciona igual que siempre.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const API = 'https://graph.facebook.com/v21.0';
const HORAS_SILENCIO = 6;          // cuánto calla el bot tras pasar la charla a una persona
const MAX_MENSAJES = 300;          // cuántos se guardan para verlos en el panel

const CONFIG = () => ({
  token: process.env.WHATSAPP_TOKEN || '',
  phoneId: process.env.WHATSAPP_PHONE_ID || '',
  verify: process.env.WHATSAPP_VERIFY_TOKEN || '',
  secret: process.env.WHATSAPP_APP_SECRET || '',
  plantillaEnviado: process.env.WHATSAPP_TEMPLATE_ENVIADO || '',
});
const activo = () => Boolean(CONFIG().token && CONFIG().phoneId);

// --- Texto ------------------------------------------------------------------
function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Cada intención tiene palabras que la delatan. Gana la que más coincidencias junta y, si hay
// empate, la que aparece antes: por eso van primero las concretas (logo, reflejante, factura) y
// al final las generales (mayoreo, catálogo, saludo).
const INTENCIONES = [
  {
    clave: 'humano',
    palabras: ['humano', 'persona', 'asesor', 'alguien', 'vendedor', 'hablar con', 'atencion', 'ayuda de verdad'],
    respuesta: () => ({ texto: 'Claro, le paso tu mensaje a una persona del equipo. Te responden en horario de tienda, de lunes a viernes de 9:00 a. m. a 6:00 p. m.' }),
  },
  {
    clave: 'rastreo',
    palabras: ['rastrear', 'rastreo', 'guia', 'mi pedido', 'donde va', 'ya salio', 'estado de mi pedido', 'pedido'],
    respuesta: () => ({ texto: 'Con gusto. Mándame tu número de pedido, el que empieza con ord_, o dime "mi pedido" y lo busco con este mismo teléfono.' }),
  },
  {
    clave: 'logo',
    palabras: ['logo', 'logotipo', 'bordado', 'bordar', 'dtf', 'estampado', 'personalizar', 'personalizado', 'nombre'],
    respuesta: () => ({ texto: 'Sí personalizamos con bordado o DTF: logotipo, nombres o áreas.\n\nMándanos tu logotipo y la cantidad por talla y te cotizamos:\nhttps://www.workjeans.mx/empresas' }),
  },
  {
    clave: 'reflejante',
    palabras: ['reflejante', 'reflectante', 'reflejantes', 'seguridad', 'visibilidad', 'noche'],
    respuesta: () => ({ texto: 'Sí, manejamos pantalones y camisas con cinta reflejante para trabajo nocturno o de patio.\n\nVerlos: https://www.workjeans.mx/ropa-de-trabajo-reflejante' }),
  },
  {
    clave: 'factura',
    palabras: ['factura', 'facturar', 'cfdi', 'rfc', 'fiscal'],
    respuesta: () => ({ texto: 'Sí facturamos. Marca "Necesito factura" en el carrito y captura RFC, razón social, código postal fiscal, régimen y uso de CFDI. Te la enviamos al correo que indiques.\n\nSi ya compraste y no la pediste, mándame tu número de pedido y lo revisamos.' }),
  },
  {
    clave: 'cambios',
    palabras: ['cambio', 'cambiar', 'devolucion', 'devolver', 'garantia', 'no me quedo', 'equivocado'],
    respuesta: () => ({ texto: 'Tienes 15 días para cambio de talla, con la prenda sin uso y con etiquetas.\n\nCondiciones completas: https://www.workjeans.mx/envios-y-devoluciones\n\nMándame tu número de pedido y lo empezamos.' }),
  },
  {
    clave: 'tallas',
    palabras: ['talla', 'tallas', 'medida', 'medidas', 'que talla', 'me queda', 'cintura', 'grande', 'chica'],
    respuesta: () => ({ texto: 'Los pantalones van de la talla 28 a la 50 y las camisas de XCH a 5XG.\n\nAquí está la tabla de medidas en pulgadas, con cómo medirte:\nhttps://www.workjeans.mx/guia-de-tallas\n\nSi me dices tu cintura o tu estatura te sugiero una talla.' }),
  },
  {
    clave: 'material',
    palabras: ['material', 'tela', 'algodon', 'mezclilla', 'encoge', 'lavar', 'onzas', 'resistente'],
    respuesta: () => ({ texto: 'Las prendas son de mezclilla 100% algodón, pensadas para obra, planta y taller.\n\nLava con agua fría y del revés para cuidar el color. Puede encoger ligeramente en el primer lavado, como toda la mezclilla de algodón.' }),
  },
  {
    clave: 'envios',
    palabras: ['envio', 'envios', 'mandan', 'paqueteria', 'llega', 'tarda', 'entrega', 'domicilio', 'costo de envio', 'gratis'],
    respuesta: () => ({ texto: 'Enviamos a todo México por paquetería con número de guía. El costo se calcula al escribir tu código postal en el carrito.\n\nTambién puedes recoger sin costo en la tienda de Monterrey.\n\nDetalles: https://www.workjeans.mx/envios-y-devoluciones' }),
  },
  {
    clave: 'pago',
    palabras: ['pago', 'pagar', 'tarjeta', 'transferencia', 'spei', 'oxxo', 'deposito', 'formas de pago', 'meses'],
    respuesta: () => ({ texto: 'Puedes pagar con tarjeta de crédito o débito, transferencia SPEI o en tienda de conveniencia, todo desde la página, y el pedido se confirma solo.\n\nTambién aceptamos transferencia directa a nuestra cuenta de Banca Afirme; en ese caso mándanos el comprobante por aquí.' }),
  },
  {
    clave: 'tienda',
    palabras: ['direccion', 'donde estan', 'ubicacion', 'horario', 'sucursal', 'visitar', 'local', 'tienda', 'abren'],
    respuesta: () => ({ texto: 'Estamos en Calle Emiliano Zapata 3737, Col. Venustiano Carranza, C.P. 64560, Monterrey, Nuevo León.\n\nHorario: lunes a viernes de 9:00 a. m. a 6:00 p. m.\n\nCómo llegar: https://www.workjeans.mx/contacto' }),
  },
  {
    clave: 'mayoreo',
    palabras: ['mayoreo', 'volumen', 'docena', 'empresa', 'empresas', 'uniforme', 'uniformes', 'cotizacion', 'cotizar', 'distribuidor', 'cuadrilla', 'piezas'],
    respuesta: () => ({ texto: 'Sí manejamos mayoreo y corridas de tallas para empresas, con precio de distribuidor por volumen y factura.\n\nArma tu pedido por talla en el cotizador y te respondemos con precio el mismo día hábil:\nhttps://www.workjeans.mx/empresas' }),
  },
  {
    clave: 'catalogo',
    palabras: ['catalogo', 'precio', 'precios', 'cuanto cuesta', 'cuesta', 'vale', 'modelos', 'que venden', 'productos', 'pantalon', 'camisa', 'comprar'],
    respuesta: () => ({ texto: 'Puedes ver todos los modelos con precios y tallas aquí:\nhttps://www.workjeans.mx/\n\nPantalones: https://www.workjeans.mx/pantalones-de-trabajo\nCamisas: https://www.workjeans.mx/camisas-de-trabajo\n\nLos precios son de cliente final, en pesos y con IVA incluido.' }),
  },
  {
    clave: 'saludo',
    palabras: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'que tal', 'informacion', 'info'],
    respuesta: () => ({
      texto: 'Hola, soy el asistente de Works Jeans. Te puedo ayudar con tallas, precios, envíos, mayoreo o el estado de tu pedido. ¿Qué necesitas?',
      botones: [['catalogo', 'Ver catálogo'], ['rastreo', 'Mi pedido'], ['humano', 'Hablar con alguien']],
    }),
  },
];

function detectar(texto) {
  const t = normalizar(texto);
  if (!t) return null;
  let mejor = null;
  for (const intencion of INTENCIONES) {
    let puntos = 0;
    for (const palabra of intencion.palabras) {
      if (t === palabra) puntos += 3;
      else if (t.includes(palabra)) puntos += palabra.includes(' ') ? 2 : 1;
    }
    if (puntos && (!mejor || puntos > mejor.puntos)) mejor = { intencion, puntos };
  }
  return mejor ? mejor.intencion : null;
}

const RE_PEDIDO = /\b(ord_[a-z0-9_]+)\b/i;

// --- Memoria de las conversaciones -----------------------------------------
function crearAlmacen(DATA_DIR, writeFileSafe) {
  const RUTA = path.join(DATA_DIR, 'whatsapp.json');
  const leer = () => {
    try { return JSON.parse(fs.readFileSync(RUTA, 'utf-8')); } catch { return { charlas: {}, mensajes: [] }; }
  };
  const guardar = (datos) => {
    datos.mensajes = datos.mensajes.slice(-MAX_MENSAJES);
    try { writeFileSafe(RUTA, JSON.stringify(datos, null, 2) + '\n'); } catch { /* sin disco */ }
  };
  return { leer, guardar, RUTA };
}

// --- Envío ------------------------------------------------------------------
async function enviar(payload) {
  const cfg = CONFIG();
  if (!activo()) return { ok: false, motivo: 'sin configurar' };
  const r = await fetch(`${API}/${cfg.phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, data };
}

const enviarTexto = (para, texto) => enviar({ to: para, type: 'text', text: { preview_url: true, body: texto.slice(0, 4000) } });

function enviarBotones(para, texto, botones) {
  return enviar({
    to: para,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: texto.slice(0, 1000) },
      action: { buttons: botones.slice(0, 3).map(([id, titulo]) => ({ type: 'reply', reply: { id, title: titulo.slice(0, 20) } })) },
    },
  });
}

// --- Firma ------------------------------------------------------------------
function firmaValida(req) {
  const secreto = CONFIG().secret;
  if (!secreto) return true; // sin secreto configurado no se puede comprobar
  const firma = String(req.get('x-hub-signature-256') || '');
  const esperada = 'sha256=' + crypto.createHmac('sha256', secreto).update(req.body).digest('hex');
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = function montarWhatsapp(app, deps) {
  const { express, DATA_DIR, writeFileSafe, getOrders, getSettings, logError, logSeguridad, sendEmail, escapeHtml } = deps;
  const almacen = crearAlmacen(DATA_DIR, writeFileSafe);

  const botEncendido = () => {
    try { return getSettings().whatsappBot !== false; } catch { return true; }
  };

  function buscarPedido(texto, telefono) {
    let pedidos = [];
    try { pedidos = getOrders(); } catch { return null; }
    const id = (String(texto).match(RE_PEDIDO) || [])[1];
    if (id) return pedidos.find((o) => o.id.toLowerCase() === id.toLowerCase()) || null;
    const diez = String(telefono || '').replace(/\D/g, '').slice(-10);
    if (diez.length < 10) return null;
    const mios = pedidos.filter((o) => String(o.customerPhone || '').replace(/\D/g, '').slice(-10) === diez);
    return mios.length ? mios[mios.length - 1] : null;
  }

  const ESTADOS = {
    pendiente: 'pendiente de pago',
    pagado: 'pagado, preparándose',
    preparacion: 'en preparación',
    enviado: 'enviado',
    entregado: 'entregado',
    cancelado: 'cancelado',
    devuelto: 'devuelto',
  };

  function textoDePedido(pedido) {
    const piezas = (pedido.items || []).reduce((n, i) => n + i.quantity, 0);
    const lineas = [
      `Pedido ${pedido.id}`,
      `Estado: ${ESTADOS[pedido.status] || pedido.status}`,
      `${piezas} ${piezas === 1 ? 'pieza' : 'piezas'} · total $${(pedido.totalCents / 100).toFixed(2)}`,
    ];
    if (pedido.tracking?.number) lineas.push(`Guía: ${pedido.tracking.carrier || 'paquetería'} ${pedido.tracking.number}`);
    if (pedido.tracking?.url) lineas.push(pedido.tracking.url);
    lineas.push(`Seguimiento: https://www.workjeans.mx/rastrear?pedido=${encodeURIComponent(pedido.id)}`);
    return lineas.join('\n');
  }

  async function pasarAPersona(de, texto) {
    const datos = almacen.leer();
    datos.charlas[de] = { ...(datos.charlas[de] || {}), estado: 'humano', hasta: Date.now() + HORAS_SILENCIO * 3600 * 1000 };
    almacen.guardar(datos);
    try {
      await sendEmail({
        subject: `WhatsApp: ${de} pidió hablar con una persona`,
        html: `<p>El número <b>${escapeHtml(de)}</b> pidió atención humana por WhatsApp.</p><p>Último mensaje: “${escapeHtml(String(texto).slice(0, 300))}”</p><p>El asistente no le va a contestar durante las próximas ${HORAS_SILENCIO} horas.</p>`,
      });
    } catch (err) { logError('whatsapp.aviso', err); }
  }

  function anotar(de, texto, intencion, respondido) {
    const datos = almacen.leer();
    datos.mensajes.push({ at: new Date().toISOString(), de, texto: String(texto).slice(0, 300), intencion, respondido });
    datos.charlas[de] = { ...(datos.charlas[de] || {}), ultimo: new Date().toISOString() };
    almacen.guardar(datos);
  }

  // Decide qué contestar. Se exporta para poder probarlo sin llamar a Meta.
  async function responderA(de, texto, { esBoton = false } = {}) {
    const datos = almacen.leer();
    const charla = datos.charlas[de] || {};
    if (charla.estado === 'humano' && charla.hasta > Date.now() && !esBoton) {
      anotar(de, texto, 'en espera de persona', false);
      return null;
    }

    if (esBoton && texto === 'humano') { await pasarAPersona(de, 'botón'); const r = INTENCIONES.find((i) => i.clave === 'humano').respuesta(); anotar(de, texto, 'humano', true); return r; }
    if (esBoton) {
      const i = INTENCIONES.find((x) => x.clave === texto);
      if (i) { const r = i.respuesta(); anotar(de, texto, i.clave, true); return r; }
    }

    // ¿Trae un número de pedido o pide el suyo?
    const pidePedido = RE_PEDIDO.test(texto) || /\bmi pedido\b/i.test(normalizar(texto));
    if (pidePedido) {
      const pedido = buscarPedido(texto, de);
      anotar(de, texto, 'rastreo', true);
      return pedido
        ? { texto: textoDePedido(pedido) }
        : { texto: 'No encontré un pedido con ese dato. Mándame el número que empieza con ord_ o el correo con el que compraste y lo busco.' };
    }

    const intencion = detectar(texto);
    if (!intencion) {
      const fallos = (charla.fallos || 0) + 1;
      datos.charlas[de] = { ...charla, fallos };
      almacen.guardar(datos);
      if (fallos >= 2) {
        await pasarAPersona(de, texto);
        anotar(de, texto, 'sin entender · pasa a persona', true);
        return { texto: 'Eso mejor te lo contesta una persona del equipo. Ya les avisé y te responden en horario de tienda, de lunes a viernes de 9:00 a. m. a 6:00 p. m.' };
      }
      anotar(de, texto, 'sin entender', true);
      return {
        texto: 'No estoy seguro de haber entendido. Te puedo ayudar con esto:',
        botones: [['catalogo', 'Catálogo y precios'], ['envios', 'Envíos'], ['humano', 'Hablar con alguien']],
      };
    }

    datos.charlas[de] = { ...charla, fallos: 0 };
    almacen.guardar(datos);
    if (intencion.clave === 'humano') await pasarAPersona(de, texto);
    anotar(de, texto, intencion.clave, true);
    return intencion.respuesta();
  }

  async function contestar(de, respuesta) {
    if (!respuesta) return;
    if (respuesta.botones) await enviarBotones(de, respuesta.texto, respuesta.botones);
    else await enviarTexto(de, respuesta.texto);
  }

  // --- Webhook --------------------------------------------------------------
  app.get('/api/whatsapp/webhook', (req, res) => {
    const cfg = CONFIG();
    const modo = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    if (modo === 'subscribe' && cfg.verify && token === cfg.verify) {
      res.type('text/plain').send(String(req.query['hub.challenge'] || ''));
      return;
    }
    logSeguridad('whatsapp.webhook', 'Verificación rechazada: el token no coincide.');
    res.sendStatus(403);
  });

  app.post('/api/whatsapp/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    if (!firmaValida(req)) {
      logSeguridad('whatsapp.webhook', 'Aviso rechazado: la firma no coincide con el secreto de la app.');
      res.sendStatus(401);
      return;
    }
    res.sendStatus(200); // Meta reintenta si tardamos; el trabajo sigue abajo.

    let cuerpo = {};
    try { cuerpo = JSON.parse(req.body.toString('utf-8') || '{}'); } catch { return; }
    if (!botEncendido()) return;

    try {
      for (const entrada of cuerpo.entry || []) {
        for (const cambio of entrada.changes || []) {
          for (const mensaje of cambio.value?.messages || []) {
            const de = mensaje.from;
            if (mensaje.type === 'text') {
              const respuesta = await responderA(de, mensaje.text?.body || '');
              await contestar(de, respuesta);
            } else if (mensaje.type === 'interactive') {
              const id = mensaje.interactive?.button_reply?.id || mensaje.interactive?.list_reply?.id || '';
              const respuesta = await responderA(de, id, { esBoton: true });
              await contestar(de, respuesta);
            } else {
              anotar(de, `[${mensaje.type}]`, 'archivo', true);
              await enviarTexto(de, 'Recibí tu archivo. Si es un comprobante de pago, mándame también tu número de pedido para asociarlo.');
            }
          }
        }
      }
    } catch (err) {
      logError('whatsapp.webhook', err);
    }
  });

  // Aviso de envío al cliente. Meta solo deja iniciar la charla con una plantilla aprobada.
  async function avisarEnvio(pedido) {
    const cfg = CONFIG();
    if (!activo() || !cfg.plantillaEnviado || !botEncendido()) return false;
    const telefono = String(pedido.customerPhone || '').replace(/\D/g, '');
    if (telefono.length < 10) return false;
    const para = telefono.length === 10 ? `52${telefono}` : telefono;
    try {
      const r = await enviar({
        to: para,
        type: 'template',
        template: {
          name: cfg.plantillaEnviado,
          language: { code: 'es_MX' },
          components: [{ type: 'body', parameters: [
            { type: 'text', text: pedido.id },
            { type: 'text', text: pedido.tracking?.carrier || 'paquetería' },
            { type: 'text', text: pedido.tracking?.number || 'sin guía' },
          ] }],
        },
      });
      return r.ok;
    } catch (err) { logError('whatsapp.envio', err); return false; }
  }

  return { responderA, detectar, normalizar, almacen, activo, avisarEnvio, INTENCIONES };
};

module.exports.normalizar = normalizar;
module.exports.detectar = detectar;
module.exports.INTENCIONES = INTENCIONES;
