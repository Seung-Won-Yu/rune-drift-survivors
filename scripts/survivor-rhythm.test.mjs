import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, startGame, updateGame, spawnEnemy, spawnBoss, spawnChampion, draftUpgrades, chooseUpgrade, stats, orbitPositions, upgradeChange, LIMITS} from '../src/survivor/game.js';
import {advanceOrbitShape, orbitOffset, ORBIT_IDENTITY} from '../src/survivor/orbit-shape.js';
import {weaponPresentation} from '../src/survivor/weapon-presentation.js';
import {advanceSignature, chargeBlade, chargeRune, signatureState} from '../src/survivor/signature.js';
import {CHAMPIONS, CHAMPION_HUNT, CHAMPION_SPORE, updateChampionBloom, championStatus} from '../src/survivor/champions.js';
import {updateHound, updateSpores, huntRule, sporeRule, SPORE} from '../src/survivor/enemies.js';
import {combatPacing} from '../src/survivor/pacing.js';
import {SPECIALIZATIONS} from '../src/survivor/expansion.js';
import {createProfile, normalizeProfile, recordRun} from '../src/survivor/profile.js';
import {runPreparation, validInheritance, primaryBranches} from '../src/survivor/progression.js';
import {bladeMotion} from '../src/survivor/blade-chain.js';
import {ashFrame} from '../src/survivor/actor-animation.js';
import {attackPose} from '../src/survivor/impact.js';

function arena(id = 'ash') {
  const g = createGame(42, id); startGame(g); g.spawnClock = 1e6; g.nextElite = 1e6;
  return g;
}
const step = (g, n = 1, input = {x:0,y:0}) => { for(let i=0;i<n;i++) updateGame(g, 1/60, input); };
function target(g, x=50, y=0) { const e=spawnEnemy(g,0,false,{x,y}); Object.assign(e,{hp:1e5,maxHp:1e5,speed:0,damage:0});return e; }

function chainArena(rank, branch='duelist') {
  const g=arena();g.enemies=[];g.ranks.sword=rank;if(branch)g.ranks[branch]=1;
  g.swordClock=0;g.xpNeed=1e6;g.player.invincible=999;
  return g;
}

test('blade milestones preserve the opening hit and follow only one fresh target per later beat',()=>{
  for(const [rank,contacts] of [[1,1],[2,1],[3,2],[4,2],[5,3],[6,3]]) {
    const g=chainArena(rank), enemies=[target(g,60),target(g,60,75),target(g,60,-75),target(g,30,100)];
    const damage=stats(g).swordDamage;step(g,12);
    assert.equal(enemies[0].hp,1e5-damage,'the first hit keeps its full damage');
    assert.equal(enemies.filter(e=>e.hp<1e5).length,1);
    step(g,21);
    assert.equal(enemies.filter(e=>e.hp<1e5).length,contacts);
    for(const e of enemies)assert.ok(Math.abs(e.hp-(e.hp<1e5?1e5-damage:1e5))<1e-8,'each target is struck once');
    assert.equal(g.events.filter(e=>e==='swing').length,contacts);
    assert.ok(Math.abs(g.signature.charge-contacts/6)<1e-8);
  }
});

test('blade followups preserve one-target boss damage and emit no empty extra attacks',()=>{
  for(const rank of [3,5,6]) {
    const g=chainArena(rank), boss=spawnBoss(g);Object.assign(boss,{x:60,y:0,entrance:0,attackClock:999});
    const hp=boss.hp,damage=stats(g).swordDamage;step(g,33);
    assert.ok(Math.abs(hp-boss.hp-damage)<1e-8);
    assert.equal(g.events.filter(e=>e==='swing').length,1);
    assert.equal(g.signature.charge,1/6);
  }
});

test('wide cleaves keep their crowd coverage and each combo earns at most three unique contacts',()=>{
  const g=chainArena(5,'sweep'), enemies=Array.from({length:8},(_,i)=>target(g,60,i-4));
  const damage=stats(g).swordDamage;step(g,33);
  for(const e of enemies)assert.ok(Math.abs(e.hp-(1e5-damage))<1e-8);
  assert.equal(g.signature.charge,.5);assert.equal(g.events.filter(e=>e==='swing').length,1);
});

