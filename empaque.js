// Lista de empaque de varios pedidos a la vez: una hoja por pedido, lista para imprimir.
const ids = (new URLSearchParams(location.search).get('ids') || '').split(',').map((x) => x.trim()).filter(Boolean);
const hojas = document.getElementById('hojas');
const estado = document.getElementById('estado');
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (c) => (c / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

function hoja(d) {
  const o = d.order;
  const envio = [o.shipping?.name, o.shipping?.line1, o.shipping?.line2, o.shipping?.city, o.shipping?.state, o.shipping?.postalCode].filter(Boolean).join(', ');
  const piezas = (o.items || []).reduce((n, i) => n + i.quantity, 0);
  return `
    <article class="hoja">
      <div class="cab">
        <div>
          <h1>Lista de empaque</h1>
          <p class="id">${esc(o.id)}</p>
        </div>
        <div class="meta">
          ${esc(d.store.name)}<br>
          ${new Date(o.createdAt).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}<br>
          ${piezas} ${piezas === 1 ? 'pieza' : 'piezas'} · ${money(o.totalCents)}
        </div>
      </div>
      <div class="datos">
        <div><b>Cliente</b>${esc(o.customerName) || '—'}</div>
        <div><b>Teléfono</b>${esc(o.customerPhone) || '—'}</div>
        <div style="grid-column:1/-1"><b>Enviar a</b>${esc(envio) || 'Recoge en tienda'}</div>
        ${o.shipping?.references ? `<div style="grid-column:1/-1"><b>Referencias</b>${esc(o.shipping.references)}</div>` : ''}
      </div>
      <table>
        <thead><tr><th></th><th>Cant.</th><th>Prenda</th><th>Talla</th></tr></thead>
        <tbody>
          ${(o.items || []).map((i) => `
            <tr>
              <td class="check"><span></span></td>
              <td class="cant">${i.quantity}</td>
              <td>${esc(i.name)}</td>
              <td>${esc(i.size) || '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      ${o.invoice?.requested && !o.invoice?.issued ? '<p class="aviso">Este pedido pide factura. Emítela antes de cerrar la caja.</p>' : ''}
      ${o.notes ? `<p class="aviso">Nota: ${esc(o.notes)}</p>` : ''}
      <div class="pie">
        <span>Empacó: ____________________</span>
        <span>Revisó: ____________________</span>
        <span>Fecha: ____________________</span>
      </div>
    </article>`;
}

async function cargar() {
  if (!ids.length) { hojas.innerHTML = '<p class="error">No se indicó ningún pedido.</p>'; estado.textContent = ''; return; }
  const partes = [];
  let fallos = 0;
  for (const id of ids) {
    try {
      const r = await fetch(`/api/admin/orders/${encodeURIComponent(id)}/etiqueta`);
      if (!r.ok) { fallos += 1; continue; }
      partes.push(hoja(await r.json()));
    } catch { fallos += 1; }
  }
  hojas.innerHTML = partes.join('') || '<p class="error">No se pudo leer ningún pedido. Vuelve a entrar al panel y reintenta.</p>';
  estado.textContent = `${partes.length} ${partes.length === 1 ? 'hoja' : 'hojas'}${fallos ? ` · ${fallos} sin cargar` : ''}`;
}

document.getElementById('imprimir').addEventListener('click', () => window.print());
document.getElementById('marcar').addEventListener('change', (e) => {
  document.querySelectorAll('td.check').forEach((td) => { td.style.visibility = e.target.checked ? 'visible' : 'hidden'; });
});
cargar();
