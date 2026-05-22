export function getSiteRouteFlags(path = '') {
  return {
    isSitesCollectionPath: path === '/config' || path === '/sites',
    isSiteSubmitPath: path === '/config/submit' || path === '/submissions',
    isSiteReorderPath: path === '/config/reorder' || path === '/sites/reorder',
    isSiteImportPath: path === '/config/import' || path === '/sites/import',
    isSiteImportPreviewPath: path === '/config/import/preview' || path === '/sites/import/preview',
    isSiteBulkPath: path === '/config/bulk' || path === '/sites/bulk',
    isSiteExportPath: path === '/config/export' || path === '/sites/export',
    isSiteCheckPath: /^\/(?:config|sites)\/\d+\/check$/.test(path),
    isSiteItemPath: /^\/(?:config|sites)\/\d+$/.test(path),
    isSubmissionsCollectionPath: path === '/pending' || path === '/submissions',
    isSubmissionItemPath: /^\/(?:pending|submissions)\/\d+$/.test(path),
  };
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function sitesToCsv(sites = []) {
  const columns = [
    ['id', 'ID'],
    ['name', '名称'],
    ['url', '网址'],
    ['logo', 'Logo'],
    ['desc', '描述'],
    ['catelog', '分类'],
    ['tags', '标签'],
    ['visibility', '可见性'],
    ['sort_order', '排序'],
    ['hits', '访问次数'],
    ['last_visit_time', '最近访问时间'],
    ['last_checked_at', '最近检测时间'],
    ['last_status_code', '最近检测状态码'],
    ['last_error', '最近检测错误'],
    ['create_time', '创建时间'],
    ['update_time', '更新时间'],
  ];
  const rows = [
    columns.map(([, label]) => csvCell(label)).join(','),
    ...sites.map((site) => columns.map(([key]) => csvCell(site?.[key])).join(',')),
  ];
  return `\uFEFF${rows.join('\r\n')}\r\n`;
}

function bookmarkHtmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function toBookmarkTimestamp(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? Math.floor(time / 1000) : Math.floor(Date.now() / 1000);
}

export function sitesToBookmarkHtml(sites = []) {
  const groups = new Map();
  for (const site of sites) {
    const category = String(site?.catelog || '未分类').trim() || '未分类';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(site);
  }

  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ];

  for (const [category, items] of groups.entries()) {
    lines.push(`  <DT><H3 ADD_DATE="${Math.floor(Date.now() / 1000)}">${bookmarkHtmlEscape(category)}</H3>`);
    lines.push('  <DL><p>');
    for (const site of items) {
      const attrs = [
        `HREF="${bookmarkHtmlEscape(site?.url)}"`,
        `ADD_DATE="${toBookmarkTimestamp(site?.create_time)}"`,
        `LAST_MODIFIED="${toBookmarkTimestamp(site?.update_time)}"`,
      ];
      if (site?.logo) attrs.push(`ICON="${bookmarkHtmlEscape(site.logo)}"`);
      if (Array.isArray(site?.tags) && site.tags.length) attrs.push(`TAGS="${bookmarkHtmlEscape(site.tags.join(','))}"`);
      lines.push(`    <DT><A ${attrs.join(' ')}>${bookmarkHtmlEscape(site?.name || site?.url || '未命名书签')}</A>`);
      if (site?.desc) lines.push(`    <DD>${bookmarkHtmlEscape(site.desc)}`);
    }
    lines.push('  </DL><p>');
  }

  lines.push('</DL><p>');
  return lines.join('\n');
}