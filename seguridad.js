// Seguridad del panel: usuarios con roles y permisos, verificación en dos pasos (TOTP),
// bloqueo por intentos fallidos, sesiones con versión (para cerrarlas todas) y bitácora de actividad.
// Todo se valida aquí, en el servidor: el panel solo oculta botones por comodidad.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ISSUER = 'Works Jeans';

// ---------- Roles y permisos ----------

const PERMISSIONS = {
  'pedidos.ver': 'Ver pedidos',
  'pedidos.editar': 'Crear y actualizar pedidos',
  'pedidos.eliminar': 'Eliminar pedidos',
  'devoluciones.ver': 'Ver devoluciones',
  'devoluciones.editar': 'Registrar devoluciones y cambios',
  'clientes.ver': 'Ver clientes',
  'productos.ver': 'Ver catálogo',
  'productos.editar': 'Editar catálogo, categorías y colecciones',
  'productos.eliminar': 'Eliminar productos',
  'inventario.ver': 'Ver existencias y movimientos',
  'inventario.editar': 'Entradas, ajustes y traspasos',
  'compras.ver': 'Ver proveedores y órdenes de compra',
  'compras.editar': 'Gestionar proveedores y órdenes de compra',
  'promociones.ver': 'Ver cupones y promociones',
  'promociones.editar': 'Gestionar cupones y promociones',
  'reportes.ver': 'Ver dashboard y reportes',
  'costos.ver': 'Ver costos y utilidad',
  'configuracion.ver': 'Ver configuración de la tienda',
  'configuracion.editar': 'Editar configuración de la tienda',
  'respaldo': 'Descargar y restaurar respaldos',
  'usuarios': 'Administrar usuarios y roles',
  'auditoria': 'Ver la bitácora de actividad',
};

const ROLES = {
  superadmin: { label: 'Super admin', description: 'Todo, incluidos usuarios, respaldos y bitácora.', perms: '*', mfa: true },
  admin: {
    label: 'Administrador',
    description: 'Operación completa de la tienda, sin usuarios ni respaldos.',
    perms: Object.keys(PERMISSIONS).filter((p) => !['usuarios', 'respaldo', 'auditoria'].includes(p)),
    mfa: true,
  },
  inventario: {
    label: 'Inventario',
    description: 'Existencias, entradas, ajustes, proveedores y órdenes de compra.',
    perms: ['productos.ver', 'inventario.ver', 'inventario.editar', 'compras.ver', 'compras.editar', 'costos.ver'],
  },
  ventas: {
    label: 'Ventas',
    description: 'Pedidos, estados y datos de contacto necesarios para entregar.',
    perms: ['pedidos.ver', 'pedidos.editar', 'clientes.ver', 'productos.ver'],
  },
  atencion: {
    label: 'Atención a clientes',
    description: 'Pedidos, cambios y devoluciones.',
    perms: ['pedidos.ver', 'devoluciones.ver', 'devoluciones.editar', 'clientes.ver', 'productos.ver'],
  },
  marketing: {
    label: 'Marketing',
    description: 'Cupones y promociones. Sin datos financieros ni de clientes.',
    perms: ['promociones.ver', 'promociones.editar', 'productos.ver'],
  },
  contabilidad: {
    label: 'Contabilidad',
    description: 'Reportes, ventas, costos y devoluciones. Solo lectura.',
    perms: ['reportes.ver', 'costos.ver', 'pedidos.ver', 'devoluciones.ver', 'compras.ver'],
  },
};

function permsForRole(role) {
  const r = ROLES[role];
  if (!r) return [];
  return r.perms === '*' ? Object.keys(PERMISSIONS) : r.perms;
}

function roleHas(role, perm) {
  return permsForRole(role).includes(perm);
}

