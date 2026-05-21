# WebHook 使用指南

StarNav 支持在写操作完成后基于操作日志异步触发 WebHook，适合接入通知机器人、自动化工作流、审计系统或外部同步服务。

## 1. 工作机制

当书签、分类、标签、备份、审核等写操作成功后，系统会先写入操作日志，再根据 WebHook 配置异步发送事件。

WebHook 不阻塞主流程：

- WebHook 发送失败不会影响用户当前操作。
- 失败信息会记录到 WebHook 配置的最后错误字段。
- 管理接口仅允许后台管理员 Cookie 访问，不允许 Bearer Token 管理。

## 2. 事件匹配规则

WebHook 支持三种事件匹配方式：

| 写法 | 说明 |
|---|---|
| `*` | 匹配所有事件 |
| `site.create` | 精确匹配某个 action |
| `site.*` | 匹配某个分组下的所有事件 |

常见事件分组：

- `site.*`
- `category.*`
- `tag.*`
- `pending.*`
- `backup.*`

实际 action 以操作日志中记录的 action 为准。

## 3. 管理接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/webhooks` | 获取 WebHook 列表 |
| POST | `/api/webhooks` | 创建 WebHook |
| PUT | `/api/webhooks/:id` | 更新 WebHook |
| DELETE | `/api/webhooks/:id` | 删除 WebHook |
| POST | `/api/webhooks/:id/test` | 测试发送 |

这些接口只能由后台管理员 Cookie 调用。

## 4. 创建 WebHook 示例

```bash
curl -X POST "https://你的域名/api/webhooks" \
  -H "Content-Type: application/json" \
  -H "Cookie: nav_admin_session=你的后台会话" \
  -d '{
    "name": "通知机器人",
    "url": "https://example.com/webhook",
    "events": ["site.*", "tag.merge"],
    "enabled": true,
    "secret": "可选签名密钥"
  }'
```

要求：

- URL 必须是 HTTPS。
- `events` 可以是字符串数组。
- `secret` 可选，设置后会生成 HMAC 签名。

## 5. 请求载荷

WebHook 载荷通常包含：

```json
{
  "event": "site.create",
  "action": "site.create",
  "target": "site",
  "targetId": "1",
  "summary": "新增书签：Example",
  "detail": {},
  "ip": "203.0.113.1",
  "createdAt": "2026-05-22T00:00:00.000Z"
}
```

字段会随事件类型略有差异，建议接收端做兼容处理。

## 6. 签名校验

如果配置了 `secret`，系统会在请求头中附带：

```http
X-StarNav-Signature: sha256=<hmac>
```

接收端应使用相同 secret 对请求 body 计算 HMAC-SHA256，并与该头部做常量时间比较。

## 7. 测试发送

创建 WebHook 后，可调用测试接口：

```bash
curl -X POST "https://你的域名/api/webhooks/<id>/test" \
  -H "Cookie: nav_admin_session=你的后台会话"
```

后台页面也提供测试按钮。

## 8. 安全建议

- WebHook URL 必须使用 HTTPS。
- 不要把 WebHook 管理接口开放给第三方 Token。
- 接收端建议校验签名。
- 接收端应快速返回 2xx，耗时任务放到异步队列中处理。
- 避免在 WebHook 中回调 StarNav 写接口形成循环触发。