// Tiny "multi-armed bandit": mostly pick what has performed best, sometimes explore.
// Arms are things like "bluesky:hot-take" or "category:music".

export function engagementScore(m = {}) {
  return (m.likes || 0) + 2 * (m.reposts || 0) + 3 * (m.replies || 0) + 2 * (m.quotes || 0) + (m.views || 0) / 100;
}

// UCB1 with a minimum exploration rate. arms: { key: { n, total } }
export function pickArm(options, arms = {}, { prefix = "", explore = 0.2, random = Math.random } = {}) {
  if (!options.length) return null;
  if (random() < explore) return options[Math.floor(random() * options.length)];
  const stats = options.map((o) => arms[`${prefix}${o}`] || { n: 0, total: 0 });
  const untried = options.filter((_, i) => stats[i].n === 0);
  if (untried.length) return untried[Math.floor(random() * untried.length)];
  const N = stats.reduce((t, s) => t + s.n, 0);
  let best = options[0];
  let bestScore = -Infinity;
  options.forEach((o, i) => {
    const mean = stats[i].total / stats[i].n;
    const ucb = mean + Math.sqrt((2 * Math.log(N)) / stats[i].n) * Math.max(1, mean);
    if (ucb > bestScore) { bestScore = ucb; best = o; }
  });
  return best;
}

// Multiplier for weighted choices (e.g. sections): 0.6x .. 2x relative to the average arm.
export function boost(key, arms = {}, prefix = "") {
  const all = Object.entries(arms).filter(([k, s]) => k.startsWith(prefix) && s.n >= 2);
  const me = arms[`${prefix}${key}`];
  if (!me || me.n < 2 || all.length < 2) return 1;
  const avg = all.reduce((t, [, s]) => t + s.total / s.n, 0) / all.length;
  if (avg <= 0) return 1;
  return Math.min(2, Math.max(0.6, me.total / me.n / avg));
}
