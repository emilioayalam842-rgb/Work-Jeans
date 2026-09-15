const loginScreen = document.getElementById('loginScreen');
const adminScreen = document.getElementById('adminScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const productsTableBody = document.getElementById('productsTableBody');
const formOverlay = document.getElementById('formOverlay');
const productForm = document.getElementById('productForm');
const formError = document.getElementById('formError');
const formTitle = document.getElementById('formTitle');
const sizeRowsContainer = document.getElementById('sizeRows');
const ordersTableBody = document.getElementById('ordersTableBody');
const orderFormOverlay = document.getElementById('orderFormOverlay');
const orderForm = document.getElementById('orderForm');
const orderFormError = document.getElementById('orderFormError');
const orderItemsContainer = document.getElementById('orderItems');
const orderFormTotal = document.getElementById('orderFormTotal');
const orderDetailOverlay = document.getElementById('orderDetailOverlay');
const orderDetailContent = document.getElementById('orderDetailContent');
const orderDetailNotes = document.getElementById('orderDetailNotes');

let productsCache = [];
let ordersCache = [];
let activeOrderId = null;
let settingsCache = {};
let formImages = []; // fotos existentes del producto que se está editando, en orden
let ordersMonth = ''; // filtro de mes en Pedidos ('' = todos, 'YYYY-MM')

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  preparacion: 'En preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};
let ordersSearch = '';
let ordersStatus = '';

function statusOptions(current) {
  return Object.entries(STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`).join('');
}

// Convierte un teléfono capturado a formato wa.me (solo dígitos; 10 dígitos = México).
function whatsappDigits(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length === 10 ? `52${digits}` : digits;
}

const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [y, m] = key.split('-');
  return `${MONTHS_ES[parseInt(m, 10) - 1]} ${y}`;
}

async function loadSettingsCache() {
  try {
    const res = await fetch('/api/settings');
    settingsCache = await res.json();
  } catch {
    settingsCache = {};
  }
}

function lowStockLimit() {
  const n = parseInt(settingsCache.lowStockThreshold, 10);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

function formatPrice(cents) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function showAdmin() {
  loginScreen.hidden = true;
  adminScreen.hidden = false;
  loadSettingsCache().then(loadProducts).then(loadOrders).then(renderDashboard);
}

function showLogin() {
  loginScreen.hidden = false;
  adminScreen.hidden = true;
}

async function checkSession() {
  const res = await fetch('/api/admin/session');
  const data = await res.json();
  if (data.isAdmin) showAdmin();
  else showLogin();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const password = document.getElementById('loginPassword').value;

  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();

  if (!res.ok) {
    loginError.textContent = data.error || 'No se pudo iniciar sesión.';
    return;
  }
  loginForm.reset();
  showAdmin();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

// --- Tabs ---

document.querySelectorAll('.admin-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.admin-tab-panel').forEach((panel) => { panel.hidden = true; });
    document.getElementById(`tab${tab.dataset.tab.charAt(0).toUpperCase()}${tab.dataset.tab.slice(1)}`).hidden = false;

    if (tab.dataset.tab === 'dashboard') renderDashboard();
    if (tab.dataset.tab === 'pedidos') loadOrders();
    if (tab.dataset.tab === 'inventario') loadInventory();
    if (tab.dataset.tab === 'configuracion') loadSettingsForm();
  });
});

// --- Products ---

async function loadProducts() {
  const res = await fetch('/api/admin/products');
  if (res.status === 401) {
    showLogin();
    return;
  }
  const products = await res.json();
  productsCache = products;
  renderProductsTable(products);
}

function totalStock(product) {
  return product.sizes.reduce((sum, s) => sum + s.stock, 0);
}

function renderProductsTable(products) {
  if (products.length === 0) {
    productsTableBody.innerHTML = '<tr><td colspan="6">No hay productos todavía.</td></tr>';
    return;
  }

  productsTableBody.innerHTML = products.map((p) => {
    const stock = totalStock(p);
    const limit = lowStockLimit();
    return `
      <tr data-id="${p.id}">
        <td><img src="${p.image}" alt="${p.name}" class="admin-table-photo"></td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${formatPrice(p.priceCents)}</td>
        <td class="${p.sizes.some((s) => s.stock <= limit) ? 'admin-stock-low' : ''}">
          <button type="button" class="admin-stock-toggle" data-action="toggle-stock" title="Ver y ajustar por talla">${stock} pzas ▾</button>
        </td>
        <td class="admin-table-actions">
          <button class="admin-icon-btn" data-action="edit" title="Editar">✏️</button>
          <button class="admin-icon-btn" data-action="delete" title="Eliminar">🗑️</button>
        </td>
      </tr>
      <tr class="admin-stock-row" data-id="${p.id}" hidden>
        <td colspan="6">
          <div class="admin-stock-grid">
            ${p.sizes.map((s) => `
              <div class="admin-stock-size ${s.stock <= limit ? 'is-low' : ''}" data-size="${s.size}">
                <span class="admin-stock-size-name">${s.size}</span>
                <div class="admin-stock-controls">
                  <button type="button" class="admin-stock-btn" data-action="adjust" data-delta="-1" aria-label="Quitar una pieza">−</button>
                  <b class="admin-stock-count">${s.stock}</b>
                  <button type="button" class="admin-stock-btn" data-action="adjust" data-delta="1" aria-label="Agregar una pieza">+</button>
                </div>
              </div>
            `).join('')}
          </div>
          <p class="admin-help">Cada clic mueve una pieza y queda registrado en Inventario. Para cambios grandes edita el producto.</p>
        </td>
      </tr>
    `;
  }).join('');
}

async function adjustStock(productId, size, delta, sizeEl) {
  const res = await fetch('/api/admin/inventory/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, size, delta, reason: 'Ajuste manual desde el panel' }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'No se pudo ajustar el stock.');
    return;
  }
  const product = productsCache.find((p) => p.id === productId);
  const entry = product?.sizes.find((s) => s.size === size);
  if (entry) entry.stock = data.stock;
  sizeEl.querySelector('.admin-stock-count').textContent = data.stock;
  sizeEl.classList.toggle('is-low', data.stock <= lowStockLimit());
  const mainRow = productsTableBody.querySelector(`tr[data-id="${productId}"]:not(.admin-stock-row)`);
  if (mainRow && product) {
    const cell = mainRow.querySelector('.admin-stock-toggle');
    cell.textContent = `${totalStock(product)} pzas ▾`;
    cell.closest('td').classList.toggle('admin-stock-low', product.sizes.some((s) => s.stock <= lowStockLimit()));
  }
}

function addSizeRow(size = '', stock = 0) {
  const row = document.createElement('div');
  row.className = 'admin-size-row';
  row.innerHTML = `
    <input type="text" class="size-row-name" placeholder="Talla" value="${size}">
    <input type="number" class="size-row-stock" placeholder="Stock" min="0" value="${stock}">
    <button type="button" class="admin-icon-btn" data-action="remove-size">✕</button>
  `;
  row.querySelector('[data-action="remove-size"]').addEventListener('click', () => row.remove());
  sizeRowsContainer.appendChild(row);
}

document.getElementById('addSizeRowBtn').addEventListener('click', () => addSizeRow());

function renderImageList() {
  const list = document.getElementById('imageList');
  list.innerHTML = formImages.map((img, i) => `
    <div class="admin-image-item ${i === 0 ? 'is-main' : ''}">
      <img src="${img}" alt="">
      <span class="admin-image-tag">${i === 0 ? 'Principal' : `#${i + 1}`}</span>
      <div class="admin-image-actions">
        ${i > 0 ? `<button type="button" class="admin-inline-btn" data-action="main" data-index="${i}">Hacer principal</button>` : ''}
        <button type="button" class="admin-icon-btn" data-action="remove-image" data-index="${i}" title="Quitar">✕</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('imageList').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const i = parseInt(btn.dataset.index, 10);
  if (btn.dataset.action === 'main') {
    const [img] = formImages.splice(i, 1);
    formImages.unshift(img);
  }
  if (btn.dataset.action === 'remove-image') formImages.splice(i, 1);
  renderImageList();
});

document.getElementById('fieldImages').addEventListener('change', (e) => {
  const previews = document.getElementById('newImagePreviews');
  previews.innerHTML = Array.from(e.target.files).map((file) => `
    <div class="admin-image-item is-new">
      <img src="${URL.createObjectURL(file)}" alt="">
      <span class="admin-image-tag">Nueva</span>
    </div>
  `).join('');
});

function openForm(product) {
  formError.textContent = '';
  productForm.reset();
  document.getElementById('newImagePreviews').innerHTML = '';
  formImages = product ? [...(product.images && product.images.length ? product.images : [product.image])] : [];
  renderImageList();
  sizeRowsContainer.innerHTML = '';

  if (product) {
    formTitle.textContent = 'Editar producto';
    document.getElementById('productId').value = product.id;
    document.getElementById('fieldName').value = product.name;
    document.getElementById('fieldCategory').value = product.category;
    document.getElementById('fieldPrice').value = (product.priceCents / 100).toFixed(2);
    document.getElementById('fieldDescription').value = product.description;
    product.sizes.forEach((s) => addSizeRow(s.size, s.stock));
  } else {
    formTitle.textContent = 'Nuevo producto';
    document.getElementById('productId').value = '';
    addSizeRow();
  }

  formOverlay.hidden = false;
}

function closeForm() {
  formOverlay.hidden = true;
}

document.getElementById('newProductBtn').addEventListener('click', () => openForm(null));
document.getElementById('cancelFormBtn').addEventListener('click', closeForm);

productsTableBody.addEventListener('click', async (e) => {
  const toggle = e.target.closest('[data-action="toggle-stock"]');
  if (toggle) {
    const row = productsTableBody.querySelector(`tr.admin-stock-row[data-id="${toggle.closest('tr').dataset.id}"]`);
    row.hidden = !row.hidden;
    return;
  }
  const adjust = e.target.closest('[data-action="adjust"]');
  if (adjust) {
    const sizeEl = adjust.closest('.admin-stock-size');
    adjustStock(adjust.closest('tr').dataset.id, sizeEl.dataset.size, parseInt(adjust.dataset.delta, 10), sizeEl);
    return;
  }
  const btn = e.target.closest('.admin-icon-btn');
  if (!btn) return;
  const id = btn.closest('tr').dataset.id;

  if (btn.dataset.action === 'edit') {
    const product = productsCache.find((p) => p.id === id);
    openForm(product);
  }

  if (btn.dataset.action === 'delete') {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (res.ok) loadProducts();
  }
});

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';

  const sizes = Array.from(sizeRowsContainer.querySelectorAll('.admin-size-row'))
    .map((row) => ({
      size: row.querySelector('.size-row-name').value.trim(),
      stock: Math.max(0, parseInt(row.querySelector('.size-row-stock').value, 10) || 0),
    }))
    .filter((s) => s.size);

  if (sizes.length === 0) {
    formError.textContent = 'Agrega al menos una talla.';
    return;
  }

  const id = document.getElementById('productId').value;
  const formData = new FormData(productForm);
  formData.set('sizes', JSON.stringify(sizes));
  if (id) formData.set('keepImages', JSON.stringify(formImages));
  if (!id && document.getElementById('fieldImages').files.length === 0) {
    formError.textContent = 'Sube al menos una foto del producto.';
    return;
  }

  const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, { method, body: formData });
  const data = await res.json();

  if (!res.ok) {
    formError.textContent = data.error || 'No se pudo guardar el producto.';
    return;
  }

  closeForm();
  loadProducts();
});

