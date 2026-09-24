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


  // --- Preparar envíos ------------------------------------------------------
  let prepararCache = [];
  const seleccionados = () => [...document.querySelectorAll('#prepararBody input[data-sel]:checked')].map((c) => c.dataset.sel);

  function pintarSeleccion() {
    const n = seleccionados().length;
    const barra = $('prepararAcciones');
    if (!barra) return;
    barra.hidden = !n;
    $('prepararSeleccion').textContent = `${n} ${n === 1 ? 'pedido seleccionado' : 'pedidos seleccionados'}`;
  }

  window.loadPreparar = async function loadPreparar() {
    const cuerpo = $('prepararBody');
    const resumen = $('prepararResumen');
    if (!cuerpo) return;
    try {
      const r = await fetch('/api/admin/preparar');
      if (r.status === 401) { showLogin(); return; }
      if (!r.ok) throw new Error('No se pudieron leer los pedidos.');
      const d = await r.json();
      prepararCache = d.filas;
      resumen.textContent = d.filas.length
        ? `${d.filas.length} ${d.filas.length === 1 ? 'pedido' : 'pedidos'} por empacar · ${d.piezas} ${d.piezas === 1 ? 'pieza' : 'piezas'} en total.`
        : 'No hay pedidos pendientes de empacar.';
      cuerpo.innerHTML = d.filas.length ? d.filas.map((f) => `
        <tr>
          <td class="admin-col-check"><input type="checkbox" data-sel="${esc(f.id)}" aria-label="Seleccionar ${esc(f.id)}"></td>
          <td><button type="button" class="admin-link-btn" data-ver-pedido="${esc(f.id)}">${esc(f.id)}</button><br><span class="admin-muted admin-small">${fecha(f.createdAt)}</span></td>
          <td>${esc(f.cliente) || '—'}${f.factura ? '<br><span class="admin-need is-warn">Pide factura</span>' : ''}</td>
          <td>${esc(f.destino)}</td>
          <td>${f.lineas.map((l) => `${l.cantidad} × ${esc(l.nombre)}${l.talla ? ` (${esc(l.talla)})` : ''}`).join('<br>')}</td>
          <td>${f.conGuia ? '<span class="admin-badge status-enviado">Con guía</span>' : '<span class="admin-muted">sin guía</span>'}</td>
          <td class="admin-table-actions">
            <a class="admin-inline-btn" href="etiqueta.html?id=${encodeURIComponent(f.id)}" target="_blank" rel="noopener">Etiqueta</a>
            <a class="admin-inline-btn" href="nota.html?id=${encodeURIComponent(f.id)}" target="_blank" rel="noopener">Nota</a>
          </td>
        </tr>`).join('') : '<tr><td colspan="7">Nada por empacar.</td></tr>';
      pintarSeleccion();
    } catch (err) {
      resumen.textContent = err.message;
    }
  };

  $('prepararRefrescar')?.addEventListener('click', () => window.loadPreparar());
  $('prepararTodos')?.addEventListener('change', (e) => {
    document.querySelectorAll('#prepararBody input[data-sel]').forEach((c) => { c.checked = e.target.checked; });
    pintarSeleccion();
  });
  $('prepararBody')?.addEventListener('change', pintarSeleccion);
  $('prepararBody')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ver-pedido]');
    if (b) window.openOrderDetail?.(b.dataset.verPedido);
  });

  $('prepararAcciones')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;
    const ids = seleccionados();
    if (!ids.length) return;
    const accion = btn.dataset.accion;

    if (accion === 'empaque') { window.open(`empaque.html?ids=${encodeURIComponent(ids.join(','))}`, '_blank', 'noopener'); return; }

    if (accion === 'copiar') {
      // Lo que se manda al taller: qué prenda y qué talla sacar, sumado entre pedidos.
      const suma = new Map();
      prepararCache.filter((f) => ids.includes(f.id)).forEach((f) => {
        f.lineas.forEach((l) => {
          const clave = `${l.nombre}|${l.talla}`;
          suma.set(clave, (suma.get(clave) || 0) + l.cantidad);
        });
      });
      const texto = [...suma.entries()].map(([clave, n]) => {
        const [nombre, talla] = clave.split('|');
        return `${n} × ${nombre}${talla ? ` talla ${talla}` : ''}`;
      }).join('\n');
      const antes = btn.textContent;
      try { await navigator.clipboard.writeText(texto); btn.textContent = 'Copiado'; } catch { btn.textContent = 'No se pudo copiar'; }
      setTimeout(() => { btn.textContent = antes; }, 1200);
      return;
    }

    const estado = accion === 'enviado' ? 'enviado' : 'preparacion';
    if (estado === 'enviado' && !confirm(`¿Marcar ${ids.length} ${ids.length === 1 ? 'pedido' : 'pedidos'} como enviados? Se le avisa al cliente por correo.`)) return;
    btn.disabled = true;
    try {
      const r = await fetch('/api/admin/orders-estado', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, status: estado }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'No se pudo cambiar el estado.');
      $('prepararResumen').textContent = d.sinGuia
        ? `${d.cambiados.length} actualizados. ${d.sinGuia} se quedaron igual: para marcar enviado hay que capturar la guía en la ficha del pedido.`
        : `${d.cambiados.length} ${d.cambiados.length === 1 ? 'pedido actualizado' : 'pedidos actualizados'}.`;
      await window.loadPreparar();
      window.actualizarPendientes?.();
    } catch (err) {
      $('prepararResumen').textContent = err.message;
    }
    btn.disabled = false;
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
