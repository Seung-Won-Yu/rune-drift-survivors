import { SHRINE_SITES } from '../../config/gameData.js';
import { RUN_DURATION } from '../../config/gameTuning.js';
import {
  getBuildSynergyStates,
  getDominantBuild,
  getUnlockedWeaponFamilyCount
} from '../progression.js';
import { getRuneCircuitState } from '../runeCircuit.js';

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

export function getFirstSessionCue(game, onboardingSteps) {
  const circuit = getRuneCircuitState(game);
  if (circuit.completed > 0 || !circuit.nextSite) return null;

  const move = onboardingSteps.find(step => step.id === 'move');
  const xp = onboardingSteps.find(step => step.id === 'xp');
  if (move && !move.complete) {
    return {
      stepId: 'move',
      stepNumber: 1,
      color: move.color,
      title: '이동하면 자동 공격',
      action: 'WASD / 방향키로 이동',
      touchAction: '왼쪽 스틱으로 이동',
      body: '금빛 무기 봉인 쪽으로 이동하세요',
      detail: '위험할 때 Space로 대시할 수 있습니다',
      touchDetail: '위험할 때 오른쪽 대시 버튼을 누르세요',
      progress: move.progress
    };
  }

  // Collecting XP and using dash must never block navigation to an open seal.
  if (xp && !xp.complete && !circuit.ready) {
    return {
      stepId: 'xp',
      stepNumber: 2,
      color: xp.color,
      title: 'XP를 모아 첫 룬 선택',
      action: '푸른 조각을 향해 이동',
      body: '봉인으로 가는 길에 XP를 모으세요',
      detail: '레벨이 오르면 전투가 멈추고 룬을 고릅니다',
      progress: xp.progress
    };
  }

  return {
    stepId: 'circuit',
    stepNumber: 3,
    color: '#d4a84c',
    title: circuit.ready ? '금빛 원 안에서 봉인 열기' : '첫 봉인으로 이동',
    action: `${circuit.direction?.arrow ?? ''} ${circuit.nextSite.label} · ${circuit.distance}m`,
    body: circuit.ready
      ? '잠시 머무르면 무기 강화 보상을 받습니다'
      : `XP를 모으며 이동 · ${Math.ceil(circuit.unlockIn)}초 뒤 열림`,
    detail: '위험할 때 Space로 대시하세요',
    touchDetail: '위험할 때 오른쪽 대시 버튼을 누르세요',
    progress: 0
  };
}
