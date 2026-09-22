// Presentation only: never move collision bodies or delay simulation clocks.
export const IMPACT_LIFE = .18;

export function impactPose(enemy, time, reduced = false) {
  const impact = enemy.impact;
  if (reduced || !impact || enemy.hunt || enemy.slam || enemy.boss) return {};
  const age = time - impact.at;
  if (age < 0 || age >= IMPACT_LIFE) return {};
  // Hold the compressed pose briefly, then release with a fast ease-out.
  const kick = (1 - Math.max(0, age - .035) / (IMPACT_LIFE - .035)) ** 3;
  const weight = enemy.elite ? .55 : 1;
  return {
    x: Math.cos(impact.angle) * 5 * kick * weight,
    y: (Math.sin(impact.angle) * 3 - 2) * kick * weight,
    sx: 1 + .16 * kick * weight,
    sy: 1 - .18 * kick * weight
  };
}
