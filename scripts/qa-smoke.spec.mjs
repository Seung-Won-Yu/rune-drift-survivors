import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import * as THREE from 'three';
import {
  EARLY_FIELD_ITEM_SCHEDULE,
  SHRINE_SITES
} from '../src/config/gameData.js';
import {
  SIMULATION_BUDGET,
  STARTING_XP_TO_NEXT
} from '../src/config/gameTuning.js';
import { getEnemyContactDisplacement } from '../src/systems/enemyContactRuntime.js';
import { getEnemyPursuitLead, getEnemyPursuitSpeedScale } from '../src/systems/enemyPacing.js';
import {
  getRiftbornAnimationFrame,
  getRiftbornThreatAnimationFrame
} from '../src/systems/enemySprite.js';
import { createInitialGame, createQaResultGame, withItemPickup } from '../src/systems/gameState.js';
import { createRuneCircuitLandmarkLayout } from '../src/systems/mapLayout.js';
import { getRuneWardenAnimationFrame } from '../src/systems/playerSprite.js';
import {
  isOrbitBladeHit,
  resolveProjectileHitsForEnemy
} from '../src/systems/projectileRuntime.js';
import {
  getBladeOrbitRadius,
  getRunPhaseTransition,
  getUpgradeFocusKey
} from '../src/systems/progression.js';
import { applyFrameStateUpdate } from '../src/systems/runFrameState.js';
import { getDamageSourceBreakdown, getRunDefenseSummary } from '../src/systems/runProgress.js';
import {
  getRunStatsSnapshot,
  recordRunDamage,
  recordRunDamageTaken,
  recordRunHealing
} from '../src/systems/runTelemetry.js';
import { getQaGameSnapshot } from '../src/qa/useRuneQaControls.js';
import { getHudAlerts } from '../src/ui/hudAlerts.js';
import {
  getCircuitEncounterProfile,
  getCircuitFinaleState,
  getRunCompletionResult
} from '../src/systems/runeCircuit.js';
import { getShrineActivationAlert } from '../src/systems/shrineRuntime.js';
import { pickArmoryBoost, pickUpgrades } from '../src/systems/upgradeDrafting.js';
import {
  getBladeSweepProfile,
  getLightningDamageFalloff,
  getLightningTargetCount,
  getStormStrikeCount
} from '../src/systems/weaponRuntime.js';
import { getNextXpThreshold } from '../src/systems/xpRuntime.js';

const artifactDir = path.resolve('output/playwright');
const isCi = process.env.CI === 'true';
const enforceRealtimeFrameRate = !isCi;
const runtimeQuality = isCi ? 'low' : 'balanced';
const runtimeTimeout = (localMs, ciMs) => isCi ? ciMs : localMs;

test.beforeAll(async () => {
  await mkdir(artifactDir, { recursive: true });
});

async function attachPageGuards(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });
  return {
    assertClean() {
      expect(pageErrors, 'page errors').toEqual([]);
      expect(consoleErrors, 'console errors').toEqual([]);
    }
  };
}

async function capture(page, name) {
  await page.screenshot({
    path: path.join(artifactDir, `${name}.png`),
    fullPage: false,
    timeout: 10_000
  });
}

async function openGuardedPage(page, route) {
  const guards = await attachPageGuards(page);
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.loadingLayer')).toBeHidden({ timeout: 20_000 });
  return guards;
}

test('loading state smoke', async ({ page }) => {
  const guards = await attachPageGuards(page);
  await page.route('**/*.glb', async route => {
    await new Promise(resolve => setTimeout(resolve, 250));
    await route.continue();
  });
  await page.goto('/?quality=balanced', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.loadingLayer')).toBeVisible();
  await expect(page.locator('.loadingLayer')).toContainText('룬 야전을 새기는 중');
  await expect(page.locator('.loadingLayer')).toBeHidden({ timeout: 20_000 });
  guards.assertClean();
});

test('balanced startup uses the complete 2.5D cast without model payloads', async ({ page }) => {
  const modelRequests = [];
  const spriteRequests = [];
  page.on('request', request => {
    if (request.url().endsWith('.glb')) modelRequests.push(request.url());
    if (request.url().includes('/sprites/')) spriteRequests.push(request.url());
  });
  const guards = await openGuardedPage(page, '/?quality=balanced');
  await page.waitForTimeout(500);
  expect(modelRequests).toEqual([]);
  expect(spriteRequests.some(url => url.endsWith('/sprites/rune-warden-animation-atlas-v2.webp'))).toBe(true);
  expect(spriteRequests.some(url => url.endsWith('/sprites/riftborn-common-animation-atlas-v1.webp'))).toBe(true);
  expect(spriteRequests.some(url => url.endsWith('/sprites/riftborn-threat-animation-atlas-v1.webp'))).toBe(true);
  guards.assertClean();
});

test('high quality stays model-free', async ({ page }) => {
  const modelRequests = [];
  page.on('request', request => {
    if (request.url().endsWith('.glb')) modelRequests.push(request.url());
  });
  const guards = await openGuardedPage(page, '/?qa=silhouette&quality=high');
  await page.waitForTimeout(500);
  expect(modelRequests).toEqual([]);
  guards.assertClean();
});

test('low quality enters gameplay without model requests', async ({ page }) => {
  const modelRequests = [];
  page.on('request', request => {
    if (request.url().endsWith('.glb')) modelRequests.push(request.url());
  });
  const guards = await attachPageGuards(page);
  await page.goto('/?qa=silhouette&quality=low', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.loadingLayer')).toBeHidden({ timeout: 5_000 });
  expect(modelRequests).toEqual([]);
  guards.assertClean();
});

test('HUD smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?quality=balanced');
  await expect(page.locator('.hudCompact')).toBeVisible();
  await expect(page.locator('.hudMeter')).toHaveCount(2);
  await expect(page.locator('.iconButton')).toHaveCount(3);
  await expect(page.locator('.runeCircuit')).toBeVisible();
  await expect(page.locator('.runeCircuit')).toContainText('CIRCUIT 0/4');
  await expect(page.locator('.runeCircuit')).toContainText('무기 봉인');
  await capture(page, 'qa-smoke-hud');
  guards.assertClean();
});

