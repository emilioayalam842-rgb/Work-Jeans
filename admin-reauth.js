// Reautenticación: algunas acciones (respaldos, contraseñas, usuarios, seguridad) piden la contraseña
// otra vez aunque la sesión esté abierta. Esta ventana la pide y reintenta la acción original.
(function () {
  let pendiente = null;

  function crearVentana() {
    if (document.getElementById('reauthOverlay')) return;
    const div = document.createElement('div');
    div.className = 'admin-overlay';
    div.id = 'reauthOverlay';
    div.hidden = true;
    div.innerHTML = `
      <div class="admin-form admin-reauth" role="dialog" aria-modal="true" aria-labelledby="reauthTitle">
        <h2 id="reauthTitle">Confirma que eres tú</h2>
        <p class="admin-help" id="reauthWhy">Esta acción maneja datos sensibles. Escribe tu contraseña para continuar.</p>
        <label for="reauthPassword">Tu contraseña</label>
        <div class="admin-password-field">
          <input type="password" id="reauthPassword" autocomplete="current-password">
          <button type="button" class="admin-password-toggle" data-toggle-password="reauthPassword" aria-label="Mostrar la contraseña" aria-pressed="false">Mostrar</button>
        </div>
        <div id="reauthCodeWrap" hidden>
          <label for="reauthCode">Código de verificación</label>
          <input type="text" id="reauthCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">
        </div>
        <p class="admin-error" id="reauthError" role="alert" aria-live="assertive"></p>
        <div class="admin-form-actions">
          <button type="button" class="btn btn-secondary" id="reauthCancel">Cancelar</button>
          <button type="button" class="btn btn-primary" id="reauthOk">Continuar</button>
        </div>
      </div>`;
    document.body.appendChild(div);
    document.getElementById('reauthCancel').addEventListener('click', cerrar);
    document.getElementById('reauthOk').addEventListener('click', confirmar);
    div.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') cerrar(); });
  }

  function abrir(motivo) {
    crearVentana();
    const o = document.getElementById('reauthOverlay');
    document.getElementById('reauthError').textContent = '';
    document.getElementById('reauthPassword').value = '';
    document.getElementById('reauthCode').value = '';
    document.getElementById('reauthCodeWrap').hidden = true;
    if (motivo) document.getElementById('reauthWhy').textContent = motivo;
    o.hidden = false;
    setTimeout(() => document.getElementById('reauthPassword').focus(), 30);
  }

  function cerrar() {
    const o = document.getElementById('reauthOverlay');
    if (o) o.hidden = true;
    if (pendiente) { pendiente.reject(new Error('cancelado')); pendiente = null; }
  }

  async function confirmar() {
    const err = document.getElementById('reauthError');
    const btn = document.getElementById('reauthOk');
    err.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Comprobando…';
    try {
      const res = await fetch('/api/admin/reauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: document.getElementById('reauthPassword').value, code: document.getElementById('reauthCode').value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'mfa_needed') {
          document.getElementById('reauthCodeWrap').hidden = false;
          document.getElementById('reauthCode').focus();
        }
        err.textContent = data.error || 'No se pudo confirmar.';
        return;
      }
      document.getElementById('reauthOverlay').hidden = true;
      const p = pendiente; pendiente = null;
      if (p) p.resolve();
    } catch {
      err.textContent = 'No hubo respuesta del servidor. Revisa tu conexión.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Continuar';
    }
  }

  // Pide la contraseña y resuelve cuando el servidor la acepta.
  window.pedirReauth = function (motivo) {
    return new Promise((resolve, reject) => {
      pendiente = { resolve, reject };
      abrir(motivo);
    });
  };

  // Cualquier petición que reciba "reauth_required" se reintenta sola después de confirmar.
  const fetchOriginal = window.fetch;
  window.fetch = async function (recurso, opciones) {
    const res = await fetchOriginal(recurso, opciones);
    const url = typeof recurso === 'string' ? recurso : (recurso && recurso.url) || '';
    if (res.status !== 403 || !url.includes('/api/admin/') || url.includes('/api/admin/reauth')) return res;
    let cuerpo;
    try { cuerpo = await res.clone().json(); } catch { return res; }
    if (cuerpo.code !== 'reauth_required') return res;
    try {
      await window.pedirReauth(cuerpo.error);
    } catch { return res; }
    return fetchOriginal(recurso, opciones);
  };
})();
