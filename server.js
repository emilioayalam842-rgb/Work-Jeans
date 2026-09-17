require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Stripe = require('stripe');
const compression = require('compression');
const sharp = require('sharp');
const CONTENT = require('./contenido');
const QRCode = require('qrcode');
const SEC = require('./seguridad');

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
const INVENTORY_PATH = path.join(DATA_DIR, 'inventory.json');
const SUPPLIERS_PATH = path.join(DATA_DIR, 'suppliers.json');
const PURCHASES_PATH = path.join(DATA_DIR, 'purchases.json');
const RETURNS_PATH = path.join(DATA_DIR, 'returns.json');
const PROMOTIONS_PATH = path.join(DATA_DIR, 'promotions.json');
const LEADS_PATH = path.join(DATA_DIR, 'leads.json');
const ANALYTICS_PATH = path.join(DATA_DIR, 'analytics.json');
const ARTICLES_PATH = path.join(DATA_DIR, 'articles.json');
const CUSTOMERS_PATH = path.join(DATA_DIR, 'customers.json');
const REVIEWS_PATH = path.join(DATA_DIR, 'reviews.json');

// Primer arranque con DATA_DIR externo: copiar los datos iniciales del proyecto.
if (USES_EXTERNAL_DATA) {
  fs.mkdirSync(PRODUCTS_IMG_DIR, { recursive: true });
  for (const name of ['products.json', 'settings.json', 'orders.json', 'inventory.json', 'suppliers.json', 'purchases.json', 'returns.json', 'promotions.json']) {
    const target = path.join(DATA_DIR, name);
    if (!fs.existsSync(target)) {
      const seed = path.join(__dirname, name);
      fs.writeFileSync(target, fs.existsSync(seed) ? fs.readFileSync(seed) : (name === 'settings.json' ? '{}\n' : '[]\n'));
    }
  }
}

// Si el proyecto trae claves nuevas en settings.json (p. ej. googleMapsUrl), se agregan a los
// ajustes persistidos sin pisar lo que el panel ya haya editado.
if (USES_EXTERNAL_DATA) {
  try {
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'settings.json'), 'utf-8'));
    const current = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    let migrated_hours = false;
    const missing = Object.keys(seed).filter((k) => !(k in current));
    for (const k of missing) current[k] = seed[k];
    // Valores por defecto antiguos que conviene reemplazar por el nuevo (solo si nadie los editó).
    const OLD_DEFAULTS = { hours: 'Abre a las 9:00 a.m.' };
    if (current.hours === 'Lunes a sábado · 9:00 a. m. a 6:00 p. m.') { current.hours = 'Lunes a viernes · 9:00 a. m. a 6:00 p. m.'; migrated_hours = true; }
    const migrated = Object.keys(OLD_DEFAULTS).filter((k) => current[k] === OLD_DEFAULTS[k] && seed[k] && seed[k] !== current[k]);
    for (const k of migrated) current[k] = seed[k];
    if (missing.length || migrated.length || migrated_hours) {
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(current, null, 2) + '\n');
      console.log(`Ajustes actualizados: ${[...missing, ...migrated].join(', ')}`);
    }
  } catch {
    // Si algo falla, el sitio sigue con los ajustes que ya tenía.
  }
}

// Migración de nombres/descripciones con palabra clave (SEO). Solo cambia los que siguen
// exactamente como venían de fábrica; si el panel ya los editó, se respetan.
const PRODUCT_TEXT_MIGRATION = {
  "camisa-mezclilla": {
    "old": [
      "Camisa de Mezclilla",
      "Camisa de mezclilla 100% algodón con bolsillo frontal y botones reforzados. Acabado preencogido. Uso industrial."
    ],
    "new": [
      "Camisa de Trabajo de Mezclilla",
      "Camisa de trabajo de mezclilla 100% algodón con bolsillo frontal y botones reforzados. Acabado preencogido. Uso industrial."
    ]
  },
  "camisa-reflejante-verde": {
    "old": [
      "Camisa Reflejante Verde",
      "Camisa de mezclilla con cintas reflejantes verde alta visibilidad en pecho y mangas. Para entornos de poca luz y alta seguridad."
    ],
    "new": [
      "Camisa de Trabajo Reflejante Verde",
      "Camisa de trabajo de mezclilla con cintas reflejantes verde en pecho y mangas. Para entornos de poca luz y para que te vean."
    ]
  },
  "camisa-reflejante-naranja": {
    "old": [
      "Camisa Reflejante Naranja",
      "Camisa de mezclilla con cintas reflejantes naranja alta visibilidad en pecho y mangas. Para entornos de poca luz y alta seguridad."
    ],
    "new": [
      "Camisa de Trabajo Reflejante Naranja",
      "Camisa de trabajo de mezclilla con cintas reflejantes naranja en pecho y mangas. Para entornos de poca luz y para que te vean."
    ]
  },
  "pantalon-mezclilla": {
    "old": [
      "Pantalón de Mezclilla",
      "Pantalón de mezclilla 100% algodón corte recto. Cinco bolsas, costuras reforzadas y cintura ajustada. Resistente al uso intensivo."
    ],
    "new": [
      "Pantalón de Trabajo de Mezclilla",
      "Pantalón de trabajo de mezclilla 100% algodón, corte recto. Cinco bolsas, costuras reforzadas y cintura ajustada. Work jean resistente al uso intensivo en obra, planta y taller."
    ]
  },
  "pantalon-reflejante-verde": {
    "old": [
      "Pantalón Reflejante Verde",
      "Pantalón de mezclilla con cintas reflejantes verde alta visibilidad en piernas. Para entornos de poca luz y alta seguridad."
    ],
    "new": [
      "Pantalón de Trabajo Reflejante Verde",
      "Pantalón de trabajo de mezclilla con cintas reflejantes verde en piernas. Para vialidades, plantas y turnos con poca luz."
    ]
  },
  "pantalon-reflejante-naranja": {
    "old": [
      "Pantalón Reflejante Naranja",
      "Pantalón de mezclilla con cintas reflejantes naranja alta visibilidad en piernas. Para entornos de poca luz y alta seguridad."
    ],
    "new": [
      "Pantalón de Trabajo Reflejante Naranja",
      "Pantalón de trabajo de mezclilla con cintas reflejantes naranja en piernas. Para vialidades, plantas y turnos con poca luz."
    ]
  }
};
try {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf-8'));
  let changed = false;
  for (const p of products) {
    const m = PRODUCT_TEXT_MIGRATION[p.id];
    if (!m) continue;
    if (p.name === m.old[0]) { p.name = m.new[0]; changed = true; }
    if (p.description === m.old[1]) { p.description = m.new[1]; changed = true; }
  }
  if (changed) fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2) + '\n');
} catch {
  // Sin productos aún; no pasa nada.
}

// Descripciones: "de alta visibilidad" sugiere certificación que no existe; se deja "reflejante".
try {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf-8'));
  let changed = false;
  for (const p of products) {
    const fixed = String(p.description || '').replace(/ de alta visibilidad/gi, '').replace(/ alta visibilidad/gi, '').replace(/y alta seguridad\./g, 'y para que te vean.');
    if (fixed !== p.description) { p.description = fixed; changed = true; }
  }
  if (changed) fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2) + '\n');
} catch {
  // Sin productos aún.
}

// Lista de precios de Works Jeans del 02-abr-2025 (precios de lista sin IVA, por grupo de tallas).
// En la tienda se muestra el precio a cliente final CON IVA (16%). Se aplica una sola vez; después manda el panel.
const PRICE_LIST_ID = '2025-04-02';
const IVA = 1.16;
const PRICE_LIST = {
  'camisa-mezclilla': [
    { sizes: ['XCH', 'CH', 'M', 'G', 'XG'], socio: 141.08, distribuidor: 156.06, final: 187.28 },
    { sizes: ['2XG', '3XG', '4XG'], socio: 155.19, distribuidor: 171.67, final: 206.01 },
    { sizes: ['5XG', '6XG'], socio: 169.30, distribuidor: 187.27, final: 224.74 },
  ],
  'camisa-reflejante-verde': [
    { sizes: ['XCH', 'CH', 'M', 'G', 'XG'], socio: 180.18, distribuidor: 199.31, final: 239.18 },
    { sizes: ['2XG', '3XG', '4XG'], socio: 198.20, distribuidor: 219.24, final: 263.10 },
    { sizes: ['5XG', '6XG'], socio: 216.22, distribuidor: 239.17, final: 287.02 },
  ],
  'pantalon-mezclilla': [
    { sizes: ['28', '29', '30', '31', '32', '33', '34', '36', '38', '40', '42'], socio: 144.50, distribuidor: 159.85, final: 191.82 },
    { sizes: ['44', '46'], socio: 158.95, distribuidor: 175.84, final: 211.00 },
    { sizes: ['48', '50'], socio: 173.40, distribuidor: 191.82, final: 230.18 },
  ],
  'pantalon-reflejante-verde': [
    { sizes: ['28', '29', '30', '31', '32', '33', '34', '36', '38', '40', '42'], socio: 168.68, distribuidor: 186.60, final: 223.92 },
    { sizes: ['44', '46'], socio: 185.55, distribuidor: 205.26, final: 246.31 },
    { sizes: ['48', '50'], socio: 202.42, distribuidor: 223.92, final: 268.70 },
  ],
};
PRICE_LIST['camisa-reflejante-naranja'] = PRICE_LIST['camisa-reflejante-verde'];
PRICE_LIST['pantalon-reflejante-naranja'] = PRICE_LIST['pantalon-reflejante-verde'];
const withIva = (mxn) => Math.round(mxn * IVA * 100);

function applyPriceList(products) {
  let changed = false;
  for (const p of products) {
    const groups = PRICE_LIST[p.id];
    if (!groups) continue;
    for (const v of p.sizes || []) {
      const g = groups.find((x) => x.sizes.includes(String(v.size).toUpperCase()));
      if (g) { v.priceCents = withIva(g.final); changed = true; }
    }
    p.priceCents = Math.min(...groups.map((g) => withIva(g.final)));
    p.priceTiers = groups.map((g) => ({ sizes: g.sizes.join(', '), socioCents: withIva(g.socio), distribuidorCents: withIva(g.distribuidor), finalCents: withIva(g.final), listWithoutIva: { socio: g.socio, distribuidor: g.distribuidor, final: g.final } }));
    p.priceListId = PRICE_LIST_ID;
  }
  return changed;
}

try {
  const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  if (settings.priceListApplied !== PRICE_LIST_ID) {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf-8'));
    if (applyPriceList(products)) fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2) + '\n');
    settings.priceListApplied = PRICE_LIST_ID;
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
    console.log(`Precios actualizados con la lista ${PRICE_LIST_ID} (cliente final + IVA).`);
  }
} catch {
  // Sin datos aún.
}

// Variantes sin SKU (datos anteriores al catálogo con variantes): se les asigna uno automático.
try {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf-8'));
  let changed = false;
  for (const p of products) {
    if (!p.status) { p.status = p.active === false ? 'borrador' : 'activo'; changed = true; }
    if (!p.sku) { p.sku = skuPrefix(p.name); changed = true; }
    const oldBase = slugCode(p.name).slice(0, 6);
    for (const v of p.sizes || []) {
      // Sin SKU, o con el SKU automático anterior (prefijo por nombre, repetido entre modelos): se regenera.
      if (!v.sku || (oldBase && v.sku.startsWith(`${oldBase}-`) && v.sku !== autoSku(p, v))) { v.sku = autoSku(p, v); changed = true; }
    }
  }
  if (changed) fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2) + '\n');
} catch {
  // Sin productos aún.
}

const LOW_STOCK_THRESHOLD = 5;

function lowStockThreshold() {
  try {
    const n = parseInt(getSettings().lowStockThreshold, 10);
    return Number.isFinite(n) && n >= 0 ? n : LOW_STOCK_THRESHOLD;
  } catch {
    return LOW_STOCK_THRESHOLD;
  }
}

function getProducts() {
  return JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf-8'));
}

// Productos que ve la tienda: solo los visibles, en el orden definido en el panel.
function publicProducts() {
  return getProducts()
    .filter((p) => (p.status ? p.status === 'activo' : p.active !== false))
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .map((p) => {
      const { costCents, priceTiers, ...rest } = p;
      return { ...rest, sizes: (p.sizes || []).map(({ costCents: c, warehouses, barcode, ...v }) => v) };
    });
}

function publicSettings() {
  const { notifyEmail, warehouses, security, ...rest } = getSettings();
  return { ...rest, payments: paymentsInfo() };
}

// Catálogos SAT usados en el formulario de factura (solo los habituales para una tienda).
const SAT_REGIMENES = { 601: 'General de Ley Personas Morales', 603: 'Personas Morales con Fines no Lucrativos', 605: 'Sueldos y Salarios', 606: 'Arrendamiento', 608: 'Demás ingresos', 612: 'Personas Físicas con Actividades Empresariales y Profesionales', 616: 'Sin obligaciones fiscales', 621: 'Incorporación Fiscal', 625: 'Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', 626: 'Régimen Simplificado de Confianza' };
const SAT_USOS = { G01: 'Adquisición de mercancías', G03: 'Gastos en general', S01: 'Sin efectos fiscales' };
const RFC_RE = /^([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}$/;

// Devuelve { invoice, error }. invoice = null cuando no se pidió factura.
function normalizeInvoice(raw, { strict = false } = {}) {
  if (!raw || typeof raw !== 'object') return { invoice: null };
  const inv = {
    rfc: cleanText(raw.rfc, 13).toUpperCase().replace(/[^A-Z0-9Ñ&]/g, ''),
    name: cleanText(raw.name, 120),
    email: cleanText(raw.email, 120),
    zip: cleanText(raw.zip, 5).replace(/\D/g, ''),
    regimen: cleanText(raw.regimen, 3),
    uso: cleanText(raw.uso, 3).toUpperCase(),
  };
  if (!inv.rfc && !inv.name && !inv.email && !inv.zip && !raw.requested) return { invoice: null };
  if (strict) {
    if (!RFC_RE.test(inv.rfc)) return { error: 'El RFC no tiene un formato válido (12 o 13 caracteres).' };
    if (!inv.name) return { error: 'Escribe el nombre o razón social para la factura.' };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inv.email)) return { error: 'Escribe un correo válido para enviarte la factura.' };
    if (!/^\d{5}$/.test(inv.zip)) return { error: 'El código postal fiscal debe tener 5 dígitos.' };
    if (!SAT_REGIMENES[inv.regimen]) return { error: 'Elige tu régimen fiscal.' };
    if (!SAT_USOS[inv.uso]) return { error: 'Elige el uso de CFDI.' };
  }
  if (inv.regimen && !SAT_REGIMENES[inv.regimen]) inv.regimen = '';
  if (inv.uso && !SAT_USOS[inv.uso]) inv.uso = '';
  return { invoice: inv };
}

// ---------- Envíos por código postal (tarifas configurables en el panel; sin tarifa = "por confirmar") ----------
function shippingConfig() {
  const s = getSettings().shipping || {};
  return { summary: s.summary || '', freeFromCents: s.freeFromCents || 0, quoteFromQty: s.quoteFromQty || 0, zones: Array.isArray(s.zones) ? s.zones : [] };
}

function shippingQuote({ postalCode, subtotalCents, qty, freeShipping }) {
  const cfg = shippingConfig();
  const cp = String(postalCode || '').replace(/\D/g, '');
  if (cfg.quoteFromQty > 0 && qty >= cfg.quoteFromQty) {
    return { status: 'quote_required', costCents: null, label: `Pedidos de ${cfg.quoteFromQty} piezas o más: el envío se cotiza aparte (te confirmamos el costo antes de cobrar).` };
  }
  if (!cp) return { status: 'need_cp', costCents: null, label: 'Escribe tu código postal para calcular el envío.' };
  if (!/^\d{5}$/.test(cp)) return { status: 'invalid_cp', costCents: null, label: 'El código postal debe tener 5 dígitos.' };
  const zone = cfg.zones.find((z) => cp >= String(z.cpFrom || '00000').padStart(5, '0') && cp <= String(z.cpTo || '99999').padStart(5, '0'));
  if (!zone) return { status: 'unknown_cp', costCents: null, label: 'No cubrimos ese código postal por paquetería. Escríbenos por WhatsApp para revisarlo.' };
  const free = freeShipping || (cfg.freeFromCents > 0 && subtotalCents >= cfg.freeFromCents);
  if (free) return { status: 'free', zone: zone.name, costCents: 0, days: zone.days || '', label: `Envío gratis a ${zone.name}${zone.days ? ` · ${zone.days}` : ''}` };
  if (!Number.isFinite(zone.costCents) || zone.costCents === null) {
    return { status: 'pending_rates', zone: zone.name, costCents: null, days: zone.days || '', label: `Envío a ${zone.name}: te confirmamos el costo por WhatsApp antes de enviar. No se cobra nada de envío al pagar.` };
  }
  return { status: 'quoted', zone: zone.name, costCents: zone.costCents, days: zone.days || '', label: `Envío a ${zone.name}${zone.days ? ` · ${zone.days}` : ''}` };
}

function parseMoney(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

// Campos opcionales del producto que vienen del formulario del panel (multipart, todo es texto).
function applyProductExtras(product, body) {
  if (body.active !== undefined && body.status === undefined) {
    product.active = body.active === 'true' || body.active === '1' || body.active === 'on';
    product.status = product.active ? 'activo' : (product.status === 'descontinuado' ? 'descontinuado' : 'borrador');
  }
  if (body.tag !== undefined) product.tag = ['nuevo', 'oferta'].includes(body.tag) ? body.tag : '';
  if (body.costMxn !== undefined) {
    const cents = parseMoney(body.costMxn);
    if (cents) product.costCents = cents;
    else delete product.costCents;
  }
  for (const key of ['sku', 'gender', 'fit', 'rise', 'wash', 'composition', 'stretch', 'season', 'collection']) {
    if (body[key] !== undefined) {
      const value = String(body[key] || '').trim().slice(0, 120);
      if (value) product[key] = key === 'sku' ? value.toUpperCase() : value;
      else delete product[key];
    }
  }
  if (body.status !== undefined) {
    product.status = ['activo', 'borrador', 'descontinuado'].includes(body.status) ? body.status : 'activo';
    product.active = product.status === 'activo';
  }
  if (body.compareMxn !== undefined) {
    const cents = parseMoney(body.compareMxn);
    if (cents && cents > product.priceCents) product.comparePriceCents = cents;
    else delete product.comparePriceCents;
  }
  // Ficha técnica y contenido de la página del producto. Todo opcional: solo se muestra lo que esté lleno.
  for (const [key, max] of [['longDescription', 3000], ['care', 800], ['customization', 600], ['seoTitle', 70], ['seoDescription', 170], ['videoUrl', 300]]) {
    if (body[key] !== undefined) {
      let value = String(body[key] || '').trim().slice(0, max);
      if (key === 'videoUrl' && value && !/^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+|^https:\/\/[\w./-]+\.(mp4|webm)$/i.test(value)) value = '';
      if (value) product[key] = value;
      else delete product[key];
    }
  }
  if (body.features !== undefined) {
    const list = String(body.features || '').split(/\r?\n/).map((l) => l.trim().replace(/^[-•*]\s*/, '').slice(0, 160)).filter(Boolean).slice(0, 20);
    if (list.length) product.features = list;
    else delete product.features;
  }
  const specs = { ...(product.specs || {}) };
  let touched = false;
  for (const f of SPEC_FIELDS) {
    if (body[`spec_${f.key}`] !== undefined) {
      touched = true;
      const value = String(body[`spec_${f.key}`] || '').trim().slice(0, 120);
      if (value) specs[f.key] = value;
      else delete specs[f.key];
    }
  }
  if (touched) {
    if (Object.keys(specs).length) product.specs = specs;
    else delete product.specs;
  }
  if (body.certifications !== undefined) {
    // Una por línea: Nombre | Número | Organismo | Fecha | Vigencia | Documento (URL)
    const list = String(body.certifications || '').split(/\r?\n/).map((line) => {
      const [name, number, body_, date, validUntil, document] = line.split('|').map((x) => (x || '').trim().slice(0, 160));
      return name ? { name, number, body: body_, date, validUntil, document: /^https:\/\//.test(document || '') ? document : '' } : null;
    }).filter(Boolean).slice(0, 10);
    if (list.length) product.certifications = list;
    else delete product.certifications;
  }
  if (body.wholesaleMinQty !== undefined || body.wholesaleMxn !== undefined) {
    const minQty = parseInt(body.wholesaleMinQty, 10);
    const cents = parseMoney(body.wholesaleMxn);
    if (minQty > 1 && cents) product.wholesale = { minQty, priceCents: cents };
    else delete product.wholesale;
  }
}

// Especificaciones técnicas que puede tener una prenda. Solo se muestran las confirmadas en el panel.
const SPEC_FIELDS = [
  { key: 'material', label: 'Material' },
  { key: 'composition', label: 'Composición' },
  { key: 'weightOz', label: 'Peso de la mezclilla (oz/yd²)' },
  { key: 'weightGsm', label: 'Gramaje (g/m²)' },
  { key: 'fit', label: 'Tipo de corte' },
  { key: 'rise', label: 'Tiro' },
  { key: 'pockets', label: 'Bolsas' },
  { key: 'closure', label: 'Cierre' },
  { key: 'button', label: 'Botón' },
  { key: 'rivets', label: 'Remaches' },
  { key: 'seams', label: 'Tipo de costura' },
  { key: 'reinforcedSeams', label: 'Costuras reforzadas' },
  { key: 'thread', label: 'Hilo' },
  { key: 'preshrunk', label: 'Preencogido' },
  { key: 'shrinkage', label: 'Encogimiento estimado' },
  { key: 'length', label: 'Largo' },
  { key: 'color', label: 'Color' },
  { key: 'reflective', label: 'Reflejante' },
  { key: 'tapeWidth', label: 'Ancho de cinta reflejante' },
  { key: 'tapeMaterial', label: 'Material de la cinta' },
  { key: 'stretch', label: 'Elasticidad' },
  { key: 'wash', label: 'Lavado' },
  { key: 'madeIn', label: 'País de fabricación' },
  { key: 'internalCode', label: 'Código interno' },
];

// Filas [etiqueta, valor] con las especificaciones confirmadas (specs.* o los atributos del catálogo).
function productSpecRows(product) {
  const rows = [];
  for (const f of SPEC_FIELDS) {
    const value = product.specs?.[f.key] ?? (['composition', 'fit', 'rise', 'wash', 'stretch'].includes(f.key) ? product[f.key] : undefined);
    if (value) rows.push([f.label, String(value)]);
  }
  return rows;
}

// --- Variantes: cada entrada de `sizes` es una variante (talla, largo opcional, color opcional) ---
function variantLabel(v) {
  return [v.size, v.length ? `L${v.length}` : '', v.color || ''].filter(Boolean).join(' / ');
}

function findVariant(product, label) {
  if (!product || !label) return null;
  return product.sizes.find((s) => variantLabel(s) === label) || product.sizes.find((s) => s.size === label) || null;
}

function slugCode(text) {
  return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '').toUpperCase();
}

function skuPrefix(name) {
  const words = String(name || '').split(/\s+/).filter((w) => w && !['de', 'del', 'la', 'el', 'y', 'con', 'para'].includes(w.toLowerCase()));
  const initials = words.map((w) => slugCode(w).charAt(0)).join('');
  return (initials.length >= 2 ? initials : slugCode(name).slice(0, 4)) || 'WJ';
}

function autoSku(product, v) {
  const base = product.sku || skuPrefix(product.name);
  return [base, v.color ? slugCode(v.color).slice(0, 3) : '', slugCode(v.size), v.length ? slugCode(v.length) : ''].filter(Boolean).join('-');
}

function warehouseNames() {
  try {
    const list = getSettings().warehouses;
    return Array.isArray(list) && list.length ? list.map(String) : ['Tienda'];
  } catch {
    return ['Tienda'];
  }
}

// Normaliza las variantes que llegan del panel: números enteros, SKU automático, stock por almacén.
function normalizeVariants(list, product) {
  const names = warehouseNames();
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const v = {
      size: String(raw.size || '').trim(),
      length: String(raw.length || '').trim(),
      color: String(raw.color || '').trim(),
      sku: String(raw.sku || '').trim().toUpperCase(),
      barcode: String(raw.barcode || '').trim(),
      stock: Math.max(0, parseInt(raw.stock, 10) || 0),
    };
    if (!v.size) continue;
    if (!v.length) delete v.length;
    if (!v.color) delete v.color;
    if (!v.barcode) delete v.barcode;
    const label = variantLabel(v);
    if (seen.has(label)) continue;
    seen.add(label);
    if (!v.sku) v.sku = autoSku(product, v);
    const price = parseMoney(raw.priceMxn ?? (raw.priceCents != null ? raw.priceCents / 100 : ''));
    const cost = parseMoney(raw.costMxn ?? (raw.costCents != null ? raw.costCents / 100 : ''));
    if (price) v.priceCents = price;
    if (cost) v.costCents = cost;
    if (raw.warehouses && typeof raw.warehouses === 'object') {
      const wh = {};
      for (const n of names) wh[n] = Math.max(0, parseInt(raw.warehouses[n], 10) || 0);
      v.warehouses = wh;
      v.stock = Object.values(wh).reduce((a, b) => a + b, 0);
    } else if (names.length > 1) {
      v.warehouses = { [names[0]]: v.stock };
    }
    out.push(v);
  }
  return out;
}

