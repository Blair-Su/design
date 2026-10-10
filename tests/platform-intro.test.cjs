const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('workspace-layout.js', 'utf8');

function setup({ reduced = false, mobile = false, tablet = false, hash = '', search = '', navigation = 'navigate', entered = false } = {}) {
  let now = 0, serial = 0;
  const timers = new Map(), frames = new Map(), windowEvents = {}, documentEvents = {};
  const location = { pathname: '/', search, hash };
  const element = name => {
    const classes = new Set();
    return { name, inert: false, dataset: {}, style: { setProperty(k,v) { this[k] = v; } },
      classList: {
        contains: c => classes.has(c), add: (...names) => names.forEach(c => classes.add(c)),
        remove: (...names) => names.forEach(c => classes.delete(c)),
        toggle: (c, yes) => yes ? classes.add(c) : classes.delete(c),
      },
      getBoundingClientRect: () => ({ height: 520, width: 320, right: 1400 }),
      contains: el => el?.parent === name,
      closest(selector) {
        if (name === 'fox' && selector.includes('.fox-companion')) return this;
        if (name === 'dialog' && selector.includes('dialog')) return this;
        if (name === 'profile-sidebar' && selector === '.profile-sidebar') return this;
        if (this.href && selector.startsWith('a')) return this;
        if (['button', 'summary'].includes(name) && selector === 'a, button, summary') return this;
        return null;
      },
      getAttribute(k) { return this[k]; },
      setAttribute(k, value) { this[k] = value; },
      removeAttribute(k) { delete this[k]; },
      focus() { this.focused = true; doc.activeElement = this; },
      scrollIntoView() { this.scrolled = true; },
    };
  };
  const body = element('body'); body.classList.add('home-page');
  const els = Object.fromEntries(['hero','site-header','hero-scroll-cue','portfolio-workspace','profile-sidebar','workspace-chat-rail','site-footer'].map(n => ['.'+n,element(n)]));
  const identity = element('identity'); identity.href = '#top'; identity.parent = 'portfolio-workspace';
  const work = element('work'); work.parent = 'portfolio-workspace';
  const about = element('about'); about.parent = 'portfolio-workspace';
  const playground = element('playground'); playground.parent = 'portfolio-workspace';
  const aboutPhotos = Array.from({ length: 3 }, () => ({ loading: 'lazy' }));
  about.querySelectorAll = selector => selector === '.about-intro-photos img' ? aboutPhotos : [];
  els['#work'] = work; els['#about'] = about; els['#playground'] = playground;
  els['.portfolio-workspace'].querySelector = selector => els[selector] || identity;
  const mobileLinks = ['intro', 'workspace', 'about', 'playground'].map(stage => {
    const link = element('mobile-link'); link.dataset.mobilePage = stage; return link;
  });
  const viewLinks = ['work', 'about', 'playground'].map(view => {
    const link = element('view-link'); link.dataset.workspaceView = view; link.href = view === 'work' ? '#work' : `/?view=${view}`; return link;
  });
  els['.site-header'].querySelectorAll = () => mobileLinks;
  els['.hero-scroll-cue'].href = '#work'; els['.hero-scroll-cue'].parent = 'hero';
  const doc = { body, title: 'Blair Su I Product Designer', activeElement: body, documentElement: { clientWidth: 1440 },
    querySelector: s => els[s], getElementById: () => els['.portfolio-workspace'],
    querySelectorAll: () => viewLinks,
    addEventListener: (name, fn) => { documentEvents[name] = fn; },
  };
  const motion = { matches: reduced, addEventListener: (name, fn) => { motion[name] = fn; } };
  const phoneLayout = { matches: mobile, addEventListener: (name, fn) => { phoneLayout[name] = fn; } };
  const compactHeader = { matches: mobile || tablet, addEventListener: (name, fn) => { compactHeader[name] = fn; } };
  const win = { scrollY: 0, innerHeight: 900, matchMedia: query => query.includes('767px') ? phoneLayout : query.includes('1023px') ? compactHeader : motion,
    addEventListener: (name, fn) => { windowEvents[name] = fn; },
    scrollTo({ top }) { this.scrollY = top; },
  };
  const history = { state: { portfolioEntered: entered }, previous: [], replaceState(state, _, url) {
    this.state = state;
    if (url !== undefined) {
      const destination = new URL(url, 'https://portfolio.test');
      location.pathname = destination.pathname;
      location.search = destination.search;
      location.hash = destination.hash;
    }
  }, pushState(state, _, url) {
    this.previous.push({ state: this.state, url: `${location.pathname}${location.search}${location.hash}` });
    this.replaceState(state, _, url);
  }, back() {
    const previous = this.previous.pop();
    if (!previous) return;
    this.replaceState(previous.state, '', previous.url);
    windowEvents.popstate?.();
  } };
  const context = vm.createContext({ document: doc, window: win, location, history, URLSearchParams,
    performance: { now: () => now, getEntriesByType: () => [{ type: navigation }] },
    requestAnimationFrame: fn => { frames.set(++serial, fn); return serial; },
    setTimeout: (fn, delay) => { timers.set(++serial, { fn, at: now + delay }); return serial; },
    clearTimeout: id => timers.delete(id),
  });
  const flush = () => { const current = [...frames.values()]; frames.clear(); current.forEach(fn => fn()); };
  const advance = ms => {
    const end = now + ms;
    while (true) {
      const next = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a,b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn(); flush();
    }
    now = end; flush();
  };
  const dispatch = (surface, type, details = {}) => {
    const event = { target: body, isTrusted: true, cancelable: true, deltaX: 0, deltaY: 0, deltaMode: 0, detail: 1,
      preventDefault() { this.defaultPrevented = true; }, ...details };
    (surface === 'window' ? windowEvents : documentEvents)[type]?.(event); flush(); return event;
  };
  vm.runInContext(source, context); flush();
  return { body, els, identity, work, about, playground, aboutPhotos, viewLinks, mobileLinks, doc, win, history, location, motion, phoneLayout, compactHeader, element, advance, dispatch, stage: () => body.dataset.stage };
}

