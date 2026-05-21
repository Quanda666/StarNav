import { getFavicon } from '../lib/favicon.js';
import { cleanText, normalizeSortOrder, nullableText } from '../lib/utils.js';
import { upsertCategoryByName } from './categoryService.js';
import { PRIVATE_BOOKMARK_CATEGORY } from './privateBookmarkService.js';
import { attachTagsToSites, getSiteIdsByTag, normalizeTags, setSiteTags } from './tagService.js';

/**
 * @typedef {'public' | 'private' | 'unlisted' | 'admin_only'} SiteVisibility
 */

/**
 * @typedef {object} SiteRecord
 * @property {number|string} [id]
 * @property {string} [name]
 * @property {string} [url]
 * @property {string|null} [logo]
 * @property {string|null} [desc]
 * @property {string} [catelog]
 * @property {number|string|null} [category_id]
 * @property {SiteVisibility|string|null} [visibility]
 * @property {number|string|null} [sort_order]
 * @property {number|string|null} [hits]
 * @property {string|null} [last_visit_time]
 * @property {string|null} [last_checked_at]
 * @property {number|string|null} [last_status_code]
 * @property {string|null} [last_error]
 * @property {string|null} [create_time]
 * @property {string|null} [update_time]
 * @property {string[]} [tags]
 */

/**
 * @typedef {object} SiteAccessOptions
 * @property {boolean} [adminAuthed=false] 是否已通过后台管理员 cookie 鉴权。
 * @property {boolean} [privateUnlocked=false] 是否已解锁私密书签访问态。
 */

/**
 * @typedef {object} SitePayload
 * @property {string} [name]
 * @property {string} [url]
 * @property {string|null} [logo]
 * @property {string|null} [desc]
 * @property {string|null} [description]
 * @property {string} [catelog]
 * @property {string} [category]
 * @property {string} [category_name]
 * @property {SiteVisibility|string} [visibility]
 * @property {number|string|null} [sort_order]
 * @property {string[]|string} [tags]
 * @property {string[]|string} [tag_names]
 */

export const SITE_VISIBILITIES = ['public', 'private', 'unlisted', 'admin_only'];

/**
 * 将外部输入规范化为站点可见性枚举。
 *
 * 私密书签分类会自动回退为 `private`，其他非法值默认回退为 `public`。
 *
 * @param {unknown} value 原始可见性输入。
 * @param {unknown} [catelog=''] 分类名称，用于兼容私密书签旧数据。
 * @returns {SiteVisibility}
 */
export function normalizeVisibility(value, catelog = '') {
  const visibility = cleanText(value).toLowerCase();
  if (SITE_VISIBILITIES.includes(visibility)) return visibility;
  return cleanText(catelog) === PRIVATE_BOOKMARK_CATEGORY ? 'private' : 'public';
}

/**
 * 判断站点是否属于私密书签。
 *
 * @param {SiteRecord|null|undefined} site 站点记录。
 * @returns {boolean}
 */
export function isPrivateSite(site) {
  return normalizeVisibility(site?.visibility, site?.catelog) === 'private' || cleanText(site?.catelog) === PRIVATE_BOOKMARK_CATEGORY;
}

/**
 * 判断当前访问上下文是否允许查看站点详情。
 *
 * `unlisted` 允许知道直链时访问，`admin_only` 仅管理员可访问，`private` 需要私密访问态。
 *
 * @param {SiteRecord|null|undefined} site 站点记录。
 * @param {SiteAccessOptions} [options] 访问上下文。
 * @returns {boolean}
 */
export function canAccessSite(site, { adminAuthed = false, privateUnlocked = false } = {}) {
  const visibility = normalizeVisibility(site?.visibility, site?.catelog);
  if (adminAuthed) return true;
  if (visibility === 'admin_only') return false;
  if (visibility === 'private' || cleanText(site?.catelog) === PRIVATE_BOOKMARK_CATEGORY) return privateUnlocked;
  return true;
}

/**
 * 判断站点是否可出现在公开列表 / 搜索结果中。
 *
 * 与 `canAccessSite` 的区别是：`unlisted` 不进入列表，但仍可在已知直链场景下访问。
 *
 * @param {SiteRecord|null|undefined} site 站点记录。
 * @param {SiteAccessOptions} [options] 访问上下文。
 * @returns {boolean}
 */
export function canListSite(site, { adminAuthed = false, privateUnlocked = false } = {}) {
  const visibility = normalizeVisibility(site?.visibility, site?.catelog);
  if (adminAuthed) return true;
  if (visibility === 'unlisted' || visibility === 'admin_only') return false;
  return canAccessSite(site, { adminAuthed, privateUnlocked });
}

function parseStoredTags(value) {
  if (Array.isArray(value)) return normalizeTags(value);
  const text = cleanText(value);
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return normalizeTags(parsed);
  } catch {
    // 兼容非 JSON 的逗号/空格分隔标签
  }

  return normalizeTags(text);
}

