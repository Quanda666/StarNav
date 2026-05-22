import { errorResponse, isSubmissionEnabled, jsonResponse } from '../lib/utils.js';
import { createApiToken, isAdminAuthenticated, listApiTokens, revokeApiToken, validateApiToken } from '../lib/auth.js';
import { getFavicon } from '../lib/favicon.js';
import {
  approvePendingSite,
  bulkCheckSiteHealth,
  bulkDeleteSites,
  bulkRefreshSiteFavicons,
  bulkUpdateSites,
  checkSiteHealth,
  createSite,
  deleteSite,
  exportConfig,
  fetchSitePreview,
  findDuplicateSite,
  getPendingSites,
  getSearchAnalytics,
  getSite,
  getSiteAnalytics,
  getSubmissionAnalytics,
  getSites,
  importSites,
  previewImportSites,
  rejectPendingSite,
  recordSearchTerm,
  reorderSites,
  searchSites,
  submitSite,
  updateSite,
} from '../services/siteService.js';
import {
  createCategory,
  deleteCategory,
  getCategoryTree,
  listCategories,
  reorderCategories,
  updateCategory,
} from '../services/categoryService.js';
import { applySiteTagSuggestions, listSitesNeedingTags, listTags, mergeTags } from '../services/tagService.js';
import { analyzeNoTagSites, analyzeDuplicateSites, analyzeSearchGaps, analyzeCategoryErrors, chatWithAiAssistant, getAiSettings, listAiModels, suggestCategoryForSite, suggestTagMerges, suggestTagsForSite, suggestTagsForSites, testAiSettings, updateAiSettings } from '../services/aiService.js';
import { getSystemSettings, updateSystemSettings } from '../services/systemSettingsService.js';
import {
  getPrivateBookmarkPassword,
  hasPrivateBookmarkAccess,
  isPrivateBookmarkCategory,
  updatePrivateBookmarkPassword,
} from '../services/privateBookmarkService.js';
import { OPERATION_LOG_ACTIONS, listOperationLogs, logOperation } from '../services/operationLogService.js';
import { createBackup, deleteBackup, getBackupPayload, getWebDavBackupSettings, listBackups, restoreBackup, testWebDavBackupSettings, updateWebDavBackupSettings } from '../services/backupService.js';
import { createWebhook, deleteWebhook, listWebhooks, testWebhook, updateWebhook } from '../services/webhookService.js';
import { getSystemHealth } from '../services/systemHealthService.js';
import { getPublicApiDiscovery, getPublicOpenApiDocument } from './api/discovery.js';
import { handleApiError, requireAdmin } from './api/errors.js';
import { getSiteRouteFlags, sitesToBookmarkHtml, sitesToCsv } from './api/sites.js';
import { handleSpacesApiRequest } from './api/spaces.js';

function safeLog(ctx, promise) {
  if (ctx?.waitUntil && promise && typeof promise.then === 'function') {
    ctx.waitUntil(promise.catch(() => {}));
  }
}

