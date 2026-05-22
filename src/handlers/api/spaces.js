import { errorResponse, jsonResponse } from '../../lib/utils.js';
import { isAdminAuthenticated } from '../../lib/auth.js';
import { hasPrivateBookmarkAccess } from '../../services/privateBookmarkService.js';
import { createSpace, deleteSpace, listSpaces, updateSpace } from '../../services/spaceService.js';
import { requireAdmin } from './errors.js';
import { OPERATION_LOG_ACTIONS, logOperation } from '../../services/operationLogService.js';

export async function handleSpacesApiRequest(request, env, ctx, path, method, id) {
  const url = new URL(request.url);

  if (path === '/spaces' && method === 'GET') {
    const adminAuthed = await isAdminAuthenticated(request, env);
    const privateAccess = adminAuthed || await hasPrivateBookmarkAccess(request, env);
    const allSpaces = await listSpaces(env);

    // 根据权限过滤空间
    const filteredSpaces = allSpaces.filter(space => {
      if (adminAuthed) return true;
      if (space.visibility === 'admin_only') return false;
      if (space.visibility === 'private') return privateAccess;
      return true;
    });

    return jsonResponse({ code: 200, data: filteredSpaces, total: filteredSpaces.length });
  }

  if (path === '/spaces' && method === 'POST') {
    const unauthorized = await requireAdmin(request, env, { allowApiToken: false });
    if (unauthorized) return unauthorized;

    const body = await request.json().catch(() => ({}));
    const result = await createSpace(env, body);
    
    if (ctx?.waitUntil) {
      ctx.waitUntil(logOperation(env, {
        action: OPERATION_LOG_ACTIONS.SPACE_CREATE || 'space.create',
        target: 'space',
        targetId: result?.meta?.last_row_id,
        summary: body?.name,
        request
      }).catch(() => {}));
    }

    return jsonResponse({ code: 201, message: 'Space created successfully', result }, 201);
  }

  if (path.startsWith('/spaces/') && id) {
    const unauthorized = await requireAdmin(request, env, { allowApiToken: false });
    if (unauthorized) return unauthorized;

    const decodedId = decodeURIComponent(id);

    if (method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const result = await updateSpace(env, decodedId, body);

      if (ctx?.waitUntil) {
        ctx.waitUntil(logOperation(env, {
          action: OPERATION_LOG_ACTIONS.SPACE_UPDATE || 'space.update',
          target: 'space',
          targetId: decodedId,
          summary: body?.name,
          request
        }).catch(() => {}));
      }

      return jsonResponse({ code: 200, message: 'Space updated successfully', result });
    }

    if (method === 'DELETE') {
      await deleteSpace(env, decodedId);

      if (ctx?.waitUntil) {
        ctx.waitUntil(logOperation(env, {
          action: OPERATION_LOG_ACTIONS.SPACE_DELETE || 'space.delete',
          target: 'space',
          targetId: decodedId,
          request
        }).catch(() => {}));
      }

      return jsonResponse({ code: 200, message: 'Space deleted successfully' });
    }
  }

  return null;
}