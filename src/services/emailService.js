// 邮件通知服务：把站点事件（新书签提交、审核结果、健康异常、定期摘要）发到邮箱。
//
// 支持三种发送通道：
//   - resend ：HTTP API（最省事，推荐）
//   - smtp   ：SMTP 直连（465 TLS / 587 STARTTLS / 25 明文），走 cloudflare:sockets
//   - http   ：通用 HTTP 中继（自建服务、Serverless 函数、企业内网网关）
//
// 设计原则：
//   - 通知失败绝不影响主流程（全部 try/catch，调用方用 ctx.waitUntil 异步触发）；
//   - 敏感字段（API Key / SMTP 密码）用 AES-GCM 加密后存 D1；
//   - 每次发送留痕（近 40 条），后台可查，便于自查配置。

import { cleanText } from '../lib/utils.js';
import { decryptSecret, encryptSecret } from '../lib/crypto.js';
import { getSetting, setSetting } from './settingsService.js';
import { renderEmail } from './emailTemplates.js';
import { sendSmtpMail, SmtpError, normalizeMailCredential } from '../lib/smtpClient.js';
import { getBeijingParts } from '../lib/datetime.js';

const EMAIL_PREFIX = 'email.';
const LOG_KEY = 'email_send_log';
const LOG_LIMIT = 40;

export const EMAIL_PROVIDERS = [
  { id: 'resend', label: 'Resend（HTTP API，推荐）', needsKey: true },
  { id: 'smtp', label: 'SMTP 直连（QQ/163/Gmail 等）', needsKey: false },
  { id: 'http', label: '通用 HTTP 中继', needsKey: true },
];

export const DEFAULT_EMAIL_SETTINGS = {
  enabled: 'false',
  provider: 'resend',
  fromName: '星漫旅站',
  fromAddress: '',
  recipients: '',
  replyTo: '',
  apiKey: '',
  smtpHost: '',
  smtpPort: '465',
  smtpSecure: 'tls',
  smtpUser: '',
  smtpPass: '',
  httpEndpoint: '',
  notifySubmission: 'true',
  notifyReview: 'true',
  notifyHealth: 'true',
  notifyDigest: 'false',
  digestHour: '9',
  digestPeriod: 'week',
  lastDigestDate: '',
};

const EMAIL_PATTERN = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/;

function boolString(value) {
  return value === true || String(value) === 'true' ? 'true' : 'false';
}

/**
 * 解析收件人列表（逗号/分号/空白分隔，去重、校验）。
 *
 * @param {string|string[]} value
 * @returns {string[]}
 */
export function parseRecipients(value) {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(/[,;，；\s]+/);
  const seen = new Set();
  const list = [];
  for (const item of raw) {
    const address = cleanText(item);
    if (!address || !EMAIL_PATTERN.test(address)) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(address);
  }
  return list;
}

/**
 * 读取邮件配置。
 *
 * @param {object} env
 * @param {{includeSecret?: boolean}} [options]
 */
export async function getEmailSettings(env, { includeSecret = false } = {}) {
  const settings = {};
  for (const [key, defaultValue] of Object.entries(DEFAULT_EMAIL_SETTINGS)) {
    settings[key] = await getSetting(env, `${EMAIL_PREFIX}${key}`, defaultValue);
  }

  settings.enabled = boolString(settings.enabled);
  for (const key of ['notifySubmission', 'notifyReview', 'notifyHealth', 'notifyDigest']) {
    settings[key] = boolString(settings[key]);
  }
  settings.smtpPort = String(Math.max(1, Math.min(65535, Number(settings.smtpPort) || 465)));
  settings.smtpSecure = ['tls', 'starttls', 'none'].includes(String(settings.smtpSecure))
    ? String(settings.smtpSecure)
    : 'tls';
  settings.digestHour = String(Math.max(0, Math.min(23, Number(settings.digestHour) || 9)));
  settings.digestPeriod = settings.digestPeriod === 'month' ? 'month' : 'week';
  settings.recipientList = parseRecipients(settings.recipients);
  settings.hasApiKey = Boolean(settings.apiKey);
  settings.hasSmtpPass = Boolean(settings.smtpPass);

  if (includeSecret) {
    settings.apiKey = await decryptSecret(env, settings.apiKey);
    settings.smtpPass = await decryptSecret(env, settings.smtpPass);
  } else {
    settings.apiKey = settings.apiKey ? '********' : '';
    settings.smtpPass = settings.smtpPass ? '********' : '';
  }

  return settings;
}

