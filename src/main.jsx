import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Text, useGLTF } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  CORE_PRELOAD_MODEL_URLS,
  HIGH_DETAIL_PRELOAD_MODEL_URLS,
  MODEL_URLS,
  PROJECTILE_MODEL_URLS
} from './config/assets.js';
import {
  ART_TOKENS,
  BOSS_PATTERN_META,
  BOSS_PATTERN_ORDER,
  BOSS_WAVE_SCHEDULE,
  DAMAGE_SOURCE_META,
  EARLY_FIELD_ITEM_SCHEDULE,
  ELITE_ROLE_META,
  FIELD_ITEM_META,
  SURGE_EVENTS,
  WEAPON_CATALOG as weaponCatalog
} from './config/gameData.js';
import {
  ARENA_RADIUS,
  ARMORY_DOUBLE_BOOST_TIME,
  ARMORY_TRIPLE_BOOST_TIME,
  DASH_COOLDOWN,
  DASH_SPEED,
  DASH_TIME,
  FIELD_ITEM_ATTRACT_RADIUS,
  FIELD_ITEM_PICKUP_RADIUS,
  MAX_DAMAGE_NUMBERS,
  MAX_ENEMIES,
  MAX_FIELD_ITEMS,
  MAX_HIT_BURSTS,
  MAX_ORBIT_BLADES,
  MAX_PROJECTILES,
  MAX_SPAWN_WARNINGS,
  MAX_WEAPON_EFFECTS,
  MAX_XP_GEMS,
  OVERLOAD_DURATION,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYER_VISUAL_BASE_SCALE,
  PROJECTILE_GRID_CELL_SIZE,
  PROJECTILE_GRID_KEY_STRIDE,
  RUN_DURATION,
  SHRINE_ACTIVATE_RADIUS,
  SHRINE_CHANNEL_TIME,
  WAVE_DURATION,
  XP_BASE_MAGNET_RADIUS,
  XP_PICKUP_RADIUS
} from './config/gameTuning.js';
import {
  getRuntimeBudget,
  getRuntimeVisualQuality,
  getStateSyncInterval,
  getVisualBudget,
  isOptionalRenderFeatureEnabled,
  useVisualQuality
} from './hooks/useVisualQuality.js';
import {
  applyCombatRhythm,
  applyDamageToEnemy,
  createBoss,
  createElite,
  createEnemy,
  createFieldItem,
  createSplitRunner,
  createSummonedRunner,
  getBossPhaseMeta,
  getCombatRhythm,
  getDirectorPressure,
  getEnemyAbilityScale,
  getEnemyAccentColor,
  getEnemyDamagePressure,
  getEnemyMovePressure,
  getFieldItemDropPosition,
  getSpawnColor,
  getWaveProfile,
  getWaveThreat,
  pickFieldItemType
} from './systems/enemyDirector.js';
import {
  getEnemyTerrainY,
  getPlayerTerrainY,
  getTerrainHeight,
  hitsStaticCollider,
  resolveStaticCollisions
} from './systems/terrain.js';
import {
  createEmptyRunStats,
  createInitialGame,
  createQaBossGame,
  createQaResultGame,
  createQaStressGame,
  getItemPickupCount,
  withItemPickup,
  withShrineActivation
} from './systems/gameState.js';
import {
  applyBuildFocus,
  getBladeColor,
  getBladeCount,
  getBuildFocus,
  getDominantBuild,
  getFocusMessage,
  getLightningColor,
  getNovaColor,
  getOrbColor,
  getStormColor,
  getSynergyLevel,
  getUpgradeFocusKey,
  getWeaponStage,
  getWeaponTier,
  hasUpgrade,
  isWeaponFamilyUnlocked,
  pickArmoryBoost,
  pickUpgrades
} from './systems/progression.js';
import { HUD } from './ui/GameHud.jsx';
import { EndOverlay, PauseOverlay, UpgradeOverlay } from './ui/GameOverlays.jsx';
import { createTouchControlsState, TouchControls } from './ui/TouchControls.jsx';
import { BossNameplates, BossPresence } from './world/BossIndicators.jsx';
import { EnemyAccents, EnemyGroundAuras } from './world/EnemyEffects.jsx';
import { SourceEnemyInstances, StylizedEnemyInstances } from './world/EnemyInstances.jsx';
import { createInitialShrines, FieldPickupItems, GemBeacons, RuneShrineSites } from './world/FieldItemsAndShrines.jsx';
import { GroundDecalInstances } from './world/InstancedGeometry.jsx';
import { MapBaseArena } from './world/MapBaseArena.jsx';
import { PlayerPresence } from './world/PlayerPresence.jsx';
import { SourceProjectileInstances, StylizedProjectileInstances } from './world/ProjectileInstances.jsx';
import { useInstancedModelParts } from './world/StaticModelInstances.jsx';
import { ProjectileAuraRings, WeaponStrikeEffects } from './world/WeaponEffects.jsx';
import './styles.css';

const preloadedModelUrls = new Set();

function preloadModelUrls(urls) {
  urls.forEach(url => {
    if (preloadedModelUrls.has(url)) return;
    preloadedModelUrls.add(url);
    useGLTF.preload(url);
  });
}

function getProjectileGridCoord(value) {
  return Math.floor(value / PROJECTILE_GRID_CELL_SIZE);
}

function getProjectileGridKey(cellX, cellZ) {
  return cellX * PROJECTILE_GRID_KEY_STRIDE + cellZ;
}

function ModelPreloads({ visualQuality }) {
  useEffect(() => {
    preloadModelUrls(CORE_PRELOAD_MODEL_URLS);
    if (visualQuality === 'high') {
      preloadModelUrls(HIGH_DETAIL_PRELOAD_MODEL_URLS);
    }
  }, [visualQuality]);

  return null;
}

