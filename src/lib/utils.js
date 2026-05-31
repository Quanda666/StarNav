export function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

function normalizeErrorCode(status, code) {
  if (code) return String(code).trim().toUpperCase();
  const labels = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
  };
  return labels[status] || `HTTP_${status}`;
}

export function errorResponse(message, status = 500, details = undefined, code = undefined) {
  const errorCode = normalizeErrorCode(status, code);
  const payload = {
    code: status,
    message,
    error: {
      code: errorCode,
      message,
    },
  };
  if (details !== undefined && details !== null) {
    payload.details = details;
    payload.error.details = details;
  }
  return jsonResponse(payload, status);
}

export function badRequest(message = 'Bad Request', details) {
  return errorResponse(message, 400, details, 'BAD_REQUEST');
}

export function unauthorized(message = 'Unauthorized', details) {
  return errorResponse(message, 401, details, 'UNAUTHORIZED');
}

export function forbidden(message = 'Forbidden', details) {
  return errorResponse(message, 403, details, 'FORBIDDEN');
}

export function notFound(message = 'Not Found', details) {
  return errorResponse(message, 404, details, 'NOT_FOUND');
}

export function conflict(message = 'Conflict', details) {
  return errorResponse(message, 409, details, 'CONFLICT');
}

export function htmlResponse(html, status = 200, headers = {}) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...headers,
    },
  });
}

export function textResponse(text, status = 200) {
  return new Response(text, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

// 轻量非加密 hash（djb2 变体），用于静态资源版本号 / 弱 ETag / 缓存键，
// 不用于任何安全场景。同一字符串始终得到同一结果。
export function hashString(input) {
  const str = String(input ?? '');
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = (((hash << 5) + hash) ^ str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export function escapeHTML(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  try {
    const direct = new URL(trimmed);
    if (direct.protocol === 'http:' || direct.protocol === 'https:') return direct.href;
  } catch {
    try {
      const fallback = new URL(`https://${trimmed}`);
      if (fallback.protocol === 'http:' || fallback.protocol === 'https:') return fallback.href;
    } catch {
      return '';
    }
  }
  return '';
}

// 与 sanitizeUrl 相同，但额外允许 data:image/* 协议（用于 logo）
export function sanitizeImageUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  // 允许 data:image/* 格式的 base64 图标
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml|x-icon|vnd\.microsoft\.icon);base64,/i.test(trimmed)) {
    return trimmed;
  }
  // 其他情况走标准 URL 验证
  return sanitizeUrl(trimmed);
}

export function normalizeSortOrder(value, fallback = 9999) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(-2147483648, Math.min(2147483647, Math.round(parsed)));
}

export function cleanText(value, fallback = '') {
  const cleaned = (value ?? '').toString().trim();
  return cleaned || fallback;
}

export function nullableText(value) {
  const cleaned = cleanText(value);
  return cleaned || null;
}

export function isSubmissionEnabled(env, settings = null) {
  const settingFlag = settings?.publicSubmissionEnabled;
  if (settingFlag !== undefined && settingFlag !== null && settingFlag !== '') {
    return String(settingFlag).trim().toLowerCase() === 'true';
  }

  const flag = env.ENABLE_PUBLIC_SUBMISSION;
  if (flag === undefined || flag === null) return true;
  return String(flag).trim().toLowerCase() === 'true';
}

export function buildTree(categories) {
  const byId = new Map();
  const roots = [];

  categories.forEach((category) => {
    byId.set(Number(category.id), { ...category, children: [] });
  });

  byId.forEach((category) => {
    const parentId = category.parent_id === null || category.parent_id === undefined ? null : Number(category.parent_id);
    if (parentId && byId.has(parentId) && parentId !== Number(category.id)) {
      byId.get(parentId).children.push(category);
    } else {
      roots.push(category);
    }
  });

  const sorter = (a, b) => {
    const orderDiff = normalizeSortOrder(a.sort_order) - normalizeSortOrder(b.sort_order);
    if (orderDiff !== 0) return orderDiff;
    return String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans-CN', { sensitivity: 'base' });
  };

  const sortDeep = (nodes) => {
    nodes.sort(sorter);
    nodes.forEach((node) => sortDeep(node.children));
    return nodes;
  };

  return sortDeep(roots);
}

// 首页 CSS 已改为构建期预编译并通过 /static/home.css 提供，不再需要 Tailwind Play CDN
// 的运行时编译（new Function），因此移除了 script-src 的 'unsafe-eval' 与 cdn.tailwindcss.com。
// 仍保留 'unsafe-inline'：首页/后台尚有内联脚本与 style="" 属性。当前以 Report-Only 上线，
// 后续把剩余内联脚本改用 nonce 后，可进一步去掉 'unsafe-inline' 并切换为强制 CSP。
const HTML_CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https:",
  "connect-src 'self'",
].join('; ');

/**
 * 为响应统一注入安全响应头（nosniff / 点击劫持防护 / Referrer-Policy / HTML 的 CSP）。
 *
 * 不覆盖已显式设置的同名头（如 go.js 已设置的 Referrer-Policy）。
 * 通过重建 Response 写入，兼容来自外部 fetch 的不可变 Headers。
 *
 * @param {Response} response 原始响应。
 * @returns {Response} 注入安全头后的响应。
 */
export function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  if (!headers.has('X-Content-Type-Options')) headers.set('X-Content-Type-Options', 'nosniff');
  if (!headers.has('X-Frame-Options')) headers.set('X-Frame-Options', 'SAMEORIGIN');
  if (!headers.has('Referrer-Policy')) headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const contentType = headers.get('Content-Type') || '';
  if (
    contentType.includes('text/html') &&
    !headers.has('Content-Security-Policy') &&
    !headers.has('Content-Security-Policy-Report-Only')
  ) {
    headers.set('Content-Security-Policy-Report-Only', HTML_CSP_REPORT_ONLY);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}