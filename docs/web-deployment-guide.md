# Cloudflare 网页版全流程部署教程

本文面向不熟悉命令行和 Wrangler 的用户，目标是尽量通过网页完成 StarNav 的部署与后续更新。

本教程采用：

- GitHub 网页端管理代码
- Cloudflare Dashboard 创建 D1 数据库
- Cloudflare Dashboard 创建 KV 命名空间
- Cloudflare Dashboard 导入 GitHub 仓库并部署 Worker
- Cloudflare Dashboard 配置 D1 / KV 绑定
- Cloudflare Dashboard 配置自定义域名和 Cron Trigger

> 说明：StarNav 是模块化 Cloudflare Workers 项目，不适合直接把代码复制到 Worker 在线编辑器里手动粘贴部署。  
> 真正可维护的“全流程网页部署”推荐使用 **Cloudflare Dashboard + GitHub 仓库连接部署**，这样无需在本地运行 Wrangler，也能保留多文件项目结构和后续自动更新能力。

---

## 1. 部署前准备

你需要准备：

- 一个 Cloudflare 账号。
- 一个 GitHub 账号。
- 一个 GitHub 仓库，例如：`Quanda666/StarNav`。
- 一个已经托管到 Cloudflare 的域名，可选但推荐。
- 本项目完整代码已推送到 GitHub 仓库的 `main` 分支。

推荐仓库保持公开或私有均可。私有仓库需要在 Cloudflare 连接 GitHub 时授权访问。

---

## 2. 确认仓库文件

进入 GitHub 仓库页面，确认至少存在以下文件和目录：

```text
src/index.js
src/handlers/
src/services/
src/pages/
src/lib/
schema.sql
wrangler.toml
package.json
README.md
```

其中：

- `src/index.js` 是 Worker 入口。
- `schema.sql` 用于初始化 D1 数据库。
- `wrangler.toml` 用于声明 Worker 名称、入口、D1 绑定和 KV 绑定。
- `package.json` 用于安装依赖和执行构建 / 部署流程。

---

## 3. 创建 D1 数据库

进入 Cloudflare Dashboard：

1. 打开 **Workers & Pages**。
2. 进入 **D1 SQL Database**。
3. 点击 **Create database**。
4. 数据库名称建议填写：

```text
book
```

5. 创建完成后，复制数据库 ID。

然后进入 GitHub 仓库，打开 `wrangler.toml`，点击编辑按钮，把 D1 配置改成你的数据库信息：

```toml
[[d1_databases]]
binding = "NAV_DB"
database_name = "book"
database_id = "这里填写你的 D1 database_id"
```

说明：

- `binding = "NAV_DB"` 是代码里使用的绑定名，建议不要修改。
- `database_name = "book"` 是 D1 数据库名称，如果你创建时用了其他名称，这里也要对应修改。
- `database_id` 必须替换成 Cloudflare 创建 D1 后显示的真实 ID。

编辑完成后，在 GitHub 网页端提交到 `main` 分支。

---

## 4. 初始化 D1 表结构

仍然在 Cloudflare Dashboard 操作：

1. 进入刚创建的 D1 数据库。
2. 打开 **Console** 或 **Query** / SQL 执行页面。
3. 回到 GitHub 仓库，打开项目根目录的 `schema.sql`。
4. 复制 SQL 内容。
5. 粘贴到 D1 Console 的 SQL 编辑框。
6. 点击执行。

> 如果点击执行后提示 `The request is malformed: Requests without any query are not supported.`，通常表示 D1 Console 没有收到任何 SQL 查询。
> 这一般不是 `schema.sql` 语法错误，而是网页控制台没有把内容提交进去。请确认 SQL 已经粘贴到真正的 SQL 编辑框中，而不是搜索框、表格页、空白面板或 Console 外部区域。

### 推荐：每个表单独执行一次

Cloudflare D1 网页 Console 有时对一次性粘贴多条 SQL 不够稳定。如果整份 `schema.sql` 或分段 SQL 都无法执行，推荐按下面顺序**每次只复制一个 SQL 代码块并执行一次**。

执行方式：

1. 复制一个代码块。
2. 粘贴到 D1 Console 的 SQL 编辑框。
3. 点击执行。
4. 等页面提示成功后，清空编辑框。
5. 再复制下一个代码块继续执行。

#### 1. 创建 `sites` 表

