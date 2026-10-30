// 联网搜索：为 AI 小助理提供站外信息（可选能力，未配置时完全不影响站内问答）。
//
// 支持的后端（按易用度排序）：
//   - tavily    ：POST https://api.tavily.com/search        （需要 API Key，专为 LLM 设计，返回摘要）
//   - serper    ：POST https://google.serper.dev/search     （需要 API Key，Google 结果）
//   - brave     ：GET  https://api.search.brave.com/res/v1/web/search（需要 API Key）
//   - searxng   ：GET  {baseUrl}/search?format=json         （自建实例，无需 Key）
//   - duckduckgo：免 Key 兜底（html/lite 端点，可能被限流或拦截，属尽力而为）
//
// 所有出站请求都走 safeFetch（禁内网、逐跳校验），并带超时与响应体大小上限。

import { cleanText } from '../lib/utils.js';
import { decryptSecret, encryptSecret } from '../lib/crypto.js';
import { getSetting, setSetting } from './settingsService.js';
import { safeFetch, readTextWithLimit } from '../lib/ssrf.js';

const SEARCH_PREFIX = 'search.';
const MAX_RESULTS = 8;
const REQUEST_TIMEOUT_MS = 9000;
const MAX_RESPONSE_BYTES = 512 * 1024;

export const WEB_SEARCH_PROVIDERS = [
  { id: 'none', label: '关闭', needsKey: false, needsBaseUrl: false },
  { id: 'tavily', label: 'Tavily（推荐，返回摘要）', needsKey: true, needsBaseUrl: false },
  { id: 'serper', label: 'Serper（Google 结果）', needsKey: true, needsBaseUrl: false },
  { id: 'brave', label: 'Brave Search API', needsKey: true, needsBaseUrl: false },
  { id: 'searxng', label: 'SearXNG 自建实例', needsKey: false, needsBaseUrl: true },
  { id: 'duckduckgo', label: 'DuckDuckGo（免 Key 兜底）', needsKey: false, needsBaseUrl: false },
];

export const DEFAULT_WEB_SEARCH_SETTINGS = {
  enabled: 'false',
  provider: 'duckduckgo',
  apiKey: '',
  baseUrl: '',
  maxResults: '5',
  autoMode: 'false',
};

function boolString(value) {
  return value === true || String(value) === 'true' ? 'true' : 'false';
}

function providerNeedsKey(provider) {
  return Boolean(WEB_SEARCH_PROVIDERS.find((item) => item.id === provider)?.needsKey);
}

export function normalizeProvider(value) {
  const id = cleanText(value).toLowerCase();
  return WEB_SEARCH_PROVIDERS.some((item) => item.id === id) ? id : 'duckduckgo';
}

/**
 * 读取联网搜索配置。
 *
 * @param {object} env
 * @param {{includeSecret?: boolean}} [options]
 */
export async function getWebSearchSettings(env, { includeSecret = false } = {}) {
  const settings = {};
  for (const [key, defaultValue] of Object.entries(DEFAULT_WEB_SEARCH_SETTINGS)) {
    settings[key] = await getSetting(env, `${SEARCH_PREFIX}${key}`, defaultValue);
  }
  settings.enabled = boolString(settings.enabled);
  settings.autoMode = boolString(settings.autoMode);
  settings.provider = normalizeProvider(settings.provider);
  settings.maxResults = String(Math.max(1, Math.min(MAX_RESULTS, Number(settings.maxResults) || 5)));
  settings.configured = Boolean(settings.apiKey);

  if (includeSecret) {
    settings.apiKey = await decryptSecret(env, settings.apiKey);
  } else {
    settings.apiKey = settings.configured ? '********' : '';
  }
  return settings;
}

/**
 * 保存联网搜索配置。apiKey 传空或 `********` 表示保持不变。
 *
 * @param {object} env
 * @param {object} payload
 */
