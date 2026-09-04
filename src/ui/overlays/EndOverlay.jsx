import { useRef } from 'react';

import { formatFocusLevel, getDominantBuild } from '../../systems/progression.js';
import { getRunResultSummary } from '../../systems/runProgress.js';
import { formatTime } from '../formatters.js';
import { RuneIcon } from '../RuneIcon.jsx';
import { useDialogFocus } from '../useDialogFocus.js';

const OUTCOME_ICONS = {
  victory: 'circuit',
  survived: 'ward',
  defeat: 'alert'
};

const BUILD_ICONS = {
  orb: 'orb',
  storm: 'storm',
  blade: 'blade',
  chain: 'chain',
  nova: 'nova'
};

export function EndOverlay({ game, onRestart }) {
  const dialogRef = useRef(null);
  const replayButtonRef = useRef(null);
  const dominantBuild = getDominantBuild(game);
  const resultSummary = getRunResultSummary(game);
  const outcome = resultSummary.outcome;
  const dominantLabel = dominantBuild ? `${dominantBuild.label} ${formatFocusLevel(dominantBuild.focus)}` : '미완성';
  useDialogFocus(dialogRef, replayButtonRef);

  return (
    <section
      ref={dialogRef}
      className="modalLayer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-heading"
      aria-describedby="result-description"
      tabIndex={-1}
    >
      <div className={`runePanel endPanel outcome-${outcome.id}`} style={{ '--outcome-tone': outcome.color }}>
        <header className="runePanelHeader resultHeader">
          <div>
            <p className="eyebrow">{outcome.eyebrow}</p>
            <h1 id="result-heading">{outcome.title}</h1>
            <p className="resultOutcomeCopy" id="result-description">{outcome.detail}</p>
          </div>
          <span className="runePanelMark" style={{ color: outcome.color }} aria-hidden="true">
            <RuneIcon name={OUTCOME_ICONS[outcome.id] ?? 'circuit'} />
          </span>
        </header>
        <div className="resultVerdict">
          <div className="resultGrade" style={{ '--tone': resultSummary.gradeColor }}>
            <span>RUN GRADE</span>
            <strong>{resultSummary.grade}</strong>
            <small>{resultSummary.score.total} / 100 · {resultSummary.gradeLabel}</small>
          </div>
          <div className="resultStats">
            <span><small>생존</small><b>{resultSummary.score.survival} / 40</b><em>{formatTime(game.time)}</em></span>
            <span><small>룬 회로</small><b>{resultSummary.score.circuit} / 30</b><em>{resultSummary.shrines}</em></span>
            <span><small>빌드 정체성</small><b>{resultSummary.score.build} / 25</b><em>{dominantLabel}</em></span>
          </div>
        </div>
        <div className="runSummary">
          <span>레벨 <b>{game.level}</b></span>
          <span>총 처치 <b>{game.kills}</b></span>
          <span>정예 처치 <b>{game.eliteKills ?? 0}</b></span>
          <span>보스 처치 <b>{game.bossKills ?? 0}</b></span>
          <span>전투 보너스 <b>{resultSummary.score.combat} / 5</b></span>
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
          <span style={{ '--tone': 'var(--rune-ember)' }}>
            <em>룬 회로</em>
            <b>{resultSummary.shrines}</b>
            <small>{resultSummary.shrineLabels}</small>
          </span>
        </div>
        <div className="resultTelemetry">
          {resultSummary.damageBreakdown.length > 0 && (
            <section className="resultDamageMix" aria-label="공격 기여도">
              <header>
                <span>DAMAGE ROUTE</span>
                <small>전체 피해 상위 3개</small>
              </header>
              <div>
                {resultSummary.damageBreakdown.map(source => (
                  <span
                    key={source.source}
                    className="resultDamageRow"
                    style={{ '--tone': source.color, '--share': `${source.share * 100}%` }}
                    aria-label={`${source.label} 공격 기여도 ${source.sharePercent}%`}
                  >
                    <b>{source.label}</b>
                    <i aria-hidden="true" />
                    <em>{source.sharePercent}%</em>
                    <small>{source.dps} / s</small>
                  </span>
                ))}
              </div>
            </section>
          )}
          <section className="resultDefense" aria-label="생존 기록">
            <header>
              <span>SURVIVAL RECORD</span>
              <small>실제 체력 변화</small>
            </header>
            <div>
              <span><small>받은 피해</small><b>{resultSummary.defense.damageTaken}</b></span>
              <span><small>실제 회복</small><b>{resultSummary.defense.healingReceived}</b></span>
              <span style={{ '--tone': resultSummary.defense.dangerPhase?.color ?? 'var(--rune-mint)' }}>
                <small>위험 구간</small>
                <b>
                  {resultSummary.defense.dangerPhase
                    ? `${resultSummary.defense.dangerPhase.title} · ${resultSummary.defense.dangerPhase.damage}`
                    : '무피격'}
                </b>
              </span>
            </div>
          </section>
        </div>
        <aside className="resultReplay" style={{ '--tone': resultSummary.replay.color }} aria-label="다음 런 추천 빌드">
          <span aria-hidden="true"><RuneIcon name={BUILD_ICONS[resultSummary.replay.family] ?? 'circuit'} /></span>
          <div>
            <small>NEXT INSCRIPTION · 다른 전투 경로</small>
            <b>{resultSummary.replay.title}</b>
            <p>{resultSummary.replay.detail}</p>
          </div>
        </aside>
        <button
          ref={replayButtonRef}
          className="runeButton primaryButton"
          type="button"
          onClick={() => onRestart(resultSummary.replay.family)}
        >
          {resultSummary.replay.cta}
        </button>
      </div>
    </section>
  );
}
