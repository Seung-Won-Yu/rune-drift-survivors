import * as THREE from 'three';

import {
  BOSS_PATTERN_META,
  BOSS_PATTERN_ORDER,
  ELITE_ROLE_META
} from '../config/gameData.js';
import { PLAYER_RADIUS } from '../config/gameTuning.js';
import { createSummonedRunner } from './enemyDirector.js';
import {
  getEnemyAbilityScale,
  getEnemyDamagePressure
} from './enemyPacing.js';
import { getCircuitFinaleState } from './runeCircuit.js';
import { resolveStaticCollisions } from './terrain.js';

export function updateEnemyAbilityRuntime({
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
}) {
  enemy.abilityTimer = Math.max(0, (enemy.abilityTimer ?? 0) - dt);
  enemy.chargeTimer = Math.max(0, (enemy.chargeTimer ?? 0) - dt);
  enemy.bossGuard = Math.max(0, (enemy.bossGuard ?? 0) - dt);
  enemy.currentPatternTimer = Math.max(0, (enemy.currentPatternTimer ?? 0) - dt);
  const abilityScale = getEnemyAbilityScale(currentGame);
  const summonSlots = () => Math.max(0, runtimeBudget.maxEnemies - enemies.current.length - spawnedEnemies.length);

  if (enemy.kind === 'elite' && enemy.role === 'bulwark') {
    enemy.shield = Math.min(enemy.shieldMax, (enemy.shield ?? 0) + dt * 4.5 * getEnemyDamagePressure(currentGame));
    if (enemy.abilityTimer <= 0) {
      enemy.abilityTimer = 5.8 * abilityScale;
      hitBursts.current.push({
        pos: enemy.pos.clone(),
        life: 0.72,
        maxLife: 0.72,
        color: ELITE_ROLE_META.bulwark.color,
        type: 'bulwark',
        stage: 4,
        radius: 3.6
      });
    }
    return;
  }

  if (enemy.kind === 'elite' && enemy.role === 'charger') {
    if (enemy.abilityTimer <= 0 && distance > 8) {
      enemy.abilityTimer = 4.2 * abilityScale;
      enemy.chargeTimer = 0.72 + Math.max(0, currentGame.time - 180) * 0.0008;
      spawnWarnings.current.push({
        pos: enemy.pos.clone().add(toPlayer.clone().multiplyScalar(5.5)),
        life: 0.52,
        maxLife: 0.52,
        color: ELITE_ROLE_META.charger.color,
        label: 'CHARGE',
        cue: '돌진선 이탈',
        shape: 'charge',
        radius: 4.4
      });
      weaponEffects.current.push({
        type: 'beam',
        from: enemy.pos.clone().add(new THREE.Vector3(0, 0.9, 0)),
        to: enemy.pos.clone().add(toPlayer.clone().multiplyScalar(7.5)).add(new THREE.Vector3(0, 0.9, 0)),
        life: 0.38,
        maxLife: 0.38,
        color: ELITE_ROLE_META.charger.color,
        width: 0.08
      });
    }
    return;
  }

  if (enemy.kind === 'elite' && enemy.role === 'summoner') {
    if (enemy.abilityTimer <= 0) {
      enemy.abilityTimer = 6.2 * abilityScale;
      const count = Math.min(7, 2 + Math.floor(currentGame.wave / 2) + (currentGame.time >= 180 ? 1 : 0), summonSlots());
      for (let index = 0; index < count; index += 1) {
        spawnedEnemies.push(createSummonedRunner(enemy, currentGame.wave, player.current.pos, index));
      }
      spawnWarnings.current.push({
        pos: enemy.pos.clone(),
        life: 0.72,
        maxLife: 0.72,
        color: ELITE_ROLE_META.summoner.color,
        label: 'SWARM',
        cue: '소환수 정리',
        shape: 'summon',
        radius: 5.4
      });
      hitBursts.current.push({
        pos: enemy.pos.clone(),
        life: 0.74,
        maxLife: 0.74,
        color: ELITE_ROLE_META.summoner.color,
        type: 'summon',
        stage: 4,
        radius: 4.4
      });
    }
    return;
  }

  if (enemy.kind !== 'boss') return;
  const circuitFinale = getCircuitFinaleState(currentGame);
  const bossAbilityScale = abilityScale * circuitFinale.bossAbilityIntervalMultiplier;

  if ((enemy.shockwaveTimer ?? 0) > 0) {
    const before = enemy.shockwaveTimer;
    enemy.shockwaveTimer = Math.max(0, enemy.shockwaveTimer - dt);
    if (before > 0 && enemy.shockwaveTimer <= 0) {
      const radius = 20 + currentGame.wave * 0.8 + Math.max(0, currentGame.time - 180) * 0.025;
      hitBursts.current.push({
        pos: enemy.pos.clone(),
        life: 0.9,
        maxLife: 0.9,
        color: BOSS_PATTERN_META.shockwave.color,
        type: 'bossShockwave',
        stage: 5,
        radius
      });
      weaponEffects.current.push({
        type: 'ring',
        pos: enemy.pos.clone(),
        life: 0.72,
        maxLife: 0.72,
        color: BOSS_PATTERN_META.shockwave.color,
        radius
      });
      if (distance < radius && distance > 3.4 && damagePlayer((enemy.damage + 5) * getEnemyDamagePressure(currentGame) * circuitFinale.bossDamageMultiplier, updateGame, 0.86)) {
        player.current.pos.addScaledVector(toPlayer, 4.2);
        resolveStaticCollisions(player.current.pos, PLAYER_RADIUS);
      }
    }
  }

  if ((enemy.summonWindupTimer ?? 0) > 0) {
    const before = enemy.summonWindupTimer;
    enemy.summonWindupTimer = Math.max(0, enemy.summonWindupTimer - dt);
    if (before > 0 && enemy.summonWindupTimer <= 0) {
      const meta = BOSS_PATTERN_META.summon;
      const summonCount = Math.ceil((4 + Math.floor(currentGame.wave / 2) + (currentGame.time >= 180 ? 2 : 0)) * circuitFinale.bossSummonMultiplier);
      const count = Math.min(12, summonCount, summonSlots());
      for (let index = 0; index < count; index += 1) {
        spawnedEnemies.push(createSummonedRunner(enemy, currentGame.wave + 1, player.current.pos, index));
      }
      hitBursts.current.push({
        pos: enemy.pos.clone(),
        life: 0.92,
        maxLife: 0.92,
        color: meta.color,
        type: 'summon',
        stage: 5,
        radius: 7.8
      });
      weaponEffects.current.push({
        type: 'ring',
        pos: enemy.pos.clone(),
        life: 0.68,
        maxLife: 0.68,
        color: meta.color,
        radius: 10.5
      });
      cameraShake.current = Math.max(cameraShake.current, 0.22);
    }
    return;
  }

  if ((enemy.guardWindupTimer ?? 0) > 0) {
    const before = enemy.guardWindupTimer;
    enemy.guardWindupTimer = Math.max(0, enemy.guardWindupTimer - dt);
    if (before > 0 && enemy.guardWindupTimer <= 0) {
      const meta = BOSS_PATTERN_META.guard;
      enemy.bossGuard = (5.4 + Math.max(0, currentGame.time - 180) * 0.01) * circuitFinale.bossGuardDurationMultiplier;
      hitBursts.current.push({
        pos: enemy.pos.clone(),
        life: 1.0,
        maxLife: 1.0,
        color: meta.color,
        type: 'bossGuard',
        stage: 5,
        radius: 6.4
      });
      weaponEffects.current.push({
        type: 'ring',
        pos: enemy.pos.clone(),
        life: 0.78,
        maxLife: 0.78,
        color: meta.color,
        radius: 9.8
      });
      cameraShake.current = Math.max(cameraShake.current, 0.18);
    }
    return;
  }

  if (enemy.abilityTimer > 0) return;
  const pattern = BOSS_PATTERN_ORDER[enemy.patternIndex % BOSS_PATTERN_ORDER.length];
  enemy.patternIndex += 1;
  const bossPhaseScale = enemy.enraged ? 0.76 : 1;
  enemy.abilityTimer = (pattern === 'guard' ? 6.4 : 7.2) * bossAbilityScale * bossPhaseScale;
  const meta = BOSS_PATTERN_META[pattern];
  const warningRadius = pattern === 'shockwave'
    ? 20 + currentGame.wave * 0.8 + Math.max(0, currentGame.time - 180) * 0.025
    : pattern === 'summon'
      ? 10.5
      : 9.8;
  const warningLife = pattern === 'shockwave' ? 1.35 : 1.08;
  enemy.currentPattern = pattern;
  enemy.currentPatternTimer = warningLife;
  spawnWarnings.current.push({
    pos: enemy.pos.clone(),
    life: warningLife,
    maxLife: warningLife,
    color: meta.color,
    label: meta.label,
    cue: meta.cue,
    radius: warningRadius,
    shape: meta.shape
  });
  weaponEffects.current.push({
    type: 'ring',
    pos: enemy.pos.clone(),
    life: warningLife,
    maxLife: warningLife,
    color: meta.color,
    radius: warningRadius
  });
  showEncounterAlert(updateGame, {
    kind: 'boss-pattern',
    label: meta.label,
    title: `보스 패턴: ${meta.label}`,
    hint: meta.cue,
    color: meta.color,
    pattern
  }, 2.5);

  if (pattern === 'shockwave') {
    enemy.shockwaveTimer = 1.35;
    cameraShake.current = Math.max(cameraShake.current, 0.14);
    return;
  }

  if (pattern === 'summon') {
    enemy.summonWindupTimer = 1.05;
    cameraShake.current = Math.max(cameraShake.current, 0.12);
    return;
  }

  enemy.guardWindupTimer = 1.05;
  cameraShake.current = Math.max(cameraShake.current, 0.12);
}

