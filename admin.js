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

// Íconos en línea (trazo, 16px) para los botones del panel.
const ICONS = {
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="6" y="14" width="12" height="7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>',
  whatsapp: '<path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L4 20l1.1-4.2A8.5 8.5 0 1 1 21 11.5Z"/><path d="M9.5 9.5c.3 1.6 2.4 3.7 4 4l1.3-1.2 2 1c-.4 1.6-1.6 2-2.6 1.9-2.6-.3-6.3-4-6.6-6.6-.1-1 .3-2.2 1.9-2.6l1 2Z"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
  alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
};

function icon(name, size = 16) {
  return `<svg class="admin-svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

function iconBtn(action, name, title, extra = '') {
  return `<button type="button" class="admin-icon-btn ${name === 'trash' ? 'admin-icon-btn--danger' : ''}" data-action="${action}" title="${title}" aria-label="${title}" ${extra}>${icon(name)}</button>`;
}

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  preparacion: 'En preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  devuelto: 'Devuelto',
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

// Escapa texto para meterlo en HTML (nombres de clientes, notas, etc.).
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatPrice(cents) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function showAdmin() {
  loginScreen.hidden = true;
  adminScreen.hidden = false;
  const first = [...document.querySelectorAll('.admin-tab')].find((t) => !t.hidden);
  loadSettingsCache()
    .then(() => (can('productos.ver') ? loadProducts() : null))
    .then(() => (can('pedidos.ver') ? loadOrders() : null))
    .then(() => { if (first) showTab(first.dataset.tab); })
    .then(() => { if (can('pedidos.ver')) pollNewOrders(); });
}

function showLogin() {
  loginScreen.hidden = false;
  adminScreen.hidden = true;
  setLoginStep('password');
}

let currentUser = null; // { username, name, role, perms[] } de la sesión actual
function can(perm) {
  return Boolean(currentUser?.perms?.includes(perm));
}

function setLoginStep(step) {
  document.getElementById('loginStepPassword').hidden = step === 'mfa';
  document.getElementById('loginStepMfa').hidden = step !== 'mfa';
  document.getElementById('loginSub').textContent = step === 'mfa' ? 'Falta un paso: escribe el código de tu app de autenticación.' : 'Escribe tu usuario y contraseña para entrar a la tienda.';
  document.querySelector('#loginBtn .admin-login-btn-text').textContent = step === 'mfa' ? 'Verificar' : 'Entrar';
  if (step === 'mfa') setTimeout(() => document.getElementById('loginCode').focus(), 50);
}

// Oculta las secciones que el rol no puede usar (el servidor las bloquea de todos modos).
function applyPermissions() {
  // Clases perm-* en <body> para ocultar por CSS los controles de edición que el rol no puede usar.
  document.body.className = document.body.className.replace(/\bperm-[\w.-]+/g, '').trim();
  (currentUser?.perms || []).forEach((p) => document.body.classList.add(`perm-${p.replace('.', '-')}`));
  document.querySelectorAll('.admin-tab[data-perm]').forEach((t) => { t.hidden = !can(t.dataset.perm); });
  document.querySelectorAll('.admin-side-group').forEach((g) => { g.hidden = ![...g.querySelectorAll('.admin-tab')].some((t) => !t.hidden); });
  document.getElementById('accountName').textContent = currentUser?.name || currentUser?.username || '';
  document.getElementById('accountRole').textContent = currentUser?.roleLabel || '';
}

async function checkSession() {
  const res = await fetch('/api/admin/session');
  const data = await res.json();
  if (!data.isAdmin) {
    currentUser = null;
    showLogin();
    return;
  }
  currentUser = data.user;
  window.sessionInfo = data;
  applyPermissions();
  showAdmin();
  window.onSessionReady?.(data);
}

function setLoginError(message) {
  loginError.textContent = message;
  const field = document.getElementById('loginField');
  field.classList.toggle('has-error', Boolean(message));
  if (message) {
    field.classList.remove('shake');
    void field.offsetWidth;
    field.classList.add('shake');
  }
}

document.getElementById('togglePassword').addEventListener('click', (e) => {
  const input = document.getElementById('loginPassword');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  e.currentTarget.querySelector('.admin-eye-open').hidden = show;
  e.currentTarget.querySelector('.admin-eye-closed').hidden = !show;
  e.currentTarget.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  input.focus();
});

document.getElementById('loginPassword').addEventListener('input', () => {
  if (loginError.textContent) setLoginError('');
});
try { document.getElementById('loginUser').value = localStorage.getItem('wj-admin-user') || ''; } catch { /* sin localStorage */ }
if (document.getElementById('loginUser').value) document.getElementById('loginPassword').focus();

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const mfaStep = !document.getElementById('loginStepMfa').hidden;
  const input = document.getElementById(mfaStep ? 'loginCode' : 'loginPassword');
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!mfaStep && !password.trim()) {
    setLoginError('Escribe tu contraseña.');
    input.focus();
    return;
  }
  if (mfaStep && input.value.replace(/\D/g, '').length !== 6) {
    setLoginError('El código tiene 6 dígitos.');
    input.focus();
    return;
  }
  const btn = document.getElementById('loginBtn');
  btn.classList.add('is-loading');
  btn.disabled = true;
  setLoginError('');
  try {
    const res = await fetch(mfaStep ? '/api/admin/login/mfa' : '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mfaStep ? { code: input.value } : { username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoginError(data.error || 'No se pudo iniciar sesión.');
      if (res.status === 429 && mfaStep) setLoginStep('password');
      input.select();
      return;
    }
    if (data.mfaRequired) {
      setLoginStep('mfa');
      return;
    }
    try { localStorage.setItem('wj-admin-user', username); } catch { /* sin localStorage */ }
    loginForm.reset();
    checkSession();
  } catch {
    setLoginError('Sin conexión con el servidor. Inténtalo de nuevo.');
  } finally {
    btn.classList.remove('is-loading');
    btn.disabled = false;
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  currentUser = null;
  showLogin();
});

// Respuestas 403 del servidor: sin permiso, o falta cambiar contraseña / activar dos pasos.
const nativeFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
  const res = await nativeFetch(...args);
  if (res.status === 403 && String(args[0]).startsWith('/api/admin')) {
    try {
      const data = await res.clone().json();
      if (data.code === 'password_change_required' || data.code === 'mfa_required') window.forceAccountStep?.(data.code);
      else if (data.code === 'forbidden') window.notifyForbidden?.(data.error);
    } catch { /* sin cuerpo JSON */ }
  }
  return res;
};

// --- Tabs ---

// Costo de una partida: el guardado en el pedido o, si no lo tiene, el costo actual del producto.
function itemCost(item) {
  if (Number.isFinite(item.costCents) && item.costCents > 0) return item.costCents;
  const product = productsCache.find((p) => p.id === item.id);
  return product?.costCents || 0;
}

function orderCost(order) {
  return order.items.reduce((sum, i) => sum + itemCost(i) * i.quantity, 0);
}

function orderPieces(order) {
  return order.items.reduce((sum, i) => sum + i.quantity, 0);
}

function marginText(sales, profit) {
  if (!sales) return '';
  return `${Math.round((profit / sales) * 100)}% de margen`;
}

// Etiqueta cada celda con el encabezado de su columna (data-label) para que las tablas se lean como tarjetas en celular.
function labelTableCells(tbody) {
  const table = tbody.closest('table');
  const heads = table ? Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim()) : [];
  if (!heads.length) return;
  tbody.querySelectorAll('tr').forEach((tr) => {
    Array.from(tr.children).forEach((td, i) => {
      if (td.hasAttribute('colspan')) return;
      if (!td.dataset.label) td.dataset.label = heads[i] || '';
    });
  });
}
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.admin-table tbody').forEach((tb) => {
    labelTableCells(tb);
    new MutationObserver(() => labelTableCells(tb)).observe(tb, { childList: true });
  });
});

function showTab(name) {
  document.querySelectorAll('.admin-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.admin-tab-panel').forEach((panel) => { panel.hidden = true; });
  document.getElementById(`tab${name.charAt(0).toUpperCase()}${name.slice(1)}`).hidden = false;

  if (name === 'dashboard') renderDashboard();
  if (name === 'tablero') loadOrders().then(renderKanban);
  if (name === 'pedidos') loadOrders();
  if (name === 'clientes') loadCustomers();
  if (name === 'inventario') loadInventory();
  if (name === 'variantes') window.loadVariants?.();
  if (name === 'categorias') window.renderCategories?.();
  if (name === 'colecciones') window.renderCollections?.();
  if (name === 'existencias') window.loadStock?.();
  if (name === 'almacenes') window.renderWarehouses?.();
  if (name === 'proveedores') window.loadPurchases?.().then(() => window.loadSuppliers?.());
  if (name === 'compras') window.loadPurchases?.();
  if (name === 'devoluciones') window.loadReturns?.();
  if (name === 'cotizaciones') window.loadLeads?.();
  if (name === 'resenas') window.loadReviews?.();
  if (name === 'articulos') window.loadArticles?.();
  if (name === 'promociones') window.loadPromotions?.();
  if (name === 'reportes') loadOrders().then(renderReports);
  if (name === 'configuracion') loadSettingsForm();
  if (name === 'usuarios') window.loadUsers?.();
  if (name === 'actividad') window.loadAudit?.();
  if (window.matchMedia('(max-width: 700px)').matches) document.querySelector('.admin-side .admin-tab.active')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}

document.querySelectorAll('.admin-tab').forEach((tab) => {
  tab.addEventListener('click', () => showTab(tab.dataset.tab));
});

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-goto]');
  if (go) showTab(go.dataset.goto);
});

// --- Products ---

async function loadProducts() {
  const res = await fetch('/api/admin/products');
  if (res.status === 401) {
    showLogin();
    return;
  }
  const products = await res.json();
  products.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  productsCache = products;
  renderProductsTable(products);
}

async function saveProductOrder() {
  await fetch('/api/admin/products-order', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: productsCache.map((p) => p.id) }),
  });
}

function totalStock(product) {
  return product.sizes.reduce((sum, s) => sum + s.stock, 0);
}

function renderProductsTable(products) {
  if (products.length === 0) {
    productsTableBody.innerHTML = '<tr><td colspan="6">No hay productos todavía.</td></tr>';
    return;
  }

  productsTableBody.innerHTML = products.map((p, index) => {
    const stock = totalStock(p);
    const limit = lowStockLimit();
    const hidden = p.active === false;
    const tag = p.tag === 'nuevo' ? '<span class="admin-tag admin-tag--nuevo">Nuevo</span>' : p.tag === 'oferta' ? '<span class="admin-tag admin-tag--oferta">Oferta</span>' : '';
    const wholesale = p.wholesale ? `<span class="admin-muted admin-small">Mayoreo ${formatPrice(p.wholesale.priceCents)} desde ${p.wholesale.minQty}</span>` : '';
    return `
      <tr data-id="${p.id}" class="${hidden ? 'admin-row-hidden' : ''}">
        <td class="admin-order-btns">
          ${iconBtn('move-up', 'up', 'Subir', index === 0 ? 'disabled' : '')}
          ${iconBtn('move-down', 'down', 'Bajar', index === products.length - 1 ? 'disabled' : '')}
        </td>
        <td><img src="${p.image}" alt="${p.name}" class="admin-table-photo"></td>
        <td>${p.name} ${tag}${p.status === 'descontinuado' ? '<span class="admin-tag admin-tag--off">Descontinuado</span>' : p.status === 'borrador' ? '<span class="admin-tag admin-tag--draft">Borrador</span>' : ''}<br><span class="admin-muted admin-small">${[p.sku, p.fit, p.wash, p.collection].filter(Boolean).join(' · ')}</span>${wholesale ? '<br>' + wholesale : ''}</td>
        <td>${p.category}</td>
        <td>${p.comparePriceCents ? `<s class="admin-muted">${formatPrice(p.comparePriceCents)}</s> ` : ''}${formatPrice(p.priceCents)}</td>
        <td class="${p.sizes.some((s) => s.stock <= limit) ? 'admin-stock-low' : ''}">
          <button type="button" class="admin-stock-toggle" data-action="toggle-stock" title="Ver y ajustar por talla">${stock} pzas ▾</button>
        </td>
        <td>
          <label class="admin-switch" title="${hidden ? 'Oculto en la tienda' : 'Visible en la tienda'}">
            <input type="checkbox" data-action="toggle-active" ${hidden ? '' : 'checked'}>
            <span></span>
          </label>
        </td>
        <td class="admin-table-actions">
          ${iconBtn('duplicate', 'copy', 'Duplicar')}
          ${iconBtn('edit', 'edit', 'Editar')}
          ${iconBtn('delete', 'trash', 'Eliminar')}
        </td>
      </tr>
      <tr class="admin-stock-row" data-id="${p.id}" hidden>
        <td colspan="8">
          <div class="admin-stock-grid">
            ${p.sizes.map((s) => `
              <div class="admin-stock-size ${s.stock <= limit ? 'is-low' : ''}" data-size="${variantLabel(s)}">
                <span class="admin-stock-size-name">${variantLabel(s)}</span>
                <div class="admin-stock-controls">
                  <button type="button" class="admin-stock-btn" data-action="adjust" data-delta="-1" aria-label="Quitar una pieza">−</button>
                  <input type="number" class="admin-stock-count admin-stock-input admin-stock-input--sm" value="${s.stock}" min="0" step="1" data-current="${s.stock}" title="Escribe la cantidad y presiona Enter">
                  <button type="button" class="admin-stock-btn" data-action="adjust" data-delta="1" aria-label="Agregar una pieza">+</button>
                </div>
              </div>
            `).join('')}
          </div>
          <p class="admin-help">Escribe la cantidad exacta y presiona Enter, o usa + y −. Todo queda registrado en Movimientos.</p>
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
  const countEl = sizeEl.querySelector('.admin-stock-count');
  countEl.value = data.stock;
  countEl.dataset.current = data.stock;
  sizeEl.classList.toggle('is-low', data.stock <= lowStockLimit());
  const mainRow = productsTableBody.querySelector(`tr[data-id="${productId}"]:not(.admin-stock-row)`);
  if (mainRow && product) {
    const cell = mainRow.querySelector('.admin-stock-toggle');
    cell.textContent = `${totalStock(product)} pzas ▾`;
    cell.closest('td').classList.toggle('admin-stock-low', product.sizes.some((s) => s.stock <= lowStockLimit()));
  }
}

