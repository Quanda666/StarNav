import { getSystemSettings } from '../services/systemSettingsService.js';

const APP_NAME = '星漫旅站';
const APP_SHORT_NAME = '星漫旅站';
const THEME_COLOR = '#254267';
const BACKGROUND_COLOR = '#0f172a';

function textResponse(body, contentType, headers = {}) {
  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      ...headers,
    },
  });
}

function getSimpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function buildIconSvg(size = 512, accent = 'blue') {
  const safeSize = Number(size) || 512;
  
  let stop0 = '#254267';
  let stop55 = '#416d9d';
  let stop100 = '#3c976d';
  
  if (accent === 'green') {
    stop0 = '#265c44';
    stop55 = '#2e7755';
    stop100 = '#3c976d';
  } else if (accent === 'purple') {
    stop0 = '#5b3b8c';
    stop55 = '#6d4bb3';
    stop100 = '#8b5cf6';
  } else if (accent === 'rose') {
    stop0 = '#9f3758';
    stop55 = '#be4169';
    stop100 = '#e0527d';
  } else if (accent === 'amber') {
    stop0 = '#8a5a16';
    stop55 = '#b7791f';
    stop100 = '#d97706';
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${safeSize}" height="${safeSize}" viewBox="0 0 512 512" role="img" aria-label="Icon">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${stop0}"/>
      <stop offset="55%" stop-color="${stop55}"/>
      <stop offset="100%" stop-color="${stop100}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0f172a" flood-opacity=".28"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <circle cx="142" cy="146" r="28" fill="#f6ede1" opacity=".95"/>
  <circle cx="382" cy="126" r="16" fill="#d9f0e5" opacity=".9"/>
  <circle cx="398" cy="376" r="24" fill="#f6ede1" opacity=".75"/>
  <path d="M146 335c58-118 137-177 237-191-58 118-137 177-237 191Z" fill="#ffffff" opacity=".96" filter="url(#shadow)"/>
  <path d="M176 306c42-76 96-120 164-135-43 77-97 121-164 135Z" fill="${stop100}" opacity=".95"/>
  <path d="M126 379c18-54 44-83 82-96-14 42-41 75-82 96Z" fill="#ead6ba"/>
  <path d="M196 222l92 92" stroke="#ffffff" stroke-width="22" stroke-linecap="round" opacity=".9"/>
  <text x="256" y="438" text-anchor="middle" font-size="54" font-family="Arial, sans-serif" font-weight="700" fill="#ffffff">NAV</text>
</svg>`;
}

export async function handlePwaRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  const isManifest = path === '/manifest.webmanifest' || path === '/manifest.json';
  const isSw = path === '/sw.js';
  const isIcon = path === '/pwa-icon.svg' || path === '/pwa-icon-512.svg' || path === '/pwa-icon-192.svg';

  if (!isManifest && !isSw && !isIcon) {
    return null;
  }

  let systemSettings = null;
  if (env) {
    try {
      systemSettings = await getSystemSettings(env);
    } catch (e) {
      console.warn('[pwa] failed to get system settings', e);
    }
  }

  const appName = systemSettings?.siteName || APP_NAME;
  const appShortName = systemSettings?.siteName || APP_SHORT_NAME;
  const appDesc = systemSettings?.siteSubtitle || '轻量、私密、可管理的个人书签导航站';
  const siteIcon = systemSettings?.siteIcon || '/pwa-icon.svg';
  const accent = systemSettings?.defaultAccent || 'blue';

  let themeColor = THEME_COLOR;
  if (accent === 'green') themeColor = '#265c44';
  else if (accent === 'purple') themeColor = '#5b3b8c';
  else if (accent === 'rose') themeColor = '#9f3758';
  else if (accent === 'amber') themeColor = '#8a5a16';

  if (isManifest) {
    const manifestIcons = [];
    if (siteIcon && siteIcon !== '/pwa-icon.svg') {
      manifestIcons.push({
        src: siteIcon,
        sizes: 'any',
        type: siteIcon.endsWith('.svg') ? 'image/svg+xml' : (siteIcon.endsWith('.png') ? 'image/png' : 'image/x-icon'),
        purpose: 'any maskable',
      });
    }
    manifestIcons.push(
      {
        src: '/pwa-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
      {
        src: '/pwa-icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
      {
        src: '/pwa-icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      }
    );

    return textResponse(JSON.stringify({
      name: appName,
      short_name: appShortName,
      description: appDesc,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: BACKGROUND_COLOR,
      theme_color: themeColor,
      categories: ['productivity', 'utilities'],
      lang: 'zh-CN',
      icons: manifestIcons,
      shortcuts: [
        {
          name: '打开后台管理',
          short_name: '后台',
          url: '/admin',
          description: `进入${appName}后台管理`,
        },
      ],
    }, null, 2), 'application/manifest+json; charset=utf-8');
  }

  if (isSw) {
    const shellUrls = ['/', '/manifest.webmanifest', '/pwa-icon.svg', '/pwa-icon-192.svg', '/pwa-icon-512.svg'];
    if (siteIcon && !shellUrls.includes(siteIcon)) {
      shellUrls.push(siteIcon);
    }
    const shellUrlsStr = JSON.stringify(shellUrls);
    const configVersion = getSimpleHash(`${appName}-${siteIcon}-${themeColor}`);
    const cacheName = `starnav-pwa-${configVersion}`;
    const runtimeCacheName = `starnav-runtime-${configVersion}`;

    return textResponse(`const CACHE_NAME='${cacheName}';
const RUNTIME_CACHE='${runtimeCacheName}';
const SHELL_URLS=${shellUrlsStr};
const FONT_HOSTS=['fonts.googleapis.com','fonts.gstatic.com','cdn.tailwindcss.com'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>{
    return Promise.all(SHELL_URLS.map(url=>{
      return cache.add(url).catch(()=>undefined);
    }));
  }));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME&&key!==RUNTIME_CACHE).map(key=>caches.delete(key))))
  ]));
});
self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING'){self.skipWaiting()}
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api')||url.pathname.startsWith('/go/')||url.pathname.startsWith('/admin'))return;
  const isShell=SHELL_URLS.includes(url.pathname)||SHELL_URLS.includes(request.url);
  const isSameOrigin=url.origin===location.origin;
  if(isShell||isSameOrigin){
    event.respondWith(caches.match(request).then(cached=>{
      const fetchPromise=fetch(request).then(response=>{
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)).catch(()=>undefined);
        }
        return response;
      }).catch(()=>cached||(isSameOrigin?caches.match('/'):undefined));
      return cached||fetchPromise;
    }));
    return;
  }
  if(FONT_HOSTS.includes(url.hostname)){
    event.respondWith(caches.open(RUNTIME_CACHE).then(cache=>cache.match(request).then(cached=>{
      const fetchPromise=fetch(request).then(response=>{if(response&&response.ok){cache.put(request,response.clone())}return response}).catch(()=>cached);
      return cached||fetchPromise;
    })));
  }
});`, 'application/javascript; charset=utf-8', { 'Service-Worker-Allowed': '/' });
  }

  if (path === '/pwa-icon.svg' || path === '/pwa-icon-512.svg') {
    return textResponse(buildIconSvg(512, accent), 'image/svg+xml; charset=utf-8');
  }

  if (path === '/pwa-icon-192.svg') {
    return textResponse(buildIconSvg(192, accent), 'image/svg+xml; charset=utf-8');
  }

  return null;
}