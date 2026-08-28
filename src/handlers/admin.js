import { buildSessionCookie, clearLoginFailures, createAdminSession, destroyAdminSession, initializeAdmin, isAdminInitialized, getLoginThrottle, registerLoginFailure, validateAdminSession, verifyAdminCredentials } from '../lib/auth.js';
import { escapeHTML, htmlResponse, textResponse } from '../lib/utils.js';
import { getAdminAsset } from '../pages/adminAssets.js';

export async function handleAdminRequest(request, env, ctx) {
  const url = new URL(request.url);

  if (url.pathname === '/admin/logout') {
    if (request.method !== 'POST') return textResponse('Method Not Allowed', 405);
    const { token } = await validateAdminSession(request, env);
    if (token) await destroyAdminSession(env, token);

    return new Response(null, {
      status: 302,
      headers: {
        Location: '/admin',
        'Set-Cookie': buildSessionCookie('', { maxAge: 0 }),
      },
    });
  }

  if (url.pathname === '/admin/setup') {
    if (request.method !== 'POST') return textResponse('Method Not Allowed', 405);
    // 防抢注：仅当尚无管理员时允许初始化；已有管理员则跳回 /admin（显示登录）
    if (await isAdminInitialized(env)) {
      return new Response(null, { status: 302, headers: { Location: '/admin' } });
    }
    const formData = await request.formData();
    const name = (formData.get('name') || '').trim();
    const password = (formData.get('password') || '').trim();
    const confirm = (formData.get('confirm') || '').trim();
    if (password !== confirm) {
      return renderSetupPage('两次输入的密码不一致，请重新输入。');
    }
    try {
      await initializeAdmin(env, name, password);
    } catch (error) {
      return renderSetupPage(error?.message || '初始化失败，请检查输入。');
    }
    const token = await createAdminSession(env);
    return new Response(null, {
      status: 302,
      headers: { Location: '/admin', 'Set-Cookie': buildSessionCookie(token) },
    });
  }

  if (url.pathname === '/admin') {
    // 首次部署：尚未初始化管理员时，一律导向初始化页（避免在登录页徒劳提交）
    if (!(await isAdminInitialized(env))) {
      if (request.method === 'POST') {
        return new Response(null, { status: 302, headers: { Location: '/admin' } });
      }
      return renderSetupPage();
    }
    if (request.method === 'POST') {
      // 登录失败限速：按客户端 IP 在 KV 计数，超过阈值后短时锁定，缓解在线爆破。
      // 注意 KV 为最终一致，并发请求可能少量绕过，但足以阻断持续爆破。
      const throttle = await getLoginThrottle(env, request);
      if (throttle.locked) {
        return renderLoginPage('登录尝试过于频繁，请 15 分钟后再试。', { status: 429 });
      }

      const formData = await request.formData();
      const name = (formData.get('name') || '').trim();
      const password = (formData.get('password') || '').trim();

      if (await verifyAdminCredentials(env, name, password)) {
        await clearLoginFailures(env, throttle.key);
        const token = await createAdminSession(env);
        return new Response(null, {
          status: 302,
          headers: {
            Location: '/admin',
            'Set-Cookie': buildSessionCookie(token),
          },
        });
      }

      await registerLoginFailure(env, throttle.key, throttle.count);
      return renderLoginPage('账号或密码错误，请重试。');
    }

    const session = await validateAdminSession(request, env);
    return session.authenticated ? renderAdminPage() : renderLoginPage();
  }

  if (url.pathname.startsWith('/static/')) {
    const filePath = url.pathname.replace('/static/', '');
    const asset = getAdminAsset(filePath);
    if (!asset) return textResponse('Not Found', 404);
    // 可被缓存但每次使用前必须 revalidate（no-cache）：内容变化时 version(ETag) 随之改变，
    // 未变则返回 304 省去 body 传输——既保证永不取到过期内容，又避免 no-store 的每次全量重下。
    const etag = `"${asset.version}"`;
    const cacheControl = 'public, no-cache';
    if (request.headers.get('If-None-Match') === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag, 'Cache-Control': cacheControl } });
    }
    return new Response(asset.content, {
      headers: { 'Content-Type': asset.type, 'Cache-Control': cacheControl, ETag: etag },
    });
  }

  return textResponse('页面不存在', 404);
}