function App() {
  const [game, setGame] = useState(() => createInitialGame());
  const [upgradeChoices, setUpgradeChoices] = useState([]);
  const sceneApi = useRef(null);
  const touchControls = useRef(createTouchControlsState());
  const visualQuality = useVisualQuality();
  const runtimeVisualQuality = getRuntimeVisualQuality(visualQuality, game);
  const enablePostFx = useMemo(() => (
    runtimeVisualQuality === 'high' && isOptionalRenderFeatureEnabled('fx')
  ), [runtimeVisualQuality]);
  const enableEnvironment = useMemo(() => (
    runtimeVisualQuality === 'high' && isOptionalRenderFeatureEnabled('env')
  ), [runtimeVisualQuality]);
  const canvasDpr = useMemo(() => (
    runtimeVisualQuality === 'low' ? [0.82, 0.92] : runtimeVisualQuality === 'balanced' ? [0.94, 1.04] : [1.0, 1.14]
  ), [runtimeVisualQuality]);
  const canvasCamera = useMemo(() => ({
    position: runtimeVisualQuality === 'low' ? [0, 38, 64] : runtimeVisualQuality === 'balanced' ? [0, 42, 70] : [0, 44, 74],
    fov: runtimeVisualQuality === 'low' ? 50 : 48,
    near: 0.1,
    far: 420
  }), [runtimeVisualQuality]);
  const canvasGl = useMemo(() => ({
    antialias: runtimeVisualQuality !== 'low' && enablePostFx,
    alpha: false,
    depth: true,
    stencil: false,
    powerPreference: runtimeVisualQuality === 'high' && enablePostFx ? 'high-performance' : 'low-power'
  }), [enablePostFx, runtimeVisualQuality]);

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
        [120, 260, 620].forEach(delay => {
          window.setTimeout(() => sceneApi.current?.stress?.(options), delay);
        });
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
    } else if (qaMode === 'silhouette') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.stress({
        enemies: 92,
        projectiles: 0,
        gems: 0,
        hitBursts: 0,
        weaponEffects: 0
      }), 120);
    } else if (qaMode === 'victory' || qaMode === 'defeat') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.result(qaMode), 120);
    }
    return () => {
      delete window.__RUNE_DRIFT_QA__;
    };
  }, []);

  return (
    <main className={`shell visual-${runtimeVisualQuality} ${game.damageFlash > 0 ? 'isHurt' : ''} ${game.stats.hp / game.stats.maxHp <= 0.34 ? 'isLowHp' : ''}`}>
      <ModelPreloads visualQuality={runtimeVisualQuality} />
      <Canvas
        shadows={false}
        camera={canvasCamera}
        dpr={canvasDpr}
        gl={canvasGl}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0.92, 0);
          camera.updateProjectionMatrix();
        }}
      >
        <color attach="background" args={['#1d3a28']} />
        <fog attach="fog" args={['#376340', 112, 310]} />
        <GameScene
          refApi={sceneApi}
          game={game}
          setGame={setGame}
          onLevelUp={onLevelUp}
          visualQuality={runtimeVisualQuality}
          touchControlsRef={touchControls}
        />
        {enableEnvironment && (
          <Suspense fallback={null}>
            <Environment preset="sunset" />
          </Suspense>
        )}
        {enablePostFx && (
          <EffectComposer>
            <Bloom luminanceThreshold={0.34} intensity={0.72} mipmapBlur />
            <Vignette eskil={false} offset={0.2} darkness={0.62} />
          </EffectComposer>
        )}
      </Canvas>
      <HUD game={game} onRestart={restart} onPause={togglePause} />
      {game.phase === 'playing' && <TouchControls controlsRef={touchControls} />}
      {game.phase === 'paused' && <PauseOverlay game={game} onResume={resume} onRestart={restart} />}
      {game.phase === 'upgrade' && (
        <UpgradeOverlay game={game} choices={upgradeChoices} onChoose={chooseUpgrade} />
      )}
      {game.phase === 'ended' && <EndOverlay game={game} onRestart={restart} />}
    </main>
  );
}

