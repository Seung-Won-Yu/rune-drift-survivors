import { findNearestEnemies } from './combatQueries.js';
import { updateEnemiesRuntime } from './enemyRuntime.js';
import {
  addDamageNumberRuntime,
  canAddHitBurstRuntime,
  canAddWeaponEffectRuntime,
  updateVisualFeedbackPools
} from './feedbackRuntime.js';
import { updateFieldItemsRuntime } from './fieldItemRuntime.js';
import { renderGemInstances } from './instanceRuntime.js';
import {
  damagePlayerRuntime,
  updatePlayerRuntime
} from './playerRuntime.js';
import {
  addProjectileRuntime,
  getProjectileCandidatesForEnemy as getProjectileCandidatesFromGrid,
  rebuildProjectileGrid as rebuildProjectileSpatialGrid,
  updateProjectileRuntime
} from './projectileRuntime.js';
import { trimSceneRuntimePools } from './runtimePools.js';
import {
  recordRunDamage,
  showEncounterAlert
} from './runTelemetry.js';
import { updateFollowCamera } from './sceneCamera.js';
import { updateShrinesRuntime } from './shrineRuntime.js';
import { updateEnemySpawning } from './spawnDirector.js';
import { hitsStaticCollider } from './terrain.js';
import { updateWeaponCasts } from './weaponRuntime.js';
import {
  addXpGemRuntime,
  updateXpGemsRuntime
} from './xpRuntime.js';

