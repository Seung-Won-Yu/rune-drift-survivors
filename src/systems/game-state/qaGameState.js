import { BOSS_PATTERN_META } from '../../config/gameData.js';
import { RUN_DURATION } from '../../config/gameTuning.js';
import {
  createEmptyBuildFocus,
  createEmptyItemPickups,
  createEmptyRunStats,
  createInitialGame
} from './gameStateCore.js';

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
      color: enraged ? '#d96d58' : '#d4a84c'
    },
    encounterAlertTimer: 2.8,
    activeThreat: { label: 'RIFT BEAST', weakness: '룬/번개 집중', color: '#d4a84c' },
    lastBossPattern: enraged ? 'shockwave' : 'guard',
    bossStatus: {
      hp: enraged ? 720 : 1260,
      maxHp: 1800,
      hpPct: enraged ? 0.4 : 0.7,
      wave: 6,
      enraged,
      phaseLabel: enraged ? 'RAGE' : 'PRESSURE',
      phaseColor: enraged ? '#d96d58' : '#d4a84c',
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
      ...createEmptyRunStats(),
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
  const didSurvive = didWin || result === 'survived';
  return {
    ...createInitialGame(),
    phase: 'ended',
    result,
    level: didWin ? 13 : didSurvive ? 11 : 9,
    xp: didWin ? 48 : didSurvive ? 34 : 22,
    xpToNext: 84,
    time: didSurvive ? RUN_DURATION : 214,
    kills: didWin ? 682 : didSurvive ? 524 : 391,
    wave: didSurvive ? 14 : 10,
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
      hp: didWin ? 86 : didSurvive ? 44 : 0,
      maxHp: 160,
      damage: 1.42,
      cooldown: 0.78,
      magnet: 1.5,
      lightningChains: 8,
      stormStrikes: 3,
      pierce: 3
    },
    runStats: {
      ...createEmptyRunStats(),
      totalDamage: didWin ? 84200 : 48750,
      damageTaken: didWin ? 168 : 224,
      healingReceived: didWin ? 134 : 86,
      damageTakenByPhase: didWin
        ? { learn: 12, anchor: 25, armory: 36, synergy: 42, final: 53 }
        : didSurvive
          ? { learn: 18, anchor: 34, armory: 48, synergy: 56, final: 68 }
          : { learn: 22, anchor: 44, armory: 66, synergy: 92, final: 0 },
      healingByPhase: didWin
        ? { learn: 8, anchor: 24, armory: 36, synergy: 38, final: 28 }
        : didSurvive
          ? { learn: 8, anchor: 18, armory: 20, synergy: 22, final: 18 }
          : { learn: 6, anchor: 16, armory: 26, synergy: 38, final: 0 },
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
      color: '#58b9d4'
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

export function createQaCombatGame() {
  return {
    ...createInitialGame(),
    phase: 'playing',
    level: 8,
    xp: 18,
    xpToNext: 68,
    time: 92,
    kills: 84,
    wave: 5,
    pickupMessage: '전투 아이덴티티 QA: 다섯 무기군 동시 재현',
    pickupFlash: 4,
    onboardingMovement: 64,
    dashUses: 2,
    shrineActivations: 2,
    activatedShrines: { armory: true, vital: true },
    buildFocus: { orb: 2, storm: 2, blade: 2, chain: 2, nova: 2 },
    upgrades: ['orb-lance', 'storm-burst', 'blade-reaper', 'chain-plus', 'nova-plus'],
    stats: {
      ...createInitialGame().stats,
      hp: 180,
      maxHp: 180,
      damage: 1.16,
      cooldown: 0.86,
      pierce: 2,
      orbCount: 2,
      orbDamage: 1.18,
      orbScale: 1.12,
      stormRadius: 1.18,
      stormDamage: 1.14,
      stormStrikes: 2,
      stormCooldown: 0.9,
      bladeBonus: 1,
      bladeDamage: 1.18,
      bladeRadius: 1.08,
      lightningChains: 5,
      lightningDamage: 1.16,
      lightningRange: 1.12,
      novaRadius: 1.16,
      novaDamage: 1.18,
      novaCooldown: 0.9
    }
  };
}

