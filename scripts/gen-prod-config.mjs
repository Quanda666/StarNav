// 从环境变量生成 wrangler.prod.toml：指向你【已有】的 nav Worker + book D1 + NAV_AUTH KV，
// 用于 GitHub Actions 自动把最新代码部署到旧部署（数据不丢）。
//
// - 缺少 NAV_D1_ID / NAV_KV_ID 时跳过（fork 者无这些密钥→不生成→后续部署步骤跳过），
//   保证仓库对 fork 友好：fork 走 README 的 Deploy to Cloudflare 按钮（id-less 配置自动建新资源）。
// - 生成的 wrangler.prod.toml 已被 .gitignore 忽略，不会被提交。
import { writeFileSync, appendFileSync } from 'node:fs';

const D1_ID = (process.env.NAV_D1_ID || '').trim();
const KV_ID = (process.env.NAV_KV_ID || '').trim();
const WORKER_NAME = (process.env.NAV_WORKER_NAME || '').trim() || 'nav';
const GITHUB_OUTPUT = process.env.GITHUB_OUTPUT || '';

const mark = (generated) => {
  if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `generated=${generated ? 'true' : 'false'}\n`);
};

if (!D1_ID || !KV_ID) {
  console.log('[gen-prod-config] NAV_D1_ID / NAV_KV_ID 未设置，跳过生成。fork 部署请用 README 的 Deploy to Cloudflare 按钮。');
  mark(false);
  process.exit(0);
}

const toml = `name = "${WORKER_NAME}"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "NAV_DB"
database_name = "book"
database_id = "${D1_ID}"

[[kv_namespaces]]
binding = "NAV_AUTH"
id = "${KV_ID}"
`;

writeFileSync('wrangler.prod.toml', toml);
mark(true);
console.log(`[gen-prod-config] 已生成 wrangler.prod.toml → Worker "${WORKER_NAME}" + D1 book(${D1_ID.slice(0, 8)}…) + KV(${KV_ID.slice(0, 8)}…)`);