// Ajusta el stock de una variante repartiendo entre almacenes (positivo entra al almacén dado,
// negativo sale del dado o, si no alcanza, de los demás en orden).
function applyStockDelta(variant, delta, warehouse) {
  const names = warehouseNames();
  if (names.length > 1 || variant.warehouses) {
    variant.warehouses = variant.warehouses || { [names[0]]: variant.stock };
    for (const n of names) if (!(n in variant.warehouses)) variant.warehouses[n] = 0;
    const target = warehouse && names.includes(warehouse) ? warehouse : names[0];
    if (delta >= 0) {
      variant.warehouses[target] += delta;
    } else {
      let remaining = -delta;
      for (const n of [target, ...names.filter((x) => x !== target)]) {
        const take = Math.min(variant.warehouses[n], remaining);
        variant.warehouses[n] -= take;
        remaining -= take;
        if (remaining <= 0) break;
      }
    }
    variant.stock = Object.values(variant.warehouses).reduce((a, b) => a + b, 0);
  } else {
    variant.stock = Math.max(0, variant.stock + delta);
  }
  return variant.stock;
}

function productPrice(product, variant) {
  return variant?.priceCents || product.priceCents;
}

function productCost(product, variant) {
  return variant?.costCents || product.costCents || 0;
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

// Historial de movimientos de inventario (últimos 2000).
function getInventoryLog() {
  if (!fs.existsSync(INVENTORY_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function logInventory(entries) {
  if (!entries.length) return;
  const log = getInventoryLog();
  const at = new Date().toISOString();
  for (const e of entries) log.push({ id: `mov_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`, at, ...e });
  fs.writeFileSync(INVENTORY_PATH, JSON.stringify(log.slice(-2000), null, 2) + '\n');
}

const ORDER_STATUSES = ['pendiente', 'pagado', 'preparacion', 'enviado', 'entregado', 'cancelado', 'devuelto'];

// Colecciones JSON genéricas (proveedores, órdenes de compra, devoluciones).
function readJsonList(file) {
  if (!fs.existsSync(file)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function writeJsonList(file, list) {
  fs.writeFileSync(file, JSON.stringify(list, null, 2) + '\n');
}
const getSuppliers = () => readJsonList(SUPPLIERS_PATH);
const saveSuppliers = (l) => writeJsonList(SUPPLIERS_PATH, l);
const getPurchases = () => readJsonList(PURCHASES_PATH);
const savePurchases = (l) => writeJsonList(PURCHASES_PATH, l);
const getReturns = () => readJsonList(RETURNS_PATH);
const saveReturns = (l) => writeJsonList(RETURNS_PATH, l);
const getPromotions = () => readJsonList(PROMOTIONS_PATH);
const getLeads = () => readJsonList(LEADS_PATH);
const getCustomers = () => readJsonList(CUSTOMERS_PATH);
const getReviews = () => readJsonList(REVIEWS_PATH);
const saveReviews = (list) => fs.writeFileSync(REVIEWS_PATH, JSON.stringify(list, null, 2) + '\n');
const saveCustomers = (list) => fs.writeFileSync(CUSTOMERS_PATH, JSON.stringify(list, null, 2) + '\n');
const saveLeads = (list) => fs.writeFileSync(LEADS_PATH, JSON.stringify(list, null, 2) + '\n');
const savePromotions = (l) => writeJsonList(PROMOTIONS_PATH, l);

// --- Promociones: cálculo del carrito con descuentos automáticos y por cupón ---

const PROMO_TYPES = ['percent', 'amount', 'free_shipping', '2x1', 'qty', 'first'];

function promoActive(promo, now = new Date()) {
  if (!promo.active) return false;
  if (promo.startsAt && new Date(`${promo.startsAt}T00:00:00`) > now) return false;
  if (promo.endsAt && new Date(`${promo.endsAt}T23:59:59`) < now) return false;
  if (promo.maxUses && (promo.uses || 0) >= promo.maxUses) return false;
  return true;
}

function promoAppliesTo(promo, product) {
  const scope = promo.scope || { kind: 'all' };
  if (scope.kind === 'category') return (scope.values || []).includes(product.category);
  if (scope.kind === 'collection') return (scope.values || []).includes(product.collection);
  if (scope.kind === 'products') return (scope.values || []).includes(product.id);
  return true;
}

// Devuelve { lines, subtotalCents, discounts:[{id,name,cents,code}], discountCents, totalCents, freeShipping, codeError }
function quoteCart(items, code, postalCode) {
  const products = getProducts();
  const lines = [];
  for (const item of Array.isArray(items) ? items : []) {
    const product = products.find((p) => p.id === item.id);
    if (!product) continue;
    const variant = findVariant(product, item.size);
    const quantity = Math.max(1, Math.min(200, parseInt(item.quantity, 10) || 1));
    const unit = productPrice(product, variant);
    lines.push({ id: product.id, name: product.name, size: variant ? variantLabel(variant) : (item.size || null), quantity, unitCents: unit, subtotalCents: unit * quantity, product });
  }
  const subtotalCents = lines.reduce((s, l) => s + l.subtotalCents, 0);
  const promos = getPromotions().filter((p) => promoActive(p));
  const discounts = [];
  let freeShipping = false;
  let codeError = '';
  const normalized = String(code || '').trim().toUpperCase();

  const evaluate = (promo) => {
    const eligible = lines.filter((l) => promoAppliesTo(promo, l.product));
    const eligibleCents = eligible.reduce((s, l) => s + l.subtotalCents, 0);
    const eligibleQty = eligible.reduce((s, l) => s + l.quantity, 0);
    if (eligible.length === 0) return 0;
    if (promo.minCents && subtotalCents < promo.minCents) return 0;
    if (promo.minQty && eligibleQty < promo.minQty) return 0;
    switch (promo.type) {
      case 'percent':
      case 'first':
      case 'qty':
        return Math.round(eligibleCents * (Math.min(100, promo.value || 0) / 100));
      case 'amount':
        return Math.min(eligibleCents, promo.value || 0);
      case '2x1':
        return eligible.reduce((s, l) => s + Math.floor(l.quantity / 2) * l.unitCents, 0);
      case 'free_shipping':
        freeShipping = true;
        return 0;
      default:
        return 0;
    }
  };

  // Automáticas (sin código) primero; luego el cupón si lo hay y es válido.
  for (const promo of promos.filter((p) => !p.code)) {
    const cents = evaluate(promo);
    if (cents > 0 || (promo.type === 'free_shipping' && freeShipping)) discounts.push({ id: promo.id, name: promo.name, cents, code: null });
  }
  if (normalized) {
    const promo = promos.find((p) => p.code === normalized);
    if (!promo) {
      const exists = getPromotions().find((p) => p.code === normalized);
      codeError = exists ? 'Este cupón ya no está vigente.' : 'Cupón no válido.';
    } else {
      const cents = evaluate(promo);
      if (cents > 0 || promo.type === 'free_shipping') discounts.push({ id: promo.id, name: promo.name, cents, code: promo.code });
      else codeError = promo.minCents ? `Este cupón aplica en compras desde ${formatMxn(promo.minCents)}.` : promo.minQty ? `Este cupón aplica a partir de ${promo.minQty} piezas.` : 'Este cupón no aplica a los productos del carrito.';
    }
  }
  const discountCents = Math.min(subtotalCents, discounts.reduce((s, d) => s + d.cents, 0));
  const shipping = shippingQuote({ postalCode, subtotalCents: subtotalCents - discountCents, qty: lines.reduce((s, l) => s + l.quantity, 0), freeShipping });
  const shippingCents = shipping.costCents || 0;
  return {
    lines: lines.map(({ product, ...l }) => l),
    subtotalCents,
    discounts,
    discountCents,
    shipping,
    shippingCents,
    totalCents: subtotalCents - discountCents + shippingCents,
    freeShipping,
    codeError,
  };
}

function registerPromoUse(discounts, totalCents) {
  if (!discounts || !discounts.length) return;
  const list = getPromotions();
  let changed = false;
  for (const d of discounts) {
    const promo = list.find((p) => p.id === d.id);
    if (!promo) continue;
    promo.uses = (promo.uses || 0) + 1;
    promo.stats = promo.stats || { discountCents: 0, salesCents: 0 };
    promo.stats.discountCents += d.cents;
    promo.stats.salesCents += totalCents;
    changed = true;
  }
  if (changed) savePromotions(list);
}

function nextFolio(list, prefix) {
  const max = list.reduce((m, x) => {
    const n = parseInt(String(x.id || '').replace(`${prefix}-`, ''), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(5, '0')}`;
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

// Texto que viene de clientes (Stripe, WhatsApp, formularios): sin etiquetas HTML ni caracteres de control.
function cleanText(value, max = 200) {
  return String(value ?? '').replace(/[<>]/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// --- Usuarios del panel, roles, MFA y bitácora (ver seguridad.js) ---
const security = SEC.createSecurity({ dataDir: DATA_DIR, legacyAuthPath: ADMIN_AUTH_PATH });
security.init();

// IP real del visitante: detrás de Cloudflare viene en CF-Connecting-IP; si no, la que ve Express.
function clientIp(req) {
  const cf = req.headers['cf-connecting-ip'];
  return typeof cf === 'string' && cf ? cf : req.ip;
}

function auditLog(req, action, details) {
  const u = req.adminUser;
  security.audit({ action, userId: u?.id || null, user: u?.username || null, ip: clientIp(req), ...details });
}

// --- Stock helpers ---

function decrementStock(products, items, { strict, orderId = null, reason = 'Pedido' }) {
  const threshold = lowStockThreshold();
  const alerts = [];
  const movements = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.id);
    if (!product || !item.size) continue;
    const sizeEntry = findVariant(product, item.size);
    if (!sizeEntry) continue;

    if (strict && sizeEntry.stock < item.quantity) {
      throw new Error(`Sin stock suficiente de ${product.name} ${variantLabel(sizeEntry)} (disponible: ${sizeEntry.stock}).`);
    }
    const before = sizeEntry.stock;
    applyStockDelta(sizeEntry, -item.quantity, item.warehouse);
    movements.push({ productId: product.id, productName: product.name, size: variantLabel(sizeEntry), sku: sizeEntry.sku, delta: sizeEntry.stock - before, stockAfter: sizeEntry.stock, reason, orderId, warehouse: item.warehouse || warehouseNames()[0] });
    if (before > threshold && sizeEntry.stock <= threshold) {
      alerts.push({ productName: product.name, size: sizeEntry.size, stock: sizeEntry.stock });
    }
  }
  logInventory(movements);
  if (alerts.length) notifyLowStock(alerts, threshold);
  return products;
}

// Devuelve al inventario las piezas de un pedido (al cancelarlo).
function restoreStock(products, items, { orderId = null, reason = 'Pedido cancelado' }) {
  const movements = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.id);
    if (!product || !item.size) continue;
    const sizeEntry = findVariant(product, item.size);
    if (!sizeEntry) continue;
    applyStockDelta(sizeEntry, item.quantity, item.warehouse);
    movements.push({ productId: product.id, productName: product.name, size: variantLabel(sizeEntry), sku: sizeEntry.sku, delta: item.quantity, stockAfter: sizeEntry.stock, reason, orderId, warehouse: item.warehouse || warehouseNames()[0] });
  }
  logInventory(movements);
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

app.use(express.json({ limit: '1mb' }));
app.use(session({
  name: 'wj.sid',
  secret: security.sessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 12, // caducidad absoluta: 12 h
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' ? true : 'auto',
  },
}));
// Archivos que nunca deben servirse públicamente.
const PRIVATE_FILES = new Set([
  '/orders.json', '/inventory.json', '/suppliers.json', '/purchases.json', '/returns.json', '/promotions.json', '/leads.json', '/analytics.json', '/articles.json', '/customers.json', '/pending-checkouts.json', '/reviews.json', '/admin-auth.json', '/users.json', '/audit.json', '/session-secret.txt', '/server.js', '/seguridad.js', '/contenido.js', '/Dockerfile', '/railway.json', '/package.json', '/package-lock.json',
  '/.env', '/.env.example', '/.gitignore', '/npm install',
]);
app.use((req, res, next) => {
  let p;
  try {
    p = path.posix.normalize(decodeURIComponent(req.path));
  } catch {
    res.status(400).send('Bad request');
    return;
  }
  if (p.includes('..') || req.path.includes('..') || PRIVATE_FILES.has(p) || /^\/(node_modules|\.git|\.claude|img-cache)(\/|$)/.test(p) || /\.(json|md|lock|log)$/i.test(p) && !['/products.json', '/settings.json'].includes(p)) {
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

// --- Imágenes redimensionadas: /img/<ancho>/<ruta> → jpg o webp según el navegador, con caché en disco ---
const IMG_WIDTHS = new Set([320, 480, 640, 800, 1000]);
const IMG_CACHE_DIR = path.join(DATA_DIR, 'img-cache');
fs.mkdirSync(IMG_CACHE_DIR, { recursive: true });

function resolveImageSource(rel) {
  const clean = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
  if (!/^assets\/(products|img)\/[^/]+\.(jpe?g|png|webp)$/i.test(clean)) return null;
  const candidates = [path.join(PRODUCTS_IMG_DIR, path.basename(clean)), path.join(__dirname, clean)];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

app.get('/img/:width(\\d+)/*', async (req, res) => {
  const width = parseInt(req.params.width, 10);
  if (!IMG_WIDTHS.has(width)) {
    res.status(400).send('Ancho no permitido');
    return;
  }
  const source = resolveImageSource(decodeURIComponent(req.params[0]));
  if (!source) {
    res.status(404).send('Imagen no encontrada');
    return;
  }
  const webp = (req.headers.accept || '').includes('image/webp');
  const key = `${crypto.createHash('md5').update(`${source}:${fs.statSync(source).mtimeMs}`).digest('hex')}-${width}.${webp ? 'webp' : 'jpg'}`;
  const cached = path.join(IMG_CACHE_DIR, key);
  res.set('Cache-Control', 'public, max-age=2592000');
  res.set('Vary', 'Accept');
  res.type(webp ? 'image/webp' : 'image/jpeg');
  if (fs.existsSync(cached)) {
    res.sendFile(cached);
    return;
  }
  try {
    const pipeline = sharp(source).rotate().resize({ width, withoutEnlargement: true });
    const buffer = webp ? await pipeline.webp({ quality: 82 }).toBuffer() : await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    fs.writeFile(cached, buffer, () => {});
    res.send(buffer);
  } catch (err) {
    res.status(500).send('No se pudo procesar la imagen');
  }
});

// products.json y settings.json se sirven desde DATA_DIR (el panel los edita ahí).
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// --- Reseñas verificadas: solo desde el enlace único de un pedido entregado; se publican tras aprobarse en el panel ---
function approvedReviews(productId) {
  return getReviews().filter((r) => r.productId === productId && r.status === 'aprobada').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
function reviewsMinForRating() {
  try { const n = parseInt(getSettings().reviewsMinForRating, 10); return Number.isFinite(n) && n > 0 ? n : 3; } catch { return 3; }
}
function ratingSummary(list) {
  if (!list.length) return null;
  const avg = list.reduce((s, r) => s + r.rating, 0) / list.length;
  return { avg: Math.round(avg * 10) / 10, count: list.length };
}
function displayNameFor(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Cliente';
  return parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.` : parts[0];
}
function ensureReviewToken(orderId) {
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;
  if (!order.reviewToken) { order.reviewToken = crypto.randomBytes(12).toString('hex'); saveOrders(orders); }
  return order.reviewToken;
}
function starsHtml(n) {
  return `<span class="pdp-stars" aria-label="${n} de 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
}

function productJsonLd(product, origin, url) {
  const inStock = product.sizes.some((s) => s.stock > 0);
  const categorySlug = product.category === 'Pantalones' ? 'pantalones-de-trabajo' : 'camisas-de-trabajo';
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${url}#producto`,
        name: product.name,
        description: product.description,
        image: (product.images && product.images.length ? product.images : [product.image]).map((i) => `${origin}/${i}`),
        sku: product.sku || product.id,
        brand: { '@type': 'Brand', name: 'Works Jeans' },
        category: product.category === 'Pantalones' ? 'Pantalones de trabajo' : 'Camisas de trabajo',
        ...(product.specs?.material || product.composition ? { material: product.specs?.material || product.composition } : {}),
        ...(product.specs?.color || product.wash ? { color: product.specs?.color || product.wash } : {}),
        audience: { '@type': 'PeopleAudience', suggestedGender: 'unisex' },
        ...(() => {
          const list = approvedReviews(product.id);
          const sum = ratingSummary(list);
          const out = {};
          if (list.length) out.review = list.slice(0, 10).map((r) => ({ '@type': 'Review', author: { '@type': 'Person', name: r.displayName }, datePublished: r.createdAt.slice(0, 10), reviewBody: r.comment, reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 } }));
          if (sum && list.length >= reviewsMinForRating()) out.aggregateRating = { '@type': 'AggregateRating', ratingValue: sum.avg, reviewCount: sum.count, bestRating: 5, worstRating: 1 };
          return out;
        })(),
        offers: {
          '@type': 'Offer',
          url,
          price: (product.priceCents / 100).toFixed(2),
          priceCurrency: 'MXN',
          availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@id': `${origin}/#negocio` },
          shippingDetails: { '@type': 'OfferShippingDetails', shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'MX' } },
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: product.category === 'Pantalones' ? 'Pantalones de trabajo' : 'Camisas de trabajo', item: `${origin}/${categorySlug}` },
          { '@type': 'ListItem', position: 3, name: product.name, item: url },
        ],
      },
    ],
  };
}

const ASSET_V = '20260917c';

function fill(template, map) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in map ? map[k] : m));
}

// El carrito lateral vive en index.html; se reutiliza tal cual en las páginas de producto.
function cartDrawerHtml() {
  const home = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
  const a = home.indexOf('<div class="cart-overlay"');
  const b = home.indexOf('</aside>', a);
  return a >= 0 && b >= 0 ? home.slice(a, b + '</aside>'.length) : '';
}

function money(cents) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function categoryOf(product) {
  const isPants = /pantal/i.test(product.category || '');
  const custom = (() => { try { return (getSettings().categories || []).find((c) => c.name === product.category); } catch { return null; } })();
  return {
    isPants,
    name: product.category === 'Pantalones' ? 'Pantalones de trabajo' : product.category === 'Camisas' ? 'Camisas de trabajo' : product.category,
    url: product.category === 'Pantalones' ? '/pantalones-de-trabajo' : product.category === 'Camisas' ? '/camisas-de-trabajo' : (custom ? `/${custom.slug}` : '/#productos'),
  };
}

function productImages(product) {
  return product.images && product.images.length ? product.images : [product.image];
}

function pdpSection(id, title, bodyHtml) {
  return `<section class="pdp-section" id="${id}"><h2>${title}</h2>${bodyHtml}</section>`;
}

