function initAboutDisclosures() {
  const rows = document.querySelectorAll('.workspace-about-card details.about-resume-row');
  if (!rows.length) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null;
  const characters = text => segmenter ? [...segmenter.segment(text)].map(part => part.segment) : Array.from(text);
  const finishers = [];

  rows.forEach((row, index) => {
    const summary = row.querySelector('summary');
    const description = row.querySelector('.about-resume-description');
    if (!summary || !description) return;
    const panel = document.createElement('div');
    panel.className = 'about-resume-panel';
    panel.id = `about-resume-panel-${index + 1}`;
    description.before(panel);
    panel.append(description);
    summary.setAttribute('aria-controls', panel.id);
    let expanded = row.open;
    let animation = null;
    let prepared = false;

    function updateControl() {
      row.dataset.expanded = String(expanded);
      summary.setAttribute('aria-expanded', String(expanded));
      panel.inert = !expanded;
    }

    function prepareText() {
      if (prepared) return;
      let characterIndex = 0;
      for (const paragraph of description.querySelectorAll('p')) {
        const text = paragraph.textContent;
        const accessible = document.createElement('span');
        accessible.className = 'about-reveal-accessible';
        accessible.textContent = text;
        const visual = document.createElement('span');
        visual.setAttribute('aria-hidden', 'true');
        // Keep normal spaces and whole words so mobile line breaks remain natural.
        for (const part of text.split(/(\s+)/)) {
          if (/^\s+$/.test(part)) {
            visual.append(document.createTextNode(part));
            characterIndex += characters(part).length;
            continue;
          }
          const word = document.createElement('span');
          word.className = 'about-reveal-word';
          for (const char of characters(part)) {
            const letter = document.createElement('span');
            letter.className = 'about-reveal-letter';
            letter.textContent = char;
            letter.style.setProperty('--reveal-delay', `${characterIndex++ * 15}ms`);
            word.append(letter);
          }
          visual.append(word);
        }
        paragraph.replaceChildren(accessible, visual);
      }
      prepared = true;
    }

    function finish() {
      const current = animation;
      animation = null;
      row.open = expanded;
      current?.cancel();
      panel.classList.remove('is-resume-animating');
      if (!expanded || motion.matches) description.classList.remove('is-revealing');
      updateControl();
    }

    function setExpanded(next) {
      // Measure before cancelling so rapid clicks reverse from the current height.
      const fromHeight = row.open ? panel.getBoundingClientRect().height : 0;
      const fromOpacity = row.open ? Number(getComputedStyle(panel).opacity) : 0;
      animation?.cancel();
      animation = null;
      expanded = next;
      updateControl();
      if (expanded) {
        row.open = true;
        prepareText();
        description.classList.remove('is-revealing');
        description.getBoundingClientRect();
        if (!motion.matches) description.classList.add('is-revealing');
      }
      if (motion.matches || typeof panel.animate !== 'function') {
        finish();
        return;
      }
      const toHeight = expanded ? description.getBoundingClientRect().height : 0;
      panel.classList.add('is-resume-animating');
      const current = panel.animate([
        { height: `${fromHeight}px`, opacity: fromOpacity },
        { height: `${toHeight}px`, opacity: expanded ? 1 : 0 },
      ], { duration: expanded ? 260 : 200, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' });
      animation = current;
      current.onfinish = () => { if (animation === current) finish(); };
    }

    summary.addEventListener('click', event => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      setExpanded(!expanded);
    });
    updateControl();
    finishers.push(finish);
  });

  motion.addEventListener('change', () => {
    if (motion.matches) finishers.forEach(finish => finish());
  });
  window.addEventListener('resize', () => finishers.forEach(finish => finish()));
  window.addEventListener('pagehide', () => finishers.forEach(finish => finish()));
}

initAboutDisclosures();