export async function updateWebSearchSettings(env, payload = {}) {
  const provider = normalizeProvider(payload.provider);
  const maxResults = String(Math.max(1, Math.min(MAX_RESULTS, Number(payload.maxResults) || 5)));
  const baseUrl = cleanText(payload.baseUrl).slice(0, 300);

  await setSetting(env, `${SEARCH_PREFIX}enabled`, boolString(payload.enabled));
  await setSetting(env, `${SEARCH_PREFIX}provider`, provider);
  await setSetting(env, `${SEARCH_PREFIX}maxResults`, maxResults);
  await setSetting(env, `${SEARCH_PREFIX}autoMode`, boolString(payload.autoMode));
  await setSetting(env, `${SEARCH_PREFIX}baseUrl`, baseUrl);

  const apiKey = cleanText(payload.apiKey);
  if (apiKey && apiKey !== '********') {
    await setSetting(env, `${SEARCH_PREFIX}apiKey`, await encryptSecret(env, apiKey));
  } else if (payload.clearApiKey === true) {
    await setSetting(env, `${SEARCH_PREFIX}apiKey`, '');
  }

  return getWebSearchSettings(env);
}

export function stripHtml(value = '') {
  return cleanText(String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeDuckDuckGoLink(href = '') {
  const raw = String(href || '');
  if (!raw) return '';
  // DDG 会把结果包成 //duckduckgo.com/l/?uddg=<encoded>&rut=...
  const match = raw.match(/[?&]uddg=([^&]+)/);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return '';
    }
  }
  if (raw.startsWith('//')) return `https:${raw}`;
  return raw;
}

/**
 * 提取元素开始标签里的属性值（单双引号均可，纯函数）。
 *
 * @param {string} tag `<a ...>` 形式的标签文本。
 * @param {string} name 属性名。
 * @returns {string}
 */
export function extractAttr(tag = '', name = '') {
  const key = String(name || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!key) return '';
  const doubleQuoted = tag.match(new RegExp(`${key}\\s*=\\s*"([^"]*)"`, 'i'));
  if (doubleQuoted) return doubleQuoted[1];
  const singleQuoted = tag.match(new RegExp(`${key}\\s*=\\s*'([^']*)'`, 'i'));
  return singleQuoted ? singleQuoted[1] : '';
}

/**
 * 取出标签内的 href（兼容单引号 / 无引号写法，纯函数）。
 *
 * @param {string} tag
 * @returns {string}
 */