```sql
CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  logo TEXT,
  desc TEXT,
  catelog TEXT NOT NULL,
  category_id INTEGER,
  visibility TEXT NOT NULL DEFAULT 'public',
  sort_order INTEGER NOT NULL DEFAULT 9999,
  hits INTEGER DEFAULT 0,
  last_visit_time TIMESTAMP,
  last_checked_at TIMESTAMP,
  last_status_code INTEGER,
  last_error TEXT,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. 创建 `pending_sites` 表

```sql
CREATE TABLE IF NOT EXISTS pending_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  logo TEXT,
  desc TEXT,
  catelog TEXT NOT NULL,
  tags TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  reviewed_at TIMESTAMP,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. 创建 `category_orders` 表

```sql
CREATE TABLE IF NOT EXISTS category_orders (
  catelog TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL DEFAULT 9999
);
```

#### 4. 创建 `categories` 表

```sql
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  parent_id INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 9999,
  icon TEXT,
  color TEXT,
  description TEXT,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

#### 5. 创建 `tags` 表

```sql
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. 创建 `site_tags` 表

```sql
CREATE TABLE IF NOT EXISTS site_tags (
  site_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY(site_id, tag_id),
  FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

#### 7. 创建 `category_metadata` 表

```sql
CREATE TABLE IF NOT EXISTS category_metadata (
  catelog TEXT PRIMARY KEY,
  icon TEXT,
  description TEXT
);
```

#### 8. 创建 `settings` 表

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 9. 创建 `search_terms` 表

```sql
CREATE TABLE IF NOT EXISTS search_terms (
  keyword TEXT PRIMARY KEY,
  total_searches INTEGER NOT NULL DEFAULT 0,
  total_results INTEGER NOT NULL DEFAULT 0,
  last_result_count INTEGER NOT NULL DEFAULT 0,
  zero_result_count INTEGER NOT NULL DEFAULT 0,
  first_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 10. 创建 `operation_logs` 表

```sql
CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  target TEXT,
  target_id TEXT,
  summary TEXT,
  detail TEXT,
  ip TEXT,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 索引也建议单独执行

表创建完成后，再按下面顺序**每次只执行一个索引语句**。

#### 11. 创建分类父级索引

```sql
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
```

#### 12. 创建分类排序索引

```sql
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order, name);
```

#### 13. 创建书签分类索引

```sql
CREATE INDEX IF NOT EXISTS idx_sites_catelog ON sites(catelog);
```

#### 14. 创建书签排序索引

```sql
CREATE INDEX IF NOT EXISTS idx_sites_sort ON sites(catelog, sort_order, create_time);
```

#### 15. 创建标签名称索引

```sql
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
```

#### 16. 创建书签标签关联索引

```sql
CREATE INDEX IF NOT EXISTS idx_site_tags_tag ON site_tags(tag_id, site_id);
```

#### 17. 创建搜索热度索引

```sql
CREATE INDEX IF NOT EXISTS idx_search_terms_total ON search_terms(total_searches DESC, last_searched_at DESC);
```

#### 18. 创建无结果搜索索引

```sql
CREATE INDEX IF NOT EXISTS idx_search_terms_zero ON search_terms(zero_result_count DESC, last_searched_at DESC);
```

#### 19. 创建操作日志时间索引

```sql
CREATE INDEX IF NOT EXISTS idx_operation_logs_create_time ON operation_logs(create_time DESC, id DESC);
```

#### 20. 创建操作日志动作索引

```sql
CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action, create_time DESC);
```

每执行一个代码块后，如果页面提示成功，再继续执行下一个代码块。

执行成功后，D1 中会创建项目所需的数据表和索引。

核心表包括：

- `sites`
- `pending_sites`
- `categories`
- `tags`
- `site_tags`
- `settings`
- `search_terms`
- `operation_logs`

如果提示某些表已经存在，通常是重复执行导致的，因为项目使用了 `CREATE TABLE IF NOT EXISTS`，一般可以忽略。

---

## 5. 创建 KV 命名空间

进入 Cloudflare Dashboard：

1. 打开 **Workers & Pages**。
2. 进入 **KV**。
3. 点击 **Create namespace**。
4. 命名为：

```text
NAV_AUTH
```

5. 创建完成后，复制 namespace id。

然后进入 GitHub 仓库，编辑 `wrangler.toml` 中的 KV 配置：

```toml
[[kv_namespaces]]
binding = "NAV_AUTH"
id = "这里填写你的 KV namespace id"
```

说明：

- `binding = "NAV_AUTH"` 是代码里使用的绑定名，建议不要修改。
- `id` 必须替换成 Cloudflare KV 页面显示的真实 namespace id。

编辑完成后，在 GitHub 网页端提交到 `main` 分支。

---

## 6. 设置管理员账号密码

进入 Cloudflare Dashboard：

1. 打开 **Workers & Pages**。
2. 进入 **KV**。
3. 选择刚创建的 `NAV_AUTH` 命名空间。
4. 新增两个键值。

| Key | Value |
|---|---|
| `admin_username` | 你的管理员用户名 |
| `admin_password` | 你的管理员密码 |

示例：

| Key | Value |
|---|---|
| `admin_username` | `admin` |
| `admin_password` | `your-password` |

首次登录后台成功后，系统会自动把旧版明文密码升级为 PBKDF2 哈希存储。

注意：

- 不要把真实管理员密码写入 GitHub 仓库。
- 管理员账号密码只应该存放在 Cloudflare KV 里。

---

## 7. 确认 wrangler.toml

GitHub 仓库中的 `wrangler.toml` 最终应类似：

```toml
name = "nav"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "NAV_DB"
database_name = "book"
database_id = "你的 D1 database_id"