/**
 * 保存邮件配置。密钥字段传空或 `********` 表示保持原值。
 *
 * @param {object} env
 * @param {object} payload
 */
export async function updateEmailSettings(env, payload = {}) {
  const provider = EMAIL_PROVIDERS.some((item) => item.id === cleanText(payload.provider))
    ? cleanText(payload.provider)
    : 'resend';

  await setSetting(env, `${EMAIL_PREFIX}enabled`, boolString(payload.enabled));
  await setSetting(env, `${EMAIL_PREFIX}provider`, provider);
  await setSetting(env, `${EMAIL_PREFIX}fromName`, cleanText(payload.fromName).slice(0, 60));
  await setSetting(env, `${EMAIL_PREFIX}fromAddress`, parseRecipients(payload.fromAddress)[0] || '');
  await setSetting(env, `${EMAIL_PREFIX}recipients`, parseRecipients(payload.recipients).join(','));
  await setSetting(env, `${EMAIL_PREFIX}replyTo`, parseRecipients(payload.replyTo)[0] || '');
  await setSetting(env, `${EMAIL_PREFIX}smtpHost`, cleanText(payload.smtpHost).slice(0, 200));
  await setSetting(env, `${EMAIL_PREFIX}smtpPort`, String(Math.max(1, Math.min(65535, Number(payload.smtpPort) || 465))));
  await setSetting(env, `${EMAIL_PREFIX}smtpSecure`, ['tls', 'starttls', 'none'].includes(String(payload.smtpSecure)) ? String(payload.smtpSecure) : 'tls');
  await setSetting(env, `${EMAIL_PREFIX}smtpUser`, normalizeMailCredential(cleanText(payload.smtpUser)).slice(0, 200));
  await setSetting(env, `${EMAIL_PREFIX}httpEndpoint`, cleanText(payload.httpEndpoint).slice(0, 300));
  await setSetting(env, `${EMAIL_PREFIX}notifySubmission`, boolString(payload.notifySubmission));
  await setSetting(env, `${EMAIL_PREFIX}notifyReview`, boolString(payload.notifyReview));
  await setSetting(env, `${EMAIL_PREFIX}notifyHealth`, boolString(payload.notifyHealth));
  await setSetting(env, `${EMAIL_PREFIX}notifyDigest`, boolString(payload.notifyDigest));
  await setSetting(env, `${EMAIL_PREFIX}digestHour`, String(Math.max(0, Math.min(23, Number(payload.digestHour) || 9))));
  await setSetting(env, `${EMAIL_PREFIX}digestPeriod`, payload.digestPeriod === 'month' ? 'month' : 'week');

  const apiKey = cleanText(payload.apiKey);
  if (apiKey && apiKey !== '********') await setSetting(env, `${EMAIL_PREFIX}apiKey`, await encryptSecret(env, apiKey));
  else if (payload.clearApiKey === true) await setSetting(env, `${EMAIL_PREFIX}apiKey`, '');

  // 授权码常被复制成「xxxx xxxx xxxx xxxx」，存库前就规范化，避免“明明填对了却 535”
  const smtpPass = normalizeMailCredential(cleanText(payload.smtpPass));
  if (smtpPass && smtpPass !== '********') await setSetting(env, `${EMAIL_PREFIX}smtpPass`, await encryptSecret(env, smtpPass));
  else if (payload.clearSmtpPass === true) await setSetting(env, `${EMAIL_PREFIX}smtpPass`, '');

  return getEmailSettings(env);
}

/**
 * 检查配置是否足以发信（纯函数）。
 *
 * @param {object} settings getEmailSettings 的结果。
 * @returns {{ready:boolean, reason:string}}
 */
