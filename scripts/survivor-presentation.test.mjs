import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, spawnEnemy, updateGame, orbitPositions, SLAM } from '../src/survivor/game.js';
import {advanceOrbitShape} from '../src/survivor/orbit-shape.js';
import { HOUND, GIANT, SPORE } from '../src/survivor/enemies.js';
import { ashFrame, companionFrame, creatureFrame, remnantFrame, bossFrame, bossRemnantFrame } from '../src/survivor/actor-animation.js';
import { BOSS } from '../src/survivor/boss.js';
import { drawBossThorn, drawBossRelease } from '../src/survivor/boss-ink.js';
import { drawFootfall, drawMaterialHit } from '../src/survivor/combat-ink.js';
import { ACTOR_ART } from '../src/survivor/actor-art.js';
import { drawSlash, drawProjectile, drawOrbitWake, drawSlamImpact, drawEmberBurst, drawLaunch, drawRuneTouch, drawFinish } from '../src/survivor/combat-vfx.js';
import { drawEnemyGround, drawEnemyWarnings } from '../src/survivor/enemy-render.js';
import { createProfile } from '../src/survivor/profile.js';
import { codexEntries } from '../src/survivor/codex.js';
import { collectionArt } from '../src/survivor/collection-art.js';
import { attackPose, companionActionPose } from '../src/survivor/impact.js';
import { heroGait, enemyMotion } from '../src/survivor/motion.js';
import { CHAMPION_HUNT, CHAMPION_SPORE } from '../src/survivor/champions.js';
import { evolutionFeedback, evolutionFrame } from '../src/survivor/evolution-feedback.js';
import { weaponPresentation, weaponLoadout, weaponBeltKey } from '../src/survivor/weapon-presentation.js';
import { SPECIALIZATIONS } from '../src/survivor/expansion.js';
import { drawWeaponMotif } from '../src/survivor/weapon-motifs.js';
import { createBranchDemo } from '../src/survivor/branch-preview.js';

test('branch demonstrations use real attacks in bounded independent encounters', () => {
  const live=createGame(42,'ember','bookmark',null,{vow:'mist'}),before=JSON.stringify(live);
  for(const character of ['ash','ember','grove']) for(const [key,meta] of Object.entries(SPECIALIZATIONS)) {
    const demo=createBranchDemo(key,character),initial=demo.enemies.length;
    assert.equal(demo.ranks[meta.weapon],2);assert.equal(demo.ranks[key],1);
    assert.ok(initial>=5 && initial<=8);
    for(let i=0;i<270;i++) updateGame(demo,1/60,{x:0,y:0});
    assert.equal(demo.phase,'playing');assert.equal(demo.level,3);
    assert.ok(demo.damageDealt[meta.weapon]>0,`${key} must demonstrate actual damage`);
    for(const other of ['sword','ember','orbit'].filter(weapon=>weapon!==meta.weapon)) {
      assert.equal(demo.ranks[other],0);assert.equal(demo.damageDealt[other],0);
    }
    assert.ok(demo.enemies.length<=initial);
    assert.equal(demo.player.hp,demo.player.maxHp);
  }
  assert.equal(JSON.stringify(live),before);
  assert.equal(createBranchDemo('invalid'),null);assert.equal(createBranchDemo('constructor'),null);
});

const drawingCalls = draw => {
  const calls = [], ctx = new Proxy({}, {
    get: (_, method) => (...args) => calls.push([method, ...args]),
    set: (_, property, value) => { calls.push([property, value]); return true; }
  });
  draw(ctx); return calls;
};

test('blade continuations alternate an asymmetric real cut and retain it with reduced motion',()=>{
  for(const reduced of [false,true]) {
    const paths=direction=>drawingCalls(ctx=>drawSlash(ctx,{kind:'slash',x:0,y:0,angle:.3,range:124,precise:true,direction,age:.03,life:.16},reduced))
      .filter(call=>['moveTo','lineTo','quadraticCurveTo'].includes(call[0]));
    const positive=paths(1),negative=paths(-1);
    assert.notDeepEqual(positive,negative);
    assert.deepEqual(positive,negative.map(([method,...coordinates])=>[method,...coordinates.map((value,i)=>i%2?-value:value)]));
  }
});

