import test from 'node:test';
import { createPilot } from '../src/survivor/qa-pilot.js';
import { BOSS } from '../src/survivor/boss.js';
import { bossHealthTrail, recordBossDamage, combatKick } from '../src/survivor/impact.js';
import assert from 'node:assert/strict';
import { createGame, startGame, updateGame, spawnEnemy, chooseUpgrade, draftUpgrades, pauseGame, resumeGame, stats, RUN_SECONDS, LIMITS, canEvolve, SLAM, spawnBoss, EVOLUTIONS, upgradeChange } from '../src/survivor/game.js';

const playing=()=>{const g=createGame(42);startGame(g);g.spawnClock=999;return g;};
const frames=(g,n,input)=>{for(let i=0;i<n;i++)updateGame(g,1/60,input);};
test('boss damage trail captures real hits and burns, freezes on pause and clears per hit',()=>{
  const g=playing(), boss=spawnBoss(g);
  Object.assign(boss,{x:62,y:0,entrance:0,attackClock:999});
  frames(g,30);
  assert.ok(boss.hp<boss.maxHp);
  assert.ok(boss.healthLoss.length>0);
  assert.ok(bossHealthTrail(boss,g.time)>boss.hp);
  pauseGame(g);const trail=bossHealthTrail(boss,g.time),before=JSON.stringify(g);
  frames(g,60);assert.equal(JSON.stringify(g),before);assert.equal(bossHealthTrail(boss,g.time),trail);
  assert.equal(bossHealthTrail(boss,g.time,true),boss.hp);
  resumeGame(g);g.ranks.sword=0;g.swing=null;
  boss.burn={until:g.time+2,next:g.time,damage:20};
  const hp=boss.hp;frames(g,1);
  assert.equal(boss.hp,hp-10);assert.equal(boss.healthLoss.at(-1).amount,10);
  boss.burn=null;frames(g,50);
  assert.equal(bossHealthTrail(boss,g.time),boss.hp);
  assert.equal(spawnBoss(playing()).healthLoss,undefined);
});

