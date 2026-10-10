const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('playground.js', 'utf8');

function setup({ reduced = false } = {}) {
  let doc;
  const element = tag => {
    const listeners = {}, classes = new Set();
    return {
      tag, listeners, children: [], dataset: {}, hidden: false, paused: true,
      play() { this.paused = false; return Promise.resolve(); },
      pause() { this.paused = true; },
      setAttribute(name, value) { this[name] = value; },
      classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      emit(type, props = {}) {
        const event = { target: this, preventDefault() { this.prevented = true; }, ...props };
        for (const fn of listeners[type] || []) fn(event);
        return event;
      },
      append(...nodes) { this.children.push(...nodes); },
      removeChild(node) { this.children = this.children.filter(child => child !== node); },
      replaceChildren(...nodes) { this.children = nodes; },
      hasAttribute(name) { return this[name] !== undefined; },
      focus() { doc.activeElement = this; },
      contentWindow: { messages: [], postMessage(data, origin) { this.messages.push({ data, origin }); } },
    };
  };
  const panel = element('section'), dialog = element('dialog');
  const stage = element('div'), title = element('p'), description = element('p'), close = element('button');
  const heroImage = { src: '/assets/playground/vibe-coding-sky-signature.png', alt: 'Blair Su glass lettering floating in a blue sky', dataset: { playgroundEnlarged: '/assets/playground/blair-su/index.html?mode=detail&v=5' } };
  const skiVideo = Object.assign(element('video'), {
    dataset: { playgroundVideo: '/assets/playground/ski-on-vinyl/loop.mp4' },
    poster: '/assets/playground/ski-on-vinyl/poster.webp',
  });
  const buttons = Array.from({ length: 5 }, (_, i) => {
    const button = element('button'), card = element('figure');
    card.dataset.title = i === 0 ? 'Vibe Coding Sky Signature' : i === 1 ? 'Ski on Vinyl' : `Name 0${i + 1}`;
    card.dataset.description = i === 0 ? 'A dreamy 3D glass text effect floating in the sky.' : i === 1 ? 'One record, one run, one winter on loop.' : '';
    const image = i === 0 ? heroImage : i === 1 ? null : { src: '/placeholder.svg', alt: 'Artwork placeholder', dataset: {} };
    card.querySelector = s => ({
      '[data-playground-preview]': null,
      '[data-playground-enlarged]': i === 0 ? heroImage : null,
      '[data-playground-video]': i === 1 ? skiVideo : null,
      img: image,
    })[s];
    button.closest = () => card;
    return button;
  });
  panel.querySelectorAll = s => ({ '[data-playground-preview]': [], '[data-playground-video]': [skiVideo], '.playground-card-open': buttons })[s];
  dialog.querySelector = s => ({ '.playground-lightbox-stage': stage, '#playground-lightbox-title': title, '.playground-lightbox-description': description, '.playground-lightbox-close': close })[s];
  dialog.open = false;
  dialog.showModal = () => { dialog.open = true; close.focus(); };
  dialog.close = () => { dialog.open = false; dialog.emit('close'); };
  dialog.getBoundingClientRect = () => ({ left: 100, right: 900, top: 100, bottom: 750 });
  doc = Object.assign(element('document'), {
    documentElement: element('html'), body: element('body'),
    querySelector: s => ({ '#playground': panel, '#playground-lightbox': dialog })[s],
    createElement: element,
  });
  const win = element('window');
  const reducedMotion = Object.assign(element('media-query'), { matches: reduced });
  win.matchMedia = () => reducedMotion;
  let mutation, intersection;
  vm.runInNewContext(source, {
    document: doc, window: win, location: { origin: 'http://localhost:4289' },
    IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} },
    MutationObserver: class { constructor(fn) { mutation = fn; } observe() {} },
  });
  const preparedFrame = stage.children.find(child => child.tag === 'iframe');
  return { doc, win, panel, dialog, stage, title, description, close, heroImage, buttons,
    preparedFrame, skiVideo,
    intersect(visible = true) { intersection([{ target: skiVideo, isIntersecting: visible }]); },
    reduceMotion(value) { reducedMotion.matches = value; reducedMotion.emit('change'); },
    ready() {
      win.emit('message', {
        data: { type: 'playground:ready' },
        origin: 'http://localhost:4289',
        source: preparedFrame.contentWindow,
      });
    },
    hidePanel() { panel.hidden = true; mutation(); },
    visible: frame => frame.contentWindow.messages.at(-1)?.data.visible,
  };
}

test('each card opens the correct enlarged artwork and returns focus on close', () => {
  const h = setup();
  h.ready();
  for (const [i, button] of h.buttons.entries()) {
    button.emit('click');
    assert.equal(h.dialog.open, true);
    assert.equal(h.title.textContent, i === 0 ? 'Vibe Coding Sky Signature' : i === 1 ? 'Ski on Vinyl' : `Name 0${i + 1}`);
    assert.equal(h.description.hidden, i > 1);
    assert.equal(h.stage.children.at(-1).tag, i === 0 ? 'iframe' : i === 1 ? 'video' : 'img');
    if (i === 0) {
      assert.equal(h.stage.children.length, 1);
      assert.equal(h.stage.children[0].src, h.heroImage.dataset.playgroundEnlarged);
    }
    assert(h.doc.documentElement.classList.contains('playground-preview-open'));
    assert(h.doc.body.classList.contains('playground-preview-open'));
    h.close.emit('click');
    assert.equal(h.dialog.open, false);
    assert.equal(h.stage.children.length, 1);
    assert.equal(h.doc.activeElement, button);
    assert(!h.doc.documentElement.classList.contains('playground-preview-open'));
    assert(!h.doc.body.classList.contains('playground-preview-open'));
  }
});

