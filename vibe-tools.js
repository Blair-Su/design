(() => {
  const root = document.getElementById('vibe-coding-partner');
  if (!root) return;
  const surface = root.querySelector('.vibe-tools-animation');
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const status = root.querySelector('.vibe-tools-status');
  const hero = root.closest('.hero');
  const intro = hero?.querySelector('h1');
  const artwork = root.querySelector('.vibe-tools-inner');
  const captions = [...root.querySelectorAll('h2')];
  const pairedArtwork = matchMedia('(min-width: 600px)');
  let introOffset = 0, artworkOffset = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sources = {
    figma: 'assets/vibe-tools/figma.svg',
    github: 'assets/vibe-tools/github.webp',
    codex: 'assets/vibe-tools/codex.webp',
    framer: 'assets/vibe-tools/framer.svg',
    box: 'assets/vibe-tools/box-clean.webp',
  };
  const images = {};
  const W = 700, H = 610, CARD = 112;
  const heightScale = parseFloat(getComputedStyle(surface).getPropertyValue('--vibe-height-scale')) || .88;
  // Compact the composition around its visible bottom, preserving logo sizes.
  const fitY = y => 580 + (y - 580) * heightScale;
  const cardOriginY = fitY(448);
  const targets = [
    { x: 138, y: 201, tilt: -17 },
    { x: 288, y: 134, tilt: -10 },
    { x: 427, y: 162, tilt: 10 },
    { x: 563, y: 235, tilt: 12 },
  ].map(target => ({ x: target.x, y: fitY(target.y), rotation: target.tilt * Math.PI / 180 }));
  const cards = targets.map((target, i) => ({
    name: ['figma', 'github', 'codex', 'framer'][i], target,
    x: target.x, y: cardOriginY, visible: false,
  }));
  let width = W, height = H, dpr = 1, busy = false, opened = false, pocket = 0;
  let ready = false, inView = false, hasPlayed = false;

  function rounded(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function drawCard(card) {
    if (!card.visible) return;
    const x = -CARD / 2, y = -CARD / 2;
    ctx.save();
    ctx.translate(card.x, card.y);
    ctx.rotate(card.target.rotation);
    ctx.shadowColor = 'rgba(35,42,78,.14)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    rounded(x, y, CARD, CARD, 25);
    ctx.fillStyle = card.name === 'figma' ? '#17181b' : '#ffffff';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1;
    ctx.strokeStyle = card.name === 'figma' ? 'rgba(255,255,255,.13)' : 'rgba(60,64,80,.10)';
    ctx.stroke();
    ctx.save();
    rounded(x, y, CARD, CARD, 25);
    ctx.clip();
    const size = card.name === 'codex' ? CARD : card.name === 'figma' ? 72 : card.name === 'framer' ? 132 : 84;
    // Each complete tile keeps its reference tilt while the pop changes position.
    ctx.drawImage(images[card.name], -size / 2, -size / 2, size, size);
    ctx.restore();
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.scale(width / W, width / W);
    if (!images.box) return;
    const boxTop = fitY(207 - pocket * 3);
    ctx.drawImage(images.box, 25, boxTop, 650, 650 * 1024 / 1536 * heightScale);
    cards.forEach(drawCard);
    // The front flap and walls hide the tool cards until they leave the box.
    ctx.save();
    ctx.translate(25, boxTop);
    ctx.scale(650 / 1536, 650 / 1536 * heightScale);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(780, 0);
    ctx.lineTo(780, 191);
    ctx.lineTo(893, 410);
    ctx.lineTo(1536, 410);
    ctx.lineTo(1536, 1024);
    ctx.lineTo(0, 1024);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(images.box, 0, 0);
    ctx.restore();
  }

  function balanceIntroSpacing() {
    if (!intro) return;
    if (!pairedArtwork.matches && artworkOffset) {
      artworkOffset = 0;
      artwork.style.removeProperty('--hero-art-offset');
    }
    const heroBounds = hero.getBoundingClientRect();
    const introBounds = intro.getBoundingClientRect();
    const stageBounds = surface.getBoundingClientRect();
    // Both settled illustrations start about 20% down their transparent stages.
    // Use that stable edge so the text never follows the artwork's small motions.
    const artworkTop = stageBounds.top + stageBounds.height * .2;
    if (pairedArtwork.matches && artwork && captions.length) {
      const captionsBottom = Math.max(...captions.map(caption => caption.getBoundingClientRect().bottom));
      const textHeight = introBounds.bottom - introBounds.top;
      const artHeight = captionsBottom - artworkTop;
      // Share the remaining visible space equally above the text, between
      // text and artwork, and below both captions. Translations preserve size.
      const gap = Math.max(0, (heroBounds.bottom - heroBounds.top - textHeight - artHeight) / 3);
      introOffset += heroBounds.top + gap - introBounds.top;
      artworkOffset += heroBounds.bottom - gap - captionsBottom;
      artwork.style.setProperty('--hero-art-offset', `${artworkOffset}px`);
    } else {
      const above = introBounds.top - heroBounds.top;
      const below = artworkTop - introBounds.bottom;
      introOffset = Math.max(0, introOffset + (below - above) / 2);
    }
    intro.style.setProperty('--hero-intro-offset', `${introOffset}px`);
  }

  function resize() {
    width = surface.clientWidth;
    height = surface.clientHeight;
    if (!width || !height) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    draw();
    balanceIntroSpacing();
  }

  function animate(duration, update) {
    if (reduced.matches) { update(1); draw(); return Promise.resolve(); }
    return new Promise(resolve => {
      const start = performance.now();
      const tick = now => {
        const t = reduced.matches ? 1 : Math.min(1, (now - start) / duration);
        update(t);
        draw();
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  function settle(value) {
    opened = value;
    pocket = value ? 1 : 0;
    cards.forEach(card => {
      card.y = value ? card.target.y : cardOriginY;
      card.visible = value;
    });
    draw();
  }

  async function replay(announce = false) {
    if (!ready || busy) return;
    busy = true;
    hasPlayed = true;
    surface.disabled = true;
    status.textContent = '';
    try {
      if (reduced.matches) {
        settle(true);
      } else {
        if (opened) {
          await animate(370, t => {
            cards.forEach(card => { card.y = card.target.y + (cardOriginY - card.target.y) * t * t; });
            pocket = 1 - t;
          });
          settle(false);
        }
        await animate(230, t => { pocket = 1 - Math.pow(1 - t, 3); });
        const popDuration = 870 + (cards.length - 1) * 145;
        await animate(popDuration, t => {
          cards.forEach((card, i) => {
            const p = Math.max(0, Math.min(1, (t * popDuration - i * 145) / 870));
            card.visible = p > 0;
            const eased = 1 + 2.05 * Math.pow(p - 1, 3) + 1.05 * Math.pow(p - 1, 2);
            card.y = cardOriginY + (card.target.y - cardOriginY) * eased;
          });
        });
        settle(true);
      }
      if (announce) status.textContent = 'Figma, GitHub, Codex and Framer are ready.';
    } finally {
      busy = false;
      surface.disabled = false;
    }
  }

  function playOnEntry() {
    if (ready && inView && !hasPlayed) replay();
  }

  surface.addEventListener('click', () => replay(true));
  new ResizeObserver(resize).observe(surface);
  if (intro) {
    const introLayout = new ResizeObserver(balanceIntroSpacing);
    introLayout.observe(intro);
    introLayout.observe(hero);
    captions.forEach(caption => introLayout.observe(caption));
    document.fonts?.ready.then(balanceIntroSpacing);
  }
  resize();

  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting);
      playOnEntry();
    }, { threshold: 0.4 });
    visibility.observe(surface);
  } else inView = true;

  Promise.all(Object.entries(sources).map(([name, src]) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { images[name] = img; resolve(); };
    img.onerror = reject;
    img.src = src;
  }))).then(() => {
    ready = true;
    root.classList.add('is-ready');
    surface.disabled = false;
    draw();
    playOnEntry();
  }).catch(() => {
    // Keep the static, local box image visible if an animation asset fails.
    surface.disabled = true;
  });
})();
