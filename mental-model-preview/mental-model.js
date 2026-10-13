(() => {
  window.initCaseNavigation('mm');

  const player = document.querySelector('.mm-player');
  if (player) initFilmPlayer(player);

  function initFilmPlayer(player) {
    const video = player.querySelector('video');
    if (typeof video?.play !== 'function') return;
    const controls = player.querySelector('.mm-player-controls');
    const toggle = player.querySelector('.mm-player-toggle');
    const mute = player.querySelector('.mm-player-mute');
    const volume = player.querySelector('.mm-player-volume');
    const seek = player.querySelector('.mm-player-seek input');
    const time = player.querySelector('.mm-player-time');
    const fullscreen = player.querySelector('.mm-player-fullscreen');
    const status = player.querySelector('.mm-player-status');
    let hideTimer;
    let scrubbing = false;
    let revealOnTap = false;
    let previousVolume = video.volume || 1;
    const duration = () => Number.isFinite(video.duration) ? video.duration : 0;
    const format = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

    function showControls() {
      clearTimeout(hideTimer);
      player.classList.remove('controls-hidden');
      if (!video.paused && !video.ended && !scrubbing) {
        hideTimer = setTimeout(() => player.classList.add('controls-hidden'), 2200);
      }
    }
    function showError(message) {
      status.textContent = message;
      status.hidden = false;
      showControls();
    }
    async function togglePlayback() {
      status.hidden = true;
      if (!video.paused && !video.ended) video.pause();
      else {
        if (video.ended) video.currentTime = 0;
        try { await video.play(); }
        catch (error) {
          // A quick second click can interrupt a pending play request normally.
          if (error.name !== 'AbortError') showError('Unable to play. Please try again or use “Open video” below.');
        }
      }
    }
    function updatePlayback() {
      const playing = !video.paused && !video.ended;
      player.classList.toggle('is-playing', playing);
      toggle.setAttribute('aria-label', playing ? 'Pause' : video.ended ? 'Replay' : 'Play');
      toggle.title = `${playing ? 'Pause' : video.ended ? 'Replay' : 'Play'} (K)`;
      showControls();
    }
    function updateTime() {
      const length = duration();
      seek.disabled = !length;
      seek.max = length || 100;
      if (!scrubbing) seek.value = video.currentTime;
      const current = Number(seek.value);
      player.style.setProperty('--mm-progress', `${length ? current / length * 100 : 0}%`);
      seek.setAttribute('aria-valuetext', `${format(current)} of ${format(length)}`);
      time.textContent = `${format(current)} / ${format(length)}`;
    }
    function updateVolume() {
      const silent = video.muted || video.volume === 0;
      player.classList.toggle('is-muted', silent);
      mute.setAttribute('aria-label', silent ? 'Unmute' : 'Mute');
      mute.title = `${silent ? 'Unmute' : 'Mute'} (M)`;
      volume.value = video.muted ? 0 : video.volume;
      volume.setAttribute('aria-valuetext', `${Math.round(Number(volume.value) * 100)} percent`);
    }
    function toggleMute() {
      if (video.muted || video.volume === 0) {
        video.muted = false;
        if (!video.volume) video.volume = previousVolume;
      } else video.muted = true;
    }
    async function toggleFullscreen() {
      try {
        if (document.fullscreenElement === player) await document.exitFullscreen();
        else if (player.requestFullscreen && document.fullscreenEnabled) await player.requestFullscreen();
        else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      } catch { showError('Fullscreen is unavailable. Use “Open video” below for a larger view.'); }
    }
    fullscreen.hidden = !(player.requestFullscreen && document.fullscreenEnabled) && !video.webkitEnterFullscreen;
    fullscreen.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', () => {
      const expanded = document.fullscreenElement === player;
      fullscreen.setAttribute('aria-label', expanded ? 'Exit fullscreen' : 'Enter fullscreen');
      fullscreen.title = `${expanded ? 'Exit fullscreen' : 'Fullscreen'} (F)`;
      showControls();
    });
    toggle.addEventListener('click', togglePlayback);
    video.addEventListener('pointerdown', event => {
      revealOnTap = event.pointerType === 'touch' && player.classList.contains('controls-hidden');
    });
    video.addEventListener('click', () => {
      if (revealOnTap) showControls();
      else togglePlayback();
      revealOnTap = false;
    });
    mute.addEventListener('click', toggleMute);
    volume.addEventListener('input', () => {
      video.volume = Number(volume.value);
      video.muted = video.volume === 0;
      if (video.volume > 0) previousVolume = video.volume;
    });
    seek.addEventListener('pointerdown', () => { scrubbing = true; showControls(); });
    function finishScrubbing() { scrubbing = false; updateTime(); showControls(); }
    window.addEventListener('pointerup', () => { if (scrubbing) finishScrubbing(); });
    window.addEventListener('pointercancel', () => { if (scrubbing) finishScrubbing(); });
    seek.addEventListener('input', () => {
      if (duration()) video.currentTime = Math.min(duration(), Math.max(0, Number(seek.value)));
      updateTime();
      showControls();
    });
    seek.addEventListener('change', finishScrubbing);
    for (const event of ['play', 'pause', 'ended']) video.addEventListener(event, updatePlayback);
    for (const event of ['loadedmetadata', 'durationchange', 'timeupdate']) video.addEventListener(event, updateTime);
    video.addEventListener('volumechange', updateVolume);
    video.addEventListener('error', () => showError('The film could not load. Please try “Open video” below.'));
    for (const event of ['pointermove', 'pointerdown', 'focusin']) player.addEventListener(event, showControls);
    player.addEventListener('keydown', event => {
      if (event.target.matches('input, button') || event.altKey || event.ctrlKey || event.metaKey) return;
      switch (event.key.toLowerCase()) {
        case ' ': case 'k': togglePlayback(); break;
        case 'm': toggleMute(); break;
        case 'f': toggleFullscreen(); break;
        case 'arrowleft': video.currentTime = Math.max(0, video.currentTime - 5); break;
        case 'arrowright': if (duration()) video.currentTime = Math.min(duration(), video.currentTime + 5); break;
        default: return;
      }
      event.preventDefault();
      showControls();
    });
    // Keep native controls available if scripts are disabled or setup fails.
    updatePlayback();
    updateTime();
    updateVolume();
    player.tabIndex = 0;
    video.tabIndex = -1;
    controls.hidden = false;
    video.controls = false;
  }

  // Enhance ordinary image links with the same native-dialog pattern as HHI.
  const viewer = document.querySelector('#mm-image-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;
  const image = viewer.querySelector('img');
  const title = viewer.querySelector('h2');
  const scrollArea = viewer.querySelector('.mm-image-scroll');
  let trigger = null;
  let backdropPressed = false;
  for (const link of document.querySelectorAll('[data-tutorial-image]')) {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      image.src = link.href;
      image.alt = link.querySelector('img').alt;
      title.textContent = link.dataset.title;
      viewer.showModal();
      scrollArea.scrollTop = scrollArea.scrollLeft = 0;
      document.body.classList.add('mm-viewer-open');
    });
  }
  viewer.querySelector('.mm-viewer-close').addEventListener('click', () => viewer.close());
  function outside(event) {
    const rect = viewer.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  }
  viewer.addEventListener('pointerdown', event => { backdropPressed = outside(event); });
  viewer.addEventListener('click', event => {
    if (backdropPressed && outside(event)) viewer.close();
    backdropPressed = false;
  });
  viewer.addEventListener('close', () => {
    document.body.classList.remove('mm-viewer-open');
    trigger?.focus({ preventScroll: true });
  });
})();
