// 敏感配置（AI Key / WebDAV 密码 / WebHook secret）的对称加密。
//
// 主密钥取自 env.SECRET_KEY（建议用 `wrangler secret put SECRET_KEY` 配置）。
// 设计要点（向后兼容优先）：
//   - 未配置主密钥时，加密为 no-op（明文存储），与历史行为一致；
//   - 解密按 `enc:v1:` 前缀区分密文/明文，历史明文数据原样返回；
//   - 主密钥丢失/变更后，已加密数据将无法还原（解密返回空串）——需在文档中提示。

const ENC_PREFIX = 'enc:v1:';

let cachedKey = null;
let cachedSecretRef = null;

async function getKey(env) {
  const secret = env?.SECRET_KEY || env?.ENCRYPTION_KEY || '';
  if (!secret) return null;
  if (cachedKey && cachedSecretRef === secret) return cachedKey;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  cachedKey = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  cachedSecretRef = secret;
  return cachedKey;
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

/**
 * 加密敏感值。空值、已加密值原样返回；未配置主密钥时回退明文。
 *
 * @param {object} env Workers 环境绑定。
 * @param {string} plaintext 明文。
 * @returns {Promise<string>}
 */
export async function encryptSecret(env, plaintext) {
  const value = String(plaintext ?? '');
  if (!value || isEncrypted(value)) return value;
  const key = await getKey(env);
  if (!key) return value;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value));
  return `${ENC_PREFIX}${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(buffer))}`;
}

/**
 * 解密敏感值。明文（无前缀）原样返回；缺主密钥或解密失败时返回空串。
 *
 * @param {object} env Workers 环境绑定。
 * @param {string} stored 存储值。
 * @returns {Promise<string>}
 */
export async function decryptSecret(env, stored) {
  const value = String(stored ?? '');
  if (!isEncrypted(value)) return value;
  const key = await getKey(env);
  if (!key) return '';
  const parts = value.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 2) return '';
  try {
    const buffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(parts[0]) },
      key,
      base64ToBytes(parts[1])
    );
    return new TextDecoder().decode(buffer);
  } catch {
    return '';
  }
}
