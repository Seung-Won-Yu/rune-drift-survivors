export function HudMeter({ tone, label, value, pct, isLow = false, isHit = false }) {
  const icon = tone === 'hp' ? '♥' : '✦';
  return (
    <div className={`hudMeter hudMeter-${tone} ${isLow ? 'isLow' : ''} ${isHit ? 'isHit' : ''}`}>
      <span className="hudMeterIcon" aria-hidden="true">{icon}</span>
      <div className="hudMeterBody">
        <div className="hudMeterText">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
        <div className="hudGauge"><i style={{ width: `${pct}%` }} /></div>
      </div>
    </div>
  );
}

export function HudActions({ game, onPause, onRestart }) {
  return (
    <div className="hudActions fantasyActions">
      <button className="iconButton fantasyIconButton" type="button" onClick={onPause} aria-label={game.phase === 'paused' ? '계속하기' : '일시정지'}>
        {game.phase === 'paused' ? '▶' : 'Ⅱ'}
      </button>
      <button className="iconButton fantasyIconButton" type="button" onClick={onRestart} aria-label="다시 시작">↻</button>
    </div>
  );
}

export function HudAlert({ alert }) {
  return (
    <span className={`hudAlert hudAlert-${alert.kind}`} style={{ '--tone': alert.tone }}>
      <b>{alert.label}</b>
      <small>{alert.value}</small>
      {Number.isFinite(alert.pct) && <i style={{ width: `${alert.pct}%` }} />}
    </span>
  );
}

export function HudPrompt({ cue }) {
  return (
    <div className="hudPrompt hudCoachCard" style={{ '--tone': cue.color }} aria-label="초반 안내">
      <div className="hudPromptHeader">
        <span>First Run</span>
        <strong>{cue.title}</strong>
        <small>{cue.action}</small>
      </div>
      <div className="hudPromptBody">
        <b>{cue.body}</b>
        <small>{cue.detail}</small>
        <i style={{ width: `${cue.progress * 100}%` }} />
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
    <div className="hudQuestRow hudObjectiveDock" aria-label="현재 런 단계 목표">
      <div className="hudQuestSummary">
        <span>{runPhase.label}</span>
        <strong>{completed} / {total}</strong>
        <small>{runPhase.goal}</small>
      </div>
      {visibleObjectives.slice(0, 1).map(objective => (
        <div key={objective.id} className="hudQuestCard" style={{ '--tone': objective.color }}>
          <span>
            {objective.title}
            <strong>{objective.label}</strong>
          </span>
          <small>{objective.displayValue} / {objective.displayTarget}</small>
          <i style={{ width: `${objective.progress * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

export function HudEncounter({ alert }) {
  return (
    <div
      className={`hudEncounter ${alert.kind === 'boss' || alert.kind === 'boss-pattern' ? 'isBoss' : ''}`}
      style={{ '--tone': alert.color }}
    >
      <span>{alert.label}</span>
      <strong>{alert.title}</strong>
      <small>{alert.hint}</small>
    </div>
  );
}

export function HudBossBar({ bossStatus }) {
  const patternLabel = getBossPatternLabel(bossStatus.patternLabel);
  return (
    <div
      className={`hudBoss ${bossStatus.enraged ? 'isEnraged' : ''}`}
      style={{ '--tone': bossStatus.phaseColor, '--pattern': bossStatus.patternColor }}
    >
      <div className="hudBossName">
        <span>Boss</span>
        <strong>{bossStatus.phaseLabel}</strong>
        <small>Wave {bossStatus.wave}</small>
      </div>
      <div className="hudBossHp" aria-label="보스 체력">
        <i style={{ width: `${bossStatus.hpPct * 100}%` }} />
      </div>
      <div className="hudBossPattern">
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
