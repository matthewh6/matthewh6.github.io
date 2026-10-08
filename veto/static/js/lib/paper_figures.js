// Chart specs for the paper's figures, built from static/data/paper_figs.json (spec 2026-10-07 §5). Pure functions.
// Baselines are group 0 and draw first; VETO is group 1 and draws last. Styles follow the paper's figures: colors
// from the site tokens, and every series in a chart differs by dash and marker as well.
import { SERIES } from './figures.js';

export const STYLE = {
  veto: SERIES.veto,
  qtd: SERIES.qtd,
  hreturn: SERIES.hreturn,
  rewardseq: SERIES.rewardseq,
  unguided: { label: 'Unguided', color: 'var(--unguided)', dash: '6 4', marker: 'triangle' },
  qbon: { label: 'Q-BoN', color: 'var(--qbon)', dash: '2 3', marker: 'square' },
  warmup: { label: 'Warmup', color: 'var(--warmup)', dash: '', marker: 'diamond', labeled: false },
  qmc: { label: 'Q-MC', color: 'var(--ink-2)', dash: '1 3', marker: 'diamond' },
  oracle: { label: 'Oracle', color: 'var(--ink-2)', dash: '1 3', marker: 'circle', markers: false },
  // Fig. 7: a VETO variant takes its base algorithm's marker
  veto_dsrl: { label: 'VETO-DSRL', color: 'var(--veto)', dash: '', marker: 'square' },
  veto_tmrl: { label: 'VETO-TMRL', color: 'var(--veto)', dash: '', marker: 'triangle' },
  dsrl: { label: 'DSRL', color: 'var(--dsrl)', dash: '7 3 2 3', marker: 'square' },
  tmrl: { label: 'TMRL', color: 'var(--tmrl)', dash: '6 4', marker: 'triangle' },
  newt: { label: 'Newt', color: 'var(--newt)', dash: '', marker: 'triangleDown' },
  fowm: { label: 'FOWM', color: 'var(--fowm)', dash: '', marker: 'diamond' },
  dyna: { label: 'Dyna', color: 'var(--dyna)', dash: '', marker: 'circle' },
  qbon7: { label: 'Q-BoN', color: 'var(--qbon)', dash: '', marker: 'plus' },
  // Fig. 11a: how many of the 16 candidates are kept
  k1: { label: 'K = 1:', color: 'var(--veto)', dash: '', marker: 'circle' },
  k4: { label: 'K = 4:', color: 'var(--veto-2)', dash: '', marker: 'triangle' },
  k8: { label: 'K = 8:', color: 'var(--veto-3)', dash: '', marker: 'diamond' },
  k16: { label: 'K = 16:', color: 'var(--k16)', dash: '', marker: 'triangleDown' },
  base: { label: 'Base policy:', color: 'var(--ink)', dash: '6 4', marker: 'circle', markers: false },
  // Fig. 11b: where Q-values enter the ranking
  q_ranking: { label: 'Q-ranking', color: 'var(--veto-q)', dash: '', marker: 'plus' },
  r_ranking: { label: 'R-ranking', color: 'var(--veto-r)', dash: '', marker: 'cross' },
};

const PCT = { domain: [0, 1], ticks: [0, 0.25, 0.5, 0.75, 1], tickFormat: 'pct', format: 'pct' };
const steps = (max) => ({ scale: 'linear', domain: [0, max], ticks: [0, max / 2, max], tickFormat: 'k', label: 'Environment steps' });
const points = (xs, s) => xs.map((x, i) => ({ x, y: s.y[i], ...(s.lo ? { lo: s.lo[i], hi: s.hi[i] } : {}) }));
const valueAt = (xs, s, x) => s.y[xs.indexOf(x)];
/** One series from a figure's data: its style, its reveal group, and its points. */
const line = (key, group, xs, data, extra = {}) => ({ key, ...STYLE[key], group, points: points(xs, data), ...extra });
const base = { refLines: [], regions: [], callout: null, marker: null };

