const CART_KEY = 'worksjeans_cart';
let WHATSAPP_NUMBER = '528128613551';

async function loadSettings() {
  try {
    const res = await fetch('settings.json');
    const settings = await res.json();

    WHATSAPP_NUMBER = settings.whatsappNumber || WHATSAPP_NUMBER;

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
    if (mapsEmbed && !mapsEmbed.src) mapsEmbed.src = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;
    const footerMapsLink = document.getElementById('footerMapsLink');
    if (footerMapsLink) footerMapsLink.href = placeUrl;
    const footerMapsEmbed = document.getElementById('footerMapsEmbed');
    if (footerMapsEmbed && !footerMapsEmbed.src) footerMapsEmbed.src = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

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

function getInvoice() {
  const box = document.getElementById('cartInvoice');
  if (!box || !box.open) return null;
  const rfc = document.getElementById('invoiceRfc').value.trim().toUpperCase();
  const name = document.getElementById('invoiceName').value.trim();
  const email = document.getElementById('invoiceEmail').value.trim();
  if (!rfc && !name && !email) return null;
  return { rfc, name, email };
}

function saveInvoiceDraft() {
  try {
    const box = document.getElementById('cartInvoice');
    localStorage.setItem(INVOICE_KEY, JSON.stringify({
      open: box.open,
      rfc: document.getElementById('invoiceRfc').value,
      name: document.getElementById('invoiceName').value,
      email: document.getElementById('invoiceEmail').value,
    }));
  } catch {
    // Sin almacenamiento: no pasa nada.
  }
}

function restoreInvoiceDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(INVOICE_KEY) || 'null');
    if (!saved) return;
    document.getElementById('cartInvoice').open = Boolean(saved.open);
    document.getElementById('invoiceRfc').value = saved.rfc || '';
    document.getElementById('invoiceName').value = saved.name || '';
    document.getElementById('invoiceEmail').value = saved.email || '';
  } catch {
    // Ignorar.
  }
}

