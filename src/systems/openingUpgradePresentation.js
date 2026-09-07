import { DASH_COOLDOWN } from '../config/gameTuning.js';
import { getBuildFocus, getOrbTargetCount } from './progression.js';

// Opening cards explain the action gained, then its use on the first-seal route.
// Later drafts keep their detailed rank and synergy presentation.
export function isOpeningDraft(game) {
  return game.level <= 3 && (game.shrineActivations ?? 0) === 0;
}

export function getOpeningUpgradeRead(game, upgrade) {
  const copy = {
    'orb-count': ['한 번에 더 많은 적을 자동으로 겨냥합니다', '지금 쓰는 기본 무기를 강화합니다'],
    'orb-fan': ['구체를 늘리는 대신 한 발의 피해가 줄어듭니다', '흩어진 적을 넓게 정리하기 좋습니다'],
    'orb-lance': ['구체가 커지고 더 강하게 관통합니다', '단단한 적을 상대하기 좋습니다'],
    pierce: ['구체가 적을 뚫고 뒤의 적까지 맞힙니다', '줄지어 따라오는 적을 정리하기 좋습니다'],
    magnet: ['더 멀리 있는 XP를 끌어당깁니다', '봉인으로 이동하며 XP를 모으기 좋습니다'],
    speed: ['적을 피해 더 빠르게 이동합니다', '봉인까지 이동하는 시간을 줄입니다'],
    dash: ['대시를 더 자주 사용할 수 있습니다', '포위됐을 때 다시 빠져나오기 좋습니다'],
    maxHp: ['최대 체력과 현재 체력이 함께 늘어납니다', '맞아도 버틸 여유를 확보합니다'],
    luck: ['같은 XP 조각에서 경험치를 더 얻습니다', '다음 레벨의 룬 선택을 앞당깁니다']
  }[upgrade.id];
  if (!copy) return null;

  const nextStats = upgrade.apply(game.stats);
  let statLine;
  if (upgrade.id === 'orb-count') {
    const focus = getBuildFocus(game, 'orb');
    statLine = `최대 표적 ${getOrbTargetCount(game.stats, focus)} → ${getOrbTargetCount(nextStats, focus + 1)}`;
  } else if (upgrade.id === 'maxHp') {
    statLine = `최대 체력 ${game.stats.maxHp} → ${nextStats.maxHp}`;
  } else if (upgrade.id === 'dash') {
    const seconds = stats => (DASH_COOLDOWN * stats.dashCooldown).toFixed(1);
    statLine = `대시 대기 ${seconds(game.stats)} → ${seconds(nextStats)}초`;
  }
  return { summary: copy[0], reason: copy[1], statLine };
}
