import { buildTree, cleanText, normalizeSortOrder } from '../lib/utils.js';
import { PRIVATE_BOOKMARK_CATEGORY } from './privateBookmarkService.js';

function cleanCategoryColor(value) {
  const text = cleanText(value);
  if (!text) return null;

  const normalized = text.replace(/\s+/g, ' ').trim();
  if (/[;"'{}<>]/.test(normalized) || /(?:url|javascript|expression|behavior|@import)/i.test(normalized)) {
    return null;
  }

  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(normalized)) return normalized;
  if (/^rgba?\(\s*(?:\d{1,3}\s*,\s*){2}\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(normalized)) return normalized;
  if (/^hsla?\(\s*\d{1,3}(?:deg)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(normalized)) return normalized;
  if (/^(primary|accent|secondary|slate|sky|cyan|teal|emerald|green|lime|amber|orange|rose|pink|purple|violet|indigo|blue|red|zinc|stone)$/i.test(normalized)) {
    return normalized.toLowerCase();
  }
  if (/^linear-gradient\(\s*(?:\d{1,3}deg|to\s+(?:top|right|bottom|left)(?:\s+(?:top|right|bottom|left))?)\s*,\s*(?:#[0-9a-f]{3}(?:[0-9a-f]{3})?|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z][a-z0-9-]{1,30})\s*(?:\d{1,3}%?)?\s*,\s*(?:#[0-9a-f]{3}(?:[0-9a-f]{3})?|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z][a-z0-9-]{1,30})\s*(?:\d{1,3}%?)?\s*\)$/i.test(normalized)) {
    return normalized;
  }

  return null;
}

async function getDescendantCategoryIds(env, categoryId) {
  const { results } = await env.NAV_DB.prepare(`
    WITH RECURSIVE descendants(id) AS (
      SELECT id FROM categories WHERE parent_id = ?
      UNION ALL
      SELECT c.id FROM categories c
      INNER JOIN descendants d ON c.parent_id = d.id
    )
    SELECT id FROM descendants
  `).bind(categoryId).all();

  return (results || []).map((row) => Number(row.id)).filter(Boolean);
}

async function ensurePrivateBookmarkCategory(env) {
  const legacyPrivateDescription = String.fromCharCode(38656,35201,35775,38382,23494,30721,30340,31169,20154,20070,31614,20998,31867);
  try {
    await env.NAV_DB.batch([
      env.NAV_DB.prepare(`
        INSERT INTO categories (name, sort_order, icon, description)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(name) DO NOTHING
      `).bind(PRIVATE_BOOKMARK_CATEGORY, 2147483647, null, null),
      env.NAV_DB.prepare(`
        INSERT INTO category_orders (catelog, sort_order)
        VALUES (?, ?)
        ON CONFLICT(catelog) DO UPDATE SET sort_order = excluded.sort_order
      `).bind(PRIVATE_BOOKMARK_CATEGORY, 2147483647),
      env.NAV_DB.prepare(`
        UPDATE categories
        SET
          icon = CASE WHEN icon = 'lock' THEN NULL ELSE icon END,
          description = CASE WHEN description = ? THEN NULL ELSE description END,
          update_time = CURRENT_TIMESTAMP
        WHERE name = ? AND (icon = 'lock' OR description = ?)
      `).bind(legacyPrivateDescription, PRIVATE_BOOKMARK_CATEGORY, legacyPrivateDescription),
    ]);
  } catch (error) {
    console.warn(`[categories] private category full ensure fallback: ${error?.message || error}`);
    try {
      await env.NAV_DB.prepare(`
        INSERT INTO categories (name, sort_order)
        VALUES (?, ?)
        ON CONFLICT(name) DO NOTHING
      `).bind(PRIVATE_BOOKMARK_CATEGORY, 2147483647).run();
    } catch (fallbackError) {
      console.warn(`[categories] private category minimal ensure skipped: ${fallbackError?.message || fallbackError}`);
    }
  }
}

export async function listCategories(env, { space = '' } = {}) {
  await ensurePrivateBookmarkCategory(env);

  const where = [];
  const binds = [];
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const { results } = await env.NAV_DB.prepare(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM sites s WHERE s.category_id = c.id OR (s.category_id IS NULL AND s.catelog = c.name)) AS site_count,
        (SELECT COUNT(*) FROM categories child WHERE child.parent_id = c.id) AS child_count
      FROM categories c
      ${whereSql}
      ORDER BY c.sort_order ASC, c.name ASC
    `).bind(...binds).all();

    return results || [];
  } catch (error) {
    console.warn(`[categories] list fallback: ${error?.message || error}`);
  }

  try {
    const { results } = await env.NAV_DB.prepare(`
      SELECT
        c.id,
        c.name,
        NULL AS parent_id,
        9999 AS sort_order,
        NULL AS icon,
        NULL AS color,
        NULL AS description,
        COUNT(s.id) AS site_count,
        0 AS child_count
      FROM categories c
      LEFT JOIN sites s ON s.catelog = c.name
      GROUP BY c.id, c.name
      ORDER BY c.name ASC
    `).all();

    return results || [];
  } catch (legacyError) {
    console.warn(`[categories] legacy list fallback: ${legacyError?.message || legacyError}`);
  }

  try {
    const { results } = await env.NAV_DB.prepare(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY catelog ASC) AS id,
        catelog AS name,
        NULL AS parent_id,
        9999 AS sort_order,
        NULL AS icon,
        NULL AS color,
        NULL AS description,
        COUNT(*) AS site_count,
        0 AS child_count
      FROM sites
      WHERE COALESCE(TRIM(catelog), '') <> ''
      GROUP BY catelog
      ORDER BY catelog ASC
    `).all();

    return results || [];
  } catch (sitesOnlyError) {
    console.warn(`[categories] sites-only list fallback: ${sitesOnlyError?.message || sitesOnlyError}`);
    return [];
  }
}

export async function getCategoryTree(env, { space = '' } = {}) {
  const categories = await listCategories(env, { space });
  const tree = buildTree(categories);
  const existingPrivateNode = removePrivateCategoryNode(tree);

  tree.push({
    ...(existingPrivateNode || {
      id: 'private-bookmarks',
      name: PRIVATE_BOOKMARK_CATEGORY,
      parent_id: null,
      sort_order: 2147483647,
      icon: '',
      description: '',
      site_count: 0,
      child_count: 0,
      children: [],
    }),
    name: PRIVATE_BOOKMARK_CATEGORY,
    parent_id: null,
    sort_order: 2147483647,
    description: existingPrivateNode?.description || '',
    is_private: true,
  });

  return tree;
}

function removePrivateCategoryNode(nodes) {
  const index = nodes.findIndex((node) => node.name === PRIVATE_BOOKMARK_CATEGORY);
  if (index !== -1) {
    return nodes.splice(index, 1)[0];
  }

  for (const node of nodes) {
    const found = removePrivateCategoryNode(node.children || []);
    if (found) return found;
  }

  return null;
}

export async function createCategory(env, body) {
  const name = cleanText(body?.name);
  if (!name) throw new Error('Category name is required');

  const parentId = body?.parent_id ? Number(body.parent_id) : null;
  const sortOrder = normalizeSortOrder(body?.sort_order);
  if (parentId) {
    const parent = await env.NAV_DB.prepare('SELECT id FROM categories WHERE id = ?').bind(parentId).first();
    if (!parent) throw new Error('Parent category not found');
  }

  const result = await env.NAV_DB.prepare(`
    INSERT INTO categories (name, parent_id, sort_order, icon, color, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(name, parentId, sortOrder, cleanText(body?.icon) || null, cleanCategoryColor(body?.color), cleanText(body?.description) || null).run();

  await env.NAV_DB.prepare(`
    INSERT INTO category_orders (catelog, sort_order)
    VALUES (?, ?)
    ON CONFLICT(catelog) DO UPDATE SET sort_order = excluded.sort_order
  `).bind(name, sortOrder).run();

  return result;
}

export async function updateCategory(env, idOrName, body) {
  const category = await findCategory(env, idOrName);
  if (!category) throw new Error('Category not found');

  const newName = cleanText(body?.name, category.name);
  const parentId = body?.parent_id === '' || body?.parent_id === undefined ? category.parent_id : (body.parent_id === null ? null : Number(body.parent_id));
  const sortOrder = normalizeSortOrder(body?.sort_order, normalizeSortOrder(category.sort_order));
  const icon = body?.icon === undefined ? category.icon : (cleanText(body.icon) || null);
  const color = body?.color === undefined ? category.color : cleanCategoryColor(body.color);
  const description = body?.description === undefined ? category.description : (cleanText(body.description) || null);
  if (parentId && Number(parentId) === Number(category.id)) {
    throw new Error('Category cannot be its own parent');
  }
  if (parentId) {
    const parent = await env.NAV_DB.prepare('SELECT id FROM categories WHERE id = ?').bind(parentId).first();
    if (!parent) throw new Error('Parent category not found');
    const descendants = await getDescendantCategoryIds(env, category.id);
    if (descendants.includes(Number(parentId))) {
      throw new Error('Category cannot move into its descendant category');
    }
  }

  await env.NAV_DB.batch([
    env.NAV_DB.prepare(`
      UPDATE categories
      SET name = ?, parent_id = ?, sort_order = ?, icon = ?, color = ?, description = ?, update_time = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newName, parentId || null, sortOrder, icon, color, description, category.id),
    env.NAV_DB.prepare('UPDATE sites SET catelog = ?, update_time = CURRENT_TIMESTAMP WHERE category_id IS NULL AND catelog = ?').bind(newName, category.name),
    env.NAV_DB.prepare('UPDATE pending_sites SET catelog = ? WHERE catelog = ?').bind(newName, category.name),
    env.NAV_DB.prepare('DELETE FROM category_orders WHERE catelog = ?').bind(category.name),
    env.NAV_DB.prepare(`
      INSERT INTO category_orders (catelog, sort_order)
      VALUES (?, ?)
      ON CONFLICT(catelog) DO UPDATE SET sort_order = excluded.sort_order
    `).bind(newName, sortOrder),
  ]);

  return { oldName: category.name, newName, sort_order: sortOrder, parent_id: parentId || null };
}

