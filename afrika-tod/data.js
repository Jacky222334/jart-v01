/** UN World Population Prospects 2024 — Afrika gesamt */
export const STATS = {
  year: 2024,
  deathsPerYear: 11_522_895,
  region: 'Afrika',
  source: 'UN World Population Prospects 2024',
  note: 'Schätzung aller registrierten und modellierten Todesfälle',
};

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

export const DEATHS_PER_MS = STATS.deathsPerYear / MS_PER_YEAR;
export const SECONDS_PER_DEATH = 1 / (STATS.deathsPerYear / (365.25 * 24 * 3600));
export const DEATHS_PER_DAY = STATS.deathsPerYear / 365.25;
export const DEATHS_PER_HOUR = DEATHS_PER_DAY / 24;
export const DEATHS_PER_MINUTE = DEATHS_PER_HOUR / 60;

/** Grobe Afrika-Silhouette (0–1), Westen links */
export const AFRICA = [
  [0.42, 0.14], [0.48, 0.11], [0.55, 0.10], [0.62, 0.11], [0.68, 0.14],
  [0.73, 0.18], [0.78, 0.24], [0.82, 0.30], [0.84, 0.36], [0.82, 0.42],
  [0.79, 0.48], [0.76, 0.54], [0.74, 0.60], [0.71, 0.66], [0.67, 0.72],
  [0.62, 0.77], [0.56, 0.81], [0.50, 0.83], [0.44, 0.82], [0.38, 0.78],
  [0.33, 0.72], [0.28, 0.65], [0.24, 0.58], [0.21, 0.50], [0.19, 0.42],
  [0.18, 0.34], [0.20, 0.26], [0.25, 0.20], [0.32, 0.15], [0.38, 0.13],
];

export const NEON = [
  '#ff0044', '#ff00ea', '#00ffff', '#ffee00', '#00ff55', '#aa00ff',
];
