const helloHand = document.querySelector('.hello-hand');
const celebration = document.querySelector('.hero-celebration');
const gentleMotion = matchMedia('(prefers-reduced-motion: reduce)');

helloHand.addEventListener('click', () => {
  if (helloHand.classList.contains('is-clapping')) return;
  helloHand.classList.add('is-clapping');
  helloHand.setAttribute('aria-label', 'Clapping — hooray!');

  const hand = helloHand.getBoundingClientRect();
  const area = celebration.getBoundingClientRect();
  const originX = hand.left + hand.width / 2 - area.left;
  const originY = hand.top + hand.height / 2 - area.top;
  const radius = Math.min(area.width * .32, 260);
  const colors = ['#ed612b', '#f3b942', '#7b9a84', '#b0a0ce', '#ed8863'];
  const shapes = ['', 'hello-confetti-dot', 'hello-confetti-ribbon', 'hello-confetti-star'];
  const reduced = gentleMotion.matches;
  const count = reduced ? 12 : 40;

  for (let i = 0; i < count; i++) {
    const bit = document.createElement('span');
    bit.className = `hello-confetti ${shapes[i % shapes.length]}`;
    bit.style.backgroundColor = colors[i % colors.length];
    bit.style.left = `${originX}px`;
    bit.style.top = `${originY}px`;
    const angle = (i / count) * Math.PI * 2 + Math.random() * .25;
    const distance = radius * (.4 + Math.random() * .6);
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance * .68;
    const spin = (Math.random() - .5) * 420;
    celebration.append(bit);

    // Reduced motion keeps the celebration in place instead of flying outward.
    const frames = reduced ? [
      { transform: `translate(${dx * .45}px, ${dy * .45}px)`, opacity: 0 },
      { opacity: 1, offset: .2 },
      { transform: `translate(${dx * .45}px, ${dy * .45}px)`, opacity: 0 }
    ] : [
      { transform: 'translate(0, 0) rotate(0) scale(.3)', opacity: 0 },
      { opacity: 1, offset: .08 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg)`, opacity: 1, offset: .62 },
      { transform: `translate(${dx * 1.12}px, ${dy + 70}px) rotate(${spin + 110}deg) scale(.7)`, opacity: 0 }
    ];
    const animation = bit.animate(frames, {
      duration: reduced ? 850 : 1600 + Math.random() * 500,
      delay: reduced ? 0 : (i % 2) * 140,
      easing: 'cubic-bezier(.16,.65,.3,1)',
      fill: 'both'
    });
    animation.finished.then(() => bit.remove()).catch(() => bit.remove());
  }

  setTimeout(() => {
    helloHand.classList.remove('is-clapping');
    helloHand.setAttribute('aria-label', 'Wave to Blair — click to celebrate');
  }, reduced ? 1000 : 2400);
});
