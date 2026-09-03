import { DAMAGE_SOURCE_META, RUN_PHASES } from '../../config/gameData.js';
import { DASH_COOLDOWN, STARTING_XP_TO_NEXT } from '../../config/gameTuning.js';

const REPLAY_ROUTE_META = Object.freeze({
  orb: '룬 구체',
  storm: '폭풍 낙인',
  blade: '궤도 칼날',
  chain: '연쇄 번개',
  nova: '태양 파동'
});

export function createEmptyItemPickups() {
  return { magnet: 0, purge: 0, heal: 0, overload: 0, cache: 0 };
}

export function getItemPickupCount(game, type) {
  return game?.itemPickups?.[type] ?? 0;
}

export function withItemPickup(game, type) {
  const itemPickups = { ...createEmptyItemPickups(), ...(game.itemPickups ?? {}) };
  itemPickups[type] = (itemPickups[type] ?? 0) + 1;
  return { ...game, itemPickups };
}

export function withShrineActivation(game, shrineId) {
  if (game.activatedShrines?.[shrineId]) return game;
  return {
    ...game,
    shrineActivations: (game.shrineActivations ?? 0) + 1,
    activatedShrines: {
      ...(game.activatedShrines ?? {}),
      [shrineId]: true
    }
  };
}

export function createEmptyRunStats() {
  const createDamageBySource = () => (
    Object.fromEntries(Object.keys(DAMAGE_SOURCE_META).map(source => [source, 0]))
  );
  return {
    phaseId: RUN_PHASES[0].id,
    totalDamage: 0,
    damageBySource: createDamageBySource(),
    damageByPhase: Object.fromEntries(
      RUN_PHASES.map(phase => [phase.id, createDamageBySource()])
    ),
    damageTaken: 0,
    damageTakenByPhase: Object.fromEntries(RUN_PHASES.map(phase => [phase.id, 0])),
    healingReceived: 0,
    healingByPhase: Object.fromEntries(RUN_PHASES.map(phase => [phase.id, 0]))
  };
}

export function createEmptyBuildFocus() {
  return { orb: 0, storm: 0, blade: 0, chain: 0, nova: 0 };
}

export function createInitialGame(options = {}) {
  const replayRouteFamily = REPLAY_ROUTE_META[options.replayRouteFamily]
    ? options.replayRouteFamily
    : null;
  return {
    phase: 'playing',
    level: 1,
    xp: 0,
    xpToNext: STARTING_XP_TO_NEXT,
    time: 0,
    kills: 0,
    wave: 1,
    pendingUpgrades: 0,
    dash: {
      cooldown: 0,
      cooldownMax: DASH_COOLDOWN,
      active: 0,
      ready: true
    },
    result: null,
    pickupMessage: replayRouteFamily
      ? `${REPLAY_ROUTE_META[replayRouteFamily]} 경로 예약 · 첫 무기 봉인에서 확정`
      : '',
    pickupFlash: replayRouteFamily ? 4.2 : 0,
    encounterAlert: null,
    encounterAlertTimer: 0,
    activeThreat: null,
    lastBossPattern: null,
    bossStatus: null,
    damageFlash: 0,
    damageMessage: '',
    onboardingMovement: 0,
    dashUses: 0,
    eliteKills: 0,
    bossKills: 0,
    runStats: createEmptyRunStats(),
    overloadTimer: 0,
    itemPickups: createEmptyItemPickups(),
    shrineActivations: 0,
    activatedShrines: {},
    replayRouteFamily,
    playerPos: { x: 0, z: 0 },
    stats: {
      hp: 120,
      maxHp: 120,
      damage: 1,
      speed: 1,
      cooldown: 1,
      magnet: 1,
      dashCooldown: 1,
      pierce: 0,
      xpGain: 1,
      orbCount: 1,
      orbDamage: 1,
      orbScale: 1,
      orbSpeed: 1,
      stormRadius: 1,
      stormDamage: 1,
      stormStrikes: 1,
      stormCooldown: 1,
      stormDuration: 1,
      bladeBonus: 0,
      bladeDamage: 1,
      bladeRadius: 1,
      lightningChains: 3,
      lightningDamage: 1,
      lightningRange: 1,
      lightningExecute: 0,
      novaRadius: 1,
      novaDamage: 1,
      novaCooldown: 1,
      novaPulse: 0
    },
    buildFocus: createEmptyBuildFocus(),
    upgrades: []
  };
}

