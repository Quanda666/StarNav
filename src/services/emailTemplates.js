// 邮件模板：现代、克制的「星漫」视觉（渐变头图 + 卡片 + 圆角药丸），
// 全部使用内联样式 + 表格布局，兼容 Gmail / Outlook / QQ 邮箱 / 移动端；
// 附 <style> 里的媒体查询与深色模式适配，不依赖外部图片（避免被拦截）。
//
// renderEmail({ template, data, settings }) → { subject, html, text }

import { formatBeijingDateTime, formatStoredUtcToBeijing } from '../lib/datetime.js';

const BRAND = {
  name: '星漫旅站',
  tagline: '收藏、整理与发现你的常用网站',
  accent: '#4f46e5',
  accent2: '#7c3aed',
  accentSoft: '#eef2ff',
  success: '#059669',
  successSoft: '#ecfdf5',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  ink: '#111827',
  muted: '#6b7280',
  line: '#e5e7eb',
  surface: '#ffffff',
  page: '#f3f4f6',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(value, max = 220) {
  const text = String(value ?? '').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function absoluteUrl(base, path) {
  const root = String(base || '').replace(/\/+$/, '');
  if (!root) return String(path || '');
  return `${root}${String(path || '').startsWith('/') ? '' : '/'}${path || ''}`;
}

/** 只允许 http(s) 链接进 href，防止模板被注入 javascript: 之类的伪协议。 */
function safeUrl(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

// ─── 组件 ───────────────────────────────────────────────

function button(href, label, { variant = 'primary' } = {}) {
  // 邮件里相对链接无效，因此只接受绝对 http(s) 地址
  const safe = safeUrl(href);
  if (!safe) return '';
  const isPrimary = variant === 'primary';
  const style = isPrimary
    ? `display:inline-block;padding:12px 22px;border-radius:999px;background-image:linear-gradient(135deg,${BRAND.accent},${BRAND.accent2});color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:.01em`
    : `display:inline-block;padding:11px 20px;border-radius:999px;border:1px solid ${BRAND.line};background:${BRAND.surface};color:${BRAND.ink};font-size:14px;font-weight:600;text-decoration:none`;
  return `<a href="${escapeHtml(safe)}" style="${style}">${escapeHtml(label)}</a>`;
}

function infoRow(label, value) {
  if (!value) return '';
  return `<tr>
    <td style="padding:7px 0;width:88px;vertical-align:top;color:${BRAND.muted};font-size:13px;line-height:1.6">${escapeHtml(label)}</td>
    <td style="padding:7px 0;color:${BRAND.ink};font-size:13px;line-height:1.6;word-break:break-all">${value}</td>
  </tr>`;
}

function card(inner, { tone = 'default', padded = true } = {}) {
  const palette = {
    default: { bg: '#f9fafb', line: BRAND.line },
    highlight: { bg: BRAND.accentSoft, line: '#c7d2fe' },
    success: { bg: BRAND.successSoft, line: '#a7f3d0' },
    danger: { bg: BRAND.dangerSoft, line: '#fecaca' },
  }[tone] || { bg: '#f9fafb', line: BRAND.line };
  return `<div style="background:${palette.bg};border:1px solid ${palette.line};border-radius:14px;${padded ? 'padding:16px 18px;' : ''}margin:0 0 16px">${inner}</div>`;
}

function pills(values = []) {
  const list = (Array.isArray(values) ? values : []).filter(Boolean);
  if (!list.length) return '';
  return `<div style="margin:10px 0 2px">${list.map((item) =>
    `<span style="display:inline-block;margin:0 6px 6px 0;padding:3px 10px;border-radius:999px;background:#eef2ff;color:#4338ca;font-size:12px;font-weight:600">#${escapeHtml(item)}</span>`
  ).join('')}</div>`;
}

function quote(text) {
  if (!text) return '';
  return `<p style="margin:8px 0 0;padding:10px 14px;border-left:3px solid ${BRAND.accent};background:#f8fafc;border-radius:0 10px 10px 0;color:#374151;font-size:13px;line-height:1.7">${escapeHtml(truncate(text, 300))}</p>`;
}

function layout({ title, subtitle, body, footerNote = '', preheader = '', siteName = BRAND.name, siteSubtitle = BRAND.tagline }) {
  const year = new Date().getUTCFullYear();
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${escapeHtml(title)}</title>
<style>
  @media (max-width:600px){
    .wrap{padding:0 12px !important}
    .card{padding:22px 18px !important;border-radius:16px !important}
    .title{font-size:20px !important}
  }
  @media (prefers-color-scheme:dark){
    .page{background:#0b1120 !important}
    .card{background:#111827 !important;border-color:#1f2937 !important}
    .title,.ink{color:#f9fafb !important}
    .muted{color:#9ca3af !important}
    .soft{background:#1e293b !important;border-color:#334155 !important}
  }
</style>
</head>
<body class="page" style="margin:0;padding:0;background:${BRAND.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};padding:28px 0">
  <tr>
    <td align="center" class="wrap" style="padding:0 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr>
          <td style="padding:0 0 16px">
            <div style="padding:20px 22px;border-radius:18px;background-image:linear-gradient(135deg,${BRAND.accent},${BRAND.accent2});box-shadow:0 12px 30px rgba(79,70,229,.25)">
              <p class="ink" style="margin:0;color:#ffffff;font-size:16px;font-weight:700;letter-spacing:.02em">✦ ${escapeHtml(siteName)}</p>
              <p style="margin:6px 0 0;color:rgba(255,255,255,.82);font-size:12.5px;line-height:1.5">${escapeHtml(siteSubtitle)}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td class="card" style="background:${BRAND.surface};border:1px solid ${BRAND.line};border-radius:18px;padding:26px 26px 22px;box-shadow:0 10px 30px rgba(15,23,42,.06)">
            <h1 class="title" style="margin:0 0 6px;color:${BRAND.ink};font-size:22px;line-height:1.35;font-weight:700">${escapeHtml(title)}</h1>
            ${subtitle ? `<p class="muted" style="margin:0 0 18px;color:${BRAND.muted};font-size:13.5px;line-height:1.6">${escapeHtml(subtitle)}</p>` : '<div style="height:14px"></div>'}
            ${body}
            ${footerNote ? `<p class="muted" style="margin:18px 0 0;color:${BRAND.muted};font-size:12px;line-height:1.6">${escapeHtml(footerNote)}</p>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 8px 0;text-align:center">
            <p class="muted" style="margin:0;color:#9ca3af;font-size:11.5px;line-height:1.8">
              本邮件由 ${escapeHtml(siteName)} 自动发送<br>
              时间均以北京时间（UTC+8）显示 · ${year}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function siteBlock(site = {}) {
  const link = safeUrl(site.url);
  const rows = [
    infoRow('名称', escapeHtml(site.name || '未命名')),
    infoRow('网址', link ? `<a href="${escapeHtml(link)}" style="color:${BRAND.accent};text-decoration:none">${escapeHtml(truncate(site.url, 90))}</a>` : escapeHtml(truncate(site.url || '', 90))),
    infoRow('分类', escapeHtml(site.catelog || '未分类')),
    infoRow('描述', escapeHtml(truncate(site.desc || '', 200))),
  ].filter(Boolean).join('');
  return `${card(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>${pills(site.tags)}`, { tone: 'default' })}${quote(site.reason ? `推荐理由：${site.reason}` : '')}`;
}

function statGrid(items = []) {
  const cells = items.filter(Boolean);
  if (!cells.length) return '';
  // 固定 2 列（邮件客户端不支持 grid/flex 回流）：窄屏下不会把标签和数值挤成多行
  const rows = [];
  for (let i = 0; i < cells.length; i += 2) rows.push(cells.slice(i, i + 2));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px">
    ${rows.map((row) => `<tr>${row.map((item) => `<td width="50%" style="padding:0 6px 12px 0;vertical-align:top">
      <div style="background:linear-gradient(180deg,#ffffff,#f8fafc);border:1px solid ${BRAND.line};border-radius:14px;padding:14px 16px">
        <p style="margin:0;color:${BRAND.muted};font-size:12px;line-height:1.5;white-space:nowrap">${escapeHtml(item.label)}</p>
        <p style="margin:7px 0 0;color:${BRAND.ink};font-size:20px;font-weight:700;line-height:1.2;white-space:nowrap">${escapeHtml(item.value)}</p>
      </div>
    </td>`).join('')}</tr>`).join('')}
  </table>`;
}

