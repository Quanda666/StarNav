import { isAdminAuthenticated } from '../lib/auth.js';
import { escapeHTML, htmlResponse, isSubmissionEnabled, sanitizeImageUrl, sanitizeUrl } from '../lib/utils.js';
import { resolveI18n } from '../lib/i18n.js';
import { canListSite, getAllSites } from '../services/siteService.js';
import { getCategoryTree } from '../services/categoryService.js';
import { getSystemSettings } from '../services/systemSettingsService.js';
import {
  PRIVATE_BOOKMARK_CATEGORY,
  buildClearPrivateBookmarkAccessCookie,
  buildPrivateBookmarkAccessCookie,
  createPrivateBookmarkAccess,
  hasPrivateBookmarkAccess,
  isPrivateBookmarkCategory,
  revokeCurrentPrivateBookmarkAccess,
  verifyPrivateBookmarkPassword,
} from '../services/privateBookmarkService.js';

import { renderPrivateBookmarkUnlockBox, renderPrivateBookmarkPasswordPage } from './home/privateAccess.js';
import { flattenCategories, getAncestorNames, renderCategoryLinks } from './home/categories.js';
import { renderSiteCard, renderGroupedSites, renderDashboardSites, sortSitesForView, renderSortLinks } from './home/siteCard.js';
import { renderAnnouncementModal } from './home/announcement.js';
import { renderFrontAdminModal, renderSubmitModal } from './home/modals.js';
import { frontAdminScript, dragScript, myUsageScript } from './home/scripts.js';
import { homeCssVersion } from './home/css.js';

