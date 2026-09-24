// Panel admin · Segmentos de clientes y correo al segmento.
(function () {
  const $ = (id) => document.getElementById(id);
  const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  let actual = 'todos';
  let clientes = [];

  window.loadSegmentos = async function loadSegmentos(segmento = actual) {
    try {
      const r = await fetch(`/api/admin/segmentos?segmento=${encodeURIComponent(segmento)}`);
      if (r.status === 401) { showLogin(); return; }
      if (!r.ok) throw new Error('No se pudieron leer los clientes.');
      const d = await r.json();
      actual = d.seleccionado;
      clientes = d.clientes;

      $('segChips').innerHTML = d.segmentos.map((s) => `
        <button type="button" class="admin-chip ${s.id === actual ? 'is-active' : ''}" data-seg="${esc(s.id)}">${esc(s.nombre)}<span>${s.total}</span></button>`).join('');

      $('segResumen').textContent = clientes.length
        ? `${clientes.length} ${clientes.length === 1 ? 'cliente' : 'clientes'} con correo en este grupo.`
        : 'Nadie cae en este grupo todavía.';

      $('segBody').innerHTML = clientes.length ? clientes.map((c) => `
        <tr>
          <td>${esc(c.name) || '—'}${c.company ? `<br><span class="admin-muted admin-small">${esc(c.company)}</span>` : ''}</td>
          <td>${esc(c.email)}</td>
          <td>${c.orders}</td>
          <td>${c.pieces}</td>
          <td>${formatPrice(c.totalCents)}</td>
          <td>${fecha(c.lastAt)}</td>
        </tr>`).join('') : '<tr><td colspan="6">Sin clientes en este grupo.</td></tr>';
    } catch (err) {
      $('segResumen').textContent = err.message;
    }
  };

  $('segChips')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-seg]');
    if (b) window.loadSegmentos(b.dataset.seg);
  });

  $('segCopiar')?.addEventListener('click', async (e) => {
    const antes = e.target.textContent;
    try { await navigator.clipboard.writeText(clientes.map((c) => c.email).join(', ')); e.target.textContent = 'Copiado'; } catch { e.target.textContent = 'No se pudo'; }
    setTimeout(() => { e.target.textContent = antes; }, 1200);
  });

  $('segExportar')?.addEventListener('click', () => {
    // Comillas dobles escapadas para que un nombre con coma no rompa el archivo.
    const filas = [['Nombre', 'Correo', 'Teléfono', 'Empresa', 'Pedidos', 'Piezas', 'Comprado', 'Último pedido']];
    clientes.forEach((c) => filas.push([c.name, c.email, c.phone, c.company, c.orders, c.pieces, (c.totalCents / 100).toFixed(2), (c.lastAt || '').slice(0, 10)]));
    const csv = filas.map((f) => f.map((v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `clientes-${actual}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  async function enviar(soloAMi) {
    const error = $('segError');
    error.textContent = '';
    const asunto = $('segAsunto').value.trim();
    const cuerpo = $('segCuerpo').value.trim();
    if (!asunto || cuerpo.length < 20) { error.textContent = 'Falta el asunto o el mensaje es muy corto.'; return; }
    if (!soloAMi && !confirm(`¿Mandar este correo a ${clientes.length} ${clientes.length === 1 ? 'cliente' : 'clientes'}? No se puede deshacer.`)) return;

    const boton = soloAMi ? $('segPrueba') : $('segEnviar');
    boton.disabled = true;
    try {
      if (soloAMi) {
        const r = await fetch('/api/admin/test-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: asunto, body: cuerpo }) });
        const d = await r.json().catch(() => ({}));
        error.textContent = r.ok ? 'Te lo mandé al correo de avisos.' : (d.error || 'No se pudo enviar la prueba.');
      } else {
        const r = await fetch('/api/admin/segmentos/correo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ segmento: actual, subject: asunto, body: cuerpo }) });
        const d = await r.json().catch(() => ({}));
        if (r.status === 403 && d.reauth) { error.textContent = 'Vuelve a escribir tu contraseña para poder enviar.'; window.pedirReauth?.(); }
        else if (!r.ok) error.textContent = d.error || 'No se pudo enviar.';
        else error.textContent = `Enviados ${d.enviados} de ${d.total}${d.fallidos ? ` · ${d.fallidos} fallaron` : ''}.`;
      }
    } catch (err) {
      error.textContent = err.message;
    }
    boton.disabled = false;
  }

  $('segPrueba')?.addEventListener('click', () => enviar(true));
  $('segCorreoForm')?.addEventListener('submit', (e) => { e.preventDefault(); enviar(false); });
})();
