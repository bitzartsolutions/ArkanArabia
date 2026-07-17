/* ============================================================
   Arkan Arabia – Main Script
   ============================================================ */

/* ── 1. Inject shared components ─────────────────────────── */
async function loadComponent(selector, url) {
  try {
    const res  = await fetch(url);
    let html   = await res.text();
    /* Replace {ROOT} tokens so component links are always correct */
    html = html.replaceAll('{ROOT}', rootPath());
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  } catch (e) {
    console.warn(`Could not load component: ${url}`, e);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadComponent('#site-header',  rootPath() + 'components/header.html'),
    loadComponent('#site-footer',  rootPath() + 'components/footer.html'),
    loadComponent('#mob-header',   rootPath() + 'components/mobile-header.html'),
    loadComponent('#mob-nav',      rootPath() + 'components/mobile-nav.html'),
    loadComponent('#mob-footer',   rootPath() + 'components/mobile-footer.html'),
  ]);

  initNav();
  initReveal();
  initCounters();
  highlightActiveNav();
  initMobileNav();       /* highlight active mobile drawer + bottom nav link */
  initMobileDrawer();    /* wire hamburger & overlay after HTML is injected  */
});

/* Determine root path relative to current page depth */
function rootPath() {
  const pathParts = location.pathname.split('/').filter(Boolean);
  const isDirectoryStylePath = location.pathname.endsWith('/');
  const levelsUp = isDirectoryStylePath ? pathParts.length : Math.max(pathParts.length - 1, 0);
  if (levelsUp <= 0) return './';
  return '../'.repeat(levelsUp);
}

/* ── 2. Mobile Drawer ───────────────────────────────────── */
function initMobileDrawer() {
  const btn = document.getElementById('mob-hamburger');
  if (btn) btn.addEventListener('click', openMobDrawer);
}

function openMobDrawer() {
  const drawer  = document.getElementById('mob-drawer');
  const overlay = document.getElementById('mob-overlay');
  if (drawer)  { drawer.style.transform  = 'translateX(0)'; }
  if (overlay) { overlay.classList.remove('hidden'); }
  document.body.style.overflow = 'hidden';
}

function closeMobDrawer() {
  const drawer  = document.getElementById('mob-drawer');
  const overlay = document.getElementById('mob-overlay');
  if (drawer)  { drawer.style.transform  = 'translateX(-100%)'; }
  if (overlay) { overlay.classList.add('hidden'); }
  document.body.style.overflow = '';
}

/* ── 3. Mobile Active Nav ──────────────────────────────── */
function initMobileNav() {
  const pathParts = location.pathname.split('/').filter(Boolean);
  const page = (pathParts[pathParts.length - 1] || 'home').replace('.html', '');

  /* Bottom nav links */
  document.querySelectorAll('.mob-nav-link').forEach(link => {
    const key = (link.getAttribute('data-mob-nav') || '').split('/').pop().replace('.html', '');
    if (key === page) {
      link.classList.remove('text-on-surface-variant');
      link.classList.add('text-primary');
      /* filled icon for active */
      const icon = link.querySelector('.mob-nav-icon');
      if (icon) icon.style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";
    }
  });

  /* Drawer links */
  document.querySelectorAll('.mob-drawer-link').forEach(link => {
    const key = (link.getAttribute('data-mob-nav') || '').split('/').pop().replace('.html', '');
    if (key === page) {
      link.classList.remove('text-on-surface-variant');
      link.classList.add('text-primary', 'bg-primary-container/10');
    }
  });
}

/* ── 4. Sticky Desktop Navbar ───────────────────────────── */
function initNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  const inner = nav.querySelector('[data-nav-inner]');
  const siteHeader = document.getElementById('site-header');

  function applyDesktopHeaderOffset() {
    if (!siteHeader) return;

    if (window.matchMedia('(min-width: 768px)').matches) {
      const topBar = siteHeader.firstElementChild;
      const topBarHeight = topBar ? topBar.getBoundingClientRect().height : 0;
      const navHeight = nav.getBoundingClientRect().height;
      siteHeader.style.marginBottom = `${Math.max(Math.ceil(navHeight - topBarHeight), 0)}px`;
    } else {
      siteHeader.style.marginBottom = '';
    }
  }

  applyDesktopHeaderOffset();
  window.addEventListener('resize', applyDesktopHeaderOffset, { passive: true });

  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      if (inner) {
        inner.classList.remove('max-w-7xl');
        inner.classList.add('max-w-full');
      }
    } else {
      if (inner) {
        inner.classList.add('max-w-7xl');
        inner.classList.remove('max-w-full');
      }
    }
  }, { passive: true });

  /* Desktop mobile-menu toggle (inside header.html) */
  const menuBtn    = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
  }
}

/* ── 5. Scroll Reveal ───────────────────────────────────── */
function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ── 6. Animated Counters ───────────────────────────────── */
function initCounters() {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.getAttribute('data-target'), 10);
      const suffix = el.getAttribute('data-suffix') || (target === 100 ? '%' : '+');
      let count    = 0;
      const step   = target / (2000 / 16);

      const tick = () => {
        count += step;
        if (count < target) {
          el.innerText = Math.ceil(count);
          requestAnimationFrame(tick);
        } else {
          el.innerText = target + suffix;
        }
      };
      tick();
      counterObserver.unobserve(el);
    });
  });

  document.querySelectorAll('.counter').forEach(c => counterObserver.observe(c));
}

/* ── 7. Highlight active desktop nav link ───────────────── */
function highlightActiveNav() {
  const pathParts = location.pathname.split('/').filter(Boolean);
  const page = (pathParts[pathParts.length - 1] || 'home').replace('.html', '');
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = (link.getAttribute('href') || '').split('/').pop().replace('.html', '');
    if (href === page) link.classList.add('active');
  });
}

/* ── 8. Fleet carousel buttons ──────────────────────────── */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-fleet-prev], [data-fleet-next]');
  if (!btn) return;
  const rail = document.getElementById('fleet-rail');
  if (!rail) return;
  const card = rail.querySelector('.fleet-card');
  const cardW = card ? card.offsetWidth + 24 : 424;
  rail.scrollBy({ left: btn.dataset.fleetNext !== undefined ? cardW : -cardW, behavior: 'smooth' });
});
