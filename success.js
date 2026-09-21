const params = new URLSearchParams(window.location.search);
const setTrack = (id, k) => { const a = document.getElementById('trackLink'); if (a && id) a.href = `/rastrear?pedido=${encodeURIComponent(id)}${k ? `&k=${encodeURIComponent(k)}` : ''}`; };
const note = document.getElementById('orderNote');
const card = document.querySelector('.status-card');
const money = (c) => (c / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
function clearCart() { try { localStorage.removeItem('worksjeans_cart'); localStorage.removeItem('worksjeans_coupon'); } catch {} }
function setHead(eyebrow, title, text) { card.querySelector('.eyebrow').textContent = eyebrow; card.querySelector('h1').textContent = title; card.querySelector('p').textContent = text; }
// La compra se registra una sola vez por pedido, aunque el cliente recargue la página de gracias.
function registrarCompra(o) {
  if (!o || !o.id) return;
  let hechos = [];
  try { hechos = JSON.parse(sessionStorage.getItem('wj-compras') || '[]'); } catch { hechos = []; }
  if (hechos.includes(o.id)) return;
  hechos.push(o.id);
  try { sessionStorage.setItem('wj-compras', JSON.stringify(hechos.slice(-20))); } catch { /* sin almacenamiento */ }
  window.wjTrack?.('purchase', { orderId: o.id, valueCents: o.totalCents, shippingCents: o.shippingCostCents || 0, items: o.items || [] });
}

if (params.get('session_id')) {
  clearCart();
  fetch(`/api/verify-session?session_id=${encodeURIComponent(params.get('session_id'))}`).then((r) => r.json()).then((o) => { if (o.id) { note.textContent = `Pedido registrado: ${o.id}`; setTrack(o.id, o.key || o.accessKey); registrarCompra(o); } }).catch(() => {});
} else if (params.get('openpay') && params.get('id')) {
  setHead('Verificando pago', 'Un momento…', 'Estamos confirmando tu pago con el banco.');
  let tries = 0;
  const check = () => fetch(`/api/verify-openpay?id=${encodeURIComponent(params.get('id'))}`).then((r) => r.json()).then((d) => {
    if (d.paid) { clearCart(); setHead('Pago confirmado', '¡Gracias por tu compra!', 'Tu pago fue procesado correctamente. Te enviamos la confirmación por correo y te avisamos cuando salga tu pedido.'); note.textContent = `Pedido registrado: ${d.id}`; setTrack(d.id, d.key); return; }
    if (d.pending && tries++ < 6) { setTimeout(check, 2500); return; }
    setHead('Pago no completado', 'No se pudo cobrar.', d.message || 'El banco no autorizó el pago. Puedes intentar con otra tarjeta o pagar por transferencia.');
    note.innerHTML = '<a href="/pago" class="btn btn-secondary">Volver a intentar</a>';
  }).catch(() => { setHead('Sin respuesta', 'No pudimos verificar el pago.', 'Si ya pagaste, escríbenos por WhatsApp con tu correo y lo revisamos.'); });
  check();
} else if (params.get('order')) {
  fetch(`/api/orders/${encodeURIComponent(params.get('order'))}/status?k=${encodeURIComponent(params.get('k') || '')}`).then((r) => r.json()).then((o) => {
    if (!o.id) return;
    setTrack(o.id, params.get('k'));
    registrarCompra(o);
    clearCart();
    const p = o.payment || {};
    note.textContent = `Pedido ${o.id} · total ${money(o.totalCents)}`;
    const box = document.getElementById('speiBox');
    if (p.method === 'spei') {
      setHead('Pedido registrado', 'Falta tu transferencia.', 'Tu pedido está apartado. Haz la transferencia SPEI con estos datos y en cuanto la recibamos te confirmamos por correo y lo preparamos.');
      box.innerHTML = `<h2>Datos para transferir</h2><dl class="status-dl"><dt>Banco</dt><dd>${p.bank || '—'}</dd><dt>CLABE</dt><dd class="status-mono">${p.clabe || '—'}</dd><dt>Beneficiario</dt><dd>${p.beneficiary || 'Works Jeans'}</dd><dt>Monto exacto</dt><dd><b>${money(o.totalCents)}</b></dd>${p.agreement ? `<dt>Referencia</dt><dd class="status-mono">${p.agreement}</dd>` : ''}${p.dueDate ? `<dt>Vigencia</dt><dd>${new Date(p.dueDate).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}</dd>` : ''}</dl><p class="status-note">Transfiere el monto exacto desde tu banca en línea. También te enviamos estos datos a ${o.email}.</p>${p.sandbox ? '<p class="status-note">Modo de pruebas: no se mueve dinero real.</p>' : ''}`;
      box.hidden = false;
    } else if (p.method === 'store') {
      setHead('Pedido registrado', 'Paga en tienda.', 'Tu pedido está apartado. Paga en efectivo con esta referencia y en cuanto se acredite te confirmamos por correo.');
      box.innerHTML = `<h2>Referencia de pago</h2><dl class="status-dl"><dt>Referencia</dt><dd class="status-mono">${p.reference || '—'}</dd><dt>Monto exacto</dt><dd><b>${money(o.totalCents)}</b></dd>${p.dueDate ? `<dt>Vigencia</dt><dd>${new Date(p.dueDate).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}</dd>` : ''}</dl>${p.barcodeUrl ? `<img src="${p.barcodeUrl}" alt="Código de barras para pagar en tienda" style="max-width:100%">` : ''}<p class="status-note">Presenta la referencia en la caja. ${p.sandbox ? 'Modo de pruebas: no se mueve dinero real.' : ''}</p>`;
      box.hidden = false;
    } else {
      setHead('Pago confirmado', '¡Gracias por tu compra!', 'Tu pago fue procesado correctamente.');
    }
  }).catch(() => {});
} else {
  clearCart();
}
