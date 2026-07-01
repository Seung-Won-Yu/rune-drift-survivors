import * as THREE from 'three';

import { ELITE_ROLE_META } from '../config/gameData.js';
import {
  MAX_DAMAGE_NUMBERS,
  MAX_HIT_BURSTS,
  MAX_SPAWN_WARNINGS,
  MAX_WEAPON_EFFECTS
} from '../config/gameTuning.js';
import { getRuntimeBudget } from '../hooks/useVisualQuality.js';
import {
  applyCombatRhythm,
  createBoss,
  createEnemy,
  getCombatRhythm,
  getWaveProfile
} from '../systems/enemyDirector.js';
import { getEnemyTerrainY, getPlayerTerrainY } from '../systems/terrain.js';

export function populateStressScene({
  options = {},
  visualQuality,
  player,
  enemies,
  projectiles,
  xpGems,
  hitBursts,
  weaponEffects,
  damageNumbers,
  spawnWarnings
}) {
  const stressBudget = getRuntimeBudget(visualQuality);
  const wave = options.wave ?? 12;
  const enemyCount = Math.min(stressBudget.maxEnemies - 1, options.enemies ?? 160);
  const projectileCount = Math.min(stressBudget.maxProjectiles, options.projectiles ?? 210);
  const gemCount = Math.min(stressBudget.maxXpGems, options.gems ?? 420);
  const hitBurstCount = Math.min(MAX_HIT_BURSTS, options.hitBursts ?? MAX_HIT_BURSTS);
  const weaponEffectCount = Math.min(MAX_WEAPON_EFFECTS, options.weaponEffects ?? MAX_WEAPON_EFFECTS);
  const profile = getWaveProfile(wave);
  const rhythm = getCombatRhythm({ time: 246, wave });

  player.current.pos.set(0, 0.55, 0);
  enemies.current = [];
  const boss = createBoss(wave, player.current.pos);
  boss.pos.set(18, getEnemyTerrainY(18, -20), -20);
  boss.enraged = true;
  boss.currentPattern = 'shockwave';
  boss.currentPatternTimer = 0.8;
  boss.patternIndex = 4;
  boss.hp = boss.maxHp * 0.38;
  enemies.current.push(boss);

  for (let index = 1; index < enemyCount; index += 1) {
    const angle = index * 2.399;
    const ring = 16 + (index % 7) * 5.2;
    const enemy = applyCombatRhythm(createEnemy(wave, profile, player.current.pos), rhythm);
    enemy.pos.set(Math.cos(angle) * ring, 0, Math.sin(angle) * ring);
    enemy.pos.y = getEnemyTerrainY(enemy.pos.x, enemy.pos.z);
    enemy.facingAngle = Math.atan2(-enemy.pos.x, -enemy.pos.z);
    if (index % 19 === 0) {
      enemy.kind = 'elite';
      enemy.role = index % 38 === 0 ? 'bulwark' : 'charger';
      enemy.radius = 1.28;
      enemy.hitRadius = 2.08;
      enemy.color = ELITE_ROLE_META[enemy.role].color;
      enemy.hp *= 2.6;
      enemy.maxHp = enemy.hp;
    }
    enemies.current.push(enemy);
  }

  projectiles.current = Array.from({ length: projectileCount }, (_, index) => {
    const type = index % 5 === 0 ? 'storm' : 'orb';
    const angle = index * 1.618;
    const radius = 4 + (index % 18) * 2.1;
    const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    return {
      type,
      pos: new THREE.Vector3(dir.x * radius, 0.65 + (index % 4) * 0.05, dir.z * radius),
      vel: type === 'storm' ? new THREE.Vector3() : dir.multiplyScalar(12 + (index % 5)),
      angle,
      life: 0.9 + (index % 7) * 0.08,
      damage: 40,
      pierce: 4,
      radius: type === 'storm' ? 2.1 : 0.42,
      visualScale: type === 'storm' ? 1.6 : 1.15,
      stage: 4,
      burstRadius: 3.6,
      trailLength: 2.4,
      color: type === 'storm' ? '#b8f7ff' : '#70d6ff'
    };
  });

  xpGems.current = Array.from({ length: gemCount }, (_, index) => {
    const angle = index * 2.17;
    const radius = 8 + (index % 28) * 2.6;
    const pos = new THREE.Vector3(Math.cos(angle) * radius, 0.9, Math.sin(angle) * radius);
    pos.y = getPlayerTerrainY(pos.x, pos.z) + 0.72;
    return { pos, value: 4 + (index % 5), pulse: Math.random() * Math.PI * 2 };
  });

  hitBursts.current = Array.from({ length: hitBurstCount }, (_, index) => {
    const angle = index * 1.77;
    const radius = 7 + (index % 16) * 3;
    return {
      pos: new THREE.Vector3(Math.cos(angle) * radius, 0.8, Math.sin(angle) * radius),
      life: 0.45 + (index % 5) * 0.08,
      maxLife: 0.8,
      color: index % 3 === 0 ? '#ff8b72' : index % 3 === 1 ? '#70d6ff' : '#fff1a6',
      type: index % 3 === 0 ? 'storm' : 'hit',
      stage: 4,
      radius: 1.2 + (index % 5) * 0.28
    };
  });

  weaponEffects.current = Array.from({ length: weaponEffectCount }, (_, index) => {
    const angle = index * 1.31;
    const radius = 6 + (index % 12) * 3.4;
    return {
      type: 'ring',
      pos: new THREE.Vector3(Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius),
      life: 0.38 + (index % 6) * 0.08,
      maxLife: 0.86,
      color: index % 2 === 0 ? '#73fbd3' : '#d8b2ff',
      radius: 4.2 + (index % 4)
    };
  });

  damageNumbers.current = Array.from({ length: MAX_DAMAGE_NUMBERS }, (_, index) => {
    const angle = index * 1.49;
    const radius = 5 + (index % 14) * 3.2;
    return {
      pos: new THREE.Vector3(Math.cos(angle) * radius, 1.4, Math.sin(angle) * radius),
      value: index % 6 === 0 ? 'CRIT' : `${42 + index}`,
      color: index % 2 === 0 ? '#fff1a6' : '#d8b2ff',
      size: 0.45 + (index % 4) * 0.04,
      age: 0,
      life: 0.4 + (index % 5) * 0.04,
      maxLife: 0.64
    };
  });

  spawnWarnings.current = Array.from({ length: MAX_SPAWN_WARNINGS }, (_, index) => {
    const angle = index * 2.61;
    const radius = 20 + (index % 8) * 6;
    return {
      pos: new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius),
      life: 1.1,
      maxLife: 1.1,
      color: index % 2 === 0 ? '#ff8b72' : '#70d6ff',
      label: index < 3 ? 'SURGE' : '',
      radius: 2.8 + (index % 4) * 0.6
    };
  });
}
