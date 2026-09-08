import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import * as THREE from 'three';
import { GAME_CAMERA_FOV, getCameraFrame } from '../src/config/artDirection.js';
import { upgradePool } from '../src/config/upgrades.js';
import {
  EARLY_FIELD_ITEM_SCHEDULE,
  SHRINE_SITES
} from '../src/config/gameData.js';
import {
  SIMULATION_BUDGET,
  STARTING_XP_TO_NEXT
} from '../src/config/gameTuning.js';
import { getSpawnWarningPresentation } from '../src/systems/combatFeedbackPresentation.js';
import {
  getEnemyContactDisplacement,
  getEnemyContactTelegraphState
} from '../src/systems/enemyContactRuntime.js';
import { getEnemyPursuitLead, getEnemyPursuitSpeedScale } from '../src/systems/enemyPacing.js';
import {
  getRiftbornAnimationFrame,
  getRiftbornThreatAnimationFrame
} from '../src/systems/enemySprite.js';
import { getCombatSignalPriority, updateVisualFeedbackPools } from '../src/systems/feedbackRuntime.js';
import { createInitialGame, createQaResultGame, withItemPickup } from '../src/systems/gameState.js';
import { createScheduledFieldItem, getFieldDetourState, getRouteDetourPosition } from '../src/systems/fieldItemDirector.js';
import { updateFieldItemsRuntime } from '../src/systems/fieldItemRuntime.js';
import { getPlayerTerrainY, hitsStaticCollider } from '../src/systems/terrain.js';
import {
  createRuneBiomeZoneLayout,
  createRuneCircuitLandmarkLayout,
  createRuneCircuitPathMarkLayout
} from '../src/systems/mapLayout.js';
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
import { getDamageSourceBreakdown, getRunDefenseSummary, getFirstSessionCue, getOnboardingSteps } from '../src/systems/runProgress.js';
import { getOpeningUpgradeRead } from '../src/systems/openingUpgradePresentation.js';
import { updateFollowCamera } from '../src/systems/sceneCamera.js';
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
import { getSpriteMatteAlpha } from '../src/world/spriteAtlasTexture.js';
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

test('first-seal guidance progresses without requiring dash or XP before an open seal', () => {
  const game = createInitialGame();
  const cue = () => getFirstSessionCue(game, getOnboardingSteps(game));
  expect(cue()).toMatchObject({ stepId: 'move', touchAction: '왼쪽 스틱으로 이동' });
  game.time = 10;
  expect(cue().stepId).toBe('move');
  game.onboardingMovement = 12;
  expect(cue().stepId).toBe('xp');
  game.time = SHRINE_SITES[0].unlockAt;
  expect(game.dashUses).toBe(0);
  expect(game.xp).toBe(0);
  expect(cue()).toMatchObject({ stepId: 'circuit' });
  expect(cue().body).toContain('머무르면');
  game.activatedShrines = { [SHRINE_SITES[0].id]: true };
  game.shrineActivations = 1;
  expect(cue()).toBeNull();
});

test('opening upgrade comparisons include focus bonuses and do not mutate the run', () => {
  const game = createInitialGame();
  const read = id => getOpeningUpgradeRead(game, upgradePool.find(upgrade => upgrade.id === id));
  const before = JSON.stringify(game);
  expect(read('orb-count').statLine).toBe('최대 표적 1 → 2');
  expect(read('maxHp').statLine).toBe('최대 체력 120 → 140');
  expect(read('luck').summary).toContain('경험치');
  expect(JSON.stringify(game)).toBe(before);
  game.stats.orbCount = 2;
  game.buildFocus.orb = 1;
  expect(read('orb-count').statLine).toBe('최대 표적 2 → 4');
});

test('first-seal camera keeps the player and nearby threats visible across orientations', () => {
  for (const [width, height] of [[1440, 900], [360, 740], [320, 568], [740, 360]]) {
    const camera = new THREE.PerspectiveCamera(GAME_CAMERA_FOV, width / height, 0.1, 420);
    const frame = getCameraFrame(camera.aspect);
    camera.position.set(0, frame.height, frame.depth);
    const cameraTarget = new THREE.Vector3();
    const scratch = { vec: new THREE.Vector3(), flat: new THREE.Vector2(), cameraPosition: new THREE.Vector3() };
    const shrine = SHRINE_SITES[0];
    for (const fraction of [0, 0.5, 1]) {
      const playerPos = new THREE.Vector3(Math.cos(shrine.angle) * shrine.radius * fraction, 0.55, Math.sin(shrine.angle) * shrine.radius * fraction);
      for (let i = 0; i < 180; i += 1) updateFollowCamera({ camera, playerPos, cameraTarget, cameraShake: { current: 0 }, scratch, dt: 1 / 60 });
      camera.updateMatrixWorld();
      for (const [dx, dz] of [[0, 0], [-8, 0], [8, 0], [0, -8], [0, 8]]) {
        const projected = playerPos.clone().add(new THREE.Vector3(dx, 0, dz)).project(camera);
        expect(Math.abs(projected.x), `${width}×${height}: nearby threat stays horizontally visible`).toBeLessThan(0.92);
        expect(Math.abs(projected.y), `${width}×${height}: nearby threat stays vertically visible`).toBeLessThan(0.7);
      }
    }
  }
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
    animations: 'disabled',
    timeout: 10_000
  });
}

