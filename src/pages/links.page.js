(() => {
  const contentEl = document.getElementById('links-content');

  function getInitials(link) {
    const base = String(link.icon || link.name || 'Ref').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').trim();
    if (!base) return 'Rf';
    return base.length <= 2 ? base.toUpperCase() : base.slice(0, 2).toUpperCase();
  }

  function renderLinks(links, groupMap) {
    return links
      .filter((link) => {
        if (!link.url || typeof link.url !== 'string') return false;
        const lower = link.url.toLowerCase().trim();
        return !/^(javascript|data|vbscript):/i.test(lower);
      })
      .map((link) => {
        const initials = getInitials(link);
        let avatarHtml = `<span class="link-avatar-text">${Blog.escapeHtml(initials)}</span>`;
        if (link.avatar && typeof link.avatar === 'string') {
          const avatarLower = link.avatar.toLowerCase();
          if (!/^(javascript|data|vbscript):/i.test(avatarLower)) {
            avatarHtml = `<img src="${Blog.escapeHtml(Blog.resolveAsset(link.avatar))}" alt="${Blog.escapeHtml(link.name)}" onerror="this.parentElement.textContent='${Blog.escapeHtml(initials)}'">`;
          }
        }

        let domain = '';
        try {
          domain = new URL(link.url).hostname;
        } catch (error) {
          domain = link.url;
        }

        const groupName = groupMap.get(link.group) || (Blog.t ? Blog.t('links.defaultGroup') : '参考资源');
        const label = link.label || groupName;

        return `<a href="${Blog.escapeHtml(link.url)}" class="link-card" target="_blank" rel="noopener noreferrer">
          <div class="link-avatar">${avatarHtml}</div>
          <div class="link-info">
            <div class="link-topline">
              <span class="link-pill">${Blog.escapeHtml(label)}</span>
              <span class="link-url">${Blog.escapeHtml(domain)}</span>
            </div>
            <div class="link-name">${Blog.escapeHtml(link.name)}</div>
            ${link.description ? `<div class="link-desc">${Blog.escapeHtml(link.description)}</div>` : ''}
          </div>
        </a>`;
      })
      .join('');
  }

  Blog.runPage({
    needIndex: false,
    needPathMap: false,
    task: async () => {
      try {
        Blog.setPageTitle(Blog.t ? Blog.t('links.title') : '参考与收藏');
        Blog.setNavSiteName();

        const linksData = Blog.config?.features?.links;
        if (!linksData) {
          Blog.renderState(contentEl, Blog.t ? Blog.t('links.notEnabled') : '参考页功能尚未启用。');
          return;
        }

        const groups = linksData.groups || [];
        const links = linksData.links || [];
        if (links.length === 0) {
          Blog.renderState(contentEl, Blog.t ? Blog.t('links.noLinks') : '这里还没有配置任何参考资源。');
          return;
        }

        const groupMap = new Map(groups.map((group) => [group.id, group.name]));

        let html = '';
        if (groups.length > 0) {
          for (const group of groups) {
            const groupLinks = links.filter((item) => item.group === group.id);
            if (groupLinks.length === 0) continue;
            html += `<section class="links-group">
              <div class="links-group-head">
                <div class="links-group-kicker">${Blog.escapeHtml(group.icon || 'Ref')}</div>
                <h2 class="links-group-title">${Blog.escapeHtml(group.name)}</h2>
              </div>
              <div class="links-grid">${renderLinks(groupLinks, groupMap)}</div>
            </section>`;
          }

          const ungrouped = links.filter((item) => !item.group || !groups.find((group) => group.id === item.group));
          if (ungrouped.length > 0) {
            html += `<section class="links-group">
              <div class="links-group-head">
                <div class="links-group-kicker">More</div>
                <h2 class="links-group-title">${Blog.t ? Blog.t('links.moreCollection') : '更多收藏'}</h2>
              </div>
              <div class="links-grid">${renderLinks(ungrouped, groupMap)}</div>
            </section>`;
          }
        } else {
          html = `<div class="links-grid">${renderLinks(links, groupMap)}</div>`;
        }

        contentEl.innerHTML = html;
        Blog.setupCardAnimations();
      } catch (error) {
        console.error('Failed to load links:', error);
        Blog.renderState(contentEl, Blog.t ? Blog.t('links.loadFailed') : '参考资源加载失败。');
      }
    }
  });
})();
