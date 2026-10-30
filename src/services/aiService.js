import { cleanText } from '../lib/utils.js';
import { decryptSecret, encryptSecret } from '../lib/crypto.js';
import { getBeijingParts, BEIJING_TIMEZONE_LABEL } from '../lib/datetime.js';
import { getSetting, setSetting } from './settingsService.js';
import { canAccessSite, getSite, searchSites, getSiteAnalytics } from './siteService.js';
import { listCategories } from './categoryService.js';
import { listTags, loadTagProfile } from './tagService.js';
import { getSiteStats, formatStatsForPrompt, describeSiteStats } from './statsService.js';
import { webSearch, getWebSearchSettings, fetchPageDigest } from './webSearchService.js';

const AI_SETTING_PREFIX = 'ai.';
const DEFAULT_AI_SETTINGS = {
  enabled: 'false',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  systemPrompt: '你是星漫旅站的 AI 书签助理。你的首要任务是基于“本站书签检索结果”回答用户。检索结果是事实来源，不能编造不存在的书签、分类、标签或链接；不能说出与检索结果相反的结论。若检索结果为空，请明确说明本站没有找到相关书签，并建议用户换关键词。若用户询问“所有、全部、包含某字、某分类、某标签、某链接”等事实型问题，必须逐条依据检索结果回答。回答要简洁、准确、友好；只有在明确说明“以下是通用建议，不代表本站已有书签”时，才可以补充常识建议。请使用中文纯文本或简单编号列表回答，避免使用 Markdown 加粗星号。',
};

function boolString(value) {
  return String(value) === 'true' ? 'true' : 'false';
}

export async function getAiSettings(env, { includeSecret = false } = {}) {
  const settings = {};
  for (const [key, defaultValue] of Object.entries(DEFAULT_AI_SETTINGS)) {
    settings[key] = await getSetting(env, `${AI_SETTING_PREFIX}${key}`, defaultValue);
  }

  settings.enabled = boolString(settings.enabled);
  settings.configured = Boolean(settings.apiKey);
  if (includeSecret) {
    settings.apiKey = await decryptSecret(env, settings.apiKey);
  } else {
    settings.apiKey = settings.configured ? '********' : '';
  }

  return settings;
}

export async function updateAiSettings(env, payload = {}) {
  const enabled = payload.enabled === true || payload.enabled === 'true' ? 'true' : 'false';
  const baseUrl = cleanText(payload.baseUrl) || DEFAULT_AI_SETTINGS.baseUrl;
  const model = cleanText(payload.model) || DEFAULT_AI_SETTINGS.model;
  const systemPrompt = cleanText(payload.systemPrompt) || DEFAULT_AI_SETTINGS.systemPrompt;

  await setSetting(env, `${AI_SETTING_PREFIX}enabled`, enabled);
  await setSetting(env, `${AI_SETTING_PREFIX}baseUrl`, baseUrl);
  await setSetting(env, `${AI_SETTING_PREFIX}model`, model);
  await setSetting(env, `${AI_SETTING_PREFIX}systemPrompt`, systemPrompt);

  const apiKey = cleanText(payload.apiKey);
  if (apiKey && apiKey !== '********') {
    await setSetting(env, `${AI_SETTING_PREFIX}apiKey`, await encryptSecret(env, apiKey));
  }

  return getAiSettings(env);
}

function normalizeAiSettingsPayload(savedSettings, payload = {}) {
  const apiKey = cleanText(payload.apiKey);
  return {
    ...savedSettings,
    enabled: payload.enabled === true || payload.enabled === 'true' ? 'true' : savedSettings.enabled,
    baseUrl: cleanText(payload.baseUrl) || savedSettings.baseUrl || DEFAULT_AI_SETTINGS.baseUrl,
    model: cleanText(payload.model) || savedSettings.model || DEFAULT_AI_SETTINGS.model,
    systemPrompt: cleanText(payload.systemPrompt) || savedSettings.systemPrompt || DEFAULT_AI_SETTINGS.systemPrompt,
    apiKey: apiKey && apiKey !== '********' ? apiKey : savedSettings.apiKey,
  };
}

function getModelsEndpoint(baseUrl) {
  const raw = cleanText(baseUrl) || DEFAULT_AI_SETTINGS.baseUrl;
  try {
    const url = new URL(raw);
    url.pathname = url.pathname
      .replace(/\/chat\/completions\/?$/i, '/models')
      .replace(/\/responses\/?$/i, '/models');
    if (!/\/models\/?$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/+$/g, '') + '/models';
    }
    url.search = '';
    return url.toString();
  } catch {
    return raw.replace(/\/chat\/completions\/?$/i, '/models').replace(/\/+$/g, '') + '/models';
  }
}

const QUERY_EXPANSIONS = [
  {
    match: ['云盘', '网盘', '网盘资源', '云存储', '文件存储', '文件分享'],
    expand: ['云盘', '网盘', '网盘资源', '云存储', '文件存储', '文件分享', '阿里云盘', '百度网盘', '夸克网盘', '蓝奏云', '迅雷云盘', '天翼云盘', '115网盘', '123云盘', '坚果云', 'OneDrive', 'Google Drive', 'Dropbox', 'MEGA'],
  },
  {
    match: ['cloudflare', 'cf', 'workers', 'pages', 'cdn', 'dns', 'waf'],
    expand: ['Cloudflare', 'cloudflare', 'CF', 'Workers', 'Pages', 'CDN', 'DNS', 'WAF', 'Zero Trust'],
  },
  {
    match: ['ai', '人工智能', '大模型', 'gpt', 'chatgpt', '绘画'],
    expand: ['AI', '人工智能', '大模型', 'GPT', 'ChatGPT', 'Claude', 'Gemini', 'Midjourney', 'Stable Diffusion', '绘画'],
  },
  {
    match: ['图片', '图像', '压缩', '抠图', '设计'],
    expand: ['图片', '图像', '压缩', '抠图', '设计', '素材', '图标', '配色', '无损压缩'],
  },
  {
    match: ['图床', '上传图片', '图片上传', '图片外链', '图片托管', '相册', '传图', '贴图', '外链图', '图片直链', '图片链接', '在线图床'],
    expand: ['图床', '上传图片', '图片上传', '图片外链', '图片托管', '相册', '传图', '贴图', '外链图', '图片直链', '图片链接', '在线图床', 'ImgToLink', 'ImgURL', 'SM.MS', '兰空图床', '路过图床'],
  },
];

