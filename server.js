require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Stripe = require('stripe');
const compression = require('compression');

// DATA_DIR: carpeta donde viven los datos que cambian desde el panel (productos, pedidos,
// ajustes, contraseña, fotos subidas). En hosting se apunta a un volumen persistente
// (p. ej. DATA_DIR=/data) para que no se pierdan en cada despliegue. Por defecto es la carpeta del proyecto.
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : __dirname;
const USES_EXTERNAL_DATA = DATA_DIR !== __dirname;

const PRODUCTS_PATH = path.join(DATA_DIR, 'products.json');
const PRODUCTS_IMG_DIR = USES_EXTERNAL_DATA ? path.join(DATA_DIR, 'products-img') : path.join(__dirname, 'assets', 'products');
const ORDERS_PATH = path.join(DATA_DIR, 'orders.json');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');
const ADMIN_AUTH_PATH = path.join(DATA_DIR, 'admin-auth.json');

// Primer arranque con DATA_DIR externo: copiar los datos iniciales del proyecto.
if (USES_EXTERNAL_DATA) {
  fs.mkdirSync(PRODUCTS_IMG_DIR, { recursive: true });
  for (const name of ['products.json', 'settings.json', 'orders.json']) {
    const target = path.join(DATA_DIR, name);
    if (!fs.existsSync(target)) {
      const seed = path.join(__dirname, name);
      fs.writeFileSync(target, fs.existsSync(seed) ? fs.readFileSync(seed) : (name === 'orders.json' ? '[]\n' : '{}\n'));
    }
  }
}

// Si el proyecto trae claves nuevas en settings.json (p. ej. googleMapsUrl), se agregan a los
// ajustes persistidos sin pisar lo que el panel ya haya editado.
if (USES_EXTERNAL_DATA) {
  try {
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'settings.json'), 'utf-8'));
    const current = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    const missing = Object.keys(seed).filter((k) => !(k in current));
    for (const k of missing) current[k] = seed[k];
    // Valores por defecto antiguos que conviene reemplazar por el nuevo (solo si nadie los editó).
    const OLD_DEFAULTS = { hours: 'Abre a las 9:00 a.m.' };
    const migrated = Object.keys(OLD_DEFAULTS).filter((k) => current[k] === OLD_DEFAULTS[k] && seed[k] && seed[k] !== current[k]);
    for (const k of migrated) current[k] = seed[k];
    if (missing.length || migrated.length) {
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(current, null, 2) + '\n');
      console.log(`Ajustes actualizados: ${[...missing, ...migrated].join(', ')}`);
    }
  } catch {
    // Si algo falla, el sitio sigue con los ajustes que ya tenía.
  }
}

const LOW_STOCK_THRESHOLD = 5;

function getProducts() {
  return JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf-8'));
}

function saveProducts(products) {
  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2) + '\n');
}

function getOrders() {
  return JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf-8'));
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2) + '\n');
}

function getSettings() {
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
}