test('blade continuation locks a real target that can enter or leave between strikes',()=>{
  const enters=chainArena(3);target(enters,60);const fresh=target(enters,400,75);step(enters,12);
  fresh.x=65;step(enters,12);assert.ok(fresh.hp<1e5);
  const leaves=chainArena(3);target(leaves,60);const escaped=target(leaves,60,75);step(leaves,16);
  assert.equal(leaves.swing.followups[0].targetId,escaped.id);
  escaped.y=300;step(leaves,8);assert.equal(escaped.hp,1e5);assert.equal(leaves.signature.charge,1/6);
  const behind=chainArena(5);target(behind,60);const rear=target(behind,-60,60);step(behind,33);assert.equal(rear.hp,1e5);
});

test('empowered blade chains consume once, never recharge and emit the Dawn fan only once',()=>{
  const g=chainArena(5);g.ranks.dawn=1;g.signature.charge=1;
  for(const [x,y] of [[60,0],[60,75],[60,-75]])target(g,x,y);
  step(g,33,{signature:{x:1,y:0}});
  assert.equal(g.signature.activations,1);assert.equal(g.signature.charge,0);
  assert.equal(g.events.filter(e=>e==='signature-ash').length,1);
  assert.equal(g.shots.filter(shot=>shot.kind==='crescent').length,5);
  const miss=chainArena(3);miss.signature.charge=1;const first=target(miss,60);target(miss,60,75);
  step(miss,6,{signature:{x:-1,y:0}});first.x=500;step(miss,20);
  assert.equal(miss.signature.activations,1);assert.equal(miss.signature.charge,0,'an explicitly fired attack spends its charge even when aimed away');
});

test('pending blade followups freeze across menus, survive ordinary growth and reset with a new run',()=>{
  const g=chainArena(3);target(g,60);const fresh=target(g,60,75);step(g,13);
  for(const phase of ['paused','upgrade','relic','preview','event','ended']) {
    g.phase=phase;const before=JSON.stringify(g.swing),time=g.time;step(g,60);
    assert.equal(JSON.stringify(g.swing),before);assert.equal(g.time,time);assert.equal(fresh.hp,1e5);
  }
  g.phase='upgrade';g.choices=['fleet'];assert.ok(chooseUpgrade(g,'fleet'));step(g,20);
  assert.ok(fresh.hp<1e5);assert.equal(g.events.filter(e=>e==='swing').length,2);
  assert.equal(createGame(43).swing,null);
});

test('blade regrips stay continuous and contact poses follow actual later-hit thresholds',()=>{
  for(const rank of [3,5]) {
    const g=chainArena(rank);target(g,60);target(g,60,75);target(g,60,-75);step(g,16);
    const swing=g.swing,beat=swing.followups[0];assert.notEqual(beat.targetId,null);
    swing.age=beat.at-.00001;assert.ok(ashFrame(g)<11);
    swing.age=beat.at;assert.equal(ashFrame(g),11);assert.equal(bladeMotion(swing).age,.18);
    swing.age=beat.prepareAt-.000001;const before=attackPose(g);
    swing.age=beat.prepareAt+.000001;const after=attackPose(g);
    assert.ok(Math.abs(before.x-after.x)<.01);assert.ok(Math.abs(before.y-after.y)<.01);
    swing.age=.55;assert.ok(Math.abs(attackPose(g).x)<1e-8);
    const snapshot=JSON.stringify(g);bladeMotion(swing);ashFrame(g);attackPose(g);
    assert.equal(JSON.stringify(g),snapshot);assert.deepEqual(attackPose(g,true),{});
  }
});

