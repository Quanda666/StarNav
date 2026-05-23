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
  const heroVisible = systemSettings.heroVisible !== 'false';
  const blogVisible = systemSettings.blogVisible !== 'false';
  const blogUrl = sanitizeUrl(systemSettings.blogUrl) || 'https://blog.110995.xyz/';
  const blogLabel = systemSettings.blogLabel || th('visitBlog');
  const blogLink = blogVisible && blogUrl ? `<a href="${escapeHTML(blogUrl)}" target="_blank" rel="noopener noreferrer" class="mt-4 flex items-center px-4 py-2 text-gray-600 hover:text-primary-500 transition duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          ${escapeHTML(blogLabel)}
        </a>` : '';
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
  const inactiveLayoutPlaceholder = '<div class="layout-section text-center text-sm text-gray-500">切换布局后可显示该视图。为提升首屏速度，非默认布局不再预渲染完整内容。</div>';
  const groupedContent = privateCatalogLocked
    ? ''
    : (defaultLayout === 'grouped' ? renderGroupedSites(currentSites, adminAuthed, i18n) : inactiveLayoutPlaceholder);
  const dashboardContent = privateCatalogLocked
    ? ''
    : (defaultLayout === 'dashboard' ? renderDashboardSites(currentSites, adminAuthed, i18n) : inactiveLayoutPlaceholder);

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
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet"/>
  <link rel="icon" href="${escapeHTML(siteIcon)}"/>
  <link rel="alternate icon" href="https://img.12388888.xyz/file/logo/ktVNDfcM.png" type="image/png"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config={darkMode:'class',theme:{extend:{colors:{primary:{50:'#f3f5f9',100:'#e1e7f1',200:'#c3d0e3',300:'#9cb3d1',400:'#6c8fba',500:'#416d9d',600:'#305580',700:'#254267',800:'#1d3552',900:'#192e45',950:'#101e2d'},secondary:{50:'#fdf8f3',100:'#f6ede1',200:'#ead6ba',300:'#dfc19a',400:'#d2aa79',500:'#b88d58',600:'#a17546',700:'#835b36',800:'#6b492c',900:'#5a3e26',950:'#2f1f13'},accent:{50:'#f2faf6',100:'#d9f0e5',200:'#b4dfcb',300:'#89caa9',400:'#61b48a',500:'#3c976d',600:'#2e7755',700:'#265c44',800:'#204b38',900:'#1b3e30',950:'#0e221b'}}}}}
  </script>
  <script>
    (function(){try{const root=document.documentElement;const saved=localStorage.getItem('nav:theme');const prefersDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;if(saved==='dark'||(!saved&&prefersDark)){root.classList.add('dark')}var defaultAccent='${escapeHTML(defaultAccent)}',defaultLayout='${escapeHTML(defaultLayout)}',defaultBg='${pageBackgroundImage ? 'image' : 'soft'}';root.dataset.accent=localStorage.getItem('nav:accent')||defaultAccent;root.dataset.density=localStorage.getItem('nav:density')||'comfortable';root.dataset.bg=localStorage.getItem('nav:bg')||defaultBg;root.dataset.view=localStorage.getItem('nav:view')||'detail';root.dataset.layout=localStorage.getItem('nav:layout')||defaultLayout;var bgImage=localStorage.getItem('nav:bgImage')||'${escapeHTML(pageBackgroundImage)}';if(bgImage)document.documentElement.style.setProperty('--nav-bg-image','url('+bgImage+')');var now=new Date(),m=now.getMonth()+1,d=now.getDate();var festival='';if(m===1&&d<=3)festival='newyear';else if(m===2&&d===14)festival='valentine';else if(m===12&&(d>=24&&d<=25))festival='christmas';else if(m===10&&d===31)festival='halloween';else if(m===5&&d>=1&&d<=3)festival='labor';root.dataset.festival=festival}catch(e){}})();
  </script>
  <style>
    :root{--nav-primary:#254267;--nav-primary-600:#305580;--nav-primary-50:#f3f5f9;--nav-accent:#3c976d;--nav-accent-600:#2e7755;--nav-secondary-50:#fdf8f3;--nav-card-radius:0.75rem;--nav-card-padding:1.25rem;--nav-grid-gap:1rem;--nav-hero-gradient:linear-gradient(135deg,var(--nav-primary),var(--nav-primary-600));--nav-page-bg:#fdf8f3}
    html[data-accent="green"]{--nav-primary:#265c44;--nav-primary-600:#2e7755;--nav-primary-50:#f2faf6;--nav-accent:#3c976d;--nav-accent-600:#2e7755;--nav-secondary-50:#f7fbf8;--nav-hero-gradient:linear-gradient(135deg,#265c44,#3c976d)}
    html[data-accent="purple"]{--nav-primary:#5b3b8c;--nav-primary-600:#6d4bb3;--nav-primary-50:#f6f2ff;--nav-accent:#8b5cf6;--nav-accent-600:#7c3aed;--nav-secondary-50:#fbf8ff;--nav-hero-gradient:linear-gradient(135deg,#4c1d95,#7c3aed)}
    html[data-accent="rose"]{--nav-primary:#9f3758;--nav-primary-600:#be4169;--nav-primary-50:#fff1f5;--nav-accent:#e0527d;--nav-accent-600:#be4169;--nav-secondary-50:#fff7f9;--nav-hero-gradient:linear-gradient(135deg,#9f3758,#e0527d)}
    html[data-accent="amber"]{--nav-primary:#8a5a16;--nav-primary-600:#b7791f;--nav-primary-50:#fffbeb;--nav-accent:#d97706;--nav-accent-600:#b45309;--nav-secondary-50:#fffaf0;--nav-hero-gradient:linear-gradient(135deg,#78350f,#d97706)}
    html[data-density="compact"]{--nav-card-padding:.85rem;--nav-grid-gap:.75rem;--nav-card-radius:.6rem}
    html[data-density="spacious"]{--nav-card-padding:1.65rem;--nav-grid-gap:1.5rem;--nav-card-radius:1rem}
    html[data-bg="plain"]{--nav-page-bg:#f8fafc}
    html[data-bg="paper"]{--nav-page-bg:#fbf7ef}
    .theme-preset-btn{font-size:.7rem;padding:.4rem .3rem;text-align:center;line-height:1.2}
    html[data-bg="image"] body{background-image:var(--nav-bg-image,none)!important;background-size:cover!important;background-position:center!important;background-attachment:fixed!important;background-repeat:no-repeat!important}
    html[data-bg="image"] main,html[data-bg="image"] #sitesPanel,html[data-bg="image"] .site-card{background:rgba(255,255,255,.82)!important;backdrop-filter:blur(6px)}
    html.dark[data-bg="image"] main,html.dark[data-bg="image"] #sitesPanel,html.dark[data-bg="image"] .site-card{background:rgba(15,23,42,.82)!important}
    body{font-family:'Noto Sans SC',sans-serif;background:var(--nav-page-bg)}html[data-bg="gradient"] body{background:radial-gradient(circle at top left,rgba(65,109,157,.18),transparent 28rem),radial-gradient(circle at bottom right,rgba(60,151,109,.18),transparent 30rem),var(--nav-page-bg)}html[data-bg="paper"] body{background-image:linear-gradient(rgba(37,66,103,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(37,66,103,.035) 1px,transparent 1px);background-size:24px 24px}.site-card{transition:all .3s cubic-bezier(.25,.8,.25,1);border-radius:var(--nav-card-radius)!important}.site-card>div{padding:var(--nav-card-padding)!important}.site-card:hover{transform:translateY(-5px);box-shadow:0 10px 20px rgba(0,0,0,.1)}#sitesGrid{gap:var(--nav-grid-gap)!important}html[data-view="minimal"] .site-card p,html[data-view="minimal"] .site-card [title="访问次数"],html[data-view="minimal"] .site-card .copy-btn,html[data-view="minimal"] .search-copy-btn{display:none!important}html[data-view="minimal"] .site-card>div{padding:.9rem!important}html[data-view="minimal"] .site-card img,html[data-view="minimal"] .site-card .w-10.h-10{width:2rem!important;height:2rem!important}html[data-view="minimal"] .site-card .mt-3{margin-top:.5rem!important}.bg-primary-700{background:var(--nav-hero-gradient)!important}.bg-primary-600,.bg-primary-500{background-color:var(--nav-primary-600)!important}.bg-accent-500{background-color:var(--nav-accent)!important}.text-primary-600,.text-primary-700{color:var(--nav-primary)!important}.hover\:text-primary-500:hover{color:var(--nav-accent)!important}.border-primary-100,.border-primary-100\/60{border-color:color-mix(in srgb,var(--nav-primary) 18%,transparent)!important}.bg-secondary-50{background-color:var(--nav-page-bg)!important}.bg-secondary-100,.bg-primary-50{background-color:var(--nav-primary-50)!important}.line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.mobile-sidebar{transform:translateX(-100%);transition:transform .3s ease}.mobile-sidebar.open{transform:translateX(0)}.mobile-overlay{opacity:0;pointer-events:none;transition:opacity .3s ease}.mobile-overlay.open{opacity:1;pointer-events:auto}.dragging{opacity:.5;transform:scale(.98)}.drag-over{outline:2px dashed var(--nav-accent);outline-offset:4px}
    .theme-panel{backdrop-filter:blur(14px)}.category-link{position:relative;overflow:hidden;transition:background .18s ease,color .18s ease,box-shadow .18s ease}.category-link[data-has-color="true"]{background:var(--cat-bg)!important;color:var(--cat-color)!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cat-color) 18%,transparent)}.category-link[data-has-color="true"]::before{content:"";position:absolute;left:0;top:.45rem;bottom:.45rem;width:3px;border-radius:999px;background:var(--cat-line)}.category-link[data-has-color="true"]:hover{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cat-color) 30%,transparent),0 8px 22px color-mix(in srgb,var(--cat-color) 12%,transparent)}.category-icon[data-has-color="true"]{color:var(--cat-color)!important;background:var(--cat-bg)!important}.category-icon svg{width:1em;height:1em;display:block;fill:currentColor;stroke:currentColor}.theme-choice{border:2px solid rgba(255,255,255,.9);box-shadow:0 1px 3px rgba(15,23,42,.16)}.theme-choice.active{outline:2px solid var(--nav-accent);outline-offset:2px}.theme-segment{border:1px solid color-mix(in srgb,var(--nav-primary) 18%,transparent);border-radius:.65rem;background:rgba(255,255,255,.72);padding:.35rem .45rem;color:#64748b;transition:all .18s ease}.theme-segment:hover{border-color:var(--nav-accent);color:var(--nav-primary)}.theme-segment.active{background:var(--nav-primary)!important;border-color:var(--nav-primary)!important;color:#fff!important}.layout-panel{display:none}.layout-panel.active{display:block}html[data-layout="list"] #sitesGrid{display:block!important}html[data-layout="list"] #sitesGrid .site-card{margin-bottom:.75rem}html[data-layout="list"] #sitesGrid .site-card>div{padding:.85rem 1rem!important}html[data-layout="list"] #sitesGrid .site-card:hover{transform:translateX(3px)}html[data-layout="list"] #sitesGrid .site-card p{display:none!important}html[data-layout="masonry"] #sitesGrid{display:block!important;columns:1;column-gap:var(--nav-grid-gap)}@media(min-width:640px){html[data-layout="masonry"] #sitesGrid{columns:2}}@media(min-width:1024px){html[data-layout="masonry"] #sitesGrid{columns:3}}@media(min-width:1280px){html[data-layout="masonry"] #sitesGrid{columns:4}}html[data-layout="masonry"] #sitesGrid .site-card{break-inside:avoid;margin-bottom:var(--nav-grid-gap)}.layout-section{border-radius:1rem;border:1px solid color-mix(in srgb,var(--nav-primary) 14%,transparent);background:rgba(255,255,255,.72);padding:1rem}.layout-section-title{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:.75rem;color:var(--nav-primary);font-weight:700}.mini-site-link{display:flex;align-items:center;justify-content:space-between;gap:.75rem;border-radius:.75rem;padding:.55rem .7rem;color:#475569;transition:background .18s ease}.mini-site-link:hover{background:var(--nav-primary-50);color:var(--nav-primary)}.floating-actions{right:1rem!important;bottom:calc(1rem + env(safe-area-inset-bottom,0px))!important}.floating-action-stack{display:flex;flex-direction:column;align-items:center;gap:.35rem;border:1px solid rgba(255,255,255,.62);border-radius:999px;background:rgba(255,255,255,.72);padding:.35rem;box-shadow:0 18px 48px rgba(15,23,42,.16),inset 0 1px 0 rgba(255,255,255,.75);backdrop-filter:blur(18px) saturate(1.35);-webkit-backdrop-filter:blur(18px) saturate(1.35)}.floating-action-btn{display:inline-flex;height:2.65rem;width:2.65rem;min-width:2.65rem;align-items:center;justify-content:center;border-radius:999px;background:transparent;color:var(--nav-primary);font-size:1rem;font-weight:700;box-shadow:none;border:0;padding:0;transition:transform .18s ease,opacity .18s ease,background .18s ease,color .18s ease}.floating-action-btn:hover,.floating-action-btn[aria-expanded="true"]{transform:translateY(-1px);background:var(--nav-primary);color:#fff}.floating-action-btn.hidden{display:none}.floating-action-btn .floating-label{display:none}.floating-theme-panel,.floating-ai-panel{transform-origin:bottom right;animation:themePanelIn .16s ease-out}.ai-chat-body{max-height:20rem;overflow-y:auto}.floating-ai-panel.ai-fullscreen{position:fixed!important;inset:1rem!important;z-index:95!important;display:flex!important;width:auto!important;max-width:none!important;flex-direction:column;border-radius:1.25rem!important}.floating-ai-panel.ai-fullscreen .ai-chat-body{max-height:none!important;flex:1;min-height:0}.floating-ai-panel.ai-fullscreen form{flex-shrink:0}.ai-message{border-radius:1rem;padding:.65rem .8rem;font-size:.85rem;line-height:1.55;white-space:pre-wrap}.ai-message.user{margin-left:2rem;background:var(--nav-primary);color:#fff}.ai-message.assistant{margin-right:2rem;background:var(--nav-primary-50);color:#334155}.ai-site-link{display:block;border-radius:.75rem;border:1px solid color-mix(in srgb,var(--nav-primary) 16%,transparent);padding:.45rem .55rem;font-size:.75rem;color:var(--nav-primary);background:rgba(255,255,255,.65)}@media(max-width:640px){.floating-actions{left:0!important;right:0!important;bottom:calc(.75rem + env(safe-area-inset-bottom,0px))!important;align-items:center!important;pointer-events:none}.floating-actions>*{pointer-events:auto}.floating-action-stack{flex-direction:row;gap:.25rem;padding:.3rem;border-color:rgba(255,255,255,.55);background:rgba(255,255,255,.78);box-shadow:0 14px 38px rgba(15,23,42,.2)}.floating-action-btn{height:2.55rem;width:2.55rem;min-width:2.55rem;font-size:.95rem}.floating-action-btn .floating-label{display:none}.floating-theme-panel,.floating-ai-panel{position:fixed!important;left:.75rem!important;right:.75rem!important;bottom:calc(4.25rem + env(safe-area-inset-bottom,0px))!important;width:auto!important;max-height:min(72vh,34rem);overflow:auto;border-radius:1.25rem!important;transform-origin:bottom center}.floating-ai-panel{display:flex;flex-direction:column}.floating-ai-panel .ai-chat-body{max-height:48vh}.floating-ai-panel.ai-fullscreen{inset:.5rem!important;border-radius:1rem!important}}@keyframes themePanelIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
    .floating-ai-panel.ai-fullscreen{inset:auto!important;left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;width:min(60rem,calc(100vw - 2rem))!important;height:min(44rem,calc(100vh - 2rem))!important;max-width:none!important;max-height:none!important;transform:translate(-50%,-50%)!important;border-radius:1.5rem!important;background:rgba(255,255,255,.98)!important;box-shadow:0 28px 90px rgba(15,23,42,.35)!important}
    .floating-ai-panel.ai-fullscreen .ai-chat-body{max-height:none!important;flex:1;min-height:0;display:flex;flex-direction:column;gap:.75rem;overflow-y:auto;padding:1.25rem clamp(1rem,3vw,2rem)!important}
    .floating-ai-panel.ai-fullscreen .ai-message{max-width:min(46rem,88%)}
    .floating-ai-panel.ai-fullscreen .ai-message.user{align-self:flex-end;margin-left:12%!important}
    .floating-ai-panel.ai-fullscreen .ai-message.assistant{align-self:flex-start;margin-right:12%!important}
    .floating-ai-panel.ai-fullscreen .ai-chat-body>.space-y-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:.75rem;width:100%;max-width:64rem;align-self:center}
    .floating-ai-panel.ai-fullscreen form{flex-shrink:0;padding:1rem clamp(1rem,3vw,2rem)!important}
    .floating-ai-panel.ai-fullscreen form>div{max-width:64rem;margin:0 auto}
    .floating-ai-panel.ai-fullscreen form>p{max-width:64rem;margin-left:auto;margin-right:auto}
    @media(max-width:640px){.floating-ai-panel.ai-fullscreen{width:calc(100vw - 1rem)!important;height:calc(100vh - 1rem)!important;border-radius:1rem!important}.floating-ai-panel.ai-fullscreen .ai-message{max-width:94%}.floating-ai-panel.ai-fullscreen .ai-message.user{margin-left:6%!important}.floating-ai-panel.ai-fullscreen .ai-message.assistant{margin-right:6%!important}}
    @media(min-width:1024px){.mobile-sidebar{transform:none}.sidebar-collapsed .mobile-sidebar{transform:translateX(-100%)!important}.sidebar-collapsed .main-content{margin-left:0!important}.main-content{transition:margin-left .3s ease}}
    #expandSidebar{transition:opacity .3s ease,transform .3s ease;opacity:0;pointer-events:none;transform:translateX(-10px)}.sidebar-collapsed #expandSidebar{opacity:1;pointer-events:auto;transform:translateX(0)}
    .site-card.result-active{outline:2px solid var(--nav-accent);outline-offset:2px;box-shadow:0 0 0 4px color-mix(in srgb,var(--nav-accent) 18%,transparent)}
    .site-card{position:relative}.fav-btn{position:absolute;top:.5rem;right:.5rem;z-index:5;width:1.75rem;height:1.75rem;display:flex;align-items:center;justify-content:center;border-radius:999px;background:rgba(255,255,255,.85);border:1px solid rgba(0,0,0,.06);font-size:.85rem;line-height:1;cursor:pointer;opacity:0;transition:opacity .18s ease,transform .18s ease,background .18s ease}.site-card:hover .fav-btn,.fav-btn.is-fav{opacity:1}.fav-btn:hover{transform:scale(1.15);background:rgba(255,255,255,1)}.fav-btn.is-fav{color:#f59e0b;opacity:1}
    .usage-chip{display:inline-flex;flex-shrink:0;align-items:center;gap:.35rem;border-radius:999px;padding:.3rem .65rem;background:var(--nav-primary-50);color:var(--nav-primary);cursor:pointer;transition:background .18s ease,box-shadow .18s ease;max-width:10rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.usage-chip:hover{background:color-mix(in srgb,var(--nav-primary) 14%,white);box-shadow:0 2px 8px rgba(0,0,0,.08)}.usage-chip .chip-remove{margin-left:.2rem;opacity:.5;font-size:.7rem;cursor:pointer}.usage-chip .chip-remove:hover{opacity:1;color:#ef4444}
    .scrollbar-hide::-webkit-scrollbar{display:none} .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none} .snap-x{scroll-snap-type:x mandatory} .snap-x > *{scroll-snap-align:start}
    .usage-card .usage-empty{display:none}.usage-card:not(:has(.usage-chip)) .usage-empty{display:block}
    html.dark .fav-btn{background:rgba(30,41,59,.85);border-color:rgba(148,163,184,.28);color:#94a3b8}html.dark .fav-btn.is-fav{color:#fbbf24}html.dark .fav-btn:hover{background:rgba(30,41,59,1)}
    html.dark .usage-card{background:rgba(15,23,42,.86)!important;border-color:rgba(148,163,184,.24)!important}html.dark .usage-chip{background:rgba(37,99,235,.18);color:#93c5fd}html.dark .usage-chip:hover{background:rgba(37,99,235,.28)}
    html.dark body{background:#0f172a!important;color:#e5e7eb!important}
    html.dark #sidebar{background:#0f172a!important;border-color:rgba(148,163,184,.24)!important;box-shadow:12px 0 32px rgba(0,0,0,.24)!important}
    html.dark main{background:#0b1220!important}
    html.dark footer{background:#0f172a!important;border-color:rgba(148,163,184,.24)!important;color:#94a3b8!important}
    html.dark .bg-white,html.dark .bg-white\/80{background-color:rgba(15,23,42,.94)!important}
    html.dark .bg-secondary-50{background-color:#0b1220!important}
    html.dark .bg-secondary-100,html.dark .bg-primary-50,html.dark .bg-accent-50{background-color:rgba(30,41,59,.9)!important}
    html.dark .bg-primary-700{background-color:#0f2747!important}
    html.dark .hover\:bg-gray-100:hover,html.dark [class*="hover:bg-gray-100"]:hover{background-color:rgba(51,65,85,.9)!important}
    html.dark aside a:hover{background-color:rgba(51,65,85,.9)!important;color:#bfdbfe!important}
    html.dark aside a.bg-secondary-100:hover{background:rgba(37,99,235,.26)!important;color:#dbeafe!important}
    html.dark .text-gray-900,html.dark .text-gray-800{color:#f8fafc!important}
    html.dark .text-gray-700,html.dark .text-gray-600,html.dark .text-gray-500{color:#cbd5e1!important}
    html.dark .text-primary-700,html.dark .text-primary-600{color:#93c5fd!important}
    html.dark .border-primary-100,html.dark .border-primary-100\/60,html.dark .border-gray-200{border-color:rgba(148,163,184,.28)!important}
    html.dark #sitesPanel{background:rgba(15,23,42,.72)!important;border-color:rgba(148,163,184,.24)!important;box-shadow:0 18px 45px rgba(0,0,0,.22)!important}
    html.dark .site-card{background:rgba(15,23,42,.94)!important;border-color:rgba(148,163,184,.28)!important}
    html.dark .site-card:hover{box-shadow:0 10px 24px rgba(0,0,0,.38)}
    html.dark .site-card p{color:#cbd5e1!important}
    html.dark .site-card .bg-secondary-100{background:rgba(37,99,235,.18)!important;color:#93c5fd!important}
    html.dark .site-card .bg-primary-50{background:rgba(37,99,235,.16)!important;color:#93c5fd!important}
    html.dark .site-card .bg-accent-100{background:rgba(20,83,45,.78)!important;color:#bbf7d0!important}
    html.dark a.bg-white,html.dark button.bg-white{background:#1e293b!important;color:#cbd5e1!important;border-color:rgba(148,163,184,.3)!important}
    html.dark a.bg-primary-600{background:#2563eb!important;color:#fff!important;border-color:#2563eb!important}
    html.dark aside a{color:#cbd5e1!important}
    html.dark aside a.bg-secondary-100{background:rgba(37,99,235,.18)!important;color:#bfdbfe!important}
    html.dark .category-link[data-has-color="true"]{background:var(--cat-bg-dark)!important;color:var(--cat-color-dark)!important;box-shadow:inset 0 0 0 1px var(--cat-border-dark)!important}
    html.dark .category-link[data-has-color="true"]:hover{background:var(--cat-bg-dark-hover)!important;color:var(--cat-color-dark)!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cat-line) 58%,transparent),0 10px 24px color-mix(in srgb,var(--cat-line) 18%,transparent)!important}
    html.dark .category-link[data-has-color="true"]::before{background:color-mix(in srgb,var(--cat-line) 78%,white)}
    html.dark .category-icon[data-has-color="true"]{background:color-mix(in srgb,var(--cat-line) 18%,#0f172a)!important;color:var(--cat-color-dark)!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cat-line) 35%,transparent)}
    html.dark h2,html.dark h3{color:#f8fafc!important}
    html.dark input,html.dark textarea{background:#111827!important;color:#f3f4f6!important;border-color:rgba(148,163,184,.35)!important}
    html.dark input::placeholder,html.dark textarea::placeholder{color:#94a3b8!important}
    html.dark .border-amber-200{border-color:rgba(245,158,11,.45)!important}
    html.dark .bg-amber-50{background:rgba(69,26,3,.36)!important}
    html.dark .bg-amber-100{background:rgba(120,53,15,.65)!important}
    html.dark .text-amber-900{color:#fde68a!important}
    html.dark .text-amber-700{color:#fbbf24!important}
    html.dark .bg-primary-600\/70{background-color:rgba(37,99,235,.32)!important}
    html.dark mark{background:#854d0e!important;color:#fef3c7!important}
    
html.dark .floating-theme-panel,html.dark .floating-ai-panel{background:rgba(15,23,42,.96)!important;border-color:rgba(148,163,184,.28)!important;color:#e5e7eb!important}
    html.dark .floating-theme-panel p,html.dark .floating-theme-panel .text-gray-500,html.dark .floating-theme-panel .text-gray-600,html.dark .floating-ai-panel p,html.dark .floating-ai-panel .text-gray-500,html.dark .floating-ai-panel .text-gray-600{color:#cbd5e1!important}
    html.dark .ai-message.assistant{background:rgba(30,41,59,.92)!important;color:#e5e7eb!important}
    html.dark .ai-site-link,html.dark .ai-site-card{background:rgba(30,41,59,.8)!important;border-color:rgba(148,163,184,.28)!important;color:#e5e7eb!important}
    html.dark .floating-ai-panel.ai-fullscreen{background:rgba(15,23,42,.98)!important;border-color:rgba(148,163,184,.28)!important;box-shadow:0 28px 90px rgba(0,0,0,.55)!important}
    html.dark .ai-site-card .text-gray-900{color:#f8fafc!important}
    html.dark .ai-site-card .text-gray-600{color:#cbd5e1!important}
    html.dark .layout-section{background:rgba(15,23,42,.86)!important;border-color:rgba(148,163,184,.24)!important}
    html.dark .mini-site-link{color:#cbd5e1!important}
    html.dark .mini-site-link:hover{background:rgba(37,99,235,.18)!important;color:#93c5fd!important}
    html.dark .theme-segment{background:rgba(30,41,59,.92)!important;color:#cbd5e1!important;border-color:rgba(148,163,184,.28)!important}
    html.dark .theme-segment.active{background:var(--nav-primary)!important;color:#fff!important;border-color:var(--nav-primary)!important}
    html{color-scheme:light}
    html.dark{color-scheme:dark}
    html:not(.dark),html:not(.dark) body,html:not(.dark) *{scrollbar-width:thin;scrollbar-color:#e2e8f0 transparent}
    html:not(.dark)::-webkit-scrollbar,html:not(.dark) body::-webkit-scrollbar,html:not(.dark) *::-webkit-scrollbar{width:8px;height:8px}
    html:not(.dark)::-webkit-scrollbar-track,html:not(.dark) body::-webkit-scrollbar-track,html:not(.dark) *::-webkit-scrollbar-track{background:transparent}
    html:not(.dark)::-webkit-scrollbar-thumb,html:not(.dark) body::-webkit-scrollbar-thumb,html:not(.dark) *::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:999px;border:2px solid transparent;background-clip:content-box}
    html:not(.dark)::-webkit-scrollbar-thumb:hover,html:not(.dark) body::-webkit-scrollbar-thumb:hover,html:not(.dark) *::-webkit-scrollbar-thumb:hover{background:#cbd5e1;background-clip:content-box}
    html.dark,html.dark body,html.dark *{scrollbar-width:thin;scrollbar-color:#475569 #0f172a}
    html.dark::-webkit-scrollbar,html.dark body::-webkit-scrollbar,html.dark *::-webkit-scrollbar{width:10px;height:10px}
    html.dark::-webkit-scrollbar-track,html.dark body::-webkit-scrollbar-track,html.dark *::-webkit-scrollbar-track{background:#0f172a}
    html.dark::-webkit-scrollbar-thumb,html.dark body::-webkit-scrollbar-thumb,html.dark *::-webkit-scrollbar-thumb{background:#475569;border-radius:999px;border:2px solid #0f172a}
    html.dark::-webkit-scrollbar-thumb:hover,html.dark body::-webkit-scrollbar-thumb:hover,html.dark *::-webkit-scrollbar-thumb:hover{background:#64748b}

    /* mobile layout switcher and dark-mode polish */
    div[aria-label="${th('layoutMode')}"]{max-width:100%;min-width:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
    div[aria-label="${th('layoutMode')}"]::-webkit-scrollbar{display:none}
    .layout-toggle{white-space:nowrap;flex:0 0 auto}
    html.dark div[aria-label="${th('layoutMode')}"]{background:rgba(15,23,42,.92)!important;border-color:rgba(148,163,184,.28)!important;box-shadow:0 10px 28px rgba(0,0,0,.28)!important}
    html.dark .layout-toggle{color:#cbd5e1!important;background:transparent!important}
    html.dark .layout-toggle.bg-primary-600,html.dark .layout-toggle.text-white{background:#2563eb!important;color:#fff!important}
    html.dark .floating-action-stack{background:rgba(15,23,42,.72)!important;border-color:rgba(148,163,184,.28)!important;box-shadow:0 18px 48px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.08)!important}
    html.dark .floating-action-btn{background:transparent!important;color:#dbeafe!important}
    html.dark .floating-action-btn:hover,html.dark .floating-action-btn[aria-expanded="true"]{background:rgba(37,99,235,.9)!important;color:#fff!important}
    html.dark .rounded-2xl.bg-white\/10{background:rgba(15,23,42,.28)!important;border-color:rgba(255,255,255,.12)!important}
    @media(max-width:640px){
      #sitesPanel div[aria-label="${th('layoutMode')}"]{display:none!important}
      #sitesPanel .flex.flex-wrap.items-center.justify-between{gap:.75rem!important}
      #sitesPanel .flex.flex-wrap.items-center.gap-2{width:100%;justify-content:flex-start!important}
    }

    .announcement-modal{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.58);padding:1rem;backdrop-filter:blur(6px)}
    .announcement-modal.hidden{display:none}
    .announcement-card{width:min(42rem,100%);max-height:min(80vh,42rem);overflow:auto;border-radius:1.5rem;background:rgba(255,255,255,.98);box-shadow:0 28px 80px rgba(15,23,42,.35);border:1px solid rgba(255,255,255,.7)}
    .announcement-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-bottom:1px solid color-mix(in srgb,var(--nav-primary) 14%,transparent);padding:1rem 1.25rem}
    .announcement-body{padding:1.25rem;line-height:1.75;color:#334155}
    .announcement-body h1,.announcement-body h2,.announcement-body h3{margin:.25em 0 .65em;color:var(--nav-primary);font-weight:700}
    .announcement-body p{margin:.65em 0}.announcement-body ul,.announcement-body ol{margin:.65em 0 .65em 1.4em}.announcement-body li{margin:.25em 0}
    .announcement-body a{color:var(--nav-primary);text-decoration:underline}.announcement-body code{border-radius:.4rem;background:var(--nav-primary-50);padding:.12rem .35rem}
    .announcement-body pre{overflow:auto;border-radius:1rem;background:#111827;color:#f8fafc;padding:1rem}
    .announcement-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.75rem;padding:0 1.25rem 1.25rem}
    html.dark .announcement-card{background:rgba(15,23,42,.98);border-color:rgba(148,163,184,.28)}
    html.dark .announcement-body{color:#cbd5e1}
    html.dark .announcement-body h1,html.dark .announcement-body h2,html.dark .announcement-body h3{color:#93c5fd}

    html[data-festival="newyear"] header{background:linear-gradient(135deg,#b91c1c,#dc2626,#f59e0b)!important}
    html[data-festival="newyear"] .floating-action-stack{box-shadow:0 18px 48px rgba(220,38,38,.22),inset 0 1px 0 rgba(255,255,255,.75)}
    html[data-festival="newyear"] .floating-action-btn:hover,html[data-festival="newyear"] .floating-action-btn[aria-expanded="true"]{background:#dc2626!important}
    html[data-festival="christmas"] header{background:linear-gradient(135deg,#15803d,#dc2626)!important}
    html[data-festival="christmas"] .floating-action-stack{box-shadow:0 18px 48px rgba(21,128,61,.24),inset 0 1px 0 rgba(255,255,255,.75)}
    html[data-festival="christmas"] .floating-action-btn:hover,html[data-festival="christmas"] .floating-action-btn[aria-expanded="true"]{background:#15803d!important}
    html[data-festival="valentine"] header{background:linear-gradient(135deg,#be185d,#ec4899)!important}
    html[data-festival="valentine"] .floating-action-stack{box-shadow:0 18px 48px rgba(236,72,153,.24),inset 0 1px 0 rgba(255,255,255,.75)}
    html[data-festival="valentine"] .floating-action-btn:hover,html[data-festival="valentine"] .floating-action-btn[aria-expanded="true"]{background:#ec4899!important}
    html[data-festival="halloween"] header{background:linear-gradient(135deg,#78350f,#f97316)!important}
    html[data-festival="halloween"] .floating-action-stack{box-shadow:0 18px 48px rgba(249,115,22,.24),inset 0 1px 0 rgba(255,255,255,.75)}
    html[data-festival="halloween"] .floating-action-btn:hover,html[data-festival="halloween"] .floating-action-btn[aria-expanded="true"]{background:#f97316!important}
    .category-link,a[href="?"]{cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .18s ease,color .18s ease,box-shadow .18s ease,transform .12s ease}
    .category-link:active,a[href="?"]:active{transform:scale(.97)}
    .category-all-button { font-weight: 600; }
    .category-active { background-color: var(--nav-primary-50) !important; color: var(--nav-primary) !important; font-weight: 700; }
    html.dark .category-active { background: rgba(37,99,235,.22) !important; color: #dbeafe !important; box-shadow: inset 0 0 0 1px rgba(147,197,253,.24) !important; }
    html.dark .category-active:hover { background: rgba(37,99,235,.30) !important; color: #eff6ff !important; }
    .category-link[data-has-color="true"].category-active { background: var(--cat-bg-dark-hover) !important; box-shadow: inset 0 0 0 1.5px var(--cat-line), 0 4px 12px color-mix(in srgb,var(--cat-line) 15%,transparent) !important; }
    .category-link.is-pending{position:relative;opacity:.88;background:color-mix(in srgb,var(--nav-primary) 10%,white)!important}
    .category-link.is-pending::after{content:"";position:absolute;right:.55rem;top:50%;width:.85rem;height:.85rem;margin-top:-.425rem;border-radius:50%;border:2px solid color-mix(in srgb,var(--nav-primary) 25%,transparent);border-top-color:var(--nav-primary);animation:catSpin .7s linear infinite}
    html.dark .category-link.is-pending{background:rgba(37,99,235,.22)!important}
    html.dark .category-link.is-pending::after{border-color:rgba(147,197,253,.3);border-top-color:#93c5fd}
    @keyframes catSpin{to{transform:rotate(360deg)}}
  </style>
</head>
<body class="bg-secondary-50 text-gray-800">
  <div class="fixed top-4 left-4 z-50 lg:hidden"><button id="sidebarToggle" class="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xl leading-none shadow-md">☰</button></div>
  <button id="expandSidebar" class="hidden lg:block fixed top-4 left-4 z-40 p-2 rounded-lg bg-white shadow-md hover:bg-gray-50 transition" title="展开侧栏">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>
  <div id="mobileOverlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 mobile-overlay lg:hidden"></div>
  <aside id="sidebar" class="fixed left-0 top-0 h-full w-64 bg-white shadow-md border-r border-primary-100/60 z-50 overflow-y-auto mobile-sidebar">
    <div class="p-6">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl font-bold text-primary-600">${escapeHTML(siteName)}</h2>
        <div class="flex items-center gap-2">
          <button id="themeToggle" class="p-1.5 rounded-lg hover:bg-gray-100 transition" title="切换深色/浅色模式" aria-label="切换深色/浅色模式">🌙</button>
          <button id="collapseSidebar" class="hidden lg:block p-1.5 rounded-lg hover:bg-gray-100 transition collapse-btn" title="收起侧栏">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button id="closeSidebar" class="lg:hidden p-1.5 text-2xl leading-none text-gray-600">×</button>
        </div>
      </div>
      <div class="mb-6 sticky top-0 bg-white z-10 pt-2 pb-2 -mt-2">
        <input id="searchInput" type="text" placeholder="搜索书签..." class="w-full px-4 py-2 border border-primary-100 rounded-lg shadow-sm">
        <div id="searchHistoryBox" class="mt-3 hidden">
          <div class="mb-1.5 flex items-center justify-between text-[11px] text-gray-500">
            <span>最近搜索</span>
            <button type="button" id="clearSearchHistory" class="hover:text-primary-600">清空</button>
          </div>
          <div id="searchHistoryList" class="flex flex-wrap gap-1.5"></div>
        </div>
      </div>
      ${spaceSwitcher}
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-gray-500 uppercase">${th('categoryNav')}</h3>
        <input type="text" id="categoryFilterInput" placeholder="过滤分类..." class="w-28 px-2 py-1 text-xs border border-primary-100 rounded bg-gray-50 focus:bg-white outline-none focus:border-primary-300 transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
      </div>
      <div class="space-y-1" id="categoryList">
        <a href="${escapeHTML(allLinkHref)}" class="category-all-button flex items-center px-3 py-2 rounded-lg w-full">${th('all')}</a>
        ${categoryLinks}
      </div>
      <div class="mt-8 pt-6 border-t border-gray-200">
        ${submissionEnabled ? `<button id="addSiteBtnSidebar" class="w-full px-4 py-2 bg-accent-500 text-white rounded-lg">${th('addBookmark')}</button>` : `<div class="text-xs text-primary-600 border rounded-lg p-3">${th('submissionClosed')}</div>`}
        ${visitorPrivateAccess && !adminAuthed ? `<form method="post" action="/" class="mt-3"><input type="hidden" name="_action" value="logout-private"><button type="submit" class="w-full rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100">${th('exitPrivate')}</button></form>` : ''}
        ${blogLink}
        <a href="/admin" target="_blank" class="mt-4 flex items-center justify-between gap-3 px-4 py-2 text-gray-600 hover:text-primary-500 transition duration-300">
          <span class="flex min-w-0 items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A8.966 8.966 0 0112 15c2.21 0 4.236.8 5.879 2.129M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
            </svg>
            <span class="truncate">${th('adminPanel')}</span>
          </span>
          ${adminAuthed ? `<span class="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm ring-2 ring-sky-100" title="管理员已认证，可在前台编辑和拖拽排序" aria-label="管理员已认证">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M16.704 5.296a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </span>` : ''}
        </a>
      </div>
    </div>
  </aside>

  <main class="lg:ml-64 min-h-screen main-content">
    ${heroVisible ? `<header class="bg-primary-700 text-white py-10 px-6 md:px-10 border-b border-primary-600 shadow-sm">
      <div class="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div class="flex-1 text-center md:text-left">
          <span class="inline-flex rounded-full bg-primary-600/70 px-3 py-1 text-[11px] uppercase tracking-[.28em] text-secondary-200/80">${th('heroBadge')}</span>
          <h1 class="mt-4 text-3xl md:text-4xl font-semibold">${escapeHTML(siteName)}</h1>
          <p class="mt-3 text-sm md:text-base text-secondary-100/90">${escapeHTML(siteSubtitle)}</p>
        </div>
        <div class="rounded-2xl bg-white/10 px-6 py-5 shadow-lg border border-white/10"><p class="text-xs uppercase tracking-[.28em]">${th('overview')}</p><p class="mt-3 text-2xl font-semibold">${visibleSites.length}</p><p class="text-sm">${th('categoryCount', { count: categoryNames.length })}</p></div>
      </div>
    </header>` : ''}

    <section class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div id="myUsageSection" class="hidden mb-6 grid gap-4 md:grid-cols-2">
        <div class="usage-card rounded-2xl border border-primary-100/60 bg-white/80 p-4 shadow-sm min-w-0" data-usage="favorites">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-700">⭐ 我的收藏</h3>
            <button type="button" data-usage-clear="favorites" class="text-[11px] text-gray-400 hover:text-primary-600">清空</button>
          </div>
          <div data-usage-list="favorites" class="flex gap-2 text-xs overflow-x-auto pb-1 scrollbar-hide snap-x"></div>
          <p class="usage-empty mt-1 text-[11px] text-gray-400">点击任意书签卡片右上角的 ⭐ 加入收藏</p>
        </div>
        <div class="usage-card rounded-2xl border border-primary-100/60 bg-white/80 p-4 shadow-sm min-w-0" data-usage="recent">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-700">🕘 最近访问</h3>
            <button type="button" data-usage-clear="recent" class="text-[11px] text-gray-400 hover:text-primary-600">清空</button>
          </div>
          <div data-usage-list="recent" class="flex gap-2 text-xs overflow-x-auto pb-1 scrollbar-hide snap-x"></div>
          <p class="usage-empty mt-1 text-[11px] text-gray-400">访问书签后这里会自动记录最近 12 条</p>
        </div>
      </div>
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <h2 id="listHeading" class="text-xl font-semibold text-gray-800">${escapeHTML(heading)}</h2>
        <div class="flex flex-wrap items-center gap-2">
          <div class="hidden sm:flex rounded-full border border-primary-100 bg-white p-1 shadow-sm" aria-label="${th('layoutMode')}">
            <button type="button" class="layout-toggle px-3 py-1.5 rounded-full text-sm text-gray-600" data-layout="grid" title="${th('gridTitle')}">${th('grid')}</button>
            <button type="button" class="layout-toggle px-3 py-1.5 rounded-full text-sm text-gray-600" data-layout="list" title="${th('listTitle')}">${th('list')}</button>
            <button type="button" class="layout-toggle px-3 py-1.5 rounded-full text-sm text-gray-600" data-layout="grouped" title="${th('groupedTitle')}">${th('grouped')}</button>
            <button type="button" class="layout-toggle px-3 py-1.5 rounded-full text-sm text-gray-600" data-layout="masonry" title="${th('masonryTitle')}">${th('masonry')}</button>
            <button type="button" class="layout-toggle px-3 py-1.5 rounded-full text-sm text-gray-600" data-layout="dashboard" title="${th('dashboardTitle')}">${th('dashboard')}</button>
          </div>
          ${sortLinks}
          ${canDragSort ? `<button id="saveOrderBtn" class="px-4 py-2 rounded-lg bg-accent-500 text-white disabled:opacity-50" disabled>${th('saveDragSort')}</button>` : ''}
        </div>
      </div>
      <div id="sitesPanel" class="rounded-2xl border border-primary-100/60 bg-white/80 p-4 sm:p-6 shadow-sm">
        <div id="layoutGridPanel" class="layout-panel active">
          <div id="sitesGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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
    <footer class="bg-white py-8 px-6 mt-12 border-t border-primary-100 text-center text-gray-500">© ${new Date().getFullYear()} ${escapeHTML(siteName)} | ${escapeHTML(footerText)}</footer>
  </main>

  <div class="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3 floating-actions">
    <div id="floatingThemePanel" class="theme-panel floating-theme-panel hidden w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-primary-100/60 bg-white/95 p-4 shadow-2xl">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-gray-900">${th('themeSettings')}</h3>
          <p class="text-xs text-gray-500">${th('themeDesc')}</p>
        </div>
        <button type="button" id="resetThemePrefs" class="text-xs text-primary-600 hover:underline">${th('reset')}</button>
      </div>
      <div class="space-y-3 text-xs text-gray-600">
        <div>
          <div class="mb-1.5 font-medium">预设主题</div>
          <div class="grid grid-cols-3 gap-1.5" id="themePresetGroup">
            <button type="button" class="theme-preset-btn theme-segment" data-preset="starry" title="星空主题：深蓝主色 + 柔和背景 + 卡片布局">🌌 星空</button>
            <button type="button" class="theme-preset-btn theme-segment" data-preset="minimal" title="极简白：浅色纯净 + 紧凑密度 + 列表布局">⬜ 极简</button>
            <button type="button" class="theme-preset-btn theme-segment" data-preset="dark" title="暗黑模式：深色主题 + 渐变背景">🌙 暗黑</button>
            <button type="button" class="theme-preset-btn theme-segment" data-preset="glass" title="毛玻璃：紫色主题 + 渐变背景 + 宽松密度">🪟 玻璃</button>
            <button type="button" class="theme-preset-btn theme-segment" data-preset="dock" title="Mac Dock：绿色主题 + 图标宫格 + 紧凑密度">💻 Dock</button>
            <button type="button" class="theme-preset-btn theme-segment" data-preset="notion" title="Notion 风格：琥珀主题 + 纸纹背景 + 列表布局">📝 Notion</button>
          </div>
        </div>
        <div>
          <div class="mb-1.5 font-medium">${th('themeColor')}</div>
          <div class="grid grid-cols-5 gap-1.5" data-theme-group="accent">
            <button type="button" class="theme-choice h-7 rounded-full bg-[#254267] ring-offset-2" data-theme-key="accent" data-theme-value="blue" title="星空蓝"></button>
            <button type="button" class="theme-choice h-7 rounded-full bg-[#3c976d] ring-offset-2" data-theme-key="accent" data-theme-value="green" title="森林绿"></button>
            <button type="button" class="theme-choice h-7 rounded-full bg-[#8b5cf6] ring-offset-2" data-theme-key="accent" data-theme-value="purple" title="暮光紫"></button>
            <button type="button" class="theme-choice h-7 rounded-full bg-[#e0527d] ring-offset-2" data-theme-key="accent" data-theme-value="rose" title="蔷薇红"></button>
            <button type="button" class="theme-choice h-7 rounded-full bg-[#d97706] ring-offset-2" data-theme-key="accent" data-theme-value="amber" title="琥珀金"></button>
          </div>
        </div>
        <div>
          <div class="mb-1.5 font-medium">${th('density')}</div>
          <div class="grid grid-cols-3 gap-1.5" data-theme-group="density">
            <button type="button" class="theme-segment" data-theme-key="density" data-theme-value="compact">${th('compact')}</button>
            <button type="button" class="theme-segment" data-theme-key="density" data-theme-value="comfortable">${th('comfortable')}</button>
            <button type="button" class="theme-segment" data-theme-key="density" data-theme-value="spacious">${th('spacious')}</button>
          </div>
        </div>
        <div>
          <div class="mb-1.5 font-medium">${th('bgStyle')}</div>
          <div class="grid grid-cols-4 gap-1.5" data-theme-group="bg">
            <button type="button" class="theme-segment" data-theme-key="bg" data-theme-value="plain">${th('plain')}</button>
            <button type="button" class="theme-segment" data-theme-key="bg" data-theme-value="soft">${th('soft')}</button>
            <button type="button" class="theme-segment" data-theme-key="bg" data-theme-value="gradient">${th('gradient')}</button>
            <button type="button" class="theme-segment" data-theme-key="bg" data-theme-value="paper">${th('paper')}</button>
            <button type="button" class="theme-segment" data-theme-key="bg" data-theme-value="image">图片</button>
          </div>
          <div id="bgImageUrlBox" class="mt-1.5 hidden">
            <input id="bgImageUrlInput" type="url" placeholder="背景图片 URL" class="w-full rounded-lg border border-primary-100/60 bg-white px-2.5 py-1.5 text-[11px] outline-none focus:border-primary-300">
          </div>
        </div>
        <div>
          <div class="mb-1.5 font-medium">${th('viewMode')}</div>
          <div class="grid grid-cols-2 gap-1.5" data-theme-group="view">
            <button type="button" class="theme-segment" data-theme-key="view" data-theme-value="detail">${th('detail')}</button>
            <button type="button" class="theme-segment" data-theme-key="view" data-theme-value="minimal">${th('minimal')}</button>
          </div>
        </div>
        <div>
          <div class="mb-1.5 font-medium">${th('homeLayout')}</div>
          <div class="grid grid-cols-3 gap-1.5" data-theme-group="layout">
            <button type="button" class="theme-segment" data-theme-key="layout" data-theme-value="grid">卡片</button>
            <button type="button" class="theme-segment" data-theme-key="layout" data-theme-value="list">列表</button>
            <button type="button" class="theme-segment" data-theme-key="layout" data-theme-value="grouped">分组</button>
            <button type="button" class="theme-segment" data-theme-key="layout" data-theme-value="masonry">瀑布</button>
            <button type="button" class="theme-segment" data-theme-key="layout" data-theme-value="dashboard">概览</button>
          </div>
        </div>
      </div>
    </div>
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
    <div class="floating-action-stack" role="toolbar" aria-label="快捷操作">
      <button type="button" id="floatingAiToggle" class="floating-action-btn" title="${th('aiAssistant')}" aria-expanded="false" aria-controls="floatingAiPanel"><span aria-hidden="true">🤖</span><span class="floating-label">AI</span></button>
      <button type="button" id="floatingThemeToggle" class="floating-action-btn" title="${th('themeSettings')}" aria-expanded="false" aria-controls="floatingThemePanel"><span aria-hidden="true">🎨</span><span class="floating-label">外观</span></button>
      <button type="button" id="backToTopBtn" class="floating-action-btn hidden" title="${th('backToTop')}" aria-label="${th('backToTop')}"><span aria-hidden="true">↑</span><span class="floating-label">顶部</span></button>
    </div>
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
  const themeDefaults={accent:'${escapeHTML(defaultAccent)}',density:'comfortable',bg:'${pageBackgroundImage ? 'image' : 'soft'}',view:'detail',layout:'${escapeHTML(defaultLayout)}'};
  const themeColors={blue:'#254267',green:'#265c44',purple:'#5b3b8c',rose:'#9f3758',amber:'#8a5a16'};
  function getThemePref(key){return localStorage.getItem('nav:'+key)||themeDefaults[key]}
  function setThemePref(key,value){document.documentElement.dataset[key]=value;localStorage.setItem('nav:'+key,value);if(key==='accent'&&themeMeta)themeMeta.setAttribute('content',themeColors[value]||themeColors.blue);if(key==='layout')applyLayout(value);updateThemeControls()}
  function updateThemeToggle(){if(themeToggle)themeToggle.textContent=document.documentElement.classList.contains('dark')?'☀️':'🌙'}
  function updateThemeControls(){document.querySelectorAll('[data-theme-key]').forEach(function(btn){btn.classList.toggle('active',document.documentElement.dataset[btn.dataset.themeKey]===btn.dataset.themeValue)});document.querySelectorAll('.layout-toggle').forEach(function(btn){const active=document.documentElement.dataset.layout===btn.dataset.layout;btn.classList.toggle('bg-primary-600',active);btn.classList.toggle('text-white',active);btn.classList.toggle('text-gray-600',!active)})}
  function applyLayout(layout){const normalized=['grid','list','grouped','masonry','dashboard'].includes(layout)?layout:'grid';document.documentElement.dataset.layout=normalized;document.getElementById('layoutGridPanel')?.classList.toggle('active',['grid','list','masonry'].includes(normalized));document.getElementById('layoutGroupedPanel')?.classList.toggle('active',normalized==='grouped');document.getElementById('layoutDashboardPanel')?.classList.toggle('active',normalized==='dashboard')}
  Object.keys(themeDefaults).forEach(function(key){document.documentElement.dataset[key]=getThemePref(key)});
  if(themeMeta)themeMeta.setAttribute('content',themeColors[getThemePref('accent')]||themeColors.blue);
  applyLayout(getThemePref('layout'));
  updateThemeToggle();
  updateThemeControls();
  themeToggle?.addEventListener('click',function(){const nextDark=!document.documentElement.classList.contains('dark');document.documentElement.classList.toggle('dark',nextDark);localStorage.setItem('nav:theme',nextDark?'dark':'light');updateThemeToggle()});
  document.querySelectorAll('[data-theme-key]').forEach(function(btn){btn.addEventListener('click',function(){setThemePref(this.dataset.themeKey,this.dataset.themeValue)})});
  document.querySelectorAll('.layout-toggle').forEach(function(btn){btn.addEventListener('click',function(){setThemePref('layout',this.dataset.layout)})});
  document.getElementById('resetThemePrefs')?.addEventListener('click',function(){Object.keys(themeDefaults).forEach(function(key){localStorage.removeItem('nav:'+key);document.documentElement.dataset[key]=themeDefaults[key]});localStorage.removeItem('nav:theme');document.documentElement.classList.remove('dark');if(themeMeta)themeMeta.setAttribute('content',themeColors.blue);updateThemeToggle();updateThemeControls()});
  const themePresets={starry:{dark:false,accent:'blue',density:'comfortable',bg:'soft',view:'detail',layout:'grid'},minimal:{dark:false,accent:'blue',density:'compact',bg:'plain',view:'minimal',layout:'list'},dark:{dark:true,accent:'blue',density:'comfortable',bg:'gradient',view:'detail',layout:'grid'},glass:{dark:false,accent:'purple',density:'spacious',bg:'gradient',view:'detail',layout:'masonry'},dock:{dark:false,accent:'green',density:'compact',bg:'plain',view:'minimal',layout:'grid'},notion:{dark:false,accent:'amber',density:'comfortable',bg:'paper',view:'detail',layout:'list'}};
  document.querySelectorAll('.theme-preset-btn').forEach(function(btn){btn.addEventListener('click',function(){const preset=themePresets[this.dataset.preset];if(!preset)return;const isDark=preset.dark;document.documentElement.classList.toggle('dark',isDark);localStorage.setItem('nav:theme',isDark?'dark':'light');updateThemeToggle();Object.keys(themeDefaults).forEach(function(key){if(preset[key]!==undefined){setThemePref(key,preset[key])}});updateThemeControls()})});
  const bgImageUrlBox=document.getElementById('bgImageUrlBox');
  const bgImageUrlInput=document.getElementById('bgImageUrlInput');
  function updateBgImageUI(){const isBgImage=document.documentElement.dataset.bg==='image';bgImageUrlBox?.classList.toggle('hidden',!isBgImage);if(isBgImage){const saved=localStorage.getItem('nav:bgImage')||'';if(bgImageUrlInput)bgImageUrlInput.value=saved;if(saved)document.body.style.setProperty('--nav-bg-image','url('+saved+')')}}
  updateBgImageUI();
  bgImageUrlInput?.addEventListener('change',function(){const url=this.value.trim();localStorage.setItem('nav:bgImage',url);if(url){document.body.style.setProperty('--nav-bg-image','url('+url+')')}else{document.body.style.removeProperty('--nav-bg-image')}});
  const origSetThemePref=setThemePref;
  setThemePref=function(key,value){origSetThemePref(key,value);if(key==='bg')updateBgImageUI()};
  (function(){const savedBg=localStorage.getItem('nav:bg');const savedBgImage=localStorage.getItem('nav:bgImage');if(savedBg==='image'&&savedBgImage){document.body.style.setProperty('--nav-bg-image','url('+savedBgImage+')')}})();
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
  floatingThemeToggle?.addEventListener('click',function(e){e.stopPropagation();const opened=!floatingThemePanel?.classList.contains('hidden');floatingThemePanel?.classList.toggle('hidden',opened);this.setAttribute('aria-expanded',String(!opened));if(!opened){closeFloatingAiPanel()}});
  floatingAiToggle?.addEventListener('click',function(e){e.stopPropagation();const opened=!floatingAiPanel?.classList.contains('hidden');if(opened){closeFloatingAiPanel()}else{openFloatingAiPanel()}});
  closeAiPanelBtn?.addEventListener('click',function(e){e.stopPropagation();closeFloatingAiPanel()});
  toggleAiFullscreenBtn?.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();toggleAiFullscreen()});
  floatingThemePanel?.addEventListener('click',function(e){e.stopPropagation()});
  floatingAiPanel?.addEventListener('click',function(e){e.stopPropagation()});
  document.addEventListener('click',function(){closeFloatingThemePanel();closeFloatingAiPanel()});
  function isEditableTarget(target){return target&&(/^(INPUT|TEXTAREA|SELECT)$/i.test(target.tagName)||target.isContentEditable)}
  function focusSiteSearch(selectText=false){if(!search)return false;search.focus({preventScroll:true});if(selectText)search.select();search.scrollIntoView({block:'center',behavior:'smooth'});return true}
  let activeResultIndex=-1;
  function getVisibleResultCards(){const gridEl=document.getElementById('sitesGrid');if(!gridEl)return[];return [...gridEl.querySelectorAll('.site-card:not(.hidden)')]}
  function clearActiveResult(){document.querySelectorAll('.site-card.result-active').forEach(el=>el.classList.remove('result-active'));activeResultIndex=-1}
  function setActiveResult(index){const cards=getVisibleResultCards();if(!cards.length){activeResultIndex=-1;return}const safeIdx=((index%cards.length)+cards.length)%cards.length;document.querySelectorAll('.site-card.result-active').forEach(el=>el.classList.remove('result-active'));const target=cards[safeIdx];if(!target)return;target.classList.add('result-active');activeResultIndex=safeIdx;target.scrollIntoView({block:'nearest',behavior:'smooth'})}
  function openActiveResult(){const cards=getVisibleResultCards();if(activeResultIndex<0||activeResultIndex>=cards.length)return false;const card=cards[activeResultIndex];const link=card?.querySelector('a[href]');if(!link)return false;const href=link.getAttribute('href')||'';if(!href||href==='#')return false;window.open(href,link.target||'_blank','noopener,noreferrer');return true}
  document.addEventListener('keydown',function(e){const key=e.key||'';if(key==='Escape'){closeFloatingThemePanel();closeFloatingAiPanel();closeModal();clearActiveResult();if(document.activeElement===search)search.blur();return}if((e.ctrlKey||e.metaKey)&&key.toLowerCase()==='k'){e.preventDefault();closeFloatingThemePanel();closeFloatingAiPanel();focusSiteSearch(true);return}if(key==='/'&&!isEditableTarget(e.target)&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();closeFloatingThemePanel();closeFloatingAiPanel();focusSiteSearch(false);return}if((key==='ArrowDown'||key==='ArrowUp'||key==='Enter')&&document.activeElement===search){const cards=getVisibleResultCards();if(!cards.length)return;if(key==='ArrowDown'){e.preventDefault();setActiveResult(activeResultIndex<0?0:activeResultIndex+1)}else if(key==='ArrowUp'){e.preventDefault();setActiveResult(activeResultIndex<0?cards.length-1:activeResultIndex-1)}else if(key==='Enter'){if(openActiveResult()){e.preventDefault()}}}});
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

  const categoryFilterInput = document.getElementById('categoryFilterInput');
  if (categoryFilterInput) {
    categoryFilterInput.addEventListener('input', function() {
      const text = this.value.trim().toLowerCase();
      const nodes = document.querySelectorAll('#categoryList .category-tree-node');
      if (!text) {
        nodes.forEach(node => {
          node.style.display = '';
          const toggleBtn = node.querySelector('.category-toggle');
          const targetId = toggleBtn?.dataset.target;
          if (targetId) {
            const target = document.getElementById(targetId);
            if (target) {
              const shouldBeExpanded = expandedCats.includes(targetId);
              target.classList.toggle('hidden', !shouldBeExpanded);
              toggleBtn.setAttribute('aria-expanded', String(shouldBeExpanded));
              const icon = toggleBtn.querySelector('[data-role="toggle-icon"]');
              if (icon) icon.textContent = shouldBeExpanded ? '－' : '＋';
            }
          }
        });
        return;
      }
      
      nodes.forEach(node => node.style.display = 'none');
      document.querySelectorAll('#categoryList a.category-link').forEach(link => {
        if (link.classList.contains('category-all-button')) return;
        const catName = (link.dataset.categoryName || '').toLowerCase();
        if (catName.includes(text)) {
          let current = link.closest('.category-tree-node');
          while (current && current.id !== 'categoryList') {
            current.style.display = '';
            const parentList = current.parentElement;
            if (parentList && parentList.id && parentList.id.startsWith('category-children-')) {
              parentList.classList.remove('hidden');
              const toggleBtn = document.querySelector('.category-toggle[data-target="'+parentList.id+'"]');
              if (toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', 'true');
                const icon = toggleBtn.querySelector('[data-role="toggle-icon"]');
                if (icon) icon.textContent = '－';
              }
            }
            current = parentList ? parentList.closest('.category-tree-node') : null;
          }
        }
      });
    });
  }

  document.querySelectorAll('.copy-btn').forEach(btn=>btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();const url=this.dataset.url;if(!url)return;navigator.clipboard.writeText(url).then(()=>{this.textContent='已复制';setTimeout(()=>this.textContent='复制',1200)})}));

  const search=document.getElementById('searchInput'), grid=document.getElementById('sitesGrid'), heading=document.getElementById('listHeading');
  const originalGridHTML=grid?.innerHTML||'', originalHeading=heading?.textContent||'';
  const searchHistoryBox=document.getElementById('searchHistoryBox'),searchHistoryList=document.getElementById('searchHistoryList'),clearSearchHistory=document.getElementById('clearSearchHistory');
  const SEARCH_HISTORY_KEY='nav:search-history';
  let searchTimer=null, searchController=null;
  function getSearchHistory(){try{return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)||'[]').filter(Boolean).slice(0,8)}catch{return[]}}
  function setSearchHistory(items){localStorage.setItem(SEARCH_HISTORY_KEY,JSON.stringify(items.slice(0,8)));renderSearchHistory()}
  function addSearchHistory(kw){const term=String(kw||'').trim();if(!term)return;const items=[term,...getSearchHistory().filter(item=>item!==term)].slice(0,8);setSearchHistory(items)}
  function renderSearchHistory(){if(!searchHistoryBox||!searchHistoryList)return;const items=getSearchHistory();searchHistoryBox.classList.toggle('hidden',!items.length);searchHistoryList.innerHTML=items.map(function(item){return '<button type="button" class="search-history-chip rounded-full bg-primary-50 px-2.5 py-1 text-[11px] text-primary-700 hover:bg-primary-100" data-keyword="'+escapeText(item)+'">'+escapeText(item)+'</button>'}).join('')}
  function escapeText(v){return String(v??'').replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
  function highlightText(v,kw){const text=escapeText(v);if(!kw)return text;const safe=kw.replace(/[-\\/\\\\^*+?.()|[\\]{}]/g,'\\\\$&');try{return text.replace(new RegExp('('+safe+')','ig'),'<mark class="rounded bg-amber-100 px-0.5 text-amber-900">$1</mark>')}catch{return text}}
  function normalizeClientUrl(v){const t=String(v||'').trim();return /^https?:\\/\\//i.test(t)?t:(/^[\\w.-]+\\.[\\w.-]+/.test(t)?'https://'+t:'')}
  function isClientUnhealthySite(site){const statusCode=Number(site?.last_status_code);return Boolean(site?.last_error)||(Number.isFinite(statusCode)&&(statusCode<200||statusCode>=400))}
  function renderClientHealthBadge(site){if(!site?.last_checked_at||!isClientUnhealthySite(site))return'';const details=[site.last_status_code?'HTTP '+site.last_status_code:'',site.last_error||'',site.last_checked_at?'最近检测：'+String(site.last_checked_at).slice(0,19):''].filter(Boolean).join(' · ');return '<span class="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600" title="'+escapeText(details||'最近检测异常')+'">可能失效</span>'}
  function renderSearchResultCard(site,kw){const name=site.name||'未命名',cat=site.catelog||'未分类',desc=site.desc||'暂无描述',url=normalizeClientUrl(site.url),visit=url?'/go/'+encodeURIComponent(site.id):'#',tags=Array.isArray(site.tags)?site.tags:[],hits=Math.max(0,Number(site.hits)||0),logo=normalizeClientUrl(site.logo),initial=escapeText((name.trim().charAt(0)||'站').toUpperCase());return '<div class="site-card group bg-white border border-primary-100/60 rounded-xl shadow-sm overflow-hidden" data-id="'+escapeText(site.id)+'"><div class="p-5"><a href="'+escapeText(visit)+'" '+(url?'target="_blank" rel="noopener noreferrer"':'')+' class="block"><div class="flex items-start"><div class="flex-shrink-0 mr-4">'+(logo?'<img src="'+escapeText(logo)+'" alt="'+escapeText(name)+'" loading="lazy" decoding="async" referrerpolicy="no-referrer" class="w-10 h-10 rounded-lg object-cover bg-gray-100" onerror="this.style.display=\\'none\\';this.nextElementSibling.style.display=\\'flex\\'"><div class="w-10 h-10 rounded-lg bg-primary-600 items-center justify-center text-white font-semibold text-lg" style="display:none">'+initial+'</div>':'<div class="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white font-semibold text-lg">'+initial+'</div>')+'</div><div class="flex-1 min-w-0"><h3 class="text-base font-medium text-gray-900 truncate">'+highlightText(name,kw)+'</h3><div class="mt-1 flex flex-wrap items-center gap-1.5"><span class="inline-flex items-center px-2 py-.5 rounded-full text-xs font-medium bg-secondary-100 text-primary-700">'+highlightText(cat,kw)+'</span>'+renderClientHealthBadge(site)+'</div></div></div><p class="mt-2 text-sm text-gray-600 line-clamp-2" title="'+escapeText(desc)+'">'+highlightText(desc,kw)+'</p></a>'+(tags.length?'<div class="mt-3 flex flex-wrap gap-1.5">'+tags.map(function(tag){return '<a href="?tag='+encodeURIComponent(tag)+'" class="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] text-primary-600 hover:bg-primary-100">#'+highlightText(tag,kw)+'</a>'}).join('')+'</div>':'')+'<div class="mt-3 flex items-center justify-between gap-2"><span class="text-xs text-primary-600 truncate max-w-[140px]">'+highlightText(url||site.url||(i18n?.t?.('noLink') || '未提供链接'),kw)+'</span><div class="flex flex-shrink-0 items-center gap-2"><span class="text-[11px] text-gray-400">'+hits+' 次</span><button class="search-copy-btn px-2 py-1 rounded-full text-xs bg-accent-100 text-accent-700" data-url="'+escapeText(url)+'">${escapeHTML(i18n?.t?.('copy') || '复制')}</button></div></div></div></div>'}
  function renderSearchEmpty(kw){const safeKw=escapeText(kw);const tagHint='tag:'+safeKw;const catHint='cat:'+safeKw;return '<div class="col-span-full rounded-2xl border border-dashed border-primary-200 bg-primary-50/60 p-8 text-center"><div class="text-4xl">🔎</div><h3 class="mt-4 text-lg font-semibold text-primary-800">没有找到相关书签</h3><p class="mt-2 text-sm text-primary-600">可以尝试更短关键词、分类名、标签名、网站名称、域名或描述词。</p><div class="mt-4 flex flex-wrap justify-center gap-2 text-xs"><button type="button" class="search-suggest rounded-full bg-white px-3 py-1.5 text-primary-700 shadow-sm" data-keyword="'+safeKw.slice(0,2)+'">改搜前两个字</button><button type="button" class="search-suggest rounded-full bg-white px-3 py-1.5 text-primary-700 shadow-sm" data-keyword="'+escapeText(tagHint)+'">按标签语法</button><button type="button" class="search-suggest rounded-full bg-white px-3 py-1.5 text-primary-700 shadow-sm" data-keyword="'+escapeText(catHint)+'">按分类语法</button><button type="button" id="searchAskAiBtn" class="rounded-full bg-primary-600 px-3 py-1.5 text-white shadow-sm">让 AI 帮忙找</button>'+(document.getElementById('addSiteBtnSidebar')?'<button type="button" id="searchSubmitSiteBtn" class="rounded-full bg-accent-500 px-3 py-1.5 text-white shadow-sm">提交新站</button>':'')+'</div><p class="mt-3 text-xs text-gray-500">当前搜索：'+safeKw+'</p></div>'}
  renderSearchHistory();
  searchHistoryList?.addEventListener('click',function(e){const btn=e.target.closest('.search-history-chip');if(!btn||!search)return;search.value=btn.dataset.keyword||'';search.dispatchEvent(new Event('input',{bubbles:true}));search.focus()});
  clearSearchHistory?.addEventListener('click',function(){localStorage.removeItem(SEARCH_HISTORY_KEY);renderSearchHistory()});
  grid?.addEventListener('click',function(e){const suggest=e.target.closest('.search-suggest');if(suggest&&search){e.preventDefault();e.stopPropagation();search.value=suggest.dataset.keyword||'';search.dispatchEvent(new Event('input',{bubbles:true}));search.focus();return}if(e.target.closest('#searchAskAiBtn')){e.preventDefault();e.stopPropagation();openFloatingAiPanel();if(aiChatInput){aiChatInput.value='帮我找：'+(search?.value||'');aiChatInput.focus()}return}if(e.target.closest('#searchSubmitSiteBtn')){e.preventDefault();e.stopPropagation();modal?.classList.remove('opacity-0','invisible')}});
  search?.addEventListener('input',function(){const kw=this.value.trim();clearTimeout(searchTimer);if(!kw){if(searchController)searchController.abort();grid.innerHTML=originalGridHTML;heading.textContent=originalHeading;applyLayout(getThemePref('layout'));updateThemeControls();return}applyLayout('grid');heading.textContent='搜索中 · '+kw;grid.innerHTML='<div class="col-span-full rounded-2xl border border-primary-100 bg-white p-8 text-center text-primary-600">正在全站搜索...</div>';searchTimer=setTimeout(function(){if(searchController)searchController.abort();searchController=new AbortController();fetch('/api/search?q='+encodeURIComponent(kw)+'&limit=80',{signal:searchController.signal}).then(r=>r.json()).then(d=>{const items=Array.isArray(d.data)?d.data:[];addSearchHistory(kw);heading.textContent='全站搜索 · '+kw+' · '+items.length+' 个结果';grid.innerHTML=items.length?items.map(item=>renderSearchResultCard(item,kw)).join(''):renderSearchEmpty(kw)}).catch(err=>{if(err.name==='AbortError')return;heading.textContent='搜索失败';grid.innerHTML='<div class="col-span-full rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">搜索失败，请稍后重试。</div>'})},260)});
  grid?.addEventListener('click',function(e){const btn=e.target.closest('.search-copy-btn');if(!btn)return;e.preventDefault();e.stopPropagation();const url=btn.dataset.url;if(!url)return;navigator.clipboard.writeText(url).then(()=>{btn.textContent='已复制';setTimeout(()=>btn.textContent='复制',1200)})});

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