function makeOrderId() {
  return `ord_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// --- Admin auth storage (password hash persisted on disk so it can change at runtime) ---

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function initAdminAuth() {
  if (fs.existsSync(ADMIN_AUTH_PATH)) return;
  if (!process.env.ADMIN_PASSWORD) return;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(process.env.ADMIN_PASSWORD, salt);
  fs.writeFileSync(ADMIN_AUTH_PATH, JSON.stringify({ salt, hash }, null, 2) + '\n');
}

function getAdminAuth() {
  if (!fs.existsSync(ADMIN_AUTH_PATH)) return null;
  return JSON.parse(fs.readFileSync(ADMIN_AUTH_PATH, 'utf-8'));
}

function verifyAdminPassword(password) {
  const auth = getAdminAuth();
  if (!auth) return false;
  const provided = Buffer.from(hashPassword(String(password || ''), auth.salt), 'hex');
  const expected = Buffer.from(auth.hash, 'hex');
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

function setAdminPassword(newPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(newPassword, salt);
  fs.writeFileSync(ADMIN_AUTH_PATH, JSON.stringify({ salt, hash }, null, 2) + '\n');
}

initAdminAuth();

// --- Stock helpers ---

function decrementStock(products, items, { strict }) {
  for (const item of items) {
    const product = products.find((p) => p.id === item.id);
    if (!product || !item.size) continue;
    const sizeEntry = product.sizes.find((s) => s.size === item.size);
    if (!sizeEntry) continue;

    if (strict && sizeEntry.stock < item.quantity) {
      throw new Error(`Sin stock suficiente de ${product.name} talla ${item.size} (disponible: ${sizeEntry.stock}).`);
    }
    sizeEntry.stock = Math.max(0, sizeEntry.stock - item.quantity);
  }
  return products;
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Dominio canónico: en producción redirige workjeans.mx -> www.workjeans.mx y http -> https.
// Se activa solo si CANONICAL_HOST está definido (p. ej. www.workjeans.mx); en local no hace nada.
const CANONICAL_HOST = process.env.CANONICAL_HOST || '';
app.use((req, res, next) => {
  if (!CANONICAL_HOST) return next();
  const host = req.headers.host || '';
  const isHttps = req.protocol === 'https';
  if (host === CANONICAL_HOST && isHttps) return next();
  // Los dominios internos del hosting (p. ej. *.up.railway.app) se dejan pasar para poder probar.
  const apex = CANONICAL_HOST.replace(/^www\./, '');
  if (host !== CANONICAL_HOST && host !== apex && !host.endsWith(`.${apex}`)) return next();
  res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
});

app.use(compression());
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.protocol === 'https') res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// --- Webhook de Stripe: registra el pedido aunque el cliente cierre el navegador antes de volver.
// Va antes de express.json() porque Stripe necesita el cuerpo sin procesar para verificar la firma.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).send('Webhook no configurado.');
    return;
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    res.status(400).send(`Firma inválida: ${err.message}`);
    return;
  }
  if (event.type === 'checkout.session.completed') {
    try {
      const session = await stripe.checkout.sessions.retrieve(event.data.object.id, { expand: ['line_items'] });
      if (session.payment_status === 'paid') recordStripeOrder(session);
    } catch (err) {
      console.error('Webhook: no se pudo registrar el pedido:', err.message);
    }
  }
  res.json({ received: true });
});

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'works-jeans-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
}));
// Archivos que nunca deben servirse públicamente.
const PRIVATE_FILES = new Set([
  '/orders.json', '/admin-auth.json', '/server.js', '/package.json', '/package-lock.json',
  '/.env', '/.env.example', '/.gitignore', '/npm install',
]);
app.use((req, res, next) => {
  const p = decodeURIComponent(req.path);
  if (PRIVATE_FILES.has(p) || p.startsWith('/node_modules') || p.startsWith('/.git') || p.startsWith('/.claude')) {
    res.status(404).send('Not found');
    return;
  }
  next();
});

// Si el navegador acepta WebP y existe una versión .webp junto a la imagen, se sirve esa.
app.use((req, res, next) => {
  if (req.method !== 'GET' || !/\.(jpe?g|png)$/i.test(req.path)) return next();
  if (!(req.headers.accept || '').includes('image/webp')) return next();
  const rel = path.normalize(decodeURIComponent(req.path)).replace(/^(\.\.[/\\])+/, '');
  const webpPath = path.join(__dirname, rel.replace(/\.(jpe?g|png)$/i, '.webp'));
  if (!webpPath.startsWith(__dirname) || !fs.existsSync(webpPath)) return next();
  res.type('image/webp');
  res.set('Vary', 'Accept');
  res.set('Cache-Control', 'public, max-age=2592000');
  res.sendFile(webpPath);
});

// products.json y settings.json se sirven desde DATA_DIR (el panel los edita ahí).
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// /producto/<id>: la misma portada, pero con título, descripción e imagen del producto para
// compartir por WhatsApp y para Google. Al cargar, se abre la ficha del producto.
app.get('/producto/:id', (req, res) => {
  const product = getProducts().find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).send('Producto no encontrado');
    return;
  }
  const origin = CANONICAL_HOST ? `https://${CANONICAL_HOST}` : `${req.protocol}://${req.get('host')}`;
  const url = `${origin}/producto/${product.id}`;
  const title = `${product.name} | Works Jeans`;
  const desc = `${product.description} Precio: ${(product.priceCents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} MXN. Tallas ${product.sizes[0]?.size} a ${product.sizes[product.sizes.length - 1]?.size}.`;
  const image = `${origin}/${product.image}`;
  let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
  html = html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(desc)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(desc)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${image}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeHtml(title)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeHtml(product.description)}">`)
    .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${image}">`)
    .replace('</head>', `  <script>window.__openProduct = ${JSON.stringify(product.id)};</script>\n</head>`);
  // Los recursos relativos deben resolverse desde la raíz aunque la URL tenga /producto/.
  html = html.replace('<head>', '<head>\n  <base href="/">');
  res.set('Cache-Control', 'no-cache');
  res.send(html);
});