function normalizeSearchPhrase(value) {
  return cleanText(value)
    .replace(/^[“”"'「」『』《》【】\[\]（）()<>]+|[“”"'「」『』《》【】\[\]（）()<>]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function addKeyword(keywords, value, maxLength = 48) {
  const keyword = normalizeSearchPhrase(value).slice(0, maxLength);
  if (keyword) keywords.add(keyword);
}

function extractIntentFreePhrase(message) {
  let text = cleanText(message);
  if (!text) return '';

  text = text
    .replace(/[“”"'「」『』《》【】\[\]（）()<>]/g, ' ')
    .replace(/[？?。！!，,；;：:、]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const noisePatterns = [
    /^(请问|麻烦|帮我|请|能不能|可以)?\s*(帮我)?\s*(找出|找一下|找|查一下|查询|搜索|检索|看看|看下|推荐)\s*/i,
    /\s*(这个|这条|该)?\s*(本站)?\s*(书签|网站|链接|网址)\s*/gi,
    /\s*(位于|属于|归属|是在|在)?\s*(哪一个|哪个|什么|哪类|哪种)?\s*(分类|类别|目录|分组)(下面|下|里|中)?\s*/gi,
    /\s*(在哪里|在哪|是哪一个|是什么|是哪个|有吗|有没有|吗|呢|帮我找出来|找出来)\s*/gi,
  ];

  for (const pattern of noisePatterns) {
    text = text.replace(pattern, ' ');
  }

  return text.replace(/\s+/g, ' ').trim();
}

function extractCapabilityPhrases(message) {
  const text = cleanText(message);
  const phrases = new Set();
  const patterns = [
    /(?:能|可以|可用于|用于|支持|能够)\s*([^，。！？；、\s]{2,18})\s*的?\s*(?:网站|工具|书签|链接|平台|服务)?/g,
    /(?:找|搜索|推荐|有没有)\s*(?:一个|一些|几个|能|可以)?\s*([^，。！？；、\s]{2,18})\s*(?:的)?\s*(?:网站|工具|书签|链接|平台|服务)?/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      addKeyword(phrases, match[1], 24);
    }
  }
  return [...phrases];
}

function extractContainsKeyword(message) {
  const text = cleanText(message);
  const quoted = text.match(/(?:包含|含有|带有|带|含)\s*[“"「『《【']([^”"」』》】']{1,24})[”"」』》】']\s*(?:字|字符|关键词|词)?/);
  if (quoted?.[1]) return normalizeSearchPhrase(quoted[1]);
  const singleChar = text.match(/(?:包含|含有|带有|带|含)\s*([\u4e00-\u9fffA-Za-z0-9])\s*(?:字|字符|关键词|词)/);
  if (singleChar?.[1]) return normalizeSearchPhrase(singleChar[1]);
  const loose = text.match(/(?:包含|含有|带有)\s*([^\s的书签网站链接网址分类标签描述]{1,12})/);
  if (loose?.[1]) return normalizeSearchPhrase(loose[1].replace(/(字|字符|关键词|词)$/u, ''));
  return '';
}

function inferSearchKeywords(message) {
  const rawText = cleanText(message);
  const text = rawText.replace(/[？?。！!，,；;：:、]/g, ' ');
  const lowerText = text.toLowerCase();
  const stopWords = new Set(['帮我', '找', '查', '搜索', '推荐', '有没有', '哪里', '哪个', '哪一个', '什么', '网址', '网站', '链接', '书签', '分类', '类别', '目录', '分组', '位于', '属于', '相关', '一下', '请问', '我想', '需要', '和', '的', '与']);
  const words = text.split(/\s+/).map((item) => normalizeSearchPhrase(item)).filter(Boolean);
  const useful = words.filter((word) => !stopWords.has(word));
  const keywords = new Set();

  const containsKeyword = extractContainsKeyword(rawText);
  addKeyword(keywords, containsKeyword);

  const quotedMatches = rawText.matchAll(/[“"「『《【]([^”"」』》】]{1,48})[”"」』》】]/g);
  for (const match of quotedMatches) {
    addKeyword(keywords, match[1]);
  }

  const urlLikeMatches = rawText.matchAll(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?:\/[^\s，。！？；、]*)?/gi);
  for (const match of urlLikeMatches) {
    const full = match[0];
    const host = match[1];
    addKeyword(keywords, full);
    addKeyword(keywords, host);
    host.split('.').filter((part) => part.length >= 2).forEach((part) => addKeyword(keywords, part));
  }

  const numericMatches = rawText.matchAll(/\b\d{3,}\b/g);
  for (const match of numericMatches) {
    addKeyword(keywords, match[0]);
  }

  const intentFreePhrase = extractIntentFreePhrase(rawText);
  addKeyword(keywords, intentFreePhrase);

  extractCapabilityPhrases(rawText).forEach((phrase) => addKeyword(keywords, phrase));

  if (useful.length) {
    addKeyword(keywords, useful.slice(0, 6).join(' '));
    useful.slice(0, 8).forEach((word) => addKeyword(keywords, word));
  }

  for (const group of QUERY_EXPANSIONS) {
    if (group.match.some((item) => lowerText.includes(item.toLowerCase()))) {
      group.expand.forEach((item) => addKeyword(keywords, item));
    }
  }

  if (!keywords.size && text) addKeyword(keywords, text.slice(0, 40));
  return Array.from(keywords).filter(Boolean).slice(0, 24);
}

async function searchExpandedSites(env, {
  message,
  adminAuthed = false,
  privateUnlocked = false,
  limit = 16,
} = {}) {
  const keywords = inferSearchKeywords(message);
  const merged = new Map();

  for (const [keywordIndex, keyword] of keywords.entries()) {
    let results = [];
    try {
      results = await searchSites(env, {
        keyword,
        limit: Math.max(8, limit),
        includePrivate: privateUnlocked,
        adminAuthed,
        privateUnlocked,
      });
    } catch (error) {
      console.warn(`[ai] skip failed bookmark search keyword="${String(keyword).slice(0, 40)}": ${error.message}`);
      continue;
    }
    const keywordPriorityBoost = Math.max(0, keywords.length - keywordIndex) * 120;
    for (const site of results || []) {
      const aiSearchScore = (Number(site._score) || 0) + keywordPriorityBoost;
      if (!merged.has(site.id)) {
        merged.set(site.id, { ...site, _matchedBy: [keyword], _aiSearchScore: aiSearchScore });
      } else {
        const existing = merged.get(site.id);
        existing._matchedBy.push(keyword);
        existing._aiSearchScore = Math.max(Number(existing._aiSearchScore) || 0, aiSearchScore);
        existing._score = Math.max(Number(existing._score) || 0, Number(site._score) || 0);
      }
    }
    if (merged.size >= limit * 2) break;
  }

  return Array.from(merged.values())
    .sort((a, b) => {
      const aiScoreDiff = (Number(b._aiSearchScore) || 0) - (Number(a._aiSearchScore) || 0);
      if (aiScoreDiff !== 0) return aiScoreDiff;
      const scoreDiff = (Number(b._score) || 0) - (Number(a._score) || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const hitDiff = (b._matchedBy?.length || 0) - (a._matchedBy?.length || 0);
      if (hitDiff !== 0) return hitDiff;
      return (Number(b.hits) || 0) - (Number(a.hits) || 0);
    })
    .slice(0, limit);
}

function formatSiteContext(sites = []) {
  if (!sites.length) return '未检索到相关本站书签。';
  return sites.map((site, index) => {
    const tags = Array.isArray(site.tags) && site.tags.length ? `；标签：${site.tags.join('、')}` : '';
    const desc = site.desc ? `；描述：${site.desc}` : '';
    return `${index + 1}. ${site.name}（分类：${site.catelog || '未分类'}；URL：${site.url || '未提供'}${tags}${desc}）`;
  }).join('\n');
}

function stripMarkdownArtifacts(text) {
  return cleanText(text)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '· ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── 实时问答（时间 / 日期 / 星期 / 站点统计）─────────────────────
// 这类问题有唯一正确答案，交给大模型只会引入幻觉和延迟，
// 因此在服务端直接计算或直接查库，保证 100% 准确、零 token 成本。

const REALTIME_ASK_WEEKDAY = /(星期|礼拜|周)\s*(几|几号|是什么|是啥)|今天\s*(是)?\s*(星期|周)/;
const REALTIME_ASK_CLOCK = /(几点|几时|多少点|什么时间了?|现在时间|当前时间|时间是多少)/;
const REALTIME_ASK_DATE = /(今天|明天|昨天|现在|当前)\s*(是)?\s*(几号|几月几号|几月几日|什么日期|日期|多少号)|(几号了)|(今天日期)/;
const REALTIME_ASK_YEAR = /(今年|现在是|当前)\s*(是)?\s*(哪一年|什么年份|几年)|今年是/;
const REALTIME_STAT_OBJECT = /(书签|网站|链接|网址|收录|分类|标签|目录|空间|访问|浏览|点击)/;
const REALTIME_RECOMMEND_VERB = /(推荐|帮我|给我|找|搜|列出|列一下|来几|要几|介绍)/;

/**
 * 判断消息是否是「确定性实时问题」（时间 / 日期 / 星期 / 统计）。
 * 纯函数，便于单测。
 *
 * @param {string} message 用户消息。
 * @returns {{kind:''|'weekday'|'clock'|'date'|'year'|'stats', focus:string}}
 */
export function detectRealtimeIntent(message) {
  const text = cleanText(message);
  if (!text) return { kind: '', focus: '' };

  if (REALTIME_ASK_CLOCK.test(text)) return { kind: 'clock', focus: '' };
  if (REALTIME_ASK_WEEKDAY.test(text)) return { kind: 'weekday', focus: '' };
  if (REALTIME_ASK_DATE.test(text)) return { kind: 'date', focus: '' };
  if (REALTIME_ASK_YEAR.test(text)) return { kind: 'year', focus: '' };

  const hasStrongCount = /(多少|总数|数量|统计|共计|一共|总和)/.test(text);
  const hasWeakCount = /几/.test(text);
  const hasObject = REALTIME_STAT_OBJECT.test(text);
  const hasRecommendVerb = REALTIME_RECOMMEND_VERB.test(text);
  if (hasObject && (hasStrongCount || (hasWeakCount && !hasRecommendVerb))) {
    let focus = 'sites';
    if (/(标签)/.test(text)) focus = 'tags';
    else if (/(分类|类别|目录)/.test(text)) focus = 'categories';
    else if (/(访问|点击|浏览|人气)/.test(text)) focus = 'hits';
    else if (/(新增|收录|今天|本周|最近|这几天)/.test(text)) focus = 'new';
    else if (/(待审|审核|提交)/.test(text)) focus = 'pending';
    return { kind: 'stats', focus };
  }

  return { kind: '', focus: '' };
}

/**
 * 构造实时问题的最终回答（纯函数）。
 *
 * @param {{kind:string,focus:string}} intent detectRealtimeIntent 的结果。
 * @param {object} stats getSiteStats 的结果（仅 stats 类型需要）。
 * @param {{now?: number, adminAuthed?: boolean}} [options]
 * @returns {string}
 */
export function buildRealtimeAnswer(intent, stats = {}, { now, adminAuthed = false } = {}) {
  const p = getBeijingParts(now);
  switch (intent.kind) {
    case 'weekday':
      return `今天是 ${p.yearMonthDay} ${p.weekdayName}（北京时间）。`;
    case 'clock':
      return `现在是北京时间 ${p.time}（${p.date} ${p.weekdayName}）。本站在全球边缘节点运行，其他时区的时间请按 UTC 偏移自行换算。`;
    case 'date':
      return `今天是 ${p.yearMonthDay}，${p.weekdayName}（北京时间）。`;
    case 'year':
      return `今年是 ${p.year} 年，现在是 ${p.yearMonthDay} ${p.weekdayName}。`;
    case 'stats': {
      if (!stats || !Number.isFinite(Number(stats.totalSites))) {
        return '暂时读不到本站统计数据，请稍后再试。';
      }
      const base = describeSiteStats(stats, { adminAuthed, now });
      if (intent.focus === 'tags') {
        return `本站目前共有 ${stats.totalTags} 个标签，分布在 ${stats.totalSites} 条书签上。`
          + (stats.topTag?.name ? `\n使用最多的标签是「${stats.topTag.name}」（${stats.topTag.count} 条书签）。` : '')
          + '\n想按标签找书签，可以直接说“找 #标签名”或在搜索框输入 tag:标签名。';
      }
      if (intent.focus === 'categories') {
        return `本站目前共有 ${stats.totalCategories} 个分类，收录 ${stats.totalSites} 条书签。`
          + (stats.topCategory?.name ? `\n其中「${stats.topCategory.name}」书签最多，共 ${stats.topCategory.count} 条。` : '');
      }
      if (intent.focus === 'hits') {
        return `本站书签累计被访问 ${stats.totalHits} 次，其中 ${stats.visitedSites} 条书签至少被访问过一次。`
          + '\n想看排行榜可以问“访问最多的书签”。';
      }
      if (intent.focus === 'new') {
        const latest = stats.latestSites || [];
        return `收录节奏：今天新增 ${stats.todayNew} 条，近 7 天 ${stats.weekNew} 条，近 30 天 ${stats.monthNew} 条。`
          + (latest.length ? `\n最近收录：${latest.map((site) => `${site.name}（${site.catelog}）`).join('、')}。` : '');
      }
      if (intent.focus === 'pending') {
        if (!adminAuthed || stats.pendingSites === null || stats.pendingSites === undefined) {
          return `待审核数量只有管理员可见。当前本站共收录 ${stats.totalSites} 条书签。`;
        }
        return `当前有 ${stats.pendingSites} 条书签提交等待审核。`;
      }
      return base;
    }
    default:
      return '';
  }
}

// ─── 站内词汇表（标签 / 分类）驱动的检索 ─────────────────────

async function loadSiteVocabulary(env) {
  const [categories, tags] = await Promise.all([
    listCategories(env).catch(() => []),
    listTags(env).catch(() => []),
  ]);
  return {
    categories: (categories || []).map((item) => cleanText(item.name)).filter(Boolean),
    tags: (tags || [])
      .map((item) => ({ name: cleanText(item.name), count: Number(item.site_count) || 0 }))
      .filter((item) => item.name),
  };
}

/**
 * 根据用户消息 + 站内标签/分类词汇表，生成检索计划（纯函数）。
 *
 * @param {string} message
 * @param {{categories?: string[], tags?: Array<{name:string,count:number}>}} [vocabulary]
 * @returns {{phrase:string,keywords:string[],tags:string[],categories:string[]}}
 */
export function buildSearchPlan(message, vocabulary = {}) {
  const raw = cleanText(message);
  const lower = raw.toLowerCase();
  const unique = (values) => [...new Set(values.map((value) => cleanText(value)).filter(Boolean))];

  const tags = unique((vocabulary.tags || [])
    .map((item) => cleanText(item?.name))
    .filter((name) => name.length >= 1 && lower.includes(name.toLowerCase())))
    .sort((a, b) => a.length - b.length)
    .slice(0, 4);

  const categories = unique((vocabulary.categories || [])
    .filter((name) => name && lower.includes(cleanText(name).toLowerCase())))
    .sort((a, b) => a.length - b.length)
    .slice(0, 3);

  const keywords = inferSearchKeywords(raw)
    .filter((keyword) => !tags.some((tag) => tag.toLowerCase() === keyword.toLowerCase()))
    .filter((keyword) => !categories.some((category) => category.toLowerCase() === keyword.toLowerCase()))
    .slice(0, 8);

  return { phrase: normalizeSearchPhrase(raw), keywords, tags, categories };
}

/**
 * 按检索计划检索书签：短语 > 标签/分类精确 > 关键词扩展，按命中权重累加排序。
 *
 * @param {object} env
 * @param {{plan:object,limit?:number,adminAuthed?:boolean,privateUnlocked?:boolean}} options
 * @returns {Promise<Array>}
 */
async function retrieveSitesForAi(env, { plan, limit = 16, adminAuthed = false, privateUnlocked = false } = {}) {
  const queries = [];
  const pushQuery = (keyword, weight, reason) => {
    const value = cleanText(keyword);
    if (!value) return;
    if (queries.some((item) => item.keyword === value)) return;
    queries.push({ keyword: value, weight, reason });
  };

  pushQuery(plan.phrase, 3, '原句匹配');
  plan.tags.forEach((tag) => pushQuery(`tag:"${tag}"`, 2.6, `标签「${tag}」`));
  plan.categories.forEach((category) => pushQuery(`cat:"${category}"`, 2.4, `分类「${category}」`));
  plan.keywords.forEach((keyword, index) => pushQuery(keyword, 1 + Math.max(0, (8 - index)) * 0.12, `关键词「${keyword}」`));

  const merged = new Map();
  for (const query of queries.slice(0, 12)) {
    let results = [];
    try {
      results = await searchSites(env, {
        keyword: query.keyword,
        limit: Math.max(10, limit),
        includePrivate: privateUnlocked,
        adminAuthed,
        privateUnlocked,
      });
    } catch (error) {
      console.warn(`[ai] 检索失败 keyword="${query.keyword.slice(0, 40)}": ${error.message}`);
      continue;
    }

    const hitsCount = (results || []).length;
    // 命中数量越少的查询越「独有」，同等条件下应获得更高的区分度权重
    const specificity = hitsCount > 0 ? 1 + Math.min(0.6, 6 / (hitsCount + 3)) : 1;
    for (const site of results || []) {
      const base = Number(site._score) || 0;
      const gained = base * query.weight * specificity;
      const existing = merged.get(site.id);
      if (existing) {
        existing._aiSearchScore += gained;
        existing._matchedBy.push(query.reason);
        existing._score = Math.max(Number(existing._score) || 0, base);
        existing._hitCount += 1;
      } else {
        merged.set(site.id, {
          ...site,
          _aiSearchScore: gained,
          _matchedBy: [query.reason],
          _hitCount: 1,
        });
      }
    }
  }

  return [...merged.values()]
    .map((site) => {
      const multiHitBonus = (Number(site._hitCount) || 1) > 1 ? (Number(site._hitCount) - 1) * 180 : 0;
      const hits = Math.min(Number(site.hits) || 0, 5000);
      const popularity = Math.log10(hits + 1) * 30;
      return { ...site, _aiSearchScore: (Number(site._aiSearchScore) || 0) + multiHitBonus + popularity };
    })
    .sort((a, b) => {
      const diff = (Number(b._aiSearchScore) || 0) - (Number(a._aiSearchScore) || 0);
      if (diff !== 0) return diff;
      return (Number(b.hits) || 0) - (Number(a.hits) || 0);
    })
    .slice(0, limit);
}

// ─── 联网搜索决策 ───────────────────────────────────────

const WEB_INTENT_PATTERN = /(联网|网上|网络|线上|百度|谷歌|google|bing|网页搜索|搜一下网|查一下网|最新的?消息|新闻|官网是什么|实时|外网)/i;

/**
 * 决定本次问答是否需要联网检索（纯函数）。
 *
 * @param {string} message
 * @param {{siteCount:number, settings:object, preference?:boolean|null}} options
 * @returns {{use:boolean, reason:string}}
 */
export function decideWebSearch(message, { siteCount = 0, settings = {}, preference = null } = {}) {
  if (settings.enabled !== 'true') return { use: false, reason: '未启用' };
  const text = cleanText(message);
  if (preference === false) return { use: false, reason: '用户已关闭联网' };
  if (WEB_INTENT_PATTERN.test(text)) return { use: true, reason: '用户明确要求联网' };
  if (preference === true) return { use: true, reason: '用户开启联网开关' };
  if (settings.autoMode === 'true' && siteCount === 0) return { use: true, reason: '站内无结果，自动联网补充' };
  return { use: false, reason: '站内结果已足够' };
}

function formatWebContext(results = []) {
  if (!results.length) return '';
  return results.map((item, index) => `[${index + 1}] ${item.title}\n    URL: ${item.url}\n    摘要: ${item.snippet || '（无摘要）'}`).join('\n');
}

function extractFirstUrl(message = '') {
  const match = String(message).match(/https?:\/\/[^\s，。！？；、）)】』」]+/i);
  return match ? match[0].replace(/[.,;:!?]+$/, '') : '';
}

function sanitizeHistory(history = [], maxTurns = 6) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
    .map((item) => ({
      role: item.role,
      content: cleanText(item.content).slice(0, 1200),
    }))
    .filter((item) => item.content)
    .slice(-maxTurns * 2);
}

function detectBookmarkIntent(message) {
  const text = cleanText(message);
  const containsKeyword = extractContainsKeyword(text);
  const popularMatch = text.match(/(?:访问|点击|浏览|使用|打开)?\s*(?:最多|最高|最热|最火|最常|排行|排名|热门|popular|top)\s*(?:的)?\s*(\d+)?/i)
    || text.match(/(?:推荐|给我|列出)?\s*(?:热门|常用|高频|受欢迎)\s*(?:的)?\s*(\d+)?/)
    || text.match(/(?:top|前)\s*(\d+)\s*(?:个|条|名)?/i);
  const asksPopular = Boolean(popularMatch);
  const popularLimit = asksPopular ? Math.min(20, Math.max(1, Number(popularMatch[1] || popularMatch[2]) || 5)) : 0;
  return {
    asksCategory: /(分类|类别|目录|分组|在哪|位于|属于)/.test(text),
    asksUrl: /(链接|网址|url|地址|是什么网站|哪个网站)/i.test(text),
    asksExistence: /(有没有|有吗|是否有|找得到|存在吗)/.test(text),
    asksList: /(所有|全部|列表|列出|有哪些|哪些|都有什么|给我看|包含|含有|带有)/.test(text),
    asksPopular,
    popularLimit,
    containsKeyword,
    hasPronoun: /(它|这个|这条|该书签|上一个|刚才那个|刚刚那个)/.test(text),
  };
}

function formatSiteLine(site, index = 0) {
  const tags = Array.isArray(site.tags) && site.tags.length ? ` ｜ #${site.tags.join(' #')}` : '';
  const desc = site.desc ? `\n   ${site.desc}` : '';
  return `${index + 1}. ${site.name}（${site.catelog || '未分类'}）${tags}\n   ${site.url || '未提供链接'}${desc}`;
}

function siteContainsKeyword(site, keyword) {
  const term = cleanText(keyword).toLowerCase();
  if (!term) return true;
  const fields = [
    site?.name,
    site?.catelog,
    site?.desc,
    site?.url,
    ...(Array.isArray(site?.tags) ? site.tags : []),
  ];
  return fields.some((value) => cleanText(value).toLowerCase().includes(term));
}

function filterSitesByContainsKeyword(sites = [], keyword = '') {
  const term = cleanText(keyword);
  if (!term) return sites;
  return sites.filter((site) => siteContainsKeyword(site, term));
}

async function resolveContextSites(env, previousSites = [], { adminAuthed = false, privateUnlocked = false } = {}) {
  const ids = Array.isArray(previousSites)
    ? [...new Set(previousSites.map((site) => Number(site?.id)).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 5)
    : [];
  if (!ids.length) return [];

  const sites = [];
  for (const id of ids) {
    const site = await getSite(env, id);
    if (site && canAccessSite(site, { adminAuthed, privateUnlocked })) {
      sites.push(site);
    }
  }
  return sites;
}

function buildLocalAnswer(message, sites) {
  const intent = detectBookmarkIntent(message);
  if (!sites.length) {
    return {
      answer: `我暂时没有在本站书签中找到与“${cleanText(message).slice(0, 60)}”直接相关的内容。你可以换个关键词，比如网站名称、用途、分类名或标签再试一次。`,
      mode: 'local',
    };
  }

  const topSite = sites[0];
  if (intent.asksCategory && topSite) {
    return {
      answer: `根据本站书签检索结果，“${topSite.name}”位于“${topSite.catelog || '未分类'}”分类。`,
      mode: 'local_strict',
    };
  }

  if (intent.asksUrl && topSite) {
    return {
      answer: `根据本站书签检索结果，“${topSite.name}”的链接是：${topSite.url || '未提供链接'}。`,
      mode: 'local_strict',
    };
  }

  if (intent.asksExistence && topSite) {
    return {
      answer: `本站书签中找到了相关结果：\n\n${sites.slice(0, 8).map(formatSiteLine).join('\n\n')}`,
      mode: 'local_strict',
    };
  }

  if (intent.asksList || intent.containsKeyword) {
    const keywordText = intent.containsKeyword ? `包含“${intent.containsKeyword}”的` : '相关';
    return {
      answer: `我在本站书签中找到了以下${keywordText}结果${sites.length >= 30 ? '（最多展示前 30 条）' : ''}：\n\n${sites.slice(0, 30).map(formatSiteLine).join('\n\n')}`,
      mode: 'local_strict',
    };
  }

  const lines = sites.slice(0, 12).map(formatSiteLine);

  return {
    answer: `我在本站书签里找到了这些可能相关的内容：\n\n${lines.join('\n\n')}`,
    mode: 'local',
  };
}

async function callOpenAiCompatible({ settings, message, context, history = [], extraSystem = [], temperature = 0.3 }) {
  const historyMessages = sanitizeHistory(history).map((item) => ({ role: item.role, content: item.content }));
  const systemMessages = [
    { role: 'system', content: settings.systemPrompt },
    { role: 'system', content: '事实性约束：你正在做 RAG 问答。“本站书签检索结果”是唯一可信的本站数据源。回答书签是否存在、在哪个分类、链接是什么、包含某字/某词的所有书签、某分类/标签有哪些等事实型问题时，只能使用检索结果中的条目。检索结果为空时必须说本站未找到；检索结果非空时不得说未检索到。不要输出检索结果中不存在的名称、分类、标签、URL。' },
    { role: 'system', content: '输出格式要求：请使用中文纯文本回答；可以使用编号列表，但不要使用 Markdown 加粗、标题符号或多余星号。不要把“**”输出给用户。' },
    ...extraSystem.filter(Boolean).map((content) => ({ role: 'system', content })),
  ];

  const messages = [
    ...systemMessages,
    ...historyMessages,
    { role: 'user', content: message },
  ];

  if (context) {
    // 检索结果紧贴用户提问，避免长对话历史把事实材料“挤”出注意力范围
    messages.splice(messages.length - 1, 0, { role: 'system', content: `本站书签检索结果：\n${context}` });
  }

  const response = await fetch(settings.baseUrl, {
    method: 'POST',
    signal: AbortSignal.timeout(30000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`AI provider error: ${response.status} ${text.slice(0, 180)}`);
  }

  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';
  if (!answer) throw new Error('AI provider returned empty answer');
  return stripMarkdownArtifacts(answer);
}

function parseSuggestedTags(text, limit = 8) {
  const raw = cleanText(text);
  if (!raw) return [];
  let parsed = null;
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  try {
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    parsed = raw.split(/[,，、\n\s]+/).map((item) => item.replace(/^#+/, ''));
  }
  const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.tags) ? parsed.tags : [];
  return [...new Set(items.map((item) => cleanText(typeof item === 'string' ? item : item?.name)).filter(Boolean))]
    .filter((item) => item.length <= 16)
    .slice(0, limit);
}

// ─── 标签推荐引擎 ───────────────────────────────────────────
// 目标：让推荐结果「贴站内」且「可解释」。
// 三条信号叠加打分：
//   1) 站内词汇表（已有标签）在名称/描述/域名/分类中的出现位置与强度；
//   2) 标签与该分类的历史共现度 + 标签自身热度（贴着站内既有习惯，不造新词）；
//   3) 语义词典与域名规则（兜底，用于库还很空、词汇表覆盖不到时）。

const TAG_SEMANTIC_RULES = [
  { tag: 'AI', keys: ['ai', 'gpt', 'chatgpt', 'claude', 'gemini', 'midjourney', 'stable diffusion', '大模型', '人工智能', 'aigc', 'llm', '提示词', '智能助手'] },
  { tag: '图床', keys: ['图床', '图片上传', '图片外链', '图链', 'imgurl', 'sm.ms', 'imgbb', '上传图片', '图片托管'] },
  { tag: '网盘', keys: ['网盘', '云盘', '云存储', 'onedrive', 'dropbox', 'mega', '夸克', '阿里云盘', '百度网盘', '115'] },
  { tag: '代码托管', keys: ['github', 'gitlab', 'gitee', '代码托管', '代码仓库', 'repo'] },
  { tag: '开发工具', keys: ['api', 'json', 'sdk', '开发者', '开发文档', '调试', '正则', '时间戳', '编码转换', 'npm', 'docker', 'vscode', 'ide', 'postman'] },
  { tag: '设计素材', keys: ['设计', '素材', '图标', 'icon', '配色', '调色', 'figma', 'svg', '字体', '插画', 'ui', 'mockup', 'dribbble', 'behance'] },
  { tag: '影音娱乐', keys: ['视频', '影视', '电影', '电视剧', '音乐', '音频', '动漫', '番剧', '直播', 'b站', 'bilibili', 'youtube', '油管', 'spotify'] },
  { tag: '学习提升', keys: ['教程', '课程', '学习', '考试', '题库', '英语', '教学', 'mooc', 'wiki', '百科'] },
  { tag: '阅读资讯', keys: ['博客', '资讯', '新闻', '文章', '阅读', 'rss', '电子书', '书单', 'medium'] },
  { tag: '效率笔记', keys: ['笔记', '知识库', '待办', 'todo', '效率', 'notion', 'obsidian', '思维导图', '流程图', '语雀', '飞书'] },
  { tag: '办公协作', keys: ['office', 'excel', 'word', 'ppt', '文档', '表格', '协作', '会议', 'pdf', '格式转换'] },
  { tag: '资源下载', keys: ['下载', '磁力', '种子', 'bt', '资源站', '电子书下载', '素材下载'] },
  { tag: '在线工具', keys: ['在线工具', '工具箱', '小工具', '生成器', 'utilities', 'toolbox'] },
  { tag: '安全隐私', keys: ['安全', '隐私', '密码', '加密', '防火墙', '泄露', '漏洞'] },
  { tag: '服务器运维', keys: ['服务器', 'vps', '主机', '域名', 'dns', 'cdn', '部署', '运维', 'nginx', 'linux', '监控', '宝塔'] },
  { tag: '建站托管', keys: ['建站', '博客系统', 'wordpress', 'hexo', 'hugo', 'vercel', 'netlify', 'cloudflare', 'pages', 'workers', '虚拟主机'] },
  { tag: '图片处理', keys: ['压缩', '抠图', '去背景', '图片编辑', '加水印', '图片压缩', 'photoshop', '图片转换'] },
  { tag: '邮箱短信', keys: ['邮箱', '邮件', '临时邮箱', '短信', '接码', 'sms', 'mail'] },
  { tag: '社交社区', keys: ['论坛', '社区', '贴吧', '知乎', '微博', 'discord', 'telegram', 'reddit', 'v2ex'] },
  { tag: '地图出行', keys: ['地图', '导航', '出行', '航班', '火车', '打车', '地铁', '路线'] },
  { tag: '金融理财', keys: ['汇率', '股票', '基金', '记账', '理财', '税务', '利率'] },
  { tag: '游戏', keys: ['游戏', 'steam', '手游', '攻略', '汉化', 'epic'] },
  { tag: '生活服务', keys: ['菜谱', '天气', '健康', '购物', '比价', '快递', '日历'] },
  { tag: '字体排版', keys: ['字体', '排版', '字库', '免费字体', 'typography'] },
  { tag: '数据可视化', keys: ['图表', '可视化', 'chart', 'dashboard', 'bi', '甘特图'] },
];

const TAG_DOMAIN_RULES = [
  { match: ['github.com', 'gitlab.com', 'gitee.com', 'bitbucket.org'], tag: '代码托管' },
  { match: ['bilibili.com', 'youtube.com', 'iqiyi.com', 'v.qq.com', 'douyin.com'], tag: '影音娱乐' },
  { match: ['figma.com', 'dribbble.com', 'behance.net', 'canva.com'], tag: '设计素材' },
  { match: ['notion.so', 'obsidian.md', 'yuque.com', 'feishu.cn', 'wolai.com'], tag: '效率笔记' },
  { match: ['vercel.com', 'netlify.com', 'cloudflare.com', 'railway.app', 'render.com'], tag: '建站托管' },
  { match: ['openai.com', 'anthropic.com', 'claude.ai', 'chatgpt.com', 'gemini.google.com', 'midjourney.com'], tag: 'AI' },
  { match: ['drive.google.com', 'pan.baidu.com', 'aliyundrive.com', 'alipan.com', '115.com'], tag: '网盘' },
  { match: ['mail.google.com', 'outlook.com', 'mail.qq.com', '163.com'], tag: '邮箱短信' },
  { match: ['npmjs.com', 'pypi.org', 'crates.io', 'docker.com'], tag: '开发工具' },
];

const TAG_MIN_LENGTH = 2;
const TAG_MAX_LENGTH = 12;

function normalizeTagKey(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * 站内标签词汇表是否「够用」（决定是否更需要语义词典兜底）。
 *
 * @param {object} profile loadTagProfile 的返回值。
 * @returns {boolean}
 */
export function isTagVocabularySparse(profile = {}) {
  const size = profile?.tags instanceof Map ? profile.tags.size : 0;
  return size < 8;
}

/**
 * 本地标签推荐（纯函数，可单测）。
 *
 * @param {object} site 书签对象 {name,url,desc,catelog,tags}。
 * @param {object} profile loadTagProfile 的返回值（可为空对象）。
 * @param {{limit?:number}} [options]
 * @returns {Array<{name:string,score:number,source:string,reason:string}>}
 */
export function suggestTagsLocally(site = {}, profile = {}, { limit = 5 } = {}) {
  const name = cleanText(site.name);
  const desc = cleanText(site.desc);
  const url = cleanText(site.url);
  const category = cleanText(site.catelog);
  const host = (() => {
    try {
      return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  })();
  const currentTags = Array.isArray(site.tags)
    ? site.tags.map((tag) => cleanText(tag)).filter(Boolean)
    : cleanText(site.tags).split(/[,，、\s]+/).map((tag) => cleanText(tag)).filter(Boolean);

  const lowerName = name.toLowerCase();
  const lowerDesc = desc.toLowerCase();
  const haystack = [lowerName, lowerDesc, host, category.toLowerCase()].join(' \u0001 ');
  const candidates = new Map();

  const push = (tagName, entry) => {
    const clean = cleanText(tagName);
    if (!clean) return;
    if (clean.length < TAG_MIN_LENGTH || clean.length > TAG_MAX_LENGTH) return;
    const key = normalizeTagKey(clean);
    if (!key) return;
    const existing = candidates.get(key);
    if (!existing || entry.score > existing.score) {
      candidates.set(key, { name: existing?.preservedName || clean, ...entry, preservedName: existing?.preservedName || clean });
    }
  };

  const categoryTags = profile?.categories instanceof Map ? profile.categories.get(category) : null;
  const categoryTagTotal = categoryTags
    ? [...categoryTags.values()].reduce((sum, value) => sum + value, 0)
    : 0;

  // ① 站内已有标签：按命中位置打分 + 分类共现 + 热度
  if (profile?.tags instanceof Map) {
    for (const [key, info] of profile.tags) {
      const tagName = cleanText(info?.name);
      if (!tagName || tagName.length < TAG_MIN_LENGTH || tagName.length > TAG_MAX_LENGTH) continue;
      const lowerTag = tagName.toLowerCase();

      let positional = 0;
      let reason = '';
      if (lowerName.includes(lowerTag)) {
        positional = 95;
        reason = `站内已有标签，且出现在书签名称中`;
      } else if (lowerDesc.includes(lowerTag)) {
        positional = 72;
        reason = `站内已有标签，描述中提到了它`;
      } else if (host.includes(lowerTag)) {
        positional = 66;
        reason = `站内已有标签，域名与之吻合`;
      } else if (category.toLowerCase() === lowerTag) {
        positional = 40;
        reason = `站内已有标签，与分类同名`;
      }
      if (!positional) continue;

      const total = Number(info.total) || 0;
      const cooc = categoryTags ? Number(categoryTags.get(tagName)) || 0 : 0;
      const coocBoost = categoryTagTotal && cooc ? Math.min(18, (cooc / categoryTagTotal) * 26) : 0;
      const popularity = Math.min(14, Math.log10(total + 1) * 7);
      push(tagName, {
        name: tagName,
        score: positional + coocBoost + popularity,
        source: 'vocabulary',
        reason: coocBoost > 4 ? `${reason}；该分类下已有 ${cooc} 条书签使用此标签` : reason,
      });
    }
  }

  // ② 分类共识：同一分类下高频使用的标签（即使字面未命中，也符合站内习惯）
  if (categoryTags && categoryTagTotal) {
    const dominant = [...categoryTags.entries()]
      .map(([tagName, count]) => ({ tagName, count, ratio: count / categoryTagTotal }))
      .filter((item) => item.ratio >= 0.2 && item.count >= 2)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 3);
    for (const item of dominant) {
      push(item.tagName, {
        name: item.tagName,
        score: 34 + item.ratio * 20,
        source: 'category',
        reason: `分类「${category}」下约 ${Math.round(item.ratio * 100)}% 的书签都用了这个标签`,
      });
    }
  }

  // ③ 语义词典：库还很空时权重更高
  const sparse = isTagVocabularySparse(profile);
  for (const rule of TAG_SEMANTIC_RULES) {
    const hitKey = rule.keys.find((key) => haystack.includes(String(key).toLowerCase()));
    if (!hitKey) continue;
    const existing = candidates.get(normalizeTagKey(rule.tag));
    const base = sparse ? 70 : 46;
    if (!existing) {
      push(rule.tag, {
        name: rule.tag,
        score: base,
        source: 'semantic',
        reason: `名称/描述/域名命中关键词「${hitKey}」`,
      });
    } else if (existing.score < base) {
      push(rule.tag, { name: rule.tag, score: base, source: 'semantic', reason: existing.reason });
    }
  }

  // ③ 域名规则
  for (const rule of TAG_DOMAIN_RULES) {
    if (!rule.match.some((domain) => host.includes(domain) || url.toLowerCase().includes(domain))) continue;
    const existing = candidates.get(normalizeTagKey(rule.tag));
    const base = sparse ? 64 : 44;
    if (!existing || existing.score < base) {
      push(rule.tag, {
        name: rule.tag,
        score: base,
        source: 'domain',
        reason: `域名 ${host || url} 常见于「${rule.tag}」类站点`,
      });
    }
  }

  // ④ 已有标签保留（避免二次推荐把人工标签弄丢）
  for (const tag of currentTags) {
    const key = normalizeTagKey(tag);
    if (!key) continue;
    const existing = candidates.get(key);
    const base = existing ? Math.max(existing.score + 8, 90) : 88;
    push(tag, {
      name: existing?.name || tag,
      score: base,
      source: 'existing',
      reason: '该书签当前已有的标签',
    });
  }

  const categoryKey = normalizeTagKey(category);
  const nameKey = normalizeTagKey(name);

  return [...candidates.values()]
    .filter((item) => {
      const key = normalizeTagKey(item.name);
      if (!key) return false;
      if (key === nameKey) return false; // 标签与书签名重复没有信息量
      if (key === categoryKey) return false; // 标签与分类名重复（分类已经表达了这层信息）
      return true;
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.length - b.name.length;
    })
    .slice(0, Math.max(1, limit));
}

/**
 * 归一化大模型给出的标签：大小写/别名对齐站内词汇表，并过滤无效项（纯函数）。
 *
 * @param {Array<string|{name?:string}>} items
 * @param {object} profile
 * @param {{limit?:number, baseScore?:number}} [options]
 * @returns {Array<{name:string,score:number,source:string,reason:string}>}
 */
export function normalizeAiTagSuggestions(items = [], profile = {}, { limit = 6, baseScore = 92 } = {}) {
  const vocabulary = profile?.tags instanceof Map ? profile.tags : new Map();
  const results = [];
  const seen = new Set();

  for (const item of Array.isArray(items) ? items : []) {
    const raw = cleanText(typeof item === 'string' ? item : item?.name).replace(/^#+/, '');
    if (!raw) continue;
    if (raw.length < TAG_MIN_LENGTH || raw.length > TAG_MAX_LENGTH) continue;
    const key = normalizeTagKey(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const known = vocabulary.get(key);
    results.push({
      name: known?.name || raw,
      score: baseScore - results.length * 2,
      source: known ? 'ai+vocabulary' : 'ai',
      reason: known ? 'AI 推荐，与站内已有标签一致' : 'AI 推荐的新标签',
    });
    if (results.length >= limit) break;
  }
  return results;
}

/**
 * 合并本地与 AI 候选并按分数取前 N（纯函数）。
 *
 * @param {Array} localCandidates
 * @param {Array} aiCandidates
 * @param {{limit?:number}} [options]
 * @returns {{tags:string[], details:Array}}
 */
export function mergeTagCandidates(localCandidates = [], aiCandidates = [], { limit = 5 } = {}) {
  const merged = new Map();
  for (const item of [...localCandidates, ...aiCandidates]) {
    const name = cleanText(item?.name);
    if (!name) continue;
    const key = normalizeTagKey(name);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...item, name });
      continue;
    }
    // 同一标签取更高分，但保留更「站内」的来源说明
    if ((Number(item.score) || 0) > (Number(existing.score) || 0)) {
      merged.set(key, { ...item, name: existing.name, reason: item.reason || existing.reason });
    }
  }
  const details = [...merged.values()]
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0) || a.name.length - b.name.length)
    .slice(0, Math.max(1, limit));
  return { tags: details.map((item) => item.name), details };
}

function normalizeCategorySuggestion(value, categories = []) {
  const name = cleanText(value);
  if (!name) return '';
  const direct = categories.find((category) => cleanText(category.name) === name);
  if (direct) return direct.name;
  const lower = name.toLowerCase();
  const fuzzy = categories.find((category) => {
    const categoryName = cleanText(category.name);
    const categoryLower = categoryName.toLowerCase();
    return categoryLower && (categoryLower.includes(lower) || lower.includes(categoryLower));
  });
  return fuzzy?.name || '';
}

function suggestCategoryLocally(site = {}, categories = []) {
  const names = categories.map((category) => category.name).filter(Boolean);
  const text = [site.name, site.url, site.desc, site.catelog, ...(Array.isArray(site.tags) ? site.tags : [])]
    .map((value) => cleanText(value).toLowerCase())
    .join(' ');
  const rules = [
    [['ai', 'gpt', 'chatgpt', 'claude', 'gemini', '大模型', '人工智能'], ['AI', '人工智能']],
    [['github', 'gitlab', '代码', '编程', '开发', 'api', 'json', '前端', '后端'], ['开发工具', '开发', '工具']],
    [['图床', '图片上传', '图片外链', 'img', 'image', 'photo', '图片', '图像'], ['图床', '图片', '工具']],
    [['网盘', '云盘', 'drive', 'pan', 'cloud', '存储'], ['网盘', '云盘', '资源']],
    [['设计', '素材', '图标', '配色', 'figma', 'svg'], ['设计', '素材']],
    [['视频', '影视', '电影', '音乐', '音频'], ['影音', '影视', '音乐']],
    [['文档', '笔记', '知识库', '博客', '教程'], ['知识', '文档', '教程']],
    [['邮箱', '临时邮箱', '短信', '接码'], ['工具', '邮箱']],
  ];

  for (const [keys, candidates] of rules) {
    if (!keys.some((key) => text.includes(String(key).toLowerCase()))) continue;
    for (const candidate of candidates) {
      const matched = names.find((name) => cleanText(name).toLowerCase().includes(cleanText(candidate).toLowerCase()) || cleanText(candidate).toLowerCase().includes(cleanText(name).toLowerCase()));
      if (matched) return matched;
    }
  }

  return names[0] || '';
}

function parseSuggestedCategory(text, categories = []) {
  const raw = cleanText(text).replace(/```(?:json)?|```/gi, '').trim();
  if (!raw) return '';
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    if (typeof parsed === 'string') return normalizeCategorySuggestion(parsed, categories);
    if (Array.isArray(parsed)) return normalizeCategorySuggestion(parsed[0], categories);
    return normalizeCategorySuggestion(parsed?.category || parsed?.name || parsed?.catelog, categories);
  } catch {
    return normalizeCategorySuggestion(raw.split(/[\n，,、：:]/).map((item) => item.trim()).filter(Boolean)[0], categories);
  }
}

export async function suggestCategoryForSite(env, payload = {}) {
  const site = payload.siteId || payload.id ? await getSite(env, payload.siteId || payload.id) : {
    name: cleanText(payload.name),
    url: cleanText(payload.url),
    desc: cleanText(payload.desc),
    catelog: cleanText(payload.catelog),
    tags: Array.isArray(payload.tags) ? payload.tags : cleanText(payload.tags).split(/[,，、\s]+/).filter(Boolean),
  };
  if (!site || (!site.name && !site.url)) throw new Error('site name or url required');

  const categories = await listCategories(env);
  if (!categories.length) throw new Error('categories required');
  const fallback = suggestCategoryLocally(site, categories);
  const settings = await getAiSettings(env, { includeSecret: true });

  if (settings.enabled !== 'true' || !settings.apiKey) {
    return {
      site,
      category: fallback,
      mode: 'local',
      configured: false,
      message: 'AI 未启用或未配置 API Key，已返回本地规则推荐分类。',
    };
  }

  const categoryNames = categories.map((category) => category.name).filter(Boolean);
  const prompt = [
    '请从“已有分类候选”中为下面这个书签选择最合适的一个分类。',
    '要求：',
    '1. 必须只选择已有分类候选中的一个，不要创造新分类。',
    '2. 只返回 JSON 对象，例如 {"category":"开发工具"}，不要解释，不要 Markdown。',
    '',
    `书签名称：${site.name || ''}`,
    `URL：${site.url || ''}`,
    `当前分类：${site.catelog || ''}`,
    `描述：${site.desc || ''}`,
    `标签：${Array.isArray(site.tags) ? site.tags.join('、') : ''}`,
    `已有分类候选：${categoryNames.join('、')}`,
  ].join('\n');

  try {
    const answer = await callOpenAiCompatible({
      settings: { ...settings, systemPrompt: '你是书签分类整理助手。你只能从给定分类候选中选择一个分类，并且只输出 JSON 对象，例如 {"category":"开发工具"}。不要输出解释、标题、Markdown 或代码块。' },
      message: prompt,
      context: '后台分类推荐任务，不需要回答用户问题。',
    });
    const category = parseSuggestedCategory(answer, categories);
    return {
      site,
      category: category || fallback,
      mode: category ? 'ai' : 'local',
      configured: true,
      raw: answer.slice(0, 500),
    };
  } catch (error) {
    return {
      site,
      category: fallback,
      mode: 'fallback',
      configured: true,
      message: `AI 推荐分类失败，已返回本地规则推荐。错误：${error.message}`,
    };
  }
}

export async function suggestTagsForSite(env, siteInput, { limit = 8 } = {}) {
  const site = typeof siteInput === 'object' && siteInput !== null
    ? {
      name: cleanText(siteInput.name),
      url: cleanText(siteInput.url),
      desc: cleanText(siteInput.desc),
      catelog: cleanText(siteInput.catelog),
      tags: Array.isArray(siteInput.tags) ? siteInput.tags : cleanText(siteInput.tags).split(/[,，、\s]+/).filter(Boolean),
    }
    : await getSite(env, siteInput);
  if (!site || (!site.name && !site.url)) throw new Error('site not found');
  const maxTags = Math.min(12, Math.max(3, Number(limit) || 8));
  // 站内标签画像：拿使用量与「标签×分类」共现，推荐结果才会跟站点既有习惯一致
  const profile = await loadTagProfile(env).catch(() => ({ tags: new Map(), categories: new Map() }));
  const localCandidates = suggestTagsLocally(site, profile, { limit: maxTags + 3 });
  const settings = await getAiSettings(env, { includeSecret: true });

  if (settings.enabled !== 'true' || !settings.apiKey) {
    const merged = mergeTagCandidates(localCandidates, [], { limit: maxTags });
    return {
      site,
      tags: merged.tags,
      details: merged.details,
      mode: 'local',
      configured: false,
      vocabularySize: profile.tags?.size || 0,
      message: 'AI 未启用或未配置 API Key，已按站内标签体系 + 规则推荐。',
    };
  }

  // 按使用量排序的词汇表（带分类共现提示），让模型优先复用站内既有标签
  const categoryHint = cleanText(site.catelog);
  const categoryCommon = categoryHint && profile.categories?.get(categoryHint)
    ? [...profile.categories.get(categoryHint).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => `${name}(${count})`)
      .join('、')
    : '';
  const vocabularyLines = [...(profile.tags?.values() || [])]
    .sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))
    .slice(0, 120)
    .map((item) => `${item.name}(${item.total})`)
    .join('、');

  const prompt = [
    '请为下面这个书签推荐标签。',
    '要求：',
    `1. 最多返回 ${maxTags} 个标签。`,
    '2. 标签要短，2-8 个字，中文优先。',
    '3. 强烈优先复用“站内已有标签”中语义匹配的标签（尽量直接照抄名称与大小写），只有确实没有合适的才创建新标签。',
    '4. 不要输出与分类名完全相同的标签，不要输出书签名称本身作为标签。',
    '5. 每个标签附一个 confidence（0-100）与一行 reason（为何适合）。',
    '6. 只返回 JSON 数组，形如 [{"name":"AI","confidence":92,"reason":"站点为 AI 对话工具"}]，不要解释、不要 Markdown、不要代码块。',
    '',
    `书签名称：${site.name || ''}`,
    `URL：${site.url || ''}`,
    `分类：${site.catelog || ''}`,
    `描述：${site.desc || ''}`,
    `已有标签：${Array.isArray(site.tags) ? site.tags.join('、') : ''}`,
    `站内已有标签（括号内为使用次数）：${vocabularyLines || '暂无'}`,
    categoryCommon ? `同类书签常用标签：${categoryCommon}` : '',
  ].filter(Boolean).join('\n');

  try {
    const answer = await callOpenAiCompatible({
      settings: { ...settings, systemPrompt: '你是书签标签整理助手。你只输出 JSON 数组，元素形如 {"name":"AI","confidence":92,"reason":"..."}。不要输出解释、标题、Markdown 或代码块。' },
      message: prompt,
      context: '后台标签推荐任务，不需要回答用户问题。',
      temperature: 0.1,
    });
    const parsed = parseSuggestedTags(answer, maxTags + 3);
    const aiCandidates = normalizeAiTagSuggestions(parsed, profile, { limit: maxTags + 2 });
    const merged = mergeTagCandidates(localCandidates, aiCandidates, { limit: maxTags });
    return {
      site,
      tags: merged.tags,
      details: merged.details,
      mode: merged.tags.length ? (aiCandidates.length ? 'ai+local' : 'local') : 'local',
      configured: true,
      vocabularySize: profile.tags?.size || 0,
      raw: answer.slice(0, 300),
    };
  } catch (error) {
    const merged = mergeTagCandidates(localCandidates, [], { limit: maxTags });
    return {
      site,
      tags: merged.tags,
      details: merged.details,
      mode: 'fallback',
      configured: true,
      vocabularySize: profile.tags?.size || 0,
      message: `AI 推荐失败，已按站内标签体系 + 规则推荐。错误：${error.message}`,
    };
  }
}

function normalizeTagMergeSuggestions(items = [], tags = [], limit = 8) {
  const names = new Map(tags.map((tag) => [cleanText(tag.name).toLowerCase(), tag]));
  const suggestions = [];
  const seen = new Set();
  for (const item of Array.isArray(items) ? items : []) {
    const sourceName = cleanText(item?.source);
    const targetName = cleanText(item?.target);
    if (!sourceName || !targetName || sourceName === targetName) continue;
    const source = names.get(sourceName.toLowerCase());
    const target = names.get(targetName.toLowerCase());
    if (!source || !target) continue;
    const key = `${source.name}->${target.name}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      source: source.name,
      target: target.name,
      reason: cleanText(item?.reason).slice(0, 120) || '疑似同义或碎片标签',
      confidence: Math.min(100, Math.max(1, Number(item?.confidence) || 70)),
      sourceCount: Number(source.site_count) || 0,
      targetCount: Number(target.site_count) || 0,
    });
    if (suggestions.length >= limit) break;
  }
  return suggestions;
}

function suggestTagMergesLocally(tags = [], limit = 8) {
  const suggestions = [];
  const seen = new Set();
  const add = (source, target, reason, confidence = 70) => {
    if (!source || !target || source.name === target.name) return;
    const key = `${source.name}->${target.name}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push({ source: source.name, target: target.name, reason, confidence, sourceCount: Number(source.site_count) || 0, targetCount: Number(target.site_count) || 0 });
  };
  const rows = tags.map((tag) => ({ ...tag, name: cleanText(tag.name), lower: cleanText(tag.name).toLowerCase() })).filter((tag) => tag.name);
  const find = (names) => rows.find((tag) => names.some((name) => tag.lower === cleanText(name).toLowerCase()));
  const aliasGroups = [
    ['AI', '人工智能', '大模型', 'AIGC', 'ChatGPT', 'GPT'],
    ['图床', '图片上传', '图片外链', '传图', '贴图'],
    ['网盘', '云盘', '网盘资源', '云存储'],
    ['开发', '开发工具', '编程', '代码'],
  ];
  for (const group of aliasGroups) {
    const existing = group.map((name) => find([name])).filter(Boolean);
    if (existing.length < 2) continue;
    const target = existing.slice().sort((a, b) => (Number(b.site_count) || 0) - (Number(a.site_count) || 0) || a.name.length - b.name.length)[0];
    existing.filter((tag) => tag.name !== target.name).forEach((tag) => add(tag, target, '常见同义标签，建议合并到使用更多的主标签', 82));
  }
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i], b = rows[j];
      const compactA = a.lower.replace(/[\s_-]+/g, '');
      const compactB = b.lower.replace(/[\s_-]+/g, '');
      if (!compactA || !compactB || compactA === compactB) {
        const target = (Number(a.site_count) || 0) >= (Number(b.site_count) || 0) ? a : b;
        add(target === a ? b : a, target, '大小写、空格或分隔符差异，建议统一为一个标签', 88);
      } else if (compactA.length >= 2 && compactB.length >= 2 && (compactA.includes(compactB) || compactB.includes(compactA))) {
        const target = compactA.length < compactB.length ? a : b;
        const source = target === a ? b : a;
        add(source, target, '标签名称存在包含关系，建议合并到更简洁的主标签', 68);
      }
      if (suggestions.length >= limit) return suggestions;
    }
  }
  return suggestions.slice(0, limit);
}

