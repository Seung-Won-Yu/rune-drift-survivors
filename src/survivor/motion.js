import { GIANT, huntRule } from './enemies.js';
import { SLAM } from './game.js';

// Render poses use simulation time. They never move a collision body or run while paused.
export function heroGait(game, reduced = false) {
  const p = game.player;
  if (reduced || game.swing || p.cast > 0 || p.hurt > 0 || game.outcome === 'defeat') return {};
  if (!p.moving) {
    const breath = Math.sin(game.time * (game.characterId === 'grove' ? 2.1 : 2.8));
    return game.characterId === 'grove' ? { sx: 1 + .006 * breath, sy: 1 - .006 * breath }
      : { y: -Math.max(0, breath) * (game.characterId === 'ember' ? 1 : .6), tilt: breath * .006 };
  }
  const step = Math.cos(p.walk * 7 * Math.PI);
  const weight = game.characterId === 'grove' ? .7 : game.characterId === 'ember' ? 1.2 : 1;
  return { y: -Math.max(0, -step) * 3.5 * weight,
    tilt: Math.sin(p.walk * 7 * Math.PI / 2) * .035 * weight,
    sx: 1 + step * .035 * weight, sy: 1 - step * .045 * weight };
}

export function enemyMotion(enemy, time, reduced = false) {
  if (reduced || enemy.boss) return {};
  if (enemy.hunt) {
    const age = enemy.hunt.age;
    const rule = huntRule(enemy);
    if (age < rule.windup) {
      const tension = Math.min(1, age / rule.windup) ** 2;
      return { sx: 1 + .12 * tension, sy: 1 - .18 * tension, tilt: -.06 * tension };
    }
    if (age < rule.windup + rule.duration) return { sx: 1.2, sy: .86 };
    const settle = Math.max(0, 1 - (age - rule.windup - rule.duration) / rule.recovery);
    return { sy: 1 - .06 * settle };
  }
  if (enemy.slam) {
    const rule = enemy.elite ? SLAM : GIANT;
    if (!enemy.slam.hit) {
      const tension = Math.min(1, enemy.slam.age / rule.windup) ** 2;
      return { sy: 1 + .07 * tension, tilt: -.08 * tension };
    }
    const settle = Math.max(0, 1 - (enemy.slam.age - rule.windup) / rule.recovery) ** 2;
    return { sx: 1 + .1 * settle, sy: 1 - .1 * settle };
  }
  if (enemy.speed <= 0) return {};
  const phase = (time * (enemy.type === 1 ? 9 : 5) + enemy.id) * Math.PI;
  const step = Math.cos(phase);
  const lift = enemy.type === 0 ? 2.5 : enemy.type === 1 ? 1.6 : .8;
  return { y: -Math.max(0, -step) * lift, tilt: Math.sin(phase / 2) * (enemy.type === 2 ? .025 : .035),
    sx: 1 + step * .025, sy: 1 - step * (enemy.type === 2 ? .025 : .045) };
}
