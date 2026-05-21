import { escapeHTML } from './utils.js';

export const SUPPORTED_LANGUAGES = [
  { code: 'zh-CN', label: '简体中文', nativeName: '简体中文' },
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'ja', label: '日本語', nativeName: '日本語' },
  { code: 'ko', label: '한국어', nativeName: '한국어' },
  { code: 'fr', label: 'Français', nativeName: 'Français' },
  { code: 'de', label: 'Deutsch', nativeName: 'Deutsch' },
  { code: 'es', label: 'Español', nativeName: 'Español' },
  { code: 'ru', label: 'Русский', nativeName: 'Русский' },
  { code: 'pt', label: 'Português', nativeName: 'Português' },
];

const SUPPORTED_CODES = new Set(SUPPORTED_LANGUAGES.map((item) => item.code));
const LANGUAGE_COOKIE = 'nav_lang';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const I18N_MESSAGES = {
  'zh-CN': {
    pageTitle: '星漫旅站 - 精品网址导航',
    appName: '星漫旅站',
    heroBadge: '精选 · 真实 · 有温度',
    heroTitle: '星漫旅站书签',
    heroSubtitle: '从效率工具到灵感站点，我们亲自挑选、亲手标注，只为帮助你更快找到值得信赖的优质资源。',
    overview: 'Current Overview',
    categoryCount: '{count} 个分类',
    categoryNav: '分类导航',
    all: '全部',
    allBookmarks: '全部收藏',
    sitesCount: '{count} 个网站',
    locked: '已上锁',
    privateLockedHeading: '私人书签已上锁',
    privateLockedDesc: '请输入访问密码后查看该分类；管理员已登录时可直接访问。',
    accessPassword: '访问密码',
    unlock: '解锁',
    addBookmark: '添加新书签',
    submissionClosed: '访客书签提交功能已关闭',
    exitPrivate: '退出私人书签访问',
    adminSortMode: '管理员模式：可拖拽当前列表排序',
    visitBlog: '访问博客',
    adminPanel: '后台管理',
    layoutMode: '布局模式',
    grid: '卡片',
    list: '列表',
    grouped: '分组',
    masonry: '瀑布',
    dashboard: '概览',
    gridTitle: '卡片平铺',
    listTitle: '紧凑列表',
    groupedTitle: '按分类分组',
    masonryTitle: '瀑布流',
    dashboardTitle: '常用/最近/热门',
    default: '默认',
    hot: '热门',
    recent: '最近访问',
    saveDragSort: '保存拖拽排序',
    themeSettings: '主题设置',
    themeDesc: '切换颜色、密度、背景和显示模式',
    reset: '重置',
    themeColor: '主题色',
    density: '卡片密度',
    compact: '紧凑',
    comfortable: '舒适',
    spacious: '宽松',
    bgStyle: '背景风格',
    plain: '纯净',
    soft: '柔和',
    gradient: '渐变',
    paper: '纸感',
    viewMode: '显示模式',
    detail: '详细',
    minimal: '极简',
    homeLayout: '首页布局',
    language: '语言',
    languageSettings: '语言设置',
    languageDesc: '选择网站界面语言',
    aiAssistant: 'AI 书签助理',
    backToTop: '回到顶部',
    footer: '愿你在此找到方向',
    noBookmarks: '当前没有可展示的书签。',
    itemCount: '{count} 个',
    topSites: '常用站点',
    byHits: '按访问次数',
    byVisitTime: '按访问时间',
    newest: '新加入',
    byCreateTime: '按添加时间',
    none: '暂无',
    unnamed: '未命名',
    uncategorized: '未分类',
    noDescription: '暂无描述',
    noLink: '未提供链接',
    hits: '{count} 次',
    visitCount: '访问次数',
    copy: '复制',
    edit: '编辑',
    delete: '删除',
    passwordError: '访问密码错误，请重试。',
    hotBookmarks: '热门书签',
    privateBookmark: '私人书签',
    privatePasswordDesc: '该分类需要访问密码，管理员登录状态下无需输入密码。',
    enterAccessPassword: '请输入访问密码',
    unlockAccess: '解锁访问',
    backHome: '返回首页',
  },
  en: {
    pageTitle: 'StarNav - Curated Web Directory',
    appName: 'StarNav',
    heroBadge: 'Curated · Real · Human',
    heroTitle: 'StarNav Bookmarks',
    heroSubtitle: 'From productivity tools to inspiration sites, we hand-pick and annotate trusted resources for faster discovery.',
    overview: 'Current Overview',
    categoryCount: '{count} categories',
    categoryNav: 'Categories',
    all: 'All',
    allBookmarks: 'All bookmarks',
    sitesCount: '{count} sites',
    locked: 'Locked',
    privateLockedHeading: 'Private bookmarks are locked',
    privateLockedDesc: 'Enter the access password to view this category. Logged-in admins can access it directly.',
    accessPassword: 'Access password',
    unlock: 'Unlock',
    addBookmark: 'Submit bookmark',
    submissionClosed: 'Visitor submissions are disabled',
    exitPrivate: 'Exit private access',
    adminSortMode: 'Admin mode: drag the current list to reorder',
    visitBlog: 'Visit blog',
    adminPanel: 'Admin panel',
    layoutMode: 'Layout mode',
    grid: 'Cards',
    list: 'List',
    grouped: 'Grouped',
    masonry: 'Masonry',
    dashboard: 'Overview',
    gridTitle: 'Card grid',
    listTitle: 'Compact list',
    groupedTitle: 'Group by category',
    masonryTitle: 'Masonry layout',
    dashboardTitle: 'Frequent / Recent / Popular',
    default: 'Default',
    hot: 'Hot',
    recent: 'Recent',
    saveDragSort: 'Save order',
    themeSettings: 'Theme settings',
    themeDesc: 'Switch colors, density, background and display mode',
    reset: 'Reset',
    themeColor: 'Accent color',
    density: 'Card density',
    compact: 'Compact',
    comfortable: 'Comfortable',
    spacious: 'Spacious',
    bgStyle: 'Background',
    plain: 'Plain',
    soft: 'Soft',
    gradient: 'Gradient',
    paper: 'Paper',
    viewMode: 'Display mode',
    detail: 'Detailed',
    minimal: 'Minimal',
    homeLayout: 'Home layout',
    language: 'Language',
    languageSettings: 'Language',
    languageDesc: 'Choose the website interface language',
    aiAssistant: 'AI bookmark assistant',
    backToTop: 'Back to top',
    footer: 'May you find your way here',
    noBookmarks: 'No bookmarks to show.',
    itemCount: '{count}',
    topSites: 'Top sites',
    byHits: 'By visits',
    byVisitTime: 'By visit time',
    newest: 'Newly added',
    byCreateTime: 'By added time',
    none: 'None',
    unnamed: 'Untitled',
    uncategorized: 'Uncategorized',
    noDescription: 'No description',
    noLink: 'No link provided',
    hits: '{count} visits',
    visitCount: 'Visits',
    copy: 'Copy',
    edit: 'Edit',
    delete: 'Delete',
    passwordError: 'Incorrect access password. Please try again.',
    hotBookmarks: 'Hot bookmarks',
    privateBookmark: 'Private bookmarks',
    privatePasswordDesc: 'This category requires an access password. Logged-in admins do not need to enter it.',
    enterAccessPassword: 'Enter access password',
    unlockAccess: 'Unlock access',
    backHome: 'Back home',
  },
  ja: {},
  ko: {},
  fr: {},
  de: {},
  es: {},
  ru: {},
  pt: {},
};

