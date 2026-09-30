(() => {
  const desktop = matchMedia('(min-width: 768px)');
  const surfaces = [...document.querySelectorAll('.portfolio-header-logo-link, .portfolio-header-liquid, .portfolio-header-resume-link')];
  const hhiCard = document.querySelector('.framer-project-card.project-hhi');
  let pendingFrame;
  const naluPixels = new WeakMap();

  function isNaluBackdropWhite(element, style, x, y) {
    if (!naluPixels.has(element)) {
      naluPixels.set(element, null);
      const url = style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
      if (!url) return false;
      const image = new Image();
      image.src = url;
      image.decode().then(() => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        naluPixels.set(element, context.getImageData(0, 0, canvas.width, canvas.height));
        scheduleSurfaces();
      }).catch(() => {});
    }
    const pixels = naluPixels.get(element);
    if (!pixels) return false;
    // This artwork uses centered cover sizing over a white card.
    const rect = element.getBoundingClientRect();
    const scale = Math.max(rect.width / pixels.width, rect.height / pixels.height);
    const px = Math.floor((x - rect.left - (rect.width - pixels.width * scale) / 2) / scale);
    const py = Math.floor((y - rect.top - (rect.height - pixels.height * scale) / 2) / scale);
    if (px < 0 || py < 0 || px >= pixels.width || py >= pixels.height) return true;
    const index = (py * pixels.width + px) * 4;
    const alpha = pixels.data[index + 3] / 255;
    return [0, 1, 2].every(channel => pixels.data[index + channel] * alpha + 255 * (1 - alpha) >= 245);
  }

  // Inspect the painted DOM behind the header; keep glass over image-based artwork.
  function isWhiteAt(x, y) {
    for (const element of document.elementsFromPoint(x, y)) {
      if (element.closest('.portfolio-header, .header-blur-layer')) continue;
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
      if (element.matches('.project-nalu-desktop .f-RDqtLoVBj') && isNaluBackdropWhite(element, style, x, y)) continue;
      if (element.matches('img, video, canvas, svg, iframe') || style.backgroundImage !== 'none') return false;
      const channels = style.backgroundColor.match(/[\d.]+/g)?.map(Number);
      if (!channels || (channels[3] ?? 1) < .1) continue;
      return channels.slice(0, 3).every(value => value >= 245);
    }
    return true;
  }

  function updateSurfaces() {
    pendingFrame = null;
    surfaces.forEach(surface => {
      const rect = surface.getBoundingClientRect();
      const hhiRect = hhiCard?.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const navigationOverHhi = surface.matches('.portfolio-header-liquid, .portfolio-header-resume-link') && hhiRect &&
        centerX >= hhiRect.left && centerX <= hhiRect.right &&
        centerY >= hhiRect.top && centerY <= hhiRect.bottom;
      const white = desktop.matches && rect.width > 0 && (navigationOverHhi || [.15, .5, .85].every(position =>
        isWhiteAt(rect.left + rect.width * position, rect.top + rect.height / 2)
      ));
      surface.classList.toggle('is-over-white', white);
    });
  }

  function scheduleSurfaces() {
    if (!pendingFrame) pendingFrame = requestAnimationFrame(updateSurfaces);
  }

  const updateBlur = () => {
    document.body.classList.toggle('has-header-scroll', window.scrollY > 0);
    scheduleSurfaces();
  };
  updateBlur();
  window.addEventListener('scroll', updateBlur, { passive: true });
  window.addEventListener('pageshow', updateBlur);
  window.addEventListener('resize', scheduleSurfaces, { passive: true });
  window.addEventListener('load', scheduleSurfaces);
  desktop.addEventListener('change', scheduleSurfaces);
  document.fonts.ready.then(scheduleSurfaces);
})();
