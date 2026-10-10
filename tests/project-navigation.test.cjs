const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const controller = fs.readFileSync('case-navigation.js', 'utf8');

for (const [folder, file, prefix] of [
  ['project-1-lighthouse', 'lighthouse', 'lh'],
  ['project-2-southerncrafted', 'southern', 'sc'],
  ['project-3-hhi', 'hhi', 'hhi'],
  ['project-4-nalu', 'nalu', 'nl'],
  ['cube-preview', 'cube', 'cb'],
]) {
  const html = fs.readFileSync(`${folder}/index.html`, 'utf8');
  const source = fs.readFileSync(`${folder}/${file}.js`, 'utf8');
  const ids = [...html.matchAll(/<section\b[^>]*id="([^"]+)"[^>]*\bdata-case-section\b/g)].map(match => match[1]);
  const listMarkup = html.match(new RegExp(`<ol id="${prefix}-toc-list">([\\s\\S]*?)</ol>`))[1];
  const anchors = [...listMarkup.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(anchors, ids);
  assert(html.includes(`class="${prefix}-back" href="../?view=work"`));
  assert(html.indexOf('/case-navigation.js?') < html.indexOf(`./${file}.js?`));
  if (prefix !== 'cb') {
    assert(html.includes(`class="${prefix}-jump-design case-jump-design"`));
    assert(html.includes('Jump to the design <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>'));
    if (prefix === 'hhi') {
      assert(html.includes('class="hhi-prototype-link case-jump-design"'));
      assert(html.includes('View Figma Prototype <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>'));
    }
  } else {
    assert(html.includes('class="cb-hero-image"'));
    assert(html.indexOf('class="cb-hero-image"') < html.indexOf('class="cb-eyebrow"'));
  }

  for (const [desktop, headerHeight] of [[true, 0], [false, 64], [false, 98], [false, null]]) {
    for (const reduced of [false, true]) {
      const frames = [], scrollRequests = [], resizeObservers = [];
      const timers = new Map();
      let timerId = 0;
      function element() {
        const attributes = {}, handlers = {}, children = {}, classes = new Set(), properties = {};
        return {
          handlers, properties, scrollTop: 0,
          style: { setProperty: (name, value) => { properties[name] = value; } },
          setAttribute: (name, value) => { attributes[name] = value; },
          getAttribute: name => attributes[name],
          removeAttribute: name => { delete attributes[name]; },
          classList: {
            add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name),
            toggle(name, force = !classes.has(name)) { force ? classes.add(name) : classes.delete(name); return force; },
          },
          addEventListener: (name, handler) => { handlers[name] = handler; },
          querySelector: name => children[name] ||= element(),
          contains: () => false, focus() {},
          getBoundingClientRect: () => ({ top: 100, width: 220, height: 44 }),
        };
      }
      const window = { ...element(), scrollY: 0, innerHeight: 700,
        scrollTo(request) { scrollRequests.push(request); if (request.behavior === 'instant') window.scrollY = request.top; },
      };
      const location = { hash: '' };
      const history = { state: { retained: true }, pushState(state, _, hash) { assert.equal(state, this.state); location.hash = hash; } };
      const sections = ids.map((id, index) => ({ id, getBoundingClientRect: () => ({ top: index * 800 - window.scrollY }) }));
      let rowHeight = 44;
      const links = anchors.map((id, index) => ({ ...element(), hash: `#${id}`,
        getBoundingClientRect: () => ({ top: 100 + index * (rowHeight + 4), width: 220, height: rowHeight }),
      }));
      links[0].setAttribute('aria-current', 'location');
      const toc = element(), list = element(), viewer = element();
      const desktopQuery = { matches: desktop, addEventListener(name, handler) { this.change = handler; } };
      const document = {
        ...element(), body: element(), documentElement: { scrollHeight: ids.length * 800 + 400 },
        fonts: { ready: { then: handler => handler() } },
        querySelector(selector) {
          if (selector === '.site-header') return headerHeight === null ? null : { getBoundingClientRect: () => ({ height: headerHeight }) };
          if (selector === `.${prefix}-toc`) return toc;
          if (selector === `#${prefix}-toc-list`) return list;
          return viewer;
        },
        querySelectorAll(selector) {
          if (selector === '[data-case-section]') return sections;
          if (selector === `#${prefix}-toc-list a`) return links;
          return [];
        },
      };
      const context = vm.createContext({ document, window, location, history,
        matchMedia: query => query.includes('reduced-motion') ? { matches: reduced } : desktopQuery,
        getComputedStyle: target => target === document.documentElement ? { scrollPaddingTop: `${headerHeight ?? 0}px` } : { scrollMarginTop: '24px' },
        requestAnimationFrame: handler => frames.push(handler),
        setTimeout: handler => { const id = ++timerId; timers.set(id, handler); return id; },
        clearTimeout: id => timers.delete(id),
        ResizeObserver: class { constructor(callback) { resizeObservers.push(callback); } observe() {} },
      });
      const flush = () => { let count = 0; while (frames.length) { assert(++count < 100); frames.shift()(); } };
      const current = () => links.filter(link => link.getAttribute('aria-current') === 'location').map(link => link.hash);
      const click = (index, extras = {}) => {
        const event = { button: 0, preventDefault() { this.defaultPrevented = true; }, ...extras };
        links[index].handlers.click(event);
        return event;
      };
      const scroll = y => { window.scrollY = y; window.handlers.scroll(); flush(); };
      vm.runInContext(controller, context);
      vm.runInContext(source, context); flush();
      assert.deepEqual(current(), ['#overview']);
      const toggle = toc.querySelector(`.${prefix}-toc-toggle`);

      // Selection changes immediately, before right-hand content starts moving.
      for (let index = 1; index < sections.length; index++) {
        if (!desktop) { toggle.handlers.click(); assert.equal(toggle.getAttribute('aria-expanded'), 'true'); }
        const previousY = window.scrollY;
        const requestsBefore = scrollRequests.length;
        assert(click(index).defaultPrevented);
        assert.deepEqual(current(), [`#${ids[index]}`]);
        assert.equal(toggle.getAttribute('aria-expanded'), 'false');
        if (!reduced) {
          assert.equal(window.scrollY, previousY);
          assert.equal(scrollRequests.length, requestsBefore);
          frames.shift()(); // First paint does not scroll the article yet.
          assert.equal(scrollRequests.length, requestsBefore);
        }
        if (desktop) assert.equal(list.properties['--toc-active-y'], `${index * 48}px`);
        flush();
        assert.equal(scrollRequests.at(-1).behavior, reduced ? 'instant' : 'smooth');
        assert.equal(location.hash, `#${ids[index]}`);
        const targetY = scrollRequests.at(-1).top;
        if (!reduced) { scroll(previousY + 100); assert.deepEqual(current(), [`#${ids[index]}`]); }
        scroll(targetY);
        assert.deepEqual(current(), [`#${ids[index]}`]);
        assert.equal(timers.size, 0, 'Target arrival releases the scroll lock');
      }

      scroll(810);
      assert.deepEqual(current(), [`#${ids[1]}`]);
      for (const key of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
        assert(!click(0, { [key]: true }).defaultPrevented);
        assert.deepEqual(current(), [`#${ids[1]}`]);
      }
      assert(!click(0, { button: 1 }).defaultPrevented);
      scroll(document.documentElement.scrollHeight - window.innerHeight);
      assert.deepEqual(current(), [`#${ids.at(-1)}`]);
      window.scrollY = 0; location.hash = '#overview'; window.handlers.hashchange(); flush();
      assert.deepEqual(current(), ['#overview']);

      if (!reduced) {
        // A later click wins even before the earlier click gets its first paint.
        scrollRequests.length = 0;
        click(1); click(ids.length - 1); flush();
        assert.equal(scrollRequests.length, 1);
        assert.deepEqual(current(), [`#${ids.at(-1)}`]);
        scroll(810);
        assert.deepEqual(current(), [`#${ids.at(-1)}`]);
        window.handlers.wheel(); flush();
        assert.deepEqual(current(), [`#${ids[1]}`], 'User scrolling immediately takes back control');
        assert.equal(timers.size, 0);
        click(ids.length - 1); flush();
        document.handlers.keydown({ key: 'PageUp' }); flush();
        assert.deepEqual(current(), [`#${ids[1]}`]);
        click(2); flush(); window.handlers.touchstart(); flush();
        assert.deepEqual(current(), [`#${ids[1]}`]);
        click(ids.length - 1); flush();
        for (const callback of [...timers.values()]) callback();
        flush();
        assert.deepEqual(current(), [`#${ids[1]}`], 'Fallback cannot leave a stuck destination highlight');
      }
      if (desktop) {
        rowHeight = 68;
        resizeObservers.forEach(callback => callback());
        assert.equal(list.properties['--toc-active-height'], '68px');
        desktopQuery.matches = false; desktopQuery.change();
        assert(!list.classList.contains('has-toc-indicator'));
        desktopQuery.matches = true; desktopQuery.change();
        assert(list.classList.contains('has-toc-indicator'));
      } else {
        assert(!list.classList.contains('has-toc-indicator'));
        toggle.handlers.click(); document.handlers.keydown({ key: 'Escape' });
        assert.equal(toggle.getAttribute('aria-expanded'), 'false');
      }
      if (prefix === 'lh' || prefix === 'hhi') assert.equal(typeof viewer.handlers.close, 'function', 'Image viewer still initializes');
    }
  }
}
console.log('PASS: all published and local-draft project menus select before scrolling, keep destination highlighted in transit, handle rapid clicks and user interruptions, track native scroll/hash, reposition the indicator, respect reduced motion, close mobile Contents, and retain image viewers and Back links.');
