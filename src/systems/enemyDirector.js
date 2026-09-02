import * as THREE from 'three';
import {
  BOSS_PATTERN_META,
  BOSS_PATTERN_ORDER,
  ELITE_ROLE_META,
  FIELD_ITEM_META
} from '../config/gameData.js';
import { ARENA_RADIUS } from '../config/gameTuning.js';
import { getWaveProfile } from './enemyPacing.js';
import {
  getEnemyTerrainY,
  resolveStaticCollisions
} from './terrain.js';

function getSpawnPositionAroundPlayer(playerPos, minDistance = 36, spread = 24) {
  const angle = Math.random() * Math.PI * 2;
  const distance = minDistance + Math.random() * spread;
  const pos = new THREE.Vector3(
    playerPos.x + Math.cos(angle) * distance,
    0.02,
    playerPos.z + Math.sin(angle) * distance
  );
  const flat = new THREE.Vector2(pos.x, pos.z);
  const maxRadius = ARENA_RADIUS - 3.2;
  if (flat.length() > maxRadius) {
    flat.setLength(maxRadius - Math.random() * 4.5);
    pos.x = flat.x;
    pos.z = flat.y;
  }
  pos.y = getEnemyTerrainY(pos.x, pos.z);
  return pos;
}

export function createEnemy(wave, waveProfile = getWaveProfile(wave), playerPos = new THREE.Vector3()) {
  const typeRoll = Math.random();
  const isRunner = typeRoll < waveProfile.runner;
  const isBrute = !isRunner && typeRoll > 1 - waveProfile.brute;
  const kind = isBrute ? 'brute' : isRunner ? 'runner' : 'golem';
  const hp = (isBrute ? 84 : isRunner ? 32 : 42) + wave * (isBrute ? 8 : isRunner ? 3.8 : 4.8);
  const survivalScale = 1.1 + Math.max(0, wave - 1) * 0.05;
  const affix = waveProfile.affix ?? 'scout';
  const statMods = getWaveEnemyMods(affix, kind);
  const openingDistanceOffset = wave <= 1 ? -4 : wave === 2 ? -2 : 0;
  const pos = getSpawnPositionAroundPlayer(
    playerPos,
    (isRunner ? 37 : isBrute ? 42 : 35) + openingDistanceOffset + (affix === 'siege' ? 4 : 0),
    24
  );
  const facingAngle = Math.atan2(playerPos.x - pos.x, playerPos.z - pos.z);
  const maxHp = hp * survivalScale * statMods.hp;
  return {
    kind,
    affix,
    pos,
    hp: maxHp,
    maxHp,
    speed: ((isRunner ? 4.15 : isBrute ? 2.08 : 2.9) + wave * 0.07) * statMods.speed,
    damage: (isBrute ? 6 : isRunner ? 2.5 : 3.5) * statMods.damage,
    radius: (isBrute ? 1.08 : isRunner ? 0.62 : 0.76) * statMods.size,
    hitRadius: (isBrute ? 1.58 : isRunner ? 1.1 : 1.28) * statMods.size,
    xp: Math.ceil((isBrute ? 11 : isRunner ? 4 : 5) * statMods.xp),
    color: getAffixEnemyColor(affix, kind),
    canSplit: affix === 'split' && kind !== 'runner' && Math.random() < 0.52,
    flash: 0,
    facingAngle,
    wobble: Math.random() * Math.PI * 2,
    animSpeed: 4 + Math.random() * 3
  };
}

export function applyCombatRhythm(enemy, rhythm) {
  if (!rhythm) return enemy;
  enemy.hp *= rhythm.hp;
  enemy.maxHp *= rhythm.hp;
  return enemy;
}

