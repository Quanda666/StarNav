﻿﻿﻿# 项目迭代规划与巡查记录

> 用途：记录当前项目后续可迭代方向，后续按优先级逐项实现。
>
> 项目：星漫旅站 / Cloudflare Workers 书签导航
>
> 当前阶段建议：优先围绕「搜索更准、AI 更懂本站、后台更省心、数据更安全」推进。

---

## 一、优先级总览

### P0：优先马上做

1. AI 检索增强第二阶段
2. 搜索排序重构
3. 失效链接检测看板
4. 导入 / 备份 / 恢复增强
5. 后台批量管理优化

### P1：体验增强

1. 前台搜索体验优化
2. AI 回答卡片化
3. 分类和标签体系增强
4. PWA 离线能力增强
5. 移动端体验优化

### P2：长期增强

1. 多级权限体系
2. 数据统计和运营分析
3. 新站提交审核流程完善
4. Favicon 系统增强
5. 主题和个性化
6. API 开放能力
7. 工程质量提升

---

## 二、AI 助理检索能力增强

### 目标

让 AI 助理更准确地理解用户问题，并优先基于本站书签结果回答，减少“明明有数据但没搜到”的情况。

### 可迭代功能

- [x] 本站内容强约束回答
  - 对“某书签在哪个分类”“有没有某网站”“某链接是什么”等问题，必须严格基于检索结果回答。
  - 无检索结果时，明确说明没有找到，不允许编造。
  - 已完成：分类查询、链接查询、是否存在查询命中本站书签时优先返回本地强约束答案，不再交给外部 AI 模型自由发挥。
  - 已完成：增强外部 AI 调用时的 RAG 系统提示词，明确“本站书签检索结果”为事实来源；检索结果为空时必须说明本站未找到，检索结果非空时不得说未检索到，禁止输出上下文中不存在的名称、分类、标签和 URL。
  - 已完成：对“所有 / 全部 / 列出 / 包含 / 含有 / 带有”等事实型列表问题强制走本地严格回答，避免外部模型自由生成导致与检索结果矛盾。

- [x] 多轮上下文检索
  - 用户先问“星空图床”，下一句问“它在哪个分类”，AI 能理解“它”指上一个书签。
  - 已完成：前端保存上一轮命中书签并随下一轮请求提交，后端识别“它/这个/上一个”等指代后优先基于上下文书签回答。
  - 重新审查：原实现直接使用前端传入的 `previousSites` 作为上下文，存在被客户端伪造导致误答的风险；本轮已修复为只接收上一轮站点 ID，并由后端通过 `getSite` 重新读取数据库记录，再用 `canAccessSite` 按管理员 / 私密解锁状态过滤后才用于上下文回答。

- [x] 检索召回增强
  - 书签名精确匹配优先。
  - 中文首字母搜索，例如 `xktc` 命中“星空图床”。（重新审查：当前不是完整拼音库，而是基于 `CJK_INITIALS` 常用汉字首字母映射；名称、分类已有首字母评分，本轮补齐标签首字母评分，并通过短英文 / 数字查询的候选兜底召回覆盖首字母类查询）
  - 用户反馈修正：原先只靠少量 `CJK_INITIALS` 手工映射，无法覆盖“老九网盘 -> ljwp”“星漫旅站 -> xmlz”这类通用中文首字母搜索；本轮改为“手工映射优先 + `zh-Hans-CN` 拼音排序边界推断”的通用首字母能力。
  - 已验证：本地运行时推断 `老九网盘 => ljwp`、`星漫旅站 => xmlz`，并通过 `src/services/siteService.js` 模块语法检查，输出 `generic pinyin initials syntax ok`。
  - URL 域名搜索，例如输入 `110995` 也能命中相关 URL。（已增强：AI 会从问题中提取完整域名、主机片段和数字域名片段）
  - 描述、标签、分类参与加权排序。
  - 增加中文 n-gram 模糊搜索能力。（已实现：搜索词自动拆分 2~4 字中文片段参与候选检索和评分）
  - 已完成：支持从“包含星字的所有书签”“含有某词的网站”“带有某关键词的链接”等表达中抽取核心包含关键词，并提升列表型查询检索上限。
  - 已完成：对包含关键词类查询增加返回前二次严格过滤，按名称、分类、标签、描述、URL 判断是否真实包含关键词，避免泛词扩展结果混入。
  - 重新审查：书签名精确匹配最高权重、描述 / 标签 / 分类 / URL 加权、中文 2~4 字 n-gram、URL / 域名匹配、短英文 / 数字查询候选兜底召回均在 `searchSites` / `scoreSite` 中有真实实现。
  - 重新审查修正：原文“拼音 / 首字母”表述过宽，当前实现不是完整拼音搜索，而是常用汉字首字母映射；同时发现标签首字母评分缺失，本轮已在 `scoreSite` 中补齐 `tag_initials` 评分。
  - 已验证：`src/services/siteService.js`、`src/services/aiService.js`、`src/handlers/api.js` 模块语法检查通过，输出 `search recall review syntax ok`。

- [x] AI 自动改写搜索词
  - 例如用户输入：“帮我找一下那个能上传图片的图床”
  - 自动提取关键词：`图床`、`上传图片`、`图片外链`
  - 已完成：针对图床、上传图片、图片外链、图片托管等表达自动补充扩展检索词，并提取 URL、域名片段和数字片段参与检索。
  - 重新审查：真实实现位于 `inferSearchKeywords`、`extractIntentFreePhrase`、`QUERY_EXPANSIONS`，不是调用外部 AI 改写，而是后端规则化关键词抽取与扩展。
  - 本轮增强：补充图床相关同义词，包括传图、贴图、外链图、图片直链、图片链接、在线图床、ImgToLink、路过图床等，提升自然语言“上传图片 / 生成外链”类问题召回。
  - 本轮增强：新增 `extractCapabilityPhrases`，从“能上传图片的网站”“可以生成图片外链的工具”“推荐上传图片工具”等表达中抽取用途短语，加入 AI 检索关键词集合。
  - 已验证：`src/services/aiService.js`、`src/services/siteService.js`、`src/handlers/api.js` 模块语法检查通过，输出 `ai query rewrite review syntax ok`。

- [x] AI 回答附带可点击结果
  - 聊天窗口中将命中书签渲染成卡片。
  - 卡片包含：名称、分类、描述、访问按钮、复制链接按钮。
  - 已完成：前端 AI 聊天命中书签由简单链接升级为卡片，展示名称、分类、描述、URL，并提供“访问”和“复制”按钮；复制成功 / 失败会给出按钮文案反馈。
  - 已完成：补充暗黑模式下 AI 书签卡片样式，避免深色主题中白底突兀。
  - 已完成：AI 检索合并排序增加 `_aiSearchScore`，让用户原始关键词 / 核心关键词优先于扩展词，避免“找图床”被“图片托管”扩展词带偏到非图床结果。
  - 已验证：远程 `/api/ai/chat` 请求“找图床”时，首位结果为 `ImgToLink+ 🥰`，并返回结构化 `sites` 供前端卡片渲染。
  - 重新审查：前端卡片使用静态模板 + `textContent` 填充名称、分类、描述和 URL，未直接把站点字段拼入 HTML；访问按钮优先走 `/go/:id`，复制按钮复制规范化后的 URL。
  - 本轮修正：前端多轮上下文 `previousSites` 现在只提交上一轮站点 ID，不再把名称、URL、描述、标签等冗余字段回传；后端仍会按 ID 重新读取数据库并执行权限校验。
  - 用户反馈增强：AI 助理窗口新增“全屏 / 还原”按钮，全屏模式覆盖主页面并扩大聊天区域，适合查看较长回答和多张结果卡片。
  - 用户反馈修正：全屏模式改为自适应页面大小的居中大面板，限制最大宽高和阅读宽度；聊天消息左右对齐、结果卡片自动网格排布、输入区按页面宽度居中，移动端自动使用近满屏布局，并补充暗黑模式全屏背景适配。
  - 截图反馈修正：上一版覆盖样式把 `inset:auto!important` 写在 `left/top:50%` 之后，导致 `left/top` 被重置，面板没有真正居中，出现从左侧铺开的大块空白白板；本轮已调整声明顺序，并将桌面端最大尺寸从 `72rem/48rem` 收敛到 `60rem/44rem`，减少遮挡和空白压迫感。
  - 已验证：`src/pages/home.js`、`src/services/aiService.js`、`src/handlers/api.js` 模块语法检查通过，输出 `ai result cards review syntax ok`。

### 本轮重新审查记录

- 已重新审查 `src/services/aiService.js`、`src/pages/home.js`、`src/handlers/api.js`，确认以下已勾选能力在当前代码中有真实实现：
  - 本站内容强约束回答：`buildLocalAnswer` / `detectBookmarkIntent` 会对分类、链接、是否存在、列表类问题优先返回本地严格答案。
  - 检索召回增强：`inferSearchKeywords` 会提取引号内容、URL / 域名片段、数字片段、意图去噪短语，并结合 `QUERY_EXPANSIONS` 扩展图床、AI、网盘等关键词。
  - AI 自动改写搜索词：通过 `QUERY_EXPANSIONS` 和 `extractIntentFreePhrase` 实现规则化关键词扩展。
  - AI 回答附带可点击结果：前台 `createAiSiteCard` / `appendAiMessage` 会渲染站点卡片，并提供访问与复制按钮。
  - API 权限透传：`/api/ai/chat` 会传入 `adminAuthed` 和 `privateUnlocked`，检索时按权限决定是否包含私密书签。
- 本轮发现并修复一个真实问题：多轮上下文原先直接使用前端提交的 `previousSites`，现已改为后端按 ID 重新读取并执行权限校验。
- 已验证：`src/services/aiService.js`、`src/handlers/api.js`、`src/pages/home.js` 模块语法检查通过，输出 `ai retrieval review syntax ok`。

### 建议第一步

先实现“搜索排序重构 + AI 检索召回增强”，因为它同时影响普通搜索和 AI 助理。

---

## 三、搜索系统升级

### 目标

提升全站搜索准确性、可解释性和无结果时的引导能力。

### 可迭代功能

- [x] 搜索结果排序权重
  - 名称完全匹配最高。
  - 名称包含关键词。
  - 标签匹配。
  - 分类匹配。
  - 描述匹配。
  - URL 匹配。
  - 点击量高的靠前。
  - 最近更新的适当靠前。
  - 已完成：`searchSites` 增加 `_score`、`_matchedFields`、`_matchReasons`，并按综合得分排序。