// ─── 各事件模板 ─────────────────────────────────────────

function submissionTemplate(data = {}, settings = {}) {
  const site = data.site || {};
  const submittedAt = data.submittedAt ? formatBeijingDateTime(Date.parse(data.submittedAt)) : formatBeijingDateTime(Date.now());
  const body = `
    ${siteBlock(site)}
    ${card(`
      <p style="margin:0;color:${BRAND.ink};font-size:13px;font-weight:600">需要你处理</p>
      <p class="muted" style="margin:6px 0 14px;color:${BRAND.muted};font-size:13px;line-height:1.7">
        提交时间：${escapeHtml(submittedAt)}${data.totalPending ? `<br>当前待审队列：${escapeHtml(String(data.totalPending))} 条` : ''}
      </p>
      ${button(absoluteUrl(data.siteUrl || settings.siteUrl, '/admin'), '前往后台审核')}
    `, { tone: 'highlight' })}
  `;
  return {
    subject: `【新书签提交】${site.name || '未命名站点'} · ${site.catelog || '未分类'}`,
    html: layout({
      title: '有新的书签提交待审核',
      subtitle: '站点访客提交了一个新书签，请确认是否收录。',
      body,
      preheader: `${site.name || '新书签'} 等待审核`,
      siteName: data.siteName || settings.siteName,
      siteSubtitle: data.siteSubtitle || settings.siteSubtitle,
    }),
    text: [
      '有新的书签提交待审核',
      `名称：${site.name || ''}`,
      `网址：${site.url || ''}`,
      `分类：${site.catelog || ''}`,
      site.desc ? `描述：${site.desc}` : '',
      site.reason ? `推荐理由：${site.reason}` : '',
      `提交时间：${submittedAt}`,
      `审核入口：${absoluteUrl(data.siteUrl || settings.siteUrl, '/admin')}`,
    ].filter(Boolean).join('\n'),
  };
}