test('the enlarged interactive preview pauses when the page is hidden', () => {
  const h = setup();
  h.ready();
  h.buttons[0].emit('click');
  const enlarged = h.stage.children.find(child => child.tag === 'iframe');
  assert.equal(h.visible(enlarged), true);
  h.doc.hidden = true; h.doc.emit('visibilitychange');
  assert.equal(h.visible(enlarged), false);
  h.doc.hidden = false; h.doc.emit('visibilitychange');
  assert.equal(h.visible(enlarged), true);
  h.close.emit('click');
});

test('Escape and backdrop clicks close, but dragging out from the artwork does not', () => {
  const h = setup();
  h.ready();
  h.buttons[0].emit('click');
  h.dialog.emit('pointerdown', { target: h.stage, clientX: 500, clientY: 500 });
  h.dialog.emit('click', { clientX: 20, clientY: 20 });
  assert.equal(h.dialog.open, true);
  h.dialog.emit('pointerdown', { clientX: 20, clientY: 20 });
  h.dialog.emit('click', { clientX: 20, clientY: 20 });
  assert.equal(h.dialog.open, false);
  h.buttons[1].emit('click');
  assert(h.dialog.emit('cancel').prevented);
  assert.equal(h.dialog.open, false);
});

test('iframe Escape is accepted only from the current artwork and our origin', () => {
  const h = setup();
  h.ready();
  h.buttons[0].emit('click');
  const enlarged = h.stage.children.find(child => child.tag === 'iframe');
  const event = { data: { type: 'playground:close' }, origin: 'http://localhost:4289', source: enlarged.contentWindow };
  h.win.emit('message', { ...event, origin: 'https://unrelated.example' });
  assert.equal(h.dialog.open, true);
  h.win.emit('message', { ...event, source: { postMessage() {} } });
  assert.equal(h.dialog.open, true);
  h.win.emit('message', event);
  assert.equal(h.dialog.open, false);
});

test('the modal stays closed until the interactive artwork has rendered its first frame', () => {
  const h = setup();
  h.buttons[0].emit('click');
  assert.equal(h.dialog.open, false);
  assert.equal(h.stage.children.length, 1);
  h.ready();
  assert.equal(h.dialog.open, true);
  assert.equal(h.stage.children.length, 1);
  assert.equal(h.stage.children[0], h.preparedFrame);
  h.close.emit('click');
});

test('reopening the first card reuses the rendered iframe without reloading it', () => {
  const h = setup();
  h.ready();
  h.buttons[0].emit('click');
  const firstFrame = h.stage.children[0];
  h.close.emit('click');
  assert.equal(h.stage.children[0], firstFrame);
  h.buttons[0].emit('click');
  assert.equal(h.dialog.open, true);
  assert.equal(h.stage.children[0], firstFrame);
  assert.equal(h.stage.children.length, 1);
});

test('leaving Playground closes the preview and releases the scroll lock', () => {
  const h = setup();
  h.ready();
  h.buttons[0].emit('click');
  h.hidePanel();
  assert.equal(h.dialog.open, false);
  assert.equal(h.stage.children.length, 1);
  assert(!h.doc.body.classList.contains('playground-preview-open'));
});

test('ski motion lazy-loads on screen and pauses behind its enlarged preview', () => {
  const h = setup();
  assert.equal(h.skiVideo.src, undefined);
  h.intersect();
  assert.equal(h.skiVideo.src, h.skiVideo.dataset.playgroundVideo);
  assert.equal(h.skiVideo.paused, false);
  h.buttons[1].emit('click');
  const enlarged = h.stage.children.at(-1);
  assert.equal(enlarged.tag, 'video');
  assert.equal(enlarged.paused, false);
  assert.equal(enlarged.loop, true);
  assert.equal(enlarged.controls, true);
  assert.equal(h.skiVideo.paused, true);
  assert.equal(h.description.textContent, 'One record, one run, one winter on loop.');
  assert(h.dialog.classList.contains('has-square-preview'));
  h.doc.hidden = true; h.doc.emit('visibilitychange');
  assert.equal(enlarged.paused, true);
  h.doc.hidden = false; h.doc.emit('visibilitychange');
  assert.equal(enlarged.paused, false);
  h.close.emit('click');
  assert.equal(enlarged.paused, true);
  assert.equal(h.skiVideo.paused, false);
  assert(!h.dialog.classList.contains('has-square-preview'));
  h.intersect(false);
  assert.equal(h.skiVideo.paused, true);
  h.intersect(); h.hidePanel();
  assert.equal(h.skiVideo.paused, true);
});

test('reduced motion keeps the ski poster still until playback is requested', () => {
  const h = setup({ reduced: true });
  h.intersect();
  assert.equal(h.skiVideo.src, undefined);
  assert.equal(h.skiVideo.paused, true);
  h.buttons[1].emit('click');
  const enlarged = h.stage.children.at(-1);
  assert.equal(enlarged.paused, true);
  assert.equal(enlarged.controls, true);
  assert.equal(enlarged.poster, h.skiVideo.poster);
  h.reduceMotion(false);
  assert.equal(enlarged.paused, false);
  h.reduceMotion(true);
  assert.equal(enlarged.paused, true);
});