[[kv_namespaces]]
binding = "NAV_AUTH"
id = "你的 KV namespace id"
```

其中：

- `name` 是 Worker 名称，可以改成 `starnav`、`nav` 等。
- `main` 必须保持为 `src/index.js`。
- `NAV_DB` 和 `NAV_AUTH` 绑定名必须和代码一致。
- `database_id` 和 `id` 必须是你自己 Cloudflare 账号里的真实资源 ID。

---

## 8. 通过 Cloudflare 网页连接 GitHub 部署

进入 Cloudflare Dashboard：

1. 打开 **Workers & Pages**。
2. 点击 **Create application**。
3. 选择 **Workers**。
4. 选择 **Import a repository** 或 **Connect to Git**。
5. 授权 Cloudflare 访问你的 GitHub。
6. 选择仓库：

```text
Quanda666/StarNav
```

7. 选择分支：

```text
main
```

8. 项目名称可以填写：

```text
starnav
```

或：

```text
nav
```

9. 构建配置按 Cloudflare 页面提示填写。

如果页面提供构建命令 / 部署命令，可按以下方式填写：

| 项目 | 推荐值 |
|---|---|
| Install command | `npm install` |
| Build command | 留空或 `npm run check` |
| Deploy command | `npx wrangler deploy` |

如果 Cloudflare 的 Workers Git 集成页面会自动识别 `wrangler.toml`，则保持默认即可。

> 不同 Cloudflare 账号和新版 Dashboard 的界面可能略有差异。核心目标是：让 Cloudflare 从 GitHub 拉取仓库，并按 `wrangler.toml` 中的 `main = "src/index.js"` 部署 Worker。

---

## 9. 在网页端确认 D1 / KV 绑定

部署完成后，进入刚创建的 Worker：

1. 打开 **Workers & Pages**。
2. 选择你的 Worker。
3. 进入 **Settings**。
4. 找到 **Bindings** 或 **Variables and Secrets**。
5. 确认存在以下绑定：

| 类型 | 绑定名 | 绑定资源 |
|---|---|---|
| D1 database | `NAV_DB` | `book` |
| KV namespace | `NAV_AUTH` | `NAV_AUTH` |

如果绑定没有自动出现，可以在网页端手动添加：

### 添加 D1 绑定

1. 点击添加绑定。
2. 类型选择 **D1 database**。
3. Variable name 填写：

```text
NAV_DB
```

4. 选择前面创建的 D1 数据库 `book`。
5. 保存。

### 添加 KV 绑定

1. 点击添加绑定。
2. 类型选择 **KV namespace**。
3. Variable name 填写：

```text
NAV_AUTH
```

4. 选择前面创建的 KV 命名空间 `NAV_AUTH`。
5. 保存。

保存后重新部署一次，确保绑定生效。

---

## 10. 绑定自定义域名

进入 Worker 详情页：

1. 打开 **Settings**。
2. 找到 **Triggers** 或 **Custom Domains**。
3. 点击添加自定义域名。
4. 输入你的域名，例如：

```text
nav.example.com
```

5. 按页面提示确认。
6. 等待 Cloudflare 自动配置证书和路由。

如果你没有自定义域名，也可以先使用 Cloudflare 提供的 `workers.dev` 地址访问。

---

## 11. 配置 Cron Trigger，可选

项目内置定时入口，可用于健康巡检和自动备份。

如果要通过网页配置：

1. 进入 Worker 详情页。
2. 打开 **Settings**。
3. 找到 **Triggers**。
4. 添加 **Cron Trigger**。
5. 示例表达式：

```text
0 3 * * *
```

含义：每天 UTC 03:00 执行一次。

注意：

- Cloudflare 免费或不同套餐的 Cron Trigger 配额可能不同。
- 如果账号没有配额，可以不配置 Cron，不影响普通访问和后台管理。
- 手动备份功能仍可在后台使用。

---

## 12. 首次访问

部署完成后访问：

- 前台：`https://你的域名/`
- 后台：`https://你的域名/admin`

