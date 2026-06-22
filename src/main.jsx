import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Text, useGLTF } from '@react-three/drei';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MODEL_URLS, NATURE_MODEL_URLS, PRELOAD_MODEL_URLS, PROJECTILE_MODEL_URLS } from './config/assets.js';
import './styles.css';

const ARENA_RADIUS = 118;
const RUN_DURATION = 300;
const PLAYER_SPEED = 8.7;
const DASH_SPEED = 22;
const DASH_TIME = 0.2;
const DASH_COOLDOWN = 1.15;
const PLAYER_RADIUS = 0.58;
const MAX_ENEMIES = 132;
const WAVE_DURATION = 22;
const MAX_FIELD_ITEMS = 16;
const MAX_XP_GEMS = 260;
const MAX_PROJECTILES = 150;
const MAX_HIT_BURSTS = 42;
const MAX_WEAPON_EFFECTS = 24;
const MAX_DAMAGE_NUMBERS = 30;
const MAX_SPAWN_WARNINGS = 10;
const MAX_ORBIT_BLADES = 12;
const PROJECTILE_GRID_CELL_SIZE = 9;
const PROJECTILE_GRID_KEY_STRIDE = 1024;
const STATIC_COLLIDER_GRID_CELL_SIZE = 18;
const STATIC_COLLIDER_GRID_KEY_STRIDE = 1024;
const STATE_SYNC_INTERVAL = 0.08;
const OVERLOAD_DURATION = 8;
const XP_BASE_MAGNET_RADIUS = 8.2;
const XP_PICKUP_RADIUS = 1.3;
const FIELD_ITEM_ATTRACT_RADIUS = 12;
const FIELD_ITEM_PICKUP_RADIUS = 3.05;
const SHRINE_ACTIVATE_RADIUS = 6.4;
const SHRINE_CHANNEL_TIME = 1.15;
const PLAYER_VISUAL_BASE_SCALE = 1.52;

const FIELD_ITEM_META = {
  magnet: { color: '#70d6ff', label: 'MAGNET', name: '자석 룬' },
  purge: { color: '#ffdf6e', label: 'PURGE', name: '정화 폭발' },
  heal: { color: '#79f29a', label: 'HEAL', name: '생명 결정' },
  overload: { color: '#f5c7ff', label: 'OVERLOAD', name: '과부하 룬' },
  cache: { color: '#fff1a6', label: 'ARMORY', name: '무기 보급' }
};

const ART_TOKENS = {
  void: '#020607',
  deepVoid: '#07110f',
  terrainLow: '#273126',
  terrainMid: '#4d6044',
  terrainHigh: '#817f58',
  moss: '#2a7350',
  oldStone: '#706a5d',
  wornGold: '#e2bb5d',
  emberGold: '#ffdf6e',
  runeCyan: '#70d6ff',
  runeMint: '#73fbd3',
  dangerRed: '#ff8b72',
  elderViolet: '#d8b2ff',
  riftViolet: '#7f6cff'
};

const WAVE_PROFILES = [
  { name: 'Rift Scouts', trait: '정찰', hint: '균형형 진입', accent: '#70f0b4', affix: 'scout', targetBase: 48, spawnBase: 7, runner: 0.16, brute: 0.02, interval: 0.58 },
  { name: 'Howling Pack', trait: '추격', hint: '러너 가속', accent: '#70d6ff', affix: 'pack', targetBase: 66, spawnBase: 9, runner: 0.31, brute: 0.05, interval: 0.48 },
  { name: 'Stone March', trait: '장갑', hint: '체력 높은 행군', accent: '#ffdf6e', affix: 'stone', targetBase: 80, spawnBase: 10, runner: 0.18, brute: 0.2, interval: 0.44 },
  { name: 'Split Swarm', trait: '분열', hint: '일부 적 사망 시 분열', accent: '#d8b2ff', affix: 'split', targetBase: 94, spawnBase: 12, runner: 0.38, brute: 0.14, interval: 0.4 },
  { name: 'Rift Siege', trait: '공성', hint: '피해와 압박 증가', accent: '#ff8b72', affix: 'siege', targetBase: 112, spawnBase: 14, runner: 0.3, brute: 0.28, interval: 0.36 }
];

const BOSS_WAVE_SCHEDULE = [6, 9, 12];

const COMBAT_RHYTHM = [
  { until: 35, label: '학습', target: 0.76, spawn: 0.78, hp: 0.86, move: 0.92, damage: 0.9, ability: 1.08 },
  { until: 85, label: '정착', target: 0.9, spawn: 0.92, hp: 0.94, move: 0.98, damage: 0.96, ability: 1.02 },
  { until: 145, label: '검증', target: 1.02, spawn: 1.04, hp: 1.02, move: 1.04, damage: 1.04, ability: 0.94 },
  { until: 210, label: '압박', target: 1.14, spawn: 1.16, hp: 1.08, move: 1.12, damage: 1.12, ability: 0.84 },
  { until: Infinity, label: '붕괴', target: 1.26, spawn: 1.28, hp: 1.14, move: 1.2, damage: 1.24, ability: 0.72 }
];

const EARLY_FIELD_ITEM_SCHEDULE = [
  { id: 'starter-magnet', time: 5, type: 'magnet', distance: 2.2, spread: 1.1 },
  { id: 'second-magnet', time: 54, type: 'magnet', distance: 5.8, spread: 2.4 },
  { id: 'starter-overload', time: 62, type: 'overload', distance: 5.8, spread: 2.4 },
  { id: 'starter-purge', time: 82, type: 'purge', distance: 7.2, spread: 2.8 },
  { id: 'starter-cache', time: 132, type: 'cache', distance: 7.6, spread: 3.0 },
  { id: 'third-magnet', time: 122, type: 'magnet', distance: 8.8, spread: 3.6 },
  { id: 'second-cache', time: 158, type: 'cache', distance: 8.8, spread: 3.6 },
  { id: 'second-purge', time: 184, type: 'purge', distance: 10.5, spread: 4.4 },
  { id: 'third-cache', time: 218, type: 'cache', distance: 10.4, spread: 4.4 },
  { id: 'second-overload', time: 236, type: 'overload', distance: 11.2, spread: 4.8 },
  { id: 'final-cache', time: 268, type: 'cache', distance: 12.0, spread: 5.2 }
];

const ELITE_ROLE_META = {
  bulwark: { label: 'BULWARK', name: '방벽 정예', color: '#ffdf6e', hint: '칼날/태양' },
  charger: { label: 'CHARGER', name: '돌진 정예', color: '#70d6ff', hint: '폭풍/번개' },
  summoner: { label: 'SUMMONER', name: '소환 정예', color: '#f5c7ff', hint: '분열/연쇄' }
};

const BOSS_PATTERN_META = {
  shockwave: { label: 'SHOCKWAVE', color: '#ff8b72', hint: '충격파 예고', cue: '붉은 원 밖으로', shape: 'shockwave' },
  summon: { label: 'SUMMON', color: '#f5c7ff', hint: '소환수 진입', cue: '보스 주변 정리', shape: 'summon' },
  guard: { label: 'WARD', color: '#fff1a6', hint: '보호막 충전', cue: '보호막 집중 공격', shape: 'guard' }
};

const BOSS_PATTERN_ORDER = ['shockwave', 'summon', 'guard'];

const SURGE_EVENTS = [
  { time: 150, label: 'RIFT SURGE', message: '균열 폭주: 적 무리 진입', color: '#ff8b72', count: 10 },
  { time: 195, label: 'ELITE SURGE', message: '정예 파동: 패턴 가속', color: '#f5c7ff', count: 13 },
  { time: 245, label: 'FINAL SURGE', message: '최종 폭주: 생존 압박 최대', color: '#fff1a6', count: 16 }
];

const OPENING_OBJECTIVES = [
  { id: 'first-blood', title: '균열 정찰', label: '적 12 처치', target: 12, color: '#70f0b4', getValue: game => game.kills },
  { id: 'magnet-flow', title: 'XP 흐름 열기', label: '자석 룬 회수', target: 1, color: '#70d6ff', getValue: game => getItemPickupCount(game, 'magnet') },
  { id: 'armory-seed', title: '빌드 방향 잡기', label: '무기 보급 회수', target: 1, color: '#fff1a6', getValue: game => getItemPickupCount(game, 'cache') },
  { id: 'first-etching', title: '첫 각인 완성', label: '레벨 3 도달', target: 3, color: '#d8b2ff', getValue: game => game.level },
  { id: 'first-surge', title: '첫 파동 버티기', label: '90초 생존', target: 90, color: '#ff8b72', getValue: game => game.time }
];

const ONBOARDING_STEPS = [
  { id: 'move', title: '이동', label: 'WASD / 방향키', target: 12, color: '#73fbd3', getValue: game => game.onboardingMovement ?? 0 },
  { id: 'dash', title: '회피', label: 'Space 대시', target: 1, color: '#70d6ff', getValue: game => game.dashUses ?? 0 },
  { id: 'xp', title: '성장', label: '푸른 XP 회수', target: 12, color: '#d8b2ff', getValue: game => Math.max(game.xp, game.level > 1 ? 12 : 0) },
  { id: 'cache', title: '빌드', label: '무기 보급 회수', target: 1, color: '#fff1a6', getValue: game => getItemPickupCount(game, 'cache') }
];

const SHRINE_SITES = [
  { id: 'armory', angle: 0.72, radius: 82, reward: 'cache', label: '무기 제단', color: '#fff1a6' },
  { id: 'vital', angle: 2.62, radius: 89.5, reward: 'heal', label: '생명 제단', color: '#79f29a' },
  { id: 'purge', angle: 4.08, radius: 82, reward: 'purge', label: '정화 제단', color: '#ffdf6e' },
  { id: 'etching', angle: 5.45, radius: 89.5, reward: 'upgrade', label: '각인 제단', color: '#d8b2ff' }
];

const MAP_CLIFFS = [
  { x: -38, z: -10, w: 31, d: 6.4, h: 1.22, color: '#596350' },
  { x: 36, z: 18, w: 29, d: 6.8, h: 1.3, color: '#62694f' },
  { x: -8, z: 58, w: 42, d: 6.1, h: 1.16, color: '#515d4d' },
  { x: 60, z: -36, w: 30, d: 7.2, h: 1.28, color: '#58634f' },
  { x: -72, z: 40, w: 29, d: 6.6, h: 1.18, color: '#4d5c4c' },
  { x: 18, z: -72, w: 43, d: 6.2, h: 1.2, color: '#5e664f' },
  { x: 78, z: 16, w: 25, d: 6.2, h: 1.12, color: '#59624f' },
  { x: -78, z: -42, w: 31, d: 6.9, h: 1.24, color: '#4d5a4c' }
];

const STATIC_COLLIDERS = makeOpenFieldColliders();
const STATIC_COLLIDER_GRID = makeStaticColliderGrid(STATIC_COLLIDERS);

const weaponCatalog = [
  {
    id: 'rune-orb',
    name: '룬 구체',
    color: '#70d6ff',
    cooldown: 0.5,
    damage: 23,
    speed: 17,
    pierce: 1,
    size: 0.34
  },
  {
    id: 'storm-brand',
    name: '폭풍 낙인',
    color: '#b8f7ff',
    cooldown: 1.68,
    damage: 34,
    speed: 0,
    pierce: 5,
    size: 0.44
  },
  {
    id: 'orbit-blade',
    name: '궤도 칼날',
    color: '#f7d06b',
    cooldown: 0,
    damage: 14,
    speed: 0,
    pierce: 99,
    size: 0.22
  },
  {
    id: 'chain-lightning',
    name: '연쇄 번개',
    color: '#d7b7ff',
    cooldown: 1.16,
    damage: 25,
    range: 34,
    chains: 3
  },
  {
    id: 'solar-nova',
    name: '태양 파동',
    color: '#ff8b72',
    cooldown: 3.35,
    damage: 31,
    radius: 8.4
  }
];

const DAMAGE_SOURCE_META = {
  orb: { label: '룬 구체', color: '#70d6ff' },
  storm: { label: '폭풍 낙인', color: '#b8f7ff' },
  blade: { label: '궤도 칼날', color: '#f7d06b' },
  lightning: { label: '연쇄 번개', color: '#d7b7ff' },
  nova: { label: '태양 파동', color: '#ff8b72' },
  generic: { label: '기타', color: '#fff1a6' }
};

const upgradePool = [
  { id: 'orb-count', family: '룬 구체', branch: '분열', title: '룬 구체 분열', text: '룬 구체 발사 수 +1', apply: stats => ({ ...stats, orbCount: Math.min(7, stats.orbCount + 1) }) },
  { id: 'orb-fan', family: '룬 구체', branch: '분열', title: '분열 룬진', text: '구체 +2, 구체 피해 -6%', apply: stats => ({ ...stats, orbCount: Math.min(8, stats.orbCount + 2), orbDamage: stats.orbDamage * 0.94 }) },
  { id: 'orb-lance', family: '룬 구체', branch: '관통', title: '관통 룬창', text: '구체 피해/크기/관통 증가', apply: stats => ({ ...stats, orbDamage: stats.orbDamage * 1.32, orbScale: stats.orbScale * 1.16, orbSpeed: stats.orbSpeed * 1.08, pierce: stats.pierce + 1 }) },
  { id: 'storm-burst', family: '폭풍 낙인', branch: '광역', title: '폭풍 낙인 증폭', text: '폭풍 범위 +18%', apply: stats => ({ ...stats, stormRadius: stats.stormRadius * 1.18, stormDamage: stats.stormDamage * 1.08 }) },
  { id: 'storm-volley', family: '폭풍 낙인', branch: '난사', title: '낙뢰 난사', text: '폭풍 낙뢰 +1, 쿨다운 소폭 감소', apply: stats => ({ ...stats, stormStrikes: Math.min(4, stats.stormStrikes + 1), stormCooldown: stats.stormCooldown * 0.94 }) },
  { id: 'storm-carpet', family: '폭풍 낙인', branch: '장판', title: '잔류 폭풍', text: '폭풍 지속/범위 증가', apply: stats => ({ ...stats, stormDuration: stats.stormDuration * 1.3, stormRadius: stats.stormRadius * 1.14, stormDamage: stats.stormDamage * 1.05 }) },
  { id: 'blade-plus', family: '궤도 칼날', branch: '수호', title: '칼날 궤도 확장', text: '궤도 칼날 +1', apply: stats => ({ ...stats, bladeBonus: Math.min(5, stats.bladeBonus + 1) }) },
  { id: 'blade-guard', family: '궤도 칼날', branch: '수호', title: '수호 칼날환', text: '칼날 +2, 근접 방어 강화', apply: stats => ({ ...stats, bladeBonus: Math.min(6, stats.bladeBonus + 2), bladeRadius: stats.bladeRadius * 0.92, bladeDamage: stats.bladeDamage * 1.08 }) },
  { id: 'blade-reaper', family: '궤도 칼날', branch: '참격', title: '사신 궤도', text: '칼날 피해/범위 증가', apply: stats => ({ ...stats, bladeDamage: stats.bladeDamage * 1.34, bladeRadius: stats.bladeRadius * 1.18 }) },
  { id: 'chain-plus', family: '연쇄 번개', branch: '연쇄', title: '연쇄 번개 도약', text: '번개 연쇄 +1', apply: stats => ({ ...stats, lightningChains: Math.min(9, stats.lightningChains + 1), lightningDamage: stats.lightningDamage * 1.08 }) },
  { id: 'chain-web', family: '연쇄 번개', branch: '망', title: '전류망 확산', text: '연쇄 +3, 사거리 증가', apply: stats => ({ ...stats, lightningChains: Math.min(11, stats.lightningChains + 3), lightningRange: stats.lightningRange * 1.18, lightningDamage: stats.lightningDamage * 0.96 }) },
  { id: 'chain-smite', family: '연쇄 번개', branch: '처형', title: '처형 번개', text: '부상 적에게 번개 피해 증가', apply: stats => ({ ...stats, lightningDamage: stats.lightningDamage * 1.24, lightningExecute: stats.lightningExecute + 1 }) },
  { id: 'nova-plus', family: '태양 파동', branch: '광역', title: '태양 파동 확장', text: '광역 파동 범위 +20%', apply: stats => ({ ...stats, novaRadius: stats.novaRadius * 1.2, novaDamage: stats.novaDamage * 1.08 }) },
  { id: 'nova-pulse', family: '태양 파동', branch: '연타', title: '쌍파동 공명', text: '파동 쿨다운 감소, 피해 증가', apply: stats => ({ ...stats, novaPulse: stats.novaPulse + 1, novaCooldown: stats.novaCooldown * 0.86, novaDamage: stats.novaDamage * 1.08 }) },
  { id: 'nova-comet', family: '태양 파동', branch: '폭딜', title: '핵심 태양', text: '파동 피해/범위 크게 증가', apply: stats => ({ ...stats, novaDamage: stats.novaDamage * 1.38, novaRadius: stats.novaRadius * 1.12, novaCooldown: stats.novaCooldown * 1.08 }) },
  { id: 'damage', family: '공용', branch: '화력', title: '각인 강화', text: '모든 피해 +16%', apply: stats => ({ ...stats, damage: stats.damage * 1.16 }) },
  { id: 'speed', family: '생존', branch: '기동', title: '가벼운 발걸음', text: '이동 속도 +12%', apply: stats => ({ ...stats, speed: stats.speed * 1.12 }) },
  { id: 'cooldown', family: '공용', branch: '속도', title: '빠른 영창', text: '공격 간격 -10%', apply: stats => ({ ...stats, cooldown: stats.cooldown * 0.9 }) },
  { id: 'magnet', family: '성장', branch: '흡수', title: '흡인 룬', text: 'XP 흡수 거리 +35%', apply: stats => ({ ...stats, magnet: stats.magnet * 1.35 }) },
  { id: 'dash', family: '생존', branch: '기동', title: '대시 충전', text: '대시 쿨다운 -18%', apply: stats => ({ ...stats, dashCooldown: stats.dashCooldown * 0.82 }) },
  { id: 'maxHp', family: '생존', branch: '방어', title: '수호 석판', text: '최대 체력 +20', apply: stats => ({ ...stats, maxHp: stats.maxHp + 20, hp: Math.min(stats.maxHp + 20, stats.hp + 20) }) },
  { id: 'pierce', family: '룬 구체', branch: '관통', title: '관통 문양', text: '구체 관통 +1', apply: stats => ({ ...stats, pierce: stats.pierce + 1, orbDamage: stats.orbDamage * 1.04 }) },
  { id: 'luck', family: '성장', branch: 'XP', title: '찬란한 룬', text: 'XP 획득량 +18%', apply: stats => ({ ...stats, xpGain: stats.xpGain * 1.18 }) }
];

const BUILD_FOCUS_META = {
  orb: {
    label: '룬 구체',
    title: '분열 사격',
    color: '#70d6ff',
    glyph: '◈',
    perks: ['표적 +1', '부채꼴 보조탄', '룬창 과충전']
  },
  storm: {
    label: '폭풍 낙인',
    title: '낙뢰 지대',
    color: '#b8f7ff',
    glyph: '↯',
    perks: ['낙뢰 +1', '잔류 시간 증가', '폭풍망 확장']
  },
  blade: {
    label: '궤도 칼날',
    title: '근접 수호',
    color: '#f7d06b',
    glyph: '◇',
    perks: ['칼날 +1', '접촉 피해 감소', '참격 압박']
  },
  chain: {
    label: '연쇄 번개',
    title: '전류 제어',
    color: '#d7b7ff',
    glyph: '⌁',
    perks: ['연쇄 +1', '감전 둔화', '부상 처형']
  },
  nova: {
    label: '태양 파동',
    title: '태양 중심',
    color: '#ff8b72',
    glyph: '☉',
    perks: ['파동 범위 증가', '밀어내기 강화', '쿨다운 압축']
  }
};

const BUILD_SYNERGIES = [
  {
    id: 'storm-chain',
    title: '폭풍 전류망',
    label: '폭풍 + 번개',
    keys: ['storm', 'chain'],
    color: '#9ff7ff',
    bonus: '낙뢰가 더 자주 감전시키고 번개 사거리가 증가'
  },
  {
    id: 'blade-nova',
    title: '태양 칼날환',
    label: '칼날 + 태양',
    keys: ['blade', 'nova'],
    color: '#fff1a6',
    bonus: '근접 방어와 파동 밀어내기가 함께 강화'
  },
  {
    id: 'orb-pierce',
    title: '관통 룬창',
    label: '구체 관통',
    keys: ['orb'],
    color: '#70d6ff',
    bonus: '구체 관통/속도/피해가 집중 성장'
  }
];

const UPGRADE_RANK_LIMITS = {
  'orb-lance': 4,
  'storm-burst': 4,
  'storm-carpet': 4,
  'blade-reaper': 4,
  'chain-smite': 4,
  'nova-plus': 4,
  'nova-pulse': 4,
  'nova-comet': 4,
  damage: 5,
  cooldown: 5,
  speed: 4,
  magnet: 4,
  dash: 4,
  maxHp: 4,
  pierce: 3,
  luck: 4
};

const WEAPON_UPGRADE_IDS = new Set([
  'orb-count',
  'orb-fan',
  'orb-lance',
  'storm-burst',
  'storm-volley',
  'storm-carpet',
  'blade-plus',
  'blade-guard',
  'blade-reaper',
  'chain-plus',
  'chain-web',
  'chain-smite',
  'nova-plus',
  'nova-pulse',
  'nova-comet',
  'pierce',
  'cooldown',
  'damage'
]);

const STARTING_WEAPON_FAMILIES = new Set(['orb']);
const NEW_WEAPON_UNLOCK_LEVEL = 7;
const NEW_WEAPON_UNLOCK_TIME = 128;
const NEW_WEAPON_UNLOCK_CACHE_COUNT = 2;
const NEW_WEAPON_UNLOCK_SHRINE_COUNT = 2;
const UPGRADE_CHOICE_COUNT = 4;
const VISUAL_BUDGETS = {
  high: {
    enemyAuras: 96,
    enemyAccents: 104,
    gemBeams: 104,
    projectileAura: 92,
    projectileDetail: 52,
    hitBursts: 42,
    weaponEffects: 24,
    damageNumbers: 30,
    spawnWarnings: 10
  },
  balanced: {
    enemyAuras: 68,
    enemyAccents: 76,
    gemBeams: 58,
    projectileAura: 58,
    projectileDetail: 24,
    hitBursts: 30,
    weaponEffects: 18,
    damageNumbers: 22,
    spawnWarnings: 8
  },
  low: {
    enemyAuras: 38,
    enemyAccents: 44,
    gemBeams: 0,
    projectileAura: 32,
    projectileDetail: 0,
    hitBursts: 18,
    weaponEffects: 10,
    damageNumbers: 14,
    spawnWarnings: 6
  }
};

const RUNTIME_BUDGETS = {
  high: {
    maxEnemies: MAX_ENEMIES,
    maxProjectiles: MAX_PROJECTILES,
    maxXpGems: MAX_XP_GEMS
  },
  balanced: {
    maxEnemies: 118,
    maxProjectiles: 128,
    maxXpGems: 220
  },
  low: {
    maxEnemies: 98,
    maxProjectiles: 108,
    maxXpGems: 190
  }
};

function getVisualBudget(visualQuality = 'high') {
  return VISUAL_BUDGETS[visualQuality] ?? VISUAL_BUDGETS.high;
}

function getRuntimeBudget(visualQuality = 'high') {
  return RUNTIME_BUDGETS[visualQuality] ?? RUNTIME_BUDGETS.high;
}

function getProjectileGridCoord(value) {
  return Math.floor(value / PROJECTILE_GRID_CELL_SIZE);
}

function getProjectileGridKey(cellX, cellZ) {
  return cellX * PROJECTILE_GRID_KEY_STRIDE + cellZ;
}

function getStaticColliderGridCoord(value) {
  return Math.floor(value / STATIC_COLLIDER_GRID_CELL_SIZE);
}

function getStaticColliderGridKey(cellX, cellZ) {
  return cellX * STATIC_COLLIDER_GRID_KEY_STRIDE + cellZ;
}

function getRuntimeVisualQuality(baseQuality = 'high', game = {}) {
  if (baseQuality === 'low') return 'low';
  const time = game.time ?? 0;
  const wave = game.wave ?? 1;
  const kills = game.kills ?? 0;
  const latePressure = time >= 235 || wave >= 12 || kills >= 520;
  const heavyPressure = time >= 170 || wave >= 9 || kills >= 320;
  if (latePressure) return 'low';
  if (heavyPressure && baseQuality === 'high') return 'balanced';
  return baseQuality;
}

function getVisualQuality() {
  if (typeof window === 'undefined') return 'high';
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const narrowViewport = window.innerWidth <= 700;
  const lowMemory = navigator.deviceMemory !== undefined && navigator.deviceMemory <= 4;
  const lowCore = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4;
  if (reducedMotion || (narrowViewport && (lowMemory || lowCore))) return 'low';
  if (narrowViewport || lowMemory || lowCore) return 'balanced';
  return 'high';
}

function useVisualQuality() {
  const [quality, setQuality] = useState(() => getVisualQuality());

  useEffect(() => {
    const update = () => setQuality(getVisualQuality());
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    window.addEventListener('resize', update);
    reducedMotion?.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('resize', update);
      reducedMotion?.removeEventListener?.('change', update);
    };
  }, []);

  return quality;
}

function createInitialGame() {
  return {
    phase: 'playing',
    level: 1,
    xp: 0,
    xpToNext: 30,
    time: 0,
    kills: 0,
    wave: 1,
    pendingUpgrades: 0,
    dash: {
      cooldown: 0,
      cooldownMax: DASH_COOLDOWN,
      active: 0,
      ready: true
    },
    result: null,
    pickupMessage: '',
    pickupFlash: 0,
    encounterAlert: null,
    encounterAlertTimer: 0,
    activeThreat: null,
    lastBossPattern: null,
    bossStatus: null,
    damageFlash: 0,
    damageMessage: '',
    onboardingMovement: 0,
    dashUses: 0,
    eliteKills: 0,
    bossKills: 0,
    runStats: createEmptyRunStats(),
    overloadTimer: 0,
    itemPickups: createEmptyItemPickups(),
    shrineActivations: 0,
    activatedShrines: {},
    playerPos: { x: 0, z: 0 },
    stats: {
      hp: 120,
      maxHp: 120,
      damage: 1,
      speed: 1,
      cooldown: 1,
      magnet: 1,
      dashCooldown: 1,
      pierce: 0,
      xpGain: 1,
      orbCount: 1,
      orbDamage: 1,
      orbScale: 1,
      orbSpeed: 1,
      stormRadius: 1,
      stormDamage: 1,
      stormStrikes: 1,
      stormCooldown: 1,
      stormDuration: 1,
      bladeBonus: 0,
      bladeDamage: 1,
      bladeRadius: 1,
      lightningChains: 3,
      lightningDamage: 1,
      lightningRange: 1,
      lightningExecute: 0,
      novaRadius: 1,
      novaDamage: 1,
      novaCooldown: 1,
      novaPulse: 0
    },
    buildFocus: createEmptyBuildFocus(),
    upgrades: []
  };
}

function createQaBossGame(options = {}) {
  const enraged = options.enraged ?? true;
  return {
    ...createInitialGame(),
    phase: 'qa-preview',
    level: 8,
    xp: 18,
    xpToNext: 68,
    time: 132,
    kills: 246,
    wave: 6,
    pickupMessage: enraged ? '보스 분노: 패턴 가속' : '보스 접근: 패턴을 읽으세요',
    pickupFlash: 2.5,
    encounterAlert: {
      kind: 'boss-pattern',
      label: 'RIFT BEAST',
      title: enraged ? '분노 페이즈 진입' : '보스 패턴 예고',
      hint: '중거리 이탈 후 약점 집중',
      color: enraged ? '#ff8b72' : '#fff1a6'
    },
    encounterAlertTimer: 2.8,
    activeThreat: { label: 'RIFT BEAST', weakness: '룬/번개 집중', color: '#ffdf6e' },
    lastBossPattern: enraged ? 'shockwave' : 'guard',
    bossStatus: {
      hp: enraged ? 720 : 1260,
      maxHp: 1800,
      hpPct: enraged ? 0.4 : 0.7,
      wave: 6,
      enraged,
      phaseLabel: enraged ? 'RAGE' : 'PRESSURE',
      phaseColor: enraged ? '#ff8b72' : '#ffdf6e',
      patternLabel: enraged ? BOSS_PATTERN_META.shockwave.label : BOSS_PATTERN_META.guard.label,
      patternHint: enraged ? BOSS_PATTERN_META.shockwave.hint : BOSS_PATTERN_META.guard.hint,
      patternColor: enraged ? BOSS_PATTERN_META.shockwave.color : BOSS_PATTERN_META.guard.color,
      patternStage: enraged ? 4 : 2,
      casting: true
    },
    onboardingMovement: 64,
    dashUses: 2,
    eliteKills: 4,
    bossKills: 0,
    itemPickups: { ...createEmptyItemPickups(), magnet: 2, cache: 2, overload: 1 },
    shrineActivations: 1,
    activatedShrines: { armory: true },
    buildFocus: { ...createEmptyBuildFocus(), orb: 2, storm: 2, chain: 2, nova: 1 },
    upgrades: ['orb-lance', 'pierce', 'storm-volley', 'chain-plus', 'chain-web', 'nova-plus'],
    runStats: {
      totalDamage: 16540,
      damageBySource: {
        ...createEmptyRunStats().damageBySource,
        orb: 3820,
        storm: 4560,
        lightning: 6120,
        nova: 1440,
        blade: 600
      }
    }
  };
}

function createQaResultGame(result = 'victory') {
  const didWin = result === 'victory';
  return {
    ...createInitialGame(),
    phase: 'ended',
    result,
    level: didWin ? 13 : 9,
    xp: didWin ? 48 : 22,
    xpToNext: 84,
    time: didWin ? RUN_DURATION : 214,
    kills: didWin ? 682 : 391,
    wave: didWin ? 14 : 10,
    onboardingMovement: 120,
    dashUses: 8,
    eliteKills: didWin ? 9 : 5,
    bossKills: didWin ? 3 : 1,
    itemPickups: { ...createEmptyItemPickups(), magnet: 4, cache: 4, heal: 2, purge: 2, overload: 2 },
    shrineActivations: didWin ? 4 : 2,
    activatedShrines: didWin
      ? { armory: true, vital: true, purge: true, etching: true }
      : { armory: true, vital: true },
    buildFocus: { ...createEmptyBuildFocus(), storm: 4, chain: 4, orb: 3, nova: 2, blade: 1 },
    upgrades: [
      'storm-volley',
      'storm-carpet',
      'storm-burst',
      'chain-plus',
      'chain-web',
      'chain-smite',
      'orb-lance',
      'pierce',
      'nova-plus',
      'damage',
      'cooldown'
    ],
    stats: {
      ...createInitialGame().stats,
      hp: didWin ? 86 : 0,
      maxHp: 160,
      damage: 1.42,
      cooldown: 0.78,
      magnet: 1.5,
      lightningChains: 8,
      stormStrikes: 3,
      pierce: 3
    },
    runStats: {
      totalDamage: didWin ? 84200 : 48750,
      damageBySource: {
        ...createEmptyRunStats().damageBySource,
        storm: didWin ? 23800 : 14200,
        lightning: didWin ? 28600 : 16100,
        orb: didWin ? 17600 : 9300,
        nova: didWin ? 8900 : 5400,
        blade: didWin ? 5300 : 3750
      }
    }
  };
}

function createQaStressGame() {
  return {
    ...createQaBossGame({ enraged: true }),
    phase: 'qa-preview',
    level: 12,
    xp: 44,
    xpToNext: 92,
    time: 246,
    kills: 540,
    wave: 12,
    pickupMessage: '성능 점검: 후반 전투 부하',
    pickupFlash: 2.8,
    encounterAlert: {
      kind: 'surge',
      label: 'PERF STRESS',
      title: '후반 전투 부하 재현',
      hint: '적/투사체/이펙트 cap 확인',
      color: '#70d6ff'
    },
    encounterAlertTimer: 2.8,
    buildFocus: { ...createEmptyBuildFocus(), orb: 4, storm: 4, chain: 4, nova: 3, blade: 3 },
    upgrades: [
      'orb-count',
      'orb-lance',
      'pierce',
      'storm-volley',
      'storm-carpet',
      'storm-burst',
      'chain-plus',
      'chain-web',
      'chain-smite',
      'blade-guard',
      'blade-reaper',
      'nova-plus',
      'nova-pulse',
      'damage',
      'cooldown'
    ],
    stats: {
      ...createInitialGame().stats,
      hp: 146,
      maxHp: 180,
      damage: 1.58,
      cooldown: 0.68,
      magnet: 1.6,
      dashCooldown: 0.82,
      pierce: 4,
      orbCount: 6,
      orbDamage: 1.6,
      orbScale: 1.28,
      orbSpeed: 1.18,
      stormRadius: 1.48,
      stormDamage: 1.42,
      stormStrikes: 4,
      stormCooldown: 0.78,
      stormDuration: 1.35,
      bladeBonus: 4,
      bladeDamage: 1.56,
      bladeRadius: 1.18,
      lightningChains: 9,
      lightningDamage: 1.52,
      lightningRange: 1.26,
      lightningExecute: 1,
      novaRadius: 1.44,
      novaDamage: 1.48,
      novaCooldown: 0.78,
      novaPulse: 1
    }
  };
}

function App() {
  const [game, setGame] = useState(() => createInitialGame());
  const [upgradeChoices, setUpgradeChoices] = useState([]);
  const sceneApi = useRef(null);
  const visualQuality = useVisualQuality();
  const runtimeVisualQuality = getRuntimeVisualQuality(visualQuality, game);
  const canvasDpr = useMemo(() => (
    runtimeVisualQuality === 'low' ? [1, 1] : runtimeVisualQuality === 'balanced' ? [1, 1.25] : [1, 1.45]
  ), [runtimeVisualQuality]);

  const togglePause = () => {
    setGame(current => {
      if (current.phase === 'playing') return { ...current, phase: 'paused' };
      if (current.phase === 'paused') return { ...current, phase: 'playing' };
      return current;
    });
  };

  const resume = () => {
    setGame(current => current.phase === 'paused' ? { ...current, phase: 'playing' } : current);
  };

  const chooseUpgrade = upgrade => {
    setGame(current => {
      const nextStats = upgrade.apply(current.stats);
      const focusKey = getUpgradeFocusKey(upgrade);
      const nextBuildFocus = applyBuildFocus(current.buildFocus, focusKey);
      const focusMessage = getFocusMessage(focusKey, nextBuildFocus);
      const nextPending = Math.max(0, (current.pendingUpgrades ?? 1) - 1);
      const nextGame = {
        ...current,
        phase: nextPending > 0 ? 'upgrade' : 'playing',
        pendingUpgrades: nextPending,
        stats: nextStats,
        buildFocus: nextBuildFocus,
        upgrades: [...current.upgrades, upgrade.id],
        pickupMessage: focusMessage || `${upgrade.title} 강화`,
        pickupFlash: 2.2
      };
      window.setTimeout(() => {
        setUpgradeChoices(nextPending > 0 ? pickUpgrades(nextGame) : []);
      }, 0);
      return nextGame;
    });
  };

  const restart = () => {
    sceneApi.current?.reset();
    setUpgradeChoices([]);
    setGame(createInitialGame());
  };

  const onLevelUp = () => {
    setGame(current => {
      if ((current.pendingUpgrades ?? 0) <= 0) return current;
      setUpgradeChoices(pickUpgrades(current));
      return { ...current, phase: 'upgrade' };
    });
  };

  useEffect(() => {
    const onKeyDown = event => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code !== 'Escape' && event.code !== 'KeyP') return;
      event.preventDefault();
      togglePause();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const showQaGame = nextGame => {
      sceneApi.current?.reset();
      setUpgradeChoices([]);
      setGame(nextGame);
      window.setTimeout(() => setGame(nextGame), 80);
    };
    window.__RUNE_DRIFT_QA__ = {
      boss: options => {
        showQaGame(createQaBossGame(options));
      },
      result: result => {
        showQaGame(createQaResultGame(result));
      },
      stress: options => {
        const nextGame = createQaStressGame();
        showQaGame(nextGame);
        window.setTimeout(() => sceneApi.current?.stress?.(options), 120);
        window.setTimeout(() => sceneApi.current?.stress?.(options), 220);
      },
      upgrade: () => {
        const nextGame = {
          ...createQaStressGame(),
          phase: 'upgrade',
          pendingUpgrades: 1
        };
        sceneApi.current?.reset();
        setUpgradeChoices(pickUpgrades(nextGame));
        setGame(nextGame);
      },
      starterUpgrade: () => {
        const nextGame = {
          ...createInitialGame(),
          phase: 'upgrade',
          level: 2,
          xp: 0,
          xpToNext: 45,
          pendingUpgrades: 1,
          time: 28,
          kills: 18,
          onboardingMovement: 42,
          dashUses: 1
        };
        sceneApi.current?.reset();
        setUpgradeChoices(pickUpgrades(nextGame));
        setGame(nextGame);
      },
      reset: () => {
        sceneApi.current?.reset();
        setUpgradeChoices([]);
        setGame(createInitialGame());
      }
    };
    const qaMode = new URLSearchParams(window.location.search).get('qa');
    if (qaMode === 'upgrade') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.upgrade(), 120);
    } else if (qaMode === 'starter-upgrade') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.starterUpgrade(), 120);
    } else if (qaMode === 'stress') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.stress({
        enemies: MAX_ENEMIES - 6,
        projectiles: MAX_PROJECTILES - 12,
        gems: MAX_XP_GEMS - 24
      }), 120);
    }
    return () => {
      delete window.__RUNE_DRIFT_QA__;
    };
  }, []);

  return (
    <main className={`shell visual-${runtimeVisualQuality} ${game.damageFlash > 0 ? 'isHurt' : ''} ${game.stats.hp / game.stats.maxHp <= 0.34 ? 'isLowHp' : ''}`}>
      <Canvas
        shadows={runtimeVisualQuality !== 'low'}
        camera={{ position: [0, 44, 74], fov: 48, near: 0.1, far: 420 }}
        dpr={canvasDpr}
      >
        <color attach="background" args={[ART_TOKENS.void]} />
        <fog attach="fog" args={['#07110f', 68, 255]} />
        <Suspense fallback={null}>
          <GameScene
            refApi={sceneApi}
            game={game}
            setGame={setGame}
            onLevelUp={onLevelUp}
            visualQuality={runtimeVisualQuality}
          />
          {runtimeVisualQuality !== 'low' && <ContactShadows position={[0, 0.02, 0]} opacity={0.18} scale={300} blur={2.7} far={14} color="#020605" />}
          <Environment preset="night" />
        </Suspense>
        {runtimeVisualQuality !== 'low' && (
          <EffectComposer>
            <Bloom luminanceThreshold={0.28} intensity={runtimeVisualQuality === 'high' ? 1.18 : 0.82} mipmapBlur />
            {runtimeVisualQuality === 'high' && <Noise opacity={0.035} />}
            <Vignette eskil={false} offset={0.16} darkness={0.82} />
          </EffectComposer>
        )}
      </Canvas>
      <HUD game={game} onRestart={restart} onPause={togglePause} />
      {game.phase === 'paused' && <PauseOverlay game={game} onResume={resume} onRestart={restart} />}
      {game.phase === 'upgrade' && (
        <UpgradeOverlay game={game} choices={upgradeChoices} onChoose={chooseUpgrade} />
      )}
      {game.phase === 'ended' && <EndOverlay game={game} onRestart={restart} />}
    </main>
  );
}

