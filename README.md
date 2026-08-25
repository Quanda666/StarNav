# 星漫旅站 StarNav

基于 Cloudflare Workers + D1 + KV 的书签导航。适合个人或小团队当首页导航、工具站或轻量书签库。

本项目由 [wangwangit/nav](https://github.com/wangwangit/nav) 迭代而来，已从单文件 Worker 拆成模块化结构。

## 界面预览

前台支持分类、搜索、标签、主题、多布局、AI 助理和访客提交。

![首页预览](https://img.110995.xyz/file/blog/34kEoYV9.png)

后台用 Cookie 会话登录，不在 URL 里带账号密码。

![登录预览](https://img.110995.xyz/file/blog/T0Im9zqj.png)

后台覆盖书签、分类、审核、系统设置、AI、备份、Token 和 WebHook。

![后台预览](https://img.110995.xyz/file/blog/DjI70oWp.png)

## 能做什么

- **前台**：分类导航、全站搜索、标签筛选、多布局、主题、热门/最近访问、访客提交、系统公告、私人书签、PWA。
- **后台**：书签增删改、批量操作、链接检测、提交审核、分类/标签、品牌与公告、AI 接口、导入导出、备份恢复。
- **接入**：公开只读 API、Bearer Token 写入、浏览器插件、WebHook。

细节不在这里展开，见 [文档索引](docs/README.md)。

## 快速部署

两条路：

- 不熟命令行：按 [网页版部署教程](docs/web-deployment-guide.md)
- 本地 / CI：按下面做，部署前可对照 [检查清单](docs/deployment-checklist.md)

```bash
npm install
npx wrangler d1 create book
npx wrangler d1 execute book --file=schema.sql --remote
npx wrangler kv namespace create NAV_AUTH
```

把生成的 D1 ID 和 KV namespace id 写进 `wrangler.toml`，再写入管理员账号：

```bash
npx wrangler kv key put admin_username admin --binding=NAV_AUTH --remote
npx wrangler kv key put admin_password your-password --binding=NAV_AUTH --remote
```

```bash
npm run quality
npx wrangler deploy
```

部署后先打开 `/admin` 登录，加一条书签，再访问前台。空库直接开首页可能打不开。

## 常用命令

```bash
npm run dev          # 本地开发
npm run check        # JS 语法检查
npm test             # 测试
npm run quality      # 语法 + 测试
npx wrangler deploy  # 发布
```

## 文档

| 文档 | 内容 |
| --- | --- |
| [文档索引](docs/README.md) | 全部文档入口 |
| [网页版部署](docs/web-deployment-guide.md) | Cloudflare 控制台全流程 |
| [部署检查清单](docs/deployment-checklist.md) | D1 / KV / 账号 / Cron / 备份 |
| [API](docs/api-guide.md) | 公开接口、Token、OpenAPI |
| [浏览器插件](docs/browser-extension-guide.md) | 一键收藏当前页 |
| [WebHook](docs/webhook-guide.md) | 写操作事件推送 |
| [备份与导入导出](docs/backup-restore-guide.md) | 合并/覆盖、定时备份、旧 config.json |

从旧单文件版本升级：先导出旧后台 `config.json`，部署本版并执行 `schema.sql`，再在后台导入。完整步骤见备份文档。

## 技术栈

Cloudflare Workers、D1、KV、Wrangler、原生 JavaScript。

## 许可证

沿用原项目许可证，见 [LICENSE](LICENSE)。
