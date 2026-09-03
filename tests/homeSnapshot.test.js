import test from 'node:test';
import assert from 'node:assert/strict';

import { getHomeSnapshot, invalidateHomeSnapshot } from '../src/services/homeSnapshotService.js';

function createMemoryKv() {
  const store = new Map();
  const stats = { get: 0, put: 0, delete: 0 };

  return {
    stats,
    async get(key, options) {
      stats.get += 1;
      if (!store.has(key)) return null;
      const raw = store.get(key);
      return options?.type === 'json' ? JSON.parse(raw) : raw;
    },
    async put(key, value) {
      stats.put += 1;
      store.set(key, String(value));
    },
    async delete(key) {
      stats.delete += 1;
      store.delete(key);
    },
  };
}

// 统计 D1 查询次数的最小 mock：覆盖首页所需的 settings / categories / sites / site_tags 四类查询。
function createCountingDb(counter) {
  const build = (sql) => ({
    bind() {
      return build(sql);
    },
    async first() {
      counter.queries += 1;
      return null;
    },
    async all() {
      counter.queries += 1;
      if (/FROM settings/i.test(sql)) {
        return { results: [{ key: 'system.siteName', value: '测试站' }] };
      }
      if (/FROM categories/i.test(sql)) {
        return { results: [{ id: 1, name: '常用', parent_id: null, sort_order: 1 }] };
      }
      if (/FROM sites s/i.test(sql) || /FROM sites/i.test(sql)) {
        return { results: [{ id: 7, name: '示例', url: 'https://example.com', catelog: '常用' }] };
      }
      return { results: [] };
    },
    async run() {
      counter.queries += 1;
      return { success: true };
    },
  });

  return { prepare: (sql) => build(sql) };
}

test('首次读取回源 D1 并写入快照，后续读取只命中 KV', async () => {
  const counter = { queries: 0 };
  const env = { NAV_AUTH: createMemoryKv(), NAV_DB: createCountingDb(counter) };

  const first = await getHomeSnapshot(env);
  const dbQueriesAfterFirst = counter.queries;
  assert.ok(dbQueriesAfterFirst > 0, '首次读取应回源 D1');
  assert.ok(Array.isArray(first.sites));
  assert.ok(Array.isArray(first.categoryTree));
  assert.ok(first.systemSettings && typeof first.systemSettings === 'object');
  assert.equal(env.NAV_AUTH.stats.put, 1, '首次读取后应写入一份快照');

  const second = await getHomeSnapshot(env);
  assert.equal(counter.queries, dbQueriesAfterFirst, '命中快照时不应再产生任何 D1 查询');
  assert.deepEqual(second.sites, first.sites);
  assert.deepEqual(second.categoryTree, first.categoryTree);
  assert.deepEqual(second.systemSettings, first.systemSettings);
});

test('失效快照后下一次读取重新回源 D1', async () => {
  const counter = { queries: 0 };
  const env = { NAV_AUTH: createMemoryKv(), NAV_DB: createCountingDb(counter) };

  await getHomeSnapshot(env);
  const baseline = counter.queries;

  await invalidateHomeSnapshot(env);
  assert.equal(env.NAV_AUTH.stats.delete, 1);

  await getHomeSnapshot(env);
  assert.ok(counter.queries > baseline, '快照失效后应重新回源 D1');
});

test('未绑定 KV 时退化为直读 D1，不抛错', async () => {
  const counter = { queries: 0 };
  const env = { NAV_DB: createCountingDb(counter) };

  const data = await getHomeSnapshot(env);
  assert.ok(counter.queries > 0);
  assert.ok(Array.isArray(data.sites));

  await invalidateHomeSnapshot(env);
});

test('KV 读取抛错时退化为直读 D1', async () => {
  const counter = { queries: 0 };
  const env = {
    NAV_AUTH: {
      async get() {
        throw new Error('kv unavailable');
      },
      async put() {},
      async delete() {},
    },
    NAV_DB: createCountingDb(counter),
  };

  const data = await getHomeSnapshot(env);
  assert.ok(counter.queries > 0, 'KV 不可用时应回源 D1');
  assert.ok(Array.isArray(data.categoryTree));
});
