import { cleanText } from '../lib/utils.js';
import { getSetting, setSetting } from './settingsService.js';
import { exportConfig, importSites } from './siteService.js';

const BACKUP_PREFIX = 'backup:';
const META_PREFIX = 'backup-meta:';
const MAX_BACKUPS = 30;
const WEBDAV_PREFIX = 'backup.webdav.';

function buildBackupId(reason = 'manual', date = new Date()) {
  const iso = date.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `${iso}_${reason}`;
}

function boolString(value, fallback = 'false') {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase()) ? 'true' : 'false';
}

function limitText(value, max = 500) {
  return cleanText(value).slice(0, max);
}

function encodePathSegment(segment) {
  return encodeURIComponent(segment).replace(/%2F/gi, '/');
}

function joinWebDavUrl(baseUrl, remotePath = '', fileName = '') {
  const base = limitText(baseUrl, 800).replace(/\/+$/g, '');
  const path = limitText(remotePath, 300)
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((part) => encodePathSegment(part.trim()))
    .filter(Boolean)
    .join('/');
  const name = encodePathSegment(fileName);
  return [base, path, name].filter(Boolean).join('/');
}

function webDavAuthHeader(settings) {
  if (!settings.username && !settings.password) return {};
  return { Authorization: `Basic ${btoa(`${settings.username}:${settings.password}`)}` };
}

export async function getWebDavBackupSettings(env, { includePassword = false } = {}) {
  const settings = {
    enabled: boolString(await getSetting(env, `${WEBDAV_PREFIX}enabled`, 'false')),
    url: limitText(await getSetting(env, `${WEBDAV_PREFIX}url`, ''), 800),
    username: limitText(await getSetting(env, `${WEBDAV_PREFIX}username`, ''), 200),
    password: includePassword ? await getSetting(env, `${WEBDAV_PREFIX}password`, '') : '',
    hasPassword: Boolean(await getSetting(env, `${WEBDAV_PREFIX}password`, '')),
    path: limitText(await getSetting(env, `${WEBDAV_PREFIX}path`, 'StarNav'), 300) || 'StarNav',
  };
  return settings;
}

export async function updateWebDavBackupSettings(env, payload = {}) {
  const current = await getWebDavBackupSettings(env, { includePassword: true });
  const next = {
    enabled: boolString(payload.enabled),
    url: limitText(payload.url, 800).replace(/\/+$/g, ''),
    username: limitText(payload.username, 200),
    password: payload.password === undefined || payload.password === null || payload.password === '' ? current.password : String(payload.password),
    path: limitText(payload.path, 300) || 'StarNav',
  };

  if (next.enabled === 'true' && !next.url) throw new Error('WebDAV URL is required when enabled');
  if (next.url && !/^https?:\/\//i.test(next.url)) throw new Error('WebDAV URL must start with http:// or https://');

  await setSetting(env, `${WEBDAV_PREFIX}enabled`, next.enabled);
  await setSetting(env, `${WEBDAV_PREFIX}url`, next.url);
  await setSetting(env, `${WEBDAV_PREFIX}username`, next.username);
  await setSetting(env, `${WEBDAV_PREFIX}password`, next.password);
  await setSetting(env, `${WEBDAV_PREFIX}path`, next.path);

  return getWebDavBackupSettings(env);
}

async function ensureWebDavDirectory(settings) {
  if (!settings.path) return;
  const parts = settings.path.replace(/^\/+|\/+$/g, '').split('/').map((part) => part.trim()).filter(Boolean);
  let currentPath = '';
  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    const dirUrl = joinWebDavUrl(settings.url, currentPath, '');
    await fetch(dirUrl, {
      method: 'MKCOL',
      headers: webDavAuthHeader(settings),
    }).catch(() => null);
  }
}

