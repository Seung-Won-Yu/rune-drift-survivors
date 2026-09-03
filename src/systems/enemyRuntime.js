import { AUDIO_CUE, emitAudioCue } from '../audio/audioCues.js';
import {
  triggerBossRagePhase,
  updateEnemyAbilityRuntime
} from './enemyAbilityRuntime.js';
import { resolveDefeatedEnemies } from './enemyDeathRuntime.js';
import { updateEnemyContactAttack } from './enemyContactRuntime.js';
import { advanceEnemyMotion } from './enemyMotionRuntime.js';
import { getEnemyPursuitLead } from './enemyPacing.js';
import { resolveProjectileHitsForEnemy } from './projectileRuntime.js';

export function updateEnemiesRuntime({
  dt,
  currentGame,
  updateGame,
  runtimeBudget,
  player,
  enemies,
  fieldItems,
  fieldItemDropLock,
  spawnWarnings,
  hitBursts,
  weaponEffects,
  cameraShake,
  scratch,
  damagePlayer,
  showEncounterAlert,
  getProjectileCandidatesForEnemy,
  recordDamage,
  addXpGem,
  addDamageNumber,
  canAddHitBurst
}) {
  const playerPos = player.current.pos;
  let kills = 0;
  let eliteKills = 0;
  let bossKills = 0;
  const spawnedEnemies = [];

  for (const enemy of enemies.current) {
    const toPlayer = scratch.enemyDirection.copy(playerPos).sub(enemy.pos).setY(0);
    const distance = Math.max(0.001, toPlayer.length());
    const pursuitLead = getEnemyPursuitLead(enemy, currentGame);
    const playerSpeed = player.current.vel.length();
    if (pursuitLead > 0 && playerSpeed > 0.1) {
      toPlayer.addScaledVector(player.current.vel, Math.min(pursuitLead, 3.2 / playerSpeed));
    }
    toPlayer.normalize();

    triggerBossRagePhase({
      enemy,
      updateGame,
      hitBursts,
      spawnWarnings,
      cameraShake,
      showEncounterAlert
    });
    updateEnemyAbilityRuntime({
      enemy,
      dt,
      distance,
      toPlayer,
      currentGame,
      updateGame,
      runtimeBudget,
      enemies,
      player,
      spawnedEnemies,
      spawnWarnings,
      hitBursts,
      weaponEffects,
      cameraShake,
      damagePlayer,
      showEncounterAlert
    });
    updateEnemyContactAttack({
      enemy,
      dt,
      distance,
      currentGame,
      updateGame,
      damagePlayer
    });
    advanceEnemyMotion({
      enemy,
      dt,
      distance,
      toPlayer,
      currentGame
    });

    const nearbyProjectiles = getProjectileCandidatesForEnemy(enemy);
    resolveProjectileHitsForEnemy({
      enemy,
      projectiles: nearbyProjectiles,
      player,
      hitBursts,
      cameraShake,
      recordDamage,
      addDamageNumber,
      canAddHitBurst
    });
  }

  if (spawnedEnemies.length > 0) {
    enemies.current.push(...spawnedEnemies);
  }

  ({ kills, eliteKills, bossKills } = resolveDefeatedEnemies({
    currentGame,
    runtimeBudget,
    player,
    enemies,
    fieldItems,
    fieldItemDropLock,
    spawnWarnings,
    hitBursts,
    spawnedEnemies,
    addXpGem,
    addDamageNumber,
    canAddHitBurst
  }));

  if (kills > 0) {
    emitAudioCue(
      bossKills > 0
        ? AUDIO_CUE.bossDefeat
        : eliteKills > 0
          ? AUDIO_CUE.eliteDefeat
          : AUDIO_CUE.enemyDefeat,
      { intensity: Math.min(1, 0.45 + kills * 0.08) }
    );
    const defeatShake = bossKills > 0
      ? 0.48
      : eliteKills > 0
        ? 0.32
        : Math.min(0.24, 0.05 + kills * 0.018);
    cameraShake.current = Math.max(cameraShake.current, defeatShake);
    updateGame(current => ({
      ...current,
      kills: current.kills + kills,
      eliteKills: current.eliteKills + eliteKills,
      bossKills: current.bossKills + bossKills,
      activeThreat: eliteKills > 0 || bossKills > 0 ? null : current.activeThreat,
      lastBossPattern: bossKills > 0 ? null : current.lastBossPattern
    }));
  }
}
