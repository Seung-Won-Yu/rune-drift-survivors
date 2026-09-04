import { getVisualBudget } from '../hooks/useVisualQuality.js';
import {
  isPoolBelowLimit,
  pushDamageNumber,
  updatePrioritizedTimedPool,
  updateTimedPool
} from './runtimePools.js';

const COMBAT_SIGNAL_PRIORITY = Object.freeze({
  'threat-impact': 5,
  threat: 4,
  objective: 3,
  reward: 2,
  attack: 1
});

export function getCombatSignalPriority(item) {
  return COMBAT_SIGNAL_PRIORITY[item?.signal] ?? COMBAT_SIGNAL_PRIORITY.attack;
}

export function updateVisualFeedbackPools({
  dt,
  visualQuality,
  hitBursts,
  weaponEffects,
  damageNumbers,
  spawnWarnings
}) {
  const budget = getVisualBudget(visualQuality);
  updateTimedPool(hitBursts.current, dt, budget.hitBursts);
  updatePrioritizedTimedPool(
    weaponEffects.current,
    dt,
    budget.weaponEffects,
    getCombatSignalPriority
  );
  updateTimedPool(damageNumbers.current, dt, budget.damageNumbers, number => {
    number.age += dt;
    number.pos.y += dt * 0.9;
  });
  updatePrioritizedTimedPool(
    spawnWarnings.current,
    dt,
    budget.spawnWarnings,
    getCombatSignalPriority
  );
}

export function canAddHitBurstRuntime({ hitBursts, visualQuality, overflow = 8 }) {
  return isPoolBelowLimit(hitBursts.current, getVisualBudget(visualQuality).hitBursts, overflow);
}

export function canAddWeaponEffectRuntime({ weaponEffects, visualQuality, overflow = 6 }) {
  return isPoolBelowLimit(weaponEffects.current, getVisualBudget(visualQuality).weaponEffects, overflow);
}

export function addDamageNumberRuntime({
  pos,
  value,
  color,
  size = 0.56,
  visualQuality,
  runtimeBudget,
  enemies,
  projectiles,
  damageNumbers
}) {
  const budget = getVisualBudget(visualQuality).damageNumbers;
  const loadRatio = (enemies.current.length / Math.max(1, runtimeBudget.maxEnemies))
    + (projectiles.current.length / Math.max(1, runtimeBudget.maxProjectiles));
  pushDamageNumber(damageNumbers.current, {
    pos,
    value,
    color,
    size,
    visualQuality,
    budget,
    loadRatio
  });
}
