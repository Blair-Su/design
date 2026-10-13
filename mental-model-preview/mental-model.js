(() => {
  window.initCaseNavigation('mm');

  // Enhance ordinary image links with the same native-dialog pattern as HHI.
  const viewer = document.querySelector('#mm-image-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;
  const image = viewer.querySelector('img');
  const title = viewer.querySelector('h2');
  const scrollArea = viewer.querySelector('.mm-image-scroll');
  let trigger = null;
  let backdropPressed = false;
  for (const link of document.querySelectorAll('[data-tutorial-image]')) {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      image.src = link.href;
      image.alt = link.querySelector('img').alt;
      title.textContent = link.dataset.title;
      viewer.showModal();
      scrollArea.scrollTop = scrollArea.scrollLeft = 0;
      document.body.classList.add('mm-viewer-open');
    });
  }
  viewer.querySelector('.mm-viewer-close').addEventListener('click', () => viewer.close());
  function outside(event) {
    const rect = viewer.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  }
  viewer.addEventListener('pointerdown', event => { backdropPressed = outside(event); });
  viewer.addEventListener('click', event => {
    if (backdropPressed && outside(event)) viewer.close();
    backdropPressed = false;
  });
  viewer.addEventListener('close', () => {
    document.body.classList.remove('mm-viewer-open');
    trigger?.focus({ preventScroll: true });
  });
})();
