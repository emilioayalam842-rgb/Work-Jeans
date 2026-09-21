// Panel admin · Reseñas verificadas: moderación (aprobar, rechazar, eliminar) y enlaces para pedir reseña.
(function () {
  let reviews = [];
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—');
  const stars = (n) => `<span class="admin-stars" aria-label="${n} de 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;

  function render() {
    const filter = document.getElementById('reviewFilter').value;
    const rows = reviews.filter((r) => !filter || r.status === filter);
    const counts = ['pendiente', 'aprobada', 'rechazada'].map((s) => `${s}: ${reviews.filter((r) => r.status === s).length}`).join(' · ');
    document.getElementById('reviewCounts').textContent = counts;
    document.getElementById('reviewsTableBody').innerHTML = rows.length ? rows.map((r) => `
      <tr data-id="${esc(r.id)}" class="${r.status === 'aprobada' ? '' : 'admin-row-hidden'}">
        <td class="admin-nowrap">${fmtDate(r.createdAt)}</td>
        <td><strong>${esc(r.productName)}</strong><br><span class="admin-muted admin-small">Pedido ${esc(r.orderId)}</span></td>
        <td>${stars(r.rating)}<br><span class="admin-small">${esc(r.comment)}</span></td>
        <td>${esc(r.displayName)}<br><span class="admin-muted admin-small">${esc(r.customerName)}</span></td>
        <td><span class="admin-badge ${r.status === 'aprobada' ? 'status-pagado' : r.status === 'rechazada' ? 'status-cancelado' : 'status-pendiente'}">${r.status}</span></td>
        <td class="admin-table-actions">
          ${r.status !== 'aprobada' ? `<button type="button" class="admin-inline-btn" data-action="approve">Aprobar</button>` : ''}
          ${r.status !== 'rechazada' ? `<button type="button" class="admin-inline-btn" data-action="reject">Rechazar</button>` : ''}
          ${iconBtn('delete', 'trash', 'Eliminar')}
        </td>
      </tr>`).join('') : '<tr><td colspan="6">Sin reseñas. Llegan cuando el cliente usa el enlace que recibe al entregarse su pedido.</td></tr>';
  }

  window.loadReviews = async function loadReviews() {
    const res = await fetch('/api/admin/reviews');
    if (res.status === 401) { showLogin(); return; }
    if (!res.ok) return;
    reviews = await res.json();
    render();
  };
  document.getElementById('reviewFilter').addEventListener('change', render);

  document.getElementById('reviewsTableBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;
    const action = btn.dataset.action;
    let res;
    if (action === 'approve') res = await fetch(`/api/admin/reviews/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'aprobada' }) });
    if (action === 'reject') res = await fetch(`/api/admin/reviews/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'rechazada' }) });
    if (action === 'delete') {
      if (!confirm('¿Eliminar esta reseña?')) return;
      res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
    }
    if (res && !res.ok) { const d = await res.json().catch(() => ({})); notifyForbidden(d.error || 'No se pudo guardar.'); }
    loadReviews();
  });
})();
