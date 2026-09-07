import { ConfirmRestartButton } from './ConfirmRestartButton.jsx';
import { FIELD_ITEM_META, SHRINE_SITES } from '../config/gameData.js';
import { OVERLOAD_DURATION } from '../config/gameTuning.js';
import { RuneIcon } from './RuneIcon.jsx';

export function HudMeter({ tone, label, value, pct, isLow = false, isHit = false }) {
  const icon = tone === 'hp' ? 'heart' : 'spark';
  return (
    <div className={`runeMeter runeMeter-${tone} hudMeter ${isLow ? 'isLow' : ''} ${isHit ? 'isHit' : ''}`}>
      <span className="runeMeterIcon"><RuneIcon name={icon} /></span>
      <div className="runeMeterBody">
        <div className="runeMeterText">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
        <div
          className="runeGauge"
          role="progressbar"
          aria-label={`${label} ${value}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export function HudActions({ game, onPause, onRestart, audioMuted, onToggleAudio }) {
  return (
    <div className="runeActions hudActions">
      <button
        className="runeIconButton iconButton"
        type="button"
        onClick={onToggleAudio}
        aria-label={audioMuted ? '사운드 켜기' : '사운드 끄기'}
        aria-pressed={audioMuted}
      >
        <RuneIcon name={audioMuted ? 'muted' : 'sound'} />
      </button>
      <button className="runeIconButton iconButton" type="button" onClick={onPause} aria-label={game.phase === 'paused' ? '계속하기' : '일시정지'}>
        <RuneIcon name={game.phase === 'paused' ? 'play' : 'pause'} />
      </button>
      <ConfirmRestartButton
        className="runeIconButton iconButton"
        compact
        onConfirm={onRestart}
      />
    </div>
  );
}

export function HudAlert({ alert }) {
  return (
    <span className={`runeAlert runeAlert-${alert.kind} hudAlert hudAlert-${alert.id}`} style={{ '--tone': alert.tone }}>
      <b>{alert.label}</b>
      <small>{alert.value}</small>
      {Number.isFinite(alert.pct) && <i style={{ width: `${alert.pct}%` }} />}
    </span>
  );
}

export function HudCircuit({ circuit }) {
  const status = circuit.ready ? '개방' : `${Math.ceil(circuit.unlockIn)}초 후 개방`;
  return (
    <div
      className={`runeCircuit ${circuit.complete ? 'isComplete' : circuit.ready ? 'isReady' : 'isLocked'}`}
      style={{ '--tone': circuit.nextSite?.color ?? 'var(--rune-mint)' }}
      aria-label={circuit.complete ? '룬 회로 완성' : '다음 룬 회로 봉인'}
    >
      <div className="runeCircuitProgress">
        <span>CIRCUIT {circuit.completed}/{circuit.total}</span>
        <ol className="runeSealTrack" aria-label="봉인 연결 상태">
          {SHRINE_SITES.map((site, index) => {
            const done = index < circuit.completed;
            const current = !circuit.complete && site.id === circuit.nextSite.id;
            return (
              <li key={site.id} className={done ? 'isConnected' : current ? 'isCurrent' : ''} aria-current={current ? 'step' : undefined} aria-label={`${site.label}: ${done ? '연결 완료' : current ? '다음 목표' : '대기'}`}>
                <span aria-hidden="true">{done ? '✓' : index + 1}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="runeCircuitDestination">
        <b className="runeCircuitDirection" role="img" aria-label={circuit.complete ? '연결 완료' : `${circuit.direction?.label} 방향`}>{circuit.complete ? '✓' : circuit.direction?.arrow}</b>
        <div>
          <strong>{circuit.complete ? '회로 연결 완료' : circuit.nextSite.label}</strong>
          <small>{circuit.complete ? '최종 공명 · 화력 +16%' : <><span className="runeCircuitReward">{circuit.nextSite.rewardLabel} · </span>{circuit.distance}m · <em>{status}</em></>}</small>
        </div>
      </div>
    </div>
  );
}

export function HudDetour({ detour }) {
  const meta = FIELD_ITEM_META[detour.type];
  return (
    <div className="runeDirective hudCoachCard hudDetourCard" style={{ '--tone': meta.color }} aria-label="선택 우회 보상">
      <div className="runeDirectiveIndex" aria-hidden="true"><span>OPTIONAL</span></div>
      <div className="runeDirectiveCopy">
        <strong>선택 우회 · {meta.name}</strong>
        <small>{detour.direction.arrow} {detour.direction.label} {detour.distance}m · {detour.remaining}초 후 소멸</small>
        <p>무기 폭주 {OVERLOAD_DURATION}초 · 건너뛰어도 진행</p>
      </div>
    </div>
  );
}

export function HudPrompt({ cue }) {
  return (
    <div className="runeDirective hudCoachCard" data-step={cue.stepId} style={{ '--tone': cue.color }} aria-label="초반 안내">
      <div className="runeDirectiveIndex" aria-hidden="true">
        <span>{cue.stepNumber} / 3</span>
        <i style={{ height: `${cue.progress * 100}%` }} />
      </div>
      <div className="runeDirectiveCopy">
        <strong>{cue.title}</strong>
        <small>
          <span className={cue.touchAction ? 'coachKeyboardAction' : undefined}>{cue.action}</span>
          {cue.touchAction && <span className="coachTouchAction">{cue.touchAction}</span>}
        </small>
        <p>{cue.body}</p>
        <em>
          <span className={cue.touchDetail ? 'coachKeyboardDetail' : undefined}>{cue.detail}</span>
          {cue.touchDetail && <span className="coachTouchDetail">{cue.touchDetail}</span>}
        </em>
      </div>
    </div>
  );
}

export function HudObjectives({
  runPhase,
  visibleObjectives,
  completedOpeningObjectives,
  completedPhaseObjectives,
  openingObjectiveCount,
  phaseObjectiveCount
}) {
  const completed = runPhase.id === 'learn' ? completedOpeningObjectives : completedPhaseObjectives;
  const total = runPhase.id === 'learn' ? openingObjectiveCount : phaseObjectiveCount;
  const phaseTitleId = `rune-objective-${runPhase.id}`;

  return (
    <div className="runeObjective hudObjectiveDock" role="region" aria-labelledby={phaseTitleId}>
      <div className="runeObjectivePhase">
        <span className="runeObjectiveMark" aria-hidden="true"><RuneIcon name="objective" /></span>
        <div>
          <span>RIFT ORDER</span>
          <strong id={phaseTitleId}>{runPhase.label}</strong>
        </div>
        <small>{completed}/{total}</small>
      </div>
      {visibleObjectives.slice(0, 1).map(objective => (
        <div key={objective.id} className="runeObjectiveTask" style={{ '--tone': objective.color }}>
          <span>{runPhase.goal} · {objective.title}</span>
          <strong>{objective.label}</strong>
          <small>{objective.displayValue} / {objective.displayTarget}</small>
          <div
            className="runeObjectiveProgress"
            role="progressbar"
            aria-label={`${objective.label} 진행도`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(Math.max(0, Math.min(1, objective.progress)) * 100)}
            aria-valuetext={`${objective.displayValue} / ${objective.displayTarget}`}
          >
            <i style={{ width: `${Math.max(0, Math.min(1, objective.progress)) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HudEncounter({ alert }) {
  const isBossSignal = alert.kind === 'boss' || alert.kind === 'boss-pattern';
  const icon = isBossSignal ? 'warden' : 'circuit';
  return (
    <div
      className={`runeEncounter hudEncounter ${isBossSignal ? 'isBoss' : ''}`}
      style={{ '--tone': alert.color }}
      data-kind={alert.kind}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="runeEncounterMark" aria-hidden="true"><RuneIcon name={icon} /></span>
      <div className="runeEncounterCopy">
        <span>{alert.label} · RIFT SIGNAL</span>
        <strong>{alert.title}</strong>
      </div>
      <small>{alert.hint}</small>
    </div>
  );
}

export function HudBossBar({ bossStatus }) {
  const patternLabel = getBossPatternLabel(bossStatus.patternLabel);
  const patternIcon = getBossPatternIcon(bossStatus.patternLabel);
  const bossHpPercent = Math.round(Math.max(0, Math.min(100, bossStatus.hpPct * 100)));
  return (
    <div
      className={`runeBoss hudBoss ${bossStatus.enraged ? 'isEnraged' : ''}`}
      style={{ '--tone': bossStatus.phaseColor, '--pattern': bossStatus.patternColor }}
      role="region"
      aria-label={`균열 감시자 ${bossStatus.phaseLabel} 단계`}
    >
      <div className="runeBossIdentity">
        <span className="runeBossSigil" aria-hidden="true"><RuneIcon name="warden" /></span>
        <div className="runeBossName">
          <span>RIFT WARDEN · BOSS</span>
          <strong>{bossStatus.phaseLabel}</strong>
          <small>Wave {bossStatus.wave}</small>
        </div>
      </div>
      <div className="runeBossVital">
        <div className="runeBossVitalMeta" aria-hidden="true">
          <span>VITALITY</span>
          <strong>{bossHpPercent}%</strong>
        </div>
        <div
          className="runeBossHp"
          role="progressbar"
          aria-label="보스 체력"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={bossHpPercent}
          aria-valuetext={`${bossHpPercent}%`}
        >
          <i style={{ width: `${bossHpPercent}%` }} />
        </div>
      </div>
      <div className={`runeBossPattern ${bossStatus.casting ? 'isCasting' : ''}`}>
        <span className="runeBossPatternIcon" aria-hidden="true"><RuneIcon name={patternIcon} /></span>
        <div>
          <span>{bossStatus.casting ? '시전' : '다음'} <b>{patternLabel}</b></span>
          <em>{bossStatus.patternCue ?? bossStatus.patternHint}</em>
        </div>
        <small>{bossStatus.patternStage}</small>
      </div>
    </div>
  );
}

function getBossPatternLabel(label) {
  const key = String(label ?? '').toLowerCase();
  if (key.includes('shock')) return '충격파';
  if (key.includes('summon')) return '소환';
  if (key.includes('ward') || key.includes('guard')) return '보호막';
  return label ?? '패턴';
}

function getBossPatternIcon(label) {
  const key = String(label ?? '').toLowerCase();
  if (key.includes('shock')) return 'shockwave';
  if (key.includes('summon')) return 'summon';
  if (key.includes('ward') || key.includes('guard')) return 'ward';
  return 'alert';
}
