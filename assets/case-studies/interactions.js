(() => {
  const activeRoot = () => [...document.querySelectorAll('.case-breakpoint')].find(el => el.getClientRects().length);
  const target = id => [...(activeRoot()?.querySelectorAll('[data-anchor]') || [])].find(el => el.dataset.anchor === id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Hidden breakpoint copies must not share SVG paint servers with the visible card.
  document.querySelectorAll('.case-more-link[href="./project-1-lighthouse/"] svg').forEach((svg, index) => {
    svg.querySelectorAll('linearGradient[id]').forEach(gradient => {
      const previousId = gradient.id;
      gradient.id = `lighthouse-${index}-${previousId}`;
      svg.querySelectorAll('[fill]').forEach(shape => {
        if (shape.getAttribute('fill') === `url(#${previousId})`) {
          shape.setAttribute('fill', `url(#${gradient.id})`);
        }
      });
    });
  });
  document.querySelectorAll('.case-phone [data-source$="l8HodM7QO"]').forEach(frame => {
    const artwork = document.createElement('div');
    artwork.className = 'case-mobile-artwork';
    artwork.append(...frame.childNodes);
    frame.append(artwork);
    new ResizeObserver(() => {
      artwork.style.transform = `scale(${frame.clientWidth / 806})`;
    }).observe(frame);
  });
  document.querySelectorAll('article a').forEach(link => {
    if (link.textContent.trim() === 'Prototype link') link.classList.add('case-prototype-link');
  });
  document.querySelectorAll('[data-source$="fqen_ppT1"]').forEach(diagram => {
    const image = document.createElement('img');
    image.src = './assets/case-studies/lighthouse-research-meal-flow.png';
    image.alt = 'Before meal: find a restaurant, check glucose, and take insulin (injection/medication). After meal: monitor glucose afterward and take prescribed medication or insulin if needed.';
    image.width = 3464;
    image.height = 850;
    image.className = 'case-research-meal-flow';
    diagram.replaceWith(image);
  });
  document.querySelectorAll('article > .case-node > [data-layer="Divider"]').forEach(divider => {
    const section = divider.parentElement;
    [...section.children].forEach(child => {
      const style = getComputedStyle(child);
      if (style.display === 'flex' && style.flexDirection === 'column' &&
          child.children.length > 1 && style.rowGap === '40px' && style.padding === '0px') {
        child.classList.add('case-chapter-content');
      }
    });
  });
  document.querySelectorAll('.case-desktop .case-more-projects').forEach(group => {
    const cards = [...group.querySelectorAll(':scope > .case-more-link')];
    const sizes = cards.map(card => {
      // Read the original fixed-size artwork before enabling proportional scaling.
      const width = parseFloat(getComputedStyle(card).width);
      const height = parseFloat(getComputedStyle(card).height);
      card.style.setProperty('--card-width', width + 'px');
      card.style.setProperty('--card-height', height + 'px');
      return width;
    });
    group.classList.add('is-scaled');
    new ResizeObserver(() => {
      if (!group.clientWidth) return;
      const scale = Math.min(1.16, (group.clientWidth - 16 * (cards.length - 1)) / sizes.reduce((a,b) => a+b, 0));
      group.style.setProperty('--card-scale', scale);
    }).observe(group);
  });
  document.querySelectorAll('[data-carousel]').forEach(carousel=>{
    const slides=[...carousel.querySelectorAll(':scope>.case-carousel-slides>[data-slide]')];let index=0;
    const show=delta=>{index=(index+delta+slides.length)%slides.length;slides.forEach((s,i)=>s.hidden=i!==index);carousel.querySelector('[data-carousel-count]').textContent=`${index+1} / ${slides.length}`;};
    carousel.querySelector('[data-prev]').addEventListener('click',()=>show(-1));
    carousel.querySelector('[data-next]').addEventListener('click',()=>show(1));
    show(0);
  });
})();
