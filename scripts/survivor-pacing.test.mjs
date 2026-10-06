import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startGame, updateGame, chooseUpgrade, spawnEnemy, pauseGame, resumeGame } from '../src/survivor/game.js';
import { combatPacing, spawnPlan, PACING } from '../src/survivor/pacing.js';

test('pacing covers every boundary and keeps the four-minute boss supply unchanged', () => {
  const g = createGame(42);
  for (const beat of PACING) {
    g.time = beat.until - .001;
    assert.equal(combatPacing(g).kind, beat.kind);
    assert.ok(combatPacing(g).remaining > 0);
    g.time = beat.until;
    assert.ok(combatPacing(g).remaining >= 0);
    assert.ok(spawnPlan(g).interval > 0);
  }
  for (const time of [240, 250, 300]) {
    g.time = time; g.evolutionBreatherUntil = 999;
    assert.equal(combatPacing(g).kind, 'boss');
    assert.deepEqual(spawnPlan(g), { interval: 1.6, count: 1 });
  }
});

test('real spawns ebb after a surge while living enemies and XP keep their value', () => {
  const samples = [];
  for (const time of [120, 132]) {
    const g = createGame(42); startGame(g); g.time = time; g.nextElite = 999;
    g.ranks.sword = 0; g.player.invincible = 999; g.xpNeed = 99999;
    const survivor = spawnEnemy(g, 2, false, { x: 500, y: 0 });
    const hp = survivor.hp, xp = survivor.xp;
    for (let i = 0; i < 600; i++) updateGame(g, 1 / 60);
    assert.ok(g.enemies.includes(survivor));
    assert.equal(survivor.hp, hp); assert.equal(survivor.xp, xp);
    samples.push(g.enemies.length - 1);
  }
  assert.ok(samples[0] > samples[1] * 1.7, `surge ${samples[0]}, rest ${samples[1]}`);
  assert.ok(samples[1] > 0, 'rest still has ordinary reinforcements');
});

test('all real evolution choices grant eight simulation seconds, freeze on pause and reset', () => {
  for (const key of ['dawn', 'comet', 'lunar']) {
    const g = createGame(42); g.phase = 'upgrade'; g.time = 100; g.choices = [key];
    assert.ok(chooseUpgrade(g, key));
    assert.equal(combatPacing(g).kind, 'evolution');
    assert.equal(combatPacing(g).remaining, 8);
    const interval = spawnPlan(g).interval;
    pauseGame(g); updateGame(g, 1 / 30);
    assert.equal(combatPacing(g).remaining, 8);
    resumeGame(g); updateGame(g, 1 / 30);
    assert.ok(combatPacing(g).remaining < 8);
    g.time = 108;
    assert.equal(combatPacing(g).kind, 'build');
    assert.ok(spawnPlan(g).interval < interval);
    assert.equal(createGame(42).evolutionBreatherUntil, 0);
  }
});

test('ordinary upgrades do not grant relief and chained evolutions do not stack duration', () => {
  const g = createGame(42); g.phase = 'upgrade'; g.choices = ['sword'];
  chooseUpgrade(g, 'sword'); assert.equal(g.evolutionBreatherUntil, 0);
  for (const key of ['dawn', 'comet']) {
    g.phase = 'upgrade'; g.time = 100; g.choices = [key]; chooseUpgrade(g, key);
    assert.equal(g.evolutionBreatherUntil, 108);
  }
  g.phase = 'upgrade'; g.time = 238; g.choices = ['lunar']; chooseUpgrade(g, 'lunar');
  assert.equal(combatPacing(g).remaining, 2);
  g.time = 239.99; g.player.invincible = 999;
  updateGame(g, 1 / 30);
  assert.ok(g.bossSpawned); assert.equal(combatPacing(g).kind, 'boss');
});

test('relief never postpones a scheduled elite and frozen choice screens consume no time', () => {
  const g = createGame(42); startGame(g); g.time = 59.99; g.evolutionBreatherUntil = 67;
  updateGame(g, 1 / 30);
  assert.equal(g.enemies.filter(e => e.elite).length, 1);
  for (const phase of ['upgrade', 'relic', 'event', 'paused', 'ended']) {
    g.phase = phase; const time = g.time, remaining = combatPacing(g).remaining;
    updateGame(g, 1 / 30);
    assert.equal(g.time, time); assert.equal(combatPacing(g).remaining, remaining);
  }
});
