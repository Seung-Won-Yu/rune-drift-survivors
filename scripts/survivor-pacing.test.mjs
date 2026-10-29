import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startGame, updateGame, chooseUpgrade, spawnEnemy, spawnChampion, pauseGame, resumeGame, LIMITS, draftUpgrades, rerollUpgrades } from '../src/survivor/game.js';
import { combatPacing, spawnPlan, PACING } from '../src/survivor/pacing.js';
import { SWARMS, SWARM_WINDOW } from '../src/survivor/swarms.js';

const swarmGame = () => {
  const g = createGame(42); startGame(g);
  Object.assign(g, {time:21.99, spawnClock:999, nextElite:999, xpNeed:1e9});
  g.player.invincible=999;
  return g;
};
const advance = (g, seconds) => { for(let i=0;i<Math.ceil(seconds*60);i++) updateGame(g,1/60); };

test('opening brings real enemies within reach without replaying after pause', () => {
  for(const character of ['ash','ember','grove']) {
    const g=createGame(42,character);startGame(g);advance(g,.5);
    assert.equal(g.swarms.opening,true);assert.equal(g.enemies.length,7);
    assert.ok(g.enemies.filter(e=>e.xp===1).every(e=>Math.hypot(e.x,e.y)<200));
    g.spawnClock=999;g.ranks.sword=g.ranks.ember=g.ranks.orbit=0;
    pauseGame(g);const before=JSON.stringify(g);advance(g,2);assert.equal(JSON.stringify(g),before);
    resumeGame(g);advance(g,.1);assert.equal(g.enemies.length,7);
  }
});

test('a swarm is a breakable front of real enemies and only real kills recall earned XP', () => {
  const g=swarmGame();updateGame(g,1/30);
  const active=g.swarms.active;
  assert.equal(active.total,SWARMS[0].count);
  assert.equal(g.enemies.length,active.total);
  assert.equal(combatPacing(g).kind,'swarm');assert.equal(g.xp,0);
  g.gems.push({x:280,y:0,value:2,age:0},{x:380,y:0,value:2,age:0});
  const [near,far]=g.gems;
  for(const e of g.enemies) {e.x=70;e.y=0;e.speed=0;}
  g.level=3;g.ranks.sword=2;g.ranks.sweep=1;g.swordClock=0;
  advance(g,.25);
  assert.equal(g.kills,active.total);assert.equal(g.swarms.cleared,1);
  assert.equal(g.swarms.active,null);assert.equal(combatPacing(g).kind,'harvest');
  assert.equal(near.recalled,true);assert.equal(far.recalled,undefined);
  assert.equal(g.gems.filter(gem=>gem.recalled).length,active.total+1);
  assert.equal(g.events.filter(e=>e==='swarm-cleared').length,1);
  assert.equal(createGame().swarms.cleared,0);
});

test('an unbroken wave times out without free XP, and choices freeze its real deadline', () => {
  const g=swarmGame();g.ranks.sword=0;updateGame(g,1/30);
  const active=structuredClone(g.swarms.active), count=g.enemies.length;
  for(const phase of ['paused','upgrade','relic','event','preview']) {
    g.phase=phase;advance(g,2);assert.deepEqual(g.swarms.active,active);
  }
  g.phase='playing';advance(g,SWARM_WINDOW+.1);
  assert.equal(g.swarms.active,null);assert.equal(g.swarms.missed,1);
  assert.equal(g.swarms.cleared,0);assert.equal(g.xp,0);assert.equal(g.enemies.length,count);
});

test('crowded fields defer a swarm without replacing enemies and the boss cancels pending pressure', () => {
  const g=swarmGame();g.ranks.sword=0;
  for(let i=0;i<LIMITS.enemies;i++) spawnEnemy(g,0,false,{x:500+i*40,y:500});
  const ids=g.enemies.map(e=>e.id);
  updateGame(g,1/30);assert.equal(g.swarms.active,null);assert.ok(g.swarms.pending);
  assert.deepEqual(g.enemies.map(e=>e.id),ids);
  g.enemies=[];updateGame(g,1/30);assert.equal(g.swarms.active.total,14);
  g.time=239.99;updateGame(g,1/30);
  assert.equal(g.bossSpawned,true);assert.equal(g.swarms.active,null);assert.equal(g.swarms.pending,null);
  assert.equal(combatPacing(g).kind,'boss');
});

test('specialization drafts and rerolls agree on the earlier commitment gate', () => {
  for(const level of [2,3]) for(const rank of [1,2]) {
    const g=createGame(42);g.level=level;g.ranks.sword=rank;g.phase='upgrade';g.choices=draftUpgrades(g);
    assert.equal(g.choices.includes('sweep'),level===3&&rank===2);
    g.choices=['sweep'];assert.equal(chooseUpgrade(g,'sweep'),level===3&&rank===2);
    if(level!==3||rank!==2) {
      g.phase='upgrade';g.choices=['sword','ember','fleet'];rerollUpgrades(g);
      assert.ok(!g.choices.some(key=>['sweep','duelist'].includes(key)));
    }
  }
});