export async function suggestTagMerges(env, { limit = 8 } = {}) {
  const tags = await listTags(env);
  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 8));
  const fallback = suggestTagMergesLocally(tags, safeLimit);
  const settings = await getAiSettings(env, { includeSecret: true });
  if (settings.enabled !== 'true' || !settings.apiKey || tags.length < 2) {
    return { suggestions: fallback, mode: 'local', configured: false, message: 'AI 未启用或标签数量不足，已返回本地规则合并建议。' };
  }
  const tagLines = tags.slice(0, 160).map((tag) => `- ${tag.name}（书签数：${Number(tag.site_count) || 0}）`).join('\n');
  const prompt = [
    '请分析下面的标签列表，找出疑似同义、大小写差异、简称/全称重复、碎片化的标签合并建议。',
    '要求：',
    `1. 最多返回 ${safeLimit} 条建议。`,
    '2. source 是建议被合并/删除的源标签，target 是建议保留的目标标签。',
    '3. source 和 target 必须都来自给定标签列表，不能创造新标签。',
    '4. 只返回 JSON 数组，例如 [{"source":"AIGC","target":"AI","reason":"同义标签","confidence":85}]，不要解释，不要 Markdown。',
    '',
    `标签列表：\n${tagLines}`,
  ].join('\n');
  try {
    const answer = await callOpenAiCompatible({
      settings: { ...settings, systemPrompt: '你是标签体系整理助手。你只能输出 JSON 数组，不要输出解释、标题、Markdown 或代码块。' },
      message: prompt,
      context: '后台标签合并建议任务，不需要回答用户问题。',
    });
    const parsed = JSON.parse((answer.match(/\[[\s\S]*\]/) || [answer])[0]);
    const suggestions = normalizeTagMergeSuggestions(parsed, tags, safeLimit);
    return { suggestions: suggestions.length ? suggestions : fallback, mode: suggestions.length ? 'ai' : 'local', configured: true, raw: answer.slice(0, 500) };
  } catch (error) {
    return { suggestions: fallback, mode: 'fallback', configured: true, message: `AI 标签合并建议失败，已返回本地规则建议。错误：${error.message}` };
  }
}

