import { EVOLUTIONS, UPGRADE_META, canEvolve } from './game.js';
import { SPECIALIZATIONS, specializationFor } from './expansion.js';
import { emberHops } from './ember-chain.js';

export const WEAPON_FAMILIES = ['sword', 'ember', 'orbit'];

// The same chosen weapon identity follows the player from a growth card to the HUD.
// Reading it never grants an upgrade, a discovery, or a combat effect.
export function weaponPresentation(game, family) {
  if (!WEAPON_FAMILIES.includes(family)) return null;
  const branch = specializationFor(game, family) ?? null;
  const evolution = Object.keys(EVOLUTIONS).find(key => EVOLUTIONS[key].weapon === family && game.ranks[key]) ?? null;
  const art = evolution ?? branch ?? family;
  const meta = UPGRADE_META[art];
  const name = UPGRADE_META[evolution ?? family].name;
  const rank = game.ranks[family];
  const ready = !evolution && Object.keys(EVOLUTIONS).some(key => EVOLUTIONS[key].weapon === family && canEvolve(game, key));
  return {
    family, rank, branch, evolution, art, name, ready,
    color: meta.color,
    description: (evolution === 'comet' && branch === 'wildfire'
      ? '연소 전문화를 유지하며 불의 지속 피해를 강화합니다.'
      : meta.description) + (family==='ember' && rank>=3
        ? ` 보조 불씨는 새 적 ${emberHops(rank)}명까지 도약합니다. 도약마다 피해는 절반이며 폭발은 반복하지 않습니다.`
        : family==='orbit' && rank>=3 ? ` 이동 중 앞뒤 궤도는 ${rank>=5?'55':'30'}% 길어지고 옆은 ${rank>=5?'40':'25'}% 좁아집니다. 멈추면 원형으로 돌아옵니다.` : ''),
    stage: evolution ? 'evolved' : branch ? 'specialized' : 'basic',
    stageLabel: evolution ? '진화' : ready ? '진화 가능' : branch ? '전문화' : '',
    branchName: branch ? SPECIALIZATIONS[branch].name : '',
    label: `${name} ${rank}단계${branch ? ` · ${SPECIALIZATIONS[branch].name}` : ''}${ready ? ' · 진화 가능' : ''}`
  };
}

export function weaponLoadout(game) {
  return WEAPON_FAMILIES.map(family => weaponPresentation(game, family));
}

// Include the permanent fork even when the base rank hasn't changed.
export const weaponBeltKey = loadout => loadout.map(w => `${w.family}:${w.rank}:${w.branch ?? ''}:${w.evolution ?? ''}:${w.ready}`).join('|');
