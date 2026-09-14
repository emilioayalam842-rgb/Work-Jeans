require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Stripe = require('stripe');

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

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'works-jeans-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 },
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

app.post('/api/admin/login', (req, res) => {
  if (!getAdminAuth()) {
    res.status(503).json({ error: 'El panel admin no está configurado (falta ADMIN_PASSWORD en .env la primera vez).' });
    return;
  }

  if (!verifyAdminPassword(req.body.password)) {
    res.status(401).json({ error: 'Contraseña incorrecta.' });
    return;
  }

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
      success_url: `${req.protocol}://${req.get('host')}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/cancel.html`,
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

    const orders = getOrders();
    let order = orders.find((o) => o.stripeSessionId === session_id);

    if (!order) {
      let cartMeta = [];
      try {
        cartMeta = JSON.parse(session.metadata?.cart || '[]');
      } catch {
        cartMeta = [];
      }

      order = {
        id: makeOrderId(),
        source: 'stripe',
        status: 'pagado',
        createdAt: new Date().toISOString(),
        customerName: session.customer_details?.name || '',
        customerPhone: session.customer_details?.phone || '',
        notes: '',
        stripeSessionId: session_id,
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
    }

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