- [x] 支持高级搜索语法
  - `tag:AI`
  - `cat:常用网站`
  - `url:github`
  - `图床 tag:工具`
  - `is:private`
  - `is:dead`
  - 已完成：`searchSites` 支持解析 `tag:`、`cat:` / `category:`、`url:`、`is:`，并可与普通关键词组合过滤。
  - 重新审查：真实实现位于 `src/services/siteService.js` 的 `parseSearchQuery` 和 `matchesAdvancedFilters`；`/api/search` 会调用 `searchSites`，因此前台全站搜索支持这些高级语法。
  - 重新审查确认：`tag:` 按标签包含过滤，`cat:` / `category:` 按分类包含过滤，`url:` 按 URL / 主机片段过滤，`is:private` / `is:public` / `is:unlisted` / `is:admin_only` 按可见性过滤，`is:dead` / `is:bad` / `is:error` 和 `is:ok` / `is:alive` 按健康状态过滤。
  - 边界说明：后台配置列表接口 `/api/config?keyword=` 仍是普通关键词 LIKE 搜索，不等同于 `/api/search` 的高级搜索语法；当前此条确认的是前台全站搜索和 AI 检索共用的 `searchSites` 能力。

- [x] 无结果时智能提示
  - 提示相近关键词。
  - 提示相关分类。
  - 提示提交新站点。
  - 提示让 AI 帮忙推测关键词。
  - 重新审查：原文已写“已完成”，但真实代码中此前只有普通无结果文案，没有改搜建议、高级搜索示例、AI 入口和提交新站入口。
  - 本轮补齐：前台无搜索结果时展示“改搜前两个字”、`tag:` 标签语法、`cat:` 分类语法、AI 助理入口和提交新站入口。
  - 本轮补齐：点击建议可直接复搜；点击 AI 入口会打开 AI 面板并填入“帮我找：当前搜索词”；点击提交新站入口会打开提交弹窗。
  - 用户反馈修正：此前点击“让 AI 帮忙找”会填入 AI 输入框，但面板可能被全局点击事件立即关闭；本轮已阻止事件冒泡并改用统一 `openFloatingAiPanel()`，点击后会自动弹出 AI 助理窗口。

- [x] 搜索历史与热门搜索
  - 记录本地搜索历史。（本轮真实实现：前台使用 localStorage 记录最近 8 条搜索词，支持点击复搜和清空）
  - 可选记录全站热门搜索词。（本轮真实实现：新增 `search_terms` 聚合表，`/api/search` 自动记录搜索词、搜索次数和结果数，管理员可通过 `/api/analytics/search` 查看热门搜索）
  - 可分析无结果关键词，用于补充书签。（本轮真实实现：搜索统计会记录 `zero_result_count`，并在搜索分析 API 的 `zeroResults` 中返回）
  - 重新审查：原文已写“已完成”，但此前真实代码没有 localStorage 搜索历史、没有 `search_terms` 表、没有 `/api/analytics/search`，本轮已补齐。
  - 已验证：`src/handlers/api.js`、`src/services/siteService.js`、`src/services/migrationService.js`、`src/pages/home.js` 模块语法检查通过，输出 `search system review syntax ok`。

---

## 四、书签健康检测增强

### 目标

将已有健康检查能力产品化，方便发现、修复和管理失效链接。

### 可迭代功能

- [x] 定时巡检
  - 使用 Cloudflare Cron Triggers 定期检测书签状态。
  - 可配置每天 / 每周检查。
  - 重新审查：原文写着“已完成”，但真实 `src/index.js` 此前没有 `scheduled` 入口；本轮已补齐真实实现。
  - 本轮完成：新增 `runScheduledHealthCheck`，默认选择从未检测或最久未检测的书签进行巡检。
  - 本轮完成：Worker 增加 `scheduled` 入口，默认每次巡检最久未检测的 30 个书签，可通过 `HEALTH_CHECK_CRON_LIMIT` 调整。
  - 边界说明：`wrangler.toml` 当前仍未启用 `[triggers]` 配置；如需自动触发，需要在 Cloudflare 后台配置 Cron Trigger，或在未超限账号中手动添加 `[triggers] crons = ["0 3 * * *"]`。
  - 已验证：`src/index.js`、`src/services/siteService.js` 模块语法检查通过，输出 `scheduled health check syntax ok`。

- [x] 后台失效链接看板
  - 展示正常、跳转、403、404、500、超时、DNS 错误、SSL 错误等状态。
  - 已完成：后台书签列表已有“健康”列，可展示正常、异常、未检测状态；本轮新增健康状态筛选下拉框，支持全部、只看异常、只看正常、只看未检测。
  - 已完成：`/api/config` / `getSites` 增加 `health=bad|ok|unknown` 服务端筛选参数，分页统计与健康筛选保持一致。
  - 已完成：后台新增“重测异常”快捷按钮，可对当前页异常链接发起批量重测。

- [x] 失效链接批量处理
  - 批量隐藏。
  - 批量删除。
  - 批量标记待修复。
  - 一键重新检测。
  - 已完成：已有选中项批量检测、选中项批量删除；本轮新增当前页异常链接“重测异常”和“隐藏异常”。
  - 已完成：`bulkUpdateSites` 支持批量修改 `visibility`，后台批量工具栏也新增“批量修改可见性”，可将异常链接设为“不列出”，前台不再公开展示但后台仍可管理。
  - 当前阶段“批量标记待修复”使用“不列出 + 健康状态异常”表达待处理状态。

- [x] 前台状态提示
  - 对异常站点显示轻量提示。
  - 避免用户点击后才发现打不开。
  - 重新审查：原文写着“已完成”，但真实 `src/pages/home.js` 此前没有读取 `last_checked_at`、`last_status_code`、`last_error`，也没有“可能失效”徽标渲染；本轮已补齐真实实现。
  - 本轮完成：前台主书签卡片会根据 `last_checked_at`、`last_status_code`、`last_error` 显示“可能失效”轻量徽标。
  - 本轮完成：动态搜索结果卡片会显示同样的“可能失效”徽标。
  - 本轮完成：分组 / 概览小链接 `renderMiniSiteLink` 会显示同样的“可能失效”徽标。
  - 本轮完成：鼠标悬停徽标可查看最近检测时间、HTTP 状态码和异常原因。
  - 已验证：`src/pages/home.js` 模块语法检查通过，输出 `frontend health badge syntax ok`。

---

## 五、分类和标签体系优化

### 目标

让书签组织更清晰，降低后续维护成本。

### 可迭代功能

- [x] 多级分类
  - 例如：
    - 开发工具
      - API 工具
      - 代码托管
      - 服务器运维
  - 已完成：分类表已支持 `parent_id`，后台可选择父分类，前台分类导航按树形结构展示；本轮补齐循环防护，禁止将分类移动到自身或自身子孙分类下，后台父分类下拉框也会禁用子孙分类。

- [x] 分类图标和颜色
  - 支持 emoji 图标。
  - 支持 SVG 图标。
  - 支持分类主题色。
  - 支持分类描述文案。
  - 重新审查：此前历史对话中的实现是半成品，后台新增分类表单虽然已有图标、颜色、描述输入框，但创建分类时没有提交这些字段；分类列表虽然表头有图标、颜色、描述列，但行渲染和保存逻辑没有对应输入；后端更新分类时也没有保存 `color`。
  - 本轮补全：`createCategory` / 后台新增分类现在会提交并保存 `icon`、`color`、`description`；后台分类列表可直接编辑图标、颜色、描述。
  - 本轮补全：`updateCategory` 已修复为同步保存 `color`；迁移逻辑补齐已有数据库中 `categories.icon`、`categories.color`、`categories.description` 缺列自动迁移。
  - 现代化改造：普通分类未设置图标时，前台不再显示默认文件夹或空占位，只保留干净的分类文字。
  - 现代化改造：`私人书签` 不再使用左侧固定锁图标，也不再强制展示旧默认描述；系统会确保后台分类管理中存在 `私人书签` 分类记录，可像普通分类一样设置图标、颜色和描述。未解锁时右侧仍保留“锁”状态徽标，历史默认 `lock` 图标与旧默认描述会自动清理。
  - 现代化改造：颜色设置按最终反馈简化为单个原生取色器，避免预设色/文本输入/渐变按钮堆叠导致界面拥挤；后台分类表格输入框、下拉框、按钮和列宽统一为后台主题样式，避免浏览器原始边框和表头竖排。
  - 现代化改造：前台分类颜色使用柔和底色、左侧强调光带、悬停阴影和图标联动，不再是生硬的边框；深色模式下会自动切换为暗色半透明背景、亮色文字和柔和描边，避免设置颜色后出现浅色块不兼容。
  - 已验证：`src/services/categoryService.js`、`src/pages/adminAssets.js`、`src/pages/home.js` 模块语法检查通过，输出 `modern category metadata syntax ok`；追加验证输出 `private category metadata syntax ok`、`private lock badge restored syntax ok`、`category admin compact color syntax ok`、`home category dark mode color fix syntax ok`。

- [x] 标签合并与别名
  - 例如将 `AI`、`人工智能`、`大模型` 做关联或合并。
  - 避免标签碎片化。
  - 小点迭代完成：先实现“标签合并”基础能力，不一次性扩展完整标签体系。
  - 已完成：新增 `mergeTags` 服务函数，可将源标签关联的书签迁移到目标标签，自动创建目标标签，迁移后删除源标签。
  - 已完成：新增管理员接口 `POST /api/tags/merge`，请求体为 `{ source, target }`，写操作需要管理员登录。
  - 已完成：后台新增独立“标签管理”页签，作为后续标签体系和 AI 批量打标能力的承载面。
  - 已完成：标签管理页展示标签列表、标签 ID、书签使用次数，并支持刷新标签列表。
  - 用户反馈补齐：标签管理页工具栏已增加“当前标签 N 个”统计徽章，刷新标签列表后自动更新总数，空列表显示 0。
  - 已完成：标签管理页内置“标签合并”卡片，支持输入源标签和目标标签，或从标签列表快捷填入“作为源标签 / 作为目标”。
  - 已完成：标签合并后会刷新标签列表、刷新书签列表，并通知前台刷新。
  - 用户反馈增强：标签合并已接入 AI 自动建议能力，可根据当前标签列表生成疑似同义、简称 / 全称、大小写差异和碎片化标签的合并建议。
  - 已完成：新增 `suggestTagMerges` 服务函数，优先使用已配置的 AI 生成 `{ source, target, reason, confidence }` 建议；AI 未启用或失败时回退本地规则建议。
  - 已完成：新增管理员接口 `POST /api/tags/merge-suggestions`，用于后台获取标签合并建议。
  - 已完成：标签管理页“标签合并”卡片新增“AI建议”按钮，建议结果只保留“合并”操作，逐项二次确认后直接执行合并。
  - 用户反馈优化：AI 标签合并建议列表已移除多余的“填入”按钮；合并成功后会立即移除当前建议项，全部处理完后显示“本次建议已全部处理完毕”，避免重复点击影响操作体验。
  - 已验证：`src/services/tagService.js`、`src/handlers/api.js`、`src/pages/adminAssets.js` 模块语法检查通过，输出 `tag merge small iteration syntax ok`。
  - 已验证：`src/services/aiService.js`、`src/handlers/api.js`、`src/pages/adminAssets.js` 模块语法检查通过，输出 `ai tag merge suggestions syntax ok`。
  - 本轮补充验证：`src/pages/adminAssets.js` 模块语法检查通过，输出 `admin tag management page syntax ok`。

