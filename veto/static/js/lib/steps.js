// Decision-step data and timing for the first-screen overlay. Pure functions, no DOM.

export const N = 16; // chunks proposed per decision step
export const K = 4;  // chunks the verifier keeps

/** Indices of the k highest scores; ties go to the lower index. */
export function topK(scores, k) {
  return scores
    .map((v, i) => [v, i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .slice(0, k)
    .map(([, i]) => i);
}

const isPoint = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);

/** Problems with a hero_steps.json object, as readable strings. Empty when valid. */
export function validateHeroSteps(data) {
  if (!data || typeof data !== 'object') return ['data must be an object'];
  const errs = [];
  if (!['illustrative', 'logged'].includes(data.source)) errs.push('source must be "illustrative" or "logged"');
  if (!isPoint(data.frame_size) || !(data.frame_size[0] > 0 && data.frame_size[1] > 0)) {
    errs.push('frame_size must be [width, height]');
  }
  if (!Array.isArray(data.steps) || data.steps.length === 0) return [...errs, 'steps must be a non-empty array'];
  data.steps.forEach((s, i) => {
    const at = `steps[${i}]`;
    if (!Number.isFinite(s.t) || s.t < 0) errs.push(`${at}.t must be a number >= 0`);
    if (i > 0 && !(s.t > data.steps[i - 1].t)) errs.push(`${at}.t must be later than steps[${i - 1}].t`);
    if (!isPoint(s.origin)) errs.push(`${at}.origin must be [x, y]`);
    if (!isPoint(s.target)) errs.push(`${at}.target must be [x, y]`);
    if (!Array.isArray(s.scores) || s.scores.length !== N || !s.scores.every(Number.isFinite)) {
      errs.push(`${at}.scores must hold ${N} numbers`);
      return;
    }
    const kept = Array.isArray(s.kept) ? s.kept : [];
    if (kept.length !== K || !topK(s.scores, K).every((j) => kept.includes(j))) {
      errs.push(`${at}.kept must be the indices of the ${K} highest scores`);
    }
    if (!kept.includes(s.chosen)) errs.push(`${at}.chosen must be one of kept`);
    if (s.arcs != null && !(Array.isArray(s.arcs) && s.arcs.length === N)) {
      errs.push(`${at}.arcs must be null or ${N} polylines`);
    }
  });
  return errs;
}

/** Ranking view of one step: order (best first), rank per candidate, kept, vetoed, chosen. */
export function rankStep(step) {
  const order = topK(step.scores, step.scores.length);
  const rank = new Array(order.length);
  order.forEach((idx, r) => { rank[idx] = r; });
  const kept = step.kept.slice();
  return { order, rank, kept, vetoed: order.filter((i) => !kept.includes(i)), chosen: step.chosen };
}

/** Choreography of one decision moment in ms (spec 4.1). In `sample` the kept chunks are drawn uniformly. */
export const PHASES = [['slow', 250], ['propose', 600], ['score', 700], ['veto', 600], ['sample', 1100], ['execute', 500]];
export const MOMENT_MS = PHASES.reduce((sum, [, ms]) => sum + ms, 0);

/** Phase and 0..1 progress `ms` after a moment starts. */
export function phaseAt(ms) {
  if (ms < 0) return { phase: 'idle', p: 0 };
  let t = ms;
  for (const [phase, d] of PHASES) {
    if (t < d) return { phase, p: t / d };
    t -= d;
  }
  return { phase: 'done', p: 1 };
}

/**
 * Video playback rate during a moment: ease down to 0.25, then 0 (the frame holds still) while the chunks are proposed,
 * scored, vetoed and drawn, so the fan stays on the gripper; then ease back to 1 as the chosen chunk runs.
 */
export function rateAt(phase, p) {
  if (phase === 'slow') return 1 - 0.75 * p;
  if (phase === 'propose' || phase === 'score' || phase === 'veto' || phase === 'sample') return 0;
  if (phase === 'execute') return 0.25 + 0.75 * p;
  return 1;
}

/** Index of the step whose time lies in (prevT, t], or -1. */
export function dueStep(steps, prevT, t) {
  for (let i = 0; i < steps.length; i++) {
    if (prevT < steps[i].t && steps[i].t <= t) return i;
  }
  return -1;
}

/** Previous time to compare against: -1 after the video jumped back (loop or seek). */
export function wrapPrev(prevT, t) {
  return t + 0.5 < prevT ? -1 : prevT;
}

const STAGES = ['idle', 'slow', 'propose', 'score', 'veto', 'sample', 'execute', 'done'];

/** Whether `phase` has reached `stage`. */
export function reached(phase, stage) {
  return STAGES.indexOf(phase) >= STAGES.indexOf(stage);
}

/** The uniform pick (spec 12): in the sample phase the kept chunks look alike until DRAW_AT, then the chosen one is
 * drawn, once; nothing cycles through the candidates. */
export const DRAW_AT = 0.6;

/** The chunk the uniform pick has drawn so far: `chosen` from DRAW_AT on, otherwise -1. */
export function drawnAt(chosen, phase, p) {
  if (phase === 'sample') return p >= DRAW_AT ? chosen : -1;
  return reached(phase, 'execute') ? chosen : -1;
}
