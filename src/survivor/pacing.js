import { BOSS } from './boss.js';
import { waveAt } from './enemies.js';

// Rates affect new ordinary enemies only. Living enemies and their rewards stay intact.
export const PACING = [
  { until: 40, kind: 'build', rate: 1 },
  { until: 60, kind: 'surge', rate: 1.2 },
  { until: 78, kind: 'build', rate: 1 },
  { until: 92, kind: 'rest', rate: .55 },
  { until: 110, kind: 'build', rate: .95 },
  { until: 130, kind: 'surge', rate: 1.1 },
  { until: 145, kind: 'rest', rate: .55 },
  { until: 170, kind: 'build', rate: 1 },
  { until: 192, kind: 'surge', rate: 1 },
  { until: 207, kind: 'rest', rate: .55 },
  { until: 230, kind: 'surge', rate: 1 },
  { until: BOSS.arrival, kind: 'rest', rate: .45 }
];
export const EVOLUTION_BREATHER = 8;

export function combatPacing(game) {
  if (game.time >= BOSS.arrival || game.bossSpawned) {
    return { kind: 'boss', rate: 1, remaining: 0, label: '최후의 대결' };
  }
  if (game.championBreatherUntil > game.time) return {kind: 'champion', rate: .35, remaining: game.championBreatherUntil - game.time, label: '정예 격파 · 수확의 시간'};
  const beat = PACING.find(beat => game.time < beat.until);
  const evolutionRemaining = Math.min(BOSS.arrival, game.evolutionBreatherUntil ?? 0) - game.time;
  if (evolutionRemaining > 0) {
    return { kind: 'evolution', rate: Math.min(beat.rate, .45), remaining: evolutionRemaining, label: '진화의 여세' };
  }
  return { ...beat, remaining: beat.until - game.time,
    label: beat.kind === 'rest' ? '숨 고르기' : beat.kind === 'surge' ? '밀려오는 무리' : waveAt(game.time).name };
}

export function spawnPlan(game) {
  if (game.time >= BOSS.arrival || game.bossSpawned) return { interval: 1.6, count: 1 };
  return {
    interval: Math.max(.18, .82 - game.time * .002) / combatPacing(game).rate,
    count: game.time > 180 ? 3 : game.time > 70 ? 2 : 1
  };
}