let h = setup();
assert.equal(h.stage(), 'intro');
assert.equal(h.els['.portfolio-workspace'].inert, true);
assert.equal(h.els['.hero'].inert, false);
h.advance(30000); assert.equal(h.stage(),'intro');
h.dispatch('window','wheel',{deltaY:-100}); assert.equal(h.stage(),'intro');
assert(!h.dispatch('window','wheel',{deltaY:100,ctrlKey:true}).defaultPrevented);
assert(!h.dispatch('window','wheel',{deltaY:100,target:h.element('fox')}).defaultPrevented);
h.dispatch('window','wheel',{deltaY:12}); assert.equal(h.stage(),'intro');
h.dispatch('window','wheel',{deltaY:32}); assert.equal(h.stage(),'entering');
assert.equal(h.els['.hero'].inert,true);
h.advance(700); assert.equal(h.stage(), 'entering');
assert.equal(h.els['.portfolio-workspace'].inert, true);
h.advance(1000); h.dispatch('window','wheel',{deltaY:160}); h.advance(100);
assert.equal(h.stage(),'entering');
h.advance(140); assert.equal(h.stage(),'workspace');
assert.equal(h.els['.portfolio-workspace'].inert,false);
assert.equal(h.history.state.portfolioEntered,true);
assert(!h.dispatch('window','wheel',{deltaY:100}).defaultPrevented);
h.win.scrollY=0; h.dispatch('window','pageshow'); assert.equal(h.stage(),'workspace');
h.dispatch('document','click',{target:h.identity,detail:0});
assert.equal(h.stage(),'intro'); assert(!h.els['.hero-scroll-cue'].focused);
h.advance(1799); assert(!h.els['.hero-scroll-cue'].focused);
h.advance(1); assert(h.els['.hero-scroll-cue'].focused);
assert.equal(h.history.state.portfolioEntered,false);
h.dispatch('window','touchstart',{touches:[{clientX:150,clientY:600}]});
const swipe=h.dispatch('window','touchmove',{touches:[{clientX:153,clientY:545}]});
assert(swipe.defaultPrevented); assert.equal(h.stage(),'entering');
h.dispatch('window','touchend'); h.advance(1800); assert.equal(h.stage(),'workspace');

