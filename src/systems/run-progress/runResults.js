import { DAMAGE_SOURCE_META, RUN_PHASES, SHRINE_SITES } from '../../config/gameData.js';
import { RUN_DURATION } from '../../config/gameTuning.js';
import { BUILD_FOCUS_META } from '../../config/upgrades.js';
import { createEmptyRunStats } from '../gameState.js';
import {
  formatFocusLevel,
  getBuildSynergyStates,
  getDominantBuild
} from '../progression.js';
import { getRuneCircuitState } from '../runeCircuit.js';

export function getDamageSourceBreakdown(game, limit = 3) {
  const damageBySource = { ...createEmptyRunStats().damageBySource, ...(game?.runStats?.damageBySource ?? {}) };
  const entries = Object.entries(damageBySource)
    .filter(([, damage]) => damage > 0)
    .sort((a, b) => b[1] - a[1]);
  const totalDamage = entries.reduce((total, [, damage]) => total + damage, 0);

  return entries.slice(0, Math.max(0, limit)).map(([source, damage]) => {
    const meta = DAMAGE_SOURCE_META[source] ?? DAMAGE_SOURCE_META.generic;
    const share = totalDamage > 0 ? damage / totalDamage : 0;
    const dps = game?.time > 0 ? damage / Math.max(1, game.time) : 0;
    return {
      source,
      damage,
      share,
      sharePercent: Math.round(share * 100),
      dps: dps.toFixed(1),
      ...meta
    };
  });
}

export function getRunDefenseSummary(game) {
  const runStats = game?.runStats ?? createEmptyRunStats();
  const damageTaken = Math.max(0, Number(runStats.damageTaken) || 0);
  const healingReceived = Math.max(0, Number(runStats.healingReceived) || 0);
  const damageByPhase = runStats.damageTakenByPhase ?? {};
  const dangerPhase = RUN_PHASES
    .map(phase => ({
      id: phase.id,
      label: phase.label,
      title: phase.title,
      color: phase.color,
      damage: Math.max(0, Number(damageByPhase[phase.id]) || 0)
    }))
    .reduce((danger, phase) => phase.damage > (danger?.damage ?? 0) ? phase : danger, null);

  return {
    damageTaken: Math.round(damageTaken),
    healingReceived: Math.round(healingReceived),
    dangerPhase: dangerPhase?.damage > 0
      ? { ...dangerPhase, damage: Math.round(dangerPhase.damage) }
      : null
  };
}

function getTopDamageSource(game) {
  return getDamageSourceBreakdown(game, 1)[0] ?? {
    source: 'generic',
    damage: 0,
    share: 0,
    sharePercent: 0,
    dps: '0.0',
    ...DAMAGE_SOURCE_META.generic
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
  const damageBreakdown = getDamageSourceBreakdown(game);
  const defense = getRunDefenseSummary(game);
  const synergy = getBuildSynergyStates(game).find(item => item.level > 0);
  const score = getRunScore(game);
  return {
    grade: score.grade,
    gradeLabel: score.label,
    gradeColor: score.color,
    score,
    outcome: getRunOutcome(game),
    topWeapon,
    damageBreakdown,
    defense,
    synergy: synergy
      ? { ...synergy, detail: `${synergy.label} ${formatFocusLevel(synergy.level)}` }
      : { title: '미완성', label: '조합 없음', detail: '다음 런에서 조합 완성', color: '#aa91cf' },
    shrines: `${game.shrineActivations ?? 0} / ${SHRINE_SITES.length}`,
    shrineLabels: getActivatedShrineLabels(game),
    replay: getReplaySuggestion(game)
  };
}

