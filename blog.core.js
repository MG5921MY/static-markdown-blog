window.BlogCore = {
  async init(options = {}) {
    const { needIndex = true, needPathMap = false } = options;

    try {
      const [config, index, pathMap] = await Promise.all([
        this.config ? Promise.resolve(this.config) : this.loadJson(['./site-config.json']),
        needIndex
          ? (this.index ? Promise.resolve(this.index) : this.loadJson(['./content-index.json', './posts/index.json']))
          : Promise.resolve(this.index),
        needPathMap
          ? (this.pathMap ? Promise.resolve(this.pathMap) : this.loadJson(['./pathmap.json', './posts/_pathmap.json']))
          : Promise.resolve(this.pathMap)
      ]);

      this.config = config || {};
      if (needIndex) this.index = index || null;
      if (needPathMap) this.pathMap = pathMap || null;

      // Load i18n if available
      if (window.BlogI18n) {
        const configuredLocale = this.config?.site?.locale;
        await BlogI18n.load(configuredLocale);
      }

      // Apply i18n to DOM and saved color scheme
      this.applyI18n();
      this.applyColorScheme();

      await this.loadTheme();
      this.renderBeian();
      this.setFavicon();
      this.setNavLogo();
      this.onInit();
      return true;
    } catch (error) {
      console.error('Blog init failed:', error);
      return false;
    }
  },

  async loadJson(urls) {
    const candidates = Array.isArray(urls) ? urls : [urls];
    let lastError = null;

    for (const candidate of candidates) {
      try {
        const response = await fetch(this.resolveAsset(candidate));
        if (!response.ok) throw new Error(`Failed to load ${candidate}`);
        return await response.json();
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Failed to load JSON');
  },

  resolveBasePath() {
    const explicitBase = String(window.BLOG_BASE_PATH || '').trim();
    const metaBase = String(document.querySelector('meta[name="blog-base"]')?.content || '').trim();
    const configuredBase = String(this.config?.deployment?.basePath || '').trim();
    const candidate = explicitBase || metaBase || configuredBase;

    if (candidate && candidate !== 'auto') {
      return candidate.endsWith('/') ? candidate : `${candidate}/`;
    }

    const currentUrl = new URL(document.baseURI || window.location.href);
    const basePath = currentUrl.pathname.endsWith('/')
      ? currentUrl.pathname
      : currentUrl.pathname.replace(/[^/]+$/, '');

    return basePath || '/';
  },

  resolveAsset(assetPath = '') {
    if (!assetPath) return '';
    const text = String(assetPath).trim();
    if (/^(https?:|data:|blob:)/i.test(text)) return text;

    const normalized = text.replace(/^\.\//, '');
    return new URL(normalized, document.baseURI || window.location.href).toString();
  },

  resolvePageUrl(page, params = {}) {
    const target = new URL(page, document.baseURI || window.location.href);

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      target.searchParams.set(key, value);
    });

    const query = target.search ? target.search : '';
    return `./${target.pathname.split('/').pop()}${query}`;
  },

  async loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.resolveAsset(url);
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  async ensureIndexLoaded() {
    if (this.index) return this.index;
    this.index = await this.loadJson(['./content-index.json', './posts/index.json']);
    return this.index;
  },

  async ensurePathMapLoaded() {
    if (this.pathMap) return this.pathMap;
    this.pathMap = await this.loadJson(['./pathmap.json', './posts/_pathmap.json']);
    return this.pathMap;
  },

  async loadTheme() {
    if (this.themeLoaded) return;

    const availableThemes = this.config?.theme?.available || [];
    let themeName = this.config?.theme?.active || availableThemes[0]?.id || 'graphite';
    if (!this.isValidId(themeName)) themeName = availableThemes[0]?.id || 'graphite';
    if (!availableThemes.some((item) => item.id === themeName)) themeName = availableThemes[0]?.id || 'graphite';

    const themeMeta = availableThemes.find((item) => item.id === themeName);
    const themeHref = themeMeta?.path
      ? this.resolveAsset(`${themeMeta.path}/theme.css`)
      : this.resolveAsset(`themes/${themeName}/theme.css`);

    await new Promise((resolve) => {
      const oldTheme = document.getElementById('blog-theme');
      if (oldTheme) oldTheme.remove();

      const link = document.createElement('link');
      link.id = 'blog-theme';
      link.rel = 'stylesheet';
      link.href = themeHref;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
    });

    document.body.dataset.theme = themeName;
    document.body.classList.add('theme-loaded');
    this.themeLoaded = true;

    const themeJsPath = themeMeta?.path
      ? `${themeMeta.path}/theme.js`
      : `themes/${themeName}/theme.js`;

    try {
      const response = await fetch(this.resolveAsset(themeJsPath));
      if (response.ok) {
        const jsCode = await response.text();
        const script = document.createElement('script');
        script.textContent = jsCode;
        script.setAttribute('data-theme-script', themeName);
        document.head.appendChild(script);
      }
    } catch (_) {}

    // Load theme template partials
    const themeBase = themeMeta?.path || `themes/${themeName}`;
    await this.applyThemeTemplates(themeBase);
  },

  async applyThemeTemplates(themeBase) {
    const templateNames = ['hero', 'footer', 'post-card'];
    for (const name of templateNames) {
      const target = document.querySelector(`[data-template="${name}"]`);
      if (!target) continue;
      try {
        const url = this.resolveAsset(`${themeBase}/templates/${name}.html`);
        const response = await fetch(url);
        if (response.ok) {
          const html = await response.text();
          if (html.trim()) target.innerHTML = html;
        }
      } catch (_) { /* template not found, use default */ }
    }
  },

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
    img.onerror = () => {
      img.style.display = 'none';
    };
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
    if (!beian?.enabled) {
      container.innerHTML = '';
      return;
    }

    const lines = [];
    if (beian.displayName) lines.push(`<div>${this.escapeHtml(beian.displayName)}</div>`);

    if (beian.icp?.enabled && this.isSafeUrl(beian.icp.url)) {
      lines.push(
        `<div><a href="${this.escapeHtml(beian.icp.url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(beian.icp.number || 'ICP')}</a></div>`
      );
    }

    if (beian.police?.enabled) {
      if (beian.police.number && this.isSafeUrl(beian.police.url)) {
        lines.push(
          `<div><a href="${this.escapeHtml(beian.police.url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(beian.police.number)}</a></div>`
        );
      } else if (beian.police.statusText) {
        lines.push(`<div>${this.escapeHtml(beian.police.statusText)}</div>`);
      }
    }

    container.innerHTML = lines.join('\n');
  },

  getAllPosts() {
    const posts = [];
    if (!this.index?.categories) return posts;

    for (const [categoryId, categoryData] of Object.entries(this.index.categories)) {
      if (!this.isValidId(categoryId)) continue;

      for (const post of categoryData.posts || []) {
        if (!this.isValidId(post.id)) continue;
        posts.push({
          ...post,
          category: categoryId,
          categoryName: categoryData.name,
          categoryIcon: categoryData.icon
        });
      }
    }

    posts.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    this.posts = posts;
    return posts;
  },

  isValidId(id) {
    return Boolean(id) && typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id);
  },

  getPostPath(postId) {
    if (!this.isValidId(postId) || !this.pathMap) return null;
    const mapping = this.pathMap[postId];
    if (!mapping || !this.isValidId(mapping.category)) return null;
    if (!mapping.file || this.isPathDangerous(mapping.file)) return null;
    return mapping;
  },

  isPathDangerous(filePath) {
    if (!filePath || typeof filePath !== 'string') return true;
    if (filePath.includes('..')) return true;
    if (filePath.startsWith('/') || /^[a-zA-Z]:/.test(filePath)) return true;
    if (/[<>:"|?*\x00-\x1f]/.test(filePath)) return true;
    return !/\.(md|html)$/.test(filePath);
  },

  async loadPostContent(postId) {
    // SSG hydration: check for embedded post data
    const ssgEl = document.getElementById('ssg-post-data');
    if (ssgEl) {
      try {
        const ssgData = JSON.parse(ssgEl.textContent);
        if (ssgData.id === postId) return ssgData;
      } catch (_) { /* fall through to fetch */ }
    }

    await Promise.all([this.ensureIndexLoaded(), this.ensurePathMapLoaded()]);
    const mapping = this.getPostPath(postId);
    if (!mapping) throw new Error('Post not found');

    const categoryData = this.index?.categories?.[mapping.category];
    if (!categoryData) throw new Error('Category not found');

    const outputPath = mapping.outputPath || `posts/${mapping.category}/${mapping.file}`;
    const response = await fetch(this.resolveAsset(`./${outputPath}`));
    if (!response.ok) throw new Error('Failed to load post content');

    const content = await response.text();
    const postInfo = (categoryData.posts || []).find((item) => item.id === postId);
    const isRendered = mapping.rendered === true || outputPath.endsWith('.html');

    if (isRendered) {
      return {
        id: postId,
        category: mapping.category,
        categoryName: categoryData.name,
        categoryIcon: categoryData.icon,
        title: postInfo?.title || 'Untitled',
        date: postInfo?.date || '',
        tags: postInfo?.tags || [],
        content: content,
        rendered: true,
        prev: mapping.prev || null,
        next: mapping.next || null
      };
    }

    const { meta, body } = this.parseFrontMatter(content);
    return {
      id: postId,
      category: mapping.category,
      categoryName: categoryData.name,
      categoryIcon: categoryData.icon,
      title: meta.title || postInfo?.title || 'Untitled',
      date: meta.date || postInfo?.date || '',
      tags: meta.tags || postInfo?.tags || [],
      content: body,
      rendered: false,
      prev: mapping.prev || null,
      next: mapping.next || null
    };
  },

  parseFrontMatter(content) {
    if (!content || typeof content !== 'string') return { meta: {}, body: '' };
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return { meta: {}, body: content };

    const meta = {};
    for (const line of match[1].split('\n')) {
      const index = line.indexOf(':');
      if (index <= 0) continue;
      const key = line.slice(0, index).trim();
      let value = line.slice(index + 1).trim();
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value
          .slice(1, -1)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
      meta[key] = value;
    }

    return {
      meta,
      body: content.slice(match[0].length).trim()
    };
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return this.escapeHtml(String(dateStr));
    const locale = (window.BlogI18n && BlogI18n.locale) || 'zh';
    const localeMap = { zh: 'zh-CN', en: 'en-US' };
    return date.toLocaleDateString(localeMap[locale] || 'zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  applyI18n() {
    if (!window.BlogI18n || !BlogI18n.strings || Object.keys(BlogI18n.strings).length === 0) return;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const text = BlogI18n.t(key);
      if (text && text !== key) {
        if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
          el.placeholder = text;
        } else {
          el.textContent = text;
        }
      }
    });
    // Update HTML lang attribute
    document.documentElement.lang = BlogI18n.locale === 'en' ? 'en' : 'zh-CN';
  },

  escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;');
  },

  getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(name);
    if (value && !/^[a-zA-Z0-9_-]+$/.test(value)) return null;
    return value;
  },

  getSiteConfig() {
    return this.config?.site || {};
  },

  getThemeConfig() {
    return this.config?.theme || {};
  },

  loadCDN(url, integrity) {
    if (this._cdnLoaded[url]) return this._cdnLoaded[url];
    this._cdnLoaded[url] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      if (integrity) {
        script.integrity = integrity;
        script.crossOrigin = 'anonymous';
      }
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return this._cdnLoaded[url];
  },

  async loadMarkdownDeps() {
    await Promise.all([
      this.loadCDN('https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js'),
      this.loadCDN('https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js')
    ]);
  },

  async loadHighlightDeps() {
    await this.loadCDN('https://cdn.jsdelivr.net/npm/highlight.js@11.10.0/lib/common.min.js');
    return true;
  },

  showPageError(loadingEl, errorEl, errorDetailEl, message) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorDetailEl) errorDetailEl.textContent = message || 'Failed to load page';
    if (errorEl) errorEl.style.display = 'block';
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

  renderState(targetEl, message, icon = '') {
    if (!targetEl) return;
    const safeIcon = icon ? `<div class="icon">${this.escapeHtml(icon)}</div>` : '';
    targetEl.innerHTML = `<div class="empty-state">${safeIcon}<p>${this.escapeHtml(message || 'No content')}</p></div>`;
  },

  safeCssEscape(value) {
    const text = String(value ?? '');
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(text);
    return text.replace(/["\\]/g, '\\$&');
  },

  async runPage(options = {}) {
    const {
      needIndex = true,
      needPathMap = false,
      loadingEl = null,
      errorEl = null,
      errorDetailEl = null,
      task = null
    } = options;

    try {
      const success = await this.init({ needIndex, needPathMap });
      if (!success) throw new Error('Please run node build.js first');

      this.renderNavLinks();
      this.setupCommonFeatures();
      if (typeof task === 'function') await task();
      this.setupCodeCopyButtons();
      this.onPageLoad();
      return true;
    } catch (error) {
      console.error('Page bootstrap failed:', error);
      this.showPageError(loadingEl, errorEl, errorDetailEl, error.message);
      return false;
    }
  },

  getPage(pageId) {
    return this.config?.pages?.[pageId] || null;
  },

  t(key, params) {
    if (window.BlogI18n && BlogI18n.strings && Object.keys(BlogI18n.strings).length > 0) {
      return BlogI18n.t(key, params);
    }
    return key;
  },

  applyColorScheme() {
    let mode = 'auto';
    try { mode = localStorage.getItem('blog-color-scheme') || 'auto'; } catch (_) { /* ignore */ }
    if (mode === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', mode);
    }
    document.documentElement.setAttribute('data-color-scheme', mode);

    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.content = mode === 'auto' ? 'light dark' : mode;
    }
  },

  loadComments() {
    const container = document.getElementById('comments');
    if (!container) return;

    const comments = this.config?.comments;
    if (!comments || !comments.enabled) return;

    const provider = comments.provider || 'giscus';

    if (provider === 'giscus') {
      const g = comments.giscus || {};
      if (!g.repo || !g.repoId || !g.categoryId) {
        console.warn('Giscus comments: repo, repoId, and categoryId are required.');
        return;
      }

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
      script.setAttribute('data-lang', 'zh-CN');
      script.setAttribute('data-loading', 'lazy');
      script.crossOrigin = 'anonymous';
      script.async = true;

      container.style.display = 'block';
      container.appendChild(script);

      // Update giscus theme when user toggles dark mode
      const observer = new MutationObserver(() => {
        const frame = container.querySelector('iframe');
        if (!frame) return;
        const newTheme = document.documentElement.getAttribute('data-theme') || 'auto';
        const newGiscusTheme = newTheme === 'dark' ? 'dark' : newTheme === 'light' ? 'light' : 'preferred_color_scheme';
        frame.contentWindow.postMessage({ giscus: { setConfig: { theme: newGiscusTheme } } }, 'https://giscus.app');
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    // Cusdis example (self-hosted, no GitHub required)
    // Uncomment and configure in blog.config.yml:
    // comments:
    //   enabled: true
    //   provider: cusdis
    //   cusdis:
    //     host: "https://cusdis.example.com"
    //     appId: "your-app-id"
    //
    // if (provider === 'cusdis') {
    //   const c = comments.cusdis || {};
    //   if (!c.host || !c.appId) return;
    //   const iframe = document.createElement('iframe');
    //   iframe.src = `${c.host}/iframe?appId=${c.appId}&pageUrl=${encodeURIComponent(location.href)}&pageTitle=${encodeURIComponent(document.title)}`;
    //   iframe.style.cssText = 'width:100%;border:none;min-height:300px;';
    //   container.style.display = 'block';
    //   container.appendChild(iframe);
    // }
  }
};
