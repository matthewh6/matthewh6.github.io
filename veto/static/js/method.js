// Method figure (spec 12): one VETO decision step and the two separate updates after it. The same drawing is laid out
// wide for desktops and tall for phones, and plays as a loop the reader can pause or step through.
import { METHOD_STEPS, REWARDS, K, H, ranks, pickedRank, advance, lerp, seg, ease, bell } from './lib/method_steps.js';

const NS = 'http://www.w3.org/2000/svg';
const FRAMES = [0, 1, 2, 3, 4, 5].map((i) => `static/img/method/f${i}.webp`);
const PROGRESS = [0.12, 0.3, 0.46, 0.64, 0.82, 0.94]; // the reward model's reading for each frame
const RANK = ranks(REWARDS);
const GREEN = '#0e7e33';
const INK = '#141414';
const INK2 = '#555555';

// Every coordinate a layout needs. Rows are candidates, columns are latent steps 1..H.
const WIDE = {
  vb: [1000, 392],
  cam: { x: 24, y: 44, w: 126, h: 71 }, camToPol: 'M87 117V169',
  pol: { x: 24, y: 172, w: 126, h: 64 }, polLab: [87, 210],
  wm: { x: 214, y: 24, w: 366, h: 268 }, wmTitle: [232, 54],
  enc: { x: 236, y: 96, w: 64, h: 34 }, encLab: [263, 117], snow: [293, 104, 4.2],
  camToEnc: 'M150 80C196 80 212 113 232 113', encToRail: 'M300 113H325',
  chunk: 'M150 204H325', chunkLab: [155, 196],
  rail: { x: 330, y1: 96, y2: 252 }, zLab: [330, 88, 'middle'],
  row0: 104, rowDY: 20, stepX: [358, 390, 422, 454], barX: 480, unit: 24, eq: 46, tick: 12, vetoX: 592,
  heads: { y: 88, r: 406, R: 480 }, axis: { y: 262, lab: 280 },
  bracket: [584, 592], topLab: [584, 90],
  conn: 'M592 124H662', dot: [670, 124], pickLab: [626, 116, 'middle'], toEnv: 'M677 124H708', pickTok: [[670, 124], [712, 124]],
  env: { x: 712, y: 84, w: 140, h: 79 }, envLab: [712, 188, 'start'],
  rmLab: [872, 64, 'start'], toRM: 'M854 104H898', gauge: { cx: 930, cy: 116, r: 26 }, frameTok: [[845, 104], [883, 104]],
  buf: { cx: 930, cy: 304, rx: 30, ry: 8, h: 42 }, toBuf: 'M930 126V294', bufLab: [930, 378, 'middle'], rTok: [[930, 134], [930, 288]],
  laneWM: 'M898 316H404V297', laneWMLab: { x: 420, y: 308 },
  laneRL: 'M898 338H87V241', laneRLLab: { x: 120, y: 360 },
};
const TALL = {
  vb: [360, 600],
  cam: { x: 224, y: 4, w: 120, h: 68 }, camToPol: 'M222 40H166',
  pol: { x: 44, y: 16, w: 120, h: 48 }, polLab: [104, 46],
  wm: { x: 30, y: 100, w: 326, h: 256 }, wmTitle: [124, 122],
  enc: { x: 272, y: 122, w: 64, h: 28 }, encLab: [299, 140], snow: [329, 129, 3.4],
  camToEnc: 'M284 72V120', encToRail: 'M270 144H108',
  chunk: 'M104 64V131', chunkLab: [112, 88],
  rail: { x: 104, y1: 134, y2: 322 }, zLab: [96, 148, 'end'],
  row0: 180, rowDY: 19, stepX: [124, 148, 172, 196], barX: 214, unit: 18, eq: 34, tick: 11, vetoX: 294,
  heads: { y: 164, r: 160, R: 214 }, axis: { y: 328, lab: 342 },
  bracket: [290, 298], topLab: [282, 164],
  conn: 'M298 199H340V284', dot: [340, 290], pickLab: [328, 294, 'end'], toEnv: 'M340 297V376', pickTok: [[340, 290], [340, 378]],
  env: { x: 230, y: 378, w: 120, h: 68 }, envLab: [290, 466, 'middle'],
  rmLab: [162, 392, 'middle'], toRM: 'M228 412H190', gauge: { cx: 162, cy: 420, r: 20 }, frameTok: [[222, 412], [194, 412]],
  buf: { cx: 162, cy: 490, rx: 26, ry: 7, h: 36 }, toBuf: 'M162 428V478', bufLab: [196, 500, 'start'], rTok: [[162, 436], [162, 474]],
  laneWM: 'M136 506H70V360', laneWMLab: { x: 62, y: 433, rotate: true },
  laneRL: 'M162 534V590H14V40H42', laneRLLab: { x: 24, y: 582 },
};

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
  if (parent) parent.append(n);
  return n;
}
// "WM_φ" sets φ as a subscript.
function label(parent, x, y, cls, str, anchor) {
  const node = el('text', { x, y, class: cls, ...(anchor && anchor !== 'start' ? { 'text-anchor': anchor } : {}) }, parent);
  let shifted = false;
  str.split(/_(\S+?)(?=\s|$)/).forEach((part, i) => {
    if (!part) return;
    const attrs = {};
    if (i % 2) { attrs.dy = 4; attrs['font-size'] = '0.72em'; shifted = true; } else if (shifted) { attrs.dy = -4; shifted = false; }
    el('tspan', attrs, node).textContent = part;
  });
  return node;
}
function ban(parent, x, y, r) {
  const d = r * 0.64;
  return el('path', { class: 'ban', d: `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0M${x - d} ${y + d}l${2 * d} ${-2 * d}` }, parent);
}
// A frozen part carries a small snowflake instead of the word.
function snowflake(parent, cx, cy, r) {
  let d = '';
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k - Math.PI / 2;
    d += `M${cx} ${cy}L${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
    const bx = cx + 0.58 * r * Math.cos(a);
    const by = cy + 0.58 * r * Math.sin(a);
    for (const s of [-1, 1]) {
      const b = a + (s * Math.PI) / 4;
      d += `M${bx.toFixed(2)} ${by.toFixed(2)}L${(bx + 0.38 * r * Math.cos(b)).toFixed(2)} ${(by + 0.38 * r * Math.sin(b)).toFixed(2)}`;
    }
  }
  return el('path', { class: 'snow', d }, parent);
}
// The point a fraction p of the way along a polyline.
function along(pts, p) {
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  let d = p * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const f = lens[i] ? Math.min(1, d / lens[i]) : 0;
      return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)];
    }
    d -= lens[i];
  }
  return pts[pts.length - 1];
}
const show = (node, on) => { node.style.display = on ? '' : 'none'; };
const move = (node, [x, y]) => node.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
const setHref = (img, href) => { if (img.getAttribute('href') !== href) img.setAttribute('href', href); };

function buildFigure(svg, L, uid) {
  svg.setAttribute('viewBox', `0 0 ${L.vb[0]} ${L.vb[1]}`);
  const rowY = (r) => L.row0 + r * L.rowDY;
  const defs = el('defs', {}, svg);
  const arrow = (id, fill) => {
    const m = el('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0 0L10 5L0 10z', fill }, m);
  };
  arrow(`${uid}-arr`, INK);
  arrow(`${uid}-arr-g`, GREEN);
  const A = `url(#${uid}-arr)`;
  const clip = (id, b) => { const c = el('clipPath', { id }, defs); el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 4 }, c); };
  clip(`${uid}-cam`, L.cam);
  clip(`${uid}-env`, L.env);
  const image = (b, clipId, parent) => el('image', { x: b.x, y: b.y, width: b.w, height: b.h, preserveAspectRatio: 'xMidYMid slice', 'clip-path': `url(#${clipId})` }, parent);

  // camera image and policy
  const cam = image(L.cam, `${uid}-cam`, svg);
  const camEdge = el('rect', { class: 'frame', x: L.cam.x, y: L.cam.y, width: L.cam.w, height: L.cam.h, rx: 4 }, svg);
  el('path', { class: 'flow', d: L.camToPol, 'marker-end': A }, svg);
  const pol = el('rect', { class: 'box learner', x: L.pol.x, y: L.pol.y, width: L.pol.w, height: L.pol.h, rx: 6 }, svg);
  label(svg, L.polLab[0], L.polLab[1], 'lab', 'Policy π_RL', 'middle');

  // world model: frozen encoder, the z0 rail, one rollout row per candidate, score bars
  const wm = el('rect', { class: 'box learner', x: L.wm.x, y: L.wm.y, width: L.wm.w, height: L.wm.h, rx: 6 }, svg);
  label(svg, L.wmTitle[0], L.wmTitle[1], 'lab', 'World model WM_φ');
  const enc = el('rect', { class: 'box enc', x: L.enc.x, y: L.enc.y, width: L.enc.w, height: L.enc.h, rx: 3 }, svg);
  label(svg, L.encLab[0], L.encLab[1], 'tiny', 'encoder', 'middle');
  snowflake(svg, ...L.snow);
  el('path', { class: 'flow', d: L.camToEnc, 'marker-end': A }, svg);
  const encArrow = el('path', { class: 'flow', d: L.encToRail, 'marker-end': A }, svg);
  const chunkArrow = el('path', { class: 'flow', d: L.chunk, 'marker-end': A, pathLength: 1, 'stroke-dasharray': 1 }, svg);
  const chunkLab = label(svg, L.chunkLab[0], L.chunkLab[1], 'tiny', 'N chunks');
  const rail = el('line', { class: 'rail', x1: L.rail.x, x2: L.rail.x, y1: L.rail.y1, y2: L.rail.y2 }, svg);
  const zLab = label(svg, L.zLab[0], L.zLab[1], 'tiny', 'z_0', L.zLab[2]);
  const rLab = label(svg, L.heads.r, L.heads.y, 'tiny', 'r̂', 'middle');
  const RLab = label(svg, L.heads.R, L.heads.y, 'tiny', 'R̂');
  const sx = L.stepX;
  el('path', { class: 'axis', d: `M${sx[0]} ${L.axis.y}H${sx[H - 1]}` + sx.map((x) => `M${x} ${L.axis.y - 3}V${L.axis.y + 3}`).join('') }, svg);
  label(svg, sx[0], L.axis.lab, 'tiny', '1', 'middle');
  label(svg, sx[H - 1], L.axis.lab, 'tiny', 'H', 'middle');

  const rows = REWARDS.map((rw, i) => {
    const y = rowY(i);
    const g = el('g', { class: 'mrow' }, svg);
    const start = el('circle', { class: 'zdot', cx: L.rail.x, cy: y, r: 2.4 }, g);
    const chain = el('path', { class: 'chain', d: `M${L.rail.x} ${y}H${sx[H - 1]}`, pathLength: 1, 'stroke-dasharray': 1 }, g);
    const dots = sx.map((x) => el('circle', { class: 'zdot', cx: x, cy: y, r: 2.4 }, g));
    const ticks = sx.map((x) => el('rect', { class: 'tick', x: x - 2.5, y, width: 5, height: 0 }, g));
    let off = 0;
    const segs = rw.map((r) => {
      const w = r * L.unit;
      const x = L.barX + off;
      off += w + 1;
      return { w, x, rect: el('rect', { class: 'seg', x, y: y - 3, width: w, height: 6 }, g) };
    });
    const ghosts = rw.map(() => el('rect', { class: 'tick', width: 5, height: 6 }, g));
    const kept = RANK[i] < K;
    const quarter = kept ? label(g, L.barX + L.eq + 6, y + 4, 'tiny', '1/K') : null;
    const veto = kept ? null : ban(g, L.vetoX, y, 4);
    const box = kept ? el('rect', { class: 'pickbox', x: L.barX - 4, y: y - 7, width: L.eq + 8, height: 14, rx: 2 }, g) : null;
    return { i, y, rank: RANK[i], kept, rw, g, start, chain, dots, ticks, segs, len: off - 1, ghosts, quarter, veto, box };
  });

  // the veto column and the draw
  const k0 = rowY(0) - 6;
  const k1 = rowY(K - 1) + 6;
  const bracket = el('path', { class: 'bracket', d: `M${L.bracket[0]} ${k0}H${L.bracket[1]}V${k1}H${L.bracket[0]}` }, svg);
  const topLab = label(svg, L.topLab[0], L.topLab[1], 'note', 'top K');
  const conn = el('path', { class: 'flow', d: L.conn }, svg);
  const pickLab = label(svg, L.pickLab[0], L.pickLab[1], 'tiny', 'a*', L.pickLab[2]);
  const dot = el('circle', { class: 'sel', cx: L.dot[0], cy: L.dot[1], r: 6 }, svg);
  el('path', { class: 'flow', d: L.toEnv, 'marker-end': A }, svg);

  // the environment, or offline data while pre-training
  const envG = el('g', {}, svg);
  const envA = image(L.env, `${uid}-env`, envG);
  const envB = image(L.env, `${uid}-env`, envG);
  el('rect', { class: 'frame', x: L.env.x, y: L.env.y, width: L.env.w, height: L.env.h, rx: 4 }, envG);
  label(envG, L.envLab[0], L.envLab[1], 'lab', 'environment', L.envLab[2]);
  const demos = el('g', {}, svg);
  const dw = L.env.w - 20;
  const dh = L.env.h - 16;
  [[20, 0, 4], [10, 8, 2], [0, 16, 0]].forEach(([dx, dy, f]) => {
    el('image', { x: L.env.x + dx, y: L.env.y + dy, width: dw, height: dh, preserveAspectRatio: 'xMidYMid slice', href: FRAMES[f] }, demos);
    el('rect', { class: 'frame', x: L.env.x + dx, y: L.env.y + dy, width: dw, height: dh }, demos);
  });
  label(demos, L.envLab[0], L.envLab[1], 'lab', 'offline data', L.envLab[2]);

  // reward model
  label(svg, L.rmLab[0], L.rmLab[1], 'lab', 'reward model', L.rmLab[2]);
  el('path', { class: 'flow', d: L.toRM, 'marker-end': A }, svg);
  const { cx, cy, r: gr } = L.gauge;
  const arc = `M${cx - gr} ${cy}A${gr} ${gr} 0 0 1 ${cx + gr} ${cy}`;
  el('path', { class: 'gauge', d: arc }, svg);
  const gaugeOn = el('path', { class: 'gauge-on', d: arc, pathLength: 1, 'stroke-dasharray': '0 1' }, svg);
  const needle = el('line', { class: 'needle', x1: cx, y1: cy, x2: cx, y2: cy - gr + 4 }, svg);
  el('circle', { cx, cy, r: 3, fill: INK }, svg);

  // replay buffer, drawn as the usual database cylinder
  el('path', { class: 'flow', d: L.toBuf, 'marker-end': A }, svg);
  const B = L.buf;
  const buf = el('g', {}, svg);
  el('path', { class: 'buf', d: `M${B.cx - B.rx} ${B.cy}V${B.cy + B.h}A${B.rx} ${B.ry} 0 0 0 ${B.cx + B.rx} ${B.cy + B.h}V${B.cy}` }, buf);
  el('ellipse', { class: 'buf', cx: B.cx, cy: B.cy, rx: B.rx, ry: B.ry }, buf);
  const third = B.h / 3;
  el('path', { class: 'buf-in', d: `M${B.cx - B.rx} ${B.cy + third}A${B.rx} ${B.ry} 0 0 0 ${B.cx + B.rx} ${B.cy + third}M${B.cx - B.rx} ${B.cy + 2 * third}A${B.rx} ${B.ry} 0 0 0 ${B.cx + B.rx} ${B.cy + 2 * third}` }, buf);
  label(svg, L.bufLab[0], L.bufLab[1], 'lab', 'replay buffer', L.bufLab[2]);

  // the two separate updates from the buffer
  const laneWM = el('path', { class: 'lane-wm', d: L.laneWM, 'marker-end': `url(#${uid}-arr-g)` }, svg);
  const wmLab = label(svg, L.laneWMLab.x, L.laneWMLab.y, 'note', 'supervised regression', L.laneWMLab.rotate ? 'middle' : 'start');
  if (L.laneWMLab.rotate) wmLab.setAttribute('transform', `rotate(-90 ${L.laneWMLab.x} ${L.laneWMLab.y})`);
  const laneRL = el('path', { class: 'lane-rl', d: L.laneRL, 'marker-end': A }, svg);
  const rlLab = label(svg, L.laneRLLab.x, L.laneRLLab.y, 'note', 'off-policy RL');

  // moving tokens
  const pickTok = el('circle', { class: 'tok', r: 5 }, svg);
  const frameTok = el('rect', { class: 'tok-frame', x: -7, y: -4.5, width: 14, height: 9, rx: 1.5 }, svg);
  const rTok = el('g', {}, svg);
  el('circle', { class: 'tok-r', r: 9 }, rTok);
  el('text', { class: 'tok-rt', 'text-anchor': 'middle', y: 4 }, rTok).textContent = 'r';

  const stepAt = (h) => 0.08 + h * 0.09; // when latent step h + 1 appears
  const flyAt = (h) => 0.5 + h * 0.08; // when reward h + 1 joins the score bar

  function render(s, t, loop) {
    const at = (k) => (s > k ? 1 : s === k ? t : 0);
    const pre = at(0);
    const prop = at(1);
    const imag = at(2);
    const vet = at(3);
    const act = at(4);
    const looping = s >= 1;
    const cur = loop % FRAMES.length;
    const nxt = (loop + 1) % FRAMES.length;
    const chosen = pickedRank(loop);

    // propose: N chunks arrive, one row each
    setHref(cam, FRAMES[looping ? cur : 0]);
    cam.style.opacity = looping ? 1 : 0.45;
    const camPulse = s === 1 ? bell(seg(t, 0, 0.5)) : 0;
    camEdge.style.stroke = camPulse > 0.05 ? GREEN : INK2;
    camEdge.style.strokeWidth = 1 + 1.6 * camPulse;
    const arrive = ease(seg(prop, 0.1, 0.6));
    chunkArrow.style.strokeDashoffset = 1 - arrive;
    chunkArrow.style.opacity = looping ? 1 : 0.25;
    chunkLab.style.opacity = looping ? 0.35 + 0.65 * arrive : 0.35;
    rail.style.opacity = looping ? 0.25 + 0.75 * seg(prop, 0.5, 0.8) : 0.25;

    // imagine: z0 enters, every row steps its latent state forward and predicts a reward per step, then sums them
    const encPulse = s === 2 ? bell(seg(t, 0, 0.16)) : 0;
    enc.style.stroke = encPulse > 0.05 ? GREEN : INK2;
    enc.style.strokeWidth = 1 + 1.2 * encPulse;
    const zIn = looping ? 0.3 + 0.7 * seg(imag, 0, 0.08) : 0.3;
    encArrow.style.opacity = zIn;
    zLab.style.opacity = zIn;
    rLab.style.opacity = looping ? 0.3 + 0.7 * seg(imag, stepAt(0), stepAt(0) + 0.08) : 0.3;
    RLab.style.opacity = looping ? 0.3 + 0.7 * seg(imag, flyAt(0), flyAt(0) + 0.1) : 0.3;
    const sorting = ease(seg(vet, 0, 0.35));
    const ranked = vet >= 0.42;
    const equal = ease(seg(vet, 0.58, 0.74));
    const pick = looping ? ease(seg(vet, 0.78, 0.9)) : 0;
    for (const row of rows) {
      const { y, rank, kept, rw, g, start, chain, dots, ticks, segs, len, ghosts, quarter, veto, box } = row;
      g.setAttribute('transform', `translate(0 ${((rowY(rank) - y) * sorting).toFixed(1)})`);
      start.style.opacity = looping ? seg(prop, 0.5 + row.i * 0.03, 0.62 + row.i * 0.03) : 0;
      chain.style.strokeDashoffset = 1 - (looping ? ease(seg(imag, 0.05, stepAt(H - 1))) : 0);
      chain.style.opacity = looping ? (vet > 0 ? lerp(0.6, kept ? 0.45 : 0.18, seg(vet, 0.4, 0.56)) : 0.6) : 0;
      const faded = ranked && !kept;
      dots.forEach((d, h) => { d.style.opacity = looping && imag >= stepAt(h) ? (faded ? 0.3 : 1) : 0; });
      ticks.forEach((tk, h) => {
        const grow = looping ? ease(seg(imag, stepAt(h) + 0.01, stepAt(h) + 0.07)) : 0;
        const ht = L.tick * rw[h] * grow;
        tk.setAttribute('height', ht.toFixed(2));
        tk.setAttribute('y', (y - 4 - ht).toFixed(2));
        tk.style.opacity = faded ? 0.3 : 1;
      });
      // the kept bars even out to the same length: each has a 1/K chance
      const f = kept ? lerp(1, L.eq / len, equal) : 1;
      segs.forEach((sg, h) => {
        sg.rect.setAttribute('x', (L.barX + (sg.x - L.barX) * f).toFixed(2));
        sg.rect.setAttribute('width', (sg.w * f).toFixed(2));
        sg.rect.setAttribute('class', ranked ? (kept ? 'seg kept' : 'seg vetoed') : 'seg');
        show(sg.rect, looping && imag >= flyAt(h) + 0.12);
        sg.rect.style.opacity = kept && rank !== chosen ? 1 - 0.5 * pick : 1;
        // the flying copy of this step's reward
        const p = s === 2 ? seg(t, flyAt(h), flyAt(h) + 0.12) : 0;
        const gh = ghosts[h];
        show(gh, p > 0 && p < 1);
        if (p > 0 && p < 1) {
          const e = ease(p);
          gh.setAttribute('x', lerp(sx[h] - 2.5, sg.x, e).toFixed(2));
          gh.setAttribute('y', lerp(y - 4 - L.tick * rw[h], y - 3, e).toFixed(2));
          gh.setAttribute('width', lerp(5, sg.w, e).toFixed(2));
          gh.setAttribute('height', lerp(L.tick * rw[h], 6, e).toFixed(2));
        }
      });
      if (quarter) { show(quarter, looping && equal > 0); quarter.style.opacity = equal; }
      if (veto) { show(veto, looping && vet >= 0.42); veto.style.opacity = seg(vet, 0.42, 0.56); }
      if (box) { show(box, rank === chosen && pick > 0); box.style.opacity = pick; }
    }

    // the veto column
    const top = looping ? seg(vet, 0.38, 0.5) : 0;
    bracket.style.opacity = top;
    topLab.style.opacity = top;
    const drawn = looping ? seg(vet, 0.88, 1) : 0;
    conn.style.opacity = drawn;
    pickLab.style.opacity = drawn;
    dot.style.opacity = 0.25 + 0.75 * drawn;

    // act: run a*, label what happened, store it
    show(envG, looping);
    show(demos, !looping);
    setHref(envA, FRAMES[cur]);
    setHref(envB, FRAMES[nxt]);
    envB.style.opacity = s >= 4 ? ease(seg(act, 0.18, 0.55)) : 0;
    const pP = seg(act, 0, 0.22);
    show(pickTok, s === 4 && pP < 1);
    move(pickTok, along(L.pickTok, ease(pP)));
    const fP = s === 0 ? seg(pre, 0.08, 0.3) : seg(act, 0.5, 0.68);
    show(frameTok, (s === 0 || s === 4) && fP > 0 && fP < 1);
    move(frameTok, along(L.frameTok, ease(fP)));
    const rP = s === 0 ? seg(pre, 0.36, 0.56) : seg(act, 0.78, 0.97);
    show(rTok, (s === 0 || s === 4) && rP > 0 && rP < 1);
    move(rTok, along(L.rTok, ease(rP)));
    const gv = looping ? lerp(PROGRESS[cur], PROGRESS[nxt], ease(seg(act, 0.62, 0.8))) : 0.7 * ease(seg(pre, 0.24, 0.4));
    gaugeOn.setAttribute('stroke-dasharray', `${gv.toFixed(3)} 1`);
    const ang = Math.PI * (1 - gv);
    needle.setAttribute('x2', (cx + (gr - 4) * Math.cos(ang)).toFixed(1));
    needle.setAttribute('y2', (cy - (gr - 4) * Math.sin(ang)).toFixed(1));
    const bufPulse = s === 4 ? bell(seg(t, 0.92, 1)) : s === 0 ? bell(seg(t, 0.52, 0.66)) : 0;
    buf.style.filter = bufPulse > 0.05 ? `drop-shadow(0 0 ${(3 * bufPulse).toFixed(1)}px ${GREEN})` : 'none';

    // learn: two lanes from one buffer
    const wmFlow = s === 5 ? t : s === 0 ? seg(t, 0.55, 1) : 0;
    const wmOn = s === 5 ? bell(t) : s === 0 ? bell(seg(t, 0.55, 1)) : 0;
    laneWM.style.strokeWidth = 1.6 + 1.2 * wmOn;
    laneWM.style.strokeDashoffset = -wmFlow * 52;
    wmLab.style.fill = wmOn > 0.3 ? GREEN : INK2;
    const rlOn = s === 5 ? bell(seg(t, 0.1, 1)) : 0;
    laneRL.style.strokeWidth = 1.6 + 1.2 * rlOn;
    laneRL.style.strokeDashoffset = -(s === 5 ? t : 0) * 42;
    rlLab.style.fill = rlOn > 0.3 ? INK : INK2;
    const wmPulse = s === 5 ? bell(seg(t, 0.45, 0.8)) : s === 0 ? bell(seg(t, 0.75, 1)) : 0;
    wm.style.stroke = wmPulse > 0.05 ? GREEN : INK;
    wm.style.strokeWidth = 1.2 + 1.8 * wmPulse;
    pol.style.strokeWidth = 1.2 + 1.8 * (s === 5 ? bell(seg(t, 0.55, 0.9)) : 0);
  }
  return { render };
}

