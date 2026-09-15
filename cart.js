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

function addToCart(id, name, priceCents, size) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === id && item.size === size);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id, name, priceCents, size, quantity: 1 });
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

function buildWhatsappMessage() {
  const cart = getCart();
  const lines = cart.map((item) => `- ${item.name} (Talla ${item.size}) x${item.quantity} - ${formatPrice(item.priceCents * item.quantity)}`);
  const total = formatPrice(cartTotalCents());
  const text = `Hola, quiero hacer un pedido:\n${lines.join('\n')}\n\nTotal: ${total}`;
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

function renderProductCard(product) {
  const totalStock = product.sizes.reduce((sum, s) => sum + s.stock, 0);
  const sizeOptions = product.sizes
    .map((s) => `<option value="${s.size}" ${s.stock <= 0 ? 'disabled' : ''}>${s.size}${s.stock <= 0 ? ' (agotado)' : ''}</option>`)
    .join('');
  // Siempre se muestran las miniaturas (aunque haya una sola) para que todas las tarjetas alineen igual.
  const images = product.images && product.images.length ? product.images : [product.image];
  const gallery = `<div class="product-thumbs">${
    images.map((img, i) => `<img src="${img}" alt="" class="product-thumb ${i === 0 ? 'active' : ''}" data-src="${img}" loading="lazy" width="46" height="58">`).join('')
  }</div>`;
  const firstSize = product.sizes[0] ? product.sizes[0].size : '';
  const lastSize = product.sizes.length ? product.sizes[product.sizes.length - 1].size : '';
  const sizeRange = firstSize && lastSize && firstSize !== lastSize ? `<b>${firstSize}</b> / <b>${lastSize}</b>` : `<b>${firstSize}</b>`;

  return `
    <article class="product-card reveal" data-id="${product.id}" data-name="${product.name}" data-price="${product.priceCents}">
      <span class="product-category">${product.category}</span>
      ${tagHtml(product)}
      ${totalStock <= 0 ? '<span class="product-soldout">Agotado</span>' : ''}
      <img src="${product.image}" alt="${product.name} · ropa de trabajo de mezclilla Works Jeans" class="product-photo" data-main-photo loading="lazy" decoding="async" width="800" height="1000">
      ${gallery}
      <h3>${product.name}</h3>
      <p class="product-sizes">Tallas ${sizeRange}</p>
      <p class="price">${priceHtml(product)}</p>
      ${wholesaleHtml(product)}
      <p class="product-desc">${product.description}</p>
      <label class="size-label" for="size-${product.id}">Talla</label>
      <select class="size-select" id="size-${product.id}" ${totalStock <= 0 ? 'disabled' : ''}>
        ${sizeOptions}
      </select>
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
  photo.src = images[0];
  photo.alt = product.name;
  document.getElementById('pmThumbs').innerHTML = images.length > 1
    ? images.map((img, i) => `<img src="${img}" alt="" class="product-thumb ${i === 0 ? 'active' : ''}" data-src="${img}" width="46" height="58">`).join('')
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
  select.innerHTML = product.sizes
    .map((s) => `<option value="${s.size}" ${s.stock <= 0 ? 'disabled' : ''}>${s.size}${s.stock <= 0 ? ' (agotado)' : ''}</option>`)
    .join('');
  select.disabled = totalStock <= 0;
  const addBtn = document.getElementById('pmAdd');
  addBtn.disabled = totalStock <= 0;
  addBtn.textContent = totalStock <= 0 ? 'Agotado' : 'Agregar al carrito';
  addBtn.dataset.id = product.id;
  document.getElementById('pmStatus').textContent = '';
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
    document.getElementById('pmPhoto').src = thumb.dataset.src;
    modal.querySelectorAll('.product-thumb').forEach((t) => t.classList.remove('active'));
    thumb.classList.add('active');
  });
  document.getElementById('pmAdd').addEventListener('click', (e) => {
    const product = PRODUCTS.find((p) => p.id === e.currentTarget.dataset.id);
    if (!product) return;
    closeProduct();
    addToCart(product.id, product.name, product.priceCents, document.getElementById('pmSize').value);
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
        card.querySelector('[data-main-photo]').src = thumb.dataset.src;
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
    addToCart(id, name, parseInt(price, 10), size);
  });

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