function GameScene({ refApi, game, setGame, onLevelUp, visualQuality = 'high' }) {
  const player = useRef({
    pos: new THREE.Vector3(0, 0.55, 0),
    vel: new THREE.Vector3(),
    dashTimer: 0,
    dashCd: 0,
    invuln: 0,
    facing: new THREE.Vector3(1, 0, 0)
  });
  const keys = useRef(new Set());
  const dashQueued = useRef(false);
  const enemies = useRef([]);
  const projectiles = useRef([]);
  const projectileGrid = useRef({ cells: new Map(), maxRadius: 0, candidates: [] });
  const xpGems = useRef([]);
  const fieldItems = useRef([]);
  const shrines = useRef(createInitialShrines());
  const hitBursts = useRef([]);
  const damageNumbers = useRef([]);
  const spawnWarnings = useRef([]);
  const spawnTimer = useRef(0);
  const fieldItemTimer = useRef(4);
  const fieldItemDropLock = useRef(0);
  const scheduledFieldItems = useRef(new Set());
  const runStats = useRef(createEmptyRunStats());
  const bossSpawnedWave = useRef(0);
  const eliteSpawnedMinute = useRef(0);
  const surgeIndex = useRef(0);
  const orbTimer = useRef(0);
  const stormTimer = useRef(0);
  const lightningTimer = useRef(0.28);
  const novaTimer = useRef(1.25);
  const levelUpQueued = useRef(false);
  const gemMesh = useRef();
  const playerMesh = useRef();
  const weaponEffects = useRef([]);
  const stateSyncElapsed = useRef(0);
  const cameraTarget = useRef(new THREE.Vector3());
  const cameraShake = useRef(0);
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    color: new THREE.Color(),
    scale: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    vec: new THREE.Vector3()
  }), []);
  const runtimeBudget = getRuntimeBudget(visualQuality);

  useEffect(() => {
    const down = event => {
      if (game.phase !== 'playing') return;
      keys.current.add(event.code);
      if (event.code === 'Space') {
        if (!event.repeat) dashQueued.current = true;
        event.preventDefault();
      }
    };
    const up = event => keys.current.delete(event.code);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [game.phase]);

  useEffect(() => {
    refApi.current = {
      reset: () => {
        player.current.pos.set(0, 0.55, 0);
        player.current.vel.set(0, 0, 0);
        player.current.dashTimer = 0;
        player.current.dashCd = 0;
        player.current.invuln = 0;
        dashQueued.current = false;
        enemies.current = [];
        projectiles.current = [];
        projectileGrid.current.cells.clear();
        projectileGrid.current.maxRadius = 0;
        projectileGrid.current.candidates.length = 0;
        xpGems.current = [];
        fieldItems.current = [];
        shrines.current = createInitialShrines();
        hitBursts.current = [];
        damageNumbers.current = [];
        spawnWarnings.current = [];
        spawnTimer.current = 0;
        fieldItemTimer.current = 4;
        fieldItemDropLock.current = 0;
        scheduledFieldItems.current = new Set();
        runStats.current = createEmptyRunStats();
        bossSpawnedWave.current = 0;
        eliteSpawnedMinute.current = 0;
        surgeIndex.current = 0;
        orbTimer.current = 0;
        stormTimer.current = 0;
        lightningTimer.current = 0.28;
        novaTimer.current = 1.25;
        levelUpQueued.current = false;
        weaponEffects.current = [];
      },
      stress: (options = {}) => {
        const stressBudget = getRuntimeBudget(visualQuality);
        const wave = options.wave ?? 12;
        const enemyCount = Math.min(stressBudget.maxEnemies - 1, options.enemies ?? 160);
        const projectileCount = Math.min(stressBudget.maxProjectiles, options.projectiles ?? 210);
        const gemCount = Math.min(stressBudget.maxXpGems, options.gems ?? 420);
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
        hitBursts.current = Array.from({ length: MAX_HIT_BURSTS }, (_, index) => {
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
        weaponEffects.current = Array.from({ length: MAX_WEAPON_EFFECTS }, (_, index) => {
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
    };
  }, [refApi, visualQuality]);

  useEffect(() => {
    if (game.phase === 'playing') {
      levelUpQueued.current = false;
      if ((game.pendingUpgrades ?? 0) > 0) {
        levelUpQueued.current = true;
        window.setTimeout(onLevelUp, 0);
      }
    }
  }, [game.phase, game.pendingUpgrades, onLevelUp]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.033);
    if (game.phase !== 'playing') {
      stateSyncElapsed.current = 0;
      renderInstances();
      return;
    }

    stateSyncElapsed.current += dt;
    if (stateSyncElapsed.current >= STATE_SYNC_INTERVAL || game.time + stateSyncElapsed.current >= RUN_DURATION) {
      const elapsed = stateSyncElapsed.current;
      stateSyncElapsed.current = 0;
      setGame(current => {
        const nextTime = current.time + elapsed;
        const nextWave = Math.max(1, Math.floor(nextTime / WAVE_DURATION) + 1);
        const pickupFlash = Math.max(0, (current.pickupFlash ?? 0) - elapsed);
        const encounterAlertTimer = Math.max(0, (current.encounterAlertTimer ?? 0) - elapsed);
        const damageFlash = Math.max(0, (current.damageFlash ?? 0) - elapsed);
        const dashCooldownMax = DASH_COOLDOWN * current.stats.dashCooldown;
        const movementDelta = player.current.vel.length() > 0.1 ? player.current.vel.length() * elapsed : 0;
        const basePatch = {
          time: Math.min(nextTime, RUN_DURATION),
          wave: nextWave,
          pickupFlash,
          pickupMessage: pickupFlash > 0 ? current.pickupMessage : '',
          encounterAlertTimer,
          encounterAlert: encounterAlertTimer > 0 ? current.encounterAlert : null,
          damageFlash,
          damageMessage: damageFlash > 0 ? current.damageMessage : '',
          bossStatus: getBossStatusSnapshot(),
          runStats: getRunStatsSnapshot(),
          overloadTimer: Math.max(0, (current.overloadTimer ?? 0) - elapsed),
          onboardingMovement: Math.min(120, (current.onboardingMovement ?? 0) + movementDelta),
          playerPos: { x: player.current.pos.x, z: player.current.pos.z },
          dash: {
            cooldown: Math.min(dashCooldownMax, player.current.dashCd),
            cooldownMax: dashCooldownMax,
            active: player.current.dashTimer,
            ready: player.current.dashCd <= 0
          }
        };
        if (nextTime >= RUN_DURATION) {
          return { ...current, ...basePatch, phase: 'ended', result: 'victory' };
        }
        return { ...current, ...basePatch };
      });
    }

    updatePlayer(dt, game.stats, setGame);
    updateSpawning(dt, game, setGame);
    trimRuntimePools();
    updateWeapons(dt, game);
    updateProjectiles(dt, game.stats, game);
    rebuildProjectileGrid();
    updateEnemies(dt, game, setGame);
    trimRuntimePools();
    updateGems(dt, game, setGame, onLevelUp);
    updateFieldItems(dt, game, setGame);
    updateShrines(dt, game, setGame);
    updateBursts(dt);
    updateWeaponEffects(dt);
    updateDamageNumbers(dt);
    updateSpawnWarnings(dt);
    updateCamera(state.camera, dt);
    renderInstances();
  });

  const showEncounterAlert = (updateGame, alert, duration = 3.0) => {
    updateGame(current => ({
      ...current,
      encounterAlert: alert,
      encounterAlertTimer: Math.max(current.encounterAlertTimer ?? 0, duration),
      activeThreat: alert.threat ?? current.activeThreat,
      lastBossPattern: alert.pattern ?? current.lastBossPattern,
      pickupMessage: alert.message ?? current.pickupMessage,
      pickupFlash: Math.max(current.pickupFlash ?? 0, alert.flash ?? 0)
    }));
  };

  const getBossStatusSnapshot = () => {
    const boss = enemies.current.find(enemy => enemy.kind === 'boss' && enemy.hp > 0);
    if (!boss) return null;
    const hpPct = THREE.MathUtils.clamp(boss.hp / boss.maxHp, 0, 1);
    const phase = getBossPhaseMeta(hpPct, boss.enraged);
    const patternKey = (boss.currentPatternTimer ?? 0) > 0
      ? boss.currentPattern
      : BOSS_PATTERN_ORDER[boss.patternIndex % BOSS_PATTERN_ORDER.length];
    const patternMeta = BOSS_PATTERN_META[patternKey] ?? BOSS_PATTERN_META.shockwave;
    return {
      hp: Math.max(0, boss.hp),
      maxHp: boss.maxHp,
      hpPct,
      wave: boss.wave,
      enraged: Boolean(boss.enraged),
      phaseLabel: phase.label,
      phaseColor: phase.color,
      patternLabel: patternMeta.label,
      patternHint: patternMeta.hint,
      patternCue: patternMeta.cue,
      patternColor: patternMeta.color,
      patternStage: Math.max(1, boss.patternIndex),
      casting: (boss.currentPatternTimer ?? 0) > 0
    };
  };

  const recordDamage = (source, amount) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const key = DAMAGE_SOURCE_META[source] ? source : 'generic';
    runStats.current.damageBySource[key] = (runStats.current.damageBySource[key] ?? 0) + amount;
    runStats.current.totalDamage += amount;
  };

  const addProjectile = projectile => {
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
  };

  const trimRuntimePools = () => {
    if (projectiles.current.length > runtimeBudget.maxProjectiles) {
      projectiles.current.length = runtimeBudget.maxProjectiles;
    }

    while (xpGems.current.length > runtimeBudget.maxXpGems) {
      const gem = xpGems.current.pop();
      const target = xpGems.current[Math.floor(Math.random() * xpGems.current.length)];
      if (!gem || !target) continue;
      target.value += gem.value;
      target.pos.lerp(gem.pos, 0.18);
    }

    if (enemies.current.length <= runtimeBudget.maxEnemies) return;
    const protectedEnemies = [];
    const regularEnemies = [];
    const playerPos = player.current.pos;
    for (const enemy of enemies.current) {
      if (enemy.kind === 'boss' || enemy.kind === 'elite') {
        protectedEnemies.push(enemy);
      } else {
        regularEnemies.push(enemy);
      }
    }
    regularEnemies.sort((a, b) => (
      a.pos.distanceToSquared(playerPos) - b.pos.distanceToSquared(playerPos)
    ));
    enemies.current = [
      ...protectedEnemies,
      ...regularEnemies.slice(0, Math.max(0, runtimeBudget.maxEnemies - protectedEnemies.length))
    ];
  };

  const getRunStatsSnapshot = () => ({
    totalDamage: runStats.current.totalDamage,
    damageBySource: { ...runStats.current.damageBySource }
  });

  const updatePlayer = (dt, stats, updateGame) => {
    const input = new THREE.Vector3(
      Number(keys.current.has('KeyD') || keys.current.has('ArrowRight')) - Number(keys.current.has('KeyA') || keys.current.has('ArrowLeft')),
      0,
      Number(keys.current.has('KeyS') || keys.current.has('ArrowDown')) - Number(keys.current.has('KeyW') || keys.current.has('ArrowUp'))
    );
    const hasInput = input.lengthSq() > 0;
    if (hasInput) input.normalize();

    player.current.dashCd = Math.max(0, player.current.dashCd - dt);
    player.current.invuln = Math.max(0, player.current.invuln - dt);

    if (dashQueued.current && player.current.dashCd <= 0) {
      const dashDir = hasInput ? input.clone() : player.current.facing.clone();
      if (dashDir.lengthSq() > 0.001) {
        player.current.facing.copy(dashDir.normalize());
      }
      player.current.dashTimer = DASH_TIME;
      player.current.dashCd = DASH_COOLDOWN * stats.dashCooldown;
      player.current.invuln = Math.max(player.current.invuln, 0.46);
      player.current.vel.copy(player.current.facing).multiplyScalar(DASH_SPEED * 1.08);
      hitBursts.current.push({
        pos: player.current.pos.clone(),
        life: 0.34,
        maxLife: 0.34,
        color: '#70d6ff',
        type: 'dash',
        stage: 4,
        radius: 3.2
      });
      weaponEffects.current.push({
        type: 'ring',
        pos: player.current.pos.clone(),
        life: 0.34,
        maxLife: 0.34,
        color: '#70d6ff',
        radius: 7.2
      });
      addDamageNumber(player.current.pos, '회피', '#9ff7ff', 0.74);
      cameraShake.current = Math.max(cameraShake.current, 0.18);
      updateGame(current => ({ ...current, dashUses: (current.dashUses ?? 0) + 1 }));
    }
    dashQueued.current = false;

    if (hasInput && player.current.dashTimer <= 0) player.current.facing.copy(input);
    const isDashing = player.current.dashTimer > 0;
    const moveDirection = isDashing ? player.current.facing.clone() : input;
    const speed = isDashing ? DASH_SPEED : PLAYER_SPEED * stats.speed;
    player.current.dashTimer = Math.max(0, player.current.dashTimer - dt);
    player.current.vel.lerp(moveDirection.multiplyScalar(speed), isDashing ? 0.78 : 0.32);
    player.current.pos.addScaledVector(player.current.vel, dt);
    resolveStaticCollisions(player.current.pos, PLAYER_RADIUS);

    const flat = new THREE.Vector2(player.current.pos.x, player.current.pos.z);
    if (flat.length() > ARENA_RADIUS - 0.8) {
      flat.setLength(ARENA_RADIUS - 0.8);
      player.current.pos.x = flat.x;
      player.current.pos.z = flat.y;
    }
    const groundY = getPlayerTerrainY(player.current.pos.x, player.current.pos.z);
    player.current.pos.y += (groundY - player.current.pos.y) * Math.min(1, dt * 10);

    if (playerMesh.current) {
      playerMesh.current.position.copy(player.current.pos);
      const yaw = Math.atan2(player.current.facing.x, player.current.facing.z);
      const moveSpeed = player.current.vel.length();
      const moveAmount = THREE.MathUtils.clamp(moveSpeed / (PLAYER_SPEED * 1.2), 0, 1);
      const stride = performance.now() * 0.012;
      const step = Math.sin(stride);
      const stepLift = Math.max(0, step) * moveAmount;
      const dashPower = player.current.dashTimer > 0 ? 1 : 0;
      const bob = (Math.abs(step) * 0.09 + stepLift * 0.04) * moveAmount + dashPower * 0.04;
      const sideSway = Math.sin(stride * 0.5) * 0.072 * moveAmount;
      const tilt = Math.min(0.32, moveSpeed * 0.022);
      const dashScale = 1 + dashPower * 0.16;
      playerMesh.current.position.y += bob;
      playerMesh.current.rotation.set(
        -player.current.facing.z * tilt + step * 0.065 * moveAmount - dashPower * 0.12,
        yaw + sideSway,
        player.current.facing.x * tilt + Math.sin(stride * 0.5) * 0.055 * moveAmount
      );
      playerMesh.current.scale.set(
        dashScale * (1 + stepLift * 0.045),
        dashScale * (1 - stepLift * 0.07 + dashPower * 0.02),
        dashScale * (1 + moveAmount * 0.035 + dashPower * 0.11)
      );
    }
  };

  const updateSpawning = (dt, currentGame, updateGame) => {
    spawnTimer.current -= dt;
    const waveProfile = getWaveProfile(currentGame.wave);
    const pressure = getDirectorPressure(currentGame);
    const rhythm = getCombatRhythm(currentGame);
    const openingEase = currentGame.time < 30 ? 0.68 + currentGame.time / 30 * 0.26 : 1;
    const enemyLimit = runtimeBudget.maxEnemies;
    const targetCount = Math.min(Math.floor((waveProfile.targetBase + currentGame.wave * 7) * pressure * openingEase * rhythm.target), enemyLimit - 12);
    const minuteMark = Math.floor(currentGame.time / 60);
    const nextSurge = SURGE_EVENTS[surgeIndex.current];
    if (nextSurge && currentGame.time >= nextSurge.time && enemies.current.length < enemyLimit - 8) {
      const count = Math.min(nextSurge.count + Math.floor(currentGame.wave / 2), enemyLimit - enemies.current.length);
      for (let i = 0; i < count; i += 1) {
        const enemy = applyCombatRhythm(createEnemy(currentGame.wave + 1, waveProfile, player.current.pos), rhythm);
        enemy.surge = true;
        enemy.hp *= 1.16;
        enemy.maxHp *= 1.16;
        enemy.damage *= 1.28;
        enemy.speed *= 1.12;
        enemies.current.push(enemy);
        if (i < 5) {
          spawnWarnings.current.push({
            pos: enemy.pos.clone(),
            life: 1.08,
            maxLife: 1.08,
            color: nextSurge.color,
            label: i === 0 ? nextSurge.label : ''
          });
        }
      }
      hitBursts.current.push({
        pos: player.current.pos.clone(),
        life: 0.96,
        maxLife: 0.96,
        color: nextSurge.color,
        type: 'surge',
        stage: 5,
        radius: 12
      });
      cameraShake.current = Math.max(cameraShake.current, 0.36);
      showEncounterAlert(updateGame, {
        kind: 'surge',
        label: nextSurge.label,
        title: nextSurge.message,
        hint: '빈 공간 확보',
        color: nextSurge.color,
        message: nextSurge.message,
        flash: 3.4
      }, 3.4);
      surgeIndex.current += 1;
    }
    if (minuteMark >= 1 && minuteMark <= 4 && eliteSpawnedMinute.current < minuteMark) {
      const elite = createElite(minuteMark, currentGame.wave, player.current.pos);
      const meta = ELITE_ROLE_META[elite.role] ?? ELITE_ROLE_META.charger;
      enemies.current.push(elite);
      spawnWarnings.current.push({
        pos: elite.pos.clone(),
        life: 1.65,
        maxLife: 1.65,
        color: meta.color,
        label: `RIFT ${meta.label}`,
        radius: 3.0
      });
      hitBursts.current.push({
        pos: elite.pos.clone(),
        life: 0.95,
        maxLife: 0.95,
        color: getEnemyAccentColor(elite),
        type: 'elite',
        stage: 3,
        radius: 3.2
      });
      showEncounterAlert(updateGame, {
        kind: 'elite',
        label: `RIFT ${meta.label}`,
        title: meta.name,
        hint: `약점: ${meta.hint}`,
        color: meta.color,
        threat: {
          kind: 'elite',
          label: meta.label,
          name: meta.name,
          weakness: meta.hint,
          color: meta.color
        }
      }, 3.6);
      eliteSpawnedMinute.current = minuteMark;
    }
    if (BOSS_WAVE_SCHEDULE.includes(currentGame.wave) && bossSpawnedWave.current < currentGame.wave) {
      const boss = createBoss(currentGame.wave, player.current.pos);
      enemies.current.push(boss);
      spawnWarnings.current.push({
        pos: boss.pos.clone(),
        life: 1.45,
        maxLife: 1.45,
        color: getEnemyAccentColor(boss),
        label: 'RIFT BEAST',
        radius: 4.2
      });
      hitBursts.current.push({ pos: boss.pos.clone(), life: 1.1, maxLife: 1.1, color: '#ffdf6e' });
      showEncounterAlert(updateGame, {
        kind: 'boss',
        label: 'RIFT BEAST',
        title: '균열 보스 출현',
        hint: '패턴 예고 확인',
        color: '#ffdf6e',
        threat: {
          kind: 'boss',
          label: 'RIFT BEAST',
          name: '균열 보스',
          weakness: '예고 후 회피',
          color: '#ffdf6e'
        }
      }, 4.0);
      bossSpawnedWave.current = currentGame.wave;
    }
    if (spawnTimer.current <= 0 && enemies.current.length < targetCount) {
      const missing = targetCount - enemies.current.length;
      const catchUp = missing > 42 ? 6 : missing > 26 ? 4 : missing > 14 ? 2 : 0;
      const amount = Math.min(
        18,
        enemyLimit - enemies.current.length,
        Math.ceil((waveProfile.spawnBase + Math.floor(currentGame.time / 72) + catchUp) * Math.min(1.24, pressure) * openingEase * rhythm.spawn)
      );
      for (let i = 0; i < amount; i += 1) {
        const enemy = applyCombatRhythm(createEnemy(currentGame.wave, waveProfile, player.current.pos), rhythm);
        enemies.current.push(enemy);
        if (i === 0 || currentGame.wave > 2) {
          spawnWarnings.current.push({
            pos: enemy.pos.clone(),
            life: 0.78,
            maxLife: 0.78,
            color: getSpawnColor(enemy.kind),
            label: ''
          });
        }
      }
      spawnTimer.current = Math.max(0.24, (waveProfile.interval - currentGame.wave * 0.018) / Math.max(0.8, rhythm.spawn));
    }
  };

  const updateWeapons = (dt, currentGame) => {
    const stats = currentGame.stats;
    const weaponStage = getWeaponStage(currentGame);
    const overloadDamage = currentGame.overloadTimer > 0 ? 1.25 : 1;
    const overloadCooldown = currentGame.overloadTimer > 0 ? 0.58 : 1;
    const orbFocus = getBuildFocus(currentGame, 'orb');
    const stormFocus = getBuildFocus(currentGame, 'storm');
    const bladeFocus = getBuildFocus(currentGame, 'blade');
    const chainFocus = getBuildFocus(currentGame, 'chain');
    const novaFocus = getBuildFocus(currentGame, 'nova');
    const stormUnlocked = isWeaponFamilyUnlocked(currentGame, 'storm');
    const chainUnlocked = isWeaponFamilyUnlocked(currentGame, 'chain');
    const novaUnlocked = isWeaponFamilyUnlocked(currentGame, 'nova');
    const stormChainLevel = getSynergyLevel(currentGame, 'storm-chain');
    const bladeNovaLevel = getSynergyLevel(currentGame, 'blade-nova');
    const orbPierceLevel = getSynergyLevel(currentGame, 'orb-pierce');
    orbTimer.current -= dt;
    stormTimer.current -= dt;
    lightningTimer.current -= dt;
    novaTimer.current -= dt;

    if (orbTimer.current <= 0) {
      const orbCount = Math.min(12, stats.orbCount + Math.floor(orbFocus / 2));
      const targets = nearestEnemies(orbCount, 42 + (stats.orbSpeed - 1) * 24 + orbFocus * 4);
      if (targets.length > 0) {
        const tier = getWeaponTier(stats, weaponStage);
        const shotTotal = orbFocus >= 2 ? Math.max(orbCount, targets.length) : targets.length;
        for (let index = 0; index < shotTotal; index += 1) {
          const target = targets[index % targets.length];
          const dir = target.pos.clone().sub(player.current.pos).setY(0).normalize();
          const spread = (index - (shotTotal - 1) / 2) * (orbFocus >= 2 ? 0.14 : 0.09);
          dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
          addProjectile({
            type: 'orb',
            pos: player.current.pos.clone().add(new THREE.Vector3(0, 0.35, 0)),
            vel: dir.multiplyScalar(weaponCatalog[0].speed * stats.orbSpeed * (1 + orbPierceLevel * 0.06)),
            angle: Math.atan2(dir.x, dir.z),
            life: 1.25 + stats.pierce * 0.05,
            damage: weaponCatalog[0].damage * stats.damage * stats.orbDamage * overloadDamage * (1 + orbFocus * 0.035 + orbPierceLevel * 0.05),
            pierce: weaponCatalog[0].pierce + stats.pierce + (orbFocus >= 3 ? 1 : 0) + Math.floor(orbPierceLevel / 2),
            radius: weaponCatalog[0].size * stats.orbScale * (tier + weaponStage * 0.1),
            visualScale: stats.orbScale * (tier + weaponStage * 0.2),
            stage: weaponStage,
            trailLength: 1.05 + tier * 0.18 + weaponStage * 0.35 + orbFocus * 0.08,
            color: getOrbColor(stats, weaponStage)
          });
        }
      }
      orbTimer.current = Math.max(0.16, weaponCatalog[0].cooldown * stats.cooldown * overloadCooldown * (1 - weaponStage * 0.04) * (1 - Math.min(0.12, orbFocus * 0.02)));
    }

    if (stormUnlocked && stormTimer.current <= 0 && enemies.current.length > 3) {
      const tier = getWeaponTier(stats, weaponStage);
      const strikeCount = Math.min(7, Math.max(1, Math.round(stats.stormStrikes) + Math.floor(stormFocus / 2)));
      for (let strike = 0; strike < strikeCount; strike += 1) {
        const target = enemies.current[Math.floor(Math.random() * enemies.current.length)];
        if (!target) continue;
        const offset = strike === 0
          ? new THREE.Vector3()
          : new THREE.Vector3((Math.random() - 0.5) * (5.5 + stormFocus * 0.9), 0, (Math.random() - 0.5) * (5.5 + stormFocus * 0.9));
        const strikePos = target.pos.clone().add(offset).add(new THREE.Vector3(0, 0.8, 0));
        addProjectile({
          type: 'storm',
          pos: strikePos,
          vel: new THREE.Vector3(),
          angle: Math.random() * Math.PI * 2,
          life: 0.34 * stats.stormDuration * (1 + stormFocus * 0.06),
          damage: weaponCatalog[1].damage * stats.damage * stats.stormDamage * overloadDamage * (1 + stormFocus * 0.03 + stormChainLevel * 0.035),
          pierce: weaponCatalog[1].pierce,
          radius: 1.55 * (tier + weaponStage * 0.08) * stats.stormRadius * (1 + stormFocus * 0.035),
          visualScale: tier + weaponStage * 0.18,
          stage: weaponStage,
          burstRadius: (1.7 + tier * 0.36 + weaponStage * 0.42 + stormFocus * 0.18) * stats.stormRadius,
          color: getStormColor(stats, weaponStage)
        });
        hitBursts.current.push({
          pos: strikePos.clone(),
          life: (0.5 + weaponStage * 0.05) * Math.min(1.9, stats.stormDuration + stormFocus * 0.08),
          maxLife: (0.5 + weaponStage * 0.05) * Math.min(1.9, stats.stormDuration + stormFocus * 0.08),
          color: getStormColor(stats, weaponStage),
          type: 'storm',
          stage: weaponStage,
          radius: 1.35 + tier * 0.24 + stormFocus * 0.12
        });
      }
      stormTimer.current = Math.max(0.38, weaponCatalog[1].cooldown * stats.cooldown * stats.stormCooldown * overloadCooldown * (1 - weaponStage * 0.06) * (1 - Math.min(0.14, stormFocus * 0.025 + stormChainLevel * 0.018)));
    }

    if (chainUnlocked && lightningTimer.current <= 0 && enemies.current.length > 0) {
      const chainTargets = nearestEnemies(
        stats.lightningChains + Math.floor(weaponStage / 2) + Math.floor(chainFocus / 2),
        weaponCatalog[3].range * stats.lightningRange + weaponStage * 4 + chainFocus * 3 + stormChainLevel * 3.5
      );
      let previous = player.current.pos.clone().add(new THREE.Vector3(0, 1.05, 0));
      const color = getLightningColor(stats, weaponStage);
      chainTargets.forEach((enemy, index) => {
        const executeBoost = stats.lightningExecute > 0 && enemy.hp / enemy.maxHp < 0.45
          ? 1 + stats.lightningExecute * 0.34
          : 1;
        const damage = weaponCatalog[3].damage * stats.damage * stats.lightningDamage * overloadDamage * executeBoost * (1 - index * 0.08) * (1 + chainFocus * 0.035 + stormChainLevel * 0.035);
        const dealt = applyDamageToEnemy(enemy, damage, 'lightning');
        recordDamage('lightning', dealt);
        enemy.flash = 0.2;
        enemy.shocked = Math.max(enemy.shocked ?? 0, 0.48 + chainFocus * 0.16 + stormChainLevel * 0.1);
        enemy.pos.addScaledVector(enemy.pos.clone().sub(player.current.pos).setY(0).normalize(), 0.08);
        addDamageNumber(enemy.pos, Math.ceil(dealt), color, 0.64);
        hitBursts.current.push({
          pos: enemy.pos.clone(),
          life: 0.24,
          maxLife: 0.24,
          color,
          type: 'lightning',
          stage: weaponStage,
          radius: 0.95 + weaponStage * 0.12
        });
        weaponEffects.current.push({
          type: 'beam',
          from: previous.clone(),
          to: enemy.pos.clone().add(new THREE.Vector3(0, 1.0, 0)),
          life: 0.18,
          maxLife: 0.18,
          color,
          width: 0.11 + weaponStage * 0.015
        });
        previous = enemy.pos.clone().add(new THREE.Vector3(0, 1.0, 0));
      });
      if (chainTargets.length > 0) cameraShake.current = Math.max(cameraShake.current, 0.1);
      lightningTimer.current = Math.max(0.3, weaponCatalog[3].cooldown * stats.cooldown * overloadCooldown * (1 - weaponStage * 0.05) * (1 - Math.min(0.12, chainFocus * 0.02)));
    }

    if (novaUnlocked && novaTimer.current <= 0 && enemies.current.length > 0) {
      const color = getNovaColor(stats, weaponStage);
      const radius = weaponCatalog[4].radius * stats.novaRadius * (1 + weaponStage * 0.08 + novaFocus * 0.045 + bladeNovaLevel * 0.04);
      const pulseBoost = 1 + stats.novaPulse * 0.12;
      const damage = weaponCatalog[4].damage * stats.damage * stats.novaDamage * pulseBoost * overloadDamage * (1 + novaFocus * 0.04 + bladeNovaLevel * 0.04);
      let hitCount = 0;
      for (const enemy of enemies.current) {
        const distanceSq = enemy.pos.distanceToSquared(player.current.pos);
        if (distanceSq > radius * radius) continue;
        const falloff = 1 - Math.sqrt(distanceSq) / radius * 0.34;
        const dealt = applyDamageToEnemy(enemy, damage * falloff, 'nova');
        recordDamage('nova', dealt);
        enemy.flash = 0.16;
        const push = enemy.pos.clone().sub(player.current.pos).setY(0);
        if (push.lengthSq() > 0.001) enemy.pos.addScaledVector(push.normalize(), 0.34 + novaFocus * 0.05 + bladeNovaLevel * 0.04);
        hitCount += 1;
        if (hitCount <= 18) addDamageNumber(enemy.pos, Math.ceil(dealt), color, 0.56);
      }
      hitBursts.current.push({
        pos: player.current.pos.clone(),
        life: 0.62,
        maxLife: 0.62,
        color,
        type: 'nova',
        stage: weaponStage,
        radius
      });
      weaponEffects.current.push({
        type: 'ring',
        pos: player.current.pos.clone(),
        life: 0.56,
        maxLife: 0.56,
        color,
        radius
      });
      if (stats.novaPulse > 0) {
        weaponEffects.current.push({
          type: 'ring',
          pos: player.current.pos.clone(),
          life: 0.78,
          maxLife: 0.78,
          color: '#fff1a6',
          radius: radius * (0.54 + Math.min(0.24, stats.novaPulse * 0.06))
        });
      }
      if (novaFocus >= 2) {
        weaponEffects.current.push({
          type: 'ring',
          pos: player.current.pos.clone(),
          life: 0.9,
          maxLife: 0.9,
          color: '#fff1a6',
          radius: radius * (0.32 + Math.min(0.18, novaFocus * 0.03))
        });
      }
      if (hitCount > 0) cameraShake.current = Math.max(cameraShake.current, 0.16);
      novaTimer.current = Math.max(0.58, weaponCatalog[4].cooldown * stats.cooldown * stats.novaCooldown * overloadCooldown * (1 - weaponStage * 0.05) * (1 - Math.min(0.16, novaFocus * 0.028 + bladeNovaLevel * 0.014)));
    }
  };

  const updateProjectiles = (dt, stats, currentGame) => {
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
      const bladePos = player.current.pos.clone().add(new THREE.Vector3(Math.cos(offset) * bladeRadius, 0.22, Math.sin(offset) * bladeRadius));
      for (const enemy of enemies.current) {
        if (enemy.pos.distanceToSquared(bladePos) < enemy.hitRadius ** 2) {
          const bladeDamage = weaponCatalog[2].damage * stats.damage * stats.bladeDamage * overloadDamage * dt * (6 + weaponStage * 0.75 + bladeFocus * 0.32);
          const dealt = applyDamageToEnemy(enemy, bladeDamage, 'blade');
          recordDamage('blade', dealt);
          enemy.flash = 0.1;
          enemy.bladeNumberTimer = (enemy.bladeNumberTimer ?? 0) - dt;
          if (enemy.bladeNumberTimer <= 0) {
            enemy.bladeNumberTimer = 0.22;
            addDamageNumber(enemy.pos, Math.ceil(dealt * 5), bladeColor, 0.46 + weaponStage * 0.03);
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
  };

  const rebuildProjectileGrid = () => {
    const grid = projectileGrid.current;
    grid.cells.clear();
    grid.maxRadius = 0;
    grid.candidates.length = 0;

    for (const projectile of projectiles.current) {
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
  };

  const getProjectileCandidatesForEnemy = enemy => {
    const grid = projectileGrid.current;
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
        candidates.push(...bucket);
      }
    }

    return candidates;
  };

  const damagePlayer = (amount, updateGame, invuln = 0.62) => {
    if (player.current.invuln > 0) return false;
    const bladeFocus = getBuildFocus(game, 'blade');
    const guardedAmount = bladeFocus >= 2
      ? amount * (1 - Math.min(0.28, bladeFocus * 0.055))
      : amount;
    player.current.invuln = invuln;
    cameraShake.current = Math.max(cameraShake.current, 0.28);
    const damageValue = Math.ceil(guardedAmount);
    hitBursts.current.push({
      pos: player.current.pos.clone(),
      life: 0.42,
      maxLife: 0.42,
      color: ART_TOKENS.dangerRed,
      type: 'playerHit',
      stage: 4,
      radius: 3.2
    });
    addDamageNumber(player.current.pos, `-${damageValue}`, ART_TOKENS.dangerRed, 0.82);
    updateGame(current => {
      const nextHp = Math.max(0, current.stats.hp - guardedAmount);
      const hpRatio = nextHp / current.stats.maxHp;
      return {
        ...current,
        phase: nextHp <= 0 ? 'ended' : current.phase,
        result: nextHp <= 0 ? 'defeat' : current.result,
        damageFlash: 0.62,
        damageMessage: hpRatio <= 0.34 ? '위험: 체력 낮음' : `피격 -${damageValue}`,
        stats: { ...current.stats, hp: nextHp }
      };
    });
    return true;
  };

  const updateEnemyAbility = (enemy, dt, distance, toPlayer, currentGame, updateGame, spawnedEnemies) => {
    enemy.abilityTimer = Math.max(0, (enemy.abilityTimer ?? 0) - dt);
    enemy.chargeTimer = Math.max(0, (enemy.chargeTimer ?? 0) - dt);
    enemy.bossGuard = Math.max(0, (enemy.bossGuard ?? 0) - dt);
    enemy.currentPatternTimer = Math.max(0, (enemy.currentPatternTimer ?? 0) - dt);
    const abilityScale = getEnemyAbilityScale(currentGame);
    const summonSlots = () => Math.max(0, runtimeBudget.maxEnemies - enemies.current.length - spawnedEnemies.length);

    if (enemy.kind === 'elite' && enemy.role === 'bulwark') {
      enemy.shield = Math.min(enemy.shieldMax, (enemy.shield ?? 0) + dt * 4.5 * getEnemyDamagePressure(currentGame));
      if (enemy.abilityTimer <= 0) {
        enemy.abilityTimer = 5.8 * abilityScale;
        hitBursts.current.push({
          pos: enemy.pos.clone(),
          life: 0.72,
          maxLife: 0.72,
          color: ELITE_ROLE_META.bulwark.color,
          type: 'bulwark',
          stage: 4,
          radius: 3.6
        });
      }
      return;
    }

    if (enemy.kind === 'elite' && enemy.role === 'charger') {
      if (enemy.abilityTimer <= 0 && distance > 8) {
        enemy.abilityTimer = 4.2 * abilityScale;
        enemy.chargeTimer = 0.72 + Math.max(0, currentGame.time - 180) * 0.0008;
        spawnWarnings.current.push({
          pos: enemy.pos.clone().add(toPlayer.clone().multiplyScalar(5.5)),
          life: 0.52,
          maxLife: 0.52,
          color: ELITE_ROLE_META.charger.color,
          label: 'CHARGE',
          cue: '돌진선 이탈',
          shape: 'charge',
          radius: 4.4
        });
        weaponEffects.current.push({
          type: 'beam',
          from: enemy.pos.clone().add(new THREE.Vector3(0, 0.9, 0)),
          to: enemy.pos.clone().add(toPlayer.clone().multiplyScalar(7.5)).add(new THREE.Vector3(0, 0.9, 0)),
          life: 0.38,
          maxLife: 0.38,
          color: ELITE_ROLE_META.charger.color,
          width: 0.08
        });
      }
      return;
    }

    if (enemy.kind === 'elite' && enemy.role === 'summoner') {
      if (enemy.abilityTimer <= 0) {
        enemy.abilityTimer = 6.2 * abilityScale;
        const count = Math.min(7, 2 + Math.floor(currentGame.wave / 2) + (currentGame.time >= 180 ? 1 : 0), summonSlots());
        for (let index = 0; index < count; index += 1) {
          spawnedEnemies.push(createSummonedRunner(enemy, currentGame.wave, player.current.pos, index));
        }
        spawnWarnings.current.push({
          pos: enemy.pos.clone(),
          life: 0.72,
          maxLife: 0.72,
          color: ELITE_ROLE_META.summoner.color,
          label: 'SWARM',
          cue: '소환수 정리',
          shape: 'summon',
          radius: 5.4
        });
        hitBursts.current.push({
          pos: enemy.pos.clone(),
          life: 0.74,
          maxLife: 0.74,
          color: ELITE_ROLE_META.summoner.color,
          type: 'summon',
          stage: 4,
          radius: 4.4
        });
      }
      return;
    }

    if (enemy.kind !== 'boss') return;

    if ((enemy.shockwaveTimer ?? 0) > 0) {
      const before = enemy.shockwaveTimer;
      enemy.shockwaveTimer = Math.max(0, enemy.shockwaveTimer - dt);
      if (before > 0 && enemy.shockwaveTimer <= 0) {
        const radius = 20 + currentGame.wave * 0.8 + Math.max(0, currentGame.time - 180) * 0.025;
        hitBursts.current.push({
          pos: enemy.pos.clone(),
          life: 0.9,
          maxLife: 0.9,
          color: BOSS_PATTERN_META.shockwave.color,
          type: 'bossShockwave',
          stage: 5,
          radius
        });
        weaponEffects.current.push({
          type: 'ring',
          pos: enemy.pos.clone(),
          life: 0.72,
          maxLife: 0.72,
          color: BOSS_PATTERN_META.shockwave.color,
          radius
        });
        if (distance < radius && distance > 3.4 && damagePlayer((enemy.damage + 5) * getEnemyDamagePressure(currentGame), updateGame, 0.86)) {
          player.current.pos.addScaledVector(toPlayer, 4.2);
          resolveStaticCollisions(player.current.pos, PLAYER_RADIUS);
        }
      }
    }

    if ((enemy.summonWindupTimer ?? 0) > 0) {
      const before = enemy.summonWindupTimer;
      enemy.summonWindupTimer = Math.max(0, enemy.summonWindupTimer - dt);
      if (before > 0 && enemy.summonWindupTimer <= 0) {
        const meta = BOSS_PATTERN_META.summon;
        const count = Math.min(12, 4 + Math.floor(currentGame.wave / 2) + (currentGame.time >= 180 ? 2 : 0), summonSlots());
        for (let index = 0; index < count; index += 1) {
          spawnedEnemies.push(createSummonedRunner(enemy, currentGame.wave + 1, player.current.pos, index));
        }
        hitBursts.current.push({
          pos: enemy.pos.clone(),
          life: 0.92,
          maxLife: 0.92,
          color: meta.color,
          type: 'summon',
          stage: 5,
          radius: 7.8
        });
        weaponEffects.current.push({
          type: 'ring',
          pos: enemy.pos.clone(),
          life: 0.68,
          maxLife: 0.68,
          color: meta.color,
          radius: 10.5
        });
        cameraShake.current = Math.max(cameraShake.current, 0.22);
      }
      return;
    }

    if ((enemy.guardWindupTimer ?? 0) > 0) {
      const before = enemy.guardWindupTimer;
      enemy.guardWindupTimer = Math.max(0, enemy.guardWindupTimer - dt);
      if (before > 0 && enemy.guardWindupTimer <= 0) {
        const meta = BOSS_PATTERN_META.guard;
        enemy.bossGuard = 5.4 + Math.max(0, currentGame.time - 180) * 0.01;
        hitBursts.current.push({
          pos: enemy.pos.clone(),
          life: 1.0,
          maxLife: 1.0,
          color: meta.color,
          type: 'bossGuard',
          stage: 5,
          radius: 6.4
        });
        weaponEffects.current.push({
          type: 'ring',
          pos: enemy.pos.clone(),
          life: 0.78,
          maxLife: 0.78,
          color: meta.color,
          radius: 9.8
        });
        cameraShake.current = Math.max(cameraShake.current, 0.18);
      }
      return;
    }

    if (enemy.abilityTimer > 0) return;
    const pattern = BOSS_PATTERN_ORDER[enemy.patternIndex % BOSS_PATTERN_ORDER.length];
    enemy.patternIndex += 1;
    const bossPhaseScale = enemy.enraged ? 0.76 : 1;
    enemy.abilityTimer = (pattern === 'guard' ? 6.4 : 7.2) * abilityScale * bossPhaseScale;
    const meta = BOSS_PATTERN_META[pattern];
    const warningRadius = pattern === 'shockwave'
      ? 20 + currentGame.wave * 0.8 + Math.max(0, currentGame.time - 180) * 0.025
      : pattern === 'summon'
        ? 10.5
        : 9.8;
    const warningLife = pattern === 'shockwave' ? 1.35 : 1.08;
    enemy.currentPattern = pattern;
    enemy.currentPatternTimer = warningLife;
    spawnWarnings.current.push({
      pos: enemy.pos.clone(),
      life: warningLife,
      maxLife: warningLife,
      color: meta.color,
      label: meta.label,
      cue: meta.cue,
      radius: warningRadius,
      shape: meta.shape
    });
    weaponEffects.current.push({
      type: 'ring',
      pos: enemy.pos.clone(),
      life: warningLife,
      maxLife: warningLife,
      color: meta.color,
      radius: warningRadius
    });
    showEncounterAlert(updateGame, {
      kind: 'boss-pattern',
      label: meta.label,
      title: `보스 패턴: ${meta.label}`,
      hint: meta.cue,
      color: meta.color,
      pattern
    }, 2.5);

    if (pattern === 'shockwave') {
      enemy.shockwaveTimer = 1.35;
      cameraShake.current = Math.max(cameraShake.current, 0.14);
      return;
    }

    if (pattern === 'summon') {
      enemy.summonWindupTimer = 1.05;
      cameraShake.current = Math.max(cameraShake.current, 0.12);
      return;
    }

    enemy.guardWindupTimer = 1.05;
    cameraShake.current = Math.max(cameraShake.current, 0.12);
  };

  const updateEnemies = (dt, currentGame, updateGame) => {
    const playerPos = player.current.pos;
    let kills = 0;
    let eliteKills = 0;
    let bossKills = 0;
    const spawnedEnemies = [];
    for (const enemy of enemies.current) {
      const toPlayer = playerPos.clone().sub(enemy.pos).setY(0);
      const distance = Math.max(0.001, toPlayer.length());
      toPlayer.divideScalar(distance);
      if (enemy.kind === 'boss' && !enemy.enraged && enemy.hp / enemy.maxHp <= 0.5) {
        enemy.enraged = true;
        enemy.speed *= 1.08;
        enemy.damage *= 1.12;
        enemy.abilityTimer = Math.min(enemy.abilityTimer ?? 0, 1.2);
        hitBursts.current.push({
          pos: enemy.pos.clone(),
          life: 1.2,
          maxLife: 1.2,
          color: '#ff8b72',
          type: 'bossRage',
          stage: 5,
          radius: 8.4
        });
        spawnWarnings.current.push({
          pos: enemy.pos.clone(),
          life: 1.5,
          maxLife: 1.5,
          color: '#ff8b72',
          label: 'RAGE',
          radius: 7.0
        });
        cameraShake.current = Math.max(cameraShake.current, 0.42);
        showEncounterAlert(updateGame, {
          kind: 'boss',
          label: 'RIFT RAGE',
          title: '보스 분노 페이즈',
          hint: '패턴 가속',
          color: '#ff8b72',
          threat: {
            kind: 'boss',
            label: 'RAGE',
            name: '분노 보스',
            weakness: '거리 유지',
            color: '#ff8b72'
          },
          message: '보스 분노: 패턴 가속',
          flash: 3.2
        }, 3.6);
      }
      updateEnemyAbility(enemy, dt, distance, toPlayer, currentGame, updateGame, spawnedEnemies);
      enemy.shocked = Math.max(0, (enemy.shocked ?? 0) - dt);
      const shockMultiplier = enemy.shocked > 0
        ? Math.max(0.54, 0.82 - getBuildFocus(currentGame, 'chain') * 0.035)
        : 1;
      const speedMultiplier = (enemy.chargeTimer > 0 ? 3.1 : enemy.bossGuard > 0 ? 0.72 : 1) * shockMultiplier * getEnemyMovePressure(currentGame);
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

      if (distance < enemy.radius + PLAYER_RADIUS && player.current.invuln <= 0) {
        damagePlayer(enemy.damage * getEnemyDamagePressure(currentGame), updateGame);
      }

      const nearbyProjectiles = getProjectileCandidatesForEnemy(enemy);
      for (const projectile of nearbyProjectiles) {
        if (projectile.life <= 0 || projectile.pierce < 0) continue;
        if (projectile.pos.distanceToSquared(enemy.pos) < (enemy.hitRadius + projectile.radius) ** 2) {
          const dealt = applyDamageToEnemy(enemy, projectile.damage, projectile.type);
          recordDamage(projectile.type, dealt);
          enemy.flash = 0.14;
          projectile.pierce -= 1;
          const push = projectile.type === 'storm'
            ? enemy.pos.clone().sub(player.current.pos).setY(0)
            : projectile.vel.clone().setY(0);
          if (push.lengthSq() > 0.001) {
            enemy.pos.addScaledVector(push.normalize(), projectile.type === 'storm' ? 0.28 : 0.18);
          }
          addDamageNumber(enemy.pos, Math.ceil(dealt), projectile.color, projectile.type === 'storm' ? 0.82 : 0.62);
          hitBursts.current.push({
            pos: enemy.pos.clone(),
            life: 0.28 + (projectile.stage ?? 0) * 0.04,
            maxLife: 0.28 + (projectile.stage ?? 0) * 0.04,
            color: projectile.color,
            type: projectile.type,
            stage: projectile.stage ?? 0,
            radius: projectile.radius
          });
          cameraShake.current = Math.max(cameraShake.current, projectile.type === 'storm' ? 0.16 : 0.08);
        }
      }
    }
    if (spawnedEnemies.length > 0) {
      enemies.current.push(...spawnedEnemies);
    }

    const alive = [];
    for (const enemy of enemies.current) {
      if (enemy.hp <= 0) {
        kills += 1;
        if (enemy.kind === 'elite') eliteKills += 1;
        if (enemy.kind === 'boss') bossKills += 1;
        const gemPos = enemy.pos.clone();
        gemPos.y += enemy.kind === 'boss' || enemy.kind === 'elite' ? 1.08 : 0.76;
        addXpGem(gemPos, enemy.xp);
        if (fieldItemDropLock.current <= 0 && fieldItems.current.length < MAX_FIELD_ITEMS) {
          const dropChance = enemy.kind === 'boss' || enemy.kind === 'elite' ? 1 : enemy.kind === 'brute' ? 0.09 : enemy.kind === 'runner' ? 0.028 : 0.038;
          if (Math.random() < dropChance) {
            const dropPos = enemy.pos.clone();
            dropPos.y = getPlayerTerrainY(dropPos.x, dropPos.z) + 0.42;
            const dropType = enemy.kind === 'boss'
              ? 'purge'
              : enemy.kind === 'elite'
                ? (Math.random() < 0.45 ? 'cache' : Math.random() < 0.74 ? 'overload' : 'heal')
                : Math.random() > 0.76 ? 'purge' : pickFieldItemType(currentGame);
            fieldItems.current.push(createFieldItem(dropType, dropPos));
            fieldItemDropLock.current = enemy.kind === 'boss' || enemy.kind === 'elite' ? 3.2 : 6.2;
          }
        }
        hitBursts.current.push({ pos: enemy.pos.clone(), life: 0.36, maxLife: 0.36, color: enemy.kind === 'elite' || enemy.kind === 'boss' ? getEnemyAccentColor(enemy) : '#9df57a' });
        addDamageNumber(
          enemy.pos,
          enemy.kind === 'boss' ? 'BOSS DOWN' : enemy.kind === 'elite' ? 'ELITE DOWN' : `+${enemy.xp}`,
          enemy.kind === 'boss' || enemy.kind === 'elite' ? getEnemyAccentColor(enemy) : '#9df57a',
          enemy.kind === 'boss' || enemy.kind === 'elite' ? 0.95 : 0.54
        );
        if (enemy.canSplit && enemies.current.length + spawnedEnemies.length < runtimeBudget.maxEnemies - 4) {
          const splitCount = enemy.kind === 'brute' ? 3 : 2;
          for (let index = 0; index < splitCount; index += 1) {
            spawnedEnemies.push(createSplitRunner(enemy, currentGame.wave, player.current.pos, index));
          }
          spawnWarnings.current.push({
            pos: enemy.pos.clone(),
            life: 0.56,
            maxLife: 0.56,
            color: '#d8b2ff',
            label: 'SPLIT'
          });
        }
      } else {
        alive.push(enemy);
      }
    }
    enemies.current = alive;

    if (kills > 0) {
      cameraShake.current = Math.max(cameraShake.current, Math.min(0.26, 0.05 + kills * 0.018));
      updateGame(current => ({
        ...current,
        kills: current.kills + kills,
        eliteKills: current.eliteKills + eliteKills,
        bossKills: current.bossKills + bossKills,
        activeThreat: eliteKills > 0 || bossKills > 0 ? null : current.activeThreat,
        lastBossPattern: bossKills > 0 ? null : current.lastBossPattern
      }));
    }
  };

  const updateGems = (dt, currentGame, updateGame, levelUp) => {
    const playerPos = player.current.pos;
    let gained = 0;
    const gemCount = xpGems.current.length;
    let gemWrite = 0;
    for (const gem of xpGems.current) {
      gem.pulse += dt * 5;
      const distance = gem.pos.distanceTo(playerPos);
      const passiveReach = Math.min(18, currentGame.level * 0.38 + currentGame.time * 0.06);
      const crowdReach = gemCount > 170 ? Math.min(10, (gemCount - 170) * 0.04) : 0;
      const magnetDistance = gem.magnetized ? 190 : XP_BASE_MAGNET_RADIUS * currentGame.stats.magnet + passiveReach + crowdReach;
      if (distance < magnetDistance && distance > 0.001) {
        const pull = scratch.vec.copy(playerPos).sub(gem.pos).setY(0).normalize();
        const pullSpeed = gem.magnetized ? 44 + Math.min(110, distance * 1.35) : 12 + magnetDistance * 1.65;
        gem.pos.addScaledVector(pull, dt * pullSpeed);
      }
      if (distance < XP_PICKUP_RADIUS) {
        gained += gem.value * currentGame.stats.xpGain;
        continue;
      }
      if (gemWrite < runtimeBudget.maxXpGems) {
        xpGems.current[gemWrite] = gem;
        gemWrite += 1;
      }
    }
    xpGems.current.length = gemWrite;

    if (gained > 0) {
      updateGame(current => {
        let nextXp = current.xp + gained;
        let nextLevel = current.level;
        let nextXpToNext = current.xpToNext;
        let earnedUpgrades = 0;
        let shouldLevel = false;
        while (nextXp >= nextXpToNext) {
          nextXp -= nextXpToNext;
          nextLevel += 1;
          nextXpToNext = Math.floor(nextXpToNext * 1.16 + 11);
          earnedUpgrades += 1;
          shouldLevel = true;
        }
        if (shouldLevel && !levelUpQueued.current) {
          levelUpQueued.current = true;
          window.setTimeout(levelUp, 0);
        }
        return {
          ...current,
          xp: nextXp,
          level: nextLevel,
          xpToNext: nextXpToNext,
          pendingUpgrades: (current.pendingUpgrades ?? 0) + earnedUpgrades
        };
      });
    }
  };

  const updateFieldItems = (dt, currentGame, updateGame) => {
    fieldItemTimer.current -= dt;
    fieldItemDropLock.current = Math.max(0, fieldItemDropLock.current - dt);

    for (const scheduled of EARLY_FIELD_ITEM_SCHEDULE) {
      if (currentGame.time < scheduled.time || scheduledFieldItems.current.has(scheduled.id)) continue;
      const item = createFieldItem(
        scheduled.type,
        getFieldItemDropPosition(player.current.pos, scheduled.distance, scheduled.spread ?? 4)
      );
      const meta = FIELD_ITEM_META[scheduled.type];
      fieldItems.current.push(item);
      spawnWarnings.current.push({
        pos: item.pos.clone(),
        life: 1.05,
        maxLife: 1.05,
        color: meta.color,
        label: meta.label
      });
      scheduledFieldItems.current.add(scheduled.id);
      fieldItemTimer.current = Math.max(fieldItemTimer.current, 3.8);
    }

    if (fieldItemTimer.current <= 0 && fieldItems.current.length < MAX_FIELD_ITEMS) {
      const type = pickFieldItemType(currentGame);
      const meta = FIELD_ITEM_META[type];
      const item = createFieldItem(type, getFieldItemDropPosition(player.current.pos));
      fieldItems.current.push(item);
      spawnWarnings.current.push({
        pos: item.pos.clone(),
        life: 0.9,
        maxLife: 0.9,
        color: meta.color,
        label: meta.label
      });
      fieldItemTimer.current = currentGame.time < 125
        ? 5.4 + Math.random() * 3.2
        : Math.max(4.8, 11.5 - currentGame.wave * 0.26 + Math.random() * 3.6);
    }

    let itemWrite = 0;
    for (const item of fieldItems.current) {
      item.pulse += dt * 4.2;
      item.life -= dt;
      if (item.life <= 0) continue;
      const distance = item.pos.distanceTo(player.current.pos);
      if (distance < FIELD_ITEM_ATTRACT_RADIUS && distance > 0.001) {
        const pull = scratch.vec.copy(player.current.pos).sub(item.pos).setY(0).normalize();
        item.pos.addScaledVector(pull, dt * (6.2 + (FIELD_ITEM_ATTRACT_RADIUS - distance) * 1.35));
      }
      if (distance <= FIELD_ITEM_PICKUP_RADIUS) {
        applyFieldItem(item, currentGame, updateGame);
        continue;
      }
      fieldItems.current[itemWrite] = item;
      itemWrite += 1;
    }
    fieldItems.current.length = itemWrite;
  };

  const updateShrines = (dt, currentGame, updateGame) => {
    for (const shrine of shrines.current) {
      if (shrine.activated) continue;
      shrine.pulse += dt * 2.6;
      const distance = shrine.pos.distanceTo(player.current.pos);
      if (distance < SHRINE_ACTIVATE_RADIUS) {
        shrine.channel = Math.min(SHRINE_CHANNEL_TIME, shrine.channel + dt);
        if (!shrine.prompted) {
          shrine.prompted = true;
          spawnWarnings.current.push({
            pos: shrine.pos.clone(),
            life: 1.0,
            maxLife: 1.0,
            color: shrine.color,
            label: 'SHRINE'
          });
          addDamageNumber(shrine.pos, shrine.label, shrine.color, 0.72);
        }
      } else {
        shrine.channel = Math.max(0, shrine.channel - dt * 0.72);
      }

      if (shrine.channel < SHRINE_CHANNEL_TIME) continue;
      shrine.activated = true;
      shrine.channel = SHRINE_CHANNEL_TIME;
      activateShrine(shrine, currentGame, updateGame);
    }
  };

  const activateShrine = (shrine, currentGame, updateGame) => {
    hitBursts.current.push({
      pos: shrine.pos.clone(),
      life: 1.0,
      maxLife: 1.0,
      color: shrine.color,
      type: 'shrine',
      stage: 5,
      radius: 7.4
    });
    weaponEffects.current.push({
      type: 'ring',
      pos: shrine.pos.clone(),
      life: 0.82,
      maxLife: 0.82,
      color: shrine.color,
      radius: 13.5
    });
    cameraShake.current = Math.max(cameraShake.current, 0.2);

    if (shrine.reward === 'cache') {
      updateGame(current => {
        let nextGame = withShrineActivation(withItemPickup(current, 'cache'), shrine.id);
        const boosts = [];
        const excluded = new Set();
        const boostCount = current.time < 160 ? 1 : 2;
        for (let index = 0; index < boostCount; index += 1) {
          const boost = pickArmoryBoost(nextGame, excluded);
          if (!boost) break;
          excluded.add(boost.id);
          const focusKey = getUpgradeFocusKey(boost);
          nextGame = {
            ...nextGame,
            stats: boost.apply(nextGame.stats),
            buildFocus: applyBuildFocus(nextGame.buildFocus, focusKey),
            upgrades: [...nextGame.upgrades, boost.id]
          };
          boosts.push(boost);
        }
        return {
          ...nextGame,
          pickupMessage: `무기 제단: ${boosts.map(boost => boost.title).join(' + ')}`,
          pickupFlash: 2.8
        };
      });
      addDamageNumber(shrine.pos, currentGame.time < 160 ? '무기 각인 x1' : '무기 각인 x2', shrine.color, 0.98);
      return;
    }

    if (shrine.reward === 'heal') {
      updateGame(current => ({
        ...withShrineActivation(withItemPickup(current, 'heal'), shrine.id),
        pickupMessage: '생명 제단: 최대 체력 회복',
        pickupFlash: 2.6,
        stats: {
          ...current.stats,
          hp: current.stats.maxHp
        }
      }));
      addDamageNumber(shrine.pos, '완전 회복', shrine.color, 0.98);
      return;
    }

    if (shrine.reward === 'upgrade') {
      updateGame(current => ({
        ...withShrineActivation(current, shrine.id),
        pendingUpgrades: (current.pendingUpgrades ?? 0) + 1,
        pickupMessage: '각인 제단: 보상 선택 +1',
        pickupFlash: 2.8
      }));
      addDamageNumber(shrine.pos, '보상 선택 +1', shrine.color, 0.98);
      return;
    }

    let cleared = 0;
    const clearRadius = 48;
    for (const enemy of enemies.current) {
      if (enemy.pos.distanceToSquared(shrine.pos) > clearRadius * clearRadius) continue;
      enemy.hp = 0;
      enemy.flash = 0.18;
      cleared += 1;
      if (cleared <= 34) {
        hitBursts.current.push({
          pos: enemy.pos.clone(),
          life: 0.42,
          maxLife: 0.42,
          color: shrine.color,
          type: 'purge',
          stage: 5,
          radius: enemy.hitRadius + 0.8
        });
      }
    }
    updateGame(current => ({
      ...withShrineActivation(withItemPickup(current, 'purge'), shrine.id),
      pickupMessage: `정화 제단: ${cleared} 소멸`,
      pickupFlash: 2.6
    }));
    addDamageNumber(shrine.pos, `정화 ${cleared}`, shrine.color, 0.98);
  };

  const applyFieldItem = (item, currentGame, updateGame) => {
    if (item.type === 'magnet') {
      xpGems.current.forEach(gem => {
        gem.magnetized = true;
      });
      hitBursts.current.push({
        pos: player.current.pos.clone(),
        life: 0.9,
        maxLife: 0.9,
        color: '#70d6ff',
        type: 'magnet',
        stage: 4,
        radius: 4.8
      });
      addDamageNumber(player.current.pos, `자석 ${xpGems.current.length}`, '#9ff7ff', 0.9);
      cameraShake.current = Math.max(cameraShake.current, 0.18);
      updateGame(current => ({
        ...withItemPickup(current, 'magnet'),
        pickupMessage: '자석 룬: XP 흡수',
        pickupFlash: 2.4
      }));
      return;
    }

    if (item.type === 'heal') {
      const healAmount = 34;
      hitBursts.current.push({
        pos: player.current.pos.clone(),
        life: 0.78,
        maxLife: 0.78,
        color: FIELD_ITEM_META.heal.color,
        type: 'heal',
        stage: 3,
        radius: 4.2
      });
      addDamageNumber(player.current.pos, `회복 +${healAmount}`, FIELD_ITEM_META.heal.color, 0.9);
      cameraShake.current = Math.max(cameraShake.current, 0.12);
      updateGame(current => ({
        ...withItemPickup(current, 'heal'),
        pickupMessage: '생명 결정: 체력 회복',
        pickupFlash: 2.4,
        stats: {
          ...current.stats,
          hp: Math.min(current.stats.maxHp, current.stats.hp + healAmount)
        }
      }));
      return;
    }

    if (item.type === 'overload') {
      const color = FIELD_ITEM_META.overload.color;
      hitBursts.current.push({
        pos: player.current.pos.clone(),
        life: 1.0,
        maxLife: 1.0,
        color,
        type: 'overload',
        stage: 5,
        radius: 6.5
      });
      weaponEffects.current.push({
        type: 'ring',
        pos: player.current.pos.clone(),
        life: 0.7,
        maxLife: 0.7,
        color,
        radius: 11
      });
      addDamageNumber(player.current.pos, '과부하 8초', color, 0.98);
      cameraShake.current = Math.max(cameraShake.current, 0.22);
      updateGame(current => ({
        ...withItemPickup(current, 'overload'),
        overloadTimer: OVERLOAD_DURATION,
        pickupMessage: '과부하 룬: 무기 폭주',
        pickupFlash: 2.4
      }));
      return;
    }

    if (item.type === 'cache') {
      const color = FIELD_ITEM_META.cache.color;
      hitBursts.current.push({
        pos: player.current.pos.clone(),
        life: 0.92,
        maxLife: 0.92,
        color,
        type: 'cache',
        stage: 5,
        radius: 5.2
      });
      weaponEffects.current.push({
        type: 'ring',
        pos: player.current.pos.clone(),
        life: 0.62,
        maxLife: 0.62,
        color,
        radius: 8.5
      });
      cameraShake.current = Math.max(cameraShake.current, 0.18);
      updateGame(current => {
        let nextGame = withItemPickup(current, 'cache');
        const boosts = [];
        const excluded = new Set();
        const boostCount = current.time < 160 ? 1 : current.time > 235 ? 3 : 2;
        for (let index = 0; index < boostCount; index += 1) {
          const boost = pickArmoryBoost(nextGame, excluded);
          if (!boost) break;
          excluded.add(boost.id);
          const focusKey = getUpgradeFocusKey(boost);
          nextGame = {
            ...nextGame,
            stats: boost.apply(nextGame.stats),
            buildFocus: applyBuildFocus(nextGame.buildFocus, focusKey),
            upgrades: [...nextGame.upgrades, boost.id]
          };
          boosts.push(boost);
        }
        const focusKey = getUpgradeFocusKey(boosts[boosts.length - 1]);
        const focusMessage = getFocusMessage(focusKey, nextGame.buildFocus);
        const boostNames = boosts.map(boost => boost.title).join(' + ');
        return {
          ...nextGame,
          pickupMessage: focusMessage ? `무기 보급: ${focusMessage}` : `무기 보급: ${boostNames}`,
          pickupFlash: 2.8
        };
      });
      addDamageNumber(player.current.pos, currentGame.time < 160 ? '무기 강화 x1' : currentGame.time > 235 ? '무기 강화 x3' : '무기 강화 x2', color, 1.0);
      orbTimer.current = Math.min(orbTimer.current, 0.04);
      stormTimer.current = Math.min(stormTimer.current, 0.08);
      lightningTimer.current = Math.min(lightningTimer.current, 0.06);
      novaTimer.current = Math.min(novaTimer.current, currentGame.time < 35 ? 0.55 : 0.12);
      return;
    }

    let cleared = 0;
    const clearRadius = 58;
    for (const enemy of enemies.current) {
      if (enemy.pos.distanceToSquared(player.current.pos) > clearRadius * clearRadius) continue;
      enemy.hp = 0;
      enemy.flash = 0.18;
      cleared += 1;
      if (cleared <= 30) {
        hitBursts.current.push({
          pos: enemy.pos.clone(),
          life: 0.46,
          maxLife: 0.46,
          color: '#ffdf6e',
          type: 'purge',
          stage: 5,
          radius: enemy.hitRadius + 0.8
        });
      }
    }
    hitBursts.current.push({
      pos: player.current.pos.clone(),
      life: 1.1,
      maxLife: 1.1,
      color: '#ffdf6e',
      type: 'purge',
      stage: 5,
      radius: 7.2
    });
    addDamageNumber(player.current.pos, `정화 ${cleared}`, '#ffdf6e', 0.96);
    cameraShake.current = Math.max(cameraShake.current, 0.36);
    updateGame(current => ({
      ...withItemPickup(current, 'purge'),
      pickupMessage: '정화 폭발: 근처 적 소멸',
      pickupFlash: 2.4
    }));
  };

  const updateBursts = dt => {
    const budget = getVisualBudget(visualQuality);
    let write = 0;
    for (const burst of hitBursts.current) {
      burst.life -= dt;
      if (burst.life <= 0) continue;
      if (write < budget.hitBursts) {
        hitBursts.current[write] = burst;
        write += 1;
      }
    }
    hitBursts.current.length = write;
  };

  const updateWeaponEffects = dt => {
    const budget = getVisualBudget(visualQuality);
    let write = 0;
    for (const effect of weaponEffects.current) {
      effect.life -= dt;
      if (effect.life <= 0) continue;
      if (write < budget.weaponEffects) {
        weaponEffects.current[write] = effect;
        write += 1;
      }
    }
    weaponEffects.current.length = write;
  };

  const updateDamageNumbers = dt => {
    const budget = getVisualBudget(visualQuality);
    let write = 0;
    for (const number of damageNumbers.current) {
      number.life -= dt;
      if (number.life <= 0) continue;
      number.age += dt;
      number.pos.y += dt * 0.9;
      if (write < budget.damageNumbers) {
        damageNumbers.current[write] = number;
        write += 1;
      }
    }
    damageNumbers.current.length = write;
  };

  const updateSpawnWarnings = dt => {
    const budget = getVisualBudget(visualQuality);
    let write = 0;
    for (const warning of spawnWarnings.current) {
      warning.life -= dt;
      if (warning.life <= 0) continue;
      if (write < budget.spawnWarnings) {
        spawnWarnings.current[write] = warning;
        write += 1;
      }
    }
    spawnWarnings.current.length = write;
  };

  const addDamageNumber = (pos, value, color, size = 0.56) => {
    damageNumbers.current.push({
      pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.22, 1.05, (Math.random() - 0.5) * 0.22)),
      value,
      color,
      size,
      age: 0,
      life: 0.58,
      maxLife: 0.58
    });
  };

  const addXpGem = (pos, value) => {
    if (xpGems.current.length < runtimeBudget.maxXpGems) {
      xpGems.current.push({
        pos,
        value,
        pulse: Math.random() * Math.PI * 2
      });
      return;
    }

    const target = xpGems.current[Math.floor(Math.random() * xpGems.current.length)];
    if (!target) return;
    target.value += value;
    target.pulse = Math.random() * Math.PI * 2;
    target.pos.lerp(pos, 0.28);
  };

  const updateCamera = (camera, dt) => {
    const framedTarget = player.current.pos.clone();
    const frameRadius = ARENA_RADIUS - 38;
    const flatTarget = new THREE.Vector2(framedTarget.x, framedTarget.z);
    if (flatTarget.length() > frameRadius) {
      flatTarget.setLength(frameRadius);
      framedTarget.x = flatTarget.x;
      framedTarget.z = flatTarget.y;
    }
    cameraTarget.current.lerp(framedTarget, 1 - Math.pow(0.001, dt));
    cameraShake.current = Math.max(0, cameraShake.current - dt * 1.35);
    const shake = cameraShake.current;
    const shakeX = (Math.random() - 0.5) * shake;
    const shakeZ = (Math.random() - 0.5) * shake;
    camera.position.lerp(new THREE.Vector3(cameraTarget.current.x + shakeX, 44 + cameraTarget.current.y * 0.38, cameraTarget.current.z + 74 + shakeZ), 0.08);
    camera.lookAt(cameraTarget.current.x, 0.62 + cameraTarget.current.y * 0.68, cameraTarget.current.z);
  };

  const nearestEnemy = () => {
    let best = null;
    let bestDistance = Infinity;
    for (const enemy of enemies.current) {
      const distance = enemy.pos.distanceToSquared(player.current.pos);
      if (distance < bestDistance) {
        best = enemy;
        bestDistance = distance;
      }
    }
    return best;
  };

  const nearestEnemies = (limit = 1, maxDistance = Infinity) => {
    const maxDistanceSq = maxDistance * maxDistance;
    const best = [];
    for (const enemy of enemies.current) {
      const distance = enemy.pos.distanceToSquared(player.current.pos);
      if (distance > maxDistanceSq) continue;
      let insertAt = best.length;
      while (insertAt > 0 && best[insertAt - 1].distance > distance) insertAt -= 1;
      if (insertAt >= limit) continue;
      best.splice(insertAt, 0, { enemy, distance });
      if (best.length > limit) best.pop();
    }
    return best.map(item => item.enemy);
  };

  const renderInstances = () => {
    if (gemMesh.current) {
      const gemCount = Math.min(xpGems.current.length, runtimeBudget.maxXpGems);
      for (let index = 0; index < gemCount; index += 1) {
        const gem = xpGems.current[index];
        const scale = 1.22 + Math.sin(gem.pulse) * 0.22;
        scratch.matrix.compose(gem.pos, scratch.quat, scratch.scale.setScalar(scale));
        gemMesh.current.setMatrixAt(index, scratch.matrix);
      }
      gemMesh.current.count = gemCount;
      gemMesh.current.instanceMatrix.needsUpdate = true;
    }
  };

  return (
    <>
      <hemisphereLight args={['#8edfff', '#17231b', 0.52]} />
      <ambientLight intensity={0.24} />
      <directionalLight
        castShadow={visualQuality !== 'low'}
        position={[22, 30, 14]}
        intensity={2.55}
        color="#f5f0d0"
        shadow-mapSize={visualQuality === 'high' ? [2048, 2048] : [1024, 1024]}
      />
      <directionalLight position={[-34, 18, -48]} intensity={0.78} color={ART_TOKENS.riftViolet} />
      <pointLight position={[0, 2.4, 0]} intensity={3.9} color={ART_TOKENS.runeCyan} distance={14} />
      <pointLight position={[0, 5.8, 0]} intensity={1.25} color={ART_TOKENS.wornGold} distance={38} />
      <pointLight position={[-42, 3.2, -22]} intensity={1.15} color={ART_TOKENS.riftViolet} distance={42} />
      <pointLight position={[48, 3.2, 26]} intensity={0.86} color={ART_TOKENS.runeMint} distance={38} />
      <MapBaseArena visualQuality={visualQuality} />
      <ArenaAtmosphere />
      {visualQuality !== 'low' && <RiftSkyMotifs visualQuality={visualQuality} />}
      <PlayerAvatar rootRef={playerMesh} game={game} player={player} />
      <PlayerPresence player={player} game={game} />
      <OrbitBlades player={player} game={game} />
      <EnemyGroundAuras enemiesRef={enemies} visualQuality={visualQuality} />
      <EnemyAccents enemiesRef={enemies} visualQuality={visualQuality} />
      <SourceEnemyInstances enemiesRef={enemies} kind="golem" url={MODEL_URLS.golem} scaleMultiplier={2.42} materialTone="#365042" visualQuality={visualQuality} />
      <SourceEnemyInstances enemiesRef={enemies} kind="runner" url={MODEL_URLS.runner} scaleMultiplier={2.82} materialTone="#24324c" visualQuality={visualQuality} />
      <SourceEnemyInstances enemiesRef={enemies} kind="brute" url={MODEL_URLS.brute} scaleMultiplier={2.92} materialTone="#7b3e32" visualQuality={visualQuality} />
      <SourceEnemyInstances enemiesRef={enemies} kind="elite" url={MODEL_URLS.boss} scaleMultiplier={1.26} materialTone="#654b8e" visualQuality={visualQuality} />
      <SourceEnemyInstances enemiesRef={enemies} kind="boss" url={MODEL_URLS.boss} scaleMultiplier={2.05} materialTone="#8d7042" visualQuality={visualQuality} />
      <BossNameplates enemiesRef={enemies} />
      <BossPresence enemiesRef={enemies} />
      <instancedMesh ref={gemMesh} args={[null, null, MAX_XP_GEMS]} frustumCulled={false}>
        <octahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial color="#9ff7ff" emissive="#38d9ff" emissiveIntensity={3.5} roughness={0.18} toneMapped={false} />
      </instancedMesh>
      {visualQuality !== 'low' && <GemBeacons gemsRef={xpGems} visualQuality={visualQuality} />}
      <FieldPickupItems itemsRef={fieldItems} />
      <RuneShrineSites shrinesRef={shrines} />
      <SourceProjectileInstances projectilesRef={projectiles} type="orb" url={PROJECTILE_MODEL_URLS.orb} scaleMultiplier={1.25} visualQuality={visualQuality} />
      <SourceProjectileInstances projectilesRef={projectiles} type="storm" url={PROJECTILE_MODEL_URLS.storm} scaleMultiplier={1.85} visualQuality={visualQuality} />
      <ProjectileAuraRings projectilesRef={projectiles} game={game} visualQuality={visualQuality} />
      <WeaponStrikeEffects effectsRef={weaponEffects} />
      {hitBursts.current.map((burst, index) => (
        <HitBurst key={`${index}-${burst.maxLife}`} burst={burst} />
      ))}
      {damageNumbers.current.map((number, index) => (
        <DamageNumber key={`${index}-${number.value}-${number.maxLife}`} number={number} />
      ))}
      {spawnWarnings.current.map((warning, index) => (
        <SpawnWarning key={`${index}-${warning.maxLife}`} warning={warning} />
      ))}
    </>
  );
}

function useInstancedModelParts(url) {
  const { scene } = useGLTF(url);

  return useMemo(() => {
    const model = scene.clone(true);
    model.updateMatrixWorld(true);
    const parts = [];
    model.traverse(child => {
      if (!child.isMesh) return;
      const material = Array.isArray(child.material)
        ? child.material.map(item => item.clone())
        : child.material.clone();
      if (Array.isArray(material)) {
        material.forEach(item => {
          item.roughness = Math.min(0.92, item.roughness ?? 0.72);
        });
      } else {
        material.roughness = Math.min(0.92, material.roughness ?? 0.72);
      }
      parts.push({
        geometry: child.geometry,
        material,
        localMatrix: child.matrixWorld.clone()
      });
    });
    return parts;
  }, [scene]);
}

function SourceEnemyInstances({ enemiesRef, kind, url, scaleMultiplier = 1, materialTone, visualQuality = 'high' }) {
  const parts = useInstancedModelParts(url);
  const styledParts = useMemo(() => {
    if (!materialTone) return parts;
    const tone = new THREE.Color(materialTone);
    return parts.map(part => {
      const material = Array.isArray(part.material)
        ? part.material.map(item => {
          const clone = item.clone();
          clone.color?.lerp(tone, 0.24);
          clone.roughness = Math.min(0.96, clone.roughness ?? 0.8);
          if ('emissive' in clone) {
            clone.emissive = clone.emissive ?? new THREE.Color('#000000');
            clone.emissive.lerp(tone, 0.18);
            clone.emissiveIntensity = Math.max(clone.emissiveIntensity ?? 0, 0.08);
          }
          return clone;
        })
        : part.material.clone();
      if (!Array.isArray(material)) {
        material.color?.lerp(tone, 0.24);
        material.roughness = Math.min(0.96, material.roughness ?? 0.8);
        if ('emissive' in material) {
          material.emissive = material.emissive ?? new THREE.Color('#000000');
          material.emissive.lerp(tone, 0.18);
          material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, 0.08);
        }
      }
      return { ...part, material };
    });
  }, [materialTone, parts]);
  const meshRefs = useRef([]);
  const local = useMemo(() => ({
    pos: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    euler: new THREE.Euler(),
    base: new THREE.Matrix4(),
    final: new THREE.Matrix4()
  }), []);

  useFrame(() => {
    styledParts.forEach((part, partIndex) => {
      const mesh = meshRefs.current[partIndex];
      if (!mesh) return;
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (enemy.kind !== kind) continue;
        if (count >= MAX_ENEMIES) break;
        const stride = enemy.wobble * (kind === 'runner' ? 2.1 : kind === 'brute' ? 0.92 : kind === 'boss' ? 0.48 : 1.1);
        const step = Math.sin(stride);
        const stepLift = Math.max(0, step);
        const chargePower = enemy.chargeTimer > 0 ? 1 : 0;
        const guardPower = enemy.bossGuard > 0 ? 1 : 0;
        const bob = kind === 'runner'
          ? stepLift * 0.22 + chargePower * 0.06
          : kind === 'brute'
            ? Math.abs(step) * 0.055
            : kind === 'boss'
              ? Math.sin(stride) * 0.045
              : Math.abs(step) * 0.07;
        const squash = kind === 'runner'
          ? 0.84 + stepLift * 0.18 + chargePower * 0.08
          : kind === 'brute'
            ? 1.0 + Math.max(0, -step) * 0.065
            : kind === 'elite'
              ? 1.0 + stepLift * 0.045 + chargePower * 0.05
              : kind === 'boss'
                ? 1.0 + Math.sin(stride) * 0.025 - guardPower * 0.08
                : 1.0 + stepLift * 0.045;
        const pitch = kind === 'runner'
          ? -0.16 - stepLift * 0.11 - chargePower * 0.22
          : kind === 'brute'
            ? -0.035 + Math.max(0, -step) * 0.06
            : kind === 'boss'
              ? guardPower * 0.08
              : -0.045 + step * 0.035;
        const roll = kind === 'runner'
          ? Math.sin(stride * 0.5) * 0.18
          : kind === 'brute'
            ? Math.sin(stride * 0.72) * 0.055
            : kind === 'elite'
              ? Math.sin(stride * 0.82) * 0.075 + chargePower * 0.08
              : kind === 'boss'
                ? Math.sin(stride * 0.62) * 0.035
                : Math.sin(stride * 0.74) * 0.06;
        local.pos.set(enemy.pos.x, enemy.pos.y + bob, enemy.pos.z);
        local.euler.set(pitch, enemy.facingAngle ?? enemy.wobble, roll);
        local.quat.setFromEuler(local.euler);
        const bossPulse = kind === 'boss' ? 1 + Math.sin(enemy.wobble * 0.72) * 0.035 : 1;
        const widthPulse = kind === 'runner'
          ? 0.92 + stepLift * 0.05
          : kind === 'brute'
            ? 1.04 + Math.max(0, -step) * 0.025
            : kind === 'boss'
              ? 1.0 + guardPower * 0.08
              : 1;
        const depthPulse = kind === 'runner'
          ? 1.1 + chargePower * 0.16
          : kind === 'brute'
            ? 1.02 + stepLift * 0.04
            : kind === 'elite'
              ? 1.0 + chargePower * 0.12
              : kind === 'boss'
                ? 1.0 + guardPower * 0.06
                : 1.02;
        local.scale.set(
          enemy.radius * scaleMultiplier * widthPulse * bossPulse,
          enemy.radius * scaleMultiplier * squash * bossPulse,
          enemy.radius * scaleMultiplier * depthPulse * bossPulse
        );
        local.base.compose(local.pos, local.quat, local.scale);
        local.final.multiplyMatrices(local.base, part.localMatrix);
        mesh.setMatrixAt(count, local.final);
        count += 1;
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <group>
      {styledParts.map((part, index) => (
        <instancedMesh
          key={`${url}-${index}`}
          ref={node => {
            meshRefs.current[index] = node;
          }}
          args={[part.geometry, part.material, MAX_ENEMIES]}
          frustumCulled={false}
          castShadow={visualQuality === 'high'}
          receiveShadow={visualQuality !== 'low'}
        />
      ))}
    </group>
  );
}

function SourceProjectileInstances({ projectilesRef, type, url, scaleMultiplier = 1, visualQuality = 'high' }) {
  const parts = useInstancedModelParts(url);
  const projectileLimit = getRuntimeBudget(visualQuality).maxProjectiles;
  const meshRefs = useRef([]);
  const axis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const local = useMemo(() => ({
    pos: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    base: new THREE.Matrix4(),
    final: new THREE.Matrix4()
  }), []);

  useFrame(() => {
    const timeSpin = performance.now() * 0.006;
    parts.forEach((part, partIndex) => {
      const mesh = meshRefs.current[partIndex];
      if (!mesh) return;
      let count = 0;
      for (const projectile of projectilesRef.current) {
        if (projectile.type !== type) continue;
        if (count >= projectileLimit) break;
        const scale = (type === 'storm' ? 1.7 : 1) * projectile.visualScale * scaleMultiplier;
        local.pos.copy(projectile.pos);
        local.quat.setFromAxisAngle(axis, (projectile.angle ?? 0) + (type === 'storm' ? timeSpin : 0));
        local.scale.setScalar(scale);
        local.base.compose(local.pos, local.quat, local.scale);
        local.final.multiplyMatrices(local.base, part.localMatrix);
        mesh.setMatrixAt(count, local.final);
        count += 1;
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <group>
      {parts.map((part, index) => (
        <instancedMesh
          key={`${url}-${index}`}
          ref={node => {
            meshRefs.current[index] = node;
          }}
          args={[part.geometry, part.material, MAX_PROJECTILES]}
          frustumCulled={false}
          castShadow={visualQuality === 'high'}
        />
      ))}
    </group>
  );
}

function PlayerPresence({ player, game }) {
  const root = useRef();
  const ground = useRef();
  const castHalo = useRef();
  const dashTrail = useRef();
  const dashSpark = useRef();
  const focusBeam = useRef();
  const directionRune = useRef();
  const shoulderRune = useRef();
  const leftFootRune = useRef();
  const rightFootRune = useRef();
  const castNeedle = useRef();
  const stage = getWeaponStage(game);
  const dominantBuild = getDominantBuild(game);
  const focus = dominantBuild?.focus ?? 0;
  const color = dominantBuild?.color ?? getOrbColor(game.stats, stage);

  useFrame(() => {
    if (!root.current) return;
    const current = player.current;
    const speed = current.vel.length();
    const moveAmount = THREE.MathUtils.clamp(speed / (PLAYER_SPEED * 1.15), 0, 1);
    const stride = performance.now() * 0.012;
    const dashPower = current.dashTimer > 0 ? 1 : 0;
    root.current.position.copy(current.pos);
    root.current.rotation.y = Math.atan2(current.facing.x, current.facing.z);
    if (ground.current) {
      ground.current.rotation.z += 0.012 + stage * 0.003 + speed * 0.0007;
      ground.current.scale.setScalar(1 + Math.sin(performance.now() * 0.004) * 0.04 + dashPower * 0.18 + focus * 0.025);
    }
    if (castHalo.current) {
      castHalo.current.rotation.z -= 0.01 + stage * 0.004;
      castHalo.current.scale.setScalar(1 + stage * 0.08 + focus * 0.035 + Math.min(0.18, speed * 0.012));
    }
    if (dashTrail.current) {
      dashTrail.current.visible = speed > 1.5 || dashPower > 0;
      dashTrail.current.position.set(0, -0.42, -0.58 - Math.min(0.5, speed * 0.035));
      dashTrail.current.scale.set(0.52 + dashPower * 0.58, 1.0 + Math.min(1.28, speed * 0.105) + dashPower * 0.55, 1);
    }
    if (dashSpark.current) {
      dashSpark.current.visible = dashPower > 0;
      dashSpark.current.rotation.z -= 0.12;
      dashSpark.current.scale.setScalar(0.8 + dashPower * 0.9 + Math.sin(performance.now() * 0.028) * 0.08);
    }
    if (focusBeam.current) {
      const beamPulse = 0.82 + Math.sin(performance.now() * 0.006) * 0.08 + Math.min(0.16, focus * 0.015);
      focusBeam.current.position.set(0, 0.82 + Math.sin(performance.now() * 0.004) * 0.04, 0);
      focusBeam.current.scale.set(0.28 + stage * 0.018, 1.55 * beamPulse, 0.28 + stage * 0.018);
    }
    if (directionRune.current) {
      directionRune.current.visible = moveAmount > 0.08 || dashPower > 0;
      directionRune.current.position.set(0, -0.43, 0.86 + Math.min(0.36, speed * 0.025));
      directionRune.current.scale.set(0.5 + dashPower * 0.24, 0.92 + moveAmount * 0.24 + dashPower * 0.32, 1);
      directionRune.current.rotation.z = Math.PI / 4 + Math.sin(stride) * 0.08 * moveAmount;
    }
    if (leftFootRune.current && rightFootRune.current) {
      const leftPulse = Math.max(0, Math.sin(stride));
      const rightPulse = Math.max(0, Math.sin(stride + Math.PI));
      leftFootRune.current.visible = moveAmount > 0.12;
      rightFootRune.current.visible = moveAmount > 0.12;
      leftFootRune.current.position.set(-0.28, -0.49, -0.22 + leftPulse * 0.16);
      rightFootRune.current.position.set(0.28, -0.49, -0.22 + rightPulse * 0.16);
      leftFootRune.current.scale.setScalar(0.36 + leftPulse * 0.28 + dashPower * 0.28);
      rightFootRune.current.scale.setScalar(0.36 + rightPulse * 0.28 + dashPower * 0.28);
      leftFootRune.current.rotation.z += 0.035 + moveAmount * 0.04;
      rightFootRune.current.rotation.z -= 0.035 + moveAmount * 0.04;
    }
    if (shoulderRune.current) {
      shoulderRune.current.rotation.y += 0.022 + stage * 0.006;
      shoulderRune.current.rotation.z = Math.sin(performance.now() * 0.004) * 0.18;
    }
    if (castNeedle.current) {
      const pulse = 0.62 + Math.sin(performance.now() * 0.006 + focus) * 0.16 + stage * 0.04;
      castNeedle.current.position.set(0, 1.12 + Math.sin(performance.now() * 0.005) * 0.04, 0.42);
      castNeedle.current.scale.set(0.16 + focus * 0.01, pulse, 0.16 + focus * 0.01);
      castNeedle.current.rotation.z += 0.028 + stage * 0.004;
    }
  });

  return (
    <group ref={root}>
      <mesh ref={ground} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.47, 0]}>
        <ringGeometry args={[0.78, 0.9, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.48} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={dashTrail} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, -0.7]} scale={[0.52, 1.1, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.38 + stage * 0.04} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={dashSpark} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, -0.4, -0.18]} scale={[1.1, 1.1, 1]} visible={false}>
        <ringGeometry args={[0.32, 0.4, 4]} />
        <meshBasicMaterial color="#9ff7ff" transparent opacity={0.68} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={directionRune} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, -0.43, 0.86]} scale={[0.5, 0.92, 1]} visible={false}>
        <coneGeometry args={[0.72, 1.1, 3]} />
        <meshBasicMaterial color={color} transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={focusBeam} position={[0, 0.82, 0]} scale={[0.28, 1.55, 0.28]}>
        <cylinderGeometry args={[1, 0.42, 1, 8, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={leftFootRune} rotation={[-Math.PI / 2, 0, Math.PI / 4]} visible={false}>
        <ringGeometry args={[0.24, 0.32, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.34} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={rightFootRune} rotation={[-Math.PI / 2, 0, Math.PI / 4]} visible={false}>
        <ringGeometry args={[0.24, 0.32, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.34} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, -0.45, 0]} scale={[1.25, 1.25, 1]}>
        <ringGeometry args={[0.18, 0.23, 4]} />
        <meshBasicMaterial color="#fff1a6" transparent opacity={0.34 + stage * 0.06} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={castNeedle} position={[0, 1.12, 0.42]} rotation={[0.64, 0, Math.PI / 4]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={color} transparent opacity={0.58} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={castHalo} position={[0, 1.58, -0.38]} rotation={[0, 0, 0]} scale={[0.62 + stage * 0.08, 0.62 + stage * 0.08, 1]}>
        <ringGeometry args={[0.52, 0.58, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.42} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.58, -0.38]} rotation={[0, 0, Math.PI / 4]} scale={[0.42 + stage * 0.05, 0.42 + stage * 0.05, 1]}>
        <ringGeometry args={[0.4, 0.45, 4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={shoulderRune} position={[0, 1.36, 0]}>
        {Array.from({ length: Math.min(8, 2 + stage + Math.floor(focus / 2)) }, (_, index) => {
          const count = Math.min(8, 2 + stage + Math.floor(focus / 2));
          const angle = index * Math.PI * 2 / count;
          return (
            <mesh key={`player-shoulder-rune-${index}`} position={[Math.cos(angle) * 0.58, 0.08 + (index % 2) * 0.16, Math.sin(angle) * 0.58]} rotation={[0.55, angle, 0.35]} scale={[0.08, 0.22 + stage * 0.02, 0.08]}>
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color={index % 2 ? '#fff1a6' : color} transparent opacity={0.8} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
      <pointLight position={[0, 1.15, 0.2]} color={color} intensity={0.55 + stage * 0.2} distance={4.2} />
    </group>
  );
}

function EnemyGroundAuras({ enemiesRef, visualQuality = 'high' }) {
  const auraMesh = useRef();
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useFrame(() => {
    if (!auraMesh.current) return;
    const budget = getVisualBudget(visualQuality);
    const maxAuras = Math.min(MAX_ENEMIES, budget.enemyAuras);
    const time = performance.now() * 0.003;
    let count = 0;
    for (const enemy of enemiesRef.current) {
      if (count >= maxAuras && enemy.kind !== 'boss' && enemy.kind !== 'elite') continue;
      if (count >= MAX_ENEMIES) break;
      const pulse = 1 + Math.sin(time + enemy.wobble) * 0.07;
      scratch.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      scratch.matrix.compose(
        new THREE.Vector3(enemy.pos.x, enemy.pos.y + 0.035, enemy.pos.z),
        scratch.quat,
        scratch.scale.setScalar((
          enemy.kind === 'boss'
            ? 3.1 + (enemy.bossGuard > 0 ? 1.0 : 0)
            : enemy.kind === 'elite'
              ? 2.6 + ((enemy.shield ?? 0) > 0 ? 0.56 : 0)
              : enemy.kind === 'brute'
                ? enemy.radius * 2.15
                : enemy.kind === 'runner'
                  ? enemy.radius * 1.62
                  : enemy.radius * 1.88
        ) * pulse)
      );
      auraMesh.current.setMatrixAt(count, scratch.matrix);
      scratch.color.set(getEnemyAccentColor(enemy));
      auraMesh.current.setColorAt(count, scratch.color);
      count += 1;
    }
    auraMesh.current.count = count;
    auraMesh.current.instanceMatrix.needsUpdate = true;
    if (auraMesh.current.instanceColor) auraMesh.current.instanceColor.needsUpdate = true;
  });

  return (
      <instancedMesh ref={auraMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
      <ringGeometry args={[0.58, 0.68, 32]} />
      <meshBasicMaterial transparent opacity={0.42} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

function EnemyAccents({ enemiesRef, visualQuality = 'high' }) {
  const coreMesh = useRef();
  const flashMesh = useRef();
  const eyeMesh = useRef();
  const runnerTrailMesh = useRef();
  const runnerChevronMesh = useRef();
  const bruteMarkMesh = useRef();
  const brutePlateMesh = useRef();
  const golemShardMesh = useRef();
  const golemGroundMesh = useRef();
  const eliteCrownMesh = useRef();
  const eliteAuraMesh = useRef();
  const threatRingMesh = useRef();
  const chargeTellMesh = useRef();
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    color: new THREE.Color(),
    pos: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    yAxis: new THREE.Vector3(0, 1, 0)
  }), []);
  const showDecor = visualQuality !== 'low';

  useFrame(() => {
    const budget = getVisualBudget(visualQuality);
    const maxAccents = Math.min(MAX_ENEMIES, budget.enemyAccents);
    const time = performance.now() * 0.004;
    if (coreMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (count >= maxAccents && enemy.kind !== 'boss' && enemy.kind !== 'elite') continue;
        if (count >= MAX_ENEMIES) break;
        const bob = Math.sin(time + enemy.wobble) * 0.08;
        const height = enemy.kind === 'boss' ? 2.55 : enemy.kind === 'elite' ? 1.86 : enemy.kind === 'brute' ? 1.34 : enemy.kind === 'runner' ? 0.92 : 1.04;
        scratch.quat.identity();
        scratch.pos.set(enemy.pos.x, enemy.pos.y + height + bob, enemy.pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(enemy.kind === 'boss' ? 0.46 : enemy.kind === 'elite' ? 0.34 : enemy.kind === 'brute' ? 0.24 : enemy.kind === 'runner' ? 0.16 : 0.18)
        );
        coreMesh.current.setMatrixAt(count, scratch.matrix);
        scratch.color.set(getEnemyAccentColor(enemy));
        coreMesh.current.setColorAt(count, scratch.color);
        count += 1;
      }
      coreMesh.current.count = count;
      coreMesh.current.instanceMatrix.needsUpdate = true;
      if (coreMesh.current.instanceColor) coreMesh.current.instanceColor.needsUpdate = true;
    }

    if (eyeMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (count >= maxAccents * 2 && enemy.kind !== 'boss' && enemy.kind !== 'elite') continue;
        if (count >= MAX_ENEMIES * 2) break;
        scratch.forward.set(Math.sin(enemy.facingAngle), 0, Math.cos(enemy.facingAngle));
        scratch.right.set(scratch.forward.z, 0, -scratch.forward.x);
        const eyeHeight = enemy.kind === 'boss' ? 2.28 : enemy.kind === 'elite' ? 1.62 : enemy.kind === 'brute' ? 1.15 : enemy.kind === 'runner' ? 0.8 : 0.92;
        const spacing = enemy.kind === 'boss' ? 0.52 : enemy.kind === 'elite' ? 0.34 : enemy.kind === 'brute' ? 0.28 : 0.2;
        for (let side = -1; side <= 1; side += 2) {
          scratch.pos.copy(enemy.pos)
            .addScaledVector(scratch.forward, enemy.radius * 0.78)
            .addScaledVector(scratch.right, side * spacing);
          scratch.pos.y = enemy.pos.y + eyeHeight;
          scratch.quat.setFromAxisAngle(scratch.yAxis, enemy.facingAngle);
          scratch.matrix.compose(
            scratch.pos,
            scratch.quat,
            scratch.scale.set(enemy.kind === 'boss' ? 0.18 : 0.11, enemy.kind === 'boss' ? 0.26 : 0.16, 0.08)
          );
          eyeMesh.current.setMatrixAt(count, scratch.matrix);
          scratch.color.set(enemy.kind === 'runner' ? ART_TOKENS.runeCyan : enemy.kind === 'brute' ? ART_TOKENS.dangerRed : enemy.kind === 'golem' ? ART_TOKENS.runeMint : getEnemyAccentColor(enemy));
          eyeMesh.current.setColorAt(count, scratch.color);
          count += 1;
        }
      }
      eyeMesh.current.count = count;
      eyeMesh.current.instanceMatrix.needsUpdate = true;
      if (eyeMesh.current.instanceColor) eyeMesh.current.instanceColor.needsUpdate = true;
    }

    if (flashMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (enemy.flash <= 0 || enemy.kind === 'boss') continue;
        if (count >= MAX_ENEMIES) break;
        scratch.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, enemy.wobble));
        scratch.pos.set(enemy.pos.x, enemy.pos.y + 0.08, enemy.pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(enemy.hitRadius * 1.08)
        );
        flashMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      flashMesh.current.count = count;
      flashMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && runnerTrailMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (enemy.kind !== 'runner') continue;
        if (count >= maxAccents) break;
        scratch.forward.set(Math.sin(enemy.facingAngle), 0, Math.cos(enemy.facingAngle));
        scratch.pos.set(enemy.pos.x - scratch.forward.x * 0.62, enemy.pos.y + 0.16, enemy.pos.z - scratch.forward.z * 0.62);
        scratch.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -enemy.facingAngle));
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.set(0.28, 0.98 + Math.sin(enemy.wobble * 1.6) * 0.12, 1)
        );
        runnerTrailMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      runnerTrailMesh.current.count = count;
      runnerTrailMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && runnerChevronMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (enemy.kind !== 'runner') continue;
        if (count >= maxAccents) break;
        scratch.forward.set(Math.sin(enemy.facingAngle), 0, Math.cos(enemy.facingAngle));
        scratch.pos.set(enemy.pos.x + scratch.forward.x * 0.34, enemy.pos.y + 0.34, enemy.pos.z + scratch.forward.z * 0.34);
        scratch.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, -enemy.facingAngle + Math.PI));
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.set(0.34, 0.58 + Math.sin(enemy.wobble * 2.1) * 0.05, 0.28)
        );
        runnerChevronMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      runnerChevronMesh.current.count = count;
      runnerChevronMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && bruteMarkMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (enemy.kind !== 'brute') continue;
        if (count >= maxAccents) break;
        scratch.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, enemy.wobble * 0.35));
        scratch.pos.set(enemy.pos.x, enemy.pos.y + 1.48, enemy.pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(0.72 + Math.sin(enemy.wobble) * 0.05)
        );
        bruteMarkMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      bruteMarkMesh.current.count = count;
      bruteMarkMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && brutePlateMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (enemy.kind !== 'brute') continue;
        scratch.forward.set(Math.sin(enemy.facingAngle), 0, Math.cos(enemy.facingAngle));
        scratch.right.set(scratch.forward.z, 0, -scratch.forward.x);
        for (let side = -1; side <= 1; side += 2) {
          if (count >= maxAccents * 2) break;
          if (count >= MAX_ENEMIES * 2) break;
          scratch.pos.copy(enemy.pos)
            .addScaledVector(scratch.forward, -0.1)
            .addScaledVector(scratch.right, side * 0.46);
          scratch.pos.y = enemy.pos.y + 1.18 + Math.sin(enemy.wobble + side) * 0.035;
          scratch.quat.setFromAxisAngle(scratch.yAxis, enemy.facingAngle + side * 0.18);
          scratch.matrix.compose(
            scratch.pos,
            scratch.quat,
            scratch.scale.set(0.38, 0.2, 0.18)
          );
          brutePlateMesh.current.setMatrixAt(count, scratch.matrix);
          count += 1;
        }
      }
      brutePlateMesh.current.count = count;
      brutePlateMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && golemShardMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (enemy.kind !== 'golem') continue;
        if (count >= maxAccents) break;
        scratch.quat.setFromEuler(new THREE.Euler(0.45, enemy.facingAngle + Math.PI / 4, 0.2));
        scratch.pos.set(enemy.pos.x, enemy.pos.y + 1.18 + Math.sin(enemy.wobble) * 0.04, enemy.pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.set(0.18, 0.32, 0.18)
        );
        golemShardMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      golemShardMesh.current.count = count;
      golemShardMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && golemGroundMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (enemy.kind !== 'golem') continue;
        if (count >= maxAccents) break;
        scratch.pos.set(enemy.pos.x, enemy.pos.y + 0.045, enemy.pos.z);
        scratch.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, enemy.facingAngle + Math.PI / 4));
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(1.18 + Math.sin(enemy.wobble * 0.65) * 0.035)
        );
        golemGroundMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      golemGroundMesh.current.count = count;
      golemGroundMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && eliteCrownMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (enemy.kind !== 'elite') continue;
        for (let i = 0; i < 4; i += 1) {
          if (count >= MAX_ENEMIES * 4) break;
          const angle = enemy.wobble * 0.6 + i * Math.PI * 2 / 4;
          scratch.quat.setFromEuler(new THREE.Euler(0.35, -angle, 0.25));
          scratch.matrix.compose(
            new THREE.Vector3(
              enemy.pos.x + Math.cos(angle) * 0.75,
              enemy.pos.y + 2.1 + Math.sin(time + i) * 0.04,
              enemy.pos.z + Math.sin(angle) * 0.75
            ),
            scratch.quat,
            scratch.scale.set(0.12, 0.34, 0.12)
          );
          eliteCrownMesh.current.setMatrixAt(count, scratch.matrix);
          count += 1;
        }
      }
      eliteCrownMesh.current.count = count;
      eliteCrownMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && eliteAuraMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (enemy.kind !== 'elite') continue;
        if (count >= MAX_ENEMIES) break;
        scratch.pos.set(enemy.pos.x, enemy.pos.y + 0.07, enemy.pos.z);
        scratch.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, -enemy.wobble * 0.28));
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(1.42 + ((enemy.shield ?? 0) > 0 ? 0.32 : 0) + Math.sin(time + enemy.wobble) * 0.04)
        );
        eliteAuraMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      eliteAuraMesh.current.count = count;
      eliteAuraMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (threatRingMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        const isThreat = enemy.kind === 'boss' || enemy.kind === 'elite' || enemy.chargeTimer > 0;
        if (!isThreat) continue;
        if (count >= MAX_ENEMIES) break;
        const chargePulse = enemy.chargeTimer > 0 ? 0.34 : 0;
        const shieldPulse = (enemy.shield ?? 0) > 0 ? 0.16 : 0;
        scratch.pos.set(enemy.pos.x, enemy.pos.y + 0.09, enemy.pos.z);
        scratch.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, time * 0.42 + enemy.wobble * 0.16));
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(
            enemy.kind === 'boss'
              ? 3.75 + chargePulse
              : enemy.kind === 'elite'
                ? 2.18 + shieldPulse + chargePulse
                : enemy.hitRadius * 1.45
          )
        );
        threatRingMesh.current.setMatrixAt(count, scratch.matrix);
        scratch.color.set(getEnemyAccentColor(enemy));
        threatRingMesh.current.setColorAt(count, scratch.color);
        count += 1;
      }
      threatRingMesh.current.count = count;
      threatRingMesh.current.instanceMatrix.needsUpdate = true;
      if (threatRingMesh.current.instanceColor) threatRingMesh.current.instanceColor.needsUpdate = true;
    }

    if (chargeTellMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        const chargeTimer = enemy.chargeTimer ?? 0;
        if (chargeTimer <= 0) continue;
        if (count >= MAX_ENEMIES) break;
        scratch.forward.set(Math.sin(enemy.facingAngle), 0, Math.cos(enemy.facingAngle));
        scratch.pos.copy(enemy.pos).addScaledVector(scratch.forward, enemy.hitRadius * 1.45);
        scratch.pos.y = enemy.pos.y + 0.18;
        scratch.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, -enemy.facingAngle + Math.PI));
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.set(0.76, 1.46 + chargeTimer * 0.45, 1)
        );
        chargeTellMesh.current.setMatrixAt(count, scratch.matrix);
        scratch.color.set(getEnemyAccentColor(enemy));
        chargeTellMesh.current.setColorAt(count, scratch.color);
        count += 1;
      }
      chargeTellMesh.current.count = count;
      chargeTellMesh.current.instanceMatrix.needsUpdate = true;
      if (chargeTellMesh.current.instanceColor) chargeTellMesh.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={threatRingMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <ringGeometry args={[0.86, 1, 4]} />
        <meshBasicMaterial transparent opacity={0.72} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={chargeTellMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 3]} />
        <meshBasicMaterial transparent opacity={0.52} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={coreMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial transparent opacity={0.82} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={flashMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <ringGeometry args={[0.62, 0.72, 28]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.58} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={eyeMesh} args={[null, null, MAX_ENEMIES * 2]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial transparent opacity={0.92} toneMapped={false} />
      </instancedMesh>
      {showDecor && (
        <>
          <instancedMesh ref={runnerTrailMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#70d6ff" transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={runnerChevronMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <coneGeometry args={[1, 1, 3]} />
            <meshBasicMaterial color="#9ff7ff" transparent opacity={0.76} depthWrite={false} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={bruteMarkMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <torusGeometry args={[0.68, 0.045, 8, 28]} />
            <meshBasicMaterial color="#ff8b72" transparent opacity={0.72} depthWrite={false} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={brutePlateMesh} args={[null, null, MAX_ENEMIES * 2]} frustumCulled={false}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ffc0a4" transparent opacity={0.76} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={golemShardMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#70f0b4" transparent opacity={0.86} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={golemGroundMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <ringGeometry args={[0.48, 0.58, 4]} />
            <meshBasicMaterial color="#93f5b8" transparent opacity={0.44} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={eliteAuraMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <ringGeometry args={[0.58, 0.76, 4]} />
            <meshBasicMaterial color={ART_TOKENS.elderViolet} transparent opacity={0.48} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={eliteCrownMesh} args={[null, null, MAX_ENEMIES * 4]} frustumCulled={false}>
            <coneGeometry args={[1, 1, 4]} />
            <meshBasicMaterial color={ART_TOKENS.elderViolet} transparent opacity={0.72} toneMapped={false} />
          </instancedMesh>
        </>
      )}
    </>
  );
}

function GemBeacons({ gemsRef, visualQuality = 'high' }) {
  const beamMesh = useRef();
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3()
  }), []);

  useFrame(() => {
    if (!beamMesh.current) return;
    const budget = getVisualBudget(visualQuality);
    const gemCount = Math.min(gemsRef.current.length, budget.gemBeams);
    const stride = Math.max(1, Math.ceil(gemsRef.current.length / Math.max(1, gemCount)));
    for (let count = 0; count < gemCount; count += 1) {
      const gem = gemsRef.current[count * stride];
      if (!gem) continue;
      const pulse = 0.82 + Math.sin(gem.pulse) * 0.18;
      scratch.matrix.compose(
        new THREE.Vector3(gem.pos.x, gem.pos.y + 0.92, gem.pos.z),
        scratch.quat,
        scratch.scale.set(0.055 * pulse, 1.2 + gem.value * 0.025, 0.055 * pulse)
      );
      beamMesh.current.setMatrixAt(count, scratch.matrix);
    }
    beamMesh.current.count = gemCount;
    beamMesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={beamMesh} args={[null, null, MAX_XP_GEMS]} frustumCulled={false}>
      <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
      <meshBasicMaterial color="#9ff7ff" transparent opacity={0.28} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

function FieldPickupItems({ itemsRef }) {
  const magnetCore = useRef();
  const magnetRing = useRef();
  const purgeCore = useRef();
  const purgeRing = useRef();
  const healCore = useRef();
  const healRing = useRef();
  const overloadCore = useRef();
  const overloadRing = useRef();
  const cacheCore = useRef();
  const cacheRing = useRef();
  const beamMesh = useRef();
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useFrame(() => {
    const spin = performance.now() * 0.004;
    let magnetCount = 0;
    let purgeCount = 0;
    let healCount = 0;
    let overloadCount = 0;
    let cacheCount = 0;
    let beamCount = 0;

    for (const item of itemsRef.current) {
      const pulse = 1 + Math.sin(item.pulse) * 0.08;
      const lift = Math.sin(item.pulse * 1.2) * 0.12;
      const meta = FIELD_ITEM_META[item.type] ?? FIELD_ITEM_META.magnet;
      let core = magnetCore.current;
      let ring = magnetRing.current;
      let index = magnetCount;
      let coreScale = 0.56;
      let ringScale = 1.22;

      if (item.type === 'purge') {
        core = purgeCore.current;
        ring = purgeRing.current;
        index = purgeCount;
        coreScale = 0.68;
        ringScale = 1.48;
      } else if (item.type === 'heal') {
        core = healCore.current;
        ring = healRing.current;
        index = healCount;
        coreScale = 0.62;
        ringScale = 1.28;
      } else if (item.type === 'overload') {
        core = overloadCore.current;
        ring = overloadRing.current;
        index = overloadCount;
        coreScale = 0.7;
        ringScale = 1.56;
      } else if (item.type === 'cache') {
        core = cacheCore.current;
        ring = cacheRing.current;
        index = cacheCount;
        coreScale = 0.72;
        ringScale = 1.5;
      }

      if (core) {
        scratch.quat.setFromEuler(new THREE.Euler(0.35, spin + item.pulse * 0.3, 0.18));
        scratch.matrix.compose(
          new THREE.Vector3(item.pos.x, item.pos.y + 0.55 + lift, item.pos.z),
          scratch.quat,
          scratch.scale.setScalar(coreScale * pulse)
        );
        core.setMatrixAt(index, scratch.matrix);
      }

      if (ring) {
        scratch.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, spin * (item.type === 'magnet' ? 1 : -1)));
        scratch.matrix.compose(
          new THREE.Vector3(item.pos.x, item.pos.y + 0.12, item.pos.z),
          scratch.quat,
          scratch.scale.setScalar(ringScale * pulse)
        );
        ring.setMatrixAt(index, scratch.matrix);
      }

      if (beamMesh.current) {
        scratch.quat.identity();
        scratch.matrix.compose(
          new THREE.Vector3(item.pos.x, item.pos.y + 1.1, item.pos.z),
          scratch.quat,
          scratch.scale.set(0.07 * pulse, 1.9, 0.07 * pulse)
        );
        beamMesh.current.setMatrixAt(beamCount, scratch.matrix);
        scratch.color.set(meta.color);
        beamMesh.current.setColorAt(beamCount, scratch.color);
        beamCount += 1;
      }

      if (item.type === 'purge') purgeCount += 1;
      else if (item.type === 'heal') healCount += 1;
      else if (item.type === 'overload') overloadCount += 1;
      else if (item.type === 'cache') cacheCount += 1;
      else magnetCount += 1;
    }

    if (magnetCore.current) {
      magnetCore.current.count = magnetCount;
      magnetCore.current.instanceMatrix.needsUpdate = true;
    }
    if (magnetRing.current) {
      magnetRing.current.count = magnetCount;
      magnetRing.current.instanceMatrix.needsUpdate = true;
    }
    if (purgeCore.current) {
      purgeCore.current.count = purgeCount;
      purgeCore.current.instanceMatrix.needsUpdate = true;
    }
    if (purgeRing.current) {
      purgeRing.current.count = purgeCount;
      purgeRing.current.instanceMatrix.needsUpdate = true;
    }
    if (healCore.current) {
      healCore.current.count = healCount;
      healCore.current.instanceMatrix.needsUpdate = true;
    }
    if (healRing.current) {
      healRing.current.count = healCount;
      healRing.current.instanceMatrix.needsUpdate = true;
    }
    if (overloadCore.current) {
      overloadCore.current.count = overloadCount;
      overloadCore.current.instanceMatrix.needsUpdate = true;
    }
    if (overloadRing.current) {
      overloadRing.current.count = overloadCount;
      overloadRing.current.instanceMatrix.needsUpdate = true;
    }
    if (cacheCore.current) {
      cacheCore.current.count = cacheCount;
      cacheCore.current.instanceMatrix.needsUpdate = true;
    }
    if (cacheRing.current) {
      cacheRing.current.count = cacheCount;
      cacheRing.current.instanceMatrix.needsUpdate = true;
    }
    if (beamMesh.current) {
      beamMesh.current.count = beamCount;
      beamMesh.current.instanceMatrix.needsUpdate = true;
      if (beamMesh.current.instanceColor) beamMesh.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={magnetCore} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false} castShadow>
        <torusKnotGeometry args={[0.5, 0.13, 64, 8]} />
        <meshStandardMaterial color="#8ff5ff" emissive="#2fdcff" emissiveIntensity={2.7} roughness={0.18} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={magnetRing} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <torusGeometry args={[1, 0.035, 8, 52]} />
        <meshBasicMaterial color="#70d6ff" transparent opacity={0.62} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={purgeCore} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false} castShadow>
        <icosahedronGeometry args={[0.78, 0]} />
        <meshStandardMaterial color="#ffdf6e" emissive="#ffb84c" emissiveIntensity={2.8} roughness={0.26} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={purgeRing} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <ringGeometry args={[0.86, 1.08, 5]} />
        <meshBasicMaterial color="#ffdf6e" transparent opacity={0.58} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={healCore} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false} castShadow>
        <dodecahedronGeometry args={[0.74, 0]} />
        <meshStandardMaterial color="#79f29a" emissive="#37f27d" emissiveIntensity={2.55} roughness={0.22} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={healRing} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <ringGeometry args={[0.42, 0.56, 4]} />
        <meshBasicMaterial color="#79f29a" transparent opacity={0.64} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={overloadCore} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false} castShadow>
        <octahedronGeometry args={[0.84, 0]} />
        <meshStandardMaterial color="#f5c7ff" emissive="#b96dff" emissiveIntensity={3.2} roughness={0.18} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={overloadRing} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <torusGeometry args={[0.92, 0.04, 6, 6]} />
        <meshBasicMaterial color="#f5c7ff" transparent opacity={0.72} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={cacheCore} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false} castShadow>
        <boxGeometry args={[0.92, 0.92, 0.92]} />
        <meshStandardMaterial color="#fff1a6" emissive="#ffdf6e" emissiveIntensity={2.9} roughness={0.2} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={cacheRing} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <torusGeometry args={[0.88, 0.045, 6, 4]} />
        <meshBasicMaterial color="#fff1a6" transparent opacity={0.76} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={beamMesh} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
        <meshBasicMaterial vertexColors transparent opacity={0.38} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

function RuneShrineSites({ shrinesRef }) {
  const coreMesh = useRef();
  const ringMesh = useRef();
  const chargeMesh = useRef();
  const usedMesh = useRef();
  const beamMesh = useRef();
  const labels = useMemo(() => createInitialShrines(), []);
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useFrame(() => {
    const spin = performance.now() * 0.0018;
    let activeCount = 0;
    let usedCount = 0;
    let beamCount = 0;
    let chargeCount = 0;

    for (const shrine of shrinesRef.current) {
      const progress = shrine.activated ? 1 : THREE.MathUtils.clamp(shrine.channel / SHRINE_CHANNEL_TIME, 0, 1);
      const pulse = 1 + Math.sin(shrine.pulse) * 0.06;
      const pos = shrine.pos;

      if (shrine.activated) {
        if (usedMesh.current) {
          scratch.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, spin));
          scratch.matrix.compose(
            new THREE.Vector3(pos.x, pos.y + 0.1, pos.z),
            scratch.quat,
            scratch.scale.setScalar(2.4 * pulse)
          );
          usedMesh.current.setMatrixAt(usedCount, scratch.matrix);
          scratch.color.set(shrine.color);
          usedMesh.current.setColorAt(usedCount, scratch.color);
          usedCount += 1;
        }
        continue;
      }

      if (coreMesh.current) {
        scratch.quat.setFromEuler(new THREE.Euler(0.38, spin * 1.8, 0.2));
        scratch.matrix.compose(
          new THREE.Vector3(pos.x, pos.y + 0.82 + Math.sin(shrine.pulse) * 0.08, pos.z),
          scratch.quat,
          scratch.scale.setScalar(0.62 + progress * 0.26)
        );
        coreMesh.current.setMatrixAt(activeCount, scratch.matrix);
        scratch.color.set(shrine.color);
        coreMesh.current.setColorAt(activeCount, scratch.color);
      }

      if (ringMesh.current) {
        scratch.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, spin));
        scratch.matrix.compose(
          new THREE.Vector3(pos.x, pos.y + 0.08, pos.z),
          scratch.quat,
          scratch.scale.setScalar(2.25 * pulse)
        );
        ringMesh.current.setMatrixAt(activeCount, scratch.matrix);
        scratch.color.set(shrine.color);
        ringMesh.current.setColorAt(activeCount, scratch.color);
      }

      if (beamMesh.current) {
        scratch.quat.identity();
        scratch.matrix.compose(
          new THREE.Vector3(pos.x, pos.y + 1.42, pos.z),
          scratch.quat,
          scratch.scale.set(0.1 + progress * 0.06, 2.5 + progress * 1.2, 0.1 + progress * 0.06)
        );
        beamMesh.current.setMatrixAt(beamCount, scratch.matrix);
        scratch.color.set(shrine.color);
        beamMesh.current.setColorAt(beamCount, scratch.color);
        beamCount += 1;
      }

      if (chargeMesh.current && progress > 0) {
        scratch.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, -spin * 2.2));
        scratch.matrix.compose(
          new THREE.Vector3(pos.x, pos.y + 0.13, pos.z),
          scratch.quat,
          scratch.scale.setScalar(1.0 + progress * 2.2)
        );
        chargeMesh.current.setMatrixAt(chargeCount, scratch.matrix);
        scratch.color.set(shrine.color);
        chargeMesh.current.setColorAt(chargeCount, scratch.color);
        chargeCount += 1;
      }

      activeCount += 1;
    }

    if (coreMesh.current) {
      coreMesh.current.count = activeCount;
      coreMesh.current.instanceMatrix.needsUpdate = true;
      if (coreMesh.current.instanceColor) coreMesh.current.instanceColor.needsUpdate = true;
    }
    if (ringMesh.current) {
      ringMesh.current.count = activeCount;
      ringMesh.current.instanceMatrix.needsUpdate = true;
      if (ringMesh.current.instanceColor) ringMesh.current.instanceColor.needsUpdate = true;
    }
    if (beamMesh.current) {
      beamMesh.current.count = beamCount;
      beamMesh.current.instanceMatrix.needsUpdate = true;
      if (beamMesh.current.instanceColor) beamMesh.current.instanceColor.needsUpdate = true;
    }
    if (chargeMesh.current) {
      chargeMesh.current.count = chargeCount;
      chargeMesh.current.instanceMatrix.needsUpdate = true;
      if (chargeMesh.current.instanceColor) chargeMesh.current.instanceColor.needsUpdate = true;
    }
    if (usedMesh.current) {
      usedMesh.current.count = usedCount;
      usedMesh.current.instanceMatrix.needsUpdate = true;
      if (usedMesh.current.instanceColor) usedMesh.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={beamMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 10, 1, true]} />
        <meshBasicMaterial vertexColors transparent opacity={0.24} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={ringMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false}>
        <torusGeometry args={[1, 0.025, 8, 64]} />
        <meshBasicMaterial vertexColors transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={chargeMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false}>
        <ringGeometry args={[0.8, 1, 64]} />
        <meshBasicMaterial vertexColors transparent opacity={0.44} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={usedMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false}>
        <ringGeometry args={[0.88, 1, 6]} />
        <meshBasicMaterial vertexColors transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={coreMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false} castShadow>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial vertexColors emissive="#ffffff" emissiveIntensity={0.42} roughness={0.18} toneMapped={false} />
      </instancedMesh>
      {labels.map(shrine => (
        <Text
          key={`shrine-label-${shrine.id}`}
          position={[shrine.pos.x, shrine.pos.y + 2.35, shrine.pos.z]}
          rotation={[-0.86, 0, 0]}
          fontSize={0.52}
          anchorX="center"
          anchorY="middle"
          color={shrine.color}
          fillOpacity={0.72}
          outlineWidth={0.025}
          outlineColor="#07100f"
        >
          {shrine.label}
        </Text>
      ))}
    </group>
  );
}