test('ash charges from real direct blade contacts, caps each swing, spends once and never recharges from empowered hits', () => {
  const g=arena();for(let i=0;i<8;i++)target(g,60,i-4);
  step(g,26);assert.equal(g.signature.charge,.5);assert.equal(g.signature.activations,0);
  step(g,58);assert.equal(g.signature.charge,1);
  step(g,58);assert.equal(g.signature.activations,0);assert.equal(g.signature.charge,1,'ordinary attacks must hold the ready charge');
  step(g,13,{signature:{x:1,y:0}});assert.equal(g.signature.activations,1);assert.equal(g.signature.charge,0);
  assert.ok(g.effects.some(e=>e.kind==='slash'&&e.empowered)||g.events.includes('signature-ash'));
  const miss=arena();miss.signature.charge=1;const victim=target(miss);step(miss,13);victim.hp=0;step(miss,15);assert.equal(miss.signature.charge,1);assert.equal(miss.signature.activations,0);
  const empty=arena();step(empty,200);assert.equal(empty.signature.charge,0);
  const immune=arena();const boss=spawnBoss(immune);Object.assign(boss,{x:60,y:0,entrance:5});step(immune,30);assert.equal(immune.signature.charge,0);
});
test('ember movement earns only one empowered shot per volley; menus, standing and full shot capacity preserve charge', () => {
  const g=arena('ember');step(g,120);assert.equal(g.signature.charge,0);
  step(g,60,{x:1,y:0});assert.ok(Math.abs(g.signature.charge-184/480)<1e-8);
  g.phase='paused';const before=JSON.stringify(g.signature);step(g,100,{x:1,y:0});assert.equal(JSON.stringify(g.signature),before);
  g.phase='playing';advanceSignature(g,1000);g.ranks.ember=5;target(g,g.player.x+300);
  g.shots=Array.from({length:LIMITS.shots},()=>({x:1e4,y:1e4,vx:0,vy:0,life:20}));step(g);assert.equal(g.signature.charge,1);
  step(g,1,{signature:{x:1,y:0}});assert.equal(g.signature.charge,1);assert.equal(g.signature.activations,0);
  g.shots=[];g.emberClock=0;step(g,1,{signature:{x:1,y:0}});assert.equal(g.shots.filter(s=>s.empowered).length,1);assert.equal(g.signature.activations,1);assert.equal(g.signature.charge,0);
});
test('ember signature description matches empowered projectiles for each specialization', () => {
  for (const branch of ['wildfire','detonation']) {
    const g=arena('ember');Object.assign(g.ranks,{ember:5,comet:1,[branch]:1});
    target(g,300);advanceSignature(g,1000);g.emberClock=0;step(g,1,{signature:{x:1,y:0}});
    const shot=g.shots.find(s=>s.empowered);
    assert.ok(shot);assert.equal(shot.blast,branch==='detonation');
    const description=signatureState(g).description;
    assert.match(description,/첫 불씨의 직격 피해 ×1.45/);
    if(branch==='wildfire') {
      assert.match(description,/주변에도 3초 연소/);assert.doesNotMatch(description,/폭발/);
    } else assert.match(description,/폭발 반경 \+18/);
  }
});
test('grove needs spaced actual orbit contacts; shield absorbs before HP feedback, expires and cannot stack', () => {
  const g=arena('grove');for(let i=0;i<6;i++){g.time=i*.4;chargeRune(g);chargeRune(g);}
  assert.ok(Math.abs(g.signature.charge-1)<1e-9);assert.equal(g.signature.guard,0);assert.equal(g.signature.activations,0);
  step(g,1,{signature:{x:1,y:0}});assert.equal(g.signature.guard,20);assert.equal(g.signature.activations,1);chargeRune(g);assert.equal(g.signature.charge,0);
  g.relics=['briar'];g.ranks.orbit=0;const e=target(g,0,0);e.damage=10;step(g);
  assert.equal(g.player.hp,125);assert.equal(g.signature.absorbed,8.5);assert.equal(g.damageTaken.contact,0);assert.equal(g.lastHurt,null);assert.equal(g.player.impact,null);assert.ok(!g.events.includes('hurt'));assert.equal(g.damageDealt.relic,0);
  g.player.invincible=0;e.damage=20;step(g);assert.equal(g.player.hp,119.5);assert.equal(g.damageTaken.contact,5.5);assert.equal(g.signature.absorbed,20);assert.ok(g.events.includes('hurt'));
  g.time=20;advanceSignature(g,0);assert.equal(g.signature.guard,0);assert.equal(signatureState(g).state,'charging');
  const real=arena('grove');target(real,60,3);step(real,2);assert.ok(real.signature.charge>0);assert.ok(real.damageDealt.orbit>0);
});
test('old saves do not auto-equip discoveries; only unlocked companion primary discoveries survive normalization', () => {
  const old=normalizeProfile({version:1,buildDiscoveries:['sweep'],runs:9});assert.equal(old.runs,9);assert.equal(old.inheritances.ash,null);
  const profile=normalizeProfile({version:1,bestTime:80,totalKills:220,buildDiscoveries:['sweep','wildfire'],inheritances:{ash:'sweep',ember:'wildfire',grove:'horizon'},experiment:'duelist'});
  assert.deepEqual(profile.inheritances,{ash:'sweep',ember:'wildfire',grove:null});assert.equal(profile.experiment,null);
  assert.equal(validInheritance(profile,'ash','wildfire'),null);assert.equal(validInheritance(profile,'ash','__proto__'),null);
  assert.deepEqual(normalizeProfile(JSON.parse(JSON.stringify(profile))),profile);
  assert.equal(normalizeProfile({...profile,goal:'branch:duelist'}).inheritances.ash,null);
});
test('every inherited branch starts at rank one without free growth, cannot take the opposing branch, and resets independently', () => {
  const p=createProfile();Object.assign(p,{bestTime:100,totalKills:300,buildDiscoveries:Object.keys(SPECIALIZATIONS)});
  for(const id of ['ash','ember','grove'])for(const branch of primaryBranches(id)){
    p.inheritances[id]=branch;const g=createGame(42,id,'none',null,runPreparation(p,id)), weapon=SPECIALIZATIONS[branch].weapon;
    assert.equal(g.ranks[branch],1);assert.equal(g.ranks[weapon],1);assert.equal(g.level,1);assert.equal(g.xp,0);assert.deepEqual(g.relics,[]);
    const opposite=primaryBranches(id).find(k=>k!==branch);g.ranks[weapon]=3;g.level=4;assert.ok(!draftUpgrades(g).includes(opposite));g.phase='upgrade';g.choices=[opposite];assert.equal(chooseUpgrade(g,opposite),false);
    g.ranks[weapon]=6;g.signature.charge=1;g.relics.push('dew');const retry=createGame(43,id,'none',null,runPreparation(p,id));assert.equal(retry.ranks[weapon],1);assert.equal(retry.ranks[branch],1);assert.equal(retry.signature.charge,0);assert.deepEqual(retry.relics,[]);
  }
});
test('only a finished run records a newly used branch for later explicit inheritance', () => {
  const p=createProfile(), g=arena();g.runId='rhythm-discovery';g.ranks.sweep=1;
  assert.equal(recordRun(p,g).added,false);assert.equal(validInheritance(p,'ash','sweep'),null);
  g.phase='ended';g.outcome='defeat';const saved=recordRun(p,g);assert.ok(saved.added);assert.equal(saved.profile.inheritances.ash,null);
  saved.profile.inheritances.ash='sweep';assert.equal(runPreparation(saved.profile).inheritance,'sweep');assert.equal(recordRun(saved.profile,g).added,false);
});
test('minute encounters spawn three different champions even at capacity, with bounded health and actual reward windows', () => {
  const g=arena();g.nextElite=60;for(const rule of CHAMPIONS){g.time=rule.at;step(g);assert.ok(g.enemies.some(e=>e.champion===rule.id));g.enemies=[];}
  const queued=arena();queued.nextElite=60;queued.time=60;step(queued);queued.time=120;step(queued);assert.equal(queued.enemies.filter(e=>e.champion).length,1);assert.equal(queued.nextElite,120);queued.enemies=[];step(queued);assert.ok(queued.enemies.some(e=>e.champion==='fang'));
  const full=arena();for(let i=0;i<LIMITS.enemies;i++)spawnEnemy(full,0);assert.ok(spawnChampion(full,1));assert.equal(full.enemies.length,LIMITS.enemies);
  const kill=arena();const e=spawnChampion(kill,0);Object.assign(e,{x:50,y:0,hp:1,speed:0});kill.gems=[{x:200,y:0,value:2,age:0},{x:900,y:0,value:2,age:0}];step(kill,25);
  assert.deepEqual(kill.championsDefeated,['root']);assert.equal(combatPacing(kill).kind,'champion');assert.ok(kill.gems.some(g=>g.recalled));assert.ok(kill.gems.some(g=>g.x===900&&!g.recalled));assert.equal(kill.eliteKills,1);
  assert.equal(championStatus(kill),null,'the reward window keeps its own HUD label');
  kill.time=240;kill.bossSpawned=true;kill.nextElite=120;assert.equal(combatPacing(kill).kind,'boss');assert.equal(championStatus(kill),null,'missed champions never advertise an impossible arrival after the boss');
});
test('champion dash and bloom use their displayed geometry, fixed warnings, cooldown and shared hazard cap', () => {
  const g=arena();const h=spawnChampion(g,1);Object.assign(h,{x:0,y:0,hunt:{x:0,y:0,angle:0,age:CHAMPION_HUNT.windup,hit:false}});g.player.x=150;let damage=0;
  updateHound(g,h,CHAMPION_HUNT.duration,(_g,n)=>damage+=n);assert.equal(huntRule(h),CHAMPION_HUNT);assert.equal(h.x,225);assert.equal(damage,21);
  g.enemies=[];g.player.x=0;const b=spawnChampion(g,2);Object.assign(b,{x:100,y:0,bloomClock:0});assert.ok(updateChampionBloom(g,b,1/60));assert.equal(g.spores.length,3);
  const positions=g.spores.map(s=>[s.x,s.y]);g.player.x=200;updateChampionBloom(g,b,1/60);assert.deepEqual(g.spores.map(s=>[s.x,s.y]),positions);assert.ok(g.spores.length<=SPORE.limit);
  assert.equal(sporeRule(g.spores[0]),CHAMPION_SPORE);g.player.x=0;damage=0;updateSpores(g,1,(_g,n)=>damage+=n);assert.equal(damage,0);updateSpores(g,.11,(_g,n)=>damage+=n);assert.equal(damage,12);
  g.player.y=70;damage=0;updateSpores(g,0,(_g,n)=>damage+=n);assert.equal(damage,0,'the visible gap between royal spores fits the player collision radius');
  updateSpores(g,2,()=>{});assert.equal(g.spores.length,0);
});

