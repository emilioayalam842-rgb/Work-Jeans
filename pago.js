// Página de pago: toma el carrito del navegador, calcula envío por CP, pide datos de entrega y factura,
// y crea el cobro (tarjeta, SPEI o tienda) en el servidor. Los datos de tarjeta nunca pasan por aquí.

(function () {
  const CART_KEY = 'worksjeans_cart';
  const COUPON_KEY = 'worksjeans_coupon';
  const ZIP_KEY = 'worksjeans_zip';
  const INVOICE_KEY = 'worksjeans_invoice';
  const DRAFT_KEY = 'worksjeans_checkout';
  const RFC_RE = /^([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}$/;
  const money = (c) => (c / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  const $ = (id) => document.getElementById(id);
  const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
  const readStr = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };

  const cart = read(CART_KEY, []);
  const status = $('coStatus');
  let quote = null;
  let quoteTimer = null;

  if (!Array.isArray(cart) || cart.length === 0) {
    document.querySelector('.checkout-grid').innerHTML = '<div class="checkout-empty"><h1>Tu carrito está vacío.</h1><p>Agrega productos y vuelve aquí para pagar.</p><a class="btn btn-primary" href="/pantalones-de-trabajo">Ver pantalones</a></div>';
    return;
  }

  // Borradores: CP, factura y datos de entrega capturados antes
  $('coZip').value = readStr(ZIP_KEY).slice(0, 5);
  const inv = read(INVOICE_KEY, null);
  if (inv && inv.open) {
    $('coInvoiceWanted').checked = true;
    $('coInvoiceFields').hidden = false;
    $('coRfc').value = inv.rfc || ''; $('coRazon').value = inv.name || ''; $('coFiscalZip').value = inv.zip || ''; $('coInvoiceEmail').value = inv.email || '';
    $('coRegimen').dataset.value = inv.regimen || ''; $('coUso').dataset.value = inv.uso || '';
  }
  const draft = read(DRAFT_KEY, null);
  if (draft) ['coName', 'coEmail', 'coPhone', 'coLine1', 'coLine2', 'coCity', 'coState', 'coRef'].forEach((id) => { if (draft[id]) $(id).value = draft[id]; });
  document.querySelectorAll('#checkoutForm input, #checkoutForm select').forEach((el) => el.addEventListener('input', () => {
    const d = {}; ['coName', 'coEmail', 'coPhone', 'coLine1', 'coLine2', 'coCity', 'coState', 'coRef'].forEach((id) => { d[id] = $(id).value; });
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* sin almacenamiento */ }
  }));

  fetch('/api/sat-catalogs').then((r) => r.json()).then((data) => {
    const fill = (id, map) => { const sel = $(id); const cur = sel.dataset.value || ''; sel.innerHTML = '<option value="">Elige…</option>' + Object.entries(map).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${k} · ${v}</option>`).join(''); };
    fill('coRegimen', data.regimenes); fill('coUso', data.usos);
  }).catch(() => {});
  $('coInvoiceWanted').addEventListener('change', (e) => { $('coInvoiceFields').hidden = !e.target.checked; });

  // Métodos disponibles según lo configurado en el servidor
  fetch('settings.json').then((r) => r.json()).then((s) => {
    const p = s.payments || {};
    if (!p.provider) { status.textContent = 'El pago en línea no está disponible ahora mismo. Pide por WhatsApp desde el carrito.'; $('coSubmit').disabled = true; return; }
    if (!p.spei) document.querySelector('input[value="spei"]').closest('label').hidden = true;
    if (p.store) $('coStoreMethod').hidden = false;
    if (p.provider === 'stripe') { document.querySelectorAll('.checkout-method').forEach((l, i) => { if (i > 0) l.hidden = true; }); document.querySelector('.checkout-method small').textContent = 'Pago inmediato en la página segura de Stripe.'; }
  }).catch(() => {});

  let productImages = {};
  fetch('/products.json').then((r) => r.json()).then((list) => { (list || []).forEach((p) => { productImages[p.id] = p.image; }); renderItems(); }).catch(() => {});
  function renderItems() {
    $('coItems').innerHTML = cart.map((i) => `<div class="checkout-item">${productImages[i.id] ? `<img src="/img/320/${productImages[i.id]}" alt="" width="48" height="60" loading="lazy">` : ''}<span>${i.name}<small>Talla ${i.size} · ${i.quantity} pza${i.quantity > 1 ? 's' : ''}</small></span><b>${money(i.priceCents * i.quantity)}</b></div>`).join('');
  }

  async function refreshQuote() {
    const zip = $('coZip').value.replace(/\D/g, '').slice(0, 5);
    try { localStorage.setItem(ZIP_KEY, zip); } catch { /* sin almacenamiento */ }
    try {
      const res = await fetch('/api/cart/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart.map((i) => ({ id: i.id, size: i.size, quantity: i.quantity })), code: readStr(COUPON_KEY) || null, postalCode: zip }) });
      quote = await res.json();
      if (quote.codeError && readStr(COUPON_KEY)) {
        // Un cupón viejo o inválido no debe bloquear el pago: se quita y se avisa.
        const bad = readStr(COUPON_KEY);
        try { localStorage.removeItem(COUPON_KEY); } catch { /* sin almacenamiento */ }
        status.textContent = `El cupón ${bad} ya no es válido y se quitó del pedido.`;
        return refreshQuote();
      }
      $('coSubtotal').textContent = money(quote.subtotalCents);
      $('coDiscountRow').hidden = !quote.discountCents;
      if (quote.discountCents) { $('coDiscountLabel').textContent = quote.discounts.map((d) => d.name).join(' + '); $('coDiscount').textContent = `−${money(quote.discountCents)}`; }
      const s = quote.shipping || {};
      $('coShipping').textContent = s.status === 'quoted' ? money(s.costCents) : s.status === 'free' ? 'Gratis' : s.status === 'pending_rates' ? 'Por confirmar' : 'Por calcular';
      $('coShipMsg').textContent = s.label || '';
      $('coShipMsg').classList.toggle('is-error', ['invalid_cp', 'unknown_cp', 'quote_required'].includes(s.status));
      $('coTotal').textContent = money(quote.totalCents);
      $('coSubmitTotal').textContent = money(quote.totalCents);
      document.dispatchEvent(new CustomEvent('wj-quote-ready'));
    } catch { status.textContent = 'No se pudo calcular el total. Revisa tu conexión.'; }
  }
  $('coZip').addEventListener('input', () => { $('coZip').value = $('coZip').value.replace(/\D/g, '').slice(0, 5); clearTimeout(quoteTimer); quoteTimer = setTimeout(refreshQuote, 250); });
  renderItems();
  refreshQuote();
  if (cart.length) window.wjTrack?.('view_cart', { items: cart, valueCents: cart.reduce((t, i) => t + i.priceCents * i.quantity, 0) });
  // El costo de envío queda confirmado cuando el código postal devuelve una zona válida.
  let envioAvisado = false;
  document.addEventListener('wj-quote-ready', () => {
    if (envioAvisado || !quote || !quote.shipping) return;
    if (!['quoted', 'free', 'pending_rates'].includes(quote.shipping.status)) return;
    envioAvisado = true;
    window.wjTrack?.('add_shipping_info', { items: cart, valueCents: quote.totalCents, shippingCents: quote.shipping.costCents || 0 });
  });
  document.querySelectorAll('input[name="method"]').forEach((r) => r.addEventListener('change', () => {
    window.wjTrack?.('add_payment_info', { items: cart, valueCents: quote ? quote.totalCents : undefined, method: r.value });
  }));

  function invoiceData() {
    if (!$('coInvoiceWanted').checked) return null;
    return { rfc: $('coRfc').value.trim().toUpperCase(), name: $('coRazon').value.trim(), zip: $('coFiscalZip').value.trim(), regimen: $('coRegimen').value, uso: $('coUso').value, email: $('coInvoiceEmail').value.trim() || $('coEmail').value.trim() };
  }
  function problem() {
    const req = [['coName', 'Escribe tu nombre.'], ['coEmail', 'Escribe tu correo.'], ['coPhone', 'Escribe tu teléfono.'], ['coLine1', 'Escribe calle y número.'], ['coLine2', 'Escribe la colonia.'], ['coZip', 'Escribe el código postal.'], ['coCity', 'Escribe la ciudad.'], ['coState', 'Elige el estado.']];
    for (const [id, msg] of req) if (!$(id).value.trim()) { $(id).focus(); return msg; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($('coEmail').value.trim())) { $('coEmail').focus(); return 'El correo no es válido.'; }
    if ($('coPhone').value.replace(/\D/g, '').length < 10) { $('coPhone').focus(); return 'El teléfono debe tener 10 dígitos.'; }
    if (!/^\d{5}$/.test($('coZip').value)) { $('coZip').focus(); return 'El código postal debe tener 5 dígitos.'; }
    const s = quote?.shipping || {};
    if (['invalid_cp', 'unknown_cp'].includes(s.status)) return s.label;
    if (s.status === 'quote_required') return `${s.label} Cotiza en /empresas.`;
    const inv = invoiceData();
    if (inv) {
      if (!RFC_RE.test(inv.rfc)) { $('coRfc').focus(); return 'Revisa el RFC (12 o 13 caracteres).'; }
      if (!inv.name) { $('coRazon').focus(); return 'Escribe el nombre o razón social para la factura.'; }
      if (!/^\d{5}$/.test(inv.zip)) { $('coFiscalZip').focus(); return 'El código postal fiscal debe tener 5 dígitos.'; }
      if (!inv.regimen) { $('coRegimen').focus(); return 'Elige tu régimen fiscal.'; }
      if (!inv.uso) { $('coUso').focus(); return 'Elige el uso de CFDI.'; }
    }
    return '';
  }

  $('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    const p = problem();
    if (p) { status.textContent = p; return; }
    const btn = $('coSubmit');
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.textContent = 'Procesando…';
    const token = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^\w-]/g, '');
    window.wjTrack?.('begin_checkout', { items: cart, valueCents: quote ? quote.totalCents : undefined });
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((i) => ({ id: i.id, size: i.size, quantity: i.quantity })),
          code: readStr(COUPON_KEY) || null,
          postalCode: $('coZip').value,
          checkoutToken: token,
          method: document.querySelector('input[name="method"]:checked').value,
          customer: { name: $('coName').value.trim(), email: $('coEmail').value.trim(), phone: $('coPhone').value.trim() },
          shipping: { line1: $('coLine1').value.trim(), line2: $('coLine2').value.trim(), city: $('coCity').value.trim(), state: $('coState').value, postalCode: $('coZip').value, references: $('coRef').value.trim() },
          invoice: invoiceData(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { status.textContent = data.error || 'No se pudo iniciar el pago.'; btn.disabled = false; btn.innerHTML = original; return; }
      if (data.url) { window.location.href = data.url; return; }
      if (data.orderId) { window.location.href = `/success.html?order=${encodeURIComponent(data.orderId)}&k=${encodeURIComponent(data.key || '')}`; return; }
      status.textContent = 'Respuesta inesperada. Intenta de nuevo o escríbenos por WhatsApp.';
      btn.disabled = false; btn.innerHTML = original;
    } catch {
      status.textContent = 'Sin conexión con el servidor. Intenta de nuevo.';
      btn.disabled = false; btn.innerHTML = original;
    }
  });
})();
