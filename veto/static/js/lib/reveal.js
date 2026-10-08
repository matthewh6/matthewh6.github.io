// Timeline for the animated figures (spec 2026-10-07, section 3). Pure functions, no DOM.
// Axes draw first; then the series draw in groups, baselines first and VETO last, each group sweeping left to
// right; then one callout counts up. Times are in ms from the moment the figure starts.

export const AXES_MS = 350;
export const RUN_MS = 1500;
export const BEAT_MS = 250;
export const POP_MS = 240;
export const CALLOUT_MS = 500;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
/** Sine in and out: the head starts and lands gently. */
export const easeRun = (u) => (1 - Math.cos(Math.PI * clamp(u))) / 2;
/** Inverse of easeRun: the share of a run's time the head needs to reach eased position v. */
export const easeRunInverse = (v) => Math.acos(1 - 2 * clamp(v)) / Math.PI;
/** A slight overshoot for markers popping in; 0 before the pop starts, 1 at rest. */
export function backOut(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
}

/** When group k (0 = first) starts its run. */
export const groupStart = (k) => AXES_MS + k * (RUN_MS + BEAT_MS);
/** When the last of `groups` runs ends, which is when a callout starts. */
export const runsEnd = (groups) => groupStart(groups - 1) + RUN_MS;
/** The whole reveal's length for `groups` runs, with or without a callout. */
export const revealMs = (groups, callout) => runsEnd(groups) + (callout ? CALLOUT_MS : 0);

/** Axes progress, 0 to 1. */
export const axesAt = (t) => easeOut(t / AXES_MS);
/** Where group k's head is at time t, as a share of the x axis (0 to 1), or -1 before it starts. */
export function headAt(t, k) {
  const s = groupStart(k);
  return t < s ? -1 : easeRun((t - s) / RUN_MS);
}
/** When group k's head reaches share v of the x axis. */
export const reachAt = (k, v) => groupStart(k) + easeRunInverse(v) * RUN_MS;
/** Scale of a marker the head reached at time `at`. */
export const popAt = (t, at) => backOut((t - at) / POP_MS);
/** Callout progress, 0 to 1, after every run has ended. */
export const calloutAt = (t, groups) => easeOut((t - runsEnd(groups)) / CALLOUT_MS);

/**
 * The part of a polyline the head has drawn. `pts` are {px, y, lo?, hi?} sorted by px (screen x); `hx` is the head's
 * screen x. Returns the points left of the head plus an interpolated point at the head, or [] before the first point.
 */
export function cutAt(pts, hx) {
  if (!pts.length || hx < pts[0].px) return [];
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.px <= hx) { out.push(p); continue; }
    const q = pts[i - 1];
    if (hx <= q.px) break;
    const f = (hx - q.px) / (p.px - q.px);
    const mid = (a, b) => (a == null || b == null ? undefined : a + (b - a) * f);
    out.push({ px: hx, y: mid(q.y, p.y), lo: mid(q.lo, p.lo), hi: mid(q.hi, p.hi), head: true });
    break;
  }
  return out;
}
