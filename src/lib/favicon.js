export async function getFavicon(url) {
  if (!url) return '';

  try {
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    const faviconUrls = [
      `https://www.faviconextractor.com/favicon/${domain}?larger=true`,
      `https://favicon.im/${domain}?larger=true`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://${domain}/favicon.ico`,
    ];

    for (const faviconUrl of faviconUrls) {
      try {
        const response = await fetch(faviconUrl, {
          cf: { cacheEverything: true },
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
          return faviconUrl;
        }
      } catch {
        // 尝试下一个源
      }
    }

    return '';
  } catch {
    return '';
  }
}