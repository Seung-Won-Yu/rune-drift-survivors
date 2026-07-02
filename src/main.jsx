import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, useGLTF } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
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
  DAMAGE_SOURCE_META,
  EARLY_FIELD_ITEM_SCHEDULE,
  ELITE_ROLE_META,
  FIELD_ITEM_META
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
  MAX_ENEMIES,
  MAX_FIELD_ITEMS,
  MAX_PROJECTILES,
  MAX_XP_GEMS,
  OVERLOAD_DURATION,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  RUN_DURATION,
  SHRINE_ACTIVATE_RADIUS,
  SHRINE_CHANNEL_TIME,
  XP_BASE_MAGNET_RADIUS,
  XP_PICKUP_RADIUS
} from './config/gameTuning.js';
import {
  getRuntimeBudget,
  getStateSyncInterval,
  getVisualBudget,
  useVisualQuality
} from './hooks/useVisualQuality.js';
import { useCanvasQualitySettings } from './hooks/useCanvasQualitySettings.js';
import { findNearestEnemies } from './systems/combatQueries.js';
import {
  createFieldItem,
  createSplitRunner,
  createSummonedRunner,
  getBossPhaseMeta,
  getCombatRhythm,
  getEnemyAbilityScale,
  getEnemyAccentColor,
  getEnemyDamagePressure,
  getEnemyMovePressure,
  getFieldItemDropPosition,
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
  isPoolBelowLimit,
  pushDamageNumber,
  pushXpGem,
  trimSceneRuntimePools,
  updateTimedPool
} from './systems/runtimePools.js';
import { applyFrameStateUpdate } from './systems/runFrameState.js';
import {
  getProjectileCandidatesForEnemy as getProjectileCandidatesFromGrid,
  rebuildProjectileGrid as rebuildProjectileSpatialGrid,
  resolveProjectileHitsForEnemy,
  updateProjectileRuntime
} from './systems/projectileRuntime.js';
import { updateFollowCamera } from './systems/sceneCamera.js';
import { updateEnemySpawning } from './systems/spawnDirector.js';
import { updateWeaponCasts } from './systems/weaponRuntime.js';
import {
  createEmptyRunStats,
  createInitialGame,
  getItemPickupCount,
  withItemPickup,
  withShrineActivation
} from './systems/gameState.js';
import {
  applyBuildFocus,
  getBuildFocus,
  getFocusMessage,
  getUpgradeFocusKey,
  pickArmoryBoost,
  pickUpgrades
} from './systems/progression.js';
import { useRuneQaControls } from './qa/useRuneQaControls.js';
import { populateStressScene } from './qa/populateStressScene.js';
import { HUD } from './ui/GameHud.jsx';
import { EndOverlay, PauseOverlay, UpgradeOverlay } from './ui/GameOverlays.jsx';
import { createTouchControlsState, TouchControls } from './ui/TouchControls.jsx';
import { ArenaAtmosphere } from './world/ArenaAtmosphere.jsx';
import { BossNameplates, BossPresence } from './world/BossIndicators.jsx';
import { DamageNumber, HitBurst, SpawnWarning } from './world/CombatFeedback.jsx';
import { EnemyAccents, EnemyGroundAuras } from './world/EnemyEffects.jsx';
import { SourceEnemyInstances, StylizedEnemyInstances } from './world/EnemyInstances.jsx';
import { createInitialShrines, FieldPickupItems, GemBeacons, RuneShrineSites } from './world/FieldItemsAndShrines.jsx';
import { GroundDecalInstances } from './world/InstancedGeometry.jsx';
import { MapBaseArena } from './world/MapBaseArena.jsx';
import { OrbitBlades, PlayerAvatar } from './world/PlayerAvatar.jsx';
import { PlayerPresence } from './world/PlayerPresence.jsx';
import { SourceProjectileInstances, StylizedProjectileInstances } from './world/ProjectileInstances.jsx';
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
  const {
    runtimeVisualQuality,
    enablePostFx,
    enableEnvironment,
    canvasDpr,
    canvasCamera,
    canvasGl
  } = useCanvasQualitySettings(visualQuality, game);

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

  useRuneQaControls({ sceneApi, setGame, setUpgradeChoices });

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
        populateStressScene({
          options,
          visualQuality,
          player,
          enemies,
          projectiles,
          xpGems,
          hitBursts,
          weaponEffects,
          damageNumbers,
          spawnWarnings
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
      const bossStatus = getBossStatusSnapshot();
      const runStats = getRunStatsSnapshot();
      setGame(current => applyFrameStateUpdate({
        current,
        elapsed,
        player: player.current,
        bossStatus,
        runStats
      }));
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
    trimSceneRuntimePools({
      projectiles,
      xpGems,
      enemies,
      runtimeBudget,
      playerPos: player.current.pos
    });
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
    updateEnemySpawning({
      dt,
      currentGame,
      updateGame,
      runtimeBudget,
      player,
      enemies,
      spawnTimer,
      surgeIndex,
      spawnWarnings,
      hitBursts,
      cameraShake,
      eliteSpawnedMinute,
      bossSpawnedWave,
      showEncounterAlert
    });
  };

  const updateWeapons = (dt, currentGame) => {
    updateWeaponCasts({
      dt,
      currentGame,
      player,
      enemies,
      orbTimer,
      stormTimer,
      lightningTimer,
      novaTimer,
      hitBursts,
      weaponEffects,
      cameraShake,
      addProjectile,
      nearestEnemies,
      pulsePlayerCast,
      recordDamage,
      addDamageNumber,
      canAddHitBurst,
      canAddWeaponEffect
    });
  };

  const updateProjectiles = (dt, stats, currentGame) => {
    updateProjectileRuntime({
      dt,
      stats,
      currentGame,
      runtimeBudget,
      player,
      enemies,
      projectiles,
      hitBursts,
      hitsStaticCollider,
      recordDamage,
      addDamageNumber,
      canAddHitBurst
    });
  };

  const rebuildProjectileGrid = () => {
    rebuildProjectileSpatialGrid(projectileGrid.current, projectiles.current);
  };

  const getProjectileCandidatesForEnemy = enemy => {
    return getProjectileCandidatesFromGrid(projectileGrid.current, enemy);
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
      resolveProjectileHitsForEnemy({
        enemy,
        projectiles: nearbyProjectiles,
        player,
        hitBursts,
        cameraShake,
        recordDamage,
        addDamageNumber,
        canAddHitBurst
      });
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
    updateTimedPool(hitBursts.current, dt, budget.hitBursts);
  };

  const updateWeaponEffects = dt => {
    const budget = getVisualBudget(visualQuality);
    updateTimedPool(weaponEffects.current, dt, budget.weaponEffects);
  };

  const updateDamageNumbers = dt => {
    const budget = getVisualBudget(visualQuality);
    updateTimedPool(damageNumbers.current, dt, budget.damageNumbers, number => {
      number.age += dt;
      number.pos.y += dt * 0.9;
    });
  };

  const updateSpawnWarnings = dt => {
    const budget = getVisualBudget(visualQuality);
    updateTimedPool(spawnWarnings.current, dt, budget.spawnWarnings);
  };

  const canAddHitBurst = (overflow = 8) => (
    isPoolBelowLimit(hitBursts.current, getVisualBudget(visualQuality).hitBursts, overflow)
  );

  const canAddWeaponEffect = (overflow = 6) => (
    isPoolBelowLimit(weaponEffects.current, getVisualBudget(visualQuality).weaponEffects, overflow)
  );

  const addDamageNumber = (pos, value, color, size = 0.56) => {
    const budget = getVisualBudget(visualQuality).damageNumbers;
    const loadRatio = (enemies.current.length / Math.max(1, runtimeBudget.maxEnemies))
      + (projectiles.current.length / Math.max(1, runtimeBudget.maxProjectiles));
    pushDamageNumber(damageNumbers.current, {
      pos,
      value,
      color,
      size,
      visualQuality,
      budget,
      loadRatio
    });
  };

  const addXpGem = (pos, value) => {
    pushXpGem(xpGems.current, pos, value, runtimeBudget.maxXpGems);
  };

  const updateCamera = (camera, dt) => {
    updateFollowCamera({
      camera,
      playerPos: player.current.pos,
      cameraTarget: cameraTarget.current,
      cameraShake,
      scratch,
      compactCamera,
      visualQuality,
      dt
    });
  };

  const nearestEnemies = (limit = 1, maxDistance = Infinity) => {
    return findNearestEnemies(enemies.current, player.current.pos, limit, maxDistance);
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


const rootNode = document.getElementById('root');
const root = window.__RUNE_DRIFT_ROOT__ ?? createRoot(rootNode);
window.__RUNE_DRIFT_ROOT__ = root;
root.render(<App />);
