/**
 * 前端认证模块（全局模式）
 * 
 * 功能：
 * - 密码验证（SHA-256 哈希比对）
 * - 会话管理（localStorage + TTL）
 * - 登出按钮
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'blog-auth';

  // SVG 图标
  const ICONS = {
    lock: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>',
    logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
  };

  function getAuthConfig() {
    try {
      const el = document.getElementById('auth-config');
      if (el) return JSON.parse(el.textContent);
    } catch (_) {}
    return null;
  }

  async function hashPassword(password, salt) {
    const data = new TextEncoder().encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (session.expires !== -1 && Date.now() > session.expires) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return session;
    } catch (_) {
      return null;
    }
  }

  function saveSession(hash, ttl) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      hash,
      expires: ttl === -1 ? -1 : Date.now() + (ttl * 1000),
      version: 1
    }));
  }

  function logout() {
    // 清除所有存储
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();
    // 强制刷新（绕过 HTTP 缓存）
    location.href = location.pathname + '?_=' + Date.now();
  }

  function createAuthUI(config, onUnlock) {
    const container = document.createElement('div');
    container.className = 'auth-gate';
    container.innerHTML = `
      <div class="auth-card">
        <div class="auth-icon">${ICONS.lock}</div>
        <h2 class="auth-title">站点已加密</h2>
        <p class="auth-desc">请输入密码以继续访问</p>
        <div class="auth-input-group">
          <input type="password" class="auth-password" placeholder="密码" autocomplete="off" spellcheck="false" autofocus>
          <button class="auth-submit" type="button">解锁</button>
        </div>
        <div class="auth-error" style="display:none">密码错误</div>
      </div>
    `;

    const input = container.querySelector('.auth-password');
    const button = container.querySelector('.auth-submit');
    const error = container.querySelector('.auth-error');

    async function attemptUnlock() {
      const password = input.value;
      if (!password) return;
      button.disabled = true;
      button.textContent = '验证中...';
      error.style.display = 'none';

      const hash = await hashPassword(password, config.siteName);
      if (hash === config.passwordHash) {
        saveSession(config.passwordHash, config.sessionTtl);
        onUnlock();
      } else {
        error.style.display = 'block';
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 300);
        button.disabled = false;
        button.textContent = '解锁';
        input.value = '';
        input.focus();
      }
    }

    button.addEventListener('click', attemptUnlock);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptUnlock(); });

    return container;
  }

  function addLogoutButton() {
    if (document.querySelector('.auth-logout-btn')) return;
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    const btn = document.createElement('button');
    btn.className = 'auth-logout-btn';
    btn.innerHTML = ICONS.logout;
    btn.title = '登出';
    btn.addEventListener('click', logout);
    navLinks.appendChild(btn);
  }

  async function init() {
    const config = getAuthConfig();
    if (!config || !config.enabled) return;

    // 检查会话
    const session = getSession();
    if (session && session.hash === config.passwordHash) {
      addLogoutButton();
      return; // 会话有效
    }

    // 无有效会话，显示密码门
    document.body.style.overflow = 'hidden';
    const gate = createAuthUI(config, () => {
      gate.remove();
      document.body.style.overflow = '';
      addLogoutButton();
    });
    document.body.appendChild(gate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.BlogAuth = { getSession, logout };
})();
