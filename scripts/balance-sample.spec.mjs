import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const DEFAULT_SAMPLE_SEED = 0x5eed2026;
const SAMPLE_SECONDS = Math.min(300, Math.max(10, Number(process.env.RUNE_BALANCE_SECONDS) || 300));
const SAMPLE_SEED = Number(process.env.RUNE_BALANCE_SEED) || DEFAULT_SAMPLE_SEED;
const ROUTE_FILTER = process.env.RUNE_BALANCE_ROUTE;
const artifactDir = path.resolve('output/playwright');

const ROUTES = [
  { id: 'storm-chain', label: '폭풍 + 번개', openingFamily: 'storm', families: ['storm', 'chain'], damageSources: ['storm', 'lightning'] },
  { id: 'blade-nova', label: '칼날 + 태양', openingFamily: 'blade', families: ['blade', 'nova'], damageSources: ['blade', 'nova'], aggressive: true },
  { id: 'orb-pierce', label: '구체 관통', openingFamily: 'orb', families: ['orb'], damageSources: ['orb'] }
];
const ACTIVE_ROUTES = ROUTE_FILTER ? ROUTES.filter(route => route.id === ROUTE_FILTER) : ROUTES;

const DIRECTION_KEYS = {
  '↑': ['KeyW'],
  '↗': ['KeyW', 'KeyD'],
  '→': ['KeyD'],
  '↘': ['KeyS', 'KeyD'],
  '↓': ['KeyS'],
  '↙': ['KeyS', 'KeyA'],
  '←': ['KeyA'],
  '↖': ['KeyW', 'KeyA']
};

function createSeedScript(seed) {
  let state = seed >>> 0;
  Math.random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
  };
}

async function releaseMovement(page, activeKeys) {
  await Promise.all([...activeKeys].map(key => page.keyboard.up(key)));
  activeKeys.clear();
}

async function setMovement(page, activeKeys, nextKeys) {
  const next = new Set(nextKeys);
  await Promise.all([...activeKeys].filter(key => !next.has(key)).map(key => page.keyboard.up(key)));
  await Promise.all([...next].filter(key => !activeKeys.has(key)).map(key => page.keyboard.down(key)));
  activeKeys.clear();
  next.forEach(key => activeKeys.add(key));
}

function getTargetFamilies(snapshot, route) {
  return route.families
    .map(family => ({ family, focus: snapshot.buildFocus[family] ?? 0 }))
    .sort((a, b) => a.focus - b.focus)
    .map(entry => entry.family);
}

async function chooseUpgrade(page, snapshot, route, selections) {
  let card = null;
  for (const family of getTargetFamilies(snapshot, route)) {
    const candidate = page.locator(`.rewardCard.family-${family}`).first();
    if (await candidate.count() === 0) continue;
    card = candidate;
    break;
  }
  card ??= page.locator('.rewardCard.isRecommended').first();
  if (await card.count() === 0) card = page.locator('.rewardCard').first();
  if (await card.count() === 0) return false;
  selections.push((await card.getAttribute('aria-label')) ?? 'unknown');
  await card.click();
  return true;
}

function getKiteKeys(step) {
  const pattern = [['KeyW', 'KeyD'], ['KeyS', 'KeyD'], ['KeyS', 'KeyA'], ['KeyW', 'KeyA']];
  return pattern[Math.floor(step / 10) % pattern.length];
}

function getPointDirectionKeys(player, target, invert = false) {
  if (!target) return [];
  const direction = invert ? -1 : 1;
  const dx = (target.x - player.x) * direction;
  const dz = (target.z - player.z) * direction;
  const keys = [];
  if (Math.abs(dz) > 0.7) keys.push(dz > 0 ? 'KeyS' : 'KeyW');
  if (Math.abs(dx) > 0.7) keys.push(dx > 0 ? 'KeyD' : 'KeyA');
  return keys;
}

function summarizeDamage(snapshot) {
  const entries = Object.entries(snapshot.runStats.damageBySource)
    .filter(([, damage]) => damage > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, damage]) => sum + damage, 0);
  return entries.map(([source, damage]) => ({
    source,
    damage: Math.round(damage),
    sharePercent: total > 0 ? Math.round(damage / total * 100) : 0
  }));
}

