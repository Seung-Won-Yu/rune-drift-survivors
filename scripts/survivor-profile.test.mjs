import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startGame, updateGame, spawnEnemy, stats, draftUpgrades, nextEvolution } from '../src/survivor/game.js';
import { CHARACTERS, isUnlocked } from '../src/survivor/characters.js';
import { createProfile, normalizeProfile, loadProfile, saveProfile, recordRun, PROFILE_KEY } from '../src/survivor/profile.js';

const result=(id,character='ash',time=60,kills=120)=>({...createGame(1,character),runId:id,phase:'ended',outcome:'defeat',time,kills});
test('characters start with distinct weapons, HP and movement without a hidden sword',()=>{
  for(const [id,character] of Object.entries(CHARACTERS)){
    const game=createGame(1,id);startGame(game);game.spawnClock=999;
    assert.equal(game.player.maxHp,character.hp);assert.equal(stats(game).speed,character.speed);
    assert.equal(game.ranks[character.weapon],1);
    assert.equal(['sword','ember','orbit'].filter(k=>game.ranks[k]).length,1);
    const target=spawnEnemy(game,2,false,{x:character.weapon==='ember'?180:60,y:0});target.speed=0;
    for(let i=0;i<150;i++)updateGame(game,1/60);
    assert.ok(game.damageDealt[character.weapon]>0,id);
    if(id!=='ash')assert.equal(game.damageDealt.sword,0,id);
  }
});
test('guardian armor reduces actual received damage and survives the first contact',()=>{
  const game=createGame(1,'grove');startGame(game);spawnEnemy(game,0,false,{x:0,y:0});updateGame(game,1/60);
  assert.equal(game.player.hp,125-8*.85);assert.equal(game.damageTaken.contact,8*.85);
});
test('results unlock companions, preserve input and ignore duplicate result application',()=>{
  const initial=createProfile(),first=result('a');
  const recorded=recordRun(initial,first);assert.deepEqual(recorded.unlocked,['ember']);assert.equal(initial.runs,0);
  const duplicate=recordRun(recorded.profile,first);assert.equal(duplicate.added,false);assert.equal(duplicate.profile.totalKills,120);
  const second=recordRun(recorded.profile,result('b','ember',70,80));
  assert.deepEqual(second.unlocked,['grove']);assert.equal(second.profile.runs,2);assert.equal(second.profile.totalKills,200);
  assert.equal(isUnlocked(second.profile,'grove'),true);
});
test('unfinished runs cannot unlock companions or add records',()=>{
  const game=result('a');game.phase='playing';const out=recordRun(createProfile(),game);
  assert.equal(out.added,false);assert.equal(out.profile.totalKills,0);
});
test('records include fastest victory, character history and discovered evolutions',()=>{
  let profile=createProfile();
  for(let i=0;i<8;i++){const game=result(`r${i}`,'ash',280-i,250);game.outcome=i%2?'victory':'survived';game.ranks.dawn=1;profile=recordRun(profile,game).profile;}
  assert.equal(profile.history.length,5);assert.equal(profile.wins,4);assert.equal(profile.characters.ash.fastestWin,273);
  assert.deepEqual(profile.discoveries,['dawn']);assert.equal(profile.history[0].time,273);
});
test('malformed profile data cannot select locked or unknown characters',()=>{
  const profile=normalizeProfile({version:1,selected:'grove',totalKills:-1,bestTime:Infinity,discoveries:['not-real'],characters:{ash:{runs:-4,fastestWin:'bad'}}});
  assert.equal(profile.selected,'ash');assert.equal(profile.totalKills,0);assert.deepEqual(profile.discoveries,[]);
  assert.equal(profile.characters.ash.runs,0);assert.equal(profile.characters.ash.fastestWin,null);
  assert.equal(createGame(1,'__proto__').characterId,'ash');
});
test('storage loading migrates the old best record, and save errors leave memory usable',()=>{
  const values=new Map([['ash-best','123']]);const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  const loaded=loadProfile(storage);assert.equal(loaded.profile.bestKills,123);assert.equal(loaded.canSave,true);
  const profile=recordRun(loaded.profile,result('r1')).profile;assert.equal(saveProfile(storage,profile),true);
  assert.equal(loadProfile(storage).profile.runs,1);
  assert.equal(saveProfile({setItem(){throw new Error('quota');}},profile),false);assert.equal(profile.runs,1);
});
test('invalid JSON can recover, unavailable storage and future formats are preserved',()=>{
  const bad=loadProfile({getItem:()=>'{bad'});assert.equal(bad.canSave,true);assert.ok(bad.warning);
  const denied=loadProfile({getItem(){throw new Error('denied');}});assert.equal(denied.canSave,false);
  const future=loadProfile({getItem:key=>key===PROFILE_KEY?'{"version":99}':null});assert.equal(future.canSave,false);assert.ok(future.warning);
});

test('guardian starts with two defensive runes while other heroes gain one on unlock',()=>{
  assert.equal(stats(createGame(1,'grove')).orbitCount,2);
  const ash=createGame(1,'ash');ash.ranks.orbit=1;assert.equal(stats(ash).orbitCount,1);
});

test('declining alternate weapons still leaves room for the starting weapon to grow',()=>{
  for(const id of Object.keys(CHARACTERS)){
    const game=createGame(12,id);game.level=5;
    const choices=draftUpgrades(game);
    assert.ok(choices.includes(CHARACTERS[id].weapon));
    assert.equal(choices.filter(key=>['sword','ember','orbit'].includes(key)&&game.ranks[key]===0).length,1);
    assert.equal(new Set(choices).size,3);
  }
});

test('the initial evolution hint follows the selected companion weapon',()=>{
  assert.equal(nextEvolution(createGame(1,'ash')),'dawn');
  assert.equal(nextEvolution(createGame(1,'ember')),'comet');
  assert.equal(nextEvolution(createGame(1,'grove')),'lunar');
});
