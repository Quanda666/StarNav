# StarNav 部署检查清单

本清单用于每次部署前后快速确认关键配置，降低 Cloudflare Workers / D1 / KV 环境差异导致的故障风险。

## 1. 本地质量检查

部署前先执行：

```bash
npm run quality
```

该命令会依次执行：

- `npm run check`：递归检查项目内 JavaScript 文件语法，排除 `node_modules`、`.wrangler` 等生成目录。
- `npm test`：运行 Node.js 内置测试框架中的核心测试用例。

## 2. Wrangler 配置

确认 `wrangler.toml` 至少包含以下配置：

```toml
name = "nav"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "NAV_DB"
database_name = "book"
database_id = "..."

[[kv_namespaces]]
binding = "NAV_AUTH"
id = "..."
```

检查点：

- `main` 指向 `src/index.js`。
- D1 binding 名称必须是 `NAV_DB`。
- KV binding 名称必须是 `NAV_AUTH`。
- 不同环境使用不同 D1 / KV 时，确认 `database_id` 和 KV `id` 没有误指向生产或测试环境。

## 3. D1 数据库

首次部署或重建数据库时执行：

```bash
npm run db:init
```

或等 Worker 启动后由内置迁移逻辑补齐新增字段和表结构。

重点确认：

- `schema.sql` 中包含基础表结构。
- `src/services/migrationService.js` 中的自动迁移逻辑已随代码部署。
- 后台功能异常时优先检查 D1 表字段是否迁移完成。

## 4. KV 命名空间

`NAV_AUTH` 当前承载：

- 管理员会话。
- 私密书签访问 token。
- API Token。
- WebHook 配置。
- 备份元数据和备份负载。
- AI / 系统 / WebDAV 等部分配置。

检查点：

- 生产环境部署前确认 KV namespace 绑定正确。
- 如果误删 KV，管理员登录态、Token、WebHook、KV 备份会丢失，但 D1 书签数据不会因此被删除。
- Token 或 WebHook 配置异常时，先确认 `NAV_AUTH` 是否为正确命名空间。

## 5. 管理员和私密访问配置

检查点：

- 管理员密码相关配置已设置。
- 私密书签密码如需启用，已在后台配置。
- 私密书签访问时长配置正常。
- 未解锁访客无法通过首页、搜索 API、公开 API 获取私密书签内容。

## 6. AI 配置

如果启用 AI 助理或 AI 推荐功能，确认：

- AI 开关已启用。
- API Key 已配置。
- Base URL、模型名称、兼容 OpenAI 格式的接口配置正确。
- `/api/ai/chat`、分类推荐、标签推荐均能正常返回。
- 未配置 AI 时，本地规则回退仍可用。

## 7. API Token 和浏览器插件

如需第三方写入或浏览器插件：

- 后台创建 Bearer Token。
- Token 至少包含 `write` scope。
- 插件设置页 StarNav 地址正确。
- 插件设置页“测试连接”通过。
- Token 管理页「最后使用」能在插件成功保存后更新。

## 8. WebHook

如启用 WebHook：

- WebHook URL 必须是 HTTPS。
- 事件规则支持 `*`、`site.*`、`site.create` 等。
- 如配置 secret，接收端需要校验 `X-StarNav-Signature: sha256=...`。
- 后台 WebHook 测试发送成功。
- 写操作产生操作日志后会异步触发 WebHook，失败不会阻断主流程。

## 9. 定时任务

项目已内置 `scheduled()` 入口，用于：

- 定时健康检查。
- 定时备份。

默认仓库没有启用 `[triggers]`，避免 Cloudflare Cron Trigger 数量限制导致部署失败。

如需启用，可在 Cloudflare 后台配置 Cron Trigger，或在未超限账号中添加：

```toml
[triggers]
crons = ["0 3 * * *"]
```

可选变量：

- `HEALTH_CHECK_CRON_LIMIT`：每次定时健康检查最多检测多少个书签，默认 30。
- 备份默认保留最近 30 份。

## 10. 部署命令

执行：

```bash
npm run deploy
```

部署后建议检查：

- 首页可访问。
- `/api/discovery` 可访问。
- `/api/openapi.json` 可访问。
- 后台可登录。
- 后台书签列表、分类、标签、备份、操作日志页面正常。
- 前台搜索、AI 助理、提交新站弹窗正常。
- 插件如已安装，重新测试一次保存当前页面。

## 11. 回滚和备份

部署前建议：

- 后台手动创建一份备份。
- 如涉及数据库结构或导入恢复功能，先下载当前备份 JSON。
- 保留上一版 Worker 部署记录，必要时可在 Cloudflare 控制台回滚 Worker 版本。