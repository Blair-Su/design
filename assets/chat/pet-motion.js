// There are no idle actions or pose changes: the approved fox stays seated and
// only the tail's SVG transform animates. Pause offscreen and for reduced motion.
export function mountFoxMotion({ pet, reduced }) {
  const avatar = pet.querySelector('.fox-avatar');
  function sync() {
    if (reduced.matches) {
      avatar.pauseAnimations();
      avatar.setCurrentTime(0);
    } else if (document.hidden) avatar.pauseAnimations();
    else avatar.unpauseAnimations();
    pet.classList.toggle('is-paused', document.hidden);
    pet.classList.toggle('is-reduced', reduced.matches);
  }
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  sync();
  return {
    destroy() {
      avatar.pauseAnimations();
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', sync);
    },
  };
}
