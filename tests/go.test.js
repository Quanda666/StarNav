import test from 'node:test';
import assert from 'node:assert/strict';

import { handleGoRequest } from '../src/handlers/go.js';

function createMemoryKv() {
  const store = new Map();

  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
    async delete(key) {
      store.delete(key);
    },
  };
}

function createMockEnv(site) {
  return {
    NAV_AUTH: createMemoryKv(),
    NAV_DB: {
      prepare(sql) {
        return {
          bind() {
            return {
              async first() {
                if (/FROM sites s/i.test(sql)) return site;
                return null;
              },
              async all() {
                return { results: [] };
              },
              async run() {
                return { success: true };
              },
            };
          },
        };
      },
    },
  };
}

test('GET /go/:id returns 404 for inaccessible private bookmarks without leaking category', async () => {
  const response = await handleGoRequest(new Request('https://example.com/go/42'), createMockEnv({
    id: 42,
    name: 'Secret',
    url: 'https://secret.example.com',
    catelog: '私人书签',
    visibility: 'private',
  }), {});
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.message, 'Site not found');
  assert.equal(response.headers.get('Location'), null);
  assert.ok(!JSON.stringify(body).includes('私人书签'));
});

test('GET /go/:id still redirects accessible public bookmarks via jump page', async () => {
  const waitUntilTasks = [];
  const response = await handleGoRequest(new Request('https://example.com/go/7?from_catalog=工具'), createMockEnv({
    id: 7,
    name: 'Example',
    url: 'https://example.com/path',
    catelog: '工具',
    visibility: 'public',
  }), {
    waitUntil(task) {
      waitUntilTasks.push(task);
    },
  });
  const html = await response.text();
  await Promise.all(waitUntilTasks);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('Content-Type') || '', /text\/html/);
  assert.match(html, /https:\/\/example\.com\/path/);
  assert.match(html, /catalog=%E5%B7%A5%E5%85%B7/);
});