export async function suggestTagsForSites(env, siteIds = [], { limit = 8, batchLimit = 10 } = {}) {
  const ids = [...new Set((Array.isArray(siteIds) ? siteIds : [])
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0))]
    .slice(0, Math.min(50, Math.max(1, Number(batchLimit) || 10)));

  if (!ids.length) throw new Error('siteIds required');

  const results = [];
  for (const id of ids) {
    try {
      const item = await suggestTagsForSite(env, id, { limit });
      results.push({
        siteId: id,
        ok: true,
        site: item.site,
        tags: item.tags || [],
        details: item.details || [],
        mode: item.mode,
        configured: item.configured,
        message: item.message || '',
      });
    } catch (error) {
      results.push({
        siteId: id,
        ok: false,
        tags: [],
        mode: 'error',
        message: error.message,
      });
    }
  }

  return {
    total: ids.length,
    succeeded: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}

export async function testAiSettings(env, payload = {}) {
  const savedSettings = await getAiSettings(env, { includeSecret: true });
  const settings = normalizeAiSettingsPayload(savedSettings, payload);
  if (!settings.apiKey) throw new Error('请先填写 API Key');
  if (!settings.baseUrl) throw new Error('请先填写接口地址');
  if (!settings.model) throw new Error('请先填写模型名称');

  const answer = await callOpenAiCompatible({
    settings,
    message: '请只回复：连接成功',
    context: '这是后台连接测试，不需要检索书签。',
  });

  return {
    ok: true,
    model: settings.model,
    baseUrl: settings.baseUrl,
    answer: answer.slice(0, 120),
  };
}

