import { HOUND, GIANT } from './enemies.js';
import { SLAM } from './game.js';

// Render poses use simulation time. They never move a collision body or run while paused.
export function heroGait(game, reduced = false) {
  const p = game.player;
  if (reduced || !p.moving || game.swing || p.cast > 0 || p.hurt > 0 || game.outcome === 'defeat') return {};
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
    if (age < HOUND.windup) {
      const tension = Math.min(1, age / HOUND.windup) ** 2;
      return { sx: 1 + .12 * tension, sy: 1 - .18 * tension, tilt: -.06 * tension };
    }
    if (age < HOUND.windup + HOUND.duration) return { sx: 1.2, sy: .86 };
    const settle = Math.max(0, 1 - (age - HOUND.windup - HOUND.duration) / HOUND.recovery);
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