- [x] 自动标签推荐
  - 新建 / 导入书签时，根据名称、URL、描述自动推荐标签。
  - 小点迭代完成：先实现“单条书签 AI 标签推荐”，用于在批量处理 400+ 书签前验证提示词、返回格式和标签质量。
  - 已完成：新增 `suggestTagsForSite` 服务函数，会读取单个书签和现有标签候选，优先调用已配置的大语言模型生成短标签 JSON 数组。
  - 已完成：AI 未启用、未配置 API Key、调用失败或返回无效时，会回退到本地规则推荐标签，避免功能完全不可用。
  - 已完成：新增管理员接口 `POST /api/tags/suggest`，请求体为 `{ siteId, limit }`，返回推荐标签、推荐模式和相关书签信息。
  - 用户反馈调整：书签列表行内“AI标签”按钮已移除，避免列表操作过重；标签推荐功能改为放在后台新增书签表单中。
  - 已完成：后台新增书签表单新增“推荐标签”嵌入按钮，样式与自动获取图标按钮一致，会把推荐标签填入新增表单的 Tags 输入框，管理员检查后再点击“添加”。
  - 已完成：`POST /api/tags/suggest` 现在既支持现有书签 `{ siteId, limit }`，也支持新增表单字段 `{ name, url, desc, catelog, tags, limit }`。
  - 已验证：`src/services/aiService.js`、`src/handlers/api.js`、`src/pages/adminAssets.js` 模块语法检查通过，输出 `admin ai add-form cleanup syntax ok`。
  - 小点迭代完成：新增“待补标签候选列表”，先筛出没有标签或标签很少的书签，为后续批量 AI 推荐预览做准备。
  - 已完成：新增 `listSitesNeedingTags` 服务函数，通过 `sites` 与 `site_tags` 左连接统计每个书签标签数量，支持按 `maxTags` 阈值筛选。
  - 已完成：新增管理员接口 `GET /api/tags/needs-review?limit=20&maxTags=0`，返回待补标签候选书签列表。
  - 已完成：标签管理页新增“待补标签书签”区域，可设置最多显示数量和标签数量阈值，并展示候选书签 ID、名称、分类和当前标签数。
  - 已完成：候选书签支持“定位书签”，会切换回书签列表并按名称搜索，方便人工查看和维护对应书签。
  - 已验证：`src/services/tagService.js`、`src/handlers/api.js`、`src/pages/adminAssets.js` 模块语法检查通过，输出 `tag review candidates syntax ok`。
  - 小点迭代完成：新增“批量 AI 标签推荐预览”，可在待补标签候选列表中勾选多个书签，一次性生成推荐标签预览。
  - 已完成：新增 `suggestTagsForSites` 批量推荐服务函数，复用单条 `suggestTagsForSite`，支持 `limit` 和 `batchLimit` 限制，汇总成功 / 失败数量。
  - 用户反馈调整：批量 AI 标签推荐预览单次选择上限已从 10 个提高到 50 个；对应后端批量推荐截断上限和批量应用推荐标签上限也同步提高到 50 个。
  - 已完成：新增管理员接口 `POST /api/tags/suggest-batch`，请求体支持 `{ siteIds, limit, batchLimit }`，仅管理员可调用。
  - 已完成：标签管理页“待补标签书签”表格新增候选勾选框、全选候选和“批量 AI 预览”按钮。
  - 已完成：批量推荐结果只在页面中预览展示推荐标签、推荐模式和结果摘要，暂不自动写入数据库，避免批量误覆盖。
  - 已验证：`src/services/aiService.js`、`src/handlers/api.js`、`src/pages/adminAssets.js` 模块语法检查通过，输出 `batch tag suggestion preview syntax ok`。
  - 小点迭代完成：新增“确认应用批量 AI 推荐标签”，管理员可在预览后选择追加应用或替换应用。
  - 已完成：新增 `applySiteTagSuggestions` 服务函数，支持 `append` 追加模式和 `replace` 替换模式，默认追加更安全，单次最多处理 20 个书签。
  - 已完成：新增管理员接口 `POST /api/tags/apply-suggestions`，请求体为 `{ items: [{ siteId, tags }], mode }`，写操作需要管理员登录。
  - 已完成：标签管理页批量预览结果新增“追加应用推荐标签”和“替换为推荐标签”按钮，替换模式会二次确认并提示覆盖风险。
  - 已完成：应用成功后自动刷新标签列表、待补标签候选列表、书签列表，并通知前台刷新。
  - 已验证：`src/services/tagService.js`、`src/handlers/api.js`、`src/pages/adminAssets.js` 模块语法检查通过，输出 `apply tag suggestions syntax ok`。

- [x] 分类智能推荐
  - 新增书签时，AI 根据内容自动判断分类。
  - 重新审查：原文曾记录“已完成”，但当前代码中此前没有真实的分类推荐服务函数、管理员接口或后台按钮，本轮已补齐真实实现。
  - 小点迭代完成：先实现“单条书签 AI 分类推荐”，用于新增 / 编辑书签时从已有分类中选择最合适分类。
  - 已完成：新增 `suggestCategoryForSite` 服务函数，会读取已有分类候选，优先调用 AI 助理配置的大语言模型，并强制只能从已有分类中选择。
  - 已完成：AI 未启用、未配置 API Key、调用失败或返回无效时，会回退到本地规则分类推荐，避免功能不可用。
  - 已完成：新增管理员接口 `POST /api/categories/suggest`，请求体支持现有书签 `{ siteId }` 或新增表单字段 `{ name, url, desc, catelog, tags }`。
  - 已完成：后台新增书签表单保留“推荐分类”能力，只把推荐分类填入 Catelog 输入框，不自动创建书签。
  - 用户反馈调整：推荐分类按钮已改为和自动获取图标一致的输入框内嵌按钮，减少新增书签表单横向占位。
  - 用户反馈调整：书签列表行内“AI分类”按钮已移除；分类仍建议以手动维护为主，新增书签时只提供辅助推荐。
  - 用户反馈撤回：批量 AI 分类推荐预览已移除，同时删除 `suggestCategoriesForSites` 服务函数和 `POST /api/categories/suggest-batch` 管理员接口。
  - 已验证：`src/services/aiService.js`、`src/handlers/api.js`、`src/pages/adminAssets.js` 模块语法检查通过，输出 `admin ai add-form cleanup syntax ok`。

---

## 六、后台管理体验优化

### 目标

提升管理员维护大量书签时的效率。

### 可迭代功能

- [x] 批量编辑增强
  - 批量修改分类。（已完成：后台批量工具栏支持对已选书签批量修改分类，并自动创建 / 关联分类）
  - 批量添加标签。（已完成：后台批量工具栏支持替换标签和追加标签两种模式）
  - 批量修改可见性。（已完成：后台批量工具栏支持批量改为公开、私密、不列出、仅管理员）
  - 批量刷新图标。（已完成：后台批量工具栏新增“刷新图标”，对已选书签重新获取 favicon，单次最多 30 个）
  - 重新审查：原规划记录中“批量设置排序”“批量删除失效链接（专用按钮）”“导出选中项”均为已完成，实际代码中没有对应按钮和接口；本轮经用户确认这三项偏鸡肋（已有“隐藏异常 + 通用批量删除”可覆盖，导出已有全量 JSON / CSV / HTML），暂不补做。

- [x] 拖拽排序增强
  - 分类拖拽排序。（重新审查：原规划记录中“已完成”，但实际代码此前没有分类拖拽 UI、没有 `reorderCategories` 服务函数，也没有 `/api/categories/reorder` 接口；本轮已补齐真实实现。）
  - 已完成：新增 `reorderCategories` 服务函数，按拖拽顺序写入 `categories.sort_order`，并同步旧版 `category_orders` 表。
  - 已完成：新增管理员接口 `POST /api/categories/reorder`，写操作需管理员登录。
  - 已完成：后台分类管理表行支持 HTML5 拖拽（draggable + dragstart/dragover/drop），拖拽后高亮“保存排序”按钮，点击后才写入数据库，避免误触。
  - 已完成：分类拖拽排序操作会被写入操作日志。
  - 分类内书签拖拽排序。（已完成：书签列表支持拖拽行排序，自动调用 `/api/config/reorder` 保存当前页顺序）
  - 拖拽移动到其他分类。（当前阶段通过行内编辑 Catelog / 批量修改分类完成跨分类移动；拖拽跨分类移动待后续如果做分类内视图时继续增强）

- [x] 导入前预览
  - 新增多少。（已完成：`/api/config/import/preview` 会统计有效站点数量 `totalSites` / `importableSites`）
  - 重复多少。（已完成：预览会统计文件内重复 `duplicateInFile` 和与现有数据重复 `duplicateExisting`）
  - 缺少字段多少。（已完成：预览会统计无效站点 `invalidSites`、缺少分类等，并返回最多 5 条样本）
  - 分类是否存在。（已完成：预览会提取导入涉及的分类名称 `categoriesInFile`、缺失分类 `missingCategories`）
  - 是否自动创建分类。（已完成：导入流程会通过 `upsertCategoryByName` 自动创建缺失分类，预览返回 `willCreateCategories`）
  - 已审查确认：后端 `previewImportSites` 和前端导入流程均有真实实现，前端会展示摘要并二次确认后才正式导入。

- [x] 重复书签检测
  - 完全相同 URL。（已完成：导入预览和导入跳过重复均会检测）
  - http / https 等价。（已完成：URL 归一化统一添加 `https://` 协议）
  - 有无尾斜杠等价。（已完成：URL 归一化 `pathname.replace(/\/+$/g, '')` 去除尾斜杠）
  - www 与非 www 等价。（已完成：URL 归一化 `hostname.replace(/^www\./i, '')` 去除 www 前缀）
  - 已审查确认：归一化函数在 `siteService.js` 中有真实实现，`previewImportSites` 和 `importSites` 均使用同一归一化键做去重。
  - 已扩展至全场景（本轮补齐）：
    - `createSite`（后台新增）：默认检测重复，管理员可通过 `?force=true` 强制添加。
    - `updateSite`（后台编辑）：默认检测重复（排除自身），管理员可强制保存。
    - `submitSite`（前台访客提交）：检测重复，重复时直接拒绝并提示已有书签信息。
    - `approvePendingSite`（待审通过）：检测重复，管理员可强制批准。
    - 新增 `GET /api/sites/check-duplicate?url=&excludeId=` 接口供前端预检。
    - 后台前端：新增/编辑/行内保存遇到 409 时弹出确认对话框，确认后自动 force 重试。
    - 前台前端：访客提交遇到 409 时 alert 提示已有书签信息，不允许强制覆盖。

