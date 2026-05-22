# API 开放与第三方接入指南

本文说明 StarNav 的公开 API、Bearer Token 鉴权方式，以及第三方客户端常见调用示例。

## 1. API 发现

部署后访问：

- `GET /api`
- `GET /api/discovery`
- `GET /api/openapi.json`

`/api/openapi.json` 返回 OpenAPI 3.0.3 描述，可导入 Postman、Apifox 等工具。

## 2. 公开只读接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/sites` | 书签列表，支持分页、分类、标签、关键词、排序、健康状态筛选 |
| GET | `/api/categories` | 平铺分类列表 |
| GET | `/api/categories/tree` | 树形分类结构 |
| GET | `/api/tags` | 标签列表与使用次数 |
| GET | `/api/search` | 高级搜索 |
| GET | `/api/settings/public` | 站点公开设置 |
| POST | `/api/ai/chat` | AI 书签助理 |
| GET | `/api/favicon?url=` | 获取指定 URL 的 favicon |

公开接口会按当前访问权限过滤私密、隐藏和仅管理员可见的书签。

## 3. 高级搜索示例

```bash
curl "https://你的域名/api/search?q=图床&limit=10"
curl "https://你的域名/api/search?q=tag:AI&limit=10"
curl "https://你的域名/api/search?q=cat:开发工具 url:github&limit=10"
curl "https://你的域名/api/search?q=is:dead&limit=10"
```

支持语法：

- `tag:AI`
- `cat:工具`
- `category:开发工具`
- `url:github`
- `is:public`
- `is:private`
- `is:unlisted`
- `is:admin_only`
- `is:dead`
- `is:ok`

## 4. Bearer Token

第三方写入接口使用 Bearer Token：

```http
Authorization: Bearer nav_xxx
```

Token 明文只会在创建时显示一次。KV 中只保存哈希和脱敏元数据。

Token scope：

| scope | 说明 |
|---|---|
| `read` | 预留读权限 |
| `write` | 允许调用第三方写入和维护类接口 |
| `admin` | 可覆盖普通 scope 校验，但仍不能管理系统敏感配置、WebHook 或 Token 自身 |

Token 管理接口仅允许后台管理员 Cookie 访问，避免 Token 自我创建或吊销。

## 5. 新增书签

```bash
curl -X POST "https://你的域名/api/sites" \
  -H "Authorization: Bearer nav_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example",
    "url": "https://example.com",
    "catelog": "工具",
    "desc": "示例站点",
    "tags": ["示例", "工具"],
    "visibility": "public"
  }'
```

常用字段：

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | 是 | 书签名称 |
| `url` | 是 | 书签 URL |
| `catelog` | 是 | 分类名称 |
| `desc` | 否 | 描述 |
| `logo` | 否 | Logo 或 favicon URL |
| `tags` | 否 | 标签数组或逗号分隔字符串 |
| `visibility` | 否 | `public`、`private`、`unlisted`、`admin_only` |
| `sort_order` | 否 | 排序值 |

## 6. 更新和删除书签

```bash
curl -X PUT "https://你的域名/api/sites/1" \
  -H "Authorization: Bearer nav_xxx" \
  -H "Content-Type: application/json" \
  -d '{"name":"Example Updated","url":"https://example.com","catelog":"工具"}'

curl -X DELETE "https://你的域名/api/sites/1" \
  -H "Authorization: Bearer nav_xxx"
```

## 7. 查重和网页信息抓取

```bash
curl "https://你的域名/api/sites/check-duplicate?url=https://example.com" \
  -H "Authorization: Bearer nav_xxx"

curl "https://你的域名/api/site/preview?url=https://example.com" \
  -H "Authorization: Bearer nav_xxx"
```

`/api/site/preview` 会尝试抓取 title、description、favicon，并返回重复书签提示。

## 8. 管理员导出

后台管理员 Cookie 登录后可使用配置导出接口：

```bash
curl "https://你的域名/api/config/export?format=json" \
  -H "Cookie: admin_auth=你的后台登录 Cookie"

curl "https://你的域名/api/config/export?format=csv" \
  -H "Cookie: admin_auth=你的后台登录 Cookie"
```

说明：

- 导出接口始终导出当前后台配置中的全部书签和分类数据。
- CSV 导出默认下载文件名为 `bookmarks.csv`。
- 如需筛选异常链接，请使用后台书签列表的健康状态筛选或公开列表接口的 `health=bad` 查询参数查看；配置导出接口不提供异常链接专用导出。
- 该接口属于后台管理能力，需要管理员 Cookie，不属于公开只读 API。

## 9. 错误响应

API 错误响应兼容旧字段，同时提供标准化 `error` 对象：

```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": {}
  }
}