async function openGuardedPage(page, route) {
  const guards = await attachPageGuards(page);
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.loadingLayer')).toBeHidden({ timeout: 20_000 });
  if (new URL(route, 'http://localhost').searchParams.has('qa')) {
    await page.waitForFunction(() => window.__RUNE_DRIFT_QA__?.ready?.() === true);
  }
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
  await expect(page.locator('.loadingLayer')).toContainText('RUNE DRIFT · SURVIVORS');
  await expect(page.locator('.loadingLayer')).toContainText('룬 야전을 새기는 중');
  await expect(page.getByRole('progressbar', { name: '게임 로딩' })).toHaveAttribute('aria-valuenow');
  await capture(page, 'qa-smoke-loading');
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

test('sprite matte removes pale neutral backdrops without erasing the cloak or rune colors', () => {
  expect(getSpriteMatteAlpha(255, 255, 255)).toBe(0);
  expect(getSpriteMatteAlpha(243, 243, 243)).toBe(0);
  expect(getSpriteMatteAlpha(15, 51, 48)).toBe(255);
  expect(getSpriteMatteAlpha(210, 166, 67)).toBe(255);
  expect(getSpriteMatteAlpha(20, 221, 255)).toBe(255);
  expect(getSpriteMatteAlpha(15, 51, 48, 96)).toBe(96);
  expect(getSpriteMatteAlpha(20, 221, 255, 0)).toBe(0);
});

test('keyed cast atlases preserve visible artwork and transparent borders in every animation cell', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=threats&quality=balanced');
  const atlases = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js');
    const { createSpriteAtlasTexture } = await import('/src/world/spriteAtlasTexture.js');
    const { SPRITE_URLS } = await import('/src/config/assets.js');
    const results = [];
    for (const [role, url] of Object.entries(SPRITE_URLS)) {
      const source = await new THREE.TextureLoader().loadAsync(url);
      const texture = createSpriteAtlasTexture(source);
      const canvas = texture.image;
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const rows = role === 'riftbornThreat' ? 8 : 6;
      const cells = [];
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          let opaque = 0;
          let clear = 0;
          let total = 0;
          for (let y = Math.ceil(row * canvas.height / rows); y < (row + 1) * canvas.height / rows; y += 2) {
            for (let x = Math.ceil(col * canvas.width / 4); x < (col + 1) * canvas.width / 4; x += 2) {
              const alpha = pixels[(y * canvas.width + x) * 4 + 3];
              if (alpha > 230) opaque += 1;
              if (alpha === 0) clear += 1;
              total += 1;
            }
          }
          cells.push({ row, col, opaque: opaque / total, clear: clear / total });
        }
      }
      results.push({ role, cells });
      texture.dispose();
      source.dispose();
    }
    return results;
  });
  for (const atlas of atlases) {
    for (const cell of atlas.cells) {
      const label = `${atlas.role} row ${cell.row} column ${cell.col}`;
      expect(cell.opaque, `${label}: silhouette survives`).toBeGreaterThan(0.08);
      expect(cell.clear, `${label}: background stays transparent`).toBeGreaterThan(0.15);
    }
  }
  guards.assertClean();
});

for (const [quality, width, height] of [
  ['low', 360, 740], ['balanced', 360, 740], ['high', 360, 740],
  ['balanced', 320, 568], ['balanced', 568, 320], ['balanced', 740, 360]
]) {
  test(`cast readability at ${width}x${height} with ${quality} quality`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const guards = await openGuardedPage(page, `/?qa=threats&quality=${quality}`);
    await page.waitForFunction(() => Boolean(window.__RUNE_DRIFT_QA__?.metrics?.()));
    // High-quality startup can finish after the URL fixture's initial timers.
    await page.evaluate(() => window.__RUNE_DRIFT_QA__.threats());
    await page.waitForFunction(() => window.__RUNE_DRIFT_QA__?.metrics?.()?.counts?.enemies === 4);
    const clock = await page.locator('.runeRunClock').boundingBox();
    const objective = await page.locator('.runeObjective').boundingBox();
    expect(objective.y).toBeGreaterThanOrEqual(clock.y + clock.height + 8);
    expect(objective.height).toBeLessThanOrEqual(88);
    if (width < height && height <= 640) expect(objective.y).toBeGreaterThanOrEqual(height * 0.56);
    await page.waitForTimeout(500);
    await capture(page, `qa-cast-${width}x${height}-${quality}`);
    guards.assertClean();
    await context.close();
  });
}

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
  await expect(page.locator('.hudTopBar .runeUiIcon')).toHaveCount(5);
  await expect(page.getByRole('progressbar', { name: /체력/ })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: /레벨 1/ })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: '런 진행도' })).toBeVisible();
  await expect(page.locator('.runeCircuit')).toBeVisible();
  await expect(page.locator('.runeCircuit')).toContainText('CIRCUIT 0/4');
  await expect(page.locator('.runeCircuit')).toContainText('무기 봉인');
  await expect(page.getByRole('img', { name: '동쪽 방향' })).toBeVisible();
  await capture(page, 'qa-smoke-hud');
  guards.assertClean();
});

test('rune circuit ready-state smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=circuit&quality=balanced');
  await expect(page.locator('.runeCircuit')).toContainText('CIRCUIT 0/4');
  await expect(page.locator('.runeCircuitDestination em')).toHaveText('개방');
  await expect(page.locator('.runeCircuit')).toContainText('무기 봉인');
  await expect(page.locator('.runeCircuit')).toContainText('빌드 보급');
  await expect(page.locator('.hudCoachCard')).toHaveAttribute('data-step', 'circuit');
  await expect(page.locator('.hudCoachCard p')).toContainText('머무르면');
  await page.waitForFunction(() => window.__RUNE_DRIFT_QA__?.metrics?.()?.frameStats?.samples > 12);
  await capture(page, 'qa-smoke-circuit');
  guards.assertClean();
});

