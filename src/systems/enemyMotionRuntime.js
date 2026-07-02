import * as THREE from 'three';

import { PLAYER_RADIUS } from '../config/gameTuning.js';
import { getEnemyMovePressure } from './enemyPacing.js';
import { getBuildFocus } from './progression.js';
import {
  getEnemyTerrainY,
  resolveStaticCollisions
} from './terrain.js';

export function advanceEnemyMotion({
  enemy,
  dt,
  distance,
  toPlayer,
  currentGame
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
