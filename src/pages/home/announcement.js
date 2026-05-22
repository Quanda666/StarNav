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

export function renderAnnouncementModal(announcement) {
  const version = escapeHTML(announcement.version || '1');
  const showOnce = announcement.showOnce ? 'true' : 'false';
  return `<div id="announcementModal" class="announcement-modal hidden" data-version="${version}" data-show-once="${showOnce}" role="dialog" aria-modal="true" aria-labelledby="announcementTitle">
    <div class="announcement-card">
      <div class="announcement-head">
        <h2 id="announcementTitle" class="text-lg font-semibold text-gray-900">${escapeHTML(announcement.title || '系统公告')}</h2>
        <button type="button" class="announcement-close rounded-full px-2 py-1 text-gray-500 hover:bg-primary-50" aria-label="关闭公告">×</button>
      </div>
      <div class="announcement-body">${renderMarkdownContent(announcement.markdown || '')}</div>
      <div class="announcement-actions">
        <button type="button" class="announcement-close-today rounded-xl border border-primary-100 bg-white px-5 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50">今日不再提示</button>
        <button type="button" class="announcement-close rounded-xl bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700">${escapeHTML(announcement.buttonText || '我知道了')}</button>
      </div>
    </div>
  </div>`;
}