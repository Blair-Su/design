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
  const copyTimers = new WeakMap();
  const copyStatus = document.createElement('span');
  copyStatus.className = 'case-copy-status';
  copyStatus.setAttribute('role', 'status');
  document.body.append(copyStatus);
  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly', '');
    input.style.cssText = 'position:fixed;top:-9999px';
    document.body.append(input);
    input.select();
    try { if (!document.execCommand('copy')) throw new Error('Copy failed'); }
    finally { input.remove(); }
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.setAttribute('href', location.pathname + link.getAttribute('href'));
  });
  function moveTo(id, updateHistory = true) {
    const el = target(id);
    if (!el && id !== 'overview') return;
    if (updateHistory) history.pushState(null, '', location.pathname + '#' + id);
    window.scrollTo({top:id === 'overview' ? 0 : window.scrollY + el.getBoundingClientRect().top - 96,behavior:reduced.matches?'instant':'smooth'});
  }
  document.addEventListener('click', async event => {
    const copy = event.target.closest('[data-copy]');
    if (copy) {
      copyStatus.textContent = '';
      try {
        await copyText(copy.dataset.copy);
        clearTimeout(copyTimers.get(copy));
        copy.classList.add('is-copied');
        copyStatus.textContent = 'Copied ' + copy.querySelector('span').textContent + ' to clipboard.';
        copyTimers.set(copy, setTimeout(() => copy.classList.remove('is-copied'), 2000));
      } catch {
        copy.classList.remove('is-copied');
        copyStatus.textContent = 'Unable to copy. Please try again.';
      }
      return;
    }
    const link=event.target.closest('a');
    if(link && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey){
      const url=new URL(link.href);
      if(url.origin===location.origin && url.pathname===location.pathname && url.hash){event.preventDefault();moveTo(url.hash.slice(1));link.closest('details')?.removeAttribute('open');return;}
    }
    if (!event.target.closest('.case-bottom details')) document.querySelectorAll('.case-bottom details[open]').forEach(el=>el.removeAttribute('open'));
  });
  document.addEventListener('keydown', event=>{if(event.key==='Escape')document.querySelectorAll('.case-bottom details[open]').forEach(el=>{el.removeAttribute('open');el.querySelector('summary').focus()})});
  document.querySelectorAll('[data-carousel]').forEach(carousel=>{
    const slides=[...carousel.querySelectorAll(':scope>.case-carousel-slides>[data-slide]')];let index=0;
    const show=delta=>{index=(index+delta+slides.length)%slides.length;slides.forEach((s,i)=>s.hidden=i!==index);carousel.querySelector('[data-carousel-count]').textContent=`${index+1} / ${slides.length}`;};
    carousel.querySelector('[data-prev]').addEventListener('click',()=>show(-1));
    carousel.querySelector('[data-next]').addEventListener('click',()=>show(1));
    show(0);
  });
  let pending=false;
  function update(){pending=false;const root=activeRoot();if(!root)return;const links=[...root.querySelectorAll('[data-section]')];let current='overview';for(const a of links){const el=target(a.dataset.section);if(el&&el.getBoundingClientRect().top<=121)current=a.dataset.section;}links.forEach(a=>{if(a.dataset.section===current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});}
  function schedule(){if(!pending){pending=true;requestAnimationFrame(update)}}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  window.addEventListener('popstate',()=>moveTo(location.hash.slice(1)||'overview',false));
  window.addEventListener('load',()=>{if(location.hash)moveTo(location.hash.slice(1),false);update()});
  document.fonts.ready.then(update);
  update();
})();