h=setup(); h.dispatch('document','keydown',{key:'PageDown'}); h.advance(1800);
assert.equal(h.stage(),'workspace'); assert(h.identity.focused);
h=setup(); h.dispatch('document','click',{target:h.els['.hero-scroll-cue'],detail:0}); h.advance(1800);
assert.equal(h.stage(),'workspace'); assert(h.identity.focused);
h=setup({reduced:true}); h.advance(500); h.dispatch('window','wheel',{deltaY:100}); assert.equal(h.stage(),'workspace');
h=setup(); h.advance(500); h.dispatch('window','wheel',{deltaY:100}); h.motion.matches=true; h.motion.change(); assert.equal(h.stage(),'workspace');
h=setup({hash:'#work'}); h.advance(30000); assert.equal(h.stage(),'intro'); assert(!h.els['.portfolio-workspace'].scrolled);
h=setup({hash:'#top'}); assert.equal(h.stage(),'intro');
h=setup({navigation:'back_forward',entered:true}); h.advance(30000); assert.equal(h.stage(),'intro');
h=setup({navigation:'reload',entered:true}); assert.equal(h.stage(),'intro');
h=setup({search:'?view=work&v=preview'});
assert.equal(h.stage(),'workspace');
assert.equal(h.els['.hero'].inert,true); assert.equal(h.els['.portfolio-workspace'].inert,false);
assert.equal(h.win.scrollY,0); assert.equal(h.history.state.portfolioEntered,true);
assert.equal(h.location.search,'?v=preview'); // Consume the Back destination without losing other parameters.
h.advance(30000); assert.equal(h.stage(),'workspace');
h.dispatch('window','wheel',{deltaY:-100}); assert.equal(h.stage(),'intro');
h=setup({search:'?view=other'}); assert.equal(h.stage(),'intro');
h=setup(); h.dispatch('window','wheel',{deltaY:200}); h.advance(250); h.dispatch('window','wheel',{deltaY:150}); h.advance(100); h.dispatch('window','wheel',{deltaY:100}); h.advance(500); assert.equal(h.stage(),'intro');
h.dispatch('window','wheel',{deltaY:100,isTrusted:false}); assert.equal(h.stage(),'intro');
h.dispatch('window','wheel',{deltaY:100}); assert.equal(h.stage(),'entering'); h.advance(1800); assert.equal(h.stage(),'workspace');
h.dispatch('window','pageshow',{persisted:true}); h.advance(30000); assert.equal(h.stage(),'intro');

// Returning requires upward intent at the top, without interrupting native scrolling.
function openWorkspace(options) {
  const result = setup(options);
  result.dispatch('document','click',{target:result.els['.hero-scroll-cue']});
  result.advance(1800);
  assert.equal(result.stage(),'workspace');
  return result;
}
h=openWorkspace();
h.win.scrollY=300;
assert(!h.dispatch('window','wheel',{deltaY:-120}).defaultPrevented);
assert.equal(h.stage(),'workspace');
h.win.scrollY=0;
assert(!h.dispatch('window','wheel',{deltaY:-100,target:h.element('fox')}).defaultPrevented);
assert(!h.dispatch('window','wheel',{deltaY:-100,ctrlKey:true}).defaultPrevented);
assert(!h.dispatch('window','wheel',{deltaY:-40,deltaX:120}).defaultPrevented);
const sidebar=h.els['.profile-sidebar']; sidebar.scrollTop=30;
assert(!h.dispatch('window','wheel',{deltaY:-100,target:sidebar}).defaultPrevented);
assert.equal(h.stage(),'workspace');
sidebar.scrollTop=0;
h.dispatch('window','wheel',{deltaY:-20}); assert.equal(h.stage(),'workspace');
h.advance(250);
h.dispatch('window','wheel',{deltaY:-20}); assert.equal(h.stage(),'workspace');
h.dispatch('window','wheel',{deltaY:-20}); assert.equal(h.stage(),'intro');
assert.equal(h.win.scrollY,0); assert.equal(h.history.state.portfolioEntered,false);
assert.equal(h.els['.hero'].inert,false); assert.equal(h.els['.portfolio-workspace'].inert,true);
h.dispatch('window','wheel',{deltaY:100}); assert.equal(h.stage(),'intro');
h.advance(500);
assert(h.dispatch('window','wheel',{deltaY:100}).defaultPrevented);
assert.equal(h.stage(),'intro'); // Wait for the reverse spring to finish.
h.advance(1300); h.dispatch('window','wheel',{deltaY:100}); h.advance(1800);
assert.equal(h.stage(),'workspace');
h.dispatch('window','wheel',{deltaY:-3,deltaMode:1}); assert.equal(h.stage(),'intro');
h.advance(30000); assert.equal(h.stage(),'intro');