export function createElite(minuteMark, wave, playerPos = new THREE.Vector3()) {
  const role = getEliteRole(minuteMark);
  const meta = ELITE_ROLE_META[role];
  const pos = getSpawnPositionAroundPlayer(playerPos, 44 + minuteMark * 3, 18);
  const hp = 210 + minuteMark * 74 + wave * 28;
  const shieldMax = role === 'bulwark' ? 95 + wave * 9 : 0;
  return {
    kind: 'elite',
    role,
    pos,
    hp,
    maxHp: hp,
    speed: (role === 'charger' ? 2.55 : role === 'summoner' ? 1.92 : 2.08) + minuteMark * 0.08,
    damage: 7 + minuteMark,
    radius: role === 'charger' ? 1.18 : 1.35,
    hitRadius: role === 'charger' ? 1.92 : 2.18,
    xp: 42 + minuteMark * 14,
    color: meta.color,
    shield: shieldMax,
    shieldMax,
    abilityTimer: role === 'charger' ? 2.2 : role === 'summoner' ? 3.4 : 4.8,
    chargeTimer: 0,
    flash: 0,
    facingAngle: Math.atan2(playerPos.x - pos.x, playerPos.z - pos.z),
    wobble: 0,
    animSpeed: 2.9
  };
}

export function createBoss(wave, playerPos = new THREE.Vector3()) {
  const pos = getSpawnPositionAroundPlayer(playerPos, 50, 18);
  const hp = 280 + wave * 66;
  return {
    kind: 'boss',
    wave,
    pos,
    hp,
    maxHp: hp,
    speed: 1.36 + wave * 0.035,
    damage: 8 + wave,
    radius: 1.8,
    hitRadius: 2.85,
    xp: 64 + wave * 9,
    color: '#d4a84c',
    abilityTimer: 2.8,
    patternIndex: 0,
    currentPattern: BOSS_PATTERN_ORDER[0],
    currentPatternTimer: 0,
    enraged: false,
    shockwaveTimer: 0,
    bossGuard: 0,
    flash: 0,
    facingAngle: Math.atan2(playerPos.x - pos.x, playerPos.z - pos.z),
    wobble: 0,
    animSpeed: 2.4
  };
}

export function createSummonedRunner(source, wave, playerPos = new THREE.Vector3(), index = 0) {
  const angle = index * 1.31 + Math.random() * 0.6;
  const distance = 4.2 + Math.random() * 5.2;
  const pos = new THREE.Vector3(
    source.pos.x + Math.cos(angle) * distance,
    0.02,
    source.pos.z + Math.sin(angle) * distance
  );
  const flat = new THREE.Vector2(pos.x, pos.z);
  if (flat.length() > ARENA_RADIUS - 4) {
    flat.setLength(ARENA_RADIUS - 4);
    pos.x = flat.x;
    pos.z = flat.y;
  }
  resolveStaticCollisions(pos, 0.9);
  pos.y = getEnemyTerrainY(pos.x, pos.z);
  return {
    kind: 'runner',
    summoned: true,
    pos,
    hp: 18 + wave * 3.4,
    maxHp: 18 + wave * 3.4,
    speed: 4.55 + wave * 0.045,
    damage: 2.5,
    radius: 0.56,
    hitRadius: 1.0,
    xp: 2,
    color: '#58b9d4',
    flash: 0,
    facingAngle: Math.atan2(playerPos.x - pos.x, playerPos.z - pos.z),
    wobble: Math.random() * Math.PI * 2,
    animSpeed: 6.2
  };
}

export function createSplitRunner(source, wave, playerPos = new THREE.Vector3(), index = 0) {
  const angle = source.wobble + index * Math.PI * 2 / 3 + Math.random() * 0.35;
  const distance = 2.8 + Math.random() * 2.4;
  const pos = source.pos.clone().add(new THREE.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance));
  const flat = new THREE.Vector2(pos.x, pos.z);
  if (flat.length() > ARENA_RADIUS - 4) {
    flat.setLength(ARENA_RADIUS - 4);
    pos.x = flat.x;
    pos.z = flat.y;
  }
  resolveStaticCollisions(pos, 0.72);
  pos.y = getEnemyTerrainY(pos.x, pos.z);
  return {
    kind: 'runner',
    affix: 'split',
    splitSpawn: true,
    pos,
    hp: 12 + wave * 2.8,
    maxHp: 12 + wave * 2.8,
    speed: 4.8 + wave * 0.05,
    damage: 2.2,
    radius: 0.5,
    hitRadius: 0.88,
    xp: 1,
    color: '#aa91cf',
    flash: 0,
    facingAngle: Math.atan2(playerPos.x - pos.x, playerPos.z - pos.z),
    wobble: Math.random() * Math.PI * 2,
    animSpeed: 6.4
  };
}