建议首次操作流程：

1. 先访问后台 `/admin`。
2. 使用 KV 中设置的管理员账号密码登录。
3. 新增至少一个书签。
4. 返回前台 `/` 查看首页。
5. 进入后台继续配置：
   - 系统设置
   - 网站图标
   - 系统公告
   - AI 助理
   - 私人书签访问密码
   - API Token
   - WebHook
   - 备份策略

如果前台一开始没有内容，请先在后台添加书签。

---

## 13. 后续更新

如果你使用 Cloudflare GitHub 连接部署，后续更新可以全程网页完成：

1. 在 GitHub 网页端编辑文件，或上传新版本代码。
2. 提交到 `main` 分支。
3. Cloudflare 会检测到 GitHub 更新并自动重新部署。
4. 部署完成后访问站点确认。

如果 Cloudflare 没有自动部署：

1. 进入 Worker 详情页。
2. 打开 **Deployments**。
3. 点击重新部署最新版本。

如果新版本包含数据库结构变化：

1. 打开 GitHub 中的 `schema.sql`。
2. 复制新增或完整 SQL。
3. 到 Cloudflare D1 Console 执行。
4. 再重新部署 Worker。

项目也内置自动迁移逻辑，请求进入时会尽量补齐缺失字段；但重大升级前仍建议先手动备份。

---

## 14. 备份建议

在进行升级、导入或覆盖恢复前，建议：

1. 登录后台。
2. 进入备份 / 恢复相关入口。
3. 创建一份手动备份。
4. 再进行升级或导入操作。

项目支持：

- 手动备份
- 定时备份
- 恢复前快照
- 最近 30 份滚动保留
- 覆盖恢复
- 合并恢复

详见：

```text
docs/backup-restore-guide.md
```

---

## 15. 常见问题

### 1. Cloudflare 网页编辑器可以直接粘贴代码部署吗？

不推荐。

StarNav 是模块化项目，包含多文件 `import`、D1、KV、PWA 路由、后台页面、服务层和插件目录。直接复制到网页编辑器会破坏可维护性。

推荐使用：

```text
Cloudflare Dashboard + GitHub 仓库连接部署
```

这仍然是网页部署，不需要你在本地执行 Wrangler。

### 2. 前台打开是空的

请先访问后台 `/admin` 添加至少一个书签。

### 3. 后台登录失败

检查 KV `NAV_AUTH` 中是否存在：

- `admin_username`
- `admin_password`

并确认 Worker 的 KV 绑定名是：

```text
NAV_AUTH
```

### 4. 页面提示 D1 或 KV 未绑定

进入 Worker 设置页，检查绑定：

| 类型 | 绑定名 |
|---|---|
| D1 | `NAV_DB` |
| KV | `NAV_AUTH` |

绑定名必须完全一致，大小写也必须一致。

### 5. API 写入提示 401

第三方客户端需要带 Bearer Token：

```http
Authorization: Bearer nav_xxx
```

并确认 Token 至少有 `write` scope。

### 6. WebHook 不触发

请确认：

- WebHook 已启用。
- WebHook URL 是 HTTPS。
- 事件匹配规则正确，例如 `site.*` 或 `*`。
- 写操作成功写入操作日志。
- 目标服务器可以被 Cloudflare 访问。

### 7. Cron 没有触发

检查：

- Worker 是否已经添加 Cron Trigger。
- Cron 表达式是否正确。
- Cloudflare 账号是否有 Cron Trigger 配额。
- Worker 日志里是否出现 scheduled 事件。

### 8. GitHub 更新后没有自动部署

可以到 Cloudflare Worker 的 **Deployments** 页面手动重新部署。

也可以检查：

- Cloudflare 是否仍有 GitHub 授权。
- 连接的仓库是否正确。
- 连接的分支是否为 `main`。
- 最新提交是否已经推送到 GitHub。

---

## 16. 什么时候还需要 Wrangler？

本教程不要求你在本地使用 Wrangler。

但如果你后续要做深度开发，Wrangler 仍然有价值：

- 本地开发调试。
- 本地运行质量检查。
- 快速部署测试分支。
- 查看实时日志。
- 执行数据库命令。
- 排查复杂部署问题。

普通用户只想部署和使用，可以按本文全程在网页端完成。