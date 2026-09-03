export const AUDIO_CUE = Object.freeze({
  dash: 'dash',
  enemyAttack: 'enemy-attack',
  weaponCast: 'weapon-cast',
  playerHit: 'player-hit',
  enemyDefeat: 'enemy-defeat',
  eliteDefeat: 'elite-defeat',
  bossDefeat: 'boss-defeat',
  phaseShift: 'phase-shift',
  levelUp: 'level-up',
  upgradeSelect: 'upgrade-select',
  eliteWarning: 'elite-warning',
  bossWarning: 'boss-warning'
});

const VALID_CUES = new Set(Object.values(AUDIO_CUE));
const listeners = new Set();

export function emitAudioCue(cue, detail = {}) {
  if (!VALID_CUES.has(cue)) return false;
  const event = {
    cue,
    intensity: clamp01(detail.intensity ?? 1),
    variant: detail.variant ?? 'default'
  };
  listeners.forEach(listener => listener(event));
  return true;
}

export function subscribeAudioCues(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}