function warehouseList() {
  const list = settingsCache.warehouses;
  return Array.isArray(list) && list.length ? list : ['Tienda'];
}

function variantLabel(v) {
  return [v.size, v.length ? `L${v.length}` : '', v.color || ''].filter(Boolean).join(' / ');
}

function addSizeRow(v = {}) {
  const names = warehouseList();
  const row = document.createElement('tr');
  row.className = 'admin-size-row';
  const wh = v.warehouses || {};
  const stockCell = names.length > 1
    ? names.map((n) => `<label class="admin-wh-cell"><span>${n}</span><input type="number" class="size-row-wh" data-wh="${n}" min="0" value="${wh[n] ?? (n === names[0] ? (v.stock ?? 0) : 0)}"></label>`).join('')
    : `<input type="number" class="size-row-stock" min="0" value="${v.stock ?? 0}">`;
  row.innerHTML = `
    <td><input type="text" class="size-row-name" placeholder="32" value="${v.size || ''}"></td>
    <td><input type="text" class="size-row-length" placeholder="32" value="${v.length || ''}"></td>
    <td><input type="text" class="size-row-color" placeholder="Índigo" value="${v.color || ''}"></td>
    <td><input type="text" class="size-row-sku" placeholder="auto" value="${v.sku || ''}"></td>
    <td><input type="text" class="size-row-barcode" placeholder="EAN" value="${v.barcode || ''}"></td>
    <td class="admin-wh-cells">${stockCell}</td>
    <td><input type="number" class="size-row-price" step="0.01" min="0" placeholder="=" value="${v.priceCents ? (v.priceCents / 100).toFixed(2) : ''}"></td>
    <td><input type="number" class="size-row-cost" step="0.01" min="0" placeholder="=" value="${v.costCents ? (v.costCents / 100).toFixed(2) : ''}"></td>
    <td>${iconBtn('remove-size', 'close', 'Quitar variante')}</td>
  `;
  row.querySelector('[data-action="remove-size"]').addEventListener('click', () => row.remove());
  sizeRowsContainer.appendChild(row);
}

document.getElementById('addSizeRowBtn').addEventListener('click', () => addSizeRow());

document.getElementById('genVariantsBtn').addEventListener('click', () => {
  const parse = (id) => document.getElementById(id).value.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  const sizes = parse('genSizes');
  const lengths = parse('genLengths');
  const colors = parse('genColors');
  if (sizes.length === 0) {
    formError.textContent = 'Escribe al menos una talla para generar combinaciones.';
    return;
  }
  const existing = new Set(Array.from(sizeRowsContainer.querySelectorAll('.admin-size-row')).map((r) => variantLabel({
    size: r.querySelector('.size-row-name').value.trim(),
    length: r.querySelector('.size-row-length').value.trim(),
    color: r.querySelector('.size-row-color').value.trim(),
  })));
  let added = 0;
  for (const color of colors.length ? colors : ['']) {
    for (const size of sizes) {
      for (const length of lengths.length ? lengths : ['']) {
        const v = { size, length, color, stock: 0 };
        if (existing.has(variantLabel(v))) continue;
        addSizeRow(v);
        added += 1;
      }
    }
  }
  formError.textContent = added ? '' : 'Esas combinaciones ya existen.';
});

