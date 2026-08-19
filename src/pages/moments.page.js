(() => {
  const contentEl = document.getElementById('moments-content');

  function renderMoment(moment) {
    let content = Blog.escapeHtml(moment.content || '');
    content = content.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');

    let imagesHtml = '';
    if (moment.images && moment.images.length > 0) {
      const safeImages = moment.images.filter((img) => {
        if (!img || typeof img !== 'string') return false;
        if (img.startsWith('http://')) return false;
        if (/^(javascript|data|vbscript):/i.test(img)) return false;
        return true;
      });

      if (safeImages.length > 0) {
        imagesHtml = `<div class="moment-images">
          ${safeImages.map((img) => `<img src="${Blog.escapeHtml(Blog.resolveAsset(img))}" alt="${Blog.escapeHtml(Blog.t('moments.imageAlt'))}" loading="lazy">`).join('')}
        </div>`;
      }
    }

    let tagsHtml = '';
    if (moment.tags && moment.tags.length > 0) {
      tagsHtml = `<div class="moment-tags">
        ${moment.tags.map((tag) => `<span class="moment-tag">#${Blog.escapeHtml(tag)}</span>`).join('')}
      </div>`;
    }

    return `<article class="moment-item">
      <div class="moment-dot"></div>
      <div class="moment-card">
        <div class="moment-meta">
          ${moment.mood ? `<span class="moment-mood">${Blog.escapeHtml(moment.mood)}</span>` : ''}
          <span class="moment-date">${Blog.formatDate(moment.date)}</span>
        </div>
        <div class="moment-content">${content}</div>
        ${imagesHtml}
        ${tagsHtml}
      </div>
    </article>`;
  }

  Blog.runPage({
    needIndex: false,
    needPathMap: false,
    task: async () => {
      try {
        Blog.setPageTitle(Blog.t ? Blog.t('moments.title') : '瞬间');
        Blog.setNavSiteName();

        const momentsData = Blog.config?.features?.moments;
        if (!momentsData) {
          Blog.renderState(contentEl, Blog.t ? Blog.t('moments.notEnabled') : '瞬间功能未启用。');
          return;
        }

        const momentsDesc = momentsData?.description;
        if (momentsDesc) {
          const descEl = document.querySelector('[data-i18n="moments.subtitle"]');
          if (descEl) descEl.textContent = momentsDesc;
        }

        const moments = momentsData.moments || [];
        if (moments.length === 0) {
          Blog.renderState(contentEl, Blog.t ? Blog.t('moments.noMoments') : '还没有记录任何瞬间。');
          return;
        }

        moments.sort((a, b) => new Date(b.date) - new Date(a.date));
        contentEl.innerHTML = `<div class="moments-timeline">${moments.map(renderMoment).join('')}</div>`;
        Blog.setupCardAnimations();
      } catch (error) {
        console.error('Failed to load moments:', error);
        Blog.renderState(contentEl, Blog.t ? Blog.t('moments.loadFailed') : '瞬间内容加载失败。');
      }
    }
  });
})();