export async function deleteCategory(env, idOrName) {
  const category = await findCategory(env, idOrName);
  if (!category) throw new Error('Category not found');

  const child = await env.NAV_DB.prepare('SELECT id FROM categories WHERE parent_id = ? LIMIT 1').bind(category.id).first();
  if (child) throw new Error('Category has children, please move or delete children first');

  const site = await env.NAV_DB.prepare('SELECT id FROM sites WHERE category_id = ? OR (category_id IS NULL AND catelog = ?) LIMIT 1').bind(category.id, category.name).first();
  if (site) throw new Error('Category has sites, please move sites before deleting');

  await env.NAV_DB.batch([
    env.NAV_DB.prepare('DELETE FROM categories WHERE id = ?').bind(category.id),
    env.NAV_DB.prepare('DELETE FROM category_orders WHERE catelog = ?').bind(category.name),
    env.NAV_DB.prepare('DELETE FROM category_metadata WHERE catelog = ?').bind(category.name),
  ]);
}

export async function upsertCategoryByName(env, name, sortOrder = 9999) {
  const normalizedName = cleanText(name);
  if (!normalizedName) return null;

  await env.NAV_DB.batch([
    env.NAV_DB.prepare(`
      INSERT INTO categories (name, sort_order)
      VALUES (?, ?)
      ON CONFLICT(name) DO NOTHING
    `).bind(normalizedName, normalizeSortOrder(sortOrder)),
    env.NAV_DB.prepare(`
      INSERT INTO category_orders (catelog, sort_order)
      VALUES (?, ?)
      ON CONFLICT(catelog) DO NOTHING
    `).bind(normalizedName, normalizeSortOrder(sortOrder)),
  ]);

  return findCategory(env, normalizedName);
}

