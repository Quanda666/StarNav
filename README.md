# 星漫旅站 - Cloudflare Workers 书签导航系统

> 基于 Cloudflare Workers + D1 + KV 的现代化个人/团队书签导航系统，支持前台多布局展示、后台管理、访客提交审核、系统公告、站点品牌配置、私人书签、AI 书签助理、提交分析、批量管理、旧数据迁移与 PWA。

本项目基于原始项目 [wangwangit/nav](https://github.com/wangwangit/nav) 持续迭代，已从早期单文件 Worker 改造为模块化架构。当前版本更适合作为可长期维护的个人导航站、团队工具导航站或轻量级书签管理系统。

## 🖼️ 界面预览

### 首页预览

前台首页支持分类导航、搜索、标签筛选、主题切换、多布局展示、AI 助理和访客提交入口。

![首页预览](https://img.110995.xyz/file/blog/34kEoYV9.png)

### 登录预览

后台通过管理员账号密码登录，使用 Cookie 会话，不在 URL 中暴露登录凭据。

![登录预览](https://img.110995.xyz/file/blog/T0Im9zqj.png)

### 后台预览

后台提供书签管理、分类管理、提交审核、系统设置、AI 配置、备份恢复、API Token 和 WebHook 等维护能力。

![后台预览](https://img.110995.xyz/file/blog/DjI70oWp.png)

## 目录

- [界面预览](#-界面预览)
- [核心特性](#-核心特性)
- [功能概览](#-功能概览)
- [项目结构](#-项目结构)
- [数据库结构](#-数据库结构)
- [文档索引](#-文档索引)
- [快速部署](#-快速部署)
- [系统设置](#-系统设置)
- [系统公告逻辑](#-系统公告逻辑)
- [管理员与权限](#-管理员与权限)
- [API 开放与第三方接入](#-api-开放与第三方接入)
- [浏览器插件](#-浏览器插件)
- [WebHook](#-webhook)
- [数据导入导出、备份与恢复](#-数据导入导出备份与恢复)
- [使用说明](#-使用说明)
- [常用命令](#-常用命令)
- [工程质量与部署检查](#-工程质量与部署检查)
- [升级说明](#-升级说明)
- [技术栈](#-技术栈)
- [更新日志](#-更新日志)
- [许可证](#-许可证)

## ✨ 核心特性

- 📚 **书签导航首页**：展示网站名称、链接、Logo、描述、分类、标签、访问次数。
- 🎨 **前台个性化界面**：支持主题颜色、深色模式、密度、背景风格、显示模式和首页布局切换。
- 🧩 **多布局展示**：支持卡片、列表、分组、瀑布流、概览面板等布局。
- 🔍 **全站搜索**：支持搜索书签名称、URL、描述、分类和标签，支持高级语法、中文 n-gram、首字母召回和可解释排序。
- 📂 **父子分类结构**：分类支持层级、排序、父分类设置和展开/收起。
- 🏷️ **标签系统**：书签可设置标签，前台支持标签筛选。
- 🔥 **热门与最近访问**：支持按访问次数、最近访问时间查看书签。
- 🔐 **私人书签**：固定私人书签分类，访客需要密码访问，管理员登录后可直接查看。
- 📝 **访客提交审核**：访客可提交新书签，管理员在后台审核通过后展示。
- ✅ **后台管理**：支持书签新增、编辑、删除、批量修改、批量删除、批量检测。
- 🧭 **前台管理员编辑**：管理员登录后可在前台直接编辑、删除、拖拽排序书签。
- ↕️ **拖拽排序**：前台管理员模式支持拖拽调整书签顺序并保存。
- 🧪 **链接健康检测**：后台支持单个或批量检测书签链接可用性。
- 📊 **提交分析**：后台提供提交趋势、热力图、分类占比、质量分析、异常波动等统计。
- 🤖 **AI 书签助理**：前台悬浮 AI 助理，优先检索本站书签，可接入 OpenAI 兼容接口。
- ⚙️ **系统设置**：后台可配置网站名称、副标题、图标、页脚、系统公告、AI 参数等。
- 📢 **系统公告弹窗**：支持 Markdown 内容、公告版本、按钮文字和“今日不再提示”。
- 🖼️ **图标自动获取**：新增书签时可自动获取网站 favicon，后台和前台均支持。
- 🔄 **前后台同步刷新**：后台数据变更后，已打开的前台页面可自动刷新。
- 📤 **导入导出**：支持新版结构导出、旧版兼容导出、HTML/CSV 导出和旧 config.json 导入。
- 💾 **备份恢复**：支持手动备份、定时备份、最近 30 份滚动保留、覆盖/合并恢复和恢复前快照。
- 🌐 **PWA 支持**：提供 manifest 和 service worker 路由，支持移动端添加到主屏幕、离线缓存和更新提示。
- 🔌 **开放 API**：公开只读 API、API 发现端点、OpenAPI 描述，并支持 Bearer Token 调用第三方写入接口。
- 🧩 **浏览器插件**：内置 Manifest V3 插件目录，可通过 Token 快速收藏当前网页到 StarNav。
- 🪝 **WebHook**：写操作可基于操作日志异步触发 WebHook，支持事件匹配和 HMAC 签名。
- 🧪 **工程质量基线**：内置语法检查、Node.js 测试和 GitHub Actions 质量检查工作流。
- 🌏 **国际化基础**：内置 i18n 工具，前台文本具备多语言扩展基础。
- 🧱 **模块化架构**：路由、页面、服务、工具库分层，便于维护和二次开发。

## 🧭 功能概览

### 前台首页

- 分类导航与父子分类展开/收起。
- 搜索框支持全站搜索。
- 布局切换：卡片、列表、分组、瀑布流、概览。
- 排序筛选：默认、热门、最近访问。
- 标签筛选：点击标签进入标签过滤结果。
- 主题面板：颜色、密度、背景、显示模式、布局。
- AI 助理悬浮面板。
- 返回顶部悬浮按钮。
- 访客提交书签入口。
- 系统公告弹窗。
- 私人书签解锁页。

### 后台管理

- 书签列表行内编辑。
- 书签新增、删除、批量修改、批量删除。
- Logo 行内预览和自动 favicon 获取。
- 链接健康检测。
- 待审核提交批准/拒绝。
- 提交分析仪表盘。
- 分类管理：新增、改名、父分类、排序、删除。
- 私人书签访问密码配置。
- 系统设置：网站品牌、图标、页脚、公告。
- AI 设置：接口地址、模型、API Key、系统提示词、模型列表获取、连接测试。
- 导入导出新版/旧版数据。
- 后台标签页式导航和移动端适配。

## 📁 项目结构

```text
.
├── src/
│   ├── index.js                         # Worker 入口与路由分发
│   ├── handlers/
│   │   ├── admin.js                     # 后台页面、登录、退出、静态资源路由
│   │   ├── api.js                       # 前后台 API 接口
│   │   ├── go.js                        # /go/:id 访问跳转与访问统计
│   │   └── pwa.js                       # PWA manifest、图标、service worker
│   ├── lib/
│   │   ├── auth.js                      # 管理员认证、Cookie 会话、KV 会话
│   │   ├── favicon.js                   # 网站图标获取
│   │   ├── i18n.js                      # 国际化文本解析
│   │   └── utils.js                     # HTML 响应、转义、URL 清洗等工具
│   ├── pages/
│   │   ├── home.js                      # 前台首页渲染与前端交互脚本
│   │   └── adminAssets.js               # 后台 HTML/CSS/JS 静态资源
│   └── services/
│       ├── aiService.js                 # AI 助理配置、检索与模型调用
│       ├── backupService.js             # 备份创建、恢复、下载与清理
│       ├── categoryService.js           # 分类增删改查、父子分类树
│       ├── migrationService.js          # 旧数据兼容导入迁移与自动补表
│       ├── operationLogService.js       # 操作日志写入与查询
│       ├── privateBookmarkService.js    # 私人书签访问控制
│       ├── settingsService.js           # 通用设置读写
│       ├── siteService.js               # 书签、待审核、搜索、排序服务
│       ├── systemSettingsService.js     # 网站品牌与公告系统设置
│       ├── tagService.js                # 标签解析、合并与 AI 推荐
│       └── webhookService.js            # WebHook 配置、签名与分发
├── extensions/
│   └── browser-bookmark/                # Manifest V3 浏览器收藏插件
├── scripts/
│   └── check-syntax.js                  # 项目 JS 语法检查脚本
├── tests/                               # Node.js 内置测试用例
├── docs/
│   ├── README.md                        # 文档索引
│   ├── api-guide.md                     # API 开放与第三方接入指南
│   ├── backup-restore-guide.md          # 备份、恢复与导入导出指南
│   ├── browser-extension-guide.md       # 浏览器插件使用指南
│   ├── deployment-checklist.md          # 部署检查清单
│   ├── web-deployment-guide.md          # Cloudflare 网页版全流程部署教程
│   └── webhook-guide.md                 # WebHook 使用指南
├── PROJECT_PLAN.md                      # 项目迭代规划与巡查记录
├── schema.sql                           # D1 数据库建表 SQL
├── wrangler.toml                        # Wrangler 配置
├── package.json                         # 项目依赖与脚本
└── README.md
```

## 🗄️ 数据库结构

推荐直接使用项目中的 `schema.sql` 初始化 D1 数据库。

核心表包括：

- `sites`：已发布书签，包含 URL、Logo、描述、分类、可见性、排序、访问次数、健康检测信息等。
- `pending_sites`：访客提交后等待审核的书签，支持待审核 / 已通过 / 已拒绝状态和拒绝原因。
- `categories`：分类表，支持父子分类、排序、图标、颜色和描述。
- `tags` / `site_tags`：标签表与书签标签关联表。
- `settings`：系统设置、AI 设置、私人书签等配置存储。
- `search_terms`：搜索词统计表，用于热门搜索和无结果关键词分析。
- `operation_logs`：操作日志表，用于后台审计和 WebHook 事件触发。
- `category_orders`：旧版分类排序兼容表。
- `category_metadata`：旧版分类元数据兼容表。

KV `NAV_AUTH` 主要保存：

- 管理员用户名、密码哈希和后台 Session。
- 私人书签访问 token。
- API Token 元数据与哈希。
- WebHook 配置。
- 备份快照与备份元数据。

初始化命令：

```bash
npx wrangler d1 execute book --file=schema.sql
```

如果使用 Cloudflare 控制台，也可以进入 D1 数据库控制台，复制 `schema.sql` 内容手动执行。

## 📚 文档索引

项目已将单独功能说明和使用教程拆分到 `docs/` 目录：

- [docs/README.md](docs/README.md)：文档总索引。
- [docs/web-deployment-guide.md](docs/web-deployment-guide.md)：Cloudflare 网页版全流程部署教程，适合不熟悉命令行和 Wrangler 的用户。
- [docs/deployment-checklist.md](docs/deployment-checklist.md)：部署检查清单。
- [docs/api-guide.md](docs/api-guide.md)：API 开放与第三方接入指南。
- [docs/browser-extension-guide.md](docs/browser-extension-guide.md)：浏览器插件使用指南。
- [docs/webhook-guide.md](docs/webhook-guide.md)：WebHook 使用指南。
- [docs/backup-restore-guide.md](docs/backup-restore-guide.md)：备份、恢复与导入导出指南。
- [PROJECT_PLAN.md](PROJECT_PLAN.md)：项目迭代规划与巡查记录，原 `tem.md` 已重命名为该文件。

## 🚀 快速部署

你可以选择两种部署路径：

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

## ⚙️ 系统设置

后台进入「系统设置」可配置：

- 网站名称
- 首页副标题
- 网站图标 URL
- 页脚补充文字
- 是否启用系统公告
- 公告标题
- 公告 Markdown 内容
- 公告版本
- 公告按钮文字
- 是否同一版本只显示一次的兼容配置

网站图标会同时影响：

- 前台页面 favicon
- 前台 Apple Touch Icon
- 后台页面 favicon
- 后台 Apple Touch Icon
- PWA 相关显示

图标 URL 支持：

- `/pwa-icon.svg`
- `https://example.com/icon.png`
- `example.com/icon.png`，会自动补全为 `https://example.com/icon.png`

## 📢 系统公告逻辑

当前系统公告逻辑如下：

- 公告启用且公告内容不为空时，前台会渲染公告弹窗。
- 弹窗默认服务端隐藏，页面加载后由浏览器判断是否显示，避免刷新时闪现。
- 点击「我知道了」：
  - 只关闭当前页面弹窗；
  - 不写入持久关闭状态；
  - 刷新页面后会再次弹出。
- 点击「今日不再提示」：
  - 写入浏览器 `localStorage`；
  - 当天再次刷新或重新打开网站不再弹出；
  - 第二天会重新弹出。
- 公告记录按公告版本区分，修改版本后会重新计算今日不再提示状态。

## 🔐 管理员与权限

- 后台登录使用 KV 中配置的管理员账号密码。
- 登录成功后使用 Cookie 会话，不在 URL 中暴露账号密码。
- 管理员登录后前台会进入管理员增强模式：
  - 支持前台直接编辑书签；
  - 支持前台删除书签；
  - 支持拖拽排序并保存；
  - 可直接查看私人书签。
- 普通访客访问私人书签分类时需要输入访问密码。
- 第三方客户端写入能力使用 Bearer Token，不依赖后台 Cookie。
- Token 管理仅允许后台管理员 Cookie 访问，避免 Token 自我创建或吊销。
- 系统设置、AI 配置、备份恢复、操作日志、WebHook 管理等敏感管理接口仅接受后台管理员 Cookie。

## 🔌 API 开放与第三方接入

项目内置公开 API、Token 鉴权、API 发现和 OpenAPI 描述，便于脚本、客户端、浏览器插件或自动化工具接入。完整说明见 [docs/api-guide.md](docs/api-guide.md)。

### 公开只读接口

无需登录即可访问，但会按权限过滤私密 / 隐藏书签：

- `GET /api/sites`：书签列表，支持分页、分类、标签、关键词、排序、健康状态筛选。
- `GET /api/categories`：平铺分类列表。
- `GET /api/categories/tree`：树形分类结构。
- `GET /api/tags`：标签列表与使用次数。
- `GET /api/search`：高级搜索，支持 `tag:`、`cat:` / `category:`、`url:`、`is:` 等语法。
- `GET /api/settings/public`：站点公开设置。
- `POST /api/ai/chat`：AI 书签助理。
- `GET /api/favicon?url=`：获取指定 URL 的 favicon。

### 条件开放接口

以下接口支持后台管理员 Cookie，部分接口也支持 Bearer Token 或公开提交开启状态：

- `POST /api/sites`：新增书签，支持 Bearer Token `write` scope。
- `PUT /api/sites/:id`：更新书签，支持 Bearer Token `write` scope。
- `DELETE /api/sites/:id`：删除书签，支持 Bearer Token `write` scope。
- `GET /api/sites/check-duplicate?url=&excludeId=`：检测重复 URL。
- `GET /api/site/preview?url=`：抓取标题、描述、favicon，并检测重复。
- `POST /api/submit/suggest-category`：根据名称、URL、描述推荐分类。
- `POST /api/submit/suggest-tags`：根据名称、URL、描述推荐标签。

### API 发现与 OpenAPI

- `GET /api`
- `GET /api/discovery`
- `GET /api/openapi.json`

发现端点会返回公开 / 条件公开端点清单、鉴权状态、权限边界和参数说明。`/api/openapi.json` 返回 OpenAPI 3.0.3 描述，可导入 Postman、Apifox 或用于生成客户端。

### Bearer Token

管理员登录后台后可在 Token 管理入口创建第三方 Token。Token 明文只在创建时显示一次，KV 中只保存哈希和脱敏元数据。

请求示例：

```bash
curl -X POST "https://你的域名/api/sites" \
  -H "Authorization: Bearer nav_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example",
    "url": "https://example.com",
    "catelog": "工具",
    "tags": ["示例", "工具"],
    "visibility": "public"
  }'
```

Token scope：

- `read`：预留读权限。
- `write`：允许调用第三方写入 / 维护类接口。
- `admin`：可覆盖普通 scope 校验，但仍不能管理系统敏感配置、WebHook 或 Token 自身。

## 🧩 浏览器插件

项目内置 Manifest V3 浏览器插件目录，完整使用教程见 [docs/browser-extension-guide.md](docs/browser-extension-guide.md)：

```text
extensions/browser-bookmark/
```

插件能力：

- 读取当前标签页标题和 URL。
- 配置 StarNav 地址、Bearer Token、默认分类和默认标签。
- 测试连接并刷新分类 / 标签候选缓存。
- 自动抓取网页标题、描述、favicon。
- 检测重复书签，必要时可强制保存。
- 调用 AI 推荐分类和标签。
- 使用 Bearer Token 写入书签，不依赖后台 Cookie。

开发者模式加载方式：

1. 打开 Chrome / Edge 扩展管理页。
2. 开启「开发者模式」。
3. 选择「加载已解压的扩展程序」。
4. 选择 `extensions/browser-bookmark/` 目录。
5. 在插件设置页填写 StarNav 地址和 Bearer Token。

更多说明见 `extensions/browser-bookmark/README.md`。

## 🪝 WebHook

WebHook 基于操作日志异步触发。当新增 / 修改 / 删除书签、分类、标签、备份、审核等写操作成功写入操作日志后，系统会按配置发送事件。完整说明见 [docs/webhook-guide.md](docs/webhook-guide.md)。

支持能力：

- WebHook 配置存储在 KV。
- 管理接口仅允许后台管理员 Cookie 访问。
- 支持启用 / 停用。
- 支持事件匹配：
  - `*`
  - 精确 action，例如 `site.create`
  - 分组通配，例如 `site.*`
- 仅允许 HTTPS URL。
- 支持可选 secret。
- 发送请求时附带 `X-StarNav-Signature: sha256=<hmac>`。
- 记录最后触发时间、最后状态码和最后错误。
- 支持测试发送。

管理接口：

- `GET /api/webhooks`
- `POST /api/webhooks`
- `PUT /api/webhooks/:id`
- `DELETE /api/webhooks/:id`
- `POST /api/webhooks/:id/test`

## 🔄 前后台同步刷新

后台会通过 `localStorage` 广播刷新事件，前台监听 `storage` 事件后自动刷新。

触发场景包括：

- 后台打开或退出。
- 新增、编辑、删除书签。
- 批量修改或批量删除。
- 批准或拒绝待审核书签。
- 分类新增、编辑、删除。
- 私人书签密码更新。
- 系统设置保存。
- AI 设置保存。
- 数据导入成功。

该方案适合同一浏览器不同标签页打开后台和前台的使用场景，不需要 WebSocket 或 SSE。

## 📤 数据导入导出、备份与恢复

完整说明见 [docs/backup-restore-guide.md](docs/backup-restore-guide.md)。

后台提供：

- **导入预览**：正式导入前统计总数、有效数量、无效数量、重复数量、缺失分类和将自动创建的分类。
- **合并导入**：导入 JSON 配置并按归一化 URL 跳过重复书签。
- **覆盖恢复**：清空当前书签、分类和标签后按导入文件重建，执行前会二次确认。
- **导出新版**：导出当前新版结构，包含书签、分类和标签。
- **导出旧版**：导出兼容旧项目的 `config.json`。
- **导出 HTML**：导出 Netscape Bookmark HTML，可导入浏览器书签。
- **导出 CSV**：导出表格格式，便于人工审查或二次处理。
- **手动备份**：在后台立即创建一份 KV 备份快照。
- **定时备份**：Worker `scheduled` 入口支持定时创建备份。
- **备份恢复**：支持覆盖恢复和合并恢复，恢复前会自动创建 `pre-restore` 快照。
- **备份清理**：默认保留最近 30 份备份，超出后自动清理最旧记录。

定时备份说明：

- 代码已内置 `scheduled` 入口，可在 Cron 触发时执行健康巡检和自动备份。
- 默认仓库未启用 `wrangler.toml` 的 `[triggers]`，避免 Cloudflare Cron Trigger 数量限制导致部署失败。
- 如账号配额允许，可在 `wrangler.toml` 中添加：

```toml
[triggers]
crons = ["0 3 * * *"]
```

- 也可以在 Cloudflare 控制台手动配置 Cron Trigger。

兼容策略：

- 原项目导出的 `config.json` 可以重新导入。
- 导入时会自动兼容旧字段。
- 分类会根据旧数据中的 `catelog` 自动补齐到 `categories` 表。
- 旧数据没有父子分类时，会作为一级分类导入。
- 旧数据没有排序值时，会使用默认排序值。
- 标签、可见性、排序等新字段会尽量兼容默认值。

迁移建议：

1. 在旧项目后台导出 `config.json`。
2. 部署当前版本并初始化数据库。
3. 配置 D1 和 KV。
4. 进入 `/admin` 后台。
5. 点击导入并选择旧版 `config.json`。
6. 导入成功后检查首页、分类、标签和后台数据。
7. 如需层级结构，在分类管理中设置父分类和排序。

## 🧭 使用说明

### 前台访客

- 浏览全部书签或按分类查看。
- 使用搜索框进行全站搜索。
- 点击标签进入标签筛选。
- 切换热门或最近访问排序。
- 通过「添加书签」提交站点，等待管理员审核。
- 使用主题面板调整前台显示偏好。
- 通过 AI 助理询问书签位置或查找相关工具。
- 访问私人书签时输入访问密码。

### 前台管理员

1. 登录 `/admin`。
2. 回到前台 `/`。
3. 可直接编辑、删除书签。
4. 可拖拽书签卡片调整排序。
5. 点击「保存拖拽排序」写入数据库。
6. 管理员可直接访问私人书签分类。

### 后台管理员

后台主要模块：

- **书签列表**：新增、行内编辑、删除、批量操作、健康检测。
- **待审核列表**：批准或拒绝访客提交。
- **提交分析**：查看提交趋势、热力图、分类占比、质量分析。
- **分类管理**：新增分类、改名、父级、排序、删除。
- **私人书签**：设置访客访问密码。
- **系统设置**：配置品牌、图标、页脚、公告。
- **AI 助理**：配置 OpenAI 兼容接口、模型、API Key 和提示词。

## 🛠️ 常用命令

安装依赖：

```bash
npm install
```

语法检查：

```bash
npm run check
```

运行测试：

```bash
npm test
```

完整质量检查：

```bash
npm run quality
```

本地开发：

```bash
npm run dev
```

部署预检查：

```bash
npx wrangler deploy --dry-run
```

部署：

```bash
npx wrangler deploy
```

执行数据库 SQL：

```bash
npx wrangler d1 execute book --file=schema.sql
```

## 🧪 工程质量与部署检查

项目已内置轻量工程质量基线：

- `npm run check`：递归执行 `node --check`，检查项目内 JavaScript 语法。
- `npm test`：运行 Node.js 内置测试。
- `npm run quality`：依次执行语法检查和测试。
- `.github/workflows/quality.yml`：在 push / pull_request 时执行 CI 质量检查。
- `docs/deployment-checklist.md`：部署检查清单，覆盖 D1、KV、管理员配置、AI、API Token、WebHook、Cron Trigger、备份和回滚。

建议每次部署前执行：

```bash
npm run quality
npx wrangler deploy --dry-run
```

如需启用自动健康巡检和定时备份，请确认 Cloudflare 账号 Cron Trigger 配额，再手动配置 `[triggers]` 或在 Cloudflare 控制台添加 Cron。

## ⬆️ 升级说明

### 从旧单文件版本升级

旧版本通常只有一个 `worker.js`、`work_v1.js` 或 `work_v2.js`。当前版本已改为模块化结构，建议：

1. 备份旧项目数据。
2. 在旧后台导出 `config.json`。
3. 部署当前模块化版本。
4. 执行 `schema.sql` 初始化或补齐数据库结构。
5. 配置 D1 和 KV 绑定。
6. 配置 KV 管理员账号密码。
7. 进入后台导入旧 `config.json`。
8. 检查书签、分类、标签、私人书签、系统设置是否正常。

### 已有 D1 数据库升级

如果数据库缺少新表或新字段，请执行 `schema.sql` 中对应的 `CREATE TABLE IF NOT EXISTS`、索引和兼容字段语句。

尤其需要确认存在：

- `sites`
- `pending_sites`
- `categories`
- `settings`

如果功能异常，优先检查 D1 表结构是否与 `schema.sql` 一致。

## 🔧 技术栈

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- 原生 JavaScript
- TailwindCSS CDN
- HTML/CSS 模板字符串渲染

## 📝 更新日志

### 当前版本

- 新增系统设置服务，支持网站名称、副标题、图标、页脚和系统公告配置。
- 新增系统公告 Markdown 弹窗。
- 新增「今日不再提示」公告按钮，并修复刷新闪现问题。
- 调整默认「我知道了」按钮逻辑：仅关闭当前弹窗，刷新后仍会显示。
- 后台 favicon 与前台系统图标保持一致。
- 修复后台生成脚本中的正则转义问题，避免后台标签点击无响应。
- 新增 AI 书签助理与 OpenAI 兼容接口配置。
- 新增私人书签访问控制。
- 新增前台多布局、主题面板、热门/最近访问、标签筛选。
- 新增后台提交分析、批量操作、链接健康检测。
- 增强 favicon 自动获取和 Logo 预览。
- 保留旧版数据导入导出兼容能力。

### 模块化重构版本

- 将单文件 Worker 拆分为 `src/handlers`、`src/pages`、`src/services`、`src/lib`。
- 新增父子分类结构。
- 后台支持分类改名、父分类设置、排序。
- 前台分类支持层级缩进和展开/收起。
- 管理员登录后前台支持直接拖拽排序。
- 拖拽排序时支持页面边缘自动滚动。
- 书签描述支持悬停查看完整内容。
- 后台数据变更后，前台页面可跨标签页自动刷新。
- 保留访客提交和后台审核功能。
- 保留旧版 `config.json` 导入兼容能力。

## 📄 许可证

本项目沿用原项目许可证。详情见 [LICENSE](LICENSE)。
