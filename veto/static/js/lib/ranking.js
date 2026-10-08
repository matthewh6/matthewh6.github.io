// Each stop is a saved independent fit. Only the top-four emphasis fades between stops.
export const STEP_MS = 1400;
export const HOLD_MS = 900;

export function rankingFrame(budgets, elapsed, reduced = false) {
  const from = Math.min(budgets.length - 1, Math.floor(Math.max(0, elapsed) / STEP_MS));
  const phase = elapsed - from * STEP_MS;
  const to = !reduced && phase > HOLD_MS ? Math.min(from + 1, budgets.length - 1) : from;
  const linear = from === to ? 0 : Math.min(1, (phase - HOLD_MS) / (STEP_MS - HOLD_MS));
  const mix = linear * linear * (3 - 2 * linear);
  const n = i => budgets[i].trainingExampleBudget.toLocaleString('en-US');
  return { from, to, mix, label: from === to ? n(from) : `${n(from)} → ${n(to)}` };
}

export function selectionWeights(data, method, { from, to, mix }) {
  const a = new Set(data.budgets[from].methods[method].selectedTopFour);
  const b = new Set(data.budgets[to].methods[method].selectedTopFour);
  return data.candidates.map(c => (1 - mix) * Number(a.has(c.id)) + mix * Number(b.has(c.id)));
}
