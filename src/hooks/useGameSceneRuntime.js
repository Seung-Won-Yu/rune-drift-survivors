import { useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { SIMULATION_BUDGET } from '../config/gameTuning.js';
import {
  createEmptyRunStats
} from '../systems/gameState.js';
import {
  createFrameStats,
  getFrameStatsSnapshot,
  resetFrameStats
} from '../systems/runTelemetry.js';
import { createTouchControlsState } from '../ui/TouchControls.jsx';
import { createInitialShrines } from '../world/FieldItemsAndShrines.jsx';

function useLazyRef(createValue) {
  const ref = useRef(null);
  if (ref.current === null) ref.current = createValue();
  return ref;
}

function createPlayerRuntime() {
  return {
    pos: new THREE.Vector3(0, 0.55, 0),
    vel: new THREE.Vector3(),
    dashTimer: 0,
    dashCd: 0,
    dashBuffer: 0,
    invuln: 0,
    castPulse: 0,
    hurtPulse: 0,
    facing: new THREE.Vector3(1, 0, 0)
  };
}

function resetPlayerRuntime(player) {
  player.pos.set(0, 0.55, 0);
  player.vel.set(0, 0, 0);
  player.dashTimer = 0;
  player.dashCd = 0;
  player.dashBuffer = 0;
  player.invuln = 0;
  player.castPulse = 0;
  player.hurtPulse = 0;
}

function resetProjectileGrid(projectileGrid) {
  projectileGrid.cells.clear();
  projectileGrid.maxRadius = 0;
  projectileGrid.candidates.length = 0;
}

function createRuntimeScratch() {
  return {
    matrix: new THREE.Matrix4(),
    color: new THREE.Color(),
    scale: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    euler: new THREE.Euler(),
    vec: new THREE.Vector3(),
    input: new THREE.Vector3(),
    moveDirection: new THREE.Vector3(),
    dashDirection: new THREE.Vector3(),
    velocityTarget: new THREE.Vector3(),
    enemyDirection: new THREE.Vector3(),
    cameraPosition: new THREE.Vector3(),
    flat: new THREE.Vector2()
  };
}

export function useGameSceneRuntime(visualQuality) {
  const player = useLazyRef(createPlayerRuntime);
  const keys = useLazyRef(() => new Set());
  const dashQueued = useRef(false);
  const enemies = useLazyRef(() => []);
  const projectiles = useLazyRef(() => []);
  const projectileGrid = useLazyRef(() => ({ cells: new Map(), maxRadius: 0, candidates: [] }));
  const xpGems = useLazyRef(() => []);
  const fieldItems = useLazyRef(() => []);
  const shrines = useLazyRef(createInitialShrines);
  const hitBursts = useLazyRef(() => []);
  const damageNumbers = useLazyRef(() => []);
  const spawnWarnings = useLazyRef(() => []);
  const spawnTimer = useRef(0);
  const fieldItemTimer = useRef(4);
  const fieldItemDropLock = useRef(0);
  const scheduledFieldItems = useLazyRef(() => new Set());
  const runStats = useLazyRef(createEmptyRunStats);
  const frameStats = useLazyRef(createFrameStats);
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
  const weaponEffects = useLazyRef(() => []);
  const stateSyncElapsed = useRef(0);
  const cameraTarget = useLazyRef(() => new THREE.Vector3());
  const cameraShake = useRef(0);
  const compactCamera = typeof window !== 'undefined'
    && (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth <= 700);
  const runtimeBudget = useLazyRef(() => ({ ...SIMULATION_BUDGET }));
  const framePressure = useRef(0);
  const scratch = useMemo(createRuntimeScratch, []);

  const updateFramePressure = useCallback((rawDelta, phase) => {
    const delta = Math.min(rawDelta, 0.12);
    if (phase !== 'playing') {
      framePressure.current = Math.max(0, framePressure.current - delta * 0.72);
      return;
    }

    const targetFrame = visualQuality === 'high' ? 0.038 : visualQuality === 'balanced' ? 0.045 : 0.055;
    const frameDebt = delta - targetFrame;
    framePressure.current = THREE.MathUtils.clamp(
      framePressure.current + (frameDebt > 0 ? frameDebt * 5.2 : -delta * 0.42),
      0,
      1
    );
  }, [visualQuality]);

  const resetRuntime = useCallback(touchControlsRef => {
    resetPlayerRuntime(player.current);
    dashQueued.current = false;
    if (touchControlsRef?.current) Object.assign(touchControlsRef.current, createTouchControlsState());
    enemies.current = [];
    projectiles.current = [];
    resetProjectileGrid(projectileGrid.current);
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
    resetFrameStats(frameStats);
    bossSpawnedWave.current = 0;
    eliteSpawnedMinute.current = 0;
    surgeIndex.current = 0;
    orbTimer.current = 0;
    stormTimer.current = 0;
    lightningTimer.current = 0.28;
    novaTimer.current = 1.25;
    levelUpQueued.current = false;
    weaponEffects.current = [];
  }, []);

  const getMetrics = useCallback(() => ({
    visualQuality,
    framePressure: Number(framePressure.current.toFixed(3)),
    runtimeBudget: { ...runtimeBudget.current },
    frameStats: getFrameStatsSnapshot(frameStats),
    player: {
      x: Number(player.current.pos.x.toFixed(2)),
      z: Number(player.current.pos.z.toFixed(2)),
      speed: Number(player.current.vel.length().toFixed(2)),
      dashCooldown: Number(player.current.dashCd.toFixed(2)),
      dashActive: player.current.dashTimer > 0,
      dashBuffered: player.current.dashBuffer > 0,
      invulnerable: player.current.invuln > 0,
      hurtPulse: Number((player.current.hurtPulse ?? 0).toFixed(2))
    },
    contact: {
      windups: enemies.current.filter(enemy => (enemy.contactAttackTimer ?? 0) > 0).length,
      recoveries: enemies.current.filter(enemy => (enemy.contactAttackTimer ?? 0) <= 0 && (enemy.contactAttackCooldown ?? 0) > 0).length,
      resolved: enemies.current.reduce((total, enemy) => total + (enemy.contactAttackCount ?? 0), 0),
      hits: enemies.current.reduce((total, enemy) => total + (enemy.contactHitCount ?? 0), 0)
    },
    combat: {
      totalDamage: Number((runStats.current.totalDamage ?? 0).toFixed(2)),
      damageBySource: { ...runStats.current.damageBySource }
    },
    counts: {
      enemies: enemies.current.length,
      projectiles: projectiles.current.length,
      xpGems: xpGems.current.length,
      hitBursts: hitBursts.current.length,
      weaponEffects: weaponEffects.current.length,
      damageNumbers: damageNumbers.current.length,
      spawnWarnings: spawnWarnings.current.length
    }
  }), [visualQuality]);

  return {
    player,
    keys,
    dashQueued,
    enemies,
    projectiles,
    projectileGrid,
    xpGems,
    fieldItems,
    shrines,
    hitBursts,
    damageNumbers,
    spawnWarnings,
    spawnTimer,
    fieldItemTimer,
    fieldItemDropLock,
    scheduledFieldItems,
    runStats,
    frameStats,
    bossSpawnedWave,
    eliteSpawnedMinute,
    surgeIndex,
    orbTimer,
    stormTimer,
    lightningTimer,
    novaTimer,
    levelUpQueued,
    gemMesh,
    playerMesh,
    weaponEffects,
    stateSyncElapsed,
    cameraTarget,
    cameraShake,
    compactCamera,
    runtimeBudget,
    scratch,
    updateFramePressure,
    resetRuntime,
    getMetrics
  };
}
