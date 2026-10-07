import { getCharacter, isUnlocked } from './characters.js';
import { SPECIALIZATIONS, RELICS } from './expansion.js';

export const VOWS = {
  none: {name: '평온한 숲', hp: 1, damage: 1, xpBonus: 0, change: '기본 5분 여정'},
  mist: {name: '짙은 안개', hp: 1.15, damage: 1.15, xpBonus: .15, change: '적 체력 +15% · 받는 피해 +15% · 경험치 +15%'}
};
export const vowStats = id => Object.hasOwn(VOWS, id) ? VOWS[id] : VOWS.none;
export const canTakeVow = (profile, id) => id === 'none' || id === 'mist' && profile.wins > 0;
export const primaryBranches = id => Object.keys(SPECIALIZATIONS).filter(key => SPECIALIZATIONS[key].weapon === getCharacter(id).weapon);
export function masteryProgress(profile, id) {
  const row = profile.characters?.[getCharacter(id).id];
  return [
    {id: 'branches', name: '두 갈래 탐구', current: primaryBranches(id).filter(key => row?.branches?.includes(key)).length, target: 2},
    {id: 'evolution', name: '시작 무기 진화', current: Number(!!row?.evolved), target: 1},
    {id: 'victory', name: '군주 격파', current: Number(row?.wins > 0), target: 1}
  ];
}
export const masteryCount = (profile, id) => masteryProgress(profile, id).filter(seal => seal.current >= seal.target).length;
export function validInheritance(profile, id, key) {
  return isUnlocked(profile, id) && primaryBranches(id).includes(key) && profile.buildDiscoveries?.includes(key) ? key : null;
}
export function runPreparation(profile, id = profile.selected) {
  const goal = validGoal(profile.goal);
  const conflicts = goal?.startsWith('branch:') && primaryBranches(id).includes(goal.slice(7));
  return {inheritance: conflicts ? null : validInheritance(profile, id, profile.inheritances?.[id]), rerolls: masteryCount(profile, id) === 3 ? 2 : 1, vow: canTakeVow(profile, profile.vow) ? profile.vow : 'none', goal};
}
export function validGoal(id) {
  if (typeof id !== 'string') return null;
  const [kind, key, extra] = id.split(':');
  if (extra !== undefined) return null;
  return kind === 'branch' && Object.hasOwn(SPECIALIZATIONS, key) || kind === 'evolution' && ['dawn', 'comet', 'lunar'].includes(key) || kind === 'relic' && Object.hasOwn(RELICS, key) ? id : null;
}
export function goalFound(profile, id) {
  if (!validGoal(id)) return false;
  const [kind, key] = id.split(':');
  return (kind === 'branch' ? profile.buildDiscoveries : kind === 'evolution' ? profile.discoveries : profile.relicDiscoveries).includes(key);
}
