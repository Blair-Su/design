(() => {
  const sections = [...document.querySelectorAll('[data-case-section]')];
  const links = [...document.querySelectorAll('#lh-toc-list a')];
  const header = document.querySelector('.site-header');
  const toc = document.querySelector('.lh-toc');
  const tocToggle = toc.querySelector('.lh-toc-toggle');
  const desktop = matchMedia('(min-width: 1024px)');
  let scheduled = false;

  function setContents(open, returnFocus = false) {
    const expanded = open && !desktop.matches;
    toc.classList.toggle('is-open', expanded);
    tocToggle.setAttribute('aria-expanded', String(expanded));
    if (returnFocus) tocToggle.focus();
  }

  tocToggle.addEventListener('click', () => setContents(tocToggle.getAttribute('aria-expanded') !== 'true'));
  links.forEach(link => link.addEventListener('click', () => setContents(false)));
  document.addEventListener('pointerdown', event => {
    if (!toc.contains(event.target)) setContents(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && tocToggle.getAttribute('aria-expanded') === 'true') setContents(false, true);
  });
  desktop.addEventListener('change', () => setContents(false));

  function updateChapter() {
    scheduled = false;
    const threshold = header.getBoundingClientRect().height + (desktop.matches ? 48 : 28);
    let active = sections[0].id;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= threshold) active = section.id;
    }
    if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      active = sections.at(-1).id;
    }
    for (const link of links) {
      if (link.hash === `#${active}`) {
        link.setAttribute('aria-current', 'location');
      } else link.removeAttribute('aria-current');
    }
  }

  function scheduleChapterUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateChapter);
  }

  window.addEventListener('scroll', scheduleChapterUpdate, { passive: true });
  window.addEventListener('resize', scheduleChapterUpdate);
  window.addEventListener('hashchange', scheduleChapterUpdate);
  window.addEventListener('load', scheduleChapterUpdate);
  document.fonts.ready.then(scheduleChapterUpdate);
  updateChapter();

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
