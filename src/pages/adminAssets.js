export const adminHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>书签管理页面</title>
  <link id="adminFavicon" rel="icon" href="/pwa-icon.svg">
  <link rel="alternate icon" href="https://img.12388888.xyz/file/logo/ktVNDfcM.png" type="image/png">
  <link id="adminAppleTouchIcon" rel="apple-touch-icon" href="/pwa-icon.svg">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="stylesheet" href="/static/admin.css">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="container">
    <header class="admin-header">
      <div>
        <h1>书签管理</h1>
        <p class="admin-subtitle">管理后台仅限受信任的管理员使用，请妥善保管账号</p>
      </div>
      <div class="admin-header-actions">
        <div class="import-export">
          <input type="file" id="importFile" accept=".json" style="display:none;">
          <div class="import-group">
            <select id="importMode" title="导入恢复模式">
              <option value="merge">合并导入</option>
              <option value="overwrite">覆盖恢复</option>
            </select>
            <button id="importBtn">导入</button>
          </div>
          <details class="action-menu export-menu">
            <summary>导出</summary>
            <div class="action-menu-panel">
              <button id="exportBtn">新版 JSON</button>
              <button id="exportLegacyBtn">旧版 JSON</button>
              <button id="exportCsvBtn">CSV</button>
              <button id="exportHtmlBtn">浏览器 HTML</button>
            </div>
          </details>
        </div>
        <form id="logoutForm" method="post" action="/admin/logout">
          <button type="submit" class="logout-btn">退出登录</button>
        </form>
      </div>
    </header>

    <div class="add-new">
      <input type="text" id="addName" placeholder="Name" required>
      <input type="text" id="addUrl" placeholder="URL" required>
      <div class="logo-field">
        <input type="text" id="addLogo" placeholder="Logo(optional)">
        <button type="button" id="fetchAdminFaviconBtn" title="自动获取图标" aria-label="自动获取图标">✨</button>
      </div>
      <input type="text" id="addDesc" placeholder="Description(optional)">
      <div class="add-action-field">
        <input type="text" id="addCatelog" placeholder="Catelog" required>
        <button type="button" id="suggestAddCategoryBtn" title="推荐分类" aria-label="推荐分类">🗂️</button>
      </div>
      <select id="addVisibility" title="可见性"><option value="public">公开</option><option value="private">私密</option><option value="unlisted">不列出</option><option value="admin_only">仅管理员</option></select>
      <div class="add-action-field">
        <input type="text" id="addTags" placeholder="Tags(逗号/空格分隔，可选)">
        <button type="button" id="suggestAddTagsBtn" title="推荐标签" aria-label="推荐标签">🏷️</button>
      </div>
      <div class="add-submit-row">
        <input type="number" id="addSortOrder" placeholder="排序 (数字小靠前)">
        <button id="addBtn">添加</button>
      </div>
    </div>
    <div id="adminFaviconStatus" style="display:none;"></div>
    <div id="message" style="display:none;"></div>

    <section class="admin-overview" aria-label="后台概览">
      <div class="stat-card">
        <span class="stat-icon">🔖</span>
        <div><strong id="statTotalSites">--</strong><small>书签总数</small></div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">⏳</span>
        <div><strong id="statPendingSites">--</strong><small>待审核</small></div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🗂️</span>
        <div><strong id="statCategories">--</strong><small>分类数量</small></div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🛠️</span>
        <div><strong id="statAdminState">在线</strong><small>管理状态</small></div>
      </div>
    </section>

    <div class="tab-wrapper">
      <div class="tab-buttons">
        <button class="tab-button active" data-tab="config">书签列表</button>
        <button class="tab-button" data-tab="pending">待审列表</button>
        <button class="tab-button" data-tab="submissionAnalytics">提交分析</button>
        <button class="tab-button" data-tab="visitAnalytics">访问分析</button>
        <button class="tab-button" data-tab="categories">分类管理</button>
        <button class="tab-button" data-tab="tags">标签管理</button>
        <button class="tab-button" data-tab="privateBookmarks">私人书签</button>
        <button class="tab-button" data-tab="systemSettings">系统设置</button>
        <button class="tab-button" data-tab="aiAssistant">API接入</button>
        <button class="tab-button" data-tab="apiTokens">Token管理</button>
        <button class="tab-button" data-tab="operationLogs">操作日志</button>
        <button class="tab-button" data-tab="backups">备份恢复</button>
      </div>

      <div id="config" class="tab-content active">
        <div class="bulk-toolbar">
          <div class="bulk-group bulk-select-group">
            <label class="bulk-select-all"><input type="checkbox" id="selectAllConfigs"> 全选本页</label>
            <span id="selectedCount">已选择 0 项</span>
          </div>
          <div class="bulk-group bulk-edit-group">
            <input type="text" id="bulkCatelog" placeholder="批量修改分类">
            <input type="text" id="bulkTags" placeholder="批量设置/追加标签">
            <select id="bulkTagMode">
              <option value="replace">替换标签</option>
              <option value="append">追加标签</option>
            </select>
            <select id="bulkVisibility" title="批量修改可见性">
              <option value="">可见性不变</option>
              <option value="public">公开</option>
              <option value="private">私密</option>
              <option value="unlisted">不列出</option>
              <option value="admin_only">仅管理员</option>
            </select>
            <button id="bulkUpdateBtn" type="button">应用修改</button>
          </div>
          <div class="bulk-group bulk-filter-group">
            <select id="healthFilter" title="健康状态筛选">
              <option value="">全部健康状态</option>
              <option value="bad">只看异常</option>
              <option value="ok">只看正常</option>
              <option value="unknown">只看未检测</option>
            </select>
          </div>
          <div class="bulk-group bulk-action-group">
            <button id="bulkCheckBtn" type="button" class="check-btn">检测选中</button>
            <button id="recheckBadBtn" type="button" class="check-btn">重测异常</button>
            <button id="bulkFaviconBtn" type="button">刷新图标</button>
            <button id="hideBadBtn" type="button">隐藏异常</button>
            <button id="bulkDeleteBtn" type="button" class="del-btn">删除选中</button>
          </div>
        </div>
        <div class="table-wrapper">
          <table id="configTable">
            <thead>
              <tr>
                <th><input type="checkbox" id="selectAllConfigsHead" title="全选本页"></th><th>ID</th><th>Name</th><th>URL</th><th>Logo</th><th>Description</th><th>Catelog</th><th>可见性</th><th>Tags</th><th>排序</th><th>健康</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="configTableBody"></tbody>
          </table>
          <div class="pagination">
            <label class="page-size-control">每页
              <select id="pageSizeSelect">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              条
            </label>
            <button id="prevPage" disabled>上一页</button>
            <span id="currentPage">1</span>/<span id="totalPages">1</span>
            <button id="nextPage" disabled>下一页</button>
            <label class="page-jump-control">跳到
              <input id="pageJumpInput" type="number" min="1" value="1">
              页
            </label>
            <button id="pageJumpBtn" type="button">跳转</button>
          </div>
        </div>
      </div>

      <div id="pending" class="tab-content">
        <div class="category-toolbar">
          <p class="category-hint">审核中心：管理前台访客提交的书签。批准后自动入库，拒绝时可附带理由。</p>
          <div class="operation-log-controls">
            <select id="pendingStatusFilter" title="按审核状态筛选">
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
            </select>
            <span id="pendingStatsLabel" class="tag-total-badge" style="font-size:.8rem"></span>
          </div>
        </div>
        <div class="table-wrapper">
          <table id="pendingTable">
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>URL</th><th>Logo</th><th>Description</th><th>Catelog</th><th>Tags</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="pendingTableBody"></tbody>
          </table>
          <div class="pagination">
            <button id="pendingPrevPage" disabled>上一页</button>
            <span id="pendingCurrentPage">1</span>/<span id="pendingTotalPages">1</span>
            <button id="pendingNextPage" disabled>下一页</button>
          </div>
        </div>
      </div>

      <div id="submissionAnalytics" class="tab-content">
        <div class="category-toolbar">
          <div>
            <p class="category-hint">提交热力分析同时统计前台待审核提交和后台管理员新增书签，帮助判断更常添加的日期、时段和分类偏好。</p>
          </div>
          <div class="analytics-controls">
            <select id="analyticsDays" title="统计范围">
              <option value="7">最近 7 天</option>
              <option value="30" selected>最近 30 天</option>
              <option value="90">最近 90 天</option>
              <option value="180">最近 180 天</option>
            </select>
            <button id="refreshSubmissionAnalytics" type="button">刷新分析</button>
          </div>
        </div>
        <div class="analytics-summary">
          <div class="analytics-card"><span>📥</span><strong id="analyticsRecent">--</strong><small>周期内提交</small><em id="analyticsChange">--</em></div>
          <div class="analytics-card"><span>📌</span><strong id="analyticsPendingTotal">--</strong><small>当前待审核</small><em id="analyticsPressureLevel">--</em></div>
          <div class="analytics-card"><span>📈</span><strong id="analyticsAvg">--</strong><small>日均提交</small><em id="analyticsActiveDays">--</em></div>
          <div class="analytics-card"><span>🔥</span><strong id="analyticsPeak">--</strong><small>高峰时段</small><em id="analyticsReviewHint">--</em></div>
        </div>
        <div class="analytics-ops-strip">
          <div class="pressure-widget">
            <div class="pressure-head"><span>审核压力指数</span><strong id="pressureScore">--</strong></div>
            <div class="pressure-track"><i id="pressureBar"></i></div>
            <p id="pressureText">根据待审核数量、提交速度、峰值集中度和资料完整度综合计算。</p>
          </div>
          <div class="review-window-widget">
            <strong>最佳审核窗口</strong>
            <p id="reviewWindowLabel">--</p>
            <small id="reviewWindowReason">--</small>
          </div>
        </div>
        <div id="submissionAnalyticsStatus" class="analytics-status loading-state"><span class="loading-spinner"></span>正在加载提交分析...</div>
        <div class="analytics-grid">
          <section class="analytics-panel wide">
            <div class="analytics-panel-title"><h3>每日提交趋势</h3><small id="dailyTrendHint">按天统计提交数量</small></div>
            <div id="dailyTrend" class="daily-trend"></div>
          </section>
          <section class="analytics-panel wide">
            <div class="analytics-panel-title"><h3>7 × 24 提交热力图</h3><small>颜色越深表示该星期/小时提交越集中</small></div>
            <div id="submissionHeatmap" class="submission-heatmap"></div>
            <div class="heatmap-legend"><span>低</span><i></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>高</span></div>
          </section>
          <section class="analytics-panel">
            <div class="analytics-panel-title"><h3>提交画像雷达图</h3><small>综合衡量活跃、稳定、分散、压力、峰值</small></div>
            <div id="submissionRadar" class="radar-chart"></div>
          </section>
          <section class="analytics-panel">
            <div class="analytics-panel-title"><h3>智能分析结论</h3><small>根据当前数据自动生成运营提示</small></div>
            <div id="submissionInsights" class="insight-grid"></div>
          </section>
          <section class="analytics-panel">
            <div class="analytics-panel-title"><h3>热门提交分类</h3><small>周期内 Top 分类</small></div>
            <div id="submissionCategories" class="analytics-list"></div>
          </section>
          <section class="analytics-panel">
            <div class="analytics-panel-title"><h3>分类占比图</h3><small>观察提交来源是否过度集中</small></div>
            <div id="submissionCategoryDonut" class="donut-panel"></div>
          </section>
          <section class="analytics-panel wide">
            <div class="analytics-panel-title"><h3>最近提交日历</h3><small>按日期观察提交活跃度</small></div>
            <div id="submissionCalendar" class="submission-calendar"></div>
          </section>
          <section class="analytics-panel">
            <div class="analytics-panel-title"><h3>提交质量分析</h3><small>Logo、描述、重复 URL 与完整度</small></div>
            <div id="submissionQuality" class="quality-grid"></div>
          </section>
          <section class="analytics-panel">
            <div class="analytics-panel-title"><h3>Top 提交域名</h3><small>识别用户常提交来源</small></div>
            <div id="submissionDomains" class="analytics-list"></div>
          </section>
          <section class="analytics-panel">
            <div class="analytics-panel-title"><h3>异常波动提醒</h3><small>高于日均的异常提交峰值</small></div>
            <div id="submissionAnomalies" class="analytics-list"></div>
          </section>
          <section class="analytics-panel">
            <div class="analytics-panel-title"><h3>最近提交</h3><small>最新前台提交和后台新增记录</small></div>
            <div id="latestSubmissions" class="analytics-list"></div>
          </section>
        </div>
      </div>

      <div id="categories" class="tab-content">
        <div class="category-toolbar">
          <p class="category-hint">支持分类改名、父子分类，以及图标、颜色和描述。可直接拖拽表格行调整顺序，再点击右上角“保存排序”写入。改名会同步更新现有书签的 Catelog。</p>
          <button id="saveCategoryOrder" type="button" disabled>保存排序</button>
          <button id="refreshCategories" type="button">刷新</button>
        </div>
        <div class="add-new category-add category-add-panel">
          <input type="text" id="newCategoryName" placeholder="新分类名称">
          <select id="newCategoryParent"><option value="">无父类</option></select>
          <input type="text" id="newCategoryIcon" placeholder="图标，可留空；支持 emoji / SVG">
          <div class="category-color-editor category-color-editor-new" title="分类主题色">
            <input type="color" id="newCategoryColor" class="category-color-input category-native-color" value="#b86b4b" title="分类主题色">
          </div>
          <input type="text" id="newCategoryDescription" placeholder="描述（可选）">
          <input type="number" id="newCategorySort" placeholder="排序">
          <button id="createCategoryBtn">新增分类</button>
        </div>
        <div class="table-wrapper">
          <table id="categoryTable">
            <thead>
              <tr>
                <th>ID</th><th>分类名称</th><th>父分类</th><th>图标</th><th>颜色</th><th>描述</th><th>书签数量</th><th>子类数量</th><th>排序值</th><th>操作</th>
              </tr>
            </thead>
            <tbody id="categoryTableBody"><tr><td colspan="10">加载中...</td></tr></tbody>
          </table>
        </div>
      </div>

      <div id="tags" class="tab-content">
        <div class="category-toolbar">
          <p class="category-hint">集中管理标签。当前先支持查看标签使用次数与合并碎片标签，后续会继续加入 AI 自动生成标签、批量补齐标签和标签别名。</p>
          <div class="tag-toolbar-actions">
            <span class="tag-total-badge">当前标签 <strong id="tagTotalCount">--</strong> 个</span>
            <button id="refreshTags" type="button">刷新标签</button>
          </div>
        </div>
        <div class="tag-merge-card">
          <div>
            <strong>标签合并</strong>
            <p class="category-hint">将源标签迁移到目标标签，用于清理 AI / 人工智能 / 大模型 等碎片标签。</p>
          </div>
          <input type="text" id="mergeTagSource" placeholder="源标签，例如 AI">
          <input type="text" id="mergeTagTarget" placeholder="目标标签，例如 人工智能">
          <button type="button" id="mergeTagsBtn">合并标签</button>
          <button type="button" id="suggestTagMergesBtn" class="check-btn">AI建议</button>
        </div>
        <div id="tagMergeSuggestions" class="ai-status" style="display:none;"></div>
        <div class="tag-review-card">
          <div class="category-toolbar">
            <p class="category-hint">待补标签书签：先筛出没有标签或标签较少的书签，后续会在这里继续扩展批量 AI 推荐预览和确认应用。</p>
            <div class="tag-review-controls">
              <label>最多显示 <input type="number" id="tagReviewLimit" value="20" min="1" max="100"></label>
              <label>标签数 ≤ <input type="number" id="tagReviewMaxTags" value="0" min="0" max="5"></label>
              <button id="refreshTagReview" type="button">查找待补标签</button>
              <button id="batchSuggestTags" type="button" class="check-btn">批量 AI 预览</button>
            </div>
          </div>
          <div class="table-wrapper">
            <table id="tagReviewTable">
              <thead>
                <tr>
                  <th><input type="checkbox" id="selectAllTagReview" title="全选候选"></th><th>ID</th><th>名称</th><th>分类</th><th>当前标签数</th><th>操作</th>
                </tr>
              </thead>
              <tbody id="tagReviewTableBody"><tr><td colspan="6">点击“查找待补标签”加载候选书签</td></tr></tbody>
            </table>
          </div>
          <div id="tagSuggestPreview" class="ai-status" style="display:none;"></div>
        </div>
        <div class="table-wrapper">
          <table id="tagTable">
            <thead>
              <tr>
                <th>ID</th><th>标签名称</th><th>书签数量</th><th>操作</th>
              </tr>
            </thead>
            <tbody id="tagTableBody"><tr><td colspan="4">加载中...</td></tr></tbody>
          </table>
        </div>
      </div>

      <div id="privateBookmarks" class="tab-content">
        <div class="category-toolbar">
          <p class="category-hint">前台分类列表底部固定显示“私人书签”。访客访问该分类需要输入这里配置的访问密码；管理员登录后无需密码。</p>
        </div>
        <div class="private-settings-card">
          <label for="privateBookmarkPassword">私人书签访问密码</label>
          <div class="private-password-row">
            <input type="password" id="privateBookmarkPassword" placeholder="请输入新的访问密码">
            <button type="button" id="togglePrivatePassword">显示</button>
            <button type="button" id="savePrivatePassword">保存密码</button>
          </div>
          <p class="category-hint">未设置时默认密码为 123456；也可通过环境变量 PRIVATE_BOOKMARKS_PASSWORD 覆盖默认值。请将私人站点的 Catelog 设置为“私人书签”。</p>
        </div>
      </div>

      <div id="systemSettings" class="tab-content">
        <div class="category-toolbar">
          <p class="category-hint">配置站点品牌、首页文案和系统公告。公告支持 Markdown 语法，会以前台弹窗形式展示。</p>
          <button id="refreshSystemSettings" type="button">刷新配置</button>
        </div>
        <div class="private-settings-card ai-settings-card system-settings-card">
          <label for="systemSiteName">网站名称</label>
          <input type="text" id="systemSiteName" placeholder="星漫旅站">
          <label for="systemSiteSubtitle">首页副标题</label>
          <input type="text" id="systemSiteSubtitle" placeholder="收藏、整理与发现你的常用网站">
          <label for="systemSiteIcon">网站图标 URL</label>
          <div class="private-password-row">
            <input type="text" id="systemSiteIcon" placeholder="/pwa-icon.svg 或 https://...">
            <button type="button" id="previewSystemIcon">预览图标</button>
          </div>
          <label for="systemFooterText">页脚补充文字</label>
          <input type="text" id="systemFooterText" placeholder="可选，例如备案号、联系方式或版权说明">
          <label><input type="checkbox" id="systemBlogVisible"> 显示前台博客入口</label>
          <div class="system-settings-grid">
            <div>
              <label for="systemBlogUrl">博客入口 URL</label>
              <input type="text" id="systemBlogUrl" placeholder="https://blog.example.com/">
            </div>
            <div>
              <label for="systemBlogLabel">博客入口文字</label>
              <input type="text" id="systemBlogLabel" placeholder="访问博客">
            </div>
          </div>
          <label for="systemBackgroundImage">首页背景图片 URL</label>
          <input type="text" id="systemBackgroundImage" placeholder="可选，填写后作为访客默认背景图片">
          <div class="system-settings-grid">
            <div>
              <label for="systemDefaultLayout">默认首页布局</label>
              <select id="systemDefaultLayout">
                <option value="">默认卡片</option>
                <option value="grid">卡片</option>
                <option value="list">列表</option>
                <option value="grouped">分组</option>
                <option value="masonry">瀑布</option>
                <option value="dashboard">概览</option>
              </select>
            </div>
            <div>
              <label for="systemDefaultAccent">默认主题色</label>
              <select id="systemDefaultAccent">
                <option value="">默认星空蓝</option>
                <option value="blue">星空蓝</option>
                <option value="green">森林绿</option>
                <option value="purple">暮光紫</option>
                <option value="rose">蔷薇红</option>
                <option value="amber">琥珀金</option>
              </select>
            </div>
          </div>
          <label><input type="checkbox" id="systemHeroVisible"> 显示首页顶部横幅</label>
          <label><input type="checkbox" id="announcementEnabled"> 启用前台弹窗公告</label>
          <label for="announcementTitle">公告标题</label>
          <input type="text" id="announcementTitle" placeholder="系统公告">
          <label for="announcementMarkdown">公告内容（Markdown）</label>
          <textarea id="announcementMarkdown" rows="8" placeholder="支持标题、列表、链接、加粗、代码块等 Markdown 语法"></textarea>
          <div class="system-settings-grid">
            <div>
              <label for="announcementVersion">公告版本</label>
              <input type="text" id="announcementVersion" placeholder="修改版本号可让用户重新看到公告">
            </div>
            <div>
              <label for="announcementButtonText">按钮文字</label>
              <input type="text" id="announcementButtonText" placeholder="我知道了">
            </div>
          </div>
          <label><input type="checkbox" id="announcementShowOnce"> 同一版本每位访客只显示一次</label>
          <div class="ai-actions">
            <button type="button" id="saveSystemSettings">保存系统设置</button>
            <button type="button" id="previewAnnouncement" class="check-btn">预览公告</button>
            <button type="button" id="bumpAnnouncementVersion" class="secondary-btn">递增公告版本</button>
          </div>
          <div id="systemSettingsStatus" class="ai-status" style="display:none;"></div>
          <div id="announcementPreview" class="announcement-preview" style="display:none;"></div>
          <p class="category-hint">建议在更新公告内容后递增公告版本；开启“只显示一次”时，访客关闭后同版本不会重复弹出。</p>
        </div>
      </div>

      <div id="aiAssistant" class="tab-content">
        <div class="category-toolbar">
          <p class="category-hint">配置 OpenAI 兼容大模型 API。当前用于前台 AI 助理、分类推荐、标签推荐、标签合并建议等功能；未配置 API Key 时相关能力会使用本地规则兜底。</p>
          <button id="refreshAiSettings" type="button">刷新配置</button>
        </div>
        <div class="private-settings-card ai-settings-card">
          <label><input type="checkbox" id="aiEnabled"> 启用大语言模型回复</label>
          <label for="aiBaseUrl">接口地址（OpenAI Chat Completions 兼容）</label>
          <input type="text" id="aiBaseUrl" placeholder="https://api.openai.com/v1/chat/completions">
          <label for="aiModel">模型名称</label>
          <div class="private-password-row">
            <input type="text" id="aiModel" list="aiModelList" placeholder="gpt-4o-mini">
            <datalist id="aiModelList"></datalist>
            <button type="button" id="fetchAiModels">获取可用模型</button>
          </div>
          <label for="aiApiKey">API Key</label>
          <div class="private-password-row">
            <input type="password" id="aiApiKey" autocomplete="off" placeholder="留空表示不修改现有 Key">
            <button type="button" id="toggleAiApiKey">显示</button>
          </div>
          <label for="aiSystemPrompt">系统提示词</label>
          <textarea id="aiSystemPrompt" rows="5" placeholder="定义大模型回复风格和规则"></textarea>
          <div class="ai-actions">
            <button type="button" id="saveAiSettings">保存 API 设置</button>
            <button type="button" id="testAiSettings" class="check-btn">测试连接</button>
          </div>
          <div id="aiSettingsStatus" class="ai-status" style="display:none;"></div>
          <p class="category-hint">建议使用支持 OpenAI Chat Completions 格式的服务。可先获取模型列表或测试连接，确认可用后再保存。</p>
        </div>
      </div>

      <div id="apiTokens" class="tab-content">
        <div class="category-toolbar">
          <p class="category-hint">为浏览器插件、脚本或第三方客户端创建 Bearer Token。Token 只在创建时完整显示一次，请立即复制保存。</p>
          <button id="refreshApiTokens" type="button">刷新 Token</button>
        </div>
        <div class="private-settings-card ai-settings-card">
          <label for="newTokenName">Token 名称</label>
          <input type="text" id="newTokenName" placeholder="例如：浏览器插件">
          <label for="newTokenScopes">权限范围</label>
          <select id="newTokenScopes">
            <option value="write" selected>write：浏览器插件/脚本写入书签</option>
            <option value="read,write">read + write：读写书签</option>
            <option value="admin">admin：高权限 Token（谨慎）</option>
          </select>
          <div class="ai-actions">
            <button type="button" id="createBrowserToken" class="check-btn">一键生成浏览器插件 Token</button>
            <button type="button" id="createApiToken">创建自定义 Token</button>
          </div>
          <div id="newTokenBox" class="ai-status" style="display:none;"></div>
          <p class="category-hint">安全提示：不要把 Token 发给他人。设备丢失或 Token 泄露时，请立即在下方列表撤销。</p>
        </div>
        <div class="table-wrapper" style="margin-top:14px">
          <table id="apiTokenTable">
            <thead>
              <tr>
                <th>名称</th><th>权限</th><th>创建时间</th><th>最后使用</th><th>状态</th><th>操作</th>
              </tr>
            </thead>
            <tbody id="apiTokenTableBody"><tr><td colspan="6">点击“刷新 Token”加载列表</td></tr></tbody>
          </table>
        </div>
      </div>

      <div id="visitAnalytics" class="tab-content">
        <div class="category-toolbar">
          <p class="category-hint">访问分析综合呈现书签点击排行、分类热度、搜索词统计与无结果关键词。前台访客通过 /go/:id 访问书签时自动累计 hits 与 last_visit_time。</p>
          <button id="refreshVisitAnalytics" type="button">刷新分析</button>
        </div>
        <div class="analytics-summary">
          <div class="analytics-card"><span>🔖</span><strong id="vaTotalSites">--</strong><small>书签总数</small></div>
          <div class="analytics-card"><span>👆</span><strong id="vaTotalHits">--</strong><small>累计点击</small></div>
          <div class="analytics-card"><span>💤</span><strong id="vaNeverVisited">--</strong><small>从未访问</small></div>
          <div class="analytics-card"><span>📅</span><strong id="vaStale30d">--</strong><small>30 天未访问</small></div>
        </div>
        <div id="visitAnalyticsStatus" class="ai-status" style="display:none;"></div>
        <div class="analytics-grid">
          <section class="analytics-panel wide">
            <div class="analytics-panel-title"><h3>书签点击排行</h3><small>累计 hits 最高的前 20 个书签</small></div>
            <div id="vaTopSites" class="analytics-list"></div>
          </section>
          <section class="analytics-panel">
            <div class="analytics-panel-title"><h3>分类访问热度</h3><small>分类内书签累计 hits 总和</small></div>
            <div id="vaCategoryHeat" class="analytics-list"></div>
          </section>
          <section class="analytics-panel">
            <div class="analytics-panel-title"><h3>最近被访问</h3><small>按 last_visit_time 倒序</small></div>
            <div id="vaRecentlyActive" class="analytics-list"></div>
          </section>
          <section class="analytics-panel">
            <div class="analytics-panel-title"><h3>热门搜索词</h3><small>按搜索次数倒序</small></div>
            <div id="vaPopularSearches" class="analytics-list"></div>
          </section>
          <section class="analytics-panel">
            <div class="analytics-panel-title"><h3>无结果关键词</h3><small>用于补充缺失书签</small></div>
            <div id="vaZeroResultSearches" class="analytics-list"></div>
          </section>
          <section class="analytics-panel wide">
            <div class="analytics-panel-title"><h3>长期未访问书签</h3><small>从未访问或 60 天未访问，可考虑清理或重新推广</small></div>
            <div id="vaInactiveSites" class="analytics-list"></div>
          </section>
        </div>
      </div>

      <div id="backups" class="tab-content">
        <div class="category-toolbar">
          <p class="category-hint">手动或定时备份书签数据到 KV 存储，最多保留 30 份。启用 WebDAV 后，每次创建备份会额外上传一份 JSON 文件到远程存储。定时备份需在 wrangler.toml 配置 Cron Trigger。</p>
          <div class="backup-controls">
            <button id="createBackupBtn" type="button">立即备份</button>
            <button id="refreshBackups" type="button" class="secondary-btn">刷新列表</button>
          </div>
        </div>
        <section class="webdav-card">
          <div class="webdav-card-head">
            <div>
              <span class="webdav-eyebrow">Remote Backup</span>
              <h3>WebDAV 远程备份</h3>
              <p>支持坚果云、Alist、Nextcloud、Koofr 等兼容 WebDAV 的服务。启用后，每次 KV 备份会同步上传一份 JSON 到远程目录。</p>
            </div>
            <span class="webdav-badge">双重备份</span>
          </div>
          <div class="webdav-form-grid">
            <label class="webdav-field webdav-enabled-field">
              <span>启用状态</span>
              <select id="webdavEnabled"><option value="false">关闭</option><option value="true">开启</option></select>
            </label>
            <label class="webdav-field webdav-url-field">
              <span>WebDAV URL</span>
              <input id="webdavUrl" type="url" placeholder="https://dav.example.com/dav">
            </label>
            <label class="webdav-field">
              <span>用户名</span>
              <input id="webdavUsername" type="text" autocomplete="username" placeholder="WebDAV 账号">
            </label>
            <label class="webdav-field">
              <span>密码 / 应用密码</span>
              <input id="webdavPassword" type="password" autocomplete="new-password" placeholder="留空则不修改已保存密码">
            </label>
            <label class="webdav-field">
              <span>远程目录</span>
              <input id="webdavPath" type="text" placeholder="StarNav">
            </label>
          </div>
          <div class="webdav-actions">
            <div>
              <button id="saveWebdavSettings" type="button">保存设置</button>
              <button id="testWebdavSettings" type="button" class="check-btn">测试连接</button>
            </div>
            <span id="webdavPasswordHint" class="webdav-hint"></span>
          </div>
        </section>
        <div id="backupStatus" class="ai-status" style="display:none;"></div>
        <div class="table-wrapper">
          <table id="backupTable">
            <thead>
              <tr>
                <th>备份ID</th><th>来源</th><th>书签数</th><th>分类数</th><th>大小</th><th>创建时间</th><th>备注</th><th>操作</th>
              </tr>
            </thead>
            <tbody id="backupTableBody"><tr><td colspan="8">点击"刷新列表"加载备份</td></tr></tbody>
          </table>
        </div>
      </div>

      <div id="operationLogs" class="tab-content">
        <div class="category-toolbar">
          <p class="category-hint">记录后台关键写操作（新增 / 修改 / 删除 / 批量 / 导入 / 审核 / 标签合并 / 排序等），方便追踪和审计。</p>
          <div class="operation-log-controls">
            <select id="operationLogActionFilter" title="按操作类型筛选">
              <option value="">全部操作</option>
              <option value="site.create">新增书签</option>
              <option value="site.update">编辑书签</option>
              <option value="site.delete">删除书签</option>
              <option value="site.bulk_update">批量修改书签</option>
              <option value="site.bulk_delete">批量删除书签</option>
              <option value="site.bulk_check">批量检测书签</option>
              <option value="site.bulk_favicon">批量刷新图标</option>
              <option value="site.reorder">书签排序</option>
              <option value="site.import">导入书签</option>
              <option value="category.create">新增分类</option>
              <option value="category.update">编辑分类</option>
              <option value="category.delete">删除分类</option>
              <option value="category.reorder">分类排序</option>
              <option value="tag.merge">合并标签</option>
              <option value="tag.apply_suggestions">应用标签建议</option>
              <option value="pending.approve">通过待审核</option>
              <option value="pending.reject">拒绝待审核</option>
              <option value="backup.create">创建备份</option>
              <option value="backup.restore">恢复备份</option>
              <option value="backup.delete">删除备份</option>
            </select>
            <button id="refreshOperationLogs" type="button">刷新</button>
          </div>
        </div>
        <div class="table-wrapper">
          <table id="operationLogTable">
            <thead>
              <tr>
                <th>时间</th><th>操作</th><th>对象</th><th>对象ID</th><th>摘要</th><th>IP</th>
              </tr>
            </thead>
            <tbody id="operationLogTableBody"><tr><td colspan="6">点击“刷新”加载操作日志</td></tr></tbody>
          </table>
          <div class="pagination">
            <button id="operationLogPrev" disabled>上一页</button>
            <span id="operationLogCurrentPage">1</span>/<span id="operationLogTotalPages">1</span>
            <button id="operationLogNext" disabled>下一页</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script src="/static/admin.js"></script>
