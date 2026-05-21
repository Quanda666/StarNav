import test from 'node:test';
import assert from 'node:assert/strict';

import { createAdminSession, createApiToken } from '../src/lib/auth.js';
import { errorResponse } from '../src/lib/utils.js';
import { handleApiRequest } from '../src/handlers/api.js';

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
    async list(options = {}) {
      const prefix = options.prefix || '';
      return {
        keys: Array.from(store.keys())
          .filter((name) => name.startsWith(prefix))
          .sort()
          .map((name) => ({ name })),
      };
    },
  };
}

function createMockEnv() {
  return {
    NAV_AUTH: createMemoryKv(),
    NAV_DB: {
      prepare() {
        throw new Error('NAV_DB should not be touched by auth/error tests');
      },
    },
  };
}

async function readJson(response) {
  return response.json();
}

test('errorResponse keeps legacy fields and adds normalized error object', async () => {
  const response = errorResponse('Missing URL', 400, { field: 'url' });
  const body = await readJson(response);

  assert.equal(response.status, 400);
  assert.equal(body.code, 400);
  assert.equal(body.message, 'Missing URL');
  assert.equal(body.error.code, 'BAD_REQUEST');
  assert.equal(body.error.message, 'Missing URL');
  assert.deepEqual(body.details, { field: 'url' });
  assert.deepEqual(body.error.details, { field: 'url' });
});

test('POST /api/sites without admin cookie or bearer token returns standardized 401', async () => {
  const env = createMockEnv();
  const response = await handleApiRequest(new Request('https://example.com/api/sites', {
    method: 'POST',
    body: JSON.stringify({ name: 'Example', url: 'https://example.com' }),
    headers: { 'Content-Type': 'application/json' },
  }), env, {});
  const body = await readJson(response);

  assert.equal(response.status, 401);
  assert.equal(body.code, 401);
  assert.equal(body.error.code, 'UNAUTHORIZED');
  assert.equal(body.message, 'Admin cookie or Bearer token is required');
  assert.equal(body.details.allowApiToken, true);
  assert.equal(body.details.requiredScope, 'write');
});

test('POST /api/sites with read-only bearer token returns standardized 403', async () => {
  const env = createMockEnv();
  const { token } = await createApiToken(env, {
    name: 'Read only client',
    scopes: ['read'],
  });

  const response = await handleApiRequest(new Request('https://example.com/api/sites', {
    method: 'POST',
    body: JSON.stringify({ name: 'Example', url: 'https://example.com' }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }), env, {});
  const body = await readJson(response);

  assert.equal(response.status, 403);
  assert.equal(body.code, 403);
  assert.equal(body.error.code, 'FORBIDDEN');
  assert.equal(body.message, 'API token scope is insufficient');
  assert.equal(body.details.requiredScope, 'write');
  assert.deepEqual(body.details.tokenScopes, ['read']);
});

test('POST /api/webhooks rejects non-HTTPS URL with standardized 400', async () => {
  const env = createMockEnv();
  const session = await createAdminSession(env);

  const response = await handleApiRequest(new Request('https://example.com/api/webhooks', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Invalid webhook',
      url: 'http://example.com/webhook',
      events: ['site.*'],
    }),
    headers: {
      'Content-Type': 'application/json',
      Cookie: `nav_admin_session=${session}`,
    },
  }), env, {});
  const body = await readJson(response);

  assert.equal(response.status, 400);
  assert.equal(body.code, 400);
  assert.equal(body.error.code, 'BAD_REQUEST');
  assert.equal(body.message, 'Webhook URL must be a valid HTTPS URL');
});