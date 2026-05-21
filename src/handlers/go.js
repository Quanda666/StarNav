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

  // PWA standalone 模式下使用中间页避免外部跳转导致 app 退出
  const goHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>跳转中...</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#334155}@media(prefers-color-scheme:dark){body{background:#0f172a;color:#e2e8f0}}.box{text-align:center;padding:2rem}.btn{display:inline-block;margin:.5rem;padding:.6rem 1.2rem;border-radius:.5rem;text-decoration:none;font-size:.9rem;cursor:pointer;border:none}.btn-primary{background:#3b82f6;color:#fff}.btn-secondary{background:#e2e8f0;color:#334155}@media(prefers-color-scheme:dark){.btn-secondary{background:#334155;color:#e2e8f0}}</style></head><body><div class="box" id="box"><p>正在跳转...</p></div><script>
(function(){
  var url=${JSON.stringify(targetUrl)};
  var isStandalone=window.matchMedia('(display-mode:standalone)').matches||window.navigator.standalone===true;
  if(!isStandalone){location.replace(url);return}
  window.open(url,'_blank');
  document.getElementById('box').innerHTML='<p>已在新窗口打开</p><a class="btn btn-primary" href="/">返回首页</a> <a class="btn btn-secondary" href="'+url+'" target="_blank">重新打开</a>';
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