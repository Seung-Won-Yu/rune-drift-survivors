import { BOSS_PATTERN_META } from '../config/gameData.js';
import { DASH_COOLDOWN, RUN_DURATION } from '../config/gameTuning.js';
import { getCrisisState } from '../systems/enemyPacing.js';
import { getRunPhase } from '../systems/progression.js';
import { getRuneCircuitState } from '../systems/runeCircuit.js';
import {
  getFirstSessionCue,
  getOnboardingSteps,
  getOpeningObjectives,
  getRunPhaseObjectives
} from '../systems/runProgress.js';
import { formatTime } from './formatters.js';
import { getHudAlerts } from './hudAlerts.js';
import {
  HudActions,
  HudAlert,
  HudBossBar,
  HudCircuit,
  HudEncounter,
  HudMeter,
  HudObjectives,
  HudPrompt
} from './HudWidgets.jsx';

export function HUD({ game, onRestart, onPause, audioMuted, onToggleAudio }) {
  const hpPct = Math.max(0, Math.min(100, game.stats.hp / game.stats.maxHp * 100));
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
  const circuit = getRuneCircuitState(game);
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
  const showFirstSessionCoach = !bossStatus && !encounterAlert && game.damageFlash <= 0 && firstSessionCue && game.time < 32;
  const showRunObjectives = !bossStatus && !encounterAlert && game.damageFlash <= 0 && !showFirstSessionCoach && visibleObjectives.length > 0 && game.time < 286;
  const showEncounterBanner = encounterAlert && !bossStatus;
  const showDashTicker = !dashReady;
  const hudAlerts = getHudAlerts({
    game,
    crisis,
    activeThreat,
    bossPatternMeta,
    bossStatus,
    encounterAlert,
    dashPct,
    dashReady,
    dashCooldown,
    showDashTicker
  });

  return (
    <section
      className={`runeHud hud hudCompact ${isThreatened ? 'isThreatened' : ''} ${bossStatus ? 'hasBoss' : ''} ${bossStatus?.casting ? 'isCasting' : ''}`}
      aria-label="게임 상태"
    >
      <div className="runeHudTop hudTopBar">
        <div className="runeVitals hudVitalsPocket" aria-label="체력과 경험치">
          <span className="runeVitalsLabel" aria-hidden="true">WANDERER</span>
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
        </div>
        <div className="runeRunClock hudRunPocket" aria-label="런 진행도">
          <div className="runeRunClockMeta">
            <span>{runPhase.label}</span>
            <small>{game.kills} KOs</small>
          </div>
          <strong>{formatTime(timeRemaining)}</strong>
          <div
            className="runeRunTrack"
            role="progressbar"
            aria-label="런 진행도"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(runPct)}
            aria-valuetext={`${formatTime(game.time)} 경과, ${formatTime(timeRemaining)} 남음`}
          >
            <i style={{ width: `${runPct}%` }} />
          </div>
          <HudCircuit circuit={circuit} />
        </div>
        <HudActions
          game={game}
          onPause={onPause}
          onRestart={onRestart}
          audioMuted={audioMuted}
          onToggleAudio={onToggleAudio}
        />
        {hudAlerts.length > 0 && (
          <div className="runeAlertStack hudAlertStack" aria-label="전투 알림" aria-live="polite" aria-atomic="false">
            {hudAlerts.slice(0, bossStatus ? 1 : 2).map(alert => (
              <HudAlert key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>
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
      {showEncounterBanner && <HudEncounter alert={encounterAlert} />}
      {bossStatus && <HudBossBar bossStatus={bossStatus} />}
    </section>
  );
}
