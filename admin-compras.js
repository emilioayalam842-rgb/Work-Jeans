// Panel admin · Compras y devoluciones: proveedores, órdenes de compra, recepciones, pagos,
// devoluciones y cambios con estadísticas. Usa las funciones globales de admin.js.

(function () {
  const PO_LABELS = { borrador: 'Borrador', enviada: 'Enviada', parcial: 'Recibida parcial', recibida: 'Recibida', cancelada: 'Cancelada' };
  const REASON_LABELS = { 'quedo-grande': 'Le quedó grande', 'quedo-chico': 'Le quedó chico', defecto: 'Defecto', 'cambio-modelo': 'Cambio de modelo', 'cambio-color': 'Cambio de color', otro: 'Otro' };
  let suppliers = [];
  let purchases = [];
  let returnsList = [];
  let activePo = null;

  const fmtDate = (iso) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—');

  // ---------- Proveedores ----------
  async function fetchSuppliers() {
    const res = await fetch('/api/admin/suppliers');
    if (res.status === 401) { showLogin(); return false; }
    suppliers = await res.json();
    return true;
  }

  window.loadSuppliers = async function loadSuppliers() {
    if (!(await fetchSuppliers())) return;
    const pos = purchases.length ? purchases : [];
    document.getElementById('suppliersTableBody').innerHTML = suppliers.length ? suppliers.map((s) => {
      const mine = pos.filter((p) => p.supplierId === s.id);
      const due = mine.reduce((sum, p) => sum + (p.totals?.dueCents || 0), 0);
      return `
      <tr data-id="${esc(s.id)}">
        <td><strong>${esc(s.name)}</strong>${s.products ? `<br><span class="admin-muted admin-small">${esc(s.products)}</span>` : ''}</td>
        <td>${[s.contact, s.phone, s.email].filter(Boolean).join('<br>') || '—'}</td>
        <td>${mine.length}</td>
        <td class="${due ? 'admin-stock-low' : ''}">${formatPrice(due)}</td>
        <td class="admin-table-actions">
          ${whatsappDigits(s.phone) ? `<a class="admin-icon-btn" href="https://wa.me/${whatsappDigits(s.phone)}" target="_blank" rel="noopener" title="WhatsApp">${icon('whatsapp')}</a>` : ''}
          ${iconBtn('edit-supplier', 'edit', 'Editar')}
          ${iconBtn('delete-supplier', 'trash', 'Eliminar')}
        </td>
      </tr>`;
    }).join('') : '<tr><td colspan="5">Todavía no hay proveedores. Agrega el primero.</td></tr>';
  };

  const supplierOverlay = document.getElementById('supplierOverlay');
  function openSupplierForm(s) {
    document.getElementById('supplierError').textContent = '';
    document.getElementById('supplierForm').reset();
    document.getElementById('supplierId').value = s?.id || '';
    document.getElementById('supplierFormTitle').textContent = s ? 'Editar proveedor' : 'Nuevo proveedor';
    ['name', 'contact', 'phone', 'email', 'products', 'notes'].forEach((k) => { document.getElementById(`supplier${k.charAt(0).toUpperCase()}${k.slice(1)}`).value = s?.[k] || ''; });
    supplierOverlay.hidden = false;
  }
  document.getElementById('newSupplierBtn').addEventListener('click', () => openSupplierForm(null));
  document.getElementById('cancelSupplierBtn').addEventListener('click', () => { supplierOverlay.hidden = true; });
  document.getElementById('supplierForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('supplierId').value;
    const body = {};
    ['name', 'contact', 'phone', 'email', 'products', 'notes'].forEach((k) => { body[k] = document.getElementById(`supplier${k.charAt(0).toUpperCase()}${k.slice(1)}`).value; });
    const res = await fetch(id ? `/api/admin/suppliers/${id}` : '/api/admin/suppliers', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { document.getElementById('supplierError').textContent = data.error || 'No se pudo guardar.'; return; }
    supplierOverlay.hidden = true;
    loadSuppliers();
  });
  document.getElementById('suppliersTableBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;
    if (btn.dataset.action === 'edit-supplier') openSupplierForm(suppliers.find((s) => s.id === id));
    if (btn.dataset.action === 'delete-supplier') {
      if (!confirm('¿Eliminar este proveedor? Sus órdenes de compra se conservan.')) return;
      await fetch(`/api/admin/suppliers/${id}`, { method: 'DELETE' });
      loadSuppliers();
    }
  });

  // ---------- Órdenes de compra ----------
  async function fetchPurchases() {
    const res = await fetch('/api/admin/purchases');
    if (res.status === 401) { showLogin(); return false; }
    purchases = await res.json();
    return true;
  }

  window.loadPurchases = async function loadPurchases() {
    if (!(await fetchPurchases())) return;
    await fetchSuppliers();
    renderPurchases();
  };

  function renderPurchases() {
    const status = document.getElementById('poStatusFilter').value;
    const rows = purchases.filter((p) => !status || (status === 'abiertas' ? ['enviada', 'parcial', 'borrador'].includes(p.status) : p.status === status));
    const due = purchases.filter((p) => p.status !== 'cancelada').reduce((s, p) => s + p.totals.dueCents, 0);
    const pending = purchases.filter((p) => ['enviada', 'parcial'].includes(p.status)).reduce((s, p) => s + (p.totals.ordered - p.totals.received), 0);
    document.getElementById('poDue').textContent = formatPrice(due);
    document.getElementById('poPending').textContent = pending;
    document.getElementById('poOpen').textContent = purchases.filter((p) => ['enviada', 'parcial'].includes(p.status)).length;
    document.getElementById('purchasesTableBody').innerHTML = rows.length ? rows.map((p) => `
      <tr data-id="${esc(p.id)}" class="admin-clickable-row">
        <td><strong>${esc(p.id)}</strong><br><span class="admin-muted admin-small">${fmtDate(p.createdAt)}</span></td>
        <td>${p.supplierName}</td>
        <td class="admin-order-items-cell">${p.items.map((i) => `${esc(i.productName)}${i.size ? ` (${esc(i.size)})` : ''} ×${i.qty}`).join('<br>')}</td>
        <td>${p.totals.received} / ${p.totals.ordered}</td>
        <td>${formatPrice(p.totals.totalCents)}<br><span class="admin-muted admin-small">${p.totals.dueCents ? `Debe ${formatPrice(p.totals.dueCents)}` : 'Pagada'}</span></td>
        <td>${p.eta ? fmtDate(p.eta) : '—'}</td>
        <td><span class="admin-badge po-${p.status}">${PO_LABELS[p.status]}</span></td>
      </tr>`).join('') : '<tr><td colspan="7">Sin órdenes de compra.</td></tr>';
  }
  document.getElementById('poStatusFilter').addEventListener('change', renderPurchases);

  // Nueva orden
  const poOverlay = document.getElementById('poOverlay');
  function addPoLine(line = {}) {
    const row = document.createElement('div');
    row.className = 'admin-po-line';
    row.innerHTML = `
      <select class="po-product admin-filter">${productsCache.map((p) => `<option value="${esc(p.id)}" ${line.productId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
      <select class="po-variant admin-filter"></select>
      <input type="number" class="po-qty" min="1" step="1" placeholder="Cant." value="${line.qty || ''}">
      <input type="number" class="po-cost" min="0" step="0.01" placeholder="Costo c/u" value="${line.costMxn || ''}">
      ${iconBtn('remove-po-line', 'close', 'Quitar')}`;
    const fill = () => {
      const product = productsCache.find((p) => p.id === row.querySelector('.po-product').value);
      const sel = row.querySelector('.po-variant');
      sel.innerHTML = product ? product.sizes.map((s) => `<option value="${esc(variantLabel(s))}">${esc(variantLabel(s))}</option>`).join('') : '';
      if (product && !row.querySelector('.po-cost').value && product.costCents) row.querySelector('.po-cost').value = (product.costCents / 100).toFixed(2);
    };
    row.querySelector('.po-product').addEventListener('change', fill);
    row.querySelector('[data-action="remove-po-line"]').addEventListener('click', () => { row.remove(); updatePoTotal(); });
    row.addEventListener('input', updatePoTotal);
    document.getElementById('poLines').appendChild(row);
    fill();
    updatePoTotal();
  }
  function updatePoTotal() {
    let total = 0;
    let pieces = 0;
    document.querySelectorAll('.admin-po-line').forEach((r) => {
      const q = parseInt(r.querySelector('.po-qty').value, 10) || 0;
      const c = parseFloat(r.querySelector('.po-cost').value) || 0;
      pieces += q;
      total += q * c * 100;
    });
    document.getElementById('poTotal').textContent = `${pieces} piezas · ${formatPrice(total)}`;
  }
  document.getElementById('newPoBtn').addEventListener('click', async () => {
    await fetchSuppliers();
    document.getElementById('poError').textContent = '';
    document.getElementById('poForm').reset();
    document.getElementById('poSupplier').innerHTML = '<option value="">Sin proveedor registrado</option>' + suppliers.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
    document.getElementById('poLines').innerHTML = '';
    addPoLine();
    poOverlay.hidden = false;
  });
  document.getElementById('addPoLineBtn').addEventListener('click', () => addPoLine());
  document.getElementById('cancelPoBtn').addEventListener('click', () => { poOverlay.hidden = true; });
  document.getElementById('poForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const items = Array.from(document.querySelectorAll('.admin-po-line')).map((r) => ({
      productId: r.querySelector('.po-product').value,
      size: r.querySelector('.po-variant').value,
      qty: parseInt(r.querySelector('.po-qty').value, 10),
      costMxn: r.querySelector('.po-cost').value,
    }));
    const res = await fetch('/api/admin/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: document.getElementById('poSupplier').value,
        supplierName: document.getElementById('poSupplierName').value,
        eta: document.getElementById('poEta').value,
        invoice: document.getElementById('poInvoice').value,
        notes: document.getElementById('poNotes').value,
        status: document.getElementById('poDraft').checked ? 'borrador' : 'enviada',
        items,
      }),
    });
    const data = await res.json();
    if (!res.ok) { document.getElementById('poError').textContent = data.error || 'No se pudo crear la orden.'; return; }
    poOverlay.hidden = true;
    loadPurchases();
  });

  // Detalle: recibir, pagar, cambiar estado
  const poDetailOverlay = document.getElementById('poDetailOverlay');
  document.getElementById('purchasesTableBody').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    activePo = purchases.find((p) => p.id === tr.dataset.id);
    if (activePo) renderPoDetail();
  });
  function renderPoDetail() {
    const po = activePo;
    const names = warehouseList();
    document.getElementById('poDetailTitle').textContent = `${esc(po.id)} · ${po.supplierName}`;
    document.getElementById('poDetailMeta').innerHTML = `<span class="admin-badge po-${po.status}">${PO_LABELS[po.status]}</span> · Creada ${fmtDate(po.createdAt)}${po.eta ? ` · Llega ${fmtDate(po.eta)}` : ''}${po.invoice ? ` · Factura ${po.invoice}` : ''}${po.notes ? `<br><span class="admin-muted">${esc(po.notes)}</span>` : ''}`;
    const canReceive = ['enviada', 'parcial', 'borrador'].includes(po.status);
    document.getElementById('poDetailItems').innerHTML = `
      <table class="admin-table admin-detail-table">
        <thead><tr><th>Producto</th><th>Variante</th><th>Pedidas</th><th>Recibidas</th><th>Costo</th>${canReceive ? '<th>Recibir ahora</th>' : ''}</tr></thead>
        <tbody>${po.items.map((i, idx) => `<tr>
          <td>${esc(i.productName)}</td><td>${esc(i.size || '—')}</td><td>${i.qty}</td><td>${i.received || 0}</td><td>${formatPrice(i.costCents)}</td>
          ${canReceive ? `<td><input type="number" class="po-receive-qty" data-index="${idx}" min="0" max="${i.qty - (i.received || 0)}" value="${i.qty - (i.received || 0)}" style="width:80px"></td>` : ''}
        </tr>`).join('')}</tbody>
      </table>
      <p class="admin-order-total">Total ${formatPrice(po.totals.totalCents)} · Pagado ${formatPrice(po.totals.paidCents)} · <strong>${po.totals.dueCents ? `Pendiente ${formatPrice(po.totals.dueCents)}` : 'Liquidada'}</strong></p>
      ${(po.payments || []).length ? `<p class="admin-muted admin-small">Pagos: ${po.payments.map((p) => `${fmtDate(p.date)} ${formatPrice(p.amountCents)}${p.note ? ` (${esc(p.note)})` : ''}`).join(' · ')}</p>` : ''}`;
    document.getElementById('poReceiveWrap').hidden = !canReceive;
    document.getElementById('poReceiveWarehouse').innerHTML = names.map((n) => `<option value="${n}">${n}</option>`).join('');
    document.getElementById('poReceiveWarehouseWrap').hidden = names.length < 2;
    document.getElementById('poStatusSelect').value = po.status;
    document.getElementById('poPayAmount').value = '';
    document.getElementById('poPayNote').value = '';
    document.getElementById('poDetailError').textContent = '';
    poDetailOverlay.hidden = false;
  }
  document.getElementById('closePoDetailBtn').addEventListener('click', () => { poDetailOverlay.hidden = true; });
  document.getElementById('poReceiveBtn').addEventListener('click', async () => {
    const items = Array.from(document.querySelectorAll('.po-receive-qty')).map((i) => ({ index: parseInt(i.dataset.index, 10), qty: parseInt(i.value, 10) || 0 })).filter((i) => i.qty > 0);
    if (!items.length) { document.getElementById('poDetailError').textContent = 'Indica cuántas piezas llegaron.'; return; }
    const res = await fetch(`/api/admin/purchases/${esc(activePo.id)}/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, warehouse: document.getElementById('poReceiveWarehouse').value, updateCost: document.getElementById('poReceiveUpdateCost').checked }),
    });
    const data = await res.json();
    if (!res.ok) { document.getElementById('poDetailError').textContent = data.error || 'No se pudo recibir.'; return; }
    await loadProducts();
    await loadPurchases();
    activePo = purchases.find((p) => p.id === activePo.id);
    renderPoDetail();
  });
  document.getElementById('poPayBtn').addEventListener('click', async () => {
    const amount = document.getElementById('poPayAmount').value;
    if (!parseFloat(amount)) { document.getElementById('poDetailError').textContent = 'Escribe el monto del pago.'; return; }
    const res = await fetch(`/api/admin/purchases/${esc(activePo.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payment: { amountMxn: amount, note: document.getElementById('poPayNote').value } }) });
    if (res.ok) { await loadPurchases(); activePo = purchases.find((p) => p.id === activePo.id); renderPoDetail(); }
  });
  document.getElementById('poStatusSelect').addEventListener('change', async (e) => {
    const res = await fetch(`/api/admin/purchases/${esc(activePo.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: e.target.value }) });
    if (res.ok) { await loadPurchases(); activePo = purchases.find((p) => p.id === activePo.id); renderPoDetail(); }
  });

  // ---------- Devoluciones ----------
  window.loadReturns = async function loadReturns() {
    const [res, statsRes] = await Promise.all([fetch('/api/admin/returns'), fetch('/api/admin/returns/stats')]);
    if (res.status === 401) { showLogin(); return; }
    returnsList = await res.json();
    const stats = await statsRes.json();
    document.getElementById('retTotal').textContent = stats.total;
    const sold = Object.values(stats.bySize).reduce((s, r) => s + r.sold, 0);
    document.getElementById('retRate').textContent = sold ? `${Math.round((stats.total / sold) * 100)}%` : '—';
    const topReason = Object.entries(stats.byReason).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('retTopReason').textContent = topReason ? `${REASON_LABELS[topReason[0]]} (${topReason[1]})` : '—';
    document.getElementById('retInsights').innerHTML = stats.bySize.filter((s) => s.sold >= 3 && s.rate >= 0.1).slice(0, 5).map((s) => {
      const main = Object.entries(s.reasons).sort((a, b) => b[1] - a[1])[0];
      return `<div class="admin-alert"><strong>Revisar patronaje</strong>${esc(s.productName)} · ${esc(s.size)}<span>${Math.round(s.rate * 100)}% de devoluciones (${s.returned} de ${s.sold}), sobre todo "${REASON_LABELS[main[0]]}".</span></div>`;
    }).join('');
    document.getElementById('retBySizeBody').innerHTML = stats.bySize.length ? stats.bySize.slice(0, 20).map((s) => `<tr><td>${esc(s.productName)}</td><td>${esc(s.size || '—')}</td><td>${s.returned}</td><td>${s.sold}</td><td class="${s.rate >= 0.1 ? 'admin-stock-low' : ''}">${s.rate != null ? `${Math.round(s.rate * 100)}%` : '—'}</td><td>${Object.entries(s.reasons).map(([r, n]) => `${REASON_LABELS[r]} ${n}`).join(', ')}</td></tr>`).join('') : '<tr><td colspan="6">Sin devoluciones registradas.</td></tr>';
    document.getElementById('returnsTableBody').innerHTML = returnsList.length ? returnsList.map((r) => `<tr>
      <td><strong>${esc(r.id)}</strong><br><span class="admin-muted admin-small">${fmtDate(r.createdAt)}</span></td>
      <td>${esc(r.customerName) || '—'}<br><span class="admin-muted admin-small">${esc(r.orderId)}</span></td>
      <td>${r.type === 'cambio' ? 'Cambio' : 'Devolución'}</td>
      <td class="admin-order-items-cell">${r.items.map((i) => `${esc(i.productName)} (${esc(i.size || '—')}) ×${i.qty} · ${REASON_LABELS[i.reason]}`).join('<br>')}${r.exchangeItems?.length ? `<br><span class="admin-muted">Se entregó: ${r.exchangeItems.map((e) => `${esc(e.productName)} (${esc(e.size)}) ×${e.qty}`).join(', ')}</span>` : ''}</td>
      <td>${r.refundCents ? formatPrice(r.refundCents) : '—'}</td>
      <td>${r.restocked ? 'Sí' : 'No'}</td>
    </tr>`).join('') : '<tr><td colspan="6">Sin devoluciones registradas.</td></tr>';
  };

  const returnOverlay = document.getElementById('returnOverlay');
  function fillReturnOrder() {
    const order = ordersCache.find((o) => o.id === document.getElementById('returnOrder').value);
    document.getElementById('returnItems').innerHTML = order ? order.items.map((i, idx) => `
      <div class="admin-return-line" data-index="${idx}">
        <span>${esc(i.name)}${i.size ? ` · ${esc(i.size)}` : ''} <span class="admin-muted admin-small">(${i.quantity} compradas)</span></span>
        <input type="number" class="ret-qty" min="0" max="${i.quantity}" value="0" placeholder="0">
        <select class="ret-reason admin-filter">${Object.entries(REASON_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      </div>`).join('') : '';
  }
  function fillExchangeVariants() {
    const product = productsCache.find((p) => p.id === document.getElementById('exchangeProduct').value);
    document.getElementById('exchangeVariant').innerHTML = product ? product.sizes.map((s) => `<option value="${esc(variantLabel(s))}" ${s.stock <= 0 ? 'disabled' : ''}>${esc(variantLabel(s))} (${s.stock} disp.)</option>`).join('') : '';
  }
  document.getElementById('newReturnBtn').addEventListener('click', async () => {
    await loadOrders();
    document.getElementById('returnError').textContent = '';
    document.getElementById('returnForm').reset();
    const candidates = [...ordersCache].filter((o) => !['cancelado'].includes(o.status)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 200);
    document.getElementById('returnOrder').innerHTML = candidates.map((o) => `<option value="${esc(o.id)}">${new Date(o.createdAt).toLocaleDateString('es-MX')} · ${esc(o.customerName) || 'Sin nombre'} · ${formatPrice(o.totalCents)}</option>`).join('');
    document.getElementById('exchangeProduct').innerHTML = productsCache.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    const names = warehouseList();
    document.getElementById('returnWarehouse').innerHTML = names.map((n) => `<option value="${n}">${n}</option>`).join('');
    document.getElementById('returnWarehouseWrap').hidden = names.length < 2;
    fillReturnOrder();
    fillExchangeVariants();
    toggleExchange();
    returnOverlay.hidden = false;
  });
  function toggleExchange() {
    document.getElementById('exchangeWrap').hidden = document.getElementById('returnType').value !== 'cambio';
    document.getElementById('refundWrap').hidden = document.getElementById('returnType').value !== 'devolucion';
  }
  document.getElementById('returnOrder').addEventListener('change', fillReturnOrder);
  document.getElementById('returnType').addEventListener('change', toggleExchange);
  document.getElementById('exchangeProduct').addEventListener('change', fillExchangeVariants);
  document.getElementById('cancelReturnBtn').addEventListener('click', () => { returnOverlay.hidden = true; });
  document.getElementById('returnForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const order = ordersCache.find((o) => o.id === document.getElementById('returnOrder').value);
    const items = Array.from(document.querySelectorAll('.admin-return-line')).map((l) => {
      const i = order.items[parseInt(l.dataset.index, 10)];
      return { productId: i.id, size: i.size, qty: parseInt(l.querySelector('.ret-qty').value, 10) || 0, reason: l.querySelector('.ret-reason').value };
    }).filter((i) => i.qty > 0);
    if (!items.length) { document.getElementById('returnError').textContent = 'Indica cuántas piezas regresan.'; return; }
    const type = document.getElementById('returnType').value;
    const exchangeQty = parseInt(document.getElementById('exchangeQty').value, 10) || 0;
    const res = await fetch('/api/admin/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        type,
        items,
        refundMxn: document.getElementById('returnRefund').value,
        restock: document.getElementById('returnRestock').checked,
        warehouse: document.getElementById('returnWarehouse').value,
        notes: document.getElementById('returnNotes').value,
        exchangeItems: type === 'cambio' && exchangeQty > 0 ? [{ productId: document.getElementById('exchangeProduct').value, size: document.getElementById('exchangeVariant').value, qty: exchangeQty }] : [],
      }),
    });
    const data = await res.json();
    if (!res.ok) { document.getElementById('returnError').textContent = data.error || 'No se pudo registrar.'; return; }
    returnOverlay.hidden = true;
    await loadProducts();
    loadReturns();
  });
})();
