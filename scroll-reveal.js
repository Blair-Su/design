// Animate content, while section anchors, dividers and sticky navigation stay put.
export const REVEAL_SELECTORS = [
  '.hero h1', '.work-heading h2', '.project-card > .project-link',
  '.about-intro-heading', '.about-intro-prose > p', '.about-intro-photos > figure',
  '.about-section-heading > h2', '.about-resume-identity > div', '.about-resume-description > p',
  '.about-gallery', '.footer-brand', '.footer-column',
  ...['hhi', 'lh', 'sc', 'nl'].flatMap(prefix => [
    `.${prefix}-article :is(h1, h2, h3, h4, p, figure, table)`,
    `.${prefix}-project-meta`, `.${prefix}-summary`, `.${prefix}-reflection-card`,
  ]),
  '.lh-findings-grid', '.lh-impact', '.nl-survey-stats',
  '.hhi-design-notes > li', '.hhi-email-preview',
  '.case-article :is(h1, h2, h3, h4, p, figure, .case-responsive-artwork)',
].join(', ');

export function initScrollReveal({ win = window, doc = document } = {}) {
  const motion = win.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !win.IntersectionObserver) return;

  const candidates = [...doc.querySelectorAll(REVEAL_SELECTORS)].filter(element =>
    !element.closest('dialog, nav, [aria-hidden="true"], [data-scroll-reveal="off"]'));
  const selected = new Set(candidates);
  // Never fade a child twice when its card or figure is already selected.
  const targets = candidates.filter(element => {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (selected.has(parent)) return false;
    }
    return true;
  });
  const pending = new Set();
  const active = new Set();
  let observer;

  function finish(element) {
    element.classList.remove('scroll-reveal-pending', 'scroll-reveal-enter');
    element.style.removeProperty('--reveal-delay');
    pending.delete(element);
    active.delete(element);
    observer?.unobserve(element);
  }

  function show(element, delay = 0, animate = true) {
    if (!pending.has(element)) return;
    if (!animate || motion.matches) return finish(element);
    pending.delete(element);
    observer.unobserve(element);
    element.style.setProperty('--reveal-delay', `${delay}ms`);
    element.classList.remove('scroll-reveal-pending');
    element.classList.add('scroll-reveal-enter');
    active.add(element);
  }

  function revealWithin(target) {
    if (!target) return;
    for (const element of [...pending, ...active]) {
      if (target.contains(element) || element.contains(target)) finish(element);
    }
  }

  function revealAnchor(hash) {
    let id;
    try { id = decodeURIComponent(hash.replace(/^#/, '')); } catch { return; }
    if (!id) return;
    const target = doc.getElementById(id) || [...doc.querySelectorAll('[data-anchor]')]
      .find(element => element.dataset.anchor === id && element.getClientRects().length);
    revealWithin(target);
  }

  function revealAll() {
    for (const element of [...pending, ...active]) finish(element);
    observer?.disconnect();
  }

  try {
    observer = new win.IntersectionObserver(entries => {
      let rowTop = -Infinity;
      let positionInRow = 0;
      const visible = entries.filter(entry => {
        // Fast scrolling and browser scroll restoration may skip a whole block.
        if (entry.boundingClientRect.bottom <= 0) finish(entry.target);
        return entry.isIntersecting;
      }).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top ||
        a.boundingClientRect.left - b.boundingClientRect.left);
      for (const entry of visible) {
        const top = entry.boundingClientRect.top;
        if (Math.abs(top - rowTop) > 48) {
          rowTop = top;
          positionInRow = 0;
        }
        show(entry.target, Math.min(positionInRow++ * 70, 140), top >= 0);
      }
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });

    // Keep the first screen, restored scroll position and hidden responsive copies visible.
    // All measurements precede mutations, avoiding repeated layout on long case studies.
    const belowFold = targets.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top >= win.innerHeight;
    });
    for (const element of belowFold) {
      pending.add(element);
      element.classList.add('scroll-reveal-pending');
      observer.observe(element);
    }
    revealAnchor(win.location.hash);
  } catch {
    // Motion is optional; an initialization failure must never hide the portfolio.
    revealAll();
    return;
  }

  doc.addEventListener('animationend', event => {
    if (event.animationName === 'portfolio-reveal') finish(event.target);
  });
  doc.addEventListener('focusin', event => revealWithin(event.target));
  doc.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href, win.location.href);
    if (url.origin === win.location.origin && url.pathname === win.location.pathname &&
        url.search === win.location.search) revealAnchor(url.hash);
  }, true);
  win.addEventListener('hashchange', () => revealAnchor(win.location.hash));
  win.addEventListener('beforeprint', revealAll);
  win.addEventListener('pageshow', event => { if (event.persisted) revealAll(); });
  motion.addEventListener('change', () => { if (motion.matches) revealAll(); });
}
