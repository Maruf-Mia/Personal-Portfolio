// Interactions: theme toggle, mobile menu, smooth scrolling, active-section nav,
// count-up numbers, project filter, copy email, contact form, footer year.
(() => {
  const root = document.documentElement;

  // Theme toggle
  const toggle = document.getElementById('theme-toggle');
  const label = document.querySelector('[data-theme-label]');
  const syncLabel = () => { label.textContent = root.classList.contains('dark') ? 'Light' : 'Dark'; };
  syncLabel();
  toggle.addEventListener('click', () => {
    const dark = root.classList.toggle('dark');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
    syncLabel();
  });

  // Mobile menu
  const header = document.querySelector('.site-header');
  const menuBtn = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const menuIsOpen = () => !menu.classList.contains('hidden');
  const setMenu = (open, returnFocus = false) => {
    menu.classList.toggle('hidden', !open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuBtn.querySelector('[data-icon="open"]').classList.toggle('hidden', open);
    menuBtn.querySelector('[data-icon="close"]').classList.toggle('hidden', !open);
    if (!open && returnFocus) menuBtn.focus();
  };
  menuBtn.addEventListener('click', () => setMenu(!menuIsOpen()));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuIsOpen()) setMenu(false, true); });
  document.addEventListener('click', (e) => { if (menuIsOpen() && !header.contains(e.target)) setMenu(false); });
  matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // Smooth scrolling for in-page links, offset by the sticky header
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const scrollToTarget = (target) => {
    const offset = target.id === 'home' ? 0 : header.offsetHeight + 16;
    const top = Math.max(target.getBoundingClientRect().top + window.scrollY - offset, 0);
    window.scrollTo({ top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  };
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    scrollToTarget(target);
    try { history.pushState(null, '', `#${id}`); } catch (err) {}
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  // Highlight the nav link for the section in view
  const links = [...document.querySelectorAll('[data-nav]')];
  const sections = [...document.querySelectorAll('[data-section]')];
  const setActive = (id) => links.forEach((a) => {
    const on = a.getAttribute('href') === `#${id}`;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
  });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
  }, { rootMargin: '-30% 0px -60% 0px' });
  sections.forEach((s) => observer.observe(s));
  window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) setActive('contact');
  }, { passive: true });

  // Count up the key numbers once, when they scroll into view
  const counters = document.querySelectorAll('[data-count]');
  const countUp = (el) => {
    const end = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / 1200, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const countObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        countUp(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => {
      el.textContent = `0${el.dataset.suffix || ''}`;
      countObserver.observe(el);
    });
  }

  // Filter projects by category
  const filterButtons = document.querySelectorAll('[data-filter]');
  const projectCards = document.querySelectorAll('[data-category]');
  const projectCount = document.getElementById('project-count');
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      let shown = 0;
      filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      projectCards.forEach((card) => {
        const match = filter === 'all' || card.dataset.category === filter;
        card.hidden = !match;
        if (match) shown += 1;
      });
      projectCount.textContent = `Showing ${shown} ${shown === 1 ? 'project' : 'projects'}`;
    });
  });

  // Copy email
  const emailLink = document.getElementById('email-link');
  const status = document.getElementById('copy-status');
  document.getElementById('copy-email').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(emailLink.textContent.trim());
      status.textContent = 'Email copied';
    } catch (e) {
      status.textContent = 'Copy failed. Select the address instead.';
    }
    setTimeout(() => { status.textContent = ''; }, 2500);
  });

  // Contact form: posts to the endpoint in data-endpoint; opens the email app until one is configured
  const form = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');
  const submitBtn = document.getElementById('form-submit');
  const setStatus = (text, state) => { formStatus.textContent = text; formStatus.dataset.state = state || ''; };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = new FormData(form);
    const endpoint = form.dataset.endpoint;

    if (!endpoint || endpoint.includes('your-form-id')) {
      const to = emailLink.textContent.trim();
      const body = `${data.get('message')}\n\n${data.get('name')} (${data.get('email')})`;
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(data.get('subject'))}&body=${encodeURIComponent(body)}`;
      setStatus('Opening your email app…', 'success');
      return;
    }

    submitBtn.disabled = true;
    setStatus('Sending…', '');
    try {
      const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      form.reset();
      setStatus('Thanks. Your message was sent.', 'success');
    } catch (err) {
      setStatus('The message could not be sent. Please email me directly instead.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();
})();
