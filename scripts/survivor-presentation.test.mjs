import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/survivor/game.js';
import { createProfile } from '../src/survivor/profile.js';
import { codexEntries } from '../src/survivor/codex.js';
import { collectionArt } from '../src/survivor/collection-art.js';
import { attackPose } from '../src/survivor/impact.js';
import { heroGait } from '../src/survivor/motion.js';
import { evolutionFeedback, evolutionFrame } from '../src/survivor/evolution-feedback.js';
import { weaponPresentation, weaponLoadout, weaponBeltKey } from '../src/survivor/weapon-presentation.js';
import { SPECIALIZATIONS } from '../src/survivor/expansion.js';
import { drawWeaponMotif } from '../src/survivor/weapon-motifs.js';

test('every non-companion codex entry has a distinct original illustration and an honest locked silhouette', () => {
  const profile = createProfile(), before = JSON.stringify(profile);
  const items = codexEntries(profile).filter(e => !e.art);
  assert.equal(items.length, 19);
  const art = items.map(e => collectionArt(e.id));
  assert.equal(new Set(art).size, 19);
  for (const entry of items) {
    assert.match(collectionArt(entry.id), /viewBox="0 0 96 96"/);
    assert.match(collectionArt(entry.id, true), /is-silhouette/);
    assert.doesNotMatch(collectionArt(entry.id), /is-silhouette/);
  }
  assert.equal(collectionArt('not-an-item'), '');
  assert.equal(JSON.stringify(profile), before);
});

test('four sword poses match contact, follow-through and settle without changing combat state', () => {
  const game = createGame(42); game.swing = { age: .16, angle: 0 };
  const pose = age => { game.swing.age = age; const before = JSON.stringify(game), result = attackPose(game); assert.equal(JSON.stringify(game), before); return result; };
  assert.ok(pose(.16).x < 0);
  const contact = pose(.18), follow = pose(.30), settle = pose(.48);
  assert.ok(contact.x >= 11); assert.ok(follow.x > 0 && follow.x < contact.x);
  assert.ok(settle.x >= 0 && settle.x < follow.x * .15);
  assert.equal(pose(.55).x, 0);
  assert.deepEqual(attackPose(game, true), {});
  game.player.hurt = .1; assert.deepEqual(attackPose(game), {});
});

test('all companions have different casting weight and obey hurt and reduced motion priority', () => {
  const poses = ['ash', 'ember', 'grove'].map(character => {
    const game = createGame(42, character); game.player.cast = .3;
    const before = JSON.stringify(game), pose = attackPose(game);
    assert.equal(JSON.stringify(game), before); assert.deepEqual(attackPose(game, true), {});
    game.player.hurt = .1; assert.deepEqual(attackPose(game), {});
    return JSON.stringify(pose);
  });
  assert.equal(new Set(poses).size, 3);
});

test('idle breathing uses simulation time, freezes while paused and never displaces the collision body', () => {
  for (const character of ['ash', 'ember', 'grove']) {
    const game = createGame(42, character); game.time = .5; game.phase = 'paused';
    const before = JSON.stringify(game), pose = heroGait(game);
    assert.deepEqual(heroGait(game), pose); assert.equal(JSON.stringify(game), before);
    assert.ok(Object.values(pose).every(Number.isFinite)); assert.deepEqual(heroGait(game, true), {});
    game.player.cast = .1; assert.deepEqual(heroGait(game), {});
    game.player.cast = 0; game.outcome = 'defeat'; assert.deepEqual(heroGait(game), {});
  }
});

