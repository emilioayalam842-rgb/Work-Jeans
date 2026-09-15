// Medición propia sin datos personales: cuenta eventos por día en el servidor (vistas, producto,
// carrito, checkout, WhatsApp, cotizaciones). Si en el panel se configura un ID de Google Analytics 4,
// se carga solo cuando el visitante acepta todas las cookies.
(function () {
  const ALLOWED = new Set(['page_view', 'product_view', 'size_selected', 'add_to_cart', 'begin_checkout', 'shipping_calculated', 'whatsapp_click', 'b2b_quote_started', 'b2b_quote_submitted', 'technical_sheet_downloaded']);
  let sid = '';
  try {
    sid = sessionStorage.getItem('wj-sid') || '';
    if (!sid) { sid = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('wj-sid', sid); }
  } catch { sid = ''; }

  function send(event, props) {
    if (!ALLOWED.has(event)) return;
    const body = JSON.stringify({ event, sid, path: location.pathname.slice(0, 80), props: props && typeof props === 'object' ? { item: props.item, size: props.size, where: props.where } : undefined });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      else fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
    } catch { /* sin red */ }
    if (window.gtag) window.gtag('event', event, props || {});
  }
  window.wjTrack = send;

  send('page_view');
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="wa.me"], a[href*="whatsapp"]');
    if (a) send('whatsapp_click', { where: a.id || a.className.split(' ')[0] || 'link' });
  });

  // Google Analytics 4 opcional (solo con consentimiento completo)
  let gaLoaded = false;
  function maybeLoadGa() {
    if (gaLoaded) return;
    let consent = null;
    try { consent = localStorage.getItem('wj-cookies'); } catch { /* sin almacenamiento */ }
    if (consent !== 'all') return;
    fetch('settings.json').then((r) => r.json()).then((s) => {
      const id = String(s.ga4Id || '').trim();
      if (!/^G-[A-Z0-9]+$/.test(id) || gaLoaded) return;
      gaLoaded = true;
      const tag = document.createElement('script');
      tag.async = true;
      tag.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      document.head.appendChild(tag);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', id, { anonymize_ip: true });
    }).catch(() => {});
  }
  maybeLoadGa();
  window.addEventListener('wj-cookies-changed', maybeLoadGa);
})();
