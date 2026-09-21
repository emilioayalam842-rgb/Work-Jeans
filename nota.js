const STATUS_LABELS = { pendiente: 'Pendiente', pagado: 'Pagado', preparacion: 'En preparación', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado' };
const money = (c) => (c / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const id = new URLSearchParams(location.search).get('id');

async function load() {
  const [orderRes, settingsRes] = await Promise.all([fetch(`/api/admin/orders/${encodeURIComponent(id)}`), fetch('/api/settings')]);
  if (orderRes.status === 401) throw new Error('Inicia sesión en el panel para ver la nota.');
  if (!orderRes.ok) throw new Error('Pedido no encontrado.');
  const order = await orderRes.json();
  const settings = await settingsRes.json();

  document.getElementById('store').innerHTML = `${settings.storeName || 'Works Jeans'}<br>${settings.address || ''}<br>Tel. ${settings.phoneDisplay || ''}`;
  document.getElementById('orderId').textContent = `Pedido ${order.id}`;
  document.getElementById('orderDate').textContent = new Date(order.createdAt).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
  document.getElementById('orderStatus').textContent = `${STATUS_LABELS[order.status] || order.status} · ${order.source === 'stripe' || order.source === 'openpay' ? 'Tarjeta' : 'WhatsApp'}`;
  document.getElementById('customer').innerHTML = [order.customerName || 'Sin nombre', order.customerPhone, order.customerEmail].filter(Boolean).map(esc).join('<br>');
  const ship = order.shipping ? [order.shipping.name, order.shipping.line1, order.shipping.line2, [order.shipping.city, order.shipping.state, order.shipping.postalCode].filter(Boolean).join(', ')].filter(Boolean).map(esc) : [];
  if (order.tracking && (order.tracking.carrier || order.tracking.number)) ship.push(`<strong>${esc([order.tracking.carrier, order.tracking.number].filter(Boolean).join(' · '))}</strong>`);
  document.getElementById('shipping').innerHTML = ship.length ? ship.join('<br>') : 'Entrega en tienda / por confirmar';
  document.getElementById('items').innerHTML = order.items.map((i) => `<tr><td>${esc(i.name)}</td><td>${esc(i.size) || '—'}</td><td class="num">${i.quantity}</td><td class="num">${money(i.priceCents)}</td><td class="num">${money(i.priceCents * i.quantity)}</td></tr>`).join('');
  document.getElementById('total').textContent = money(order.totalCents);
  if (order.notes) {
    document.getElementById('notes').textContent = `Notas: ${order.notes}`;
    document.getElementById('notes').hidden = false;
  }
  document.title = `Nota ${order.id} | Works Jeans`;
  document.getElementById('sheet').hidden = false;
}

load().catch((err) => {
  const el = document.getElementById('error');
  el.textContent = err.message;
  el.hidden = false;
});
