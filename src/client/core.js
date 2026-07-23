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
      if (window.BlogI18n) await BlogI18n.load(this.config?.site?.locale);
      this.applyI18n();
      this.applyColorScheme();
      this.applyCodeWrap();
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
      } catch (error) { lastError = error; }
    }
    throw lastError || new Error('Failed to load JSON');
  },

  resolveBasePath() {
    const explicitBase = String(window.BLOG_BASE_PATH || '').trim();
    const metaBase = String(document.querySelector('meta[name="blog-base"]')?.content || '').trim();
    const configuredBase = String(this.config?.deployment?.basePath || '').trim();
    const candidate = explicitBase || metaBase || configuredBase;
    if (candidate && candidate !== 'auto') return candidate.endsWith('/') ? candidate : `${candidate}/`;
    const currentUrl = new URL(document.baseURI || window.location.href);
    const basePath = currentUrl.pathname.endsWith('/') ? currentUrl.pathname : currentUrl.pathname.replace(/[^/]+$/, '');
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
    let themeName = this.config?.theme?.active || 'graphite';
    if (!this.isValidId(themeName)) themeName = 'graphite';

    // Validate against available list (if populated)
    if (availableThemes.length > 0) {
      const found = availableThemes.find((t) => t.id === themeName);
      if (!found) {
        console.warn(`Theme "${themeName}" not found. Available: ${availableThemes.map(t => t.id).join(', ')}. Falling back to "${availableThemes[0].id}".`);
        themeName = availableThemes[0]?.id || 'graphite';
      }
    }

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
    const themeJsPath = themeMeta?.path ? `${themeMeta.path}/theme.js` : `themes/${themeName}/theme.js`;
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
      } catch (_) {}
    }
  },

  getAllPosts() {
    const posts = [];
    if (!this.index?.categories) return posts;
    for (const [categoryId, categoryData] of Object.entries(this.index.categories)) {
      if (!this.isValidId(categoryId)) continue;
      for (const post of categoryData.posts || []) {
        if (!this.isValidId(post.id)) continue;
        posts.push({ ...post, category: categoryId, categoryName: categoryData.name, categoryIcon: categoryData.icon });
      }
    }
    posts.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    this.posts = posts;
    return posts;
  },

  isValidId(id) { return Boolean(id) && typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id); },

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
    const ssgEl = document.getElementById('ssg-post-data');
    if (ssgEl) {
      try {
        const ssgData = JSON.parse(ssgEl.textContent);
        if (ssgData.id === postId) return ssgData;
      } catch (_) {}
    }
    await Promise.all([this.ensureIndexLoaded(), this.ensurePathMapLoaded()]);
    const mapping = this.getPostPath(postId);
    if (!mapping) throw new Error('Post not found');
    const categoryData = this.index?.categories?.[mapping.category];
    if (!categoryData) throw new Error('Category not found');

    const postInfo = (categoryData.posts || []).find((item) => item.id === postId);

    // 检查是否为加密文章
    const isEncrypted = mapping.encrypted === true;
    if (isEncrypted && window.BlogAuth) {
      const password = sessionStorage.getItem('blog-auth-pw');
      if (password) {
        try {
          const encResponse = await fetch(this.resolveAsset(`./encrypted/${postId}.json`));
          if (encResponse.ok) {
            const encData = await encResponse.json();
            const html = await BlogAuth.decryptPost(password, encData);
            return {
              id: postId, category: mapping.category, categoryName: categoryData.name, categoryIcon: categoryData.icon,
              title: postInfo?.title || 'Untitled', date: postInfo?.date || '', tags: postInfo?.tags || [],
              content: html, rendered: true, prev: mapping.prev || null, next: mapping.next || null
            };
          }
        } catch (_) {}
      }
      // 无密码或解密失败，返回空内容（auth gate 会拦截）
      return {
        id: postId, category: mapping.category, categoryName: categoryData.name, categoryIcon: categoryData.icon,
        title: postInfo?.title || 'Untitled', date: postInfo?.date || '', tags: postInfo?.tags || [],
        content: '', rendered: true, prev: mapping.prev || null, next: mapping.next || null
      };
    }

    // 非加密文章：正常加载
    const outputPath = mapping.outputPath || `posts/${mapping.category}/${mapping.file}`;
    const response = await fetch(this.resolveAsset(`./${outputPath}`));
    if (!response.ok) throw new Error('Failed to load post content');
    const content = await response.text();
    const isRendered = mapping.rendered === true || outputPath.endsWith('.html');
    if (isRendered) {
      return {
        id: postId, category: mapping.category, categoryName: categoryData.name, categoryIcon: categoryData.icon,
        title: postInfo?.title || 'Untitled', date: postInfo?.date || '', tags: postInfo?.tags || [],
        content, rendered: true, prev: mapping.prev || null, next: mapping.next || null
      };
    }
    const { meta, body } = this.parseFrontMatter(content);
    return {
      id: postId, category: mapping.category, categoryName: categoryData.name, categoryIcon: categoryData.icon,
      title: meta.title || postInfo?.title || 'Untitled', date: meta.date || postInfo?.date || '',
      tags: meta.tags || postInfo?.tags || [], content: body, rendered: false,
      prev: mapping.prev || null, next: mapping.next || null
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
        value = value.slice(1, -1).split(',').map((item) => item.trim()).filter(Boolean);
      }
      meta[key] = value;
    }
    return { meta, body: content.slice(match[0].length).trim() };
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return this.escapeHtml(String(dateStr));
    const locale = (window.BlogI18n && BlogI18n.locale) || 'zh';
    const localeMap = { zh: 'zh-CN', en: 'en-US' };
    return date.toLocaleDateString(localeMap[locale] || 'zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  },

  getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(name);
    if (value && !/^[a-zA-Z0-9_-]+$/.test(value)) return null;
    return value;
  },

  getSiteConfig() { return this.config?.site || {}; },
  getThemeConfig() { return this.config?.theme || {}; },

  loadCDN(url, integrity) {
    const key = integrity ? `${url}:${integrity}` : url;
    if (this._cdnLoaded[key]) return this._cdnLoaded[key];
    this._cdnLoaded[key] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      if (integrity) { script.integrity = integrity; script.crossOrigin = 'anonymous'; }
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return this._cdnLoaded[key];
  },

  async loadMarkdownDeps() {
    await Promise.all([
      this.loadScript('./vendor/purify.min.js'),
      this.loadScript('./vendor/marked.min.js')
    ]);
  },

  async loadHighlightDeps() {
    await this.loadScript('./vendor/hljs.min.js');
    return true;
  },

  showPageError(loadingEl, errorEl, errorDetailEl, message) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorDetailEl) errorDetailEl.textContent = message || 'Failed to load page';
    if (errorEl) errorEl.style.display = 'block';
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
    const { needIndex = true, needPathMap = false, loadingEl = null, errorEl = null, errorDetailEl = null, task = null } = options;
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
    const pages = this.config?.pages;
    if (!pages) return null;
    if (Array.isArray(pages)) return pages.find(p => p.id === pageId) || null;
    return pages[pageId] || null;
  },

  t(key, params) {
    if (window.BlogI18n && BlogI18n.strings && Object.keys(BlogI18n.strings).length > 0) return BlogI18n.t(key, params);
    return key;
  },

  onInit() {},
  onPageLoad() {},
  onThemeChange(newThemeId) {},
  _cdnLoaded: {}
};
