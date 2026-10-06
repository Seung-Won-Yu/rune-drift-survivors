import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startGame, updateGame, stats, draftUpgrades } from '../src/survivor/game.js';
import { CHARACTERS } from '../src/survivor/characters.js';
import { SPECIALIZATIONS } from '../src/survivor/expansion.js';
import { createProfile, normalizeProfile, recordRun, loadProfile, saveProfile } from '../src/survivor/profile.js';
import { validExperiment, nextExperiment, experimentProgress } from '../src/survivor/experiments.js';

const ended = id => ({ ...createGame(42), runId: id, phase: 'ended', outcome: 'defeat', time: 65, kills: 200 });
const noDiscoveries = { evolutions: [], branches: [], relics: [] };

test('results report only first discoveries, including defeat, without duplicate grants', () => {
  const game = ended('first'); game.ranks.sweep = 1; game.ranks.dawn = 1; game.relics = ['fang'];
  const initial = createProfile(), first = recordRun(initial, game);
  assert.deepEqual(first.discoveries, { evolutions: ['dawn'], branches: ['sweep'], relics: ['fang'] });
  assert.deepEqual(initial.buildDiscoveries, []);
  assert.deepEqual(recordRun(first.profile, game).discoveries, noDiscoveries);
  const repeated = recordRun(first.profile, { ...game, runId: 'second' });
  assert.equal(repeated.profile.runs, 2);
  assert.deepEqual(repeated.discoveries, noDiscoveries);
  assert.deepEqual(repeated.profile.buildDiscoveries, ['sweep']);
  game.ranks.horizon = 1; game.relics.push('bell'); game.runId = 'third';
  assert.deepEqual(recordRun(repeated.profile, game).discoveries, { evolutions: [], branches: ['horizon'], relics: ['bell'] });
});

test('unfinished or unrecorded scenes do not announce or persist discoveries', () => {
  for (const change of [{ phase: 'playing' }, { runId: undefined }]) {
    const game = { ...ended('not-ended'), ...change }; game.ranks.sweep = 1; game.relics = ['fang'];
    const result = recordRun(createProfile(), game);
    assert.equal(result.added, false); assert.deepEqual(result.discoveries, noDiscoveries);
    assert.equal(result.profile.runs, 0); assert.deepEqual(result.profile.buildDiscoveries, []);
  }
});

test('experiment preferences accept only a branch of the selected unlocked companion', () => {
  assert.equal(normalizeProfile({ version: 1, bestKills: 123 }).experiment, null);
  assert.equal(normalizeProfile({ version: 1, selected: 'ash', experiment: 'duelist' }).experiment, 'duelist');
  for (const value of [null, {}, { toString: null }, ['duelist'], 1, '__proto__', 'wildfire']) {
    assert.equal(validExperiment('ash', value), null);
    assert.equal(normalizeProfile({ version: 1, experiment: value }).experiment, null);
  }
  assert.equal(normalizeProfile({ version: 1, selected: 'ember', experiment: 'wildfire' }).experiment, null);
  assert.equal(normalizeProfile({ version: 1, selected: 'ember', bestTime: 60, experiment: 'wildfire' }).experiment, 'wildfire');
});

test('saved experiment loads and clears without changing existing journey records', () => {
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const profile = recordRun(createProfile(), ended('record')).profile;
  profile.experiment = 'duelist'; assert.equal(saveProfile(storage, profile), true);
  const loaded = loadProfile(storage).profile;
  assert.equal(loaded.experiment, 'duelist'); assert.equal(loaded.runs, 1); assert.equal(loaded.totalKills, 200);
  loaded.experiment = null; assert.equal(saveProfile(storage, loaded), true);
  assert.equal(loadProfile(storage).profile.experiment, null); assert.equal(loadProfile(storage).profile.runs, 1);
});

test('the next experiment favors an undiscovered starting-weapon branch and never repeats the current branch', () => {
  for (const [id, character] of Object.entries(CHARACTERS)) {
    const branches = Object.keys(SPECIALIZATIONS).filter(key => SPECIALIZATIONS[key].weapon === character.weapon);
    const game = createGame(42, id), profile = createProfile();
    profile.buildDiscoveries = [branches[0]];
    assert.equal(nextExperiment(game, profile), branches[1]);
    game.ranks[branches[1]] = 1;
    assert.equal(nextExperiment(game, profile), branches[0]);
    profile.buildDiscoveries = branches;
    assert.equal(nextExperiment(game, profile), branches[0]);
  }
});

test('an experiment grants no ranks, stats, different offers or combat advantage', () => {
  for (const [id, character] of Object.entries(CHARACTERS)) {
    const target = Object.keys(SPECIALIZATIONS).find(key => SPECIALIZATIONS[key].weapon === character.weapon);
    const plain = createGame(42, id), guided = createGame(42, id, 'none', target);
    assert.deepEqual(stats(guided), stats(plain)); assert.deepEqual(guided.ranks, plain.ranks);
    assert.deepEqual(draftUpgrades(guided), draftUpgrades(plain));
    for (const game of [plain, guided]) {
      startGame(game);
      for (let i = 0; i < 600; i++) updateGame(game, 1 / 60, { x: 1, y: 0 });
    }
    for (const key of ['player', 'enemies', 'ranks', 'kills', 'damageDealt', 'choices', 'gems']) assert.deepEqual(guided[key], plain[key], `${id}: ${key}`);
  }
});

test('experiment progress distinguishes preparation, the earned target and a voluntary different branch', () => {
  const game = createGame(42, 'ash', 'none', 'duelist');
  assert.equal(experimentProgress(game).state, 'preparing');
  game.ranks.sword = 5; assert.match(experimentProgress(game).text, /3\/3단계/);
  game.ranks.duelist = 1; assert.equal(experimentProgress(game).state, 'complete');
  game.ranks.duelist = 0; game.ranks.sweep = 1;
  assert.equal(experimentProgress(game).state, 'changed'); assert.match(experimentProgress(game).text, /반월 검법/);
  assert.equal(experimentProgress(createGame(42)), null);
});
