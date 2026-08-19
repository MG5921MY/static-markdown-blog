window.BlogUI = {
  setupMobileNav() {
    const navEl = document.querySelector('.nav');
    const navLinks = document.getElementById('nav-links');
    if (!navEl || !navLinks) return;
    if (navEl.querySelector('.nav-toggle')) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'nav-toggle';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', Blog.t ? Blog.t('ui.openMenu') : '打开菜单');
    toggleBtn.innerHTML = '<span></span><span></span><span></span>';
    navEl.appendChild(toggleBtn);

    const overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);

    const toggleMenu = () => {
      const isOpen = navLinks.classList.contains('open');
      navLinks.classList.toggle('open');
      toggleBtn.classList.toggle('active');
      overlay.classList.toggle('active');
      document.body.style.overflow = isOpen ? '' : 'hidden';
    };

    const closeMenu = () => {
      navLinks.classList.remove('open');
      toggleBtn.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    toggleBtn.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', closeMenu);
    navLinks.addEventListener('click', (event) => {
      if (event.target.classList.contains('nav-link')) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeMenu();
    });
  },

  setupBackToTop() {
    if (document.querySelector('.back-to-top')) return;

    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', Blog.t ? Blog.t('ui.backToTop') : '返回顶部');
    btn.innerHTML = '↑';
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(btn);

    const updateVisibility = () => {
      btn.classList.toggle('visible', window.scrollY > 300);
    };

    window.addEventListener('scroll', updateVisibility, { passive: true });
    updateVisibility();
  },

  setupProgressBar() {
    if (!document.querySelector('.post-article')) return;
    if (document.querySelector('.reading-progress')) return;

    const bar = document.createElement('div');
    bar.className = 'reading-progress';
    bar.innerHTML = '<div class="reading-progress-bar"></div>';
    document.body.appendChild(bar);

    const progressBar = bar.querySelector('.reading-progress-bar');
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = `${progress}%`;
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  },

  generateTOC() {
    const postBody = document.querySelector('.post-body, .markdown-body');
    if (!postBody) return;

    const headings = postBody.querySelectorAll('h2, h3');
    if (headings.length < 3) return;

    const tocContainer = document.createElement('nav');
    tocContainer.className = 'toc-container';
    tocContainer.innerHTML = `<div class="toc-header"><span>${Blog.t ? Blog.t('ui.toc') : '目录'}</span><button type="button" class="toc-toggle">${Blog.t ? Blog.t('ui.collapse') : '收起'}</button></div><div class="toc-list"></div>`;

    const tocList = tocContainer.querySelector('.toc-list');
    headings.forEach((heading, index) => {
      const id = `heading-${index}`;
      heading.id = id;

      const link = document.createElement('a');
      link.href = `#${id}`;
      link.className = `toc-link${heading.tagName === 'H3' ? ' toc-h3' : ''}`;
      link.textContent = heading.textContent;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        tocList.querySelectorAll('.toc-link').forEach((item) => item.classList.remove('active'));
        link.classList.add('active');
      });
      tocList.appendChild(link);
    });

    const toggleBtn = tocContainer.querySelector('.toc-toggle');
    toggleBtn.addEventListener('click', () => {
      tocList.classList.toggle('collapsed');
      toggleBtn.textContent = tocList.classList.contains('collapsed')
        ? (Blog.t ? Blog.t('ui.expand') : '展开')
        : (Blog.t ? Blog.t('ui.collapse') : '收起');
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          tocList.querySelectorAll('.toc-link').forEach((item) => {
            item.classList.toggle('active', item.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });

    headings.forEach((heading) => observer.observe(heading));

    const postArticle = document.querySelector('.post-article');
    if (postArticle) {
      postArticle.style.position = 'relative';
      postArticle.insertBefore(tocContainer, postArticle.querySelector('.post-body, .markdown-body'));
    }
  },

  setupDirTreePanel() {
    document.addEventListener('click', (event) => {
      const panel = document.querySelector('.dir-tree-panel');
      if (!panel || panel.style.display === 'none') return;

      if (!panel.contains(event.target) && !event.target.closest('.dir-tree-toggle')) {
        panel.style.display = 'none';
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const panel = document.querySelector('.dir-tree-panel');
      if (panel && panel.style.display !== 'none') panel.style.display = 'none';
    });
  },

  setupCardAnimations() {
    if (!('IntersectionObserver' in window)) return;
    const cards = document.querySelectorAll('.post-card, .link-card, .moment-card, .gallery-item');
    if (cards.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          entry.target.style.animationDelay = `${index * 0.04}s`;
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    cards.forEach((card) => {
      observer.observe(card);
    });
  },

  setupCommonFeatures() {
    this.setupBackToTop();
    this.setupProgressBar();
    this.setupDirTreePanel();
    this.setupThemeToggle();
    this.setupLanguageSwitch();
    this.setupAuthClearButton();
  },

  setupCodeCopyButtons() {
    document.querySelectorAll('.markdown-body pre').forEach((pre) => {
      if (pre.querySelector('.code-copy-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.textContent = Blog.t ? Blog.t('ui.copy') : 'Copy';
      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code');
        if (!code) return;
        try {
          let text = '';
          code.childNodes.forEach((node) => {
            if (node.nodeType === 3) {
              text += node.textContent;
            } else if (node.nodeType === 1 && !node.classList.contains('hljs-ln-num')) {
              text += node.textContent;
            }
          });
          await navigator.clipboard.writeText(text);
          btn.textContent = Blog.t ? Blog.t('ui.copied') : 'Copied!';
          btn.classList.add('copied');
          setTimeout(() => { btn.textContent = Blog.t ? Blog.t('ui.copy') : 'Copy'; btn.classList.remove('copied'); }, 2000);
        } catch (_) { btn.textContent = Blog.t ? Blog.t('ui.copyFailed') : 'Failed'; }
      });
      pre.style.position = 'relative';
      pre.appendChild(btn);
    });
  },

  /* ── Theme Toggle (panel: auto switch + manual light/dark) */
  _getSavedTheme() {
    try { return localStorage.getItem('blog-color-scheme') || 'auto'; } catch (_) { return 'auto'; }
  },

  _saveTheme(mode) {
    try { localStorage.setItem('blog-color-scheme', mode); } catch (_) { /* ignore */ }
  },

  _applyTheme(mode) {
    const root = document.documentElement;
    if (mode === 'auto') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', mode);
    }
    root.setAttribute('data-color-scheme', mode);

    // Update color-scheme meta for browser status bar
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      if (mode === 'auto') {
        meta.content = 'light dark';
      } else {
        meta.content = mode;
      }
    }

    // Update theme-color meta with current background
    const bg = getComputedStyle(root).getPropertyValue('--bg-primary').trim();
    if (bg) {
      let themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta');
        themeColorMeta.name = 'theme-color';
        document.head.appendChild(themeColorMeta);
      }
      themeColorMeta.content = bg;
    }
  },

  _getEffectiveIcon(mode) {
    if (mode !== 'auto') return mode === 'dark' ? '\u263E' : '\u2600'; // ☾ ☀
    // auto: show icon matching current system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? '\u263E' : '\u2600';
  },

  _updateThemeUI(mode) {
    const btn = document.querySelector('.theme-toggle-btn');
    if (btn) btn.textContent = this._getEffectiveIcon(mode);

    const autoCheck = document.querySelector('.theme-auto-check');
    if (autoCheck) autoCheck.checked = (mode === 'auto');

    const manualPanel = document.querySelector('.theme-manual-panel');
    if (manualPanel) manualPanel.classList.toggle('is-hidden', mode === 'auto');

    document.querySelectorAll('.theme-manual-btn').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.value === mode);
    });
  },

  _setTheme(mode) {
    this._saveTheme(mode);
    this._applyTheme(mode);
    this._updateThemeUI(mode);
  },

  setupThemeToggle() {
    if (document.querySelector('.theme-toggle')) return;

    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    // Container
    const wrap = document.createElement('div');
    wrap.className = 'theme-toggle';

    // Icon button
    const btn = document.createElement('button');
    btn.className = 'theme-toggle-btn';
    btn.type = 'button';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      wrap.classList.toggle('is-open');
    });

    // Dropdown panel
    const panel = document.createElement('div');
    panel.className = 'theme-toggle-panel';
    panel.innerHTML = `
      <label class="theme-toggle-row">
        <span class="theme-toggle-label">${Blog.t ? Blog.t('ui.themeAuto') : '跟随系统'}</span>
        <input type="checkbox" class="theme-auto-check">
      </label>
      <div class="theme-manual-panel">
        <button class="theme-manual-btn" data-value="light">${Blog.t ? Blog.t('ui.themeLight') : '亮色'}</button>
        <button class="theme-manual-btn" data-value="dark">${Blog.t ? Blog.t('ui.themeDark') : '暗色'}</button>
      </div>
    `;

    // Auto checkbox
    const autoCheck = panel.querySelector('.theme-auto-check');
    autoCheck.addEventListener('change', () => {
      this._setTheme(autoCheck.checked ? 'auto' : 'light');
    });

    // Manual buttons
    panel.querySelectorAll('.theme-manual-btn').forEach((el) => {
      el.addEventListener('click', () => this._setTheme(el.dataset.value));
    });

    // Close on outside click
    document.addEventListener('click', () => wrap.classList.remove('is-open'));
    panel.addEventListener('click', (e) => e.stopPropagation());

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    navLinks.appendChild(wrap);

    // Init
    const saved = this._getSavedTheme();
    this._applyTheme(saved);
    this._updateThemeUI(saved);

    // Listen for system theme changes when in auto mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this._getSavedTheme() === 'auto') this._updateThemeUI('auto');
    });
  },

  /* ── Language Switch ─────────────────────────────────── */
  setupLanguageSwitch() {
    if (document.querySelector('.lang-switch')) return;
    if (!window.BlogI18n) return;

    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    const currentLocale = BlogI18n.locale || 'zh';

    // Create dropdown wrapper
    const wrap = document.createElement('div');
    wrap.className = 'lang-switch';

    // Button shows short label (compact, never overflows)
    const btn = document.createElement('button');
    btn.className = 'lang-switch-btn';
    btn.type = 'button';
    btn.textContent = BlogI18n.meta?.shortLabel || BlogI18n.meta?.code || currentLocale;
    btn.title = BlogI18n.meta?.nativeName || currentLocale;

    // Dropdown panel
    const panel = document.createElement('div');
    panel.className = 'lang-switch-panel';

    // Populate with available locales
    const populatePanel = async () => {
      const locales = await BlogI18n.getAvailableLocales();
      panel.innerHTML = '';
      locales.forEach((loc) => {
        const opt = document.createElement('button');
        opt.className = 'lang-switch-option' + (loc.code === BlogI18n.locale ? ' active' : '');
        opt.textContent = loc.nativeName || loc.name || loc.code;
        opt.addEventListener('click', async () => {
          if (loc.code === BlogI18n.locale) { wrap.classList.remove('is-open'); return; }
          BlogI18n.setLocale(loc.code);
          // Reload page to re-render all dynamic content with new locale
          location.reload();
        });
        panel.appendChild(opt);
      });
    };
    populatePanel();

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      wrap.classList.toggle('is-open');
    });
    document.addEventListener('click', () => wrap.classList.remove('is-open'));
    panel.addEventListener('click', (e) => e.stopPropagation());

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    navLinks.appendChild(wrap);
  },

  /* ── Auth Clear Button (always visible) ──────────────── */
  setupAuthClearButton() {
    if (document.querySelector('.auth-clear-btn')) return;
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    const btn = document.createElement('button');
    btn.className = 'auth-clear-btn';
    btn.type = 'button';
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
    btn.title = (Blog.t ? Blog.t('auth.logout') : null) || '登出';
    btn.addEventListener('click', () => {
      // 清除所有认证数据
      localStorage.removeItem('blog-auth');
      sessionStorage.removeItem('blog-auth-pw');
      // 如果 auth 开启，刷新页面显示密码门
      try {
        const el = document.getElementById('auth-config');
        if (el) {
          const config = JSON.parse(el.textContent);
          if (config && config.enabled) {
            location.href = location.pathname + '?_=' + Date.now();
            return;
          }
        }
      } catch (_) {}
      // auth 未开启，只清除缓存（无需刷新）
    });
    navLinks.appendChild(btn);
  }
};
