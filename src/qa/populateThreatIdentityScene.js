import { EARLY_FIELD_ITEM_SCHEDULE } from '../config/gameData.js';
import { createBoss, createElite } from '../systems/enemyDirector.js';
import { getEnemyTerrainY } from '../systems/terrain.js';

const THREAT_LAYOUT = [
  { minute: 1, x: -12, z: -2 },
  { minute: 2, x: -4.5, z: -9 },
  { minute: 3, x: 5, z: -9 }
];

export function populateThreatIdentityScene({
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

  const threats = THREAT_LAYOUT.map(({ minute, x, z }) => {
    const enemy = createElite(minute, 8, player.current.pos);
    enemy.pos.set(x, getEnemyTerrainY(x, z), z);
    enemy.hp = 9_999;
    enemy.maxHp = 9_999;
    enemy.speed = 0;
    enemy.damage = 0;
    enemy.contactAttackCooldown = 9_999;
    enemy.facingAngle = Math.atan2(-x, -z);
    return enemy;
  });
  const boss = createBoss(8, player.current.pos);
  boss.pos.set(13, getEnemyTerrainY(13, -1), -1);
  boss.hp = 9_999;
  boss.maxHp = 9_999;
  boss.speed = 0;
  boss.damage = 0;
  boss.contactAttackCooldown = 9_999;
  boss.facingAngle = Math.atan2(-boss.pos.x, -boss.pos.z);
  threats.push(boss);

  enemies.current = threats;
  projectiles.current = [];
  xpGems.current = [];
  fieldItems.current = [];
  scheduledFieldItems.current = new Set(EARLY_FIELD_ITEM_SCHEDULE.map(item => item.id));
  hitBursts.current = [];
  weaponEffects.current = [];
  damageNumbers.current = [];
  spawnWarnings.current = [];
}