export async function listAiModels(env, payload = {}) {
  const savedSettings = await getAiSettings(env, { includeSecret: true });
  const settings = normalizeAiSettingsPayload(savedSettings, payload);
  if (!settings.apiKey) throw new Error('请先填写 API Key');
  if (!settings.baseUrl) throw new Error('请先填写接口地址');

  const endpoint = getModelsEndpoint(settings.baseUrl);
  const response = await fetch(endpoint, {
    method: 'GET',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`获取模型列表失败：${response.status} ${text.slice(0, 180)}`);
  }

  const data = await response.json();
  const rawModels = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
  const models = rawModels
    .map((item) => typeof item === 'string' ? item : item?.id || item?.name || item?.model)
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b)));

  return {
    endpoint,
    total: models.length,
    models,
  };
}

// ─── AI 管理助手分析函数 ───

export async function analyzeNoTagSites(env, { limit = 30 } = {}) {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 30));
  const { results: rows } = await env.NAV_DB.prepare(`
    SELECT s.id, s.name, s.url, s.desc, s.catelog, s.visibility
    FROM sites s LEFT JOIN site_tags st ON s.id = st.site_id
    WHERE st.tag_id IS NULL ORDER BY s.create_time DESC LIMIT ?
  `).bind(safeLimit).all();
  const totalRow = await env.NAV_DB.prepare(
    `SELECT COUNT(*) as cnt FROM sites s LEFT JOIN site_tags st ON s.id = st.site_id WHERE st.tag_id IS NULL`
  ).first();
  const totalNoTag = Number(totalRow?.cnt) || 0;
  const sites = (rows || []).map((r) => ({ id: r.id, name: r.name || '', url: r.url || '', desc: r.desc || '', catelog: r.catelog || '', visibility: r.visibility || 'public' }));
  const settings = await getAiSettings(env, { includeSecret: true });
  const aiEnabled = settings.enabled === 'true' && Boolean(settings.apiKey);
  const suggestions = [];
  if (aiEnabled && sites.length > 0) {
    const batch = sites.slice(0, 10);
    const siteLines = batch.map((s, i) => `${i + 1}. ${s.name}（分类：${s.catelog}；URL：${s.url}${s.desc ? '；描述：' + s.desc : ''}）`).join('\n');
    try {
      const answer = await callOpenAiCompatible({
        settings: { ...settings, systemPrompt: '你是书签标签整理助手。只输出 JSON 数组，不要输出解释。' },
        message: `以下书签没有标签。请为每个书签推荐 2-5 个中文标签。\n要求：标签要短(2-8字)；只返回JSON数组，每个元素 {"id": 书签序号, "tags": ["标签1","标签2"]}；不要解释。\n\n${siteLines}`,
        context: '后台无标签书签分析任务。',
      });
      const parsed = JSON.parse((answer.match(/\[[\s\S]*\]/) || [answer])[0]);
      for (const item of Array.isArray(parsed) ? parsed : []) {
        const idx = Number(item?.id) - 1;
        const tags = Array.isArray(item?.tags) ? item.tags.map((t) => cleanText(t)).filter(Boolean).slice(0, 5) : [];
        if (idx >= 0 && idx < batch.length && tags.length) suggestions.push({ siteId: batch[idx].id, siteName: batch[idx].name, tags });
      }
    } catch (e) { console.warn('[ai-admin] analyzeNoTagSites AI failed:', e.message); }
  }
  return { type: 'no-tags', total: totalNoTag, sites, suggestions, aiEnabled };
}

