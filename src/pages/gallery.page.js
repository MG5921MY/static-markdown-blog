(() => {
  const galleryContentEl = document.getElementById('gallery-content');
  const lightboxEl = document.getElementById('lightbox');
  const lightboxMediaEl = document.getElementById('lightbox-media');
  const lightboxFileNameEl = document.getElementById('lightbox-filename');
  const lightboxCounterEl = document.getElementById('lightbox-counter');
  const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
  const lightboxPrevBtn = document.getElementById('lightbox-prev-btn');
  const lightboxNextBtn = document.getElementById('lightbox-next-btn');
  const lightboxZoomBtn = document.getElementById('lightbox-zoom-btn');

  let galleryData = null;
  let currentGroup = null;
  let currentPath = '';
  let currentMedia = []; // 当前视图（当前路径下）的扁平媒体列表，供灯箱导航
  let lightboxIndex = 0;
  let displayedCount = 0;
  const perPage = 20;

  function isMediaPathSafe(filePath) {
    if (!filePath || typeof filePath !== 'string') return false;
    if (/^(javascript|data|vbscript|http:)/i.test(filePath)) return false;
    if (filePath.includes('..')) return false;
    return true;
  }

  // ── 媒体树统计 ─────────────────────────────────────────
  // 类型节点结构：{ items: MediaItem[], subfolders: { [name]: 同结构 } }
  function countTypeNode(node) {
    if (!node) return 0;
    let count = (node.items || []).length;
    for (const sub of Object.values(node.subfolders || {})) {
      count += countTypeNode(sub);
    }
    return count;
  }

  function countGroupMedia(group) {
    let count = 0;
    for (const type of group.types || []) {
      count += countTypeNode(group.media?.[type]);
    }
    return count;
  }

  // 按路径逐级下钻：返回 { [type]: 类型节点 | null }
  function descendMedia(group, pathParts) {
    const nodes = {};
    for (const type of group.types || []) {
      let node = group.media?.[type] || null;
      for (const part of pathParts) {
        node = node?.subfolders?.[part] || null;
        if (!node) break;
      }
      nodes[type] = node;
    }
    return nodes;
  }

  // ── 渲染：分组栏 ───────────────────────────────────────
  function renderGallery() {
    const groups = galleryData.groups || [];
    if (groups.length === 0) {
      Blog.renderState(galleryContentEl, Blog.t ? Blog.t('gallery.noGroups') : '暂无图集分组。', Blog.t ? Blog.t('gallery.title') : '资源');
      return;
    }

    if (!currentGroup) currentGroup = groups[0].id;

    let html = '<div class="gallery-groups">';
    for (const group of groups) {
      const isActive = group.id === currentGroup;
      const count = countGroupMedia(group);
      html += `<button class="group-btn ${isActive ? 'active' : ''}" type="button" data-action="select-group" data-group-id="${Blog.escapeHtml(group.id)}">
        <span>${Blog.escapeHtml(group.icon || (Blog.t ? Blog.t('gallery.title') : '资源'))}</span>
        <span>${Blog.escapeHtml(group.name)}</span>
        <span class="count">${count}</span>
      </button>`;
    }
    html += '</div><div id="gallery-view"></div>';

    galleryContentEl.innerHTML = html;
    renderGroupContent();
  }

  // ── 渲染：分组内容（面包屑 / 子目录 / 媒体网格）─────────
  function renderGroupContent() {
    const galleryViewEl = document.getElementById('gallery-view');
    const group = galleryData.groups.find((item) => item.id === currentGroup);
    if (!group || !galleryViewEl) return;

    if (!group.media) {
      Blog.renderState(galleryViewEl, Blog.t ? Blog.t('gallery.noGroupMedia') : '当前分组暂时没有媒体。', Blog.t ? Blog.t('ui.empty') : '空');
      return;
    }

    const pathParts = currentPath ? currentPath.split('/') : [];
    const nodesByType = descendMedia(group, pathParts);

    // 所有类型在该路径下都无节点 → 路径不存在
    if ((group.types || []).every((type) => !nodesByType[type])) {
      Blog.renderState(galleryViewEl, Blog.t ? Blog.t('gallery.pathNotExist') : '目录路径不存在。');
      return;
    }

    let html = '';
    if (currentPath) {
      html += '<div class="gallery-breadcrumb">';
      html += `<span class="breadcrumb-item" data-action="navigate-path" data-path="">${Blog.escapeHtml(group.icon || (Blog.t ? Blog.t('gallery.title') : '资源'))} ${Blog.escapeHtml(group.name)}</span>`;
      let buildPath = '';
      for (let i = 0; i < pathParts.length; i += 1) {
        buildPath += `${i > 0 ? '/' : ''}${pathParts[i]}`;
        const isLast = i === pathParts.length - 1;
        html += '<span class="breadcrumb-sep">/</span>';
        if (isLast) {
          html += `<span class="breadcrumb-item current">${Blog.escapeHtml(pathParts[i])}</span>`;
        } else {
          html += `<span class="breadcrumb-item" data-action="navigate-path" data-path="${Blog.escapeHtml(buildPath)}">${Blog.escapeHtml(pathParts[i])}</span>`;
        }
      }
      html += '</div>';
    }

    // 子目录并集：同一子目录在各类型树中并存，展示时合并计数
    const folderNames = new Set();
    for (const type of group.types || []) {
      for (const name of Object.keys(nodesByType[type]?.subfolders || {})) {
        folderNames.add(name);
      }
    }
    const sortedFolders = [...folderNames].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (sortedFolders.length > 0) {
      html += '<div class="gallery-folders">';
      for (const name of sortedFolders) {
        const subPath = currentPath ? `${currentPath}/${name}` : name;
        let count = 0;
        for (const type of group.types || []) {
          count += countTypeNode(nodesByType[type]?.subfolders?.[name]);
        }
        html += `<button class="folder-card" type="button" data-action="navigate-path" data-path="${Blog.escapeHtml(subPath)}">
          <span class="folder-icon">□</span>
          <div class="folder-info">
            <div class="folder-name">${Blog.escapeHtml(name)}</div>
            <div class="folder-count">${Blog.t ? Blog.t('gallery.mediaCount', { count }) : `${count} 个文件`}</div>
          </div>
        </button>`;
      }
      html += '</div>';
    }

    // 扁平媒体列表：按组声明的类型顺序合并（灯箱导航贯穿全类型）
    const mediaList = [];
    for (const type of group.types || []) {
      for (const item of nodesByType[type]?.items || []) {
        if (isMediaPathSafe(item.path)) mediaList.push(item);
      }
    }
    currentMedia = mediaList;

    if (mediaList.length > 0) {
      const showItems = mediaList.slice(0, displayedCount + perPage);
      displayedCount = showItems.length;
      html += '<div class="gallery-grid">';
      showItems.forEach((item, idx) => {
        const name = Blog.escapeHtml(item.name);
        const src = Blog.escapeHtml(Blog.resolveAsset(item.path));
        const action = item.playable ? 'open-lightbox' : 'download-media';
        const indexAttr = item.playable ? ` data-index="${idx}"` : '';
        let inner = '';
        if (item.type === 'video') {
          inner = `<video src="${src}#t=0.1" preload="metadata" muted playsinline aria-hidden="true"></video>`;
        } else if (item.type === 'audio') {
          inner = '<svg class="gallery-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
        } else {
          inner = `<img src="${src}" alt="${name}" loading="lazy">`;
        }
        // 非图片媒体带角标：可播放 → ▶，仅可下载 → ⬇
        const badge = item.type === 'image' ? '' : `<span class="gallery-item-badge" aria-hidden="true"><span>${item.playable ? '▶' : '⬇'}</span></span>`;
        html += `<button class="gallery-item media-${Blog.escapeHtml(item.type)}" type="button" data-action="${action}"${indexAttr} data-path="${Blog.escapeHtml(item.path)}">
          ${inner}
          ${badge}
          <div class="gallery-item-overlay">
            <div class="gallery-item-name">${name}</div>
          </div>
        </button>`;
      });
      html += '</div>';

      if (displayedCount < mediaList.length) {
        html += `<button class="load-more" type="button" data-action="load-more">${Blog.t ? Blog.t('gallery.loadMore', { count: mediaList.length - displayedCount }) : `加载更多（剩余 ${mediaList.length - displayedCount} 项）`}</button>`;
      }
    } else if (sortedFolders.length === 0) {
      html += `<div class="empty-state"><div class="icon">空</div><p>${Blog.t ? Blog.t('gallery.noMediaInDir') : '这个目录下还没有媒体文件。'}</p></div>`;
    }

    galleryViewEl.innerHTML = html;
    Blog.setupCardAnimations();
  }

  // ── 灯箱：媒体渲染 ─────────────────────────────────────
  function clearLightboxMedia() {
    const mediaEls = lightboxMediaEl.querySelectorAll('video, audio');
    mediaEls.forEach((el) => {
      el.pause();
      el.removeAttribute('src');
      el.load(); // 终止后续网络下载
    });
    lightboxMediaEl.innerHTML = '';
  }

  function showPlaybackFallback(item) {
    clearLightboxMedia();
    lightboxZoomBtn.hidden = true;
    const box = document.createElement('div');
    box.className = 'lightbox-fallback';
    const message = document.createElement('p');
    message.textContent = Blog.t ? Blog.t('gallery.playbackFailed') : '此文件无法在当前浏览器中直接播放。';
    const link = document.createElement('a');
    link.href = Blog.resolveAsset(item.path);
    link.download = item.name;
    link.textContent = Blog.t ? Blog.t('gallery.download') : '下载文件';
    box.appendChild(message);
    box.appendChild(link);
    lightboxMediaEl.appendChild(box);
  }

  function resetZoom() {
    lightboxMediaEl.classList.remove('actual-size');
    lightboxZoomBtn.classList.remove('active');
    lightboxZoomBtn.textContent = '1:1';
    lightboxZoomBtn.setAttribute('aria-label', Blog.t ? Blog.t('gallery.zoomActual') : '查看原始尺寸');
  }

  function renderLightboxMedia(item) {
    clearLightboxMedia();
    resetZoom();
    lightboxZoomBtn.hidden = item.type !== 'image';

    const src = Blog.resolveAsset(item.path);

    if (item.type === 'image') {
      const img = document.createElement('img');
      img.src = src;
      img.alt = item.name;
      lightboxMediaEl.appendChild(img);
      return;
    }

    if (item.type === 'video' || item.type === 'audio') {
      const el = document.createElement(item.type);
      el.controls = true;
      el.autoplay = true;
      el.preload = 'metadata';
      el.src = src;
      // 保守映射之外的编解码器仍可能失败：元素仍在文档中才兜底，避免清理阶段误触发
      el.addEventListener('error', () => {
        if (lightboxMediaEl.contains(el)) showPlaybackFallback(item);
      });
      lightboxMediaEl.appendChild(el);
      const played = el.play();
      if (played && typeof played.catch === 'function') played.catch(() => {}); // 浏览器拦截自动播放时静默，用户可手动播放
      return;
    }

    showPlaybackFallback(item);
  }

  function updateLightbox() {
    const item = currentMedia[lightboxIndex];
    if (!item) return;
    lightboxFileNameEl.textContent = item.name;
    lightboxCounterEl.textContent = `${lightboxIndex + 1} / ${currentMedia.length}`;
    lightboxPrevBtn.disabled = lightboxIndex === 0;
    lightboxNextBtn.disabled = lightboxIndex === currentMedia.length - 1;
    renderLightboxMedia(item);
  }

  function openLightbox(index) {
    lightboxIndex = index;
    updateLightbox();
    lightboxEl.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightboxEl.classList.remove('active');
    document.body.style.overflow = '';
    clearLightboxMedia();
  }

  function navLightbox(dir) {
    lightboxIndex += dir;
    if (lightboxIndex < 0) lightboxIndex = 0;
    if (lightboxIndex >= currentMedia.length) lightboxIndex = currentMedia.length - 1;
    updateLightbox();
  }

  // ── 缩放：fit（默认内适）↔ actual（1:1 溢出滚动）────────
  function toggleZoom() {
    if (!lightboxMediaEl.querySelector('img')) return;
    const isActual = lightboxMediaEl.classList.toggle('actual-size');
    lightboxZoomBtn.classList.toggle('active', isActual);
    lightboxZoomBtn.textContent = isActual ? (Blog.t ? Blog.t('gallery.zoomFit') : '适应') : '1:1';
    lightboxZoomBtn.setAttribute('aria-label', Blog.t ? Blog.t(isActual ? 'gallery.zoomFit' : 'gallery.zoomActual') : (isActual ? '适应窗口' : '查看原始尺寸'));
  }

  // ── 事件绑定 ───────────────────────────────────────────
  galleryContentEl.addEventListener('click', (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    if (action === 'select-group') {
      currentGroup = actionEl.dataset.groupId || null;
      currentPath = '';
      displayedCount = 0;
      renderGallery();
      return;
    }

    if (action === 'navigate-path') {
      currentPath = actionEl.dataset.path || '';
      displayedCount = 0;
      renderGroupContent();
      return;
    }

    if (action === 'open-lightbox') {
      const index = Number(actionEl.dataset.index || '0');
      if (Number.isFinite(index)) openLightbox(index);
      return;
    }

    if (action === 'download-media') {
      const mediaPath = actionEl.dataset.path;
      if (!isMediaPathSafe(mediaPath)) return;
      const link = document.createElement('a');
      link.href = Blog.resolveAsset(mediaPath);
      link.download = mediaPath.split('/').pop();
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    if (action === 'load-more') {
      renderGroupContent();
    }
  });

  lightboxCloseBtn.addEventListener('click', closeLightbox);
  lightboxPrevBtn.addEventListener('click', () => navLightbox(-1));
  lightboxNextBtn.addEventListener('click', () => navLightbox(1));
  lightboxZoomBtn.addEventListener('click', toggleZoom);
  lightboxMediaEl.addEventListener('dblclick', (event) => {
    if (event.target.tagName === 'IMG') toggleZoom();
  });

  document.addEventListener('keydown', (event) => {
    if (!lightboxEl.classList.contains('active')) return;
    if (event.key === 'Escape') {
      closeLightbox();
      return;
    }
    // 焦点在原生音视频控件上时，方向键属于进度控制，不做切换
    const tag = event.target ? event.target.tagName : '';
    if (tag === 'VIDEO' || tag === 'AUDIO') return;
    if (event.key === 'ArrowLeft') navLightbox(-1);
    if (event.key === 'ArrowRight') navLightbox(1);
  });

  lightboxEl.addEventListener('click', (event) => {
    // 控件、信息栏、媒体内容（含兜底下载链接）不触发关闭
    if (event.target.closest('.lightbox-close, .lightbox-nav, .lightbox-zoom, .lightbox-bar, .lightbox-media > *')) return;
    closeLightbox();
  });

  // 触摸滑动手势：在 lightbox 中左右滑动切换媒体（媒体控件上的手势不劫持）
  (() => {
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    let touchOnMediaControl = false;
    const minSwipe = 50; // 最小滑动阈值（像素），低于此值忽略避免误触

    lightboxEl.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches[0].screenX;
      touchStartY = event.changedTouches[0].screenY;
      touchOnMediaControl = !!event.target.closest('video, audio');
    }, { passive: true });

    lightboxEl.addEventListener('touchend', (event) => {
      if (touchOnMediaControl) return;
      touchEndX = event.changedTouches[0].screenX;
      touchEndY = event.changedTouches[0].screenY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;
      // 轴向检测：仅在水平方向位移大于垂直方向时触发，防止与纵向滚动冲突
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipe) {
        if (diffX > 0) navLightbox(-1); // 右滑 → 上一项
        else navLightbox(1);            // 左滑 → 下一项
      }
    }, { passive: true });
  })();

  Blog.runPage({
    needIndex: false,
    needPathMap: false,
    task: async () => {
      try {
        Blog.setPageTitle(Blog.t ? Blog.t('gallery.title') : '资源');
        Blog.setNavSiteName();

        galleryData = Blog.config?.features?.gallery;

        const galleryDesc = galleryData?.description;
        if (galleryDesc) {
          const descEl = document.querySelector('[data-i18n="gallery.description"]');
          if (descEl) descEl.textContent = galleryDesc;
        }

        const gallerySectionCopy = galleryData?.sectionCopy;
        if (gallerySectionCopy) {
          const copyEl = document.querySelector('[data-i18n="gallery.galleryCopy"]');
          if (copyEl) copyEl.textContent = gallerySectionCopy;
        }
        if (!galleryData || !galleryData.enabled) {
          Blog.renderState(galleryContentEl, Blog.t ? Blog.t('gallery.notEnabled') : '资源功能未启用。', Blog.t ? Blog.t('gallery.title') : '资源');
          return;
        }

        renderGallery();
      } catch (error) {
        console.error('Failed to load gallery:', error);
        Blog.renderState(galleryContentEl, Blog.t ? Blog.t('gallery.loadFailed') : '资源内容加载失败。');
      }
    }
  });
})();
