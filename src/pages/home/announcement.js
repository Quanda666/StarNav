import { escapeHTML } from '../../lib/utils.js';

export function renderMarkdownContent(markdown = '') {
  let text = escapeHTML(markdown || '').replace(/\r\n/g, '\n');
  const codeBlocks = [];
  text = text.replace(/```([\s\S]*?)```/g, (_, code) => {
    const token = `@@CODE_${codeBlocks.length}@@`;
    codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
    return token;
  });
  text = text
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  text = text
    .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
  text = text.split(/\n{2,}/).map((part) => {
    const p = part.trim();
    if (!p) return '';
    if (/^<(h1|h2|h3|ul|pre)/.test(p) || /^@@CODE_\d+@@$/.test(p)) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');
  codeBlocks.forEach((html, index) => {
    text = text.replace(`@@CODE_${index}@@`, html);
  });
  return text;
}

const TAG_META = {
  '重要': 'important',
  '维护': 'maintenance',
  '更新': 'update',
  '活动': 'activity',
  '提示': 'info',
};

function renderAnnouncementItem(entry) {
  const tag = entry.tag || '提示';
  const tagClass = TAG_META[tag] || 'info';
  return `<article class="ann-item">
    <header class="ann-item-head">
      <span class="ann-tag ann-tag-${tagClass}">${escapeHTML(tag)}</span>
      <h3 class="ann-item-title">${escapeHTML(entry.title || '公告')}</h3>
      <time class="ann-item-date">${escapeHTML(entry.date || '')}</time>
    </header>
    <div class="ann-item-body announcement-body">${renderMarkdownContent(entry.content || '')}</div>
  </article>`;
}

// 时间线时间按中国时区（UTC+8）解析；前台脚本再补「x 周前」的相对时间。
function timelineTimestamp(raw) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(raw || '').trim());
  if (!m) return null;
  const hasTime = m[4] !== undefined;
  const ts = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) - 8 * 3600 * 1000;
  return { ts, hasTime };
}

function formatShanghai(ts, hasTime) {
  const d = new Date(ts + 8 * 3600 * 1000);
  const date = d.toISOString().slice(0, 10);
  return hasTime ? `${date} ${d.toISOString().slice(11, 16)}` : date;
}

function renderTimelineItem(entry) {
  const parsed = timelineTimestamp(entry.date);
  const dateHtml = parsed
    ? `<time class="ann-timeline-date" data-ts="${parsed.ts}" data-has-time="${parsed.hasTime ? '1' : '0'}">${escapeHTML(formatShanghai(parsed.ts, parsed.hasTime))}</time>`
    : `<time class="ann-timeline-date">${escapeHTML(entry.date || '')}</time>`;
  return `<li class="ann-timeline-item">
    ${dateHtml}
    <h4 class="ann-timeline-title">${escapeHTML(entry.title || '')}</h4>
    ${entry.content ? `<div class="ann-timeline-content announcement-body">${renderMarkdownContent(entry.content)}</div>` : ''}
  </li>`;
}

/**
 * 渲染 New API 风格公告弹窗：左侧「通知」、右侧「时间线」两个标签页。
 * data-version 用于“只显示一次”记录（取最新公告 id）。
 */
export function renderAnnouncementModal({ title = '公告', entries = [], timeline = [], version = '1', showOnce = true, buttonText = '我知道了' }) {
  const showTimeline = timeline.length > 0;
  const versionAttr = escapeHTML(version || '1');
  const showOnceAttr = showOnce ? 'true' : 'false';
  const announcementsHtml = entries.length
    ? entries.map(renderAnnouncementItem).join('')
    : '<p class="ann-empty">暂无通知</p>';
  const timelineHtml = timeline.length
    ? `<ul class="ann-timeline">${timeline.map(renderTimelineItem).join('')}</ul>`
    : '<p class="ann-empty">暂无更新记录</p>';
  return `<div id="announcementModal" class="announcement-modal hidden" data-version="${versionAttr}" data-show-once="${showOnceAttr}" role="dialog" aria-modal="true" aria-labelledby="announcementTitle">
    <div class="announcement-card ann-modal-card">
      <div class="announcement-head">
        <div class="ann-head-title">
          <span class="ann-head-ico" aria-hidden="true">📢</span>
          <h2 id="announcementTitle" class="text-lg font-semibold text-gray-900">${escapeHTML(title)}</h2>
        </div>
        <button type="button" class="announcement-close rounded-full px-2 py-1 text-gray-500 hover:bg-primary-50" aria-label="关闭公告">×</button>
      </div>
      ${showTimeline ? `<div class="ann-tabs" role="tablist">
        <button type="button" class="ann-tab active" data-ann-tab="announcements" role="tab" aria-selected="true">通知</button>
        <button type="button" class="ann-tab" data-ann-tab="timeline" role="tab" aria-selected="false">时间线</button>
      </div>` : ''}
      <div class="ann-modal-body">
        <div id="annPanelAnnouncements" class="ann-panel active" role="tabpanel">${announcementsHtml}</div>
        ${showTimeline ? `<div id="annPanelTimeline" class="ann-panel" role="tabpanel" hidden>${timelineHtml}</div>` : ''}
      </div>
      <div class="announcement-actions">
        <button type="button" class="announcement-close-today rounded-xl border border-primary-100 bg-white px-5 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50">今日不再提示</button>
        <button type="button" class="announcement-close rounded-xl bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700">${escapeHTML(buttonText)}</button>
      </div>
    </div>
  </div>`;
}