test('rune circuit ready-state smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=circuit&quality=balanced');
  await expect(page.locator('.runeCircuit')).toContainText('CIRCUIT 0/4');
  await expect(page.locator('.runeCircuit')).toContainText('READY');
  await expect(page.locator('.runeCircuit')).toContainText('무기 봉인');
  await expect(page.locator('.runeCircuit')).toContainText('빌드 보급');
  await capture(page, 'qa-smoke-circuit');
  guards.assertClean();
});

test('rune circuit activation moment smoke', async ({ page }) => {
  const alert = getShrineActivationAlert({
    label: '무기 봉인',
    rewardLabel: '빌드 보급',
    color: '#d4a84c'
  }, { shrineActivations: 0 });
  expect(alert).toMatchObject({
    kind: 'circuit',
    label: 'CIRCUIT 1/4',
    title: '무기 봉인 연결',
    hint: '빌드 보급 확보'
  });

  const guards = await openGuardedPage(page, '/?qa=seal&quality=balanced');
  await expect(page.locator('.hudEncounter')).toBeVisible();
  await expect(page.locator('.hudEncounter')).toContainText('CIRCUIT 1/4');
  await expect(page.locator('.hudEncounter')).toContainText('무기 봉인 연결');
  await expect(page.locator('.hudObjectiveDock')).toHaveCount(0);
  await capture(page, 'qa-smoke-circuit-activation');
  guards.assertClean();
});

test('pause uses the current run-phase objectives', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=objectives&quality=balanced');
  await expect(page.locator('.runeCircuit')).toContainText('각인 봉인');
  await expect(page.locator('.runeCircuit')).toContainText('보상 선택');
  await page.getByRole('button', { name: '일시정지' }).click();
  const pauseObjectives = page.locator('.pauseObjectives');
  await expect(pauseObjectives).toContainText('봉인 4개 활성');
  await expect(pauseObjectives).not.toContainText('적 12 처치');
  await capture(page, 'qa-smoke-pause-objectives');
  guards.assertClean();
});

test('rune circuit encounter pacing smoke', () => {
  const game = { time: 20, activatedShrines: {} };
  expect(getCircuitEncounterProfile(game, { x: 0, z: 0 }).stage).toBe('route');
  expect(getCircuitEncounterProfile(game, { x: 15, z: 0 }).stage).toBe('approach');
  expect(getCircuitEncounterProfile(game, { x: 34, z: 0 }).stage).toBe('channel');
  expect(EARLY_FIELD_ITEM_SCHEDULE.some(item => item.type === 'cache' && item.time < 120)).toBe(false);
  expect(getCircuitFinaleState(game).active).toBe(false);
  expect(getCircuitFinaleState({ ...game, activatedShrines: { armory: true, vital: true, purge: true, etching: true } })).toMatchObject({
    active: true,
    damageMultiplier: 1.16,
    bossHealthMultiplier: 0.88
  });
});

test('opening pacing reaches upgrades and three seals inside three minutes', () => {
  const opening = createInitialGame();
  const thresholds = [opening.xpToNext];
  while (thresholds.length < 4) {
    thresholds.push(getNextXpThreshold(thresholds.at(-1)));
  }

  expect(opening.xpToNext).toBe(STARTING_XP_TO_NEXT);
  expect(thresholds).toEqual([26, 41, 58, 78]);
  expect(EARLY_FIELD_ITEM_SCHEDULE[0]).toMatchObject({ type: 'magnet', time: 5 });
  expect(SHRINE_SITES.slice(0, 3).map(site => site.unlockAt)).toEqual([18, 78, 145]);
  expect(SHRINE_SITES[2].unlockAt).toBeLessThan(180);
});

test('run phase transitions announce each pacing beat once', async ({ page }) => {
  expect(getRunPhaseTransition(44.9, 45.1)).toMatchObject({
    kind: 'phase',
    label: 'ROUTE',
    title: '경로 확보',
    phaseId: 'anchor'
  });
  expect(getRunPhaseTransition(46, 60)).toBeNull();
  expect(getRunPhaseTransition(114.9, 115.1)).toMatchObject({ phaseId: 'armory' });
  expect(getRunPhaseTransition(169.9, 170.1)).toMatchObject({ phaseId: 'synergy' });
  expect(getRunPhaseTransition(234.9, 235.1)).toMatchObject({ phaseId: 'final' });

  const guards = await openGuardedPage(page, '/?qa=phase&quality=balanced');
  await expect(page.locator('.hudEncounter')).toContainText('ROUTE');
  await expect(page.locator('.hudEncounter')).toContainText('경로 확보');
  await expect(page.locator('.hudObjectiveDock')).toHaveCount(0);
  await capture(page, 'qa-smoke-phase-transition');
  guards.assertClean();
});

