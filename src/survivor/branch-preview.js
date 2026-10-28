import { createGame, spawnEnemy, updateGame } from './game.js';
import { SPECIALIZATIONS, SPECIALIZATION_RANK, SPECIALIZATION_LEVEL } from './expansion.js';
import { createRenderer } from './render.js';
import { collectionArt } from './collection-art.js';
import { reduceMotion } from './preferences.js';

// An independent, repeatable encounter. It never reads or modifies the live run.
export function createBranchDemo(branch, characterId = 'ash') {
  if (!Object.hasOwn(SPECIALIZATIONS,branch)) return null;
  const meta = SPECIALIZATIONS[branch];
  const demo = createGame(42, characterId);
  Object.assign(demo, {phase:'playing',level:SPECIALIZATION_LEVEL,xpNeed:1e9,spawnClock:999,nextElite:999,nextRecovery:999});
  demo.player.invincible=999;
  for(const weapon of ['sword','ember','orbit']) demo.ranks[weapon]=0;
  demo.ranks[meta.weapon]=SPECIALIZATION_RANK;demo.ranks[branch]=1;
  const positions = meta.weapon === 'orbit'
    ? [65,130].flatMap(radius=>[0,Math.PI/2,Math.PI,Math.PI*1.5].map(angle=>({x:Math.cos(angle)*radius,y:Math.sin(angle)*radius})))
    : meta.weapon === 'ember'
      ? [{x:100,y:0},{x:125,y:-24},{x:125,y:24},{x:150,y:0},{x:150,y:-42},{x:150,y:42}]
      : [-1.2,-.65,0,.65,1.2].map(angle=>({x:Math.cos(angle)*100,y:Math.sin(angle)*100}));
  for(const position of positions) {
    const enemy=spawnEnemy(demo,0,false,position);
    enemy.speed=0;enemy.hp=enemy.maxHp=meta.weapon === 'ember' ? 40 : 110;
  }
  return demo;
}

export function openBranchPreview({branches,characterId,art,preferences,onClose}) {
  const options=[...new Set(branches)].filter(key=>Object.hasOwn(SPECIALIZATIONS,key));
  if (!options.length || !art) return null;
  const dialog=document.createElement('dialog');
  dialog.className='branch-preview';
  dialog.setAttribute('aria-labelledby','branch-preview-title');
  dialog.innerHTML=`<header><div><p class="eyebrow">같은 무기, 다른 전투</p><h2 id="branch-preview-title">전투법 비교</h2></div><button class="branch-preview-close" aria-label="미리보기 닫기" autofocus>×</button></header>
    <div class="branch-preview-tabs" role="tablist" aria-label="비교할 전투법">${options.map((key,i)=>`<button id="demo-tab-${key}" role="tab" data-demo-branch="${key}" aria-selected="${i===0}" aria-controls="branch-demo-panel" tabindex="${i===0?0:-1}">${collectionArt(key)}<span>${SPECIALIZATIONS[key].name}</span></button>`).join('')}</div>
    <section id="branch-demo-panel" class="branch-demo-body" role="tabpanel" tabindex="0" aria-labelledby="demo-tab-${options[0]}"><div class="branch-demo-scene"><canvas aria-hidden="true"></canvas><span class="branch-demo-caption">무기 ${SPECIALIZATION_RANK}단계 기준</span></div><div class="branch-demo-copy"></div></section>
    <footer><p>살펴보는 동안 여정의 시간이 멈춰 있어요.</p><button class="primary" data-close-demo>선택 화면으로 <span aria-hidden="true">→</span></button></footer>`;
  document.body.append(dialog);
  let painter, demo, frame=0, last=0, accumulator=0, selected=options[0], disposed=false;
  const system=matchMedia('(prefers-reduced-motion: reduce)');
  const canvas=dialog.querySelector('canvas');
  const resize=new ResizeObserver(()=>{if(painter && !disposed && dialog.open) draw();});
  const reduced=()=>reduceMotion(preferences,system.matches);
  const step=()=>{ updateGame(demo,1/60,{x:0,y:0});demo.events.length=0; };
  function draw() { painter.render(demo,demo.time*1000); }
  function reset() {
    demo=createBranchDemo(selected,characterId);last=0;accumulator=0;
    if(reduced()) for(let i=0;i<(SPECIALIZATIONS[selected].weapon==='ember'?66:12);i++) step();
  }
  function animate(now) {
    if(disposed || reduced() || !dialog.open || document.hidden) { frame=0;return; }
    accumulator+=last?Math.min(.1,(now-last)/1000):0;last=now;
    if(accumulator>=1/30) {
      while(accumulator>=1/60) { step();accumulator-=1/60; }
      if(demo.time>=4.5) reset();
      draw();
    }
    frame=requestAnimationFrame(animate);
  }
  function play() {
    cancelAnimationFrame(frame);frame=0;last=0;
    if(reduced()) reset();
    draw();
    if(!reduced() && !document.hidden) frame=requestAnimationFrame(animate);
  }
  function select(key) {
    selected=key;reset();
    const meta=SPECIALIZATIONS[key];
    for(const tab of dialog.querySelectorAll('[data-demo-branch]')) {
      const active=tab.dataset.demoBranch===key;
      tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
    }
    dialog.querySelector('[role="tabpanel"]').setAttribute('aria-labelledby',`demo-tab-${key}`);
    canvas.dataset.branch=key;
    dialog.querySelector('.branch-demo-copy').innerHTML=`<p class="branch-demo-kind">${reduced()?'정지 장면':'공격 방식 미리보기'}</p><h3>${meta.name}</h3><p>${meta.description}</p><div class="branch-demo-effect"><small>이 전투법의 변화</small><strong>${meta.change}</strong></div>`;
    play();
  }
  function visibility() { if(document.hidden) {cancelAnimationFrame(frame);frame=0;last=0;} else play(); }
  function motion() { select(selected); }
  for(const tab of dialog.querySelectorAll('[data-demo-branch]')) {
    tab.onclick=()=>select(tab.dataset.demoBranch);
    tab.onkeydown=event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const index=options.indexOf(selected);
      const next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowRight'?1:-1)+options.length)%options.length;
      select(options[next]);dialog.querySelector(`[data-demo-branch="${options[next]}"]`).focus();
    };
  }
  dialog.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key!=='Tab') return;
    const controls=[...dialog.querySelectorAll('button')].filter(node=>node.tabIndex>=0);
    if(event.shiftKey && document.activeElement===controls[0]) {event.preventDefault();controls.at(-1).focus();}
    else if(!event.shiftKey && document.activeElement===controls.at(-1)) {event.preventDefault();controls[0].focus();}
  });
  dialog.querySelector('.branch-preview-close').onclick=()=>dialog.close();
  dialog.querySelector('[data-close-demo]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{
    disposed=true;cancelAnimationFrame(frame);resize.disconnect();
    document.removeEventListener('visibilitychange',visibility);system.removeEventListener('change',motion);
    dialog.remove();painter=null;demo=null;onClose?.();
  },{once:true});
  dialog.showModal();
  painter=createRenderer(canvas,art,{...preferences,damageNumbers:false});
  select(selected);
  resize.observe(canvas);
  document.addEventListener('visibilitychange',visibility);system.addEventListener('change',motion);
  return dialog;
}
