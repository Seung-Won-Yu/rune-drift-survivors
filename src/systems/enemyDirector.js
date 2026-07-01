import * as THREE from 'three';
import {
  BOSS_PATTERN_META,
  BOSS_PATTERN_ORDER,
  COMBAT_RHYTHM,
  ELITE_ROLE_META,
  FIELD_ITEM_META,
  WAVE_PROFILES
} from '../config/gameData.js';
import { ARENA_RADIUS } from '../config/gameTuning.js';
import { createEmptyBuildFocus } from './gameState.js';
import {
  getEnemyTerrainY,
  getPlayerTerrainY,
  hitsStaticCollider,
  resolveStaticCollisions
} from './terrain.js';

export function getWaveProfile(wave) {
  const base = WAVE_PROFILES[(wave - 1) % WAVE_PROFILES.length];
  const cycle = Math.floor((wave - 1) / WAVE_PROFILES.length);
  return {
    ...base,
    targetBase: base.targetBase + cycle * 10,
    spawnBase: Math.min(15, base.spawnBase + cycle),
    runner: Math.min(0.44, base.runner + cycle * 0.035),
    brute: Math.min(0.36, base.brute + cycle * 0.035),
    interval: Math.max(0.42, base.interval - cycle * 0.045)
  };
}

export function getWaveThreat(wave, waveProfile = getWaveProfile(wave)) {
  return Math.min(99, Math.round(26 + wave * 5.2 + (waveProfile.runner + waveProfile.brute) * 58));
}

export function getCombatRhythm(game) {
  return COMBAT_RHYTHM.find(phase => game.time < phase.until) ?? COMBAT_RHYTHM[COMBAT_RHYTHM.length - 1];
}

export function getCrisisState(game) {
  if (game.time >= 245) return { level: 4, label: 'FINAL SURGE' };
  if (game.time >= 195) return { level: 3, label: 'ELITE SURGE' };
  if (game.time >= 150) return { level: 2, label: 'RIFT SURGE' };
  if (game.time >= 120) return { level: 1, label: 'RIFT RISING' };
  return { level: 0, label: '' };
}

export function getBossPhaseMeta(hpPct, enraged = false) {
  if (enraged || hpPct <= 0.5) return { label: 'RAGE', color: '#ff8b72' };
  if (hpPct <= 0.75) return { label: 'PRESSURE', color: '#fff1a6' };
  return { label: 'OPENING', color: '#70d6ff' };
}

export function getDirectorPressure(game) {
  const timePressure = game.time < 45
    ? 0.82
    : game.time < 90
      ? 0.94
      : game.time < 180
        ? 1 + (game.time - 90) / 820
        : Math.min(1.36, 1.14 + (game.time - 180) / 520);
  const buildDepth = Math.max(...Object.values({ ...createEmptyBuildFocus(), ...(game.buildFocus ?? {}) }));
  const buildPressure = buildDepth >= 5 ? 0.08 : buildDepth >= 3 ? 0.05 : buildDepth >= 2 ? 0.03 : 0;
  return Math.min(1.42, timePressure + buildPressure);
}

export function getEnemyMovePressure(game) {
  const rhythm = getCombatRhythm(game);
  if (game.time >= 245) return 1.18 * rhythm.move;
  if (game.time >= 195) return 1.12 * rhythm.move;
  if (game.time >= 150) return 1.06 * rhythm.move;
  if (game.time >= 120) return 1.02 * rhythm.move;
  return rhythm.move;
}

export function getEnemyDamagePressure(game) {
  const rhythm = getCombatRhythm(game);
  if (game.time >= 245) return 1.42 * rhythm.damage;
  if (game.time >= 195) return 1.3 * rhythm.damage;
  if (game.time >= 150) return 1.16 * rhythm.damage;
  if (game.time >= 120) return 1.06 * rhythm.damage;
  return rhythm.damage;
}