// Touch movement remains native below the top and can pull back into the intro.
h=openWorkspace(); h.win.scrollY=200;
h.dispatch('window','touchstart',{touches:[{clientX:100,clientY:200}]});
assert(!h.dispatch('window','touchmove',{touches:[{clientX:100,clientY:260}]}).defaultPrevented);
assert.equal(h.stage(),'workspace'); h.win.scrollY=0;
h.dispatch('window','touchmove',{touches:[{clientX:100,clientY:280}]});
assert.equal(h.stage(),'workspace');
h.dispatch('window','touchmove',{touches:[{clientX:100,clientY:310}]});
assert.equal(h.stage(),'intro');
h.dispatch('window','touchmove',{touches:[{clientX:100,clientY:100}]});
assert.equal(h.stage(),'intro'); // The returning touch cannot immediately enter again.
h.dispatch('window','touchend');
h.dispatch('window','touchstart',{target:h.element('fox'),touches:[{clientX:100,clientY:300}]});
assert(!h.dispatch('window','touchmove',{target:h.element('fox'),touches:[{clientX:100,clientY:200}]}).defaultPrevented);
assert.equal(h.stage(),'intro');

for (const details of [{key:'ArrowUp'},{key:'PageUp'},{key:'Home'},{key:' ',shiftKey:true}]) {
  h=openWorkspace({reduced:true}); h.win.scrollY=100;
  assert(!h.dispatch('document','keydown',details).defaultPrevented);
  assert.equal(h.stage(),'workspace'); h.win.scrollY=0;
  assert(h.dispatch('document','keydown',details).defaultPrevented);
  assert.equal(h.stage(),'intro'); assert(h.els['.hero-scroll-cue'].focused);
}
// Mobile keeps its header usable in both stages, without interrupting menu gestures.
h=setup({mobile:true});
assert.equal(h.els['.site-header'].inert,false);
assert.equal(h.mobileLinks[0]['aria-current'],'location');
h.els['.site-header'].classList.add('menu-open');
h.advance(500);
assert(!h.dispatch('window','wheel',{deltaY:100}).defaultPrevented);
assert(!h.dispatch('document','keydown',{key:'PageDown'}).defaultPrevented);
h.dispatch('window','touchstart',{touches:[{clientX:100,clientY:300}]});
assert(!h.dispatch('window','touchmove',{touches:[{clientX:100,clientY:200}]}).defaultPrevented);
assert.equal(h.stage(),'intro');
h.els['.site-header'].classList.toggle('menu-open',false);
h.dispatch('document','click',{target:h.els['.hero-scroll-cue'],detail:0});
assert.equal(h.els['.site-header'].inert,false);
h.advance(1800); assert.equal(h.stage(),'workspace');
assert(h.work.focused); assert(!h.identity.focused);
assert.equal(h.mobileLinks[0]['aria-current'],undefined);
assert.equal(h.mobileLinks[1]['aria-current'],'location');
h.els['.site-header'].classList.add('menu-open');
h.dispatch('window','wheel',{deltaY:-100}); assert.equal(h.stage(),'workspace');
h.els['.site-header'].classList.toggle('menu-open',false);
h.compactHeader.matches=false; h.compactHeader.change(); assert.equal(h.els['.site-header'].inert,true);
h.compactHeader.matches=true; h.compactHeader.change(); assert.equal(h.els['.site-header'].inert,false);
h.dispatch('window','wheel',{deltaY:-100}); assert.equal(h.stage(),'intro');
assert.equal(h.els['.site-header'].inert,false);
h=setup({mobile:true,search:'?view=work'});
assert.equal(h.stage(),'workspace'); assert.equal(h.els['.site-header'].inert,false);
h=setup({tablet:true});
h.dispatch('document','click',{target:h.els['.hero-scroll-cue'],detail:0}); h.advance(1800);
assert.equal(h.stage(),'workspace'); assert.equal(h.els['.site-header'].inert,false);
assert(h.work.focused); assert(!h.identity.focused); // The tablet sidebar is hidden, so focus the project list.
h.compactHeader.matches=false; h.compactHeader.change(); assert.equal(h.els['.site-header'].inert,true);
h.compactHeader.matches=true; h.compactHeader.change(); assert.equal(h.els['.site-header'].inert,false);
console.log('PASS: intro persistence, forward/upward gestures, native scrolling, explicit Back return, focus, mobile header availability, menu gesture isolation, resize and reduced motion.');

