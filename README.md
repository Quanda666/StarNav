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

Fork 本仓库后点击下方按钮，Cloudflare 会自动创建并绑定 D1、KV，部署 Worker，无需手动建库、建表或写入管理员到 KV。部署完成后访问 `你的域名/admin`，首次进入会自动引导你设置管理员账号。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Quanda666/StarNav)

> Fork 本仓库后，请把按钮 URL 里的 `Quanda666/StarNav` 换成你自己的仓库地址再点击。数据库表会在 Worker 首次请求时由 `ensureSchema` 自动创建，管理员账号在 `/admin` 首次访问时自助设置——全程零命令行。

### 手动部署

你也可以选择两种手动部署路径（适合需要固定到自有资源或本地调试的场景；全新部署时下面的 D1/KV/管理员步骤均可跳过，由一键流程自动完成）：

- **网页版全流程部署**：适合不熟悉命令行和 Wrangler 的用户，见 [Cloudflare 网页版全流程部署教程](docs/web-deployment-guide.md)。
- **Wrangler 部署**：适合开发者和需要本地调试、自动化发布的场景，按下方步骤执行。

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 D1 数据库

```bash
npx wrangler d1 create book
```

将生成的数据库 ID 写入 `wrangler.toml` 中的 D1 绑定。

### 3. 初始化数据库

```bash
npx wrangler d1 execute book --file=schema.sql --remote
```

### 4. 创建 KV 命名空间

```bash
npx wrangler kv namespace create NAV_AUTH
```

将生成的 namespace id 写入 `wrangler.toml` 中的 KV 绑定。

### 5. 设置管理员账号密码

在 Cloudflare KV `NAV_AUTH` 中添加：

```text
admin_username = 你的管理员用户名
admin_password = 你的管理员密码
```

也可以用 Wrangler 写入：

```bash
npx wrangler kv key put admin_username admin --binding=NAV_AUTH --remote
npx wrangler kv key put admin_password your-password --binding=NAV_AUTH --remote
```

### 6. 本地检查

```bash
npm run quality
```

部署前建议同时查看 [docs/deployment-checklist.md](docs/deployment-checklist.md)，逐项确认 D1、KV、管理员账号、API Token、WebHook、Cron Trigger 和备份策略。

### 7. 部署

```bash
npx wrangler deploy
```

部署完成后先访问：

- 后台管理：`https://你的域名/admin`
- 然后登录管理员账户在后台添加一个书签，再访问前台
- 如果不然直接打开前台会打不开

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
