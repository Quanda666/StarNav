import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 后台 HTML 模板与脚本是两份文件，元素 id 拼错时只会在浏览器里静默失效。
// 这里做一次静态一致性检查：脚本引用的 id 必须在模板里存在，
// 或者在运行时由 JS 动态创建（下面的白名单）。
const DYNAMIC_IDS = new Set([
  'closeBulkResult',
  'confirmOk',
  'confirmCancel',
  'editId', 'editName', 'editUrl', 'editLogo', 'editDesc', 'editCatelog',
  'editVisibility', 'editTags', 'editSortOrder', 'editForm',
  'applyTagSuggestionsAppend', 'applyTagSuggestionsReplace',
  'copyCreatedToken',
  'rejectReasonList', 'rejectReasonCustom', 'rejectCancel', 'rejectConfirm',
  'tagSuggestPreview',
]);

function readText(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('后台脚本引用的元素 id 都存在于 HTML 模板（或为动态创建）', () => {
  const html = readText('src/pages/admin/html.js');
  const script = readText('src/pages/admin/scripts/index.js');

  const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
  const refs = new Set(
    [...script.matchAll(/\$\('([^']+)'\)|getElementById\('([^']+)'\)/g)]
      .map((match) => match[1] || match[2])
      .filter(Boolean),
  );

  assert.ok(htmlIds.size > 200, 'HTML 模板应包含大量元素 id（防止读取到错误文件）');
  const missing = [...refs].filter((id) => !htmlIds.has(id) && !DYNAMIC_IDS.has(id));
  assert.deepEqual(missing, [], `以下 id 在模板中不存在：${missing.join(', ')}`);
});

test('后台每个 tab 按钮都有对应的内容容器', () => {
  const html = readText('src/pages/admin/html.js');
  const tabs = [...html.matchAll(/data-tab="([^"]+)"/g)].map((match) => match[1]);
  const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
  const missing = tabs.filter((tab) => !htmlIds.has(tab));
  assert.deepEqual(missing, [], `tab 缺少内容容器：${missing.join(', ')}`);
});