test('code-built circuit landmarks keep one readable kit across all seals', () => {
  const balanced = createRuneCircuitLandmarkLayout('balanced');
  const low = createRuneCircuitLandmarkLayout('low');
  expect(balanced.lowerBases).toHaveLength(4);
  expect(balanced.approachSteps).toHaveLength(16);
  expect(balanced.pylons).toHaveLength(8);
  expect(balanced.pylonCaps).toHaveLength(8);
  expect(balanced.lintels).toHaveLength(4);
  expect(balanced.rankStones).toHaveLength(10);
  expect(balanced.routeRunes).toHaveLength(20);
  expect(low.approachSteps).toHaveLength(8);
  expect(low.rankStones).toHaveLength(0);
  expect(low.routeRunes).toHaveLength(8);
});

test('Rune Warden atlas selects four directions and authored action frames', () => {
  expect(getRuneWardenAnimationFrame({ facing: { x: 0, z: -1 } })).toMatchObject({ direction: 'back', column: 0 });
  expect(getRuneWardenAnimationFrame({ facing: { x: 1, z: 0 } })).toMatchObject({ direction: 'right', column: 1 });
  expect(getRuneWardenAnimationFrame({ facing: { x: 0, z: 1 } })).toMatchObject({ direction: 'front', column: 2 });
  expect(getRuneWardenAnimationFrame({ facing: { x: -1, z: 0 } })).toMatchObject({ direction: 'left', column: 3 });

  expect(getRuneWardenAnimationFrame({ timeMs: 0 })).toMatchObject({ state: 'idle', row: 0 });
  expect(getRuneWardenAnimationFrame({ timeMs: 520 })).toMatchObject({ state: 'idle', row: 1 });
  expect(getRuneWardenAnimationFrame({ speed: 4, timeMs: 0 })).toMatchObject({ state: 'walk', row: 2 });
  expect(getRuneWardenAnimationFrame({ speed: 4, timeMs: 135 })).toMatchObject({ state: 'walk', row: 3 });
  expect(getRuneWardenAnimationFrame({ castPulse: 0.4 })).toMatchObject({ state: 'cast', row: 4 });
  expect(getRuneWardenAnimationFrame({ castPulse: 0.4, hurtPulse: 0.4 })).toMatchObject({ state: 'hurt', row: 5 });
});

test('Riftborn atlas selects roles, directions, and alternating walk contacts', () => {
  expect(getRiftbornAnimationFrame({ kind: 'runner', facingAngle: Math.PI })).toMatchObject({ role: 'runner', direction: 'back', row: 0 });
  expect(getRiftbornAnimationFrame({ kind: 'golem', facingAngle: Math.PI / 2 })).toMatchObject({ role: 'golem', direction: 'right', row: 2 });
  expect(getRiftbornAnimationFrame({ kind: 'brute', facingAngle: -Math.PI / 2 })).toMatchObject({ role: 'brute', direction: 'left', row: 4 });
  expect(getRiftbornAnimationFrame({ kind: 'runner', animationPhase: 0, motionIntent: 1 })).toMatchObject({ row: 0 });
  expect(getRiftbornAnimationFrame({ kind: 'runner', animationPhase: 1, motionIntent: 1 })).toMatchObject({ row: 1 });
  expect(getRiftbornAnimationFrame({ kind: 'brute', animationPhase: 1, motionIntent: 0.08 })).toMatchObject({ row: 4 });
  expect(getRiftbornAnimationFrame({ kind: 'unknown' })).toMatchObject({ role: 'golem', row: 2 });
});

test('Riftborn threat atlas keeps elite roles and boss directions deterministic', () => {
  expect(getRiftbornThreatAnimationFrame({ role: 'bulwark', facingAngle: Math.PI })).toMatchObject({ role: 'bulwark', direction: 'back', row: 0 });
  expect(getRiftbornThreatAnimationFrame({ role: 'charger', facingAngle: Math.PI / 2 })).toMatchObject({ role: 'charger', direction: 'right', row: 2 });
  expect(getRiftbornThreatAnimationFrame({ role: 'summoner', facingAngle: -Math.PI / 2 })).toMatchObject({ role: 'summoner', direction: 'left', row: 4 });
  expect(getRiftbornThreatAnimationFrame({ kind: 'boss', facingAngle: 0 })).toMatchObject({ role: 'boss', direction: 'front', row: 6 });
  expect(getRiftbornThreatAnimationFrame({ role: 'summoner', animationPhase: 1, motionIntent: 1 })).toMatchObject({ row: 5 });
  expect(getRiftbornThreatAnimationFrame({ role: 'unknown' })).toMatchObject({ role: 'charger', row: 2 });
});

test('orbit blade collision matches the rendered blade footprint on the ground plane', () => {
  const blade = { x: 0, y: 0.8, z: 0 };
  const enemy = { x: 1.5, y: 0, z: 0 };
  expect(isOrbitBladeHit(enemy, blade, 1, 1)).toBe(true);
  expect(isOrbitBladeHit({ ...enemy, x: 1.6 }, blade, 1, 1)).toBe(false);
});

