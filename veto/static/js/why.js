// The "why VETO" panels (Matthew, 2026-10-08), drawn from lib/why_story.js. Each panel is a {el, ms, paint(t)} that
// playOnView plays like a chart: paint(0) is the empty scene, paint(Infinity) the finished one.
import { SCENE, STORY_MS, frameAt } from './lib/why_story.js';

const NS = 'http://www.w3.org/2000/svg';
function svgEl(name, attrs, parent) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent.appendChild(e);
  return e;
}

function starPath([cx, cy], R = 11, r = 4.6) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }
  return `${d}Z`;
}

// The maze, the traces of finished tries, the try being run, and the marks: a cross where the dead end stops a run,
// and on a vetoed try the proposed dead end (dashed) with the veto sign stamped on it.
function scene(svg) {
  svg.replaceChildren();
  svg.setAttribute('viewBox', SCENE.viewBox);
  const [fx, fy] = SCENE.fork;
  svgEl('path', { class: 'maze', d: SCENE.corridor }, svg);
  svgEl('path', { class: 'maze branch', d: SCENE.branch }, svg);
  svgEl('line', { class: 'wall', x1: fx - 17, x2: fx + 17, y1: SCENE.wall, y2: SCENE.wall }, svg);
  const traces = svgEl('g', { class: 'traces' }, svg);
  const candidate = svgEl('path', { class: 'candidate', d: SCENE.ends.dead, opacity: 0 }, svg);
  const live = svgEl('path', { class: 'live', pathLength: 1, opacity: 0 }, svg);
  const [hx, hy] = SCENE.hit;
  const hit = svgEl('path', { class: 'hit', d: `M-6 -6L6 6M6 -6L-6 6`, transform: `translate(${hx} ${hy}) scale(0)` }, svg);
  const sign = svgEl('g', { class: 'veto-sign', transform: `translate(${SCENE.sign}) scale(0)` }, svg);
  svgEl('circle', { r: 9 }, sign);
  svgEl('path', { d: 'M-6.4 6.4L6.4 -6.4' }, sign);
  svgEl('circle', { class: 'start', cx: SCENE.start[0], cy: SCENE.start[1], r: 6 }, svg);
  svgEl('path', { class: 'goal', d: starPath(SCENE.goal) }, svg);
  return { traces, candidate, live, hit, sign };
}

const r2 = (v) => Math.round(v * 100) / 100;

/** One painter per `.why-panel` under `root`. */
export function whyPanels(root) {
  return [...root.querySelectorAll('.why-panel')].map((panel) => {
    const side = panel.dataset.side;
    const svg = panel.querySelector('svg.why-scene');
    const s = scene(svg);
    const tally = panel.querySelector('.why-tally b');
    const bar = panel.querySelector('.why-meter b');
    let drawn = -1;
    function paint(t) {
      const f = frameAt(side, t);
      if (f.traces.length !== drawn) {
        // a finished try leaves a faint trace; repeats stack up darker
        s.traces.replaceChildren();
        for (const kind of f.traces) {
          svgEl('path', { class: 'trace trunk', d: SCENE.trunk }, s.traces);
          svgEl('path', { class: `trace ${kind === 'dead' ? 'dead' : 'reached'}`, d: SCENE.ends[kind === 'dead' ? 'dead' : 'goal'] }, s.traces);
        }
        drawn = f.traces.length;
      }
      if (f.live && f.live.drawn > 0) {
        s.live.setAttribute('d', SCENE.routes[f.live.kind]);
        s.live.setAttribute('stroke-dasharray', `${r2(f.live.drawn)} 1`);
        s.live.setAttribute('opacity', '1');
      } else s.live.setAttribute('opacity', '0');
      s.candidate.setAttribute('opacity', String(r2(f.candidate)));
      s.hit.setAttribute('transform', `translate(${SCENE.hit}) scale(${r2(f.hit)})`);
      s.sign.setAttribute('transform', `translate(${SCENE.sign}) scale(${r2(f.stamp)})`);
      tally.textContent = String(f.deadTries);
      bar.style.width = `${r2(f.meter * 100)}%`;
    }
    return { el: svg, ms: STORY_MS, paint };
  });
}
