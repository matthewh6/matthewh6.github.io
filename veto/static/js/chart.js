// Line charts with mean ± SD bands, white-filled markers and labels at line ends (spec 3.1), built once and painted
// at any moment of their reveal (spec 2026-10-07 §3): paint(t) shows the chart t ms after it starts playing, and
// paint(Infinity) shows the finished chart.
import { linear, symlog, category, placeLabels } from './lib/scale.js';
import { axesAt, headAt, reachAt, popAt, calloutAt, revealMs, runsEnd, cutAt } from './lib/reveal.js';

const NS = 'http://www.w3.org/2000/svg';
function svgEl(name, attrs, parent) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent.appendChild(e);
  return e;
}
const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
/** How values read on ticks, labels and callouts. */
export const FORMATS = {
  plain: fmt,
  pct: (v) => `${Math.round(v * 100)}%`,
  pct1: (v) => `${(Math.round(v * 1000) / 10).toFixed(1)}%`,
  fixed2: (v) => v.toFixed(2),
  int: (v) => String(Math.round(v)),
  k: (v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v))),
  thousands: (v) => Math.round(v).toLocaleString('en-US'),
};
const MARKERS = {
  circle: (g, x, y) => svgEl('circle', { class: 'pt', cx: x, cy: y, r: 3.6 }, g),
  square: (g, x, y) => svgEl('rect', { class: 'pt', x: x - 3.4, y: y - 3.4, width: 6.8, height: 6.8 }, g),
  diamond: (g, x, y) => svgEl('path', { class: 'pt', d: `M${x} ${y - 4.6}L${x + 4.6} ${y}L${x} ${y + 4.6}L${x - 4.6} ${y}Z` }, g),
  triangle: (g, x, y) => svgEl('path', { class: 'pt', d: `M${x} ${y - 4.6}L${x + 4.4} ${y + 3.4}L${x - 4.4} ${y + 3.4}Z` }, g),
  triangleDown: (g, x, y) => svgEl('path', { class: 'pt', d: `M${x} ${y + 4.6}L${x + 4.4} ${y - 3.4}L${x - 4.4} ${y - 3.4}Z` }, g),
  plus: (g, x, y) => svgEl('path', { class: 'pt', d: `M${x - 1.7} ${y - 4.6}h3.4v2.9h2.9v3.4h-2.9v2.9h-3.4v-2.9h-2.9v-3.4h2.9Z` }, g),
  cross: (g, x, y) => svgEl('path', { class: 'pt', d: `M${x - 1.7} ${y - 4.6}h3.4v2.9h2.9v3.4h-2.9v2.9h-3.4v-2.9h-2.9v-3.4h2.9Z`, transform: `rotate(45 ${x} ${y})` }, g),
};
const r1 = (v) => Math.round(v * 10) / 10;
const linePath = (pts, Y, key) => pts.map((p, i) => `${i ? 'L' : 'M'}${r1(p.px)} ${r1(Y(p[key]))}`).join('');
const LABEL_FONT = 13;
const labelWidth = (text) => text.length * LABEL_FONT * 0.55;
const MIN_PLOT = 140;

/**
 * The chart's margins, and whether its end labels carry the series' names. Names need labelRoom px on the right; a
 * spec with valueRoom shows values only, in valueRoom px, when names would leave the plot narrower than 140 px (Fig. 7
 * in one row, Matthew 2026-10-08).
 */
export function layout(spec, width, margin = {}) {
  const endCallout = spec.callout && spec.callout.x === spec.x.domain[1];
  const headCallout = spec.callout && !endCallout && spec.header;
  const m = { t: spec.header ? (headCallout ? 62 : 44) : 24, r: spec.labelRoom ?? 132, b: 46, l: 50, ...margin };
  const named = spec.valueRoom == null || width - m.l - m.r >= MIN_PLOT;
  return { named, m: named ? m : { ...m, r: spec.valueRoom } };
}

