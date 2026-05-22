import { cleanText } from '../lib/utils.js';

export async function getSetting(env, key, defaultValue = '') {
  const normalizedKey = cleanText(key);
  if (!normalizedKey) return defaultValue;

  try {
    const setting = await env.NAV_DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind(normalizedKey)
      .first();

    return setting?.value === undefined || setting?.value === null ? defaultValue : setting.value;
  } catch (error) {
    console.warn(`[settings] get fallback for ${normalizedKey}: ${error?.message || error}`);
    return defaultValue;
  }
}

export async function getSettingRecord(env, key, defaultValue = '', fallbackSource = 'fallback') {
  const normalizedKey = cleanText(key);
  if (!normalizedKey) {
    return { value: defaultValue, source: fallbackSource, exists: false };
  }

  try {
    const setting = await env.NAV_DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind(normalizedKey)
      .first();

    if (setting?.value !== undefined && setting?.value !== null) {
      return { value: setting.value, source: 'settings', exists: true };
    }
  } catch (error) {
    console.warn(`[settings] get record fallback for ${normalizedKey}: ${error?.message || error}`);
  }

  return { value: defaultValue, source: fallbackSource, exists: false };
}

export async function setSetting(env, key, value) {
  const normalizedKey = cleanText(key);
  if (!normalizedKey) throw new Error('Setting key is required');

  await env.NAV_DB.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).bind(normalizedKey, value === undefined || value === null ? '' : String(value)).run();
}

export async function deleteSetting(env, key) {
  const normalizedKey = cleanText(key);
  if (!normalizedKey) return;

  await env.NAV_DB.prepare('DELETE FROM settings WHERE key = ?').bind(normalizedKey).run();
}

export async function listSettings(env, prefix = '') {
  const normalizedPrefix = cleanText(prefix);
  if (normalizedPrefix) {
    const { results } = await env.NAV_DB.prepare(`
      SELECT key, value
      FROM settings
      WHERE key LIKE ?
      ORDER BY key ASC
    `).bind(`${normalizedPrefix}%`).all();
    return results || [];
  }

  const { results } = await env.NAV_DB.prepare(`
    SELECT key, value
    FROM settings
    ORDER BY key ASC
  `).all();
  return results || [];
}