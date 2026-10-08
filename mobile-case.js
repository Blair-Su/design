// Keep the fox clear of the rendered directory, including wrapped titles and safe areas.
(() => {
  const bar = document.querySelector('.lh-sidebar, .sc-sidebar, .hhi-sidebar, .nl-sidebar');
  if (!bar) return;
  const compact = matchMedia('(max-width: 1023px)');
  const measure = () => {
    const height = compact.matches ? bar.getBoundingClientRect().height : 0;
    document.body.style.setProperty('--case-bar-height', `${height}px`);
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measure).observe(bar);
  compact.addEventListener('change', measure);
  window.addEventListener('resize', measure);
  document.fonts?.ready.then(measure);
  measure();
})();
