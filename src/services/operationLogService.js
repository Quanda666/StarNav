import { cleanText } from '../lib/utils.js';
import { dispatchWebhooks } from './webhookService.js';

export const OPERATION_LOG_ACTIONS = {
  SITE_CREATE: 'site.create',
  SITE_UPDATE: 'site.update',
  SITE_DELETE: 'site.delete',
  SITE_BULK_UPDATE: 'site.bulk_update',
  SITE_BULK_DELETE: 'site.bulk_delete',
  SITE_BULK_CHECK: 'site.bulk_check',
  SITE_BULK_FAVICON: 'site.bulk_favicon',
  SITE_REORDER: 'site.reorder',
  SITE_IMPORT: 'site.import',
  SITE_CHECK: 'site.check',
  CATEGORY_CREATE: 'category.create',
  CATEGORY_UPDATE: 'category.update',
  CATEGORY_DELETE: 'category.delete',
  CATEGORY_REORDER: 'category.reorder',
  TAG_MERGE: 'tag.merge',
  TAG_APPLY_SUGGESTIONS: 'tag.apply_suggestions',
  PENDING_APPROVE: 'pending.approve',
  PENDING_REJECT: 'pending.reject',
  SETTINGS_UPDATE: 'settings.update',
  BACKUP_CREATE: 'backup.create',
  BACKUP_RESTORE: 'backup.restore',
  BACKUP_DELETE: 'backup.delete',
};

function clientIpFromRequest(request) {
  if (!request) return '';
  try {
    const headers = request.headers;
    const ip = headers?.get?.('cf-connecting-ip')
      || headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim()
      || headers?.get?.('x-real-ip')
      || '';
    return cleanText(ip).slice(0, 64);
  } catch {
    return '';
  }
}

function summarizeDetail(detail) {
  if (detail === null || detail === undefined) return null;
  if (typeof detail === 'string') return detail.slice(0, 500);
  try {
    return JSON.stringify(detail).slice(0, 500);
  } catch {
    return null;
  }
}

export async function logOperation(env, { action, target, targetId, summary, detail, request } = {}) {
  const actionText = cleanText(action).slice(0, 80);
  if (!actionText) return null;
  const operation = {
    action: actionText,
    target: cleanText(target).slice(0, 80) || null,
    targetId: targetId !== undefined && targetId !== null ? String(targetId).slice(0, 80) : null,
    summary: cleanText(summary).slice(0, 200) || null,
    detail: summarizeDetail(detail),
    ip: clientIpFromRequest(request) || null,
  };

  try {
    await env.NAV_DB.prepare(`
      INSERT INTO operation_logs (action, target, target_id, summary, detail, ip, create_time)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      operation.action,
      operation.target,
      operation.targetId,
      operation.summary,
      operation.detail,
      operation.ip,
    ).run();

    try {
      await dispatchWebhooks(env, operation);
    } catch (error) {
      console.warn(`[webhook] failed to dispatch: ${error?.message || error}`);
    }

    return true;
  } catch (error) {
    console.warn(`[operation-log] failed to write log: ${error?.message || error}`);
    return false;
  }
}

export async function listOperationLogs(env, { page = 1, pageSize = 20, action = '', target = '' } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 20));
  const offset = (safePage - 1) * safePageSize;
  const where = [];
  const binds = [];

  const actionFilter = cleanText(action);
  if (actionFilter) {
    where.push('action = ?');
    binds.push(actionFilter);
  }
  const targetFilter = cleanText(target);
  if (targetFilter) {
    where.push('target = ?');
    binds.push(targetFilter);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { results } = await env.NAV_DB.prepare(`
    SELECT id, action, target, target_id, summary, detail, ip, create_time
    FROM operation_logs
    ${whereSql}
    ORDER BY datetime(create_time) DESC, id DESC
    LIMIT ? OFFSET ?
  `).bind(...binds, safePageSize, offset).all();

  const countRow = await env.NAV_DB.prepare(`SELECT COUNT(*) AS total FROM operation_logs ${whereSql}`).bind(...binds).first();

  return {
    data: results || [],
    total: countRow?.total || 0,
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function listOperationLogActions(env) {
  const { results } = await env.NAV_DB.prepare(`
    SELECT action, COUNT(*) AS total
    FROM operation_logs
    GROUP BY action
    ORDER BY action ASC
  `).all();
  return (results || []).map((row) => ({ action: row.action, total: Number(row.total) || 0 }));
}