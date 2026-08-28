# 星漫旅站 StarNav

基于 Cloudflare Workers + D1 + KV 的书签导航。适合个人或小团队当首页导航、工具站或轻量书签库。

本项目由 [wangwangit/nav](https://github.com/wangwangit/nav) 迭代而来，已从单文件 Worker 拆成模块化结构，并持续演进为带完整后台、AI 助理、开放 API、浏览器插件和 WebHook 的整套服务。

## 界面预览

前台支持分类、搜索、标签、多布局、主题皮肤、AI 助理、访客提交、系统公告和私人书签。

![前台首页预览](https://img.110995.xyz/file/blog/bHT48zsg.png)

管理员登录页采用左右分栏品牌区，移动端自动适配为居中卡片。

![管理员登录页预览](https://img.110995.xyz/file/blog/tjysHzVN.png)

后台使用 Cookie 会话登录，不在 URL 里带账号密码，覆盖书签、分类、标签、审核、AI、备份、Token、WebHook、操作日志等。

![后台管理预览](https://img.110995.xyz/file/blog/6szyVsnU.png)

## 能做什么

- **前台**
  - 分类树、标签筛选、全站搜索（支持 `tag:` / `cat:` / `url:` / `is:` 等语法）
  - 卡片 / 列表 / 分组 / 瀑布 / 概览等多布局，8 套主题皮肤（纸感、星空、极简、暗黑、玻璃、Dock、Notion、极光）
  - 主题色、卡片密度、背景、暗黑模式、移动端适配
  - 热门 / 最近访问、收藏、快捷键、AI 小助理、访客提交新站
  - 系统公告（通知 + 时间线双标签弹窗）、私人书签访问、PWA 离线与安装
- **后台**
  - 书签增删改查、批量操作、链接失效检测、提交审核
  - 分类管理（父子分类、图标、颜色）、标签管理与批量合并、AI 标签 / 分类推荐
  - AI 分析（无标签、疑似重复、搜索缺口、分类错误）、访问分析、提交分析
  - 系统设置（站点品牌、首页展示、私人书签、系统公告、时间线）
  - 导入导出（新增结构 / 旧版 config.json / HTML / CSV）、手动备份、定时备份、恢复
  - API Token、WebHook、操作日志
- **接入**
  - 公开只读 API、Bearer Token 写入、API Discovery、OpenAPI 描述
  - Manifest V3 浏览器插件（一键收藏当前页、查重、AI 推荐）
  - WebHook 事件推送、WebDAV 备份
- **多空间（预留）**
  - 数据库 `spaces` 表、空间服务与 `GET /api/spaces` 读取接口已实现
  - 空间增删改接口当前处于稳定化冻结状态（返回 409），前台空间切换与后台空间管理界面暂未开放

细节不在这里展开，见 [文档索引](docs/README.md)。

## 🚀 快速部署

### 一键部署（推荐）

点击下方按钮，Cloudflare 会自动创建并绑定 D1、KV，部署 Worker，无需手动建库、建表或写入管理员到 KV。部署完成后访问 `你的域名/admin`，首次进入会自动引导你设置管理员账号。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Quanda666/StarNav)

> **推荐流程**：先把本项目 Fork 到你自己的 GitHub 账号，再到 Cloudflare 的 Workers 里「连接 GitHub」导入你 Fork 后的仓库进行部署（**不建议直接点上方按钮**：按钮流程会额外创建一个名为 `nav` 的可删除 KV，而 fork+导入方式不会）。这样后续本项目有更新时，你可以用 GitHub 的 **Sync fork** 把上游更新同步到你的仓库，已连接的 Worker 会随之自动更新。
>
> 部署完成后：数据库表会在 Worker 首次请求时由 `ensureSchema` 自动创建，管理员账号在 `/admin` 首次访问时自助设置——全程零命令行。

### 手动部署

适合需要本地调试、固定到已有资源，或不想用一键流程的场景。**全新手动部署**只需「安装 → 检查 → 部署 → /admin 设管理员」四步；下表里的「创建 D1/KV」「初始化数据库」「写管理员到 KV」对全新部署均已不再需要（由 auto-provision + `ensureSchema` + `/admin` 自助设置自动完成），只在「想固定到你自己已有的资源」时才用。

- **网页版全流程**：不熟悉命令行的用户见 [Cloudflare 网页版全流程部署教程](docs/web-deployment-guide.md)。
- **Wrangler 部署**：按下方步骤执行。

#### 1. 安装依赖

```bash
npm install
```

#### 2.（可选）固定到你已有的 D1 / KV

全新部署可跳过本步——`npx wrangler deploy` 会按 `wrangler.toml` 自动创建并绑定资源。仅当你想**复用自己已有的** D1 / KV 时，先创建好资源，再把 id 填进 `wrangler.toml`（取消对应注释行）：

```bash
npx wrangler d1 create book             # 取返回的 database_id 填到 wrangler.toml
npx wrangler kv namespace create NAV_AUTH # 取返回的 id 填到 wrangler.toml
```

```toml
[[d1_databases]]
binding = "NAV_DB"
database_name = "book"
database_id = "你的-d1-id"   # 取消注释并填写

[[kv_namespaces]]
binding = "NAV_AUTH"
id = "你的-kv-id"            # 取消注释并填写
```

> 数据库表无需手动初始化：Worker 首次请求时 `ensureSchema` 会自动建表（幂等，见 `src/services/migrationService.js`）。管理员账号也无需手动写入 KV——部署后访问 `/admin` 首次会自助设置。

#### 3. 本地检查

```bash
npm run quality
```

部署前建议同时查看 [docs/deployment-checklist.md](docs/deployment-checklist.md)，逐项确认 D1、KV、管理员账号、API Token、WebHook、Cron Trigger 和备份策略。

#### 4. 部署

```bash
npx wrangler deploy
```

部署完成后：

- 访问 `https://你的域名/admin`，首次进入会引导你设置管理员账号（无需命令行写 KV）。
- 设置好管理员后，在后台添加一个书签，再访问前台（前台为空时首页会显示空状态，属正常现象）。

## 常用命令

```bash
npm run dev          # 本地开发（构建 CSS + wrangler dev）
npm run build:css    # 构建首页 CSS 产物
npm run check        # JS 语法检查
npm test             # 测试
npm run quality      # 语法检查 + 测试
npm run deploy       # 构建 CSS + 发布
npm run db:init      # 初始化 D1 表结构
npm run db:backup    # 导出 D1 到 backup.sql
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

从旧单文件版本升级：先导出旧后台 `config.json`，部署本版并初始化数据库，再在后台导入。完整步骤见备份文档。

## 技术栈

Cloudflare Workers、D1、KV、Wrangler、原生 JavaScript、Tailwind CSS。

## 许可证

沿用原项目许可证，见 [LICENSE](LICENSE)。