export async function analyzeDuplicateSites(env, { limit = 30 } = {}) {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 30));
  const { results: domainGroups } = await env.NAV_DB.prepare(`
    SELECT REPLACE(REPLACE(REPLACE(LOWER(url), 'https://', ''), 'http://', ''), 'www.', '') as domain_key,
      COUNT(*) as cnt, GROUP_CONCAT(id, ',') as ids
    FROM sites WHERE url IS NOT NULL AND url != ''
    GROUP BY domain_key HAVING cnt > 1 ORDER BY cnt DESC LIMIT ?
  `).bind(safeLimit).all();
  const groups = [];
  for (const row of domainGroups || []) {
    const ids = (row.ids || '').split(',').map(Number).filter(Boolean);
    if (ids.length < 2) continue;
    const { results: sitesInGroup } = await env.NAV_DB.prepare(
      `SELECT id, name, url, desc, catelog, visibility, hits FROM sites WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY hits DESC`
    ).bind(...ids).all();
    groups.push({
      domainKey: row.domain_key || '', count: Number(row.cnt) || 0,
      sites: (sitesInGroup || []).map((s) => ({ id: s.id, name: s.name || '', url: s.url || '', desc: s.desc || '', catelog: s.catelog || '', visibility: s.visibility || 'public', hits: Number(s.hits) || 0 })),
    });
  }
  const settings = await getAiSettings(env, { includeSecret: true });
  const aiEnabled = settings.enabled === 'true' && Boolean(settings.apiKey);
  const suggestions = [];
  if (aiEnabled && groups.length > 0) {
    const batch = groups.slice(0, 8);
    const lines = batch.map((g, gi) => {
      const sl = g.sites.map((s) => `  - [ID:${s.id}] ${s.name}（${s.url}，访问${s.hits}次）`).join('\n');
      return `组${gi + 1}（域名：${g.domainKey}）：\n${sl}`;
    }).join('\n\n');
    try {
      const answer = await callOpenAiCompatible({
        settings: { ...settings, systemPrompt: '你是书签去重助手。只输出 JSON 数组，不要解释。' },
        message: `以下是按域名分组的书签，可能存在重复。请分析每组是否真正重复，建议保留哪个。\n只返回JSON数组，每个元素 {"group":组序号,"isDuplicate":true/false,"keepId":建议保留的ID,"reason":"原因"}。\n\n${lines}`,
        context: '后台重复书签分析任务。',
      });
      const parsed = JSON.parse((answer.match(/\[[\s\S]*\]/) || [answer])[0]);
      for (const item of Array.isArray(parsed) ? parsed : []) {
        const gi = Number(item?.group) - 1;
        if (gi >= 0 && gi < batch.length) suggestions.push({ domainKey: batch[gi].domainKey, isDuplicate: item?.isDuplicate !== false, keepId: Number(item?.keepId) || 0, reason: cleanText(item?.reason).slice(0, 200) || '' });
      }
    } catch (e) { console.warn('[ai-admin] analyzeDuplicateSites AI failed:', e.message); }
  }
  return { type: 'duplicates', total: groups.reduce((sum, g) => sum + g.count, 0), groupCount: groups.length, groups, suggestions, aiEnabled };
}

