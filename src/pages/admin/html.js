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
      <div class="add-action-field">
        <select id="addSpace" title="所属空间" style="display:none;"><option value="">默认空间</option></select>
        <select id="addVisibility" title="可见性"><option value="public">公开</option><option value="private">私密</option><option value="unlisted">不列出</option><option value="admin_only">仅管理员</option></select>
      </div>
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
        <button class="tab-button" data-tab="spaces" style="display:none;">空间管理</button>
        <button class="tab-button" data-tab="categories">分类管理</button>
        <button class="tab-button" data-tab="tags">标签管理</button>
        <button class="tab-button" data-tab="privateBookmarks">私人书签</button>
        <button class="tab-button" data-tab="systemSettings">系统设置</button>
        <button class="tab-button" data-tab="systemHealth">系统健康</button>
        <button class="tab-button" data-tab="aiAdmin">AI 助手</button>
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
            <select id="bulkSpace" title="批量移动空间" style="display:none;">
              <option value="">移动到空间...</option>
            </select>
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
            <select id="spaceFilter" title="按空间筛选" style="display:none;"><option value="">全部空间</option></select>
            <select id="healthFilter" title="健康状态筛选">
              <option value="">全部健康状态</option>
              <option value="bad">只看异常</option>
              <option value="ok">只看正常</option>
              <option value="unknown">只看未检测</option>
            </select>
            <select id="configDensityMode" title="书签列表显示密度">
              <option value="comfortable">舒适密度</option>
              <option value="compact">紧凑密度</option>
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
        <div id="bulkResultPanel" class="bulk-result-panel" style="display:none;"></div>
        <div class="table-wrapper">
          <table id="configTable">
            <thead>
              <tr>
                <th><input type="checkbox" id="selectAllConfigsHead" title="全选本页"></th><th>ID</th><th>Name</th><th>URL</th><th>Logo</th><th>Description</th><th>Catelog</th><th style="display:none;">空间</th><th>可见性</th><th>Tags</th><th>排序</th><th>健康</th><th>Actions</th>
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

      <div id="spaces" class="tab-content">
        <div class="category-toolbar">
          <p class="category-hint">管理导航空间。书签和分类都归属于空间，前台可通过空间切换，实现不同场景书签的隔离。</p>
          <button id="refreshSpaces" type="button">刷新空间</button>
        </div>
        <div class="add-new category-add category-add-panel">
          <input type="text" id="newSpaceName" placeholder="新空间名称">
          <input type="text" id="newSpaceSlug" placeholder="英文 Slug (URL 标识)">
          <input type="text" id="newSpaceIcon" placeholder="图标 (emoji/SVG)">
          <input type="text" id="newSpaceDescription" placeholder="描述 (可选)">
          <select id="newSpaceVisibility" title="可见性"><option value="public">公开</option><option value="private">私密</option><option value="admin_only">仅管理员</option></select>
          <input type="number" id="newSpaceSort" placeholder="排序">
          <button id="createSpaceBtn">新增空间</button>
        </div>
        <div class="table-wrapper">
          <table id="spaceTable">
            <thead>
              <tr>
                <th>ID</th><th>空间名称</th><th>Slug</th><th>图标</th><th>描述</th><th>可见性</th><th>排序</th><th>操作</th>
              </tr>
            </thead>
            <tbody id="spaceTableBody"><tr><td colspan="8">加载中...</td></tr></tbody>
          </table>
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
          <select id="newCategorySpace" title="所属空间" style="display:none;"><option value="">默认空间</option></select>
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
          <label><input type="checkbox" id="systemPublicSubmissionEnabled"> 显示前台公开提交入口</label>
          <label><input type="checkbox" id="systemPrivateBookmarksVisible"> 显示前台私人书签入口</label>
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

      <div id="systemHealth" class="tab-content">
        <div class="category-toolbar">
          <p class="category-hint">集中巡检 D1 / KV 绑定、核心数据表、异常链接、待审核、Token、WebHook、备份、AI 与站点设置状态。</p>
          <button id="refreshSystemHealth" type="button">刷新健康状态</button>
        </div>
        <div id="systemHealthStatus" class="ai-status" style="display:none;"></div>
        <div class="analytics-summary">
          <div class="analytics-card"><span>🧭</span><strong id="healthOverall">--</strong><small>总体状态</small></div>
          <div class="analytics-card"><span>🔖</span><strong id="healthSiteCount">--</strong><small>书签数量</small></div>
          <div class="analytics-card"><span>⚠️</span><strong id="healthBadLinks">--</strong><small>异常链接</small></div>
          <div class="analytics-card"><span>💾</span><strong id="healthBackupCount">--</strong><small>备份数量</small></div>
        </div>
        <div class="analytics-grid">
          <section class="analytics-panel wide">
            <div class="analytics-panel-title"><h3>巡检建议</h3><small id="healthGeneratedAt">尚未刷新</small></div>
            <div id="healthSuggestions" class="insight-grid"></div>
          </section>
          <section class="analytics-panel wide">
            <div class="analytics-panel-title"><h3>检查项</h3><small>错误项需要优先处理，警告项建议优化</small></div>
            <div id="healthChecks" class="analytics-list"></div>
          </section>
        </div>
      </div>

      <div id="aiAdmin" class="tab-content">
        <div class="category-toolbar">
          <p class="category-hint">AI 管理助手：利用 AI 分析书签库质量，发现无标签、疑似重复、分类错误和搜索缺口等问题。需要先在"API接入"中配置大模型 API。</p>
        </div>
        <div class="analytics-summary">
          <div class="analytics-card ai-admin-card" data-type="no-tags"><span>🏷️</span><div><strong>无标签书签</strong><small>扫描缺失标签的书签并推荐补齐</small></div></div>
          <div class="analytics-card ai-admin-card" data-type="duplicates"><span>🔁</span><div><strong>疑似重复</strong><small>按域名检测疑似重复书签</small></div></div>
          <div class="analytics-card ai-admin-card" data-type="search-gaps"><span>🔍</span><div><strong>搜索缺口</strong><small>分析无结果搜索词并建议补充</small></div></div>
          <div class="analytics-card ai-admin-card" data-type="category-errors"><span>🗂️</span><div><strong>分类检查</strong><small>检测分类不存在或分类不当的书签</small></div></div>
        </div>
        <div id="aiAdminStatus" class="ai-status" style="display:none;"></div>
        <div id="aiAdminResults" style="display:none;"></div>
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
            <option value="write:sites">write:sites：仅允许写入书签</option>
            <option value="read:sites">read:sites：仅允许读取书签</option>
            <option value="admin">admin：高权限 Token（谨慎）</option>
          </select>
          <label for="newTokenExpires">有效期</label>
          <select id="newTokenExpires">
            <option value="" selected>永不过期</option>
            <option value="7">7 天</option>
            <option value="30">30 天</option>
            <option value="90">90 天</option>
            <option value="365">365 天</option>
          </select>
          <label for="newTokenNote">备注 (可选)</label>
          <input type="text" id="newTokenNote" placeholder="例如：用于我的个人博客同步脚本">
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
