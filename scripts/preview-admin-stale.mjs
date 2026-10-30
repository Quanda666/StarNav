// 模拟“页面是新的、admin.js 是旧版”的场景：去掉 fillWebProviders 的调用，
// 检查下拉是否仍有选项且可切换（验证服务端渲染选项的兜底效果）。
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
  enabled: 'true', provider: 'duckduckgo', apiKey: '', baseUrl: '', maxResults: '5', autoMode: 'false', configured: false,
  providers: WEB_SEARCH_PROVIDERS,
})};
window.fetch = async function (url, options) {
  const target = String(url);
  window.__REQUESTS__.push({ url: target, method: (options && options.method) || 'GET' });
  const json = (data) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (target.includes('/api/settings/web-search')) return json({ code: 200, data: WEB_SEARCH_PAYLOAD });
  if (target.includes('/api/settings/ai')) return json({ code: 200, data: { enabled: 'false', baseUrl: '', model: '', systemPrompt: '', configured: false } });
  if (target.includes('/api/settings/email')) return json({ code: 200, data: { enabled: 'false', provider: 'resend', recipients: '', log: [], providers: [] } });
  return json({ code: 200, data: [], total: 0, page: 1 });
};
</script>`;

// 关键：把 fillWebProviders 变成 no-op，模拟旧版脚本
const staleJs = adminJs.replace(
  /function fillWebProviders\(providers=\[\]\)\{[\s\S]*?\}\n/,
  'function fillWebProviders(providers=[]){return}\n',
);

const html = adminHtml
  .replace('<link rel="stylesheet" href="/static/admin.css">', `<style>${adminCss}</style>`)
  .replace('<script src="/static/admin.js"></script>', `${stub}\n<script>${staleJs}</script>`)
  .replace(/<link[^>]*fonts\.googleapis[^>]*>/g, '')
  .replace(/<link[^>]*fonts\.gstatic[^>]*>/g, '');

writeFileSync('/tmp/ui-preview/admin-stale.html', html);
console.log('written admin-stale.html；旧版脚本替换成功:', staleJs !== adminJs);
