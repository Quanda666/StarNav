// 生成后台页面的静态预览（带 API 桩），用于排查「联网搜索选不了后端」这类前端问题
import { writeFileSync, mkdirSync } from 'node:fs';
import { adminHtml } from '../src/pages/admin/html.js';
import { adminCss } from '../src/pages/admin/styles.js';
import { adminJs } from '../src/pages/admin/scripts/index.js';
import { WEB_SEARCH_PROVIDERS } from '../src/services/webSearchService.js';

mkdirSync('/tmp/ui-preview', { recursive: true });

const stub = `
<script>
window.__REQUESTS__ = [];
const WEB_SEARCH_PAYLOAD = ${JSON.stringify({
  enabled: 'true',
  provider: 'duckduckgo',
  apiKey: '',
  baseUrl: '',
  maxResults: '5',
  autoMode: 'false',
  configured: false,
  providers: WEB_SEARCH_PROVIDERS,
})};
window.fetch = async function (url, options) {
  const target = String(url);
  window.__REQUESTS__.push({ url: target, method: (options && options.method) || 'GET' });
  const json = (data) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (target.includes('/api/settings/web-search')) return json({ code: 200, data: WEB_SEARCH_PAYLOAD });
  if (target.includes('/api/settings/ai')) return json({ code: 200, data: { enabled: 'false', baseUrl: '', model: '', systemPrompt: '', configured: false } });
  if (target.includes('/api/settings/email')) return json({ code: 200, data: { enabled: 'false', provider: 'resend', recipients: '', log: [], providers: [] } });
  if (target.includes('/api/config')) return json({ code: 200, data: [], total: 0, page: 1 });
  return json({ code: 200, data: {} });
};
</script>`;

let html = adminHtml
  .replace('<link rel="stylesheet" href="/static/admin.css">', `<style>${adminCss}</style>`)
  .replace('<script src="/static/admin.js"></script>', `${stub}\n<script>${adminJs}</script>`)
  // 去掉外部字体，避免离线等待
  .replace(/<link[^>]*fonts\.googleapis[^>]*>/g, '')
  .replace(/<link[^>]*fonts\.gstatic[^>]*>/g, '');

writeFileSync('/tmp/ui-preview/admin.html', html);
console.log('written /tmp/ui-preview/admin.html');