export function checkEmailReadiness(settings = {}) {
  if (settings.enabled !== 'true') return { ready: false, reason: '邮件通知未启用' };
  if (!parseRecipients(settings.recipients).length) return { ready: false, reason: '未配置收件人' };
  if (!parseRecipients(settings.fromAddress).length) return { ready: false, reason: '未配置发件人地址' };
  const provider = settings.provider;
  if (provider === 'resend' && !settings.apiKey) return { ready: false, reason: 'Resend 需要 API Key' };
  if (provider === 'http') {
    if (!settings.httpEndpoint) return { ready: false, reason: '未配置 HTTP 中继地址' };
    if (!settings.apiKey) return { ready: false, reason: 'HTTP 中继需要鉴权 Token' };
  }
  if (provider === 'smtp') {
    if (!settings.smtpHost) return { ready: false, reason: '未配置 SMTP 服务器地址' };
    if (settings.smtpUser && !settings.smtpPass) return { ready: false, reason: 'SMTP 已填用户名但缺少密码/授权码' };
  }
  return { ready: true, reason: '' };
}

function formatFrom(settings) {
  const address = parseRecipients(settings.fromAddress)[0] || '';
  const name = cleanText(settings.fromName);
  return { name: name || undefined, address, header: name ? `${name} <${address}>` : address };
}

function stripHtmlToText(html = '') {
  return String(html).replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function providerLabel(provider) {
  return EMAIL_PROVIDERS.find((item) => item.id === provider)?.label || provider;
}

async function logSend(env, entry) {
  try {
    const raw = await env.NAV_AUTH.get(LOG_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = [entry, ...(Array.isArray(list) ? list : [])].slice(0, LOG_LIMIT);
    await env.NAV_AUTH.put(LOG_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn(`[email] 写入发送日志失败：${error?.message || error}`);
  }
}

/**
 * 读取最近的发送记录。
 *
 * @param {object} env
 */
export async function getEmailSendLog(env) {
  try {
    const raw = await env.NAV_AUTH.get(LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function sendViaResend(settings, message) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: formatFrom(settings).header,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text || stripHtmlToText(message.html),
      ...(settings.replyTo ? { reply_to: settings.replyTo } : {}),
    }),
  });
  const text = await response.text().catch(() => '');
  if (!response.ok) throw new Error(`Resend 返回 ${response.status}：${text.slice(0, 200)}`);
  let id = '';
  try {
    id = JSON.parse(text)?.id || '';
  } catch {
    id = '';
  }
  return { id, detail: `HTTP ${response.status}` };
}

async function sendViaHttp(settings, message) {
  const response = await fetch(settings.httpEndpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
      'X-StarNav-Event': message.template || 'email',
    },
    body: JSON.stringify({
      from: formatFrom(settings).header,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text || stripHtmlToText(message.html),
    }),
  });
  const text = await response.text().catch(() => '');
  if (!response.ok) throw new Error(`中继返回 ${response.status}：${text.slice(0, 200)}`);
  return { id: '', detail: `HTTP ${response.status}` };
}

async function sendViaSmtp(settings, message) {
  const result = await sendSmtpMail({
    host: settings.smtpHost,
    port: Number(settings.smtpPort),
    secure: settings.smtpSecure,
    auth: settings.smtpUser ? { user: settings.smtpUser, pass: settings.smtpPass } : null,
    from: formatFrom(settings),
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text || stripHtmlToText(message.html),
    clientName: 'starnav.local',
  });
  return { id: '', detail: result.response };
}

/**
 * 底层发信（不做启用判定，便于「测试发送」复用）。
 *
 * @param {object} env
 * @param {{to?:string[]|string, subject:string, html:string, text?:string, template?:string, settings?:object}} message
 * @returns {Promise<{ok:boolean, provider:string, id:string, error:string, recipients:string[]}>}
 */
