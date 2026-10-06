import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile, normalizeProfile, recordRun, loadProfile, saveProfile} from '../src/survivor/profile.js';
import {createGame, stats, startGame, updateGame, chooseUpgrade} from '../src/survivor/game.js';
import {completedChallenges, canEquipKeepsake} from '../src/survivor/journey.js';
const ended = id => Object.assign(createGame(42), {phase:'ended', outcome:'defeat', runId:id});
test('old records retain earned branch/win rewards without inventing altar completion', () => {
 const p=normalizeProfile({version:1,wins:1,buildDiscoveries:['sweep','wildfire'],keepsake:'crown'});
 assert.deepEqual(completedChallenges(p).map(c=>c.id),['branches','sovereign']);
 assert.equal(p.keepsake,'crown'); assert.equal(p.altarRuns,0);
 assert.equal(normalizeProfile({...p,keepsake:'seed'}).keepsake,'none');
 assert.equal(normalizeProfile({...p,keepsake:'__proto__'}).keepsake,'none');
});
test('only a finished real run grants altar credit and reward notification once', () => {
 const g=ended('altar-run');g.encounters=[{kind:'altar',state:'completed'}];
 g.phase='playing';assert.equal(recordRun(createProfile(),g).added,false);
 g.phase='ended';const first=recordRun(createProfile(),g);
 assert.deepEqual(first.challenges,['altar']);assert.equal(first.profile.altarRuns,1);
 assert.ok(canEquipKeepsake(first.profile,'seed'));
 const again=recordRun(first.profile,g);assert.equal(again.profile.altarRuns,1);assert.deepEqual(again.challenges,[]);
 const debug=ended(undefined);debug.encounters=g.encounters;assert.equal(recordRun(createProfile(),debug).profile.altarRuns,0);
});
test('different recorded branches unlock one reward and persistence keeps selected tradeoff', () => {
 const one=ended('one');one.ranks.sweep=1;
 const first=recordRun(createProfile(),one);assert.deepEqual(first.challenges,[]);
 const two=ended('two');two.ranks.wildfire=1;
 const next=recordRun(first.profile,two);assert.deepEqual(next.challenges,['branches']);
 next.profile.keepsake='ribbon';let raw;
 const storage={setItem:(_,v)=>raw=v,getItem:()=>raw};assert.ok(saveProfile(storage,next.profile));
 assert.equal(loadProfile(storage).profile.keepsake,'ribbon');
 assert.deepEqual(recordRun(next.profile,ended('three')).challenges,[]);
});
test('three distinct combat discoveries unlock early growth once and survive old-profile normalization', () => {
 const old=normalizeProfile({version:1,discoveries:['dawn'],buildDiscoveries:['sweep'],keepsake:'bookmark'});
 assert.equal(old.keepsake,'none');assert.equal(canEquipKeepsake(old,'bookmark'),false);
 const repeat=ended('repeat');repeat.ranks.sweep=1;
 assert.deepEqual(recordRun(old,repeat).challenges,[]);
 const third=ended('third');third.relics=['dew'];
 const result=recordRun(old,third);assert.deepEqual(result.challenges,['collection']);
 assert.equal(canEquipKeepsake(result.profile,'bookmark'),true);
 assert.deepEqual(recordRun(result.profile,third).challenges,[]);
 let raw;result.profile.keepsake='bookmark';
 const storage={setItem:(_,v)=>raw=v,getItem:()=>raw};assert.ok(saveProfile(storage,result.profile));
 assert.equal(loadProfile(storage).profile.keepsake,'bookmark');
 assert.equal(normalizeProfile({version:1,discoveries:['dawn','dawn','fake'],keepsake:'bookmark'}).keepsake,'none');
});
test('early growth boosts real collected XP before 60 seconds, ends at the boundary and does not boost dew healing', () => {
 const collect=(id,time)=>{
  const g=createGame(42,'ash',id);startGame(g);g.spawnClock=999;g.xpNeed=9999;
  g.time=time;g.relics=['dew'];g.player.hp=50;g.dewXp=24;
  g.gems.push({x:0,y:0,value:5,age:0});updateGame(g,1/60);
  return g;
 };
 const early=collect('bookmark',0);assert.equal(early.xp,6);assert.equal(early.dewXp,29);assert.equal(early.player.hp,50);
 assert.equal(collect('bookmark',59.9).xp,6);
 assert.equal(collect('bookmark',60).xp,5);assert.equal(collect('none',0).xp,5);
 assert.equal(collect('seed',0).xp,5);
 const fresh=createGame(44,'ash','bookmark');assert.equal(fresh.xp,0);assert.equal(fresh.time,0);assert.equal(fresh.player.hp,100);
 const paused=collect('bookmark',59.9);paused.phase='paused';const before={time:paused.time,xp:paused.xp};
 updateGame(paused,1);assert.equal(paused.time,before.time);assert.equal(paused.xp,before.xp);
});
test('growth reaches exact level thresholds for every order of the same collected XP', () => {
 // 35 base XP becomes 42 XP: precisely enough for levels 2, 3 and 4 (8 + 15 + 19).
 for(let i=0;i<17;i++) {
  const values=Array(16).fill(2);values.splice(i,0,3);
  const g=createGame(42,'ash','bookmark');startGame(g);g.spawnClock=999;g.nextElite=999;
  for(const value of values) {
   g.gems.push({x:0,y:0,value,age:0});updateGame(g,1/60);
   if(g.phase==='upgrade')assert.ok(chooseUpgrade(g,g.choices[0]));
  }
  assert.equal(g.level,4,`three-point gem at position ${i}`);assert.equal(g.xp,0);
 }
});
test('all starting tradeoffs affect real movement, health or XP attraction and never stack on restart', () => {
 for(const id of ['none','seed','ribbon','crown']) {
  const g=createGame(42,'ash',id);startGame(g);g.spawnClock=999;
  assert.equal(g.player.maxHp,id==='crown'?115:id==='none'?100:90);
  const speed=id==='ribbon'?180:id==='crown'?160:168;
  assert.equal(stats(g).speed,speed);updateGame(g,.1,{x:1,y:0});assert.ok(g.player.x>0);
  assert.equal(stats(g).magnet,id==='seed'?92:64);
  const reset=createGame(43,'ash',id);assert.equal(reset.player.hp,g.player.maxHp);assert.equal(stats(reset).speed,speed);
 }
 assert.equal(createGame(42,'ash','__proto__').keepsake,'none');
 const g=createGame(42,'ash','seed');startGame(g);g.spawnClock=999;g.gems.push({x:85,y:0,value:2,age:0});updateGame(g,.1);assert.ok(g.gems[0].x<85);
 const base=createGame(42);startGame(base);base.spawnClock=999;base.gems.push({x:85,y:0,value:2,age:0});updateGame(base,.1);assert.equal(base.gems[0].x,85);
});