export async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const method = request.method;
  const segments = path.split('/').filter(Boolean);
  const id = segments.at(-1);

  const {
    isSitesCollectionPath,
    isSiteSubmitPath,
    isSiteReorderPath,
    isSiteImportPath,
    isSiteImportPreviewPath,
    isSiteBulkPath,
    isSiteExportPath,
    isSiteCheckPath,
    isSiteItemPath,
    isSubmissionsCollectionPath,
    isSubmissionItemPath,
  } = getSiteRouteFlags(path);

  try {
    if ((path === '/' || path === '/discovery') && method === 'GET') {
      return jsonResponse(getPublicApiDiscovery(url.origin));
    }

    if (path === '/openapi.json' && method === 'GET') {
      return jsonResponse(getPublicOpenApiDocument(url.origin));
    }

    if (path === '/favicon' && method === 'GET') {
      const siteUrl = url.searchParams.get('url');
      if (!siteUrl) return errorResponse('URL parameter is required', 400);
      const favicon = await getFavicon(siteUrl);
      return jsonResponse({ code: 200, favicon: favicon || '' });
    }

    if (path === '/settings/public' && method === 'GET') {
      return jsonResponse({ code: 200, data: await getSystemSettings(env) });
    }

    if (path === '/spaces' || path.startsWith('/spaces/')) {
      const response = await handleSpacesApiRequest(request, env, ctx, path, method, id);
      if (response) return response;
    }

    if (path === '/system/health' && method === 'GET') {
      const unauthorized = await requireAdmin(request, env, { allowApiToken: false });
      if (unauthorized) return unauthorized;
      return jsonResponse({ code: 200, data: await getSystemHealth(env) });
    }

    if (path === '/tokens' && method === 'GET') {
      const unauthorized = await requireAdmin(request, env, { allowApiToken: false });
      if (unauthorized) return unauthorized;
      const data = await listApiTokens(env);
      return jsonResponse({ code: 200, data, total: data.length });
    }

    if (path === '/tokens' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env, { allowApiToken: false });
      if (unauthorized) return unauthorized;
      const body = await request.json().catch(() => ({}));
      const result = await createApiToken(env, body);
      return jsonResponse({ code: 201, message: 'API token created successfully', ...result }, 201);
    }

    if (path.startsWith('/tokens/') && method === 'DELETE') {
      const unauthorized = await requireAdmin(request, env, { allowApiToken: false });
      if (unauthorized) return unauthorized;
      const tokenId = decodeURIComponent(path.split('/')[2] || '');
      const data = await revokeApiToken(env, tokenId);
      return jsonResponse({ code: 200, message: 'API token revoked successfully', data });
    }

    if (path === '/webhooks' && method === 'GET') {
      const unauthorized = await requireAdmin(request, env, { allowApiToken: false });
      if (unauthorized) return unauthorized;
      const data = await listWebhooks(env);
      return jsonResponse({ code: 200, data, total: data.length });
    }

    if (path === '/webhooks' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env, { allowApiToken: false });
      if (unauthorized) return unauthorized;
      const data = await createWebhook(env, await request.json().catch(() => ({})));
      return jsonResponse({ code: 201, message: 'Webhook created successfully', data }, 201);
    }

    if (path.startsWith('/webhooks/')) {
      const unauthorized = await requireAdmin(request, env, { allowApiToken: false });
      if (unauthorized) return unauthorized;
      const webhookId = decodeURIComponent(path.split('/')[2] || '');

      if (path.endsWith('/test') && method === 'POST') {
        const data = await testWebhook(env, webhookId);
        return jsonResponse({ code: 200, message: 'Webhook test completed', data });
      }

      if (method === 'PUT') {
        const data = await updateWebhook(env, webhookId, await request.json().catch(() => ({})));
        return jsonResponse({ code: 200, message: 'Webhook updated successfully', data });
      }

      if (method === 'DELETE') {
        await deleteWebhook(env, webhookId);
        return jsonResponse({ code: 200, message: 'Webhook deleted successfully' });
      }
    }

    if (path === '/search' && method === 'GET') {
      const keyword = url.searchParams.get('q') || url.searchParams.get('keyword') || '';
      const limit = url.searchParams.get('limit') || 50;
      const adminAuthed = await isAdminAuthenticated(request, env);
      const privateAccess = adminAuthed || await hasPrivateBookmarkAccess(request, env);
      const data = await searchSites(env, { keyword, limit, includePrivate: privateAccess, adminAuthed, privateUnlocked: privateAccess });
      const recordTask = recordSearchTerm(env, keyword, data.length).catch((error) => console.warn(`[search] failed to record keyword: ${error.message}`));
      if (ctx?.waitUntil) ctx.waitUntil(recordTask);
      else await recordTask;
      return jsonResponse({ code: 200, data, total: data.length, keyword });
    }

    if (path === '/ai/chat' && method === 'POST') {
      const body = await request.json();
      const adminAuthed = await isAdminAuthenticated(request, env);
      const privateAccess = adminAuthed || await hasPrivateBookmarkAccess(request, env);
      const result = await chatWithAiAssistant(env, request, {
        message: body?.message,
        previousSites: body?.previousSites || body?.contextSites || [],
        adminAuthed,
        privateUnlocked: privateAccess,
      });
      return jsonResponse(result);
    }

    if (path === '/ai/admin/analyze' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env, { allowApiToken: false });
      if (unauthorized) return unauthorized;
      const body = await request.json().catch(() => ({}));
      const type = body?.type || '';
      const limit = body?.limit || 20;
      let data;
      switch (type) {
        case 'no-tags': data = await analyzeNoTagSites(env, { limit }); break;
        case 'duplicates': data = await analyzeDuplicateSites(env, { limit }); break;
        case 'search-gaps': data = await analyzeSearchGaps(env, { limit }); break;
        case 'category-errors': data = await analyzeCategoryErrors(env, { limit }); break;
        default: return errorResponse('Invalid analysis type. Use: no-tags, duplicates, search-gaps, category-errors', 400);
      }
      return jsonResponse({ code: 200, data });
    }

    if (isSitesCollectionPath && method === 'GET') {
      const page = url.searchParams.get('page') || 1;
      const pageSize = url.searchParams.get('pageSize') || 10;
      const catalog = url.searchParams.get('catalog') || '';
      const keyword = url.searchParams.get('keyword') || '';
      const tag = url.searchParams.get('tag') || '';
      const sort = url.searchParams.get('sort') || '';
      const health = url.searchParams.get('health') || '';
      const adminAuthed = await isAdminAuthenticated(request, env);
      const privateAccess = adminAuthed || await hasPrivateBookmarkAccess(request, env);

      if (isPrivateBookmarkCategory(catalog) && !privateAccess) {
        return errorResponse('Private bookmarks require access password', 401);
      }

      const space = url.searchParams.get('space') || '';
      const result = await getSites(env, { page, pageSize, catalog, keyword, tag, sort, health, space, includePrivate: privateAccess, adminAuthed, privateUnlocked: privateAccess });
      return jsonResponse({ code: 200, ...result });
    }
    if (isSitesCollectionPath && method === 'POST') {
      const unauthorized = await requireAdmin(request, env, { allowApiToken: true, scope: 'write' });
      if (unauthorized) return unauthorized;
      const body = await request.json();
      const force = url.searchParams.get('force') === 'true';
      const insert = await createSite(env, body, { force });
      safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.SITE_CREATE, target: 'site', targetId: insert?.meta?.last_row_id, summary: body?.name, request }));
      return jsonResponse({ code: 201, message: 'Config created successfully', insert }, 201);
    }

    if (path === '/sites/check-duplicate' && method === 'GET') {
      const unauthorized = await requireAdmin(request, env, { allowApiToken: true, scope: 'write' });
      if (unauthorized) return unauthorized;
      const target = url.searchParams.get('url') || '';
      const excludeId = url.searchParams.get('excludeId') || null;
      if (!target) return errorResponse('url parameter is required', 400);
      const duplicate = await findDuplicateSite(env, target, { excludeId });
      return jsonResponse({ code: 200, duplicate });
    }

    if (isSiteSubmitPath && method === 'POST') {
      const settings = await getSystemSettings(env);
      if (!isSubmissionEnabled(env, settings)) return errorResponse('Public submission disabled', 403);
      const insert = await submitSite(env, await request.json());
      return jsonResponse({ code: 201, message: 'Config submitted successfully, waiting for admin approve', insert }, 201);
    }

    if (path === '/site/preview' && method === 'GET') {
      const adminAuthed = await isAdminAuthenticated(request, env);
      const tokenAuth = adminAuthed ? { authenticated: true } : await validateApiToken(request, env, 'write');
      if (!adminAuthed && !tokenAuth.authenticated) {
        const settings = await getSystemSettings(env);
        if (!isSubmissionEnabled(env, settings)) return errorResponse('Public submission disabled', 403);
      }
      if (tokenAuth.forbidden) return errorResponse('API token scope is insufficient', 403);
      const target = url.searchParams.get('url') || '';
      if (!target) return errorResponse('url parameter is required', 400);
      try {
        const data = await fetchSitePreview(target);
        const duplicate = await findDuplicateSite(env, target);
        return jsonResponse({ code: 200, data: { ...data, duplicate } });
      } catch (err) {
        return errorResponse(err?.message || '抓取网站信息失败', 400);
      }
    }

    if (path === '/submit/suggest-category' && method === 'POST') {
      const adminAuthed = await isAdminAuthenticated(request, env);
      const tokenAuth = adminAuthed ? { authenticated: true } : await validateApiToken(request, env, 'write');
      if (!adminAuthed && !tokenAuth.authenticated) {
        const settings = await getSystemSettings(env);
        if (!isSubmissionEnabled(env, settings)) return errorResponse('Public submission disabled', 403);
      }
      if (tokenAuth.forbidden) return errorResponse('API token scope is insufficient', 403);
      const body = await request.json();
      const data = await suggestCategoryForSite(env, body);
      return jsonResponse({ code: 200, data });
    }

    if (path === '/submit/suggest-tags' && method === 'POST') {
      const adminAuthed = await isAdminAuthenticated(request, env);
      const tokenAuth = adminAuthed ? { authenticated: true } : await validateApiToken(request, env, 'write');
      if (!adminAuthed && !tokenAuth.authenticated) {
        const settings = await getSystemSettings(env);
        if (!isSubmissionEnabled(env, settings)) return errorResponse('Public submission disabled', 403);
      }
      if (tokenAuth.forbidden) return errorResponse('API token scope is insufficient', 403);
      const body = await request.json();
      const data = await suggestTagsForSite(env, {
        name: body?.name,
        url: body?.url,
        desc: body?.desc,
        catelog: body?.catelog,
        tags: body?.tags,
      }, { limit: Math.min(8, Number(body?.limit) || 6) });
      return jsonResponse({ code: 200, data });
    }

    if (isSiteReorderPath && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const body = await request.json();
      const items = body.items || body;
      await reorderSites(env, items);
      safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.SITE_REORDER, target: 'site', summary: `重排 ${items?.length || 0} 个书签`, request }));
      return jsonResponse({ code: 200, message: 'Sites reordered successfully' });
    }

    if (isSiteImportPreviewPath && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await previewImportSites(env, await request.json(), { mode: url.searchParams.get('mode') || 'merge' });
      return jsonResponse({ code: 200, data });
    }

    if (isSiteImportPath && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const importMode = url.searchParams.get('mode') || 'merge';
      const count = await importSites(env, await request.json(), { mode: importMode });
      safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.SITE_IMPORT, target: 'site', summary: `${importMode} 导入 ${count} 个书签`, request }));
      return jsonResponse({ code: 201, message: `Config imported successfully. ${count} items added.` }, 201);
    }

    if (isSiteBulkPath) {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const body = await request.json();

      const idsCount = Array.isArray(body?.ids) ? body.ids.length : 0;

      if (method === 'DELETE' || (method === 'POST' && ['delete', 'bulk-delete', 'remove'].includes(body?.action))) {
        const result = await bulkDeleteSites(env, body?.ids);
        safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.SITE_BULK_DELETE, target: 'site', summary: `批量删除 ${idsCount} 个书签`, detail: { ids: body?.ids }, request }));
        return jsonResponse({ code: 200, message: 'Configs deleted successfully', result });
      }

      if (method === 'PUT') {
        const result = await bulkUpdateSites(env, body);
        const fields = [];
        if (body?.catelog) fields.push(`分类=${body.catelog}`);
        if (body?.visibility) fields.push(`可见性=${body.visibility}`);
        if (body?.tags !== undefined && body?.tags !== null) fields.push(`标签(${body?.mode || 'replace'})`);
        safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.SITE_BULK_UPDATE, target: 'site', summary: `批量修改 ${idsCount} 个书签 ${fields.join(' ')}`.trim(), detail: { ids: body?.ids, fields }, request }));
        return jsonResponse({ code: 200, message: 'Configs updated successfully', result });
      }

      if (method === 'POST' && body?.action === 'check') {
        const result = await bulkCheckSiteHealth(env, body?.ids);
        safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.SITE_BULK_CHECK, target: 'site', summary: `批量检测 ${idsCount} 个书签，正常 ${result?.ok || 0}，异常 ${result?.failed || 0}`, request }));
        return jsonResponse({ code: 200, message: 'Configs checked successfully', result });
      }

      if (method === 'POST' && ['favicon', 'refresh-favicon', 'refreshFavicons'].includes(body?.action)) {
        const result = await bulkRefreshSiteFavicons(env, body?.ids);
        safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.SITE_BULK_FAVICON, target: 'site', summary: `批量刷新图标 ${idsCount} 个，成功 ${result?.refreshed || 0}`, request }));
        return jsonResponse({ code: 200, message: 'Favicons refreshed successfully', result });
      }
    }

    if (isSiteExportPath && method === 'GET') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const exportMode = url.searchParams.get('mode');
      const exportFormat = url.searchParams.get('format');
      const data = await exportConfig(env);

      if (exportFormat === 'csv' || exportMode === 'csv') {
        return new Response(sitesToCsv(data.sites), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="bookmarks.csv"',
          },
        });
      }

      if (exportFormat === 'html' || exportMode === 'html') {
        return new Response(sitesToBookmarkHtml(data.sites), {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': 'attachment; filename="bookmarks.html"',
          },
        });
      }

      const payload = exportMode === 'legacy' ? data.sites : data;
      return new Response(JSON.stringify(payload, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="config.json"',
        },
      });
    }

    if (isSiteCheckPath && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const siteId = path.split('/').filter(Boolean)[1];
      const result = await checkSiteHealth(env, siteId);
      return jsonResponse({ code: 200, message: 'Site health checked successfully', data: result });
    }

    if (isSiteItemPath) {
      if (method === 'GET') {
        const unauthorized = await requireAdmin(request, env);
        if (unauthorized) return unauthorized;
        const data = await getSite(env, id);
        if (!data) return errorResponse('Not found', 404);
        return jsonResponse({ code: 200, data });
      }

      if (method === 'PUT') {
        const unauthorized = await requireAdmin(request, env, { allowApiToken: true, scope: 'write' });
        if (unauthorized) return unauthorized;
        const body = await request.json();
        const force = url.searchParams.get('force') === 'true';
        const update = await updateSite(env, id, body, { force });
        safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.SITE_UPDATE, target: 'site', targetId: id, summary: body?.name, request }));
        return jsonResponse({ code: 200, message: 'Config updated successfully', update });
      }

      if (method === 'DELETE') {
        const unauthorized = await requireAdmin(request, env, { allowApiToken: true, scope: 'write' });
        if (unauthorized) return unauthorized;
        const del = await deleteSite(env, id);
        safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.SITE_DELETE, target: 'site', targetId: id, request }));
        return jsonResponse({ code: 200, message: 'Config deleted successfully', del });
      }
    }

    if (path === '/settings/system' && method === 'GET') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      return jsonResponse({ code: 200, data: await getSystemSettings(env) });
    }

    if (path === '/settings/system' && method === 'PUT') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await updateSystemSettings(env, await request.json());
      return jsonResponse({ code: 200, message: 'System settings updated successfully', data });
    }

    if (path === '/settings/ai' && method === 'GET') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      return jsonResponse({ code: 200, data: await getAiSettings(env) });
    }

    if (path === '/settings/ai' && method === 'PUT') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await updateAiSettings(env, await request.json());
      return jsonResponse({ code: 200, message: 'AI settings updated successfully', data });
    }

    if (path === '/settings/ai/test' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await testAiSettings(env, await request.json());
      return jsonResponse({ code: 200, message: 'AI connection test succeeded', data });
    }

    if (path === '/settings/ai/models' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await listAiModels(env, await request.json());
      return jsonResponse({ code: 200, message: 'AI models fetched successfully', data });
    }

    if (path === '/settings/private-bookmarks' && method === 'GET') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const password = await getPrivateBookmarkPassword(env);
      return jsonResponse({ code: 200, data: { category: '私人书签', passwordConfigured: Boolean(password) } });
    }

    if (path === '/settings/private-bookmarks' && method === 'PUT') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const body = await request.json();
      await updatePrivateBookmarkPassword(env, body?.password);
      return jsonResponse({ code: 200, message: 'Private bookmark password updated successfully' });
    }

    if (path === '/analytics/search' && method === 'GET') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await getSearchAnalytics(env, { limit: url.searchParams.get('limit') || 20 });
      return jsonResponse({ code: 200, data });
    }

    if (path === '/analytics/sites' && method === 'GET') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await getSiteAnalytics(env, { limit: url.searchParams.get('limit') || 20 });
      return jsonResponse({ code: 200, data });
    }

    if (path === '/analytics/submissions' && method === 'GET') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await getSubmissionAnalytics(env, { days: url.searchParams.get('days') || 30 });
      return jsonResponse({ code: 200, data });
    }

    if (isSubmissionsCollectionPath && method === 'GET') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const result = await getPendingSites(env, {
        page: url.searchParams.get('page') || 1,
        pageSize: url.searchParams.get('pageSize') || 10,
        status: url.searchParams.get('status') || 'pending',
      });
      return jsonResponse({ code: 200, ...result });
    }

    if (isSubmissionItemPath) {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;

      if (method === 'PUT') {
        const force = url.searchParams.get('force') === 'true';
        await approvePendingSite(env, id, { force });
        safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.PENDING_APPROVE, target: 'pending_site', targetId: id, request }));
        return jsonResponse({ code: 200, message: 'Pending config approved successfully' });
      }

      if (method === 'DELETE') {
        const body = await request.json().catch(() => ({}));
        const rejectReason = body?.reason || url.searchParams.get('reason') || '';
        await rejectPendingSite(env, id, { reason: rejectReason });
        safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.PENDING_REJECT, target: 'pending_site', targetId: id, summary: rejectReason || undefined, request }));
        return jsonResponse({ code: 200, message: 'Pending config rejected successfully' });
      }
    }

    if (path === '/categories' && method === 'GET') {
      const data = await listCategories(env);
      return jsonResponse({ code: 200, data });
    }

    if (path === '/categories/tree' && method === 'GET') {
      const data = await getCategoryTree(env);
      return jsonResponse({ code: 200, data });
    }

    if (path === '/tags/needs-review' && method === 'GET') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await listSitesNeedingTags(env, {
        limit: url.searchParams.get('limit') || 20,
        maxTags: url.searchParams.get('maxTags') || 0,
      });
      return jsonResponse({ code: 200, data, total: data.length });
    }

    if (path === '/tags' && method === 'GET') {
      const data = await listTags(env);
      return jsonResponse({ code: 200, data });
    }

    if (path === '/tags/suggest' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const body = await request.json();
      const siteInput = body?.siteId || body?.id || {
        name: body?.name,
        url: body?.url,
        desc: body?.desc,
        catelog: body?.catelog,
        tags: body?.tags,
      };
      const data = await suggestTagsForSite(env, siteInput, { limit: body?.limit });
      return jsonResponse({ code: 200, message: 'Tags suggested successfully', data });
    }

    if (path === '/tags/suggest-batch' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const body = await request.json();
      const data = await suggestTagsForSites(env, body?.siteIds || body?.ids || [], {
        limit: body?.limit,
        batchLimit: body?.batchLimit,
      });
      return jsonResponse({ code: 200, message: 'Batch tags suggested successfully', data });
    }

    if (path === '/tags/apply-suggestions' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const body = await request.json();
      const data = await applySiteTagSuggestions(env, body);
      safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.TAG_APPLY_SUGGESTIONS, target: 'tag', summary: `应用标签建议 ${body?.items?.length || 0} 个书签 (${body?.mode || 'append'})`, request }));
      return jsonResponse({ code: 200, message: 'Tag suggestions applied successfully', data });
    }

    if (path === '/tags/merge-suggestions' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const body = await request.json().catch(() => ({}));
      const data = await suggestTagMerges(env, { limit: body?.limit });
      return jsonResponse({ code: 200, message: 'Tag merge suggestions generated successfully', data });
    }

    if (path === '/tags/merge' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const body = await request.json();
      const data = await mergeTags(env, body);
      safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.TAG_MERGE, target: 'tag', summary: `合并标签：${body?.source} → ${body?.target}`, request }));
      return jsonResponse({ code: 200, message: 'Tags merged successfully', data });
    }

    if (path === '/categories/suggest' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await suggestCategoryForSite(env, await request.json());
      return jsonResponse({ code: 200, message: 'Category suggested successfully', data });
    }

    if (path === '/categories/reorder' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const body = await request.json();
      const result = await reorderCategories(env, body.items || body);
      safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.CATEGORY_REORDER, target: 'category', summary: `重排 ${(body.items || body).length} 个分类`, request }));
      return jsonResponse({ code: 200, message: 'Categories reordered successfully', result });
    }

    if (path === '/categories' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const body = await request.json();
      const insert = await createCategory(env, body);
      safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.CATEGORY_CREATE, target: 'category', summary: body?.name, request }));
      return jsonResponse({ code: 201, message: 'Category created successfully', insert }, 201);
    }

    if (path.startsWith('/categories/') && id) {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const decodedId = decodeURIComponent(id);

      if (method === 'PUT') {
        const body = await request.json();
        if (body?.reset) {
          body.sort_order = 9999;
        }
        const result = await updateCategory(env, decodedId, body);
        safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.CATEGORY_UPDATE, target: 'category', targetId: decodedId, summary: result?.newName || body?.name, request }));
        return jsonResponse({ code: 200, message: 'Category updated successfully', data: result });
      }

      if (method === 'DELETE') {
        await deleteCategory(env, decodedId);
        safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.CATEGORY_DELETE, target: 'category', targetId: decodedId, request }));
        return jsonResponse({ code: 200, message: 'Category deleted successfully' });
      }
    }

    if (path === '/operation-logs' && method === 'GET') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await listOperationLogs(env, {
        page: url.searchParams.get('page') || 1,
        pageSize: url.searchParams.get('pageSize') || 20,
        action: url.searchParams.get('action') || '',
        target: url.searchParams.get('target') || '',
      });
      return jsonResponse({ code: 200, ...data });
    }

    if (path === '/backups/webdav-settings' && method === 'GET') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await getWebDavBackupSettings(env);
      return jsonResponse({ code: 200, data });
    }

    if (path === '/backups/webdav-settings' && method === 'PUT') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await updateWebDavBackupSettings(env, await request.json().catch(() => ({})));
      return jsonResponse({ code: 200, message: 'WebDAV backup settings updated successfully', data });
    }

    if (path === '/backups/webdav-test' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await testWebDavBackupSettings(env, await request.json().catch(() => null));
      return jsonResponse({ code: 200, message: 'WebDAV backup test succeeded', data });
    }

    if (path === '/backups' && method === 'GET') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const data = await listBackups(env);
      return jsonResponse({ code: 200, data, total: data.length });
    }

    if (path === '/backups' && method === 'POST') {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const body = await request.json().catch(() => ({}));
      const meta = await createBackup(env, { reason: body?.reason || 'manual', note: body?.note });
      safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.BACKUP_CREATE, target: 'backup', targetId: meta.id, summary: `备份 ${meta.siteCount} 个书签 / ${meta.categoryCount} 个分类`, request }));
      return jsonResponse({ code: 201, message: 'Backup created successfully', data: meta }, 201);
    }

    if (path.startsWith('/backups/') && id) {
      const unauthorized = await requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const backupId = decodeURIComponent(id);
      const isRestorePath = path === `/backups/${id}/restore` || path.endsWith('/restore');

      if (isRestorePath && method === 'POST') {
        const realId = decodeURIComponent(path.split('/')[2] || '');
        const body = await request.json().catch(() => ({}));
        const result = await restoreBackup(env, realId, { mode: body?.mode || 'overwrite' });
        safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.BACKUP_RESTORE, target: 'backup', targetId: realId, summary: `${result.mode} 恢复 ${result.importedSites} 个书签`, request }));
        return jsonResponse({ code: 200, message: 'Backup restored successfully', data: result });
      }

      if (method === 'GET') {
        const payload = await getBackupPayload(env, backupId);
        if (!payload) return errorResponse('Backup not found', 404);
        return new Response(JSON.stringify(payload, null, 2), {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="backup-${backupId}.json"`,
          },
        });
      }

      if (method === 'DELETE') {
        await deleteBackup(env, backupId);
        safeLog(ctx, logOperation(env, { action: OPERATION_LOG_ACTIONS.BACKUP_DELETE, target: 'backup', targetId: backupId, request }));
        return jsonResponse({ code: 200, message: 'Backup deleted successfully' });
      }
    }

    return errorResponse('Not Found', 404);
  } catch (error) {
    return handleApiError(error);
  }
}