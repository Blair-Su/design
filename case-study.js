const directory = document.querySelector('.case-directory');
const contentsButton = document.querySelector('.contents-toggle');
const contentsMenu = document.querySelector('.contents-menu');
const chapterLinks = [...contentsMenu.querySelectorAll('[data-section]')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const activeCase = () => [...document.querySelectorAll('.case-breakpoint')].find(el => el.getClientRects().length);
const chapterTarget = id => [...(activeCase()?.querySelectorAll('[data-anchor]') || [])].find(el => el.dataset.anchor === id);

// Name the destination, including when the image sequence wraps around.
document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const slides = [...carousel.querySelectorAll('[data-slide-label]')];
  if (!slides.length) return;
  const updateArrowLabels = () => {
    const index = slides.findIndex(slide => !slide.hidden);
    const destination = delta => slides[(index + delta + slides.length) % slides.length].dataset.slideLabel;
    carousel.querySelector('[data-prev]').setAttribute('aria-label', `See ${destination(-1)}`);
    carousel.querySelector('[data-next]').setAttribute('aria-label', `See ${destination(1)}`);
  };
  // The arrow's own click handler changes the slide before this bubbling handler.
  carousel.addEventListener('click', event => {
    if (event.target.closest('.case-carousel-arrow')) updateArrowLabels();
  });
  updateArrowLabels();
});

const emailViewer = document.querySelector('.case-email-viewer');
if (emailViewer) {
  const fullEmail = emailViewer.querySelector('.case-email-full');
  let emailTrigger = null;
  document.querySelectorAll('.case-email-preview').forEach(trigger => {
    trigger.addEventListener('click', () => {
      emailTrigger = trigger;
      emailViewer.showModal();
      fullEmail.scrollTop = 0;
      document.documentElement.classList.add('case-email-open');
    });
  });
  emailViewer.querySelector('.case-email-close').addEventListener('click', () => emailViewer.close());
  const outsideViewer = event => {
    const rect = emailViewer.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  let backdropPressed = false;
  emailViewer.addEventListener('pointerdown', event => { backdropPressed = outsideViewer(event); });
  emailViewer.addEventListener('click', event => {
    if (backdropPressed && outsideViewer(event)) emailViewer.close();
    backdropPressed = false;
  });
  emailViewer.addEventListener('close', () => {
    document.documentElement.classList.remove('case-email-open');
    emailTrigger?.focus({ preventScroll: true });
  });
}

// Scale composed diagrams as one canvas so their fixed-position layers stay in proportion.
const artworkLayouts = [
  ['fQrYjZviA', 806, 235, '.case-desktop, .case-tablet'],
  ['VqPUQFk7D', 806, 235, '.case-desktop, .case-tablet'],
  ['l8HodM7QO', 806, 452.8, '.case-desktop, .case-tablet'],
  ['vBkdVU7Ev', 806, 453.5, '.case-desktop'],
  ['vdbVq7q9s', 806, 453.5, '.case-desktop'],
  ['Nz37mZn5W', 806.06, 453.41, '.case-desktop'],
  ['jhlD4uFEH', 805.5, 453.09, '.case-desktop'],
];
for (const [source, width, height, breakpoints] of artworkLayouts) {
  document.querySelectorAll(`:is(${breakpoints}) [data-source$="${source}"]`).forEach(frame => {
    frame.style.setProperty('--artwork-width', width);
    frame.style.setProperty('--artwork-height', height);
    const canvas = document.createElement('div');
    canvas.className = 'case-artwork-canvas';
    canvas.append(...frame.childNodes);
    frame.append(canvas);
    frame.classList.add('case-artwork-frame');
    const resize = () => {
      if (frame.clientWidth) canvas.style.transform = `scale(${frame.clientWidth / width})`;
    };
    new ResizeObserver(resize).observe(frame);
    resize();
  });
}

function setContents(open, returnFocus = false) {
  contentsButton.setAttribute('aria-expanded', String(open));
  contentsMenu.hidden = !open;
  if (returnFocus) contentsButton.focus();
}
contentsButton.addEventListener('click', () => setContents(contentsMenu.hidden));
document.addEventListener('pointerdown', event => { if (!directory.contains(event.target)) setContents(false); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !contentsMenu.hidden) setContents(false, true);
});

function goToChapter(id, updateHistory = true, smooth = true) {
  const target = id === 'top' ? document.body : chapterTarget(id);
  if (!target) return;
  if (updateHistory) history.pushState(null, '', location.pathname + '#' + id);
  const headerHeight = document.querySelector('.site-header').getBoundingClientRect().height;
  const top = id === 'overview' || id === 'top' ? 0 : scrollY + target.getBoundingClientRect().top - headerHeight - 24;
  scrollTo({ top, behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant' });
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
  const id = url.hash.slice(1);
  if (id === 'main-content') {
    event.preventDefault();
    goToChapter('overview');
    document.querySelector('main').setAttribute('tabindex', '-1');
    document.querySelector('main').focus({ preventScroll: true });
    return;
  }
  if (id !== 'top' && !chapterTarget(id)) return;
  event.preventDefault();
  const fromMenu = contentsMenu.contains(link);
  setContents(false, fromMenu);
  goToChapter(id);
});

let scheduled = false;
function updateCurrentChapter() {
  scheduled = false;
  let current = 'overview';
  const threshold = document.querySelector('.site-header').getBoundingClientRect().height + 64;
  for (const link of chapterLinks) {
    const section = chapterTarget(link.dataset.section);
    if (section && section.getBoundingClientRect().top <= threshold) current = link.dataset.section;
  }
  for (const link of chapterLinks) {
    if (link.dataset.section === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
function scheduleUpdate() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(updateCurrentChapter); }
}
window.addEventListener('scroll', scheduleUpdate, { passive: true });
window.addEventListener('resize', scheduleUpdate);
window.addEventListener('popstate', () => goToChapter(location.hash.slice(1) || 'overview', false, false));
window.addEventListener('load', () => {
  if (location.hash) goToChapter(location.hash.slice(1), false, false);
  updateCurrentChapter();
});
document.fonts.ready.then(updateCurrentChapter);
updateCurrentChapter();
