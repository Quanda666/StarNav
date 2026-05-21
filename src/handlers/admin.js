import { buildSessionCookie, createAdminSession, destroyAdminSession, validateAdminSession, verifyAdminCredentials } from '../lib/auth.js';
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

  if (url.pathname === '/admin') {
    if (request.method === 'POST') {
      const formData = await request.formData();
      const name = (formData.get('name') || '').trim();
      const password = (formData.get('password') || '').trim();

      if (await verifyAdminCredentials(env, name, password)) {
        const token = await createAdminSession(env);
        return new Response(null, {
          status: 302,
          headers: {
            Location: '/admin',
            'Set-Cookie': buildSessionCookie(token),
          },
        });
      }

      return renderLoginPage('账号或密码错误，请重试。');
    }

    const session = await validateAdminSession(request, env);
    return session.authenticated ? renderAdminPage() : renderLoginPage();
  }

  if (url.pathname.startsWith('/static/')) {
    const filePath = url.pathname.replace('/static/', '');
    const asset = getAdminAsset(filePath);
    if (!asset) return textResponse('Not Found', 404);
    return new Response(asset.content, {
      headers: { 'Content-Type': asset.type, 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  }

  return textResponse('页面不存在', 404);
}

function renderAdminPage() {
  const asset = getAdminAsset('admin.html');
  return htmlResponse(asset.content);
}

function renderLoginPage(message = '') {
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
    .login-container{background:#fefdfb;padding:3rem 2.5rem;border:3px solid #2c2416;box-shadow:0 8px 0 rgba(44,36,22,.15),0 0 0 1px rgba(44,36,22,.1) inset,0 20px 40px rgba(0,0,0,.08);width:100%;max-width:440px;position:relative;z-index:1;animation:slideIn .6s cubic-bezier(.16,1,.3,1)}
    .login-container::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(139,69,19,.04) 24px,rgba(139,69,19,.04) 25px);pointer-events:none}
    @keyframes slideIn{from{opacity:0;transform:translateY(30px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes shake{0%,100%{transform:translateX(0)}10%,30%,50%,70%,90%{transform:translateX(-8px)}20%,40%,60%,80%{transform:translateX(8px)}}
    .shake{animation:shake .5s}
    .login-header{text-align:center;margin-bottom:2.5rem;padding-bottom:1.5rem;border-bottom:2px solid #2c2416;position:relative}
    .login-header::after{content:'✦';position:absolute;bottom:-12px;left:50%;transform:translateX(-50%);background:#fefdfb;padding:0 .75rem;font-size:1rem;color:#8b4513}
    .login-icon{width:56px;height:56px;margin:0 auto 1rem;background:#2c2416;display:flex;align-items:center;justify-content:center;font-size:1.75rem;border:2px solid #2c2416;position:relative}
    .login-icon::before{content:'';position:absolute;inset:-4px;border:1px solid #2c2416;opacity:.3}
    .login-title{font-size:2rem;font-weight:700;color:#2c2416;margin-bottom:.5rem;letter-spacing:.02em;text-transform:uppercase;font-family:Georgia,serif}
    .login-subtitle{font-size:.875rem;color:#654321;font-style:italic;letter-spacing:.03em}
    .form-group{margin-bottom:1.75rem;position:relative}
    label{display:block;margin-bottom:.75rem;font-weight:600;color:#2c2416;font-size:.875rem;text-transform:uppercase;letter-spacing:.05em}
    .input-wrapper{position:relative}
    input[type=text],input[type=password]{width:100%;padding:.875rem 1rem;padding-right:2.75rem;border:2px solid #2c2416;background:#fff;font-size:1rem;transition:all .2s;font-family:Georgia,serif;color:#2c2416}
    input:focus{border-color:#8b4513;outline:none;box-shadow:0 0 0 3px rgba(139,69,19,.15);background:#fffef8}
    input::placeholder{color:#a0826d;font-style:italic}
    .toggle-password{position:absolute;right:1rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:.25rem;color:#654321;transition:color .2s;font-size:1.25rem;line-height:1;user-select:none}
    .toggle-password:hover{color:#2c2416}
    .remember-me{display:flex;align-items:center;gap:.5rem;margin-bottom:1.75rem}
    .remember-me input[type=checkbox]{width:18px;height:18px;cursor:pointer;accent-color:#8b4513;border:2px solid #2c2416}
    .remember-me label{margin:0;font-size:.813rem;color:#654321;cursor:pointer;font-weight:400;text-transform:none;letter-spacing:normal}
    button[type=submit]{width:100%;padding:1rem;background:#2c2416;color:#fefdfb;border:3px solid #2c2416;font-size:1rem;font-weight:700;cursor:pointer;transition:all .2s;box-shadow:0 4px 0 rgba(44,36,22,.3);position:relative;text-transform:uppercase;letter-spacing:.1em;font-family:Georgia,serif}
    button[type=submit]:hover{background:#3d3020;transform:translateY(-2px);box-shadow:0 6px 0 rgba(44,36,22,.3)}
    button[type=submit]:active{transform:translateY(2px);box-shadow:0 2px 0 rgba(44,36,22,.3)}
    .error-message{background:#fff5f5;border:2px solid #8b0000;color:#8b0000;padding:.875rem 1rem;font-size:.875rem;margin-bottom:1.25rem;display:none;animation:slideDown .3s;font-family:Georgia,serif;font-style:italic}
    @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
    .back-link{display:block;text-align:center;margin-top:2rem;color:#654321;text-decoration:none;font-size:.875rem;font-weight:400;transition:color .2s;border-top:1px solid rgba(44,36,22,.2);padding-top:1.5rem;font-style:italic}
    .back-link:hover{color:#2c2416;text-decoration:underline}
    .back-link::before{content:'← '}
    @media(max-width:480px){.login-container{padding:2rem 1.75rem}.login-title{font-size:1.625rem}}
  </style>
</head>
<body>
  <div class="login-container" id="loginContainer">
    <div class="login-header">
      <div class="login-icon">📰</div>
      <h1 class="login-title">Administrator</h1>
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
  <script>
    (function(){
      const form=document.getElementById('loginForm');
      const container=document.getElementById('loginContainer');
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
</html>`);
}