test('a minute champion cannot evict the last target of a delayed swarm', () => {
  const g=swarmGame();updateGame(g,1/30);
  const active=g.swarms.active;
  for(const e of g.enemies) {e.x=1100;e.y=0;}
  while(g.enemies.length<LIMITS.enemies) spawnEnemy(g,0,false,{x:300,y:0});
  assert.ok(spawnChampion(g,0));
  assert.equal(g.enemies.length,LIMITS.enemies);
  assert.equal(g.enemies.filter(e=>e.swarm===active.id).length,active.total);
});

test('pacing covers every boundary and keeps the four-minute boss supply unchanged', () => {
  const g = createGame(42);
  for (const beat of PACING) {
    g.time = beat.until - .001;
    assert.equal(combatPacing(g).kind, beat.kind);
    assert.ok(combatPacing(g).remaining > 0);
    g.time = beat.until;
    assert.ok(combatPacing(g).remaining >= 0);
    assert.ok(spawnPlan(g).interval > 0);
  }
  for (const time of [240, 250, 300]) {
    g.time = time; g.evolutionBreatherUntil = 999;
    assert.equal(combatPacing(g).kind, 'boss');
    assert.deepEqual(spawnPlan(g), { interval: 1.6, count: 1 });
  }
});

test('ordinary packs build density after the opening without flooding the boss encounter',()=>{
  const g=createGame(42);
  for(const [time,count] of [[0,1],[15,1],[15.01,2],[70,2],[70.01,3],[180,3],[180.01,4],[240,1]]) {
    g.time=time;assert.equal(spawnPlan(g).count,count);
  }
});

test('real spawns ebb after a surge while living enemies and XP keep their value', () => {
  const samples = [];
  for (const time of [120, 132]) {
    const g = createGame(42); startGame(g); g.time = time; g.nextElite = 999;
    g.ranks.sword = 0; g.player.invincible = 999; g.xpNeed = 99999;
    const survivor = spawnEnemy(g, 2, false, { x: 500, y: 0 });
    const hp = survivor.hp, xp = survivor.xp;
    for (let i = 0; i < 600; i++) updateGame(g, 1 / 60);
    assert.ok(g.enemies.includes(survivor));
    assert.equal(survivor.hp, hp); assert.equal(survivor.xp, xp);
    samples.push(g.enemies.length - 1);
  }
  assert.ok(samples[0] > samples[1] * 1.7, `surge ${samples[0]}, rest ${samples[1]}`);
  assert.ok(samples[1] > 0, 'rest still has ordinary reinforcements');
});

test('all real evolution choices grant eight simulation seconds, freeze on pause and reset', () => {
  for (const key of ['dawn', 'comet', 'lunar']) {
    const g = createGame(42); g.phase = 'upgrade'; g.time = 100; g.choices = [key];
    assert.ok(chooseUpgrade(g, key));
    assert.equal(combatPacing(g).kind, 'evolution');
    assert.equal(combatPacing(g).remaining, 8);
    const interval = spawnPlan(g).interval;
    pauseGame(g); updateGame(g, 1 / 30);
    assert.equal(combatPacing(g).remaining, 8);
    resumeGame(g); updateGame(g, 1 / 30);
    assert.ok(combatPacing(g).remaining < 8);
    g.time = 108;
    assert.equal(combatPacing(g).kind, 'build');
    assert.ok(spawnPlan(g).interval < interval);
    assert.equal(createGame(42).evolutionBreatherUntil, 0);
  }
});

test('ordinary upgrades do not grant relief and chained evolutions do not stack duration', () => {
  const g = createGame(42); g.phase = 'upgrade'; g.choices = ['sword'];
  chooseUpgrade(g, 'sword'); assert.equal(g.evolutionBreatherUntil, 0);
  for (const key of ['dawn', 'comet']) {
    g.phase = 'upgrade'; g.time = 100; g.choices = [key]; chooseUpgrade(g, key);
    assert.equal(g.evolutionBreatherUntil, 108);
  }
  g.phase = 'upgrade'; g.time = 238; g.choices = ['lunar']; chooseUpgrade(g, 'lunar');
  assert.equal(combatPacing(g).remaining, 2);
  g.time = 239.99; g.player.invincible = 999;
  updateGame(g, 1 / 30);
  assert.ok(g.bossSpawned); assert.equal(combatPacing(g).kind, 'boss');
});

