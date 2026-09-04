import { getUpgradeVisualFamilyKey } from '../systems/progression.js';
import {
  getUpgradeCardMeta,
  getUpgradeDisplayTitle,
  getUpgradeIconMeta,
  getUpgradeTone
} from '../systems/upgradePresentation.js';
import { RuneIcon } from './RuneIcon.jsx';

export function UpgradeCard({ game, choice, index, featured = false, onChoose }) {
  const cardMeta = getUpgradeCardMeta(game, choice);
  const displayTitle = getUpgradeDisplayTitle(game, choice);
  const visualFamilyKey = getUpgradeVisualFamilyKey(choice);
  const iconMeta = getUpgradeIconMeta(choice);
  const tone = getUpgradeTone(choice);
  const atlasUrl = `${import.meta.env.BASE_URL}art/ui/rune-upgrade-atlas-v1.png`;
  const rarityLabel = cardMeta.recommended && !featured && cardMeta.rarity === 'uncommon'
    ? '강화'
    : cardMeta.rarityLabel;
  const roleLabel = featured ? cardMeta.reason : cardMeta.role;

  return (
    <button
      className={`runeChoice upgradeCard rewardCard family-${visualFamilyKey} rarity-${cardMeta.rarity} ${featured ? 'isRecommended' : ''}`}
      type="button"
      style={{
        '--tone': tone,
        '--icon-tone': iconMeta.color ?? tone,
        '--choice-order': index,
        '--icon-x': `${iconMeta.atlasX}%`,
        '--icon-y': `${iconMeta.atlasY}%`
      }}
      aria-label={`${featured ? '추천, ' : ''}${displayTitle}: ${cardMeta.quickSummary}, ${cardMeta.statLine}`}
      aria-keyshortcuts={`${index + 1}`}
      onClick={() => onChoose(choice)}
    >
      <span className="runeChoiceRail" aria-hidden="true" />
      <div className="runeChoiceBody">
        <header className="rewardCardHeader">
          <span className="rewardCardIdentity">
            <b className="rewardCardBadge">{rarityLabel}</b>
            <small className="rewardCardFamily">{choice.family}</small>
          </span>
          <span className="rewardCardRole">
            {featured && <RuneIcon name="spark" className="recommendationRune" />}
            {roleLabel}
          </span>
        </header>
        <div className="rewardCardMain">
          <div className="runeChoiceSigil rewardCardArt" aria-hidden="true">
            <span className="upgradeIconSprite" style={{ backgroundImage: `url(${atlasUrl})` }} />
          </div>
          <div className="rewardCardCopy">
            <small>{cardMeta.quickLead}</small>
            <strong>{displayTitle}</strong>
            <p>{cardMeta.quickSummary}</p>
          </div>
        </div>
        <div className="rewardCardStats">
          <small>{cardMeta.decision} · 즉시 적용</small>
          <b>{cardMeta.statLine}</b>
          <span>{cardMeta.progressLabel || cardMeta.payoff}</span>
        </div>
        <footer className="rewardCardFooter">
          {cardMeta.tags.length > 0 && (
            <div className="rewardCardTags" aria-hidden="true">
              {cardMeta.tags.slice(0, 1).map(tag => <span key={tag}>{tag}</span>)}
            </div>
          )}
          <span className="upgradePickCta">
            <kbd>{index + 1}</kbd>
            룬 새기기
            <RuneIcon name="forward" />
          </span>
        </footer>
      </div>
    </button>
  );
}
