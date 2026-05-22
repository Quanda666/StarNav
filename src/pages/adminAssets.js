import { adminHtml } from './admin/html.js';
import { adminCss } from './admin/styles.js';
import { adminJs } from './admin/scripts/index.js';

export function getAdminAsset(filePath) {
  if (filePath === 'admin.html') return { content: adminHtml, type: 'text/html; charset=utf-8' };
  if (filePath === 'admin.css') return { content: adminCss, type: 'text/css; charset=utf-8' };
  if (filePath === 'admin.js') return { content: adminJs, type: 'application/javascript; charset=utf-8' };
  return null;
}