test('piercing projectiles cannot spend multiple hits on the same enemy', () => {
  const projectile = {
    type: 'storm',
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(1, 0, 0),
    life: 1,
    pierce: 2,
    radius: 2,
    damage: 10,
    color: '#7fc9d8'
  };
  const enemy = {
    kind: 'golem',
    pos: new THREE.Vector3(),
    hp: 100,
    maxHp: 100,
    hitRadius: 1
  };
  let recordedDamage = 0;
  const resolve = target => resolveProjectileHitsForEnemy({
    enemy: target,
    projectiles: [projectile],
    player: { current: { pos: new THREE.Vector3(-1, 0, 0) } },
    hitBursts: [],
    cameraShake: { current: 0 },
    recordDamage: (_source, amount) => { recordedDamage += amount; },
    addDamageNumber: () => {},
    canAddHitBurst: () => false
  });

  resolve(enemy);
  resolve(enemy);
  expect(enemy.hp).toBe(90);
  expect(projectile.pierce).toBe(1);
  expect(recordedDamage).toBe(10);

  const secondEnemy = { ...enemy, pos: new THREE.Vector3(), hp: 100 };
  resolve(secondEnemy);
  expect(secondEnemy.hp).toBe(90);
  expect(projectile.pierce).toBe(0);
  expect(recordedDamage).toBe(20);
});

test('run completion distinguishes a sealed circuit from survival', () => {
  expect(getRunCompletionResult({ activatedShrines: {} })).toBe('survived');
  expect(getRunCompletionResult({
    activatedShrines: { armory: true, vital: true, purge: true, etching: true }
  })).toBe('victory');

  const finishRun = current => applyFrameStateUpdate({
    current: { ...current, time: 299.9 },
    elapsed: 0.2,
    player: { vel: { length: () => 0 }, pos: { x: 0, z: 0 }, dashCd: 0, dashTimer: 0 },
    bossStatus: null,
    runStats: current.runStats
  });
  expect(finishRun(createInitialGame()).result).toBe('survived');
  expect(finishRun({
    ...createInitialGame(),
    shrineActivations: 4,
    activatedShrines: { armory: true, vital: true, purge: true, etching: true }
  }).result).toBe('victory');
});

test('render quality does not change simulation rules', () => {
  expect(SIMULATION_BUDGET).toEqual({ maxEnemies: 40, maxProjectiles: 30, maxXpGems: 56 });
  expect(Object.isFrozen(SIMULATION_BUDGET)).toBe(true);
});

test('QA snapshot exposes balance data without mutating the run', () => {
  const game = createQaResultGame('victory');
  const snapshot = getQaGameSnapshot(game);
  expect(snapshot).toMatchObject({
    phase: 'ended',
    result: 'victory',
    time: 300,
    level: 13,
    shrineActivations: 4,
    circuit: { complete: true, completed: 4, nextSite: null }
  });
  expect(snapshot.buildFocus).not.toBe(game.buildFocus);
  expect(snapshot.upgrades).not.toBe(game.upgrades);
  expect(snapshot.runStats.damageBySource).not.toBe(game.runStats.damageBySource);
  expect(snapshot.runStats.damageByPhase).not.toBe(game.runStats.damageByPhase);
});

test('run telemetry separates phase damage, incoming damage, and actual healing', () => {
  const runStats = { current: createInitialGame().runStats };
  runStats.current.phaseId = 'anchor';
  recordRunDamage(runStats, 'blade', 24);
  recordRunDamage(runStats, 'unknown-source', 6);
  recordRunDamageTaken(runStats, 13.5);
  recordRunHealing(runStats, 8);
  const snapshot = getRunStatsSnapshot(runStats);

  expect(snapshot.totalDamage).toBe(30);
  expect(snapshot.damageBySource).toMatchObject({ blade: 24, generic: 6 });
  expect(snapshot.damageByPhase.anchor).toMatchObject({ blade: 24, generic: 6 });
  expect(snapshot.damageByPhase.learn.blade).toBe(0);
  expect(snapshot.damageTaken).toBe(13.5);
  expect(snapshot.damageTakenByPhase.anchor).toBe(13.5);
  expect(snapshot.damageTakenByPhase.learn).toBe(0);
  expect(snapshot.healingReceived).toBe(8);
  expect(snapshot.healingByPhase.anchor).toBe(8);
  expect(snapshot.healingByPhase.learn).toBe(0);
  expect(snapshot.damageByPhase.anchor).not.toBe(runStats.current.damageByPhase.anchor);
});

test('result defense summary identifies the most dangerous phase', () => {
  const victoryGame = createQaResultGame('victory');
  const victory = getRunDefenseSummary(victoryGame);
  expect(victory).toMatchObject({
    damageTaken: 168,
    healingReceived: 134,
    dangerPhase: { id: 'final', title: '균열 종결', damage: 53 }
  });
  expect(Object.values(victoryGame.runStats.damageTakenByPhase).reduce((total, damage) => total + damage, 0))
    .toBe(victoryGame.runStats.damageTaken);
  expect(Object.values(victoryGame.runStats.healingByPhase).reduce((total, healing) => total + healing, 0))
    .toBe(victoryGame.runStats.healingReceived);

  const untouched = getRunDefenseSummary(createInitialGame());
  expect(untouched).toMatchObject({ damageTaken: 0, healingReceived: 0, dangerPhase: null });
});

test('blade orbit presentation and collision share one radius calculation', () => {
  const game = createInitialGame({ replayRouteFamily: 'blade' });
  const radius = getBladeOrbitRadius(
    { ...game.stats, bladeRadius: 1.18 },
    2,
    4
  );
  expect(radius).toBeCloseTo((2.5 + 2 * 0.16 + 4 * 0.08) * 1.18);
  expect(getQaGameSnapshot({
    ...game,
    level: 5,
    stats: { ...game.stats, bladeRadius: 1.18 },
    buildFocus: { ...game.buildFocus, blade: 4 }
  }).weaponRanges.bladeOrbit).toBeGreaterThan(3.5);
});

