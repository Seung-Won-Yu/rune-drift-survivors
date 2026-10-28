import { GIANT, huntRule } from './enemies.js';
import { SLAM } from './game.js';
import { IMPACT_LIFE } from './impact.js';
import { BOSS } from './boss.js';
import { bladeMotion } from './blade-chain.js';

const step = (progress, count) => Math.max(0, Math.min(count - 1, Math.floor(progress * count)));

// Authored poses follow simulation clocks, including pause and slow. Contact
// poses never precede the damage boundary; drawing never advances a clock.
export function ashFrame(game, reduced = false) {
  const p = game.player;
  if (game.outcome === 'defeat') return reduced ? 23 : 20 + step((p.deathAge ?? 0) / .55, 4);
  if (p.hurt > 0) return reduced ? 16 : 16 + step((.24 - p.hurt) / .24, 4);
  if (game.swing) {
    const {age} = bladeMotion(game.swing);
    if (age < .18) return reduced ? 10 : 8 + step(age / .18, 3);
    // Frames 12–13 overlap and 13 lacks a blade. Hold the intact contact,
    // then recover; neither defective source rectangle enters the game.
    return age < .34 ? 11 : age < .47 ? 14 : 15;
  }
  if (p.cast > 0) return p.cast > .24 ? 11 : p.cast > .12 ? 14 : 15;
  return p.moving && !reduced ? Math.floor(p.walk * 14) % 8 : 0;
}

export function companionFrame(game, reduced = false) {
  if (game.characterId === 'ash') return ashFrame(game, reduced);
  const p = game.player, signature = game.signature;
  if (game.outcome === 'defeat') return reduced ? 23 : 20 + step((p.deathAge ?? 0) / .55, 4);
  if (p.hurt > 0) return reduced ? 16 : 16 + step((.24 - p.hurt) / .24, 4);
  // A complete absorption has no HP-loss clock. Its real block event supplies
  // a distinct reaction, then releases back to walking instead of freezing.
  const blockAge = signature ? game.time - signature.blockedAt : 1;
  if (game.characterId === 'grove' && blockAge >= 0 && blockAge < .3) return reduced ? 12 : 12 + step(blockAge / .3, 4);
  if (game.swing) {
    const {age} = bladeMotion(game.swing);
    return age < .18 ? 11 : reduced ? 8 : 8 + step((age - .18) / .37, 4);
  }
  if (p.cast > 0) {
    const chargedAge = signature ? game.time - signature.activatedAt : 1;
    const base = game.characterId === 'ember' && chargedAge >= 0 && chargedAge < .4 ? 12 : 8;
    // Both fire and rune contact already happened at the start of cast=.4.
    return reduced ? base : base + step((.4 - p.cast) / .4, 4);
  }
  const guardAge = signature ? game.time - signature.activatedAt : 1;
  if (game.characterId === 'grove' && signature?.guard > 0 && guardAge >= 0 && guardAge < .24) return reduced ? 12 : 12 + step(guardAge / .24, 4);
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

export function bossFrame(enemy, time, reduced = false) {
  if (enemy.entrance > 0) return reduced ? 5 : 4 + step(1 - enemy.entrance / BOSS.entrance, 2);
  const pattern = enemy.pattern;
  // Incoming damage cannot disguise the preparation or release of an attack.
  if (pattern) {
    const age = pattern.age;
    if (pattern.kind === 'charge') {
      if (age < BOSS.windup) return reduced ? 7 : 6 + step(age / BOSS.windup, 2);
      if (age < BOSS.windup + BOSS.chargeDuration) return reduced ? 8 : 8 + step((age - BOSS.windup) / BOSS.chargeDuration, 2);
      return reduced ? 11 : 10 + step((age - BOSS.windup - BOSS.chargeDuration) / BOSS.recovery, 2);
    }
    if (!pattern.fired || age < BOSS.windup) return reduced ? 13 : 12 + step(age / BOSS.windup, 2);
    if (age < BOSS.windup + .12) return 14;
    return reduced ? 16 : 15 + step((age - BOSS.windup - .12) / (BOSS.recovery - .12), 2);
  }
  const hitAge = enemy.impact ? time - enemy.impact.at : IMPACT_LIFE;
  if (hitAge >= 0 && hitAge < IMPACT_LIFE) return reduced ? 19 : 19 + step(hitAge / IMPACT_LIFE, 2);
  if (reduced) return enemy.enraged ? 17 : 0;
  const gait = Math.floor((enemy.walk ?? 0) / 11);
  return enemy.enraged ? 17 + gait % 2 : gait % 4;
}

export const bossRemnantFrame = (remnant, reduced = false) => reduced ? 23 : 21 + step(remnant.age / (remnant.life * .75), 3);
