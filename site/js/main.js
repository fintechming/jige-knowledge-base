/* ============================================
   鸡哥知识库 - 主交互逻辑 v3.0 (深度美化版)
   ============================================ */

// ===== 全局状态 =====
let currentCategory = '';
let currentYear = 'all';
let currentPage = 1;
const PAGE_SIZE = 50;

// ===== DOM Ready =====
document.addEventListener('DOMContentLoaded', () => {
  // 初始化全局功能
  initReadingProgress();
  initThemeToggle();
  initScrollReveal();
  initNavbar();
  initSearch();
  initBackToTop();

  // 渲染页面内容
  const pageType = document.body.dataset.page;
  
  // 页面入场动画
  const mainEl = document.querySelector('main');
  if (mainEl) mainEl.classList.add('page-enter');

  switch (pageType) {
    case 'home': renderHome(); break;
    case 'articles': renderArchive(); break;
    case 'category': renderCategoryPage(); break;
    case 'article': renderArticleDetail(); break;
  }
});

// ============================================
// 阅读进度条
// ============================================
function initReadingProgress() {
  // 创建进度条元素
  const bar = document.createElement('div');
  bar.className = 'reading-progress';
  bar.style.transform = 'scaleX(0)';
  document.body.prepend(bar);

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
        bar.style.transform = `scaleX(${progress})`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ============================================
// 暗色模式切换
// ============================================
function initThemeToggle() {
  // 在导航栏添加主题按钮（如果不存在）
  const navInner = document.querySelector('.nav-inner');
  if (navInner && !document.querySelector('.theme-toggle')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'theme-toggle';
    toggleBtn.id = 'theme-toggle-btn';
    toggleBtn.title = '切换暗色/亮色模式';
    toggleBtn.innerHTML = '🌙';
    toggleBtn.setAttribute('aria-label', '切换主题');
    
    // 插入到搜索框后面或菜单按钮前面
    const searchBox = navInner.querySelector('.nav-search');
    const menuBtn = navInner.querySelector('.menu-toggle');
    if (searchBox) searchBox.after(toggleBtn);
    else if (menuBtn) menuBtn.before(toggleBtn);
    else navInner.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', () => toggleTheme());
  }

  // 绑定已有的主题按钮
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleTheme());
  });

  // 读取保存的主题偏好
  applySavedTheme();
}

function applySavedTheme() {
  const saved = localStorage.getItem('jige-theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    updateThemeIcon(true);
  } else if (saved === 'light') {
    document.documentElement.removeAttribute('data-theme');
    updateThemeIcon(false);
  } else {
    // 跟随系统
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      updateThemeIcon(true);
    }
  }

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('jige-theme')) {
      if (e.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon(true);
      } else {
        document.documentElement.removeAttribute('data-theme');
        updateThemeIcon(false);
      }
    }
  });
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('jige-theme', 'light');
    updateThemeIcon(false);
    showToast('已切换为亮色模式', 'info');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('jige-theme', 'dark');
    updateThemeIcon(true);
    showToast('已切换为暗色模式', 'info');
  }
}

function updateThemeIcon(isDark) {
  const btns = document.querySelectorAll('.theme-toggle');
  btns.forEach(btn => btn.innerHTML = isDark ? '☀️' : '🌙');
}

// ============================================
// 滚动渐入动画 (Intersection Observer)
// ============================================
function initScrollReveal() {
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.05,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // 错开显示时间
        const delay = Array.from(entry.target.parentElement?.children || [])
          .filter(el => el.classList.contains('article-card'))
          .indexOf(entry.target) * 50;

        setTimeout(() => {
          entry.target.classList.add('visible');
        }, Math.min(delay, 300));

        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // 延迟观察，等待DOM渲染完成
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.querySelectorAll('.article-card').forEach(card => observer.observe(card));
      document.querySelectorAll('.year-header').forEach(h => observer.observe(h));
    }, 100);
  });

  // 分类卡片入场
  const catObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        catObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll('.cat-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = `opacity 0.4s ease ${i * 0.08}s, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.08}s`;
    catObserver.observe(card);
  });

  // 特色功能卡片入场
  const featObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        featObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });

  document.querySelectorAll('.feature-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    card.style.transition = `opacity 0.4s ease ${0.3 + i * 0.08}s, transform 0.4s ease ${0.3 + i * 0.08}s`;
    featObserver.observe(card);
  });
}