export async function sendEmail(env, message = {}) {
  const settings = message.settings || await getEmailSettings(env, { includeSecret: true });
  const recipients = parseRecipients(message.to || settings.recipients);
  const provider = settings.provider;

  if (!recipients.length) {
    return { ok: false, provider, id: '', error: '没有有效收件人', recipients: [] };
  }

  const payload = {
    to: recipients,
    subject: cleanText(message.subject).slice(0, 200) || '（无主题）',
    html: String(message.html || ''),
    text: String(message.text || ''),
    template: message.template || '',
  };

  try {
    let result;
    if (provider === 'smtp') result = await sendViaSmtp(settings, payload);
    else if (provider === 'http') result = await sendViaHttp(settings, payload);
    else result = await sendViaResend(settings, payload);

    await logSend(env, {
      at: new Date().toISOString(),
      to: recipients.join(','),
      subject: payload.subject,
      template: payload.template,
      provider,
      ok: true,
      error: '',
    });
    return { ok: true, provider, id: result.id || '', error: '', recipients };
  } catch (error) {
    const errorText = error instanceof SmtpError
      ? `${error.message}${error.stage ? `（阶段：${error.stage}）` : ''}`
      : (error?.message || String(error));
    console.warn(`[email] 发送失败（${provider}）：${errorText}`);
    await logSend(env, {
      at: new Date().toISOString(),
      to: recipients.join(','),
      subject: payload.subject,
      template: payload.template,
      provider,
      ok: false,
      error: errorText.slice(0, 300),
    });
    return { ok: false, provider, id: '', error: errorText, recipients };
  }
}

/**
 * 按模板渲染并发送。
 *
 * @param {object} env
 * @param {{template:string, data?:object, to?:string[]|string, settings?:object, overrideEnabled?:boolean}} options
 */
export async function sendTemplatedEmail(env, { template, data = {}, to, settings, overrideEnabled = false } = {}) {
  const resolved = settings || await getEmailSettings(env, { includeSecret: true });
  if (!overrideEnabled) {
    const readiness = checkEmailReadiness(resolved);
    if (!readiness.ready) return { ok: false, skipped: true, reason: readiness.reason };
  }
  const rendered = renderEmail({ template, data, settings: resolved });
  return sendEmail(env, {
    to: to || resolved.recipients,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    template,
    settings: resolved,
  });
}

/**
 * 后台「发送测试邮件」。
 *
 * @param {object} env
 * @param {object} payload 可用未保存的表单值直接测试。
 */
export async function testEmailSettings(env, payload = {}) {
  const saved = await getEmailSettings(env, { includeSecret: true });
  const merged = {
    ...saved,
    ...(payload.provider ? { provider: cleanText(payload.provider) } : {}),
    ...(payload.fromName !== undefined ? { fromName: cleanText(payload.fromName) } : {}),
    ...(payload.fromAddress ? { fromAddress: cleanText(payload.fromAddress) } : {}),
    ...(payload.recipients ? { recipients: cleanText(payload.recipients) } : {}),
    ...(payload.smtpHost !== undefined ? { smtpHost: cleanText(payload.smtpHost) } : {}),
    ...(payload.smtpPort ? { smtpPort: String(payload.smtpPort) } : {}),
    ...(payload.smtpSecure ? { smtpSecure: String(payload.smtpSecure) } : {}),
    ...(payload.smtpUser !== undefined ? { smtpUser: normalizeMailCredential(cleanText(payload.smtpUser)) } : {}),
    ...(payload.httpEndpoint !== undefined ? { httpEndpoint: cleanText(payload.httpEndpoint) } : {}),
    enabled: 'true',
  };
  const apiKey = cleanText(payload.apiKey);
  if (apiKey && apiKey !== '********') merged.apiKey = apiKey;
  const smtpPass = normalizeMailCredential(cleanText(payload.smtpPass));
  if (smtpPass && smtpPass !== '********') merged.smtpPass = smtpPass;

  const to = parseRecipients(payload.to).length ? parseRecipients(payload.to) : merged.recipientList;
  const readiness = checkEmailReadiness({ ...merged, recipients: to.join(',') });
  if (!readiness.ready) {
    return { ok: false, provider: merged.provider, error: readiness.reason, recipients: to, readiness };
  }

  const started = Date.now();
  const result = await sendTemplatedEmail(env, {
    template: 'test',
    data: {
      provider: providerLabel(merged.provider),
      from: formatFrom(merged).header,
      siteUrl: cleanText(payload.siteUrl),
      siteName: cleanText(payload.siteName),
    },
    to,
    settings: { ...merged, recipients: to.join(',') },
    overrideEnabled: true,
  });

  return {
    ok: result.ok,
    provider: merged.provider,
    recipients: to,
    elapsedMs: Date.now() - started,
    error: result.error || '',
    readiness,
  };
}

