const els = {
  name: document.getElementById('name'),
  url: document.getElementById('url'),
  desc: document.getElementById('desc'),
  catelog: document.getElementById('catelog'),
  tags: document.getElementById('tags'),
  visibility: document.getElementById('visibility'),
  logo: document.getElementById('logo'),
  categoryList: document.getElementById('categoryList'),
  tagList: document.getElementById('tagList'),
  saveBtn: document.getElementById('saveBtn'),
  forceSaveBtn: document.getElementById('forceSaveBtn'),
  fetchBtn: document.getElementById('fetchBtn'),
  fetchFaviconBtn: document.getElementById('fetchFaviconBtn'),
  suggestCategoryBtn: document.getElementById('suggestCategoryBtn'),
  suggestTagsBtn: document.getElementById('suggestTagsBtn'),
  checkDuplicateBtn: document.getElementById('checkDuplicateBtn'),
  optionsBtn: document.getElementById('optionsBtn'),
  status: document.getElementById('status'),
  duplicateBox: document.getElementById('duplicateBox'),
};

let config = {};
let lastDuplicate = null;

function setStatus(message, type = 'info') {
  els.status.textContent = message;
  els.status.style.color = type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : type === 'warning' ? '#d97706' : '#64748b';
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/g, '');
}

function authHeaders() {
  return config.token ? { Authorization: `Bearer ${config.token}` } : {};
}

async function restoreCachedExtensionIcon() {
  if (!chrome.action?.setIcon || !config.siteIcon) return false;
  try {
    // 尝试直接用 URL 设置，如果失败（例如，因为是远程 URL），则回退到 fetch+canvas
    await chrome.action.setIcon({ path: config.siteIcon });
    return true;
  } catch (e) {
    try {
      const response = await fetch(config.siteIcon);
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
    } catch {
      return false;
    }
  }
}