function buildWhatsappMessage() {
  const cart = getCart();
  const lines = cart.map((item) => `- ${item.name} (Talla ${item.size}) x${item.quantity} - ${formatPrice(item.priceCents * item.quantity)}`);
  const total = formatPrice(cartTotalCents());
  let text = `Hola, quiero hacer un pedido:\n${lines.join('\n')}\n\nTotal: ${total}`;
  const invoice = getInvoice();
  if (invoice) text += `\n\nNecesito factura:\nRFC: ${invoice.rfc || '(pendiente)'}\nRazón social: ${invoice.name || '(pendiente)'}\nCorreo: ${invoice.email || '(pendiente)'}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

async function startStripeCheckout() {
  const cartMessage = document.getElementById('cartMessage');
  const cart = getCart();

  if (cart.length === 0) {
    cartMessage.textContent = 'Agrega productos antes de pagar.';
    return;
  }

  cartMessage.textContent = 'Redirigiendo al pago...';

  try {
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map((item) => ({ id: item.id, quantity: item.quantity, size: item.size })),
        invoice: getInvoice(),
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      cartMessage.textContent = data.error || 'No se pudo iniciar el pago. Intenta por WhatsApp.';
      return;
    }

    window.location.href = data.url;
  } catch {
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
      <h3>${product.name}</h3>
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
          url: origin + '#productos',
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
let modalPushedState = false;

function productUrl(id) {
  return `${window.location.origin}/producto/${id}`;
}

function openProduct(id, { pushState = true } = {}) {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) return;
  const modal = document.getElementById('productModal');
  const images = product.images && product.images.length ? product.images : [product.image];
  const photo = document.getElementById('pmPhoto');
  photo.src = imgSrc(images[0], 800);
  photo.srcset = `${imgSrc(images[0], 480)} 480w, ${imgSrc(images[0], 800)} 800w, ${imgSrc(images[0], 1000)} 1000w`;
  photo.sizes = '(max-width: 860px) 100vw, 480px';
  photo.alt = product.name;
  document.getElementById('pmThumbs').innerHTML = images.length > 1
    ? images.map((img, i) => `<img src="${imgSrc(img, 320)}" alt="" class="product-thumb ${i === 0 ? 'active' : ''}" data-src="${img}" width="46" height="58">`).join('')
    : '';
  document.getElementById('pmCategory').textContent = product.category;
  document.getElementById('pmName').textContent = product.name;
  const first = product.sizes[0]?.size || '';
  const last = product.sizes[product.sizes.length - 1]?.size || '';
  document.getElementById('pmSizes').innerHTML = `Tallas <b>${first}</b>${last && last !== first ? ` / <b>${last}</b>` : ''}`;
  document.getElementById('pmPrice').innerHTML = priceHtml(product);
  document.getElementById('pmWholesale').innerHTML = wholesaleHtml(product);
  document.getElementById('pmDesc').textContent = product.description;
  const totalStock = product.sizes.reduce((sum, s) => sum + s.stock, 0);
  const select = document.getElementById('pmSize');
  select.innerHTML = variantOptions(product);
  select.disabled = totalStock <= 0;
  const addBtn = document.getElementById('pmAdd');
  addBtn.disabled = totalStock <= 0;
  addBtn.textContent = totalStock <= 0 ? 'Agotado' : 'Agregar al carrito';
  addBtn.dataset.id = product.id;
  document.getElementById('pmStatus').textContent = '';
  document.getElementById('pmQty').value = 1;
  document.getElementById('pmStock').textContent = stockNoteText(product.id, select.value);
  const chart = document.getElementById('pmSizechart');
  chart.hidden = true;
  chart.innerHTML = '';
  document.getElementById('pmSizechartToggle').textContent = 'Ver tabla de medidas y cómo medir';
  modal.hidden = false;
  document.body.classList.add('modal-open');
  document.title = `${product.name} | Works Jeans`;
  if (pushState) {
    history.pushState({ product: id }, '', `/producto/${id}`);
    modalPushedState = true;
  }
}

function closeProduct({ fromHistory = false } = {}) {
  const modal = document.getElementById('productModal');
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  document.title = 'Works Jeans | Ropa de trabajo de mezclilla en Monterrey · Workwear industrial';
  if (fromHistory) return;
  if (modalPushedState) {
    modalPushedState = false;
    history.back();
  } else if (window.location.pathname.startsWith('/producto/')) {
    history.replaceState({}, '', '/#productos');
  }
}

function setupProductModal() {
  const modal = document.getElementById('productModal');
  if (!modal) return;
  document.getElementById('pmClose').addEventListener('click', () => closeProduct());
  document.getElementById('pmBackdrop').addEventListener('click', () => closeProduct());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProduct();
  });
  document.getElementById('pmThumbs').addEventListener('click', (e) => {
    const thumb = e.target.closest('.product-thumb');
    if (!thumb) return;
    const photo = document.getElementById('pmPhoto');
    photo.src = imgSrc(thumb.dataset.src, 800);
    photo.srcset = `${imgSrc(thumb.dataset.src, 480)} 480w, ${imgSrc(thumb.dataset.src, 800)} 800w, ${imgSrc(thumb.dataset.src, 1000)} 1000w`;
    modal.querySelectorAll('.product-thumb').forEach((t) => t.classList.remove('active'));
    thumb.classList.add('active');
  });
  document.getElementById('pmAdd').addEventListener('click', (e) => {
    const product = PRODUCTS.find((p) => p.id === e.currentTarget.dataset.id);
    if (!product) return;
    const qty = clampQty(document.getElementById('pmQty').value);
    const label = document.getElementById('pmSize').value;
    closeProduct();
    addToCart(product.id, product.name, variantPrice(product.id, label), label, qty);
  });
  document.getElementById('pmSize').addEventListener('change', (e) => {
    document.getElementById('pmStock').textContent = stockNoteText(document.getElementById('pmAdd').dataset.id, e.target.value);
  });
  document.getElementById('pmSizechartToggle').addEventListener('click', (e) => {
    const chart = document.getElementById('pmSizechart');
    const product = PRODUCTS.find((p) => p.id === document.getElementById('pmAdd').dataset.id);
    if (chart.hidden) {
      const isPants = /pantal/i.test(product?.category || '');
      const block = document.querySelectorAll('#medidas .size-block')[isPants ? 1 : 0];
      const figure = document.querySelectorAll('#medidas .medidas-figura')[isPants ? 1 : 0];
      chart.innerHTML = (figure ? `<div class="pm-figure">${figure.innerHTML}</div>` : '') + (block ? block.querySelector('.table-scroll').outerHTML : '');
      chart.hidden = false;
      e.currentTarget.textContent = 'Ocultar tabla de medidas';
    } else {
      chart.hidden = true;
      e.currentTarget.textContent = 'Ver tabla de medidas y cómo medir';
    }
  });
  // Botones + y − de cantidad (tarjetas y ficha).
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.qty-picker [data-qty]');
    if (!btn) return;
    const input = btn.parentElement.querySelector('input');
    input.value = clampQty(clampQty(input.value) + parseInt(btn.dataset.qty, 10));
  });
  document.getElementById('pmShare').addEventListener('click', () => {
    const id = document.getElementById('pmAdd').dataset.id;
    const product = PRODUCTS.find((p) => p.id === id);
    if (!product) return;
    const text = `Mira ${product.name} de Works Jeans: ${productUrl(id)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });
  document.getElementById('pmCopy').addEventListener('click', async () => {
    const id = document.getElementById('pmAdd').dataset.id;
    const status = document.getElementById('pmStatus');
    try {
      await navigator.clipboard.writeText(productUrl(id));
      status.textContent = 'Enlace copiado.';
    } catch {
      status.textContent = productUrl(id);
    }
  });
  window.addEventListener('popstate', (e) => {
    const match = window.location.pathname.match(/^\/producto\/([^/]+)/);
    if (match) {
      modalPushedState = false;
      openProduct(match[1], { pushState: false });
    } else {
      modalPushedState = false;
      closeProduct({ fromHistory: true });
    }
  });
}

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  try {
    const res = await fetch('products.json');
    const products = await res.json();
    PRODUCTS = products;
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

    // Foto o nombre abren la ficha del producto.
    grid.querySelectorAll('.product-photo, .product-card h3').forEach((el) => {
      el.classList.add('product-open');
      el.addEventListener('click', () => openProduct(el.closest('.product-card').dataset.id));
    });

    const fromUrl = window.location.pathname.match(/^\/producto\/([^/]+)/);
    const initial = window.__openProduct || (fromUrl && fromUrl[1]);
    if (initial) openProduct(initial, { pushState: false });
  } catch {
    grid.innerHTML = '<p class="products-loading">No se pudieron cargar los productos.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  setupProductModal();
  loadProducts();
  loadSettings();

  document.getElementById('cartBtn').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);

  document.getElementById('productsGrid').addEventListener('click', (e) => {
    if (!e.target.classList.contains('add-to-cart')) return;
    const card = e.target.closest('.product-card');
    const { id, name, price } = card.dataset;
    const size = card.querySelector('.size-select').value;
    const qty = clampQty(card.querySelector('.qty-input')?.value);
    addToCart(id, name, variantPrice(id, size) || parseInt(price, 10), size, qty);
  });

  document.getElementById('productsGrid').addEventListener('change', (e) => {
    if (!e.target.classList.contains('size-select')) return;
    const card = e.target.closest('.product-card');
    const note = card.querySelector('[data-stock-note]');
    if (note) note.textContent = stockNoteText(card.dataset.id, e.target.value);
  });

  restoreInvoiceDraft();
  ['invoiceRfc', 'invoiceName', 'invoiceEmail'].forEach((id) => document.getElementById(id)?.addEventListener('input', saveInvoiceDraft));
  document.getElementById('cartInvoice')?.addEventListener('toggle', saveInvoiceDraft);

  document.getElementById('cartItems').addEventListener('click', (e) => {
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

  document.getElementById('checkoutWhatsapp').addEventListener('click', () => {
    if (getCart().length === 0) {
      document.getElementById('cartMessage').textContent = 'Agrega productos antes de pedir.';
      return;
    }
    window.open(buildWhatsappMessage(), '_blank');
  });

  document.getElementById('checkoutStripe').addEventListener('click', startStripeCheckout);
});
