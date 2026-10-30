// 生成静态预览页，用于检查 AI 小助理面板的新样式
// （快捷提问 / 联网开关 / 模式徽标 / 联网来源卡片），浅色 + 深色各一份。
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { homeCss } from '../src/pages/home/generated-css.js';

mkdirSync('/tmp/ui-preview', { recursive: true });

const homeSrc = readFileSync(new URL('../src/pages/home.js', import.meta.url), 'utf8');
const start = homeSrc.indexOf('<div id="floatingAiPanel"');
const end = homeSrc.indexOf('</form>', start);
let panel = homeSrc
  .slice(start, end + '</form>'.length)
  .replace(/\$\{[^}]*\}/g, (match) => (match.includes('aiAssistant') ? 'AI 小助理' : ''))
  .replace('class="floating-ai-panel hidden', 'class="floating-ai-panel');

const demoInner = `
        <div class="ai-message assistant">你好，我是本站 AI 小助理。我可以帮你找书签、说清某个网站放在哪个分类，也能直接回答“今天星期几”“本站有多少书签”。</div>
        <div class="ai-message user">今天星期几</div>
        <div class="ai-message assistant">今天是 2026年10月30日 星期五（北京时间）。</div>
        <div class="ai-msg-badges"><span class="ai-mode-badge">实时计算</span></div>
        <div class="ai-message user">联网查一下 Cloudflare Workers 最新动态</div>
        <div class="ai-message assistant">据联网检索结果，Cloudflare 近期更新了 Workers 运行时与 D1 相关能力 [1][2]。以下信息来自网络，不是本站收录的书签。</div>
        <div class="ai-msg-badges"><span class="ai-mode-badge">AI 回答</span><span class="ai-mode-badge">含联网结果</span></div>
        <div class="space-y-2">
          <div class="ai-site-card rounded-xl border border-primary-100/70 bg-white/80 p-3 text-xs shadow-sm">
            <div class="flex items-start justify-between gap-2"><div class="min-w-0 flex-1"><div class="truncate text-sm font-semibold text-gray-900">Cloudflare Workers 文档</div><div class="mt-1 inline-flex rounded-full bg-primary-50 px-2 py-0.5 text-[11px] text-primary-700">开发工具</div></div><span class="flex-shrink-0 rounded-full bg-accent-50 px-2 py-0.5 text-[10px] text-accent-700">本站书签</span></div>
            <p class="mt-2 line-clamp-2 text-gray-600">无服务器函数运行时文档，含 D1、KV、R2 等绑定说明。</p>
            <div class="mt-2 truncate text-[11px] text-primary-600">https://developers.cloudflare.com/workers/</div>
            <div class="mt-3 flex gap-2"><a class="ai-card-visit flex-1 rounded-lg bg-primary-600 px-3 py-1.5 text-center font-medium text-white" href="#">访问</a><button type="button" class="ai-card-copy rounded-lg bg-accent-100 px-3 py-1.5 font-medium text-accent-700">复制</button></div>
          </div>
        </div>
        <div class="ai-web-results-title">联网结果（非本站书签）</div>
        <div class="ai-web-results">
          <div class="ai-web-card"><div class="ai-web-head"><span class="ai-web-badge">联网 1</span><span class="ai-web-host">developers.cloudflare.com</span></div><a class="ai-web-title" href="#">Workers runtime update</a><p class="ai-web-snippet">本次更新调整了 Workers 的兼容性标志与 D1 绑定行为。</p></div>
          <div class="ai-web-card"><div class="ai-web-head"><span class="ai-web-badge">联网 2</span><span class="ai-web-host">blog.cloudflare.com</span></div><a class="ai-web-title" href="#">D1 新特性说明</a><p class="ai-web-snippet">D1 增加了批量写入优化与查询洞察能力。</p></div>
        </div>
      `;

panel = panel.replace(
  /<div id="aiChatBody"[\s\S]*?<\/div>\s*<div id="aiQuickAsk"/,
  `<div id="aiChatBody" class="ai-chat-body space-y-3 p-4" style="max-height:none">${demoInner}</div>\n      <div id="aiQuickAsk"`,
);

const page = (dark) => `<!DOCTYPE html>
<html lang="zh-CN"${dark ? ' class="dark"' : ''} data-layout="grid" data-bg="soft" data-accent="blue">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${homeCss}</style>
<style>
  body{margin:0;padding:18px;background:var(--nav-page-bg,#f0f4f9);font-family:'Noto Sans SC',system-ui,sans-serif}
  .stage{max-width:26rem;margin:0 auto}
  .floating-ai-panel{position:static!important;display:block!important;width:100%!important;max-width:none!important;max-height:none!important}
  .ai-chat-body{max-height:none!important}
</style>
</head>
<body><div class="stage">${panel}</div></body></html>`;

writeFileSync('/tmp/ui-preview/ai-panel-light.html', page(false));
writeFileSync('/tmp/ui-preview/ai-panel-dark.html', page(true));
console.log('ok, 面板长度', panel.length);
