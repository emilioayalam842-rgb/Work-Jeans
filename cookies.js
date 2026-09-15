// Aviso de cookies. El sitio solo usa almacenamiento técnico (carrito en localStorage y la sesión del panel);
// lo único de terceros son los mapas de Google, que se cargan solo si el visitante acepta.
(function () {
  const KEY = 'wj-cookies';
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch { /* sin localStorage */ } };

  function loadMaps() {
    document.querySelectorAll('iframe[data-src]').forEach((f) => {
      f.src = f.dataset.src;
      f.removeAttribute('data-src');
      f.closest('.map-placeholder-wrap')?.classList.add('is-loaded');
    });
  }

  function placeholders() {
    document.querySelectorAll('iframe[data-src]').forEach((f) => {
      if (f.parentElement.classList.contains('map-placeholder-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'map-placeholder-wrap';
      f.parentElement.insertBefore(wrap, f);
      wrap.appendChild(f);
      const ph = document.createElement('div');
      ph.className = 'map-placeholder';
      ph.innerHTML = '<p>El mapa lo carga Google Maps y usa sus propias cookies.</p><button type="button" class="btn btn-secondary">Mostrar mapa</button><a href="https://maps.google.com/?cid=2378529028541799733" target="_blank" rel="noopener">Abrir en Google Maps</a>';
      ph.querySelector('button').addEventListener('click', () => { write('all'); loadMaps(); });
      wrap.appendChild(ph);
    });
  }

  function apply(choice) {
    if (choice === 'all') loadMaps();
    else placeholders();
  }

  function showBanner() {
    if (document.getElementById('cookieBanner')) return;
    const el = document.createElement('div');
    el.id = 'cookieBanner';
    el.className = 'cookie-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Aviso de cookies');
    el.innerHTML = `
      <p>Usamos almacenamiento técnico para guardar tu carrito y, si aceptas, cookies de Google Maps para mostrarte cómo llegar. Sin rastreo publicitario. <a href="aviso-de-privacidad.html#cookies">Más información</a></p>
      <div class="cookie-banner-actions">
        <button type="button" class="btn btn-secondary" data-choice="essential">Solo necesarias</button>
        <button type="button" class="btn btn-primary" data-choice="all">Aceptar todo</button>
      </div>`;
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-choice]');
      if (!btn) return;
      write(btn.dataset.choice);
      apply(btn.dataset.choice);
      el.remove();
    });
    document.body.appendChild(el);
  }

  function init() {
    const choice = read();
    if (choice === 'all' || choice === 'essential') apply(choice);
    else { placeholders(); showBanner(); }
    document.querySelectorAll('[data-cookie-settings]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); showBanner(); }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
