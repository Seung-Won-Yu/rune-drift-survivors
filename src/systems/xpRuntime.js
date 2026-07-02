import {
  XP_BASE_MAGNET_RADIUS,
  XP_PICKUP_RADIUS
} from '../config/gameTuning.js';
import { pushXpGem } from './runtimePools.js';

export function addXpGemRuntime({ xpGems, pos, value, runtimeBudget }) {
  pushXpGem(xpGems.current, pos, value, runtimeBudget.maxXpGems);
}

export function updateXpGemsRuntime({
  dt,
  currentGame,
  updateGame,
  levelUp,
  player,
  xpGems,
  runtimeBudget,
  scratch,
  levelUpQueued
}) {
  const playerPos = player.current.pos;
  let gained = 0;
  const gemCount = xpGems.current.length;
  let gemWrite = 0;
  for (const gem of xpGems.current) {
    gem.pulse += dt * 5;
    const distanceSq = gem.pos.distanceToSquared(playerPos);
    const passiveReach = Math.min(18, currentGame.level * 0.38 + currentGame.time * 0.06);
    const crowdReach = gemCount > 170 ? Math.min(10, (gemCount - 170) * 0.04) : 0;
    const magnetDistance = gem.magnetized ? 190 : XP_BASE_MAGNET_RADIUS * currentGame.stats.magnet + passiveReach + crowdReach;
    if (distanceSq < magnetDistance * magnetDistance && distanceSq > 0.000001) {
      const distance = Math.sqrt(distanceSq);
      const pull = scratch.vec.copy(playerPos).sub(gem.pos).setY(0).normalize();
      const pullSpeed = gem.magnetized ? 44 + Math.min(110, distance * 1.35) : 12 + magnetDistance * 1.65;
      gem.pos.addScaledVector(pull, dt * pullSpeed);
    }
    if (distanceSq < XP_PICKUP_RADIUS * XP_PICKUP_RADIUS) {
      gained += gem.value * currentGame.stats.xpGain;
      continue;
    }
    if (gemWrite < runtimeBudget.maxXpGems) {
      xpGems.current[gemWrite] = gem;
      gemWrite += 1;
    }
  }
  xpGems.current.length = gemWrite;

  if (gained <= 0) return;
  updateGame(current => {
    let nextXp = current.xp + gained;
    let nextLevel = current.level;
    let nextXpToNext = current.xpToNext;
    let earnedUpgrades = 0;
    let shouldLevel = false;
    while (nextXp >= nextXpToNext) {
      nextXp -= nextXpToNext;
      nextLevel += 1;
      nextXpToNext = Math.floor(nextXpToNext * 1.16 + 11);
      earnedUpgrades += 1;
      shouldLevel = true;
    }
    if (shouldLevel && !levelUpQueued.current) {
      levelUpQueued.current = true;
      window.setTimeout(levelUp, 0);
    }
    return {
      ...current,
      xp: nextXp,
      level: nextLevel,
      xpToNext: nextXpToNext,
      pendingUpgrades: (current.pendingUpgrades ?? 0) + earnedUpgrades
    };
  });
}
