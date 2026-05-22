// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "starnav-collect",
    title: "收藏当前网页到 StarNav",
    contexts: ["page", "link"]
  });
});

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "starnav-collect") return;

  const url = info.linkUrl || info.pageUrl || tab.url;
  const name = tab.title || "未命名网页";

  // 获取配置
  chrome.storage.sync.get(["apiUrl", "apiToken", "defaultCategory"], async (settings) => {
    const apiUrl = settings.apiUrl ? settings.apiUrl.replace(/\/$/, "") : "";
    const apiToken = settings.apiToken || "";
    const defaultCategory = settings.defaultCategory || "未分类";

    if (!apiUrl || !apiToken) {
      showNotification("error", "收藏失败", "请先在插件选项中配置 API 地址和 Token！");
      return;
    }

    try {
      // 1. 自动获取 Favicon
      let logo = "";
      try {
        const domain = new URL(url).origin;
        logo = `${apiUrl}/api/favicon?url=${encodeURIComponent(url)}`;
      } catch (e) {}

      // 2. 提交书签
      const response = await fetch(`${apiUrl}/api/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          logo: logo,
          catelog: defaultCategory,
          desc: "通过浏览器插件一键收藏",
          visibility: "public"
        })
      });

      const result = await response.json();

      if (response.status === 201 || result.code === 201) {
        showNotification("success", "收藏成功", `已成功收藏到分类「${defaultCategory}」！`);
      } else if (result.code === 409) {
        showNotification("warning", "重复收藏", "该网页已在您的 StarNav 中收藏过啦！");
      } else {
        showNotification("error", "收藏失败", result.message || "服务器返回错误");
      }
    } catch (err) {
      showNotification("error", "网络错误", "无法连接到您的 StarNav 实例，请检查网络或 API 地址。");
    }
  });
});

// 弹出系统通知
function showNotification(type, title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/starnav.ico",
    title: title,
    message: message,
    priority: 2
  });
}