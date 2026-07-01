import { DASH_COOLDOWN, RUN_DURATION, WAVE_DURATION } from '../config/gameTuning.js';

export function applyFrameStateUpdate({ current, elapsed, player, bossStatus, runStats }) {
  const nextTime = current.time + elapsed;
  const nextWave = Math.max(1, Math.floor(nextTime / WAVE_DURATION) + 1);
  const pickupFlash = Math.max(0, (current.pickupFlash ?? 0) - elapsed);
  const encounterAlertTimer = Math.max(0, (current.encounterAlertTimer ?? 0) - elapsed);
  const damageFlash = Math.max(0, (current.damageFlash ?? 0) - elapsed);
  const dashCooldownMax = DASH_COOLDOWN * current.stats.dashCooldown;
  const movementDelta = player.vel.length() > 0.1 ? player.vel.length() * elapsed : 0;
  const basePatch = {
    time: Math.min(nextTime, RUN_DURATION),
    wave: nextWave,
    pickupFlash,
    pickupMessage: pickupFlash > 0 ? current.pickupMessage : '',
    encounterAlertTimer,
    encounterAlert: encounterAlertTimer > 0 ? current.encounterAlert : null,
    damageFlash,
    damageMessage: damageFlash > 0 ? current.damageMessage : '',
    bossStatus,
    runStats,
    overloadTimer: Math.max(0, (current.overloadTimer ?? 0) - elapsed),
    onboardingMovement: Math.min(120, (current.onboardingMovement ?? 0) + movementDelta),
    playerPos: { x: player.pos.x, z: player.pos.z },
    dash: {
      cooldown: Math.min(dashCooldownMax, player.dashCd),
      cooldownMax: dashCooldownMax,
      active: player.dashTimer,
      ready: player.dashCd <= 0
    }
  };
  if (nextTime >= RUN_DURATION) {
    return { ...current, ...basePatch, phase: 'ended', result: 'victory' };
  }
  return { ...current, ...basePatch };
}