test('blade route gains a bounded mid-range sweep for objective travel', () => {
  const locked = getBladeSweepProfile(createInitialGame());
  const game = {
    ...createInitialGame({ replayRouteFamily: 'blade' }),
    level: 8,
    buildFocus: { ...createInitialGame().buildFocus, blade: 4, nova: 2 },
    upgrades: ['blade-plus', 'blade-guard', 'blade-reaper', 'nova-plus', 'nova-pulse'],
    stats: {
      ...createInitialGame().stats,
      bladeBonus: 3,
      bladeDamage: 1.45
    }
  };
  const active = getBladeSweepProfile(game);

  expect(locked.unlocked).toBe(false);
  expect(active).toMatchObject({ unlocked: true, focus: 4, targetCount: 4 });
  expect(active.range).toBeGreaterThan(14);
  expect(active.range).toBeLessThan(24);
  expect(active.damage).toBeGreaterThan(35);
  expect(active.cooldown).toBeGreaterThanOrEqual(0.62);
});

test('storm and chain saturation stays inside bounded hit budgets', () => {
  expect(getStormStrikeCount({ stormStrikes: 1 }, 0)).toBe(1);
  expect(getStormStrikeCount({ stormStrikes: 4 }, 5)).toBe(5);
  expect(getLightningTargetCount({ lightningChains: 3 }, 0, 0)).toBe(3);
  expect(getLightningTargetCount({ lightningChains: 11 }, 3, 5)).toBe(10);
  expect(getLightningDamageFalloff(0)).toBe(1);
  expect(getLightningDamageFalloff(9)).toBeCloseTo(0.28);
  expect(getLightningDamageFalloff(99)).toBe(0.28);
});

test('only runners receive a short, front-loaded pursuit lead', () => {
  expect(getEnemyPursuitLead({ kind: 'golem' }, { time: 10 })).toBe(0);
  expect(getEnemyPursuitLead({ kind: 'runner' }, { time: 10 })).toBe(0.34);
  expect(getEnemyPursuitLead({ kind: 'runner' }, { time: 60 })).toBe(0.26);
  expect(getEnemyPursuitLead({ kind: 'runner' }, { time: 120 })).toBe(0.16);
  expect(getEnemyPursuitLead({ kind: 'runner', summoned: true }, { time: 220 })).toBeCloseTo(0.12);
});

test('runner pursuit pressure peaks before the late-game density spike', () => {
  const runner = { kind: 'runner' };
  expect(getEnemyPursuitSpeedScale({ kind: 'golem' }, { time: 100 })).toBe(1);
  expect(getEnemyPursuitSpeedScale(runner, { time: 20 })).toBe(1.14);
  expect(getEnemyPursuitSpeedScale(runner, { time: 100 })).toBe(1.5);
  expect(getEnemyPursuitSpeedScale(runner, { time: 240 })).toBe(1.2);
});

test('damage feedback stays ahead of dash and crisis notices', () => {
  const alerts = getHudAlerts({
    game: { damageFlash: 0.5, damageMessage: '-7 HP', pickupFlash: 0 },
    crisis: { level: 4, label: 'FINAL SURGE' },
    activeThreat: null,
    bossPatternMeta: null,
    bossStatus: null,
    dashPct: 40,
    dashReady: false,
    dashCooldown: 0.7,
    showDashTicker: true
  });
  expect(alerts.map(alert => alert.id).slice(0, 3)).toEqual(['damage', 'crisis', 'dash']);
  expect(alerts[0]).toMatchObject({ value: '-7 HP', tone: '#e06b5f' });
});

test('replay route guarantees the first armory family', () => {
  const guidedRun = withItemPickup(createInitialGame({ replayRouteFamily: 'blade' }), 'cache');
  expect(getUpgradeFocusKey(pickArmoryBoost(guidedRun))).toBe('blade');
});

test('replay route replaces forced orb cards after its family is unlocked', () => {
  const routedGame = {
    ...createInitialGame({ replayRouteFamily: 'blade' }),
    level: 4,
    time: 34,
    shrineActivations: 1,
    activatedShrines: { armory: true },
    buildFocus: { orb: 0, storm: 0, blade: 1, chain: 0, nova: 0 },
    upgrades: ['blade-plus']
  };
  const choices = pickUpgrades(routedGame);
  expect(choices.some(choice => getUpgradeFocusKey(choice) === 'blade')).toBe(true);
  expect(choices.some(choice => getUpgradeFocusKey(choice) === 'nova')).toBe(true);
  expect(choices.some(choice => getUpgradeFocusKey(choice) === 'orb')).toBe(false);
});

test('desktop movement and dash input smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, `/?quality=${runtimeQuality}`);
  await page.waitForFunction(() => Boolean(window.__RUNE_DRIFT_QA__?.metrics?.()?.player));
  const before = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics().player);
  await page.keyboard.down('w');
  try {
    await page.waitForFunction(
      start => {
        const player = window.__RUNE_DRIFT_QA__.metrics().player;
        return Math.hypot(player.x - start.x, player.z - start.z) > 2;
      },
      before,
      { polling: 50, timeout: runtimeTimeout(3_000, 20_000) }
    );
  } finally {
    await page.keyboard.up('w');
  }
  const afterMove = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics().player);
  expect(Math.hypot(afterMove.x - before.x, afterMove.z - before.z), 'player movement distance').toBeGreaterThan(2);
  await page.keyboard.press(' ');
  await page.waitForFunction(
    () => window.__RUNE_DRIFT_QA__.metrics().player.dashCooldown > 0,
    null,
    { polling: 16, timeout: runtimeTimeout(1_000, 10_000) }
  );
  const afterDash = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics().player);
  expect(afterDash.dashCooldown, 'dash cooldown').toBeGreaterThan(0);
  guards.assertClean();
});

