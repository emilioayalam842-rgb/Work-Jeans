const CART_KEY = 'worksjeans_cart';
const COUPON_KEY = 'worksjeans_coupon';
let CART_QUOTE = null; // última cotización del servidor (precios, promociones, cupón)
let quoteTimer = null;
let WHATSAPP_NUMBER = '528128613551';
let PAYMENTS = { provider: null };

async function loadSettings() {
  try {
    const res = await fetch('settings.json');
    const settings = await res.json();

    WHATSAPP_NUMBER = settings.whatsappNumber || WHATSAPP_NUMBER;
    PAYMENTS = settings.payments || PAYMENTS;
    const payBtn = document.getElementById('checkoutStripe');
    if (payBtn) payBtn.textContent = PAYMENTS.provider === 'openpay' ? 'Pagar en línea (tarjeta o SPEI)' : 'Pagar con tarjeta';

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el && value) el.textContent = value;
    };
    setText('googleRating', settings.googleRating);
    setText('googleReviewCount', settings.googleReviewCount);
    // La calificación de Google solo se muestra cuando ya hay al menos 5 reseñas.
    const ratingRow = document.getElementById('googleRatingRow');
    if (ratingRow) ratingRow.hidden = !(parseInt(settings.googleReviewCount, 10) >= 5);
    setText('storeAddress', settings.address);
    setText('storeHours', settings.hours);
    setText('resenasScore', settings.googleRating);
    setText('footerAddress', settings.address);
    if (Number.isFinite(parseInt(settings.lowStockThreshold, 10))) LOW_STOCK_LIMIT = parseInt(settings.lowStockThreshold, 10);
    setText('footerHours', settings.hours);

    const phoneLink = document.getElementById('storePhoneLink');
    if (phoneLink && settings.whatsappNumber) {
      phoneLink.href = `tel:+${settings.whatsappNumber}`;
      phoneLink.textContent = settings.phoneDisplay || settings.whatsappNumber;
    }
    const footerPhone = document.getElementById('footerPhoneLink');
    if (footerPhone && settings.whatsappNumber) {
      footerPhone.href = `tel:+${settings.whatsappNumber}`;
      footerPhone.textContent = settings.phoneDisplay || settings.whatsappNumber;
    }
    const callLink = document.getElementById('callLink');
    if (callLink && settings.whatsappNumber) callLink.href = `tel:+${settings.whatsappNumber}`;

    const mapsQuery = encodeURIComponent(settings.mapsQuery || settings.address || '');
    // Si hay enlace a la ficha de Google (googleMapsUrl), se usa ese; si no, una búsqueda por dirección.
    const placeUrl = settings.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
    const mapsLink = document.getElementById('mapsLink');
    if (mapsLink) mapsLink.href = placeUrl;
    const resenasLink = document.getElementById('resenasLink');
    if (resenasLink) resenasLink.href = placeUrl;
    const mapsEmbed = document.getElementById('mapsEmbed');
    if (mapsEmbed && !mapsEmbed.src && !mapsEmbed.dataset.src) mapsEmbed.dataset.src = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

    const waLinks = {
      announcementWhatsapp: 'Hola, me interesa la ropa de trabajo de Works Jeans.',
      whatsappFloat: 'Hola, me interesa la ropa de trabajo de Works Jeans.',
      mayoreoWhatsapp: 'Hola, quiero cotizar un pedido por mayoreo de Works Jeans.',
      contactWhatsapp: '',
    };
    Object.entries(waLinks).forEach(([id, msg]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.href = `https://wa.me/${WHATSAPP_NUMBER}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;
      if (id === 'contactWhatsapp' && settings.phoneDisplay) el.textContent = settings.phoneDisplay;
    });
  } catch {
    // Storefront still works with the hardcoded fallback values.
  }
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
}

let LOW_STOCK_LIMIT = 5;

// Etiqueta de variante: talla, largo (L32) y color/lavado si existen.
function variantLabel(v) {
  return [v.size, v.length ? `L${v.length}` : '', v.color || ''].filter(Boolean).join(' / ');
}

function findVariant(product, label) {
  if (!product) return null;
  return product.sizes.find((s) => variantLabel(s) === label) || product.sizes.find((s) => s.size === label) || null;
}

function variantOptions(product) {
  return product.sizes
    .map((s) => {
      const label = variantLabel(s);
      const price = s.priceCents && s.priceCents !== product.priceCents ? ` · ${formatPrice(s.priceCents)}` : '';
      return `<option value="${label}" ${s.stock <= 0 ? 'disabled' : ''}>${label}${price}${s.stock <= 0 ? ' (agotado)' : ''}</option>`;
    })
    .join('');
}

function variantPrice(productId, label) {
  const product = PRODUCTS.find((p) => p.id === productId);
  const v = findVariant(product, label);
  return v?.priceCents || product?.priceCents || 0;
}

function sizeStock(productId, size) {
  const product = PRODUCTS.find((p) => p.id === productId);
  const entry = findVariant(product, size);
  return entry ? entry.stock : null;
}

function stockNoteText(productId, size) {
  const stock = sizeStock(productId, size);
  if (stock === null) return '';
  if (stock <= 0) return 'Talla agotada por ahora. Pídela por WhatsApp y te avisamos.';
  if (stock <= LOW_STOCK_LIMIT) return `Quedan ${stock} ${stock === 1 ? 'pieza' : 'piezas'} en esta talla.`;
  return '';
}

function clampQty(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 200) : 1;
}

function addToCart(id, name, priceCents, size, quantity = 1) {
  const cart = getCart();
  const qty = clampQty(quantity);
  const existing = cart.find((item) => item.id === id && item.size === size);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({ id, name, priceCents, size, quantity: qty });
  }
  saveCart(cart);
  openCart();
  window.wjTrack?.('add_to_cart', { item: id, size });
}

function updateQuantity(id, size, quantity) {
  let cart = getCart();
  if (quantity <= 0) {
    cart = cart.filter((item) => !(item.id === id && item.size === size));
  } else {
    const item = cart.find((i) => i.id === id && i.size === size);
    if (item) item.quantity = quantity;
  }
  saveCart(cart);
}

function formatPrice(cents) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function cartTotalCents() {
  return getCart().reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

function renderCart() {
  const cart = getCart();
  const itemsEl = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  const countEl = document.getElementById('cartCount');
  if (!itemsEl || !totalEl || !countEl) return;

  countEl.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Tu carrito está vacío.</p>';
  } else {
    itemsEl.innerHTML = cart.map((item) => `
      <div class="cart-item" data-id="${item.id}" data-size="${item.size}">
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name} <span class="cart-item-size">Talla ${item.size}</span></p>
          <p class="cart-item-price">${formatPrice(item.priceCents)} c/u</p>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" data-action="decrease">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" data-action="increase">+</button>
        </div>
        <button class="cart-item-remove" data-action="remove" aria-label="Eliminar">✕</button>
      </div>
    `).join('');
  }

  totalEl.textContent = formatPrice(cartTotalCents());
  scheduleQuote();
}

function getCoupon() {
  try {
    return (localStorage.getItem(COUPON_KEY) || '').trim().toUpperCase();
  } catch {
    return '';
  }
}

function setCoupon(code) {
  try {
    if (code) localStorage.setItem(COUPON_KEY, code.toUpperCase());
    else localStorage.removeItem(COUPON_KEY);
  } catch {
    // Sin almacenamiento.
  }
}

function scheduleQuote() {
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(refreshQuote, 150);
}

// Pide al servidor la cotización real del carrito: precios por variante, promociones automáticas y cupón.
async function refreshQuote() {
  const cart = getCart();
  const summary = document.getElementById('cartSummary');
  const msg = document.getElementById('couponMsg');
  const code = getCoupon();
  const input = document.getElementById('couponInput');
  if (input && !input.value && code) input.value = code;
  if (cart.length === 0) {
    CART_QUOTE = null;
    summary.hidden = true;
    msg.textContent = '';
    return;
  }
  try {
    const res = await fetch('/api/cart/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart.map((i) => ({ id: i.id, size: i.size, quantity: i.quantity })), code, postalCode: getZip() }),
    });
    const quote = await res.json();
    CART_QUOTE = quote;
    summary.hidden = false;
    const ship = quote.shipping || {};
    const shipEl = document.getElementById('cartShipping');
    const shipMsg = document.getElementById('shipMsg');
    if (shipEl) shipEl.textContent = ship.status === 'quoted' ? formatPrice(ship.costCents) : ship.status === 'free' ? 'Gratis' : ship.status === 'pending_rates' ? 'Por confirmar' : ship.status === 'quote_required' ? 'Por cotizar' : 'Por calcular';
    if (shipMsg) {
      shipMsg.textContent = ship.label || '';
      shipMsg.classList.toggle('is-error', ['invalid_cp', 'unknown_cp'].includes(ship.status));
    }
    document.getElementById('cartSubtotal').textContent = formatPrice(quote.subtotalCents);
    document.getElementById('cartDiscounts').innerHTML = quote.discounts.map((d) => `
      <div class="cart-summary-row cart-summary-row--discount"><span>${d.name}${d.code ? ` (${d.code})` : ''}</span><span>${d.cents ? `−${formatPrice(d.cents)}` : 'Envío gratis'}</span></div>`).join('');
    document.getElementById('cartTotal').textContent = formatPrice(quote.totalCents);
    if (quote.codeError) {
      msg.textContent = quote.codeError;
      msg.classList.add('is-error');
    } else if (code && quote.discounts.some((d) => d.code === code)) {
      msg.textContent = `Cupón ${code} aplicado.`;
      msg.classList.remove('is-error');
    } else {
      msg.textContent = '';
    }
  } catch {
    // Sin conexión: se muestra el total local.
  }
}

function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
}

const INVOICE_KEY = 'worksjeans_invoice';
const ZIP_KEY = 'worksjeans_zip';
const RFC_RE = /^([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}$/;

function getZip() {
  const el = document.getElementById('shipZip');
  if (el) return el.value.replace(/\D/g, '').slice(0, 5);
  try { return (localStorage.getItem(ZIP_KEY) || '').slice(0, 5); } catch { return ''; }
}

function saveZip(value) {
  try { localStorage.setItem(ZIP_KEY, value); } catch { /* sin almacenamiento */ }
}

const INVOICE_FIELDS = ['rfc', 'name', 'email', 'zip', 'regimen', 'uso'];
const invoiceEl = (k) => document.getElementById(`invoice${k.charAt(0).toUpperCase()}${k.slice(1)}`);

function getInvoice() {
  const box = document.getElementById('cartInvoice');
  if (!box || !box.open) return null;
  const inv = {};
  INVOICE_FIELDS.forEach((k) => { inv[k] = (invoiceEl(k)?.value || '').trim(); });
  inv.rfc = inv.rfc.toUpperCase();
  if (!inv.rfc && !inv.name && !inv.email && !inv.zip) return null;
  return inv;
}

// Mensaje de error si faltan datos de factura (misma regla que el servidor).
function invoiceProblem(inv) {
  if (!inv) return '';
  if (!RFC_RE.test(inv.rfc)) return 'Revisa el RFC: 12 caracteres para empresa, 13 para persona física.';
  if (!inv.name) return 'Escribe el nombre o razón social para la factura.';
  if (!/^\d{5}$/.test(inv.zip)) return 'El código postal fiscal debe tener 5 dígitos.';
  if (!inv.regimen) return 'Elige tu régimen fiscal.';
  if (!inv.uso) return 'Elige el uso de CFDI.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inv.email)) return 'Escribe un correo válido para la factura.';
  return '';
}

let satLoaded = false;
async function loadSatCatalogs() {
  if (satLoaded) return;
  satLoaded = true;
  try {
    const data = await fetch('/api/sat-catalogs').then((r) => r.json());
    const fill = (id, map) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const current = sel.dataset.value || '';
      sel.innerHTML = '<option value="">Elige…</option>' + Object.entries(map).map(([k, v]) => `<option value="${k}" ${k === current ? 'selected' : ''}>${k} · ${v}</option>`).join('');
    };
    fill('invoiceRegimen', data.regimenes);
    fill('invoiceUso', data.usos);
  } catch {
    satLoaded = false;
  }
}

function saveInvoiceDraft() {
  try {
    const box = document.getElementById('cartInvoice');
    const draft = { open: box.open };
    INVOICE_FIELDS.forEach((k) => { draft[k] = invoiceEl(k)?.value || ''; });
    localStorage.setItem(INVOICE_KEY, JSON.stringify(draft));
  } catch {
    // Sin almacenamiento: no pasa nada.
  }
}

function restoreInvoiceDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(INVOICE_KEY) || 'null');
    if (!saved) return;
    document.getElementById('cartInvoice').open = Boolean(saved.open);
    INVOICE_FIELDS.forEach((k) => {
      const el = invoiceEl(k);
      if (!el) return;
      el.value = saved[k] || '';
      if (el.tagName === 'SELECT') el.dataset.value = saved[k] || '';
    });
    if (saved.open) loadSatCatalogs();
  } catch {
    // Ignorar.
  }
}

function buildWhatsappMessage() {
  const cart = getCart();
  const lines = cart.map((item) => `- ${item.name} (Talla ${item.size}) x${item.quantity} - ${formatPrice(item.priceCents * item.quantity)}`);
  let text = `Hola, quiero hacer un pedido:\n${lines.join('\n')}`;
  if (CART_QUOTE && CART_QUOTE.discounts.length) {
    text += `\n\nSubtotal: ${formatPrice(CART_QUOTE.subtotalCents)}`;
    CART_QUOTE.discounts.forEach((d) => { text += `\n${d.name}${d.code ? ` (cupón ${d.code})` : ''}: ${d.cents ? `-${formatPrice(d.cents)}` : 'envío gratis'}`; });
    text += `\n\nTotal: ${formatPrice(CART_QUOTE.totalCents)}`;
  } else {
    text += `\n\nTotal: ${formatPrice(cartTotalCents())}`;
  }
  const zip = getZip();
  if (zip) text += `\nCódigo postal de entrega: ${zip}${CART_QUOTE?.shipping?.label ? ` (${CART_QUOTE.shipping.label})` : ''}`;
  const invoice = getInvoice();
  if (invoice) text += `\n\nNecesito factura:\nRFC: ${invoice.rfc || '(pendiente)'}\nRazón social: ${invoice.name || '(pendiente)'}\nCP fiscal: ${invoice.zip || '(pendiente)'}\nRégimen: ${invoice.regimen || '(pendiente)'}\nUso CFDI: ${invoice.uso || '(pendiente)'}\nCorreo: ${invoice.email || '(pendiente)'}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

async function startStripeCheckout() {
  const cartMessage = document.getElementById('cartMessage');
  const cart = getCart();

  if (cart.length === 0) {
    cartMessage.textContent = 'Agrega productos antes de pagar.';
    return;
  }
  if (PAYMENTS.provider === 'openpay') {
    saveZip(getZip());
    window.wjTrack?.('begin_checkout', { items: cart.length });
    window.location.href = '/pago';
    return;
  }
  if (!PAYMENTS.provider) {
    cartMessage.textContent = 'El pago en línea aún no está activo. Pide por WhatsApp y te confirmamos transferencia o pago en tienda.';
    return;
  }

  const problem = invoiceProblem(getInvoice());
  if (problem) {
    cartMessage.textContent = problem;
    document.getElementById('cartInvoice').open = true;
    return;
  }
  if (!getZip()) {
    cartMessage.textContent = 'Escribe tu código postal para calcular el envío antes de pagar.';
    document.getElementById('shipZip')?.focus();
    return;
  }
  const btn = document.getElementById('checkoutStripe');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Procesando…';
  cartMessage.textContent = 'Redirigiendo al pago...';
  const token = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^\w-]/g, '');
  window.wjTrack?.('begin_checkout', { items: cart.length });

  try {
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map((item) => ({ id: item.id, quantity: item.quantity, size: item.size })),
        invoice: getInvoice(),
        code: getCoupon() || null,
        postalCode: getZip(),
        checkoutToken: token,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      cartMessage.innerHTML = data.code === 'quote_required'
        ? `${data.error} <a href="/empresas">Cotizar para empresa</a>`
        : (data.error || 'No se pudo iniciar el pago. Intenta por WhatsApp.');
      btn.disabled = false;
      btn.textContent = original;
      return;
    }

    window.location.href = data.url;
  } catch {
    btn.disabled = false;
    btn.textContent = original;
    cartMessage.textContent = 'Pago en línea no disponible ahora mismo. Usa el botón de WhatsApp.';
  }
}

