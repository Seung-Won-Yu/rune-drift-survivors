import {
  COMBAT_RHYTHM,
  WAVE_PROFILES
} from '../config/gameData.js';
import { createEmptyBuildFocus } from './gameState.js';

export function getWaveProfile(wave) {
  const base = WAVE_PROFILES[(wave - 1) % WAVE_PROFILES.length];
  const cycle = Math.floor((wave - 1) / WAVE_PROFILES.length);
  return {
    ...base,
    targetBase: base.targetBase + cycle * 10,
    spawnBase: Math.min(15, base.spawnBase + cycle),
    runner: Math.min(0.44, base.runner + cycle * 0.035),
    brute: Math.min(0.36, base.brute + cycle * 0.035),
    interval: Math.max(0.42, base.interval - cycle * 0.045)
  };
}

export function getCombatRhythm(game) {
  return COMBAT_RHYTHM.find(phase => game.time < phase.until) ?? COMBAT_RHYTHM[COMBAT_RHYTHM.length - 1];
}

export function getCrisisState(game) {
  if (game.time >= 245) return { level: 4, label: 'FINAL SURGE' };
  if (game.time >= 195) return { level: 3, label: 'ELITE SURGE' };
  if (game.time >= 150) return { level: 2, label: 'RIFT SURGE' };
  if (game.time >= 120) return { level: 1, label: 'RIFT RISING' };
  return { level: 0, label: '' };
}

export function getBossPhaseMeta(hpPct, enraged = false) {
  if (enraged || hpPct <= 0.5) return { label: 'RAGE', color: '#ff8b72' };
  if (hpPct <= 0.75) return { label: 'PRESSURE', color: '#fff1a6' };
  return { label: 'OPENING', color: '#70d6ff' };
}

export function getDirectorPressure(game) {
  const timePressure = game.time < 45
    ? 0.82
    : game.time < 90
      ? 0.94
      : game.time < 180
        ? 1 + (game.time - 90) / 820
        : Math.min(1.36, 1.14 + (game.time - 180) / 520);
  const buildDepth = Math.max(...Object.values({ ...createEmptyBuildFocus(), ...(game.buildFocus ?? {}) }));
  const buildPressure = buildDepth >= 5 ? 0.08 : buildDepth >= 3 ? 0.05 : buildDepth >= 2 ? 0.03 : 0;
  return Math.min(1.42, timePressure + buildPressure);
}

export function getEnemyMovePressure(game) {
  const rhythm = getCombatRhythm(game);
  if (game.time >= 245) return 1.18 * rhythm.move;
  if (game.time >= 195) return 1.12 * rhythm.move;
  if (game.time >= 150) return 1.06 * rhythm.move;
  if (game.time >= 120) return 1.02 * rhythm.move;
  return rhythm.move;
}

export function getEnemyDamagePressure(game) {
  const rhythm = getCombatRhythm(game);
  if (game.time >= 245) return 1.42 * rhythm.damage;
  if (game.time >= 195) return 1.3 * rhythm.damage;
  if (game.time >= 150) return 1.16 * rhythm.damage;
  if (game.time >= 120) return 1.06 * rhythm.damage;
  return rhythm.damage;
}

export function getEnemyAbilityScale(game) {
  const rhythm = getCombatRhythm(game);
  if (game.time >= 245) return 0.82 * rhythm.ability;
  if (game.time >= 195) return 0.9 * rhythm.ability;
  if (game.time >= 150) return 0.96 * rhythm.ability;
  if (game.time >= 120) return rhythm.ability;
  return rhythm.ability;
}
