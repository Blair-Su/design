(() => {
  const screens = document.querySelectorAll('[data-phone-motion]');
  if (!screens.length) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const players = new Map();

  function updateButton(player) {
    const playing = !player.video.paused && !player.video.ended;
    const label = `${playing ? 'Pause' : 'Play'} animation: ${player.description}`;
    player.button.dataset.state = playing ? 'playing' : 'paused';
    player.button.setAttribute('aria-label', label);
  }
  function shouldPlay(player) {
    return player.visible && !document.hidden && !player.userPaused;
  }
  function sync(player) {
    if (!shouldPlay(player)) {
      player.video.pause();
      updateButton(player);
      return;
    }
    if (!player.video.paused || player.pending) return;
    if (!player.video.hasAttribute('src')) player.video.src = player.source;
    player.pending = true;
    Promise.resolve(player.video.play()).catch(() => {
      // Autoplay may be blocked; the same button can start playback explicitly.
    }).finally(() => {
      player.pending = false;
      if (!shouldPlay(player)) player.video.pause();
      updateButton(player);
    });
  }

  for (const screen of screens) {
    const original = screen.querySelector('img');
    if (!original) continue;
    const video = document.createElement('video');
    video.className = 'lh-phone-motion';
    video.poster = screen.dataset.phonePoster;
    video.width = original.width;
    video.height = original.height;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('aria-label', original.alt);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lh-phone-motion-toggle';
    button.innerHTML = '<svg class="lh-motion-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg><svg class="lh-motion-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
    const player = { video, button, source: screen.dataset.phoneMotion, description: original.alt,
      visible: false, userPaused: motion.matches, pending: false };
    players.set(screen, player);
    for (const event of ['play', 'pause', 'ended']) {
      video.addEventListener(event, () => updateButton(player));
    }
    button.addEventListener('click', () => {
      player.userPaused = !video.paused;
      player.visible = true;
      sync(player);
    });
    updateButton(player);
    screen.replaceChildren(video, button);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const player = players.get(entry.target);
        player.visible = entry.isIntersecting && entry.intersectionRatio >= .15;
        sync(player);
      }
    }, { threshold: .15 });
    for (const screen of players.keys()) observer.observe(screen);
  } else {
    for (const player of players.values()) { player.visible = true; sync(player); }
  }
  document.addEventListener('visibilitychange', () => players.forEach(sync));
  window.addEventListener('pagehide', () => players.forEach(player => player.video.pause()));
  window.addEventListener('pageshow', () => players.forEach(sync));
  motion.addEventListener('change', () => {
    if (motion.matches) players.forEach(player => { player.userPaused = true; });
    players.forEach(sync);
  });
})();
