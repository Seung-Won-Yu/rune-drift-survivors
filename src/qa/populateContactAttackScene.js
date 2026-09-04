import { createEnemy } from '../systems/enemyDirector.js';
import { getEnemyContactReach } from '../systems/enemyContactRuntime.js';
import { getWaveProfile } from '../systems/enemyPacing.js';
import { getEnemyTerrainY, getPlayerTerrainY } from '../systems/terrain.js';

export function populateContactAttackScene({
  player,
  enemies,
  projectiles,
  xpGems,
  hitBursts,
  weaponEffects,
  damageNumbers,
  spawnWarnings
}) {
  const playerX = 11;
  const playerZ = 8;
  player.current.pos.set(playerX, getPlayerTerrainY(playerX, playerZ), playerZ);
  player.current.vel.set(0, 0, 0);
  player.current.invuln = 0;

  const enemy = createEnemy(1, getWaveProfile(1), player.current.pos);
  Object.assign(enemy, {
    kind: 'brute',
    hp: 9_999,
    maxHp: 9_999,
    speed: 0.72,
    damage: 4,
    radius: 1.08,
    hitRadius: 1.58,
    color: '#d96d58',
    contactAttackTimer: 0,
    contactAttackCooldown: 0,
    contactAttackCount: 0,
    contactHitCount: 0
  });
  const attackDistance = getEnemyContactReach(enemy) - 0.82;
  const enemyX = playerX + attackDistance;
  enemy.pos.set(enemyX, getEnemyTerrainY(enemyX, playerZ), playerZ);
  enemy.facingAngle = -Math.PI / 2;

  enemies.current = [enemy];
  projectiles.current = [];
  xpGems.current = [];
  hitBursts.current = [];
  weaponEffects.current = [];
  damageNumbers.current = [];
  spawnWarnings.current = [];
}
