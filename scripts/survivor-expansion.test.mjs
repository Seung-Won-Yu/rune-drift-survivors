import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startGame, stats, spawnEnemy, updateGame, chooseUpgrade, draftUpgrades } from '../src/survivor/game.js';
import { SPECIALIZATIONS, RELICS } from '../src/survivor/expansion.js';
const playing = () => {
  const g = createGame(42);
  startGame(g);
  g.spawnClock = 999;
  g.xpNeed = 99999;
  g.swordClock = 999;
  return g;
};
const frames = (g, n, input) => {
  for (let i = 0; i < n; i++) updateGame(g, 1 / 60, input);
};
const enemy = (g, x, y = 0) => {
  const e = spawnEnemy(g, 2, false, {
    x,
    y
  });
  e.speed = 0;
  e.hp = e.maxHp = 1000;
  return e;
};
test('all three weapons offer mutually exclusive specializations after rank three', () => {
  for (const weapon of ['sword', 'ember', 'orbit']) {
    const g = playing();
    g.level = 4;
    g.ranks[weapon] = 3;
    const keys = Object.keys(SPECIALIZATIONS).filter(k => SPECIALIZATIONS[k].weapon === weapon);
    g.phase = 'upgrade';
    g.choices = draftUpgrades(g);
    assert.ok(keys.every(k => g.choices.includes(k)));
    assert.ok(chooseUpgrade(g, keys[0]));
    g.phase = 'upgrade';
    g.choices = [keys[1]];
    assert.equal(chooseUpgrade(g, keys[1]), false);
    assert.ok(!draftUpgrades(g).some(k => keys.includes(k)));
  }
});
test('sword branches trade actual side coverage for concentrated damage', () => {
  const hits = {};
  for (const key of ['sweep', 'duelist']) {
    const g = playing();
    g.ranks.sword = 3;
    g.ranks[key] = 1;
    g.swordClock = 0;
    const front = enemy(g, 75),
      side = enemy(g, 0, 100);
    frames(g, 15);
    hits[key] = {
      front: 1000 - front.hp,
      side: 1000 - side.hp
    };
  }
  assert.ok(hits.sweep.side > 0);
  assert.equal(hits.duelist.side, 0);
  assert.ok(hits.duelist.front > hits.sweep.front);
});
test('orbit branches alter real attack reach and bulwark reduces received damage', () => {
  const a = playing(),
    b = playing();
  for (const g of [a, b]) g.ranks.orbit = 3;
  a.ranks.bulwark = 1;
  b.ranks.horizon = 1;
  assert.equal(stats(a).orbitRadius, 46);
  assert.ok(stats(b).orbitRadius > 120);
  const farA = enemy(a, 122),
    farB = enemy(b, 122);
  frames(a, 1);
  frames(b, 1);
  assert.equal(farA.hp, 1000);
  assert.ok(farB.hp < 1000);
  const e = enemy(a, 0);
  e.damage = 20;
  frames(a, 1);
  assert.equal(a.player.hp, 83);
});
test('wildfire causes timed damage and spreads on death without instant chain damage', () => {
  const g = playing();
  g.ranks.wildfire = 1;
  const a = enemy(g, 150),
    b = enemy(g, 150, 70);
  g.shots.push({
    x: 150,
    y: 0,
    vx: 0,
    vy: 0,
    life: 1,
    damage: 1
  });
  frames(g, 1);
  assert.ok(a.burn);
  assert.equal(b.burn, undefined);
  a.hp = 5;
  frames(g, 31);
  assert.equal(a.hp, -1);
  assert.ok(b.burn);
  assert.equal(b.hp, 1000);
  frames(g, 31);
  assert.ok(b.hp < 1000);
});
test('detonation emits a slower volley with a real wider blast', () => {
  const g = playing();
  g.ranks.ember = 3;
  g.ranks.detonation = 1;
  g.emberClock = 0;
  enemy(g, 180);
  frames(g, 1);
  assert.equal(g.emberClock, 1.25);
  assert.equal(g.shots[0].blastRadius, 72);
  assert.equal(g.shots[0].blast, true);
});
test('coal ignites and increases wildfire damage; fang changes actual elite damage', () => {
  for (const wildfire of [0, 1]) {
    const g = playing();
    g.relics = ['coal'];
    g.ranks.wildfire = wildfire;
    const e = enemy(g, 150);
    g.shots.push({
      x: 150,
      y: 0,
      vx: 0,
      vy: 0,
      life: 1,
      damage: 1
    });
    frames(g, 1);
    assert.equal(e.burn.damage, wildfire ? 18 : 8);
  }
  const damage = [];
  for (const elite of [false, true]) {
    const g = playing();
    g.relics = ['fang'];
    g.swordClock = 0;
    const e = enemy(g, 70);
    e.elite = elite;
    e.attackClock = 999;
    frames(g, 15);
    damage.push(1000 - e.hp);
  }
  assert.ok(damage[1] > damage[0] * 1.5);
});
test('bell slows an orbit target; sail speeds cooldown only while moving', () => {
  const g = playing();
  g.ranks.orbit = 1;
  g.relics = ['bell'];
  const e = enemy(g, 60);
  frames(g, 1);
  assert.ok(e.slowUntil > g.time);
  const a = playing(),
    b = playing();
  for (const game of [a, b]) {
    game.ranks.ember = 1;
    game.relics = ['sail'];
    game.emberClock = 10;
  }
  frames(a, 60);
  frames(b, 60, {
    x: 1,
    y: 0
  });
  assert.ok(b.emberClock < a.emberClock - .3);
});
test('dew consumes XP thresholds once, including at full health', () => {
  const g = playing();
  g.relics = ['dew'];
  g.gems.push({
    x: 0,
    y: 0,
    value: 35,
    age: 0
  });
  frames(g, 1);
  assert.equal(g.dewXp, 5);
  assert.equal(g.healing.relic, 0);
  g.player.hp = 50;
  g.gems.push({
    x: 0,
    y: 0,
    value: 25,
    age: 0
  });
  frames(g, 1);
  assert.equal(g.player.hp, 53);
  assert.equal(g.healing.relic, 3);
  frames(g, 1);
  assert.equal(g.player.hp, 53);
});
test('briar retaliates once per cooldown and never resurrects lethal contact', () => {
  for (const hp of [100, 1]) {
    const g = playing();
    g.relics = ['briar'];
    g.player.hp = hp;
    const e = enemy(g, 0);
    frames(g, 1);
    assert.equal(g.damageDealt.relic, hp === 1 ? 0 : 35);
    if (hp === 1) assert.equal(g.phase, 'ended');else {
      g.player.invincible = 0;
      e.x = e.y = 0;
      frames(g, 1);
      assert.equal(g.damageDealt.relic, 35);
    }
  }
  assert.equal(Object.keys(RELICS).length, 6);
  assert.deepEqual(createGame().relics, []);
});
import { updateEncounters, openChest, chooseCurse, chooseRelic, curseActive } from '../src/survivor/encounters.js';
test('altar requires ten seconds inside, pauses outside, and rewards once', () => {
  const g = playing();
  g.time = 45;
  updateEncounters(g, 0);
  const event = g.encounters[0];
  g.player.x = event.x;
  g.player.y = event.y;
  frames(g, 300);
  assert.ok(event.progress > 4.9 && event.progress < 5.1);
  g.player.x += 100;
  const before = event.progress;
  frames(g, 100);
  assert.equal(event.progress, before);
  g.player.x = event.x;
  frames(g, 301);
  assert.equal(g.phase, 'relic');
  assert.equal(event.state, 'completed');
  assert.equal(g.relicChoices.length, 3);
  const time = g.time;
  frames(g, 60);
  assert.equal(g.time, time);
  const key = g.relicChoices[0];
  assert.ok(chooseRelic(g, key));
  assert.equal(chooseRelic(g, key), false);
  frames(g, 60);
  assert.equal(g.phase, 'playing');
  assert.deepEqual(g.relics, [key]);
});
test('chest has explicit consent, freezes its prompt and supports decline', () => {
  const g = playing();
  g.time = 135;
  g.nextElite = 999;
  updateEncounters(g, 0);
  const e = g.encounters.find(e => e.kind === 'chest');
  assert.equal(openChest(g), false);
  g.player.x = e.x;
  g.player.y = e.y;
  assert.ok(openChest(g));
  assert.equal(curseActive(g), false);
  const time = g.time;
  frames(g, 60);
  assert.equal(g.time, time);
  assert.ok(chooseCurse(g, false));
  assert.equal(e.state, 'declined');
  assert.equal(openChest(g), false);
  assert.equal(g.phase, 'playing');
});
test('accepted curse increases real contact damage, expires, and excludes owned relics', () => {
  const g = playing();
  g.time = 135;
  g.nextElite = 999;
  updateEncounters(g, 0);
  const e = g.encounters.find(e => e.kind === 'chest');
  g.player.x = e.x;
  g.player.y = e.y;
  openChest(g);
  assert.ok(chooseCurse(g, true));
  g.relics = ['coal'];
  const target = enemy(g, g.player.x, g.player.y);
  target.damage = 8;
  frames(g, 1);
  assert.equal(g.player.hp, 90);
  g.enemies = [];
  g.player.invincible = 999;
  frames(g, 1080);
  assert.equal(g.phase, 'relic');
  assert.equal(curseActive(g), false);
  assert.ok(!g.relicChoices.includes('coal'));
  assert.ok(chooseRelic(g, g.relicChoices[0]));
  assert.equal(g.relics.length, 2);
});
test('lethal contact cancels challenge completion and restart clears all run effects', () => {
  const g = playing();
  g.encounters = [{
    kind: 'altar',
    state: 'active',
    x: 0,
    y: 0,
    progress: 9.99
  }];
  g.player.hp = 1;
  enemy(g, 0);
  frames(g, 1);
  assert.equal(g.phase, 'ended');
  assert.deepEqual(g.relicChoices, []);
  const fresh = createGame();
  assert.deepEqual(fresh.encounters, []);
  assert.deepEqual(fresh.relics, []);
  assert.equal(fresh.ranks.wildfire, 0);
});
import { createProfile, normalizeProfile, recordRun } from '../src/survivor/profile.js';
test('older profiles migrate and only known branch/relic discoveries survive reload', () => {
  const old = normalizeProfile({
    version: 1,
    runs: 2
  });
  assert.deepEqual(old.buildDiscoveries, []);
  assert.deepEqual(old.relicDiscoveries, []);
  const g = playing();
  g.phase = 'ended';
  g.outcome = 'survived';
  g.runId = 'expansion';
  g.ranks.sweep = 1;
  g.relics = ['dew', 'briar'];
  const recorded = recordRun(createProfile(), g);
  const restored = normalizeProfile(JSON.parse(JSON.stringify(recorded.profile)));
  assert.deepEqual(restored.buildDiscoveries, ['sweep']);
  assert.deepEqual(restored.relicDiscoveries, ['dew', 'briar']);
  assert.deepEqual(restored.history[0].branches, ['sweep']);
  assert.deepEqual(restored.history[0].relics, ['dew', 'briar']);
  assert.equal(recordRun(restored, g).added, false);
  assert.deepEqual(normalizeProfile({
    ...restored,
    relicDiscoveries: ['<script>', 'dew']
  }).relicDiscoveries, ['dew']);
});
test('wildfire spreads to at most two fresh targets and never refreshes an already burning target', () => {
  const g = playing();
  g.ranks.wildfire = 1;
  const origin = enemy(g, 150);
  origin.burn = {
    until: 4,
    next: 0,
    damage: 12
  };
  origin.hp = 5;
  const old = enemy(g, 155);
  old.burn = {
    until: 2,
    next: 10,
    damage: 8
  };
  const fresh = [enemy(g, 150, 50), enemy(g, 150, -50), enemy(g, 150, 80)];
  frames(g, 1);
  assert.equal(old.burn.until, 2);
  assert.equal(fresh.filter(e => e.burn).length, 2);
  assert.ok(fresh.every(e => e.hp === 1000));
});

test('event reward preserves pending XP and ordinary upgrades resume after the relic', () => {
  const g = playing();
  g.xpNeed = 8;
  g.encounters = [{kind:'altar',state:'active',x:0,y:0,progress:9.99}];
  g.gems.push({x:0,y:0,value:10,age:0});
  frames(g,1);
  assert.equal(g.phase,'relic');
  assert.equal(g.level,1);
  assert.equal(g.xp,10);
  chooseRelic(g,g.relicChoices[0]);
  frames(g,1);
  assert.equal(g.phase,'upgrade');
  assert.equal(g.level,2);
  assert.equal(g.xp,2);
  assert.equal(g.relics.length,1);
});
