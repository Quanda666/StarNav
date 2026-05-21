import { conflict, errorResponse, forbidden, isSubmissionEnabled, jsonResponse, unauthorized } from '../lib/utils.js';
import { createApiToken, hasBearerToken, isAdminAuthenticated, listApiTokens, revokeApiToken, validateApiToken } from '../lib/auth.js';
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
import { chatWithAiAssistant, getAiSettings, listAiModels, suggestCategoryForSite, suggestTagMerges, suggestTagsForSite, suggestTagsForSites, testAiSettings, updateAiSettings } from '../services/aiService.js';
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

function safeLog(ctx, promise) {
  if (ctx?.waitUntil && promise && typeof promise.then === 'function') {
    ctx.waitUntil(promise.catch(() => {}));
  }
}

async function requireAdmin(request, env, options = {}) {
  const { allowApiToken = false, scope = 'write' } = options;

  if (allowApiToken && hasBearerToken(request)) {
    const tokenAuth = await validateApiToken(request, env, scope);
    if (tokenAuth.authenticated) return null;
    if (tokenAuth.forbidden) {
      return forbidden('API token scope is insufficient', {
        requiredScope: scope,
        tokenScopes: tokenAuth.token?.scopes || [],
      });
    }
  }

  if (await isAdminAuthenticated(request, env)) {
    return null;
  }

  if (allowApiToken && !hasBearerToken(request)) {
    const tokenAuth = await validateApiToken(request, env, scope);
    if (tokenAuth.authenticated) return null;
    if (tokenAuth.forbidden) {
      return forbidden('API token scope is insufficient', {
        requiredScope: scope,
        tokenScopes: tokenAuth.token?.scopes || [],
      });
    }
  }

  return unauthorized(allowApiToken ? 'Admin cookie or Bearer token is required' : 'Admin authentication is required', {
    allowApiToken,
    requiredScope: allowApiToken ? scope : undefined,
  });
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function sitesToCsv(sites = []) {
  const columns = [
    ['id', 'ID'],
    ['name', '名称'],
    ['url', '网址'],
    ['logo', 'Logo'],
    ['desc', '描述'],
    ['catelog', '分类'],
    ['tags', '标签'],
    ['visibility', '可见性'],
    ['sort_order', '排序'],
    ['hits', '访问次数'],
    ['last_visit_time', '最近访问时间'],
    ['last_checked_at', '最近检测时间'],
    ['last_status_code', '最近检测状态码'],
    ['last_error', '最近检测错误'],
    ['create_time', '创建时间'],
    ['update_time', '更新时间'],
  ];
  const rows = [
    columns.map(([, label]) => csvCell(label)).join(','),
    ...sites.map((site) => columns.map(([key]) => csvCell(site?.[key])).join(',')),
  ];
  return `\uFEFF${rows.join('\r\n')}\r\n`;
}

function bookmarkHtmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toBookmarkTimestamp(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? Math.floor(time / 1000) : Math.floor(Date.now() / 1000);
}

function sitesToBookmarkHtml(sites = []) {
  const groups = new Map();
  for (const site of sites) {
    const category = String(site?.catelog || '未分类').trim() || '未分类';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(site);
  }

  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ];

  for (const [category, items] of groups.entries()) {
    lines.push(`  <DT><H3 ADD_DATE="${Math.floor(Date.now() / 1000)}">${bookmarkHtmlEscape(category)}</H3>`);
    lines.push('  <DL><p>');
    for (const site of items) {
      const attrs = [
        `HREF="${bookmarkHtmlEscape(site?.url)}"`,
        `ADD_DATE="${toBookmarkTimestamp(site?.create_time)}"`,
        `LAST_MODIFIED="${toBookmarkTimestamp(site?.update_time)}"`,
      ];
      if (site?.logo) attrs.push(`ICON="${bookmarkHtmlEscape(site.logo)}"`);
      if (Array.isArray(site?.tags) && site.tags.length) attrs.push(`TAGS="${bookmarkHtmlEscape(site.tags.join(','))}"`);
      lines.push(`    <DT><A ${attrs.join(' ')}>${bookmarkHtmlEscape(site?.name || site?.url || '未命名书签')}</A>`);
      if (site?.desc) lines.push(`    <DD>${bookmarkHtmlEscape(site.desc)}`);
    }
    lines.push('  </DL><p>');
  }

  lines.push('</DL><p>');
  return lines.join('\n');
}