app.get('/sitemap.xml', (req, res) => {
  const origin = CANONICAL_HOST ? `https://${CANONICAL_HOST}` : `${req.protocol}://${req.get('host')}`;
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${origin}/`, priority: '1.0' },
    ...getProducts().map((p) => ({ loc: `${origin}/producto/${p.id}`, priority: '0.8' })),
    { loc: `${origin}/aviso-de-privacidad.html`, priority: '0.3' },
    { loc: `${origin}/envios-y-devoluciones.html`, priority: '0.3' },
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`;
  res.type('application/xml').send(xml);
});

app.get(['/products.json', '/settings.json'], (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(req.path === '/products.json' ? PRODUCTS_PATH : SETTINGS_PATH);
});
if (USES_EXTERNAL_DATA) {
  app.use('/assets/products', express.static(PRODUCTS_IMG_DIR, { maxAge: '30d' }));
}
app.use('/assets', express.static(path.join(__dirname, 'assets'), { maxAge: '30d', dotfiles: 'deny' }));
app.use(express.static(__dirname, { dotfiles: 'deny', extensions: ['html'] }));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PRODUCTS_IMG_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP.'));
      return;
    }
    cb(null, true);
  },
});

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    res.status(401).json({ error: 'No autorizado.' });
    return;
  }
  next();
}

// --- Auth ---

// Máximo 5 intentos fallidos por IP cada 15 minutos.
const loginAttempts = new Map();
function loginBlocked(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.first > 15 * 60 * 1000) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= 5;
}
function noteFailedLogin(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry || Date.now() - entry.first > 15 * 60 * 1000) loginAttempts.set(ip, { first: Date.now(), count: 1 });
  else entry.count += 1;
}

app.post('/api/admin/login', (req, res) => {
  if (loginBlocked(req.ip)) {
    res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.' });
    return;
  }
  if (!getAdminAuth()) {
    res.status(503).json({ error: 'El panel admin no está configurado (falta ADMIN_PASSWORD en .env la primera vez).' });
    return;
  }

  if (!verifyAdminPassword(req.body.password)) {
    noteFailedLogin(req.ip);
    res.status(401).json({ error: 'Contraseña incorrecta.' });
    return;
  }

  loginAttempts.delete(req.ip);
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/session', (req, res) => {
  res.json({ isAdmin: Boolean(req.session.isAdmin) });
});

app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!verifyAdminPassword(currentPassword)) {
    res.status(401).json({ error: 'La contraseña actual no es correcta.' });
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    return;
  }
  setAdminPassword(newPassword);
  res.json({ ok: true });
});

// --- Settings ---

app.get('/api/settings', (req, res) => {
  res.json(getSettings());
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const current = getSettings();
  const updated = { ...current, ...req.body };
  saveSettings(updated);
  res.json(updated);
});

// --- Product management (protected) ---

app.get('/api/admin/products', requireAdmin, (req, res) => {
  res.json(getProducts());
});