test('seal track distinguishes completed, current and future destinations', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=seal&quality=balanced');
  const track = page.getByRole('list', { name: '봉인 연결 상태' });
  await expect(track.locator('.isConnected')).toHaveCount(1);
  await expect(track.locator('[aria-current="step"]')).toHaveAttribute('aria-label', '생명 봉인: 다음 목표');
  await page.evaluate(() => window.__RUNE_DRIFT_QA__.objectives({ phase: 'qa-preview' }));
  await expect(track.locator('.isConnected')).toHaveCount(3);
  await expect(track.locator('[aria-current="step"]')).toHaveAttribute('aria-label', '각인 봉인: 다음 목표');
  await page.evaluate(() => window.__RUNE_DRIFT_QA__.result('victory'));
  await expect(track.locator('.isConnected')).toHaveCount(4);
  await expect(track.locator('[aria-current="step"]')).toHaveCount(0);
  await expect(page.getByLabel('룬 회로 완성')).toContainText('회로 연결 완료');
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
  await expect(page.locator('.hudEncounter')).toHaveAttribute('data-kind', 'circuit');
  await expect(page.locator('.hudEncounter .runeUiIcon')).toBeVisible();
  await expect(page.locator('.hudObjectiveDock')).toHaveCount(0);
  await expect(page.locator('.hudCoachCard')).toHaveCount(0);
  await expect(page.locator('.hudAlertStack')).toHaveCount(0);
  await capture(page, 'qa-smoke-circuit-activation');
  guards.assertClean();
});

test('pause uses the current run-phase objectives', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=objectives&quality=balanced');
  await expect(page.locator('.runeCircuit')).toContainText('각인 봉인');
  await expect(page.locator('.runeCircuit')).toContainText('보상 선택');
  const objectiveDock = page.locator('.hudObjectiveDock');
  await expect(objectiveDock).toBeVisible();
  await expect(objectiveDock.getByRole('progressbar')).toHaveCount(1);
  await expect(objectiveDock.locator('.runeUiIcon')).toBeVisible();
  await capture(page, 'qa-smoke-objectives');
  await page.evaluate(() => window.__RUNE_DRIFT_QA__.objectives({ phase: 'paused' }));
  const pauseObjectives = page.locator('.pauseObjectives');
  await expect(pauseObjectives).toContainText('봉인 4개 활성');
  await expect(pauseObjectives).not.toContainText('적 12 처치');
  await capture(page, 'qa-smoke-pause-objectives');
  guards.assertClean();
});

test('dialogs keep focus contained and restart requires confirmation', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=objectives&quality=balanced');
  const hudRestart = page.getByRole('button', { name: '다시 시작', exact: true });
  await hudRestart.click();
  await expect(page.getByRole('button', { name: /다시 시작 확인/ })).toBeVisible();
  await expect(page.locator('.runeCircuit')).toContainText('각인 봉인');
  await page.getByRole('button', { name: /다시 시작 확인/ }).click();
  await expect(page.locator('.runeCircuit')).toContainText('CIRCUIT 0/4');

  await page.getByRole('button', { name: '일시정지' }).click();
  const pauseDialog = page.getByRole('dialog', { name: '균열이 잠시 멈췄습니다' });
  const resumeButton = pauseDialog.getByRole('button', { name: '계속하기' });
  await expect(pauseDialog).toBeVisible();
  await expect(resumeButton).toBeFocused();

  const dialogButtons = pauseDialog.getByRole('button');
  await dialogButtons.last().focus();
  await page.keyboard.press('Tab');
  await expect(resumeButton).toBeFocused();

  await pauseDialog.getByRole('button', { name: '다시 시작', exact: true }).click();
  await expect(pauseDialog).toBeVisible();
  await expect(pauseDialog.getByRole('button', { name: /다시 시작 확인/ })).toBeVisible();
  // Confirmation remains available to players who need time to read it.
  await page.waitForTimeout(2800);
  await expect(pauseDialog.getByRole('button', { name: /다시 시작 확인/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(pauseDialog).toBeVisible();
  await expect(pauseDialog.getByRole('button', { name: '다시 시작', exact: true })).toBeVisible();
  await pauseDialog.getByRole('button', { name: '다시 시작', exact: true }).click();
  await resumeButton.focus();
  await expect(pauseDialog.getByRole('button', { name: '다시 시작', exact: true })).toBeVisible();
  await pauseDialog.getByRole('button', { name: '다시 시작', exact: true }).click();
  await pauseDialog.getByRole('button', { name: /다시 시작 확인/ }).click();
  await expect(pauseDialog).toBeHidden();
  guards.assertClean();
});

test('a newer QA scene supersedes a pending fixture', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=threats&quality=balanced');
  const applied = await page.evaluate(async () => {
    const qa = window.__RUNE_DRIFT_QA__;
    return Promise.all([qa.threats(), qa.reset()]);
  });
  expect(applied).toEqual([false, true]);
  await expect(page.locator('.runeCircuit')).toContainText('CIRCUIT 0/4');
  expect(await page.evaluate(() => window.__RUNE_DRIFT_QA__.snapshot().phase)).toBe('playing');
  await guards.assertClean();
});

test('paused gameplay stops continuous rendering and resumes frames', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?quality=low');
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  const resume = page.getByRole('dialog').getByRole('button', { name: '계속하기', exact: true });
  await expect(resume).toBeVisible();
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics().frameStats.samples);
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics().frameStats.samples);
  expect(after - before).toBeLessThanOrEqual(2);
  await resume.click();
  await page.waitForFunction(samples => window.__RUNE_DRIFT_QA__.metrics().frameStats.samples > samples + 5, after);
  await guards.assertClean();
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