test('switching to a saved inheritance cannot block a still-undiscovered primary branch goal', () => {
  const profile=normalizeProfile({version:1,selected:'ash',bestTime:90,goal:'branch:wildfire',buildDiscoveries:['detonation'],inheritances:{ember:'detonation'}});
  assert.equal(profile.inheritances.ember,'detonation');
  const preparation=runPreparation(profile,'ember');
  assert.equal(preparation.goal,'branch:wildfire');assert.equal(preparation.inheritance,null);
});

function secondaryFlame(rank,branch=null,comet=false) {
  const g=arena('ember');g.ranks.ember=rank;if(branch)g.ranks[branch]=1;if(comet)g.ranks.comet=1;
  target(g,50);target(g,60,60);g.emberClock=0;g.xpNeed=1e6;step(g);
  const shot=g.shots[1],victim=g.enemies.find(e=>e.id===shot.targetId);
  g.shots=[shot];g.emberClock=999;
  for(const [i,e] of g.enemies.entries())Object.assign(e,{x:1000+i*200,y:1000,knockX:0,knockY:0});
  Object.assign(victim,{x:60,y:0});Object.assign(shot,{x:0,y:0,vx:290,vy:0});
  return {g,shot,victim,damage:stats(g).emberDamage};
}

test('fire milestones change only secondary shots and preserve real volley counts and first-shot charge',()=>{
  for(const rank of [1,2,3,4,5]) {
    const g=arena('ember');g.ranks.ember=rank;target(g,100);g.emberClock=0;g.signature.charge=1;step(g,1,{signature:{x:1,y:0}});
    assert.equal(g.shots.length,1+Math.floor(rank/2));
    assert.equal(g.signature.activations,1);assert.equal(g.shots[0].empowered,true);
    assert.equal(g.shots[0].hopsLeft,undefined);
    for(const s of g.shots.slice(1))assert.equal(s.hopsLeft,rank>=5?2:rank>=3?1:undefined);
  }
});