- [x] 后台按钮密度与移动端适配
  - 已完成：顶部导入 / 导出区域将多个导出按钮收纳为“导出”下拉菜单，减少横向按钮堆叠。
  - 已完成：书签列表批量工具栏按“选择区 / 批量编辑区 / 健康筛选区 / 操作区”分组，降低视觉拥挤。
  - 已完成：移动端导入区单列展示，导出菜单按钮两列 / 极窄屏单列展示。
  - 已完成：移动端批量工具栏输入框全宽，操作按钮两列 / 极窄屏单列展示，避免按钮溢出和横向挤压。
  - 已验证：`src/pages/adminAssets.js` 模块语法检查通过。

- [x] 操作日志
  - 重新审查：原规划记录中“已完成”，但实际代码此前没有 `operation_logs` 表、没有 `operationLogService`、没有 `/api/operation-logs` 接口、没有后台“操作日志”页签；本轮已补齐真实实现。
  - 已完成：新增 `operation_logs` 表（`schema.sql` 与 `migrationService.js` 自动迁移）和 `idx_operation_logs_create_time` / `idx_operation_logs_action` 索引。
  - 已完成：新增 `src/services/operationLogService.js`，提供 `logOperation` 异步写入、`listOperationLogs` 分页查询，并集中维护 `OPERATION_LOG_ACTIONS` 操作类型常量。
  - 已完成：在 `src/handlers/api.js` 中通过 `safeLog(ctx, ...)` 在关键写操作成功后异步写日志，覆盖：书签新增 / 修改 / 删除、批量修改 / 批量删除 / 批量检测 / 批量刷新图标、书签排序、导入；分类新增 / 修改 / 删除 / 拖拽排序；标签合并 / 应用 AI 推荐标签；待审核通过 / 拒绝。
  - 已完成：新增管理员接口 `GET /api/operation-logs?page=&pageSize=&action=&target=`，支持分页和按操作类型筛选。
  - 已完成：操作日志会记录 `action`、`target`、`target_id`、`summary`、`detail`、`ip`（从 `cf-connecting-ip` / `x-forwarded-for` / `x-real-ip` 提取）和 `create_time`。
  - 已完成：后台新增“操作日志”页签，按操作类型下拉筛选，分页展示时间、操作、对象、对象ID、摘要和 IP。
  - 边界说明：操作日志通过 `ctx.waitUntil` 异步写入，不阻塞主流程；写入失败仅会在 Worker 日志中输出 `console.warn`，不会影响用户操作结果。
  - 已验证：`src/services/categoryService.js`、`src/services/operationLogService.js`、`src/services/migrationService.js`、`src/handlers/api.js`、`src/pages/adminAssets.js` 模块语法检查通过，输出 `chapter6 syntax ok`。

---

## 七、前台用户体验优化

### 目标

让访客查找、访问和管理常用书签更方便。

### 可迭代功能

- [x] 快捷键
  - `/` 聚焦搜索框。（已完成：非输入状态下按 `/` 自动聚焦前台搜索框）
  - `Esc` 关闭弹窗。（已完成：可关闭主题面板、AI 面板、添加书签弹窗，并让搜索框失焦）
  - `Ctrl + K` 打开全局搜索。（已完成：支持 `Ctrl + K` / `Cmd + K` 聚焦并选中搜索框内容）
  - 方向键选择搜索结果。（本轮补齐：搜索框聚焦时按 ArrowDown / ArrowUp 在当前可见 `.site-card` 间循环选中，Enter 直接打开当前高亮卡片的主链接，鼠标点击网格时自动清除高亮，输入新内容时清除高亮，Esc 同时关闭面板和清除高亮。)
  - 已验证：`src/pages/home.js` 模块语法检查通过。

- [x] 视图模式（已超额完成，本轮重新审查）
  - 卡片视图。（已完成：默认 `grid` 布局）
  - 紧凑列表。（已完成：`list` 布局 + `compact` 密度可组合）
  - 图标宫格。（已通过 `view=minimal` 视图模式覆盖，隐藏描述与多余按钮）
  - 分类折叠模式。（已完成：`grouped` 布局；侧边栏分类支持子类展开 / 收起）
  - 此外还多了 `masonry` 瀑布布局、`dashboard` 概览布局，以及 `comfortable` / `spacious` 密度档位，本节项目已覆盖。
  - 已审查确认：相关代码位于 `home.js` 的 `applyLayout`、`themeDefaults`、`renderGroupedSites`、`renderDashboardSites`、以及 `data-view="minimal"` CSS。

- [ ] 命令面板（本轮判定鸡肋，记录跳过）
  - 类似 Raycast / VSCode Command Palette。
  - 重新审查：当前已存在 `Ctrl + K` 直达搜索框 + 高级搜索语法 `tag:` / `cat:` / `url:` / `is:` + 方向键导航 + AI 助理浮窗 + 提交新站弹窗，命令面板要再叠一层快捷输入框与命令路由，与现有能力高度重叠。
  - 本轮决策：暂不实现，避免重复造轮子；后续若有"无搜索框场景下也想快速跳转分类 / 复制链接"的具体诉求再考虑。

- [x] 最近访问（本轮补齐）
  - 记录用户最近点击的站点。（已完成：点击 site-card 内的访问链接或"我的常用"chip 时自动记录到 `nav:recent-visits`，最多保留 12 条）
  - 首页展示"最近访问"。（已完成：`#myUsageSection` 右侧卡片展示最近访问 chips，点击可直接访问，× 可移除单条，"清空"可一键清除）
  - 全站维度最近访问仍保留在 `dashboard` 布局中（按数据库 `last_visit_time` 排序）。
  - 跨标签页同步：监听 `storage` 事件，其他标签页修改收藏或最近访问后当前页自动刷新。

- [x] 本地收藏 / 置顶（本轮补齐）
  - 访客可将常用书签置顶。（已完成：每张 site-card 右上角显示 ⭐ 收藏按钮，hover 时出现，点击切换收藏状态）
  - 使用 localStorage，不写入服务端。（已完成：`nav:favorites` 存储收藏 ID 数组，最多 24 个）
  - 首页展示"我的收藏"。（已完成：`#myUsageSection` 左侧卡片展示收藏 chips，点击可直接访问，× 可移除单条，"清空"可一键清除）
  - 搜索结果动态卡片也会注入 ⭐ 按钮（通过 MutationObserver 监听 `#sitesGrid` 子节点变化自动注入）。
  - 当收藏和最近访问都为空时，`#myUsageSection` 自动隐藏，不占用首屏空间。
  - 暗黑模式适配：⭐ 按钮、usage-chip、usage-card 均有 dark 样式。

- [ ] 移动端体验优化（部分完成）
  - 搜索框固定。（待补：移动端可考虑给 `#searchInput` 在 sidebar 关闭后增加顶部 sticky 行为）
  - 分类横向滚动。（已完成：`layoutMode` 工具栏在小屏使用 `overflow-x:auto` 横向滚动，分类侧栏在 sidebar 内纵向滚动；纯分类横向条暂未单独做）
  - 卡片间距优化。（已完成：`--nav-grid-gap` / `--nav-card-padding` 在 `compact` 密度下自动收敛）
  - 底部导航。（本轮判定鸡肋，记录跳过：当前已有左侧抽屉式 sidebar + 浮动按钮 AI/主题/返回顶部，再加底部 tabbar 会占用首屏可视空间并与现有交互冲突）
  - 悬浮按钮现代化。（本轮完成：右下角竖排实心悬浮按钮升级为半透明玻璃 Dock；根据体验反馈二次调整为“桌面端右下角竖向玻璃图标工具条、移动端底部居中横向 Dock”，去掉桌面端横向文字排布；移动端 AI/主题面板改为底部抽屉式并修复因父级 transform 导致弹窗被压成窄条的问题；节日主题不再把按钮强制染成突兀实心色）
  - 一键返回顶部。（已完成：`backToTopBtn` 滚动超过 360px 显示，点击平滑回到顶部）
  - 已验证：`src/pages/home.js` 模块语法检查通过。

---

## 八、PWA 和离线能力增强

### 目标

让站点在移动端和弱网环境下体验更好。

### 可迭代功能

- [x] 离线可浏览缓存（本轮重新审查 + 增强）
  - 缓存首页、图标、静态资源、部分公开书签数据。
  - 重新审查：`src/handlers/pwa.js` 的 service worker 此前已存在，但版本号 v1、缺少跨域字体缓存、缺少 SKIP_WAITING 消息支持。本轮升级到 v2。
  - 已完成：升级到 `starnav-pwa-v2`，新增 `starnav-runtime-v2` 运行时缓存，自动清理旧版本缓存。
  - 已完成：预缓存清单从原来的 3 个扩充到 5 个（新增两个 PWA 图标尺寸）。
  - 已完成：跨域字体（fonts.googleapis.com / fonts.gstatic.com）和 Tailwind CDN（cdn.tailwindcss.com）走 stale-while-revalidate 策略，离线和弱网下也能拿到缓存版本。
  - 已完成：SW 监听 `SKIP_WAITING` 消息，配合前端"刷新"按钮可立即激活新版本。
  - 已完成：同源 `/api`、`/go/`、`/admin` 仍直通不缓存，避免管理操作误用缓存数据。
  - 边界说明：私密书签数据始终不会被 SW 缓存（属于 `/api` 路径）；HTML 首页虽然会被 network-first 缓存，但首页 SSR 时 `siteIndex` 已按当前会话权限过滤，离线访问到的也是当前会话能看到的数据。

- [x] 安装引导（本轮新增）
  - 浏览器支持 PWA 时提示"安装到桌面"。
  - 已完成：监听 `beforeinstallprompt` 事件，自动显示"📲 安装到桌面"浮动按钮（右下角，z-index 65）。
  - 已完成：点击后调用浏览器原生安装弹窗，无论用户接受或拒绝按钮都会消失。
  - 已完成：监听 `appinstalled` 事件，已安装的 PWA 不会再提示。
  - 边界说明：iOS Safari 不支持 `beforeinstallprompt`，所以该按钮在 iOS 上不会出现；用户可通过 Safari 分享菜单"添加到主屏幕"完成安装。

- [x] 更新提示（本轮新增）
  - 站点版本更新后提示用户刷新。
  - 已完成：SW 注册时监听 `updatefound`，新 SW 进入 `installed` 状态且当前页面已被 SW 控制时，弹出"站点已更新"提示框（底部居中，z-index 80）。
  - 已完成：提示框含"刷新"按钮（向 `reg.waiting` 发送 `SKIP_WAITING` 消息）和"×"忽略按钮。
  - 已完成：监听 `controllerchange` 事件，新 SW 接管后自动 reload 一次（使用 `refreshing` 标志位避免循环刷新）。

