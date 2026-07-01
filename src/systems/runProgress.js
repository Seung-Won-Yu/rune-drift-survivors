import { DAMAGE_SOURCE_META, SHRINE_SITES } from '../config/gameData.js';
import { RUN_DURATION } from '../config/gameTuning.js';
import { createEmptyRunStats, getItemPickupCount } from './gameState.js';
import {
  formatFocusLevel,
  getBuildSynergyStates,
  getDominantBuild,
  getUnlockedWeaponFamilyCount
} from './progression.js';

const OPENING_OBJECTIVES = [
  { id: 'first-blood', title: '균열 정찰', label: '적 12 처치', target: 12, color: '#70f0b4', getValue: game => game.kills },
  { id: 'magnet-flow', title: 'XP 흐름 열기', label: '자석 룬 회수', target: 1, color: '#70d6ff', getValue: game => getItemPickupCount(game, 'magnet') },
  { id: 'armory-seed', title: '빌드 방향 잡기', label: '무기 보급 회수', target: 1, color: '#fff1a6', getValue: game => getItemPickupCount(game, 'cache') },
  { id: 'first-etching', title: '첫 각인 완성', label: '레벨 3 도달', target: 3, color: '#d8b2ff', getValue: game => game.level },
  { id: 'first-surge', title: '첫 파동 버티기', label: '90초 생존', target: 90, color: '#ff8b72', getValue: game => game.time }
];