test('secondary flames actually fly to one or two fresh targets with diminishing direct damage',()=>{
  for(const rank of [3,5]) {
    const {g,shot,victim,damage}=secondaryFlame(rank),second=target(g,150),third=target(g,245);
    let previousX=shot.x;
    for(let i=0;i<80;i++) {
      step(g);assert.ok(g.shots.length<=1,'a hop reuses its projectile');
      if(g.shots.includes(shot)) {assert.ok(shot.x>=previousX-1e-6);previousX=shot.x;}
    }
    assert.ok(Math.abs(victim.hp-(1e5-damage))<1e-7);
    assert.ok(Math.abs(second.hp-(1e5-damage*.5))<1e-7);
    assert.ok(Math.abs(third.hp-(1e5-(rank===5?damage*.25:0)))<1e-7);
    assert.equal(new Set(shot.hitIds).size,rank===5?3:2);
  }
});

test('flame continuation excludes the entire first blast and never repeats explosions or loses burn identity',()=>{
  for(const [branch,comet] of [['detonation',false],[null,true],['wildfire',false],['wildfire',true]]) {
    const {g,shot,victim}=secondaryFlame(5,branch,comet);
    const adjacent=target(g,70,35),fresh=target(g,220);
    if(branch!=='wildfire')adjacent.hp=1;
    for(let i=0;i<40&&shot.kind!=='ember-hop';i++)step(g);
    assert.equal(shot.kind,'ember-hop');assert.equal(shot.blast,false);
    assert.ok(shot.hitIds.includes(victim.id));
    if(branch!=='wildfire')assert.ok(shot.hitIds.includes(adjacent.id),'dead blast victims are retained in the visited snapshot');
    assert.equal(shot.targetId,branch==='wildfire'?adjacent.id:fresh.id);
    const firstBlastCount=g.effects.filter(e=>e.kind==='ember-burst').length;
    assert.equal(firstBlastCount,branch==='wildfire'?0:1);
    g.effects=[];step(g,75);
    assert.ok(fresh.hp<1e5);assert.equal(g.effects.some(e=>e.kind==='ember-burst'),false);
    if(branch==='wildfire')assert.ok(fresh.burn&&fresh.burn.until>g.time);
  }
});

