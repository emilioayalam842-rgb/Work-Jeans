// Página de producto: selector de talla con existencias, cantidad, agregar / comprar ahora,
// galería, barra fija en móvil y compartir. Usa las funciones del carrito (cart.js).

(function () {
  const addBtn = document.getElementById('pdpAdd');
  if (!addBtn) return;
  const id = addBtn.dataset.id;
  const status = document.getElementById('pdpStatus');
  const stockNote = document.getElementById('pdpStockNote');
  const sizeSelect = document.getElementById('pdpSize');
  const pills = document.getElementById('pdpSizePills');

  function selectedLabel() {
    if (sizeSelect) return sizeSelect.value;
    const active = pills?.querySelector('.pdp-pill.is-active');
    return active ? active.dataset.label : '';
  }

  function refreshStock() {
    const label = selectedLabel();
    if (!label) { stockNote.textContent = ''; return; }
    if (typeof stockNoteText === 'function' && Array.isArray(PRODUCTS) && PRODUCTS.length) {
      stockNote.textContent = stockNoteText(id, label);
      const price = typeof variantPrice === 'function' ? variantPrice(id, label) : null;
      if (price) {
        const el = document.getElementById('pdpStickyPrice');
        if (el) el.textContent = formatPrice(price);
        const big = document.getElementById('pdpPrice');
        if (big) big.innerHTML = `${formatPrice(price)} <small>MXN · IVA incluido</small>`;
      }
    }
  }

  function add({ openDrawer = false } = {}) {
    const product = (PRODUCTS || []).find((p) => p.id === id);
    if (!product) { status.textContent = 'Cargando existencias… inténtalo de nuevo.'; return; }
    const label = selectedLabel();
    if (!label) { status.textContent = 'Elige una talla antes de agregar.'; pills?.focus(); return; }
    const stock = sizeStock(id, label);
    if (stock <= 0) { status.textContent = 'Esa talla está agotada. Elige otra.'; return; }
    const qty = clampQty(document.getElementById('pdpQty').value);
    addToCart(product.id, product.name, variantPrice(id, label) || product.priceCents, label, qty);
    status.textContent = openDrawer ? '' : 'Agregado al carrito.';
    if (openDrawer && typeof openCart === 'function') openCart();
  }

  // Tallas en botones
  pills?.addEventListener('click', (e) => {
    const btn = e.target.closest('.pdp-pill');
    if (!btn || btn.disabled) return;
    pills.querySelectorAll('.pdp-pill').forEach((p) => { p.classList.remove('is-active'); p.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('is-active');
    btn.setAttribute('aria-pressed', 'true');
    status.textContent = '';
    refreshStock();
    window.wjTrack?.('size_selected', { item: id, size: btn.dataset.label });
  });
  sizeSelect?.addEventListener('change', () => { status.textContent = ''; refreshStock(); window.wjTrack?.('size_selected', { item: id, size: sizeSelect.value }); });

  addBtn.addEventListener('click', () => add());
  document.getElementById('pdpBuy')?.addEventListener('click', () => add({ openDrawer: true }));
  document.getElementById('pdpStickyAdd')?.addEventListener('click', () => { document.getElementById('pdpBuyBox').scrollIntoView({ behavior: 'smooth', block: 'center' }); if (selectedLabel()) add(); });

  // Galería
  const photo = document.getElementById('pdpPhoto');
  document.getElementById('pdpThumbs')?.addEventListener('click', (e) => {
    const thumb = e.target.closest('.pdp-thumb');
    if (!thumb) return;
    photo.src = thumb.dataset.large;
    photo.srcset = thumb.dataset.srcset;
    photo.alt = thumb.dataset.alt || photo.alt;
    document.querySelectorAll('.pdp-thumb').forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-current', 'false'); });
    thumb.classList.add('is-active');
    thumb.setAttribute('aria-current', 'true');
  });

  // Zoom al pasar el mouse sobre la foto principal (solo en dispositivos con puntero fino)
  const main = document.querySelector('.pdp-main');
  if (main && photo && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const hint = document.createElement('span');
    hint.className = 'pdp-zoom-hint';
    hint.textContent = 'Pasa el mouse para acercar';
    main.appendChild(hint);
    const ZOOM = 2.2;
    let sizesBefore = photo.sizes;
    main.addEventListener('mouseenter', () => {
      sizesBefore = photo.sizes;
      photo.sizes = '1200px'; // pide la versión más grande para que el acercamiento se vea nítido
      main.classList.add('is-zooming');
    });
    main.addEventListener('mousemove', (e) => {
      const r = main.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      photo.style.transformOrigin = `${x}% ${y}%`;
      photo.style.transform = `scale(${ZOOM})`;
    });
    main.addEventListener('mouseleave', () => {
      photo.style.transform = '';
      photo.style.transformOrigin = '';
      photo.sizes = sizesBefore;
      main.classList.remove('is-zooming');
    });
  }

  // Aviso "vuelve a haber stock" para tallas agotadas
  const saToggle = document.getElementById('stockAlertToggle');
  const saForm = document.getElementById('stockAlertForm');
  if (saToggle && saForm) {
    saToggle.addEventListener('click', () => { saForm.hidden = !saForm.hidden; if (!saForm.hidden) document.getElementById('stockAlertEmail').focus(); });
    saForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const st = document.getElementById('stockAlertStatus');
      const btn = saForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const res = await fetch('/api/stock-alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: document.getElementById('stockAlert').dataset.product, size: document.getElementById('stockAlertSize').value, email: document.getElementById('stockAlertEmail').value.trim() }) });
        const d = await res.json().catch(() => ({}));
        st.textContent = res.ok ? 'Listo. Te avisamos por correo en cuanto vuelva a haber tu talla.' : (d.error || 'No se pudo registrar.');
        if (res.ok) saForm.querySelector('input').value = '';
      } catch { st.textContent = 'Sin conexión. Intenta de nuevo.'; }
      btn.disabled = false;
    });
  }

  // Barra fija en móvil cuando los botones de compra salen de la pantalla
  const sticky = document.getElementById('pdpSticky');
  const buyBox = document.getElementById('pdpBuyBox');
  if (sticky && buyBox && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      sticky.hidden = entry.isIntersecting || entry.boundingClientRect.top < 0 && window.innerWidth > 860;
      document.body.classList.toggle('has-pdp-sticky', !sticky.hidden);
    }, { threshold: 0 });
    io.observe(buyBox);
  }

  // Compartir
  const url = window.location.origin + window.location.pathname;
  document.getElementById('pdpShare')?.addEventListener('click', () => {
    const name = document.querySelector('h1')?.textContent || 'este producto';
    window.open(`https://wa.me/?text=${encodeURIComponent(`Mira ${name} de Works Jeans: ${url}`)}`, '_blank', 'noopener');
  });
  document.getElementById('pdpCopy')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); status.textContent = 'Enlace copiado.'; } catch { status.textContent = url; }
  });

  window.onProductsLoaded = refreshStock;
  window.wjTrack?.('product_view', { item: id });
})();

// Guía de tallas sin salir del producto: se abre como ventana y se cierra con Escape o clic fuera.
(function () {
  const abrir = document.getElementById('pdpSizeGuide');
  const modal = document.getElementById('sizeModal');
  if (!abrir || !modal) return;
  let ultimoFoco = null;

  function abrirModal() {
    ultimoFoco = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('.size-modal-close').focus();
  }
  function cerrarModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    ultimoFoco?.focus();
  }
  abrir.addEventListener('click', abrirModal);
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close-size]')) cerrarModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) cerrarModal(); });
  // El foco no debe escaparse de la ventana mientras está abierta.
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focos = [...modal.querySelectorAll('button, a[href], input, select, textarea')].filter((el) => el.offsetParent !== null);
    if (!focos.length) return;
    const primero = focos[0];
    const ultimo = focos[focos.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  });
})();
