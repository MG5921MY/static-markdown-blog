(() => {
  Blog.runPage({
    needIndex: false,
    needPathMap: false,
    task: async () => {
      Blog.setPageTitle(Blog.t('disclaimer.title'));
      Blog.setNavSiteName();

      const disclaimer = Blog.config?.disclaimer || {};

      if (disclaimer.subtitle) {
        const subtitleEl = document.querySelector('[data-i18n="disclaimer.subtitle"]');
        if (subtitleEl) subtitleEl.textContent = disclaimer.subtitle;
      }

      const items = Array.isArray(disclaimer.items) ? disclaimer.items.filter((item) => item && item.title) : [];
      if (items.length > 0) {
        const listEl = document.querySelector('.disclaimer-list');
        if (listEl) {
          listEl.innerHTML = items.map((item, idx) => `<div class="disclaimer-item">
            <h3><span class="num">${idx + 1}</span>${Blog.escapeHtml(item.title)}</h3>
            <p>${Blog.escapeHtml(item.description || '')}</p>
          </div>`).join('');
        }
      }
    }
  });
})();
