const els = {
  baseUrl: document.getElementById('baseUrl'),
  token: document.getElementById('token'),
  defaultCategory: document.getElementById('defaultCategory'),
  defaultTags: document.getElementById('defaultTags'),
  categoryList: document.getElementById('categoryList'),
  tagList: document.getElementById('tagList'),
  saveBtn: document.getElementById('saveBtn'),
  testBtn: document.getElementById('testBtn'),
  refreshMetaBtn: document.getElementById('refreshMetaBtn'),
  clearBtn: document.getElementById('clearBtn'),
  status: document.getElementById('status'),
};

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/g, '');
}

function setStatus(message, type = 'info') {
  els.status.textContent = message;
  els.status.style.color = type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#64748b';
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const baseUrl = normalizeBaseUrl(els.baseUrl.value);
  const token = String(els.token.value || '').trim();
  if (!baseUrl) throw new Error('请先填写 StarNav 地址');

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...authHeaders(token),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) throw new Error(data?.message || data?.error || `请求失败：HTTP ${res.status}`);
  return data;
}

function resolveUrl(baseUrl, value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return '';
  }
}

async function setExtensionIconFromUrl(iconUrl) {
  if (!chrome.action?.setIcon || !iconUrl) return false;
  try {
    await chrome.action.setIcon({ path: iconUrl });
    return true;
  } catch (e) {
    // 可能是远程 URL 无法直接加载，尝试 fetch + canvas
    const response = await fetch(iconUrl);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);
    const sizes = [16, 32, 48, 128];
    const imageData = {};
    for (const size of sizes) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, 0, 0, size, size);
      imageData[size] = ctx.getImageData(0, 0, size, size);
    }
    await chrome.action.setIcon({ imageData });
    return true;
  }
}

async function syncExtensionIcon({ silent = false } = {}) {
  const baseUrl = normalizeBaseUrl(els.baseUrl.value);
  if (!baseUrl) return false;
  try {
    const settings = await apiFetch('/api/settings/public', { headers: {} });
    const data = settings?.data || {};
    const iconUrl = resolveUrl(baseUrl, data.siteIcon || data.icon || '/pwa-icon.svg');
    const ok = await setExtensionIconFromUrl(iconUrl);
    await chrome.storage.sync.set({ siteIcon: iconUrl, siteName: data.siteName || data.name || 'StarNav' });
    if (ok && !silent) setStatus('站点图标已同步到浏览器插件。', 'success');
    return ok;
  } catch (error) {
    if (!silent) setStatus(`图标同步失败，已使用默认插件图标：${error.message || error}`, 'error');
    return false;
  }
}

function renderDatalist(el, items, getValue) {
  el.innerHTML = '';
  for (const item of items || []) {
    const value = getValue(item);
    if (!value) continue;
    const option = document.createElement('option');
    option.value = value;
    el.appendChild(option);
  }
}

async function loadOptions() {
  const syncData = await chrome.storage.sync.get([
    'baseUrl',
    'token',
    'defaultCategory',
    'defaultTags',
  ]);
  const localData = await chrome.storage.local.get([
    'categories',
    'tags',
  ]);

  els.baseUrl.value = syncData.baseUrl || '';
  els.token.value = syncData.token || '';
  els.defaultCategory.value = syncData.defaultCategory || '';
  els.defaultTags.value = syncData.defaultTags || '';

  renderDatalist(els.categoryList, localData.categories || [], (item) => item.name || item.catelog || item);
  renderDatalist(els.tagList, localData.tags || [], (item) => item.name || item.tag || item);
}

async function saveOptions({ silent = false } = {}) {
  const baseUrl = normalizeBaseUrl(els.baseUrl.value);
  const token = String(els.token.value || '').trim();
  const defaultCategory = String(els.defaultCategory.value || '').trim();
  const defaultTags = String(els.defaultTags.value || '').trim();

  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
    throw new Error('请填写有效的 StarNav 地址，例如 https://nav.example.com');
  }
  if (!token) {
    throw new Error('请填写 Bearer Token');
  }

  await chrome.storage.sync.set({ baseUrl, token, defaultCategory, defaultTags });
  await syncExtensionIcon({ silent: true });
  if (!silent) setStatus('设置已保存，插件图标已尝试同步。', 'success');
}

async function testConnection() {
  await saveOptions({ silent: true });
  const discovery = await apiFetch('/api/discovery');
  await apiFetch('/api/sites/check-duplicate?url=' + encodeURIComponent('https://example.com'));
  const iconSynced = await syncExtensionIcon({ silent: true });
  setStatus(`连接成功：${discovery?.name || 'StarNav'}\nToken 可访问第三方写入辅助接口。\n插件图标：${iconSynced ? '已同步站点图标' : '使用默认图标'}`, 'success');
}

async function refreshMetadata() {
  await saveOptions({ silent: true });

  const [categoriesRes, tagsRes] = await Promise.all([
    apiFetch('/api/categories'),
    apiFetch('/api/tags'),
  ]);

  const categories = categoriesRes?.data || [];
  const tags = tagsRes?.data || [];

  // 大体积的分类和标签缓存改用 chrome.storage.local 存储，避免 sync 8KB 单项配额超限错误
  await chrome.storage.local.set({
    categories,
    tags,
    metadataUpdatedAt: new Date().toISOString(),
  });

  renderDatalist(els.categoryList, categories, (item) => item.name || item.catelog || item);
  renderDatalist(els.tagList, tags, (item) => item.name || item.tag || item);

  const iconSynced = await syncExtensionIcon({ silent: true });
  setStatus(`已刷新：${categories.length} 个分类，${tags.length} 个标签。\n插件图标：${iconSynced ? '已同步站点图标' : '使用默认图标'}`, 'success');
}

async function clearOptions() {
  await Promise.all([
    chrome.storage.sync.clear(),
    chrome.storage.local.clear()
  ]);
  els.baseUrl.value = '';
  els.token.value = '';
  els.defaultCategory.value = '';
  els.defaultTags.value = '';
  renderDatalist(els.categoryList, [], () => '');
  renderDatalist(els.tagList, [], () => '');
  setStatus('本地插件配置已清空。', 'success');
}

async function runAction(button, action) {
  button.disabled = true;
  setStatus('处理中...');
  try {
    await action();
  } catch (error) {
    setStatus(error.message || '操作失败', 'error');
  } finally {
    button.disabled = false;
  }
}

els.saveBtn.addEventListener('click', () => runAction(els.saveBtn, () => saveOptions()));
els.testBtn.addEventListener('click', () => runAction(els.testBtn, testConnection));
els.refreshMetaBtn.addEventListener('click', () => runAction(els.refreshMetaBtn, refreshMetadata));
els.clearBtn.addEventListener('click', () => runAction(els.clearBtn, clearOptions));

loadOptions();