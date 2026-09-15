// Panel admin · Marketing: cupones y promociones con estadísticas de uso.

(function () {
  const TYPE_LABELS = {
    percent: 'Porcentaje de descuento',
    amount: 'Monto fijo de descuento',
    '2x1': '2x1 (cada dos piezas, una gratis)',
    qty: 'Descuento por cantidad',
    first: 'Primera compra',
    free_shipping: 'Envío gratis',
  };
  const SCOPE_LABELS = { all: 'Toda la tienda', category: 'Por categoría', collection: 'Por colección', products: 'Productos específicos' };
  let promos = [];

  function describe(p) {
    const v = p.type === 'amount' ? formatPrice(p.value || 0) : `${p.value || 0}%`;
    let what = '';
    if (p.type === 'percent' || p.type === 'first') what = `${v} de descuento`;
    if (p.type === 'amount') what = `${v} de descuento`;
    if (p.type === '2x1') what = '2x1';
    if (p.type === 'qty') what = `${v} a partir de ${p.minQty || 2} piezas`;
    if (p.type === 'free_shipping') what = 'Envío gratis';
    const scope = p.scope?.kind && p.scope.kind !== 'all' ? ` en ${SCOPE_LABELS[p.scope.kind].toLowerCase().replace('por ', '')}: ${(p.scope.values || []).join(', ')}` : '';
    const min = p.minCents ? ` · compra mínima ${formatPrice(p.minCents)}` : '';
    return `${what}${scope}${min}`;
  }

  window.loadPromotions = async function loadPromotions() {
    const res = await fetch('/api/admin/promotions');
    if (res.status === 401) { showLogin(); return; }
    promos = await res.json();
    const uses = promos.reduce((s, p) => s + (p.uses || 0), 0);
    const sales = promos.reduce((s, p) => s + (p.stats?.salesCents || 0), 0);
    const given = promos.reduce((s, p) => s + (p.stats?.discountCents || 0), 0);
    document.getElementById('promoUses').textContent = uses;
    document.getElementById('promoSales').textContent = formatPrice(sales);
    document.getElementById('promoGiven').textContent = formatPrice(given);
    document.getElementById('promotionsTableBody').innerHTML = promos.length ? promos.map((p) => `
      <tr data-id="${p.id}" class="${p.isActive ? '' : 'admin-row-hidden'}">
        <td><strong>${p.name}</strong><br><span class="admin-muted admin-small">${describe(p)}</span></td>
        <td>${p.code ? `<code>${p.code}</code>` : '<span class="admin-muted">Automática</span>'}</td>
        <td>${[p.startsAt ? `desde ${p.startsAt}` : '', p.endsAt ? `hasta ${p.endsAt}` : ''].filter(Boolean).join(' ') || 'Sin límite'}${p.maxUses ? `<br><span class="admin-muted admin-small">máx. ${p.maxUses} usos</span>` : ''}</td>
        <td>${p.uses || 0}</td>
        <td>${formatPrice(p.stats?.salesCents || 0)}</td>
        <td>${formatPrice(p.stats?.discountCents || 0)}</td>
        <td><label class="admin-switch" title="${p.active ? 'Activa' : 'Pausada'}"><input type="checkbox" data-action="toggle-promo" ${p.active ? 'checked' : ''}><span></span></label>${p.active && !p.isActive ? '<br><span class="admin-muted admin-small">Fuera de vigencia</span>' : ''}</td>
        <td class="admin-table-actions">${iconBtn('edit-promo', 'edit', 'Editar')}${iconBtn('delete-promo', 'trash', 'Eliminar')}</td>
      </tr>`).join('') : '<tr><td colspan="8">Todavía no hay promociones. Crea la primera.</td></tr>';
  };

  const overlay = document.getElementById('promoOverlay');

  function updatePromoFields() {
    const type = document.getElementById('promoType').value;
    document.getElementById('promoValueWrap').hidden = ['2x1', 'free_shipping'].includes(type);
    document.getElementById('promoValueLabel').textContent = type === 'amount' ? 'Monto de descuento (MXN)' : 'Porcentaje de descuento';
    document.getElementById('promoMinQtyWrap').hidden = type !== 'qty';
    document.getElementById('promoFirstNote').hidden = type !== 'first';
    const kind = document.getElementById('promoScopeKind').value;
    const wrap = document.getElementById('promoScopeValuesWrap');
    wrap.hidden = kind === 'all';
    const sel = document.getElementById('promoScopeValues');
    let options = [];
    if (kind === 'category') options = (settingsCache.categories || []).map((c) => c.name);
    if (kind === 'collection') options = settingsCache.collections || [];
    if (kind === 'products') options = productsCache.map((p) => [p.id, p.name]);
    const selected = new Set((sel.dataset.selected || '').split('|').filter(Boolean));
    sel.innerHTML = options.map((o) => {
      const [value, label] = Array.isArray(o) ? o : [o, o];
      return `<option value="${value}" ${selected.has(value) ? 'selected' : ''}>${label}</option>`;
    }).join('');
  }

  function openPromoForm(p) {
    document.getElementById('promoError').textContent = '';
    document.getElementById('promoForm').reset();
    document.getElementById('promoId').value = p?.id || '';
    document.getElementById('promoFormTitle').textContent = p ? 'Editar promoción' : 'Nueva promoción';
    document.getElementById('promoName').value = p?.name || '';
    document.getElementById('promoCode').value = p?.code || '';
    document.getElementById('promoType').value = p?.type || 'percent';
    document.getElementById('promoValue').value = p ? (p.type === 'amount' ? (p.value / 100).toFixed(2) : p.value) : '';
    document.getElementById('promoMinMxn').value = p?.minCents ? (p.minCents / 100).toFixed(2) : '';
    document.getElementById('promoMinQty').value = p?.minQty || '';
    document.getElementById('promoScopeKind').value = p?.scope?.kind || 'all';
    document.getElementById('promoScopeValues').dataset.selected = (p?.scope?.values || []).join('|');
    document.getElementById('promoStart').value = p?.startsAt || '';
    document.getElementById('promoEnd').value = p?.endsAt || '';
    document.getElementById('promoMaxUses').value = p?.maxUses || '';
    document.getElementById('promoActive').checked = p ? Boolean(p.active) : true;
    updatePromoFields();
    overlay.hidden = false;
  }

  document.getElementById('newPromoBtn').addEventListener('click', () => openPromoForm(null));
  document.getElementById('cancelPromoBtn').addEventListener('click', () => { overlay.hidden = true; });
  document.getElementById('promoType').addEventListener('change', updatePromoFields);
  document.getElementById('promoScopeKind').addEventListener('change', () => { document.getElementById('promoScopeValues').dataset.selected = ''; updatePromoFields(); });

  document.getElementById('promoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('promoId').value;
    const body = {
      name: document.getElementById('promoName').value,
      code: document.getElementById('promoCode').value,
      type: document.getElementById('promoType').value,
      value: document.getElementById('promoValue').value,
      minMxn: document.getElementById('promoMinMxn').value,
      minQty: document.getElementById('promoMinQty').value,
      scope: { kind: document.getElementById('promoScopeKind').value, values: Array.from(document.getElementById('promoScopeValues').selectedOptions).map((o) => o.value) },
      startsAt: document.getElementById('promoStart').value,
      endsAt: document.getElementById('promoEnd').value,
      maxUses: document.getElementById('promoMaxUses').value,
      active: document.getElementById('promoActive').checked,
    };
    const res = await fetch(id ? `/api/admin/promotions/${id}` : '/api/admin/promotions', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { document.getElementById('promoError').textContent = data.error || 'No se pudo guardar.'; return; }
    overlay.hidden = true;
    loadPromotions();
  });

  document.getElementById('promotionsTableBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.dataset.action === 'toggle-promo') return;
    const id = btn.closest('tr').dataset.id;
    if (btn.dataset.action === 'edit-promo') openPromoForm(promos.find((p) => p.id === id));
    if (btn.dataset.action === 'delete-promo') {
      if (!confirm('¿Eliminar esta promoción? Las estadísticas se pierden.')) return;
      await fetch(`/api/admin/promotions/${id}`, { method: 'DELETE' });
      loadPromotions();
    }
  });
  document.getElementById('promotionsTableBody').addEventListener('change', async (e) => {
    if (e.target.dataset.action !== 'toggle-promo') return;
    const id = e.target.closest('tr').dataset.id;
    await fetch(`/api/admin/promotions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: e.target.checked }) });
    loadPromotions();
  });
})();