export async function uploadBackupToWebDav(env, meta, payload) {
  const settings = await getWebDavBackupSettings(env, { includePassword: true });
  if (settings.enabled !== 'true') return { skipped: true, reason: 'WebDAV backup disabled' };
  if (!settings.url) return { skipped: true, reason: 'WebDAV URL not configured' };

  await ensureWebDavDirectory(settings);
  const fileName = `${meta.id}.json`;
  const targetUrl = joinWebDavUrl(settings.url, settings.path, fileName);
  const response = await fetch(targetUrl, {
    method: 'PUT',
    headers: {
      ...webDavAuthHeader(settings),
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: payload,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`WebDAV upload failed: HTTP ${response.status}${text ? ` ${text.slice(0, 120)}` : ''}`);
  }

  return { uploaded: true, url: targetUrl, fileName, status: response.status };
}

export async function testWebDavBackupSettings(env, payload = null) {
  const settings = payload ? {
    ...(await getWebDavBackupSettings(env, { includePassword: true })),
    enabled: boolString(payload.enabled, 'true'),
    url: limitText(payload.url, 800).replace(/\/+$/g, ''),
    username: limitText(payload.username, 200),
    password: payload.password ? String(payload.password) : (await getWebDavBackupSettings(env, { includePassword: true })).password,
    path: limitText(payload.path, 300) || 'StarNav',
  } : await getWebDavBackupSettings(env, { includePassword: true });

  if (!settings.url) throw new Error('WebDAV URL is required');
  if (!/^https?:\/\//i.test(settings.url)) throw new Error('WebDAV URL must start with http:// or https://');

  await ensureWebDavDirectory(settings);
  const fileName = `.starnav-test-${Date.now()}.txt`;
  const targetUrl = joinWebDavUrl(settings.url, settings.path, fileName);
  const put = await fetch(targetUrl, {
    method: 'PUT',
    headers: {
      ...webDavAuthHeader(settings),
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: 'StarNav WebDAV backup test',
  });
  if (!put.ok) throw new Error(`WebDAV test upload failed: HTTP ${put.status}`);

  await fetch(targetUrl, { method: 'DELETE', headers: webDavAuthHeader(settings) }).catch(() => null);
  return { ok: true, status: put.status, path: settings.path, fileName };
}

export async function listBackups(env) {
  if (!env?.NAV_AUTH) return [];
  const out = [];
  let cursor;
  do {
    const page = await env.NAV_AUTH.list({ prefix: META_PREFIX, cursor });
    for (const key of page.keys || []) {
      const raw = await env.NAV_AUTH.get(key.name);
      if (!raw) continue;
      try {
        const meta = JSON.parse(raw);
        out.push(meta);
      } catch {
        // skip corrupt entries
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out.sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')));
}

async function pruneBackups(env, keep = MAX_BACKUPS) {
  const all = await listBackups(env);
  if (all.length <= keep) return { deleted: 0 };
  const toDelete = all.slice(keep);
  for (const meta of toDelete) {
    await Promise.all([
      env.NAV_AUTH.delete(`${BACKUP_PREFIX}${meta.id}`),
      env.NAV_AUTH.delete(`${META_PREFIX}${meta.id}`),
    ]);
  }
  return { deleted: toDelete.length };
}

export async function createBackup(env, { reason = 'manual', note = '' } = {}) {
  if (!env?.NAV_AUTH) throw new Error('Backup storage (NAV_AUTH KV) is not available');
  const config = await exportConfig(env);
  const payload = JSON.stringify(config);
  const sizeBytes = new TextEncoder().encode(payload).length;
  if (sizeBytes > 24 * 1024 * 1024) {
    throw new Error(`Backup size ${sizeBytes} bytes exceeds 24 MiB KV value limit`);
  }
  const id = buildBackupId(reason);
  const meta = {
    id,
    reason,
    note: String(note || '').slice(0, 200),
    createdAt: new Date().toISOString(),
    sizeBytes,
    siteCount: Array.isArray(config.sites) ? config.sites.length : 0,
    categoryCount: Array.isArray(config.categories) ? config.categories.length : 0,
  };
  await env.NAV_AUTH.put(`${BACKUP_PREFIX}${id}`, payload);

  try {
    const webdav = await uploadBackupToWebDav(env, meta, payload);
    meta.webdav = webdav;
  } catch (error) {
    meta.webdav = { uploaded: false, error: error?.message || 'WebDAV upload failed' };
    console.log(`[backup] webdav upload failed: ${meta.webdav.error}`);
  }

  await env.NAV_AUTH.put(`${META_PREFIX}${id}`, JSON.stringify(meta));
  const pruneResult = await pruneBackups(env, MAX_BACKUPS);
  return { ...meta, prunedOld: pruneResult.deleted };
}

export async function getBackupPayload(env, id) {
  if (!env?.NAV_AUTH) return null;
  const raw = await env.NAV_AUTH.get(`${BACKUP_PREFIX}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function deleteBackup(env, id) {
  if (!env?.NAV_AUTH) return { deleted: false };
  await Promise.all([
    env.NAV_AUTH.delete(`${BACKUP_PREFIX}${id}`),
    env.NAV_AUTH.delete(`${META_PREFIX}${id}`),
  ]);
  return { deleted: true, id };
}

export async function restoreBackup(env, id, { mode = 'overwrite' } = {}) {
  const payload = await getBackupPayload(env, id);
  if (!payload) throw new Error('Backup not found');
  // 恢复前自动创建一份"恢复前快照"，防止误操作丢数据
  let preRestoreSnapshot = null;
  try {
    preRestoreSnapshot = await createBackup(env, { reason: 'pre-restore', note: `before restore ${id}` });
  } catch (error) {
    console.log(`[backup] pre-restore snapshot failed: ${error?.message || error}`);
  }
  const restoreMode = mode === 'merge' ? 'merge' : 'overwrite';
  const importedSites = await importSites(env, payload, { mode: restoreMode });
  return {
    backupId: id,
    mode: restoreMode,
    importedSites,
    preRestoreSnapshotId: preRestoreSnapshot?.id || null,
  };
}

export async function runScheduledBackup(env) {
  if (!env?.NAV_AUTH) return { skipped: true, reason: 'KV not bound' };
  return createBackup(env, { reason: 'cron', note: 'scheduled backup' });
}