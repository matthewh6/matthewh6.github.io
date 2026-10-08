// Geometry for the first-screen overlay. Pure functions, no DOM.

/** Scale and offset that a centered `object-fit: cover` applies to a frameW x frameH frame
 *  shown in a boxW x boxH element. Frame point (x, y) lands at (dx + x * scale, dy + y * scale). */
export function coverTransform(frameW, frameH, boxW, boxH) {
  const scale = Math.max(boxW / frameW, boxH / frameH);
  return { scale, dx: (boxW - frameW * scale) / 2, dy: (boxH - frameH * scale) / 2 };
}

/** Stable pseudo-random value in [0, 1) for an integer. */
export function hash01(i) {
  return ((Math.imul(i + 1, 2654435761) >>> 0) % 100000) / 100000;
}

/**
 * End points of a schematic fan of candidate chunks starting at `origin`.
 * The chosen chunk points at `target`, stretched to at least `minLen`. The others alternate sides of it and open
 * wider as their rank gets worse: the other `keep - 1` kept chunks sit evenly spaced within `innerDeg` of it, so
 * the uniform draw among the kept can be followed, and the vetoed ones fan out evenly beyond them up to `spreadDeg`.
 * Every end sits within 4% of one arc, so the veto marks on the vetoed ends have room.
 * rank[i] is candidate i's position when sorted by score (0 = best).
 */
export function fanEndpoints(origin, target, rank, chosen, { spreadDeg = 75, minLen = 150, keep = 4, innerDeg = 24 } = {}) {
  const [ox, oy] = origin;
  const vx = target[0] - ox;
  const vy = target[1] - oy;
  const len = Math.max(Math.hypot(vx, vy), minLen);
  const base = Math.atan2(vy, vx);
  const n = rank.length;
  const ends = new Array(n);
  ends[chosen] = [ox + Math.cos(base) * len, oy + Math.sin(base) * len];
  rank
    .map((r, i) => [r, i])
    .filter(([, i]) => i !== chosen)
    .sort((a, b) => a[0] - b[0])
    .forEach(([, i], slot) => {
      const k = slot + 1;                        // 1 .. n-1, never closer than a better-ranked chunk
      const side = k % 2 === 1 ? 1 : -1;
      const kept = k < keep;
      // the vetoed ones spread evenly from just past the kept ones out to spreadDeg on each side, so their marks
      // line up instead of piling up (spec 12, landing N)
      const outer = Math.ceil((k - keep + 1) / 2);
      const perSide = Math.ceil((n - keep) / 2);
      const deg = kept
        ? (innerDeg * Math.ceil(k / 2)) / Math.ceil((keep - 1) / 2)
        : innerDeg + 10 + ((spreadDeg - innerDeg - 10) * (outer - 1)) / Math.max(1, perSide - 1);
      const ang = base + side * deg * (Math.PI / 180);
      const l = len * (0.96 + 0.08 * hash01(i)); // every end near one arc
      ends[i] = [ox + Math.cos(ang) * l, oy + Math.sin(ang) * l];
    });
  return ends;
}

/**
 * The fan for one decision step in screen px. It is built in frame px, so the 150 px minimum is a frame length
 * (spec 4.1), and mapped with the cover transform `tf`. On a small video an arc shorter than `minScreen` is
 * lengthened to it, and an arc whose end would leave the visible box less `inset` ([left, top, right, bottom],
 * room for its score tick and glyph) is shortened along its own direction.
 */
export function screenFan(origin, target, rank, chosen, tf, [boxW, boxH], { minScreen = 44, inset = [0, 0, 0, 0] } = {}) {
  const map = ([x, y]) => [tf.dx + x * tf.scale, tf.dy + y * tf.scale];
  const [ox, oy] = map(origin);
  const [l, t, r, b] = inset;
  return fanEndpoints(origin, target, rank, chosen).map((end) => {
    const [ex, ey] = map(end);
    const vx = ex - ox;
    const vy = ey - oy;
    let k = Math.max(1, minScreen / (Math.hypot(vx, vy) || 1));
    if (vx > 0) k = Math.min(k, (boxW - r - ox) / vx);
    if (vx < 0) k = Math.min(k, (l - ox) / vx);
    if (vy > 0) k = Math.min(k, (boxH - b - oy) / vy);
    if (vy < 0) k = Math.min(k, (t - oy) / vy);
    k = Math.max(0, k);
    return [ox + vx * k, oy + vy * k];
  });
}

const r1 = (v) => Math.round(v * 10) / 10;

/** Quadratic arc from a to b, bowed to the left of travel by `bend` times its length. */
export function arcPath(a, b, bend = 0.16) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const cx = (a[0] + b[0]) / 2 + dy * bend;
  const cy = (a[1] + b[1]) / 2 - dx * bend;
  return `M${r1(a[0])} ${r1(a[1])} Q${r1(cx)} ${r1(cy)} ${r1(b[0])} ${r1(b[1])}`;
}

/**
 * A candidate drawn as one of a sheaf: it leaves `a` along the shared `heading` (a unit vector, the executed chunk's
 * direction) and bends toward its own end `b`, so the fan reads as diverging futures rather than a starburst.
 */
export function sheafPath(a, b, heading) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const c1 = [a[0] + heading[0] * 0.42 * L, a[1] + heading[1] * 0.42 * L];
  const c2 = [c1[0] + (b[0] - c1[0]) * 0.42, c1[1] + (b[1] - c1[1]) * 0.42];
  return `M${r1(a[0])} ${r1(a[1])}C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(b[0])} ${r1(b[1])}`;
}

/** Where a vetoed candidate's mark goes: `gap` px past its end `b`, along the line's last direction. */
export function markPoint(a, b, heading, gap) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const c1 = [a[0] + heading[0] * 0.42 * L, a[1] + heading[1] * 0.42 * L];
  const c2 = [c1[0] + (b[0] - c1[0]) * 0.42, c1[1] + (b[1] - c1[1]) * 0.42];
  const d = Math.hypot(b[0] - c2[0], b[1] - c2[1]) || 1;
  return [b[0] + ((b[0] - c2[0]) / d) * gap, b[1] + ((b[1] - c2[1]) / d) * gap];
}