app.post('/api/admin/products', requireAdmin, upload.single('image'), (req, res) => {
  try {
    const { name, category, priceMxn, description, sizes } = req.body;
    if (!name || !category || !priceMxn || !description || !sizes) {
      res.status(400).json({ error: 'Faltan campos requeridos.' });
      return;
    }

    const products = getProducts();
    let id = slugify(name);
    let suffix = 2;
    while (products.some((p) => p.id === id)) {
      id = `${slugify(name)}-${suffix++}`;
    }

    const imagePath = req.file ? `assets/products/${req.file.filename}` : 'assets/img/works-jeans-logo.png';
    const product = {
      id,
      name,
      category,
      priceCents: Math.round(parseFloat(priceMxn) * 100),
      image: imagePath,
      images: [imagePath],
      description,
      sizes: JSON.parse(sizes),
    };

    products.push(product);
    saveProducts(products);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', requireAdmin, upload.single('image'), (req, res) => {
  try {
    const products = getProducts();
    const product = products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado.' });
      return;
    }

    const { name, category, priceMxn, description, sizes } = req.body;
    if (name) product.name = name;
    if (category) product.category = category;
    if (priceMxn) product.priceCents = Math.round(parseFloat(priceMxn) * 100);
    if (description) product.description = description;
    if (sizes) product.sizes = JSON.parse(sizes);
    if (req.file) {
      const imagePath = `assets/products/${req.file.filename}`;
      product.image = imagePath;
      product.images = [imagePath];
    }

    saveProducts(products);
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const products = getProducts();
  const filtered = products.filter((p) => p.id !== req.params.id);
  if (filtered.length === products.length) {
    res.status(404).json({ error: 'Producto no encontrado.' });
    return;
  }
  saveProducts(filtered);
  res.json({ ok: true });
});

// --- Order management (protected) ---

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const orders = getOrders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(orders);
});

app.post('/api/admin/orders', requireAdmin, (req, res) => {
  try {
    const { customerName, customerPhone, notes, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Agrega al menos un producto al pedido.' });
      return;
    }

    const products = getProducts();
    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.id);
      if (!product) {
        throw new Error(`Producto inválido: ${item.id}`);
      }
      const quantity = Math.max(1, Math.min(50, parseInt(item.quantity, 10) || 1));
      return {
        id: product.id,
        name: product.name,
        size: item.size || null,
        quantity,
        priceCents: product.priceCents,
      };
    });

    decrementStock(products, orderItems, { strict: true });
    saveProducts(products);

    const totalCents = orderItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

    const order = {
      id: makeOrderId(),
      source: 'whatsapp',
      status: 'pendiente',
      createdAt: new Date().toISOString(),
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      notes: notes || '',
      items: orderItems,
      totalCents,
    };

    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const orders = getOrders();
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado.' });
    return;
  }
  if (req.body.status) order.status = req.body.status;
  if (req.body.notes !== undefined) order.notes = req.body.notes;
  saveOrders(orders);
  res.json(order);
});

app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const orders = getOrders();
  const filtered = orders.filter((o) => o.id !== req.params.id);
  if (filtered.length === orders.length) {
    res.status(404).json({ error: 'Pedido no encontrado.' });
    return;
  }
  saveOrders(filtered);
  res.json({ ok: true });
});

// --- Aviso por correo de pedidos nuevos (Resend). Solo si hay RESEND_API_KEY y NOTIFY_EMAIL. ---

function formatMxn(cents) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

