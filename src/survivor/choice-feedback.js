import { EVOLUTIONS, UPGRADE_META, upgradeChange } from './game.js';
import { SPECIALIZATIONS, RELICS, relicEffect } from './expansion.js';
import { weaponPresentation } from './weapon-presentation.js';

// Capture the comparison before applying it; reading a reward never grants it.
export function choiceReceipt(game, key) {
  if (game.phase === 'relic') {
    const relic = RELICS[key];
    return relic && game.relicChoices.includes(key)
      ? {kind: 'relic', label: '유물 획득', name: relic.name, art: key, detail: relicEffect(game, key, true)} : null;
  }
  if (game.phase !== 'upgrade' || !game.choices.includes(key) || !UPGRADE_META[key]) return null;
  const weapon = weaponPresentation(game, key);
  const kind = EVOLUTIONS[key] ? 'evolution' : SPECIALIZATIONS[key] ? 'specialization' :
    key === 'heal' ? 'recovery' : weapon && !weapon.rank ? 'new' : 'upgrade';
  return {
    kind, label: {evolution:'무기 진화',specialization:'전투법 선택',recovery:'체력 회복',new:'새 무기 획득',upgrade:'강화 완료'}[kind],
    name: weapon?.name ?? UPGRADE_META[key].name,
    art: weapon?.art ?? key,
    detail: upgradeChange(game, key)
  };
}
