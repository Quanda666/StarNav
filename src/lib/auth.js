const SESSION_COOKIE_NAME = 'nav_admin_session';
const SESSION_PREFIX = 'session:';
const API_TOKEN_PREFIX = 'api_token:';
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const PASSWORD_HASH_PREFIX = 'pbkdf2$';
const PASSWORD_HASH_ITERATIONS = 100000;
const PASSWORD_HASH_KEYLEN = 32;
const API_TOKEN_SECRET_BYTES = 32;

/**
 * @typedef {'read' | 'write' | 'admin' | string} ApiTokenScope
 */

/**
 * @typedef {object} ApiTokenPublicRecord
 * @property {string} id Token ID。
 * @property {string} name Token 名称。
 * @property {ApiTokenScope[]} scopes 授权范围。
 * @property {string|null} createdAt 创建时间。
 * @property {string|null} lastUsedAt 最近使用时间。
 * @property {string|null} revokedAt 吊销时间。
 */

/**
 * @typedef {object} AuthResult
 * @property {boolean} authenticated 是否鉴权成功。
 * @property {boolean} [forbidden] 是否已识别身份但权限范围不足。
 * @property {string|ApiTokenPublicRecord} [token] session token 或脱敏后的 API Token 信息。
 */

/**
 * 解析 Cookie 请求头为键值对象。
 *
 * @param {string} [cookieHeader=''] 原始 Cookie 请求头。
 * @returns {Record<string, string>}
 */
export function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex === -1) {
        acc[pair] = '';
      } else {
        const key = pair.slice(0, separatorIndex).trim();
        const value = pair.slice(separatorIndex + 1).trim();
        acc[key] = value;
      }
      return acc;
    }, {});
}

/**
 * 构建后台管理员 session Cookie。
 *
 * @param {string} token session token。
 * @param {object} [options] Cookie 选项。
 * @param {number} [options.maxAge=SESSION_TTL_SECONDS] Cookie 有效期，单位秒。
 * @returns {string}
 */
export function buildSessionCookie(token, options = {}) {
  const { maxAge = SESSION_TTL_SECONDS } = options;
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Strict',
    'Secure',
  ].join('; ');
}

/**
 * 创建后台管理员 session，并写入 KV。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_AUTH`。
 * @returns {Promise<string>} 新创建的 session token。
 */
