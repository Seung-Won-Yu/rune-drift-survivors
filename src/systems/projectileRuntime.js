import * as THREE from 'three';
import { WEAPON_CATALOG as weaponCatalog } from '../config/gameData.js';
import {
  PROJECTILE_GRID_CELL_SIZE,
  PROJECTILE_GRID_KEY_STRIDE
} from '../config/gameTuning.js';
import { applyDamageToEnemy } from './enemyDirector.js';
import {
  getBladeColor,
  getBladeCount,
  getBuildFocus,
  getWeaponStage,
  isWeaponFamilyUnlocked
} from './progression.js';

const projectilePush = new THREE.Vector3();
const bladePos = new THREE.Vector3();
const bladeOffset = new THREE.Vector3();

function getProjectileGridCoord(value) {
  return Math.floor(value / PROJECTILE_GRID_CELL_SIZE);
}

function getProjectileGridKey(cellX, cellZ) {
  return cellX * PROJECTILE_GRID_KEY_STRIDE + cellZ;
}

export function addProjectileRuntime({ projectiles, runtimeBudget, projectile }) {
  if (projectiles.current.length < runtimeBudget.maxProjectiles) {
    projectiles.current.push(projectile);
    return true;
  }

  const replaceIndex = projectiles.current.findIndex(existing => (
    existing.life < 0.14 || (projectile.type === 'storm' && existing.type === 'orb')
  ));
  if (replaceIndex < 0) return false;
  projectiles.current[replaceIndex] = projectile;
  return true;
}

export function updateProjectileRuntime({
  dt,
  stats,
  currentGame,
  runtimeBudget,
  player,
  enemies,
  projectiles,
  hitBursts,
  hitsStaticCollider,
  recordDamage,
  addDamageNumber,
  canAddHitBurst
}) {
  const angle = performance.now() * 0.0024;
  const weaponStage = getWeaponStage(currentGame);
  const overloadDamage = currentGame.overloadTimer > 0 ? 1.25 : 1;
  const bladeFocus = getBuildFocus(currentGame, 'blade');
  const bladeUnlocked = isWeaponFamilyUnlocked(currentGame, 'blade');
  const bladeRadius = (2.5 + weaponStage * 0.16 + bladeFocus * 0.08) * stats.bladeRadius;
  const bladeCount = getBladeCount(stats, bladeFocus, bladeUnlocked);
  const bladeColor = getBladeColor(stats, weaponStage);

  for (let i = 0; i < bladeCount; i += 1) {
    const offset = angle + i * (Math.PI * 2 / bladeCount);
    bladePos.copy(player.current.pos).add(bladeOffset.set(Math.cos(offset) * bladeRadius, 0.22, Math.sin(offset) * bladeRadius));
    for (const enemy of enemies.current) {
      const hitRadiusSq = enemy.hitRadius * enemy.hitRadius;
      if (enemy.pos.distanceToSquared(bladePos) < hitRadiusSq) {
        const bladeDamage = weaponCatalog[2].damage * stats.damage * stats.bladeDamage * overloadDamage * dt * (6 + weaponStage * 0.75 + bladeFocus * 0.32);
        const dealt = applyDamageToEnemy(enemy, bladeDamage, 'blade');
        recordDamage('blade', dealt);
        enemy.flash = 0.1;
        enemy.bladeNumberTimer = (enemy.bladeNumberTimer ?? 0) - dt;
        if (enemy.bladeNumberTimer <= 0) {
          enemy.bladeNumberTimer = 0.22;
          addDamageNumber(enemy.pos, Math.ceil(dealt * 5), bladeColor, 0.46 + weaponStage * 0.03);
          if (canAddHitBurst(8)) {
            hitBursts.current.push({
              pos: enemy.pos.clone(),
              life: 0.22 + weaponStage * 0.03,
              maxLife: 0.22 + weaponStage * 0.03,
              color: bladeColor,
              type: 'blade',
              stage: weaponStage,
              radius: 0.7 + weaponStage * 0.18
            });
          }
        }
      }
    }
  }

  let projectileWrite = 0;
  for (const projectile of projectiles.current) {
    projectile.life -= dt;
    projectile.pos.addScaledVector(projectile.vel, dt);
    if (projectile.life <= 0 || projectile.pierce < 0 || hitsStaticCollider(projectile.pos, projectile.radius * 0.55)) continue;
    if (projectileWrite < runtimeBudget.maxProjectiles) {
      projectiles.current[projectileWrite] = projectile;
      projectileWrite += 1;
    }
  }
  projectiles.current.length = projectileWrite;
}

