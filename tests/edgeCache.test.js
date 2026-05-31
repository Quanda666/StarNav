import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHomeCacheKey } from '../src/lib/edgeCache.js';

function req(url, { method = 'GET', cookie = '' } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  return new Request(url, { method, headers });
}

test('匿名 GET 首页返回稳定缓存键', () => {
  const key = buildHomeCacheKey(req('https://x/'));
  assert.ok(key, '匿名首页应可缓存');
  assert.equal(new URL(key.url).pathname, '/home');
});

test('catalog/sort/tag 纳入缓存键且参数顺序无关', () => {
  const a = buildHomeCacheKey(req('https://x/?catalog=tools&sort=hot'));
  const b = buildHomeCacheKey(req('https://x/?sort=hot&catalog=tools'));
  assert.equal(a.url, b.url, '同维度不同顺序应得到同一键');
  const c = buildHomeCacheKey(req('https://x/?catalog=other'));
  assert.notEqual(a.url, c.url, '不同分类应得到不同键');
});

test('?lang 与 nav_lang cookie 都会改变缓存键', () => {
  const q = buildHomeCacheKey(req('https://x/?lang=en'));
  const ck = buildHomeCacheKey(req('https://x/', { cookie: 'nav_lang=en' }));
  const def = buildHomeCacheKey(req('https://x/'));
  assert.equal(new URL(q.url).searchParams.get('lang'), 'en');
  assert.equal(new URL(ck.url).searchParams.get('lang'), 'en');
  assert.notEqual(q.url, def.url, '指定语言应区别于默认');
});

test('带管理员会话 / 私人解锁 cookie 一律不缓存', () => {
  assert.equal(buildHomeCacheKey(req('https://x/', { cookie: 'nav_admin_session=abc' })), null);
  assert.equal(buildHomeCacheKey(req('https://x/', { cookie: 'nav_private_bookmarks_access=tok' })), null);
  // 与无关 cookie 混杂时也要识别出鉴权 cookie
  assert.equal(buildHomeCacheKey(req('https://x/', { cookie: 'foo=1; nav_admin_session=abc; bar=2' })), null);
});

test('非 GET / 非首页 / __refresh 一律不缓存', () => {
  assert.equal(buildHomeCacheKey(req('https://x/', { method: 'POST' })), null);
  assert.equal(buildHomeCacheKey(req('https://x/admin')), null);
  assert.equal(buildHomeCacheKey(req('https://x/?__refresh=123')), null);
});

test('nav_lang cookie 不被当作鉴权 cookie（仍可缓存）', () => {
  const key = buildHomeCacheKey(req('https://x/', { cookie: 'nav_lang=zh-CN' }));
  assert.ok(key, '仅含语言 cookie 的请求仍应可缓存');
});