export async function renderHomePage(request, env, ctx) {
  const i18n = resolveI18n(request);
  const { lang, dir, t, th } = i18n;
  const url = new URL(request.url);
  const catalog = (url.searchParams.get('catalog') || '').trim();
  const requestedSort = (url.searchParams.get('sort') || '').trim();
  const sortMode = ['hot', 'recent'].includes(requestedSort) ? requestedSort : '';
  const tagFilter = (url.searchParams.get('tag') || '').trim();
  const isPrivateCatalog = isPrivateBookmarkCategory(catalog);
  const [adminAuthed, visitorPrivateAccess, systemSettings] = await Promise.all([
    isAdminAuthenticated(request, env),
    hasPrivateBookmarkAccess(request, env),
    getSystemSettings(env),
  ]);
  const currentSpaceSlug = '';
  const [sites, categoryTree] = await Promise.all([
    getAllSites(env),
    getCategoryTree(env),
  ]);

  if (request.method === 'POST') {
    const clonedRequest = request.clone();
    const formData = await clonedRequest.formData();
    if (formData.get('_action') === 'logout-private') {
      await revokeCurrentPrivateBookmarkAccess(request, env);
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/',
          'Set-Cookie': buildClearPrivateBookmarkAccessCookie(),
        },
      });
    }
  }

  if (isPrivateCatalog && !adminAuthed && request.method === 'POST') {
    const formData = await request.formData();
    const password = formData.get('password') || '';
    const requestedDuration = formData.get('duration') || '12h';
    if (await verifyPrivateBookmarkPassword(env, password)) {
      const { token, ttl, duration } = await createPrivateBookmarkAccess(env, { duration: requestedDuration });
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/?catalog=${encodeURIComponent(PRIVATE_BOOKMARK_CATEGORY)}`,
          'Set-Cookie': buildPrivateBookmarkAccessCookie(token, { maxAge: ttl, duration }),
        },
      });
    }

    return renderPrivateBookmarkPasswordPage({ catalog, error: t('passwordError'), i18n });
  }

  const privateUnlocked = adminAuthed || visitorPrivateAccess;
  const visibleSites = sites.filter((site) => canListSite(site, { adminAuthed, privateUnlocked }));
  const flatCategories = flattenCategories(categoryTree);
  const categoryNames = flatCategories.map((item) => item.name);
  const datalistCategoryNames = categoryNames.filter((name) => !isPrivateBookmarkCategory(name));
  const catalogExists = Boolean(catalog && categoryNames.includes(catalog));
  const privateCatalogLocked = catalogExists && isPrivateCatalog && !privateUnlocked;
  const baseCurrentSites = catalogExists
    ? (privateCatalogLocked ? [] : visibleSites.filter((site) => site.catelog === catalog))
    : visibleSites;
  const taggedCurrentSites = tagFilter
    ? baseCurrentSites.filter((site) => Array.isArray(site.tags) && site.tags.includes(tagFilter))
    : baseCurrentSites;
  const canDragSort = adminAuthed && !sortMode && !tagFilter && !privateCatalogLocked;
  const currentSites = sortSitesForView(taggedCurrentSites, sortMode);
  const submissionEnabled = isSubmissionEnabled(env, systemSettings);
  const privateBookmarksVisible = systemSettings.privateBookmarksVisible !== 'false';
  const siteName = systemSettings.siteName || th('appName');
  const siteSubtitle = systemSettings.siteSubtitle || th('heroSubtitle');
  const siteIcon = sanitizeImageUrl(systemSettings.siteIcon) || sanitizeUrl(systemSettings.siteIcon) || '/pwa-icon.svg';
  const footerText = systemSettings.footerText || th('footer');
  const pageBackgroundImage = sanitizeImageUrl(systemSettings.backgroundImage) || '';
  const defaultLayout = ['grid', 'list', 'grouped', 'masonry', 'dashboard'].includes(systemSettings.defaultLayout) ? systemSettings.defaultLayout : 'grid';
  const defaultAccent = ['blue', 'green', 'purple', 'rose', 'amber'].includes(systemSettings.defaultAccent) ? systemSettings.defaultAccent : 'blue';
  const defaultSkin = ['paper', 'starry', 'minimal', 'dark', 'glass', 'dock', 'notion'].includes(systemSettings.defaultSkin) ? systemSettings.defaultSkin : 'paper';
  const defaultDensity = ['compact', 'comfortable', 'spacious'].includes(systemSettings.defaultDensity) ? systemSettings.defaultDensity : 'comfortable';
  const blogVisible = systemSettings.blogVisible !== 'false';
  const blogUrl = sanitizeUrl(systemSettings.blogUrl) || 'https://blog.110995.xyz/';
  const blogLabel = systemSettings.blogLabel || th('visitBlog');

  const announcement = {
    enabled: systemSettings.announcementEnabled === 'true' && Boolean(systemSettings.announcementMarkdown),
    title: systemSettings.announcementTitle || '系统公告',
    markdown: systemSettings.announcementMarkdown || '',
    version: systemSettings.announcementVersion || '1',
    showOnce: systemSettings.announcementShowOnce !== 'false',
    buttonText: systemSettings.announcementButtonText || '我知道了',
  };

  const allLinkHref = '?';
  const spaceSwitcher = '';

  const categoryLinks = renderCategoryLinks(categoryTree, {
    catalog,
    catalogExists,
    space: currentSpaceSlug,
    expandedNames: new Set(catalogExists ? getAncestorNames(categoryTree, catalog) : []),
    privateUnlocked,
    privateBookmarksVisible,
  });

  const datalistOptions = datalistCategoryNames.map((cat) => `<option value="${escapeHTML(cat)}">`).join('');
  const sortLabel = sortMode === 'hot' ? t('hotBookmarks') : (sortMode === 'recent' ? t('recent') : '');
  const tagLabel = tagFilter ? `#${tagFilter}` : '';
  const heading = privateCatalogLocked
    ? `${PRIVATE_BOOKMARK_CATEGORY} · ${t('locked')}`
    : (catalogExists
      ? `${catalog}${tagLabel ? ` · ${tagLabel}` : ''}${sortLabel ? ` · ${sortLabel}` : ''} · ${t('sitesCount', { count: currentSites.length })}`
      : `${tagLabel || sortLabel || '全部收藏'}${tagLabel && sortLabel ? ` · ${sortLabel}` : ''} · ${t('sitesCount', { count: currentSites.length })}`);
  const sortLinks = renderSortLinks({ catalog, tag: tagFilter, sortMode, space: currentSpaceSlug, disabled: privateCatalogLocked, i18n });
  const siteIndex = visibleSites.map((site) => ({
    id: site.id,
    name: site.name || '',
    url: sanitizeUrl(site.url) || site.url || '',
    catelog: site.catelog || '',
    logo: sanitizeImageUrl(site.logo) || '',
  }));
  const siteIndexJson = JSON.stringify(siteIndex).replace(/</g, '\\u003c');
  const gridContent = privateCatalogLocked
    ? renderPrivateBookmarkUnlockBox(catalog, i18n)
    : currentSites.map((site) => renderSiteCard(site, canDragSort, adminAuthed, i18n)).join('');
  const groupedContent = privateCatalogLocked
    ? ''
    : renderGroupedSites(currentSites, adminAuthed, i18n, canDragSort, { hideHead: Boolean(catalog) });
  const dashboardContent = privateCatalogLocked
    ? ''
    : renderDashboardSites(currentSites, adminAuthed, i18n);

  return htmlResponse(`<!DOCTYPE html>
<html lang="${escapeHTML(lang)}" dir="${escapeHTML(dir)}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHTML(siteName)}</title>
  <meta name="theme-color" content="${escapeHTML(defaultAccent === 'green' ? '#265c44' : (defaultAccent === 'purple' ? '#5b3b8c' : (defaultAccent === 'rose' ? '#9f3758' : (defaultAccent === 'amber' ? '#8a5a16' : '#254267'))))}">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="${escapeHTML(siteName)}">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="apple-touch-icon" href="${escapeHTML(siteIcon)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet"/>
  <link rel="icon" href="${escapeHTML(siteIcon)}"/>
  <link rel="alternate icon" href="https://img.12388888.xyz/file/logo/ktVNDfcM.png" type="image/png"/>
  <link rel="stylesheet" href="/static/home.css?v=${homeCssVersion}"/>
  <script>
    (function(){try{const root=document.documentElement;const saved=localStorage.getItem('nav:theme');const prefersDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;if(saved==='dark'||(!saved&&prefersDark)){root.classList.add('dark')}var defaultAccent='${escapeHTML(defaultAccent)}',defaultLayout='${escapeHTML(defaultLayout)}',defaultBg='${pageBackgroundImage ? 'image' : 'soft'}';root.dataset.accent=localStorage.getItem('nav:accent')||defaultAccent;root.dataset.density=localStorage.getItem('nav:density')||'${escapeHTML(defaultDensity)}';root.dataset.bg=localStorage.getItem('nav:bg')||defaultBg;root.dataset.view=localStorage.getItem('nav:view')||'detail';root.dataset.layout=localStorage.getItem('nav:layout')||defaultLayout;root.dataset.skin=localStorage.getItem('nav:skin')||'${escapeHTML(defaultSkin)}';var bgImage=localStorage.getItem('nav:bgImage')||'${escapeHTML(pageBackgroundImage)}';if(bgImage)document.documentElement.style.setProperty('--nav-bg-image','url('+bgImage+')');var now=new Date(),m=now.getMonth()+1,d=now.getDate();var festival='';if(m===1&&d<=3)festival='newyear';else if(m===2&&d===14)festival='valentine';else if(m===12&&(d>=24&&d<=25))festival='christmas';else if(m===10&&d===31)festival='halloween';else if(m===5&&d>=1&&d<=3)festival='labor';root.dataset.festival=festival}catch(e){}})();
  </script>
</head>
<body class="nav-shell">
  <header class="nav-topbar">
    <button type="button" id="sidebarToggle" class="nav-icon-btn nav-open-sidebar" aria-label="打开分类">☰</button>
    <button type="button" id="expandSidebar" class="nav-icon-btn nav-expand-sidebar" title="展开分类">☰</button>
    <a href="/" class="nav-brand">${escapeHTML(siteName)}</a>
    <div class="nav-search">
      <input id="searchInput" type="search" placeholder="搜索书签…" autocomplete="off" enterkeyhint="search">
      <kbd>⌘K</kbd>
      <div id="searchHistoryBox" class="nav-search-history hidden">
        <div class="nav-search-history-head">
          <span>最近搜索</span>
          <button type="button" id="clearSearchHistory">清空</button>
        </div>
        <div id="searchHistoryList"></div>
      </div>
    </div>
    <div class="nav-top-actions">
      ${submissionEnabled ? `<button type="button" id="addSiteBtnSidebar" class="nav-add-btn" title="${th('addBookmark')}" aria-label="${th('addBookmark')}">+</button>` : ''}
      <button type="button" id="themeToggle" class="nav-icon-btn" title="切换深色/浅色" aria-label="切换深色/浅色模式">🌙</button>
      <button type="button" id="floatingAiToggle" class="nav-icon-btn" title="${th('aiAssistant')}" aria-expanded="false" aria-controls="floatingAiPanel">AI</button>
      <div class="nav-more">
        <button type="button" id="navMoreToggle" class="nav-icon-btn" title="更多" aria-expanded="false" aria-controls="navMoreMenu">⋯</button>
        <div id="navMoreMenu" class="nav-more-menu hidden">
          <button type="button" id="floatingThemeToggle" class="nav-more-item" title="${th('themeSettings')}" aria-expanded="false" aria-controls="floatingThemePanel"><span class="nav-more-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></span>${th('themeSettings')}</button>
          ${blogVisible && blogUrl ? `<a href="${escapeHTML(blogUrl)}" target="_blank" rel="noopener noreferrer" class="nav-more-item"><span class="nav-more-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg></span>${escapeHTML(blogLabel)}</a>` : ''}
          <a href="/admin" target="_blank" class="nav-more-item"><span class="nav-more-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.7.9 1.2 1.6 1.3H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></span>${th('adminPanel')}${adminAuthed ? '<span class="nav-admin-dot" title="管理员已认证"></span>' : ''}</a>
          ${visitorPrivateAccess && !adminAuthed ? `<form method="post" action="/" class="nav-more-form"><input type="hidden" name="_action" value="logout-private"><button type="submit" class="nav-more-item"><span class="nav-more-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg></span>${th('exitPrivate')}</button></form>` : ''}
        </div>
        <div id="floatingThemePanel" class="theme-studio floating-theme-panel hidden" role="dialog" aria-labelledby="themeStudioTitle">
          <div class="theme-studio-head">
            <div>
              <h3 id="themeStudioTitle">${th('themeSettings')}</h3>
              <p>选一套气质，再微调颜色和排版</p>
            </div>
            <button type="button" id="resetThemePrefs" class="theme-studio-reset">${th('reset')}</button>
          </div>
          <div class="theme-studio-body">
            <section class="theme-studio-block">
              <div class="theme-studio-label">皮肤</div>
              <div class="theme-skin-grid" id="themePresetGroup">
                <button type="button" class="theme-preset-btn theme-skin" data-preset="paper" title="纸感：暖底、圆角磁贴">
                  <span class="theme-skin-preview tsp-paper" aria-hidden="true"><span class="tsp-bar"></span><span class="tsp-body"><span class="tsp-side"></span><span class="tsp-cards"><i></i><i></i><i></i></span></span></span>
                  <span class="theme-skin-name">纸感</span>
                </button>
                <button type="button" class="theme-preset-btn theme-skin" data-preset="starry" title="星空：夜空底、玻璃卡">
                  <span class="theme-skin-preview tsp-starry" aria-hidden="true"><span class="tsp-bar"></span><span class="tsp-body"><span class="tsp-side"></span><span class="tsp-cards"><i></i><i></i><i></i></span></span></span>
                  <span class="theme-skin-name">星空</span>
                </button>
                <button type="button" class="theme-preset-btn theme-skin" data-preset="minimal" title="极简：白底细线、列表">
                  <span class="theme-skin-preview tsp-minimal" aria-hidden="true"><span class="tsp-bar"></span><span class="tsp-body"><span class="tsp-side"></span><span class="tsp-cards tsp-list"><i></i><i></i><i></i></span></span></span>
                  <span class="theme-skin-name">极简</span>
                </button>
                <button type="button" class="theme-preset-btn theme-skin" data-preset="dark" title="暗黑：炭黑、高对比">
                  <span class="theme-skin-preview tsp-dark" aria-hidden="true"><span class="tsp-bar"></span><span class="tsp-body"><span class="tsp-side"></span><span class="tsp-cards"><i></i><i></i><i></i></span></span></span>
                  <span class="theme-skin-name">暗黑</span>
                </button>
                <button type="button" class="theme-preset-btn theme-skin" data-preset="glass" title="玻璃：雾面、宽松">
                  <span class="theme-skin-preview tsp-glass" aria-hidden="true"><span class="tsp-bar"></span><span class="tsp-body"><span class="tsp-side"></span><span class="tsp-cards"><i></i><i></i><i></i></span></span></span>
                  <span class="theme-skin-name">玻璃</span>
                </button>
                <button type="button" class="theme-preset-btn theme-skin" data-preset="dock" title="Dock：大图标宫格">
                  <span class="theme-skin-preview tsp-dock" aria-hidden="true"><span class="tsp-bar"></span><span class="tsp-body"><span class="tsp-side"></span><span class="tsp-cards tsp-icons"><i></i><i></i><i></i><i></i></span></span></span>
                  <span class="theme-skin-name">Dock</span>
                </button>
                <button type="button" class="theme-preset-btn theme-skin" data-preset="notion" title="Notion：纸纹、左边线">
                  <span class="theme-skin-preview tsp-notion" aria-hidden="true"><span class="tsp-bar"></span><span class="tsp-body"><span class="tsp-side"></span><span class="tsp-cards tsp-list"><i></i><i></i><i></i></span></span></span>
                  <span class="theme-skin-name">Notion</span>
                </button>
              </div>
            </section>
            <section class="theme-studio-block">
              <div class="theme-studio-label">${th('themeColor')}</div>
              <div class="theme-swatch-row" data-theme-group="accent">
                <button type="button" class="theme-choice theme-swatch" style="--swatch:#254267" data-theme-key="accent" data-theme-value="blue" title="星空蓝"></button>
                <button type="button" class="theme-choice theme-swatch" style="--swatch:#3c976d" data-theme-key="accent" data-theme-value="green" title="森林绿"></button>
                <button type="button" class="theme-choice theme-swatch" style="--swatch:#8b5cf6" data-theme-key="accent" data-theme-value="purple" title="暮光紫"></button>
                <button type="button" class="theme-choice theme-swatch" style="--swatch:#e0527d" data-theme-key="accent" data-theme-value="rose" title="蔷薇红"></button>
                <button type="button" class="theme-choice theme-swatch" style="--swatch:#d97706" data-theme-key="accent" data-theme-value="amber" title="琥珀金"></button>
              </div>
            </section>
            <section class="theme-studio-block">
              <div class="theme-studio-row">
                <div class="theme-studio-label">${th('density')}</div>
                <div class="theme-chip-row" data-theme-group="density">
                  <button type="button" class="theme-chip" data-theme-key="density" data-theme-value="compact">${th('compact')}</button>
                  <button type="button" class="theme-chip" data-theme-key="density" data-theme-value="comfortable">${th('comfortable')}</button>
                  <button type="button" class="theme-chip" data-theme-key="density" data-theme-value="spacious">${th('spacious')}</button>
                </div>
              </div>
              <div class="theme-studio-row">
                <div class="theme-studio-label">${th('bgStyle')}</div>
                <div class="theme-chip-row" data-theme-group="bg">
                  <button type="button" class="theme-chip" data-theme-key="bg" data-theme-value="plain">${th('plain')}</button>
                  <button type="button" class="theme-chip" data-theme-key="bg" data-theme-value="soft">${th('soft')}</button>
                  <button type="button" class="theme-chip" data-theme-key="bg" data-theme-value="gradient">${th('gradient')}</button>
                  <button type="button" class="theme-chip" data-theme-key="bg" data-theme-value="paper">${th('paper')}</button>
                  <button type="button" class="theme-chip" data-theme-key="bg" data-theme-value="image">图片</button>
                </div>
              </div>
              <div id="bgImageUrlBox" class="theme-bg-url hidden">
                <input id="bgImageUrlInput" type="url" placeholder="粘贴背景图片 URL">
              </div>
              <div class="theme-studio-row">
                <div class="theme-studio-label">${th('viewMode')}</div>
                <div class="theme-chip-row" data-theme-group="view">
                  <button type="button" class="theme-chip" data-theme-key="view" data-theme-value="detail">${th('detail')}</button>
                  <button type="button" class="theme-chip" data-theme-key="view" data-theme-value="minimal">${th('minimal')}</button>
                </div>
              </div>
              <div class="theme-studio-row">
                <div class="theme-studio-label">${th('homeLayout')}</div>
                <div class="theme-chip-row" data-theme-group="layout">
                  <button type="button" class="theme-chip" data-theme-key="layout" data-theme-value="grid">卡片</button>
                  <button type="button" class="theme-chip" data-theme-key="layout" data-theme-value="list">列表</button>
                  <button type="button" class="theme-chip" data-theme-key="layout" data-theme-value="grouped">分组</button>
                  <button type="button" class="theme-chip" data-theme-key="layout" data-theme-value="masonry">瀑布</button>
                  <button type="button" class="theme-chip" data-theme-key="layout" data-theme-value="dashboard">概览</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </header>
  <div id="mobileOverlay" class="mobile-overlay"></div>
  <aside id="sidebar" class="nav-sidebar mobile-sidebar">
    ${spaceSwitcher}
    <div class="nav-cat-list" id="categoryList">
      <div class="nav-all-row">
        <a href="${escapeHTML(allLinkHref)}" class="category-all-button category-link">${th('all')}</a>
        <button id="collapseSidebar" class="nav-icon-btn nav-collapse-sidebar" title="收起分类">‹</button>
        <button id="closeSidebar" class="nav-icon-btn nav-close-sidebar" aria-label="关闭分类">×</button>
      </div>
      ${categoryLinks}
    </div>
  </aside>

  <main class="nav-main main-content">
    <section class="nav-workspace">
      <div id="myUsageSection" class="nav-usage hidden">
        <div class="usage-card" data-usage="favorites">
          <div class="usage-card-head">
            <h3>收藏</h3>
            <button type="button" data-usage-clear="favorites">清空</button>
          </div>
          <div data-usage-list="favorites" class="usage-chip-row"></div>
          <p class="usage-empty">悬停书签点星号即可收藏</p>
        </div>
        <div class="usage-card" data-usage="recent">
          <div class="usage-card-head">
            <h3>最近</h3>
            <button type="button" data-usage-clear="recent">清空</button>
          </div>
          <div data-usage-list="recent" class="usage-chip-row"></div>
          <p class="usage-empty">访问后会出现在这里</p>
        </div>
      </div>
      <div class="nav-toolbar">
        <h2 id="listHeading">${escapeHTML(heading)}</h2>
        <div class="nav-toolbar-actions">
          <div class="layout-mode-bar" aria-label="${th('layoutMode')}">
            <button type="button" class="layout-toggle" data-layout="grid" title="${th('gridTitle')}">${th('grid')}</button>
            <button type="button" class="layout-toggle" data-layout="grouped" title="${th('groupedTitle')}">${th('grouped')}</button>
            <button type="button" class="layout-toggle" data-layout="list" title="${th('listTitle')}">${th('list')}</button>
            <button type="button" class="layout-toggle" data-layout="dashboard" title="${th('dashboardTitle')}">${th('dashboard')}</button>
          </div>
          ${sortLinks}
          ${canDragSort ? `<button id="saveOrderBtn" class="nav-save-order" disabled>${th('saveDragSort')}</button>` : ''}
        </div>
      </div>
      <div id="sitesPanel" class="nav-sites">
        <div id="layoutGridPanel" class="layout-panel active">
          <div id="sitesGrid" class="site-tile-grid">
            ${gridContent}
          </div>
        </div>
        <div id="layoutGroupedPanel" class="layout-panel">
          ${privateCatalogLocked ? renderPrivateBookmarkUnlockBox(catalog, i18n) : groupedContent}
        </div>
        <div id="layoutDashboardPanel" class="layout-panel">
          ${privateCatalogLocked ? renderPrivateBookmarkUnlockBox(catalog, i18n) : dashboardContent}
        </div>
      </div>
    </section>
    <footer class="nav-footer">© ${new Date().getFullYear()} ${escapeHTML(siteName)} · ${escapeHTML(footerText)}</footer>
  </main>

  <div class="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3 floating-actions">
    <div id="floatingAiPanel" class="floating-ai-panel hidden w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-primary-100/60 bg-white/95 shadow-2xl">
      <div class="flex items-center justify-between border-b border-primary-100/60 px-4 py-3">
        <div>
          <h3 class="text-sm font-semibold text-gray-900">AI 书签助理</h3>
          <p class="text-xs text-gray-500">优先检索本站书签，再生成回复</p>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" id="toggleAiFullscreen" class="rounded-full px-2 py-1 text-xs text-gray-500 hover:bg-primary-50" aria-label="全屏显示 AI 助理" title="全屏显示">全屏</button>
          <button type="button" id="closeAiPanel" class="rounded-full px-2 py-1 text-gray-500 hover:bg-primary-50" aria-label="关闭 AI 助理">×</button>
        </div>
      </div>
      <div id="aiChatBody" class="ai-chat-body space-y-3 p-4">
        <div class="ai-message assistant">你好，我是本站 AI 书签助理。你可以问我：“有没有图片压缩工具？”、“某个网站放在哪个分类？”、“帮我找设计相关书签”。</div>
      </div>
      <form id="aiChatForm" class="border-t border-primary-100/60 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <div class="flex gap-2">
          <input id="aiChatInput" class="min-w-0 flex-1 rounded-xl border border-primary-100 px-3 py-2 text-sm outline-none focus:border-primary-300" placeholder="输入你想找的书签或问题..." autocomplete="off">
          <button id="aiSendBtn" type="submit" class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white">发送</button>
        </div>
        <p class="mt-2 text-[11px] text-gray-500">未配置模型时会自动使用本地书签检索结果回答。</p>
      </form>
    </div>
    <button type="button" id="backToTopBtn" class="nav-backtop hidden" title="${th('backToTop')}" aria-label="${th('backToTop')}">↑</button>
  </div>

  ${submissionEnabled ? renderSubmitModal(datalistOptions) : ''}
  ${adminAuthed ? renderFrontAdminModal(datalistOptions, i18n) : ''}
  ${announcement.enabled ? renderAnnouncementModal(announcement) : ''}

<script>
window.__SITE_INDEX__ = ${siteIndexJson};
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('/sw.js').then(function(reg){
      reg.addEventListener('updatefound',function(){
        var newWorker=reg.installing;
        if(!newWorker)return;
        newWorker.addEventListener('statechange',function(){
          if(newWorker.state==='installed'&&navigator.serviceWorker.controller){
            showUpdateToast(reg);
          }
        });
      });
    }).catch(function(err){console.warn('[pwa] sw register failed',err)});
    var refreshing=false;
    navigator.serviceWorker.addEventListener('controllerchange',function(){if(!refreshing){refreshing=true;window.location.reload()}});
  });
}
function showUpdateToast(reg){
  if(document.getElementById('pwaUpdateToast'))return;
  var toast=document.createElement('div');
  toast.id='pwaUpdateToast';
  toast.className='fixed bottom-20 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 rounded-2xl border border-primary-100/60 bg-white/95 px-5 py-3 shadow-2xl text-sm';
  toast.innerHTML='<span class="text-gray-700">站点已更新</span><button id="pwaUpdateBtn" class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white">刷新</button><button id="pwaUpdateDismiss" class="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>';
  document.body.appendChild(toast);
  document.getElementById('pwaUpdateBtn').addEventListener('click',function(){if(reg.waiting){reg.waiting.postMessage({type:'SKIP_WAITING'})}});
  document.getElementById('pwaUpdateDismiss').addEventListener('click',function(){toast.remove()});
}
var deferredInstallPrompt=null;
var INSTALL_DISMISS_KEY='nav:install-dismiss-until';
var INSTALL_DISMISS_DAYS=7;
function isInstallDismissed(){try{var v=Number(localStorage.getItem(INSTALL_DISMISS_KEY));return Number.isFinite(v)&&v>Date.now()}catch(e){return false}}
function dismissInstall(days){try{var ms=(Number(days)||INSTALL_DISMISS_DAYS)*86400000;localStorage.setItem(INSTALL_DISMISS_KEY,String(Date.now()+ms))}catch(e){}}
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstallPrompt=e;if(!isInstallDismissed())scheduleInstallHint()});
function scheduleInstallHint(){
  var announcement=document.getElementById('announcementModal');
  if(announcement&&!announcement.classList.contains('hidden')){
    var observer=new MutationObserver(function(mutations){
      mutations.forEach(function(m){
        if(announcement.classList.contains('hidden')){observer.disconnect();setTimeout(showInstallHint,600)}
      });
    });
    observer.observe(announcement,{attributes:true,attributeFilter:['class']});
  }else{
    setTimeout(showInstallHint,800);
  }
}
function showInstallHint(){
  if(document.getElementById('pwaInstallModal'))return;
  var modal=document.createElement('div');
  modal.id='pwaInstallModal';
  modal.className='announcement-modal';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.innerHTML='<div class="announcement-card"><div class="announcement-head"><div class="flex items-center gap-3"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-2xl">📲</div><div><h2 class="text-lg font-semibold text-gray-900">安装到桌面</h2><p class="mt-0.5 text-xs text-gray-500">添加到主屏幕，离线也能快速访问</p></div></div><button type="button" class="pwa-install-close rounded-full px-2 py-1 text-gray-500 hover:bg-primary-50" aria-label="关闭">×</button></div><div class="announcement-body"><p>把本站添加到桌面或主屏幕后，可以像原生应用一样一键打开，并在弱网/离线时使用已缓存的书签数据。</p><ul><li>支持 Chrome、Edge、Firefox 等浏览器</li><li>iOS Safari 用户：点击"分享"→"添加到主屏幕"</li><li>占用空间极小，可随时通过系统卸载</li></ul></div><div class="announcement-actions"><button type="button" class="pwa-install-later rounded-xl border border-primary-100 bg-white px-5 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50">7 天内不再提示</button><button type="button" class="pwa-install-now rounded-xl bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700">立即安装</button></div></div>';
  document.body.appendChild(modal);
  function close(remember){if(remember)dismissInstall(INSTALL_DISMISS_DAYS);modal.remove()}
  modal.querySelector('.pwa-install-close').addEventListener('click',function(){close(false)});
  modal.querySelector('.pwa-install-later').addEventListener('click',function(){close(true)});
  modal.querySelector('.pwa-install-now').addEventListener('click',function(){if(!deferredInstallPrompt)return close(false);deferredInstallPrompt.prompt();deferredInstallPrompt.userChoice.then(function(){deferredInstallPrompt=null;close(false)})});
  modal.addEventListener('click',function(e){if(e.target===modal)close(false)});
}
window.addEventListener('appinstalled',function(){var m=document.getElementById('pwaInstallModal');if(m)m.remove();deferredInstallPrompt=null});
</script>
<script>
window.addEventListener('storage',function(e){
  if(e.key==='nav:front-refresh'&&e.newValue){
    console.log('[sync] front refresh requested',e.newValue);
    try{
      var u=new URL(window.location.href);
      u.searchParams.set('__refresh',Date.now().toString());
      window.location.replace(u.toString());
    }catch(err){
      window.location.href=window.location.pathname+'?__refresh='+Date.now();
    }
  }
});

