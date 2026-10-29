import test from 'node:test';
import assert from 'node:assert/strict';
import {BURST,canBurst,burstCooldown} from '../src/survivor/burst.js';
import {createGame,startGame,updateGame,chooseUpgrade,pauseGame,resumeGame,spawnEnemy,spawnBoss,stats,RUN_SECONDS,LIMITS} from '../src/survivor/game.js';

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

test('landing recalls earned loot inside 220 once, without sweeping the starting area',()=>{
 const g=run(),edge={x:340,y:0,value:2,age:0},outside={x:340.1,y:0,value:3,age:0},behind={x:-80,y:160,value:4,age:0};
 g.gems.push(edge,outside,behind);
 updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});frames(g,10);
 assert.equal(g.burst.active,true);assert.ok(g.gems.every(gem=>!gem.recalled));
 pauseGame(g);const paused=JSON.stringify(g);frames(g,30);assert.equal(JSON.stringify(g),paused);resumeGame(g);
 frames(g,1);assert.equal(g.burst.active,false);assert.ok(Math.abs(g.player.x-120)<1e-8);
 assert.equal(edge.recalled,true);assert.ok(edge.x<340);assert.ok(!outside.recalled);assert.ok(!behind.recalled);
 const late={x:340,y:0,value:5,age:0};g.gems.push(late);frames(g,1);
 assert.ok(!late.recalled,'landing is not a lasting vacuum aura');
 assert.equal(g.xp+g.gems.reduce((sum,gem)=>sum+gem.value,0),14);
 assert.equal(g.player.hp,100);assert.equal(g.player.invincible,0);
});

test('a last-step breakthrough kill recalls only its normal earned XP',()=>{
 const g=run(),enemy=spawnEnemy(g,0,false,{x:157,y:0});Object.assign(enemy,{speed:0,damage:0});
 updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});frames(g,10);
 assert.equal(g.kills,0);frames(g,1);
 assert.equal(g.kills,1);assert.equal(g.burst.kills,1);assert.equal(g.gems[0].recalled,true);
 assert.equal(g.xp+g.gems.reduce((sum,gem)=>sum+gem.value,0),2);
});

test('landing recall never slows a stronger ordinary pickup pull',()=>{
 const g=run();g.ranks.magnet=4;
 updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});frames(g,10);
 const gem={x:150,y:0,value:2,age:0};g.gems.push(gem);frames(g,1);
 assert.equal(gem.recalled,true);assert.equal(g.xp,2);assert.equal(g.gems.length,0);
 assert.equal(g.player.hp,100);assert.ok(burstCooldown(g)>3.9);
});

test('a recalled gem retains normal raw-XP healing and cannot be collected twice',()=>{
 const g=run();g.player.hp=50;g.relics=['dew'];
 g.gems.push({x:240,y:0,value:60,age:0});
 updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});frames(g,40);
 assert.equal(g.xp,60);assert.equal(g.player.hp,56);assert.equal(g.gems.length,0);
 frames(g,270);updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});frames(g,40);
 assert.equal(g.xp,60);assert.equal(g.player.hp,56);
});

test('earned landing XP opens one boss-time choice and respects the existing combat interval',()=>{
 const g=run();g.time=240;g.nextElite=999;g.nextRecovery=999;g.xpNeed=8;g.player.hp=30;
 const boss=spawnBoss(g);Object.assign(boss,{x:600,y:0,entrance:0,pattern:{kind:'charge',x:600,y:0,angle:0,length:72,age:0}});
 g.thorns.push({x:1000,y:300,vx:200,vy:0,age:0,life:3.8});
 g.gems.push({x:240,y:0,value:1000,age:0});
 updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});
 for(let i=0;i<100&&g.phase==='playing';i++)updateGame(g,1/60);
 assert.equal(g.phase,'upgrade');assert.equal(g.level,2);assert.equal(g.xp,992);assert.equal(g.burst.active,false);
 assert.equal(g.player.hp,30);assert.equal(g.player.invincible,0);assert.equal(g.thorns.length,1);assert.ok(g.enemies.includes(boss));
 const paused=JSON.stringify(g);frames(g,90);assert.equal(JSON.stringify(g),paused);
 const selectedAt=g.time;assert.ok(chooseUpgrade(g,g.choices[0]));assert.equal(g.growthResumeAt,selectedAt+3);
 assert.ok(g.player.invincible<=.8);frames(g,90,{x:0,y:-1});assert.equal(g.phase,'playing');assert.equal(g.level,2);
 frames(g,95,{x:0,y:-1});assert.equal(g.phase,'upgrade');assert.equal(g.level,3);assert.equal(g.player.hp,30);
 assert.ok(g.time>=selectedAt+3);assert.equal(g.player.invincible,0);
});

test('landing at the chapter deadline does not start another loot recall',()=>{
 const g=run(),gem={x:340,y:0,value:2,age:0};g.gems.push(gem);
 updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});frames(g,10);
 g.time=RUN_SECONDS-1/60;g.nextElite=999;frames(g,1);
 assert.equal(g.phase,'ended');assert.equal(g.outcome,'survived');assert.ok(!gem.recalled);
});

