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
  const hudAlerts = getHudAlerts({
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
  });

  return (
    <section className={`hud hudCompact ${isThreatened ? 'isThreatened' : ''} ${bossStatus ? 'hasBoss' : ''} ${bossStatus?.casting ? 'isCasting' : ''}`} aria-label="게임 상태">
      <div className="hudTopBar">
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
          <span className="hudTimeLabel">남은 시간</span>
          <strong>{formatTime(timeRemaining)}</strong>
          <i style={{ width: `${runPct}%` }} />
        </div>
        <HudActions game={game} onPause={onPause} onRestart={onRestart} />
      </div>
      {hudAlerts.length > 0 && (
        <div className="hudAlertStack" aria-label="전투 알림">
          {hudAlerts.slice(0, 3).map(alert => (
            <HudAlert key={alert.id} alert={alert} />
          ))}
        </div>
      )}
      {showFirstSessionCoach && (
        <HudPrompt cue={firstSessionCue} />
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

function getHudAlerts({
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
  const alerts = [];

  if (showTickerBasics) {
    alerts.push({ id: 'wave', label: `Wave ${game.wave}`, value: `${game.kills} KOs`, kind: 'basic' });
  }

  if (showDashTicker) {
    alerts.push({
      id: 'dash',
      label: 'Dash',
      value: dashReady ? 'Ready' : `${dashCooldown.toFixed(1)}s`,
      kind: dashReady ? 'ready' : 'cooldown',
      pct: dashPct
    });
  }

  if (crisis.level > 0) {
    alerts.push({ id: 'crisis', label: '위험', value: crisis.label, kind: crisis.level >= 3 ? 'danger' : 'warning' });
  }

  if (game.damageFlash > 0) {
    alerts.push({ id: 'damage', label: '피격', value: game.damageMessage, kind: 'danger' });
  }

  if (!bossStatus && activeThreat) {
    alerts.push({ id: 'threat', label: activeThreat.label, value: activeThreat.weakness, kind: 'threat', tone: activeThreat.color });
  }

  if (!bossStatus && bossPatternMeta) {
    alerts.push({ id: 'pattern', label: bossPatternMeta.label, value: bossPatternMeta.cue, kind: 'threat', tone: bossPatternMeta.color });
  }

  if (game.pickupFlash > 0) {
    alerts.push({ id: 'pickup', label: '획득', value: game.pickupMessage, kind: 'reward' });
  }

  return alerts;
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

function HudAlert({ alert }) {
  return (
    <span className={`hudAlert hudAlert-${alert.kind}`} style={{ '--tone': alert.tone }}>
      <b>{alert.label}</b>
      <small>{alert.value}</small>
      {Number.isFinite(alert.pct) && <i style={{ width: `${alert.pct}%` }} />}
    </span>
  );
}

function HudPrompt({ cue }) {
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
