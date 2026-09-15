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
      <tr data-id="${l.id}">
        <td class="admin-nowrap">${fmtDate(l.createdAt)}</td>
        <td><strong>${esc(l.company) || '—'}</strong><br><span class="admin-muted admin-small">${esc(l.name)}${l.city || l.state ? ` · ${esc([l.city, l.state].filter(Boolean).join(', '))}` : ''}</span>${l.repeatOf ? '<br><span class="admin-badge lead-ganado">Repite pedido anterior</span>' : ''}</td>
        <td>${l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a><br>` : ''}${l.phone ? `<a href="https://wa.me/${whatsappDigits(l.phone)}" target="_blank" rel="noopener">${esc(l.phone)}</a>` : ''}</td>
        <td>${l.totalPieces || (l.headcount ? `~${l.headcount} personas` : '—')}${l.lines?.length ? `<br><span class="admin-muted admin-small">${esc(l.lines.map((x) => `${x.name} (${x.total})`).join(', ')).slice(0, 120)}</span>` : ''}${l.customization ? `<br><span class="admin-muted admin-small">${esc(l.customization)}</span>` : ''}</td>
        <td><select class="admin-status-select lead-${l.status}" data-action="lead-status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === l.status ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
        <td><textarea class="lead-notes" data-action="lead-notes" rows="2" placeholder="Notas internas…">${esc(l.internalNotes || '')}</textarea></td>
        <td class="admin-table-actions">${l.notes ? `<button type="button" class="admin-icon-btn" data-action="lead-view" title="Ver comentarios del cliente">${icon('eye')}</button>` : ''}${l.repeatToken ? `<button type="button" class="admin-icon-btn" data-action="lead-repeat" title="Copiar enlace para que repita este pedido">${icon('copy')}</button>` : ''}${iconBtn('lead-delete', 'trash', 'Eliminar')}</td>
      </tr>`).join('') : '<tr><td colspan="7">Sin cotizaciones todavía. Llegan desde la página /empresas.</td></tr>';
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
    if (btn.dataset.action === 'lead-view') alert(`${lead.company || lead.name}:\n\n${lead.notes}`);
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