test('a last-step boss victory keeps its result ahead of landing loot',()=>{
 const g=run(),gem={x:340,y:0,value:2,age:0};g.gems.push(gem);
 const boss=spawnBoss(g);Object.assign(boss,{x:177.9,y:0,hp:1,entrance:0,pattern:{kind:'thorns',x:177.9,y:0,angle:0,age:1.1,released:true}});
 updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});frames(g,10);
 assert.equal(g.bossDefeated,false);frames(g,1);
 assert.equal(g.phase,'ended');assert.equal(g.outcome,'victory');assert.ok(!gem.recalled);assert.equal(g.xp,0);
});

test('earned pickup stays attached when a fast build runs away from a caught gem',()=>{
 for(const character of ['ash','ember','grove'])for(const fleet of [0,4]){
  const g=run();g.characterId=character;g.ranks.sword=g.ranks.ember=g.ranks.orbit=0;g.ranks.fleet=fleet;g.xpNeed=99999;
  g.gems=[{x:-63,y:0,value:5,age:0}];updateGame(g,1/60);
  assert.equal(g.gems[0].attracted,true);
  for(let i=0;i<180;i++)updateGame(g,1/60,{x:1,y:0});
  assert.equal(g.xp,5);assert.equal(g.gems.length,0);
 }
});

test('sticky pickup does not attract untouched gems outside the actual range',()=>{
 const g=run();g.ranks.sword=0;g.ranks.fleet=4;g.xpNeed=99999;
 const outside={x:-70,y:0,value:5,age:0};g.gems=[outside];
 for(let i=0;i<120;i++)updateGame(g,1/60,{x:1,y:0});
 assert.equal(outside.x,-70);assert.equal(outside.attracted,undefined);assert.equal(g.xp,0);
});

test('ordinary attraction freezes in menus and preserves raw loot healing exactly once',()=>{
 const g=run();g.ranks.sword=0;g.ranks.fleet=4;g.xpNeed=99999;g.relics=['dew'];g.player.hp=30;
 g.gems=[{x:-63,y:0,value:30,age:0}];updateGame(g,1/60);
 const before=structuredClone(g.gems);
 for(const phase of ['paused','upgrade','relic','event','ended']){
  g.phase=phase;updateGame(g,1/30,{x:1,y:0});assert.deepEqual(g.gems,before);assert.equal(g.xp,0);
 }
 g.phase='playing';for(let i=0;i<180;i++)updateGame(g,1/60,{x:1,y:0});
 assert.equal(g.xp,30);assert.equal(g.player.hp,33);assert.equal(g.dewXp,0);assert.equal(g.gems.length,0);
 for(let i=0;i<120;i++)updateGame(g,1/60);assert.equal(g.xp,30);assert.equal(g.player.hp,33);
});

function fullLootField(state=()=>({})) {
 const g=run('ember');g.nextElite=999;
 g.gems=Array.from({length:LIMITS.gems},(_,i)=>({x:-2000+(i%20)*12,y:Math.floor(i/20)*12,value:2,age:30,...state(i)}));
 return g;
}
function dropThroughRealKill(g,x=100,y=0,xp=2) {
 const e=spawnEnemy(g,0,false,{x,y});Object.assign(e,{hp:1,maxHp:1,speed:0,damage:0,xp});
 g.emberClock=0;frames(g,45);assert.ok(e.hp<=0);
}
const floorXp=g=>g.gems.reduce((total,gem)=>total+gem.value,0);

test('a full old loot field still leaves the next real kill collectible at the fight',()=>{
 const g=fullLootField();dropThroughRealKill(g);
 assert.equal(g.kills,1);assert.equal(g.gems.length,LIMITS.gems);assert.equal(floorXp(g),482);
 assert.ok(g.gems.some(gem=>Math.hypot(gem.x-100,gem.y)<1 && gem.value===2));
 assert.equal(g.xp,0,'a kill outside pickup range is not an automatic reward');
 frames(g,45,{x:1,y:0});assert.equal(g.xp,2);assert.equal(floorXp(g),480);
});
test('overflow can join an unclaimed local pile without moving remote loot',()=>{
 const g=fullLootField(),local=g.gems[0];Object.assign(local,{x:105,y:5});
 const remote=g.gems.slice(1).map(e=>({x:e.x,y:e.y,value:e.value}));
 dropThroughRealKill(g);assert.equal(local.value,4);assert.equal(g.gems.length,LIMITS.gems);
 assert.deepEqual(g.gems.slice(1).map(e=>({x:e.x,y:e.y,value:e.value})),remote);
 frames(g,45,{x:1,y:0});assert.equal(g.xp,4);assert.equal(floorXp(g),478);
});
test('overflow keeps fresh loot separate from returning pickups and preserves each pickup state',()=>{
 for(const state of [()=>({attracted:true}),()=>({recalled:true}),i=>({attracted:!!(i&1),recalled:!!(i&2)})]) {
  const g=fullLootField(state),totals=()=>g.gems.reduce((groups,gem)=>{const key=Number(!!gem.attracted)*2+Number(!!gem.recalled);groups[key]+=gem.value;return groups;},[0,0,0,0]);
  const expected=totals();expected[0]+=2;dropThroughRealKill(g);
  assert.equal(g.gems.length,LIMITS.gems);assert.deepEqual(totals(),expected);assert.equal(g.xp,0);
  const fresh=g.gems.find(gem=>Math.hypot(gem.x-100,gem.y)<1);
  assert.equal(fresh.value,2);assert.ok(!fresh.attracted && !fresh.recalled);
 }
});
test('compacted loot preserves raw XP healing and applies pickup bonuses only on actual collection',()=>{
 const g=fullLootField();g.relics=['dew'];g.player.hp=30;g.keepsake='bookmark';
 dropThroughRealKill(g,100,0,30);assert.equal(g.xp,0);assert.equal(g.player.hp,30);assert.equal(floorXp(g),510);
 frames(g,45,{x:1,y:0});assert.equal(g.xp,36);assert.equal(g.player.hp,33);assert.equal(g.dewXp,0);assert.equal(floorXp(g),480);
 frames(g,120);assert.equal(g.xp,36);assert.equal(g.player.hp,33);
});

