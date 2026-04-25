window.BlogUI = {
  setupMobileNav() {
    const navEl = document.querySelector('.nav');
    const navLinks = document.getElementById('nav-links');
    if (!navEl || !navLinks) return;
    if (navEl.querySelector('.nav-toggle')) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'nav-toggle';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', '打开菜单');
    toggleBtn.innerHTML = '<span></span><span></span><span></span>';
    navEl.appendChild(toggleBtn);

    const overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);

    const toggleMenu = () => {
      const isOpen = navLinks.classList.contains('open');
      navLinks.classList.toggle('open');
      toggleBtn.classList.toggle('active');
      overlay.classList.toggle('active');
      document.body.style.overflow = isOpen ? '' : 'hidden';
    };

    const closeMenu = () => {
      navLinks.classList.remove('open');
      toggleBtn.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    toggleBtn.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', closeMenu);
    navLinks.addEventListener('click', (event) => {
      if (event.target.classList.contains('nav-link')) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeMenu();
    });
  },

  setupBackToTop() {
    if (document.querySelector('.back-to-top')) return;

    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', '返回顶部');
    btn.innerHTML = '↑';
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(btn);

    const updateVisibility = () => {
      btn.classList.toggle('visible', window.scrollY > 300);
    };

    window.addEventListener('scroll', updateVisibility, { passive: true });
    updateVisibility();
  },

  setupProgressBar() {
    if (!document.querySelector('.post-article')) return;
    if (document.querySelector('.reading-progress')) return;

    const bar = document.createElement('div');
    bar.className = 'reading-progress';
    bar.innerHTML = '<div class="reading-progress-bar"></div>';
    document.body.appendChild(bar);

    const progressBar = bar.querySelector('.reading-progress-bar');
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = `${progress}%`;
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  },

  generateTOC() {
    const postBody = document.querySelector('.post-body, .markdown-body');
    if (!postBody) return;

    const headings = postBody.querySelectorAll('h2, h3');
    if (headings.length < 3) return;

    const tocContainer = document.createElement('nav');
    tocContainer.className = 'toc-container';
    tocContainer.innerHTML = '<div class="toc-header"><span>目录</span><button type="button" class="toc-toggle">收起</button></div><div class="toc-list"></div>';

    const tocList = tocContainer.querySelector('.toc-list');
    headings.forEach((heading, index) => {
      const id = `heading-${index}`;
      heading.id = id;

      const link = document.createElement('a');
      link.href = `#${id}`;
      link.className = `toc-link${heading.tagName === 'H3' ? ' toc-h3' : ''}`;
      link.textContent = heading.textContent;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        tocList.querySelectorAll('.toc-link').forEach((item) => item.classList.remove('active'));
        link.classList.add('active');
      });
      tocList.appendChild(link);
    });

    const toggleBtn = tocContainer.querySelector('.toc-toggle');
    toggleBtn.addEventListener('click', () => {
      tocList.classList.toggle('collapsed');
      toggleBtn.textContent = tocList.classList.contains('collapsed') ? '展开' : '收起';
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          tocList.querySelectorAll('.toc-link').forEach((item) => {
            item.classList.toggle('active', item.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });

    headings.forEach((heading) => observer.observe(heading));

    const postArticle = document.querySelector('.post-article');
    if (postArticle) {
      postArticle.style.position = 'relative';
      postArticle.insertBefore(tocContainer, postArticle.querySelector('.post-body, .markdown-body'));
    }
  },

  setupDirTreePanel() {
    document.addEventListener('click', (event) => {
      const panel = document.querySelector('.dir-tree-panel');
      if (!panel || panel.style.display === 'none') return;

      if (!panel.contains(event.target) && !event.target.closest('.dir-tree-toggle')) {
        panel.style.display = 'none';
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const panel = document.querySelector('.dir-tree-panel');
      if (panel && panel.style.display !== 'none') panel.style.display = 'none';
    });
  },

  setupCardAnimations() {
    if (!('IntersectionObserver' in window)) return;
    const cards = document.querySelectorAll('.post-card, .link-card, .moment-card, .gallery-item');
    if (cards.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          entry.target.style.animationDelay = `${index * 0.04}s`;
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    cards.forEach((card) => {
      observer.observe(card);
    });
  },

  setupCommonFeatures() {
    this.setupBackToTop();
    this.setupProgressBar();
    this.setupDirTreePanel();
  }
};
