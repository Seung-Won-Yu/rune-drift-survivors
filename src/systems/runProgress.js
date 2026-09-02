import { DAMAGE_SOURCE_META, SHRINE_SITES } from '../config/gameData.js';
import { RUN_DURATION } from '../config/gameTuning.js';
import { BUILD_FOCUS_META } from '../config/upgrades.js';
import { createEmptyRunStats } from './gameState.js';
import {
  formatFocusLevel,
  getBuildSynergyStates,
  getDominantBuild,
  getUnlockedWeaponFamilyCount
} from './progression.js';
import { getRuneCircuitState } from './runeCircuit.js';

const OPENING_OBJECTIVES = [
  { id: 'first-blood', title: '균열 정찰', label: '적 12 처치', target: 12, color: '#70f0b4', getValue: game => game.kills },
  { id: 'circuit-one', title: '회로 점화', label: '무기 봉인 활성', target: 1, color: '#d4a84c', getValue: game => game.shrineActivations ?? 0 },
  { id: 'first-etching', title: '첫 각인 완성', label: '레벨 3 도달', target: 3, color: '#aa91cf', getValue: game => game.level },
  { id: 'first-surge', title: '점화 구간 버티기', label: '45초 생존', target: 45, color: '#d96d58', getValue: game => game.time }
];

