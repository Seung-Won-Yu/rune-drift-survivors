import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const artifactDir = path.resolve('output/playwright');

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
    fullPage: true
  });
}

async function openGuardedPage(page, route) {
  const guards = await attachPageGuards(page);
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  return guards;
}

test('HUD smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?quality=balanced');
  await expect(page.locator('.hudCompact')).toBeVisible();
  await expect(page.locator('.hudMeter')).toHaveCount(2);
  await expect(page.locator('.iconButton')).toHaveCount(2);
  await capture(page, 'qa-smoke-hud');
  guards.assertClean();
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
  await expect(page.locator('.hudBoss')).toContainText('Boss');
  await capture(page, 'qa-smoke-boss');
  guards.assertClean();
});

test('result overlay smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=victory&quality=balanced');
  await expect(page.locator('.endPanel')).toBeVisible();
  await expect(page.locator('.endPanel')).toContainText('5분 생존');
  await capture(page, 'qa-smoke-result');
  guards.assertClean();
});

test('stress budget smoke', async ({ page }) => {
  const guards = await openGuardedPage(page, '/?qa=stress&quality=balanced');
  await page.waitForFunction(() => window.__RUNE_DRIFT_QA__?.metrics?.()?.frameStats?.samples > 180);
  await page.waitForTimeout(6_000);
  const metrics = await page.evaluate(() => window.__RUNE_DRIFT_QA__?.metrics?.());
  expect(metrics?.frameStats?.avgFps, 'average FPS').toBeGreaterThanOrEqual(55);
  expect(metrics?.frameStats?.severeFrames, 'severe frames').toBe(0);
  expect(metrics?.counts?.enemies, 'stress enemy count').toBeGreaterThan(20);
  await capture(page, 'qa-smoke-stress');
  guards.assertClean();
});