function interruptArena(type, age=.2) {
 const g=run(),e=spawnEnemy(g,type,false,{x:45,y:0});
 e.hp=e.maxHp=999;e.speed=0;
 if(type===1)e.hunt={x:45,y:0,angle:Math.PI,age,hit:false};
 else e.slam={x:0,y:0,age,hit:false,radius:62,windup:1.15};
 return {g,e};
}
test('only a real breakthrough contact interrupts a surviving ordinary windup',()=>{
 for(const type of [1,2]) {
  const {g,e}=interruptArena(type);const hp=e.hp;
  updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});
  assert.equal(e.hunt??e.slam,null);assert.equal(g.burst.interrupts,1);
  assert.ok(e.interruptedUntil>g.time);assert.equal(g.kills,0);assert.equal(g.xp,0);
  assert.ok(Math.abs(hp-e.hp-stats(g).swordDamage*BURST.damage)<1e-8);
  frames(g,10);assert.equal(g.burst.interrupts,1);assert.equal(g.events.filter(e=>e==='interrupt').length,1);
 }
});
test('released attacks, off-path targets and champions cannot be interrupted',()=>{
 for(const type of [1,2])for(const condition of ['released','off-path','elite','champion']){
  const {g,e}=interruptArena(type,condition==='released'?(type===1?.8:1.15):.2);
  if(condition==='off-path'){e.y=300;if(e.hunt)e.hunt.y=300;}
  if(condition==='elite')e.elite=true;
  if(condition==='champion')e.champion=type===1?'fang':'root';
  updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});
  assert.equal(g.burst.interrupts,0,`${type}/${condition}`);assert.equal(e.interruptedUntil,undefined);
 }
});
test('a dead target grants only its ordinary kill and a passive hit never cancels preparation',()=>{
 const dead=interruptArena(2);dead.e.hp=1;updateGame(dead.g,1/60,{x:0,y:0,burst:{x:1,y:0}});
 assert.equal(dead.g.kills,1);assert.equal(dead.g.burst.interrupts,0);
 const passive=interruptArena(2);passive.g.swordClock=0;frames(passive.g,15);
 assert.ok(passive.e.hp<999);assert.ok(passive.e.slam);assert.equal(passive.e.interruptedUntil,undefined);
});
test('interruption freezes in menus and permits movement and future attacks after recovery',()=>{
 const {g,e}=interruptArena(2);e.speed=35;updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});
 const interrupted=structuredClone(e);pauseGame(g);frames(g,90);assert.deepEqual(e,interrupted);
 resumeGame(g);frames(g,10);assert.equal(e.x,interrupted.x);assert.equal(e.y,interrupted.y);
 frames(g,25);assert.ok(Math.hypot(e.x-interrupted.x,e.y-interrupted.y)>0);
 assert.equal(g.player.invincible,0);assert.equal(g.burst.interrupts,1);
 frames(g,400);assert.ok(g.events.includes('warning'),'the same enemy can prepare a later attack');
 assert.equal(createGame().burst.interrupts,0);
});

test('sovereign preparation and the final deadline keep their interruption boundaries',()=>{
 const g=run(),boss=spawnBoss(g);Object.assign(boss,{x:45,y:0,entrance:0,pattern:{kind:'charge',x:45,y:0,angle:0,length:72,age:.2}});
 updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});
 assert.equal(g.burst.interrupts,0);assert.equal(boss.pattern.kind,'charge');assert.equal(boss.interruptedUntil,undefined);
 const final=interruptArena(2);final.g.time=RUN_SECONDS-1/60;
 updateGame(final.g,1/60,{x:0,y:0,burst:{x:1,y:0}});
 assert.equal(final.g.phase,'ended');assert.equal(final.g.outcome,'survived');
 assert.equal(final.g.burst.interrupts,0);assert.equal(final.e.interruptedUntil,undefined);
});