function renderProductPage(product, req) {
  const origin = CANONICAL_HOST ? `https://${CANONICAL_HOST}` : `${req.protocol}://${req.get('host')}`;
  const url = `${origin}/producto/${product.id}`;
  const cat = categoryOf(product);
  const images = productImages(product);
  const settings = getSettings();
  const totalStock = product.sizes.reduce((sum, v) => sum + (v.stock || 0), 0);
  const low = lowStockThreshold();
  const simple = product.sizes.every((v) => !v.length && !v.color);
  const title = product.seoTitle || `${product.name} | Works Jeans`;
  const desc = product.seoDescription || `${product.description} ${money(product.priceCents)} MXN. Tallas ${product.sizes[0]?.size} a ${product.sizes[product.sizes.length - 1]?.size}. Hecho en Monterrey, envío a todo México.`.slice(0, 300);

  const avail = totalStock <= 0
    ? { cls: 'is-out', text: 'Agotado por ahora' }
    : product.sizes.filter((v) => v.stock > 0).length <= 2 || totalStock <= low
      ? { cls: 'is-low', text: 'Pocas piezas disponibles' }
      : { cls: 'is-ok', text: 'En stock · se envía en 1 a 2 días hábiles' };

  const sizePicker = simple
    ? `<fieldset class="pdp-sizes"><legend class="size-label">Talla</legend><div class="pdp-pills" id="pdpSizePills" role="group" aria-label="Tallas">${product.sizes.map((v) => `<button type="button" class="pdp-pill" data-label="${escapeHtml(variantLabel(v))}" aria-pressed="false" ${v.stock > 0 ? '' : 'disabled title="Agotada"'}>${escapeHtml(v.size)}</button>`).join('')}</div></fieldset>`
    : `<div class="pdp-select"><label class="size-label" for="pdpSize">Talla / largo / color</label><select class="size-select" id="pdpSize" ${totalStock <= 0 ? 'disabled' : ''}>${product.sizes.map((v) => `<option value="${escapeHtml(variantLabel(v))}" ${v.stock > 0 ? '' : 'disabled'}>${escapeHtml(variantLabel(v))}${v.stock > 0 ? '' : ' · agotada'}</option>`).join('')}</select></div>`;

  const thumbs = images.length > 1 ? images.map((img, i) => `<button type="button" class="pdp-thumb ${i === 0 ? 'is-active' : ''}" data-large="/img/800/${img}" data-srcset="/img/480/${img} 480w, /img/800/${img} 800w, /img/1000/${img} 1000w" data-alt="${escapeHtml(product.name)} · foto ${i + 1}" aria-current="${i === 0}"><img src="/img/320/${img}" alt="${escapeHtml(product.name)} · miniatura ${i + 1}" width="64" height="80" loading="lazy"></button>`).join('') : '';

  let video = '';
  if (product.videoUrl) {
    const yt = product.videoUrl.match(/(?:v=|youtu\.be\/|embed\/)([\w-]+)/);
    video = yt
      ? `<div class="pdp-video"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0" title="Video de ${escapeHtml(product.name)}" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`
      : `<div class="pdp-video"><video controls muted playsinline preload="none" poster="/img/800/${images[0]}"><source src="${escapeHtml(product.videoUrl)}"></video></div>`;
  }

  const distinct = [...new Set(product.sizes.map((v) => v.priceCents || product.priceCents))];
  const priceHtml = `${product.comparePriceCents && product.comparePriceCents > product.priceCents ? `<s class="price-compare">${money(product.comparePriceCents)}</s>` : ''}${distinct.length > 1 ? '<span class="pdp-from">desde</span> ' : ''}${money(product.priceCents)} <small>MXN · IVA incluido</small>`;
  const priceBySize = distinct.length > 1 ? `<p class="pdp-price-sizes">${distinct.sort((a, b) => a - b).map((cents) => `${product.sizes.filter((v) => (v.priceCents || product.priceCents) === cents).map((v) => v.size).join(' · ')}: <b>${money(cents)}</b>`).join(' &nbsp;|&nbsp; ')}</p>` : '';
  const wholesaleLine = product.wholesale ? `<p class="pdp-wholesale">Mayoreo: <b>${money(product.wholesale.priceCents)}</b> por pieza a partir de ${product.wholesale.minQty} piezas. <a href="/empresas">Cotizar para empresa</a></p>` : '';

  // Secciones (solo con información real)
  const sections = [];
  sections.push(['descripcion', 'Descripción', `<p>${escapeHtml(product.longDescription || product.description).replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>')}</p>`]);
  if (product.features?.length) sections.push(['caracteristicas', 'Características', `<ul class="pdp-list">${product.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`]);
  const specRows = productSpecRows(product);
  if (specRows.length) sections.push(['especificaciones', 'Especificaciones técnicas', `<div class="table-scroll"><table class="pdp-specs">${specRows.map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('')}</table></div>`]);
  if (product.certifications?.length) sections.push(['certificaciones', 'Certificaciones', `<ul class="pdp-list">${product.certifications.map((c) => `<li><strong>${escapeHtml(c.name)}</strong>${c.number ? ` · No. ${escapeHtml(c.number)}` : ''}${c.body ? ` · ${escapeHtml(c.body)}` : ''}${c.validUntil ? ` · vigente hasta ${escapeHtml(c.validUntil)}` : ''}${c.document ? ` · <a href="${escapeHtml(c.document)}" target="_blank" rel="noopener">documento</a>` : ''}</li>`).join('')}</ul>`]);
  const sizeList = [...new Set(product.sizes.map((v) => v.size))];
  const table = cat.isPants ? CONTENT.tableHtml(CONTENT.SIZE_TABLES.pantalon) : CONTENT.tableHtml(CONTENT.SIZE_TABLES.camisas);
  sections.push(['tallas', 'Tallas', `<p>Tallas disponibles en este modelo: <strong>${sizeList.map(escapeHtml).join(' · ')}</strong>.</p>${table}<p><a class="pdp-link" href="/guia-de-tallas">Ver la guía completa: cómo medir y elegir talla</a></p>`]);
  sections.push(['cuidados', 'Cuidados', `<p>${escapeHtml(product.care || 'Lava al revés con agua fría, sin cloro, y seca a la sombra. Plancha a temperatura media si hace falta.')}</p>`]);
  const ship = settings.shipping || {};
  const shipText = ship.summary || 'Enviamos a todo México por paquetería. Preparamos tu pedido en 1 a 2 días hábiles y la entrega tarda de 3 a 7 días hábiles según el destino. También puedes recoger sin costo en la tienda de Monterrey.';
  sections.push(['envios', 'Envíos', `<p>${escapeHtml(shipText)}</p><p><a class="pdp-link" href="/envios-y-devoluciones.html">Política completa de envíos</a></p>`]);
  sections.push(['cambios', 'Cambios y devoluciones', `<p>Cambio de talla dentro de 15 días con la prenda sin usar, sin lavar y con etiquetas. En tienda no tiene costo; por paquetería el cliente cubre el envío de ida y vuelta. Las prendas personalizadas (bordado o DTF) no tienen cambio salvo defecto de fabricación.</p><p><a class="pdp-link" href="/envios-y-devoluciones.html#cambios">Cómo solicitar un cambio</a></p>`]);
  sections.push(['facturacion', 'Facturación', '<p>Facturamos (CFDI). Al pagar marca <strong>Necesito factura</strong> en el carrito y captura RFC, razón social, código postal fiscal, régimen y uso de CFDI. La factura llega al correo que indiques.</p>']);
  sections.push(['mayoreo', 'Mayoreo y empresas', `<p>El precio que ves es de cliente final con IVA incluido. ${product.wholesale ? `Precio de mayoreo de <strong>${money(product.wholesale.priceCents)}</strong> por pieza a partir de ${product.wholesale.minQty} piezas. ` : ''}Para distribuidores y compras por volumen manejamos <strong>precios de distribuidor y de socio</strong> por grupo de tallas. Cotizamos corridas para cuadrillas, plantas y talleres, con facturación y entrega a todo México.</p><p><a class="btn btn-primary" href="/empresas">Cotizar para empresa</a></p>`]);
  const rvs = approvedReviews(product.id);
  const rsum = ratingSummary(rvs);
  sections.push(['resenas', 'Reseñas de clientes', rvs.length
    ? `<p class="pdp-rating">${starsHtml(Math.round(rsum.avg))} <b>${rsum.avg}</b> de 5 · ${rsum.count} reseña${rsum.count === 1 ? '' : 's'} de compra verificada</p><ul class="pdp-reviews">${rvs.slice(0, 20).map((r) => `<li><div class="pdp-review-head">${starsHtml(r.rating)} <strong>${escapeHtml(r.displayName)}</strong> <span class="pdp-verified">Compra verificada</span> <time datetime="${r.createdAt.slice(0, 10)}">${fmtLongDate(r.createdAt)}</time></div><p>${escapeHtml(r.comment)}</p></li>`).join('')}</ul>`
    : '<p>Todavía no hay reseñas de este modelo. Cada cliente recibe un enlace para calificar su compra cuando le entregamos el pedido; solo publicamos reseñas de compras reales.</p>']);
  sections.push(['personalizacion', 'Personalización', `<p>${escapeHtml(product.customization || 'Bordado o estampado DTF con el logotipo de tu empresa en pedidos de mayoreo. Cuéntanos qué necesitas y te cotizamos.')}</p>`]);

  const related = publicProducts().filter((p) => p.id !== product.id && p.category === product.category).slice(0, 3);
  const others = related.length ? related : publicProducts().filter((p) => p.id !== product.id).slice(0, 3);
  const relatedHtml = others.length ? `<section class="pdp-related" id="relacionados"><h2>También te puede servir</h2><div class="products-grid products-grid--static">${others.map((p) => productCardStatic(p, origin)).join('')}</div></section>` : '';

  const jsonld = productJsonLd(product, origin, url);
  const template = fs.readFileSync(path.join(__dirname, 'producto.html'), 'utf-8');
  return fill(template, {
    TITLE: escapeHtml(title),
    DESCRIPTION: escapeHtml(desc),
    CANONICAL: url,
    IMAGE: `${origin}/${images[0]}`,
    LCP_IMAGE: `/img/800/${images[0]}`,
    PRICE_PLAIN: (product.priceCents / 100).toFixed(2),
    PRICE_PLAIN_MXN: money(product.priceCents),
    ASSET_V,
    JSONLD: JSON.stringify(jsonld),
    CART_DRAWER: cartDrawerHtml(),
    CATEGORY: escapeHtml(cat.name),
    CATEGORY_URL: cat.url,
    NAME: escapeHtml(product.name),
    NAME_SHORT: escapeHtml(product.name.length > 34 ? `${product.name.slice(0, 32)}…` : product.name),
    NAME_URL: encodeURIComponent(product.name),
    ID: product.id,
    TAG: product.tag === 'nuevo' ? '<span class="product-tag product-tag--nuevo">Nuevo</span>' : product.tag === 'oferta' ? '<span class="product-tag product-tag--oferta">Oferta</span>' : '',
    MAIN_SRC: `/img/800/${images[0]}`,
    MAIN_SRCSET: `/img/480/${images[0]} 480w, /img/800/${images[0]} 800w, /img/1000/${images[0]} 1000w`,
    THUMBS: thumbs,
    VIDEO: video,
    SKU_KICKER: product.sku ? ` · ${escapeHtml(product.sku)}` : '',
    PRICE_HTML: priceHtml,
    WHOLESALE_LINE: priceBySize + wholesaleLine,
    AVAIL_CLASS: avail.cls,
    AVAIL_TEXT: avail.text,
    SHORT_DESC: escapeHtml(product.description),
    SIZE_PICKER: sizePicker,
    DISABLED: totalStock <= 0 ? 'disabled' : '',
    ADD_LABEL: totalStock <= 0 ? 'Agotado' : 'Agregar al carrito',
    JUMP_LINKS: sections.map(([id, t]) => `<a href="#${id}">${t}</a>`).join(''),
    SECTIONS: sections.map(([id, t, body]) => pdpSection(id, t, body)).join(''),
    RELATED: relatedHtml,
  });
}

app.get('/producto/:id', (req, res) => {
  const product = publicProducts().find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
    return;
  }
  res.set('Cache-Control', 'no-cache');
  res.send(renderProductPage(product, req));
});

// Ficha técnica imprimible (el navegador la guarda como PDF). Solo muestra datos confirmados.
app.get('/producto/:id/ficha', (req, res) => {
  const product = publicProducts().find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
    return;
  }
  const origin = CANONICAL_HOST ? `https://${CANONICAL_HOST}` : `${req.protocol}://${req.get('host')}`;
  const settings = getSettings();
  const images = productImages(product);
  trackEvent('technical_sheet_downloaded', { item: product.id });
  const specRows = productSpecRows(product);
  const colors = [...new Set(product.sizes.map((v) => v.color).filter(Boolean))];
  const template = fs.readFileSync(path.join(__dirname, 'ficha.html'), 'utf-8');
  res.set('Cache-Control', 'no-cache');
  res.send(fill(template, {
    NAME: escapeHtml(product.name),
    ID: product.id,
    CANONICAL: `${origin}/producto/${product.id}`,
    CATEGORY: escapeHtml(categoryOf(product).name),
    SKU_LINE: [product.sku ? `SKU ${escapeHtml(product.sku)}` : '', product.specs?.internalCode ? `Código interno ${escapeHtml(product.specs.internalCode)}` : '', `workjeans.mx/producto/${product.id}`].filter(Boolean).join(' · '),
    IMAGE: `/img/800/${images[0]}`,
    EXTRA_PHOTOS: images.slice(1, 3).map((img) => `<img class="photo" style="margin-top:10px" src="/img/480/${img}" alt="" width="480" height="600">`).join(''),
    DESCRIPTION: escapeHtml(product.longDescription || product.description),
    FEATURES: product.features?.length ? `<h2>Características</h2><ul>${product.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>` : '',
    SPECS: specRows.length ? `<h2>Especificaciones</h2><table>${specRows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}</table>` : '<h2>Especificaciones</h2><p class="pending">Especificaciones técnicas en proceso de confirmación.</p>',
    SIZES: [...new Set(product.sizes.map((v) => v.size))].map((x) => `<span>${escapeHtml(x)}</span>`).join(''),
    COLORS: colors.length ? `<h2>Colores</h2><p>${colors.map(escapeHtml).join(' · ')}</p>` : '',
    CERTS: product.certifications?.length ? `<h2>Certificaciones</h2><ul>${product.certifications.map((c) => `<li>${escapeHtml(c.name)}${c.number ? ` · ${escapeHtml(c.number)}` : ''}${c.body ? ` · ${escapeHtml(c.body)}` : ''}${c.validUntil ? ` · vigente hasta ${escapeHtml(c.validUntil)}` : ''}</li>`).join('')}</ul>` : '',
    CARE: `<h2>Cuidados</h2><p>${escapeHtml(product.care || 'Lava al revés con agua fría, sin cloro, y seca a la sombra.')}</p>`,
    CUSTOMIZATION: `<h2>Personalización</h2><p>${escapeHtml(product.customization || 'Bordado o estampado DTF con logotipo en pedidos de mayoreo.')}</p>`,
    PRICE_BLOCK: `<h2>Precio</h2><p>${money(product.priceCents)} MXN por pieza${product.wholesale ? ` · mayoreo ${money(product.wholesale.priceCents)} a partir de ${product.wholesale.minQty} piezas` : ''}. Precios sujetos a cambio sin previo aviso.</p>`,
    ADDRESS: escapeHtml(settings.address || ''),
    PHONE: escapeHtml(settings.phoneDisplay || ''),
    DATE: new Date().toLocaleDateString('es-MX', { dateStyle: 'long' }),
  }));
});

// --- Páginas de categoría (renderizadas en el servidor para SEO) ---

const CATEGORY_PAGES = {
  'pantalones-de-trabajo': {
    category: 'Pantalones',
    kicker: 'Pantalones de trabajo · Work jeans',
    panelNum: '01',
    facts: [['Tela', 'Mezclilla 100% algodón'], ['Tallas', '28 a 50'], ['Bolsas', 'Cinco, reforzadas'], ['Reflejante', 'Verde o naranja, opcional'], ['Compra', 'Desde una pieza']],
    h1: 'Pantalones de trabajo',
    h1Html: 'Pantalones<br>de trabajo.',
    title: 'Pantalones de Trabajo de Mezclilla (Work Jeans) | Works Jeans Monterrey',
    description: 'Pantalones de trabajo de mezclilla 100% algodón, corte recto y costuras reforzadas. Con opción de cintas reflejantes. Tallas 28 a 50. Mayoreo con stock inmediato en Monterrey y envíos a todo México.',
    intro: 'Pantalones de trabajo de mezclilla 100% algodón, hechos en Monterrey para aguantar la obra, la planta y el taller. Cinco bolsas, costuras reforzadas y corte recto que deja moverse. Tallas del 28 al 50: compra desde una pieza o pide la corrida completa para tu cuadrilla.',
    faq: [
      ['¿Qué talla de pantalón de trabajo debo pedir?', 'La misma que usas en un jean normal. Si dudas entre dos, elige la mayor: la mezclilla no encoge y en el trabajo se agradece el espacio. Consulta la guía de tallas para medir un pantalón que te quede bien.'],
      ['¿Aguanta el lavado diario?', 'Sí. Es mezclilla 100% algodón preencogida con costuras dobles. Lava al revés, con agua fría y sin cloro, para que conserve color y costuras por más tiempo.'],
      ['¿Hacen pantalones de trabajo con logotipo?', 'Sí, bordado o estampado DTF para pedidos de mayoreo. Cotízalo desde el cotizador o por WhatsApp.'],
      ['¿Envían a todo México?', 'Sí, por paquetería con número de guía. En Monterrey también puedes recoger en tienda.'],
    ],
    seoText: `
      <h2>Pantalones de mezclilla para trabajar, no para lucir</h2>
      <p>Un pantalón de trabajo tiene que aguantar jornadas completas de agacharse, cargar, arrodillarse y rozar contra superficies ásperas. Por eso nuestros work jeans se fabrican con mezclilla 100% algodón de mayor peso, costuras dobles reforzadas en tiro, entrepierna y bolsas, y acabado preencogido para que la talla que compras sea la talla que se queda después de lavarlos.</p>
      <h2>Pantalones de trabajo con reflejante</h2>
      <p>Para vialidades, plantas industriales y turnos de noche ofrecemos el mismo pantalón con cintas reflejantes en verde o naranja cosidas en las piernas, para que te vean con poca luz. No son prendas certificadas de alta visibilidad (ANSI/ISEA 107 o ISO 20471); si tu planta exige certificación, consúltanos antes. Conservan la comodidad y resistencia de la mezclilla.</p>
      <h2>Pantalones de trabajo por industria</h2>
      <ul>
        <li><strong>Construcción y obra:</strong> mezclilla pesada que aguanta concreto, varilla y arrodillarse; versión reflejante para trabajo junto a maquinaria.</li>
        <li><strong>Manufactura y planta:</strong> corte recto sin partes sueltas, cinco bolsas útiles y tallas hasta la 50 para uniformar a toda la línea.</li>
        <li><strong>Mantenimiento y talleres:</strong> resistente a grasa y lavado frecuente; el color se asienta, no se destiñe a manchones.</li>
        <li><strong>Logística y patios:</strong> reflejante naranja o verde para estar visible entre montacargas y tráileres.</li>
      </ul>
      <h2>Normal o reflejante: cuál elegir</h2>
      <div class="table-scroll"><table class="content-table">
        <thead><tr><th></th><th>Pantalón de trabajo</th><th>Pantalón reflejante</th></tr></thead>
        <tbody>
          <tr><td>Tela</td><td>Mezclilla 100% algodón</td><td>Mezclilla 100% algodón</td></tr>
          <tr><td>Costuras</td><td>Dobles, reforzadas</td><td>Dobles, reforzadas</td></tr>
          <tr><td>Cintas reflejantes</td><td>No</td><td>Sí, en ambas piernas (verde o naranja)</td></tr>
          <tr><td>Uso recomendado</td><td>Obra, planta, taller, campo</td><td>Vialidades, patios, turnos de noche</td></tr>
          <tr><td>Tallas</td><td>28 a 50</td><td>28 a 50</td></tr>
        </tbody>
      </table></div>
      <h2>Uniformes de trabajo por mayoreo en Monterrey</h2>
      <p>Surtimos empresas, contratistas y distribuidores con stock inmediato y corridas completas de tallas. Podemos bordar o estampar el logotipo de tu empresa. Arma tu pedido por talla en el <a href="/empresas">cotizador de mayoreo</a> y recibe la cotización por WhatsApp. Enviamos a todo México desde nuestra tienda en Monterrey.</p>
      <p>Lee también: <a href="/articulos/work-jeans-vs-pantalon-de-mezclilla-normal">work jeans vs. pantalón de mezclilla normal</a> y la <a href="/guia-de-tallas">guía de tallas</a>.</p>
    `,
  },
  'camisas-de-trabajo': {
    category: 'Camisas',
    kicker: 'Camisas de trabajo · Mezclilla',
    panelNum: '02',
    facts: [['Tela', 'Mezclilla 100% algodón'], ['Tallas', 'XCH a 5XG'], ['Botones', 'Reforzados'], ['Reflejante', 'Verde o naranja, opcional'], ['Compra', 'Desde una pieza']],
    h1: 'Camisas de trabajo',
    h1Html: 'Camisas<br>de trabajo.',
    title: 'Camisas de Trabajo de Mezclilla con Reflejante | Works Jeans Monterrey',
    description: 'Camisas de trabajo de mezclilla 100% algodón con botones reforzados y opción de cintas reflejantes. Tallas XCH a 5XG. Mayoreo con stock inmediato en Monterrey y envíos a todo México.',
    intro: 'Camisas de mezclilla para uso industrial: algodón 100%, bolsillo frontal, botones reforzados y acabado preencogido. De la XCH a la 5XG, con o sin reflejante.',
    seoText: `
      <h2>Camisas de mezclilla para uso industrial</h2>
      <p>La camisa de trabajo de mezclilla protege más que una playera y respira mejor que una tela sintética. Las nuestras llevan botones reforzados que no se desprenden, bolsillo frontal útil y un corte que permite mover los brazos con libertad. Van del XCH al 5XG para que toda tu cuadrilla uniforme igual.</p>
      <h2>Camisas con cintas reflejantes</h2>
      <p>Las versiones reflejantes tienen cintas cosidas en pecho y mangas, en verde o naranja, para entornos de poca luz. Combinan con nuestros <a href="/pantalones-de-trabajo">pantalones de trabajo</a> reflejantes para un uniforme completo.</p>
      <h2>Personalización con tu logotipo</h2>
      <p>Bordamos o estampamos en DTF el logotipo de tu empresa. Pide tu cotización de mayoreo con corrida de tallas en el <a href="/empresas">cotizador</a> o escríbenos por WhatsApp desde Monterrey; enviamos a todo México.</p>
    `,
  },
};

