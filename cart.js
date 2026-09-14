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
    setText('storeAddress', settings.address);
    setText('storeHours', settings.hours);
    setText('resenasScore', settings.googleRating);

    const phoneLink = document.getElementById('storePhoneLink');
    if (phoneLink && settings.whatsappNumber) {
      phoneLink.href = `tel:+${settings.whatsappNumber}`;
      phoneLink.textContent = settings.phoneDisplay || settings.whatsappNumber;
    }
    const callLink = document.getElementById('callLink');
    if (callLink && settings.whatsappNumber) callLink.href = `tel:+${settings.whatsappNumber}`;

    const mapsQuery = encodeURIComponent(settings.mapsQuery || settings.address || '');
    const mapsLink = document.getElementById('mapsLink');
    if (mapsLink) mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
    const resenasLink = document.getElementById('resenasLink');
    if (resenasLink) resenasLink.href = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
    const mapsEmbed = document.getElementById('mapsEmbed');
    if (mapsEmbed && !mapsEmbed.src) mapsEmbed.src = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

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

function renderProductCard(product) {
  const totalStock = product.sizes.reduce((sum, s) => sum + s.stock, 0);
  const sizeOptions = product.sizes
    .map((s) => `<option value="${s.size}" ${s.stock <= 0 ? 'disabled' : ''}>${s.size}${s.stock <= 0 ? ' (agotado)' : ''}</option>`)
    .join('');
  const hasGallery = product.images.length > 1;
  const gallery = `<div class="product-thumbs${hasGallery ? '' : ' product-thumbs--empty'}">${
    hasGallery ? product.images.map((img, i) => `<img src="${img}" alt="" class="product-thumb ${i === 0 ? 'active' : ''}" data-src="${img}" loading="lazy" width="46" height="58">`).join('') : ''
  }</div>`;
  const firstSize = product.sizes[0] ? product.sizes[0].size : '';
  const lastSize = product.sizes.length ? product.sizes[product.sizes.length - 1].size : '';
  const sizeRange = firstSize && lastSize && firstSize !== lastSize ? `<b>${firstSize}</b> / <b>${lastSize}</b>` : `<b>${firstSize}</b>`;

  return `
    <article class="product-card reveal" data-id="${product.id}" data-name="${product.name}" data-price="${product.priceCents}">
      <span class="product-category">${product.category}</span>
      ${totalStock <= 0 ? '<span class="product-soldout">Agotado</span>' : ''}
      <img src="${product.image}" alt="${product.name}" class="product-photo" data-main-photo loading="lazy" decoding="async" width="800" height="1000">
      ${gallery}
      <h3>${product.name}</h3>
      <p class="product-sizes">Tallas ${sizeRange}</p>
      <p class="price">${formatPrice(product.priceCents)}<small>MXN</small></p>
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
  const origin = 'https://www.worksjeans.com.mx/';
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

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  try {
    const res = await fetch('products.json');
    const products = await res.json();
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
  } catch {
    grid.innerHTML = '<p class="products-loading">No se pudieron cargar los productos.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
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
