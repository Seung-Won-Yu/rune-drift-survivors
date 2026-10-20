import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/survivor/game.js';
import { createProfile, recordRun } from '../src/survivor/profile.js';
import { campMission, nextGoal, resultTakeaway } from '../src/survivor/camp.js';
import { evolutionProgress, upgradeRecipeHint, growthContext, fieldLoadout, growthChoice } from '../src/survivor/field-guide.js';
import { loadPreferences, savePreferences, reduceMotion, PREFERENCES_KEY } from '../src/survivor/preferences.js';

test('field notes track real evolution requirements without changing the run', () => {
  const game = createGame(42), before = JSON.stringify(game);
  assert.deepEqual(evolutionProgress(game, 'dawn').parts.map(p => p.value), [1, 0, 0]);
  assert.equal(evolutionProgress(game, 'dawn').ready, false);
  assert.match(upgradeRecipeHint(game, 'orbit'), /여명의 검 진화 재료/);
  assert.match(growthContext(game), /황동 검/);
  assert.match(fieldLoadout(game), /1단계 \/ 6/);
  assert.equal(JSON.stringify(game), before);
  Object.assign(game.ranks, {sword:6, orbit:2}); game.eliteKills=4;
  assert.deepEqual(evolutionProgress(game, 'dawn').parts.map(p => p.value), [3, 1, 1]);
  assert.equal(evolutionProgress(game, 'dawn').ready, true);
  assert.equal(upgradeRecipeHint(game, 'sword'), '');
  game.ranks.dawn=1;
  assert.equal(evolutionProgress(game, 'dawn').complete, true);
  assert.equal(evolutionProgress(game, 'dawn').ready, false);
  assert.doesNotMatch(upgradeRecipeHint(game, 'orbit'), /여명의 검/);
  assert.equal(evolutionProgress(game, 'invalid'), null);
});

test('departure mission follows explicit goals, companion unlocks and earned rewards without grants', () => {
  const profile=createProfile(), before=structuredClone(profile);
  assert.equal(campMission(profile).id, 'companion:ember');
  assert.deepEqual(profile,before);
  profile.bestTime=60;
  assert.equal(campMission(profile).id,'companion:grove');
  profile.totalKills=200;
  assert.equal(campMission(profile).id,'keepsake:seed');
  profile.experiment='sweep';
  assert.equal(campMission(profile).id,'branch:sweep');
  profile.goal='evolution:dawn';
  assert.equal(campMission(profile).id,'evolution:dawn');
});

