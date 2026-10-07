import { EVOLUTIONS, UPGRADE_META } from './game.js';
import { SPECIALIZATIONS, specializationFor } from './expansion.js';

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
  return {
    family, rank, branch, evolution, art, name,
    color: meta.color,
    description: evolution === 'comet' && branch === 'wildfire'
      ? '연소 전문화를 유지하며 불의 지속 피해를 강화합니다.'
      : meta.description,
    stage: evolution ? 'evolved' : branch ? 'specialized' : 'basic',
    stageLabel: evolution ? '진화' : branch ? '전문화' : '',
    branchName: branch ? SPECIALIZATIONS[branch].name : '',
    label: `${name} ${rank}단계${branch ? ` · ${SPECIALIZATIONS[branch].name}` : ''}`
  };
}

export function weaponLoadout(game) {
  return WEAPON_FAMILIES.map(family => weaponPresentation(game, family));
}

// Include the permanent fork even when the base rank hasn't changed.
export const weaponBeltKey = loadout => loadout.map(w => `${w.family}:${w.rank}:${w.branch ?? ''}:${w.evolution ?? ''}`).join('|');
