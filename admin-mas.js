// Panel admin · Bloque 3: tarjetas del tablero con "qué falta", buscador y ficha de cliente.
(function () {
  const hoursAgo = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  const ago = (iso) => { const h = hoursAgo(iso); if (h < 1) return 'hace minutos'; if (h < 24) return `hace ${h} h`; const d = Math.floor(h / 24); return `hace ${d} día${d === 1 ? '' : 's'}`; };

  // ---- Tablero: qué falta y desde cuándo ----
  const baseKanban = window.renderKanban;
  window.renderKanban = function () {
    baseKanban();
    document.querySelectorAll('#kanban .admin-card[data-id]').forEach((card) => {
      const o = ordersCache.find((x) => x.id === card.dataset.id);
      if (!o) return;
      const n = window.orderNeeds ? window.orderNeeds(o) : [];
      const since = o.status === 'enviado' && o.shippedAt ? o.shippedAt : o.status === 'pagado' && o.payment?.paidAt ? o.payment.paidAt : o.createdAt;
      const foot = document.createElement('div');
      foot.className = 'admin-card-meta';
      foot.innerHTML = `${n.map((x) => `<span class="admin-need is-${x.level}">${x.label}</span>`).join('')}<span class="admin-muted admin-small">${STATUS_LABELS[o.status] || o.status} ${ago(since)}</span>`;
      card.appendChild(foot);
      if (n.some((x) => x.level === 'warn')) card.classList.add('is-urgent');
    });
  };

  // ---- Clientes: buscador ----
  const search = document.getElementById('customersSearch');
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function filterCustomers() {
    const q = norm(search?.value.trim());
    document.querySelectorAll('#customersTableBody tr[data-key]').forEach((tr) => { tr.hidden = Boolean(q) && !norm(tr.textContent).includes(q); });
  }
  search?.addEventListener('input', filterCustomers);
  new MutationObserver(filterCustomers).observe(document.getElementById('customersTableBody'), { childList: true });

  // ---- Clientes: ficha con historial ----
  const digits = (v) => String(v || '').replace(/\D/g, '').slice(-10);
  function ordersOf(c) {
    return ordersCache.filter((o) => (c.phone && digits(o.customerPhone) && digits(o.customerPhone) === digits(c.phone)) || (c.email && o.customerEmail && o.customerEmail.toLowerCase() === c.email.toLowerCase()) || (!c.phone && !c.email && c.name && (o.customerName || '').toLowerCase() === c.name.toLowerCase()))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  window.openCustomerProfile = function (c) {
    let ov = document.getElementById('customerProfileOverlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'admin-overlay';
      ov.id = 'customerProfileOverlay';
      ov.hidden = true;
      document.body.appendChild(ov);
      ov.addEventListener('click', (e) => { if (e.target === ov) ov.hidden = true; });
    }
    const orders = ordersOf(c);
    const valid = orders.filter((o) => !['cancelado', 'devuelto'].includes(o.status));
    const total = valid.reduce((s, o) => s + o.totalCents, 0);
    const pieces = valid.reduce((s, o) => s + orderPieces(o), 0);
    const sizes = {};
    valid.forEach((o) => o.items.forEach((i) => { if (i.size) sizes[i.size] = (sizes[i.size] || 0) + i.quantity; }));
    const topSizes = Object.entries(sizes).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const wa = whatsappDigits(c.phone);
    const last = orders[0];
    ov.innerHTML = `
      <div class="admin-form" style="max-width:760px">
        <div class="admin-detail-id"><span class="admin-kicker">Cliente</span><b>${esc(c.name || 'Sin nombre')}</b>${c.company ? `<span class="admin-muted">${esc(c.company)}</span>` : ''}</div>
        <div class="admin-lead-grid">
          <div><span class="admin-kicker">Contacto</span><p>${c.phone ? `${esc(c.phone)}<br>` : ''}${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a><br>` : ''}${!c.phone && !c.email ? '<span class="admin-muted">Sin datos de contacto</span>' : ''}</p></div>
          <div><span class="admin-kicker">Compras</span><p><b>${valid.length}</b> pedido${valid.length === 1 ? '' : 's'} · <b>${pieces}</b> piezas<br><b>${formatPrice(total)}</b> en total${valid.length ? ` · ticket ${formatPrice(total / valid.length)}` : ''}${last ? `<br>Último: ${new Date(last.createdAt).toLocaleDateString('es-MX', { dateStyle: 'medium' })}` : ''}</p></div>
          <div><span class="admin-kicker">Tallas que usa</span><p>${topSizes.length ? topSizes.map(([sz, n]) => `<span class="admin-size-chip is-ok">${esc(sz)}<i>${n}</i></span>`).join(' ') : '<span class="admin-muted">Sin compras aún</span>'}</p></div>
        </div>
        ${c.notes ? `<div class="admin-lead-note"><span class="admin-kicker">Notas</span><p>${esc(c.notes)}</p></div>` : ''}
        <h3 class="admin-profile-h">Historial de pedidos</h3>
        ${orders.length ? `<table class="admin-table admin-detail-table"><thead><tr><th>Fecha</th><th>Productos</th><th>Total</th><th>Estado</th></tr></thead><tbody>${orders.map((o) => `<tr class="admin-clickable" data-open-order="${o.id}"><td class="admin-nowrap">${new Date(o.createdAt).toLocaleDateString('es-MX', { dateStyle: 'medium' })}</td><td>${esc(o.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ''} ×${i.quantity}`).join(', '))}</td><td class="admin-nowrap">${formatPrice(o.totalCents)}</td><td><span class="admin-badge status-${o.status}">${STATUS_LABELS[o.status] || o.status}</span></td></tr>`).join('')}</tbody></table>` : '<p class="admin-muted">Todavía no tiene pedidos.</p>'}
        <div class="admin-form-actions admin-form-actions--wrap">
          ${wa ? `<a class="btn btn-secondary admin-btn-icon" href="https://wa.me/${wa}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a>` : ''}
          <button type="button" class="btn btn-secondary" data-profile-edit>${c.manual ? 'Editar datos' : 'Completar datos'}</button>
          <button type="button" class="btn btn-secondary" data-profile-close>Cerrar</button>
        </div>
      </div>`;
    ov.hidden = false;
    ov.querySelector('[data-profile-close]').addEventListener('click', () => { ov.hidden = true; });
    ov.querySelector('[data-profile-edit]').addEventListener('click', () => { ov.hidden = true; openCustomerForm(c); });
    ov.querySelectorAll('[data-open-order]').forEach((tr) => tr.addEventListener('click', () => { ov.hidden = true; showTab('pedidos'); setTimeout(() => openOrderDetail(tr.dataset.openOrder), 150); }));
  };
})();