function approvedTemplate(data = {}, settings = {}) {
  const site = data.site || {};
  const body = `
    ${siteBlock(site)}
    ${card(`
      <p style="margin:0;color:${BRAND.success};font-size:13px;font-weight:700">✓ 已收录</p>
      <p class="muted" style="margin:6px 0 14px;color:${BRAND.muted};font-size:13px;line-height:1.7">
        ${data.totalSites ? `本站目前共收录 ${escapeHtml(String(data.totalSites))} 条书签。` : '感谢你的推荐，欢迎继续分享好站点。'}
      </p>
      ${button(absoluteUrl(data.siteUrl || settings.siteUrl, '/'), '去站点看看')}
    `, { tone: 'success' })}
  `;
  return {
    subject: `【已收录】${site.name || '你的推荐'} 已加入本站`,
    html: layout({
      title: '你推荐的书签已通过审核',
      subtitle: '感谢你的分享，它已经出现在站点的导航里。',
      body,
      preheader: `${site.name || ''} 已收录`,
      siteName: data.siteName || settings.siteName,
      siteSubtitle: data.siteSubtitle || settings.siteSubtitle,
    }),
    text: `你推荐的书签已通过审核\n名称：${site.name || ''}\n网址：${site.url || ''}\n分类：${site.catelog || ''}`,
  };
}