function toSafeLikePattern(value, maxLength = 48) {
  const text = cleanText(value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
  if (!text) return '';
  return `%${text.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
}

const CJK_INITIALS = {
  星: 'x', 空: 'k', 图: 't', 床: 'c', 云: 'y', 盘: 'p', 网: 'w', 资: 'z', 源: 'y', 工: 'g', 具: 'j',
  开: 'k', 发: 'f', 设: 's', 计: 'j', 素: 's', 材: 'c', 代: 'd', 码: 'm', 托: 't', 管: 'g',
  服: 'f', 务: 'w', 器: 'q', 运: 'y', 维: 'w', 博: 'b', 客: 'k', 搜: 's', 索: 's', 导: 'd',
  航: 'h', 书: 's', 签: 'q', 分: 'f', 类: 'l', 标: 'b', 私: 's', 人: 'r', 常: 'c',
  用: 'y', 站: 'z', 点: 'd', 链: 'l', 接: 'j', 文: 'w', 档: 'd', 影: 'y', 音: 'y', 视: 's',
  频: 'p', 下: 'x', 载: 'z', 上: 's', 传: 'c', 压: 'y', 缩: 's', 转: 'z', 换: 'h', 编: 'b',
  辑: 'j', 生: 's', 成: 'c', 智: 'z', 能: 'n', 大: 'd', 模: 'm', 型: 'x'
};

const PINYIN_INITIAL_BOUNDARIES = [
  ['a', '阿'], ['b', '八'], ['c', '嚓'], ['d', '咑'], ['e', '妸'], ['f', '发'],
  ['g', '旮'], ['h', '哈'], ['j', '击'], ['k', '喀'], ['l', '垃'], ['m', '妈'],
  ['n', '拿'], ['o', '哦'], ['p', '啪'], ['q', '期'], ['r', '然'], ['s', '撒'],
  ['t', '塌'], ['w', '挖'], ['x', '昔'], ['y', '压'], ['z', '匝'],
];

function normalizeSearchText(value) {
  return cleanText(value).toLowerCase();
}

function getHostParts(url) {
  const raw = cleanText(url);
  if (!raw) return [];
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    return [
      parsed.hostname.toLowerCase(),
      parsed.hostname.replace(/^www\./i, '').toLowerCase(),
      parsed.pathname.toLowerCase(),
    ].filter(Boolean);
  } catch {
    return [raw.toLowerCase()];
  }
}

function inferPinyinInitial(char) {
  if (!/[\u4e00-\u9fff]/.test(char)) return '';
  if (CJK_INITIALS[char]) return CJK_INITIALS[char];

  let initial = '';
  for (const [letter, boundary] of PINYIN_INITIAL_BOUNDARIES) {
    if (char.localeCompare(boundary, 'zh-Hans-CN') >= 0) {
      initial = letter;
    } else {
      break;
    }
  }
  return initial;
}

function getCjkInitials(value) {
  return Array.from(cleanText(value)).map((char) => inferPinyinInitial(char)).join('');
}

function getCjkNgrams(value) {
  const chars = Array.from(cleanText(value).replace(/\s+/g, '')).filter((char) => /[\u4e00-\u9fff]/.test(char));
  const grams = new Set();
  for (const size of [2, 3, 4]) {
    for (let i = 0; i + size <= chars.length; i += 1) {
      grams.add(chars.slice(i, i + size).join(''));
    }
  }
  return [...grams];
}

function parseSearchQuery(keyword) {
  let text = cleanText(keyword);
  const filters = { tags: [], categories: [], urls: [], visibility: '', health: '' };
  text = text.replace(/\b(tag|cat|category|url|is):(?:"([^"]+)"|'([^']+)'|(\S+))/gi, (match, key, quoted, singleQuoted, plain) => {
    const value = cleanText(quoted || singleQuoted || plain);
    const normalizedKey = key.toLowerCase();
    if (!value) return ' ';
    if (normalizedKey === 'tag') filters.tags.push(value);
    else if (normalizedKey === 'cat' || normalizedKey === 'category') filters.categories.push(value);
    else if (normalizedKey === 'url') filters.urls.push(value);
    else if (normalizedKey === 'is') {
      const state = value.toLowerCase();
      if (['private', 'public', 'unlisted', 'admin_only'].includes(state)) filters.visibility = state;
      if (['dead', 'bad', 'error'].includes(state)) filters.health = 'dead';
      if (['ok', 'alive'].includes(state)) filters.health = 'ok';
    }
    return ' ';
  });

  const terms = new Set();
  const phrase = cleanText(text);
  if (phrase) terms.add(phrase);
  phrase.split(/\s+/).map(cleanText).filter(Boolean).forEach((term) => terms.add(term));
  getCjkNgrams(phrase).forEach((term) => terms.add(term));

  return { raw: cleanText(keyword), terms: [...terms].slice(0, 24), filters };
}

function matchesAdvancedFilters(site, filters) {
  const tags = Array.isArray(site.tags) ? site.tags.map(normalizeSearchText) : [];
  const category = normalizeSearchText(site.catelog);
  const url = normalizeSearchText(site.url);
  const hosts = getHostParts(site.url);
  const visibility = normalizeVisibility(site.visibility, site.catelog);
  const statusCode = Number(site.last_status_code);
  const isDead = Boolean(site.last_error) || (Number.isFinite(statusCode) && (statusCode < 200 || statusCode >= 400));

  if (filters.visibility && visibility !== filters.visibility) return false;
  if (filters.health === 'dead' && !isDead) return false;
  if (filters.health === 'ok' && isDead) return false;
  if (filters.tags.length && !filters.tags.every((tag) => tags.some((item) => item.includes(normalizeSearchText(tag))))) return false;
  if (filters.categories.length && !filters.categories.every((cat) => category.includes(normalizeSearchText(cat)))) return false;
  if (filters.urls.length && !filters.urls.every((part) => {
    const normalized = normalizeSearchText(part);
    return url.includes(normalized) || hosts.some((host) => host.includes(normalized));
  })) return false;

  return true;
}

function scoreSite(site, terms) {
  const name = normalizeSearchText(site.name);
  const url = normalizeSearchText(site.url);
  const desc = normalizeSearchText(site.desc);
  const category = normalizeSearchText(site.catelog);
  const tags = Array.isArray(site.tags) ? site.tags.map(normalizeSearchText) : [];
  const tagInitials = Array.isArray(site.tags) ? site.tags.map(getCjkInitials).filter(Boolean) : [];
  const hosts = getHostParts(site.url);
  const nameInitials = getCjkInitials(site.name);
  const categoryInitials = getCjkInitials(site.catelog);

  let score = 0;
  const matchedFields = new Set();
  const matchReasons = [];

  for (const rawTerm of terms) {
    const term = normalizeSearchText(rawTerm);
    if (!term) continue;

    if (name === term) {
      score += 1000;
      matchedFields.add('name');
      matchReasons.push(`名称完全匹配：${rawTerm}`);
    } else if (name.includes(term)) {
      score += 520;
      matchedFields.add('name');
      matchReasons.push(`名称包含：${rawTerm}`);
    }

    if (nameInitials && nameInitials.includes(term)) {
      score += 420;
      matchedFields.add('name_initials');
      matchReasons.push(`名称首字母匹配：${rawTerm}`);
    }

    if (tags.some((tag) => tag === term)) {
      score += 360;
      matchedFields.add('tags');
      matchReasons.push(`标签完全匹配：${rawTerm}`);
    } else if (tags.some((tag) => tag.includes(term))) {
      score += 280;
      matchedFields.add('tags');
      matchReasons.push(`标签包含：${rawTerm}`);
    }

    if (tagInitials.some((initials) => initials.includes(term))) {
      score += 240;
      matchedFields.add('tag_initials');
      matchReasons.push(`标签首字母匹配：${rawTerm}`);
    }

    if (category === term) {
      score += 300;
      matchedFields.add('category');
      matchReasons.push(`分类完全匹配：${rawTerm}`);
    } else if (category.includes(term)) {
      score += 230;
      matchedFields.add('category');
      matchReasons.push(`分类包含：${rawTerm}`);
    }

    if (categoryInitials && categoryInitials.includes(term)) {
      score += 180;
      matchedFields.add('category_initials');
      matchReasons.push(`分类首字母匹配：${rawTerm}`);
    }

    if (hosts.some((host) => host.includes(term))) {
      score += 220;
      matchedFields.add('url');
      matchReasons.push(`域名匹配：${rawTerm}`);
    } else if (url.includes(term)) {
      score += 160;
      matchedFields.add('url');
      matchReasons.push(`URL 包含：${rawTerm}`);
    }

    if (desc.includes(term)) {
      score += 120;
      matchedFields.add('desc');
      matchReasons.push(`描述包含：${rawTerm}`);
    }
  }

  const hits = Math.min(Number(site.hits) || 0, 1000);
  score += Math.min(80, Math.log10(hits + 1) * 24);

  const updateTime = Date.parse(site.update_time || site.create_time || '');
  if (Number.isFinite(updateTime)) {
    const ageDays = Math.max(0, (Date.now() - updateTime) / 86400000);
    score += Math.max(0, 40 - Math.min(40, ageDays / 14));
  }

  return {
    score: Math.round(score * 100) / 100,
    matchedFields: [...matchedFields],
    matchReasons: [...new Set(matchReasons)].slice(0, 8),
  };
}

const SITE_SELECT_COLUMNS = `
  s.id,
  s.name,
  s.url,
  s.logo,
  s.desc,
  COALESCE(c.name, s.catelog) AS catelog,
  s.category_id,
  s.visibility,
  s.sort_order,
  s.hits,
  s.last_visit_time,
  s.last_checked_at,
  s.last_status_code,
  s.last_error,
  s.create_time,
  s.update_time
`;

async function getPrependSortOrder(env) {
  const row = await env.NAV_DB.prepare('SELECT MIN(sort_order) AS min_sort_order FROM sites').first();
  const minSortOrder = Number(row?.min_sort_order);
  if (!Number.isFinite(minSortOrder)) return 9999;
  return Math.max(-2147483648, Math.round(minSortOrder) - 10);
}

function hasExplicitSortOrder(config) {
  return config?.sort_order !== undefined && config?.sort_order !== null && config?.sort_order !== '';
}

function normalizeSitePayload(config) {
  const name = cleanText(config?.name);
  const url = cleanText(config?.url);
  const catelog = cleanText(config?.catelog || config?.category || config?.category_name);
  const logo = nullableText(config?.logo);
  const desc = nullableText(config?.desc || config?.description);
  const sort_order = normalizeSortOrder(config?.sort_order);
  const visibility = normalizeVisibility(config?.visibility, catelog);
  const tags = normalizeTags(config?.tags || config?.tag_names);

  if (!name || !url || !catelog) {
    throw new Error('Name, URL and Catelog are required');
  }

  return { name, url, logo, desc, catelog, visibility, sort_order, tags };
}

/**
 * 分页获取站点列表。
 *
 * 支持分类、标签、关键词、排序和健康状态筛选，并根据访问上下文过滤私密 / 隐藏站点。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_DB`。
 * @param {object} [options] 查询参数。
 * @param {number|string} [options.page=1] 页码，从 1 开始。
 * @param {number|string} [options.pageSize=10] 每页数量，最大 100。
 * @param {string} [options.catalog=''] 分类名称。
 * @param {string} [options.keyword=''] 关键词。
 * @param {string} [options.tag=''] 标签名称。
 * @param {string} [options.sort=''] 排序方式，`manual` 表示按手动排序。
 * @param {'ok'|'bad'|'unknown'|string} [options.health=''] 健康状态过滤。
 * @param {boolean} [options.includePrivate=true] 是否包含私密站点候选。
 * @param {boolean} [options.adminAuthed=false] 是否管理员访问。
 * @param {boolean} [options.privateUnlocked=options.includePrivate] 是否已解锁私密书签。
 * @returns {Promise<{data: SiteRecord[], total: number, page: number, pageSize: number}>}
 */
export async function getSites(env, { page = 1, pageSize = 10, catalog = '', keyword = '', tag = '', sort = '', health = '', includePrivate = true, adminAuthed = false, privateUnlocked = includePrivate } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 10));
  const offset = (safePage - 1) * safePageSize;
  const orderSql = sort === 'manual'
    ? 'ORDER BY s.sort_order ASC, datetime(s.create_time) DESC, s.id DESC'
    : 'ORDER BY datetime(s.create_time) DESC, s.id DESC';

  const where = [];
  const binds = [];

  if (tag) {
    const taggedSiteIds = await getSiteIdsByTag(env, tag);
    if (!taggedSiteIds.length) {
      return { data: [], total: 0, page: safePage, pageSize: safePageSize };
    }
    where.push(`s.id IN (${taggedSiteIds.map(() => '?').join(',')})`);
    binds.push(...taggedSiteIds);
  }

  if (catalog) {
    where.push('(c.name = ? OR (s.category_id IS NULL AND s.catelog = ?))');
    binds.push(catalog, catalog);
  }

  const likeKeyword = toSafeLikePattern(keyword);
  if (likeKeyword) {
    where.push("(s.name LIKE ? ESCAPE '\\' OR s.url LIKE ? ESCAPE '\\' OR COALESCE(c.name, s.catelog) LIKE ? ESCAPE '\\')");
    binds.push(likeKeyword, likeKeyword, likeKeyword);
  }

  const healthFilter = cleanText(health).toLowerCase();
  if (healthFilter === 'bad') {
    where.push("(s.last_error IS NOT NULL OR (s.last_status_code IS NOT NULL AND (s.last_status_code < 200 OR s.last_status_code >= 400)))");
  } else if (healthFilter === 'ok') {
    where.push("(s.last_error IS NULL AND s.last_status_code >= 200 AND s.last_status_code < 400)");
  } else if (healthFilter === 'unknown') {
    where.push("s.last_checked_at IS NULL");
  }

  if (!adminAuthed) {
    if (privateUnlocked) {
      where.push("COALESCE(s.visibility, 'public') IN ('public', 'private')");
    } else {
      where.push("COALESCE(s.visibility, 'public') = 'public' AND COALESCE(c.name, s.catelog) <> ?");
      binds.push(PRIVATE_BOOKMARK_CATEGORY);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const fromSql = 'FROM sites s LEFT JOIN categories c ON c.id = s.category_id';
  const selectSql = `SELECT ${SITE_SELECT_COLUMNS}`;
  const { results } = await env.NAV_DB.prepare(`
    ${selectSql}
    ${fromSql}
    ${whereSql}
    ${orderSql}
    LIMIT ? OFFSET ?
  `).bind(...binds, safePageSize, offset).all();

  const countResult = await env.NAV_DB.prepare(`
    SELECT COUNT(*) AS total
    ${fromSql}
    ${whereSql}
  `).bind(...binds).first();

  return {
    data: await attachTagsToSites(env, results || []),
    total: countResult?.total || 0,
    page: safePage,
    pageSize: safePageSize,
  };
}

/**
 * 获取全部站点记录，主要用于后台导出和管理视图。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_DB`。
 * @returns {Promise<SiteRecord[]>}
 */
export async function getAllSites(env) {
  const { results } = await env.NAV_DB.prepare(`
    SELECT ${SITE_SELECT_COLUMNS}
    FROM sites s
    LEFT JOIN categories c ON c.id = s.category_id
    ORDER BY s.sort_order ASC, datetime(s.create_time) DESC, s.id DESC
  `).all();
  return attachTagsToSites(env, results || []);
}

/**
 * 按 ID 获取单个站点及其标签。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_DB`。
 * @param {number|string} id 站点 ID。
 * @returns {Promise<SiteRecord|null>}
 */
export async function getSite(env, id) {
  const site = await env.NAV_DB.prepare(`
    SELECT ${SITE_SELECT_COLUMNS}
    FROM sites s
    LEFT JOIN categories c ON c.id = s.category_id
    WHERE s.id = ?
  `).bind(id).first();
  if (!site) return null;
  const [withTags] = await attachTagsToSites(env, [site]);
  return withTags;
}

/**
 * 记录一次搜索行为，用于后台搜索统计分析。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_DB`。
 * @param {string} [keyword=''] 搜索关键词。
 * @param {number|string} [resultCount=0] 本次搜索结果数量。
 * @returns {Promise<{keyword: string, resultCount: number}|null>}
 */
export async function recordSearchTerm(env, keyword = '', resultCount = 0) {
  const term = cleanText(keyword).slice(0, 80);
  if (!term) return null;
  const count = Math.max(0, Number(resultCount) || 0);
  await env.NAV_DB.prepare(`
    INSERT INTO search_terms (keyword, total_searches, total_results, last_result_count, zero_result_count, first_searched_at, last_searched_at)
    VALUES (?, 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(keyword) DO UPDATE SET
      total_searches = total_searches + 1,
      total_results = total_results + excluded.last_result_count,
      last_result_count = excluded.last_result_count,
      zero_result_count = zero_result_count + excluded.zero_result_count,
      last_searched_at = CURRENT_TIMESTAMP
  `).bind(term, count, count, count === 0 ? 1 : 0).run();
  return { keyword: term, resultCount: count };
}

export async function getSiteAnalytics(env, { limit = 20 } = {}) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));

  const [topByHits, recentlyActive, categoryHeat, totals, inactive] = await Promise.all([
    env.NAV_DB.prepare(`
      SELECT ${SITE_SELECT_COLUMNS}
      FROM sites s
      LEFT JOIN categories c ON c.id = s.category_id
      WHERE COALESCE(s.hits, 0) > 0
      ORDER BY COALESCE(s.hits, 0) DESC, datetime(COALESCE(s.last_visit_time, s.update_time, s.create_time)) DESC
      LIMIT ?
    `).bind(safeLimit).all(),
    env.NAV_DB.prepare(`
      SELECT ${SITE_SELECT_COLUMNS}
      FROM sites s
      LEFT JOIN categories c ON c.id = s.category_id
      WHERE s.last_visit_time IS NOT NULL
      ORDER BY datetime(s.last_visit_time) DESC
      LIMIT ?
    `).bind(safeLimit).all(),
    env.NAV_DB.prepare(`
      SELECT
        COALESCE(c.name, s.catelog, '未分类') AS catelog,
        COUNT(*) AS site_count,
        SUM(COALESCE(s.hits, 0)) AS total_hits,
        AVG(COALESCE(s.hits, 0)) AS avg_hits,
        MAX(datetime(s.last_visit_time)) AS last_visit_time
      FROM sites s
      LEFT JOIN categories c ON c.id = s.category_id
      GROUP BY catelog
      ORDER BY total_hits DESC, site_count DESC
      LIMIT ?
    `).bind(safeLimit).all(),
    env.NAV_DB.prepare(`
      SELECT
        COUNT(*) AS total_sites,
        SUM(COALESCE(hits, 0)) AS total_hits,
        SUM(CASE WHEN last_visit_time IS NULL THEN 1 ELSE 0 END) AS never_visited,
        SUM(CASE WHEN datetime(last_visit_time) < datetime('now', '-30 days') THEN 1 ELSE 0 END) AS stale_30d
      FROM sites
    `).first(),
    env.NAV_DB.prepare(`
      SELECT ${SITE_SELECT_COLUMNS}
      FROM sites s
      LEFT JOIN categories c ON c.id = s.category_id
      WHERE s.last_visit_time IS NULL OR datetime(s.last_visit_time) < datetime('now', '-60 days')
      ORDER BY
        CASE WHEN s.last_visit_time IS NULL THEN 0 ELSE 1 END ASC,
        datetime(COALESCE(s.last_visit_time, '1970-01-01 00:00:00')) ASC,
        s.id ASC
      LIMIT ?
    `).bind(safeLimit).all(),
  ]);

  const topByHitsWithTags = await attachTagsToSites(env, topByHits.results || []);
  const recentlyActiveWithTags = await attachTagsToSites(env, recentlyActive.results || []);
  const inactiveWithTags = await attachTagsToSites(env, inactive.results || []);

  return {
    summary: {
      totalSites: Number(totals?.total_sites) || 0,
      totalHits: Number(totals?.total_hits) || 0,
      neverVisited: Number(totals?.never_visited) || 0,
      staleOver30Days: Number(totals?.stale_30d) || 0,
    },
    topByHits: topByHitsWithTags.map((site) => ({
      id: site.id, name: site.name, url: site.url, logo: site.logo,
      catelog: site.catelog, hits: Number(site.hits) || 0, last_visit_time: site.last_visit_time,
    })),
    recentlyActive: recentlyActiveWithTags.map((site) => ({
      id: site.id, name: site.name, url: site.url, logo: site.logo,
      catelog: site.catelog, hits: Number(site.hits) || 0, last_visit_time: site.last_visit_time,
    })),
    categoryHeat: (categoryHeat.results || []).map((row) => ({
      catelog: row.catelog || '未分类',
      siteCount: Number(row.site_count) || 0,
      totalHits: Number(row.total_hits) || 0,
      avgHits: Number((Number(row.avg_hits) || 0).toFixed(1)),
      lastVisitTime: row.last_visit_time,
    })),
    inactiveSites: inactiveWithTags.map((site) => ({
      id: site.id, name: site.name, url: site.url, logo: site.logo,
      catelog: site.catelog, hits: Number(site.hits) || 0, last_visit_time: site.last_visit_time,
    })),
  };
}