test('relief never postpones a scheduled elite and frozen choice screens consume no time', () => {
  const g = createGame(42); startGame(g); g.time = 59.99; g.evolutionBreatherUntil = 67;
  updateGame(g, 1 / 30);
  assert.equal(g.enemies.filter(e => e.elite).length, 1);
  for (const phase of ['upgrade', 'relic', 'event', 'paused', 'ended']) {
    g.phase = phase; const time = g.time, remaining = combatPacing(g).remaining;
    updateGame(g, 1 / 30);
    assert.equal(g.time, time); assert.equal(combatPacing(g).remaining, remaining);
  }
});

test('late formations commit across the travel route with an open, offset corridor', () => {
  for (const time of [154,212]) for (const input of [{x:1,y:0},{x:0,y:-1}]) {
    const g=swarmGame();g.time=time-.01;g.ranks.sword=0;
    updateGame(g,1/30,input);
    const pack=g.enemies.filter(e=>e.swarm===time), count=SWARMS.find(b=>b.at===time).count;
    assert.equal(pack.length,count);assert.equal(g.swarms.active.marching,true);
    const lateral=pack.map(e=>(e.x-g.player.x)*-input.y+(e.y-g.player.y)*input.x).sort((a,b)=>a-b);
    assert.ok(lateral.some((n,i)=>i>0&&n-lateral[i-1]>130),'a real corridor remains between columns');
    assert.ok(pack.every(e=>Math.hypot(e.x-g.player.x,e.y-g.player.y)>300),'no spawning on top of the player');
    const original=pack.map(e=>({x:e.x,y:e.y,march:{...e.march}}));
    updateGame(g,1/30,{x:-input.x,y:-input.y});
    pack.forEach((e,i)=>{
      assert.deepEqual(e.march,original[i].march,'turning does not retarget the front');
      assert.ok((e.x-original[i].x)*input.x+(e.y-original[i].y)*input.y<0,'the front crosses its committed direction');
    });
    assert.equal(g.xp,0);assert.equal(g.kills,0);
  }
});

test('marching freezes in menus, respects slowing and returns to pursuit after five combat seconds',()=>{
  const g=swarmGame();g.time=153.99;g.ranks.sword=0;updateGame(g,1/30,{x:1,y:0});
  const e=g.enemies[0], before={x:e.x,y:e.y,until:e.march.until};
  pauseGame(g);advance(g,3);assert.equal(e.x,before.x);assert.equal(e.y,before.y);assert.equal(e.march.until,before.until);
  resumeGame(g);e.slowUntil=g.time+2;
  const start=e.x;updateGame(g,1/60);assert.ok(Math.abs(start-e.x-140*.7/60)<1e-6);
  g.time=e.march.until;updateGame(g,1/60);assert.equal(e.march,null);
  assert.equal(g.swarms.cleared,0);assert.equal(g.xp,0);
});

test('late fronts stay breakable and the boss cancels their directional movement',()=>{
  const g=swarmGame();g.time=153.99;g.ranks.sword=0;updateGame(g,1/30,{x:1,y:0});
  const pack=g.enemies.slice();
  for(const e of pack){e.x=60;e.y=0;e.speed=0;e.march=null;}
  g.ranks.sword=3;g.ranks.sweep=1;g.swordClock=0;advance(g,.25);
  assert.equal(g.kills,pack.length);assert.equal(g.swarms.cleared,1);
  assert.ok(g.gems.length>0,'only real kills produce loot');
  const h=swarmGame();h.time=211.99;h.ranks.sword=0;updateGame(h,1/30,{x:1,y:0});
  const surviving=h.enemies.slice();h.time=239.99;updateGame(h,1/30);
  assert.ok(h.bossSpawned);assert.ok(surviving.every(e=>!e.march));
});

test('changing lane can avoid real front contact while walking straight meets the line',()=>{
  const outcomes=[];
  for(const lane of ['straight','gap']) {
    const g=swarmGame();g.time=153.99;g.ranks.sword=0;g.player.invincible=0;
    updateGame(g,1/60,{x:1,y:0});
    const ys=g.enemies.map(e=>e.y).sort((a,b)=>a-b);
    let gap=null;for(let i=1;i<ys.length;i++)if(ys[i]-ys[i-1]>130)gap=(ys[i]+ys[i-1])/2;
    assert.notEqual(gap,null);
    for(let i=0;i<140;i++)updateGame(g,1/60,lane==='gap'&&Math.abs(g.player.y-gap)>3
      ?{x:0,y:Math.sign(gap-g.player.y)}:{x:1,y:0});
    outcomes.push(g.player.hp);assert.equal(g.kills,0);
  }
  assert.ok(outcomes[0]<100);assert.equal(outcomes[1],100);
});
