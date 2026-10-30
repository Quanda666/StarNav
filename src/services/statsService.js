// 站点统计画像：给 AI 小助理、后台概览、邮件摘要共用。
//
// 设计要点：
//   - 单次调用最多 4 条聚合 SQL（并行），避免 AI 问答时引入明显延迟；
//   - 全部查询带 try/catch 降级，历史库缺字段/缺表时返回 null 而不是抛错；
//   - 尊重可见性：未登录访客的统计只覆盖公开书签，管理员拿全量。

import { getBeijingParts, beijingDayRangeUtc } from '../lib/datetime.js';

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function safeFirst(env, sql, binds = []) {
  try {
    const row = await env.NAV_DB.prepare(sql).bind(...binds).first();
    return row || null;
  } catch (error) {
    console.warn(`[stats] query failed: ${error?.message || error}`);
    return null;
  }
}

async function safeAll(env, sql, binds = []) {
  try {
    const { results } = await env.NAV_DB.prepare(sql).bind(...binds).all();
    return results || [];
  } catch (error) {
    console.warn(`[stats] query failed: ${error?.message || error}`);
    return [];
  }
}

/**
 * 汇总站点规模数据。
 *
 * @param {object} env Workers 环境绑定。
 * @param {{adminAuthed?: boolean, privateUnlocked?: boolean, now?: number}} [options]
 * @returns {Promise<object>} 统计对象；查询失败的字段为 0 / null。
 */
export async function getSiteStats(env, { adminAuthed = false, privateUnlocked = false, now } = {}) {
  const includePrivate = Boolean(adminAuthed || privateUnlocked);
  const visibilityClause = includePrivate ? '' : "WHERE COALESCE(visibility, 'public') = 'public'";
  const today = beijingDayRangeUtc(now);
  const weekStart = beijingDayRangeUtc(now, -6);
  const monthStart = beijingDayRangeUtc(now, -29);

  const [totals, categoryRow, tagRow, spaceRow, recent, topCategory, topTag] = await Promise.all([
    safeFirst(env, `
      SELECT
        COUNT(*) AS total_sites,
        SUM(CASE WHEN COALESCE(hits, 0) > 0 THEN 1 ELSE 0 END) AS visited_sites,
        SUM(COALESCE(hits, 0)) AS total_hits,
        SUM(CASE WHEN datetime(create_time) >= datetime(?) THEN 1 ELSE 0 END) AS today_new,
        SUM(CASE WHEN datetime(create_time) >= datetime(?) THEN 1 ELSE 0 END) AS week_new,
        SUM(CASE WHEN datetime(create_time) >= datetime(?) THEN 1 ELSE 0 END) AS month_new,
        MIN(datetime(create_time)) AS first_created,
        MAX(datetime(create_time)) AS last_created
      FROM sites
      ${visibilityClause}
    `, [today.start, weekStart.start, monthStart.start]),
    safeFirst(env, 'SELECT COUNT(*) AS total FROM categories'),
    safeFirst(env, 'SELECT COUNT(*) AS total FROM tags'),
    safeFirst(env, 'SELECT COUNT(*) AS total FROM spaces'),
    safeAll(env, `
      SELECT name, catelog, create_time
      FROM sites
      ${visibilityClause}
      ORDER BY datetime(create_time) DESC, id DESC
      LIMIT 3
    `),
    safeFirst(env, `
      SELECT COALESCE(c.name, s.catelog, '未分类') AS name, COUNT(*) AS site_count
      FROM sites s
      LEFT JOIN categories c ON c.id = s.category_id
      ${includePrivate ? '' : "WHERE COALESCE(s.visibility, 'public') = 'public'"}
      GROUP BY name
      ORDER BY site_count DESC, name ASC
      LIMIT 1
    `),
    safeFirst(env, `
      SELECT t.name AS name, COUNT(DISTINCT st.site_id) AS site_count
      FROM tags t
      LEFT JOIN site_tags st ON st.tag_id = t.id
      LEFT JOIN sites s ON s.id = st.site_id
      ${includePrivate ? '' : "WHERE s.id IS NULL OR COALESCE(s.visibility, 'public') = 'public'"}
      GROUP BY t.name
      HAVING site_count > 0
      ORDER BY site_count DESC, t.name ASC
      LIMIT 1
    `),
  ]);

  const pendingRow = adminAuthed
    ? await safeFirst(env, "SELECT COUNT(*) AS total FROM pending_sites WHERE COALESCE(status, 'pending') = 'pending'")
    : null;

  return {
    scope: includePrivate ? 'all' : 'public',
    totalSites: toNumber(totals?.total_sites),
    visitedSites: toNumber(totals?.visited_sites),
    totalHits: toNumber(totals?.total_hits),
    todayNew: toNumber(totals?.today_new),
    weekNew: toNumber(totals?.week_new),
    monthNew: toNumber(totals?.month_new),
    totalCategories: toNumber(categoryRow?.total),
    totalTags: toNumber(tagRow?.total),
    totalSpaces: toNumber(spaceRow?.total),
    pendingSites: pendingRow ? toNumber(pendingRow.total) : null,
    firstCreatedAt: totals?.first_created || null,
    lastCreatedAt: totals?.last_created || null,
    latestSites: (recent || []).map((row) => ({
      name: row.name || '',
      catelog: row.catelog || '未分类',
      createdAt: row.create_time || '',
    })),
    topCategory: topCategory ? { name: topCategory.name || '', count: toNumber(topCategory.site_count) } : null,
    topTag: topTag ? { name: topTag.name || '', count: toNumber(topTag.site_count) } : null,
    generatedAt: Date.now(),
  };
}

