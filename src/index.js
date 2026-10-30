import { handleApiRequest } from './handlers/api.js';
import { handleAdminRequest } from './handlers/admin.js';
import { handleGoRequest } from './handlers/go.js';
import { handlePwaRequest } from './handlers/pwa.js';
import { renderHomePage } from './pages/home.js';
import { ensureSchema } from './services/migrationService.js';
import { runScheduledHealthCheck } from './services/siteService.js';
import { runScheduledBackup } from './services/backupService.js';
import { notifyHealthAlert, maybeSendDigest } from './services/emailService.js';
import { getSiteStats } from './services/statsService.js';
import { errorResponse, withSecurityHeaders } from './lib/utils.js';
import { withHomeEdgeCache } from './lib/edgeCache.js';

async function routeRequest(request, env, ctx) {
  const pwaResponse = await handlePwaRequest(request, env);
  if (pwaResponse) return pwaResponse;

  const url = new URL(request.url);

  if (url.pathname.startsWith('/api')) {
    return handleApiRequest(request, env, ctx);
  }

  if (url.pathname.startsWith('/go/')) {
    return handleGoRequest(request, env, ctx);
  }

  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/static')) {
    if (url.pathname === '/admin' || url.pathname === '/admin/setup') {
      await ensureSchema(env);
    }
    return handleAdminRequest(request, env, ctx);
  }

  return withHomeEdgeCache(request, ctx, () => renderHomePage(request, env, ctx));
}

export default {
  async fetch(request, env, ctx) {
    try {
      const response = await routeRequest(request, env, ctx);
      return withSecurityHeaders(response);
    } catch (error) {
      console.log(`[worker] unhandled error: ${error?.stack || error?.message || error}`);
      return withSecurityHeaders(errorResponse('Internal Server Error', 500));
    }
  },

  async scheduled(event, env, ctx) {
    const task = (async () => {
      await ensureSchema(env);
      const limit = env.HEALTH_CHECK_CRON_LIMIT || 30;
      const healthResult = await runScheduledHealthCheck(env, { limit });
      console.log(`[cron] health check completed: checked=${healthResult.checked}, ok=${healthResult.ok}, failed=${healthResult.failed}`);

      // 健康异常 → 邮件告警（未配置邮件时会自行跳过）
      try {
        const failedItems = (healthResult.results || []).filter((item) => !item.ok);
        if (failedItems.length) {
          const ids = failedItems.map((item) => Number(item.id)).filter((id) => Number.isInteger(id) && id > 0);
          const details = new Map();
          if (ids.length) {
            try {
              const placeholders = ids.map(() => '?').join(',');
              const { results } = await env.NAV_DB.prepare(`SELECT id, name, url FROM sites WHERE id IN (${placeholders})`).bind(...ids).all();
              for (const row of results || []) details.set(Number(row.id), row);
            } catch (error) {
              console.log(`[cron] 健康告警取详情失败：${error?.message || error}`);
            }
          }
          const mailResult = await notifyHealthAlert(env, {
            items: failedItems.map((item) => ({
              name: details.get(Number(item.id))?.name || `#${item.id}`,
              url: details.get(Number(item.id))?.url || '',
              statusCode: item.status_code,
              error: item.error,
            })),
            checked: healthResult.checked,
            failed: healthResult.failed,
            siteUrl: env.SITE_URL || '',
          });
          console.log(`[cron] 健康告警邮件：${mailResult?.ok ? '已发送' : `未发送（${mailResult?.reason || mailResult?.error || '未知'}）`}`);
        }
      } catch (error) {
        console.log(`[cron] 健康告警失败：${error?.message || error}`);
      }

      // 定期摘要（到达配置的北京时间整点且当天未发过才发）
      try {
        const stats = await getSiteStats(env, { adminAuthed: true });
        const digestResult = await maybeSendDigest(env, {
          stats,
          latestSites: stats.latestSites,
          siteUrl: env.SITE_URL || '',
        });
        if (digestResult?.sent) console.log('[cron] 站点摘要邮件已发送');
      } catch (error) {
        console.log(`[cron] 摘要邮件失败：${error?.message || error}`);
      }

      try {
        const backupResult = await runScheduledBackup(env);
        if (backupResult?.skipped) {
          console.log(`[cron] backup skipped: ${backupResult.reason}`);
        } else {
          console.log(`[cron] backup created: id=${backupResult.id} sites=${backupResult.siteCount} categories=${backupResult.categoryCount} sizeBytes=${backupResult.sizeBytes}`);
        }
      } catch (backupError) {
        console.log(`[cron] backup failed: ${backupError?.message || backupError}`);
      }
    })().catch((error) => {
      console.log(`[cron] scheduled task failed: ${error?.stack || error?.message || error}`);
      throw error;
    });

    if (ctx?.waitUntil) ctx.waitUntil(task);
    else await task;
  },
};