// About shares the homepage workspace without rerendering the sidebar or fox.
for (const mobile of [false, true]) {
  h = setup({ mobile, search: '?view=work&v=preview' });
  const workspace = h.els['.portfolio-workspace'];
  h.win.scrollY = 1000;
  h.dispatch('document', 'click', { target: h.viewLinks[1] });
  assert.equal(h.stage(), 'workspace');
  assert.equal(h.body.dataset.workspaceView, 'about');
  h.advance(600);
  assert.equal(h.work.hidden, true); assert.equal(h.about.hidden, false);
  assert.equal(h.win.scrollY, 0); assert(h.about.focused);
  assert.equal(h.viewLinks[1]['aria-current'], 'location');
  assert.equal(h.viewLinks[0]['aria-current'], undefined);
  assert.equal(h.mobileLinks[2]['aria-current'], 'location');
  assert.equal(h.mobileLinks[1]['aria-current'], undefined);
  assert.equal(h.doc.title, 'About — Blair Su');
  assert.equal(h.location.search, '?v=preview&view=about');
  assert.equal(h.els['.portfolio-workspace'], workspace);
  assert.equal(h.els['.site-header'].inert, !mobile);
  h.history.back();
  assert.equal(h.body.dataset.workspaceView, 'work');
  h.advance(600);
  assert.equal(h.work.hidden, false); assert.equal(h.about.hidden, true);
  h.dispatch('document', 'click', { target: h.viewLinks[1] });
  h.dispatch('document', 'click', { target: h.viewLinks[0] });
  assert.equal(h.body.dataset.workspaceView, 'work');
  assert.equal(h.doc.title, 'Blair Su I Product Designer');
  h.history.back();
  assert.equal(h.body.dataset.workspaceView, 'about');
  assert(!h.dispatch('window', 'wheel', { deltaY: -100, target: h.element('dialog') }).defaultPrevented);
  assert(!h.dispatch('document', 'keydown', { key: 'ArrowUp', target: h.element('dialog') }).defaultPrevented);
  assert.equal(h.stage(), 'workspace');
}
h = setup({ search: '?view=about' });
assert.equal(h.stage(), 'workspace'); assert.equal(h.body.dataset.workspaceView, 'about');
assert.equal(h.work.hidden, true); assert.equal(h.about.hidden, false);
assert.equal(h.location.search, '?view=about');
h.dispatch('window', 'pageshow', { persisted: true });
assert.equal(h.body.dataset.workspaceView, 'about');
h = setup();
h.dispatch('document', 'click', { target: h.viewLinks[1], metaKey: true });
assert.equal(h.stage(), 'intro');
h.dispatch('document', 'click', { target: h.viewLinks[1] });
assert.equal(h.stage(), 'entering');
h.advance(1800); assert.equal(h.stage(), 'workspace'); assert(h.about.focused);
h.dispatch('document', 'click', { target: h.identity });
assert.equal(h.stage(), 'intro'); assert.equal(h.body.dataset.workspaceView, 'work');
assert.equal(h.about.hidden, true); assert.equal(h.location.search, '');
console.log('PASS: inline About switching, active links, focus, direct entry, browser history, modal gesture isolation, and return to introduction.');