function WeaponStrikeEffects({ effectsRef }) {
  return (
    <>
      {effectsRef.current.map((effect, index) => {
        if (effect.type === 'beam') {
          return <BeamEffect key={`beam-${index}-${effect.maxLife}`} effect={effect} />;
        }
        return <RingEffect key={`ring-${index}-${effect.maxLife}`} effect={effect} />;
      })}
    </>
  );
}

function BeamEffect({ effect }) {
  const progress = 1 - effect.life / effect.maxLife;
  const from = effect.from;
  const to = effect.to;
  const direction = to.clone().sub(from);
  const length = Math.max(0.01, direction.length());
  const midpoint = from.clone().add(to).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );
  const opacity = Math.max(0, 0.92 - progress * 0.92);
  const pulse = 1 + Math.sin(progress * Math.PI) * 0.42;

  return (
    <group position={midpoint} quaternion={quaternion}>
      <mesh scale={[effect.width, length, effect.width]}>
        <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
        <meshBasicMaterial color={effect.color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh scale={[effect.width * 2.4, length * 0.96, effect.width * 2.4]}>
        <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={opacity * 0.2} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0]} scale={[effect.width * 3.2 * pulse, effect.width * 3.2 * pulse, effect.width * 3.2 * pulse]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={opacity * 0.42} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function RingEffect({ effect }) {
  const progress = 1 - effect.life / effect.maxLife;
  const radius = effect.radius * (0.26 + progress * 0.92);
  const opacity = Math.max(0, 0.62 - progress * 0.62);

  return (
    <group position={[effect.pos.x, effect.pos.y + 0.05, effect.pos.z]}>
      <mesh rotation={[-Math.PI / 2, 0, progress * Math.PI]} scale={[radius, radius, 1]}>
        <ringGeometry args={[0.84, 1, 72]} />
        <meshBasicMaterial color={effect.color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, -progress * Math.PI * 0.78]} scale={[radius * 0.9, radius * 0.9, 1]}>
        <ringGeometry args={[0.62, 0.68, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={opacity * 0.24} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, -progress * Math.PI * 0.5]} scale={[radius * 0.68, radius * 0.68, 1]}>
        <ringGeometry args={[0.38, 0.46, 6]} />
        <meshBasicMaterial color="#fff1a6" transparent opacity={opacity * 0.44} depthWrite={false} toneMapped={false} />
      </mesh>
      {effect.type === 'ring' && (
        <mesh position={[0, 0.18 + progress * 0.28, 0]} scale={[0.24 + progress * 0.1, 0.24 + progress * 0.1, 0.24 + progress * 0.1]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={effect.color} transparent opacity={opacity * 0.58} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function ProjectileAuraRings({ projectilesRef, game, visualQuality = 'high' }) {
  const orbRing = useRef();
  const orbHalo = useRef();
  const orbTrail = useRef();
  const orbCrown = useRef();
  const stormRing = useRef();
  const stormDisk = useRef();
  const stormSpoke = useRef();
  const stormCore = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3()
  }), []);
  const showDetail = visualQuality !== 'low';

  useFrame(() => {
    const budget = getVisualBudget(visualQuality);
    const auraLimit = Math.min(MAX_PROJECTILES, budget.projectileAura);
    const detailLimit = Math.min(MAX_PROJECTILES, budget.projectileDetail);
    const tier = getWeaponTier(game.stats, getWeaponStage(game));
    const stage = getWeaponStage(game);
    const evolved = stage > 0 || tier > 1.08 || game.stats.pierce > 0 || game.stats.cooldown < 0.96;
    if (orbRing.current) {
      let count = 0;
      if (evolved) {
        for (const projectile of projectilesRef.current) {
          if (projectile.type !== 'orb') continue;
          if (count >= auraLimit) break;
          local.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, projectile.angle + performance.now() * (0.006 + stage * 0.001)));
          local.matrix.compose(projectile.pos, local.quat, local.scale.setScalar((0.84 + stage * 0.16) * projectile.visualScale));
          orbRing.current.setMatrixAt(count, local.matrix);
          count += 1;
        }
      }
      orbRing.current.count = count;
      orbRing.current.instanceMatrix.needsUpdate = true;
    }

    if (orbHalo.current) {
      let count = 0;
      if (stage > 1) {
        for (const projectile of projectilesRef.current) {
          if (projectile.type !== 'orb') continue;
          if (count >= detailLimit) break;
          local.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, -projectile.angle + performance.now() * 0.004));
          local.matrix.compose(projectile.pos, local.quat, local.scale.setScalar((1.08 + stage * 0.2) * projectile.visualScale));
          orbHalo.current.setMatrixAt(count, local.matrix);
          count += 1;
        }
      }
      orbHalo.current.count = count;
      orbHalo.current.instanceMatrix.needsUpdate = true;
    }

    if (orbTrail.current) {
      let count = 0;
      for (const projectile of projectilesRef.current) {
        if (projectile.type !== 'orb') continue;
        if (count >= auraLimit) break;
        const length = projectile.trailLength ?? 1;
        local.pos.set(
          projectile.pos.x - Math.sin(projectile.angle) * length * 0.42,
          projectile.pos.y - 0.02,
          projectile.pos.z - Math.cos(projectile.angle) * length * 0.42
        );
        local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -projectile.angle));
        local.matrix.compose(local.pos, local.quat, local.scale.set(0.18 + stage * 0.06, length, 1));
        orbTrail.current.setMatrixAt(count, local.matrix);
        count += 1;
      }
      orbTrail.current.count = count;
      orbTrail.current.instanceMatrix.needsUpdate = true;
    }

    if (orbCrown.current) {
      let count = 0;
      if (stage >= 3) {
        for (const projectile of projectilesRef.current) {
          if (projectile.type !== 'orb') continue;
          if (count >= detailLimit * 3) break;
          for (let i = 0; i < 3; i += 1) {
            if (count >= detailLimit * 3) break;
            const spin = projectile.angle + performance.now() * 0.008 + i * Math.PI * 2 / 3;
            local.pos.set(
              projectile.pos.x + Math.cos(spin) * 0.42 * projectile.visualScale,
              projectile.pos.y + Math.sin(performance.now() * 0.006 + i) * 0.08,
              projectile.pos.z + Math.sin(spin) * 0.42 * projectile.visualScale
            );
            local.quat.setFromEuler(new THREE.Euler(0.6, -spin, 0.2));
            local.matrix.compose(local.pos, local.quat, local.scale.setScalar(0.12 * projectile.visualScale));
            orbCrown.current.setMatrixAt(count, local.matrix);
            count += 1;
          }
        }
      }
      orbCrown.current.count = count;
      orbCrown.current.instanceMatrix.needsUpdate = true;
    }

    if (stormRing.current) {
      let count = 0;
      for (const projectile of projectilesRef.current) {
        if (projectile.type !== 'storm') continue;
        if (count >= auraLimit) break;
        local.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, performance.now() * 0.004 + projectile.angle));
        local.matrix.compose(projectile.pos, local.quat, local.scale.setScalar((1.2 + stage * 0.12) * projectile.visualScale * tier));
        stormRing.current.setMatrixAt(count, local.matrix);
        count += 1;
      }
      stormRing.current.count = count;
      stormRing.current.instanceMatrix.needsUpdate = true;
    }

    if (stormDisk.current) {
      let count = 0;
      for (const projectile of projectilesRef.current) {
        if (projectile.type !== 'storm') continue;
        if (count >= auraLimit) break;
        local.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, -performance.now() * 0.003 + projectile.angle));
        local.matrix.compose(projectile.pos, local.quat, local.scale.setScalar(projectile.burstRadius ?? 1.8));
        stormDisk.current.setMatrixAt(count, local.matrix);
        count += 1;
      }
      stormDisk.current.count = count;
      stormDisk.current.instanceMatrix.needsUpdate = true;
    }

    if (showDetail && stormSpoke.current) {
      let count = 0;
      for (const projectile of projectilesRef.current) {
        if (projectile.type !== 'storm') continue;
        if (count >= detailLimit * 4) break;
        const radius = projectile.burstRadius ?? 1.8;
        for (let i = 0; i < 4; i += 1) {
          if (count >= detailLimit * 4) break;
          if (count >= MAX_PROJECTILES * 4) break;
          const spokeAngle = projectile.angle + performance.now() * 0.006 + i * Math.PI / 2;
          local.pos.copy(projectile.pos);
          local.pos.y += 0.04;
          local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -spokeAngle));
          local.matrix.compose(local.pos, local.quat, local.scale.set(0.12 + stage * 0.015, radius * 0.92, 1));
          stormSpoke.current.setMatrixAt(count, local.matrix);
          count += 1;
        }
      }
      stormSpoke.current.count = count;
      stormSpoke.current.instanceMatrix.needsUpdate = true;
    }

    if (showDetail && stormCore.current) {
      let count = 0;
      for (const projectile of projectilesRef.current) {
        if (projectile.type !== 'storm') continue;
        if (count >= detailLimit) break;
        local.pos.copy(projectile.pos);
        local.pos.y += 0.1 + Math.sin(performance.now() * 0.009 + projectile.angle) * 0.03;
        local.quat.setFromEuler(new THREE.Euler(0.52, -performance.now() * 0.008 + projectile.angle, 0.18));
        local.matrix.compose(local.pos, local.quat, local.scale.setScalar((0.22 + stage * 0.045) * projectile.visualScale));
        stormCore.current.setMatrixAt(count, local.matrix);
        count += 1;
      }
      stormCore.current.count = count;
      stormCore.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={orbTrail} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={getOrbColor(game.stats, getWeaponStage(game))} transparent opacity={0.22 + getWeaponStage(game) * 0.035} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={orbRing} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <torusGeometry args={[0.45, 0.018, 8, 32]} />
        <meshBasicMaterial color={getOrbColor(game.stats, getWeaponStage(game))} transparent opacity={0.74} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={orbHalo} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <torusGeometry args={[0.68, 0.012, 8, 42]} />
        <meshBasicMaterial color="#fff1a6" transparent opacity={0.3} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={orbCrown} args={[null, null, MAX_PROJECTILES * 3]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#fff1a6" transparent opacity={0.66} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={stormDisk} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <circleGeometry args={[1, 56]} />
        <meshBasicMaterial color={getStormColor(game.stats, getWeaponStage(game))} transparent opacity={0.1 + getWeaponStage(game) * 0.02} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={stormRing} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <torusGeometry args={[0.92, 0.022, 8, 40]} />
        <meshBasicMaterial color={getStormColor(game.stats, getWeaponStage(game))} transparent opacity={0.48} toneMapped={false} />
      </instancedMesh>
      {showDetail && (
        <>
          <instancedMesh ref={stormSpoke} args={[null, null, MAX_PROJECTILES * 4]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={stormCore} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={getStormColor(game.stats, getWeaponStage(game))} transparent opacity={0.64} toneMapped={false} />
          </instancedMesh>
        </>
      )}
    </>
  );
}

function BossNameplates({ enemiesRef }) {
  const bosses = enemiesRef.current.filter(enemy => enemy.kind === 'boss' || enemy.kind === 'elite');
  return (
    <>
      {bosses.map((boss, index) => {
        const pct = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
        const isElite = boss.kind === 'elite';
        const color = getEnemyAccentColor(boss);
        return (
          <group key={`boss-plate-${index}`} position={[boss.pos.x, boss.pos.y + (isElite ? 2.7 : 3.2), boss.pos.z]} rotation={[-0.86, 0, 0]}>
            <Text
              position={[0, 0.28, 0]}
              fontSize={isElite ? 0.43 : 0.5}
              anchorX="center"
              anchorY="middle"
              color={color}
              outlineWidth={0.02}
              outlineColor="#07100f"
            >
              {getEnemyDisplayName(boss)}
            </Text>
            <mesh position={[0, -0.1, 0]} scale={[2.3, 0.12, 1]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color="#07100f" transparent opacity={0.72} />
            </mesh>
            <mesh position={[-1.15 + pct * 1.15, -0.1, 0.01]} scale={[2.24 * pct, 0.075, 1]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color={pct > 0.45 ? color : '#ff7a5e'} transparent opacity={0.92} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function BossPresence({ enemiesRef }) {
  const ringMesh = useRef();
  const crownMesh = useRef();
  const beamMesh = useRef();
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3()
  }), []);

  useFrame(() => {
    const bosses = enemiesRef.current.filter(enemy => enemy.kind === 'boss');
    const spin = performance.now() * 0.0018;
    if (ringMesh.current) {
      let count = 0;
      for (const boss of bosses) {
        for (let layer = 0; layer < 2; layer += 1) {
          scratch.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, spin * (layer ? -1.5 : 1)));
          scratch.matrix.compose(
            new THREE.Vector3(boss.pos.x, boss.pos.y + 0.08 + layer * 0.08, boss.pos.z),
            scratch.quat,
            scratch.scale.setScalar(2.6 + layer * 0.72 + Math.sin(boss.wobble + layer) * 0.08)
          );
          ringMesh.current.setMatrixAt(count, scratch.matrix);
          count += 1;
        }
      }
      ringMesh.current.count = count;
      ringMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (crownMesh.current) {
      let count = 0;
      for (const boss of bosses) {
        for (let i = 0; i < 7; i += 1) {
          const angle = spin * 1.6 + i * Math.PI * 2 / 7;
          scratch.quat.setFromEuler(new THREE.Euler(0.28, -angle, 0.1));
          scratch.matrix.compose(
            new THREE.Vector3(
              boss.pos.x + Math.cos(angle) * 1.15,
              boss.pos.y + 2.55 + Math.sin(boss.wobble + i) * 0.08,
              boss.pos.z + Math.sin(angle) * 1.15
            ),
            scratch.quat,
            scratch.scale.set(0.18, 0.46, 0.18)
          );
          crownMesh.current.setMatrixAt(count, scratch.matrix);
          count += 1;
        }
      }
      crownMesh.current.count = count;
      crownMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (beamMesh.current) {
      let count = 0;
      for (const boss of bosses) {
        scratch.quat.identity();
        scratch.matrix.compose(
          new THREE.Vector3(boss.pos.x, boss.pos.y + 1.65, boss.pos.z),
          scratch.quat,
          scratch.scale.set(0.22, 3.4 + Math.sin(boss.wobble) * 0.28, 0.22)
        );
        beamMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      beamMesh.current.count = count;
      beamMesh.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={ringMesh} args={[null, null, 8]} frustumCulled={false}>
        <torusGeometry args={[0.78, 0.018, 8, 64]} />
        <meshBasicMaterial color="#ffdf6e" transparent opacity={0.58} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={crownMesh} args={[null, null, 28]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 4]} />
        <meshBasicMaterial color="#ffdf6e" transparent opacity={0.84} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={beamMesh} args={[null, null, 4]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 16, 1, true]} />
        <meshBasicMaterial color="#ffdf6e" transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

function PlayerAvatar({ rootRef, game, player }) {
  const runeGroup = useRef();
  const crestGroup = useRef();
  const cloakMesh = useRef();
  const leftStrideMesh = useRef();
  const rightStrideMesh = useRef();
  const staffTrailMesh = useRef();
  const shoulderSash = useRef();
  const stage = getWeaponStage(game);
  const dominantBuild = getDominantBuild(game);
  const focus = dominantBuild?.focus ?? 0;
  const runeCount = Math.min(10, 3 + stage + game.stats.pierce + Math.floor(focus / 2));
  const runeColor = dominantBuild?.color ?? getOrbColor(game.stats, stage);

  useFrame(() => {
    const now = performance.now();
    const speed = player?.current?.vel?.length?.() ?? 0;
    const moveAmount = THREE.MathUtils.clamp(speed / (PLAYER_SPEED * 1.16), 0, 1);
    const dashPower = player?.current?.dashTimer > 0 ? 1 : 0;
    const stride = now * 0.013;
    if (runeGroup.current) runeGroup.current.rotation.y += 0.018 + game.stats.cooldown * 0.004;
    if (crestGroup.current) {
      crestGroup.current.rotation.y -= 0.012 + stage * 0.002;
      crestGroup.current.position.y = 1.55 + Math.sin(now * 0.004) * 0.05 + moveAmount * 0.035;
    }
    if (cloakMesh.current) {
      cloakMesh.current.visible = moveAmount > 0.04 || dashPower > 0;
      cloakMesh.current.position.set(0, 0.75 + Math.sin(stride * 0.5) * 0.035, -0.52 - moveAmount * 0.18 - dashPower * 0.18);
      cloakMesh.current.rotation.set(0.25 + moveAmount * 0.16, Math.sin(stride * 0.52) * 0.08, Math.sin(stride) * 0.06 * moveAmount);
      cloakMesh.current.scale.set(0.58 + dashPower * 0.18, 1.0 + moveAmount * 0.34 + dashPower * 0.42, 1);
    }
    if (leftStrideMesh.current && rightStrideMesh.current) {
      const leftStep = Math.max(0, Math.sin(stride));
      const rightStep = Math.max(0, Math.sin(stride + Math.PI));
      leftStrideMesh.current.visible = moveAmount > 0.08;
      rightStrideMesh.current.visible = moveAmount > 0.08;
      leftStrideMesh.current.position.set(-0.24, 0.18 + leftStep * 0.12, 0.12 + leftStep * 0.2);
      rightStrideMesh.current.position.set(0.24, 0.18 + rightStep * 0.12, 0.12 + rightStep * 0.2);
      leftStrideMesh.current.rotation.set(0.72, -0.24 + leftStep * 0.18, -0.28);
      rightStrideMesh.current.rotation.set(0.72, 0.24 - rightStep * 0.18, 0.28);
      leftStrideMesh.current.scale.set(0.14 + leftStep * 0.05, 0.5 + leftStep * 0.2 + dashPower * 0.12, 0.1);
      rightStrideMesh.current.scale.set(0.14 + rightStep * 0.05, 0.5 + rightStep * 0.2 + dashPower * 0.12, 0.1);
    }
    if (staffTrailMesh.current) {
      staffTrailMesh.current.visible = moveAmount > 0.06 || dashPower > 0;
      staffTrailMesh.current.position.set(0.38 + Math.sin(stride * 0.5) * 0.04, 1.02 + Math.sin(stride) * 0.045, 0.08);
      staffTrailMesh.current.rotation.set(0.35, -0.18, -0.52 + Math.sin(stride * 0.72) * 0.12);
      staffTrailMesh.current.scale.set(0.11 + stage * 0.01, 0.62 + moveAmount * 0.24 + dashPower * 0.2, 0.11);
    }
    if (shoulderSash.current) {
      shoulderSash.current.visible = moveAmount > 0.02 || focus > 0;
      shoulderSash.current.position.y = 1.05 + Math.sin(stride * 0.48) * 0.045;
      shoulderSash.current.rotation.set(0.16 + moveAmount * 0.1, Math.sin(stride * 0.34) * 0.08, Math.sin(stride) * 0.12 * moveAmount);
    }
  });

  return (
    <group ref={rootRef}>
      <RuneDrifterModel />
      <mesh ref={cloakMesh} position={[0, 0.75, -0.56]} rotation={[0.25, 0, 0]} scale={[0.58, 1.0, 1]} visible={false}>
        <planeGeometry args={[1, 1.34]} />
        <meshBasicMaterial color={runeColor} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={shoulderSash} position={[0, 1.05, -0.32]} rotation={[0.16, 0, 0]} scale={[0.64, 0.95, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={ART_TOKENS.wornGold} transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={leftStrideMesh} visible={false}>
        <coneGeometry args={[1, 1, 4]} />
        <meshBasicMaterial color={runeColor} transparent opacity={0.46} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={rightStrideMesh} visible={false}>
        <coneGeometry args={[1, 1, 4]} />
        <meshBasicMaterial color={runeColor} transparent opacity={0.46} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={staffTrailMesh} visible={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={runeColor} transparent opacity={0.54} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.05, -0.18]} scale={[0.24, 0.24, 0.24]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={runeColor} emissive={runeColor} emissiveIntensity={2.4} roughness={0.18} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.03, -0.2]} rotation={[0, 0, Math.PI / 4]} scale={[0.48 + stage * 0.04, 0.48 + stage * 0.04, 1]}>
        <ringGeometry args={[0.52, 0.6, 4]} />
        <meshBasicMaterial color={ART_TOKENS.wornGold} transparent opacity={0.42} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <group ref={crestGroup} position={[0, 1.55, 0]}>
        <mesh position={[0, 0.12, 0.22]} rotation={[Math.PI / 2, 0, 0]} scale={[0.92 + stage * 0.05, 0.92 + stage * 0.05, 1]}>
          <ringGeometry args={[0.42, 0.49, 48]} />
          <meshBasicMaterial color={runeColor} transparent opacity={0.36 + stage * 0.035} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh position={[-0.46, -0.05, 0.18]} rotation={[0.3, 0.2, -0.36]} scale={[0.12, 0.5 + stage * 0.03, 0.08]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={ART_TOKENS.wornGold} transparent opacity={0.76} toneMapped={false} />
        </mesh>
        <mesh position={[0.46, -0.05, 0.18]} rotation={[0.3, -0.2, 0.36]} scale={[0.12, 0.5 + stage * 0.03, 0.08]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={ART_TOKENS.wornGold} transparent opacity={0.76} toneMapped={false} />
        </mesh>
      </group>
      <group ref={runeGroup} position={[0, 0.84, 0]}>
        {Array.from({ length: runeCount }, (_, index) => {
          const angle = index * (Math.PI * 2 / runeCount);
          const radius = 0.82 + index * 0.015;
          return (
            <mesh
              key={index}
              position={[Math.cos(angle) * radius, 0.2 + (index % 2) * 0.2, Math.sin(angle) * radius]}
              rotation={[0.8, angle, 0.4]}
              scale={[0.18, 0.34, 0.08]}
            >
              <octahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={runeColor} emissive={runeColor} emissiveIntensity={1.65} roughness={0.26} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function RuneDrifterModel() {
  const { scene } = useGLTF(MODEL_URLS.player);
  const model = useMemo(() => cloneSkeleton(scene), [scene]);

  useEffect(() => {
    model.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [model]);

  return (
    <primitive
      object={model}
      position={[0, 0.02, 0]}
      rotation={[0, 0, 0]}
      scale={[PLAYER_VISUAL_BASE_SCALE, PLAYER_VISUAL_BASE_SCALE, PLAYER_VISUAL_BASE_SCALE]}
    />
  );
}

PRELOAD_MODEL_URLS.forEach(path => useGLTF.preload(path));

function MapBaseArena({ visualQuality = 'high' }) {
  return (
    <group>
      <mesh receiveShadow position={[0, -2.05, 0]}>
        <cylinderGeometry args={[ARENA_RADIUS + 18.0, ARENA_RADIUS + 8.0, 1.5, 224]} />
        <meshStandardMaterial color={ART_TOKENS.void} roughness={0.99} metalness={0.01} />
      </mesh>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.08, 0]}>
        <circleGeometry args={[ARENA_RADIUS + 42.0, 224]} />
        <meshStandardMaterial color="#101912" roughness={1} metalness={0} />
      </mesh>

      <SculptedRuinTerrain visualQuality={visualQuality} />
      <OpenFieldTerrainIdentity />
      <TerrainStoryDetails />
      <RiftFloorSigils />
      <RuneRelicLandmarks />
      <NaturalFieldKit visualQuality={visualQuality} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, getTerrainHeight(0, 0) + 0.07, 0]}>
        <ringGeometry args={[ARENA_RADIUS - 1.35, ARENA_RADIUS - 1.02, 224]} />
        <meshBasicMaterial color={ART_TOKENS.runeCyan} transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 10]} position={[0, getTerrainHeight(0, 0) + 0.09, 0]}>
        <ringGeometry args={[ARENA_RADIUS - 8.8, ARENA_RADIUS - 8.55, 224]} />
        <meshBasicMaterial color={ART_TOKENS.wornGold} transparent opacity={0.11} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function RiftFloorSigils() {
  const scars = useMemo(() => [
    { x: -38, z: -18, angle: 0.35, length: 36, width: 1.1, color: ART_TOKENS.riftViolet, opacity: 0.16 },
    { x: 30, z: 28, angle: -0.55, length: 32, width: 0.92, color: ART_TOKENS.runeCyan, opacity: 0.14 },
    { x: 6, z: -48, angle: 1.08, length: 40, width: 0.82, color: ART_TOKENS.wornGold, opacity: 0.11 },
    { x: -64, z: 44, angle: -0.18, length: 28, width: 0.72, color: ART_TOKENS.runeMint, opacity: 0.1 },
    { x: 66, z: -34, angle: 0.85, length: 26, width: 0.74, color: ART_TOKENS.riftViolet, opacity: 0.12 }
  ], []);

  const runes = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const angle = index * Math.PI * 2 / 14 + (index % 2) * 0.11;
    const radius = 31 + (index % 4) * 7.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return {
      x,
      z,
      angle,
      color: index % 3 === 0 ? ART_TOKENS.wornGold : index % 3 === 1 ? ART_TOKENS.runeCyan : ART_TOKENS.riftViolet,
      scale: 0.82 + (index % 3) * 0.14
    };
  }), []);

  return (
    <group>
      {scars.map((scar, index) => (
        <group key={`rift-floor-scar-${index}`} position={[scar.x, getTerrainHeight(scar.x, scar.z) + 0.085, scar.z]} rotation={[-Math.PI / 2, 0, scar.angle]}>
          <mesh scale={[scar.length, scar.width, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={scar.color} transparent opacity={scar.opacity} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh scale={[scar.length * 0.38, scar.width * 2.4, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={scar.color} transparent opacity={scar.opacity * 0.32} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {runes.map((rune, index) => (
        <mesh
          key={`field-rune-glyph-${index}`}
          position={[rune.x, getTerrainHeight(rune.x, rune.z) + 0.095, rune.z]}
          rotation={[-Math.PI / 2, 0, -rune.angle + Math.PI / 4]}
          scale={[rune.scale, rune.scale, 1]}
        >
          <ringGeometry args={[0.34, 0.42, 4]} />
          <meshBasicMaterial color={rune.color} transparent opacity={0.18} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function SculptedRuinTerrain({ visualQuality = 'high' }) {
  const geometry = useMemo(() => {
    const size = ARENA_RADIUS * 2 + 48;
    const segments = visualQuality === 'low' ? 96 : visualQuality === 'balanced' ? 128 : 160;
    const half = size / 2;
    const positions = [];
    const colors = [];
    const indices = [];
    const lowColor = new THREE.Color(ART_TOKENS.terrainLow);
    const midColor = new THREE.Color(ART_TOKENS.terrainMid);
    const highColor = new THREE.Color(ART_TOKENS.terrainHigh);
    const mossColor = new THREE.Color(ART_TOKENS.moss);
    const edgeColor = new THREE.Color('#08110f');
    const warmStone = new THREE.Color(ART_TOKENS.oldStone);
    const lowlandMud = new THREE.Color('#394336');
    const riftBlue = new THREE.Color('#153d3b');
    const dryGrass = new THREE.Color('#666f45');

    for (let zIndex = 0; zIndex <= segments; zIndex += 1) {
      for (let xIndex = 0; xIndex <= segments; xIndex += 1) {
        const x = -half + (xIndex / segments) * size;
        const z = -half + (zIndex / segments) * size;
        const radius = Math.hypot(x, z);
        const y = getVisualTerrainHeight(x, z) - 0.035;
        const angle = Math.atan2(z, x);
        const heightBlend = THREE.MathUtils.clamp((y + 0.18) / 1.45, 0, 1);
        const edgeBlend = smoothStep(ARENA_RADIUS - 2.5, ARENA_RADIUS + 13.0, radius);
        const mossBlend = 0.25 + 0.25 * Math.sin(x * 0.47 + z * 0.18) * Math.cos(z * 0.39);
        const ruinWear = smoothStep(0.78, 1.45, Math.abs(Math.sin(x * 0.18) + Math.cos(z * 0.24)));
        const basinBlend = 1 - smoothStep(0.0, 17.5, radius);
        const ridgeBlend = smoothStep(36.0, 52.0, radius) * (1 - smoothStep(60.0, 74.0, radius));
        const riftBlend = smoothStep(0.84, 1.18, Math.abs(Math.sin(angle * 3 + radius * 0.12))) * smoothStep(9.0, 18.0, radius) * (1 - smoothStep(32.0, 39.0, radius));
        const dryBlend = smoothStep(0.2, 1.0, Math.sin(angle * 2.0 - 0.8) * 0.5 + 0.5) * smoothStep(20.0, 42.0, radius);

        const color = new THREE.Color().copy(lowColor).lerp(midColor, 0.72 + mossBlend * 0.35);
        color.lerp(lowlandMud, basinBlend * 0.26);
        color.lerp(highColor, heightBlend * 0.82);
        color.lerp(mossColor, THREE.MathUtils.clamp(mossBlend, 0, 0.42));
        color.lerp(dryGrass, dryBlend * 0.34);
        color.lerp(warmStone, Math.max(ruinWear * 0.06, ridgeBlend * 0.28));
        color.lerp(riftBlue, riftBlend * 0.1);
        color.lerp(edgeColor, edgeBlend);

        positions.push(x, y, z);
        colors.push(color.r, color.g, color.b);
      }
    }

    for (let zIndex = 0; zIndex < segments; zIndex += 1) {
      for (let xIndex = 0; xIndex < segments; xIndex += 1) {
        const a = zIndex * (segments + 1) + xIndex;
        const b = a + 1;
        const c = a + segments + 1;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const terrainGeometry = new THREE.BufferGeometry();
    terrainGeometry.setIndex(indices);
    terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeometry.computeVertexNormals();
    return terrainGeometry;
  }, [visualQuality]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh receiveShadow geometry={geometry}>
      <meshStandardMaterial vertexColors roughness={0.98} metalness={0.01} emissive="#243324" emissiveIntensity={0.18} />
    </mesh>
  );
}

function RuneRelicLandmarks() {
  const relics = useMemo(() => {
    const obelisks = Array.from({ length: 9 }, (_, index) => {
      const angle = index * Math.PI * 2 / 9 + 0.22;
      const radius = 58 + (index % 3) * 8.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        x,
        z,
        y: getTerrainHeight(x, z),
        angle,
        height: 3.6 + (index % 4) * 0.58,
        lean: (index % 2 ? -1 : 1) * (0.08 + (index % 3) * 0.025),
        color: index % 2 ? '#5d685f' : '#74705f'
      };
    });

    const brokenRing = Array.from({ length: 18 }, (_, index) => {
      const angle = index * Math.PI * 2 / 18 + (index % 3) * 0.025;
      const radius = 24 + (index % 2) * 1.4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        x,
        z,
        y: getTerrainHeight(x, z),
        angle,
        long: 2.8 + (index % 4) * 0.34,
        thick: 0.45 + (index % 3) * 0.08,
        skip: index === 4 || index === 12
      };
    }).filter(part => !part.skip);

    const shrines = [0.72, 2.62, 4.08, 5.45].map((angle, index) => {
      const radius = 82 + (index % 2) * 7.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        x,
        z,
        y: getTerrainHeight(x, z),
        angle,
        scale: 1.1 + index * 0.08
      };
    });

    return { obelisks, brokenRing, shrines };
  }, []);

  return (
    <group>
      <group position={[0, getTerrainHeight(0, 0), 0]}>
        <mesh receiveShadow castShadow position={[0, 0.18, 0]} scale={[8.8, 0.34, 8.8]}>
          <cylinderGeometry args={[1, 1, 1, 8]} />
          <meshStandardMaterial color="#4d574f" roughness={0.96} />
        </mesh>
        <mesh receiveShadow position={[0, 0.39, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]} scale={[6.2, 6.2, 1]}>
          <ringGeometry args={[0.74, 0.82, 8]} />
          <meshBasicMaterial color={ART_TOKENS.runeCyan} transparent opacity={0.42} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh castShadow position={[0, 0.92, 0]} rotation={[0.4, 0.22, 0.16]} scale={[0.8, 1.3, 0.8]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={ART_TOKENS.runeMint} emissive={ART_TOKENS.runeCyan} emissiveIntensity={1.45} roughness={0.25} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 1.7, 0]} color={ART_TOKENS.runeCyan} intensity={2.8} distance={15} />
      </group>

      {relics.brokenRing.map((part, index) => (
        <mesh
          key={`central-broken-rune-slab-${index}`}
          castShadow
          receiveShadow
          position={[part.x, part.y + 0.12, part.z]}
          rotation={[0.03, -part.angle + Math.PI / 2, index % 2 ? 0.06 : -0.04]}
          scale={[part.long, 0.26, part.thick]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={index % 2 ? '#636a5c' : '#565f57'} roughness={0.97} />
        </mesh>
      ))}

      {relics.obelisks.map((obelisk, index) => (
        <group
          key={`outer-rune-obelisk-${index}`}
          position={[obelisk.x, obelisk.y, obelisk.z]}
          rotation={[obelisk.lean, -obelisk.angle + Math.PI / 2, obelisk.lean * 0.6]}
        >
          <mesh castShadow receiveShadow position={[0, obelisk.height * 0.48, 0]} scale={[0.82, obelisk.height, 0.62]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={obelisk.color} roughness={0.94} />
          </mesh>
          <mesh position={[0, obelisk.height + 0.18, 0]} rotation={[0.28, 0.8, 0.2]} scale={[0.34, 0.7, 0.34]}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={index % 3 === 0 ? ART_TOKENS.wornGold : ART_TOKENS.runeCyan} transparent opacity={0.72} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.55, 1.55, 1]}>
            <ringGeometry args={[0.56, 0.66, 24]} />
            <meshBasicMaterial color={index % 3 === 0 ? ART_TOKENS.wornGold : ART_TOKENS.runeCyan} transparent opacity={0.28} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {relics.shrines.map((shrine, index) => (
        <group key={`field-side-shrine-${index}`} position={[shrine.x, shrine.y, shrine.z]} rotation={[0, -shrine.angle, 0]} scale={[shrine.scale, shrine.scale, shrine.scale]}>
          <mesh castShadow receiveShadow position={[0, 0.36, 0]} scale={[2.3, 0.72, 1.35]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#555d55" roughness={0.98} />
          </mesh>
          <mesh castShadow receiveShadow position={[-1.15, 1.32, 0]} scale={[0.48, 2.25, 0.48]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#62695d" roughness={0.96} />
          </mesh>
          <mesh castShadow receiveShadow position={[1.15, 1.32, 0]} scale={[0.48, 2.25, 0.48]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#62695d" roughness={0.96} />
          </mesh>
          <mesh position={[0, 2.55, 0]} scale={[1.95, 0.34, 0.58]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#706f61" roughness={0.94} />
          </mesh>
          <mesh position={[0, 0.83, -0.7]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.1, 1.1, 1]}>
            <ringGeometry args={[0.3, 0.38, 4]} />
            <meshBasicMaterial color={index % 2 ? ART_TOKENS.runeCyan : ART_TOKENS.wornGold} transparent opacity={0.34} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function TerrainStoryDetails() {
  const details = useMemo(() => {
    const riftThreads = Array.from({ length: 16 }, (_, index) => {
      const angle = index * Math.PI * 2 / 16 + (index % 3) * 0.08;
      const radius = 17 + (index % 5) * 7.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.062, z],
        rotation: -angle + Math.PI / 2 + Math.sin(index * 1.7) * 0.18,
        scale: [5.4 + (index % 4) * 1.25, 0.18 + (index % 3) * 0.04, 1],
        color: index % 4 === 0 ? ART_TOKENS.wornGold : index % 2 ? ART_TOKENS.riftViolet : ART_TOKENS.runeCyan,
        opacity: index % 4 === 0 ? 0.1 : 0.13
      };
    });

    const floorChips = Array.from({ length: 44 }, (_, index) => {
      const angle = index * 1.84 + (index % 5) * 0.12;
      const radius = 18 + (index % 18) * 3.45;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const frontLane = z < -22 && Math.abs(x) < 38;
      return {
        skip: frontLane || radius > ARENA_RADIUS - 10,
        position: [x, getTerrainHeight(x, z) + 0.07, z],
        rotation: -angle + (index % 7) * 0.19,
        scale: [1.15 + (index % 4) * 0.42, 0.34 + (index % 3) * 0.1, 1],
        color: index % 2 ? '#68715b' : '#4f5d52',
        opacity: 0.2 + (index % 3) * 0.035
      };
    }).filter(item => !item.skip);

    const oldPlazas = [0.52, 2.1, 3.74, 5.18].map((angle, index) => {
      const radius = 48 + (index % 2) * 6.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.054, z],
        rotation: -angle + Math.PI / 2,
        scale: [8.2 + index * 0.9, 2.7 + (index % 2) * 0.5, 1],
        color: index % 2 ? '#636247' : '#4c5a43',
        opacity: 0.13
      };
    });

    return { riftThreads, floorChips, oldPlazas };
  }, []);

  return (
    <group>
      {details.oldPlazas.map((plaza, index) => (
        <mesh key={`old-field-plaza-${index}`} position={plaza.position} rotation={[-Math.PI / 2, 0, plaza.rotation]} scale={plaza.scale}>
          <circleGeometry args={[1, 64]} />
          <meshBasicMaterial color={plaza.color} transparent opacity={plaza.opacity} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {details.riftThreads.map((thread, index) => (
        <mesh key={`rune-field-thread-${index}`} position={thread.position} rotation={[-Math.PI / 2, 0, thread.rotation]} scale={thread.scale}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={thread.color} transparent opacity={thread.opacity} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {details.floorChips.map((chip, index) => (
        <mesh key={`broken-floor-chip-${index}`} position={chip.position} rotation={[-Math.PI / 2, 0, chip.rotation]} scale={chip.scale}>
          <ringGeometry args={[0.42, 0.52, 4]} />
          <meshBasicMaterial color={chip.color} transparent opacity={chip.opacity} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function NaturalFieldKit({ visualQuality = 'high' }) {
  const transforms = useMemo(() => {
    const density = visualQuality === 'low' ? 0.62 : visualQuality === 'balanced' ? 0.78 : 1;
    const treeDensity = visualQuality === 'low' ? 0.34 : visualQuality === 'balanced' ? 0.48 : 0.58;
    const count = base => Math.max(1, Math.round(base * density));
    const countTree = base => Math.max(1, Math.round(base * treeDensity));
    const place = (angle, radius, scale, yOffset = 0.03, tilt = 0) => {
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: new THREE.Vector3(x, getTerrainHeight(x, z) + yOffset, z),
        rotation: -angle + Math.PI / 2 + Math.sin(angle * 2.7) * 0.22,
        scale,
        tilt
      };
    };
    const withModelScale = (transform, width = 1, height = 1, depth = width) => ({
      ...transform,
      modelScale: [transform.scale * width, transform.scale * height, transform.scale * depth]
    });

    const sightlineClear = item => {
      const distance = item.position.length();
      const cameraLane = item.position.z > 8 && Math.abs(item.position.x) < 86;
      const playLane = Math.abs(item.position.z) < 50 && Math.abs(item.position.x) < 58;
      const nearCenter = distance < 72;
      return !nearCenter && !cameraLane && !(playLane && distance < 98);
    };

    const lowCoverClear = item => {
      const lane = item.position.z > 14 && Math.abs(item.position.x) < 58;
      const combatCore = item.position.length() < 20;
      return !lane && !combatCore;
    };

    const rocks = Array.from({ length: count(52) }, (_, index) => {
      const angle = index * 1.17 + 0.42;
      const radius = 40 + (index % 18) * 4.1;
      const distanceScale = radius > 78 ? 1 : 0.74;
      return place(angle, radius, (1.55 + (index % 5) * 0.34) * distanceScale, 0.02, index % 3 === 0 ? 0.08 : 0);
    }).filter(item => item.position.length() < ARENA_RADIUS - 7 && item.position.length() > 38 && lowCoverClear(item));

    const ringTrees = Array.from({ length: countTree(26) }, (_, index) => {
      const angle = index * 1.37 + (index % 4) * 0.18;
      const radius = 109 + (index % 7) * 1.35;
      const scale = radius > 113 ? 3.45 + (index % 4) * 0.22 : 2.72 + (index % 4) * 0.16;
      const tree = place(angle, radius, scale, -0.04, index % 5 === 0 ? 0.035 : 0);
      return withModelScale(tree, 0.82, radius > 113 ? 0.74 : 0.7, 0.82);
    }).filter(item => item.position.length() < ARENA_RADIUS - 2.8 && sightlineClear(item));

    const groveTrees = SHRINE_SITES.flatMap((site, siteIndex) => Array.from({ length: visualQuality === 'low' ? 1 : 2 }, (_, index) => {
      const offset = index === 0 ? -1 : 1;
      const angle = site.angle + offset * 0.22 + (siteIndex % 2 ? -0.06 : 0.06);
      const radius = site.radius + 22.5 + (index % 2) * 4.8;
      const scale = 2.14 + (index % 2) * 0.18 + siteIndex * 0.035;
      const tree = place(angle, radius, scale, -0.04, offset * 0.025);
      return withModelScale(tree, 0.86, 0.78, 0.86);
    })).filter(item => item.position.length() < ARENA_RADIUS - 3.5 && sightlineClear(item));

    const trees = [...ringTrees, ...groveTrees];

    const bushes = Array.from({ length: count(62) }, (_, index) => {
      const angle = index * 0.97 + 0.17;
      const radius = 38 + (index % 22) * 3.4;
      const bush = place(angle, radius, 1.02 + (index % 4) * 0.13, 0.01, 0);
      return withModelScale(bush, 1.32, 0.7, 1.08);
    }).filter(item => item.position.length() < ARENA_RADIUS - 5.5 && item.position.length() > 36 && lowCoverClear(item));

    const grass = Array.from({ length: count(174) }, (_, index) => {
      const angle = index * 1.61 + (index % 7) * 0.09;
      const radius = 20 + (index % 35) * 2.75;
      return place(angle, radius, 0.62 + (index % 5) * 0.08, 0.025, 0);
    }).filter(item => item.position.length() < ARENA_RADIUS - 6 && item.position.length() > 18);

    const moss = Array.from({ length: count(104) }, (_, index) => {
      const angle = index * 2.03 + (index % 5) * 0.07;
      const radius = 16 + (index % 38) * 2.48;
      const transform = place(angle, radius, 1.0 + (index % 6) * 0.18, 0.055, 0);
      transform.width = 1.4 + (index % 5) * 0.32;
      transform.depth = 0.46 + (index % 4) * 0.12;
      transform.color = index % 4 === 0 ? ART_TOKENS.wornGold : index % 3 === 0 ? ART_TOKENS.runeCyan : '#425d3f';
      transform.opacity = index % 4 === 0 ? 0.08 : 0.12;
      return transform;
    }).filter(item => item.position.length() < ARENA_RADIUS - 8 && lowCoverClear(item));

    const pebbles = Array.from({ length: count(118) }, (_, index) => {
      const angle = index * 2.41 + (index % 7) * 0.11;
      const radius = 22 + (index % 42) * 2.2;
      const transform = place(angle, radius, 1, 0.09, 0);
      transform.rotation += (index % 2 ? -1 : 1) * 0.24;
      transform.size = 0.22 + (index % 5) * 0.055;
      transform.flatness = 0.09 + (index % 3) * 0.025;
      transform.color = index % 5 === 0 ? '#74694f' : index % 3 === 0 ? '#526151' : '#3f4d43';
      return transform;
    }).filter(item => item.position.length() < ARENA_RADIUS - 9 && item.position.length() > 24 && lowCoverClear(item));

    const fallenTrunks = Array.from({ length: count(18) }, (_, index) => {
      const angle = index * 1.49 + 0.34;
      const radius = 48 + (index % 14) * 4.5;
      const transform = place(angle, radius, 1, 0.28, 0);
      transform.rotation += (index % 2 ? -1 : 1) * (0.72 + (index % 3) * 0.18);
      transform.length = 3.2 + (index % 4) * 0.52;
      transform.radius = 0.18 + (index % 3) * 0.035;
      transform.color = index % 4 === 0 ? '#6f6248' : index % 3 === 0 ? '#4c5b45' : '#684f3f';
      transform.rootColor = index % 3 === 0 ? ART_TOKENS.runeCyan : '#233427';
      return transform;
    }).filter(item => item.position.length() < ARENA_RADIUS - 9 && item.position.length() > 42 && lowCoverClear(item));

    return { rocks, trees, bushes, grass, moss, pebbles, fallenTrunks };
  }, [visualQuality]);

  const rockLarge = useMemo(() => transforms.rocks.filter((_, index) => index % 3 !== 0), [transforms]);
  const rockTall = useMemo(() => transforms.rocks.filter((_, index) => index % 3 === 0), [transforms]);
  const pineTall = useMemo(() => transforms.trees.filter((_, index) => index % 3 === 0), [transforms]);
  const pineRound = useMemo(() => transforms.trees.filter((_, index) => index % 3 === 1), [transforms]);
  const treeDefault = useMemo(() => transforms.trees.filter((_, index) => index % 3 === 2), [transforms]);
  const castNatureShadows = visualQuality === 'high';
  const receiveNatureShadows = visualQuality !== 'low';

  return (
    <group>
      <StaticModelInstances url={NATURE_MODEL_URLS.rockLargeA} transforms={rockLarge} castShadow={castNatureShadows} receiveShadow={receiveNatureShadows} />
      <StaticModelInstances url={NATURE_MODEL_URLS.rockTall} transforms={rockTall} castShadow={castNatureShadows} receiveShadow={receiveNatureShadows} />
      <StaticModelInstances url={NATURE_MODEL_URLS.pineTall} transforms={pineTall} castShadow={castNatureShadows} receiveShadow={receiveNatureShadows} />
      <StaticModelInstances url={NATURE_MODEL_URLS.pineRound} transforms={pineRound} castShadow={castNatureShadows} receiveShadow={receiveNatureShadows} />
      <StaticModelInstances url={NATURE_MODEL_URLS.treeDefault} transforms={treeDefault} castShadow={castNatureShadows} receiveShadow={receiveNatureShadows} />
      <StaticModelInstances url={NATURE_MODEL_URLS.bushLarge} transforms={transforms.bushes} castShadow={castNatureShadows} receiveShadow={receiveNatureShadows} />
      <StaticModelInstances url={NATURE_MODEL_URLS.grassLarge} transforms={transforms.grass} receiveShadow={receiveNatureShadows} />
      <FallenTrunkMarks transforms={transforms.fallenTrunks} />
      <FieldMossPatches transforms={transforms.moss} />
      <FieldPebbleScatter transforms={transforms.pebbles} />
      <TreeCanopyShadows transforms={transforms.trees} />
      {visualQuality !== 'low' && <TreeCanopyHighlights transforms={transforms.trees} />}
      {visualQuality !== 'low' && <TreeRootPatches transforms={transforms.trees} />}
    </group>
  );
}

function FallenTrunkMarks({ transforms }) {
  const trunkRef = useRef();
  const rootRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!trunkRef.current || !rootRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.28;
      local.quat.setFromEuler(new THREE.Euler(0, transform.rotation, Math.PI / 2 + (index % 2 ? 0.05 : -0.04)));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.radius, transform.length, transform.radius));
      trunkRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.color);
      trunkRef.current.setColorAt(index, local.color);

      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.058;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.length * 0.92, transform.radius * 3.8, 1));
      rootRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.rootColor);
      rootRef.current.setColorAt(index, local.color);
    });
    trunkRef.current.count = transforms.length;
    trunkRef.current.instanceMatrix.needsUpdate = true;
    if (trunkRef.current.instanceColor) trunkRef.current.instanceColor.needsUpdate = true;
    rootRef.current.count = transforms.length;
    rootRef.current.instanceMatrix.needsUpdate = true;
    if (rootRef.current.instanceColor) rootRef.current.instanceColor.needsUpdate = true;
  }, [local, transforms]);

  return (
    <group>
      <instancedMesh ref={rootRef} args={[null, null, transforms.length]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={trunkRef} args={[null, null, transforms.length]} frustumCulled={false} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial roughness={0.92} metalness={0.02} />
      </instancedMesh>
    </group>
  );
}

function FieldMossPatches({ transforms }) {
  const patchRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!patchRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.064;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation));
      local.matrix.compose(
        local.pos,
        local.quat,
        local.scale.set(transform.width * transform.scale, transform.depth * transform.scale, 1)
      );
      patchRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.color);
      patchRef.current.setColorAt(index, local.color);
    });
    patchRef.current.count = transforms.length;
    patchRef.current.instanceMatrix.needsUpdate = true;
    if (patchRef.current.instanceColor) patchRef.current.instanceColor.needsUpdate = true;
  }, [local, transforms]);

  return (
    <instancedMesh ref={patchRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}

function FieldPebbleScatter({ transforms }) {
  const pebbleRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!pebbleRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.11;
      local.quat.setFromEuler(new THREE.Euler(0.08, transform.rotation, index % 2 ? 0.1 : -0.06));
      local.matrix.compose(
        local.pos,
        local.quat,
        local.scale.set(transform.size * 1.8, transform.flatness, transform.size * (1.0 + (index % 3) * 0.18))
      );
      pebbleRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.color);
      pebbleRef.current.setColorAt(index, local.color);
    });
    pebbleRef.current.count = transforms.length;
    pebbleRef.current.instanceMatrix.needsUpdate = true;
    if (pebbleRef.current.instanceColor) pebbleRef.current.instanceColor.needsUpdate = true;
  }, [local, transforms]);

  return (
    <instancedMesh ref={pebbleRef} args={[null, null, transforms.length]} frustumCulled={false} receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#56604e" roughness={0.98} metalness={0.01} />
    </instancedMesh>
  );
}

function TreeRootPatches({ transforms }) {
  const rootPatchRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!rootPatchRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.057;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation + (index % 2 ? 0.2 : -0.16)));
      local.matrix.compose(
        local.pos,
        local.quat,
        local.scale.set(transform.scale * 0.94, transform.scale * 0.62, 1)
      );
      rootPatchRef.current.setMatrixAt(index, local.matrix);
      local.color.set(index % 4 === 0 ? '#6b6548' : index % 3 === 0 ? '#1b4944' : '#26372b');
      rootPatchRef.current.setColorAt(index, local.color);
    });
    rootPatchRef.current.count = transforms.length;
    rootPatchRef.current.instanceMatrix.needsUpdate = true;
    if (rootPatchRef.current.instanceColor) rootPatchRef.current.instanceColor.needsUpdate = true;
  }, [local, transforms]);

  return (
    <instancedMesh ref={rootPatchRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <circleGeometry args={[1, 24]} />
      <meshBasicMaterial color="#26372b" transparent opacity={0.18} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

function TreeCanopyHighlights({ transforms }) {
  const highlightRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!highlightRef.current) return;
    transforms.forEach((transform, index) => {
      const side = index % 2 ? -1 : 1;
      local.pos.copy(transform.position);
      local.pos.x += Math.cos(transform.rotation + side * 0.52) * transform.scale * 0.18;
      local.pos.y += transform.scale * (1.22 + (index % 3) * 0.04);
      local.pos.z += Math.sin(transform.rotation + side * 0.52) * transform.scale * 0.18;
      local.quat.setFromEuler(new THREE.Euler(0.55, transform.rotation + side * 0.22, side * 0.18));
      local.matrix.compose(
        local.pos,
        local.quat,
        local.scale.set(transform.scale * 0.22, transform.scale * 0.06, 1)
      );
      highlightRef.current.setMatrixAt(index, local.matrix);
      local.color.set(index % 4 === 0 ? ART_TOKENS.runeCyan : index % 5 === 0 ? ART_TOKENS.wornGold : '#9ad2a6');
      highlightRef.current.setColorAt(index, local.color);
    });
    highlightRef.current.count = transforms.length;
    highlightRef.current.instanceMatrix.needsUpdate = true;
    if (highlightRef.current.instanceColor) highlightRef.current.instanceColor.needsUpdate = true;
  }, [local, transforms]);

  return (
    <instancedMesh ref={highlightRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}

function TreeCanopyShadows({ transforms }) {
  const shadowRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3()
  }), []);

  useEffect(() => {
    if (!shadowRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.052;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation));
      const shadowScale = Math.max(2.2, transform.scale * 0.72);
      local.matrix.compose(local.pos, local.quat, local.scale.set(shadowScale, shadowScale * 0.68, 1));
      shadowRef.current.setMatrixAt(index, local.matrix);
    });
    shadowRef.current.count = transforms.length;
    shadowRef.current.instanceMatrix.needsUpdate = true;
  }, [local, transforms]);

  return (
    <instancedMesh ref={shadowRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <circleGeometry args={[1, 28]} />
      <meshBasicMaterial color="#07110d" transparent opacity={0.18} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

function OpenFieldTerrainIdentity() {
  const landmarks = useMemo(() => {
    const groveClearings = SHRINE_SITES.map((site, index) => {
      const x = Math.cos(site.angle) * site.radius;
      const z = Math.sin(site.angle) * site.radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.04, z],
        rotation: -site.angle + Math.PI / 2,
        scale: [7.4 + (index % 2) * 1.2, 5.1 + (index % 3) * 0.6, 1],
        color: index % 2 ? '#475842' : '#586145',
        ring: site.color
      };
    });

    const shrineRoads = SHRINE_SITES.map((site, index) => {
      const radius = site.radius * 0.5;
      const x = Math.cos(site.angle) * radius;
      const z = Math.sin(site.angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.044, z],
        rotation: -site.angle + Math.PI / 2,
        scale: [site.radius * 0.84, 2.4 + (index % 2) * 0.35, 1],
        color: index % 2 ? '#646846' : '#535d41'
      };
    });

    const ridges = Array.from({ length: 30 }, (_, index) => {
      const angle = index * Math.PI * 2 / 30 + (index % 2) * 0.07;
      const radius = 42 + (index % 5) * 2.1;
      return {
        position: [Math.cos(angle) * radius, getTerrainHeight(Math.cos(angle) * radius, Math.sin(angle) * radius) + 0.18, Math.sin(angle) * radius],
        rotation: -angle + Math.PI / 2,
        scale: [2.4 + (index % 3) * 0.58, 0.48 + (index % 2) * 0.1, 0.92 + (index % 4) * 0.22],
        color: index % 2 ? '#53604f' : '#3f5044'
      };
    });

    const standingStones = [0.28, 1.34, 2.35, 3.48, 4.55, 5.42].map((angle, index) => {
      const radius = index % 2 ? 34.5 : 39.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.5, z],
        rotation: -angle + 0.2,
        scale: [1.05, 1.05 + index * 0.08, 0.76],
        color: index % 2 ? '#647064' : '#59675d'
      };
    });

    const wornPaths = [0.18, 1.76, 3.22, 4.78].map((angle, index) => {
      const radius = index % 2 ? 28 : 22;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.045, z],
        rotation: -angle + Math.PI / 2,
        scale: [11 + index * 1.2, 2.2 + (index % 2) * 0.4, 1],
        color: index % 2 ? '#5a5c43' : '#4f5940'
      };
    });

    return { groveClearings, shrineRoads, ridges, standingStones, wornPaths };
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, getTerrainHeight(0, 0) + 0.038, 0]}>
        <ringGeometry args={[13.5, 13.72, 128]} />
        <meshBasicMaterial color="#72d7ff" transparent opacity={0.28} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, getTerrainHeight(0, 0) + 0.046, 0]}>
        <ringGeometry args={[43.0, 43.28, 192]} />
        <meshBasicMaterial color="#d9b85e" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
      </mesh>

      {landmarks.shrineRoads.map((pathMark, index) => (
        <mesh key={`shrine-field-road-${index}`} position={pathMark.position} rotation={[-Math.PI / 2, 0, pathMark.rotation]} scale={pathMark.scale}>
          <circleGeometry args={[1, 64]} />
          <meshBasicMaterial color={pathMark.color} transparent opacity={0.16} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}

      {landmarks.groveClearings.map((clearing, index) => (
        <group key={`shrine-grove-clearing-${index}`}>
          <mesh position={clearing.position} rotation={[-Math.PI / 2, 0, clearing.rotation]} scale={clearing.scale}>
            <circleGeometry args={[1, 64]} />
            <meshBasicMaterial color={clearing.color} transparent opacity={0.2} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[clearing.position[0], clearing.position[1] + 0.01, clearing.position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[5.9, 6.12, 96]} />
            <meshBasicMaterial color={clearing.ring} transparent opacity={0.14} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {landmarks.wornPaths.map((pathMark, index) => (
        <mesh key={`worn-field-path-${index}`} position={pathMark.position} rotation={[-Math.PI / 2, 0, pathMark.rotation]} scale={pathMark.scale}>
          <circleGeometry args={[1, 48]} />
          <meshBasicMaterial color={pathMark.color} transparent opacity={0.2} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}

      {landmarks.ridges.map((stone, index) => (
        <mesh key={`terrain-ridge-stone-${index}`} castShadow receiveShadow position={stone.position} rotation={[0.08, stone.rotation, 0.04]} scale={stone.scale}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={stone.color} roughness={0.96} />
        </mesh>
      ))}

      {landmarks.standingStones.map((stone, index) => (
        <mesh key={`standing-field-stone-${index}`} castShadow receiveShadow position={stone.position} rotation={[0.08, stone.rotation, -0.04]} scale={stone.scale}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={stone.color} roughness={0.9} />
        </mesh>
      ))}

      <CliffEscarpments />
    </group>
  );
}

function CliffEscarpments() {
  return (
    <group>
      {MAP_CLIFFS.map((cliff, index) => {
        const y = getTerrainHeight(cliff.x, cliff.z);
        return (
          <group key={`cliff-escarpment-${index}`} position={[cliff.x, y + 0.08, cliff.z]}>
            <mesh castShadow receiveShadow position={[0, cliff.h * 0.48, 0]} scale={[cliff.w, cliff.h, cliff.d]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={cliff.color} roughness={0.96} />
            </mesh>
            <mesh receiveShadow position={[0, cliff.h + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[cliff.w * 0.55, cliff.d * 0.58, 1]}>
              <planeGeometry args={[1, 1]} />
              <meshStandardMaterial color="#77815d" roughness={0.98} />
            </mesh>
            <mesh position={[0, 0.06, cliff.d * 0.52]} rotation={[-Math.PI / 2, 0, 0]} scale={[cliff.w * 0.62, 1.35, 1]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color="#101810" transparent opacity={0.32} depthWrite={false} />
            </mesh>
            {[-0.38, 0, 0.38].map((offset, shardIndex) => (
              <mesh
                key={`cliff-shard-${index}-${shardIndex}`}
                castShadow
                receiveShadow
                position={[cliff.w * offset, cliff.h + 0.2 + shardIndex * 0.05, (shardIndex % 2 ? -1 : 1) * cliff.d * 0.18]}
                rotation={[0.2, shardIndex * 0.7, 0.08]}
                scale={[1.8 + shardIndex * 0.35, 0.62, 0.74]}
              >
                <dodecahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color={shardIndex % 2 ? '#68715a' : '#4b594d'} roughness={0.95} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

function StaticModelInstances({ url, transforms, castShadow = false, receiveShadow = false, materialColor }) {
  const parts = useInstancedModelParts(url);
  const styledParts = useMemo(() => {
    if (!materialColor) return parts;
    const color = new THREE.Color(materialColor);
    return parts.map(part => {
      const material = Array.isArray(part.material)
        ? part.material.map(item => {
          const clone = item.clone();
          clone.color?.multiply(color);
          return clone;
        })
        : part.material.clone();
      if (!Array.isArray(material)) {
        material.color?.multiply(color);
      }
      return { ...part, material };
    });
  }, [materialColor, parts]);
  const meshRefs = useRef([]);
  const axis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const local = useMemo(() => ({
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    base: new THREE.Matrix4(),
    final: new THREE.Matrix4(),
    euler: new THREE.Euler()
  }), []);

  useEffect(() => {
    styledParts.forEach((part, partIndex) => {
      const mesh = meshRefs.current[partIndex];
      if (!mesh) return;
      transforms.forEach((transform, index) => {
        if (transform.tilt) {
          local.euler.set(transform.tilt, transform.rotation, 0);
          local.quat.setFromEuler(local.euler);
        } else {
          local.quat.setFromAxisAngle(axis, transform.rotation);
        }
        if (Array.isArray(transform.modelScale)) {
          local.scale.set(transform.modelScale[0], transform.modelScale[1], transform.modelScale[2]);
        } else {
          local.scale.setScalar(transform.scale);
        }
        local.base.compose(transform.position, local.quat, local.scale);
        local.final.multiplyMatrices(local.base, part.localMatrix);
        mesh.setMatrixAt(index, local.final);
      });
      mesh.count = transforms.length;
      mesh.instanceMatrix.needsUpdate = true;
    });
  }, [axis, local, styledParts, transforms]);

  return (
    <group>
      {styledParts.map((part, index) => (
        <instancedMesh
          key={`${url}-${index}`}
          ref={node => {
            meshRefs.current[index] = node;
          }}
          args={[part.geometry, part.material, transforms.length]}
          frustumCulled={false}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        />
      ))}
    </group>
  );
}

function OrbitBlades({ player, game }) {
  const stats = game.stats;
  const parts = useInstancedModelParts(PROJECTILE_MODEL_URLS.orbitBlade);
  const meshRefs = useRef([]);
  const bladeFocus = getBuildFocus(game, 'blade');
  const bladeCount = getBladeCount(stats, bladeFocus, isWeaponFamilyUnlocked(game, 'blade'));
  const axis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const local = useMemo(() => ({
    pos: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    base: new THREE.Matrix4(),
    final: new THREE.Matrix4()
  }), []);

  useFrame(() => {
    const spin = performance.now() * (0.0022 + Math.min(0.001, (1 - stats.cooldown) * 0.0018));
    const radius = (2.5 + Math.min(0.5, stats.bladeBonus * 0.08) + bladeFocus * 0.08) * stats.bladeRadius;
    parts.forEach((part, partIndex) => {
      const mesh = meshRefs.current[partIndex];
      if (!mesh) return;
      if (bladeCount <= 0) {
        mesh.count = 0;
        mesh.instanceMatrix.needsUpdate = true;
        return;
      }
      for (let index = 0; index < bladeCount; index += 1) {
        const angle = spin + index * (Math.PI * 2 / bladeCount);
        local.pos.set(
          player.current.pos.x + Math.cos(angle) * radius,
          player.current.pos.y + 0.24,
          player.current.pos.z + Math.sin(angle) * radius
        );
        local.quat.setFromAxisAngle(axis, -angle + Math.PI / 2);
        local.scale.setScalar((0.62 + stats.pierce * 0.04) * Math.min(1.45, stats.bladeDamage));
        local.base.compose(local.pos, local.quat, local.scale);
        local.final.multiplyMatrices(local.base, part.localMatrix);
        mesh.setMatrixAt(index, local.final);
      }
      mesh.count = bladeCount;
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <group>
      {parts.map((part, index) => (
        <instancedMesh
          key={`orbit-blade-${index}`}
          ref={node => {
            meshRefs.current[index] = node;
          }}
          args={[part.geometry, part.material, MAX_ORBIT_BLADES]}
          frustumCulled={false}
          castShadow
        />
      ))}
    </group>
  );
}

function ArenaAtmosphere() {
  const rings = useRef();

  useFrame(() => {
    if (rings.current) rings.current.rotation.z += 0.0018;
  });

  return (
    <group>
      <mesh ref={rings} position={[0, 6.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[20.8, 21.05, 128]} />
        <meshBasicMaterial color="#70d6ff" transparent opacity={0.045} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 7.2, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]}>
        <ringGeometry args={[9.2, 9.42, 96]} />
        <meshBasicMaterial color="#f7d06b" transparent opacity={0.035} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function RiftSkyMotifs({ visualQuality = 'high' }) {
  const dustRef = useRef();
  const tearRef = useRef();
  const dustGeometry = useMemo(() => {
    const dustCount = visualQuality === 'high' ? 150 : 80;
    const positions = [];
    for (let index = 0; index < dustCount; index += 1) {
      const angle = index * 2.399 + (index % 5) * 0.07;
      const radius = 22 + (index % 44) * 2.05;
      const height = 4.8 + (index % 19) * 0.62 + Math.sin(index * 1.7) * 0.45;
      positions.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }, [visualQuality]);

  const tears = useMemo(() => [
    { x: -58, y: 9.4, z: -44, ry: 0.55, s: 4.4, color: ART_TOKENS.riftViolet },
    { x: 62, y: 8.2, z: 30, ry: -0.82, s: 3.3, color: ART_TOKENS.runeCyan },
    { x: 8, y: 11.5, z: -78, ry: 0.12, s: 3.7, color: ART_TOKENS.wornGold }
  ], []);

  useFrame((_, dt) => {
    if (dustRef.current) dustRef.current.rotation.y += dt * 0.018;
    if (tearRef.current) {
      tearRef.current.rotation.y += dt * 0.055;
      tearRef.current.position.y = Math.sin(performance.now() * 0.0011) * 0.24;
    }
  });

  useEffect(() => () => dustGeometry.dispose(), [dustGeometry]);

  return (
    <group>
      <points ref={dustRef} geometry={dustGeometry} frustumCulled={false}>
        <pointsMaterial color={ART_TOKENS.runeMint} size={visualQuality === 'high' ? 0.22 : 0.18} sizeAttenuation transparent opacity={visualQuality === 'high' ? 0.28 : 0.18} depthWrite={false} toneMapped={false} />
      </points>
      <group ref={tearRef}>
        {tears.map((tear, index) => (
          <group key={`sky-rift-tear-${index}`} position={[tear.x, tear.y, tear.z]} rotation={[0.34, tear.ry, 0.08]}>
            <mesh scale={[tear.s * 0.48, tear.s, tear.s * 0.48]}>
              <ringGeometry args={[0.18, 0.28, 5]} />
              <meshBasicMaterial color={tear.color} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            <pointLight color={tear.color} intensity={0.55} distance={18} />
          </group>
        ))}
      </group>
    </group>
  );
}

function HitBurst({ burst }) {
  const progress = 1 - burst.life / burst.maxLife;
  const radius = Math.max(0.55, burst.radius ?? 1);
  return (
    <group position={[burst.pos.x, burst.pos.y + 0.18, burst.pos.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[radius * (0.7 + progress * 1.7), radius * (0.7 + progress * 1.7), 1]}>
        <ringGeometry args={[0.32, 0.38, 24]} />
        <meshBasicMaterial color={burst.color} transparent opacity={Math.max(0, 0.8 - progress)} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} scale={[radius * (0.46 + progress * 1.9), radius * (0.46 + progress * 1.9), 1]}>
        <ringGeometry args={[0.12, 0.16, 4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={Math.max(0, 0.58 - progress * 0.58)} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.14 + progress * 0.35, 0]} scale={[0.34 - progress * 0.12, 0.34 - progress * 0.12, 0.34 - progress * 0.12]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={burst.color} transparent opacity={Math.max(0, 0.72 - progress)} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function DamageNumber({ number }) {
  const progress = 1 - number.life / number.maxLife;
  const opacity = Math.max(0, 1 - progress);
  return (
    <Text
      position={[number.pos.x, number.pos.y + progress * 0.45, number.pos.z]}
      rotation={[-0.86, 0, 0]}
      fontSize={number.size}
      anchorX="center"
      anchorY="middle"
      color={number.color}
      fillOpacity={opacity}
      outlineWidth={0.025}
      outlineColor="#07100f"
    >
      {number.value}
    </Text>
  );
}

function SpawnWarning({ warning }) {
  const progress = 1 - warning.life / warning.maxLife;
  const pulse = 1 + Math.sin(progress * Math.PI * 8) * 0.08;
  const shape = warning.shape ?? 'spawn';
  const isShockwave = shape === 'shockwave';
  const isSummon = shape === 'summon';
  const isGuard = shape === 'guard';
  const isCharge = shape === 'charge';
  const opacity = Math.max(0, (isShockwave ? 0.86 : 0.75) - progress * 0.55);
  const radius = warning.radius ?? (pulse + progress * 1.8);
  const innerRadius = warning.radius ? Math.max(0.72, warning.radius * 0.42) : 0.75 + progress * 0.5;
  const towerScale = warning.radius ? Math.min(2.4, 0.8 + warning.radius * 0.045) : 0.22 + progress * 0.2;
  const ringSegments = isGuard ? 4 : isSummon ? 6 : 36;
  const markerSegments = isCharge ? 3 : isGuard ? 4 : 6;
  return (
    <group position={[warning.pos.x, 0.1, warning.pos.z]}>
      <mesh position={[0, 0.85, 0]} scale={[towerScale, 1.6 - progress * 0.55, towerScale]}>
        <cylinderGeometry args={[1, 1, 1, 16, 1, true]} />
        <meshBasicMaterial color={warning.color} transparent opacity={Math.max(0, 0.24 - progress * 0.08)} depthWrite={false} toneMapped={false} />
      </mesh>
      {isShockwave && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[radius * 0.74, radius * 0.74, 1]}>
            <ringGeometry args={[0.94, 1.0, 72]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={opacity * 0.18} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, progress * Math.PI * 0.35]} scale={[radius * 0.48, radius * 0.48, 1]}>
            <ringGeometry args={[0.82, 1.0, 6]} />
            <meshBasicMaterial color={warning.color} transparent opacity={opacity * 0.18} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[radius, radius, 1]}>
        <ringGeometry args={[0.62, 0.72, ringSegments]} />
        <meshBasicMaterial color={warning.color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, isGuard ? Math.PI / 4 : Math.PI / 6]} scale={[innerRadius, innerRadius, 1]}>
        <ringGeometry args={[0.2, 0.24, markerSegments]} />
        <meshBasicMaterial color={warning.color} transparent opacity={opacity * 0.8} depthWrite={false} toneMapped={false} />
      </mesh>
      {(isSummon || isGuard || isCharge) && Array.from({ length: isCharge ? 3 : 4 }, (_, index) => {
        const angle = index * Math.PI * 2 / (isCharge ? 3 : 4) + progress * Math.PI * (isGuard ? -0.7 : 0.5);
        const markerRadius = radius * (isCharge ? 0.68 : 0.52);
        return (
          <mesh
            key={`warning-marker-${index}`}
            position={[Math.cos(angle) * markerRadius, 0.22, Math.sin(angle) * markerRadius]}
            rotation={[0.55, -angle, 0.2]}
            scale={[0.16, isCharge ? 0.58 : 0.38, 0.16]}
          >
            <coneGeometry args={[1, 1, isCharge ? 3 : 4]} />
            <meshBasicMaterial color={warning.color} transparent opacity={opacity * 0.75} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.36 + progress * 0.35, 0]} rotation={[0.5, progress * Math.PI * 3, 0.2]} scale={[0.18, 0.32, 0.18]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={warning.color} transparent opacity={Math.max(0, 0.8 - progress * 0.5)} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.85, 0]} color={warning.color} intensity={0.65} distance={4.5} />
      {warning.label && (
        <>
          <Text
            position={[0, 1.25 + progress * 0.4, 0]}
            rotation={[-0.86, 0, 0]}
            fontSize={0.55}
            anchorX="center"
            anchorY="middle"
            color={warning.color}
            fillOpacity={Math.max(0, 1 - progress)}
            outlineWidth={0.025}
            outlineColor="#07100f"
          >
            {warning.label}
          </Text>
          {warning.cue && (
            <Text
              position={[0, 0.82 + progress * 0.28, 0]}
              rotation={[-0.86, 0, 0]}
              fontSize={0.3}
              anchorX="center"
              anchorY="middle"
              color="#f8fffc"
              fillOpacity={Math.max(0, 0.9 - progress * 0.45)}
              outlineWidth={0.018}
              outlineColor="#07100f"
            >
              {warning.cue}
            </Text>
          )}
        </>
      )}
    </group>
  );
}

function HUD({ game, onRestart, onPause }) {
  const hpPct = Math.max(0, game.stats.hp / game.stats.maxHp) * 100;
  const hpRatio = game.stats.hp / game.stats.maxHp;
  const xpPct = Math.min(100, (game.xp / game.xpToNext) * 100);
  const runPct = Math.min(100, (game.time / RUN_DURATION) * 100);
  const timeRemaining = Math.max(0, RUN_DURATION - game.time);
  const crisis = getCrisisState(game);
  const dashCooldown = game.dash?.cooldown ?? 0;
  const dashCooldownMax = Math.max(0.01, game.dash?.cooldownMax ?? DASH_COOLDOWN);
  const dashPct = Math.max(0, Math.min(100, (1 - dashCooldown / dashCooldownMax) * 100));
  const dashReady = game.dash?.ready ?? dashCooldown <= 0;
  const encounterAlert = game.encounterAlertTimer > 0 ? game.encounterAlert : null;
  const activeThreat = game.activeThreat;
  const bossStatus = game.bossStatus;
  const bossPatternMeta = game.lastBossPattern ? BOSS_PATTERN_META[game.lastBossPattern] : null;
  const isThreatened = crisis.level >= 3 || bossStatus?.enraged || encounterAlert?.kind === 'boss' || encounterAlert?.kind === 'boss-pattern';
  const onboardingSteps = getOnboardingSteps(game);
  const openingObjectives = getOpeningObjectives(game);
  const activeObjectives = openingObjectives.filter(objective => !objective.complete).slice(0, 2);
  const completedOpeningObjectives = openingObjectives.filter(objective => objective.complete).length;
  const firstSessionCue = getFirstSessionCue(game, onboardingSteps, activeObjectives);
  const showFirstSessionCoach = !bossStatus && firstSessionCue && game.time < 128;
  const showOpeningObjectives = !bossStatus && activeObjectives.length > 0 && game.time < 155;
  const showTickerBasics = !bossStatus && game.time < 12;
  const showDashTicker = showTickerBasics || !dashReady;
  const tickerHasEvent = Boolean(
    crisis.level > 0
    || game.damageFlash > 0
    || (!bossStatus && activeThreat)
    || (!bossStatus && bossPatternMeta)
    || game.pickupFlash > 0
  );
  const showCombatTicker = showDashTicker || tickerHasEvent;

  return (
    <section className={`hud ${isThreatened ? 'isThreatened' : ''} ${bossStatus ? 'hasBoss' : ''} ${bossStatus?.casting ? 'isCasting' : ''}`} aria-label="게임 상태">
      <div className="topbar">
        <div className={`meterBlock hpBlock ${hpRatio <= 0.34 ? 'isLow' : ''} ${game.damageFlash > 0 ? 'isHit' : ''}`}>
          <div className="meterLabel">
            <span>체력</span>
            <strong>{Math.ceil(game.stats.hp)} / {game.stats.maxHp}</strong>
          </div>
          <div className="meter hp"><i style={{ width: `${hpPct}%` }} /></div>
        </div>
        <div className="meterBlock">
          <div className="meterLabel">
            <span>레벨 {game.level}</span>
            <strong>{Math.floor(game.xp)} / {game.xpToNext}</strong>
          </div>
          <div className="meter xp"><i style={{ width: `${xpPct}%` }} /></div>
        </div>
        <div className="meterBlock runBlock">
          <div className="meterLabel">
            <span>생존 목표</span>
            <strong>{formatTime(timeRemaining)}</strong>
          </div>
          <div className="meter run"><i style={{ width: `${runPct}%` }} /></div>
        </div>
        <div className="hudActions">
          <button className="iconButton" type="button" onClick={onPause} aria-label={game.phase === 'paused' ? '계속하기' : '일시정지'}>
            {game.phase === 'paused' ? '▶' : 'Ⅱ'}
          </button>
          <button className="iconButton" type="button" onClick={onRestart} aria-label="다시 시작">↻</button>
        </div>
      </div>
      {showCombatTicker && (
        <div className={`combatTicker ${showTickerBasics ? '' : 'isAlertOnly'}`}>
          {showTickerBasics && <span className="wavePill">Wave {game.wave}</span>}
          {showTickerBasics && <span className="koPill">{game.kills} KOs</span>}
          {showDashTicker && (
            <span className={`dashPill ${dashReady ? 'isReady' : ''}`}>
              Dash <b>{dashReady ? 'Ready' : `${dashCooldown.toFixed(1)}s`}</b>
              <i style={{ width: `${dashPct}%` }} />
            </span>
          )}
          {crisis.level > 0 && <span className={`tickerAlert ${crisis.level >= 3 ? 'isCritical' : ''}`}>{crisis.label}</span>}
          {game.damageFlash > 0 && <span className="tickerAlert damagePill">{game.damageMessage}</span>}
          {!bossStatus && activeThreat && <span className="tickerAlert threatPill" style={{ '--tone': activeThreat.color }}>{activeThreat.label} · {activeThreat.weakness}</span>}
          {!bossStatus && bossPatternMeta && <span className="tickerAlert bossPatternPill" style={{ '--tone': bossPatternMeta.color }}>{bossPatternMeta.label} · {bossPatternMeta.cue}</span>}
          {game.pickupFlash > 0 && <span className="tickerPickup">{game.pickupMessage}</span>}
        </div>
      )}
      {showFirstSessionCoach && (
        <div className="onboardingCoach" style={{ '--tone': firstSessionCue.color }} aria-label="초반 안내">
          <div className="coachHeader">
            <span>First Run</span>
            <strong>{firstSessionCue.title}</strong>
            <small>{firstSessionCue.action}</small>
          </div>
          <div className="coachBody">
            <b>{firstSessionCue.body}</b>
            <small>{firstSessionCue.detail}</small>
            <i style={{ width: `${firstSessionCue.progress * 100}%` }} />
          </div>
          <div className="coachSteps" aria-label="초반 조작 단계">
            {onboardingSteps.slice(0, 4).map(step => (
              <span
                key={step.id}
                className={`${step.id === firstSessionCue.stepId ? 'isActive' : ''} ${step.complete ? 'isComplete' : ''}`}
                style={{ '--tone': step.color }}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>
      )}
      {showOpeningObjectives && (
        <div className="objectiveRow" aria-label="첫 파동 목표">
          <div className="objectiveSummary">
            <span>첫 파동 목표</span>
            <strong>{completedOpeningObjectives} / {openingObjectives.length}</strong>
          </div>
          {activeObjectives.map(objective => (
            <div key={objective.id} className="objectiveCard" style={{ '--tone': objective.color }}>
              <span>
                {objective.title}
                <strong>{objective.label}</strong>
              </span>
              <small>{objective.displayValue} / {objective.displayTarget}</small>
              <i style={{ width: `${objective.progress * 100}%` }} />
            </div>
          ))}
        </div>
      )}
      {encounterAlert && (
        <div
          className={`encounterBanner ${encounterAlert.kind === 'boss' || encounterAlert.kind === 'boss-pattern' ? 'isBoss' : ''}`}
          style={{ '--tone': encounterAlert.color }}
        >
          <span>{encounterAlert.label}</span>
          <strong>{encounterAlert.title}</strong>
          <small>{encounterAlert.hint}</small>
        </div>
      )}
      {bossStatus && (
        <div
          className={`bossBar ${bossStatus.enraged ? 'isEnraged' : ''}`}
          style={{ '--tone': bossStatus.phaseColor, '--pattern': bossStatus.patternColor }}
        >
          <div className="bossBarMeta">
            <span>RIFT BEAST</span>
            <strong>{bossStatus.phaseLabel}</strong>
            <small>Wave {bossStatus.wave}</small>
          </div>
          <div className="bossHpTrack" aria-label="보스 체력">
            <i style={{ width: `${bossStatus.hpPct * 100}%` }} />
          </div>
          <div className="bossPatternMeta">
            <span className="bossPatternCast">{bossStatus.casting ? '시전 중' : '다음'} <b>{bossStatus.patternLabel}</b></span>
            <span className="bossPatternStage">패턴 <b>{bossStatus.patternStage}</b></span>
            <span className="bossPatternHintPill">{bossStatus.patternCue ?? bossStatus.patternHint}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function PauseOverlay({ game, onResume, onRestart }) {
  const dominantBuild = getDominantBuild(game);
  const activeObjectives = getOpeningObjectives(game).filter(objective => !objective.complete).slice(0, 2);
  return (
    <section className="modalLayer pauseLayer" aria-label="게임 일시정지">
      <div className="pausePanel">
        <div>
          <p className="eyebrow">Paused</p>
          <h1>균열이 잠시 멈췄습니다</h1>
        </div>
        <div className="pauseStats">
          <span>생존 <b>{formatTime(game.time)}</b></span>
          <span>Wave <b>{game.wave}</b></span>
          <span>KOs <b>{game.kills}</b></span>
          <span>빌드 <b>{dominantBuild ? dominantBuild.label : '탐색 중'}</b></span>
        </div>
        <div className="controlGrid" aria-label="조작 안내">
          <span><b>WASD</b> 이동</span>
          <span><b>Space</b> 대시</span>
          <span><b>P / Esc</b> 일시정지</span>
          <span><b>마우스</b> 보상 선택</span>
        </div>
        {activeObjectives.length > 0 && (
          <div className="pauseObjectives">
            {activeObjectives.map(objective => (
              <span key={objective.id} style={{ '--tone': objective.color }}>
                {objective.label} <b>{objective.displayValue} / {objective.displayTarget}</b>
              </span>
            ))}
          </div>
        )}
        <div className="pauseActions">
          <button className="primaryButton" type="button" onClick={onResume}>계속하기</button>
          <button className="secondaryButton" type="button" onClick={onRestart}>다시 시작</button>
        </div>
      </div>
    </section>
  );
}

function UpgradeOverlay({ game, choices, onChoose }) {
  const synergyStates = getBuildSynergyStates(game);
  const visibleSynergies = synergyStates
    .filter(synergy => synergy.level > 0 || synergy.progress > 0)
    .slice(0, 3);
  return (
    <section className="modalLayer" aria-label="레벨업 보상 선택">
      <div className="upgradePanel">
        <div className="upgradeHeader">
          <p className="eyebrow">Level Up</p>
          {(game.pendingUpgrades ?? 0) > 1 && <span className="upgradeQueue">보상 {game.pendingUpgrades}</span>}
        </div>
        <h1>룬을 하나 선택하세요</h1>
        {visibleSynergies.length > 0 && (
          <div className="upgradeSynergyStrip" aria-label="빌드 조합 후보">
            {visibleSynergies.map(synergy => (
              <span key={synergy.id} style={{ '--tone': synergy.color }}>
                <strong>{synergy.title}</strong>
                <small>{synergy.label} · {synergy.level > 0 ? `공명 ${formatFocusLevel(synergy.level)}` : '후보'}</small>
              </span>
            ))}
          </div>
        )}
        <div className="upgradeGrid">
          {choices.map(choice => {
            const cardMeta = getUpgradeCardMeta(game, choice);
            const displayTitle = getUpgradeDisplayTitle(game, choice);
            const focusPreview = getUpgradeFocusPreview(game, choice);
            const focusKey = getUpgradeFocusKey(choice);
            const iconMeta = getUpgradeIconMeta(choice);
            return (
              <button
                key={choice.id}
                className={`upgradeCard family-${focusKey ?? 'utility'} ${cardMeta.recommended ? 'isRecommended' : ''}`}
                type="button"
                style={{ '--tone': getUpgradeTone(choice) }}
                aria-label={`${displayTitle}: ${cardMeta.quickSummary}, ${cardMeta.statLine}, ${cardMeta.decision}`}
                onClick={() => onChoose(choice)}
              >
                <div className="upgradePickCue">
                  <em>{choice.family}</em>
                  <strong>{cardMeta.recommended ? `추천 · ${cardMeta.role}` : cardMeta.badge}</strong>
                </div>
                <div className="upgradeTitleRow">
                  <i className="upgradeSigil" aria-hidden="true">{iconMeta.glyph}</i>
                  <span>{displayTitle}</span>
                </div>
                <div className="upgradeOutcomeBand" aria-label="핵심 변화">
                  <small>{cardMeta.quickLead}</small>
                  <strong>{cardMeta.quickSummary}</strong>
                  <span className="upgradeStatLine">{cardMeta.statLine}</span>
                </div>
                <div className="upgradeReasonLine" aria-label="선택 이유">
                  <span>{cardMeta.decision}</span>
                  <b>{cardMeta.reason}</b>
                </div>
                <small className="upgradeEffectText">{choice.text}</small>
                <b className="upgradePathText">{focusPreview}</b>
                <div className="upgradeTags">
                  <i>{choice.branch}</i>
                  {cardMeta.tags.map(tag => <i key={tag}>{tag}</i>)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function EndOverlay({ game, onRestart }) {
  const didWin = game.result === 'victory';
  const dominantBuild = getDominantBuild(game);
  const openingObjectives = getOpeningObjectives(game);
  const completedOpeningObjectives = openingObjectives.filter(objective => objective.complete).length;
  const resultSummary = getRunResultSummary(game);
  return (
    <section className="modalLayer" aria-label="게임 종료">
      <div className="endPanel">
        <p className="eyebrow">{didWin ? 'Rift Sealed' : 'Run Complete'}</p>
        <h1>{didWin ? '5분 생존에 성공했습니다' : '룬이 끊어졌습니다'}</h1>
        <div className="resultStats">
          <span>{formatTime(game.time)}</span>
          <span>Level {game.level}</span>
          <span>{game.kills} KOs</span>
        </div>
        <div className="resultGrade" style={{ '--tone': resultSummary.gradeColor }}>
          <span>Run Grade</span>
          <strong>{resultSummary.grade}</strong>
          <small>{resultSummary.gradeLabel}</small>
        </div>
        <div className="runSummary">
          <span>첫 파동 목표 <b>{completedOpeningObjectives} / {openingObjectives.length}</b></span>
          <span>제단 활성화 <b>{game.shrineActivations ?? 0} / {SHRINE_SITES.length}</b></span>
          <span>정예 처치 <b>{game.eliteKills ?? 0}</b></span>
          <span>보스 처치 <b>{game.bossKills ?? 0}</b></span>
          <span>
            주력 빌드 <b>{dominantBuild ? `${dominantBuild.label} ${formatFocusLevel(dominantBuild.focus)}` : '미완성'}</b>
          </span>
        </div>
        <div className="resultHighlights">
          <span style={{ '--tone': resultSummary.topWeapon.color }}>
            최고 DPS <b>{resultSummary.topWeapon.label}</b>
            <small>{resultSummary.topWeapon.dps} / s</small>
          </span>
          <span style={{ '--tone': resultSummary.synergy.color }}>
            선호 조합 <b>{resultSummary.synergy.title}</b>
            <small>{resultSummary.synergy.detail}</small>
          </span>
          <span style={{ '--tone': '#fff1a6' }}>
            제단 보상 <b>{resultSummary.shrines}</b>
            <small>{resultSummary.shrineLabels}</small>
          </span>
        </div>
        <button className="primaryButton" type="button" onClick={onRestart}>다시 도전</button>
      </div>
    </section>
  );
}

function makeOpenFieldColliders() {
  const colliders = [];

  MAP_CLIFFS.forEach(cliff => {
    colliders.push({
      type: 'box',
      x: cliff.x,
      z: cliff.z,
      w: cliff.w + 1.2,
      d: cliff.d + 1.2
    });
  });

  Array.from({ length: 18 }, (_, index) => {
    const angle = index * 1.17 + 0.42;
    const radius = 32 + (index % 10) * 5.0;
    colliders.push({
      type: 'circle',
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      radius: 1.55 + (index % 4) * 0.28
    });
    return null;
  });

  Array.from({ length: 12 }, (_, index) => {
    const angle = index * Math.PI * 2 / 12 + 0.12;
    const radius = ARENA_RADIUS - 8.5 + (index % 2) * 2.1;
    colliders.push({
      type: 'circle',
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      radius: 2.2
    });
    return null;
  });

  Array.from({ length: 18 }, (_, index) => {
    const angle = index * 0.67 + (index % 5) * 0.13;
    const radius = 76 + (index % 8) * 4.4;
    colliders.push({
      type: 'circle',
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      radius: 1.75
    });
    return null;
  });

  return colliders;
}

function getStaticColliderBounds(collider, padding = 0) {
  if (collider.type === 'circle') {
    const radius = collider.radius + padding;
    return {
      minX: collider.x - radius,
      maxX: collider.x + radius,
      minZ: collider.z - radius,
      maxZ: collider.z + radius
    };
  }

  const halfW = collider.w / 2 + padding;
  const halfD = collider.d / 2 + padding;
  return {
    minX: collider.x - halfW,
    maxX: collider.x + halfW,
    minZ: collider.z - halfD,
    maxZ: collider.z + halfD
  };
}

function makeStaticColliderGrid(colliders) {
  const cells = new Map();
  colliders.forEach((collider, index) => {
    collider.queryId = 0;
    collider.index = index;
    const bounds = getStaticColliderBounds(collider);
    const minCellX = getStaticColliderGridCoord(bounds.minX);
    const maxCellX = getStaticColliderGridCoord(bounds.maxX);
    const minCellZ = getStaticColliderGridCoord(bounds.minZ);
    const maxCellZ = getStaticColliderGridCoord(bounds.maxZ);
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
        const key = getStaticColliderGridKey(cellX, cellZ);
        let bucket = cells.get(key);
        if (!bucket) {
          bucket = [];
          cells.set(key, bucket);
        }
        bucket.push(collider);
      }
    }
  });
  return { cells, queryId: 0 };
}

function forEachStaticColliderNear(pos, radius, visit) {
  const grid = STATIC_COLLIDER_GRID;
  grid.queryId += 1;
  const bounds = {
    minX: pos.x - radius,
    maxX: pos.x + radius,
    minZ: pos.z - radius,
    maxZ: pos.z + radius
  };
  const minCellX = getStaticColliderGridCoord(bounds.minX);
  const maxCellX = getStaticColliderGridCoord(bounds.maxX);
  const minCellZ = getStaticColliderGridCoord(bounds.minZ);
  const maxCellZ = getStaticColliderGridCoord(bounds.maxZ);

  for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      const bucket = grid.cells.get(getStaticColliderGridKey(cellX, cellZ));
      if (!bucket) continue;
      for (const collider of bucket) {
        if (collider.queryId === grid.queryId) continue;
        collider.queryId = grid.queryId;
        if (visit(collider) === false) return false;
      }
    }
  }
  return true;
}

function smoothStep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function mound(x, z, centerX, centerZ, radius, height) {
  const distance = Math.hypot(x - centerX, z - centerZ);
  return height * (1 - smoothStep(radius * 0.18, radius, distance));
}

function trench(x, z, centerX, centerZ, radius, depth) {
  const distance = Math.hypot(x - centerX, z - centerZ);
  return -depth * (1 - smoothStep(radius * 0.12, radius, distance));
}

function ringHeightAt(radius) {
  const centralClearing = -0.08 * (1 - smoothStep(0.0, 22.0, radius));
  const midFieldLift = 0.34 * smoothStep(18.0, 54.0, radius) * (1 - smoothStep(84.0, 112.0, radius));
  const outerRidge = 1.86 * smoothStep(84.0, 112.0, radius) * (1 - smoothStep(126.0, 146.0, radius));
  const farDrop = -1.18 * smoothStep(ARENA_RADIUS + 1.0, ARENA_RADIUS + 19.0, radius);
  return centralClearing + midFieldLift + outerRidge + farDrop;
}

function getTerrainHeight(x, z) {
  const radius = Math.hypot(x, z);
  const angle = Math.atan2(z, x);
  let height = ringHeightAt(radius);

  height += mound(x, z, -45, -20, 36, 1.34);
  height += mound(x, z, 42, 24, 34, 1.16);
  height += mound(x, z, 15, -52, 30, 1.02);
  height += mound(x, z, -18, 51, 32, 0.92);
  height += mound(x, z, 64, -58, 38, 1.08);
  height += mound(x, z, -78, 42, 40, 1.0);
  height += trench(x, z, -10, 44, 38, 0.52);
  height += trench(x, z, 42, -16, 46, 0.42);
  height += trench(x, z, -58, -52, 36, 0.34);

  const northShelf = 0.68 * smoothStep(24.0, 52.0, -z) * (1 - smoothStep(82.0, 112.0, -z)) * (1 - smoothStep(46.0, 84.0, Math.abs(x + 4)));
  const westShoulder = 0.55 * smoothStep(34.0, 64.0, -x) * (1 - smoothStep(92.0, 118.0, -x)) * (1 - smoothStep(48.0, 86.0, Math.abs(z + 9)));
  const windRoll = 0.16 * Math.sin(x * 0.055 + z * 0.032) + 0.12 * Math.cos(z * 0.06 - x * 0.024);
  const radialRidges = 0.22 * smoothStep(28.0, 68.0, radius) * (1 - smoothStep(104.0, 126.0, radius)) * Math.max(0, Math.sin(angle * 3.0 + radius * 0.052));

  return height + northShelf + westShoulder + windRoll + radialRidges;
}

function terrainSurfaceNoise(x, z) {
  const broad = Math.sin(x * 0.12 + z * 0.055) * 0.08;
  const cross = Math.cos(z * 0.16 - x * 0.045) * 0.06;
  const chipped = Math.sin((x + z) * 0.36) * Math.cos((x - z) * 0.24) * 0.022;
  return broad + cross + chipped;
}

function getVisualTerrainHeight(x, z) {
  const radius = Math.hypot(x, z);
  const angle = Math.atan2(z, x);
  const walkableNoise = terrainSurfaceNoise(x, z) * smoothStep(9.0, 19.0, radius) * (1 - smoothStep(ARENA_RADIUS - 1.5, ARENA_RADIUS + 10.0, radius));
  const erodedEdge = -0.96 * smoothStep(ARENA_RADIUS - 1.0, ARENA_RADIUS + 14.0, radius);
  const broadGameTrail = -0.09 * smoothStep(12.0, 24.0, radius) * (1 - smoothStep(42.0, 60.0, radius)) * smoothStep(0.72, 0.96, Math.abs(Math.sin(angle * 2.0 + radius * 0.038)));
  const drainage = -0.12 * smoothStep(20.0, 36.0, radius) * (1 - smoothStep(55.0, 70.0, radius)) * Math.max(0, Math.cos(angle * 3.0 - 0.65));
  return getTerrainHeight(x, z) + walkableNoise + erodedEdge + broadGameTrail + drainage;
}

function getPlayerTerrainY(x, z) {
  return 0.55 + getTerrainHeight(x, z);
}

function getEnemyTerrainY(x, z) {
  return 0.02 + getTerrainHeight(x, z);
}

function resolveStaticCollisions(pos, radius) {
  forEachStaticColliderNear(pos, radius, collider => {
    if (collider.type === 'circle') {
      const dx = pos.x - collider.x;
      const dz = pos.z - collider.z;
      const minDistance = radius + collider.radius;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq < minDistance * minDistance) {
        const distance = Math.max(0.001, Math.sqrt(distanceSq));
        const push = (minDistance - distance) / distance;
        pos.x += dx * push;
        pos.z += dz * push;
      }
      return;
    }

    const halfW = collider.w / 2 + radius;
    const halfD = collider.d / 2 + radius;
    const dx = pos.x - collider.x;
    const dz = pos.z - collider.z;
    const overlapX = halfW - Math.abs(dx);
    const overlapZ = halfD - Math.abs(dz);
    if (overlapX > 0 && overlapZ > 0) {
      if (overlapX < overlapZ) {
        pos.x += Math.sign(dx || 1) * overlapX;
      } else {
        pos.z += Math.sign(dz || 1) * overlapZ;
      }
    }
  });
}

function hitsStaticCollider(pos, radius) {
  let hit = false;
  forEachStaticColliderNear(pos, radius, collider => {
    if (collider.type === 'circle') {
      const dx = pos.x - collider.x;
      const dz = pos.z - collider.z;
      const minDistance = radius + collider.radius;
      if (dx * dx + dz * dz < minDistance * minDistance) {
        hit = true;
        return false;
      }
      return true;
    }
    const halfW = collider.w / 2 + radius;
    const halfD = collider.d / 2 + radius;
    if (Math.abs(pos.x - collider.x) < halfW && Math.abs(pos.z - collider.z) < halfD) {
      hit = true;
      return false;
    }
    return true;
  });
  return hit;
}

function getWaveProfile(wave) {
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

function getWaveThreat(wave, waveProfile = getWaveProfile(wave)) {
  return Math.min(99, Math.round(26 + wave * 5.2 + (waveProfile.runner + waveProfile.brute) * 58));
}

function getCombatRhythm(game) {
  return COMBAT_RHYTHM.find(phase => game.time < phase.until) ?? COMBAT_RHYTHM[COMBAT_RHYTHM.length - 1];
}

function getCrisisState(game) {
  if (game.time >= 245) return { level: 4, label: 'FINAL SURGE' };
  if (game.time >= 195) return { level: 3, label: 'ELITE SURGE' };
  if (game.time >= 150) return { level: 2, label: 'RIFT SURGE' };
  if (game.time >= 120) return { level: 1, label: 'RIFT RISING' };
  return { level: 0, label: '' };
}

function getBossPhaseMeta(hpPct, enraged = false) {
  if (enraged || hpPct <= 0.5) return { label: 'RAGE', color: '#ff8b72' };
  if (hpPct <= 0.75) return { label: 'PRESSURE', color: '#fff1a6' };
  return { label: 'OPENING', color: '#70d6ff' };
}

function getDirectorPressure(game) {
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

function getEnemyMovePressure(game) {
  const rhythm = getCombatRhythm(game);
  if (game.time >= 245) return 1.18 * rhythm.move;
  if (game.time >= 195) return 1.12 * rhythm.move;
  if (game.time >= 150) return 1.06 * rhythm.move;
  if (game.time >= 120) return 1.02 * rhythm.move;
  return rhythm.move;
}

function getEnemyDamagePressure(game) {
  const rhythm = getCombatRhythm(game);
  if (game.time >= 245) return 1.42 * rhythm.damage;
  if (game.time >= 195) return 1.3 * rhythm.damage;
  if (game.time >= 150) return 1.16 * rhythm.damage;
  if (game.time >= 120) return 1.06 * rhythm.damage;
  return rhythm.damage;
}

function getEnemyAbilityScale(game) {
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

function getFieldItemDropPosition(playerPos, baseDistance = 10, spread = 30) {
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

function pickFieldItemType(game) {
  const hpRatio = game.stats.hp / game.stats.maxHp;
  const roll = Math.random();
  if (hpRatio < 0.45 && roll < 0.34) return 'heal';
  if (game.time >= 120 && game.time < 170 && roll < 0.07) return 'cache';
  if (game.time >= 170 && roll < 0.16) return 'cache';
  if (roll < 0.5) return 'magnet';
  if (roll < (game.time < 75 ? 0.58 : 0.68)) return 'overload';
  if (roll < 0.86) return 'purge';
  return hpRatio < 0.82 ? 'heal' : 'magnet';
}

function createFieldItem(type, pos) {
  const life = type === 'purge' || type === 'overload' ? 58 : type === 'cache' ? 52 : 48;
  return {
    type,
    pos,
    pulse: Math.random() * Math.PI * 2,
    life,
    maxLife: life
  };
}

function createEnemy(wave, waveProfile = getWaveProfile(wave), playerPos = new THREE.Vector3()) {
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

function applyCombatRhythm(enemy, rhythm = COMBAT_RHYTHM[0]) {
  enemy.hp *= rhythm.hp;
  enemy.maxHp *= rhythm.hp;
  return enemy;
}

function createElite(minuteMark, wave, playerPos = new THREE.Vector3()) {
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

function createBoss(wave, playerPos = new THREE.Vector3()) {
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

function createSummonedRunner(source, wave, playerPos = new THREE.Vector3(), index = 0) {
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

function createSplitRunner(source, wave, playerPos = new THREE.Vector3(), index = 0) {
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

function applyDamageToEnemy(enemy, damage, source = 'generic') {
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

function getEnemyAccentColor(enemy) {
  if (typeof enemy === 'string') return getSpawnColor(enemy);
  if (enemy.kind === 'elite') return ELITE_ROLE_META[enemy.role]?.color ?? FIELD_ITEM_META.overload.color;
  if (enemy.kind === 'boss') return enemy.bossGuard > 0 ? BOSS_PATTERN_META.guard.color : '#ffdf6e';
  if (enemy.affix) return getAffixEnemyColor(enemy.affix, enemy.kind);
  return getSpawnColor(enemy.kind);
}

function getEnemyDisplayName(enemy) {
  if (enemy.kind === 'boss') return enemy.bossGuard > 0 ? 'RIFT WARDEN' : 'RIFT BEAST';
  if (enemy.kind === 'elite') return `RIFT ${ELITE_ROLE_META[enemy.role]?.label ?? 'ELITE'}`;
  return '';
}

function getSpawnColor(kind) {
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

function getWeaponStage(game) {
  return Math.min(3, Math.max(0, Math.floor((game.level - 1) / 2.2) + Math.floor(game.upgrades.length / 4)));
}

function getWeaponTier(stats, stage = 0) {
  return Math.min(2.35, 1 + stage * 0.18 + (stats.damage - 1) * 0.26 + stats.pierce * 0.08 + (1 - stats.cooldown) * 0.16);
}

function getOrbColor(stats, stage = 0) {
  if (stage >= 3) return '#fff1a6';
  if (stage >= 2) return '#c7f9ff';
  if (stage >= 1) return '#7fffd7';
  if (stats.damage > 1.45) return '#ffef9a';
  if (stats.pierce > 1) return '#c7f9ff';
  return weaponCatalog[0].color;
}

function getStormColor(stats, stage = 0) {
  if (stage >= 3) return '#f5c7ff';
  if (stage >= 2) return '#fff1a6';
  if (stats.cooldown < 0.72) return '#d7b7ff';
  if (stats.damage > 1.35) return '#fff1a6';
  return weaponCatalog[1].color;
}

function getBladeColor(stats, stage = 0) {
  if (stage >= 3) return '#ffffff';
  if (stage >= 2) return '#ffe58a';
  if (stats.damage > 1.35) return '#ffdf6e';
  return weaponCatalog[2].color;
}

function getLightningColor(stats, stage = 0) {
  if (stage >= 3) return '#ffffff';
  if (stage >= 2) return '#f5c7ff';
  if (stats.lightningChains >= 5) return '#c7f9ff';
  return weaponCatalog[3].color;
}

function getNovaColor(stats, stage = 0) {
  if (stage >= 3) return '#fff1a6';
  if (stage >= 2) return '#ffbf7a';
  if (stats.novaRadius > 1.35) return '#ffd27f';
  return weaponCatalog[4].color;
}

function getWeaponEvolutionName(stage = 0) {
  if (stage >= 3) return '초월';
  if (stage >= 2) return '진화';
  if (stage >= 1) return '각성';
  return '기본';
}

function getBladeCount(stats, bladeFocus = 0, unlocked = true) {
  if (!unlocked) return 0;
  return Math.min(MAX_ORBIT_BLADES, 2 + stats.bladeBonus + Math.floor(stats.pierce / 2) + Math.floor(bladeFocus / 2) + (stats.damage > 1.5 ? 1 : 0));
}

function hasUpgrade(game, id) {
  return game.upgrades.includes(id);
}

function getWeaponBuildLabel(game, family) {
  const stageName = getWeaponEvolutionName(getWeaponStage(game));
  if (family === 'orb') {
    if (hasUpgrade(game, 'orb-fan')) return `분열진 ${game.stats.orbCount}발`;
    if (hasUpgrade(game, 'orb-lance')) return `룬창 관통 ${game.stats.pierce + 1}`;
    return `${stageName} ${game.stats.orbCount}발`;
  }
  if (family === 'storm') {
    if (!isWeaponFamilyUnlocked(game, family)) return '미개방';
    if (hasUpgrade(game, 'storm-volley')) return `낙뢰 ${game.stats.stormStrikes}연`;
    if (hasUpgrade(game, 'storm-carpet')) return `잔류 x${game.stats.stormDuration.toFixed(1)}`;
    return `${stageName} x${game.stats.stormRadius.toFixed(1)}`;
  }
  if (family === 'blade') {
    if (!isWeaponFamilyUnlocked(game, family)) return '미개방';
    const bladeFocus = getBuildFocus(game, 'blade');
    if (hasUpgrade(game, 'blade-guard')) return `수호 ${getBladeCount(game.stats, bladeFocus)}연`;
    if (hasUpgrade(game, 'blade-reaper')) return `사신 x${game.stats.bladeDamage.toFixed(1)}`;
    return `${getBladeCount(game.stats, bladeFocus)}연`;
  }
  if (family === 'chain') {
    if (!isWeaponFamilyUnlocked(game, family)) return '미개방';
    if (hasUpgrade(game, 'chain-web')) return `전류망 ${game.stats.lightningChains}연쇄`;
    if (hasUpgrade(game, 'chain-smite')) return `처형 x${(1 + game.stats.lightningExecute * 0.34).toFixed(1)}`;
    return `${game.stats.lightningChains}연쇄`;
  }
  if (family === 'nova') {
    if (!isWeaponFamilyUnlocked(game, family)) return '미개방';
    if (hasUpgrade(game, 'nova-pulse')) return `쌍파동 x${game.stats.novaPulse}`;
    if (hasUpgrade(game, 'nova-comet')) return `핵심 x${game.stats.novaDamage.toFixed(1)}`;
    return `x${game.stats.novaRadius.toFixed(1)}`;
  }
  return stageName;
}

function createEmptyItemPickups() {
  return { magnet: 0, purge: 0, heal: 0, overload: 0, cache: 0 };
}

function createInitialShrines() {
  return SHRINE_SITES.map(site => {
    const x = Math.cos(site.angle) * site.radius;
    const z = Math.sin(site.angle) * site.radius;
    return {
      ...site,
      pos: new THREE.Vector3(x, getPlayerTerrainY(x, z) + 0.06, z),
      channel: 0,
      activated: false,
      prompted: false,
      pulse: Math.random() * Math.PI * 2
    };
  });
}

function getItemPickupCount(game, type) {
  return game?.itemPickups?.[type] ?? 0;
}

function withItemPickup(game, type) {
  const itemPickups = { ...createEmptyItemPickups(), ...(game.itemPickups ?? {}) };
  itemPickups[type] = (itemPickups[type] ?? 0) + 1;
  return { ...game, itemPickups };
}

function withShrineActivation(game, shrineId) {
  return {
    ...game,
    shrineActivations: (game.shrineActivations ?? 0) + 1,
    activatedShrines: {
      ...(game.activatedShrines ?? {}),
      [shrineId]: true
    }
  };
}

function getShrineHint(game) {
  if ((game.shrineActivations ?? 0) >= SHRINE_SITES.length) return null;
  const playerPos = game.playerPos ?? { x: 0, z: 0 };
  const activeMap = game.activatedShrines ?? {};
  let nearest = null;
  for (const shrine of SHRINE_SITES) {
    if (activeMap[shrine.id]) continue;
    const x = Math.cos(shrine.angle) * shrine.radius;
    const z = Math.sin(shrine.angle) * shrine.radius;
    const dx = x - playerPos.x;
    const dz = z - playerPos.z;
    const distance = Math.hypot(dx, dz);
    if (!nearest || distance < nearest.distance) {
      nearest = { ...shrine, distance, dx, dz };
    }
  }
  if (!nearest) return null;
  return {
    label: nearest.label,
    distance: Math.round(nearest.distance),
    direction: formatCompassDirection(nearest.dx, nearest.dz)
  };
}

function formatCompassDirection(dx, dz) {
  const angle = Math.atan2(dz, dx);
  const directions = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const index = Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % directions.length;
  return directions[index];
}

function getOpeningObjectives(game) {
  return OPENING_OBJECTIVES.map(objective => {
    const value = Math.min(objective.target, objective.getValue(game));
    const progress = THREE.MathUtils.clamp(value / objective.target, 0, 1);
    return {
      ...objective,
      value,
      progress,
      complete: progress >= 1,
      displayValue: objective.id === 'first-surge' ? `${Math.floor(value)}s` : Math.floor(value),
      displayTarget: objective.id === 'first-surge' ? `${objective.target}s` : objective.target
    };
  });
}

function getOnboardingSteps(game) {
  return ONBOARDING_STEPS.map(step => {
    const value = Math.min(step.target, step.getValue(game));
    const progress = THREE.MathUtils.clamp(value / step.target, 0, 1);
    return {
      ...step,
      value,
      progress,
      complete: progress >= 1,
      displayValue: step.id === 'move' ? Math.floor(value) : Math.ceil(value),
      displayTarget: step.target
    };
  });
}

function getFirstSessionCue(game, onboardingSteps, activeObjectives) {
  const nextStep = onboardingSteps.find(step => !step.complete);
  const nextObjective = activeObjectives[0];
  const fallbackProgress = nextObjective?.progress ?? 0;

  if (!nextStep && !nextObjective) return null;

  if (!nextStep) {
    return getObjectiveCue(nextObjective, fallbackProgress);
  }

  const base = {
    stepId: nextStep.id,
    color: nextStep.color,
    action: nextStep.label,
    progress: nextStep.progress
  };

  if (game.time > 108 && getItemPickupCount(game, 'cache') < 1) {
    return {
      ...base,
      stepId: 'cache',
      color: '#fff1a6',
      title: '첫 무기 보급',
      body: '노란 보급 룬을 지나가면 새 무기 후보가 열립니다',
      detail: '초반 화력은 무기 수보다 선택 타이밍이 중요합니다',
      action: '보급 룬 회수',
      progress: Math.min(1, Math.max(fallbackProgress, (game.time - 108) / 24))
    };
  }

  switch (nextStep.id) {
    case 'move':
      return {
        ...base,
        title: '먼저 움직임',
        body: '적을 끌고 원을 그리며 안전 공간을 만드세요',
        detail: '멈추면 포위가 빨라집니다',
        progress: nextStep.progress
      };
    case 'dash':
      return {
        ...base,
        title: '위험하면 대시',
        body: '포위가 좁아질 때 Space로 한 번 빠져나오세요',
        detail: 'Ready 표시가 켜지면 다시 쓸 수 있습니다',
        progress: nextStep.progress
      };
    case 'xp':
      return {
        ...base,
        title: '푸른 XP 회수',
        body: '푸른 조각을 지나가 첫 카드 선택까지 성장하세요',
        detail: 'XP를 놓치면 초반 화력이 늦게 열립니다',
        progress: nextStep.progress
      };
    case 'cache':
      return {
        ...base,
        title: '무기 보급 찾기',
        body: '노란 보급 룬을 회수하면 빌드 방향이 정해집니다',
        detail: '처음부터 강한 무기보다 성장 선택이 핵심입니다',
        progress: nextStep.progress
      };
    default:
      return getObjectiveCue(nextObjective, fallbackProgress);
  }
}

function getObjectiveCue(objective, progress = 0) {
  if (!objective) return null;

  const cueMap = {
    'first-blood': {
      title: '첫 처치 목표',
      body: '구체가 닿도록 거리를 유지하며 적을 정리하세요',
      detail: '무리 안으로 들어가지 말고 가장자리를 깎습니다',
      action: objective.label
    },
    'magnet-flow': {
      title: '자석 룬 회수',
      body: '푸른 자석 룬은 놓친 XP를 한 번에 당겨옵니다',
      detail: '레벨업 카드가 늦으면 자석을 먼저 챙기세요',
      action: objective.label
    },
    'armory-seed': {
      title: '무기 보급 찾기',
      body: '노란 보급 룬이 보이면 안전한 방향으로 접근하세요',
      detail: '새 무기는 다음 파동을 버티는 기준점입니다',
      action: objective.label
    },
    'first-etching': {
      title: '첫 각인 완성',
      body: '레벨 3까지 성장하면 빌드 색이 뚜렷해집니다',
      detail: '추천 카드는 현재 화력 부족을 기준으로 표시됩니다',
      action: objective.label
    },
    'first-surge': {
      title: '첫 파동 버티기',
      body: '90초까지 살아남으면 초반 흐름이 안정됩니다',
      detail: '무리 중앙이 아니라 외곽으로 계속 빠지세요',
      action: objective.label
    }
  };
  const cue = cueMap[objective.id] ?? cueMap['first-blood'];

  return {
    ...cue,
    stepId: objective.id,
    color: objective.color,
    progress
  };
}

function createEmptyRunStats() {
  return {
    totalDamage: 0,
    damageBySource: Object.fromEntries(Object.keys(DAMAGE_SOURCE_META).map(source => [source, 0]))
  };
}

function getTopDamageSource(game) {
  const damageBySource = { ...createEmptyRunStats().damageBySource, ...(game?.runStats?.damageBySource ?? {}) };
  const [source, damage] = Object.entries(damageBySource)
    .filter(([key]) => key !== 'generic')
    .sort((a, b) => b[1] - a[1])[0] ?? ['generic', 0];
  const meta = DAMAGE_SOURCE_META[source] ?? DAMAGE_SOURCE_META.generic;
  const dps = game?.time > 0 ? damage / Math.max(1, game.time) : 0;
  return {
    source,
    damage,
    dps: dps.toFixed(1),
    ...meta
  };
}

function getRunGrade(game) {
  const survivalScore = Math.min(40, game.time / RUN_DURATION * 40);
  const killScore = Math.min(24, (game.kills ?? 0) / 180 * 24);
  const bossScore = Math.min(16, (game.bossKills ?? 0) * 8 + (game.eliteKills ?? 0) * 2);
  const shrineScore = Math.min(10, (game.shrineActivations ?? 0) / SHRINE_SITES.length * 10);
  const synergyScore = Math.min(10, getBuildSynergyStates(game).filter(synergy => synergy.level > 0).length * 4);
  const total = survivalScore + killScore + bossScore + shrineScore + synergyScore;
  if (total >= 88) return { grade: 'S', label: '균열 지배', color: '#fff1a6' };
  if (total >= 74) return { grade: 'A', label: '전투 완성', color: '#73fbd3' };
  if (total >= 58) return { grade: 'B', label: '빌드 성립', color: '#70d6ff' };
  if (total >= 42) return { grade: 'C', label: '성장 중', color: '#d8b2ff' };
  return { grade: 'D', label: '재정비 필요', color: '#ff8b72' };
}

function getActivatedShrineLabels(game) {
  const activated = game?.activatedShrines ?? {};
  const labels = SHRINE_SITES
    .filter(shrine => activated[shrine.id])
    .map(shrine => shrine.label);
  return labels.length > 0 ? labels.join(' · ') : '미활성';
}

function getRunResultSummary(game) {
  const topWeapon = getTopDamageSource(game);
  const synergy = getBuildSynergyStates(game).find(item => item.level > 0);
  const grade = getRunGrade(game);
  return {
    grade: grade.grade,
    gradeLabel: grade.label,
    gradeColor: grade.color,
    topWeapon,
    synergy: synergy
      ? { ...synergy, detail: `${synergy.label} ${formatFocusLevel(synergy.level)}` }
      : { title: '미완성', label: '조합 없음', detail: '다음 런에서 조합 완성', color: '#d8b2ff' },
    shrines: `${game.shrineActivations ?? 0} / ${SHRINE_SITES.length}`,
    shrineLabels: getActivatedShrineLabels(game)
  };
}

function createEmptyBuildFocus() {
  return { orb: 0, storm: 0, blade: 0, chain: 0, nova: 0 };
}

function getUpgradeFocusKey(upgrade) {
  if (!upgrade) return null;
  if (upgrade.id.startsWith('orb') || upgrade.id === 'pierce') return 'orb';
  if (upgrade.id.startsWith('storm')) return 'storm';
  if (upgrade.id.startsWith('blade')) return 'blade';
  if (upgrade.id.startsWith('chain')) return 'chain';
  if (upgrade.id.startsWith('nova')) return 'nova';
  return null;
}

function isWeaponFamilyUnlocked(game, key) {
  if (!key) return true;
  if (STARTING_WEAPON_FAMILIES.has(key)) return true;
  if (getBuildFocus(game, key) > 0) return true;
  return game?.upgrades?.some(upgradeId => getUpgradeFocusKey({ id: upgradeId }) === key) ?? false;
}

function applyBuildFocus(buildFocus, key) {
  const next = { ...createEmptyBuildFocus(), ...(buildFocus ?? {}) };
  if (key && next[key] !== undefined) next[key] += 1;
  return next;
}

function getBuildFocus(game, key) {
  return Math.max(0, game?.buildFocus?.[key] ?? 0);
}

function getFocusMessage(key, buildFocus) {
  if (!key || !BUILD_FOCUS_META[key]) return '';
  const focus = buildFocus?.[key] ?? 0;
  const meta = BUILD_FOCUS_META[key];
  return `${meta.label} 집중 ${formatFocusLevel(focus)}: ${meta.perks[Math.min(meta.perks.length - 1, focus - 1)]}`;
}

function getDominantBuild(game) {
  const entries = Object.entries({ ...createEmptyBuildFocus(), ...(game.buildFocus ?? {}) })
    .filter(([, focus]) => focus > 0)
    .sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const [key, focus] = entries[0];
  return { key, focus, ...BUILD_FOCUS_META[key] };
}

function getSynergyLevelFromFocus(game, synergy, focusMap = game?.buildFocus) {
  const focus = { ...createEmptyBuildFocus(), ...(focusMap ?? {}) };
  if (synergy.id === 'orb-pierce') {
    const pierceRanks = getUpgradePickCount(game, 'pierce') + getUpgradePickCount(game, 'orb-lance');
    return Math.min(4, Math.max(0, focus.orb - 1) + pierceRanks);
  }
  return Math.min(4, ...synergy.keys.map(key => focus[key] ?? 0));
}

function getSynergyLevel(game, synergyId) {
  const synergy = BUILD_SYNERGIES.find(item => item.id === synergyId);
  return synergy ? getSynergyLevelFromFocus(game, synergy) : 0;
}

function getBuildSynergyStates(game) {
  const focus = { ...createEmptyBuildFocus(), ...(game?.buildFocus ?? {}) };
  return BUILD_SYNERGIES.map(synergy => {
    const level = getSynergyLevelFromFocus(game, synergy, focus);
    const progress = synergy.id === 'orb-pierce'
      ? Math.min(1, (focus.orb + getUpgradePickCount(game, 'pierce') + getUpgradePickCount(game, 'orb-lance')) / 3)
      : Math.min(1, synergy.keys.reduce((sum, key) => sum + Math.min(2, focus[key] ?? 0), 0) / (synergy.keys.length * 2));
    return { ...synergy, level, progress };
  }).sort((a, b) => (b.level - a.level) || (b.progress - a.progress));
}

function getUpgradeSynergyMatches(game, upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  const nextFocus = applyBuildFocus(game?.buildFocus, key);
  return BUILD_SYNERGIES
    .map(synergy => {
      const currentLevel = getSynergyLevelFromFocus(game, synergy);
      let nextLevel = getSynergyLevelFromFocus(game, synergy, nextFocus);
      if (synergy.id === 'orb-pierce' && (upgrade.id === 'pierce' || upgrade.id === 'orb-lance')) {
        nextLevel = Math.min(4, nextLevel + 1);
      }
      return { ...synergy, currentLevel, nextLevel };
    })
    .filter(synergy => {
      if (synergy.nextLevel > synergy.currentLevel) return true;
      if (synergy.id === 'orb-pierce' && (upgrade.id === 'pierce' || upgrade.id === 'orb-lance')) return true;
      return key && synergy.keys.includes(key) && synergy.currentLevel > 0;
    })
    .sort((a, b) => (b.nextLevel - b.currentLevel) - (a.nextLevel - a.currentLevel));
}

function getUpgradeTone(upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  return key ? BUILD_FOCUS_META[key].color : '#fff1a6';
}

function getUpgradeIconMeta(upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  if (key && BUILD_FOCUS_META[key]) return BUILD_FOCUS_META[key];
  if (upgrade.id === 'maxHp') return { glyph: '+', color: '#79f29a' };
  if (upgrade.id === 'dash' || upgrade.id === 'speed') return { glyph: '›', color: '#73fbd3' };
  if (upgrade.id === 'magnet' || upgrade.id === 'luck') return { glyph: '✦', color: '#fff1a6' };
  return { glyph: '✚', color: '#fff1a6' };
}

function getUpgradeFocusPreview(game, upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  const synergy = getUpgradeSynergyMatches(game, upgrade)[0];
  const unlocksWeapon = key && !isWeaponFamilyUnlocked(game, key);
  if (synergy && synergy.nextLevel > synergy.currentLevel) {
    return `${synergy.title} ${formatFocusLevel(synergy.nextLevel)} - ${synergy.bonus}`;
  }
  if (!key) return '공용 강화';
  const focus = getBuildFocus(game, key) + 1;
  const meta = BUILD_FOCUS_META[key];
  if (unlocksWeapon) return `신규 무기 해금 - ${meta.label} ${meta.perks[0]}`;
  return `${meta.title} ${formatFocusLevel(focus)} - ${meta.perks[Math.min(meta.perks.length - 1, focus - 1)]}`;
}

function getUpgradeImpactLabel(upgrade) {
  if (upgrade.id.includes('count') || upgrade.id.includes('fan') || upgrade.id.includes('volley') || upgrade.id.includes('plus') || upgrade.id.includes('web')) {
    return '타수 증가';
  }
  if (upgrade.id.includes('burst') || upgrade.id.includes('carpet') || upgrade.id.includes('nova') || upgrade.id.includes('reaper')) {
    return '범위 압박';
  }
  if (upgrade.id.includes('lance') || upgrade.id === 'pierce') return '관통 강화';
  if (upgrade.id.includes('guard') || upgrade.id === 'maxHp') return '생존 보강';
  if (upgrade.id.includes('smite') || upgrade.id === 'damage') return '피해 상승';
  if (upgrade.id === 'cooldown' || upgrade.id === 'dash' || upgrade.id === 'speed') return '속도 상승';
  if (upgrade.id === 'magnet' || upgrade.id === 'luck') return '성장 가속';
  return upgrade.branch;
}

function getUpgradeDecisionCopy(game, upgrade, context) {
  const { key, dominant, focus, primarySynergy, improvesSynergy, unlocksWeapon, pickCount } = context;
  if (unlocksWeapon && key) {
    return { decision: '새 공격 루트', payoff: `${BUILD_FOCUS_META[key].label} 해금` };
  }
  if (improvesSynergy && primarySynergy) {
    return { decision: '공명 단계 상승', payoff: primarySynergy.bonus };
  }
  if (upgrade.id === 'maxHp' && game.stats.hp / game.stats.maxHp < 0.72) {
    return { decision: '위험 완화', payoff: '체력 안정' };
  }
  if (upgrade.id === 'magnet' && game.level <= 4) {
    return { decision: '초반 성장', payoff: 'XP 회수 쉬움' };
  }
  if (upgrade.id === 'damage' || upgrade.id === 'cooldown') {
    return { decision: '전체 효율', payoff: '모든 무기 강화' };
  }
  if (key && dominant?.key === key && dominant.focus >= 2) {
    return { decision: '주력 빌드', payoff: `${BUILD_FOCUS_META[key].label} 집중` };
  }
  if (key && focus === 0) {
    return { decision: '새 빌드 후보', payoff: `${BUILD_FOCUS_META[key].label} 시작` };
  }
  if (pickCount > 0) {
    return { decision: '중첩 강화', payoff: `Rank ${formatFocusLevel(pickCount + 1)}` };
  }
  if (upgrade.id === 'dash' || upgrade.id === 'speed') return { decision: '회피 안정', payoff: '기동력 증가' };
  if (upgrade.id === 'luck') return { decision: '성장 투자', payoff: '보상 기대값 증가' };
  if (key) return { decision: '집중도 상승', payoff: `${BUILD_FOCUS_META[key].label} 강화` };
  return { decision: upgrade.branch, payoff: getUpgradeImpactLabel(upgrade) };
}

function getUpgradeStatLine(upgrade) {
  const statLines = {
    'orb-count': '룬 구체 +1발',
    'orb-fan': '구체 +2 / 피해 -6%',
    'orb-lance': '피해 +32% / 관통 +1',
    'storm-burst': '범위 +18% / 피해 +8%',
    'storm-volley': '낙뢰 +1 / 쿨다운 단축',
    'storm-carpet': '지속 +30% / 범위 +14%',
    'blade-plus': '칼날 +1',
    'blade-guard': '칼날 +2 / 근접 방어',
    'blade-reaper': '피해 +34% / 범위 +18%',
    'chain-plus': '연쇄 +1 / 피해 +8%',
    'chain-web': '연쇄 +3 / 사거리 +18%',
    'chain-smite': '부상 적 추가 피해',
    'nova-plus': '범위 +20% / 피해 +8%',
    'nova-pulse': '쿨다운 -14% / 연타',
    'nova-comet': '피해 +38% / 범위 +12%',
    damage: '모든 피해 +16%',
    speed: '이동 속도 +12%',
    cooldown: '공격 간격 -10%',
    magnet: 'XP 흡수 거리 +35%',
    luck: 'XP 획득량 +18%',
    dash: '대시 쿨다운 -18%',
    maxHp: '최대 체력 +20',
    pierce: '구체 관통 +1'
  };
  return statLines[upgrade.id] ?? upgrade.text;
}

function getUpgradeQuickRead(game, upgrade, context, decisionCopy) {
  const { key, dominant, focus, primarySynergy, improvesSynergy, unlocksWeapon, pickCount } = context;
  const meta = key ? BUILD_FOCUS_META[key] : null;

  if (unlocksWeapon && meta) {
    return { quickLead: '새 무기', quickSummary: `${meta.label}가 전장에 추가됩니다` };
  }
  if (improvesSynergy && primarySynergy) {
    return { quickLead: '공명 상승', quickSummary: `${primarySynergy.title} ${formatFocusLevel(primarySynergy.nextLevel)} 발동` };
  }
  if (upgrade.id === 'maxHp' && game.stats.hp / game.stats.maxHp < 0.72) {
    return { quickLead: '생존 보강', quickSummary: '죽기 전 버틸 시간을 늘립니다' };
  }
  if (upgrade.id === 'magnet' && game.level <= 4) {
    return { quickLead: '성장 가속', quickSummary: '놓친 XP를 더 쉽게 회수합니다' };
  }
  if (upgrade.id === 'damage') {
    return { quickLead: '전체 화력', quickSummary: '모든 공격의 피해가 오릅니다' };
  }
  if (upgrade.id === 'cooldown') {
    return { quickLead: '공격 속도', quickSummary: '무기들이 더 자주 발동됩니다' };
  }
  if (upgrade.id === 'dash' || upgrade.id === 'speed') {
    return { quickLead: '회피 안정', quickSummary: '포위망에서 빠져나오기 쉬워집니다' };
  }
  if (upgrade.id === 'luck') {
    return { quickLead: '보상 투자', quickSummary: '다음 선택지의 기대값을 올립니다' };
  }
  if (meta && dominant?.key === key && dominant.focus >= 2) {
    return { quickLead: '주력 강화', quickSummary: `${meta.label} 빌드의 힘을 밀어줍니다` };
  }
  if (meta && focus === 0) {
    return { quickLead: '빌드 시작', quickSummary: `${meta.label} 방향으로 전환합니다` };
  }
  if (pickCount > 0) {
    return { quickLead: '중첩 강화', quickSummary: `${upgrade.family} ${formatFocusLevel(pickCount + 1)}단계 상승` };
  }
  if (meta) {
    return { quickLead: getUpgradeImpactLabel(upgrade), quickSummary: `${meta.label} 전투 성능을 높입니다` };
  }
  return { quickLead: decisionCopy.decision, quickSummary: decisionCopy.payoff };
}

function getUpgradeCardMeta(game, upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  const dominant = getDominantBuild(game);
  const focus = key ? getBuildFocus(game, key) : 0;
  const pickCount = getUpgradePickCount(game, upgrade.id);
  const synergyMatches = getUpgradeSynergyMatches(game, upgrade);
  const primarySynergy = synergyMatches[0];
  const improvesSynergy = primarySynergy ? primarySynergy.nextLevel > primarySynergy.currentLevel : false;
  const unlocksWeapon = key && !isWeaponFamilyUnlocked(game, key);
  const tags = [];
  let role = WEAPON_UPGRADE_IDS.has(upgrade.id) ? '무기 성장' : '공용 강화';

  if (unlocksWeapon) {
    role = '새 무기 해금';
    tags.push('신규 무기');
  } else if (key && STARTING_WEAPON_FAMILIES.has(key) && focus === 0) {
    role = '기본 무기 강화';
    tags.push('초반 안정');
  } else if (improvesSynergy) {
    role = '조합 완성';
    tags.push(primarySynergy.title);
  } else if (primarySynergy) {
    role = '조합 강화';
    tags.push(primarySynergy.label);
  } else if (key && dominant?.key === key && dominant.focus >= 1) {
    role = '주력 강화';
    tags.push('시너지');
  } else if (key && focus === 0) {
    role = '새 빌드';
    tags.push('선택지 확장');
  } else if (key) {
    role = '집중 강화';
    tags.push('빌드 집중');
  }

  if (upgrade.id === 'maxHp' || upgrade.id === 'dash' || upgrade.id === 'speed') {
    role = '생존';
    tags.push('안정');
  }
  if (upgrade.id === 'magnet' || upgrade.id === 'luck') {
    role = '성장';
    tags.push('XP 가속');
  }
  if (upgrade.id === 'damage' || upgrade.id === 'cooldown') {
    role = '공용 화력';
    tags.push('전체 무기');
  }

  if (pickCount > 0) tags.push(`Rank ${formatFocusLevel(pickCount + 1)}`);
  if (key && focus + 1 >= 3) tags.push('각성 임박');
  if (improvesSynergy) tags.push(`공명 ${formatFocusLevel(primarySynergy.nextLevel)}`);
  if (upgrade.id === 'heal' || (upgrade.id === 'maxHp' && game.stats.hp / game.stats.maxHp < 0.7)) tags.push('위기 대응');
  if (tags.length < 2) tags.push(upgrade.branch);

  const recommended = Boolean(
    unlocksWeapon
    || improvesSynergy
    || (key && dominant?.key === key && dominant.focus >= 2)
    || (key && focus === 0 && game.level <= 5)
    || (upgrade.id === 'maxHp' && game.stats.hp / game.stats.maxHp < 0.72)
    || (upgrade.id === 'magnet' && game.level <= 4)
    || ((upgrade.id === 'damage' || upgrade.id === 'cooldown') && game.upgrades.length >= 4)
  );
  const reason = unlocksWeapon
    ? '새 무기'
    : improvesSynergy
      ? '조합 완성'
      : key && dominant?.key === key && dominant.focus >= 2
        ? '주력 빌드'
        : key && focus === 0
          ? '빌드 확장'
          : upgrade.id === 'maxHp' && game.stats.hp / game.stats.maxHp < 0.72
            ? '위기 대응'
            : upgrade.id === 'magnet' && game.level <= 4
              ? '초반 성장'
              : upgrade.id === 'cooldown' || upgrade.id === 'damage'
                ? '전체 효율'
                : pickCount > 0
                  ? `중첩 ${formatFocusLevel(pickCount + 1)}`
                  : key
                    ? BUILD_FOCUS_META[key].label
                    : upgrade.branch;
  const context = {
    key,
    dominant,
    focus,
    primarySynergy,
    improvesSynergy,
    unlocksWeapon,
    pickCount
  };
  const decisionCopy = getUpgradeDecisionCopy(game, upgrade, context);
  const quickRead = getUpgradeQuickRead(game, upgrade, context, decisionCopy);

  return {
    role,
    badge: role === upgrade.family ? reason : role,
    impact: getUpgradeImpactLabel(upgrade),
    decision: decisionCopy.decision,
    payoff: decisionCopy.payoff,
    quickLead: quickRead.quickLead,
    quickSummary: quickRead.quickSummary,
    statLine: getUpgradeStatLine(upgrade),
    reason,
    recommended,
    tags: [...new Set(tags.filter(tag => tag !== upgrade.branch))].slice(0, 2)
  };
}

function getUpgradePickCount(game, id) {
  return game?.upgrades?.filter(upgradeId => upgradeId === id).length ?? 0;
}

function getUpgradeDisplayTitle(game, upgrade) {
  const count = getUpgradePickCount(game, upgrade.id);
  return count > 0 ? `${upgrade.title} ${formatFocusLevel(count + 1)}` : upgrade.title;
}

function formatFocusLevel(focus) {
  return ['0', 'I', 'II', 'III', 'IV', 'V', 'VI'][Math.min(6, Math.max(0, focus))];
}

function pickArmoryBoost(game, excludedIds = new Set()) {
  const stage = getWeaponStage(game);
  const weighted = [
    upgradePool.find(upgrade => upgrade.id === 'orb-count'),
    upgradePool.find(upgrade => upgrade.id === 'orb-fan'),
    upgradePool.find(upgrade => upgrade.id === 'orb-lance'),
    upgradePool.find(upgrade => upgrade.id === 'chain-plus'),
    upgradePool.find(upgrade => upgrade.id === 'chain-web'),
    upgradePool.find(upgrade => upgrade.id === 'chain-smite'),
    upgradePool.find(upgrade => upgrade.id === 'storm-burst'),
    upgradePool.find(upgrade => upgrade.id === 'storm-volley'),
    upgradePool.find(upgrade => upgrade.id === 'storm-carpet'),
    upgradePool.find(upgrade => upgrade.id === 'blade-plus'),
    upgradePool.find(upgrade => upgrade.id === 'blade-guard'),
    upgradePool.find(upgrade => upgrade.id === 'blade-reaper'),
    upgradePool.find(upgrade => upgrade.id === 'nova-plus'),
    upgradePool.find(upgrade => upgrade.id === 'nova-pulse'),
    upgradePool.find(upgrade => upgrade.id === 'nova-comet'),
    stage >= 2 ? upgradePool.find(upgrade => upgrade.id === 'damage') : null,
    stage >= 2 ? upgradePool.find(upgrade => upgrade.id === 'cooldown') : null,
    game.stats.pierce < 3 ? upgradePool.find(upgrade => upgrade.id === 'pierce') : null
  ].filter(Boolean);

  const available = weighted.filter(upgrade => isUpgradeAvailable(game, upgrade) && isUpgradeDraftable(game, upgrade) && !excludedIds.has(upgrade.id));
  return pickWeightedUpgrade(available, game) ?? upgradePool.find(upgrade => upgrade.id === 'damage');
}

function isUpgradeAvailable(game, upgrade) {
  if (!game) return true;
  const stats = game.stats;
  const rankLimit = UPGRADE_RANK_LIMITS[upgrade.id];
  if (rankLimit && getUpgradePickCount(game, upgrade.id) >= rankLimit) return false;
  if (upgrade.id === 'orb-count') return stats.orbCount < 7;
  if (upgrade.id === 'orb-fan') return stats.orbCount < 8;
  if (upgrade.id === 'blade-plus') return stats.bladeBonus < 5;
  if (upgrade.id === 'blade-guard') return stats.bladeBonus < 6;
  if (upgrade.id === 'chain-plus') return stats.lightningChains < 9;
  if (upgrade.id === 'chain-web') return stats.lightningChains < 11;
  if (upgrade.id === 'storm-volley') return stats.stormStrikes < 4;
  return true;
}

function isUpgradeDraftable(game, upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  if (!key) return true;
  if (isWeaponFamilyUnlocked(game, key)) return true;
  if (key === 'orb') return true;
  return canDraftNewWeaponFamily(game);
}

function canDraftNewWeaponFamily(game) {
  return game.level >= NEW_WEAPON_UNLOCK_LEVEL
    || game.time >= NEW_WEAPON_UNLOCK_TIME
    || getItemPickupCount(game, 'cache') >= NEW_WEAPON_UNLOCK_CACHE_COUNT
    || (game.shrineActivations ?? 0) >= NEW_WEAPON_UNLOCK_SHRINE_COUNT;
}

function getUpgradeWeight(game, upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  const dominant = getDominantBuild(game);
  const pickCount = getUpgradePickCount(game, upgrade.id);
  let weight = WEAPON_UPGRADE_IDS.has(upgrade.id) ? 1.15 : 0.78;

  if (key) {
    const focus = getBuildFocus(game, key);
    const synergyDelta = getUpgradeSynergyMatches(game, upgrade).some(synergy => synergy.nextLevel > synergy.currentLevel);
    weight += focus * 0.48;
    if (!isWeaponFamilyUnlocked(game, key)) weight += game.level <= 7 ? 0.72 : 0.9;
    if (synergyDelta) weight += 1.7;
    if (dominant?.key === key) weight += 1.15;
    if (focus === 0 && game.level <= 8) weight += key === 'orb' ? 0.96 : 0.62;
    if (game.level <= 5 && key === 'orb') weight += 0.42;
  } else {
    if (upgrade.id === 'maxHp' && game.stats.hp / game.stats.maxHp < 0.72) weight += 1.25;
    if (upgrade.id === 'magnet' && game.level <= 4) weight += 0.55;
    if (upgrade.id === 'speed' && game.time > 75) weight += 0.35;
    if (upgrade.id === 'cooldown' || upgrade.id === 'damage') weight += Math.min(1.0, game.upgrades.length * 0.08);
  }

  return Math.max(0.08, weight * Math.max(0.26, 1 - pickCount * 0.2));
}

function pickWeightedUpgrade(pool, game) {
  if (pool.length === 0) return null;
  const total = pool.reduce((sum, upgrade) => sum + getUpgradeWeight(game, upgrade), 0);
  let roll = Math.random() * total;
  for (const upgrade of pool) {
    roll -= getUpgradeWeight(game, upgrade);
    if (roll <= 0) return upgrade;
  }
  return pool[pool.length - 1];
}

function addDraftChoice(choices, candidates, game) {
  if (choices.length >= UPGRADE_CHOICE_COUNT) return;
  const available = candidates.filter(upgrade => !choices.some(choice => choice.id === upgrade.id));
  const choice = pickWeightedUpgrade(available, game);
  if (choice) choices.push(choice);
}

function pickUpgrades(game) {
  const available = upgradePool.filter(upgrade => isUpgradeAvailable(game, upgrade));
  const draftable = available.filter(upgrade => isUpgradeDraftable(game, upgrade));
  const weaponChoices = draftable.filter(upgrade => WEAPON_UPGRADE_IDS.has(upgrade.id));
  const utilityChoices = available.filter(upgrade => !WEAPON_UPGRADE_IDS.has(upgrade.id));
  const starterChoices = weaponChoices.filter(upgrade => getUpgradeFocusKey(upgrade) === 'orb');
  const newWeaponUnlocked = canDraftNewWeaponFamily(game);
  const lockedWeaponChoices = weaponChoices.filter(upgrade => {
    const key = getUpgradeFocusKey(upgrade);
    return key && !isWeaponFamilyUnlocked(game, key);
  });
  const dominant = getDominantBuild(game);
  const choices = [];

  if (game.level <= 3) {
    addDraftChoice(choices, starterChoices, game);
    addDraftChoice(choices, utilityChoices, game);
  } else if (game.level <= 5) {
    addDraftChoice(choices, starterChoices, game);
    addDraftChoice(choices, utilityChoices, game);
  } else if (game.level <= 7) {
    addDraftChoice(choices, starterChoices, game);
    if (newWeaponUnlocked) addDraftChoice(choices, lockedWeaponChoices, game);
  }
  if (dominant?.focus >= 2) {
    addDraftChoice(choices, weaponChoices.filter(upgrade => getUpgradeFocusKey(upgrade) === dominant.key), game);
  }
  addDraftChoice(choices, weaponChoices.filter(upgrade => getUpgradeSynergyMatches(game, upgrade).some(synergy => synergy.nextLevel > synergy.currentLevel)), game);
  if (newWeaponUnlocked && game.level >= 4 && game.level <= 8) {
    for (let index = 0; index < 2; index += 1) {
      addDraftChoice(choices, weaponChoices.filter(upgrade => {
        const key = getUpgradeFocusKey(upgrade);
        return key && getBuildFocus(game, key) === 0 && !choices.some(choice => getUpgradeFocusKey(choice) === key);
      }), game);
    }
  }
  addDraftChoice(choices, weaponChoices, game);
  addDraftChoice(choices, utilityChoices, game);
  while (choices.length < UPGRADE_CHOICE_COUNT && choices.length < draftable.length) {
    addDraftChoice(choices, draftable, game);
  }

  return choices.sort(() => Math.random() - 0.5);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

const rootNode = document.getElementById('root');
const root = window.__RUNE_DRIFT_ROOT__ ?? createRoot(rootNode);
window.__RUNE_DRIFT_ROOT__ = root;
root.render(<App />);
