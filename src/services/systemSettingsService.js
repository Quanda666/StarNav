import { cleanText, sanitizeImageUrl, sanitizeUrl } from '../lib/utils.js';
import { getSetting, setSetting } from './settingsService.js';

const SYSTEM_SETTING_PREFIX = 'system.';

export const DEFAULT_SYSTEM_SETTINGS = {
  siteName: '星漫旅站',
  siteSubtitle: '收藏、整理与发现你的常用网站',
  siteIcon: '/pwa-icon.svg',
  footerText: '',
  backgroundImage: '',
  heroVisible: 'true',
  blogVisible: 'true',
  blogUrl: 'https://blog.110995.xyz/',
  blogLabel: '访问博客',
  defaultLayout: '',
  defaultAccent: '',
  announcementEnabled: 'false',
  announcementTitle: '系统公告',
  announcementMarkdown: '',
  announcementVersion: '1',
  announcementShowOnce: 'true',
  announcementButtonText: '我知道了',
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
  announcementTitle: 80,
  announcementMarkdown: 5000,
  announcementVersion: 40,
  announcementButtonText: 40,
};

function boolString(value, fallback = 'false') {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase()) ? 'true' : 'false';
}

function limitText(value, key) {
  const limit = FIELD_LIMITS[key] || 1000;
  return cleanText(value).slice(0, limit);
}

export async function getSystemSettings(env) {
  const settings = {};

  for (const [key, defaultValue] of Object.entries(DEFAULT_SYSTEM_SETTINGS)) {
    settings[key] = await getSetting(env, `${SYSTEM_SETTING_PREFIX}${key}`, defaultValue);
  }

  settings.siteName = limitText(settings.siteName, 'siteName') || DEFAULT_SYSTEM_SETTINGS.siteName;
  settings.siteSubtitle = limitText(settings.siteSubtitle, 'siteSubtitle');
  settings.siteIcon = sanitizeImageUrl(settings.siteIcon) || sanitizeUrl(settings.siteIcon) || DEFAULT_SYSTEM_SETTINGS.siteIcon;
  settings.footerText = limitText(settings.footerText, 'footerText');
  settings.backgroundImage = sanitizeImageUrl(settings.backgroundImage) || '';
  settings.heroVisible = boolString(settings.heroVisible, 'true');
  settings.blogVisible = boolString(settings.blogVisible, 'true');
  settings.blogUrl = sanitizeUrl(settings.blogUrl) || DEFAULT_SYSTEM_SETTINGS.blogUrl;
  settings.blogLabel = limitText(settings.blogLabel, 'blogLabel') || DEFAULT_SYSTEM_SETTINGS.blogLabel;
  settings.defaultLayout = limitText(settings.defaultLayout, 'defaultLayout');
  settings.defaultAccent = limitText(settings.defaultAccent, 'defaultAccent');
  settings.announcementEnabled = boolString(settings.announcementEnabled);
  settings.announcementTitle = limitText(settings.announcementTitle, 'announcementTitle') || DEFAULT_SYSTEM_SETTINGS.announcementTitle;
  settings.announcementMarkdown = limitText(settings.announcementMarkdown, 'announcementMarkdown');
  settings.announcementVersion = limitText(settings.announcementVersion, 'announcementVersion') || DEFAULT_SYSTEM_SETTINGS.announcementVersion;
  settings.announcementShowOnce = boolString(settings.announcementShowOnce, 'true');
  settings.announcementButtonText = limitText(settings.announcementButtonText, 'announcementButtonText') || DEFAULT_SYSTEM_SETTINGS.announcementButtonText;

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
    blogVisible: boolString(payload.blogVisible, 'true'),
    blogUrl: sanitizeUrl(payload.blogUrl) || DEFAULT_SYSTEM_SETTINGS.blogUrl,
    blogLabel: limitText(payload.blogLabel, 'blogLabel') || DEFAULT_SYSTEM_SETTINGS.blogLabel,
    defaultLayout: limitText(payload.defaultLayout, 'defaultLayout'),
    defaultAccent: limitText(payload.defaultAccent, 'defaultAccent'),
    announcementEnabled: boolString(payload.announcementEnabled),
    announcementTitle: limitText(payload.announcementTitle, 'announcementTitle') || DEFAULT_SYSTEM_SETTINGS.announcementTitle,
    announcementMarkdown: limitText(payload.announcementMarkdown, 'announcementMarkdown'),
    announcementVersion: limitText(payload.announcementVersion, 'announcementVersion') || String(Number(current.announcementVersion || 0) + 1),
    announcementShowOnce: boolString(payload.announcementShowOnce, 'true'),
    announcementButtonText: limitText(payload.announcementButtonText, 'announcementButtonText') || DEFAULT_SYSTEM_SETTINGS.announcementButtonText,
  };

  for (const [key, value] of Object.entries(next)) {
    await setSetting(env, `${SYSTEM_SETTING_PREFIX}${key}`, value);
  }

  return next;
}