import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startGame,updateGame,pauseGame,resumeGame,spawnEnemy,stats,orbitPositions} from '../src/survivor/game.js';
import {LANDING_COMBO,landingComboHint,sweptOrbitHeads} from '../src/survivor/landing-combo.js';
import {bladeFollowups} from '../src/survivor/blade-chain.js';
import {orbitOffset} from '../src/survivor/orbit-shape.js';

const run=(id='ash')=>{
  const g=createGame(42,id);startGame(g);
  g.spawnClock=g.swordClock=g.emberClock=g.pulseClock=g.nextElite=999;g.xpNeed=99999;
  return g;
};
const step=(g,n=1,input)=>{for(let i=0;i<n;i++)updateGame(g,1/60,input);};
const land=g=>{updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});while(g.burst.active)step(g);};
const target=(g,x,y=0)=>{const e=spawnEnemy(g,0,false,{x,y});Object.assign(e,{speed:0,damage:0,hp:100000,maxHp:100000});return e;};

test('a primary-only breakthrough gains no free cast, blade or accelerated rune turn',()=>{
  for(const id of ['ash','ember','grove']){
    const g=run(id);land(g);step(g,50);
    assert.equal(g.shots.length,0);assert.equal(g.swing,null);
    assert.deepEqual(g.landingCombo,{sword:null,orbitRemaining:0,orbitAngle:0,orbitStep:0});
    assert.equal(g.signature.activations,0);
  }
});

test('secondary flames launch one aimed volley at the real landing and retain rank growth',()=>{
  for(const rank of [1,3,5]){
    const g=run();g.ranks.ember=rank;g.signature.charge=1;
    updateGame(g,1/60,{x:0,y:0,burst:{x:1,y:0}});
    assert.equal(g.shots.length,0);while(g.burst.active)step(g);
    const count=stats(g).emberCount;
    assert.equal(g.shots.length,count);assert.ok(Math.abs(g.emberClock-(999-g.time))<1e-8);
    assert.equal(g.signature.charge,1);assert.equal(g.signature.activations,0);
    for(const [index,shot] of g.shots.entries()){
      assert.equal(shot.targetId,null);assert.equal(shot.empowered,false);
      assert.equal(shot.damage,stats(g).emberDamage);
      assert.ok(shot.x>120 && shot.vx>0);assert.equal(shot.hopsLeft,index>0?(rank===5?2:rank===3?1:undefined):undefined);
    }
    step(g,20);assert.equal(g.events.filter(e=>e==='ember-shot').length,1);
  }
});

test('aimed landing fire can miss, uses real projectile collision, and preserves burn and blast identities',()=>{
  for(const branch of ['wildfire','detonation']){
    const g=run();g.ranks.ember=3;g.ranks[branch]=1;g.ranks.comet=1;
    const ahead=target(g,260),behind=target(g,-200);
    land(g);let blasted=false;
    for(let frame=0;frame<55;frame++){step(g);blasted ||= g.effects.some(e=>e.kind==='ember-burst');}
    assert.ok(ahead.hp<100000);assert.equal(behind.hp,100000);
    assert.ok(g.damageDealt.ember>0);
    assert.equal(blasted,branch==='detonation');
    if(branch==='wildfire')assert.ok(ahead.burn);
  }
});

test('landing sword waits for an active swing, strikes forward once and preserves the automatic clock',()=>{
  const g=run('ember');g.ranks.sword=5;g.signature.charge=1;
  const enemy=target(g,210),old={age:0,angle:Math.PI/2,hit:false,hitIds:[],chargedHits:0,followups:bladeFollowups(1),empowered:false};
  g.swing=old;land(g);
  assert.equal(g.swing,old);assert.ok(g.landingCombo.sword);
  const beforeClock=g.swordClock;
  while(g.swing===old)step(g);
  step(g);assert.equal(g.swing.angle,0);assert.equal(g.swing.empowered,false);
  assert.equal(g.swing.followups.length,2);assert.equal(g.landingCombo.sword,null);
  step(g,40);assert.ok(enemy.hp<100000);assert.ok(g.damageDealt.sword>0);
  assert.ok(g.swordClock<beforeClock && g.swordClock>990);
  assert.equal(g.signature.charge,1);assert.equal(g.signature.activations,0);
});

