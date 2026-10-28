import test from 'node:test';
import assert from 'node:assert/strict';
import {BURST,canBurst,burstCooldown} from '../src/survivor/burst.js';
import {createGame,startGame,updateGame,pauseGame,resumeGame,spawnEnemy,spawnBoss,stats} from '../src/survivor/game.js';

const run=(id='ash')=>{const g=createGame(42,id);startGame(g);g.spawnClock=999;g.swordClock=999;g.emberClock=999;g.pulseClock=999;g.xpNeed=99999;return g;};
const frames=(g,n,input)=>{for(let i=0;i<n;i++)updateGame(g,1/60,input);};

test('a breakthrough travels one bounded normalized path and ignores cooldown requests',()=>{
 const g=run();assert.ok(canBurst(g));
 updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:1}});
 while(g.burst.active)updateGame(g,1/60);
 assert.ok(Math.abs(Math.hypot(g.player.x,g.player.y)-BURST.distance)<1e-8);
 assert.equal(g.burst.uses,1);assert.ok(burstCooldown(g)>3.9);
 frames(g,1,{x:0,y:0,burst:{x:-1,y:0}});frames(g,300);
 assert.equal(g.burst.uses,1);assert.ok(canBurst(g));
 assert.ok(Math.abs(Math.hypot(g.player.x,g.player.y)-BURST.distance)<1e-8);
});

test('a stationary request uses the last movement direction and cannot introduce non-finite positions',()=>{
 const g=run();frames(g,2,{x:0,y:-1});frames(g,2);
 const before=g.player.y;
 updateGame(g,1/60,{x:0,y:0,burst:{x:NaN,y:Infinity}});
 while(g.burst.active)updateGame(g,1/60);
 assert.equal(g.player.x,0);assert.ok(Math.abs(g.player.y-before+BURST.distance)<1e-8);
});

test('pause freezes a partial breakthrough and cooldown, and a fresh run starts ready',()=>{
 const g=run();updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});frames(g,2);
 pauseGame(g);const frozen=JSON.stringify(g);frames(g,300,{x:0,y:0,burst:{x:0,y:1}});
 assert.equal(JSON.stringify(g),frozen);resumeGame(g);
 frames(g,15);assert.equal(g.burst.active,false);assert.ok(Math.abs(g.player.x-BURST.distance)<1e-8);
 const fresh=run();assert.equal(fresh.burst.uses,0);assert.ok(canBurst(fresh));
 g.phase='ended';assert.equal(canBurst(g),false);
});

test('the brief dodge does not extend contact invulnerability through its tail or cooldown',()=>{
 const g=run(),e=spawnEnemy(g,2,false,{x:15,y:0});e.speed=0;e.hp=10000;e.damage=8;
 updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});
 assert.equal(g.player.hp,100);assert.equal(g.player.invincible,0);
 frames(g,12);e.x=g.player.x;e.y=g.player.y;e.knockX=e.knockY=0;
 updateGame(g,1/60);assert.equal(g.player.hp,92);assert.ok(burstCooldown(g)>3);
});

test('all companions strike through their real primary damage exactly once per enemy',()=>{
 for(const [id,source] of [['ash','sword'],['ember','ember'],['grove','orbit']]) {
  const g=run(id),e=spawnEnemy(g,2,false,{x:70,y:0});Object.assign(e,{speed:0,hp:10000,damage:0,orbAt:999});
  const expected=stats(g)[`${source}Damage`]*BURST.damage;
  updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});frames(g,30);
  assert.ok(Math.abs(10000-e.hp-expected)<1e-8,id);
  assert.ok(Math.abs(g.damageDealt[source]-expected)<1e-8,id);
  assert.deepEqual(g.burst.hitIds,[e.id]);
 }
});

test('a breakthrough clears its real path and grants ordinary kills and XP without touching distant enemies',()=>{
 const g=run();
 for(const x of [35,80,125]){const e=spawnEnemy(g,0,false,{x,y:0});e.speed=0;}
 const distant=spawnEnemy(g,0,false,{x:80,y:110});distant.speed=0;
 updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});frames(g,12);
 assert.equal(g.kills,3);assert.equal(g.burst.kills,3);assert.equal(g.burst.hitIds.length,3);
 assert.equal(g.xp+g.gems.reduce((sum,gem)=>sum+gem.value,0),6);
 assert.equal(distant.hp,distant.maxHp);assert.equal(g.player.hp,100);
});

test('burst travel alone cannot charge Ember, while its actual hit retains owned burn effects',()=>{
 const g=run('ember');g.relics=['coal'];
 const e=spawnEnemy(g,2,false,{x:70,y:0});Object.assign(e,{speed:0,hp:10000,damage:0});
 const charge=g.signature.charge;
 updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});frames(g,12);
 assert.equal(g.signature.charge,charge);assert.ok(e.burn);assert.equal(e.burn.damage,8);
});

test('a request during hit stop is accepted once and begins moving when combat resumes',()=>{
 const g=run();g.impactStop=.04;
 updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});
 assert.equal(g.burst.uses,1);assert.equal(g.player.x,0);
 frames(g,20);assert.equal(g.burst.uses,1);assert.ok(Math.abs(g.player.x-BURST.distance)<1e-8);
});

test('breakthrough records actual boss damage once while preserving the entrance protection',()=>{
 for(const entrance of [0,1]) {
  const g=run(),boss=spawnBoss(g);Object.assign(boss,{x:100,y:0,speed:0,attackClock:999,entrance});
  const before=boss.hp;
  updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});frames(g,15);
  if(entrance) {assert.equal(boss.hp,before);assert.equal(g.burst.hitIds.length,0);}
  else {assert.ok(Math.abs(before-boss.hp-22.8)<1e-8);assert.equal(g.burst.hitIds.length,1);assert.equal(boss.healthLoss.length,1);}
 }
});
