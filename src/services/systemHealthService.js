import { listApiTokens } from '../lib/auth.js';
import { listBackups } from './backupService.js';
import { getAiSettings } from './aiService.js';
import { getSystemSettings } from './systemSettingsService.js';
import { listWebhooks } from './webhookService.js';

function createCheck(id, name, ok, message, details = {}, level = 'info') {
  return {
    id,
    name,
    ok: Boolean(ok),
    status: ok ? 'ok' : level === 'warn' ? 'warn' : 'error',
    message,
    details,
  };
}

async function countTable(env, tableName, where = '') {
  const sql = `SELECT COUNT(*) AS total FROM ${tableName}${where ? ` WHERE ${where}` : ''}`;
  const row = await env.NAV_DB.prepare(sql).first();
  return Number(row?.total || 0);
}

async function getLatestTimestamp(env, tableName, field = 'create_time') {
  const row = await env.NAV_DB.prepare(`SELECT ${field} AS value FROM ${tableName} ORDER BY ${field} DESC LIMIT 1`).first();
  return row?.value || null;
}

function summarizeChecks(checks) {
  const errors = checks.filter((item) => item.status === 'error').length;
  const warnings = checks.filter((item) => item.status === 'warn').length;
  return {
    status: errors ? 'error' : warnings ? 'warn' : 'ok',
    errors,
    warnings,
    ok: checks.filter((item) => item.status === 'ok').length,
    total: checks.length,
  };
}

function buildSuggestions(checks, metrics) {
  const suggestions = [];

  if (!metrics.bindings?.d1) suggestions.push('请检查 Cloudflare D1 绑定 NAV_DB 是否配置。');
  if (!metrics.bindings?.kv) suggestions.push('请检查 Cloudflare KV 绑定 NAV_AUTH 是否配置。');
  if ((metrics.sites?.badLinks || 0) > 0) suggestions.push(`当前有 ${metrics.sites.badLinks} 个异常链接，建议在书签列表中筛选“只看异常”并批量重测或隐藏。`);
  if ((metrics.submissions?.pending || 0) > 0) suggestions.push(`当前有 ${metrics.submissions.pending} 条待审核提交，建议及时处理。`);
  if ((metrics.tokens?.active || 0) === 0) suggestions.push('尚未创建可用 Bearer Token；如需浏览器插件或第三方写入，请在 Token 管理中生成。');
  if ((metrics.backups?.total || 0) === 0) suggestions.push('尚未创建备份，建议在“备份恢复”中立即创建第一份备份。');
  if (!metrics.ai?.enabled) suggestions.push('AI 接入当前未启用，分类 / 标签推荐会使用本地规则兜底。');
  if (!metrics.system?.siteName) suggestions.push('尚未配置网站名称，建议在系统设置中完善站点品牌信息。');

  for (const check of checks) {
    if (check.status === 'error' && check.message) suggestions.push(check.message);
  }

  return Array.from(new Set(suggestions)).slice(0, 8);
}