const ONBOARDING_STEPS = [
  { id: 'move', title: '이동', label: 'WASD / 방향키', target: 12, color: '#73fbd3', getValue: game => game.onboardingMovement ?? 0 },
  { id: 'dash', title: '회피', label: 'Space 대시', target: 1, color: '#70d6ff', getValue: game => game.dashUses ?? 0 },
  { id: 'xp', title: '성장', label: '푸른 XP 회수', target: 12, color: '#d8b2ff', getValue: game => Math.max(game.xp, game.level > 1 ? 12 : 0) },
  { id: 'cache', title: '빌드', label: '무기 보급 회수', target: 1, color: '#fff1a6', getValue: game => getItemPickupCount(game, 'cache') }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getShrineHint(game) {
  if ((game.shrineActivations ?? 0) >= SHRINE_SITES.length) return null;
  const playerPos = game.playerPos ?? { x: 0, z: 0 };
  const activeMap = game.activatedShrines ?? {};
  let nearest = null;
  for (const shrine of SHRINE_SITES) {
    if (activeMap[shrine.id]) continue;
    const x = Math.cos(shrine.angle) * shrine.radius;
    const z = Math.sin(shrine.angle) * shrine.radius;
    const dx = x - playerPos.x;
    const dz = z - playerPos.z;
    const distance = Math.hypot(dx, dz);
    if (!nearest || distance < nearest.distance) {
      nearest = { ...shrine, distance, dx, dz };
    }
  }
  if (!nearest) return null;
  return {
    label: nearest.label,
    distance: Math.round(nearest.distance),
    direction: formatCompassDirection(nearest.dx, nearest.dz)
  };
}

function formatCompassDirection(dx, dz) {
  const angle = Math.atan2(dz, dx);
  const directions = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const index = Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % directions.length;
  return directions[index];
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
  const cacheCount = getItemPickupCount(game, 'cache');

  if (runPhase.id === 'anchor') {
    return [
      makeRunObjective({ id: 'anchor-level', title: '성장 안정', label: '레벨 4 도달', value: game.level, target: 4, color: '#70d6ff' }),
      makeRunObjective({ id: 'anchor-magnet', title: 'XP 회수', label: '자석 룬 2회', value: getItemPickupCount(game, 'magnet'), target: 2, color: '#73fbd3' }),
      makeRunObjective({ id: 'anchor-survive', title: '첫 압박', label: '115초 생존', value: game.time, target: 115, color: '#fff1a6', displayValue: value => `${Math.floor(value)}s`, displayTarget: '115s' })
    ];
  }

  if (runPhase.id === 'armory') {
    return [
      makeRunObjective({ id: 'armory-cache', title: '무기 보급', label: '보급 1회 회수', value: cacheCount, target: 1, color: '#fff1a6' }),
      makeRunObjective({ id: 'armory-family', title: '빌드 축', label: '무기 2계열 개방', value: unlockedWeapons, target: 2, color: '#d8b2ff' }),
      makeRunObjective({ id: 'armory-elite', title: '정예 대응', label: '정예 1 처치', value: game.eliteKills ?? 0, target: 1, color: '#ff8b72' })
    ];
  }

  if (runPhase.id === 'synergy') {
    return [
      makeRunObjective({ id: 'synergy-link', title: '공명 완성', label: '조합 공명 1개', value: synergyCount, target: 1, color: '#d8b2ff' }),
      makeRunObjective({ id: 'synergy-focus', title: '주력 강화', label: '주력 III 달성', value: dominant?.focus ?? 0, target: 3, color: dominant?.color ?? '#70d6ff' }),
      makeRunObjective({ id: 'synergy-shrine', title: '제단 활용', label: '제단 2개 활성', value: game.shrineActivations ?? 0, target: 2, color: '#73fbd3' })
    ];
  }

  return [
    makeRunObjective({ id: 'final-survive', title: '최종 생존', label: '300초 생존', value: game.time, target: RUN_DURATION, color: '#ff8b72', displayValue: value => `${Math.floor(value)}s`, displayTarget: `${RUN_DURATION}s` }),
    makeRunObjective({ id: 'final-boss', title: '보스 대응', label: '보스 2 처치', value: game.bossKills ?? 0, target: 2, color: '#fff1a6' }),
    makeRunObjective({ id: 'final-space', title: '퇴로 확보', label: '대시 8회 활용', value: game.dashUses ?? 0, target: 8, color: '#70d6ff' })
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

  if (game.time > 108 && getItemPickupCount(game, 'cache') < 1) {
    return {
      ...base,
      stepId: 'cache',
      color: '#fff1a6',
      title: '첫 무기 보급',
      body: '노란 보급 룬을 지나가면 새 무기 후보가 열립니다',
      detail: '초반 화력은 무기 수보다 선택 타이밍이 중요합니다',
      action: '보급 룬 회수',
      progress: Math.min(1, Math.max(fallbackProgress, (game.time - 108) / 24))
    };
  }

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
    case 'cache':
      return {
        ...base,
        title: '무기 보급 찾기',
        body: '노란 보급 룬을 회수하면 빌드 방향이 정해집니다',
        detail: '처음부터 강한 무기보다 성장 선택이 핵심입니다',
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
    'magnet-flow': {
      title: '자석 룬 회수',
      body: '푸른 자석 룬은 놓친 XP를 한 번에 당겨옵니다',
      detail: '레벨업 카드가 늦으면 자석을 먼저 챙기세요',
      action: objective.label
    },
    'armory-seed': {
      title: '무기 보급 찾기',
      body: '노란 보급 룬이 보이면 안전한 방향으로 접근하세요',
      detail: '새 무기는 다음 파동을 버티는 기준점입니다',
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
      body: '90초까지 살아남으면 초반 흐름이 안정됩니다',
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

function getRunGrade(game) {
  const survivalScore = Math.min(40, game.time / RUN_DURATION * 40);
  const killScore = Math.min(24, (game.kills ?? 0) / 180 * 24);
  const bossScore = Math.min(16, (game.bossKills ?? 0) * 8 + (game.eliteKills ?? 0) * 2);
  const shrineScore = Math.min(10, (game.shrineActivations ?? 0) / SHRINE_SITES.length * 10);
  const synergyScore = Math.min(10, getBuildSynergyStates(game).filter(synergy => synergy.level > 0).length * 4);
  const total = survivalScore + killScore + bossScore + shrineScore + synergyScore;
  if (total >= 88) return { grade: 'S', label: '균열 지배', color: '#fff1a6' };
  if (total >= 74) return { grade: 'A', label: '전투 완성', color: '#73fbd3' };
  if (total >= 58) return { grade: 'B', label: '빌드 성립', color: '#70d6ff' };
  if (total >= 42) return { grade: 'C', label: '성장 중', color: '#d8b2ff' };
  return { grade: 'D', label: '재정비 필요', color: '#ff8b72' };
}

function getActivatedShrineLabels(game) {
  const activated = game?.activatedShrines ?? {};
  const labels = SHRINE_SITES
    .filter(shrine => activated[shrine.id])
    .map(shrine => shrine.label);
  return labels.length > 0 ? labels.join(' · ') : '미활성';
}

export function getRunResultSummary(game) {
  const topWeapon = getTopDamageSource(game);
  const synergy = getBuildSynergyStates(game).find(item => item.level > 0);
  const grade = getRunGrade(game);
  return {
    grade: grade.grade,
    gradeLabel: grade.label,
    gradeColor: grade.color,
    topWeapon,
    synergy: synergy
      ? { ...synergy, detail: `${synergy.label} ${formatFocusLevel(synergy.level)}` }
      : { title: '미완성', label: '조합 없음', detail: '다음 런에서 조합 완성', color: '#d8b2ff' },
    shrines: `${game.shrineActivations ?? 0} / ${SHRINE_SITES.length}`,
    shrineLabels: getActivatedShrineLabels(game)
  };
}
