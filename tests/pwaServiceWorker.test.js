import test from 'node:test';
import assert from 'node:assert/strict';

import { handlePwaRequest } from '../src/handlers/pwa.js';

// 极简 D1 桩：系统设置读不到就走默认值
function stubEnv() {
  return {
    NAV_DB: {
      prepare() {
        return {
          bind() { return this; },
          async all() { return { results: [] }; },
          async first() { return null; },
          async run() { return { meta: {} }; },
        };
      },
    },
    NAV_AUTH: { get: async () => null, put: async () => {} },
  };
}

async function swScript() {
  const response = await handlePwaRequest(new Request('https://nav.example.com/sw.js'), stubEnv());
  return response.text();
}

test('Service Worker 脚本可正常生成', async () => {
  const body = await swScript();
  assert.match(body, /addEventListener\('fetch'/);
  assert.match(body, /const CACHE_NAME=/);
});

test('回归：/static/* 必须是网络优先，且位于通用缓存优先分支之前', async () => {
  const body = await swScript();

  const staticIndex = body.indexOf("startsWith('/static/')");
  assert.ok(staticIndex > -1, 'SW 应包含 /static/ 专用分支');

  // 通用缓存优先分支（isShell||isSameOrigin）必须排在其后，否则静态资源又会被缓存钉住
  const cacheFirstIndex = body.indexOf('const isShell=SHELL_URLS.includes');
  assert.ok(cacheFirstIndex > -1, '应仍保留通用分支');
  assert.ok(
    staticIndex < cacheFirstIndex,
    '/static 分支必须早于通用缓存优先分支，否则发布新版本后浏览器会一直用旧脚本',
  );

  // 静态资源分支内部应是「先 fetch，失败再回落缓存」
  const branch = body.slice(staticIndex, cacheFirstIndex);
  const fetchIndex = branch.indexOf('fetch(request)');
  const cacheIndex = branch.indexOf('caches.match(request)');
  assert.ok(fetchIndex > -1 && cacheIndex > -1, '静态分支应同时包含网络与缓存路径');
  assert.ok(fetchIndex < cacheIndex, '静态资源应为网络优先（先 fetch 再回落缓存）');
});

test('Service Worker 脚本确定（否则每次导航都会重新安装）', async () => {
  const [first, second] = await Promise.all([swScript(), swScript()]);
  assert.equal(first, second, '同一配置下 SW 脚本必须逐字节一致');
  assert.match(first, /^const CACHE_NAME='starnav-pwa-[a-z0-9]+';$/m);
  assert.match(first, /^const RUNTIME_CACHE='starnav-runtime-[a-z0-9]+';$/m);
});
