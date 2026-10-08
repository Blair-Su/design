(() => {
  const sections = [...document.querySelectorAll('[data-case-section]')];
  const links = [...document.querySelectorAll('#nl-toc-list a')];
  const header = document.querySelector('.site-header');
  const toc = document.querySelector('.nl-toc');
  const tocToggle = toc.querySelector('.nl-toc-toggle');
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
    if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) active = sections.at(-1).id;
    for (const link of links) {
      if (link.hash === `#${active}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
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

})();
