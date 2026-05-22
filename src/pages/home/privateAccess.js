import { escapeHTML, htmlResponse } from '../../lib/utils.js';
import { PRIVATE_BOOKMARK_CATEGORY } from '../../services/privateBookmarkService.js';

export function renderPrivateBookmarkUnlockBox(catalog, i18n = null) {
  return `<div class="col-span-full rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
    <h3 class="text-lg font-semibold text-amber-900">${escapeHTML(i18n?.t?.('privateLockedHeading') || '私人书签已上锁')}</h3>
    <p class="mt-2 text-sm text-amber-700">${escapeHTML(i18n?.t?.('privateLockedDesc') || '请输入访问密码后查看该分类；管理员已登录时可直接访问。')}</p>
    <form method="post" action="?catalog=${encodeURIComponent(catalog)}" class="mx-auto mt-5 flex max-w-sm flex-col gap-3">
      <input name="password" type="password" required autocomplete="current-password" placeholder="${escapeHTML(i18n?.t?.('accessPassword') || '访问密码')}" class="min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-4 py-2 outline-none focus:border-amber-400">
      <div class="flex items-center gap-3">
        <select name="duration" class="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-800 outline-none focus:border-amber-400">
          <option value="session">仅本次会话</option>
          <option value="1h">1 小时</option>
          <option value="12h" selected>12 小时</option>
          <option value="7d">7 天</option>
          <option value="30d">30 天</option>
        </select>
        <button type="submit" class="rounded-lg bg-amber-500 px-5 py-2 font-medium text-white hover:bg-amber-600">${escapeHTML(i18n?.t?.('unlock') || '解锁')}</button>
      </div>
    </form>
  </div>`;
}

export function renderPrivateBookmarkPasswordPage({ catalog, error = '', i18n }) {
  const fallbackI18n = i18n || { lang: 'zh-CN', dir: 'ltr', th: (key) => key };
  const { lang, dir, th } = fallbackI18n;
  return htmlResponse(`<!DOCTYPE html>
<html lang="${escapeHTML(lang)}" dir="${escapeHTML(dir)}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${th('privateBookmark')} - ${th('appName')}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-amber-50 text-gray-800 flex items-center justify-center px-4">
  <div class="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 shadow-xl">
    <h1 class="text-center text-2xl font-semibold text-amber-900">${th('privateBookmark')}</h1>
    <p class="mt-3 text-center text-sm text-amber-700">${th('privatePasswordDesc')}</p>
    ${error ? `<div class="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">${escapeHTML(error)}</div>` : ''}
    <form method="post" action="?catalog=${encodeURIComponent(catalog || PRIVATE_BOOKMARK_CATEGORY)}" class="mt-6 space-y-4">
      <input name="password" type="password" required autofocus autocomplete="current-password" placeholder="${th('enterAccessPassword')}" class="w-full rounded-lg border border-amber-200 px-4 py-3 outline-none focus:border-amber-400">
      <label class="block text-left text-xs text-amber-700">
        <span class="mb-1 block">记住此次解锁</span>
        <select name="duration" class="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-800 outline-none focus:border-amber-400">
          <option value="session">仅本次会话（关闭浏览器后失效）</option>
          <option value="1h">1 小时</option>
          <option value="12h" selected>12 小时</option>
          <option value="7d">7 天</option>
          <option value="30d">30 天</option>
        </select>
      </label>
      <button type="submit" class="w-full rounded-lg bg-amber-500 px-4 py-3 font-medium text-white hover:bg-amber-600">${th('unlockAccess')}</button>
    </form>
    <a href="/" class="mt-5 block text-center text-sm text-gray-500 hover:text-amber-700">${th('backHome')}</a>
  </div>
</body>
</html>`);
}