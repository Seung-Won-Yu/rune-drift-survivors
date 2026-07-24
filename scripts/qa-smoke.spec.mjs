import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

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

test('HUD smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?quality=balanced');
  await expect(page.locator('.hudCompact')).toBeVisible();
  await expect(page.locator('.hudMeter')).toHaveCount(2);
  await expect(page.locator('.iconButton')).toHaveCount(2);
  await capture(page, 'qa-smoke-hud');
  guards.assertClean();
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
  await page.locator('.pausePanel').getByRole('button', { name: '계속하기' }).click();
  await expect(page.locator('.pausePanel')).toBeHidden();
  await capture(page, 'qa-smoke-mobile');
  guards.assertClean();
  await context.close();
});

test('upgrade reward smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=upgrade&quality=balanced');
  await expect(page.locator('.rewardCard')).toHaveCount(3);
  await expect(page.locator('.rewardCardBadge')).toHaveCount(3);
  await expect(page.locator('.upgradePickCta')).toHaveCount(3);
  await capture(page, 'qa-smoke-upgrade');
  guards.assertClean();
});

test('boss HUD smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?quality=balanced');
  await page.waitForFunction(() => Boolean(window.__RUNE_DRIFT_QA__));
  await page.evaluate(() => window.__RUNE_DRIFT_QA__.boss({ enraged: true }));
  await expect(page.locator('.hudBoss')).toBeVisible();
  await expect(page.locator('.hudBoss')).toContainText('BOSS');
  await capture(page, 'qa-smoke-boss');
  guards.assertClean();
});

test('result overlay smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=victory&quality=balanced');
  await expect(page.locator('.endPanel')).toBeVisible();
  await expect(page.locator('.endPanel')).toContainText('5분 생존');
  await expect(page.locator('.resultHighlights em')).toHaveCount(3);
  await expect(page.locator('.resultHighlights b')).toHaveCount(3);
  await expect(page.locator('.resultHighlights small')).toHaveCount(3);
  await capture(page, 'qa-smoke-result');
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
