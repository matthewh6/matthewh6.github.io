// Entry point: start the hero video at once, start every other feature side by side, record failures, and mark
// the page ready when all have settled. Nothing waits on a request it does not need.
import { startHeroVideo, initHero } from './hero.js';
import { initMedia } from './media.js';
import { initToc } from './toc.js';
import { initMaze } from './maze.js';
import { liveChart, playOnView } from './reveal_dom.js';
import { initMethod } from './method.js';
import { initCite } from './cite.js';
import { whyPanels } from './why.js';
import { validateHeroSteps } from './lib/steps.js';
import { gainSpec } from './lib/figures.js';
import * as paper from './lib/paper_figures.js';

const root = document.documentElement;
const errors = [];
const params = new URLSearchParams(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stepParam = params.get('step');
const still = reduced || params.has('still') || stepParam !== null;
const hero = document.getElementById('hero');

async function guard(name, fn, onFail) {
  try {
    await fn();
  } catch (e) {
    errors.push(`${name}: ${e.message}`);
    console.error(name, e);
    onFail?.(e);
  }
}

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} returned ${r.status}`);
  return r.json();
}

// KaTeX is fetched only by the equations, so a slow CDN holds up nothing else.
const KATEX = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/';
function load(tag, attrs) {
  return new Promise((resolve, reject) => {
    const el = Object.assign(document.createElement(tag), attrs, { crossOrigin: 'anonymous' });
    el.onload = resolve;
    el.onerror = () => reject(new Error(`${attrs.src || attrs.href} did not load`));
    document.head.append(el);
  });
}
const loadKatex = () => Promise.all([
  load('link', { rel: 'stylesheet', href: `${KATEX}katex.min.css`, integrity: 'sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+' }),
  load('script', { src: `${KATEX}katex.min.js`, integrity: 'sha384-7zkQWkzuo3B5mTepMUcHkMB5jZaolc2xDwL6VFqjFALcbeS9Ggm/Yr2r3Dy4lfFg' }),
]);

// Display equations take their one-line form, or their stacked form where one line would need sideways
// scrolling; they refit when their width changes and once the math fonts have loaded.
function renderEquation(el) {
  let width = 0;
  const fit = () => {
    if (el.clientWidth === width) return;
    width = el.clientWidth;
    window.katex.render(el.dataset.tex, el, { displayMode: true, throwOnError: false });
    if (el.dataset.texStacked && el.scrollWidth > el.clientWidth + 1) {
      window.katex.render(el.dataset.texStacked, el, { displayMode: true, throwOnError: false });
    }
  };
  fit();
  new ResizeObserver(fit).observe(el);
  document.fonts.ready.then(() => { width = 0; fit(); });
}

// The video plays before any data arrives; the decision overlay joins it when hero_steps.json does.
let playback = null;
await guard('video', () => {
  playback = startHeroVideo(hero, { still, noAutoplay: params.has('noautoplay') });
});

await Promise.all([
  guard('media', () => initMedia(document, { still })),
  guard('hero', async () => {
    const data = await getJSON(params.get('heroData') || 'static/data/hero_steps.json');
    const problems = validateHeroSteps(data);
    if (problems.length) throw new Error(problems.join('; '));
    if (!playback) throw new Error('the hero video did not start');
    initHero(hero, data, playback, { stepIndex: Number(stepParam) || 0 });
  }, () => hero.classList.add('no-overlay')),
  guard('charts', async () => {
    const curves = await getJSON(params.get('toyData') || 'static/data/toy_curves.json');
    const gain = document.getElementById('chart-gain');
    playOnView(gain.closest('figure'), [liveChart(gain, gainSpec(curves))], { still });
  }, () => document.body.classList.add('charts-failed')),
  guard('paper figures', async () => {
    const figs = await getJSON(params.get('figData') || 'static/data/paper_figs.json');
    // each chart plays as it comes into view; small multiples are drawn shorter than single charts
    const mount = (id, specs, size) => {
      const fig = document.getElementById(id);
      const svgs = fig.querySelectorAll('svg.chart');
      playOnView(fig, specs.map((spec, i) => liveChart(svgs[i], spec, size)), { still });
    };
    mount('fig-9', paper.fig9Specs(figs), { aspect: 0.62, minH: 250, maxH: 330 });
    mount('fig-7', paper.fig7Specs(figs), { aspect: 0.8, minH: 240, maxH: 300 });
  }, () => document.body.classList.add('figs-failed')),
  guard('why', () => {
    const fig = document.querySelector('#why .why');
    playOnView(fig, whyPanels(fig), { still });
  }, () => document.body.classList.add('why-failed')),
  guard('method', () => initMethod(document.getElementById('method'), { still, reduced })),
  guard('rankings', async () => {
    const data = await getJSON('static/data/pointmaze/ranking.json');
    initMaze(document.getElementById('maze'), data, { still, reduced });
  }),
  guard('nav', () => initToc(document.querySelector('.toc'))),
  guard('math', async () => {
    if (!document.querySelector('[data-tex]')) return;
    await loadKatex();
    document.querySelectorAll('[data-tex]').forEach(renderEquation);
  }, () => document.querySelectorAll('[data-tex]').forEach((el) => {
    el.textContent = el.dataset.fallback;
    el.classList.add('eq-fallback');
  })),
  guard('cite', () => initCite(document.getElementById('copy-bib'), document.getElementById('bibtex'))),
]);

if (errors.length) root.dataset.errors = errors.join(' | ');
root.dataset.ready = '1';