// --- Orders ---

async function loadOrders() {
  const res = await fetch('/api/admin/orders');
  if (res.status === 401) {
    showLogin();
    return;
  }
  const orders = await res.json();
  ordersCache = orders;
  renderMonthFilter();
  renderOrders(filteredOrders());
}

function filteredOrders() {
  const q = ordersSearch.trim().toLowerCase();
  return ordersCache.filter((o) => {
    if (ordersMonth && monthKey(o.createdAt) !== ordersMonth) return false;
    if (ordersStatus === 'activos' && (o.status === 'entregado' || o.status === 'cancelado')) return false;
    if (ordersStatus && ordersStatus !== 'activos' && o.status !== ordersStatus) return false;
    if (!q) return true;
    const haystack = [o.id, o.customerName, o.customerPhone, o.customerEmail, o.tracking?.number, ...o.items.map((i) => i.name)].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

document.getElementById('ordersSearch').addEventListener('input', (e) => {
  ordersSearch = e.target.value;
  renderOrders(filteredOrders());
});

document.getElementById('ordersStatusFilter').addEventListener('change', (e) => {
  ordersStatus = e.target.value;
  renderOrders(filteredOrders());
});

function renderMonthFilter() {
  const select = document.getElementById('ordersMonthFilter');
  const months = [...new Set(ordersCache.map((o) => monthKey(o.createdAt)))].sort().reverse();
  select.innerHTML = `<option value="">Todos los meses</option>${months.map((m) => `<option value="${m}">${monthLabel(m)}</option>`).join('')}`;
  select.value = months.includes(ordersMonth) ? ordersMonth : '';
  ordersMonth = select.value;
}

document.getElementById('ordersMonthFilter').addEventListener('change', (e) => {
  ordersMonth = e.target.value;
  renderOrders(filteredOrders());
});

function csvCell(value) {
  const text = String(value ?? '');
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

document.getElementById('exportOrdersBtn').addEventListener('click', () => {
  const orders = filteredOrders();
  if (orders.length === 0) {
    alert('No hay pedidos para exportar.');
    return;
  }
  const header = ['Pedido', 'Fecha', 'Origen', 'Estado', 'Cliente', 'Teléfono', 'Correo', 'Dirección de envío', 'Paquetería', 'Guía', 'Productos', 'Piezas', 'Total MXN', 'Notas'];
  const rows = orders.map((o) => [
    o.id,
    new Date(o.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
    o.source === 'stripe' ? 'Tarjeta' : 'WhatsApp',
    STATUS_LABELS[o.status] || o.status,
    o.customerName || '',
    o.customerPhone || '',
    o.customerEmail || '',
    o.shipping ? [o.shipping.line1, o.shipping.line2, o.shipping.city, o.shipping.state, o.shipping.postalCode].filter(Boolean).join(', ') : '',
    o.tracking?.carrier || '',
    o.tracking?.number || '',
    o.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity}`).join('; '),
    o.items.reduce((sum, i) => sum + i.quantity, 0),
    (o.totalCents / 100).toFixed(2),
    o.notes || '',
  ]);
  // Separador ";" y BOM para que Excel en español lo abra en columnas y con acentos.
  const csv = '\ufeff' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pedidos-works-jeans${ordersMonth ? `-${ordersMonth}` : ''}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
});

function renderOrders(orders) {
  if (orders.length === 0) {
    ordersTableBody.innerHTML = `<tr><td colspan="7">${ordersMonth || ordersSearch || ordersStatus ? 'No hay pedidos con esos filtros.' : 'No hay pedidos todavía.'}</td></tr>`;
    return;
  }

  ordersTableBody.innerHTML = orders.map((o) => {
    const date = new Date(o.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    const itemsSummary = o.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity}`).join(', ');
    const sourceLabel = o.source === 'stripe' ? '💳 Stripe' : '💬 WhatsApp';
    return `
      <tr data-id="${o.id}">
        <td class="admin-clickable" data-action="view">${date}</td>
        <td class="admin-clickable" data-action="view">${sourceLabel}</td>
        <td class="admin-clickable" data-action="view">${o.customerName || '—'}${o.customerPhone ? `<br><span class="admin-muted">${o.customerPhone}</span>` : ''}</td>
        <td class="admin-order-items-cell admin-clickable" data-action="view">${itemsSummary}</td>
        <td class="admin-clickable" data-action="view">${formatPrice(o.totalCents)}</td>
        <td>
          <select class="admin-status-select status-${o.status}" data-action="status">${statusOptions(o.status)}</select>
          ${o.tracking?.number ? `<span class="admin-muted admin-tracking-tag">${o.tracking.carrier ? `${o.tracking.carrier} · ` : ''}${o.tracking.number}</span>` : ''}
        </td>
        <td>
          <button class="admin-icon-btn" data-action="delete-order" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

ordersTableBody.addEventListener('click', async (e) => {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const id = tr.dataset.id;

  if (e.target.dataset.action === 'view') {
    openOrderDetail(id);
    return;
  }

  if (e.target.dataset.action === 'delete-order') {
    if (!confirm('¿Eliminar este pedido?')) return;
    const res = await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
    if (res.ok) loadOrders();
  }
});

ordersTableBody.addEventListener('change', async (e) => {
  if (e.target.dataset.action !== 'status') return;
  const id = e.target.closest('tr').dataset.id;
  const order = ordersCache.find((o) => o.id === id);
  if (e.target.value === 'cancelado' && order && order.status !== 'cancelado' && !confirm('¿Cancelar este pedido? Las piezas regresan al inventario.')) {
    e.target.value = order.status;
    return;
  }
  const res = await fetch(`/api/admin/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: e.target.value }),
  });
  if (res.ok) {
    const updated = await res.json();
    const idx = ordersCache.findIndex((o) => o.id === id);
    if (idx >= 0) ordersCache[idx] = updated;
    e.target.className = `admin-status-select status-${updated.status}`;
    if (updated.status === 'cancelado' || order?.status === 'cancelado') loadProducts();
  }
});

function openOrderDetail(id) {
  const order = ordersCache.find((o) => o.id === id);
  if (!order) return;
  activeOrderId = id;

  const date = new Date(order.createdAt).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
  const sourceLabel = order.source === 'stripe' ? '💳 Pago con tarjeta (Stripe)' : '💬 Pedido por WhatsApp';

  orderDetailContent.innerHTML = `
    <p><strong>${sourceLabel}</strong></p>
    <p class="admin-muted">${date}</p>
    <p>${order.customerName || 'Cliente sin nombre'}${order.customerPhone ? ` · ${order.customerPhone}` : ''}${order.customerEmail ? ` · ${order.customerEmail}` : ''}</p>
    ${order.shipping ? `<p><strong>Envío a:</strong> ${[order.shipping.name, order.shipping.line1, order.shipping.line2, order.shipping.city, order.shipping.state, order.shipping.postalCode].filter(Boolean).join(', ')}</p>` : ''}
    <table class="admin-table admin-detail-table">
      <thead><tr><th>Producto</th><th>Talla</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
      <tbody>
        ${order.items.map((i) => `
          <tr>
            <td>${i.name}</td>
            <td>${i.size || '—'}</td>
            <td>${i.quantity}</td>
            <td>${formatPrice(i.priceCents)}</td>
            <td>${formatPrice(i.priceCents * i.quantity)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p class="admin-order-total">Total: ${formatPrice(order.totalCents)}</p>
  `;
  orderDetailNotes.value = order.notes || '';
  document.getElementById('orderDetailStatus').value = order.status;
  document.getElementById('orderTrackingCarrier').value = order.tracking?.carrier || '';
  document.getElementById('orderTrackingNumber').value = order.tracking?.number || '';
  document.getElementById('orderDetailError').textContent = '';
  document.getElementById('orderWhatsappBtn').disabled = !whatsappDigits(order.customerPhone);
  orderDetailOverlay.hidden = false;
}

function customerMessage(order) {
  const name = order.customerName ? `Hola ${order.customerName.split(' ')[0]}` : 'Hola';
  const carrier = document.getElementById('orderTrackingCarrier').value.trim();
  const number = document.getElementById('orderTrackingNumber').value.trim();
  const status = document.getElementById('orderDetailStatus').value;
  const items = order.items.map((i) => `${i.name}${i.size ? ` talla ${i.size}` : ''} x${i.quantity}`).join(', ');
  if (status === 'enviado' || number) {
    return `${name}, te escribimos de Works Jeans. Tu pedido ${order.id} (${items}) ya va en camino${carrier ? ` por ${carrier}` : ''}${number ? `. Número de guía: ${number}` : ''}. Cualquier duda, con gusto te ayudamos.`;
  }
  if (status === 'preparacion') return `${name}, te escribimos de Works Jeans. Tu pedido ${order.id} (${items}) ya está en preparación. Te avisamos en cuanto salga.`;
  if (status === 'entregado') return `${name}, te escribimos de Works Jeans. Confirmamos la entrega de tu pedido ${order.id}. ¡Gracias por tu compra!`;
  return `${name}, te escribimos de Works Jeans sobre tu pedido ${order.id} (${items}).`;
}

document.getElementById('orderWhatsappBtn').addEventListener('click', () => {
  const order = ordersCache.find((o) => o.id === activeOrderId);
  const digits = whatsappDigits(order?.customerPhone);
  if (!order || !digits) return;
  window.open(`https://wa.me/${digits}?text=${encodeURIComponent(customerMessage(order))}`, '_blank', 'noopener');
});

document.getElementById('orderPrintBtn').addEventListener('click', () => {
  if (activeOrderId) window.open(`nota.html?id=${encodeURIComponent(activeOrderId)}`, '_blank', 'noopener');
});

document.getElementById('closeOrderDetailBtn').addEventListener('click', () => {
  orderDetailOverlay.hidden = true;
  activeOrderId = null;
});

document.getElementById('saveOrderNotesBtn').addEventListener('click', async () => {
  if (!activeOrderId) return;
  const order = ordersCache.find((o) => o.id === activeOrderId);
  const status = document.getElementById('orderDetailStatus').value;
  if (status === 'cancelado' && order && order.status !== 'cancelado' && !confirm('¿Cancelar este pedido? Las piezas regresan al inventario.')) return;
  const res = await fetch(`/api/admin/orders/${activeOrderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      notes: orderDetailNotes.value,
      tracking: {
        carrier: document.getElementById('orderTrackingCarrier').value,
        number: document.getElementById('orderTrackingNumber').value,
      },
    }),
  });
  if (!res.ok) {
    const data = await res.json();
    document.getElementById('orderDetailError').textContent = data.error || 'No se pudo guardar.';
    return;
  }
  orderDetailOverlay.hidden = true;
  await loadOrders();
  loadProducts();
});

// --- Inventario ---

async function loadInventory() {
  const res = await fetch('/api/admin/inventory?limit=300');
  if (res.status === 401) {
    showLogin();
    return;
  }
  const log = await res.json();
  const body = document.getElementById('inventoryTableBody');
  if (log.length === 0) {
    body.innerHTML = '<tr><td colspan="6">Todavía no hay movimientos registrados.</td></tr>';
    return;
  }
  body.innerHTML = log.map((m) => `
    <tr>
      <td>${new Date(m.at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
      <td>${m.productName}</td>
      <td>${m.size}</td>
      <td class="${m.delta < 0 ? 'admin-delta-neg' : 'admin-delta-pos'}">${m.delta > 0 ? '+' : ''}${m.delta}</td>
      <td>${m.stockAfter}</td>
      <td>${m.reason}${m.orderId ? ` <span class="admin-muted">· ${m.orderId}</span>` : ''}</td>
    </tr>
  `).join('');
}

// --- Manual WhatsApp order form ---

function addOrderItemRow() {
  const row = document.createElement('div');
  row.className = 'admin-order-item-row';
  row.innerHTML = `
    <select class="order-item-product">
      ${productsCache.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}
    </select>
    <select class="order-item-size"></select>
    <input type="number" class="order-item-qty" value="1" min="1" max="50">
    <button type="button" class="admin-icon-btn" data-action="remove-item">✕</button>
  `;
  orderItemsContainer.appendChild(row);

  const productSelect = row.querySelector('.order-item-product');
  const sizeSelect = row.querySelector('.order-item-size');

  function fillSizes() {
    const product = productsCache.find((p) => p.id === productSelect.value);
    sizeSelect.innerHTML = product
      ? product.sizes.map((s) => `<option value="${s.size}" ${s.stock <= 0 ? 'disabled' : ''}>${s.size} (${s.stock} disp.)</option>`).join('')
      : '';
  }

  productSelect.addEventListener('change', () => { fillSizes(); updateOrderTotal(); });
  sizeSelect.addEventListener('change', updateOrderTotal);
  row.querySelector('.order-item-qty').addEventListener('input', updateOrderTotal);
  row.querySelector('[data-action="remove-item"]').addEventListener('click', () => {
    row.remove();
    updateOrderTotal();
  });

  fillSizes();
  updateOrderTotal();
}

function updateOrderTotal() {
  let total = 0;
  orderItemsContainer.querySelectorAll('.admin-order-item-row').forEach((row) => {
    const productId = row.querySelector('.order-item-product').value;
    const qty = parseInt(row.querySelector('.order-item-qty').value, 10) || 0;
    const product = productsCache.find((p) => p.id === productId);
    if (product) total += product.priceCents * qty;
  });
  orderFormTotal.textContent = formatPrice(total);
}

document.getElementById('newOrderBtn').addEventListener('click', () => {
  orderFormError.textContent = '';
  orderForm.reset();
  orderItemsContainer.innerHTML = '';
  if (productsCache.length === 0) {
    orderFormError.textContent = 'Primero agrega productos en la pestaña Productos.';
  } else {
    addOrderItemRow();
  }
  orderFormOverlay.hidden = false;
});

document.getElementById('addOrderItemBtn').addEventListener('click', addOrderItemRow);
document.getElementById('cancelOrderFormBtn').addEventListener('click', () => {
  orderFormOverlay.hidden = true;
});

orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  orderFormError.textContent = '';

  const items = Array.from(orderItemsContainer.querySelectorAll('.admin-order-item-row')).map((row) => ({
    id: row.querySelector('.order-item-product').value,
    size: row.querySelector('.order-item-size').value,
    quantity: parseInt(row.querySelector('.order-item-qty').value, 10) || 1,
  }));

  if (items.length === 0) {
    orderFormError.textContent = 'Agrega al menos un producto.';
    return;
  }

  const res = await fetch('/api/admin/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: document.getElementById('orderCustomerName').value,
      customerPhone: document.getElementById('orderCustomerPhone').value,
      notes: document.getElementById('orderNotes').value,
      items,
    }),
  });
  const data = await res.json();

  if (!res.ok) {
    orderFormError.textContent = data.error || 'No se pudo guardar el pedido.';
    return;
  }

  orderFormOverlay.hidden = true;
  loadProducts();
  loadOrders();
});

// --- Dashboard ---

function renderDashboard() {
  const valid = ordersCache.filter((o) => o.status !== 'cancelado');
  const totalSales = valid.reduce((sum, o) => sum + o.totalCents, 0);

  const now = new Date();
  const monthSales = valid
    .filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, o) => sum + o.totalCents, 0);

  const pending = ordersCache.filter((o) => ['pendiente', 'pagado', 'preparacion', 'enviado'].includes(o.status)).length;

  document.getElementById('statTotalSales').textContent = formatPrice(totalSales);
  document.getElementById('statMonthSales').textContent = formatPrice(monthSales);
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statTotalOrders').textContent = valid.length;

  const salesByProduct = {};
  valid.forEach((o) => {
    o.items.forEach((i) => {
      salesByProduct[i.name] = (salesByProduct[i.name] || 0) + i.quantity;
    });
  });
  const topProducts = Object.entries(salesByProduct).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topProductsList = document.getElementById('topProductsList');
  topProductsList.innerHTML = topProducts.length
    ? topProducts.map(([name, qty]) => `<li>${name} <span class="admin-rank-value">${qty} vendidos</span></li>`).join('')
    : '<li class="admin-muted">Todavía no hay ventas.</li>';

  // Ventas por mes: últimos 6 meses, incluyendo los que no tuvieron ventas.
  const byMonth = {};
  valid.forEach((o) => {
    const key = monthKey(o.createdAt);
    byMonth[key] = byMonth[key] || { orders: 0, pieces: 0, cents: 0 };
    byMonth[key].orders += 1;
    byMonth[key].pieces += o.items.reduce((sum, i) => sum + i.quantity, 0);
    byMonth[key].cents += o.totalCents;
  });
  const monthKeys = [];
  for (let i = 0; i < 6; i += 1) {
    monthKeys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  document.getElementById('monthlySalesBody').innerHTML = monthKeys.map((key) => {
    const m = byMonth[key] || { orders: 0, pieces: 0, cents: 0 };
    return `<tr class="${m.orders ? '' : 'admin-muted'}"><td>${monthLabel(key)}</td><td>${m.orders}</td><td>${m.pieces}</td><td>${formatPrice(m.cents)}</td></tr>`;
  }).join('');

  const lowStockList = document.getElementById('lowStockList');
  const lowStockItems = [];
  const limit = lowStockLimit();
  productsCache.forEach((p) => {
    p.sizes.forEach((s) => {
      if (s.stock <= limit) lowStockItems.push(`${p.name} — talla ${s.size} <span class="admin-rank-value">${s.stock} pzas</span>`);
    });
  });
  lowStockList.innerHTML = lowStockItems.length
    ? lowStockItems.map((html) => `<li>${html}</li>`).join('')
    : '<li class="admin-muted">Todo el inventario está en buen nivel.</li>';
}

// --- Settings ---

async function loadSettingsForm() {
  const res = await fetch('/api/settings');
  const settings = await res.json();
  document.getElementById('settingStoreName').value = settings.storeName || '';
  document.getElementById('settingWhatsapp').value = settings.whatsappNumber || '';
  document.getElementById('settingPhoneDisplay').value = settings.phoneDisplay || '';
  document.getElementById('settingAddress').value = settings.address || '';
  document.getElementById('settingHours').value = settings.hours || '';
  document.getElementById('settingRating').value = settings.googleRating || '';
  document.getElementById('settingReviewCount').value = settings.googleReviewCount || '';
  document.getElementById('settingNotifyEmail').value = settings.notifyEmail || '';
  document.getElementById('settingLowStock').value = settings.lowStockThreshold ?? 5;
}

document.getElementById('testEmailBtn').addEventListener('click', async () => {
  const status = document.getElementById('testEmailStatus');
  status.textContent = 'Enviando…';
  const res = await fetch('/api/admin/test-email', { method: 'POST' });
  const data = await res.json();
  status.textContent = res.ok ? 'Correo enviado. Revisa tu bandeja.' : (data.error || 'No se pudo enviar.');
});

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const settingsError = document.getElementById('settingsError');
  const settingsSuccess = document.getElementById('settingsSuccess');
  settingsError.textContent = '';
  settingsSuccess.textContent = '';

  const body = {
    storeName: document.getElementById('settingStoreName').value,
    whatsappNumber: document.getElementById('settingWhatsapp').value,
    phoneDisplay: document.getElementById('settingPhoneDisplay').value,
    address: document.getElementById('settingAddress').value,
    hours: document.getElementById('settingHours').value,
    googleRating: document.getElementById('settingRating').value,
    googleReviewCount: document.getElementById('settingReviewCount').value,
    notifyEmail: document.getElementById('settingNotifyEmail').value.trim(),
    lowStockThreshold: Math.max(0, parseInt(document.getElementById('settingLowStock').value, 10) || 0),
  };

  const res = await fetch('/api/admin/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    settingsError.textContent = 'No se pudo guardar la configuración.';
    return;
  }
  settingsSuccess.textContent = 'Configuración guardada.';
  await loadSettingsCache();
  renderProductsTable(productsCache);
});

document.getElementById('passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const passwordError = document.getElementById('passwordError');
  const passwordSuccess = document.getElementById('passwordSuccess');
  passwordError.textContent = '';
  passwordSuccess.textContent = '';

  const res = await fetch('/api/admin/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentPassword: document.getElementById('currentPassword').value,
      newPassword: document.getElementById('newPassword').value,
    }),
  });
  const data = await res.json();

  if (!res.ok) {
    passwordError.textContent = data.error || 'No se pudo cambiar la contraseña.';
    return;
  }
  passwordSuccess.textContent = 'Contraseña actualizada.';
  document.getElementById('passwordForm').reset();
});

checkSession();
