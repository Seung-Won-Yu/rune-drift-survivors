import { SHRINE_SITES } from '../config/gameData.js';
import {
  formatFocusLevel,
  getBuildSynergyStates,
  getDominantBuild,
  getRunPhase
} from '../systems/progression.js';
import { getOpeningObjectives, getRunResultSummary } from '../systems/runProgress.js';
import { formatTime } from './formatters.js';
import { UpgradeCard } from './UpgradeCard.jsx';

export function PauseOverlay({ game, onResume, onRestart }) {
  const dominantBuild = getDominantBuild(game);
  const activeObjectives = getOpeningObjectives(game).filter(objective => !objective.complete).slice(0, 2);
  return (
    <section className="modalLayer pauseLayer" aria-label="게임 일시정지">
      <div className="runePanel pausePanel">
        <header className="runePanelHeader">
          <div>
            <p className="eyebrow">RIFT SUSPENDED</p>
          <h1>균열이 잠시 멈췄습니다</h1>
          </div>
          <span className="runePanelMark" aria-hidden="true">ᚱ</span>
        </header>
        <div className="pauseLedger">
          <dl className="pauseStats">
            <div><dt>생존</dt><dd>{formatTime(game.time)}</dd></div>
            <div><dt>파동</dt><dd>{game.wave}</dd></div>
            <div><dt>처치</dt><dd>{game.kills}</dd></div>
            <div><dt>주력 룬</dt><dd>{dominantBuild ? dominantBuild.label : '탐색 중'}</dd></div>
          </dl>
          <div className="controlGrid" aria-label="조작 안내">
            <span><b>WASD</b><small>이동</small></span>
            <span><b>SPACE</b><small>대시</small></span>
            <span><b>P / ESC</b><small>일시정지</small></span>
            <span><b>CLICK</b><small>각인 선택</small></span>
          </div>
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
          <button className="runeButton primaryButton" type="button" aria-label="계속하기" onClick={onResume}>균열로 돌아가기</button>
          <button className="runeButton secondaryButton" type="button" onClick={onRestart}>새 룬으로 시작</button>
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
      <div className="runeDraft upgradePanel rewardBoard">
        <header className="runeDraftHeader upgradeHeader">
          <div className="upgradeHeaderCopy">
            <p className="eyebrow">RUNE INSCRIPTION · {runPhase.label}</p>
            <h1>{runPhase.cardCue}</h1>
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
              onChoose={onChoose}
            />
          ))}
        </div>
      </div>
    </section>
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
      <div className="runePanel endPanel">
        <header className="runePanelHeader resultHeader">
          <div>
            <p className="eyebrow">{didWin ? 'RIFT SEALED' : 'INSCRIPTION BROKEN'}</p>
            <h1>{didWin ? '5분 생존에 성공했습니다' : '룬이 끊어졌습니다'}</h1>
          </div>
          <span className="runePanelMark" aria-hidden="true">{didWin ? '◇' : '×'}</span>
        </header>
        <div className="resultStats">
          <span><small>생존</small><b>{formatTime(game.time)}</b></span>
          <span><small>레벨</small><b>{game.level}</b></span>
          <span><small>처치</small><b>{game.kills}</b></span>
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
            <em>최고 DPS</em>
            <b>{resultSummary.topWeapon.label}</b>
            <small>{resultSummary.topWeapon.dps} / s</small>
          </span>
          <span style={{ '--tone': resultSummary.synergy.color }}>
            <em>선호 조합</em>
            <b>{resultSummary.synergy.title}</b>
            <small>{resultSummary.synergy.detail}</small>
          </span>
          <span style={{ '--tone': '#d4a84c' }}>
            <em>제단 보상</em>
            <b>{resultSummary.shrines}</b>
            <small>{resultSummary.shrineLabels}</small>
          </span>
        </div>
        <button className="runeButton primaryButton" type="button" onClick={onRestart}>새 룬으로 다시 도전</button>
      </div>
    </section>
  );
}
