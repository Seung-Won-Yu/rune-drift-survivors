import { EARLY_FIELD_ITEM_SCHEDULE } from '../config/gameData.js';
import { createEnemy } from '../systems/enemyDirector.js';
import { getWaveProfile } from '../systems/enemyPacing.js';
import { getEnemyTerrainY } from '../systems/terrain.js';

const TARGET_RINGS = [
  { radius: 4.2, count: 4 },
  { radius: 8.8, count: 6 },
  { radius: 15.2, count: 8 }
];

export function populateCombatIdentityScene({
  player,
  enemies,
  projectiles,
  xpGems,
  fieldItems,
  scheduledFieldItems,
  hitBursts,
  weaponEffects,
  damageNumbers,
  spawnWarnings
}) {
  player.current.pos.set(0, 0.55, 0);
  player.current.vel.set(0, 0, 0);
  player.current.invuln = 0;

  const profile = getWaveProfile(5);
  const targets = [];
  TARGET_RINGS.forEach((ring, ringIndex) => {
    for (let index = 0; index < ring.count; index += 1) {
      const angle = index * Math.PI * 2 / ring.count + ringIndex * 0.28;
      const enemy = createEnemy(5, profile, player.current.pos);
      enemy.kind = ringIndex === 0 ? 'brute' : ringIndex === 1 ? 'golem' : index % 3 === 0 ? 'runner' : 'golem';
      enemy.pos.set(
        Math.cos(angle) * ring.radius,
        getEnemyTerrainY(Math.cos(angle) * ring.radius, Math.sin(angle) * ring.radius),
        Math.sin(angle) * ring.radius
      );
      enemy.hp = 9_999;
      enemy.maxHp = 9_999;
      enemy.speed = 0;
      enemy.damage = 0;
      enemy.contactAttackCooldown = 9_999;
      enemy.canSplit = false;
      enemy.facingAngle = Math.atan2(-enemy.pos.x, -enemy.pos.z);
      targets.push(enemy);
    }
  });

  enemies.current = targets;
  projectiles.current = [];
  xpGems.current = [];
  fieldItems.current = [];
  scheduledFieldItems.current = new Set(EARLY_FIELD_ITEM_SCHEDULE.map(item => item.id));
  hitBursts.current = [];
  weaponEffects.current = [];
  damageNumbers.current = [];
  spawnWarnings.current = [];
}
