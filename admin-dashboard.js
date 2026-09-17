// Panel admin · Dashboard v3: saludo, ventas de hoy con comparación, lista "qué atender ahora" y gráfica de línea.
(function () {
  const DAY = 24 * 60 * 60 * 1000;
  const valid = () => ordersCache.filter((o) => !['cancelado', 'devuelto'].includes(o.status));
  const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const sum = (list) => list.reduce((s, o) => s + o.totalCents, 0);
  const inRange = (o, from, to) => { const t = new Date(o.createdAt).getTime(); return t >= from && t < to; };
  const hoursAgo = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  const ago = (iso) => { const h = hoursAgo(iso); if (h < 1) return 'hace minutos'; if (h < 24) return `hace ${h} h`; const d = Math.floor(h / 24); return `hace ${d} día${d === 1 ? '' : 's'}`; };
  let leadsCache = [];
  let reviewsCacheD = [];

  function delta(el, now, before, label) {
    if (!el) return;
    if (!before) { el.textContent = now ? `Sin ${label} para comparar` : `Sin ventas ${label}`; el.className = el.className.replace(/ is-(up|down)/g, ''); return; }
    const p = Math.round(((now - before) / before) * 100);
    el.textContent = `${p >= 0 ? '+' : ''}${p}% vs ${label} (${formatPrice(before)})`;
    el.className = el.className.replace(/ is-(up|down)/g, '') + (p >= 0 ? ' is-up' : ' is-down');
  }

  function lineChart(el, points, prev) {
    if (!el) return;
    const w = 720; const h = 200; const padL = 46; const padR = 10; const padT = 14; const padB = 28;
    const innerW = w - padL - padR; const innerH = h - padT - padB;
    const max = Math.max(1, ...points.map((p) => p.value), ...prev.map((v) => v));
    const x = (i) => padL + (i / (points.length - 1)) * innerW;
    const y = (v) => padT + innerH - (v / max) * innerH;
    const path = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const cur = points.map((p) => p.value);
    const area = `${path(cur)} L${x(cur.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`;
    const ticks = [0, 0.5, 1].map((t) => ({ y: y(max * t), v: max * t }));
    const fmt = (v) => formatPrice(v).replace(/\.00$/, '');
    const labels = points.map((p, i) => (i % 5 === 0 || i === points.length - 1 ? `<text x="${x(i).toFixed(1)}" y="${h - 8}" text-anchor="middle" font-size="10" fill="#888">${p.label}</text>` : '')).join('');
    const dots = points.map((p, i) => (p.value ? `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="3.5" fill="#ffd600" stroke="#0f0f0f" stroke-width="1.5"><title>${p.label}: ${formatPrice(p.value)}</title></circle>` : '')).join('');
    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" class="admin-chart" role="img">
      <defs><linearGradient id="dGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffd600" stop-opacity="0.45"/><stop offset="1" stop-color="#ffd600" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map((t) => `<line x1="${padL}" x2="${w - padR}" y1="${t.y.toFixed(1)}" y2="${t.y.toFixed(1)}" stroke="#eee"/><text x="${padL - 6}" y="${(t.y + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#888">${fmt(Math.round(t.v))}</text>`).join('')}
      <path d="${path(prev)}" fill="none" stroke="#d0d0d0" stroke-width="1.5" stroke-dasharray="4 4"/>
      <path d="${area}" fill="url(#dGrad)"/>
      <path d="${path(cur)}" fill="none" stroke="#0f0f0f" stroke-width="2" stroke-linejoin="round"/>
      ${dots}${labels}
    </svg>`;
  }

  async function loadExtras() {
    try { const r = await fetch('/api/admin/leads'); if (r.ok) leadsCache = await r.json(); } catch { leadsCache = []; }
    try { const r = await fetch('/api/admin/reviews'); if (r.ok) reviewsCacheD = await r.json(); } catch { reviewsCacheD = []; }
  }

  function renderTodo() {
    const el = document.getElementById('dTodo');
    if (!el) return;
    const items = [];
    const unpaid = ordersCache.filter((o) => o.status === 'pendiente');
    unpaid.filter((o) => hoursAgo(o.createdAt) >= 24).forEach((o) => items.push({ level: 'warn', text: `<b>${esc(o.customerName || 'Pedido')}</b> sigue sin pagar ${ago(o.createdAt)} · ${formatPrice(o.totalCents)}`, action: 'Cobrar', goto: 'pedidos', order: o.id, prio: 2 }));
    ordersCache.filter((o) => ['pagado', 'preparacion'].includes(o.status)).forEach((o) => items.push({ level: hoursAgo(o.createdAt) >= 48 ? 'warn' : 'info', text: `<b>${esc(o.customerName || 'Pedido')}</b> pagó ${ago(o.payment?.paidAt || o.createdAt)} y está por enviar · ${formatPrice(o.totalCents)}`, action: 'Enviar', goto: 'pedidos', order: o.id, prio: 1 }));
    ordersCache.filter((o) => o.status === 'enviado' && o.shippedAt && hoursAgo(o.shippedAt) >= 7 * 24).forEach((o) => items.push({ level: 'info', text: `<b>${esc(o.customerName || 'Pedido')}</b> se envió ${ago(o.shippedAt)}: confirma la entrega`, action: 'Revisar', goto: 'pedidos', order: o.id, prio: 4 }));
    ordersCache.filter((o) => o.invoice?.requested && !o.invoice.issued && !['pendiente', 'cancelado'].includes(o.status)).forEach((o) => items.push({ level: 'info', text: `<b>${esc(o.customerName || 'Pedido')}</b> pidió factura (${esc(o.invoice.rfc || 'RFC pendiente')})`, action: 'Facturar', goto: 'pedidos', order: o.id, prio: 3 }));
    leadsCache.filter((l) => l.status === 'nuevo').forEach((l) => items.push({ level: 'warn', text: `Cotización nueva de <b>${esc(l.company || l.name)}</b> · ${l.totalPieces || 0} piezas · ${ago(l.createdAt)}`, action: 'Responder', goto: 'cotizaciones', prio: 1 }));
    const pendingReviews = reviewsCacheD.filter((r) => r.status === 'pendiente').length;
    if (pendingReviews) items.push({ level: 'info', text: `<b>${pendingReviews}</b> reseña${pendingReviews === 1 ? '' : 's'} por aprobar`, action: 'Moderar', goto: 'resenas', prio: 5 });
    const limit = lowStockLimit();
    const outVariants = [];
    productsCache.forEach((p) => { if (p.status && p.status !== 'activo') return; p.sizes.forEach((v) => { if (v.stock <= limit) outVariants.push(`${p.name} ${variantLabel(v)}`); }); });
    if (outVariants.length) items.push({ level: outVariants.length > 3 ? 'warn' : 'info', text: `<b>${outVariants.length}</b> talla${outVariants.length === 1 ? '' : 's'} con stock bajo o agotado (${esc(outVariants.slice(0, 2).join(', '))}${outVariants.length > 2 ? '…' : ''})`, action: 'Ver stock', goto: 'existencias', prio: 4 });
    items.sort((a, b) => a.prio - b.prio);
    document.getElementById('dTodoCount').textContent = items.length ? `${items.length} pendiente${items.length === 1 ? '' : 's'}` : '';
    el.innerHTML = items.length
      ? items.slice(0, 8).map((i) => `<li class="admin-todo-item is-${i.level}"><span class="admin-todo-dot" aria-hidden="true"></span><span class="admin-todo-text">${i.text}</span><button type="button" class="admin-inline-btn" data-goto="${i.goto}" ${i.order ? `data-open-order="${i.order}"` : ''}>${i.action}</button></li>`).join('') + (items.length > 8 ? `<li class="admin-muted admin-small">y ${items.length - 8} más…</li>` : '')
      : '<li class="admin-todo-empty">Todo al día. No hay pedidos por cobrar ni por enviar, ni cotizaciones sin responder.</li>';
  }

  function renderHero() {
    const orders = valid();
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const today = orders.filter((o) => inRange(o, startToday, startToday + DAY));
    const yesterday = orders.filter((o) => inRange(o, startToday - DAY, startToday));
    const week = orders.filter((o) => inRange(o, now.getTime() - 7 * DAY, now.getTime() + 1));
    const prevWeek = orders.filter((o) => inRange(o, now.getTime() - 14 * DAY, now.getTime() - 7 * DAY));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const month = orders.filter((o) => inRange(o, monthStart, now.getTime() + 1));
    const prevMonth = orders.filter((o) => inRange(o, prevMonthStart, monthStart));
    delta(document.getElementById('dTodayDelta'), sum(today), sum(yesterday), 'ayer');
    delta(document.getElementById('dWeekDelta'), sum(week), sum(prevWeek), 'la semana anterior');
    delta(document.getElementById('dMonthDelta'), sum(month), sum(prevMonth), 'el mes anterior');
    document.getElementById('dOrdersToday').textContent = today.length;
    document.getElementById('dUnpaid').textContent = ordersCache.filter((o) => o.status === 'pendiente').length;
    document.getElementById('dToShip').textContent = ordersCache.filter((o) => ['pagado', 'preparacion'].includes(o.status)).length;
    document.getElementById('dNewLeads').textContent = leadsCache.filter((l) => l.status === 'nuevo').length;

    const name = (document.getElementById('accountName')?.textContent || '').trim().split(' ')[0];
    const hour = now.getHours();
    const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
    document.getElementById('dGreeting').textContent = `${saludo}${name ? `, ${name}` : ''}.`;
    document.getElementById('dDateLine').textContent = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase());

    // Gráfica de 30 días con la línea punteada de los 30 días anteriores
    const days = []; const prevDays = [];
    for (let i = 29; i >= 0; i -= 1) { days.push(dayKey(new Date(startToday - i * DAY))); prevDays.push(dayKey(new Date(startToday - (i + 30) * DAY))); }
    const byDay = {};
    orders.forEach((o) => { const k = dayKey(o.createdAt); byDay[k] = (byDay[k] || 0) + o.totalCents; });
    const cur = days.map((k) => ({ label: k.slice(8).replace(/^0/, '') + '/' + k.slice(5, 7).replace(/^0/, ''), value: byDay[k] || 0 }));
    const prev = prevDays.map((k) => byDay[k] || 0);
    lineChart(document.getElementById('dChartLine'), cur, prev);
    const total30 = cur.reduce((s, p) => s + p.value, 0);
    const prev30 = prev.reduce((s, v) => s + v, 0);
    const daysWithSales = cur.filter((p) => p.value).length;
    const stats = [
      [formatPrice(total30), 'en 30 días'],
      [formatPrice(total30 / 30), 'promedio por día'],
      [String(daysWithSales), `día${daysWithSales === 1 ? '' : 's'} con ventas`],
    ];
    if (prev30) { const p = Math.round(((total30 - prev30) / prev30) * 100); stats.push([`${p >= 0 ? '+' : ''}${p}%`, 'vs. 30 días anteriores', p >= 0 ? 'is-up' : 'is-down']); }
    document.getElementById('dChartNote').innerHTML = stats.map(([v, l, c]) => `<div class="admin-chart-stat ${c || ''}"><b>${v}</b><span>${l}</span></div>`).join('');
  }

  const prevRender = window.renderDashboard;
  window.renderDashboard = async function () {
    await prevRender();
    await loadExtras();
    renderHero();
    renderTodo();
  };

  document.getElementById('dNewOrder')?.addEventListener('click', () => { showTab('pedidos'); setTimeout(() => document.getElementById('newOrderBtn')?.click(), 50); });
  document.getElementById('dTodo')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-order]');
    if (!btn) return;
    const id = btn.dataset.openOrder;
    setTimeout(() => document.querySelector(`#ordersTableBody tr[data-id="${id}"] [data-action="view-order"]`)?.click(), 250);
  });
})();
