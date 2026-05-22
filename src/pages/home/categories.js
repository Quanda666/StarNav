import { escapeHTML } from '../../lib/utils.js';
import { isPrivateBookmarkCategory } from '../../services/privateBookmarkService.js';

export function flattenCategories(nodes, level = 0, output = []) {
  nodes.forEach((node) => {
    output.push({ ...node, level });
    flattenCategories(node.children || [], level + 1, output);
  });
  return output;
}

export function getAncestorNames(nodes, targetName, ancestors = []) {
  for (const node of nodes) {
    const currentPath = [...ancestors, node.name];
    if (node.name === targetName) {
      return ancestors;
    }
    const found = getAncestorNames(node.children || [], targetName, currentPath);
    if (found.length) {
      return found;
    }
  }
  return [];
}

export function sanitizeCategorySvgIcon(value) {
  let svg = String(value || '').trim();
  if (!/^<svg[\s>]/i.test(svg) || !/<\/svg>$/i.test(svg)) return '';
  svg = svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(?:href|xlink:href)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|[^\s>]*javascript:[^\s>]*)/gi, '')
    .replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  if (!/^<svg[\s>][\s\S]*<\/svg>$/i.test(svg)) return '';
  return svg;
}

export function renderCategoryIcon(icon) {
  const raw = String(icon || '').trim();
  if (!raw) return '';
  const svg = sanitizeCategorySvgIcon(raw);
  if (svg) return svg;
  return escapeHTML(raw);
}

export function getCategoryCssColor(value) {
  const raw = String(value || '').trim();
  if (!raw) return { raw: '', color: '', isGradient: false };
  if (/[;"'{}<>]/.test(raw) || /(?:url|javascript|expression|behavior|@import)/i.test(raw)) {
    return { raw: '', color: '', isGradient: false };
  }
  if (/^linear-gradient\(/i.test(raw)) return { raw, color: raw, isGradient: true };
  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(raw)) return { raw, color: raw, isGradient: false };
  if (/^rgba?\([^)]+\)$/i.test(raw) || /^hsla?\([^)]+\)$/i.test(raw)) return { raw, color: raw, isGradient: false };
  if (/^(primary|accent|secondary)$/i.test(raw)) return { raw, color: `var(--nav-${raw.toLowerCase()})`, isGradient: false };
  if (/^[a-z][a-z0-9-]{1,30}$/i.test(raw)) return { raw, color: raw, isGradient: false };
  return { raw: '', color: '', isGradient: false };
}

export function renderCategoryLinks(nodes, options, level = 0) {
  const { catalog, catalogExists, space, expandedNames, privateUnlocked, privateBookmarksVisible } = options;
  return nodes.filter((cat) => privateBookmarksVisible || privateUnlocked || !isPrivateBookmarkCategory(cat.name)).map((cat) => {
    const safeName = escapeHTML(cat.name);
    const active = false; // This will be handled by JS
    const hasChildren = Array.isArray(cat.children) && cat.children.length > 0;
    const expanded = expandedNames.has(cat.name);
    const isPrivate = isPrivateBookmarkCategory(cat.name);
    const iconText = renderCategoryIcon(cat.icon);
    const safeDescription = escapeHTML(cat.description || '');
    const colorInfo = getCategoryCssColor(cat.color);
    const cssColor = colorInfo.color;
    const iconMarkup = iconText ? `<span class="category-icon mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/80 text-sm leading-none shadow-sm ${active ? 'text-primary-600' : 'text-gray-400'}" data-has-color="${cssColor ? 'true' : 'false'}">${iconText}</span>` : '';
    const textColor = colorInfo.isGradient ? 'var(--nav-primary)' : cssColor;
    const mixColor = colorInfo.isGradient ? 'var(--nav-accent)' : cssColor;
    const colorVars = cssColor ? `--cat-color:${textColor};--cat-color-dark:${colorInfo.isGradient ? '#f8fafc' : `color-mix(in srgb,${mixColor} 34%,white)`};--cat-bg:${colorInfo.isGradient ? cssColor : `color-mix(in srgb,${mixColor} 13%,white)`};--cat-bg-dark:color-mix(in srgb,${mixColor} 18%,#0f172a);--cat-bg-dark-hover:color-mix(in srgb,${mixColor} 25%,#0f172a);--cat-border-dark:color-mix(in srgb,${mixColor} 38%,transparent);--cat-line:${mixColor};` : '';
    const itemStyle = colorVars;
    const titleParts = [cat.name];
    if (cat.description) titleParts.push(cat.description);
    if (cat.color) titleParts.push(`颜色：${cat.color}`);
    const title = escapeHTML(titleParts.join(' · '));
    const childId = `category-children-${String(cat.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const childMarkup = hasChildren
      ? `<div id="${childId}" class="${expanded ? '' : 'hidden'} mt-1 space-y-1">${renderCategoryLinks(cat.children, options, level + 1)}</div>`
      : '';
    const link = new URLSearchParams({ catalog: cat.name });
    if (space) link.set('space', space);

    return `<div class="category-tree-node" data-level="${level}">
      <div class="flex items-center gap-1">
        <a href="?${link.toString()}" class="category-link flex min-w-0 flex-1 items-center px-3 py-2 rounded-lg hover:bg-gray-100" data-category-name="${safeName}" data-has-color="${cssColor ? 'true' : 'false'}" data-has-icon="${iconText ? 'true' : 'false'}" style="padding-left:${12 + level * 14}px;${itemStyle}" title="${title}">
          ${iconMarkup}
          <span class="truncate">${safeName}</span>
          ${safeDescription ? `<span class="ml-2 hidden truncate text-xs text-gray-400 sm:inline" title="${safeDescription}">${safeDescription}</span>` : ''}
          ${isPrivate && !privateUnlocked ? '<span class="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">锁</span>' : ''}
        </a>
        ${hasChildren ? `<button type="button" class="category-toggle h-8 w-8 flex-shrink-0 rounded-lg text-gray-500 hover:bg-gray-100" data-target="${childId}" aria-expanded="${expanded ? 'true' : 'false'}" title="${expanded ? '收起子类' : '展开子类'}"><span data-role="toggle-icon">${expanded ? '－' : '＋'}</span></button>` : ''}
      </div>
      ${childMarkup}
    </div>`;
  }).join('');
}