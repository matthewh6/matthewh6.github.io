// Scales and label placement for the in-page charts. Pure functions.

export function linear([d0, d1], [r0, r1]) {
  const k = (r1 - r0) / ((d1 - d0) || 1);
  const s = (v) => r0 + (v - d0) * k;
  s.invert = (px) => d0 + (px - r0) / k;
  return s;
}

/** Transitions axis: log2(1 + v / c), so 0 to 512 gets room next to 4096. */
export function symlog([d0, d1], [r0, r1], c = 32) {
  const f = (v) => Math.log2(1 + v / c);
  const inner = linear([f(d0), f(d1)], [r0, r1]);
  const s = (v) => inner(f(v));
  s.invert = (px) => c * (Math.pow(2, inner.invert(px)) - 1);
  return s;
}

/** Evenly spaced categories, such as Fig. 9's refitting rounds; invert interpolates between their values. */
export function category(values, [r0, r1]) {
  const n = values.length;
  const at = (i) => r0 + (n > 1 ? i / (n - 1) : 0.5) * (r1 - r0);
  const s = (v) => at(values.indexOf(v));
  s.invert = (px) => {
    const f = Math.min(n - 1, Math.max(0, ((px - r0) / ((r1 - r0) || 1)) * (n - 1)));
    const i = Math.min(n - 2, Math.floor(f));
    return n > 1 ? values[i] + (values[i + 1] - values[i]) * (f - i) : values[0];
  };
  return s;
}

/**
 * Push label y positions apart by at least `gap`, keeping their order and moving as little as possible: labels that
 * would touch form a block, centered on where its labels want to be, and a label clear of every block stays put.
 * Returns positions in input order.
 */
export function spreadLabels(ys, gap) {
  const idx = ys.map((y, i) => [y, i]).sort((a, b) => a[0] - b[0]);
  // each block holds n labels at top + k * gap; top is the mean of (wanted y - k * gap) over its labels
  const blocks = [];
  for (const [y] of idx) {
    blocks.push({ n: 1, sum: y, top: y });
    while (blocks.length > 1) {
      const b = blocks.pop();
      const a = blocks[blocks.length - 1];
      if (a.top + a.n * gap <= b.top) {
        blocks.push(b);
        break;
      }
      a.sum += b.sum - b.n * a.n * gap;
      a.n += b.n;
      a.top = a.sum / a.n;
    }
  }
  const res = new Array(ys.length);
  let k = 0;
  for (const block of blocks) {
    for (let j = 0; j < block.n; j++, k++) res[idx[k][1]] = block.top + j * gap;
  }
  return res;
}

/** Label y positions for labels at x with width w: labels whose spans overlap are pushed `gap` apart, the rest
 *  stay where they are; with `bounds` [top, bottom], labels past an edge move inside it. Returns positions in input
 *  order. */
export function placeLabels(items, gap, bounds = null) {
  const root = items.map((_, i) => i);
  const find = (i) => (root[i] === i ? i : (root[i] = find(root[i])));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w) root[find(i)] = find(j);
    }
  }
  const out = items.map((it) => it.y);
  const clusters = new Map();
  items.forEach((_, i) => { const r = find(i); clusters.set(r, [...(clusters.get(r) || []), i]); });
  for (const idx of clusters.values()) {
    if (idx.length > 1) spreadLabels(idx.map((i) => items[i].y), gap).forEach((y, k) => { out[idx[k]] = y; });
    if (!bounds) continue;
    // inside the bounds, moving only the labels that have to: labels pushed off an edge push their neighbors on,
    // a gap at a time, and a label clear of them stays at its line's end
    const order = [...idx].sort((a, b) => out[a] - out[b]);
    order.forEach((i, k) => { out[i] = Math.max(out[i], k ? out[order[k - 1]] + gap : bounds[0]); });
    for (let k = order.length - 1; k >= 0; k--) {
      const i = order[k];
      out[i] = Math.min(out[i], k < order.length - 1 ? out[order[k + 1]] - gap : bounds[1]);
    }
  }
  return out;
}
