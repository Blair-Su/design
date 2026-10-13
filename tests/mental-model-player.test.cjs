const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('mental-model-preview/mental-model.js', 'utf8');

function setup({ rejectPlay = false, fullscreen = true } = {}) {
  class Element {
    constructor() {
      this.listeners = {}; this.attrs = {}; this.hidden = true; this.value = 0;
      const classes = new Set();
      this.classList = { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle: (c, on) => on ? classes.add(c) : classes.delete(c) };
      this.style = { setProperty: (key, value) => { this.style[key] = value; } };
    }
    addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
    async emit(name, event = {}) { for (const fn of this.listeners[name] || []) await fn(event); }
    setAttribute(name, value) { this.attrs[name] = String(value); }
    matches() { return false; }
  }
  const nodes = Object.fromEntries(['video', '.mm-player-controls', '.mm-player-toggle', '.mm-player-mute', '.mm-player-volume', '.mm-player-seek input', '.mm-player-time', '.mm-player-fullscreen', '.mm-player-status'].map(s => [s, new Element()]));
  const player = new Element(), document = new Element(), window = new Element(), video = nodes.video;
  Object.assign(video, { paused: true, ended: false, controls: true, currentTime: 0, duration: NaN, volume: 1, muted: false });
  video.play = async () => {
    if (rejectPlay) throw Object.assign(new Error('blocked'), { name: 'NotAllowedError' });
    video.paused = false; video.ended = false; await video.emit('play');
  };
  video.pause = () => { video.paused = true; video.emit('pause'); };
  player.querySelector = s => nodes[s];
  document.querySelector = s => s === '.mm-player' ? player : null;
  document.fullscreenEnabled = fullscreen;
  if (fullscreen) player.requestFullscreen = async () => { document.fullscreenElement = player; await document.emit('fullscreenchange'); };
  document.exitFullscreen = async () => { document.fullscreenElement = null; await document.emit('fullscreenchange'); };
  window.initCaseNavigation = () => {};
  const timers = new Map(); let id = 0;
  vm.runInNewContext(source, { document, window, setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: key => timers.delete(key) });
  return { nodes, player, document, window, video, async click(selector) { await nodes[selector].emit('click'); }, idle() { for (const fn of timers.values()) fn(); } };
}

test('film remains usable without dialog support; media events drive playback and replay', async () => {
  const h = setup();
  assert.equal(h.video.controls, false);
  assert.equal(h.nodes['.mm-player-controls'].hidden, false);
  assert.equal(h.nodes['.mm-player-seek input'].disabled, true);
  await h.click('.mm-player-toggle');
  assert.equal(h.nodes['.mm-player-toggle'].attrs['aria-label'], 'Pause');
  h.idle(); assert(h.player.classList.contains('controls-hidden'));
  await h.player.emit('focusin'); assert(!h.player.classList.contains('controls-hidden'));
  await h.click('.mm-player-toggle'); assert.equal(h.video.paused, true);
  h.video.ended = true; h.video.currentTime = 14; await h.video.emit('ended');
  assert.equal(h.nodes['.mm-player-toggle'].attrs['aria-label'], 'Replay');
  await h.click('.mm-player-toggle'); assert.equal(h.video.currentTime, 0);
});

test('rejected playback keeps a retry button and an accessible error', async () => {
  const h = setup({ rejectPlay: true });
  await h.click('.mm-player-toggle');
  assert.equal(h.nodes['.mm-player-status'].hidden, false);
  assert.match(h.nodes['.mm-player-status'].textContent, /Unable to play/);
  assert.equal(h.nodes['.mm-player-toggle'].attrs['aria-label'], 'Play');
});

test('metadata enables seeking, scrub survives time updates, cancellation restores controls', async () => {
  const h = setup(), seek = h.nodes['.mm-player-seek input'];
  h.video.duration = 14; await h.video.emit('loadedmetadata');
  assert.equal(seek.disabled, false);
  await seek.emit('pointerdown'); seek.value = 8; await seek.emit('input');
  assert.equal(h.video.currentTime, 8);
  h.video.currentTime = 7.9; await h.video.emit('timeupdate');
  assert.equal(seek.value, 8);
  assert.equal(seek.attrs['aria-valuetext'], '0:08 of 0:14');
  await h.window.emit('pointercancel');
  assert.equal(seek.value, 7.9);
  seek.value = 20; await seek.emit('input'); assert.equal(h.video.currentTime, 14);
});

test('unmuting from zero restores the last audible volume', async () => {
  const h = setup(), volume = h.nodes['.mm-player-volume'];
  volume.value = 0.4; await volume.emit('input');
  volume.value = 0; await volume.emit('input');
  await h.click('.mm-player-mute');
  assert.equal(h.video.volume, 0.4); assert.equal(h.video.muted, false);
  await h.video.emit('volumechange');
  assert.equal(volume.attrs['aria-valuetext'], '40 percent');
});

test('fullscreen state follows the browser and unsupported controls are hidden', async () => {
  const h = setup();
  await h.click('.mm-player-fullscreen');
  assert.equal(h.document.fullscreenElement, h.player);
  assert.equal(h.nodes['.mm-player-fullscreen'].attrs['aria-label'], 'Exit fullscreen');
  await h.click('.mm-player-fullscreen');
  assert.equal(h.nodes['.mm-player-fullscreen'].attrs['aria-label'], 'Enter fullscreen');
  assert.equal(setup({ fullscreen: false }).nodes['.mm-player-fullscreen'].hidden, true);
});


test('a tap reveals hidden controls before pausing the film', async () => {
  const h = setup();
  await h.click('.mm-player-toggle'); h.idle();
  await h.video.emit('pointerdown', { pointerType: 'touch' });
  await h.player.emit('pointerdown');
  await h.video.emit('click');
  assert.equal(h.video.paused, false);
  assert(!h.player.classList.contains('controls-hidden'));
  await h.video.emit('pointerdown', { pointerType: 'touch' });
  await h.video.emit('click');
  assert.equal(h.video.paused, true);
});
