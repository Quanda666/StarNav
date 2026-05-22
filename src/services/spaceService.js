import { cleanText, normalizeSortOrder } from '../lib/utils.js';

function validateSlug(slug) {
  const text = cleanText(slug);
  if (!text) return null;
  const normalized = text.toLowerCase().trim();
  // 仅允许小写字母、数字和连字符
  if (/^[a-z0-9-]+$/.test(normalized)) {
    return normalized;
  }
  return null;
}

export async function listSpaces(env) {
  try {
    const { results } = await env.NAV_DB.prepare(`
      SELECT * FROM spaces
      ORDER BY sort_order ASC, name ASC
    `).all();
    return results || [];
  } catch (error) {
    console.warn(`[spaces] list fallback: ${error?.message || error}`);
    return [{
      id: null,
      name: '默认空间',
      slug: 'default',
      icon: null,
      color: null,
      description: '空间数据表尚未初始化，当前使用默认空间兼容模式。',
      visibility: 'public',
      sort_order: 1,
    }];
  }
}

export async function getDefaultSpace(env) {
  try {
    let space = await env.NAV_DB.prepare("SELECT * FROM spaces WHERE slug = 'default'").first();
    if (space) return space;

    await env.NAV_DB.prepare(`
      INSERT INTO spaces (name, slug, description, visibility, sort_order)
      VALUES ('默认空间', 'default', '系统自动创建的默认导航空间', 'public', 1)
      ON CONFLICT(slug) DO NOTHING
    `).run();

    space = await env.NAV_DB.prepare("SELECT * FROM spaces WHERE slug = 'default'").first();
    if (space) return space;
  } catch (error) {
    console.warn(`[spaces] default fallback: ${error?.message || error}`);
  }

  return {
    id: null,
    name: '默认空间',
    slug: 'default',
    icon: null,
    color: null,
    description: '空间数据表尚未初始化，当前使用默认空间兼容模式。',
    visibility: 'public',
    sort_order: 1,
  };
}

export async function resolveSpace(env, spaceOrSlug) {
  const value = cleanText(spaceOrSlug);
  if (!value) return getDefaultSpace(env);

  const space = await findSpace(env, value);
  if (!space) throw new Error('Space not found');
  return space;
}

export async function resolveSpaceId(env, spaceOrSlug) {
  const space = await resolveSpace(env, spaceOrSlug);
  return Number(space.id) || null;
}

export async function createSpace(env, body) {
  const name = cleanText(body?.name);
  if (!name) throw new Error('Space name is required');

  const slug = validateSlug(body?.slug);
  if (!slug) throw new Error('Space slug is required and must contain only lowercase letters, numbers, and hyphens');

  // 检查唯一性
  const existingName = await env.NAV_DB.prepare('SELECT id FROM spaces WHERE name = ?').bind(name).first();
  if (existingName) throw new Error('Space name already exists');

  const existingSlug = await env.NAV_DB.prepare('SELECT id FROM spaces WHERE slug = ?').bind(slug).first();
  if (existingSlug) throw new Error('Space slug already exists');

  const sortOrder = normalizeSortOrder(body?.sort_order);
  const icon = cleanText(body?.icon) || null;
  const color = cleanText(body?.color) || null;
  const description = cleanText(body?.description) || null;
  const visibility = ['public', 'private', 'admin_only'].includes(body?.visibility) ? body.visibility : 'public';

  const result = await env.NAV_DB.prepare(`
    INSERT INTO spaces (name, slug, icon, color, description, visibility, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(name, slug, icon, color, description, visibility, sortOrder).run();

  return result;
}

export async function updateSpace(env, id, body) {
  const space = await findSpace(env, id);
  if (!space) throw new Error('Space not found');

  // 默认空间不允许修改 slug
  const isDefault = space.slug === 'default';

  const name = body?.name === undefined ? space.name : cleanText(body.name);
  if (!name) throw new Error('Space name cannot be empty');

  let slug = space.slug;
  if (!isDefault && body?.slug !== undefined) {
    slug = validateSlug(body.slug);
    if (!slug) throw new Error('Space slug must contain only lowercase letters, numbers, and hyphens');
  }

  // 检查唯一性
  if (name !== space.name) {
    const existingName = await env.NAV_DB.prepare('SELECT id FROM spaces WHERE name = ? AND id <> ?').bind(name, space.id).first();
    if (existingName) throw new Error('Space name already exists');
  }
  if (slug !== space.slug) {
    const existingSlug = await env.NAV_DB.prepare('SELECT id FROM spaces WHERE slug = ? AND id <> ?').bind(slug, space.id).first();
    if (existingSlug) throw new Error('Space slug already exists');
  }

  const sortOrder = body?.sort_order === undefined ? space.sort_order : normalizeSortOrder(body.sort_order);
  const icon = body?.icon === undefined ? space.icon : (cleanText(body.icon) || null);
  const color = body?.color === undefined ? space.color : (cleanText(body.color) || null);
  const description = body?.description === undefined ? space.description : (cleanText(body.description) || null);
  const visibility = body?.visibility === undefined ? space.visibility : (['public', 'private', 'admin_only'].includes(body.visibility) ? body.visibility : space.visibility);

  const result = await env.NAV_DB.prepare(`
    UPDATE spaces
    SET name = ?, slug = ?, icon = ?, color = ?, description = ?, visibility = ?, sort_order = ?, update_time = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(name, slug, icon, color, description, visibility, sortOrder, space.id).run();

  return result;
}

export async function deleteSpace(env, id) {
  const space = await findSpace(env, id);
  if (!space) throw new Error('Space not found');

  if (space.slug === 'default') {
    throw new Error('Default space cannot be deleted');
  }

  // 级联删除该空间下的所有分类和书签
  await env.NAV_DB.batch([
    env.NAV_DB.prepare('DELETE FROM sites WHERE space_id = ?').bind(space.id),
    env.NAV_DB.prepare('DELETE FROM categories WHERE space_id = ?').bind(space.id),
    env.NAV_DB.prepare('DELETE FROM spaces WHERE id = ?').bind(space.id),
  ]);
}

export async function findSpace(env, idOrSlug) {
  try {
    if (/^\d+$/.test(String(idOrSlug))) {
      return env.NAV_DB.prepare('SELECT * FROM spaces WHERE id = ?').bind(Number(idOrSlug)).first();
    }
    return env.NAV_DB.prepare('SELECT * FROM spaces WHERE slug = ?').bind(String(idOrSlug)).first();
  } catch (error) {
    console.warn(`[spaces] find fallback: ${error?.message || error}`);
    return null;
  }
}