function productCardStatic(p, origin) {
  const first = p.sizes[0]?.size || '';
  const last = p.sizes[p.sizes.length - 1]?.size || '';
  const price = (p.priceCents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  return `
    <a class="product-card product-card--static" href="/producto/${p.id}">
      <span class="product-category">${escapeHtml(p.category)}</span>
      <img src="${p.image}" alt="${escapeHtml(p.name)} · ropa de trabajo de mezclilla Works Jeans" class="product-photo" loading="lazy" decoding="async" width="800" height="1000">
      <h2>${escapeHtml(p.name)}</h2>
      <p class="product-sizes">Tallas <b>${escapeHtml(first)}</b>${last && last !== first ? ` / <b>${escapeHtml(last)}</b>` : ''}</p>
      <p class="price">${price}<small>MXN</small></p>
      <p class="product-desc">${escapeHtml(p.description)}</p>
      <span class="btn btn-dark">Ver producto</span>
    </a>`;
}

function categoryPageFor(slug) {
  if (CATEGORY_PAGES[slug]) return CATEGORY_PAGES[slug];
  let cats = [];
  try { cats = getSettings().categories || []; } catch { cats = []; }
  const c = cats.find((x) => x.slug === slug);
  if (!c) return null;
  return {
    category: c.name,
    kicker: `${c.name} · Ropa de trabajo`,
    h1: `${c.name} de trabajo`,
    h1Html: `${escapeHtml(c.name)}<br>de trabajo.`,
    title: `${c.name} de Trabajo | Works Jeans Monterrey`,
    description: `${c.name} de trabajo de Works Jeans: ropa de mezclilla resistente hecha en Monterrey, mayoreo con stock inmediato y envíos a todo México.`,
    intro: `${c.name} de trabajo hechos en Monterrey con mezclilla 100% algodón y costuras reforzadas.`,
    seoText: `<p>Consulta tallas, precios de mayoreo y personalización con tu logotipo. Arma tu pedido en el <a href="/empresas">cotizador de mayoreo</a> o escríbenos por WhatsApp.</p>`,
  };
}

function renderCategoryPage(req, res, slug, page) {
  const origin = CANONICAL_HOST ? `https://${CANONICAL_HOST}` : `${req.protocol}://${req.get('host')}`;
  const products = publicProducts().filter((p) => p.category === page.category);
  const canonical = `${origin}/${slug}`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonical}#pagina`,
        name: page.h1,
        description: page.description,
        url: canonical,
        isPartOf: { '@id': `${origin}/#sitio` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: page.h1, item: canonical },
        ],
      },
      {
        '@type': 'ItemList',
        itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${origin}/producto/${p.id}` })),
      },
      ...(page.faq ? [{ '@type': 'FAQPage', mainEntity: page.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] : []),
    ],
  };
  const faqHtml = page.faq ? `<h2>Preguntas frecuentes sobre ${page.h1.toLowerCase()}</h2>${page.faq.map(([q, a]) => `<details class="faq-item"><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join('')}` : '';
  let html = fs.readFileSync(path.join(__dirname, 'categoria.html'), 'utf-8');
  const fill = {
    TITLE: escapeHtml(page.title),
    DESCRIPTION: escapeHtml(page.description),
    CANONICAL: canonical,
    IMAGE: products[0] ? `${origin}/${products[0].image}` : `${origin}/assets/img/og-works-jeans.jpg`,
    JSONLD: JSON.stringify(jsonld),
    KICKER: escapeHtml(page.kicker),
    H1: escapeHtml(page.h1),
    H1_HTML: page.h1Html,
    INTRO: escapeHtml(page.intro),
    PANEL_NUM: escapeHtml(page.panelNum || String(products.length).padStart(2, '0')),
    FACTS: (page.facts || [['Tela', 'Mezclilla 100% algodón'], ['Modelos', String(products.length)], ['Compra', 'Desde una pieza']]).map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join(''),
    CARDS: products.map((p) => productCardStatic(p, origin)).join('') || '<p class="products-loading">Pronto tendremos productos en esta categoría.</p>',
    SEO_TEXT: page.seoText + faqHtml,
  };
  for (const [key, value] of Object.entries(fill)) html = html.split(`{{${key}}}`).join(value);
  res.set('Cache-Control', 'no-cache');
  res.send(html);
}

app.get('/:slug(pantalones-de-trabajo|camisas-de-trabajo)', (req, res) => renderCategoryPage(req, res, req.params.slug, CATEGORY_PAGES[req.params.slug]));

// --- Feed de productos para Google Merchant Center (RSS 2.0 con espacio de nombres g:) ---
app.get('/feed/google-merchant.xml', (req, res) => {
  const origin = CANONICAL_HOST ? `https://${CANONICAL_HOST}` : `${req.protocol}://${req.get('host')}`;
  const x = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const items = [];
  for (const p of publicProducts()) {
    const images = (p.images && p.images.length ? p.images : [p.image]).map((i) => `${origin}/${i}`);
    for (const s of p.sizes) {
      items.push(`
    <item>
      <g:id>${x(`${p.id}-${s.size}`)}</g:id>
      <g:item_group_id>${x(p.id)}</g:item_group_id>
      <g:title>${x(`${p.name} talla ${s.size}`)}</g:title>
      <g:description>${x(p.description)}</g:description>
      <g:link>${origin}/producto/${x(p.id)}</g:link>
      <g:image_link>${x(images[0])}</g:image_link>
      ${images.slice(1).map((i) => `<g:additional_image_link>${x(i)}</g:additional_image_link>`).join('')}
      <g:availability>${s.stock > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:price>${(productPrice(p, s) / 100).toFixed(2)} MXN</g:price>
      <g:brand>Works Jeans</g:brand>
      <g:condition>new</g:condition>
      <g:size>${x(s.length ? `${s.size} x ${s.length}` : s.size)}</g:size>
      ${s.color ? `<g:color>${x(s.color)}</g:color>` : ''}
      ${s.sku ? `<g:mpn>${x(s.sku)}</g:mpn>` : ''}
      <g:gender>unisex</g:gender>
      <g:age_group>adult</g:age_group>
      <g:material>Mezclilla 100% algodón</g:material>
      <g:google_product_category>${p.category === 'Pantalones' ? '204' : '212'}</g:google_product_category>
      <g:product_type>${x(p.category === 'Pantalones' ? 'Ropa de trabajo > Pantalones de trabajo' : 'Ropa de trabajo > Camisas de trabajo')}</g:product_type>
    </item>`);
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Works Jeans</title>
    <link>${origin}/</link>
    <description>Pantalones y camisas de trabajo de mezclilla</description>${items.join('')}
  </channel>
</rss>
`;
  res.type('application/xml').send(xml);
});

// --- Landings y artículos de contenido (contenido.js) ---

const ALL_PAGES = () => ({ ...CONTENT.LANDINGS, ...articlesMap() });

// --- Artículos editables desde el panel (articles.json). Los de contenido.js se copian una vez y luego manda el panel. ---
const PRODUCT_FILTERS = {
  none: null,
  all: () => true,
  pantalones: (p) => p.category === 'Pantalones',
  camisas: (p) => p.category === 'Camisas',
  reflejante: (p) => /reflejante/.test(p.id),
};
const STATIC_FILTER_BY_SLUG = { 'work-jeans-vs-pantalon-de-mezclilla-normal': 'pantalones', 'ropa-de-trabajo-y-normas-de-seguridad-en-mexico': 'reflejante', 'como-elegir-talla-de-uniforme-para-tu-cuadrilla': 'all', 'ropa-reflejante-de-trabajo-cuando-ayuda-y-que-no-es': 'reflejante', 'camisa-de-mezclilla-o-de-poliester-para-trabajar-en-planta': 'camisas', 'bordado-o-dtf-como-poner-tu-logotipo-en-uniformes-de-trabajo': 'all', 'que-preguntar-antes-de-comprar-ropa-de-trabajo-por-mayoreo': 'all', 'como-cuidar-la-ropa-de-trabajo-de-mezclilla-para-que-dure-mas': 'all' };

const getArticles = () => readJsonList(ARTICLES_PATH);
const saveArticles = (list) => fs.writeFileSync(ARTICLES_PATH, JSON.stringify(list, null, 2) + '\n');

// Texto del panel → HTML seguro. Acepta HTML sencillo o un formato ligero: "## Título", "- viñeta", párrafos separados por línea en blanco, **negritas**, [texto](url).
const ALLOWED_TAGS = new Set(['h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'a', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'details', 'summary', 'div', 'span']);
function sanitizeHtml(html) {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|button|link|meta)[\s\S]*?(<\/\1>|$)/gi, '')
    .replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (m, tag, attrs) => {
      const t = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(t)) return '';
      if (m.startsWith('</')) return `</${t}>`;
      let keep = '';
      if (t === 'a') {
        const href = (attrs.match(/href\s*=\s*"([^"]*)"/i) || attrs.match(/href\s*=\s*'([^']*)'/i) || [])[1] || '';
        if (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(href) && !/javascript:/i.test(href)) keep = ` href="${href.replace(/"/g, '&quot;')}"${/^https?:\/\//i.test(href) && !href.includes('workjeans.mx') ? ' target="_blank" rel="noopener"' : ''}`;
      }
      const cls = (attrs.match(/class\s*=\s*"([a-zA-Z0-9 _-]*)"/i) || [])[1];
      if (cls) keep += ` class="${cls}"`;
      return `<${t}${keep}>`;
    });
}
function markdownLite(text) {
  const esc = (t) => escapeHtml(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2">$1</a>');
  const blocks = String(text || '').replace(/\r/g, '').split(/\n{2,}/);
  return blocks.map((b) => {
    const lines = b.split('\n').filter((l) => l.trim());
    if (!lines.length) return '';
    if (lines.every((l) => /^[-*] /.test(l))) return `<ul>${lines.map((l) => `<li>${esc(l.replace(/^[-*] /, ''))}</li>`).join('')}</ul>`;
    if (lines.every((l) => /^\d+[.)] /.test(l))) return `<ol>${lines.map((l) => `<li>${esc(l.replace(/^\d+[.)] /, ''))}</li>`).join('')}</ol>`;
    return lines.map((l) => (/^### /.test(l) ? `<h3>${esc(l.slice(4))}</h3>` : /^## /.test(l) ? `<h2>${esc(l.slice(3))}</h2>` : `<p>${esc(l)}</p>`)).join('');
  }).join('\n');
}
function articleBodyHtml(source) {
  // Si el texto trae bloques HTML (p, h2, ul…) se limpia como HTML; si no, se interpreta el formato ligero y cualquier etiqueta se muestra como texto.
  return /<(h2|h3|p|ul|ol|table|div|blockquote)[\s>]/i.test(source || '') ? sanitizeHtml(source) : markdownLite(source);
}
function readingStats(html) {
  const words = String(html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return { words, readingMinutes: Math.max(1, Math.round(words / 200)) };
}

// Los artículos escritos en contenido.js se agregan a articles.json si aún no existen (sin pisar ediciones del panel).
try {
  const list = getArticles();
  let changed = false;
  for (const [slug, a] of Object.entries(CONTENT.ARTICLES)) {
    if (list.some((x) => x.slug === slug)) continue;
    list.push({ slug, kicker: a.kicker, h1: a.h1, title: a.title, description: a.description, intro: a.intro, bodySource: a.body.trim(), faq: a.faq || [], productsFilter: STATIC_FILTER_BY_SLUG[slug] || 'none', status: 'publicado', publishedAt: CONTENT.PUBLISHED, updatedAt: CONTENT.PUBLISHED, author: 'Works Jeans' });
    changed = true;
  }
  if (changed) saveArticles(list);
} catch {
  // Sin artículos aún.
}

function articleToPage(a) {
  const html = articleBodyHtml(a.bodySource);
  return { kicker: a.kicker || 'Artículo', h1: a.h1, h1Html: escapeHtml(a.h1), title: a.title || `${a.h1} | Works Jeans`, description: a.description || '', intro: a.intro || '', products: PRODUCT_FILTERS[a.productsFilter] || null, body: html, faq: a.faq && a.faq.length ? a.faq : null, publishedAt: a.publishedAt, updatedAt: a.updatedAt, author: a.author || 'Works Jeans', ...readingStats(html) };
}
function publishedArticles() {
  const today = new Date().toISOString().slice(0, 10);
  return getArticles().filter((a) => a.status === 'publicado' && (!a.publishedAt || a.publishedAt <= today)).sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
}
function articlesMap() {
  return Object.fromEntries(publishedArticles().map((a) => [a.slug, articleToPage(a)]));
}

function relatedLinks(currentSlug) {
  const items = [
    ['/pantalones-de-trabajo', 'Pantalones de trabajo'],
    ['/camisas-de-trabajo', 'Camisas de trabajo'],
    ...Object.entries(CONTENT.LANDINGS).map(([slug, p]) => [`/${slug}`, p.h1]),
    ...Object.entries(articlesMap()).map(([slug, p]) => [`/articulos/${slug}`, p.h1]),
  ];
  return items.filter(([href]) => !href.endsWith(`/${currentSlug}`)).slice(0, 8).map(([href, label]) => `<li><a href="${href}">${escapeHtml(label)}</a></li>`).join('');
}

function fmtLongDate(iso) {
  try { return new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', { dateStyle: 'long' }); } catch { return iso; }
}

function renderContentPage(req, res, slug, page, { isArticle }) {
  const origin = CANONICAL_HOST ? `https://${CANONICAL_HOST}` : `${req.protocol}://${req.get('host')}`;
  const canonical = isArticle ? `${origin}/articulos/${slug}` : `${origin}/${slug}`;
  const products = page.products ? publicProducts().filter(page.products) : [];
  const image = products[0] ? `${origin}/${products[0].image}` : `${origin}/assets/img/og-works-jeans.jpg`;
  const crumbs = [{ name: 'Inicio', item: `${origin}/` }];
  if (isArticle) crumbs.push({ name: 'Artículos', item: `${origin}/articulos` });
  crumbs.push({ name: page.h1, item: canonical });
  const graph = [
    {
      '@type': isArticle ? 'Article' : 'WebPage',
      '@id': `${canonical}#pagina`,
      headline: page.h1,
      name: page.h1,
      description: page.description,
      url: canonical,
      inLanguage: 'es-MX',
      isPartOf: { '@id': `${origin}/#sitio` },
      ...(isArticle ? { datePublished: page.publishedAt || CONTENT.PUBLISHED, dateModified: page.updatedAt || page.publishedAt || CONTENT.PUBLISHED, author: { '@type': 'Organization', name: page.author || 'Works Jeans', '@id': `${origin}/#negocio` }, publisher: { '@id': `${origin}/#negocio` }, image, ...(page.words ? { wordCount: page.words } : {}) } : {}),
    },
    { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })) },
  ];
  if (page.faq) {
    graph.push({ '@type': 'FAQPage', mainEntity: page.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  }
  let body = page.body
    .replace('{{TABLA_CAMISAS}}', CONTENT.tableHtml(CONTENT.SIZE_TABLES.camisas))
    .replace('{{TABLA_PANTALON}}', CONTENT.tableHtml(CONTENT.SIZE_TABLES.pantalon));
  if (page.faq) {
    body += `<h2>Preguntas frecuentes</h2>${page.faq.map(([q, a]) => `<details class="faq-item"><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join('')}`;
  }
  let html = fs.readFileSync(path.join(__dirname, 'pagina.html'), 'utf-8');
  const fill = {
    TITLE: escapeHtml(page.title),
    DESCRIPTION: escapeHtml(page.description),
    CANONICAL: canonical,
    OG_TYPE: isArticle ? 'article' : 'website',
    IMAGE: image,
    JSONLD: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
    BREADCRUMBS: crumbs.map((c, i) => (i < crumbs.length - 1 ? `<a href="${c.item}">${escapeHtml(c.name)}</a> <span>/</span> ` : `<span aria-current="page">${escapeHtml(c.name)}</span>`)).join(''),
    KICKER: escapeHtml(page.kicker),
    H1_HTML: page.h1Html,
    INTRO: escapeHtml(page.intro),
    META: isArticle ? `<p class="article-meta">Por <strong>${escapeHtml(page.author || 'Works Jeans')}</strong> · Publicado el ${fmtLongDate(page.publishedAt || CONTENT.PUBLISHED)}${page.updatedAt && page.updatedAt !== page.publishedAt ? ` · Actualizado el ${fmtLongDate(page.updatedAt)}` : ''}${page.readingMinutes ? ` · ${page.readingMinutes} min de lectura` : ''}</p>` : '',
    BODY: body,
    PRODUCTS_BLOCK: products.length ? `<section class="content-products"><h2>Productos relacionados</h2><div class="products-grid products-grid--static">${products.map((p) => productCardStatic(p, origin)).join('')}</div></section>` : '',
    RELATED: relatedLinks(slug),
  };
  for (const [key, value] of Object.entries(fill)) html = html.split(`{{${key}}}`).join(value);
  res.set('Cache-Control', 'no-cache');
  res.send(html);
}

app.get('/articulos', (req, res) => {
  const origin = CANONICAL_HOST ? `https://${CANONICAL_HOST}` : `${req.protocol}://${req.get('host')}`;
  const list = Object.entries(articlesMap()).map(([slug, a]) => `
    <a class="article-card" href="/articulos/${slug}">
      <span class="kicker">${escapeHtml(a.kicker)} · ${fmtLongDate(a.publishedAt)} · ${a.readingMinutes} min</span>
      <h2>${escapeHtml(a.h1)}</h2>
      <p>${escapeHtml(a.description)}</p>
      <span class="article-more">Leer artículo</span>
    </a>`).join('');
  renderContentPage(req, res, 'articulos', {
    kicker: 'Artículos',
    h1: 'Artículos sobre ropa de trabajo',
    h1Html: 'Artículos.',
    title: 'Artículos sobre Ropa de Trabajo, Uniformes y Seguridad | Works Jeans',
    description: 'Guías prácticas sobre pantalones de trabajo, work jeans, tallas de uniforme y normas de seguridad en México, escritas por Works Jeans, fabricante en Monterrey.',
    intro: 'Guías cortas y prácticas para quien compra o usa ropa de trabajo.',
    products: null,
    body: `<div class="article-list">${list}</div>`,
  }, { isArticle: false });
});

app.get('/articulos/:slug', (req, res, next) => {
  let page = articlesMap()[req.params.slug];
  if (!page && req.query.preview !== undefined && loadSessionUser(req)) {
    const draft = getArticles().find((a) => a.slug === req.params.slug);
    if (draft) page = articleToPage(draft);
  }
  if (!page) return next();
  renderContentPage(req, res, req.params.slug, page, { isArticle: true });
});

app.get('/:slug', (req, res, next) => {
  const page = CONTENT.LANDINGS[req.params.slug];
  if (page) return renderContentPage(req, res, req.params.slug, page, { isArticle: false });
  const cat = categoryPageFor(req.params.slug);
  if (!cat || CATEGORY_PAGES[req.params.slug]) return next();
  req.params.slug = req.params.slug;
  return renderCategoryPage(req, res, req.params.slug, cat);
});

app.get('/sitemap.xml', (req, res) => {
  const origin = CANONICAL_HOST ? `https://${CANONICAL_HOST}` : `${req.protocol}://${req.get('host')}`;
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${origin}/`, priority: '1.0' },
    { loc: `${origin}/pantalones-de-trabajo`, priority: '0.9' },
    { loc: `${origin}/camisas-de-trabajo`, priority: '0.9' },
    ...Object.keys(CONTENT.LANDINGS).map((slug) => ({ loc: `${origin}/${slug}`, priority: '0.8' })),
    { loc: `${origin}/empresas`, priority: '0.9' },
    { loc: `${origin}/articulos`, priority: '0.6' },
    ...publishedArticles().map((a) => ({ loc: `${origin}/articulos/${a.slug}`, priority: '0.7', lastmod: a.updatedAt || a.publishedAt })),
    ...publicProducts().map((p) => ({ loc: `${origin}/producto/${p.id}`, priority: '0.8' })),
    { loc: `${origin}/aviso-de-privacidad.html`, priority: '0.3' },
    { loc: `${origin}/envios-y-devoluciones.html`, priority: '0.3' },
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod || today}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`;
  res.type('application/xml').send(xml);
});

app.get('/products.json', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json(publicProducts());
});
app.get('/settings.json', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json(publicSettings());
});
if (USES_EXTERNAL_DATA) {
  app.use('/assets/products', express.static(PRODUCTS_IMG_DIR, { maxAge: '30d' }));
}
app.use('/assets', express.static(path.join(__dirname, 'assets'), { maxAge: '30d', dotfiles: 'deny' }));
app.use(express.static(__dirname, {
  dotfiles: 'deny',
  extensions: ['html'],
  // HTML, CSS y JS cambian con cada deploy: el navegador y Cloudflare deben revalidar (ETag) en vez de guardar copias por horas.
  setHeaders: (res, filePath) => {
    if (/\.(html|css|js|xml|txt)$/i.test(filePath)) res.set('Cache-Control', 'public, max-age=0, must-revalidate');
  },
}));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PRODUCTS_IMG_DIR),
    filename: (req, file, cb) => {
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype] || '.jpg';
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

const IDLE_LIMIT = 3 * 60 * 60 * 1000; // 3 h sin actividad cierra la sesión

// Identifica al usuario de la sesión y valida que siga vigente (activo, sin "cerrar todas las sesiones", sin inactividad larga).
function loadSessionUser(req) {
  const sess = req.session;
  if (!sess?.uid) return null;
  if (sess.seen && Date.now() - sess.seen > IDLE_LIMIT) return null;
  const user = security.findUser(sess.uid);
  if (!user || user.active === false || user.sessionVersion !== sess.sv) return null;
  sess.seen = Date.now();
  return user;
}

function mfaEnforced(user) {
  return Boolean(getSettings().security?.requireMfaAdmins) && Boolean(SEC.ROLES[user.role]?.mfa) && !user.mfa?.enabled;
}

function requireAdmin(req, res, next) {
  const user = loadSessionUser(req);
  if (!user) {
    if (req.session?.uid) req.session.destroy(() => {});
    res.status(401).json({ error: 'No autorizado.' });
    return;
  }
  req.adminUser = user;
  const selfService = req.path.startsWith('/api/admin/me/') || req.path === '/api/admin/session' || req.path === '/api/admin/logout';
  if (!selfService && user.mustChangePassword) {
    res.status(403).json({ error: 'Debes cambiar tu contraseña antes de continuar.', code: 'password_change_required' });
    return;
  }
  if (!selfService && mfaEnforced(user)) {
    res.status(403).json({ error: 'Activa la verificación en dos pasos para continuar.', code: 'mfa_required' });
    return;
  }
  next();
}

// Permiso específico, siempre validado en el servidor.
function perm(...needed) {
  return (req, res, next) => {
    const ok = needed.some((p) => SEC.roleHas(req.adminUser.role, p));
    if (!ok) {
      res.status(403).json({ error: 'Tu usuario no tiene permiso para esta acción.', code: 'forbidden' });
      return;
    }
    next();
  };
}

function hasPerm(req, p) {
  return Boolean(req.adminUser) && SEC.roleHas(req.adminUser.role, p);
}

// Bitácora automática de todo cambio hecho desde el panel (sin contraseñas ni códigos).
app.use('/api/admin', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.adminUser) return;
    const url = req.originalUrl.split('?')[0];
    if (/^\/api\/admin\/(login|logout|me\/|users|security)/.test(url)) return; // esas rutas escriben su propia entrada
    security.audit({ action: `${req.method} ${url}`, userId: req.adminUser.id, user: req.adminUser.username, ip: clientIp(req), details: security.summarize(req.body) });
  });
  next();
});

// --- Auth ---

const MFA_MAX_TRIES = 5;

app.post('/api/admin/login', (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const users = security.getUsers();
  if (!users.length) {
    res.status(503).json({ error: 'El panel admin no está configurado (falta ADMIN_PASSWORD la primera vez).' });
    return;
  }
  // Bloqueo por IP y por usuario: 5 intentos fallidos cada 15 minutos.
  if (security.attempts.blocked(`ip:${clientIp(req)}`) || (username && security.attempts.blocked(`user:${username}`))) {
    res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.' });
    return;
  }
  // Compatibilidad: si solo existe el usuario inicial y no se manda usuario, se usa ese.
  const user = username ? security.findByUsername(username) : (users.length === 1 ? users[0] : null);
  const ok = user && user.active !== false && SEC.verifyHash(password, user.salt, user.hash);
  if (!ok) {
    security.attempts.fail(`ip:${clientIp(req)}`);
    if (username) security.attempts.fail(`user:${username}`);
    security.audit({ action: 'login.fallido', user: username || null, ip: clientIp(req) });
    res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    return;
  }
  security.attempts.clear(`ip:${clientIp(req)}`);
  security.attempts.clear(`user:${user.username}`);
  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ error: 'No se pudo iniciar la sesión.' });
      return;
    }
    if (user.mfa?.enabled) {
      req.session.mfaPending = { uid: user.id, at: Date.now(), tries: 0 };
      res.json({ ok: true, mfaRequired: true });
      return;
    }
    finishLogin(req, res, user);
  });
});

function finishLogin(req, res, user) {
  req.session.uid = user.id;
  req.session.sv = user.sessionVersion;
  req.session.seen = Date.now();
  delete req.session.mfaPending;
  security.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
  security.audit({ action: 'login', userId: user.id, user: user.username, ip: clientIp(req) });
  res.json({ ok: true, user: security.publicUser(user), mfaSuggested: Boolean(SEC.ROLES[user.role]?.mfa) && !user.mfa?.enabled });
}

app.post('/api/admin/login/mfa', (req, res) => {
  const pending = req.session.mfaPending;
  if (!pending || Date.now() - pending.at > 5 * 60 * 1000) {
    res.status(401).json({ error: 'La verificación caducó. Vuelve a iniciar sesión.' });
    return;
  }
  const user = security.findUser(pending.uid);
  if (!user || !user.mfa?.enabled) {
    res.status(401).json({ error: 'Vuelve a iniciar sesión.' });
    return;
  }
  const step = SEC.totpMatchStep(user.mfa.secret, req.body.code, user.mfa.lastStep || 0);
  if (step === null) {
    pending.tries += 1;
    security.audit({ action: 'login.mfa_fallido', userId: user.id, user: user.username, ip: clientIp(req) });
    if (pending.tries >= MFA_MAX_TRIES) {
      req.session.destroy(() => res.status(429).json({ error: 'Demasiados códigos incorrectos. Vuelve a iniciar sesión.' }));
      return;
    }
    res.status(401).json({ error: 'Código incorrecto.' });
    return;
  }
  security.updateUser(user.id, (u) => { u.mfa.lastStep = step; });
  finishLogin(req, res, user);
});

app.post('/api/admin/logout', (req, res) => {
  const user = loadSessionUser(req);
  if (user) security.audit({ action: 'logout', userId: user.id, user: user.username, ip: clientIp(req) });
  req.session.destroy(() => {
    res.clearCookie('wj.sid');
    res.json({ ok: true });
  });
});

app.get('/api/admin/session', (req, res) => {
  const user = loadSessionUser(req);
  if (!user) {
    res.json({ isAdmin: false });
    return;
  }
  res.json({
    isAdmin: true,
    user: security.publicUser(user),
    mfaRequired: mfaEnforced(user),
    mfaSuggested: Boolean(SEC.ROLES[user.role]?.mfa) && !user.mfa?.enabled,
    roles: Object.fromEntries(Object.entries(SEC.ROLES).map(([k, r]) => [k, { label: r.label, description: r.description, perms: SEC.permsForRole(k) }])),
    permissions: SEC.PERMISSIONS,
  });
});

// --- Mi cuenta ---

function changeOwnPassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = req.adminUser;
  if (!SEC.verifyHash(currentPassword, user.salt, user.hash)) {
    res.status(401).json({ error: 'La contraseña actual no es correcta.' });
    return;
  }
  const problem = SEC.passwordProblem(newPassword, user.username);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }
  if (SEC.verifyHash(newPassword, user.salt, user.hash)) {
    res.status(400).json({ error: 'La nueva contraseña debe ser distinta a la actual.' });
    return;
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const updated = security.updateUser(user.id, (u) => { u.salt = salt; u.hash = SEC.hashPassword(newPassword, salt); u.mustChangePassword = false; u.sessionVersion += 1; });
  req.session.sv = updated.sessionVersion; // esta sesión sigue; las demás se cierran
  auditLog(req, 'me.password_cambiada', {});
  res.json({ ok: true });
}
app.post('/api/admin/me/password', requireAdmin, changeOwnPassword);
app.post('/api/admin/change-password', requireAdmin, changeOwnPassword); // alias del panel anterior

app.post('/api/admin/me/logout-all', requireAdmin, (req, res) => {
  security.updateUser(req.adminUser.id, (u) => { u.sessionVersion += 1; });
  auditLog(req, 'me.cerrar_sesiones', {});
  req.session.destroy(() => {
    res.clearCookie('wj.sid');
    res.json({ ok: true });
  });
});

app.post('/api/admin/me/mfa/setup', requireAdmin, async (req, res) => {
  const secret = SEC.newTotpSecret();
  req.session.mfaSetup = { secret, at: Date.now() };
  const url = SEC.otpauthUrl(req.adminUser.username, secret);
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 220 });
  res.json({ secret, qr });
});

app.post('/api/admin/me/mfa/enable', requireAdmin, (req, res) => {
  const setup = req.session.mfaSetup;
  if (!setup || Date.now() - setup.at > 15 * 60 * 1000) {
    res.status(400).json({ error: 'Vuelve a generar el código QR.' });
    return;
  }
  const step = SEC.totpMatchStep(setup.secret, req.body.code, 0);
  if (step === null) {
    res.status(400).json({ error: 'El código no coincide. Revisa la hora de tu teléfono e inténtalo de nuevo.' });
    return;
  }
  security.updateUser(req.adminUser.id, (u) => { u.mfa = { enabled: true, secret: setup.secret, lastStep: step }; });
  delete req.session.mfaSetup;
  auditLog(req, 'me.mfa_activada', {});
  res.json({ ok: true });
});

app.post('/api/admin/me/mfa/disable', requireAdmin, (req, res) => {
  const user = req.adminUser;
  if (!SEC.verifyHash(req.body.password, user.salt, user.hash)) {
    res.status(401).json({ error: 'La contraseña no es correcta.' });
    return;
  }
  if (user.mfa?.enabled && SEC.totpMatchStep(user.mfa.secret, req.body.code, user.mfa.lastStep || 0) === null) {
    res.status(401).json({ error: 'El código de verificación no es correcto.' });
    return;
  }
  security.updateUser(user.id, (u) => { u.mfa = { enabled: false, secret: null, lastStep: 0 }; });
  auditLog(req, 'me.mfa_desactivada', {});
  res.json({ ok: true });
});

// --- Usuarios (solo super admin) ---

function activeSuperadmins(users) {
  return users.filter((u) => u.role === 'superadmin' && u.active !== false);
}

app.get('/api/admin/users', requireAdmin, perm('usuarios'), (req, res) => {
  res.json(security.getUsers().map(security.publicUser));
});

app.post('/api/admin/users', requireAdmin, perm('usuarios'), (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const name = cleanText(req.body.name, 80);
  const role = String(req.body.role || '');
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    res.status(400).json({ error: 'El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo.' });
    return;
  }
  if (!SEC.ROLES[role]) {
    res.status(400).json({ error: 'Rol inválido.' });
    return;
  }
  if (security.findByUsername(username)) {
    res.status(409).json({ error: 'Ese nombre de usuario ya existe.' });
    return;
  }
  const problem = SEC.passwordProblem(req.body.password, username);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }
  const user = security.createUser({ username, name, role, password: req.body.password, mustChangePassword: true });
  auditLog(req, 'usuarios.crear', { target: user.username, details: { role } });
  res.status(201).json(security.publicUser(user));
});

app.put('/api/admin/users/:id', requireAdmin, perm('usuarios'), (req, res) => {
  const users = security.getUsers();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }
  const isSelf = user.id === req.adminUser.id;
  const changes = {};
  if (req.body.name !== undefined) changes.name = cleanText(req.body.name, 80) || user.name;
  if (req.body.role !== undefined && req.body.role !== user.role) {
    if (!SEC.ROLES[req.body.role]) {
      res.status(400).json({ error: 'Rol inválido.' });
      return;
    }
    if (isSelf) {
      res.status(400).json({ error: 'No puedes cambiar tu propio rol.' });
      return;
    }
    changes.role = req.body.role;
  }
  if (req.body.active !== undefined) {
    if (isSelf && !req.body.active) {
      res.status(400).json({ error: 'No puedes desactivar tu propio usuario.' });
      return;
    }
    changes.active = Boolean(req.body.active);
  }
  const wouldBeSuper = (changes.role ?? user.role) === 'superadmin' && (changes.active ?? user.active !== false);
  if (user.role === 'superadmin' && user.active !== false && !wouldBeSuper && activeSuperadmins(users).length <= 1) {
    res.status(400).json({ error: 'Debe quedar al menos un super admin activo.' });
    return;
  }
  if (changes.role || changes.active === false) changes.sessionVersion = user.sessionVersion + 1; // cambios de acceso cierran sus sesiones
  const updated = security.updateUser(user.id, changes);
  auditLog(req, 'usuarios.editar', { target: user.username, details: security.summarize(changes) });
  res.json(security.publicUser(updated));
});

