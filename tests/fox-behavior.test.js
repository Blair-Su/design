import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoxBehavior, FOX_IDLE_MS } from '../assets/chat/fox-behavior.js';

function setup(options = {}) {
  let time = 0, nextId = 0;
  const timers = new Map(), changes = [];
  const fox = createFoxBehavior({
    now: () => time,
    setTimer(fn, delay) { const id = ++nextId; timers.set(id, { at: time + delay, fn }); return id; },
    clearTimer: id => timers.delete(id),
    onChange: state => changes.push(state),
    ...options,
  });
  function advance(ms) {
    const end = time + ms;
    while (timers.size) {
      const [id, task] = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (task.at > end) break;
      time = task.at; timers.delete(id); task.fn();
    }
    time = end;
  }
  function until(pose, phase = 'active') {
    for (let i = 0; i < 6000; i++) {
      if (fox.getState().pose === pose && fox.getState().phase === phase) return;
      advance(10);
    }
    assert.fail(`Did not reach ${pose}/${phase}`);
  }
  return { fox, advance, until, changes, timers };
}

test('each action prepares, completes, and settles before the next action', () => {
  const { advance, changes } = setup();
  advance(38_000);
  assert.deepEqual(changes.filter(s => s.phase === 'active').map(s => s.pose), ['grooming', 'walking', 'walking', 'playing']);
  const walking = changes.filter(s => s.pose === 'walking' && s.phase === 'active');
  assert.deepEqual(walking.map(({ direction, offset }) => [direction, offset]), [['left', -36], ['right', 0]]);
  for (const pose of ['grooming', 'walking', 'playing']) {
    const index = changes.findIndex(s => s.pose === pose && s.phase === 'active');
    assert.equal(changes[index - 2].phase, 'transition');
    assert.equal(changes[index + 1].phase, 'finish');
    assert.equal(changes[index + 2].pose, 'seated');
    assert.equal(changes[index + 2].phase, 'transition');
  }
});

test('walking waits for preparation and ends on a complete gait cycle', () => {
  const { fox, advance, until } = setup();
  until('walking', 'transition');
  assert.equal(fox.getState().offset, 0);
  assert.equal(fox.getState().travelMs, 0);
  advance(560);
  assert.equal(fox.getState().phase, 'active');
  assert.equal(fox.getState().offset, -36);
  const duration = fox.getState().travelMs;
  assert.equal(duration % 1100, 0);
  advance(duration);
  assert.equal(fox.getState().phase, 'finish');
  assert.equal(fox.getState().travelMs, 0);
  advance(200);
  assert.equal(fox.getState().pose, 'seated');
  assert.equal(fox.getState().phase, 'transition');
});

test('inactivity settles into persistent sleep; waking has its own transition', () => {
  const { fox, advance, until } = setup();
  advance(FOX_IDLE_MS - 1);
  assert.notEqual(fox.getState().pose, 'sleeping');
  advance(2001);
  assert.equal(fox.getState().pose, 'sleeping');
  until('sleeping', 'rest');
  advance(120_000);
  assert.equal(fox.getState().pose, 'sleeping');
  fox.activity();
  assert.equal(fox.getState().pose, 'seated');
  assert.equal(fox.getState().fromPose, 'sleeping');
  assert.equal(fox.getState().phase, 'transition');
  advance(760);
  assert.equal(fox.getState().phase, 'rest');
  advance(4499);
  assert.equal(fox.getState().pose, 'seated');
});

test('continuous visitor activity postpones sleep without accumulating timers', () => {
  const { fox, advance, timers } = setup();
  for (let i = 0; i < 1000; i++) { advance(100); fox.activity(); assert.ok(timers.size <= 2); }
  assert.notEqual(fox.getState().pose, 'sleeping');
  advance(59_999);
  assert.notEqual(fox.getState().pose, 'sleeping');
  advance(2001);
  assert.equal(fox.getState().pose, 'sleeping');
});

