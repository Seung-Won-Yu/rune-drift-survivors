import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, draftUpgrades, rerollUpgrades, canReroll, chooseUpgrade, startGame, updateGame, spawnEnemy, spawnBoss } from '../src/survivor/game.js';
import { SPECIALIZATIONS } from '../src/survivor/expansion.js';
import { createProfile, normalizeProfile, recordRun, saveProfile, loadProfile } from '../src/survivor/profile.js';
import { masteryCount, runPreparation, validGoal } from '../src/survivor/progression.js';
import { goalProgress, goalRelevant } from '../src/survivor/goals.js';
import { chooseRelic } from '../src/survivor/encounters.js';

test('reroll changes choices without advancing the run or granting ranks, XP or health', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const g = createGame(seed); g.phase = 'upgrade'; g.level = 2; g.choices = draftUpgrades(g);
    const before = { ranks: {...g.ranks}, xp: g.xp, hp: g.player.hp, time: g.time }, old = [...g.choices];
    assert.equal(rerollUpgrades(g), true);
    assert.ok(g.choices.some(key => !old.includes(key)));
    assert.equal(new Set(g.choices).size, g.choices.length);
    assert.deepEqual({ranks: g.ranks, xp: g.xp, hp: g.player.hp, time: g.time}, before);
    assert.equal(g.rerolls, 0); assert.equal(g.rerollsUsed, 1);
    assert.equal(rerollUpgrades(g), false);
    assert.equal(chooseUpgrade(g, g.choices[0]), true);
  }
});
test('reroll preserves ready evolutions and never offers an ineligible or conflicting specialization', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const g = createGame(seed); g.phase = 'upgrade'; g.level = 5;
    Object.assign(g.ranks, {sword: 3, orbit: 1, sweep: 1}); g.eliteKills = 1; g.choices = draftUpgrades(g);
    assert.equal(rerollUpgrades(g), true); assert.ok(g.choices.includes('dawn'));
    assert.ok(g.choices.every(key => !SPECIALIZATIONS[key]));
  }
});
test('rerolls are bounded and an exhausted candidate pool spends nothing', () => {
  assert.equal(createGame(1, 'ash', 'none', null, {rerolls: 200}).rerolls, 1);
  const g = createGame(1, 'ash', 'none', null, {rerolls: 2});
  assert.equal(rerollUpgrades(g), false);
  g.phase = 'upgrade';
  for (const key of Object.keys(g.ranks)) g.ranks[key] = 100;
  g.choices = ['heal'];
  assert.equal(canReroll(g), false); assert.equal(rerollUpgrades(g), false); assert.equal(g.rerolls, 2);
});
test('mastery is earned per companion and only finished unique runs grant seals and the extra reroll', () => {
  let p = createProfile();
  const g = createGame(1); Object.assign(g, {runId: 'first', phase: 'playing', outcome: 'victory'});
  Object.assign(g.ranks, {sweep: 1, dawn: 1, horizon: 1});
  assert.equal(recordRun(p, g).added, false);
  g.phase = 'ended'; const first = recordRun(p, g); p = first.profile;
  assert.deepEqual(first.mastery, ['evolution', 'victory']);
  assert.equal(masteryCount(p, 'ash'), 2); assert.equal(masteryCount(p, 'grove'), 0);
  assert.deepEqual(p.characters.ash.branches, ['sweep']); assert.equal(runPreparation(p).rerolls, 1);
  const second = createGame(2); Object.assign(second, {runId: 'second', phase: 'ended', outcome: 'defeat'}); second.ranks.duelist = 1;
  const done = recordRun(p, second);
  assert.deepEqual(done.mastery, ['branches']); assert.equal(masteryCount(done.profile, 'ash'), 3);
  assert.equal(runPreparation(done.profile).rerolls, 2);
  assert.equal(recordRun(done.profile, second).added, false);
  let raw; const storage = {setItem: (_, value) => raw = value, getItem: () => raw};
  saveProfile(storage, done.profile); assert.equal(runPreparation(loadProfile(storage).profile).rerolls, 2);
});
test('migration backfills only proven character history, never global discoveries or another companion build', () => {
  const old = {version: 1, wins: 2, discoveries: ['dawn', 'lunar'], buildDiscoveries: ['sweep', 'duelist', 'bulwark', 'horizon'], characters: {ash: {wins: 1}}, history: [{character: 'grove', branches: ['sweep', 'bulwark'], evolutions: ['dawn', 'lunar']}]};
  const p = normalizeProfile(old);
  assert.equal(masteryCount(p, 'ash'), 1); assert.deepEqual(p.characters.ash.branches, []); assert.equal(p.characters.ash.evolved, false);
  assert.deepEqual(p.characters.grove.branches, ['bulwark']); assert.equal(p.characters.grove.evolved, true);
  assert.deepEqual(normalizeProfile(p), p);
  const unknown = normalizeProfile({...old, history: [{character:'missing', branches:['sweep','duelist'], evolutions:['dawn']}]});
  assert.deepEqual(unknown.characters.ash.branches, []); assert.equal(unknown.characters.ash.evolved, false);
  assert.equal(masteryCount(unknown, 'ash'), 1);
});
test('vow is opt-in after a win, applies to real ordinary, elite and boss health and incoming armored damage', () => {
  const p = createProfile(); p.vow = 'mist'; assert.equal(runPreparation(p).vow, 'none');
  p.wins = 1; assert.equal(runPreparation(p).vow, 'mist');
  assert.equal(normalizeProfile({...p, vow: '__proto__'}).vow, 'none');
  const normal = createGame(8, 'grove'), vow = createGame(8, 'grove', 'none', null, {vow: 'mist'});
  for (const elite of [false, true]) assert.equal(spawnEnemy(vow, 2, elite).hp, spawnEnemy(normal, 2, elite).hp * 1.15);
  assert.equal(spawnBoss(vow).hp, spawnBoss(normal).hp * 1.15);
  for (const g of [normal, vow]) {g.enemies = []; startGame(g); g.spawnClock = 999; spawnEnemy(g, 0, false, {x: 0, y: 0}); updateGame(g, 1/60);}
  assert.ok(Math.abs(vow.damageTaken.contact - normal.damageTaken.contact * 1.15) < 1e-10);
});
test('vow XP bonuses add exactly and never amplify dew recovery or leak across restarts', () => {
  const collect = (keepsake, time) => {
    const g = createGame(8, 'ash', keepsake, null, {vow: 'mist'}); startGame(g);
    g.spawnClock = g.nextElite = 999; g.xpNeed = 9999; g.time = time; g.player.hp = 50; g.relics = ['dew']; g.dewXp = 29;
    g.gems.push({x: 0, y: 0, value: 1, age: 0}); updateGame(g, 1/60); return g;
  };
  const early = collect('bookmark', 0); assert.equal(early.xp, 1.35); assert.equal(early.player.hp, 53); assert.equal(early.dewXp, 0);
  assert.equal(collect('bookmark', 60).xp, 1.15); assert.equal(collect('none', 0).xp, 1.15);
  const exact = createGame(8, 'ash', 'none', null, {vow: 'mist'}); startGame(exact); exact.spawnClock = 999; exact.xpNeed = 23;
  for (let i = 0; i < 20; i++) {exact.gems.push({x: 0, y: 0, value: 1, age: 0}); updateGame(exact, 1/60);}
  assert.equal(exact.level, 2); assert.equal(exact.xp, 0);
  assert.equal(createGame(9).vow, 'none'); assert.equal(createGame(9).xp, 0);
});
test('vow victory records are separate, persistent and cannot be awarded twice', () => {
  const g = createGame(8, 'ember', 'none', null, {vow: 'mist'});
  Object.assign(g, {phase: 'ended', outcome: 'victory', runId: 'mist-win'});
  const first = recordRun(createProfile(), g); assert.equal(first.profile.characters.ember.vowWins, 1);
  assert.equal(first.profile.history[0].vow, 'mist'); assert.equal(recordRun(first.profile, g).profile.characters.ember.vowWins, 1);
});
test('codex goal survives failure, tracks actual requirements and clears only after recorded discovery', () => {
  const p = createProfile(); p.goal = 'evolution:dawn';
  const g = createGame(8, 'ash', 'none', null, runPreparation(p));
  assert.equal(goalProgress(g).state, 'preparing'); assert.equal(goalRelevant(g, 'sword'), true); assert.equal(goalRelevant(g, 'ember'), false);
  Object.assign(g, {phase: 'ended', outcome: 'defeat', runId: 'goal-failure'});
  assert.equal(recordRun(p, g).profile.goal, 'evolution:dawn');
  g.ranks.dawn = 1; g.runId = 'goal-success';
  assert.equal(goalProgress(g).state, 'complete'); assert.equal(recordRun(p, g).profile.goal, null);
  assert.equal(normalizeProfile({...p, goal: 'relic:unknown'}).goal, null);
  assert.equal(validGoal('branch:sweep:extra'), null); assert.equal(validGoal('relic:__proto__'), null);
});
test('branch and relic goals explain a missed path without awarding or forcing the target', () => {
  const branch = createGame(1, 'ash', 'none', null, {goal: 'branch:sweep'}); branch.ranks.duelist = 1;
  assert.equal(goalProgress(branch).state, 'changed'); assert.equal(goalRelevant(branch, 'sword'), false);
  const relic = createGame(1, 'ash', 'none', null, {goal: 'relic:dew'});
  assert.equal(goalRelevant(relic, 'dew'), true); relic.relics = ['fang', 'coal'];
  assert.equal(goalProgress(relic).state, 'missed'); assert.equal(goalRelevant(relic, 'dew'), false);
});
test('a selected relic records its collection goal only at a unique finished run', () => {
  const p = createProfile(); p.goal = 'relic:dew';
  const g = createGame(3, 'ash', 'none', null, runPreparation(p));
  g.phase = 'relic'; g.relicChoices = ['dew', 'coal', 'fang'];
  assert.equal(chooseRelic(g, 'dew'), true); assert.equal(goalProgress(g).state, 'complete');
  assert.equal(recordRun(p, g).added, false); assert.equal(p.goal, 'relic:dew');
  Object.assign(g, {phase:'ended', outcome:'defeat', runId:'relic-goal'});
  const saved = recordRun(p, g); assert.equal(saved.profile.goal, null); assert.deepEqual(saved.discoveries.relics, ['dew']);
  assert.equal(recordRun(saved.profile, g).added, false);
  assert.equal(normalizeProfile({...p, experiment:'sweep'}).experiment, null);
});