for (const mobile of [false, true]) {
  h = setup({ mobile, search: '?view=about&v=preview' });
  for (const scrollY of [200, 0]) {
    h.win.scrollY = scrollY;
    for (let index = 0; index < 12; index++) {
      h.advance(100);
      assert(!h.dispatch('window', 'wheel', { deltaY: -100 }).defaultPrevented);
      assert.equal(h.stage(), 'workspace');
      assert.equal(h.body.dataset.workspaceView, 'about');
    }
  }
  assert.equal(h.work.hidden, true); assert.equal(h.about.hidden, false);
  assert.equal(h.viewLinks[1]['aria-current'], 'location');
  assert.equal(h.mobileLinks[2]['aria-current'], 'location');
  assert.equal(h.location.search, '?view=about&v=preview');
  assert.equal(h.history.previous.length, 0);
  for (let gesture = 0; gesture < 2; gesture++) {
    h.dispatch('window', 'touchstart', { touches: [{ clientX: 100, clientY: 200 }] });
    assert(!h.dispatch('window', 'touchmove', { touches: [{ clientX: 100, clientY: 320 }] }).defaultPrevented);
    h.dispatch('window', 'touchend');
    assert.equal(h.body.dataset.workspaceView, 'about');
    assert.equal(h.stage(), 'workspace');
  }
  for (const details of [{ key: 'ArrowUp' }, { key: 'PageUp' }, { key: 'Home' }, { key: ' ', shiftKey: true }]) {
    for (const repeat of [false, true]) {
      assert(!h.dispatch('document', 'keydown', { ...details, repeat }).defaultPrevented);
      assert.equal(h.body.dataset.workspaceView, 'about');
      assert.equal(h.stage(), 'workspace');
    }
  }
  // Explicit menu navigation still switches to projects and preserves their intro gesture.
  h.dispatch('document', 'click', { target: h.viewLinks[0] });
  assert.equal(h.body.dataset.workspaceView, 'work');
  h.advance(600);
  h.dispatch('window', 'wheel', { deltaY: -100 });
  assert.equal(h.stage(), 'intro');
}
console.log('PASS: About stays open during upward wheel, touch and keyboard scrolling; URL, active links and history stay intact; explicit project navigation still works.');

h = setup({ search: '?view=about' });
for (const shiftKey of [false, true]) {
  assert(!h.dispatch('document', 'keydown', { key: ' ', shiftKey, target: h.element('summary') }).defaultPrevented);
  assert.equal(h.body.dataset.workspaceView, 'about');
}
console.log('PASS: native About disclosure keyboard activation is not intercepted by workspace gestures.');

