import { validGoal } from './progression.js';
import { SPECIALIZATIONS, SPECIALIZATION_RANK, SPECIALIZATION_LEVEL, RELICS, specializationFor } from './expansion.js';
import { EVOLUTIONS, UPGRADE_META, canEvolve } from './game.js';

export function goalMeta(id) {
  if (!validGoal(id)) return null;
  const [kind, key] = id.split(':');
  return {...(kind === 'branch' ? SPECIALIZATIONS[key] : kind === 'evolution' ? UPGRADE_META[key] : RELICS[key]), kind, key};
}
export function goalProgress(game) {
  const meta = goalMeta(game.goal);
  if (!meta) return null;
  const {kind, key, name} = meta;
  const complete = kind === 'relic' ? game.relics.includes(key) : game.ranks[key] > 0;
  if (complete) return {...meta, state: 'complete', text: `${name} 달성 · 여정을 마치면 도감에 기록`};
  if (kind === 'branch') {
    const branch = specializationFor(game, meta.weapon);
    return {...meta, state: branch ? 'changed' : 'preparing', text: branch ? `${name} · 다른 갈래를 골랐어요. 다음 판에 다시 도전` : `${name} · ${UPGRADE_META[meta.weapon].name} ${Math.min(SPECIALIZATION_RANK, game.ranks[meta.weapon])}/${SPECIALIZATION_RANK} · 레벨 ${Math.min(SPECIALIZATION_LEVEL, game.level)}/${SPECIALIZATION_LEVEL}`};
  }
  if (kind === 'evolution') {
    const path = EVOLUTIONS[key];
    return {...meta, state: 'preparing', text: canEvolve(game, key) ? `${name} 준비 완료 · 다음 성장에서 선택` : `${name} · ${UPGRADE_META[path.weapon].name} ${Math.min(3, game.ranks[path.weapon])}/3 · ${UPGRADE_META[path.support].name} ${Math.min(1, game.ranks[path.support])}/1 · 정예 ${Math.min(1, game.eliteKills)}/1`};
  }
  return {...meta, state: game.relics.length >= 2 ? 'missed' : 'preparing', text: game.relics.length >= 2 ? `${name} · 유물 자리를 모두 채웠어요. 다음 판에 다시 도전` : `${name} · 제단·상자의 보상 후보를 확인하세요`};
}
export function goalRelevant(game, key) {
  const meta = goalMeta(game.goal);
  if (!meta || goalProgress(game).state !== 'preparing') return false;
  if (meta.key === key) return true;
  if (meta.kind === 'branch') return key === meta.weapon && game.ranks[key] < SPECIALIZATION_RANK;
  if (meta.kind === 'evolution') {
    const path = EVOLUTIONS[meta.key];
    return key === path.weapon && game.ranks[key] < 3 || key === path.support && game.ranks[key] < 1;
  }
  return false;
}
export function goalChoiceLabel(game, key) {
  if (!goalRelevant(game,key)) return '';
  return goalMeta(game.goal).key === key ? '이번 판의 목표' : '이번 판의 목표 · 재료';
}