export async function reorderCategories(env, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('items must be a non-empty array');
  }

  const ids = items.map((item) => Number(item.id)).filter((id) => Number.isFinite(id) && id > 0);
  if (!ids.length) throw new Error('No valid category ids provided');

  const placeholders = ids.map(() => '?').join(',');
  const { results } = await env.NAV_DB.prepare(`SELECT id, name FROM categories WHERE id IN (${placeholders})`).bind(...ids).all();
  const nameMap = new Map((results || []).map((row) => [Number(row.id), row.name]));

  const statements = [];
  for (const [index, item] of items.entries()) {
    const id = Number(item.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const sortOrder = normalizeSortOrder(item.sort_order, (index + 1) * 10);
    statements.push(
      env.NAV_DB.prepare('UPDATE categories SET sort_order = ?, update_time = CURRENT_TIMESTAMP WHERE id = ?').bind(sortOrder, id)
    );
    const name = nameMap.get(id);
    if (name) {
      statements.push(
        env.NAV_DB.prepare(`
          INSERT INTO category_orders (catelog, sort_order)
          VALUES (?, ?)
          ON CONFLICT(catelog) DO UPDATE SET sort_order = excluded.sort_order
        `).bind(name, sortOrder)
      );
    }
  }

  if (statements.length) await env.NAV_DB.batch(statements);
  return { updated: items.length };
}

export async function findCategory(env, idOrName) {
  if (/^\d+$/.test(String(idOrName))) {
    return env.NAV_DB.prepare('SELECT * FROM categories WHERE id = ?').bind(Number(idOrName)).first();
  }
  return env.NAV_DB.prepare('SELECT * FROM categories WHERE name = ?').bind(String(idOrName)).first();
}