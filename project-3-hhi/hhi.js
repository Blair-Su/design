(() => {
  const sections = [...document.querySelectorAll('[data-case-section]')];
  const links = [...document.querySelectorAll('#hhi-toc-list a')];
  const header = document.querySelector('.site-header');
  const toc = document.querySelector('.hhi-toc');
  const tocToggle = toc.querySelector('.hhi-toc-toggle');
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