test('footfall dust trails travel rather than the direction the companion faces', () => {
  for (const input of [{x:0,y:1},{x:0,y:-1},{x:-1,y:0},{x:.3,y:.4}]) {
    const game=createGame(42);game.phase='playing';game.spawnClock=999;
    game.player.facing=1;
    updateGame(game,1/30,input);
    // A cast/attack may leave facing opposite travel. Dust follows the feet.
    game.player.facing=1;
    const before=JSON.stringify(game),calls=drawingCalls(ctx=>drawFootfall(ctx,game,false));
    const position=calls.find(c=>c[0]==='translate');assert.ok(position);
    const dx=position[1]-game.player.x,dy=position[2]-game.player.y-2;
    assert.ok(dx*input.x+dy*input.y<0,'dust trails actual motion');
    assert.ok(Math.abs(dx*input.y-dy*input.x)<1e-8,'trail stays on the travel axis');
    assert.equal(JSON.stringify(game),before);
    assert.deepEqual(drawingCalls(ctx=>drawFootfall(ctx,game,true)),[]);
    game.phase='paused';const paused=JSON.stringify(game);updateGame(game,1/30,{x:1,y:0});
    assert.equal(JSON.stringify(game),paused);
    game.phase='playing';updateGame(game,1/30);
    assert.deepEqual(drawingCalls(ctx=>drawFootfall(ctx,game,false)),[]);
  }
});

test('blast hit reactions point away from the explosion without adding physical knockback', () => {
  const game=createGame(42,'ember');game.phase='playing';game.spawnClock=999;game.emberClock=999;
  const enemies=[220,185,255].map(x=>{
    const enemy=spawnEnemy(game,0,false,{x,y:0});enemy.hp=enemy.maxHp=1000;enemy.speed=0;return enemy;
  });
  game.shots.push({x:220-290/60,y:0,vx:290,vy:0,life:2,damage:30,blast:true,blastRadius:56});
  updateGame(game,1/60);
  for(const [index,enemy] of enemies.entries()) {
    assert.equal(enemy.hp,970);assert.equal(enemy.knockX,0);assert.equal(enemy.knockY,0);
    assert.equal(enemy.x,[220,185,255][index]);assert.equal(enemy.y,0);
    assert.equal(enemy.impact.angle,index===1?Math.PI:0);
  }
});

