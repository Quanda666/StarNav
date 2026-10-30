// 校验后台 HTML 里两个「搜索后端 / 发送方式」下拉是否已服务端渲染选项
import { adminHtml } from '../src/pages/admin/html.js';

const pick = (id) => {
  const match = adminHtml.match(new RegExp(`<select id="${id}">([\\s\\S]*?)</select>`));
  return match ? match[1] : '';
};
const count = (text) => (text.match(/<option/g) || []).length;

const web = pick('webSearchProvider');
const mail = pick('emailProvider');
console.log('联网后端选项数:', count(web), '| 含秘塔:', web.includes('value="metaso"'));
console.log('邮件通道选项数:', count(mail));
console.log('联网后端:', [...web.matchAll(/value="([^"]+)"/g)].map((m) => m[1]).join(','));
