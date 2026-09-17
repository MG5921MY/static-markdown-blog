(() => {
  /**
   * 归档页：按「年 → 月」分组展示全部文章（时间倒序）。
   *
   * 数据来源：Blog.getAllPosts()（构建期 allPosts，顺序 = content.sort 展示序）。
   * 本页语义是时间线：日期降序；同日按 readingIndex（阅读序位次，与 prev/next
   * 同口径，即章节号更小在前）；缺字段时回退标题升序。
   * 无日期文章归入“未标注日期”分组，保证任何内容都不会从归档中丢失。
   */
  Blog.runPage({
    needIndex: true,
    needPathMap: false,
    task: async () => {
      Blog.setPageTitle(Blog.t('archive.title'));
      Blog.setNavSiteName();

      const listEl = document.getElementById('archive-list');
      if (!listEl) return;

      // 归档页始终按日期降序（时间线语义，不沿用 content.sort 展示序）；
      // 同日平局用 readingIndex，与上一篇/下一篇阅读序一致
      const posts = [...Blog.getAllPosts()].sort((a, b) => {
        const byDate = String(b.date || '').localeCompare(String(a.date || ''), undefined, { numeric: true });
        if (byDate !== 0) return byDate;
        const ai = Number.isFinite(a.readingIndex) ? a.readingIndex : Number.MAX_SAFE_INTEGER;
        const bi = Number.isFinite(b.readingIndex) ? b.readingIndex : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return String(a.title || '').localeCompare(String(b.title || ''), undefined, { numeric: true });
      });
      if (posts.length === 0) {
        listEl.innerHTML = `<div class="empty-state"><p>${Blog.t('index.noPostsInDir')}</p></div>`;
        return;
      }

      // 分组：{ year: { month: [posts] } }，保持输入顺序（已排序）
      const grouped = new Map();
      for (const post of posts) {
        const date = String(post.date || '');
        const match = date.match(/^(\d{4})-(\d{2})/);
        const year = match ? match[1] : '';
        const month = match ? match[2] : '';
        if (!grouped.has(year)) grouped.set(year, new Map());
        const months = grouped.get(year);
        if (!months.has(month)) months.set(month, []);
        months.get(month).push(post);
      }

      const monthLabel = (month) => {
        if (!month) return Blog.t('archive.noDate');
        // 直接用两位月份（如 "06"），语言无关；中文标签模板渲染为 "06 月"
        return Blog.t('archive.monthLabel').replace('{month}', month);
      };

      const sections = [];
      for (const [year, months] of grouped) {
        const yearLabel = year || Blog.t('archive.noDate');
        const monthBlocks = [];
        let yearCount = 0;
        for (const [month, monthPosts] of months) {
          yearCount += monthPosts.length;
          const items = monthPosts.map((post) => {
            const url = Blog.resolvePageUrl('post.html', { id: post.id });
            const day = (String(post.date || '').match(/^\d{4}-\d{2}-(\d{2})/) || [])[1] || '';
            const categoryName = Blog.escapeHtml(post.categoryName || '');
            return `<li class="archive-item">
              <span class="archive-date">${day ? day : '--'}</span>
              <a class="archive-link" href="${Blog.escapeHtml(url)}">${Blog.escapeHtml(post.title || '')}</a>
              ${categoryName ? `<span class="archive-category">${categoryName}</span>` : ''}
            </li>`;
          }).join('');
          monthBlocks.push(`<div class="archive-month">
            <h3 class="archive-month-title">${monthLabel(month)}</h3>
            <ul class="archive-items">${items}</ul>
          </div>`);
        }
        sections.push(`<section class="archive-year-block">
          <div class="archive-year-head">
            <h2 class="archive-year">${yearLabel}</h2>
            <span class="archive-count">${Blog.t('archive.postsCount').replace('{count}', String(yearCount))}</span>
          </div>
          ${monthBlocks.join('')}
        </section>`);
      }

      listEl.innerHTML = sections.join('');
    }
  });
})();
