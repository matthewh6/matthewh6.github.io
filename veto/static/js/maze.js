import { STEP_MS, rankingFrame, selectionWeights } from './lib/ranking.js';

const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, parent) {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  parent.appendChild(el);
  return el;
}

function scene(svg, data) {
  const { x, y } = data.maze.recommendedViewBounds;
  svg.setAttribute('viewBox', `${x[0] * 10} ${-y[1] * 10} ${(x[1] - x[0]) * 10} ${(y[1] - y[0]) * 10}`);
  svg.replaceChildren();
  const walls = svgEl('g', { class: 'ranking-walls' }, svg);
  for (const wall of data.maze.wallRectangles) {
    svgEl('rect', { x: wall.x * 10, y: -(wall.y + wall.height) * 10,
      width: wall.width * 10, height: wall.height * 10 }, walls);
  }
  const base = svgEl('g', { class: 'ranking-candidates' }, svg);
  const selected = svgEl('g', { class: 'ranking-selected' }, svg);
  const paths = data.candidates.map(c => {
    const d = c.path.map(([x, y], i) => `${i ? 'L' : 'M'}${x * 10} ${-y * 10}`).join(' ');
    svgEl('path', { d }, base);
    return svgEl('path', { d, opacity: 0 }, selected);
  });
  const [sx, sy] = data.evaluation.start, [gx, gy] = data.evaluation.goal;
  svgEl('circle', { cx: sx * 10, cy: -sy * 10, r: 7, class: 'ranking-start' }, svg);
  const points = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.8 : 9;
    return `${gx * 10 + r * Math.cos(a)},${-gy * 10 + r * Math.sin(a)}`;
  }).join(' ');
  svgEl('polygon', { points, class: 'ranking-goal' }, svg);
  return paths;
}

export function initMaze(root, data, { still = false, reduced = false } = {}) {
  const input = root.querySelector('input[type="range"]');
  const readout = root.querySelector('.ranking-readout');
  const status = root.querySelector('.ranking-status');
  const play = root.querySelector('.ranking-play');
  const replay = root.querySelector('.ranking-replay');
  const panels = [...root.querySelectorAll('[data-verifier]')].map(el => ({
    method: el.dataset.verifier,
    paths: scene(el.querySelector('svg'), data),
  }));
  const end = (data.budgets.length - 1) * STEP_MS;
  let elapsed = 0, raf = 0, last = null, visited = false;
  input.max = String(data.budgets.length - 1);
  function paint() {
    const frame = rankingFrame(data.budgets, elapsed, reduced);
    readout.textContent = frame.label;
    input.value = String(frame.from);
    input.setAttribute('aria-valuetext', `${frame.label} training examples`);
    status.textContent = frame.from === frame.to
      ? `Measured fit ${frame.from + 1} of ${data.budgets.length}`
      : 'Fading between measured fits';
    for (const p of panels) {
      selectionWeights(data, p.method, frame).forEach((w, i) => p.paths[i].setAttribute('opacity', String(w)));
    }
  }
  function pause() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = null;
    play.textContent = 'Play';
    play.setAttribute('aria-label', 'Play the PointMaze ranking animation');
    play.setAttribute('aria-pressed', 'false');
  }
  function tick(now) {
    if (last !== null) elapsed = Math.min(end, elapsed + now - last);
    last = now;
    paint();
    if (elapsed >= end) pause();
    else raf = requestAnimationFrame(tick);
  }
  function start() {
    pause();
    visited = true;
    if (elapsed >= end) elapsed = 0;
    paint();
    play.textContent = 'Pause';
    play.setAttribute('aria-label', 'Pause the PointMaze ranking animation');
    play.setAttribute('aria-pressed', 'true');
    raf = requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => raf ? pause() : start());
  replay.addEventListener('click', () => { elapsed = 0; start(); });
  input.addEventListener('input', () => {
    pause();
    visited = true;
    elapsed = Math.max(0, Math.min(data.budgets.length - 1, Number(input.value))) * STEP_MS;
    paint();
  });
  root.addEventListener('keydown', e => { if (e.key === 'Escape') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) pause();
    else if (!visited && !still && !reduced && !document.hidden) start();
  }).observe(root);
  paint();
  root.classList.add('is-ready');
}
