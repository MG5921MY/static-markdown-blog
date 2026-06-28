window.BlogRender = {
  renderMarkdown(content) {
    if (!content) return '';
    let html = '';

    if (typeof marked !== 'undefined') {
      const self = this;
      const renderer = new marked.Renderer();
      renderer.code = function codeRenderer(codeBlock) {
        const code = typeof codeBlock === 'object' ? codeBlock.text : codeBlock;
        const lang = typeof codeBlock === 'object' ? codeBlock.lang : arguments[1];
        let highlighted = self.escapeHtml(code);

        if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
          try {
            highlighted = hljs.highlight(code, { language: lang }).value;
          } catch (error) {
            highlighted = self.escapeHtml(code);
          }
        }

        return `<pre><code class="hljs${lang ? ` language-${lang}` : ''}">${highlighted}</code></pre>`;
      };

      marked.setOptions({ breaks: true, gfm: true, renderer });
      html = marked.parse(content);
    } else {
      html = this.escapeHtml(content)
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    }

    if (typeof DOMPurify !== 'undefined') {
      html = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'em', 'strong', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'],
        ALLOW_DATA_ATTR: false
      });
    }

    return html;
  },

  renderPostCard(post) {
    if (!post || !this.isValidId(post.id)) return '';
    const tagsHtml = (post.tags || []).map((tag) => `<span class="post-tag">${this.escapeHtml(tag)}</span>`).join('');
    const postUrl = this.resolvePageUrl('post.html', { id: post.id });

    return `
      <article class="post-card" data-category="${this.escapeHtml(post.category || '')}">
        <div class="post-card-header">
          <span class="post-category">${this.escapeHtml(post.categoryIcon || '')} ${this.escapeHtml(post.categoryName || '')}</span>
          <span class="post-date">${this.formatDate(post.date)}</span>
        </div>
        <h3 class="post-card-title">${this.escapeHtml(post.title)}</h3>
        <p class="post-summary">${this.escapeHtml(post.summary || '')}</p>
        <div class="post-tags">${tagsHtml}</div>
        <a href="${this.escapeHtml(postUrl)}" class="post-link">阅读全文</a>
      </article>
    `;
  },

  buildDirTree(categoryId) {
    const category = this.index?.categories?.[categoryId];
    if (!category || category.type !== 'tree') return null;

    const groups = category.groups || {};
    const tree = { children: {}, posts: (category.posts || []).filter((item) => !item.groupPath) };
    for (const [groupPath, groupData] of Object.entries(groups)) {
      const parts = groupPath.split('/');
      let current = tree;
      for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i];
        if (!current.children[part]) {
          current.children[part] = { children: {}, posts: [], path: parts.slice(0, i + 1).join('/'), name: part };
        }
        current = current.children[part];
      }
      current.posts = groupData.posts || [];
    }
    return tree;
  },

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
        if (!node.children[part]) return { subDirs: [], posts: [], parentPath };
        node = node.children[part];
      }
    }

    return {
      subDirs: Object.entries(node.children).map(([name, data]) => ({
        name,
        path: data.path,
        postCount: this.countPostsInTree(data)
      })),
      posts: node.posts || [],
      parentPath,
      currentName: currentPath ? currentPath.split('/').pop() : 'root'
    };
  },

  countPostsInTree(node) {
    let count = (node.posts || []).length;
    for (const child of Object.values(node.children || {})) count += this.countPostsInTree(child);
    return count;
  },

  renderDirNav(categoryId, currentPath = '') {
    const { subDirs, parentPath, currentName } = this.getPathContent(categoryId, currentPath);
    let html = '<div class="dir-nav">';

    if (currentPath) {
      html += `<button class="dir-nav-btn dir-nav-back" data-path="${this.escapeHtml(parentPath || '')}">${this.t ? this.t('ui.backToParent') : '返回上一级'}</button>`;
      html += `<span class="dir-nav-current">${this.escapeHtml(currentName)}</span>`;
    } else {
      html += `<span class="dir-nav-current">${this.t ? this.t('ui.rootDir') : '根目录'}</span>`;
    }

    if (subDirs.length > 0) {
      html += '<div class="dir-nav-children">';
      for (const dir of subDirs) {
        html += `<button class="dir-nav-btn" data-path="${this.escapeHtml(dir.path)}">${this.escapeHtml(dir.name)} <span class="dir-nav-count">${dir.postCount}</span></button>`;
      }
      html += '</div>';
    }

    html += `<button class="dir-tree-toggle" title="${this.t ? this.t('ui.showDirTree') : '显示目录树'}">${this.t ? this.t('ui.dirTree') : '目录树'}</button>`;
    html += '</div>';
    return html;
  },

  renderDirTreePanel(categoryId, currentPath = '') {
    const tree = this.buildDirTree(categoryId);
    if (!tree) return '';

    const renderNode = (node, path = '', depth = 0) => {
      let html = '';
      const isActive = path === currentPath;
      const indent = depth * 16;
      html += `<div class="tree-item ${isActive ? 'active' : ''}" style="padding-left:${indent}px" data-path="${this.escapeHtml(path)}">
        <span class="tree-name">${this.escapeHtml(node.name || 'root')}</span>
        <span class="tree-count">${this.countPostsInTree(node)}</span>
      </div>`;
      for (const child of Object.values(node.children || {})) html += renderNode(child, child.path, depth + 1);
      return html;
    };

    return `
      <div class="dir-tree-panel" style="display:none;">
        <div class="dir-tree-header">
          <span>${this.t ? this.t('ui.directory') : '目录'}</span>
          <button class="dir-tree-close">${this.t ? this.t('ui.close') : '关闭'}</button>
        </div>
        <div class="dir-tree-content">${renderNode(tree)}</div>
      </div>
    `;
  },

  renderCategoryContent(categoryId, currentPath = '') {
    const category = this.index?.categories?.[categoryId];
    if (!category) return { html: '', type: 'flat' };

    if ((category.type || 'flat') === 'tree') {
      const { posts } = this.getPathContent(categoryId, currentPath);
      return {
        html: posts.map((post) => this.renderPostCard({ ...post, category: categoryId, categoryName: category.name, categoryIcon: category.icon })).join(''),
        type: 'tree',
        dirNav: this.renderDirNav(categoryId, currentPath),
        dirTreePanel: this.renderDirTreePanel(categoryId, currentPath)
      };
    }

    return {
      html: (category.posts || []).map((post) => this.renderPostCard({ ...post, category: categoryId, categoryName: category.name, categoryIcon: category.icon })).join(''),
      type: 'flat'
    };
  },

  renderCategoryFilter() {
    let html = `<button class="filter-btn active" data-category="all">${this.escapeHtml(this.t ? this.t('index.all') : 'All')}</button>`;
    for (const [id, category] of Object.entries(this.index?.categories || {})) {
      if (!this.isValidId(id)) continue;
      html += `<button class="filter-btn" data-category="${this.escapeHtml(id)}">${this.escapeHtml(category.icon || '')} ${this.escapeHtml(category.name)} (${(category.posts || []).length})</button>`;
    }
    return html;
  },

  renderNavLinks() {
    const navEl = document.getElementById('nav-links');
    const footerEl = document.getElementById('footer-links');
    const current = `${window.location.pathname.split('/').pop()}${window.location.search}`;
    const navItems = (this.config?.nav || []).filter((item) => this.isSafeUrl(item.url));

    const linksHtml = navItems.map((item) => {
      const href = this.isSafeUrl(item.url) ? item.url : this.resolvePageUrl('index.html');
      const normalizedHref = href.replace(/^\.\//, '');
      const isActive = current === normalizedHref;
      return `<a href="${this.escapeHtml(href)}" class="nav-link${isActive ? ' active' : ''}">${this.escapeHtml(item.name)}</a>`;
    }).join('');

    const footerHtml = navItems.map((item) => `<a href="${this.escapeHtml(item.url)}" class="footer-link">${this.escapeHtml(item.name)}</a>`).join('');

    if (navEl) navEl.innerHTML = linksHtml;
    if (footerEl) footerEl.innerHTML = footerHtml;
    this.setupMobileNav();
  }
};
