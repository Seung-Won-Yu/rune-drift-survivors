import { SHRINE_SITES } from '../config/gameData.js';
import {
  formatFocusLevel,
  getBuildSynergyStates,
  getDominantBuild,
  getRunPhase,
  getUpgradeCardMeta,
  getUpgradeDisplayTitle,
  getUpgradeIconMeta,
  getUpgradeTone,
  getUpgradeVisualFamilyKey
} from '../systems/progression.js';
import { getOpeningObjectives, getRunResultSummary } from '../systems/runProgress.js';
import { formatTime } from './formatters.js';

export function PauseOverlay({ game, onResume, onRestart }) {
  const dominantBuild = getDominantBuild(game);
  const activeObjectives = getOpeningObjectives(game).filter(objective => !objective.complete).slice(0, 2);
  return (
    <section className="modalLayer pauseLayer" aria-label="게임 일시정지">
      <div className="pausePanel">
        <div>
          <p className="eyebrow">Paused</p>
          <h1>균열이 잠시 멈췄습니다</h1>
        </div>
        <div className="pauseStats">
          <span>생존 <b>{formatTime(game.time)}</b></span>
          <span>Wave <b>{game.wave}</b></span>
          <span>KOs <b>{game.kills}</b></span>
          <span>빌드 <b>{dominantBuild ? dominantBuild.label : '탐색 중'}</b></span>
        </div>
        <div className="controlGrid" aria-label="조작 안내">
          <span><b>WASD</b> 이동</span>
          <span><b>Space</b> 대시</span>
          <span><b>P / Esc</b> 일시정지</span>
          <span><b>마우스</b> 보상 선택</span>
        </div>
        {activeObjectives.length > 0 && (
          <div className="pauseObjectives">
            {activeObjectives.map(objective => (
              <span key={objective.id} style={{ '--tone': objective.color }}>
                {objective.label} <b>{objective.displayValue} / {objective.displayTarget}</b>
              </span>
            ))}
          </div>
        )}
        <div className="pauseActions">
          <button className="primaryButton" type="button" onClick={onResume}>계속하기</button>
          <button className="secondaryButton" type="button" onClick={onRestart}>다시 시작</button>
        </div>
      </div>
    </section>
  );
}

export function UpgradeOverlay({ game, choices, onChoose }) {
  const synergyStates = getBuildSynergyStates(game);
  const visibleSynergies = synergyStates
    .filter(synergy => synergy.level > 0 || synergy.progress > 0)
    .slice(0, 3);
  const runPhase = getRunPhase(game);
  return (
    <section className="modalLayer rewardLayer" aria-label="레벨업 보상 선택">
      <div className="upgradePanel rewardBoard">
        <div className="upgradeHeader">
          <div className="upgradeHeaderCopy">
            <p className="eyebrow">Level Up · {runPhase.label}</p>
            <h1>{runPhase.cardCue}</h1>
          </div>
          {(game.pendingUpgrades ?? 0) > 1 && <span className="upgradeQueue">보상 {game.pendingUpgrades}</span>}
        </div>
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
              onChoose={onChoose}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function UpgradeCard({ game, choice, index, onChoose }) {
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
      <span className="upgradeChoiceIndex" aria-hidden="true">{index + 1}</span>
      <span className="rewardCardBadge">{cardMeta.rarityLabel}</span>
      <span className="rewardCardRole">{cardMeta.recommended ? cardMeta.reason : cardMeta.role}</span>
      <div className="rewardCardArt" aria-hidden="true">
        <i className="upgradeSigil">{iconMeta.glyph}</i>
        {cardMeta.recommended && <span>추천</span>}
      </div>
      <div className="rewardCardCopy">
        <small>{choice.family} · {choice.branch}</small>
        <strong>{displayTitle}</strong>
        <p>{cardMeta.quickSummary}</p>
      </div>
      <div className="rewardCardStats">
        <b>{cardMeta.statLine}</b>
        <span>{cardMeta.payoff}</span>
      </div>
      <span className="upgradePickCta">선택</span>
    </button>
  );
}

export function EndOverlay({ game, onRestart }) {
  const didWin = game.result === 'victory';
  const dominantBuild = getDominantBuild(game);
  const openingObjectives = getOpeningObjectives(game);
  const completedOpeningObjectives = openingObjectives.filter(objective => objective.complete).length;
  const resultSummary = getRunResultSummary(game);
  return (
    <section className="modalLayer" aria-label="게임 종료">
      <div className="endPanel">
        <p className="eyebrow">{didWin ? 'Rift Sealed' : 'Run Complete'}</p>
        <h1>{didWin ? '5분 생존에 성공했습니다' : '룬이 끊어졌습니다'}</h1>
        <div className="resultStats">
          <span>{formatTime(game.time)}</span>
          <span>Level {game.level}</span>
          <span>{game.kills} KOs</span>
        </div>
        <div className="resultGrade" style={{ '--tone': resultSummary.gradeColor }}>
          <span>Run Grade</span>
          <strong>{resultSummary.grade}</strong>
          <small>{resultSummary.gradeLabel}</small>
        </div>
        <div className="runSummary">
          <span>첫 파동 목표 <b>{completedOpeningObjectives} / {openingObjectives.length}</b></span>
          <span>제단 활성화 <b>{game.shrineActivations ?? 0} / {SHRINE_SITES.length}</b></span>
          <span>정예 처치 <b>{game.eliteKills ?? 0}</b></span>
          <span>보스 처치 <b>{game.bossKills ?? 0}</b></span>
          <span>
            주력 빌드 <b>{dominantBuild ? `${dominantBuild.label} ${formatFocusLevel(dominantBuild.focus)}` : '미완성'}</b>
          </span>
        </div>
        <div className="resultHighlights">
          <span style={{ '--tone': resultSummary.topWeapon.color }}>
            최고 DPS <b>{resultSummary.topWeapon.label}</b>
            <small>{resultSummary.topWeapon.dps} / s</small>
          </span>
          <span style={{ '--tone': resultSummary.synergy.color }}>
            선호 조합 <b>{resultSummary.synergy.title}</b>
            <small>{resultSummary.synergy.detail}</small>
          </span>
          <span style={{ '--tone': '#fff1a6' }}>
            제단 보상 <b>{resultSummary.shrines}</b>
            <small>{resultSummary.shrineLabels}</small>
          </span>
        </div>
        <button className="primaryButton" type="button" onClick={onRestart}>다시 도전</button>
      </div>
    </section>
  );
}
