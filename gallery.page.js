(() => {
  const galleryContentEl = document.getElementById('gallery-content');
  const lightboxEl = document.getElementById('lightbox');
  const lightboxImgEl = document.getElementById('lightbox-img');
  const lightboxFileNameEl = document.getElementById('lightbox-filename');
  const lightboxCounterEl = document.getElementById('lightbox-counter');
  const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
  const lightboxPrevBtn = document.getElementById('lightbox-prev-btn');
  const lightboxNextBtn = document.getElementById('lightbox-next-btn');

  let galleryData = null;
  let currentGroup = null;
  let currentPath = '';
  let currentImages = [];
  let lightboxIndex = 0;
  let displayedCount = 0;
  const perPage = 20;

  function isImagePathSafe(filePath) {
    if (!filePath || typeof filePath !== 'string') return false;
    if (/^(javascript|data|vbscript|http:)/i.test(filePath)) return false;
    if (filePath.includes('..')) return false;
    return true;
  }

  function countAllImages(data) {
    if (!data) return 0;
    let count = (data.images || []).length;
    for (const sub of Object.values(data.subfolders || {})) {
      count += countAllImages(sub);
    }
    return count;
  }

  function renderGallery() {
    const groups = galleryData.groups || [];
    if (groups.length === 0) {
      Blog.renderState(galleryContentEl, '暂无图集分组。', '图库');
      return;
    }

    if (!currentGroup) currentGroup = groups[0].id;

    let html = '<div class="gallery-groups">';
    for (const group of groups) {
      const isActive = group.id === currentGroup;
      const images = galleryData.images?.[group.id] || [];
      const count = countAllImages(images);
      html += `<button class="group-btn ${isActive ? 'active' : ''}" type="button" data-action="select-group" data-group-id="${Blog.escapeHtml(group.id)}">
        <span>${Blog.escapeHtml(group.icon || '图库')}</span>
        <span>${Blog.escapeHtml(group.name)}</span>
        <span class="count">${count}</span>
      </button>`;
    }
    html += '</div><div id="gallery-view"></div>';

    galleryContentEl.innerHTML = html;
    renderGroupContent();
  }

  function renderGroupContent() {
    const galleryViewEl = document.getElementById('gallery-view');
    const group = galleryData.groups.find((item) => item.id === currentGroup);
    if (!group || !galleryViewEl) return;

    const groupImages = galleryData.images?.[currentGroup];
    if (!groupImages) {
      Blog.renderState(galleryViewEl, '当前分组暂时没有图片。', '空');
      return;
    }

    let currentData = groupImages;
    const pathParts = currentPath ? currentPath.split('/') : [];
    for (const part of pathParts) {
      currentData = currentData.subfolders?.[part];
      if (!currentData) break;
    }

    if (!currentData) {
      Blog.renderState(galleryViewEl, '目录路径不存在。');
      return;
    }

    let html = '';
    if (currentPath) {
      html += '<div class="gallery-breadcrumb">';
      html += `<span class="breadcrumb-item" data-action="navigate-path" data-path="">${Blog.escapeHtml(group.icon || '图库')} ${Blog.escapeHtml(group.name)}</span>`;
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

    const subfolders = currentData.subfolders || {};
    if (Object.keys(subfolders).length > 0) {
      html += '<div class="gallery-folders">';
      for (const [name, data] of Object.entries(subfolders)) {
        const subPath = currentPath ? `${currentPath}/${name}` : name;
        const count = countAllImages(data);
        html += `<button class="folder-card" type="button" data-action="navigate-path" data-path="${Blog.escapeHtml(subPath)}">
          <span class="folder-icon">□</span>
          <div class="folder-info">
            <div class="folder-name">${Blog.escapeHtml(name)}</div>
            <div class="folder-count">${count} 张图片</div>
          </div>
        </button>`;
      }
      html += '</div>';
    }

    const images = (currentData.images || []).filter(isImagePathSafe);
    currentImages = images;

    if (images.length > 0) {
      const showImages = images.slice(0, displayedCount + perPage);
      displayedCount = showImages.length;
      html += '<div class="gallery-grid">';
      showImages.forEach((img, idx) => {
        const filename = img.split('/').pop();
        html += `<button class="gallery-item" type="button" data-action="open-lightbox" data-index="${idx}">
          <img src="${Blog.escapeHtml(Blog.resolveAsset(img))}" alt="${Blog.escapeHtml(filename)}" class="loading" onload="this.classList.remove('loading');this.classList.add('loaded')" loading="lazy">
          <div class="gallery-item-overlay">
            <div class="gallery-item-name">${Blog.escapeHtml(filename)}</div>
          </div>
        </button>`;
      });
      html += '</div>';

      if (displayedCount < images.length) {
        html += `<button class="load-more" type="button" data-action="load-more">加载更多（剩余 ${images.length - displayedCount} 张）</button>`;
      }
    } else if (Object.keys(subfolders).length === 0) {
      html += '<div class="empty-state"><div class="icon">空</div><p>这个目录下还没有图片。</p></div>';
    }

    galleryViewEl.innerHTML = html;
    Blog.setupCardAnimations();
  }

  function updateLightbox() {
    const img = currentImages[lightboxIndex];
    if (!img) return;
    const filename = img.split('/').pop();
    lightboxImgEl.src = Blog.resolveAsset(img);
    lightboxFileNameEl.textContent = filename;
    lightboxCounterEl.textContent = `${lightboxIndex + 1} / ${currentImages.length}`;
    lightboxPrevBtn.disabled = lightboxIndex === 0;
    lightboxNextBtn.disabled = lightboxIndex === currentImages.length - 1;
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
  }

  function navLightbox(dir) {
    lightboxIndex += dir;
    if (lightboxIndex < 0) lightboxIndex = 0;
    if (lightboxIndex >= currentImages.length) lightboxIndex = currentImages.length - 1;
    updateLightbox();
  }

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

    if (action === 'load-more') {
      renderGroupContent();
    }
  });

  lightboxCloseBtn.addEventListener('click', closeLightbox);
  lightboxPrevBtn.addEventListener('click', () => navLightbox(-1));
  lightboxNextBtn.addEventListener('click', () => navLightbox(1));

  document.addEventListener('keydown', (event) => {
    if (!lightboxEl.classList.contains('active')) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') navLightbox(-1);
    if (event.key === 'ArrowRight') navLightbox(1);
  });

  lightboxEl.addEventListener('click', (event) => {
    if (event.target.id === 'lightbox') closeLightbox();
  });

  (() => {
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    const minSwipe = 50;

    lightboxEl.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches[0].screenX;
      touchStartY = event.changedTouches[0].screenY;
    }, { passive: true });

    lightboxEl.addEventListener('touchend', (event) => {
      touchEndX = event.changedTouches[0].screenX;
      touchEndY = event.changedTouches[0].screenY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipe) {
        if (diffX > 0) navLightbox(-1);
        else navLightbox(1);
      }
    }, { passive: true });
  })();

  Blog.runPage({
    needIndex: false,
    needPathMap: false,
    task: async () => {
      try {
        Blog.setPageTitle('图库');
        Blog.setNavSiteName();

        galleryData = Blog.config?.features?.gallery;
        if (!galleryData || !galleryData.enabled) {
          Blog.renderState(galleryContentEl, '图库功能未启用。', '图库');
          return;
        }

        renderGallery();
      } catch (error) {
        console.error('Failed to load gallery:', error);
        Blog.renderState(galleryContentEl, '图库内容加载失败。');
      }
    }
  });
})();
