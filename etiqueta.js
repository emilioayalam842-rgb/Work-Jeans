const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const id = new URLSearchParams(location.search).get('id');
document.getElementById('soloEtiqueta').addEventListener('change', (e) => document.body.classList.toggle('solo-etiqueta', e.target.checked));

async function load() {
  const r = await fetch(`/api/admin/orders/${encodeURIComponent(id)}/etiqueta`);
  if (r.status === 401) throw new Error('Inicia sesión en el panel para ver la etiqueta.');
  if (!r.ok) throw new Error('Pedido no encontrado.');
  const { order, qr, store } = await r.json();
  const sh = order.shipping || {};
  document.getElementById('from').innerHTML = [store.name, store.address, store.phone ? `Tel. ${store.phone}` : ''].filter(Boolean).map(esc).join('<br>');
  document.getElementById('toName').textContent = sh.name || order.customerName || 'Sin nombre';
  const addr = [sh.line1, sh.line2, [sh.city, sh.state].filter(Boolean).join(', ')].filter(Boolean);
  document.getElementById('toAddr').innerHTML = addr.length ? addr.map(esc).join('<br>') : '<em>Sin dirección: entrega en tienda o por confirmar</em>';
  document.getElementById('toCp').textContent = sh.postalCode ? `C.P. ${sh.postalCode}` : '';
  document.getElementById('toPhone').textContent = (order.customerPhone || sh.phone) ? `Tel. ${order.customerPhone || sh.phone}` : '';
  if (sh.references) { const el = document.getElementById('toRefs'); el.textContent = `Referencias: ${sh.references}`; el.hidden = false; }
  document.getElementById('orderId').textContent = order.id;
  const pieces = order.items.reduce((a, i) => a + i.quantity, 0);
  document.getElementById('pieces').textContent = `${pieces} pieza${pieces === 1 ? '' : 's'}`;
  if (order.tracking && (order.tracking.carrier || order.tracking.number)) { const el = document.getElementById('carrier'); el.innerHTML = `<b>${esc(order.tracking.carrier || '')}</b><br>${esc(order.tracking.number || '')}`; el.hidden = false; }
  if (qr) { const img = document.getElementById('qr'); img.src = qr; img.hidden = false; }
  document.getElementById('packMeta').textContent = `Pedido ${order.id} · ${new Date(order.createdAt).toLocaleDateString('es-MX', { dateStyle: 'long' })} · ${order.customerName || ''}`;
  document.getElementById('items').innerHTML = order.items.map((i) => `<tr><td class="chk">☐</td><td>${esc(i.name)}</td><td>${esc(i.size) || '—'}</td><td class="num">${i.quantity}</td></tr>`).join('');
  document.getElementById('totalPieces').textContent = pieces;
  if (order.notes) { const el = document.getElementById('notes'); el.textContent = `Notas: ${order.notes}`; el.hidden = false; }
  document.title = `Etiqueta ${order.id} | Works Jeans`;
  document.getElementById('sheet').hidden = false;
}
load().catch((err) => { const el = document.getElementById('error'); el.textContent = err.message; el.hidden = false; });
