window.BlogCore = {
  async init(options = {}) {
    const { needIndex = true, needPathMap = false } = options;
    try {
      const [config, index, pathMap] = await Promise.all([
        this.config ? Promise.resolve(this.config) : this.loadJson('./site-config.json'),
        needIndex
          ? (this.index ? Promise.resolve(this.index) : this.loadJson('./posts/index.json'))
          : Promise.resolve(this.index),
        needPathMap
          ? (this.pathMap ? Promise.resolve(this.pathMap) : this.loadJson('./posts/_pathmap.json'))
          : Promise.resolve(this.pathMap)
      ]);

      this.config = config;
      if (needIndex) this.index = index || null;
      if (needPathMap) this.pathMap = pathMap || null;

      await this.loadTheme();
      this.renderBeian();
      this.setFavicon();
      this.setNavLogo();
      return true;
    } catch (error) {
      console.error('Blog init failed:', error);
      return false;
    }
  },

  async loadJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    return response.json();
  },

  async ensureIndexLoaded() {
    if (this.index) return this.index;
    this.index = await this.loadJson('./posts/index.json');
    return this.index;
  },

  async ensurePathMapLoaded() {
    if (this.pathMap) return this.pathMap;
    this.pathMap = await this.loadJson('./posts/_pathmap.json');
    return this.pathMap;
  },

  async loadTheme() {
    if (this.themeLoaded) return;

    let themeName = this.config?.theme?.active || 'default';
    if (!this.isValidId(themeName)) themeName = 'default';

    const availableThemes = this.config?.theme?.available || [];
    if (!availableThemes.some((t) => t.id === themeName)) {
      themeName = availableThemes.find((t) => t.id === 'default')
        ? 'default'
        : (availableThemes[0]?.id || 'default');
    }

    const themePath = `./usr/themes/${themeName}/style.css`;

    return new Promise((resolve) => {
      const oldTheme = document.getElementById('blog-theme');
      if (oldTheme) oldTheme.remove();

      const link = document.createElement('link');
      link.id = 'blog-theme';
      link.rel = 'stylesheet';
      link.href = themePath;
      link.onload = () => {
        document.body.classList.add('theme-loaded');
        resolve();
      };
      link.onerror = () => resolve();
      document.head.appendChild(link);
      this.themeLoaded = true;
    });
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
    link.href = favicon;
  },

  setNavLogo() {
    const logo = this.config?.site?.logo;
    const navLogo = document.querySelector('.nav-logo');
    if (!logo || !navLogo) return;

    const img = document.createElement('img');
    img.src = logo;
    img.alt = this.config?.site?.name || 'Logo';
    img.className = 'nav-logo';
    img.onerror = () => { img.style.display = 'none'; };
    navLogo.parentNode.replaceChild(img, navLogo);
  },

  isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase().trim();
    if (/^(javascript|data|vbscript):/i.test(lower)) return false;
    return true;
  },

  renderBeian() {
    const container = document.getElementById('beian-footer');
    if (!container) return;

    const beian = this.config?.beian;
    if (!beian || !beian.enabled) {
      container.innerHTML = '';
      return;
    }

    const lines = [];
    if (beian.displayName) {
      let nameLine = `网站名称：${this.escapeHtml(beian.displayName)}`;
      if (beian.aliasName) nameLine += `（${this.escapeHtml(beian.aliasName)}）`;
      lines.push(`<div>${nameLine}</div>`);
    }

    if (beian.icp?.enabled) {
      const icpText = beian.icp.number ? this.escapeHtml(beian.icp.number) : '备案中';
      const icpUrl = this.isSafeUrl(beian.icp.url) ? beian.icp.url : 'https://beian.miit.gov.cn/';
      lines.push(`<div>ICP备案：<a href="${this.escapeHtml(icpUrl)}" target="_blank" rel="noopener noreferrer">${icpText}</a></div>`);
    }

    if (beian.police?.enabled) {
      if (beian.police.number && this.isSafeUrl(beian.police.url)) {
        lines.push(`<div>公安备案：<a href="${this.escapeHtml(beian.police.url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(beian.police.number)}</a></div>`);
      } else if (beian.police.statusText) {
        lines.push(`<div>公安备案：${this.escapeHtml(beian.police.statusText)}</div>`);
      }
    }

    const year = beian.year || new Date().getFullYear();
    const name = beian.displayName || '';
    lines.push(`<div>Copyright © ${year} ${this.escapeHtml(name)}</div>`);
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

    posts.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    this.posts = posts;
    return posts;
  },

  isValidId(id) {
    if (!id || typeof id !== 'string') return false;
    return /^[a-zA-Z0-9_-]+$/.test(id);
  },

  getPostPath(postId) {
    if (!this.isValidId(postId)) return null;
    if (!this.pathMap) return null;

    const mapping = this.pathMap[postId];
    if (!mapping) return null;

    if (this.isPathDangerous(mapping.file)) return null;
    if (!this.isValidId(mapping.category)) return null;
    return mapping;
  },

  isPathDangerous(filePath) {
    if (!filePath || typeof filePath !== 'string') return true;
    if (filePath.includes('..')) return true;
    if (filePath.includes('%2e') || filePath.includes('%2E')) return true;
    if (filePath.startsWith('/') || /^[a-zA-Z]:/.test(filePath)) return true;
    if (filePath.includes('\\') || filePath.includes('%5c') || filePath.includes('%5C')) return true;
    if (/[<>:"|?*\x00-\x1f]/.test(filePath)) return true;
    if (filePath.startsWith('.') || filePath.includes('/.')) return true;
    if (!filePath.endsWith('.md')) return true;
    if (filePath.length > 200) return true;
    return false;
  },

  async loadPostContent(postId) {
    await Promise.all([this.ensureIndexLoaded(), this.ensurePathMapLoaded()]);
    const mapping = this.getPostPath(postId);
    if (!mapping) throw new Error('文章不存在');

    const categoryData = this.index.categories[mapping.category];
    if (!categoryData) throw new Error('分类不存在');
    const allowedCategories = Object.keys(this.index.categories);
    if (!allowedCategories.includes(mapping.category)) {
      throw new Error('无效的分类');
    }

    const fullPath = `./posts/${mapping.category}/${mapping.file}`;
    const response = await fetch(fullPath);
    if (!response.ok) throw new Error('文章加载失败');

    const content = await response.text();
    const { meta, body } = this.parseFrontMatter(content);
    const postInfo = categoryData.posts.find((p) => p.id === postId);

    return {
      id: postId,
      category: mapping.category,
      categoryName: categoryData.name,
      categoryIcon: categoryData.icon,
      title: meta.title || postInfo?.title || '无标题',
      date: meta.date || postInfo?.date,
      tags: meta.tags || postInfo?.tags || [],
      content: body
    };
  },

  parseFrontMatter(content) {
    if (!content || typeof content !== 'string') return { meta: {}, body: '' };

    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return { meta: {}, body: content };

    const meta = {};
    const lines = match[1].split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex <= 0) continue;
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) continue;
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map((s) => s.trim());
      }
      meta[key] = value;
    }

    return { meta, body: content.slice(match[0].length).trim() };
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return this.escapeHtml(String(dateStr));
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
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
    return this.config?.theme?.config || {};
  },

  loadCDN(url) {
    if (this._cdnLoaded[url]) return this._cdnLoaded[url];
    this._cdnLoaded[url] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return this._cdnLoaded[url];
  },

  async loadMarkdownDeps() {
    const deps = [
      'https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js',
      'https://cdn.jsdelivr.net/npm/marked@12/marked.min.js'
    ];
    await Promise.all(deps.map((d) => this.loadCDN(d)));
  },

  async loadHighlightDeps() {
    await this.loadCDN('https://cdn.jsdelivr.net/npm/highlight.js@11/lib/core.min.js');
    const langs = ['javascript', 'bash', 'yaml', 'json', 'python', 'css', 'xml'];
    await Promise.all(langs.map((l) => this.loadCDN(`https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/${l}.min.js`)));
  },

  showPageError(loadingEl, errorEl, errorDetailEl, message) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorDetailEl) errorDetailEl.textContent = message || '加载失败';
    if (errorEl) errorEl.style.display = 'block';
  },

  getSiteName(fallback = '博客') {
    return this.config?.site?.name || fallback;
  },

  setNavSiteName(elementId = 'nav-site-name', fallback = '博客') {
    const siteName = this.getSiteName(fallback);
    const el = document.getElementById(elementId);
    if (el) el.textContent = siteName;
    return siteName;
  },

  setPageTitle(prefix = '', options = {}) {
    const { separator = ' | ', fallback = '博客' } = options;
    const siteName = this.getSiteName(fallback);
    document.title = prefix ? `${prefix}${separator}${siteName}` : siteName;
    return siteName;
  },

  renderState(targetEl, message, icon = '') {
    if (!targetEl) return;
    const safeMessage = this.escapeHtml(message || '加载失败');
    const safeIcon = icon ? `<div class="icon">${this.escapeHtml(icon)}</div>` : '';
    targetEl.innerHTML = `<div class="empty-state">${safeIcon}<p>${safeMessage}</p></div>`;
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
      if (!success) throw new Error('初始化失败，请运行 node build.js');

      this.renderNavLinks();
      this.setupCommonFeatures();

      if (typeof task === 'function') {
        await task();
      }

      return true;
    } catch (error) {
      console.error('Page bootstrap failed:', error);
      this.showPageError(loadingEl, errorEl, errorDetailEl, error.message);
      return false;
    }
  },

  getPage(pageId) {
    return this.config?.pages?.[pageId] || null;
  }
};
