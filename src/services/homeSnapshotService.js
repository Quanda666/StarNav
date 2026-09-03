// 首页数据快照（KV）。
//
// 背景：首页每次回源渲染需要 sites（含标签）、分类树、系统设置三份全量数据，合计约 9 条 D1 查询、
// 数千行读取。Cloudflare 边缘 HTML 缓存按 colo 独立，全球数百个节点各自回源，回源总次数无法靠
// 调大 TTL 压下来——因此必须让「回源本身不查 D1」。
//
// 做法：把三份数据打包成一个 JSON 存进 KV，匿名渲染只读 KV（免费额度 10 万次/天，且自带边缘缓存）。
// 任何写操作后删除快照，下次渲染重建；另加 TTL 兜底，避免失效钩子漏掉某条路径时长期读到旧数据。
//
// 管理员（带 session cookie）一律绕过快照直读 D1，保证后台改完立刻能在前台看到最新结果。

import { getAllSites } from './siteService.js';
import { getCategoryTree } from './categoryService.js';
import { getSystemSettings } from './systemSettingsService.js';

const SNAPSHOT_KEY = 'home:snapshot:v1';
// TTL 兜底：即使失效钩子漏掉某条写路径，最迟 10 分钟后也会重建。
const SNAPSHOT_TTL_SECONDS = 600;

/**
 * 直接从 D1 读取首页所需的三份数据。
 *
 * @param {object} env Cloudflare Workers 环境绑定。
 * @returns {Promise<{sites: Array<object>, categoryTree: Array<object>, systemSettings: object}>}
 */
export async function loadHomeDataFromDb(env) {
  const [systemSettings, sites, categoryTree] = await Promise.all([
    getSystemSettings(env),
    getAllSites(env),
    getCategoryTree(env),
  ]);
  return { sites, categoryTree, systemSettings };
}

/**
 * 读取首页数据快照；KV 未命中时回源 D1 并异步写回快照。
 *
 * KV 不可用或内容损坏时自动退化为直读 D1，不影响页面可用性。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_AUTH`。
 * @param {{ waitUntil?: (p: Promise<any>) => void }} [ctx] Worker 执行上下文，用于异步写回。
 * @returns {Promise<{sites: Array<object>, categoryTree: Array<object>, systemSettings: object}>}
 */
export async function getHomeSnapshot(env, ctx) {
  if (!env?.NAV_AUTH) return loadHomeDataFromDb(env);

  try {
    const cached = await env.NAV_AUTH.get(SNAPSHOT_KEY, { type: 'json' });
    if (cached && Array.isArray(cached.sites) && Array.isArray(cached.categoryTree) && cached.systemSettings) {
      return { sites: cached.sites, categoryTree: cached.categoryTree, systemSettings: cached.systemSettings };
    }
  } catch (error) {
    console.warn(`[homeSnapshot] read skipped: ${error?.message || error}`);
  }

  const data = await loadHomeDataFromDb(env);

  const write = env.NAV_AUTH.put(SNAPSHOT_KEY, JSON.stringify({ createdAt: Date.now(), ...data }), {
    expirationTtl: SNAPSHOT_TTL_SECONDS,
  }).catch((error) => {
    console.warn(`[homeSnapshot] write skipped: ${error?.message || error}`);
  });
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(write);
  else await write;

  return data;
}

/**
 * 失效首页数据快照，供任何改动站点 / 分类 / 系统设置的写操作调用。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_AUTH`。
 * @returns {Promise<void>}
 */
export async function invalidateHomeSnapshot(env) {
  if (!env?.NAV_AUTH) return;
  try {
    await env.NAV_AUTH.delete(SNAPSHOT_KEY);
  } catch (error) {
    console.warn(`[homeSnapshot] invalidate skipped: ${error?.message || error}`);
  }
}