/**
 * 生成给大模型看的「站点规模快照」文本，注入 system prompt 以提升事实准确率。
 *
 * @param {object} stats getSiteStats() 的返回值。
 * @returns {string}
 */
export function formatStatsForPrompt(stats = {}) {
  if (!stats || !stats.totalSites) return '本站暂无书签数据。';
  const lines = [
    `书签总数：${stats.totalSites} 条${stats.scope === 'public' ? '（公开可见）' : '（含私密/内部）'}`,
    `分类数：${stats.totalCategories}；标签数：${stats.totalTags}`,
    `累计访问：${stats.totalHits} 次`,
    `今日新增：${stats.todayNew}；近 7 天新增：${stats.weekNew}；近 30 天新增：${stats.monthNew}`,
  ];
  if (stats.topCategory?.name) lines.push(`书签最多的分类：${stats.topCategory.name}（${stats.topCategory.count} 条）`);
  if (stats.topTag?.name) lines.push(`使用最多的标签：${stats.topTag.name}（${stats.topTag.count} 条）`);
  if (stats.pendingSites !== null && stats.pendingSites !== undefined) lines.push(`待审核提交：${stats.pendingSites} 条`);
  return lines.join('\n');
}

/**
 * 生成站点统计的自然语言回答（不经过大模型，事实 100% 准确）。
 *
 * @param {object} stats getSiteStats() 的返回值。
 * @param {{adminAuthed?: boolean, now?: number}} [options]
 * @returns {string}
 */
export function describeSiteStats(stats = {}, { adminAuthed = false, now } = {}) {
  if (!stats.totalSites) {
    return '本站目前还没有收录书签。你可以在书签提交入口推荐一个，管理员审核后就会出现在这里。';
  }
  const p = getBeijingParts(now);
  const scopeNote = stats.scope === 'public' ? '（仅统计公开书签）' : '';
  const lines = [
    `截至${p.yearMonthDay} ${p.time}（北京时间），本站共有 ${stats.totalSites} 条书签${scopeNote}，分属 ${stats.totalCategories} 个分类、${stats.totalTags} 个标签。`,
  ];
  if (stats.topCategory?.name) lines.push(`其中「${stats.topCategory.name}」分类书签最多，共 ${stats.topCategory.count} 条。`);
  if (stats.topTag?.name) lines.push(`使用最多的标签是「${stats.topTag.name}」（${stats.topTag.count} 条书签）。`);
  lines.push(`收录节奏：今天新增 ${stats.todayNew} 条，近 7 天 ${stats.weekNew} 条，近 30 天 ${stats.monthNew} 条。`);
  if (stats.totalHits) lines.push(`站内累计访问 ${stats.totalHits} 次。`);
  if (adminAuthed && stats.pendingSites) lines.push(`另外还有 ${stats.pendingSites} 条书签提交等待审核。`);
  return lines.join('\n');
}