test('hops cannot repeat damage on a single boss, jump beyond reach or multiply charged fragments',()=>{
  const {g,shot,damage}=secondaryFlame(5);g.enemies=[];
  const boss=spawnBoss(g);Object.assign(boss,{x:60,y:0,entrance:0,attackClock:999});shot.targetId=boss.id;
  const hp=boss.hp;step(g,60);assert.ok(Math.abs(hp-boss.hp-damage)<1e-7);assert.equal(shot.hitIds.length,1);
  const far=secondaryFlame(3);const outside=target(far.g,500);step(far.g,90);assert.equal(outside.hp,1e5);assert.equal(far.g.shots.length,0);
  const charged=arena('ember');charged.ranks.ember=5;charged.signature.charge=1;target(charged,100);charged.emberClock=0;step(charged,1,{signature:{x:1,y:0}});
  charged.shots=charged.shots.slice(0,1);charged.emberClock=999;step(charged,24);
  assert.equal(charged.signature.activations,1);assert.equal(charged.shots.length,3);
  for(const s of charged.shots){assert.equal(s.kind,'ember-splinter');assert.equal(s.hopsLeft,undefined);}
});

test('moving rune shapes share one smooth physical transform and reverse without teleporting',()=>{
  for(const rank of [2,3,5]) {
    const g=arena('grove');g.ranks.orbit=rank;step(g,120,{x:1,y:0});
    const major=rank<3?1:rank===3?1.30:1.55,minor=rank<3?1:rank===3?.75:.60;
    assert.ok(Math.abs(g.orbitShape.xx-major)<1e-4);assert.ok(Math.abs(g.orbitShape.yy-minor)<1e-4);
    const r=stats(g).orbitRadius,before=JSON.stringify(g),positions=orbitPositions(g);
    for(const orb of positions){const offset=orbitOffset(orb.angle,r,g.orbitShape);assert.ok(Math.hypot(orb.x-g.player.x-offset.x,orb.y-g.player.y-offset.y)<1e-8);}
    assert.equal(JSON.stringify(g),before,'collision/render reads never advance smoothing');
    const original={...g.orbitShape};advanceOrbitShape(g,1/60,-1,0);
    assert.ok(Math.abs(g.orbitShape.xx-original.xx)<1e-5);
    const from=orbitOffset(.7,r,g.orbitShape);advanceOrbitShape(g,1/60,0,1);const to=orbitOffset(.7,r,g.orbitShape);
    assert.ok(Math.hypot(to.x-from.x,to.y-from.y)<12,'a turn blends the physical head position');
    step(g,150);for(const key of ['xx','xy','yy'])assert.ok(Math.abs(g.orbitShape[key]-ORBIT_IDENTITY[key])<1e-5);
  }
});