- [ ] 离线搜索（待后续）
  - 将公开书签缓存到本地。
  - 断网时仍可搜索。
  - 重新审查：当前搜索通过 `/api/search` 走服务端，支持 `tag:` / `cat:` / `url:` / `is:` 高级语法 + 中文 n-gram + 首字母 + AI 同义扩展，离线版完整复刻成本极高且大概率仅返回名称包含匹配，体验落差明显。
  - 本轮决策：暂不实现离线搜索；如需轻量替代，"我的常用"模块（已实现）已能让访客在离线状态下点击访问最近用过的书签，覆盖大部分实际离线场景。

---

## 九、私密书签和权限体系增强

### 目标

完善私密书签、安全访问和不同可见性场景。

### 可迭代功能

- [x] 更细粒度可见性（已超额完成，本轮重新审查确认）
  - 公开 / 知道链接可见 / 密码可见 / 仅管理员可见。
  - 现状：`src/services/siteService.js` 已实现 4 档 `SITE_VISIBILITIES = ['public', 'private', 'unlisted', 'admin_only']`。
    - `public`：公开（默认）。
    - `unlisted`：知道链接可见——可通过 `/go/:id` 直链访问，但不会出现在列表 / 搜索 / 分类 / 首页（`canListSite` 返回 false，但 `canAccessSite` 返回 true）。
    - `private`：密码可见——需要私密书签密码解锁，列表和直链都被门禁拦截。
    - `admin_only`：仅管理员可见——任何非管理员请求都拒绝列出和访问。
  - 现状：`/api/sites`、`/api/search` 均按 `adminAuthed` + `privateUnlocked` 在 SQL 层过滤，私密分类的书签同样走 `canListSite`/`canAccessSite` 双重验证。
  - 高级搜索语法 `is:public` / `is:private` / `is:unlisted` / `is:admin_only` 也已支持。

- [x] 私密分类独立入口（已实现，本轮重新审查确认）
  - 解锁后展示独立私密分类区域。
  - 现状：侧栏分类树中"私人书签"分类未解锁时显示金色"锁"徽标（`renderCategoryLinks` 中 `isPrivate && !privateUnlocked` 分支），点击时跳转密码页或解锁框。
  - 现状：访客解锁后，侧栏底部出现"退出私密访问"按钮（`form _action=logout-private`），点击可立即吊销当前 token。
  - 现状：管理员登录时自动拥有私密访问权限（`privateUnlocked = adminAuthed || visitorPrivateAccess`），无需重复输入密码。

- [x] 访问密码有效期（本轮新增 5 档可选）
  - 当前固定 12 小时 TTL → 升级为 5 档可选：仅本次会话 / 1 小时 / 12 小时（默认）/ 7 天 / 30 天。
  - 已完成：`privateBookmarkService.js` 新增 `PRIVATE_ACCESS_TTL_OPTIONS` 映射表、`normalizePrivateAccessDuration()` 校验函数、`getPrivateAccessTtlSeconds()` 转换函数。
  - 已完成：`createPrivateBookmarkAccess(env, { duration })` 接受 duration 参数，KV `expirationTtl` 按选择设置，payload 中持久化原始 ttl 供后续滑动续期使用。
  - 已完成：`buildPrivateBookmarkAccessCookie` 支持 `duration='session'` 时**不设** `Max-Age`（变成会话 cookie，浏览器关闭后失效）。
  - 已完成：`hasPrivateBookmarkAccess` 滑动续期时从 KV payload 中读取原始 ttl，而非固定 12h，确保用户选择 30 天的会话不会被错误截断到 12h。
  - 已完成：首页解锁框（`renderPrivateBookmarkUnlockBox`）和独立密码页（`renderPrivateBookmarkPasswordPage`）均增加"记住时长"下拉选项，5 个选项分别对应 `session/1h/12h/7d/30d`。
  - 已完成：`renderHomePage` POST 处理读取 `formData.get('duration')` 并传入 `createPrivateBookmarkAccess`。
  - 兼容性：旧 token（payload 无 `ttl` 字段）也能继续工作——`hasPrivateBookmarkAccess` 解析失败时回退到默认 12h。

- [x] 敏感信息保护（已实现，本轮重新审查确认）
  - 私密书签的 URL、描述、标签在未解锁前不进入前端数据。
  - 现状：`renderHomePage` 在 SSR 之前先 `visibleSites = sites.filter(canListSite)`，未解锁访客拿到的 visibleSites 完全不含 `private`/`admin_only`/`unlisted` 书签，gridContent / siteIndex / dashboard / grouped 等所有 HTML 输出都基于过滤后的数据。
  - 现状：`/api/sites`、`/api/search`、`/api/config/:id`（详情）均在 SQL 层做 `COALESCE(s.visibility, 'public') = 'public' AND COALESCE(c.name, s.catelog) <> ?` 过滤，未解锁访客即使通过 API 也拿不到敏感字段。
  - 现状：`window.__SITE_INDEX__` 同样基于 visibleSites，所以"我的常用"模块在客户端展示收藏 / 最近访问时也不会泄露未解锁的私密书签。

---

## 十、数据备份与迁移

### 目标

保护书签数据，方便迁移和恢复。

### 可迭代功能

- [x] 一键导出（已完成）
  - JSON / HTML / CSV 三种格式齐全，导出菜单在后台右上角。
  - 接口：`/api/config/export`、`?mode=legacy`、`?format=html`、`?format=csv`。

- [x] 定时备份（本轮新增）
  - 通过 Cron 定期备份 D1 数据到 KV 存储（`NAV_AUTH`）。
  - 已完成：`src/services/backupService.js` 新增 `runScheduledBackup(env)` 函数，在 `src/index.js` 的 `scheduled()` 中健康检查后自动执行；备份以 `backup:<timestamp>_<reason>` 为 KV key，元数据单独存储在 `backup-meta:` 前缀下。
  - 已完成：自动保留最近 30 份，超出会自动清理最旧的（FIFO 滚动）。
  - 已完成：后台"备份恢复"面板新增"立即备份"按钮，手动创建一份 `reason=manual` 的备份。
  - 启用方式：在 `wrangler.toml` 添加 `[triggers] crons = ["0 3 * * *"]` 即可每天 3 点自动备份；未启用 Cron 时仍可通过后台手动备份。
  - 后续可扩展：R2、GitHub Gist、WebDAV 等外部存储（需额外 secret 配置，本轮先用 KV 满足核心场景）。

- [x] 版本化备份（本轮以"最近 30 份滚动"实现）
  - 当前方案：最近 30 份滚动备份（足够覆盖每日一份近一个月）。
  - 没有按 7天/4周/12月 分桶保留——KV 单条值上限 24MiB，对一个书签站来说 30 份日备份已远超实用需求。
  - 后续如需 7d/4w/12m 分桶保留，可在 `pruneBackups()` 中改用分桶 prune 算法。

- [x] 恢复向导（本轮新增）
  - 覆盖恢复：`POST /api/backups/<id>/restore` `mode=overwrite`（默认）会先清空现有书签 / 分类 / 标签后重建。
  - 合并恢复：`mode=merge` 会按 URL 去重后追加。
  - 已完成：恢复前自动创建一份 `reason=pre-restore` 的快照，万一恢复出问题可立即回滚。
  - 已完成：后台"备份恢复"面板每行提供"下载 / 恢复 / 删除"三个按钮；恢复需双重确认（confirmDialog）。
  - 备份元数据包含 `siteCount`、`categoryCount`、`sizeBytes`、`createdAt`、`reason`（manual / cron / pre-restore），列表按 ID 倒序排列。
  - 未实现："只恢复分类"和"只恢复书签"——当前 `importSites()` 服务层已统一处理 sites + categories + tags 三类数据，单独拆分需要重构 import 服务，性价比低。如真有需求，可通过手动编辑下载的备份 JSON 实现。

---

## 十一、数据统计和运营分析

### 目标

了解用户访问行为和书签质量，指导后续维护。

### 可迭代功能

- [x] 书签点击排行（本轮新增）
  - 数据基础：`sites.hits` + `sites.last_visit_time` 在前台访客通过 `/go/:id` 跳转时由 `incrementSiteHits` 自动累计；管理员后台访问不计入。
  - 已完成：新增 `getSiteAnalytics()` 服务函数，返回累计点击 Top 20、最近被访问 Top 20、长期未访问书签等数据。
  - 已完成：新增管理员接口 `GET /api/analytics/sites`。
  - 已完成：后台新增"访问分析"tab，渲染书签点击排行带 hits 进度条。
  - 边界说明：当前只能给出"全期累计"排行，没有按日切片的访问日志表，所以"最近 7 天 / 30 天热门"无法精确实现；用 `last_visit_time` 排序近似"最近活跃书签"。如未来确有需求，可加 `site_visits` 日表逐日聚合，但目前累计 hits 已能覆盖核心场景。

- [x] 分类热度（本轮新增）
  - 已完成：`getSiteAnalytics()` 同时返回 `categoryHeat`，按分类聚合 `sites.hits` 总和、书签数量、平均 hits、最近访问时间。
  - 已完成：后台"访问分析"tab 渲染分类热度榜，带 hits 进度条。

- [x] 搜索词统计（之前已完成 + 本轮接入 UI）
  - 数据基础：`search_terms` 表 + `recordSearchTerm()` + `getSearchAnalytics()` + `GET /api/analytics/search`（之前完成）。
  - 本轮新增：后台"访问分析"tab 新增"热门搜索词"面板，按 `total_searches` 倒序展示 Top 15，含搜索次数、最近结果数。

- [x] 无结果关键词看板（本轮接入 UI）
  - 数据基础：`search_terms.zero_result_count` 字段（之前完成）。
  - 本轮新增：后台"访问分析"tab 新增"无结果关键词"面板，按 `zero_result_count` 倒序展示 Top 15，可用于补充缺失书签。
  - 同样的 tab 中"长期未访问书签"面板也利用 `last_visit_time IS NULL OR < 60 天` 找出可考虑清理或重新推广的冷门书签。

- [x] 提交审核分析（之前已完成）
  - 数据基础：`getSubmissionAnalytics()` 服务函数 + `GET /api/analytics/submissions` + 后台"提交分析"tab。
  - 包含：每日提交趋势、7×24 热力图、提交画像雷达图、分类占比环形图、提交质量、Top 提交域名、异常波动、最近提交日历、智能分析结论、审核压力指数、最佳审核窗口建议等十余项指标。
  - 通过率 / 重复率：当前未单独拆分"通过率"（待审通过 / 待审拒绝），因为后台审核记录已在操作日志中可追溯；"重复率"以"完整度与重复 URL"形式存在于"提交质量分析"中。

---

## 十二、新站提交和审核流程完善

### 目标

让用户提交新站更顺滑，管理员审核更高效。

### 可迭代功能

