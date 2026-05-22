import test from 'node:test';
import assert from 'node:assert/strict';

import { createAdminSession, createApiToken, revokeApiToken, validateApiToken } from '../src/lib/auth.js';
import { errorResponse } from '../src/lib/utils.js';
import { handleApiRequest } from '../src/handlers/api.js';
import { createWebhook, dispatchWebhooks, listWebhooks } from '../src/services/webhookService.js';

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

function createHealthMockEnv() {
  const counts = {
    sites: 12,
    categories: 4,
    tags: 9,
    pending_sites: 2,
    operation_logs: 5,
    badLinks: 1,
    uncheckedLinks: 3,
  };

  return {
    NAV_AUTH: createMemoryKv(),
    NAV_DB: {
      prepare(sql) {
        return {
          async first() {
            if (/COUNT\(\*\)\s+AS\s+total/i.test(sql)) {
              if (/FROM\s+pending_sites/i.test(sql)) return { total: counts.pending_sites };
              if (/FROM\s+operation_logs/i.test(sql)) return { total: counts.operation_logs };
              if (/FROM\s+categories/i.test(sql)) return { total: counts.categories };
              if (/FROM\s+tags/i.test(sql)) return { total: counts.tags };
              if (/last_checked_at IS NOT NULL/i.test(sql)) return { total: counts.badLinks };
              if (/last_checked_at IS NULL/i.test(sql)) return { total: counts.uncheckedLinks };
              if (/FROM\s+sites/i.test(sql)) return { total: counts.sites };
              return { total: 0 };
            }

            if (/FROM\s+operation_logs/i.test(sql)) return { value: '2026-05-22 07:00:00' };
            if (/FROM\s+sites/i.test(sql)) return { value: '2026-05-22 06:30:00' };
            return null;
          },
        };
      },
    },
  };
}

async function readJson(response) {
  return response.json();
}

function installFetchMock(handler) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = originalFetch;
  };
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

test('validateApiToken accepts write scope and updates lastUsedAt', async () => {
  const env = createMockEnv();
  const { token, data } = await createApiToken(env, {
    name: 'Write client',
    scopes: ['write'],
  });

  const result = await validateApiToken(new Request('https://example.com/api/sites', {
    headers: { Authorization: `Bearer ${token}` },
  }), env, 'write');
  const tokens = await env.NAV_AUTH.list({ prefix: 'api_token:' });
  const raw = await env.NAV_AUTH.get(tokens.keys[0].name);
  const stored = JSON.parse(raw);

  assert.equal(result.authenticated, true);
  assert.equal(result.token.id, data.id);
  assert.deepEqual(result.token.scopes, ['write']);
  assert.ok(result.token.lastUsedAt);
  assert.equal(stored.lastUsedAt, result.token.lastUsedAt);
});

test('revoked bearer token cannot be used', async () => {
  const env = createMockEnv();
  const { token, data } = await createApiToken(env, {
    name: 'Revoked client',
    scopes: ['write'],
  });
  await revokeApiToken(env, data.id);

  const result = await validateApiToken(new Request('https://example.com/api/sites', {
    headers: { Authorization: `Bearer ${token}` },
  }), env, 'write');

  assert.equal(result.authenticated, false);
  assert.equal(result.forbidden, undefined);
});

test('GET /api/openapi.json exposes stable public API structure', async () => {
  const env = createMockEnv();

  const response = await handleApiRequest(new Request('https://example.com/api/openapi.json'), env, {});
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.openapi, '3.0.3');
  assert.equal(body.info.title, 'StarNav Public API');
  assert.ok(body.components.securitySchemes.bearerAuth);
  assert.ok(body.paths['/api/sites'].get);
  assert.deepEqual(body.paths['/api/sites'].get.security, []);
  assert.deepEqual(body.paths['/api/sites'].post.security, [{ bearerAuth: [] }]);
  assert.ok(body.paths['/api/search'].get.parameters.some((item) => item.name === 'q'));
});

