// Panel admin · Seguridad: mi cuenta (contraseña, verificación en dos pasos, sesiones),
// usuarios con roles y bitácora de actividad. El servidor valida todo; aquí solo se pinta.

(function () {
  const accountOverlay = document.getElementById('accountOverlay');
  const userOverlay = document.getElementById('userOverlay');
  let users = [];
  let forced = null; // 'password_change_required' | 'mfa_required' mientras el servidor exija completar un paso
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

  // ---------- Avisos ----------
  let toastTimer = null;
  window.notifyForbidden = function notifyForbidden(message) {
    let el = document.getElementById('adminToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'adminToast';
      el.className = 'admin-toast';
      document.body.appendChild(el);
    }
    el.textContent = message || 'Tu usuario no tiene permiso para esta acción.';
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3500);
  };

  function renderBanner() {
    const banner = document.getElementById('securityBanner');
    const info = window.sessionInfo;
    if (!info || !currentUser) { banner.hidden = true; return; }
    if (currentUser.mustChangePassword) {
      banner.innerHTML = '<strong>Cambia tu contraseña temporal</strong> para empezar a usar el panel. <button type="button" class="btn btn-primary btn-small" data-open-account>Cambiar ahora</button>';
    } else if (info.mfaRequired) {
      banner.innerHTML = '<strong>Activa la verificación en dos pasos.</strong> Tu rol lo exige antes de poder usar el panel. <button type="button" class="btn btn-primary btn-small" data-open-account>Activar ahora</button>';
    } else if (info.mfaSuggested) {
      banner.innerHTML = '<strong>Recomendado:</strong> activa la verificación en dos pasos para proteger la tienda aunque alguien consiga tu contraseña. <button type="button" class="btn btn-secondary btn-small" data-open-account>Activar</button> <button type="button" class="admin-link-btn" data-dismiss-banner>Ahora no</button>';
    } else {
      banner.hidden = true;
      return;
    }
    banner.hidden = false;
  }
  document.getElementById('securityBanner').addEventListener('click', (e) => {
    if (e.target.closest('[data-open-account]')) openAccount();
    if (e.target.closest('[data-dismiss-banner]')) document.getElementById('securityBanner').hidden = true;
  });

  window.onSessionReady = function onSessionReady(info) {
    forced = currentUser.mustChangePassword ? 'password_change_required' : (info.mfaRequired ? 'mfa_required' : null);
    renderBanner();
    if (forced) openAccount();
  };

  window.forceAccountStep = function forceAccountStep(code) {
    forced = code;
    renderBanner();
    openAccount();
  };

  // ---------- Mi cuenta ----------
  function openAccount() {
    if (!currentUser) return;
    document.getElementById('accountSummary').textContent = `${esc(currentUser.name)} · usuario "${currentUser.username}" · ${currentUser.roleLabel}`;
    const notice = document.getElementById('accountNotice');
    notice.hidden = !forced;
    notice.textContent = forced === 'password_change_required'
      ? 'Tu contraseña es temporal: cámbiala para continuar.'
      : 'Tu rol exige verificación en dos pasos: actívala para continuar.';
    document.getElementById('mfaOff').hidden = currentUser.mfaEnabled;
    document.getElementById('mfaOn').hidden = !currentUser.mfaEnabled;
    document.getElementById('mfaSetup').hidden = true;
    document.getElementById('mfaError').textContent = '';
    document.getElementById('passwordError').textContent = '';
    document.getElementById('passwordSuccess').textContent = '';
    document.getElementById('closeAccountBtn').hidden = Boolean(forced);
    accountOverlay.hidden = false;
    if (forced === 'mfa_required') document.getElementById('mfaSetupBtn').click();
  }
  document.getElementById('accountBtn').addEventListener('click', openAccount);
  document.getElementById('openAccountFromSettings').addEventListener('click', openAccount);
  document.getElementById('closeAccountBtn').addEventListener('click', () => { accountOverlay.hidden = true; });

  async function refreshSession() {
    const res = await fetch('/api/admin/session');
    const data = await res.json();
    if (!data.isAdmin) { showLogin(); return; }
    currentUser = data.user;
    window.sessionInfo = data;
    applyPermissions();
    forced = currentUser.mustChangePassword ? 'password_change_required' : (data.mfaRequired ? 'mfa_required' : null);
    renderBanner();
    document.getElementById('closeAccountBtn').hidden = Boolean(forced);
    document.getElementById('accountNotice').hidden = !forced;
    document.getElementById('mfaOff').hidden = currentUser.mfaEnabled;
    document.getElementById('mfaOn').hidden = !currentUser.mfaEnabled;
  }

  document.getElementById('accountPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('passwordError');
    const ok = document.getElementById('passwordSuccess');
    err.textContent = '';
    ok.textContent = '';
    const res = await fetch('/api/admin/me/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: document.getElementById('currentPassword').value, newPassword: document.getElementById('newPassword').value }),
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error || 'No se pudo cambiar la contraseña.'; return; }
    ok.textContent = 'Contraseña actualizada. Tus otras sesiones se cerraron.';
    e.target.reset();
    const wasForced = forced === 'password_change_required';
    await refreshSession();
    if (wasForced && !forced) { accountOverlay.hidden = true; showAdmin(); }
  });

  document.getElementById('mfaSetupBtn').addEventListener('click', async () => {
    document.getElementById('mfaError').textContent = '';
    const res = await fetch('/api/admin/me/mfa/setup', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { document.getElementById('mfaError').textContent = data.error || 'No se pudo generar el código.'; return; }
    document.getElementById('mfaQr').src = data.qr;
    document.getElementById('mfaSecret').textContent = data.secret.match(/.{1,4}/g).join(' ');
    document.getElementById('mfaSetup').hidden = false;
    document.getElementById('mfaEnableCode').value = '';
    document.getElementById('mfaEnableCode').focus();
  });

  document.getElementById('mfaEnableBtn').addEventListener('click', async () => {
    const err = document.getElementById('mfaError');
    err.textContent = '';
    const res = await fetch('/api/admin/me/mfa/enable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: document.getElementById('mfaEnableCode').value }) });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error || 'No se pudo activar.'; return; }
    const wasForced = forced === 'mfa_required';
    await refreshSession();
    if (wasForced && !forced) { accountOverlay.hidden = true; showAdmin(); }
  });

  document.getElementById('mfaDisableBtn').addEventListener('click', async () => {
    const err = document.getElementById('mfaError');
    err.textContent = '';
    const res = await fetch('/api/admin/me/mfa/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: document.getElementById('mfaDisablePassword').value, code: document.getElementById('mfaDisableCode').value }),
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error || 'No se pudo desactivar.'; return; }
    document.getElementById('mfaDisablePassword').value = '';
    document.getElementById('mfaDisableCode').value = '';
    await refreshSession();
  });

  document.getElementById('logoutAllBtn').addEventListener('click', async () => {
    if (!confirm('Se cerrarán todas tus sesiones, incluida esta. ¿Continuar?')) return;
    await fetch('/api/admin/me/logout-all', { method: 'POST' });
    accountOverlay.hidden = true;
    currentUser = null;
    showLogin();
  });

  // ---------- Usuarios ----------
  function roleOptions() {
    const roles = window.sessionInfo?.roles || {};
    return Object.entries(roles).map(([k, r]) => crearOpcion(k, r.label));
  }

  window.loadUsers = async function loadUsers() {
    const res = await fetch('/api/admin/users');
    if (res.status === 401) { showLogin(); return; }
    if (!res.ok) return;
    users = await res.json();
    const requireMfa = settingsCache.security?.requireMfaAdmins !== false;
    document.getElementById('requireMfaAdmins').checked = requireMfa;
    document.getElementById('usersTableBody').innerHTML = users.map((u) => `
      <tr data-id="${esc(u.id)}" class="${u.active ? '' : 'admin-row-hidden'}">
        <td><strong>${esc(u.name)}</strong><br><span class="admin-muted admin-small">${esc(u.username)}${u.id === currentUser.id ? ' · tú' : ''}</span></td>
        <td>${esc(u.roleLabel)}</td>
        <td>${u.mfaEnabled ? '<span class="admin-badge status-pagado">Activa</span>' : '<span class="admin-muted">No</span>'}</td>
        <td>${fmtDate(u.lastLoginAt)}${u.mustChangePassword ? '<br><span class="admin-muted admin-small">Debe cambiar contraseña</span>' : ''}</td>
        <td><label class="admin-switch" title="${u.active ? 'Activo' : 'Desactivado'}"><input type="checkbox" data-action="toggle-user" ${u.active ? 'checked' : ''} ${u.id === currentUser.id ? 'disabled' : ''}><span></span></label></td>
        <td class="admin-table-actions">
          ${iconBtn('edit-user', 'edit', 'Editar')}
          <button type="button" class="admin-icon-btn" data-action="reset-user" title="Nueva contraseña temporal" aria-label="Nueva contraseña temporal">${icon('card')}</button>
          <button type="button" class="admin-icon-btn" data-action="logout-user" title="Cerrar sus sesiones" aria-label="Cerrar sus sesiones">${icon('logout')}</button>
          ${u.mfaEnabled ? `<button type="button" class="admin-icon-btn" data-action="mfa-reset-user" title="Quitar verificación en dos pasos (perdió el teléfono)" aria-label="Quitar verificación">${icon('alert')}</button>` : ''}
          ${u.id === currentUser.id ? '' : iconBtn('delete-user', 'trash', 'Eliminar')}
        </td>
      </tr>`).join('');
    const roles = window.sessionInfo?.roles || {};
    const perms = window.sessionInfo?.permissions || {};
    document.getElementById('rolesGrid').innerHTML = Object.entries(roles).map(([k, r]) => `
      <div class="admin-panel-box admin-role-card">
        <h4>${esc(r.label)}</h4>
        <p class="admin-muted admin-small">${esc(r.description)}</p>
        <ul>${r.perms.map((p) => `<li>${esc(perms[p] || p)}</li>`).join('')}</ul>
      </div>`).join('');
  };

  document.getElementById('requireMfaAdmins').addEventListener('change', async (e) => {
    const res = await fetch('/api/admin/security', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requireMfaAdmins: e.target.checked }) });
    if (!res.ok) { e.target.checked = !e.target.checked; return; }
    settingsCache.security = await res.json();
    await refreshSession();
  });

  function openUserForm(u) {
    document.getElementById('userError').textContent = '';
    document.getElementById('userForm').reset();
    llenarSelect(document.getElementById('userRole'), roleOptions());
    document.getElementById('userId').value = u?.id || '';
    document.getElementById('userFormTitle').textContent = u ? 'Editar usuario' : 'Nuevo usuario';
    document.getElementById('userName').value = u?.name || '';
    document.getElementById('userUsername').value = u?.username || '';
    document.getElementById('userUsername').disabled = Boolean(u);
    document.getElementById('userRole').value = u?.role || 'ventas';
    document.getElementById('userRole').disabled = Boolean(u) && u.id === currentUser.id;
    document.getElementById('userPasswordWrap').hidden = Boolean(u);
    const campo = document.getElementById('userPassword');
    campo.type = 'password';
    document.querySelector('[data-toggle-password="userPassword"]')?.setAttribute('aria-pressed', 'false');
    document.getElementById('userPassword').required = !u;
    updateRoleHelp();
    userOverlay.hidden = false;
  }
  function updateRoleHelp() {
    const r = window.sessionInfo?.roles?.[document.getElementById('userRole').value];
    document.getElementById('userRoleHelp').textContent = r ? r.description : '';
  }
  document.getElementById('userRole').addEventListener('change', updateRoleHelp);
  document.getElementById('newUserBtn').addEventListener('click', () => openUserForm(null));
  document.getElementById('cancelUserBtn').addEventListener('click', () => { userOverlay.hidden = true; });

  document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('userId').value;
    const body = { name: document.getElementById('userName').value, role: document.getElementById('userRole').value };
    if (!id) {
      body.username = document.getElementById('userUsername').value.trim().toLowerCase();
      body.password = document.getElementById('userPassword').value;
    }
    const res = await fetch(id ? `/api/admin/users/${id}` : '/api/admin/users', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { document.getElementById('userError').textContent = data.error || 'No se pudo guardar.'; return; }
    userOverlay.hidden = true;
    loadUsers();
  });

  document.getElementById('usersTableBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.dataset.action === 'toggle-user') return;
    const id = btn.closest('tr').dataset.id;
    const u = users.find((x) => x.id === id);
    const action = btn.dataset.action;
    let res;
    if (action === 'edit-user') { openUserForm(u); return; }
    if (action === 'reset-user') {
      const password = prompt(`Nueva contraseña temporal para ${esc(u.name)} (mínimo 8 caracteres). Tendrá que cambiarla al entrar.`);
      if (!password) return;
      res = await fetch(`/api/admin/users/${id}/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    }
    if (action === 'logout-user') {
      if (!confirm(`¿Cerrar todas las sesiones de ${esc(u.name)}?`)) return;
      res = await fetch(`/api/admin/users/${id}/logout-all`, { method: 'POST' });
    }
    if (action === 'mfa-reset-user') {
      if (!confirm(`¿Quitar la verificación en dos pasos de ${esc(u.name)}? Podrá entrar solo con contraseña hasta que la vuelva a activar.`)) return;
      res = await fetch(`/api/admin/users/${id}/mfa-reset`, { method: 'POST' });
    }
    if (action === 'delete-user') {
      if (!confirm(`¿Eliminar el usuario de ${esc(u.name)}? Esta acción no se puede deshacer.`)) return;
      res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    }
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) notifyForbidden(data.error || 'No se pudo completar la acción.');
    loadUsers();
  });
  document.getElementById('usersTableBody').addEventListener('change', async (e) => {
    if (e.target.dataset.action !== 'toggle-user') return;
    const id = e.target.closest('tr').dataset.id;
    const res = await fetch(`/api/admin/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: e.target.checked }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) notifyForbidden(data.error || 'No se pudo cambiar.');
    loadUsers();
  });

  // ---------- Bitácora ----------
  const ACTION_LABELS = {
    login: 'Inició sesión',
    'login.fallido': 'Intento de acceso fallido',
    'login.mfa_fallido': 'Código de verificación incorrecto',
    logout: 'Cerró sesión',
    'me.password_cambiada': 'Cambió su contraseña',
    'me.mfa_activada': 'Activó verificación en dos pasos',
    'me.mfa_desactivada': 'Desactivó verificación en dos pasos',
    'me.cerrar_sesiones': 'Cerró todas sus sesiones',
    'usuarios.crear': 'Creó un usuario',
    'usuarios.editar': 'Editó un usuario',
    'usuarios.eliminar': 'Eliminó un usuario',
    'usuarios.reset_password': 'Asignó contraseña temporal',
    'usuarios.cerrar_sesiones': 'Cerró las sesiones de un usuario',
    'usuarios.mfa_reiniciada': 'Quitó verificación en dos pasos a un usuario',
    'seguridad.configurar': 'Cambió la configuración de seguridad',
  };
  const ROUTE_LABELS = [
    [/^POST \/api\/admin\/products\/[^/]+\/duplicate/, 'Duplicó un producto'],
    [/^POST \/api\/admin\/products$/, 'Creó un producto'],
    [/^(PUT|PATCH) \/api\/admin\/products\//, 'Editó un producto'],
    [/^PUT \/api\/admin\/products-order/, 'Reordenó productos'],
    [/^DELETE \/api\/admin\/products\//, 'Eliminó un producto'],
    [/^POST \/api\/admin\/orders$/, 'Registró un pedido'],
    [/^PUT \/api\/admin\/orders\//, 'Actualizó un pedido'],
    [/^DELETE \/api\/admin\/orders\//, 'Eliminó un pedido'],
    [/^POST \/api\/admin\/inventory\/entry/, 'Entrada de inventario'],
    [/^POST \/api\/admin\/inventory\/adjust/, 'Ajuste de inventario'],
    [/^POST \/api\/admin\/inventory\/transfer/, 'Traspaso entre almacenes'],
    [/^PUT \/api\/admin\/settings/, 'Cambió la configuración'],
    [/^POST \/api\/admin\/test-email/, 'Probó el correo'],
    [/^POST \/api\/admin\/promotions$/, 'Creó una promoción'],
    [/^PUT \/api\/admin\/promotions\//, 'Editó una promoción'],
    [/^DELETE \/api\/admin\/promotions\//, 'Eliminó una promoción'],
    [/^POST \/api\/admin\/suppliers$/, 'Creó un proveedor'],
    [/^PUT \/api\/admin\/suppliers\//, 'Editó un proveedor'],
    [/^DELETE \/api\/admin\/suppliers\//, 'Eliminó un proveedor'],
    [/^POST \/api\/admin\/purchases\/[^/]+\/receive/, 'Recibió mercancía de una orden de compra'],
    [/^POST \/api\/admin\/purchases$/, 'Creó una orden de compra'],
    [/^PUT \/api\/admin\/purchases\//, 'Editó una orden de compra'],
    [/^POST \/api\/admin\/returns/, 'Registró una devolución o cambio'],
    [/^POST \/api\/admin\/restore/, 'Restauró un respaldo'],
  ];
  function actionLabel(a) {
    if (ACTION_LABELS[a]) return ACTION_LABELS[a];
    const hit = ROUTE_LABELS.find(([re]) => re.test(a));
    return hit ? hit[1] : a;
  }
  let auditCache = [];
  function renderAudit() {
    const q = document.getElementById('auditSearch').value.trim().toLowerCase();
    const rows = auditCache.filter((a) => !q || `${a.user || ''} ${actionLabel(a.action)} ${a.target || ''}`.toLowerCase().includes(q));
    document.getElementById('auditTableBody').innerHTML = rows.length ? rows.map((a) => {
      const detail = [a.target ? `Usuario: ${a.target}` : '', a.details && typeof a.details === 'object' ? Object.entries(a.details).map(([k, v]) => `${k}: ${v}`).join(' · ') : ''].filter(Boolean).join(' · ');
      const bad = /fallido/.test(a.action);
      return `<tr class="${bad ? 'admin-audit-bad' : ''}">
        <td class="admin-nowrap">${fmtDate(a.at)}</td>
        <td>${esc(a.user) || '<span class="admin-muted">—</span>'}</td>
        <td>${esc(actionLabel(a.action))}</td>
        <td class="admin-muted admin-small">${esc(detail).slice(0, 200)}</td>
        <td class="admin-muted admin-small">${esc(a.ip)}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="5">Sin actividad registrada.</td></tr>';
  }
  window.loadAudit = async function loadAudit() {
    const res = await fetch('/api/admin/audit?limit=500');
    if (res.status === 401) { showLogin(); return; }
    if (!res.ok) return;
    auditCache = listaDe(await res.json());
    renderAudit();
  };
  document.getElementById('auditSearch').addEventListener('input', renderAudit);
})();

// Mostrar u ocultar la contraseña temporal sin sacar el foco del formulario.
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-toggle-password]');
  if (!btn) return;
  const campo = document.getElementById(btn.dataset.togglePassword);
  if (!campo) return;
  const verla = campo.type === 'password';
  campo.type = verla ? 'text' : 'password';
  btn.textContent = verla ? 'Ocultar' : 'Mostrar';
  btn.setAttribute('aria-label', verla ? 'Ocultar la contraseña' : 'Mostrar la contraseña');
  btn.setAttribute('aria-pressed', String(verla));
  campo.focus();
});
