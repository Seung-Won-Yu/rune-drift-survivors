import test from 'node:test';
import { createPilot } from '../src/survivor/qa-pilot.js';
import { BOSS } from '../src/survivor/boss.js';
import assert from 'node:assert/strict';
import { createGame, startGame, updateGame, spawnEnemy, chooseUpgrade, draftUpgrades, pauseGame, resumeGame, stats, RUN_SECONDS, LIMITS, canEvolve, SLAM, spawnBoss, EVOLUTIONS, upgradeChange } from '../src/survivor/game.js';

const playing=()=>{const g=createGame(42);startGame(g);g.spawnClock=999;return g;};
const frames=(g,n,input)=>{for(let i=0;i<n;i++)updateGame(g,1/60,input);};
test('movement is diagonal-normalized and freezes on pause',()=>{const g=playing();frames(g,60,{x:1,y:1});assert.ok(Math.abs(Math.hypot(g.player.x,g.player.y)-168)<.01);pauseGame(g);const t=g.time;frames(g,60,{x:1,y:0});assert.equal(g.time,t);resumeGame(g);frames(g,1,{x:1,y:0});assert.ok(g.time>t);});
test('sword anticipation precedes damage and kill produces collectable XP',()=>{const g=playing();const e=spawnEnemy(g,0,false,{x:65,y:0});e.speed=0;frames(g,15);assert.equal(g.kills,0);frames(g,14);assert.equal(g.kills,1);assert.equal(g.damageDealt.sword,15);assert.ok(g.gems.length||g.xp>0);frames(g,35,{x:1,y:0});assert.equal(g.xp,2);});
test('contact invulnerability prevents overlapping enemies draining HP in one step',()=>{const g=playing();for(let i=0;i<6;i++)spawnEnemy(g,0,false,{x:0,y:0});frames(g,1);assert.equal(g.player.hp,92);frames(g,20);assert.equal(g.player.hp,92);});
test('level up freezes gameplay and only an offered upgrade applies',()=>{const g=playing();g.gems.push({x:0,y:0,value:10,age:0});frames(g,1);assert.equal(g.phase,'upgrade');assert.equal(g.level,2);assert.equal(g.choices.length,3);assert.equal(new Set(g.choices).size,3);const t=g.time;frames(g,60);assert.equal(g.time,t);assert.equal(chooseUpgrade(g,'not-an-upgrade'),false);assert.equal(chooseUpgrade(g,'ember'),true);assert.equal(g.ranks.ember,1);assert.equal(g.phase,'playing');assert.equal(chooseUpgrade(g,'ember'),false);});
test('ember and orbit unlocks cause real damage',()=>{for(const weapon of ['ember','orbit']){const g=playing();g.ranks[weapon]=1;g.swordClock=999;const e=spawnEnemy(g,2,false,{x:weapon==='ember'?160:60,y:0});e.speed=0;frames(g,150);assert.ok(g.damageDealt[weapon]>0,weapon);}});
test('ember follows a target that changes position after launch',()=>{const g=playing();g.ranks.ember=1;g.emberClock=0;g.swordClock=999;const e=spawnEnemy(g,2,false,{x:220,y:0});e.speed=0;frames(g,1);assert.equal(g.shots.length,1);e.y=140;frames(g,1);assert.ok(g.shots[0].vy>100);frames(g,60);assert.ok(g.damageDealt.ember>0);});
test('surplus XP queues another choice without discarding experience',()=>{const g=playing();g.gems.push({x:0,y:0,value:30,age:0});frames(g,1);assert.equal(g.level,2);chooseUpgrade(g,'ember');assert.equal(g.phase,'upgrade');assert.equal(g.level,3);assert.equal(g.xp,7);assert.ok(g.choices.includes('orbit'));chooseUpgrade(g,'orbit');assert.equal(g.phase,'playing');});
test('maxed upgrade drafts fall back to repeatable recovery',()=>{const g=playing();Object.assign(g.ranks,{sword:6,ember:5,orbit:5,fleet:4,magnet:4,vitality:4});g.phase='upgrade';g.choices=draftUpgrades(g);assert.deepEqual(g.choices,['heal']);g.player.hp=10;assert.equal(chooseUpgrade(g,'heal'),true);assert.equal(g.player.hp,50);});
test('time limit with a living boss is survival rather than a boss victory',()=>{const g=playing();g.time=RUN_SECONDS-.005;frames(g,1);assert.equal(g.outcome,'survived');assert.equal(g.time,RUN_SECONDS);assert.equal(createGame().kills,0);assert.equal(createGame().ranks.ember,0);});
test('death takes precedence over attacks and rewards',()=>{const g=playing();g.player.hp=1;spawnEnemy(g,0,false,{x:0,y:0});frames(g,1);assert.equal(g.phase,'ended');assert.equal(g.outcome,'defeat');assert.equal(g.player.hp,0);});
test('entity caps and seeded simulation remain bounded',()=>{const a=playing(),b=playing();for(const g of [a,b]){for(let i=0;i<300;i++)spawnEnemy(g);assert.equal(g.enemies.length,LIMITS.enemies);frames(g,300,{x:1,y:0});}assert.equal(a.player.x,b.player.x);assert.deepEqual(a.enemies,b.enemies);assert.ok(Number.isFinite(stats(a).speed));});
test('evolution requires all three conditions and is guaranteed once eligible',()=>{
  const g=playing();g.ranks.sword=3;g.ranks.orbit=1;
  assert.equal(canEvolve(g),false);assert.ok(!draftUpgrades(g).includes('dawn'));
  g.eliteKills=1;assert.equal(draftUpgrades(g)[0],'dawn');
  const before=stats(g);g.phase='upgrade';g.choices=draftUpgrades(g);chooseUpgrade(g,'dawn');
  assert.equal(stats(g).swordDamage,before.swordDamage+20);
  assert.equal(stats(g).swordRange,before.swordRange+38);
  assert.ok(!draftUpgrades(g).includes('dawn'));assert.equal(createGame().ranks.dawn,0);
});
test('evolved crescent pierces targets beyond the sword without repeat hits',()=>{
  const g=playing();g.ranks.dawn=1;g.swordClock=999;
  const a=spawnEnemy(g,2,false,{x:210,y:0}),b=spawnEnemy(g,2,false,{x:250,y:0});a.speed=b.speed=0;
  g.shots.push({kind:'crescent',x:150,y:0,vx:330,vy:0,life:.85,damage:20,hitIds:[]});
  frames(g,60);assert.equal(a.hp,75);assert.equal(b.hp,75);assert.equal(g.damageDealt.sword,40);
});
test('elite slam locks its target, pauses during upgrades and allows an escape',()=>{
  const g=playing();g.swordClock=999;const e=spawnEnemy(g,2,true,{x:180,y:0});e.attackClock=0;frames(g,1);
  assert.equal(e.slam.x,0);assert.equal(g.player.hp,100);
  pauseGame(g);const age=e.slam.age;frames(g,60);assert.equal(e.slam.age,age);resumeGame(g);
  frames(g,60,{x:-1,y:0});assert.equal(e.slam.x,0);assert.equal(g.player.hp,100);assert.equal(e.slam.hit,true);
});
test('elite impact damages once at the displayed radius and death cancels an unfinished slam',()=>{
  const g=playing();g.swordClock=999;const e=spawnEnemy(g,2,true,{x:180,y:0});e.attackClock=0;
  frames(g,50);assert.equal(g.player.hp,100);frames(g,10);assert.equal(g.player.hp,100-SLAM.damage);assert.equal(g.damageTaken.slam,SLAM.damage);assert.equal(g.damageTaken.contact,0);
  frames(g,25);assert.equal(g.player.hp,100-SLAM.damage);
  const h=playing();const target=spawnEnemy(h,2,true,{x:62,y:0});target.attackClock=0;target.hp=1;
  frames(h,65);assert.equal(h.eliteKills,1);assert.equal(h.player.hp,100);
});
test('final boss arrives once even when the enemy cap is full',()=>{
  const g=playing();g.player.invincible=999;
  for(let i=0;i<LIMITS.enemies;i++)spawnEnemy(g);
  g.time=BOSS.arrival-.01;frames(g,1);
  assert.equal(g.bossSpawned,true);assert.equal(g.enemies.length,LIMITS.enemies);
  assert.equal(g.enemies.filter(e=>e.boss).length,1);assert.equal(spawnBoss(g),null);
  assert.ok(g.events.includes('boss-arrival'));
});
test('boss windup fixes a charge lane and lateral movement avoids the hit',()=>{
  const g=playing();g.swordClock=999;const boss=spawnBoss(g);
  Object.assign(boss,{x:180,y:0,entrance:0,attackClock:0});frames(g,1);
  const angle=boss.pattern.angle;frames(g,80,{x:0,y:1});
  assert.equal(boss.pattern.angle,angle);assert.equal(g.player.hp,100);
  assert.ok(boss.x<180);
});
test('a boss charge hits the marked lane and waits before attacking again',()=>{
  const g=playing();g.swordClock=999;const boss=spawnBoss(g);
  Object.assign(boss,{x:180,y:0,entrance:0,attackClock:0});frames(g,55);assert.equal(g.player.hp,100);
  frames(g,50);assert.equal(g.player.hp,100-BOSS.chargeDamage);assert.equal(g.damageTaken.charge,BOSS.chargeDamage);
  frames(g,45);assert.equal(boss.pattern,null);assert.ok(boss.attackClock>0);
});
test('boss thorns are telegraphed, bounded and stop during an upgrade',()=>{
  const g=playing();g.swordClock=999;const boss=spawnBoss(g);
  Object.assign(boss,{x:180,y:0,entrance:0,attackClock:0,attackIndex:1});
  frames(g,45);assert.equal(g.thorns.length,0);frames(g,20);assert.equal(g.thorns.length,7);
  const x=g.thorns[0].x;g.phase='upgrade';frames(g,60);assert.equal(g.thorns[0].x,x);
  g.phase='playing';frames(g,65);assert.ok(g.player.hp<100);
  assert.ok(g.thorns.length<=BOSS.maxThorns);
});
test('boss entrance is protected, real damage wins, and restart clears encounter state',()=>{
  const g=playing();const boss=spawnBoss(g);Object.assign(boss,{x:60,y:0,hp:1,attackClock:999});
  frames(g,30);assert.equal(g.bossDefeated,false);frames(g,120);
  assert.equal(g.bossDefeated,true);assert.equal(g.outcome,'victory');assert.equal(g.phase,'ended');
  const fresh=createGame();assert.equal(fresh.bossSpawned,false);assert.equal(fresh.bossDefeated,false);assert.deepEqual(fresh.thorns,[]);
});
test('each evolution is gated by its own build and all eligible choices fit a draft',()=>{
  const g=playing();Object.assign(g.ranks,{sword:3,ember:3,orbit:3,fleet:1,vitality:1});g.eliteKills=1;
  assert.deepEqual(draftUpgrades(g),['dawn','comet','lunar']);
  for(const key of Object.keys(EVOLUTIONS)){g.phase='upgrade';g.choices=draftUpgrades(g);assert.equal(chooseUpgrade(g,key),true);assert.ok(!draftUpgrades(g).includes(key));}
  assert.equal(createGame().ranks.comet,0);assert.equal(createGame().ranks.lunar,0);
});
test('first draft offers both attack families without forcing an ember unlock',()=>{
  for(let seed=1;seed<=12;seed++){const g=createGame(seed);const choices=draftUpgrades(g);assert.ok(choices.includes('ember'));assert.ok(choices.includes('orbit'));assert.equal(choices.length,3);}
});
test('comet explosion hits nearby enemies once without reaching a distant enemy',()=>{
  const g=playing();g.swordClock=999;
  const a=spawnEnemy(g,2,false,{x:160,y:0}),b=spawnEnemy(g,2,false,{x:160,y:45}),c=spawnEnemy(g,2,false,{x:160,y:140});
  for(const e of [a,b,c])e.speed=0;
  g.shots.push({x:155,y:0,vx:290,vy:0,life:2,damage:30,blast:true});frames(g,1);
  assert.equal(a.hp,65);assert.equal(b.hp,65);assert.equal(c.hp,95);assert.equal(g.damageDealt.ember,60);
  assert.ok(g.effects.some(e=>e.kind==='ember-burst'));frames(g,1);assert.equal(g.damageDealt.ember,60);
});
test('lunar pulse repels close enemies and does not hit beyond its boundary',()=>{
  const g=playing();g.ranks.orbit=3;g.ranks.lunar=1;g.swordClock=999;g.pulseClock=0;
  const a=spawnEnemy(g,2,false,{x:125,y:0}),b=spawnEnemy(g,2,false,{x:230,y:0});a.speed=b.speed=0;
  frames(g,1);assert.ok(a.hp<95);assert.equal(b.hp,95);assert.ok(a.knockX>0);
  const hp=a.hp;frames(g,1);assert.equal(a.hp,hp);assert.ok(g.effects.some(e=>e.kind==='lunar-pulse'));
});
test('ordinary orbit hits create space before an approaching enemy can make contact',()=>{
  const g=playing();g.ranks.orbit=1;g.swordClock=999;const e=spawnEnemy(g,2,false,{x:60,y:0});e.speed=0;frames(g,1);
  assert.ok(e.knockX>100);assert.equal(g.player.hp,100);const x=e.x;frames(g,1);assert.ok(e.x>x);
});