export async function getSearchAnalytics(env, { limit = 20 } = {}) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const [popular, zeroResults, recent] = await Promise.all([
    env.NAV_DB.prepare(`
      SELECT keyword, total_searches, total_results, last_result_count, zero_result_count, first_searched_at, last_searched_at
      FROM search_terms
      ORDER BY total_searches DESC, last_searched_at DESC
      LIMIT ?
    `).bind(safeLimit).all(),
    env.NAV_DB.prepare(`
      SELECT keyword, total_searches, total_results, last_result_count, zero_result_count, first_searched_at, last_searched_at
      FROM search_terms
      WHERE zero_result_count > 0
      ORDER BY zero_result_count DESC, last_searched_at DESC
      LIMIT ?
    `).bind(safeLimit).all(),
    env.NAV_DB.prepare(`
      SELECT keyword, total_searches, total_results, last_result_count, zero_result_count, first_searched_at, last_searched_at
      FROM search_terms
      ORDER BY datetime(last_searched_at) DESC
      LIMIT ?
    `).bind(safeLimit).all(),
  ]);
  const mapRow = (row) => ({
    keyword: row.keyword,
    totalSearches: Number(row.total_searches) || 0,
    totalResults: Number(row.total_results) || 0,
    lastResultCount: Number(row.last_result_count) || 0,
    zeroResultCount: Number(row.zero_result_count) || 0,
    firstSearchedAt: row.first_searched_at,
    lastSearchedAt: row.last_searched_at,
  });
  return {
    popular: (popular.results || []).map(mapRow),
    zeroResults: (zeroResults.results || []).map(mapRow),
    recent: (recent.results || []).map(mapRow),
  };
}