test('display preferences are isolated from progress and tolerate unavailable storage', () => {
  const values=new Map([['ash-profile-v1','saved-progress']]);
  const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  assert.deepEqual(loadPreferences(storage),{motion:'system',damageNumbers:true});
  assert.equal(savePreferences(storage,{motion:'reduced',damageNumbers:false}),true);
  assert.deepEqual(loadPreferences(storage),{motion:'reduced',damageNumbers:false});
  assert.equal(values.get('ash-profile-v1'),'saved-progress');
  values.set(PREFERENCES_KEY,'{broken');
  assert.deepEqual(loadPreferences(storage),{motion:'system',damageNumbers:true});
  const blocked={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
  assert.equal(savePreferences(blocked,{motion:'reduced'}),false);
  assert.deepEqual(loadPreferences(blocked),{motion:'system',damageNumbers:true});
  assert.equal(reduceMotion({motion:'system'},true),true);
  assert.equal(reduceMotion({motion:'system'},false),false);
  assert.equal(reduceMotion({motion:'reduced'},false),true);
});


test('journal and departure resolve the same discovery after the first rewards', () => {
  const profile=createProfile();
  Object.assign(profile,{bestTime:80,totalKills:250,altarRuns:1,wins:1,buildDiscoveries:['sweep','wildfire'],relicDiscoveries:['dew']});
  const mission=campMission(profile);
  assert.equal(mission.id,'branch:duelist');
  assert.ok(nextGoal(profile).startsWith(mission.title));
  profile.goal='evolution:lunar';
  assert.ok(nextGoal(profile).startsWith(campMission(profile).title));
});
test('growth decisions distinguish acquisition, commitment, evolution and real ranks', () => {
  const g=createGame(42),before=JSON.stringify(g);
  assert.equal(growthChoice(g,'ember').kind,'new');
  assert.equal(growthChoice(g,'sword').step,'1 → 2단계');
  assert.equal(growthChoice(g,'sweep').kind,'specialization');
  assert.equal(growthChoice(g,'heal').label,'즉시 회복');
  assert.equal(growthChoice(g,'vitality').label,'생존 강화');
  assert.equal(growthChoice(g,'dawn').action,'지금 진화하기');
  assert.equal(JSON.stringify(g),before);
  Object.assign(g.ranks,{sword:3,orbit:1});g.eliteKills=1;g.choices=['dawn','might','heal'];
  assert.match(growthContext(g),/조건 완성 · 아래에서 진화하세요/);
  assert.doesNotMatch(growthContext(g),/recipe-parts/);
});

test('result takeaway uses earned deltas and keeps reward viewing separate from equipping', () => {
  const game=createGame(42);game.runId='earned-result';game.phase='ended';game.outcome='defeat';game.time=65;game.kills=200;
  Object.assign(game.ranks,{sweep:1,dawn:1});game.relics=['fang'];game.damageTaken.contact=100;
  const saved=recordRun(createProfile(),game),before=JSON.stringify([game,saved.profile]);
  const result=resultTakeaway(game,saved.profile,saved);
  assert.deepEqual(result.counts.map(c=>[c.label,c.value]),[['새 발견',3],['동료 합류',2],['기념품 해금',1],['숙련 인장',1]]);
  assert.equal(result.feature.id,'keepsake:bookmark');
  assert.equal(result.feature.preparation,'keepsake');
  assert.match(result.feature.detail,/20%/);
  assert.match(result.tip,/가장자리/);
  assert.equal(saved.profile.keepsake,'none');
  assert.equal(JSON.stringify([game,saved.profile]),before);
  const repeated=recordRun(saved.profile,game);
  assert.equal(repeated.added,false);
  assert.deepEqual(resultTakeaway(game,repeated.profile,repeated).counts,[]);
});

test('a no-reward result gives the real pending goal without inventing grants or a damage cause', () => {
  const game=createGame(42),profile=createProfile();game.phase='ended';game.outcome='defeat';
  profile.goal='evolution:dawn';
  const result=resultTakeaway(game,profile);
  assert.deepEqual(result.counts,[]);
  assert.equal(result.feature.id,profile.goal);
  assert.equal(result.tip,null);
  game.damageTaken.thorns=12;game.damageTaken.contact=4;
  assert.match(resultTakeaway(game,profile).tip,/가시/);
  game.outcome='victory';
  assert.equal(resultTakeaway(game,profile).tip,null);
});

test('earned companion and discovery links resolve to the correct codex group', () => {
  const game=createGame(42),profile=createProfile();profile.bestTime=65;
  assert.equal(resultTakeaway(game,profile,{unlocked:['ember']}).feature.id,'companion:ember');
  profile.buildDiscoveries=['duelist'];
  assert.equal(resultTakeaway(game,profile,{discoveries:{branches:['duelist']}}).feature.id,'branch:duelist');
  assert.equal(resultTakeaway(game,profile,{discoveries:{relics:['fang']}}).feature.id,'relic:fang');
});

test('mastery-only reward directs to the journal and accurately reports the completed reroll benefit', () => {
  const game=createGame(42),profile=createProfile();
  Object.assign(profile.characters.ash,{branches:['sweep','duelist'],evolved:true,wins:1});
  const result=resultTakeaway(game,profile,{mastery:['branches']});
  assert.equal(result.feature.preparation,'journal');
  assert.match(result.feature.detail,/다시 뽑기 2회/);
  assert.deepEqual(result.counts,[{label:'숙련 인장',value:1}]);
});
