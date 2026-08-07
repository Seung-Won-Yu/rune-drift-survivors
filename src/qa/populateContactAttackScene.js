import { createEnemy } from '../systems/enemyDirector.js';
import { getEnemyContactReach } from '../systems/enemyContactRuntime.js';
import { getWaveProfile } from '../systems/enemyPacing.js';
import { getEnemyTerrainY } from '../systems/terrain.js';

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
  player.current.pos.set(0, 0.55, 0);
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
  enemy.pos.set(attackDistance, getEnemyTerrainY(attackDistance, 0), 0);
  enemy.facingAngle = -Math.PI / 2;

  enemies.current = [enemy];
  projectiles.current = [];
  xpGems.current = [];
  hitBursts.current = [];
  weaponEffects.current = [];
  damageNumbers.current = [];
  spawnWarnings.current = [];
}
