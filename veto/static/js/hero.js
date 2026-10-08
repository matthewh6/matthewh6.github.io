// First screen: decision moments drawn over the hero video (spec 4.1).
import { coverTransform, screenFan, sheafPath, markPoint } from './lib/geometry.js';
import { rankStep, phaseAt, rateAt, dueStep, wrapPrev, reached, drawnAt, MOMENT_MS } from './lib/steps.js';

const NS = 'http://www.w3.org/2000/svg';
const HOLD_MS = 1400; // keep the executed chunk on screen after a moment

function svgEl(name, attrs, parent) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent.appendChild(e);
  return e;
}
/** Size of the veto marks and the origin dot for a cover scale: full size from 0.75 up, never under 0.55. */
export const markScale = (scale) => Math.min(1, Math.max(0.55, scale / 0.75));
/** Radius of a veto mark at mark size k; it sits 2k past its line's end. */
const markR = (k) => 5.7 * k;
/** Room each fan end needs inside the video for its veto mark, at mark size k. */
export const markInset = (k) => { const m = 2 * markR(k) + 4 * k; return [m, m, m, m]; };
/** The veto sign as the logo draws it: a ring crossed by a "/" bar that reaches a little past it. */
function vetoMark(parent, [x, y], k) {
  const g = svgEl('g', { class: 'veto-mark', transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` }, parent);
  const r = markR(k);
  const b = (r * 1.2) / Math.SQRT2;
  svgEl('circle', { r: r.toFixed(2) }, g);
  svgEl('path', { d: `M${(-b).toFixed(2)} ${b.toFixed(2)}L${b.toFixed(2)} ${(-b).toFixed(2)}` }, g);
  return g;
}

/**
 * Draw one step into `layer` (spec 12, landing N): a plain ink line per candidate chunk, white-haloed so it reads on
 * the dark backdrop and on the light table, leaving the gripper along the executed heading; a dot that runs along
 * each while the world model imagines it; a red slashed circle, the logo's shape, on each vetoed end; a small tip on
 * each kept end. `step.origin` and `ends` are in screen px. Returns handles for paintStep.
 */
export function buildStep(layer, step, ends, k = 1) {
  const r = rankStep(step);
  const o = step.origin;
  const c = ends[r.chosen];
  const len = Math.hypot(c[0] - o[0], c[1] - o[1]) || 1;
  const heading = [(c[0] - o[0]) / len, (c[1] - o[1]) / len];
  const g = svgEl('g', { class: 'step' }, layer);
  const halos = ends.map((end) => svgEl('path', { class: 'halo', d: sheafPath(o, end, heading), pathLength: 1 }, g));
  const arcs = ends.map((end) => svgEl('path', { class: 'arc', d: sheafPath(o, end, heading), pathLength: 1 }, g));
  const pulses = ends.map((end) => svgEl('path', { class: 'pulse', d: sheafPath(o, end, heading), pathLength: 1 }, g));
  const tips = ends.map((end, i) => (r.kept.includes(i) ? svgEl('circle', { class: 'tip', cx: end[0].toFixed(1), cy: end[1].toFixed(1), r: (2.3 * k).toFixed(2) }, g) : null));
  // the outermost vetoed candidates are stamped first, the ones beside the kept last
  const vetoed = ends.map((_, i) => i).filter((i) => !r.kept.includes(i));
  const off = (i) => Math.abs(Math.atan2(ends[i][1] - o[1], ends[i][0] - o[0]) - Math.atan2(heading[1], heading[0]));
  const order = [...vetoed].sort((a, b) => off(b) - off(a));
  const marks = ends.map((end, i) => (r.kept.includes(i) ? null : vetoMark(g, markPoint(o, end, heading, markR(k) + 2 * k), k)));
  svgEl('circle', { class: 'origin', cx: o[0], cy: o[1], r: 3.5 * k }, g);
  return { group: g, arcs, halos, pulses, tips, marks, stampAt: (i) => 0.04 + (order.indexOf(i) / Math.max(1, order.length - 1)) * 0.3, r };
}

const o3 = (v) => String(Math.round(v * 1000) / 1000);
/** A mark popping in: 0 before it starts, a slight overshoot, 1 at rest. */
const pop = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.9 * Math.pow(t - 1, 3) + 1.9 * Math.pow(t - 1, 2));

/**
 * Apply the look of (phase, p) to a built step; returns the drawn chunk, or -1. The lines draw in as they are
 * proposed, a dot runs along each while it is imagined, then each vetoed candidate gets its veto mark, outermost
 * first, and dims; the kept ones turn green and look alike until one is drawn, the vetoed ones and their marks fade,
 * and the drawn one stays while it runs. 'summary' shows the whole step at once, for stills.
 */
export function paintStep(h, phase, p) {
  const { arcs, halos, pulses, tips, marks, stampAt, r } = h;
  const summary = phase === 'summary';
  const drawn = summary ? r.chosen : drawnAt(r.chosen, phase, p);
  const fade = (from, to) => Math.min(1, Math.max(0, (p - from) / (to - from)));
  const sorted = summary || reached(phase, 'veto');
  arcs.forEach((a, i) => {
    const kept = r.kept.includes(i);
    const shown = summary ? 1 : phase === 'propose' ? Math.min(1, p * 1.25) : reached(phase, 'score') ? 1 : 0;
    const dash = String(1 - shown);
    a.style.strokeDashoffset = dash;
    halos[i].style.strokeDashoffset = dash;
    a.classList.toggle('kept', sorted && kept);
    a.classList.toggle('vetoed', sorted && !kept);
    a.classList.toggle('chosen', drawn === i);
    let o;
    if (!kept) {
      // a vetoed line stays, dimmed under its mark, until the draw; then line and mark fade together
      o = summary ? 1 : phase === 'sample' ? 1 - fade(0.1, 0.5) : reached(phase, 'execute') ? 0 : 1;
    } else if (drawn < 0 || drawn === i) o = 1;
    else if (summary) o = 0.55;
    else if (phase === 'execute') o = 0.35 * (1 - fade(0, 0.7));
    else o = reached(phase, 'execute') ? 0 : 0.35;
    if (!sorted) o = 1;
    a.style.opacity = o3(o);
    halos[i].style.opacity = o3((sorted && !kept ? 0.4 : 0.72) * o);
    const pulse = pulses[i];
    const imagining = phase === 'score';
    pulse.style.opacity = o3(imagining ? Math.sin(Math.PI * p) : 0);
    pulse.style.strokeDashoffset = o3(imagining ? -p : 0);
    if (tips[i]) tips[i].style.opacity = o3(sorted && shown >= 1 ? o : 0);
    const m = marks[i];
    if (m) {
      const t = summary ? 1 : phase === 'veto' ? (p - stampAt(i)) / 0.16 : reached(phase, 'sample') && !reached(phase, 'execute') ? 1 : -1;
      const sc = pop(t);
      const [tx, ty] = m.getAttribute('transform').match(/translate\(([^)]+)\)/)[1].split(' ');
      m.setAttribute('transform', `translate(${tx} ${ty}) scale(${sc.toFixed(3)})`);
      m.style.opacity = o3(sc > 0 ? o : 0);
      m.classList.toggle('on', sc > 0);
    }
  });
  return drawn;
}

/**
 * Start the first-screen video before any data arrives: choose its size, wire the pause control, play unless the
 * page is still, and pause it while the hero is out of view. Returns the playback state the overlay reads:
 * `still` (no playback, so show one decision step) and `onStill` (called if playback fails later).
 */
export function startHeroVideo(root, { still = false, noAutoplay = false } = {}) {
  const video = root.querySelector('.hero-video');
  const pause = root.querySelector('button.pause');
  // `hold`: the overlay is holding the frame still; `userPaused`: the Pause button; `visible`: the hero is on screen.
  const state = { video, still: still || noAutoplay, onStill: null, hold: false, userPaused: false, visible: true, onChange: null };
  video.preload = state.still ? 'metadata' : 'auto'; // a still needs one frame, not the whole clip
  video.src = window.innerWidth >= 900 ? video.dataset.hd : video.dataset.sd;
  if (state.still) {
    pause.hidden = true;
    return state;
  }
  const stop = () => {
    if (state.still) return;
    state.still = true;
    pause.hidden = true;
    state.onStill?.();
  };
  // A pause during loading aborts play(); only a refusal (autoplay blocked) means there is no playback.
  const play = () => video.play().catch((e) => { if (e.name !== 'AbortError') stop(); });
  state.running = () => !state.still && !state.userPaused && state.visible;
  // The video plays while the overlay runs and is not holding a frame; the overlay hears every change.
  state.sync = () => {
    if (state.still) return;
    if (state.running() && !state.hold) { if (video.paused) play(); } else if (!video.paused) video.pause();
    state.onChange?.();
  };
  pause.addEventListener('click', () => {
    state.userPaused = !state.userPaused;
    pause.textContent = state.userPaused ? 'Play' : 'Pause';
    pause.setAttribute('aria-pressed', String(state.userPaused));
    state.sync();
  });
  video.addEventListener('error', stop, { once: true });
  play();
  new IntersectionObserver(([e]) => {
    state.visible = e.isIntersecting;
    state.sync();
  }).observe(root);
  return state;
}

/** Draw the decision moments over the hero video started by startHeroVideo. */
export function initHero(root, data, state, { stepIndex = 0 } = {}) {
  const { video } = state;
  const stage = root.querySelector('.hero-stage');
  const svg = stage.querySelector('svg.overlay');
  const note = root.querySelector('.provenance');
  const layer = svgEl('g', { class: 'layer' }, svg);
  const [fw, fh] = data.frame_size;
  let tf = { scale: 1, dx: 0, dy: 0 };
  let box = [fw, fh];
  let shown = null; // { idx, handles, phase, p }

  note.textContent = data.source === 'logged'
    ? 'Scores and choice are logged for this run. Arc shapes are schematic.'
    : 'Illustration of one decision step. The footage is a real VETO run.';

  function draw(idx) {
    layer.replaceChildren();
    const s = data.steps[idx];
    const r = rankStep(s);
    const k = markScale(tf.scale);
    const ends = screenFan(s.origin, s.target, r.rank, r.chosen, tf, box, { inset: markInset(k) });
    const origin = [tf.dx + s.origin[0] * tf.scale, tf.dy + s.origin[1] * tf.scale];
    const handles = buildStep(layer, { ...s, origin }, ends, k);
    shown = { idx, handles, phase: 'idle', p: 0 };
  }
  function paint(phase, p) {
    if (!shown) return;
    Object.assign(shown, { phase, p });
    paintStep(shown.handles, phase, p);
  }
  function clear() {
    layer.replaceChildren();
    shown = null;
  }
  function fit() {
    const { width, height } = stage.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    tf = coverTransform(fw, fh, width, height);
    box = [width, height];
    if (shown) {
      const { idx, phase, p } = shown;
      draw(idx);
      paint(phase, p);
    }
  }
  fit();
  new ResizeObserver(fit).observe(stage);

  function showStill(idx) {
    root.classList.add('still');
    video.pause();
    const seek = () => { video.currentTime = data.steps[idx].t; };
    if (video.readyState >= 1) seek();
    else video.addEventListener('loadedmetadata', seek, { once: true });
    draw(idx);
    paint('summary', 1);
  }
  if (state.still) {
    showStill(Math.min(Math.max(0, stepIndex), data.steps.length - 1));
    return;
  }
  state.onStill = () => showStill(0);

  let prevT = -1;
  let start = null;
  let pausedAt = null;
  let looping = false;
  const setHold = (on) => {
    if (state.hold === on) return;
    state.hold = on;
    state.sync();
  };
  function frame(now) {
    if (!state.running() || root.classList.contains('still')) {
      looping = false; // nothing moves while paused or off screen; onChange restarts the loop
      return;
    }
    const t = video.currentTime;
    prevT = wrapPrev(prevT, t);
    if (prevT === -1 && start !== null) {
      clear();
      start = null;
      setHold(false);
      video.playbackRate = 1;
    }
    if (start === null) {
      const i = dueStep(data.steps, prevT, t);
      if (i >= 0) {
        draw(i);
        start = now;
      }
    }
    if (start !== null) {
      const ms = now - start;
      const { phase, p } = phaseAt(ms);
      paint(phase, p);
      const rate = rateAt(phase, p);
      setHold(rate === 0); // the frame holds still while the chunks are proposed, scored, vetoed and drawn
      if (rate > 0) video.playbackRate = rate;
      if (ms > MOMENT_MS + HOLD_MS) {
        clear();
        start = null;
      }
    }
    prevT = t;
    requestAnimationFrame(frame);
  }
  const run = () => {
    if (looping) return;
    looping = true;
    requestAnimationFrame(frame);
  };
  // Pausing (the button, or scrolling away) stops the moment's clock; resuming picks it up where it was.
  state.onChange = () => {
    if (!state.running()) {
      if (pausedAt === null) pausedAt = performance.now();
      return;
    }
    if (pausedAt !== null) {
      if (start !== null) start += performance.now() - pausedAt;
      pausedAt = null;
    }
    run();
  };
  run();
}
