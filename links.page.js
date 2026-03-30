(() => {
  const contentEl = document.getElementById('links-content');

  function renderLinks(links) {
    return links.filter((link) => {
      if (!link.url || typeof link.url !== 'string') return false;
      const lower = link.url.toLowerCase().trim();
      return !/^(javascript|data|vbscript):/i.test(lower);
    }).map((link) => {
      let avatarHtml = link.icon || '🔗';
      if (link.avatar && typeof link.avatar === 'string') {
        const avatarLower = link.avatar.toLowerCase();
        if (!/^(javascript|data|vbscript):/i.test(avatarLower)) {
          avatarHtml = `<img src="${Blog.escapeHtml(link.avatar)}" alt="${Blog.escapeHtml(link.name)}" onerror="this.parentElement.innerHTML='${Blog.escapeHtml(link.icon || '🔗')}'">`;
        }
      }

      let domain = '';
      try {
        domain = new URL(link.url).hostname;
      } catch (error) {
        domain = link.url;
      }

      return `<a href="${Blog.escapeHtml(link.url)}" class="link-card" target="_blank" rel="noopener noreferrer">
        <div class="link-avatar">${avatarHtml}</div>
        <div class="link-info">
          <div class="link-name">${Blog.escapeHtml(link.name)}</div>
          ${link.description ? `<div class="link-desc">${Blog.escapeHtml(link.description)}</div>` : ''}
          <div class="link-url">${Blog.escapeHtml(domain)}</div>
        </div>
      </a>`;
    }).join('');
  }

  Blog.runPage({
    needIndex: false,
    needPathMap: false,
    task: async () => {
      try {
        Blog.setPageTitle('友情链接');
        Blog.setNavSiteName();

        const linksData = Blog.config?.features?.links;
        if (!linksData) {
          Blog.renderState(contentEl, '友链功能未启用');
          return;
        }

        const groups = linksData.groups || [];
        const links = linksData.links || [];
        if (links.length === 0) {
          Blog.renderState(contentEl, '暂无友链');
          return;
        }

        let html = '';
        if (groups.length > 0) {
          for (const group of groups) {
            const groupLinks = links.filter((item) => item.group === group.id);
            if (groupLinks.length === 0) continue;
            html += `<div class="links-group">
              <h2 class="links-group-title">${Blog.escapeHtml(group.icon || '')} ${Blog.escapeHtml(group.name)}</h2>
              <div class="links-grid">${renderLinks(groupLinks)}</div>
            </div>`;
          }

          const ungrouped = links.filter((item) => !item.group || !groups.find((group) => group.id === item.group));
          if (ungrouped.length > 0) {
            html += `<div class="links-group">
              <h2 class="links-group-title">🔗 其他链接</h2>
              <div class="links-grid">${renderLinks(ungrouped)}</div>
            </div>`;
          }
        } else {
          html = `<div class="links-grid">${renderLinks(links)}</div>`;
        }

        contentEl.innerHTML = html;
      } catch (error) {
        console.error('Failed to load links:', error);
        Blog.renderState(contentEl, '加载失败');
      }
    }
  });
})();