test('dispatchWebhooks matches wildcard, group and exact events with HMAC signature', async () => {
  const env = createMockEnv();
  const calls = [];
  const restoreFetch = installFetchMock(async (url, options = {}) => {
    calls.push({
      url,
      headers: Object.fromEntries(new Headers(options.headers).entries()),
      body: JSON.parse(options.body),
    });
    return new Response('ok', { status: 200, statusText: 'OK' });
  });

  try {
    await createWebhook(env, {
      name: 'All events',
      url: 'https://hooks.example.com/all',
      events: ['*'],
      secret: 'all-secret',
    });
    await createWebhook(env, {
      name: 'Site group',
      url: 'https://hooks.example.com/site',
      events: ['site.*'],
      secret: 'site-secret',
    });
    await createWebhook(env, {
      name: 'Exact create',
      url: 'https://hooks.example.com/create',
      events: ['site.create'],
      secret: 'create-secret',
    });
    await createWebhook(env, {
      name: 'Other event',
      url: 'https://hooks.example.com/other',
      events: ['tag.create'],
      secret: 'other-secret',
    });

    const result = await dispatchWebhooks(env, {
      action: 'site.create',
      target: 'site',
      targetId: 123,
      summary: 'Created site',
    });
    const webhooks = await listWebhooks(env);

    assert.deepEqual(result, { sent: 3, failed: 0 });
    assert.equal(calls.length, 3);
    assert.deepEqual(calls.map((item) => item.url).sort(), [
      'https://hooks.example.com/all',
      'https://hooks.example.com/create',
      'https://hooks.example.com/site',
    ]);
    assert.ok(calls.every((item) => item.headers['x-starnav-signature']?.startsWith('sha256=')));
    assert.ok(calls.every((item) => /^[a-f0-9]{64}$/.test(item.headers['x-starnav-signature'].slice('sha256='.length))));
    assert.ok(calls.every((item) => item.body.event === 'site.create' && item.body.targetId === 123));
    assert.ok(webhooks.filter((item) => item.lastStatus === 200 && !item.lastError).length >= 3);
  } finally {
    restoreFetch();
  }
});

test('dispatchWebhooks records last error when delivery fails', async () => {
  const env = createMockEnv();
  const restoreFetch = installFetchMock(async () => new Response('fail', {
    status: 500,
    statusText: 'Server Error',
  }));

  try {
    await createWebhook(env, {
      name: 'Failing webhook',
      url: 'https://hooks.example.com/fail',
      events: ['site.delete'],
    });

    const result = await dispatchWebhooks(env, {
      action: 'site.delete',
      target: 'site',
      targetId: 321,
    });
    const [webhook] = await listWebhooks(env);

    assert.deepEqual(result, { sent: 0, failed: 1 });
    assert.equal(webhook.lastStatus, 500);
    assert.equal(webhook.lastError, 'Server Error');
    assert.ok(webhook.lastTriggeredAt);
  } finally {
    restoreFetch();
  }
});

test('GET /api/system/health without admin cookie returns standardized 401', async () => {
  const env = createHealthMockEnv();

  const response = await handleApiRequest(new Request('https://example.com/api/system/health'), env, {});
  const body = await readJson(response);

  assert.equal(response.status, 401);
  assert.equal(body.code, 401);
  assert.equal(body.error.code, 'UNAUTHORIZED');
  assert.equal(body.message, 'Admin authentication is required');
});

test('GET /api/system/health with admin cookie returns health summary', async () => {
  const env = createHealthMockEnv();
  const session = await createAdminSession(env);

  const response = await handleApiRequest(new Request('https://example.com/api/system/health', {
    headers: {
      Cookie: `nav_admin_session=${session}`,
    },
  }), env, {});
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.code, 200);
  assert.ok(['ok', 'warn', 'error'].includes(body.data.status));
  assert.equal(body.data.metrics.bindings.d1, true);
  assert.equal(body.data.metrics.bindings.kv, true);
  assert.equal(body.data.metrics.sites.total, 12);
  assert.equal(body.data.metrics.sites.badLinks, 1);
  assert.equal(body.data.metrics.submissions.pending, 2);
  assert.ok(Array.isArray(body.data.checks));
  assert.ok(body.data.checks.some((item) => item.id === 'binding.d1' && item.status === 'ok'));
  assert.ok(body.data.checks.some((item) => item.id === 'db.sites' && item.details?.badLinks === 1));
  assert.ok(Array.isArray(body.data.suggestions));
  assert.ok(body.data.summary.total >= 1);
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