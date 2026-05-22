import { jsonResponse } from '../../lib/utils.js';
import { isAdminAuthenticated } from '../../lib/auth.js';
import { hasPrivateBookmarkAccess } from '../../services/privateBookmarkService.js';
import { listSpaces } from '../../services/spaceService.js';
import { requireAdmin } from './errors.js';

export async function handleSpacesApiRequest(request, env, ctx, path, method, id) {
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

    return jsonResponse({
      code: 409,
      message: '空间管理功能当前处于稳定化冻结状态，暂不支持新增空间。',
    }, 409);
  }

  if (path.startsWith('/spaces/') && id) {
    const unauthorized = await requireAdmin(request, env, { allowApiToken: false });
    if (unauthorized) return unauthorized;

    const decodedId = decodeURIComponent(id);

    if (method === 'PUT') {
      return jsonResponse({
        code: 409,
        message: '空间管理功能当前处于稳定化冻结状态，暂不支持修改空间。',
      }, 409);
    }

    if (method === 'DELETE') {
      return jsonResponse({
        code: 409,
        message: '空间管理功能当前处于稳定化冻结状态，暂不支持删除空间。',
      }, 409);
    }
  }

  return null;
}