export async function createAdminSession(env) {
  const token = crypto.randomUUID();
  await env.NAV_AUTH.put(`${SESSION_PREFIX}${token}`, JSON.stringify({ createdAt: Date.now() }), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
  return token;
}

/**
 * 刷新后台管理员 session TTL。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_AUTH`。
 * @param {string} token session token。
 * @param {string} payload 原始 session payload。
 * @returns {Promise<void>}
 */
export async function refreshAdminSession(env, token, payload) {
  await env.NAV_AUTH.put(`${SESSION_PREFIX}${token}`, payload, { expirationTtl: SESSION_TTL_SECONDS });
}

/**
 * 销毁后台管理员 session。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_AUTH`。
 * @param {string} token session token。
 * @returns {Promise<void>}
 */
export async function destroyAdminSession(env, token) {
  if (!token) return;
  await env.NAV_AUTH.delete(`${SESSION_PREFIX}${token}`);
}

/**
 * 校验请求中的后台管理员 session Cookie。
 *
 * 校验成功时会自动刷新 session TTL。
 *
 * @param {Request} request 当前请求。
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_AUTH`。
 * @returns {Promise<AuthResult>}
 */
export async function validateAdminSession(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return { authenticated: false };

  const sessionKey = `${SESSION_PREFIX}${token}`;
  const payload = await env.NAV_AUTH.get(sessionKey);
  if (!payload) return { authenticated: false };

  await refreshAdminSession(env, token, payload);
  return { authenticated: true, token };
}

/**
 * 判断当前请求是否已通过后台管理员鉴权。
 *
 * @param {Request} request 当前请求。
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_AUTH`。
 * @returns {Promise<boolean>}
 */
export async function isAdminAuthenticated(request, env) {
  const { authenticated } = await validateAdminSession(request, env);
  return authenticated;
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

function generateApiTokenSecret() {
  const array = new Uint8Array(API_TOKEN_SECRET_BYTES);
  crypto.getRandomValues(array);
  return toHex(array);
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

function getBearerToken(request) {
  const authorization = request.headers.get('Authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

export function hasBearerToken(request) {
  return Boolean(getBearerToken(request));
}

function normalizeTokenScopes(scopes = []) {
  const values = Array.isArray(scopes) ? scopes : String(scopes || '').split(/[,\s]+/);
  const normalized = values
    .map((scope) => String(scope || '').trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(normalized.length ? normalized : ['read']));
}

function sanitizeApiTokenRecord(record = {}) {
  return {
    id: record.id,
    name: record.name || '未命名 Token',
    scopes: normalizeTokenScopes(record.scopes),
    createdAt: record.createdAt || null,
    lastUsedAt: record.lastUsedAt || null,
    revokedAt: record.revokedAt || null,
  };
}

/**
 * 创建第三方 API Token。
 *
 * 返回值中的 `token` 只会在创建时明文返回一次；KV 中仅保存哈希和脱敏元数据。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_AUTH`。
 * @param {object} [input] Token 创建参数。
 * @param {string} [input.name] Token 名称。
 * @param {ApiTokenScope[]|string} [input.scopes] 授权范围，默认包含 `read` 和 `write`。
 * @returns {Promise<{token: string, data: ApiTokenPublicRecord}>}
 */
export async function createApiToken(env, input = {}) {
  const id = crypto.randomUUID();
  const secret = generateApiTokenSecret();
  const token = `nav_${id.replace(/-/g, '')}_${secret}`;
  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();
  const record = {
    id,
    name: String(input?.name || '第三方客户端').trim().slice(0, 80) || '第三方客户端',
    scopes: normalizeTokenScopes(input?.scopes || ['read', 'write']),
    tokenHash,
    createdAt: now,
    lastUsedAt: null,
    revokedAt: null,
  };
  await env.NAV_AUTH.put(`${API_TOKEN_PREFIX}${id}`, JSON.stringify(record));
  return { token, data: sanitizeApiTokenRecord(record) };
}

/**
 * 列出所有 API Token 的脱敏元数据。
 *
 * 不返回 Token 明文或哈希，适合后台管理页展示。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_AUTH`。
 * @returns {Promise<ApiTokenPublicRecord[]>}
 */
export async function listApiTokens(env) {
  const list = await env.NAV_AUTH.list({ prefix: API_TOKEN_PREFIX });
  const records = [];
  for (const key of list.keys || []) {
    const raw = await env.NAV_AUTH.get(key.name);
    if (!raw) continue;
    try {
      records.push(sanitizeApiTokenRecord(JSON.parse(raw)));
    } catch {
      // ignore broken token metadata
    }
  }
  records.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return records;
}

/**
 * 吊销指定 API Token。
 *
 * 吊销采用写入 `revokedAt` 的软删除方式，便于审计和保留历史记录。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_AUTH`。
 * @param {string} id Token ID。
 * @returns {Promise<ApiTokenPublicRecord>} 吊销后的脱敏 Token 记录。
 * @throws {Error} 当 ID 为空或 Token 不存在时抛出错误。
 */
export async function revokeApiToken(env, id) {
  const tokenId = String(id || '').trim();
  if (!tokenId) throw new Error('Token id is required');
  const key = `${API_TOKEN_PREFIX}${tokenId}`;
  const raw = await env.NAV_AUTH.get(key);
  if (!raw) throw new Error('Token not found');
  const record = JSON.parse(raw);
  record.revokedAt = record.revokedAt || new Date().toISOString();
  await env.NAV_AUTH.put(key, JSON.stringify(record));
  return sanitizeApiTokenRecord(record);
}

/**
 * 校验请求中的 Bearer API Token。
 *
 * 会遍历 KV 中的 Token 哈希并使用常量时间比较；当 Token 存在但缺少所需 scope 时返回 `forbidden=true`。
 * 鉴权成功后会同步更新 `lastUsedAt`，确保后台管理页可可靠显示最近使用时间。
 *
 * @param {Request} request 当前请求。
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_AUTH`。
 * @param {ApiTokenScope|string} [requiredScope='write'] 调用接口所需权限范围；`admin` scope 可覆盖普通权限。
 * @returns {Promise<AuthResult>}
 */
export async function validateApiToken(request, env, requiredScope = 'write') {
  const token = getBearerToken(request);
  if (!token) return { authenticated: false };
  const tokenHash = await sha256Hex(token);
  const list = await env.NAV_AUTH.list({ prefix: API_TOKEN_PREFIX });
  for (const key of list.keys || []) {
    const raw = await env.NAV_AUTH.get(key.name);
    if (!raw) continue;
    let record;
    try {
      record = JSON.parse(raw);
    } catch {
      continue;
    }
    if (record?.revokedAt || !record?.tokenHash) continue;
    if (!(await constantTimeCompare(tokenHash, record.tokenHash))) continue;

    const scopes = normalizeTokenScopes(record.scopes);
    if (requiredScope && !scopes.includes(requiredScope) && !scopes.includes('admin')) {
      return { authenticated: false, forbidden: true, token: sanitizeApiTokenRecord(record) };
    }

    // Token 鉴权成功后可靠写入最近使用时间。
    // 这里不能使用未托管的后台 Promise，否则在 Cloudflare Workers 请求结束时可能被中止，
    // 导致管理页一直显示“从未使用”。
    const updatePayload = { ...record, lastUsedAt: new Date().toISOString() };
    await env.NAV_AUTH.put(key.name, JSON.stringify(updatePayload));

    return { authenticated: true, token: sanitizeApiTokenRecord(updatePayload) };
  }
  return { authenticated: false };
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: PASSWORD_HASH_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PASSWORD_HASH_KEYLEN * 8
  );
  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function constantTimeCompare(a, b) {
  if (a.length !== b.length) return false;
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}

/**
 * 校验后台管理员用户名和密码。
 *
 * 兼容旧版明文密码：首次使用明文密码登录成功后，会自动升级为 PBKDF2 哈希存储。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_AUTH`。
 * @param {string} name 管理员用户名。
 * @param {string} password 管理员密码。
 * @returns {Promise<boolean>} 凭据是否有效。
 */
export async function verifyAdminCredentials(env, name, password) {
  const storedUsername = await env.NAV_AUTH.get('admin_username');
  const storedPasswordData = await env.NAV_AUTH.get('admin_password');

  if (!storedUsername || !storedPasswordData) return false;
  if (String(name || '').trim() !== storedUsername) return false;

  const trimmedPassword = String(password || '').trim();

  // 兼容旧版明文密码（首次登录后自动升级为哈希）
  if (!storedPasswordData.startsWith(PASSWORD_HASH_PREFIX)) {
    const isValid = trimmedPassword === storedPasswordData;
    if (isValid) {
      // 自动升级为哈希存储
      const salt = generateSalt();
      const hash = await hashPassword(trimmedPassword, salt);
      await env.NAV_AUTH.put('admin_password', `${PASSWORD_HASH_PREFIX}${salt}$${hash}`);
      console.log('[auth] Password upgraded to hashed format');
    }
    return isValid;
  }

  // 验证哈希密码
  const parts = storedPasswordData.slice(PASSWORD_HASH_PREFIX.length).split('$');
  if (parts.length !== 2) return false;
  const [salt, storedHash] = parts;
  const computedHash = await hashPassword(trimmedPassword, salt);
  return constantTimeCompare(computedHash, storedHash);
}