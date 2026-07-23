/**
 * 前端认证模块（全局模式）
 * 
 * 功能：
 * - 密码验证（SHA-256 哈希比对）
 * - 会话管理（localStorage + TTL）
 * - 登出按钮
 * - auth 关闭时自动清除旧会话
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'blog-auth';

  const ICONS = {
    lock: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>',
    logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
  };

  function t(key, fallback) {
    if (window.BlogI18n && BlogI18n.strings && Object.keys(BlogI18n.strings).length > 0) {
      const result = BlogI18n.t(key);
      if (result && result !== key) return result;
    }
    return fallback;
  }

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

  function clearAuthData() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();
  }

  function logout() {
    clearAuthData();
    location.href = location.pathname + '?_=' + Date.now();
  }

  function createAuthUI(config, onUnlock) {
    const currentScheme = localStorage.getItem('blog-color-scheme') || 'auto';
    const currentSchemeIcon = currentScheme === 'auto' ? '◐' : (currentScheme === 'dark' ? '☾' : '☀');

    const container = document.createElement('div');
    container.className = 'auth-gate';
    container.innerHTML = `
      <div class="auth-card">
        <div class="auth-icon">${ICONS.lock}</div>
        <h2 class="auth-title">${t('auth.title', '站点已加密')}</h2>
        <p class="auth-desc">${t('auth.desc', '请输入密码以继续访问')}</p>
        <div class="auth-input-group">
          <input type="password" class="auth-password" placeholder="${t('auth.submit', '解锁')}" autocomplete="off" spellcheck="false" autofocus>
          <button class="auth-submit" type="button">${t('auth.submit', '解锁')}</button>
        </div>
        <div class="auth-error" style="display:none">${t('auth.error', '密码错误')}</div>
        <div class="auth-controls">
          <div class="theme-toggle">
            <button class="theme-toggle-btn" type="button">${currentSchemeIcon}</button>
            <div class="theme-toggle-panel">
              <label class="theme-toggle-row">
                <span class="theme-toggle-label">${t('ui.themeAuto', '跟随系统')}</span>
                <input type="checkbox" class="theme-auto-check" ${currentScheme === 'auto' ? 'checked' : ''}>
              </label>
              <div class="theme-manual-panel ${currentScheme === 'auto' ? 'is-hidden' : ''}">
                <button class="theme-manual-btn ${currentScheme === 'light' ? 'is-active' : ''}" data-value="light">${t('ui.themeLight', '亮色')}</button>
                <button class="theme-manual-btn ${currentScheme === 'dark' ? 'is-active' : ''}" data-value="dark">${t('ui.themeDark', '暗色')}</button>
              </div>
            </div>
          </div>
          <div class="lang-switch"></div>
        </div>
      </div>
    `;

    // 主题切换逻辑
    const themeWrap = container.querySelector('.theme-toggle');
    const themeBtn = container.querySelector('.theme-toggle-btn');
    const autoCheck = container.querySelector('.theme-auto-check');
    const manualPanel = container.querySelector('.theme-manual-panel');

    function applyScheme(mode) {
      localStorage.setItem('blog-color-scheme', mode);
      if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', mode);
      document.documentElement.setAttribute('data-color-scheme', mode);
      // 更新 UI
      const icon = mode === 'auto' ? '◐' : (mode === 'dark' ? '☾' : '☀');
      themeBtn.textContent = icon;
      autoCheck.checked = (mode === 'auto');
      manualPanel.classList.toggle('is-hidden', mode === 'auto');
      container.querySelectorAll('.theme-manual-btn').forEach(b => {
        b.classList.toggle('is-active', b.dataset.value === mode);
      });
    }

    themeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      themeWrap.classList.toggle('is-open');
    });

    autoCheck.addEventListener('change', () => {
      applyScheme(autoCheck.checked ? 'auto' : 'light');
    });

    container.querySelectorAll('.theme-manual-btn').forEach(el => {
      el.addEventListener('click', () => applyScheme(el.dataset.value));
    });

    // 语言切换逻辑
    const langWrap = container.querySelector('.lang-switch');
    if (window.BlogI18n && langWrap) {
      const currentLocale = BlogI18n.locale || 'zh';
      const langBtn = document.createElement('button');
      langBtn.className = 'lang-switch-btn';
      langBtn.type = 'button';
      langBtn.textContent = BlogI18n.meta?.shortLabel || currentLocale;
      langBtn.title = BlogI18n.meta?.nativeName || currentLocale;

      const langPanel = document.createElement('div');
      langPanel.className = 'lang-switch-panel';

      langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        langWrap.classList.toggle('is-open');
      });

      BlogI18n.getAvailableLocales().then(locales => {
        if (!locales || locales.length < 2) { langWrap.style.display = 'none'; return; }
        locales.forEach(loc => {
          const opt = document.createElement('button');
          opt.className = 'lang-switch-option' + (loc.code === currentLocale ? ' active' : '');
          opt.textContent = loc.nativeName || loc.name || loc.code;
          opt.addEventListener('click', () => {
            if (loc.code === BlogI18n.locale) { langWrap.classList.remove('is-open'); return; }
            BlogI18n.setLocale(loc.code);
            location.reload();
          });
          langPanel.appendChild(opt);
        });
      });

      langWrap.appendChild(langBtn);
      langWrap.appendChild(langPanel);
    }

    // 点击外部关闭下拉菜单
    document.addEventListener('click', () => {
      if (themeWrap) themeWrap.classList.remove('is-open');
      if (langWrap) langWrap.classList.remove('is-open');
    });
    container.querySelector('.auth-controls').addEventListener('click', (e) => e.stopPropagation());

    // 密码验证逻辑
    const input = container.querySelector('.auth-password');
    const button = container.querySelector('.auth-submit');
    const error = container.querySelector('.auth-error');

    async function attemptUnlock() {
      const password = input.value;
      if (!password) return;
      button.disabled = true;
      button.textContent = t('auth.verifying', '验证中...');
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
        button.textContent = t('auth.submit', '解锁');
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
    btn.title = t('auth.logout', '登出');
    btn.addEventListener('click', logout);
    navLinks.appendChild(btn);
  }

  async function init() {
    const config = getAuthConfig();

    // auth 关闭时清除旧会话，避免脏数据
    if (!config || !config.enabled) {
      clearAuthData();
      return;
    }

    // 加载 i18n（auth 门需要语言切换）
    if (window.BlogI18n) {
      try { await BlogI18n.load(); } catch (_) {}
    }

    // 检查会话
    const session = getSession();
    if (session && session.hash === config.passwordHash) {
      addLogoutButton();
      return;
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

  window.BlogAuth = { getSession, logout, clearAuthData };
})();