test('rune extension hits farther along travel while leaving a real side gap and retaining branch radii',()=>{
  for(const branch of ['bulwark','horizon']) {
    const stretched=arena('grove'),circle=arena('grove');
    for(const g of [stretched,circle]){g.ranks.orbit=5;g.ranks[branch]=1;g.xpNeed=1e6;}
    advanceOrbitShape(stretched,2,1,0);
    const r=stats(stretched).orbitRadius;
    assert.equal(stats(circle).orbitRadius,r);assert.equal(orbitPositions(circle).length,orbitPositions(stretched).length);
    // Small test radii isolate the exact collision path, including Bulwark's close orbit.
    const frontA=target(stretched,r*1.46),frontB=target(circle,r*1.46);
    const sideA=target(stretched,0,r),sideB=target(circle,0,r);
    for(const e of [frontA,frontB,sideA,sideB])e.radius=2;
    step(stretched);step(circle);
    assert.ok(frontA.hp<1e5);assert.equal(frontB.hp,1e5);
    assert.equal(sideA.hp,1e5);assert.ok(sideB.hp<1e5);
    assert.ok(stretched.signature.charge<=1/6+1e-8,'new geometry does not bypass rune charge gating');
  }
});

test('continuations and rune shapes freeze in menus, keep their shape through a breakthrough and reset cleanly',()=>{
  const {g,shot}=secondaryFlame(5);target(g,150);for(let i=0;i<40&&shot.kind!=='ember-hop';i++)step(g);
  g.ranks.orbit=5;advanceOrbitShape(g,2,1,0);
  for(const phase of ['paused','upgrade','relic','preview','event','ended']) {
    g.phase=phase;const before=JSON.stringify({shot:g.shots,shape:g.orbitShape,time:g.time});step(g,30,{x:0,y:1});
    assert.equal(JSON.stringify({shot:g.shots,shape:g.orbitShape,time:g.time}),before);
  }
  g.phase='playing';const frozen={...g.orbitShape};updateGame(g,1/60,{x:0,y:1,burst:{x:0,y:1}});
  assert.deepEqual(g.orbitShape,frozen);assert.equal(g.burst.active,true);
  const fresh=arena('grove');assert.deepEqual(fresh.orbitShape,ORBIT_IDENTITY);assert.deepEqual(fresh.shots,[]);
});

test('milestone cards and equipped descriptions disclose the actual new rules and existing coal synergy',()=>{
  const fire=arena('ember');fire.ranks.ember=2;assert.match(upgradeChange(fire,'ember'),/1회 도약/);
  fire.ranks.ember=4;assert.match(upgradeChange(fire,'ember'),/1 → 2회/);fire.ranks.ember=5;
  assert.match(weaponPresentation(fire,'ember').description,/새 적 2명/);
  fire.relics=['coal'];assert.match(upgradeChange(fire,'wildfire'),/초당 18/);
  const rune=arena('grove');rune.ranks.orbit=2;assert.match(upgradeChange(rune,'orbit'),/옆으로 -25%/);
  rune.ranks.orbit=4;assert.match(upgradeChange(rune,'orbit'),/옆으로 -40%/);rune.ranks.orbit=5;
  assert.match(weaponPresentation(rune,'orbit').description,/옆은 40% 좁아/);
});


