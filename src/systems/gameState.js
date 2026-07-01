import { BOSS_PATTERN_META, DAMAGE_SOURCE_META } from '../config/gameData.js';
import { DASH_COOLDOWN, RUN_DURATION } from '../config/gameTuning.js';

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
  return {
    totalDamage: 0,
    damageBySource: Object.fromEntries(Object.keys(DAMAGE_SOURCE_META).map(source => [source, 0]))
  };
}

export function createEmptyBuildFocus() {
  return { orb: 0, storm: 0, blade: 0, chain: 0, nova: 0 };
}

export function createInitialGame() {
  return {
    phase: 'playing',
    level: 1,
    xp: 0,
    xpToNext: 30,
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
    pickupMessage: '',
    pickupFlash: 0,
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

export function createQaBossGame(options = {}) {
  const enraged = options.enraged ?? true;
  return {
    ...createInitialGame(),
    phase: 'qa-preview',
    level: 8,
    xp: 18,
    xpToNext: 68,
    time: 132,
    kills: 246,
    wave: 6,
    pickupMessage: enraged ? '보스 분노: 패턴 가속' : '보스 접근: 패턴을 읽으세요',
    pickupFlash: 2.5,
    encounterAlert: {
      kind: 'boss-pattern',
      label: 'RIFT BEAST',
      title: enraged ? '분노 페이즈 진입' : '보스 패턴 예고',
      hint: '중거리 이탈 후 약점 집중',
      color: enraged ? '#ff8b72' : '#fff1a6'
    },
    encounterAlertTimer: 2.8,
    activeThreat: { label: 'RIFT BEAST', weakness: '룬/번개 집중', color: '#ffdf6e' },
    lastBossPattern: enraged ? 'shockwave' : 'guard',
    bossStatus: {
      hp: enraged ? 720 : 1260,
      maxHp: 1800,
      hpPct: enraged ? 0.4 : 0.7,
      wave: 6,
      enraged,
      phaseLabel: enraged ? 'RAGE' : 'PRESSURE',
      phaseColor: enraged ? '#ff8b72' : '#ffdf6e',
      patternLabel: enraged ? BOSS_PATTERN_META.shockwave.label : BOSS_PATTERN_META.guard.label,
      patternHint: enraged ? BOSS_PATTERN_META.shockwave.hint : BOSS_PATTERN_META.guard.hint,
      patternColor: enraged ? BOSS_PATTERN_META.shockwave.color : BOSS_PATTERN_META.guard.color,
      patternStage: enraged ? 4 : 2,
      casting: true
    },
    onboardingMovement: 64,
    dashUses: 2,
    eliteKills: 4,
    bossKills: 0,
    itemPickups: { ...createEmptyItemPickups(), magnet: 2, cache: 2, overload: 1 },
    shrineActivations: 1,
    activatedShrines: { armory: true },
    buildFocus: { ...createEmptyBuildFocus(), orb: 2, storm: 2, chain: 2, nova: 1 },
    upgrades: ['orb-lance', 'pierce', 'storm-volley', 'chain-plus', 'chain-web', 'nova-plus'],
    runStats: {
      totalDamage: 16540,
      damageBySource: {
        ...createEmptyRunStats().damageBySource,
        orb: 3820,
        storm: 4560,
        lightning: 6120,
        nova: 1440,
        blade: 600
      }
    }
  };
}

export function createQaResultGame(result = 'victory') {
  const didWin = result === 'victory';
  return {
    ...createInitialGame(),
    phase: 'ended',
    result,
    level: didWin ? 13 : 9,
    xp: didWin ? 48 : 22,
    xpToNext: 84,
    time: didWin ? RUN_DURATION : 214,
    kills: didWin ? 682 : 391,
    wave: didWin ? 14 : 10,
    onboardingMovement: 120,
    dashUses: 8,
    eliteKills: didWin ? 9 : 5,
    bossKills: didWin ? 3 : 1,
    itemPickups: { ...createEmptyItemPickups(), magnet: 4, cache: 4, heal: 2, purge: 2, overload: 2 },
    shrineActivations: didWin ? 4 : 2,
    activatedShrines: didWin
      ? { armory: true, vital: true, purge: true, etching: true }
      : { armory: true, vital: true },
    buildFocus: { ...createEmptyBuildFocus(), storm: 4, chain: 4, orb: 3, nova: 2, blade: 1 },
    upgrades: [
      'storm-volley',
      'storm-carpet',
      'storm-burst',
      'chain-plus',
      'chain-web',
      'chain-smite',
      'orb-lance',
      'pierce',
      'nova-plus',
      'damage',
      'cooldown'
    ],
    stats: {
      ...createInitialGame().stats,
      hp: didWin ? 86 : 0,
      maxHp: 160,
      damage: 1.42,
      cooldown: 0.78,
      magnet: 1.5,
      lightningChains: 8,
      stormStrikes: 3,
      pierce: 3
    },
    runStats: {
      totalDamage: didWin ? 84200 : 48750,
      damageBySource: {
        ...createEmptyRunStats().damageBySource,
        storm: didWin ? 23800 : 14200,
        lightning: didWin ? 28600 : 16100,
        orb: didWin ? 17600 : 9300,
        nova: didWin ? 8900 : 5400,
        blade: didWin ? 5300 : 3750
      }
    }
  };
}

export function createQaStressGame() {
  return {
    ...createQaBossGame({ enraged: true }),
    phase: 'qa-preview',
    level: 12,
    xp: 44,
    xpToNext: 92,
    time: 246,
    kills: 540,
    wave: 12,
    pickupMessage: '성능 점검: 후반 전투 부하',
    pickupFlash: 2.8,
    encounterAlert: {
      kind: 'surge',
      label: 'PERF STRESS',
      title: '후반 전투 부하 재현',
      hint: '적/투사체/이펙트 cap 확인',
      color: '#70d6ff'
    },
    encounterAlertTimer: 2.8,
    buildFocus: { ...createEmptyBuildFocus(), orb: 4, storm: 4, chain: 4, nova: 3, blade: 3 },
    upgrades: [
      'orb-count',
      'orb-lance',
      'pierce',
      'storm-volley',
      'storm-carpet',
      'storm-burst',
      'chain-plus',
      'chain-web',
      'chain-smite',
      'blade-guard',
      'blade-reaper',
      'nova-plus',
      'nova-pulse',
      'damage',
      'cooldown'
    ],
    stats: {
      ...createInitialGame().stats,
      hp: 146,
      maxHp: 180,
      damage: 1.58,
      cooldown: 0.68,
      magnet: 1.6,
      dashCooldown: 0.82,
      pierce: 4,
      orbCount: 6,
      orbDamage: 1.6,
      orbScale: 1.28,
      orbSpeed: 1.18,
      stormRadius: 1.48,
      stormDamage: 1.42,
      stormStrikes: 4,
      stormCooldown: 0.78,
      stormDuration: 1.35,
      bladeBonus: 4,
      bladeDamage: 1.56,
      bladeRadius: 1.18,
      lightningChains: 9,
      lightningDamage: 1.52,
      lightningRange: 1.26,
      lightningExecute: 1,
      novaRadius: 1.44,
      novaDamage: 1.48,
      novaCooldown: 0.78,
      novaPulse: 1
    }
  };
}