async function runBalanceRoute(browser, route) {
  const context = await browser.newContext({ viewport: { width: 960, height: 600 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.addInitScript(createSeedScript, SAMPLE_SEED);
  await page.goto('/?quality=low', { waitUntil: 'domcontentloaded' });
  await page.locator('.loadingLayer').waitFor({ state: 'hidden', timeout: 20_000 });
  await page.waitForFunction(() => Boolean(window.__RUNE_DRIFT_QA__?.snapshot));
  await page.evaluate(openingFamily => {
    window.__RUNE_DRIFT_QA__.reset({ replayRouteFamily: openingFamily });
  }, route.openingFamily);

  const activeKeys = new Set();
  const selections = [];
  let snapshot = await page.evaluate(() => window.__RUNE_DRIFT_QA__.snapshot());
  let runtime = await page.evaluate(() => window.__RUNE_DRIFT_QA__.metrics());
  let step = 0;
  let lastDashAt = -10;
  let lastProgressAt = -30;

  while (snapshot.phase !== 'ended' && snapshot.time < SAMPLE_SECONDS) {
    if (snapshot.phase === 'upgrade') {
      await releaseMovement(page, activeKeys);
      if (!await chooseUpgrade(page, snapshot, route, selections)) break;
      await page.waitForTimeout(160);
    } else {
      const circuit = snapshot.circuit;
      const shouldChannel = circuit.ready && circuit.distance <= 4;
      const canFightClose = route.aggressive
        && runtime.nearestEnemy
        && snapshot.buildFocus.blade > 0
        && (
          circuit.complete
          || (!circuit.ready && circuit.distance <= 10 && runtime.nearestEnemy.distance <= 14)
        );
      const bladeOrbit = snapshot.weaponRanges?.bladeOrbit ?? 3;
      const keys = shouldChannel
        ? []
        : canFightClose
          ? runtime.nearestEnemy.distance > bladeOrbit + 0.55
            ? getPointDirectionKeys(runtime.player, runtime.nearestEnemy)
            : runtime.nearestEnemy.distance < bladeOrbit - 0.55
              ? getPointDirectionKeys(runtime.player, runtime.nearestEnemy, true)
              : getKiteKeys(step)
          : circuit.complete
            ? getKiteKeys(step)
            : DIRECTION_KEYS[circuit.direction] ?? getKiteKeys(step);
      await setMovement(page, activeKeys, keys);
      if (snapshot.time - lastDashAt >= 2.8 && keys.length > 0) {
        await page.keyboard.press('Space');
        lastDashAt = snapshot.time;
      }
      await page.waitForTimeout(260);
    }

    ({ snapshot, runtime } = await page.evaluate(() => ({
      snapshot: window.__RUNE_DRIFT_QA__.snapshot(),
      runtime: window.__RUNE_DRIFT_QA__.metrics()
    })));
    if (snapshot.time - lastProgressAt >= 30) {
      lastProgressAt = snapshot.time;
      console.log(`[balance:${route.id}] ${Math.floor(snapshot.time)}s · Lv${snapshot.level} · ${snapshot.kills} KOs · circuit ${snapshot.shrineActivations}/4 · HP ${Math.ceil(snapshot.hp)}`);
    }
    step += 1;
  }

  await releaseMovement(page, activeKeys);
  await page.screenshot({ path: path.join(artifactDir, `balance-${route.id}.png`), fullPage: true });
  await context.close();

  return {
    route: route.id,
    label: route.label,
    seed: SAMPLE_SEED,
    sampleTargetSeconds: SAMPLE_SECONDS,
    ...snapshot,
    totalDps: snapshot.time > 0 ? Number((snapshot.runStats.totalDamage / snapshot.time).toFixed(1)) : 0,
    damageTaken: Math.round(snapshot.runStats.damageTaken),
    damageTakenByPhase: snapshot.runStats.damageTakenByPhase,
    healingReceived: Math.round(snapshot.runStats.healingReceived),
    healingByPhase: snapshot.runStats.healingByPhase,
    damageByPhase: snapshot.runStats.damageByPhase,
    damageRanking: summarizeDamage(snapshot),
    selections,
    routeDamageSharePercent: Math.round(
      route.damageSources.reduce((total, source) => total + (snapshot.runStats.damageBySource[source] ?? 0), 0)
      / Math.max(1, snapshot.runStats.totalDamage) * 100
    ),
    frameStats: runtime.frameStats
  };
}

test('sample three guided build routes on the live game loop', async ({ browser }) => {
  await mkdir(artifactDir, { recursive: true });
  expect(ACTIVE_ROUTES.length, `known balance route: ${ROUTE_FILTER}`).toBeGreaterThan(0);
  const samples = await Promise.all(ACTIVE_ROUTES.map(route => runBalanceRoute(browser, route)));
  const suffixParts = [];
  if (ROUTE_FILTER || SAMPLE_SECONDS !== 300) {
    suffixParts.push(ROUTE_FILTER ?? 'all', `${SAMPLE_SECONDS}s`);
  }
  if (SAMPLE_SEED !== DEFAULT_SAMPLE_SEED) suffixParts.push(`seed-${SAMPLE_SEED}`);
  const outputSuffix = suffixParts.length > 0 ? `-${suffixParts.join('-')}` : '';
  const sampleOutputPath = path.join(artifactDir, `balance-samples${outputSuffix}.json`);
  await writeFile(sampleOutputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), samples }, null, 2)}\n`);

  expect(samples).toHaveLength(ACTIVE_ROUTES.length);
  samples.forEach(sample => {
    expect(sample.time).toBeGreaterThan(0);
    expect(sample.runStats.totalDamage).toBeGreaterThan(0);
  });

  console.log(`Balance samples written to ${sampleOutputPath}`);
  console.log(JSON.stringify(samples.map(sample => ({
    route: sample.route,
    result: sample.result ?? 'in-progress',
    time: sample.time,
    level: sample.level,
    kills: sample.kills,
    circuit: `${sample.shrineActivations}/4`,
    hp: `${Math.ceil(sample.hp)}/${sample.maxHp}`,
    damageTaken: sample.damageTaken,
    healingReceived: sample.healingReceived,
    totalDps: sample.totalDps,
    routeDamageSharePercent: sample.routeDamageSharePercent,
    topDamage: sample.damageRanking[0]
  })), null, 2));
});
