const photos = [...document.querySelectorAll('.about-gallery-photo')];
const lightbox = document.querySelector('.photo-lightbox');
const lightboxImage = lightbox.querySelector('.photo-lightbox-image');
const caption = lightbox.querySelector('#photo-caption');
const count = lightbox.querySelector('.photo-count');
const gallery = document.querySelector('.about-gallery');
const galleryTrack = gallery.querySelector('.about-gallery-track');
const gallerySet = gallery.querySelector('.about-gallery-set');
const galleryToggle = document.querySelector('.gallery-toggle');
const galleryMotion = matchMedia('(prefers-reduced-motion: reduce)');
let activePhoto = 0;

// The second copy makes the end meet the beginning without a visible jump.
// Only the original fourteen photos participate in keyboard and screen-reader navigation.
const galleryRepeat = gallerySet.cloneNode(true);
galleryRepeat.setAttribute('aria-hidden', 'true');
galleryRepeat.querySelectorAll('button').forEach(button => {
  const copy = document.createElement('div');
  copy.className = button.className;
  copy.style.cssText = button.style.cssText;
  copy.dataset.photo = button.dataset.photo;
  copy.append(...button.childNodes);
  button.replaceWith(copy);
});
galleryTrack.append(galleryRepeat);

let galleryPaused = galleryMotion.matches;
let galleryVisible = false;
let galleryReady = false;
let galleryLoading = false;
let galleryDragging = false;
let galleryKeyboardFocus = false;
let galleryManualUntil = 0;
let galleryOffset = gallery.scrollLeft;
let galleryLoopWidth = gallerySet.getBoundingClientRect().width;
let galleryLastTime = 0;

function updateGalleryControl() {
  galleryToggle.dataset.paused = String(galleryPaused);
  galleryToggle.setAttribute('aria-label', galleryPaused ? 'Play photo scrolling' : 'Pause photo scrolling');
  galleryToggle.querySelector('span').textContent = galleryPaused ? 'Play' : 'Pause';
}
galleryToggle.addEventListener('click', () => {
  galleryPaused = !galleryPaused;
  updateGalleryControl();
});
galleryMotion.addEventListener('change', () => {
  if (galleryMotion.matches) galleryPaused = true;
  updateGalleryControl();
});
updateGalleryControl();
new IntersectionObserver(([entry]) => {
  galleryVisible = entry.isIntersecting;
  if (!galleryVisible || galleryLoading) return;
  galleryLoading = true;
  // Decode the whole strip before moving so later photos never scroll in blank.
  Promise.allSettled([...galleryTrack.querySelectorAll('img')].map(image => {
    image.loading = 'eager';
    return image.decode();
  })).then(() => { galleryReady = true; });
}).observe(gallery);
new ResizeObserver(() => {
  galleryLoopWidth = gallerySet.getBoundingClientRect().width;
  galleryOffset = gallery.scrollLeft;
}).observe(gallerySet);

// Hover keeps the photos moving; direct scrolling and keyboard browsing take priority.
gallery.addEventListener('pointerdown', () => { galleryDragging = true; });
function releaseGallery() {
  if (!galleryDragging) return;
  galleryDragging = false;
  galleryManualUntil = performance.now() + 1600;
}
window.addEventListener('pointerup', releaseGallery);
window.addEventListener('pointercancel', releaseGallery);
gallery.addEventListener('wheel', () => { galleryManualUntil = performance.now() + 1600; }, { passive: true });
gallery.addEventListener('focusin', event => { galleryKeyboardFocus = event.target.matches(':focus-visible'); });
gallery.addEventListener('focusout', event => {
  if (!gallery.contains(event.relatedTarget)) galleryKeyboardFocus = false;
});

function scrollGallery(now) {
  const elapsed = Math.min(now - (galleryLastTime || now), 64);
  galleryLastTime = now;
  if (galleryVisible && galleryReady && !document.hidden && !galleryPaused && !galleryDragging && !galleryKeyboardFocus && !lightbox.open && now > galleryManualUntil && galleryLoopWidth) {
    galleryOffset = (galleryOffset + elapsed * .028) % galleryLoopWidth;
    gallery.scrollLeft = galleryOffset;
  } else {
    galleryOffset = gallery.scrollLeft;
  }
  requestAnimationFrame(scrollGallery);
}
requestAnimationFrame(scrollGallery);

function showPhoto(index) {
  activePhoto = (index + photos.length) % photos.length;
  const image = photos[activePhoto].querySelector('img');
  lightboxImage.src = image.dataset.fullSrc || image.src;
  lightboxImage.alt = image.alt;
  caption.textContent = image.alt;
  count.textContent = `${activePhoto + 1} / ${photos.length}`;
}

gallery.addEventListener('click', event => {
  const button = event.target.closest('[data-photo]');
  if (!button) return;
  showPhoto(Number(button.dataset.photo));
  lightbox.showModal();
  document.body.classList.add('photo-open');
});
lightbox.querySelector('.photo-close').addEventListener('click', () => lightbox.close());
lightbox.querySelectorAll('[data-photo-step]').forEach(button => {
  button.addEventListener('click', () => showPhoto(activePhoto + Number(button.dataset.photoStep)));
});
lightbox.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showPhoto(activePhoto + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
lightbox.addEventListener('click', event => {
  if (event.target !== lightbox) return;
  const rect = lightbox.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) lightbox.close();
});
lightbox.addEventListener('close', () => document.body.classList.remove('photo-open'));