function priceHtml(product) {
  const compare = product.comparePriceCents && product.comparePriceCents > product.priceCents
    ? `<s class="price-compare">${formatPrice(product.comparePriceCents)}</s>` : '';
  return `${compare}${formatPrice(product.priceCents)}<small>MXN</small>`;
}

function wholesaleHtml(product) {
  if (!product.wholesale) return '';
  return `<p class="product-wholesale">Mayoreo: <b>${formatPrice(product.wholesale.priceCents)}</b> c/u desde ${product.wholesale.minQty} pzas</p>`;
}

function tagHtml(product) {
  if (product.tag === 'nuevo') return '<span class="product-tag product-tag--nuevo">Nuevo</span>';
  if (product.tag === 'oferta') return '<span class="product-tag product-tag--oferta">Oferta</span>';
  return '';
}

// Rutas de imagen redimensionada (el servidor las genera y cachea).
function imgSrc(path, width) {
  return `/img/${width}/${path}`;
}
function imgSrcset(path) {
  return [320, 480, 640, 800].map((w) => `${imgSrc(path, w)} ${w}w`).join(', ');
}
const CARD_SIZES = '(max-width: 600px) calc(100vw - 40px), (max-width: 1024px) 45vw, 360px';

function renderProductCard(product) {
  const totalStock = product.sizes.reduce((sum, s) => sum + s.stock, 0);
  const sizeOptions = variantOptions(product);
  // Siempre se muestran las miniaturas (aunque haya una sola) para que todas las tarjetas alineen igual.
  const images = product.images && product.images.length ? product.images : [product.image];
  const gallery = `<div class="product-thumbs">${
    images.map((img, i) => `<img src="${imgSrc(img, 320)}" alt="" class="product-thumb ${i === 0 ? 'active' : ''}" data-src="${img}" loading="lazy" width="46" height="58">`).join('')
  }</div>`;
  const firstSize = product.sizes[0] ? product.sizes[0].size : '';
  const lastSize = product.sizes.length ? product.sizes[product.sizes.length - 1].size : '';
  const sizeRange = firstSize && lastSize && firstSize !== lastSize ? `<b>${firstSize}</b> / <b>${lastSize}</b>` : `<b>${firstSize}</b>`;

  return `
    <article class="product-card reveal" data-id="${product.id}" data-name="${product.name}" data-price="${product.priceCents}">
      <span class="product-category">${product.category}</span>
      ${tagHtml(product)}
      ${totalStock <= 0 ? '<span class="product-soldout">Agotado</span>' : ''}
      <img src="${imgSrc(product.image, 640)}" srcset="${imgSrcset(product.image)}" sizes="${CARD_SIZES}" alt="${product.name} · ropa de trabajo de mezclilla Works Jeans" class="product-photo" data-main-photo loading="lazy" decoding="async" width="800" height="1000">
      ${gallery}
      <h3><a href="/producto/${product.id}">${product.name}</a></h3>
      <p class="product-sizes">Tallas ${sizeRange}</p>
      <p class="price">${priceHtml(product)}</p>
      ${wholesaleHtml(product)}
      <p class="product-desc">${product.description}</p>
      <div class="card-row">
        <div>
          <label class="size-label" for="size-${product.id}">Talla</label>
          <select class="size-select" id="size-${product.id}" ${totalStock <= 0 ? 'disabled' : ''}>
            ${sizeOptions}
          </select>
        </div>
        <div>
          <label class="size-label" for="qty-${product.id}">Cant.</label>
          <div class="qty-picker">
            <button type="button" data-qty="-1" aria-label="Menos">−</button>
            <input type="number" id="qty-${product.id}" class="qty-input" value="1" min="1" max="200" inputmode="numeric" ${totalStock <= 0 ? 'disabled' : ''}>
            <button type="button" data-qty="1" aria-label="Más">+</button>
          </div>
        </div>
      </div>
      <p class="stock-note" data-stock-note>${stockNoteText(product.id, variantLabel(product.sizes.find((s) => s.stock > 0) || product.sizes[0] || { size: '' }))}</p>
      <button class="btn btn-dark add-to-cart" ${totalStock <= 0 ? 'disabled' : ''}>${totalStock <= 0 ? 'Agotado' : 'Agregar al carrito'}</button>
    </article>
  `;
}