const ONBOARDING_STEPS = [
  { id: 'move', title: '이동', label: 'WASD / 방향키', target: 12, color: '#64c98d', getValue: game => game.onboardingMovement ?? 0 },
  { id: 'dash', title: '회피', label: 'Space 대시', target: 1, color: '#58b9d4', getValue: game => game.dashUses ?? 0 },
  { id: 'xp', title: '성장', label: '푸른 XP 회수', target: 12, color: '#aa91cf', getValue: game => Math.max(game.xp, game.level > 1 ? 12 : 0) },
  { id: 'circuit', title: '회로', label: '첫 봉인 활성', target: 1, color: '#d4a84c', getValue: game => game.shrineActivations ?? 0 }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getOpeningObjectives(game) {
  return OPENING_OBJECTIVES.map(objective => {
    const value = Math.min(objective.target, objective.getValue(game));
    const progress = clamp(value / objective.target, 0, 1);
    return {
      ...objective,
      value,
      progress,
      complete: progress >= 1,
      displayValue: objective.id === 'first-surge' ? `${Math.floor(value)}s` : Math.floor(value),
      displayTarget: objective.id === 'first-surge' ? `${objective.target}s` : objective.target
    };
  });
}

function makeRunObjective({ id, title, label, value, target, color, displayValue, displayTarget }) {
  const safeTarget = Math.max(1, target);
  const cappedValue = Math.min(safeTarget, value);
  const progress = clamp(cappedValue / safeTarget, 0, 1);
  return {
    id,
    title,
    label,
    value: cappedValue,
    target: safeTarget,
    color,
    progress,
    complete: progress >= 1,
    displayValue: displayValue ? displayValue(cappedValue) : Math.floor(cappedValue),
    displayTarget: displayTarget ?? safeTarget
  };
}

export function getRunPhaseObjectives(game, runPhase, openingObjectives) {
  if (runPhase.id === 'learn') return openingObjectives;

  const dominant = getDominantBuild(game);
  const synergyCount = getBuildSynergyStates(game).filter(synergy => synergy.level > 0).length;
  const unlockedWeapons = getUnlockedWeaponFamilyCount(game);

  if (runPhase.id === 'anchor') {
    return [
      makeRunObjective({ id: 'anchor-circuit', title: '경로 연결', label: '봉인 2개 활성', value: game.shrineActivations ?? 0, target: 2, color: '#79f29a' }),
      makeRunObjective({ id: 'anchor-level', title: '성장 안정', label: '레벨 4 도달', value: game.level, target: 4, color: '#58b9d4' }),
      makeRunObjective({ id: 'anchor-survive', title: '첫 압박', label: '115초 생존', value: game.time, target: 115, color: '#d4a84c', displayValue: value => `${Math.floor(value)}s`, displayTarget: '115s' })
    ];
  }

  if (runPhase.id === 'armory') {
    return [
      makeRunObjective({ id: 'pressure-circuit', title: '압박 돌파', label: '봉인 3개 활성', value: game.shrineActivations ?? 0, target: 3, color: '#d8ad4f' }),
      makeRunObjective({ id: 'armory-family', title: '빌드 축', label: '무기 2계열 개방', value: unlockedWeapons, target: 2, color: '#aa91cf' }),
      makeRunObjective({ id: 'armory-elite', title: '정예 대응', label: '정예 1 처치', value: game.eliteKills ?? 0, target: 1, color: '#d96d58' })
    ];
  }

  if (runPhase.id === 'synergy') {
    return [
      makeRunObjective({ id: 'ascent-circuit', title: '회로 완성', label: '봉인 4개 활성', value: game.shrineActivations ?? 0, target: SHRINE_SITES.length, color: '#aa91cf' }),
      makeRunObjective({ id: 'synergy-link', title: '공명 완성', label: '조합 공명 1개', value: synergyCount, target: 1, color: '#aa91cf' }),
      makeRunObjective({ id: 'synergy-focus', title: '주력 강화', label: '주력 III 달성', value: dominant?.focus ?? 0, target: 3, color: dominant?.color ?? '#58b9d4' })
    ];
  }

  return [
    makeRunObjective({ id: 'final-survive', title: '최종 생존', label: '300초 생존', value: game.time, target: RUN_DURATION, color: '#d96d58', displayValue: value => `${Math.floor(value)}s`, displayTarget: `${RUN_DURATION}s` }),
    makeRunObjective({ id: 'final-circuit', title: '회로 완성', label: '봉인 4개 활성', value: game.shrineActivations ?? 0, target: SHRINE_SITES.length, color: '#aa91cf' }),
    makeRunObjective({ id: 'final-boss', title: '보스 대응', label: '보스 2 처치', value: game.bossKills ?? 0, target: 2, color: '#d4a84c' })
  ];
}

export function getOnboardingSteps(game) {
  return ONBOARDING_STEPS.map(step => {
    const value = Math.min(step.target, step.getValue(game));
    const progress = clamp(value / step.target, 0, 1);
    return {
      ...step,
      value,
      progress,
      complete: progress >= 1,
      displayValue: step.id === 'move' ? Math.floor(value) : Math.ceil(value),
      displayTarget: step.target
    };
  });
}

export function getFirstSessionCue(game, onboardingSteps, activeObjectives) {
  const nextStep = onboardingSteps.find(step => !step.complete);
  const nextObjective = activeObjectives[0];
  const fallbackProgress = nextObjective?.progress ?? 0;
  const circuit = getRuneCircuitState(game);

  if (!nextStep && !nextObjective) return null;

  if (!nextStep) {
    return getObjectiveCue(nextObjective, fallbackProgress);
  }

  const base = {
    stepId: nextStep.id,
    color: nextStep.color,
    action: nextStep.label,
    progress: nextStep.progress
  };

  switch (nextStep.id) {
    case 'move':
      return {
        ...base,
        title: '먼저 움직임',
        body: '적을 끌고 원을 그리며 안전 공간을 만드세요',
        detail: '멈추면 포위가 빨라집니다',
        progress: nextStep.progress
      };
    case 'dash':
      return {
        ...base,
        title: '위험하면 대시',
        body: '포위가 좁아질 때 Space로 한 번 빠져나오세요',
        detail: 'Ready 표시가 켜지면 다시 쓸 수 있습니다',
        progress: nextStep.progress
      };
    case 'xp':
      return {
        ...base,
        title: '푸른 XP 회수',
        body: '푸른 조각을 지나가 첫 카드 선택까지 성장하세요',
        detail: 'XP를 놓치면 초반 화력이 늦게 열립니다',
        progress: nextStep.progress
      };
    case 'circuit':
      return {
        ...base,
        title: circuit.ready ? '첫 봉인 점화' : '첫 봉인 추적',
        body: circuit.ready ? '화살표를 따라 무기 봉인 위에서 회로를 여세요' : '동쪽의 금빛 봉인으로 이동하며 성장하세요',
        detail: circuit.ready ? '봉인 범위를 잠시 유지하면 빌드 보상이 열립니다' : `${Math.ceil(circuit.unlockIn)}초 뒤 봉인이 활성화됩니다`,
        action: circuit.ready ? `${circuit.direction?.arrow ?? ''} ${circuit.distance}m · READY` : `${circuit.direction?.arrow ?? ''} ${circuit.distance}m · ${Math.ceil(circuit.unlockIn)}s`,
        progress: nextStep.progress
      };
    default:
      return getObjectiveCue(nextObjective, fallbackProgress);
  }
}

function getObjectiveCue(objective, progress = 0) {
  if (!objective) return null;

  const cueMap = {
    'first-blood': {
      title: '첫 처치 목표',
      body: '구체가 닿도록 거리를 유지하며 적을 정리하세요',
      detail: '무리 안으로 들어가지 말고 가장자리를 깎습니다',
      action: objective.label
    },
    'circuit-one': {
      title: '첫 봉인 점화',
      body: '화살표와 금빛 빔을 따라 무기 봉인으로 이동하세요',
      detail: '범위 안을 유지하면 첫 빌드 보상이 열립니다',
      action: objective.label
    },
    'first-etching': {
      title: '첫 각인 완성',
      body: '레벨 3까지 성장하면 빌드 색이 뚜렷해집니다',
      detail: '추천 카드는 현재 화력 부족을 기준으로 표시됩니다',
      action: objective.label
    },
    'first-surge': {
      title: '첫 파동 버티기',
      body: '45초까지 살아남으면 회로 점화 구간이 안정됩니다',
      detail: '무리 중앙이 아니라 외곽으로 계속 빠지세요',
      action: objective.label
    }
  };
  const cue = cueMap[objective.id] ?? cueMap['first-blood'];

  return {
    ...cue,
    stepId: objective.id,
    color: objective.color,
    progress
  };
}

function getTopDamageSource(game) {
  const damageBySource = { ...createEmptyRunStats().damageBySource, ...(game?.runStats?.damageBySource ?? {}) };
  const [source, damage] = Object.entries(damageBySource)
    .filter(([key]) => key !== 'generic')
    .sort((a, b) => b[1] - a[1])[0] ?? ['generic', 0];
  const meta = DAMAGE_SOURCE_META[source] ?? DAMAGE_SOURCE_META.generic;
  const dps = game?.time > 0 ? damage / Math.max(1, game.time) : 0;
  return {
    source,
    damage,
    dps: dps.toFixed(1),
    ...meta
  };
}

export function getRunScore(game) {
  const survivalScore = Math.min(40, game.time / RUN_DURATION * 40);
  const circuitScore = Math.min(30, (game.shrineActivations ?? 0) / SHRINE_SITES.length * 30);
  const dominant = getDominantBuild(game);
  const focusScore = dominant
    ? Math.min(15, dominant.focus / Math.max(1, dominant.maxRank) * 15)
    : 0;
  const strongestSynergy = Math.max(0, ...getBuildSynergyStates(game).map(synergy => synergy.level));
  const buildScore = Math.min(25, focusScore + strongestSynergy / 4 * 10);
  const combatScore = Math.min(5, (game.bossKills ?? 0) * 1.5 + (game.eliteKills ?? 0) * 0.35 + (game.kills ?? 0) / 300);
  const total = survivalScore + circuitScore + buildScore + combatScore;
  const rounded = {
    total: Math.round(total),
    survival: Math.round(survivalScore),
    circuit: Math.round(circuitScore),
    build: Math.round(buildScore),
    combat: Math.round(combatScore)
  };
  const circuitComplete = getRuneCircuitState(game).complete;
  if (total >= 90 && circuitComplete) return { ...rounded, grade: 'S', label: '균열 지배', color: '#d4a84c' };
  if (total >= 76) return { ...rounded, grade: 'A', label: circuitComplete ? '회로 완성' : '생존 귀환', color: '#64c98d' };
  if (total >= 60) return { ...rounded, grade: 'B', label: '빌드 성립', color: '#58b9d4' };
  if (total >= 42) return { ...rounded, grade: 'C', label: '성장 중', color: '#aa91cf' };
  return { ...rounded, grade: 'D', label: '재정비 필요', color: '#d96d58' };
}

const ALTERNATE_BUILD_ROUTES = Object.freeze({
  orb: Object.freeze({ primary: 'blade', secondary: 'nova', detail: '근접 칼날로 공간을 만들고 태양 파동으로 포위를 밀어냅니다' }),
  storm: Object.freeze({ primary: 'blade', secondary: 'nova', detail: '장판 대신 근접 수호와 광역 밀어내기를 중심으로 운영합니다' }),
  blade: Object.freeze({ primary: 'storm', secondary: 'chain', detail: '거리 유지형 낙뢰와 연쇄 번개로 전장을 넓게 제어합니다' }),
  chain: Object.freeze({ primary: 'blade', secondary: 'nova', detail: '연쇄 대신 칼날 방어와 태양 중심의 근거리 빌드를 시험합니다' }),
  nova: Object.freeze({ primary: 'storm', secondary: 'chain', detail: '큰 단발 파동 대신 지속 낙뢰와 연쇄 처형을 연결합니다' })
});

function getReplaySuggestion(game) {
  const dominant = getDominantBuild(game);
  const route = ALTERNATE_BUILD_ROUTES[dominant?.key] ?? ALTERNATE_BUILD_ROUTES.blade;
  const primary = BUILD_FOCUS_META[route.primary];
  const secondary = BUILD_FOCUS_META[route.secondary];
  return {
    family: route.primary,
    title: `${primary.label} + ${secondary.label}`,
    detail: route.detail,
    color: primary.color,
    glyph: primary.glyph,
    cta: `${primary.label} 경로로 재도전`
  };
}

function getActivatedShrineLabels(game) {
  const activated = game?.activatedShrines ?? {};
  const labels = SHRINE_SITES
    .filter(shrine => activated[shrine.id])
    .map(shrine => shrine.label);
  return labels.length > 0 ? labels.join(' · ') : '미활성';
}

function getRunOutcome(game) {
  const circuit = getRuneCircuitState(game);
  if (game.result === 'victory') {
    return {
      id: 'victory',
      eyebrow: 'RIFT SEALED',
      title: '5분 생존과 회로 봉인에 성공했습니다',
      detail: '4개 봉인과 생존 목표를 모두 완수했습니다',
      mark: '◇',
      color: '#d4a84c'
    };
  }
  if (game.result === 'survived') {
    return {
      id: 'survived',
      eyebrow: 'RIFT ENDURED',
      title: '5분을 생존했지만 회로가 미완성입니다',
      detail: `${circuit.nextSite?.label ?? '남은 봉인'}부터 연결하면 완전 봉인이 가능합니다`,
      mark: '△',
      color: '#58b9d4'
    };
  }
  return {
    id: 'defeat',
    eyebrow: 'INSCRIPTION BROKEN',
    title: '룬이 끊어졌습니다',
    detail: circuit.completed > 0
      ? `회로 ${circuit.completed}/${circuit.total} 지점에서 붕괴했습니다`
      : '첫 무기 봉인을 향해 움직이며 초반 화력을 확보하세요',
    mark: '×',
    color: '#d96d58'
  };
}

export function getRunResultSummary(game) {
  const topWeapon = getTopDamageSource(game);
  const synergy = getBuildSynergyStates(game).find(item => item.level > 0);
  const score = getRunScore(game);
  return {
    grade: score.grade,
    gradeLabel: score.label,
    gradeColor: score.color,
    score,
    outcome: getRunOutcome(game),
    topWeapon,
    synergy: synergy
      ? { ...synergy, detail: `${synergy.label} ${formatFocusLevel(synergy.level)}` }
      : { title: '미완성', label: '조합 없음', detail: '다음 런에서 조합 완성', color: '#aa91cf' },
    shrines: `${game.shrineActivations ?? 0} / ${SHRINE_SITES.length}`,
    shrineLabels: getActivatedShrineLabels(game),
    replay: getReplaySuggestion(game)
  };
}
