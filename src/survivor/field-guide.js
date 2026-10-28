import { EVOLUTIONS, UPGRADE_META, canEvolve, nextEvolution } from './game.js';
import { SPECIALIZATIONS, SPECIALIZATION_RANK, SPECIALIZATION_LEVEL, specializationFor } from './expansion.js';
import { weaponLoadout } from './weapon-presentation.js';
import { collectionArt } from './collection-art.js';
import { goalProgress } from './goals.js';

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
export function growthChoice(game, key) {
  if (EVOLUTIONS[key]) return {kind:'evolution',label:'무기 진화',step:'조건 완성',action:'지금 진화하기'};
  if (SPECIALIZATIONS[key]) return {kind:'specialization',label:'전문화',step:'이번 판 한 갈래',action:'이 전투법 선택'};
  if (['sword','ember','orbit'].includes(key) && !game.ranks[key]) return {kind:'new',label:'새로운 무기',step:'1단계로 획득',action:'새 공격 추가'};
  if (key === 'heal') return {kind:'recovery',label:'즉시 회복',step:'현재 체력 회복',action:'체력 회복하기'};
  return {kind:key === 'vitality' ? 'recovery' : 'upgrade',label:key === 'vitality' ? '생존 강화' : '능력 강화',step:`${game.ranks[key]} → ${game.ranks[key]+1}단계`,action:'이 힘 강화'};
}
export function specializationPreview(game, key) {
  const branches = Object.keys(SPECIALIZATIONS).filter(id => SPECIALIZATIONS[id].weapon === key);
  if (!branches.length || game.ranks[key] >= SPECIALIZATION_RANK || specializationFor(game,key)) return null;
  return {weapon:key, branches, names:branches.map(id=>SPECIALIZATIONS[id].name).join(' · '),
    requirement:`${SPECIALIZATION_RANK}단계 · 레벨 ${SPECIALIZATION_LEVEL}부터 전투법 후보`};
}
export function upgradeRecipeHint(game, key) {
  if (EVOLUTIONS[key]) return '';
  // A card can help a second weapon even when the overview follows another route.
  return Object.entries(EVOLUTIONS).filter(([id, path]) => !game.ranks[id] &&
    (path.weapon === key && game.ranks[key] < 3 || path.support === key && game.ranks[key] < 1))
    .map(([id, path]) => {
      const target = path.weapon === key ? 3 : 1;
      const ready = (path.weapon === key ? game.ranks[key] + 1 >= 3 : game.ranks[path.weapon] >= 3) &&
        (path.support === key ? game.ranks[key] + 1 >= 1 : game.ranks[path.support] >= 1) && game.eliteKills >= 1;
      return `${UPGRADE_META[id].name} 진화 재료 · ${game.ranks[key]} → ${game.ranks[key] + 1}/${target}${ready ? ' · 다음 성장에 진화 가능' : ''}`;
    }).join(' / ');
}
const recipeMarkup = progress => progress.complete ? '<span class="recipe-complete">진화 완료</span>' : `<span class="recipe-parts">${progress.parts.map(part => `<span class="${part.done ? 'is-met' : ''}">${part.done ? '✓ ' : ''}${part.name} <b>${part.value}/${part.target}</b></span>`).join('')}</span>`;
export function goalGuidance(game) {
  const goal = goalProgress(game);
  if (!goal) return null;
  const parts = goal.kind === 'evolution' ? evolutionProgress(game,goal.key).parts : goal.kind === 'branch' ? [
    {name:UPGRADE_META[goal.weapon].name,value:Math.min(SPECIALIZATION_RANK,game.ranks[goal.weapon]),target:SPECIALIZATION_RANK,done:game.ranks[goal.weapon]>=SPECIALIZATION_RANK},
    {name:'레벨',value:Math.min(SPECIALIZATION_LEVEL,game.level),target:SPECIALIZATION_LEVEL,done:game.level>=SPECIALIZATION_LEVEL}
  ] : [];
  const offered = goal.state === 'preparing' && (game.phase === 'upgrade' && game.choices.includes(goal.key) || game.phase === 'relic' && game.relicChoices.includes(goal.key));
  const ready = goal.state === 'preparing' && parts.length > 0 && parts.every(part=>part.done);
  const label = {complete:'목표 달성',changed:'다른 갈래 선택',missed:'유물 자리 가득'}[goal.state] ?? (offered ? '지금 선택 가능' : ready ? '준비 완료' : '준비 중');
  const detail = goal.state === 'complete' ? '여정을 마치면 도감에 기록됩니다.' :
    goal.state === 'changed' ? '이번 판의 전투법은 유지됩니다. 다음 여정에서 다시 도전하세요.' :
    goal.state === 'missed' ? '유물 두 자리를 모두 채웠습니다. 다음 여정에서 다시 도전하세요.' :
    offered ? '아래의 목표 카드를 선택하면 달성합니다.' :
    goal.kind === 'relic' ? '제단·상자의 보상 후보를 확인하세요. 목표 유물이 나올 때 선택하세요.' :
    ready ? (goal.kind === 'evolution' ? '다음 성장에서 진화를 선택하세요.' : '성장 후보에 이 전투법이 나오면 선택하세요.') : '';
  return {...goal,parts,offered,ready,label,detail};
}
export function goalGuidanceMarkup(game) {
  const goal=goalGuidance(game);
  if (!goal) return '';
  return `<section class="goal-guidance" aria-label="이번 판의 목표" data-goal-state="${goal.state}" data-goal-offered="${goal.offered}"><span class="goal-guidance-art" aria-hidden="true">${collectionArt(goal.key)}</span><div class="goal-guidance-heading"><span>이번 판의 목표 <strong>${goal.name}</strong></span><small>${goal.label}</small></div>${goal.state === 'preparing' && goal.parts.length ? recipeMarkup({parts:goal.parts}) : ''}${goal.detail ? `<p>${goal.detail}</p>` : ''}</section>`;
}
export function evolutionGuidance(game) {
  const key = nextEvolution(game), progress = evolutionProgress(game, key);
  if (!progress) return {key, progress, kind:'complete', hint:'세 무기 진화 완료 · 마지막 대결을 준비하세요'};
  if (!game.ranks[EVOLUTIONS[key].weapon]) return {key, progress, kind:'new-weapon', hint:'보유 무기 진화 완료 · 새 무기로 다음 진화를 준비하세요'};
  return {key, progress, kind:'progress', hint: progress.ready ? `${progress.name} 준비 완료 · 다음 강화에서 선택`
    : `${progress.name} 진화 · ${progress.parts.map(p => `${p.name} ${p.value}/${p.target}`).join(' · ')}`};
}
export function growthContext(game) {
  const {key:next, progress, kind} = evolutionGuidance(game);
  const target=goalGuidanceMarkup(game);
  return `<section class="growth-context" aria-label="현재 무기와 ${target ? '이번 판의 목표' : '다음 진화'}"><div class="growth-loadout">${weaponLoadout(game).map(w => `<span class="${w.rank ? '' : 'is-empty'}">${collectionArt(w.art)}<span>${w.rank ? `${w.name} <b>${w.rank}단계</b>` : '빈 무기 자리'}</span></span>`).join('')}</div>${target || (kind === 'new-weapon' ? '<div class="growth-recipe"><strong>보유 무기 진화 완료</strong><span>새 무기를 얻으면 다음 진화를 준비할 수 있어요.</span></div>' : progress ? `<div class="growth-recipe"><strong>다음 진화 · ${progress.name}</strong>${game.choices.includes(next) ? '<span class="recipe-complete">조건 완성 · 아래에서 진화하세요</span>' : recipeMarkup(progress)}</div>` : '<p class="growth-recipe">세 무기 진화 완료</p>')}</section>`;
}
export function fieldLoadout(game) {
  return `<section class="field-loadout" aria-label="현재 장비와 진화">${goalGuidanceMarkup(game)}<div class="field-section-heading"><h2>이번 여정의 무기</h2><span>현재 강화와 진화 조건</span></div><div class="field-weapons">${weaponLoadout(game).sort((a,b) => Number(!!b.rank) - Number(!!a.rank)).map(w => {
    const evolution = Object.keys(EVOLUTIONS).find(key => EVOLUTIONS[key].weapon === w.family);
    const progress = evolutionProgress(game, evolution);
    return `<article class="field-weapon${w.rank ? '' : ' is-empty'}" data-build-weapon="${w.family}" tabindex="-1"><div class="field-weapon-heading">${collectionArt(w.art)}<div><small>${w.rank ? `${w.rank}단계 / ${UPGRADE_META[w.family].max}` : '아직 획득하지 않음'}</small><h3>${w.name}</h3><span>${w.branchName || (w.rank ? '기본 전투법' : '성장 선택으로 획득')}</span></div></div>${w.rank ? `<p class="field-weapon-effect">${w.description}</p>` : ''}<div class="rank-marks" aria-hidden="true">${Array.from({length:UPGRADE_META[w.family].max},(_,i)=>`<i class="${i<w.rank?'is-filled':''}"></i>`).join('')}</div><p>${progress.name} ${progress.complete ? '' : progress.ready ? '· 준비 완료' : '진화'}</p>${recipeMarkup(progress)}</article>`;
  }).join('')}</div></section>`;
}