document.addEventListener('DOMContentLoaded',function(){
  // PWA 状态保存与恢复逻辑
  const STATE_KEY = 'nav:pwa-state';
  const isStandalone = window.matchMedia('(display-mode:standalone)').matches || window.navigator.standalone === true;

  function saveCurrentState() {
    try {
      const state = {
        scrollY: window.scrollY,
        searchVal: document.getElementById('searchInput')?.value || '',
        timestamp: Date.now()
      };
      sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[pwa] failed to save state', e);
    }
  }

  function restoreCurrentState() {
    try {
      const raw = sessionStorage.getItem(STATE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);
      sessionStorage.removeItem(STATE_KEY);
      
      if (Date.now() - state.timestamp > 1800000) return; // 30分钟过期

      const searchInput = document.getElementById('searchInput');
      if (searchInput && state.searchVal) {
        searchInput.value = state.searchVal;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      if (state.scrollY) {
        setTimeout(function() {
          window.scrollTo({ top: state.scrollY, behavior: 'instant' });
        }, 100);
      }
    } catch (e) {
      console.warn('[pwa] failed to restore state', e);
    }
  }

  // 恢复状态
  restoreCurrentState();

  // 如果是 standalone 模式，拦截所有书签点击，强制在当前窗口打开，并附加当前 URL 参数
  if (isStandalone) {
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a');
      if (link) {
        const href = link.getAttribute('href');
        
        // 拦截书签跳转链接（以 /go/ 开头）
        if (href && href.startsWith('/go/')) {
          e.preventDefault();
          saveCurrentState();
          
          // 将当前的 catalog, tag, sort 参数附加到 /go/ 链接后面
          const currentUrl = new URL(window.location.href);
          const catalog = currentUrl.searchParams.get('catalog') || '';
          const tag = currentUrl.searchParams.get('tag') || '';
          const sort = currentUrl.searchParams.get('sort') || '';
          
          const goUrl = new URL(href, window.location.origin);
          if (catalog) goUrl.searchParams.set('from_catalog', catalog);
          if (tag) goUrl.searchParams.set('from_tag', tag);
          if (sort) goUrl.searchParams.set('from_sort', sort);
          
          window.location.href = goUrl.pathname + goUrl.search;
        }
      }
    }, { capture: true });
  }

  const announcementModal=document.getElementById('announcementModal');
  if(announcementModal){
    const key='nav:announcement:'+announcementModal.dataset.version;
    const todayKey=key+':today';
    const today=new Date().toISOString().slice(0,10);
    const hiddenToday=localStorage.getItem(todayKey)===today;
    if(!hiddenToday){
      announcementModal.classList.remove('hidden');
    }
    function closeAnnouncement(){
      announcementModal.classList.add('hidden');
    }
    function closeAnnouncementToday(){
      announcementModal.classList.add('hidden');
      localStorage.setItem(todayKey,today);
    }
    announcementModal.querySelectorAll('.announcement-close').forEach(function(btn){btn.addEventListener('click',closeAnnouncement)});
    announcementModal.querySelectorAll('.announcement-close-today').forEach(function(btn){btn.addEventListener('click',closeAnnouncementToday)});
    announcementModal.addEventListener('click',function(e){if(e.target===announcementModal)closeAnnouncement()});
  }
  const sidebar=document.getElementById('sidebar'),overlay=document.getElementById('mobileOverlay');
  const themeToggle=document.getElementById('themeToggle');
  const themeMeta=document.querySelector('meta[name="theme-color"]');
  const themeDefaults={accent:'${escapeHTML(defaultAccent)}',density:'${escapeHTML(defaultDensity)}',bg:'${pageBackgroundImage ? 'image' : 'soft'}',view:'detail',layout:'${escapeHTML(defaultLayout)}'};
  const themeColors={blue:'#254267',green:'#265c44',purple:'#5b3b8c',rose:'#9f3758',amber:'#8a5a16'};
  function getThemePref(key){return localStorage.getItem('nav:'+key)||themeDefaults[key]}
  function setThemePref(key,value){document.documentElement.dataset[key]=value;localStorage.setItem('nav:'+key,value);if(key==='accent'&&themeMeta)themeMeta.setAttribute('content',themeColors[value]||themeColors.blue);if(key==='layout')applyLayout(value);updateThemeControls()}
  function updateThemeToggle(){if(themeToggle)themeToggle.textContent=document.documentElement.classList.contains('dark')?'☀️':'🌙'}
  function updateThemeControls(){document.querySelectorAll('[data-theme-key]').forEach(function(btn){btn.classList.toggle('active',document.documentElement.dataset[btn.dataset.themeKey]===btn.dataset.themeValue)});document.querySelectorAll('.layout-toggle').forEach(function(btn){btn.classList.toggle('active',document.documentElement.dataset.layout===btn.dataset.layout)});document.querySelectorAll('.theme-preset-btn').forEach(function(btn){btn.classList.toggle('active',(document.documentElement.dataset.skin||'paper')===btn.dataset.preset)})}
  function applyLayout(layout){const normalized=['grid','list','grouped','masonry','dashboard'].includes(layout)?layout:'grid';document.documentElement.dataset.layout=normalized;document.getElementById('layoutGridPanel')?.classList.toggle('active',['grid','list','masonry'].includes(normalized));document.getElementById('layoutGroupedPanel')?.classList.toggle('active',normalized==='grouped');document.getElementById('layoutDashboardPanel')?.classList.toggle('active',normalized==='dashboard')}
  Object.keys(themeDefaults).forEach(function(key){document.documentElement.dataset[key]=getThemePref(key)});
  if(themeMeta)themeMeta.setAttribute('content',themeColors[getThemePref('accent')]||themeColors.blue);
  applyLayout(getThemePref('layout'));
  updateThemeToggle();
  updateThemeControls();
  themeToggle?.addEventListener('click',function(){const nextDark=!document.documentElement.classList.contains('dark');document.documentElement.classList.toggle('dark',nextDark);localStorage.setItem('nav:theme',nextDark?'dark':'light');updateThemeToggle()});
  document.querySelectorAll('[data-theme-key]').forEach(function(btn){btn.addEventListener('click',function(){setThemePref(this.dataset.themeKey,this.dataset.themeValue)})});
  document.querySelectorAll('.layout-toggle').forEach(function(btn){btn.addEventListener('click',function(){setThemePref('layout',this.dataset.layout)})});
  const defaultSkinName='${escapeHTML(defaultSkin)}';
  document.getElementById('resetThemePrefs')?.addEventListener('click',function(){Object.keys(themeDefaults).forEach(function(key){localStorage.removeItem('nav:'+key);document.documentElement.dataset[key]=themeDefaults[key]});localStorage.removeItem('nav:theme');localStorage.removeItem('nav:skin');document.documentElement.classList.remove('dark');applyPresetSkin(defaultSkinName);if(themeMeta)themeMeta.setAttribute('content',themeColors[themeDefaults.accent]||themeColors.blue);updateThemeToggle();updateThemeControls()});
  const themePresets={paper:{dark:false,accent:'amber',density:'comfortable',bg:'soft',view:'detail',layout:'grid'},starry:{dark:true,accent:'blue',density:'comfortable',bg:'gradient',view:'detail',layout:'grid'},minimal:{dark:false,accent:'blue',density:'compact',bg:'plain',view:'minimal',layout:'list'},dark:{dark:true,accent:'blue',density:'comfortable',bg:'plain',view:'detail',layout:'grid'},glass:{dark:false,accent:'purple',density:'spacious',bg:'gradient',view:'detail',layout:'grid'},dock:{dark:false,accent:'green',density:'compact',bg:'plain',view:'minimal',layout:'grid'},notion:{dark:false,accent:'amber',density:'comfortable',bg:'paper',view:'detail',layout:'list'}};
  function applyPresetSkin(name){document.documentElement.dataset.skin=name||'paper';localStorage.setItem('nav:skin',name||'paper')}
  applyPresetSkin(localStorage.getItem('nav:skin')||defaultSkinName);
  document.querySelectorAll('.theme-preset-btn').forEach(function(btn){btn.addEventListener('click',function(){const preset=themePresets[this.dataset.preset];if(!preset)return;const isDark=preset.dark;document.documentElement.classList.toggle('dark',isDark);localStorage.setItem('nav:theme',isDark?'dark':'light');applyPresetSkin(this.dataset.preset);updateThemeToggle();Object.keys(themeDefaults).forEach(function(key){if(preset[key]!==undefined){setThemePref(key,preset[key])}});updateThemeControls()})});
  const bgImageUrlBox=document.getElementById('bgImageUrlBox');
  const bgImageUrlInput=document.getElementById('bgImageUrlInput');
  function updateBgImageUI(){const isBgImage=document.documentElement.dataset.bg==='image';bgImageUrlBox?.classList.toggle('hidden',!isBgImage);if(isBgImage){const saved=localStorage.getItem('nav:bgImage')||'';if(bgImageUrlInput)bgImageUrlInput.value=saved;if(saved)document.body.style.setProperty('--nav-bg-image','url('+saved+')')}}
  updateBgImageUI();
  bgImageUrlInput?.addEventListener('change',function(){const url=this.value.trim();localStorage.setItem('nav:bgImage',url);if(url){document.body.style.setProperty('--nav-bg-image','url('+url+')')}else{document.body.style.removeProperty('--nav-bg-image')}});
  const origSetThemePref=setThemePref;
  setThemePref=function(key,value){origSetThemePref(key,value);if(key==='bg')updateBgImageUI()};
  (function(){const savedBg=localStorage.getItem('nav:bg');const savedBgImage=localStorage.getItem('nav:bgImage');if(savedBg==='image'&&savedBgImage){document.body.style.setProperty('--nav-bg-image','url('+savedBgImage+')')}})();
  const navMoreToggle=document.getElementById('navMoreToggle');
  const navMoreMenu=document.getElementById('navMoreMenu');
  function closeNavMoreMenu(){navMoreMenu?.classList.add('hidden');navMoreToggle?.setAttribute('aria-expanded','false')}
  navMoreToggle?.addEventListener('click',function(e){e.stopPropagation();const opened=!navMoreMenu?.classList.contains('hidden');navMoreMenu?.classList.toggle('hidden',opened);this.setAttribute('aria-expanded',String(!opened));if(!opened)closeFloatingThemePanel()});
  navMoreMenu?.addEventListener('click',function(e){e.stopPropagation()});
  const floatingThemeToggle=document.getElementById('floatingThemeToggle');
  const floatingThemePanel=document.getElementById('floatingThemePanel');
  const floatingAiToggle=document.getElementById('floatingAiToggle');
  const floatingAiPanel=document.getElementById('floatingAiPanel');
  const closeAiPanelBtn=document.getElementById('closeAiPanel');
  const toggleAiFullscreenBtn=document.getElementById('toggleAiFullscreen');
  const aiChatBody=document.getElementById('aiChatBody');
  const aiChatForm=document.getElementById('aiChatForm');
  const aiChatInput=document.getElementById('aiChatInput');
  const aiSendBtn=document.getElementById('aiSendBtn');
  const backToTopBtn=document.getElementById('backToTopBtn');
  function closeFloatingThemePanel(){floatingThemePanel?.classList.add('hidden');floatingThemeToggle?.setAttribute('aria-expanded','false')}
  function updateAiFullscreenButton(){if(!toggleAiFullscreenBtn||!floatingAiPanel)return;const full=floatingAiPanel.classList.contains('ai-fullscreen');toggleAiFullscreenBtn.textContent=full?'还原':'全屏';toggleAiFullscreenBtn.title=full?'还原窗口':'全屏显示';toggleAiFullscreenBtn.setAttribute('aria-label',full?'还原 AI 助理窗口':'全屏显示 AI 助理')}
  function openFloatingAiPanel(){closeFloatingThemePanel();floatingAiPanel?.classList.remove('hidden');floatingAiToggle?.setAttribute('aria-expanded','true');updateAiFullscreenButton();setTimeout(()=>aiChatInput?.focus(),80)}
  function closeFloatingAiPanel(){floatingAiPanel?.classList.add('hidden');floatingAiPanel?.classList.remove('ai-fullscreen');floatingAiToggle?.setAttribute('aria-expanded','false');updateAiFullscreenButton()}
  function toggleAiFullscreen(){if(!floatingAiPanel)return;floatingAiPanel.classList.toggle('ai-fullscreen');floatingAiPanel.classList.remove('hidden');floatingAiToggle?.setAttribute('aria-expanded','true');updateAiFullscreenButton();setTimeout(()=>aiChatInput?.focus(),80)}
  floatingThemeToggle?.addEventListener('click',function(e){e.stopPropagation();const opened=!floatingThemePanel?.classList.contains('hidden');floatingThemePanel?.classList.toggle('hidden',opened);this.setAttribute('aria-expanded',String(!opened));if(!opened){closeFloatingAiPanel();closeNavMoreMenu()}});
  floatingAiToggle?.addEventListener('click',function(e){e.stopPropagation();const opened=!floatingAiPanel?.classList.contains('hidden');if(opened){closeFloatingAiPanel()}else{openFloatingAiPanel()}});
  closeAiPanelBtn?.addEventListener('click',function(e){e.stopPropagation();closeFloatingAiPanel()});
  toggleAiFullscreenBtn?.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toggleAiFullscreen()});
  floatingThemePanel?.addEventListener('click',function(e){e.stopPropagation()});
  floatingAiPanel?.addEventListener('click',function(e){e.stopPropagation()});
  document.addEventListener('click',function(){closeFloatingThemePanel();closeFloatingAiPanel();closeNavMoreMenu()});
  function isEditableTarget(target){return target&&(/^(INPUT|TEXTAREA|SELECT)$/i.test(target.tagName)||target.isContentEditable)}
  function focusSiteSearch(selectText=false){if(!search)return false;search.focus({preventScroll:true});if(selectText)search.select();search.scrollIntoView({block:'center',behavior:'smooth'});return true}
  let activeResultIndex=-1;
  function getVisibleResultCards(){const gridEl=document.getElementById('sitesGrid');if(!gridEl)return[];return [...gridEl.querySelectorAll('.site-card:not(.hidden)')]}
  function clearActiveResult(){document.querySelectorAll('.site-card.result-active').forEach(el=>el.classList.remove('result-active'));activeResultIndex=-1}
  function setActiveResult(index){const cards=getVisibleResultCards();if(!cards.length){activeResultIndex=-1;return}const safeIdx=((index%cards.length)+cards.length)%cards.length;document.querySelectorAll('.site-card.result-active').forEach(el=>el.classList.remove('result-active'));const target=cards[safeIdx];if(!target)return;target.classList.add('result-active');activeResultIndex=safeIdx;target.scrollIntoView({block:'nearest',behavior:'smooth'})}
  function openActiveResult(){const cards=getVisibleResultCards();if(activeResultIndex<0||activeResultIndex>=cards.length)return false;const card=cards[activeResultIndex];const link=card?.querySelector('a[href]');if(!link)return false;const href=link.getAttribute('href')||'';if(!href||href==='#')return false;window.open(href,link.target||'_blank','noopener,noreferrer');return true}
  document.addEventListener('keydown',function(e){const key=e.key||'';if(key==='Escape'){closeFloatingThemePanel();closeFloatingAiPanel();closeNavMoreMenu();closeModal();clearActiveResult();if(document.activeElement===search)search.blur();return}if((e.ctrlKey||e.metaKey)&&key.toLowerCase()==='k'){e.preventDefault();closeFloatingThemePanel();closeFloatingAiPanel();focusSiteSearch(true);return}if(key==='/'&&!isEditableTarget(e.target)&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();closeFloatingThemePanel();closeFloatingAiPanel();focusSiteSearch(false);return}if((key==='ArrowDown'||key==='ArrowUp'||key==='Enter')&&document.activeElement===search){const cards=getVisibleResultCards();if(!cards.length)return;if(key==='ArrowDown'){e.preventDefault();setActiveResult(activeResultIndex<0?0:activeResultIndex+1)}else if(key==='ArrowUp'){e.preventDefault();setActiveResult(activeResultIndex<0?cards.length-1:activeResultIndex-1)}else if(key==='Enter'){if(openActiveResult()){e.preventDefault()}}}});
  document.getElementById('sitesGrid')?.addEventListener('mousedown',clearActiveResult,{capture:true});
  function normalizeAiText(text){return String(text||'').replace(/\\*\\*([^*]+)\\*\\*/g,'$1').replace(/__([^_]+)__/g,'$1').replace(/^\\s*[-*]\\s+/gm,'· ').replace(/\\n{3,}/g,'\\n\\n').trim()}
  let lastAiSites=[];
  function normalizeAiSiteUrl(v){const t=String(v||'').trim();return /^https?:\\/\\//i.test(t)?t:(/^[\\w.-]+\\.[\\w.-]+/.test(t)?'https://'+t:'')}
  function createAiSiteCard(site){const card=document.createElement('div');card.className='ai-site-card rounded-xl border border-primary-100/70 bg-white/80 p-3 text-xs shadow-sm';const name=site.name||'未命名';const cat=site.catelog||'未分类';const desc=site.desc||'暂无描述';const rawUrl=site.url||'';const normalizedUrl=normalizeAiSiteUrl(rawUrl);const visitUrl=site.id?('/go/'+encodeURIComponent(site.id)):(normalizedUrl||'#');card.innerHTML='<div class="flex items-start justify-between gap-2"><div class="min-w-0 flex-1"><div class="truncate text-sm font-semibold text-gray-900"></div><div class="mt-1 inline-flex rounded-full bg-primary-50 px-2 py-0.5 text-[11px] text-primary-700"></div></div><span class="flex-shrink-0 rounded-full bg-accent-50 px-2 py-0.5 text-[10px] text-accent-700">本站书签</span></div><p class="mt-2 line-clamp-2 text-gray-600"></p><div class="mt-2 truncate text-[11px] text-primary-600"></div><div class="mt-3 flex gap-2"><a class="ai-card-visit flex-1 rounded-lg bg-primary-600 px-3 py-1.5 text-center font-medium text-white" target="_blank" rel="noopener noreferrer">访问</a><button type="button" class="ai-card-copy rounded-lg bg-accent-100 px-3 py-1.5 font-medium text-accent-700">复制</button></div>';card.querySelector('.text-sm').textContent=name;card.querySelector('.bg-primary-50').textContent=cat;card.querySelector('p').textContent=desc;card.querySelector('.text-primary-600').textContent=normalizedUrl||rawUrl||'未提供链接';const visit=card.querySelector('.ai-card-visit');visit.href=visitUrl;if(!normalizedUrl&&!site.id){visit.classList.add('pointer-events-none','opacity-50')}const copy=card.querySelector('.ai-card-copy');copy.dataset.url=normalizedUrl||rawUrl;return card}
  function appendAiMessage(role,text,sites){if(!aiChatBody)return;const msg=document.createElement('div');msg.className='ai-message '+role;msg.textContent=normalizeAiText(text);aiChatBody.appendChild(msg);if(role==='assistant'&&Array.isArray(sites)&&sites.length){lastAiSites=sites.slice(0,5).map(function(site){return{id:site.id}}).filter(function(site){return site.id});const wrap=document.createElement('div');wrap.className='space-y-2';sites.slice(0,6).forEach(function(site){wrap.appendChild(createAiSiteCard(site))});aiChatBody.appendChild(wrap)}aiChatBody.scrollTop=aiChatBody.scrollHeight}
  aiChatBody?.addEventListener('click',function(e){const btn=e.target.closest('.ai-card-copy');if(!btn)return;e.preventDefault();const url=btn.dataset.url;if(!url)return;const old=btn.textContent;navigator.clipboard.writeText(url).then(()=>{btn.textContent='已复制';setTimeout(()=>btn.textContent=old,1200)}).catch(()=>{btn.textContent='复制失败';setTimeout(()=>btn.textContent=old,1200)})});
  aiChatForm?.addEventListener('submit',function(e){e.preventDefault();const text=aiChatInput?.value.trim();if(!text)return;appendAiMessage('user',text);aiChatInput.value='';aiSendBtn.disabled=true;aiSendBtn.textContent='思考中';fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,previousSites:lastAiSites})}).then(r=>r.json()).then(d=>{const data=d.data||{};appendAiMessage('assistant',data.answer||d.message||'暂时没有得到回复。',data.sites||[])}).catch(()=>appendAiMessage('assistant','AI 助理暂时无法连接，请稍后重试。')).finally(()=>{aiSendBtn.disabled=false;aiSendBtn.textContent='发送';aiChatInput?.focus()})});
  function updateBackToTopVisibility(){if(!backToTopBtn)return;backToTopBtn.classList.toggle('hidden',window.scrollY<360)}
  window.addEventListener('scroll',updateBackToTopVisibility,{passive:true});
  updateBackToTopVisibility();
  backToTopBtn?.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});closeFloatingThemePanel()});
  function openSidebar(){sidebar.classList.add('open');overlay.classList.add('open')}
  function closeSidebar(){sidebar.classList.remove('open');overlay.classList.remove('open')}
  document.getElementById('sidebarToggle')?.addEventListener('click',openSidebar);
  document.getElementById('closeSidebar')?.addEventListener('click',closeSidebar);
  overlay?.addEventListener('click',closeSidebar);

  // PC端侧栏收起/展开
  const collapseBtn=document.getElementById('collapseSidebar');
  const expandBtn=document.getElementById('expandSidebar');
  collapseBtn?.addEventListener('click',function(){document.body.classList.add('sidebar-collapsed');localStorage.setItem('nav:sidebar-collapsed','1')});
  expandBtn?.addEventListener('click',function(){document.body.classList.remove('sidebar-collapsed');localStorage.removeItem('nav:sidebar-collapsed')});
  if(localStorage.getItem('nav:sidebar-collapsed')==='1'){document.body.classList.add('sidebar-collapsed')}

  const expandedCats = JSON.parse(localStorage.getItem('nav:expanded-cats') || '[]');
  document.querySelectorAll('.category-toggle').forEach(btn=>{
    const targetId = btn.dataset.target;
    const target = document.getElementById(targetId);
    if (!target) return;
    if (expandedCats.includes(targetId) && target.classList.contains('hidden')) {
      target.classList.remove('hidden');
      btn.setAttribute('aria-expanded', 'true');
      const icon = btn.querySelector('[data-role="toggle-icon"]');
      if (icon) icon.textContent = '－';
    } else if (!target.classList.contains('hidden') && !expandedCats.includes(targetId)) {
      expandedCats.push(targetId);
      localStorage.setItem('nav:expanded-cats', JSON.stringify(expandedCats));
    }
    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      const expanded = !target.classList.contains('hidden');
      target.classList.toggle('hidden', expanded);
      this.setAttribute('aria-expanded', String(!expanded));
      const icon = this.querySelector('[data-role="toggle-icon"]');
      if (icon) icon.textContent = expanded ? '＋' : '－';
      let cats = JSON.parse(localStorage.getItem('nav:expanded-cats') || '[]');
      if (!expanded) {
        if (!cats.includes(targetId)) cats.push(targetId);
      } else {
        cats = cats.filter(id => id !== targetId);
      }
      localStorage.setItem('nav:expanded-cats', JSON.stringify(cats));
    });
  });

  (function bindCategoryClickFeedback(){
    const listEl = document.getElementById('categoryList');
    if (!listEl) return;
    let pendingLink = null;
    const currentCatalog = new URLSearchParams(window.location.search).get('catalog') || '';

    function clearPending() {
      if (pendingLink) {
        pendingLink.classList.remove('is-pending');
        pendingLink = null;
      }
    }

    function updateActiveState() {
      const links = listEl.querySelectorAll('a[href^="?"]');
      links.forEach(link => {
        const linkCatalog = new URLSearchParams(link.search).get('catalog') || '';
        link.classList.toggle('category-active', linkCatalog === currentCatalog);
      });
    }

    listEl.addEventListener('click', function(e) {
      const link = e.target.closest('a[href^="?"]');
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      
      if (pendingLink && pendingLink !== link) {
        pendingLink.classList.remove('is-pending');
      }
      link.classList.add('is-pending');
      pendingLink = link;

      if (window.innerWidth < 1024) {
        setTimeout(closeSidebar, 80);
      }
    });

    updateActiveState();
    window.addEventListener('pageshow', () => {
      clearPending();
      updateActiveState();
    });
    window.addEventListener('beforeunload', clearPending);
  })();

  document.getElementById('sitesPanel')?.addEventListener('click',function(e){const btn=e.target.closest('.copy-btn,.search-copy-btn');if(!btn)return;e.preventDefault();e.stopPropagation();const url=btn.dataset.url;if(!url)return;const old=btn.textContent;navigator.clipboard.writeText(url).then(()=>{btn.textContent='已复制';setTimeout(()=>btn.textContent=old,1200)})});

  const search=document.getElementById('searchInput'), grid=document.getElementById('sitesGrid'), heading=document.getElementById('listHeading');
  const originalGridHTML=grid?.innerHTML||'', originalHeading=heading?.textContent||'';
  const searchHistoryBox=document.getElementById('searchHistoryBox'),searchHistoryList=document.getElementById('searchHistoryList'),clearSearchHistory=document.getElementById('clearSearchHistory');
  const SEARCH_HISTORY_KEY='nav:search-history';
  let searchTimer=null, searchController=null;
  function getSearchHistory(){try{return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)||'[]').filter(Boolean).slice(0,8)}catch{return[]}}
  function setSearchHistory(items){localStorage.setItem(SEARCH_HISTORY_KEY,JSON.stringify(items.slice(0,8)));renderSearchHistory()}
  function addSearchHistory(kw){const term=String(kw||'').trim();if(!term)return;const items=[term,...getSearchHistory().filter(item=>item!==term)].slice(0,8);setSearchHistory(items)}
  function renderSearchHistory(){if(!searchHistoryBox||!searchHistoryList)return;const items=getSearchHistory();searchHistoryList.innerHTML=items.map(function(item){return '<button type="button" class="search-history-chip" data-keyword="'+escapeText(item)+'">'+escapeText(item)+'</button>'}).join('')}
  function showSearchHistory(){if(!searchHistoryBox)return;searchHistoryBox.classList.toggle('hidden',!getSearchHistory().length)}
  function hideSearchHistory(){searchHistoryBox?.classList.add('hidden')}
  function escapeText(v){return String(v??'').replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
  function highlightText(v,kw){const text=escapeText(v);if(!kw)return text;const safe=kw.replace(/[-\\/\\\\^*+?.()|[\\]{}]/g,'\\\\$&');try{return text.replace(new RegExp('('+safe+')','ig'),'<mark class="rounded bg-amber-100 px-0.5 text-amber-900">$1</mark>')}catch{return text}}
  function normalizeClientUrl(v){const t=String(v||'').trim();return /^https?:\\/\\//i.test(t)?t:(/^[\\w.-]+\\.[\\w.-]+/.test(t)?'https://'+t:'')}
  function isClientUnhealthySite(site){const statusCode=Number(site?.last_status_code);return Boolean(site?.last_error)||(Number.isFinite(statusCode)&&(statusCode<200||statusCode>=400))}
  function renderClientHealthBadge(site){if(!site?.last_checked_at||!isClientUnhealthySite(site))return'';const details=[site.last_status_code?'HTTP '+site.last_status_code:'',site.last_error||'',site.last_checked_at?'最近检测：'+String(site.last_checked_at).slice(0,19):''].filter(Boolean).join(' · ');return '<span class="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600" title="'+escapeText(details||'最近检测异常')+'">可能失效</span>'}
  function renderSearchResultCard(site,kw){const name=site.name||'未命名',cat=site.catelog||'未分类',desc=site.desc||'暂无描述',url=normalizeClientUrl(site.url),visit=url?'/go/'+encodeURIComponent(site.id):'#',tags=Array.isArray(site.tags)?site.tags:[],hits=Math.max(0,Number(site.hits)||0),logo=normalizeClientUrl(site.logo),initial=escapeText((name.trim().charAt(0)||'站').toUpperCase());const logoHtml=logo?'<img src="'+escapeText(logo)+'" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.style.display=\\'none\\';this.nextElementSibling.style.display=\\'flex\\'"><span class="site-card-fallback" style="display:none">'+initial+'</span>':'<span class="site-card-fallback">'+initial+'</span>';const tagsHtml=tags.length?'<div class="site-card-tags">'+tags.map(function(tag){return '<a href="?tag='+encodeURIComponent(tag)+'">#'+highlightText(tag,kw)+'</a>'}).join('')+'</div>':'';return '<div class="site-card" data-id="'+escapeText(site.id)+'" data-name="'+escapeText(name)+'" data-url="'+escapeText(url||site.url||'')+'" data-catalog="'+escapeText(cat)+'" data-tags="'+escapeText(tags.join(' '))+'"><a href="'+escapeText(visit)+'" '+(url?'target="_blank" rel="noopener noreferrer"':'')+' class="site-card-main"><span class="site-card-logo">'+logoHtml+'</span><span class="site-card-copy"><span class="site-card-title">'+highlightText(name,kw)+renderClientHealthBadge(site)+'</span><span class="site-card-desc" title="'+escapeText(desc)+'">'+highlightText(desc,kw)+'</span></span></a><div class="site-card-meta">'+tagsHtml+'<div class="site-card-foot"><span class="site-card-url">'+highlightText(url||site.url||'未提供链接',kw)+'</span><span class="site-card-hits">'+hits+' 次</span><button type="button" class="copy-btn search-copy-btn" data-url="'+escapeText(url)+'">复制</button></div></div></div>'}
  function renderSearchEmpty(kw){const safeKw=escapeText(kw);const tagHint='tag:'+safeKw;const catHint='cat:'+safeKw;return '<div class="col-span-full rounded-2xl border border-dashed border-primary-200 bg-primary-50/60 p-8 text-center"><div class="text-4xl">🔎</div><h3 class="mt-4 text-lg font-semibold text-primary-800">没有找到相关书签</h3><p class="mt-2 text-sm text-primary-600">可以尝试更短关键词、分类名、标签名、网站名称、域名或描述词。</p><div class="mt-4 flex flex-wrap justify-center gap-2 text-xs"><button type="button" class="search-suggest rounded-full bg-white px-3 py-1.5 text-primary-700 shadow-sm" data-keyword="'+safeKw.slice(0,2)+'">改搜前两个字</button><button type="button" class="search-suggest rounded-full bg-white px-3 py-1.5 text-primary-700 shadow-sm" data-keyword="'+escapeText(tagHint)+'">按标签语法</button><button type="button" class="search-suggest rounded-full bg-white px-3 py-1.5 text-primary-700 shadow-sm" data-keyword="'+escapeText(catHint)+'">按分类语法</button><button type="button" id="searchAskAiBtn" class="rounded-full bg-primary-600 px-3 py-1.5 text-white shadow-sm">让 AI 帮忙找</button>'+(document.getElementById('addSiteBtnSidebar')?'<button type="button" id="searchSubmitSiteBtn" class="rounded-full bg-accent-500 px-3 py-1.5 text-white shadow-sm">提交新站</button>':'')+'</div><p class="mt-3 text-xs text-gray-500">当前搜索：'+safeKw+'</p></div>'}
  renderSearchHistory();
  search?.addEventListener('focus',showSearchHistory);
  search?.addEventListener('blur',function(){setTimeout(hideSearchHistory,180)});
  searchHistoryList?.addEventListener('click',function(e){const btn=e.target.closest('.search-history-chip');if(!btn||!search)return;search.value=btn.dataset.keyword||'';search.dispatchEvent(new Event('input',{bubbles:true}));search.focus()});
  clearSearchHistory?.addEventListener('click',function(){localStorage.removeItem(SEARCH_HISTORY_KEY);renderSearchHistory();hideSearchHistory()});
  grid?.addEventListener('click',function(e){const suggest=e.target.closest('.search-suggest');if(suggest&&search){e.preventDefault();e.stopPropagation();search.value=suggest.dataset.keyword||'';search.dispatchEvent(new Event('input',{bubbles:true}));search.focus();return}if(e.target.closest('#searchAskAiBtn')){e.preventDefault();e.stopPropagation();openFloatingAiPanel();if(aiChatInput){aiChatInput.value='帮我找：'+(search?.value||'');aiChatInput.focus()}return}if(e.target.closest('#searchSubmitSiteBtn')){e.preventDefault();e.stopPropagation();modal?.classList.remove('opacity-0','invisible')}});
  search?.addEventListener('input',function(){const kw=this.value.trim();clearTimeout(searchTimer);if(!kw){if(searchController)searchController.abort();grid.innerHTML=originalGridHTML;heading.textContent=originalHeading;applyLayout(getThemePref('layout'));updateThemeControls();return}applyLayout('grid');heading.textContent='搜索中 · '+kw;grid.innerHTML='<div class="col-span-full rounded-2xl border border-primary-100 bg-white p-8 text-center text-primary-600">正在全站搜索...</div>';searchTimer=setTimeout(function(){if(searchController)searchController.abort();searchController=new AbortController();fetch('/api/search?q='+encodeURIComponent(kw)+'&limit=80',{signal:searchController.signal}).then(r=>r.json()).then(d=>{const items=Array.isArray(d.data)?d.data:[];addSearchHistory(kw);heading.textContent='全站搜索 · '+kw+' · '+items.length+' 个结果';grid.innerHTML=items.length?items.map(item=>renderSearchResultCard(item,kw)).join(''):renderSearchEmpty(kw)}).catch(err=>{if(err.name==='AbortError')return;heading.textContent='搜索失败';grid.innerHTML='<div class="col-span-full rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">搜索失败，请稍后重试。</div>'})},260)});


  const modal=document.getElementById('addSiteModal'), openBtn=document.getElementById('addSiteBtnSidebar');
  function closeModal(){modal?.classList.add('opacity-0','invisible')}
  openBtn?.addEventListener('click',()=>modal?.classList.remove('opacity-0','invisible'));
  document.getElementById('closeModal')?.addEventListener('click',closeModal);
  document.getElementById('cancelAddSite')?.addEventListener('click',closeModal);
  document.getElementById('fetchFaviconBtn')?.addEventListener('click',function(){const u=document.getElementById('addSiteUrl').value.trim();if(!u)return alert('请先输入网址');const btn=this;const originalHTML=btn.innerHTML;btn.disabled=true;btn.innerHTML='⏳';fetch('/api/favicon?url='+encodeURIComponent(u)).then(r=>r.json()).then(d=>{if(d.favicon){document.getElementById('addSiteLogo').value=d.favicon;btn.innerHTML='✓';setTimeout(()=>{btn.innerHTML=originalHTML},1200)}else alert('未找到合适图标')}).catch(()=>alert('图标获取失败，请稍后重试')).finally(()=>{btn.disabled=false;if(btn.innerHTML==='⏳')btn.innerHTML=originalHTML})});
  document.getElementById('addSiteForm')?.addEventListener('submit',function(e){e.preventDefault();const payload={name:addSiteName.value,url:addSiteUrl.value,logo:addSiteLogo.value,desc:addSiteDesc.value,catelog:addSiteCatelog.value,tags:addSiteTags.value,reason:(document.getElementById('addSiteReason')||{}).value||''};fetch('/api/config/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json()).then(d=>{if(d.code===201){alert('提交成功，等待管理员审核');this.reset();closeModal()}else if(d.code===409&&d.duplicate){alert('本站已收录该网址：\\n#'+d.duplicate.id+' '+(d.duplicate.name||'')+'\\n分类：'+(d.duplicate.catelog||'')+'\\n如需修改，请联系管理员或在已有书签上操作。')}else alert(d.message||'提交失败')}).catch(()=>alert('网络错误'))});

  document.getElementById('autoFetchMetaBtn')?.addEventListener('click',function(){var u=(document.getElementById('addSiteUrl')||{}).value?.trim();if(!u){alert('请先输入网址');return}var btn=this,status=document.getElementById('autoFetchStatus');btn.disabled=true;btn.textContent='抓取中';if(status){status.classList.remove('hidden');status.textContent='正在抓取网站信息...'}fetch('/api/site/preview?url='+encodeURIComponent(u)).then(function(r){return r.json()}).then(function(d){if(d.code===200&&d.data){var data=d.data;if(data.title&&!document.getElementById('addSiteName').value)document.getElementById('addSiteName').value=data.title;if(data.description&&!document.getElementById('addSiteDesc').value)document.getElementById('addSiteDesc').value=data.description;if(data.favicon&&!document.getElementById('addSiteLogo').value)document.getElementById('addSiteLogo').value=data.favicon;if(data.duplicate&&status){status.textContent='\u26a0\ufe0f 本站已收录类似网址：#'+data.duplicate.id+' '+(data.duplicate.name||'')+' ('+( data.duplicate.catelog||'')+')'}else if(status){status.textContent='\u2705 抓取完成'+(data.title?' \u00b7 '+data.title:'')}}else if(status){status.textContent='未能抓取到信息：'+(d.message||'请手动填写')}}).catch(function(){if(status)status.textContent='抓取失败，请手动填写'}).finally(function(){btn.disabled=false;btn.textContent='抓取'})});
  document.getElementById('submitSuggestCategoryBtn')?.addEventListener('click',function(){var name=(document.getElementById('addSiteName')||{}).value?.trim()||'';var u=(document.getElementById('addSiteUrl')||{}).value?.trim()||'';if(!name&&!u){alert('请先输入名称或网址');return}var btn=this,old=btn.textContent;btn.disabled=true;btn.textContent='\u23f3';fetch('/api/submit/suggest-category',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,url:u,desc:(document.getElementById('addSiteDesc')||{}).value||''})}).then(function(r){return r.json()}).then(function(d){if(d.code===200&&d.data&&d.data.category){document.getElementById('addSiteCatelog').value=d.data.category}else{alert('未能推荐分类，请手动选择')}}).catch(function(){alert('网络错误')}).finally(function(){btn.disabled=false;btn.textContent=old})});
  document.getElementById('submitSuggestTagsBtn')?.addEventListener('click',function(){var name=(document.getElementById('addSiteName')||{}).value?.trim()||'';var u=(document.getElementById('addSiteUrl')||{}).value?.trim()||'';if(!name&&!u){alert('请先输入名称或网址');return}var btn=this,old=btn.textContent;btn.disabled=true;btn.textContent='\u23f3';fetch('/api/submit/suggest-tags',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,url:u,desc:(document.getElementById('addSiteDesc')||{}).value||'',catelog:(document.getElementById('addSiteCatelog')||{}).value||''})}).then(function(r){return r.json()}).then(function(d){if(d.code===200&&d.data&&Array.isArray(d.data.tags)&&d.data.tags.length){document.getElementById('addSiteTags').value=d.data.tags.join(', ')}else{alert('未能推荐标签，请手动填写')}}).catch(function(){alert('网络错误')}).finally(function(){btn.disabled=false;btn.textContent=old})});

  ${myUsageScript()}
  ${adminAuthed ? frontAdminScript() : ''}
  ${canDragSort ? dragScript(i18n) : ''}
});
</script>
</body>
</html>`);
}