test('sustained boss damage cannot pin the loss trail to the start of the fight',()=>{
  const boss={hp:3200,maxHp:3200};
  for(let i=0;i<300;i++) {
    boss.hp-=1;recordBossDamage(boss,i/60,1);
    assert.ok(boss.healthLoss.length<=32);
    assert.ok(bossHealthTrail(boss,i/60)-boss.hp<=32);
  }
  const before=JSON.stringify(boss);
  assert.equal(bossHealthTrail(boss,6),boss.hp);
  assert.equal(JSON.stringify(boss),before);
});
test('walk animation follows real travel for analog input and companion speed without advancing while stopped',()=>{
  for(const id of ['ash','ember','grove']){
    const g=createGame(42,id);startGame(g);g.spawnClock=999;
    frames(g,60,{x:.25,y:0});
    assert.ok(Math.abs(g.player.x-stats(g).speed*.25)<.01);
    assert.ok(Math.abs(g.player.walk-g.player.x/168)<1e-10);
    const clock=g.player.walk;frames(g,30);assert.equal(g.player.walk,clock);
    pauseGame(g);const before=JSON.stringify(g);frames(g,30,{x:1,y:1});assert.equal(JSON.stringify(g),before);
  }
});
test('companion gait is bounded, presentation-only and yields to attacks, damage and reduced motion',async()=>{
  const {heroGait}=await import('../src/survivor/motion.js');
  const g=playing();g.player.moving=true;g.player.walk=1/7;
  const before=JSON.stringify(g),pose=heroGait(g);assert.ok(pose.y<0 && pose.y>=-5);
  assert.equal(JSON.stringify(g),before);assert.deepEqual(heroGait(g),pose);
  g.characterId='grove';assert.ok(Math.abs(heroGait(g).y)<Math.abs(pose.y));
  g.characterId='ember';assert.ok(Math.abs(heroGait(g).y)>Math.abs(pose.y));
  assert.deepEqual(heroGait(g,true),{});
  for(const state of [{hurt:.2},{cast:.3}]){Object.assign(g.player,{moving:true,hurt:0,cast:0},state);assert.deepEqual(heroGait(g),{});}
  Object.assign(g.player,{moving:true,hurt:0,cast:0});g.swing={age:.1,angle:0};assert.deepEqual(heroGait(g),{});
  g.swing=null;g.outcome='defeat';assert.deepEqual(heroGait(g),{});
});
test('enemy anticipation builds gradually, settles after attacks and never mutates a threat',async()=>{
  const {enemyMotion}=await import('../src/survivor/motion.js');
  const {HOUND,GIANT}=await import('../src/survivor/enemies.js');
  for(const [kind,rule,elite] of [['hunt',HOUND,false],['slam',GIANT,false],['slam',SLAM,true]]){
    const e={id:1,type:kind==='hunt'?1:2,speed:50,elite,[kind]:{age:rule.windup*.1,hit:false}};
    const early=enemyMotion(e,0);e[kind].age=rule.windup*.9;
    const before=JSON.stringify(e),late=enemyMotion(e,0);
    assert.ok(Math.abs(late.sy-1)>Math.abs(early.sy-1));assert.equal(JSON.stringify(e),before);
    assert.deepEqual(enemyMotion(e,0,true),{});
    e[kind]={age:rule.windup+(rule.duration??0)+rule.recovery,hit:true};
    assert.equal(enemyMotion(e,0).sy,1);
  }
  assert.deepEqual(enemyMotion({id:1,type:0,speed:0},12),{});
  assert.deepEqual(enemyMotion({boss:true},12),{});
});
test('movement is diagonal-normalized and freezes on pause',()=>{const g=playing();frames(g,60,{x:1,y:1});assert.ok(Math.abs(Math.hypot(g.player.x,g.player.y)-168)<.01);pauseGame(g);const t=g.time;frames(g,60,{x:1,y:0});assert.equal(g.time,t);resumeGame(g);frames(g,1,{x:1,y:0});assert.ok(g.time>t);});
test('sword anticipation precedes damage and kill produces collectable XP',()=>{const g=playing();const e=spawnEnemy(g,0,false,{x:65,y:0});e.speed=0;frames(g,15);assert.equal(g.kills,0);frames(g,14);assert.equal(g.kills,1);assert.equal(g.damageDealt.sword,15);assert.ok(g.gems.length||g.xp>0);frames(g,35,{x:1,y:0});assert.equal(g.xp,2);});
test('contact invulnerability prevents overlapping enemies draining HP in one step',()=>{const g=playing();for(let i=0;i<6;i++)spawnEnemy(g,0,false,{x:0,y:0});frames(g,1);assert.equal(g.player.hp,92);frames(g,20);assert.equal(g.player.hp,92);});
test('level up freezes gameplay and only an offered upgrade applies',()=>{const g=playing();g.gems.push({x:0,y:0,value:10,age:0});frames(g,1);assert.equal(g.phase,'upgrade');assert.equal(g.level,2);assert.equal(g.choices.length,3);assert.equal(new Set(g.choices).size,3);const t=g.time;frames(g,60);assert.equal(g.time,t);assert.equal(chooseUpgrade(g,'not-an-upgrade'),false);assert.equal(chooseUpgrade(g,'ember'),true);assert.equal(g.ranks.ember,1);assert.equal(g.phase,'playing');assert.equal(chooseUpgrade(g,'ember'),false);});
test('ember and orbit unlocks cause real damage',()=>{for(const weapon of ['ember','orbit']){const g=playing();g.ranks[weapon]=1;g.swordClock=999;const e=spawnEnemy(g,2,false,{x:weapon==='ember'?160:60,y:0});e.speed=0;frames(g,150);assert.ok(g.damageDealt[weapon]>0,weapon);}});
test('ember follows a target that changes position after launch',()=>{const g=playing();g.ranks.ember=1;g.emberClock=0;g.swordClock=999;const e=spawnEnemy(g,2,false,{x:220,y:0});e.speed=0;frames(g,1);assert.equal(g.shots.length,1);e.y=140;frames(g,1);assert.ok(g.shots[0].vy>100);frames(g,60);assert.ok(g.damageDealt.ember>0);});
test('surplus XP waits for real combat after a choice without discarding experience',()=>{
 const g=playing();g.gems.push({x:0,y:0,value:30,age:0});frames(g,1);
 assert.equal(g.level,2);assert.equal(g.xp,22);chooseUpgrade(g,'ember');
 assert.equal(g.phase,'playing');frames(g,100,{x:1,y:0});
 assert.equal(g.level,2);assert.equal(g.xp,22);assert.equal(g.player.invincible,0);assert.ok(g.player.x>200);
 pauseGame(g);const frozen=JSON.stringify(g);frames(g,180);assert.equal(JSON.stringify(g),frozen);resumeGame(g);
 frames(g,100);assert.equal(g.phase,'upgrade');assert.equal(g.level,3);assert.equal(g.xp,7);
 assert.ok(g.choices.includes('orbit'));assert.equal(g.choices.length,3);
 chooseUpgrade(g,'orbit');assert.equal(g.phase,'playing');
});
test('an evolution gets four combat seconds and cannot postpone the chapter ending',()=>{
 const g=playing();Object.assign(g.ranks,{sword:3,orbit:1});g.eliteKills=1;g.xp=500;g.phase='upgrade';g.choices=['dawn'];
 chooseUpgrade(g,'dawn');frames(g,210);assert.equal(g.phase,'playing');assert.equal(g.xp,500);assert.equal(g.player.invincible,0);
 frames(g,40);assert.equal(g.phase,'upgrade');assert.equal(g.level,2);assert.equal(g.xp,492);
 const end=playing();Object.assign(end.ranks,{sword:3,orbit:1});end.eliteKills=1;end.xp=500;end.phase='upgrade';end.choices=['dawn'];end.time=RUN_SECONDS-.01;
 chooseUpgrade(end,'dawn');frames(end,1);assert.equal(end.phase,'ended');assert.equal(end.outcome,'survived');assert.equal(end.level,1);
});
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
test('a charged sword cleave releases three real piercing blades from the first weapon',()=>{
  const g=playing();g.ranks.sword=2;g.signature.charge=1;g.swordClock=0;
  const e=spawnEnemy(g,2,false,{x:75,y:0});e.hp=e.maxHp=1000;e.speed=0;
  frames(g,13);
  assert.equal(g.signature.activations,1);assert.equal(g.shots.length,3);
  assert.ok(g.shots.every(s=>s.kind==='crescent'&&s.charged&&!s.turnAt));
  assert.ok(g.damageDealt.sword>stats(g).swordDamage*1.6,'blades must cause real damage beyond the cleave');
  const capped=playing();capped.signature.charge=1;capped.swordClock=0;
  const target=spawnEnemy(capped,2,false,{x:70,y:0});target.hp=target.maxHp=1000;target.speed=0;
  for(let i=0;i<LIMITS.shots-1;i++) capped.shots.push({x:5000,y:0,vx:0,vy:0,life:9,damage:0});
  frames(capped,13);assert.equal(capped.shots.length,LIMITS.shots);
  const blade=capped.shots.find(s=>s.kind==='crescent');assert.ok(blade);assert.equal(blade.vy,0,'the centre blade gets the final slot');
});
test('a returning crescent hits once per pass, follows the current player and freezes on pause',()=>{
  const g=playing();g.ranks.sword=0;
  const e=spawnEnemy(g,2,false,{x:100,y:0});e.hp=e.maxHp=1000;e.speed=0;
  g.shots.push({kind:'crescent',charged:true,x:40,y:0,vx:380,vy:0,life:1.4,damage:10,turnAt:.3,hitIds:[]});
  frames(g,12);assert.equal(e.hp,990);pauseGame(g);
  const before=JSON.stringify(g);frames(g,30);assert.equal(JSON.stringify(g),before);resumeGame(g);
  frames(g,35);assert.equal(e.hp,980);assert.equal(g.shots.length,0);
  const moving=playing();moving.ranks.sword=0;
  moving.shots.push({kind:'crescent',charged:true,x:160,y:0,vx:380,vy:0,life:1.4,damage:10,turnAt:.01,hitIds:[]});
  frames(moving,5,{x:0,y:1});assert.equal(moving.shots[0].returning,true);assert.ok(moving.shots[0].vy>0);
  frames(moving,60,{x:0,y:1});assert.equal(moving.shots.length,0);
});
test('evolution expands the charged fan to five returning blades',()=>{
  const g=playing();g.ranks.sword=3;g.ranks.dawn=1;g.signature.charge=1;g.swordClock=0;
  const e=spawnEnemy(g,2,false,{x:70,y:0});e.hp=e.maxHp=1000;e.speed=0;
  frames(g,13);assert.equal(g.shots.length,5);
  assert.ok(g.shots.every(s=>s.charged&&s.turnAt>g.time));
});
test('a crowd break briefly stops the whole simulation and pause preserves the remaining stop',()=>{
  const g=playing();g.ranks.sword=2;g.ranks.sweep=1;g.swordClock=0;
  for(let i=0;i<6;i++) {const e=spawnEnemy(g,0,false,{x:70,y:0});e.speed=0;}
  frames(g,13);assert.equal(g.kills,6);assert.ok(g.impactStop>0);assert.ok(g.combatImpact.strength<=1);
  pauseGame(g);const before=JSON.stringify(g);frames(g,30);assert.equal(JSON.stringify(g),before);resumeGame(g);
  const time=g.time;frames(g,1);assert.ok(g.time>time&&g.time<time+1/60,'consume only the remaining stop before advancing');
  assert.equal(createGame().impactStop,0);assert.equal(createGame().combatImpact,null);
});
test('a level-up consumes crowd impact rather than replaying the stop after choosing',()=>{
  const g=playing();g.ranks.sword=2;g.ranks.sweep=1;g.swordClock=0;g.xpNeed=1;g.player.invincible=999;
  for(let i=0;i<6;i++) {const e=spawnEnemy(g,0,false,{x:10,y:0});e.speed=0;}
  frames(g,15);assert.equal(g.phase,'upgrade');assert.equal(g.impactStop,0);assert.equal(g.combatImpact,null);
  assert.ok(chooseUpgrade(g,g.choices[0]));const time=g.time;frames(g,1);
  assert.ok(Math.abs(g.time-time-1/60)<1e-9);
});
test('the crowd camera impulse is bounded as a vector and respects reduced motion and the end state',()=>{
  const g=playing();g.combatImpact={at:0,strength:1};
  for(let i=0;i<=160;i++) {g.time=i/1000;const before=JSON.stringify(g),p=combatKick(g);assert.ok(Math.hypot(p.x,p.y)<=6+1e-9);assert.equal(JSON.stringify(g),before);}
  g.time=0;assert.deepEqual(combatKick(g,true),{x:0,y:0});g.phase='ended';assert.deepEqual(combatKick(g),{x:0,y:0});
});
test('reward and encounter overlays clear a pending crowd impact before control returns',async()=>{
  const {updateEncounters,inspectEncounter}=await import('../src/survivor/encounters.js');
  const g=playing();g.time=45;g.impactStop=.03;g.combatImpact={at:45,strength:1};
  g.encounters=[{kind:'altar',x:0,y:0,state:'active',progress:9.99}];
  updateEncounters(g,.02);assert.equal(g.phase,'relic');assert.equal(g.impactStop,0);assert.equal(g.combatImpact,null);
  const preview=playing();preview.time=45;preview.impactStop=.03;preview.combatImpact={at:45,strength:1};
  preview.encounters=[{kind:'altar',x:210,y:0,state:'available',progress:0}];
  assert.ok(inspectEncounter(preview));assert.equal(preview.impactStop,0);assert.equal(preview.combatImpact,null);
});
test('charged fire splits once into damaging fragments without striking its original victim again',()=>{
  const g=createGame(42,'ember');startGame(g);g.spawnClock=999;g.emberClock=0;g.signature.charge=1;g.ranks.wildfire=1;
  const front=spawnEnemy(g,2,false,{x:80,y:0}),back=spawnEnemy(g,2,false,{x:170,y:0});
  for(const e of [front,back]) {e.hp=e.maxHp=1000;e.speed=0;}
  frames(g,30);
  assert.equal(g.signature.activations,1);
  assert.ok(g.shots.some(s=>s.kind==='ember-splinter'));
  assert.ok(g.shots.filter(s=>s.kind==='ember-splinter').every(s=>!s.empowered&&s.ignoreId===front.id));
  assert.ok(back.hp<1000,'an emitted fragment must reach the second target');
  assert.ok(Math.abs(front.hp-(1000-stats(g).emberDamage*1.45))<1e-6,'fragments cannot multiply damage inside the initial victim');
  g.ranks.ember=0;frames(g,60);assert.equal(g.shots.length,0);
});
test('evolved fire fragments explode once and exclude their original victim from the secondary blasts',()=>{
  const g=createGame(42,'ember');startGame(g);g.spawnClock=999;g.emberClock=0;g.signature.charge=1;g.ranks.comet=1;
  const front=spawnEnemy(g,2,false,{x:80,y:0}),back=spawnEnemy(g,2,false,{x:115,y:0});
  for(const e of [front,back]) {e.hp=e.maxHp=1000;e.speed=0;}
  frames(g,30);
  const initial=stats(g).emberDamage*1.45;
  assert.ok(Math.abs(front.hp-(1000-initial))<1e-6);
  assert.ok(back.hp<1000-initial,'secondary blasts deal actual additional crowd damage');
  assert.equal(g.signature.activations,1);assert.ok(g.shots.length<=3);
});
test('real rune contacts release a capped eight-way piercing volley when the guard activates',()=>{
  for(const room of [8,2]) {
    const g=createGame(42,'grove');startGame(g);g.spawnClock=999;g.signature.charge=5/6;
    const close=spawnEnemy(g,2,false,{x:70,y:0}),far=spawnEnemy(g,2,false,{x:140,y:0});
    for(const e of [close,far]) {e.hp=e.maxHp=1000;e.speed=0;}
    for(let i=0;i<LIMITS.shots-room;i++)g.shots.push({x:5000,y:0,vx:0,vy:0,life:9,damage:0});
    frames(g,1);assert.equal(g.signature.activations,1);assert.equal(g.signature.guard,20);
    assert.equal(g.shots.filter(s=>s.kind==='rune-burst').length,room);
    assert.equal(g.shots.length,LIMITS.shots);
    frames(g,30);
    assert.ok(far.hp<1000,'the volley reaches beyond the ordinary orbit');
    assert.equal(g.damageDealt.ember,0);assert.ok(g.damageDealt.orbit>0);
    assert.ok(g.shots.filter(s=>s.kind==='rune-burst').every(s=>s.hitIds.length<=3));
  }
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
test('a boss charge hits the marked lane then warns before its followup',()=>{
  const g=playing();g.swordClock=999;const boss=spawnBoss(g);
  Object.assign(boss,{x:180,y:0,entrance:0,attackClock:0});frames(g,55);assert.equal(g.player.hp,100);
  frames(g,50);assert.equal(g.player.hp,100-BOSS.chargeDamage);assert.equal(g.damageTaken.charge,BOSS.chargeDamage);
  frames(g,45);assert.equal(boss.pattern.kind,'thorns');assert.ok(boss.pattern.age<.15);assert.equal(g.thorns.length,0);
});
test('near charges lock a shorter lane and keep their endpoint independently of later player motion',()=>{
  for(const [distance,length] of [[80,152],[180,252],[420,270]]) {
    const g=playing();g.ranks.sword=0;const boss=spawnBoss(g);
    Object.assign(boss,{x:distance,y:0,entrance:0,attackClock:0});frames(g,1);
    assert.equal(boss.pattern.length,length);
    g.player.x=distance-length-80;g.player.y=0;
    frames(g,100);assert.equal(g.player.hp,100,'a point beyond the rounded end cap is outside the actual charge');
    assert.ok(Math.abs(boss.x-(distance-length))<1e-7);assert.equal(boss.pattern.length,length,'later player motion cannot change the locked lane');
  }
});
test('a charge rounded end cap hits a touching player and misses a player beyond its combined radius',()=>{
  for(const [beyond,damage] of [[20,BOSS.chargeDamage],[45,0]]) {
    const g=playing();g.ranks.sword=0;const boss=spawnBoss(g);
    Object.assign(boss,{x:80,y:0,entrance:0,attackClock:0});frames(g,1);
    g.player.x=80-boss.pattern.length-beyond;
    frames(g,100);assert.equal(g.damageTaken.charge,damage);assert.equal(g.player.hp,100-damage);
  }
});

function pairedBoss(enraged=false) {
  const g=playing();g.ranks.sword=0;g.xpNeed=99999;
  const boss=spawnBoss(g);Object.assign(boss,{x:180,y:0,entrance:0,attackClock:0});
  if(enraged)boss.hp=boss.maxHp*.45;
  frames(g,1);const chargeAngle=boss.pattern.angle;
  frames(g,70,{x:0,y:1});frames(g,80);
  return {g,boss,chargeAngle};
}
test('charge recovery leads to a newly aimed followup with a full thorn warning and final recovery',()=>{
  for(const enraged of [false,true]) {
    const {g,boss,chargeAngle}=pairedBoss(enraged);
    assert.equal(g.damageTaken.charge,0);
    assert.equal(boss.pattern?.kind,'thorns');assert.ok(boss.pattern.age<.15);
    assert.ok(Math.abs(boss.pattern.angle-chargeAngle)>.5,'the followup aims at the later position');
    const angle=boss.pattern.angle;
    while(boss.pattern.age<BOSS.windup-1/30)frames(g,1);
    assert.equal(g.thorns.length,0);assert.equal(boss.pattern.angle,angle);
    frames(g,3);assert.equal(g.thorns.length,enraged?11:7);
    const before=JSON.stringify({boss,thorns:g.thorns,time:g.time});pauseGame(g);frames(g,60);
    assert.equal(JSON.stringify({boss,thorns:g.thorns,time:g.time}),before);resumeGame(g);
    frames(g,60);assert.equal(boss.pattern,null);assert.ok(boss.attackClock>0,'the complete pair keeps its normal rest');
    assert.ok(g.thorns.length<=BOSS.maxThorns);
  }
});
test('stopping after the first dodge risks the next real thorn while a second lateral move avoids it',()=>{
  for(const enraged of [false,true]) {
    const stay=pairedBoss(enraged),evade=pairedBoss(enraged);
    assert.equal(stay.boss.pattern?.kind,'thorns');assert.equal(evade.boss.pattern?.kind,'thorns');
    frames(stay.g,180);assert.equal(stay.g.damageTaken.thorns,BOSS.thornDamage);
    const angle=evade.boss.pattern.angle+Math.PI/2;
    frames(evade.g,12);frames(evade.g,210,{x:Math.cos(angle),y:Math.sin(angle)});
    assert.equal(evade.g.damageTaken.thorns,0);assert.equal(evade.g.player.hp,100);
  }
});
test('late charge feedback points at the colliding boss instead of the distant windup origin',async()=>{
  const {hurtFeedback}=await import('../src/survivor/impact.js');
  for(const angle of [0,Math.PI]){
    const g=playing();g.ranks.sword=0;const boss=spawnBoss(g);
    const travel=BOSS.chargeLength*.5/BOSS.chargeDuration;
    Object.assign(g.player,{x:Math.cos(angle)*travel,y:30});
    Object.assign(boss,{entrance:0,pattern:{x:0,y:0,angle,age:BOSS.windup+.5-1/60,kind:'charge',fired:true}});
    frames(g,1);
    assert.equal(g.player.hp,100-BOSS.chargeDamage);
    assert.equal(g.damageTaken.charge,BOSS.chargeDamage);
    assert.ok(Math.abs(g.player.impact.angle+Math.PI/2)<1e-10,'the boss is directly above the player at contact');
    const feedback=hurtFeedback(g);
    assert.ok(feedback.pose.y>0);assert.ok(Math.abs(feedback.pose.x)<1e-10);
    assert.equal(g.player.x,Math.cos(angle)*travel);assert.equal(g.player.y,30);
    pauseGame(g);frames(g,30);assert.deepEqual(hurtFeedback(g),feedback);
    assert.deepEqual(hurtFeedback(g,true).pose,{});
  }
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
test('the boss closes into a defensive rune build instead of parking outside its attacks',()=>{
  const g=createGame(42,'grove');startGame(g);
  Object.assign(g,{time:240.1,spawnClock:999,xpNeed:1e9});
  Object.assign(g.ranks,{orbit:2,bulwark:1});g.player.invincible=999;
  const boss=spawnBoss(g);Object.assign(boss,{x:160,y:0,entrance:0,attackClock:999});
  frames(g,210);
  assert.ok(boss.walk>0);assert.ok(boss.hp<boss.maxHp,'ordinary rune collision must be able to hit after the approach');
  assert.equal(g.player.x,0);assert.equal(g.player.y,0);
  const distance=Math.hypot(boss.x-g.player.x,boss.y-g.player.y);
  assert.ok(distance>boss.radius+12 && distance<100,'approach leaves room for the player without idle body contact');
});
test('each evolution is gated by its own build and all eligible choices fit a draft',()=>{
  const g=playing();Object.assign(g.ranks,{sword:3,ember:3,orbit:3,fleet:1,vitality:1});g.eliteKills=1;
  assert.deepEqual(draftUpgrades(g),['dawn','comet','lunar']);
  for(const key of Object.keys(EVOLUTIONS)){g.phase='upgrade';g.choices=draftUpgrades(g);assert.equal(chooseUpgrade(g,key),true);assert.ok(!draftUpgrades(g).includes(key));}
  assert.equal(createGame().ranks.comet,0);assert.equal(createGame().ranks.lunar,0);
});
test('early drafts offer commitment, one rotating new weapon and a survival alternative',()=>{
  for(const character of ['ash','ember','grove']) for(let seed=1;seed<=12;seed++) {
    const g=createGame(seed,character), primary={ash:'sword',ember:'ember',grove:'orbit'}[character];
    const first=draftUpgrades(g), second=draftUpgrades(g);
    for(const choices of [first,second]) {
      assert.ok(choices.includes(primary));
      assert.equal(choices.filter(key=>['sword','ember','orbit'].includes(key)&&key!==primary).length,1);
      assert.ok(choices.some(key=>['fleet','magnet','vitality'].includes(key)));
      assert.equal(new Set(choices).size,3);
    }
    assert.equal(new Set([...first,...second].filter(key=>['sword','ember','orbit'].includes(key))).size,3);
  }
});
test('owned support weapon offers rotate instead of repeatedly hiding one family',()=>{
 for(const character of ['ash','ember','grove']) for(let seed=1;seed<=12;seed++) {
  const g=createGame(seed,character),primary={ash:'sword',ember:'ember',grove:'orbit'}[character];
  Object.assign(g.ranks,{sword:1,ember:1,orbit:1});
  const offers=Array.from({length:6},()=>draftUpgrades(g).find(key=>['sword','ember','orbit'].includes(key)&&key!==primary));
  for(let i=1;i<offers.length;i++) assert.notEqual(offers[i],offers[i-1]);
  g.ranks[offers[0]]={sword:6,ember:5,orbit:5}[offers[0]];
  for(let i=0;i<4;i++)assert.ok(!draftUpgrades(g).includes(offers[0]));
 }
});
test('a finished primary keeps a started second weapon available for its combat fork',()=>{
 for(const [character,primary,evolution,support,secondary] of [
  ['ash','sword','dawn','orbit','orbit'],['ember','ember','comet','fleet','orbit'],['grove','orbit','lunar','vitality','ember']
 ]) for(let seed=1;seed<=12;seed++) {
  const g=createGame(seed,character);g.level=12;g.eliteKills=1;
  Object.assign(g.ranks,{[primary]:primary==='sword'?6:5,[evolution]:1,[support]:1,[secondary]:1,[{ash:'sweep',ember:'wildfire',grove:'bulwark'}[character]]:1});
  const choices=draftUpgrades(g);
  assert.equal(choices[0],secondary);assert.ok(choices.some(key=>['fleet','magnet','vitality'].includes(key)));
  assert.equal(new Set(choices).size,3);assert.equal(g.ranks[secondary],1,'an offer must not grant the rank');
  g.phase='upgrade';g.choices=choices;assert.equal(chooseUpgrade(g,secondary),true);
  const branches=draftUpgrades(g).filter(key=>['sweep','duelist','wildfire','detonation','bulwark','horizon'].includes(key));
  assert.equal(branches.length,2);assert.ok(branches.every(key=>!g.ranks[key]));
 }
});
test('continuation waits for the primary evolution and never displaces eligible evolutions',()=>{
 const g=createGame(42,'ash');g.level=12;g.ranks.sword=6;g.ranks.sweep=1;g.ranks.orbit=1;
 assert.equal(draftUpgrades(g)[0],'ember','an unfinished evolution preserves discovery order');
 g.ranks.dawn=1;assert.equal(draftUpgrades(g)[0],'orbit');
 const h=createGame(42,'grove');h.level=12;h.eliteKills=1;
 Object.assign(h.ranks,{orbit:5,lunar:1,bulwark:1,vitality:1,sword:1,ember:3,fleet:1});
 assert.deepEqual(draftUpgrades(h),['comet','wildfire','detonation']);
});
test('two started secondary weapons alternate priority without losing the survival choice',()=>{
 for(const [character,primary,evolution,support] of [['ash','sword','dawn','orbit'],['ember','ember','comet','fleet'],['grove','orbit','lunar','vitality']]) {
  const g=createGame(42,character);g.level=12;g.eliteKills=1;
  Object.assign(g.ranks,{sword:1,ember:1,orbit:1,[primary]:primary==='sword'?6:5,[evolution]:1,[support]:1,[{ash:'sweep',ember:'wildfire',grove:'bulwark'}[character]]:1});
  const first=draftUpgrades(g),second=draftUpgrades(g),third=draftUpgrades(g);
  assert.notEqual(first[0],second[0]);assert.equal(first[0],third[0]);
  for(const choices of [first,second,third])assert.ok(choices.some(key=>['fleet','magnet','vitality'].includes(key)));
 }
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

test('basic sword contact adds impact only on a real hit and preserves damage and death rewards',()=>{
  const g=playing(); const e=spawnEnemy(g,0,false,{x:65,y:0});e.speed=0;
  g.swordClock=0; frames(g,8);
  assert.equal(e.hp,15);assert.equal(e.impact,undefined);assert.ok(!g.events.includes('blade-impact'));
  frames(g,4);
  assert.equal(e.hp,15-stats(g).swordDamage);assert.equal(g.damageDealt.sword,15);
  assert.equal(g.kills,1);assert.equal(g.gems[0].value,2);
  assert.equal(e.impact.source,'sword');assert.equal(e.impact.angle,0);
  assert.ok(g.effects.some(e=>e.kind==='sword-contact'&&e.finishing));
  assert.ok(g.effects.find(e=>e.kind==='damage').y < g.effects.find(e=>e.kind==='sword-contact').y - 20);
  assert.ok(g.events.includes('blade-impact'));assert.equal(g.remnants[0].angle,0);
  const miss=playing();miss.swordClock=0;frames(miss,20);
  assert.ok(!miss.events.includes('blade-impact'));assert.ok(!miss.effects.some(e=>e.kind==='sword-contact'));
});

test('direct ember and rune hits react but periodic burns do not restart contact feedback',()=>{
  for(const weapon of ['ember','orbit']){
    const g=playing();g.ranks.sword=0;g.ranks[weapon]=1;
    const e=spawnEnemy(g,0,false,{x:weapon==='ember'?145:65,y:0});e.speed=0;e.hp=e.maxHp=999;
    for(let i=0;i<120&&!e.impact;i++)frames(g,1);
    assert.equal(e.impact?.source,weapon);assert.ok(g.effects.some(e=>e.kind===`${weapon}-contact`));
  }
  const g=playing();g.ranks.sword=0;
  const e=spawnEnemy(g,0,false,{x:150,y:0});e.speed=0;e.hp=100;
  e.burn={until:3,next:0,damage:12};frames(g,1);
  assert.equal(e.hp,94);assert.equal(e.impact,undefined);
  assert.ok(!g.events.includes('ember-impact'));assert.ok(!g.effects.some(e=>e.kind==='ember-contact'));
});

test('contact presentation is bounded, freezes with combat, and expires',async()=>{
  const {impactPose}=await import('../src/survivor/impact.js');
  const g=playing();g.swordClock=0;
  for(let i=0;i<10;i++){const e=spawnEnemy(g,0,false,{x:60+i,y:i-5});e.speed=0;e.hp=999;}
  frames(g,12);
  const e=g.enemies.find(e=>e.impact);assert.ok(e);
  assert.equal(g.effects.filter(e=>e.kind==='sword-contact').length,1);
  assert.ok(impactPose(e,g.time).sx>1);
  const before=structuredClone(g.effects),pose=impactPose(e,g.time);
  pauseGame(g);frames(g,60);assert.deepEqual(g.effects,before);assert.deepEqual(impactPose(e,g.time),pose);
  assert.deepEqual(impactPose(e,g.time,true),{});
  assert.deepEqual(impactPose({...e,slam:{}},g.time),{});
  resumeGame(g);g.swordClock=999;frames(g,30);
  assert.deepEqual(impactPose(e,g.time),{});assert.ok(!g.effects.some(e=>e.kind==='sword-contact'));
  assert.ok(g.effects.length<=LIMITS.effects);
});

test('audio retains a contact beside a foreground cue and collapses a crowd into one impact',async()=>{
  const {selectAudioEvents}=await import('../src/survivor/audio.js');
  assert.deepEqual(selectAudioEvents(new Set(['swing','blade-impact','kill','xp'])),['blade-impact']);
  assert.deepEqual(selectAudioEvents(new Set(['hurt','blade-impact','ember-impact','rune-hit'])),['hurt']);
  assert.deepEqual(selectAudioEvents(new Set(['xp','kill'])),['xp']);
  assert.deepEqual(selectAudioEvents(new Set()),[]);
});

test('attack poses separate windup, release and recovery without mutating combat state',async()=>{
  const {attackPose}=await import('../src/survivor/impact.js');
  const g=playing();g.swing={age:.15,angle:0,hit:false};
  const snapshot=()=>({...g,rng:undefined,rewardRng:undefined,flowRng:undefined,draftRng:undefined});
  const saved=structuredClone(snapshot());
  assert.ok(attackPose(g).x<0);assert.ok(attackPose(g).sy<1);
  assert.deepEqual(snapshot(),saved);
  g.swing.age=.2;const strike=attackPose(g);assert.ok(strike.x>10);assert.ok(strike.sy>1);
  g.swing.age=.48;assert.ok(attackPose(g).x<strike.x*.1);
  g.swing.age=.2;g.swing.angle=Math.PI;assert.ok(attackPose(g).x<0);
  assert.deepEqual(attackPose(g,true),{});
  g.player.hurt=.1;assert.deepEqual(attackPose(g),{});g.player.hurt=0;
  g.outcome='defeat';assert.deepEqual(attackPose(g),{});g.outcome=null;
  g.swing=null;g.player.cast=.4;g.characterId='ember';assert.ok(attackPose(g).y<0);
  g.characterId='grove';assert.ok(attackPose(g).y>0);assert.ok(attackPose(g).sx>1);
});

test('evolved contacts identify each actual weapon evolution without enabling other evolutions',async()=>{
  const {isEvolvedWeapon}=await import('../src/survivor/impact.js');
  for(const [weapon,evolution] of [['sword','dawn'],['ember','comet'],['orbit','lunar']]){
    const g=playing();g.ranks.sword=0;g.ranks[weapon]=1;g.ranks[evolution]=1;
    const e=spawnEnemy(g,0,false,{x:weapon==='ember'?145:65,y:0});e.speed=0;e.hp=999;
    for(let i=0;i<120&&!e.impact;i++)frames(g,1);
    assert.equal(e.impact?.evolved,true);assert.ok(g.effects.some(e=>e.kind===`${weapon}-contact`&&e.evolved));
    for(const other of ['sword','ember','orbit'])assert.equal(isEvolvedWeapon(g,other),other===weapon);
  }
});

test('elite defeat feedback survives a full effect budget, pauses, expires and preserves rewards',()=>{
  const g=playing();g.swordClock=0;g.xpNeed=99999;g.player.hp=60;
  g.effects=Array.from({length:LIMITS.effects},()=>({kind:'pop',x:0,y:0,age:0,life:5}));
  const e=spawnEnemy(g,2,true,{x:65,y:0});e.speed=0;e.hp=1;e.attackClock=999;
  frames(g,8);assert.equal(g.eliteFinish,null);frames(g,4);
  assert.ok(g.eliteFinish);assert.ok(g.events.includes('elite-break'));assert.equal(g.eliteKills,1);
  assert.ok(g.eliteFinish.labelY>e.y,'finish label sits below the body, clear of floating damage');
  assert.equal(g.player.hp,75);assert.equal(g.healing.elite,15);assert.equal(g.gems[0].value,e.xp);
  assert.equal(g.effects.length,LIMITS.effects);
  const before={...g.eliteFinish};pauseGame(g);frames(g,60);assert.deepEqual(g.eliteFinish,before);
  resumeGame(g);frames(g,35);assert.equal(g.eliteFinish,null);
  const fresh=playing();fresh.swordClock=0;const small=spawnEnemy(fresh,0,false,{x:65,y:0});small.speed=0;
  frames(fresh,12);assert.equal(fresh.kills,1);assert.equal(fresh.eliteFinish,null);assert.ok(!fresh.events.includes('elite-break'));
});

test('elite finish audio replaces its ordinary hit but retains player danger priority',async()=>{
  const {selectAudioEvents}=await import('../src/survivor/audio.js');
  assert.deepEqual(selectAudioEvents(new Set(['elite-break','blade-impact','heal','kill'])),['elite-break']);
  assert.deepEqual(selectAudioEvents(new Set(['elite-break','hurt','blade-impact'])),['hurt']);
});

test('player damage feedback records real loss, incoming direction and every damage source',()=>{
  const cases={
    contact:g=>{const e=spawnEnemy(g,0,false,{x:-20,y:0});e.speed=0;},
    spore:g=>{g.time=20;g.spores=[{x:-10,y:0,age:.7}];},
    thorns:g=>{g.thorns=[{x:-10,y:0,vx:30,vy:0,age:0,life:1}];},
    slam:g=>{const e=spawnEnemy(g,2,true,{x:-80,y:0});e.slam={x:-10,y:0,age:SLAM.windup-.01,hit:false};},
    hunt:g=>{const e=spawnEnemy(g,1,false,{x:-25,y:0});e.hunt={x:-100,y:0,angle:0,age:1,hit:false};},
    charge:g=>{const b=spawnBoss(g);b.entrance=0;b.pattern={x:-10,y:0,angle:0,age:BOSS.windup,kind:'charge',fired:false};}
  };
  for(const [source,prepare] of Object.entries(cases)){
    const g=playing();g.ranks.sword=0;prepare(g);frames(g,1);
    const hit=g.player.impact;
    assert.ok(hit,source);assert.equal(hit.source,source);
    assert.equal(hit.amount,100-g.player.hp);assert.equal(hit.beforeHp,100);
    assert.ok(Math.abs(Math.abs(hit.angle)-Math.PI)<.01,source);
    const saved=structuredClone(hit);frames(g,1);assert.deepEqual(g.player.impact,saved,'invulnerability does not re-trigger');
  }
});

test('player feedback is bounded, pause-safe, recoverable, reduced-motion aware and does not displace collisions',async()=>{
  const {hurtFeedback}=await import('../src/survivor/impact.js');
  const g=playing();g.ranks.sword=0;
  for(let i=0;i<LIMITS.effects;i++)g.effects.push({kind:'pop',age:0,life:10});
  const e=spawnEnemy(g,0,false,{x:-20,y:0});e.speed=0;frames(g,1);g.enemies=[];
  const hit=hurtFeedback(g),before=JSON.stringify(g);
  assert.equal(hit.amount,8);assert.ok(hit.pose.x>0);assert.equal(hit.trailHp,100);
  assert.deepEqual(hurtFeedback(g,true).pose,{});assert.equal(hurtFeedback(g,true).trailHp,92);
  assert.equal(JSON.stringify(g),before);assert.equal(g.player.x,0);
  pauseGame(g);frames(g,60);assert.deepEqual(hurtFeedback(g),hit);
  resumeGame(g);frames(g,12,{x:1,y:0});assert.ok(Math.abs(g.player.x-33.6)<.001);
  g.player.hp=100;assert.equal(hurtFeedback(g).trailHp,100,'healing never leaves a false loss trail');
  frames(g,60);assert.equal(hurtFeedback(g),null);assert.equal(createGame().player.impact,null);
  const lethal=playing();lethal.player.hp=3;lethal.ranks.sword=0;spawnEnemy(lethal,0,false,{x:0,y:0});frames(lethal,1);
  assert.equal(lethal.player.impact.amount,3);assert.equal(lethal.player.impact.angle,null);
  assert.equal(lethal.outcome,'defeat');assert.deepEqual(hurtFeedback(lethal).pose,{});
});


test('flame release follows the actual emission and the decorative cap never prevents a shot',()=>{
  for(const full of [false,true]) {
    const g=playing();g.ranks.sword=0;g.ranks.ember=3;g.emberClock=0;
    frames(g,1);assert.ok(!g.effects.some(e=>e.kind==='ember-launch'));
    const e=spawnEnemy(g,0,false,{x:180,y:50});e.speed=0;e.hp=999;
    if(full)g.effects=Array.from({length:LIMITS.effects},()=>({kind:'pop',x:0,y:0,age:0,life:5}));
    frames(g,1);
    assert.ok(g.shots.length>0);assert.equal(g.effects.length<=LIMITS.effects,true);
    const marks=g.effects.filter(e=>e.kind==='ember-launch');
    assert.equal(marks.length,full?0:1);
    if(!full) {
      assert.equal(marks[0].x,g.player.x);assert.equal(marks[0].y,g.player.y);
      assert.ok(Math.abs(marks[0].angle-Math.atan2(g.shots[0].vy,g.shots[0].vx))<1e-10);
      pauseGame(g);const before=structuredClone(g.effects);frames(g,30);assert.deepEqual(g.effects,before);
    }
  }
});

test('rune source mark comes from the real contact point and preserves the per-enemy gate',()=>{
  const g=playing();g.ranks.sword=0;g.ranks.orbit=1;
  const angle=1/60*2.8,r=stats(g).orbitRadius;
  const e=spawnEnemy(g,0,false,{x:Math.cos(angle)*r,y:Math.sin(angle)*r});e.speed=0;e.hp=999;
  frames(g,1);
  const mark=g.effects.find(e=>e.kind==='rune-touch');assert.ok(mark);
  assert.ok(Math.abs(mark.x-Math.cos(angle)*r)<1e-9);assert.ok(Math.abs(mark.y-Math.sin(angle)*r)<1e-9);
  const at=e.orbAt,damage=g.damageDealt.orbit;
  frames(g,5);assert.equal(e.orbAt,at);assert.equal(g.damageDealt.orbit,damage);
});

test('only a direct weapon kill gets its matching finish, while burn deaths remain neutral',()=>{
  for(const source of ['sword','ember','orbit','burn']) {
    const g=playing();g.ranks.sword=0;g.xpNeed=99999;
    if(source!=='burn')g.ranks[source]=1;
    const a=1/60*2.8,r=stats(g).orbitRadius;
    const e=spawnEnemy(g,0,false,source==='orbit'?{x:Math.cos(a)*r,y:Math.sin(a)*r}:{x:65,y:0});e.speed=0;e.hp=1;
    if(source==='burn')e.burn={until:3,next:0,damage:12};
    for(let i=0;i<120&&!g.kills;i++)frames(g,1);
    assert.equal(g.kills,1);
    if(source==='burn') {assert.ok(!g.effects.some(e=>e.kind==='finish'));assert.ok(g.effects.some(e=>e.kind==='pop'));}
    else assert.equal(g.effects.find(e=>e.kind==='finish')?.source,source);
    assert.equal(g.remnants.length,1);assert.equal(g.gems[0].value,e.xp);
  }
});

test('terminal weapon marks settle on the victory clock after simulation stops',async()=>{
  const {actionEffectFrame}=await import('../src/survivor/combat-vfx.js');
  const g=playing();g.xpNeed=99999;
  const boss=spawnBoss(g);Object.assign(boss,{x:65,y:0,hp:1,entrance:0,attackClock:999});
  for(let i=0;i<120&&g.phase==='playing';i++)frames(g,1);
  assert.equal(g.outcome,'victory');assert.equal(g.phase,'ended');
  const effect=g.effects.find(e=>e.kind==='finish');assert.ok(effect);
  const before=structuredClone(effect);g.endAge=.08;
  assert.equal(actionEffectFrame(effect,g).age,effect.age+.08);
  g.endAge=.2;assert.equal(actionEffectFrame(effect,g),null);assert.deepEqual(effect,before);
  for(const kind of ['ember-launch','rune-touch'])assert.equal(actionEffectFrame({...effect,kind,life:.14},g),null);
});

test('kiting caster faces the shot during release and returns to travel without changing movement',async()=>{
  const {companionFacing,attackPose}=await import('../src/survivor/impact.js');
  for(const targetSide of [-1,1]) {
    const g=createGame(42,'ember');startGame(g);g.spawnClock=999;g.emberClock=0;
    const e=spawnEnemy(g,0,false,{x:targetSide*180,y:0});e.speed=0;e.hp=999;
    frames(g,1,{x:-targetSide,y:0});
    assert.equal(g.player.facing,-targetSide,'input still controls travel direction');
    assert.ok(g.player.x*-targetSide>0);assert.equal(g.player.castFacing,targetSide);
    assert.equal(companionFacing(g),targetSide);assert.ok(attackPose(g).x*targetSide>0);
    assert.equal(g.effects.find(e=>e.kind==='ember-launch').facing,targetSide);
    assert.ok(g.shots[0].vx*targetSide>0);
    pauseGame(g);const before=structuredClone(g.player);frames(g,20,{x:targetSide,y:0});assert.deepEqual(g.player,before);
    resumeGame(g);frames(g,26,{x:-targetSide,y:0});
    assert.equal(g.player.cast,0);assert.equal(g.player.castFacing,null);assert.equal(companionFacing(g),-targetSide);
    g.player.cast=.4;g.player.castFacing=targetSide;g.player.hurt=.2;
    assert.equal(companionFacing(g),-targetSide);g.player.hurt=0;g.swing={angle:0};assert.equal(companionFacing(g),-targetSide);
    g.swing=null;g.outcome='defeat';assert.equal(companionFacing(g),-targetSide);
  }
});

test('a pending flask glint yields when a sword attack or hurt takes over the actor',async()=>{
  const {actionEffectFrame}=await import('../src/survivor/combat-vfx.js');
  const g=createGame(42,'ember');startGame(g);g.spawnClock=999;g.emberClock=0;
  const far=spawnEnemy(g,0,false,{x:-180,y:0});far.speed=0;frames(g,1);
  const cue=g.effects.find(e=>e.kind==='ember-launch');assert.ok(cue);
  assert.equal(actionEffectFrame(cue,g).character,'ember');
  g.ranks.sword=1;g.swordClock=0;const near=spawnEnemy(g,0,false,{x:65,y:0});near.speed=0;frames(g,1);
  assert.ok(g.swing);assert.equal(actionEffectFrame(cue,g).character,null);
  g.swing=null;g.player.hurt=.2;assert.equal(actionEffectFrame(cue,g).character,null);
  assert.equal(cue.character,'ember','reading presentation does not rewrite emission facts');
});
