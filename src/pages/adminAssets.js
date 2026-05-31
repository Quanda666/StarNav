import { adminHtml } from './admin/html.js';
import { adminCss } from './admin/styles.js';
import { adminJs } from './admin/scripts/index.js';
import { homeCss } from './home/css.js';
import { hashString } from '../lib/utils.js';

const ADMIN_ASSETS = {
  'admin.html': { content: adminHtml, type: 'text/html; charset=utf-8' },
  'admin.css': { content: adminCss, type: 'text/css; charset=utf-8' },
  'admin.js': { content: adminJs, type: 'application/javascript; charset=utf-8' },
  'home.css': { content: homeCss, type: 'text/css; charset=utf-8' },
};

// 模块加载时一次性计算各静态资源版本号（用于 ETag 协商缓存）。
for (const asset of Object.values(ADMIN_ASSETS)) {
  asset.version = hashString(asset.content);
}

export function getAdminAsset(filePath) {
  return ADMIN_ASSETS[filePath] || null;
}