// ---------- Contraseñas ----------

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function verifyHash(password, salt, hash) {
  const provided = Buffer.from(hashPassword(String(password || ''), salt), 'hex');
  const expected = Buffer.from(hash, 'hex');
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

function passwordProblem(password, username) {
  const p = String(password || '');
  if (p.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (p.length > 200) return 'La contraseña es demasiado larga.';
  if (username && p.toLowerCase().includes(String(username).toLowerCase())) return 'La contraseña no puede contener el nombre de usuario.';
  if (/^(.)\1+$/.test(p) || ['12345678', 'password', 'contraseña', 'workjeans', 'worksjeans'].includes(p.toLowerCase())) return 'Esa contraseña es demasiado fácil de adivinar.';
  return null;
}

// ---------- TOTP (verificación en dos pasos, compatible con Google Authenticator, Authy, 1Password…) ----------

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bytes = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function totpAt(secret, step) {
  const key = base32Decode(secret);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(code % 1e6).padStart(6, '0');
}

function newTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

// Devuelve el paso (ventana de 30 s) en que coincide el código, o null. Acepta ±1 paso de desfase.
function totpMatchStep(secret, code, lastStep = 0) {
  const digits = String(code || '').replace(/\D/g, '');
  if (digits.length !== 6) return null;
  const now = Math.floor(Date.now() / 1000 / 30);
  for (const step of [now, now - 1, now + 1]) {
    if (step <= lastStep) continue; // un código nunca sirve dos veces
    const expected = Buffer.from(totpAt(secret, step));
    const given = Buffer.from(digits);
    if (expected.length === given.length && crypto.timingSafeEqual(expected, given)) return step;
  }
  return null;
}

function otpauthUrl(username, secret) {
  return `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(username)}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30`;
}

// ---------- Almacenamiento ----------

function createSecurity({ dataDir, legacyAuthPath }) {
  const USERS_PATH = path.join(dataDir, 'users.json');
  const AUDIT_PATH = path.join(dataDir, 'audit.json');
  const SECRET_PATH = path.join(dataDir, 'session-secret.txt');

  function readJson(file, fallback) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      return fallback;
    }
  }

  function getUsers() {
    return readJson(USERS_PATH, []);
  }

  function saveUsers(users) {
    fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2) + '\n', { mode: 0o600 });
  }

  function publicUser(u) {
    if (!u) return null;
    return {
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      roleLabel: ROLES[u.role]?.label || u.role,
      active: u.active !== false,
      mfaEnabled: Boolean(u.mfa?.enabled),
      mustChangePassword: Boolean(u.mustChangePassword),
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt || null,
      perms: permsForRole(u.role),
    };
  }

  function findUser(id) {
    return getUsers().find((u) => u.id === id) || null;
  }

  function findByUsername(username) {
    const key = String(username || '').trim().toLowerCase();
    return getUsers().find((u) => u.username.toLowerCase() === key) || null;
  }

  function updateUser(id, patch) {
    const users = getUsers();
    const u = users.find((x) => x.id === id);
    if (!u) return null;
    Object.assign(u, typeof patch === 'function' ? patch(u) || {} : patch);
    saveUsers(users);
    return u;
  }

  function createUser({ username, name, role, password, mustChangePassword = true }) {
    const users = getUsers();
    const salt = crypto.randomBytes(16).toString('hex');
    const user = {
      id: `usr_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
      username: String(username).trim().toLowerCase(),
      name: String(name || username).trim(),
      role,
      salt,
      hash: hashPassword(password, salt),
      active: true,
      mfa: { enabled: false, secret: null, lastStep: 0 },
      mustChangePassword,
      sessionVersion: 1,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };
    users.push(user);
    saveUsers(users);
    return user;
  }

  // Primera vez: convierte la contraseña única anterior (admin-auth.json o ADMIN_PASSWORD) en el usuario "admin" super admin.
  function init() {
    if (getUsers().length) return;
    let salt;
    let hash;
    const legacy = readJson(legacyAuthPath, null);
    if (legacy?.salt && legacy?.hash) ({ salt, hash } = legacy);
    else if (process.env.ADMIN_PASSWORD) {
      salt = crypto.randomBytes(16).toString('hex');
      hash = hashPassword(process.env.ADMIN_PASSWORD, salt);
    } else return;
    saveUsers([{
      id: 'usr_admin',
      username: 'admin',
      name: 'Dueño',
      role: 'superadmin',
      salt,
      hash,
      active: true,
      mfa: { enabled: false, secret: null, lastStep: 0 },
      mustChangePassword: false,
      sessionVersion: 1,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    }]);
    console.log('Usuarios: se creó el super admin "admin" con la contraseña del panel.');
  }

  // Secreto de sesión: si no viene por variable de entorno se genera una vez y se guarda en el volumen.
  function sessionSecret() {
    if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
    try {
      const saved = fs.readFileSync(SECRET_PATH, 'utf-8').trim();
      if (saved.length >= 32) return saved;
    } catch { /* se crea abajo */ }
    const secret = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(SECRET_PATH, secret + '\n', { mode: 0o600 });
    return secret;
  }

  // ---------- Bitácora ----------

  const SENSITIVE_KEY = /pass|secret|token|code|hash|salt|key/i;
  function summarize(body) {
    if (!body || typeof body !== 'object') return undefined;
    const out = {};
    for (const [k, v] of Object.entries(body)) {
      if (SENSITIVE_KEY.test(k)) out[k] = '[oculto]';
      else if (v && typeof v === 'object') out[k] = Array.isArray(v) ? `[${v.length}]` : '{…}';
      else out[k] = String(v).slice(0, 80);
    }
    return out;
  }

  function audit(entry) {
    const list = readJson(AUDIT_PATH, []);
    list.push({ id: `aud_${Date.now().toString(36)}_${crypto.randomBytes(2).toString('hex')}`, at: new Date().toISOString(), ...entry });
    if (list.length > 5000) list.splice(0, list.length - 5000);
    fs.writeFileSync(AUDIT_PATH, JSON.stringify(list, null, 2) + '\n');
  }

  function getAudit() {
    return readJson(AUDIT_PATH, []);
  }

  // ---------- Bloqueo por intentos ----------

  const WINDOW = 15 * 60 * 1000;
  const MAX_FAILS = 5;
  const attempts = new Map(); // clave (ip o usuario) -> { first, count }

  function blocked(key) {
    const e = attempts.get(key);
    if (!e) return false;
    if (Date.now() - e.first > WINDOW) {
      attempts.delete(key);
      return false;
    }
    return e.count >= MAX_FAILS;
  }

  function fail(key) {
    const e = attempts.get(key);
    if (!e || Date.now() - e.first > WINDOW) attempts.set(key, { first: Date.now(), count: 1 });
    else e.count += 1;
  }

  function clear(key) {
    attempts.delete(key);
  }

  return {
    USERS_PATH,
    AUDIT_PATH,
    init,
    sessionSecret,
    getUsers,
    saveUsers,
    findUser,
    findByUsername,
    updateUser,
    createUser,
    publicUser,
    audit,
    getAudit,
    summarize,
    attempts: { blocked, fail, clear },
  };
}

module.exports = {
  PERMISSIONS,
  ROLES,
  permsForRole,
  roleHas,
  hashPassword,
  verifyHash,
  passwordProblem,
  newTotpSecret,
  totpMatchStep,
  otpauthUrl,
  createSecurity,
};