test('specialization feedback follows real attacks, freezes on pause and expires within the shared cap', async () => {
 const {spawnEnemy, pauseGame, resumeGame, LIMITS}=await import('../src/survivor/game.js');
 for (const [branch, weapon, kind] of [['duelist','sword','focused-impact'],['sweep','sword','slash'],['wildfire','ember','fire-link'],['detonation','ember','ember-burst'],['bulwark','orbit','guard-impact'],['horizon','orbit','star-impact']]) {
  const g=createGame(42);startGame(g);g.spawnClock=999;g.xpNeed=99999;g.player.invincible=999;g.ranks.sword=0;g.ranks[weapon]=3;g.ranks[branch]=1;
  for (const x of [45,105,140]) {const e=spawnEnemy(g,2,false,{x,y:0});e.speed=0;e.hp=e.maxHp=branch==='wildfire'&&x===45?1:1000;}
  for(let i=0;i<180&&!g.effects.some(e=>e.kind===kind);i++) updateGame(g,1/60);
  const e=g.effects.find(e=>e.kind===kind);assert.ok(e,`${branch} produces ${kind} on actual combat`);
  if(branch==='sweep')assert.equal(e.branch,'sweep');if(branch==='detonation')assert.equal(e.concentrated,true);
  assert.ok(g.damageDealt[weapon]>0);assert.ok(g.effects.length<=LIMITS.effects);
  const age=e.age;pauseGame(g);updateGame(g,.03);assert.equal(e.age,age);
  resumeGame(g);g.enemies=[];g.shots=[];g.swing=null;
  for(let i=0;i<60;i++)updateGame(g,1/60);
  assert.ok(!g.effects.includes(e));
 }
});
