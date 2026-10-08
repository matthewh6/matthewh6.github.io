// The method animation's script: its steps, the candidates it draws, and the timing helpers it plays them with.
// Kept free of the DOM so the logic can be tested on its own.

export const METHOD_STEPS = [
  { name: 'Pre-train', ms: 3400, caption: 'Optionally, before RL, a reward model labels offline data and the world model WM<sub>φ</sub> learns from it.' },
  { name: 'Propose', ms: 2600, caption: 'The policy π<sub>RL</sub> samples N candidate action chunks for the current image.' },
  { name: 'Imagine', ms: 4600, caption: 'WM<sub>φ</sub> rolls each chunk forward H steps in latent space and sums the predicted rewards into its score R̂, with no critic involved.' },
  { name: 'Veto', ms: 4000, caption: 'The top K by R̂ survive, the rest are vetoed, and a* is drawn uniformly from the K survivors.' },
  { name: 'Act', ms: 3600, caption: 'a* runs in the environment, a reward model labels the result, and the real transitions go into the replay buffer.' },
  { name: 'Learn', ms: 3400, caption: 'WM<sub>φ</sub> and π<sub>RL</sub> then update separately from the buffer, by supervised regression and by off-policy RL.' },
];

// Eight drawn candidates stand for N, three kept stand for K; one row of predicted rewards per candidate, one value
// per latent step. Schematic values, chosen so the rows are not already in score order.
export const REWARDS = [
  [0.30, 0.45, 0.50, 0.60],
  [0.10, 0.15, 0.10, 0.05],
  [0.55, 0.70, 0.80, 0.85],
  [0.20, 0.30, 0.25, 0.35],
  [0.45, 0.60, 0.70, 0.75],
  [0.05, 0.10, 0.05, 0.10],
  [0.35, 0.50, 0.65, 0.70],
  [0.15, 0.20, 0.35, 0.30],
];
export const K = 3;
export const H = 4;
// The rank drawn on each loop: a cycle through the top K, so every survivor gets its turn.
export const PICKS = [1, 0, 2];

export const totals = (rewards) => rewards.map((row) => row.reduce((a, b) => a + b, 0));

export function ranks(rewards) {
  const score = totals(rewards);
  return score.map((v, i) => score.filter((u, j) => u > v || (u === v && j < i)).length);
}

export const pickedRank = (loop) => PICKS[loop % PICKS.length];

// Pre-training plays once; after Learn the animation returns to Propose for the next decision step.
export function advance({ step, t, loop }, dt) {
  const next = t + dt / METHOD_STEPS[step].ms;
  if (next < 1) return { step, t: next, loop };
  if (step + 1 < METHOD_STEPS.length) return { step: step + 1, t: 0, loop };
  return { step: 1, t: 0, loop: loop + 1 };
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const bell = (t) => Math.sin(Math.PI * clamp(t));
