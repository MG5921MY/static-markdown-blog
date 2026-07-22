(() => {
  const loadingEl = document.getElementById('posts-loading');
  const gridEl = document.getElementById('posts-grid');
  const emptyEl = document.getElementById('posts-empty');
  const errorEl = document.getElementById('posts-error');
  const errorMsg = document.getElementById('error-message');
  const filterEl = document.getElementById('category-filter');
  const subdirContainer = document.getElementById('subdir-filter-container');
  const treeContainer = document.getElementById('dir-tree-container');
  const paginationEl = document.getElementById('posts-pagination');
  const searchInput = document.getElementById('search-input');
  const homeLayout = document.getElementById('home-layout');
  const homeHero = document.getElementById('home-hero');
  const heroMedia = document.getElementById('hero-media');
  const scrollCue = document.getElementById('hero-scroll-cue');

  let pageSize = 10;
  let posts = [];
  let currentCategory = 'all';
  let currentPath = '';
  let currentSearch = '';
  let currentPosts = [];
  let currentPage = 1;
  let searchTimeout = null;

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlightCard(cardHtml, query) {
    if (!query) return cardHtml;
    const escaped = escapeRegExp(query);
    return cardHtml.replace(new RegExp(`(>)([^<]*?)(${escaped})([^<]*?)(<)`, 'gi'), (match, pre, before, hit, after, post) => {
      return `${pre}${before}<mark>${hit}</mark>${after}${post}`;
    });
  }

  function getHeroDisplayConfig() {
    const hero = Blog.config?.display?.hero || {};
    const background = hero.background || {};
    return {
      immersive: hero.immersive === true,
      background: {
        enabled: background.enabled === true,
        image: String(background.image || '').trim(),
        focalPoint: String(background.focalPoint || 'center center').trim() || 'center center',
        fit: String(background.fit || 'cover').trim() || 'cover',
        dimming: Number.isFinite(Number(background.dimming)) ? Number(background.dimming) : 0.42,
        blur: Number.isFinite(Number(background.blur)) ? Number(background.blur) : 0
      }
    };
  }

  function isLocalAssetPath(value) {
    if (!value) return false;
    return !/^(https?:|data:|blob:|\/\/|[a-zA-Z]:)/i.test(String(value).trim());
  }

  function updateHeroExperience() {
    if (!homeLayout || !homeHero) return;

    const heroDisplay = getHeroDisplayConfig();
    const { immersive, background } = heroDisplay;
    const shouldShowImage = background.enabled && background.image && isLocalAssetPath(background.image);

    homeLayout.classList.toggle('is-immersive-home', immersive);
    document.body.classList.toggle('is-immersive-home', immersive);
    homeHero.classList.toggle('has-hero-image', shouldShowImage);

    if (scrollCue) scrollCue.style.display = immersive ? 'inline-flex' : 'none';

    if (!heroMedia) return;

    if (!shouldShowImage) {
      heroMedia.style.backgroundImage = 'none';
      homeHero.style.removeProperty('--hero-image-position');
      homeHero.style.removeProperty('--hero-image-fit');
      homeHero.style.removeProperty('--hero-image-dimming');
      homeHero.style.removeProperty('--hero-image-blur');
      return;
    }

    heroMedia.style.backgroundImage = `url("${Blog.resolveAsset(background.image)}")`;
    homeHero.style.setProperty('--hero-image-position', background.focalPoint);
    homeHero.style.setProperty('--hero-image-fit', background.fit);
    homeHero.style.setProperty('--hero-image-dimming', String(Math.min(Math.max(background.dimming, 0), 0.82)));
    homeHero.style.setProperty('--hero-image-blur', `${Math.max(background.blur, 0)}px`);
  }

  function syncUrlState(page = 1) {
    const params = new URLSearchParams();
    if (currentSearch) params.set('search', currentSearch);
    if (currentCategory && currentCategory !== 'all') params.set('category', currentCategory);
    if (currentPath) params.set('path', currentPath);
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState(null, '', url);
  }

  function collectCategoryPosts(categoryId, dirPath = '') {
    if (categoryId === 'all') return posts;
    const category = Blog.index?.categories?.[categoryId];
    if (!category) return [];

    const basePosts = (category.type || 'flat') === 'tree'
      ? (Blog.getPathContent(categoryId, dirPath).posts || [])
      : (category.posts || []);

    return basePosts.map((post) => ({
      ...post,
      category: categoryId,
      categoryName: category.name,
      categoryIcon: category.icon
    }));
  }

  let lunrIndex = null;
  let lunrReady = false;

  async function ensureLunr() {
    if (lunrReady) return;
    lunrReady = true;
    try {
      await Blog.loadScript('./vendor/lunr.min.js');
      const resp = await fetch(Blog.resolveAsset('./search-index.json'));
      if (!resp.ok) return;
      const docs = await resp.json();

      // CJK tokenizer: split Chinese/Japanese/Korean into individual characters
      const cjkTokenizer = (str) => {
        if (!str) return [];
        const tokens = [];
        let latin = '';
        for (const char of str) {
          if (char.charCodeAt(0) > 0x2E7F) {
            if (latin) { tokens.push(latin.toLowerCase()); latin = ''; }
            tokens.push(char);
          } else if (/\s/.test(char)) {
            if (latin) { tokens.push(latin.toLowerCase()); latin = ''; }
          } else {
            latin += char;
          }
        }
        if (latin) tokens.push(latin.toLowerCase());
        return tokens;
      };

      lunrIndex = lunr(function () {
        this.pipeline.reset();
        this.pipeline.add(cjkTokenizer);
        this.searchPipeline.add(cjkTokenizer);
        this.ref('id');
        this.field('title', { boost: 10 });
        this.field('tags', { boost: 5 });
        this.field('summary', { boost: 3 });
        this.field('category', { boost: 2 });
        for (const doc of docs) this.add(doc);
      });
    } catch (_) { /* lunr not available, fall back to simple search */ }
  }

  function filterPosts(postList, query) {
    if (!query) return postList;
    const lower = query.toLowerCase();

    if (lunrIndex) {
      try {
        const results = lunrIndex.search(query + '*');
        const refSet = new Set(results.map((r) => r.ref));
        return postList.filter((post) => refSet.has(post.id));
      } catch (_) { /* fall through to simple search */ }
    }

    return postList.filter((post) =>
      (post.title || '').toLowerCase().includes(lower) ||
      (post.summary || '').toLowerCase().includes(lower) ||
      (post.tags || []).some((tag) => String(tag).toLowerCase().includes(lower)) ||
      (post.categoryName || '').toLowerCase().includes(lower)
    );
  }

  function renderPagination(totalItems, page) {
    if (!paginationEl) return;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (totalItems === 0 || totalPages <= 1) {
      paginationEl.innerHTML = '';
      paginationEl.style.display = 'none';
      return;
    }

    const safePage = Math.min(Math.max(1, page), totalPages);
    const buttons = [];
    buttons.push(`<button class="page-btn" data-page="${safePage - 1}" ${safePage === 1 ? 'disabled' : ''}>${Blog.t ? Blog.t('ui.prevPage') : '上一页'}</button>`);

    const windowSize = 5;
    const start = Math.max(1, safePage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const normalizedStart = Math.max(1, end - windowSize + 1);
    for (let i = normalizedStart; i <= end; i += 1) {
      buttons.push(`<button class="page-btn ${i === safePage ? 'active' : ''}" data-page="${i}">${i}</button>`);
    }
    buttons.push(`<button class="page-btn" data-page="${safePage + 1}" ${safePage === totalPages ? 'disabled' : ''}>${Blog.t ? Blog.t('ui.nextPage') : '下一页'}</button>`);

    paginationEl.innerHTML = `<span class="page-info">${Blog.t ? Blog.t('index.pagination', { current: safePage, total: totalPages, count: totalItems }) : `第 ${safePage} / ${totalPages} 页，共 ${totalItems} 篇`}</span>${buttons.join('')}`;
    paginationEl.style.display = 'flex';
  }

  function renderPosts(postList, page = 1) {
    const totalPages = Math.max(1, Math.ceil(Math.max(0, postList.length) / pageSize));
    currentPage = Math.min(Math.max(1, page), totalPages);

    if (gridEl) {
      gridEl.className = 'posts-grid';
      gridEl.style.display = 'grid';
    }

    if (postList.length === 0) {
      if (gridEl) {
        gridEl.innerHTML = currentSearch
          ? `<div class="empty-state"><p>${Blog.t ? Blog.t('index.noSearchResults') : '没有找到匹配的文章。'}</p></div>`
          : `<div class="empty-state"><p>${Blog.t ? Blog.t('index.noPostsInDir') : '当前目录下还没有文章。'}</p></div>`;
      }
      renderPagination(0, 1);
      syncUrlState(1);
      return;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const pagePosts = postList.slice(startIndex, startIndex + pageSize);
    if (gridEl) {
      gridEl.innerHTML = pagePosts.map((post) => {
        const card = Blog.renderPostCard(post);
        return currentSearch ? highlightCard(card, currentSearch) : card;
      }).join('');
    }

    renderPagination(postList.length, currentPage);
    Blog.setupCardAnimations();
    syncUrlState(currentPage);
  }

  function updateDisplay(category, dirPath = '', page = 1) {
    currentCategory = category;
    currentPath = dirPath;

    if (category === 'all') {
      if (subdirContainer) subdirContainer.innerHTML = '';
      if (treeContainer) treeContainer.innerHTML = '';
    } else {
      const result = Blog.renderCategoryContent(category, dirPath);
      if (subdirContainer) subdirContainer.innerHTML = result.dirNav || '';
      if (treeContainer) treeContainer.innerHTML = result.dirTreePanel || '';
    }

    currentPosts = filterPosts(collectCategoryPosts(category, dirPath), currentSearch);
    renderPosts(currentPosts, page);
  }

  function updatePageMeta() {
    const site = Blog.config?.site || {};
    const display = Blog.config?.display || {};

    document.title = `${site.name || Blog.t('site.defaultName')} | ${site.description || Blog.t('site.personalBlog')}`;

    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.content = site.description || '';

    Blog.setNavSiteName('nav-site-name', Blog.t('site.defaultName'));

    const heroBadge = document.getElementById('hero-badge');
    const heroTitle = document.getElementById('hero-title');
    const heroSubtitle = document.getElementById('hero-subtitle');

    if (heroBadge) {
      if (display.heroBadge) {
        heroBadge.textContent = display.heroBadge;
        heroBadge.style.display = 'inline-flex';
      } else {
        heroBadge.style.display = 'none';
      }
    }

    if (heroTitle) heroTitle.textContent = site.alias || site.name || Blog.t('site.myBlog');
    if (heroSubtitle) {
      const subtitleText = display.heroSubtitle || site.description || '';
      heroSubtitle.innerHTML = Blog.escapeHtml(subtitleText).replace(/\n/g, '<br>');
    }

    const heroBadges = Array.isArray(display.heroBadges) ? display.heroBadges.filter(Boolean) : [];
    const heroMetaEls = document.querySelectorAll('.hero-meta span');
    if (heroMetaEls.length >= 3) {
      const fallbacks = [Blog.t('hero.badge1'), Blog.t('hero.badge2'), Blog.t('hero.badge3')];
      for (let i = 0; i < 3; i += 1) {
        heroMetaEls[i].textContent = heroBadges[i] || fallbacks[i];
      }
    }

    const sectionCopyEl = document.querySelector('.section-copy[data-i18n="index.sectionCopy"]');
    if (sectionCopyEl && display.latestContentCopy) {
      sectionCopyEl.textContent = display.latestContentCopy;
    }

    const siteInfoCopyEl = document.querySelector('.section-copy[data-i18n="index.siteInfoCopy"]');
    if (siteInfoCopyEl && display.siteInfoCopy) {
      siteInfoCopyEl.textContent = display.siteInfoCopy;
    }

    const learnMoreLink = document.querySelector('.hero-actions a[href*="page.html"]');
    if (learnMoreLink) {
      const learnMorePage = display.heroLearnMorePage || 'about';
      learnMoreLink.href = `./page.html?id=${encodeURIComponent(learnMorePage)}`;
    }
  }

  function updateSiteInfo() {
    const site = Blog.config?.site || {};
    const display = Blog.config?.display || {};

    const siteInfoSection = document.getElementById('site-info-section');
    const siteInfoEl = document.getElementById('site-info');
    const contactBox = document.getElementById('contact-box');
    const contactEmail = document.getElementById('contact-email');

    if (!siteInfoSection || !siteInfoEl) return;
    if (display.showSiteInfo === false) {
      siteInfoSection.style.display = 'none';
      return;
    }

    let infoHtml = '';
    const siteName = site.alias ? `${site.name}（${site.alias}）` : site.name;
    if (siteName) infoHtml += `<div class="info-item"><div class="label">${Blog.t ? Blog.t('index.siteName') : '站点名称'}</div><div class="value">${Blog.escapeHtml(siteName)}</div></div>`;
    if (display.siteType) infoHtml += `<div class="info-item"><div class="label">${Blog.t ? Blog.t('index.siteType') : '站点类型'}</div><div class="value">${Blog.escapeHtml(display.siteType)}</div></div>`;
    if (display.contentDirection) infoHtml += `<div class="info-item"><div class="label">${Blog.t ? Blog.t('index.contentDirection') : '内容方向'}</div><div class="value">${Blog.escapeHtml(display.contentDirection)}</div></div>`;

    siteInfoEl.innerHTML = infoHtml;
    if (contactBox && contactEmail) {
      if (site.email) {
        contactEmail.textContent = site.email;
        contactBox.style.display = 'flex';
      } else {
        contactBox.style.display = 'none';
      }
    }

    siteInfoSection.style.display = (infoHtml || site.email) ? 'block' : 'none';
  }

  function setActiveCategoryButton(category) {
    if (!filterEl) return;
    filterEl.querySelectorAll('.filter-btn').forEach((node) => node.classList.remove('active'));
    const selector = `.filter-btn[data-category="${Blog.safeCssEscape(category)}"]`;
    const activeBtn = filterEl.querySelector(selector);
    if (activeBtn) activeBtn.classList.add('active');
  }

  function bindEvents() {
    if (filterEl) {
      filterEl.addEventListener('click', (event) => {
        const btn = event.target.closest('.filter-btn');
        if (!btn) return;
        setActiveCategoryButton(btn.dataset.category || 'all');
        currentSearch = '';
        if (searchInput) searchInput.value = '';
        updateDisplay(btn.dataset.category || 'all', '', 1);
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
          currentSearch = event.target.value.trim();
          if (currentSearch) await ensureLunr();
          updateDisplay(currentCategory, currentPath, 1);
        }, 180);
      });
    }

    if (subdirContainer) {
      subdirContainer.addEventListener('click', (event) => {
        const dirBtn = event.target.closest('.dir-nav-btn');
        if (dirBtn) {
          updateDisplay(currentCategory, dirBtn.dataset.path || '', 1);
          return;
        }
        if (event.target.closest('.dir-tree-toggle')) {
          const panel = treeContainer?.querySelector('.dir-tree-panel');
          if (panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        }
      });
    }

    if (treeContainer) {
      treeContainer.addEventListener('click', (event) => {
        if (event.target.closest('.dir-tree-close')) {
          const panel = treeContainer.querySelector('.dir-tree-panel');
          if (panel) panel.style.display = 'none';
          return;
        }

        const item = event.target.closest('.tree-item');
        if (!item) return;

        updateDisplay(currentCategory, item.dataset.path || '', 1);
        treeContainer.querySelectorAll('.tree-item').forEach((node) => node.classList.remove('active'));
        item.classList.add('active');
      });
    }

    if (paginationEl) {
      paginationEl.addEventListener('click', (event) => {
        const btn = event.target.closest('.page-btn');
        if (!btn || btn.disabled) return;
        const page = Number(btn.dataset.page || '1');
        if (!Number.isFinite(page) || page < 1) return;
        renderPosts(currentPosts, page);
        if (gridEl) window.scrollTo({ top: gridEl.offsetTop - 100, behavior: 'smooth' });
      });
    }
  }

  function readInitialState() {
    const params = new URLSearchParams(window.location.search);
    return {
      search: (params.get('search') || '').trim(),
      category: (params.get('category') || 'all').trim() || 'all',
      path: (params.get('path') || '').trim(),
      page: Math.max(1, Number(params.get('page') || '1') || 1)
    };
  }

  Blog.runPage({
    needIndex: true,
    needPathMap: false,
    loadingEl,
    errorEl,
    errorDetailEl: errorMsg,
    task: async () => {
      updatePageMeta();
      updateHeroExperience();
      updateSiteInfo();

      if (filterEl) filterEl.innerHTML = Blog.renderCategoryFilter();
      posts = Blog.getAllPosts();
      pageSize = Math.max(1, parseInt(Blog.config?.display?.postsPerPage, 10) || 10);

      if (loadingEl) loadingEl.style.display = 'none';
      if (posts.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        return;
      }

      if (gridEl) {
        gridEl.innerHTML = '';
        gridEl.style.display = 'grid';
        gridEl.className = 'posts-grid';
      }

      bindEvents();

      const initial = readInitialState();
      currentSearch = initial.search;
      if (searchInput) searchInput.value = currentSearch;

      const validCategory = initial.category === 'all' || Boolean(Blog.index?.categories?.[initial.category]);
      const startCategory = validCategory ? initial.category : 'all';
      setActiveCategoryButton(startCategory);

      const startPath = startCategory === 'all' ? '' : initial.path;
      updateDisplay(startCategory, startPath, initial.page);
    }
  });
})();