async function apiFetch(path, options = {}) {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  if (!baseUrl) throw new Error('请先在设置中填写 StarNav 地址');
  if (!config.token) throw new Error('请先在设置中填写 Bearer Token');

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
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

  if (!res.ok) {
    const error = new Error(data?.message || data?.error || `请求失败：HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
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

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs[0] ? tabs[0] : null;
}

function getPayload() {
  return {
    name: els.name.value.trim(),
    url: els.url.value.trim(),
    desc: els.desc.value.trim(),
    catelog: els.catelog.value.trim() || '未分类',
    tags: els.tags.value.trim(),
    visibility: els.visibility.value || 'public',
    logo: els.logo.value.trim(),
  };
}

function showDuplicate(duplicate) {
  lastDuplicate = duplicate || null;
  if (!duplicate) {
    els.duplicateBox.style.display = 'none';
    els.duplicateBox.textContent = '';
    els.forceSaveBtn.style.display = 'none';
    return;
  }

  const name = duplicate.name || duplicate.title || '已有书签';
  const url = duplicate.url || '';
  els.duplicateBox.style.display = 'block';
  els.duplicateBox.textContent = `检测到可能重复：${name}\n${url}`;
  els.forceSaveBtn.style.display = 'block';
}

async function loadConfig() {
  config = await chrome.storage.sync.get([
    'baseUrl',
    'token',
    'defaultCategory',
    'defaultTags',
    'categories',
    'tags',
    'siteIcon',
  ]);

  renderDatalist(els.categoryList, config.categories || [], (item) => item.name || item.catelog || item);
  renderDatalist(els.tagList, config.tags || [], (item) => item.name || item.tag || item);
}

async function initPopup() {
  await loadConfig();
  restoreCachedExtensionIcon().catch(() => {});

  const tab = await getActiveTab();
  if (tab) {
    els.name.value = tab.title || '';
    els.url.value = tab.url || '';
  }

  els.catelog.value = config.defaultCategory || '';
  els.tags.value = config.defaultTags || '';

  if (!config.baseUrl || !config.token) {
    setStatus('请先打开设置，填写 StarNav 地址和 Token。', 'error');
    return;
  }

  setStatus('插件已就绪。');
  autoCheckDuplicate().catch(() => {});
}

async function autoFetchMeta() {
  const target = els.url.value.trim();
  if (!target) throw new Error('URL 不能为空');

  const result = await apiFetch('/api/site/preview?url=' + encodeURIComponent(target));
  const data = result?.data || {};

  if (data.title && !els.name.value.trim()) els.name.value = data.title;
  if (data.title) els.name.value = data.title;
  if (data.description) els.desc.value = data.description;
  if (data.favicon) els.logo.value = data.favicon;

  showDuplicate(data.duplicate);
  setStatus('网站信息已抓取。', 'success');
}

async function fetchFavicon() {
  const target = els.url.value.trim();
  if (!target) throw new Error('请先填写 URL');

  const result = await apiFetch('/api/favicon?url=' + encodeURIComponent(target));
  const favicon = result?.favicon || result?.data?.favicon || '';

  if (!favicon) {
    throw new Error('未找到合适图标');
  }

  els.logo.value = favicon;
  setStatus('已获取网站图标。', 'success');
}

async function suggestCategory() {
  const payload = getPayload();
  const result = await apiFetch('/api/submit/suggest-category', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = result?.data || {};
  const category = data.category || data.name || data.catelog || data.suggestion || '';
  if (category) {
    els.catelog.value = category;
    setStatus(`已推荐分类：${category}`, 'success');
  } else {
    setStatus('没有获得分类推荐。', 'warning');
  }
}

async function suggestTags() {
  const payload = getPayload();
  const result = await apiFetch('/api/submit/suggest-tags', {
    method: 'POST',
    body: JSON.stringify({ ...payload, limit: 8 }),
  });
  const data = result?.data || {};
  const tags = Array.isArray(data.tags) ? data.tags : Array.isArray(data) ? data : [];
  if (tags.length) {
    els.tags.value = tags.join(', ');
    setStatus(`已推荐标签：${tags.join(', ')}`, 'success');
  } else {
    setStatus('没有获得标签推荐。', 'warning');
  }
}

async function autoCheckDuplicate() {
  const target = els.url.value.trim();
  if (!target) return null;
  const result = await apiFetch('/api/sites/check-duplicate?url=' + encodeURIComponent(target));
  const duplicate = result?.duplicate || null;
  showDuplicate(duplicate);
  if (duplicate) setStatus('检测到重复书签，可检查后决定是否强制保存。', 'warning');
  else setStatus('未发现重复书签。', 'success');
  return duplicate;
}

async function saveBookmark({ force = false } = {}) {
  const payload = getPayload();

  if (!payload.name || !payload.url) {
    throw new Error('名称和 URL 不能为空');
  }

  const path = `/api/sites${force ? '?force=true' : ''}`;
  const result = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  showDuplicate(null);
  setStatus(`已保存到 StarNav：${payload.name}`, 'success');
  return result;
}

async function runAction(button, action) {
  button.disabled = true;
  setStatus('处理中...');
  try {
    await action();
  } catch (error) {
    if (error.status === 409 && error.data?.duplicate) {
      showDuplicate(error.data.duplicate);
      setStatus(error.message || '检测到重复书签。', 'warning');
    } else {
      setStatus(error.message || '操作失败。', 'error');
    }
  } finally {
    button.disabled = false;
  }
}

els.fetchBtn.addEventListener('click', () => runAction(els.fetchBtn, autoFetchMeta));
els.fetchFaviconBtn.addEventListener('click', () => runAction(els.fetchFaviconBtn, fetchFavicon));
els.suggestCategoryBtn.addEventListener('click', () => runAction(els.suggestCategoryBtn, suggestCategory));
els.suggestTagsBtn.addEventListener('click', () => runAction(els.suggestTagsBtn, suggestTags));
els.checkDuplicateBtn.addEventListener('click', () => runAction(els.checkDuplicateBtn, autoCheckDuplicate));
els.saveBtn.addEventListener('click', () => runAction(els.saveBtn, () => saveBookmark({ force: false })));
els.forceSaveBtn.addEventListener('click', () => runAction(els.forceSaveBtn, () => saveBookmark({ force: true })));
els.optionsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

els.url.addEventListener('change', () => {
  showDuplicate(null);
  autoCheckDuplicate().catch(() => {});
});

initPopup();