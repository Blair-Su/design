(() => {
  window.initCaseNavigation('lh');

  const viewer = document.querySelector('#lh-viewer');
  const media = viewer.querySelector('.lh-viewer-media');
  const title = viewer.querySelector('h2');
  const scrollArea = viewer.querySelector('.lh-viewer-scroll');
  const zoom = viewer.querySelector('.lh-viewer-zoom');
  let trigger = null;
  let backdropPressed = false;

  for (const button of document.querySelectorAll('[data-art-title]')) {
    button.addEventListener('click', () => {
      trigger = button;
      const artwork = button.querySelector('.lh-art').cloneNode(true);
      if (artwork.tagName === 'IMG') {
        artwork.loading = 'eager';
        artwork.removeAttribute('srcset');
        artwork.removeAttribute('sizes');
        artwork.src = artwork.getAttribute('src').replace('-1920.webp', '-3840.webp');
      }
      media.replaceChildren(artwork);
      media.classList.toggle('is-portrait', button.hasAttribute('data-art-portrait'));
      media.classList.remove('is-zoomed');
      zoom.setAttribute('aria-pressed', 'false');
      zoom.textContent = 'Zoom in';
      title.textContent = button.dataset.artTitle;
      viewer.showModal();
      scrollArea.scrollTop = 0;
      scrollArea.scrollLeft = 0;
      document.body.classList.add('lh-viewer-open');
    });
  }
  zoom.addEventListener('click', () => {
    const enlarged = media.classList.toggle('is-zoomed');
    zoom.setAttribute('aria-pressed', String(enlarged));
    zoom.textContent = enlarged ? 'Fit to view' : 'Zoom in';
  });
  viewer.querySelector('.lh-viewer-close').addEventListener('click', () => viewer.close());
  function outsideViewer(event) {
    const rect = viewer.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  }
  viewer.addEventListener('pointerdown', event => { backdropPressed = outsideViewer(event); });
  viewer.addEventListener('click', event => {
    if (backdropPressed && outsideViewer(event)) viewer.close();
    backdropPressed = false;
  });
  viewer.addEventListener('close', () => {
    document.body.classList.remove('lh-viewer-open');
    trigger?.focus({ preventScroll: true });
  });
})();