export function extractHref(tag = '') {
  return extractAttr(tag, 'href') || String(tag).match(/href\s*=\s*([^\s>"']+)/i)?.[1] || '';
}

/**
 * 按 class 名收集元素（属性顺序无关，纯函数）。
 * 用于解析搜索引擎返回的 HTML，不依赖 DOM。
 *
 * @param {string} html
 * @param {string} className class 名片段。
 * @param {number} [limit] 最多收集数量。
 * @returns {Array<{tag:string,inner:string,index:number}>}
 */
export function collectByClass(html = '', className = '', limit = 40) {
  const text = String(html || '');
  const results = [];
  const openPattern = /<([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?>/g;
  let match;
  while ((match = openPattern.exec(text)) && results.length < limit) {
    const attrs = match[2] || '';
    const classValue = extractAttr(`<x${attrs}>`, 'class');
    if (!classValue || !classValue.split(/\s+/).includes(className)) continue;
    const closeTag = `</${match[1]}>`;
    const closeIndex = text.toLowerCase().indexOf(closeTag, openPattern.lastIndex);
    const inner = closeIndex === -1 ? '' : text.slice(openPattern.lastIndex, closeIndex);
    results.push({ tag: `<${match[1]}${attrs}>`, inner, index: match.index });
  }
  return results;
}

/**
 * 解析 DuckDuckGo HTML 结果页（纯函数，便于单测）。
 *
 * @param {string} html
 * @param {number} [limit]
 * @returns {Array<{title:string,url:string,snippet:string}>}
 */
export function parseDuckDuckGoHtml(html = '', limit = 5) {
  const text = String(html || '');
  const results = [];
  const blocks = collectByClass(text, 'result__a');
  const snippets = collectByClass(text, 'result__snippet').map((item) => stripHtml(item.inner));
  blocks.slice(0, limit).forEach((block, index) => {
    const url = decodeDuckDuckGoLink(extractHref(block.tag));
    const title = stripHtml(block.inner);
    if (url && title) results.push({ title, url, snippet: snippets[index] || '' });
  });
  return results;
}

/**
 * 解析 DuckDuckGo Lite 结果页（表格布局，纯函数）。
 *
 * @param {string} html
 * @param {number} [limit]
 * @returns {Array<{title:string,url:string,snippet:string}>}
 */
export function parseDuckDuckGoLite(html = '', limit = 5) {
  const text = String(html || '');
  const results = [];
  const links = collectByClass(text, 'result-link');
  const snippets = collectByClass(text, 'result-snippet').map((item) => stripHtml(item.inner));
  links.slice(0, limit).forEach((link, index) => {
    const url = decodeDuckDuckGoLink(extractHref(link.tag));
    const title = stripHtml(link.inner);
    if (url && title) results.push({ title, url, snippet: snippets[index] || '' });
  });
  return results;
}

/**
 * 归一化不同后端返回的结果数组（纯函数）。
 *
 * @param {Array} items
 * @param {number} limit
 * @returns {Array<{title:string,url:string,snippet:string}>}
 */
export function normalizeSearchResults(items = [], limit = 5) {
  const seen = new Set();
  const results = [];
  for (const item of Array.isArray(items) ? items : []) {
    const url = cleanText(item?.url || item?.link || item?.href);
    const title = cleanText(item?.title || item?.name || url).slice(0, 160);
    const snippet = cleanText(item?.snippet || item?.content || item?.description || '').slice(0, 400);
    if (!url || !/^https?:\/\//i.test(url) || !title) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    results.push({ title, url, snippet });
    if (results.length >= limit) break;
  }
  return results;
}

async function fetchJson(url, options = {}) {
  const response = await safeFetch(url, { ...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const text = await readTextWithLimit(response, MAX_RESPONSE_BYTES);
  if (!response.ok) {
    throw new Error(`${response.status} ${text.slice(0, 160)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('搜索结果不是合法 JSON');
  }
}

async function searchTavily(query, { apiKey, limit }) {
  const data = await fetchJson('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: limit,
      search_depth: 'basic',
      include_answer: false,
    }),
  });
  return normalizeSearchResults(data?.results || [], limit);
}

async function searchSerper(query, { apiKey, limit }) {
  const data = await fetchJson('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
    body: JSON.stringify({ q: query, num: limit }),
  });
  const organic = Array.isArray(data?.organic) ? data.organic : [];
  return normalizeSearchResults(organic.map((item) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet,
  })), limit);
}

async function searchBrave(query, { apiKey, limit }) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`;
  const data = await fetchJson(url, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
  });
  const items = Array.isArray(data?.web?.results) ? data.web.results : [];
  return normalizeSearchResults(items.map((item) => ({
    title: item.title,
    url: item.url,
    snippet: item.description,
  })), limit);
}

async function searchSearxng(query, { baseUrl, limit }) {
  const base = cleanText(baseUrl).replace(/\/+$/, '');
  if (!base) throw new Error('SearXNG 需要填写实例地址');
  const url = `${base}/search?q=${encodeURIComponent(query)}&format=json&safesearch=1`;
  const data = await fetchJson(url, { headers: { Accept: 'application/json' } });
  return normalizeSearchResults((data?.results || []).map((item) => ({
    title: item.title,
    url: item.url,
    snippet: item.content,
  })), limit);
}

async function searchDuckDuckGo(query, { limit }) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'text/html,application/xhtml+xml',
  };
  let lastError = null;

  try {
    const response = await safeFetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers,
      body: `q=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) {
      const html = await readTextWithLimit(response, MAX_RESPONSE_BYTES);
      const parsed = parseDuckDuckGoHtml(html, limit);
      if (parsed.length) return parsed;
      lastError = new Error('HTML 端点未解析到结果');
    } else {
      lastError = new Error(`HTML 端点返回 ${response.status}`);
    }
  } catch (error) {
    lastError = error;
  }

  const response = await safeFetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`DuckDuckGo 返回 ${response.status}（${lastError?.message || 'HTML 端点不可用'}）`);
  const html = await readTextWithLimit(response, MAX_RESPONSE_BYTES);
  const parsed = parseDuckDuckGoLite(html, limit);
  if (!parsed.length) throw new Error('DuckDuckGo 未返回可解析的结果（可能被限流，建议配置 Tavily/Serper）');
  return parsed;
}

/**
 * 执行联网搜索。
 *
 * @param {object} env
 * @param {string} query 搜索词。
 * @param {{limit?: number, settings?: object}} [options]
 * @returns {Promise<{ok:boolean,provider:string,results:Array,error:string,configured:boolean}>}
 */
export async function webSearch(env, query, { limit, settings } = {}) {
  const keyword = cleanText(query).slice(0, 200);
  const resolved = settings || await getWebSearchSettings(env, { includeSecret: true });
  const provider = normalizeProvider(resolved.provider);
  const safeLimit = Math.max(1, Math.min(MAX_RESULTS, Number(limit) || Number(resolved.maxResults) || 5));

  if (resolved.enabled !== 'true') {
    return { ok: false, provider, results: [], configured: false, error: '联网搜索未启用' };
  }
  if (!keyword) {
    return { ok: false, provider, results: [], configured: true, error: '搜索词为空' };
  }
  if (provider === 'none') {
    return { ok: false, provider, results: [], configured: true, error: '未选择搜索后端' };
  }
  if (providerNeedsKey(provider) && !resolved.apiKey) {
    return { ok: false, provider, results: [], configured: false, error: '未配置搜索 API Key' };
  }

  try {
    let results = [];
    if (provider === 'tavily') results = await searchTavily(keyword, { apiKey: resolved.apiKey, limit: safeLimit });
    else if (provider === 'serper') results = await searchSerper(keyword, { apiKey: resolved.apiKey, limit: safeLimit });
    else if (provider === 'brave') results = await searchBrave(keyword, { apiKey: resolved.apiKey, limit: safeLimit });
    else if (provider === 'searxng') results = await searchSearxng(keyword, { baseUrl: resolved.baseUrl, limit: safeLimit });
    else results = await searchDuckDuckGo(keyword, { limit: safeLimit });

    return {
      ok: true,
      provider,
      results: results.slice(0, safeLimit),
      configured: true,
      error: '',
    };
  } catch (error) {
    console.warn(`[web-search] ${provider} failed: ${error?.message || error}`);
    return {
      ok: false,
      provider,
      results: [],
      configured: true,
      error: error?.message || String(error),
    };
  }
}

/**
 * 抓取指定网页的标题 / 摘要 / 正文片段，供 AI 理解用户贴出的链接。
 *
 * @param {string} rawUrl
 * @param {{maxChars?: number}} [options]
 * @returns {Promise<{ok:boolean,url:string,title:string,description:string,text:string,error:string}>}
 */
export async function fetchPageDigest(rawUrl, { maxChars = 2000 } = {}) {
  const target = cleanText(rawUrl);
  if (!target) return { ok: false, url: '', title: '', description: '', text: '', error: '缺少链接' };
  try {
    const response = await safeFetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StarNavBot/1.0; +https://workers.dev)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      return { ok: false, url: target, title: '', description: '', text: '', error: `目标站点返回 ${response.status}` };
    }
    const html = await readTextWithLimit(response, MAX_RESPONSE_BYTES);
    const title = stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
    const description = stripHtml(
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || '',
    );
    const body = stripHtml(
      (html.match(/<body[\s\S]*?<\/body>/i)?.[0] || '')
        .replace(/<(nav|footer|header|aside)[\s\S]*?<\/\1>/gi, ' '),
    );
    return {
      ok: true,
      url: target,
      title,
      description,
      text: body.slice(0, Math.max(200, Math.min(6000, maxChars))),
      error: '',
    };
  } catch (error) {
    return { ok: false, url: target, title: '', description: '', text: '', error: error?.message || String(error) };
  }
}

/**
 * 连通性自检：真正发起一次搜索，返回耗时与样例结果。
 *
 * @param {object} env
 * @param {object} [payload] 可覆盖已保存配置（未保存也能测）。
 */
export async function testWebSearch(env, payload = {}) {
  const saved = await getWebSearchSettings(env, { includeSecret: true });
  const merged = {
    ...saved,
    ...(payload.provider ? { provider: normalizeProvider(payload.provider) } : {}),
    ...(payload.baseUrl !== undefined ? { baseUrl: cleanText(payload.baseUrl) } : {}),
    ...(payload.maxResults ? { maxResults: payload.maxResults } : {}),
    enabled: 'true',
  };
  const apiKey = cleanText(payload.apiKey);
  if (apiKey && apiKey !== '********') merged.apiKey = apiKey;

  const started = Date.now();
  const result = await webSearch(env, cleanText(payload.query) || 'cloudflare workers', {
    limit: 3,
    settings: merged,
  });
  return {
    ok: result.ok,
    provider: result.provider,
    elapsedMs: Date.now() - started,
    results: result.results,
    error: result.error,
  };
}
