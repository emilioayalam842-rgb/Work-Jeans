// Panel admin · Cotizaciones de empresas (leads): embudo Nuevo → Contactado → Cotizado → Negociación → Ganado / Perdido.

(function () {
  const STATUS = { nuevo: 'Nuevo', contactado: 'Contactado', cotizado: 'Cotizado', negociacion: 'Negociación', ganado: 'Ganado', perdido: 'Perdido' };
  let leads = [];
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

  function renderLeads() {
    const filter = document.getElementById('leadStatusFilter').value;
    const rows = leads.filter((l) => !filter || (filter === 'abiertas' ? !['ganado', 'perdido'].includes(l.status) : l.status === filter));
    const counts = Object.keys(STATUS).reduce((acc, k) => ({ ...acc, [k]: leads.filter((l) => l.status === k).length }), {});
    document.getElementById('leadCounts').innerHTML = Object.entries(STATUS).map(([k, v]) => `<span class="admin-badge lead-${k}">${v}: ${counts[k]}</span>`).join(' ');
    document.getElementById('leadsTableBody').innerHTML = rows.length ? rows.map((l) => `
      <tr data-id="${esc(l.id)}">
        <td class="admin-nowrap">${fmtDate(l.createdAt)}</td>
        <td><strong>${esc(l.company) || '—'}</strong><br><span class="admin-muted admin-small">${esc(l.name)}${l.city || l.state ? ` · ${esc([l.city, l.state].filter(Boolean).join(', '))}` : ''}</span>${l.repeatOf ? '<br><span class="admin-badge lead-ganado">Repite pedido anterior</span>' : ''}</td>
        <td>${l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a><br>` : ''}${l.phone ? `<a href="https://wa.me/${whatsappDigits(l.phone)}" target="_blank" rel="noopener">${esc(l.phone)}</a>` : ''}</td>
        <td>${l.totalPieces || (l.headcount ? `~${l.headcount} personas` : '—')}${l.lines?.length ? `<br><span class="admin-muted admin-small">${esc(l.lines.map((x) => `${esc(x.name)} (${x.total})`).join(', ')).slice(0, 120)}</span>` : ''}${l.customization ? `<br><span class="admin-muted admin-small">${esc(l.customization)}</span>` : ''}</td>
        <td><select class="admin-status-select lead-${l.status}" data-action="lead-status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === l.status ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
        <td>${l.internalNotes ? `<span class="admin-small" title="${esc(l.internalNotes)}">${esc(l.internalNotes).slice(0, 70)}${l.internalNotes.length > 70 ? '…' : ''}</span>` : '<span class="admin-muted admin-small">Sin notas</span>'}<br><button type="button" class="admin-inline-btn admin-small" data-action="lead-open">Abrir ficha</button></td>
        <td class="admin-table-actions">${l.notes ? `<button type="button" class="admin-icon-btn" data-action="lead-view" title="Ver comentarios del cliente">${icon('eye')}</button>` : ''}${l.repeatToken ? `<button type="button" class="admin-icon-btn" data-action="lead-repeat" title="Copiar enlace para que repita este pedido">${icon('copy')}</button>` : ''}${iconBtn('lead-delete', 'trash', 'Eliminar')}</td>
      </tr>`).join('') : '<tr><td colspan="7">Sin cotizaciones todavía. Llegan desde la página /empresas.</td></tr>';
  }

  // Ficha completa de una cotización: datos, tallas pedidas, historial, estado y notas internas.
  function openLeadDetail(lead) {
    let ov = document.getElementById('leadDetailOverlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'admin-overlay';
      ov.id = 'leadDetailOverlay';
      ov.hidden = true;
      document.body.appendChild(ov);
      ov.addEventListener('click', (e) => { if (e.target === ov) ov.hidden = true; });
    }
    const wa = whatsappDigits(lead.phone);
    const lines = (lead.lines || []).map((x) => `<tr><td>${esc(x.name)}</td><td>${Object.entries(x.sizes || {}).filter(([, n]) => n > 0).map(([sz, n]) => `<span class="admin-size-chip is-ok">${esc(sz)}<i>${n}</i></span>`).join(' ') || '—'}</td><td class="admin-nowrap"><b>${x.total || 0}</b> pzas</td></tr>`).join('');
    ov.innerHTML = `
      <div class="admin-form" id="leadDetailBox" style="max-width:720px">
        <div class="admin-detail-id"><span class="admin-kicker">Cotización</span><b>${esc(lead.company || lead.name)}</b><span class="admin-badge lead-${lead.status}">${STATUS[lead.status] || lead.status}</span></div>
        <div class="admin-lead-grid">
          <div><span class="admin-kicker">Contacto</span><p><b>${esc(lead.name || '—')}</b>${lead.company ? ` · ${esc(lead.company)}` : ''}<br>${lead.email ? `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a><br>` : ''}${lead.phone ? `${esc(lead.phone)}` : ''}${lead.city || lead.state ? `<br>${esc([lead.city, lead.state].filter(Boolean).join(', '))}` : ''}</p></div>
          <div><span class="admin-kicker">Pedido</span><p><b>${lead.totalPieces || 0}</b> piezas${lead.headcount ? ` · ~${lead.headcount} personas` : ''}${lead.customization ? `<br>Personalización: ${esc(lead.customization)}` : ''}${lead.reflective ? `<br>Reflejante: ${esc(lead.reflective)}` : ''}${lead.neededBy ? `<br>La necesita para: ${esc(lead.neededBy)}` : ''}${lead.repeatOf ? '<br><span class="admin-badge lead-ganado">Repite pedido anterior</span>' : ''}</p></div>
          <div><span class="admin-kicker">Historial</span><p>Recibida ${fmtDate(lead.createdAt)}${lead.statusAt ? `<br>Último cambio ${fmtDate(lead.statusAt)}` : ''}<br>Origen: ${esc(lead.source || 'empresas')}</p></div>
        </div>
        ${lines ? `<table class="admin-table admin-detail-table"><thead><tr><th>Prenda</th><th>Tallas</th><th>Total</th></tr></thead><tbody>${lines}</tbody></table>` : ''}
        ${lead.notes ? `<div class="admin-lead-note"><span class="admin-kicker">Comentarios del cliente</span><p>${esc(lead.notes)}</p></div>` : ''}
        <label for="leadDetailStatus">Estado</label>
        <select id="leadDetailStatus" class="admin-filter">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === lead.status ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <label for="leadDetailNotes">Notas internas (cotización enviada, precio acordado, seguimiento…)</label>
        <textarea id="leadDetailNotes" rows="4">${esc(lead.internalNotes || '')}</textarea>
        <div class="admin-form-actions admin-form-actions--wrap">
          ${wa ? `<a class="btn btn-secondary admin-btn-icon" href="https://wa.me/${wa}?text=${encodeURIComponent(`Hola ${lead.name ? lead.name.split(' ')[0] : ''}, te escribimos de Works Jeans sobre tu cotización de ${lead.totalPieces || ''} piezas.`)}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a>` : ''}
          ${lead.repeatToken ? `<button type="button" class="btn btn-secondary" data-lead-repeat>Copiar enlace para repetir</button>` : ''}
          <button type="button" class="btn btn-secondary" data-lead-close>Cerrar</button>
          <button type="button" class="btn btn-primary" data-lead-save>Guardar cambios</button>
        </div>
        <p class="admin-error" id="leadDetailError"></p>
      </div>`;
    ov.hidden = false;
    ov.querySelector('[data-lead-close]').addEventListener('click', () => { ov.hidden = true; });
    ov.querySelector('[data-lead-save]').addEventListener('click', async () => {
      await saveLead(lead.id, { status: document.getElementById('leadDetailStatus').value, internalNotes: document.getElementById('leadDetailNotes').value });
      ov.hidden = true;
      renderLeads();
    });
    ov.querySelector('[data-lead-repeat]')?.addEventListener('click', async () => {
      const url = `${location.origin}/empresas?repetir=${lead.repeatToken}`;
      try { await navigator.clipboard.writeText(url); document.getElementById('leadDetailError').textContent = 'Enlace copiado. Mándaselo por WhatsApp.'; } catch { prompt('Copia este enlace:', url); }
    });
  }

  window.loadLeads = async function loadLeads() {
    const res = await fetch('/api/admin/leads');
    if (res.status === 401) { showLogin(); return; }
    if (!res.ok) return;
    leads = await res.json();
    renderLeads();
  };

  document.getElementById('leadStatusFilter').addEventListener('change', renderLeads);

  async function saveLead(id, body) {
    const res = await fetch(`/api/admin/leads/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); notifyForbidden(d.error || 'No se pudo guardar.'); return; }
    const updated = await res.json();
    leads = leads.map((l) => (l.id === id ? updated : l));
  }

  document.getElementById('leadsTableBody').addEventListener('change', async (e) => {
    const id = e.target.closest('tr')?.dataset.id;
    if (!id) return;
    if (e.target.dataset.action === 'lead-status') { await saveLead(id, { status: e.target.value }); renderLeads(); }
    if (e.target.dataset.action === 'lead-notes') await saveLead(id, { internalNotes: e.target.value });
  });

  document.getElementById('leadsTableBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    const id = btn?.closest('tr')?.dataset.id;
    if (!btn || !id) return;
    const lead = leads.find((l) => l.id === id);
    if (btn.dataset.action === 'lead-view' || btn.dataset.action === 'lead-open') openLeadDetail(lead);
    if (btn.dataset.action === 'lead-repeat') {
      const url = `${location.origin}/empresas?repetir=${lead.repeatToken}`;
      try { await navigator.clipboard.writeText(url); notifyForbidden('Enlace copiado. Mándaselo por WhatsApp: al abrirlo verá su pedido anterior listo para ajustar y enviar.'); } catch { prompt('Copia este enlace:', url); }
    }
    if (btn.dataset.action === 'lead-delete') {
      if (!confirm('¿Eliminar esta cotización?')) return;
      const res = await fetch(`/api/admin/leads/${id}`, { method: 'DELETE' });
      if (res.ok) { leads = leads.filter((l) => l.id !== id); renderLeads(); }
    }
  });
})();