- [x] 提交表单增强
  - 名称。
  - URL。
  - 推荐分类。
  - 推荐标签。
  - 简介。
  - 提交理由。（本轮新增：`pending_sites` 新增 `reason` 字段，前台提交弹窗新增"提交理由"输入框）
  - 已完成：前台“添加新书签”弹窗完成深色模式适配，弹窗主体、标题、关闭按钮、输入框、文本域、Logo 自动获取按钮和取消按钮均增加暗色主题样式。
  - 本轮新增：前台提交弹窗新增“AI 推荐分类”按钮，调用 `/api/submit/suggest-category` 公开端点，根据名称、URL、描述自动推荐分类填入表单。

- [x] 自动抓取网站信息
  - 输入 URL 后自动获取 title、description、favicon、OpenGraph 图片。
  - 已完成：新增 `fetchSitePreview(url)` 服务函数，抓取目标网站 HTML 并解析 title、meta description、link icon、og:image 等元信息。
  - 已完成：新增 `GET /api/site/preview?url=` 接口，返回 `{ title, description, favicon, ogImage }`。
  - 已完成：前台提交弹窗新增“抓取”按钮（`#autoFetchMetaBtn`），输入 URL 后点击可自动填充名称、描述和 Logo。
  - 已完成：抓取同时调用 `findDuplicateSite` 检测重复，若已有相同 URL 书签会提示用户。

- [x] 自动查重
  - 提交前提示“本站已有类似书签”。
  - 已完成：`submitSite` 提交时检测重复 URL，重复时返回 409 并提示已有书签信息。
  - 已完成：前台提交遇到 409 时 alert 提示已有书签信息，不允许强制覆盖。
  - 已完成：抓取元信息时同步检测重复并在前台展示提示。

- [x] 审核队列增强（拒绝原因 + 已审核历史）
  - 待审核。（已完成：`pending_sites.status` 默认 `'pending'`）
  - 已通过。（已完成：`approvePendingSite()` 改为 `UPDATE status='approved', reviewed_at=CURRENT_TIMESTAMP`，不再物理删除）
  - 已拒绝。（已完成：`rejectPendingSite(env, id, { reason })` 改为 `UPDATE status='rejected', reject_reason=?, reviewed_at=CURRENT_TIMESTAMP`，不再物理删除）
  - 疑似重复。（已完成：批准时增加已批准重复检测，返回 409 + `duplicate` 信息，管理员可 `?force=true` 强制批准）
  - 信息不完整。（可基于现有数据前端计算徽章，待后续增强）
  - Schema 层：`pending_sites` 新增 `status TEXT NOT NULL DEFAULT 'pending'`、`reject_reason TEXT`、`reviewed_at TIMESTAMP`。
  - `migrationService` 自动迁移这三个字段，并将旧数据 status 补为 `'pending'`。
  - API 层：`GET /api/pending` 新增 `?status=pending|approved|rejected` 查询参数；返回 `stats` 对象（pending/approved/rejected 各自计数）。
  - API 层：`DELETE /api/pending/:id` 改为接收 JSON body `{ reason: "..." }`，传入 `rejectPendingSite`。
  - 后台 UI：待审列表顶部新增状态筛选下拉框（`#pendingStatusFilter`：待审核/已通过/已拒绝）+ 统计标签（`updatePendingStats`）。
  - 后台 UI：拒绝按钮改为弹出“拒绝理由”弹窗，含 5 个预设选项（重复收录/内容低质/链接无效/不符合收录标准/其他）+ 自定义输入框。
  - 后台 UI：切换状态筛选时自动重新加载列表。

- [x] 拒绝原因
  - 拒绝时选择原因，方便回溯。
  - 已完成：见“审核队列增强”，拒绝按钮弹出“拒绝理由”弹窗，原因写入 `pending_sites.reject_reason`，已拒绝记录可在状态筛选中查看。

- [x] 前台 AI 分类/标签推荐（本轮新增）
  - 已完成：新增公开端点 `POST /api/submit/suggest-category`，无需管理员登录，根据提交的名称、URL、描述推荐分类。
  - 已完成：前台提交弹窗新增“推荐分类”按钮，点击后自动填入 AI 推荐的分类。

- [ ] 审核队列智能分类（待后续）
  - 可基于现有数据前端计算徽章（如“疑似重复”“信息不完整”标记）。
  - 本轮暂不实现，已有重复检测和状态筛选可覆盖核心场景。

### 本轮完成总览

| 功能 | 状态 | 说明 |
|---|---|---|
| A. 自动抓取网站元信息 | ✅ 已完成 | `fetchSitePreview()` + `/api/site/preview` + 前台“抓取”按钮 |
| B. 拒绝原因 + 已审核历史 | ✅ 已完成 | 软删除模式 + 拒绝理由弹窗 + 状态筛选 |
| C. 提交理由字段 | ✅ 已完成 | `pending_sites.reason` + 前台输入框 |
| D. 审核队列智能分类 | ⏭ 待后续 | 可基于现有数据前端计算徽章 |
| E. 前台 AI 分类/标签推荐 | ✅ 已完成 | 公开端点 `/api/submit/suggest-category` + 前台按钮 |

已验证：`src/services/siteService.js`、`src/services/migrationService.js`、`src/handlers/api.js`、`src/pages/adminAssets.js`、`src/pages/home.js` 模块语法检查通过。

---

## 十三、Favicon 系统优化

### 目标

提高站点图标加载成功率和视觉一致性。

### 可迭代功能

- [x] 多源 favicon 获取
  - 网站根目录 favicon.ico。（已有）
  - HTML link icon。（已有：`fetchSitePreview` 解析 `<link rel="icon">`）
  - Google favicon 服务。（已有：`google.com/s2/favicons`）
  - DuckDuckGo favicon 服务。（本轮新增：`icons.duckduckgo.com/ip3/{domain}.ico`）
  - faviconextractor.com + favicon.im。（已有）
  - 自定义上传。（当前通过 Logo URL 输入框手动粘贴实现，暂不做文件上传）
  - 已完成：`src/lib/favicon.js` 按优先级依次尝试 5 个源（faviconextractor → favicon.im → Google → DuckDuckGo → 直接 /favicon.ico），任一成功即返回。

- [x] 图标缓存
  - 避免每次加载都请求第三方图标。
  - 已完成：`getFavicon` 使用 `cf: { cacheEverything: true }` 利用 Cloudflare 边缘缓存，相同域名的 favicon 请求会命中 CDN 缓存。
  - 已完成：书签创建/刷新时将 favicon URL 写入 `sites.logo` 字段，后续 SSR 直接使用已保存的 URL，不再重复请求。

- [x] 图标失败降级
  - 站点首字母。（已完成：SSR 渲染时 `logoUrl` 为空则显示站点名首字母占位符）
  - 分类颜色。（当前使用固定 `bg-primary-600`，后续可联动分类 color 字段）
  - 默认图标。（已完成：首字母占位符即为默认降级方案）
  - 本轮新增：SSR `<img>` 标签添加 `onerror` 处理，图片加载失败时隐藏 img 并显示首字母占位符，避免出现破碎图标。

- [x] 后台一键刷新图标
  - 批量刷新所有站点 favicon。
  - 已完成：`bulkRefreshSiteFavicons` 服务函数 + 后台"刷新图标"按钮，单次最多 30 个。
  - 已完成：后台新增书签表单有"✨"按钮调用 `/api/favicon?url=` 获取单个图标。
  - 已完成：前台提交弹窗"抓取"按钮也会同时获取 favicon。

### 本轮完成总览

| 改动 | 说明 |
|---|---|
| DuckDuckGo 源 | `src/lib/favicon.js` 新增 `icons.duckduckgo.com` 作为第 4 优先级源 |
| 客户端 onerror 降级 | SSR site card `<img>` 添加 `onerror` 处理，加载失败自动显示首字母占位 |
| 巡查确认 | 多源获取、边缘缓存、批量刷新、首字母降级均已在代码中有真实实现 |

已验证：`src/lib/favicon.js`、`src/pages/home.js` 模块语法检查通过。

---

## 十四、主题与个性化

### 目标

提升站点辨识度和可配置能力。

### 可迭代功能

- [x] 主题预设
  - 星空主题。（已完成：主题面板内置“🌌 星空”预设，默认星空蓝主色 + 柔和背景 + 卡片布局）
  - 极简白。（已完成：主题面板内置“⬜ 极简”预设，浅色纯净 + 紧凑密度 + 列表布局）
  - 暗黑模式。（已完成：支持深色模式切换，并内置“🌙 暗黑”预设）
  - 毛玻璃。（已完成：主题面板内置“🪟 玻璃”预设，紫色主题 + 渐变背景 + 宽松密度 + 瀑布布局）
  - Mac Dock 风格。（已完成：主题面板内置“💻 Dock”预设，绿色主题 + 图标宫格 + 紧凑密度）
  - Notion 风格。（已完成：主题面板内置“📝 Notion”预设，琥珀主题 + 纸纹背景 + 列表布局）
  - 重新审查：主题色、密度、背景样式、视图模式、首页布局和预设主题均使用 `localStorage` 保存，访客个性化设置会跨刷新保留。

- [x] 自定义首页布局
  - 公告开关。（已完成：后台系统设置支持启用前台弹窗公告、公告标题、Markdown 内容、版本、按钮文字和同版本显示策略）
  - 搜索框位置。（当前阶段搜索框固定在侧栏顶部，配合 `/`、`Ctrl/Cmd+K` 快捷键快速聚焦；不再额外做多位置配置，避免破坏侧栏导航结构）
  - 分类展示数量。（当前阶段分类树完整展示并支持父子分类折叠 / 展开；不单独限制数量，避免隐藏分类影响可发现性）
  - 卡片尺寸。（已完成：通过“紧凑 / 舒适 / 宽松”密度控制卡片 padding、圆角和网格间距）
  - 背景图。（本轮完成：后台系统设置新增“首页背景图片 URL”，访客未设置本地背景偏好时自动作为默认背景图片）
  - Logo 和站点名。（已完成：后台系统设置支持网站名称、首页副标题、网站图标 URL 和页脚补充文字）
  - 博客入口。（本轮完成：后台系统设置新增“显示前台博客入口”、博客入口 URL、博客入口文字；前台侧栏不再硬编码博客地址，可按系统设置显示、隐藏或修改）
  - 默认布局。（本轮完成：后台系统设置新增“默认首页布局”，支持卡片、列表、分组、瀑布、概览；访客本地已选择布局时优先使用本地偏好）
  - 默认主题色。（本轮完成：后台系统设置新增“默认主题色”，支持星空蓝、森林绿、暮光紫、蔷薇红、琥珀金；访客本地已选择主题色时优先使用本地偏好）
  - 首页顶部横幅。（本轮完成：后台系统设置新增“显示首页顶部横幅”开关，可控制首页 hero 区域是否渲染）

