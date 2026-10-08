const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('home-about.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const copy = [...html.matchAll(/<div class="about-resume-description"><p>(.*?)<\/p><\/div>/g)].map(m => m[1]);
assert.equal(copy.length, 6);

function setup({ reduced = false, animated = true } = {}) {
  const animations = [], events = {};
  class Element {
    constructor(tag) {
      this.tag = tag; this.children = []; this.attrs = {}; this.dataset = {}; this.listeners = {};
      this.style = { setProperty(key, value) { this[key] = value; } };
      const classes = new Set();
      this.classList = { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) };
      this.className = ''; this.open = false;
    }
    append(...nodes) { for (const node of nodes) { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1); node.parent = this; this.children.push(node); } }
    before(node) { node.parent = this.parent; this.parent.children.splice(this.parent.children.indexOf(this), 0, node); }
    replaceChildren(...nodes) { this.children = []; this._text = ''; this.append(...nodes); }
    get textContent() { return (this._text || '') + this.children.map(n => n.textContent).join(''); }
    set textContent(value) { this._text = value; this.children = []; }
    setAttribute(k, v) { this.attrs[k] = v; }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    querySelectorAll(selector) {
      const found = [];
      for (const child of this.children) {
        if (child.tag === selector || child.className === selector.slice(1)) found.push(child);
        found.push(...child.querySelectorAll(selector));
      }
      return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0]; }
    getBoundingClientRect() { return { height: this.currentHeight ?? 100 }; }
    animate(frames, options) {
      const animation = { frames, options, cancel() { this.cancelled = true; }, finish() { this.onfinish?.(); } };
      animations.push(animation); return animation;
    }
  }
  if (!animated) Element.prototype.animate = undefined;
  const rows = copy.map(text => {
    const row = new Element('details'), summary = new Element('summary'), description = new Element('div'), paragraph = new Element('p');
    description.className = 'about-resume-description'; paragraph.textContent = text;
    description.append(paragraph); row.append(summary, description); return row;
  });
  const motion = { matches: reduced, addEventListener(name, fn) { this[name] = fn; } };
  const document = { querySelectorAll: () => rows, createElement: tag => new Element(tag), createTextNode: text => { const n = new Element('#text'); n.textContent = text; return n; } };
  const window = { matchMedia: () => motion, addEventListener(name, fn) { events[name] = fn; } };
  vm.runInNewContext(source, { document, window, Intl, getComputedStyle: () => ({ opacity: '1' }) });
  function click(index) {
    const event = { preventDefault() { this.defaultPrevented = true; } };
    rows[index].querySelector('summary').listeners.click(event);
    assert(event.defaultPrevented);
  }
  return { rows, animations, motion, events, click };
}

let h = setup();
for (let index = 0; index < h.rows.length; index++) {
  const row = h.rows[index], summary = row.querySelector('summary'), panel = row.querySelector('.about-resume-panel');
  assert.equal(row.open, false); assert.equal(summary.attrs['aria-expanded'], 'false'); assert(panel.inert);
  assert.equal(summary.attrs['aria-controls'], panel.id);
  h.click(index);
  assert(row.open); assert.equal(row.dataset.expanded, 'true'); assert(!panel.inert);
  const description = row.querySelector('.about-resume-description');
  assert(description.classList.contains('is-revealing'));
  const [accessible, visual] = description.querySelector('p').children;
  assert.equal(accessible.textContent, copy[index]); assert.equal(visual.textContent, copy[index]);
  assert.equal(visual.attrs['aria-hidden'], 'true');
  const letters = visual.querySelectorAll('.about-reveal-letter');
  assert.equal(letters[0].style['--reveal-delay'], '0ms');
  assert.equal(letters[1].style['--reveal-delay'], '15ms');
  const first = h.animations.at(-1);
  assert.equal(first.frames[0].height, '0px'); assert.equal(first.options.duration, 260);
  first.finish(); assert(row.open); assert(!panel.classList.contains('is-resume-animating'));
  h.click(index);
  assert(row.open); assert.equal(summary.attrs['aria-expanded'], 'false'); assert(panel.inert);
  const close = h.animations.at(-1); assert.equal(close.options.duration, 200); close.finish();
  assert.equal(row.open, false); assert(!description.classList.contains('is-revealing'));
  h.click(index); assert.equal(description.querySelector('p').children.length, 2);
  assert(description.classList.contains('is-revealing')); h.animations.at(-1).finish();
}
// Rapid clicks reverse the live height; callbacks from cancelled motion do nothing.
h = setup(); h.click(0);
const panel = h.rows[0].querySelector('.about-resume-panel');
const opening = h.animations.at(-1); panel.currentHeight = 45;
h.click(0); const closing = h.animations.at(-1);
assert(opening.cancelled); assert.equal(closing.frames[0].height, '45px');
opening.finish(); assert(h.rows[0].open); assert.equal(h.rows[0].dataset.expanded, 'false');
panel.currentHeight = 20; h.click(0); assert(closing.cancelled);
closing.finish(); assert.equal(h.rows[0].dataset.expanded, 'true');
h.animations.at(-1).finish(); assert(h.rows[0].open); assert(!panel.inert);
// Preferences and interrupted layouts settle to the requested state.
for (const action of ['change', 'resize', 'pagehide']) {
  h = setup(); h.click(0); h.click(0);
  if (action === 'change') { h.motion.matches = true; h.motion.change(); }
  else h.events[action]();
  assert(!h.rows[0].open); assert(h.rows[0].querySelector('.about-resume-panel').inert);
}
h = setup({ reduced: true }); h.click(0);
assert.equal(h.animations.length, 0); assert(h.rows[0].open);
assert(!h.rows[0].querySelector('.about-resume-description').classList.contains('is-revealing'));
h.click(0); assert(!h.rows[0].open);
h = setup({ animated: false }); h.click(0); assert(h.rows[0].open); h.click(0); assert(!h.rows[0].open);
console.log('PASS: all six descriptions preserve copy and accessible text, repeat 15ms character reveals, animate open/close, reverse rapid clicks, and settle safely for reduced motion, resize, pagehide or unsupported height animation.');
