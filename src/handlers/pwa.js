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

function buildIconSvg(size = 512) {
  const safeSize = Number(size) || 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${safeSize}" height="${safeSize}" viewBox="0 0 512 512" role="img" aria-label="${APP_NAME}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#254267"/>
      <stop offset="55%" stop-color="#416d9d"/>
      <stop offset="100%" stop-color="#3c976d"/>
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
  <path d="M176 306c42-76 96-120 164-135-43 77-97 121-164 135Z" fill="#3c976d" opacity=".95"/>
  <path d="M126 379c18-54 44-83 82-96-14 42-41 75-82 96Z" fill="#ead6ba"/>
  <path d="M196 222l92 92" stroke="#ffffff" stroke-width="22" stroke-linecap="round" opacity=".9"/>
  <text x="256" y="438" text-anchor="middle" font-size="54" font-family="Arial, sans-serif" font-weight="700" fill="#ffffff">NAV</text>
</svg>`;
}

export function handlePwaRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/manifest.webmanifest' || path === '/manifest.json') {
    return textResponse(JSON.stringify({
      name: APP_NAME,
      short_name: APP_SHORT_NAME,
      description: '轻量、私密、可管理的个人书签导航站',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: BACKGROUND_COLOR,
      theme_color: THEME_COLOR,
      categories: ['productivity', 'utilities'],
      lang: 'zh-CN',
      icons: [
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
        },
      ],
      shortcuts: [
        {
          name: '打开后台管理',
          short_name: '后台',
          url: '/admin',
          description: '进入星漫旅站后台管理',
        },
      ],
    }, null, 2), 'application/manifest+json; charset=utf-8');
  }

  if (path === '/sw.js') {
    return textResponse(`const CACHE_NAME='starnav-pwa-v3';
const RUNTIME_CACHE='starnav-runtime-v3';
const SHELL_URLS=['/','/manifest.webmanifest','/pwa-icon.svg','/pwa-icon-192.svg','/pwa-icon-512.svg'];
const FONT_HOSTS=['fonts.googleapis.com','fonts.gstatic.com','cdn.tailwindcss.com'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL_URLS)).catch(()=>undefined));
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
  if(url.origin!==location.origin){
    if(FONT_HOSTS.includes(url.hostname)){
      event.respondWith(caches.open(RUNTIME_CACHE).then(cache=>cache.match(request).then(cached=>{
        const fetchPromise=fetch(request).then(response=>{if(response&&response.ok){cache.put(request,response.clone())}return response}).catch(()=>cached);
        return cached||fetchPromise;
      })));
    }
    return;
  }
  if(url.pathname.startsWith('/api')||url.pathname.startsWith('/go/')||url.pathname.startsWith('/admin'))return;
  event.respondWith(caches.match(request).then(cached=>{
    const fetchPromise=fetch(request).then(response=>{
      if(response&&response.ok){
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)).catch(()=>undefined);
      }
      return response;
    }).catch(()=>cached||caches.match('/'));
    return cached||fetchPromise;
  }));
});`, 'application/javascript; charset=utf-8', { 'Service-Worker-Allowed': '/' });
  }

  if (path === '/pwa-icon.svg' || path === '/pwa-icon-512.svg') {
    return textResponse(buildIconSvg(512), 'image/svg+xml; charset=utf-8');
  }

  if (path === '/pwa-icon-192.svg') {
    return textResponse(buildIconSvg(192), 'image/svg+xml; charset=utf-8');
  }

  return null;
}