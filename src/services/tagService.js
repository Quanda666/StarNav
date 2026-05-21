import { cleanText } from '../lib/utils.js';

export function normalizeTags(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => cleanText(item)).filter(Boolean))];
  }

  const text = cleanText(value);
  if (!text) return [];

  return [...new Set(text.split(/[,，、\s]+/).map((item) => cleanText(item)).filter(Boolean))];
}

export async function setSiteTags(env, siteId, tags) {
  const normalizedTags = normalizeTags(tags);

  await env.NAV_DB.prepare('DELETE FROM site_tags WHERE site_id = ?').bind(siteId).run();

  for (const tagName of normalizedTags) {
    await env.NAV_DB.prepare(`
      INSERT INTO tags (name)
      VALUES (?)
      ON CONFLICT(name) DO NOTHING
    `).bind(tagName).run();

    const tag = await env.NAV_DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first();
    if (!tag) continue;

    await env.NAV_DB.prepare(`
      INSERT OR IGNORE INTO site_tags (site_id, tag_id)
      VALUES (?, ?)
    `).bind(siteId, tag.id).run();
  }
}

export async function attachTagsToSites(env, sites) {
  if (!Array.isArray(sites) || sites.length === 0) return sites || [];

  const ids = sites.map((site) => Number(site.id)).filter(Number.isFinite);
  if (!ids.length) return sites;

  const allRows = [];
  const batchSize = 80;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batchIds = ids.slice(i, i + batchSize);
    const placeholders = batchIds.map(() => '?').join(',');
    const { results } = await env.NAV_DB.prepare(`
      SELECT st.site_id, t.name
      FROM site_tags st
      JOIN tags t ON t.id = st.tag_id
      WHERE st.site_id IN (${placeholders})
      ORDER BY t.name ASC
    `).bind(...batchIds).all();
    allRows.push(...(results || []));
  }

  const tagMap = new Map();
  allRows.forEach((row) => {
    const key = Number(row.site_id);
    if (!tagMap.has(key)) tagMap.set(key, []);
    tagMap.get(key).push(row.name);
  });

  return sites.map((site) => ({
    ...site,
    tags: tagMap.get(Number(site.id)) || [],
  }));
}

export async function getSiteIdsByTag(env, tagName) {
  const normalizedTag = cleanText(tagName);
  if (!normalizedTag) return [];

  const { results } = await env.NAV_DB.prepare(`
    SELECT st.site_id
    FROM site_tags st
    JOIN tags t ON t.id = st.tag_id
    WHERE t.name = ?
  `).bind(normalizedTag).all();

  return (results || []).map((row) => Number(row.site_id)).filter(Number.isFinite);
}

export async function mergeTags(env, { source, target } = {}) {
  const sourceName = cleanText(source);
  const targetName = cleanText(target);
  if (!sourceName || !targetName) throw new Error('source and target tags are required');
  if (sourceName === targetName) throw new Error('source and target tags must be different');
  
  const sourceTag = await env.NAV_DB.prepare('SELECT id, name FROM tags WHERE name = ?').bind(sourceName).first();
  if (!sourceTag) throw new Error('source tag not found');

  await env.NAV_DB.prepare(`
    INSERT INTO tags (name)
    VALUES (?)
    ON CONFLICT(name) DO NOTHING
  `).bind(targetName).run();

  const targetTag = await env.NAV_DB.prepare('SELECT id, name FROM tags WHERE name = ?').bind(targetName).first();
  if (!targetTag) throw new Error('target tag not found');

  const countRow = await env.NAV_DB.prepare('SELECT COUNT(DISTINCT site_id) AS total FROM site_tags WHERE tag_id = ?').bind(sourceTag.id).first();
  const moved = Number(countRow?.total) || 0;

  await env.NAV_DB.prepare(`
    INSERT OR IGNORE INTO site_tags (site_id, tag_id)
    SELECT site_id, ? FROM site_tags WHERE tag_id = ?
  `).bind(targetTag.id, sourceTag.id).run();

  await env.NAV_DB.prepare('DELETE FROM site_tags WHERE tag_id = ?').bind(sourceTag.id).run();
  await env.NAV_DB.prepare('DELETE FROM tags WHERE id = ?').bind(sourceTag.id).run();

  return {
    source: sourceName,
    target: targetName,
    moved,
  };
}

export async function listSitesNeedingTags(env, { limit = 20, maxTags = 0 } = {}) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const safeMaxTags = Math.min(5, Math.max(0, Number(maxTags) || 0));
  const { results } = await env.NAV_DB.prepare(`
    SELECT
      s.id,
      s.name,
      s.url,
      s.logo,
      s.desc,
      s.catelog,
      s.visibility,
      s.sort_order,
      COUNT(st.tag_id) AS tag_count
    FROM sites s
    LEFT JOIN site_tags st ON st.site_id = s.id
    GROUP BY s.id
    HAVING tag_count <= ?
    ORDER BY tag_count ASC, s.update_time DESC, s.id DESC
    LIMIT ?
  `).bind(safeMaxTags, safeLimit).all();

  return results || [];
}

export async function applySiteTagSuggestions(env, { items = [], mode = 'append' } = {}) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => ({
      siteId: Number(item?.siteId || item?.id),
      tags: normalizeTags(item?.tags || []),
    }))
    .filter((item) => Number.isInteger(item.siteId) && item.siteId > 0 && item.tags.length)
    .slice(0, 50);
  if (!normalizedItems.length) throw new Error('items required');
  const safeMode = mode === 'replace' ? 'replace' : 'append';
  const results = [];

  for (const item of normalizedItems) {
    const site = await env.NAV_DB.prepare('SELECT id, name FROM sites WHERE id = ?').bind(item.siteId).first();
    if (!site) {
      results.push({ siteId: item.siteId, ok: false, tags: item.tags, message: 'site not found' });
      continue;
    }

    let nextTags = item.tags;
    if (safeMode === 'append') {
      const { results: currentRows } = await env.NAV_DB.prepare(`
        SELECT t.name
        FROM site_tags st
        JOIN tags t ON t.id = st.tag_id
        WHERE st.site_id = ?
        ORDER BY t.name ASC
      `).bind(item.siteId).all();
      nextTags = normalizeTags([...(currentRows || []).map((row) => row.name), ...item.tags]);
    }

    await setSiteTags(env, item.siteId, nextTags);
    results.push({ siteId: item.siteId, ok: true, siteName: site.name, tags: nextTags });
  }

  return {
    mode: safeMode,
    total: normalizedItems.length,
    updated: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}

export async function listTags(env) {
  const { results } = await env.NAV_DB.prepare(`
    SELECT
      t.id,
      t.name,
      COUNT(st.site_id) AS site_count
    FROM tags t
    LEFT JOIN site_tags st ON st.tag_id = t.id
    GROUP BY t.id, t.name
    ORDER BY site_count DESC, t.name ASC
  `).all();

  return results || [];
}