app.post('/api/admin/users/:id/reset-password', requireAdmin, perm('usuarios'), (req, res) => {
  const user = security.findUser(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }
  const problem = SEC.passwordProblem(req.body.password, user.username);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }
  const salt = crypto.randomBytes(16).toString('hex');
  security.updateUser(user.id, (u) => { u.salt = salt; u.hash = SEC.hashPassword(req.body.password, salt); u.mustChangePassword = u.id !== req.adminUser.id; u.sessionVersion += 1; });
  if (user.id === req.adminUser.id) req.session.sv = user.sessionVersion + 1;
  auditLog(req, 'usuarios.reset_password', { target: user.username });
  res.json({ ok: true });
});

app.post('/api/admin/users/:id/logout-all', requireAdmin, perm('usuarios'), (req, res) => {
  const user = security.updateUser(req.params.id, (u) => { u.sessionVersion += 1; });
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }
  if (user.id === req.adminUser.id) req.session.sv = user.sessionVersion;
  auditLog(req, 'usuarios.cerrar_sesiones', { target: user.username });
  res.json({ ok: true });
});

app.post('/api/admin/users/:id/mfa-reset', requireAdmin, perm('usuarios'), (req, res) => {
  const user = security.updateUser(req.params.id, (u) => { u.mfa = { enabled: false, secret: null, lastStep: 0 }; u.sessionVersion += 1; });
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }
  if (user.id === req.adminUser.id) req.session.sv = user.sessionVersion;
  auditLog(req, 'usuarios.mfa_reiniciada', { target: user.username });
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id', requireAdmin, perm('usuarios'), (req, res) => {
  const users = security.getUsers();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }
  if (user.id === req.adminUser.id) {
    res.status(400).json({ error: 'No puedes eliminar tu propio usuario.' });
    return;
  }
  if (user.role === 'superadmin' && user.active !== false && activeSuperadmins(users).length <= 1) {
    res.status(400).json({ error: 'Debe quedar al menos un super admin.' });
    return;
  }
  security.saveUsers(users.filter((u) => u.id !== user.id));
  auditLog(req, 'usuarios.eliminar', { target: user.username });
  res.json({ ok: true });
});

app.get('/api/admin/audit', requireAdmin, perm('auditoria'), (req, res) => {
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 200));
  res.json(security.getAudit().slice(-limit).reverse());
});

app.put('/api/admin/security', requireAdmin, perm('usuarios'), (req, res) => {
  const settings = getSettings();
  settings.security = { ...(settings.security || {}), requireMfaAdmins: Boolean(req.body.requireMfaAdmins) };
  saveSettings(settings);
  auditLog(req, 'seguridad.configurar', { details: settings.security });
  res.json(settings.security);
});

// --- Settings ---

app.get('/api/sat-catalogs', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.json({ regimenes: SAT_REGIMENES, usos: SAT_USOS });
});

app.get('/api/settings', (req, res) => {
  res.json(loadSessionUser(req) ? getSettings() : publicSettings());
});

app.put('/api/admin/settings', requireAdmin, perm('configuracion.editar'), (req, res) => {
  const current = getSettings();
  const { security: _ignored, ...body } = req.body || {};
  const updated = { ...current, ...body, security: current.security };
  saveSettings(updated);
  res.json(updated);
});

app.post('/api/admin/test-email', requireAdmin, perm('configuracion.editar'), async (req, res) => {
  if (!process.env.RESEND_API_KEY) {
    res.status(503).json({ error: 'Falta RESEND_API_KEY en las variables de Railway.' });
    return;
  }
  if (!notifyTarget()) {
    res.status(400).json({ error: 'Guarda primero un correo para avisos.' });
    return;
  }
  const ok = await sendEmail({ subject: 'Prueba de avisos · Works Jeans', html: '<p>Los avisos del panel de Works Jeans están funcionando.</p>' });
  if (!ok) {
    res.status(502).json({ error: 'Resend rechazó el envío. Revisa la llave y que el correo sea el de tu cuenta de Resend (o verifica tu dominio).' });
    return;
  }
  res.json({ ok: true });
});

// --- Product management (protected) ---

function stripCosts(products) {
  return products.map(({ costCents, ...p }) => ({ ...p, sizes: (p.sizes || []).map(({ costCents: c, ...v }) => v) }));
}

app.get('/api/admin/products', requireAdmin, perm('productos.ver'), (req, res) => {
  const products = getProducts();
  res.json(hasPerm(req, 'costos.ver') ? products : stripCosts(products));
});

const productUpload = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images', maxCount: 8 }]);

function uploadedImages(req) {
  const files = [...(req.files?.image || []), ...(req.files?.images || [])];
  return files.map((f) => `assets/products/${f.filename}`);
}

app.post('/api/admin/products', requireAdmin, perm('productos.editar'), productUpload, (req, res) => {
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

    const images = uploadedImages(req);
    if (images.length === 0) images.push('assets/img/works-jeans-logo.png');
    const product = {
      id,
      name,
      category,
      priceCents: Math.round(parseFloat(priceMxn) * 100),
      image: images[0],
      images,
      description,
      sizes: [],
      active: true,
      status: 'activo',
      order: products.reduce((max, p) => Math.max(max, p.order ?? 0), 0) + 1,
    };
    applyProductExtras(product, req.body);
    product.sizes = normalizeVariants(JSON.parse(sizes), product);

    products.push(product);
    saveProducts(products);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', requireAdmin, perm('productos.editar'), productUpload, (req, res) => {
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
    if (sizes) {
      applyProductExtras(product, req.body);
      const newSizes = normalizeVariants(JSON.parse(sizes), product);
      const movements = [];
      for (const ns of newSizes) {
        const old = findVariant(product, variantLabel(ns));
        const before = old ? old.stock : 0;
        if (ns.stock !== before) {
          movements.push({ productId: product.id, productName: product.name, size: variantLabel(ns), sku: ns.sku, delta: ns.stock - before, stockAfter: ns.stock, reason: 'Edición de producto', orderId: null });
        }
      }
      logInventory(movements);
      product.sizes = newSizes;
    }
    // keepImages: lista ordenada de las fotos existentes que se conservan (la primera es la principal).
    // Las fotos nuevas se agregan al final.
    let images = Array.isArray(product.images) && product.images.length ? product.images : [product.image];
    if (req.body.keepImages) {
      const keep = JSON.parse(req.body.keepImages);
      images = keep.filter((img) => typeof img === 'string' && images.includes(img));
    }
    images = [...images, ...uploadedImages(req)];
    if (images.length === 0) images.push('assets/img/works-jeans-logo.png');
    product.images = images;
    product.image = images[0];
    applyProductExtras(product, req.body);

    saveProducts(products);
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/products/:id/duplicate', requireAdmin, perm('productos.editar'), (req, res) => {
  const products = getProducts();
  const source = products.find((p) => p.id === req.params.id);
  if (!source) {
    res.status(404).json({ error: 'Producto no encontrado.' });
    return;
  }
  const name = `${source.name} (copia)`;
  let id = slugify(name);
  let suffix = 2;
  while (products.some((p) => p.id === id)) id = `${slugify(name)}-${suffix++}`;
  const copy = {
    ...JSON.parse(JSON.stringify(source)),
    id,
    name,
    active: false,
    order: products.reduce((max, p) => Math.max(max, p.order ?? 0), 0) + 1,
  };
  products.push(copy);
  saveProducts(products);
  res.status(201).json(copy);
});

app.put('/api/admin/products-order', requireAdmin, perm('productos.editar'), (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    res.status(400).json({ error: 'Falta la lista de ids.' });
    return;
  }
  const products = getProducts();
  // Los ids recibidos van primero en ese orden; el resto conserva su orden relativo después.
  const rest = products.filter((p) => !ids.includes(p.id)).sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  [...ids.map((id) => products.find((x) => x.id === id)).filter(Boolean), ...rest].forEach((p, i) => { p.order = i + 1; });
  saveProducts(products);
  res.json({ ok: true });
});

app.patch('/api/admin/products/:id', requireAdmin, perm('productos.editar'), (req, res) => {
  const products = getProducts();
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Producto no encontrado.' });
    return;
  }
  if (typeof req.body.active === 'boolean') product.active = req.body.active;
  saveProducts(products);
  res.json(product);
});

app.delete('/api/admin/products/:id', requireAdmin, perm('productos.eliminar'), (req, res) => {
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

function stripOrderCosts(orders) {
  return orders.map((o) => ({ ...o, items: (o.items || []).map(({ costCents, ...i }) => i) }));
}

app.get('/api/admin/orders', requireAdmin, perm('pedidos.ver'), (req, res) => {
  const orders = getOrders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(hasPerm(req, 'costos.ver') ? orders : stripOrderCosts(orders));
});

app.post('/api/admin/orders', requireAdmin, perm('pedidos.editar'), (req, res) => {
  try {
    const { customerName, customerPhone, customerEmail, notes, items, invoice } = req.body;
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
      const quantity = parseInt(item.quantity, 10);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
        throw new Error(`Cantidad inválida para ${product.name}.`);
      }
      const variant = findVariant(product, item.size);
      return {
        id: product.id,
        name: product.name,
        size: variant ? variantLabel(variant) : (cleanText(item.size, 60) || null),
        sku: variant?.sku || product.sku || null,
        quantity,
        priceCents: productPrice(product, variant),
        costCents: productCost(product, variant),
      };
    });

    const orderId = makeOrderId();
    decrementStock(products, orderItems, { strict: true, orderId, reason: 'Pedido por WhatsApp' });
    saveProducts(products);

    const subtotalCents = orderItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    let discount = null;
    if (req.body.code || req.body.discountMxn) {
      const quote = req.body.code ? quoteCart(items, req.body.code) : null;
      const manual = parseMoney(req.body.discountMxn) || 0;
      const cents = Math.min(subtotalCents, (quote ? quote.discountCents : 0) + manual);
      if (cents > 0) {
        discount = { code: quote && !quote.codeError ? String(req.body.code).trim().toUpperCase() : null, cents, promotions: quote ? quote.discounts.map((d) => ({ id: d.id, name: d.name, cents: d.cents })) : [], manualCents: manual };
      }
    }
    const totalCents = subtotalCents - (discount ? discount.cents : 0);

    const order = {
      id: orderId,
      source: 'whatsapp',
      status: 'pendiente',
      createdAt: new Date().toISOString(),
      customerName: cleanText(customerName, 120),
      customerPhone: cleanText(customerPhone, 40),
      customerEmail: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(customerEmail || '').trim()) ? cleanText(customerEmail, 120).toLowerCase() : '',
      notes: cleanText(notes, 1000),
      invoice: (() => { const { invoice: inv } = normalizeInvoice(invoice); return inv ? { requested: true, issued: false, ...inv } : null; })(),
      discount,
      items: orderItems,
      subtotalCents,
      totalCents,
    };

    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);
    if (discount?.promotions?.length) registerPromoUse(discount.promotions, totalCents);
    if (order.customerEmail) emailCustomer(order.id, 'confirmacion');
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/orders/:id', requireAdmin, perm('pedidos.ver'), (req, res) => {
  const order = getOrders().find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado.' });
    return;
  }
  res.json(order);
});

app.put('/api/admin/orders/:id', requireAdmin, perm('pedidos.editar'), (req, res) => {
  const orders = getOrders();
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado.' });
    return;
  }
  const { status, notes, tracking } = req.body;
  if (status !== undefined) {
    if (!ORDER_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Estado no válido.' });
      return;
    }
    const wasCancelled = order.status === 'cancelado';
    if (status === 'cancelado' && !wasCancelled) {
      const products = restoreStock(getProducts(), order.items, { orderId: order.id });
      saveProducts(products);
      order.cancelledAt = new Date().toISOString();
    } else if (status !== 'cancelado' && wasCancelled) {
      const products = decrementStock(getProducts(), order.items, { strict: false, orderId: order.id, reason: 'Pedido reactivado' });
      saveProducts(products);
      delete order.cancelledAt;
    }
    if (status === 'enviado' && order.status !== 'enviado') order.shippedAt = new Date().toISOString();
    if (status === 'entregado' && order.status !== 'entregado') order.deliveredAt = new Date().toISOString();
    if (status !== order.status && ['enviado', 'entregado', 'cancelado'].includes(status)) req.emailAfterSave = status;
    order.status = status;
  }
  if (notes !== undefined) order.notes = cleanText(notes, 1000);
  if (req.body.invoice !== undefined) {
    const inv = req.body.invoice;
    const { invoice: normalized } = normalizeInvoice(inv);
    order.invoice = normalized ? { requested: true, issued: Boolean(inv.issued), ...normalized } : null;
  }
  if (tracking !== undefined) {
    order.tracking = tracking && (tracking.carrier || tracking.number)
      ? { carrier: cleanText(tracking.carrier, 60), number: cleanText(tracking.number, 80), url: cleanText(tracking.url, 300) }
      : null;
  }
  saveOrders(orders);
  if (req.emailAfterSave) emailCustomer(order.id, req.emailAfterSave);
  res.json(order);
});

app.post('/api/admin/orders/:id/email', requireAdmin, perm('pedidos.editar'), async (req, res) => {
  const type = String(req.body?.type || 'confirmacion');
  const result = await emailCustomer(req.params.id, type, { force: true });
  auditLog(req, 'pedidos.correo', { target: req.params.id, details: { type, ok: result.ok } });
  if (!result.ok) { res.status(400).json({ error: `No se envió: ${result.reason}.` }); return; }
  res.json({ ok: true });
});

// --- Inventario (protegido) ---

app.get('/api/admin/inventory', requireAdmin, perm('inventario.ver'), (req, res) => {
  const limit = Math.max(1, Math.min(500, parseInt(req.query.limit, 10) || 200));
  const log = getInventoryLog().slice(-limit).reverse();
  res.json(log);
});

// Entrada de mercancía: varias tallas de un producto, con proveedor y costo.
app.post('/api/admin/inventory/entry', requireAdmin, perm('inventario.editar'), (req, res) => {
  const { productId, supplier, costMxn, updateCost, note, sizes } = req.body;
  if (!productId || !Array.isArray(sizes)) {
    res.status(400).json({ error: 'Indica el producto y las cantidades por talla.' });
    return;
  }
  const products = getProducts();
  const product = products.find((p) => p.id === productId);
  if (!product) {
    res.status(404).json({ error: 'Producto no encontrado.' });
    return;
  }
  const costCents = parseMoney(costMxn);
  const warehouse = String(req.body.warehouse || '').trim();
  const supplierName = String(supplier || '').trim().slice(0, 80);
  const reason = `Entrada${supplierName ? `: ${supplierName}` : ' de mercancía'}${note ? ` · ${String(note).trim().slice(0, 120)}` : ''}`;
  const movements = [];
  let totalQty = 0;
  for (const row of sizes) {
    const qty = parseInt(row.qty, 10);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    let sizeEntry = findVariant(product, row.size);
    if (!sizeEntry) {
      if (!row.size) continue;
      sizeEntry = { size: String(row.size).trim(), stock: 0 };
      sizeEntry.sku = autoSku(product, sizeEntry);
      product.sizes.push(sizeEntry);
    }
    applyStockDelta(sizeEntry, qty, warehouse);
    if (costCents && (updateCost === true || updateCost === 'true')) sizeEntry.costCents = costCents;
    totalQty += qty;
    movements.push({ productId: product.id, productName: product.name, size: variantLabel(sizeEntry), sku: sizeEntry.sku, delta: qty, stockAfter: sizeEntry.stock, reason, orderId: null, supplier: supplierName || null, costCents: costCents || null, type: 'entrada', warehouse: warehouse || warehouseNames()[0] });
  }
  if (totalQty === 0) {
    res.status(400).json({ error: 'Captura al menos una cantidad mayor a cero.' });
    return;
  }
  if (costCents && (updateCost === true || updateCost === 'true')) product.costCents = costCents;
  saveProducts(products);
  logInventory(movements);
  res.status(201).json({ ok: true, pieces: totalQty, product });
});

// Traspaso entre almacenes.
app.post('/api/admin/inventory/transfer', requireAdmin, perm('inventario.editar'), (req, res) => {
  const { productId, size, from, to, qty } = req.body;
  const n = parseInt(qty, 10);
  const names = warehouseNames();
  if (!productId || !size || !names.includes(from) || !names.includes(to) || from === to || !(n > 0)) {
    res.status(400).json({ error: 'Indica producto, variante, almacén origen y destino distintos y una cantidad mayor a cero.' });
    return;
  }
  const products = getProducts();
  const product = products.find((p) => p.id === productId);
  const v = findVariant(product, size);
  if (!v) {
    res.status(404).json({ error: 'Variante no encontrada.' });
    return;
  }
  v.warehouses = v.warehouses || { [names[0]]: v.stock };
  for (const w of names) if (!(w in v.warehouses)) v.warehouses[w] = 0;
  if (v.warehouses[from] < n) {
    res.status(400).json({ error: `En ${from} solo hay ${v.warehouses[from]} piezas.` });
    return;
  }
  v.warehouses[from] -= n;
  v.warehouses[to] += n;
  saveProducts(products);
  logInventory([
    { productId: product.id, productName: product.name, size: variantLabel(v), sku: v.sku, delta: -n, stockAfter: v.stock, reason: `Traspaso a ${to}`, orderId: null, warehouse: from, type: 'traspaso' },
    { productId: product.id, productName: product.name, size: variantLabel(v), sku: v.sku, delta: n, stockAfter: v.stock, reason: `Traspaso desde ${from}`, orderId: null, warehouse: to, type: 'traspaso' },
  ]);
  res.json({ ok: true, warehouses: v.warehouses });
});

// Existencias por variante: físico, apartadas (pedidos por salir) y disponible.
app.get('/api/admin/stock', requireAdmin, perm('inventario.ver'), (req, res) => {
  const names = warehouseNames();
  const reserved = {};
  for (const o of getOrders()) {
    if (!['pendiente', 'pagado', 'preparacion'].includes(o.status)) continue;
    for (const i of o.items) {
      const key = `${i.id}|${i.size}`;
      reserved[key] = (reserved[key] || 0) + i.quantity;
    }
  }
  const rows = [];
  for (const p of getProducts()) {
    for (const v of p.sizes) {
      const label = variantLabel(v);
      const wh = v.warehouses || { [names[0]]: v.stock };
      rows.push({
        productId: p.id, productName: p.name, status: p.status || (p.active === false ? 'borrador' : 'activo'),
        size: v.size, length: v.length || '', color: v.color || '', label, sku: v.sku || '', barcode: v.barcode || '',
        stock: v.stock, reserved: reserved[`${p.id}|${label}`] || 0, warehouses: names.map((n) => ({ name: n, qty: wh[n] || 0 })),
        priceCents: productPrice(p, v), costCents: productCost(p, v),
      });
    }
  }
  res.json({ warehouses: names, threshold: lowStockThreshold(), rows });
});

// Resumen ligero para detectar pedidos nuevos desde el panel sin recargar.
app.get('/api/admin/orders-summary', requireAdmin, perm('pedidos.ver'), (req, res) => {
  const orders = getOrders();
  const since = req.query.since ? new Date(req.query.since) : null;
  const recent = since ? orders.filter((o) => new Date(o.createdAt) > since) : [];
  res.json({
    count: orders.length,
    latestAt: orders.reduce((max, o) => (o.createdAt > max ? o.createdAt : max), ''),
    newOrders: recent.map((o) => ({ id: o.id, createdAt: o.createdAt, customerName: o.customerName, totalCents: o.totalCents, source: o.source })),
  });
});

app.post('/api/admin/inventory/adjust', requireAdmin, perm('inventario.editar'), (req, res) => {
  const { productId, size, delta, reason } = req.body;
  const change = parseInt(delta, 10);
  if (!productId || !size || !Number.isFinite(change) || change === 0) {
    res.status(400).json({ error: 'Indica producto, talla y un cambio distinto de cero.' });
    return;
  }
  const products = getProducts();
  const product = products.find((p) => p.id === productId);
  const sizeEntry = findVariant(product, size);
  if (!sizeEntry) {
    res.status(404).json({ error: 'Producto o talla no encontrados.' });
    return;
  }
  const before = sizeEntry.stock;
  applyStockDelta(sizeEntry, change, req.body.warehouse);
  saveProducts(products);
  logInventory([{ productId: product.id, productName: product.name, size: variantLabel(sizeEntry), sku: sizeEntry.sku, delta: sizeEntry.stock - before, stockAfter: sizeEntry.stock, reason: String(reason || 'Ajuste manual').slice(0, 120), orderId: null, warehouse: req.body.warehouse || warehouseNames()[0], type: 'ajuste' }]);
  const threshold = lowStockThreshold();
  if (before > threshold && sizeEntry.stock <= threshold) notifyLowStock([{ productName: product.name, size, stock: sizeEntry.stock }], threshold);
  res.json({ productId: product.id, size, stock: sizeEntry.stock });
});

app.delete('/api/admin/orders/:id', requireAdmin, perm('pedidos.eliminar'), (req, res) => {
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

function notifyTarget() {
  const apiKey = process.env.RESEND_API_KEY;
  let to = process.env.NOTIFY_EMAIL || '';
  if (!to) {
    try {
      to = getSettings().notifyEmail || '';
    } catch {
      to = '';
    }
  }
  return apiKey && to ? { apiKey, to, from: process.env.NOTIFY_FROM || 'Works Jeans <onboarding@resend.dev>' } : null;
}

async function sendEmail({ subject, html }) {
  const target = notifyTarget();
  if (!target) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${target.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: target.from, to: target.to, subject, html }),
    });
    if (!r.ok) console.error('Correo no enviado:', r.status, await r.text());
    return r.ok;
  } catch (err) {
    console.error('Correo no enviado:', err.message);
    return false;
  }
}

// --- Correos al cliente (confirmación, enviado, entregado, cancelado). Requieren RESEND_API_KEY y un remitente
// con dominio verificado en Resend (NOTIFY_FROM), porque onboarding@resend.dev solo entrega al dueño de la cuenta.
function customerEmailsEnabled() {
  try { return getSettings().customerEmails !== false; } catch { return true; }
}

async function sendEmailTo({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return { ok: false, reason: apiKey ? 'sin correo' : 'sin RESEND_API_KEY' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.NOTIFY_FROM || 'Works Jeans <onboarding@resend.dev>', to, subject, html }),
    });
    if (!r.ok) { const t = await r.text(); console.error('Correo al cliente no enviado:', r.status, t); return { ok: false, reason: `Resend ${r.status}` }; }
    return { ok: true };
  } catch (err) {
    console.error('Correo al cliente no enviado:', err.message);
    return { ok: false, reason: err.message };
  }
}

function emailLayout(title, body) {
  const s = getSettings();
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f3f3f3;font-family:Inter,Arial,sans-serif;color:#1e1e1e">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1.5px solid #0f0f0f">
    <div style="height:10px;background:repeating-linear-gradient(-45deg,#111 0 14px,#ffd600 14px 28px)"></div>
    <div style="padding:28px 32px">
      <img src="https://www.workjeans.mx/assets/img/works-jeans-logo.png" alt="Works Jeans" width="120" style="display:block;margin-bottom:18px">
      <h1 style="font-size:22px;margin:0 0 14px;text-transform:uppercase;letter-spacing:.02em">${title}</h1>
      ${body}
      <p style="font-size:13px;color:#6a6a6a;margin-top:28px;border-top:1px solid #ddd;padding-top:14px">Works Jeans · ${escapeHtml(s.address || 'Monterrey, N.L.')}<br>WhatsApp ${escapeHtml(s.phoneDisplay || '')} · <a href="https://www.workjeans.mx" style="color:#0f0f0f">www.workjeans.mx</a><br><a href="https://www.workjeans.mx/envios-y-devoluciones.html" style="color:#6a6a6a">Envíos y cambios</a> · <a href="https://www.workjeans.mx/aviso-de-privacidad.html" style="color:#6a6a6a">Aviso de privacidad</a></p>
    </div>
  </div></body></html>`;
}

function orderSummaryHtml(order) {
  const rows = order.items.map((i) => `<tr><td style="padding:8px 6px;border-bottom:1px solid #eee">${escapeHtml(i.name)}</td><td style="padding:8px 6px;border-bottom:1px solid #eee">${escapeHtml(i.size || '—')}</td><td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right">${i.quantity}</td><td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right">${formatMxn(i.priceCents * i.quantity)}</td></tr>`).join('');
  const subtotal = order.subtotalCents || order.items.reduce((s, i) => s + i.priceCents * i.quantity, 0);
  const lines = [`<tr><td colspan="3" style="padding:6px;text-align:right">Subtotal</td><td style="padding:6px;text-align:right">${formatMxn(subtotal)}</td></tr>`];
  if (order.discount?.cents) lines.push(`<tr><td colspan="3" style="padding:6px;text-align:right">Descuento${order.discount.code ? ` (${escapeHtml(order.discount.code)})` : ''}</td><td style="padding:6px;text-align:right">−${formatMxn(order.discount.cents)}</td></tr>`);
  if (Number.isFinite(order.shippingCostCents) && order.shippingCostCents !== null) lines.push(`<tr><td colspan="3" style="padding:6px;text-align:right">Envío</td><td style="padding:6px;text-align:right">${order.shippingCostCents ? formatMxn(order.shippingCostCents) : 'Gratis'}</td></tr>`);
  else if (order.shipping) lines.push(`<tr><td colspan="3" style="padding:6px;text-align:right">Envío</td><td style="padding:6px;text-align:right">Se confirma por WhatsApp</td></tr>`);
  lines.push(`<tr><td colspan="3" style="padding:8px 6px;text-align:right;font-weight:700">Total</td><td style="padding:8px 6px;text-align:right;font-weight:700">${formatMxn(order.totalCents)}</td></tr>`);
  const ship = order.shipping ? `<p style="margin:14px 0 0"><b>Entrega:</b> ${escapeHtml([order.shipping.name, order.shipping.line1, order.shipping.line2, order.shipping.city, order.shipping.state, order.shipping.postalCode].filter(Boolean).join(', '))}</p>` : '';
  return `<p style="margin:0 0 6px"><b>Pedido ${escapeHtml(order.id)}</b> · ${new Date(order.createdAt).toLocaleDateString('es-MX', { dateStyle: 'long' })}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px"><tr><th style="text-align:left;padding:6px;border-bottom:2px solid #0f0f0f">Producto</th><th style="text-align:left;padding:6px;border-bottom:2px solid #0f0f0f">Talla</th><th style="text-align:right;padding:6px;border-bottom:2px solid #0f0f0f">Cant.</th><th style="text-align:right;padding:6px;border-bottom:2px solid #0f0f0f">Importe</th></tr>${rows}${lines.join('')}</table>${ship}`;
}

