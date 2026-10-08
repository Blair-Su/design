export const FOX_IDLE_MS = 60_000;
export const FOX_MOTION = {
  grooming: { frameMs: 280, frames: 4, activeMs: 3360, finishMs: 180 },
  walking: { cycleMs: 1100, stridePx: 12, finishMs: 200 },
  playing: { activeMs: 3100, finishMs: 180 },
};

function transitionDuration(from, to) {
  if (to === 'sleeping') return 900;
  if (from === 'sleeping') return 760;
  if (from === 'walking' || to === 'walking') return 560;
  if (from === 'grooming' || to === 'grooming') return 480;
  return 500;
}

// One action timer owns preparation, movement, and settling, so interruptions
// cannot leave an old action queued behind sleep or an open chat.
export function createFoxBehavior({
  onChange, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout,
  getPosition, canPlay = () => true, idleAfter = FOX_IDLE_MS,
  roamDistance = 36, reducedMotion = false, hidden = false,
}) {
  let state = { pose: 'seated', phase: 'rest', fromPose: null, transitionId: 0,
    phaseMs: 0, offset: 0, direction: 'left', travelMs: 0, paused: hidden, reducedMotion };
  let lastActivity = now(), held = false, disposed = false, actionIndex = 0, sleepRequested = false;
  let idleTimer, actionTimer;
  const routine = ['grooming', 'left', 'right', 'playing'];
  const emit = () => onChange({ ...state });
  const clamp = value => Math.max(-roamDistance, Math.min(0, Number(value) || 0));
  function schedule(fn, delay) {
    clearTimer(actionTimer);
    actionTimer = setTimer(() => { actionTimer = undefined; fn(); }, delay);
  }
  function stopAction() {
    clearTimer(actionTimer); actionTimer = undefined;
    if (state.travelMs) state.offset = clamp(getPosition?.() ?? state.offset);
    state.travelMs = 0;
  }
  function mayPlay() {
    return !disposed && !held && !state.paused && !state.reducedMotion && !sleepRequested;
  }
  function rest(delay = 5000) {
    if (!mayPlay() || state.phase !== 'rest') return;
    schedule(startAction, delay);
  }
  function changePose(pose, ready = () => {}) {
    stopAction();
    const from = state.pose;
    const instant = state.paused || state.reducedMotion || (from === pose && state.phase !== 'transition');
    state.pose = pose;
    state.fromPose = instant ? null : from;
    state.phase = instant ? 'rest' : 'transition';
    state.phaseMs = instant ? 0 : transitionDuration(from, pose);
    state.transitionId++;
    emit();
    if (instant) { ready(); return; }
    schedule(() => {
      state.phase = 'rest'; state.phaseMs = 0; state.fromPose = null;
      emit(); ready();
    }, state.phaseMs);
  }
  function finishAction(ready) {
    const finishing = state.phase === 'active' && FOX_MOTION[state.pose];
    stopAction();
    if (!finishing || state.paused || state.reducedMotion) { ready(); return; }
    state.phase = 'finish'; state.phaseMs = FOX_MOTION[state.pose].finishMs;
    emit(); schedule(ready, state.phaseMs);
  }
  function sit(ready = () => rest()) {
    finishAction(() => changePose('seated', ready));
  }
  function startAction() {
    if (!mayPlay()) return;
    const action = routine[actionIndex++ % routine.length];
    const walking = action === 'left' || action === 'right';
    const pose = walking ? 'walking' : action;
    if (!canPlay(pose)) { rest(); return; }
    const target = action === 'left' ? -roamDistance : 0;
    const distance = Math.abs(target - state.offset);
    if (walking && distance < 2) { rest(); return; }
    if (walking) state.direction = target < state.offset ? 'left' : 'right';
    const cycle = FOX_MOTION.walking.cycleMs;
    const duration = walking ? Math.max(1, Math.round(distance / FOX_MOTION.walking.stridePx)) * cycle : FOX_MOTION[pose].activeMs;
    changePose(pose, () => {
      if (!mayPlay()) { sit(); return; }
      state.phase = 'active'; state.phaseMs = duration;
      // Travel begins only after the standing pose has settled.
      if (walking) { state.offset = target; state.travelMs = duration; }
      emit();
      schedule(() => {
        state.travelMs = 0;
        sit();
      }, duration);
    });
  }
  function sleep() {
    sleepRequested = true;
    if (state.pose === 'sleeping') return;
    if (state.pose === 'seated' && state.phase === 'rest') changePose('sleeping');
    else sit(() => {
      if (state.reducedMotion) changePose('sleeping');
      else schedule(() => changePose('sleeping'), 260);
    });
  }
  function checkIdle() {
    idleTimer = undefined;
    if (disposed || state.paused) return;
    const remaining = idleAfter - (now() - lastActivity);
    if (remaining > 0) { idleTimer = setTimer(checkIdle, remaining); return; }
    sleep();
  }
  function watchIdle() {
    if (idleTimer === undefined && !disposed && !state.paused) {
      idleTimer = setTimer(checkIdle, Math.max(0, idleAfter - (now() - lastActivity)));
    }
  }
  function activity() {
    if (disposed) return false;
    lastActivity = now();
    const waking = sleepRequested || state.pose === 'sleeping';
    if (waking) {
      sleepRequested = false;
      sit(() => rest(4500));
    }
    watchIdle();
    return waking;
  }
  function setHeld(value) {
    value = Boolean(value);
    if (disposed || held === value) return;
    held = value;
    const waking = activity();
    if (held && !waking) {
      // Freeze the hit target immediately, but let the visible paw settle.
      if (!(state.pose === 'seated' && state.phase === 'transition')) sit();
    } else if (!held) rest();
  }
  function settleImmediately() {
    stopAction();
    state.pose = sleepRequested ? 'sleeping' : 'seated';
    state.phase = 'rest'; state.phaseMs = 0; state.fromPose = null;
    emit();
  }
  function setHidden(value) {
    value = Boolean(value);
    if (disposed || state.paused === value) return;
    clearTimer(idleTimer); idleTimer = undefined;
    state.paused = value;
    if (!value) sleepRequested = now() - lastActivity >= idleAfter;
    settleImmediately();
    if (!value) { watchIdle(); rest(); }
  }
  function setReducedMotion(value) {
    if (disposed || state.reducedMotion === Boolean(value)) return;
    state.reducedMotion = Boolean(value);
    settleImmediately(); rest();
  }
  function setRoamDistance(value) {
    if (disposed || roamDistance === value) return;
    stopAction(); roamDistance = Math.max(0, value); state.offset = clamp(state.offset);
    settleImmediately(); rest();
  }
  emit(); watchIdle(); rest(3600);
  return {
    activity, setHeld, setHidden, setReducedMotion, setRoamDistance,
    getState: () => ({ ...state }),
    destroy() { disposed = true; clearTimer(actionTimer); clearTimer(idleTimer); },
  };
}
