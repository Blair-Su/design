// Shared by the homepage, About, case studies and local drafts.
void import('/scroll-reveal.js').then(({ initScrollReveal }) => initScrollReveal()).catch(() => {
  // Content remains visible when optional motion is unavailable.
});
const foxStyle = document.createElement('link');
foxStyle.rel = 'stylesheet';
foxStyle.href = '/assets/chat/pet.css?v=home-invitation-128';
document.head.append(foxStyle);
void import('/assets/chat/pet.js?v=home-invitation-128');

const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-navigation');
const phoneLayout = matchMedia('(max-width: 767px)');

if (header && menuToggle && navigation) {
  const isFullScreenMenu = document.body.classList.contains('home-page') || header.classList.contains('case-mobile-header');
  const main = document.querySelector('main');
  function setMenu(open, returnFocus = false) {
    const expanded = open && phoneLayout.matches;
    header.classList.toggle('menu-open', expanded);
    menuToggle.setAttribute('aria-expanded', String(expanded));
    menuToggle.setAttribute('aria-label', expanded ? 'Close menu' : 'Open menu');
    if (isFullScreenMenu) {
      document.documentElement.classList.toggle('mobile-menu-open', expanded);
      document.body.classList.toggle('mobile-menu-open', expanded);
      if (main) main.inert = expanded;
      for (const selector of ['.fox-companion', '.site-footer', '.case-mobile-back-row']) {
        const background = document.querySelector(selector);
        if (background) background.inert = expanded;
      }
    }
    if (returnFocus || (isFullScreenMenu && expanded)) menuToggle.focus({ preventScroll: true });
  }

  menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  header.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    if (link.getAttribute('aria-disabled') === 'true') {
      event.preventDefault();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
    setMenu(false, isFullScreenMenu && phoneLayout.matches);
  });
  document.addEventListener('pointerdown', event => {
    if (!header.contains(event.target)) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (menuToggle.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setMenu(false, true);
    } else if (isFullScreenMenu && event.key === 'Tab') {
      const controls = [...header.querySelectorAll('a[href], button:not([disabled])')].filter(el => el.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!controls.includes(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  });
  phoneLayout.addEventListener('change', () => setMenu(false));
  window.addEventListener('pagehide', () => setMenu(false));
}

// Start with the centered brand, then reveal the supplied composition only once
// its image is decoded. No hover is required.
const naluCover = document.querySelector('.nalu-cover');
if (naluCover) {
  const scene = naluCover.querySelector('.nalu-cover-scene');
  scene.decode().then(() => naluCover.classList.add('is-ready')).catch(() => {
    // Keep the branded opening if the artwork cannot load.
  });
}

const status = document.querySelector('.copy-status');
let statusTimeout;

for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      status.textContent = button.dataset.copy.includes('@') ? 'Email copied' : 'Phone number copied';
    } catch {
      status.textContent = `Please copy: ${button.dataset.copy}`;
    }
    status.classList.add('visible');
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => status.classList.remove('visible'), 3000);
  });
}

const cursor = document.querySelector('.custom-cursor');
const cursorLabel = cursor.querySelector('.cursor-label');
const cursorText = cursor.querySelector('.cursor-label > span');
const mouseInput = matchMedia('(hover: hover) and (pointer: fine)');
const cursorHome = cursor.parentElement;
const cursorDialogs = [...document.querySelectorAll('dialog')];
const cursorButtonSelector = 'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"], summary, .about-gallery-photo[data-photo]';
let pointer = null;
let cursorFrame = null;

function hideCursor() {
  cancelAnimationFrame(cursorFrame);
  cursorFrame = null;
  cursor.classList.remove('is-visible', 'is-button', 'is-project', 'is-sponsored', 'is-copy', 'is-link', 'is-caption');
  document.documentElement.classList.remove('custom-cursor-ready');
  pointer = null;
}

