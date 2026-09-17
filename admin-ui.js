// Panel admin · Íconos en el menú lateral, buscador global (pedidos, productos, cotizaciones) y estados vacíos.
(function () {
  const TAB_ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    tablero: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>',
    pedidos: '<path d="M6 6h15l-1.5 8h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>',
    cotizaciones: '<path d="M4 4h16v12H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
    resenas: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    devoluciones: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    clientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4a3.5 3.5 0 0 1 0 7"/><path d="M18 14a5 5 0 0 1 3.5 5"/>',
    productos: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    variantes: '<path d="M4 6h16M4 12h10M4 18h6"/>',
    categorias: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    colecciones: '<path d="M4 6h7l2 2h7v10H4z"/>',
    existencias: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    inventario: '<path d="M4 12h16M12 4l8 8-8 8"/>',
    almacenes: '<path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/>',
    proveedores: '<path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    compras: '<path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6M9 17h3"/>',
    promociones: '<path d="M20 12l-8 8-9-9V4h7z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    articulos: '<path d="M5 3h10l4 4v14H5z"/><path d="M9 12h6M9 16h6M9 8h3"/>',
    reportes: '<path d="M3 20h18"/><path d="M5 16l4-5 4 3 6-8"/>',
    configuracion: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    usuarios: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    actividad: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  };
  document.querySelectorAll('.admin-side .admin-tab').forEach((tab) => {
    const p = TAB_ICONS[tab.dataset.tab];
    if (!p || tab.querySelector('svg')) return;
    tab.insertAdjacentHTML('afterbegin', `<svg class="admin-svg admin-tab-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`);
  });

  // ---- Tablas más anchas que la pantalla: sombra y aviso para deslizar ----
  function checkOverflow() {
    document.querySelectorAll('.admin-table-wrap').forEach((w) => {
      const over = w.scrollWidth > w.clientWidth + 4;
      w.classList.toggle('has-overflow', over);
      w.classList.toggle('at-end', over && w.scrollLeft + w.clientWidth >= w.scrollWidth - 4);
    });
  }
  window.addEventListener('resize', checkOverflow);
  document.addEventListener('scroll', (e) => { if (e.target.classList?.contains('admin-table-wrap')) checkOverflow(); }, true);
  new MutationObserver(() => requestAnimationFrame(checkOverflow)).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  setTimeout(checkOverflow, 600);

  // ---- Buscador global ----
  const header = document.querySelector('.admin-header-right');
  if (!header) return;
  const wrap = document.createElement('div');
  wrap.className = 'admin-gsearch';
  wrap.innerHTML = `<input type="search" id="gSearch" placeholder="Buscar pedido, cliente, producto…" autocomplete="off" aria-label="Buscar en el panel"><div class="admin-gsearch-menu" id="gSearchMenu" hidden></div>`;
  header.insertBefore(wrap, header.firstChild);
  const input = wrap.querySelector('input');
  const menu = wrap.querySelector('.admin-gsearch-menu');
  let leadsCache = null;
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  async function loadLeads() {
    if (leadsCache) return leadsCache;
    try { const r = await fetch('/api/admin/leads'); leadsCache = r.ok ? await r.json() : []; } catch { leadsCache = []; }
    return leadsCache;
  }

  async function search(q) {
    const n = norm(q);
    if (n.length < 2) { menu.hidden = true; return; }
    const res = [];
    (typeof ordersCache !== 'undefined' ? ordersCache : []).forEach((o) => {
      const hay = norm([o.id, o.customerName, o.customerPhone, o.customerEmail, o.tracking?.number, ...(o.items || []).map((i) => i.name)].join(' '));
      if (hay.includes(n)) res.push({ kind: 'Pedido', title: `${o.customerName || 'Sin nombre'} · ${formatPrice(o.totalCents)}`, sub: `${STATUS_LABELS[o.status] || o.status} · ${new Date(o.createdAt).toLocaleDateString('es-MX')} · ${o.id}`, run: () => { showTab('pedidos'); setTimeout(() => openOrderDetail(o.id), 150); } });
    });
    (typeof productsCache !== 'undefined' ? productsCache : []).forEach((p) => {
      const hay = norm([p.id, p.name, p.category, ...(p.sizes || []).map((v) => v.sku)].join(' '));
      if (hay.includes(n)) res.push({ kind: 'Producto', title: p.name, sub: `${p.category} · ${formatPrice(p.priceCents)} · ${p.sizes.reduce((s, v) => s + (v.stock || 0), 0)} pzas`, run: () => { showTab('productos'); setTimeout(() => openForm(p), 150); } });
    });
    (await loadLeads()).forEach((l) => {
      const hay = norm([l.company, l.name, l.email, l.phone, l.city].join(' '));
      if (hay.includes(n)) res.push({ kind: 'Cotización', title: l.company || l.name, sub: `${l.status} · ${l.totalPieces || 0} piezas · ${l.city || ''}`, run: () => showTab('cotizaciones') });
    });
    menu.innerHTML = res.length
      ? res.slice(0, 12).map((r, i) => `<button type="button" class="admin-gsearch-item" data-i="${i}"><span class="admin-gsearch-kind">${r.kind}</span><span><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></span></button>`).join('')
      : '<p class="admin-gsearch-empty">Sin resultados.</p>';
    menu._results = res;
    menu.hidden = false;
  }

  let t;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => search(input.value.trim()), 180); });
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2) search(input.value.trim()); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { menu.hidden = true; input.blur(); } if (e.key === 'Enter') menu.querySelector('.admin-gsearch-item')?.click(); });
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('.admin-gsearch-item');
    if (!b) return;
    const r = menu._results[Number(b.dataset.i)];
    menu.hidden = true; input.value = '';
    r?.run();
  });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) menu.hidden = true; });
  document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); input.select(); } });
})();