// Switching views hides the reading-position reset inside the fade, on both layouts.
for (const mobile of [false, true]) {
  for (const [start, target, index] of [['work', 'about', 1], ['about', 'work', 0]]) {
    h = setup({ mobile, search: `?view=${start}` });
    h.win.scrollY = 900;
    const outgoing = h[start], incoming = h[target];
    h.dispatch('document', 'click', { target: h.viewLinks[index] });
    assert.equal(h.body.dataset.workspaceView, target);
    assert.equal(h.viewLinks[index]['aria-current'], 'location');
    assert.equal(outgoing.hidden, false); assert.equal(incoming.hidden, true);
    assert(outgoing.inert); assert(outgoing.classList.contains('is-view-leaving'));
    assert.equal(h.win.scrollY, 900, 'Do not visibly jump to the top before fading out');
    h.advance(179);
    assert.equal(outgoing.hidden, false); assert.equal(h.win.scrollY, 900);
    h.advance(1);
    assert.equal(outgoing.hidden, true); assert.equal(incoming.hidden, false);
    assert.equal(h.win.scrollY, 0);
    assert(incoming.inert); assert(incoming.classList.contains('is-view-arriving'));
    assert.equal(h.els['.site-header'].inert, !mobile);
    h.dispatch('window', 'wheel', { deltaY: -100 });
    assert.equal(h.stage(), 'workspace', 'A switching gesture must not dismiss the workspace');
    h.advance(420);
    assert(!incoming.inert); assert(incoming.focused);
    assert(!incoming.classList.contains('is-view-arriving'));
    assert.equal(h.body.dataset.workspaceView, target);
  }

  // Reversing before the swap retains the visible page and its scroll position.
  h = setup({ mobile, search: '?view=work' }); h.win.scrollY = 700;
  h.dispatch('document', 'click', { target: h.viewLinks[1] }); h.advance(90);
  h.dispatch('document', 'click', { target: h.viewLinks[0] }); h.advance(1000);
  assert.equal(h.work.hidden, false); assert.equal(h.about.hidden, true);
  assert.equal(h.win.scrollY, 700); assert(!h.work.inert);
  assert(!h.work.classList.contains('is-view-leaving'));

  // Reversing during entry, then history navigation, leaves only the latest view visible.
  h.dispatch('document', 'click', { target: h.viewLinks[1] }); h.advance(250);
  h.dispatch('document', 'click', { target: h.viewLinks[0] }); h.advance(600);
  assert.equal(h.work.hidden, false); assert.equal(h.about.hidden, true); assert(!h.work.inert);
  h.history.back(); h.advance(600);
  assert.equal(h.about.hidden, false); assert.equal(h.work.hidden, true); assert(!h.about.inert);
}

h = setup({ reduced: true, search: '?view=work' }); h.win.scrollY = 800;
h.dispatch('document', 'click', { target: h.viewLinks[1] });
assert.equal(h.work.hidden, true); assert.equal(h.about.hidden, false);
assert.equal(h.win.scrollY, 0); assert(!h.about.inert); assert(h.about.focused);
assert(!h.about.classList.contains('is-view-arriving'));

h = setup({ search: '?view=work' });
h.dispatch('document', 'click', { target: h.viewLinks[1] });
h.motion.matches = true; h.motion.change(); h.advance(1000);
assert.equal(h.about.hidden, false); assert.equal(h.work.hidden, true); assert(!h.about.inert);

h = setup({ search: '?view=work' });
h.dispatch('document', 'click', { target: h.viewLinks[1] }); h.advance(90);
h.dispatch('document', 'click', { target: h.identity }); h.advance(1800);
assert.equal(h.stage(), 'intro'); assert.equal(h.body.dataset.workspaceView, 'work');
assert.equal(h.about.hidden, true); assert(!h.work.classList.contains('is-view-leaving'));

h = setup({ search: '?view=work' });
h.dispatch('document', 'click', { target: h.viewLinks[1] });
h.dispatch('window', 'pagehide'); h.advance(1000);
assert.equal(h.about.hidden, false); assert(!h.about.inert);
console.log('PASS: desktop/mobile view fades delay scroll reset, keep navigation immediate, handle reversal/history, release focus and inert state, respect reduced motion, and cancel cleanly on intro return or page hide.');

