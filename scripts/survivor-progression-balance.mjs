// Automates only movement and offered choices, using real combat rules at 60 Hz.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createGame, startGame, updateGame, chooseUpgrade, rerollUpgrades, canReroll, LIMITS} from '../src/survivor/game.js';
import {chooseRelic, nearbyChest, openChest, chooseCurse} from '../src/survivor/encounters.js';
import {createPilot} from '../src/survivor/qa-pilot.js';
import {goalProgress, goalRelevant} from '../src/survivor/goals.js';
import {createProfile, recordRun} from '../src/survivor/profile.js';
import {masteryCount} from '../src/survivor/progression.js';

const results = [];
let profile = createProfile();
for (const [character, base, evolution] of [['ash', 'blade', 'dawn'], ['ember', 'comet', 'comet'], ['grove', 'lunar', 'lunar']]) {
  for (const seed of [7, 42, 101, 333, 2026]) {
    for (const route of [base, `${base}-alternate`]) {
      for (const mode of ['normal', 'goal', 'mastery', 'mist']) {
        const preparation = mode === 'normal' ? {} : {goal: `evolution:${evolution}`, rerolls: ['mastery', 'mist'].includes(mode) ? 2 : 1, vow: mode === 'mist' ? 'mist' : 'none'};
        const g = createGame(seed, character, 'none', null, preparation), pilot = createPilot(route);
        g.runId = `${character}:${route}:${seed}:${mode}`; startGame(g);
        let peak = 0, levelAt60 = null;
        for (let frame = 0; frame < 20000 && g.phase !== 'ended'; frame++) {
          if (g.phase === 'upgrade') {
            if (mode !== 'normal' && goalProgress(g)?.state === 'preparing' && !g.choices.some(key => goalRelevant(g, key)) && canReroll(g)) assert.ok(rerollUpgrades(g));
            const target = g.choices.find(key => goalRelevant(g, key));
            const choice = g.player.hp > g.player.maxHp * .4 && target ? target : pilot.choose(g);
            assert.ok(chooseUpgrade(g, choice));
          }
          if (g.phase === 'relic') assert.ok(chooseRelic(g, pilot.relic(g)));
          if (g.phase === 'playing' && nearbyChest(g)) {assert.ok(openChest(g)); assert.ok(chooseCurse(g, true));}
          updateGame(g, 1/60, pilot.move(g)); g.events = [];
          if (levelAt60 === null && g.time >= 60) levelAt60 = g.level;
          peak = Math.max(peak, g.enemies.length);
          assert.ok(g.enemies.length <= LIMITS.enemies && g.shots.length <= LIMITS.shots && g.effects.length <= LIMITS.effects);
          assert.ok(Number.isFinite(g.player.hp) && Number.isFinite(g.xp));
        }
        assert.equal(g.phase, 'ended');
        const recorded = recordRun(profile, g); assert.ok(recorded.added); profile = recorded.profile;
        assert.equal(recordRun(profile, g).added, false);
        results.push({character, route, seed, mode, outcome: g.outcome, time: +g.time.toFixed(2), level: g.level, levelAt60, kills: g.kills, hp: +g.player.hp.toFixed(2), rerollsUsed: g.rerollsUsed, evolved: !!g.ranks[evolution], goal: goalProgress(g)?.state ?? null, relics: g.relics, peak, damageTaken: g.damageTaken});
      }
    }
  }
}
const summary = ['normal', 'goal', 'mastery', 'mist'].map(mode => {
  const rows = results.filter(r => r.mode === mode);
  return {mode, runs: rows.length, wins: rows.filter(r => r.outcome === 'victory').length, finalEncounter: rows.filter(r => r.time >= 240).length, evolved: rows.filter(r => r.evolved).length, rerollsUsed: rows.reduce((sum, r) => sum + r.rerollsUsed, 0), averageLevel: +(rows.reduce((sum, r) => sum + r.level, 0) / rows.length).toFixed(2)};
});
for (const id of ['ash', 'ember', 'grove']) {
  assert.equal(masteryCount(profile, id), 3, `${id}: both paths, evolution and victory must be achievable under normal rules`);
  for (const mode of ['normal', 'goal', 'mastery', 'mist']) assert.ok(results.some(r => r.character === id && r.mode === mode && r.outcome === 'victory'), `${id}/${mode}: at least one tested route must be winnable`);
}
await mkdir('output/playwright/survivor', {recursive: true});
await writeFile('output/playwright/survivor/progression-balance.json', JSON.stringify({results, summary, mastery: Object.fromEntries(['ash', 'ember', 'grove'].map(id => [id, masteryCount(profile, id)]))}, null, 2));
console.log(JSON.stringify({summary, mastery: Object.fromEntries(['ash', 'ember', 'grove'].map(id => [id, masteryCount(profile, id)]))}, null, 2));