const CUSTOMER_EMAILS = {
  confirmacion: (o) => ({ subject: `Recibimos tu pedido ${o.id} · Works Jeans`, title: 'Recibimos tu pedido.', intro: o.source === 'stripe' ? 'Tu pago se procesó correctamente. Preparamos tu pedido en 1 a 2 días hábiles y te avisamos por este medio y por WhatsApp cuando salga.' : 'Registramos tu pedido. Te confirmamos por WhatsApp la forma de pago y el envío.', outro: o.invoice ? 'Pediste factura: te la enviamos al correo indicado en cuanto se emita.' : '' }),
  enviado: (o) => ({ subject: `Tu pedido ${o.id} va en camino · Works Jeans`, title: 'Tu pedido va en camino.', intro: o.tracking?.number ? `Salió por ${escapeHtml(o.tracking.carrier || 'paquetería')} con la guía <b>${escapeHtml(o.tracking.number)}</b>.${o.tracking.url ? ` <a href="${escapeHtml(o.tracking.url)}">Rastrear envío</a>.` : ''} La entrega suele tardar de 3 a 7 días hábiles según el destino.` : 'Salió con la paquetería. Te compartimos la guía por WhatsApp.', outro: '' }),
  entregado: (o) => ({ subject: `Tu pedido ${o.id} fue entregado · Works Jeans`, title: 'Pedido entregado.', intro: 'Tu pedido ya está contigo. Si algo no quedó bien, tienes 15 días para cambio de talla con la prenda sin usar y con etiquetas.', outro: `Gracias por comprar ropa de trabajo hecha en Monterrey.${o.reviewToken ? ` <br><br><b>¿Nos cuentas cómo te fue?</b> Toma un minuto y ayuda a otros a elegir.<br><a href="https://www.workjeans.mx/resena?t=${o.reviewToken}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#ffd600;color:#0f0f0f;text-decoration:none;font-weight:700;border:1.5px solid #0f0f0f">Calificar mi compra</a>` : ''}` }),
  cancelado: (o) => ({ subject: `Tu pedido ${o.id} fue cancelado · Works Jeans`, title: 'Pedido cancelado.', intro: 'Cancelamos tu pedido. Si pagaste con tarjeta, el reembolso aparece en tu estado de cuenta en los días que marque tu banco. Si tienes dudas, escríbenos por WhatsApp.', outro: '' }),
};

// Envía un correo al cliente del pedido y deja registro en order.emails. No repite el mismo tipo.
async function emailCustomer(orderId, type, { force = false } = {}) {
  const tpl = CUSTOMER_EMAILS[type];
  if (!tpl) return { ok: false, reason: 'tipo desconocido' };
  if (type === 'entregado') ensureReviewToken(orderId);
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return { ok: false, reason: 'pedido no encontrado' };
  if (!customerEmailsEnabled()) return { ok: false, reason: 'correos al cliente desactivados' };
  if (!order.customerEmail) return { ok: false, reason: 'el pedido no tiene correo' };
  if (!force && (order.emails || []).some((e) => e.type === type && e.ok)) return { ok: false, reason: 'ya enviado' };
  const t = tpl(order);
  const html = emailLayout(t.title, `<p>Hola ${escapeHtml((order.customerName || '').split(' ')[0] || '')}.</p><p>${t.intro}</p>${orderSummaryHtml(order)}${t.outro ? `<p>${t.outro}</p>` : ''}`);
  const result = await sendEmailTo({ to: order.customerEmail, subject: t.subject, html });
  const fresh = getOrders();
  const o2 = fresh.find((o) => o.id === orderId);
  if (o2) {
    o2.emails = [...(o2.emails || []), { type, at: new Date().toISOString(), ok: result.ok, reason: result.ok ? undefined : result.reason }];
    saveOrders(fresh);
  }
  return result;
}

async function notifyLowStock(alerts, threshold) {
  const rows = alerts.map((a) => `<li><b>${a.productName}</b> — talla ${a.size}: quedan ${a.stock} pzas</li>`).join('');
  await sendEmail({
    subject: `Stock bajo: ${alerts.length === 1 ? `${alerts[0].productName} talla ${alerts[0].size}` : `${alerts.length} tallas`}`,
    html: `<h2>Tallas con ${threshold} piezas o menos</h2><ul>${rows}</ul><p>Revisa el inventario en el panel: https://www.workjeans.mx/workmapadmin.html</p>`,
  });
}

async function notifyNewOrder(order) {
  if (!notifyTarget()) return;
  const rows = order.items.map((i) => `<tr><td>${i.name}</td><td>${i.size || '—'}</td><td>${i.quantity}</td><td>${formatMxn(i.priceCents * i.quantity)}</td></tr>`).join('');
  const ship = order.shipping ? `<p><b>Envío:</b> ${[order.shipping.name, order.shipping.line1, order.shipping.line2, order.shipping.city, order.shipping.state, order.shipping.postalCode].filter(Boolean).join(', ')}</p>` : '';
  const html = `
    <h2>Nuevo pedido ${order.id}</h2>
    <p><b>Origen:</b> ${order.source === 'stripe' ? 'Pago con tarjeta' : 'WhatsApp'}<br>
    <b>Cliente:</b> ${order.customerName || 'Sin nombre'}${order.customerPhone ? ` · ${order.customerPhone}` : ''}${order.customerEmail ? ` · ${order.customerEmail}` : ''}</p>
    ${ship}
    ${order.invoice ? `<p><b>Pide factura:</b> RFC ${order.invoice.rfc || '—'} · ${order.invoice.name || '—'} · ${order.invoice.email || '—'}${order.invoice.zip ? ` · CP ${order.invoice.zip}` : ''}${order.invoice.regimen ? ` · Régimen ${order.invoice.regimen}` : ''}${order.invoice.uso ? ` · Uso ${order.invoice.uso}` : ''}</p>` : ''}
    <table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Producto</th><th>Talla</th><th>Cant.</th><th>Subtotal</th></tr>${rows}</table>
    <p><b>Total:</b> ${formatMxn(order.totalCents)}</p>
    <p>Revísalo en el panel: https://www.workjeans.mx/workmapadmin.html</p>`;
  await sendEmail({ subject: `Nuevo pedido ${order.id} · ${formatMxn(order.totalCents)}`, html });
}

// Crea (si no existe) el pedido a partir de una sesión de Stripe pagada. Devuelve el pedido.
function recordStripeOrder(session) {
  const before = getOrders().some((o) => o.stripeSessionId === session.id);
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
  const productsNow = getProducts();
  const orderId = makeOrderId();
  order = {
    id: orderId,
    source: 'stripe',
    status: 'pagado',
    createdAt: new Date().toISOString(),
    customerName: cleanText(session.shipping_details?.name || session.customer_details?.name, 120),
    customerPhone: cleanText(session.customer_details?.phone, 40),
    customerEmail: cleanText(session.customer_details?.email, 120),
    shipping: addr ? {
      name: cleanText(session.shipping_details?.name, 120),
      line1: cleanText(addr.line1, 200),
      line2: cleanText(addr.line2, 200),
      city: cleanText(addr.city, 80),
      state: cleanText(addr.state, 80),
      postalCode: cleanText(addr.postal_code, 12),
      country: cleanText(addr.country, 4),
    } : null,
    notes: '',
    invoice: (() => {
      try {
        const inv = session.metadata?.invoice ? JSON.parse(session.metadata.invoice) : null;
        const { invoice } = normalizeInvoice(inv);
        return invoice ? { requested: true, issued: false, ...invoice } : null;
      } catch {
        return null;
      }
    })(),
    discount: (() => {
      try {
        return session.metadata?.promo ? JSON.parse(session.metadata.promo) : null;
      } catch {
        return null;
      }
    })(),
    stripeSessionId: session.id,
    shippingCostCents: session.shipping_cost?.amount_total ?? null,
    items: session.line_items.data.map((li, i) => {
      const product = cartMeta[i]?.id ? productsNow.find((p) => p.id === cartMeta[i].id) : null;
      const variant = product ? findVariant(product, cartMeta[i]?.size) : null;
      return {
        id: cartMeta[i]?.id || null,
        name: li.description,
        size: cartMeta[i]?.size || null,
        sku: variant?.sku || product?.sku || null,
        quantity: li.quantity,
        priceCents: li.amount_total / li.quantity,
        costCents: productCost(product || {}, variant),
      };
    }),
    totalCents: session.amount_total,
  };
  orders.push(order);
  saveOrders(orders);
  if (order.discount?.promotions) registerPromoUse(order.discount.promotions, order.totalCents);

  if (cartMeta.length > 0) {
    try {
      const products = getProducts();
      decrementStock(products, order.items, { strict: false, orderId, reason: 'Pedido con tarjeta' });
      saveProducts(products);
    } catch {
      // Never block order confirmation on stock bookkeeping issues.
    }
  }
  notifyNewOrder(order);
  if (!before && order.totalCents) trackEvent('purchase', { cents: order.totalCents });
  emailCustomer(order.id, 'confirmacion');
  return order;
}


// --- Openpay: tarjeta (página segura con redirección), SPEI y pago en tienda ---
// Variables: OPENPAY_MERCHANT_ID, OPENPAY_PRIVATE_KEY, OPENPAY_SANDBOX ('true' hasta salir a producción),
// opcionales OPENPAY_WEBHOOK_USER / OPENPAY_WEBHOOK_PASS (autenticación básica del webhook) y OPENPAY_STORES ('false' para ocultar pago en tienda).
const OPENPAY = process.env.OPENPAY_MERCHANT_ID && process.env.OPENPAY_PRIVATE_KEY ? {
  merchant: process.env.OPENPAY_MERCHANT_ID,
  key: process.env.OPENPAY_PRIVATE_KEY,
  base: process.env.OPENPAY_BASE_URL || (process.env.OPENPAY_SANDBOX === 'false' ? 'https://api.openpay.mx/v1' : 'https://sandbox-api.openpay.mx/v1'),
  sandbox: process.env.OPENPAY_SANDBOX !== 'false',
} : null;
const PENDING_CHECKOUTS_PATH = path.join(DATA_DIR, 'pending-checkouts.json');
const getPendingCheckouts = () => readJsonList(PENDING_CHECKOUTS_PATH);
const savePendingCheckouts = (list) => fs.writeFileSync(PENDING_CHECKOUTS_PATH, JSON.stringify(list, null, 2) + '\n');

function paymentsInfo() {
  return { provider: OPENPAY ? 'openpay' : (stripe ? 'stripe' : null), spei: Boolean(OPENPAY), store: Boolean(OPENPAY) && process.env.OPENPAY_STORES !== 'false', sandbox: Boolean(OPENPAY?.sandbox) };
}

async function openpayRequest(method, route, body) {
  const r = await fetch(`${OPENPAY.base}/${OPENPAY.merchant}${route}`, {
    method,
    headers: { Authorization: `Basic ${Buffer.from(`${OPENPAY.key}:`).toString('base64')}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!r.ok) {
    const err = new Error(data.description || `Openpay ${r.status}`);
    err.openpay = data;
    throw err;
  }
  return data;
}

// Arma el pedido (sin guardarlo) a partir de la cotización y los datos del formulario de pago.
function buildCheckoutOrder({ quote, customer, shipping, invoice, method, source = 'openpay' }) {
  const products = getProducts();
  const items = quote.lines.map((l) => {
    const product = products.find((p) => p.id === l.id);
    const variant = findVariant(product, l.size);
    return { id: l.id, name: l.name, size: l.size, quantity: l.quantity, priceCents: l.unitCents, costCents: productCost(product, variant) || undefined };
  });
  return {
    id: `ord_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    source,
    status: 'pendiente',
    createdAt: new Date().toISOString(),
    customerName: cleanText(customer.name, 120),
    customerPhone: cleanText(customer.phone, 40),
    customerEmail: cleanText(customer.email, 120).toLowerCase(),
    shipping: { name: cleanText(customer.name, 120), line1: cleanText(shipping.line1, 160), line2: cleanText(shipping.line2, 120), city: cleanText(shipping.city, 80), state: cleanText(shipping.state, 60), postalCode: cleanText(shipping.postalCode, 5), country: 'MX', references: cleanText(shipping.references, 200) },
    notes: '',
    invoice: invoice ? { requested: true, issued: false, ...invoice } : null,
    discount: quote.discounts.length ? { cents: quote.discountCents, code: quote.discounts.find((d) => d.code)?.code || null, promotions: quote.discounts.map((d) => ({ id: d.id, name: d.name, cents: d.cents })), freeShipping: quote.freeShipping } : null,
    items,
    subtotalCents: quote.subtotalCents,
    shippingCostCents: ['quoted', 'free'].includes(quote.shipping.status) ? quote.shipping.costCents : null,
    shippingZone: quote.shipping.zone || null,
    totalCents: quote.totalCents,
    accessKey: crypto.randomBytes(8).toString('hex'),
    payment: { provider: 'openpay', method, status: 'pending', createdAt: new Date().toISOString() },
  };
}

// Marca un pedido como pagado: existencias, promociones, avisos y correo. Idempotente.
function markOrderPaid(orderId, extra = {}) {
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order || order.payment?.status === 'paid') return order || null;
  order.payment = { ...(order.payment || {}), ...extra, status: 'paid', paidAt: new Date().toISOString() };
  order.status = 'pagado';
  saveOrders(orders);
  try {
    const products = getProducts();
    decrementStock(products, order.items, { strict: false, orderId: order.id, reason: `Pedido pagado (${order.payment.method})` });
    saveProducts(products);
  } catch { /* nunca bloquear la confirmación por inventario */ }
  if (order.discount?.promotions?.length) registerPromoUse(order.discount.promotions, order.totalCents);
  notifyNewOrder(order);
  emailCustomer(order.id, 'confirmacion');
  trackEvent('purchase', { cents: order.totalCents });
  return order;
}

// Cobro con tarjeta pagado: crea el pedido guardado en pendientes (si aún no existe) y lo marca pagado.
function finalizeOpenpayCharge(charge) {
  const orders = getOrders();
  const existing = orders.find((o) => o.payment?.chargeId === charge.id);
  if (existing) return charge.status === 'completed' ? markOrderPaid(existing.id, { chargeStatus: charge.status }) : existing;
  const pending = getPendingCheckouts();
  const entry = pending.find((p) => p.chargeId === charge.id);
  if (!entry) return null;
  if (charge.status !== 'completed') return null;
  const order = { ...entry.order, payment: { ...entry.order.payment, chargeId: charge.id } };
  orders.push(order);
  saveOrders(orders);
  savePendingCheckouts(pending.filter((p) => p.chargeId !== charge.id));
  return markOrderPaid(order.id, { chargeStatus: charge.status, card: charge.card ? { brand: charge.card.brand, last4: charge.card.card_number?.slice(-4) } : undefined });
}

// Limpieza de intentos de tarjeta abandonados (48 h).
try {
  const pending = getPendingCheckouts();
  const keep = pending.filter((p) => Date.now() - new Date(p.createdAt).getTime() < 48 * 3600 * 1000);
  if (keep.length !== pending.length) savePendingCheckouts(keep);
} catch { /* sin archivo aún */ }

app.post('/api/checkout', async (req, res) => {
  if (!OPENPAY) { res.status(503).json({ error: 'El pago en línea no está disponible ahora mismo. Pide por WhatsApp.' }); return; }
  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items : [];
  if (!items.length) { res.status(400).json({ error: 'El carrito está vacío.' }); return; }
  const method = ['card', 'spei', 'store'].includes(b.method) ? b.method : 'card';
  if (method === 'store' && process.env.OPENPAY_STORES === 'false') { res.status(400).json({ error: 'Pago en tienda no disponible.' }); return; }
  const customer = b.customer || {};
  const shipping = b.shipping || {};
  if (!cleanText(customer.name, 120) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(customer.email || '').trim()) || String(customer.phone || '').replace(/\D/g, '').length < 10) {
    res.status(400).json({ error: 'Completa nombre, correo y teléfono de 10 dígitos.' }); return;
  }
  for (const [k, msg] of [['line1', 'calle y número'], ['line2', 'colonia'], ['city', 'ciudad'], ['state', 'estado']]) {
    if (!cleanText(shipping[k], 160)) { res.status(400).json({ error: `Falta ${msg} en la dirección de entrega.` }); return; }
  }
  const { invoice, error: invoiceError } = normalizeInvoice(b.invoice, { strict: true });
  if (invoiceError) { res.status(400).json({ error: invoiceError }); return; }
  const quote = quoteCart(items, b.code, b.postalCode);
  if (!quote.lines.length) { res.status(400).json({ error: 'El carrito no tiene productos válidos.' }); return; }
  if (quote.codeError && b.code) { res.status(400).json({ error: quote.codeError }); return; }
  if (['quote_required', 'invalid_cp', 'unknown_cp', 'need_cp'].includes(quote.shipping.status)) { res.status(400).json({ error: quote.shipping.label, code: quote.shipping.status }); return; }
  const stockProducts = getProducts();
  for (const l of quote.lines) {
    const v = findVariant(stockProducts.find((p) => p.id === l.id), l.size);
    if (v && v.stock < l.quantity) { res.status(400).json({ error: `Solo quedan ${v.stock} piezas de ${l.name} talla ${l.size}. Ajusta la cantidad.` }); return; }
  }
  const order = buildCheckoutOrder({ quote, customer, shipping: { ...shipping, postalCode: b.postalCode }, invoice, method });
  const [firstName, ...rest] = order.customerName.split(/\s+/);
  const pieces = order.items.reduce((s, i) => s + i.quantity, 0);
  const base = {
    amount: Number((order.totalCents / 100).toFixed(2)),
    currency: 'MXN',
    description: `Works Jeans · pedido ${order.id} (${pieces} pza${pieces === 1 ? '' : 's'})`,
    order_id: order.id,
    customer: { name: firstName, last_name: rest.join(' ') || '.', email: order.customerEmail, phone_number: order.customerPhone.replace(/\D/g, '').slice(-10) },
  };
  try {
    if (method === 'card') {
      const charge = await openpayRequest('POST', '/charges', { ...base, method: 'card', confirm: 'false', send_email: 'false', use_card_points: 'false', redirect_url: `${publicOrigin(req)}/success.html?openpay=1` });
      const url = charge.payment_method?.url;
      if (!url) throw new Error('Openpay no devolvió la página de pago.');
      const pending = getPendingCheckouts();
      pending.push({ chargeId: charge.id, createdAt: new Date().toISOString(), order: { ...order, payment: { ...order.payment, chargeId: charge.id } } });
      savePendingCheckouts(pending);
      res.json({ url });
      return;
    }
    const charge = await openpayRequest('POST', '/charges', { ...base, method: method === 'spei' ? 'bank_account' : 'store' });
    const pm = charge.payment_method || {};
    order.payment = { ...order.payment, chargeId: charge.id, chargeStatus: charge.status, dueDate: charge.due_date || null, ...(method === 'spei' ? { clabe: pm.clabe, bank: pm.bank, agreement: pm.agreement, beneficiary: pm.name } : { reference: pm.reference, barcodeUrl: pm.barcode_url }) };
    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);
    notifyNewOrder(order);
    res.json({ orderId: order.id, key: order.accessKey });
  } catch (err) {
    console.error('Openpay:', err.message, err.openpay ? JSON.stringify(err.openpay).slice(0, 300) : '');
    res.status(502).json({ error: `No se pudo iniciar el pago: ${err.message}. Intenta de nuevo o pide por WhatsApp.` });
  }
});

// Regreso de la página de tarjeta de Openpay: consulta el cobro y, si está pagado, registra el pedido.
app.get('/api/verify-openpay', async (req, res) => {
  if (!OPENPAY) { res.status(503).json({ error: 'Pagos no configurados.' }); return; }
  const id = String(req.query.id || '').replace(/[^\w-]/g, '');
  if (!id) { res.status(400).json({ error: 'Falta el id del cobro.' }); return; }
  try {
    const charge = await openpayRequest('GET', `/charges/${id}`);
    const order = finalizeOpenpayCharge(charge);
    if (order && order.payment?.status === 'paid') { res.json({ paid: true, id: order.id, key: order.accessKey }); return; }
    if (['charge_pending', 'in_progress'].includes(charge.status)) { res.json({ pending: true }); return; }
    res.json({ failed: true, status: charge.status, message: charge.error_message || 'El pago no se completó.' });
  } catch (err) {
    res.status(502).json({ error: 'No se pudo verificar el pago. Si ya pagaste, escríbenos por WhatsApp con tu correo.' });
  }
});

// Webhook de Openpay: avisa cobros completados (SPEI, tienda y tarjeta). Nunca se confía en el cuerpo: se consulta el cobro.
app.post('/api/openpay/webhook', express.json({ limit: '200kb' }), async (req, res) => {
  const user = process.env.OPENPAY_WEBHOOK_USER;
  const pass = process.env.OPENPAY_WEBHOOK_PASS;
  if (user && pass) {
    const expected = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
    if (req.headers.authorization !== expected) { res.status(401).end(); return; }
  }
  const ev = req.body || {};
  if (ev.type === 'verification') {
    console.log(`Openpay webhook: código de verificación ${ev.verification_code}`);
    res.status(200).json({ ok: true });
    return;
  }
  res.status(200).json({ ok: true }); // responder rápido; el trabajo sigue abajo
  if (!OPENPAY || !ev.transaction?.id) return;
  try {
    const charge = await openpayRequest('GET', `/charges/${String(ev.transaction.id).replace(/[^\w-]/g, '')}`);
    if (charge.status === 'completed') finalizeOpenpayCharge(charge);
    else if (['failed', 'cancelled', 'refunded', 'chargeback_pending'].includes(charge.status)) {
      const orders = getOrders();
      const order = orders.find((o) => o.payment?.chargeId === charge.id);
      if (order && order.payment.status !== 'paid') { order.payment.status = 'failed'; order.payment.chargeStatus = charge.status; saveOrders(orders); }
      else if (order && charge.status === 'refunded') { order.payment.status = 'refunded'; order.payment.chargeStatus = charge.status; saveOrders(orders); }
    }
  } catch (err) {
    console.error('Openpay webhook:', err.message);
  }
});

// Estado de un pedido para la página de gracias (requiere la clave que solo conoce quien lo creó).
app.get('/api/orders/:id/status', (req, res) => {
  const order = getOrders().find((o) => o.id === req.params.id);
  if (!order || !order.accessKey || String(req.query.k || '') !== order.accessKey) { res.status(404).json({ error: 'Pedido no encontrado.' }); return; }
  const p = order.payment || {};
  res.set('Cache-Control', 'no-store');
  res.json({ id: order.id, status: order.status, totalCents: order.totalCents, email: order.customerEmail, items: order.items.map((i) => ({ name: i.name, size: i.size, quantity: i.quantity })), payment: { method: p.method, status: p.status, clabe: p.clabe, bank: p.bank, beneficiary: p.beneficiary, agreement: p.agreement, reference: p.reference, barcodeUrl: p.barcodeUrl, dueDate: p.dueDate, sandbox: Boolean(OPENPAY?.sandbox) } });
});

