// Filtros del catálogo (inicio y categorías): buscar por nombre, talla con existencia, reflejante y disponibilidad.
(function () {
  const grid = document.getElementById('productsGrid') || document.getElementById('catalogo');
  if (!grid) return;
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const SIZE_ORDER = ['XCH', 'CH', 'M', 'G', 'XG', '2XG', '3XG', '4XG', '5XG'];
  const sortSizes = (a, b) => {
    const na = parseInt(a, 10); const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    if (!Number.isNaN(na)) return -1;
    if (!Number.isNaN(nb)) return 1;
    return SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b);
  };

  const bar = document.createElement('div');
  bar.className = 'catalog-filters';
  bar.innerHTML = `
    <label class="catalog-filter catalog-filter--search"><span>Buscar</span><input type="search" id="cfSearch" placeholder="Pantalón, camisa, reflejante…" autocomplete="off"></label>
    <label class="catalog-filter"><span>Talla</span><select id="cfSize"><option value="">Todas</option></select></label>
    <label class="catalog-filter catalog-filter--check"><input type="checkbox" id="cfReflect"> Solo con reflejante</label>
    <label class="catalog-filter catalog-filter--check"><input type="checkbox" id="cfStock"> Solo con existencia</label>
    <button type="button" class="catalog-filter-clear" id="cfClear" hidden>Limpiar</button>
    <span class="catalog-filter-count" id="cfCount" aria-live="polite"></span>`;
  grid.parentNode.insertBefore(bar, grid);

  const $ = (id) => document.getElementById(id);
  const cards = () => Array.from(grid.querySelectorAll('.product-card[data-sizes]'));

  function fillSizes() {
    const sel = $('cfSize');
    const current = sel.value;
    const all = new Set();
    cards().forEach((c) => (c.dataset.sizes || '').split('|').filter(Boolean).forEach((s) => all.add(s)));
    sel.innerHTML = '<option value="">Todas</option>' + Array.from(all).sort(sortSizes).map((s) => `<option value="${s}">${s}</option>`).join('');
    sel.value = all.has(current) ? current : '';
  }

  function apply() {
    const q = norm($('cfSearch').value.trim());
    const size = $('cfSize').value;
    const reflect = $('cfReflect').checked;
    const stock = $('cfStock').checked;
    let shown = 0;
    cards().forEach((c) => {
      const sizes = (c.dataset.sizes || '').split('|');
      const ok = (!q || norm(c.dataset.search || c.dataset.name || c.textContent).includes(q))
        && (!size || sizes.includes(size))
        && (!reflect || c.dataset.tags === 'reflejante')
        && (!stock || c.dataset.stock === '1');
      c.hidden = !ok;
      if (ok) shown += 1;
    });
    const total = cards().length;
    const active = q || size || reflect || stock;
    $('cfClear').hidden = !active;
    $('cfCount').textContent = active ? (shown ? `${shown} de ${total} modelos` : 'Ningún modelo coincide. Prueba otra talla o escríbenos por WhatsApp.') : '';
    let empty = grid.querySelector('.catalog-empty');
    if (!shown && total) {
      if (!empty) { empty = document.createElement('p'); empty.className = 'catalog-empty'; empty.textContent = 'No hay modelos con esos filtros.'; grid.appendChild(empty); }
    } else if (empty) empty.remove();
  }

  ['input', 'change'].forEach((ev) => bar.addEventListener(ev, apply));
  $('cfClear').addEventListener('click', () => { $('cfSearch').value = ''; $('cfSize').value = ''; $('cfReflect').checked = false; $('cfStock').checked = false; apply(); });
  fillSizes();
  new MutationObserver(() => { fillSizes(); apply(); }).observe(grid, { childList: true });
  const params = new URLSearchParams(location.search);
  if (params.get('q')) { $('cfSearch').value = params.get('q'); apply(); }
})();