function GameScene({ refApi, game, setGame, onLevelUp, visualQuality = 'high', touchControlsRef }) {
  const player = useRef({
    pos: new THREE.Vector3(0, 0.55, 0),
    vel: new THREE.Vector3(),
    dashTimer: 0,
    dashCd: 0,
    invuln: 0,
    castPulse: 0,
    hurtPulse: 0,
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
  const compactCamera = typeof window !== 'undefined'
    && (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth <= 700);
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    color: new THREE.Color(),
    scale: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    vec: new THREE.Vector3(),
    input: new THREE.Vector3(),
    moveDirection: new THREE.Vector3(),
    dashDirection: new THREE.Vector3(),
    velocityTarget: new THREE.Vector3(),
    enemyDirection: new THREE.Vector3(),
    projectilePush: new THREE.Vector3(),
    cameraPosition: new THREE.Vector3(),
    flat: new THREE.Vector2()
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
        player.current.castPulse = 0;
        player.current.hurtPulse = 0;
        dashQueued.current = false;
        if (touchControlsRef?.current) Object.assign(touchControlsRef.current, createTouchControlsState());
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
    };
  }, [refApi, visualQuality, touchControlsRef]);

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
    const stateSyncInterval = getStateSyncInterval(visualQuality, game);
    if (stateSyncElapsed.current >= stateSyncInterval || game.time + stateSyncElapsed.current >= RUN_DURATION) {
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

  const pulsePlayerCast = (strength = 0.18) => {
    player.current.castPulse = Math.max(player.current.castPulse ?? 0, Math.min(0.68, strength * 1.24));
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
    const touchInput = touchControlsRef?.current;
    if (touchInput?.dashQueued) {
      dashQueued.current = true;
      touchInput.dashQueued = false;
    }
    const input = scratch.input.set(
      Number(keys.current.has('KeyD') || keys.current.has('ArrowRight')) - Number(keys.current.has('KeyA') || keys.current.has('ArrowLeft')),
      0,
      Number(keys.current.has('KeyS') || keys.current.has('ArrowDown')) - Number(keys.current.has('KeyW') || keys.current.has('ArrowUp'))
    );
    if (touchInput?.active) {
      input.x += touchInput.x;
      input.z += touchInput.z;
    }
    const hasInput = input.lengthSq() > 0;
    if (hasInput) input.normalize();

    player.current.dashCd = Math.max(0, player.current.dashCd - dt);
    player.current.invuln = Math.max(0, player.current.invuln - dt);
    player.current.castPulse = Math.max(0, (player.current.castPulse ?? 0) - dt * 3.6);
    player.current.hurtPulse = Math.max(0, (player.current.hurtPulse ?? 0) - dt * 2.8);

    if (dashQueued.current && player.current.dashCd <= 0) {
      const dashDir = hasInput
        ? scratch.dashDirection.copy(input)
        : scratch.dashDirection.copy(player.current.facing);
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
    const moveDirection = isDashing
      ? scratch.moveDirection.copy(player.current.facing)
      : scratch.moveDirection.copy(input);
    const speed = isDashing ? DASH_SPEED : PLAYER_SPEED * stats.speed;
    player.current.dashTimer = Math.max(0, player.current.dashTimer - dt);
    player.current.vel.lerp(scratch.velocityTarget.copy(moveDirection).multiplyScalar(speed), isDashing ? 0.78 : 0.32);
    player.current.pos.addScaledVector(player.current.vel, dt);
    resolveStaticCollisions(player.current.pos, PLAYER_RADIUS);

    const flat = scratch.flat.set(player.current.pos.x, player.current.pos.z);
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
      const castPulse = player.current.castPulse ?? 0;
      const hurtPulse = player.current.hurtPulse ?? 0;
      const bob = (Math.abs(step) * 0.09 + stepLift * 0.04) * moveAmount + dashPower * 0.04;
      const sideSway = Math.sin(stride * 0.5) * 0.072 * moveAmount;
      const tilt = Math.min(0.32, moveSpeed * 0.022) + castPulse * 0.04;
      const dashScale = 1 + dashPower * 0.16;
      playerMesh.current.position.y += bob + castPulse * 0.04 + hurtPulse * 0.03;
      playerMesh.current.rotation.set(
        -player.current.facing.z * tilt + step * 0.065 * moveAmount - dashPower * 0.12 - hurtPulse * 0.16,
        yaw + sideSway + hurtPulse * Math.sin(stride * 0.8) * 0.12,
        player.current.facing.x * tilt + Math.sin(stride * 0.5) * 0.055 * moveAmount + castPulse * 0.12
      );
      playerMesh.current.scale.set(
        dashScale * (1 + stepLift * 0.045 + castPulse * 0.08 + hurtPulse * 0.05),
        dashScale * (1 - stepLift * 0.07 + dashPower * 0.02 - hurtPulse * 0.08),
        dashScale * (1 + moveAmount * 0.035 + dashPower * 0.11 + castPulse * 0.05)
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
        pulsePlayerCast(0.16 + weaponStage * 0.012);
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
      pulsePlayerCast(0.22 + stormFocus * 0.012);
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
        if (canAddHitBurst(8)) {
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
      }
      stormTimer.current = Math.max(0.38, weaponCatalog[1].cooldown * stats.cooldown * stats.stormCooldown * overloadCooldown * (1 - weaponStage * 0.06) * (1 - Math.min(0.14, stormFocus * 0.025 + stormChainLevel * 0.018)));
    }

    if (chainUnlocked && lightningTimer.current <= 0 && enemies.current.length > 0) {
      pulsePlayerCast(0.18 + chainFocus * 0.01);
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
        if (canAddHitBurst(8)) {
          hitBursts.current.push({
            pos: enemy.pos.clone(),
            life: 0.24,
            maxLife: 0.24,
            color,
            type: 'lightning',
            stage: weaponStage,
            radius: 0.95 + weaponStage * 0.12
          });
        }
        if (canAddWeaponEffect(6)) {
          weaponEffects.current.push({
            type: 'beam',
            from: previous.clone(),
            to: enemy.pos.clone().add(new THREE.Vector3(0, 1.0, 0)),
            life: 0.18,
            maxLife: 0.18,
            color,
            width: 0.11 + weaponStage * 0.015
          });
        }
        previous = enemy.pos.clone().add(new THREE.Vector3(0, 1.0, 0));
      });
      if (chainTargets.length > 0) cameraShake.current = Math.max(cameraShake.current, 0.1);
      lightningTimer.current = Math.max(0.3, weaponCatalog[3].cooldown * stats.cooldown * overloadCooldown * (1 - weaponStage * 0.05) * (1 - Math.min(0.12, chainFocus * 0.02)));
    }

    if (novaUnlocked && novaTimer.current <= 0 && enemies.current.length > 0) {
      pulsePlayerCast(0.32 + novaFocus * 0.012);
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
            if (canAddHitBurst(8)) {
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
    player.current.hurtPulse = Math.max(player.current.hurtPulse ?? 0, 0.62);
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
      const toPlayer = scratch.enemyDirection.copy(playerPos).sub(enemy.pos).setY(0);
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
      enemy.motionSpeed = enemy.speed * speedMultiplier;
      enemy.motionIntent = distance > enemy.radius + PLAYER_RADIUS
        ? THREE.MathUtils.clamp(enemy.motionSpeed / 5.4, 0.16, 1.36)
        : 0.08;
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
            ? scratch.projectilePush.copy(enemy.pos).sub(player.current.pos).setY(0)
            : scratch.projectilePush.copy(projectile.vel).setY(0);
          if (push.lengthSq() > 0.001) {
            enemy.pos.addScaledVector(push.normalize(), projectile.type === 'storm' ? 0.28 : 0.18);
          }
          addDamageNumber(enemy.pos, Math.ceil(dealt), projectile.color, projectile.type === 'storm' ? 0.82 : 0.62);
          if (canAddHitBurst(8)) {
            hitBursts.current.push({
              pos: enemy.pos.clone(),
              life: 0.28 + (projectile.stage ?? 0) * 0.04,
              maxLife: 0.28 + (projectile.stage ?? 0) * 0.04,
              color: projectile.color,
              type: projectile.type,
              stage: projectile.stage ?? 0,
              radius: projectile.radius
            });
          }
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
        if (canAddHitBurst(10)) {
          hitBursts.current.push({ pos: enemy.pos.clone(), life: 0.36, maxLife: 0.36, color: enemy.kind === 'elite' || enemy.kind === 'boss' ? getEnemyAccentColor(enemy) : '#9df57a' });
        }
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
      const distanceSq = gem.pos.distanceToSquared(playerPos);
      const passiveReach = Math.min(18, currentGame.level * 0.38 + currentGame.time * 0.06);
      const crowdReach = gemCount > 170 ? Math.min(10, (gemCount - 170) * 0.04) : 0;
      const magnetDistance = gem.magnetized ? 190 : XP_BASE_MAGNET_RADIUS * currentGame.stats.magnet + passiveReach + crowdReach;
      if (distanceSq < magnetDistance * magnetDistance && distanceSq > 0.000001) {
        const distance = Math.sqrt(distanceSq);
        const pull = scratch.vec.copy(playerPos).sub(gem.pos).setY(0).normalize();
        const pullSpeed = gem.magnetized ? 44 + Math.min(110, distance * 1.35) : 12 + magnetDistance * 1.65;
        gem.pos.addScaledVector(pull, dt * pullSpeed);
      }
      if (distanceSq < XP_PICKUP_RADIUS * XP_PICKUP_RADIUS) {
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
      const distanceSq = item.pos.distanceToSquared(player.current.pos);
      if (distanceSq < FIELD_ITEM_ATTRACT_RADIUS * FIELD_ITEM_ATTRACT_RADIUS && distanceSq > 0.000001) {
        const distance = Math.sqrt(distanceSq);
        const pull = scratch.vec.copy(player.current.pos).sub(item.pos).setY(0).normalize();
        item.pos.addScaledVector(pull, dt * (6.2 + (FIELD_ITEM_ATTRACT_RADIUS - distance) * 1.35));
      }
      if (distanceSq <= FIELD_ITEM_PICKUP_RADIUS * FIELD_ITEM_PICKUP_RADIUS) {
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
      const distanceSq = shrine.pos.distanceToSquared(player.current.pos);
      if (distanceSq < SHRINE_ACTIVATE_RADIUS * SHRINE_ACTIVATE_RADIUS) {
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
        const boostCount = current.time < ARMORY_DOUBLE_BOOST_TIME ? 1 : 2;
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
        const boostCount = current.time < ARMORY_DOUBLE_BOOST_TIME ? 1 : current.time > ARMORY_TRIPLE_BOOST_TIME ? 3 : 2;
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
      addDamageNumber(player.current.pos, currentGame.time < ARMORY_DOUBLE_BOOST_TIME ? '무기 강화 x1' : currentGame.time > ARMORY_TRIPLE_BOOST_TIME ? '무기 강화 x3' : '무기 강화 x2', color, 1.0);
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

  const canAddHitBurst = (overflow = 8) => (
    hitBursts.current.length < getVisualBudget(visualQuality).hitBursts + overflow
  );

  const canAddWeaponEffect = (overflow = 6) => (
    weaponEffects.current.length < getVisualBudget(visualQuality).weaponEffects + overflow
  );

  const addDamageNumber = (pos, value, color, size = 0.56) => {
    const budget = getVisualBudget(visualQuality).damageNumbers;
    const isPriority = typeof value === 'string' && /[A-Z가-힣]/.test(value);
    const loadRatio = (enemies.current.length / Math.max(1, runtimeBudget.maxEnemies))
      + (projectiles.current.length / Math.max(1, runtimeBudget.maxProjectiles));
    if (!isPriority && visualQuality === 'low' && Math.random() < 0.55) return;
    if (!isPriority && loadRatio > 1.35 && Math.random() < 0.42) return;
    if (!isPriority && damageNumbers.current.length >= budget + 8) return;
    if (damageNumbers.current.length >= budget + 14) damageNumbers.current.length = budget + 8;
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
    const framedTarget = scratch.vec.copy(player.current.pos);
    const frameRadius = ARENA_RADIUS - 38;
    const flatTarget = scratch.flat.set(framedTarget.x, framedTarget.z);
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
    const cameraHeight = compactCamera ? 38 : visualQuality === 'balanced' ? 42 : 44;
    const cameraDepth = compactCamera ? 64 : visualQuality === 'balanced' ? 70 : 74;
    camera.position.lerp(scratch.cameraPosition.set(cameraTarget.current.x + shakeX, cameraHeight + cameraTarget.current.y * 0.38, cameraTarget.current.z + cameraDepth + shakeZ), 0.08);
    camera.lookAt(cameraTarget.current.x, (compactCamera ? 0.82 : 0.62) + cameraTarget.current.y * 0.68, cameraTarget.current.z);
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
      <hemisphereLight args={['#fff0bd', '#517d47', 0.82]} />
      <ambientLight intensity={0.38} />
      <directionalLight
        castShadow={false}
        position={[24, 34, 18]}
        intensity={visualQuality === 'low' ? 2.25 : 2.55}
        color="#fff0bd"
      />
      {visualQuality !== 'low' && <directionalLight position={[-34, 20, -48]} intensity={0.44} color="#b9e9ff" />}
      <pointLight position={[0, 2.4, 0]} intensity={visualQuality === 'low' ? 0.95 : 1.35} color={ART_TOKENS.wornGold} distance={14} />
      {visualQuality === 'high' && <pointLight position={[0, 5.8, 0]} intensity={0.72} color={ART_TOKENS.runeMint} distance={34} />}
      {visualQuality === 'high' && <pointLight position={[-42, 3.2, -22]} intensity={0.5} color="#ffdca2" distance={38} />}
      {visualQuality === 'high' && <pointLight position={[48, 3.2, 26]} intensity={0.48} color="#b7ef9d" distance={34} />}
      <MapBaseArena visualQuality={visualQuality} />
      {visualQuality !== 'low' && <ArenaAtmosphere />}
      <Suspense fallback={null}>
        <PlayerAvatar rootRef={playerMesh} game={game} player={player} visualQuality={visualQuality} />
      </Suspense>
      <PlayerPresence player={player} game={game} visualQuality={visualQuality} />
      <Suspense fallback={null}>
        <OrbitBlades player={player} game={game} visualQuality={visualQuality} />
      </Suspense>
      <EnemyGroundAuras enemiesRef={enemies} visualQuality={visualQuality} />
      <EnemyAccents enemiesRef={enemies} visualQuality={visualQuality} />
      {visualQuality === 'high' ? (
        <Suspense fallback={null}>
          <SourceEnemyInstances enemiesRef={enemies} kind="golem" url={MODEL_URLS.golem} scaleMultiplier={2.42} materialTone="#638f5e" visualQuality={visualQuality} />
          <SourceEnemyInstances enemiesRef={enemies} kind="runner" url={MODEL_URLS.runner} scaleMultiplier={2.82} materialTone="#4d6fa5" visualQuality={visualQuality} />
          <SourceEnemyInstances enemiesRef={enemies} kind="brute" url={MODEL_URLS.brute} scaleMultiplier={2.92} materialTone="#b84f42" visualQuality={visualQuality} />
          <SourceEnemyInstances enemiesRef={enemies} kind="elite" url={MODEL_URLS.boss} scaleMultiplier={1.26} materialTone="#8b6cc0" visualQuality={visualQuality} />
          <SourceEnemyInstances enemiesRef={enemies} kind="boss" url={MODEL_URLS.boss} scaleMultiplier={2.05} materialTone="#b08a48" visualQuality={visualQuality} />
        </Suspense>
      ) : (
        <StylizedEnemyInstances enemiesRef={enemies} visualQuality={visualQuality} />
      )}
      <BossNameplates enemiesRef={enemies} />
      <BossPresence enemiesRef={enemies} />
      <instancedMesh ref={gemMesh} args={[null, null, MAX_XP_GEMS]} frustumCulled={false}>
        <octahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial color="#9ff7ff" emissive="#38d9ff" emissiveIntensity={3.5} roughness={0.18} toneMapped={false} />
      </instancedMesh>
      {visualQuality === 'high' && <GemBeacons gemsRef={xpGems} visualQuality={visualQuality} />}
      <FieldPickupItems itemsRef={fieldItems} visualQuality={visualQuality} />
      <RuneShrineSites shrinesRef={shrines} visualQuality={visualQuality} />
      {visualQuality === 'high' ? (
        <Suspense fallback={null}>
          <SourceProjectileInstances projectilesRef={projectiles} type="orb" url={PROJECTILE_MODEL_URLS.orb} scaleMultiplier={1.25} visualQuality={visualQuality} />
          <SourceProjectileInstances projectilesRef={projectiles} type="storm" url={PROJECTILE_MODEL_URLS.storm} scaleMultiplier={1.85} visualQuality={visualQuality} />
        </Suspense>
      ) : (
        <StylizedProjectileInstances projectilesRef={projectiles} visualQuality={visualQuality} />
      )}
      <ProjectileAuraRings projectilesRef={projectiles} game={game} visualQuality={visualQuality} />
      <WeaponStrikeEffects effectsRef={weaponEffects} visualQuality={visualQuality} />
      {hitBursts.current.slice(0, getVisualBudget(visualQuality).hitBursts).map((burst, index) => (
        <HitBurst key={`${index}-${burst.maxLife}`} burst={burst} visualQuality={visualQuality} />
      ))}
      {damageNumbers.current.slice(0, getVisualBudget(visualQuality).damageNumbers).map((number, index) => (
        <DamageNumber key={`${index}-${number.value}-${number.maxLife}`} number={number} />
      ))}
      {spawnWarnings.current.slice(0, getVisualBudget(visualQuality).spawnWarnings).map((warning, index) => (
        <SpawnWarning key={`${index}-${warning.maxLife}`} warning={warning} visualQuality={visualQuality} />
      ))}
    </>
  );
}

function PlayerAvatar({ rootRef, game, player, visualQuality = 'high' }) {
  const runeGroup = useRef();
  const crestGroup = useRef();
  const cloakMesh = useRef();
  const leftStrideMesh = useRef();
  const rightStrideMesh = useRef();
  const staffTrailMesh = useRef();
  const shoulderSash = useRef();
  const bodyShell = useRef();
  const castArcMesh = useRef();
  const hurtGuardMesh = useRef();
  const hurtShardMesh = useRef();
  const stage = getWeaponStage(game);
  const dominantBuild = getDominantBuild(game);
  const focus = dominantBuild?.focus ?? 0;
  const simplifiedVfx = visualQuality !== 'high';
  const runeCount = simplifiedVfx
    ? Math.min(5, 2 + Math.min(stage, 2) + Math.floor(focus / 4))
    : Math.min(10, 3 + stage + game.stats.pierce + Math.floor(focus / 2));
  const runeColor = dominantBuild?.color ?? getOrbColor(game.stats, stage);

  useFrame(() => {
    const now = performance.now();
    const speed = player?.current?.vel?.length?.() ?? 0;
    const moveAmount = THREE.MathUtils.clamp(speed / (PLAYER_SPEED * 1.16), 0, 1);
    const dashPower = player?.current?.dashTimer > 0 ? 1 : 0;
    const castPulse = player?.current?.castPulse ?? 0;
    const hurtPulse = player?.current?.hurtPulse ?? 0;
    const stride = now * 0.013;
    if (bodyShell.current) {
      const step = Math.sin(stride);
      bodyShell.current.position.set(0, Math.abs(step) * 0.046 * moveAmount + castPulse * 0.06 + hurtPulse * 0.052, 0);
      bodyShell.current.rotation.set(
        -0.05 * moveAmount + castPulse * 0.12 - hurtPulse * 0.18,
        Math.sin(stride * 0.5) * 0.044 * moveAmount + hurtPulse * Math.sin(stride * 1.4) * 0.08,
        Math.sin(stride) * 0.056 * moveAmount + castPulse * 0.13
      );
      bodyShell.current.scale.set(
        1 + castPulse * 0.065 + hurtPulse * 0.045,
        1 - hurtPulse * 0.075,
        1 + dashPower * 0.052 + castPulse * 0.038
      );
    }
    if (runeGroup.current) runeGroup.current.rotation.y += 0.018 + game.stats.cooldown * 0.004;
    if (crestGroup.current) {
      crestGroup.current.rotation.y -= 0.012 + stage * 0.002 + castPulse * 0.012;
      crestGroup.current.rotation.z = castPulse * 0.16 - hurtPulse * 0.08;
      crestGroup.current.position.y = 1.55 + Math.sin(now * 0.004) * 0.05 + moveAmount * 0.035 + castPulse * 0.08;
    }
    if (cloakMesh.current) {
      cloakMesh.current.visible = moveAmount > 0.04 || dashPower > 0;
      cloakMesh.current.position.set(0, 0.75 + Math.sin(stride * 0.5) * 0.035, -0.56 - moveAmount * 0.22 - dashPower * 0.24);
      cloakMesh.current.rotation.set(0.25 + moveAmount * 0.2 + castPulse * 0.12 + hurtPulse * 0.1, Math.sin(stride * 0.52) * 0.1, Math.sin(stride) * 0.075 * moveAmount + hurtPulse * 0.08);
      cloakMesh.current.scale.set(0.62 + dashPower * 0.32 + castPulse * 0.12, 1.08 + moveAmount * 0.5 + dashPower * 0.58 + castPulse * 0.24, 1);
      cloakMesh.current.material.opacity = 0.2 + moveAmount * 0.12 + dashPower * 0.18 + castPulse * 0.14;
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
      staffTrailMesh.current.visible = moveAmount > 0.06 || dashPower > 0 || castPulse > 0.02;
      staffTrailMesh.current.position.set(0.38 + Math.sin(stride * 0.5) * 0.04, 1.02 + Math.sin(stride) * 0.045 + castPulse * 0.12, 0.08 + castPulse * 0.18);
      staffTrailMesh.current.rotation.set(0.35 + castPulse * 0.28, -0.18, -0.52 + Math.sin(stride * 0.72) * 0.14 - castPulse * 0.48);
      staffTrailMesh.current.scale.set(0.12 + stage * 0.012 + castPulse * 0.05, 0.7 + moveAmount * 0.28 + dashPower * 0.24 + castPulse * 0.72, 0.12);
      staffTrailMesh.current.material.opacity = 0.38 + Math.min(0.42, castPulse * 1.45) + dashPower * 0.08;
    }
    if (shoulderSash.current) {
      shoulderSash.current.visible = moveAmount > 0.02 || focus > 0;
      shoulderSash.current.position.y = 1.05 + Math.sin(stride * 0.48) * 0.045;
      shoulderSash.current.rotation.set(0.16 + moveAmount * 0.1 + hurtPulse * 0.12, Math.sin(stride * 0.34) * 0.08, Math.sin(stride) * 0.12 * moveAmount + castPulse * 0.08);
    }
    if (castArcMesh.current) {
      castArcMesh.current.visible = castPulse > 0.018;
      castArcMesh.current.position.set(0.46, 1.06 + castPulse * 0.24, 0.24 + castPulse * 0.24);
      castArcMesh.current.rotation.set(0.18, -0.42 + castPulse * 0.42, -0.76 + castPulse * 2.05);
      castArcMesh.current.scale.setScalar(0.68 + castPulse * 1.75 + stage * 0.05);
      castArcMesh.current.material.opacity = Math.min(0.78, 0.2 + castPulse * 2.1);
    }
    if (hurtGuardMesh.current) {
      hurtGuardMesh.current.visible = hurtPulse > 0.02;
      hurtGuardMesh.current.rotation.z += 0.082;
      hurtGuardMesh.current.scale.setScalar(0.86 + hurtPulse * 1.8);
      hurtGuardMesh.current.material.opacity = Math.min(0.76, hurtPulse * 1.55);
    }
    if (hurtShardMesh.current) {
      hurtShardMesh.current.visible = hurtPulse > 0.025;
      hurtShardMesh.current.position.set(0, 1.12 + hurtPulse * 0.22, 0.06);
      hurtShardMesh.current.rotation.set(0.72 + hurtPulse * 0.38, now * 0.008, Math.PI / 4 + hurtPulse * 1.2);
      hurtShardMesh.current.scale.set(0.22 + hurtPulse * 0.38, 0.22 + hurtPulse * 0.38, 0.22 + hurtPulse * 0.38);
      hurtShardMesh.current.material.opacity = Math.min(0.72, hurtPulse * 1.3);
    }
  });

  return (
    <group ref={rootRef}>
      <group ref={bodyShell}>
        <RuneDrifterModel visualQuality={visualQuality} />
      </group>
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
      <mesh ref={castArcMesh} visible={false}>
        <torusGeometry args={[0.62, 0.024, 8, 48, Math.PI * 1.18]} />
        <meshBasicMaterial color={runeColor} transparent opacity={0.46} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={hurtGuardMesh} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.78, 0]} visible={false}>
        <ringGeometry args={[0.62, 0.78, 40]} />
        <meshBasicMaterial color={ART_TOKENS.dangerRed} transparent opacity={0.0} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={hurtShardMesh} position={[0, 1.1, 0.04]} visible={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={ART_TOKENS.dangerRed} transparent opacity={0.0} depthWrite={false} toneMapped={false} />
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

function RuneDrifterModel({ visualQuality = 'high' }) {
  const { scene } = useGLTF(MODEL_URLS.player);
  const model = useMemo(() => cloneSkeleton(scene), [scene]);

  useEffect(() => {
    const warmLift = new THREE.Color('#f0d081');
    const shadowWood = new THREE.Color('#6f5138');
    const parchment = new THREE.Color('#d8d1b6');
    const flattenMaterials = visualQuality !== 'high';
    model.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        const styledMaterials = materials.map(material => {
          if (!material) return material;
          const clone = material.clone();
          if (flattenMaterials) {
            clone.map = null;
            clone.normalMap = null;
            clone.roughnessMap = null;
            clone.metalnessMap = null;
            clone.aoMap = null;
            clone.vertexColors = false;
          }
          if (clone.color) {
            const luminance = clone.color.r * 0.2126 + clone.color.g * 0.7152 + clone.color.b * 0.0722;
            if (luminance < 0.08) {
              clone.color.copy(shadowWood);
            } else if (flattenMaterials && luminance > 0.82) {
              clone.color.copy(parchment);
            } else {
              clone.color.lerp(warmLift, flattenMaterials ? 0.11 : 0.06);
            }
          }
          if ('roughness' in clone) clone.roughness = Math.max(clone.roughness ?? 0.5, 0.48);
          if ('metalness' in clone) clone.metalness = Math.min(clone.metalness ?? 0, 0.08);
          clone.needsUpdate = true;
          return clone;
        });
        child.material = Array.isArray(child.material) ? styledMaterials : styledMaterials[0];
      }
    });
  }, [model, visualQuality]);

  return (
    <primitive
      object={model}
      position={[0, 0.02, 0]}
      rotation={[0, 0, 0]}
      scale={[PLAYER_VISUAL_BASE_SCALE, PLAYER_VISUAL_BASE_SCALE, PLAYER_VISUAL_BASE_SCALE]}
    />
  );
}

function OrbitBlades({ player, game, visualQuality = 'high' }) {
  if (visualQuality === 'high') return <SourceOrbitBlades player={player} game={game} />;
  return <StylizedOrbitBlades player={player} game={game} visualQuality={visualQuality} />;
}

function SourceOrbitBlades({ player, game }) {
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
    final: new THREE.Matrix4(),
    baseMatrices: Array.from({ length: MAX_ORBIT_BLADES }, () => new THREE.Matrix4())
  }), []);

  useFrame(() => {
    const spin = performance.now() * (0.0022 + Math.min(0.001, (1 - stats.cooldown) * 0.0018));
    const radius = (2.5 + Math.min(0.5, stats.bladeBonus * 0.08) + bladeFocus * 0.08) * stats.bladeRadius;
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
      local.baseMatrices[index].copy(local.base);
    }
    parts.forEach((part, partIndex) => {
      const mesh = meshRefs.current[partIndex];
      if (!mesh) return;
      if (bladeCount <= 0) {
        mesh.count = 0;
        mesh.instanceMatrix.needsUpdate = true;
        return;
      }
      for (let index = 0; index < bladeCount; index += 1) {
        local.final.multiplyMatrices(local.baseMatrices[index], part.localMatrix);
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

function StylizedOrbitBlades({ player, game, visualQuality = 'balanced' }) {
  const stats = game.stats;
  const bladeFocus = getBuildFocus(game, 'blade');
  const bladeCount = getBladeCount(stats, bladeFocus, isWeaponFamilyUnlocked(game, 'blade'));
  const bladeRef = useRef();
  const glintRef = useRef();
  const local = useMemo(() => ({
    pos: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    matrix: new THREE.Matrix4(),
    color: new THREE.Color()
  }), []);

  useFrame(() => {
    const blades = Math.min(MAX_ORBIT_BLADES, bladeCount);
    if (blades <= 0) {
      [bladeRef.current, glintRef.current].forEach(mesh => {
        if (!mesh) return;
        mesh.count = 0;
        mesh.instanceMatrix.needsUpdate = true;
      });
      return;
    }

    const spin = performance.now() * (0.0022 + Math.min(0.001, (1 - stats.cooldown) * 0.0018));
    const radius = (2.5 + Math.min(0.5, stats.bladeBonus * 0.08) + bladeFocus * 0.08) * stats.bladeRadius;
    const size = (0.78 + stats.pierce * 0.035) * Math.min(1.38, stats.bladeDamage);

    for (let index = 0; index < blades; index += 1) {
      const angle = spin + index * (Math.PI * 2 / blades);
      local.pos.set(
        player.current.pos.x + Math.cos(angle) * radius,
        player.current.pos.y + 0.24,
        player.current.pos.z + Math.sin(angle) * radius
      );
      local.quat.setFromEuler(new THREE.Euler(0.02, -angle + Math.PI / 2, index % 2 ? 0.18 : -0.18));
      local.matrix.compose(local.pos, local.quat, local.scale.set(1.05 * size, 0.1 * size, 0.22 * size));
      bladeRef.current?.setMatrixAt(index, local.matrix);
      local.color.set(index % 2 ? '#f7d06b' : '#fff09a');
      bladeRef.current?.setColorAt(index, local.color);

      local.pos.y += 0.035;
      local.matrix.compose(local.pos, local.quat, local.scale.set(0.7 * size, 0.035 * size, 0.25 * size));
      glintRef.current?.setMatrixAt(index, local.matrix);
      local.color.set(visualQuality === 'low' ? '#bdefff' : '#e7fbff');
      glintRef.current?.setColorAt(index, local.color);
    }

    [bladeRef.current, glintRef.current].forEach(mesh => {
      if (!mesh) return;
      mesh.count = blades;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  });

  return (
    <group>
      <instancedMesh ref={bladeRef} args={[null, null, MAX_ORBIT_BLADES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={glintRef} args={[null, null, MAX_ORBIT_BLADES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={visualQuality === 'low' ? 0.52 : 0.68} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function ArenaAtmosphere() {
  const rings = useRef();

  useFrame(() => {
    if (rings.current) rings.current.rotation.z += 0.0011;
  });

  return (
    <group>
      <mesh ref={rings} position={[0, 6.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[20.8, 21.05, 128]} />
        <meshBasicMaterial color="#f0be54" transparent opacity={0.024} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 7.2, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]}>
        <ringGeometry args={[9.2, 9.42, 96]} />
        <meshBasicMaterial color="#91e184" transparent opacity={0.018} depthWrite={false} toneMapped={false} />
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

function HitBurst({ burst, visualQuality = 'high' }) {
  const progress = 1 - burst.life / burst.maxLife;
  const radius = Math.max(0.55, burst.radius ?? 1);
  const shardOpacity = Math.max(0, 0.68 - progress * 0.68);
  const ringSegments = visualQuality === 'low' ? 14 : 24;
  const shardCount = visualQuality === 'high' ? 4 : visualQuality === 'balanced' ? 2 : 0;
  const showCore = visualQuality !== 'low';
  return (
    <group position={[burst.pos.x, burst.pos.y + 0.18, burst.pos.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[radius * (0.7 + progress * 1.7), radius * (0.7 + progress * 1.7), 1]}>
        <ringGeometry args={[0.32, 0.38, ringSegments]} />
        <meshBasicMaterial color={burst.color} transparent opacity={Math.max(0, 0.8 - progress)} depthWrite={false} toneMapped={false} />
      </mesh>
      {showCore && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} scale={[radius * (0.46 + progress * 1.9), radius * (0.46 + progress * 1.9), 1]}>
            <ringGeometry args={[0.12, 0.16, 4]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={Math.max(0, 0.58 - progress * 0.58)} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.14 + progress * 0.35, 0]} scale={[0.34 - progress * 0.12, 0.34 - progress * 0.12, 0.34 - progress * 0.12]}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={burst.color} transparent opacity={Math.max(0, 0.72 - progress)} depthWrite={false} toneMapped={false} />
          </mesh>
        </>
      )}
      {Array.from({ length: shardCount }, (_, index) => {
        const angle = index * Math.PI * 2 / Math.max(1, shardCount) + progress * 1.8;
        const distance = radius * (0.36 + progress * 0.88);
        return (
          <mesh
            key={`hit-shard-${index}`}
            position={[Math.cos(angle) * distance, 0.18 + progress * 0.42, Math.sin(angle) * distance]}
            rotation={[0.68, -angle, Math.PI / 4 + progress * Math.PI]}
            scale={[0.1 + radius * 0.035, 0.24 + radius * 0.055, 0.1 + radius * 0.035]}
          >
            <coneGeometry args={[1, 1, 3]} />
            <meshBasicMaterial color={index % 2 ? '#ffffff' : burst.color} transparent opacity={shardOpacity} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
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

function SpawnWarning({ warning, visualQuality = 'high' }) {
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
  const ringSegments = isGuard ? 4 : isSummon ? 6 : visualQuality === 'low' ? 18 : 36;
  const markerSegments = isCharge ? 3 : isGuard ? 4 : 6;
  const markerCount = visualQuality === 'low' ? 0 : isCharge ? 3 : 4;
  const showDetail = visualQuality !== 'low';
  return (
    <group position={[warning.pos.x, 0.1, warning.pos.z]}>
      {showDetail && (
        <mesh position={[0, 0.85, 0]} scale={[towerScale, 1.6 - progress * 0.55, towerScale]}>
          <cylinderGeometry args={[1, 1, 1, 16, 1, true]} />
          <meshBasicMaterial color={warning.color} transparent opacity={Math.max(0, 0.24 - progress * 0.08)} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {isShockwave && showDetail && (
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
      {(isSummon || isGuard || isCharge) && markerCount > 0 && Array.from({ length: markerCount }, (_, index) => {
        const angle = index * Math.PI * 2 / markerCount + progress * Math.PI * (isGuard ? -0.7 : 0.5);
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
      {showDetail && (
        <mesh position={[0, 0.36 + progress * 0.35, 0]} rotation={[0.5, progress * Math.PI * 3, 0.2]} scale={[0.18, 0.32, 0.18]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={warning.color} transparent opacity={Math.max(0, 0.8 - progress * 0.5)} toneMapped={false} />
        </mesh>
      )}
      {visualQuality === 'high' && <pointLight position={[0, 0.85, 0]} color={warning.color} intensity={0.65} distance={4.5} />}
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
          {warning.cue && showDetail && (
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

const rootNode = document.getElementById('root');
const root = window.__RUNE_DRIFT_ROOT__ ?? createRoot(rootNode);
window.__RUNE_DRIFT_ROOT__ = root;
root.render(<App />);