export function rebuildProjectileGrid(grid, projectiles) {
  grid.cells.clear();
  grid.maxRadius = 0;
  grid.candidates.length = 0;

  for (const projectile of projectiles) {
    if (projectile.life <= 0 || projectile.pierce < 0) continue;
    const cellX = getProjectileGridCoord(projectile.pos.x);
    const cellZ = getProjectileGridCoord(projectile.pos.z);
    const key = getProjectileGridKey(cellX, cellZ);
    let bucket = grid.cells.get(key);
    if (!bucket) {
      bucket = [];
      grid.cells.set(key, bucket);
    }
    bucket.push(projectile);
    grid.maxRadius = Math.max(grid.maxRadius, projectile.radius ?? 0);
  }
}

export function getProjectileCandidatesForEnemy(grid, enemy) {
  const candidates = grid.candidates;
  candidates.length = 0;
  if (grid.cells.size === 0) return candidates;

  const centerX = getProjectileGridCoord(enemy.pos.x);
  const centerZ = getProjectileGridCoord(enemy.pos.z);
  const radius = enemy.hitRadius + grid.maxRadius;
  const cellRange = Math.max(1, Math.ceil(radius / PROJECTILE_GRID_CELL_SIZE));

  for (let cellX = centerX - cellRange; cellX <= centerX + cellRange; cellX += 1) {
    for (let cellZ = centerZ - cellRange; cellZ <= centerZ + cellRange; cellZ += 1) {
      const bucket = grid.cells.get(getProjectileGridKey(cellX, cellZ));
      if (!bucket) continue;
      for (const projectile of bucket) {
        candidates.push(projectile);
      }
    }
  }

  return candidates;
}

export function resolveProjectileHitsForEnemy({
  enemy,
  projectiles,
  player,
  hitBursts,
  cameraShake,
  recordDamage,
  addDamageNumber,
  canAddHitBurst
}) {
  for (const projectile of projectiles) {
    if (projectile.life <= 0 || projectile.pierce < 0) continue;
    if (projectile.pos.distanceToSquared(enemy.pos) < (enemy.hitRadius + projectile.radius) ** 2) {
      const dealt = applyDamageToEnemy(enemy, projectile.damage, projectile.type);
      recordDamage(projectile.type, dealt);
      enemy.flash = 0.14;
      projectile.pierce -= 1;
      const push = projectile.type === 'storm'
        ? projectilePush.copy(enemy.pos).sub(player.current.pos).setY(0)
        : projectilePush.copy(projectile.vel).setY(0);
      if (push.lengthSq() > 0.001) {
        enemy.pos.addScaledVector(push.normalize(), projectile.type === 'storm' ? 0.28 : 0.18);
      }
      addDamageNumber(enemy.pos, Math.ceil(dealt), projectile.color, projectile.type === 'storm' ? 0.82 : 0.62);
      if (canAddHitBurst(8)) {
        hitBursts.current.push({
          pos: enemy.pos.clone(),
          life: 0.28 + (projectile.stage ?? 0) * 0.04,
          maxLife: 0.28 + (projectile.stage ?? 0) * 0.04,
          color: projectile.color,
          type: projectile.type,
          stage: projectile.stage ?? 0,
          radius: projectile.radius
        });
      }
      cameraShake.current = Math.max(cameraShake.current, projectile.type === 'storm' ? 0.16 : 0.08);
    }
  }
}
