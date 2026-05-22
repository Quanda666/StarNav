import { handleApiRequest } from './handlers/api.js';
import { handleAdminRequest } from './handlers/admin.js';
import { handleGoRequest } from './handlers/go.js';
import { handlePwaRequest } from './handlers/pwa.js';
import { renderHomePage } from './pages/home.js';
import { ensureSchema } from './services/migrationService.js';
import { runScheduledHealthCheck } from './services/siteService.js';
import { runScheduledBackup } from './services/backupService.js';
import { errorResponse } from './lib/utils.js';

export default {
  async fetch(request, env, ctx) {
    try {
      await ensureSchema(env);

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
        return handleAdminRequest(request, env, ctx);
      }

      return renderHomePage(request, env, ctx);
    } catch (error) {
      console.log(`[worker] unhandled error: ${error?.stack || error?.message || error}`);
      return errorResponse(`Internal Server Error: ${error?.message || 'Unknown error'}`, 500);
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