test('dash input buffer smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, `/?quality=${runtimeQuality}`);
  await page.waitForFunction(() => Boolean(window.__RUNE_DRIFT_QA__?.metrics?.()?.player));
  await page.keyboard.press(' ');
  await page.waitForFunction(
    () => window.__RUNE_DRIFT_QA__.metrics().player.dashCooldown > 0.8,
    null,
    { polling: 16, timeout: runtimeTimeout(2_000, 15_000) }
  );
  await page.waitForFunction(
    () => {
      const cooldown = window.__RUNE_DRIFT_QA__.metrics().player.dashCooldown;
      return cooldown > 0.03 && cooldown < 0.1;
    },
    null,
    { polling: 16, timeout: runtimeTimeout(2_000, 60_000) }
  );
  await page.keyboard.press(' ');
  await page.waitForFunction(
    () => window.__RUNE_DRIFT_QA__.metrics().player.dashCooldown > 0.8,
    null,
    { polling: 16, timeout: runtimeTimeout(500, 8_000) }
  );
  guards.assertClean();
});

test('audio unlock, cue, and mute persistence smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, `/?quality=${runtimeQuality}`);
  await page.waitForFunction(() => Boolean(window.__RUNE_DRIFT_AUDIO__?.state));
  await page.keyboard.press(' ');
  await page.waitForFunction(
    () => {
      const state = window.__RUNE_DRIFT_AUDIO__.state();
      return state.unlocked && state.received > 0 && state.played > 0;
    },
    null,
    { polling: 20, timeout: runtimeTimeout(2_000, 15_000) }
  );

  await page.getByRole('button', { name: '사운드 끄기' }).click();
  await expect(page.getByRole('button', { name: '사운드 켜기' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__RUNE_DRIFT_AUDIO__.state().muted)).toBe(true);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.loadingLayer')).toBeHidden({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: '사운드 켜기' })).toBeVisible();
  guards.assertClean();
});

test('enemy contact windup and recovery smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, `/?quality=${runtimeQuality}`);
  await page.waitForFunction(() => Boolean(window.__RUNE_DRIFT_QA__?.contactAttack));
  await page.evaluate(() => window.__RUNE_DRIFT_QA__.contactAttack());
  await page.waitForFunction(
    () => window.__RUNE_DRIFT_QA__.metrics()?.contact?.windups === 1,
    null,
    { polling: 16, timeout: runtimeTimeout(2_000, 15_000) }
  );
  await capture(page, 'qa-smoke-contact-windup');
  await page.waitForFunction(
    () => {
      const metrics = window.__RUNE_DRIFT_QA__.metrics();
      return metrics?.contact?.resolved >= 1 && metrics?.contact?.hits >= 1;
    },
    null,
    { polling: 16, timeout: runtimeTimeout(2_000, 15_000) }
  );
  const metrics = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics());
  expect(metrics.contact.recoveries, 'contact recovery state').toBeGreaterThanOrEqual(1);
  expect(metrics.player.invulnerable, 'player hit invulnerability').toBe(true);
  const hitAlert = page.locator('.hudAlert').first();
  await expect(hitAlert).toContainText('피격');
  await expect(hitAlert).toContainText(/-\d+ HP/);
  await expect(hitAlert).toHaveCSS('border-left-color', 'rgb(224, 107, 95)');
  await capture(page, 'qa-smoke-contact-hit');
  guards.assertClean();
});

test('enemy contact pose separates anticipation from impact', () => {
  const enemy = { radius: 1, contactAttackMax: 0.5, contactAttackTimer: 0.25, contactAttackPulse: 0 };
  expect(getEnemyContactDisplacement(enemy)).toBeLessThan(-0.1);
  expect(getEnemyContactDisplacement({ ...enemy, contactAttackTimer: 0, contactAttackPulse: 0.34 })).toBeCloseTo(0.34);
  expect(getEnemyContactDisplacement({ ...enemy, contactAttackTimer: 0, contactAttackPulse: 0 })).toBe(0);
});

test('combat identity damage-source smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, `/?qa=combat&quality=${runtimeQuality}`);
  await expect(page.locator('.hudEncounter')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('.hudObjectiveDock')).toHaveCount(0);
  await page.waitForFunction(
    () => {
      const sources = window.__RUNE_DRIFT_QA__?.metrics?.()?.combat?.damageBySource;
      return ['orb', 'storm', 'blade', 'lightning', 'nova'].every(source => sources?.[source] > 0);
    },
    null,
    { polling: 50, timeout: runtimeTimeout(8_000, 75_000) }
  );
  const metrics = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics());
  expect(metrics.combat.totalDamage, 'combat fixture total damage').toBeGreaterThan(0);
  expect(metrics.counts.enemies, 'combat fixture targets').toBeGreaterThanOrEqual(16);
  await capture(page, 'qa-smoke-combat-identity');
  guards.assertClean();
});