test('evolution celebration is bounded, pause-safe and static in reduced motion', () => {
  assert.equal(evolutionFeedback('sword', 10), null); assert.equal(evolutionFeedback('fake', 10), null);
  assert.equal(evolutionFeedback('dawn', Infinity), null);
  for (const key of ['dawn', 'comet', 'lunar']) {
    const feedback = evolutionFeedback(key, 10), frame = evolutionFrame(feedback, 10.2);
    assert.ok(frame.alpha > 0 && frame.shards === 8); assert.deepEqual(evolutionFrame(feedback, 10.2), frame);
    const reduced = evolutionFrame(feedback, 10.2, true), later = evolutionFrame(feedback, 10.9, true);
    assert.equal(reduced.shards, 0); assert.equal(reduced.reach, later.reach); assert.equal(reduced.alpha, later.alpha);
    assert.equal(evolutionFrame(feedback, 9), null); assert.equal(evolutionFrame(feedback, 11.35), null);
    assert.equal(evolutionFrame(feedback, NaN), null);
  }
});

test('weapon identity follows every chosen fork and preserves it after evolution without granting discoveries', () => {
  for (const [branch, meta] of Object.entries(SPECIALIZATIONS)) {
    const game = createGame(42); game.ranks[meta.weapon] = 3;
    const basic = weaponBeltKey(weaponLoadout(game));
    game.ranks[branch] = 1;
    const before = JSON.stringify(game), specialized = weaponPresentation(game, meta.weapon);
    assert.equal(specialized.art, branch); assert.equal(specialized.stage, 'specialized');
    assert.ok(specialized.label.includes(meta.name));
    assert.notEqual(weaponBeltKey(weaponLoadout(game)), basic);
    assert.equal(JSON.stringify(game), before);
    const evolution = {sword:'dawn', ember:'comet', orbit:'lunar'}[meta.weapon];
    game.ranks[evolution] = 1;
    const evolvedBefore = JSON.stringify(game), evolved = weaponPresentation(game, meta.weapon);
    assert.equal(evolved.art, evolution); assert.equal(evolved.branch, branch);
    assert.equal(evolved.stage, 'evolved'); assert.equal(evolved.rank, 3);
    if (branch === 'wildfire') {
      assert.match(evolved.description, /지속 피해/);
      assert.doesNotMatch(evolved.description, /터져/);
    }
    assert.equal(JSON.stringify(game), evolvedBefore);
  }
});

test('fresh loadouts have only their starting weapon and cannot retain a previous weapon identity', () => {
  for (const [character, family] of [['ash','sword'],['ember','ember'],['grove','orbit']]) {
    const game = createGame(42, character), equipped = weaponLoadout(game).filter(w => w.rank);
    assert.equal(equipped.length, 1); assert.equal(equipped[0].family, family);
    assert.equal(equipped[0].art, family); assert.equal(equipped[0].stage, 'basic');
    assert.equal(equipped[0].branch, null); assert.equal(equipped[0].evolution, null);
    assert.equal(weaponPresentation(game, 'fleet'), null);
  }
});

test('evolution engravings are distinct, deterministic and bounded even with invalid reach', () => {
  const capture = (key, reach) => {
    const calls = [], ctx = new Proxy({}, {
      get: (_, method) => (...args) => calls.push([method, ...args]),
      set: (_, property, value) => { calls.push([property, value]); return true; }
    });
    drawWeaponMotif(ctx, key, reach);
    return calls;
  };
  const identities = ['dawn','comet','lunar'].map(key => {
    const calls = capture(key, 14);
    assert.deepEqual(calls, capture(key, 14));
    assert.equal(calls[0][0], 'save'); assert.equal(calls.at(-1)[0], 'restore');
    for (const reach of [1e6, -1e6, NaN, Infinity]) {
      const drawing = capture(key, reach);
      assert.ok(drawing.length < 20);
      for (const call of drawing) for (const value of call.slice(1).filter(v => typeof v === 'number')) {
        assert.ok(Number.isFinite(value)); assert.ok(Math.abs(value) <= 24);
      }
    }
    return JSON.stringify(calls);
  });
  assert.equal(new Set(identities).size, 3); assert.deepEqual(capture('sword', 14), []);
});