export async function analyzeSearchGaps(env, { limit = 20 } = {}) {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const { results: rows } = await env.NAV_DB.prepare(`
    SELECT keyword, total_searches, zero_result_count, last_searched_at
    FROM search_terms WHERE zero_result_count > 0
    ORDER BY zero_result_count DESC, total_searches DESC, last_searched_at DESC LIMIT ?
  `).bind(safeLimit).all();
  const gaps = (rows || []).map((r) => ({ keyword: r.keyword || '', totalSearches: Number(r.total_searches) || 0, zeroResultCount: Number(r.zero_result_count) || 0, lastSearchedAt: r.last_searched_at || '' }));
  const settings = await getAiSettings(env, { includeSecret: true });
  const aiEnabled = settings.enabled === 'true' && Boolean(settings.apiKey);
  const suggestions = [];
  if (aiEnabled && gaps.length > 0) {
    const batch = gaps.slice(0, 15);
    const lines = batch.map((g, i) => `${i + 1}. "${g.keyword}"（搜索${g.totalSearches}次，${g.zeroResultCount}次无结果）`).join('\n');
    try {
      const answer = await callOpenAiCompatible({
        settings: { ...settings, systemPrompt: '你是书签补充建议助手。只输出JSON数组，不要解释。推荐真实存在的知名网站。' },
        message: `以下是用户搜索但没有结果的关键词。请为每个关键词建议1-2个值得收录的网站。\n只返回JSON数组，每个元素 {"keyword":"关键词","suggestions":[{"name":"网站名","url":"网址","desc":"一句话描述"}]}。URL必须真实；太模糊的关键词suggestions为空数组。\n\n${lines}`,
        context: '后台搜索缺口分析任务。',
      });
      const parsed = JSON.parse((answer.match(/\[[\s\S]*\]/) || [answer])[0]);
      for (const item of Array.isArray(parsed) ? parsed : []) {
        const kw = cleanText(item?.keyword);
        const sug = Array.isArray(item?.suggestions) ? item.suggestions.map((s) => ({ name: cleanText(s?.name), url: cleanText(s?.url), desc: cleanText(s?.desc).slice(0, 120) })).filter((s) => s.name && s.url) : [];
        if (kw && sug.length) suggestions.push({ keyword: kw, suggestions: sug.slice(0, 3) });
      }
    } catch (e) { console.warn('[ai-admin] analyzeSearchGaps AI failed:', e.message); }
  }
  return { type: 'search-gaps', total: gaps.length, gaps, suggestions, aiEnabled };
}

