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
      foot.innerHTML = `${n.map((x) => `<span class="admin-need is-${x.level}">${esc(x.label)}</span>`).join('')}<span class="admin-muted admin-small">${STATUS_LABELS[o.status] || o.status} ${ago(since)}</span>`;
      card.appendChild(foot);
      if (n.some((x) => x.level === 'warn')) card.classList.add('is-urgent');
    });
  };

  // ---- Existencias: historial de una talla ----
  document.getElementById('stockTableBody')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="stk-history"]');
    if (!btn) return;
    const tr = btn.closest('tr');
    const productId = tr.dataset.product; const label = tr.dataset.size;
    const res = await fetch('/api/admin/inventory?limit=500');
    const log = res.ok ? await res.json() : [];
    const rows = log.filter((m) => m.productId === productId && (m.size === label || (label || '').startsWith(m.size || '\u0000')));
    let ov = document.getElementById('stockHistoryOverlay');
    if (!ov) { ov = document.createElement('div'); ov.className = 'admin-overlay'; ov.id = 'stockHistoryOverlay'; ov.hidden = true; document.body.appendChild(ov); ov.addEventListener('click', (ev) => { if (ev.target === ov) ov.hidden = true; }); }
    const name = tr.children[0]?.textContent || productId;
    const inQty = rows.filter((m) => m.delta > 0).reduce((s, m) => s + m.delta, 0);
    const outQty = rows.filter((m) => m.delta < 0).reduce((s, m) => s - m.delta, 0);
    ov.innerHTML = `<div class="admin-form" style="max-width:720px">
      <div class="admin-detail-id"><span class="admin-kicker">Historial</span><b>${esc(name)} · ${esc(label)}</b></div>
      <div class="admin-chart-stats"><div class="admin-chart-stat"><b>${inQty}</b><span>entradas</span></div><div class="admin-chart-stat"><b>${outQty}</b><span>salidas</span></div><div class="admin-chart-stat"><b>${rows.length}</b><span>movimientos</span></div></div>
      ${rows.length ? `<table class="admin-table admin-detail-table"><thead><tr><th>Fecha</th><th>Cambio</th><th>Quedan</th><th>Motivo</th></tr></thead><tbody>${rows.map((m) => `<tr><td class="admin-nowrap">${new Date(m.at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td><td class="${m.delta > 0 ? 'admin-profit' : 'admin-stock-low'}">${m.delta > 0 ? '+' : ''}${m.delta}</td><td>${m.stockAfter ?? '—'}</td><td>${esc(m.reason || '')}${m.orderId ? ` <button type="button" class="admin-inline-btn admin-small" data-open-order="${esc(m.orderId)}">Ver pedido</button>` : ''}${m.warehouse ? ` <span class="admin-muted admin-small">· ${esc(m.warehouse)}</span>` : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="admin-muted">Sin movimientos registrados para esta talla (los últimos 500 movimientos).</p>'}
      <div class="admin-form-actions"><button type="button" class="btn btn-secondary" data-close>Cerrar</button></div>
    </div>`;
    ov.hidden = false;
    ov.querySelector('[data-close]').addEventListener('click', () => { ov.hidden = true; });
    ov.querySelectorAll('[data-open-order]').forEach((b) => b.addEventListener('click', () => { ov.hidden = true; showTab('pedidos'); setTimeout(() => openOrderDetail(b.dataset.openOrder), 150); }));
  });

  // ---- Reportes: exportar a Excel (todas las tablas y cifras de la pestaña) ----
  document.getElementById('exportReportBtn')?.addEventListener('click', () => {
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [];
    const period = document.getElementById('reportPeriod');
    lines.push([`Reporte Works Jeans`, period.options[period.selectedIndex]?.text || '', new Date().toLocaleString('es-MX')].map(cell).join(';'));
    lines.push('');
    document.querySelectorAll('#tabReportes .admin-stat-card').forEach((c) => { const l = c.querySelector('.admin-stat-label')?.textContent.trim(); const v = c.querySelector('.admin-stat-value')?.textContent.trim(); if (l) lines.push([l, v].map(cell).join(';')); });
    document.querySelectorAll('#tabReportes .admin-panel-box').forEach((box) => {
      const title = box.querySelector('h3')?.textContent.trim();
      const table = box.querySelector('table');
      if (!title || !table) return;
      lines.push(''); lines.push(cell(title));
      table.querySelectorAll('tr').forEach((tr) => { const cells = Array.from(tr.children).map((td) => td.textContent.trim().replace(/\s+/g, ' ')); if (cells.some(Boolean)) lines.push(cells.map(cell).join(';')); });
    });
    const csv = '\ufeff' + lines.join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `reporte-works-jeans-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  });

  // ---- Configuración: vista previa de los correos al cliente ----
  document.getElementById('emailPreviewBtn')?.addEventListener('click', () => {
    let ov = document.getElementById('emailPreviewOverlay');
    if (!ov) { ov = document.createElement('div'); ov.className = 'admin-overlay'; ov.id = 'emailPreviewOverlay'; ov.hidden = true; document.body.appendChild(ov); ov.addEventListener('click', (ev) => { if (ev.target === ov) ov.hidden = true; }); }
    ov.innerHTML = `<div class="admin-form" style="max-width:760px">
      <div class="admin-detail-id"><span class="admin-kicker">Vista previa</span><b>Correos al cliente</b></div>
      <p class="admin-muted admin-small">Así se ven con el pedido más reciente. Se envían solos al confirmar, enviar, entregar o cancelar un pedido (si el pedido tiene correo).</p>
      <div class="admin-subtabs" id="emailPreviewTabs">${[['confirmacion', 'Confirmación'], ['enviado', 'Enviado'], ['entregado', 'Entregado'], ['cancelado', 'Cancelado']].map(([k, v], i) => `<button type="button" class="admin-subtab ${i === 0 ? 'active' : ''}" data-type="${k}">${v}</button>`).join('')}</div>
      <iframe id="emailPreviewFrame" title="Vista previa del correo" style="width:100%;height:60vh;border:1px solid #e5e5e5;border-radius:12px;background:#f3f3f3"></iframe>
      <div class="admin-form-actions"><button type="button" class="btn btn-secondary" data-close>Cerrar</button></div>
    </div>`;
    const frame = ov.querySelector('#emailPreviewFrame');
    const load = (type) => { frame.src = `/api/admin/email-preview?type=${type}&t=${Date.now()}`; };
    ov.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => { ov.querySelectorAll('[data-type]').forEach((x) => x.classList.toggle('active', x === b)); load(b.dataset.type); }));
    ov.querySelector('[data-close]').addEventListener('click', () => { ov.hidden = true; });
    ov.hidden = false;
    load('confirmacion');
  });

  // ---- Escape cierra formularios, fichas y menús ----
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = Array.from(document.querySelectorAll('.admin-overlay')).filter((o) => !o.hidden);
    if (open.length) { open[open.length - 1].hidden = true; e.preventDefault(); return; }
    const bell = document.getElementById('bellMenu'); if (bell && !bell.hidden) bell.hidden = true;
    const gs = document.getElementById('gSearchMenu'); if (gs && !gs.hidden) gs.hidden = true;
  });

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
        ${orders.length ? `<table class="admin-table admin-detail-table"><thead><tr><th>Fecha</th><th>Productos</th><th>Total</th><th>Estado</th></tr></thead><tbody>${orders.map((o) => `<tr class="admin-clickable" data-open-order="${esc(o.id)}"><td class="admin-nowrap">${new Date(o.createdAt).toLocaleDateString('es-MX', { dateStyle: 'medium' })}</td><td>${esc(o.items.map((i) => `${esc(i.name)}${i.size ? ` (${esc(i.size)})` : ''} ×${i.quantity}`).join(', '))}</td><td class="admin-nowrap">${formatPrice(o.totalCents)}</td><td><span class="admin-badge status-${o.status}">${STATUS_LABELS[o.status] || o.status}</span></td></tr>`).join('')}</tbody></table>` : '<p class="admin-muted">Todavía no tiene pedidos.</p>'}
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