function getEliteRole(minuteMark) {
  return ['bulwark', 'charger', 'summoner'][(minuteMark - 1) % 3];
}

export function applyDamageToEnemy(enemy, damage, source = 'generic') {
  let modifier = 1;

  if (enemy.kind === 'boss' && enemy.bossGuard > 0) {
    modifier *= source === 'orb' || source === 'lightning' ? 1.08 : 0.72;
  }

  if (enemy.kind === 'elite' && enemy.role === 'bulwark' && enemy.shield > 0) {
    if (source === 'blade' || source === 'nova') {
      enemy.shield = Math.max(0, enemy.shield - damage * 0.72);
      modifier *= 1.18;
    } else if (source === 'storm') {
      enemy.shield = Math.max(0, enemy.shield - damage * 0.52);
      modifier *= 0.9;
    } else {
      enemy.shield = Math.max(0, enemy.shield - damage * 0.18);
      modifier *= 0.56;
    }
  }

  if (enemy.kind === 'elite' && enemy.role === 'charger') {
    if (source === 'storm' || source === 'lightning') modifier *= 1.22;
    if (source === 'blade') modifier *= 0.9;
  }

  if (enemy.kind === 'elite' && enemy.role === 'summoner') {
    if (source === 'orb' || source === 'lightning') modifier *= 1.18;
    if (source === 'nova') modifier *= 0.92;
  }

  const dealt = damage * modifier;
  enemy.hp -= dealt;
  return dealt;
}

export function getEnemyAccentColor(enemy) {
  if (typeof enemy === 'string') return getSpawnColor(enemy);
  if (enemy.kind === 'elite') return ELITE_ROLE_META[enemy.role]?.color ?? FIELD_ITEM_META.overload.color;
  if (enemy.kind === 'boss') return enemy.bossGuard > 0 ? BOSS_PATTERN_META.guard.color : '#d4a84c';
  if (enemy.affix) return getAffixEnemyColor(enemy.affix, enemy.kind);
  return getSpawnColor(enemy.kind);
}

export function getEnemyDisplayName(enemy) {
  if (enemy.kind === 'boss') return enemy.bossGuard > 0 ? 'RIFT WARDEN' : 'RIFT BEAST';
  if (enemy.kind === 'elite') return `RIFT ${ELITE_ROLE_META[enemy.role]?.label ?? 'ELITE'}`;
  return '';
}

export function getSpawnColor(kind) {
  if (kind === 'boss') return '#d4a84c';
  if (kind === 'elite') return FIELD_ITEM_META.overload.color;
  if (kind === 'runner') return '#58b9d4';
  if (kind === 'brute') return '#d96d58';
  return '#70f0b4';
}

function getAffixEnemyColor(affix, kind) {
  if (affix === 'pack') return kind === 'runner' ? '#7fc9d8' : '#58b9d4';
  if (affix === 'stone') return kind === 'brute' ? '#d4a84c' : '#a8b47a';
  if (affix === 'split') return kind === 'runner' ? '#aa91cf' : '#c2a6d8';
  if (affix === 'siege') return kind === 'brute' ? '#d96d58' : '#c98655';
  return getSpawnColor(kind);
}

function getWaveEnemyMods(affix, kind) {
  const mods = { hp: 1, speed: 1, damage: 1, size: 1, xp: 1 };
  if (affix === 'pack' && kind === 'runner') {
    return { hp: 0.9, speed: 1.2, damage: 1.08, size: 0.96, xp: 1.05 };
  }
  if (affix === 'stone') {
    return { hp: kind === 'brute' ? 1.28 : 1.16, speed: 0.9, damage: 1.06, size: kind === 'brute' ? 1.08 : 1.02, xp: 1.14 };
  }
  if (affix === 'split') {
    return { hp: 0.92, speed: 1.08, damage: 0.96, size: 0.98, xp: 1.08 };
  }
  if (affix === 'siege') {
    return { hp: kind === 'brute' ? 1.18 : 1.08, speed: 1.04, damage: 1.18, size: kind === 'brute' ? 1.06 : 1, xp: 1.16 };
  }
  return mods;
}
