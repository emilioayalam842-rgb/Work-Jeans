// Menús desplegables con el estilo del sitio: reemplazan visualmente cada <select> de la tienda
// (el <select> original sigue en el DOM y conserva el valor, los eventos change y las validaciones).
(function () {
  const VALUE = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  let open = null;

  function closeMenu() {
    if (!open) return;
    open.menu.hidden = true;
    open.btn.setAttribute('aria-expanded', 'false');
    open = null;
  }

  // Menús huérfanos (el <select> se volvió a dibujar): se quitan del <body>.
  setInterval(() => document.querySelectorAll('.cs-menu').forEach((m) => { if (m._csWrap && !m._csWrap.isConnected) m.remove(); }), 5000);

  function enhance(sel) {
    if (sel.dataset.csReady || sel.closest('[data-no-custom-select]')) return;
    sel.dataset.csReady = '1';

    const wrap = document.createElement('div');
    wrap.className = 'cs' + (sel.classList.contains('size-select') ? ' cs--size-select' : '');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cs-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    const label = document.createElement('span');
    label.className = 'cs-label';
    btn.appendChild(label);
    const menu = document.createElement('div');
    menu.className = 'cs-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    menu._csWrap = wrap;

    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    wrap.appendChild(btn);
    // El menú vive en <body>: así no lo recorta el cajón del carrito ni lo desplaza un contenedor con transform.
    document.body.appendChild(menu);
    sel.classList.add('cs-native');
    sel.tabIndex = -1;
    if (sel.id) btn.setAttribute('aria-labelledby', sel.id);
    const lbl = sel.closest('label');
    if (lbl) btn.setAttribute('aria-label', (lbl.textContent || '').trim().split('\n')[0].trim());

    let active = -1;
    let typed = '';
    let typedAt = 0;

    function sync() {
      const opt = sel.options[sel.selectedIndex];
      label.textContent = opt ? opt.text : '';
      label.classList.toggle('is-placeholder', !opt || opt.value === '');
      btn.disabled = sel.disabled;
      btn.classList.toggle('is-disabled', sel.disabled);
      menu.querySelectorAll('.cs-opt').forEach((el) => el.setAttribute('aria-selected', String(Number(el.dataset.i) === sel.selectedIndex)));
    }

    function build() {
      menu.innerHTML = '';
      Array.from(sel.options).forEach((opt, i) => {
        if (opt.hidden) return;
        const el = document.createElement('div');
        el.className = 'cs-opt' + (opt.disabled ? ' is-disabled' : '');
        el.setAttribute('role', 'option');
        el.dataset.i = String(i);
        el.textContent = opt.text;
        el.setAttribute('aria-selected', String(i === sel.selectedIndex));
        menu.appendChild(el);
      });
      sync();
    }

    function choose(i) {
      const opt = sel.options[i];
      if (!opt || opt.disabled) return;
      if (sel.selectedIndex !== i) {
        VALUE.set.call(sel, opt.value);
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
      sync();
      closeMenu();
      btn.focus();
    }

    function setActive(i, scroll = true) {
      const items = Array.from(menu.querySelectorAll('.cs-opt'));
      items.forEach((el) => el.classList.remove('is-active'));
      const el = items.find((x) => Number(x.dataset.i) === i);
      if (!el) return;
      active = i;
      el.classList.add('is-active');
      if (scroll) el.scrollIntoView({ block: 'nearest' });
    }

    function place() {
      const r = btn.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      const wantsUp = below < 200 && above > below;
      const max = Math.max(140, Math.min(320, wantsUp ? above : below));
      menu.style.maxHeight = `${max}px`;
      menu.style.left = `${r.left}px`;
      menu.style.width = `${r.width}px`;
      if (wantsUp) {
        menu.style.top = '';
        menu.style.bottom = `${window.innerHeight - r.top + 6}px`;
      } else {
        menu.style.bottom = '';
        menu.style.top = `${r.bottom + 6}px`;
      }
    }

    function openMenu() {
      if (sel.disabled) return;
      if (open && open.menu !== menu) closeMenu();
      build();
      menu.hidden = false;
      place();
      btn.setAttribute('aria-expanded', 'true');
      open = { menu, btn };
      setActive(sel.selectedIndex >= 0 ? sel.selectedIndex : 0);
    }

    function enabledIndexes() {
      return Array.from(sel.options).map((o, i) => (o.disabled || o.hidden ? -1 : i)).filter((i) => i >= 0);
    }

    btn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
    btn.addEventListener('keydown', (e) => {
      const idx = enabledIndexes();
      if (!idx.length) return;
      const pos = idx.indexOf(active);
      if (menu.hidden) {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu(); }
        return;
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(idx[Math.min(idx.length - 1, pos + 1)]); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(idx[Math.max(0, pos - 1)]); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(idx[0]); }
      else if (e.key === 'End') { e.preventDefault(); setActive(idx[idx.length - 1]); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
      else if (e.key === 'Tab') { closeMenu(); }
      else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        const now = Date.now();
        typed = now - typedAt < 600 ? typed + e.key.toLowerCase() : e.key.toLowerCase();
        typedAt = now;
        const hit = idx.find((i) => sel.options[i].text.toLowerCase().startsWith(typed));
        if (hit !== undefined) setActive(hit);
      }
    });
    menu.addEventListener('mousedown', (e) => e.preventDefault());
    menu.addEventListener('click', (e) => {
      const el = e.target.closest('.cs-opt');
      if (el && !el.classList.contains('is-disabled')) choose(Number(el.dataset.i));
    });
    menu.addEventListener('mousemove', (e) => {
      const el = e.target.closest('.cs-opt');
      if (el && !el.classList.contains('is-disabled')) setActive(Number(el.dataset.i), false);
    });
    sel.addEventListener('focus', () => btn.focus());
    sel.addEventListener('change', sync);

    // Cambios hechos por código: opciones nuevas, disabled, o sel.value = 'x'.
    new MutationObserver(() => { build(); if (!menu.hidden) place(); }).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    Object.defineProperty(sel, 'value', {
      configurable: true,
      get() { return VALUE.get.call(sel); },
      set(v) { VALUE.set.call(sel, v); sync(); },
    });

    build();
  }

  function enhanceAll(root) {
    (root.querySelectorAll ? root.querySelectorAll('select') : []).forEach(enhance);
    if (root.tagName === 'SELECT') enhance(root);
  }

  document.addEventListener('mousedown', (e) => { if (open && !open.menu.contains(e.target) && !open.btn.contains(e.target)) closeMenu(); });
  document.addEventListener('scroll', (e) => { if (open && !open.menu.contains(e.target)) closeMenu(); }, true);
  window.addEventListener('resize', closeMenu);

  function start() {
    enhanceAll(document.body);
    new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) enhanceAll(n); }))).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
