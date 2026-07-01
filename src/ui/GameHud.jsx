import { BOSS_PATTERN_META } from '../config/gameData.js';
import { DASH_COOLDOWN, RUN_DURATION } from '../config/gameTuning.js';
import { getCrisisState } from '../systems/enemyDirector.js';
import {
  getFirstSessionCue,
  getOnboardingSteps,
  getOpeningObjectives,
  getRunPhaseObjectives
} from '../systems/runProgress.js';
import { getRunPhase } from '../systems/progression.js';
import { formatTime } from './formatters.js';

export function HUD({ game, onRestart, onPause }) {
  const hpPct = Math.max(0, game.stats.hp / game.stats.maxHp) * 100;
  const hpRatio = game.stats.hp / game.stats.maxHp;
  const xpPct = Math.min(100, (game.xp / game.xpToNext) * 100);
  const runPct = Math.min(100, (game.time / RUN_DURATION) * 100);
  const timeRemaining = Math.max(0, RUN_DURATION - game.time);
  const crisis = getCrisisState(game);
  const dashCooldown = game.dash?.cooldown ?? 0;
  const dashCooldownMax = Math.max(0.01, game.dash?.cooldownMax ?? DASH_COOLDOWN);
  const dashPct = Math.max(0, Math.min(100, (1 - dashCooldown / dashCooldownMax) * 100));
  const dashReady = game.dash?.ready ?? dashCooldown <= 0;
  const encounterAlert = game.encounterAlertTimer > 0 ? game.encounterAlert : null;
  const activeThreat = game.activeThreat;
  const bossStatus = game.bossStatus;
  const bossPatternMeta = game.lastBossPattern ? BOSS_PATTERN_META[game.lastBossPattern] : null;
  const runPhase = getRunPhase(game);
  const isThreatened = crisis.level >= 3 || bossStatus?.enraged || encounterAlert?.kind === 'boss' || encounterAlert?.kind === 'boss-pattern';
  const onboardingSteps = getOnboardingSteps(game);
  const openingObjectives = getOpeningObjectives(game);
  const openingActiveObjectives = openingObjectives.filter(objective => !objective.complete).slice(0, 2);
  const phaseObjectives = getRunPhaseObjectives(game, runPhase, openingObjectives);
  const activeObjectives = phaseObjectives.filter(objective => !objective.complete).slice(0, 2);
  const visibleObjectives = activeObjectives.length > 0 ? activeObjectives : phaseObjectives.slice(0, 2);
  const completedPhaseObjectives = phaseObjectives.filter(objective => objective.complete).length;
  const completedOpeningObjectives = openingObjectives.filter(objective => objective.complete).length;
  const firstSessionCue = getFirstSessionCue(game, onboardingSteps, openingActiveObjectives);
  const showFirstSessionCoach = !bossStatus && firstSessionCue && game.time < 128;
  const showRunObjectives = !bossStatus && !showFirstSessionCoach && visibleObjectives.length > 0 && game.time < 286;
  const showTickerBasics = !bossStatus && game.time < 12;
  const showDashTicker = showTickerBasics || !dashReady;
  const tickerHasEvent = Boolean(
    crisis.level > 0
    || game.damageFlash > 0
    || (!bossStatus && activeThreat)
    || (!bossStatus && bossPatternMeta)
    || game.pickupFlash > 0
  );
  const showCombatTicker = showDashTicker || tickerHasEvent;

  return (
    <section className={`hud fantasyHud ${isThreatened ? 'isThreatened' : ''} ${bossStatus ? 'hasBoss' : ''} ${bossStatus?.casting ? 'isCasting' : ''}`} aria-label="게임 상태">
      <div className="hudVitals">
        <HudMeter
          tone="hp"
          label="체력"
          value={`${Math.ceil(game.stats.hp)} / ${game.stats.maxHp}`}
          pct={hpPct}
          isLow={hpRatio <= 0.34}
          isHit={game.damageFlash > 0}
        />
        <HudMeter
          tone="xp"
          label={`레벨 ${game.level}`}
          value={`${Math.floor(game.xp)} / ${game.xpToNext}`}
          pct={xpPct}
        />
        <div className="hudTimeSeal" aria-label="생존 시간">
          <span className="hudTimeIcon" aria-hidden="true">⌛</span>
          <span className="hudTimeLabel">생존</span>
          <strong>{formatTime(timeRemaining)}</strong>
          <i style={{ width: `${runPct}%` }} />
        </div>
        <HudActions game={game} onPause={onPause} onRestart={onRestart} />
      </div>
      {showCombatTicker && (
        <HudRuneRow
          game={game}
          crisis={crisis}
          activeThreat={activeThreat}
          bossPatternMeta={bossPatternMeta}
          bossStatus={bossStatus}
          dashPct={dashPct}
          dashReady={dashReady}
          dashCooldown={dashCooldown}
          showTickerBasics={showTickerBasics}
          showDashTicker={showDashTicker}
        />
      )}
      {showFirstSessionCoach && (
        <HudPrompt cue={firstSessionCue} steps={onboardingSteps} />
      )}
      {showRunObjectives && (
        <HudObjectives
          runPhase={runPhase}
          visibleObjectives={visibleObjectives}
          completedOpeningObjectives={completedOpeningObjectives}
          completedPhaseObjectives={completedPhaseObjectives}
          openingObjectiveCount={openingObjectives.length}
          phaseObjectiveCount={phaseObjectives.length}
        />
      )}
      {encounterAlert && <HudEncounter alert={encounterAlert} />}
      {bossStatus && <HudBossBar bossStatus={bossStatus} />}
    </section>
  );
}