// ============================================
// Toast 通知系统
// ============================================
function showToast(message, type = '') {
  // 创建容器（如果不存在）
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // 触发动画
  requestAnimationFrame(() => toast.classList.add('show'));

  // 自动消失
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 2200);
}

// ============================================
// 导航栏 v3.0
// ============================================
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  // 移动端菜单
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.getElementById('nav-links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      menuToggle.textContent = isOpen ? '✕' : '☰';
      document.body.style.overflow = isOpen ? 'hidden' : '';
      
      // 背景遮罩
      let overlay = document.querySelector('.nav-overlay');
      if (isOpen && !overlay) {
        overlay = document.createElement('div');
        overlay.className = 'nav-overlay';
        overlay.style.cssText = `
          position: fixed; inset: 0; top: 60px; z-index: 98;
          background: rgba(0,0,0,0.25); backdrop-filter: blur(2px);
          animation: fadeIn 0.2s ease;
        `;
        overlay.addEventListener('click', closeMobileMenu);
        document.body.appendChild(overlay);
      } else if (!isOpen && overlay) {
        overlay.remove();
      }
    });

    // 点击链接后关闭
    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileMenu));
  }

  function closeMobileMenu() {
    if (navLinks) navLinks.classList.remove('open');
    const toggle = document.querySelector('.menu-toggle');
    if (toggle) toggle.textContent = '☰';
    document.body.style.overflow = '';
    const overlay = document.querySelector('.nav-overlay');
    if (overlay) overlay.remove();
  }

  // 分类卡片点击
  document.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.cat;
      window.location.href = `category.html?cat=${encodeURIComponent(cat)}`;
    });
  });
}

// 添加 fadeIn 动画
const styleSheet = document.createElement('style');
styleSheet.textContent = `@keyframes fadeIn { from{opacity:0} to{opacity:1} }`;
document.head.appendChild(styleSheet);

// ============================================
// 搜索功能
// ============================================
function initSearch() {
  const searchInputs = document.querySelectorAll('.nav-search input');
  searchInputs.forEach(input => {
    let debounceTimer;
    
    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const q = e.target.value.trim().toLowerCase();
        if (q.length > 1) {
          window.location.href = `articles.html?q=${encodeURIComponent(q)}`;
        }
      }, 500); // 稍微延长防抖时间
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(debounceTimer);
        const q = input.value.trim();
        if (q) window.location.href = `articles.html?q=${encodeURIComponent(q)}`;
      }
      // ESC 清空
      if (e.key === 'Escape') input.value = '';
    });
  });
}

// ============================================
// 回到顶部 v3.0
// ============================================
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  
  let lastScroll = 0;
  let scrollDirection = 'down';

  window.addEventListener('scroll', () => {
    const st = window.scrollY;
    
    // 滚动方向检测
    scrollDirection = st > lastScroll ? 'down' : 'up';
    lastScroll = st;
    
    // 向上滚动时更早显示按钮
    btn.classList.toggle('visible', 
      (st > 500 && scrollDirection === 'up') || st > 1200
    );
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('已回到顶部 📖', 'info');
  });
}

// ============================================
// 年份统计（首页）
// ============================================
function renderYearStats() {
  const container = document.getElementById('year-stats');
  if (!container || !SITE_DATA.stats.year_stats) return;

  const years = Object.entries(SITE_DATA.stats.year_stats).sort((a,b) => b[0].localeCompare(a[0]));
  container.innerHTML = years.map(([year, count]) => `
    <div class="stat-item">
      <span class="stat-num">${count}</span>
      <span class="stat-label">${year}年</span>
    </div>
  `).join('');
}

