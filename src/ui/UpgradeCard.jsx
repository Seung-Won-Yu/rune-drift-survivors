import { getUpgradeVisualFamilyKey } from '../systems/progression.js';
import { getOpeningUpgradeRead } from '../systems/openingUpgradePresentation.js';
import {
  getUpgradeCardMeta,
  getUpgradeDisplayTitle,
  getUpgradeIconMeta,
  getUpgradeTone
} from '../systems/upgradePresentation.js';
import { RuneIcon } from './RuneIcon.jsx';

export function UpgradeCard({ game, choice, index, featured = false, opening = false, onChoose }) {
  const cardMeta = getUpgradeCardMeta(game, choice);
  const openingRead = opening ? getOpeningUpgradeRead(game, choice) : null;
  const summary = openingRead?.summary ?? cardMeta.quickSummary;
  const statLine = openingRead?.statLine ?? cardMeta.statLine;
  const displayTitle = getUpgradeDisplayTitle(game, choice);
  const visualFamilyKey = getUpgradeVisualFamilyKey(choice);
  const iconMeta = getUpgradeIconMeta(choice);
  const tone = getUpgradeTone(choice);
  const atlasUrl = `${import.meta.env.BASE_URL}art/ui/rune-upgrade-atlas-v1.png`;
  const rarityLabel = cardMeta.recommended && !featured && cardMeta.rarity === 'uncommon'
    ? '강화'
    : cardMeta.rarityLabel;

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
      aria-label={`${featured ? '추천, ' : ''}${displayTitle}: ${summary}, ${statLine}${openingRead ? `, ${openingRead.reason}` : ''}`}
      aria-keyshortcuts={`${index + 1}`}
      onClick={() => onChoose(choice)}
    >
      <span className="runeChoiceRail" aria-hidden="true" />
      <div className="runeChoiceBody">
        <header className="rewardCardHeader">
          <span className="rewardCardIdentity">
            <b className="rewardCardBadge">{featured && <RuneIcon name="spark" />}{featured ? '추천' : rarityLabel}</b>
            <small className="rewardCardFamily">{choice.family}</small>
          </span>
          <span className="rewardCardNumber" aria-hidden="true">0{index + 1}</span>
        </header>
        <div className="rewardCardMain">
          <div className="runeChoiceSigil rewardCardArt" aria-hidden="true">
            <span className="upgradeIconSprite" style={{ backgroundImage: `url(${atlasUrl})` }} />
          </div>
          <div className="rewardCardCopy">
            <strong>{displayTitle}</strong>
            <p>{summary}</p>
          </div>
        </div>
        <div className="rewardCardStats">
          {opening ? (
            <>
              <b>{statLine}</b>
              <small className="openingUpgradeReason">{openingRead?.reason ?? cardMeta.payoff}</small>
            </>
          ) : (
            <>
              <b>{statLine}</b>
              <span>{cardMeta.progressLabel || cardMeta.payoff}</span>
            </>
          )}
        </div>
        <footer className="rewardCardFooter">
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
