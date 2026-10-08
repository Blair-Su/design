// One directory controller keeps all four case studies in sync.
window.initCaseNavigation = function initCaseNavigation(prefix) {
  const sections = [...document.querySelectorAll('[data-case-section]')];
  const toc = document.querySelector(`.${prefix}-toc`);
  const list = document.querySelector(`#${prefix}-toc-list`);
  const links = [...document.querySelectorAll(`#${prefix}-toc-list a`)];
  if (!toc || !list || !sections.length || !links.length) return;
  const toggle = toc.querySelector(`.${prefix}-toc-toggle`);
  const header = document.querySelector('.site-header');
  const desktop = matchMedia('(min-width: 1024px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let activeLink = links[0];
  let scheduled = false;
  let pending = null;
  let navigationVersion = 0;
  let settleTimer;

  list.classList.add('case-toc-list');

  function positionHighlight() {
    if (!desktop.matches) {
      list.classList.remove('has-toc-indicator');
      return;
    }
    const item = activeLink.getBoundingClientRect();
    const parent = list.getBoundingClientRect();
    if (!item.width || !item.height) return;
    list.style.setProperty('--toc-active-y', `${item.top - parent.top + list.scrollTop}px`);
    list.style.setProperty('--toc-active-height', `${item.height}px`);
    list.classList.add('has-toc-indicator');
  }

  function selectChapter(id) {
    const target = links.find(link => link.hash === `#${id}`);
    if (!target) return;
    activeLink = target;
    for (const link of links) {
      if (link === target) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    positionHighlight();
  }

  function setContents(open, returnFocus = false) {
    const expanded = open && !desktop.matches;
    toc.classList.toggle('is-open', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    if (returnFocus) toggle.focus({ preventScroll: true });
  }

  function clearNavigation() {
    navigationVersion++;
    clearTimeout(settleTimer);
    pending = null;
  }

  function updateChapter() {
    scheduled = false;
    // Keep the clicked destination selected while passing intermediate chapters.
    if (pending) {
      if (!pending.started || Math.abs(window.scrollY - pending.top) > 2) return;
      const id = pending.id;
      clearNavigation();
      selectChapter(id);
      return;
    }
    const threshold = (header?.getBoundingClientRect().height ?? 0) + (desktop.matches ? 48 : 28);
    let active = sections[0].id;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= threshold) active = section.id;
    }
    if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      active = sections.at(-1).id;
    }
    selectChapter(active);
  }

  function scheduleChapterUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateChapter);
  }

  function interruptNavigation() {
    if (!pending) return;
    const wasScrolling = pending.started;
    clearNavigation();
    if (wasScrolling) window.scrollTo({ top: window.scrollY, behavior: 'instant' });
    scheduleChapterUpdate();
  }

  toggle.addEventListener('click', () => setContents(toggle.getAttribute('aria-expanded') !== 'true'));
  for (const link of links) {
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
      const target = sections.find(section => link.hash === `#${section.id}`);
      if (!target) return;
      event.preventDefault();
      interruptNavigation();
      clearNavigation();
      pending = { id: target.id, started: false, top: 0 };
      const version = navigationVersion;
      selectChapter(target.id);
      setContents(false, !desktop.matches);

      const scrollToTarget = () => {
        if (version !== navigationVersion) return;
        const inset = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0)
          + (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
        const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        pending.top = Math.min(maximum, Math.max(0, target.getBoundingClientRect().top + window.scrollY - inset));
        pending.started = true;
        if (location.hash !== link.hash) history.pushState(history.state, '', link.hash);
        window.scrollTo({ top: pending.top, behavior: reduced.matches ? 'instant' : 'smooth' });
        // Also release the lock if native scrolling is interrupted without an input event.
        settleTimer = setTimeout(() => {
          if (version !== navigationVersion) return;
          clearNavigation();
          scheduleChapterUpdate();
        }, 2000);
        scheduleChapterUpdate();
      };
      if (reduced.matches) scrollToTarget();
      // Paint the selected label and start the moving background before content moves.
      else requestAnimationFrame(() => requestAnimationFrame(scrollToTarget));
    });
  }

  document.addEventListener('pointerdown', event => {
    if (!toc.contains(event.target)) setContents(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setContents(false, true);
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)
      && !event.target?.closest('input, textarea, select, [contenteditable="true"]')) interruptNavigation();
  });
  window.addEventListener('wheel', interruptNavigation, { passive: true });
  window.addEventListener('touchstart', interruptNavigation, { passive: true });
  window.addEventListener('scroll', scheduleChapterUpdate, { passive: true });
  window.addEventListener('scrollend', scheduleChapterUpdate);
  window.addEventListener('hashchange', () => { clearNavigation(); scheduleChapterUpdate(); });
  window.addEventListener('resize', () => { positionHighlight(); scheduleChapterUpdate(); });
  window.addEventListener('load', scheduleChapterUpdate);
  desktop.addEventListener('change', () => { setContents(false); positionHighlight(); });
  document.fonts?.ready.then(() => { positionHighlight(); scheduleChapterUpdate(); });
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(positionHighlight);
    observer.observe(list);
    links.forEach(link => observer.observe(link));
  }
  updateChapter();
};
