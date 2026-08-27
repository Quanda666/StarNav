import { cleanText, sanitizeImageUrl, sanitizeUrl } from '../lib/utils.js';
import { listSettings, setSetting } from './settingsService.js';

const SYSTEM_SETTING_PREFIX = 'system.';

export const DEFAULT_SYSTEM_SETTINGS = {
  siteName: '星漫旅站',
  siteSubtitle: '收藏、整理与发现你的常用网站',
  siteIcon: '/pwa-icon.svg',
  footerText: '',
  backgroundImage: '',
  heroVisible: 'true',
  publicSubmissionEnabled: 'true',
  privateBookmarksVisible: 'true',
  blogVisible: 'true',
  blogUrl: 'https://blog.110995.xyz/',
  blogLabel: '访问博客',
  defaultLayout: '',
  defaultAccent: '',
  defaultSkin: '',
  defaultDensity: '',
  announcementEnabled: 'false',
  announcementTitle: '系统公告',
  announcementMarkdown: '',
  announcementVersion: '1',
  announcementShowOnce: 'true',
  announcementButtonText: '我知道了',
  announcementEntries: '[]',
  timelineEntries: '[]',
};

const FIELD_LIMITS = {
  siteName: 80,
  siteSubtitle: 160,
  siteIcon: 500,
  footerText: 200,
  backgroundImage: 500,
  blogUrl: 500,
  blogLabel: 80,
  defaultLayout: 20,
  defaultAccent: 20,
  defaultSkin: 20,
  defaultDensity: 20,
  announcementTitle: 80,
  announcementMarkdown: 5000,
  announcementVersion: 40,
  announcementButtonText: 40,
  announcementEntries: 30000,
  timelineEntries: 30000,
};

export const ANNOUNCEMENT_TAGS = ['更新', '维护', '活动', '提示', '重要'];

// 允许 YYYY-MM-DD 或 YYYY-MM-DDTHH:mm（时间线按中国时区解释）
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;

function safeJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function sanitizeAnnouncementEntries(value) {
  const items = safeJsonArray(value);
  const entries = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const title = cleanText(raw.title || '').slice(0, 80);
    const content = cleanText(raw.content || '').slice(0, 5000);
    if (!title && !content) continue;
    const date = DATE_PATTERN.test(String(raw.date || '')) ? String(raw.date) : new Date().toISOString().slice(0, 10);
    const tag = ANNOUNCEMENT_TAGS.includes(raw.tag) ? raw.tag : '提示';
    entries.push({
      id: cleanText(raw.id || '').slice(0, 40) || `a_${Date.now().toString(36)}_${entries.length}`,
      title: title || '公告',
      date,
      tag,
      content,
    });
  }
  entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return entries.slice(0, 100);
}

export function sanitizeTimelineEntries(value) {
  const items = safeJsonArray(value);
  const entries = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const title = cleanText(raw.title || '').slice(0, 120);
    const content = cleanText(raw.content || '').slice(0, 2000);
    if (!title && !content) continue;
    const date = DATE_PATTERN.test(String(raw.date || '')) ? String(raw.date) : new Date().toISOString().slice(0, 10);
    entries.push({
      id: cleanText(raw.id || '').slice(0, 40) || `t_${Date.now().toString(36)}_${entries.length}`,
      date,
      title: title || '更新',
      content,
    });
  }
  entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return entries.slice(0, 200);
}

function boolString(value, fallback = 'false') {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase()) ? 'true' : 'false';
}

function limitText(value, key) {
  const limit = FIELD_LIMITS[key] || 1000;
  return cleanText(value).slice(0, limit);
}

