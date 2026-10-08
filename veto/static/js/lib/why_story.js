// The "why VETO" illustration (Matthew, 2026-10-08): one start, try after try. Unguided, RL walks into the same dead
// end until the policy has learned it fails; ranked by a TD critic, until the critic has; ranked by VETO, once, and
// from then on VETO vetoes it. Pure: frameAt(side, t) says what a panel shows t ms into its reveal.
import { easeRun, backOut } from './reveal.js';

export const ATTEMPT_MS = 1100;
export const ATTEMPTS = 9;
/** Dead-end tries each side needs before it has learned the dead end fails. */
export const LEARNS_AFTER = { unguided: 8, critic: 5, veto: 1 };
export const STORY_MS = ATTEMPTS * ATTEMPT_MS;
/** The share of a try at which its line arrives. */
export const REACH = 0.7;
const STAMP = 0.12; // a vetoed try: the veto sign stamps on the proposed dead end
const GO = 0.35; // then the run starts for the goal
const POP = 0.15;

/**
 * The scene in the panels' viewBox units: a start, a fork, a dead end up the side branch (walled at the top) and the
 * goal round a corner. Corridors are drawn as wide strokes along their center lines; a try runs along one route.
 */
export const SCENE = {
  viewBox: '10 24 366 150',
  start: [34, 150],
  fork: [168, 150],
  wall: 34,
  hit: [168, 56],
  sign: [168, 104],
  goal: [350, 50],
  corridor: 'M34 150H310Q350 150 350 110V58',
  branch: 'M168 150V34',
  trunk: 'M34 150H168',
  routes: { dead: 'M34 150H168V46', goal: 'M34 150H310Q350 150 350 110V62' },
  ends: { dead: 'M168 150V46', goal: 'M168 150H310Q350 150 350 110V62' },
};

const clamp = (v) => Math.min(1, Math.max(0, v));
const span = (u, a, b) => clamp((u - a) / (b - a));

/** Each try in order: 'dead' (walks into the dead end), 'goal', or 'vetoed' (the dead end is vetoed, the run goes to the goal). */
export function plan(side) {
  return Array.from({ length: ATTEMPTS }, (_, k) => (k < LEARNS_AFTER[side] ? 'dead' : side === 'veto' ? 'vetoed' : 'goal'));
}

/** How much a side has learned that the dead end fails after `tries` tries, 0 to 1. */
export const learned = (side, tries) => Math.min(1, tries / LEARNS_AFTER[side]);

/**
 * What a panel shows t ms into its reveal (Infinity: the finished panel):
 * - traces: the kinds of the finished tries, drawn faintly; live: the current try's line {kind, drawn 0..1} or null
 * - candidate: opacity of the proposed dead end on a vetoed try; stamp: scale of the veto sign on it
 * - hit: scale of the cross at the dead end; deadTries: tries that reached it; meter: learned, 0 to 1
 */
export function frameAt(side, t) {
  const p = plan(side);
  const time = Math.max(0, t);
  const k = Math.floor(time / ATTEMPT_MS);
  const deadIn = (kinds) => kinds.filter((x) => x === 'dead').length;
  if (k >= ATTEMPTS) {
    return { traces: p, live: null, candidate: 0, stamp: p.includes('vetoed') ? 1 : 0, hit: p.includes('dead') ? 1 : 0,
      deadTries: deadIn(p), meter: learned(side, ATTEMPTS) };
  }
  const u = time / ATTEMPT_MS - k;
  const kind = p[k];
  const before = p.slice(0, k);
  const pop = (a) => backOut(span(u, a, a + POP));
  // the cross and the veto sign stay once shown, and stamp again on every repeat
  let hit = deadIn(before) ? 1 : 0;
  if (kind === 'dead' && u >= REACH) hit = pop(REACH);
  let stamp = before.includes('vetoed') ? 1 : 0;
  if (kind === 'vetoed' && u >= STAMP) stamp = pop(STAMP);
  const grow = learned(side, k + 1) - learned(side, k);
  return {
    traces: before,
    live: kind === 'vetoed' ? { kind: 'goal', drawn: easeRun(span(u, GO, 0.9)) } : { kind, drawn: easeRun(span(u, 0, REACH)) },
    candidate: kind === 'vetoed' ? span(u, 0, 0.08) * (1 - span(u, 0.3, 0.45)) : 0,
    stamp,
    hit,
    deadTries: deadIn(before) + (kind === 'dead' && u >= REACH ? 1 : 0),
    meter: learned(side, k) + grow * easeRun(span(u, REACH, 1)),
  };
}
