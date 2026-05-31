// 首页 CSS 的运行时入口：构建产物（generated-css.js）的内容字符串与其版本号。
// generated-css.js 由 `npm run build:css` 生成；版本号用于 /static/home.css 的 cache-busting 查询参数。
import { homeCss } from './generated-css.js';
import { hashString } from '../../lib/utils.js';

export { homeCss };
export const homeCssVersion = hashString(homeCss);
