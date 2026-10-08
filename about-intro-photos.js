// Inline previews are visible in the first paint, even before JavaScript loads.
// Decode full photos in parallel and replace the previews in one render task.
export function initAboutIntroPhotos({ doc = document } = {}) {
  return Promise.all([...doc.querySelectorAll('.about-intro-photos')].map(async group => {
    const images = [...group.querySelectorAll('img[data-full-src]')];
    const replacements = await Promise.allSettled(images.map(async image => {
      const full = doc.createElement('img');
      full.decoding = 'async';
      full.fetchPriority = 'high';
      if (typeof full.decode === 'function') {
        full.src = image.dataset.fullSrc;
        await full.decode();
      } else {
        await new Promise((resolve, reject) => {
          full.onload = resolve;
          full.onerror = reject;
          full.src = image.dataset.fullSrc;
        });
      }
      return full.src;
    }));
    replacements.forEach((result, index) => {
      // A failed request keeps its visible preview instead of a broken image.
      if (result.status === 'fulfilled') images[index].src = result.value;
    });
  }));
}

if (typeof document !== 'undefined') void initAboutIntroPhotos();
