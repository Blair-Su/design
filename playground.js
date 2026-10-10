(() => {
  const panel = document.querySelector('#playground');
  const dialog = document.querySelector('#playground-lightbox');
  if (!panel || !dialog) return;

  const stage = dialog.querySelector('.playground-lightbox-stage');
  const title = dialog.querySelector('#playground-lightbox-title');
  const description = dialog.querySelector('.playground-lightbox-description');
  const grid = panel.querySelector?.('.playground-grid');
  const previews = panel.querySelectorAll('[data-playground-preview]');
  const videos = panel.querySelectorAll('[data-playground-video]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visibility = new WeakMap();
  const preparedByPreview = new WeakMap();
  const preparedFrames = [];
  let enlargedFrame = null;
  let activePrepared = null;
  let pendingPrepared = null;
  let activeStaticImage = null;
  let activeVideo = null;
  let opener = null;
  let backdropPressed = false;
  let scheduleMasonry = () => {};

  if (grid) {
    const cards = [...grid.querySelectorAll('.playground-card')];
    let layoutFrame = 0;
    scheduleMasonry = () => {
      if (layoutFrame) return;
      layoutFrame = requestAnimationFrame(() => {
        layoutFrame = 0;
        if (panel.hidden || !grid.clientWidth) return;
        const style = getComputedStyle(grid);
        const columns = Number(style.getPropertyValue('--playground-columns')) || 2;
        const gap = parseFloat(style.getPropertyValue('--playground-gap')) || 20;
        const cardWidth = (grid.clientWidth - gap * (columns - 1)) / columns;
        const bottoms = Array(columns).fill(0);
        grid.classList.add('is-masonry');
        for (const [index, card] of cards.entries()) {
          const column = index % columns;
          const width = `${cardWidth}px`;
          const left = `${column * (cardWidth + gap)}px`;
          const top = `${bottoms[column]}px`;
          if (card.style.width !== width) card.style.width = width;
          if (card.style.left !== left) card.style.left = left;
          if (card.style.top !== top) card.style.top = top;
          bottoms[column] += card.getBoundingClientRect().height + gap;
        }
        const height = `${Math.max(0, ...bottoms) - gap}px`;
        if (grid.style.height !== height) grid.style.height = height;
      });
    };
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(scheduleMasonry);
      resizeObserver.observe(grid);
      for (const card of cards) resizeObserver.observe(card);
    }
    window.addEventListener('resize', scheduleMasonry);
    scheduleMasonry();
  }

  function notifyPreview(frame, visible) {
    frame.contentWindow?.postMessage({
      type: 'playground:visibility',
      visible: visible && !document.hidden,
    }, location.origin);
  }
  function syncPlayback() {
    for (const frame of previews) {
      notifyPreview(frame, visibility.get(frame) === true && !panel.hidden && !dialog.open);
    }
    if (enlargedFrame) notifyPreview(enlargedFrame, dialog.open);
    for (const video of videos) {
      setVideoPlayback(video, visibility.get(video) === true && !panel.hidden && !dialog.open);
    }
    if (activeVideo) setVideoPlayback(activeVideo, dialog.open);
  }

  function setVideoPlayback(video, visible) {
    if (visible && !document.hidden && !reducedMotion.matches) {
      if (!video.hasAttribute('src')) video.src = video.dataset.playgroundVideo;
      if (video.paused) video.play().catch(() => {});
    } else {
      video.pause();
    }
  }
  reducedMotion.addEventListener('change', syncPlayback);

  // Lazy-start visible thumbnails; pause them while the enlarged artwork plays.
  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const frame = entry.target;
        visibility.set(frame, entry.isIntersecting);
        if (entry.isIntersecting && frame.dataset.playgroundPreview && !frame.hasAttribute('src')) frame.src = frame.dataset.playgroundPreview;
      }
      syncPlayback();
    }, { threshold: 0.01 });
    for (const frame of [...previews, ...videos]) observer.observe(frame);
  } else {
    for (const frame of previews) {
      visibility.set(frame, true);
      frame.src = frame.dataset.playgroundPreview;
    }
    for (const video of videos) visibility.set(video, true);
    syncPlayback();
  }
  for (const frame of previews) frame.addEventListener('load', syncPlayback);
  document.addEventListener('visibilitychange', syncPlayback);

  function prepareInteractive(preview, card) {
    if (preparedByPreview.has(preview)) return preparedByPreview.get(preview);
    const frame = document.createElement('iframe');
    frame.classList.add('playground-preloaded-frame');
    frame.title = `${card.dataset.title} — interactive preview`;
    frame.src = preview.dataset.playgroundEnlarged;
    frame.addEventListener('load', () => notifyPreview(frame, false));
    const prepared = { frame, ready: false };
    preparedByPreview.set(preview, prepared);
    preparedFrames.push(prepared);
    // Keep the iframe in its final DOM position from the start. Reparenting an
    // iframe makes Chrome reload it, which exposed the fallback frame again.
    stage.append(frame);
    return prepared;
  }

  function showDialog() {
    dialog.showModal();
    document.documentElement.classList.add('playground-preview-open');
    document.body.classList.add('playground-preview-open');
    syncPlayback();
  }

  function showPrepared(prepared) {
    if (dialog.open || panel.hidden || pendingPrepared !== prepared) return;
    pendingPrepared = null;
    activePrepared = prepared;
    enlargedFrame = prepared.frame;
    enlargedFrame.classList.remove('playground-preloaded-frame');
    enlargedFrame.classList.add('playground-lightbox-frame');
    stage.classList.remove('is-static-preview');
    showDialog();
  }

  for (const button of panel.querySelectorAll('.playground-card-open')) {
    const card = button.closest('.playground-card');
    const interactivePreview = card.querySelector('[data-playground-enlarged]');
    const prepared = interactivePreview ? prepareInteractive(interactivePreview, card) : null;
    button.addEventListener('click', () => {
      if (dialog.open || pendingPrepared) return;
      const image = card.querySelector('img');
      const video = card.querySelector('[data-playground-video]');
      if (!prepared && !image && !video) return;
      title.textContent = card.dataset.title;
      description.textContent = card.dataset.description || '';
      description.hidden = !description.textContent;
      opener = button;
      if (prepared) {
        pendingPrepared = prepared;
        if (prepared.ready) showPrepared(prepared);
      } else if (video) {
        activeVideo = document.createElement('video');
        activeVideo.classList.add('playground-lightbox-video');
        activeVideo.src = video.dataset.playgroundVideo;
        activeVideo.poster = video.poster;
        activeVideo.muted = true;
        activeVideo.loop = true;
        activeVideo.playsInline = true;
        activeVideo.controls = true;
        activeVideo.setAttribute('aria-label', card.dataset.title);
        const ratio = video.dataset.playgroundRatio;
        dialog.classList.add(ratio === 'book' ? 'has-book-preview' : ratio === 'landscape' ? 'has-landscape-preview' : 'has-square-preview');
        stage.append(activeVideo);
        showDialog();
      } else {
        const enlargedImage = document.createElement('img');
        enlargedImage.classList.add('playground-static-image');
        enlargedImage.src = image.dataset.fullSrc || image.src;
        enlargedImage.alt = image.alt;
        activeStaticImage = enlargedImage;
        stage.classList.add('is-static-preview');
        stage.append(enlargedImage);
        showDialog();
      }
    });
  }

  function closePreview() {
    pendingPrepared = null;
    if (dialog.open) dialog.close();
  }
  dialog.querySelector('.playground-lightbox-close').addEventListener('click', closePreview);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closePreview();
  });
  function outsideDialog(event) {
    const rect = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
  }
  dialog.addEventListener('pointerdown', event => { backdropPressed = outsideDialog(event); });
  dialog.addEventListener('click', event => {
    if (backdropPressed && outsideDialog(event)) closePreview();
    backdropPressed = false;
  });
  dialog.addEventListener('close', () => {
    // The prepared iframe stays mounted in the stage so Chrome never reloads it.
    if (activePrepared) {
      enlargedFrame.classList.remove('playground-lightbox-frame');
      enlargedFrame.classList.add('playground-preloaded-frame');
      notifyPreview(enlargedFrame, false);
    }
    if (activeStaticImage) stage.removeChild(activeStaticImage);
    activeStaticImage = null;
    if (activeVideo) {
      activeVideo.pause();
      stage.removeChild(activeVideo);
      activeVideo = null;
    }
    dialog.classList.remove('has-square-preview', 'has-book-preview', 'has-landscape-preview');
    stage.classList.remove('is-static-preview');
    enlargedFrame = null;
    activePrepared = null;
    backdropPressed = false;
    document.documentElement.classList.remove('playground-preview-open');
    document.body.classList.remove('playground-preview-open');
    syncPlayback();
    if (opener && !panel.hidden) opener.focus({ preventScroll: true });
    opener = null;
  });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    const currentPrepared = preparedFrames.find(item => event.source === item.frame.contentWindow);
    if (!currentPrepared) return;
    if (event.data?.type === 'playground:ready') {
      currentPrepared.ready = true;
      if (pendingPrepared === currentPrepared) showPrepared(currentPrepared);
    }
    if (event.data?.type === 'playground:close' && activePrepared === currentPrepared) closePreview();
  });
  new MutationObserver(() => {
    if (panel.hidden) closePreview();
    syncPlayback();
    scheduleMasonry();
  }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('pagehide', closePreview);
})();
