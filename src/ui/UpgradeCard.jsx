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
      className={`upgradeCard rewardCard family-${visualFamilyKey} rarity-${cardMeta.rarity} ${cardMeta.recommended ? 'isRecommended' : ''}`}
      type="button"
      style={{ '--tone': tone, '--icon-tone': iconMeta.color ?? tone }}
      aria-label={`${displayTitle}: ${cardMeta.quickSummary}, ${cardMeta.statLine}`}
      onClick={() => onChoose(choice)}
    >
      <span className="rewardCardCorner" aria-hidden="true">{index + 1}</span>
      <div className="rewardCardHeader">
        <span className="rewardCardBadge">{cardMeta.rarityLabel}</span>
        <span className="rewardCardRole">{cardMeta.recommended ? cardMeta.reason : cardMeta.role}</span>
      </div>
      <div className="rewardCardArt" aria-hidden="true">
        <span className="rewardCardType">{cardMeta.quickLead}</span>
        <span className="rewardCardEmblem">
          <i className="upgradeSigil">{iconMeta.glyph}</i>
        </span>
        <span className="rewardCardFamily">{choice.family}</span>
        {cardMeta.recommended && <span className="rewardCardRecommend">추천</span>}
      </div>
      <div className="rewardCardCopy">
        <small>{choice.branch} · {cardMeta.role}</small>
        <strong>{displayTitle}</strong>
        <p>{cardMeta.quickSummary}</p>
      </div>
      <div className="rewardCardStats">
        <small>{cardMeta.decision}</small>
        <b>{cardMeta.statLine}</b>
        <span>{cardMeta.progressLabel || cardMeta.payoff}</span>
      </div>
      {cardMeta.tags.length > 0 && (
        <div className="rewardCardTags" aria-hidden="true">
          {cardMeta.tags.map(tag => <span key={tag}>{tag}</span>)}
        </div>
      )}
      <span className="upgradePickCta">선택</span>
    </button>
  );
}
