import test from 'node:test';
import assert from 'node:assert/strict';

import { detectRealtimeIntent, buildRealtimeAnswer, buildSearchPlan, decideWebSearch, chatWithAiAssistant } from '../src/services/aiService.js';

const NOW = Date.UTC(2026, 9, 30, 7, 30, 0); // 北京时间 2026-10-30 15:30 星期五

// 极简 D1 桩：按 SQL 文本特征返回固定行，用于验证“统计类问题不经过模型”的接线
function stubEnv() {
  const db = {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          if (sql.includes('total_sites')) {
            return {
              total_sites: 42,
              visited_sites: 10,
              total_hits: 300,
              today_new: 2,
              week_new: 5,
              month_new: 9,
              first_created: '2026-01-01 00:00:00',
              last_created: '2026-10-30 01:00:00',
            };
          }
          if (sql.includes('FROM categories')) return { total: 6 };
          if (sql.includes('FROM tags')) return { total: 21 };
          if (sql.includes('FROM spaces')) return { total: 1 };
          if (sql.includes('site_count')) return { name: '开发工具', site_count: 12 };
          if (sql.includes('pending_sites')) return { total: 3 };
          return null;
        },
        async all() { return { results: [] }; },
        async run() { return { meta: {} }; },
      };
    },
    async batch() { return []; },
  };
  return { NAV_DB: db, NAV_AUTH: { get: async () => null, put: async () => {} } };
}

test('识别时间/日期/星期类问题', () => {
  assert.equal(detectRealtimeIntent('今天星期几').kind, 'weekday');
  assert.equal(detectRealtimeIntent('今天是星期几？').kind, 'weekday');
  assert.equal(detectRealtimeIntent('现在几点了').kind, 'clock');
  assert.equal(detectRealtimeIntent('现在时间是多少').kind, 'clock');
  assert.equal(detectRealtimeIntent('今天几号').kind, 'date');
  assert.equal(detectRealtimeIntent('今年是哪一年').kind, 'year');
});

test('识别站点统计类问题及其焦点', () => {
  const sites = detectRealtimeIntent('本站一共有多少书签');
  assert.equal(sites.kind, 'stats');
  assert.equal(sites.focus, 'sites');
  assert.equal(detectRealtimeIntent('有多少个标签').focus, 'tags');
  assert.equal(detectRealtimeIntent('收录了多少个分类').focus, 'categories');
  assert.equal(detectRealtimeIntent('有多少次访问').focus, 'hits');
  assert.equal(detectRealtimeIntent('今天新增了多少书签').focus, 'new');
});

test('推荐类提问不应被误判成统计问题', () => {
  assert.equal(detectRealtimeIntent('推荐几个 AI 网站').kind, '');
  assert.equal(detectRealtimeIntent('帮我找几个设计工具').kind, '');
  assert.equal(detectRealtimeIntent('有没有图床').kind, '');
  assert.equal(detectRealtimeIntent('周一有哪些书签').kind, '');
});

test('时间类回答不经过大模型且事实正确', () => {
  assert.equal(buildRealtimeAnswer({ kind: 'weekday' }, {}, { now: NOW }), '今天是 2026年10月30日 星期五（北京时间）。');
  assert.match(buildRealtimeAnswer({ kind: 'clock' }, {}, { now: NOW }), /15:30/);
  assert.match(buildRealtimeAnswer({ kind: 'date' }, {}, { now: NOW }), /2026年10月30日/);
  assert.match(buildRealtimeAnswer({ kind: 'year' }, {}, { now: NOW }), /2026 年/);
});