function rejectedTemplate(data = {}, settings = {}) {
  const site = data.site || {};
  const body = `
    ${siteBlock(site)}
    ${card(`
      <p style="margin:0;color:${BRAND.danger};font-size:13px;font-weight:700">未通过审核</p>
      <p class="muted" style="margin:6px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.7">
        ${data.reason ? `原因：${escapeHtml(truncate(data.reason, 200))}` : '该提交暂时未通过审核。'}
      </p>
    `, { tone: 'danger' })}
  `;
  return {
    subject: `【审核结果】${site.name || '你的提交'} 未通过`,
    html: layout({
      title: '这次提交未通过审核',
      subtitle: '不要紧，欢迎推荐更多优质站点。',
      body,
      preheader: `${site.name || ''} 未通过审核`,
      siteName: data.siteName || settings.siteName,
      siteSubtitle: data.siteSubtitle || settings.siteSubtitle,
    }),
    text: `本次提交未通过审核\n名称：${site.name || ''}\n网址：${site.url || ''}\n原因：${data.reason || '未说明'}`,
  };
}

function healthAlertTemplate(data = {}, settings = {}) {
  const items = Array.isArray(data.items) ? data.items : [];
  const rows = items.slice(0, 20).map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.line}">
        <p style="margin:0;color:${BRAND.ink};font-size:13.5px;font-weight:600">${escapeHtml(item.name || '未命名')}</p>
        <p style="margin:4px 0 0;color:${BRAND.muted};font-size:12px;word-break:break-all">${escapeHtml(truncate(item.url || '', 80))}</p>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.line};text-align:right;white-space:nowrap">
        <span style="display:inline-block;padding:2px 9px;border-radius:999px;background:${BRAND.dangerSoft};color:${BRAND.danger};font-size:11.5px;font-weight:700">
          ${escapeHtml(item.statusCode ? `HTTP ${item.statusCode}` : '连接失败')}
        </span>
      </td>
    </tr>`).join('');
  const body = `
    ${card(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows || `<tr><td style="color:${BRAND.muted};font-size:13px">本次没有明细</td></tr>`}</table>
    `, { tone: 'danger', padded: true })}
    ${card(`
      <p class="muted" style="margin:0 0 12px;color:${BRAND.muted};font-size:13px;line-height:1.7">
        检测时间：${escapeHtml(formatBeijingDateTime(data.checkedAt ? Date.parse(data.checkedAt) : Date.now()))}<br>
        共检测 ${escapeHtml(String(data.checked || items.length))} 条，异常 ${escapeHtml(String(data.failed ?? items.length))} 条。
      </p>
      ${button(absoluteUrl(data.siteUrl || settings.siteUrl, '/admin'), '打开后台处理')}
    `)}
  `;
  return {
    subject: `【健康检查】${items.length} 个书签访问异常`,
    html: layout({
      title: '有书签访问异常',
      subtitle: '这些站点在最近一次自动检测中不可用，建议确认是否已下线或更换链接。',
      body,
      preheader: `${items.length} 个书签异常`,
      siteName: data.siteName || settings.siteName,
      siteSubtitle: data.siteSubtitle || settings.siteSubtitle,
    }),
    text: `有书签访问异常：\n${items.map((item) => `- ${item.name || ''} ${item.url || ''} ${item.statusCode ? `HTTP ${item.statusCode}` : '连接失败'}`).join('\n')}`,
  };
}

