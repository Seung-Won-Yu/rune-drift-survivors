import { ART_TOKENS } from '../config/artDirection.js';

export function getHudAlerts({
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
}) {
  const alerts = [];

  if (game.damageFlash > 0) {
    alerts.push({
      id: 'damage',
      label: '피격',
      value: game.damageMessage,
      kind: 'danger',
      tone: ART_TOKENS.dangerRed
    });
  }

  if (!bossStatus && !encounterAlert && crisis.level > 0) {
    alerts.push({ id: 'crisis', label: '위험', value: crisis.label, kind: crisis.level >= 3 ? 'danger' : 'warning' });
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

  if (!bossStatus && !encounterAlert && activeThreat) {
    alerts.push({ id: 'threat', label: activeThreat.label, value: activeThreat.weakness, kind: 'threat', tone: activeThreat.color });
  }

  if (!bossStatus && !encounterAlert && bossPatternMeta) {
    alerts.push({ id: 'pattern', label: bossPatternMeta.label, value: bossPatternMeta.cue, kind: 'threat', tone: bossPatternMeta.color });
  }

  if (!bossStatus && !encounterAlert && game.pickupFlash > 0) {
    alerts.push({ id: 'pickup', label: '획득', value: game.pickupMessage, kind: 'reward' });
  }

  return alerts;
}
