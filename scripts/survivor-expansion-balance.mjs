// Normal rules at a fixed step. Only movement and offered choices are automated.
import assert from 'node:assert/strict';
import { createGame, startGame, updateGame, chooseUpgrade, LIMITS } from '../src/survivor/game.js';
import { chooseRelic, nearbyChest, openChest, chooseCurse } from '../src/survivor/encounters.js';
import { SPECIALIZATIONS } from '../src/survivor/expansion.js';
import { createPilot } from '../src/survivor/qa-pilot.js';
for (const route of ['blade', 'blade-alternate', 'comet', 'comet-alternate', 'lunar', 'lunar-alternate']) {
  for (const seed of [12, 42, 99]) {
    const base = route.replace('-alternate', ''),
      g = createGame(seed, {
        blade: 'ash',
        comet: 'ember',
        lunar: 'grove'
      }[base]),
      pilot = createPilot(route);
    startGame(g);
    let peak = 0;
    for (let frame = 0; frame < 20000 && g.phase !== 'ended'; frame++) {
      if (g.phase === 'upgrade') assert.ok(chooseUpgrade(g, pilot.choose(g)));
      if (g.phase === 'relic') assert.ok(chooseRelic(g, pilot.relic(g)));
      if (g.phase === 'playing' && nearbyChest(g)) {
        assert.ok(openChest(g));
        assert.ok(chooseCurse(g, true));
      }
      updateGame(g, 1 / 60, pilot.move(g));
      g.events = [];
      peak = Math.max(peak, g.enemies.length);
      assert.ok(g.enemies.length <= LIMITS.enemies && g.shots.length <= LIMITS.shots && g.effects.length <= LIMITS.effects);
    }
    assert.equal(g.phase, 'ended');
    console.log(JSON.stringify({
      route,
      seed,
      time: g.time,
      outcome: g.outcome,
      level: g.level,
      kills: g.kills,
      hp: g.player.hp,
      branches: Object.keys(SPECIALIZATIONS).filter(k => g.ranks[k]),
      relics: g.relics,
      events: g.encounters.map(e => ({
        kind: e.kind,
        state: e.state,
        progress: e.progress
      })),
      damage: g.damageDealt,
      healing: g.healing,
      peak
    }));
  }
}
