import { writeFileSync, mkdirSync } from 'node:fs';
import { previewEmailTemplate, EMAIL_PROVIDERS } from '../src/services/emailService.js';

mkdirSync('/tmp/email-preview', { recursive: true });
const base = { siteName: '星漫旅站', siteSubtitle: '收藏、整理与发现你的常用网站', siteUrl: 'https://nav.example.com' };

for (const template of ['submission', 'approved', 'rejected', 'healthAlert', 'digest', 'test']) {
  const rendered = await previewEmailTemplate(template, base);
  writeFileSync(`/tmp/email-preview/${template}.html`, rendered.html);
  console.log(template, '->', rendered.subject);
}

// 顺便输出一个索引页，方便一屏预览
const index = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>邮件模板预览</title>
<style>body{font-family:system-ui,sans-serif;background:#eef1f6;margin:0;padding:24px}h2{font-size:15px;color:#334155;margin:24px 0 10px}
iframe{width:100%;max-width:640px;height:720px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,.08)}</style></head>
<body>
${['submission', 'approved', 'rejected', 'healthAlert', 'digest', 'test']
  .map((t) => `<h2>${t}</h2><iframe src="/${t}.html"></iframe>`).join('\n')}
</body></html>`;
writeFileSync('/tmp/email-preview/index.html', index);
console.log('providers:', EMAIL_PROVIDERS.map((p) => p.id).join(','));