- [x] 节日主题
  - 特定日期展示轻量节日效果。
  - 已完成：首页启动脚本会根据日期自动设置 `data-festival`，覆盖新年、情人节、圣诞节、万圣节、劳动节等轻量节日状态。
  - 已完成：CSS 已为新年、圣诞节、情人节、万圣节等节日提供 header 渐变和浮动按钮主题色效果。

### 本轮完成总览

| 改动 | 说明 |
|---|---|
| 后台系统设置扩展 | 新增首页背景图、默认布局、默认主题色、首页顶部横幅开关、博客入口配置 |
| 前台默认个性化接入 | 前台读取系统默认布局 / 主题色 / 背景图 / 横幅开关 / 博客入口，且不覆盖访客本地偏好 |
| 巡查确认 | 主题预设、深色模式、布局模式、密度模式、背景样式、公告配置、节日主题均已有真实实现 |

已验证：`src/services/systemSettingsService.js`、`src/pages/home.js`、`src/pages/adminAssets.js` 模块语法检查通过。

---

## 十五、API 能力开放

### 目标

让项目具备更强的扩展能力，可接入插件、脚本和第三方客户端。

### 可迭代功能

- [x] 公开书签 API
  - `/api/sites` GET — 公开可读，按权限过滤私密书签，支持分页、分类、标签、关键词、排序、健康状态筛选。
  - `/api/sites` POST — 支持后台 cookie 或 Bearer Token 写入，适合第三方客户端和浏览器插件。
  - `/api/categories` GET — 已公开可读，返回平铺分类列表。
  - `/api/categories/tree` GET — 已公开，返回树形分类结构。
  - `/api/tags` GET — 已公开，返回标签列表及使用次数。
  - `/api/search` GET — 已公开，支持高级搜索语法 + 中文 n-gram + 首字母。
  - `/api/settings/public` GET — 已公开，返回站点名称、副标题、图标等公开设置。
  - `/api/ai/chat` POST — 已公开，AI 书签助理聊天接口。
  - `/api/favicon` GET — 已公开，获取指定 URL 的 favicon。
  - `/api/site/preview` GET — 支持后台 cookie、Bearer Token 或公开提交开启时使用，抓取标题、描述、favicon 并查重。
  - `/api/submit/suggest-category` POST / `/api/submit/suggest-tags` POST — 支持后台 cookie、Bearer Token 或公开提交开启时使用，供插件推荐分类和标签。
  - `/api/sites/check-duplicate` GET — 支持后台 cookie 或 Bearer Token 查重。
  - `/api` GET / `/api/discovery` GET — API 发现端点，返回公开 / 条件公开端点清单、鉴权状态、权限说明、参数说明。
  - `/api/openapi.json` GET — OpenAPI 3.0.3 描述，便于第三方工具导入或生成客户端。

- [x] Token 鉴权
  - 已完成：新增 Bearer Token 鉴权基础，第三方客户端可使用 `Authorization: Bearer <token>` 调用书签写入 / 维护类接口。
  - 已完成：后台 cookie 仍保留最高权限，Token 管理接口（`GET /api/tokens`、`POST /api/tokens`、`DELETE /api/tokens/:id`）仅允许管理员 cookie 访问，避免 Token 自我创建 / 吊销。
  - 已完成：Token 采用 KV 存储，记录 `id / name / scopes / createdAt / lastUsedAt / revokedAt`，支持 `read`、`write`、`admin` scope 校验。
  - 已完成：当前已放开的写入类接口包括 `POST /api/sites`、`PUT /api/sites/:id`、`DELETE /api/sites/:id`、`GET /api/sites/check-duplicate`、`GET /api/site/preview`、`POST /api/submit/suggest-category`、`POST /api/submit/suggest-tags`。
  - 权限边界：系统设置、AI 配置、备份恢复、操作日志、WebHook 管理、Token 自身管理等敏感管理接口仍只接受后台 cookie。

- [x] WebHook
  - 当新增 / 修改 / 删除书签、分类、标签、备份、审核等写操作成功写入操作日志后，会基于操作日志异步触发 WebHook。
  - 已完成：新增 `src/services/webhookService.js`，使用 KV 保存 WebHook 配置。
  - 已完成：支持事件匹配规则：`*`、精确 action（如 `site.create`）、分组通配（如 `site.*`）。
  - 已完成：支持启用 / 停用、HTTPS URL 校验、最后触发时间、最后状态码、最后错误记录。
  - 已完成：支持可选 secret，发送请求时附带 `X-StarNav-Signature: sha256=<hmac>`。
  - 已完成：新增管理员接口 `GET /api/webhooks`、`POST /api/webhooks`、`PUT /api/webhooks/:id`、`DELETE /api/webhooks/:id`、`POST /api/webhooks/:id/test`。
  - 权限边界：WebHook 管理仅允许后台 cookie 管理员访问，不允许 Bearer Token 管理。

- [x] 浏览器插件（生产可用版）
  - 已完成：新增独立插件目录 `extensions/browser-bookmark/`。
  - 已完成：Manifest V3 插件支持读取当前标签页标题和 URL。
  - 已完成：设置页支持保存 StarNav 地址、Bearer Token、默认分类、默认标签。
  - 已完成：设置页支持测试连接、刷新分类 / 标签缓存、清空本地配置。
  - 已完成：弹窗页支持名称、URL、描述、分类、标签、可见性、Logo URL 编辑。
  - 已完成：弹窗页支持自动抓取网站 title、description、favicon，并显示重复书签提示。
  - 已完成：弹窗页支持 AI 推荐分类、AI 推荐标签、手动检测重复、重复时强制保存。
  - 已完成：插件通过 `Authorization: Bearer <token>` 使用 Token 鉴权，不依赖后台 cookie。
  - 已完成：分类和标签输入框使用缓存候选，减少手工输入错误。
  - 当前边界：尚未打包发布到 Chrome Web Store；当前以开发者模式加载已解压目录使用。

### 本轮完成总览

| 改动 | 说明 |
|---|---|
| API 公开化 | `/api/categories`、`/api/categories/tree`、`/api/tags`、`/api/search`、`/api/settings/public` 等公开可读 |
| API 发现端点 | `GET /api` 与 `GET /api/discovery` 返回端点清单、鉴权状态、权限说明和参数说明 |
| OpenAPI 描述 | `GET /api/openapi.json` 返回 OpenAPI 3.0.3 文档，包含 Bearer Token security scheme 和写入入口 |
| Token 鉴权 | Bearer Token 支持第三方写入、查重、抓取预览、推荐分类和推荐标签 |
| WebHook | KV 配置、管理员管理接口、操作日志触发分发、HMAC 签名和测试发送能力 |
| 浏览器插件 | `extensions/browser-bookmark/` 升级为生产可用版，支持自动抓取、AI 推荐、查重、强制保存、分类标签候选 |
| 权限边界 | 敏感管理接口仍只接受后台 cookie，不允许 Bearer Token 管理 |

已验证：`src/handlers/api.js`、`src/services/webhookService.js`、`src/services/operationLogService.js`、`extensions/browser-bookmark/options.js`、`extensions/browser-bookmark/popup.js` 模块语法检查通过。

---

## 十六、工程质量优化

### 目标

提升长期维护稳定性，降低改动风险。

### 可迭代功能

- [x] 测试（本轮完成第一批核心测试）
  - 关键词提取 / 搜索排序测试。（已完成：`tests/siteService.test.js` 覆盖精确名称优先、匹配原因、高级 `tag:` 过滤）
  - 权限可见性测试。（已完成：覆盖 `public`、`private`、`unlisted`、`admin_only` 的访问和列表可见性）
  - 导入数据测试。（已完成：覆盖旧数组格式、结构化导出格式、无效行、重复 URL、缺失分类和自动创建分类预览）
  - 重复 URL 归一化测试。（已完成：覆盖 http/https、www、尾斜杠等价）
  - 测试框架使用 Node.js 内置 `node:test`，不额外引入依赖。

- [x] Lint 和格式化（本轮完成轻量质量基线）
  - 暂未引入 ESLint / Prettier，避免一次性大范围格式化影响历史代码。
  - 已新增 `scripts/check-syntax.js`，递归执行 `node --check` 检查项目内 JavaScript 语法，并排除 `node_modules`、`.wrangler` 等生成目录。
  - 已新增 `npm run check`、`npm test`、`npm run quality`。
  - 已新增 GitHub Actions：`.github/workflows/quality.yml`，在 push / pull_request 时执行 `npm ci` 和 `npm run quality`。

- [x] 类型提示（本轮补齐第一批关键 JSDoc）
  - 使用 JSDoc 增强关键函数类型提示。
  - 已完成：`src/services/siteService.js` 补充 `SiteRecord`、`SitePayload`、`SiteAccessOptions` 等共享 typedef，并为可见性判断、列表查询、详情查询、搜索、创建、更新、删除等关键导出函数补充参数 / 返回值说明。
  - 已完成：`src/lib/auth.js` 补充 `ApiTokenScope`、`ApiTokenPublicRecord`、`AuthResult` 等鉴权相关 typedef，并为 Cookie 解析、Session 创建 / 刷新 / 销毁 / 校验、Bearer Token 创建 / 列表 / 吊销 / 校验、管理员凭据校验等关键导出函数补充 JSDoc。
  - 边界说明：当前仍保持 JavaScript + JSDoc 方案，不迁移 TypeScript，避免一次性改造范围过大；后续可继续为服务层和 handler 层补充更细粒度类型。

- [x] 错误日志规范化（本轮完成兼容型错误响应）
  - 已完成：`errorResponse()` 保留旧版顶层 `{ code, message }` 字段，同时新增标准化 `error: { code, message, details }` 对象和顶层 `details`，降低第三方客户端兼容风险。
  - 已完成：新增 `badRequest()`、`unauthorized()`、`forbidden()`、`notFound()`、`conflict()` 等便捷错误响应函数，后续接口可逐步接入统一错误格式。
  - 已完成：API 管理鉴权错误已标准化，未登录写入返回 `UNAUTHORIZED`，Token scope 不足返回 `FORBIDDEN`，并在 `details` 中提供 `allowApiToken`、`requiredScope`、`tokenScopes` 等排查信息。
  - 已完成：重复 URL `409 CONFLICT` 响应兼容保留 `duplicate`、`scope` 顶层字段，同时在 `details` / `error.details` 中提供结构化冲突信息。
  - 已完成：WebHook 非 HTTPS URL 等参数校验错误归类为 `400 BAD_REQUEST`，避免误报为 500。

- [x] 部署检查清单（本轮完成）
  - 已新增 `docs/deployment-checklist.md`。
  - 覆盖 wrangler 配置、D1 `NAV_DB` 绑定、KV `NAV_AUTH` 绑定、数据库初始化 / 自动迁移、管理员和私密访问配置、AI 配置、API Token、浏览器插件、WebHook、Cron Trigger、部署命令和回滚备份。
  - 明确默认仓库不启用 `[triggers]`，避免 Cloudflare Cron Trigger 数量限制导致部署失败。

