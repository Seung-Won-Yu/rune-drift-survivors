import { useRef } from 'react';

import { getDominantBuild, getRunPhase } from '../../systems/progression.js';
import { getOpeningObjectives, getRunPhaseObjectives } from '../../systems/runProgress.js';
import { ConfirmRestartButton } from '../ConfirmRestartButton.jsx';
import { formatTime } from '../formatters.js';
import { RuneIcon } from '../RuneIcon.jsx';
import { useDialogFocus } from '../useDialogFocus.js';

const QUALITY_OPTIONS = [
  { id: 'auto', label: '자동', detail: '기기 기준' },
  { id: 'low', label: '성능', detail: '효과 절약' },
  { id: 'balanced', label: '균형', detail: '권장 설정' },
  { id: 'high', label: '품질', detail: '세부 표현' }
];

const QUALITY_LABELS = {
  low: '성능',
  balanced: '균형',
  high: '품질'
};

export function PauseOverlay({
  game,
  onResume,
  onRestart,
  visualQuality = 'balanced',
  qualityMode = 'auto',
  onQualityModeChange,
  qualityLockedByUrl = false
}) {
  const dialogRef = useRef(null);
  const resumeButtonRef = useRef(null);
  const dominantBuild = getDominantBuild(game);
  const runPhase = getRunPhase(game);
  const openingObjectives = getOpeningObjectives(game);
  const phaseObjectives = getRunPhaseObjectives(game, runPhase, openingObjectives);
  const pendingObjectives = phaseObjectives.filter(objective => !objective.complete);
  const activeObjectives = (pendingObjectives.length > 0 ? pendingObjectives : phaseObjectives).slice(0, 2);
  useDialogFocus(dialogRef, resumeButtonRef);

  return (
    <section
      ref={dialogRef}
      className="modalLayer pauseLayer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-heading"
      aria-describedby="pause-description"
      tabIndex={-1}
    >
      <div className="runePanel pausePanel">
        <header className="runePanelHeader">
          <div>
            <p className="eyebrow">RIFT SUSPENDED</p>
            <h1 id="pause-heading">균열이 잠시 멈췄습니다</h1>
            <p className="pauseLead" id="pause-description">현재 각인을 확인하고 다음 움직임을 정리하세요.</p>
          </div>
          <span className="runePanelMark" aria-hidden="true"><RuneIcon name="circuit" /></span>
        </header>
        <div className="pauseLedger">
          <div className="pauseRunIdentity">
            <small>{runPhase.label} · RUN PULSE</small>
            <strong>{dominantBuild ? dominantBuild.label : '새 각인 탐색 중'}</strong>
            <p>{runPhase.goal}</p>
            <span>지금까지의 흐름은 그대로 보존됩니다</span>
          </div>
          <div className="pauseRunData">
            <dl className="pauseStats">
              <div><dt>생존</dt><dd>{formatTime(game.time)}</dd></div>
              <div><dt>파동</dt><dd>{game.wave}</dd></div>
              <div><dt>처치</dt><dd>{game.kills}</dd></div>
            </dl>
            <div className="controlGrid" aria-label="조작 안내">
              <span><b>WASD</b><small>이동</small></span>
              <span><b>SPACE</b><small>대시</small></span>
              <span><b>P / ESC</b><small>정지</small></span>
              <span><b>1 · 2 · 3</b><small>각인</small></span>
            </div>
          </div>
        </div>
        {activeObjectives.length > 0 && (
          <div className="pauseObjectives" aria-label={`${runPhase.label} 단계 목표`}>
            {activeObjectives.map(objective => (
              <span key={objective.id} style={{ '--tone': objective.color }}>
                {objective.label} <b>{objective.displayValue} / {objective.displayTarget}</b>
              </span>
            ))}
          </div>
        )}
        <div className="qualitySettings">
          <div className="qualitySettingsCopy">
            <span>
              <small>DISPLAY PROFILE</small>
              <b>그래픽 품질</b>
            </span>
            <p>
              {qualityLockedByUrl
                ? `개발 주소에서 ${QUALITY_LABELS[visualQuality]} 모드로 고정됨`
                : `현재 ${QUALITY_LABELS[visualQuality]} · 전투 규칙은 모든 모드에서 동일`}
            </p>
          </div>
          <div className="qualityChoices" role="group" aria-label="그래픽 품질 선택">
            {QUALITY_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                aria-label={option.label}
                aria-pressed={qualityMode === option.id}
                disabled={qualityLockedByUrl}
                onClick={() => onQualityModeChange?.(option.id)}
              >
                <b>{option.label}</b>
                <small>
                  {option.id === 'auto' && qualityMode === 'auto'
                    ? `현재 ${QUALITY_LABELS[visualQuality]}`
                    : option.detail}
                </small>
              </button>
            ))}
          </div>
        </div>
        <div className="pauseActions">
          <button ref={resumeButtonRef} className="runeButton primaryButton" type="button" aria-label="계속하기" onClick={onResume}>균열로 돌아가기</button>
          <ConfirmRestartButton
            className="runeButton secondaryButton"
            label="새 룬으로 시작"
            onConfirm={onRestart}
          />
        </div>
      </div>
    </section>
  );
}
