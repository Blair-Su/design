const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const shared = fs.readFileSync('script.js', 'utf8');
const source = shared.slice(shared.indexOf("const header ="), shared.indexOf('const naluCover ='));

function setup({ home = true, casePage = false, mobile = true, hasHeader = true } = {}) {
  const documentEvents = {}, windowEvents = {};
  const el = (name, attrs = {}) => {
    const classes = new Set();
    const listeners = {};
    return {
      name, attrs, listeners, inert: false, visible: true,
      classList: {
        contains: c => classes.has(c),
        toggle: (c, yes) => yes ? classes.add(c) : classes.delete(c),
      },
      setAttribute(k, v) { this.attrs[k] = v; },
      getAttribute(k) { return this.attrs[k] ?? null; },
      addEventListener(type, fn) { listeners[type] = fn; },
      closest(selector) { return selector === 'a' && this.link ? this : null; },
      getClientRects() { return this.visible ? [{}] : []; },
      focus() { doc.activeElement = this; },
    };
  };
  const body = el('body'); body.classList.toggle('home-page', home);
  const root = el('html');
  const header = el('header');
  header.classList.toggle('case-mobile-header', casePage);
  const toggle = el('toggle', { 'aria-expanded': 'false' });
  const nav = el('navigation');
  const main = el('main');
  const fox = el('fox');
  const footer = el('footer');
  const back = el('back');
  const brand = el('brand', { href: '#top' }); brand.link = true;
  const links = ['#top', '#work', '/?view=about', '/?view=playground'].map(href => {
    const link = el('link', { href }); link.link = true; return link;
  });
  const pending = el('pending', { 'aria-disabled': 'true' }); pending.link = true;
  const social = el('desktop-social', { href: 'https://example.com' }); social.link = true; social.visible = !mobile;
  header.querySelectorAll = () => [brand, toggle, ...links, social];
  header.contains = target => [header, brand, toggle, nav, ...links, pending, social].includes(target);
  const elements = { '.site-header': hasHeader ? header : null, '.menu-toggle': hasHeader ? toggle : null,
    '#primary-navigation': hasHeader ? nav : null, main, '.fox-companion': fox, '.site-footer': footer, '.case-mobile-back-row': back };
  const doc = { body, documentElement: root, activeElement: body,
    querySelector: selector => elements[selector],
    addEventListener: (type, fn) => { documentEvents[type] = fn; },
  };
  const phone = { matches: mobile, addEventListener(type, fn) { this[type] = fn; } };
  const win = { addEventListener: (type, fn) => { windowEvents[type] = fn; } };
  const event = (target, extras = {}) => ({ target, button: 0,
    preventDefault() { this.defaultPrevented = true; }, ...extras });
  const clickToggle = () => { toggle.focus(); toggle.listeners.click(event(toggle)); };
  const clickLink = (link, extras) => { const e = event(link, extras); header.listeners.click(e); return e; };
  const key = (key, extras) => { const e = event(doc.activeElement, { key, ...extras }); documentEvents.keydown(e); return e; };
  vm.runInNewContext(source, { document: doc, window: win, matchMedia: query => {
    assert.equal(query, '(max-width: 1023px)');
    return phone;
  } });
  return { body, root, header, toggle, main, fox, footer, back, brand, links, pending, doc, phone, windowEvents, clickToggle, clickLink, key };
}

let h = setup();
h.clickToggle();
assert.equal(h.toggle.getAttribute('aria-expanded'), 'true');
assert.equal(h.toggle.getAttribute('aria-label'), 'Close menu');
assert(h.header.classList.contains('menu-open'));
assert(h.root.classList.contains('mobile-menu-open'));
assert(h.body.classList.contains('mobile-menu-open'));
assert(h.main.inert); assert(h.fox.inert);
h.links.at(-1).focus();
assert(h.key('Tab').defaultPrevented); assert.equal(h.doc.activeElement,h.brand);
assert(h.key('Tab',{shiftKey:true}).defaultPrevented); assert.equal(h.doc.activeElement,h.links.at(-1));
assert(h.clickLink(h.pending).defaultPrevented);
assert.equal(h.toggle.getAttribute('aria-expanded'),'true');
h.clickLink(h.links[2], {metaKey:true});
assert.equal(h.toggle.getAttribute('aria-expanded'),'true');
assert(h.key('Escape').defaultPrevented);
assert.equal(h.toggle.getAttribute('aria-expanded'),'false');
assert.equal(h.doc.activeElement,h.toggle);
assert(!h.main.inert); assert(!h.fox.inert);
assert(!h.root.classList.contains('mobile-menu-open'));
assert(!h.body.classList.contains('mobile-menu-open'));

for (const link of [h.brand, ...h.links]) {
  h.clickToggle(); h.clickLink(link);
  assert.equal(h.toggle.getAttribute('aria-expanded'),'false');
  assert(!h.main.inert); assert(!h.fox.inert);
}
h.clickToggle(); h.clickToggle(); assert(!h.main.inert);
h.clickToggle(); h.phone.matches=false; h.phone.change();
assert.equal(h.toggle.getAttribute('aria-expanded'),'false'); assert(!h.main.inert);
assert(!h.root.classList.contains('mobile-menu-open'));
h.phone.matches=true; h.clickToggle(); h.windowEvents.pagehide(); assert(!h.main.inert);
h=setup({mobile:false}); h.clickToggle(); assert.equal(h.toggle.getAttribute('aria-expanded'),'false');
h=setup({home:false}); h.clickToggle();
assert.equal(h.toggle.getAttribute('aria-expanded'),'true');
assert(!h.main.inert); assert(!h.root.classList.contains('mobile-menu-open'));
setup({hasHeader:false});
h=setup({home:false,casePage:true}); h.clickToggle();
assert(h.root.classList.contains('mobile-menu-open'));
assert(h.main.inert); assert(h.fox.inert); assert(h.footer.inert); assert(h.back.inert);
h.links.at(-1).focus(); assert(h.key('Tab').defaultPrevented); assert.equal(h.doc.activeElement,h.brand);
h.key('Escape'); assert(!h.main.inert); assert(!h.footer.inert); assert(!h.back.inert);
h.clickToggle(); h.phone.matches=false; h.phone.change(); assert(!h.root.classList.contains('mobile-menu-open'));
assert(!h.fox.inert); assert(!h.main.inert);

// Measure the real bottom bar as its title, safe area or breakpoint changes.
let barHeight=80, observerCallback;
const properties={}, events={};
const compact={matches:true,addEventListener(type,fn){this[type]=fn;}};
vm.runInNewContext(fs.readFileSync('mobile-case.js','utf8'),{
  document:{querySelector:()=>({getBoundingClientRect:()=>({height:barHeight})}),body:{style:{setProperty:(key,value)=>{properties[key]=value;}}}},
  window:{addEventListener:(type,fn)=>{events[type]=fn;}},
  matchMedia:()=>compact,
  ResizeObserver:class{constructor(callback){observerCallback=callback;}observe(){}},
});
assert.equal(properties['--case-bar-height'],'80px');
barHeight=114; observerCallback(); assert.equal(properties['--case-bar-height'],'114px');
compact.matches=false; compact.change(); assert.equal(properties['--case-bar-height'],'0px');
compact.matches=true; barHeight=56; events.resize(); assert.equal(properties['--case-bar-height'],'56px');
console.log('PASS: home/project menu locking, focus, Playground link closure, disabled-link handling, resize cleanup, and fox clearance.');
