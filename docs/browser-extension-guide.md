# 浏览器插件使用指南

StarNav 内置一个 Manifest V3 浏览器插件，用于把当前网页快速收藏到自己的 StarNav 站点。

插件目录：

```text
extensions/browser-bookmark/
```

更详细的插件内部说明也可以查看：

```text
extensions/browser-bookmark/README.md
```

## 1. 插件能力

插件支持：

- 读取当前标签页标题和 URL。
- 配置 StarNav 站点地址。
- 配置 Bearer Token。
- 设置默认分类和默认标签。
- 测试连接。
- 刷新分类和标签候选缓存。
- 抓取网页标题、描述和 favicon。
- 检测重复书签。
- 必要时强制保存重复 URL。
- 调用 AI 推荐分类和标签。
- 使用 Bearer Token 写入书签，不依赖后台 Cookie。

## 2. 前置条件

使用插件前需要：

1. StarNav 已部署完成。
2. 可以正常访问后台 `/admin`。
3. 已在后台创建一个 Bearer Token。
4. Token 至少具备 `write` scope。

## 3. 创建 Bearer Token

1. 登录 StarNav 后台。
2. 打开 Token 管理入口。
3. 创建新 Token。
4. scope 选择 `write`。
5. 复制创建后显示的 Token 明文。

注意：Token 明文只显示一次。如果遗失，需要吊销旧 Token 并重新创建。

## 4. 加载插件

以 Chrome / Edge 为例：

1. 打开扩展管理页面。
   - Chrome：`chrome://extensions/`
   - Edge：`edge://extensions/`
2. 开启「开发者模式」。
3. 点击「加载已解压的扩展程序」。
4. 选择项目中的 `extensions/browser-bookmark/` 目录。
5. 浏览器工具栏会出现 StarNav 插件图标。

## 5. 配置插件

打开插件设置页，填写：

| 配置项 | 示例 | 说明 |
|---|---|---|
| StarNav 地址 | `https://nav.example.com` | 你的 StarNav 站点根地址 |
| Bearer Token | `nav_xxx` | 后台创建的第三方写入 Token |
| 默认分类 | `工具` | 新书签默认分类 |
| 默认标签 | `收藏,待整理` | 可选，逗号分隔 |

保存后点击「测试连接」。如果测试失败，优先检查：

- 站点地址是否可访问。
- Token 是否完整复制。
- Token 是否具备 `write` scope。
- Worker 是否已部署最新版本。

## 6. 收藏当前页面

1. 打开想收藏的网页。
2. 点击 StarNav 插件图标。
3. 插件会读取当前页面标题和 URL。
4. 可点击抓取/预览按钮补全描述和 favicon。
5. 可使用 AI 推荐分类和标签。
6. 检查是否重复。
7. 点击保存。

保存成功后，回到 StarNav 前台刷新即可看到新增书签。

## 7. 重复 URL 处理

插件保存前会调用查重接口。

如果 URL 已存在：

- 建议优先打开已有书签检查。
- 确认确实要重复保存时，再选择强制保存。
- 对同一站点的不同页面，可通过更具体的标题和标签区分。

## 8. 常见问题

### 插件无法连接站点

检查 StarNav 地址是否包含协议，例如：

```text
https://nav.example.com
```

不要只填写 `nav.example.com`。

### 提示 401

通常是 Token 缺失、错误或已吊销。请重新创建 Token 并更新插件配置。

### 提示 403

通常是 Token scope 不足。请确认 Token 至少具备 `write` scope。

### 分类或标签列表为空

点击刷新分类 / 标签缓存，或先在 StarNav 后台创建分类和标签。

### AI 推荐不可用

AI 推荐依赖后台 AI 配置。请确认后台 AI 接口地址、模型和 API Key 已正确配置。