export function initMethod(section, { still = false, reduced = false } = {}) {
  const figs = [...section.querySelectorAll('svg.mfig')].map((svg, i) =>
    buildFigure(svg, svg.classList.contains('mfig-tall') ? TALL : WIDE, `mfig${i}`));
  const track = section.querySelector('.method-steps');
  const cap = section.querySelector('.method-caption');
  const fixed = still || reduced;
  let state = { step: 0, t: 0, loop: 0 };
  let playing = !fixed;
  let visible = false;
  let started = false;
  let last = 0;
  let raf = 0;

  const buttons = METHOD_STEPS.map((st, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'method-step';
    b.innerHTML = `<span class="num">${i + 1}</span> ${st.name}<span class="prog"><i></i></span>`;
    b.addEventListener('click', () => {
      state = { step: i, t: playing ? 0 : 1, loop: state.loop };
      started = true;
      last = 0;
      draw();
      kick();
    });
    track.append(b);
    return b;
  });
  const pause = document.createElement('button');
  pause.type = 'button';
  pause.className = 'method-pause';
  track.append(pause);
  const pauseText = () => {
    pause.textContent = playing ? 'Pause' : 'Play';
    pause.setAttribute('aria-pressed', playing ? 'false' : 'true');
  };
  pause.addEventListener('click', () => {
    playing = !playing;
    if (playing && state.t >= 1) state = advance(state, METHOD_STEPS[state.step].ms);
    started = true;
    last = 0;
    pauseText();
    kick();
  });
  pauseText();

  function draw() {
    figs.forEach((f) => f.render(state.step, state.t, state.loop));
    buttons.forEach((b, i) => {
      if (i === state.step) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      b.querySelector('i').style.width = `${(i < state.step ? 1 : i === state.step ? state.t : 0) * 100}%`;
    });
    cap.innerHTML = METHOD_STEPS[state.step].caption;
  }
  function frame(now) {
    raf = 0;
    if (!playing || !visible || document.hidden) { last = 0; return; }
    if (last) state = advance(state, now - last);
    last = now;
    draw();
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (playing && visible && !document.hidden && !raf) raf = requestAnimationFrame(frame); }

  // At rest the figure shows the whole step at once; it plays from the start the first time it comes into view.
  figs.forEach((f) => f.render(5, 1, 0));
  cap.textContent = fixed
    ? 'One decision step, then two separate updates. Pick a step to see it.'
    : 'One decision step, then two separate updates. It plays when it scrolls into view.';
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !started && playing) { started = true; state = { step: 0, t: 0, loop: 0 }; draw(); }
    kick();
  }, { threshold: 0.35 }).observe(section.querySelector('.method-anim'));
  document.addEventListener('visibilitychange', () => { last = 0; kick(); });
}