test('a secondary rune makes one additional physical turn, keeps its head count, and freezes in menus',()=>{
  const g=run('ember');g.ranks.orbit=3;land(g);
  assert.equal(g.landingCombo.orbitRemaining,LANDING_COMBO.orbitDuration);
  const count=orbitPositions(g).length;step(g,10);
  assert.ok(g.landingCombo.orbitAngle>0);assert.equal(orbitPositions(g).length,count);
  pauseGame(g);const frozen=JSON.stringify(g);step(g,120);assert.equal(JSON.stringify(g),frozen);
  resumeGame(g);step(g,60);
  assert.equal(g.landingCombo.orbitRemaining,0);assert.equal(g.landingCombo.orbitStep,0);
  assert.ok(Math.abs(g.landingCombo.orbitAngle)<1e-8 || Math.abs(g.landingCombo.orbitAngle-Math.PI*2)<1e-8);
});

test('fast rune arcs hit between 30Hz endpoints and keep the shared per-enemy hit gate',()=>{
  const g=run();Object.assign(g.ranks,{orbit:5,lunar:1,horizon:1});land(g);
  g.time=Math.PI/2/2.8;g.orbitShape={xx:1.55,xy:0,yy:.6};
  const angle=Math.PI/2+(2.8+Math.PI*2/.6)/30/2,offset=orbitOffset(angle,stats(g).orbitRadius,g.orbitShape);
  const enemy=target(g,g.player.x+offset.x,offset.y),damage=stats(g).orbitDamage;
  updateGame(g,1/30,{x:1,y:0});assert.ok(Math.abs(100000-enemy.hp-damage)<1e-8);
  const at=g.time;while(g.time<at+.35)step(g);
  assert.ok(Math.abs(100000-enemy.hp-damage)<1e-8,'extra samples and heads do not bypass orbAt');
});

test('swept rune samples share the rendered transform and remain close across a moving stretched arc',()=>{
  const g=run();Object.assign(g.ranks,{orbit:5,horizon:1});
  const old=orbitPositions(g),before={x:0,y:0,heads:old.map(h=>({...h,shape:{...h.shape}}))};
  g.player.x=8;g.orbitShape={xx:1.55,xy:.1,yy:.6};g.landingCombo.orbitAngle=.35;g.time=1/30;
  const current=orbitPositions(g),arc=.35+2.8/30,samples=sweptOrbitHeads(current,before,g.player,arc);
  assert.ok(samples.length>current.length);assert.ok(samples.length<64);
  const each=samples.length/current.length;
  for(let i=0;i<current.length;i++){
    const path=samples.slice(i*each,(i+1)*each);
    assert.ok(Math.hypot(path[0].x-old[i].x,path[0].y-old[i].y)<1e-8);
    assert.ok(Math.hypot(path.at(-1).x-current[i].x,path.at(-1).y-current[i].y)<1e-8);
    for(let j=1;j<path.length;j++)assert.ok(Math.hypot(path[j].x-path[j-1].x,path[j].y-path[j-1].y)<=18);
  }
});

test('landing volleys respect the shared shot cap and never create a repeat aura',()=>{
  for(const occupied of [79,80]){
    const g=run();g.ranks.ember=5;
    g.shots=Array.from({length:occupied},()=>({x:10000,y:0,vx:0,vy:0,life:10}));
    land(g);assert.equal(g.shots.length,80);step(g,60);assert.equal(g.shots.length,80);
  }
  const fresh=run();assert.deepEqual(fresh.landingCombo,{sword:null,orbitRemaining:0,orbitAngle:0,orbitStep:0});
});

test('copy names the actual secondary action and never promises a primary landing cast',()=>{
  for(const [id,primary] of [['ash','sword'],['ember','ember'],['grove','orbit']]){
    const g=run(id);assert.equal(landingComboHint(g,primary),'');
    for(const family of ['sword','ember','orbit'].filter(k=>k!==primary))assert.match(landingComboHint(g,family),/돌파 착지/);
    assert.equal(landingComboHint(g,'vitality'),'');
  }
});