// Datos estructurados (schema.org) generados desde products.json para que nunca queden desactualizados.
function injectProductSchema(products) {
  const origin = 'https://www.workjeans.mx/';
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Catálogo Works Jeans 2026 / Vol. 01',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        image: origin + p.image,
        description: p.description,
        category: p.category,
        brand: { '@type': 'Brand', name: 'Works Jeans' },
        offers: {
          '@type': 'Offer',
          price: (p.priceCents / 100).toFixed(2),
          priceCurrency: 'MXN',
          availability: p.sizes.some((s) => s.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: `${origin}producto/${p.id}`,
        },
      },
    })),
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

let PRODUCTS = [];

function productUrl(id) {
  return `${window.location.origin}/producto/${id}`;
}

// Botones + y − de cantidad (tarjetas y ficha de producto).
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.qty-picker [data-qty]');
  if (!btn) return;
  const input = btn.parentElement.querySelector('input');
  input.value = clampQty(clampQty(input.value) + parseInt(btn.dataset.qty, 10));
});

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  try {
    const res = await fetch('products.json');
    const products = await res.json();
    PRODUCTS = products;
    window.onProductsLoaded?.();
    if (!grid) return;
    grid.innerHTML = products.map(renderProductCard).join('');
    injectProductSchema(products);

    grid.querySelectorAll('.product-thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const card = thumb.closest('.product-card');
        const main = card.querySelector('[data-main-photo]');
        main.src = imgSrc(thumb.dataset.src, 640);
        main.srcset = imgSrcset(thumb.dataset.src);
        card.querySelectorAll('.product-thumb').forEach((t) => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });

    if (window.revealObserver) {
      grid.querySelectorAll('.reveal').forEach((el) => window.revealObserver.observe(el));
    }

    // La foto lleva a la página del producto (el nombre ya es un enlace).
    grid.querySelectorAll('.product-photo').forEach((el) => {
      el.classList.add('product-open');
      el.addEventListener('click', () => { window.location.href = `/producto/${el.closest('.product-card').dataset.id}`; });
    });
  } catch {
    if (grid) grid.innerHTML = '<p class="products-loading">No se pudieron cargar los productos.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  loadProducts();
  loadSettings();

  document.getElementById('cartBtn')?.addEventListener('click', openCart);
  document.getElementById('cartClose')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

  document.getElementById('productsGrid')?.addEventListener('click', (e) => {
    if (!e.target.classList.contains('add-to-cart')) return;
    const card = e.target.closest('.product-card');
    const { id, name, price } = card.dataset;
    const size = card.querySelector('.size-select').value;
    const qty = clampQty(card.querySelector('.qty-input')?.value);
    addToCart(id, name, variantPrice(id, size) || parseInt(price, 10), size, qty);
  });

  document.getElementById('productsGrid')?.addEventListener('change', (e) => {
    if (!e.target.classList.contains('size-select')) return;
    const card = e.target.closest('.product-card');
    const note = card.querySelector('[data-stock-note]');
    if (note) note.textContent = stockNoteText(card.dataset.id, e.target.value);
  });

  restoreInvoiceDraft();
  document.getElementById('cartCoupon')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = document.getElementById('couponInput').value.trim().toUpperCase();
    setCoupon(code);
    refreshQuote();
  });
  ['invoiceRfc', 'invoiceName', 'invoiceEmail', 'invoiceZip', 'invoiceRegimen', 'invoiceUso'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', saveInvoiceDraft);
    document.getElementById(id)?.addEventListener('change', saveInvoiceDraft);
  });
  document.getElementById('cartInvoice')?.addEventListener('toggle', (e) => { saveInvoiceDraft(); if (e.target.open) loadSatCatalogs(); });
  const zipInput = document.getElementById('shipZip');
  if (zipInput) {
    zipInput.value = getZip();
    zipInput.addEventListener('input', () => {
      zipInput.value = zipInput.value.replace(/\D/g, '').slice(0, 5);
      saveZip(zipInput.value);
      if (zipInput.value.length === 5 || zipInput.value.length === 0) { scheduleQuote(); if (zipInput.value.length === 5) window.wjTrack?.('shipping_calculated'); }
    });
  }

  document.getElementById('cartItems')?.addEventListener('click', (e) => {
    const itemEl = e.target.closest('.cart-item');
    if (!itemEl) return;
    const { id, size } = itemEl.dataset;
    const cart = getCart();
    const item = cart.find((i) => i.id === id && i.size === size);
    if (!item) return;

    const action = e.target.dataset.action;
    if (action === 'increase') updateQuantity(id, size, item.quantity + 1);
    if (action === 'decrease') updateQuantity(id, size, item.quantity - 1);
    if (action === 'remove') updateQuantity(id, size, 0);
  });

  document.getElementById('checkoutWhatsapp')?.addEventListener('click', () => {
    if (getCart().length === 0) {
      document.getElementById('cartMessage').textContent = 'Agrega productos antes de pedir.';
      return;
    }
    window.open(buildWhatsappMessage(), '_blank');
  });

  document.getElementById('checkoutStripe')?.addEventListener('click', startStripeCheckout);
});
