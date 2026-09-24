// Panel admin · Links de pago: cobro a distancia por WhatsApp con la pasarela de Openpay.
(function () {
  const $ = (id) => document.getElementById(id);
  const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—');
  const ESTADOS = { pendiente: ['status-pendiente', 'Sin pagar'], pagado: ['status-pagado', 'Pagado'], fallido: ['status-cancelado', 'No se cobró'] };

  window.loadPagos = async function loadPagos() {
    const cuerpo = $('pagosBody');
    if (!cuerpo) return;
    try {
      const r = await fetch('/api/admin/links-pago');
      if (r.status === 401) { showLogin(); return; }
      if (!r.ok) throw new Error('No se pudieron leer los cobros.');
      const d = await r.json();
      $('pagosEstadoPasarela').innerHTML = d.activo
        ? `Pasarela conectada${d.sandbox ? ' <b>en modo de pruebas</b>: los cobros que generes aquí no son reales.' : '. Los cobros son reales.'}`
        : 'La pasarela no está conectada: faltan las variables de Openpay en el servidor. Puedes escribir los datos, pero el link no se va a generar.';
      $('pagoCrear').disabled = !d.activo;

      cuerpo.innerHTML = d.links.length ? d.links.map((l) => {
        const [clase, texto] = ESTADOS[l.status] || ESTADOS.pendiente;
        return `
        <tr data-id="${esc(l.id)}">
          <td>${fecha(l.createdAt)}</td>
          <td>${esc(l.customerName)}<br><span class="admin-muted admin-small">${esc(l.customerEmail)}</span></td>
          <td>${esc(l.concept)}</td>
          <td>${formatPrice(l.amountCents)}</td>
          <td><span class="admin-badge ${clase}">${texto}</span></td>
          <td class="admin-table-actions">
            <button type="button" class="admin-inline-btn" data-copiar="${esc(l.url)}">Copiar link</button>
            ${l.customerPhone ? `<a class="admin-inline-btn" target="_blank" rel="noopener" href="https://wa.me/52${esc(l.customerPhone)}?text=${encodeURIComponent(`Hola ${l.customerName}, aquí está tu link de pago de Works Jeans por ${(l.amountCents / 100).toFixed(2)} pesos: ${l.url}`)}">WhatsApp</a>` : ''}
            <button type="button" class="admin-inline-btn" data-revisar="${esc(l.id)}">Revisar</button>
          </td>
        </tr>`;
      }).join('') : '<tr><td colspan="6">Todavía no has generado ningún cobro.</td></tr>';
    } catch (err) {
      $('pagosEstadoPasarela').textContent = err.message;
    }
  };

  $('pagosRefrescar')?.addEventListener('click', () => window.loadPagos());

  $('pagoForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = $('pagoError');
    error.textContent = '';
    const boton = $('pagoCrear');
    boton.disabled = true;
    try {
      const r = await fetch('/api/admin/links-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: $('pagoImporte').value,
          concept: $('pagoConcepto').value,
          customerName: $('pagoNombre').value,
          customerEmail: $('pagoCorreo').value,
          customerPhone: $('pagoTelefono').value,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'No se pudo generar el cobro.');
      try { await navigator.clipboard.writeText(d.url); error.textContent = 'Link generado y copiado al portapapeles.'; } catch { error.textContent = 'Link generado.'; }
      $('pagoForm').reset();
      await window.loadPagos();
    } catch (err) {
      error.textContent = err.message;
    }
    boton.disabled = false;
  });

  $('pagosBody')?.addEventListener('click', async (e) => {
    const copiar = e.target.closest('[data-copiar]');
    if (copiar) {
      const antes = copiar.textContent;
      try { await navigator.clipboard.writeText(copiar.dataset.copiar); copiar.textContent = 'Copiado'; } catch { copiar.textContent = 'No se pudo'; }
      setTimeout(() => { copiar.textContent = antes; }, 1200);
      return;
    }
    const revisar = e.target.closest('[data-revisar]');
    if (!revisar) return;
    revisar.disabled = true;
    try {
      const r = await fetch(`/api/admin/links-pago/${encodeURIComponent(revisar.dataset.revisar)}/revisar`, { method: 'POST' });
      if (!r.ok) throw new Error('No se pudo consultar.');
      await window.loadPagos();
    } catch (err) {
      $('pagosEstadoPasarela').textContent = err.message;
    }
    revisar.disabled = false;
  });
})();
