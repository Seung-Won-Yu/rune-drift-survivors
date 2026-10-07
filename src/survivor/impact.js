// Presentation only: never move collision bodies or delay simulation clocks.
export const IMPACT_LIFE = .18;
export const ELITE_FINISH_LIFE = .48;
export const HURT_FEEDBACK_LIFE = .95;
export const HURT_LABELS = { contact: '접촉', hunt: '사냥개 돌진', spore: '포자', slam: '내려찍기', charge: '군주 돌진', thorns: '가시' };

// Only actual HP loss creates this record. No collision, timing or RNG changes.
export function recordPlayerImpact(game, beforeHp, source, origin) {
  const p = game.player;
  const dx = origin ? origin.x - p.x : 0, dy = origin ? origin.y - p.y : 0;
  return { at: game.time, beforeHp, amount: beforeHp - p.hp, source,
    angle: Math.hypot(dx, dy) > .01 ? Math.atan2(dy, dx) : null };
}

export function hurtFeedback(game, reduced = false) {
  const p = game.player, hit = p.impact;
  const age = hit ? game.time - hit.at : HURT_FEEDBACK_LIFE;
  if (!hit || age < 0 || age >= HURT_FEEDBACK_LIFE) return null;
  const recoil = reduced || game.outcome === 'defeat' ? 0 : Math.max(0, 1 - age / .24) ** 3;
  const strength = Math.min(10, 4 + hit.amount / 4);
  const fade = Math.max(0, 1 - age / .42);
  const loss = Math.max(0, 1 - Math.max(0, age - .2) / .55);
  return {
    ...hit, age, fade,
    label: HURT_LABELS[hit.source] ?? '피격',
    trailHp: reduced ? p.hp : Math.max(p.hp, Math.min(p.maxHp, p.hp + Math.max(0, hit.beforeHp - p.hp) * loss)),
    pose: recoil ? { x: hit.angle === null ? 0 : -Math.cos(hit.angle) * strength * recoil,
      y: hit.angle === null ? 0 : -Math.sin(hit.angle) * strength * .6 * recoil,
      sx: 1 + .1 * recoil, sy: 1 - .12 * recoil } : {}
  };
}

export function isEvolvedWeapon(game, weapon) {
  return !!game.ranks[{ sword: 'dawn', ember: 'comet', orbit: 'lunar' }[weapon]];
}

export function attackPose(game, reduced = false) {
  const p = game.player;
  if (reduced || p.hurt > 0 || game.outcome === 'defeat') return {};
  if (game.swing) {
    const { age, angle } = game.swing;
    const weight = (game.ranks.dawn ? 1.15 : 1) * (game.characterId === 'grove' ? .9 : game.characterId === 'ember' ? .92 : 1);
    if (age < .18) {
      const tension = (age / .18) ** 2;
      return { x: -Math.cos(angle) * 6 * tension, y: -Math.sin(angle) * 4 * tension,
        tilt: -.14 * tension, sx: 1 + .06 * tension, sy: 1 - .07 * tension };
    }
    // Four authored poses: impact at .18, follow-through at .26, settle at .40.
    // This changes the illustration only; the hit and swing clocks stay intact.
    const smooth = t => { const v = Math.max(0, Math.min(1, t)); return v * v * (3 - 2 * v); };
    const contact = age < .26;
    const release = contact ? 1 - .07 * smooth((age - .18) / .08)
      : age < .4 ? .93 - .77 * smooth((age - .26) / .14)
      : .16 * (1 - smooth((age - .4) / .15));
    return { x: Math.cos(angle) * 11 * release * weight, y: Math.sin(angle) * 7 * release * weight,
      tilt: (contact ? .19 : .16) * release, sx: 1 - .05 * release, sy: 1 + .05 * release };
  }
  if (p.cast > 0) {
    // Casting already emits at the start of this clock; animate the release, not a delayed windup.
    const release = (p.cast / .4) ** 2;
    if (game.characterId === 'grove') return { y: 2 * release, tilt: -.035 * release, sx: 1 + .09 * release, sy: 1 - .065 * release };
    if (game.characterId === 'ember') return { x: p.facing * 6 * release, y: -4 * release, tilt: .13 * release, sx: 1 - .025 * release, sy: 1 + .065 * release };
    return { x: p.facing * 4 * release, y: -1.5 * release, tilt: .075 * release, sx: 1 + .02 * release, sy: 1 + .025 * release };
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
