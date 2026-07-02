import * as THREE from 'three';
import {
  BOSS_PATTERN_META,
  BOSS_PATTERN_ORDER,
  DAMAGE_SOURCE_META
} from '../config/gameData.js';
import { getBossPhaseMeta } from './enemyPacing.js';

export function showEncounterAlert(updateGame, alert, duration = 3.0) {
  updateGame(current => ({
    ...current,
    encounterAlert: alert,
    encounterAlertTimer: Math.max(current.encounterAlertTimer ?? 0, duration),
    activeThreat: alert.threat ?? current.activeThreat,
    lastBossPattern: alert.pattern ?? current.lastBossPattern,
    pickupMessage: alert.message ?? current.pickupMessage,
    pickupFlash: Math.max(current.pickupFlash ?? 0, alert.flash ?? 0)
  }));
}

export function getBossStatusSnapshot(enemies) {
  const boss = enemies.current.find(enemy => enemy.kind === 'boss' && enemy.hp > 0);
  if (!boss) return null;
  const hpPct = THREE.MathUtils.clamp(boss.hp / boss.maxHp, 0, 1);
  const phase = getBossPhaseMeta(hpPct, boss.enraged);
  const patternKey = (boss.currentPatternTimer ?? 0) > 0
    ? boss.currentPattern
    : BOSS_PATTERN_ORDER[boss.patternIndex % BOSS_PATTERN_ORDER.length];
  const patternMeta = BOSS_PATTERN_META[patternKey] ?? BOSS_PATTERN_META.shockwave;
  return {
    hp: Math.max(0, boss.hp),
    maxHp: boss.maxHp,
    hpPct,
    wave: boss.wave,
    enraged: Boolean(boss.enraged),
    phaseLabel: phase.label,
    phaseColor: phase.color,
    patternLabel: patternMeta.label,
    patternHint: patternMeta.hint,
    patternCue: patternMeta.cue,
    patternColor: patternMeta.color,
    patternStage: Math.max(1, boss.patternIndex),
    casting: (boss.currentPatternTimer ?? 0) > 0
  };
}

export function recordRunDamage(runStats, source, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const key = DAMAGE_SOURCE_META[source] ? source : 'generic';
  runStats.current.damageBySource[key] = (runStats.current.damageBySource[key] ?? 0) + amount;
  runStats.current.totalDamage += amount;
}

export function getRunStatsSnapshot(runStats) {
  return {
    totalDamage: runStats.current.totalDamage,
    damageBySource: { ...runStats.current.damageBySource }
  };
}

export function createFrameStats() {
  return {
    samples: 0,
    elapsed: 0,
    avgDelta: 0,
    emaDelta: 0,
    maxDelta: 0,
    slowFrames: 0,
    severeFrames: 0
  };
}

export function resetFrameStats(frameStats) {
  Object.assign(frameStats.current, createFrameStats());
}

export function recordFrameSample(frameStats, rawDelta) {
  const delta = Math.min(0.25, Math.max(0, rawDelta));
  const stats = frameStats.current;
  stats.samples += 1;
  stats.elapsed += delta;
  stats.avgDelta += (delta - stats.avgDelta) / stats.samples;
  stats.emaDelta = stats.emaDelta === 0 ? delta : stats.emaDelta * 0.92 + delta * 0.08;
  stats.maxDelta = Math.max(stats.maxDelta, delta);
  if (delta > 0.045) stats.slowFrames += 1;
  if (delta > 0.075) stats.severeFrames += 1;
}

export function getFrameStatsSnapshot(frameStats) {
  const stats = frameStats.current;
  const avgDelta = stats.avgDelta || 0;
  const emaDelta = stats.emaDelta || 0;
  return {
    samples: stats.samples,
    elapsed: Number(stats.elapsed.toFixed(2)),
    avgFps: avgDelta > 0 ? Number((1 / avgDelta).toFixed(1)) : 0,
    emaFps: emaDelta > 0 ? Number((1 / emaDelta).toFixed(1)) : 0,
    maxFrameMs: Number((stats.maxDelta * 1000).toFixed(1)),
    slowFrames: stats.slowFrames,
    severeFrames: stats.severeFrames
  };
}
