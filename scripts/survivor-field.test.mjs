import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startGame,updateGame,pauseGame,resumeGame,spawnEnemy,LIMITS} from '../src/survivor/game.js';
import {RECOVERY,healPlayer,nearestRecovery} from '../src/survivor/field.js';

function emptyRun(){const game=createGame(42);startGame(game);game.spawnClock=999;game.nextElite=999;return game;}
test('recovery appears only three times, keeps full-health fruit, and heals actual missing HP once',()=>{
  const game=emptyRun();game.time=74.99;updateGame(game,1/60);
  assert.equal(game.supplies.length,1);const fruit=nearestRecovery(game);
  assert.ok(Math.abs(fruit.distance-115)<.01);
  game.player.x=fruit.x;game.player.y=fruit.y;updateGame(game,1/60);assert.equal(game.supplies.length,1);
  game.player.hp=90;updateGame(game,1/60);
  assert.equal(game.player.hp,100);assert.equal(game.healing.field,10);assert.equal(game.supplies.length,0);
  updateGame(game,1/60);assert.equal(game.healing.field,10);
  game.time=224.99;updateGame(game,1/60);assert.equal(game.nextRecovery,3);assert.equal(game.supplies.length,2);
  game.time=299;updateGame(game,1/60);assert.equal(game.nextRecovery,3);assert.ok(game.supplies.length<=RECOVERY.limit);
});
test('fruit and recovery feedback freeze during pause and expire using simulation time',()=>{
  const game=emptyRun();game.time=75;game.player.hp=40;updateGame(game,1/60);
  const fruit=game.supplies[0],age=fruit.age;pauseGame(game);updateGame(game,1);assert.equal(fruit.age,age);
  resumeGame(game);fruit.age=RECOVERY.lifetime-.001;updateGame(game,1/60);assert.equal(game.supplies.length,0);
  assert.equal(game.player.hp,40);
});
test('a lethal contact cannot be undone by a nearby fruit in the same step',()=>{
  const game=emptyRun();game.player.hp=1;game.supplies.push({x:0,y:0,age:0});spawnEnemy(game,0,false,{x:0,y:0});updateGame(game,1/60);
  assert.equal(game.phase,'ended');assert.equal(game.outcome,'defeat');assert.equal(game.player.hp,0);assert.equal(game.healing.field,0);
});
test('healing feedback is independent of a saturated decorative effect budget',()=>{
  const game=emptyRun();game.player.hp=50;game.effects=Array.from({length:LIMITS.effects},()=>({age:0,life:1}));
  assert.equal(healPlayer(game,25,'field'),25);assert.equal(game.recoveryFlash.amount,25);assert.equal(game.effects.length,LIMITS.effects);
});
test('killed enemies leave bounded, non-colliding remnants that expire',()=>{
  const game=emptyRun();game.player.invincible=999;game.ranks.sword=6;game.swordClock=0;game.xpNeed=9999;
  for(let i=0;i<60;i++){const enemy=spawnEnemy(game,0,false,{x:45+(i%5),y:(i%3)-1});enemy.hp=1;}
  for(let i=0;i<16;i++)updateGame(game,1/60);
  assert.ok(game.kills>LIMITS.remnants);assert.equal(game.enemies.length,60-game.kills);assert.equal(game.player.hp,100);
  assert.ok(game.remnants.length>0);assert.ok(game.remnants.length<=LIMITS.remnants);
  for(let i=0;i<20;i++)updateGame(game,1/60);
  assert.equal(game.remnants.length,0);
});
