import { getCharacter } from './characters.js';
import { SPECIALIZATIONS } from './expansion.js';

export function validExperiment(characterId, key) {
  return typeof key === 'string' && Object.hasOwn(SPECIALIZATIONS, key) && SPECIALIZATIONS[key].weapon === getCharacter(characterId).weapon ? key : null;
}
export function nextExperiment(game, profile) {
  const weapon = getCharacter(game.characterId).weapon;
  const alternatives = Object.keys(SPECIALIZATIONS).filter(key => SPECIALIZATIONS[key].weapon === weapon && !game.ranks[key]);
  return alternatives.find(key => !profile.buildDiscoveries.includes(key)) ?? alternatives[0] ?? null;
}
export function experimentProgress(game) {
  const key = validExperiment(game.characterId, game.experiment);
  if (!key) return null;
  const target = SPECIALIZATIONS[key];
  if (game.ranks[key]) return { key, state: 'complete', text: `${target.name} 선택 완료` };
  const other = Object.keys(SPECIALIZATIONS).find(id => SPECIALIZATIONS[id].weapon === target.weapon && game.ranks[id]);
  if (other) return { key, state: 'changed', text: `${SPECIALIZATIONS[other].name}으로 방향을 바꿨습니다` };
  return { key, state: 'preparing', text: `${target.name} · ${Math.min(3, game.ranks[target.weapon])}/3단계 · 레벨 4부터 선택` };
}