test('code-built circuit landmarks give every seal a distinct biome identity', () => {
  const balanced = createRuneCircuitLandmarkLayout('balanced');
  const low = createRuneCircuitLandmarkLayout('low');
  const balancedBiomes = createRuneBiomeZoneLayout('balanced');
  const lowBiomes = createRuneBiomeZoneLayout('low');
  const balancedPathMarks = createRuneCircuitPathMarkLayout('balanced');
  const lowPathMarks = createRuneCircuitPathMarkLayout('low');
  expect(balanced.lowerBases).toHaveLength(4);
  expect(balanced.approachSteps).toHaveLength(16);
  expect(balanced.signatureSites.map(site => site.kind)).toEqual(['armory', 'vital', 'purge', 'etching']);
  expect(balanced.rankStones).toHaveLength(10);
  expect(balancedPathMarks).toHaveLength(12);
  expect(balancedBiomes.kinds).toEqual(['armory', 'vital', 'purge', 'etching']);
  expect(balancedBiomes.zonePatches).toHaveLength(12);
  expect(balancedBiomes.zoneRings).toHaveLength(4);
  expect(balancedBiomes.ruinFragments).toHaveLength(16);
  expect(balancedBiomes.runeShards).toHaveLength(12);
  expect(low.approachSteps).toHaveLength(8);
  expect(low.rankStones).toHaveLength(0);
  expect(lowPathMarks).toHaveLength(8);
  expect(lowBiomes.ruinFragments).toHaveLength(8);
  expect(lowBiomes.runeShards).toHaveLength(4);
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

test('threat reference scene keeps late warnings visible above optional effects', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=threats&quality=balanced');
  await page.waitForFunction(() => {
    const counts = window.__RUNE_DRIFT_QA__?.metrics?.()?.counts;
    return counts?.enemies === 4 && counts?.spawnWarnings === 2 && counts?.weaponEffects === 1;
  });
  await page.waitForTimeout(620);
  await expect(page.locator('.hudAlertStack')).toHaveCount(0);
  await capture(page, 'qa-smoke-threat-telegraphs');
  guards.assertClean();
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

test('visual budgets retain threat signals ahead of optional attack effects', () => {
  const weaponEffects = { current: [
    { signal: 'attack', life: 1, maxLife: 1 },
    { signal: 'reward', life: 1, maxLife: 1 },
    { signal: 'threat', life: 1, maxLife: 1 },
    { signal: 'threat-impact', life: 1, maxLife: 1 }
  ] };
  const spawnWarnings = { current: [
    { signal: 'objective', life: 1, maxLife: 1 },
    { signal: 'threat', life: 1, maxLife: 1 },
    { signal: 'reward', life: 1, maxLife: 1 }
  ] };
  updateVisualFeedbackPools({
    dt: 0.1,
    visualQuality: 'balanced',
    hitBursts: { current: [] },
    weaponEffects,
    damageNumbers: { current: [] },
    spawnWarnings
  });
  expect(getCombatSignalPriority({ signal: 'threat-impact' })).toBeGreaterThan(getCombatSignalPriority({ signal: 'attack' }));
  expect(weaponEffects.current.map(effect => effect.signal)).toEqual(['threat-impact', 'threat']);
  expect(spawnWarnings.current.map(warning => warning.signal)).toEqual(['threat', 'objective']);
});

test('threat warnings intensify toward impact while reward signals decay', () => {
  const earlyThreat = getSpawnWarningPresentation({ signal: 'threat', life: 0.9, maxLife: 1 });
  const lateThreat = getSpawnWarningPresentation({ signal: 'threat', life: 0.1, maxLife: 1 });
  const earlyReward = getSpawnWarningPresentation({ signal: 'reward', life: 0.9, maxLife: 1 });
  const lateReward = getSpawnWarningPresentation({ signal: 'reward', life: 0.1, maxLife: 1 });
  expect(lateThreat.urgency).toBeGreaterThan(earlyThreat.urgency);
  expect(lateThreat.opacity).toBeGreaterThan(earlyThreat.opacity);
  expect(lateThreat.labelOpacity).toBeGreaterThan(earlyThreat.labelOpacity);
  expect(lateReward.opacity).toBeLessThan(earlyReward.opacity);
});

test('boss state removes duplicate crisis copy but preserves actionable damage', () => {
  const alerts = getHudAlerts({
    game: { damageFlash: 0.5, damageMessage: '-11 HP', pickupFlash: 1 },
    crisis: { level: 4, label: 'FINAL SURGE' },
    activeThreat: { label: 'RIFT BEAST', weakness: '룬/번개 집중', color: '#d4a84c' },
    bossPatternMeta: { label: '충격파', cue: '중거리 이탈', color: '#e06b5f' },
    bossStatus: { enraged: true },
    dashPct: 40,
    dashReady: false,
    dashCooldown: 0.7,
    showDashTicker: true
  });
  expect(alerts.map(alert => alert.id)).toEqual(['damage', 'dash']);
});

test('replay route guarantees the first armory family', () => {
  const guidedRun = withItemPickup(createInitialGame({ replayRouteFamily: 'blade' }), 'cache');
  guidedRun.buildFocus.orb = 2;
  expect(getUpgradeFocusKey(pickArmoryBoost(guidedRun))).toBe('blade');
});

test('armory rewards follow the active build and respect replay ties', () => {
  const game = withItemPickup(createInitialGame({ replayRouteFamily: 'blade' }), 'cache');
  game.buildFocus = { orb: 0, storm: 2, blade: 1, chain: 0, nova: 0 };
  for (let i = 0; i < 30; i += 1) expect(getUpgradeFocusKey(pickArmoryBoost(game))).toBe('storm');
  game.buildFocus.blade = 2;
  for (let i = 0; i < 30; i += 1) expect(getUpgradeFocusKey(pickArmoryBoost(game))).toBe('blade');
  game.replayRouteFamily = null;
  for (let i = 0; i < 30; i += 1) expect(['storm', 'blade']).toContain(getUpgradeFocusKey(pickArmoryBoost(game)));
});

test('armory focus preference preserves caps, exclusions and unlock gates', () => {
  const game = withItemPickup(createInitialGame(), 'cache');
  game.buildFocus.storm = 4;
  game.upgrades = Array(4).fill('storm-burst');
  game.stats.stormStrikes = 4;
  expect(pickArmoryBoost(game).id).toBe('storm-carpet');
  expect(pickArmoryBoost(game, new Set(['storm-carpet'])).id).not.toBe('storm-carpet');
  game.buildFocus.storm = 5;
  game.buildFocus.blade = 1;
  expect(getUpgradeFocusKey(pickArmoryBoost(game))).toBe('blade');
  const locked = createInitialGame({ replayRouteFamily: 'storm' });
  for (let i = 0; i < 20; i += 1) expect(getUpgradeFocusKey(pickArmoryBoost(locked))).toBe('orb');
  expect(pickArmoryBoost(game, new Set(upgradePool.map(upgrade => upgrade.id)))).toBeUndefined();
});

test('first-seal detour relocates one existing reward with a clear approach', () => {
  const game = createInitialGame();
  const scheduled = EARLY_FIELD_ITEM_SCHEDULE.find(item => item.id === 'starter-overload');
  const playerPos = new THREE.Vector3(34, getPlayerTerrainY(34, 0), 0);
  game.time = 20;
  expect(createScheduledFieldItem(scheduled, game, playerPos)).toBeNull();
  game.activatedShrines.armory = true;
  const item = createScheduledFieldItem(scheduled, game, playerPos);
  expect(item).toMatchObject({ type: 'overload', detour: true, life: 24, maxLife: 24 });
  expect(item.pos.distanceTo(playerPos)).toBeGreaterThan(19);
  for (let step = 1; step <= 12; step += 1) expect(hitsStaticCollider(playerPos.clone().lerp(item.pos, step / 12), 1.25)).toBe(false);
  expect(getFieldDetourState([item], playerPos)).toMatchObject({ type: 'overload', distance: 20, remaining: 24 });
  expect(getRouteDetourPosition(playerPos, { x: 34, z: 12 })).toBeNull();
  game.activatedShrines.vital = true;
  expect(createScheduledFieldItem(scheduled, game, playerPos)).toBeNull();
  game.time = scheduled.time;
  expect(createScheduledFieldItem(scheduled, game, playerPos).detour).toBeUndefined();
});

test('detour is optional, expires once and cannot duplicate its scheduled reward', () => {
  let game = createInitialGame();
  game.time = 20;
  game.activatedShrines.armory = true;
  const playerPos = new THREE.Vector3(34, getPlayerTerrainY(34, 0), 0);
  const context = {
    dt: 0.01,
    currentGame: game,
    updateGame: update => { game = update(game); },
    player: { current: { pos: playerPos } },
    fieldItems: { current: [] },
    fieldItemTimer: { current: 100 },
    fieldItemDropLock: { current: 0 },
    scheduledFieldItems: { current: new Set(EARLY_FIELD_ITEM_SCHEDULE.filter(item => item.id !== 'starter-overload').map(item => item.id)) },
    spawnWarnings: { current: [] },
    scratch: { vec: new THREE.Vector3() },
    hitBursts: { current: [] }, weaponEffects: { current: [] }, cameraShake: { current: 0 }, addDamageNumber: () => {}
  };
  updateFieldItemsRuntime(context);
  expect(context.fieldItems.current).toHaveLength(1);
  const item = context.fieldItems.current[0];
  // Walking straight to the seal must not vacuum a reward 8m off the player.
  playerPos.copy(item.pos).add(new THREE.Vector3(8, 0, 0));
  const originalPos = item.pos.clone();
  updateFieldItemsRuntime(context);
  expect(item.pos.equals(originalPos)).toBe(true);
  context.dt = 25;
  updateFieldItemsRuntime(context);
  expect(getFieldDetourState(context.fieldItems.current, playerPos)).toBeNull();
  context.currentGame = { ...game, time: 76 };
  context.dt = 0.01;
  updateFieldItemsRuntime(context);
  expect(context.fieldItems.current).toHaveLength(0);
  expect(game.itemPickups.overload).toBe(0);
  // A fresh run can take the same reward and receive the actual timed effect.
  context.scheduledFieldItems.current.delete('starter-overload');
  context.currentGame = game;
  playerPos.set(34, getPlayerTerrainY(34, 0), 0);
  updateFieldItemsRuntime(context);
  playerPos.copy(context.fieldItems.current[0].pos);
  updateFieldItemsRuntime(context);
  expect(game.itemPickups.overload).toBe(1);
  expect(game.overloadTimer).toBe(8);
  expect(context.fieldItems.current).toHaveLength(0);
});

async function waitForSealFeedback(page) {
  // This fixture starts at 28s and displays the seal announcement for 2.8 game
  // seconds. Software WebGL can need more than 20 wall seconds to simulate it.
  // Wait for actual simulation progress; do not bypass the announcement.
  await page.waitForFunction(
    () => window.__RUNE_DRIFT_QA__.snapshot().time >= 31,
    null,
    { polling: 100, timeout: runtimeTimeout(10_000, 60_000) }
  );
}

for (const [width, height] of [[320, 568], [768, 1024], [740, 360], [1440, 900]]) {
  test(`optional detour keeps seal navigation readable at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const guards = await openGuardedPage(page, `/?qa=seal&quality=${runtimeQuality}`);
    await waitForSealFeedback(page);
    const detour = page.getByLabel('선택 우회 보상');
    await expect(detour).toBeVisible();
    await expect(detour).toContainText('무기 폭주 8초');
    await expect(detour).toContainText('건너뛰어도 진행');
    await expect(page.getByLabel('다음 룬 회로 봉인')).toContainText('생명 봉인');
    await expect(page.locator('.runeObjective')).toHaveCount(0);
    const box = await detour.boundingBox();
    const top = await page.locator('.hudTopBar').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y).toBeGreaterThanOrEqual(top.y + top.height);
    expect(box.y + box.height).toBeLessThan(height - (height <= 400 ? 80 : 150));
    await capture(page, `qa-detour-${width}x${height}`);
    await page.evaluate(() => window.__RUNE_DRIFT_QA__.reset());
    await expect(detour).toHaveCount(0);
    expect((await page.evaluate(() => window.__RUNE_DRIFT_QA__.snapshot())).fieldDetour).toBeNull();
    await guards.assertClean();
  });
}

test('player can follow the detour cue and receive the timed reward', async ({ page }) => {
  const guards = await openGuardedPage(page, `/?qa=seal&quality=${runtimeQuality}`);
  await waitForSealFeedback(page);
  await expect(page.getByLabel('선택 우회 보상')).toBeVisible();
  const directions = {
    '↑': ['w'], '↗': ['w', 'd'], '→': ['d'], '↘': ['s', 'd'],
    '↓': ['s'], '↙': ['s', 'a'], '←': ['a'], '↖': ['w', 'a']
  };
  let held = [];
  let snapshot;
  try {
    for (let step = 0; step < 45; step += 1) {
      snapshot = await page.evaluate(() => window.__RUNE_DRIFT_QA__.snapshot());
      if (snapshot.itemPickups.overload > 0) break;
      for (const key of held) await page.keyboard.up(key);
      held = [];
      if (snapshot.phase === 'upgrade') {
        await page.locator('.rewardCard').first().click();
      } else if (snapshot.fieldDetour) {
        held = directions[snapshot.fieldDetour.direction.arrow];
        for (const key of held) await page.keyboard.down(key);
      }
      await page.waitForTimeout(180);
    }
  } finally {
    for (const key of held) await page.keyboard.up(key);
  }
  expect(snapshot.itemPickups.overload).toBe(1);
  expect(snapshot.overloadTimer).toBeGreaterThan(6);
  await expect(page.getByLabel('선택 우회 보상')).toHaveCount(0);
  await expect(page.locator('.hudAlert-pickup')).toContainText('과부하');
  await guards.assertClean();
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
    () => {
      const contact = window.__RUNE_DRIFT_QA__.metrics()?.contact;
      return contact?.windups === 1 && contact.maxWindupProgress >= 0.45;
    },
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

test('enemy contact telegraph closes toward the reach ring as impact approaches', () => {
  const early = getEnemyContactTelegraphState({ contactAttackMax: 1, contactAttackTimer: 0.9 });
  const late = getEnemyContactTelegraphState({ contactAttackMax: 1, contactAttackTimer: 0.1 });
  expect(late.progress).toBeGreaterThan(early.progress);
  expect(late.urgency).toBeGreaterThan(early.urgency);
  expect(late.countdownScale).toBeGreaterThan(early.countdownScale);
  expect(late.countdownScale).toBeLessThanOrEqual(1);
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
  await expect(page.locator('.coachTouchAction')).toBeVisible();
  await expect(page.locator('.coachKeyboardAction')).toBeHidden();
  await expect(page.locator('.hudCoachCard p')).toBeVisible();
  await expect(page.locator('.hudActions')).toBeVisible();
  await expect(page.locator('.touchControls')).toBeVisible();
  await expect(page.locator('.touchStick')).not.toHaveAttribute('tabindex');
  await expect(page.locator('.touchStick')).toHaveAttribute('role', 'group');

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

  const dashButton = page.locator('.touchDashButton');
  await dashButton.dispatchEvent('pointerdown', { pointerId: 2 });
  await expect(dashButton).toHaveClass(/isPressed/);
  await page.waitForTimeout(100);
  const afterDash = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics().player);
  expect(afterDash.dashCooldown, 'mobile dash cooldown').toBeGreaterThan(0);
  await dashButton.dispatchEvent('pointerup', { pointerId: 2 });
  await expect(dashButton).not.toHaveClass(/isPressed/);
  await dashButton.focus();
  await page.keyboard.down('Enter');
  await expect(dashButton).toHaveClass(/isPressed/);
  await page.keyboard.up('Enter');
  await expect(dashButton).not.toHaveClass(/isPressed/);

  await page.evaluate(() => window.__RUNE_DRIFT_QA__.contactAttack());
  const navigationBeforeHit = await page.locator('.hudRunPocket').boundingBox();
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
  expect(mobileHitBox.x).toBeGreaterThanOrEqual(mobileVitalsBox.x);
  expect(mobileHitBox.x + mobileHitBox.width).toBeLessThanOrEqual(mobileVitalsBox.x + mobileVitalsBox.width);
  expect(mobileHitBox.y).toBeGreaterThanOrEqual(mobileVitalsBox.y);
  expect(mobileHitBox.y + mobileHitBox.height).toBeLessThanOrEqual(mobileVitalsBox.y + mobileVitalsBox.height);
  await expect(page.locator('.runeMeter-hp')).toBeVisible();
  const navigationDuringHit = await page.locator('.hudRunPocket').boundingBox();
  expect(navigationDuringHit.y).toBe(navigationBeforeHit.y);
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

test('compact 320px HUD keeps timer and controls inside the viewport', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true
  });
  const page = await context.newPage();
  const guards = await openGuardedPage(page, '/?quality=low');
  const layout = await page.evaluate(() => {
    const bounds = selector => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } : null;
    };
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      clock: bounds('.hudRunPocket'),
      actions: bounds('.hudActions'),
      stick: bounds('.touchStick'),
      dash: bounds('.touchDashButton')
    };
  });

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  for (const bounds of [layout.clock, layout.actions, layout.stick, layout.dash]) {
    expect(bounds).not.toBeNull();
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(layout.viewportWidth);
  }
  expect(layout.clock.top).toBeGreaterThanOrEqual(layout.actions.bottom);
  await expect(page.locator('.runeCircuitDestination small')).toBeVisible();
  await expect(page.locator('.runeSealTrack li')).toHaveCount(4);
  await expect(page.locator('.runeSealTrack [aria-current="step"]')).toHaveAttribute('aria-label', '무기 봉인: 다음 목표');
  for (const button of await page.locator('.hudActions button').all()) {
    const bounds = await button.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  await capture(page, 'qa-smoke-compact-mobile');

  await page.evaluate(() => window.__RUNE_DRIFT_QA__.boss({ enraged: true }));
  await expect(page.locator('.hudBoss')).toBeVisible();
  await page.waitForTimeout(320);
  const bossLayout = await page.evaluate(() => {
    const rect = selector => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect();
      return bounds ? { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom } : null;
    };
    return {
      boss: rect('.hudBoss'),
      vitals: rect('.hudVitalsPocket'),
      viewportHeight: window.innerHeight
    };
  });
  expect(bossLayout.boss.left).toBeGreaterThanOrEqual(0);
  expect(bossLayout.boss.right).toBeLessThanOrEqual(320);
  expect(bossLayout.boss.top).toBeGreaterThanOrEqual(bossLayout.vitals.bottom);
  expect(bossLayout.boss.bottom).toBeLessThanOrEqual(bossLayout.viewportHeight * 0.64);
  await expect(page.locator('.hudAlertStack')).toHaveCount(0);
  await capture(page, 'qa-smoke-compact-mobile-boss');
  guards.assertClean();
  await context.close();
});

for (const [width, height, inset] of [[568, 320, 10], [667, 375, 44]]) {
  test(`compact landscape HUD preserves actions and navigation at ${width}x${height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const guards = await openGuardedPage(page, '/?qa=circuit&quality=balanced');
    if (inset > 10) await page.addStyleTag({ content: `.runeHud { padding-left: ${inset}px; padding-right: ${inset}px; } .runeDirective { left: ${inset}px; } .touchControls { padding-left: ${inset}px; padding-right: ${inset}px; }` });
    for (const element of await page.locator('.hudActions button, .runeVitals, .runeRunClock').all()) {
      const box = await element.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(inset);
      expect(box.x + box.width).toBeLessThanOrEqual(width - inset);
    }
    const coach = await page.locator('.hudCoachCard').boundingBox();
    const clock = await page.locator('.runeRunClock').boundingBox();
    const stick = await page.locator('.touchStick').boundingBox();
    expect(coach.y).toBeGreaterThanOrEqual(clock.y + clock.height);
    expect(coach.y + coach.height).toBeLessThanOrEqual(stick.y);
    await expect(page.locator('.runeCircuitDestination small')).toBeVisible();
    await expect(page.getByRole('img', { name: '동쪽 방향' })).toBeVisible();
    await capture(page, `qa-compact-landscape-${width}x${height}`);
    guards.assertClean();
    await context.close();
  });
}

for (const [width, height] of [[320, 568], [568, 320], [1440, 900]]) {
  test(`low-health feedback preserves the health gauge at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const guards = await openGuardedPage(page, `/?quality=${runtimeQuality}`);
    await page.evaluate(() => window.__RUNE_DRIFT_QA__.contactAttack({ hp: 40 }));
    await expect(page.locator('.hudAlert-damage')).toContainText('즉시 회피');
    const bounds = await page.evaluate(() => {
      const rect = selector => {
        const box = document.querySelector(selector).getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      };
      return { hit: rect('.hudAlert-damage'), hp: rect('.runeMeter-hp'), vitals: rect('.runeVitals'), snapshot: window.__RUNE_DRIFT_QA__.snapshot() };
    });
    expect(bounds.snapshot.hp / bounds.snapshot.maxHp).toBeLessThanOrEqual(0.34);
    expect(bounds.hit.top).toBeGreaterThanOrEqual(bounds.hp.bottom);
    expect(bounds.hit.bottom).toBeLessThanOrEqual(bounds.vitals.bottom);
    expect(bounds.hit.left).toBeGreaterThanOrEqual(bounds.vitals.left);
    expect(bounds.hit.right).toBeLessThanOrEqual(bounds.vitals.right);
    await capture(page, `qa-low-health-${width}x${height}`);
    guards.assertClean();
  });
}

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
  const upgradeDialog = page.getByRole('dialog');
  await expect(upgradeDialog).toBeVisible();
  await expect(page.locator('.rewardCard').first()).toBeFocused();
  await expect(upgradeDialog.getByRole('heading', { level: 1 })).not.toBeEmpty();
  await expect(page.locator('.rewardCard')).toHaveCount(3);
  await expect(page.locator('.rewardCardBadge')).toHaveCount(3);
  await expect(page.locator('.upgradeIconSprite')).toHaveCount(3);
  await expect(page.locator('.upgradePickCta')).toHaveCount(3);
  await expect(page.locator('.runeChoiceIndex')).toHaveCount(0);
  await capture(page, 'qa-smoke-upgrade');
  await page.keyboard.press('1');
  await expect(page.locator('.rewardCard')).toHaveCount(0);
  guards.assertClean();
});

test('opening draft explains a weapon choice and applies it on keyboard selection', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=starter-upgrade&quality=balanced');
  await expect(page.locator('.isOpeningDraft')).toBeVisible();
  await expect(page.locator('.rewardCard.isRecommended')).toHaveCount(1);
  await expect(page.locator('.rewardCard.isRecommended .rewardCardBadge')).toHaveText('추천');
  await expect(page.locator('.upgradePauseNote')).toHaveText('전투 일시정지');
  const card = page.locator('.rewardCard.family-orb');
  await expect(card).toHaveCount(1);
  const title = await card.locator('.rewardCardCopy strong').innerText();
  const choice = upgradePool.find(upgrade => upgrade.title === title);
  expect(choice).toBeDefined();
  await expect(card.locator('.openingUpgradeReason')).toBeVisible();
  const before = await page.evaluate(() => window.__RUNE_DRIFT_QA__.snapshot());
  await card.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(card).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const after = await page.evaluate(() => window.__RUNE_DRIFT_QA__.snapshot());
  expect(after.upgrades).toEqual([...before.upgrades, choice.id]);
  expect(after.buildFocus.orb).toBe(before.buildFocus.orb + 1);
  guards.assertClean();
});

for (const [width, height] of [[320, 568], [360, 740], [768, 1024], [1024, 768], [740, 360]]) {
  test(`first-seal guidance and choices fit ${width}x${height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: width < 800 });
    const page = await context.newPage();
    const guards = await openGuardedPage(page, '/?qa=circuit&quality=balanced');
    await page.waitForFunction(() => window.__RUNE_DRIFT_QA__?.metrics?.()?.frameStats?.samples > 12);
    const coach = page.locator('.hudCoachCard');
    await expect(coach).toHaveAttribute('data-step', 'circuit');
    await expect(coach.locator('.coachKeyboardDetail')).toBeHidden();
    if (width > 760) await expect(coach.locator('.coachTouchDetail')).toBeVisible();
    const coachBox = await coach.boundingBox();
    if (width < height && height <= 640) expect(coachBox.y).toBeGreaterThanOrEqual(height * 0.56);
    const destination = page.locator('.runeCircuitDestination');
    await expect(destination.locator('small')).toBeVisible();
    await expect(destination.locator('strong')).toHaveText('무기 봉인');
    expect(await destination.locator('small').evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(11);
    expect(coachBox.x).toBeGreaterThanOrEqual(0);
    expect(coachBox.x + coachBox.width).toBeLessThanOrEqual(width);
    expect(coachBox.y).toBeGreaterThanOrEqual(0);
    expect(coachBox.y + coachBox.height).toBeLessThanOrEqual(height);
    for (const selector of ['.hudVitalsPocket', '.hudRunPocket', '.hudAlertStack', '.touchStick', '.touchDashButton']) {
      const element = page.locator(selector);
      if (!await element.isVisible()) continue;
      const bounds = await element.boundingBox();
      const overlap = coachBox.x < bounds.x + bounds.width && coachBox.x + coachBox.width > bounds.x
        && coachBox.y < bounds.y + bounds.height && coachBox.y + coachBox.height > bounds.y;
      expect(overlap, `${selector} must not overlap opening guidance`).toBe(false);
    }
    await capture(page, `qa-first-seal-${width}x${height}`);
    guards.assertClean();
    const draftGuards = await openGuardedPage(page, '/?qa=starter-upgrade&quality=balanced');
    await expect(page.locator('.isOpeningDraft')).toBeVisible();
    await expect(page.locator('#upgrade-heading')).toBeInViewport({ ratio: 1 });
    const cards = page.locator('.rewardCard');
    await expect(cards).toHaveCount(3);
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      const bounds = await card.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      const reason = card.locator('.openingUpgradeReason');
      await expect(reason).toBeVisible();
      await expect(reason).not.toBeEmpty();
      expect(await reason.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(12);
      await expect(card.locator('.rewardCardCopy p')).toBeVisible();
      expect(await card.locator('.rewardCardCopy p').evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(12);
      await expect(card.locator('.upgradePickCta')).toBeInViewport();
    }
    await page.locator('.rewardLayer').evaluate(node => { node.scrollTop = 0; });
    await capture(page, `qa-opening-draft-${width}x${height}`);
    draftGuards.assertClean();
    await context.close();
  });
}

test('mobile upgrade cards stack inside the safe viewport', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true
  });
  const page = await context.newPage();
  const guards = await openGuardedPage(page, '/?qa=starter-upgrade&quality=low');
  const upgradeDialog = page.getByRole('dialog');
  await expect(upgradeDialog).toBeVisible();
  await expect(page.locator('.rewardCard')).toHaveCount(3);

  const layout = await page.evaluate(() => {
    const card = document.querySelector('.rewardCard');
    const bounds = card?.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      cardLeft: bounds?.left ?? -1,
      cardRight: bounds?.right ?? window.innerWidth + 1
    };
  });
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.cardLeft).toBeGreaterThanOrEqual(0);
  expect(layout.cardRight).toBeLessThanOrEqual(layout.viewportWidth);
  await capture(page, 'qa-smoke-mobile-upgrade');
  guards.assertClean();
  await context.close();
});

