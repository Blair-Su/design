import test from 'node:test';
import assert from 'node:assert/strict';
import { initScrollReveal } from '../scroll-reveal.js';

function element({ top = 1000, height = 200, parent = null, id = '', left = 0, width = 400 } = {}) {
  const classes = new Set();
  const properties = new Map();
  return {
    id, parentElement: parent, dataset: {}, classes,
    classList: { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)) },
    style: { setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key) },
    properties,
    closest: () => null,
    contains(other) { for (; other; other = other.parentElement) if (other === this) return true; return false; },
    getClientRects: () => width ? [{}] : [],
    getBoundingClientRect: () => ({ top, bottom: top + height, left, width, height }),
  };
}

function setup(targets, { reduced = false, hash = '', fail = false, supported = true } = {}) {
  const events = new Map(), observed = new Set();
  let callback;
  const motion = { matches: reduced, addEventListener: (_, fn) => events.set('motion', fn) };
  const win = {
    innerHeight: 800,
    matchMedia: () => motion,
    location: new URL(`http://localhost/nalu-preview/${hash}`),
    addEventListener: (name, fn) => events.set(name, fn),
    IntersectionObserver: supported ? class {
      constructor(fn, options) { callback = fn; assert.equal(options.threshold, 0); }
      observe(target) { if (fail) throw new Error('Observer unavailable'); observed.add(target); }
      unobserve(target) { observed.delete(target); }
      disconnect() { observed.clear(); }
    } : undefined,
  };
  const doc = {
    querySelectorAll: selector => selector === '[data-anchor]' ? [] : targets,
    getElementById: id => targets.find(target => target.id === id),
    addEventListener: (name, fn) => events.set(name, fn),
  };
  initScrollReveal({ win, doc });
  return {
    events, motion, observed,
    enter(items) { callback(items.map(target => ({ target, isIntersecting: true, boundingClientRect: { top: 650, bottom: 650 + target.getBoundingClientRect().height, left: 0 } }))); },
  };
}

test('first screen and inactive responsive layouts remain visible; tall media reveal on entry', () => {
  const hero = element({ top: 100 });
  const hiddenLayout = element({ width: 0 });
  const image = element({ height: 2000 });
  const { enter, observed, events } = setup([hero, hiddenLayout, image]);
  assert.equal(hero.classes.size, 0);
  assert.equal(hiddenLayout.classes.size, 0);
  assert.deepEqual([...observed], [image]);
  enter([image]);
  assert.equal(image.classes.has('scroll-reveal-pending'), false);
  assert.equal(image.classes.has('scroll-reveal-enter'), true);
  assert.equal(observed.size, 0);
  events.get('animationend')({ target: image, animationName: 'portfolio-reveal' });
  assert.equal(image.classes.size, 0);
});

test('cards animate once without nested child fades or unbounded stagger', () => {
  const card = element();
  const child = element({ parent: card });
  const peers = Array.from({ length: 5 }, () => element());
  const { enter, observed } = setup([card, child, ...peers]);
  assert.equal(observed.has(child), false);
  enter([card, ...peers]);
  assert.deepEqual([card, ...peers].map(el => el.properties.get('--reveal-delay')), ['0ms', '70ms', '140ms', '140ms', '140ms', '140ms']);
  assert.equal(observed.size, 0);
});

test('direct anchors, keyboard focus, and same-page navigation reveal content immediately', () => {
  const chapter = element({ id: 'design' });
  const text = element({ parent: chapter });
  const card = element();
  const { events } = setup([chapter, text, card], { hash: '#design' });
  assert.equal(chapter.classes.size, 0);
  events.get('focusin')({ target: card });
  assert.equal(card.classes.size, 0);

  const destination = element({ id: 'results' });
  const result = setup([destination]);
  result.events.get('click')({ button: 0, target: { closest: () => ({ href: 'http://localhost/nalu-preview/#results' }) } });
  assert.equal(destination.classes.size, 0);
});

test('reduced motion, printing and restored history never leave content hidden', () => {
  const skipped = element();
  setup([skipped], { reduced: true });
  assert.equal(skipped.classes.size, 0);
  for (const event of ['motion', 'beforeprint', 'pageshow']) {
    const image = element();
    const { events, motion, observed } = setup([image]);
    motion.matches = true;
    events.get(event)({ persisted: true });
    assert.equal(image.classes.size, 0);
    assert.equal(observed.size, 0);
  }
});

test('unsupported or failed observers leave the page readable', () => {
  for (const options of [{ supported: false }, { fail: true }]) {
    const image = element();
    setup([image], options);
    assert.equal(image.classes.size, 0);
  }
});