// ─── 事件入口（调用方用 ctx.waitUntil 触发，失败不影响主流程）───────

/**
 * 新书签提交 → 通知管理员。
 *
 * @param {object} env
 * @param {{site:object, siteId?:number, siteUrl?:string, totalPending?:number}} event
 */
export async function notifySubmission(env, event = {}) {
  try {
    const settings = await getEmailSettings(env, { includeSecret: true });
    if (settings.enabled !== 'true' || settings.notifySubmission !== 'true') {
      return { ok: false, skipped: true, reason: '未开启「新提交提醒」' };
    }
    return await sendTemplatedEmail(env, {
      template: 'submission',
      data: {
        site: event.site || {},
        siteId: event.siteId,
        siteUrl: event.siteUrl,
        totalPending: event.totalPending,
        submittedAt: new Date().toISOString(),
      },
      settings,
    });
  } catch (error) {
    console.warn(`[email] notifySubmission 失败：${error?.message || error}`);
    return { ok: false, error: error?.message || String(error) };
  }
}

/**
 * 审核结果 → 通知提交者（若填了邮箱）与管理员。
 *
 * @param {object} env
 * @param {{site:object, approved:boolean, reason?:string, submitterEmail?:string, siteUrl?:string, totalSites?:number}} event
 */
export async function notifyReviewDecision(env, event = {}) {
  try {
    const settings = await getEmailSettings(env, { includeSecret: true });
    if (settings.enabled !== 'true' || settings.notifyReview !== 'true') {
      return { ok: false, skipped: true, reason: '未开启「审核结果通知」' };
    }
    const to = parseRecipients(event.submitterEmail);
    const recipients = to.length ? to : settings.recipientList;
    return await sendTemplatedEmail(env, {
      template: event.approved ? 'approved' : 'rejected',
      data: {
        site: event.site || {},
        reason: event.reason || '',
        siteUrl: event.siteUrl,
        totalSites: event.totalSites,
      },
      to: recipients,
      settings: { ...settings, recipients: recipients.join(',') },
    });
  } catch (error) {
    console.warn(`[email] notifyReviewDecision 失败：${error?.message || error}`);
    return { ok: false, error: error?.message || String(error) };
  }
}

/**
 * 健康检查异常 → 汇总告警。
 *
 * @param {object} env
 * @param {{items:Array, checked?:number, failed?:number, siteUrl?:string}} event
 */
export async function notifyHealthAlert(env, event = {}) {
  try {
    const settings = await getEmailSettings(env, { includeSecret: true });
    if (settings.enabled !== 'true' || settings.notifyHealth !== 'true') {
      return { ok: false, skipped: true, reason: '未开启「健康异常告警」' };
    }
    const items = Array.isArray(event.items) ? event.items : [];
    if (!items.length) return { ok: false, skipped: true, reason: '没有异常项' };
    return await sendTemplatedEmail(env, {
      template: 'healthAlert',
      data: {
        items,
        checked: event.checked,
        failed: event.failed,
        checkedAt: new Date().toISOString(),
        siteUrl: event.siteUrl,
      },
      settings,
    });
  } catch (error) {
    console.warn(`[email] notifyHealthAlert 失败：${error?.message || error}`);
    return { ok: false, error: error?.message || String(error) };
  }
}

/**
 * 定期摘要（周报 / 月报）。
 *
 * @param {object} env
 * @param {{stats:object, latestSites?:Array, siteUrl?:string, period?:'week'|'month'}} event
 */