export function getEnemyAbilityScale(game) {
  const rhythm = getCombatRhythm(game);
  if (game.time >= 245) return 0.82 * rhythm.ability;
  if (game.time >= 195) return 0.9 * rhythm.ability;
  if (game.time >= 150) return 0.96 * rhythm.ability;
  if (game.time >= 120) return rhythm.ability;
  return rhythm.ability;
}

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

export function getFieldItemDropPosition(playerPos, baseDistance = 10, spread = 30) {
  for (let i = 0; i < 12; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = baseDistance + Math.random() * spread;
    const flat = new THREE.Vector2(
      playerPos.x + Math.cos(angle) * distance,
      playerPos.z + Math.sin(angle) * distance
    );
    if (flat.length() > ARENA_RADIUS - 7) flat.setLength(ARENA_RADIUS - 7);
    const pos = new THREE.Vector3(flat.x, getPlayerTerrainY(flat.x, flat.y) + 0.42, flat.y);
    if (!hitsStaticCollider(pos, 1.25)) return pos;
  }

  const fallback = new THREE.Vector2(playerPos.x + 7, playerPos.z - 5);
  if (fallback.length() > ARENA_RADIUS - 7) fallback.setLength(ARENA_RADIUS - 7);
  return new THREE.Vector3(fallback.x, getPlayerTerrainY(fallback.x, fallback.y) + 0.42, fallback.y);
}

export function pickFieldItemType(game) {
  const hpRatio = game.stats.hp / game.stats.maxHp;
  const roll = Math.random();
  if (hpRatio < 0.45 && roll < 0.34) return 'heal';
  if (game.time >= 145 && game.time < 190 && roll < 0.045) return 'cache';
  if (game.time >= 190 && roll < 0.115) return 'cache';
  if (roll < 0.5) return 'magnet';
  if (roll < (game.time < 75 ? 0.58 : 0.68)) return 'overload';
  if (roll < 0.86) return 'purge';
  return hpRatio < 0.82 ? 'heal' : 'magnet';
}

export function createFieldItem(type, pos) {
  const life = type === 'purge' || type === 'overload' ? 58 : type === 'cache' ? 52 : 48;
  return {
    type,
    pos,
    pulse: Math.random() * Math.PI * 2,
    life,
    maxLife: life
  };
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
  const pos = getSpawnPositionAroundPlayer(playerPos, (isRunner ? 37 : isBrute ? 42 : 35) + (affix === 'siege' ? 4 : 0), 24);
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

export function applyCombatRhythm(enemy, rhythm = COMBAT_RHYTHM[0]) {
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
    color: '#ffdf6e',
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
    color: '#70d6ff',
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
    color: '#d8b2ff',
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
  if (enemy.kind === 'boss') return enemy.bossGuard > 0 ? BOSS_PATTERN_META.guard.color : '#ffdf6e';
  if (enemy.affix) return getAffixEnemyColor(enemy.affix, enemy.kind);
  return getSpawnColor(enemy.kind);
}

export function getEnemyDisplayName(enemy) {
  if (enemy.kind === 'boss') return enemy.bossGuard > 0 ? 'RIFT WARDEN' : 'RIFT BEAST';
  if (enemy.kind === 'elite') return `RIFT ${ELITE_ROLE_META[enemy.role]?.label ?? 'ELITE'}`;
  return '';
}

export function getSpawnColor(kind) {
  if (kind === 'boss') return '#ffdf6e';
  if (kind === 'elite') return FIELD_ITEM_META.overload.color;
  if (kind === 'runner') return '#70d6ff';
  if (kind === 'brute') return '#ff8b72';
  return '#70f0b4';
}

function getAffixEnemyColor(affix, kind) {
  if (affix === 'pack') return kind === 'runner' ? '#9ff7ff' : '#70d6ff';
  if (affix === 'stone') return kind === 'brute' ? '#fff1a6' : '#c7d49a';
  if (affix === 'split') return kind === 'runner' ? '#d8b2ff' : '#f5c7ff';
  if (affix === 'siege') return kind === 'brute' ? '#ff8b72' : '#ffbf78';
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
