import * as THREE from 'three';
import {
  PLAYER_RADIUS,
  MAX_FIELD_ITEMS
} from '../config/gameTuning.js';
import {
  createFieldItem,
  createSplitRunner,
  getEnemyAccentColor,
  pickFieldItemType
} from './enemyDirector.js';
import { getBuildFocus } from './progression.js';
import {
  getEnemyTerrainY,
  getPlayerTerrainY,
  resolveStaticCollisions
} from './terrain.js';

export function advanceEnemyMotion({
  enemy,
  dt,
  distance,
  toPlayer,
  currentGame,
  getEnemyMovePressure
}) {
  enemy.shocked = Math.max(0, (enemy.shocked ?? 0) - dt);
  const shockMultiplier = enemy.shocked > 0
    ? Math.max(0.54, 0.82 - getBuildFocus(currentGame, 'chain') * 0.035)
    : 1;
  const speedMultiplier = (enemy.chargeTimer > 0 ? 3.1 : enemy.bossGuard > 0 ? 0.72 : 1) * shockMultiplier * getEnemyMovePressure(currentGame);
  enemy.motionSpeed = enemy.speed * speedMultiplier;
  enemy.motionIntent = distance > enemy.radius + PLAYER_RADIUS
    ? THREE.MathUtils.clamp(enemy.motionSpeed / 5.4, 0.16, 1.36)
    : 0.08;
  enemy.pos.addScaledVector(toPlayer, enemy.speed * speedMultiplier * dt);
  resolveStaticCollisions(enemy.pos, enemy.radius * 0.7);
  enemy.groundSync = Math.max(0, (enemy.groundSync ?? 0) - dt);
  if (enemy.groundY === undefined || enemy.groundSync <= 0) {
    enemy.groundY = getEnemyTerrainY(enemy.pos.x, enemy.pos.z);
    enemy.groundSync = enemy.kind === 'boss' || enemy.kind === 'elite' || enemy.chargeTimer > 0
      ? 0.055
      : 0.11 + (enemy.animSpeed % 1) * 0.035;
  }
  enemy.pos.y += (enemy.groundY - enemy.pos.y) * Math.min(1, dt * 8);
  enemy.facingAngle = Math.atan2(toPlayer.x, toPlayer.z);
  enemy.wobble += dt * enemy.animSpeed;
  enemy.flash = Math.max(0, enemy.flash - dt);
}

export function resolveDefeatedEnemies({
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
}) {
  let kills = 0;
  let eliteKills = 0;
  let bossKills = 0;
  const alive = [];

  for (const enemy of enemies.current) {
    if (enemy.hp <= 0) {
      kills += 1;
      if (enemy.kind === 'elite') eliteKills += 1;
      if (enemy.kind === 'boss') bossKills += 1;
      const gemPos = enemy.pos.clone();
      gemPos.y += enemy.kind === 'boss' || enemy.kind === 'elite' ? 1.08 : 0.76;
      addXpGem(gemPos, enemy.xp);
      if (fieldItemDropLock.current <= 0 && fieldItems.current.length < MAX_FIELD_ITEMS) {
        const dropChance = enemy.kind === 'boss' || enemy.kind === 'elite' ? 1 : enemy.kind === 'brute' ? 0.09 : enemy.kind === 'runner' ? 0.028 : 0.038;
        if (Math.random() < dropChance) {
          const dropPos = enemy.pos.clone();
          dropPos.y = getPlayerTerrainY(dropPos.x, dropPos.z) + 0.42;
          const dropType = enemy.kind === 'boss'
            ? 'purge'
            : enemy.kind === 'elite'
              ? (Math.random() < 0.45 ? 'cache' : Math.random() < 0.74 ? 'overload' : 'heal')
              : Math.random() > 0.76 ? 'purge' : pickFieldItemType(currentGame);
          fieldItems.current.push(createFieldItem(dropType, dropPos));
          fieldItemDropLock.current = enemy.kind === 'boss' || enemy.kind === 'elite' ? 3.2 : 6.2;
        }
      }
      if (canAddHitBurst(10)) {
        hitBursts.current.push({ pos: enemy.pos.clone(), life: 0.36, maxLife: 0.36, color: enemy.kind === 'elite' || enemy.kind === 'boss' ? getEnemyAccentColor(enemy) : '#9df57a' });
      }
      addDamageNumber(
        enemy.pos,
        enemy.kind === 'boss' ? 'BOSS DOWN' : enemy.kind === 'elite' ? 'ELITE DOWN' : `+${enemy.xp}`,
        enemy.kind === 'boss' || enemy.kind === 'elite' ? getEnemyAccentColor(enemy) : '#9df57a',
        enemy.kind === 'boss' || enemy.kind === 'elite' ? 0.95 : 0.54
      );
      if (enemy.canSplit && enemies.current.length + spawnedEnemies.length < runtimeBudget.maxEnemies - 4) {
        const splitCount = enemy.kind === 'brute' ? 3 : 2;
        for (let index = 0; index < splitCount; index += 1) {
          spawnedEnemies.push(createSplitRunner(enemy, currentGame.wave, player.current.pos, index));
        }
        spawnWarnings.current.push({
          pos: enemy.pos.clone(),
          life: 0.56,
          maxLife: 0.56,
          color: '#d8b2ff',
          label: 'SPLIT'
        });
      }
    } else {
      alive.push(enemy);
    }
  }

  enemies.current = alive;
  return { kills, eliteKills, bossKills };
}