/**
 * Build a chart into `svg`. `spec`:
 * - x: {domain, ticks, scale: 'linear' | 'symlog' | 'category', values (category), label}
 * - y: {domain, ticks, label, tickFormat, format} with formats from FORMATS ('plain' if unset)
 * - series: [{key, label, color, dash, marker, points: [{x, y, lo?, hi?}], runs?, group, labeled, markers}];
 *   group 0 draws first; VETO's group draws last
 * - refLines: [{key, y, label, color?}], regions: [{x0, x1, label}], header: {title, unit, format?} or null
 *   (format: a FORMATS key or a function), callout: {x, a, b, text(g)} or null (a, b are series or refLine keys; a
 *   callout inside the axis puts its text on a second header line, clear of the lines), marker: x or null,
 *   labelRoom: px, valueRoom: px (see layout). A refLine with labelAt: 'end' puts its label at the right end; an empty
 *   label draws none.
 * Series may set markAt: [x...] to mark only those points (dense curves) or markers: false.
 * Returns {paint(t), setMarker(x), ms}.
 */
export function buildLineChart(svg, spec, { width = 560, height = 320, margin = {} } = {}) {
  const endCallout = spec.callout && spec.callout.x === spec.x.domain[1];
  const headCallout = spec.callout && !endCallout && spec.header;
  const { m, named } = layout(spec, width, margin);
  svg.replaceChildren();
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const x0 = m.l;
  const x1 = width - m.r;
  const y0 = height - m.b;
  const y1 = m.t;
  const X = spec.x.scale === 'symlog' ? symlog(spec.x.domain, [x0, x1])
    : spec.x.scale === 'category' ? category(spec.x.values, [x0, x1]) : linear(spec.x.domain, [x0, x1]);
  const Y = linear(spec.y.domain, [y0, y1]);
  const tickText = FORMATS[spec.y.tickFormat || 'plain'];
  const valueText = FORMATS[spec.y.format || 'plain'];

  const axis = svgEl('g', { class: 'axis' }, svg);
  const grids = spec.y.ticks.map((v) => {
    const line = svgEl('line', { class: 'grid', x1: x0, x2: x1, y1: Y(v), y2: Y(v) }, axis);
    svgEl('text', { class: 'tick', x: x0 - 8, y: Y(v) + 4, 'text-anchor': 'end' }, axis).textContent = tickText(v);
    return line;
  });
  const xTickText = FORMATS[spec.x.tickFormat || 'thousands'];
  for (const v of spec.x.scale === 'category' ? spec.x.values : spec.x.ticks) {
    svgEl('line', { class: 'tickmark', x1: X(v), x2: X(v), y1: y0, y2: y0 + 5 }, axis);
    svgEl('text', { class: 'tick', x: X(v), y: y0 + 19, 'text-anchor': 'middle' }, axis).textContent = xTickText(v);
  }
  for (const r of spec.regions || []) { // a shaded stretch of x, such as Fig. 8's warmup
    svgEl('rect', { class: 'region', x: X(r.x0), y: y1, width: X(r.x1) - X(r.x0), height: y0 - y1 }, axis);
    svgEl('text', { class: 'region-label', x: (X(r.x0) + X(r.x1)) / 2, y: y1 + 14, 'text-anchor': 'middle' }, axis).textContent = r.label;
  }
  svgEl('line', { class: 'baseline', x1: x0, x2: x1, y1: y0, y2: y0 }, axis);
  svgEl('text', { class: 'axis-label', x: (x0 + x1) / 2, y: height - 6, 'text-anchor': 'middle' }, axis).textContent = spec.x.label;
  const ym = (y0 + y1) / 2;
  svgEl('text', { class: 'axis-label', x: 13, y: ym, 'text-anchor': 'middle', transform: `rotate(-90 13 ${ym})` }, axis).textContent = spec.y.label;
  for (const ref of spec.refLines || []) {
    const ry = Y(ref.y);
    const line = svgEl('line', { class: 'ref', x1: x0, x2: x1, y1: ry, y2: ry }, axis);
    if (ref.color) line.style.stroke = ref.color;
    if (ref.label) {
      const atEnd = ref.labelAt === 'end';
      svgEl('text', { class: 'ref-label', x: atEnd ? x1 - 4 : x0 + 4, y: ry - 6, 'text-anchor': atEnd ? 'end' : 'start' }, axis).textContent = ref.label;
    }
  }
  // The header: the title, and while the lines run, a counter of the x they have reached, at the right edge; on a
  // panel too narrow for both on one line the counter drops to the second line, which a callout takes over later.
  let counter = null;
  if (spec.header) {
    svgEl('text', { class: 'chart-title', x: 0, y: 16 }, svg).textContent = spec.header.title;
    const tight = spec.header.title.length * 14 * 0.55 + 140 > width;
    counter = svgEl('text', { class: 'counter', x: width - 2, y: tight ? 34 : 16, 'text-anchor': 'end', 'aria-hidden': 'true' }, svg);
  }

  const plot = svgEl('g', { class: 'plot' }, svg);
  const groups = Math.max(0, ...spec.series.map((s) => s.group ?? 0)) + 1;
  const runsDone = runsEnd(groups);
  const share = (px) => (px - x0) / (x1 - x0);
  const S = spec.series.map((s) => {
    const g = svgEl('g', { class: `series s-${s.key}` }, plot);
    g.style.setProperty('--c', s.color);
    const k = s.group ?? 0;
    const runs = (s.runs || [s.points]).map((run) => run.map((p) => ({ ...p, px: X(p.x) })));
    const parts = runs.map((run) => (run.length === 1
      ? { run, whisker: svgEl('line', { class: 'whisker', x1: run[0].px, x2: run[0].px, y1: Y(run[0].lo ?? run[0].y), y2: Y(run[0].hi ?? run[0].y) }, g) }
      : { run, band: run.some((p) => p.lo != null) ? svgEl('path', { class: 'band' }, g) : null, line: svgEl('path', { class: 'line', 'stroke-dasharray': s.dash || 'none' }, g) }));
    // dense series (smoothed or cumulative curves) mark only the x values in markAt
    const marked = s.markers === false ? [] : s.markAt ? s.points.filter((p) => s.markAt.includes(p.x)) : s.points;
    const marks = marked.map((p) => {
      const px = X(p.x);
      const py = Y(p.y);
      const el = MARKERS[s.marker](g, px, py);
      return { el, px, py, own: el.getAttribute('transform') || '', at: reachAt(k, share(px)) };
    });
    const label = s.labeled === false ? null : svgEl('text', { class: 'end-label', 'aria-hidden': 'true' }, g);
    return { s, k, parts, marks, label };
  });

  let callout = null;
  if (spec.callout) {
    const c = spec.callout;
    const valueAt = (key) => {
      const ref = (spec.refLines || []).find((r) => r.key === key);
      if (ref) return ref.y;
      return spec.series.find((s) => s.key === key).points.find((p) => p.x === c.x).y;
    };
    const g = svgEl('g', { class: 'callout', 'aria-hidden': 'true' }, svg);
    callout = { c, px: X(c.x), ya: Y(valueAt(c.a)), yb: Y(valueAt(c.b)), bracket: svgEl('path', { class: 'bracket' }, g), text: svgEl('text', { class: 'callout-label' }, g) };
  }

  const mk = svgEl('g', { class: 'marker', visibility: 'hidden' }, svg);
  const mkLine = svgEl('line', { y1, y2: y0 }, mk);
  const mkText = svgEl('text', { y: y1 - 9, 'text-anchor': 'middle' }, mk);
  let markerX = spec.marker ?? null;
  const ms = revealMs(groups, Boolean(spec.callout));
  let shownAt = 0;
  function placeMarker() {
    if (markerX === null || markerX === undefined || shownAt < ms) {
      mk.setAttribute('visibility', 'hidden');
      return;
    }
    const px = X(Math.min(Math.max(markerX, spec.x.domain[0]), spec.x.domain[1]));
    mkLine.setAttribute('x1', String(px));
    mkLine.setAttribute('x2', String(px));
    mkText.setAttribute('x', String(px));
    mkText.textContent = markerX.toLocaleString('en-US');
    mk.setAttribute('visibility', 'visible');
  }

  function paint(t) {
    shownAt = t;
    const a = axesAt(t);
    axis.setAttribute('opacity', String(a));
    grids.forEach((g) => g.setAttribute('x2', String(x0 + (x1 - x0) * a)));
    let liveHx = null;
    let started = false;
    const labels = [];
    for (const q of S) {
      const u = headAt(t, q.k);
      const hx = u < 0 ? -Infinity : x0 + u * (x1 - x0);
      if (u >= 0) started = true;
      if (u >= 0 && u < 1) liveHx = hx;
      let head = null;
      for (const part of q.parts) {
        if (part.whisker) {
          const on = hx >= part.run[0].px;
          part.whisker.setAttribute('opacity', on ? '' : '0');
          if (on && (!head || part.run[0].px >= head.px)) head = part.run[0];
          continue;
        }
        const pts = cutAt(part.run, hx);
        part.line.setAttribute('d', pts.length > 1 ? linePath(pts, Y, 'y') : '');
        if (part.band) {
          part.band.setAttribute('d', pts.length > 1 ? `${linePath(pts, Y, 'hi')}${linePath([...pts].reverse(), Y, 'lo').replace(/^M/, 'L')}Z` : '');
        }
        if (pts.length && (!head || pts[pts.length - 1].px >= head.px)) head = pts[pts.length - 1];
      }
      for (const mark of q.marks) {
        const sc = popAt(t, mark.at);
        mark.el.setAttribute('opacity', sc > 0 ? '' : '0');
        const pop = sc === 1 || sc === 0 ? '' : `translate(${mark.px} ${mark.py}) scale(${sc}) translate(${-mark.px} ${-mark.py}) `;
        mark.el.setAttribute('transform', `${pop}${mark.own}`.trim());
      }
      if (q.label) {
        if (!head) q.label.textContent = '';
        else {
          const text = named ? `${q.s.label} ${valueText(head.y)}` : valueText(head.y);
          q.label.textContent = text;
          const lx = head.px + (endCallout && u >= 1 ? 22 : 9);
          q.label.setAttribute('x', String(r1(lx)));
          labels.push({ el: q.label, x: lx, w: labelWidth(text), y: Y(head.y) });
        }
      }
    }
    placeLabels(labels, 15, [y1 + 2, y0 - 8]).forEach((y, i) => labels[i].el.setAttribute('y', String(r1(y + 4))));
    if (counter) {
      // the x reached by the line being drawn (the end of the axis between runs); gone once every run has ended
      const f = typeof spec.header.format === 'function' ? spec.header.format : FORMATS[spec.header.format || 'thousands'];
      counter.textContent = started && t < runsDone ? `${f(X.invert(liveHx ?? x1))}${spec.header.unit ? ` ${spec.header.unit}` : ''}` : '';
    }
    if (callout) {
      const g = calloutAt(t, groups);
      const { c, px, ya, yb } = callout;
      const mid = (ya + yb) / 2;
      const top = mid + (ya - mid) * g;
      const bot = mid + (yb - mid) * g;
      if (g <= 0) {
        callout.bracket.setAttribute('d', '');
        callout.text.textContent = '';
      } else if (endCallout) {
        const bx = px + 11;
        callout.bracket.setAttribute('d', `M${r1(bx - 4)} ${r1(top)}H${r1(bx)}V${r1(bot)}H${r1(bx - 4)}`);
        callout.text.setAttribute('x', String(r1(bx + 11)));
        callout.text.setAttribute('y', String(r1(mid + 4)));
        callout.text.setAttribute('text-anchor', 'start');
        callout.text.textContent = c.text(g);
      } else {
        // inside the axis the bracket marks the place and the number reads on the header's second line
        callout.bracket.setAttribute('d', `M${r1(px + 4)} ${r1(top)}H${r1(px)}V${r1(bot)}H${r1(px + 4)}`);
        const [tx, ty, anchor] = headCallout ? [width - 2, 36, 'end'] : [px, Math.max(ya, yb) + 18, 'middle'];
        callout.text.setAttribute('x', String(r1(tx)));
        callout.text.setAttribute('y', String(r1(ty)));
        callout.text.setAttribute('text-anchor', anchor);
        callout.text.textContent = c.text(g);
      }
    }
    placeMarker();
  }

  return {
    ms,
    paint,
    setMarker(x) {
      markerX = x;
      placeMarker();
    },
  };
}

/** The finished chart, drawn at once (the old renderLineChart). */
export function renderLineChart(svg, spec, size) {
  const chart = buildLineChart(svg, spec, size);
  chart.paint(Infinity);
  return chart;
}