function getPublicApiDiscovery(origin = '') {
  const baseUrl = origin || '';
  const endpoints = [
    {
      method: 'GET',
      path: '/api/sites',
      summary: '公开书签列表',
      auth: 'none',
      permission: '按当前 cookie 权限过滤 private/admin_only/unlisted；未解锁访客只返回公开可列出书签',
      query: {
        page: '页码，默认 1',
        pageSize: '每页数量，默认 10',
        catalog: '分类名称',
        tag: '标签名称',
        keyword: '普通关键词',
        sort: '排序模式，例如 hot/recent',
        health: '健康筛选：bad/ok/unknown',
      },
    },
    {
      method: 'POST',
      path: '/api/sites',
      summary: '第三方创建书签',
      auth: 'bearer',
      permission: '需要后台 cookie 或 Bearer Token write/admin scope；适合浏览器插件和脚本写入',
      body: {
        name: '书签名称，必填',
        url: '书签 URL，必填',
        desc: '描述，可选',
        catelog: '分类，可选',
        tags: '标签，可选，逗号或空格分隔',
        visibility: '可见性，可选：public/private/unlisted/admin_only',
      },
    },
    {
      method: 'GET',
      path: '/api/categories',
      summary: '平铺分类列表',
      auth: 'none',
      permission: '公开可读',
    },
    {
      method: 'GET',
      path: '/api/categories/tree',
      summary: '树形分类列表',
      auth: 'none',
      permission: '公开可读',
    },
    {
      method: 'GET',
      path: '/api/tags',
      summary: '标签列表及使用次数',
      auth: 'none',
      permission: '公开可读',
    },
    {
      method: 'GET',
      path: '/api/search',
      summary: '全站公开搜索',
      auth: 'none',
      permission: '按当前 cookie 权限过滤 private/admin_only/unlisted；未解锁访客只搜索公开可列出书签',
      query: {
        q: '搜索词，支持 tag: / cat: / category: / url: / is: 语法',
        keyword: 'q 的兼容别名',
        limit: '返回数量，默认 50',
      },
    },
    {
      method: 'GET',
      path: '/api/settings/public',
      summary: '站点公开设置',
      auth: 'none',
      permission: '公开可读',
    },
    {
      method: 'POST',
      path: '/api/ai/chat',
      summary: 'AI 书签助理',
      auth: 'none',
      permission: '按当前 cookie 权限过滤 private/admin_only/unlisted；未解锁访客只检索公开可列出书签',
      body: {
        message: '用户问题，必填',
        previousSites: '上一轮命中书签 ID 数组，可选；后端会重新读取并校验权限',
      },
    },
    {
      method: 'GET',
      path: '/api/favicon',
      summary: '获取指定 URL 的 favicon',
      auth: 'none',
      permission: '公开可读',
      query: {
        url: '目标网站 URL，必填',
      },
    },
    {
      method: 'GET',
      path: '/api/site/preview',
      summary: '抓取网站标题、描述、favicon，并检测重复',
      auth: 'conditional',
      permission: '管理员可用；未登录访客仅在开启公开提交时可用',
      query: {
        url: '目标网站 URL，必填',
      },
    },
    {
      method: 'POST',
      path: '/api/config/submit',
      aliases: ['/api/submissions'],
      summary: '访客提交新书签',
      auth: 'none',
      permission: '仅在开启公开提交时可用',
    },
    {
      method: 'POST',
      path: '/api/submit/suggest-category',
      summary: '为访客提交推荐分类',
      auth: 'conditional',
      permission: '管理员可用；未登录访客仅在开启公开提交时可用',
    },
    {
      method: 'POST',
      path: '/api/submit/suggest-tags',
      summary: '为访客提交推荐标签',
      auth: 'conditional',
      permission: '管理员可用；未登录访客仅在开启公开提交时可用',
    },
  ];

  return {
    code: 200,
    name: 'StarNav Public API',
    version: '1.0.0',
    baseUrl,
    description: '公开 API 默认无需 Token；第三方写入可使用 Bearer Token；敏感管理操作仍使用后台 cookie 鉴权。',
    endpoints,
    openapi: `${baseUrl}/api/openapi.json`,
  };
}

