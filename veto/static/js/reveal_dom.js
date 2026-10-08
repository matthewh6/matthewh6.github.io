// Plays each figure once when it scrolls into view, with a Replay button in its caption (spec 2026-10-07 §3).
import { buildLineChart } from './chart.js';

/**
 * A chart drawn at its on-screen width, so 12-13 px labels stay that size, and rebuilt when the width changes; a
 * rebuild keeps showing the moment the figure is at. `aspect` sets height from width.
 */
export function liveChart(svg, spec, { aspect = 0.6, minH = 260, maxH = 360 } = {}) {
  let chart = null;
  let drawn = 0;
  let t = Infinity;
  let marker = spec.marker ?? null;
  const draw = () => {
    const width = Math.round(svg.getBoundingClientRect().width);
    if (!width || width === drawn) return;
    drawn = width;
    chart = buildLineChart(svg, { ...spec, marker }, { width, height: Math.round(Math.min(maxH, Math.max(minH, width * aspect))) });
    chart.paint(t);
  };
  draw();
  new ResizeObserver(draw).observe(svg);
  return {
    el: svg,
    get ms() { return chart ? chart.ms : 0; },
    paint(at) { t = at; chart?.paint(t); },
    setMarker(x) { marker = x; chart?.setMarker(x); },
  };
}

// How many figures are mid-reveal, on the root element, so checks can wait for the page to settle.
let playing = 0;
const setPlaying = (d) => {
  playing += d;
  document.documentElement.dataset.playing = String(playing);
};

/**
 * Show each of `charts` (from liveChart, or any {el, ms, paint(t)}) at the start of its reveal, and play it once its
 * own element comes into view: when its top passes three quarters of the way down the screen. Charts side by side
 * come into view, and play, together; stacked on a phone, each plays as the reader reaches it. Scrolling a chart away
 * mid-reveal shows it finished and stops it, so nothing runs off screen. `replay` (default: the `.replay` button inside
 * `figure`) plays the charts in view again and sets the others to play again when reached. `still` (reduced motion,
 * ?still) shows the finished figure at once and hides Replay; so does printing.
 */
export function playOnView(figure, charts, { still, replay = figure.querySelector('.replay') }) {
  const players = charts.map((chart) => ({ chart, t: still ? Infinity : 0, raf: 0, played: false, inView: false }));
  const paint = (p) => p.chart.paint(p.t);
  function stop(p) {
    if (!p.raf) return;
    cancelAnimationFrame(p.raf);
    p.raf = 0;
    setPlaying(-1);
  }
  function finish(p) {
    stop(p);
    p.t = Infinity;
    paint(p);
  }
  function play(p) {
    stop(p);
    setPlaying(1);
    p.played = true;
    p.t = 0;
    paint(p);
    let t0 = null;
    const frame = (now) => {
      if (t0 === null) t0 = now;
      p.t = now - t0;
      if (p.t >= p.chart.ms) {
        p.raf = 0;
        setPlaying(-1);
        p.t = Infinity;
      } else p.raf = requestAnimationFrame(frame);
      paint(p);
    };
    p.raf = requestAnimationFrame(frame);
  }
  players.forEach(paint);
  if (still) {
    replay?.setAttribute('hidden', '');
    return;
  }
  replay?.addEventListener('click', () => players.forEach((p) => {
    if (p.inView) play(p);
    else {
      stop(p);
      p.played = false;
      p.t = 0;
      paint(p);
    }
  }));
  const io = new IntersectionObserver((entries) => {
    const now = new Map(entries.map((e) => [e.target, e.isIntersecting])); // a chart's last entry is its state
    for (const p of players) {
      if (!now.has(p.chart.el)) continue;
      p.inView = now.get(p.chart.el);
      if (p.inView && !p.played) play(p);
      else if (!p.inView && p.raf) finish(p);
    }
  }, { rootMargin: '0px 0px -25% 0px' });
  players.forEach((p) => io.observe(p.chart.el));
  addEventListener('beforeprint', () => players.forEach(finish));
}
