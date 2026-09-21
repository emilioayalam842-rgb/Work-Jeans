// Panel admin · Pedidos y productos con más información: línea de tiempo y acciones rápidas en el detalle,
// etiquetas de "qué falta" en la lista de pedidos, y stock por talla + ventas recientes en la lista de productos.
(function () {
  const DAY = 24 * 60 * 60 * 1000;
  const fmtDT = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
  const hoursAgo = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);

  const STEPS = [
    ['recibido', 'Recibido', (o) => o.createdAt],
    ['pagado', 'Pagado', (o) => o.payment?.paidAt || (o.source === 'stripe' ? o.createdAt : null)],
    ['preparacion', 'En preparación', (o) => o.preparingAt],
    ['enviado', 'Enviado', (o) => o.shippedAt],
    ['entregado', 'Entregado', (o) => o.deliveredAt],
  ];
  const ORDER = { pendiente: 0, pagado: 1, preparacion: 2, enviado: 3, entregado: 4 };

  // Qué le falta a un pedido para cerrarse.
  function needs(o) {
    const out = [];
    if (o.status === 'pendiente') out.push({ key: 'cobrar', label: 'Por cobrar', level: hoursAgo(o.createdAt) >= 24 ? 'warn' : 'info' });
    if (['pagado', 'preparacion'].includes(o.status)) out.push({ key: 'enviar', label: o.tracking?.number ? 'Marcar enviado' : 'Por enviar', level: hoursAgo(o.payment?.paidAt || o.createdAt) >= 48 ? 'warn' : 'info' });
    if (o.status === 'enviado' && o.shippedAt && hoursAgo(o.shippedAt) >= 7 * 24) out.push({ key: 'entrega', label: 'Confirmar entrega', level: 'info' });
    if (o.invoice?.requested && !o.invoice.issued && !['pendiente', 'cancelado', 'devuelto'].includes(o.status)) out.push({ key: 'facturar', label: 'Por facturar', level: 'info' });
    return out;
  }

  window.orderNeeds = needs;

  function timelineHtml(o) {
    const special = ['cancelado', 'devuelto'].includes(o.status);
    const current = special ? -1 : (ORDER[o.status] ?? 0);
    const steps = STEPS.map(([key, label, when], i) => {
      const state = special ? 'off' : i < current ? 'done' : i === current ? 'current' : 'todo';
      const date = when(o);
      return `<li class="admin-tl-step is-${state}"><span class="admin-tl-dot"></span><b>${label}</b><small>${date ? fmtDT(date) : ''}</small></li>`;
    }).join('');
    const special_note = special ? `<p class="admin-tl-special">${o.status === 'cancelado' ? `Cancelado ${o.cancelledAt ? `el ${fmtDT(o.cancelledAt)}` : ''}` : 'Devuelto'}</p>` : '';
    return `<ol class="admin-timeline">${steps}</ol>${special_note}`;
  }

  function actionsHtml(o) {
    const n = needs(o);
    const btn = (key, label, cls = 'btn-primary') => `<button type="button" class="btn ${cls} btn-sm" data-quick="${key}">${label}</button>`;
    const parts = [];
    n.forEach((x) => {
      if (x.key === 'cobrar') parts.push(btn('pagado', 'Marcar como pagado'));
      if (x.key === 'enviar') parts.push(btn('enviado', o.tracking?.number ? 'Marcar como enviado' : 'Capturar guía y enviar'));
      if (x.key === 'entrega') parts.push(btn('entregado', 'Marcar como entregado'));
      if (x.key === 'facturar') parts.push(btn('facturado', 'Marcar factura emitida', 'btn-secondary'));
    });
    if (o.status === 'preparacion' && !n.some((x) => x.key === 'enviar')) parts.push(btn('enviado', 'Marcar como enviado'));
    if (o.status === 'pagado') parts.push(btn('preparacion', 'Pasar a preparación', 'btn-secondary'));
    if (o.status === 'enviado' && !n.some((x) => x.key === 'entrega')) parts.push(btn('entregado', 'Marcar como entregado', 'btn-secondary'));
    if (!parts.length) return '';
    return `<div class="admin-quick"><span class="admin-kicker">Siguiente paso</span><div class="admin-quick-btns">${parts.join('')}</div></div>`;
  }

  const baseOpen = window.openOrderDetail;
  window.openOrderDetail = function (id) {
    baseOpen(id);
    const o = ordersCache.find((x) => x.id === id);
    if (!o) return;
    const box = document.getElementById('orderDetailContent');
    const head = document.createElement('div');
    head.className = 'admin-detail-head';
    head.innerHTML = `<div class="admin-detail-id"><span class="admin-kicker">Pedido</span><b>${esc(o.id)}</b><span class="admin-badge status-${o.status}">${STATUS_LABELS[o.status] || o.status}</span></div>${timelineHtml(o)}${actionsHtml(o)}`;
    box.prepend(head);
  };

  document.getElementById('orderDetailContent').addEventListener('click', (e) => {
    const b = e.target.closest('[data-quick]');
    if (!b) return;
    const q = b.dataset.quick;
    if (q === 'facturado') { document.getElementById('orderInvoiceIssued').checked = true; document.getElementById('orderInvoiceBox').open = true; }
    else {
      document.getElementById('orderDetailStatus').value = q;
      if (q === 'enviado' && !document.getElementById('orderTrackingNumber').value.trim()) {
        document.getElementById('orderTrackingCarrier').focus();
        document.getElementById('orderDetailError').textContent = 'Captura la paquetería y la guía y luego pulsa "Guardar cambios".';
        return;
      }
    }
    document.getElementById('saveOrderNotesBtn').click();
  });

  // Lista de pedidos: etiquetas de "qué falta" y marca de urgencia.
  const baseRenderOrders = window.renderOrders;
  window.renderOrders = function (orders) {
    baseRenderOrders(orders);
    orders.forEach((o) => {
      const tr = document.querySelector(`#ordersTableBody tr[data-id="${esc(o.id)}"]`);
      if (!tr) return;
      const n = needs(o);
      const cell = tr.querySelector('.admin-status-select')?.parentElement;
      if (cell && n.length) {
        const wrap = document.createElement('div');
        wrap.className = 'admin-needs';
        wrap.innerHTML = n.map((x) => `<span class="admin-need is-${x.level}">${esc(x.label)}</span>`).join('');
        cell.appendChild(wrap);
      }
      if (n.some((x) => x.level === 'warn')) tr.classList.add('is-urgent');
    });
  };

  // Lista de productos: stock por talla en colores y ventas de 30 días.
  function soldLast30(productId) {
    const since = Date.now() - 30 * DAY;
    return ordersCache.filter((o) => !['cancelado', 'devuelto'].includes(o.status) && new Date(o.createdAt).getTime() >= since)
      .reduce((s, o) => s + o.items.filter((i) => i.id === productId).reduce((a, i) => a + i.quantity, 0), 0);
  }
  const baseRenderProducts = window.renderProductsTable;
  window.renderProductsTable = function (products) {
    baseRenderProducts(products);
    const limit = lowStockLimit();
    products.forEach((p) => {
      const tr = document.querySelector(`#productsTableBody tr[data-id="${esc(p.id)}"]:not(.admin-stock-row)`);
      if (!tr) return;
      const nameCell = tr.children[2];
      if (!nameCell || nameCell.querySelector('.admin-size-chips')) return;
      const chips = p.sizes.map((v) => {
        const cls = v.stock === 0 ? 'is-out' : v.stock <= limit ? 'is-low' : 'is-ok';
        return `<span class="admin-size-chip ${cls}" title="${esc(variantLabel(v))}: ${v.stock} pzas">${esc(String(v.size || variantLabel(v)))}<i>${v.stock}</i></span>`;
      }).join('');
      const sold = soldLast30(p.id);
      const div = document.createElement('div');
      div.className = 'admin-size-chips';
      div.innerHTML = `${chips}<span class="admin-sold-note">${sold ? `${sold} pza${sold === 1 ? '' : 's'} vendidas en 30 días` : 'Sin ventas en 30 días'}</span>`;
      nameCell.appendChild(div);
    });
  };
})();
