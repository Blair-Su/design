const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-navigation');
const phoneLayout = matchMedia('(max-width: 767px)');

function setMenu(open, returnFocus = false) {
  const expanded = open && phoneLayout.matches;
  header.classList.toggle('menu-open', expanded);
  menuToggle.setAttribute('aria-expanded', String(expanded));
  menuToggle.setAttribute('aria-label', expanded ? 'Close menu' : 'Open menu');
  if (returnFocus) menuToggle.focus();
}

menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('pointerdown', event => {
  if (!header.contains(event.target)) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') setMenu(false, true);
});
phoneLayout.addEventListener('change', () => setMenu(false));

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

function hideCursor() {
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
  cursor.dataset.copyKind = copyButton?.dataset.copyKind || '';
  cursorText.textContent = overCopy ? 'COPY' : overLabel ? labeledTarget.dataset.cursorLabel : sponsored ? 'VIEW SPONSORED PROJECT' : 'VIEW CASE STUDY';
  // Size each label to its content with the same compact space on both sides.
  let halfWidth = overAction ? 12 : 6;
  if (hasLabel) {
    const labelWidth = cursorLabel.getBoundingClientRect().width;
    const sidePadding = parseFloat(getComputedStyle(cursor).getPropertyValue('--cursor-inline-padding'));
    cursor.style.setProperty('--cursor-label-width', `${labelWidth}px`);
    halfWidth = labelWidth / 2 + sidePadding;
  }
  // Keep the entire label visible near the edges of the viewport.
  const halfHeight = hasLabel ? 22 : overAction ? 12 : 6;
  const x = Math.min(innerWidth - halfWidth - 4, Math.max(halfWidth + 4, pointer.x));
  const y = Math.min(innerHeight - halfHeight - 4, Math.max(halfHeight + 4, pointer.y));
  cursor.style.left = `${x}px`;
  cursor.style.top = `${y}px`;
  cursor.classList.add('is-visible');
  document.documentElement.classList.add('custom-cursor-ready');
}

document.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || !mouseInput.matches) return hideCursor();
  pointer = { x: event.clientX, y: event.clientY };
  updateCursor();
});
document.addEventListener('scroll', updateCursor, { passive: true, capture: true });
document.addEventListener('click', () => requestAnimationFrame(updateCursor));
window.addEventListener('resize', updateCursor);
const cursorDialogObserver = new MutationObserver(updateCursor);
cursorDialogs.forEach(dialog => cursorDialogObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
document.documentElement.addEventListener('pointerleave', hideCursor);
window.addEventListener('blur', hideCursor);
document.addEventListener('keydown', event => { if (event.key === 'Tab') hideCursor(); });
mouseInput.addEventListener('change', hideCursor);