function getPublicOpenApiDocument(origin = '') {
  const discovery = getPublicApiDiscovery(origin);
  const paths = {};
  for (const endpoint of discovery.endpoints) {
    const pathItem = paths[endpoint.path] || {};
    pathItem[endpoint.method.toLowerCase()] = {
      summary: endpoint.summary,
      description: endpoint.permission,
      security: endpoint.auth === 'none' ? [] : endpoint.auth === 'bearer' ? [{ bearerAuth: [] }] : [{ cookieAuth: [] }],
      parameters: Object.entries(endpoint.query || {}).map(([name, description]) => ({
        name,
        in: 'query',
        required: /必填/.test(description),
        schema: { type: 'string' },
        description,
      })),
      requestBody: endpoint.body ? {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: Object.fromEntries(Object.entries(endpoint.body).map(([name, description]) => [name, { type: 'string', description }])),
            },
          },
        },
      } : undefined,
      responses: {
        200: { description: 'OK' },
        400: { description: 'Bad Request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
      },
    };
    paths[endpoint.path] = pathItem;
  }

  return {
    openapi: '3.0.3',
    info: {
      title: discovery.name,
      version: discovery.version,
      description: discovery.description,
    },
    servers: [{ url: origin || '/' }],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'admin_session',
          description: '后台管理操作使用现有 cookie 鉴权；公开 API 不需要鉴权。',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'StarNav API Token',
          description: '第三方写入接口可使用 Authorization: Bearer <token>。',
        },
      },
    },
    paths,
  };
}

export async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const method = request.method;
  const segments = path.split('/').filter(Boolean);
  const id = segments.at(-1);

  const isSitesCollectionPath = path === '/config' || path === '/sites';
  const isSiteSubmitPath = path === '/config/submit' || path === '/submissions';
  const isSiteReorderPath = path === '/config/reorder' || path === '/sites/reorder';
  const isSiteImportPath = path === '/config/import' || path === '/sites/import';
  const isSiteImportPreviewPath = path === '/config/import/preview' || path === '/sites/import/preview';
  const isSiteBulkPath = path === '/config/bulk' || path === '/sites/bulk';
  const isSiteExportPath = path === '/config/export' || path === '/sites/export';
  const isSiteCheckPath = /^\/(?:config|sites)\/\d+\/check$/.test(path);
  const isSiteItemPath = /^\/(?:config|sites)\/\d+$/.test(path);
  const isSubmissionsCollectionPath = path === '/pending' || path === '/submissions';
  const isSubmissionItemPath = /^\/(?:pending|submissions)\/\d+$/.test(path);

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

      const result = await getSites(env, { page, pageSize, catalog, keyword, tag, sort, health, includePrivate: privateAccess, adminAuthed, privateUnlocked: privateAccess });
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
      if (!isSubmissionEnabled(env)) return errorResponse('Public submission disabled', 403);
      const insert = await submitSite(env, await request.json());
      return jsonResponse({ code: 201, message: 'Config submitted successfully, waiting for admin approve', insert }, 201);
    }

    if (path === '/site/preview' && method === 'GET') {
      const adminAuthed = await isAdminAuthenticated(request, env);
      const tokenAuth = adminAuthed ? { authenticated: true } : await validateApiToken(request, env, 'write');
      if (!adminAuthed && !tokenAuth.authenticated && !isSubmissionEnabled(env)) return errorResponse('Public submission disabled', 403);
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
      if (!adminAuthed && !tokenAuth.authenticated && !isSubmissionEnabled(env)) return errorResponse('Public submission disabled', 403);
      if (tokenAuth.forbidden) return errorResponse('API token scope is insufficient', 403);
      const body = await request.json();
      const data = await suggestCategoryForSite(env, body);
      return jsonResponse({ code: 200, data });
    }

    if (path === '/submit/suggest-tags' && method === 'POST') {
      const adminAuthed = await isAdminAuthenticated(request, env);
      const tokenAuth = adminAuthed ? { authenticated: true } : await validateApiToken(request, env, 'write');
      if (!adminAuthed && !tokenAuth.authenticated && !isSubmissionEnabled(env)) return errorResponse('Public submission disabled', 403);
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
    if (error?.code === 'DUPLICATE_URL') {
      const details = {
        duplicate: error.duplicate || null,
        scope: error.scope || 'site',
      };
      const response = conflict(error.message, details);
      const payload = await response.json();
      return jsonResponse({ ...payload, ...details }, 409);
    }
    const message = error?.message || 'Internal Server Error';
    const status = /required|invalid|not found|children|sites|parent|must be|valid https url/i.test(message) ? 400 : 500;
    return errorResponse(status === 500 ? `Internal Server Error: ${message}` : message, status);
  }
}