/** Fig. 9: one panel per robot; unguided collection draws first, then VETO, then the gap at the last round. */
export function fig9Specs(figs) {
  return figs.fig9.panels.map((p) => {
    const last = p.x[p.x.length - 1];
    const gap = Math.round((p.series.veto.y.at(-1) - p.series.unguided.y.at(-1)) * 100);
    return {
      ...base,
      header: { title: `${p.title} · ${p.policy.replace('π0', 'π₀')}`, unit: 'episodes' },
      x: { scale: 'category', values: p.x, domain: [p.x[0], last], label: 'Episodes' },
      y: { ...PCT, label: `Success rate (${p.trials} trials)` },
      series: [line('unguided', 0, p.x, p.series.unguided), line('veto', 1, p.x, p.series.veto)],
      callout: { x: last, a: 'veto', b: 'unguided', text: (g) => `+${Math.round(g * gap)} pts` },
    };
  });
}

/** Fig. 8: the shared warmup, then unguided collection and Q-BoN, then VETO, each continuing from the warmup. */
export function fig8Spec(figs) {
  const f = figs.fig8;
  const w = f.warmup;
  const start = { x: w.x[1], y: w.y[1], lo: w.lo[1], hi: w.hi[1] };
  const method = (key, group) => ({ ...line(key, group, f.x, f.series[key]), points: [start, ...points(f.x, f.series[key])], markAt: f.x });
  return {
    ...base,
    header: { title: 'LIBERO Spatial-9', unit: 'episodes' },
    x: { scale: 'linear', domain: [0, 400], ticks: [0, 100, 200, 300, 400], label: 'Episodes' },
    y: { ...PCT, label: 'Success rate' },
    regions: [{ x0: 0, x1: w.x[1], label: 'Warmup' }],
    series: [line('warmup', 0, w.x, w), method('unguided', 0), method('qbon', 0), method('veto', 1)],
  };
}

/** Fig. 6: Spearman ρ on three LIBERO tasks; Q-TD and the Q-MC oracle first, then VETO, then VETO's lead at 3k steps. */
export function fig6Specs(figs) {
  const f = figs.fig6;
  return f.panels.map((p) => {
    const lead = valueAt(f.x, p.series.veto, 3000) - valueAt(f.x, p.series.qtd, 3000);
    return {
      ...base,
      header: { title: p.title.replace('LIBERO ', ''), unit: 'steps', format: 'k' },
      x: { ...steps(10000), ticks: [0, 5000, 10000] },
      y: { domain: [-0.5, 1], ticks: [-0.5, 0, 0.5, 1], format: 'fixed2', label: 'Spearman ρ' },
      series: [line('qtd', 0, f.x, p.series.qtd), line('qmc', 0, f.x, p.series.qmc), line('veto', 1, f.x, p.series.veto)],
      labelRoom: 112,
      callout: { x: 3000, a: 'veto', b: 'qtd', text: (g) => `Δρ +${(g * lead).toFixed(2)} at 3k steps` },
    };
  });
}

// Fig. 7: reveal VETO and its base algorithms together so their progress can be compared immediately.
// The paper's figure also has Newt, FOWM, Dyna and Q-BoN.
const F7 = [['dsrl', 0], ['tmrl', 0], ['veto_dsrl', 0], ['veto_tmrl', 0]];
const F7_LABELED = new Set(['veto_dsrl', 'veto_tmrl', 'dsrl', 'tmrl']);

/** Fig. 7: success rate on five tasks; the LIBERO curves are smoothed in the paper, so they mark every 100k steps. */
export function fig7Specs(figs) {
  return figs.fig7.panels.map((p) => {
    const max = p.x[p.x.length - 1];
    const markAt = p.smoothed ? [1, 2, 3, 4, 5].map((i) => (max * i) / 5) : undefined;
    return {
      ...base,
      header: { title: p.title.replace(/^(Robosuite|LIBERO) /, ''), unit: 'steps', format: 'k' },
      x: steps(max),
      y: { ...PCT, label: 'Success rate' },
      series: F7.filter(([k]) => p.series[k]).map(([k, group]) => ({
        ...line(k, group, p.x, p.series[k], markAt ? { markAt } : {}),
        ...STYLE[k === 'qbon' ? 'qbon7' : k],
        labeled: F7_LABELED.has(k),
      })),
      refLines: [{ key: 'base', y: p.base, label: '', color: 'var(--base)' }], // the key row names it
      labelRoom: 116,
      valueRoom: 40, // in one row the panels are too narrow for names; the key row names the lines
    };
  });
}