test('boss HUD smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?quality=balanced');
  await page.waitForFunction(() => Boolean(window.__RUNE_DRIFT_QA__));
  await page.evaluate(() => window.__RUNE_DRIFT_QA__.boss({ enraged: true }));
  await expect(page.locator('.hudBoss')).toBeVisible();
  await expect(page.locator('.hudEncounter')).toHaveCount(0);
  await expect(page.locator('.hudObjectiveDock')).toHaveCount(0);
  await expect(page.locator('.hudBoss')).toContainText('BOSS');
  await expect(page.getByRole('region', { name: /균열 감시자/ })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: '보스 체력' })).toBeVisible();
  await expect(page.locator('.runeBossVitalMeta')).toContainText('40%');
  await expect(page.locator('.runeBossPattern.isCasting .runeUiIcon')).toBeVisible();
  await expect(page.locator('.hudAlert-crisis')).toHaveCount(0);
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
  await expect(page.getByRole('button', { name: /경로로 재도전/ })).toBeFocused();
  await capture(page, 'qa-smoke-result');
  const replayButton = page.getByRole('button', { name: /경로로 재도전/ });
  await replayButton.scrollIntoViewIfNeeded();
  await replayButton.click({ timeout: runtimeTimeout(10_000, 40_000) });
  await expect(page.locator('.hudAlert')).toContainText('궤도 칼날 경로 예약');
  await expect(page.locator('.hudCoachCard')).toHaveCount(0);
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
  // Separate shader/upload startup from steady rendering, rather than repeatedly
  // repopulating the world on timers (which used to discard startup samples).
  await page.waitForFunction(() => window.__RUNE_DRIFT_QA__.metrics().frameStats.samples >= 10);
  const startup = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics().frameStats);
  await test.info().attach('stress-startup-frames', { body: JSON.stringify(startup), contentType: 'application/json' });
  await page.evaluate(() => window.__RUNE_DRIFT_QA__.beginFrameSample());
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
  await expect(page.locator('.hudAlert-crisis')).toHaveCount(0);
  await expect(page.locator('.hudAlertStack')).toHaveCount(0);

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
