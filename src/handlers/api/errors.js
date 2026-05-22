import { conflict, errorResponse, forbidden, jsonResponse, unauthorized } from '../../lib/utils.js';
import { hasBearerToken, isAdminAuthenticated, validateApiToken } from '../../lib/auth.js';

export async function requireAdmin(request, env, options = {}) {
  const { allowApiToken = false, scope = 'write' } = options;

  if (allowApiToken && hasBearerToken(request)) {
    const tokenAuth = await validateApiToken(request, env, scope);
    if (tokenAuth.authenticated) return null;
    if (tokenAuth.forbidden) {
      return forbidden('API token scope is insufficient', {
        requiredScope: scope,
        tokenScopes: tokenAuth.token?.scopes || [],
      });
    }
  }

  if (await isAdminAuthenticated(request, env)) {
    return null;
  }

  if (allowApiToken && !hasBearerToken(request)) {
    const tokenAuth = await validateApiToken(request, env, scope);
    if (tokenAuth.authenticated) return null;
    if (tokenAuth.forbidden) {
      return forbidden('API token scope is insufficient', {
        requiredScope: scope,
        tokenScopes: tokenAuth.token?.scopes || [],
      });
    }
  }

  return unauthorized(allowApiToken ? 'Admin cookie or Bearer token is required' : 'Admin authentication is required', {
    allowApiToken,
    requiredScope: allowApiToken ? scope : undefined,
  });
}

export async function handleApiError(error) {
  if (error?.code === 'DUPLICATE_URL') {
    const details = {
      duplicate: error.duplicate || null,
      scope: error.scope || 'site',
    };
    const response = conflict(error.message, details);
    const payload = await response.json();
    return jsonResponse({ ...payload, ...details }, 409);
  }

  const message = error?.message || 'Internal Server Error';
  const status = /required|invalid|not found|children|sites|parent|must be|valid https url/i.test(message) ? 400 : 500;
  return errorResponse(status === 500 ? `Internal Server Error: ${message}` : message, status);
}