Object.keys(I18N_MESSAGES).forEach((code) => {
  if (code !== 'zh-CN' && Object.keys(I18N_MESSAGES[code]).length === 0) {
    I18N_MESSAGES[code] = { ...I18N_MESSAGES.en };
  }
});

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(cookieHeader.split(';').map((item) => {
    const [key, ...value] = item.trim().split('=');
    return [key, decodeURIComponent(value.join('=') || '')];
  }).filter(([key]) => key));
}

function normalizeLanguage(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (SUPPORTED_CODES.has(raw)) return raw;
  const lower = raw.toLowerCase();
  if (lower === 'zh' || lower.startsWith('zh-')) return 'zh-CN';
  const match = SUPPORTED_LANGUAGES.find((item) => item.code.toLowerCase() === lower || lower.startsWith(`${item.code.toLowerCase()}-`));
  return match?.code || '';
}

function detectFromAcceptLanguage(header = '') {
  return header.split(',')
    .map((part) => normalizeLanguage(part.split(';')[0]))
    .find(Boolean) || 'zh-CN';
}

export function resolveI18n(request) {
  const url = new URL(request.url);
  const queryLang = normalizeLanguage(url.searchParams.get('lang'));
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const cookieLang = normalizeLanguage(cookies[LANGUAGE_COOKIE]);
  const lang = queryLang || cookieLang || detectFromAcceptLanguage(request.headers.get('Accept-Language') || '');
  const messages = I18N_MESSAGES[lang] || I18N_MESSAGES['zh-CN'];
  const t = (key, params = {}) => {
    const template = messages[key] || I18N_MESSAGES['zh-CN'][key] || key;
    return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
  };
  return {
    lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    queryLang,
    t,
    th: (key, params = {}) => escapeHTML(t(key, params)),
    languages: SUPPORTED_LANGUAGES,
  };
}

export function buildLanguageCookie(lang) {
  return `${LANGUAGE_COOKIE}=${encodeURIComponent(lang)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function buildLanguageUrl(requestUrl, lang) {
  const url = new URL(requestUrl);
  url.searchParams.set('lang', lang);
  return `${url.pathname}${url.search}`;
}