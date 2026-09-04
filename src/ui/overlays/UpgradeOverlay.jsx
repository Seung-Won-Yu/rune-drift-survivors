import { useEffect, useRef } from 'react';

import { formatFocusLevel, getBuildSynergyStates, getRunPhase } from '../../systems/progression.js';
import { getUpgradeCardMeta } from '../../systems/upgradePresentation.js';
import { UpgradeCard } from '../UpgradeCard.jsx';
import { useDialogFocus } from '../useDialogFocus.js';

export function UpgradeOverlay({ game, choices, onChoose }) {
  const dialogRef = useRef(null);
  const synergyStates = getBuildSynergyStates(game);
  const visibleSynergies = synergyStates
    .filter(synergy => synergy.level > 0 || synergy.progress > 0)
    .slice(0, 3);
  const runPhase = getRunPhase(game);
  const featuredChoiceId = choices.find(choice => getUpgradeCardMeta(game, choice).recommended)?.id ?? choices[0]?.id;
  useDialogFocus(dialogRef);

  useEffect(() => {
    const handleShortcut = event => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const index = Number(event.key) - 1;
      if (index < 0 || index >= choices.length) return;
      event.preventDefault();
      onChoose(choices[index]);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [choices, onChoose]);

  return (
    <section ref={dialogRef} className="modalLayer rewardLayer" role="dialog" aria-modal="true" aria-labelledby="upgrade-heading" tabIndex={-1}>
      <div className="runeDraft upgradePanel rewardBoard">
        <header className="runeDraftHeader upgradeHeader">
          <div className="upgradeHeaderCopy">
            <p className="eyebrow">RUNE INSCRIPTION · {runPhase.label}</p>
            <h1 id="upgrade-heading">{runPhase.cardCue}</h1>
            <small>하나의 룬을 골라 현재 빌드에 새깁니다</small>
          </div>
          {(game.pendingUpgrades ?? 0) > 1 && <span className="upgradeQueue">보상 {game.pendingUpgrades}</span>}
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
              onChoose={onChoose}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
