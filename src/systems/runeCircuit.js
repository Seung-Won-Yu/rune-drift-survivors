import { SHRINE_SITES } from '../config/gameData.js';
import { SHRINE_ACTIVATE_RADIUS } from '../config/gameTuning.js';

const DIRECTION_STEPS = [
  { arrow: '↑', label: '북쪽' },
  { arrow: '↗', label: '북동쪽' },
  { arrow: '→', label: '동쪽' },
  { arrow: '↘', label: '남동쪽' },
  { arrow: '↓', label: '남쪽' },
  { arrow: '↙', label: '남서쪽' },
  { arrow: '←', label: '서쪽' },
  { arrow: '↖', label: '북서쪽' }
];

export function getShrineWorldPosition(site) {
  return {
    x: Math.cos(site.angle) * site.radius,
    z: Math.sin(site.angle) * site.radius
  };
}

export function getNextCircuitSite(activatedShrines = {}) {
  return SHRINE_SITES.find(site => !activatedShrines[site.id]) ?? null;
}

export function getRuneCircuitState(game) {
  const activatedShrines = game?.activatedShrines ?? {};
  const completed = SHRINE_SITES.filter(site => activatedShrines[site.id]).length;
  const nextSite = getNextCircuitSite(activatedShrines);

  if (!nextSite) {
    return {
      completed,
      total: SHRINE_SITES.length,
      complete: true,
      nextSite: null,
      distance: 0,
      direction: null,
      unlockIn: 0,
      ready: true
    };
  }

  const target = getShrineWorldPosition(nextSite);
  const player = game?.playerPos ?? { x: 0, z: 0 };
  const dx = target.x - (player.x ?? 0);
  const dz = target.z - (player.z ?? 0);
  const directionAngle = Math.atan2(dx, -dz);
  const directionIndex = Math.round(directionAngle / (Math.PI / 4));
  const normalizedIndex = (directionIndex + DIRECTION_STEPS.length) % DIRECTION_STEPS.length;
  const unlockIn = Math.max(0, nextSite.unlockAt - (game?.time ?? 0));

  return {
    completed,
    total: SHRINE_SITES.length,
    complete: false,
    nextSite,
    distance: Math.round(Math.hypot(dx, dz)),
    direction: DIRECTION_STEPS[normalizedIndex],
    unlockIn,
    ready: unlockIn <= 0
  };
}

export function getRunCompletionResult(game) {
  return getRuneCircuitState(game).complete ? 'victory' : 'survived';
}

export function getActiveCircuitShrine(shrines = [], time = 0) {
  const nextShrine = shrines.find(shrine => !shrine.activated) ?? null;
  if (!nextShrine) return { shrine: null, ready: false, unlockIn: 0 };
  const unlockIn = Math.max(0, nextShrine.unlockAt - time);
  return {
    shrine: nextShrine,
    ready: unlockIn <= 0,
    unlockIn
  };
}

const CIRCUIT_ENCOUNTER_PROFILES = Object.freeze({
  complete: Object.freeze({ stage: 'complete', targetScale: 1, spawnScale: 1, intervalScale: 1, runnerDelta: 0, bruteDelta: 0, delayThreats: false }),
  route: Object.freeze({ stage: 'route', targetScale: 1, spawnScale: 1.04, intervalScale: 0.96, runnerDelta: 0.04, bruteDelta: -0.02, delayThreats: false }),
  approach: Object.freeze({ stage: 'approach', targetScale: 0.9, spawnScale: 0.82, intervalScale: 1.18, runnerDelta: -0.05, bruteDelta: -0.04, delayThreats: false }),
  channel: Object.freeze({ stage: 'channel', targetScale: 0.74, spawnScale: 0.56, intervalScale: 1.42, runnerDelta: -0.1, bruteDelta: -0.08, delayThreats: true })
});

export function getCircuitEncounterProfile(game, playerPos = game?.playerPos) {
  const nextSite = getNextCircuitSite(game?.activatedShrines);
  if (!nextSite) return CIRCUIT_ENCOUNTER_PROFILES.complete;

  const target = getShrineWorldPosition(nextSite);
  const dx = target.x - (playerPos?.x ?? 0);
  const dz = target.z - (playerPos?.z ?? 0);
  const distance = Math.hypot(dx, dz);
  const ready = (game?.time ?? 0) >= nextSite.unlockAt;

  if (ready && distance <= SHRINE_ACTIVATE_RADIUS + 3.5) {
    return CIRCUIT_ENCOUNTER_PROFILES.channel;
  }
  if (distance <= 22) return CIRCUIT_ENCOUNTER_PROFILES.approach;
  return CIRCUIT_ENCOUNTER_PROFILES.route;
}

const INACTIVE_FINALE = Object.freeze({
  active: false,
  damageMultiplier: 1,
  cooldownMultiplier: 1,
  damageTakenMultiplier: 1,
  bossHealthMultiplier: 1,
  bossDamageMultiplier: 1,
  bossAbilityIntervalMultiplier: 1,
  bossSummonMultiplier: 1,
  bossGuardDurationMultiplier: 1
});

const ACTIVE_FINALE = Object.freeze({
  active: true,
  damageMultiplier: 1.16,
  cooldownMultiplier: 0.92,
  damageTakenMultiplier: 0.86,
  bossHealthMultiplier: 0.88,
  bossDamageMultiplier: 0.86,
  bossAbilityIntervalMultiplier: 1.16,
  bossSummonMultiplier: 0.72,
  bossGuardDurationMultiplier: 0.68
});

export function getCircuitFinaleState(game) {
  return getNextCircuitSite(game?.activatedShrines) ? INACTIVE_FINALE : ACTIVE_FINALE;
}