// ============================================
// 首页渲染 v3.0
// ============================================
function renderHome() {
  // 最新文章列表（增加数量到12篇）
  const latestContainer = document.getElementById('latest-articles');
  if (latestContainer) {
    const latest = SITE_DATA.articles.slice(0, 12);
    latestContainer.innerHTML = latest.map((art, i) => {
      const weekDay = getDayOfWeek(art.date);
      return `
        <a href="article.html?slug=${art.slug}" class="article-card" style="transition-delay: ${i * 0.04}s;">
          <div class="art-date-col">
            <div class="art-date-day">${art.date ? art.date.slice(8,10) : ''}</div>
            <div class="art-date-month">${art.date ? getMonthName(art.date.slice(5,7)) : ''}</div>
          </div>
          <div class="art-body">
            <div class="art-title">${escapeHtml(art.title)}</div>
            <div class="art-meta">
              <span class="art-tag">${SITE_DATA.categories[art.category]?.icon || ''} ${SITE_DATA.categories[art.category]?.name || art.category}</span>
              <span class="art-ext">${art.ext.toUpperCase()}</span>
              ${art.file_size_kb ? `<span>${art.file_size_kb}KB</span>` : ''}
              ${weekDay ? `<span>· ${weekDay}</span>` : ''}
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  // 更新统计数字（动态计数动画）
  animateCounter('stat-total', SITE_DATA.articles.length, 1400);
}

// ============================================
// 归档页面渲染 v3.0
// ============================================
function renderArchive() {
  const params = new URLSearchParams(window.location.search);
  const searchQuery = (params.get('q') || '').toLowerCase();
  
  if (params.get('cat')) currentCategory = params.get('cat');
  if (params.get('year')) currentYear = params.get('year');

  let articles = [...SITE_DATA.articles];

  if (searchQuery) {
    articles = articles.filter(a =>
      a.title.toLowerCase().includes(searchQuery)
    );
  }

  renderYearNav(articles);
  renderCatTags(articles);
  applyFilters(articles, searchQuery);
  bindArchiveEvents(searchQuery);
}

function renderYearNav(articles) {
  const bar = document.getElementById('year-nav-bar');
  if (!bar) return;
  
  const years = [...new Set(articles.map(a => a.date ? a.date.slice(0,4) : '').filter(Boolean))]
    .sort((a,b) => b.localeCompare(a));

  bar.innerHTML = `
    <div class="year-nav-inner">
      <button class="year-nav-btn active" data-year="all">📋 全部年份</button>
      ${years.map(y => {
        const count = articles.filter(a => a.date?.startsWith(y)).length;
        return `<button class="year-nav-btn" data-year="${y}"><span>${y}</span><span class="yn-count">(${count})</span></button>`;
      }).join('')}
    </div>
  `;
}

function renderCatTags(allArticles) {
  const bar = document.getElementById('cat-tags-bar');
  if (!bar) return;

  const cats = Object.entries(SITE_DATA.categories).map(([key, val]) => ({
    key,
    name: val.name,
    icon: val.icon,
    count: allArticles.filter(a => a.category === key).length
  }));

  bar.innerHTML = `
    <button class="cat-tag-pill active" data-cat="">📂 全部分类</button>
    ${cats.map(c => `
      <button class="cat-tag-pill" data-cat="${c.key}">
        ${c.icon} ${c.name}
        <span class="pill-count">${c.count}</span>
      </button>
    `).join('')}
  `;
}

function applyFilters(articles, searchQuery) {
  let filtered = [...articles];

  if (currentYear && currentYear !== 'all') {
    filtered = filtered.filter(a => a.date?.startsWith(currentYear));
  }
  if (currentCategory) {
    filtered = filtered.filter(a => a.category === currentCategory);
  }

  filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const container = document.getElementById('timeline-container');
  if (container) {
    if (pageItems.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">🔍</div>
          <p>没有找到匹配的文章<br>试试其他关键词？</p>
          <a href="index.html" class="action-btn">返回首页</a>
        </div>
      `;
    } else {
      container.innerHTML = buildTimelineHTML(pageItems, searchQuery);
      container.classList.add('timeline-container');
      // 重新触发滚动观察
      setTimeout(initScrollReveal, 50);
    }
  }

  const infoEl = document.getElementById('result-info');
  if (infoEl) {
    infoEl.textContent = searchQuery
      ? `🔍 搜索「${escapeHtml(searchQuery)}」共 ${filtered.length} 篇`
      : `📊 共收录 ${filtered.length} 篇文章`;
  }

  renderPagination(totalPages);
}

function buildTimelineHTML(items, highlightQuery) {
  const groups = {};
  items.forEach(item => {
    const year = item.date ? item.date.slice(0,4) : '未知';
    const month = item.date ? item.date.slice(5,7) : '';
    const key = `${year}-${month}`;
    if (!groups[key]) groups[key] = { year, month, items: [] };
    groups[key].items.push(item);
  });

  let html = '';

  const yearGroups = {};
  Object.values(groups).forEach(g => {
    if (!yearGroups[g.year]) yearGroups[g.year] = [];
    yearGroups[g.year].push(g);
  });

  Object.keys(yearGroups).sort((a,b) => b.localeCompare(a)).forEach(year => {
    const yearCount = yearGroups[year].reduce((s,g) => s + g.items.length, 0);
    html += `<div class="year-header">${year}<span class="count">${yearCount} 篇</span></div>`;

    yearGroups[year].sort((a,b) => b.month.localeCompare(a.month)).forEach(g => {
      html += `<div class="month-header">${getMonthName(g.month)}月</div>`;
      g.items.forEach(item => {
        const titleHtml = highlightQuery
          ? escapeHtml(item.title).replace(new RegExp(`(${escapeRegex(highlightQuery)})`, 'gi'), '<mark class="highlight">$1</mark>')
          : escapeHtml(item.title);

        html += `
          <a href="article.html?slug=${item.slug}" class="article-card">
            <div class="art-date-col">
              <div class="art-date-day">${item.date ? item.date.slice(8,10) : '?'}</div>
              <div class="art-date-month">${getDayOfWeek(item.date)}</div>
            </div>
            <div class="art-body">
              <div class="art-title">${titleHtml}</div>
              <div class="art-meta">
                <span class="art-tag">${SITE_DATA.categories[item.category]?.icon||''} ${SITE_DATA.categories[item.category]?.name||item.category}</span>
                <span class="art-ext">${item.ext.toUpperCase()}</span>
                ${item.file_size_kb ? `<span>${item.file_size_kb}KB</span>` : ''}
              </div>
            </div>
          </a>
        `;
      });
    });
  });

  return html;
}

function renderPagination(totalPages) {
  const container = document.getElementById('pagination');
  if (!container) return;

  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '';
  
  // 上一页
  html += `<button class="page-btn ${currentPage<=1?'disabled':''}" data-page="${currentPage-1}" ${currentPage<=1?'disabled':''}>← 上一页</button>`;

  // 页码
  const maxVisible = 7;
  let start = Math.max(1, currentPage - Math.floor(maxVisible/2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  if (start > 1) { 
    html += `<button class="page-btn" data-page="1">1</button>`; 
    if (start > 2) html += '<span style="color:var(--text-muted);padding:0 6px;font-size:13px;">···</span>'; 
  }

  for (let i=start; i<=end; i++) {
    html += `<button class="page-btn ${i===currentPage?'active':''}" data-page="${i}">${i}</button>`;
  }

  if (end < totalPages) { 
    if (end < totalPages-1) html += '<span style="color:var(--text-muted);padding:0 6px;font-size:13px;">···</span>'; 
    html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`; 
  }

  // 下一页
  html += `<button class="page-btn ${currentPage>=totalPages?'disabled':''}" data-page="${currentPage+1}" ${currentPage>=totalPages?'disabled':''}>下一页 →</button>`;

  container.innerHTML = html;
}

function bindArchiveEvents(searchQuery) {
  // 年份导航点击
  document.querySelectorAll('#year-nav-bar .year-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#year-nav-bar .year-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentYear = btn.dataset.year;
      currentPage = 1;
      applyFilters(SITE_DATA.articles.filter(a => !searchQuery || a.title.toLowerCase().includes(searchQuery)), searchQuery);
      
      const timeline = document.getElementById('timeline-container');
      if (timeline) timeline.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // 分类标签点击
  document.querySelectorAll('#cat-tags-bar .cat-tag-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#cat-tags-bar .cat-tag-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.cat;
      currentPage = 1;
      applyFilters(SITE_DATA.articles.filter(a => !searchQuery || a.title.toLowerCase().includes(searchQuery)), searchQuery);
      
      const timeline = document.getElementById('timeline-container');
      if (timeline) timeline.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // 分页点击
  document.getElementById('pagination')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.page-btn');
    if (!btn || btn.disabled) return;
    const p = parseInt(btn.dataset.page);
    if (p >= 1) { 
      currentPage = p; 
      applyFilters(SITE_DATA.articles.filter(a => !searchQuery || a.title.toLowerCase().includes(searchQuery)), searchQuery); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
    }
  });
}

// ============================================
// 分类浏览页
// ============================================
function renderCategoryPage() {
  const params = new URLSearchParams(window.location.search);
  const catKey = params.get('cat') || '';
  const catInfo = SITE_DATA.categories[catKey];
  
  const titleArea = document.getElementById('category-title-area');
  if (titleArea && catInfo) {
    titleArea.innerHTML = `
      <h1 style="font-size:28px;font-weight:800;margin-bottom:8px;">${catInfo.icon} ${catInfo.name}</h1>
      <p style="font-size:15px;color:var(--text-secondary);line-height:1.7;">${catInfo.desc}</p>
    `;
  }

  let catArticles = catKey
    ? SITE_DATA.articles.filter(a => a.category === catKey)
    : [...SITE_DATA.articles];
  catArticles.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 兼容性修复
  catArticles.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const container = document.getElementById('category-timeline');
  if (container) {
    if (catArticles.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>此分类暂无文章</p><br><a href="index.html" class="action-btn">返回首页</a></div>';
    } else {
      container.innerHTML = buildTimelineHTML(catArticles, '');
      container.classList.add('timeline-container');
      setTimeout(initScrollReveal, 80);
    }
  }

  const infoEl = document.getElementById('cat-result-info');
  if (infoEl) infoEl.textContent = `📂 共 ${catArticles.length} 篇`;
}

// ============================================
// 文章详情页 v3.0
// ============================================
function renderArticleDetail() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug') || '';

  const article = SITE_DATA.articles.find(a => a.slug === slug);
  const page = document.getElementById('article-page');

  if (!article || !page) {
    page.innerHTML = '<div class="empty-state"><div class="icon">😕</div><p>文章未找到</p><br><a href="index.html" class="action-btn">返回首页</a></div>';
    return;
  }

  const sameCatArticles = SITE_DATA.articles
    .filter(a => a.category === article.category)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const currentIndex = sameCatArticles.findIndex(a => a.slug === article.slug);
  const prevArticle = currentIndex < sameCatArticles.length - 1 ? sameCatArticles[currentIndex + 1] : null;
  const nextArticle = currentIndex > 0 ? sameCatArticles[currentIndex - 1] : null;

  // PDF路径：使用site/pdf/下的相对路径
  const pdfPath = article.file ? `pdf/${article.file}` : '';
  const pdfFileName = article.file ? article.file.split('/').pop() : (article.title + '.pdf');

  const relatedArticles = sameCatArticles.filter(a => a.slug !== article.slug).slice(0, 4);

  const catLink = document.getElementById('cat-link');
  if (catLink) {
    catLink.href = `category.html?cat=${encodeURIComponent(article.category)}`;
    catLink.textContent = `${SITE_DATA.categories[article.category]?.icon||''} ${SITE_DATA.categories[article.category]?.name||'返回分类'}`;
  }

  page.innerHTML = `
    <a href="javascript:history.back()" class="back-link">← 返回上一页</a>

    <h1>${escapeHtml(article.title)}</h1>

    <div class="article-meta-bar">
      ${article.date ? `<span>📅 ${formatDateCN(article.date)}</span>` : ''}
      <span class="meta-tag">${SITE_DATA.categories[article.category]?.icon||''} ${SITE_DATA.categories[article.category]?.name||article.category}</span>
      <span>📄 PDF · 原文</span>
    </div>

    <!-- PDF 查看器 -->
    ${pdfPath ? `
    <div class="pdf-viewer-area">
      <div class="pdf-toolbar">
        <div class="pdf-toolbar-left">
          <span>📄 原文预览</span>
          <span style="opacity:0.4;">|</span>
          <span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(pdfFileName)}">${escapeHtml(pdfFileName)}</span>
        </div>
        <div class="pdf-toolbar-right">
          <button class="btn-pdf" onclick="openPdfNewWindow('${pdfPath}')">🔗 新窗口打开</button>
          <button class="btn-pdf primary" onclick="downloadPdf('${pdfPath}', '${escapeJs(pdfFileName)}')">⬇️ 下载原文</button>
        </div>
      </div>
      <iframe src="" id="pdf-frame" data-path="${pdfPath}" onload="onPdfLoad(this)" 
              style="display:none;"></iframe>
      <div id="pdf-placeholder" class="pdf-download-hint">
        <span class="hint-icon">📄</span>
        <p>这是一篇 PDF 格式的原始文章<br>支持在线预览或下载到本地阅读</p>
        <div class="pdf-hint-actions">
          <button class="btn-pdf" onclick="loadPdfInIframe()">👁️ 在线预览</button>
          <button class="btn-pdf primary" onclick="downloadPdf('${pdfPath}','${escapeJs(pdfFileName)}'); showToast('正在下载...','success');">⬇️ 下载原文</button>
        </div>
      </div>
    </div>
    ` : '<div class="empty-state" style="margin:24px 0;padding:32px;background:#fff3;border-radius:12px;text-align:center;color:#888;"><p>暂无PDF文件</p></div>'}

    <!-- 上下篇导航 -->
    ${(prevArticle || nextArticle) ? `
    <div class="article-nav">
      <div class="nav-prev" onclick="goArticle('${prevArticle?.slug}')">
        <div class="nav-label">← 上一篇</div>
        <div class="nav-title">${prevArticle ? escapeHtml(prevArticle.title) : '没有更多了'}</div>
      </div>
      <div class="nav-next" onclick="goArticle('${nextArticle?.slug}')">
        <div class="nav-label">下一篇 →</div>
        <div class="nav-title">${nextArticle ? escapeHtml(nextArticle.title) : '没有更多了'}</div>
      </div>
    </div>
    ` : ''}

    <!-- 相关文章推荐 -->
    ${relatedArticles.length > 0 ? `
    <div class="related-section">
      <h2 class="section-title" style="margin-bottom:4px;"><span class="emoji">📖</span> 同类推荐</h2>
      <p class="section-subtitle">来自「${SITE_DATA.categories[article.category]?.name||article.category}」的其他文章</p>
      <div class="related-grid">
        ${relatedArticles.map(r => `
          <a href="article.html?slug=${r.slug}" class="related-item">
            <div class="related-date">${r.date || ''}</div>
            <div class="related-title">${escapeHtml(r.title)}</div>
          </a>
        `).join('')}
      </div>
    </div>
    ` : ''}
  `;

  document.title = `${article.title} · 鸡哥知识库`;
}

// ============================================
// PDF 操作函数
// ============================================
function loadPdfInIframe() {
  const frame = document.getElementById('pdf-frame');
  const placeholder = document.getElementById('pdf-placeholder');
  if (frame && placeholder) {
    const path = frame.dataset.path;
    frame.src = path;
    frame.style.display = 'block';
    placeholder.style.display = 'none';
  }
}

function onPdfLoad(frame) {
  try {
    const placeholder = document.getElementById('pdf-placeholder');
    if (frame.contentDocument || frame.contentWindow) {
      if (placeholder) placeholder.style.display = 'none';
      frame.style.display = 'block';
    }
  } catch(e) {
    const placeholder = document.getElementById('pdf-placeholder');
    if (placeholder) {
      placeholder.querySelector('p').textContent = 'PDF 已就绪，请在下方选择查看方式';
    }
  }
}

function openPdfNewWindow(path) {
  window.open(path, '_blank');
  showToast('在新窗口中打开', 'info');
}

function downloadPdf(path, filename) {
  const a = document.createElement('a');
  a.href = path;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function goArticle(slug) {
  if (slug) window.location.href = `article.html?slug=${slug}`;
}

// ============================================
// 工具函数
// ============================================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeJs(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getMonthName(m) {
  const months = ['','一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  return months[parseInt(m)] || m;
}

function getDayOfWeek(dateStr) {
  if (!dateStr) return '';
  const days = ['周日','周一','周二','周三','周四','周五','周六'];
  try {
    const d = new Date(dateStr.replace(/-/g, '/'));
    return days[d.getDay()] || '';
  } catch { return ''; }
}

function formatDateCN(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.replace(/-/g, '/'));
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  } catch { return dateStr; }
}

function animateCounter(id, target, duration) {
  const el = document.getElementById(id);
  if (!el) return;
  
  const startTime = performance.now();
  const startVal = 0;
  
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutExpo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    el.textContent = Math.round(startVal + (target - startVal) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ============================================
// AI 问答组件 (鸡哥下午茶)
// ============================================

// 知识库问答预设回复（基于鸡哥文章内容）
const AI_KNOWLEDGE_BASE = {
  '房价': {
    keywords: ['房价', '房地产', '房子', '楼市', '买房'],
    answer: `关于**房价和房地产市场**，鸡哥在「天机奇谈」系列中有大量深度分析：

📊 **核心观点：**
• 中国房地产经历了长达20年的上涨周期，目前正处于历史性转折点
• 房地产的底层逻辑已经从"供不应求"转变为"结构性过剩"
• 一二线城市和三四线城市的分化会越来越明显
• "房住不炒"不是短期政策，而是长期国策

🏠 **给普通人的建议：**
• 自住需求：关注核心城市核心地段，不要追高
• 投资需求：房地产已不再是最佳投资品，收益率远低于其他资产类别
• 杠杆风险：高杠杆炒房的黄金时代已经过去

💡 鸡哥原话："普通人最大的财富幻觉就是觉得房子永远涨。"

📖 **相关文章（共271篇天机奇谈）：**
→ 可前往「天机奇谈」分类浏览完整系列`,
  },
  '股票': {
    keywords: ['股票', '买什么', '投资', 'A股', '美股'],
    answer: `关于**股票投资策略**，鸡哥的知识库中有很多精彩观点：

📈 **核心原则：**
• **选择比努力重要**——选对赛道比频繁操作更重要
• **长期主义**——好公司+合理价格+时间复利
• **逆向思维**——别人恐惧时贪婪，但要有独立判断能力
• **仓位管理**——永远留有现金，不要满仓梭哈

🔑 **鸡哥的投资心法：**
1. 不懂的不碰，看懂的下注
2. 分散配置，但不盲目分散
3. 关注现金流而非账面浮盈
4. 定期复盘，承认错误

🌏 **A股 vs 美股：**
• A股更适合波段操作和题材博弈
• 美股更适合长线持有优质科技公司
• 两者可以组合配置

📖 **推荐阅读：「投资心得」分类中的精选文章**`,
  },
  '普通': {
    keywords: ['普通人', '怎么投资', '建议', '策略', '入门'],
    answer: `关于**普通人的投资之路**，这是鸡哥反复强调的话题：

💡 **第一步：建立正确认知**
• 抵抗通胀是基本目标，不是暴富
• 复利是世界上最强大的力量
• 时间是散户最大的优势

💰 **第二步：资产配置**
• 应急资金：6-12个月生活费（货币基金/存款）
• 核心资产：宽基指数基金（沪深300/标普500）
• 卫星资产：个股/行业基金（不超过20%）
• 学习投资：每年投入收入的5-10%用于自我提升

⚠️ **避坑清单**
❌ 不要借钱炒股
❌ 不要追涨杀跌
❌ 不要相信内幕消息
❌ 不要把鸡蛋放在一个篮子里

🎯 **鸡哥名言：**
> "投资的本质是用现在的确定性交换未来的可能性。如果你连现在都把握不了，就别谈未来了。"

📖 **延伸阅读：「按照这七步做，回报率比你跳槽、转行、深造都大得多」**`,
  },
  '美股': {
    keywords: ['美股', '美元', '美股还是A股', '长期持有'],
    answer: `关于**美股 vs A股的选择**，鸡哥在「美元资产」专题中有详细分析：

🇺🇸 **美股的优势：**
• 全球最优质的上市公司集群（苹果、微软、谷歌...）
• 制度完善，信息披露透明
• 长期牛市趋势，适合定投
• 对冲人民币贬值风险

🇨🇳 **A股的特点：**
• 政策驱动特征明显
• 散户占比高，波动大
• 部分赛道有独特优势（新能源、高端制造）
• 更适合有经验的投资者

🤝 **鸡哥的建议：**
对于大多数普通人，**70% A股指数 + 30% 美股指数**是一个不错的起点。随着认知提升，逐步调整比例。

关键不在于选A或B，而在于你**理解自己投的是什么**。

📖 **相关文章：「美元资产」分类（5篇）+ 「投资心得」**`,
  },
};

// 默认回复
const DEFAULT_REPLY = `这是一个很好的问题！🤔

基于鸡哥知识库的697篇文章，我帮你整理了一下：

📚 **你可以尝试以下方向：**
• 输入 **"房价"** — 了解房地产分析
• 输入 **"股票"** — 了解投资策略
• 输入 **"普通人"** — 了解入门建议
• 输入 **"美股"** — 了解美元资产

或者直接去这些分类逛逛：
→ 🏠 **天机奇谈** (271篇房地产深度分析)
→ 💡 **投资心得** (19篇方法论精华)
→ 📅 **投资日记** (177篇实战记录)

💡 提示：AI功能正在持续优化中，更多智能问答即将上线！`;

let aiChatOpen = false;

function toggleAiChat() {
  const panel = document.getElementById('ai-chat-panel');
  const body = document.querySelector('.ai-card-body');
  const btn = document.getElementById('ai-start-btn');
  
  if (!panel) return;
  
  aiChatOpen = !aiChatOpen;
  
  if (aiChatOpen) {
    panel.style.display = 'block';
    body.style.display = 'none';
    
    // 添加欢迎消息
    const messagesEl = document.getElementById('ai-chat-messages');
    if (messagesEl && messagesEl.children.length === 0) {
      addBotMessage('你好！我是鸡哥知识库的AI助手 ☕\n\n你可以问我任何关于投资、房产、理财的问题，我会从697篇文章中为你找到答案。\n\n试试点击上方的快捷问题，或者直接输入你的问题吧！');
    }
    
    // 聚焦输入框
    setTimeout(() => {
      const input = document.getElementById('ai-chat-input');
      if (input) input.focus();
    }, 400);
  } else {
    panel.style.display = 'none';
    body.style.display = 'flex';
  }
}

function openAiChat(question) {
  // 先打开面板
  const panel = document.getElementById('ai-chat-panel');
  const body = document.querySelector('.ai-card-body');
  if (panel && body) {
    panel.style.display = 'block';
    body.style.display = 'none';
    aiChatOpen = true;
    
    // 清空旧消息，添加用户问题
    const messagesEl = document.getElementById('ai-chat-messages');
    if (messagesEl) messagesEl.innerHTML = '';
    
    // 添加用户消息
    addUserMessage(question);
    
    // 模拟AI思考并回复
    showTyping();
    setTimeout(() => {
      hideTyping();
      generateAiReply(question);
    }, 1200 + Math.random() * 800);
  }
}

function sendAiMessage() {
  const input = document.getElementById('ai-chat-input');
  if (!input) return;
  
  const question = input.value.trim();
  if (!question) return;
  
  addUserMessage(question);
  input.value = '';
  
  // 显示 typing 动画
  showTyping();
  
  // 模拟延迟后回复
  setTimeout(() => {
    hideTyping();
    generateAiReply(question);
  }, 1000 + Math.random() * 1000);
}

function addUserMessage(text) {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;
  
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.style.justifyContent = 'flex-end';
  row.innerHTML = `
    <div class="msg-bubble user">${escapeHtml(text)}</div>
    <div class="msg-avatar user">🧑</div>
  `;
  container.appendChild(row);
  scrollToBottom(container);
}

function addBotMessage(text) {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;
  
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.innerHTML = `
    <div class="msg-avatar bot">🐔</div>
    <div class="msg-bubble bot">${formatMarkdown(text)}</div>
  `;
  container.appendChild(row);
  scrollToBottom(container);
}

function showTyping() {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;
  
  const row = document.createElement('div');
  row.className = 'msg-row';
  row.id = 'typing-row';
  row.innerHTML = `
    <div class="msg-avatar bot">🐔</div>
    <div class="msg-bubble bot msg-typing">
      <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
      思考中...
    </div>
  `;
  container.appendChild(row);
  scrollToBottom(container);
}

function hideTyping() {
  const el = document.getElementById('typing-row');
  if (el) el.remove();
}

function scrollToBottom(el) {
  requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
}

function formatMarkdown(text) {
  // 简单的 markdown 渲染
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:3px;font-size:13px;">$1</code>')
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:2px solid #c45c26;padding-left:10px;margin:6px 0;color:rgba(232,154,69,0.9);">$1</blockquote>')
    .replace(/\n/g, '<br>');
}

function generateAiReply(question) {
  const q = question.toLowerCase();
  
  // 匹配知识库
  for (const [key, data] of Object.entries(AI_KNOWLEDGE_BASE)) {
    if (data.keywords.some(kw => q.includes(kw))) {
      addBotMessage(data.answer);
      return;
    }
  }
  
  // 默认回复
  addBotMessage(DEFAULT_REPLY);
}
