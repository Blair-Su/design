function initWorkspace() {
  const body = document.body;
  if (!body.classList.contains('home-page')) return;

  const hero = document.querySelector('.hero');
  const header = document.querySelector('.site-header');
  const scrollCue = document.querySelector('.hero-scroll-cue');
  const workspace = document.querySelector('.portfolio-workspace');
  const sidebar = document.querySelector('.profile-sidebar');
  if (!hero || !header || !workspace || !sidebar) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stageMotionMs = 1400;
  const stageExitMs = 360;
  const stageEntryDelayMs = stageExitMs + 40;
  const viewExitMs = 180;
  const viewEnterMs = 420;
  body.style.setProperty('--stage-motion-duration', `${stageMotionMs}ms`);
  body.style.setProperty('--stage-exit-duration', `${stageExitMs}ms`);
  body.style.setProperty('--stage-entry-delay', `${stageEntryDelayMs}ms`);
  body.style.setProperty('--view-exit-duration', `${viewExitMs}ms`);
  body.style.setProperty('--view-entry-duration', `${viewEnterMs}ms`);
  const phoneLayout = window.matchMedia('(max-width: 767px)');
  const mobilePageLinks = header.querySelectorAll('[data-mobile-page]');
  const viewLinks = document.querySelectorAll('[data-workspace-view]');
  const views = { work: document.querySelector('#work'), about: document.querySelector('#about') };
  const homeTitle = document.title;
  let activeView = 'work';
  let displayedView = 'work';
  let viewPhase = null;
  let viewTimer = 0;
  let viewFocus = false;
  let stage = 'intro';
  let frame = 0;
  let finishTimer = 0;
  let enteredAt = 0;
  let lastWheelAt = -Infinity;
  let wheelDistance = 0;
  let wheelReadyAt = 0;
  let touch = null;
  let focusOnEntry = false;
  let introFocusTimer = 0;
  let introFocusPending = false;

  function clearIntroFocus() {
    clearTimeout(introFocusTimer);
    introFocusPending = false;
  }
  function finishIntroFocus() {
    const focus = introFocusPending;
    clearIntroFocus();
    if (focus && stage === 'intro' && !insideControl(document.activeElement)) scrollCue?.focus({ preventScroll: true });
  }

  function measure() {
    frame = 0;
    body.style.setProperty('--profile-height', `${sidebar.getBoundingClientRect().height}px`);
  }
  function scheduleMeasure() {
    if (!frame) frame = requestAnimationFrame(measure);
  }
  function rememberEntry(entered, clearHash = false) {
    try {
      const state = { ...history.state, portfolioEntered: entered, portfolioView: activeView };
      if (clearHash) {
        const params = new URLSearchParams(location.search);
        params.delete('view');
        const search = params.toString();
        history.replaceState(state, '', `${location.pathname}${search ? `?${search}` : ''}`);
      } else history.replaceState(state, '');
    } catch { /* Navigation remains usable when history storage is unavailable. */ }
  }
  function updateNavigation() {
    for (const link of mobilePageLinks) {
      const active = link.dataset.mobilePage === (stage === 'intro' ? 'intro' : activeView === 'about' ? 'about' : 'workspace');
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    for (const link of viewLinks) {
      if (stage !== 'intro' && link.dataset.workspaceView === activeView) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  function selectWorkspaceView(view) {
    activeView = view === 'about' && views.about ? 'about' : 'work';
    if (activeView === 'about') {
      // Begin loading while the panel is still hidden or fading into view.
      // These three photos should not depend on the browser's lazy-load threshold.
      for (const image of views.about.querySelectorAll('.about-intro-photos img')) {
        image.loading = 'eager';
      }
    }
    body.dataset.workspaceView = activeView;
    document.title = activeView === 'about' ? 'About — Blair Su' : homeTitle;
    updateNavigation();
  }
  function resetViewMotion() {
    clearTimeout(viewTimer);
    viewPhase = null;
    viewFocus = false;
    for (const panel of Object.values(views)) {
      if (!panel) continue;
      panel.classList.remove('is-view-leaving', 'is-view-preparing', 'is-view-arriving');
      panel.inert = panel.hidden;
    }
  }
  function setWorkspaceView(view) {
    resetViewMotion();
    selectWorkspaceView(view);
    displayedView = activeView;
    for (const [name, panel] of Object.entries(views)) {
      if (panel) panel.inert = panel.hidden = name !== activeView;
    }
    scheduleMeasure();
  }
  function finishViewMotion() {
    const focus = viewFocus;
    resetViewMotion();
    if (focus && !insideControl(document.activeElement)) views[activeView]?.focus({ preventScroll: true });
  }
  function transitionWorkspaceView(view, focus) {
    selectWorkspaceView(view);
    viewFocus = focus || viewFocus;
    if (activeView === displayedView) {
      // Selecting the outgoing view reverses its fade without restarting the page.
      if (viewPhase === 'leaving') {
        clearTimeout(viewTimer);
        views[displayedView].classList.remove('is-view-leaving');
        viewPhase = 'returning';
        viewTimer = setTimeout(finishViewMotion, viewExitMs);
      }
      return;
    }
    // Rapid clicks update the destination; they do not stack animations.
    if (viewPhase === 'leaving') return;
    clearTimeout(viewTimer);
    viewPhase = 'leaving';
    const outgoing = views[displayedView];
    outgoing.classList.remove('is-view-arriving');
    outgoing.classList.add('is-view-leaving');
    outgoing.inert = true;
    viewTimer = setTimeout(() => {
      const incoming = views[activeView];
      incoming.classList.add('is-view-preparing');
      for (const [name, panel] of Object.entries(views)) {
        if (!panel) continue;
        panel.hidden = name !== activeView;
        panel.inert = true;
      }
      outgoing.classList.remove('is-view-leaving');
      displayedView = activeView;
      // Reset the reading position only while both content views are invisible.
      window.scrollTo({ top: 0, behavior: 'instant' });
      incoming.getBoundingClientRect();
      incoming.classList.remove('is-view-preparing');
      incoming.classList.add('is-view-arriving');
      viewPhase = 'arriving';
      scheduleMeasure();
      viewTimer = setTimeout(finishViewMotion, viewEnterMs);
    }, viewExitMs);
  }
  function recordWorkspaceView() {
    try {
      const params = new URLSearchParams(location.search);
      params.set('view', activeView);
      const state = { ...history.state, portfolioEntered: true, portfolioView: activeView };
      history.pushState(state, '', `${location.pathname}?${params}`);
    } catch { /* Both views still work when history storage is unavailable. */ }
  }
  function setStage(next) {
    stage = next;
    body.dataset.stage = next;
    body.classList.add('platform-ready');
    body.classList.toggle('workspace-mode', next !== 'intro');
    hero.inert = next !== 'intro';
    header.inert = next !== 'intro' && !phoneLayout.matches;
    workspace.inert = next !== 'workspace';
    updateNavigation();
    if (scrollCue) {
      scrollCue.classList.toggle('is-dismissed', next !== 'intro');
      scrollCue.inert = next !== 'intro';
    }
  }
  function finishEntry() {
    clearTimeout(finishTimer);
    if (stage !== 'entering') return;
    wheelDistance = 0;
    lastWheelAt = -Infinity;
    setStage('workspace');
    rememberEntry(true);
    scheduleMeasure();
    if (focusOnEntry) workspace.querySelector(activeView === 'about' ? '#about' : phoneLayout.matches ? '#work' : '.profile-identity')?.focus({ preventScroll: true });
    focusOnEntry = false;
  }
  function finishWhenSettled() {
    // Consume the entering gesture's momentum so it cannot skip the first project.
    const now = performance.now();
    if (!motion.matches && now - lastWheelAt < 140 && now - enteredAt < stageMotionMs + stageEntryDelayMs + 400) {
      finishTimer = setTimeout(finishWhenSettled, 140);
      return;
    }
    finishEntry();
  }
  function enterPlatform({ focus = false } = {}) {
    if (stage !== 'intro') return;
    clearIntroFocus();
    focusOnEntry = focus || hero.contains(document.activeElement) || header.contains(document.activeElement);
    enteredAt = performance.now();
    window.scrollTo({ top: 0, behavior: 'instant' });
    setStage('entering');
    scheduleMeasure();
    if (motion.matches) finishEntry();
    else finishTimer = setTimeout(finishWhenSettled, stageMotionMs + stageEntryDelayMs);
  }
  function showIntro({ focus = false } = {}) {
    clearTimeout(finishTimer);
    clearIntroFocus();
    const animatedReturn = stage !== 'intro' && !motion.matches;
    wheelDistance = 0;
    lastWheelAt = -Infinity;
    // Let the return spring settle before accepting another wheel gesture.
    wheelReadyAt = performance.now() + (animatedReturn ? stageMotionMs + stageEntryDelayMs : 400);
    touch = null;
    focusOnEntry = false;
    setWorkspaceView('work');
    setStage('intro');
    window.scrollTo({ top: 0, behavior: 'instant' });
    rememberEntry(false, true);
    scheduleMeasure();
    if (focus) {
      if (animatedReturn) {
        introFocusPending = true;
        introFocusTimer = setTimeout(finishIntroFocus, stageMotionMs + stageEntryDelayMs);
      } else scrollCue?.focus({ preventScroll: true });
    }
  }
  function showWorkspace(view = activeView, { focus = false, consumeView = false, remember = true } = {}) {
    clearTimeout(finishTimer);
    clearIntroFocus();
    focusOnEntry = false;
    wheelDistance = 0;
    lastWheelAt = -Infinity;
    const destination = view === 'about' && views.about ? 'about' : 'work';
    const animate = stage === 'workspace' && !motion.matches && (destination !== displayedView || viewPhase);
    if (animate) transitionWorkspaceView(destination, focus);
    else setWorkspaceView(destination);
    setStage('workspace');
    if (!animate) window.scrollTo({ top: 0, behavior: 'instant' });
    if (remember) rememberEntry(true, consumeView);
    scheduleMeasure();
    if (focus && !animate) views[activeView]?.focus({ preventScroll: true });
  }
  function insideControl(target) {
    return header.classList.contains('menu-open') || Boolean(target?.closest?.('.fox-companion, .fox-selection, input, textarea, select, [contenteditable="true"], [role="dialog"], dialog'));
  }
  function atWorkspaceTop(target) {
    // Let the page and the independently scrolling sidebar reach their own tops first.
    return !viewPhase && window.scrollY <= 2 && !(target?.closest?.('.profile-sidebar')?.scrollTop > 0);
  }
  function returnToIntro({ focus = false } = {}) {
    const moveFocus = focus || workspace.contains(document.activeElement);
    showIntro({ focus: moveFocus });
  }

  window.addEventListener('wheel', event => {
    if (event.defaultPrevented || event.isTrusted === false || event.ctrlKey || insideControl(event.target)) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const now = performance.now();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    if (stage === 'workspace') {
      if (activeView === 'about' || event.deltaY >= 0 || !atWorkspaceTop(event.target)) {
        wheelDistance = 0;
        lastWheelAt = -Infinity;
        return;
      }
      if (event.cancelable) event.preventDefault();
      if (now - lastWheelAt > 180) wheelDistance = 0;
      lastWheelAt = now;
      wheelDistance -= event.deltaY * unit;
      if (wheelDistance >= 40) returnToIntro();
      return;
    }
    if (event.cancelable) event.preventDefault();
    // Ignore a previous page's trailing trackpad momentum until a fresh gesture.
    if (stage === 'intro' && now < wheelReadyAt) {
      wheelReadyAt = Math.max(wheelReadyAt, now + 180);
      wheelDistance = 0;
      lastWheelAt = now;
      return;
    }
    if (now - lastWheelAt > 180) wheelDistance = 0;
    lastWheelAt = now;
    if (stage !== 'intro') return;
    wheelDistance = Math.max(0, wheelDistance + event.deltaY * unit);
    if (wheelDistance >= 40) enterPlatform();
  }, { passive: false });

  window.addEventListener('touchstart', event => {
    touch = null;
    if (event.touches.length !== 1 || insideControl(event.target)) return;
    touch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  window.addEventListener('touchmove', event => {
    if (!touch || event.touches.length !== 1) return;
    const dx = touch.x - event.touches[0].clientX;
    const dy = touch.y - event.touches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy)) return;
    if (stage === 'workspace') {
      if (activeView === 'about' || dy >= 0 || !atWorkspaceTop(event.target)) {
        touch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        return;
      }
      if (event.cancelable) event.preventDefault();
      if (dy <= -40) returnToIntro();
      return;
    }
    if (event.cancelable) event.preventDefault();
    if (stage === 'intro' && dy >= 40) enterPlatform();
  }, { passive: false });
  for (const event of ['touchend', 'touchcancel']) {
    window.addEventListener(event, () => { touch = null; }, { passive: true });
  }
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (insideControl(event.target)) return;
    if (event.key === ' ' && event.target?.closest?.('a, button, summary')) return;
    if (stage === 'workspace') {
      if (activeView === 'about') return;
      const upward = ['ArrowUp', 'PageUp', 'Home'].includes(event.key) || (event.key === ' ' && event.shiftKey);
      if (upward && atWorkspaceTop(event.target)) {
        event.preventDefault();
        if (!event.repeat) returnToIntro({ focus: true });
      }
      return;
    }
    if (event.shiftKey) return;
    if (!['ArrowDown', 'PageDown', ' ', 'End'].includes(event.key)) return;
    event.preventDefault();
    enterPlatform({ focus: true });
  });
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
    const link = event.target?.closest?.('a[href]');
    if (!link) return;
    const hash = link.getAttribute('href');
    const view = link.dataset.workspaceView || (['#about', '/about.html', '/?view=about'].includes(hash) ? 'about' : null);
    if (view === 'about' || view === 'work') {
      event.preventDefault();
      const changed = activeView !== view || stage === 'intro';
      if (stage === 'intro') {
        setWorkspaceView(view);
        enterPlatform({ focus: true });
      } else showWorkspace(view, { focus: true, remember: false });
      if (changed) recordWorkspaceView();
    } else if (hash === '#top') {
      event.preventDefault();
      showIntro({ focus: event.detail === 0 });
    } else if (['#work', '#portfolio-workspace', '#main-content'].includes(hash) && stage !== 'workspace') {
      event.preventDefault();
      enterPlatform({ focus: event.detail === 0 });
    }
  });

  function handleHash() {
    if (location.hash === '#top' || location.hash === '#intro') return showIntro();
    if (location.hash === '#about') return showWorkspace('about');
    if (stage === 'workspace' && location.hash === '#work') return showWorkspace('work');
    if (stage === 'intro') {
      // A saved #work URL must not dismiss the opening screen without input.
      rememberEntry(false, true);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  window.addEventListener('hashchange', handleHash);
  window.addEventListener('popstate', () => {
    const view = new URLSearchParams(location.search).get('view');
    if (view === 'about' || view === 'work') showWorkspace(view);
    else if (history.state?.portfolioEntered) showWorkspace(history.state.portfolioView);
    else showIntro();
  });
  window.addEventListener('resize', scheduleMeasure);
  window.addEventListener('pageshow', event => {
    if (event.persisted && activeView !== 'about') showIntro();
    if (stage === 'intro') window.scrollTo({ top: 0, behavior: 'instant' });
    scheduleMeasure();
  });
  window.addEventListener('pagehide', () => {
    clearIntroFocus();
    if (viewPhase) setWorkspaceView(activeView);
    if (stage === 'entering') finishEntry();
  });
  phoneLayout.addEventListener('change', () => {
    header.inert = stage !== 'intro' && !phoneLayout.matches;
    scheduleMeasure();
  });
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    finishIntroFocus();
    if (viewPhase) showWorkspace(activeView, { focus: viewFocus });
    finishEntry();
  });
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(scheduleMeasure);
    [hero, sidebar].forEach(el => observer.observe(el));
  }
  document.fonts?.ready.then(scheduleMeasure);

  // Explicit workspace destinations open the requested home view directly.
  // Saved anchors and ordinary fresh visits still wait for the user's gesture.
  const initialView = new URLSearchParams(location.search).get('view');
  if (initialView === 'about') showWorkspace('about');
  else if (initialView === 'work') showWorkspace('work', { consumeView: true });
  else showIntro();
}

if (typeof document !== 'undefined') initWorkspace();
