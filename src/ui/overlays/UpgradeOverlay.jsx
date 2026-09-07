import { useEffect, useRef } from 'react';

import { formatFocusLevel, getBuildSynergyStates, getRunPhase } from '../../systems/progression.js';
import { getUpgradeCardMeta } from '../../systems/upgradePresentation.js';
import { isOpeningDraft } from '../../systems/openingUpgradePresentation.js';
import { UpgradeCard } from '../UpgradeCard.jsx';
import { RuneIcon } from '../RuneIcon.jsx';
import { useDialogFocus } from '../useDialogFocus.js';

export function UpgradeOverlay({ game, choices, onChoose }) {
  const dialogRef = useRef(null);
  const synergyStates = getBuildSynergyStates(game);
  const visibleSynergies = synergyStates
    .filter(synergy => synergy.level > 0 || synergy.progress > 0)
    .slice(0, 3);
  const runPhase = getRunPhase(game);
  const opening = isOpeningDraft(game);
  const featuredChoiceId = choices.find(choice => getUpgradeCardMeta(game, choice).recommended)?.id ?? choices[0]?.id;
  useDialogFocus(dialogRef);

  useEffect(() => {
    const handleShortcut = event => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const index = Number(event.key) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= choices.length) return;
      event.preventDefault();
      onChoose(choices[index]);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [choices, onChoose]);

  return (
    <section ref={dialogRef} className="modalLayer rewardLayer" role="dialog" aria-modal="true" aria-labelledby="upgrade-heading" tabIndex={-1}>
      <div className={`runeDraft upgradePanel rewardBoard${opening ? ' isOpeningDraft' : ''}`}>
        <header className="runeDraftHeader upgradeHeader">
          <div className="upgradeHeaderCopy">
            <p className="eyebrow">RUNE INSCRIPTION <span>LV. {game.level}</span></p>
            <h1 id="upgrade-heading">{opening ? '첫 번째 힘을 새기세요' : '다음 힘을 선택하세요'}</h1>
            <small>{opening ? '첫 봉인까지 함께할 룬 하나를 고르세요' : runPhase.cardCue}</small>
          </div>
          <div className="upgradeHeaderStatus">
            <span className="upgradePauseNote"><RuneIcon name="pause" />전투 일시정지</span>
            {(game.pendingUpgrades ?? 0) > 1 && <span className="upgradeQueue">남은 선택 {game.pendingUpgrades}</span>}
          </div>
        </header>
        {visibleSynergies.length > 0 && (
          <div className="upgradeSynergyStrip" aria-label="빌드 조합 후보">
            {visibleSynergies.map(synergy => (
              <span key={synergy.id} style={{ '--tone': synergy.color }}>
                <strong>{synergy.title}</strong>
                <small>{synergy.label} · {synergy.level > 0 ? `공명 ${formatFocusLevel(synergy.level)}` : '후보'}</small>
              </span>
            ))}
          </div>
        )}
        <div className="upgradeGrid rewardChoices">
          {choices.map((choice, index) => (
            <UpgradeCard
              key={choice.id}
              game={game}
              choice={choice}
              index={index}
              featured={choice.id === featuredChoiceId}
              opening={opening}
              onChoose={onChoose}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