test('ready signatures are held through ordinary attacks and a breakthrough until an explicit release',()=>{
  for(const id of ['ash','ember','grove']) {
    const g=arena(id);g.signature.charge=1;target(g,65);g.xpNeed=1e6;g.player.invincible=999;
    step(g,90);assert.equal(g.signature.activations,0);assert.equal(g.signature.charge,1);assert.equal(g.signature.guard,0);
    step(g,20,{burst:{x:1,y:0}});assert.equal(g.signature.activations,0);assert.equal(g.signature.charge,1);
    step(g,1,{signature:{x:1,y:0}});assert.equal(g.signature.activations,1);assert.equal(g.signature.charge,0);
  }
});
test('explicit offensive signatures aim into real space and can miss without refunding their charge',()=>{
  for(const id of ['ash','ember']) {
    const g=arena(id);g.signature.charge=1;g.swordClock=g.emberClock=999;
    const ahead=target(g,180),behind=target(g,-180);g.player.invincible=999;
    step(g,1,{signature:{x:10,y:0}});step(g,40);
    assert.equal(g.signature.activations,1);assert.ok(ahead.hp<1e5);assert.equal(behind.hp,1e5);
    assert.ok(g.damageDealt[id==='ash'?'sword':'ember']>0);assert.equal(g.xp,0);
    const miss=arena(id);miss.signature.charge=1;miss.swordClock=miss.emberClock=999;
    const rear=target(miss,-230);step(miss,1,{signature:{x:1,y:0}});step(miss,40);
    assert.equal(rear.hp,1e5);assert.equal(miss.signature.charge,0);assert.equal(miss.signature.activations,1);
  }
});
test('manual signatures reject menus and the terminal boundary, retain requests through hit stop and reset on retry',()=>{
  for(const id of ['ash','ember','grove']) {
    for(const phase of ['paused','upgrade','relic','preview','event','ended']) {
      const g=arena(id);g.signature.charge=1;g.phase=phase;const before=JSON.stringify(g);
      step(g,1,{signature:{x:1,y:0}});assert.equal(JSON.stringify(g),before);
    }
    const g=arena(id);g.signature.charge=1;g.impactStop=.04;
    step(g,1,{signature:{x:0,y:1}});assert.equal(g.signature.activations,0);assert.deepEqual(g.signature.pending,{x:0,y:1});
    step(g,4);assert.equal(g.signature.activations,1);assert.equal(g.signature.pending,null);
    const fresh=createGame(43,id);assert.equal(fresh.signature.charge,0);assert.equal(fresh.signature.pending,null);assert.equal(fresh.signature.guard,0);
    const limit=arena(id);limit.signature.charge=1;limit.time=300-1/120;
    step(limit,1,{signature:{x:1,y:0}});assert.equal(limit.signature.activations,0);assert.equal(limit.signature.charge,1);assert.equal(limit.phase,'ended');
    const dead=arena(id);dead.player.hp=0;dead.signature.charge=1;step(dead,1,{signature:{x:1,y:0}});assert.equal(dead.signature.activations,0);
  }
});
test('full projectile capacity retains offensive charge while a manual guard can still protect',()=>{
  for(const id of ['ash','ember','grove']) {
    const g=arena(id);g.signature.charge=1;g.swordClock=g.emberClock=999;
    g.shots=Array.from({length:LIMITS.shots},()=>({x:10000,y:10000,vx:0,vy:0,life:20}));
    step(g,1,{signature:{x:1,y:0}});assert.equal(g.shots.length,LIMITS.shots);
    assert.equal(g.signature.activations,id==='grove'?1:0);
    assert.equal(g.signature.charge,id==='grove'?0:1);
    assert.equal(g.signature.guard,id==='grove'?20:0);
  }
});
test('a stationary signature uses the last movement direction and consumes no loot or breakthrough cooldown',()=>{
  const g=arena('ember');g.signature.charge=1;g.emberClock=999;g.burst.aimX=0;g.burst.aimY=-1;
  const before={xp:g.xp,readyAt:g.burst.readyAt,uses:g.burst.uses};
  step(g,1,{signature:{x:Infinity,y:NaN}});
  assert.ok(g.shots[0].vy<0);assert.ok(Math.abs(g.shots[0].vx)<1e-8);assert.equal(g.shots[0].targetId,null);
  assert.deepEqual({xp:g.xp,readyAt:g.burst.readyAt,uses:g.burst.uses},before);
});

test('manual guard runes make two real passes, follow the current player and freeze in menus',()=>{
  const g=arena('grove');g.signature.charge=1;g.pulseClock=999;
  const e=target(g,90);e.orbAt=1e6;const damage=Math.round(stats(g).orbitDamage*.45);
  step(g,1,{signature:{x:1,y:0}});step(g,52);
  assert.equal(e.hp,1e5-damage*2,'one outgoing and one returning contact, without ordinary orbit damage');
  const steer=arena('grove');steer.signature.charge=1;steer.pulseClock=999;
  step(steer,1,{signature:{x:1,y:0}});step(steer,25);
  const ray=steer.shots.find(s=>s.kind==='rune-burst'&&s.vx<0&&Math.abs(s.y)<1);
  assert.ok(ray?.returning);step(steer,2,{x:0,y:1});assert.ok(ray.vy>0);
  steer.phase='paused';const before=JSON.stringify(steer);step(steer,60);assert.equal(JSON.stringify(steer),before);
});

test('a returning guard rune respects three distinct victims per leg',()=>{
  const g=arena('grove');g.signature.charge=1;g.pulseClock=999;
  const victims=[50,75,100,125,150].map(x=>{const e=target(g,x);e.orbAt=1e6;e.interruptedUntil=999;return e;});
  const damage=Math.round(stats(g).orbitDamage*.45);
  step(g,1,{signature:{x:1,y:0}});step(g,60);
  for(const e of victims.slice(0,3))assert.ok(e.hp<=1e5-damage && e.hp>=1e5-damage*2);
  for(const e of victims.slice(3))assert.equal(e.hp,1e5);
});