function fillProductFormSelects() {
  const cats = settingsCache.categories || [];
  document.getElementById('fieldCategory').innerHTML = cats.map((c) => `<option value="${c.name}">${c.name}</option>`).join('') || '<option value="Pantalones">Pantalones</option><option value="Camisas">Camisas</option>';
  const cols = settingsCache.collections || [];
  document.getElementById('fieldCollection').innerHTML = '<option value="">Sin colección</option>' + cols.map((c) => `<option value="${c}">${c}</option>`).join('');
  document.getElementById('variantStockHead').textContent = warehouseList().length > 1 ? `Existencia (${warehouseList().join(' / ')})` : 'Existencia';
}

function renderImageList() {
  const list = document.getElementById('imageList');
  list.innerHTML = formImages.map((img, i) => `
    <div class="admin-image-item ${i === 0 ? 'is-main' : ''}">
      <img src="${img}" alt="">
      <span class="admin-image-tag">${i === 0 ? 'Principal' : `#${i + 1}`}</span>
      <div class="admin-image-actions">
        ${i > 0 ? `<button type="button" class="admin-inline-btn" data-action="main" data-index="${i}">Hacer principal</button>` : ''}
        ${iconBtn('remove-image', 'close', 'Quitar foto', `data-index="${i}"`)}
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
  fillProductFormSelects();
  ['genSizes', 'genLengths', 'genColors'].forEach((id) => { document.getElementById(id).value = ''; });

  if (product) {
    formTitle.textContent = 'Editar producto';
    document.getElementById('productId').value = product.id;
    document.getElementById('fieldName').value = product.name;
    document.getElementById('fieldCategory').value = product.category;
    document.getElementById('fieldPrice').value = (product.priceCents / 100).toFixed(2);
    document.getElementById('fieldDescription').value = product.description;
    document.getElementById('fieldCompare').value = product.comparePriceCents ? (product.comparePriceCents / 100).toFixed(2) : '';
    document.getElementById('fieldCost').value = product.costCents ? (product.costCents / 100).toFixed(2) : '';
    document.getElementById('fieldTag').value = product.tag || '';
    document.getElementById('fieldWholesaleQty').value = product.wholesale ? product.wholesale.minQty : '';
    document.getElementById('fieldWholesalePrice').value = product.wholesale ? (product.wholesale.priceCents / 100).toFixed(2) : '';
    document.getElementById('fieldStatus').value = product.status || (product.active === false ? 'borrador' : 'activo');
    document.getElementById('fieldSku').value = product.sku || '';
    ['gender', 'fit', 'rise', 'wash', 'composition', 'stretch', 'season', 'collection'].forEach((k) => {
      const el = document.getElementById(`field${k.charAt(0).toUpperCase()}${k.slice(1)}`);
      if (el) el.value = product[k] || '';
    });
    document.querySelector('.admin-attrs').open = Boolean(product.fit || product.wash || product.gender);
    ['longDescription', 'care', 'customization', 'videoUrl', 'seoTitle', 'seoDescription', 'certifications'].forEach((k) => {
      const el = document.getElementById(`field${k.charAt(0).toUpperCase()}${k.slice(1)}`);
      if (!el) return;
      if (k === 'certifications') el.value = (product.certifications || []).map((c) => [c.name, c.number, c.body, c.date, c.validUntil, c.document].map((x) => x || '').join(' | ')).join('\n');
      else el.value = product[k] || '';
    });
    document.getElementById('fieldFeatures').value = (product.features || []).join('\n');
    document.querySelectorAll('.admin-specs-grid input').forEach((input) => { input.value = product.specs?.[input.name.replace('spec_', '')] || ''; });
    document.querySelector('.admin-attrs--ficha').open = Boolean(product.longDescription || product.features?.length || product.specs);
    product.sizes.forEach((s) => addSizeRow(s));
  } else {
    formTitle.textContent = 'Nuevo producto';
    document.getElementById('productId').value = '';
    document.getElementById('fieldStatus').value = 'activo';
    document.querySelector('.admin-attrs').open = false;
    document.querySelector('.admin-attrs--ficha').open = false;
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

  if (btn.dataset.action === 'move-up' || btn.dataset.action === 'move-down') {
    const i = productsCache.findIndex((p) => p.id === id);
    const j = btn.dataset.action === 'move-up' ? i - 1 : i + 1;
    if (j < 0 || j >= productsCache.length) return;
    [productsCache[i], productsCache[j]] = [productsCache[j], productsCache[i]];
    productsCache.forEach((p, k) => { p.order = k + 1; });
    renderProductsTable(productsCache);
    saveProductOrder();
    return;
  }

  if (btn.dataset.action === 'duplicate') {
    const res = await fetch(`/api/admin/products/${id}/duplicate`, { method: 'POST' });
    if (res.ok) {
      await loadProducts();
      const copy = await res.json();
      openForm(productsCache.find((p) => p.id === copy.id));
    }
    return;
  }

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

productsTableBody.addEventListener('keydown', (e) => {
  if (e.target.classList.contains('admin-stock-input') && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
});
productsTableBody.addEventListener('focusout', (e) => {
  if (!e.target.classList.contains('admin-stock-input')) return;
  const input = e.target;
  const current = parseInt(input.dataset.current, 10) || 0;
  const wanted = Math.max(0, parseInt(input.value, 10) || 0);
  if (wanted === current) { input.value = current; return; }
  const sizeEl = input.closest('.admin-stock-size');
  adjustStock(input.closest('tr').dataset.id, sizeEl.dataset.size, wanted - current, sizeEl);
});

productsTableBody.addEventListener('change', async (e) => {
  if (e.target.dataset.action !== 'toggle-active') return;
  const id = e.target.closest('tr').dataset.id;
  const res = await fetch(`/api/admin/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: e.target.checked }),
  });
  if (res.ok) {
    const product = productsCache.find((p) => p.id === id);
    if (product) product.active = e.target.checked;
    e.target.closest('tr').classList.toggle('admin-row-hidden', !e.target.checked);
  }
});

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';

  const sizes = Array.from(sizeRowsContainer.querySelectorAll('.admin-size-row'))
    .map((row) => {
      const v = {
        size: row.querySelector('.size-row-name').value.trim(),
        length: row.querySelector('.size-row-length').value.trim(),
        color: row.querySelector('.size-row-color').value.trim(),
        sku: row.querySelector('.size-row-sku').value.trim(),
        barcode: row.querySelector('.size-row-barcode').value.trim(),
        priceMxn: row.querySelector('.size-row-price').value,
        costMxn: row.querySelector('.size-row-cost').value,
      };
      const whInputs = row.querySelectorAll('.size-row-wh');
      if (whInputs.length) {
        v.warehouses = {};
        whInputs.forEach((i) => { v.warehouses[i.dataset.wh] = Math.max(0, parseInt(i.value, 10) || 0); });
      } else {
        v.stock = Math.max(0, parseInt(row.querySelector('.size-row-stock').value, 10) || 0);
      }
      return v;
    })
    .filter((s) => s.size);

  if (sizes.length === 0) {
    formError.textContent = 'Agrega al menos una talla.';
    return;
  }

  const id = document.getElementById('productId').value;
  const formData = new FormData(productForm);
  formData.set('sizes', JSON.stringify(sizes));
  if (id) formData.set('keepImages', JSON.stringify(formImages));
  formData.delete('active');
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
  renderStatusChips();
  renderOrders(filteredOrders());
}

function filteredOrders() {
  const q = ordersSearch.trim().toLowerCase();
  return ordersCache.filter((o) => {
    if (ordersMonth && monthKey(o.createdAt) !== ordersMonth) return false;
    if (ordersStatus === 'activos' && ['entregado', 'cancelado', 'devuelto'].includes(o.status)) return false;
    if (ordersStatus.startsWith('need:')) { if (!(window.orderNeeds ? window.orderNeeds(o) : []).some((n) => n.key === ordersStatus.slice(5))) return false; }
    else if (ordersStatus && ordersStatus !== 'activos' && o.status !== ordersStatus) return false;
    if (!q) return true;
    const haystack = [o.id, o.customerName, o.customerPhone, o.customerEmail, o.tracking?.number, ...o.items.map((i) => i.name)].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

document.getElementById('ordersSearch').addEventListener('input', (e) => {
  ordersSearch = e.target.value;
  renderOrders(filteredOrders());
});

const CHIP_FILTERS = [
  ['', 'Todos'],
  ['activos', 'Activos'],
  ['pendiente', 'Pendiente'],
  ['pagado', 'Pagado'],
  ['preparacion', 'En preparación'],
  ['enviado', 'Enviado'],
  ['entregado', 'Entregado'],
  ['cancelado', 'Cancelado'],
  ['devuelto', 'Devuelto'],
  ['need:cobrar', 'Sin pagar'],
  ['need:enviar', 'Por enviar'],
  ['need:facturar', 'Pide factura'],
];

function chipCount(value) {
  if (!value) return ordersCache.length;
  if (value === 'activos') return ordersCache.filter((o) => !['entregado', 'cancelado'].includes(o.status)).length;
  if (value.startsWith('need:')) return ordersCache.filter((o) => (window.orderNeeds ? window.orderNeeds(o) : []).some((n) => n.key === value.slice(5))).length;
  return ordersCache.filter((o) => o.status === value).length;
}

function renderStatusChips() {
  document.getElementById('statusChips').innerHTML = CHIP_FILTERS.map(([value, label]) => `
    <button type="button" class="admin-chip ${ordersStatus === value ? 'is-active' : ''} ${value ? `chip-${value.replace(':', '-')}` : ''}" data-status="${value}" role="tab" aria-selected="${ordersStatus === value}">
      ${label} <span>${chipCount(value)}</span>
    </button>
  `).join('');
}

function updateFilterState() {
  const active = Boolean(ordersSearch.trim() || ordersStatus || ordersMonth);
  document.getElementById('clearFiltersBtn').hidden = !active;
  const shown = filteredOrders();
  const total = shown.reduce((sum, o) => sum + (o.status === 'cancelado' ? 0 : o.totalCents), 0);
  document.getElementById('ordersSummaryText').textContent = shown.length
    ? `${shown.length} ${shown.length === 1 ? 'pedido' : 'pedidos'}${active ? ' con estos filtros' : ' en total'} · ${formatPrice(total)}`
    : '';
}

document.getElementById('statusChips').addEventListener('click', (e) => {
  const chip = e.target.closest('.admin-chip');
  if (!chip) return;
  ordersStatus = chip.dataset.status;
  renderStatusChips();
  renderOrders(filteredOrders());
});

document.getElementById('clearFiltersBtn').addEventListener('click', () => {
  ordersSearch = '';
  ordersStatus = '';
  ordersMonth = '';
  document.getElementById('ordersSearch').value = '';
  document.getElementById('ordersMonthFilter').value = '';
  renderStatusChips();
  renderOrders(filteredOrders());
});

document.getElementById('refreshOrdersBtn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.classList.add('is-spinning');
  await loadOrders();
  await loadProducts();
  setTimeout(() => btn.classList.remove('is-spinning'), 600);
});

document.getElementById('printOrdersBtn').addEventListener('click', () => {
  const orders = filteredOrders();
  if (orders.length === 0) {
    alert('No hay pedidos para imprimir.');
    return;
  }
  const rows = orders.map((o) => `<tr><td>${new Date(o.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${o.customerName || '—'}<br><small>${o.customerPhone || ''}</small></td><td>${o.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity}`).join('<br>')}</td><td style="text-align:right">${formatPrice(o.totalCents)}</td><td>${STATUS_LABELS[o.status] || o.status}</td><td>${o.tracking?.number ? `${o.tracking.carrier || ''} ${o.tracking.number}` : ''}</td></tr>`).join('');
  const win = window.open('', '_blank');
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Pedidos · Works Jeans</title><style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{font-size:1.2rem;margin:0 0 4px}p{margin:0 0 16px;color:#555;font-size:.85rem}table{width:100%;border-collapse:collapse;font-size:.85rem}th,td{padding:8px 6px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}th{font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:#666}small{color:#666}</style></head><body><h1>Pedidos · Works Jeans</h1><p>${new Date().toLocaleString('es-MX')} · ${orders.length} pedidos</p><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Estado</th><th>Guía</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
  win.document.close();
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
  const header = ['Pedido', 'Fecha', 'Origen', 'Estado', 'Cliente', 'Teléfono', 'Correo', 'Dirección de envío', 'Paquetería', 'Guía', 'Productos', 'Piezas', 'Total MXN', 'Costo MXN', 'Utilidad MXN', 'Notas'];
  const rows = orders.map((o) => [
    o.id,
    new Date(o.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
    o.source === 'stripe' ? 'Tarjeta' : o.source === 'openpay' ? `Openpay ${o.payment?.method || ''}` : 'WhatsApp',
    STATUS_LABELS[o.status] || o.status,
    o.customerName || '',
    o.customerPhone || '',
    o.customerEmail || '',
    o.shipping ? [o.shipping.line1, o.shipping.line2, o.shipping.city, o.shipping.state, o.shipping.postalCode].filter(Boolean).join(', ') : '',
    o.tracking?.carrier || '',
    o.tracking?.number || '',
    o.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity}`).join('; '),
    orderPieces(o),
    (o.totalCents / 100).toFixed(2),
    (orderCost(o) / 100).toFixed(2),
    ((o.totalCents - orderCost(o)) / 100).toFixed(2),
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
  updateFilterState();
  if (orders.length === 0) {
    ordersTableBody.innerHTML = `<tr><td colspan="7">${ordersMonth || ordersSearch || ordersStatus ? 'No hay pedidos con esos filtros.' : 'No hay pedidos todavía.'}</td></tr>`;
    return;
  }

  ordersTableBody.innerHTML = orders.map((o) => {
    const date = new Date(o.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    const itemsSummary = o.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity}`).join(', ');
    const sourceLabel = o.source === 'stripe' ? `<span class="admin-source">${icon('card', 14)} Tarjeta</span>` : o.source === 'openpay' ? `<span class="admin-source">${icon('card', 14)} ${o.payment?.method === 'spei' ? 'SPEI' : o.payment?.method === 'store' ? 'Tienda' : 'Tarjeta'}${o.payment?.status === 'paid' ? '' : ' · <b>pago pendiente</b>'}</span>` : `<span class="admin-source">${icon('chat', 14)} WhatsApp</span>`;
    return `
      <tr data-id="${o.id}">
        <td class="admin-clickable" data-action="view">${date}</td>
        <td class="admin-clickable" data-action="view">${sourceLabel}</td>
        <td class="admin-clickable" data-action="view">${esc(o.customerName) || '—'}${o.customerPhone ? `<br><span class="admin-muted">${esc(o.customerPhone)}</span>` : ''}</td>
        <td class="admin-order-items-cell admin-clickable" data-action="view">${esc(itemsSummary)}</td>
        <td class="admin-clickable" data-action="view">${formatPrice(o.totalCents)}</td>
        <td>
          <select class="admin-status-select status-${o.status}" data-action="status">${statusOptions(o.status)}</select>
          ${o.tracking?.number ? `<span class="admin-muted admin-tracking-tag">${o.tracking.carrier ? `${esc(o.tracking.carrier)} · ` : ''}${esc(o.tracking.number)}</span>` : ''}
          ${o.invoice ? `<span class="admin-tracking-tag ${o.invoice.issued ? 'admin-muted' : 'admin-invoice-pending'}">${o.invoice.issued ? 'Facturado' : 'Pide factura'}</span>` : ''}
        </td>
        <td class="admin-table-actions">
          ${iconBtn('view-order', 'eye', 'Ver detalle')}
          ${iconBtn('print-order', 'print', 'Imprimir nota')}
          ${whatsappDigits(o.customerPhone) ? iconBtn('whatsapp-order', 'whatsapp', 'WhatsApp al cliente') : ''}
          ${iconBtn('delete-order', 'trash', 'Eliminar')}
        </td>
      </tr>
    `;
  }).join('');
}

ordersTableBody.addEventListener('click', async (e) => {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const id = tr.dataset.id;
  const action = e.target.closest('[data-action]')?.dataset.action;

  if (action === 'view' || action === 'view-order') {
    openOrderDetail(id);
    return;
  }
  if (action === 'print-order') {
    window.open(`nota.html?id=${encodeURIComponent(id)}`, '_blank', 'noopener');
    return;
  }
  if (action === 'whatsapp-order') {
    const order = ordersCache.find((o) => o.id === id);
    const digits = whatsappDigits(order?.customerPhone);
    if (digits) window.open(`https://wa.me/${digits}`, '_blank', 'noopener');
    return;
  }

  if (action === 'delete-order') {
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
    renderStatusChips();
    updateFilterState();
    if (updated.status === 'cancelado' || order?.status === 'cancelado') loadProducts();
  }
});

function openOrderDetail(id) {
  const order = ordersCache.find((o) => o.id === id);
  if (!order) return;
  activeOrderId = id;

  const date = new Date(order.createdAt).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
  const sourceLabel = order.source === 'stripe' ? `${icon('card', 14)} Pago con tarjeta` : order.source === 'openpay' ? `${icon('card', 14)} Openpay · ${order.payment?.method === 'spei' ? 'transferencia SPEI' : order.payment?.method === 'store' ? 'pago en tienda' : 'tarjeta'} · ${order.payment?.status === 'paid' ? 'pagado' : order.payment?.status === 'failed' ? 'pago fallido' : 'pago pendiente'}${order.payment?.clabe ? ` · CLABE ${esc(order.payment.clabe)}` : ''}${order.payment?.reference ? ` · ref. ${esc(order.payment.reference)}` : ''}` : `${icon('chat', 14)} Pedido por WhatsApp`;

  orderDetailContent.innerHTML = `
    <p><strong>${sourceLabel}</strong></p>
    <p class="admin-muted">${date}</p>
    <p>${esc(order.customerName) || 'Cliente sin nombre'}${order.customerPhone ? ` · ${esc(order.customerPhone)}` : ''}${order.customerEmail ? ` · ${esc(order.customerEmail)}` : ''}</p>
    ${order.shipping ? `<p><strong>Envío a:</strong> ${esc([order.shipping.name, order.shipping.line1, order.shipping.line2, order.shipping.city, order.shipping.state, order.shipping.postalCode, order.shipping.references ? `Ref.: ${order.shipping.references}` : ''].filter(Boolean).join(', '))}</p>` : ''}
    <table class="admin-table admin-detail-table">
      <thead><tr><th>Producto</th><th>Talla</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
      <tbody>
        ${order.items.map((i) => `
          <tr>
            <td>${esc(i.name)}</td>
            <td>${esc(i.size) || '—'}</td>
            <td>${i.quantity}</td>
            <td>${formatPrice(i.priceCents)}</td>
            <td>${formatPrice(i.priceCents * i.quantity)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${order.discount ? `<p class="admin-muted">Subtotal ${formatPrice(order.subtotalCents || order.totalCents + order.discount.cents)} · Descuento −${formatPrice(order.discount.cents)}${order.discount.code ? ` (cupón ${order.discount.code})` : ''}${order.discount.promotions?.length ? ` · ${order.discount.promotions.map((p) => p.name).join(', ')}` : ''}</p>` : ''}
    <p class="admin-order-total">Total: ${formatPrice(order.totalCents)}</p>
    <p class="admin-muted admin-small">Correos al cliente: ${(order.emails || []).length ? order.emails.map((e) => `${e.type} ${e.ok ? '✓' : `✗ (${esc(e.reason || 'error')})`}`).join(' · ') : 'ninguno todavía'}${order.customerEmail ? ` · <button type="button" class="admin-inline-btn" data-action="resend-confirmation">Reenviar confirmación</button>` : ' · sin correo del cliente'} · <button type="button" class="admin-inline-btn" data-action="track-link">Copiar enlace de rastreo</button> · <button type="button" class="admin-inline-btn" data-action="review-link">Copiar enlace para reseña</button></p>
  `;
  orderDetailNotes.value = order.notes || '';
  document.getElementById('orderDetailStatus').value = order.status;
  document.getElementById('orderTrackingCarrier').value = order.tracking?.carrier || '';
  document.getElementById('orderTrackingNumber').value = order.tracking?.number || '';
  document.getElementById('orderTrackingUrl').value = order.tracking?.url || '';
  document.getElementById('ocName').value = order.customerName || '';
  document.getElementById('ocPhone').value = order.customerPhone || '';
  document.getElementById('ocEmail').value = order.customerEmail || '';
  document.getElementById('ocLine1').value = order.shipping?.line1 || '';
  document.getElementById('ocLine2').value = order.shipping?.line2 || '';
  document.getElementById('ocZip').value = order.shipping?.postalCode || '';
  document.getElementById('ocCity').value = order.shipping?.city || '';
  document.getElementById('ocState').value = order.shipping?.state || '';
  document.getElementById('ocRefs').value = order.shipping?.references || '';
  document.getElementById('orderCustomerBox').open = false;
  document.getElementById('orderDetailError').textContent = '';
  document.getElementById('orderWhatsappBtn').disabled = !whatsappDigits(order.customerPhone);
  const inv = order.invoice;
  document.getElementById('orderInvoiceBox').open = Boolean(inv);
  document.getElementById('orderInvoiceRfc').value = inv?.rfc || '';
  document.getElementById('orderInvoiceName').value = inv?.name || '';
  document.getElementById('orderInvoiceEmail').value = inv?.email || '';
  document.getElementById('orderInvoiceZip').value = inv?.zip || '';
  document.getElementById('orderInvoiceRegimen').value = inv?.regimen || '';
  document.getElementById('orderInvoiceUso').value = inv?.uso || '';
  document.getElementById('orderInvoiceIssued').checked = Boolean(inv?.issued);
  orderDetailOverlay.hidden = false;
}

orderDetailContent.addEventListener('click', async (e) => {
  if (e.target.closest('[data-action="track-link"]')) {
    const res = await fetch(`/api/admin/orders/${activeOrderId}/track-link`, { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { document.getElementById('orderDetailError').textContent = d.error || 'No se pudo crear el enlace.'; return; }
    try { await navigator.clipboard.writeText(d.url); document.getElementById('orderDetailError').textContent = 'Enlace de rastreo copiado. Mándaselo al cliente por WhatsApp.'; } catch { prompt('Copia este enlace:', d.url); }
    return;
  }
  if (e.target.closest('[data-action="review-link"]')) {
    const res = await fetch(`/api/admin/orders/${activeOrderId}/review-link`, { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { document.getElementById('orderDetailError').textContent = d.error || 'No se pudo crear el enlace.'; return; }
    try { await navigator.clipboard.writeText(d.url); document.getElementById('orderDetailError').textContent = 'Enlace copiado. Mándaselo por WhatsApp cuando reciba su pedido.'; } catch { prompt('Copia este enlace:', d.url); }
    return;
  }
  if (!e.target.closest('[data-action="resend-confirmation"]')) return;
  const res = await fetch(`/api/admin/orders/${activeOrderId}/email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'confirmacion' }) });
  const data = await res.json().catch(() => ({}));
  document.getElementById('orderDetailError').textContent = res.ok ? 'Correo enviado.' : (data.error || 'No se pudo enviar.');
  await loadOrders();
  openOrderDetail(activeOrderId);
});

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
        url: document.getElementById('orderTrackingUrl').value.trim(),
      },
      customer: { name: document.getElementById('ocName').value, phone: document.getElementById('ocPhone').value, email: document.getElementById('ocEmail').value },
      shipping: { line1: document.getElementById('ocLine1').value, line2: document.getElementById('ocLine2').value, postalCode: document.getElementById('ocZip').value, city: document.getElementById('ocCity').value, state: document.getElementById('ocState').value, references: document.getElementById('ocRefs').value },
      invoice: {
        rfc: document.getElementById('orderInvoiceRfc').value,
        name: document.getElementById('orderInvoiceName').value,
        email: document.getElementById('orderInvoiceEmail').value,
        zip: document.getElementById('orderInvoiceZip').value,
        regimen: document.getElementById('orderInvoiceRegimen').value,
        uso: document.getElementById('orderInvoiceUso').value,
        issued: document.getElementById('orderInvoiceIssued').checked,
        requested: Boolean(order?.invoice) || Boolean(document.getElementById('orderInvoiceRfc').value || document.getElementById('orderInvoiceName').value),
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

// --- Tablero (kanban) ---

const KANBAN_COLUMNS = ['pendiente', 'pagado', 'preparacion', 'enviado', 'entregado'];

function orderCard(o) {
  const date = new Date(o.createdAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const items = o.items.map((i) => `${i.name}${i.size ? ` ${i.size}` : ''} ×${i.quantity}`).join(', ');
  return `
    <article class="admin-card" draggable="true" data-id="${o.id}">
      <header>
        <span class="admin-card-date">${date}</span>
        <span class="admin-card-source">${o.source === 'stripe' || o.source === 'openpay' ? icon('card', 14) : icon('chat', 14)}</span>
      </header>
      <strong>${esc(o.customerName) || 'Sin nombre'}</strong>
      <p>${esc(items)}</p>
      <footer>
        <b>${formatPrice(o.totalCents)}</b>
        ${o.tracking?.number ? `<span class="admin-muted admin-small">${esc(o.tracking.carrier || 'Guía')} ${esc(o.tracking.number)}</span>` : ''}
      </footer>
    </article>
  `;
}

function renderKanban() {
  const board = document.getElementById('kanban');
  const sorted = [...ordersCache].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  board.innerHTML = KANBAN_COLUMNS.map((status) => {
    let orders = sorted.filter((o) => o.status === status);
    if (status === 'entregado') orders = orders.slice(0, 15);
    return `
      <section class="admin-kanban-col status-${status}" data-status="${status}">
        <h3>${STATUS_LABELS[status]} <span>${orders.length}</span></h3>
        <div class="admin-kanban-cards">${orders.map(orderCard).join('') || '<p class="admin-kanban-empty">Sin pedidos</p>'}</div>
      </section>
    `;
  }).join('');
}

let draggingOrderId = null;

document.getElementById('kanban').addEventListener('dragstart', (e) => {
  const card = e.target.closest('.admin-card');
  if (!card) return;
  draggingOrderId = card.dataset.id;
  card.classList.add('is-dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggingOrderId);
});

document.getElementById('kanban').addEventListener('dragend', (e) => {
  e.target.closest('.admin-card')?.classList.remove('is-dragging');
  document.querySelectorAll('.admin-kanban-col').forEach((c) => c.classList.remove('is-over'));
});

document.getElementById('kanban').addEventListener('dragover', (e) => {
  const col = e.target.closest('.admin-kanban-col');
  if (!col || !draggingOrderId) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.admin-kanban-col').forEach((c) => c.classList.toggle('is-over', c === col));
});

document.getElementById('kanban').addEventListener('drop', async (e) => {
  const col = e.target.closest('.admin-kanban-col');
  if (!col || !draggingOrderId) return;
  e.preventDefault();
  const id = draggingOrderId;
  draggingOrderId = null;
  const status = col.dataset.status;
  const order = ordersCache.find((o) => o.id === id);
  if (!order || order.status === status) {
    renderKanban();
    return;
  }
  const res = await fetch(`/api/admin/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (res.ok) {
    const updated = await res.json();
    const idx = ordersCache.findIndex((o) => o.id === id);
    if (idx >= 0) ordersCache[idx] = updated;
  }
  renderKanban();
});

document.getElementById('kanban').addEventListener('click', (e) => {
  const card = e.target.closest('.admin-card');
  if (card) openOrderDetail(card.dataset.id);
});

// --- Clientes ---

async function loadCustomers() {
  const res = await fetch('/api/admin/customers');
  if (res.status === 401) {
    showLogin();
    return;
  }
  const customers = await res.json();
  customersCache = customers;
  const body = document.getElementById('customersTableBody');
  if (customers.length === 0) {
    body.innerHTML = '<tr><td colspan="7">Todavía no hay clientes. Se agregan solos con cada pedido, o captúralos con "Nuevo cliente".</td></tr>';
    return;
  }
  body.innerHTML = customers.map((c) => `
    <tr data-key="${esc(c.key)}" data-id="${esc(c.id || '')}" data-search="${esc(c.phone || c.email || c.name)}">
      <td><strong class="admin-clickable" data-action="customer-profile">${esc(c.name) || 'Sin nombre'}</strong>${c.company ? `<br><span class="admin-muted admin-small">${esc(c.company)}</span>` : ''}${c.manual && !c.orders ? '<br><span class="admin-muted admin-small">Capturado a mano · sin pedidos aún</span>' : ''}</td>
      <td>${[c.phone, c.email].filter(Boolean).map(esc).join('<br>') || '—'}${c.notes ? `<br><span class="admin-muted admin-small" title="${esc(c.notes)}">${esc(c.notes).slice(0, 60)}${c.notes.length > 60 ? '…' : ''}</span>` : ''}</td>
      <td>${c.orders}</td>
      <td>${c.pieces}</td>
      <td>${formatPrice(c.totalCents)}</td>
      <td>${c.lastAt ? new Date(c.lastAt).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—'}</td>
      <td class="admin-table-actions">
        ${whatsappDigits(c.phone) ? `<a class="admin-icon-btn" href="https://wa.me/${whatsappDigits(c.phone)}" target="_blank" rel="noopener" title="WhatsApp">${icon('whatsapp')}</a>` : ''}
        <button type="button" class="admin-icon-btn" data-action="customer-profile" title="Ver ficha del cliente">${icon('eye')}</button>
        ${iconBtn('customer-edit', 'edit', c.manual ? 'Editar' : 'Completar datos')}
        ${c.manual ? iconBtn('customer-delete', 'trash', 'Eliminar') : ''}
      </td>
    </tr>
  `).join('');
}

let customersCache = [];
const customerOverlay = document.getElementById('customerOverlay');
function openCustomerForm(c) {
  document.getElementById('customerError').textContent = '';
  document.getElementById('customerForm').reset();
  document.getElementById('customerFormTitle').textContent = c?.manual ? 'Editar cliente' : c ? 'Completar datos del cliente' : 'Nuevo cliente';
  document.getElementById('customerId').value = c?.manual ? c.id : '';
  document.getElementById('customerName').value = c?.name || '';
  document.getElementById('customerPhone').value = c?.phone || '';
  document.getElementById('customerEmail').value = c?.email || '';
  document.getElementById('customerCompany').value = c?.company || '';
  document.getElementById('customerNotes').value = c?.notes || '';
  customerOverlay.hidden = false;
}
document.getElementById('newCustomerBtn').addEventListener('click', () => openCustomerForm(null));
document.getElementById('cancelCustomerBtn').addEventListener('click', () => { customerOverlay.hidden = true; });
document.getElementById('customerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('customerId').value;
  const body = {
    name: document.getElementById('customerName').value,
    phone: document.getElementById('customerPhone').value,
    email: document.getElementById('customerEmail').value,
    company: document.getElementById('customerCompany').value,
    notes: document.getElementById('customerNotes').value,
  };
  const res = await fetch(id ? `/api/admin/customers/${id}` : '/api/admin/customers', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) { document.getElementById('customerError').textContent = data.error || 'No se pudo guardar.'; return; }
  customerOverlay.hidden = true;
  loadCustomers();
});

document.getElementById('customersTableBody').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const tr = btn.closest('tr');
  const c = customersCache.find((x) => x.key === tr.dataset.key);
  if (btn.dataset.action === 'customer-orders') {
    ordersSearch = tr.dataset.search || '';
    document.getElementById('ordersSearch').value = ordersSearch;
    showTab('pedidos');
  }
  if (btn.dataset.action === 'customer-profile' && window.openCustomerProfile) window.openCustomerProfile(c);
  if (btn.dataset.action === 'customer-edit') openCustomerForm(c);
  if (btn.dataset.action === 'customer-delete') {
    if (!confirm(`¿Eliminar a ${c.name}? Sus pedidos no se borran.`)) return;
    const res = await fetch(`/api/admin/customers/${c.id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json().catch(() => ({})); notifyForbidden(d.error || 'No se pudo eliminar.'); }
    loadCustomers();
  }
});

// --- Respaldo ---

document.getElementById('restoreBtn').addEventListener('click', async () => {
  const errorEl = document.getElementById('restoreError');
  const okEl = document.getElementById('restoreSuccess');
  errorEl.textContent = '';
  okEl.textContent = '';
  const file = document.getElementById('restoreFile').files[0];
  if (!file) {
    errorEl.textContent = 'Elige primero el archivo de respaldo.';
    return;
  }
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    errorEl.textContent = 'El archivo no se pudo leer.';
    return;
  }
  const when = data.exportedAt ? new Date(data.exportedAt).toLocaleString('es-MX') : 'fecha desconocida';
  if (!confirm(`Se reemplazarán TODOS los productos, pedidos y ajustes actuales por los del respaldo del ${when}. ¿Continuar?`)) return;
  const res = await fetch('/api/admin/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) {
    errorEl.textContent = result.error || 'No se pudo restaurar.';
    return;
  }
  okEl.textContent = `Restaurado: ${result.products} productos y ${result.orders} pedidos.`;
  loadSettingsCache().then(loadProducts).then(loadOrders);
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
      <td>${m.warehouse || '—'}</td>
      <td>${m.costCents ? `${formatPrice(m.costCents)} c/u` : '—'}</td>
    </tr>
  `).join('');
  const suppliers = [...new Set(log.map((m) => m.supplier).filter(Boolean))];
  document.getElementById('suppliersList').innerHTML = suppliers.map((s) => `<option value="${s}"></option>`).join('');
}

// --- Entradas de mercancía ---

function renderEntrySizes() {
  const product = productsCache.find((p) => p.id === document.getElementById('entryProduct').value);
  const grid = document.getElementById('entrySizes');
  grid.innerHTML = product ? product.sizes.map((s) => `
    <label class="admin-stock-size admin-entry-size" data-size="${variantLabel(s)}">
      <span class="admin-stock-size-name">${variantLabel(s)}</span>
      <input type="number" min="0" step="1" placeholder="0" inputmode="numeric">
      <span class="admin-muted admin-small">hay ${s.stock}</span>
    </label>
  `).join('') : '';
  document.getElementById('entryCost').value = product?.costCents ? (product.costCents / 100).toFixed(2) : '';
  updateEntryTotal();
}

function updateEntryTotal() {
  let total = 0;
  document.querySelectorAll('#entrySizes input').forEach((i) => { total += parseInt(i.value, 10) || 0; });
  document.getElementById('entryTotal').textContent = `${total} piezas`;
}

document.getElementById('newEntryBtn').addEventListener('click', () => {
  document.getElementById('entryError').textContent = '';
  document.getElementById('entryForm').reset();
  document.getElementById('entryUpdateCost').checked = true;
  document.getElementById('entryProduct').innerHTML = productsCache.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  const names = warehouseList();
  document.getElementById('entryWarehouseWrap').hidden = names.length < 2;
  document.getElementById('entryWarehouse').innerHTML = names.map((n) => `<option value="${n}">${n}</option>`).join('');
  renderEntrySizes();
  document.getElementById('entryOverlay').hidden = false;
});
document.getElementById('entryProduct').addEventListener('change', renderEntrySizes);
document.getElementById('entrySizes').addEventListener('input', updateEntryTotal);
document.getElementById('cancelEntryBtn').addEventListener('click', () => { document.getElementById('entryOverlay').hidden = true; });

document.getElementById('entryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('entryError');
  errorEl.textContent = '';
  const sizes = Array.from(document.querySelectorAll('#entrySizes .admin-entry-size')).map((el) => ({
    size: el.dataset.size,
    qty: parseInt(el.querySelector('input').value, 10) || 0,
  })).filter((s) => s.qty > 0);
  if (sizes.length === 0) {
    errorEl.textContent = 'Captura cuántas piezas llegaron de al menos una talla.';
    return;
  }
  const res = await fetch('/api/admin/inventory/entry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: document.getElementById('entryProduct').value,
      supplier: document.getElementById('entrySupplier').value,
      costMxn: document.getElementById('entryCost').value,
      updateCost: document.getElementById('entryUpdateCost').checked,
      warehouse: document.getElementById('entryWarehouse').value,
      note: document.getElementById('entryNote').value,
      sizes,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    errorEl.textContent = data.error || 'No se pudo guardar la entrada.';
    return;
  }
  document.getElementById('entryOverlay').hidden = true;
  await loadProducts();
  loadInventory();
});

// --- Reportes ---

function reportRange() {
  const value = document.getElementById('reportPeriod').value;
  const now = new Date();
  if (value === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (value === 'year') return new Date(now.getFullYear(), 0, 1);
  if (value === 'all') return null;
  return new Date(now.getTime() - parseInt(value, 10) * 24 * 60 * 60 * 1000);
}

function renderReports() {
  // Reemplazada por admin-reportes.js (se conserva por compatibilidad).
  if (window.__reportsV2) return;
  const from = reportRange();
  const orders = ordersCache.filter((o) => o.status !== 'cancelado' && (!from || new Date(o.createdAt) >= from));
  const sales = orders.reduce((sum, o) => sum + o.totalCents, 0);
  const cost = orders.reduce((sum, o) => sum + orderCost(o), 0);
  const pieces = orders.reduce((sum, o) => sum + orderPieces(o), 0);
  document.getElementById('repSales').textContent = formatPrice(sales);
  document.getElementById('repCost').textContent = formatPrice(cost);
  document.getElementById('repProfit').textContent = formatPrice(sales - cost);
  document.getElementById('repMargin').textContent = marginText(sales, sales - cost);
  document.getElementById('repPieces').textContent = pieces;

  const byProduct = {};
  const bySize = {};
  orders.forEach((o) => {
    o.items.forEach((i) => {
      const key = i.id || i.name;
      byProduct[key] = byProduct[key] || { name: i.name, id: i.id, pieces: 0, sales: 0, cost: 0 };
      byProduct[key].pieces += i.quantity;
      byProduct[key].sales += i.priceCents * i.quantity;
      byProduct[key].cost += itemCost(i) * i.quantity;
      if (i.size) {
        const sk = `${key}|${i.size}`;
        bySize[sk] = bySize[sk] || { name: i.name, id: i.id, size: i.size, pieces: 0 };
        bySize[sk].pieces += i.quantity;
      }
    });
  });
  const products = Object.values(byProduct).sort((a, b) => b.pieces - a.pieces);
  document.getElementById('repProductsBody').innerHTML = products.length
    ? products.map((p) => {
      const product = productsCache.find((x) => x.id === p.id);
      const stock = product ? totalStock(product) : '—';
      return `<tr><td>${p.name}</td><td>${p.pieces}</td><td>${formatPrice(p.sales)}</td><td class="admin-profit">${formatPrice(p.sales - p.cost)}</td><td>${stock}</td></tr>`;
    }).join('')
    : '<tr><td colspan="5">Sin ventas en el periodo.</td></tr>';
  const sizes = Object.values(bySize).sort((a, b) => b.pieces - a.pieces).slice(0, 15);
  document.getElementById('repSizesBody').innerHTML = sizes.length
    ? sizes.map((s) => {
      const product = productsCache.find((x) => x.id === s.id);
      const left = product?.sizes.find((z) => z.size === s.size)?.stock;
      const low = Number.isFinite(left) && left <= lowStockLimit();
      return `<tr><td>${s.name}</td><td>${s.size}</td><td>${s.pieces}</td><td class="${low ? 'admin-stock-low' : ''}">${Number.isFinite(left) ? left : '—'}</td></tr>`;
    }).join('')
    : '<tr><td colspan="4">Sin ventas en el periodo.</td></tr>';
}



// --- Aviso de pedidos nuevos (campana) ---

let lastSeenAt = null;
const newOrdersQueue = [];

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.frequency.setValueAtTime(1175, ctx.currentTime + 0.12);
    o.stop(ctx.currentTime + 0.28);
  } catch {
    // Sin sonido si el navegador no lo permite.
  }
}

function renderBell() {
  const count = document.getElementById('bellCount');
  const menu = document.getElementById('bellMenu');
  const extras = window.bellExtras || { leadsNew: 0, reviewsPending: 0 };
  const total = newOrdersQueue.length + (extras.leadsNew || 0) + (extras.reviewsPending || 0);
  count.textContent = total;
  count.hidden = total === 0;
  const extrasHtml = `${extras.leadsNew ? `<button type="button" class="admin-bell-item admin-bell-item--lead" data-goto="cotizaciones"><span class="admin-bell-title"><strong>${extras.leadsNew}</strong> cotización${extras.leadsNew === 1 ? '' : 'es'} sin responder</span><span>Ventas → Cotizaciones</span></button>` : ''}${extras.reviewsPending ? `<button type="button" class="admin-bell-item admin-bell-item--review" data-goto="resenas"><span class="admin-bell-title"><strong>${extras.reviewsPending}</strong> reseña${extras.reviewsPending === 1 ? '' : 's'} por aprobar</span><span>Ventas → Reseñas</span></button>` : ''}`;
  if (!newOrdersQueue.length && extrasHtml) { menu.innerHTML = extrasHtml; return; }
  menu.innerHTML = (newOrdersQueue.length ? extrasHtml : '') + (newOrdersQueue.length
    ? newOrdersQueue.map((o) => `
      <button type="button" class="admin-bell-item" data-order="${o.id}">
        <span class="admin-bell-title"><strong>${esc(o.customerName) || 'Sin nombre'}</strong> · ${formatPrice(o.totalCents)}</span>
        <span>${o.source === 'stripe' ? 'Pago con tarjeta' : o.source === 'openpay' ? 'Openpay' : 'WhatsApp'} · ${new Date(o.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
      </button>`).join('') + '<button type="button" class="admin-bell-clear" data-action="clear-bell">Marcar como vistos</button>'
    : '<p class="admin-bell-empty">Sin pedidos nuevos.</p>');
}

async function pollNewOrders() {
  if (adminScreen.hidden) return;
  try {
    const res = await fetch(`/api/admin/orders-summary${lastSeenAt ? `?since=${encodeURIComponent(lastSeenAt)}` : ''}`);
    if (!res.ok) return;
    const data = await res.json();
    const prevLeads = (window.bellExtras || {}).leadsNew || 0;
    window.bellExtras = { leadsNew: data.leadsNew || 0, reviewsPending: data.reviewsPending || 0 };
    if (lastSeenAt && data.newLeads?.length && data.leadsNew > prevLeads) { beep(); if (document.querySelector('.admin-tab.active')?.dataset.tab === 'cotizaciones') loadLeads(); }
    if (!(lastSeenAt && data.newOrders.length)) renderBell();
    if (lastSeenAt && data.newOrders.length) {
      data.newOrders.forEach((o) => { if (!newOrdersQueue.some((q) => q.id === o.id)) newOrdersQueue.unshift(o); });
      renderBell();
      beep();
      document.title = `(${newOrdersQueue.length}) Panel admin | Works Jeans`;
      await loadOrders();
      const activeTab = document.querySelector('.admin-tab.active')?.dataset.tab;
      if (activeTab === 'dashboard') renderDashboard();
      if (activeTab === 'tablero') renderKanban();
      loadProducts();
    }
    if (data.latestAt) lastSeenAt = data.latestAt;
    else if (!lastSeenAt) lastSeenAt = new Date().toISOString();
  } catch {
    // Reintenta en el siguiente ciclo.
  }
}

document.getElementById('bellBtn').addEventListener('click', () => {
  const menu = document.getElementById('bellMenu');
  menu.hidden = !menu.hidden;
});
document.getElementById('bellMenu').addEventListener('click', (e) => {
  if (e.target.closest('[data-goto]')) { document.getElementById('bellMenu').hidden = true; return; }
  const item = e.target.closest('[data-order]');
  if (item) {
    document.getElementById('bellMenu').hidden = true;
    openOrderDetail(item.dataset.order);
    return;
  }
  if (e.target.closest('[data-action="clear-bell"]')) {
    newOrdersQueue.length = 0;
    renderBell();
    document.title = 'Panel admin | Works Jeans';
    document.getElementById('bellMenu').hidden = true;
  }
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#bellBtn') && !e.target.closest('#bellMenu')) document.getElementById('bellMenu').hidden = true;
});
setInterval(pollNewOrders, 30000);
renderBell();

// --- Manual WhatsApp order form ---

function addOrderItemRow() {
  const row = document.createElement('div');
  row.className = 'admin-order-item-row';
  row.innerHTML = `
    <select class="order-item-product">
      ${productsCache.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}
    </select>
    <select class="order-item-size"></select>
    <input type="number" class="order-item-qty" value="1" min="1" max="50" aria-label="Cantidad">
    <span class="order-item-price" aria-label="Importe">—</span>
    ${iconBtn('remove-item', 'close', 'Quitar producto')}
  `;
  orderItemsContainer.appendChild(row);

  const productSelect = row.querySelector('.order-item-product');
  const sizeSelect = row.querySelector('.order-item-size');

  function fillSizes() {
    const product = productsCache.find((p) => p.id === productSelect.value);
    sizeSelect.innerHTML = product
      ? product.sizes.map((s) => `<option value="${variantLabel(s)}" ${s.stock <= 0 ? 'disabled' : ''}>${variantLabel(s)} (${s.stock} disp.)</option>`).join('')
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
    const sizeLabel = row.querySelector('.order-item-size').value;
    const variant = product ? product.sizes.find((v) => variantLabel(v) === sizeLabel) : null;
    const unit = product ? (variant?.priceCents || product.priceCents) : 0;
    const line = unit * qty;
    const priceEl = row.querySelector('.order-item-price');
    if (priceEl) priceEl.textContent = product ? `${formatPrice(unit)} × ${qty} = ${formatPrice(line)}` : '—';
    total += line;
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
      customerEmail: document.getElementById('orderCustomerEmail').value,
      notes: document.getElementById('orderNotes').value,
      code: document.getElementById('orderCode').value.trim(),
      discountMxn: document.getElementById('orderDiscount').value,
      paymentMethod: document.getElementById('orderPayMethod').value,
      shipping: { line1: document.getElementById('osLine1').value, line2: document.getElementById('osLine2').value, postalCode: document.getElementById('osZip').value, city: document.getElementById('osCity').value, state: document.getElementById('osState').value, references: document.getElementById('osRefs').value },
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
  const valid = ordersCache.filter((o) => !['cancelado', 'devuelto'].includes(o.status));
  const totalSales = valid.reduce((sum, o) => sum + o.totalCents, 0);

  const now = new Date();
  const monthSales = valid
    .filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, o) => sum + o.totalCents, 0);

  const pending = ordersCache.filter((o) => ['pendiente', 'pagado', 'preparacion', 'enviado'].includes(o.status)).length;

  const monthOrders = valid.filter((o) => {
    const d = new Date(o.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthProfit = monthOrders.reduce((sum, o) => sum + o.totalCents - orderCost(o), 0);
  document.getElementById('statMonthProfit').textContent = formatPrice(monthProfit);
  document.getElementById('statMonthMargin').textContent = productsCache.some((p) => p.costCents)
    ? marginText(monthSales, monthProfit)
    : 'Captura el costo de tus productos para ver la utilidad';
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

  const active = [...ordersCache]
    .filter((o) => ['pendiente', 'pagado', 'preparacion', 'enviado'].includes(o.status))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);
  document.getElementById('activeOrdersBody').innerHTML = active.length
    ? active.map((o) => `
      <tr class="admin-clickable-row" data-order="${o.id}">
        <td>${new Date(o.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
        <td>${esc(o.customerName) || '—'}${o.customerPhone ? `<br><span class="admin-muted">${esc(o.customerPhone)}</span>` : ''}</td>
        <td class="admin-order-items-cell">${esc(o.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity}`).join(', '))}</td>
        <td>${formatPrice(o.totalCents)}</td>
        <td><span class="admin-badge status-${o.status}">${STATUS_LABELS[o.status]}</span></td>
      </tr>`).join('')
    : '<tr><td colspan="5" class="admin-muted">No hay pedidos activos. Todo entregado.</td></tr>';

  // Ventas por mes: últimos 6 meses, incluyendo los que no tuvieron ventas.
  const byMonth = {};
  valid.forEach((o) => {
    const key = monthKey(o.createdAt);
    byMonth[key] = byMonth[key] || { orders: 0, pieces: 0, cents: 0, cost: 0 };
    byMonth[key].orders += 1;
    byMonth[key].pieces += orderPieces(o);
    byMonth[key].cents += o.totalCents;
    byMonth[key].cost += orderCost(o);
  });
  const monthKeys = [];
  for (let i = 0; i < 6; i += 1) {
    monthKeys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  const monthlyHtml = monthKeys.map((key) => {
    const m = byMonth[key] || { orders: 0, pieces: 0, cents: 0, cost: 0 };
    return `<tr class="${m.orders ? '' : 'admin-muted'}"><td>${monthLabel(key)}</td><td>${m.orders}</td><td>${m.pieces}</td><td>${formatPrice(m.cents)}</td><td>${formatPrice(m.cost)}</td><td class="admin-profit">${formatPrice(m.cents - m.cost)}</td></tr>`;
  }).join('');
  document.getElementById('monthlySalesBody').innerHTML = monthlyHtml;
  const monthlyReport = document.getElementById('monthlySalesBodyReport');
  if (monthlyReport) monthlyReport.innerHTML = monthlyHtml;

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

document.getElementById('activeOrdersBody').addEventListener('click', (e) => {
  const row = e.target.closest('[data-order]');
  if (row) openOrderDetail(row.dataset.order);
});

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
  document.getElementById('settingGa4').value = settings.ga4Id || '';
  document.getElementById('settingCustomerEmails').checked = settings.customerEmails !== false;
  document.getElementById('settingPaymentReminders').checked = settings.paymentReminders !== false;
  document.getElementById('settingDailySummary').checked = settings.dailySummary !== false;
  const ship = settings.shipping || {};
  document.getElementById('settingFreeFrom').value = ship.freeFromCents ? (ship.freeFromCents / 100).toFixed(0) : '';
  document.getElementById('settingQuoteFromQty').value = ship.quoteFromQty || '';
  document.getElementById('settingShipSummary').value = ship.summary || '';
  const zones = document.getElementById('shipZones');
  zones.innerHTML = '';
  (ship.zones || []).forEach(addZoneRow);
  if (!zones.children.length) addZoneRow();
}

function addZoneRow(z = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="zone-name" value="${esc(z.name || '')}" placeholder="Nuevo León"></td>
    <td><input type="text" class="zone-from" value="${esc(z.cpFrom || '')}" maxlength="5" inputmode="numeric" placeholder="64000"></td>
    <td><input type="text" class="zone-to" value="${esc(z.cpTo || '')}" maxlength="5" inputmode="numeric" placeholder="67999"></td>
    <td><input type="number" class="zone-cost" value="${Number.isFinite(z.costCents) && z.costCents !== null ? (z.costCents / 100).toFixed(0) : ''}" min="0" step="1" placeholder="pendiente"></td>
    <td><input type="text" class="zone-days" value="${esc(z.days || '')}" placeholder="2 a 4 días hábiles"></td>
    <td class="admin-table-actions">${iconBtn('remove-zone', 'close', 'Quitar')}</td>`;
  document.getElementById('shipZones').appendChild(tr);
}
document.getElementById('addZoneBtn').addEventListener('click', () => addZoneRow());
document.getElementById('shipZones').addEventListener('click', (e) => {
  if (e.target.closest('[data-action="remove-zone"]')) e.target.closest('tr').remove();
});

function collectShipping() {
  const zones = [...document.querySelectorAll('#shipZones tr')].map((tr, i) => {
    const cost = tr.querySelector('.zone-cost').value;
    return {
      id: `z${i + 1}`,
      name: tr.querySelector('.zone-name').value.trim().slice(0, 60),
      cpFrom: tr.querySelector('.zone-from').value.replace(/\D/g, '').slice(0, 5),
      cpTo: tr.querySelector('.zone-to').value.replace(/\D/g, '').slice(0, 5),
      costCents: cost === '' ? null : Math.round(parseFloat(cost) * 100),
      days: tr.querySelector('.zone-days').value.trim().slice(0, 60),
    };
  }).filter((z) => z.name && z.cpFrom && z.cpTo);
  const free = parseFloat(document.getElementById('settingFreeFrom').value);
  return {
    summary: document.getElementById('settingShipSummary').value.trim().slice(0, 400),
    freeFromCents: Number.isFinite(free) && free > 0 ? Math.round(free * 100) : 0,
    quoteFromQty: Math.max(0, parseInt(document.getElementById('settingQuoteFromQty').value, 10) || 0),
    zones,
  };
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
    shipping: collectShipping(),
    ga4Id: document.getElementById('settingGa4').value.trim().toUpperCase(),
    customerEmails: document.getElementById('settingCustomerEmails').checked,
    paymentReminders: document.getElementById('settingPaymentReminders').checked,
    dailySummary: document.getElementById('settingDailySummary').checked,
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

// El cambio de contraseña vive en admin-seguridad.js (Mi cuenta).

checkSession();
