import * as THREE from 'three';

import {
  BOSS_PATTERN_META,
  EARLY_FIELD_ITEM_SCHEDULE,
  ELITE_ROLE_META
} from '../config/gameData.js';
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
  const charger = threats.find(enemy => enemy.role === 'charger');

  enemies.current = threats;
  projectiles.current = [];
  xpGems.current = [];
  fieldItems.current = [];
  scheduledFieldItems.current = new Set(EARLY_FIELD_ITEM_SCHEDULE.map(item => item.id));
  hitBursts.current = [];
  weaponEffects.current = charger ? [{
    type: 'beam',
    from: charger.pos.clone().add(new THREE.Vector3(0, 0.9, 0)),
    to: player.current.pos.clone().add(new THREE.Vector3(0, 0.9, 0)),
    life: 0.16,
    maxLife: 0.38,
    color: ELITE_ROLE_META.charger.color,
    width: 0.08,
    signal: 'threat'
  }] : [];
  damageNumbers.current = [];
  spawnWarnings.current = [
    ...(charger ? [{
      pos: charger.pos.clone().add(player.current.pos).multiplyScalar(0.5),
      life: 0.16,
      maxLife: 0.52,
      color: ELITE_ROLE_META.charger.color,
      label: 'CHARGE',
      cue: '돌진선 이탈',
      shape: 'charge',
      radius: 4.4,
      signal: 'threat'
    }] : []),
    {
      pos: boss.pos.clone(),
      life: 0.28,
      maxLife: 1.35,
      color: BOSS_PATTERN_META.shockwave.color,
      label: BOSS_PATTERN_META.shockwave.label,
      cue: BOSS_PATTERN_META.shockwave.cue,
      shape: BOSS_PATTERN_META.shockwave.shape,
      radius: 11.5,
      signal: 'threat'
    }
  ];
}