function publicOrigin(req) {
  return CANONICAL_HOST ? `https://${CANONICAL_HOST}` : `${req.protocol}://${req.get('host')}`;
}

// --- Storefront ---

// Cotización del carrito (precios reales, promociones automáticas y cupón).
app.post('/api/cart/quote', (req, res) => {
  const quote = quoteCart(req.body?.items, req.body?.code, req.body?.postalCode);
  res.json(quote);
});

// --- Promociones (protegido) ---

function normalizePromo(body, existing = {}) {
  const promo = { ...existing };
  if (body.name !== undefined) promo.name = String(body.name || '').trim().slice(0, 80);
  if (body.code !== undefined) promo.code = String(body.code || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 30) || null;
  if (body.type !== undefined) promo.type = PROMO_TYPES.includes(body.type) ? body.type : 'percent';
  if (body.value !== undefined) {
    promo.value = promo.type === 'amount' ? (parseMoney(body.value) || 0) : Math.max(0, Math.min(100, parseFloat(body.value) || 0));
  }
  if (body.minMxn !== undefined) promo.minCents = parseMoney(body.minMxn) || 0;
  if (body.minQty !== undefined) promo.minQty = Math.max(0, parseInt(body.minQty, 10) || 0);
  if (body.scope !== undefined) {
    const kind = ['all', 'category', 'collection', 'products'].includes(body.scope?.kind) ? body.scope.kind : 'all';
    promo.scope = { kind, values: Array.isArray(body.scope?.values) ? body.scope.values.map(String).slice(0, 50) : [] };
  }
  if (body.startsAt !== undefined) promo.startsAt = body.startsAt ? String(body.startsAt).slice(0, 10) : null;
  if (body.endsAt !== undefined) promo.endsAt = body.endsAt ? String(body.endsAt).slice(0, 10) : null;
  if (body.maxUses !== undefined) promo.maxUses = Math.max(0, parseInt(body.maxUses, 10) || 0);
  if (body.active !== undefined) promo.active = Boolean(body.active);
  return promo;
}

app.get('/api/admin/promotions', requireAdmin, perm('promociones.ver'), (req, res) => {
  res.json(getPromotions().map((p) => ({ ...p, isActive: promoActive(p) })));
});

app.post('/api/admin/promotions', requireAdmin, perm('promociones.editar'), (req, res) => {
  const promo = normalizePromo(req.body, { id: `promo_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`, createdAt: new Date().toISOString(), uses: 0, stats: { discountCents: 0, salesCents: 0 }, active: true, scope: { kind: 'all', values: [] } });
  if (!promo.name) {
    res.status(400).json({ error: 'La promoción necesita nombre.' });
    return;
  }
  const list = getPromotions();
  if (promo.code && list.some((p) => p.code === promo.code)) {
    res.status(400).json({ error: 'Ya existe una promoción con ese código.' });
    return;
  }
  list.push(promo);
  savePromotions(list);
  res.status(201).json(promo);
});

app.put('/api/admin/promotions/:id', requireAdmin, perm('promociones.editar'), (req, res) => {
  const list = getPromotions();
  const idx = list.findIndex((p) => p.id === req.params.id);
  if (idx < 0) {
    res.status(404).json({ error: 'Promoción no encontrada.' });
    return;
  }
  const promo = normalizePromo(req.body, list[idx]);
  if (promo.code && list.some((p) => p.code === promo.code && p.id !== promo.id)) {
    res.status(400).json({ error: 'Ya existe una promoción con ese código.' });
    return;
  }
  list[idx] = promo;
  savePromotions(list);
  res.json(promo);
});

app.delete('/api/admin/promotions/:id', requireAdmin, perm('promociones.editar'), (req, res) => {
  const list = getPromotions();
  const next = list.filter((p) => p.id !== req.params.id);
  if (next.length === list.length) {
    res.status(404).json({ error: 'Promoción no encontrada.' });
    return;
  }
  savePromotions(next);
  res.json({ ok: true });
});

app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) {
    res.status(503).json({ error: 'Pagos en línea no configurados todavía. Usa el pedido por WhatsApp.' });
    return;
  }

  const { items, invoice } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'El carrito está vacío.' });
    return;
  }
  const { invoice: invoiceMeta, error: invoiceError } = normalizeInvoice(invoice, { strict: true });
  if (invoiceError) {
    res.status(400).json({ error: invoiceError });
    return;
  }

  try {
    const quote = quoteCart(items, req.body.code, req.body.postalCode);
    if (quote.lines.length === 0) {
      throw new Error('El carrito no tiene productos válidos.');
    }
    if (quote.codeError && req.body.code) {
      res.status(400).json({ error: quote.codeError });
      return;
    }
    // Existencias reales antes de cobrar: no se vende una talla agotada.
    const stockProducts = getProducts();
    for (const l of quote.lines) {
      const v = findVariant(stockProducts.find((p) => p.id === l.id), l.size);
      if (v && v.stock < l.quantity) {
        res.status(400).json({ error: `Solo quedan ${v.stock} piezas de ${l.name} talla ${l.size}. Ajusta la cantidad.` });
        return;
      }
    }
    if (quote.shipping.status === 'quote_required') {
      res.status(400).json({ error: quote.shipping.label, code: 'quote_required' });
      return;
    }
    if (quote.shipping.status === 'invalid_cp' || quote.shipping.status === 'unknown_cp') {
      res.status(400).json({ error: quote.shipping.label });
      return;
    }
    const shippingOptions = ['quoted', 'free'].includes(quote.shipping.status) ? [{
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: quote.shipping.costCents, currency: 'mxn' },
        display_name: quote.shipping.status === 'free' ? `Envío gratis · ${quote.shipping.zone}` : `Envío · ${quote.shipping.zone}`,
      },
    }] : [];
    const checkoutToken = String(req.body.checkoutToken || '').replace(/[^\w-]/g, '').slice(0, 64);
    const line_items = quote.lines.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency: 'mxn',
        unit_amount: l.unitCents,
        product_data: { name: l.size ? `${l.name} (${l.size})` : l.name },
      },
    }));
    const discountsOpt = [];
    if (quote.discountCents > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: quote.discountCents,
        currency: 'mxn',
        duration: 'once',
        max_redemptions: 1,
        name: quote.discounts.map((d) => d.name).join(' + ').slice(0, 40),
      });
      discountsOpt.push({ coupon: coupon.id });
    }

    const cartMeta = quote.lines.map((l) => ({ id: l.id, size: l.size, quantity: l.quantity }));
    const promoMeta = quote.discounts.length ? JSON.stringify({ code: req.body.code ? String(req.body.code).trim().toUpperCase() : null, cents: quote.discountCents, promotions: quote.discounts.map((d) => ({ id: d.id, name: d.name, cents: d.cents })), freeShipping: quote.freeShipping }) : '';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      ...(discountsOpt.length ? { discounts: discountsOpt } : {}),
      metadata: { cart: JSON.stringify(cartMeta), invoice: invoiceMeta ? JSON.stringify(invoiceMeta) : '', promo: promoMeta, shipping: JSON.stringify({ status: quote.shipping.status, zone: quote.shipping.zone || '', cp: String(req.body.postalCode || '').replace(/\D/g, '').slice(0, 5), costCents: quote.shipping.costCents }) },
      shipping_address_collection: { allowed_countries: ['MX'] },
      ...(shippingOptions.length ? { shipping_options: shippingOptions } : {}),
      phone_number_collection: { enabled: true },
      locale: 'es',
      success_url: `${publicOrigin(req)}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${publicOrigin(req)}/cancel.html`,
    }, checkoutToken.length >= 16 ? { idempotencyKey: `wj-checkout-${checkoutToken}` } : {});

    res.json({ url: session.url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Artículos: API del panel ---
function normalizeArticle(body, existing = {}) {
  const a = { ...existing };
  if (body.slug !== undefined) a.slug = slugify(body.slug || body.h1 || a.h1 || '').slice(0, 80);
  if (body.h1 !== undefined) a.h1 = cleanText(body.h1, 140);
  if (body.kicker !== undefined) a.kicker = cleanText(body.kicker, 40) || 'Artículo';
  if (body.title !== undefined) a.title = cleanText(body.title, 90) || `${a.h1} | Works Jeans`;
  if (body.description !== undefined) a.description = cleanText(body.description, 200);
  if (body.intro !== undefined) a.intro = cleanText(body.intro, 300);
  if (body.bodySource !== undefined) a.bodySource = String(body.bodySource || '').slice(0, 60000);
  if (body.faq !== undefined) a.faq = Array.isArray(body.faq) ? body.faq.slice(0, 12).map((x) => [cleanText(x[0], 200), cleanText(x[1], 600)]).filter((x) => x[0] && x[1]) : [];
  if (body.productsFilter !== undefined) a.productsFilter = Object.keys(PRODUCT_FILTERS).includes(body.productsFilter) ? body.productsFilter : 'none';
  if (body.status !== undefined) a.status = body.status === 'publicado' ? 'publicado' : 'borrador';
  if (body.publishedAt !== undefined) a.publishedAt = /^\d{4}-\d{2}-\d{2}$/.test(body.publishedAt) ? body.publishedAt : new Date().toISOString().slice(0, 10);
  a.author = a.author || 'Works Jeans';
  a.updatedAt = new Date().toISOString().slice(0, 10);
  return a;
}

app.get('/api/admin/articles', requireAdmin, perm('contenido.editar'), (req, res) => {
  res.json(getArticles().map((a) => ({ ...a, ...readingStats(articleBodyHtml(a.bodySource)) })).sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')));
});

app.post('/api/admin/articles', requireAdmin, perm('contenido.editar'), (req, res) => {
  const a = normalizeArticle(req.body || {});
  if (!a.h1 || !a.slug) { res.status(400).json({ error: 'El artículo necesita título.' }); return; }
  if (!a.bodySource || !a.bodySource.trim()) { res.status(400).json({ error: 'Escribe el contenido del artículo.' }); return; }
  const list = getArticles();
  if (list.some((x) => x.slug === a.slug) || CONTENT.LANDINGS[a.slug]) { res.status(409).json({ error: 'Ya existe una página con esa URL. Cambia el slug.' }); return; }
  a.createdAt = new Date().toISOString();
  list.push(a);
  saveArticles(list);
  auditLog(req, 'articulos.crear', { target: a.slug });
  res.status(201).json(a);
});

app.put('/api/admin/articles/:slug', requireAdmin, perm('contenido.editar'), (req, res) => {
  const list = getArticles();
  const idx = list.findIndex((x) => x.slug === req.params.slug);
  if (idx < 0) { res.status(404).json({ error: 'Artículo no encontrado.' }); return; }
  const a = normalizeArticle(req.body || {}, list[idx]);
  if (!a.h1 || !a.slug) { res.status(400).json({ error: 'El artículo necesita título.' }); return; }
  if (a.slug !== req.params.slug && (list.some((x) => x.slug === a.slug) || CONTENT.LANDINGS[a.slug])) { res.status(409).json({ error: 'Ya existe una página con esa URL. Cambia el slug.' }); return; }
  list[idx] = a;
  saveArticles(list);
  auditLog(req, 'articulos.editar', { target: a.slug, details: { status: a.status } });
  res.json(a);
});

app.delete('/api/admin/articles/:slug', requireAdmin, perm('contenido.editar'), (req, res) => {
  const list = getArticles();
  if (!list.some((x) => x.slug === req.params.slug)) { res.status(404).json({ error: 'Artículo no encontrado.' }); return; }
  saveArticles(list.filter((x) => x.slug !== req.params.slug));
  auditLog(req, 'articulos.eliminar', { target: req.params.slug });
  res.json({ ok: true });
});

// --- Medición propia (sin datos personales): contadores por día y evento ---
const TRACK_EVENTS = new Set(['page_view', 'product_view', 'size_selected', 'add_to_cart', 'begin_checkout', 'shipping_calculated', 'whatsapp_click', 'b2b_quote_started', 'b2b_quote_submitted', 'technical_sheet_downloaded', 'purchase']);
const seenSessions = new Map(); // día -> Set de sesiones (para contar visitas únicas del día)
function readAnalytics() {
  try { return JSON.parse(fs.readFileSync(ANALYTICS_PATH, 'utf-8')); } catch { return {}; }
}
let analyticsBuffer = null;
let analyticsTimer = null;
function trackEvent(event, { sid, path, item, cents } = {}) {
  if (!TRACK_EVENTS.has(event)) return;
  if (!analyticsBuffer) analyticsBuffer = readAnalytics();
  const day = new Date().toISOString().slice(0, 10);
  const d = analyticsBuffer[day] = analyticsBuffer[day] || { events: {}, items: {}, paths: {}, sessions: 0, revenueCents: 0 };
  d.events[event] = (d.events[event] || 0) + 1;
  if (item && ['product_view', 'add_to_cart'].includes(event)) {
    d.items[event] = d.items[event] || {};
    d.items[event][item] = (d.items[event][item] || 0) + 1;
  }
  if (event === 'page_view' && path) d.paths[path] = (d.paths[path] || 0) + 1;
  if (event === 'purchase' && cents) d.revenueCents += cents;
  if (sid && event === 'page_view') {
    if (!seenSessions.has(day)) seenSessions.set(day, new Set());
    const set = seenSessions.get(day);
    if (!set.has(sid) && set.size < 50000) { set.add(sid); d.sessions += 1; }
    for (const k of seenSessions.keys()) if (k !== day) seenSessions.delete(k);
  }
  // Se guarda en disco como mucho una vez por segundo.
  clearTimeout(analyticsTimer);
  analyticsTimer = setTimeout(() => {
    try {
      const keys = Object.keys(analyticsBuffer).sort();
      for (const k of keys.slice(0, Math.max(0, keys.length - 400))) delete analyticsBuffer[k];
      fs.writeFileSync(ANALYTICS_PATH, JSON.stringify(analyticsBuffer));
    } catch { /* sin disco */ }
  }, 1000);
}

app.post('/api/track', express.text({ type: '*/*', limit: '2kb' }), (req, res) => {
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const event = String(b.event || '');
    if (event === 'purchase' || !TRACK_EVENTS.has(event)) { res.status(204).end(); return; }
    trackEvent(event, { sid: String(b.sid || '').slice(0, 20), path: String(b.path || '').slice(0, 80), item: String(b.props?.item || '').slice(0, 80) });
  } catch { /* cuerpo inválido: se ignora */ }
  res.status(204).end();
});

app.get('/api/admin/analytics', requireAdmin, perm('reportes.ver'), (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
  const data = analyticsBuffer || readAnalytics();
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const totals = { days, sessions: 0, revenueCents: 0, events: {}, items: { product_view: {}, add_to_cart: {} }, paths: {}, byDay: [] };
  for (const [day, d] of Object.entries(data).sort()) {
    if (day < since) continue;
    totals.sessions += d.sessions || 0;
    totals.revenueCents += d.revenueCents || 0;
    for (const [e, n] of Object.entries(d.events || {})) totals.events[e] = (totals.events[e] || 0) + n;
    for (const e of ['product_view', 'add_to_cart']) for (const [id, n] of Object.entries(d.items?.[e] || {})) totals.items[e][id] = (totals.items[e][id] || 0) + n;
    for (const [p, n] of Object.entries(d.paths || {})) totals.paths[p] = (totals.paths[p] || 0) + n;
    totals.byDay.push({ day, sessions: d.sessions || 0, purchases: d.events?.purchase || 0 });
  }
  const leads = getLeads().filter((l) => l.createdAt.slice(0, 10) >= since);
  totals.b2b = { visits: totals.paths['/empresas'] || 0, started: totals.events.b2b_quote_started || 0, submitted: leads.length, contacted: leads.filter((l) => l.status !== 'nuevo').length, won: leads.filter((l) => l.status === 'ganado').length, lost: leads.filter((l) => l.status === 'perdido').length };
  res.json(totals);
});

// --- Reseñas: invitación por pedido, envío y moderación ---
const reviewAttempts = new Map();
app.get('/api/reviews/invite/:token', (req, res) => {
  const token = String(req.params.token || '');
  const order = /^[a-f0-9]{24}$/.test(token) ? getOrders().find((o) => o.reviewToken === token) : null;
  if (!order) { res.status(404).json({ error: 'Este enlace no es válido o ya caducó.' }); return; }
  const done = new Set(getReviews().filter((r) => r.orderId === order.id).map((r) => r.productId));
  const products = getProducts();
  const seen = new Set();
  const items = order.items.filter((i) => !done.has(i.id) && !seen.has(i.id) && seen.add(i.id)).map((i) => ({ productId: i.id, name: i.name, size: i.size, quantity: order.items.filter((x) => x.id === i.id).reduce((s, x) => s + x.quantity, 0), image: products.find((p) => p.id === i.id)?.image || '' }));
  res.set('Cache-Control', 'no-store');
  res.json({ orderId: order.id, firstName: String(order.customerName || '').split(/\s+/)[0] || '', items });
});

app.post('/api/reviews', (req, res) => {
  const b = req.body || {};
  const token = String(b.token || '');
  const order = /^[a-f0-9]{24}$/.test(token) ? getOrders().find((o) => o.reviewToken === token) : null;
  if (!order) { res.status(404).json({ error: 'Este enlace no es válido.' }); return; }
  const now = Date.now();
  const recent = (reviewAttempts.get(clientIp(req)) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 10) { res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' }); return; }
  reviewAttempts.set(clientIp(req), [...recent, now]);
  const productId = cleanText(b.productId, 80);
  const rating = parseInt(b.rating, 10);
  const comment = cleanText(b.comment, 600);
  if (!order.items.some((i) => i.id === productId)) { res.status(400).json({ error: 'Ese producto no está en el pedido.' }); return; }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) { res.status(400).json({ error: 'La calificación debe ser de 1 a 5.' }); return; }
  if (comment.length < 10) { res.status(400).json({ error: 'Escribe un comentario de al menos 10 letras.' }); return; }
  const list = getReviews();
  if (list.some((r) => r.orderId === order.id && r.productId === productId)) { res.status(409).json({ error: 'Ya calificaste este producto. ¡Gracias!' }); return; }
  const product = getProducts().find((p) => p.id === productId);
  const review = { id: `rev_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`, productId, productName: product?.name || order.items.find((i) => i.id === productId)?.name || productId, orderId: order.id, customerName: order.customerName || '', displayName: displayNameFor(order.customerName), rating, comment, verified: true, status: 'pendiente', createdAt: new Date().toISOString() };
  list.push(review);
  saveReviews(list);
  sendEmail({ subject: `Nueva reseña (${rating}/5) de ${review.productName}`, html: `<p><b>${escapeHtml(review.displayName)}</b> calificó <b>${escapeHtml(review.productName)}</b> con ${rating}/5:</p><p style="white-space:pre-wrap">${escapeHtml(comment)}</p><p>Apruébala en el panel → Ventas → Reseñas.</p>` });
  res.status(201).json({ ok: true });
});

app.get('/api/admin/reviews', requireAdmin, perm('pedidos.ver'), (req, res) => {
  res.json(getReviews().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});
app.put('/api/admin/reviews/:id', requireAdmin, perm('pedidos.editar'), (req, res) => {
  const list = getReviews();
  const r = list.find((x) => x.id === req.params.id);
  if (!r) { res.status(404).json({ error: 'Reseña no encontrada.' }); return; }
  if (['pendiente', 'aprobada', 'rechazada'].includes(req.body?.status)) { r.status = req.body.status; r.moderatedAt = new Date().toISOString(); }
  saveReviews(list);
  auditLog(req, 'resenas.moderar', { target: r.id, details: { status: r.status } });
  res.json(r);
});
app.delete('/api/admin/reviews/:id', requireAdmin, perm('pedidos.eliminar'), (req, res) => {
  const list = getReviews();
  if (!list.some((x) => x.id === req.params.id)) { res.status(404).json({ error: 'Reseña no encontrada.' }); return; }
  saveReviews(list.filter((x) => x.id !== req.params.id));
  auditLog(req, 'resenas.eliminar', { target: req.params.id });
  res.json({ ok: true });
});
app.post('/api/admin/orders/:id/review-link', requireAdmin, perm('pedidos.editar'), (req, res) => {
  const token = ensureReviewToken(req.params.id);
  if (!token) { res.status(404).json({ error: 'Pedido no encontrado.' }); return; }
  res.json({ url: `${publicOrigin(req)}/resena?t=${token}` });
});

// --- Cotizaciones de empresas (leads): quedan guardadas y avisan por correo ---
const LEAD_STATUS = ['nuevo', 'contactado', 'cotizado', 'negociacion', 'ganado', 'perdido'];
const leadAttempts = new Map();
app.post('/api/leads', async (req, res) => {
  const b = req.body || {};
  if (b.website) { res.json({ ok: true }); return; } // trampa para bots
  const lead = {
    id: `lead_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
    createdAt: new Date().toISOString(),
    status: 'nuevo',
    name: cleanText(b.name, 120),
    company: cleanText(b.company, 120),
    email: cleanText(b.email, 120).toLowerCase(),
    phone: cleanText(b.phone, 40),
    city: cleanText(b.city, 80),
    state: cleanText(b.state, 60),
    headcount: Math.max(0, parseInt(b.headcount, 10) || 0) || null,
    customization: cleanText(b.customization, 80),
    notes: cleanText(b.notes, 1500),
    lines: Array.isArray(b.lines) ? b.lines.slice(0, 30).map((l) => ({ id: cleanText(l.id, 80), name: cleanText(l.name, 120), total: Math.max(0, parseInt(l.total, 10) || 0), sizes: Object.fromEntries(Object.entries(l.sizes || {}).slice(0, 40).map(([k, v]) => [cleanText(k, 30), Math.max(0, parseInt(v, 10) || 0)])) })) : [],
    internalNotes: '',
    source: 'empresas',
    repeatToken: crypto.randomBytes(12).toString('hex'),
    repeatOf: null,
  };
  if (b.repeatOf) {
    const original = getLeads().find((l) => l.repeatToken === String(b.repeatOf));
    if (original) lead.repeatOf = original.id;
  }
  lead.totalPieces = lead.lines.reduce((s, l) => s + l.total, 0);
  if (!lead.name || !lead.company || !lead.phone || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) {
    res.status(400).json({ error: 'Completa nombre, empresa, correo y teléfono.' });
    return;
  }
  const now = Date.now();
  const recent = (leadAttempts.get(clientIp(req)) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) {
    res.status(429).json({ error: 'Demasiadas cotizaciones seguidas. Escríbenos por WhatsApp.' });
    return;
  }
  leadAttempts.set(clientIp(req), [...recent, now]);
  const list = getLeads();
  list.push(lead);
  saveLeads(list);
  const detail = lead.lines.map((l) => `${l.name}: ${Object.entries(l.sizes).map(([s, q]) => `${s}×${q}`).join(', ')} (${l.total} pzas)`).join('<br>');
  const emailed = await sendEmail({
    subject: `Cotización de empresa: ${lead.company}`,
    html: `<h2>Nueva cotización desde www.workjeans.mx/empresas</h2><p><b>${escapeHtml(lead.company)}</b> · ${escapeHtml(lead.name)}<br>${escapeHtml(lead.email)} · ${escapeHtml(lead.phone)}<br>${escapeHtml([lead.city, lead.state].filter(Boolean).join(', '))}</p><p>${detail ? escapeHtml(detail).replace(/&lt;br&gt;/g, '<br>') : 'Sin desglose por talla.'}<br>Total: ${lead.totalPieces} piezas${lead.headcount ? ` · ~${lead.headcount} personas` : ''}${lead.customization ? ` · ${escapeHtml(lead.customization)}` : ''}</p>${lead.notes ? `<p style="white-space:pre-wrap">${escapeHtml(lead.notes)}</p>` : ''}<p>Revisa y da seguimiento en el panel → Ventas → Cotizaciones.</p>`,
  });
  if (customerEmailsEnabled()) {
    const repeatUrl = `https://www.workjeans.mx/empresas?repetir=${lead.repeatToken}`;
    const linesHtml = lead.lines.length ? `<ul>${lead.lines.map((l) => `<li>${escapeHtml(l.name)}: ${escapeHtml(Object.entries(l.sizes).map(([s, q]) => `${s} × ${q}`).join(', '))} (${l.total} pzas)</li>`).join('')}</ul>` : '';
    sendEmailTo({ to: lead.email, subject: `Recibimos tu cotización · Works Jeans`, html: emailLayout('Recibimos tu cotización.', `<p>Hola ${escapeHtml(lead.name.split(' ')[0])}. Ya tenemos tu solicitud para <b>${escapeHtml(lead.company)}</b>; te respondemos por WhatsApp o correo en horario de tienda (lunes a viernes, 9:00 a 18:00).</p>${linesHtml}${lead.customization ? `<p>Personalización: ${escapeHtml(lead.customization)}</p>` : ''}<p style="margin-top:22px"><b>Para la próxima vez:</b> con este enlace repites el mismo pedido y solo ajustas cantidades.<br><a href="${repeatUrl}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#ffd600;color:#0f0f0f;text-decoration:none;font-weight:700;border:1.5px solid #0f0f0f">Repetir este pedido</a></p>`) });
  }
  res.status(201).json({ ok: true, id: lead.id, emailed, repeatToken: lead.repeatToken });
});

// Datos de una cotización anterior para repetirla (el enlace es privado, con token aleatorio). Sin notas internas.
app.get('/api/leads/repeat/:token', (req, res) => {
  const token = String(req.params.token || '');
  const lead = /^[a-f0-9]{24}$/.test(token) ? getLeads().find((l) => l.repeatToken === token) : null;
  if (!lead) { res.status(404).json({ error: 'Enlace no válido.' }); return; }
  const current = new Set(publicProducts().map((p) => p.id));
  res.set('Cache-Control', 'no-store');
  res.json({ company: lead.company, name: lead.name, email: lead.email, phone: lead.phone, city: lead.city, state: lead.state, customization: lead.customization, createdAt: lead.createdAt, lines: lead.lines.filter((l) => current.has(l.id)) });
});

app.get('/api/admin/leads', requireAdmin, perm('pedidos.ver'), (req, res) => {
  res.json(getLeads().sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)));
});

app.put('/api/admin/leads/:id', requireAdmin, perm('pedidos.editar'), (req, res) => {
  const list = getLeads();
  const lead = list.find((l) => l.id === req.params.id);
  if (!lead) { res.status(404).json({ error: 'Cotización no encontrada.' }); return; }
  if (req.body.status !== undefined && LEAD_STATUS.includes(req.body.status)) { lead.status = req.body.status; lead.statusAt = new Date().toISOString(); }
  if (req.body.internalNotes !== undefined) lead.internalNotes = cleanText(req.body.internalNotes, 2000);
  saveLeads(list);
  res.json(lead);
});

app.delete('/api/admin/leads/:id', requireAdmin, perm('pedidos.eliminar'), (req, res) => {
  const list = getLeads();
  if (!list.some((l) => l.id === req.params.id)) { res.status(404).json({ error: 'Cotización no encontrada.' }); return; }
  saveLeads(list.filter((l) => l.id !== req.params.id));
  res.json({ ok: true });
});

// --- Formulario de contacto: llega por correo (si hay Resend) y siempre queda registrado ---
const contactAttempts = new Map();
app.post('/api/contact', async (req, res) => {
  const { nombre, contacto, mensaje, website } = req.body || {};
  if (website) {
    res.json({ ok: true }); // campo trampa para bots
    return;
  }
  const name = String(nombre || '').trim().slice(0, 120);
  const contact = String(contacto || '').trim().slice(0, 160);
  const message = String(mensaje || '').trim().slice(0, 2000);
  if (!name || !contact || !message) {
    res.status(400).json({ error: 'Completa nombre, contacto y mensaje.' });
    return;
  }
  const now = Date.now();
  const recent = (contactAttempts.get(clientIp(req)) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) {
    res.status(429).json({ error: 'Demasiados mensajes seguidos. Escríbenos por WhatsApp.' });
    return;
  }
  contactAttempts.set(clientIp(req), [...recent, now]);
  const sent = await sendEmail({
    subject: `Mensaje del sitio: ${name}`,
    html: `<h2>Nuevo mensaje desde www.workjeans.mx</h2><p><b>Nombre:</b> ${escapeHtml(name)}<br><b>Contacto:</b> ${escapeHtml(contact)}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
  });
  res.json({ ok: true, emailed: sent });
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
    // Solo lo necesario para la página de gracias: nada de datos personales.
    res.json({ id: order.id, status: order.status, totalCents: order.totalCents, items: order.items.map((i) => ({ name: i.name, size: i.size, quantity: i.quantity })) });
  } catch (err) {
    res.status(400).json({ error: 'No se pudo verificar el pago.' });
  }
});

// --- Proveedores ---

app.get('/api/admin/suppliers', requireAdmin, perm('compras.ver'), (req, res) => res.json(getSuppliers()));

app.post('/api/admin/suppliers', requireAdmin, perm('compras.editar'), (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 120);
  if (!name) {
    res.status(400).json({ error: 'El proveedor necesita nombre.' });
    return;
  }
  const list = getSuppliers();
  const supplier = {
    id: `sup_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    name: cleanText(name, 120),
    contact: cleanText(req.body.contact, 120),
    phone: cleanText(req.body.phone, 40),
    email: cleanText(req.body.email, 120),
    products: cleanText(req.body.products, 300),
    notes: cleanText(req.body.notes, 500),
    createdAt: new Date().toISOString(),
  };
  list.push(supplier);
  saveSuppliers(list);
  res.status(201).json(supplier);
});

app.put('/api/admin/suppliers/:id', requireAdmin, perm('compras.editar'), (req, res) => {
  const list = getSuppliers();
  const s = list.find((x) => x.id === req.params.id);
  if (!s) {
    res.status(404).json({ error: 'Proveedor no encontrado.' });
    return;
  }
  for (const k of ['name', 'contact', 'phone', 'email', 'products', 'notes']) {
    if (req.body[k] !== undefined) s[k] = cleanText(req.body[k], k === 'notes' ? 500 : 300);
  }
  saveSuppliers(list);
  res.json(s);
});

app.delete('/api/admin/suppliers/:id', requireAdmin, perm('compras.editar'), (req, res) => {
  const list = getSuppliers();
  const next = list.filter((x) => x.id !== req.params.id);
  if (next.length === list.length) {
    res.status(404).json({ error: 'Proveedor no encontrado.' });
    return;
  }
  saveSuppliers(next);
  res.json({ ok: true });
});

// --- Órdenes de compra ---

function purchaseTotals(po) {
  const ordered = po.items.reduce((s, i) => s + i.qty, 0);
  const received = po.items.reduce((s, i) => s + (i.received || 0), 0);
  const totalCents = po.items.reduce((s, i) => s + i.qty * i.costCents, 0);
  const paidCents = (po.payments || []).reduce((s, p) => s + p.amountCents, 0);
  return { ordered, received, totalCents, paidCents, dueCents: Math.max(0, totalCents - paidCents) };
}

app.get('/api/admin/purchases', requireAdmin, perm('compras.ver'), (req, res) => {
  const list = getPurchases().map((po) => ({ ...po, totals: purchaseTotals(po) })).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  res.json(list);
});

app.post('/api/admin/purchases', requireAdmin, perm('compras.editar'), (req, res) => {
  const { supplierId, supplierName, items, eta, notes, invoice, status } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Agrega al menos una partida a la orden.' });
    return;
  }
  const products = getProducts();
  const lines = [];
  for (const it of items) {
    const product = products.find((p) => p.id === it.productId);
    const qty = parseInt(it.qty, 10);
    const cost = parseMoney(it.costMxn ?? (it.costCents != null ? it.costCents / 100 : ''));
    if (!product || !(qty > 0) || cost == null) continue;
    const variant = it.size ? findVariant(product, it.size) : null;
    lines.push({ productId: product.id, productName: product.name, size: variant ? variantLabel(variant) : (String(it.size || '').trim() || null), sku: variant?.sku || product.sku || null, qty, costCents: cost, received: 0 });
  }
  if (lines.length === 0) {
    res.status(400).json({ error: 'Las partidas necesitan producto, cantidad y costo válidos.' });
    return;
  }
  const suppliers = getSuppliers();
  const supplier = suppliers.find((s) => s.id === supplierId);
  const list = getPurchases();
  const po = {
    id: nextFolio(list, 'OC'),
    supplierId: supplier?.id || null,
    supplierName: supplier?.name || String(supplierName || '').trim().slice(0, 120) || 'Sin proveedor',
    status: status === 'borrador' ? 'borrador' : 'enviada',
    createdAt: new Date().toISOString(),
    eta: eta ? String(eta).slice(0, 10) : null,
    invoice: String(invoice || '').trim().slice(0, 80),
    notes: String(notes || '').trim().slice(0, 500),
    items: lines,
    payments: [],
  };
  list.push(po);
  savePurchases(list);
  res.status(201).json({ ...po, totals: purchaseTotals(po) });
});

app.put('/api/admin/purchases/:id', requireAdmin, perm('compras.editar'), (req, res) => {
  const list = getPurchases();
  const po = list.find((x) => x.id === req.params.id);
  if (!po) {
    res.status(404).json({ error: 'Orden no encontrada.' });
    return;
  }
  const { status, eta, invoice, notes, payment } = req.body;
  if (status !== undefined) {
    if (!['borrador', 'enviada', 'parcial', 'recibida', 'cancelada'].includes(status)) {
      res.status(400).json({ error: 'Estado no válido.' });
      return;
    }
    po.status = status;
  }
  if (eta !== undefined) po.eta = eta ? String(eta).slice(0, 10) : null;
  if (invoice !== undefined) po.invoice = String(invoice || '').trim().slice(0, 80);
  if (notes !== undefined) po.notes = String(notes || '').trim().slice(0, 500);
  if (payment && parseMoney(payment.amountMxn)) {
    po.payments = po.payments || [];
    po.payments.push({ date: payment.date ? String(payment.date).slice(0, 10) : new Date().toISOString().slice(0, 10), amountCents: parseMoney(payment.amountMxn), note: String(payment.note || '').slice(0, 120) });
  }
  savePurchases(list);
  res.json({ ...po, totals: purchaseTotals(po) });
});

// Recepción de mercancía de una orden: suma al inventario y registra los movimientos.
app.post('/api/admin/purchases/:id/receive', requireAdmin, perm('compras.editar'), (req, res) => {
  const list = getPurchases();
  const po = list.find((x) => x.id === req.params.id);
  if (!po) {
    res.status(404).json({ error: 'Orden no encontrada.' });
    return;
  }
  if (['cancelada'].includes(po.status)) {
    res.status(400).json({ error: 'La orden está cancelada.' });
    return;
  }
  const warehouse = String(req.body.warehouse || '').trim();
  const updateCost = req.body.updateCost !== false;
  const products = getProducts();
  const movements = [];
  let receivedNow = 0;
  const wanted = Array.isArray(req.body.items) ? req.body.items : po.items.map((i, idx) => ({ index: idx, qty: i.qty - (i.received || 0) }));
  for (const w of wanted) {
    const line = po.items[w.index];
    const qty = parseInt(w.qty, 10);
    if (!line || !(qty > 0)) continue;
    const product = products.find((p) => p.id === line.productId);
    if (!product) continue;
    let variant = line.size ? findVariant(product, line.size) : product.sizes[0];
    if (!variant && line.size) {
      variant = { size: line.size, stock: 0 };
      variant.sku = autoSku(product, variant);
      product.sizes.push(variant);
    }
    if (!variant) continue;
    applyStockDelta(variant, qty, warehouse);
    if (updateCost) variant.costCents = line.costCents;
    line.received = (line.received || 0) + qty;
    receivedNow += qty;
    movements.push({ productId: product.id, productName: product.name, size: variantLabel(variant), sku: variant.sku, delta: qty, stockAfter: variant.stock, reason: `Recepción ${po.id} · ${po.supplierName}`, orderId: null, supplier: po.supplierName, costCents: line.costCents, type: 'entrada', warehouse: warehouse || warehouseNames()[0], purchaseId: po.id });
  }
  if (receivedNow === 0) {
    res.status(400).json({ error: 'No hay piezas por recibir.' });
    return;
  }
  saveProducts(products);
  logInventory(movements);
  const t = purchaseTotals(po);
  po.status = t.received >= t.ordered ? 'recibida' : 'parcial';
  po.receivedAt = new Date().toISOString();
  savePurchases(list);
  res.json({ ...po, totals: purchaseTotals(po), receivedNow });
});

// --- Devoluciones y cambios ---

const RETURN_REASONS = ['quedo-grande', 'quedo-chico', 'defecto', 'cambio-modelo', 'cambio-color', 'otro'];
const RETURN_REASON_LABELS = { 'quedo-grande': 'Le quedó grande', 'quedo-chico': 'Le quedó chico', defecto: 'Defecto', 'cambio-modelo': 'Cambio de modelo', 'cambio-color': 'Cambio de color', otro: 'Otro' };

app.get('/api/admin/returns', requireAdmin, perm('devoluciones.ver'), (req, res) => {
  res.json(getReturns().sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)));
});