test('approaching stops movement immediately and allows paws to settle before sitting', () => {
  const { fox, advance, until } = setup({ getPosition: () => -11.5 });
  until('walking'); advance(300);
  fox.setHeld(true);
  assert.equal(fox.getState().phase, 'finish');
  assert.equal(fox.getState().travelMs, 0);
  assert.equal(fox.getState().offset, -11.5);
  advance(760);
  assert.equal(fox.getState().pose, 'seated');
  assert.equal(fox.getState().phase, 'rest');
  advance(20_000);
  assert.equal(fox.getState().pose, 'seated');
  assert.equal(fox.getState().offset, -11.5);
  fox.setHeld(false);
  advance(5560);
  assert.equal(fox.getState().direction, 'right');
  assert.equal(fox.getState().phase, 'active');
});

test('release during settling does not replace a transition with a new action timer', () => {
  const { fox, advance, until } = setup();
  until('grooming');
  fox.setHeld(true); advance(100); fox.setHeld(false);
  advance(560);
  assert.equal(fox.getState().pose, 'seated');
  assert.equal(fox.getState().phase, 'rest');
  advance(4999);
  assert.equal(fox.getState().pose, 'seated');
  advance(1);
  assert.equal(fox.getState().pose, 'walking');
});

test('interaction reverses a half-finished sleep and cancels pending sleep callbacks', () => {
  const { fox, advance } = setup({ canPlay: () => false });
  advance(FOX_IDLE_MS + 450);
  assert.equal(fox.getState().pose, 'sleeping');
  assert.equal(fox.getState().phase, 'transition');
  fox.activity();
  assert.equal(fox.getState().pose, 'seated');
  advance(1000);
  assert.equal(fox.getState().phase, 'rest');
  assert.equal(fox.getState().pose, 'seated');
  advance(3000);
  assert.equal(fox.getState().pose, 'seated');
});

test('opening chat during preparation cancels the pending walk without moving', () => {
  const { fox, advance, until } = setup();
  until('walking', 'transition'); advance(150);
  fox.setHeld(true); advance(10_000);
  assert.equal(fox.getState().offset, 0);
  assert.equal(fox.getState().pose, 'seated');
  assert.equal(fox.getState().phase, 'rest');
});

test('background tabs stop timers and reconcile inactivity on return', () => {
  const { fox, advance, timers } = setup();
  advance(4000); fox.setHidden(true);
  assert.equal(timers.size, 0);
  advance(120_000);
  fox.setHidden(false);
  assert.equal(fox.getState().pose, 'sleeping');
  fox.activity(); advance(760);
  assert.equal(fox.getState().pose, 'seated');
});

test('reduced motion keeps the fox still and skips transitions on sleep and wake', () => {
  const { fox, advance, changes } = setup({ reducedMotion: true });
  advance(59_999);
  assert.ok(changes.every(state => state.pose === 'seated' && state.offset === 0));
  advance(1);
  assert.equal(fox.getState().pose, 'sleeping');
  assert.equal(fox.getState().phase, 'rest');
  fox.activity();
  assert.equal(fox.getState().pose, 'seated');
  assert.equal(fox.getState().phase, 'rest');
  fox.setReducedMotion(false); advance(5480);
  assert.equal(fox.getState().pose, 'grooming');
  assert.equal(fox.getState().phase, 'active');
  fox.setReducedMotion(true); advance(10_000);
  assert.equal(fox.getState().pose, 'seated');
});

test('missing sprite sheets fall back to sitting and cleanup cancels all future work', () => {
  const { fox, advance, timers, changes } = setup({ canPlay: () => false });
  advance(30_000);
  assert.ok(changes.every(state => state.pose === 'seated'));
  fox.destroy();
  const count = changes.length;
  assert.equal(timers.size, 0);
  advance(120_000); fox.activity();
  assert.equal(changes.length, count);
});