const TRANSITIONS = { scale: 'symlog', domain: [0, 4096], ticks: [0, 256, 1280, 4096], label: 'Transitions' };
const kAxis = (xs) => ({ scale: 'category', values: xs, domain: [xs[0], xs[xs.length - 1]], label: 'K kept of 16' });
const four = (p, extra = {}) => [['qtd', 0], ['rewardseq', 0], ['hreturn', 0], ['veto', 1]].map(([k, g]) => line(k, g, p.x, p.series[k], extra));
const kCount = (v) => `K = ${Math.round(v)}`;

/** Fig. 15: how well each verifier filters, on PointMaze; VETO draws last in every panel. */
export function fig15Specs(figs) {
  const P = Object.fromEntries(figs.fig15.panels.map((p) => [p.key, p]));
  const { top1, survival, gain, regret } = P;
  const kept256 = valueAt(survival.x, survival.series.veto, 256);
  const share = valueAt(gain.x, gain.series.veto, 4) / gain.oracle[gain.x.indexOf(4)];
  return [
    {
      ...base,
      header: { title: '(a) Top-ranked chunk is the best', unit: 'transitions' },
      x: TRANSITIONS, y: { ...PCT, label: 'Share of states' }, series: four(top1),
      refLines: [{ key: 'uniform', y: top1.ref.y, label: 'Uniform', labelAt: 'end' }],
    },
    {
      ...base,
      header: { title: '(b) Bottom quarter kept in the top 4', unit: 'transitions' },
      x: TRANSITIONS, y: { domain: [0, 0.4], ticks: [0, 0.1, 0.2, 0.3, 0.4], tickFormat: 'pct', format: 'pct1', label: 'Share kept' },
      series: four(survival),
      refLines: [{ key: 'uniform', y: survival.ref.y, label: 'Uniform', labelAt: 'end' }],
      callout: { x: 256, a: 'veto', b: 'uniform', text: (g) => `${(g * kept256 * 100).toFixed(1)}% vs ${Math.round(survival.ref.y * 100)}% uniform at 256` },
    },
    {
      ...base,
      header: { title: '(c) Gain over uniform, 256 transitions', unit: '', format: kCount },
      x: kAxis(gain.x), y: { domain: [-0.2, 1.8], ticks: [0, 0.5, 1, 1.5], format: 'fixed2', label: 'Return gain' },
      // at K = 16 every verifier keeps everything, so every line ends at 0: (a) and (b) carry the names
      series: [line('oracle', 0, gain.x, { y: gain.oracle }, { labeled: false }), ...four(gain, { labeled: false })],
      callout: { x: 4, a: 'veto', b: 'oracle', text: (g) => `${Math.round(g * share * 100)}% of oracle at K = 4` },
    },
    {
      ...base,
      header: { title: '(d) Regret against the true top K', unit: '', format: kCount },
      x: kAxis(regret.x), y: { domain: [-0.1, 1.8], ticks: [0, 0.5, 1, 1.5], format: 'fixed2', label: 'Regret' },
      series: four(regret, { labeled: false }),
    },
  ];
}

/** Fig. 11a: cumulative successes with the base policy frozen; the base policy and K = 16, 1, 8 first, then K = 4. */
export function fig11aSpec(figs) {
  const f = figs.fig11a;
  const markAt = [100, 200, 300, 400, 500, 600];
  return {
    ...base,
    header: { title: 'LIBERO Goal-6, base policy frozen', unit: 'episodes' },
    x: { scale: 'linear', domain: [0, 600], ticks: [0, 200, 400, 600], label: 'Episodes' },
    y: { domain: [0, 120], ticks: [0, 40, 80, 120], format: 'int', label: 'Cumulative successes' },
    series: [['base', 0], ['k16', 0], ['k1', 0], ['k8', 0], ['k4', 1]].map(([k, g]) => line(k, g, f.x, f.series[k], k === 'base' ? {} : { markAt })),
  };
}

/** Fig. 11b: Q-values in the ranking, on three LIBERO tasks; the two Q variants first, then VETO. */
export function fig11bSpecs(figs) {
  const markAt = [1, 2, 3, 4, 5].map((i) => i * 100000);
  return figs.fig11b.panels.map((p) => ({
    ...base,
    header: { title: p.title.replace('LIBERO ', ''), unit: 'steps', format: 'k' },
    x: steps(500000),
    y: { ...PCT, label: 'Success rate' },
    series: [['q_ranking', 0], ['r_ranking', 0], ['veto', 1]].map(([k, g]) => line(k, g, p.x, p.series[k], { markAt })),
    labelRoom: 116,
  }));
}