function updateCursor() {
  // A modal lives above the page; keep the cursor in its top layer too.
  const cursorLayer = cursorDialogs.filter(dialog => dialog.open).at(-1) || cursorHome;
  if (cursor.parentElement !== cursorLayer) cursorLayer.append(cursor);
  if (!pointer || !mouseInput.matches) return;
  const target = document.elementFromPoint(pointer.x, pointer.y);
  const disabled = Boolean(target?.closest(':disabled, [aria-disabled="true"], [inert]'));
  const clickable = !disabled && target?.closest(`${cursorButtonSelector}, a[href]`);
  const overButton = Boolean(clickable && clickable.matches(cursorButtonSelector));
  const project = disabled || overButton ? null : target?.closest('.project-link');
  const copyButton = disabled || overButton ? null : target?.closest('[data-copy]');
  const labeledTarget = disabled || overButton ? null : target?.closest('[data-cursor-label]');
  const overCopy = Boolean(copyButton);
  const overProject = Boolean(project) && !overCopy;
  const overLabel = Boolean(labeledTarget) && !overCopy && !overProject;
  const overLink = overLabel && labeledTarget.matches('a');
  const hasLabel = overProject || overCopy || overLabel;
  const overAction = Boolean(clickable) && !hasLabel;
  const sponsored = overProject && project.dataset.cursor === 'sponsored';
  cursor.classList.toggle('is-button', overAction);
  cursor.classList.toggle('is-project', overProject);
  cursor.classList.toggle('is-sponsored', sponsored);
  cursor.classList.toggle('is-copy', overCopy);
  cursor.classList.toggle('is-link', overLink);
  cursor.classList.toggle('is-caption', overLabel && !overLink);
  // Preserve the outgoing label and its typography until it has faded away.
  if (hasLabel) {
    cursor.dataset.copyKind = copyButton?.dataset.copyKind || '';
    cursor.dataset.labelKind = overProject ? 'project' : overCopy ? 'copy' : overLink ? 'link' : 'caption';
    const labelText = overCopy ? 'COPY' : overLabel ? labeledTarget.dataset.cursorLabel : sponsored ? 'VIEW SPONSORED PROJECT' : 'VIEW CASE STUDY';
    if (cursorText.textContent !== labelText) cursorText.textContent = labelText;
  }
  // Size each label to its content with the same compact space on both sides.
  let halfWidth = overAction ? 12 : 6;
  let halfHeight = overAction ? 12 : 6;
  if (hasLabel) {
    const labelWidth = cursorLabel.getBoundingClientRect().width;
    const cursorStyles = getComputedStyle(cursor);
    const sidePadding = parseFloat(cursorStyles.getPropertyValue('--cursor-inline-padding'));
    cursor.style.setProperty('--cursor-label-width', `${labelWidth}px`);
    halfWidth = labelWidth / 2 + sidePadding;
    halfHeight = parseFloat(cursorStyles.getPropertyValue('--cursor-label-height')) / 2;
  }
  // Keep the entire label visible near the edges of the viewport.
  const x = Math.min(innerWidth - halfWidth - 4, Math.max(halfWidth + 4, pointer.x));
  const y = Math.min(innerHeight - halfHeight - 4, Math.max(halfHeight + 4, pointer.y));
  cursor.style.left = `${x}px`;
  cursor.style.top = `${y}px`;
  cursor.classList.add('is-visible');
  document.documentElement.classList.add('custom-cursor-ready');
}

function scheduleCursorUpdate() {
  if (cursorFrame !== null) return;
  cursorFrame = requestAnimationFrame(() => {
    cursorFrame = null;
    updateCursor();
  });
}

document.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || !mouseInput.matches) return hideCursor();
  pointer = { x: event.clientX, y: event.clientY };
  scheduleCursorUpdate();
});
document.addEventListener('scroll', scheduleCursorUpdate, { passive: true, capture: true });
document.addEventListener('click', scheduleCursorUpdate);
window.addEventListener('resize', scheduleCursorUpdate);
const cursorDialogObserver = new MutationObserver(scheduleCursorUpdate);
cursorDialogs.forEach(dialog => cursorDialogObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
document.documentElement.addEventListener('pointerleave', hideCursor);
window.addEventListener('blur', hideCursor);
document.addEventListener('keydown', event => { if (event.key === 'Tab') hideCursor(); });
mouseInput.addEventListener('change', hideCursor);
