// Chart specs for the in-page figures, built from static/data/toy_curves.json. Pure functions.

export const SERIES = {
  veto:      { label: 'VETO',       color: 'var(--veto)', dash: '',        marker: 'circle' },
  qtd:       { label: 'Q-TD',       color: 'var(--qtd)',  dash: '6 4',     marker: 'square' },
  hreturn:   { label: 'H-return',   color: 'var(--hret)', dash: '2 3',     marker: 'diamond' },
  rewardseq: { label: 'Reward-seq', color: 'var(--rseq)', dash: '9 3 2 3', marker: 'triangle' },
};

const X_AXIS = { domain: [0, 4096], ticks: [0, 256, 1280, 4096], scale: 'symlog', label: 'Transitions' };
const RHO_AXIS = { domain: [-0.4, 1], ticks: [0, 0.5, 1], label: 'Spearman ρ', format: 'fixed2' };
const GAIN_AXIS = { domain: [-0.4, 1.6], ticks: [0, 0.5, 1, 1.5], label: 'Return gain over uniform', format: 'fixed2' };

/** Every budget with a saved result for any method, ascending. */
export function budgets(curves) {
  return [...new Set(Object.values(curves.methods).flatMap((m) => m.points.map((p) => p.x)))].sort((a, b) => a - b);
}

/** One series of mean ± SD points for `metric` ('rho' or 'gain'), or null when the method is absent. `runs`
 *  splits the points where the series skips a budget another method has a result for, so the chart never draws a
 *  line across budgets this method was not measured at. */
export function series(curves, key, metric) {
  const m = curves.methods[key];
  if (!m) return null;
  const points = m.points
    .filter((p) => p[metric])
    .map((p) => ({ x: p.x, y: p[metric].mean, lo: p[metric].mean - p[metric].sd, hi: p[metric].mean + p[metric].sd }))
    .sort((a, b) => a.x - b.x);
  const grid = budgets(curves);
  const runs = [];
  points.forEach((p, i) => {
    if (i && grid.indexOf(p.x) === grid.indexOf(points[i - 1].x) + 1) runs[runs.length - 1].push(p);
    else runs.push([p]);
  });
  return { key, ...SERIES[key], points, runs };
}

/** Baselines draw first and VETO last (spec 2026-10-07 §3): VETO is group 1, every other method group 0. */
const staged = (s) => ({ ...s, group: s.key === 'veto' ? 1 : 0 });
const pick = (curves, keys, metric) => keys.map((k) => series(curves, k, metric)).filter(Boolean).map(staged);
const oracleLine = (curves) => ({ key: 'oracle', y: curves.oracle_gain, label: 'Oracle top 4' });

export function gainSpec(curves) {
  return { x: X_AXIS, y: GAIN_AXIS, series: pick(curves, ['veto', 'qtd'], 'gain'), refLines: [oracleLine(curves)], marker: null };
}

export function rhoSpec(curves) {
  return { x: X_AXIS, y: RHO_AXIS, series: pick(curves, ['veto', 'qtd', 'hreturn'], 'rho'), refLines: [], marker: 0 };
}

export function ablationRhoSpec(curves) {
  return { x: X_AXIS, y: RHO_AXIS, series: pick(curves, ['veto', 'hreturn', 'rewardseq', 'qtd'], 'rho'), refLines: [], marker: null };
}

export function ablationGainSpec(curves) {
  return { x: X_AXIS, y: GAIN_AXIS, series: pick(curves, ['veto', 'hreturn', 'rewardseq', 'qtd'], 'gain'), refLines: [oracleLine(curves)], marker: null };
}
