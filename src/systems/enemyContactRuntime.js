import { AUDIO_CUE, emitAudioCue } from '../audio/audioCues.js';
import { PLAYER_RADIUS } from '../config/gameTuning.js';
import { getEnemyDamagePressure } from './enemyPacing.js';

const CONTACT_ATTACK_PROFILES = Object.freeze({
  runner: Object.freeze({ windup: 0.26, recovery: 0.66, reachPadding: 0.68, windupMoveScale: 0.08, recoveryMoveScale: 0.42 }),
  golem: Object.freeze({ windup: 0.38, recovery: 0.82, reachPadding: 0.78, windupMoveScale: 0.06, recoveryMoveScale: 0.36 }),
  brute: Object.freeze({ windup: 0.56, recovery: 1.02, reachPadding: 1.04, windupMoveScale: 0.04, recoveryMoveScale: 0.28 }),
  elite: Object.freeze({ windup: 0.48, recovery: 1.04, reachPadding: 1.16, windupMoveScale: 0.04, recoveryMoveScale: 0.3 }),
  boss: Object.freeze({ windup: 0.68, recovery: 1.18, reachPadding: 1.38, windupMoveScale: 0.02, recoveryMoveScale: 0.24 })
});

export function getEnemyContactProfile(enemy) {
  return CONTACT_ATTACK_PROFILES[enemy.kind] ?? CONTACT_ATTACK_PROFILES.golem;
}

export function getEnemyContactReach(enemy) {
  const profile = getEnemyContactProfile(enemy);
  return enemy.radius + PLAYER_RADIUS + profile.reachPadding;
}

export function getEnemyContactWindupProgress(enemy) {
  const duration = enemy.contactAttackMax ?? 0;
  if (duration <= 0 || (enemy.contactAttackTimer ?? 0) <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - enemy.contactAttackTimer / duration));
}

export function getEnemyContactMotionScale(enemy) {
  const profile = getEnemyContactProfile(enemy);
  if ((enemy.contactAttackTimer ?? 0) > 0) return profile.windupMoveScale;
  if ((enemy.contactAttackCooldown ?? 0) > 0) return profile.recoveryMoveScale;
  return 1;
}

export function updateEnemyContactAttack({
  enemy,
  dt,
  distance,
  currentGame,
  updateGame,
  damagePlayer
}) {
  const profile = getEnemyContactProfile(enemy);
  enemy.contactAttackCooldown = Math.max(0, (enemy.contactAttackCooldown ?? 0) - dt);
  enemy.contactAttackPulse = Math.max(0, (enemy.contactAttackPulse ?? 0) - dt);

  if ((enemy.contactAttackTimer ?? 0) > 0) {
    const previousTimer = enemy.contactAttackTimer;
    enemy.contactAttackTimer = Math.max(0, previousTimer - dt);
    if (previousTimer > 0 && enemy.contactAttackTimer <= 0) {
      enemy.contactAttackCooldown = profile.recovery;
      enemy.contactAttackCount = (enemy.contactAttackCount ?? 0) + 1;
      const hit = distance <= getEnemyContactReach(enemy)
        && damagePlayer(enemy.damage * getEnemyDamagePressure(currentGame), updateGame);
      if (hit) {
        enemy.contactAttackPulse = 0.34;
        enemy.contactHitCount = (enemy.contactHitCount ?? 0) + 1;
      }
      return { started: false, resolved: true, hit: Boolean(hit) };
    }
    return { started: false, resolved: false, hit: false };
  }

  if (enemy.contactAttackCooldown > 0 || isAbilityLocked(enemy)) {
    return { started: false, resolved: false, hit: false };
  }

  if (distance <= getEnemyContactReach(enemy)) {
    enemy.contactAttackTimer = profile.windup;
    enemy.contactAttackMax = profile.windup;
    emitAudioCue(AUDIO_CUE.enemyAttack, {
      intensity: enemy.kind === 'boss' ? 1 : enemy.kind === 'elite' ? 0.82 : enemy.kind === 'brute' ? 0.64 : 0.42,
      variant: enemy.kind
    });
    return { started: true, resolved: false, hit: false };
  }

  return { started: false, resolved: false, hit: false };
}

function isAbilityLocked(enemy) {
  return (enemy.chargeTimer ?? 0) > 0
    || (enemy.shockwaveTimer ?? 0) > 0
    || (enemy.summonWindupTimer ?? 0) > 0
    || (enemy.guardWindupTimer ?? 0) > 0;
}