test('统计类回答按焦点给出对应数字', () => {
  const stats = {
    totalSites: 120,
    totalCategories: 9,
    totalTags: 48,
    totalHits: 3400,
    visitedSites: 90,
    todayNew: 2,
    weekNew: 11,
    monthNew: 37,
    pendingSites: 3,
    topCategory: { name: '开发工具', count: 30 },
    topTag: { name: 'AI', count: 25 },
    latestSites: [{ name: 'Example', catelog: '工具' }],
    scope: 'public',
  };
  assert.match(buildRealtimeAnswer({ kind: 'stats', focus: 'tags' }, stats, { now: NOW }), /48 个标签/);
  assert.match(buildRealtimeAnswer({ kind: 'stats', focus: 'categories' }, stats, { now: NOW }), /9 个分类/);
  assert.match(buildRealtimeAnswer({ kind: 'stats', focus: 'hits' }, stats, { now: NOW }), /3400 次/);
  assert.match(buildRealtimeAnswer({ kind: 'stats', focus: 'new' }, stats, { now: NOW }), /今天新增 2 条/);
  assert.match(buildRealtimeAnswer({ kind: 'stats', focus: 'sites' }, stats, { now: NOW }), /120 条书签/);
  // 待审数量对非管理员不泄露
  assert.match(buildRealtimeAnswer({ kind: 'stats', focus: 'pending' }, stats, { now: NOW, adminAuthed: false }), /只有管理员可见/);
  assert.match(buildRealtimeAnswer({ kind: 'stats', focus: 'pending' }, stats, { now: NOW, adminAuthed: true }), /3 条书签提交/);
});

test('检索计划把站内标签与分类识别为精确条件', () => {
  const vocabulary = {
    categories: ['开发工具', '设计素材', '影音娱乐'],
    tags: [{ name: 'AI', count: 30 }, { name: '图床', count: 8 }, { name: '网盘', count: 5 }],
  };
  const plan = buildSearchPlan('帮我找 AI 相关的书签', vocabulary);
  assert.deepEqual(plan.tags, ['AI']);
  assert.ok(plan.phrase.length > 0);

  const plan2 = buildSearchPlan('设计素材分类里有什么', vocabulary);
  assert.deepEqual(plan2.categories, ['设计素材']);

  const plan3 = buildSearchPlan('图床和网盘推荐', vocabulary);
  assert.deepEqual(plan3.tags.sort(), ['图床', '网盘']);
});

test('联网决策：未启用/用户关闭时不联网，明确要求时联网', () => {
  const enabled = { enabled: 'true', autoMode: 'false' };
  assert.equal(decideWebSearch('今天有什么新闻', { siteCount: 0, settings: { enabled: 'false' } }).use, false);
  assert.equal(decideWebSearch('今天有什么新闻', { siteCount: 0, settings: enabled, preference: false }).use, false);
  assert.equal(decideWebSearch('联网查一下 X', { siteCount: 3, settings: enabled }).use, true);
  // auto 模式只在站内无结果时兜底
  const auto = { enabled: 'true', autoMode: 'true' };
  assert.equal(decideWebSearch('某某工具是什么', { siteCount: 0, settings: auto }).use, true);
  assert.equal(decideWebSearch('某某工具是什么', { siteCount: 4, settings: auto }).use, false);
  // 前端开关显式开启
  assert.equal(decideWebSearch('随便问问', { siteCount: 9, settings: enabled, preference: true }).use, true);
});

test('端到端：时间类问题不碰数据库直接回答', async () => {
  const result = await chatWithAiAssistant({}, {}, { message: '今天星期几' });
  assert.equal(result.code, 200);
  assert.equal(result.data.mode, 'local_realtime');
  assert.equal(result.data.usedWebSearch, false);
  assert.match(result.data.answer, /星期/);
});

test('端到端：统计类问题走本地查库并给出准确数字', async () => {
  const result = await chatWithAiAssistant(stubEnv(), {}, { message: '本站一共有多少书签', adminAuthed: true });
  assert.equal(result.data.mode, 'local_stats');
  assert.match(result.data.answer, /42 条书签/);
  assert.match(result.data.answer, /6 个分类/);
});

test('端到端：统计类问题区分焦点（标签数）', async () => {
  const result = await chatWithAiAssistant(stubEnv(), {}, { message: '一共有多少个标签', adminAuthed: true });
  assert.equal(result.data.mode, 'local_stats');
  assert.match(result.data.answer, /21 个标签/);
});
