// Presentation only: never move collision bodies or delay simulation clocks.
export const IMPACT_LIFE = .18;
export const ELITE_FINISH_LIFE = .48;

export function isEvolvedWeapon(game, weapon) {
  return !!game.ranks[{ sword: 'dawn', ember: 'comet', orbit: 'lunar' }[weapon]];
}

export function attackPose(game, reduced = false) {
  const p = game.player;
  if (reduced || p.hurt > 0 || game.outcome === 'defeat') return {};
  if (game.swing) {
    const { age, angle } = game.swing;
    const weight = game.ranks.dawn ? 1.15 : 1;
    if (age < .18) {
      const tension = (age / .18) ** 2;
      return { x: -Math.cos(angle) * 6 * tension, y: -Math.sin(angle) * 4 * tension,
        tilt: -.14 * tension, sx: 1 + .06 * tension, sy: 1 - .07 * tension };
    }
    // Snap at the existing damage frame, briefly hold, then ease back to neutral.
    const release = Math.max(0, 1 - Math.max(0, age - .23) / .32) ** 2;
    return { x: Math.cos(angle) * 11 * release * weight, y: Math.sin(angle) * 7 * release * weight,
      tilt: .18 * release, sx: 1 - .05 * release, sy: 1 + .05 * release };
  }
  if (p.cast > 0) {
    // Casting already emits at the start of this clock; animate the release, not a delayed windup.
    const release = (p.cast / .4) ** 2;
    return game.characterId === 'grove'
      ? { y: 2 * release, sx: 1 + .07 * release, sy: 1 - .05 * release }
      : { x: p.facing * 5 * release, y: -3 * release, tilt: .1 * release, sy: 1 + .05 * release };
  }
  return {};
}

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
