window.BlogNav = {
  setFavicon() {
    const favicon = this.config?.site?.favicon;
    if (!favicon) return;
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = this.resolveAsset(favicon);
  },

  setNavLogo() {
    const logo = this.config?.site?.logo;
    const navLogo = document.querySelector('.nav-logo');
    if (!logo || !navLogo) return;
    const img = document.createElement('img');
    img.src = this.resolveAsset(logo);
    img.alt = this.config?.site?.name || 'Logo';
    img.className = 'nav-logo';
    img.onerror = () => { img.style.display = 'none'; };
    navLogo.parentNode.replaceChild(img, navLogo);
  },

  isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return !/^(javascript|data|vbscript):/i.test(url.trim());
  },

  renderBeian() {
    const container = document.getElementById('beian-footer');
    if (!container) return;
    const beian = this.config?.beian;
    if (!beian?.enabled) { container.innerHTML = ''; return; }
    const lines = [];
    if (beian.displayName) lines.push(`<div>${this.escapeHtml(beian.displayName)}</div>`);
    if (beian.icp?.enabled && this.isSafeUrl(beian.icp.url)) {
      lines.push(`<div><a href="${this.escapeHtml(beian.icp.url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(beian.icp.number || 'ICP')}</a></div>`);
    }
    if (beian.police?.enabled) {
      if (beian.police.number && this.isSafeUrl(beian.police.url)) {
        lines.push(`<div><a href="${this.escapeHtml(beian.police.url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(beian.police.number)}</a></div>`);
      } else if (beian.police.statusText) {
        lines.push(`<div>${this.escapeHtml(beian.police.statusText)}</div>`);
      }
    }
    container.innerHTML = lines.join('\n');
  },

  applyI18n() {
    if (!window.BlogI18n || !BlogI18n.strings || Object.keys(BlogI18n.strings).length === 0) return;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const text = BlogI18n.t(key);
      if (text && text !== key) {
        if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) el.placeholder = text;
        else el.textContent = text;
      }
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria-label');
      if (!key) return;
      const text = BlogI18n.t(key);
      if (text && text !== key) el.setAttribute('aria-label', text);
    });
    document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
      const key = el.getAttribute('data-i18n-alt');
      if (!key) return;
      const text = BlogI18n.t(key);
      if (text && text !== key) el.setAttribute('alt', text);
    });
    document.documentElement.lang = BlogI18n.locale === 'en' ? 'en' : 'zh-CN';
  },

  escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  getSiteName(fallback = 'Blog') {
    return this.config?.site?.name || fallback;
  },

  setNavSiteName(elementId = 'nav-site-name', fallback = 'Blog') {
    const siteName = this.getSiteName(fallback);
    const target = document.getElementById(elementId);
    if (target) target.textContent = siteName;
    return siteName;
  },

  setPageTitle(prefix = '', options = {}) {
    const siteName = this.getSiteName(options.fallback || 'Blog');
    document.title = prefix ? `${prefix}${options.separator || ' | '}${siteName}` : siteName;
    return siteName;
  },

  applyColorScheme() {
    let mode = 'auto';
    try { mode = localStorage.getItem('blog-color-scheme') || 'auto'; } catch (_) {}
    if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-color-scheme', mode);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.content = mode === 'auto' ? 'light dark' : mode;
  },

  applyCodeWrap() {
    const codeWrap = this.config?.display?.codeWrap;
    if (codeWrap) document.body.classList.add('code-wrap');
    else document.body.classList.remove('code-wrap');
  },

  loadComments() {
    const container = document.getElementById('comments');
    if (!container) return;
    const comments = this.config?.comments;
    if (!comments || !comments.enabled) return;
    const provider = comments.provider || 'giscus';
    if (provider === 'giscus') {
      const g = comments.giscus || {};
      if (!g.repo || !g.repoId || !g.categoryId) { console.warn('Giscus comments: repo, repoId, and categoryId are required.'); return; }
      const theme = document.documentElement.getAttribute('data-theme') || 'auto';
      const giscusTheme = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'preferred_color_scheme';
      const script = document.createElement('script');
      script.src = 'https://giscus.app/client.js';
      script.setAttribute('data-repo', g.repo);
      script.setAttribute('data-repo-id', g.repoId);
      script.setAttribute('data-category', g.category || '');
      script.setAttribute('data-category-id', g.categoryId);
      script.setAttribute('data-mapping', g.mapping || 'pathname');
      script.setAttribute('data-strict', '0');
      script.setAttribute('data-reactions-enabled', g.reactionsEnabled !== false ? '1' : '0');
      script.setAttribute('data-emit-metadata', g.emitMetadata ? '1' : '0');
      script.setAttribute('data-input-position', 'bottom');
      script.setAttribute('data-theme', giscusTheme);
      script.setAttribute('data-lang', BlogI18n?.locale === 'en' ? 'en' : 'zh-CN');
      script.setAttribute('data-loading', 'lazy');
      script.crossOrigin = 'anonymous';
      script.async = true;
      container.style.display = 'block';
      container.appendChild(script);
      const observer = new MutationObserver(() => {
        const frame = container.querySelector('iframe');
        if (!frame) return;
        const newTheme = document.documentElement.getAttribute('data-theme') || 'auto';
        const newGiscusTheme = newTheme === 'dark' ? 'dark' : newTheme === 'light' ? 'light' : 'preferred_color_scheme';
        frame.contentWindow.postMessage({ giscus: { setConfig: { theme: newGiscusTheme } } }, 'https://giscus.app');
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }
  }
};
