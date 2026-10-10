(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const mouseInput = matchMedia('(hover: hover) and (pointer: fine)');
  const cursor = document.querySelector('.embedded-cursor');
  let visible = true;
  let scenes = [];
  let cursorFrame = null;
  let pointer = null;

  function hideCursor() {
    cancelAnimationFrame(cursorFrame);
    cursorFrame = null;
    pointer = null;
    cursor.classList.remove('is-visible');
    document.documentElement.classList.remove('cursor-ready');
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !mouseInput.matches) return hideCursor();
    pointer = { x: event.clientX, y: event.clientY };
    if (cursorFrame !== null) return;
    cursorFrame = requestAnimationFrame(() => {
      cursorFrame = null;
      if (!pointer) return;
      cursor.style.left = `${pointer.x}px`;
      cursor.style.top = `${pointer.y}px`;
      cursor.classList.add('is-visible');
      document.documentElement.classList.add('cursor-ready');
    });
  });
  document.documentElement.addEventListener('pointerleave', hideCursor);
  window.addEventListener('blur', hideCursor);
  mouseInput.addEventListener('change', hideCursor);
  function syncPlayback() {
    for (const scene of scenes) scene.paused = !visible || document.hidden || motion.matches;
  }
  window.addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'playground:visibility') return;
    visible = event.data.visible === true;
    syncPlayback();
  });
  document.addEventListener('visibilitychange', syncPlayback);
  // Escape inside this iframe should close the parent's enlarged preview too.
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') parent.postMessage({ type: 'playground:close' }, location.origin);
  });
  motion.addEventListener('change', syncPlayback);
  if (!window.UnicornStudio) return;
  const element = document.querySelector('.hero-title');
  UnicornStudio.addScene({ element, filePath: element.dataset.usProjectSrc, ariaLabel: 'Blair Su interactive lettering' }).then(scene => {
    scenes = [scene];
    const deadline = performance.now() + 15000;
    function revealWhenReady() {
      if (!scene.initialized) {
        if (performance.now() < deadline) requestAnimationFrame(revealWhenReady);
        return;
      }
      // Texture loading can outlast scene construction. Draw before pausing motion.
      scene.paused = false;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        document.body.classList.add('ready');
        // Let the scene's entrance frames finish while it is still parked
        // offscreen. The modal opens only after the rendered scene is stable.
        const settleAt = performance.now() + 700;
        function settleScene() {
          scene.paused = false;
          if (performance.now() < settleAt) return requestAnimationFrame(settleScene);
          syncPlayback();
          requestAnimationFrame(() => requestAnimationFrame(() => {
            parent.postMessage({ type: 'playground:ready' }, location.origin);
          }));
        }
        settleScene();
      }));
    }
    revealWhenReady();
  }).catch(() => { /* Keep the lettering fallback when WebGL is unavailable. */ });
})();