test('mobile HUD, touch movement, dash, and pause smoke', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true
  });
  const page = await context.newPage();
  const guards = await openGuardedPage(page, '/?quality=low');
  await expect(page.locator('.hudRunPocket')).toBeVisible();
  await expect(page.locator('.hudCoachCard')).toBeVisible();
  await expect(page.locator('.hudActions')).toBeVisible();
  await expect(page.locator('.touchControls')).toBeVisible();

  const before = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics().player);
  const stick = page.locator('.touchStick');
  const box = await stick.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + box.width * 0.3, centerY - box.height * 0.3);
  await page.waitForTimeout(1_200);
  await page.mouse.up();
  const afterMove = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics().player);
  expect(Math.hypot(afterMove.x - before.x, afterMove.z - before.z), 'mobile player movement distance').toBeGreaterThan(2);

  await page.locator('.touchDashButton').dispatchEvent('pointerdown', { pointerId: 2 });
  await page.waitForTimeout(100);
  const afterDash = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics().player);
  expect(afterDash.dashCooldown, 'mobile dash cooldown').toBeGreaterThan(0);

  await page.evaluate(() => window.__RUNE_DRIFT_QA__.contactAttack());
  await page.waitForFunction(
    () => window.__RUNE_DRIFT_QA__.metrics()?.contact?.hits >= 1,
    null,
    { polling: 16, timeout: 2_000 }
  );
  const mobileHitAlert = page.locator('.hudAlert').first();
  await expect(mobileHitAlert).toContainText('피격');
  const mobileHitBox = await mobileHitAlert.boundingBox();
  const mobileVitalsBox = await page.locator('.runeVitals').boundingBox();
  expect(mobileHitBox.x).toBeGreaterThanOrEqual(0);
  expect(mobileHitBox.x + mobileHitBox.width).toBeLessThanOrEqual(360);
  expect(Math.abs(mobileHitBox.x - mobileVitalsBox.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileHitBox.width - mobileVitalsBox.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileHitBox.y - (mobileVitalsBox.y + mobileVitalsBox.height))).toBeLessThanOrEqual(2);
  await capture(page, 'qa-smoke-mobile-hit');

  await page.getByRole('button', { name: '일시정지' }).click();
  await expect(page.locator('.pausePanel')).toBeVisible();
  await expect(page.getByRole('group', { name: '그래픽 품질 선택' })).toBeVisible();
  await capture(page, 'qa-smoke-mobile-pause');
  await page.locator('.pausePanel').getByRole('button', { name: '계속하기' }).click();
  await expect(page.locator('.pausePanel')).toBeHidden();
  await capture(page, 'qa-smoke-mobile');

  await page.evaluate(() => window.__RUNE_DRIFT_QA__.result('victory'));
  await expect(page.locator('.resultVerdict')).toBeVisible();
  const replayButton = page.locator('.endPanel > .primaryButton');
  await replayButton.scrollIntoViewIfNeeded();
  await expect(replayButton).toBeVisible();
  await capture(page, 'qa-smoke-mobile-result');
  guards.assertClean();
  await context.close();
});

test('pause quality selector applies and persists a player choice', async ({ page }) => {
  const guards = await openGuardedPage(page, '/');
  await page.getByRole('button', { name: '일시정지' }).click();
  const qualityGroup = page.getByRole('group', { name: '그래픽 품질 선택' });
  await expect(qualityGroup).toBeVisible();
  await expect(qualityGroup.getByRole('button', { name: '자동', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await qualityGroup.getByRole('button', { name: '성능', exact: true }).click();
  await expect(page.locator('.shell')).toHaveClass(/visual-low/);
  await expect(qualityGroup.getByRole('button', { name: '성능', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.loadingLayer')).toBeHidden({ timeout: 20_000 });
  await page.getByRole('button', { name: '일시정지' }).click();
  await expect(page.locator('.shell')).toHaveClass(/visual-low/);
  const persistedQualityGroup = page.getByRole('group', { name: '그래픽 품질 선택' });
  await expect(persistedQualityGroup.getByRole('button', { name: '성능', exact: true }))
    .toHaveAttribute('aria-pressed', 'true');
  guards.assertClean();
});

test('upgrade reward smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=upgrade&quality=balanced');
  await expect(page.locator('.rewardCard')).toHaveCount(3);
  await expect(page.locator('.rewardCardBadge')).toHaveCount(3);
  await expect(page.locator('.upgradePickCta')).toHaveCount(3);
  await expect(page.locator('.runeChoiceIndex')).toHaveCount(0);
  await capture(page, 'qa-smoke-upgrade');
  guards.assertClean();
});

test('boss HUD smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?quality=balanced');
  await page.waitForFunction(() => Boolean(window.__RUNE_DRIFT_QA__));
  await page.evaluate(() => window.__RUNE_DRIFT_QA__.boss({ enraged: true }));
  await expect(page.locator('.hudBoss')).toBeVisible();
  await expect(page.locator('.hudEncounter')).toHaveCount(0);
  await expect(page.locator('.hudObjectiveDock')).toHaveCount(0);
  await expect(page.locator('.hudBoss')).toContainText('BOSS');
  await expect(page.locator('.runeCircuit')).toContainText('CIRCUIT 1/4');
  await expect(page.locator('.runeCircuit')).toContainText('생명 봉인');
  await capture(page, 'qa-smoke-boss');
  guards.assertClean();
});

test('result overlay smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=victory&quality=balanced');
  await expect(page.locator('.endPanel')).toBeVisible();
  await expect(page.locator('.endPanel')).toContainText('5분 생존');
  await expect(page.locator('.resultVerdict')).toBeVisible();
  await expect(page.locator('.resultStats')).toContainText('40 / 40');
  await expect(page.locator('.resultStats')).toContainText('30 / 30');
  await expect(page.locator('.resultGrade')).toContainText('/ 100');
  await expect(page.locator('.resultHighlights em')).toHaveCount(3);
  await expect(page.locator('.resultHighlights b')).toHaveCount(3);
  await expect(page.locator('.resultHighlights small')).toHaveCount(3);
  const damageBreakdown = getDamageSourceBreakdown(createQaResultGame('victory'));
  expect(damageBreakdown.map(source => source.source)).toEqual(['lightning', 'storm', 'orb']);
  expect(damageBreakdown.reduce((total, source) => total + source.share, 0))
    .toBeCloseTo((28_600 + 23_800 + 17_600) / 84_200);
  await expect(page.locator('.resultDamageRow')).toHaveCount(3);
  await expect(page.locator('.resultDamageRow').first()).toContainText('연쇄 번개');
  await expect(page.locator('.resultDamageRow').first()).toContainText('34%');
  await expect(page.locator('.resultDefense')).toBeVisible();
  await expect(page.locator('.resultDefense')).toContainText('받은 피해168');
  await expect(page.locator('.resultDefense')).toContainText('실제 회복134');
  await expect(page.locator('.resultDefense')).toContainText('균열 종결 · 53');
  await expect(page.locator('.resultReplay')).toBeVisible();
  await expect(page.locator('.resultReplay')).toContainText('NEXT INSCRIPTION');
  await expect(page.getByRole('button', { name: /경로로 재도전/ })).toBeVisible();
  await capture(page, 'qa-smoke-result');
  const replayButton = page.getByRole('button', { name: /경로로 재도전/ });
  await replayButton.scrollIntoViewIfNeeded();
  await replayButton.click({ timeout: runtimeTimeout(10_000, 40_000) });
  await expect(page.locator('.hudAlert')).toContainText('궤도 칼날 경로 예약');
  guards.assertClean();
});

