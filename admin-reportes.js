// Panel admin · Dashboard v2, reportes con gráficas e inteligencia de inventario.
// Todo se calcula en el navegador a partir de pedidos, productos y devoluciones ya cargados.

(function () {
  window.__reportsV2 = true;
  const DAY = 24 * 60 * 60 * 1000;
  let returnsCache = [];

  const validOrders = () => ordersCache.filter((o) => !['cancelado', 'devuelto'].includes(o.status));
  const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const shortDay = (key) => { const [, m, d] = key.split('-'); return `${parseInt(d, 10)}/${parseInt(m, 10)}`; };
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');

  function parseVariant(label) {
    const parts = String(label || '').split(' / ');
    const size = parts[0] || '';
    const length = (parts.find((p) => /^L\d/.test(p)) || '').replace(/^L/, '');
    const color = parts.filter((p) => p !== size && !/^L\d/.test(p)).join(' / ');
    return { size, length, color };
  }

  function productOf(item) {
    return productsCache.find((p) => p.id === item.id);
  }

  function itemAttr(item, key) {
    const p = productOf(item);
    if (!p) return '—';
    const v = parseVariant(item.size);
    if (key === 'color') return v.color || p.wash || '—';
    if (key === 'size') return v.size || '—';
    if (key === 'sizeLength') return v.length ? `${v.size} × ${v.length}` : v.size || '—';
    return p[key] || '—';
  }

  // ---------- Gráficas SVG sin librerías ----------
  function barChart(el, points, { money = false, height = 180 } = {}) {
    if (!el) return;
    const max = Math.max(1, ...points.map((p) => p.value));
    const w = 720;
    const padL = 44;
    const padB = 26;
    const innerW = w - padL - 8;
    const innerH = height - padB - 10;
    const bw = innerW / points.length;
    const fmt = (v) => (money ? formatPrice(v).replace(/\.00$/, '') : v);
    const ticks = [0, 0.5, 1].map((t) => ({ y: 10 + innerH - innerH * t, v: max * t }));
    const bars = points.map((p, i) => {
      const h = (p.value / max) * innerH;
      const x = padL + i * bw + bw * 0.15;
      const y = 10 + innerH - h;
      const labelEvery = Math.ceil(points.length / 10);
      return `<g><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${p.value ? '#ffd600' : '#e5e5e5'}" stroke="#0f0f0f" stroke-width="${p.value ? 1 : 0}"><title>${p.label}: ${fmt(p.value)}</title></rect>${i % labelEvery === 0 ? `<text x="${(x + bw * 0.35).toFixed(1)}" y="${height - 8}" text-anchor="middle" font-size="10" fill="#666">${p.label}</text>` : ''}</g>`;
    }).join('');
    el.innerHTML = `<svg viewBox="0 0 ${w} ${height}" class="admin-chart" role="img">
      ${ticks.map((t) => `<line x1="${padL}" x2="${w - 8}" y1="${t.y}" y2="${t.y}" stroke="#eee"/><text x="${padL - 6}" y="${t.y + 3}" text-anchor="end" font-size="10" fill="#888">${fmt(Math.round(t.v))}</text>`).join('')}
      ${bars}
    </svg>`;
  }

  function rankList(el, rows, { money = false, suffix = '' } = {}) {
    if (!el) return;
    const max = Math.max(1, ...rows.map((r) => r.value));
    el.innerHTML = rows.length ? rows.map((r) => `
      <li class="admin-rank-row">
        <span class="admin-rank-name">${r.label}</span>
        <span class="admin-rank-bar"><i style="width:${Math.round((r.value / max) * 100)}%"></i></span>
        <span class="admin-rank-value">${money ? formatPrice(r.value) : r.value}${suffix}</span>
      </li>`).join('') : '<li class="admin-muted">Sin datos todavía.</li>';
  }

  function topBy(orders, keyFn, { value = 'units', limit = 6 } = {}) {
    const acc = {};
    orders.forEach((o) => o.items.forEach((i) => {
      const k = keyFn(i);
      if (!k || k === '—') return;
      acc[k] = (acc[k] || 0) + (value === 'units' ? i.quantity : i.priceCents * i.quantity);
    }));
    return Object.entries(acc).map(([label, v]) => ({ label, value: v })).sort((a, b) => b.value - a.value).slice(0, limit);
  }

  // ---------- Inteligencia de inventario ----------
  function inventoryIntelligence() {
    const now = Date.now();
    const sold30 = {};
    const sold60 = {};
    validOrders().forEach((o) => {
      const age = now - new Date(o.createdAt).getTime();
      o.items.forEach((i) => {
        const k = `${i.id}|${i.size || ''}`;
        if (age <= 30 * DAY) sold30[k] = (sold30[k] || 0) + i.quantity;
        if (age <= 60 * DAY) sold60[k] = (sold60[k] || 0) + i.quantity;
      });
    });
    const risk = [];
    const slow = [];
    productsCache.forEach((p) => {
      if (p.status && p.status !== 'activo') return;
      p.sizes.forEach((v) => {
        const label = variantLabel(v);
        const k = `${p.id}|${label}`;
        const rate = (sold30[k] || 0) / 30;
        const days = rate > 0 ? v.stock / rate : null;
        if (rate > 0 && days !== null && days <= 14) risk.push({ product: p.name, label, stock: v.stock, rate, days });
        if (v.stock >= 20 && (sold60[k] || 0) <= 3) slow.push({ product: p.name, label, stock: v.stock, sold: sold60[k] || 0, cost: v.stock * (v.costCents || p.costCents || 0) });
      });
    });
    risk.sort((a, b) => a.days - b.days);
    slow.sort((a, b) => b.cost - a.cost);
    return { risk, slow };
  }

  function renderInsights(el, { limit = 6 } = {}) {
    if (!el) return;
    const { risk, slow } = inventoryIntelligence();
    const cards = [
      ...risk.slice(0, limit).map((r) => `<div class="admin-alert ${r.days <= 3 ? 'is-out' : ''}"><strong>Riesgo de agotarse</strong>${r.product} · ${r.label}<span>Stock ${r.stock} · venta promedio ${r.rate.toFixed(1)}/día · inventario estimado: ${Math.max(0, Math.round(r.days))} días.</span></div>`),
      ...slow.slice(0, limit).map((s) => `<div class="admin-alert is-slow"><strong>Inventario lento</strong>${s.product} · ${s.label}<span>${s.stock} piezas · solo ${s.sold} ventas en 60 días · ${formatPrice(s.cost)} detenidos.</span></div>`),
    ];
    el.innerHTML = cards.length ? cards.join('') : '<div class="admin-alert is-ok"><strong>Todo en orden</strong>Sin variantes en riesgo ni inventario lento con los datos actuales.</div>';
  }

  // ---------- Dashboard v2 ----------
  async function loadReturnsCache() {
    try {
      const res = await fetch('/api/admin/returns');
      if (res.ok) returnsCache = await res.json();
    } catch {
      returnsCache = [];
    }
  }

  function renderDashboardV2() {
    const orders = validOrders();
    const now = new Date();
    const todayKey = dayKey(now);
    const weekStart = now.getTime() - 7 * DAY;
    const monthOrders = orders.filter((o) => { const d = new Date(o.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const sum = (list) => list.reduce((s, o) => s + o.totalCents, 0);
    const units = (list) => list.reduce((s, o) => s + orderPieces(o), 0);
    const todayOrders = orders.filter((o) => dayKey(o.createdAt) === todayKey);
    const weekOrders = orders.filter((o) => new Date(o.createdAt).getTime() >= weekStart);
    document.getElementById('dSalesToday').textContent = formatPrice(sum(todayOrders));
    document.getElementById('dSalesWeek').textContent = formatPrice(sum(weekOrders));
    document.getElementById('dSalesMonth').textContent = formatPrice(sum(monthOrders));
    document.getElementById('dTicket').textContent = monthOrders.length ? formatPrice(sum(monthOrders) / monthOrders.length) : '—';
    document.getElementById('dUnits').textContent = units(monthOrders);
    const cost = monthOrders.reduce((s, o) => s + orderCost(o), 0);
    document.getElementById('dProfit').textContent = formatPrice(sum(monthOrders) - cost);
    document.getElementById('dProfitNote').textContent = marginText(sum(monthOrders), sum(monthOrders) - cost) || 'Captura costos para ver el margen';
    document.getElementById('dPending').textContent = ordersCache.filter((o) => ['pendiente', 'pagado', 'preparacion', 'enviado'].includes(o.status)).length;
    const monthReturns = returnsCache.filter((r) => { const d = new Date(r.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    document.getElementById('dReturns').textContent = monthReturns.reduce((s, r) => s + r.items.reduce((a, i) => a + i.qty, 0), 0);

    // Ventas últimos 30 días
    const days = [];
    for (let i = 29; i >= 0; i -= 1) days.push(dayKey(new Date(now.getTime() - i * DAY)));
    const byDay = {};
    orders.forEach((o) => { const k = dayKey(o.createdAt); byDay[k] = (byDay[k] || 0) + o.totalCents; });
    barChart(document.getElementById('dChart'), days.map((k) => ({ label: shortDay(k), value: byDay[k] || 0 })), { money: true });

    rankList(document.getElementById('dTopProducts'), topBy(monthOrders, (i) => i.name), { suffix: ' pzas' });
    rankList(document.getElementById('dTopSizes'), topBy(monthOrders, (i) => itemAttr(i, 'size')), { suffix: ' pzas' });
    rankList(document.getElementById('dTopColors'), topBy(monthOrders, (i) => itemAttr(i, 'color')), { suffix: ' pzas' });

    const limit = lowStockLimit();
    const low = [];
    const out = [];
    productsCache.forEach((p) => {
      if (p.status && p.status !== 'activo') return;
      p.sizes.forEach((v) => {
        if (v.stock === 0) out.push(`${p.name} · ${variantLabel(v)}`);
        else if (v.stock <= limit) low.push(`${p.name} · ${variantLabel(v)} <span class="admin-rank-value">${v.stock}</span>`);
      });
    });
    document.getElementById('dLowStock').innerHTML = low.length ? low.slice(0, 8).map((h) => `<li>${h}</li>`).join('') + (low.length > 8 ? `<li class="admin-muted">y ${low.length - 8} más…</li>` : '') : '<li class="admin-muted">Ninguna variante en stock bajo.</li>';
    document.getElementById('dOutStock').innerHTML = out.length ? out.slice(0, 8).map((h) => `<li>${h}</li>`).join('') + (out.length > 8 ? `<li class="admin-muted">y ${out.length - 8} más…</li>` : '') : '<li class="admin-muted">Nada agotado.</li>';
    renderInsights(document.getElementById('dInsights'), { limit: 3 });
  }

  const baseRenderDashboard = window.renderDashboard;
  window.renderDashboard = async function () {
    baseRenderDashboard();
    await loadReturnsCache();
    renderDashboardV2();
  };

  // ---------- Reportes ----------
  function reportRangeV2() {
    const value = document.getElementById('reportPeriod').value;
    const now = new Date();
    if (value === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (value === 'year') return new Date(now.getFullYear(), 0, 1);
    if (value === 'all') return null;
    return new Date(now.getTime() - parseInt(value, 10) * DAY);
  }

  window.renderReports = async function renderReports() {
    await loadReturnsCache();
    const from = reportRangeV2();
    const orders = validOrders().filter((o) => !from || new Date(o.createdAt) >= from);
    const sales = orders.reduce((s, o) => s + o.totalCents, 0);
    const cost = orders.reduce((s, o) => s + orderCost(o), 0);
    const pieces = orders.reduce((s, o) => s + orderPieces(o), 0);
    document.getElementById('repSales').textContent = formatPrice(sales);
    document.getElementById('repSales2').textContent = formatPrice(sales);
    document.getElementById('repCost').textContent = formatPrice(cost);
    document.getElementById('repProfit').textContent = formatPrice(sales - cost);
    document.getElementById('repMargin').textContent = marginText(sales, sales - cost);
    document.getElementById('repPieces').textContent = pieces;
    document.getElementById('repOrders').textContent = orders.length;
    document.getElementById('repTicket').textContent = orders.length ? formatPrice(sales / orders.length) : '—';

    // Ventas por día (o por mes si el periodo es largo)
    const span = from ? (Date.now() - from.getTime()) / DAY : 365;
    const points = [];
    if (span <= 95) {
      const start = from || new Date(Date.now() - 90 * DAY);
      const byDay = {};
      orders.forEach((o) => { const k = dayKey(o.createdAt); byDay[k] = (byDay[k] || 0) + o.totalCents; });
      for (let t = start.getTime(); t <= Date.now(); t += DAY) { const k = dayKey(new Date(t)); points.push({ label: shortDay(k), value: byDay[k] || 0 }); }
    } else {
      const byMonth = {};
      orders.forEach((o) => { const k = monthKey(o.createdAt); byMonth[k] = (byMonth[k] || 0) + o.totalCents; });
      Object.keys(byMonth).sort().forEach((k) => points.push({ label: monthLabel(k).slice(0, 3), value: byMonth[k] }));
    }
    barChart(document.getElementById('repChart'), points, { money: true, height: 200 });

    // Por canal
    const channels = { stripe: { orders: 0, sales: 0 }, whatsapp: { orders: 0, sales: 0 } };
    orders.forEach((o) => { const c = o.source === 'stripe' ? 'stripe' : 'whatsapp'; channels[c].orders += 1; channels[c].sales += o.totalCents; });
    document.getElementById('repChannelBody').innerHTML = [['Pago con tarjeta', channels.stripe], ['WhatsApp / mostrador', channels.whatsapp]].map(([n, c]) => `<tr><td>${n}</td><td>${c.orders}</td><td>${formatPrice(c.sales)}</td><td>${pct(c.sales, sales)}</td></tr>`).join('');

    // Producto: modelo, corte, color, talla, talla/largo
    const byModel = {};
    orders.forEach((o) => o.items.forEach((i) => {
      byModel[i.name] = byModel[i.name] || { units: 0, sales: 0, cost: 0 };
      byModel[i.name].units += i.quantity;
      byModel[i.name].sales += i.priceCents * i.quantity;
      byModel[i.name].cost += itemCost(i) * i.quantity;
    }));
    const models = Object.entries(byModel).sort((a, b) => b[1].sales - a[1].sales);
    document.getElementById('repProfitBody').innerHTML = models.length ? models.map(([n, m]) => `<tr><td>${n}</td><td>${m.units}</td><td>${formatPrice(m.sales)}</td><td>${formatPrice(m.cost)}</td><td class="admin-profit">${formatPrice(m.sales - m.cost)}</td><td>${pct(m.sales - m.cost, m.sales)}</td></tr>`).join('') : '<tr><td colspan="6">Sin ventas en el periodo.</td></tr>';
    rankList(document.getElementById('repFit'), topBy(orders, (i) => itemAttr(i, 'fit')), { suffix: ' pzas' });
    rankList(document.getElementById('repColor'), topBy(orders, (i) => itemAttr(i, 'color')), { suffix: ' pzas' });
    rankList(document.getElementById('repSize'), topBy(orders, (i) => itemAttr(i, 'size'), { limit: 10 }), { suffix: ' pzas' });
    rankList(document.getElementById('repSizeLength'), topBy(orders, (i) => itemAttr(i, 'sizeLength'), { limit: 10 }), { suffix: ' pzas' });

    // Inventario: totales, rotación, días de inventario, sin movimiento
    const active = productsCache.filter((p) => !p.status || p.status === 'activo');
    const stockUnits = active.reduce((s, p) => s + p.sizes.reduce((a, v) => a + v.stock, 0), 0);
    const stockCost = active.reduce((s, p) => s + p.sizes.reduce((a, v) => a + v.stock * (v.costCents || p.costCents || 0), 0), 0);
    const daysInPeriod = Math.max(1, from ? (Date.now() - from.getTime()) / DAY : 365);
    const dailyUnits = pieces / daysInPeriod;
    document.getElementById('repStockUnits').textContent = stockUnits;
    document.getElementById('repStockCost').textContent = formatPrice(stockCost);
    document.getElementById('repDaysStock').textContent = dailyUnits > 0 ? `${Math.round(stockUnits / dailyUnits)} días` : '—';
    document.getElementById('repRotation').textContent = stockUnits > 0 ? `${(pieces / stockUnits).toFixed(2)}×` : '—';
    const { risk, slow } = inventoryIntelligence();
    document.getElementById('repRiskBody').innerHTML = risk.length ? risk.slice(0, 12).map((r) => `<tr><td>${r.product}</td><td>${r.label}</td><td>${r.stock}</td><td>${r.rate.toFixed(1)}/día</td><td class="admin-stock-low">${Math.max(0, Math.round(r.days))} días</td></tr>`).join('') : '<tr><td colspan="5">Ninguna variante en riesgo con las ventas de los últimos 30 días.</td></tr>';
    document.getElementById('repSlowBody').innerHTML = slow.length ? slow.slice(0, 12).map((s) => `<tr><td>${s.product}</td><td>${s.label}</td><td>${s.stock}</td><td>${s.sold}</td><td>${formatPrice(s.cost)}</td></tr>`).join('') : '<tr><td colspan="5">Sin inventario lento (20+ piezas con 3 ventas o menos en 60 días).</td></tr>';
    renderInsights(document.getElementById('repInsights'));
  };

  document.getElementById('reportPeriod').addEventListener('change', () => window.renderReports());
  document.querySelectorAll('[data-report-print]').forEach((b) => b.addEventListener('click', () => window.print()));
})();
