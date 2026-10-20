import { EVOLUTIONS, UPGRADE_META, canEvolve, nextEvolution } from './game.js';
import { weaponLoadout } from './weapon-presentation.js';
import { collectionArt } from './collection-art.js';

// Presentation reads the current run; it never grants ranks or advances time.
export function evolutionProgress(game, key) {
  const recipe = EVOLUTIONS[key];
  if (!recipe) return null;
  const parts = [
    {name: UPGRADE_META[recipe.weapon].name, value: game.ranks[recipe.weapon], target: 3},
    {name: UPGRADE_META[recipe.support].name, value: game.ranks[recipe.support], target: 1},
    {name: '정예 처치', value: game.eliteKills, target: 1}
  ].map(part => ({...part, value: Math.min(part.target, part.value), done: part.value >= part.target}));
  return {key, name: UPGRADE_META[key].name, complete: !!game.ranks[key], ready: canEvolve(game, key), parts};
}
export function upgradeRecipeHint(game, key) {
  if (EVOLUTIONS[key]) return '조건 완성 · 지금 진화';
  const paths = Object.keys(EVOLUTIONS).filter(id => {
    const path = EVOLUTIONS[id];
    return !game.ranks[id] && (path.weapon === key && game.ranks[key] < 3 || path.support === key && game.ranks[key] < 1);
  });
  return paths.length ? `${paths.map(id => UPGRADE_META[id].name).join(' · ')} 재료` : '';
}
const recipeMarkup = progress => progress.complete ? '<span class="recipe-complete">진화 완료</span>' : `<span class="recipe-parts">${progress.parts.map(part => `<span class="${part.done ? 'is-met' : ''}">${part.done ? '✓ ' : ''}${part.name} <b>${part.value}/${part.target}</b></span>`).join('')}</span>`;
export function growthContext(game) {
  const next = nextEvolution(game), progress = evolutionProgress(game, next);
  return `<section class="growth-context" aria-label="현재 무기와 다음 진화"><div class="growth-loadout">${weaponLoadout(game).map(w => `<span class="${w.rank ? '' : 'is-empty'}">${collectionArt(w.art)}<span>${w.rank ? `${w.name} <b>${w.rank}단계</b>` : '빈 무기 자리'}</span></span>`).join('')}</div>${progress ? `<div class="growth-recipe"><strong>${progress.name}</strong>${recipeMarkup(progress)}${progress.ready ? '<small>다음 선택에서 진화 가능</small>' : ''}</div>` : '<p class="growth-recipe">세 무기 진화 완료</p>'}</section>`;
}
export function fieldLoadout(game) {
  return `<section class="field-loadout" aria-label="현재 장비와 진화"><div class="field-section-heading"><h2>이번 여정의 무기</h2><span>현재 강화와 진화 조건</span></div><div class="field-weapons">${weaponLoadout(game).map(w => {
    const evolution = Object.keys(EVOLUTIONS).find(key => EVOLUTIONS[key].weapon === w.family);
    const progress = evolutionProgress(game, evolution);
    return `<article class="field-weapon${w.rank ? '' : ' is-empty'}" data-build-weapon="${w.family}" tabindex="-1"><div class="field-weapon-heading">${collectionArt(w.art)}<div><small>${w.rank ? `${w.rank}단계 / ${UPGRADE_META[w.family].max}` : '아직 획득하지 않음'}</small><h3>${w.name}</h3><span>${w.branchName || (w.rank ? '기본 전투법' : '성장 선택으로 획득')}</span></div></div><div class="rank-marks" aria-hidden="true">${Array.from({length:UPGRADE_META[w.family].max},(_,i)=>`<i class="${i<w.rank?'is-filled':''}"></i>`).join('')}</div><p>${progress.name} ${progress.complete ? '' : progress.ready ? '· 준비 완료' : '진화'}</p>${recipeMarkup(progress)}</article>`;
  }).join('')}</div></section>`;
}
