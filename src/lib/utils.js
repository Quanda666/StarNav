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

export function isSubmissionEnabled(env) {
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