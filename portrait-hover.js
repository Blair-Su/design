function initPortraitHover() {
  const frame = document.querySelector('.intro-portrait-frame');
  if (!frame) return;

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let bounds = null;

  function reset() {
    frame.classList.remove('is-tilting');
    for (const axis of ['x', 'y', 'z']) frame.style.removeProperty(`--portrait-rotate-${axis}`);
    bounds = null;
  }

  function followPointer(event) {
    if (event.pointerType !== 'mouse' || !finePointer.matches || reducedMotion.matches) return reset();
    // Measure the stationary frame so the image's rotation cannot move its own target.
    bounds ??= frame.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    frame.style.setProperty('--portrait-rotate-x', `${(-y * 7).toFixed(2)}deg`);
    frame.style.setProperty('--portrait-rotate-y', `${(x * 7).toFixed(2)}deg`);
    frame.style.setProperty('--portrait-rotate-z', `${(x * 2).toFixed(2)}deg`);
    frame.classList.add('is-tilting');
  }

  frame.addEventListener('pointerenter', followPointer);
  frame.addEventListener('pointermove', followPointer);
  frame.addEventListener('pointerleave', reset);
  frame.addEventListener('pointercancel', reset);
  window.addEventListener('blur', reset);
  window.addEventListener('resize', reset);
  finePointer.addEventListener('change', reset);
  reducedMotion.addEventListener('change', reset);
}

initPortraitHover();
