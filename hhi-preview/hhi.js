(() => {
  window.initCaseNavigation('hhi');

  const viewer = document.querySelector('#hhi-email-viewer');
  const image = viewer.querySelector('img');
  const title = viewer.querySelector('h2');
  const scrollArea = viewer.querySelector('.hhi-email-scroll');
  let trigger = null;
  let backdropPressed = false;

  for (const button of document.querySelectorAll('[data-email-src]')) {
    button.addEventListener('click', () => {
      trigger = button;
      const preview = button.querySelector('img');
      const isDetail = button.dataset.emailView === 'detail';
      viewer.classList.toggle('hhi-detail-viewer', isDetail);
      if (isDetail) {
        const detail = document.createElement('div');
        detail.className = 'hhi-viewer-detail';
        const artwork = button.querySelector('.hhi-iteration-cards') || preview;
        detail.appendChild(artwork.cloneNode(true));
        detail.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
        scrollArea.replaceChildren(detail);
      } else {
        image.src = button.dataset.emailSrc;
        image.alt = preview.alt;
        image.width = Number(preview.getAttribute('width'));
        image.height = Number(preview.getAttribute('height'));
        scrollArea.replaceChildren(image);
      }
      title.textContent = button.dataset.emailTitle;
      viewer.showModal();
      scrollArea.scrollTop = isDetail ? 0 : Number(button.dataset.emailStart || 0) * scrollArea.clientWidth / image.width;
      document.body.classList.add('hhi-viewer-open');
    });
  }
  viewer.querySelector('.hhi-viewer-close').addEventListener('click', () => viewer.close());
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
    document.body.classList.remove('hhi-viewer-open');
    viewer.classList.remove('hhi-detail-viewer');
    scrollArea.replaceChildren(image);
    trigger?.focus({ preventScroll: true });
  });
})();
