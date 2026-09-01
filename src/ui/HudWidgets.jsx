export function HudMeter({ tone, label, value, pct, isLow = false, isHit = false }) {
  const icon = tone === 'hp' ? '♥' : '✦';
  return (
    <div className={`runeMeter runeMeter-${tone} hudMeter ${isLow ? 'isLow' : ''} ${isHit ? 'isHit' : ''}`}>
      <span className="runeMeterIcon" aria-hidden="true">{icon}</span>
      <div className="runeMeterBody">
        <div className="runeMeterText">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
        <div className="runeGauge"><i style={{ width: `${pct}%` }} /></div>
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
        <span aria-hidden="true">{audioMuted ? '×' : '♪'}</span>
      </button>
      <button className="runeIconButton iconButton" type="button" onClick={onPause} aria-label={game.phase === 'paused' ? '계속하기' : '일시정지'}>
        <span aria-hidden="true">{game.phase === 'paused' ? '▶' : 'Ⅱ'}</span>
      </button>
      <button className="runeIconButton iconButton" type="button" onClick={onRestart} aria-label="다시 시작">
        <span aria-hidden="true">↻</span>
      </button>
    </div>
  );
}

export function HudAlert({ alert }) {
  return (
    <span className={`runeAlert runeAlert-${alert.kind} hudAlert`} style={{ '--tone': alert.tone }}>
      <b>{alert.label}</b>
      <small>{alert.value}</small>
      {Number.isFinite(alert.pct) && <i style={{ width: `${alert.pct}%` }} />}
    </span>
  );
}

export function HudCircuit({ circuit }) {
  if (circuit.complete) {
    return (
      <div className="runeCircuit isComplete" aria-label="룬 회로 완성">
        <span>CIRCUIT {circuit.completed}/{circuit.total}</span>
        <strong>COMPLETE</strong>
        <small>최종 공명 · 화력 +16%</small>
      </div>
    );
  }

  const status = circuit.ready ? 'READY' : `${Math.ceil(circuit.unlockIn)}s`;
  return (
    <div className={`runeCircuit ${circuit.ready ? 'isReady' : 'isLocked'}`} style={{ '--tone': circuit.nextSite.color }} aria-label="다음 룬 회로 봉인">
      <span>CIRCUIT {circuit.completed}/{circuit.total}</span>
      <strong>{circuit.direction?.arrow} {circuit.nextSite.label}</strong>
      <small>{circuit.distance}m · {status}</small>
    </div>
  );
}

export function HudPrompt({ cue }) {
  return (
    <div className="runeDirective hudCoachCard" style={{ '--tone': cue.color }} aria-label="초반 안내">
      <div className="runeDirectiveIndex" aria-hidden="true">
        <span>FIRST RUN</span>
        <i style={{ height: `${cue.progress * 100}%` }} />
      </div>
      <div className="runeDirectiveCopy">
        <strong>{cue.title}</strong>
        <small>{cue.action}</small>
        <p>{cue.body}</p>
        <em>{cue.detail}</em>
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

  return (
    <div className="runeObjective hudObjectiveDock" aria-label="현재 런 단계 목표">
      <div className="runeObjectivePhase">
        <span>RIFT ORDER</span>
        <strong>{runPhase.label}</strong>
        <small>{runPhase.goal} · {completed}/{total}</small>
      </div>
      {visibleObjectives.slice(0, 1).map(objective => (
        <div key={objective.id} className="runeObjectiveTask" style={{ '--tone': objective.color }}>
          <span>{objective.title}</span>
          <strong>{objective.label}</strong>
          <small>{objective.displayValue} / {objective.displayTarget}</small>
          <div aria-hidden="true"><i style={{ width: `${objective.progress * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function HudEncounter({ alert }) {
  return (
    <div
      className={`runeEncounter hudEncounter ${alert.kind === 'boss' || alert.kind === 'boss-pattern' ? 'isBoss' : ''}`}
      style={{ '--tone': alert.color }}
    >
      <span>{alert.label} · RIFT SIGNAL</span>
      <strong>{alert.title}</strong>
      <small>{alert.hint}</small>
    </div>
  );
}

export function HudBossBar({ bossStatus }) {
  const patternLabel = getBossPatternLabel(bossStatus.patternLabel);
  return (
    <div
      className={`runeBoss hudBoss ${bossStatus.enraged ? 'isEnraged' : ''}`}
      style={{ '--tone': bossStatus.phaseColor, '--pattern': bossStatus.patternColor }}
    >
      <div className="runeBossName">
        <span>RIFT WARDEN · BOSS</span>
        <strong>{bossStatus.phaseLabel}</strong>
        <small>Wave {bossStatus.wave}</small>
      </div>
      <div className="runeBossHp" aria-label="보스 체력">
        <i style={{ width: `${bossStatus.hpPct * 100}%` }} />
      </div>
      <div className="runeBossPattern">
        <span>{bossStatus.casting ? '시전' : '다음'} <b>{patternLabel}</b></span>
        <small>패턴 {bossStatus.patternStage}</small>
        <em>{bossStatus.patternCue ?? bossStatus.patternHint}</em>
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
