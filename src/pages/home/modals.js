export function renderFrontAdminModal(datalistOptions, i18n = null) {
  return `<div id="frontAdminEditModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 opacity-0 invisible transition-all">
    <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900">编辑书签</h2>
        <button type="button" id="frontAdminCloseEdit" class="text-2xl leading-none text-gray-500 hover:text-gray-800">×</button>
      </div>
      <form id="frontAdminEditForm" class="space-y-3">
        <input type="hidden" id="frontAdminEditId">
        <input id="frontAdminEditName" required placeholder="名称" class="block w-full rounded-lg border border-primary-100 px-3 py-2">
        <input id="frontAdminEditUrl" required placeholder="网址" class="block w-full rounded-lg border border-primary-100 px-3 py-2">
        <input id="frontAdminEditLogo" placeholder="Logo 可选" class="block w-full rounded-lg border border-primary-100 px-3 py-2">
        <textarea id="frontAdminEditDesc" rows="2" placeholder="描述 可选" class="block w-full rounded-lg border border-primary-100 px-3 py-2"></textarea>
        <input id="frontAdminEditCatelog" required list="frontAdminCatalogList" placeholder="分类" class="block w-full rounded-lg border border-primary-100 px-3 py-2">
        <input id="frontAdminEditTags" placeholder="标签，可用逗号/空格分隔" class="block w-full rounded-lg border border-primary-100 px-3 py-2">
        <input id="frontAdminEditSortOrder" type="number" placeholder="排序值，留空为默认" class="block w-full rounded-lg border border-primary-100 px-3 py-2">
        <datalist id="frontAdminCatalogList">${datalistOptions}</datalist>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" id="frontAdminCancelEdit" class="rounded-lg border border-gray-200 px-4 py-2 text-gray-600 hover:bg-gray-50">取消</button>
          <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700">保存修改</button>
        </div>
      </form>
    </div>
  </div>`;
}

export function renderSubmitModal(datalistOptions, i18n = null) {
  const fieldClass = 'block w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-blue-400 dark:focus:ring-blue-500/20';
  const smallBtnClass = 'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition disabled:opacity-60';
  return `<div id="addSiteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 opacity-0 invisible transition-all backdrop-blur-sm">
    <div class="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/70 bg-white p-6 text-gray-900 shadow-2xl dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/40">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-50">添加新书签</h2>
        <button type="button" id="closeModal" class="rounded-full px-2 py-1 text-2xl leading-none text-gray-500 transition hover:bg-primary-50 hover:text-gray-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100" aria-label="关闭">×</button>
      </div>
      <form id="addSiteForm" class="space-y-4">
        <div class="relative">
          <input id="addSiteUrl" required placeholder="网址（输入后可自动抓取信息）" class="${fieldClass} pr-16">
          <button type="button" id="autoFetchMetaBtn" class="absolute right-1.5 top-1/2 -translate-y-1/2 ${smallBtnClass} bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-slate-700 dark:text-blue-200 dark:hover:bg-slate-600" title="自动抓取网站标题、描述和图标">抓取</button>
        </div>
        <div id="autoFetchStatus" class="hidden rounded-lg border border-primary-100 bg-primary-50/60 px-3 py-2 text-xs text-primary-700 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-200"></div>
        <input id="addSiteName" required placeholder="名称" class="${fieldClass}">
        <div class="relative">
          <input id="addSiteLogo" placeholder="Logo 可选" class="${fieldClass} pr-12">
          <button type="button" id="fetchFaviconBtn" class="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-primary-50/80 text-primary-600 transition hover:bg-primary-100 hover:text-primary-700 disabled:opacity-60 dark:bg-slate-700 dark:text-blue-200 dark:hover:bg-slate-600 dark:hover:text-white" title="自动获取图标" aria-label="自动获取图标">✨</button>
        </div>
        <textarea id="addSiteDesc" rows="2" placeholder="描述 可选" class="${fieldClass}"></textarea>
        <div class="flex gap-2">
          <input id="addSiteCatelog" required list="catalogList" placeholder="分类" class="${fieldClass} flex-1">
          <button type="button" id="submitSuggestCategoryBtn" class="${smallBtnClass} bg-accent-50 text-accent-700 hover:bg-accent-100 dark:bg-slate-700 dark:text-emerald-200 dark:hover:bg-slate-600" title="AI 推荐分类">🗂️</button>
        </div>
        <div class="flex gap-2">
          <input id="addSiteTags" placeholder="标签 可选，逗号/空格分隔" class="${fieldClass} flex-1">
          <button type="button" id="submitSuggestTagsBtn" class="${smallBtnClass} bg-accent-50 text-accent-700 hover:bg-accent-100 dark:bg-slate-700 dark:text-emerald-200 dark:hover:bg-slate-600" title="AI 推荐标签">🏷️</button>
        </div>
        <datalist id="catalogList">${datalistOptions}</datalist>
        <input id="addSiteReason" placeholder="推荐理由 可选，帮助管理员了解为什么推荐" class="${fieldClass}">
        <div class="flex justify-end gap-3 pt-1">
          <button type="button" id="cancelAddSite" class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">取消</button>
          <button type="submit" class="rounded-lg bg-accent-500 px-4 py-2 font-medium text-white transition hover:bg-accent-600">提交</button>
        </div>
      </form>
    </div>
  </div>`;
}