// Sequential stage motion waits for the full slow spring before releasing input.
for (const mobile of [false, true]) {
  h = setup({ mobile });
  h.dispatch('document', 'keydown', { key: 'PageDown' });
  h.advance(1799); assert.equal(h.stage(), 'entering');
  assert(h.els['.portfolio-workspace'].inert);
  h.advance(1); assert.equal(h.stage(), 'workspace');
  h.dispatch('document', 'keydown', { key: 'PageUp' });
  h.advance(400); assert(!h.els['.hero-scroll-cue'].focused);
  h.motion.matches = true; h.motion.change();
  assert(h.els['.hero-scroll-cue'].focused);
}
// A later navigation or active chat must not receive a stale intro focus.
for (const next of ['work', 'chat', 'pagehide']) {
  h = openWorkspace();
  h.dispatch('document', 'keydown', { key: 'PageUp' });
  h.advance(100);
  if (next === 'work') h.dispatch('document', 'click', { target: h.viewLinks[0] });
  if (next === 'chat') h.doc.activeElement = h.element('fox');
  if (next === 'pagehide') h.dispatch('window', 'pagehide');
  h.advance(2000);
  assert(!h.els['.hero-scroll-cue'].focused);
}
console.log('PASS: 1800ms stage timing, deferred reverse focus, reduced-motion completion, and stale focus cancellation.');

// Start all three intro photos before About enters, including direct/history visits.
for (const mobile of [false, true]) {
  h = setup({ mobile, search: '?view=about' });
  assert(h.aboutPhotos.every(image => image.loading === 'eager'));
  h = setup({ mobile, search: '?view=work' });
  assert(h.aboutPhotos.every(image => image.loading === 'lazy'));
  h.dispatch('document', 'click', { target: h.viewLinks[1] });
  assert(h.about.hidden); // Loading begins before the outgoing project fade completes.
  assert(h.aboutPhotos.every(image => image.loading === 'eager'));
  h.advance(600); assert(!h.about.hidden);
  h.dispatch('document', 'click', { target: h.viewLinks[0] }); h.advance(600);
  h.history.back(); h.advance(600); assert(!h.about.hidden);
  assert(h.aboutPhotos.every(image => image.loading === 'eager'));
}
console.log('PASS: About photo loading starts immediately on direct entry and view selection, including mobile and history return.');

// Playground is a third view: preserve direct URLs, history and native scrolling.
for (const mobile of [false, true]) {
  for (const reduced of [false, true]) {
    h = setup({ mobile, reduced, search: '?view=playground' });
    assert.equal(h.stage(), 'workspace');
    assert(!h.playground.hidden); assert(h.work.hidden); assert(h.about.hidden);
    assert.equal(h.doc.title, 'Playground — Blair Su');
    assert.equal(h.mobileLinks[3]['aria-current'], 'location');
    assert.equal(h.viewLinks[2]['aria-current'], 'location');
    assert.equal(h.location.search, '?view=playground');
    assert(!h.dispatch('window', 'wheel', { deltaY: -100 }).defaultPrevented);
    assert(!h.dispatch('document', 'keydown', { key: 'Home' }).defaultPrevented);
    h.dispatch('window', 'pageshow', { persisted: true });
    assert.equal(h.body.dataset.workspaceView, 'playground');
    h.dispatch('document', 'click', { target: h.viewLinks[1] }); h.advance(600);
    assert(h.playground.hidden); assert(!h.about.hidden);
    h.history.back(); h.advance(600);
    assert(!h.playground.hidden); assert(!h.playground.inert); assert(h.about.hidden);
    h.dispatch('document', 'click', { target: h.viewLinks[0] }); h.advance(600);
    assert(!h.work.hidden); assert(h.playground.hidden);
  }
  h = setup({ mobile });
  h.dispatch('document', 'click', { target: h.viewLinks[2] }); h.advance(1800);
  assert.equal(h.body.dataset.workspaceView, 'playground'); assert(h.playground.focused);
  h = setup({ mobile, search: '?view=work' });
  h.dispatch('document', 'click', { target: h.viewLinks[1] }); h.advance(90);
  h.dispatch('document', 'click', { target: h.viewLinks[2] }); h.advance(600);
  assert(!h.playground.hidden); assert(!h.playground.inert);
  assert(h.work.hidden); assert(h.about.hidden);
}
console.log('PASS: Playground direct entry, desktop/mobile navigation, focus, history, reduced motion and rapid three-view switching.');
