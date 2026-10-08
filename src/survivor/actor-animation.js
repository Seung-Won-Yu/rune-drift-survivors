import { GIANT, huntRule } from './enemies.js';
import { SLAM } from './game.js';
import { IMPACT_LIFE } from './impact.js';

const step = (progress, count) => Math.max(0, Math.min(count - 1, Math.floor(progress * count)));

// Authored poses follow simulation clocks, including pause and slow. Contact
// poses never precede the damage boundary; drawing never advances a clock.
export function ashFrame(game, reduced = false) {
  const p = game.player;
  if (game.outcome === 'defeat') return reduced ? 23 : 20 + step((p.deathAge ?? 0) / .55, 4);
  if (p.hurt > 0) return reduced ? 16 : 16 + step((.24 - p.hurt) / .24, 4);
  if (game.swing) {
    const age = game.swing.age;
    if (age < .18) return reduced ? 10 : 8 + step(age / .18, 3);
    // Frames 12–13 overlap and 13 lacks a blade. Hold the intact contact,
    // then recover; neither defective source rectangle enters the game.
    return age < .34 ? 11 : age < .47 ? 14 : 15;
  }
  if (p.cast > 0) return p.cast > .24 ? 11 : p.cast > .12 ? 14 : 15;
  return p.moving && !reduced ? Math.floor(p.walk * 14) % 8 : 0;
}

export function creatureFrame(enemy, time, reduced = false) {
  if (enemy.hunt) {
    const { age } = enemy.hunt, rule = huntRule(enemy);
    if (age < rule.windup) return reduced ? 10 : 8 + step(age / rule.windup, 3);
    if (age < rule.windup + rule.duration) return reduced ? 12 : 11 + step((age - rule.windup) / rule.duration, 2);
    return reduced ? 15 : 13 + step((age - rule.windup - rule.duration) / rule.recovery, 3);
  }
  if (enemy.slam) {
    const rule = enemy.elite ? SLAM : GIANT;
    if (!enemy.slam.hit) return reduced ? 10 : 8 + step(enemy.slam.age / rule.windup, 3);
    return reduced ? 11 : 11 + step((enemy.slam.age - rule.windup) / rule.recovery, 5);
  }
  const age = enemy.impact ? time - enemy.impact.at : IMPACT_LIFE;
  if (age >= 0 && age < IMPACT_LIFE) return reduced ? 16 : 16 + step(age / IMPACT_LIFE, 4);
  return reduced || enemy.speed <= 0 ? 0 : Math.floor((enemy.walk ?? 0) / (enemy.type === 1 ? 6 : 5)) % 8;
}

export const remnantFrame = (remnant, reduced = false) => reduced ? 23 : 20 + step(remnant.age / (remnant.life * .75), 4);
