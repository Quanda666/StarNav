import { cleanText } from '../lib/utils.js';

const WEBHOOKS_KEY = 'webhooks';

function normalizeEvents(events = []) {
  const values = Array.isArray(events) ? events : String(events || '').split(/[,\s]+/);
  const normalized = values
    .map((event) => cleanText(event).trim())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function sanitizeWebhook(input = {}) {
  return {
    id: cleanText(input.id).slice(0, 80),
    name: cleanText(input.name).slice(0, 80) || '未命名 WebHook',
    url: String(input.url || '').trim(),
    events: normalizeEvents(input.events || ['*']),
    enabled: input.enabled !== false,
    secret: String(input.secret || '').trim(),
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastTriggeredAt: input.lastTriggeredAt || null,
    lastStatus: input.lastStatus || null,
    lastError: input.lastError || null,
  };
}

function publicWebhook(webhook = {}) {
  const { secret, ...rest } = webhook;
  return {
    ...rest,
    hasSecret: Boolean(secret),
  };
}

function isValidWebhookUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function loadWebhooks(env) {
  const raw = await env.NAV_AUTH.get(WEBHOOKS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(sanitizeWebhook).filter((item) => item.id && item.url) : [];
  } catch {
    return [];
  }
}

async function saveWebhooks(env, webhooks) {
  await env.NAV_AUTH.put(WEBHOOKS_KEY, JSON.stringify(webhooks.map(sanitizeWebhook)));
}

export async function listWebhooks(env) {
  const webhooks = await loadWebhooks(env);
  return webhooks.map(publicWebhook);
}

export async function createWebhook(env, input = {}) {
  const webhook = sanitizeWebhook({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  if (!isValidWebhookUrl(webhook.url)) {
    throw new Error('Webhook URL must be a valid HTTPS URL');
  }
  const webhooks = await loadWebhooks(env);
  webhooks.push(webhook);
  await saveWebhooks(env, webhooks);
  return publicWebhook(webhook);
}

export async function updateWebhook(env, id, input = {}) {
  const webhooks = await loadWebhooks(env);
  const index = webhooks.findIndex((item) => item.id === String(id));
  if (index === -1) throw new Error('Webhook not found');
  const current = webhooks[index];
  const next = sanitizeWebhook({
    ...current,
    ...input,
    id: current.id,
    secret: input.secret === undefined ? current.secret : input.secret,
    createdAt: current.createdAt,
    lastTriggeredAt: current.lastTriggeredAt,
    lastStatus: current.lastStatus,
    lastError: current.lastError,
  });
  if (!isValidWebhookUrl(next.url)) {
    throw new Error('Webhook URL must be a valid HTTPS URL');
  }
  webhooks[index] = next;
  await saveWebhooks(env, webhooks);
  return publicWebhook(next);
}

export async function deleteWebhook(env, id) {
  const webhooks = await loadWebhooks(env);
  const next = webhooks.filter((item) => item.id !== String(id));
  if (next.length === webhooks.length) throw new Error('Webhook not found');
  await saveWebhooks(env, next);
  return true;
}

function eventMatches(webhook, action) {
  const events = normalizeEvents(webhook.events || ['*']);
  if (events.includes('*')) return true;
  if (events.includes(action)) return true;
  const group = String(action || '').split('.')[0];
  return events.includes(`${group}.*`);
}

async function signPayload(secret, payloadText) {
  if (!secret) return '';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadText));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function invokeWebhook(webhook, payload) {
  const payloadText = JSON.stringify(payload);
  const signature = await signPayload(webhook.secret, payloadText);
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'StarNav-Webhook/1.0',
  };
  if (signature) headers['X-StarNav-Signature'] = `sha256=${signature}`;
  const response = await fetch(webhook.url, {
    method: 'POST',
    headers,
    body: payloadText,
  });
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
  };
}

async function updateWebhookDeliveryResult(env, id, patch = {}) {
  const webhooks = await loadWebhooks(env);
  const index = webhooks.findIndex((item) => item.id === String(id));
  if (index === -1) return;
  webhooks[index] = sanitizeWebhook({
    ...webhooks[index],
    ...patch,
    updatedAt: webhooks[index].updatedAt,
  });
  await saveWebhooks(env, webhooks);
}

export async function dispatchWebhooks(env, operation = {}) {
  const action = cleanText(operation.action);
  if (!action) return { sent: 0, failed: 0 };
  const webhooks = await loadWebhooks(env);
  const targets = webhooks.filter((webhook) => webhook.enabled && isValidWebhookUrl(webhook.url) && eventMatches(webhook, action));
  let sent = 0;
  let failed = 0;

  const payload = {
    event: action,
    action,
    target: operation.target || null,
    targetId: operation.targetId || null,
    summary: operation.summary || null,
    detail: operation.detail || null,
    ip: operation.ip || null,
    timestamp: new Date().toISOString(),
  };

  for (const webhook of targets) {
    try {
      const result = await invokeWebhook(webhook, payload);
      if (result.ok) {
        sent += 1;
        await updateWebhookDeliveryResult(env, webhook.id, {
          lastTriggeredAt: payload.timestamp,
          lastStatus: result.status,
          lastError: null,
        });
      } else {
        failed += 1;
        await updateWebhookDeliveryResult(env, webhook.id, {
          lastTriggeredAt: payload.timestamp,
          lastStatus: result.status,
          lastError: result.statusText || `HTTP ${result.status}`,
        });
      }
    } catch (error) {
      failed += 1;
      await updateWebhookDeliveryResult(env, webhook.id, {
        lastTriggeredAt: payload.timestamp,
        lastStatus: null,
        lastError: error?.message || String(error),
      });
    }
  }

  return { sent, failed };
}

export async function testWebhook(env, id) {
  const webhooks = await loadWebhooks(env);
  const webhook = webhooks.find((item) => item.id === String(id));
  if (!webhook) throw new Error('Webhook not found');
  if (!isValidWebhookUrl(webhook.url)) throw new Error('Webhook URL must be a valid HTTPS URL');
  const payload = {
    event: 'webhook.test',
    action: 'webhook.test',
    target: 'webhook',
    targetId: webhook.id,
    summary: 'StarNav WebHook test event',
    detail: null,
    ip: null,
    timestamp: new Date().toISOString(),
  };
  const result = await invokeWebhook(webhook, payload);
  await updateWebhookDeliveryResult(env, webhook.id, {
    lastTriggeredAt: payload.timestamp,
    lastStatus: result.status,
    lastError: result.ok ? null : result.statusText || `HTTP ${result.status}`,
  });
  return result;
}