import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, startGame, updateGame, spawnEnemy, spawnBoss, spawnChampion, draftUpgrades, chooseUpgrade, LIMITS} from '../src/survivor/game.js';
import {advanceSignature, chargeBlade, chargeRune, signatureState} from '../src/survivor/signature.js';
import {CHAMPIONS, CHAMPION_HUNT, CHAMPION_SPORE, updateChampionBloom, championStatus} from '../src/survivor/champions.js';
import {updateHound, updateSpores, huntRule, sporeRule, SPORE} from '../src/survivor/enemies.js';
import {combatPacing} from '../src/survivor/pacing.js';
import {SPECIALIZATIONS} from '../src/survivor/expansion.js';
import {createProfile, normalizeProfile, recordRun} from '../src/survivor/profile.js';
import {runPreparation, validInheritance, primaryBranches} from '../src/survivor/progression.js';

function arena(id = 'ash') {
  const g = createGame(42, id); startGame(g); g.spawnClock = 1e6; g.nextElite = 1e6;
  return g;
}
const step = (g, n = 1, input = {x:0,y:0}) => { for(let i=0;i<n;i++) updateGame(g, 1/60, input); };
function target(g, x=50, y=0) { const e=spawnEnemy(g,0,false,{x,y}); Object.assign(e,{hp:1e5,maxHp:1e5,speed:0,damage:0});return e; }

test('ash charges from real direct blade contacts, caps each swing, spends once and never recharges from empowered hits', () => {
  const g=arena();for(let i=0;i<8;i++)target(g,60,i-4);
  step(g,26);assert.equal(g.signature.charge,.5);assert.equal(g.signature.activations,0);
  step(g,58);assert.equal(g.signature.charge,1);
  step(g,58);assert.equal(g.signature.activations,1);assert.equal(g.signature.charge,0);
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
  g.shots=[];g.emberClock=0;step(g);assert.equal(g.shots.filter(s=>s.empowered).length,1);assert.equal(g.signature.activations,1);assert.equal(g.signature.charge,0);
});
test('grove needs spaced actual orbit contacts; shield absorbs before HP feedback, expires and cannot stack', () => {
  const g=arena('grove');for(let i=0;i<6;i++){g.time=i*.4;chargeRune(g);chargeRune(g);}
  assert.equal(g.signature.guard,20);assert.equal(g.signature.activations,1);chargeRune(g);assert.equal(g.signature.charge,0);
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