/**
 * 执行高级站点搜索。
 *
 * 支持普通关键词、中文 n-gram、首字母召回，以及 `tag:`、`cat:` / `category:`、`url:`、`is:` 等高级过滤语法。
 * 返回结果会附加 `_score`、`_matchedFields`、`_matchReasons` 字段用于解释排序原因。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_DB`。
 * @param {object} [options] 搜索参数。
 * @param {string} [options.keyword=''] 搜索关键词或高级搜索表达式。
 * @param {number|string} [options.limit=50] 最大返回数量，最大 100。
 * @param {boolean} [options.includePrivate=false] 是否包含私密站点候选。
 * @param {boolean} [options.adminAuthed=false] 是否管理员访问。
 * @param {boolean} [options.privateUnlocked=options.includePrivate] 是否已解锁私密书签。
 * @returns {Promise<Array<SiteRecord & {_score: number, _matchedFields: string[], _matchReasons: string[]}>>}
 */
export async function searchSites(env, { keyword = '', limit = 50, includePrivate = false, adminAuthed = false, privateUnlocked = includePrivate } = {}) {
  const query = parseSearchQuery(keyword);
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
  if (!query.raw && !query.terms.length && !Object.values(query.filters).some((value) => Array.isArray(value) ? value.length : value)) return [];

  const where = [];
  const binds = [];
  const likeTerms = [...new Set([
    ...query.terms,
    ...query.filters.tags,
    ...query.filters.categories,
    ...query.filters.urls,
  ])].map((term) => toSafeLikePattern(term)).filter(Boolean).slice(0, 24);

  if (likeTerms.length) {
    const termClauses = [];
    for (const likeTerm of likeTerms) {
      termClauses.push(`(
        s.name LIKE ? ESCAPE '\\'
        OR s.url LIKE ? ESCAPE '\\'
        OR COALESCE(s.desc, '') LIKE ? ESCAPE '\\'
        OR COALESCE(c.name, s.catelog) LIKE ? ESCAPE '\\'
        OR t.name LIKE ? ESCAPE '\\'
      )`);
      binds.push(likeTerm, likeTerm, likeTerm, likeTerm, likeTerm);
    }
    where.push(`(${termClauses.join(' OR ')})`);
  }

  if (query.filters.visibility) {
    where.push("COALESCE(s.visibility, 'public') = ?");
    binds.push(query.filters.visibility);
  }

  if (query.filters.health === 'dead') {
    where.push("(s.last_error IS NOT NULL OR (s.last_status_code IS NOT NULL AND (s.last_status_code < 200 OR s.last_status_code >= 400)))");
  } else if (query.filters.health === 'ok') {
    where.push("(s.last_error IS NULL AND s.last_status_code >= 200 AND s.last_status_code < 400)");
  }

  if (!adminAuthed) {
    if (privateUnlocked) {
      where.push("COALESCE(s.visibility, 'public') IN ('public', 'private')");
    } else {
      where.push("COALESCE(s.visibility, 'public') = 'public' AND COALESCE(c.name, s.catelog) <> ?");
      binds.push(PRIVATE_BOOKMARK_CATEGORY);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const candidateLimit = Math.max(safeLimit * 6, 80);
  const { results } = await env.NAV_DB.prepare(`
    SELECT DISTINCT ${SITE_SELECT_COLUMNS}
    FROM sites s
    LEFT JOIN categories c ON c.id = s.category_id
    LEFT JOIN site_tags st ON st.site_id = s.id
    LEFT JOIN tags t ON t.id = st.tag_id
    ${whereSql}
    ORDER BY datetime(s.update_time) DESC, datetime(s.create_time) DESC
    LIMIT ?
  `).bind(...binds, candidateLimit).all();

  let candidateRows = results || [];
  const needsBroadRecall = candidateRows.length < safeLimit && query.terms.some((term) => /^[a-z0-9]{2,16}$/i.test(term));
  if (needsBroadRecall) {
    const fallbackWhere = [];
    const fallbackBinds = [];

    if (query.filters.visibility) {
      fallbackWhere.push("COALESCE(s.visibility, 'public') = ?");
      fallbackBinds.push(query.filters.visibility);
    }

    if (query.filters.health === 'dead') {
      fallbackWhere.push("(s.last_error IS NOT NULL OR (s.last_status_code IS NOT NULL AND (s.last_status_code < 200 OR s.last_status_code >= 400)))");
    } else if (query.filters.health === 'ok') {
      fallbackWhere.push("(s.last_error IS NULL AND s.last_status_code >= 200 AND s.last_status_code < 400)");
    }

    if (!adminAuthed) {
      if (privateUnlocked) {
        fallbackWhere.push("COALESCE(s.visibility, 'public') IN ('public', 'private')");
      } else {
        fallbackWhere.push("COALESCE(s.visibility, 'public') = 'public' AND COALESCE(c.name, s.catelog) <> ?");
        fallbackBinds.push(PRIVATE_BOOKMARK_CATEGORY);
      }
    }

    const fallbackWhereSql = fallbackWhere.length ? `WHERE ${fallbackWhere.join(' AND ')}` : '';
    const { results: fallbackResults } = await env.NAV_DB.prepare(`
      SELECT ${SITE_SELECT_COLUMNS}
      FROM sites s
      LEFT JOIN categories c ON c.id = s.category_id
      ${fallbackWhereSql}
      ORDER BY COALESCE(s.hits, 0) DESC, datetime(s.update_time) DESC, datetime(s.create_time) DESC
      LIMIT 500
    `).bind(...fallbackBinds).all();
    const seen = new Set(candidateRows.map((site) => site.id));
    for (const site of fallbackResults || []) {
      if (!seen.has(site.id)) {
        candidateRows.push(site);
        seen.add(site.id);
      }
    }
  }

  const withTags = await attachTagsToSites(env, candidateRows);
  return withTags
    .filter((site) => matchesAdvancedFilters(site, query.filters))
    .map((site) => {
      const scored = scoreSite(site, query.terms.length ? query.terms : [query.raw]);
      return {
        ...site,
        _score: scored.score,
        _matchedFields: scored.matchedFields,
        _matchReasons: scored.matchReasons,
      };
    })
    .filter((site) => site._matchedFields.length > 0 || !query.terms.length)
    .sort((a, b) => {
      const scoreDiff = (Number(b._score) || 0) - (Number(a._score) || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const hitsDiff = (Number(b.hits) || 0) - (Number(a.hits) || 0);
      if (hitsDiff !== 0) return hitsDiff;
      return String(b.update_time || b.create_time || '').localeCompare(String(a.update_time || a.create_time || ''));
    })
    .slice(0, safeLimit);
}

function normalizeCheckUrl(value) {
  const text = cleanText(value);
  if (!text) return '';
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

export async function checkSiteHealth(env, id) {
  const siteId = Number(id);
  if (!Number.isInteger(siteId) || siteId <= 0) throw new Error('Invalid site id');

  const site = await getSite(env, siteId);
  if (!site) throw new Error('Site not found');

  const targetUrl = normalizeCheckUrl(site.url);
  let statusCode = null;
  let error = '';

  if (!targetUrl) {
    error = 'URL is empty';
  } else {
    try {
      new URL(targetUrl);
      let response;
      try {
        response = await fetch(targetUrl, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'StarNav-LinkChecker/1.0' },
        });
      } catch (headError) {
        response = await fetch(targetUrl, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(10000),
          headers: { 'User-Agent': 'StarNav-LinkChecker/1.0' },
        });
      }
      statusCode = response.status;
      error = response.ok ? '' : `HTTP ${response.status}`;
    } catch (checkError) {
      error = checkError?.message || 'Check failed';
    }
  }

  await env.NAV_DB.prepare(`
    UPDATE sites
    SET last_checked_at = CURRENT_TIMESTAMP,
        last_status_code = ?,
        last_error = ?,
        update_time = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(statusCode, error || null, siteId).run();

  return {
    id: siteId,
    ok: Boolean(statusCode && statusCode >= 200 && statusCode < 400 && !error),
    status_code: statusCode,
    error,
    checked_at: new Date().toISOString(),
  };
}

export async function bulkCheckSiteHealth(env, ids) {
  const siteIds = normalizeIdList(ids).slice(0, 30);
  if (!siteIds.length) throw new Error('ids must be a non-empty array');

  const results = [];
  for (const siteId of siteIds) {
    results.push(await checkSiteHealth(env, siteId));
  }

  return {
    checked: results.length,
    ok: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}

export async function runScheduledHealthCheck(env, { limit = 30 } = {}) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 30));
  const { results: rows } = await env.NAV_DB.prepare(`
    SELECT id
    FROM sites
    ORDER BY
      CASE WHEN last_checked_at IS NULL THEN 0 ELSE 1 END ASC,
      datetime(COALESCE(last_checked_at, '1970-01-01 00:00:00')) ASC,
      id ASC
    LIMIT ?
  `).bind(safeLimit).all();
  const ids = (rows || []).map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0);
  if (!ids.length) {
    return { checked: 0, ok: 0, failed: 0, results: [] };
  }
  return bulkCheckSiteHealth(env, ids);
}

export async function bulkRefreshSiteFavicons(env, ids) {
  const siteIds = normalizeIdList(ids).slice(0, 30);
  if (!siteIds.length) throw new Error('ids must be a non-empty array');

  const placeholders = siteIds.map(() => '?').join(',');
  const { results: sites } = await env.NAV_DB.prepare(`
    SELECT id, name, url, logo
    FROM sites
    WHERE id IN (${placeholders})
  `).bind(...siteIds).all();

  const siteMap = new Map((sites || []).map((site) => [Number(site.id), site]));
  const results = [];

  for (const siteId of siteIds) {
    const site = siteMap.get(siteId);
    if (!site) {
      results.push({ id: siteId, ok: false, favicon: '', error: 'Site not found' });
      continue;
    }

    try {
      const favicon = await getFavicon(site.url);
      if (!favicon) {
        results.push({ id: siteId, name: site.name, ok: false, favicon: '', error: 'No favicon found' });
        continue;
      }

      await env.NAV_DB.prepare(`
        UPDATE sites
        SET logo = ?, update_time = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(favicon, siteId).run();

      results.push({ id: siteId, name: site.name, ok: true, favicon, previous: site.logo || '' });
    } catch (error) {
      results.push({ id: siteId, name: site?.name || '', ok: false, favicon: '', error: error?.message || 'Refresh failed' });
    }
  }

  return {
    refreshed: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    total: results.length,
    results,
  };
}

