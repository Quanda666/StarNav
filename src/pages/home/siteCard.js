import { escapeHTML, sanitizeUrl, sanitizeImageUrl } from '../../lib/utils.js';

export function isUnhealthySite(site) {
  const statusCode = Number(site?.last_status_code);
  return Boolean(site?.last_error) || (Number.isFinite(statusCode) && (statusCode < 200 || statusCode >= 400));
}

export function renderHealthBadge(site) {
  if (!site?.last_checked_at || !isUnhealthySite(site)) return '';
  const details = [
    site.last_status_code ? `HTTP ${site.last_status_code}` : '',
    site.last_error || '',
    site.last_checked_at ? `最近检测：${String(site.last_checked_at).slice(0, 19)}` : '',
  ].filter(Boolean).join(' · ');
  return `<span class="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600" title="${escapeHTML(details || '最近检测异常')}">可能失效</span>`;
}

export function renderMiniSiteLink(site, meta = '', i18n = null) {
  const name = site.name || (i18n?.t?.('unnamed') || '未命名');
  const catalog = site.catelog || (i18n?.t?.('uncategorized') || '未分类');
  const normalizedUrl = sanitizeUrl(site.url);
  const visitUrl = normalizedUrl ? `/go/${encodeURIComponent(site.id)}` : '#';
  return `<a href="${escapeHTML(visitUrl)}" ${normalizedUrl ? 'target="_blank" rel="noopener noreferrer"' : ''} data-url="${escapeHTML(normalizedUrl || '')}" class="mini-site-link">
    <span class="min-w-0 flex-1 truncate">${escapeHTML(name)}</span>
    ${renderHealthBadge(site)}
    <span class="flex-shrink-0 text-xs text-gray-400">${escapeHTML(meta || catalog)}</span>
  </a>`;
}

export function renderGroupedSites(sites, isAdmin = false, i18n = null) {
  if (!sites.length) {
    return `<div class="layout-section text-center text-sm text-gray-500">${escapeHTML(i18n?.t?.('noBookmarks') || '当前没有可展示的书签。')}</div>`;
  }

  const groups = new Map();
  for (const site of sites) {
    const catalog = site.catelog || (i18n?.t?.('uncategorized') || '未分类');
    if (!groups.has(catalog)) groups.set(catalog, []);
    groups.get(catalog).push(site);
  }

  return `<div class="space-y-4">
    ${[...groups.entries()].map(([catalog, items]) => `
      <section class="layout-section">
        <div class="layout-section-title">
          <span>${escapeHTML(catalog)}</span>
          <span class="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-600">${escapeHTML(i18n?.t?.('itemCount', { count: items.length }) || `${items.length} 个`)}</span>
        </div>
        <div class="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          ${items.map((site) => renderMiniSiteLink(site, '', i18n)).join('')}
        </div>
      </section>
    `).join('')}
  </div>`;
}

export function renderDashboardSites(sites, isAdmin = false, i18n = null) {
  if (!sites.length) {
    return `<div class="layout-section text-center text-sm text-gray-500">${escapeHTML(i18n?.t?.('noBookmarks') || '当前没有可展示的书签。')}</div>`;
  }

  const topHits = [...sites]
    .sort((a, b) => (Number(b.hits) || 0) - (Number(a.hits) || 0))
    .slice(0, 8);
  const recentVisits = [...sites]
    .filter((site) => site.last_visit_time)
    .sort((a, b) => String(b.last_visit_time || '').localeCompare(String(a.last_visit_time || '')))
    .slice(0, 8);
  const newest = [...sites]
    .sort((a, b) => String(b.create_time || '').localeCompare(String(a.create_time || '')))
    .slice(0, 8);

  const renderPanel = (title, subtitle, items, metaFn) => `
    <section class="layout-section">
      <div class="layout-section-title">
        <span>${escapeHTML(title)}</span>
        <span class="text-xs font-normal text-gray-400">${escapeHTML(subtitle)}</span>
      </div>
      <div class="space-y-1">
        ${(items.length ? items : newest).map((site) => renderMiniSiteLink(site, metaFn(site), i18n)).join('')}
      </div>
    </section>
  `;

  return `<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
    ${renderPanel(i18n?.t?.('topSites') || '常用站点', i18n?.t?.('byHits') || '按访问次数', topHits, (site) => i18n?.t?.('hits', { count: Math.max(0, Number(site.hits) || 0) }) || `${Math.max(0, Number(site.hits) || 0)} 次`)}
    ${renderPanel(i18n?.t?.('recent') || '最近访问', i18n?.t?.('byVisitTime') || '按访问时间', recentVisits, (site) => site.last_visit_time ? String(site.last_visit_time).slice(0, 10) : (i18n?.t?.('none') || '暂无'))}
    ${renderPanel(i18n?.t?.('newest') || '新加入', i18n?.t?.('byCreateTime') || '按添加时间', newest, (site) => site.create_time ? String(site.create_time).slice(0, 10) : site.catelog || (i18n?.t?.('uncategorized') || '未分类'))}
  </div>`;
}