function renderAdminPage() {
  const asset = getAdminAsset('admin.html');
  return htmlResponse(asset.content);
}

function renderLoginPage(message = '', { status = 200 } = {}) {
  const hasError = Boolean(message);
  const safeMessage = hasError ? escapeHTML(message) : '';
  return htmlResponse(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>管理员登录 - 星漫旅站</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body{height:100%;font-family:Georgia,'Times New Roman',serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
    body{display:flex;justify-content:center;align-items:center;background:#f4f1e8;padding:1rem;position:relative;overflow:hidden}
    body::before{content:'';position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(0,0,0,.02) 1px,rgba(0,0,0,.02) 2px),repeating-linear-gradient(90deg,transparent,transparent 1px,rgba(0,0,0,.02) 1px,rgba(0,0,0,.02) 2px);background-size:20px 20px;opacity:.5}
    body::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 20% 50%,rgba(139,69,19,.03),transparent 50%),radial-gradient(circle at 80% 50%,rgba(101,67,33,.03),transparent 50%);pointer-events:none}
    .login-shell{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);width:100%;max-width:920px;background:#fefdfb;border:3px solid #2c2416;box-shadow:0 8px 0 rgba(44,36,22,.15),0 20px 44px rgba(0,0,0,.1);position:relative;z-index:1;animation:slideIn .6s cubic-bezier(.16,1,.3,1);overflow:hidden}
    @keyframes slideIn{from{opacity:0;transform:translateY(30px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes shake{0%,100%{transform:translateX(0)}10%,30%,50%,70%,90%{transform:translateX(-8px)}20%,40%,60%,80%{transform:translateX(8px)}}
    .shake{animation:shake .5s}
    /* 左侧品牌区 */
    .brand-panel{background:linear-gradient(160deg,#2c2416 0%,#3a2f1d 55%,#4a3b23 100%);color:#f4ead8;padding:3rem 2.5rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
    .brand-panel::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 26px,rgba(244,234,216,.04) 26px,rgba(244,234,216,.04) 27px);pointer-events:none}
    .brand-panel::after{content:'✦';position:absolute;right:-1.5rem;bottom:-2rem;font-size:12rem;color:rgba(244,234,216,.05);pointer-events:none}
    .brand-top{position:relative}
    .brand-badge{display:inline-flex;align-items:center;gap:.6rem;padding:.4rem .85rem;border:1px solid rgba(244,234,216,.28);border-radius:999px;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:#e2cfa8}
    .brand-badge .dot{width:7px;height:7px;border-radius:50%;background:#c99b52;box-shadow:0 0 0 3px rgba(201,155,82,.28)}
    .brand-title{font-size:2.4rem;font-weight:700;line-height:1.15;margin:1.6rem 0 .6rem;letter-spacing:.02em}
    .brand-title em{font-style:normal;color:#c99b52}
    .brand-tagline{font-size:.95rem;font-style:italic;color:#cbb99a;line-height:1.7;max-width:24rem}
    .brand-marquee{margin-top:2rem;display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem}
    .brand-card{background:rgba(244,234,216,.06);border:1px solid rgba(244,234,216,.14);border-radius:10px;padding:.85rem .8rem;min-height:64px;display:flex;flex-direction:column;justify-content:center;gap:.42rem}
    .brand-card .bar{height:6px;border-radius:999px;background:rgba(244,234,216,.3)}
    .brand-card .bar.short{width:56%}
    .brand-card .pill{width:52%;height:5px;border-radius:999px;background:rgba(201,155,82,.55)}
    .brand-foot{position:relative;font-size:.75rem;color:rgba(244,234,216,.55);letter-spacing:.04em}
    .brand-foot span{display:block}
    .brand-foot .star{color:#c99b52;margin-bottom:.3rem}
    /* 右侧表单区 */
    .form-panel{padding:3rem 2.5rem;position:relative;background:#fefdfb}
    .form-panel::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(139,69,19,.04) 24px,rgba(139,69,19,.04) 25px);pointer-events:none}
    .form-inner{position:relative;max-width:340px;margin:0 auto}
    .login-header{text-align:center;margin-bottom:2.25rem;padding-bottom:1.4rem;border-bottom:2px solid #2c2416;position:relative}
    .login-header::after{content:'✦';position:absolute;bottom:-12px;left:50%;transform:translateX(-50%);background:#fefdfb;padding:0 .75rem;font-size:1rem;color:#8b4513}
    .login-icon{width:56px;height:56px;margin:0 auto 1rem;background:#2c2416;display:flex;align-items:center;justify-content:center;font-size:1.75rem;border:2px solid #2c2416;position:relative}
    .login-icon::before{content:'';position:absolute;inset:-4px;border:1px solid #2c2416;opacity:.3}
    .login-title{font-size:1.55rem;font-weight:700;color:#2c2416;margin-bottom:.5rem;letter-spacing:.02em;text-transform:uppercase;font-family:Georgia,serif}
    .login-subtitle{font-size:.813rem;color:#654321;font-style:italic;letter-spacing:.03em}
    .form-group{margin-bottom:1.6rem;position:relative}
    label{display:block;margin-bottom:.7rem;font-weight:600;color:#2c2416;font-size:.813rem;text-transform:uppercase;letter-spacing:.05em}
    .input-wrapper{position:relative}
    input[type=text],input[type=password]{width:100%;padding:.875rem 1rem;padding-right:2.75rem;border:2px solid #2c2416;background:#fff;font-size:1rem;transition:all .2s;font-family:Georgia,serif;color:#2c2416}
    input:focus{border-color:#8b4513;outline:none;box-shadow:0 0 0 3px rgba(139,69,19,.15);background:#fffef8}
    input::placeholder{color:#a0826d;font-style:italic}
    .toggle-password{position:absolute;right:1rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:.25rem;color:#654321;transition:color .2s;font-size:1.25rem;line-height:1;user-select:none}
    .toggle-password:hover{color:#2c2416}
    .remember-me{display:flex;align-items:center;gap:.5rem;margin-bottom:1.6rem}
    .remember-me input[type=checkbox]{width:18px;height:18px;cursor:pointer;accent-color:#8b4513;border:2px solid #2c2416}
    .remember-me label{margin:0;font-size:.75rem;color:#654321;cursor:pointer;font-weight:400;text-transform:none;letter-spacing:normal}
    button[type=submit]{width:100%;padding:1rem;background:#2c2416;color:#fefdfb;border:3px solid #2c2416;font-size:1rem;font-weight:700;cursor:pointer;transition:all .2s;box-shadow:0 4px 0 rgba(44,36,22,.3);position:relative;text-transform:uppercase;letter-spacing:.1em;font-family:Georgia,serif}
    button[type=submit]:hover{background:#3d3020;transform:translateY(-2px);box-shadow:0 6px 0 rgba(44,36,22,.3)}
    button[type=submit]:active{transform:translateY(2px);box-shadow:0 2px 0 rgba(44,36,22,.3)}
    .error-message{background:#fff5f5;border:2px solid #8b0000;color:#8b0000;padding:.875rem 1rem;font-size:.813rem;margin-bottom:1.25rem;display:none;animation:slideDown .3s;font-family:Georgia,serif;font-style:italic}
    @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
    .back-link{display:block;text-align:center;margin-top:1.8rem;color:#654321;text-decoration:none;font-size:.813rem;font-weight:400;transition:color .2s;border-top:1px solid rgba(44,36,22,.2);padding-top:1.4rem;font-style:italic}
    .back-link:hover{color:#2c2416;text-decoration:underline}
    .back-link::before{content:'← '}
    @media(max-width:860px){
      body{align-items:safe center;overflow-x:hidden;overflow-y:auto;padding:1rem 1rem 2rem}
      .login-shell{grid-template-columns:1fr;max-width:440px;padding:3rem 2.5rem;margin:0 auto}
      .brand-panel{display:none}
      .form-panel{padding:0}
      .form-inner{max-width:none}
      .login-title{font-size:2rem}
    }
  </style>
</head>
<body>
  <div class="login-shell" id="loginShell">
    <aside class="brand-panel">
      <div class="brand-top">
        <span class="brand-badge"><span class="dot"></span>StarNav · 星漫旅站</span>
        <h1 class="brand-title">收藏、整理<br>与<em>发现</em>你的站点</h1>
        <p class="brand-tagline">把常用网站收进一个清爽的导航，随时回到熟悉的地方。</p>
        <div class="brand-marquee" aria-hidden="true">
          <div class="brand-card"><span class="bar"></span><span class="pill"></span></div>
          <div class="brand-card"><span class="bar short"></span><span class="pill"></span></div>
          <div class="brand-card"><span class="bar"></span><span class="bar short"></span></div>
          <div class="brand-card"><span class="pill"></span></div>
          <div class="brand-card"><span class="bar short"></span><span class="bar"></span></div>
          <div class="brand-card"><span class="bar"></span></div>
        </div>
      </div>
      <div class="brand-foot">
        <span class="star">✦ ❖ ✦</span>
        <span>让每一个站点都有归处</span>
      </div>
    </aside>
    <main class="form-panel">
      <div class="form-inner">
        <div class="login-header">
          <div class="login-icon">📰</div>
          <h2 class="login-title">Administrator</h2>
          <p class="login-subtitle">星漫旅站 · 导航管理系统</p>
        </div>
        <form method="post" action="/admin" id="loginForm" novalidate>
          ${hasError ? `<div class="error-message" style="display:block;">${safeMessage}</div>` : ''}
          <div class="form-group">
            <label for="username">用户名</label>
            <div class="input-wrapper">
              <input type="text" id="username" name="name" placeholder="请输入用户名" required autocomplete="username">
            </div>
          </div>
          <div class="form-group">
            <label for="password">密码</label>
            <div class="input-wrapper">
              <input type="password" id="password" name="password" placeholder="请输入密码" required autocomplete="current-password">
              <button type="button" class="toggle-password" id="togglePassword" aria-label="显示密码">👁️</button>
            </div>
          </div>
          <div class="remember-me">
            <input type="checkbox" id="rememberMe">
            <label for="rememberMe">记住用户名</label>
          </div>
          <button type="submit">登 录</button>
        </form>
        <a href="/" class="back-link">← 返回首页</a>
      </div>
    </main>
  </div>
  <script>
    (function(){
      const form=document.getElementById('loginForm');
      const container=document.getElementById('loginShell');
      const usernameInput=document.getElementById('username');
      const passwordInput=document.getElementById('password');
      const togglePassword=document.getElementById('togglePassword');
      const rememberMe=document.getElementById('rememberMe');
      
      // 记住用户名功能
      const savedUsername=localStorage.getItem('nav_admin_username');
      if(savedUsername){
        usernameInput.value=savedUsername;
        rememberMe.checked=true;
      }
      
      // 密码可见性切换
      togglePassword.addEventListener('click',function(){
        const type=passwordInput.type==='password'?'text':'password';
        passwordInput.type=type;
        togglePassword.textContent=type==='password'?'👁️':'🙈';
      });
      
      // 回车键登录
      passwordInput.addEventListener('keypress',function(e){
        if(e.key==='Enter'){
          e.preventDefault();
          form.submit();
        }
      });
      
      // 表单提交处理
      form.addEventListener('submit',function(e){
        if(rememberMe.checked){
          localStorage.setItem('nav_admin_username',usernameInput.value.trim());
        }else{
          localStorage.removeItem('nav_admin_username');
        }
      });
      
      // 登录失败抖动动画
      ${hasError ? `container.classList.add('shake');setTimeout(()=>container.classList.remove('shake'),500);` : ''}
      
      // 自动聚焦
      if(!usernameInput.value){
        usernameInput.focus();
      }else{
        passwordInput.focus();
      }
    })();
  </script>
</body>
</html>`, status);
}

function renderSetupPage(message = '', { status = 200 } = {}) {
  const hasError = Boolean(message);
  const safeMessage = hasError ? escapeHTML(message) : '';
  return htmlResponse(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>初始化管理员 - 星漫旅站</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body{height:100%;font-family:Georgia,'Times New Roman',serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
    body{display:flex;justify-content:center;align-items:center;background:#f4f1e8;padding:1.5rem;position:relative;overflow:hidden}
    body::before{content:'';position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(0,0,0,.02) 1px,rgba(0,0,0,.02) 2px),repeating-linear-gradient(90deg,transparent,transparent 1px,rgba(0,0,0,.02) 1px,rgba(0,0,0,.02) 2px);background-size:20px 20px;opacity:.5}
    .shell{width:100%;max-width:460px;background:#fefdfb;border:3px solid #2c2416;box-shadow:0 8px 0 rgba(44,36,22,.15),0 20px 44px rgba(0,0,0,.1);position:relative;z-index:1;animation:slideIn .6s cubic-bezier(.16,1,.3,1);overflow:hidden}
    @keyframes slideIn{from{opacity:0;transform:translateY(30px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes shake{0%,100%{transform:translateX(0)}10%,30%,50%,70%,90%{transform:translateX(-8px)}20%,40%,60%,80%{transform:translateX(8px)}}
    .shake{animation:shake .5s}
    .header{background:linear-gradient(160deg,#2c2416 0%,#3a2f1d 55%,#4a3b23 100%);color:#f4ead8;padding:1.9rem 2.5rem 1.5rem;position:relative}
    .header::after{content:'✦';position:absolute;right:1rem;top:.6rem;font-size:2rem;color:rgba(244,234,216,.18)}
    .badge{display:inline-flex;align-items:center;gap:.5rem;padding:.3rem .7rem;border:1px solid rgba(244,234,216,.28);border-radius:999px;font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:#e2cfa8}
    .badge .dot{width:6px;height:6px;border-radius:50%;background:#c99b52;box-shadow:0 0 0 3px rgba(201,155,82,.28)}
    .title{font-size:1.5rem;font-weight:700;margin:.9rem 0 .3rem;letter-spacing:.02em}
    .subtitle{font-size:.8rem;font-style:italic;color:#cbb99a}
    .body{padding:2rem 2.5rem}
    .note{font-size:.75rem;color:#654321;font-style:italic;margin-bottom:1.4rem;line-height:1.7;border-left:2px solid #8b4513;padding:.5rem .7rem;background:rgba(139,69,19,.04)}
    label{display:block;margin-bottom:.6rem;font-weight:600;color:#2c2416;font-size:.813rem;text-transform:uppercase;letter-spacing:.05em}
    .form-group{margin-bottom:1.2rem}
    input[type=text],input[type=password]{width:100%;padding:.8rem 1rem;border:2px solid #2c2416;background:#fff;font-size:1rem;font-family:Georgia,serif;color:#2c2416;transition:all .2s}
    input:focus{border-color:#8b4513;outline:none;box-shadow:0 0 0 3px rgba(139,69,19,.15);background:#fffef8}
    input::placeholder{color:#a0826d;font-style:italic}
    button[type=submit]{width:100%;padding:.9rem;background:#2c2416;color:#fefdfb;border:3px solid #2c2416;font-size:1rem;font-weight:700;cursor:pointer;transition:all .2s;box-shadow:0 4px 0 rgba(44,36,22,.3);text-transform:uppercase;letter-spacing:.1em;font-family:Georgia,serif}
    button[type=submit]:hover{background:#3d3020;transform:translateY(-2px);box-shadow:0 6px 0 rgba(44,36,22,.3)}
    button[type=submit]:active{transform:translateY(2px);box-shadow:0 2px 0 rgba(44,36,22,.3)}
    .error-message{background:#fff5f5;border:2px solid #8b0000;color:#8b0000;padding:.8rem 1rem;font-size:.813rem;margin-bottom:1.2rem;font-style:italic;display:none}
    .back-link{display:block;text-align:center;margin-top:1.4rem;color:#654321;text-decoration:none;font-size:.813rem;font-style:italic;border-top:1px solid rgba(44,36,22,.2);padding-top:1.2rem}
    .back-link:hover{color:#2c2416;text-decoration:underline}
    .back-link::before{content:'← '}
    @media(max-width:600px){
      html,body{height:auto;min-height:100%}
      body{align-items:safe center;overflow-x:hidden;overflow-y:auto;padding:1.25rem 1rem 2rem}
      .shell{max-width:100%}
      .header{padding:1.4rem 1.5rem 1.1rem}
      .body{padding:1.5rem 1.5rem 1.75rem}
      .title{font-size:1.3rem}
    }
  </style>
</head>
<body>
  <div class="shell" id="setupShell">
    <div class="header">
      <span class="badge"><span class="dot"></span>StarNav · 首次初始化</span>
      <h1 class="title">设置管理员账号</h1>
      <p class="subtitle">部署完成后的唯一一次设置，之后本页自动切换为登录。</p>
    </div>
    <form method="post" action="/admin/setup" class="body" id="setupForm" novalidate>
      <p class="note">为你的星漫旅站创建管理员。用户名与密码保存在你自己的 Cloudflare KV 中，仅此一次设置；完成后此页将永久关闭并切换为登录页。</p>
      ${hasError ? `<div class="error-message" style="display:block;">${safeMessage}</div>` : ''}
      <div class="form-group">
        <label for="username">管理员用户名</label>
        <input type="text" id="username" name="name" placeholder="2-32 位用户名" required autocomplete="username">
      </div>
      <div class="form-group">
        <label for="password">登录密码</label>
        <input type="password" id="password" name="password" placeholder="至少 8 位" required autocomplete="new-password">
      </div>
      <div class="form-group">
        <label for="confirm">确认密码</label>
        <input type="password" id="confirm" name="confirm" placeholder="再次输入密码" required autocomplete="new-password">
      </div>
      <button type="submit">完成初始化</button>
      <a href="/" class="back-link">返回首页</a>
    </form>
  </div>
  <script>
    (function(){
      const form=document.getElementById('setupForm');
      const usernameInput=document.getElementById('username');
      const passwordInput=document.getElementById('password');
      const confirmInput=document.getElementById('confirm');
      const shell=document.getElementById('setupShell');
      form.addEventListener('submit',function(e){
        if(passwordInput.value!==confirmInput.value){
          e.preventDefault();
          const err=document.querySelector('.error-message');
          err.textContent='两次输入的密码不一致，请重新输入。';
          err.style.display='block';
          shell.classList.add('shake');
          setTimeout(()=>shell.classList.remove('shake'),500);
          confirmInput.focus();
        }
      });
      if(!usernameInput.value){usernameInput.focus();}else{passwordInput.focus();}
    })();
  </script>
</body>
</html>`, status);
}