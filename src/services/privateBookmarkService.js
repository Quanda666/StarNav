import { parseCookies } from '../lib/auth.js';
import { cleanText } from '../lib/utils.js';
import { getSettingRecord, setSetting } from './settingsService.js';

export const PRIVATE_BOOKMARK_CATEGORY = '私人书签';

const PRIVATE_ACCESS_COOKIE_NAME = 'nav_private_bookmarks_access';
const PRIVATE_ACCESS_TTL_SECONDS = 60 * 60 * 12;
const PRIVATE_ACCESS_TTL_OPTIONS = {
  session: 60 * 60 * 24,
  '1h': 60 * 60,
  '12h': 60 * 60 * 12,
  '7d': 60 * 60 * 24 * 7,
  '30d': 60 * 60 * 24 * 30,
};
const PRIVATE_ACCESS_TOKEN_PREFIX = 'private-bookmarks:access:';
const PRIVATE_PASSWORD_SETTING_KEY = 'private_bookmarks_password';
const DEFAULT_PRIVATE_PASSWORD = '123456';
const PASSWORD_HASH_PREFIX = 'pbkdf2';
const PASSWORD_HASH_ITERATIONS = 100000;

export function isPrivateBookmarkCategory(catalog) {
  return cleanText(catalog) === PRIVATE_BOOKMARK_CATEGORY;
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqual(a, b) {
  if (!(a instanceof Uint8Array)) a = new Uint8Array(a);
  if (!(b instanceof Uint8Array)) b = new Uint8Array(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function isHashedPassword(value) {
  return cleanText(value).startsWith(`${PASSWORD_HASH_PREFIX}$`);
}

async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16)), iterations = PASSWORD_HASH_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256
  );
  return `${PASSWORD_HASH_PREFIX}$sha256$${iterations}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}

async function verifyPasswordHash(password, storedHash) {
  const parts = cleanText(storedHash).split('$');
  if (parts.length !== 5 || parts[0] !== PASSWORD_HASH_PREFIX || parts[1] !== 'sha256') return false;
  const iterations = Number(parts[2]);
  if (!Number.isInteger(iterations) || iterations < 10000) return false;

  const salt = base64ToBytes(parts[3]);
  const expected = base64ToBytes(parts[4]);
  const nextHash = await hashPassword(password, salt, iterations);
  const actual = base64ToBytes(nextHash.split('$')[4]);
  return timingSafeEqual(actual, expected);
}

async function getPrivateBookmarkPasswordRecord(env) {
  const fallbackPassword = cleanText(
    env.PRIVATE_BOOKMARKS_PASSWORD ||
      env.PRIVATE_BOOKMARK_PASSWORD ||
      DEFAULT_PRIVATE_PASSWORD
  );
  const record = await getSettingRecord(env, PRIVATE_PASSWORD_SETTING_KEY, fallbackPassword);
  return { ...record, value: cleanText(record.value) };
}

export async function getPrivateBookmarkPassword(env) {
  return (await getPrivateBookmarkPasswordRecord(env)).value;
}

async function savePrivateBookmarkPasswordValue(env, value) {
  await setSetting(env, PRIVATE_PASSWORD_SETTING_KEY, value);
}

export async function updatePrivateBookmarkPassword(env, password) {
  const normalized = cleanText(password);
  if (!normalized) throw new Error('Private bookmark password is required');

  await savePrivateBookmarkPasswordValue(env, await hashPassword(normalized));
  await clearPrivateBookmarkAccessTokens(env);
}

export async function clearPrivateBookmarkAccessTokens(env) {
  let cursor;
  do {
    const list = await env.NAV_AUTH.list({ prefix: PRIVATE_ACCESS_TOKEN_PREFIX, cursor });
    await Promise.all((list.keys || []).map((item) => env.NAV_AUTH.delete(item.name)));
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
}

export function normalizePrivateAccessDuration(value) {
  const key = cleanText(value).toLowerCase();
  if (Object.prototype.hasOwnProperty.call(PRIVATE_ACCESS_TTL_OPTIONS, key)) return key;
  return '12h';
}

export function getPrivateAccessTtlSeconds(durationKey) {
  return PRIVATE_ACCESS_TTL_OPTIONS[normalizePrivateAccessDuration(durationKey)] || PRIVATE_ACCESS_TTL_SECONDS;
}

export async function createPrivateBookmarkAccess(env, { duration = '12h' } = {}) {
  const token = crypto.randomUUID();
  const ttl = getPrivateAccessTtlSeconds(duration);
  await env.NAV_AUTH.put(`${PRIVATE_ACCESS_TOKEN_PREFIX}${token}`, JSON.stringify({ createdAt: Date.now(), duration: normalizePrivateAccessDuration(duration), ttl }), {
    expirationTtl: ttl,
  });
  return { token, ttl, duration: normalizePrivateAccessDuration(duration) };
}

export function buildPrivateBookmarkAccessCookie(token, options = {}) {
  const { maxAge = PRIVATE_ACCESS_TTL_SECONDS, duration } = options;
  const parts = [
    `${PRIVATE_ACCESS_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Secure',
  ];
  if (duration === 'session') {
    // 会话级 cookie：不设置 Max-Age，浏览器关闭后失效
  } else {
    parts.push(`Max-Age=${maxAge}`);
  }
  return parts.join('; ');
}

export function buildClearPrivateBookmarkAccessCookie() {
  return buildPrivateBookmarkAccessCookie('', { maxAge: 0 });
}

export async function hasPrivateBookmarkAccess(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const token = cookies[PRIVATE_ACCESS_COOKIE_NAME];
  if (!token) return false;

  const sessionKey = `${PRIVATE_ACCESS_TOKEN_PREFIX}${token}`;
  const payload = await env.NAV_AUTH.get(sessionKey);
  if (!payload) return false;

  // 滑动续期：根据当前 token 的原始 ttl 续期；解析失败则回退到默认 12h
  let renewTtl = PRIVATE_ACCESS_TTL_SECONDS;
  try {
    const parsed = JSON.parse(payload);
    if (Number.isFinite(Number(parsed?.ttl))) renewTtl = Number(parsed.ttl);
  } catch {
    // 兼容旧 payload 格式
  }
  await env.NAV_AUTH.put(sessionKey, payload, { expirationTtl: renewTtl });
  return true;
}

export async function revokeCurrentPrivateBookmarkAccess(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const token = cookies[PRIVATE_ACCESS_COOKIE_NAME];
  if (token) await env.NAV_AUTH.delete(`${PRIVATE_ACCESS_TOKEN_PREFIX}${token}`);
}

export async function verifyPrivateBookmarkPassword(env, password) {
  const normalized = cleanText(password);
  if (!normalized) return false;

  const record = await getPrivateBookmarkPasswordRecord(env);
  if (isHashedPassword(record.value)) {
    return verifyPasswordHash(normalized, record.value);
  }

  const matched = normalized === record.value;
  if (matched) {
    await savePrivateBookmarkPasswordValue(env, await hashPassword(normalized));
  }
  return matched;
}