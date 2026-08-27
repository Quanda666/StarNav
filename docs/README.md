# StarNav 文档索引

本文档目录用于存放单独功能说明、使用教程和部署检查材料。项目总览请查看根目录 `README.md`。

## 部署与升级

- [Cloudflare 网页版全流程部署教程](./web-deployment-guide.md)
  - 面向不熟悉命令行和 Wrangler 的用户。
  - 使用 Cloudflare Dashboard + GitHub 仓库连接完成 Worker 部署。
  - 使用 Cloudflare 控制台完成 D1、KV、域名、Cron Trigger 和后续重新部署。
  - 包含 D1 表结构、管理员账号、绑定、自定义域名和常见问题。
- [部署检查清单](./deployment-checklist.md)
  - 部署前后逐项检查 D1、KV、管理员、AI、API Token、WebHook、Cron、备份和回滚。

## 功能指南

- [API 开放与第三方接入指南](./api-guide.md)
  - 公开只读接口。
  - Bearer Token。
  - API Discovery 与 OpenAPI。
  - 第三方写入示例与错误响应。
- [浏览器插件使用指南](./browser-extension-guide.md)
  - Manifest V3 插件加载。
  - Token 配置。
  - 快速收藏当前网页。
  - 查重、AI 推荐分类和标签。
- [WebHook 使用指南](./webhook-guide.md)
  - 事件匹配。
  - HTTPS URL 限制。
  - HMAC 签名。
  - 测试发送。
- [备份、恢复与导入导出指南](./backup-restore-guide.md)
  - 导入预览。
  - 合并导入。
  - 覆盖恢复。
  - 手动备份。
  - 定时备份与恢复前快照。

## 项目规划

- [第一阶段开发规划与巡查记录](./phase-1-development-plan.md)
  - 原 `tem.md` / `PROJECT_PLAN.md` 已整理并迁移为该文件。
  - 用于记录第一阶段核心功能开发、巡查、修正与收尾情况。
- [第二阶段开发规划](./phase-2-development-plan.md)
  - 面向第一阶段收尾后的优化、增加、改进和拓展。
  - 重点覆盖架构拆分、系统健康、测试扩展、数据安全、后台性能、AI 增强、API 生态和插件增强。
- [第三阶段开发规划：多空间 / 多导航页](./phase-3-multi-space-plan.md)
  - 规划多空间数据隔离、空间服务与 API、前台空间切换、后台空间管理。
  - 目前 `spaces` 表、空间服务与读取接口已落地；空间增删改接口处于稳定化冻结状态，前台切换与后台界面暂未开放。