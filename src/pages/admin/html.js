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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="container">
    <header class="admin-header">
      <button type="button" class="sidebar-dock" id="sidebarToggle" title="收起侧栏" aria-label="收起侧栏"><span class="sidebar-dock-mark" aria-hidden="true"></span></button>
      <button type="button" class="mobile-nav-toggle" id="mobileNavToggle" aria-label="打开菜单" aria-expanded="false">菜单</button>
      <h1>StarNav 管理台</h1>
      <form id="logoutForm" method="post" action="/admin/logout">
        <button type="submit" class="logout-btn">退出登录</button>
      </form>
    </header>
    <div class="mobile-nav-mask" id="mobileNavMask" hidden></div>

    <div id="message" style="display:none;"></div>

    <div class="tab-wrapper">
      <aside class="tab-buttons" id="sidebarNav">
        <div class="sidebar-group">
          <div class="sidebar-group-label">内容</div>
          <button class="tab-button active" data-tab="config" title="书签列表"><span class="tab-icon">🔖</span><span class="tab-text">书签</span><span class="nav-badge" id="statTotalSites">0</span></button>
          <button class="tab-button" data-tab="pending" title="待审列表"><span class="tab-icon">⏳</span><span class="tab-text">待审</span><span class="nav-badge" id="statPendingSites">0</span></button>
          <button class="tab-button" data-tab="categories" title="分类管理"><span class="tab-icon">🗂️</span><span class="tab-text">分类</span><span class="nav-badge" id="statCategories">0</span></button>
          <button class="tab-button" data-tab="tags" title="标签管理"><span class="tab-icon">🏷️</span><span class="tab-text">标签</span><span class="nav-badge" id="statTags">0</span></button>
        </div>
        <div class="sidebar-group">
          <div class="sidebar-group-label">洞察</div>
          <button class="tab-button" data-tab="submissionAnalytics" title="提交分析"><span class="tab-icon">📊</span><span class="tab-text">提交分析</span></button>
          <button class="tab-button" data-tab="visitAnalytics" title="访问分析"><span class="tab-icon">📈</span><span class="tab-text">访问分析</span></button>
          <button class="tab-button" data-tab="systemHealth" title="系统健康"><span class="tab-icon">🩺</span><span class="tab-text">系统健康</span></button>
        </div>
        <div class="sidebar-group">
          <div class="sidebar-group-label">系统</div>
          <button class="tab-button" data-tab="systemSettings" title="系统设置"><span class="tab-icon">⚙️</span><span class="tab-text">系统设置</span></button>
          <button class="tab-button" data-tab="aiAdmin" title="AI 分析"><span class="tab-icon">🤖</span><span class="tab-text">AI 分析</span></button>
          <button class="tab-button" data-tab="aiAssistant" title="AI 接口"><span class="tab-icon">🔌</span><span class="tab-text">AI 接口</span></button>
          <button class="tab-button" data-tab="backups" title="备份恢复"><span class="tab-icon">💾</span><span class="tab-text">备份恢复</span></button>
        </div>
        <div class="sidebar-group">
          <div class="sidebar-group-label">接入</div>
          <button class="tab-button" data-tab="apiTokens" title="Token"><span class="tab-icon">🔑</span><span class="tab-text">Token</span></button>
          <button class="tab-button" data-tab="operationLogs" title="操作日志"><span class="tab-icon">📝</span><span class="tab-text">操作日志</span></button>
        </div>
        <button class="tab-button" data-tab="spaces" style="display:none;" title="空间管理"><span class="tab-icon">🌐</span><span class="tab-text">空间管理</span></button>
      </aside>

      <div id="config" class="tab-content active">
        <div class="config-list-toolbar">
          <input type="text" id="searchInput" placeholder="搜索书签（名称、网址、分类）" autocomplete="off">
          <select id="spaceFilter" title="按空间筛选" style="display:none;"><option value="">全部空间</option></select>
          <select id="healthFilter" title="健康状态筛选">
            <option value="">全部状态</option>
            <option value="bad">只看异常</option>
            <option value="ok">只看正常</option>
            <option value="unknown">只看未检测</option>
          </select>
          <select id="configDensityMode" title="书签列表显示密度">
            <option value="comfortable">舒适密度</option>
            <option value="compact">紧凑密度</option>
          </select>
          <button type="button" id="openAddSiteBtn">+ 添加书签</button>
        </div>
        <div class="bulk-toolbar" id="bulkToolbar" hidden>
          <div class="bulk-group bulk-select-group">
            <label class="bulk-select-all"><input type="checkbox" id="selectAllConfigs"> 全选本页</label>
            <span id="selectedCount">已选择 0 项</span>
          </div>
          <div class="bulk-group bulk-edit-group">
            <input type="text" id="bulkCatelog" placeholder="改分类">
            <input type="text" id="bulkTags" placeholder="改标签">
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
          <div class="bulk-group bulk-action-group">
            <button id="bulkCheckBtn" type="button" class="check-btn">检测</button>
            <button id="recheckBadBtn" type="button" class="check-btn">重测异常</button>
            <button id="bulkFaviconBtn" type="button">刷新图标</button>
            <button id="hideBadBtn" type="button">隐藏异常</button>
            <button id="bulkDeleteBtn" type="button" class="del-btn">删除</button>
          </div>
        </div>
        <div id="bulkResultPanel" class="bulk-result-panel" style="display:none;"></div>
        <div class="table-wrapper">
          <table id="configTable">
            <thead>
              <tr>
                <th><input type="checkbox" id="selectAllConfigsHead" title="全选本页"></th><th>书签</th><th>分类</th><th>标签</th><th>状态</th><th>操作</th>
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
        <div class="page-head">
          <div>
            <h2>待审</h2>
            <p class="category-hint">前台提交的书签。批准后入库，拒绝时可附带理由。</p>
          </div>
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
                <th>ID</th><th>名称</th><th>网址</th><th>图标</th><th>描述</th><th>分类</th><th>标签</th><th>操作</th>
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
        <div class="page-head">
          <div>
            <h2>提交分析</h2>
            <p class="category-hint">同时统计前台待审和后台新增，看日期、时段和分类偏好。</p>
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
        <div class="page-head">
          <div>
            <h2>分类</h2>
            <p class="category-hint">改名、父子分类和图标。拖拽行排序后点“保存排序”。</p>
          </div>
          <div class="backup-controls">
            <button id="saveCategoryOrder" type="button" disabled>保存排序</button>
            <button id="refreshCategories" type="button">刷新</button>
          </div>
        </div>
        <div class="add-new category-add category-add-panel">
          <input type="text" id="newCategoryName" placeholder="新分类名称">
          <select id="newCategoryParent"><option value="">无父类</option></select>
          <select id="newCategorySpace" title="所属空间" style="display:none;"><option value="">默认空间</option></select>
          <input type="text" id="newCategoryIcon" placeholder="图标，可留空；支持 emoji / SVG">
          <input type="text" id="newCategoryDescription" placeholder="描述（可选）">
          <input type="number" id="newCategorySort" placeholder="排序">
          <button id="createCategoryBtn">新增分类</button>
        </div>
        <div class="table-wrapper">
          <table id="categoryTable">
            <thead>
              <tr>
                <th>ID</th><th>分类名称</th><th>父分类</th><th>图标</th><th>描述</th><th>书签数量</th><th>子类数量</th><th>排序值</th><th>操作</th>
              </tr>
            </thead>
            <tbody id="categoryTableBody"><tr><td colspan="9">加载中...</td></tr></tbody>
          </table>
        </div>
      </div>

      <div id="tags" class="tab-content">
        <div class="page-head">
          <div>
            <h2>标签</h2>
            <p class="category-hint">查看使用次数、合并碎片标签，并给缺标签的书签补齐。</p>
          </div>
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

      <div id="systemSettings" class="tab-content">
        <div class="page-head">
          <div>
            <h2>系统设置</h2>
            <p class="category-hint">站点品牌、首页展示、私人书签和公告都在这里改。保存后前台会自动刷新。</p>
          </div>
          <button id="refreshSystemSettings" type="button">刷新配置</button>
        </div>
        <div class="settings-stack">
          <section class="settings-card">
            <div class="settings-card-head">
              <h3>站点品牌</h3>
              <small>名称、图标和页脚文案</small>
            </div>
            <div class="system-settings-grid">
              <div>
                <label for="systemSiteName">网站名称</label>
                <input type="text" id="systemSiteName" placeholder="星漫旅站">
              </div>
              <div>
                <label for="systemSiteSubtitle">首页副标题</label>
                <input type="text" id="systemSiteSubtitle" placeholder="收藏、整理与发现你的常用网站">
              </div>
            </div>
            <label for="systemSiteIcon">网站图标 URL</label>
            <div class="private-password-row">
              <input type="text" id="systemSiteIcon" placeholder="/pwa-icon.svg 或 https://...">
              <button type="button" id="previewSystemIcon">预览图标</button>
            </div>
            <label for="systemFooterText">页脚补充文字</label>
            <input type="text" id="systemFooterText" placeholder="可选，例如备案号、联系方式或版权说明">
          </section>

          <section class="settings-card">
            <div class="settings-card-head">
              <h3>首页展示</h3>
              <small>默认皮肤、布局、主题色和入口开关</small>
            </div>
            <div class="system-settings-grid">
              <div>
                <label for="systemDefaultSkin">默认皮肤</label>
                <select id="systemDefaultSkin">
                  <option value="">跟访客本地设置</option>
                  <option value="paper">纸感</option>
                  <option value="starry">星空</option>
                  <option value="minimal">极简</option>
                  <option value="dark">暗黑</option>
                  <option value="glass">玻璃</option>
                  <option value="dock">Dock</option>
                  <option value="notion">Notion</option>
                  <option value="aurora">极光</option>
                </select>
              </div>
              <div>
                <label for="systemDefaultLayout">默认首页布局</label>
                <select id="systemDefaultLayout">
                  <option value="">卡片（推荐）</option>
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
                  <option value="cyan">青碧</option>
                  <option value="indigo">黛蓝</option>
                  <option value="graphite">石墨</option>
                </select>
              </div>
              <div>
                <label for="systemDefaultDensity">默认卡片密度</label>
                <select id="systemDefaultDensity">
                  <option value="">默认舒适</option>
                  <option value="compact">紧凑</option>
                  <option value="comfortable">舒适</option>
                  <option value="spacious">宽松</option>
                </select>
              </div>
            </div>
            <label for="systemBackgroundImage">首页背景图片 URL</label>
            <input type="text" id="systemBackgroundImage" placeholder="可选，填写后作为访客默认背景图片">
            <div class="settings-toggles">
              <label><input type="checkbox" id="systemPublicSubmissionEnabled"> 显示前台公开提交入口</label>
              <label><input type="checkbox" id="systemBlogVisible"> 显示前台博客入口</label>
            </div>
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
          </section>

          <section class="settings-card">
            <div class="settings-card-head">
              <h3>私人书签</h3>
              <small>访客访问“私人书签”分类时需要密码；管理员登录后无需密码</small>
            </div>
            <label><input type="checkbox" id="systemPrivateBookmarksVisible"> 显示前台私人书签入口</label>
            <label for="privateBookmarkPassword">访问密码</label>
            <div class="private-password-row">
              <input type="password" id="privateBookmarkPassword" placeholder="请输入新的访问密码">
              <button type="button" id="togglePrivatePassword">显示</button>
              <button type="button" id="savePrivatePassword">保存密码</button>
            </div>
            <p class="category-hint">未设置时默认密码为 123456；也可通过环境变量 PRIVATE_BOOKMARKS_PASSWORD 覆盖。请将私人站点的分类设置为“私人书签”。</p>
          </section>

          <section class="settings-card">
            <div class="settings-card-head">
              <h3>系统公告</h3>
              <small>通知与更新时间线统一展示在首页公告弹窗（支持 Markdown）</small>
            </div>
            <label><input type="checkbox" id="announcementEnabled"> 有新通知时自动弹窗提醒访客</label>
            <label><input type="checkbox" id="announcementShowOnce"> 当天关闭后不再自动弹出（铃铛仍可查看）</label>
            <label for="announcementButtonText">确认按钮文字</label>
            <input type="text" id="announcementButtonText" placeholder="我知道了">
            <details class="ann-section">
              <summary>📢 通知列表<span class="ann-section-hint">点击展开 / 收起，按发布日期倒序展示</span></summary>
              <div id="announcementList" class="ann-edit-list"></div>
              <button type="button" id="addAnnouncement" class="secondary-btn">+ 添加通知</button>
              <p class="category-hint">新增或修改后访客会看到铃铛红点；更新通知则打开通知页，只更新时间线则打开时间线页。</p>
            </details>
            <details class="ann-section">
              <summary>🕒 更新时间线<span class="ann-section-hint">站点更新日志，显示在弹窗的「时间线」标签页</span></summary>
              <div id="timelineList" class="ann-edit-list"></div>
              <button type="button" id="addTimelineEntry" class="secondary-btn">+ 添加时间线节点</button>
              <p class="category-hint">发布时间按中国时区（UTC+8）自动记录，无需手动选择；留空时前台公告弹窗只显示「通知」一个标签页。</p>
            </details>
          </section>

          <div class="settings-footer">
            <div class="ai-actions">
              <button type="button" id="saveSystemSettings">保存系统设置</button>
            </div>
            <div id="systemSettingsStatus" class="ai-status" style="display:none;"></div>
            <div id="announcementPreview" class="announcement-preview" style="display:none;"></div>
          </div>
        </div>
      </div>

      <div id="systemHealth" class="tab-content">
        <div class="page-head">
          <div>
            <h2>系统健康</h2>
            <p class="category-hint">巡检 D1 / KV、异常链接、待审、Token、备份和站点设置。</p>
          </div>
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
        <div class="page-head">
          <div>
            <h2>AI 分析</h2>
            <p class="category-hint">扫描无标签、疑似重复、搜索缺口和分类问题。大模型请到「AI 接口」配置。</p>
          </div>
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
        <div class="page-head">
          <div>
            <h2>AI 接口</h2>
            <p class="category-hint">配置 OpenAI 兼容接口。未填写 Key 时，分类/标签推荐会走本地规则。</p>
          </div>
          <button id="refreshAiSettings" type="button">刷新配置</button>
        </div>
        <div class="settings-card ai-settings-card">
          <div class="token-form-grid">
            <label class="settings-check"><input type="checkbox" id="aiEnabled"> 启用大语言模型回复</label>
            <div>
              <label for="aiBaseUrl">接口地址</label>
              <input type="text" id="aiBaseUrl" placeholder="https://api.openai.com/v1/chat/completions">
            </div>
            <div>
              <label for="aiModel">模型名称</label>
              <div class="private-password-row">
                <input type="text" id="aiModel" list="aiModelList" placeholder="gpt-4o-mini">
                <datalist id="aiModelList"></datalist>
                <button type="button" id="fetchAiModels">获取模型</button>
              </div>
            </div>
            <div class="token-span-2">
              <label for="aiApiKey">API Key</label>
              <div class="private-password-row">
                <input type="password" id="aiApiKey" autocomplete="off" placeholder="留空表示不修改现有 Key">
                <button type="button" id="toggleAiApiKey">显示</button>
              </div>
            </div>
            <div class="token-span-2">
              <label for="aiSystemPrompt">系统提示词</label>
              <textarea id="aiSystemPrompt" rows="5" placeholder="定义大模型回复风格和规则"></textarea>
            </div>
          </div>
          <div class="ai-actions">
            <button type="button" id="saveAiSettings">保存 API 设置</button>
            <button type="button" id="testAiSettings" class="check-btn">测试连接</button>
          </div>
          <div id="aiSettingsStatus" class="ai-status" style="display:none;"></div>
        </div>
      </div>

      <div id="apiTokens" class="tab-content">
        <div class="page-head">
          <div>
            <h2>Token</h2>
            <p class="category-hint">给浏览器插件或脚本签发 Token。完整密钥只在创建时显示一次。</p>
          </div>
          <button id="refreshApiTokens" type="button">刷新列表</button>
        </div>
        <div class="settings-card">
          <div class="settings-card-head">
            <h3>签发新 Token</h3>
            <small>常用场景直接点绿色按钮</small>
          </div>
          <div class="token-form-grid">
            <div>
              <label for="newTokenName">名称</label>
              <input type="text" id="newTokenName" placeholder="例如：浏览器插件">
            </div>
            <div>
              <label for="newTokenScopes">权限</label>
              <select id="newTokenScopes">
                <option value="write" selected>write：写入书签</option>
                <option value="read,write">read + write：读写书签</option>
                <option value="write:sites">write:sites：仅写书签</option>
                <option value="read:sites">read:sites：仅读书签</option>
                <option value="admin">admin：高权限（谨慎）</option>
              </select>
            </div>
            <div>
              <label for="newTokenExpires">有效期</label>
              <select id="newTokenExpires">
                <option value="" selected>永不过期</option>
                <option value="7">7 天</option>
                <option value="30">30 天</option>
                <option value="90">90 天</option>
                <option value="365">365 天</option>
              </select>
            </div>
            <div>
              <label for="newTokenNote">备注</label>
              <input type="text" id="newTokenNote" placeholder="可选，例如博客同步脚本">
            </div>
          </div>
          <div class="ai-actions">
            <button type="button" id="createBrowserToken" class="check-btn">生成浏览器插件 Token</button>
            <button type="button" id="createApiToken">创建自定义 Token</button>
          </div>
          <div id="newTokenBox" class="ai-status" style="display:none;"></div>
          <p class="category-hint">不要把 Token 发给他人。泄露后立刻在下方列表撤销。</p>
        </div>
        <div class="table-wrapper token-table-wrap">
          <table id="apiTokenTable">
            <thead>
              <tr>
                <th>名称</th><th>权限</th><th>创建时间</th><th>最后使用</th><th>状态</th><th>操作</th>
              </tr>
            </thead>
            <tbody id="apiTokenTableBody"><tr><td colspan="6">点击“刷新列表”加载 Token</td></tr></tbody>
          </table>
        </div>
      </div>

      <div id="visitAnalytics" class="tab-content">
        <div class="page-head">
          <div>
            <h2>访问分析</h2>
            <p class="category-hint">点击排行、分类热度、搜索词和无结果关键词。</p>
          </div>
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
        <div class="page-head">
          <div>
            <h2>备份恢复</h2>
            <p class="category-hint">备份最多保留 30 份。导入会先预览再写入；导出可选 JSON、CSV 或浏览器 HTML。</p>
          </div>
          <div class="backup-controls">
            <button id="createBackupBtn" type="button">立即备份</button>
            <button id="refreshBackups" type="button" class="secondary-btn">刷新列表</button>
          </div>
        </div>
        <div class="backup-io-grid">
          <section class="settings-card backup-io-card">
            <div class="settings-card-head">
              <h3>导入</h3>
              <small>JSON 会先预览，确认后再写入</small>
            </div>
            <input type="file" id="importFile" accept=".json" style="display:none;">
            <label for="importMode">恢复模式</label>
            <div class="private-password-row">
              <select id="importMode" title="导入恢复模式">
                <option value="merge">合并导入</option>
                <option value="overwrite">覆盖恢复</option>
              </select>
              <button id="importBtn" type="button">选择文件并导入</button>
            </div>
            <p class="category-hint">覆盖恢复会先清空现有书签、分类和标签，请谨慎使用。</p>
          </section>
          <section class="settings-card backup-io-card">
            <div class="settings-card-head">
              <h3>导出</h3>
              <small>按需要的格式下载当前书签库</small>
            </div>
            <div class="backup-export-actions">
              <button id="exportBtn" type="button">新版 JSON</button>
              <button id="exportLegacyBtn" type="button" class="secondary-btn">旧版 JSON</button>
              <button id="exportCsvBtn" type="button" class="secondary-btn">CSV</button>
              <button id="exportHtmlBtn" type="button" class="secondary-btn">浏览器 HTML</button>
            </div>
          </section>
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
        <section class="settings-card backup-list-card">
          <div class="settings-card-head">
            <h3>备份列表</h3>
            <small>本机 KV 备份，可用于一键恢复</small>
          </div>
          <div class="table-wrapper backup-table-wrap">
            <table id="backupTable">
              <thead>
                <tr>
                  <th>时间</th><th>来源</th><th>规模</th><th>大小</th><th>备注</th><th>操作</th>
                </tr>
              </thead>
              <tbody id="backupTableBody"><tr><td colspan="6">点击“刷新列表”加载备份</td></tr></tbody>
            </table>
          </div>
        </section>
      </div>

      <div id="operationLogs" class="tab-content">
        <div class="page-head">
          <div>
            <h2>操作日志</h2>
            <p class="category-hint">后台关键写操作：新增、修改、删除、批量、导入、审核和排序。</p>
          </div>
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

  <div id="addSiteModal" class="modal add-site-modal" role="dialog" aria-modal="true" aria-labelledby="addSiteModalTitle">
    <div class="modal-content add-site-modal-content">
      <div class="add-site-modal-head">
        <h2 id="addSiteModalTitle">添加书签</h2>
        <button type="button" class="modal-close" id="closeAddSiteModal" aria-label="关闭">关闭</button>
      </div>
      <p class="add-site-hint">先填网址，失焦后自动抓取名称、描述和图标。</p>
      <form id="addSiteForm" class="add-site-form">
        <div class="add-site-grid">
          <div class="add-site-span-2">
            <label for="addUrl">网址</label>
            <input type="text" id="addUrl" placeholder="https://example.com" required autocomplete="off">
            <div id="adminFaviconStatus" class="add-site-status" style="display:none;"></div>
          </div>
          <div>
            <label for="addName">名称</label>
            <input type="text" id="addName" placeholder="书签名称" required>
          </div>
          <div>
            <label for="addCatelog">分类</label>
            <div class="add-action-field">
              <input type="text" id="addCatelog" list="addCatalogList" placeholder="分类名称" required>
              <button type="button" id="suggestAddCategoryBtn" title="推荐分类" aria-label="推荐分类">🗂️</button>
            </div>
            <datalist id="addCatalogList"></datalist>
          </div>
          <div class="add-site-span-2">
            <label for="addLogo">图标</label>
            <div class="logo-field">
              <input type="text" id="addLogo" placeholder="图标地址，可选">
              <button type="button" id="fetchAdminFaviconBtn" title="自动获取图标" aria-label="自动获取图标">✨</button>
            </div>
          </div>
          <div class="add-site-span-2">
            <label for="addDesc">描述</label>
            <input type="text" id="addDesc" placeholder="简短描述，可选">
          </div>
          <div>
            <label for="addVisibility">可见性</label>
            <select id="addSpace" title="所属空间" style="display:none;"><option value="">默认空间</option></select>
            <select id="addVisibility" title="可见性">
              <option value="public">公开</option>
              <option value="private">私密</option>
              <option value="unlisted">不列出</option>
              <option value="admin_only">仅管理员</option>
            </select>
          </div>
          <div>
            <label for="addSortOrder">排序</label>
            <input type="number" id="addSortOrder" placeholder="数字小靠前，可留空">
          </div>
          <div class="add-site-span-2">
            <label for="addTags">标签</label>
            <div class="add-action-field">
              <input type="text" id="addTags" placeholder="逗号或空格分隔，可选">
              <button type="button" id="suggestAddTagsBtn" title="推荐标签" aria-label="推荐标签">🏷️</button>
            </div>
          </div>
        </div>
        <div class="confirm-actions">
          <button type="button" id="cancelAddSiteBtn" class="secondary-btn">取消</button>
          <button type="submit" id="addBtn">添加</button>
        </div>
      </form>
    </div>
  </div>
  <script src="/static/admin.js"></script>
</body>
</html>`;