export function createGameSceneActions({ runtime, visualQuality, touchControlsRef }) {
  const {
    player,
    keys,
    dashQueued,
    enemies,
    projectiles,
    projectileGrid,
    xpGems,
    fieldItems,
    shrines,
    hitBursts,
    damageNumbers,
    spawnWarnings,
    spawnTimer,
    fieldItemTimer,
    fieldItemDropLock,
    scheduledFieldItems,
    runStats,
    bossSpawnedWave,
    eliteSpawnedMinute,
    surgeIndex,
    orbTimer,
    stormTimer,
    lightningTimer,
    novaTimer,
    levelUpQueued,
    gemMesh,
    playerMesh,
    weaponEffects,
    cameraTarget,
    cameraShake,
    compactCamera,
    runtimeBudget,
    scratch
  } = runtime;

  const recordDamage = (source, amount) => {
    recordRunDamage(runStats, source, amount);
  };

  const pulsePlayerCast = (strength = 0.18) => {
    player.current.castPulse = Math.max(player.current.castPulse ?? 0, Math.min(0.68, strength * 1.24));
  };

  const addProjectile = projectile => {
    return addProjectileRuntime({ projectiles, runtimeBudget: runtimeBudget.current, projectile });
  };

  const trimRuntimePools = () => {
    trimSceneRuntimePools({
      projectiles,
      xpGems,
      enemies,
      runtimeBudget: runtimeBudget.current,
      playerPos: player.current.pos
    });
  };

  const updatePlayer = (dt, stats, updateGame) => updatePlayerRuntime({
    dt,
    stats,
    updateGame,
    player,
    playerMesh,
    keys,
    dashQueued,
    touchControlsRef,
    scratch,
    hitBursts,
    weaponEffects,
    cameraShake,
    addDamageNumber
  });

  const updateSpawning = (dt, currentGame, updateGame) => {
    updateEnemySpawning({
      dt,
      currentGame,
      updateGame,
      runtimeBudget: runtimeBudget.current,
      player,
      enemies,
      spawnTimer,
      surgeIndex,
      spawnWarnings,
      hitBursts,
      cameraShake,
      eliteSpawnedMinute,
      bossSpawnedWave,
      showEncounterAlert
    });
  };

  const updateWeapons = (dt, currentGame) => {
    updateWeaponCasts({
      dt,
      currentGame,
      player,
      enemies,
      orbTimer,
      stormTimer,
      lightningTimer,
      novaTimer,
      hitBursts,
      weaponEffects,
      cameraShake,
      addProjectile,
      nearestEnemies,
      pulsePlayerCast,
      recordDamage,
      addDamageNumber,
      canAddHitBurst,
      canAddWeaponEffect
    });
  };

  const updateProjectiles = (dt, stats, currentGame) => {
    updateProjectileRuntime({
      dt,
      stats,
      currentGame,
      runtimeBudget: runtimeBudget.current,
      player,
      enemies,
      projectiles,
      hitBursts,
      hitsStaticCollider,
      recordDamage,
      addDamageNumber,
      canAddHitBurst
    });
  };

  const rebuildProjectileGrid = () => {
    rebuildProjectileSpatialGrid(projectileGrid.current, projectiles.current);
  };

  const getProjectileCandidatesForEnemy = enemy => {
    return getProjectileCandidatesFromGrid(projectileGrid.current, enemy);
  };

  const updateEnemies = (dt, currentGame, updateGame) => {
    const damagePlayer = (amount, setGame, invuln = 0.62) => damagePlayerRuntime({
      amount,
      game: currentGame,
      updateGame: setGame,
      invuln,
      player,
      hitBursts,
      cameraShake,
      addDamageNumber
    });

    return updateEnemiesRuntime({
      dt,
      currentGame,
      updateGame,
      runtimeBudget: runtimeBudget.current,
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
    });
  };

  const updateGems = (dt, currentGame, updateGame, levelUp) => updateXpGemsRuntime({
    dt,
    currentGame,
    updateGame,
    levelUp,
    player,
    xpGems,
    runtimeBudget: runtimeBudget.current,
    scratch,
    levelUpQueued
  });

  const updateFieldItems = (dt, currentGame, updateGame) => updateFieldItemsRuntime({
    dt,
    currentGame,
    updateGame,
    player,
    xpGems,
    enemies,
    fieldItems,
    fieldItemTimer,
    fieldItemDropLock,
    scheduledFieldItems,
    spawnWarnings,
    hitBursts,
    weaponEffects,
    cameraShake,
    orbTimer,
    stormTimer,
    lightningTimer,
    novaTimer,
    scratch,
    addDamageNumber
  });

  const updateShrines = (dt, currentGame, updateGame) => updateShrinesRuntime({
    dt,
    currentGame,
    updateGame,
    player,
    enemies,
    shrines,
    spawnWarnings,
    hitBursts,
    weaponEffects,
    cameraShake,
    addDamageNumber
  });

  const updateFeedback = dt => updateVisualFeedbackPools({
    dt,
    visualQuality,
    hitBursts,
    weaponEffects,
    damageNumbers,
    spawnWarnings
  });

  const canAddHitBurst = (overflow = 8) => (
    canAddHitBurstRuntime({ hitBursts, visualQuality, overflow })
  );

  const canAddWeaponEffect = (overflow = 6) => (
    canAddWeaponEffectRuntime({ weaponEffects, visualQuality, overflow })
  );

  const addDamageNumber = (pos, value, color, size = 0.56) => addDamageNumberRuntime({
    pos,
    value,
    color,
    size,
    visualQuality,
    runtimeBudget: runtimeBudget.current,
    enemies,
    projectiles,
    damageNumbers
  });

  const addXpGem = (pos, value) => {
    addXpGemRuntime({ xpGems, pos, value, runtimeBudget: runtimeBudget.current });
  };

  const updateCamera = (camera, dt) => {
    updateFollowCamera({
      camera,
      playerPos: player.current.pos,
      cameraTarget: cameraTarget.current,
      cameraShake,
      scratch,
      compactCamera,
      visualQuality,
      dt
    });
  };

  const nearestEnemies = (limit = 1, maxDistance = Infinity) => {
    return findNearestEnemies(enemies.current, player.current.pos, limit, maxDistance);
  };

  const renderInstances = () => {
    renderGemInstances({ gemMesh, xpGems, runtimeBudget: runtimeBudget.current, scratch });
  };

  return {
    updatePlayer,
    updateSpawning,
    trimRuntimePools,
    updateWeapons,
    updateProjectiles,
    rebuildProjectileGrid,
    updateEnemies,
    updateGems,
    updateFieldItems,
    updateShrines,
    updateFeedback,
    updateCamera,
    renderInstances
  };
}
