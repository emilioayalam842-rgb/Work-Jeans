// Rastreo de pedido: el cliente consulta con su número de pedido y el correo o teléfono de la compra.
(function () {
  const form = document.getElementById('trackForm');
  const idInput = document.getElementById('trackId');
  const contactInput = document.getElementById('trackContact');
  const status = document.getElementById('trackStatus');
  const btn = document.getElementById('trackBtn');
  const result = document.getElementById('trackResult');
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const money = (c) => (c / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  const STEPS = [
    ['recibido', 'Recibido', 'Registramos tu pedido.'],
    ['pagado', 'Pagado', 'Confirmamos tu pago.'],
    ['preparacion', 'En preparación', 'Estamos armando tu pedido.'],
    ['enviado', 'Enviado', 'Va en camino con la paquetería.'],
    ['entregado', 'Entregado', 'Ya está contigo.'],
  ];
  const ORDER = { pendiente: 0, pagado: 1, preparacion: 2, enviado: 3, entregado: 4 };

  function render(o) {
    document.getElementById('trackOrderId').textContent = o.id;
    const badge = document.getElementById('trackBadge');
    badge.textContent = o.statusLabel;
    badge.className = `track-badge track-badge--${o.status}`;

    const special = o.status === 'cancelado' || o.status === 'devuelto';
    const current = special ? -1 : ORDER[o.status] ?? 0;
    const dates = { recibido: o.createdAt, pagado: o.paidAt, preparacion: o.preparingAt, enviado: o.shippedAt, entregado: o.deliveredAt };
    document.getElementById('trackSteps').innerHTML = STEPS.map(([key, label, text], i) => {
      const state = special ? 'off' : i < current ? 'done' : i === current ? 'current' : 'todo';
      const when = dates[key] ? `<time>${fmtDate(dates[key])}</time>` : '';
      return `<li class="track-step track-step--${state}"><span class="track-dot" aria-hidden="true"></span><div><strong>${label}</strong><span>${text}</span>${when}</div></li>`;
    }).join('');

    let summary = '';
    if (o.status === 'pendiente') summary = o.paymentMethod === 'spei' || o.paymentMethod === 'store' ? 'Estamos esperando tu pago. En cuanto lo recibamos, preparamos tu pedido.' : 'Tu pedido está registrado. Te confirmamos por WhatsApp la forma de pago y el envío.';
    if (o.status === 'pagado') summary = 'Pago confirmado. Preparamos tu pedido en 1 a 2 días hábiles.';
    if (o.status === 'preparacion') summary = 'Tu pedido se está preparando. Te avisamos cuando salga con la paquetería.';
    if (o.status === 'enviado') summary = 'Tu pedido va en camino. La entrega suele tardar de 3 a 7 días hábiles según el destino.';
    if (o.status === 'entregado') summary = `Entregado${o.deliveredAt ? ` el ${fmtDate(o.deliveredAt)}` : ''}. Si algo no quedó bien, tienes 15 días para cambio de talla con la prenda sin usar y con etiquetas.`;
    if (o.status === 'cancelado') summary = 'Este pedido fue cancelado. Si pagaste con tarjeta, el reembolso aparece en tu estado de cuenta en los días que marque tu banco.';
    if (o.status === 'devuelto') summary = 'Este pedido fue devuelto. Si tienes dudas sobre el reembolso o el cambio, escríbenos.';
    document.getElementById('trackSummary').textContent = summary;

    const ship = document.getElementById('trackShipping');
    if (o.tracking && (o.tracking.number || o.tracking.carrier)) {
      ship.hidden = false;
      ship.innerHTML = `<h3>Guía de envío</h3><p>${o.tracking.carrier ? `<b>${esc(o.tracking.carrier)}</b> · ` : ''}Guía <code>${esc(o.tracking.number || '')}</code></p>${o.tracking.url ? `<a class="btn btn-primary btn-sm" href="${esc(o.tracking.url)}" target="_blank" rel="noopener">Rastrear en la paquetería</a>` : ''}${o.destination ? `<p class="track-dest">Destino: ${esc(o.destination)}</p>` : ''}`;
    } else if (o.destination) {
      ship.hidden = false;
      ship.innerHTML = `<h3>Envío</h3><p class="track-dest">Destino: ${esc(o.destination)}</p>`;
    } else {
      ship.hidden = true;
      ship.innerHTML = '';
    }

    document.getElementById('trackItems').innerHTML = o.items.map((it) => `<li><span>${esc(it.name)}${it.size ? ` · Talla ${esc(it.size)}` : ''}</span><span>× ${it.quantity}</span></li>`).join('') + `<li class="track-total"><span>Total</span><span>${money(o.totalCents)}</span></li>`;
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function lookup(payload) {
    status.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Buscando…';
    try {
      const res = await fetch('/api/orders/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { result.hidden = true; status.textContent = data.error || 'No encontramos ese pedido.'; return; }
      render(data);
    } catch {
      status.textContent = 'Sin conexión. Intenta de nuevo.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Consultar pedido';
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = idInput.value.trim();
    const contact = contactInput.value.trim();
    if (!id) { status.textContent = 'Escribe tu número de pedido.'; idInput.focus(); return; }
    if (!contact) { status.textContent = 'Escribe el correo o teléfono con el que compraste.'; contactInput.focus(); return; }
    lookup({ id, contact });
  });

  const params = new URLSearchParams(location.search);
  const pre = params.get('pedido');
  const key = params.get('k');
  if (pre) idInput.value = pre;
  if (pre && key) lookup({ id: pre, key });
  else if (pre) contactInput.focus();
})();
