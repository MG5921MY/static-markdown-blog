/**
 * 米椒小屋 - 静态博客引擎
 * - 主题系统支持
 * - 配置驱动
 * - 安全加固
 */

const Blog = {
  config: null,
  index: null,
  pathMap: null,
  posts: [],
  themeLoaded: false,

  /**
   * 初始化
   */
  async init() {
    try {
      const [config, index, pathMap] = await Promise.all([
        this.loadJson('./site-config.json'),
        this.loadJson('./posts/index.json'),
        this.loadJson('./posts/_pathmap.json')
      ]);
      
      this.config = config;
      this.index = index;
      this.pathMap = pathMap;
      
      // 加载主题
      await this.loadTheme();
      
      // 渲染备案信息
      this.renderBeian();
      
      // 设置网站图标
      this.setFavicon();
      
      // 设置导航栏 Logo
      this.setNavLogo();
      
      return true;
    } catch (error) {
      console.error('Blog init failed:', error);
      return false;
    }
  },

  /**
   * 加载 JSON
   */
  async loadJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    return response.json();
  },

  /**
   * 加载主题样式
   */
  async loadTheme() {
    if (this.themeLoaded) return;
    
    let themeName = this.config?.theme?.active || 'default';
    
    // 验证主题名称安全性
    if (!this.isValidId(themeName)) {
      console.warn('Invalid theme name, fallback to default');
      themeName = 'default';
    }
    
    // 检查主题是否存在，不存在则回退到 default
    const availableThemes = this.config?.theme?.available || [];
    const themeExists = availableThemes.some(t => t.id === themeName);
    if (!themeExists && availableThemes.length > 0) {
      console.warn(`Theme "${themeName}" not found, fallback to default`);
      themeName = availableThemes.find(t => t.id === 'default') ? 'default' : availableThemes[0].id;
    }
    
    const themePath = `./usr/themes/${themeName}/style.css`;
    
    // 移除旧的主题样式
    const oldTheme = document.getElementById('blog-theme');
    if (oldTheme) oldTheme.remove();
    
    // 加载新主题
    const link = document.createElement('link');
    link.id = 'blog-theme';
    link.rel = 'stylesheet';
    link.href = themePath;
    document.head.appendChild(link);
    
    this.themeLoaded = true;
  },

  /**
   * 设置网站图标
   */
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

  /**
   * 设置导航栏 Logo
   */
  setNavLogo() {
    const logo = this.config?.site?.logo;
    if (!logo) return;
    
    const navLogo = document.querySelector('.nav-logo');
    if (!navLogo) return;
    
    // 将 div 替换为 img
    const img = document.createElement('img');
    img.src = logo;
    img.alt = this.config?.site?.name || 'Logo';
    img.className = 'nav-logo';
    navLogo.parentNode.replaceChild(img, navLogo);
  },

  /**
   * 验证 URL 安全性
   */
  isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase().trim();
    if (/^(javascript|data|vbscript):/i.test(lower)) return false;
    return true;
  },

  /**
   * 渲染备案信息
   */
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
      if (beian.aliasName) {
        nameLine += `（${this.escapeHtml(beian.aliasName)}）`;
      }
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

  /**
   * 获取所有文章
   */
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

  /**
   * 验证 ID 格式
   */
  isValidId(id) {
    if (!id || typeof id !== 'string') return false;
    return /^[a-zA-Z0-9_-]+$/.test(id);
  },

  /**
   * 获取文章路径
   */
  getPostPath(postId) {
    if (!this.isValidId(postId)) return null;
    
    const mapping = this.pathMap[postId];
    if (!mapping) return null;
    
    if (this.isPathDangerous(mapping.file)) return null;
    if (!this.isValidId(mapping.category)) return null;
    
    return mapping;
  },

  /**
   * 检查路径是否危险
   */
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

  /**
   * 加载文章内容
   */
  async loadPostContent(postId) {
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
    const postInfo = categoryData.posts.find(p => p.id === postId);

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

  /**
   * 解析 Front Matter
   */
  parseFrontMatter(content) {
    if (!content || typeof content !== 'string') {
      return { meta: {}, body: '' };
    }
    
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    
    if (match) {
      const meta = {};
      const lines = match[1].split('\n');
      
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          let value = line.slice(colonIndex + 1).trim();
          
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) continue;
          
          if (value.startsWith('[') && value.endsWith(']')) {
            value = value.slice(1, -1).split(',').map(s => s.trim());
          }
          
          meta[key] = value;
        }
      }
      
      return { meta, body: content.slice(match[0].length).trim() };
    }
    
    return { meta: {}, body: content };
  },

  /**
   * 渲染 Markdown
   */
  renderMarkdown(content) {
    if (!content) return '';
    
    let html = '';
    
    if (typeof marked !== 'undefined') {
      marked.setOptions({ breaks: true, gfm: true });
      
      if (typeof hljs !== 'undefined') {
        marked.setOptions({
          highlight: (code, lang) => {
            if (lang && hljs.getLanguage(lang)) {
              try { return hljs.highlight(code, { language: lang }).value; } catch (e) {}
            }
            return Blog.escapeHtml(code);
          }
        });
      }
      
      html = marked.parse(content);
    } else {
      html = this.escapeHtml(content)
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/\n/g, '<br>');
    }
    
    if (typeof DOMPurify !== 'undefined') {
      html = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','hr','ul','ol','li',
          'blockquote','pre','code','em','strong','a','img','table','thead','tbody',
          'tr','th','td','span','div'],
        ALLOWED_ATTR: ['href','src','alt','title','class','id','target','rel'],
        ALLOW_DATA_ATTR: false
      });
    }
    
    return html;
  },

  /**
   * 格式化日期
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return this.escapeHtml(String(dateStr));
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  },

  /**
   * 生成文章卡片
   */
  renderPostCard(post) {
    if (!post || !this.isValidId(post.id)) return '';
    
    const tagsHtml = (post.tags || []).map(tag => 
      `<span class="post-tag">${this.escapeHtml(tag)}</span>`
    ).join('');

    return `
      <article class="post-card" data-category="${this.escapeHtml(post.category || '')}">
        <div class="post-card-header">
          <span class="post-category">${this.escapeHtml(post.categoryIcon || '')} ${this.escapeHtml(post.categoryName || '')}</span>
          <span class="post-date">${this.formatDate(post.date)}</span>
        </div>
        <h3 class="post-title">${this.escapeHtml(post.title)}</h3>
        <p class="post-summary">${this.escapeHtml(post.summary || '')}</p>
        <div class="post-tags">${tagsHtml}</div>
        <a href="./post.html?id=${this.escapeHtml(post.id)}" class="post-link">阅读全文 →</a>
      </article>
    `;
  },

  /**
   * 构建目录树结构
   */
  buildDirTree(categoryId) {
    const category = this.index?.categories?.[categoryId];
    if (!category || category.type !== 'tree') return null;
    
    const groups = category.groups || {};
    const tree = { children: {}, posts: [] };
    
    // 根目录文章
    const rootPosts = (category.posts || []).filter(p => !p.groupPath);
    tree.posts = rootPosts;
    
    // 构建树结构
    for (const [groupPath, groupData] of Object.entries(groups)) {
      const parts = groupPath.split('/');
      let current = tree;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!current.children[part]) {
          current.children[part] = { 
            children: {}, 
            posts: [],
            path: parts.slice(0, i + 1).join('/'),
            name: part
          };
        }
        current = current.children[part];
      }
      current.posts = groupData.posts || [];
    }
    
    return tree;
  },

  /**
   * 获取当前路径的子目录和文章
   */
  getPathContent(categoryId, currentPath = '') {
    const category = this.index?.categories?.[categoryId];
    if (!category) return { subDirs: [], posts: [], parentPath: null };
    
    const tree = this.buildDirTree(categoryId);
    if (!tree) return { subDirs: [], posts: [], parentPath: null };
    
    let node = tree;
    let parentPath = null;
    
    if (currentPath) {
      const parts = currentPath.split('/');
      parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
      
      for (const part of parts) {
        if (node.children[part]) {
          node = node.children[part];
        } else {
          return { subDirs: [], posts: [], parentPath };
        }
      }
    }
    
    const subDirs = Object.entries(node.children).map(([name, data]) => ({
      name,
      path: data.path,
      postCount: this.countPostsInTree(data)
    }));
    
    return { 
      subDirs, 
      posts: node.posts || [], 
      parentPath,
      currentName: currentPath ? currentPath.split('/').pop() : '根目录'
    };
  },

  /**
   * 统计目录树中的文章数
   */
  countPostsInTree(node) {
    let count = (node.posts || []).length;
    for (const child of Object.values(node.children || {})) {
      count += this.countPostsInTree(child);
    }
    return count;
  },

  /**
   * 渲染目录导航栏（只显示当前层级）
   */
  renderDirNav(categoryId, currentPath = '') {
    const { subDirs, parentPath, currentName } = this.getPathContent(categoryId, currentPath);
    
    let html = '<div class="dir-nav">';
    
    // 返回上级按钮
    if (currentPath) {
      html += `<button class="dir-nav-btn dir-nav-back" data-path="${this.escapeHtml(parentPath || '')}">
        <span class="dir-nav-icon">⬅️</span>
        <span>返回上级</span>
      </button>`;
      html += `<span class="dir-nav-current">📂 ${this.escapeHtml(currentName)}</span>`;
    } else {
      html += `<span class="dir-nav-current">📄 根目录</span>`;
    }
    
    // 子目录按钮
    if (subDirs.length > 0) {
      html += '<div class="dir-nav-children">';
      for (const dir of subDirs) {
        html += `<button class="dir-nav-btn" data-path="${this.escapeHtml(dir.path)}">
          <span class="dir-nav-icon">📁</span>
          <span>${this.escapeHtml(dir.name)}</span>
          <span class="dir-nav-count">${dir.postCount}</span>
        </button>`;
      }
      html += '</div>';
    }
    
    // 目录树按钮
    html += `<button class="dir-tree-toggle" title="显示目录树">🗂️</button>`;
    
    html += '</div>';
    return html;
  },

  /**
   * 渲染完整目录树（侧边面板）
   */
  renderDirTreePanel(categoryId, currentPath = '') {
    const category = this.index?.categories?.[categoryId];
    if (!category) return '';
    
    const tree = this.buildDirTree(categoryId);
    if (!tree) return '';
    
    const renderNode = (node, path = '', depth = 0) => {
      let html = '';
      const isActive = path === currentPath;
      const isRoot = path === '';
      
      // 当前节点
      const postCount = (node.posts || []).length;
      const totalCount = this.countPostsInTree(node);
      const hasChildren = Object.keys(node.children).length > 0;
      const indent = depth * 16;
      
      html += `<div class="tree-item ${isActive ? 'active' : ''}" style="padding-left: ${indent}px" data-path="${this.escapeHtml(path)}">
        <span class="tree-icon">${isRoot ? '🏠' : (hasChildren ? '📂' : '📁')}</span>
        <span class="tree-name">${this.escapeHtml(node.name || '根目录')}</span>
        <span class="tree-count">${postCount}${hasChildren ? ` / ${totalCount}` : ''}</span>
      </div>`;
      
      // 子节点
      for (const [name, child] of Object.entries(node.children)) {
        html += renderNode(child, child.path, depth + 1);
      }
      
      return html;
    };
    
    return `
      <div class="dir-tree-panel" style="display: none;">
        <div class="dir-tree-header">
          <span>📑 目录结构</span>
          <button class="dir-tree-close">✕</button>
        </div>
        <div class="dir-tree-content">
          ${renderNode(tree)}
        </div>
      </div>
    `;
  },

  /**
   * 渲染分类内容（支持 flat/tree 模式，多层级）
   */
  renderCategoryContent(categoryId, currentPath = '') {
    const category = this.index?.categories?.[categoryId];
    if (!category) return { html: '', type: 'flat' };
    
    const type = category.type || 'flat';
    
    if (type === 'tree') {
      const { posts } = this.getPathContent(categoryId, currentPath);
      
      const html = posts.map(p => this.renderPostCard({
        ...p,
        category: categoryId,
        categoryName: category.name,
        categoryIcon: category.icon
      })).join('');
      
      return { 
        html, 
        type: 'tree', 
        dirNav: this.renderDirNav(categoryId, currentPath),
        dirTreePanel: this.renderDirTreePanel(categoryId, currentPath)
      };
    }
    
    // flat 模式
    const html = (category.posts || []).map(post => {
      return this.renderPostCard({
        ...post,
        category: categoryId,
        categoryName: category.name,
        categoryIcon: category.icon
      });
    }).join('');
    
    return { html, type: 'flat' };
  },

  /**
   * 生成分类筛选器
   */
  renderCategoryFilter() {
    let html = '<button class="filter-btn active" data-category="all">全部</button>';
    
    if (!this.index?.categories) return html;
    
    for (const [id, data] of Object.entries(this.index.categories)) {
      if (!this.isValidId(id)) continue;
      const count = (data.posts || []).length;
      html += `<button class="filter-btn" data-category="${this.escapeHtml(id)}">${this.escapeHtml(data.icon || '')} ${this.escapeHtml(data.name)} (${count})</button>`;
    }
    
    return html;
  },

  /**
   * 转义 HTML
   */
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

  /**
   * 获取 URL 参数
   */
  getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(name);
    // 页面 ID 允许字母、数字、下划线、连字符
    if (value && !/^[a-zA-Z0-9_-]+$/.test(value)) return null;
    return value;
  },

  /**
   * 获取站点配置
   */
  getSiteConfig() {
    return this.config?.site || {};
  },

  /**
   * 获取主题配置
   */
  getThemeConfig() {
    return this.config?.theme?.config || {};
  },

  /**
   * 渲染导航栏链接
   */
  renderNavLinks() {
    const navEl = document.getElementById('nav-links');
    const footerEl = document.getElementById('footer-links');
    const nav = this.config?.nav || [];
    
    if (!nav.length) return;
    
    const currentUrl = window.location.pathname.split('/').pop() + window.location.search;
    
    // 验证 URL 安全性
    const isSafeUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      const lower = url.toLowerCase().trim();
      // 禁止 javascript:, data:, vbscript: 等危险协议
      if (/^(javascript|data|vbscript):/i.test(lower)) return false;
      return true;
    };
    
    const linksHtml = nav.filter(item => isSafeUrl(item.url)).map(item => {
      const isActive = currentUrl.includes(item.url.replace('./', ''));
      return `<a href="${this.escapeHtml(item.url)}" class="nav-link${isActive ? ' active' : ''}">${this.escapeHtml(item.name)}</a>`;
    }).join('');
    
    const footerHtml = nav.filter(item => isSafeUrl(item.url)).map(item => 
      `<a href="${this.escapeHtml(item.url)}" class="footer-link">${this.escapeHtml(item.name)}</a>`
    ).join('');
    
    if (navEl) navEl.innerHTML = linksHtml;
    if (footerEl) footerEl.innerHTML = footerHtml;
  },

  /**
   * 获取页面数据
   */
  getPage(pageId) {
    return this.config?.pages?.[pageId] || null;
  }
};


window.Blog = Blog;