export function renderSiteCard(site, draggable, isAdmin = false, i18n = null) {
  const name = site.name || (i18n?.t?.('unnamed') || '未命名');
  const catalog = site.catelog || (i18n?.t?.('uncategorized') || '未分类');
  const desc = site.desc || (i18n?.t?.('noDescription') || '暂无描述');
  const normalizedUrl = sanitizeUrl(site.url);
  const logoUrl = sanitizeImageUrl(site.logo);
  const initial = escapeHTML((name.trim().charAt(0) || '站').toUpperCase());
  const safeDesc = escapeHTML(desc);
  const visitUrl = normalizedUrl ? `/go/${encodeURIComponent(site.id)}` : '#';
  const hits = Math.max(0, Number(site.hits) || 0);
  const tags = Array.isArray(site.tags) ? site.tags : [];
  const tagLinks = tags.length
    ? `<div class="mt-3 flex flex-wrap gap-1.5">${tags.map((tag) => `<a href="?tag=${encodeURIComponent(tag)}" class="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] text-primary-600 hover:bg-primary-100" onclick="event.stopPropagation()">#${escapeHTML(tag)}</a>`).join('')}</div>`
    : '';
  const adminActions = isAdmin
    ? `<div class="mt-3 flex gap-2 border-t border-primary-50 pt-3"><button type="button" class="front-edit-btn flex-1 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100" data-id="${site.id}">${escapeHTML(i18n?.t?.('edit') || '编辑')}</button><button type="button" class="front-delete-btn flex-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100" data-id="${site.id}" data-name="${escapeHTML(name)}">${escapeHTML(i18n?.t?.('delete') || '删除')}</button></div>`
    : '';
  return `<div class="site-card group bg-white border border-primary-100/60 rounded-xl shadow-sm overflow-hidden ${draggable ? 'cursor-move' : ''}" data-id="${site.id}" data-name="${escapeHTML(name)}" data-url="${escapeHTML(normalizedUrl || site.url || '')}" data-catalog="${escapeHTML(catalog)}" data-tags="${escapeHTML(tags.join(' '))}" ${draggable ? 'draggable="true"' : ''}>
    <div class="p-5">
      <a href="${escapeHTML(visitUrl)}" ${normalizedUrl ? 'target="_blank" rel="noopener noreferrer"' : ''} class="block">
        <div class="flex items-start"><div class="flex-shrink-0 mr-4">${logoUrl ? `<img src="${escapeHTML(logoUrl)}" alt="${escapeHTML(name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" class="w-10 h-10 rounded-lg object-cover bg-gray-100" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="w-10 h-10 rounded-lg bg-primary-600 items-center justify-center text-white font-semibold text-lg" style="display:none">${initial}</div>` : `<div class="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white font-semibold text-lg">${initial}</div>`}</div>
        <div class="flex-1 min-w-0"><h3 class="text-base font-medium text-gray-900 truncate">${escapeHTML(name)}</h3><div class="mt-1 flex flex-wrap items-center gap-1.5"><span class="inline-flex items-center px-2 py-.5 rounded-full text-xs font-medium bg-secondary-100 text-primary-700">${escapeHTML(catalog)}</span>${renderHealthBadge(site)}</div></div></div>
        <p class="mt-2 text-sm text-gray-600 line-clamp-2" title="${safeDesc}">${safeDesc}</p>
      </a>
      ${tagLinks}
      <div class="mt-3 flex items-center justify-between gap-2"><span class="text-xs text-primary-600 truncate max-w-[140px]">${escapeHTML(normalizedUrl || site.url || (i18n?.t?.('noLink') || '未提供链接'))}</span><div class="flex flex-shrink-0 items-center gap-2"><span class="text-[11px] text-gray-400" title="${escapeHTML(i18n?.t?.('visitCount') || '访问次数')}">${escapeHTML(i18n?.t?.('hits', { count: hits }) || `${hits} 次`)}</span><button class="copy-btn px-2 py-1 rounded-full text-xs bg-accent-100 text-accent-700" data-url="${escapeHTML(normalizedUrl)}">${escapeHTML(i18n?.t?.('copy') || '复制')}</button></div></div>
      ${adminActions}
    </div>
  </div>`;
}

export function sortSitesForView(sites, sortMode, options = {}) {
  const sorted = [...sites];
  if (sortMode === 'hot') {
    return sorted.sort((a, b) => {
      const hitsDiff = (Number(b.hits) || 0) - (Number(a.hits) || 0);
      if (hitsDiff !== 0) return hitsDiff;
      return String(b.last_visit_time || b.create_time || '').localeCompare(String(a.last_visit_time || a.create_time || ''));
    });
  }

  if (sortMode === 'recent') {
    return sorted.sort((a, b) => {
      const timeDiff = String(b.last_visit_time || '').localeCompare(String(a.last_visit_time || ''));
      if (timeDiff !== 0) return timeDiff;
      return (Number(b.hits) || 0) - (Number(a.hits) || 0);
    });
  }

  if (options.newestFirst) {
    return sorted.sort((a, b) => String(b.create_time || '').localeCompare(String(a.create_time || '')));
  }

  return sorted;
}

export function renderSortLinks({ catalog, tag, sortMode, space, disabled, i18n }) {
  if (disabled) return '';
  const baseParams = new URLSearchParams();
  if (catalog) baseParams.set('catalog', catalog);
  if (tag) baseParams.set('tag', tag);
  if (space) baseParams.set('space', space);

  const buildHref = (mode) => {
    const params = new URLSearchParams(baseParams);
    if (mode) params.set('sort', mode);
    const query = params.toString();
    return query ? `?${query}` : '?';
  };

  const linkClass = (active) => `px-3 py-1.5 rounded-full text-sm border transition ${active ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-primary-100 hover:bg-primary-50 hover:text-primary-700'}`;

  return `
    <a href="${escapeHTML(buildHref(''))}" class="${linkClass(!sortMode)}">默认</a>
    <a href="${escapeHTML(buildHref('hot'))}" class="${linkClass(sortMode === 'hot')}">热门</a>
    <a href="${escapeHTML(buildHref('recent'))}" class="${linkClass(sortMode === 'recent')}">最近访问</a>
  `;
}