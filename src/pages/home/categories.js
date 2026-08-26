import { escapeHTML } from '../../lib/utils.js';
import { isPrivateBookmarkCategory } from '../../services/privateBookmarkService.js';

// 分类自定义 SVG 图标白名单：只允许这些标签/属性，其余一律拒绝整段 SVG。
// 采用白名单校验而非黑名单清理，从根本上规避 <script>/<foreignObject>/<animate>/on*/href 等绕过。
const SVG_ALLOWED_TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon',
  'defs', 'lineargradient', 'radialgradient', 'stop', 'title', 'desc', 'text', 'tspan',
]);
const SVG_ALLOWED_ATTRS = new Set([
  'viewbox', 'xmlns', 'width', 'height', 'fill', 'stroke', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray',
  'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'dx', 'dy',
  'points', 'transform', 'opacity', 'fill-opacity', 'stroke-opacity',
  'fill-rule', 'clip-rule', 'offset', 'stop-color', 'stop-opacity',
  'gradientunits', 'gradienttransform', 'class', 'id', 'text-anchor', 'font-size',
]);

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
  const svg = String(value || '').trim();
  if (!/^<svg[\s>]/i.test(svg) || !/<\/svg>$/i.test(svg)) return '';

  // 1) 标签白名单：任一标签不在白名单（如 script/foreignObject/animate/set/use/a/image）→ 整体拒绝
  const tagPattern = /<\/?\s*([a-zA-Z][a-zA-Z0-9:-]*)/g;
  let match;
  while ((match = tagPattern.exec(svg)) !== null) {
    if (!SVG_ALLOWED_TAGS.has(match[1].toLowerCase())) return '';
  }

  // 2) 属性白名单：任一属性不在白名单（拦截 on*、href/xlink:href、style 等）→ 整体拒绝
  const attrPattern = /\s([a-zA-Z][a-zA-Z0-9:_-]*)\s*=/g;
  while ((match = attrPattern.exec(svg)) !== null) {
    if (!SVG_ALLOWED_ATTRS.has(match[1].toLowerCase())) return '';
  }

  // 3) 兜底：拒绝藏在允许属性里的危险协议值
  if (/(?:javascript|vbscript|data)\s*:/i.test(svg)) return '';

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
    const hasChildren = Array.isArray(cat.children) && cat.children.length > 0;
    const expanded = expandedNames.has(cat.name);
    const isPrivate = isPrivateBookmarkCategory(cat.name);
    const iconText = renderCategoryIcon(cat.icon);
    const iconMarkup = iconText ? `<span class="category-icon">${iconText}</span>` : '';
    const titleParts = [cat.name];
    if (cat.description) titleParts.push(cat.description);
    const title = escapeHTML(titleParts.join(' · '));
    const childId = `category-children-${String(cat.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const childMarkup = hasChildren
      ? `<div id="${childId}" class="${expanded ? '' : 'hidden'} mt-1 space-y-1">${renderCategoryLinks(cat.children, options, level + 1)}</div>`
      : '';
    const link = new URLSearchParams({ catalog: cat.name });
    if (space) link.set('space', space);

    return `<div class="category-tree-node" data-level="${level}">
      <div class="flex items-center gap-1">
        <a href="?${link.toString()}" class="category-link" data-category-name="${safeName}" data-has-icon="${iconText ? 'true' : 'false'}" style="padding-left:${8 + level * 10}px" title="${title}">
          ${iconMarkup}
          <span class="truncate">${safeName}</span>
          ${isPrivate && !privateUnlocked ? '<span class="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">锁</span>' : ''}
        </a>
        ${hasChildren ? `<button type="button" class="category-toggle h-8 w-8 flex-shrink-0 rounded-lg text-gray-500 hover:bg-gray-100" data-target="${childId}" aria-expanded="${expanded ? 'true' : 'false'}" title="${expanded ? '收起子类' : '展开子类'}"><span data-role="toggle-icon">${expanded ? '－' : '＋'}</span></button>` : ''}
      </div>
      ${childMarkup}
    </div>`;
  }).join('');
}