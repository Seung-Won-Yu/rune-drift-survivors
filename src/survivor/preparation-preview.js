import { stats } from './game.js';
import { keepsakeStats, keepsakeXpMultiplier } from './journey.js';
import { vowStats } from './progression.js';

// Read a ready run without selecting equipment or creating a second run.
export function preparationPreview(game, keepsake = game.keepsake, vow = game.vow) {
  const item = keepsakeStats(keepsake), current = keepsakeStats(game.keepsake);
  const next = stats({...game, keepsake});
  return {
    hp: game.player.maxHp - current.hp + item.hp,
    speed: Math.round(next.speed), magnet: Math.round(next.magnet),
    xp: Math.round((keepsakeXpMultiplier({...game, keepsake, time:0}) - 1 + vowStats(vow).xpBonus) * 100),
    laterXp: Math.round(vowStats(vow).xpBonus * 100), xpSeconds: item.xpSeconds ?? 0
  };
}
export function experiencePreview(game, keepsake = game.keepsake, vow = game.vow) {
  const next = preparationPreview(game, keepsake, vow);
  if (next.xpSeconds) return `첫 ${next.xpSeconds}초 획득 경험치 +${next.xp}%${next.laterXp ? ` · 이후 +${next.laterXp}%` : ''}`;
  return next.xp ? `획득 경험치 +${next.xp}%` : '획득 경험치 기본';
}
export function keepsakeComparison(game, keepsake) {
  const before = preparationPreview(game), after = preparationPreview(game, keepsake);
  return [['hp','체력'],['speed','이동'],['magnet','수집']]
    .filter(([key]) => before[key] !== after[key])
    .map(([key,label]) => ({key,label,before:before[key],after:after[key]}));
}
