import { getUpgradeVisualFamilyKey } from '../systems/progression.js';
import {
  getUpgradeCardMeta,
  getUpgradeDisplayTitle,
  getUpgradeIconMeta,
  getUpgradeTone
} from '../systems/upgradePresentation.js';

export function UpgradeCard({ game, choice, index, onChoose }) {
  const cardMeta = getUpgradeCardMeta(game, choice);
  const displayTitle = getUpgradeDisplayTitle(game, choice);
  const visualFamilyKey = getUpgradeVisualFamilyKey(choice);
  const iconMeta = getUpgradeIconMeta(choice);
  const tone = getUpgradeTone(choice);

  return (
    <button
      className={`runeChoice upgradeCard rewardCard family-${visualFamilyKey} rarity-${cardMeta.rarity} ${cardMeta.recommended ? 'isRecommended' : ''}`}
      type="button"
      style={{ '--tone': tone, '--icon-tone': iconMeta.color ?? tone }}
      aria-label={`${displayTitle}: ${cardMeta.quickSummary}, ${cardMeta.statLine}`}
      onClick={() => onChoose(choice)}
    >
      <span className="runeChoiceIndex rewardCardCorner" aria-hidden="true">0{index + 1}</span>
      <span className="runeChoiceRail" aria-hidden="true" />
      <div className="runeChoiceBody">
        <header className="rewardCardHeader">
          <span>
            <b className="rewardCardBadge">{cardMeta.rarityLabel}</b>
            <small className="rewardCardFamily">{choice.family}</small>
          </span>
          <span className="rewardCardRole">{cardMeta.recommended ? cardMeta.reason : cardMeta.role}</span>
        </header>
        <div className="rewardCardMain">
          <div className="runeChoiceSigil rewardCardArt" aria-hidden="true">
            <span className="rewardCardEmblem">
              <i className="upgradeSigil">{iconMeta.glyph}</i>
            </span>
          </div>
          <div className="rewardCardCopy">
            <small>{cardMeta.quickLead}</small>
            <strong>{displayTitle}</strong>
            <p>{cardMeta.quickSummary}</p>
          </div>
        </div>
        <div className="rewardCardStats">
          <small>{cardMeta.decision}</small>
          <b>{cardMeta.statLine}</b>
          <span>{cardMeta.progressLabel || cardMeta.payoff}</span>
        </div>
        <footer className="rewardCardFooter">
          {cardMeta.tags.length > 0 && (
            <div className="rewardCardTags" aria-hidden="true">
              {cardMeta.tags.map(tag => <span key={tag}>{tag}</span>)}
            </div>
          )}
          <span className="upgradePickCta">선택 <i aria-hidden="true">→</i></span>
        </footer>
      </div>
    </button>
  );
}
