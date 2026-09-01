// 首页匿名响应的共享边缘缓存（Cloudflare Cache API）。
//
// 安全前提：只缓存"完全匿名"的首页 GET 响应——请求不携带管理员会话 / 私人书签访问 cookie，
// 因此渲染输出不含任何 per-user 个性化内容，可在边缘对所有访客安全共享。
// 带登录态或私人解锁 cookie 的请求一律不缓存，杜绝把个性化视图泄露给他人。
//
// 全局数据（站点/分类/系统设置）变化通过较短的 s-maxage 自然失效；管理员带 cookie 不走缓存，
// 改动后自身可立即看到最新结果。

const SESSION_COOKIE_NAME = 'nav_admin_session';
const PRIVATE_ACCESS_COOKIE_NAME = 'nav_private_bookmarks_access';
const LANGUAGE_COOKIE = 'nav_lang';

// 边缘缓存 300s（5分钟），浏览器不缓存（max-age=0）以便始终回源命中最新的边缘副本。
const HOME_CACHE_CONTROL = 'public, max-age=0, s-maxage=300';

function parseCookieHeader(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader.split(';').map((part) => {
      const [key, ...value] = part.trim().split('=');
      return [key, value.join('=')];
    }).filter(([key]) => key),
  );
}

/**
 * 判定首页请求是否可走共享边缘缓存，并返回稳定的缓存键 Request；不可缓存时返回 null。
 *
 * @param {Request} request
 * @returns {Request|null}
 */
export function buildHomeCacheKey(request) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return null;
  }
  if (request.method !== 'GET') return null;
  if (url.pathname !== '/') return null;
  // Service Worker 的强制刷新请求绕过缓存。
  if (url.searchParams.has('__refresh')) return null;

  const cookies = parseCookieHeader(request.headers.get('Cookie') || '');
  // 任一鉴权相关 cookie 存在 → 视为个性化请求，不缓存。
  if (cookies[SESSION_COOKIE_NAME] || cookies[PRIVATE_ACCESS_COOKIE_NAME]) return null;

  // 影响渲染输出的维度纳入缓存键：语言 + 分类 / 排序 / 标签筛选。
  const lang = url.searchParams.get('lang') || cookies[LANGUAGE_COOKIE] || '';
  const params = new URLSearchParams();
  const dims = { catalog: url.searchParams.get('catalog'), sort: url.searchParams.get('sort'), tag: url.searchParams.get('tag'), lang };
  for (const [key, value] of Object.entries(dims)) {
    if (value) params.set(key, value);
  }
  params.sort();
  return new Request(`https://nav.cache/home?${params.toString()}`, { method: 'GET' });
}

/**
 * 以 read-through 方式为首页渲染包裹边缘缓存。
 * - 命中：直接返回缓存响应。
 * - 未命中：执行 render，标注 Cache-Control 后异步写入边缘缓存。
 * 在不支持 Cache API 的环境（本地 node 测试等）下自动退化为直接渲染。
 *
 * @param {Request} request
 * @param {{ waitUntil?: (p: Promise<any>) => void }} ctx
 * @param {() => Promise<Response>} render
 * @returns {Promise<Response>}
 */
export async function withHomeEdgeCache(request, ctx, render) {
  const cache = (typeof caches !== 'undefined' && caches && caches.default) ? caches.default : null;
  const cacheKey = cache ? buildHomeCacheKey(request) : null;
  if (!cacheKey) return render();

  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const response = await render();
  const contentType = response?.headers?.get?.('Content-Type') || '';
  if (response && response.status === 200 && contentType.includes('text/html')) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', HOME_CACHE_CONTROL);
    headers.delete('Set-Cookie'); // 冗余保险：匿名首页不应带 Set-Cookie，避免污染共享缓存。
    const cached = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    const put = cache.put(cacheKey, cached.clone());
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(put);
    else await put.catch(() => {});
    return cached;
  }
  return response;
}
