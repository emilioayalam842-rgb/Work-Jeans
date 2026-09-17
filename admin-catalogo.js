// Panel admin · Catálogo e inventario: variantes, categorías, colecciones, existencias y almacenes.
// Usa las funciones y cachés globales de admin.js (productsCache, settingsCache, formatPrice, icon…).

(function () {
  // ---------- Variantes ----------
  let stockRows = [];
  let stockMeta = { warehouses: ['Tienda'], threshold: 5 };

  async function fetchStock() {
    const res = await fetch('/api/admin/stock');
    if (res.status === 401) {
      showLogin();
      return false;
    }
    const data = await res.json();
    stockRows = data.rows;
    stockMeta = { warehouses: data.warehouses, threshold: data.threshold };
    return true;
  }

  function variantMatches(r, q) {
    if (!q) return true;
    const hay = [r.productName, r.sku, r.barcode, r.color, r.size, r.length, r.label].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  }

  window.loadVariants = async function loadVariants() {
    if (!(await fetchStock())) return;
    const productSel = document.getElementById('variantsProduct');
    const current = productSel.value;
    productSel.innerHTML = '<option value="">Todos los modelos</option>' + productsCache.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
    productSel.value = current;
    renderVariants();
  };

  function filteredVariants() {
    const q = document.getElementById('variantsSearch').value.trim().toLowerCase();
    const pid = document.getElementById('variantsProduct').value;
    const level = document.getElementById('variantsStock').value;
    return stockRows.filter((r) => {
      if (pid && r.productId !== pid) return false;
      if (level === 'low' && !(r.stock <= stockMeta.threshold)) return false;
      if (level === 'out' && r.stock > 0) return false;
      return variantMatches(r, q);
    });
  }

  function renderVariants() {
    const rows = filteredVariants();
    document.getElementById('variantsSummary').textContent = `${rows.length} variantes · ${rows.reduce((s, r) => s + r.stock, 0)} piezas`;
    document.getElementById('variantsTableBody').innerHTML = rows.length ? rows.map((r) => `
      <tr class="${r.status !== 'activo' ? 'admin-row-hidden' : ''}">
        <td>${r.productName}${r.status !== 'activo' ? ` <span class="admin-tag admin-tag--draft">${r.status}</span>` : ''}</td>
        <td><strong>${r.label}</strong></td>
        <td><code>${r.sku || '—'}</code></td>
        <td>${r.barcode ? `<code>${r.barcode}</code>` : '—'}</td>
        <td>${formatPrice(r.priceCents)}</td>
        <td>${r.costCents ? formatPrice(r.costCents) : '—'}</td>
        <td class="${r.stock <= stockMeta.threshold ? 'admin-stock-low' : ''}"><strong>${r.stock}</strong></td>
        <td>${r.reserved || 0}</td>
        <td class="admin-table-actions">${iconBtn('edit-product', 'edit', 'Editar producto', `data-product="${r.productId}"`)}</td>
      </tr>`).join('') : '<tr><td colspan="9">Sin variantes con esos filtros.</td></tr>';
  }

  ['variantsSearch', 'variantsProduct', 'variantsStock'].forEach((id) => {
    document.getElementById(id).addEventListener('input', renderVariants);
    document.getElementById(id).addEventListener('change', renderVariants);
  });

  document.getElementById('variantsTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="edit-product"]');
    if (!btn) return;
    const product = productsCache.find((p) => p.id === btn.dataset.product);
    if (product) openForm(product);
  });

  document.getElementById('exportVariantsBtn').addEventListener('click', () => {
    const rows = filteredVariants();
    const header = ['Modelo', 'SKU', 'Código de barras', 'Talla', 'Largo', 'Color', 'Precio MXN', 'Costo MXN', 'Existencia', 'Apartadas', ...stockMeta.warehouses.map((w) => `Almacén ${w}`)];
    const lines = rows.map((r) => [r.productName, r.sku, r.barcode, r.size, r.length, r.color, (r.priceCents / 100).toFixed(2), (r.costCents / 100).toFixed(2), r.stock, r.reserved, ...r.warehouses.map((w) => w.qty)]);
    const csv = '﻿' + [header, ...lines].map((l) => l.map(csvCell).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'variantes-works-jeans.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // ---------- Categorías y colecciones ----------
  async function saveSettingsPartial(body) {
    const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) await loadSettingsCache();
    return res.ok;
  }

  function slugify(text) {
    return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  window.renderCategories = function renderCategories() {
    const cats = settingsCache.categories || [];
    const stats = {};
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const sold = {};
    (typeof ordersCache !== 'undefined' ? ordersCache : []).filter((o) => !['cancelado', 'devuelto'].includes(o.status) && new Date(o.createdAt).getTime() >= since).forEach((o) => o.items.forEach((i) => { sold[i.id] = (sold[i.id] || 0) + i.quantity; }));
    productsCache.forEach((p) => {
      const st = stats[p.category] || (stats[p.category] = { products: 0, active: 0, pieces: 0, sold: 0 });
      st.products += 1;
      if (p.active !== false && (!p.status || p.status === 'activo')) st.active += 1;
      st.pieces += p.sizes.reduce((a, v) => a + (v.stock || 0), 0);
      st.sold += sold[p.id] || 0;
    });
    document.getElementById('categoriesList').innerHTML = cats.length ? cats.map((c, i) => { const st = stats[c.name] || { products: 0, active: 0, pieces: 0, sold: 0 }; return `
      <div class="admin-list-item">
        <div><strong>${c.name}</strong> <span class="admin-muted admin-small">/${c.slug}</span>
          <div class="admin-list-stats"><span><b>${st.active}</b> activos${st.products !== st.active ? ` · ${st.products - st.active} ocultos` : ''}</span><span><b>${st.pieces}</b> pzas en stock</span><span><b>${st.sold}</b> vendidas en 30 días</span></div>
        </div>
        <div class="admin-list-actions">
          <a class="admin-inline-btn" href="/${c.slug}" target="_blank" rel="noopener">Ver página</a>
          ${iconBtn('remove-category', 'trash', 'Eliminar', `data-index="${i}"`)}
        </div>
      </div>`; }).join('') : '<p class="admin-muted">Sin categorías.</p>';
  };

  document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('categoryName').value.trim();
    const slug = slugify(document.getElementById('categorySlug').value.trim() || name);
    if (!name || !slug) return;
    const cats = [...(settingsCache.categories || [])];
    if (cats.some((c) => c.name.toLowerCase() === name.toLowerCase() || c.slug === slug)) {
      alert('Ya existe una categoría con ese nombre o URL.');
      return;
    }
    cats.push({ name, slug });
    if (await saveSettingsPartial({ categories: cats })) {
      e.target.reset();
      renderCategories();
    }
  });

  document.getElementById('categoriesList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="remove-category"]');
    if (!btn) return;
    const cats = [...(settingsCache.categories || [])];
    const cat = cats[parseInt(btn.dataset.index, 10)];
    const inUse = productsCache.filter((p) => p.category === cat.name).length;
    if (inUse && !confirm(`${inUse} productos usan "${cat.name}". Seguirán con ese nombre pero sin página propia. ¿Eliminar la categoría?`)) return;
    cats.splice(parseInt(btn.dataset.index, 10), 1);
    if (await saveSettingsPartial({ categories: cats })) renderCategories();
  });

  window.renderCollections = function renderCollections() {
    const cols = settingsCache.collections || [];
    const stats = {};
    productsCache.forEach((p) => { if (!p.collection) return; const st = stats[p.collection] || (stats[p.collection] = { products: 0, pieces: 0 }); st.products += 1; st.pieces += p.sizes.reduce((a, v) => a + (v.stock || 0), 0); });
    document.getElementById('collectionsList').innerHTML = cols.length ? cols.map((c, i) => `
      <div class="admin-list-item">
        <div><strong>${c}</strong><div class="admin-list-stats"><span><b>${stats[c]?.products || 0}</b> productos</span><span><b>${stats[c]?.pieces || 0}</b> pzas en stock</span></div></div>
        <div class="admin-list-actions">${iconBtn('remove-collection', 'trash', 'Eliminar', `data-index="${i}"`)}</div>
      </div>`).join('') : '<p class="admin-muted">Sin colecciones.</p>';
  };

  document.getElementById('collectionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('collectionName').value.trim();
    if (!name) return;
    const cols = [...(settingsCache.collections || [])];
    if (cols.some((c) => c.toLowerCase() === name.toLowerCase())) return;
    cols.push(name);
    if (await saveSettingsPartial({ collections: cols })) {
      e.target.reset();
      renderCollections();
    }
  });

  document.getElementById('collectionsList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="remove-collection"]');
    if (!btn) return;
    const cols = [...(settingsCache.collections || [])];
    cols.splice(parseInt(btn.dataset.index, 10), 1);
    if (await saveSettingsPartial({ collections: cols })) renderCollections();
  });

  // ---------- Existencias ----------
  window.loadStock = async function loadStock() {
    if (!(await fetchStock())) return;
    const colors = [...new Set(stockRows.map((r) => r.color).filter(Boolean))].sort();
    const colorSel = document.getElementById('stockColor');
    const cur = colorSel.value;
    colorSel.innerHTML = '<option value="">Todos los colores</option>' + colors.map((c) => `<option value="${c}">${c}</option>`).join('');
    colorSel.value = cur;
    const whSel = document.getElementById('stockWarehouse');
    const curW = whSel.value;
    whSel.innerHTML = '<option value="">Todos los almacenes</option>' + stockMeta.warehouses.map((w) => `<option value="${w}">${w}</option>`).join('');
    whSel.value = curW;
    whSel.parentElement.hidden = false;
    whSel.hidden = stockMeta.warehouses.length < 2;
    document.getElementById('stockTransferBtn').hidden = stockMeta.warehouses.length < 2;
    renderStock();
  };

  function renderStock() {
    const q = document.getElementById('stockSearch').value.trim().toLowerCase();
    const color = document.getElementById('stockColor').value;
    const wh = document.getElementById('stockWarehouse').value;
    const level = document.getElementById('stockLevel').value;
    const active = stockRows.filter((r) => r.status === 'activo' || r.stock > 0);
    const rows = active.filter((r) => {
      if (color && r.color !== color) return false;
      if (wh && !(r.warehouses.find((w) => w.name === wh)?.qty > 0)) return false;
      if (level === 'low' && !(r.stock <= stockMeta.threshold)) return false;
      if (level === 'out' && r.stock > 0) return false;
      return variantMatches(r, q);
    });
    document.getElementById('stkTotal').textContent = active.reduce((s, r) => s + r.stock, 0);
    document.getElementById('stkReserved').textContent = active.reduce((s, r) => s + (r.reserved || 0), 0);
    document.getElementById('stkCostValue').textContent = formatPrice(active.reduce((s, r) => s + r.stock * (r.costCents || 0), 0));
    const low = active.filter((r) => r.stock <= stockMeta.threshold);
    document.getElementById('stkLow').textContent = low.length;

    const alerts = low.filter((r) => r.status === 'activo').slice(0, 6);
    document.getElementById('stockAlerts').innerHTML = alerts.map((r) => `
      <div class="admin-alert ${r.stock === 0 ? 'is-out' : ''}">
        <strong>${r.stock === 0 ? 'Agotado' : 'Stock bajo'}</strong>
        ${r.productName} · ${r.label}${r.sku ? ` · ${r.sku}` : ''}
        <span>${r.stock === 0 ? 'Sin piezas.' : `Solo quedan ${r.stock} ${r.stock === 1 ? 'pieza' : 'piezas'}.`}</span>
      </div>`).join('');

    const multi = stockMeta.warehouses.length > 1;
    document.getElementById('stockTableHead').innerHTML = `<tr><th>Modelo</th><th>Variante</th><th>SKU</th>${multi ? stockMeta.warehouses.map((w) => `<th>${w}</th>`).join('') : ''}<th>Físico</th><th>Apartadas</th><th>Disponible</th><th>Valor a costo</th><th></th></tr>`;
    document.getElementById('stockTableBody').innerHTML = rows.length ? rows.map((r) => `
      <tr data-product="${r.productId}" data-size="${r.label}">
        <td>${r.productName}</td>
        <td><strong>${r.label}</strong></td>
        <td><code>${r.sku || '—'}</code></td>
        ${multi ? r.warehouses.map((w) => `<td>${w.qty}</td>`).join('') : ''}
        <td>${r.stock + (r.reserved || 0)}</td>
        <td>${r.reserved || 0}</td>
        <td class="${r.stock <= stockMeta.threshold ? 'admin-stock-low' : ''}">
          <input type="number" class="admin-stock-input" value="${r.stock}" min="0" step="1" data-current="${r.stock}" title="Escribe la cantidad y presiona Enter">
        </td>
        <td>${formatPrice(r.stock * (r.costCents || 0))}</td>
        <td class="admin-table-actions">
          <div class="admin-stock-controls">
            <button type="button" class="admin-stock-btn" data-action="stk-history" title="Historial de esta talla" aria-label="Historial de esta talla">${icon('eye', 14)}</button>
            <button type="button" class="admin-stock-btn" data-action="stk-adjust" data-delta="-1" aria-label="Quitar una pieza">−</button>
            <button type="button" class="admin-stock-btn" data-action="stk-adjust" data-delta="1" aria-label="Agregar una pieza">+</button>
          </div>
        </td>
      </tr>`).join('') : '<tr><td colspan="12">Sin variantes con esos filtros.</td></tr>';
  }

  ['stockSearch', 'stockColor', 'stockWarehouse', 'stockLevel'].forEach((id) => {
    document.getElementById(id).addEventListener('input', renderStock);
    document.getElementById(id).addEventListener('change', renderStock);
  });

  document.getElementById('stockTableBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="stk-adjust"]');
    if (!btn) return;
    const tr = btn.closest('tr');
    const wh = document.getElementById('stockWarehouse').value || stockMeta.warehouses[0];
    const res = await fetch('/api/admin/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: tr.dataset.product, size: tr.dataset.size, delta: parseInt(btn.dataset.delta, 10), warehouse: wh, reason: 'Ajuste manual desde Existencias' }),
    });
    if (res.ok) {
      await loadProducts();
      loadStock();
    } else {
      const data = await res.json();
      alert(data.error || 'No se pudo ajustar.');
    }
  });

  // Cantidad escrita a mano: se fija la existencia exacta (el servidor registra la diferencia).
  async function setStockExact(input) {
    const tr = input.closest('tr');
    const current = parseInt(input.dataset.current, 10) || 0;
    const wanted = Math.max(0, parseInt(input.value, 10) || 0);
    if (wanted === current) { input.value = current; return; }
    const wh = document.getElementById('stockWarehouse').value || stockMeta.warehouses[0];
    input.disabled = true;
    const res = await fetch('/api/admin/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: tr.dataset.product, size: tr.dataset.size, delta: wanted - current, warehouse: wh, reason: `Ajuste manual: de ${current} a ${wanted}` }),
    });
    input.disabled = false;
    if (res.ok) {
      await loadProducts();
      loadStock();
    } else {
      const data = await res.json();
      input.value = current;
      alert(data.error || 'No se pudo ajustar.');
    }
  }
  document.getElementById('stockTableBody').addEventListener('keydown', (e) => {
    if (e.target.classList.contains('admin-stock-input') && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  });
  document.getElementById('stockTableBody').addEventListener('focusout', (e) => {
    if (e.target.classList.contains('admin-stock-input')) setStockExact(e.target);
  });
  document.getElementById('stockTableBody').addEventListener('focusin', (e) => {
    if (e.target.classList.contains('admin-stock-input')) e.target.select();
  });

  document.getElementById('stockEntryBtn').addEventListener('click', () => document.getElementById('newEntryBtn').click());

  // ---------- Traspasos ----------
  const transferOverlay = document.getElementById('transferOverlay');

  function fillTransferVariants() {
    const product = productsCache.find((p) => p.id === document.getElementById('transferProduct').value);
    const sel = document.getElementById('transferVariant');
    sel.innerHTML = product ? product.sizes.map((s) => `<option value="${variantLabel(s)}">${variantLabel(s)} (${s.stock} pzas)</option>`).join('') : '';
    updateTransferInfo();
  }

  function updateTransferInfo() {
    const product = productsCache.find((p) => p.id === document.getElementById('transferProduct').value);
    const v = product?.sizes.find((s) => variantLabel(s) === document.getElementById('transferVariant').value);
    const names = warehouseList();
    const wh = v ? (v.warehouses || { [names[0]]: v.stock }) : {};
    document.getElementById('transferInfo').textContent = v ? `Existencia por almacén: ${names.map((n) => `${n} ${wh[n] || 0}`).join(' · ')}` : '';
  }

  document.getElementById('stockTransferBtn').addEventListener('click', () => {
    const names = warehouseList();
    document.getElementById('transferError').textContent = '';
    document.getElementById('transferProduct').innerHTML = productsCache.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
    document.getElementById('transferFrom').innerHTML = names.map((n) => `<option value="${n}">${n}</option>`).join('');
    document.getElementById('transferTo').innerHTML = names.map((n, i) => `<option value="${n}" ${i === 1 ? 'selected' : ''}>${n}</option>`).join('');
    document.getElementById('transferQty').value = 1;
    fillTransferVariants();
    transferOverlay.hidden = false;
  });
  document.getElementById('transferProduct').addEventListener('change', fillTransferVariants);
  document.getElementById('transferVariant').addEventListener('change', updateTransferInfo);
  document.getElementById('cancelTransferBtn').addEventListener('click', () => { transferOverlay.hidden = true; });

  document.getElementById('transferForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('transferError');
    errorEl.textContent = '';
    const res = await fetch('/api/admin/inventory/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: document.getElementById('transferProduct').value,
        size: document.getElementById('transferVariant').value,
        from: document.getElementById('transferFrom').value,
        to: document.getElementById('transferTo').value,
        qty: parseInt(document.getElementById('transferQty').value, 10),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'No se pudo traspasar.';
      return;
    }
    transferOverlay.hidden = true;
    await loadProducts();
    loadStock();
  });

  // ---------- Almacenes ----------
  window.renderWarehouses = function renderWarehouses() {
    const names = warehouseList();
    document.getElementById('warehousesList').innerHTML = names.map((n, i) => {
      let pieces = 0; let variants = 0; let value = 0;
      productsCache.forEach((p) => p.sizes.forEach((v) => { const q = (v.warehouses ? v.warehouses[n] : (i === 0 ? v.stock : 0)) || 0; if (q > 0) { variants += 1; pieces += q; value += q * (v.costCents || p.costCents || 0); } }));
      return `
      <div class="admin-list-item">
        <div><strong>${n}</strong> ${i === 0 ? '<span class="admin-muted admin-small">principal</span>' : ''}
          <div class="admin-list-stats"><span><b>${pieces}</b> piezas</span><span><b>${variants}</b> tallas con stock</span>${value ? `<span><b>${formatPrice(value)}</b> a costo</span>` : ''}</div>
        </div>
        <div class="admin-list-actions">${names.length > 1 ? iconBtn('remove-warehouse', 'trash', 'Eliminar', `data-index="${i}"`) : ''}</div>
      </div>`;
    }).join('');
  };

  document.getElementById('warehouseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('warehouseName').value.trim();
    if (!name) return;
    const names = [...warehouseList()];
    if (names.some((n) => n.toLowerCase() === name.toLowerCase())) return;
    names.push(name);
    if (await saveSettingsPartial({ warehouses: names })) {
      e.target.reset();
      renderWarehouses();
    }
  });

  document.getElementById('warehousesList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="remove-warehouse"]');
    if (!btn) return;
    const names = [...warehouseList()];
    const name = names[parseInt(btn.dataset.index, 10)];
    const pieces = productsCache.reduce((sum, p) => sum + p.sizes.reduce((s, v) => s + ((v.warehouses && v.warehouses[name]) || 0), 0), 0);
    if (pieces > 0) {
      alert(`"${name}" todavía tiene ${pieces} piezas. Traspásalas a otro almacén antes de eliminarlo.`);
      return;
    }
    if (!confirm(`¿Eliminar el almacén "${name}"?`)) return;
    names.splice(parseInt(btn.dataset.index, 10), 1);
    if (await saveSettingsPartial({ warehouses: names })) renderWarehouses();
  });
})();
