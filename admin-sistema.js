// Panel admin · Respaldos automáticos y estado del sistema (Configuración).
(function () {
  const $ = (id) => document.getElementById(id);
  if (!$('systemStatusBox')) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDT = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
  const kb = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const ago = (iso) => {
    if (!iso) return '';
    const h = (Date.now() - new Date(iso).getTime()) / 3600000;
    if (h < 1) return 'hace menos de una hora';
    if (h < 24) return `hace ${Math.round(h)} h`;
    return `hace ${Math.round(h / 24)} día${Math.round(h / 24) === 1 ? '' : 's'}`;
  };
  let loaded = false;

  async function loadBackups() {
    const list = $('backupList');
    $('backupListError').textContent = '';
    try {
      const r = await fetch('/api/admin/backups');
      if (!r.ok) throw new Error('No se pudieron leer los respaldos.');
      const d = await r.json();
      $('backupEmailToggle').checked = d.emailWeekly;
      $('backupEmailInfo').textContent = d.emailConfigured ? (d.lastEmailAt ? `Último envío: ${fmtDT(d.lastEmailAt)}` : 'Aún no se ha enviado ninguno.') : 'Para enviarlo por correo, guarda arriba un correo para avisos.';
      list.innerHTML = d.backups.length ? d.backups.map((b) => `<li><span class="admin-backup-date"><b>${esc(b.date)}</b> <small>${kb(b.bytes)} · ${ago(b.at)}</small></span><span class="admin-backup-btns"><button type="button" class="btn btn-secondary btn-sm" data-descargar="${esc(b.name)}">Descargar</button><button type="button" class="btn btn-ghost btn-sm" data-restore="${esc(b.name)}" data-date="${esc(b.date)}">Restaurar</button></span></li>`).join('') : '<li class="admin-muted">Todavía no hay respaldos automáticos. El primero se crea solo unos segundos después de arrancar el servidor.</li>';
    } catch (err) {
      $('backupListError').textContent = err.message;
    }
  }

  async function loadStatus() {
    const box = $('systemStatusBox');
    try {
      const r = await fetch('/api/admin/system-status');
      if (!r.ok) throw new Error('No se pudo leer el estado.');
      const d = await r.json();
      const pill = (ok, okText, badText, warn) => `<span class="admin-sys-pill ${ok ? 'is-ok' : warn ? 'is-warn' : 'is-bad'}">${ok ? okText : badText}</span>`;
      const pay = d.payments.provider === 'openpay' ? `Openpay${d.payments.sandbox ? ' (pruebas)' : ''}` : d.payments.provider === 'stripe' ? 'Stripe' : null;
      const rows = [
        ['Servidor', `${pill(true, 'En línea', '')} desde ${fmtDT(d.startedAt)} (${ago(d.startedAt)})`],
        ['Datos', `${pill(d.data.writable, 'Guardando bien', 'No se puede escribir')} ${d.data.orders} pedidos · ${d.data.products} productos · ${kb(d.data.bytes)}${d.data.external ? ' en el volumen de Railway' : ' en la carpeta del proyecto'}`],
        ['Último respaldo', d.backups.last ? `${pill(true, d.backups.last.date, '')} ${ago(d.backups.last.at)} · ${d.backups.count} guardados` : pill(false, '', 'Aún no hay', true)],
        ['Respaldo por correo', d.backups.emailWeekly ? (d.backups.emailConfigured ? `${pill(true, 'Activo', '')} ${d.backups.lastEmailAt ? `último ${fmtDT(d.backups.lastEmailAt)}` : 'todavía no se envía el primero'}` : pill(false, '', 'Falta correo de avisos o llave de Resend', true)) : pill(false, '', 'Desactivado', true)],
        ['Correos', d.email.configured ? `${pill(!d.email.lastError || (d.email.lastOkAt && d.email.lastOkAt > d.email.lastErrorAt), 'Funcionando', 'Con fallas', true)} ${d.email.lastOkAt ? `último enviado ${fmtDT(d.email.lastOkAt)}` : 'sin envíos todavía'}${d.email.lastError ? ` · último error: ${esc(d.email.lastError)} (${fmtDT(d.email.lastErrorAt)})` : ''}` : pill(false, '', 'Sin RESEND_API_KEY', true)],
        ['Pagos en línea', pay ? `${pill(true, pay, '')}${d.payments.spei ? ' tarjeta, SPEI y tiendas' : ' tarjeta'}` : pill(false, '', 'No configurados (solo WhatsApp)', true)],
        ['Errores (24 h)', d.errors.last24h ? `${pill(false, '', `${d.errors.last24h}`, d.errors.last24h < 5)} <button type="button" class="admin-link-btn" id="sysErrorsBtn">ver</button>` : pill(true, 'Ninguno', '')],
        ['Memoria', `${d.memoryMb} MB · Node ${esc(d.node)}`],
      ];
      box.innerHTML = `<dl class="admin-sys">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        <details class="admin-sys-errors" id="sysErrors" ${d.errors.last24h ? '' : 'hidden'}><summary>Últimos errores</summary><ul>${d.errors.list.map((e) => `<li><small>${fmtDT(e.at)}</small> <b>${esc(e.scope)}</b> ${esc(e.message)}${e.extra ? ` <i>${esc(e.extra)}</i>` : ''}</li>`).join('')}</ul></details>
        <p class="admin-help">Para que te avise si el sitio se cae, da de alta <b>https://www.workjeans.mx/health</b> en un monitor gratuito como UptimeRobot (revisa cada 5 minutos y manda correo).</p>
        <div class="admin-sys-actions"><button type="button" class="btn btn-secondary btn-sm" id="sysRefreshBtn">Actualizar</button></div>`;
      $('sysRefreshBtn').addEventListener('click', loadStatus);
      $('sysErrorsBtn')?.addEventListener('click', () => { $('sysErrors').open = true; $('sysErrors').scrollIntoView({ block: 'nearest' }); });
    } catch (err) {
      box.innerHTML = `<p class="admin-error">${esc(err.message)}</p>`;
    }
  }

  function load() { loaded = true; loadBackups(); loadStatus(); loadSiteTexts().catch(() => {}); }

  document.getElementById('descargarRespaldo')?.addEventListener('click', async () => {
    const res = await fetch('/api/admin/backup');
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo-works-jeans-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });

  $('backupNowBtn').addEventListener('click', async () => {
    $('backupListSuccess').textContent = ''; $('backupListError').textContent = '';
    const r = await fetch('/api/admin/backups/run', { method: 'POST' });
    if (!r.ok) { $('backupListError').textContent = 'No se pudo crear el respaldo.'; return; }
    $('backupListSuccess').textContent = 'Respaldo creado.';
    loadBackups(); loadStatus();
  });
  $('backupEmailBtn').addEventListener('click', async () => {
    $('backupListSuccess').textContent = ''; $('backupListError').textContent = '';
    const b = $('backupEmailBtn'); b.disabled = true;
    const r = await fetch('/api/admin/backups/email', { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    b.disabled = false;
    if (!r.ok) { $('backupListError').textContent = d.error || 'No se pudo enviar.'; return; }
    $('backupListSuccess').textContent = 'Respaldo enviado al correo de avisos.';
    loadBackups(); loadStatus();
  });
  $('backupEmailToggle').addEventListener('change', async (e) => {
    const r = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ backupEmail: e.target.checked }) });
    if (!r.ok) { $('backupListError').textContent = 'No se pudo guardar el ajuste.'; e.target.checked = !e.target.checked; return; }
    if (typeof loadSettingsCache === 'function') loadSettingsCache();
    loadStatus();
  });
  // La descarga pide la contraseña otra vez: el archivo lleva pedidos, clientes y direcciones.
  async function descargar(nombre) {
    $('backupListError').textContent = '';
    const res = await fetch(`/api/admin/backups/${encodeURIComponent(nombre)}`);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (d.code !== 'reauth_required') $('backupListError').textContent = d.error || 'No se pudo descargar.';
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo-works-jeans-${nombre.slice(9)}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  $('backupList').addEventListener('click', async (e) => {
    const btnDescarga = e.target.closest('[data-descargar]');
    if (btnDescarga) { descargar(btnDescarga.dataset.descargar); return; }
    const b = e.target.closest('[data-restore]');
    if (!b) return;
    if (!confirm(`Se reemplazarán TODOS los productos, pedidos y ajustes actuales por los del respaldo del ${b.dataset.date}. ¿Continuar?`)) return;
    $('backupListSuccess').textContent = ''; $('backupListError').textContent = '';
    const r = await fetch(`/api/admin/backups/${b.dataset.restore}/restore`, { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { $('backupListError').textContent = d.error || 'No se pudo restaurar.'; return; }
    $('backupListSuccess').textContent = `Restaurado: ${esc(d.products)} productos y ${d.orders} pedidos.`;
    if (typeof loadSettingsCache === 'function') loadSettingsCache().then(loadProducts).then(loadOrders);
  });

  // ---- Textos del sitio ----
  const tf = (id) => document.getElementById(id);
  let siteTexts = [];
  async function loadSiteTexts() {
    const r = await fetch('/api/admin/site-texts');
    if (!r.ok) { tf('siteTextsFields').innerHTML = '<p class="admin-error">No se pudieron leer los textos.</p>'; return; }
    siteTexts = (await r.json()).texts;
    tf('siteTextsFields').innerHTML = `<div class="admin-texts-grid">${siteTexts.map((t) => `<div class="admin-texts-field ${t.multiline || t.key === 'promo' ? 'is-wide' : ''}"><label for="st_${t.key}">${esc(t.label)}</label>${t.multiline ? `<textarea id="st_${t.key}" rows="${t.key === 'heroTitle' ? 3 : 4}" maxlength="${t.max}" placeholder="${esc(t.defaultText)}">${esc(t.value)}</textarea>` : `<input type="text" id="st_${t.key}" maxlength="${t.max}" placeholder="${esc(t.defaultText)}" value="${esc(t.value)}">`}</div>`).join('')}</div>`;
  }
  tf('siteTextsSaveBtn')?.addEventListener('click', async () => {
    tf('siteTextsError').textContent = ''; tf('siteTextsSuccess').textContent = '';
    const texts = {};
    siteTexts.forEach((t) => { texts[t.key] = tf(`st_${t.key}`).value; });
    const r = await fetch('/api/admin/site-texts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts }) });
    if (!r.ok) { tf('siteTextsError').textContent = 'No se pudieron guardar los textos.'; return; }
    tf('siteTextsSuccess').textContent = 'Textos guardados. Ya se ven en la página de inicio.';
    loadSiteTexts();
  });
  tf('siteTextsResetBtn')?.addEventListener('click', async () => {
    if (!confirm('¿Volver a los textos originales de la página?')) return;
    const r = await fetch('/api/admin/site-texts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts: {} }) });
    if (!r.ok) { tf('siteTextsError').textContent = 'No se pudo restablecer.'; return; }
    tf('siteTextsSuccess').textContent = 'Textos originales restablecidos.';
    loadSiteTexts();
  });

  // ---- Resumen diario ----
  tf('dailySummaryPreviewBtn')?.addEventListener('click', () => window.open('/api/admin/daily-summary/preview', '_blank', 'noopener'));
  tf('dailySummarySendBtn')?.addEventListener('click', async () => {
    const st = tf('dailySummaryStatus'); st.textContent = 'Enviando…';
    const r = await fetch('/api/admin/daily-summary/send', { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    st.textContent = r.ok ? 'Enviado al correo de avisos.' : (d.error || 'No se pudo enviar.');
  });

  // ---- Etiqueta de envío ----
  tf('orderLabelBtn')?.addEventListener('click', () => {
    if (typeof activeOrderId !== 'undefined' && activeOrderId) window.open(`etiqueta.html?id=${encodeURIComponent(activeOrderId)}`, '_blank', 'noopener');
  });

  const baseShowTab = window.showTab;
  window.showTab = function (name) {
    baseShowTab(name);
    if (name !== 'configuracion') return;
    if (document.body.classList.contains('perm-respaldo')) load();
    else if (document.body.classList.contains('perm-configuracion-ver')) loadSiteTexts().catch(() => {});
  };
  // Si el panel abre directo en Configuración
  if (document.querySelector('.admin-side .admin-tab[data-tab="configuracion"].active')) setTimeout(() => { if (!loaded && document.body.classList.contains('perm-respaldo')) load(); }, 800);
})();
