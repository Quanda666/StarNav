import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canAccessSite,
  canListSite,
  normalizeDuplicateUrlKey,
  normalizeImportPayload,
  previewImportSites,
  searchSites,
} from '../src/services/siteService.js';

function createMockEnv({ sites = [], tagRows = [], existingCategories = [], existingUrls = [] } = {}) {
  return {
    NAV_DB: {
      prepare(sql) {
        return {
          bind(...binds) {
            return createStatement(sql, binds);
          },
          all() {
            return createStatement(sql, []).all();
          },
          first() {
            return createStatement(sql, []).first();
          },
          run() {
            return createStatement(sql, []).run();
          },
        };
      },
    },
  };

  function createStatement(sql, binds) {
    return {
      async all() {
        if (sql.includes('FROM site_tags st') && sql.includes('JOIN tags t')) {
          return { results: tagRows };
        }

        if (sql.includes('SELECT name FROM categories')) {
          return { results: existingCategories.map((name) => ({ name })) };
        }

        if (sql.includes('SELECT url FROM sites')) {
          return { results: existingUrls.map((url) => ({ url })) };
        }

        if (sql.includes('FROM sites s')) {
          return { results: sites };
        }

        return { results: [] };
      },
      async first() {
        return null;
      },
      async run() {
        return { success: true, meta: { changes: 1 } };
      },
      binds,
    };
  }
}

test('normalizeDuplicateUrlKey treats protocol, www and trailing slash as equivalent', () => {
  assert.equal(normalizeDuplicateUrlKey('https://www.example.com/path/'), 'example.com/path');
  assert.equal(normalizeDuplicateUrlKey('http://example.com/path'), 'example.com/path');
  assert.equal(normalizeDuplicateUrlKey('example.com/path/'), 'example.com/path');
  assert.equal(normalizeDuplicateUrlKey('https://example.com/path/?q=1'), 'example.com/path?q=1');
});

test('visibility helpers enforce public, private, unlisted and admin-only rules', () => {
  const publicSite = { visibility: 'public', catelog: '工具' };
  const privateSite = { visibility: 'private', catelog: '私人' };
  const unlistedSite = { visibility: 'unlisted', catelog: '工具' };
  const adminOnlySite = { visibility: 'admin_only', catelog: '工具' };

  assert.equal(canAccessSite(publicSite), true);
  assert.equal(canListSite(publicSite), true);

  assert.equal(canAccessSite(privateSite), false);
  assert.equal(canListSite(privateSite), false);
  assert.equal(canAccessSite(privateSite, { privateUnlocked: true }), true);
  assert.equal(canListSite(privateSite, { privateUnlocked: true }), true);

  assert.equal(canAccessSite(unlistedSite), true);
  assert.equal(canListSite(unlistedSite), false);

  assert.equal(canAccessSite(adminOnlySite), false);
  assert.equal(canListSite(adminOnlySite), false);
  assert.equal(canAccessSite(adminOnlySite, { adminAuthed: true }), true);
  assert.equal(canListSite(adminOnlySite, { adminAuthed: true }), true);
});

test('normalizeImportPayload accepts legacy array and structured export formats', () => {
  const legacy = [{ name: 'A', url: 'https://a.test', catelog: '工具' }];
  assert.deepEqual(normalizeImportPayload(legacy), { sites: legacy, categories: [] });

  const structured = {
    sites: legacy,
    categories: [{ name: '工具' }],
  };
  assert.deepEqual(normalizeImportPayload(structured), structured);

  const dataWrapper = {
    data: legacy,
    categories: [{ name: '工具' }],
  };
  assert.deepEqual(normalizeImportPayload(dataWrapper), {
    sites: legacy,
    categories: dataWrapper.categories,
  });

  assert.throws(() => normalizeImportPayload({ invalid: true }), /Invalid JSON data/);
});

test('previewImportSites reports invalid rows, duplicate rows and missing categories', async () => {
  const env = createMockEnv({
    existingCategories: ['工具'],
    existingUrls: ['https://already.example.com'],
  });

  const preview = await previewImportSites(env, [
    { name: '有效站点', url: 'https://new.example.com', catelog: '工具' },
    { name: '缺少分类', url: 'https://invalid.example.com' },
    { name: '已有站点', url: 'http://www.already.example.com/', catelog: '工具' },
    { name: '文件内重复 1', url: 'https://dup.example.com/path/', catelog: '新分类' },
    { name: '文件内重复 2', url: 'http://www.dup.example.com/path', catelog: '新分类' },
  ]);

  assert.equal(preview.totalSites, 5);
  assert.equal(preview.validSites, 2);
  assert.equal(preview.invalidSites, 1);
  assert.equal(preview.duplicateExisting, 1);
  assert.equal(preview.duplicateInFile, 1);
  assert.deepEqual(preview.missingCategories, ['新分类']);
  assert.deepEqual(preview.willCreateCategories, ['新分类']);
});

test('searchSites gives exact name matches higher rank and exposes match reasons', async () => {
  const now = new Date().toISOString();
  const env = createMockEnv({
    sites: [
      {
        id: 1,
        name: '普通图床工具',
        url: 'https://image.example.com',
        desc: '星空图床替代工具',
        catelog: '工具',
        visibility: 'public',
        hits: 10,
        create_time: now,
        update_time: now,
      },
      {
        id: 2,
        name: '星空图床',
        url: 'https://xktc.example.com',
        desc: '图片上传外链',
        catelog: '图床',
        visibility: 'public',
        hits: 0,
        create_time: now,
        update_time: now,
      },
    ],
    tagRows: [
      { site_id: 1, name: '图床' },
      { site_id: 2, name: '图片' },
    ],
  });

  const results = await searchSites(env, { keyword: '星空图床', limit: 5 });

  assert.equal(results.length, 2);
  assert.equal(results[0].name, '星空图床');
  assert.ok(results[0]._score > results[1]._score);
  assert.ok(results[0]._matchedFields.includes('name'));
  assert.ok(results[0]._matchReasons.some((reason) => reason.includes('名称完全匹配')));
});

test('searchSites supports advanced tag filter syntax', async () => {
  const now = new Date().toISOString();
  const env = createMockEnv({
    sites: [
      {
        id: 1,
        name: 'AI 工具箱',
        url: 'https://ai.example.com',
        desc: '人工智能工具',
        catelog: 'AI',
        visibility: 'public',
        create_time: now,
        update_time: now,
      },
      {
        id: 2,
        name: '图床工具',
        url: 'https://img.example.com',
        desc: '图片上传',
        catelog: '工具',
        visibility: 'public',
        create_time: now,
        update_time: now,
      },
    ],
    tagRows: [
      { site_id: 1, name: 'AI' },
      { site_id: 2, name: '图床' },
    ],
  });

  const results = await searchSites(env, { keyword: 'tag:图床', limit: 5 });

  assert.deepEqual(results.map((site) => site.name), ['图床工具']);
});