test('sword ribbons follow weapon reach without filling a damage-warning sector', () => {
  for (const branch of [null, 'sweep', 'duelist']) for (const reduced of [false,true]) for (const age of [0,.06,.16,.22]) {
    const effect={x:10,y:20,angle:.3,range:240,halfAngle:2.15,life:.22,age,branch,empowered:true},before=JSON.stringify(effect);
    const calls=drawingCalls(ctx=>drawSlash(ctx,effect,reduced));
    for(const call of calls.filter(c=>c[0]==='arc')) { assert.ok(call[3]<=effect.range);assert.ok(Math.abs(call[5]-call[4])<=1.23); }
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

test('projectile wakes stay behind travel, stop fluttering in reduced motion and freeze with the shot clock', () => {
  for (const kind of [undefined, 'crescent']) {
    const shot = {kind, x:0, y:0, vx:290, vy:0, life:kind ? .6 : 1.6, blast:true};
    const before = JSON.stringify(shot), calls = drawingCalls(ctx => drawProjectile(ctx, shot));
    assert.deepEqual(calls, drawingCalls(ctx => drawProjectile(ctx, shot)));
    assert.equal(JSON.stringify(shot), before);
    assert.ok(calls.length < 100);
    const firstMove = calls.find(c => c[0] === 'moveTo');
    assert.ok(firstMove[1] < -12 && firstMove[1] >= -64, 'wake is short and behind the head');
    const calm = life => drawingCalls(ctx => drawProjectile(ctx, {...shot, life}, true));
    assert.deepEqual(calm(.3), calm(.5));
    for (const c of calls) for (const n of c.slice(1).filter(v => typeof v === 'number')) assert.ok(Number.isFinite(n));
  }
});

test('rune wakes follow the rear of the actual orbit without becoming a range ring', () => {
  const player = {x:15,y:-30};
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) for (const radius of [45, 110]) {
    const orb = {x:player.x + Math.cos(angle)*radius, y:player.y + Math.sin(angle)*radius};
    const before = JSON.stringify({orb,player}), calls = drawingCalls(ctx => drawOrbitWake(ctx, orb, player));
    assert.equal(JSON.stringify({orb,player}),before);
    assert.deepEqual(calls, drawingCalls(ctx => drawOrbitWake(ctx, orb, player)));
    assert.ok(!calls.some(c => c[0] === 'arc')); assert.ok(calls.length < 25);
    for (const c of calls.filter(c => c[0] === 'moveTo')) {
      assert.ok(Math.cos(angle)*c[2] - Math.sin(angle)*c[1] < 0, 'ribbon stays behind counterclockwise travel');
      assert.ok(Math.abs(Math.hypot(c[1],c[2])-radius) < 1e-8);
    }
    assert.deepEqual(drawingCalls(ctx => drawOrbitWake(ctx,orb,player,true)),[]);
  }
  assert.deepEqual(drawingCalls(ctx => drawOrbitWake(ctx,player,player)),[]);
});

test('stretched rune wakes stay on the same ellipse as the real collision heads without mutating it',()=>{
  const g=createGame(42,'grove');g.ranks.orbit=5;advanceOrbitShape(g,3,1,0);g.time=.23;
  const before=JSON.stringify(g),radius=orbitPositions(g)[0].radius;
  for(const orb of orbitPositions(g)) {
    const calls=drawingCalls(ctx=>drawOrbitWake(ctx,orb,g.player));
    for(const c of calls.filter(c=>c[0]==='moveTo'))assert.ok(Math.abs(Math.hypot(c[1]/g.orbitShape.xx,c[2]/g.orbitShape.yy)-radius)<1e-7);
    assert.deepEqual(drawingCalls(ctx=>drawOrbitWake(ctx,orb,g.player,true)),[]);
  }
  assert.equal(JSON.stringify(g),before);
});

test('painted companions carry bounded body weight at the real strike and settle without moving gameplay', () => {
  for (const id of ['ash','ember','grove']) {
    const game=createGame(42,id);game.swing={age:.16,angle:0};
    assert.ok(companionActionPose(game).x < 0);
    game.swing.age=.18;
    const before=JSON.stringify(game), hit=companionActionPose(game);
    assert.ok(hit.x > 9 && hit.x < 14); assert.ok(Math.abs(hit.tilt) <= .06);
    assert.ok(hit.sx >= .94 && hit.sy <= 1.06); assert.equal(JSON.stringify(game), before);
    assert.deepEqual(companionActionPose(game),hit);
    game.swing.age=.54;assert.ok(Math.abs(companionActionPose(game).x) < .05);
    assert.deepEqual(companionActionPose(game,true),{});
    game.player.hurt=.1;assert.deepEqual(companionActionPose(game),{});
    game.player.hurt=0;game.outcome='defeat';assert.deepEqual(companionActionPose(game),{});
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

test('spore plumes appear at actual activation and stay inside the existing footprint', () => {
  for (const royal of [false,true]) {
    const rule=royal?CHAMPION_SPORE:SPORE;
    const game={time:1,enemies:[],spores:[{x:0,y:0,age:rule.windup-.001,royal}]};
    assert.ok(!drawingCalls(ctx=>drawEnemyWarnings(ctx,game,false)).some(c=>c[0]==='ellipse'));
    game.spores[0].age=rule.windup;
    const before=JSON.stringify(game),calls=drawingCalls(ctx=>drawEnemyWarnings(ctx,game,false));
    assert.deepEqual(calls,drawingCalls(ctx=>drawEnemyWarnings(ctx,game,false)));
    assert.equal(JSON.stringify(game),before);assert.ok(calls.length<90);
    const plumes=calls.filter(c=>c[0]==='ellipse');assert.equal(plumes.length,5);
    for(const c of plumes)assert.ok(Math.hypot(c[1],c[2])+Math.max(c[3],c[4])<rule.radius);
    const calm=drawingCalls(ctx=>drawEnemyWarnings(ctx,game,true));
    game.spores[0].age+=.4;
    assert.deepEqual(calm,drawingCalls(ctx=>drawEnemyWarnings(ctx,game,true)));
    assert.ok(!calls.some(c=>['fillText','strokeText','setLineDash'].includes(c[0])));
  }
});

test('slam anticipation intensifies once without enlarging the damage footprint', () => {
  for(const elite of [false,true]) {
    const rule=elite?SLAM:GIANT,slam={x:20,y:30,age:0,hit:false};
    const game={time:0,spores:[],enemies:[{type:2,elite,slam}]};
    let previous=0;
    for(const progress of [0,.65,.8,.95,1]) {
      slam.age=rule.windup*progress;
      const before=JSON.stringify(game),calls=drawingCalls(ctx=>drawEnemyWarnings(ctx,game,false));
      assert.equal(JSON.stringify(game),before);
      assert.deepEqual(calls.filter(c=>c[0]==='arc'),[['arc',20,30,rule.radius,0,Math.PI*2]]);
      const width=calls.filter(c=>c[0]==='lineWidth').at(-1)[1];
      assert.ok(width>=previous && width<=3);previous=width;
      assert.deepEqual(calls,drawingCalls(ctx=>drawEnemyWarnings(ctx,game,true)));
    }
    slam.hit=true;
    assert.ok(!drawingCalls(ctx=>drawEnemyWarnings(ctx,game,false)).some(c=>c[0]==='arc'));
  }
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
  const calmBurst = age => drawingCalls(ctx => drawEmberBurst(ctx, {...effect,age}, true, true));
  assert.deepEqual(calmBurst(.02), calmBurst(.28), 'reduced fire breakup keeps fixed geometry');
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

test('caster poses start at real release and absorption is distinct from HP-loss recoil', () => {
  for (const id of ['ember','grove']) {
    const game=createGame(42,id);game.player.cast=.4;
    assert.equal(companionFrame(game),8);assert.equal(companionFrame(game,true),8);
    if(id==='ember') {
      game.signature.activatedAt=game.time;
      assert.equal(companionFrame(game),12);
    } else {
      game.signature.blockedAt=game.time;
      assert.equal(companionFrame(game),12);
      game.time+=.31;game.player.cast=0;game.player.moving=true;game.player.walk=.4;
      assert.ok(companionFrame(game)<8,'absorption returns to ordinary movement');
    }
    game.player.hurt=.24;assert.equal(companionFrame(game),16);
    game.outcome='defeat';game.player.deathAge=.6;assert.equal(companionFrame(game),23);
    const before=JSON.stringify(game);companionFrame(game);assert.equal(JSON.stringify(game),before);
  }
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

test('boss poses preserve live charge and fired-thorn boundaries through incoming hits', () => {
  const boss={entrance:BOSS.entrance,walk:0,impact:{at:0}};
  assert.equal(bossFrame(boss,0),4);boss.entrance=.1;assert.equal(bossFrame(boss,0),5);
  boss.entrance=0;boss.pattern={kind:'charge',age:BOSS.windup-.001,fired:false};
  assert.equal(bossFrame(boss,0),7);
  boss.pattern.age=BOSS.windup;assert.equal(bossFrame(boss,0),8);
  boss.pattern.age=BOSS.windup+BOSS.chargeDuration;assert.equal(bossFrame(boss,0),10);
  boss.pattern={kind:'thorns',age:BOSS.windup,fired:false};assert.equal(bossFrame(boss,0),13);
  boss.pattern.fired=true;assert.equal(bossFrame(boss,0),14);assert.equal(bossFrame(boss,0,true),14);
  boss.pattern.age=BOSS.windup+.12;assert.equal(bossFrame(boss,0),15);
  boss.pattern.age=BOSS.windup+BOSS.recovery-.001;assert.equal(bossFrame(boss,0),16);
  boss.pattern=null;assert.equal(bossFrame(boss,0),19);
  boss.enraged=true;assert.equal(bossFrame(boss,1,true),17);
  const before=JSON.stringify(boss);bossFrame(boss,1);assert.equal(JSON.stringify(boss),before);
  assert.equal(bossRemnantFrame({age:0,life:.7}),21);
  assert.equal(bossRemnantFrame({age:.53,life:.7}),23);
  assert.equal(bossRemnantFrame({age:0,life:.7},true),23);
});

test('boss root shards follow actual velocity and release fragments stay small', () => {
  const thorn={x:120,y:80,vx:-150,vy:30,age:.1,life:3.7},before=JSON.stringify(thorn);
  for (const reduced of [false,true]) {
    const calls=drawingCalls(ctx=>drawBossThorn(ctx,thorn,reduced));
    assert.deepEqual(calls.find(c=>c[0]==='translate'),['translate',120,80]);
    assert.deepEqual(calls.find(c=>c[0]==='rotate'),['rotate',Math.atan2(30,-150)]);
    assert.deepEqual(calls,drawingCalls(ctx=>drawBossThorn(ctx,thorn,reduced)),'drawing never advances its clock');
    if (reduced) assert.deepEqual(calls,drawingCalls(ctx=>drawBossThorn(ctx,{...thorn,age:1},true)));
    for (const c of calls.filter(c=>['moveTo','lineTo','quadraticCurveTo'].includes(c[0]))) {
      for (const n of c.slice(1)) assert.ok(Number.isFinite(n) && Math.abs(n)<=27,'head and wake stay compact');
    }
    const release=drawingCalls(ctx=>drawBossRelease(ctx,{x:120,y:80,angle:.3,age:.1,life:.4},reduced));
    assert.ok(!release.some(c=>c[0]==='arc'));assert.ok(release.length<60);
  }
  assert.equal(JSON.stringify(thorn),before);
});

test('material hit marks distinguish creatures, ignore stale impacts and keep reduced motion static', () => {
  const marks=[];
  for (const kind of [0,1,2,3]) {
    const enemy={x:10,y:20,size:kind===3?174:86,type:kind,boss:kind===3,impact:{at:1,angle:.5}};
    const before=JSON.stringify(enemy),draw=(time,reduced,detailed=true)=>drawingCalls(ctx=>drawMaterialHit(ctx,enemy,time,reduced,detailed));
    const calls=draw(1.04,false);marks.push(JSON.stringify(calls));
    assert.deepEqual(calls,draw(1.04,false));assert.ok(calls.length<100);
    for(const call of calls)for(const value of call.slice(1).filter(v=>typeof v==='number'))assert.ok(Number.isFinite(value));
    assert.deepEqual(draw(.99,false),[]);assert.deepEqual(draw(1.2,false),[]);
    // Opacity may fade; the static geometry and position cannot fly away.
    const geometry=calls=>calls.filter(c=>c[0]!=='globalAlpha');
    assert.deepEqual(geometry(draw(1.01,true)),geometry(draw(1.12,true)));
    assert.ok(draw(1.04,true).length<calls.length);assert.ok(draw(1.04,false,false).length<calls.length);
    assert.equal(JSON.stringify(enemy),before);
  }
  assert.equal(new Set(marks).size,4);
  assert.deepEqual(drawingCalls(ctx=>drawMaterialHit(ctx,{type:0},1,false)),[]);
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


test('release, rune source and finish marks are bounded, deterministic and static in reduced motion', () => {
  const effect={x:10,y:20,angle:.4,age:.03,life:.18,empowered:true,evolved:true};
  for(const draw of [drawLaunch,drawRuneTouch,drawFinish]) for(const source of ['sword','ember','orbit']) {
    effect.source=source;
    const before=JSON.stringify(effect), calls=drawingCalls(ctx=>draw(ctx,effect));
    assert.deepEqual(calls,drawingCalls(ctx=>draw(ctx,effect)));
    assert.equal(JSON.stringify(effect),before);
    assert.ok(calls.length<60);
    assert.ok(!calls.some(c=>['arc','fillText','strokeText','setLineDash'].includes(c[0])));
    const geometry=age=>drawingCalls(ctx=>draw(ctx,{...effect,age},true)).filter(c=>c[0]!=='globalAlpha');
    assert.deepEqual(geometry(.01),geometry(.08),'reduced motion changes opacity only');
  }
  const rune=drawingCalls(ctx=>drawRuneTouch(ctx,effect));
  assert.deepEqual(rune.find(c=>c[0]==='translate'),['translate',10,8]);
});

test('weapon belt marks evolution readiness even when the weapon rank does not change', () => {
  const g=createGame(42);g.ranks.sword=3;g.ranks.orbit=1;
  const before=weaponBeltKey(weaponLoadout(g));
  assert.equal(weaponPresentation(g,'sword').ready,false);
  g.eliteKills=1;
  assert.equal(weaponPresentation(g,'sword').ready,true);
  assert.equal(weaponPresentation(g,'sword').stageLabel,'진화 가능');
  assert.notEqual(weaponBeltKey(weaponLoadout(g)),before);
  g.ranks.dawn=1;
  assert.equal(weaponPresentation(g,'sword').ready,false);
  assert.equal(weaponPresentation(g,'sword').stageLabel,'진화');
});