function HudMeter({ tone, label, value, pct, isLow = false, isHit = false }) {
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

function HudActions({ game, onPause, onRestart }) {
  return (
    <div className="hudActions fantasyActions">
      <button className="iconButton fantasyIconButton" type="button" onClick={onPause} aria-label={game.phase === 'paused' ? '계속하기' : '일시정지'}>
        {game.phase === 'paused' ? '▶' : 'Ⅱ'}
      </button>
      <button className="iconButton fantasyIconButton" type="button" onClick={onRestart} aria-label="다시 시작">↻</button>
    </div>
  );
}

function HudRuneRow({
  game,
  crisis,
  activeThreat,
  bossPatternMeta,
  bossStatus,
  dashPct,
  dashReady,
  dashCooldown,
  showTickerBasics,
  showDashTicker
}) {
  return (
    <div className={`hudRuneRow ${showTickerBasics ? '' : 'isAlertOnly'}`}>
      {showTickerBasics && <span className="hudRunePill">Wave {game.wave}</span>}
      {showTickerBasics && <span className="hudRunePill">{game.kills} KOs</span>}
      {showDashTicker && (
        <span className={`hudRunePill hudDashPill ${dashReady ? 'isReady' : ''}`}>
          Dash <b>{dashReady ? 'Ready' : `${dashCooldown.toFixed(1)}s`}</b>
          <i style={{ width: `${dashPct}%` }} />
        </span>
      )}
      {crisis.level > 0 && <span className={`hudRunePill isDanger ${crisis.level >= 3 ? 'isCritical' : ''}`}>{crisis.label}</span>}
      {game.damageFlash > 0 && <span className="hudRunePill isDanger">{game.damageMessage}</span>}
      {!bossStatus && activeThreat && <span className="hudRunePill isThreat" style={{ '--tone': activeThreat.color }}>{activeThreat.label} · {activeThreat.weakness}</span>}
      {!bossStatus && bossPatternMeta && <span className="hudRunePill isThreat" style={{ '--tone': bossPatternMeta.color }}>{bossPatternMeta.label} · {bossPatternMeta.cue}</span>}
      {game.pickupFlash > 0 && <span className="hudRunePill isReward">{game.pickupMessage}</span>}
    </div>
  );
}

function HudPrompt({ cue, steps }) {
  return (
    <div className="hudPrompt" style={{ '--tone': cue.color }} aria-label="초반 안내">
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
      <div className="hudPromptSteps" aria-label="초반 조작 단계">
        {steps.slice(0, 4).map(step => (
          <span
            key={step.id}
            className={`${step.id === cue.stepId ? 'isActive' : ''} ${step.complete ? 'isComplete' : ''}`}
            style={{ '--tone': step.color }}
          >
            {step.title}
          </span>
        ))}
      </div>
    </div>
  );
}

function HudObjectives({
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
    <div className="hudQuestRow" aria-label="현재 런 단계 목표">
      <div className="hudQuestSummary">
        <span>{runPhase.label}</span>
        <strong>{completed} / {total}</strong>
        <small>{runPhase.goal}</small>
      </div>
      {visibleObjectives.map(objective => (
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

function HudEncounter({ alert }) {
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

function HudBossBar({ bossStatus }) {
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
