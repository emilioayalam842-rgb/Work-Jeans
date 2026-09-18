// Con <base href="/">, un enlace "#seccion" se resuelve al inicio del sitio; aquí se desplaza dentro de la misma página.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  if (!id) return;
  const target = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
  e.preventDefault();
  if (!target) { location.hash = id; return; }
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try { history.replaceState(null, '', `${location.pathname}${location.search}#${id}`); } catch { /* sin historial */ }
  if (target.tabIndex < 0) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
});
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
    el.className = 'cookie-overlay';
    el.innerHTML = `
      <div class="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cookieTitle" aria-describedby="cookieText">
        <div class="cookie-stripe" aria-hidden="true"></div>
        <span class="cookie-kicker">Cookies · Works Jeans</span>
        <h2 id="cookieTitle">Tu privacidad, sin letras chiquitas.</h2>
        <p id="cookieText">Usamos almacenamiento técnico para guardar tu carrito. Si aceptas, también cargamos el mapa de Google Maps para mostrarte cómo llegar a la tienda. Nada de rastreo publicitario.</p>
        <div class="cookie-actions">
          <button type="button" class="btn btn-primary" data-choice="all">Aceptar todo</button>
          <button type="button" class="btn btn-secondary" data-choice="essential">Solo necesarias</button>
        </div>
        <a class="cookie-more" href="/aviso-de-privacidad#cookies">Más información</a>
      </div>`;
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-choice]');
      if (!btn) return;
      write(btn.dataset.choice);
      apply(btn.dataset.choice);
      window.dispatchEvent(new Event('wj-cookies-changed'));
      close();
    });
    const onKey = (e) => { if (e.key === 'Escape') { write('essential'); apply('essential'); close(); } };
    function close() {
      el.classList.add('is-closing');
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('cookie-open');
      setTimeout(() => el.remove(), 220);
    }
    document.addEventListener('keydown', onKey);
    document.body.appendChild(el);
    document.body.classList.add('cookie-open');
    requestAnimationFrame(() => el.classList.add('is-open'));
    setTimeout(() => el.querySelector('[data-choice="all"]').focus(), 250);
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