async function notifyNewOrder(order) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!apiKey || !to) return;
  const from = process.env.NOTIFY_FROM || 'Works Jeans <onboarding@resend.dev>';
  const rows = order.items.map((i) => `<tr><td>${i.name}</td><td>${i.size || '—'}</td><td>${i.quantity}</td><td>${formatMxn(i.priceCents * i.quantity)}</td></tr>`).join('');
  const ship = order.shipping ? `<p><b>Envío:</b> ${[order.shipping.name, order.shipping.line1, order.shipping.line2, order.shipping.city, order.shipping.state, order.shipping.postalCode].filter(Boolean).join(', ')}</p>` : '';
  const html = `
    <h2>Nuevo pedido ${order.id}</h2>
    <p><b>Origen:</b> ${order.source === 'stripe' ? 'Pago con tarjeta' : 'WhatsApp'}<br>
    <b>Cliente:</b> ${order.customerName || 'Sin nombre'}${order.customerPhone ? ` · ${order.customerPhone}` : ''}${order.customerEmail ? ` · ${order.customerEmail}` : ''}</p>
    ${ship}
    <table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Producto</th><th>Talla</th><th>Cant.</th><th>Subtotal</th></tr>${rows}</table>
    <p><b>Total:</b> ${formatMxn(order.totalCents)}</p>
    <p>Revísalo en el panel: https://www.workjeans.mx/workmapadmin.html</p>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `Nuevo pedido ${order.id} · ${formatMxn(order.totalCents)}`, html }),
    });
    if (!r.ok) console.error('Aviso de pedido no enviado:', r.status, await r.text());
  } catch (err) {
    console.error('Aviso de pedido no enviado:', err.message);
  }
}

// Crea (si no existe) el pedido a partir de una sesión de Stripe pagada. Devuelve el pedido.
function recordStripeOrder(session) {
  const orders = getOrders();
  let order = orders.find((o) => o.stripeSessionId === session.id);
  if (order) return order;

  let cartMeta = [];
  try {
    cartMeta = JSON.parse(session.metadata?.cart || '[]');
  } catch {
    cartMeta = [];
  }

  const addr = session.shipping_details?.address || session.customer_details?.address || null;
  order = {
    id: makeOrderId(),
    source: 'stripe',
    status: 'pagado',
    createdAt: new Date().toISOString(),
    customerName: session.shipping_details?.name || session.customer_details?.name || '',
    customerPhone: session.customer_details?.phone || '',
    customerEmail: session.customer_details?.email || '',
    shipping: addr ? {
      name: session.shipping_details?.name || '',
      line1: addr.line1 || '',
      line2: addr.line2 || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postal_code || '',
      country: addr.country || '',
    } : null,
    notes: '',
    stripeSessionId: session.id,
    items: session.line_items.data.map((li, i) => ({
      id: cartMeta[i]?.id || null,
      name: li.description,
      size: cartMeta[i]?.size || null,
      quantity: li.quantity,
      priceCents: li.amount_total / li.quantity,
    })),
    totalCents: session.amount_total,
  };
  orders.push(order);
  saveOrders(orders);

  if (cartMeta.length > 0) {
    try {
      const products = getProducts();
      decrementStock(products, order.items, { strict: false });
      saveProducts(products);
    } catch {
      // Never block order confirmation on stock bookkeeping issues.
    }
  }
  notifyNewOrder(order);
  return order;
}

function publicOrigin(req) {
  return CANONICAL_HOST ? `https://${CANONICAL_HOST}` : `${req.protocol}://${req.get('host')}`;
}

// --- Storefront ---

app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) {
    res.status(503).json({ error: 'Pagos en línea no configurados todavía. Usa el pedido por WhatsApp.' });
    return;
  }

  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'El carrito está vacío.' });
    return;
  }

  try {
    const products = getProducts();
    const line_items = items.map((item) => {
      const product = products.find((p) => p.id === item.id);
      if (!product) {
        throw new Error(`Producto inválido: ${item.id}`);
      }
      const quantity = Math.max(1, Math.min(20, parseInt(item.quantity, 10) || 1));
      const name = item.size ? `${product.name} (Talla ${item.size})` : product.name;
      return {
        quantity,
        price_data: {
          currency: 'mxn',
          unit_amount: product.priceCents,
          product_data: { name },
        },
      };
    });

    const cartMeta = items.map((item) => ({ id: item.id, size: item.size, quantity: item.quantity }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      metadata: { cart: JSON.stringify(cartMeta) },
      shipping_address_collection: { allowed_countries: ['MX'] },
      phone_number_collection: { enabled: true },
      locale: 'es',
      success_url: `${publicOrigin(req)}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${publicOrigin(req)}/cancel.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/verify-session', async (req, res) => {
  if (!stripe) {
    res.status(503).json({ error: 'Pagos en línea no configurados.' });
    return;
  }

  const { session_id } = req.query;
  if (!session_id) {
    res.status(400).json({ error: 'Falta session_id.' });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['line_items'] });

    if (session.payment_status !== 'paid') {
      res.status(400).json({ error: 'El pago no se ha completado.' });
      return;
    }

    const order = recordStripeOrder(session);
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  const products = getProducts();
  const lowStock = [];
  products.forEach((p) => {
    p.sizes.forEach((s) => {
      if (s.stock <= LOW_STOCK_THRESHOLD) {
        lowStock.push({ productId: p.id, productName: p.name, size: s.size, stock: s.stock });
      }
    });
  });
  res.json({ lowStockThreshold: LOW_STOCK_THRESHOLD, lowStock });
});

app.listen(PORT, () => {
  console.log(`Works Jeans corriendo en http://localhost:${PORT}`);
  if (!stripe) {
    console.log('Aviso: STRIPE_SECRET_KEY no está configurada, el pago con tarjeta estará deshabilitado.');
  }
  if (!getAdminAuth()) {
    console.log('Aviso: ADMIN_PASSWORD no está configurada, el panel /admin estará deshabilitado.');
  }
});