export async function getSystemSettings(env) {
  // 一次性读取全部 system.* 设置，避免按 key 逐条查询（原先每次渲染需 19 次串行 D1 往返）。
  const stored = {};
  try {
    const rows = await listSettings(env, SYSTEM_SETTING_PREFIX);
    for (const row of rows) {
      stored[String(row.key).slice(SYSTEM_SETTING_PREFIX.length)] = row.value;
    }
  } catch (error) {
    console.warn(`[systemSettings] 批量读取失败，回退默认值: ${error?.message || error}`);
  }

  const settings = {};
  for (const [key, defaultValue] of Object.entries(DEFAULT_SYSTEM_SETTINGS)) {
    const value = stored[key];
    settings[key] = value === undefined || value === null ? defaultValue : value;
  }

  settings.siteName = limitText(settings.siteName, 'siteName') || DEFAULT_SYSTEM_SETTINGS.siteName;
  settings.siteSubtitle = limitText(settings.siteSubtitle, 'siteSubtitle');
  settings.siteIcon = sanitizeImageUrl(settings.siteIcon) || sanitizeUrl(settings.siteIcon) || DEFAULT_SYSTEM_SETTINGS.siteIcon;
  settings.footerText = limitText(settings.footerText, 'footerText');
  settings.backgroundImage = sanitizeImageUrl(settings.backgroundImage) || '';
  settings.heroVisible = boolString(settings.heroVisible, 'true');
  settings.publicSubmissionEnabled = boolString(settings.publicSubmissionEnabled, 'true');
  settings.privateBookmarksVisible = boolString(settings.privateBookmarksVisible, 'true');
  settings.blogVisible = boolString(settings.blogVisible, 'true');
  settings.blogUrl = sanitizeUrl(settings.blogUrl) || DEFAULT_SYSTEM_SETTINGS.blogUrl;
  settings.blogLabel = limitText(settings.blogLabel, 'blogLabel') || DEFAULT_SYSTEM_SETTINGS.blogLabel;
  settings.defaultLayout = limitText(settings.defaultLayout, 'defaultLayout');
  settings.defaultAccent = limitText(settings.defaultAccent, 'defaultAccent');
  settings.defaultSkin = limitText(settings.defaultSkin, 'defaultSkin');
  settings.defaultDensity = limitText(settings.defaultDensity, 'defaultDensity');
  settings.announcementEnabled = boolString(settings.announcementEnabled);
  settings.announcementTitle = limitText(settings.announcementTitle, 'announcementTitle') || DEFAULT_SYSTEM_SETTINGS.announcementTitle;
  settings.announcementMarkdown = limitText(settings.announcementMarkdown, 'announcementMarkdown');
  settings.announcementVersion = limitText(settings.announcementVersion, 'announcementVersion') || DEFAULT_SYSTEM_SETTINGS.announcementVersion;
  settings.announcementShowOnce = boolString(settings.announcementShowOnce, 'true');
  settings.announcementButtonText = limitText(settings.announcementButtonText, 'announcementButtonText') || DEFAULT_SYSTEM_SETTINGS.announcementButtonText;
  settings.announcementEntries = sanitizeAnnouncementEntries(settings.announcementEntries);
  settings.timelineEntries = sanitizeTimelineEntries(settings.timelineEntries);

  return settings;
}

export async function updateSystemSettings(env, payload = {}) {
  const current = await getSystemSettings(env);
  const next = {
    siteName: limitText(payload.siteName, 'siteName') || DEFAULT_SYSTEM_SETTINGS.siteName,
    siteSubtitle: limitText(payload.siteSubtitle, 'siteSubtitle'),
    siteIcon: sanitizeImageUrl(payload.siteIcon) || sanitizeUrl(payload.siteIcon) || DEFAULT_SYSTEM_SETTINGS.siteIcon,
    footerText: limitText(payload.footerText, 'footerText'),
    backgroundImage: sanitizeImageUrl(payload.backgroundImage) || '',
    heroVisible: boolString(payload.heroVisible, 'true'),
    publicSubmissionEnabled: boolString(payload.publicSubmissionEnabled, 'true'),
    privateBookmarksVisible: boolString(payload.privateBookmarksVisible, 'true'),
    blogVisible: boolString(payload.blogVisible, 'true'),
    blogUrl: sanitizeUrl(payload.blogUrl) || DEFAULT_SYSTEM_SETTINGS.blogUrl,
    blogLabel: limitText(payload.blogLabel, 'blogLabel') || DEFAULT_SYSTEM_SETTINGS.blogLabel,
    defaultLayout: limitText(payload.defaultLayout, 'defaultLayout'),
    defaultAccent: limitText(payload.defaultAccent, 'defaultAccent'),
    defaultSkin: limitText(payload.defaultSkin, 'defaultSkin'),
    defaultDensity: limitText(payload.defaultDensity, 'defaultDensity'),
    announcementEnabled: boolString(payload.announcementEnabled),
    announcementTitle: limitText(payload.announcementTitle, 'announcementTitle') || DEFAULT_SYSTEM_SETTINGS.announcementTitle,
    announcementMarkdown: limitText(payload.announcementMarkdown, 'announcementMarkdown'),
    announcementVersion: limitText(payload.announcementVersion, 'announcementVersion') || String(Number(current.announcementVersion || 0) + 1),
    announcementShowOnce: boolString(payload.announcementShowOnce, 'true'),
    announcementButtonText: limitText(payload.announcementButtonText, 'announcementButtonText') || DEFAULT_SYSTEM_SETTINGS.announcementButtonText,
    announcementEntries: sanitizeAnnouncementEntries(
      payload.announcementEntries !== undefined ? payload.announcementEntries : current.announcementEntries,
    ),
    timelineEntries: sanitizeTimelineEntries(
      payload.timelineEntries !== undefined ? payload.timelineEntries : current.timelineEntries,
    ),
  };

  for (const [key, value] of Object.entries(next)) {
    await setSetting(env, `${SYSTEM_SETTING_PREFIX}${key}`, Array.isArray(value) ? JSON.stringify(value) : value);
  }

  return next;
}