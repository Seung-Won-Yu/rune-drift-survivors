import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, spawnEnemy, updateGame, SLAM } from '../src/survivor/game.js';
import { HOUND, GIANT } from '../src/survivor/enemies.js';
import { ashFrame, creatureFrame, remnantFrame } from '../src/survivor/actor-animation.js';
import { ACTOR_ART } from '../src/survivor/actor-art.js';
import { drawSlash, drawProjectile, drawSlamImpact, drawEmberBurst } from '../src/survivor/combat-vfx.js';
import { drawEnemyGround, drawEnemyWarnings } from '../src/survivor/enemy-render.js';
import { createProfile } from '../src/survivor/profile.js';
import { codexEntries } from '../src/survivor/codex.js';
import { collectionArt } from '../src/survivor/collection-art.js';
import { attackPose } from '../src/survivor/impact.js';
import { heroGait, enemyMotion } from '../src/survivor/motion.js';
import { CHAMPION_HUNT } from '../src/survivor/champions.js';
import { evolutionFeedback, evolutionFrame } from '../src/survivor/evolution-feedback.js';
import { weaponPresentation, weaponLoadout, weaponBeltKey } from '../src/survivor/weapon-presentation.js';
import { SPECIALIZATIONS } from '../src/survivor/expansion.js';
import { drawWeaponMotif } from '../src/survivor/weapon-motifs.js';

const drawingCalls = draw => {
  const calls = [], ctx = new Proxy({}, {
    get: (_, method) => (...args) => calls.push([method, ...args]),
    set: (_, property, value) => { calls.push([property, value]); return true; }
  });
  draw(ctx); return calls;
};

test('sword strokes stay near the weapon even at evolved range and never draw a full damage sector', () => {
  for (const branch of [null, 'sweep', 'duelist']) for (const reduced of [false,true]) for (const age of [0,.06,.16,.22]) {
    const effect={x:10,y:20,angle:.3,range:240,halfAngle:2.15,life:.22,age,branch,empowered:true},before=JSON.stringify(effect);
    const calls=drawingCalls(ctx=>drawSlash(ctx,effect,reduced));
    for(const call of calls.filter(c=>c[0]==='arc')) { assert.ok(call[3]<=76);assert.ok(Math.abs(call[5]-call[4])<=1.23); }
    assert.equal(JSON.stringify(effect),before);
    assert.deepEqual(calls,drawingCalls(ctx=>drawSlash(ctx,effect,reduced)));
  }
});

test('projectile heads use the actual position and travel direction without advancing simulation', () => {
  for(const kind of [undefined,'crescent']) for(const vx of [-290,290]) {
    const shot={kind,x:120,y:80,vx,vy:40,life:1,blast:true},before=JSON.stringify(shot);
    const calls=drawingCalls(ctx=>drawProjectile(ctx,shot));
    assert.deepEqual(calls.find(c=>c[0]==='translate'),['translate',120,kind==='crescent'?72:66]);
    assert.deepEqual(calls.find(c=>c[0]==='rotate'),['rotate',Math.atan2(40,vx)]);
    assert.equal(JSON.stringify(shot),before);
  }
});

test('ordinary warnings omit text and target tethers; hound motion follows the actual charging body', () => {
  const game={time:1,spores:[{x:0,y:100,age:.4}],enemies:[{type:2,x:120,y:50,slam:{x:0,y:0,age:.5,hit:false}},{type:1,x:-100,y:0,hunt:{x:-100,y:0,angle:0,age:.4}}]};
  const before=JSON.stringify(game),calls=drawingCalls(ctx=>drawEnemyWarnings(ctx,game,false));
  assert.ok(!calls.some(c=>['fillText','strokeText','moveTo','lineTo','setLineDash'].includes(c[0])));
  assert.equal(JSON.stringify(game),before);
  const hound=game.enemies[1];game.enemies=[hound];game.spores=[];
  const floor=drawingCalls(ctx=>drawEnemyGround(ctx,game));
  assert.ok(floor.some(c=>c[0]==='lineWidth'&&c[1]===HOUND.width));
  hound.hunt.age=HOUND.windup+.1;hound.x=-55;
  assert.ok(!drawingCalls(ctx=>drawEnemyGround(ctx,game)).some(c=>c[0]==='stroke'));
  const dash=drawingCalls(ctx=>drawEnemyWarnings(ctx,game,false));
  assert.deepEqual(dash.find(c=>c[0]==='translate'),['translate',-55,-12]);
  assert.ok(!drawingCalls(ctx=>drawEnemyWarnings(ctx,game,true)).some(c=>c[0]==='lineTo'));
});