### 本轮完成总览

| 改动 | 说明 |
|---|---|
| npm 脚本 | 新增 `check`、`test`、`quality` |
| 语法检查 | 新增 `scripts/check-syntax.js`，覆盖项目内 27 个 JS 文件 |
| 核心测试 | 新增 `tests/siteService.test.js`，覆盖搜索排序、权限、导入预览、重复 URL 归一化 |
| API 错误测试 | 新增 `tests/apiErrors.test.js`，覆盖统一错误结构、无鉴权写入 401、Token scope 不足 403、WebHook 参数校验 400 |
| CI | 新增 `.github/workflows/quality.yml`，push / PR 自动执行质量检查 |
| 部署文档 | 新增 `docs/deployment-checklist.md` |
| 验证 | 已执行 `npm run quality`，语法检查 27 个 JS 文件通过，Node 测试 10/10 通过 |

---

## 十七、建议执行顺序

### 第 1 个迭代：搜索排序 + AI 检索增强

目标：

- 普通搜索更准。
- AI 助理更容易命中本站书签。
- 解决“用户自然语言里包含书签名但检索不到”的问题。

可拆分任务：

- [x] 梳理当前 `searchSites` 查询逻辑。（已完成：确认原逻辑为 SQL LIKE 候选召回 + 创建时间排序，缺少权重、可解释性和首字母兜底召回）
- [x] 增加搜索权重字段，例如 `_score`。（已完成：搜索结果返回 `_score`、`_matchedFields`、`_matchReasons`）
- [x] 名称完全匹配最高权重。（已完成：名称完全匹配权重最高，并返回“名称完全匹配”原因）
- [x] 名称包含关键词次高权重。（已完成：名称包含、名称首字母匹配分别参与评分）
- [x] 标签、分类、描述、URL 分别加权。（已完成：标签、分类、描述、域名 / URL 均参与评分；点击量和更新时间作为辅助排序）
- [x] AI 检索时优先使用高权重结果。（已完成：AI 仍通过 `searchExpandedSites` 调用增强后的 `searchSites`，自然使用高权重排序；分类 / 链接 / 是否存在问题会优先本地强约束回答）
- [x] 为典型问题增加测试样例并完成远程验收。
  - “星空图床这个书签位于哪个分类下”
  - “星空图床”
  - “找图床”
  - “有没有图片上传工具”
  - “110995 是哪个网站”
  - 已完成：全量 JS 语法检查通过（`checked 19 js files`）。
  - 已完成：使用 `npx wrangler deploy` 部署到 Cloudflare，当前验证版本 ID：`73952082-99c0-4a80-aaf5-a5ab4f1b8559`。
  - 已完成：通过自定义域名 `https://ximi.ccwu.cc/` 远程验证 `/api/search?q=星空图床&limit=5`，可召回图床相关书签。
  - 已完成：通过自定义域名远程验证 `/api/search?q=110995&limit=5`，仅返回实际域名匹配的“订阅转换”，`_matchedFields` 为 `url`，避免宽召回无关结果混入。

### 第 2 个迭代：AI 聊天结果卡片化

目标：

- 让 AI 返回的书签结果更直观。
- 用户可以直接点击访问或复制链接。

可拆分任务：

- [x] 检查前端 AI 聊天组件结构。（已完成：确认前端 `appendAiMessage` 原先只渲染简单 `.ai-site-link`，后端 `/api/ai/chat` 已返回结构化 `sites`）
- [x] 后端返回结构化 `sites` 数据。（已完成：远程验证 `/api/ai/chat` 返回 `siteCount` 和首个命中书签结构）
- [x] 前端渲染命中书签卡片。（已完成：新增 `createAiSiteCard`，AI 回复下方渲染 `.ai-site-card`）
- [x] 添加访问按钮和复制链接按钮。（已完成：卡片包含“访问”和“复制”按钮，访问走 `/go/:id`，复制使用 `navigator.clipboard`）
- [x] 优化移动端展示。（已完成：卡片使用弹性布局、截断和紧凑按钮，适配浮动 AI 面板宽度；补充暗黑模式样式）
- [x] 部署与验收。（已完成：全量 JS 语法检查通过；使用 `npx wrangler deploy` 部署，当前验证版本 ID：`5dc4e858-ad8a-486d-89ca-e679e168fa9a`；远程首页 HTML 已包含 `createAiSiteCard` / `ai-site-card` / `ai-card-copy`；远程 `/api/ai/chat` 请求“找图床”首位结果为 `ImgToLink+ 🥰`）

### 第 3 个迭代：失效链接检测看板

目标：

- 将已有健康检测能力做成后台可用工具。

可拆分任务：

- [x] 增加后台健康状态列表。（已完成：书签列表保留“健康”列，展示正常、异常、未检测，并显示最近检测时间提示）
- [x] 增加一键检测当前页。（已完成：当前阶段通过“全选本页 + 批量检测”完成当前页检测；单次限制 30 个，避免 Worker 请求过长）
- [x] 增加批量检测选中项。（已完成：保留选中项“批量检测”，返回正常 / 异常数量摘要）
- [x] 增加按状态筛选。（已完成：后台新增健康状态筛选下拉框；`/api/config` 支持 `health=bad|ok|unknown`，服务端分页统计准确）
- [x] 增加批量隐藏 / 删除 / 重测。（已完成：已有选中项批量删除；本轮新增“重测异常”和“隐藏异常”；`bulkUpdateSites` 支持批量修改 `visibility`，可将异常链接批量设为“不列出”）
- [x] 部署与验收。（已完成：全量 JS 语法检查通过；使用 `npx wrangler deploy` 部署，当前验证版本 ID：`57d61db1-5c64-4e54-959e-eebfb34e54e3`；远程 `/static/admin.js` 已包含 `healthFilter` / `recheckBadBtn` / `hideBadBtn` / `currentHealthFilter`；远程 `/api/config?health=bad` 返回 `code: 200`）

### 第 4 个迭代：备份和恢复

目标：

- 确保书签数据安全。

可拆分任务：

- [x] 增加一键导出 JSON。（已完成：后台支持新版完整 JSON 与旧版站点数组 JSON 导出）
- [x] 增加浏览器书签 HTML 导出。（已完成：`/api/config/export?format=html` / `mode=html` 支持导出 Netscape Bookmark HTML；后台顶部导入导出区已将多个导出入口收纳到“导出”下拉菜单，HTML 下载文件名为 `bookmarks.html`）
- [x] 增加导入预览。（已完成：新增 `/api/config/import/preview` / `/api/sites/import/preview`，后台导入 JSON 前会先展示总数、可导入、无效、重复和将自动创建分类摘要，确认后才正式导入）
- [x] 增加重复检测。（已完成：导入预览和正式导入都会按归一化 URL 检测重复，忽略 http/https、www 和尾斜杠差异；重复项会自动跳过）
- [x] 增加覆盖 / 合并恢复模式。（已完成：后台导入支持“合并导入 / 覆盖恢复”模式；合并导入会跳过重复 URL，覆盖恢复会二次确认，并清空现有书签、分类和标签后按导入文件重建）
- [x] 增加 CSV 导出。（已完成：`/api/config/export?format=csv` / `mode=csv` 支持导出 CSV；后台顶部导入导出区新增“导出 CSV”按钮，下载文件名为 `bookmarks.csv`）

### 第 5 个迭代：后台批量管理增强

目标：

- 提高大量书签维护效率。

可拆分任务：

- [x] 批量修改分类。（已完成：后台批量工具栏可对已选书签批量修改分类）
- [x] 批量添加 / 替换标签。（已完成：支持“替换标签 / 追加标签”模式）
- [x] 批量修改可见性。（已完成：支持公开、私密、不列出、仅管理员）
- [x] 批量刷新图标。（已完成：新增“刷新图标”按钮，调用 `/api/config/bulk` 的 `action:favicon`，后端批量重新获取 favicon 并写回 `logo`）
- [ ] 批量删除失效链接。（已有选中项批量删除；当前页异常删除能力已在后台批量工具栏中记录完成，后续可继续优化为独立异常清理看板）
- [x] 操作完成后展示结果摘要。（已完成：批量修改、批量检测、批量刷新图标、批量删除均展示处理数量摘要）
- [x] 本轮验证。（已完成：`src/services/siteService.js`、`src/handlers/api.js`、`src/pages/adminAssets.js` 模块语法检查通过，输出 `bulk management syntax ok`）

---

## 十八、当前推荐下一步

建议先从下面这个任务开始：

> 搜索排序 + AI 检索增强

原因：

1. 它能直接改善用户搜索体验。
2. 它能直接提升 AI 助理回答准确率。
3. 它对现有功能侵入相对可控。
4. 后续 AI 结果卡片化、无结果推荐、热门搜索都可以基于它继续扩展。

---

## 十九、临时备注

- 当前已完成：
  - AI 关键词提取初步优化。
  - 解决类似“‘星空图床’这个书签位于哪个分类下”无法提取核心书签名的问题。
  - 已推送到远程 `master` 分支。

- 后续每完成一个功能，建议在本文件中勾选对应任务，或者迁移到正式 `PROJECT_PLAN.md`。
- 后续更新 `README.md` 时需要补充说明：
  - 定时健康巡检代码已内置 `scheduled` 入口，但当前仓库未默认启用 `wrangler.toml` 的 `[triggers]`，避免 Cloudflare Cron Trigger 数量超限导致部署失败。
  - 新账号或未超限账号可在 `wrangler.toml` 添加 `[triggers] crons = ["0 3 * * *"]`，或在 Cloudflare 后台手动配置 Cron Trigger。
  - `HEALTH_CHECK_CRON_LIMIT` 用于控制每次定时巡检最多检测多少个书签，默认 30，可按书签数量调整。

---

## 二十、第二阶段规划入口

第一阶段 `PROJECT_PLAN.md` 中的大部分核心功能已经基本收尾，项目已具备前台导航、后台管理、AI 助理、备份恢复、API 开放、WebHook、浏览器插件和工程质量基线。

第二阶段不再以继续堆叠单点功能为主，而是转向：

- 稳定性
- 可维护性
- 可观测性
- 性能优化
- 大数据量后台维护体验
- AI 管理助手
- API / 插件生态增强
- 部署、升级和排错体验优化

第二阶段详细规划已整理为独立文档：

- [docs/phase-2-development-plan.md](docs/phase-2-development-plan.md)

当前最推荐的第二阶段启动任务：

> 新增“系统健康中心”。

最小范围包括：

- `GET /api/system/health`
- 后台“系统健康”页签
- D1 / KV / 关键表 / 管理员账号 / 备份 / WebHook / AI 配置检查
- 对健康接口补充测试
