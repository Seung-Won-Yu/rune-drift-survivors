// Compare real rules with different choices; automation is not a player fun score.
import { mkdir, writeFile } from 'node:fs/promises';
import { createGame, startGame, updateGame, chooseUpgrade, LIMITS } from '../src/survivor/game.js';
import { chooseRelic, nearbyChest, openChest, chooseCurse } from '../src/survivor/encounters.js';
import { SPECIALIZATIONS } from '../src/survivor/expansion.js';
import { createPilot } from '../src/survivor/qa-pilot.js';
import assert from 'node:assert/strict';

const records = [];
for (const [character, route] of [['ash', 'blade'], ['ember', 'comet'], ['grove', 'lunar']]) {
  for (const policy of ['focus', 'hybrid']) for (const seed of [12, 42, 99]) {
    const game = createGame(seed, character), pilot = createPilot(route);
    const milestones = {}, choices = [], moments = [];
    let nextMoment = 30, peak = 0;
    startGame(game);
    for (let frame = 0; frame < 22000 && game.phase !== 'ended'; frame++) {
      if (game.phase === 'upgrade') {
        const alternate = policy === 'hybrid' && game.level <= 4 && game.choices.find(key => ['sword', 'ember', 'orbit'].includes(key) && !game.ranks[key]);
        const key = alternate || pilot.choose(game);
        choices.push({ time: +game.time.toFixed(2), level: game.level, key });
        assert.ok(chooseUpgrade(game, key));
        if (SPECIALIZATIONS[key] && milestones.branch === undefined) milestones.branch = +game.time.toFixed(2);
        if (['dawn', 'comet', 'lunar'].includes(key) && milestones.evolution === undefined) milestones.evolution = +game.time.toFixed(2);
      }
      if (game.phase === 'relic') assert.ok(chooseRelic(game, pilot.relic(game)));
      if (game.phase === 'playing' && nearbyChest(game)) { openChest(game); chooseCurse(game, true); }
      updateGame(game, 1 / 60, pilot.move(game));
      if (game.kills && milestones.kill === undefined) milestones.kill = +game.time.toFixed(2);
      if (game.level > 1 && milestones.growth === undefined) milestones.growth = +game.time.toFixed(2);
      peak = Math.max(peak, game.enemies.length);
      assert.ok(game.enemies.length <= LIMITS.enemies && game.shots.length <= LIMITS.shots && game.effects.length <= LIMITS.effects);
      if (game.time >= nextMoment) {
        moments.push({ time: nextMoment, level: game.level, kills: game.kills, hp: +game.player.hp.toFixed(1), enemies: game.enemies.length, damage: { ...game.damageDealt } });
        nextMoment += 30;
      }
      game.events.length = 0;
    }
    assert.equal(game.phase, 'ended');
    records.push({ character, policy, seed, milestones, choices, moments, outcome: game.outcome, time: +game.time.toFixed(2), kills: game.kills, level: game.level, hp: +game.player.hp.toFixed(1), peak, swarms: game.swarms ?? null, damageTaken: game.damageTaken });
  }
}
const tag = (process.argv[2] || 'current').replace(/[^a-z0-9-]/gi, '');
await mkdir('output/playwright/survivor', { recursive: true });
await writeFile(`output/playwright/survivor/flow-${tag}.json`, JSON.stringify(records, null, 2) + '\n');
for (const record of records) console.log(JSON.stringify({ ...record, choices: undefined, moments: undefined, damageTaken: undefined }));