export async function incrementSiteHits(env, id) {
  return env.NAV_DB.prepare(`
    UPDATE sites
    SET hits = COALESCE(hits, 0) + 1,
        last_visit_time = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(id).run();
}

function buildDuplicateError(duplicate, scope = 'site') {
  const summary = duplicate?.name ? `${duplicate.name}（${duplicate.url}）` : duplicate?.url || '';
  const error = new Error(`Duplicate URL: 已存在书签 #${duplicate?.id} ${summary}`);
  error.code = 'DUPLICATE_URL';
  error.scope = scope;
  error.duplicate = duplicate;
  return error;
}

/**
 * 创建书签站点。
 *
 * 默认会进行 URL 去重校验；当 `force=true` 时允许跳过重复检查，供管理员确认覆盖风险后使用。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_DB`。
 * @param {SitePayload} config 站点创建参数。
 * @param {object} [options] 创建选项。
 * @param {boolean} [options.force=false] 是否强制创建并跳过重复 URL 校验。
 * @returns {Promise<object>} D1 写入结果。
 * @throws {Error} 当必填字段缺失或 URL 重复时抛出错误。
 */
export async function createSite(env, config, { force = false } = {}) {
  const site = normalizeSitePayload(config);
  if (!force) {
    const duplicate = await findDuplicateSite(env, site.url);
    if (duplicate) throw buildDuplicateError(duplicate, 'create');
  }
  if (!hasExplicitSortOrder(config)) {
    site.sort_order = await getPrependSortOrder(env);
  }
  const category = await upsertCategoryByName(env, site.catelog, site.sort_order);

  const result = await env.NAV_DB.prepare(`
    INSERT INTO sites (name, url, logo, desc, catelog, category_id, visibility, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(site.name, site.url, site.logo, site.desc, site.catelog, category?.id || null, site.visibility, site.sort_order).run();

  const siteId = result?.meta?.last_row_id;
  if (siteId) await setSiteTags(env, siteId, site.tags);

  return result;
}

/**
 * 更新书签站点。
 *
 * 会保留未显式传入的可见性和排序值，并默认校验 URL 是否与其他站点重复。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_DB`。
 * @param {number|string} id 站点 ID。
 * @param {SitePayload} config 站点更新参数。
 * @param {object} [options] 更新选项。
 * @param {boolean} [options.force=false] 是否强制更新并跳过重复 URL 校验。
 * @returns {Promise<object>} D1 更新结果。
 * @throws {Error} 当站点不存在、必填字段缺失或 URL 重复时抛出错误。
 */
export async function updateSite(env, id, config, { force = false } = {}) {
  const existing = await getSite(env, id);
  if (!existing) throw new Error('Site not found');
  const site = normalizeSitePayload({
    ...config,
    visibility: config?.visibility ?? existing.visibility,
    sort_order: hasExplicitSortOrder(config) ? config.sort_order : existing.sort_order,
  });
  if (!force) {
    const duplicate = await findDuplicateSite(env, site.url, { excludeId: id });
    if (duplicate) throw buildDuplicateError(duplicate, 'update');
  }
  const category = await upsertCategoryByName(env, site.catelog, site.sort_order);

  const result = await env.NAV_DB.prepare(`
    UPDATE sites
    SET name = ?, url = ?, logo = ?, desc = ?, catelog = ?, category_id = ?, visibility = ?, sort_order = ?, update_time = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(site.name, site.url, site.logo, site.desc, site.catelog, category?.id || null, site.visibility, site.sort_order, id).run();

  await setSiteTags(env, id, site.tags);

  return result;
}

/**
 * 删除书签站点及其标签关联。
 *
 * @param {object} env Cloudflare Workers 环境绑定，需包含 `NAV_DB`。
 * @param {number|string} id 站点 ID。
 * @returns {Promise<object>} D1 删除结果。
 */
export async function deleteSite(env, id) {
  await env.NAV_DB.prepare('DELETE FROM site_tags WHERE site_id = ?').bind(id).run();
  return env.NAV_DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
}

function normalizeIdList(ids) {
  const list = Array.isArray(ids) ? ids : [];
  return [...new Set(list.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
}

export async function bulkDeleteSites(env, ids) {
  const siteIds = normalizeIdList(ids);
  if (!siteIds.length) throw new Error('ids must be a non-empty array');

  const placeholders = siteIds.map(() => '?').join(',');
  await env.NAV_DB.prepare(`DELETE FROM site_tags WHERE site_id IN (${placeholders})`).bind(...siteIds).run();
  return env.NAV_DB.prepare(`DELETE FROM sites WHERE id IN (${placeholders})`).bind(...siteIds).run();
}

export async function bulkUpdateSites(env, { ids = [], catelog, tags, mode = 'replace', visibility } = {}) {
  const siteIds = normalizeIdList(ids);
  if (!siteIds.length) throw new Error('ids must be a non-empty array');

  const updates = [];
  const binds = [];
  const category = cleanText(catelog);
  const normalizedVisibility = visibility !== undefined && visibility !== null && visibility !== '' ? normalizeVisibility(visibility) : '';
  const hasTags = tags !== undefined && tags !== null;
  const tagList = hasTags ? normalizeTags(tags) : [];

  if (category) {
    const categoryRecord = await upsertCategoryByName(env, category, 9999);
    updates.push('catelog = ?');
    binds.push(category);
    updates.push('category_id = ?');
    binds.push(categoryRecord?.id || null);
  }

  if (normalizedVisibility) {
    updates.push('visibility = ?');
    binds.push(normalizedVisibility);
  }

  if (updates.length) {
    const placeholders = siteIds.map(() => '?').join(',');
    await env.NAV_DB.prepare(`
      UPDATE sites
      SET ${updates.join(', ')}, update_time = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `).bind(...binds, ...siteIds).run();
  }

  if (hasTags) {
    for (const siteId of siteIds) {
      if (mode === 'append') {
        const [site] = await attachTagsToSites(env, [{ id: siteId }]);
        await setSiteTags(env, siteId, normalizeTags([...(site?.tags || []), ...tagList]));
      } else {
        await setSiteTags(env, siteId, tagList);
      }
    }
  }

  if (!updates.length && !hasTags) throw new Error('No bulk update fields provided');

  return { updated: siteIds.length };
}

export async function submitSite(env, config) {
  const site = normalizeSitePayload(config);
  const reason = cleanText(config?.reason).slice(0, 500) || null;
  const duplicate = await findDuplicateSite(env, site.url);
  if (duplicate) throw buildDuplicateError(duplicate, 'submit');

  return env.NAV_DB.prepare(`
    INSERT INTO pending_sites (name, url, logo, desc, catelog, tags, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(site.name, site.url, site.logo, site.desc, site.catelog, JSON.stringify(site.tags), reason).run();
}

export async function getPendingSites(env, { page = 1, pageSize = 10, status = '' } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 10));
  const offset = (safePage - 1) * safePageSize;
  const safeStatus = ['pending', 'approved', 'rejected'].includes(String(status || '').toLowerCase())
    ? String(status).toLowerCase()
    : 'pending';

  const { results } = await env.NAV_DB.prepare(`
    SELECT * FROM pending_sites
    WHERE COALESCE(status, 'pending') = ?
    ORDER BY datetime(COALESCE(reviewed_at, create_time)) DESC, id DESC
    LIMIT ? OFFSET ?
  `).bind(safeStatus, safePageSize, offset).all();

  const countResult = await env.NAV_DB.prepare(`
    SELECT COUNT(*) AS total FROM pending_sites WHERE COALESCE(status, 'pending') = ?
  `).bind(safeStatus).first();

  const stats = await env.NAV_DB.prepare(`
    SELECT
      SUM(CASE WHEN COALESCE(status, 'pending') = 'pending' THEN 1 ELSE 0 END) AS pending_count,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
    FROM pending_sites
  `).first();

  return {
    data: (results || []).map((site) => ({ ...site, tags: parseStoredTags(site.tags) })),
    total: countResult?.total || 0,
    page: safePage,
    pageSize: safePageSize,
    status: safeStatus,
    stats: {
      pending: Number(stats?.pending_count) || 0,
      approved: Number(stats?.approved_count) || 0,
      rejected: Number(stats?.rejected_count) || 0,
    },
  };
}

export async function getSubmissionAnalytics(env, { days = 30 } = {}) {
  const safeDays = Math.max(7, Math.min(180, Number(days) || 30));
  const sinceModifier = `-${safeDays - 1} days`;
  const previousStartModifier = `-${safeDays * 2 - 1} days`;
  const previousEndModifier = `-${safeDays} days`;
  const submissionEventsSql = `
    SELECT id, name, url, logo, desc, catelog, create_time, 'pending' AS source
    FROM pending_sites
    UNION ALL
    SELECT id, name, url, logo, desc, catelog, create_time, 'admin' AS source
    FROM sites
  `;

  const totalResult = await env.NAV_DB.prepare('SELECT COUNT(*) AS total FROM pending_sites').first();
  const recentResult = await env.NAV_DB.prepare(`
    SELECT COUNT(*) AS total
    FROM (${submissionEventsSql}) submissions
    WHERE datetime(create_time) >= datetime('now', ?)
  `).bind(sinceModifier).first();

  const previousResult = await env.NAV_DB.prepare(`
    SELECT COUNT(*) AS total
    FROM (${submissionEventsSql}) submissions
    WHERE datetime(create_time) >= datetime('now', ?)
      AND datetime(create_time) < datetime('now', ?)
  `).bind(previousStartModifier, previousEndModifier).first();

  const qualityResult = await env.NAV_DB.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN COALESCE(TRIM(logo), '') <> '' THEN 1 ELSE 0 END) AS with_logo,
      SUM(CASE WHEN COALESCE(TRIM(desc), '') <> '' THEN 1 ELSE 0 END) AS with_desc,
      SUM(CASE WHEN COALESCE(TRIM(catelog), '') <> '' THEN 1 ELSE 0 END) AS with_category,
      COUNT(DISTINCT LOWER(TRIM(url))) AS unique_urls
    FROM (${submissionEventsSql}) submissions
    WHERE datetime(create_time) >= datetime('now', ?)
  `).bind(sinceModifier).first();

  const { results: dailyRows } = await env.NAV_DB.prepare(`
    SELECT date(create_time) AS day, COUNT(*) AS total
    FROM (${submissionEventsSql}) submissions
    WHERE datetime(create_time) >= datetime('now', ?)
    GROUP BY day
    ORDER BY day ASC
  `).bind(sinceModifier).all();

  const { results: heatmapRows } = await env.NAV_DB.prepare(`
    SELECT
      CAST(strftime('%w', create_time) AS INTEGER) AS weekday,
      CAST(strftime('%H', create_time) AS INTEGER) AS hour,
      COUNT(*) AS total
    FROM (${submissionEventsSql}) submissions
    WHERE datetime(create_time) >= datetime('now', ?)
    GROUP BY weekday, hour
    ORDER BY weekday ASC, hour ASC
  `).bind(sinceModifier).all();

  const { results: categoryRows } = await env.NAV_DB.prepare(`
    SELECT catelog, COUNT(*) AS total
    FROM (${submissionEventsSql}) submissions
    WHERE datetime(create_time) >= datetime('now', ?)
    GROUP BY catelog
    ORDER BY total DESC, catelog ASC
    LIMIT 8
  `).bind(sinceModifier).all();

  const { results: latestRows } = await env.NAV_DB.prepare(`
    SELECT id, name, url, logo, catelog, create_time, source
    FROM (${submissionEventsSql}) submissions
    ORDER BY datetime(create_time) DESC, id DESC
    LIMIT 8
  `).all();

  const { results: domainRows } = await env.NAV_DB.prepare(`
    SELECT url
    FROM (${submissionEventsSql}) submissions
    WHERE datetime(create_time) >= datetime('now', ?)
  `).bind(sinceModifier).all();

  const dailyMap = new Map((dailyRows || []).map((row) => [row.day, Number(row.total) || 0]));
  const daily = [];
  const now = new Date();
  for (let i = safeDays - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    daily.push({ day: key, total: dailyMap.get(key) || 0 });
  }

  const heatmap = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    hours: Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0 })),
  }));
  for (const row of heatmapRows || []) {
    const weekday = Number(row.weekday);
    const hour = Number(row.hour);
    if (weekday >= 0 && weekday < 7 && hour >= 0 && hour < 24) {
      heatmap[weekday].hours[hour].total = Number(row.total) || 0;
    }
  }

  const peakCell = (heatmapRows || []).reduce((best, row) => {
    const total = Number(row.total) || 0;
    return total > best.total ? { weekday: Number(row.weekday), hour: Number(row.hour), total } : best;
  }, { weekday: null, hour: null, total: 0 });

  const maxDaily = daily.reduce((max, item) => Math.max(max, item.total), 0);
  const maxHeat = (heatmapRows || []).reduce((max, item) => Math.max(max, Number(item.total) || 0), 0);
  const recentTotal = Number(recentResult?.total) || 0;
  const previousTotal = Number(previousResult?.total) || 0;
  const totalPending = Number(totalResult?.total) || 0;
  const avgPerDay = safeDays ? Number((recentTotal / safeDays).toFixed(1)) : 0;
  const previousAvgPerDay = safeDays ? Number((previousTotal / safeDays).toFixed(1)) : 0;
  const changeRate = previousTotal ? Number((((recentTotal - previousTotal) / previousTotal) * 100).toFixed(1)) : (recentTotal ? 100 : 0);
  const activeDays = daily.filter((item) => item.total > 0).length;
  const dailyAverage = recentTotal / Math.max(1, safeDays);
  const anomalies = daily
    .filter((item) => item.total > 0 && item.total >= Math.max(3, dailyAverage * 2.5))
    .map((item) => ({ ...item, ratio: Number((item.total / Math.max(1, dailyAverage)).toFixed(1)) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const qTotal = Number(qualityResult?.total) || 0;
  const withLogo = Number(qualityResult?.with_logo) || 0;
  const withDesc = Number(qualityResult?.with_desc) || 0;
  const withCategory = Number(qualityResult?.with_category) || 0;
  const uniqueUrls = Number(qualityResult?.unique_urls) || 0;
  const duplicateUrls = Math.max(0, qTotal - uniqueUrls);
  const pct = (value) => qTotal ? Number(((value / qTotal) * 100).toFixed(1)) : 0;
  const quality = {
    total: qTotal,
    logoRate: pct(withLogo),
    descRate: pct(withDesc),
    categoryRate: pct(withCategory),
    duplicateRate: pct(duplicateUrls),
    completenessScore: qTotal ? Math.round((pct(withLogo) + pct(withDesc) + pct(withCategory) + Math.max(0, 100 - pct(duplicateUrls))) / 4) : 0,
    missingLogo: Math.max(0, qTotal - withLogo),
    missingDesc: Math.max(0, qTotal - withDesc),
    duplicateUrls,
  };

  const domainMap = new Map();
  for (const row of domainRows || []) {
    const raw = cleanText(row.url);
    if (!raw) continue;
    try {
      const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
      if (host) domainMap.set(host, (domainMap.get(host) || 0) + 1);
    } catch {
      domainMap.set('无效或非标准 URL', (domainMap.get('无效或非标准 URL') || 0) + 1);
    }
  }
  const domains = [...domainMap.entries()]
    .map(([domain, total]) => ({ domain, total }))
    .sort((a, b) => b.total - a.total || a.domain.localeCompare(b.domain))
    .slice(0, 8);

  const categories = (categoryRows || []).map((row) => ({ catelog: row.catelog || '未分类', total: Number(row.total) || 0 }));
  const topCategory = categories[0];
  const categoryConcentration = topCategory && recentTotal ? Number(((topCategory.total / recentTotal) * 100).toFixed(1)) : 0;
  const pressureScore = Math.min(100, Math.round(
    totalPending * 4 +
    avgPerDay * 12 +
    maxHeat * 8 +
    (activeDays / Math.max(1, safeDays)) * 20 +
    Math.max(0, 100 - quality.completenessScore) * 0.25
  ));
  const pressureLevel = pressureScore >= 80 ? '高压' : pressureScore >= 55 ? '偏高' : pressureScore >= 30 ? '正常' : '低';

  const reviewWindow = peakCell.total
    ? {
        weekday: peakCell.weekday,
        hour: (peakCell.hour + 1) % 24,
        label: `建议在提交高峰后 1 小时集中审核：周${['日', '一', '二', '三', '四', '五', '六'][peakCell.weekday]} ${String((peakCell.hour + 1) % 24).padStart(2, '0')}:00 后`,
        reason: `当前峰值为 ${String(peakCell.hour).padStart(2, '0')}:00，峰值后处理通常能减少积压。`,
      }
    : {
        weekday: null,
        hour: null,
        label: '暂无明确高峰，建议保持每日固定时段审核。',
        reason: '当前周期提交量较少，暂未形成稳定提交窗口。',
      };

  const calendar = daily.map((item) => ({
    ...item,
    level: item.total === 0 ? 0 : item.total >= maxDaily * 0.75 ? 4 : item.total >= maxDaily * 0.5 ? 3 : item.total >= maxDaily * 0.25 ? 2 : 1,
  }));

  return {
    rangeDays: safeDays,
    summary: {
      totalPending,
      recentSubmissions: recentTotal,
      previousSubmissions: previousTotal,
      changeRate,
      avgPerDay,
      previousAvgPerDay,
      activeDays,
      peakCell,
      maxDaily,
      maxHeat,
      pressureScore,
      pressureLevel,
      categoryConcentration,
    },
    quality,
    reviewWindow,
    anomalies,
    daily,
    calendar,
    heatmap,
    categories,
    domains,
    latest: (latestRows || []).map((row) => ({ ...row })),
  };
}

export async function approvePendingSite(env, id, { force = false } = {}) {
  const config = await env.NAV_DB.prepare('SELECT * FROM pending_sites WHERE id = ?').bind(id).first();
  if (!config) throw new Error('Pending config not found');
  if (config.status === 'approved') throw new Error('This submission has already been approved');

  if (!force) {
    const duplicate = await findDuplicateSite(env, config.url);
    if (duplicate) throw buildDuplicateError(duplicate, 'approve');
  }

  const sortOrder = await getPrependSortOrder(env);
  const category = await upsertCategoryByName(env, config.catelog, sortOrder);

  const visibility = normalizeVisibility(config.visibility, config.catelog);
  const result = await env.NAV_DB.prepare(`
    INSERT INTO sites (name, url, logo, desc, catelog, category_id, visibility, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(config.name, config.url, config.logo, config.desc, config.catelog, category?.id || null, visibility, sortOrder).run();

  const siteId = result?.meta?.last_row_id;
  if (siteId) await setSiteTags(env, siteId, parseStoredTags(config.tags));

  await env.NAV_DB.prepare(`
    UPDATE pending_sites SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(id).run();
}

export async function rejectPendingSite(env, id, { reason = '' } = {}) {
  const config = await env.NAV_DB.prepare('SELECT * FROM pending_sites WHERE id = ?').bind(id).first();
  if (!config) throw new Error('Pending config not found');

  const rejectReason = cleanText(reason).slice(0, 200) || null;
  await env.NAV_DB.prepare(`
    UPDATE pending_sites SET status = 'rejected', reject_reason = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(rejectReason, id).run();
}

export function normalizeImportPayload(jsonData) {
  if (Array.isArray(jsonData)) {
    return { sites: jsonData, categories: [] };
  }

  if (jsonData && typeof jsonData === 'object') {
    if (Array.isArray(jsonData.sites)) {
      return {
        sites: jsonData.sites,
        categories: Array.isArray(jsonData.categories) ? jsonData.categories : [],
      };
    }

    if (Array.isArray(jsonData.data)) {
      return { sites: jsonData.data, categories: Array.isArray(jsonData.categories) ? jsonData.categories : [] };
    }
  }

  throw new Error('Invalid JSON data. Must be an array, { data: [...] }, or { sites: [...], categories: [...] }.');
}

export function normalizeDuplicateUrlKey(value) {
  const raw = cleanText(value);
  if (!raw) return '';
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const path = parsed.pathname.replace(/\/+$/g, '') || '/';
    const search = parsed.search;
    return `${host}${path}${search}`.toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/g, '').toLowerCase();
  }
}

async function getExistingUrlKeySet(env) {
  const { results } = await env.NAV_DB.prepare('SELECT url FROM sites').all();
  return new Set((results || []).map((row) => normalizeDuplicateUrlKey(row.url)).filter(Boolean));
}

export async function findDuplicateSite(env, url, { excludeId = null } = {}) {
  const key = normalizeDuplicateUrlKey(url);
  if (!key) return null;
  const { results } = await env.NAV_DB.prepare('SELECT id, name, url, catelog FROM sites').all();
  for (const row of results || []) {
    if (excludeId && Number(row.id) === Number(excludeId)) continue;
    if (normalizeDuplicateUrlKey(row.url) === key) {
      return { id: row.id, name: row.name, url: row.url, catelog: row.catelog };
    }
  }
  return null;
}

export async function previewImportSites(env, jsonData, { mode = 'merge' } = {}) {
  const { sites, categories } = normalizeImportPayload(jsonData);
  const overwrite = cleanText(mode).toLowerCase() === 'overwrite';
  const existingKeys = overwrite ? new Set() : await getExistingUrlKeySet(env);
  const seenKeys = new Set();
  const categoryNames = new Set();
  const missingCategories = new Set();
  const samples = { valid: [], invalid: [], duplicateExisting: [], duplicateInFile: [] };
  let validSites = 0;
  let invalidSites = 0;
  let duplicateExisting = 0;
  let duplicateInFile = 0;

  for (const item of sites) {
    try {
      const site = normalizeSitePayload(item);
      const key = normalizeDuplicateUrlKey(site.url);
      categoryNames.add(site.catelog);
      if (existingKeys.has(key)) {
        duplicateExisting += 1;
        if (samples.duplicateExisting.length < 5) samples.duplicateExisting.push({ name: site.name, url: site.url, catelog: site.catelog });
        continue;
      }
      if (seenKeys.has(key)) {
        duplicateInFile += 1;
        if (samples.duplicateInFile.length < 5) samples.duplicateInFile.push({ name: site.name, url: site.url, catelog: site.catelog });
        continue;
      }
      seenKeys.add(key);
      validSites += 1;
      if (samples.valid.length < 5) samples.valid.push({ name: site.name, url: site.url, catelog: site.catelog });
    } catch (error) {
      invalidSites += 1;
      if (samples.invalid.length < 5) samples.invalid.push({ name: cleanText(item?.name), url: cleanText(item?.url), reason: error.message });
    }
  }

  const importedCategoryNames = new Set(categories.map((category) => cleanText(category?.name || category?.catelog)).filter(Boolean));
  const { results: existingCategories } = await env.NAV_DB.prepare('SELECT name FROM categories').all();
  const existingCategoryNames = new Set((existingCategories || []).map((row) => cleanText(row.name)).filter(Boolean));
  for (const name of categoryNames) {
    if (!existingCategoryNames.has(name) && !importedCategoryNames.has(name)) missingCategories.add(name);
  }

  return {
    totalSites: sites.length,
    validSites,
    invalidSites,
    duplicateExisting,
    duplicateInFile,
    importableSites: validSites,
    categoriesInFile: importedCategoryNames.size,
    categoriesUsed: categoryNames.size,
    missingCategories: [...missingCategories],
    willCreateCategories: [...new Set([...importedCategoryNames, ...missingCategories])],
    samples,
  };
}

async function clearBookmarkData(env) {
  await env.NAV_DB.batch([
    env.NAV_DB.prepare('DELETE FROM site_tags'),
    env.NAV_DB.prepare('DELETE FROM sites'),
    env.NAV_DB.prepare('DELETE FROM tags'),
    env.NAV_DB.prepare('DELETE FROM categories'),
    env.NAV_DB.prepare('DELETE FROM category_orders'),
    env.NAV_DB.prepare('DELETE FROM category_metadata'),
  ]);
}

async function restoreImportCategories(env, categories = []) {
  const normalized = categories
    .map((category) => ({
      oldId: category?.id,
      name: cleanText(category?.name || category?.catelog),
      parentId: category?.parent_id,
      sortOrder: normalizeSortOrder(category?.sort_order),
      icon: cleanText(category?.icon) || null,
      description: cleanText(category?.description) || null,
    }))
    .filter((category) => category.name);

  for (const category of normalized) {
    await env.NAV_DB.batch([
      env.NAV_DB.prepare(`
        INSERT INTO categories (name, sort_order, icon, description)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
          sort_order = excluded.sort_order,
          icon = excluded.icon,
          description = excluded.description,
          update_time = CURRENT_TIMESTAMP
      `).bind(category.name, category.sortOrder, category.icon, category.description),
      env.NAV_DB.prepare(`
        INSERT INTO category_orders (catelog, sort_order)
        VALUES (?, ?)
        ON CONFLICT(catelog) DO UPDATE SET sort_order = excluded.sort_order
      `).bind(category.name, category.sortOrder),
    ]);
  }

  const currentCategories = await listCategoryIdMap(env);
  const oldIdToName = new Map(normalized.map((category) => [String(category.oldId), category.name]));
  for (const category of normalized) {
    if (!category.parentId) continue;
    const parentName = oldIdToName.get(String(category.parentId));
    const parent = parentName ? currentCategories.get(parentName) : null;
    const current = currentCategories.get(category.name);
    if (parent?.id && current?.id && parent.id !== current.id) {
      await env.NAV_DB.prepare('UPDATE categories SET parent_id = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?').bind(parent.id, current.id).run();
    }
  }
}

async function listCategoryIdMap(env) {
  const { results } = await env.NAV_DB.prepare('SELECT id, name FROM categories').all();
  return new Map((results || []).map((row) => [row.name, row]));
}

export async function importSites(env, jsonData, { mode = 'merge' } = {}) {
  const { sites, categories } = normalizeImportPayload(jsonData);
  const overwrite = cleanText(mode).toLowerCase() === 'overwrite';
  if (overwrite) await clearBookmarkData(env);

  const existingKeys = overwrite ? new Set() : await getExistingUrlKeySet(env);
  const seenKeys = new Set();
  let importedSites = 0;

  await restoreImportCategories(env, categories);

  for (const item of sites) {
    try {
      const site = normalizeSitePayload(item);
      const key = normalizeDuplicateUrlKey(site.url);
      if (!key || existingKeys.has(key) || seenKeys.has(key)) {
        console.log(`[import] skipped duplicate site: ${site.url}`);
        continue;
      }
      seenKeys.add(key);
      const category = await upsertCategoryByName(env, site.catelog, site.sort_order);
      const result = await env.NAV_DB.prepare(`
        INSERT INTO sites (name, url, logo, desc, catelog, category_id, visibility, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(site.name, site.url, site.logo, site.desc, site.catelog, category?.id || null, site.visibility, site.sort_order).run();
      const siteId = result?.meta?.last_row_id;
      if (siteId) await setSiteTags(env, siteId, site.tags);
      importedSites += 1;
    } catch (error) {
      console.log(`[import] skipped invalid site: ${error.message}`);
    }
  }

  return importedSites;
}

export async function exportConfig(env) {
  const sites = await getAllSites(env);
  const { results: categories } = await env.NAV_DB.prepare(`
    SELECT id, name, parent_id, sort_order, icon, description
    FROM categories
    ORDER BY sort_order ASC, name ASC
  `).all();

  return {
    sites,
    categories: categories || [],
  };
}

export async function fetchSitePreview(url) {
  const raw = cleanText(url);
  if (!raw) throw new Error('URL is required');
  const targetUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let response;
  try {
    response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StarNav-Preview/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
  } catch (err) {
    throw new Error(`无法访问该网址：${err?.message || '请求超时'}`);
  }

  if (!response.ok) {
    throw new Error(`网站返回 HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
    return { title: '', description: '', keywords: '', ogImage: '', favicon: '' };
  }

  const html = await response.text();
  const head = html.slice(0, 32000);

  const title = extractMeta(head, /<title[^>]*>([^<]*)<\/title>/i) || '';
  const description = extractMetaAttr(head, 'description') || extractMetaAttr(head, 'og:description') || '';
  const keywords = extractMetaAttr(head, 'keywords') || '';
  const ogImage = extractMetaAttr(head, 'og:image') || extractMetaAttr(head, 'twitter:image') || '';

  let favicon = '';
  const iconMatch = head.match(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>/i);
  if (iconMatch) {
    const hrefMatch = iconMatch[0].match(/href=["']([^"']+)["']/i);
    if (hrefMatch) {
      favicon = resolveUrl(targetUrl, hrefMatch[1]);
    }
  }

  return {
    title: cleanText(title).slice(0, 200),
    description: cleanText(description).slice(0, 500),
    keywords: cleanText(keywords).slice(0, 300),
    ogImage: resolveUrl(targetUrl, cleanText(ogImage)),
    favicon: favicon || '',
  };
}

function extractMeta(html, regex) {
  const match = html.match(regex);
  return match ? match[1].trim() : '';
}

function extractMetaAttr(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1].trim();
  }
  return '';
}

function resolveUrl(base, relative) {
  const rel = cleanText(relative);
  if (!rel) return '';
  if (/^https?:\/\//i.test(rel)) return rel;
  if (rel.startsWith('//')) return 'https:' + rel;
  try {
    return new URL(rel, base).href;
  } catch {
    return '';
  }
}

export async function reorderSites(env, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('items must be a non-empty array');
  }

  console.log(`[api] reorder sites count=${items.length}`);

  const statements = items.map((item, index) => {
    const id = Number(item.id);
    if (!Number.isFinite(id)) throw new Error('Invalid site id');
    const sortOrder = normalizeSortOrder(item.sort_order, (index + 1) * 10);
    return env.NAV_DB.prepare('UPDATE sites SET sort_order = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?').bind(sortOrder, id);
  });

  await env.NAV_DB.batch(statements);
}