export async function getSystemHealth(env) {
  const startedAt = Date.now();
  const checks = [];
  const metrics = {
    bindings: {
      d1: Boolean(env.NAV_DB),
      kv: Boolean(env.NAV_AUTH),
    },
  };

  checks.push(createCheck('binding.d1', 'D1 数据库绑定', metrics.bindings.d1, metrics.bindings.d1 ? 'NAV_DB 已配置' : 'NAV_DB 未配置', { binding: 'NAV_DB' }, metrics.bindings.d1 ? 'info' : 'error'));
  checks.push(createCheck('binding.kv', 'KV 鉴权存储绑定', metrics.bindings.kv, metrics.bindings.kv ? 'NAV_AUTH 已配置' : 'NAV_AUTH 未配置', { binding: 'NAV_AUTH' }, metrics.bindings.kv ? 'info' : 'error'));

  if (metrics.bindings.d1) {
    try {
      const [sites, categories, tags, pending, badLinks, uncheckedLinks, logs] = await Promise.all([
        countTable(env, 'sites'),
        countTable(env, 'categories'),
        countTable(env, 'tags'),
        countTable(env, 'pending_sites', "status = 'pending'"),
        countTable(env, 'sites', "last_checked_at IS NOT NULL AND (last_error IS NOT NULL OR last_status_code < 200 OR last_status_code >= 400)"),
        countTable(env, 'sites', 'last_checked_at IS NULL'),
        countTable(env, 'operation_logs'),
      ]);
      metrics.sites = {
        total: sites,
        badLinks,
        uncheckedLinks,
        latestCreatedAt: await getLatestTimestamp(env, 'sites'),
      };
      metrics.categories = { total: categories };
      metrics.tags = { total: tags };
      metrics.submissions = { pending };
      metrics.operationLogs = {
        total: logs,
        latestCreatedAt: await getLatestTimestamp(env, 'operation_logs'),
      };

      checks.push(createCheck('db.sites', '书签数据表', true, `书签 ${sites} 条，异常链接 ${badLinks} 条`, metrics.sites, badLinks ? 'warn' : 'info'));
      checks.push(createCheck('db.categories', '分类数据表', true, `分类 ${categories} 个`, metrics.categories));
      checks.push(createCheck('db.tags', '标签数据表', true, `标签 ${tags} 个`, metrics.tags));
      checks.push(createCheck('db.pending', '待审核队列', pending === 0, pending ? `有 ${pending} 条提交等待审核` : '无待审核提交', metrics.submissions, 'warn'));
      checks.push(createCheck('db.operation_logs', '操作日志', true, `操作日志 ${logs} 条`, metrics.operationLogs));
    } catch (error) {
      checks.push(createCheck('db.query', 'D1 数据查询', false, `D1 查询失败：${error.message}`, {}, 'error'));
    }
  }

  if (metrics.bindings.kv) {
    try {
      const tokens = await listApiTokens(env);
      const active = tokens.filter((item) => !item.revokedAt).length;
      metrics.tokens = { total: tokens.length, active, revoked: tokens.length - active };
      checks.push(createCheck('kv.tokens', 'Bearer Token', active > 0, active ? `可用 Token ${active} 个` : '尚无可用 Token', metrics.tokens, 'warn'));
    } catch (error) {
      checks.push(createCheck('kv.tokens', 'Bearer Token', false, `Token 元数据读取失败：${error.message}`, {}, 'error'));
    }

    try {
      const webhooks = await listWebhooks(env);
      const enabled = webhooks.filter((item) => item.enabled !== false).length;
      metrics.webhooks = { total: webhooks.length, enabled };
      checks.push(createCheck('kv.webhooks', 'WebHook 配置', true, `WebHook ${webhooks.length} 个，启用 ${enabled} 个`, metrics.webhooks));
    } catch (error) {
      checks.push(createCheck('kv.webhooks', 'WebHook 配置', false, `WebHook 配置读取失败：${error.message}`, {}, 'error'));
    }

    try {
      const backups = await listBackups(env);
      metrics.backups = {
        total: backups.length,
        latestCreatedAt: backups[0]?.createdAt || null,
        latestSizeBytes: backups[0]?.sizeBytes || 0,
      };
      checks.push(createCheck('kv.backups', '备份快照', backups.length > 0, backups.length ? `已有备份 ${backups.length} 份` : '尚未创建备份', metrics.backups, 'warn'));
    } catch (error) {
      checks.push(createCheck('kv.backups', '备份快照', false, `备份列表读取失败：${error.message}`, {}, 'error'));
    }

    try {
      const ai = await getAiSettings(env);
      metrics.ai = {
        enabled: ai.enabled === 'true',
        configured: Boolean(ai.configured),
        model: ai.model || '',
      };
      checks.push(createCheck('settings.ai', 'AI 接入配置', metrics.ai.enabled && metrics.ai.configured, metrics.ai.enabled ? (metrics.ai.configured ? `AI 已启用：${metrics.ai.model || '未命名模型'}` : 'AI 已启用但缺少 API Key') : 'AI 未启用，将使用本地规则兜底', metrics.ai, metrics.ai.enabled && !metrics.ai.configured ? 'error' : 'warn'));
    } catch (error) {
      checks.push(createCheck('settings.ai', 'AI 接入配置', false, `AI 设置读取失败：${error.message}`, {}, 'error'));
    }

    try {
      const system = await getSystemSettings(env);
      metrics.system = {
        siteName: system.siteName || '',
        announcementEnabled: system.announcementEnabled === 'true',
        blogVisible: system.blogVisible !== 'false',
      };
      checks.push(createCheck('settings.system', '站点公开设置', Boolean(metrics.system.siteName), metrics.system.siteName ? `站点名称：${metrics.system.siteName}` : '站点名称未配置', metrics.system, 'warn'));
    } catch (error) {
      checks.push(createCheck('settings.system', '站点公开设置', false, `系统设置读取失败：${error.message}`, {}, 'error'));
    }
  }

  const summary = summarizeChecks(checks);

  return {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    status: summary.status,
    summary,
    metrics,
    checks,
    suggestions: buildSuggestions(checks, metrics),
  };
}