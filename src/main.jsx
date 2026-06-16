import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Text, useGLTF } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
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
const MAX_ENEMIES = 168;
const WAVE_DURATION = 22;
const MAX_FIELD_ITEMS = 22;
const MAX_XP_GEMS = 520;
const MAX_PROJECTILES = 260;
const OVERLOAD_DURATION = 8;
const XP_BASE_MAGNET_RADIUS = 8.2;
const XP_PICKUP_RADIUS = 1.3;
const FIELD_ITEM_ATTRACT_RADIUS = 12;
const FIELD_ITEM_PICKUP_RADIUS = 3.05;

const FIELD_ITEM_META = {
  magnet: { color: '#70d6ff', label: 'MAGNET', name: '자석 룬' },
  purge: { color: '#ffdf6e', label: 'PURGE', name: '정화 폭발' },
  heal: { color: '#79f29a', label: 'HEAL', name: '생명 결정' },
  overload: { color: '#f5c7ff', label: 'OVERLOAD', name: '과부하 룬' },
  cache: { color: '#fff1a6', label: 'ARMORY', name: '무기 보급' }
};

const ART_TOKENS = {
  void: '#030807',
  terrainLow: '#26352e',
  terrainMid: '#49634c',
  terrainHigh: '#737b58',
  moss: '#286947',
  oldStone: '#69665a',
  wornGold: '#d7b85f',
  runeCyan: '#70d6ff',
  runeMint: '#73fbd3',
  dangerRed: '#ff8b72',
  elderViolet: '#d8b2ff'
};

const WAVE_PROFILES = [
  { name: 'Rift Scouts', targetBase: 58, spawnBase: 9, runner: 0.18, brute: 0.02, interval: 0.5 },
  { name: 'Howling Pack', targetBase: 72, spawnBase: 10, runner: 0.34, brute: 0.06, interval: 0.45 },
  { name: 'Stone March', targetBase: 86, spawnBase: 11, runner: 0.2, brute: 0.22, interval: 0.42 },
  { name: 'Split Swarm', targetBase: 102, spawnBase: 12, runner: 0.4, brute: 0.16, interval: 0.38 },
  { name: 'Rift Siege', targetBase: 116, spawnBase: 13, runner: 0.32, brute: 0.3, interval: 0.36 }
];

const EARLY_FIELD_ITEM_SCHEDULE = [
  { id: 'starter-magnet', time: 5, type: 'magnet', distance: 2.2, spread: 1.1 },
  { id: 'starter-cache', time: 14, type: 'cache', distance: 3.0, spread: 1.4 },
  { id: 'starter-overload', time: 34, type: 'overload', distance: 5.2, spread: 2.2 },
  { id: 'second-magnet', time: 48, type: 'magnet', distance: 5.8, spread: 2.4 },
  { id: 'starter-purge', time: 68, type: 'purge', distance: 7.0, spread: 2.6 },
  { id: 'second-cache', time: 88, type: 'cache', distance: 7.6, spread: 3.0 },
  { id: 'third-magnet', time: 116, type: 'magnet', distance: 8.8, spread: 3.6 },
  { id: 'third-cache', time: 146, type: 'cache', distance: 9.5, spread: 4.0 },
  { id: 'second-purge', time: 176, type: 'purge', distance: 10.5, spread: 4.4 },
  { id: 'second-overload', time: 214, type: 'overload', distance: 11.2, spread: 4.8 },
  { id: 'final-cache', time: 246, type: 'cache', distance: 12.0, spread: 5.2 }
];

const ELITE_ROLE_META = {
  bulwark: { label: 'BULWARK', name: '방벽 정예', color: '#ffdf6e', hint: '칼날/태양' },
  charger: { label: 'CHARGER', name: '돌진 정예', color: '#70d6ff', hint: '폭풍/번개' },
  summoner: { label: 'SUMMONER', name: '소환 정예', color: '#f5c7ff', hint: '분열/연쇄' }
};

const BOSS_PATTERN_META = {
  shockwave: { label: 'SHOCKWAVE', color: '#ff8b72' },
  summon: { label: 'SUMMON', color: '#f5c7ff' },
  guard: { label: 'WARD', color: '#fff1a6' }
};

const SURGE_EVENTS = [
  { time: 150, label: 'RIFT SURGE', message: '균열 폭주: 적 무리 진입', color: '#ff8b72', count: 10 },
  { time: 195, label: 'ELITE SURGE', message: '정예 파동: 패턴 가속', color: '#f5c7ff', count: 13 },
  { time: 245, label: 'FINAL SURGE', message: '최종 폭주: 생존 압박 최대', color: '#fff1a6', count: 16 }
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

const weaponCatalog = [
  {
    id: 'rune-orb',
    name: '룬 구체',
    color: '#70d6ff',
    cooldown: 0.46,
    damage: 26,
    speed: 17,
    pierce: 1,
    size: 0.34
  },
  {
    id: 'storm-brand',
    name: '폭풍 낙인',
    color: '#b8f7ff',
    cooldown: 1.52,
    damage: 38,
    speed: 0,
    pierce: 5,
    size: 0.44
  },
  {
    id: 'orbit-blade',
    name: '궤도 칼날',
    color: '#f7d06b',
    cooldown: 0,
    damage: 16,
    speed: 0,
    pierce: 99,
    size: 0.22
  },
  {
    id: 'chain-lightning',
    name: '연쇄 번개',
    color: '#d7b7ff',
    cooldown: 1.04,
    damage: 28,
    range: 34,
    chains: 3
  },
  {
    id: 'solar-nova',
    name: '태양 파동',
    color: '#ff8b72',
    cooldown: 3.05,
    damage: 34,
    radius: 8.4
  }
];

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
    perks: ['표적 +1', '부채꼴 보조탄', '룬창 과충전']
  },
  storm: {
    label: '폭풍 낙인',
    title: '낙뢰 지대',
    color: '#b8f7ff',
    perks: ['낙뢰 +1', '잔류 시간 증가', '폭풍망 확장']
  },
  blade: {
    label: '궤도 칼날',
    title: '근접 수호',
    color: '#f7d06b',
    perks: ['칼날 +1', '접촉 피해 감소', '참격 압박']
  },
  chain: {
    label: '연쇄 번개',
    title: '전류 제어',
    color: '#d7b7ff',
    perks: ['연쇄 +1', '감전 둔화', '부상 처형']
  },
  nova: {
    label: '태양 파동',
    title: '태양 중심',
    color: '#ff8b72',
    perks: ['파동 범위 증가', '밀어내기 강화', '쿨다운 압축']
  }
};

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