test('survival result keeps incomplete circuit distinct from victory', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=survived&quality=balanced');
  await expect(page.locator('.endPanel')).toBeVisible();
  await expect(page.locator('.endPanel')).toContainText('5분을 생존했지만 회로가 미완성입니다');
  await expect(page.locator('.resultOutcomeCopy')).toContainText('정화 봉인부터 연결');
  await expect(page.locator('.resultStats')).toContainText('15 / 30');
  await expect(page.locator('.resultGrade')).toContainText('생존 귀환');
  await expect(page.locator('.resultGrade')).not.toContainText('회로 완성');
  await capture(page, 'qa-smoke-result-survived');
  guards.assertClean();
});

test('stress budget smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, `/?qa=stress&quality=${runtimeQuality}`);
  const frameSampleTarget = isCi ? 10 : 180;
  await page.waitForFunction(
    target => window.__RUNE_DRIFT_QA__?.metrics?.()?.frameStats?.samples > target,
    frameSampleTarget,
    { polling: 100, timeout: runtimeTimeout(15_000, 45_000) }
  );
  await page.waitForTimeout(1_000);
  const metrics = await page.evaluate(() => window.__RUNE_DRIFT_QA__?.metrics?.());
  expect(metrics?.frameStats?.samples, 'frame samples').toBeGreaterThan(frameSampleTarget);
  if (enforceRealtimeFrameRate) {
    expect(metrics?.frameStats?.avgFps, 'average FPS').toBeGreaterThanOrEqual(55);
    expect(metrics?.frameStats?.severeFrames, 'severe frames').toBe(0);
  }
  expect(metrics?.counts?.enemies, 'stress enemy count').toBeGreaterThan(20);
  expect(metrics?.counts?.enemies, 'enemy runtime budget').toBeLessThanOrEqual(metrics.runtimeBudget.maxEnemies);
  expect(metrics?.counts?.projectiles, 'projectile runtime budget').toBeLessThanOrEqual(metrics.runtimeBudget.maxProjectiles);
  expect(metrics?.counts?.xpGems, 'XP runtime budget').toBeLessThanOrEqual(metrics.runtimeBudget.maxXpGems);
  await capture(page, 'qa-smoke-stress');
  guards.assertClean();
});

test('mobile stress keeps combat signals inside the safe frame', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true
  });
  const page = await context.newPage();
  const guards = await openGuardedPage(page, '/?qa=stress&quality=balanced');
  await expect(page.locator('.hudCompact')).toBeVisible();
  await page.waitForTimeout(900);

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight
  }));
  expect(layout.scrollWidth, 'mobile stress horizontal overflow').toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.scrollHeight, 'mobile stress vertical overflow').toBeLessThanOrEqual(layout.viewportHeight);

  const hudOverlap = await page.evaluate(() => {
    const rect = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
    };
    const overlaps = (left, right) => Boolean(left && right
      && left.left < right.right
      && left.right > right.left
      && left.top < right.bottom
      && left.bottom > right.top);
    const vitals = rect('.hudVitalsPocket');
    const alerts = rect('.hudAlertStack');
    const boss = rect('.hudBoss');
    return {
      vitalsAlerts: overlaps(vitals, alerts),
      vitalsBoss: overlaps(vitals, boss),
      alertsBoss: overlaps(alerts, boss)
    };
  });
  expect(hudOverlap, 'mobile boss HUD regions must not overlap').toEqual({
    vitalsAlerts: false,
    vitalsBoss: false,
    alertsBoss: false
  });

  const metrics = await page.evaluate(() => window.__RUNE_DRIFT_QA__?.metrics?.());
  expect(metrics?.counts?.projectiles).toBeLessThanOrEqual(SIMULATION_BUDGET.maxProjectiles);
  expect(metrics?.counts?.xpGems).toBeLessThanOrEqual(SIMULATION_BUDGET.maxXpGems);
  await capture(page, 'qa-smoke-mobile-stress');
  guards.assertClean();
  await context.close();
});