export async function analyzeCategoryErrors(env, { limit = 20 } = {}) {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const categories = await listCategories(env);
  const categoryNames = new Set(categories.map((c) => c.name).filter(Boolean));
  const { results: allSites } = await env.NAV_DB.prepare(`SELECT id, name, url, desc, catelog, visibility FROM sites ORDER BY id DESC`).all();
  const orphaned = [];
  for (const site of allSites || []) {
    if (!site.catelog || !categoryNames.has(site.catelog)) {
      orphaned.push({ id: site.id, name: site.name || '', url: site.url || '', desc: site.desc || '', catelog: site.catelog || '', issue: site.catelog ? '分类不存在' : '未设置分类' });
    }
  }
  const settings = await getAiSettings(env, { includeSecret: true });
  const aiEnabled = settings.enabled === 'true' && Boolean(settings.apiKey);
  const suggestions = [];
  if (aiEnabled && (allSites || []).length > 0 && categories.length > 1) {
    const sample = (allSites || []).filter((s) => s.catelog && categoryNames.has(s.catelog)).slice(0, safeLimit);
    if (sample.length > 0) {
      const catList = categories.map((c) => c.name).join('、');
      const siteLines = sample.map((s, i) => `${i + 1}. [ID:${s.id}] ${s.name}（当前分类：${s.catelog}；URL：${s.url}${s.desc ? '；描述：' + s.desc : ''}）`).join('\n');
      try {
        const answer = await callOpenAiCompatible({
          settings: { ...settings, systemPrompt: '你是书签分类审核助手。只输出JSON数组，不要解释。' },
          message: `请检查以下书签的分类是否合理。只返回分类可能不当的书签，如果都合理返回空数组[]。\n可用分类：${catList}\n只返回JSON数组，每个元素 {"id":书签ID,"currentCategory":"当前分类","suggestedCategory":"建议分类","reason":"原因"}。suggestedCategory必须是可用分类之一。\n\n${siteLines}`,
          context: '后台分类错误检查任务。',
        });
        const parsed = JSON.parse((answer.match(/\[[\s\S]*\]/) || [answer])[0]);
        for (const item of Array.isArray(parsed) ? parsed : []) {
          const siteId = Number(item?.id);
          const suggested = cleanText(item?.suggestedCategory);
          const current = cleanText(item?.currentCategory);
          const reason = cleanText(item?.reason).slice(0, 200);
          if (siteId && suggested && categoryNames.has(suggested) && suggested !== current) {
            const site = sample.find((s) => s.id === siteId);
            suggestions.push({ siteId, siteName: site?.name || '', currentCategory: current, suggestedCategory: suggested, reason });
          }
        }
      } catch (e) { console.warn('[ai-admin] analyzeCategoryErrors AI failed:', e.message); }
    }
  }
  return { type: 'category-errors', totalOrphaned: orphaned.length, orphaned: orphaned.slice(0, safeLimit), suggestions, aiEnabled };
}

function siteToSource(site, index) {
  return {
    index: index + 1,
    type: 'site',
    title: site?.name || '未命名书签',
    url: site?.url || '',
    snippet: site?.desc || '',
    catelog: site?.catelog || '',
    id: site?.id || null,
  };
}

export async function chatWithAiAssistant(env, request, {
  message,
  previousSites = [],
  history = [],
  adminAuthed = false,
  privateUnlocked = false,
  webSearchPreference = null,
} = {}) {
  const cleanMessage = cleanText(message);
  if (!cleanMessage) throw new Error('Message is required');

  const now = Date.now();
  const realtimeIntent = detectRealtimeIntent(cleanMessage);

  // ① 时间 / 日期 / 星期：服务端直接计算，100% 准确且零 token 成本
  if (realtimeIntent.kind && realtimeIntent.kind !== 'stats') {
    return {
      code: 200,
      data: {
        answer: buildRealtimeAnswer(realtimeIntent, {}, { now }),
        mode: 'local_realtime',
        sites: [],
        sources: [],
        webResults: [],
        configured: false,
        realtime: true,
        usedWebSearch: false,
      },
    };
  }

  // ② 站点统计：直接查库回答，不经过大模型
  if (realtimeIntent.kind === 'stats') {
    const stats = await getSiteStats(env, { adminAuthed, privateUnlocked, now });
    return {
      code: 200,
      data: {
        answer: buildRealtimeAnswer(realtimeIntent, stats, { now, adminAuthed }),
        mode: 'local_stats',
        sites: [],
        sources: [],
        webResults: [],
        configured: false,
        realtime: true,
        usedWebSearch: false,
      },
    };
  }

  const intent = detectBookmarkIntent(cleanMessage);
  const contextSites = await resolveContextSites(env, previousSites, { adminAuthed, privateUnlocked });
  let sites = [];

  // 统计型问题：访问最多、最热门、排行等
  if (intent.asksPopular) {
    try {
      const analytics = await getSiteAnalytics(env, { limit: intent.popularLimit || 5 });
      const topSites = (analytics?.topHits || []).slice(0, intent.popularLimit || 5);
      if (topSites.length) {
        const lines = topSites.map((site, i) => {
          const hits = Number(site.hits) || 0;
          return `${i + 1}. ${site.name}（${site.catelog || '未分类'}）— 累计访问 ${hits} 次\n   ${site.url || '未提供链接'}`;
        });
        return {
          code: 200,
          data: {
            answer: `以下是本站访问量最高的 ${topSites.length} 个书签：\n\n${lines.join('\n\n')}`,
            mode: 'local_strict',
            sites: topSites,
            sources: topSites.map(siteToSource),
            webResults: [],
            configured: false,
            usedWebSearch: false,
          },
        };
      }
    } catch (e) {
      console.warn('[ai] getSiteAnalytics failed:', e.message);
    }
  }

  // ③ 站内检索：短语 + 标签/分类精确 + 关键词扩展，按命中权重排序
  if (intent.hasPronoun && contextSites.length) {
    sites = contextSites;
  } else {
    const vocabulary = await loadSiteVocabulary(env);
    const plan = buildSearchPlan(cleanMessage, vocabulary);
    sites = await retrieveSitesForAi(env, {
      plan,
      limit: (intent.asksList || intent.containsKeyword) ? 24 : 12,
      adminAuthed,
      privateUnlocked,
    });
  }

  if (intent.containsKeyword) {
    sites = filterSitesByContainsKeyword(sites, intent.containsKeyword);
  }

  // ④ 明确的事实型问题：本地严格作答（不消耗额度，也不会幻觉）
  if ((intent.asksCategory || intent.asksUrl || intent.asksExistence || intent.asksList || intent.containsKeyword || intent.hasPronoun) && sites.length) {
    return {
      code: 200,
      data: {
        ...buildLocalAnswer(cleanMessage, sites),
        sites,
        sources: sites.map(siteToSource),
        webResults: [],
        configured: false,
        usedWebSearch: false,
      },
    };
  }

  // ⑤ 联网 / 抓取链接（站外信息单独标注，不与本站书签混淆）
  const searchSettings = await getWebSearchSettings(env, { includeSecret: true });
  const webDecision = decideWebSearch(cleanMessage, {
    siteCount: sites.length,
    settings: searchSettings,
    preference: webSearchPreference,
  });

  let webResults = [];
  let webError = '';
  let webProvider = '';
  if (webDecision.use) {
    const searchResult = await webSearch(env, cleanMessage, { settings: searchSettings });
    webResults = searchResult.results || [];
    webProvider = searchResult.provider || '';
    webError = searchResult.ok ? '' : (searchResult.error || '');
  }

  const urlInMessage = extractFirstUrl(cleanMessage);
  let pageDigest = null;
  if (urlInMessage && !sites.some((site) => site.url === urlInMessage)) {
    const digest = await fetchPageDigest(urlInMessage);
    if (digest.ok) pageDigest = digest;
  }

  const context = formatSiteContext(sites);
  const settings = await getAiSettings(env, { includeSecret: true });

  if (settings.enabled !== 'true' || !settings.apiKey) {
    // 未配置大模型：本地规则回答 + 把联网结果作为补充列出
    const local = buildLocalAnswer(cleanMessage, sites);
    const extra = [];
    if (pageDigest) {
      extra.push(`\n\n（你提到的链接 ${pageDigest.url} 我读取了：${pageDigest.title || '（无标题）'}${pageDigest.description ? ` — ${pageDigest.description}` : ''}）`);
    }
    if (webResults.length) {
      extra.push(`\n\n以下是联网检索结果（非本站书签，请自行判断）：\n\n${webResults.map((item, i) => `${i + 1}. ${item.title}\n   ${item.url}\n   ${item.snippet || ''}`).join('\n\n')}`);
    } else if (webError) {
      extra.push(`\n\n（联网检索未成功：${webError}）`);
    }
    return {
      code: 200,
      data: {
        answer: `${local.answer}${extra.join('')}`,
        mode: local.mode,
        sites,
        sources: sites.map(siteToSource),
        webResults,
        webProvider,
        webError,
        pageDigest,
        configured: false,
        usedWebSearch: webResults.length > 0,
      },
    };
  }

  // ⑥ 组装给模型的上下文：当前时间 + 站点规模 + 站内检索 + 联网结果 + 页面摘要
  const p = getBeijingParts(now);
  const stats = await getSiteStats(env, { adminAuthed, privateUnlocked, now });
  const extraSystem = [
    `时间基准：当前${BEIJING_TIMEZONE_LABEL}为 ${p.yearMonthDay} ${p.weekdayName} ${p.time}（${p.date}）。`
    + '任何涉及今天/明天/昨天/星期几/几号/年份的问题，都必须以此为准，不要使用你训练数据里的日期。',
    `站点规模快照（用于回答“有多少”类问题）：\n${formatStatsForPrompt(stats)}`,
    '站外信息规则：标有“联网检索结果”的内容来自互联网，不是本站书签。引用时必须说明“来自网络”，并按 [1][2] 标注序号；不得把它说成本站收录的条目。',
  ];
  if (pageDigest) {
    extraSystem.push(
      `用户提到的网页（实时抓取）：\n标题：${pageDigest.title || '（无标题）'}\nURL：${pageDigest.url}\n描述：${pageDigest.description || '（无）'}\n正文节选：${pageDigest.text.slice(0, 1200)}`,
    );
    extraSystem.push('如果用户在问这个网页能否收录、该放到哪个分类，请结合上面的站点规模快照里已有的分类，给出具体分类和 2-5 个标签建议，并说明理由；同时提醒最终以管理员判断为准。');
  }
  if (webResults.length) {
    extraSystem.push(`联网检索结果（非本站书签）：\n${formatWebContext(webResults)}`);
  }
  if (webError) {
    extraSystem.push(`注意：本次联网检索失败（${webError}）。不要编造网络上的信息，如实说明联网不可用。`);
  }

  try {
    const answer = await callOpenAiCompatible({
      settings,
      message: cleanMessage,
      context,
      history,
      extraSystem,
      temperature: 0.2,
    });
    return {
      code: 200,
      data: {
        answer,
        mode: 'ai',
        sites,
        sources: sites.map(siteToSource),
        webResults,
        webProvider,
        webError,
        pageDigest,
        configured: true,
        usedWebSearch: webResults.length > 0,
      },
    };
  } catch (error) {
    const fallback = buildLocalAnswer(cleanMessage, sites);
    return {
      code: 200,
      data: {
        answer: `${fallback.answer}\n\n（AI 模型暂时调用失败，已先返回本站检索结果。错误：${error.message}）`,
        mode: 'fallback',
        sites,
        sources: sites.map(siteToSource),
        webResults,
        webProvider,
        webError,
        configured: true,
        usedWebSearch: webResults.length > 0,
      },
    };
  }
}