test('ground and fire impacts remain bounded, deterministic and free of full-radius target rings', () => {
  const effect={x:20,y:70,fromX:0,fromY:-100,range:90,age:.12,life:.38},before=JSON.stringify(effect);
  for(const draw of [drawSlamImpact,drawEmberBurst]) for(const reduced of [false,true]) {
    const calls=drawingCalls(ctx=>draw(ctx,effect,reduced));
    assert.ok(!calls.some(c=>c[0]==='arc'));assert.deepEqual(calls,drawingCalls(ctx=>draw(ctx,effect,reduced)));
    assert.ok(calls.length<180);
    for(const call of calls)for(const value of call.slice(1).filter(v=>typeof v==='number'))assert.ok(Number.isFinite(value));
  }
  assert.equal(JSON.stringify(effect),before);
});

test('authored blade poses reach contact only at the real hit threshold, with hurt and defeat priority', () => {
  const game = createGame(42); game.swing = { age: .179, angle: 0 };
  assert.ok(ashFrame(game) < 11); assert.ok(ashFrame(game, true) < 11);
  game.swing.age = .18; assert.equal(ashFrame(game), 11);
  for (let age = 0; age <= .55; age += .001) { game.swing.age = age; assert.ok(![12,13].includes(ashFrame(game))); }
  game.player.hurt = .24; assert.equal(ashFrame(game), 16);
  game.outcome = 'defeat'; game.player.deathAge = .6; assert.equal(ashFrame(game), 23);
  const before = JSON.stringify(game); ashFrame(game); assert.equal(JSON.stringify(game), before);
});

test('authored enemy attacks preserve ordinary and champion windups even while being hit', () => {
  for (const champion of [undefined, 'fang']) {
    const rule = champion ? CHAMPION_HUNT : HOUND;
    const enemy = { type: 1, champion, hunt: { age: rule.windup - .001 }, impact: { at: 0 } };
    assert.equal(creatureFrame(enemy, 0), 10);
    enemy.hunt.age = rule.windup; assert.equal(creatureFrame(enemy, 0), 11);
    enemy.hunt.age = rule.windup + rule.duration; assert.equal(creatureFrame(enemy, 0), 13);
  }
  for (const elite of [false, true]) {
    const rule = elite ? SLAM : GIANT, enemy = { type: 2, elite, slam: { age: rule.windup - .001, hit: false }, impact: { at: 0 } };
    assert.equal(creatureFrame(enemy, 0), 10);
    enemy.slam.age = rule.windup; enemy.slam.hit = true; assert.equal(creatureFrame(enemy, 0), 11);
    const before = JSON.stringify(enemy); creatureFrame(enemy, 0, true); assert.equal(JSON.stringify(enemy), before);
  }
});

test('gait follows distance, freezes on pause and slows with the creature body', () => {
  const run = slowed => {
    const game = createGame(42); game.phase = 'playing'; game.spawnClock = 999;
    const enemy = spawnEnemy(game, 1, false, { x: 400, y: 0 }); enemy.huntClock = 999;
    if (slowed) enemy.slowUntil = 10;
    updateGame(game, 1 / 30);
    assert.ok(Math.abs(enemy.walk - (400 - enemy.x)) < .00001);
    const before = enemy.walk; game.phase = 'paused'; updateGame(game, 1 / 30);
    assert.equal(enemy.walk, before);
    const pose = creatureFrame(enemy, game.time); assert.equal(creatureFrame(enemy, game.time + 10), pose);
    assert.equal(creatureFrame(enemy, game.time, true), 0); return before;
  };
  assert.ok(Math.abs(run(true) / run(false) - .7) < .00001);
});

test('all used pose rectangles fit the source and death finishes before its fade', () => {
  for (const meta of Object.values(ACTOR_ART)) {
    assert.equal(meta.rects.length, 24);
    for (const [x,y,w,h] of meta.rects) {
      assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x+w <= 1024 && y+h <= 1536);
    }
  }
  assert.equal(remnantFrame({ age: 0, life: .42 }), 20);
  assert.equal(remnantFrame({ age: .32, life: .42 }), 23);
  assert.equal(remnantFrame({ age: 0, life: .42 }, true), 23);
});

test('champion anticipation remains readable until its actual dash starts', () => {
  const enemy = {champion:'fang',hunt:{age:CHAMPION_HUNT.windup-.01}};
  const before=JSON.stringify(enemy), anticipation=enemyMotion(enemy,0);
  assert.ok(anticipation.sy < .85);
  assert.equal(JSON.stringify(enemy),before);
  enemy.hunt.age=CHAMPION_HUNT.windup+.1;
  assert.deepEqual(enemyMotion(enemy,0),{sx:1.2,sy:.86});
  assert.deepEqual(enemyMotion(enemy,0,true),{});
});

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