</body>
</html>`;

export const adminCss = `body{font-family:'Noto Sans SC',sans-serif;margin:0;padding:10px;background-color:#f8f9fa;color:#212529}.container{max-width:1200px;margin:0 auto;background:#fff;padding:20px;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,.1)}.admin-header{display:flex;flex-direction:column;gap:12px;margin-bottom:24px}@media(min-width:768px){.admin-header{flex-direction:row;align-items:center;justify-content:space-between}}h1{font-size:1.75rem;margin:0;color:#343a40}.admin-subtitle{margin:4px 0 0;color:#6c757d;font-size:.95rem}.logout-btn{background:#f8f9fa;color:#495057;border:1px solid #ced4da;padding:8px 14px;border-radius:6px;cursor:pointer}.tab-wrapper{margin-top:20px}.tab-buttons{display:flex;margin-bottom:10px;flex-wrap:wrap}.tab-button{background:#e9ecef;border:1px solid #dee2e6;padding:10px 15px;border-radius:4px 4px 0 0;cursor:pointer;color:#495057}.tab-button.active{background:#fff;border-bottom:1px solid #fff;color:#212529}.tab-content{display:none;border:1px solid #dee2e6;padding:10px;border-top:none}.tab-content.active{display:block}.import-export,.add-new{display:flex;gap:10px;margin-bottom:20px;justify-content:flex-end;flex-wrap:wrap}.add-new{justify-content:flex-start}.add-new>input,.add-new>select,.logo-field{flex:1 1 150px;min-width:150px}.logo-field{display:flex;flex-direction:column;gap:4px}.logo-field button{padding:6px 8px;font-size:.8rem}.bulk-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px}.bulk-toolbar input[type=text]{margin-bottom:0;min-width:160px}.bulk-toolbar select{margin-bottom:0}.bulk-select-all{display:flex;align-items:center;gap:6px;color:#495057;font-weight:600}#selectedCount{color:#6c757d;font-size:.9rem;margin-right:auto}.config-select,#selectAllConfigs,#selectAllConfigsHead{width:16px;height:16px;cursor:pointer}input[type=text],input[type=url],input[type=number],input[type=password],select{padding:10px;border:1px solid #ced4da;border-radius:4px;font-size:1rem;outline:none;margin-bottom:5px;transition:border-color .2s}input:focus,select:focus{border-color:#80bdff;box-shadow:0 0 0 .2rem rgba(0,123,255,.25)}button{background:#b86b4b;color:#fff;border:none;padding:10px 15px;border-radius:4px;cursor:pointer;font-size:1rem;transition:background-color .3s}button:hover{background:#985a40}button:disabled{opacity:.55;cursor:not-allowed}.table-wrapper{overflow-x:auto}table{width:100%;min-width:980px;border-collapse:collapse;margin-bottom:20px}th,td{border:1px solid #dee2e6;padding:10px;text-align:left;color:#495057;vertical-align:top}th{background:#f2f2f2;font-weight:600}tr:nth-child(even){background:#f9f9f9}.actions,.category-actions{display:flex;gap:5px;flex-wrap:wrap}.actions button,.category-actions button{padding:5px 8px;font-size:.8rem}.edit-btn{background:#17a2b8}.check-btn{background:#20c997}.del-btn{background:#dc3545}.health{display:inline-flex;align-items:center;white-space:nowrap;border-radius:999px;padding:3px 8px;font-size:.78rem;font-weight:600}.health-unknown{background:#e9ecef;color:#6c757d}.health-ok{background:#d4edda;color:#155724}.health-bad{background:#f8d7da;color:#721c24}.pagination{text-align:center;margin-top:20px}.pagination button{margin:0 5px;background:#e9ecef;color:#495057;border:1px solid #ced4da}.success{background:#28a745;color:#fff;padding:1rem;border-radius:.5rem;margin-bottom:1rem}.error{background:#dc3545;color:#fff;padding:1rem;border-radius:.5rem;margin-bottom:1rem}.category-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;flex-wrap:wrap}.category-hint{margin:0;font-size:.85rem;color:#6c757d}.modal{display:none;position:fixed;z-index:1000;left:0;top:0;width:100%;height:100%;overflow:auto;background:rgba(0,0,0,.5)}.modal-content{background:#fff;margin:8% auto;padding:20px;border:1px solid #dee2e6;width:80%;max-width:600px;border-radius:8px;position:relative;box-shadow:0 2px 10px rgba(0,0,0,.1)}.modal-close{color:#6c757d;position:absolute;right:10px;top:0;font-size:28px;font-weight:bold;cursor:pointer}.modal-content form{display:flex;flex-direction:column}.modal-content label{margin-bottom:5px;font-weight:500;color:#495057}.modal-content input{margin-bottom:10px}#adminFaviconStatus{padding:.5rem;border-radius:.25rem;margin-bottom:1rem;font-size:.85rem}.status-loading{background:#fff3cd!important;color:#856404!important;border:1px solid #ffeaa7!important}.status-success{background:#d4edda!important;color:#155724!important;border:1px solid #c3e6cb!important}.status-error{background:#f8d7da!important;color:#721c24!important;border:1px solid #f5c6cb!important}.private-settings-card{border:1px solid #dee2e6;border-radius:8px;padding:16px;background:#f8f9fa;max-width:720px}.private-settings-card label{display:block;font-weight:700;margin-bottom:8px;color:#343a40}.private-password-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px}.private-password-row input{flex:1 1 260px}textarea{padding:10px;border:1px solid #ced4da;border-radius:4px;font-size:1rem;outline:none;margin-bottom:5px;transition:border-color .2s;box-sizing:border-box;width:100%;resize:vertical;font-family:inherit}textarea:focus{border-color:#80bdff;box-shadow:0 0 0 .2rem rgba(0,123,255,.25)}.ai-settings-card{display:flex;flex-direction:column;gap:8px}.ai-settings-card input[type=checkbox]{margin-right:6px}.ai-actions{display:flex;gap:10px;flex-wrap:wrap}.ai-status{padding:10px;border-radius:6px;border:1px solid #dee2e6;background:#fff;color:#495057;white-space:pre-wrap;font-size:.9rem}.ai-status.success{background:#d4edda;color:#155724;border-color:#c3e6cb}.ai-status.error{background:#f8d7da;color:#721c24;border-color:#f5c6cb}.ai-status.loading{background:#fff3cd;color:#856404;border-color:#ffeaa7}
/* modern admin ui */
:root{--admin-bg:#f4f1ec;--admin-surface:#fffaf3;--admin-surface-2:#f7efe4;--admin-text:#24211d;--admin-muted:#756b5d;--admin-line:#e6d9c8;--admin-accent:#b86b4b;--admin-accent-2:#2f6f5e;--admin-accent-3:#d8a24a;--admin-danger:#b84a4a;--admin-shadow:0 18px 48px rgba(71,52,35,.12)}body{background:radial-gradient(circle at 16% 0%,rgba(216,162,74,.18),transparent 32%),radial-gradient(circle at 86% 8%,rgba(47,111,94,.14),transparent 30%),linear-gradient(135deg,#f4f1ec 0%,#fbf7f0 52%,#efe7dc 100%);min-height:100vh}.container{max-width:1440px;border-radius:24px;padding:24px;background:rgba(255,250,243,.92);backdrop-filter:blur(18px);box-shadow:var(--admin-shadow);border:1px solid rgba(230,217,200,.72)}.admin-header{border-bottom:1px solid #e5e7eb;padding-bottom:18px}.admin-header h1{letter-spacing:-.03em}.logout-btn{border-radius:999px;background:#fff}.import-export{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:12px;box-shadow:0 10px 26px rgba(15,23,42,.06)}.add-new{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:16px;box-shadow:0 10px 26px rgba(15,23,42,.06)}#searchInput{display:block;width:100%;box-sizing:border-box;margin:0 0 16px;padding:14px 16px;border-radius:14px;background:#fff;border:1px solid #dbe3ef}.admin-overview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:18px 0}.stat-card{display:flex;align-items:center;gap:12px;border:1px solid #e5e7eb;border-radius:18px;background:linear-gradient(180deg,#fff,#f8fafc);padding:16px;box-shadow:0 12px 30px rgba(15,23,42,.07)}.stat-icon{display:flex;width:42px;height:42px;align-items:center;justify-content:center;border-radius:14px;background:#f1e3d1;font-size:1.25rem}.stat-card strong{display:block;font-size:1.45rem;color:#111827;line-height:1}.stat-card small{display:block;margin-top:5px;color:#64748b}.tab-wrapper{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px;align-items:start}.tab-buttons{position:sticky;top:16px;display:flex;flex-direction:column;gap:8px;margin:0;border:1px solid #e5e7eb;border-radius:18px;background:#fff;padding:10px;box-shadow:0 12px 30px rgba(15,23,42,.06)}.tab-button{width:100%;border-radius:12px;border:0;background:transparent;text-align:left;color:#475569;font-weight:700}.tab-button:hover{background:#f1f5f9}.tab-button.active{background:#b86b4b;color:#fff;border:0;box-shadow:0 10px 18px rgba(36,33,29,.18)}.tab-content{border:1px solid #e5e7eb;border-radius:18px;background:#fff;padding:16px;box-shadow:0 12px 30px rgba(15,23,42,.06)}.bulk-toolbar,.category-toolbar,.private-settings-card{box-shadow:0 8px 22px rgba(15,23,42,.045)}.table-wrapper{border:1px solid #e5e7eb;border-radius:16px;background:#fff;overflow:auto;max-height:70vh}table{margin-bottom:0}thead th{position:sticky;top:0;z-index:2;background:#f8fafc;color:#334155}th,td{border-left:0;border-right:0}.actions button,.category-actions button{border-radius:999px}.tag-pill{display:inline-flex;margin:2px;border-radius:999px;background:#f1e3d1;color:#8a553d;padding:2px 7px;font-size:.75rem}.empty-state{padding:28px!important;text-align:center;color:#64748b}.modal-content{border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.22)}@media(max-width:980px){.admin-overview{grid-template-columns:repeat(2,minmax(0,1fr))}.tab-wrapper{display:block}.tab-buttons{position:static;flex-direction:row;overflow-x:auto;margin-bottom:12px}.tab-button{white-space:nowrap;text-align:center}.container{padding:14px;border-radius:14px}}@media(max-width:640px){body{padding:0}.admin-overview{grid-template-columns:1fr}.container{border-radius:0}.import-export,.add-new{justify-content:stretch}.import-export button,.add-new button{width:100%}input[type=text],input[type=url],input[type=number],input[type=password],select,textarea{width:100%;box-sizing:border-box}.table-wrapper{max-height:none}}

.inline-input{width:100%;min-width:120px;box-sizing:border-box;padding:8px 10px;border-radius:10px;border:1px solid #dbe3ef;background:#fff;font-size:.9rem}.inline-input:focus{border-color:#b86b4b;box-shadow:0 0 0 3px rgba(184,107,75,.14)}.save-inline-btn{background:#b86b4b}.secondary-btn{background:#f1f5f9!important;color:#475569!important;border:1px solid #cbd5e1!important}.confirm-content{max-width:420px}.confirm-content p{color:#64748b;line-height:1.6}.confirm-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.loading-state{padding:30px!important;text-align:center;color:#64748b}.loading-spinner{display:inline-block;width:16px;height:16px;margin-right:8px;border:2px solid #ead4bd;border-top-color:#b86b4b;border-radius:50%;vertical-align:-3px;animation:adminSpin .8s linear infinite}.empty-state .empty-icon{font-size:2rem;margin-bottom:8px}.empty-state strong{display:block;color:#334155;margin-bottom:4px}.empty-state p{margin:0;color:#64748b}@keyframes adminSpin{to{transform:rotate(360deg)}}

\n\n/* compact add bookmark submit row */\n.add-new .add-submit-row{display:flex;align-items:center;gap:8px;flex:0 0 auto;min-width:220px}.add-new .add-submit-row input{width:120px;min-width:100px;margin-bottom:0}.add-new .add-submit-row button{white-space:nowrap;margin-bottom:0;padding-left:18px;padding-right:18px}@media(max-width:640px){.add-new .add-submit-row{width:100%;display:grid;grid-template-columns:1fr auto}.add-new .add-submit-row input{width:100%;min-width:0}.add-new .add-submit-row button{width:auto}}\n/* compact header actions */\n.admin-header-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}.admin-header-actions .import-export{margin:0;padding:0;background:transparent;border:0;box-shadow:none;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.admin-header-actions .import-export button,.admin-header-actions .logout-btn{padding:8px 12px;font-size:.9rem}.admin-header-actions form{margin:0}@media(max-width:768px){.admin-header-actions{justify-content:flex-start;width:100%}.admin-header-actions .import-export{justify-content:flex-start}.admin-header-actions .import-export button,.admin-header-actions .logout-btn{width:auto}}@media(max-width:520px){.admin-header-actions,.admin-header-actions .import-export{display:grid;grid-template-columns:1fr 1fr;width:100%}.admin-header-actions form{display:contents}.admin-header-actions .import-export button,.admin-header-actions .logout-btn{width:100%}}\n/* refined non-ai admin skin */
h1,.analytics-panel-title h3{color:var(--admin-text)}.admin-subtitle,.category-hint,.analytics-panel-title small,.stat-card small,.analytics-card small{color:var(--admin-muted)}button{background:var(--admin-accent);border-radius:12px;box-shadow:none}button:hover{background:#985a40}.check-btn{background:var(--admin-accent-2)}.check-btn:hover{background:#285f51}.del-btn{background:var(--admin-danger)}.del-btn:hover{background:#963d3d}.edit-btn,.save-inline-btn{background:var(--admin-accent-2)}input[type=text],input[type=url],input[type=number],input[type=password],select,textarea,.inline-input{border-color:var(--admin-line);background:#fffdf8;color:var(--admin-text);border-radius:12px}input:focus,select:focus,textarea:focus,.inline-input:focus{border-color:var(--admin-accent);box-shadow:0 0 0 3px rgba(184,107,75,.14)}.admin-header{border-bottom-color:var(--admin-line)}.import-export,.add-new,.tab-buttons,.tab-content,.stat-card,.analytics-card,.analytics-panel,.table-wrapper,.private-settings-card{background:rgba(255,250,243,.92);border-color:var(--admin-line);box-shadow:0 12px 34px rgba(71,52,35,.08)}.stat-icon,.analytics-card span{background:#f1e3d1}.tab-button{color:var(--admin-muted);border-radius:14px}.tab-button:hover{background:#f3eadf;color:var(--admin-text)}.tab-button.active{background:linear-gradient(135deg,var(--admin-text),#5e4a3c);color:#fff;box-shadow:0 12px 22px rgba(36,33,29,.18)}thead th{background:#f3eadf;color:#4b4035}.tag-pill{background:#efe1cf;color:#8a553d}.health-unknown{background:#efe7dc;color:#756b5d}.health-ok{background:#dfeee5;color:#2f6f5e}.health-bad{background:#f2d9d3;color:#963d3d}.pagination button,.secondary-btn{background:#f3eadf!important;color:#5d5146!important;border-color:var(--admin-line)!important}.trend-bar{background:linear-gradient(180deg,var(--admin-accent-3),var(--admin-accent));box-shadow:0 6px 12px rgba(184,107,75,.18)}.heat-0{background:#efe7dc}.heat-1{background:#ead4bd}.heat-2{background:#d8a24a}.heat-3{background:#b86b4b}.heat-4{background:#5e4a3c}.heatmap-legend i{background:#ead4bd}.heatmap-legend .l2{background:#d8a24a}.heatmap-legend .l3{background:#b86b4b}.heatmap-legend .l4{background:#5e4a3c}.analytics-meter span{background:linear-gradient(90deg,var(--admin-accent-3),var(--admin-accent))}
.radar-chart{display:flex;align-items:center;justify-content:center;min-height:320px}.radar-chart svg{max-width:360px;width:100%;height:auto}.radar-grid{fill:none;stroke:#e6d9c8;stroke-width:1}.radar-axis{stroke:#d7c6b4;stroke-width:1}.radar-area{fill:rgba(184,107,75,.22);stroke:var(--admin-accent);stroke-width:2}.radar-point{fill:var(--admin-accent)}.radar-label{font-size:12px;fill:#5d5146;font-weight:700}.radar-score{font-size:11px;fill:#8a7b69}.insight-grid{display:grid;gap:10px}.insight-card{border:1px solid var(--admin-line);border-radius:16px;padding:12px;background:linear-gradient(180deg,#fffdf8,#f7efe4)}.insight-card strong{display:block;color:var(--admin-text);margin-bottom:4px}.insight-card p{margin:0;color:var(--admin-muted);line-height:1.55;font-size:.9rem}.donut-panel{display:grid;place-items:center;gap:12px;min-height:260px}.donut-chart{width:190px;height:190px;border-radius:50%;position:relative;background:conic-gradient(var(--admin-accent) 0deg,var(--admin-accent) 20deg,#ead4bd 20deg,#ead4bd 360deg)}.donut-chart::after{content:attr(data-total);position:absolute;inset:42px;border-radius:50%;background:#fffaf3;display:grid;place-items:center;color:var(--admin-text);font-weight:800;font-size:1.4rem}.donut-legend{display:flex;flex-direction:column;gap:6px;width:100%}.donut-legend span{display:flex;justify-content:space-between;gap:10px;color:var(--admin-muted);font-size:.88rem}.donut-dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:6px}


/* analytics pro upgrade */
.analytics-card{position:relative;align-items:flex-start}.analytics-card em{display:inline-flex;margin-top:7px;padding:3px 8px;border-radius:999px;background:#f3eadf;color:var(--admin-muted);font-style:normal;font-size:.76rem;font-weight:700}.analytics-card em.up{background:#e4efe7;color:#2f6f5e}.analytics-card em.down{background:#f2d9d3;color:#963d3d}.analytics-ops-strip{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);gap:14px;margin:0 0 14px}.pressure-widget,.review-window-widget{border:1px solid var(--admin-line);border-radius:18px;padding:16px;background:linear-gradient(180deg,#fffdf8,#f7efe4);box-shadow:0 10px 26px rgba(71,52,35,.07)}.pressure-head{display:flex;justify-content:space-between;align-items:center;gap:10px;color:var(--admin-muted);font-weight:700}.pressure-head strong{font-size:1.8rem;color:var(--admin-text)}.pressure-track{height:10px;border-radius:999px;background:#eadfce;overflow:hidden;margin:10px 0}.pressure-track i{display:block;height:100%;width:0;background:linear-gradient(90deg,#2f6f5e,#d8a24a,#b84a4a);border-radius:999px;transition:width .3s}.pressure-widget p,.review-window-widget p{margin:0;color:var(--admin-text);line-height:1.5}.review-window-widget strong{display:block;color:var(--admin-text);margin-bottom:8px}.review-window-widget small{display:block;margin-top:8px;color:var(--admin-muted);line-height:1.5}.quality-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.quality-card{border:1px solid var(--admin-line);border-radius:16px;padding:12px;background:#fffdf8}.quality-card strong{display:block;color:var(--admin-text);font-size:1.25rem}.quality-card small{color:var(--admin-muted)}.quality-meter{height:7px;border-radius:999px;background:#eadfce;margin-top:8px;overflow:hidden}.quality-meter span{display:block;height:100%;background:linear-gradient(90deg,var(--admin-accent-2),var(--admin-accent-3))}.submission-calendar{display:grid;grid-template-columns:repeat(auto-fill,minmax(28px,1fr));gap:6px}.calendar-cell{height:28px;border-radius:8px;background:#efe7dc;position:relative}.calendar-cell:hover::after{content:attr(title);position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);white-space:nowrap;background:#111827;color:#fff;padding:5px 8px;border-radius:8px;font-size:.75rem;z-index:5}.cal-0{background:#efe7dc}.cal-1{background:#ead4bd}.cal-2{background:#d8c08d}.cal-3{background:#d8a24a}.cal-4{background:#b86b4b}.domain-host{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.anomaly-high{border-color:#e0b0a4;background:#fff7f4}@media(max-width:800px){.analytics-ops-strip{grid-template-columns:1fr}.quality-grid{grid-template-columns:1fr}}

/* submission analytics */
.analytics-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.analytics-controls select{margin:0}.analytics-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:14px 0}.analytics-card{display:flex;align-items:center;gap:12px;border:1px solid #e5e7eb;border-radius:18px;padding:16px;background:linear-gradient(180deg,#fff,#f8fafc);box-shadow:0 10px 26px rgba(15,23,42,.06)}.analytics-card span{display:flex;width:40px;height:40px;align-items:center;justify-content:center;border-radius:14px;background:#f1e3d1}.analytics-card strong{display:block;font-size:1.35rem;color:#111827}.analytics-card small{display:block;color:#64748b}.analytics-status{border:1px solid #e5e7eb;border-radius:16px;background:#fff;margin-bottom:14px}.analytics-status.is-hidden{display:none}.analytics-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.analytics-panel{border:1px solid #e5e7eb;border-radius:18px;background:#fff;padding:16px;box-shadow:0 10px 26px rgba(15,23,42,.05);overflow:hidden}.analytics-panel.wide{grid-column:1/-1}.analytics-panel-title{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin-bottom:14px}.analytics-panel-title h3{margin:0;color:#111827;font-size:1.05rem}.analytics-panel-title small{color:#64748b}.daily-trend{display:flex;align-items:flex-end;gap:4px;min-height:180px;padding:12px;border-radius:14px;background:linear-gradient(180deg,#f8fafc,#fff);overflow-x:auto}.trend-bar{min-width:10px;flex:1;border-radius:999px 999px 4px 4px;background:linear-gradient(180deg,#d8a24a,#b86b4b);position:relative;box-shadow:0 6px 12px rgba(184,107,75,.18)}.trend-bar.zero{background:#e2e8f0;box-shadow:none}.trend-bar:hover::after,.heat-cell:hover::after{content:attr(title);position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);white-space:nowrap;background:#111827;color:#fff;padding:5px 8px;border-radius:8px;font-size:.75rem;z-index:5}.submission-heatmap{display:grid;grid-template-columns:52px repeat(24,minmax(18px,1fr));gap:4px;overflow-x:auto;padding:8px}.heat-label{font-size:.75rem;color:#64748b;display:flex;align-items:center}.heat-hour{font-size:.7rem;color:#94a3b8;text-align:center}.heat-cell{height:22px;border-radius:6px;background:#e2e8f0;position:relative}.heat-0{background:#edf2f7}.heat-1{background:#ead4bd}.heat-2{background:#d8a24a}.heat-3{background:#b86b4b}.heat-4{background:#5e4a3c}.heatmap-legend{display:flex;align-items:center;justify-content:flex-end;gap:6px;color:#64748b;font-size:.8rem}.heatmap-legend i{display:inline-block;width:18px;height:10px;border-radius:99px;background:#ead4bd}.heatmap-legend .l2{background:#d8a24a}.heatmap-legend .l3{background:#b86b4b}.heatmap-legend .l4{background:#5e4a3c}.analytics-list{display:flex;flex-direction:column;gap:10px}.analytics-item{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px;border:1px solid #edf2f7;border-radius:14px;background:#f8fafc}.analytics-item strong{color:#334155}.analytics-item small{display:block;color:#64748b;margin-top:3px}.analytics-meter{height:8px;border-radius:99px;background:#e2e8f0;overflow:hidden;margin-top:8px}.analytics-meter span{display:block;height:100%;background:linear-gradient(90deg,#d8a24a,#b86b4b)}@media(max-width:980px){.analytics-summary,.analytics-grid{grid-template-columns:1fr 1fr}}@media(max-width:640px){.analytics-summary,.analytics-grid{grid-template-columns:1fr}.analytics-panel-title{display:block}.submission-heatmap{grid-template-columns:42px repeat(24,18px)}}
\n\n/* inline logo preview in bookmark list */\n.inline-logo-field{display:flex;align-items:center;gap:8px;min-width:210px}.inline-logo-preview{width:28px;height:28px;border-radius:9px;object-fit:contain;background:#fffdf8;border:1px solid var(--admin-line);box-shadow:0 4px 10px rgba(71,52,35,.08);flex:0 0 auto}.inline-logo-placeholder{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:9px;background:#f3eadf;color:var(--admin-muted);font-size:.72rem;border:1px dashed var(--admin-line);flex:0 0 auto}.inline-logo-field .inline-logo{min-width:150px;margin-bottom:0}\n/* refined category management inputs */\n#categories .category-add{align-items:center;gap:8px;padding:12px;flex-wrap:wrap}#categories .category-add input,#categories .category-add select{margin-bottom:0;min-width:160px}#categoryTable td{vertical-align:middle}#categoryTable .category-name-input,#categoryTable .category-sort-input,#categoryTable .category-parent-select{width:100%;box-sizing:border-box;margin:0;border:1px solid transparent;background:#f7efe4;color:var(--admin-text);border-radius:14px;padding:9px 11px;font-size:.92rem;box-shadow:inset 0 0 0 1px rgba(230,217,200,.72);transition:background .2s,box-shadow .2s,border-color .2s}#categoryTable .category-name-input:hover,#categoryTable .category-sort-input:hover,#categoryTable .category-parent-select:hover{background:#fffaf3;box-shadow:inset 0 0 0 1px #d7c6b4}#categoryTable .category-name-input:focus,#categoryTable .category-sort-input:focus,#categoryTable .category-parent-select:focus{background:#fffdf8;border-color:var(--admin-accent);box-shadow:0 0 0 3px rgba(184,107,75,.12);outline:none}#categoryTable .category-parent-select{appearance:auto;min-width:150px}#categoryTable .category-sort-input{text-align:center;min-width:76px}#categoryTable small{display:block;margin-top:6px;color:var(--admin-muted);font-size:.76rem;white-space:nowrap}.category-actions{justify-content:flex-end}.category-actions button{padding:7px 11px}\n/* single line add bookmark form */
.add-new:not(.category-add){display:flex;align-items:center;gap:8px;flex-wrap:nowrap;overflow-x:auto;padding:12px}.add-new:not(.category-add)>input,.add-new:not(.category-add)>select{flex:0 0 130px;min-width:0;margin-bottom:0}.add-new:not(.category-add)>#addName{flex-basis:120px}.add-new:not(.category-add)>#addUrl{flex-basis:190px}.add-new:not(.category-add)>#addDesc{flex-basis:170px}.add-new:not(.category-add)>#addVisibility{flex-basis:110px}.add-new:not(.category-add) .logo-field{flex:0 0 190px;min-width:0;display:flex;flex-direction:row;align-items:center;gap:6px}.add-new:not(.category-add) .logo-field input{min-width:0;flex:1;margin-bottom:0}.add-new:not(.category-add) .logo-field button{flex:0 0 auto;white-space:nowrap;margin-bottom:0}.add-new:not(.category-add) .add-action-field{flex:0 0 150px;min-width:0}.add-new:not(.category-add) .add-action-field:has(#addTags){flex-basis:190px}.add-new:not(.category-add) .add-submit-row{flex:0 0 auto;min-width:0;display:flex;align-items:center;gap:6px}.add-new:not(.category-add) .add-submit-row input{width:90px;min-width:0;margin-bottom:0}.add-new:not(.category-add) .add-submit-row button{width:auto;white-space:nowrap;margin-bottom:0;padding-left:16px;padding-right:16px}@media(max-width:900px){.add-new:not(.category-add){padding-bottom:14px}.add-new:not(.category-add)>input,.add-new:not(.category-add)>select{flex-basis:130px}.add-new:not(.category-add)>#addUrl{flex-basis:180px}}
/* integrated favicon action input */
.logo-field,.add-action-field{position:relative;display:block;flex:0 0 210px;min-width:190px;margin:0}
.logo-field input,.add-action-field input{width:100%;box-sizing:border-box;padding-right:46px!important;margin-bottom:0!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.logo-field button,.add-action-field button{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:34px;height:34px;min-width:34px;padding:0;margin:0;border-radius:11px;background:rgba(184,107,75,.10);color:var(--admin-accent);box-shadow:none;border:1px solid rgba(184,107,75,.16);display:inline-flex;align-items:center;justify-content:center;font-size:16px;line-height:1;backdrop-filter:blur(8px)}
.logo-field button:hover,.add-action-field button:hover{background:rgba(184,107,75,.18);color:#8f513b}
.logo-field button:disabled,.add-action-field button:disabled{cursor:wait;opacity:.72}
@media(max-width:640px){
  .add-new:not(.category-add){display:grid!important;grid-template-columns:1fr!important;overflow:visible!important}
  .add-new:not(.category-add)>input,.add-new:not(.category-add)>select,.add-new:not(.category-add)>.logo-field,.add-new:not(.category-add)>.add-action-field,.add-new:not(.category-add)>.add-submit-row{width:100%!important;min-width:0!important;flex-basis:auto!important}
  .logo-field input,.add-action-field input{font-size:16px}
}

/* compact import/export and bulk toolbar */
.import-group{display:flex;align-items:center;gap:8px}
.import-group select{width:auto;min-width:132px;margin:0}
.action-menu{position:relative}
.action-menu summary{list-style:none;cursor:pointer;user-select:none;border-radius:12px;background:var(--admin-accent);color:#fff;padding:8px 14px;font-size:.9rem;font-weight:700}
.action-menu summary::-webkit-details-marker{display:none}
.action-menu summary::after{content:'▾';margin-left:8px;font-size:.75rem;opacity:.85}
.action-menu[open] summary::after{content:'▴'}
.action-menu-panel{position:absolute;right:0;top:calc(100% + 8px);z-index:20;display:grid;gap:6px;min-width:160px;padding:8px;border:1px solid var(--admin-line);border-radius:14px;background:#fffaf3;box-shadow:0 18px 44px rgba(71,52,35,.16)}
.action-menu-panel button{width:100%;text-align:left;background:#fffdf8!important;color:var(--admin-text)!important;border:1px solid var(--admin-line)!important;padding:8px 10px;font-size:.88rem}
.action-menu-panel button:hover{background:#f3eadf!important}
.bulk-toolbar{display:grid!important;grid-template-columns:minmax(210px,auto) minmax(170px,220px) 1fr;grid-template-areas:'select filter actions' 'edit edit edit';align-items:center;gap:12px;background:#fffaf3!important;border-color:var(--admin-line)!important}
.bulk-group{display:flex;align-items:center;gap:8px;min-width:0}
.bulk-select-group{grid-area:select;white-space:nowrap}
.bulk-edit-group{grid-area:edit;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 150px 170px 108px;gap:10px;padding-top:12px;border-top:1px solid var(--admin-line)}
.bulk-filter-group{grid-area:filter}
.bulk-filter-group select{min-width:170px}
.bulk-action-group{grid-area:actions;justify-content:flex-end;flex-wrap:wrap}
.bulk-toolbar input[type=text],.bulk-toolbar select{min-width:0!important;width:100%;margin:0!important;box-sizing:border-box}
.bulk-toolbar button{white-space:nowrap;margin:0!important;padding:9px 13px;font-size:.92rem}
#selectedCount{margin-right:0!important;white-space:nowrap}
@media(max-width:1180px){
  .bulk-toolbar{grid-template-columns:1fr!important;grid-template-areas:'select' 'filter' 'actions' 'edit'}
  .bulk-select-group,.bulk-filter-group,.bulk-action-group{justify-content:flex-start}
  .bulk-edit-group{grid-template-columns:repeat(2,minmax(0,1fr))}
  .bulk-edit-group #bulkUpdateBtn{grid-column:1/-1}
}
@media(max-width:640px){
  .admin-header-actions .import-export{display:grid;grid-template-columns:1fr;gap:8px;width:100%}
  .import-group{display:grid;grid-template-columns:1fr auto;width:100%}
  .import-group select{width:100%;min-width:0}
  .action-menu summary{width:100%;box-sizing:border-box;text-align:center}
  .action-menu-panel{position:static;margin-top:8px;grid-template-columns:1fr 1fr;min-width:0}
  .action-menu-panel button{text-align:center}
  .bulk-toolbar{padding:10px!important}
  .bulk-group{width:100%}
  .bulk-select-group{justify-content:space-between}
  .bulk-edit-group{grid-template-columns:1fr!important}
  .bulk-filter-group select{width:100%}
  .bulk-action-group{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .bulk-toolbar button{width:100%;padding:10px 8px;font-size:.9rem}
}
@media(max-width:380px){
  .bulk-action-group,.action-menu-panel{grid-template-columns:1fr}
  .import-group{grid-template-columns:1fr}
  .import-group button{width:100%}
}

/* enhanced bookmark pagination controls */
.pagination{display:flex!important;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;text-align:center;margin-top:20px}
.pagination button{margin:0!important}
.page-size-control,.page-jump-control{display:inline-flex;align-items:center;gap:6px;color:var(--admin-muted);font-size:.9rem;font-weight:700}
.page-size-control select,.page-jump-control input{width:auto!important;min-width:0!important;margin:0!important;padding:7px 10px!important;border:1px solid var(--admin-line)!important;border-radius:10px!important;background:#fffdf8!important;color:var(--admin-text)!important}
.page-size-control select{min-width:76px}
.page-jump-control input{width:76px!important;text-align:center}
@media(max-width:640px){.pagination{justify-content:flex-start}.page-size-control,.page-jump-control{width:auto}.page-jump-control input{width:72px!important}}

.system-settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.announcement-preview{border:1px solid var(--admin-line);border-radius:16px;background:#fffdf8;padding:16px;color:var(--admin-text);line-height:1.65}
.announcement-preview h1,.announcement-preview h2,.announcement-preview h3{margin:.2em 0 .55em;color:var(--admin-text)}
.announcement-preview p{margin:.45em 0;color:var(--admin-muted)}
.announcement-preview ul,.announcement-preview ol{margin:.5em 0 .5em 1.25em;color:var(--admin-muted)}
.announcement-preview code{border-radius:6px;background:#f3eadf;padding:2px 5px;color:#8a553d}
.announcement-preview pre{overflow:auto;border-radius:12px;background:#2b211b;color:#fff7ed;padding:12px}
.announcement-preview a{color:var(--admin-accent-2);text-decoration:underline}
@media(max-width:640px){.system-settings-grid{grid-template-columns:1fr}}

.category-add-panel{align-items:center;background:linear-gradient(135deg,#fffdf8,#f7efe4)!important;border:1px solid var(--admin-line);border-radius:18px;box-shadow:0 10px 26px rgba(71,52,35,.06)}.category-color-editor{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:74px}.category-color-editor-new{flex:0 0 auto}.category-color-editor input{margin:0!important}.category-native-color{appearance:none;-webkit-appearance:none;width:38px!important;height:38px!important;min-width:38px!important;padding:0!important;border:0!important;border-radius:13px!important;background:transparent!important;box-shadow:0 0 0 1px var(--admin-line),0 8px 18px rgba(71,52,35,.12)!important;cursor:pointer;overflow:hidden}.category-native-color::-webkit-color-swatch-wrapper{padding:0}.category-native-color::-webkit-color-swatch{border:0;border-radius:12px}.category-native-color::-moz-color-swatch{border:0;border-radius:12px}.category-color-preview{display:inline-flex;width:26px;height:26px;flex:0 0 26px;border-radius:999px;border:1px solid rgba(255,255,255,.8);background:#b86b4b;box-shadow:0 0 0 1px var(--admin-line),0 6px 14px rgba(71,52,35,.12)}#categoryTable{min-width:1260px;table-layout:auto}#categoryTable th,#categoryTable td{white-space:nowrap;vertical-align:middle}#categoryTable th:nth-child(1),#categoryTable td:nth-child(1){width:64px}#categoryTable th:nth-child(2),#categoryTable td:nth-child(2){min-width:150px}#categoryTable th:nth-child(3),#categoryTable td:nth-child(3){min-width:210px}#categoryTable th:nth-child(4),#categoryTable td:nth-child(4){min-width:230px}#categoryTable th:nth-child(5),#categoryTable td:nth-child(5){width:96px;text-align:center}#categoryTable th:nth-child(6),#categoryTable td:nth-child(6){min-width:240px}#categoryTable th:nth-child(7),#categoryTable td:nth-child(7),#categoryTable th:nth-child(8),#categoryTable td:nth-child(8){width:92px;text-align:center}#categoryTable th:nth-child(9),#categoryTable td:nth-child(9){width:120px}#categoryTable th:nth-child(10),#categoryTable td:nth-child(10){width:150px}.category-name-input{min-width:138px!important}.category-icon-input{min-width:210px!important}.category-description-input{min-width:220px!important}.category-sort-input{width:92px!important;min-width:92px!important}.category-parent-select{min-width:185px!important}
#categoryTable input:not([type="color"]),#categoryTable select{height:38px;margin:0!important;padding:8px 12px!important;border:1px solid var(--admin-line)!important;border-radius:14px!important;background:#fffaf3!important;color:var(--admin-text)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.72),0 6px 16px rgba(71,52,35,.05)!important;outline:none!important;box-sizing:border-box}#categoryTable input:not([type="color"]):focus,#categoryTable select:focus{border-color:var(--admin-accent)!important;box-shadow:0 0 0 3px rgba(184,107,75,.14)!important}#categoryTable thead th{white-space:nowrap!important;word-break:keep-all!important;line-height:1.2!important}#categoryTable td small{display:block;margin-top:6px;color:var(--admin-muted);font-size:.78rem;white-space:nowrap}.category-actions{display:flex;gap:8px;align-items:center;justify-content:flex-start}.category-actions button{white-space:nowrap;padding:8px 12px!important;border-radius:12px!important}
.tag-toolbar-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.tag-total-badge{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--admin-line);border-radius:999px;background:#fffdf8;color:var(--admin-muted);padding:8px 12px;font-weight:700}.tag-total-badge strong{color:var(--admin-text);font-size:1.05rem}
.tag-merge-card{display:grid;grid-template-columns:minmax(220px,1.2fr) minmax(150px,.7fr) minmax(150px,.7fr) auto auto;gap:10px;align-items:center;margin:0 0 14px;padding:14px;border:1px solid var(--admin-line);border-radius:18px;background:linear-gradient(180deg,#fffdf8,#f7efe4);box-shadow:0 10px 26px rgba(71,52,35,.06)}
.tag-merge-card strong{display:block;color:var(--admin-text);margin-bottom:4px}
.tag-merge-card input{margin:0!important;min-width:0!important;width:100%;box-sizing:border-box}
.tag-merge-card button{white-space:nowrap}
@media(max-width:860px){.tag-merge-card{grid-template-columns:1fr}.tag-merge-card button{width:100%}}

/* category drag sort */
.category-row{cursor:move;transition:background .15s ease}
.category-row .drag-handle{display:inline-flex;align-items:center;gap:6px;color:var(--admin-muted);font-weight:700;letter-spacing:.5px;user-select:none}
.category-row.dragging{opacity:.55;background:rgba(184,107,75,.08)}
.category-row.drag-over{outline:2px dashed var(--admin-accent);outline-offset:-2px;background:rgba(184,107,75,.06)}
/* operation logs */
.operation-log-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.operation-log-controls select{margin:0;min-width:170px}
#operationLogTable{min-width:920px}
#operationLogTable td{vertical-align:middle}
/* backups */
.backup-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
#backups .category-toolbar{align-items:flex-start;padding:14px 16px;border:1px solid rgba(230,217,200,.72);border-radius:18px;background:linear-gradient(135deg,rgba(255,253,248,.9),rgba(247,239,228,.7));box-shadow:0 10px 26px rgba(71,52,35,.05)}
.webdav-card{position:relative;margin:14px 0 18px;padding:18px;border:1px solid rgba(230,217,200,.92);border-radius:22px;background:radial-gradient(circle at 95% 8%,rgba(47,111,94,.14),transparent 30%),linear-gradient(135deg,#fffdf8 0%,#fff7ee 54%,#f7efe4 100%);box-shadow:0 18px 42px rgba(71,52,35,.10);overflow:hidden}
.webdav-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,var(--admin-accent-2),var(--admin-accent-3),var(--admin-accent))}
.webdav-card-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px}
.webdav-card-head h3{margin:4px 0 7px;color:var(--admin-text);font-size:1.22rem;letter-spacing:-.02em}
.webdav-card-head p{max-width:820px;margin:0;color:var(--admin-muted);line-height:1.7;font-size:.92rem}
.webdav-eyebrow{display:inline-flex;align-items:center;gap:6px;color:var(--admin-accent-2);font-size:.72rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
.webdav-eyebrow::before{content:'☁';font-size:.9rem;letter-spacing:0}
.webdav-badge{flex:0 0 auto;display:inline-flex;align-items:center;border:1px solid rgba(47,111,94,.2);border-radius:999px;background:rgba(47,111,94,.09);color:var(--admin-accent-2);padding:7px 11px;font-size:.8rem;font-weight:800}
.webdav-form-grid{display:grid;grid-template-columns:180px minmax(280px,1.4fr) minmax(220px,1fr);gap:12px}
.webdav-field{display:flex!important;flex-direction:column;gap:8px;min-width:0;margin:0;padding:12px;border:1px solid rgba(230,217,200,.78);border-radius:18px;background:rgba(255,250,243,.78);box-shadow:inset 0 1px 0 rgba(255,255,255,.75),0 8px 18px rgba(71,52,35,.045)}
.webdav-field span{color:var(--admin-muted);font-size:.82rem;font-weight:800}
.webdav-field input,.webdav-field select{width:100%!important;min-width:0!important;margin:0!important;box-sizing:border-box;border-radius:14px!important;background:#fffdf8!important}
.webdav-url-field{grid-column:span 2}
.webdav-enabled-field select{font-weight:800;color:var(--admin-accent-2)}
.webdav-actions{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px dashed var(--admin-line)}
.webdav-actions>div{display:flex;gap:10px;flex-wrap:wrap}
.webdav-actions button{padding:10px 18px;font-weight:800}
.webdav-hint{display:inline-flex;align-items:center;gap:6px;color:var(--admin-muted);font-size:.86rem}
.webdav-hint:not(:empty)::before{content:'🔐'}
#backups .table-wrapper{margin-top:14px}
#backupTable{min-width:1080px}
#backupTable td{vertical-align:middle}
@media(max-width:1100px){.webdav-form-grid{grid-template-columns:1fr 1fr}.webdav-url-field{grid-column:1/-1}}
@media(max-width:640px){.webdav-card{padding:14px;border-radius:18px}.webdav-card-head{display:block}.webdav-badge{margin-top:10px}.webdav-form-grid{grid-template-columns:1fr}.webdav-url-field{grid-column:auto}.webdav-actions,.webdav-actions>div{display:grid;grid-template-columns:1fr;width:100%}.webdav-actions button{width:100%}}

`;
export const adminJs = `
const $ = (id) => document.getElementById(id);
const configTableBody = $('configTableBody');
const pendingTableBody = $('pendingTableBody');
const categoryTableBody = $('categoryTableBody');
const tagTableBody = $('tagTableBody');
const tagReviewTableBody = $('tagReviewTableBody');
const messageDiv = $('message');
let currentPage = 1, pageSize = 10, totalItems = 0, currentSearchKeyword = '', currentHealthFilter = '';
let pendingCurrentPage = 1, pendingPageSize = 10, pendingTotalItems = 0;
let categoriesData = [];
let latestTagSuggestionPreview = null;

function escapeHTML(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function normalizeUrl(v){const t=String(v||'').trim();return /^https?:\\/\\//i.test(t)?t:(/^[\\w.-]+\\.[\\w.-]+/.test(t)?'https://'+t:'')}
function showMessage(message,type){messageDiv.innerText=message;messageDiv.className=type;messageDiv.style.display='block';setTimeout(()=>messageDiv.style.display='none',3000)}
function setText(id,value){const el=$(id);if(el)el.textContent=value}
function renderTableState(tbody,colspan,icon,title,desc){tbody.innerHTML='<tr><td colspan="'+colspan+'" class="empty-state"><div class="empty-icon">'+icon+'</div><strong>'+escapeHTML(title)+'</strong><p>'+escapeHTML(desc||'')+'</p></td></tr>'}
function setTableLoading(tbody,colspan,text){tbody.innerHTML='<tr><td colspan="'+colspan+'" class="loading-state"><span class="loading-spinner"></span>'+escapeHTML(text||'加载中...')+'</td></tr>'}
function setBtnLoading(btn,loading,text){if(!btn)return;if(loading){btn.dataset.oldText=btn.textContent;btn.disabled=true;btn.textContent=text||'处理中...'}else{btn.disabled=false;btn.textContent=btn.dataset.oldText||btn.textContent}}
function apiJson(url, options={}){return fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options}).then(async r=>{const text=await r.text();try{return JSON.parse(text)}catch(e){return{code:r.status,message:text||r.statusText||'Request failed'}}})}
function notifyFrontRefresh(reason){try{localStorage.setItem('nav:front-refresh',JSON.stringify({reason,time:Date.now()}));console.log('[sync] notify front refresh',reason)}catch(e){console.warn('[sync] notify failed',e)}}
notifyFrontRefresh('admin-opened');
$('logoutForm')?.addEventListener('submit',(e)=>{e.preventDefault();fetch('/admin/logout',{method:'POST',credentials:'same-origin'}).finally(()=>{notifyFrontRefresh('admin-logout');window.location.href='/admin'})});

document.querySelectorAll('.tab-button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));button.classList.add('active');$(button.dataset.tab).classList.add('active');if(button.dataset.tab==='categories')fetchCategories();if(button.dataset.tab==='tags'){fetchTags();fetchTagReviewSites()}if(button.dataset.tab==='submissionAnalytics')fetchSubmissionAnalytics();if(button.dataset.tab==='privateBookmarks')fetchPrivateBookmarkSettings();if(button.dataset.tab==='systemSettings')fetchSystemSettings();if(button.dataset.tab==='aiAssistant')fetchAiSettings();if(button.dataset.tab==='apiTokens')fetchApiTokens();if(button.dataset.tab==='operationLogs')fetchOperationLogs();if(button.dataset.tab==='backups')fetchBackups();if(button.dataset.tab=='visitAnalytics')fetchVisitAnalytics()}));

const searchInput=document.createElement('input');searchInput.type='text';searchInput.placeholder='搜索书签(名称，URL，分类)';searchInput.id='searchInput';searchInput.style.marginBottom='10px';document.querySelector('.add-new').parentNode.insertBefore(searchInput,document.querySelector('.add-new'));

const editModal=document.createElement('div');editModal.className='modal';editModal.innerHTML='<div class="modal-content"><span class="modal-close">×</span><h2>编辑站点</h2><form id="editForm"><input type="hidden" id="editId"><label>名称:</label><input type="text" id="editName" required><label>URL:</label><input type="text" id="editUrl" required><label>Logo(可选):</label><input type="text" id="editLogo"><label>描述(可选):</label><input type="text" id="editDesc"><label>分类:</label><input type="text" id="editCatelog" required><label>可见性:</label><select id="editVisibility"><option value="public">公开</option><option value="private">私密</option><option value="unlisted">不列出</option><option value="admin_only">仅管理员</option></select><label>标签(逗号/空格分隔，可选):</label><input type="text" id="editTags"><label>排序:</label><input type="number" id="editSortOrder"><button type="submit">保存</button></form></div>';document.body.appendChild(editModal);editModal.querySelector('.modal-close').onclick=()=>editModal.style.display='none';
const confirmModal=document.createElement('div');confirmModal.className='modal confirm-modal';confirmModal.innerHTML='<div class="modal-content confirm-content"><h2 id="confirmTitle">确认操作</h2><p id="confirmMessage"></p><div class="confirm-actions"><button type="button" id="confirmCancel" class="secondary-btn">取消</button><button type="button" id="confirmOk" class="del-btn">确认</button></div></div>';document.body.appendChild(confirmModal);function confirmDialog(message,title='确认操作'){return new Promise(resolve=>{setText('confirmTitle',title);setText('confirmMessage',message);confirmModal.style.display='block';const cleanup=(result)=>{confirmModal.style.display='none';$('confirmOk').onclick=null;$('confirmCancel').onclick=null;confirmModal.onclick=null;resolve(result)};$('confirmOk').onclick=()=>cleanup(true);$('confirmCancel').onclick=()=>cleanup(false);confirmModal.onclick=e=>{if(e.target===confirmModal)cleanup(false)}})}

function getTotalPages(){return Math.max(1,Math.ceil(totalItems/pageSize))}
function syncConfigPagination(){const totalPages=getTotalPages();$('totalPages').innerText=totalPages;$('currentPage').innerText=currentPage;const jump=$('pageJumpInput');if(jump){jump.max=totalPages;jump.value=currentPage}}
function fetchConfigs(page=currentPage,keyword=currentSearchKeyword){setTableLoading(configTableBody,12,'正在加载书签...');let url='/api/config?page='+page+'&pageSize='+pageSize+'&sort=latest'+(keyword?'&keyword='+encodeURIComponent(keyword):'')+(currentHealthFilter?'&health='+encodeURIComponent(currentHealthFilter):'');fetch(url).then(r=>r.json()).then(data=>{if(data.code===200){totalItems=data.total;setText('statTotalSites',totalItems);currentPage=data.page;syncConfigPagination();renderConfig(data.data||[]);updatePaginationButtons()}else showMessage(data.message,'error')}).catch(()=>{renderTableState(configTableBody,12,'⚠️','加载失败','请稍后重试');showMessage('网络错误','error')})}
function renderHealthStatus(config){if(!config.last_checked_at)return '<span class="health health-unknown">未检测</span>';const code=Number(config.last_status_code);const ok=code>=200&&code<400&&!config.last_error;const label=ok?'正常 '+code:(config.last_error||('异常 '+(code||'')));return '<span class="health '+(ok?'health-ok':'health-bad')+'" title="'+escapeHTML(config.last_checked_at)+'">'+escapeHTML(label)+'</span>'}
function inlineInput(value,cls,type='text'){return '<input class="'+cls+' inline-input" type="'+type+'" value="'+escapeHTML(value||'')+'">'}
function inlineLogoField(value){const url=normalizeUrl(value);return '<div class="inline-logo-field">'+(url?'<img class="inline-logo-preview" src="'+escapeHTML(url)+'" alt="logo" loading="lazy" onerror="this.style.display=\\'none\\'">':'<span class="inline-logo-placeholder">无</span>')+'<input class="inline-logo inline-input" type="text" value="'+escapeHTML(value||'')+'" placeholder="Logo URL"></div>'}
function bindInlineLogoPreview(row){const input=row.querySelector('.inline-logo');const field=row.querySelector('.inline-logo-field');if(!input||!field)return;input.addEventListener('input',()=>{const url=normalizeUrl(input.value);let img=field.querySelector('.inline-logo-preview');let placeholder=field.querySelector('.inline-logo-placeholder');if(url){if(!img){img=document.createElement('img');img.className='inline-logo-preview';img.alt='logo';img.loading='lazy';img.onerror=()=>{img.style.display='none'};field.insertBefore(img,input)}img.style.display='block';img.src=url;if(placeholder)placeholder.remove()}else{if(img)img.remove();if(!placeholder){placeholder=document.createElement('span');placeholder.className='inline-logo-placeholder';placeholder.textContent='无';field.insertBefore(placeholder,input)}}})}
function renderConfig(configs){configTableBody.innerHTML='';clearSelectedConfigs();if(!configs.length){renderTableState(configTableBody,12,'🗃️','暂无书签数据','可以通过上方表单新增书签，或调整搜索条件。');return}configs.forEach(config=>{const row=document.createElement('tr');row.dataset.id=config.id;const tags=Array.isArray(config.tags)?config.tags.join(', '):'';const visibility=config.visibility||'public';row.innerHTML='<td><input type="checkbox" class="config-select" data-id="'+config.id+'"></td><td>'+config.id+'</td><td>'+inlineInput(config.name,'inline-name')+'</td><td>'+inlineInput(config.url,'inline-url')+'</td><td>'+inlineLogoField(config.logo)+'</td><td>'+inlineInput(config.desc,'inline-desc')+'</td><td>'+inlineInput(config.catelog,'inline-catelog')+'</td><td><select class="inline-visibility inline-input"><option value="public">公开</option><option value="private">私密</option><option value="unlisted">不列出</option><option value="admin_only">仅管理员</option></select></td><td>'+inlineInput(tags,'inline-tags')+'</td><td>'+inlineInput(config.sort_order===9999?'':config.sort_order,'inline-sort','number')+'</td><td>'+renderHealthStatus(config)+'</td><td class="actions"><button class="save-inline-btn" data-id="'+config.id+'">保存</button><button class="site-check-btn check-btn" data-id="'+config.id+'">检测</button><button class="del-btn" data-id="'+config.id+'">删除</button></td>';configTableBody.appendChild(row);row.querySelector('.inline-visibility').value=visibility;bindInlineLogoPreview(row)});document.querySelectorAll('.config-select').forEach(cb=>cb.onchange=updateSelectedConfigs);document.querySelectorAll('.save-inline-btn').forEach(b=>b.onclick=()=>saveInlineConfig(b));document.querySelectorAll('.site-check-btn[data-id]').forEach(b=>b.onclick=()=>handleCheckSite(b));document.querySelectorAll('#configTableBody .actions .del-btn[data-id]').forEach(b=>b.onclick=()=>handleDelete(b.dataset.id))}
function getInlinePayload(tr){const sort=tr.querySelector('.inline-sort').value;const payload={name:tr.querySelector('.inline-name').value.trim(),url:tr.querySelector('.inline-url').value.trim(),logo:tr.querySelector('.inline-logo').value.trim(),desc:tr.querySelector('.inline-desc').value.trim(),catelog:tr.querySelector('.inline-catelog').value.trim(),visibility:tr.querySelector('.inline-visibility').value,tags:tr.querySelector('.inline-tags').value.trim()};if(sort!=='')payload.sort_order=Number(sort);return payload}
async function saveInlineConfig(btn){const tr=btn.closest('tr');const id=btn.dataset.id;const payload=getInlinePayload(tr);if(!payload.name||!payload.url||!payload.catelog){showMessage('名称、URL、分类不能为空','error');return}setBtnLoading(btn,true,'保存中');try{await postSiteWithDuplicateCheck(payload,{url:'/api/config/'+id,method:'PUT',successCode:200,successMsg:'行内保存成功',onSuccess:()=>{fetchConfigs(currentPage,currentSearchKeyword);fetchCategories();notifyFrontRefresh('config-inline-updated')}})}catch{showMessage('网络错误','error')}finally{setBtnLoading(btn,false)}}
function handleEdit(id){fetch('/api/config/'+id).then(r=>r.json()).then(data=>{const c=data.data;if(!c){showMessage('找不到要编辑的数据','error');return}$('editId').value=c.id;$('editName').value=c.name||'';$('editUrl').value=c.url||'';$('editLogo').value=c.logo||'';$('editDesc').value=c.desc||'';$('editCatelog').value=c.catelog||'';$('editVisibility').value=c.visibility||'public';$('editTags').value=Array.isArray(c.tags)?c.tags.join(', '):'';$('editSortOrder').value=c.sort_order===9999?'':c.sort_order;editModal.style.display='block'})}
$('editForm').onsubmit=async(e)=>{e.preventDefault();const id=$('editId').value;const sort=$('editSortOrder').value;const payload={name:$('editName').value.trim(),url:$('editUrl').value.trim(),logo:$('editLogo').value.trim(),desc:$('editDesc').value.trim(),catelog:$('editCatelog').value.trim(),visibility:$('editVisibility').value,tags:$('editTags').value.trim()};if(sort!=='')payload.sort_order=Number(sort);try{await postSiteWithDuplicateCheck(payload,{url:'/api/config/'+id,method:'PUT',successCode:200,successMsg:'修改成功',onSuccess:()=>{fetchConfigs();fetchCategories();notifyFrontRefresh('config-updated');editModal.style.display='none'}})}catch{showMessage('网络错误','error')}}
async function handleDelete(id){if(!(await confirmDialog('确认删除这个书签？此操作不可恢复。','删除确认')))return;apiJson('/api/config/'+id,{method:'DELETE'}).then(d=>{if(d.code===200){showMessage('删除成功','success');fetchConfigs();fetchCategories();notifyFrontRefresh('config-deleted')}else showMessage(d.message,'error')}).catch(()=>showMessage('网络错误','error'))}
function handleCheckSite(btn){const id=btn.dataset.id;if(!id)return;const original=btn.textContent;btn.disabled=true;btn.textContent='检测中';apiJson('/api/config/'+encodeURIComponent(id)+'/check',{method:'POST'}).then(d=>{if(d.code===200){const data=d.data||{};showMessage(data.ok?'链接正常':'链接异常：'+(data.error||data.status_code||'未知错误'),data.ok?'success':'error');fetchConfigs(currentPage,currentSearchKeyword)}else showMessage(d.message,'error')}).catch(()=>showMessage('网络错误','error')).finally(()=>{btn.disabled=false;btn.textContent=original})}
function getSelectedConfigIds(){return Array.from(document.querySelectorAll('.config-select:checked')).map(cb=>Number(cb.dataset.id)).filter(Boolean)}
function setSelectAllChecked(checked){['selectAllConfigs','selectAllConfigsHead'].forEach(id=>{const el=$(id);if(el)el.checked=checked})}
function updateSelectedConfigs(){const total=document.querySelectorAll('.config-select').length;const selected=getSelectedConfigIds().length;$('selectedCount').innerText='已选择 '+selected+' 项';setSelectAllChecked(total>0&&selected===total)}
function clearSelectedConfigs(){setSelectAllChecked(false);const count=$('selectedCount');if(count)count.innerText='已选择 0 项'}
function toggleSelectCurrentPage(checked){document.querySelectorAll('.config-select').forEach(cb=>cb.checked=checked);updateSelectedConfigs()}
$('selectAllConfigs').onchange=e=>toggleSelectCurrentPage(e.target.checked);$('selectAllConfigsHead').onchange=e=>toggleSelectCurrentPage(e.target.checked);
$('bulkDeleteBtn').onclick=async()=>{const ids=getSelectedConfigIds();if(!ids.length){showMessage('请先选择要删除的书签','error');return}if(!(await confirmDialog('确认删除选中的 '+ids.length+' 个书签？此操作不可恢复。','批量删除确认')))return;const btn=$('bulkDeleteBtn');setBtnLoading(btn,true,'删除中...');try{let d=await apiJson('/api/config/bulk',{method:'POST',body:JSON.stringify({action:'delete',ids})});if(d.code===404||d.message==='Not Found'){let ok=0,fail=0;for(const id of ids){const r=await apiJson('/api/config/'+encodeURIComponent(id),{method:'DELETE'});if(r.code===200)ok++;else fail++}d={code:fail?400:200,message:fail?'部分书签删除失败':'Configs deleted successfully',result:{deleted:ok,failed:fail}}}if(d.code===200){showMessage('批量删除完成：已删除 '+ids.length+' 个书签','success');fetchConfigs();fetchCategories();notifyFrontRefresh('config-bulk-deleted')}else showMessage(d.message||'批量删除失败','error')}catch(e){showMessage('网络错误','error')}finally{setBtnLoading(btn,false)}}
$('bulkUpdateBtn').onclick=async()=>{const ids=getSelectedConfigIds();const catelog=$('bulkCatelog').value.trim();const tags=$('bulkTags').value.trim();const mode=$('bulkTagMode').value;const visibility=$('bulkVisibility')?.value||'';if(!ids.length){showMessage('请先选择要修改的书签','error');return}if(!catelog&&tags===''&&!visibility){showMessage('请输入要批量修改的分类、标签或可见性','error');return}const payload={ids,mode};if(catelog)payload.catelog=catelog;if(tags!=='')payload.tags=tags;if(visibility)payload.visibility=visibility;if(!(await confirmDialog('确认批量修改选中的 '+ids.length+' 个书签？','批量修改确认')))return;apiJson('/api/config/bulk',{method:'PUT',body:JSON.stringify(payload)}).then(d=>{if(d.code===200){const r=d.result||{};showMessage('批量修改完成：已更新 '+(r.updated||ids.length)+' 个书签','success');$('bulkCatelog').value='';$('bulkTags').value='';if($('bulkVisibility'))$('bulkVisibility').value='';fetchConfigs();fetchCategories();notifyFrontRefresh('config-bulk-updated')}else showMessage(d.message,'error')}).catch(()=>showMessage('网络错误','error'))}
function bulkCheckIds(ids,btn,emptyMessage='请先选择要检测的书签'){if(!ids.length){showMessage(emptyMessage,'error');return}if(ids.length>30){showMessage('单次最多批量检测 30 个链接，请减少选择数量','error');return}const original=btn.textContent;btn.disabled=true;btn.textContent='检测中...';apiJson('/api/config/bulk',{method:'POST',body:JSON.stringify({action:'check',ids})}).then(d=>{if(d.code===200){const r=d.result||{};showMessage('批量检测完成：正常 '+(r.ok||0)+' 个，异常 '+(r.failed||0)+' 个','success');fetchConfigs(currentPage,currentSearchKeyword)}else showMessage(d.message,'error')}).catch(()=>showMessage('网络错误','error')).finally(()=>{btn.disabled=false;btn.textContent=original})}
function bulkRefreshFavicons(ids,btn){if(!ids.length){showMessage('请先选择要刷新图标的书签','error');return}if(ids.length>30){showMessage('单次最多批量刷新 30 个图标，请减少选择数量','error');return}const original=btn.textContent;btn.disabled=true;btn.textContent='刷新中...';apiJson('/api/config/bulk',{method:'POST',body:JSON.stringify({action:'favicon',ids})}).then(d=>{if(d.code===200){const r=d.result||{};showMessage('图标刷新完成：成功 '+(r.refreshed||0)+' 个，失败 '+(r.failed||0)+' 个','success');fetchConfigs(currentPage,currentSearchKeyword);notifyFrontRefresh('config-favicons-refreshed')}else showMessage(d.message,'error')}).catch(()=>showMessage('网络错误','error')).finally(()=>{btn.disabled=false;btn.textContent=original})}
function getCurrentPageBadIds(){return Array.from(configTableBody.querySelectorAll('tr')).filter(row=>row.querySelector('.health-bad')).map(row=>Number(row.dataset.id)).filter(Boolean)}
$('bulkCheckBtn').onclick=()=>bulkCheckIds(getSelectedConfigIds(),$('bulkCheckBtn'));
$('recheckBadBtn').onclick=()=>bulkCheckIds(getCurrentPageBadIds().slice(0,30),$('recheckBadBtn'),'当前页没有异常链接可重测');
$('bulkFaviconBtn').onclick=()=>bulkRefreshFavicons(getSelectedConfigIds(),$('bulkFaviconBtn'));
$('hideBadBtn').onclick=async()=>{const ids=getCurrentPageBadIds();if(!ids.length){showMessage('当前页没有异常链接可隐藏','error');return}if(!(await confirmDialog('确认将当前页 '+ids.length+' 个异常书签设置为“不列出”？前台不再公开展示，但后台仍可管理。','隐藏异常确认')))return;const btn=$('hideBadBtn');const original=btn.textContent;btn.disabled=true;btn.textContent='隐藏中...';apiJson('/api/config/bulk',{method:'PUT',body:JSON.stringify({ids,visibility:'unlisted'})}).then(d=>{if(d.code===200){showMessage('已隐藏异常链接 '+ids.length+' 个','success');fetchConfigs(currentPage,currentSearchKeyword);notifyFrontRefresh('config-hide-bad')}else showMessage(d.message,'error')}).catch(()=>showMessage('网络错误','error')).finally(()=>{btn.disabled=false;btn.textContent=original})}
function updatePaginationButtons(){$('prevPage').disabled=currentPage===1;$('nextPage').disabled=currentPage>=getTotalPages()}
$('prevPage').onclick=()=>currentPage>1&&fetchConfigs(currentPage-1);$('nextPage').onclick=()=>currentPage<getTotalPages()&&fetchConfigs(currentPage+1);$('pageSizeSelect').onchange=(e)=>{pageSize=Number(e.target.value)||10;currentPage=1;fetchConfigs(1,currentSearchKeyword)};$('pageJumpBtn').onclick=()=>{const target=Math.min(getTotalPages(),Math.max(1,Number($('pageJumpInput').value)||1));fetchConfigs(target,currentSearchKeyword)};$('pageJumpInput').onkeydown=(e)=>{if(e.key==='Enter')$('pageJumpBtn').click()};$('healthFilter')?.addEventListener('change',e=>{currentHealthFilter=e.target.value;currentPage=1;fetchConfigs(1,currentSearchKeyword)});searchInput.oninput=()=>{currentSearchKeyword=searchInput.value.trim();currentPage=1;fetchConfigs(currentPage,currentSearchKeyword)}

function getAddSiteDraft(){return {name:$('addName').value.trim(),url:$('addUrl').value.trim(),desc:$('addDesc').value.trim(),catelog:$('addCatelog').value.trim(),tags:$('addTags').value.trim()}}
$('suggestAddCategoryBtn')?.addEventListener('click',()=>{const payload=getAddSiteDraft();if(!payload.name&&!payload.url){showMessage('请先输入名称或 URL，再推荐分类','error');return}const btn=$('suggestAddCategoryBtn');setBtnLoading(btn,true,'⏳');apiJson('/api/categories/suggest',{method:'POST',body:JSON.stringify(payload)}).then(d=>{if(d.code===200){const category=d.data?.category||'';if(category)$('addCatelog').value=category;showMessage((d.data?.mode==='ai'?'AI':'本地规则')+' 已推荐分类：'+(category||'无结果')+'，请检查后再添加','success')}else showMessage(d.message||'分类推荐失败','error')}).catch(()=>showMessage('网络错误','error')).finally(()=>setBtnLoading(btn,false))});
$('suggestAddTagsBtn')?.addEventListener('click',()=>{const payload=getAddSiteDraft();if(!payload.name&&!payload.url){showMessage('请先输入名称或 URL，再推荐标签','error');return}const btn=$('suggestAddTagsBtn');setBtnLoading(btn,true,'⏳');apiJson('/api/tags/suggest',{method:'POST',body:JSON.stringify({...payload,limit:8})}).then(d=>{if(d.code===200){const tags=d.data?.tags||[];if(tags.length)$('addTags').value=tags.join(', ');showMessage((d.data?.mode==='ai'?'AI':'本地规则')+' 已推荐 '+tags.length+' 个标签，请检查后再添加','success')}else showMessage(d.message||'标签推荐失败','error')}).catch(()=>showMessage('网络错误','error')).finally(()=>setBtnLoading(btn,false))});
async function postSiteWithDuplicateCheck(payload,{ url,method='POST',successCode=201,successMsg='添加成功',onSuccess }){const exec=(force)=>apiJson(url+(force?(url.includes('?')?'&':'?')+'force=true':''),{method,body:JSON.stringify(payload)});let d=await exec(false);if(d.code===409&&d.duplicate){const dup=d.duplicate;const ok=await confirmDialog('本站已有书签 #'+dup.id+' '+(dup.name||'')+'（'+(dup.url||'')+'，分类：'+(dup.catelog||'')+'）与该 URL 重复。是否仍要强制添加 / 保存？','重复书签检测');if(!ok){showMessage('已取消，未保存','error');return null}d=await exec(true)}if(d.code===successCode){showMessage(successMsg,'success');if(typeof onSuccess==='function')onSuccess(d);return d}showMessage(d.message||'操作失败','error');return null}
$('addBtn').onclick=async()=>{const sort=$('addSortOrder').value;const payload={name:$('addName').value.trim(),url:$('addUrl').value.trim(),logo:$('addLogo').value.trim(),desc:$('addDesc').value.trim(),catelog:$('addCatelog').value.trim(),visibility:$('addVisibility').value,tags:$('addTags').value.trim()};if(!payload.name||!payload.url||!payload.catelog){showMessage('名称,URL,分类 必填','error');return}if(sort!=='')payload.sort_order=Number(sort);await postSiteWithDuplicateCheck(payload,{url:'/api/config',method:'POST',successCode:201,successMsg:'添加成功',onSuccess:()=>{['addName','addUrl','addLogo','addDesc','addCatelog','addTags','addSortOrder'].forEach(id=>$(id).value='');fetchConfigs();fetchCategories();notifyFrontRefresh('config-created')}})}

$('fetchAdminFaviconBtn').onclick=()=>{const siteUrl=$('addUrl').value.trim();if(!siteUrl){showMessage('请先输入URL','error');return}const btn=$('fetchAdminFaviconBtn'),status=$('adminFaviconStatus');const originalHTML=btn.innerHTML;btn.disabled=true;btn.innerHTML='⏳';status.style.display='block';status.textContent='正在获取网站图标...';status.className='status-loading';fetch('/api/favicon?url='+encodeURIComponent(siteUrl)).then(r=>r.json()).then(d=>{if(d.code===200&&d.favicon){$('addLogo').value=d.favicon;btn.innerHTML='✓';status.textContent='✅ 图标获取成功';status.className='status-success'}else{status.textContent='未找到合适图标，可手动填写 Logo URL';status.className='status-error'}}).catch(()=>{status.textContent='图标获取失败，请稍后重试';status.className='status-error'}).finally(()=>{btn.disabled=false;setTimeout(()=>{btn.innerHTML=originalHTML;status.style.display='none'},1400)})};

function fetchPendingConfigs(page=pendingCurrentPage){setTableLoading(pendingTableBody,8,'正在加载待审核书签...');fetch('/api/pending?page='+page+'&pageSize='+pendingPageSize+'&status='+($('pendingStatusFilter')?.value||'pending')).then(r=>r.json()).then(data=>{if(data.code===200){pendingTotalItems=data.total;setText('statPendingSites',pendingTotalItems);pendingCurrentPage=data.page;$('pendingTotalPages').innerText=Math.max(1,Math.ceil(pendingTotalItems/pendingPageSize));$('pendingCurrentPage').innerText=pendingCurrentPage;renderPending(data.data||[]);updatePendingPaginationButtons();if(data.stats)updatePendingStats(data.stats)}else showMessage(data.message,'error')}).catch(()=>{renderTableState(pendingTableBody,8,'⚠️','加载失败','请稍后重试');showMessage('网络错误','error')})}
function updatePendingStats(stats){const el=$('pendingStatsLabel');if(!el||!stats)return;el.textContent='待审 '+(stats.pending||0)+' · 通过 '+(stats.approved||0)+' · 拒绝 '+(stats.rejected||0)}
function renderPending(configs){pendingTableBody.innerHTML='';if(!configs.length){renderTableState(pendingTableBody,8,'✅','暂无待审核数据','新的访客提交会显示在这里。');return}configs.forEach(c=>{const row=document.createElement('tr');const url=normalizeUrl(c.url),logo=normalizeUrl(c.logo);const tags=Array.isArray(c.tags)?c.tags:[];row.innerHTML='<td>'+c.id+'</td><td>'+escapeHTML(c.name)+'</td><td>'+(url?'<a href="'+escapeHTML(url)+'" target="_blank">'+escapeHTML(url)+'</a>':escapeHTML(c.url||''))+'</td><td>'+(logo?'<img src="'+escapeHTML(logo)+'" style="width:30px;">':'N/A')+'</td><td>'+(c.desc?escapeHTML(c.desc):'N/A')+'</td><td>'+escapeHTML(c.catelog)+'</td><td>'+(tags.length?tags.map(t=>'#'+escapeHTML(t)).join(' '):'N/A')+'</td><td class="actions"><button class="approve-btn" data-id="'+c.id+'">批准</button><button class="reject-btn" data-id="'+c.id+'">拒绝</button></td>';pendingTableBody.appendChild(row)});document.querySelectorAll('.approve-btn').forEach(b=>b.onclick=()=>handleApprove(b.dataset.id));document.querySelectorAll('.reject-btn').forEach(b=>b.onclick=()=>handleReject(b.dataset.id))}
async function handleApprove(id){if(!(await confirmDialog('确定批准这条待审核书签？','批准确认')))return;let d=await apiJson('/api/pending/'+id,{method:'PUT'});if(d.code===409&&d.duplicate){const dup=d.duplicate;const ok=await confirmDialog('本站已有书签 #'+dup.id+' '+(dup.name||'')+'（'+(dup.url||'')+'）与本条待审 URL 重复。是否仍要强制批准？','重复书签检测');if(!ok){showMessage('已取消，未批准','error');return}d=await apiJson('/api/pending/'+id+'?force=true',{method:'PUT'})}if(d.code===200){showMessage('批准成功','success');fetchPendingConfigs();fetchConfigs();fetchCategories();notifyFrontRefresh('pending-approved')}else showMessage(d.message||'批准失败','error')}
async function handleReject(id){const reasons=['重复收录','内容低质','链接无效','不符合收录标准','其他'];const reasonHtml=reasons.map(r=>'<label style="display:block;margin:4px 0;cursor:pointer"><input type="radio" name="rejectReason" value="'+r+'" style="margin-right:6px">'+r+'</label>').join('');const modal=document.createElement('div');modal.className='modal';modal.style.display='block';modal.innerHTML='<div class="modal-content" style="max-width:380px"><h2>拒绝理由</h2><div id="rejectReasonList">'+reasonHtml+'</div><input type="text" id="rejectReasonCustom" placeholder="自定义理由（可选）" style="margin-top:8px;width:100%"><div class="confirm-actions" style="margin-top:14px"><button type="button" id="rejectCancel" class="secondary-btn">取消</button><button type="button" id="rejectConfirm" class="del-btn">确认拒绝</button></div></div>';document.body.appendChild(modal);const cleanup=()=>modal.remove();modal.querySelector('#rejectCancel').onclick=cleanup;modal.onclick=e=>{if(e.target===modal)cleanup()};modal.querySelector('#rejectConfirm').onclick=()=>{const checked=modal.querySelector('input[name="rejectReason"]:checked');const custom=modal.querySelector('#rejectReasonCustom').value.trim();const reason=custom||checked?.value||'';cleanup();apiJson('/api/pending/'+id,{method:'DELETE',body:JSON.stringify({reason})}).then(d=>{if(d.code===200){showMessage('拒绝成功'+(reason?' · 理由：'+reason:''),'success');fetchPendingConfigs();notifyFrontRefresh('pending-rejected')}else showMessage(d.message,'error')}).catch(()=>showMessage('网络错误','error'))}}
function updatePendingPaginationButtons(){$('pendingPrevPage').disabled=pendingCurrentPage===1;$('pendingNextPage').disabled=pendingCurrentPage>=Math.ceil(pendingTotalItems/pendingPageSize)}
$('pendingPrevPage').onclick=()=>pendingCurrentPage>1&&fetchPendingConfigs(pendingCurrentPage-1);$('pendingNextPage').onclick=()=>pendingCurrentPage<Math.ceil(pendingTotalItems/pendingPageSize)&&fetchPendingConfigs(pendingCurrentPage+1)
$('pendingStatusFilter')?.addEventListener('change',()=>{pendingCurrentPage=1;fetchPendingConfigs(1)});

const weekdayNames=['周日','周一','周二','周三','周四','周五','周六'];
function heatLevel(value,max){if(!value||!max)return 0;const ratio=value/max;if(ratio>=.75)return 4;if(ratio>=.5)return 3;if(ratio>=.25)return 2;return 1}
function formatPeak(peak){if(!peak||peak.weekday===null||!peak.total)return '暂无';return weekdayNames[peak.weekday]+' '+String(peak.hour).padStart(2,'0')+':00'}
function showAnalyticsStatus(text,loading=false){const el=$('submissionAnalyticsStatus');if(!el)return;el.className='analytics-status '+(loading?'loading-state':'empty-state');el.innerHTML=loading?'<span class="loading-spinner"></span>'+escapeHTML(text):escapeHTML(text);el.classList.remove('is-hidden')}
function hideAnalyticsStatus(){const el=$('submissionAnalyticsStatus');if(el)el.classList.add('is-hidden')}
function renderDailyTrend(daily,maxDaily){const el=$('dailyTrend');if(!el)return;if(!daily?.length){el.innerHTML='<div class="empty-state">暂无趋势数据</div>';return}const max=Math.max(1,maxDaily||0);el.innerHTML=daily.map(item=>{const h=Math.max(6,Math.round((item.total/max)*168));return '<div class="trend-bar '+(item.total?'':'zero')+'" style="height:'+h+'px" title="'+escapeHTML(item.day+'：'+item.total+' 次')+'"></div>'}).join('')}
function renderSubmissionHeatmap(heatmap,maxHeat){const el=$('submissionHeatmap');if(!el)return;const max=Math.max(1,maxHeat||0);let html='<div></div>'+Array.from({length:24},(_,h)=>'<div class="heat-hour">'+h+'</div>').join('');(heatmap||[]).forEach(row=>{html+='<div class="heat-label">'+weekdayNames[row.weekday]+'</div>';(row.hours||[]).forEach(cell=>{const level=heatLevel(cell.total,max);html+='<div class="heat-cell heat-'+level+'" title="'+weekdayNames[row.weekday]+' '+String(cell.hour).padStart(2,'0')+':00：'+cell.total+' 次"></div>'})});el.innerHTML=html}
function renderAnalyticsCategories(categories){const el=$('submissionCategories');if(!el)return;if(!categories?.length){el.innerHTML='<div class="empty-state">暂无分类数据</div>';return}const max=Math.max(...categories.map(c=>c.total),1);el.innerHTML=categories.map(c=>'<div class="analytics-item"><div style="width:100%"><strong>'+escapeHTML(c.catelog)+'</strong><small>'+c.total+' 次提交</small><div class="analytics-meter"><span style="width:'+Math.max(4,Math.round(c.total/max*100))+'%"></span></div></div></div>').join('')}
function renderLatestSubmissions(items){const el=$('latestSubmissions');if(!el)return;if(!items?.length){el.innerHTML='<div class="empty-state">暂无最近提交</div>';return}el.innerHTML=items.map(item=>{const icon=normalizeUrl(item.logo);const source=item.source==='pending'?'待审核':'后台新增';return '<div class="analytics-item"><div style="display:flex;gap:10px;align-items:center">'+(icon?'<img class="inline-logo-preview" src="'+escapeHTML(icon)+'" alt="" loading="lazy">':'')+'<div><strong>'+escapeHTML(item.name)+'</strong><small>'+escapeHTML(item.catelog||'未分类')+' · '+escapeHTML(item.create_time||'')+' · '+source+'</small></div></div><span>#'+item.id+'</span></div>'}).join('')}
function getAnalyticsScores(data){const summary=data.summary||{};const daily=data.daily||[];const categories=data.categories||[];const recent=Number(summary.recentSubmissions||0);const days=Number(data.rangeDays||30);const activeDays=daily.filter(d=>d.total>0).length;const topCategory=categories[0]?.total||0;const diversityBase=recent?Math.max(0,100-(topCategory/recent)*100):0;const peakRatio=recent?Math.min(100,(summary.maxHeat||0)/recent*240):0;return [{name:'活跃度',value:Math.min(100,Math.round(recent/Math.max(1,days*2)*100))},{name:'稳定性',value:Math.round(activeDays/Math.max(1,days)*100)},{name:'分类分散',value:Math.round(Math.min(100,diversityBase+categories.length*4))},{name:'待处理压力',value:Math.min(100,Math.round((summary.totalPending||0)/20*100))},{name:'峰值集中',value:Math.round(peakRatio)}]}
function renderRadarChart(data){const el=$('submissionRadar');if(!el)return;const scores=getAnalyticsScores(data);const size=320,c=160,r=108,levels=[.25,.5,.75,1];const point=(idx,val)=>{const angle=-Math.PI/2+idx*Math.PI*2/scores.length;const rr=r*val/100;return [c+Math.cos(angle)*rr,c+Math.sin(angle)*rr]};const poly=scores.map((x,i)=>point(i,x.value).join(',')).join(' ');let html='<svg viewBox="0 0 '+size+' '+size+'" role="img" aria-label="提交画像雷达图">';levels.forEach(l=>{html+='<polygon class="radar-grid" points="'+scores.map((_,i)=>point(i,l*100).join(',')).join(' ')+'"></polygon>'});scores.forEach((x,i)=>{const end=point(i,100);const label=point(i,118);const score=point(i,103);html+='<line class="radar-axis" x1="'+c+'" y1="'+c+'" x2="'+end[0]+'" y2="'+end[1]+'"></line><text class="radar-label" text-anchor="middle" x="'+label[0]+'" y="'+label[1]+'">'+x.name+'</text><text class="radar-score" text-anchor="middle" x="'+score[0]+'" y="'+(score[1]+14)+'">'+x.value+'</text>'});html+='<polygon class="radar-area" points="'+poly+'"></polygon>';scores.forEach((x,i)=>{const p=point(i,x.value);html+='<circle class="radar-point" cx="'+p[0]+'" cy="'+p[1]+'" r="4"></circle>'});html+='</svg>';el.innerHTML=html}
function renderInsights(data){const el=$('submissionInsights');if(!el)return;const s=data.summary||{},daily=data.daily||[],cats=data.categories||[];const recent=s.recentSubmissions||0;const activeDays=daily.filter(d=>d.total>0).length;const top=cats[0];const insights=[];insights.push({t:recent?'提交热度':'提交热度偏低',p:recent?'最近 '+(data.rangeDays||30)+' 天收到 '+recent+' 次提交，日均 '+(s.avgPerDay||0)+' 次。':'当前周期暂无提交，可考虑降低提交入口阻力或在首页增强引导。'});insights.push({t:'高峰时段',p:s.peakCell?.total?'提交最集中在 '+formatPeak(s.peakCell)+'，共 '+s.peakCell.total+' 次，可在该时段后集中处理审核。':'暂未形成明显高峰时段。'});insights.push({t:'分类结构',p:top?'用户最常提交「'+top.catelog+'」，占周期提交约 '+Math.round(top.total/Math.max(1,recent)*100)+'%。':'暂无足够分类样本。'});insights.push({t:'稳定性',p:'周期内有 '+activeDays+' 天出现提交，覆盖率 '+Math.round(activeDays/Math.max(1,(data.rangeDays||30))*100)+'%。'});el.innerHTML=insights.map(i=>'<div class="insight-card"><strong>'+escapeHTML(i.t)+'</strong><p>'+escapeHTML(i.p)+'</p></div>').join('')}
function renderCategoryDonut(categories){const el=$('submissionCategoryDonut');if(!el)return;if(!categories?.length){el.innerHTML='<div class="empty-state">暂无占比数据</div>';return}const colors=['#b86b4b','#2f6f5e','#d8a24a','#8a6f4d','#b84a4a','#6f7a55','#9b6a4f','#7b6257'];const total=categories.reduce((n,c)=>n+c.total,0)||1;let angle=0;const stops=categories.map((c,i)=>{const start=angle;angle+=c.total/total*360;return colors[i%colors.length]+' '+start+'deg '+angle+'deg'}).join(',');const legend=categories.map((c,i)=>'<span><em><i class="donut-dot" style="background:'+colors[i%colors.length]+'"></i>'+escapeHTML(c.catelog)+'</em><b>'+Math.round(c.total/total*100)+'%</b></span>').join('');el.innerHTML='<div class="donut-chart" data-total="'+total+'" style="background:conic-gradient('+stops+')"></div><div class="donut-legend">'+legend+'</div>'}
function setBadge(id,text,cls=''){const el=$(id);if(!el)return;el.textContent=text;el.className=cls}
function renderQuality(q={}){const el=$('submissionQuality');if(!el)return;const items=[['完整度',q.completenessScore??0,'%'],['Logo 填写',q.logoRate??0,'%'],['描述填写',q.descRate??0,'%'],['重复 URL',q.duplicateRate??0,'%']];el.innerHTML=items.map(([name,val,unit])=>'<div class="quality-card"><strong>'+escapeHTML(val)+unit+'</strong><small>'+escapeHTML(name)+'</small><div class="quality-meter"><span style="width:'+Math.min(100,Math.max(0,Number(val)||0))+'%"></span></div></div>').join('')+'<div class="quality-card"><strong>'+escapeHTML(q.missingLogo??0)+'</strong><small>缺失 Logo</small></div><div class="quality-card"><strong>'+escapeHTML(q.missingDesc??0)+'</strong><small>缺失描述</small></div>'}
function renderDomains(domains=[]){const el=$('submissionDomains');if(!el)return;if(!domains.length){el.innerHTML='<div class="empty-state">暂无域名数据</div>';return}const max=Math.max(...domains.map(d=>d.total),1);el.innerHTML=domains.map(d=>'<div class="analytics-item"><div style="width:100%"><strong class="domain-host">'+escapeHTML(d.domain)+'</strong><small>'+d.total+' 次提交</small><div class="analytics-meter"><span style="width:'+Math.max(4,Math.round(d.total/max*100))+'%"></span></div></div></div>').join('')}
function renderAnomalies(items=[]){const el=$('submissionAnomalies');if(!el)return;if(!items.length){el.innerHTML='<div class="empty-state">暂无明显异常峰值</div>';return}el.innerHTML=items.map(i=>'<div class="analytics-item anomaly-high"><div><strong>'+escapeHTML(i.day)+'</strong><small>提交 '+i.total+' 次，约为日均 '+i.ratio+' 倍</small></div><span>⚠️</span></div>').join('')}
function renderCalendar(items=[]){const el=$('submissionCalendar');if(!el)return;if(!items.length){el.innerHTML='<div class="empty-state">暂无日历数据</div>';return}el.innerHTML=items.map(i=>'<div class="calendar-cell cal-'+(i.level||0)+'" title="'+escapeHTML(i.day+'：'+i.total+' 次')+'"></div>').join('')}
function renderOps(summary={},data={}){const change=Number(summary.changeRate||0);setBadge('analyticsChange',(change>0?'+':'')+change+'% 较上一周期',change>0?'up':(change<0?'down':''));setBadge('analyticsPressureLevel',summary.pressureLevel||'--');setBadge('analyticsActiveDays',(summary.activeDays||0)+' 个活跃日');setBadge('analyticsReviewHint',data.reviewWindow?.hour!==null?'建议 '+String(data.reviewWindow?.hour).padStart(2,'0')+':00 后':'固定时段');setText('pressureScore',(summary.pressureScore??0)+'/100');const bar=$('pressureBar');if(bar)bar.style.width=Math.min(100,Math.max(0,Number(summary.pressureScore)||0))+'%';setText('pressureText','当前压力等级：'+(summary.pressureLevel||'--')+'。分类集中度 '+(summary.categoryConcentration??0)+'%，资料完整度 '+(data.quality?.completenessScore??0)+'%。');setText('reviewWindowLabel',data.reviewWindow?.label||'暂无建议');setText('reviewWindowReason',data.reviewWindow?.reason||'')}
function renderSubmissionAnalytics(data){const summary=data.summary||{};setText('analyticsRecent',summary.recentSubmissions??0);setText('analyticsPendingTotal',summary.totalPending??0);setText('analyticsAvg',summary.avgPerDay??0);setText('analyticsPeak',formatPeak(summary.peakCell));setText('dailyTrendHint','最近 '+(data.rangeDays||30)+' 天，峰值 '+(summary.maxDaily||0)+' 次/天，上一周期 '+(summary.previousSubmissions||0)+' 次');renderOps(summary,data);renderDailyTrend(data.daily||[],summary.maxDaily||0);renderSubmissionHeatmap(data.heatmap||[],summary.maxHeat||0);renderAnalyticsCategories(data.categories||[]);renderCategoryDonut(data.categories||[]);renderCalendar(data.calendar||data.daily||[]);renderQuality(data.quality||{});renderDomains(data.domains||[]);renderAnomalies(data.anomalies||[]);renderLatestSubmissions(data.latest||[]);renderRadarChart(data);renderInsights(data);hideAnalyticsStatus()}
function fetchSubmissionAnalytics(){const days=$('analyticsDays')?.value||30;showAnalyticsStatus('正在加载提交分析...',true);fetch('/api/analytics/submissions?days='+encodeURIComponent(days)).then(r=>r.json()).then(d=>{if(d.code===200)renderSubmissionAnalytics(d.data||{});else showAnalyticsStatus(d.message||'提交分析加载失败')}).catch(()=>showAnalyticsStatus('网络错误，提交分析加载失败'))}
$('refreshSubmissionAnalytics')?.addEventListener('click',fetchSubmissionAnalytics);$('analyticsDays')?.addEventListener('change',fetchSubmissionAnalytics);

function normalizePickerColor(value){const v=String(value||'').trim();return /^#[0-9a-f]{6}$/i.test(v)?v:'#b86b4b'}
function renderCategoryColorEditor(value){const raw=String(value||'').trim();return '<div class="category-color-field category-color-editor"><input type="color" class="category-color-input category-native-color" value="'+escapeHTML(normalizePickerColor(raw))+'" data-original="'+escapeHTML(raw)+'" title="分类主题色"></div>'}
function bindCategoryColorEditors(root=document){root.querySelectorAll('.category-color-input[type="color"]').forEach(input=>{input.addEventListener('input',()=>{input.dataset.dirty='true'})})}
function fillParentSelects(){const opts='<option value="">无父类</option>'+categoriesData.map(c=>'<option value="'+c.id+'">'+escapeHTML(c.name)+'</option>').join('');$('newCategoryParent').innerHTML=opts;document.querySelectorAll('.category-parent-select').forEach(sel=>{const current=sel.dataset.current||'';const self=sel.dataset.self;sel.innerHTML=opts;Array.from(sel.options).forEach(o=>{if(o.value===self)o.disabled=true;if(o.value===current)o.selected=true})})}
function fetchCategories(){setTableLoading(categoryTableBody,10,'正在加载分类...');fetch('/api/categories').then(r=>r.json()).then(d=>{if(d.code===200){categoriesData=d.data||[];setText('statCategories',categoriesData.length);renderCategories();fillParentSelects()}else showMessage(d.message,'error')}).catch(()=>{renderTableState(categoryTableBody,10,'⚠️','加载失败','请稍后重试');showMessage('网络错误','error')})}
function renderCategories(){categoryTableBody.innerHTML='';if(!categoriesData.length){renderTableState(categoryTableBody,10,'🗂️','暂无分类数据','可以通过上方表单新增分类。');return}const nameMap=new Map(categoriesData.map(c=>[String(c.id),c.name]));categoriesData.forEach(c=>{const row=document.createElement('tr');row.dataset.id=c.id;row.draggable=true;row.className='category-row';const color=String(c.color||'').trim();row.innerHTML='<td><span class="drag-handle" title="拖动排序">⠿ '+c.id+'</span></td><td><input class="category-name-input" value="'+escapeHTML(c.name)+'"></td><td><select class="category-parent-select" data-self="'+c.id+'" data-current="'+(c.parent_id||'')+'"></select><small>当前：'+escapeHTML(c.parent_id?nameMap.get(String(c.parent_id))||'未知':'无父类')+'</small></td><td><input class="category-icon-input" value="'+escapeHTML(c.icon||'')+'" placeholder="留空则前台不显示图标"></td><td>'+renderCategoryColorEditor(color)+'</td><td><input class="category-description-input" value="'+escapeHTML(c.description||'')+'" placeholder="描述"></td><td>'+c.site_count+'</td><td>'+c.child_count+'</td><td><input type="number" class="category-sort-input" value="'+escapeHTML(c.sort_order)+'"></td><td class="category-actions"><button class="category-save-btn" data-id="'+c.id+'">保存</button><button class="category-del-btn" data-id="'+c.id+'">删除</button></td>';categoryTableBody.appendChild(row)});fillParentSelects();bindCategoryColorEditors(categoryTableBody);bindCategoryDragSort();document.querySelectorAll('.category-save-btn').forEach(b=>b.onclick=()=>saveCategory(b));document.querySelectorAll('.category-del-btn').forEach(b=>b.onclick=()=>deleteCategory(b.dataset.id))}
let categoryOrderDirty=false;
function bindCategoryDragSort(){const rows=Array.from(categoryTableBody.querySelectorAll('tr.category-row'));let dragged=null;rows.forEach(row=>{row.addEventListener('dragstart',e=>{dragged=row;row.classList.add('dragging');try{e.dataTransfer.effectAllowed='move'}catch{}});row.addEventListener('dragend',()=>{row.classList.remove('dragging');categoryTableBody.querySelectorAll('.drag-over').forEach(r=>r.classList.remove('drag-over'));dragged=null});row.addEventListener('dragover',e=>{e.preventDefault();if(!dragged||dragged===row)return;row.classList.add('drag-over')});row.addEventListener('dragleave',()=>row.classList.remove('drag-over'));row.addEventListener('drop',e=>{e.preventDefault();row.classList.remove('drag-over');if(!dragged||dragged===row)return;const all=Array.from(categoryTableBody.querySelectorAll('tr.category-row'));const from=all.indexOf(dragged),to=all.indexOf(row);if(from<to)row.after(dragged);else row.before(dragged);categoryOrderDirty=true;const btn=$('saveCategoryOrder');if(btn)btn.disabled=false})})}
function saveCategoryOrder(){if(!categoryOrderDirty){showMessage('当前没有需要保存的分类排序变更','error');return}const items=Array.from(categoryTableBody.querySelectorAll('tr.category-row')).map((row,i)=>({id:Number(row.dataset.id),sort_order:(i+1)*10}));if(!items.length)return;const btn=$('saveCategoryOrder');setBtnLoading(btn,true,'保存中');apiJson('/api/categories/reorder',{method:'POST',body:JSON.stringify({items})}).then(d=>{if(d.code===200){showMessage('分类排序已保存','success');categoryOrderDirty=false;fetchCategories();notifyFrontRefresh('category-reordered')}else showMessage(d.message||'保存分类排序失败','error')}).catch(()=>showMessage('网络错误','error')).finally(()=>{setBtnLoading(btn,false);const b=$('saveCategoryOrder');if(b)b.disabled=!categoryOrderDirty})}
$('saveCategoryOrder')?.addEventListener('click',saveCategoryOrder);
function getCategoryColorValue(input){if(!input)return'';return input.dataset.dirty==='true'?input.value.trim():(input.dataset.original||'').trim()}
function saveCategory(btn){const tr=btn.closest('tr');const id=btn.dataset.id;const colorInput=tr.querySelector('.category-color-input');const payload={name:tr.querySelector('.category-name-input').value.trim(),parent_id:tr.querySelector('.category-parent-select').value||null,icon:tr.querySelector('.category-icon-input').value.trim(),color:getCategoryColorValue(colorInput),description:tr.querySelector('.category-description-input').value.trim(),sort_order:Number(tr.querySelector('.category-sort-input').value||9999)};apiJson('/api/categories/'+id,{method:'PUT',body:JSON.stringify(payload)}).then(d=>{if(d.code===200){showMessage('分类已更新','success');fetchCategories();fetchConfigs();notifyFrontRefresh('category-updated')}else showMessage(d.message,'error')}).catch(()=>showMessage('网络错误','error'))}
async function deleteCategory(id){if(!(await confirmDialog('删除分类前必须移走书签和子类，确认删除？','删除分类确认')))return;apiJson('/api/categories/'+id,{method:'DELETE'}).then(d=>{if(d.code===200){showMessage('分类已删除','success');fetchCategories();notifyFrontRefresh('category-deleted')}else showMessage(d.message,'error')}).catch(()=>showMessage('网络错误','error'))}
$('createCategoryBtn').onclick=()=>{const payload={name:$('newCategoryName').value.trim(),parent_id:$('newCategoryParent').value||null,icon:$('newCategoryIcon').value.trim(),color:$('newCategoryColor').value.trim(),description:$('newCategoryDescription').value.trim(),sort_order:Number($('newCategorySort').value||9999)};if(!payload.name){showMessage('请输入分类名称','error');return}apiJson('/api/categories',{method:'POST',body:JSON.stringify(payload)}).then(d=>{if(d.code===201){showMessage('分类已创建','success');['newCategoryName','newCategoryIcon','newCategoryDescription','newCategorySort'].forEach(id=>$(id).value='');$('newCategoryColor').value='#b86b4b';$('newCategoryParent').value='';fetchCategories();notifyFrontRefresh('category-created')}else showMessage(d.message,'error')}).catch(()=>showMessage('网络错误','error'))}
function fetchTags(){setTableLoading(tagTableBody,4,'正在加载标签...');fetch('/api/tags').then(r=>r.json()).then(d=>{if(d.code===200)renderTags(d.data||[]);else showMessage(d.message||'标签加载失败','error')}).catch(()=>{renderTableState(tagTableBody,4,'⚠️','加载失败','请稍后重试');showMessage('网络错误','error')})}
function renderTags(tags){setText('tagTotalCount',tags.length);tagTableBody.innerHTML='';if(!tags.length){renderTableState(tagTableBody,4,'🏷️','暂无标签数据','可以先给书签添加标签，后续也会支持 AI 批量补齐标签。');return}tags.forEach(t=>{const row=document.createElement('tr');const name=t.name||t.tag||'';const count=t.site_count??t.count??t.bookmark_count??0;row.innerHTML='<td>'+escapeHTML(t.id||'')+'</td><td><span class="tag-pill">#'+escapeHTML(name)+'</span></td><td>'+escapeHTML(count)+'</td><td class="category-actions"><button class="tag-source-btn" data-name="'+escapeHTML(name)+'">作为源标签</button><button class="tag-target-btn check-btn" data-name="'+escapeHTML(name)+'">作为目标</button></td>';tagTableBody.appendChild(row)});document.querySelectorAll('.tag-source-btn').forEach(b=>b.onclick=()=>{$('mergeTagSource').value=b.dataset.name||'';$('mergeTagSource').focus()});document.querySelectorAll('.tag-target-btn').forEach(b=>b.onclick=()=>{$('mergeTagTarget').value=b.dataset.name||'';$('mergeTagTarget').focus()})}
function fetchTagReviewSites(){const limit=$('tagReviewLimit')?.value||20;const maxTags=$('tagReviewMaxTags')?.value||0;setTableLoading(tagReviewTableBody,6,'正在查找待补标签书签...');latestTagSuggestionPreview=null;const preview=$('tagSuggestPreview');if(preview)preview.style.display='none';fetch('/api/tags/needs-review?limit='+encodeURIComponent(limit)+'&maxTags='+encodeURIComponent(maxTags)).then(r=>r.json()).then(d=>{if(d.code===200)renderTagReviewSites(d.data||[]);else showMessage(d.message||'待补标签书签加载失败','error')}).catch(()=>{renderTableState(tagReviewTableBody,6,'⚠️','加载失败','请稍后重试');showMessage('网络错误','error')})}
function renderTagReviewSites(sites){tagReviewTableBody.innerHTML='';if(!sites.length){renderTableState(tagReviewTableBody,6,'✅','暂无待补标签书签','可以提高“标签数 ≤”阈值查看更多低标签书签。');return}sites.forEach(site=>{const row=document.createElement('tr');row.innerHTML='<td><input type="checkbox" class="tag-review-select" data-id="'+escapeHTML(site.id)+'"></td><td>'+escapeHTML(site.id)+'</td><td>'+escapeHTML(site.name||'未命名')+'<small style="display:block;color:var(--admin-muted)">'+escapeHTML(site.url||'')+'</small></td><td>'+escapeHTML(site.catelog||'未分类')+'</td><td>'+escapeHTML(site.tag_count||0)+'</td><td class="category-actions"><button class="tag-locate-site-btn check-btn" data-name="'+escapeHTML(site.name||'')+'">定位书签</button></td>';tagReviewTableBody.appendChild(row)});document.querySelectorAll('.tag-locate-site-btn').forEach(b=>b.onclick=()=>{currentSearchKeyword=b.dataset.name||'';searchInput.value=currentSearchKeyword;document.querySelectorAll('.tab-button').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));document.querySelector('.tab-button[data-tab="config"]')?.classList.add('active');$('config')?.classList.add('active');fetchConfigs(1,currentSearchKeyword)});const selectAll=$('selectAllTagReview');if(selectAll)selectAll.checked=false}
function getSelectedTagReviewIds(){return Array.from(document.querySelectorAll('.tag-review-select:checked')).map(cb=>Number(cb.dataset.id)).filter(Boolean)}
function renderTagSuggestPreview(data){const box=$('tagSuggestPreview');if(!box)return;const items=data?.results||[];latestTagSuggestionPreview=data||null;box.style.display='block';box.className='ai-status success';if(!items.length){latestTagSuggestionPreview=null;box.textContent='暂无推荐结果';return}box.innerHTML='<strong>批量 AI 标签推荐预览</strong><p>成功 '+escapeHTML(data.succeeded||0)+' 个，失败 '+escapeHTML(data.failed||0)+' 个。确认无误后可选择追加或替换写入数据库。</p><div class="ai-actions"><button type="button" id="applyTagSuggestionsAppend" class="check-btn">追加应用推荐标签</button><button type="button" id="applyTagSuggestionsReplace" class="del-btn">替换为推荐标签</button></div>'+items.map(item=>{const name=item.site?.name||('#'+item.siteId);const tags=(item.tags||[]).map(t=>'<span class="tag-pill">#'+escapeHTML(t)+'</span>').join(' ')||'<em>无推荐标签</em>';return '<div class="analytics-item"><div><strong>'+escapeHTML(name)+'</strong><small>'+escapeHTML(item.site?.catelog||'未分类')+' · '+escapeHTML(item.mode||'')+(item.message?' · '+escapeHTML(item.message):'')+'</small><div>'+tags+'</div></div><span>#'+escapeHTML(item.siteId)+'</span></div>'}).join('');$('applyTagSuggestionsAppend')?.addEventListener('click',()=>handleApplyTagSuggestions('append'));$('applyTagSuggestionsReplace')?.addEventListener('click',()=>handleApplyTagSuggestions('replace'))}
async function handleApplyTagSuggestions(mode='append'){const items=(latestTagSuggestionPreview?.results||[]).filter(item=>item.ok&&(item.tags||[]).length).map(item=>({siteId:item.siteId,tags:item.tags}));if(!items.length){showMessage('暂无可应用的推荐标签','error');return}const label=mode==='replace'?'替换现有标签':'追加到现有标签';if(!(await confirmDialog('确认将 '+items.length+' 个书签的推荐标签“'+label+'”？'+(mode==='replace'?' 此操作会覆盖这些书签原有标签。':''),'应用推荐标签确认')))return;const btn=$(mode==='replace'?'applyTagSuggestionsReplace':'applyTagSuggestionsAppend');setBtnLoading(btn,true,'应用中');apiJson('/api/tags/apply-suggestions',{method:'POST',body:JSON.stringify({items,mode})}).then(d=>{if(d.code===200){const r=d.data||{};showMessage('推荐标签已应用：更新 '+(r.updated||0)+' 个，失败 '+(r.failed||0)+' 个','success');latestTagSuggestionPreview=null;const box=$('tagSuggestPreview');if(box){box.className='ai-status success';box.textContent='推荐标签已应用：更新 '+(r.updated||0)+' 个，失败 '+(r.failed||0)+' 个。'}fetchTags();fetchTagReviewSites();fetchConfigs(currentPage,currentSearchKeyword);notifyFrontRefresh('tag-suggestions-applied')}else showMessage(d.message||'应用推荐标签失败','error')}).catch(()=>showMessage('网络错误','error')).finally(()=>setBtnLoading(btn,false))}
function handleBatchSuggestTags(){const ids=getSelectedTagReviewIds();if(!ids.length){showMessage('请先勾选要批量推荐标签的书签','error');return}if(ids.length>50){showMessage('为避免超时，单次最多选择 50 个书签预览','error');return}const btn=$('batchSuggestTags');setBtnLoading(btn,true,'推荐中');const box=$('tagSuggestPreview');if(box){box.style.display='block';box.className='ai-status loading';box.textContent='正在批量生成标签推荐预览...'}latestTagSuggestionPreview=null;apiJson('/api/tags/suggest-batch',{method:'POST',body:JSON.stringify({siteIds:ids,limit:8,batchLimit:50})}).then(d=>{if(d.code===200)renderTagSuggestPreview(d.data||{});else showMessage(d.message||'批量标签推荐失败','error')}).catch(()=>showMessage('网络错误','error')).finally(()=>setBtnLoading(btn,false))}
async function mergeTagPair(source,target,btn,onSuccess){if(!source||!target){showMessage('请输入源标签和目标标签','error');return}if(source===target){showMessage('源标签和目标标签不能相同','error');return}if(!(await confirmDialog('确认将标签「'+source+'」合并到「'+target+'」？源标签会被删除，相关书签会改用目标标签。','标签合并确认')))return;const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='合并中...'}apiJson('/api/tags/merge',{method:'POST',body:JSON.stringify({source,target})}).then(d=>{if(d.code===200){const r=d.data||{};showMessage('标签合并完成：已迁移 '+(r.moved||0)+' 个书签','success');$('mergeTagSource').value='';$('mergeTagTarget').value='';fetchTags();fetchConfigs(currentPage,currentSearchKeyword);notifyFrontRefresh('tags-merged');if(typeof onSuccess==='function')onSuccess(r)}else showMessage(d.message||'标签合并失败','error')}).catch(()=>showMessage('网络错误','error')).finally(()=>{if(btn){btn.disabled=false;btn.textContent=old}})}
function renderTagMergeSuggestions(data){const box=$('tagMergeSuggestions');if(!box)return;const items=data?.suggestions||[];box.style.display='block';box.className='ai-status success';if(!items.length){box.textContent='暂无可合并标签建议';return}const renderEmpty=()=>{box.innerHTML='<strong>AI 标签合并建议</strong><p>模式：'+escapeHTML(data.mode||'')+'。请逐项确认后再合并，避免误删有效标签。</p><p class="category-hint">本次建议已全部处理完毕。</p>'};box.innerHTML='<strong>AI 标签合并建议</strong><p>模式：'+escapeHTML(data.mode||'')+'。请逐项确认后再合并，避免误删有效标签。</p>'+items.map((item,i)=>'<div class="analytics-item"><div><strong>'+escapeHTML(item.source)+' → '+escapeHTML(item.target)+'</strong><small>源标签 '+escapeHTML(item.sourceCount||0)+' 个书签，目标标签 '+escapeHTML(item.targetCount||0)+' 个书签；置信度 '+escapeHTML(item.confidence||0)+'%</small><p style="margin:6px 0 0;color:var(--admin-muted)">'+escapeHTML(item.reason||'')+'</p></div><div class="category-actions"><button type="button" class="apply-tag-merge-suggestion check-btn" data-index="'+i+'">合并</button></div></div>').join('');box.querySelectorAll('.apply-tag-merge-suggestion').forEach(btn=>btn.onclick=()=>{const item=items[Number(btn.dataset.index)];mergeTagPair(item.source,item.target,btn,()=>{const row=btn.closest('.analytics-item');if(row)row.remove();if(!box.querySelector('.apply-tag-merge-suggestion'))renderEmpty()})})}
$('suggestTagMergesBtn')?.addEventListener('click',()=>{const btn=$('suggestTagMergesBtn');setBtnLoading(btn,true,'建议中');const box=$('tagMergeSuggestions');if(box){box.style.display='block';box.className='ai-status loading';box.textContent='正在生成标签合并建议...'}apiJson('/api/tags/merge-suggestions',{method:'POST',body:JSON.stringify({limit:8})}).then(d=>{if(d.code===200)renderTagMergeSuggestions(d.data||{});else showMessage(d.message||'生成标签合并建议失败','error')}).catch(()=>showMessage('网络错误','error')).finally(()=>setBtnLoading(btn,false))});
$('mergeTagsBtn')?.addEventListener('click',()=>mergeTagPair($('mergeTagSource').value.trim(),$('mergeTagTarget').value.trim(),$('mergeTagsBtn')));
$('refreshCategories').onclick=fetchCategories;
$('refreshTags')?.addEventListener('click',fetchTags);
$('refreshTagReview')?.addEventListener('click',fetchTagReviewSites);
$('selectAllTagReview')?.addEventListener('change',e=>document.querySelectorAll('.tag-review-select').forEach(cb=>cb.checked=e.target.checked));
$('batchSuggestTags')?.addEventListener('click',handleBatchSuggestTags);

const apiTokenTableBody=$('apiTokenTableBody');
function setTokenStatus(text,type='loading'){const el=$('newTokenBox');if(!el)return;el.textContent=text;el.className='ai-status '+type;el.style.display='block'}
function formatTokenScopes(scopes){return (Array.isArray(scopes)?scopes:String(scopes||'').split(/[,\\s]+/)).filter(Boolean).map(s=>'<span class="tag-pill">'+escapeHTML(s)+'</span>').join(' ')||'<span class="tag-pill">read</span>'}
function fetchApiTokens(){if(!apiTokenTableBody)return;setTableLoading(apiTokenTableBody,6,'正在加载 Token 列表...');apiJson('/api/tokens').then(d=>{if(d.code===200)renderApiTokens(d.data||[]);else{renderTableState(apiTokenTableBody,6,'⚠️','加载失败',d.message||'');showMessage(d.message||'Token 列表加载失败','error')}}).catch(()=>{renderTableState(apiTokenTableBody,6,'⚠️','网络错误','请稍后重试');showMessage('网络错误','error')})}
function renderApiTokens(list){apiTokenTableBody.innerHTML='';if(!list.length){renderTableState(apiTokenTableBody,6,'🔑','暂无 Token','点击“一键生成浏览器插件 Token”创建第一个 Token。');return}list.forEach(t=>{const revoked=Boolean(t.revokedAt);const row=document.createElement('tr');row.innerHTML='<td><strong>'+escapeHTML(t.name||'未命名 Token')+'</strong><small style="display:block;color:var(--admin-muted)">ID: '+escapeHTML(t.id||'')+'</small></td><td>'+formatTokenScopes(t.scopes)+'</td><td>'+escapeHTML(t.createdAt||'--')+'</td><td>'+escapeHTML(t.lastUsedAt||'从未使用')+'</td><td><span class="health '+(revoked?'health-bad':'health-ok')+'">'+(revoked?'已撤销':'可用')+'</span></td><td class="category-actions">'+(revoked?'<button type="button" disabled>已撤销</button>':'<button type="button" class="api-token-revoke del-btn" data-id="'+escapeHTML(t.id||'')+'">撤销</button>')+'</td>';apiTokenTableBody.appendChild(row)});apiTokenTableBody.querySelectorAll('.api-token-revoke').forEach(btn=>btn.onclick=()=>revokeApiToken(btn))}
function getNewTokenPayload(browserDefault=false){const name=browserDefault?'浏览器插件':($('newTokenName')?.value.trim()||'第三方客户端');const raw=browserDefault?'write':($('newTokenScopes')?.value||'write');return {name,scopes:raw.split(',').map(s=>s.trim()).filter(Boolean)}}
async function copyText(text,btn){try{await navigator.clipboard.writeText(text)}catch{const input=document.createElement('textarea');input.value=text;document.body.appendChild(input);input.select();document.execCommand('copy');input.remove()}showMessage('Token 已复制到剪贴板','success');if(btn){const old=btn.textContent;btn.textContent='已复制 ✓';btn.disabled=true;setTimeout(()=>{btn.textContent=old;btn.disabled=false},1600)}return true}
function renderNewToken(token,data){const box=$('newTokenBox');if(!box)return;box.style.display='block';box.className='ai-status success';box.innerHTML='<strong>Token 创建成功，请立即复制保存：</strong><textarea id="createdTokenValue" readonly style="margin-top:8px;width:100%;min-height:72px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace">'+escapeHTML(token||'')+'</textarea><div class="ai-actions" style="margin-top:8px"><button type="button" id="copyCreatedToken" class="check-btn">复制 Token</button></div><p class="category-hint">名称：'+escapeHTML(data?.name||'')+'；权限：'+escapeHTML((data?.scopes||[]).join(', '))+'。完整 Token 只会在这里显示一次。</p>';$('copyCreatedToken')?.addEventListener('click',e=>copyText(token||'',e.currentTarget))}
function createApiTokenFromAdmin(browserDefault=false){const btn=browserDefault?$('createBrowserToken'):$('createApiToken');setBtnLoading(btn,true,'生成中');setTokenStatus('正在创建 Token...','loading');apiJson('/api/tokens',{method:'POST',body:JSON.stringify(getNewTokenPayload(browserDefault))}).then(d=>{if(d.code===201){renderNewToken(d.token,d.data);showMessage('Token 创建成功，请立即复制保存','success');fetchApiTokens()}else setTokenStatus(d.message||'Token 创建失败','error')}).catch(()=>setTokenStatus('网络错误，Token 创建失败','error')).finally(()=>setBtnLoading(btn,false))}
async function revokeApiToken(btn){const id=btn.dataset.id;if(!id)return;if(!(await confirmDialog('确认撤销这个 Token？撤销后使用该 Token 的浏览器插件或脚本将无法继续写入。','撤销 Token 确认')))return;setBtnLoading(btn,true,'撤销中');apiJson('/api/tokens/'+encodeURIComponent(id),{method:'DELETE'}).then(d=>{if(d.code===200){showMessage('Token 已撤销','success');fetchApiTokens()}else showMessage(d.message||'撤销失败','error')}).catch(()=>showMessage('网络错误','error')).finally(()=>setBtnLoading(btn,false))}
$('refreshApiTokens')?.addEventListener('click',fetchApiTokens);
$('createBrowserToken')?.addEventListener('click',()=>createApiTokenFromAdmin(true));
$('createApiToken')?.addEventListener('click',()=>createApiTokenFromAdmin(false));

function fetchPrivateBookmarkSettings(){fetch('/api/settings/private-bookmarks').then(r=>r.json()).then(d=>{if(d.code===200){$('privateBookmarkPassword').placeholder=d.data?.passwordConfigured?'已配置访问密码，输入新密码可覆盖':'未配置时默认密码为 123456'}else showMessage(d.message,'error')}).catch(()=>showMessage('网络错误','error'))}
$('togglePrivatePassword').onclick=()=>{const input=$('privateBookmarkPassword');const visible=input.type==='text';input.type=visible?'password':'text';$('togglePrivatePassword').textContent=visible?'显示':'隐藏'}
$('savePrivatePassword').onclick=()=>{const password=$('privateBookmarkPassword').value.trim();if(!password){showMessage('请输入新的访问密码','error');return}apiJson('/api/settings/private-bookmarks',{method:'PUT',body:JSON.stringify({password})}).then(d=>{if(d.code===200){showMessage('私人书签访问密码已更新','success');$('privateBookmarkPassword').value='';fetchPrivateBookmarkSettings();notifyFrontRefresh('private-password-updated')}else showMessage(d.message,'error')}).catch(()=>showMessage('网络错误','error'))}

function setSystemStatus(text,type='loading'){const el=$('systemSettingsStatus');if(!el)return;el.textContent=text;el.className='ai-status '+type;el.style.display='block'}
function normalizeBrandIconUrl(icon){const t=String(icon||'').trim();if(!t)return '/pwa-icon.svg';if(/^https?:\\/\\//i.test(t)||t.startsWith('/'))return t;if(/^[\\w.-]+\\.[\\w.-]+/.test(t))return 'https://'+t;return '/pwa-icon.svg'}
function syncAdminBrandIcon(icon){const url=normalizeBrandIconUrl(icon);let favicon=document.getElementById('adminFavicon')||document.querySelector('link[rel="icon"]');let apple=document.getElementById('adminAppleTouchIcon')||document.querySelector('link[rel="apple-touch-icon"]');if(!favicon){favicon=document.createElement('link');favicon.id='adminFavicon';favicon.rel='icon';document.head.appendChild(favicon)}if(!apple){apple=document.createElement('link');apple.id='adminAppleTouchIcon';apple.rel='apple-touch-icon';document.head.appendChild(apple)}favicon.href=url;apple.href=url}
function renderSimpleMarkdown(md){const nl=String.fromCharCode(10);let text=escapeHTML(md||'').replaceAll(String.fromCharCode(13)+nl,nl);text=text.replaceAll('&grave;','&#96;');const lines=text.split(nl);let html='',inList=false;for(const raw of lines){const line=raw.trim();if(!line){if(inList){html+='</ul>';inList=false}continue}let content=line;if(content.startsWith('# ')){if(inList){html+='</ul>';inList=false}html+='<h1>'+content.slice(2)+'</h1>';continue}if(content.startsWith('## ')){if(inList){html+='</ul>';inList=false}html+='<h2>'+content.slice(3)+'</h2>';continue}if(content.startsWith('### ')){if(inList){html+='</ul>';inList=false}html+='<h3>'+content.slice(4)+'</h3>';continue}if(content.startsWith('- ')||content.startsWith('* ')){if(!inList){html+='<ul>';inList=true}html+='<li>'+formatInlineMarkdown(content.slice(2))+'</li>';continue}if(inList){html+='</ul>';inList=false}html+='<p>'+formatInlineMarkdown(content)+'</p>'}if(inList)html+='</ul>';return html||'<p>暂无公告内容</p>'}
function formatInlineMarkdown(text){let out=text;while(out.includes('**')){const s=out.indexOf('**');const e=out.indexOf('**',s+2);if(e<0)break;out=out.slice(0,s)+'<strong>'+out.slice(s+2,e)+'</strong>'+out.slice(e+2)}return out}
function getSystemPayload(){return {siteName:$('systemSiteName').value.trim(),siteSubtitle:$('systemSiteSubtitle').value.trim(),siteIcon:$('systemSiteIcon').value.trim(),footerText:$('systemFooterText').value.trim(),backgroundImage:$('systemBackgroundImage')?.value.trim()||'',heroVisible:$('systemHeroVisible')?.checked!==false,blogVisible:$('systemBlogVisible')?.checked!==false,blogUrl:$('systemBlogUrl')?.value.trim()||'',blogLabel:$('systemBlogLabel')?.value.trim()||'',defaultLayout:$('systemDefaultLayout')?.value||'',defaultAccent:$('systemDefaultAccent')?.value||'',announcementEnabled:$('announcementEnabled').checked,announcementTitle:$('announcementTitle').value.trim(),announcementMarkdown:$('announcementMarkdown').value,announcementVersion:$('announcementVersion').value.trim(),announcementShowOnce:$('announcementShowOnce').checked,announcementButtonText:$('announcementButtonText').value.trim()}}
function fillSystemSettings(s={}){$('systemSiteName').value=s.siteName||'';$('systemSiteSubtitle').value=s.siteSubtitle||'';$('systemSiteIcon').value=s.siteIcon||'';$('systemFooterText').value=s.footerText||'';if($('systemBackgroundImage'))$('systemBackgroundImage').value=s.backgroundImage||'';if($('systemHeroVisible'))$('systemHeroVisible').checked=s.heroVisible!=='false';if($('systemBlogVisible'))$('systemBlogVisible').checked=s.blogVisible!=='false';if($('systemBlogUrl'))$('systemBlogUrl').value=s.blogUrl||'';if($('systemBlogLabel'))$('systemBlogLabel').value=s.blogLabel||'';if($('systemDefaultLayout'))$('systemDefaultLayout').value=s.defaultLayout||'';if($('systemDefaultAccent'))$('systemDefaultAccent').value=s.defaultAccent||'';$('announcementEnabled').checked=s.announcementEnabled==='true';$('announcementTitle').value=s.announcementTitle||'';$('announcementMarkdown').value=s.announcementMarkdown||'';$('announcementVersion').value=s.announcementVersion||'1';$('announcementShowOnce').checked=s.announcementShowOnce!=='false';$('announcementButtonText').value=s.announcementButtonText||'我知道了';syncAdminBrandIcon(s.siteIcon)}
function fetchSystemSettings(){setSystemStatus('正在加载系统设置...','loading');fetch('/api/settings/system').then(r=>r.json()).then(d=>{if(d.code===200){fillSystemSettings(d.data||{});setSystemStatus('系统设置已加载。','success')}else setSystemStatus(d.message||'加载失败','error')}).catch(()=>setSystemStatus('网络错误，系统设置加载失败','error'))}
function initializeAdminBrandIcon(){fetch('/api/settings/system').then(r=>r.json()).then(d=>{if(d.code===200)syncAdminBrandIcon(d.data?.siteIcon)}).catch(()=>syncAdminBrandIcon(''))}
function previewAnnouncement(){const title=$('announcementTitle').value.trim()||'系统公告';const md=$('announcementMarkdown').value;const box=$('announcementPreview');box.style.display='block';box.innerHTML='<h2>'+escapeHTML(title)+'</h2>'+renderSimpleMarkdown(md||'暂无公告内容')}
$('refreshSystemSettings')?.addEventListener('click',fetchSystemSettings);
$('previewAnnouncement')?.addEventListener('click',previewAnnouncement);
$('previewSystemIcon')?.addEventListener('click',()=>{const url=$('systemSiteIcon').value.trim();if(!url){setSystemStatus('请先填写图标 URL','error');return}const box=$('announcementPreview');box.style.display='block';box.innerHTML='<div style="display:flex;align-items:center;gap:12px"><img src="'+escapeHTML(url)+'" alt="icon" style="width:48px;height:48px;border-radius:12px;object-fit:contain;border:1px solid var(--admin-line);background:#fff"><span>图标预览：'+escapeHTML(url)+'</span></div>'});
$('bumpAnnouncementVersion')?.addEventListener('click',()=>{const current=$('announcementVersion').value.trim();const n=Number(current);$('announcementVersion').value=Number.isFinite(n)?String(n+1):String(Date.now())});
$('saveSystemSettings')?.addEventListener('click',()=>{const btn=$('saveSystemSettings');const old=btn.textContent;btn.disabled=true;btn.textContent='保存中...';setSystemStatus('正在保存系统设置...','loading');apiJson('/api/settings/system',{method:'PUT',body:JSON.stringify(getSystemPayload())}).then(d=>{if(d.code===200){fillSystemSettings(d.data||{});setSystemStatus('系统设置已保存，前台会自动刷新。','success');notifyFrontRefresh('system-settings-updated')}else setSystemStatus(d.message||'保存失败','error')}).catch(()=>setSystemStatus('网络错误，保存失败','error')).finally(()=>{btn.disabled=false;btn.textContent=old})});

function getAiPayload(){return {enabled:$('aiEnabled').checked,baseUrl:$('aiBaseUrl').value.trim(),model:$('aiModel').value.trim(),apiKey:$('aiApiKey').value.trim(),systemPrompt:$('aiSystemPrompt').value.trim()}}
function setAiStatus(text,type='loading'){const el=$('aiSettingsStatus');if(!el)return;el.textContent=text;el.className='ai-status '+type;el.style.display='block'}
function fillAiModels(models=[]){const list=$('aiModelList');if(!list)return;list.innerHTML=models.map(m=>'<option value="'+escapeHTML(m)+'"></option>').join('')}
function fetchAiSettings(){fetch('/api/settings/ai').then(r=>r.json()).then(d=>{if(d.code===200){const s=d.data||{};$('aiEnabled').checked=s.enabled==='true';$('aiBaseUrl').value=s.baseUrl||'';$('aiModel').value=s.model||'';$('aiApiKey').value='';$('aiApiKey').type='password';$('toggleAiApiKey').textContent='显示';$('aiApiKey').placeholder=s.configured?'已配置 API Key，留空不修改':'请输入 API Key';$('aiSystemPrompt').value=s.systemPrompt||'';setAiStatus(s.configured?'已加载配置：API Key 已保存。':'已加载配置：尚未保存 API Key。','success')}else showMessage(d.message,'error')}).catch(()=>showMessage('网络错误','error'))}
$('refreshAiSettings').onclick=fetchAiSettings;
$('toggleAiApiKey')?.addEventListener('click',()=>{const input=$('aiApiKey');const btn=$('toggleAiApiKey');if(!input||!btn)return;const visible=input.type==='text';input.type=visible?'password':'text';btn.textContent=visible?'显示':'隐藏';input.focus()});
$('fetchAiModels')?.addEventListener('click',()=>{const btn=$('fetchAiModels');const old=btn.textContent;btn.disabled=true;btn.textContent='获取中...';setAiStatus('正在从模型服务获取可用模型列表...','loading');apiJson('/api/settings/ai/models',{method:'POST',body:JSON.stringify(getAiPayload())}).then(d=>{if(d.code===200){const data=d.data||{};fillAiModels(data.models||[]);setAiStatus('已获取 '+(data.total||0)+' 个模型。接口：'+(data.endpoint||'')+(data.models?.length?'\\n可在“模型名称”输入框下拉选择。':'\\n服务商没有返回模型列表，请手动填写模型名。'),'success')}else setAiStatus(d.message||'获取模型失败','error')}).catch(()=>setAiStatus('网络错误，获取模型失败','error')).finally(()=>{btn.disabled=false;btn.textContent=old})});
$('testAiSettings')?.addEventListener('click',()=>{const btn=$('testAiSettings');const old=btn.textContent;btn.disabled=true;btn.textContent='测试中...';setAiStatus('正在测试当前大模型 API 配置，请稍候...','loading');apiJson('/api/settings/ai/test',{method:'POST',body:JSON.stringify(getAiPayload())}).then(d=>{if(d.code===200){const data=d.data||{};setAiStatus('连接测试成功。\\n模型：'+(data.model||'')+'\\n接口：'+(data.baseUrl||'')+'\\n模型回复：'+(data.answer||''),'success')}else setAiStatus(d.message||'连接测试失败','error')}).catch(()=>setAiStatus('网络错误，连接测试失败','error')).finally(()=>{btn.disabled=false;btn.textContent=old})});
$('saveAiSettings').onclick=()=>{const payload=getAiPayload();apiJson('/api/settings/ai',{method:'PUT',body:JSON.stringify(payload)}).then(d=>{if(d.code===200){showMessage('API 接入设置已保存','success');setAiStatus('API 接入设置已保存，相关大模型功能已更新。','success');$('aiApiKey').value='';fetchAiSettings();notifyFrontRefresh('ai-settings-updated')}else setAiStatus(d.message||'保存失败','error')}).catch(()=>setAiStatus('网络错误，保存失败','error'))}

$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=(e)=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=async(ev)=>{try{const payload=JSON.parse(ev.target.result);const mode=$('importMode')?.value||'merge';const preview=await apiJson('/api/config/import/preview?mode='+encodeURIComponent(mode),{method:'POST',body:JSON.stringify(payload)});if(preview.code!==200){showMessage(preview.message||'导入预览失败','error');return}const p=preview.data||{};const summary='导入预览：\\n恢复模式：'+(mode==='overwrite'?'覆盖恢复（会先清空现有书签/分类/标签）':'合并导入')+'\\n总书签：'+(p.totalSites||0)+'\\n可导入：'+(p.importableSites||0)+'\\n无效：'+(p.invalidSites||0)+'\\n与现有重复：'+(p.duplicateExisting||0)+'\\n文件内重复：'+(p.duplicateInFile||0)+'\\n将自动创建分类：'+((p.willCreateCategories||[]).join('、')||'无')+'\\n\\n确认继续导入？'+(mode==='overwrite'?'覆盖恢复会删除当前已有书签、分类和标签后重建。':'重复和无效项会被跳过。');if(!(await confirmDialog(summary,mode==='overwrite'?'覆盖恢复确认':'导入预览确认')))return;if(mode==='overwrite'&&!(await confirmDialog('最终确认：覆盖恢复会清空当前已有书签、分类和标签，此操作不可撤销。','危险操作确认')))return;apiJson('/api/config/import?mode='+encodeURIComponent(mode),{method:'POST',body:JSON.stringify(payload)}).then(d=>{if(d.code===201){showMessage('导入成功：'+(d.message||''),'success');fetchConfigs();fetchCategories();notifyFrontRefresh(mode==='overwrite'?'config-overwrite-restored':'config-imported')}else showMessage(d.message,'error')})}catch{showMessage('JSON格式不正确','error')}finally{e.target.value=''}};reader.readAsText(file)}
function downloadExport(url,filename){fetch(url).then(r=>r.blob()).then(blob=>{const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=filename||'config.json';document.body.appendChild(a);a.click();URL.revokeObjectURL(u);document.body.removeChild(a)}).catch(()=>showMessage('网络错误','error'))}
$('exportBtn').onclick=()=>downloadExport('/api/config/export','config.json');$('exportLegacyBtn').onclick=()=>downloadExport('/api/config/export?mode=legacy','config-legacy.json');$('exportCsvBtn').onclick=()=>downloadExport('/api/config/export?format=csv','bookmarks.csv');$('exportHtmlBtn').onclick=()=>downloadExport('/api/config/export?format=html','bookmarks.html');

let operationLogPage=1,operationLogTotal=0;const operationLogPageSize=20;const operationLogTableBody=$('operationLogTableBody');
function fetchOperationLogs(page=operationLogPage){const action=$('operationLogActionFilter')?.value||'';setTableLoading(operationLogTableBody,6,'正在加载操作日志...');fetch('/api/operation-logs?page='+page+'&pageSize='+operationLogPageSize+(action?'&action='+encodeURIComponent(action):'')).then(r=>r.json()).then(d=>{if(d.code===200){operationLogTotal=d.total||0;operationLogPage=d.page||1;const totalPages=Math.max(1,Math.ceil(operationLogTotal/operationLogPageSize));setText('operationLogCurrentPage',operationLogPage);setText('operationLogTotalPages',totalPages);$('operationLogPrev').disabled=operationLogPage<=1;$('operationLogNext').disabled=operationLogPage>=totalPages;renderOperationLogs(d.data||[])}else showMessage(d.message||'操作日志加载失败','error')}).catch(()=>{renderTableState(operationLogTableBody,6,'⚠️','加载失败','请稍后重试');showMessage('网络错误','error')})}
function renderOperationLogs(logs){operationLogTableBody.innerHTML='';if(!logs.length){renderTableState(operationLogTableBody,6,'📋','暂无操作日志','后台关键写操作会自动记录在这里。');return}logs.forEach(log=>{const row=document.createElement('tr');row.innerHTML='<td>'+escapeHTML(log.create_time||'')+'</td><td><span class="tag-pill">'+escapeHTML(log.action||'')+'</span></td><td>'+escapeHTML(log.target||'')+'</td><td>'+escapeHTML(log.target_id||'')+'</td><td>'+escapeHTML(log.summary||'')+'</td><td>'+escapeHTML(log.ip||'')+'</td>';operationLogTableBody.appendChild(row)})}
$('refreshOperationLogs')?.addEventListener('click',()=>fetchOperationLogs(1));
$('operationLogActionFilter')?.addEventListener('change',()=>{operationLogPage=1;fetchOperationLogs(1)});
$('operationLogPrev')?.addEventListener('click',()=>{if(operationLogPage>1)fetchOperationLogs(operationLogPage-1)});
$('operationLogNext')?.addEventListener('click',()=>{const totalPages=Math.max(1,Math.ceil(operationLogTotal/operationLogPageSize));if(operationLogPage<totalPages)fetchOperationLogs(operationLogPage+1)});

const backupTableBody=$('backupTableBody');
function setBackupStatus(text,type='loading'){const el=$('backupStatus');if(!el)return;el.textContent=text;el.className='ai-status '+type;el.style.display='block'}
function hideBackupStatus(){const el=$('backupStatus');if(el)el.style.display='none'}
function formatBytes(bytes){if(!bytes||bytes<1024)return (bytes||0)+' B';if(bytes<1048576)return (bytes/1024).toFixed(1)+' KB';return (bytes/1048576).toFixed(2)+' MB'}
function getWebdavPayload(){return{enabled:$('webdavEnabled')?.value||'false',url:$('webdavUrl')?.value.trim()||'',username:$('webdavUsername')?.value.trim()||'',password:$('webdavPassword')?.value||'',path:$('webdavPath')?.value.trim()||'StarNav'}}
function fillWebdavSettings(data){if(!data)return;if($('webdavEnabled'))$('webdavEnabled').value=data.enabled==='true'?'true':'false';if($('webdavUrl'))$('webdavUrl').value=data.url||'';if($('webdavUsername'))$('webdavUsername').value=data.username||'';if($('webdavPassword'))$('webdavPassword').value='';if($('webdavPath'))$('webdavPath').value=data.path||'StarNav';setText('webdavPasswordHint',data.hasPassword?'已保存密码，留空不修改':'尚未保存密码')}
function fetchWebdavSettings(){apiJson('/api/backups/webdav-settings').then(d=>{if(d.code===200)fillWebdavSettings(d.data||{});else showMessage(d.message||'WebDAV 设置加载失败','error')}).catch(()=>showMessage('WebDAV 设置加载失败','error'))}
function webdavStatusText(m){const w=m?.webdav;if(!w)return '';if(w.uploaded)return '，WebDAV 已上传：'+(w.fileName||'');if(w.skipped)return '，WebDAV 未启用';if(w.error)return '，WebDAV 上传失败：'+w.error;return ''}
function fetchBackups(){setTableLoading(backupTableBody,8,'正在加载备份列表...');apiJson('/api/backups').then(d=>{if(d.code===200)renderBackups(d.data||[]);else{renderTableState(backupTableBody,8,'⚠️','加载失败',d.message||'');showMessage(d.message||'备份列表加载失败','error')}}).catch(()=>{renderTableState(backupTableBody,8,'⚠️','网络错误','请稍后重试');showMessage('网络错误','error')})}
function renderBackups(list){backupTableBody.innerHTML='';if(!list.length){renderTableState(backupTableBody,8,'💾','暂无备份','点击"立即备份"创建第一份备份。');return}list.forEach(b=>{const row=document.createElement('tr');const reasonLabel={'manual':'手动','cron':'定时','pre-restore':'恢复前快照'}[b.reason]||b.reason;const note=(b.note||'')+webdavStatusText(b);row.innerHTML='<td style="font-size:.78rem;word-break:break-all;max-width:200px">'+escapeHTML(b.id||'')+'</td><td><span class="tag-pill">'+escapeHTML(reasonLabel)+'</span></td><td>'+escapeHTML(b.siteCount??'--')+'</td><td>'+escapeHTML(b.categoryCount??'--')+'</td><td>'+formatBytes(b.sizeBytes)+'</td><td>'+escapeHTML(b.createdAt||'')+'</td><td>'+escapeHTML(note||'')+'</td><td class="category-actions"><button class="backup-download-btn check-btn" data-id="'+escapeHTML(b.id)+'">下载</button><button class="backup-restore-btn" data-id="'+escapeHTML(b.id)+'">恢复</button><button class="backup-delete-btn del-btn" data-id="'+escapeHTML(b.id)+'">删除</button></td>';backupTableBody.appendChild(row)});backupTableBody.querySelectorAll('.backup-download-btn').forEach(btn=>btn.onclick=()=>downloadExport('/api/backups/'+encodeURIComponent(btn.dataset.id),'backup-'+btn.dataset.id+'.json'));backupTableBody.querySelectorAll('.backup-restore-btn').forEach(btn=>btn.onclick=()=>handleRestoreBackup(btn));backupTableBody.querySelectorAll('.backup-delete-btn').forEach(btn=>btn.onclick=()=>handleDeleteBackup(btn))}
async function handleRestoreBackup(btn){const id=btn.dataset.id;if(!(await confirmDialog('确认从备份 '+id+' 恢复？恢复前会自动创建一份当前数据快照。\\n\\n恢复模式为"覆盖"：会清空现有书签、分类和标签后重建。','恢复备份确认')))return;setBtnLoading(btn,true,'恢复中');setBackupStatus('正在恢复备份...','loading');apiJson('/api/backups/'+encodeURIComponent(id)+'/restore',{method:'POST',body:JSON.stringify({mode:'overwrite'})}).then(d=>{if(d.code===200){const r=d.data||{};setBackupStatus('恢复成功：导入 '+(r.importedSites||0)+' 个书签，恢复前快照 ID：'+(r.preRestoreSnapshotId||'无'),'success');showMessage('备份恢复成功','success');fetchBackups();fetchConfigs();fetchCategories();notifyFrontRefresh('backup-restored')}else{setBackupStatus(d.message||'恢复失败','error');showMessage(d.message||'恢复失败','error')}}).catch(()=>{setBackupStatus('网络错误','error');showMessage('网络错误','error')}).finally(()=>setBtnLoading(btn,false))}
async function handleDeleteBackup(btn){const id=btn.dataset.id;if(!(await confirmDialog('确认删除备份 '+id+'？此操作不可恢复。','删除备份确认')))return;setBtnLoading(btn,true,'删除中');apiJson('/api/backups/'+encodeURIComponent(id),{method:'DELETE'}).then(d=>{if(d.code===200){showMessage('备份已删除','success');fetchBackups()}else showMessage(d.message||'删除失败','error')}).catch(()=>showMessage('网络错误','error')).finally(()=>setBtnLoading(btn,false))}
$('createBackupBtn')?.addEventListener('click',()=>{const btn=$('createBackupBtn');setBtnLoading(btn,true,'备份中');setBackupStatus('正在创建备份...','loading');apiJson('/api/backups',{method:'POST',body:JSON.stringify({reason:'manual'})}).then(d=>{if(d.code===201){const m=d.data||{};setBackupStatus('备份创建成功：'+m.siteCount+' 个书签，'+m.categoryCount+' 个分类，大小 '+formatBytes(m.sizeBytes)+(m.prunedOld?' (已清理 '+m.prunedOld+' 份旧备份)':'')+webdavStatusText(m),'success');showMessage('备份创建成功','success');fetchBackups()}else{setBackupStatus(d.message||'备份失败','error');showMessage(d.message||'备份失败','error')}}).catch(()=>{setBackupStatus('网络错误','error');showMessage('网络错误','error')}).finally(()=>setBtnLoading(btn,false))});
$('refreshBackups')?.addEventListener('click',fetchBackups);
$('saveWebdavSettings')?.addEventListener('click',()=>{const btn=$('saveWebdavSettings');setBtnLoading(btn,true,'保存中');apiJson('/api/backups/webdav-settings',{method:'PUT',body:JSON.stringify(getWebdavPayload())}).then(d=>{if(d.code===200){fillWebdavSettings(d.data||{});showMessage('WebDAV 设置已保存','success')}else showMessage(d.message||'WebDAV 设置保存失败','error')}).catch(()=>showMessage('网络错误','error')).finally(()=>setBtnLoading(btn,false))});
$('testWebdavSettings')?.addEventListener('click',()=>{const btn=$('testWebdavSettings');setBtnLoading(btn,true,'测试中');setBackupStatus('正在测试 WebDAV 连接...','loading');apiJson('/api/backups/webdav-test',{method:'POST',body:JSON.stringify(getWebdavPayload())}).then(d=>{if(d.code===200){setBackupStatus('WebDAV 测试成功，测试文件已上传并尝试删除。','success');showMessage('WebDAV 测试成功','success')}else{setBackupStatus(d.message||'WebDAV 测试失败','error');showMessage(d.message||'WebDAV 测试失败','error')}}).catch(()=>{setBackupStatus('网络错误','error');showMessage('网络错误','error')}).finally(()=>setBtnLoading(btn,false))});
fetchWebdavSettings();

function fetchVisitAnalytics(){const el=$('visitAnalyticsStatus');if(el){el.style.display='block';el.className='ai-status loading';el.textContent='正在加载访问分析...'}Promise.all([apiJson('/api/analytics/sites'),apiJson('/api/analytics/search')]).then(([siteData,searchData])=>{if(el)el.style.display='none';if(siteData.code===200){const d=siteData.data||{};const s=d.summary||{};setText('vaTotalSites',s.totalSites??'--');setText('vaTotalHits',s.totalHits??'--');setText('vaNeverVisited',s.neverVisited??'--');setText('vaStale30d',s.staleOver30Days??'--');renderVaList('vaTopSites',d.topByHits||[],(item)=>'<div class="analytics-item"><div style="width:100%"><strong>'+escapeHTML(item.name)+'</strong><small>'+escapeHTML(item.catelog||'未分类')+' · '+item.hits+' 次点击'+(item.last_visit_time?' · 最近 '+escapeHTML(item.last_visit_time):'')+'</small><div class="analytics-meter"><span style="width:'+Math.max(4,Math.round(item.hits/Math.max(1,(d.topByHits[0]?.hits||1))*100))+'%"></span></div></div><span>#'+item.id+'</span></div>');renderVaList('vaCategoryHeat',d.categoryHeat||[],(item)=>'<div class="analytics-item"><div style="width:100%"><strong>'+escapeHTML(item.catelog)+'</strong><small>'+item.siteCount+' 个书签 · 累计 '+item.totalHits+' 次 · 均 '+item.avgHits+' 次/站</small><div class="analytics-meter"><span style="width:'+Math.max(4,Math.round(item.totalHits/Math.max(1,(d.categoryHeat[0]?.totalHits||1))*100))+'%"></span></div></div></div>');renderVaList('vaRecentlyActive',d.recentlyActive||[],(item)=>'<div class="analytics-item"><div><strong>'+escapeHTML(item.name)+'</strong><small>'+escapeHTML(item.catelog||'未分类')+' · '+item.hits+' 次 · '+escapeHTML(item.last_visit_time||'')+'</small></div><span>#'+item.id+'</span></div>');renderVaList('vaInactiveSites',d.inactiveSites||[],(item)=>'<div class="analytics-item"><div><strong>'+escapeHTML(item.name)+'</strong><small>'+escapeHTML(item.catelog||'未分类')+' · '+(item.last_visit_time?'最后访问 '+escapeHTML(item.last_visit_time):'从未访问')+'</small></div><span>#'+item.id+'</span></div>')}else{if(el){el.style.display='block';el.className='ai-status error';el.textContent=siteData.message||'加载失败'}}if(searchData.code===200){const sd=searchData.data||{};renderVaList('vaPopularSearches',(sd.popular||[]).slice(0,15),(item)=>'<div class="analytics-item"><div><strong>'+escapeHTML(item.keyword)+'</strong><small>搜索 '+item.totalSearches+' 次 · 结果 '+item.lastResultCount+' 条</small></div></div>');renderVaList('vaZeroResultSearches',(sd.zeroResults||[]).slice(0,15),(item)=>'<div class="analytics-item"><div><strong>'+escapeHTML(item.keyword)+'</strong><small>搜索 '+item.totalSearches+' 次 · 无结果 '+item.zeroResultCount+' 次</small></div></div>')}}).catch(()=>{if(el){el.style.display='block';el.className='ai-status error';el.textContent='网络错误'}})}
function renderVaList(id,items,renderFn){const el=$(id);if(!el)return;if(!items.length){el.innerHTML='<div class="empty-state">暂无数据</div>';return}el.innerHTML=items.map(renderFn).join('')}
$('refreshVisitAnalytics')?.addEventListener('click',fetchVisitAnalytics);

initializeAdminBrandIcon();bindCategoryColorEditors(document);fetchConfigs();fetchPendingConfigs();fetchCategories();
`;

export function getAdminAsset(filePath) {
  if (filePath === 'admin.html') return { content: adminHtml, type: 'text/html; charset=utf-8' };
  if (filePath === 'admin.css') return { content: adminCss, type: 'text/css; charset=utf-8' };
  if (filePath === 'admin.js') return { content: adminJs, type: 'application/javascript; charset=utf-8' };
  return null;
}