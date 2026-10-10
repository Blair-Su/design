const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('lighthouse-motion.js', 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

function setup({ reduced = false, blocked = false } = {}) {
  function element() {
    const events = {};
    return { dataset: {},
      addEventListener(type, fn) { (events[type] ||= []).push(fn); },
      emit(type) { for (const fn of events[type] || []) fn(); },
      setAttribute(name, value) { this[name] = value; },
      hasAttribute(name) { return this[name] !== undefined; },
    };
  }
  const screens = Array.from({ length: 4 }, (_, i) => ({
    dataset: { phoneMotion: `/demo-${i}.mp4`, phonePoster: `/poster-${i}.webp` },
    querySelector: () => ({ width: 590, height: 1278, alt: `Demo ${i}` }),
    replaceChildren(video, button) { this.video = video; this.button = button; },
  }));
  const doc = Object.assign(element(), { hidden: false,
    querySelectorAll: () => screens,
    createElement(tag) {
      const node = element();
      if (tag === 'video') Object.assign(node, { paused: true, ended: false, currentTime: 0, blocked,
        play() {
          if (this.blocked) return Promise.reject(new Error('Autoplay blocked'));
          this.paused = false; this.emit('play'); return Promise.resolve();
        },
        pause() { this.paused = true; this.emit('pause'); },
      });
      return node;
    },
  });
  const motion = Object.assign(element(), { matches: reduced });
  let intersect;
  class IntersectionObserver {
    constructor(callback) { intersect = callback; }
    observe() {}
  }
  const win = Object.assign(element(), { matchMedia: () => motion, IntersectionObserver });
  vm.runInNewContext(source, { document: doc, window: win, IntersectionObserver });
  return { screens, doc, win, motion,
    visible(index, visible = true) {
      intersect([{ target: screens[index], isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]);
    },
  };
}

test('each phone pauses independently and resumes at the same point with correct button labels', async () => {
  const h = setup();
  assert(h.screens.every(({ video }) => !video.hasAttribute('src')));
  h.visible(0); h.visible(1); await settle();
  const { video, button } = h.screens[0];
  assert.equal(button.dataset.state, 'playing');
  assert.equal(button['aria-label'], 'Pause animation: Demo 0');
  assert.equal(video.controls, undefined);
  assert.equal(video.muted, true); assert.equal(video.playsInline, true);
  video.currentTime = 2.75;
  button.emit('click');
  assert.equal(video.paused, true);
  assert.equal(h.screens[1].video.paused, false);
  assert.equal(button['aria-label'], 'Play animation: Demo 0');
  h.visible(0, false); h.visible(0); await settle();
  assert.equal(video.paused, true, 'manual pause survives scrolling away and back');
  button.emit('click'); await settle();
  assert.equal(video.paused, false);
  assert.equal(video.currentTime, 2.75);
  assert.equal(button.dataset.state, 'playing');
});

test('offscreen and hidden-page pauses preserve playback intent', async () => {
  const h = setup(); h.visible(0); h.visible(1); await settle();
  h.screens[1].button.emit('click');
  h.visible(0, false); assert.equal(h.screens[0].video.paused, true);
  h.visible(0); await settle(); assert.equal(h.screens[0].video.paused, false);
  h.doc.hidden = true; h.doc.emit('visibilitychange');
  assert(h.screens.every(({ video }) => video.paused));
  h.doc.hidden = false; h.doc.emit('visibilitychange'); await settle();
  assert.equal(h.screens[0].video.paused, false);
  assert.equal(h.screens[1].video.paused, true);
  h.win.emit('pagehide'); assert.equal(h.screens[0].video.paused, true);
  h.win.emit('pageshow'); await settle(); assert.equal(h.screens[0].video.paused, false);
});

test('reduced motion starts still and allows explicit playback', async () => {
  const h = setup({ reduced: true }); h.visible(0); await settle();
  const { video, button } = h.screens[0];
  assert.equal(video.paused, true); assert.equal(button.dataset.state, 'paused');
  button.emit('click'); await settle(); assert.equal(video.paused, false);
  h.motion.emit('change'); assert.equal(video.paused, true);
});

test('blocked autoplay leaves a working play button and pending playback respects an offscreen pause', async () => {
  const h = setup({ blocked: true }); h.visible(0); await settle();
  const { video, button } = h.screens[0];
  assert.equal(video.paused, true); assert.equal(button.dataset.state, 'paused');
  video.blocked = false; button.emit('click');
  h.visible(0, false); await settle();
  assert.equal(video.paused, true); assert.equal(button.dataset.state, 'paused');
  h.visible(0); await settle(); assert.equal(video.paused, false);
});
