# Cloudflare 网页版手把手部署教程

本文面向不熟悉 Wrangler 命令行的用户，尽量使用 Cloudflare 网页控制台完成准备工作。  
推荐部署方式仍然是 Wrangler，因为项目包含 D1、KV、Worker、自动迁移和后续升级，命令行方式更稳定、可复现。

## 1. 准备账号和仓库

你需要准备：

- 一个 Cloudflare 账号。
- 一个可用域名，最好已经托管到 Cloudflare。
- 一份本项目代码，可以 Fork 到自己的 GitHub 仓库，也可以下载后上传到自己的仓库。
- 本地安装 Node.js，用于最终执行部署命令。

推荐流程：

1. Fork 或复制本项目到自己的 GitHub。
2. 在 Cloudflare 控制台创建 D1 数据库。
3. 在 Cloudflare 控制台创建 KV 命名空间。
4. 修改 `wrangler.toml`。
5. 使用 Wrangler 部署 Worker。
6. 在 Cloudflare 控制台绑定自定义域名。
7. 访问后台初始化内容。

## 2. 创建 D1 数据库

进入 Cloudflare 控制台：

1. 打开 **Workers & Pages**。
2. 进入 **D1 SQL Database**。
3. 点击 **Create database**。
4. 数据库名称建议填写：`book`。
5. 创建完成后，复制数据库 ID。

然后打开项目中的 `wrangler.toml`，确认 D1 绑定类似：

```toml
[[d1_databases]]
binding = "NAV_DB"
database_name = "book"
database_id = "这里填写你的 D1 database_id"
```

其中 `binding = "NAV_DB"` 是代码中使用的绑定名，建议不要修改；`database_name = "book"` 是 Cloudflare D1 数据库名称，可按你的实际名称填写。

## 3. 初始化 D1 表结构

方式一：使用 Cloudflare 控制台。

1. 进入刚创建的 D1 数据库。
2. 找到 **Console** 或 SQL 执行页面。
3. 打开项目根目录的 `schema.sql`。
4. 复制全部 SQL 内容。
5. 粘贴到 D1 控制台并执行。

方式二：使用 Wrangler，推荐：

```bash
npx wrangler d1 execute book --file=./schema.sql --remote
```

如果你的数据库名不是 `book`，请替换为你的实际 D1 数据库名称。

## 4. 创建 KV 命名空间

进入 Cloudflare 控制台：

1. 打开 **Workers & Pages**。
2. 进入 **KV**。
3. 点击 **Create namespace**。
4. 命名为：`NAV_AUTH`。
5. 创建后复制 namespace id。

然后在 `wrangler.toml` 中确认 KV 绑定类似：

```toml
[[kv_namespaces]]
binding = "NAV_AUTH"
id = "这里填写你的 KV namespace id"
```

## 5. 设置管理员账号密码

进入 Cloudflare 控制台的 KV 页面，选择 `NAV_AUTH` 命名空间，新增两个键值：

| Key | Value |
|---|---|
| `admin_username` | 你的管理员用户名 |
| `admin_password` | 你的管理员密码 |

首次登录成功后，系统会自动把旧版明文密码升级为 PBKDF2 哈希存储。

也可以用 Wrangler 写入：

```bash
npx wrangler kv key put admin_username admin --binding=NAV_AUTH --remote
npx wrangler kv key put admin_password your-password --binding=NAV_AUTH --remote
```

## 6. 修改 wrangler.toml

最少需要确认：

```toml
name = "nav"
main = "src/index.js"
compatibility_date = "2024-12-01"

[[d1_databases]]
binding = "NAV_DB"
database_name = "NAV_DB"
database_id = "你的 D1 database_id"

[[kv_namespaces]]
binding = "NAV_AUTH"
id = "你的 KV namespace id"
```

不要随意启用 `[triggers]`，除非你确认账号有 Cron Trigger 配额。

如果需要定时健康巡检和自动备份，可添加：

```toml
[triggers]
crons = ["0 3 * * *"]
```

这表示每天 UTC 03:00 触发一次。也可以在 Cloudflare 控制台手动添加 Cron Trigger。

## 7. 安装依赖和检查项目

在项目根目录执行：

```bash
npm install
npm run quality
```

如果检查全部通过，再继续部署。

## 8. 使用 Wrangler 部署

推荐部署命令：

```bash
npx wrangler deploy
```

首次执行时，Wrangler 可能会要求登录 Cloudflare。按提示打开浏览器授权即可。

部署成功后，终端会显示 Worker 地址。

## 9. 绑定自定义域名

进入 Cloudflare 控制台：

1. 打开 **Workers & Pages**。
2. 选择刚部署的 Worker。
3. 进入 **Settings**。
4. 找到 **Triggers** 或 **Custom Domains**。
5. 添加你的域名，例如：`nav.example.com`。
6. 等待 Cloudflare 自动配置路由和证书。

## 10. 首次访问

部署完成后访问：

- 前台：`https://你的域名/`
- 后台：`https://你的域名/admin`

建议首次先访问后台：

1. 登录管理员账号。
2. 新增一个书签。
3. 返回前台确认页面正常。
4. 配置系统设置、AI、私密书签、Token、WebHook 等功能。

## 11. 后续升级

推荐升级流程：

```bash
git pull
npm install
npm run quality
npx wrangler deploy
```

如果新版本包含数据库结构更新：

- 项目内置自动迁移逻辑会在请求时尽量补齐缺失字段。
- 如遇异常，可手动执行 `schema.sql` 中新增的 `CREATE TABLE IF NOT EXISTS` 或 `ALTER TABLE` 语句。
- 升级前建议先在后台创建一份手动备份。

## 12. 常见问题

### 前台打开是空的

请先登录后台添加至少一个书签。

### 后台登录失败

检查 KV `NAV_AUTH` 中是否存在：

- `admin_username`
- `admin_password`

并确认 Worker 的 KV 绑定名是 `NAV_AUTH`。

### API 写入提示 401

第三方客户端需要带：

```http
Authorization: Bearer nav_xxx
```

并确认 Token 至少有 `write` scope。

### Cron 没有触发

默认仓库不启用 `[triggers]`。需要你在 `wrangler.toml` 或 Cloudflare 控制台手动配置 Cron Trigger。