import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startGame,spawnEnemy,updateGame,pauseGame,resumeGame,LIMITS} from '../src/survivor/game.js';
import {SPORE,HOUND,GIANT,leaveSpores,enemyTypeAt} from '../src/survivor/enemies.js';
const run=()=>{const g=createGame(42);startGame(g);g.spawnClock=999;g.ranks.sword=0;g.xpNeed=99999;return g;};
const frames=(g,n,input)=>{for(let i=0;i<n;i++)updateGame(g,1/60,input);};
test('spores have a safe warning, bounded duration and real damage only inside',()=>{
 const g=run();g.time=20;leaveSpores(g,{type:0,x:0,y:0});frames(g,40);assert.equal(g.player.hp,100);frames(g,3);assert.equal(g.player.hp,94);assert.equal(g.damageTaken.spore,6);
 g.player.x=100;frames(g,200);assert.equal(g.spores.length,0);assert.equal(g.player.hp,94);
});
test('death leaves capped spaced spores and only once per actual mushroom kill',()=>{
 const g=run();g.time=20;g.ranks.sword=6;g.swordClock=0;
 spawnEnemy(g,0,false,{x:50,y:0});frames(g,12);assert.equal(g.kills,1);assert.equal(g.spores.length,1);frames(g,5);assert.equal(g.spores.length,1);
 for(let i=0;i<30;i++){g.time+=1;leaveSpores(g,{type:0,x:i*80,y:80});}
 assert.equal(g.spores.length,SPORE.limit);
 const before=run();leaveSpores(before,{type:0,x:0,y:0});assert.equal(before.spores.length,0);
});
test('hound commits to its warning line, hits once, and has a recovery window',()=>{
 const g=run(),e=spawnEnemy(g,1,false,{x:-100,y:0});e.huntClock=0;frames(g,1);assert.ok(e.hunt);assert.equal(e.hunt.angle,0);
 frames(g,44);assert.equal(e.x,-100);assert.equal(g.player.hp,100);
 frames(g,28);assert.equal(g.damageTaken.hunt,HOUND.damage);assert.equal(e.hunt.hit,true);
 const x=e.x;frames(g,15);assert.equal(e.x,x);assert.equal(g.damageTaken.hunt,HOUND.damage);
 frames(g,30);assert.equal(e.hunt,null);assert.ok(e.huntClock>0);
});
test('lateral escape avoids the fixed dash and slowing affects charge travel',()=>{
 const g=run(),e=spawnEnemy(g,1,false,{x:-100,y:0});e.huntClock=0;frames(g,1);frames(g,80,{x:0,y:1});assert.equal(g.damageTaken.hunt,0);assert.equal(e.hunt.angle,0);
 const slow=run(),hound=spawnEnemy(slow,1,false,{x:-100,y:0});hound.huntClock=0;hound.slowUntil=999;frames(slow,60);assert.ok(hound.x< -25,'slow reduces distance travelled during the charge');
});
test('ordinary giants lock a visible target and use their own radius and damage',()=>{
 const g=run(),e=spawnEnemy(g,2,false,{x:110,y:0});e.attackClock=0;frames(g,1);assert.equal(e.slam.radius,GIANT.radius);assert.equal(e.slam.windup,GIANT.windup);
 frames(g,64);assert.equal(g.player.hp,100);frames(g,6);assert.equal(g.damageTaken.slam,GIANT.damage);
 const evade=run(),other=spawnEnemy(evade,2,false,{x:110,y:0});other.attackClock=0;frames(evade,1);frames(evade,80,{x:0,y:1});assert.equal(other.slam.y,0);assert.equal(evade.damageTaken.slam,0);
});
test('simultaneous threats, pause, death ordering and restart remain bounded',()=>{
 const g=run();g.player.invincible=999;
 for(let i=0;i<10;i++){const e=spawnEnemy(g,i%2?1:2,false,{x:110,y:i*2});e.huntClock=e.attackClock=0;}
 frames(g,1);assert.ok(g.enemies.filter(e=>e.hunt).length<=2);assert.ok(g.enemies.filter(e=>e.slam).length<=1);
 g.time=20;leaveSpores(g,{type:0,x:0,y:0});const before=JSON.stringify({spores:g.spores,hunts:g.enemies.map(e=>e.hunt),slams:g.enemies.map(e=>e.slam)});pauseGame(g);frames(g,100);assert.equal(JSON.stringify({spores:g.spores,hunts:g.enemies.map(e=>e.hunt),slams:g.enemies.map(e=>e.slam)}),before);
 resumeGame(g);g.player.invincible=0;g.player.hp=1;g.spores[0].age=SPORE.windup;frames(g,1);assert.equal(g.outcome,'defeat');assert.equal(g.phase,'ended');assert.ok(g.effects.length<=LIMITS.effects);
 assert.deepEqual(createGame().spores,[]);assert.deepEqual(createGame().enemyLessons,[]);
});
test('wave composition changes at exact boundaries while preserving a gentle start',()=>{
 for(const roll of [0,.5,.99])assert.equal(enemyTypeAt(29.99,roll),0);
 assert.equal(enemyTypeAt(30,.9),1);assert.equal(enemyTypeAt(89.99,.99),1);assert.equal(enemyTypeAt(90,.99),2);
 assert.equal(enemyTypeAt(150,.6),1);assert.equal(enemyTypeAt(210,.8),2);assert.equal(enemyTypeAt(240,.8),1);
});
test('killing a winding-up attacker cancels its hit and distant recycling clears its old target',()=>{
 for(const type of [1,2]) {
  const g=run(),e=spawnEnemy(g,type,false,{x:60,y:0});e.huntClock=e.attackClock=0;e.hp=1;
  frames(g,1);assert.ok(e.hunt||e.slam);
  g.ranks.sword=6;g.swordClock=0;frames(g,100);
  assert.equal(g.kills,1);assert.equal(g.damageTaken.hunt+g.damageTaken.slam,0);
  const distant=run(),other=spawnEnemy(distant,type,false,{x:60,y:0});other.huntClock=other.attackClock=0;
  frames(distant,1);assert.ok(other.hunt||other.slam);distant.player.x=2000;frames(distant,1);
  assert.equal(other.hunt,null);assert.equal(other.slam,null);assert.ok(Math.hypot(other.x-distant.player.x,other.y-distant.player.y)<1200);
 }
});