test('diagnostic choices respond to visible low health without changing offered upgrades',()=>{
  const g=playing(),pilot=createPilot('comet');g.player.hp=27;g.player.maxHp=85;g.choices=['sword','vitality','magnet'];
  assert.equal(pilot.choose(g),'vitality');
  g.player.hp=80;assert.equal(pilot.choose(g),'magnet');
  const guard=createPilot('lunar');g.player.hp=44;g.player.maxHp=205;g.choices=['sword','heal'];assert.equal(guard.choose(g),'heal');
  g.choices=['sword','fleet'];assert.ok(g.choices.includes(guard.choose(g)));
});

test('recovery previews match capped healing and the new vitality maximum',()=>{
 for(const [key,hp,text,after,max] of [
  ['heal',95,'체력 95 → 100 / 100',100,100],
  ['heal',100,'체력 100 → 100 / 100',100,100],
  ['vitality',95,'최대 체력 100 → 120 · 현재 체력 95 → 120',120,120],
  ['vitality',27,'최대 체력 100 → 120 · 현재 체력 27 → 57',57,120]
 ]) {
  const g=playing();g.player.hp=hp;g.phase='upgrade';g.choices=[key];
  assert.equal(upgradeChange(g,key),text);assert.ok(chooseUpgrade(g,key));
  assert.equal(g.player.hp,after);assert.equal(g.player.maxHp,max);
 }
});
