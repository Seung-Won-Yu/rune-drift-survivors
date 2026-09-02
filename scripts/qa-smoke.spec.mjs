import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  EARLY_FIELD_ITEM_SCHEDULE,
  SHRINE_SITES
} from '../src/config/gameData.js';
import {
  SIMULATION_BUDGET,
  STARTING_XP_TO_NEXT
} from '../src/config/gameTuning.js';
import { getEnemyContactDisplacement } from '../src/systems/enemyContactRuntime.js';
import {
  getRiftbornAnimationFrame,
  getRiftbornThreatAnimationFrame
} from '../src/systems/enemySprite.js';
import { createInitialGame, withItemPickup } from '../src/systems/gameState.js';
import { createRuneCircuitLandmarkLayout } from '../src/systems/mapLayout.js';
import { getRuneWardenAnimationFrame } from '../src/systems/playerSprite.js';
import { getUpgradeFocusKey } from '../src/systems/progression.js';
import { applyFrameStateUpdate } from '../src/systems/runFrameState.js';
import {
  getCircuitEncounterProfile,
  getCircuitFinaleState,
  getRunCompletionResult
} from '../src/systems/runeCircuit.js';
import { getShrineActivationAlert } from '../src/systems/shrineRuntime.js';
import { pickArmoryBoost } from '../src/systems/upgradeDrafting.js';
import { getNextXpThreshold } from '../src/systems/xpRuntime.js';

const artifactDir = path.resolve('output/playwright');
const enforceRealtimeFrameRate = process.env.CI !== 'true';

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

test('replay route guarantees the first armory family', () => {
  const guidedRun = withItemPickup(createInitialGame({ replayRouteFamily: 'blade' }), 'cache');
  expect(getUpgradeFocusKey(pickArmoryBoost(guidedRun))).toBe('blade');
});

test('desktop movement and dash input smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?quality=balanced');
  await page.waitForFunction(() => Boolean(window.__RUNE_DRIFT_QA__?.metrics?.()?.player));
  const before = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics().player);
  await page.keyboard.down('w');
  await page.waitForTimeout(1_200);
  await page.keyboard.up('w');
  const afterMove = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics().player);
  expect(Math.hypot(afterMove.x - before.x, afterMove.z - before.z), 'player movement distance').toBeGreaterThan(2);
  await page.keyboard.press(' ');
  await page.waitForTimeout(100);
  const afterDash = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics().player);
  expect(afterDash.dashCooldown, 'dash cooldown').toBeGreaterThan(0);
  guards.assertClean();
});

test('dash input buffer smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?quality=balanced');
  await page.waitForFunction(() => Boolean(window.__RUNE_DRIFT_QA__?.metrics?.()?.player));
  await page.keyboard.press(' ');
  await page.waitForFunction(
    () => window.__RUNE_DRIFT_QA__.metrics().player.dashCooldown > 0.8,
    null,
    { polling: 16, timeout: 2_000 }
  );
  await page.waitForFunction(
    () => {
      const cooldown = window.__RUNE_DRIFT_QA__.metrics().player.dashCooldown;
      return cooldown > 0.03 && cooldown < 0.1;
    },
    null,
    { polling: 16, timeout: 2_000 }
  );
  await page.keyboard.press(' ');
  await page.waitForFunction(
    () => window.__RUNE_DRIFT_QA__.metrics().player.dashCooldown > 0.8,
    null,
    { polling: 16, timeout: 500 }
  );
  guards.assertClean();
});

test('audio unlock, cue, and mute persistence smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?quality=balanced');
  await page.waitForFunction(() => Boolean(window.__RUNE_DRIFT_AUDIO__?.state));
  await page.keyboard.press(' ');
  await page.waitForFunction(
    () => {
      const state = window.__RUNE_DRIFT_AUDIO__.state();
      return state.unlocked && state.received > 0 && state.played > 0;
    },
    null,
    { polling: 20, timeout: 2_000 }
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
  const guards = await openGuardedPage(page, '/?quality=balanced');
  await page.waitForFunction(() => Boolean(window.__RUNE_DRIFT_QA__?.contactAttack));
  await page.evaluate(() => window.__RUNE_DRIFT_QA__.contactAttack());
  await page.waitForFunction(
    () => window.__RUNE_DRIFT_QA__.metrics()?.contact?.windups === 1,
    null,
    { polling: 16, timeout: 2_000 }
  );
  await capture(page, 'qa-smoke-contact-windup');
  await page.waitForFunction(
    () => {
      const metrics = window.__RUNE_DRIFT_QA__.metrics();
      return metrics?.contact?.resolved >= 1 && metrics?.contact?.hits >= 1;
    },
    null,
    { polling: 16, timeout: 2_000 }
  );
  const metrics = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics());
  expect(metrics.contact.recoveries, 'contact recovery state').toBeGreaterThanOrEqual(1);
  expect(metrics.player.invulnerable, 'player hit invulnerability').toBe(true);
  guards.assertClean();
});

test('enemy contact pose separates anticipation from impact', () => {
  const enemy = { radius: 1, contactAttackMax: 0.5, contactAttackTimer: 0.25, contactAttackPulse: 0 };
  expect(getEnemyContactDisplacement(enemy)).toBeLessThan(-0.1);
  expect(getEnemyContactDisplacement({ ...enemy, contactAttackTimer: 0, contactAttackPulse: 0.34 })).toBeCloseTo(0.34);
  expect(getEnemyContactDisplacement({ ...enemy, contactAttackTimer: 0, contactAttackPulse: 0 })).toBe(0);
});

test('combat identity damage-source smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=combat&quality=balanced');
  await expect(page.locator('.hudEncounter')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('.hudObjectiveDock')).toHaveCount(0);
  await page.waitForFunction(
    () => {
      const sources = window.__RUNE_DRIFT_QA__?.metrics?.()?.combat?.damageBySource;
      return ['orb', 'storm', 'blade', 'lightning', 'nova'].every(source => sources?.[source] > 0);
    },
    null,
    { polling: 50, timeout: 8_000 }
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
  await expect(page.locator('.resultReplay')).toBeVisible();
  await expect(page.locator('.resultReplay')).toContainText('NEXT INSCRIPTION');
  await expect(page.getByRole('button', { name: /경로로 재도전/ })).toBeVisible();
  await capture(page, 'qa-smoke-result');
  await page.getByRole('button', { name: /경로로 재도전/ }).click();
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
  const guards = await openGuardedPage(page, '/?qa=stress&quality=balanced');
  await page.waitForFunction(
    () => window.__RUNE_DRIFT_QA__?.metrics?.()?.frameStats?.samples > 180,
    null,
    { polling: 100, timeout: 15_000 }
  );
  await page.waitForTimeout(1_000);
  const metrics = await page.evaluate(() => window.__RUNE_DRIFT_QA__?.metrics?.());
  expect(metrics?.frameStats?.samples, 'frame samples').toBeGreaterThan(180);
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