app.post('/api/admin/returns', requireAdmin, perm('devoluciones.editar'), (req, res) => {
  const { orderId, items, type, refundMxn, restock, warehouse, notes, exchangeItems } = req.body;
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado.' });
    return;
  }
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Indica qué piezas regresan.' });
    return;
  }
  const products = getProducts();
  const lines = [];
  const movements = [];
  for (const it of items) {
    const sold = order.items.find((i) => i.id === it.productId && (i.size || null) === (it.size || null));
    const qty = parseInt(it.qty, 10);
    if (!sold || !(qty > 0)) continue;
    const reason = RETURN_REASONS.includes(it.reason) ? it.reason : 'otro';
    lines.push({ productId: sold.id, productName: sold.name, size: sold.size || null, sku: sold.sku || null, qty, reason, priceCents: sold.priceCents });
    if (restock !== false) {
      const product = products.find((p) => p.id === sold.id);
      const variant = product ? findVariant(product, sold.size) : null;
      if (variant) {
        applyStockDelta(variant, qty, warehouse);
        movements.push({ productId: product.id, productName: product.name, size: variantLabel(variant), sku: variant.sku, delta: qty, stockAfter: variant.stock, reason: `Devolución de ${order.id} · ${RETURN_REASON_LABELS[reason]}`, orderId: order.id, warehouse: warehouse || warehouseNames()[0], type: 'devolucion' });
      }
    }
  }
  if (lines.length === 0) {
    res.status(400).json({ error: 'Las piezas indicadas no coinciden con el pedido.' });
    return;
  }
  // Cambio: las piezas nuevas que se entregan salen del inventario.
  const exchange = [];
  if (type === 'cambio' && Array.isArray(exchangeItems)) {
    for (const ex of exchangeItems) {
      const product = products.find((p) => p.id === ex.productId);
      const variant = product ? findVariant(product, ex.size) : null;
      const qty = parseInt(ex.qty, 10);
      if (!variant || !(qty > 0)) continue;
      applyStockDelta(variant, -qty, warehouse);
      exchange.push({ productId: product.id, productName: product.name, size: variantLabel(variant), sku: variant.sku, qty });
      movements.push({ productId: product.id, productName: product.name, size: variantLabel(variant), sku: variant.sku, delta: -qty, stockAfter: variant.stock, reason: `Cambio por ${order.id}`, orderId: order.id, warehouse: warehouse || warehouseNames()[0], type: 'cambio' });
    }
  }
  if (movements.length) {
    saveProducts(products);
    logInventory(movements);
  }
  const list = getReturns();
  const ret = {
    id: nextFolio(list, 'DEV'),
    orderId: order.id,
    customerName: order.customerName || '',
    type: type === 'cambio' ? 'cambio' : 'devolucion',
    createdAt: new Date().toISOString(),
    items: lines,
    exchangeItems: exchange,
    refundCents: parseMoney(refundMxn) || 0,
    restocked: restock !== false,
    notes: cleanText(notes, 500),
  };
  list.push(ret);
  saveReturns(list);
  const returnedQty = lines.reduce((s, l) => s + l.qty, 0);
  const soldQty = order.items.reduce((s, i) => s + i.quantity, 0);
  const alreadyReturned = getReturns().filter((r) => r.orderId === order.id && r.type === 'devolucion').reduce((s, r) => s + r.items.reduce((a, l) => a + l.qty, 0), 0);
  order.returns = (order.returns || 0) + returnedQty;
  if (ret.type === 'devolucion' && alreadyReturned >= soldQty) order.status = 'devuelto';
  saveOrders(orders);
  res.status(201).json(ret);
});

// Estadísticas de devoluciones: por talla y motivo, con tasa sobre lo vendido.
app.get('/api/admin/returns/stats', requireAdmin, perm('devoluciones.ver'), (req, res) => {
  const soldBySize = {};
  const soldByProduct = {};
  for (const o of getOrders()) {
    if (o.status === 'cancelado') continue;
    for (const i of o.items) {
      const key = `${i.id}|${i.size || ''}`;
      soldBySize[key] = (soldBySize[key] || 0) + i.quantity;
      soldByProduct[i.id] = (soldByProduct[i.id] || 0) + i.quantity;
    }
  }
  const bySize = {};
  const byReason = {};
  const byProduct = {};
  let total = 0;
  for (const r of getReturns()) {
    for (const l of r.items) {
      total += l.qty;
      const key = `${l.productId}|${l.size || ''}`;
      bySize[key] = bySize[key] || { productId: l.productId, productName: l.productName, size: l.size, returned: 0, reasons: {} };
      bySize[key].returned += l.qty;
      bySize[key].reasons[l.reason] = (bySize[key].reasons[l.reason] || 0) + l.qty;
      byReason[l.reason] = (byReason[l.reason] || 0) + l.qty;
      byProduct[l.productId] = byProduct[l.productId] || { productId: l.productId, productName: l.productName, returned: 0 };
      byProduct[l.productId].returned += l.qty;
    }
  }
  res.json({
    total,
    reasons: RETURN_REASON_LABELS,
    byReason,
    bySize: Object.entries(bySize).map(([key, v]) => ({ ...v, sold: soldBySize[key] || 0, rate: soldBySize[key] ? v.returned / soldBySize[key] : null })).sort((a, b) => b.returned - a.returned),
    byProduct: Object.values(byProduct).map((v) => ({ ...v, sold: soldByProduct[v.productId] || 0, rate: soldByProduct[v.productId] ? v.returned / soldByProduct[v.productId] : null })).sort((a, b) => b.returned - a.returned),
  });
});

// --- Clientes: se arman a partir de los pedidos (sin tabla aparte) ---

// Clave que identifica a un cliente: teléfono (solo dígitos), si no correo, si no nombre.
function customerKey({ phone, email, name }) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits || String(email || '').trim().toLowerCase() || String(name || '').trim().toLowerCase();
}

app.get('/api/admin/customers', requireAdmin, perm('clientes.ver'), (req, res) => {
  const customers = new Map();
  // Clientes capturados a mano en el panel (aparecen aunque todavía no tengan pedidos).
  for (const m of getCustomers()) {
    const key = customerKey(m);
    if (!key) continue;
    customers.set(key, { key, id: m.id, manual: true, name: m.name || '', phone: m.phone || '', email: m.email || '', company: m.company || '', notes: m.notes || '', orders: 0, pieces: 0, totalCents: 0, firstAt: null, lastAt: null, createdAt: m.createdAt });
  }
  for (const o of getOrders()) {
    if (o.status === 'cancelado') continue;
    const key = customerKey({ phone: o.customerPhone, email: o.customerEmail, name: o.customerName });
    if (!key) continue;
    const c = customers.get(key) || { key, name: '', phone: '', email: '', company: '', notes: '', orders: 0, pieces: 0, totalCents: 0, firstAt: o.createdAt, lastAt: o.createdAt };
    if (!c.firstAt) { c.firstAt = o.createdAt; c.lastAt = o.createdAt; }
    if (o.customerName && !c.manual && (!c.name || c.name.length < o.customerName.length)) c.name = o.customerName;
    if (o.customerPhone && !c.phone) c.phone = o.customerPhone;
    if (o.customerEmail && !c.email) c.email = o.customerEmail;
    c.orders += 1;
    c.pieces += o.items.reduce((sum, i) => sum + i.quantity, 0);
    c.totalCents += o.totalCents;
    if (o.createdAt < c.firstAt) c.firstAt = o.createdAt;
    if (o.createdAt > c.lastAt) c.lastAt = o.createdAt;
    customers.set(key, c);
  }
  res.json([...customers.values()].sort((a, b) => b.totalCents - a.totalCents || (b.createdAt || '').localeCompare(a.createdAt || '')));
});

function normalizeCustomer(body, existing = {}) {
  const c = { ...existing };
  if (body.name !== undefined) c.name = cleanText(body.name, 120);
  if (body.phone !== undefined) c.phone = cleanText(body.phone, 40);
  if (body.email !== undefined) c.email = cleanText(body.email, 120).toLowerCase();
  if (body.company !== undefined) c.company = cleanText(body.company, 120);
  if (body.notes !== undefined) c.notes = cleanText(body.notes, 1000);
  return c;
}

app.post('/api/admin/customers', requireAdmin, perm('pedidos.editar'), (req, res) => {
  const c = normalizeCustomer(req.body || {});
  if (!c.name) { res.status(400).json({ error: 'Escribe el nombre del cliente.' }); return; }
  if (!c.phone && !c.email) { res.status(400).json({ error: 'Captura teléfono o correo para poder contactarlo.' }); return; }
  if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) { res.status(400).json({ error: 'El correo no es válido.' }); return; }
  const list = getCustomers();
  const key = customerKey(c);
  if (list.some((x) => customerKey(x) === key)) { res.status(409).json({ error: 'Ya existe un cliente con ese teléfono o correo.' }); return; }
  c.id = `cus_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  c.createdAt = new Date().toISOString();
  list.push(c);
  saveCustomers(list);
  auditLog(req, 'clientes.crear', { target: c.name });
  res.status(201).json(c);
});

app.put('/api/admin/customers/:id', requireAdmin, perm('pedidos.editar'), (req, res) => {
  const list = getCustomers();
  const idx = list.findIndex((x) => x.id === req.params.id);
  if (idx < 0) { res.status(404).json({ error: 'Cliente no encontrado.' }); return; }
  const c = normalizeCustomer(req.body || {}, list[idx]);
  if (!c.name) { res.status(400).json({ error: 'Escribe el nombre del cliente.' }); return; }
  if (!c.phone && !c.email) { res.status(400).json({ error: 'Captura teléfono o correo.' }); return; }
  const key = customerKey(c);
  if (list.some((x, i) => i !== idx && customerKey(x) === key)) { res.status(409).json({ error: 'Otro cliente ya tiene ese teléfono o correo.' }); return; }
  list[idx] = c;
  saveCustomers(list);
  auditLog(req, 'clientes.editar', { target: c.name });
  res.json(c);
});

app.delete('/api/admin/customers/:id', requireAdmin, perm('pedidos.editar'), (req, res) => {
  const list = getCustomers();
  const c = list.find((x) => x.id === req.params.id);
  if (!c) { res.status(404).json({ error: 'Cliente no encontrado.' }); return; }
  saveCustomers(list.filter((x) => x.id !== req.params.id));
  auditLog(req, 'clientes.eliminar', { target: c.name });
  res.json({ ok: true });
});

// --- Respaldo y restauración de los datos del panel (no incluye las fotos) ---

app.get('/api/admin/backup', requireAdmin, perm('respaldo'), (req, res) => {
  const backup = {
    app: 'works-jeans',
    version: 1,
    exportedAt: new Date().toISOString(),
    products: getProducts(),
    orders: getOrders(),
    settings: getSettings(),
    inventory: getInventoryLog(),
    suppliers: getSuppliers(),
    purchases: getPurchases(),
    returns: getReturns(),
    promotions: getPromotions(),
  };
  res.set('Content-Disposition', `attachment; filename="respaldo-works-jeans-${backup.exportedAt.slice(0, 10)}.json"`);
  res.json(backup);
});

app.post('/api/admin/restore', requireAdmin, perm('respaldo'), express.json({ limit: '25mb' }), (req, res) => {
  const b = req.body;
  if (!b || b.app !== 'works-jeans' || !Array.isArray(b.products) || !Array.isArray(b.orders) || typeof b.settings !== 'object') {
    res.status(400).json({ error: 'El archivo no es un respaldo válido de Works Jeans.' });
    return;
  }
  // Copia de seguridad de lo actual antes de sobrescribir, por si acaso.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const [name, file] of [['products', PRODUCTS_PATH], ['orders', ORDERS_PATH], ['settings', SETTINGS_PATH], ['inventory', INVENTORY_PATH]]) {
    if (fs.existsSync(file)) fs.copyFileSync(file, path.join(DATA_DIR, `${name}.antes-de-restaurar-${stamp}.json`));
  }
  saveProducts(b.products);
  saveOrders(b.orders);
  saveSettings(b.settings);
  fs.writeFileSync(INVENTORY_PATH, JSON.stringify(Array.isArray(b.inventory) ? b.inventory : [], null, 2) + '\n');
  if (Array.isArray(b.suppliers)) saveSuppliers(b.suppliers);
  if (Array.isArray(b.purchases)) savePurchases(b.purchases);
  if (Array.isArray(b.returns)) saveReturns(b.returns);
  if (Array.isArray(b.promotions)) savePromotions(b.promotions);
  res.json({ ok: true, products: b.products.length, orders: b.orders.length });
});

app.get('/api/admin/dashboard', requireAdmin, perm('reportes.ver'), (req, res) => {
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

// Página 404 con el estilo del sitio (para API responde JSON).
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'No encontrado.' });
    return;
  }
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.listen(PORT, () => {
  console.log(`Works Jeans corriendo en http://localhost:${PORT}`);
  if (!stripe) {
    console.log('Aviso: STRIPE_SECRET_KEY no está configurada, el pago con tarjeta estará deshabilitado.');
  }
  if (!security.getUsers().length) {
    console.log('Aviso: ADMIN_PASSWORD no está configurada, el panel admin estará deshabilitado hasta definirla.');
  }
});