function createInitialGame() {
  return {
    phase: 'playing',
    level: 1,
    xp: 0,
    xpToNext: 34,
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
    overloadTimer: 0,
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
      orbCount: 2,
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

function App() {
  const [game, setGame] = useState(() => createInitialGame());
  const [upgradeChoices, setUpgradeChoices] = useState([]);
  const sceneApi = useRef(null);

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

  return (
    <main className="shell">
      <Canvas
        shadows
        camera={{ position: [0, 44, 74], fov: 48, near: 0.1, far: 420 }}
        dpr={[1, 1.7]}
      >
        <color attach="background" args={['#030807']} />
        <fog attach="fog" args={['#030807', 92, 320]} />
        <Suspense fallback={null}>
          <GameScene
            refApi={sceneApi}
            game={game}
            setGame={setGame}
            onLevelUp={onLevelUp}
          />
          <ContactShadows position={[0, 0.02, 0]} opacity={0.18} scale={300} blur={2.7} far={14} color="#020605" />
          <Environment preset="night" />
        </Suspense>
        <EffectComposer>
          <Bloom luminanceThreshold={0.34} intensity={1.05} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.78} />
        </EffectComposer>
      </Canvas>
      <HUD game={game} onRestart={restart} />
      {game.phase === 'upgrade' && (
        <UpgradeOverlay game={game} choices={upgradeChoices} onChoose={chooseUpgrade} />
      )}
      {game.phase === 'ended' && <EndOverlay game={game} onRestart={restart} />}
    </main>
  );
}

function GameScene({ refApi, game, setGame, onLevelUp }) {
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
  const xpGems = useRef([]);
  const fieldItems = useRef([]);
  const hitBursts = useRef([]);
  const damageNumbers = useRef([]);
  const spawnWarnings = useRef([]);
  const spawnTimer = useRef(0);
  const fieldItemTimer = useRef(4);
  const fieldItemDropLock = useRef(0);
  const scheduledFieldItems = useRef(new Set());
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
  const cameraTarget = useRef(new THREE.Vector3());
  const cameraShake = useRef(0);
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    color: new THREE.Color(),
    scale: new THREE.Vector3(),
    quat: new THREE.Quaternion()
  }), []);

  useEffect(() => {
    const down = event => {
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
  }, []);

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
        xpGems.current = [];
        fieldItems.current = [];
        hitBursts.current = [];
        damageNumbers.current = [];
        spawnWarnings.current = [];
        spawnTimer.current = 0;
        fieldItemTimer.current = 4;
        fieldItemDropLock.current = 0;
        scheduledFieldItems.current = new Set();
        bossSpawnedWave.current = 0;
        eliteSpawnedMinute.current = 0;
        surgeIndex.current = 0;
        orbTimer.current = 0;
        stormTimer.current = 0;
        lightningTimer.current = 0.28;
        novaTimer.current = 1.25;
        levelUpQueued.current = false;
        weaponEffects.current = [];
      }
    };
  }, [refApi]);

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
      renderInstances();
      return;
    }

    setGame(current => {
      const nextTime = current.time + dt;
      const nextWave = Math.max(1, Math.floor(nextTime / WAVE_DURATION) + 1);
      const pickupFlash = Math.max(0, (current.pickupFlash ?? 0) - dt);
      const dashCooldownMax = DASH_COOLDOWN * current.stats.dashCooldown;
      const basePatch = {
        time: Math.min(nextTime, RUN_DURATION),
        wave: nextWave,
        pickupFlash,
        pickupMessage: pickupFlash > 0 ? current.pickupMessage : '',
        overloadTimer: Math.max(0, (current.overloadTimer ?? 0) - dt),
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

    updatePlayer(dt, game.stats);
    updateSpawning(dt, game, setGame);
    updateWeapons(dt, game);
    updateProjectiles(dt, game.stats, game);
    updateEnemies(dt, game, setGame);
    updateGems(dt, game, setGame, onLevelUp);
    updateFieldItems(dt, game, setGame);
    updateBursts(dt);
    updateWeaponEffects(dt);
    updateDamageNumbers(dt);
    updateSpawnWarnings(dt);
    updateCamera(state.camera, dt);
    renderInstances();
  });

  const updatePlayer = (dt, stats) => {
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
      const tilt = Math.min(0.16, player.current.vel.length() * 0.014);
      playerMesh.current.rotation.set(
        -player.current.facing.z * tilt,
        yaw,
        player.current.facing.x * tilt
      );
      playerMesh.current.scale.setScalar(player.current.dashTimer > 0 ? 1.16 : 1);
    }
  };

  const updateSpawning = (dt, currentGame, updateGame) => {
    spawnTimer.current -= dt;
    const waveProfile = getWaveProfile(currentGame.wave);
    const pressure = getDirectorPressure(currentGame);
    const targetCount = Math.min(Math.floor((waveProfile.targetBase + currentGame.wave * 7) * pressure), MAX_ENEMIES - 12);
    const minuteMark = Math.floor(currentGame.time / 60);
    const nextSurge = SURGE_EVENTS[surgeIndex.current];
    if (nextSurge && currentGame.time >= nextSurge.time && enemies.current.length < MAX_ENEMIES - 8) {
      const count = Math.min(nextSurge.count + Math.floor(currentGame.wave / 2), MAX_ENEMIES - enemies.current.length);
      for (let i = 0; i < count; i += 1) {
        const enemy = createEnemy(currentGame.wave + 1, waveProfile, player.current.pos);
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
      cameraShake.current = Math.max(cameraShake.current, 0.24);
      updateGame(current => ({
        ...current,
        pickupMessage: nextSurge.message,
        pickupFlash: 3
      }));
      surgeIndex.current += 1;
    }
    if (minuteMark >= 1 && minuteMark <= 4 && eliteSpawnedMinute.current < minuteMark) {
      const elite = createElite(minuteMark, currentGame.wave, player.current.pos);
      enemies.current.push(elite);
      spawnWarnings.current.push({
        pos: elite.pos.clone(),
        life: 1.35,
        maxLife: 1.35,
        color: getEnemyAccentColor(elite),
        label: ELITE_ROLE_META[elite.role]?.label ?? 'ELITE'
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
      eliteSpawnedMinute.current = minuteMark;
    }
    if (currentGame.wave >= 5 && currentGame.wave % 2 === 1 && bossSpawnedWave.current < currentGame.wave) {
      const boss = createBoss(currentGame.wave, player.current.pos);
      enemies.current.push(boss);
      spawnWarnings.current.push({
        pos: boss.pos.clone(),
        life: 1.45,
        maxLife: 1.45,
        color: getEnemyAccentColor(boss),
        label: 'RIFT BEAST'
      });
      hitBursts.current.push({ pos: boss.pos.clone(), life: 1.1, maxLife: 1.1, color: '#ffdf6e' });
      bossSpawnedWave.current = currentGame.wave;
    }
    if (spawnTimer.current <= 0 && enemies.current.length < targetCount) {
      const missing = targetCount - enemies.current.length;
      const catchUp = missing > 42 ? 6 : missing > 26 ? 4 : missing > 14 ? 2 : 0;
      const amount = Math.min(18, Math.ceil((waveProfile.spawnBase + Math.floor(currentGame.time / 72) + catchUp) * Math.min(1.24, pressure)));
      for (let i = 0; i < amount; i += 1) {
        const enemy = createEnemy(currentGame.wave, waveProfile, player.current.pos);
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
      spawnTimer.current = Math.max(0.24, waveProfile.interval - currentGame.wave * 0.02);
    }
  };

  const updateWeapons = (dt, currentGame) => {
    const stats = currentGame.stats;
    const weaponStage = getWeaponStage(currentGame);
    const overloadDamage = currentGame.overloadTimer > 0 ? 1.25 : 1;
    const overloadCooldown = currentGame.overloadTimer > 0 ? 0.58 : 1;
    const orbFocus = getBuildFocus(currentGame, 'orb');
    const stormFocus = getBuildFocus(currentGame, 'storm');
    const chainFocus = getBuildFocus(currentGame, 'chain');
    const novaFocus = getBuildFocus(currentGame, 'nova');
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
          projectiles.current.push({
            type: 'orb',
            pos: player.current.pos.clone().add(new THREE.Vector3(0, 0.35, 0)),
            vel: dir.multiplyScalar(weaponCatalog[0].speed * stats.orbSpeed),
            angle: Math.atan2(dir.x, dir.z),
            life: 1.25 + stats.pierce * 0.05,
            damage: weaponCatalog[0].damage * stats.damage * stats.orbDamage * overloadDamage * (1 + orbFocus * 0.035),
            pierce: weaponCatalog[0].pierce + stats.pierce + (orbFocus >= 3 ? 1 : 0),
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

    if (stormTimer.current <= 0 && enemies.current.length > 3) {
      const tier = getWeaponTier(stats, weaponStage);
      const strikeCount = Math.min(7, Math.max(1, Math.round(stats.stormStrikes) + Math.floor(stormFocus / 2)));
      for (let strike = 0; strike < strikeCount; strike += 1) {
        const target = enemies.current[Math.floor(Math.random() * enemies.current.length)];
        if (!target) continue;
        const offset = strike === 0
          ? new THREE.Vector3()
          : new THREE.Vector3((Math.random() - 0.5) * (5.5 + stormFocus * 0.9), 0, (Math.random() - 0.5) * (5.5 + stormFocus * 0.9));
        const strikePos = target.pos.clone().add(offset).add(new THREE.Vector3(0, 0.8, 0));
        projectiles.current.push({
          type: 'storm',
          pos: strikePos,
          vel: new THREE.Vector3(),
          angle: Math.random() * Math.PI * 2,
          life: 0.34 * stats.stormDuration * (1 + stormFocus * 0.06),
          damage: weaponCatalog[1].damage * stats.damage * stats.stormDamage * overloadDamage * (1 + stormFocus * 0.03),
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
      stormTimer.current = Math.max(0.38, weaponCatalog[1].cooldown * stats.cooldown * stats.stormCooldown * overloadCooldown * (1 - weaponStage * 0.06) * (1 - Math.min(0.14, stormFocus * 0.025)));
    }

    if (lightningTimer.current <= 0 && enemies.current.length > 0) {
      const chainTargets = nearestEnemies(
        stats.lightningChains + Math.floor(weaponStage / 2) + Math.floor(chainFocus / 2),
        weaponCatalog[3].range * stats.lightningRange + weaponStage * 4 + chainFocus * 3
      );
      let previous = player.current.pos.clone().add(new THREE.Vector3(0, 1.05, 0));
      const color = getLightningColor(stats, weaponStage);
      chainTargets.forEach((enemy, index) => {
        const executeBoost = stats.lightningExecute > 0 && enemy.hp / enemy.maxHp < 0.45
          ? 1 + stats.lightningExecute * 0.34
          : 1;
        const damage = weaponCatalog[3].damage * stats.damage * stats.lightningDamage * overloadDamage * executeBoost * (1 - index * 0.08) * (1 + chainFocus * 0.035);
        const dealt = applyDamageToEnemy(enemy, damage, 'lightning');
        enemy.flash = 0.2;
        enemy.shocked = Math.max(enemy.shocked ?? 0, 0.48 + chainFocus * 0.16);
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

    if (novaTimer.current <= 0 && enemies.current.length > 0) {
      const color = getNovaColor(stats, weaponStage);
      const radius = weaponCatalog[4].radius * stats.novaRadius * (1 + weaponStage * 0.08 + novaFocus * 0.045);
      const pulseBoost = 1 + stats.novaPulse * 0.12;
      const damage = weaponCatalog[4].damage * stats.damage * stats.novaDamage * pulseBoost * overloadDamage * (1 + novaFocus * 0.04);
      let hitCount = 0;
      for (const enemy of enemies.current) {
        const distanceSq = enemy.pos.distanceToSquared(player.current.pos);
        if (distanceSq > radius * radius) continue;
        const falloff = 1 - Math.sqrt(distanceSq) / radius * 0.34;
        const dealt = applyDamageToEnemy(enemy, damage * falloff, 'nova');
        enemy.flash = 0.16;
        const push = enemy.pos.clone().sub(player.current.pos).setY(0);
        if (push.lengthSq() > 0.001) enemy.pos.addScaledVector(push.normalize(), 0.34 + novaFocus * 0.05);
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
      novaTimer.current = Math.max(0.58, weaponCatalog[4].cooldown * stats.cooldown * stats.novaCooldown * overloadCooldown * (1 - weaponStage * 0.05) * (1 - Math.min(0.16, novaFocus * 0.028)));
    }
  };

  const updateProjectiles = (dt, stats, currentGame) => {
    const angle = performance.now() * 0.0024;
    const weaponStage = getWeaponStage(currentGame);
    const overloadDamage = currentGame.overloadTimer > 0 ? 1.25 : 1;
    const bladeFocus = getBuildFocus(currentGame, 'blade');
    const bladeRadius = (2.5 + weaponStage * 0.16 + bladeFocus * 0.08) * stats.bladeRadius;
    const bladeCount = getBladeCount(stats, bladeFocus);
    const bladeColor = getBladeColor(stats, weaponStage);
    for (let i = 0; i < bladeCount; i += 1) {
      const offset = angle + i * (Math.PI * 2 / bladeCount);
      const bladePos = player.current.pos.clone().add(new THREE.Vector3(Math.cos(offset) * bladeRadius, 0.22, Math.sin(offset) * bladeRadius));
      for (const enemy of enemies.current) {
        if (enemy.pos.distanceToSquared(bladePos) < enemy.hitRadius ** 2) {
          const bladeDamage = weaponCatalog[2].damage * stats.damage * stats.bladeDamage * overloadDamage * dt * (6 + weaponStage * 0.75 + bladeFocus * 0.32);
          const dealt = applyDamageToEnemy(enemy, bladeDamage, 'blade');
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

    projectiles.current = projectiles.current.filter(projectile => {
      projectile.life -= dt;
      projectile.pos.addScaledVector(projectile.vel, dt);
      return projectile.life > 0 && projectile.pierce >= 0 && !hitsStaticCollider(projectile.pos, projectile.radius * 0.55);
    }).slice(-MAX_PROJECTILES);
  };

  const damagePlayer = (amount, updateGame, invuln = 0.62) => {
    if (player.current.invuln > 0) return false;
    const bladeFocus = getBuildFocus(game, 'blade');
    const guardedAmount = bladeFocus >= 2
      ? amount * (1 - Math.min(0.28, bladeFocus * 0.055))
      : amount;
    player.current.invuln = invuln;
    cameraShake.current = Math.max(cameraShake.current, 0.22);
    updateGame(current => {
      const nextHp = Math.max(0, current.stats.hp - guardedAmount);
      return {
        ...current,
        phase: nextHp <= 0 ? 'ended' : current.phase,
        result: nextHp <= 0 ? 'defeat' : current.result,
        stats: { ...current.stats, hp: nextHp }
      };
    });
    return true;
  };

  const updateEnemyAbility = (enemy, dt, distance, toPlayer, currentGame, updateGame, spawnedEnemies) => {
    enemy.abilityTimer = Math.max(0, (enemy.abilityTimer ?? 0) - dt);
    enemy.chargeTimer = Math.max(0, (enemy.chargeTimer ?? 0) - dt);
    enemy.bossGuard = Math.max(0, (enemy.bossGuard ?? 0) - dt);
    const abilityScale = getEnemyAbilityScale(currentGame);
    const summonSlots = () => Math.max(0, MAX_ENEMIES - enemies.current.length - spawnedEnemies.length);

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
          label: 'CHARGE'
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
          label: 'SWARM'
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

    if (enemy.abilityTimer > 0) return;
    const pattern = ['shockwave', 'summon', 'guard'][enemy.patternIndex % 3];
    enemy.patternIndex += 1;
    enemy.abilityTimer = (pattern === 'guard' ? 6.4 : 7.2) * abilityScale;
    const meta = BOSS_PATTERN_META[pattern];
    spawnWarnings.current.push({
      pos: enemy.pos.clone(),
      life: 1.0,
      maxLife: 1.0,
      color: meta.color,
      label: meta.label
    });

    if (pattern === 'shockwave') {
      enemy.shockwaveTimer = 0.95;
      return;
    }

    if (pattern === 'summon') {
      const count = Math.min(12, 4 + Math.floor(currentGame.wave / 2) + (currentGame.time >= 180 ? 2 : 0), summonSlots());
      for (let index = 0; index < count; index += 1) {
        spawnedEnemies.push(createSummonedRunner(enemy, currentGame.wave + 1, player.current.pos, index));
      }
      hitBursts.current.push({
        pos: enemy.pos.clone(),
        life: 0.82,
        maxLife: 0.82,
        color: meta.color,
        type: 'summon',
        stage: 5,
        radius: 5.2
      });
      return;
    }

    enemy.bossGuard = 5.4 + Math.max(0, currentGame.time - 180) * 0.01;
    hitBursts.current.push({
      pos: enemy.pos.clone(),
      life: 0.92,
      maxLife: 0.92,
      color: meta.color,
      type: 'bossGuard',
      stage: 5,
      radius: 4.8
    });
  };

  const updateEnemies = (dt, currentGame, updateGame) => {
    const playerPos = player.current.pos;
    let kills = 0;
    const spawnedEnemies = [];
    for (const enemy of enemies.current) {
      const toPlayer = playerPos.clone().sub(enemy.pos).setY(0);
      const distance = Math.max(0.001, toPlayer.length());
      toPlayer.divideScalar(distance);
      updateEnemyAbility(enemy, dt, distance, toPlayer, currentGame, updateGame, spawnedEnemies);
      enemy.shocked = Math.max(0, (enemy.shocked ?? 0) - dt);
      const shockMultiplier = enemy.shocked > 0
        ? Math.max(0.54, 0.82 - getBuildFocus(currentGame, 'chain') * 0.035)
        : 1;
      const speedMultiplier = (enemy.chargeTimer > 0 ? 3.1 : enemy.bossGuard > 0 ? 0.72 : 1) * shockMultiplier * getEnemyMovePressure(currentGame);
      enemy.pos.addScaledVector(toPlayer, enemy.speed * speedMultiplier * dt);
      resolveStaticCollisions(enemy.pos, enemy.radius * 0.7);
      enemy.pos.y += (getEnemyTerrainY(enemy.pos.x, enemy.pos.z) - enemy.pos.y) * Math.min(1, dt * 8);
      enemy.facingAngle = Math.atan2(toPlayer.x, toPlayer.z);
      enemy.wobble += dt * enemy.animSpeed;
      enemy.flash = Math.max(0, enemy.flash - dt);

      if (distance < enemy.radius + PLAYER_RADIUS && player.current.invuln <= 0) {
        damagePlayer(enemy.damage * getEnemyDamagePressure(currentGame), updateGame);
      }

      for (const projectile of projectiles.current) {
        if (projectile.pos.distanceToSquared(enemy.pos) < (enemy.hitRadius + projectile.radius) ** 2) {
          const dealt = applyDamageToEnemy(enemy, projectile.damage, projectile.type);
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
        const gemPos = enemy.pos.clone();
        gemPos.y += enemy.kind === 'boss' || enemy.kind === 'elite' ? 1.08 : 0.76;
        if (xpGems.current.length < MAX_XP_GEMS) {
          xpGems.current.push({
            pos: gemPos,
            value: enemy.xp,
            pulse: Math.random() * Math.PI * 2
          });
        }
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
      } else {
        alive.push(enemy);
      }
    }
    enemies.current = alive;

    if (kills > 0) {
      cameraShake.current = Math.max(cameraShake.current, Math.min(0.26, 0.05 + kills * 0.018));
      updateGame(current => ({ ...current, kills: current.kills + kills }));
    }
  };

  const updateGems = (dt, currentGame, updateGame, levelUp) => {
    const playerPos = player.current.pos;
    let gained = 0;
    xpGems.current = xpGems.current.filter(gem => {
      gem.pulse += dt * 5;
      const distance = gem.pos.distanceTo(playerPos);
      const passiveReach = Math.min(18, currentGame.level * 0.32 + currentGame.time * 0.052);
      const crowdReach = xpGems.current.length > 170 ? Math.min(10, (xpGems.current.length - 170) * 0.04) : 0;
      const magnetDistance = gem.magnetized ? 190 : XP_BASE_MAGNET_RADIUS * currentGame.stats.magnet + passiveReach + crowdReach;
      if (distance < magnetDistance && distance > 0.001) {
        const pull = playerPos.clone().sub(gem.pos).setY(0).normalize();
        const pullSpeed = gem.magnetized ? 44 + Math.min(110, distance * 1.35) : 12 + magnetDistance * 1.65;
        gem.pos.addScaledVector(pull, dt * pullSpeed);
      }
      if (distance < XP_PICKUP_RADIUS) {
        gained += gem.value * currentGame.stats.xpGain;
        return false;
      }
      return true;
    });

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
          nextXpToNext = Math.floor(nextXpToNext * 1.18 + 12);
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

    fieldItems.current = fieldItems.current
      .map(item => ({ ...item, pulse: item.pulse + dt * 4.2, life: item.life - dt }))
      .filter(item => {
        if (item.life <= 0) return false;
        const distance = item.pos.distanceTo(player.current.pos);
        if (distance < FIELD_ITEM_ATTRACT_RADIUS && distance > 0.001) {
          const pull = player.current.pos.clone().sub(item.pos).setY(0).normalize();
          item.pos.addScaledVector(pull, dt * (6.2 + (FIELD_ITEM_ATTRACT_RADIUS - distance) * 1.35));
        }
        if (distance > FIELD_ITEM_PICKUP_RADIUS) return true;
        applyFieldItem(item, currentGame, updateGame);
        return false;
      });
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
      updateGame(current => ({ ...current, pickupMessage: '자석 룬: XP 흡수', pickupFlash: 2.4 }));
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
        ...current,
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
        ...current,
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
        let nextGame = current;
        const boosts = [];
        const excluded = new Set();
        const boostCount = current.time < 90 ? 2 : current.time > 210 ? 3 : 2;
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
      addDamageNumber(player.current.pos, currentGame.time > 210 ? '무기 강화 x3' : '무기 강화 x2', color, 1.0);
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
    updateGame(current => ({ ...current, pickupMessage: '정화 폭발: 근처 적 소멸', pickupFlash: 2.4 }));
  };

  const updateBursts = dt => {
    hitBursts.current = hitBursts.current
      .map(burst => ({ ...burst, life: burst.life - dt }))
      .filter(burst => burst.life > 0);
  };

  const updateWeaponEffects = dt => {
    weaponEffects.current = weaponEffects.current
      .map(effect => ({ ...effect, life: effect.life - dt }))
      .filter(effect => effect.life > 0)
      .slice(-48);
  };

  const updateDamageNumbers = dt => {
    damageNumbers.current = damageNumbers.current
      .map(number => ({
        ...number,
        life: number.life - dt,
        age: number.age + dt,
        pos: number.pos.clone().add(new THREE.Vector3(0, dt * 0.9, 0))
      }))
      .filter(number => number.life > 0)
      .slice(-90);
  };

  const updateSpawnWarnings = dt => {
    spawnWarnings.current = spawnWarnings.current
      .map(warning => ({ ...warning, life: warning.life - dt }))
      .filter(warning => warning.life > 0)
      .slice(-28);
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
    return enemies.current
      .map(enemy => ({
        enemy,
        distance: enemy.pos.distanceToSquared(player.current.pos)
      }))
      .filter(item => item.distance <= maxDistanceSq)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map(item => item.enemy);
  };

  const renderInstances = () => {
    if (gemMesh.current) {
      const gemCount = Math.min(xpGems.current.length, MAX_XP_GEMS);
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
      <ambientLight intensity={0.44} />
      <directionalLight
        castShadow
        position={[18, 28, 10]}
        intensity={3.25}
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 2.4, 0]} intensity={3.4} color={ART_TOKENS.runeCyan} distance={12} />
      <pointLight position={[0, 5.8, 0]} intensity={1.05} color={ART_TOKENS.wornGold} distance={34} />
      <MapBaseArena />
      <ArenaAtmosphere />
      <PlayerAvatar rootRef={playerMesh} game={game} />
      <PlayerPresence player={player} game={game} />
      <OrbitBlades player={player} game={game} />
      <EnemyGroundAuras enemiesRef={enemies} />
      <EnemyAccents enemiesRef={enemies} />
      <SourceEnemyInstances enemiesRef={enemies} kind="golem" url={MODEL_URLS.golem} scaleMultiplier={2.42} materialTone="#365042" />
      <SourceEnemyInstances enemiesRef={enemies} kind="runner" url={MODEL_URLS.runner} scaleMultiplier={2.82} materialTone="#24324c" />
      <SourceEnemyInstances enemiesRef={enemies} kind="brute" url={MODEL_URLS.brute} scaleMultiplier={2.92} materialTone="#7b3e32" />
      <SourceEnemyInstances enemiesRef={enemies} kind="elite" url={MODEL_URLS.boss} scaleMultiplier={1.26} materialTone="#654b8e" />
      <SourceEnemyInstances enemiesRef={enemies} kind="boss" url={MODEL_URLS.boss} scaleMultiplier={2.05} materialTone="#8d7042" />
      <BossNameplates enemiesRef={enemies} />
      <BossPresence enemiesRef={enemies} />
      <instancedMesh ref={gemMesh} args={[null, null, MAX_XP_GEMS]} frustumCulled={false}>
        <octahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial color="#9ff7ff" emissive="#38d9ff" emissiveIntensity={3.5} roughness={0.18} toneMapped={false} />
      </instancedMesh>
      <GemBeacons gemsRef={xpGems} />
      <FieldPickupItems itemsRef={fieldItems} />
      <SourceProjectileInstances projectilesRef={projectiles} type="orb" url={PROJECTILE_MODEL_URLS.orb} scaleMultiplier={1.25} />
      <SourceProjectileInstances projectilesRef={projectiles} type="storm" url={PROJECTILE_MODEL_URLS.storm} scaleMultiplier={1.85} />
      <ProjectileAuraRings projectilesRef={projectiles} game={game} />
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

function SourceEnemyInstances({ enemiesRef, kind, url, scaleMultiplier = 1, materialTone }) {
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
          clone.emissive = clone.emissive ?? new THREE.Color('#000000');
          clone.emissive.lerp(tone, 0.18);
          clone.emissiveIntensity = Math.max(clone.emissiveIntensity ?? 0, 0.08);
          return clone;
        })
        : part.material.clone();
      if (!Array.isArray(material)) {
        material.color?.lerp(tone, 0.24);
        material.roughness = Math.min(0.96, material.roughness ?? 0.8);
        material.emissive = material.emissive ?? new THREE.Color('#000000');
        material.emissive.lerp(tone, 0.18);
        material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, 0.08);
      }
      return { ...part, material };
    });
  }, [materialTone, parts]);
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
    const enemiesForKind = enemiesRef.current.filter(enemy => enemy.kind === kind);
    styledParts.forEach((part, partIndex) => {
      const mesh = meshRefs.current[partIndex];
      if (!mesh) return;
      let count = 0;
      for (const enemy of enemiesForKind) {
        if (count >= MAX_ENEMIES) break;
        const bob = kind === 'runner' ? Math.sin(enemy.wobble * 2.3) * 0.1 : Math.sin(enemy.wobble) * 0.035;
        const squash = kind === 'runner' ? 0.9 + Math.sin(enemy.wobble * 2.3) * 0.08 : 1;
        local.pos.set(enemy.pos.x, enemy.pos.y + bob, enemy.pos.z);
        local.quat.setFromAxisAngle(axis, enemy.facingAngle ?? enemy.wobble);
        const bossPulse = kind === 'boss' ? 1 + Math.sin(enemy.wobble * 0.72) * 0.035 : 1;
        local.scale.set(
          enemy.radius * scaleMultiplier * bossPulse,
          enemy.radius * scaleMultiplier * squash * bossPulse,
          enemy.radius * scaleMultiplier * bossPulse
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
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

function SourceProjectileInstances({ projectilesRef, type, url, scaleMultiplier = 1 }) {
  const parts = useInstancedModelParts(url);
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
    const projectilesForType = projectilesRef.current.filter(projectile => projectile.type === type);
    parts.forEach((part, partIndex) => {
      const mesh = meshRefs.current[partIndex];
      if (!mesh) return;
      let count = 0;
      for (const projectile of projectilesForType) {
        if (count >= MAX_PROJECTILES) break;
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
          castShadow
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
  const shoulderRune = useRef();
  const stage = getWeaponStage(game);
  const dominantBuild = getDominantBuild(game);
  const focus = dominantBuild?.focus ?? 0;
  const color = dominantBuild?.color ?? getOrbColor(game.stats, stage);

  useFrame(() => {
    if (!root.current) return;
    const current = player.current;
    const speed = current.vel.length();
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
    if (shoulderRune.current) {
      shoulderRune.current.rotation.y += 0.022 + stage * 0.006;
      shoulderRune.current.rotation.z = Math.sin(performance.now() * 0.004) * 0.18;
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
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, -0.45, 0]} scale={[1.25, 1.25, 1]}>
        <ringGeometry args={[0.18, 0.23, 4]} />
        <meshBasicMaterial color="#fff1a6" transparent opacity={0.34 + stage * 0.06} depthWrite={false} toneMapped={false} />
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

function EnemyGroundAuras({ enemiesRef }) {
  const auraMesh = useRef();
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useFrame(() => {
    if (!auraMesh.current) return;
    const time = performance.now() * 0.003;
    let count = 0;
    for (const enemy of enemiesRef.current) {
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

function EnemyAccents({ enemiesRef }) {
  const coreMesh = useRef();
  const flashMesh = useRef();
  const eyeMesh = useRef();
  const runnerTrailMesh = useRef();
  const bruteMarkMesh = useRef();
  const golemShardMesh = useRef();
  const eliteCrownMesh = useRef();
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    color: new THREE.Color(),
    pos: new THREE.Vector3()
  }), []);

  useFrame(() => {
    const time = performance.now() * 0.004;
    if (coreMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (count >= MAX_ENEMIES) break;
        const bob = Math.sin(time + enemy.wobble) * 0.08;
        const height = enemy.kind === 'boss' ? 2.55 : enemy.kind === 'elite' ? 1.86 : enemy.kind === 'brute' ? 1.34 : enemy.kind === 'runner' ? 0.92 : 1.04;
        scratch.quat.identity();
        scratch.matrix.compose(
          new THREE.Vector3(enemy.pos.x, enemy.pos.y + height + bob, enemy.pos.z),
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
        if (count >= MAX_ENEMIES * 2) break;
        const forward = new THREE.Vector3(Math.sin(enemy.facingAngle), 0, Math.cos(enemy.facingAngle));
        const right = new THREE.Vector3(forward.z, 0, -forward.x);
        const eyeHeight = enemy.kind === 'boss' ? 2.28 : enemy.kind === 'elite' ? 1.62 : enemy.kind === 'brute' ? 1.15 : enemy.kind === 'runner' ? 0.8 : 0.92;
        const spacing = enemy.kind === 'boss' ? 0.52 : enemy.kind === 'elite' ? 0.34 : enemy.kind === 'brute' ? 0.28 : 0.2;
        for (let side = -1; side <= 1; side += 2) {
          scratch.pos.copy(enemy.pos)
            .addScaledVector(forward, enemy.radius * 0.78)
            .addScaledVector(right, side * spacing);
          scratch.pos.y = enemy.pos.y + eyeHeight;
          scratch.quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), enemy.facingAngle);
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
        scratch.matrix.compose(
          new THREE.Vector3(enemy.pos.x, enemy.pos.y + 0.08, enemy.pos.z),
          scratch.quat,
          scratch.scale.setScalar(enemy.hitRadius * 1.08)
        );
        flashMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      flashMesh.current.count = count;
      flashMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (runnerTrailMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (enemy.kind !== 'runner') continue;
        if (count >= MAX_ENEMIES) break;
        const back = new THREE.Vector3(Math.sin(enemy.facingAngle), 0, Math.cos(enemy.facingAngle));
        scratch.pos.set(enemy.pos.x - back.x * 0.62, enemy.pos.y + 0.16, enemy.pos.z - back.z * 0.62);
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

    if (bruteMarkMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (enemy.kind !== 'brute') continue;
        if (count >= MAX_ENEMIES) break;
        scratch.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, enemy.wobble * 0.35));
        scratch.matrix.compose(
          new THREE.Vector3(enemy.pos.x, enemy.pos.y + 1.48, enemy.pos.z),
          scratch.quat,
          scratch.scale.setScalar(0.72 + Math.sin(enemy.wobble) * 0.05)
        );
        bruteMarkMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      bruteMarkMesh.current.count = count;
      bruteMarkMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (golemShardMesh.current) {
      let count = 0;
      for (const enemy of enemiesRef.current) {
        if (enemy.kind !== 'golem') continue;
        if (count >= MAX_ENEMIES) break;
        scratch.quat.setFromEuler(new THREE.Euler(0.45, enemy.facingAngle + Math.PI / 4, 0.2));
        scratch.matrix.compose(
          new THREE.Vector3(enemy.pos.x, enemy.pos.y + 1.18 + Math.sin(enemy.wobble) * 0.04, enemy.pos.z),
          scratch.quat,
          scratch.scale.set(0.18, 0.32, 0.18)
        );
        golemShardMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      golemShardMesh.current.count = count;
      golemShardMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (eliteCrownMesh.current) {
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
  });

  return (
    <>
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
      <instancedMesh ref={runnerTrailMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#70d6ff" transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={bruteMarkMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <torusGeometry args={[0.68, 0.045, 8, 28]} />
        <meshBasicMaterial color="#ff8b72" transparent opacity={0.72} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={golemShardMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#70f0b4" transparent opacity={0.86} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={eliteCrownMesh} args={[null, null, MAX_ENEMIES * 4]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 4]} />
        <meshBasicMaterial color={ART_TOKENS.elderViolet} transparent opacity={0.72} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

function GemBeacons({ gemsRef }) {
  const beamMesh = useRef();
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3()
  }), []);

  useFrame(() => {
    if (!beamMesh.current) return;
    const gemCount = Math.min(gemsRef.current.length, MAX_XP_GEMS);
    for (let count = 0; count < gemCount; count += 1) {
      const gem = gemsRef.current[count];
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
      <mesh rotation={[-Math.PI / 2, 0, -progress * Math.PI * 0.5]} scale={[radius * 0.68, radius * 0.68, 1]}>
        <ringGeometry args={[0.38, 0.46, 6]} />
        <meshBasicMaterial color="#fff1a6" transparent opacity={opacity * 0.44} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ProjectileAuraRings({ projectilesRef, game }) {
  const orbRing = useRef();
  const orbHalo = useRef();
  const orbTrail = useRef();
  const orbCrown = useRef();
  const stormRing = useRef();
  const stormDisk = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3()
  }), []);

  useFrame(() => {
    const tier = getWeaponTier(game.stats, getWeaponStage(game));
    const stage = getWeaponStage(game);
    const evolved = stage > 0 || tier > 1.08 || game.stats.pierce > 0 || game.stats.cooldown < 0.96;
    if (orbRing.current) {
      let count = 0;
      if (evolved) {
        for (const projectile of projectilesRef.current) {
          if (projectile.type !== 'orb') continue;
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
          for (let i = 0; i < 3; i += 1) {
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
        local.quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, -performance.now() * 0.003 + projectile.angle));
        local.matrix.compose(projectile.pos, local.quat, local.scale.setScalar(projectile.burstRadius ?? 1.8));
        stormDisk.current.setMatrixAt(count, local.matrix);
        count += 1;
      }
      stormDisk.current.count = count;
      stormDisk.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={orbTrail} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={getOrbColor(game.stats, getWeaponStage(game))} transparent opacity={0.28 + getWeaponStage(game) * 0.05} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={orbRing} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <torusGeometry args={[0.45, 0.018, 8, 32]} />
        <meshBasicMaterial color={getOrbColor(game.stats, getWeaponStage(game))} transparent opacity={0.9} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={orbHalo} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <torusGeometry args={[0.68, 0.012, 8, 42]} />
        <meshBasicMaterial color="#fff1a6" transparent opacity={0.42} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={orbCrown} args={[null, null, MAX_PROJECTILES * 3]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#fff1a6" transparent opacity={0.82} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={stormDisk} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <circleGeometry args={[1, 56]} />
        <meshBasicMaterial color={getStormColor(game.stats, getWeaponStage(game))} transparent opacity={0.14 + getWeaponStage(game) * 0.03} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={stormRing} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <torusGeometry args={[0.92, 0.022, 8, 40]} />
        <meshBasicMaterial color={getStormColor(game.stats, getWeaponStage(game))} transparent opacity={0.62} toneMapped={false} />
      </instancedMesh>
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

function PlayerAvatar({ rootRef, game }) {
  const runeGroup = useRef();
  const crestGroup = useRef();
  const stage = getWeaponStage(game);
  const dominantBuild = getDominantBuild(game);
  const focus = dominantBuild?.focus ?? 0;
  const runeCount = Math.min(10, 3 + stage + game.stats.pierce + Math.floor(focus / 2));
  const runeColor = dominantBuild?.color ?? getOrbColor(game.stats, stage);

  useFrame(() => {
    if (runeGroup.current) runeGroup.current.rotation.y += 0.018 + game.stats.cooldown * 0.004;
    if (crestGroup.current) {
      crestGroup.current.rotation.y -= 0.012 + stage * 0.002;
      crestGroup.current.position.y = 1.55 + Math.sin(performance.now() * 0.004) * 0.05;
    }
  });

  return (
    <group ref={rootRef}>
      <RuneDrifterModel />
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
      scale={[1.52, 1.52, 1.52]}
    />
  );
}

PRELOAD_MODEL_URLS.forEach(path => useGLTF.preload(path));

function MapBaseArena() {
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

      <SculptedRuinTerrain />
      <OpenFieldTerrainIdentity />
      <RuneRelicLandmarks />
      <NaturalFieldKit />

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

function SculptedRuinTerrain() {
  const geometry = useMemo(() => {
    const size = ARENA_RADIUS * 2 + 48;
    const segments = 160;
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
  }, []);

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

function NaturalFieldKit() {
  const transforms = useMemo(() => {
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

    const rocks = Array.from({ length: 84 }, (_, index) => {
      const angle = index * 1.17 + 0.42;
      const radius = 30 + (index % 18) * 4.3;
      return place(angle, radius, 2.35 + (index % 5) * 0.42, 0.02, index % 3 === 0 ? 0.1 : 0);
    }).filter(item => item.position.length() < ARENA_RADIUS - 7 && item.position.length() > 22);

    const trees = Array.from({ length: 130 }, (_, index) => {
      const angle = index * 0.67 + (index % 5) * 0.13;
      const radius = 82 + (index % 12) * 2.9;
      return place(angle, radius, 7.3 + (index % 5) * 0.72, -0.04, 0);
    }).filter(item => item.position.length() < ARENA_RADIUS - 1.6);

    const bushes = Array.from({ length: 128 }, (_, index) => {
      const angle = index * 0.97 + 0.17;
      const radius = 25 + (index % 24) * 3.6;
      return place(angle, radius, 1.85 + (index % 4) * 0.2, 0.01, 0);
    }).filter(item => item.position.length() < ARENA_RADIUS - 5.5 && item.position.length() > 18);

    const grass = Array.from({ length: 220 }, (_, index) => {
      const angle = index * 1.61 + (index % 7) * 0.09;
      const radius = 13 + (index % 35) * 2.9;
      return place(angle, radius, 0.86 + (index % 5) * 0.1, 0.025, 0);
    }).filter(item => item.position.length() < ARENA_RADIUS - 6 && item.position.length() > 11);

    return { rocks, trees, bushes, grass };
  }, []);

  const rockLarge = useMemo(() => transforms.rocks.filter((_, index) => index % 3 !== 0), [transforms]);
  const rockTall = useMemo(() => transforms.rocks.filter((_, index) => index % 3 === 0), [transforms]);
  const pineTall = useMemo(() => transforms.trees.filter((_, index) => index % 3 === 0), [transforms]);
  const pineRound = useMemo(() => transforms.trees.filter((_, index) => index % 3 === 1), [transforms]);
  const treeDefault = useMemo(() => transforms.trees.filter((_, index) => index % 3 === 2), [transforms]);

  return (
    <group>
      <StaticModelInstances url={NATURE_MODEL_URLS.rockLargeA} transforms={rockLarge} castShadow receiveShadow />
      <StaticModelInstances url={NATURE_MODEL_URLS.rockTall} transforms={rockTall} castShadow receiveShadow />
      <StaticModelInstances url={NATURE_MODEL_URLS.pineTall} transforms={pineTall} castShadow receiveShadow />
      <StaticModelInstances url={NATURE_MODEL_URLS.pineRound} transforms={pineRound} castShadow receiveShadow />
      <StaticModelInstances url={NATURE_MODEL_URLS.treeDefault} transforms={treeDefault} castShadow receiveShadow />
      <StaticModelInstances url={NATURE_MODEL_URLS.bushLarge} transforms={transforms.bushes} castShadow receiveShadow />
      <StaticModelInstances url={NATURE_MODEL_URLS.grassLarge} transforms={transforms.grass} receiveShadow />
    </group>
  );
}

function OpenFieldTerrainIdentity() {
  const landmarks = useMemo(() => {
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

    return { ridges, standingStones, wornPaths };
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
        local.scale.setScalar(transform.scale);
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
  const bladeCount = getBladeCount(stats, bladeFocus);
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
          args={[part.geometry, part.material, 8]}
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
  const opacity = Math.max(0, 0.75 - progress * 0.55);
  return (
    <group position={[warning.pos.x, 0.1, warning.pos.z]}>
      <mesh position={[0, 0.85, 0]} scale={[0.22 + progress * 0.2, 1.6 - progress * 0.55, 0.22 + progress * 0.2]}>
        <cylinderGeometry args={[1, 1, 1, 16, 1, true]} />
        <meshBasicMaterial color={warning.color} transparent opacity={Math.max(0, 0.24 - progress * 0.08)} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[pulse + progress * 1.8, pulse + progress * 1.8, 1]}>
        <ringGeometry args={[0.62, 0.72, 36]} />
        <meshBasicMaterial color={warning.color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} scale={[0.75 + progress * 0.5, 0.75 + progress * 0.5, 1]}>
        <ringGeometry args={[0.2, 0.24, 4]} />
        <meshBasicMaterial color={warning.color} transparent opacity={opacity * 0.8} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.36 + progress * 0.35, 0]} rotation={[0.5, progress * Math.PI * 3, 0.2]} scale={[0.18, 0.32, 0.18]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={warning.color} transparent opacity={Math.max(0, 0.8 - progress * 0.5)} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.85, 0]} color={warning.color} intensity={0.65} distance={4.5} />
      {warning.label && (
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
      )}
    </group>
  );
}

function HUD({ game, onRestart }) {
  const hpPct = Math.max(0, game.stats.hp / game.stats.maxHp) * 100;
  const xpPct = Math.min(100, (game.xp / game.xpToNext) * 100);
  const runPct = Math.min(100, (game.time / RUN_DURATION) * 100);
  const timeRemaining = Math.max(0, RUN_DURATION - game.time);
  const waveProfile = getWaveProfile(game.wave);
  const threat = getWaveThreat(game.wave, waveProfile);
  const weaponStage = getWeaponStage(game);
  const weaponTone = getOrbColor(game.stats, weaponStage);
  const dominantBuild = getDominantBuild(game);
  const crisis = getCrisisState(game);
  const dashCooldown = game.dash?.cooldown ?? 0;
  const dashCooldownMax = Math.max(0.01, game.dash?.cooldownMax ?? DASH_COOLDOWN);
  const dashPct = Math.max(0, Math.min(100, (1 - dashCooldown / dashCooldownMax) * 100));
  const dashReady = game.dash?.ready ?? dashCooldown <= 0;

  return (
    <section className="hud" aria-label="게임 상태">
      <div className="topbar">
        <div className="meterBlock">
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
        <button className="iconButton" type="button" onClick={onRestart} aria-label="다시 시작">↻</button>
      </div>
      <div className="statusRow">
        <span>생존 {formatTime(game.time)}</span>
        <span>Wave {game.wave}</span>
        <span className="waveName">{waveProfile.name}</span>
        <span>위협 {threat}%</span>
        <span className={`dashStatus ${dashReady ? 'isReady' : ''}`}>
          Dash <b>{dashReady ? 'READY' : `${dashCooldown.toFixed(1)}s`}</b>
          <i style={{ width: `${dashPct}%` }} />
        </span>
        {crisis.level > 0 && <span className={`dangerMessage ${crisis.level >= 3 ? 'isCritical' : ''}`}>{crisis.label}</span>}
        <span>{game.kills} KOs</span>
        {game.overloadTimer > 0 && <span className="overloadMessage">과부하 {game.overloadTimer.toFixed(1)}s</span>}
        {game.pickupFlash > 0 && <span className="pickupMessage">{game.pickupMessage}</span>}
      </div>
      <div className="weaponRow" aria-label="무기 성장 상태">
        <span style={{ '--tone': weaponTone }}>룬 구체 {getWeaponBuildLabel(game, 'orb')}</span>
        <span style={{ '--tone': getStormColor(game.stats, weaponStage) }}>폭풍 낙인 {getWeaponBuildLabel(game, 'storm')}</span>
        <span style={{ '--tone': getBladeColor(game.stats, weaponStage) }}>궤도 칼날 {getWeaponBuildLabel(game, 'blade')}</span>
        <span style={{ '--tone': getLightningColor(game.stats, weaponStage) }}>연쇄 번개 {getWeaponBuildLabel(game, 'chain')}</span>
        <span style={{ '--tone': getNovaColor(game.stats, weaponStage) }}>태양 파동 {getWeaponBuildLabel(game, 'nova')}</span>
      </div>
      {dominantBuild && (
        <div className="buildRow" style={{ '--tone': dominantBuild.color }}>
          <span>{dominantBuild.title}</span>
          <strong>{dominantBuild.label} 집중 {formatFocusLevel(dominantBuild.focus)}</strong>
          <small>{dominantBuild.perks[Math.min(dominantBuild.perks.length - 1, dominantBuild.focus - 1)]}</small>
        </div>
      )}
    </section>
  );
}

function UpgradeOverlay({ game, choices, onChoose }) {
  return (
    <section className="modalLayer" aria-label="레벨업 보상 선택">
      <div className="upgradePanel">
        <div className="upgradeHeader">
          <p className="eyebrow">Level Up</p>
          {(game.pendingUpgrades ?? 0) > 1 && <span className="upgradeQueue">보상 {game.pendingUpgrades}</span>}
        </div>
        <h1>룬을 하나 선택하세요</h1>
        <div className="upgradeGrid">
          {choices.map(choice => (
            <button
              key={choice.id}
              className="upgradeCard"
              type="button"
              style={{ '--tone': getUpgradeTone(choice) }}
              onClick={() => onChoose(choice)}
            >
              <em>{choice.family} / {choice.branch}</em>
              <span>{getUpgradeDisplayTitle(game, choice)}</span>
              <small>{choice.text}</small>
              <b>{getUpgradeFocusPreview(game, choice)}</b>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function EndOverlay({ game, onRestart }) {
  const didWin = game.result === 'victory';
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
  for (const collider of STATIC_COLLIDERS) {
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
      continue;
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
  }
}

function hitsStaticCollider(pos, radius) {
  for (const collider of STATIC_COLLIDERS) {
    if (collider.type === 'circle') {
      const dx = pos.x - collider.x;
      const dz = pos.z - collider.z;
      const minDistance = radius + collider.radius;
      if (dx * dx + dz * dz < minDistance * minDistance) return true;
      continue;
    }
    const halfW = collider.w / 2 + radius;
    const halfD = collider.d / 2 + radius;
    if (Math.abs(pos.x - collider.x) < halfW && Math.abs(pos.z - collider.z) < halfD) {
      return true;
    }
  }
  return false;
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

function getCrisisState(game) {
  if (game.time >= 245) return { level: 4, label: 'FINAL SURGE' };
  if (game.time >= 195) return { level: 3, label: 'ELITE SURGE' };
  if (game.time >= 150) return { level: 2, label: 'RIFT SURGE' };
  if (game.time >= 120) return { level: 1, label: 'RIFT RISING' };
  return { level: 0, label: '' };
}

function getDirectorPressure(game) {
  const timePressure = game.time < 45
    ? 0.86
    : game.time < 90
      ? 0.96
      : game.time < 180
        ? 1.02 + (game.time - 90) / 760
        : Math.min(1.42, 1.18 + (game.time - 180) / 430);
  const buildDepth = Math.max(...Object.values({ ...createEmptyBuildFocus(), ...(game.buildFocus ?? {}) }));
  const buildPressure = buildDepth >= 5 ? 0.08 : buildDepth >= 3 ? 0.05 : buildDepth >= 2 ? 0.03 : 0;
  return Math.min(1.5, timePressure + buildPressure);
}

function getEnemyMovePressure(game) {
  if (game.time >= 245) return 1.32;
  if (game.time >= 195) return 1.23;
  if (game.time >= 150) return 1.13;
  if (game.time >= 120) return 1.04;
  return 1;
}

function getEnemyDamagePressure(game) {
  if (game.time >= 245) return 1.8;
  if (game.time >= 195) return 1.55;
  if (game.time >= 150) return 1.32;
  if (game.time >= 120) return 1.1;
  return 1;
}

function getEnemyAbilityScale(game) {
  if (game.time >= 245) return 0.58;
  if (game.time >= 195) return 0.68;
  if (game.time >= 150) return 0.8;
  if (game.time >= 120) return 0.92;
  return 1;
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
  if (game.time < 130 && roll < 0.28) return 'cache';
  if (roll < 0.46) return 'magnet';
  if (roll < 0.67) return 'overload';
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
  const pos = getSpawnPositionAroundPlayer(playerPos, isRunner ? 37 : isBrute ? 42 : 35, 24);
  const facingAngle = Math.atan2(playerPos.x - pos.x, playerPos.z - pos.z);
  return {
    kind,
    pos,
    hp: hp * survivalScale,
    maxHp: hp * survivalScale,
    speed: (isRunner ? 4.15 : isBrute ? 2.08 : 2.9) + wave * 0.07,
    damage: isBrute ? 6 : isRunner ? 2.5 : 3.5,
    radius: isBrute ? 1.08 : isRunner ? 0.62 : 0.76,
    hitRadius: isBrute ? 1.58 : isRunner ? 1.1 : 1.28,
    xp: isBrute ? 11 : isRunner ? 4 : 5,
    color: isBrute ? '#e07062' : isRunner ? '#ffd75f' : '#8ee894',
    flash: 0,
    facingAngle,
    wobble: Math.random() * Math.PI * 2,
    animSpeed: 4 + Math.random() * 3
  };
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

function getWeaponStage(game) {
  return Math.min(3, Math.max(0, Math.floor((game.level - 1) / 1.2) + Math.floor(game.upgrades.length / 2)));
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

function getBladeCount(stats, bladeFocus = 0) {
  return Math.min(12, 2 + stats.bladeBonus + Math.floor(stats.pierce / 2) + Math.floor(bladeFocus / 2) + (stats.damage > 1.5 ? 1 : 0));
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
    if (hasUpgrade(game, 'storm-volley')) return `낙뢰 ${game.stats.stormStrikes}연`;
    if (hasUpgrade(game, 'storm-carpet')) return `잔류 x${game.stats.stormDuration.toFixed(1)}`;
    return `${stageName} x${game.stats.stormRadius.toFixed(1)}`;
  }
  if (family === 'blade') {
    const bladeFocus = getBuildFocus(game, 'blade');
    if (hasUpgrade(game, 'blade-guard')) return `수호 ${getBladeCount(game.stats, bladeFocus)}연`;
    if (hasUpgrade(game, 'blade-reaper')) return `사신 x${game.stats.bladeDamage.toFixed(1)}`;
    return `${getBladeCount(game.stats, bladeFocus)}연`;
  }
  if (family === 'chain') {
    if (hasUpgrade(game, 'chain-web')) return `전류망 ${game.stats.lightningChains}연쇄`;
    if (hasUpgrade(game, 'chain-smite')) return `처형 x${(1 + game.stats.lightningExecute * 0.34).toFixed(1)}`;
    return `${game.stats.lightningChains}연쇄`;
  }
  if (family === 'nova') {
    if (hasUpgrade(game, 'nova-pulse')) return `쌍파동 x${game.stats.novaPulse}`;
    if (hasUpgrade(game, 'nova-comet')) return `핵심 x${game.stats.novaDamage.toFixed(1)}`;
    return `x${game.stats.novaRadius.toFixed(1)}`;
  }
  return stageName;
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

function getUpgradeTone(upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  return key ? BUILD_FOCUS_META[key].color : '#fff1a6';
}

function getUpgradeFocusPreview(game, upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  if (!key) return '공용 강화';
  const focus = getBuildFocus(game, key) + 1;
  const meta = BUILD_FOCUS_META[key];
  return `${meta.title} ${formatFocusLevel(focus)} - ${meta.perks[Math.min(meta.perks.length - 1, focus - 1)]}`;
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

  const available = weighted.filter(upgrade => isUpgradeAvailable(game, upgrade) && !excludedIds.has(upgrade.id));
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

function getUpgradeWeight(game, upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  const dominant = getDominantBuild(game);
  const pickCount = getUpgradePickCount(game, upgrade.id);
  let weight = WEAPON_UPGRADE_IDS.has(upgrade.id) ? 1.15 : 0.78;

  if (key) {
    const focus = getBuildFocus(game, key);
    weight += focus * 0.48;
    if (dominant?.key === key) weight += 1.15;
    if (focus === 0 && game.level <= 8) weight += 1.05;
    if (game.level <= 5 && (key === 'orb' || key === 'storm' || key === 'chain' || key === 'nova')) weight += 0.34;
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
  const available = candidates.filter(upgrade => !choices.some(choice => choice.id === upgrade.id));
  const choice = pickWeightedUpgrade(available, game);
  if (choice) choices.push(choice);
}

function pickUpgrades(game) {
  const available = upgradePool.filter(upgrade => isUpgradeAvailable(game, upgrade));
  const weaponChoices = available.filter(upgrade => WEAPON_UPGRADE_IDS.has(upgrade.id));
  const utilityChoices = available.filter(upgrade => !WEAPON_UPGRADE_IDS.has(upgrade.id));
  const dominant = getDominantBuild(game);
  const choices = [];

  if (dominant?.focus >= 2) {
    addDraftChoice(choices, weaponChoices.filter(upgrade => getUpgradeFocusKey(upgrade) === dominant.key), game);
  }
  if (game.level <= 8) {
    for (let index = 0; index < 2; index += 1) {
      addDraftChoice(choices, weaponChoices.filter(upgrade => {
        const key = getUpgradeFocusKey(upgrade);
        return key && getBuildFocus(game, key) === 0 && !choices.some(choice => getUpgradeFocusKey(choice) === key);
      }), game);
    }
  }
  addDraftChoice(choices, weaponChoices, game);
  addDraftChoice(choices, utilityChoices, game);
  while (choices.length < 4 && choices.length < available.length) {
    addDraftChoice(choices, available, game);
  }

  return choices.sort(() => Math.random() - 0.5);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

createRoot(document.getElementById('root')).render(<App />);
