import { handleApiRequest } from './handlers/api.js';
import { handleAdminRequest } from './handlers/admin.js';
import { handleGoRequest } from './handlers/go.js';
import { handlePwaRequest } from './handlers/pwa.js';
import { renderHomePage } from './pages/home.js';
import { ensureSchema } from './services/migrationService.js';
import { runScheduledHealthCheck } from './services/siteService.js';
import { runScheduledBackup } from './services/backupService.js';
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
