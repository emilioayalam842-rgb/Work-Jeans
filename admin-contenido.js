// Panel admin · Artículos (blog): crear, editar, publicar y despublicar sin tocar código.

(function () {
  let articles = [];
  const overlay = document.getElementById('articleOverlay');
  const fmtDate = (iso) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—');
  const slugify = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);

  window.loadArticles = async function loadArticles() {
    const res = await fetch('/api/admin/articles');
    if (res.status === 401) { showLogin(); return; }
    if (!res.ok) return;
    articles = await res.json();
    document.getElementById('articlesTableBody').innerHTML = articles.length ? articles.map((a) => `
      <tr data-slug="${esc(a.slug)}" class="${a.status === 'publicado' ? '' : 'admin-row-hidden'}">
        <td><strong>${esc(a.h1)}</strong><br><span class="admin-muted admin-small">/articulos/${esc(a.slug)} · ${a.words || 0} palabras · ${a.readingMinutes || 1} min</span></td>
        <td><span class="admin-badge ${a.status === 'publicado' ? 'status-pagado' : 'status-pendiente'}">${a.status === 'publicado' ? 'Publicado' : 'Borrador'}</span></td>
        <td class="admin-nowrap">${fmtDate(a.publishedAt)}<br><span class="admin-muted admin-small">act. ${fmtDate(a.updatedAt)}</span></td>
        <td class="admin-table-actions">
          <a class="admin-icon-btn" href="/articulos/${esc(a.slug)}?preview=1" target="_blank" rel="noopener" title="Ver">${icon('eye')}</a>
          ${iconBtn('edit-article', 'edit', 'Editar')}
          ${iconBtn('delete-article', 'trash', 'Eliminar')}
        </td>
      </tr>`).join('') : '<tr><td colspan="4">Todavía no hay artículos. Crea el primero.</td></tr>';
  };

  function openForm(a) {
    document.getElementById('articleError').textContent = '';
    document.getElementById('articleForm').reset();
    document.getElementById('articleFormTitle').textContent = a ? 'Editar artículo' : 'Nuevo artículo';
    document.getElementById('articleOriginalSlug').value = a?.slug || '';
    document.getElementById('articleH1').value = a?.h1 || '';
    document.getElementById('articleSlug').value = a?.slug || '';
    document.getElementById('articleKicker').value = a?.kicker || 'Artículo';
    document.getElementById('articleTitle').value = a?.title || '';
    document.getElementById('articleDescription').value = a?.description || '';
    document.getElementById('articleIntro').value = a?.intro || '';
    document.getElementById('articleBody').value = a?.bodySource || a?.body || '';
    document.getElementById('articleFaq').value = (a?.faq || []).map(([q, r]) => `${q} | ${r}`).join('\n');
    document.getElementById('articleProducts').value = a?.productsFilter || 'none';
    document.getElementById('articleStatus').value = a?.status || 'borrador';
    document.getElementById('articlePublishedAt').value = (a?.publishedAt || new Date().toISOString()).slice(0, 10);
    overlay.hidden = false;
  }

  document.getElementById('articleH1').addEventListener('input', (e) => {
    if (!document.getElementById('articleOriginalSlug').value) document.getElementById('articleSlug').value = slugify(e.target.value);
    const t = document.getElementById('articleTitle');
    if (!t.dataset.touched) t.value = `${e.target.value} | Works Jeans`.slice(0, 70);
  });
  document.getElementById('articleTitle').addEventListener('input', (e) => { e.target.dataset.touched = '1'; });
  document.getElementById('newArticleBtn').addEventListener('click', () => openForm(null));
  document.getElementById('cancelArticleBtn').addEventListener('click', () => { overlay.hidden = true; });

  document.getElementById('articleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const original = document.getElementById('articleOriginalSlug').value;
    const body = {
      slug: slugify(document.getElementById('articleSlug').value),
      h1: document.getElementById('articleH1').value,
      kicker: document.getElementById('articleKicker').value,
      title: document.getElementById('articleTitle').value,
      description: document.getElementById('articleDescription').value,
      intro: document.getElementById('articleIntro').value,
      bodySource: document.getElementById('articleBody').value,
      faq: document.getElementById('articleFaq').value.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0] && x[1]).map((x) => [x[0], x.slice(1).join(' | ')]),
      productsFilter: document.getElementById('articleProducts').value,
      status: document.getElementById('articleStatus').value,
      publishedAt: document.getElementById('articlePublishedAt').value,
    };
    const res = await fetch(original ? `/api/admin/articles/${encodeURIComponent(original)}` : '/api/admin/articles', { method: original ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { document.getElementById('articleError').textContent = data.error || 'No se pudo guardar.'; return; }
    overlay.hidden = true;
    loadArticles();
  });

  document.getElementById('articlesTableBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const slug = btn.closest('tr').dataset.slug;
    const a = articles.find((x) => x.slug === slug);
    if (btn.dataset.action === 'edit-article') openForm(a);
    if (btn.dataset.action === 'delete-article') {
      if (!confirm(`¿Eliminar "${esc(a.h1)}"? La URL dejará de existir.`)) return;
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(slug)}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json().catch(() => ({})); notifyForbidden(d.error || 'No se pudo eliminar.'); }
      loadArticles();
    }
  });
})();
