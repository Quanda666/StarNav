// 一次性迁移脚本：把 home.js 内联 <style> 块提取为独立 CSS 真相文件，
// 并从 home.js 中删除该 <style> 块。运行：node scripts/extract-home-css.mjs
//
// 关键转换：原先依赖界面语言的 div[aria-label="${th('layoutMode')}"] 选择器，
// 改为稳定的 .layout-mode-bar 类（同时需在 home.js 模板对应容器补上该 class）。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const HOME = 'src/pages/home.js';
const OUT_CSS = 'src/styles/home-custom.css';

let src = readFileSync(HOME, 'utf8');
const match = src.match(/\n {2}<style>\n([\s\S]*?)\n {2}<\/style>/);
if (!match) throw new Error('未找到 home.js 中的 <style> 块');

let css = match[1];
css = css.replace(/div\[aria-label="\$\{th\('layoutMode'\)\}"\]/g, '.layout-mode-bar');

const leftover = css.match(/\$\{[^}]*\}/);
if (leftover) throw new Error(`CSS 仍含模板插值，需要先处理：${leftover[0]}`);

mkdirSync('src/styles', { recursive: true });
const header = '/* 首页自定义样式：迁移自 home.js 内联 <style>，经构建拼接到 Tailwind 输出之后。 */\n';
writeFileSync(OUT_CSS, header + css.trim() + '\n');

src = src.replace(match[0], '');
writeFileSync(HOME, src);

console.log(`提取 ${css.length} 字符 CSS 到 ${OUT_CSS}；已从 home.js 删除 <style> 块。`);
