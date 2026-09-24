// Panel admin · Operación diaria: alertas de stock y rastreo de envíos.
(function () {
  const $ = (id) => document.getElementById(id);
  const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—');

  // --- Alertas de stock -----------------------------------------------------
  let alertasCache = [];

  window.loadAlertas = async function loadAlertas() {
    const cuerpo = $('alertasBody');
    const resumen = $('alertasResumen');
    if (!cuerpo) return;
    try {
      const r = await fetch('/api/admin/alertas-stock');
      if (r.status === 401) { showLogin(); return; }
      if (!r.ok) throw new Error('No se pudo leer el inventario.');
      const d = await r.json();
      alertasCache = d.filas;
      resumen.textContent = d.filas.length
        ? `${d.filas.length} ${d.filas.length === 1 ? 'talla' : 'tallas'} en o por debajo de ${d.limite} piezas · ${d.agotadas} agotadas.`
        : `Ninguna talla por debajo de ${d.limite} piezas. Todo en orden.`;
      cuerpo.innerHTML = d.filas.length ? d.filas.map((f) => `
        <tr>
          <td>${esc(f.producto)}${f.categoria ? `<br><span class="admin-muted admin-small">${esc(f.categoria)}</span>` : ''}</td>
          <td><b>${esc(f.talla)}</b></td>
          <td>${f.stock}</td>
          <td><span class="admin-badge ${f.agotada ? 'status-pendiente' : 'status-preparacion'}">${f.agotada ? 'Agotada' : 'Por reponer'}</span></td>
          <td class="admin-table-actions"><button type="button" class="admin-inline-btn" data-ir-existencias="${esc(f.id)}">Ver existencias</button></td>
        </tr>`).join('') : '<tr><td colspan="5">Sin alertas.</td></tr>';
      window.actualizarPendientes?.();
    } catch (err) {
      resumen.textContent = err.message;
    }
  };

  $('alertasRefrescar')?.addEventListener('click', () => window.loadAlertas());
  $('alertasBody')?.addEventListener('click', (e) => {
    if (e.target.closest('[data-ir-existencias]')) showTab('existencias');
  });
  $('alertasCopiar')?.addEventListener('click', async (e) => {
    // Sirve para mandarle la lista de reposición al taller por WhatsApp.
    const texto = alertasCache.map((f) => `${f.producto} talla ${f.talla}: ${f.stock} pza${f.stock === 1 ? '' : 's'}`).join('\n');
    const antes = e.target.textContent;
    try { await navigator.clipboard.writeText(texto || 'Sin alertas'); e.target.textContent = 'Copiado'; } catch { e.target.textContent = 'No se pudo copiar'; }
    setTimeout(() => { e.target.textContent = antes; }, 1200);
  });

  // --- Rastreo de envíos ----------------------------------------------------
  const ESTADOS = { enviado: 'En camino', entregado: 'Entregado', pagado: 'Por enviar', preparacion: 'En preparación' };

  window.loadEnvios = async function loadEnvios() {
    const cuerpo = $('enviosBody');
    const resumen = $('enviosResumen');
    if (!cuerpo) return;
    try {
      const r = await fetch('/api/admin/envios');
      if (r.status === 401) { showLogin(); return; }
      if (!r.ok) throw new Error('No se pudieron leer los envíos.');
      const d = await r.json();
      resumen.textContent = d.filas.length
        ? `${d.enCamino} en camino · ${d.atrasados} con más de 7 días sin confirmar entrega.`
        : 'Todavía no hay envíos con guía.';
      cuerpo.innerHTML = d.filas.length ? d.filas.map((f) => `
        <tr${f.atrasado ? ' class="admin-row-warn"' : ''}>
          <td><button type="button" class="admin-link-btn" data-ver-pedido="${esc(f.id)}">${esc(f.id)}</button><br><span class="admin-muted admin-small">${fecha(f.shippedAt)}</span></td>
          <td>${esc(f.cliente) || '—'}</td>
          <td>${esc(f.ciudad) || '—'}</td>
          <td>${f.guia ? `${esc(f.paqueteria || 'paquetería')}<br><span class="admin-muted admin-small">${esc(f.guia)}</span>` : '<span class="admin-muted">sin guía</span>'}</td>
          <td>${f.dias === null ? '—' : f.dias}</td>
          <td><span class="admin-badge status-${esc(f.estado)}">${ESTADOS[f.estado] || f.estado}</span>${f.atrasado ? '<br><span class="admin-need is-warn">Revisar</span>' : ''}</td>
          <td class="admin-table-actions">${f.url ? `<a class="admin-inline-btn" href="${esc(f.url)}" target="_blank" rel="noopener">Rastrear</a>` : ''}</td>
        </tr>`).join('') : '<tr><td colspan="7">Sin envíos todavía.</td></tr>';
    } catch (err) {
      resumen.textContent = err.message;
    }
  };

  $('enviosRefrescar')?.addEventListener('click', () => window.loadEnvios());
  $('enviosBody')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ver-pedido]');
    if (b) window.openOrderDetail?.(b.dataset.verPedido);
  });
})();