function digestTemplate(data = {}, settings = {}) {
  const stats = data.stats || {};
  const latest = Array.isArray(data.latestSites) ? data.latestSites : [];
  const body = `
    ${statGrid([
      { label: '书签总数', value: stats.totalSites ?? 0 },
      { label: '分类 / 标签', value: `${stats.totalCategories ?? 0} / ${stats.totalTags ?? 0}` },
      { label: data.periodLabel || '近 7 天新增', value: stats.weekNew ?? 0 },
      { label: '累计访问', value: stats.totalHits ?? 0 },
    ])}
    ${latest.length ? card(`
      <p style="margin:0 0 10px;color:${BRAND.ink};font-size:13px;font-weight:600">最近收录</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${latest.slice(0, 5).map((site) => `<tr>
          <td style="padding:6px 0;color:${BRAND.ink};font-size:13px">${escapeHtml(site.name || '')}</td>
          <td style="padding:6px 0;text-align:right;color:${BRAND.muted};font-size:12px">${escapeHtml(site.catelog || '未分类')}</td>
        </tr>`).join('')}
      </table>
    `) : ''}
    ${card(`
      <p class="muted" style="margin:0 0 12px;color:${BRAND.muted};font-size:13px;line-height:1.7">
        统计时间：${escapeHtml(formatBeijingDateTime(data.generatedAt ? Date.parse(data.generatedAt) : Date.now()))}
        ${stats.pendingSites ? `<br>待审提交：${escapeHtml(String(stats.pendingSites))} 条` : ''}
      </p>
      ${button(absoluteUrl(data.siteUrl || settings.siteUrl, '/admin'), '查看后台数据')}
    `, { tone: 'highlight' })}
  `;
  return {
    subject: `【${data.subjectLabel || '站点周报'}】${stats.totalSites ?? 0} 条书签 · 新增 ${stats.weekNew ?? 0}`,
    html: layout({
      title: data.title || '站点运行概览',
      subtitle: '这是按北京时间汇总的站点数据摘要。',
      body,
      preheader: `共 ${stats.totalSites ?? 0} 条书签`,
      siteName: data.siteName || settings.siteName,
      siteSubtitle: data.siteSubtitle || settings.siteSubtitle,
    }),
    text: `站点概览\n书签总数：${stats.totalSites ?? 0}\n分类/标签：${stats.totalCategories ?? 0}/${stats.totalTags ?? 0}\n近 7 天新增：${stats.weekNew ?? 0}`,
  };
}

function testTemplate(data = {}, settings = {}) {
  const body = `
    ${card(`
      <p style="margin:0;color:${BRAND.success};font-size:13px;font-weight:700">✓ 邮件通道已打通</p>
      <p class="muted" style="margin:6px 0 14px;color:${BRAND.muted};font-size:13px;line-height:1.7">
        发送方式：${escapeHtml(data.provider || '未配置')}<br>
        发件人：${escapeHtml(data.from || '')}<br>
        发送时间：${escapeHtml(formatBeijingDateTime(Date.now()))}
      </p>
      ${button(absoluteUrl(data.siteUrl || settings.siteUrl, '/admin'), '返回后台')}
    `, { tone: 'success' })}
  `;
  return {
    subject: `【测试邮件】${settings.siteName || BRAND.name} 邮件通知配置成功`,
    html: layout({
      title: '邮件通知测试成功',
      subtitle: '收到这封邮件，说明后续的书签提交提醒、审核通知都能正常送达。',
      body,
      preheader: '邮件通道已打通',
      siteName: data.siteName || settings.siteName,
      siteSubtitle: data.siteSubtitle || settings.siteSubtitle,
    }),
    text: `邮件通知测试成功\n发送方式：${data.provider || ''}\n发件人：${data.from || ''}`,
  };
}

const TEMPLATES = {
  submission: submissionTemplate,
  approved: approvedTemplate,
  rejected: rejectedTemplate,
  healthAlert: healthAlertTemplate,
  digest: digestTemplate,
  test: testTemplate,
};

export const EMAIL_TEMPLATES = Object.keys(TEMPLATES);

/**
 * 渲染邮件。
 *
 * @param {{template:string, data?:object, settings?:object}} options
 * @returns {{subject:string, html:string, text:string, template:string}}
 */
export function renderEmail({ template, data = {}, settings = {} } = {}) {
  const builder = TEMPLATES[template];
  if (!builder) throw new Error(`Unknown email template: ${template}`);
  const rendered = builder(data, settings);
  return { ...rendered, template };
}

export { escapeHtml as escapeEmailHtml, formatStoredUtcToBeijing };