export function triggerBossRagePhase({
  enemy,
  updateGame,
  hitBursts,
  spawnWarnings,
  cameraShake,
  showEncounterAlert
}) {
  if (enemy.kind !== 'boss' || enemy.enraged || enemy.hp / enemy.maxHp > 0.5) return false;

  enemy.enraged = true;
  enemy.speed *= 1.08;
  enemy.damage *= 1.12;
  enemy.abilityTimer = Math.min(enemy.abilityTimer ?? 0, 1.2);
  hitBursts.current.push({
    pos: enemy.pos.clone(),
    life: 1.2,
    maxLife: 1.2,
    color: '#d96d58',
    type: 'bossRage',
    stage: 5,
    radius: 8.4
  });
  spawnWarnings.current.push({
    pos: enemy.pos.clone(),
    life: 1.5,
    maxLife: 1.5,
    color: '#d96d58',
    label: 'RAGE',
    radius: 7.0
  });
  cameraShake.current = Math.max(cameraShake.current, 0.42);
  showEncounterAlert(updateGame, {
    kind: 'boss',
    label: 'RIFT RAGE',
    title: '보스 분노 페이즈',
    hint: '패턴 가속',
    color: '#d96d58',
    threat: {
      kind: 'boss',
      label: 'RAGE',
      name: '분노 보스',
      weakness: '거리 유지',
      color: '#d96d58'
    },
    message: '보스 분노: 패턴 가속',
    flash: 3.2
  }, 3.6);
  return true;
}
