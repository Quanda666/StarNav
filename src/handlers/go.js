import { isAdminAuthenticated } from '../lib/auth.js';
import { errorResponse, sanitizeUrl } from '../lib/utils.js';
import { canAccessSite, getSite, incrementSiteHits } from '../services/siteService.js';
import { hasPrivateBookmarkAccess } from '../services/privateBookmarkService.js';

export async function handleGoRequest(request, env, ctx) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/go\/(\d+)$/);
  if (!match) return errorResponse('Not Found', 404);

  const id = Number(match[1]);
  const site = await getSite(env, id);
  if (!site) return errorResponse('Site not found', 404);

  const adminAuthed = await isAdminAuthenticated(request, env);
  const privateAccess = adminAuthed || await hasPrivateBookmarkAccess(request, env);
  if (!canAccessSite(site, { adminAuthed, privateUnlocked: privateAccess })) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/?catalog=${encodeURIComponent(site.catelog)}`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const targetUrl = sanitizeUrl(site.url);
  if (!targetUrl) return errorResponse('Invalid site URL', 400);

  const recordHit = incrementSiteHits(env, id).catch((error) => {
    console.log(`[go] failed to increment hits for site ${id}: ${error?.message || error}`);
  });
  if (ctx?.waitUntil) {
    ctx.waitUntil(recordHit);
  } else {
    await recordHit;
  }

  const fromCatalog = url.searchParams.get('from_catalog') || '';
  const fromTag = url.searchParams.get('from_tag') || '';
  const fromSort = url.searchParams.get('from_sort') || '';

  let replaceUrl = '/';
  const params = new URLSearchParams();
  if (fromCatalog) params.set('catalog', fromCatalog);
  if (fromTag) params.set('tag', fromTag);
  if (fromSort) params.set('sort', fromSort);
  const paramsStr = params.toString();
  if (paramsStr) replaceUrl += '?' + paramsStr;

  // PWA standalone 模式下使用无感历史记录替换，避免外部跳转导致 app 退出，同时实现返回直接回到首页状态
  const goHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>跳转中...</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#334155}@media(prefers-color-scheme:dark){body{background:#0f172a;color:#e2e8f0}}.box{text-align:center;padding:2rem}.spinner{display:inline-block;width:2rem;height:2rem;border:3px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}</style></head><body><div class="box"><div class="spinner"></div><p style="margin-top:1rem;font-size:.9rem;opacity:.8">正在为您跳转...</p></div><script>
(function(){
  var url=${JSON.stringify(targetUrl)};
  var replaceUrl=${JSON.stringify(replaceUrl)};
  var isStandalone=window.matchMedia('(display-mode:standalone)').matches||window.navigator.standalone===true;
  if(isStandalone){
    try {
      // 关键：将当前 /go/:id 的历史记录项替换为首页 '/'
      // 这样当用户在外部网站按返回键时，会直接退回到首页，而不会退出 PWA
      history.replaceState(null, '', replaceUrl);
    } catch(e) {}
    // 使用 location.href 进行 push 导航，确保历史记录栈中永远有前置的 '/' 页面作为退路
    // 从而 100% 解决第二次及后续打开书签返回直接退回桌面的 Bug
    location.href = url;
  } else {
    location.replace(url);
  }
})();
</script></body></html>`;

  return new Response(goHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}