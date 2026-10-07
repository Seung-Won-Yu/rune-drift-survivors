import { EVOLUTIONS, UPGRADE_META } from './game.js';

export const EVOLUTION_FEEDBACK_LIFE = 1.35;
export function evolutionFeedback(key, at) {
  if (!Object.hasOwn(EVOLUTIONS, key) || !Number.isFinite(at)) return null;
  return { key, at, life: EVOLUTION_FEEDBACK_LIFE, name: UPGRADE_META[key].name, color: UPGRADE_META[key].color };
}
export function evolutionFrame(feedback, time, reduced = false) {
  if (!feedback || !Number.isFinite(time) || time < feedback.at || time >= feedback.at + feedback.life) return null;
  const age = time - feedback.at, progress = age / feedback.life;
  return { ...feedback, progress, alpha: reduced ? .85 : Math.min(1, age / .08) * Math.min(1, (1 - progress) / .28),
    reach: reduced ? 36 : 24 + 66 * (1 - (1 - progress) ** 3), shards: reduced ? 0 : 8 };
}