export async function notifyDigest(env, event = {}) {
  try {
    const settings = await getEmailSettings(env, { includeSecret: true });
    if (settings.enabled !== 'true' || settings.notifyDigest !== 'true') {
      return { ok: false, skipped: true, reason: '未开启「定期摘要」' };
    }
    const period = event.period === 'month' ? 'month' : 'week';
    return await sendTemplatedEmail(env, {
      template: 'digest',
      data: {
        stats: event.stats || {},
        latestSites: event.latestSites || [],
        siteUrl: event.siteUrl,
        period,
        periodLabel: period === 'month' ? '近 30 天新增' : '近 7 天新增',
        subjectLabel: period === 'month' ? '站点月报' : '站点周报',
        title: period === 'month' ? '站点运行月报' : '站点运行周报',
        generatedAt: new Date().toISOString(),
      },
      settings,
    });
  } catch (error) {
    console.warn(`[email] notifyDigest 失败：${error?.message || error}`);
    return { ok: false, error: error?.message || String(error) };
  }
}

/**
 * 定时任务钩子：到达配置的北京时间整点且当天未发过，就发摘要。
 *
 * @param {object} env
 * @param {{stats:object, latestSites?:Array, siteUrl?:string, now?:number}} event
 * @returns {Promise<{sent:boolean, reason?:string}>}
 */
export async function maybeSendDigest(env, event = {}) {
  try {
    const settings = await getEmailSettings(env, { includeSecret: true });
    if (settings.enabled !== 'true' || settings.notifyDigest !== 'true') return { sent: false, reason: '未开启摘要' };

    const now = event.now || Date.now();
    const parts = getBeijingParts(now);
    if (parts.hour !== Number(settings.digestHour)) return { sent: false, reason: '未到发送时间' };
    if (settings.lastDigestDate === parts.date) return { sent: false, reason: '今天已发送' };

    const result = await notifyDigest(env, {
      stats: event.stats,
      latestSites: event.latestSites,
      siteUrl: event.siteUrl,
      period: settings.digestPeriod,
    });
    if (result?.ok) await setSetting(env, `${EMAIL_PREFIX}lastDigestDate`, parts.date);
    return { sent: Boolean(result?.ok), reason: result?.error || result?.reason || '' };
  } catch (error) {
    console.warn(`[email] maybeSendDigest 失败：${error?.message || error}`);
    return { sent: false, reason: error?.message || String(error) };
  }
}

/**
 * 预览模板（后台用）：不发送，只返回渲染结果。
 *
 * @param {string} template
 * @param {object} [data]
 */
export async function previewEmailTemplate(template, data = {}) {
  const sampleSite = {
    name: 'Cloudflare Workers 文档',
    url: 'https://developers.cloudflare.com/workers/',
    catelog: '开发工具',
    desc: '无服务器函数运行时文档，含 D1、KV、R2 等绑定说明。',
    tags: ['开发工具', '文档', 'Cloudflare'],
    reason: '部署书签导航时经常要查，很适合放进开发分类。',
  };
  const samples = {
    submission: { site: sampleSite, totalPending: 3, submittedAt: new Date().toISOString() },
    approved: { site: sampleSite, totalSites: 128 },
    rejected: { site: sampleSite, reason: '该站点已有重复收录，感谢推荐。' },
    healthAlert: {
      items: [
        { name: '某个已下线站点', url: 'https://dead.example.com/', statusCode: 503 },
        { name: '证书过期站点', url: 'https://expired.example.com/', statusCode: 0 },
      ],
      checked: 42,
      failed: 2,
    },
    digest: {
      stats: { totalSites: 128, totalCategories: 12, totalTags: 64, totalHits: 4820, weekNew: 7, pendingSites: 2 },
      latestSites: [
        { name: 'Cloudflare Workers 文档', catelog: '开发工具' },
        { name: '某设计灵感站', catelog: '设计素材' },
      ],
      period: 'week',
      periodLabel: '近 7 天新增',
      subjectLabel: '站点周报',
      title: '站点运行周报',
    },
    test: { provider: '预览模式', from: '预览 <noreply@example.com>' },
  };
  return renderEmail({ template, data: { ...(samples[template] || {}), ...data } });
}
