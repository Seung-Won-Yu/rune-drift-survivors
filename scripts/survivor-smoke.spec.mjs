import { test, expect } from '@playwright/test';

const pageErrors=new WeakMap();
test.afterEach(async({page})=>{expect(pageErrors.get(page)??[], 'browser runtime errors').toEqual([]);});

const snapshot = page => page.evaluate(() => window.__ASH_QA__.snapshot());
const scenario = (page, name) => page.evaluate(name => window.__ASH_QA__.scenario(name), name);

test.describe('rendered combat priorities',()=>{
  test.use({deviceScaleFactor:2});
  test('authored poses decode, keep planted feet and give a distinct leap and grounded death',async({page})=>{
    const result=await page.evaluate(async()=>{
      const {loadArt}=await import('/src/survivor/render.js');
      const {createActorPainter}=await import('/src/survivor/actor-art.js');
      const progress=[],art=await loadArt('/',(n,total)=>progress.push([n,total])),draw=createActorPainter(art.motion);
      const canvas=document.createElement('canvas');canvas.width=400;canvas.height=300;const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const capture=(key,index,flip=false)=>{
        ctx.clearRect(0,0,400,300);draw(ctx,key,index,200,250,{flip});
        const data=ctx.getImageData(0,0,400,300).data;let hash=0,bottom=0,top=300,left=400,right=0;
        for(let y=0;y<300;y++)for(let x=0;x<400;x++){const p=(y*400+x)*4;if(data[p+3]<128)continue;
          hash=(Math.imul(hash,31)+data[p]+data[p+1]*3+data[p+2]*7)>>>0;bottom=Math.max(bottom,y);top=Math.min(top,y);left=Math.min(left,x);right=Math.max(right,x);}
        return {hash,bottom,top,left,right};
      };
      let allocations=0;const create=document.createElement.bind(document);
      document.createElement=(...args)=>{allocations++;return create(...args);};
      try {
        for(const key of ['ash','hound','giant'])for(let index=0;index<24;index++) {
          if(key==='ash'&&[12,13].includes(index))continue;
          draw(ctx,key,index,200,250,{flash:true});
        }
      } finally { document.createElement=create; }
      return {progress,allocations,actors:['ash','hound','giant'].map(key=>({key,walk:Array.from({length:8},(_,i)=>capture(key,i)),death:capture(key,23),ready:capture(key,0),flip:capture(key,0,true)})),leap:capture('hound',12)};
    });
    expect(result.progress.at(-1)).toEqual([9,9]);
    expect(result.allocations,'all pose canvases are ready before combat').toBe(0);
    for(const actor of result.actors){
      expect(new Set(actor.walk.map(p=>p.hash)).size,actor.key).toBeGreaterThanOrEqual(6);
      expect(Math.max(...actor.walk.map(p=>p.bottom))-Math.min(...actor.walk.map(p=>p.bottom)),actor.key).toBeLessThanOrEqual(2);
      expect(actor.death.bottom-actor.death.top,actor.key).toBeLessThan(actor.ready.bottom-actor.ready.top);
      expect(Math.abs(actor.ready.left+actor.flip.right-399),actor.key).toBeLessThanOrEqual(1);
      expect(actor.death.left).toBeGreaterThan(80);expect(actor.death.right).toBeLessThan(320);
    }
    expect(result.leap.bottom).toBeLessThan(247);
  });
  for(const viewport of [{width:1280,height:720},{width:320,height:740}]){
    test(`player body survives front-row enemies and friendly effects at ${viewport.width}px`,async({page})=>{
      await page.setViewportSize(viewport);
      const result=await page.evaluate(async()=>{
        const {createRenderer,loadArt}=await import('/src/survivor/render.js');
        const {createGame,spawnEnemy}=await import('/src/survivor/game.js');
        const canvas=document.createElement('canvas');canvas.style.cssText=`width:${innerWidth}px;height:${innerHeight}px;position:absolute;left:0;top:0`;
        document.body.append(canvas);const renderer=createRenderer(canvas,await loadArt('/'));
        const g=createGame(42);g.phase='paused';g.player.invincible=0;
        const capture=()=>{const {scale}=renderer.render(g);const dpr=canvas.width/innerWidth;
          return [...canvas.getContext('2d').getImageData(Math.round(canvas.width/2),Math.round(canvas.height*.53-65*scale*dpr),4,4).data];};
        const clear=capture();const e=spawnEnemy(g,2,false,{x:0,y:12});e.speed=0;
        g.effects.push({kind:'ember-burst',x:0,y:-65,range:90,age:.1,life:.4});
        const before=JSON.stringify(g),overlap=capture();canvas.remove();
        return {clear,overlap,unchanged:before===JSON.stringify(g)};
      });
      expect(result.overlap).toEqual(result.clear);expect(result.unchanged).toBe(true);
    });
    test(`all danger edges remain above occluding actors and effects at ${viewport.width}px`,async({page})=>{
      await page.setViewportSize(viewport);
      const checks=await page.evaluate(async()=>{
        const {createRenderer,loadArt}=await import('/src/survivor/render.js');
        const {createGame,spawnEnemy,spawnBoss,spawnChampion,SLAM}=await import('/src/survivor/game.js');
        const {CHAMPION_HUNT,CHAMPION_SPORE}=await import('/src/survivor/champions.js');
        const {GIANT,HOUND,SPORE}=await import('/src/survivor/enemies.js');const {BOSS}=await import('/src/survivor/boss.js');
        const canvas=document.createElement('canvas');canvas.style.cssText=`width:${innerWidth}px;height:${innerHeight}px;position:absolute;left:0;top:0`;
        document.body.append(canvas);const renderer=createRenderer(canvas,await loadArt('/')),ctx=canvas.getContext('2d'),checks=[];
        for(const kind of ['giant','elite','spore','royal-spore','hound','champion-hound','charge','thorns']){
          const g=createGame(42);g.phase='paused';g.player.invincible=0;let point;
          if(kind==='giant'||kind==='elite'){
            const rule=kind==='elite'?SLAM:GIANT,e=spawnEnemy(g,2,kind==='elite',{x:-140,y:-90});
            e.slam={x:0,y:0,age:rule.windup*.65,hit:false};point={x:rule.radius,y:0};
          }else if(kind==='spore'||kind==='royal-spore'){const rule=kind==='spore'?SPORE:CHAMPION_SPORE;g.spores=[{x:90,y:0,age:rule.windup*.65,royal:kind==='royal-spore'}];point={x:90+rule.radius,y:0};}
          else if(kind==='hound'||kind==='champion-hound'){
            const e=kind==='hound'?spawnEnemy(g,1,false,{x:-140,y:-90}):spawnChampion(g,1),rule=kind==='hound'?HOUND:CHAMPION_HUNT;Object.assign(e,{x:-140,y:-90,hunt:{x:0,y:0,angle:0,age:rule.windup+.1}});point={x:100,y:rule.width/2};
          }else{
            const boss=spawnBoss(g);Object.assign(boss,{x:-200,y:-150,entrance:0,pattern:{kind,x:0,y:0,angle:0,age:BOSS.windup*.65}});
            point={x:100,y:kind==='charge'?BOSS.chargeWidth/2:0};
          }
          const patch=()=>{const {scale}=renderer.render(g),dpr=canvas.width/innerWidth;
            return [...ctx.getImageData(Math.round(canvas.width/2+point.x*scale*dpr)-4,Math.round(canvas.height*.53+point.y*scale*dpr)-4,9,9).data];};
          const clear=patch();let brightest=0;
          for(let i=0;i<clear.length;i+=4)if(clear[i]+clear[i+1]+clear[i+2]>clear[brightest]+clear[brightest+1]+clear[brightest+2])brightest=i;
          const e=spawnEnemy(g,2,false,{x:point.x,y:point.y+20});e.speed=0;
          g.effects.push({kind:'ember-burst',...point,range:90,age:.1,life:.4});
          const before=JSON.stringify(g),overlap=patch();
          checks.push({kind,error:Math.max(...[0,1,2].map(c=>Math.abs(clear[brightest+c]-overlap[brightest+c]))),unchanged:before===JSON.stringify(g)});
        }
        canvas.remove();return checks;
      });
      for(const check of checks){expect(check.error,check.kind).toBeLessThanOrEqual(3);expect(check.unchanged,check.kind).toBe(true);}
    });
  }
  test('crowd number budget preserves real effects and resumes the full readout in sparse combat',async({page})=>{
    const result=await page.evaluate(async()=>{
      const {createRenderer,loadArt}=await import('/src/survivor/render.js');const {createGame,spawnEnemy}=await import('/src/survivor/game.js');
      const canvas=document.createElement('canvas');canvas.style.cssText='width:800px;height:680px;position:absolute;left:0;top:0';document.body.append(canvas);
      const renderer=createRenderer(canvas,await loadArt('/')),ctx=canvas.getContext('2d'),draw=ctx.fillText.bind(ctx);let numbers=[];
      ctx.fillText=(text,...args)=>{if(/^\d+$/.test(String(text)))numbers.push(Number(text));return draw(text,...args);};
      const g=createGame(42);g.phase='paused';
      for(let i=0;i<20;i++)g.effects.push({kind:'damage',x:i*4,y:0,text:i+1,tone:'#ffe0a0',age:.1,life:.55});
      renderer.render(g);const sparse=[...numbers];numbers=[];
      for(let i=0;i<12;i++)spawnEnemy(g,0,false,{x:i*3,y:80});
      const before=JSON.stringify(g);renderer.render(g);const crowded=[...numbers],unchanged=before===JSON.stringify(g);
      g.enemies=[];numbers=[];renderer.render(g);const restored=[...numbers];canvas.remove();return {sparse,crowded,restored,unchanged};
    });
    expect(result.sparse).toHaveLength(20);expect(result.crowded).toEqual([1,2,3,4,5,6,7,8]);
    expect(result.restored).toEqual(result.sparse);expect(result.unchanged).toBe(true);
  });
});

test.beforeEach(async ({ page }) => {
  const errors=[];pageErrors.set(page,errors);page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/survivor/?qa');
  await expect(page.getByRole('button', { name: '숲에 들어가기' })).toBeVisible();
});

for (const viewport of [{width:1280,height:720},{width:390,height:844},{width:740,height:360}]) {
  test(`discovered inheritance is selectable, saved per companion and ready at departure ${viewport.width}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await expect(page.locator('[data-inheritance="sweep"]')).toBeDisabled();
    await page.evaluate(() => localStorage.setItem('ash-profile-v1', JSON.stringify({version:1,bestTime:90,totalKills:230,buildDiscoveries:['sweep','wildfire']})));
    await page.reload();
    await page.locator('[data-inheritance="sweep"]').click();
    await expect(page.locator('[data-inheritance="sweep"]')).toHaveAttribute('aria-pressed','true');
    expect((await snapshot(page)).ranks.sweep).toBe(1);
    await page.reload();expect((await snapshot(page)).inheritance).toBe('sweep');
    await page.locator('[data-character="ember"]').click();expect((await snapshot(page)).inheritance).toBeNull();
    await page.locator('[data-open-codex]').click();
    await page.locator('[data-codex-entry="branch:wildfire"]').click();
    await page.locator('[data-prepare-inheritance="wildfire"]').click();
    expect((await snapshot(page)).inheritance).toBe('wildfire');
    await expect(page.locator('.departure-summary')).toContainText('번지는 불꽃');
    await page.locator('[data-character="ash"]').click();expect((await snapshot(page)).inheritance).toBe('sweep');
    const layout=await page.evaluate(()=>({outer:document.documentElement.scrollHeight-innerHeight,start:document.getElementById('start-game').getBoundingClientRect().bottom,height:innerHeight}));
    expect(layout.outer).toBeLessThanOrEqual(1);expect(layout.start).toBeLessThanOrEqual(layout.height);
    await page.screenshot({path:`output/playwright/survivor/rhythm-camp-${viewport.width}.png`});
    await page.getByRole('button',{name:'숲에 들어가기'}).click();
    await expect(page.locator('#signature-name')).toHaveText('잿빛 결의');
    await expect(page.locator('#signature-state')).toContainText('적중');
    await page.screenshot({path:`output/playwright/survivor/rhythm-hud-${viewport.width}.png`});
    await page.getByRole('button',{name:'일시정지',exact:true}).click();
    const frozen=await snapshot(page);await page.waitForTimeout(250);expect((await snapshot(page)).signature).toEqual(frozen.signature);
    await page.screenshot({path:`output/playwright/survivor/rhythm-${viewport.width}.png`});
  });
}

test('codex goal persists, marks eligible growth, records on defeat and completes companion mastery', async ({page}) => {
  await page.evaluate(() => localStorage.setItem('ash-profile-v1', JSON.stringify({version:1, wins:1, bestTime:280, totalKills:400, characters:{ash:{wins:1, branches:['duelist'], evolved:true}}, buildDiscoveries:['duelist'], discoveries:['dawn']})));
  await page.reload();
  await page.locator('[data-open-codex]').click();
  await page.locator('[data-codex-entry="branch:sweep"]').click();
  await page.locator('[data-codex-goal]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-codex-goal]')).toHaveAttribute('aria-pressed', 'true');
  expect((await snapshot(page)).profile.goal).toBe('branch:sweep');
  await page.locator('[data-close-codex]').click();
  await expect(page.locator('.experiment-plan')).toContainText('반월 검법');
  await page.reload(); expect((await snapshot(page)).goal).toBe('branch:sweep');
  await page.getByRole('button', {name:'숲에 들어가기'}).click();
  await scenario(page, 'branch-sword');
  await expect(page.locator('[data-upgrade="sweep"] .experiment-badge')).toContainText('이번 판의 목표');
  await expect(page.locator('[data-upgrade="duelist"] .experiment-badge')).toHaveCount(0);
  await page.locator('[data-upgrade="sweep"]').click();
  await expect(page.locator('#evolution-hint')).toContainText('반월 검법 달성');
  await scenario(page, 'record-experiment');
  await expect(page.locator('.mastery-reward')).toContainText('숙련 완료');
  const result = await snapshot(page);
  expect(result.profile.goal).toBeNull(); expect(result.profile.characters.ash.branches).toEqual(['duelist', 'sweep']);
  await page.getByRole('button',{name:'동료 선택',exact:true}).click();
  await expect(page.locator('.mastery-board summary')).toContainText('3/3'); expect((await snapshot(page)).rerolls).toBe(2);
  await page.locator('[data-vow="mist"]').click(); expect((await snapshot(page)).vow).toBe('mist');
  await page.reload(); expect((await snapshot(page)).vow).toBe('mist'); expect((await snapshot(page)).rerolls).toBe(2);
});

test('tracked relic highlights only its promised offer and stays unrecorded until the journey ends', async ({page}) => {
  await scenario(page, 'event-altar');
  await page.getByRole('button', {name:'보상 후보 살펴보기'}).click();
  const promised = (await snapshot(page)).encounters[0].rewards;
  const key = promised.find(id => ['dew', 'briar'].includes(id)); expect(key).toBeTruthy();
  await scenario(page, 'record-unlock');
  await page.getByRole('button', {name:'동료 선택',exact:true}).click();
  await page.locator('[data-open-codex]').click();
  await page.locator(`[data-codex-entry="relic:${key}"]`).click(); await page.locator('[data-codex-goal]').click();
  await page.locator('[data-close-codex]').click();
  await page.getByRole('button', {name:'숲에 들어가기'}).click(); await scenario(page, 'event-altar');
  await expect(page.locator('[data-relic]')).toHaveCount(3, {timeout:15000});
  expect((await snapshot(page)).relicChoices).toEqual(promised);
  await expect(page.locator(`[data-relic="${key}"] .experiment-badge`)).toContainText('이번 판의 목표');
  await expect(page.locator('[data-relic] .experiment-badge')).toHaveCount(1);
  await page.locator(`[data-relic="${key}"]`).click();
  const selected = await snapshot(page); expect(selected.goalProgress.state).toBe('complete');
  expect(selected.profile.goal).toBe(`relic:${key}`); expect(selected.profile.relicDiscoveries).toEqual([]);
  await page.keyboard.press('Escape'); await expect(page.locator('.build-summary')).toContainText('여정을 마치면 도감에 기록');
});

for (const viewport of [{width:1280,height:720},{width:390,height:844},{width:740,height:360}]) {
  test(`reroll and collection controls remain usable inside fixed panels at ${viewport.width}px`, async ({page}) => {
    await page.setViewportSize(viewport);
    await expect(page.locator('[data-vow="mist"]')).toBeDisabled();
    await page.locator('[data-open-codex]').click();
    await page.locator('[data-codex-entry="evolution:dawn"]').click();
    await page.locator('[data-codex-goal]').click();
    await expect(page.locator('[data-codex-goal]')).toHaveAttribute('aria-pressed','true');
    await page.locator('[data-close-codex]').click();
    await expect(page.locator('.experiment-plan')).toContainText('여명의 검');
    await page.getByRole('button', {name:'숲에 들어가기'}).click();
    await scenario(page, 'upgrade'); const before = await snapshot(page);
    await page.locator('[data-reroll]').click(); const after = await snapshot(page);
    expect(after.choices.some(key => !before.choices.includes(key))).toBe(true);
    expect(after.phase).toBe('upgrade'); expect(after.time).toBe(before.time); expect(after.player.hp).toBe(before.player.hp); expect(after.ranks).toEqual(before.ranks);
    expect(after.rerolls).toBe(0); await expect(page.locator('[data-reroll]')).toBeDisabled();
    await expect(page.locator('.reroll-row [role="status"]')).toContainText('후보가 바뀌었습니다');
    const bounds = await page.evaluate(() => {const p=document.querySelector('#panel').getBoundingClientRect();return {outer:document.documentElement.scrollHeight-innerHeight, horizontal:document.documentElement.scrollWidth-innerWidth, top:p.top,bottom:p.bottom,height:innerHeight};});
    expect(bounds.outer).toBeLessThanOrEqual(1); expect(bounds.horizontal).toBeLessThanOrEqual(1); expect(bounds.top).toBeGreaterThanOrEqual(0); expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
    await page.locator('[data-upgrade]').first().focus(); await page.keyboard.press('Enter');
    expect((await snapshot(page)).phase).toBe('playing');
  });
}

test('fresh lobby codex shows collection goals without writing records and Escape restores preparation', async ({page}) => {
  const raw=await page.evaluate(()=>localStorage.getItem('ash-profile-v1'));
  await expect(page.locator('[data-keepsake="bookmark"]')).toBeDisabled();
  await expect(page.locator('.codex-door')).toContainText('1 / 22');
  await expect(page.locator('.codex-door')).toContainText('전투 발견 0/3');
  await page.locator('[data-open-codex]').focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'숲의 도감',exact:true})).toBeVisible();
  await expect(page.locator('.codex-card')).toHaveCount(22);
  await expect(page.locator('.codex-card.is-found')).toHaveCount(1);
  await page.locator('[data-codex-filter="weapons"]').click();
  await expect(page.locator('.codex-card')).toHaveCount(9);
  await page.locator('[data-codex-entry="evolution:dawn"]').click();
  await expect(page.locator('.codex-detail')).toContainText('검 3 · 룬 1 · 정예 1');
  await page.locator('.codex-detail').focus();await page.keyboard.press('End');
  await expect.poll(async()=>page.locator('.codex-detail').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator('#overlay').evaluate(el=>el.scrollTop)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-open-codex]')).toBeFocused();
  expect((await snapshot(page)).phase).toBe('ready');expect((await snapshot(page)).time).toBe(0);
  expect(await page.evaluate(()=>localStorage.getItem('ash-profile-v1'))).toBe(raw);
});

test('three real run discoveries unlock an equippable growth keepsake and its selection survives reload',async({page})=>{
  // The ended-run fixture has a branch, an evolution and a relic; recordRun owns the unlock.
  await scenario(page,'record-experiment');
  await expect(page.locator('.challenge-reward')).toContainText('첫빛의 책갈피');
  await page.getByRole('button',{name:'동료 선택',exact:true}).click();
  await expect(page.locator('[data-keepsake="bookmark"]')).toBeEnabled();
  await page.locator('[data-keepsake="bookmark"]').click();
  await expect(page.locator('.departure-summary')).toContainText('첫 60초 획득 경험치 +20%');
  await page.reload();await expect(page.locator('[data-keepsake="bookmark"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-open-codex]').click();
  await page.locator('[data-codex-filter="keepsakes"]').click();
  await expect(page.locator('[data-codex-entry="keepsake:bookmark"]')).toHaveClass(/is-found/);
  await page.locator('[data-close-codex]').click();
  await page.getByRole('button',{name:'숲에 들어가기'}).click();
  const state=await snapshot(page);expect(state.keepsake).toBe('bookmark');expect(state.player.maxHp).toBe(100);
  await page.getByRole('button',{name:'일시정지',exact:true}).click();
  await expect(page.locator('.build-summary')).toContainText('첫빛의 책갈피');
  await expect(page.locator('.build-summary')).toContainText('효과');
});

for(const viewport of [{width:1280,height:720},{width:320,height:568},{width:740,height:360}]) {
  test(`codex collection, inspection and return fit ${viewport.width}px`,async({page})=>{
    await page.setViewportSize(viewport);
    await page.evaluate(()=>localStorage.setItem('ash-profile-v1',JSON.stringify({version:1,bestTime:60,buildDiscoveries:['sweep','wildfire'],relicDiscoveries:['dew']})));
    await page.reload();
    await page.locator('[data-keepsake="bookmark"]').click();
    // Capture preparation separately; the codex is checked at the actual viewport below.
    if(viewport.width===1280) await page.setViewportSize({width:1280,height:1000});
    await page.locator('#overlay').evaluate(el=>el.scrollTop=0);
    await page.screenshot({path:`output/playwright/survivor/preparation-${viewport.width}.png`,animations:'disabled'});
    await page.setViewportSize(viewport);
    await page.locator('[data-open-codex]').click();
    const headingBefore=await page.locator('.codex-heading').boundingBox();
    // Inspect the final collection card: only the internal body may scroll.
    await page.locator('[data-codex-entry="keepsake:bookmark"]').click();
    await expect(page.locator('.codex-detail')).toContainText('첫 60초 획득 경험치 +20%');
    if(viewport.width<=680) await page.locator('[data-codex-list]').click();
    await expect(page.locator('[data-codex-entry="keepsake:bookmark"]')).toBeInViewport();
    const headingAfter=await page.locator('.codex-heading').boundingBox();
    expect(headingAfter.y).toBeCloseTo(headingBefore.y,0);
    const internal=await page.evaluate(()=>{
      const outer=document.getElementById('overlay'),panel=document.getElementById('panel');
      const list=document.querySelector('.codex-grid'),body=document.querySelector('.codex-layout');
      const r=panel.getBoundingClientRect();
      return {outer:outer.scrollTop,outerOverflow:outer.scrollHeight-outer.clientHeight,panelOverflow:panel.scrollHeight-panel.clientHeight,
        scrolled:Math.max(list.scrollTop,body.scrollTop)>0,fits:r.top>=0&&r.bottom<=innerHeight,documentFits:document.documentElement.scrollHeight<=innerHeight};
    });
    expect(internal).toEqual({outer:0,outerOverflow:0,panelOverflow:0,scrolled:true,fits:true,documentFits:true});
    await page.locator('[data-codex-filter="relics"]').click();
    await expect(page.locator('.codex-card')).toHaveCount(6);
    await page.locator('[data-codex-entry="relic:dew"]').click();
    await expect(page.locator('.codex-detail')).toContainText('경험치 30 수집마다 체력 3 회복');
    if(viewport.width<=680) {
      await expect(page.locator('.codex-detail h2')).toBeFocused();
      await expect(page.locator('.codex-detail h2')).toBeInViewport();
      await page.locator('[data-codex-list]').click();
      await expect(page.locator('[data-codex-entry="relic:dew"]')).toBeFocused();
      await expect(page.locator('[data-codex-entry="relic:dew"]')).toBeInViewport();
    } else await expect(page.locator('[data-codex-entry="relic:dew"]')).toBeFocused();
    const fits=await page.locator('[data-codex-entry], [data-close-codex]').evaluateAll(nodes=>nodes.every(el=>{
      const r=el.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.height>=44;
    }));expect(fits).toBe(true);
    expect(await page.locator('[data-codex-filter]').evaluateAll(nodes=>nodes.every(el=>el.getBoundingClientRect().height>=44))).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(viewport.width<=680) await page.locator('.codex-layout').evaluate(el=>el.scrollTop=0);
    await page.screenshot({path:`output/playwright/survivor/codex-${viewport.width}.png`,animations:'disabled'});
    await page.locator('[data-close-codex]').click();
    await expect(page.locator('[data-open-codex]')).toBeFocused();
    await page.getByRole('button',{name:'숲에 들어가기'}).click();expect((await snapshot(page)).phase).toBe('playing');
  });
}

for (const viewport of [{width:1280,height:720}, {width:320,height:740}, {width:740,height:360}]) {
  test(`new discoveries lead into an optional saved experiment at ${viewport.width}px`, async ({page}) => {
    await page.setViewportSize(viewport);
    await scenario(page, 'record-experiment');
    await expect(page.locator('.run-discoveries')).toContainText('반월 검법');
    await expect(page.locator('.run-discoveries')).toContainText('여명의 검');
    await expect(page.locator('.run-discoveries')).toContainText('왕을 노리는 송곳니');
    await expect(page.locator('.run-discoveries .found')).toHaveCount(3);
    await expect(page.locator('[data-experiment]')).toHaveAttribute('data-experiment', 'duelist');
    await page.locator('.next-experiment').scrollIntoViewIfNeeded();
    const box = await page.locator('.next-experiment').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({path:`output/playwright/survivor/next-experiment-${viewport.width}.png`});
    await page.getByRole('button', {name:'이 빌드로 다음 판 준비'}).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.experiment-plan')).toContainText('일점 검법');
    await expect(page.getByRole('button', {name:'숲에 들어가기'})).toBeInViewport();
    await page.reload();
    await expect(page.locator('.experiment-plan')).toContainText('일점 검법');
    expect((await snapshot(page)).profile.runs).toBe(1);
    await page.locator('.experiment-plan').scrollIntoViewIfNeeded();
    await page.screenshot({path:`output/playwright/survivor/experiment-plan-${viewport.width}.png`});
    await page.getByRole('button', {name:'숲에 들어가기'}).click();
    let fresh = await snapshot(page);
    expect(fresh.experiment).toBe('duelist'); expect(fresh.ranks.sword).toBe(1);
    expect(fresh.ranks.duelist).toBe(0); expect(fresh.ranks.sweep).toBe(0); expect(fresh.ranks.dawn).toBe(0); expect(fresh.relics).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.locator('.experiment-progress')).toContainText('1/3단계');
    await scenario(page, 'experiment-offer');
    await expect(page.locator('[data-upgrade="duelist"] .experiment-badge')).toHaveText('이번 판의 목표');
    await expect(page.locator('[data-upgrade="sweep"]')).toBeEnabled();
    await page.locator('[data-upgrade="duelist"]').scrollIntoViewIfNeeded();
    await page.screenshot({path:`output/playwright/survivor/experiment-offer-${viewport.width}.png`});
    await page.locator('[data-upgrade="duelist"]').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.experiment-progress.is-complete')).toContainText('일점 검법 선택 완료');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await scenario(page, 'defeat');
    await page.getByRole('button', {name:'다시 숲으로'}).click();
    fresh = await snapshot(page);
    expect(fresh.experiment).toBe('duelist'); expect(fresh.ranks.duelist).toBe(0); expect(fresh.ranks.sword).toBe(1);
  });
}

test('an experiment allows another branch and can be cleared before departure', async ({page}) => {
  await scenario(page, 'record-experiment');
  await page.getByRole('button', {name:'이 빌드로 다음 판 준비'}).click();
  await scenario(page, 'experiment-offer');
  await page.locator('[data-upgrade="sweep"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.experiment-progress.is-changed')).toContainText('반월 검법으로 방향을 바꿨습니다');
  expect((await snapshot(page)).ranks.duelist).toBe(0);
  await scenario(page, 'defeat');
  await page.getByRole('button', {name:'동료 선택',exact:true}).click();
  await page.getByRole('button', {name:'목표 지우기'}).click();
  await expect(page.locator('.experiment-plan')).toHaveCount(0);
  await page.reload(); expect((await snapshot(page)).profile.experiment).toBeNull();
});

test('selecting another companion clears an incompatible experiment and saves that choice', async ({page}) => {
  await scenario(page, 'record-experiment');
  await page.getByRole('button', {name:'이 빌드로 다음 판 준비'}).click();
  await page.locator('[data-character="ember"]').click();
  await expect(page.locator('.experiment-plan')).toHaveCount(0);
  await page.reload(); const state = await snapshot(page);
  expect(state.characterId).toBe('ember'); expect(state.experiment).toBeNull(); expect(state.profile.experiment).toBeNull();
});

test('keepsake selection preserves the experiment without granting its specialization', async ({page}) => {
  await scenario(page, 'record-journey');
  await page.getByRole('button', {name:'이 빌드로 다음 판 준비'}).click();
  await page.locator('.camp-tabs [data-camp-section="journal"]').click();
  await page.locator('.journey-board summary').click();
  await page.locator('.camp-tabs [data-camp-section="prepare"]').click();
  await page.locator('[data-keepsake="seed"]').click();
  await expect(page.locator('.experiment-plan')).toContainText('일점 검법');
  await page.reload(); await page.getByRole('button', {name:'숲에 들어가기'}).click();
  const state = await snapshot(page);
  expect(state.keepsake).toBe('seed'); expect(state.player.maxHp).toBe(90); expect(state.experiment).toBe('duelist'); expect(state.ranks.duelist).toBe(0);
});

test('a failed save keeps the experiment usable in memory and reports its limit', async ({page}) => {
  await page.addInitScript(() => {Storage.prototype.setItem = () => {throw new Error('quota');};});
  await page.reload(); await scenario(page, 'record-experiment');
  await page.getByRole('button', {name:'이 빌드로 다음 판 준비'}).click();
  await expect(page.locator('.storage-note')).toHaveCount(1);
  await expect(page.locator('.storage-note')).toContainText('기록을 저장하지 못했습니다');
  await page.locator('.camp-tabs [data-camp-section="journal"]').click();
  await expect(page.locator('.storage-note')).toBeVisible();
  await page.locator('.camp-tabs [data-camp-section="prepare"]').click();
  await expect(page.locator('.experiment-plan')).toContainText('일점 검법');
  await page.getByRole('button', {name:'숲에 들어가기'}).click();
  expect((await snapshot(page)).experiment).toBe('duelist');
});

test('already discovered choices and unrecorded scenes do not announce new discoveries', async ({page}) => {
  await scenario(page, 'record-experiment');
  await expect(page.locator('.run-discoveries')).toBeVisible();
  await scenario(page, 'record-experiment');
  await expect(page.locator('.run-discoveries')).toHaveCount(0);
  expect((await snapshot(page)).profile.runs).toBe(2);
  await scenario(page, 'defeat');
  await expect(page.locator('.run-discoveries')).toHaveCount(0);
  expect((await snapshot(page)).profile.runs).toBe(2);
});

test('start, keyboard movement, pause, mute and resume', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.screenshot({ path: 'output/playwright/survivor/start-desktop.png', animations: 'disabled' });
  await page.getByRole('button', { name: '숲에 들어가기' }).click();
  await page.keyboard.down('d');
  await expect.poll(async () => (await snapshot(page)).player.x).toBeGreaterThan(40);
  await page.keyboard.up('d');
  await page.getByRole('button', { name: '일시정지', exact: true }).click();
  const paused = await snapshot(page);
  await page.waitForTimeout(200);
  expect((await snapshot(page)).time).toBe(paused.time);
  await page.getByRole('button', { name: '전투 계속하기' }).click();
  await page.waitForTimeout(200);
  expect((await snapshot(page)).player.x).toBe(paused.player.x);
  await page.getByRole('button', { name: '소리 끄기' }).click();
  await expect(page.getByRole('button', { name: '소리 켜기' })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect((await snapshot(page)).phase).toBe('paused');
  expect(errors).toEqual([]);
});

test('auto attack drops XP that can be collected through movement', async ({ page }) => {
  await scenario(page, 'combat');
  await expect.poll(async () => (await snapshot(page)).kills).toBe(1);
  await page.keyboard.down('d');
  await expect.poll(async () => (await snapshot(page)).xp).toBe(2);
  await page.keyboard.up('d');
});

test('upgrade pauses combat and chained levels show fresh choices', async ({ page }) => {
  await scenario(page, 'overflow');
  const paused = await snapshot(page);
  await expect(page.locator('[data-upgrade]')).toHaveCount(3);
  await page.waitForTimeout(200);
  expect((await snapshot(page)).time).toBe(paused.time);
  await page.locator('[data-upgrade="ember"]').click();
  await expect(page.locator('.level-medal b')).toHaveText('3');
  await expect(page.locator('[data-upgrade="orbit"]')).toBeVisible();
  await page.screenshot({ path: 'output/playwright/survivor/upgrade-desktop.png', animations: 'disabled' });
  await page.keyboard.press('1');
  expect((await snapshot(page)).ranks.orbit).toBe(1);
  expect((await snapshot(page)).phase).toBe('playing');
  await expect(page.locator('#overlay')).toBeHidden();
});

test('grown loadout attacks, victory and defeat restart cleanly', async ({ page }) => {
  await scenario(page, 'grown');
  await expect.poll(async () => (await snapshot(page)).damageDealt.ember).toBeGreaterThan(0);
  await expect.poll(async () => (await snapshot(page)).damageDealt.orbit).toBeGreaterThan(0);
  await expect(page.locator('#overlay')).toBeHidden();
  await page.screenshot({ path: 'output/playwright/survivor/combat-desktop.png', animations: 'disabled' });
  for (const outcome of ['victory', 'survived', 'defeat']) {
    await scenario(page, outcome);
    await expect(page.getByRole('heading', { name: outcome === 'victory' ? '재의 군주를 쓰러뜨렸습니다' : outcome === 'survived' ? '살아 돌아왔습니다' : '잠시 쓰러졌을 뿐' })).toBeVisible();
    await page.getByRole('button', { name: '다시 숲으로' }).click();
    const fresh = await snapshot(page);
    expect(fresh.phase).toBe('playing');
    expect(fresh.kills).toBe(0);
    expect(fresh.ranks.ember).toBe(0);
    expect(fresh.player.hp).toBe(100);
    expect(fresh.time).toBeLessThan(1);
  }
});

test('earned evolution changes the weapon belt and produces piercing crescents', async ({ page }) => {
  await scenario(page, 'evolution');
  await expect(page.locator('[data-upgrade]').first()).toHaveAttribute('data-upgrade','dawn');
  await page.screenshot({ path: 'output/playwright/survivor/evolution-choice.png', animations: 'disabled' });
  await page.locator('[data-upgrade="dawn"]').click();
  await expect(page.locator('#phase-label')).toContainText('진화의 여세');
  expect((await snapshot(page)).pacing.kind).toBe('evolution');
  await expect(page.locator('#weapons .is-evolved')).toHaveAttribute('aria-label','여명의 검 3단계');
  await expect(page.locator('#evolution-hint')).toContainText('월광 고리 진화');
  expect((await snapshot(page)).ranks.dawn).toBe(1);
  await scenario(page, 'evolved');
  await expect.poll(async () => (await snapshot(page)).crescents).toBeGreaterThan(0);
  await page.screenshot({ path: 'output/playwright/survivor/evolved-combat.png', animations: 'disabled' });
  await scenario(page, 'defeat');
  await page.getByRole('button', {name:'다시 숲으로'}).click();
  expect((await snapshot(page)).ranks.dawn).toBe(0);
  expect((await snapshot(page)).pacing.kind).toBe('build');
  await expect(page.locator('#weapons .is-evolved')).toHaveCount(0);
});

for(const [key,name,effect] of [['comet','잿불 혜성','ember-burst'],['lunar','월광 고리','lunar-pulse']]){
  test(`${name} evolution changes the weapon and performs its distinct attack`,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await scenario(page,`evolution-${key}`);
    await expect(page.locator(`[data-upgrade="${key}"]`)).toBeVisible();
    await page.locator(`[data-upgrade="${key}"]`).click();
    await expect(page.locator('#phase-label')).toContainText('진화의 여세');
    await expect(page.locator('#weapons .is-evolved')).toHaveAttribute('aria-label',`${name} 3단계`);
    await scenario(page,key);
    await page.waitForFunction(effect=>window.__ASH_QA__.snapshot().effects.includes(effect),effect);
    await page.screenshot({path:`output/playwright/survivor/evolution-${key}.png`,animations:'disabled'});
    await page.getByRole('button',{name:'일시정지',exact:true}).click();
    await page.locator('.build-guide summary').click();
    await expect(page.locator('.build-guide')).toContainText('진화 완료');
    await expect(page.locator('.build-guide')).toContainText('여명의 검');
    await expect(page.locator('.build-guide')).toContainText('잿불 혜성');
    await expect(page.locator('.build-guide')).toContainText('월광 고리');
    await page.getByRole('button',{name:'전투 계속하기'}).click();
    expect((await snapshot(page)).phase).toBe('playing');
  });
}

for(const viewport of [{width:1280,height:720},{width:390,height:844},{width:740,height:360}]){
  test(`boss patterns and HUD are readable at ${viewport.width}x${viewport.height}`,async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewportSize(viewport);await scenario(page,'boss');
    await expect(page.locator('#boss-hud')).toBeVisible();
    await expect(page.locator('#boss-caption')).toContainText('돌진 예고');
    await page.screenshot({path:`output/playwright/survivor/boss-charge-${viewport.width}.png`,animations:'disabled'});
    const box=await page.locator('#boss-hud').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);
    await page.getByRole('button',{name:'일시정지',exact:true}).click();
    const paused=await snapshot(page);await page.waitForTimeout(150);
    expect((await snapshot(page)).boss.pattern).toEqual(paused.boss.pattern);
    await page.getByRole('button',{name:'전투 계속하기'}).click();
    await scenario(page,'boss-thorns');
    await expect.poll(async()=>(await snapshot(page)).thorns).toBeGreaterThan(0);
    await page.screenshot({path:`output/playwright/survivor/boss-thorns-${viewport.width}.png`,animations:'disabled'});
    await scenario(page,'boss-kill');
    await expect(page.getByRole('heading',{name:'재의 군주를 쓰러뜨렸습니다'})).toBeVisible();
    expect((await snapshot(page)).bossDefeated).toBe(true);
    await expect(page.locator('#boss-hud')).toBeHidden();
    await page.getByRole('button',{name:'다시 숲으로'}).click();
    expect((await snapshot(page)).boss).toBeNull();
    expect((await snapshot(page)).thorns).toBe(0);expect(errors).toEqual([]);
  });
}

for (const width of [1280,390]) {
  test(`elite telegraph is avoidable and matches impact timing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({width,height:width===390?844:720});
    await scenario(page,'slam');
    await expect.poll(async () => (await snapshot(page)).slams[0]?.age).toBeGreaterThan(.2);
    await page.screenshot({ path:`output/playwright/survivor/slam-${width}.png`,animations:'disabled' });
    // Capture has variable latency. Start a fresh attack to measure a 250ms reaction.
    await scenario(page,'slam');
    await page.waitForFunction(()=>window.__ASH_QA__.snapshot().slams[0]?.age>=.25);
    await page.keyboard.down('a');
    await expect.poll(async () => (await snapshot(page)).slams[0]?.hit).toBe(true);
    await page.keyboard.up('a');
    expect((await snapshot(page)).player.hp).toBe(100);
    await scenario(page,'slam');
    await expect.poll(async () => (await snapshot(page)).player.hp).toBe(76);
    await page.getByRole('button',{name:'일시정지',exact:true}).click();
    const paused=await snapshot(page);await page.waitForTimeout(150);
    expect((await snapshot(page)).slams).toEqual(paused.slams);
  });
}

test.describe('touch viewports', () => {
test.use({ hasTouch: true });
for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 740, height: 360 }]) {
  test(`touch, HUD and upgrade layout at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.getByRole('button', { name: '숲에 들어가기' }).click();
    const stick = page.locator('#touch');
    const bounds = await stick.boundingBox();
    expect(bounds).not.toBeNull();
    await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await expect.poll(async () => (await snapshot(page)).player.x).toBeGreaterThan(25);
    await page.mouse.up();
    await page.waitForTimeout(100);
    const stopped = (await snapshot(page)).player.x;
    await page.waitForTimeout(100);
    expect((await snapshot(page)).player.x).toBe(stopped);
    for (const selector of ['.health-pocket', '.clock-pocket', '.hud-actions', '#weapons']) {
      const box = await page.locator(selector).boundingBox();
      expect(box.x, selector).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, selector).toBeLessThanOrEqual(viewport.width);
    }
    await scenario(page, 'grown');
    await page.waitForTimeout(150);
    await page.screenshot({ path: `output/playwright/survivor/combat-${viewport.width}.png`, animations: 'disabled' });
    await scenario(page, 'upgrade');
    await expect(page.locator('[data-upgrade]')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('[data-upgrade]').last().scrollIntoViewIfNeeded();
    const card = await page.locator('[data-upgrade]').last().boundingBox();
    expect(card.x + card.width).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: `output/playwright/survivor/upgrade-${viewport.width}.png`, animations: 'disabled' });
    await page.locator('[data-upgrade]').last().click();
    expect((await snapshot(page)).phase).toBe('playing');
  });
}
});

test('touch cancellation clears movement and reduced motion keeps controls usable', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/survivor/?qa');
  await page.getByRole('button', { name: '숲에 들어가기' }).tap();
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 128, y: 750 }] });
  await expect.poll(async () => (await snapshot(page)).player.x).toBeGreaterThan(10);
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  const x = (await snapshot(page)).player.x;
  await page.waitForTimeout(150);
  expect((await snapshot(page)).player.x).toBe(x);
  await page.getByRole('button', { name: '일시정지', exact: true }).tap();
  await expect(page.getByRole('button', { name: '전투 계속하기' })).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});

test('earned companions, selection and journey records survive reload without duplicate results',async({page})=>{
  await expect(page.locator('[data-character="ember"]')).toBeDisabled();
  await expect(page.locator('[data-character="grove"]')).toBeDisabled();
  await scenario(page,'record-unlock');
  await expect(page.locator('.unlock-reward')).toContainText('불씨술사 · 룬 수호자');
  await page.locator('.battle-record summary').click();
  await expect(page.locator('.damage-row')).toContainText('560');
  await page.getByRole('button',{name:'동료 선택',exact:true}).click();
  await expect(page.locator('[data-character="ember"]')).toBeEnabled();
  await page.locator('[data-character="ember"]').click();
  await expect(page.locator('[data-character="ember"]')).toBeFocused();
  await page.reload();
  await expect(page.locator('[data-character="ember"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('.camp-tabs [data-camp-section="journal"]').click();
  await page.locator('.camp-records summary').click();
  await expect(page.locator('.run-history li')).toHaveCount(1);
  expect((await snapshot(page)).profile.runs).toBe(1);
  await page.screenshot({path:'output/playwright/survivor/companions-desktop.png',animations:'disabled'});
  await page.getByRole('button',{name:'숲에 들어가기'}).click();
  const fresh=await snapshot(page);expect(fresh.characterId).toBe('ember');expect(fresh.player.hp).toBe(85);expect(fresh.ranks.sword).toBe(0);expect(fresh.ranks.ember).toBe(1);
  await expect(page.locator('#hero-name')).toHaveText('불씨술사');
});

test('storage write failure keeps earned companions available in the current session',async({page})=>{
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='ash-profile-v1')throw new DOMException('Unavailable','QuotaExceededError');return original.call(this,key,value);};});
  await scenario(page,'record-unlock');
  await expect(page.locator('.storage-note')).toContainText('이 창을 닫기 전까지');
  await page.getByRole('button',{name:'동료 선택',exact:true}).click();
  await page.locator('[data-character="grove"]').click();
  await page.getByRole('button',{name:'숲에 들어가기'}).click();
  const fresh=await snapshot(page);expect(fresh.characterId).toBe('grove');expect(fresh.player.hp).toBe(125);expect(fresh.ranks.sword).toBe(0);expect(fresh.ranks.orbit).toBe(1);
});

for(const viewport of [{width:320,height:640},{width:390,height:844},{width:740,height:360}]){
  test(`camp and unlocked results stay accessible at ${viewport.width}px`,async({page})=>{
    await page.setViewportSize(viewport);
    for(const selector of ['.companion-grid','.companion-detail','#start-game']){const box=await page.locator(selector).boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);}
    await page.screenshot({path:`output/playwright/survivor/camp-${viewport.width}.png`,animations:'disabled'});
    await scenario(page,'record-unlock');
    await expect(page.locator('.unlock-reward')).toBeVisible();
    await page.getByRole('button',{name:'동료 선택',exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:`output/playwright/survivor/result-unlock-${viewport.width}.png`,animations:'disabled'});
    await page.getByRole('button',{name:'동료 선택',exact:true}).click();
    await page.locator('[data-character="grove"]').click();
    await page.getByRole('button',{name:'숲에 들어가기'}).click();
    expect((await snapshot(page)).characterId).toBe('grove');
  });
}

test('all companion atlases render in combat and defeat presentation freezes simulation',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [id,weapon] of [['ash','sword'],['ember','ember'],['grove','orbit']]){
    await scenario(page,`character-${id}`);
    await expect.poll(async()=>(await snapshot(page)).damageDealt[weapon]).toBeGreaterThan(0);
    await page.screenshot({path:`output/playwright/survivor/hero-${id}-combat.png`,animations:'disabled'});
  }
  await scenario(page,'defeat');
  await expect(page.locator('#overlay')).toBeHidden();
  const ended=await snapshot(page);
  await expect(page.getByRole('heading',{name:'잠시 쓰러졌을 뿐'})).toBeVisible();
  expect((await snapshot(page)).time).toBe(ended.time);
  expect(errors).toEqual([]);
});

test('failed art loading offers a recoverable reload instead of broken play',async({page})=>{
  await page.route('**/art/survivor/hero-grove.png',route=>route.abort());
  await page.reload();
  await expect(page.getByRole('heading',{name:'숲을 불러오지 못했습니다'})).toBeVisible();
  await page.unroute('**/art/survivor/hero-grove.png');
  await page.getByRole('button',{name:'다시 불러오기'}).click();
  await page.getByRole('button',{name:'숲에 들어가기'}).click();
  expect((await snapshot(page)).phase).toBe('playing');
});

for (const heldImage of ['forest-ground-v1','hero-ash-motion-v1','hound-motion-v1','giant-motion-v1']) test(`loading progress waits for ${heldImage} before enabling departure`, async ({page}) => {
  let releaseGround;
  const held = new Promise(resolve => { releaseGround = resolve; });
  await page.route(`**/art/survivor/${heldImage}.webp`, async route => { await held; await route.continue(); });
  await page.reload({waitUntil:'domcontentloaded'});
  try {
    await expect(page.locator('#art-progress')).toHaveAttribute('value','8');
    await expect(page.locator('#art-progress-label')).toHaveText('여정 준비 8 / 9');
    await expect(page.locator('#start-game')).toHaveCount(0);
  } finally { releaseGround(); }
  await expect(page.locator('#start-game')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  // Engines serialize CSS family names with or without surrounding quotes.
  expect(await page.evaluate(() => [...document.fonts].some(font => font.family.replace(/^["']|["']$/g,'') === 'Ash Journal' && font.status === 'loaded'))).toBe(true);
  await page.locator('#start-game').click();
  expect((await snapshot(page)).phase).toBe('playing');
});

test('short landscape keeps combat return and reroll controls visible without scrolling', async ({page}) => {
  await page.setViewportSize({width:740,height:360});
  const inside = async selector => {
    const box = await page.locator(selector).boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(360);
    expect(box.height).toBeGreaterThanOrEqual(44);
  };
  await page.locator('#start-game').click();
  await page.locator('#pause').click();
  await inside('#resume-game');
  await page.locator('#resume-game').click();
  expect((await snapshot(page)).phase).toBe('playing');
  await scenario(page,'recovery-choice');
  await inside('[data-reroll]');
  await page.locator('[data-reroll]').click();
  expect((await snapshot(page)).rerolls).toBe(0);
});

for(const viewport of [{width:1280,height:720},{width:390,height:844},{width:740,height:360}]){
  test(`recovery fruit is readable, pause-safe and collected by movement at ${viewport.width}px`,async({page})=>{
    await page.setViewportSize(viewport);await scenario(page,'recovery');
    await expect(page.locator('#recovery-hint')).toContainText('회복 열매 +25');
    const box=await page.locator('#recovery-hint').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({path:`output/playwright/survivor/recovery-${viewport.width}.png`,animations:'disabled'});
    await page.getByRole('button',{name:'일시정지',exact:true}).click();const paused=await snapshot(page);await page.waitForTimeout(150);expect((await snapshot(page)).supplies).toEqual(paused.supplies);
    await page.getByRole('button',{name:'전투 계속하기'}).click();
    await page.keyboard.down('d');await page.keyboard.down('s');
    await expect.poll(async()=>(await snapshot(page)).healing.field).toBe(25);
    await page.keyboard.up('d');await page.keyboard.up('s');expect((await snapshot(page)).player.hp).toBe(65);
    await expect(page.locator('#recovery-hint')).toBeHidden();
  });
}

for(const viewport of [{width:1280,height:720},{width:390,height:844},{width:740,height:360}]){
test(`late-game entity caps remain stable under a sustained rendered load at ${viewport.width}px`,async({page},testInfo)=>{
  await page.setViewportSize(viewport);await scenario(page,'stress-expansion');
  const timing=await page.evaluate(()=>new Promise(resolve=>{
    const frames=[];let begin=0,last=0;
    function sample(now){if(!begin)begin=now;if(last)frames.push(now-last);last=now;if(now-begin<12000){requestAnimationFrame(sample);return;}frames.sort((a,b)=>a-b);resolve({frames:frames.length,elapsed:now-begin,p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],over50:frames.filter(n=>n>50).length});}
    requestAnimationFrame(sample);
  }));
  const state=await snapshot(page);
  await testInfo.attach('frame-timing.json',{body:JSON.stringify({timing,state:{time:state.time,enemies:state.enemies,gems:state.gems,shots:state.shots}}),contentType:'application/json'});
  console.log('survivor stress timing',JSON.stringify({viewport,...timing}));
  expect(state.enemies).toBe(160);expect(state.gems).toBeLessThanOrEqual(240);expect(state.shots).toBeLessThanOrEqual(80);expect(state.remnants).toBeLessThanOrEqual(32);
  expect(state.phase).toBe('playing');expect(state.time).toBeGreaterThan(250);
  expect(timing.p95).toBeLessThan(50);
  await page.screenshot({path:`output/playwright/survivor/stress-${viewport.width}.png`,animations:'disabled'});
  await page.getByRole('button',{name:'일시정지',exact:true}).click();await expect(page.getByRole('button',{name:'전투 계속하기'})).toBeVisible();
});

}

test('audio starts from a gesture, plays caster cues, and suspends on mute and pause',async({page})=>{
  expect((await snapshot(page)).audio).toBe('uninitialized');
  await page.getByRole('button',{name:'숲에 들어가기'}).click();
  await expect.poll(async()=>(await snapshot(page)).audio).toBe('running');
  await scenario(page,'character-ember');
  await expect.poll(async()=>(await snapshot(page)).damageDealt.ember).toBeGreaterThan(0);
  await page.getByRole('button',{name:'소리 끄기'}).click();
  await expect.poll(async()=>(await snapshot(page)).audio).toBe('suspended');
  await page.getByRole('button',{name:'소리 켜기'}).click();
  await expect.poll(async()=>(await snapshot(page)).audio).toBe('running');
  await page.getByRole('button',{name:'일시정지',exact:true}).click();
  await expect.poll(async()=>(await snapshot(page)).audio).toBe('suspended');
  await page.getByRole('button',{name:'전투 계속하기'}).click();
  await expect.poll(async()=>(await snapshot(page)).audio).toBe('running');
});

test('a short desktop keeps departure visible while the journal scrolls inside its own workspace',async({page})=>{
  await page.setViewportSize({width:1280,height:600});
  await page.locator('.camp-tabs [data-camp-section="journal"]').click();
  await page.locator('.mastery-board summary').click(); await page.locator('.journey-board summary').click();
  await page.locator('.camp-records summary').scrollIntoViewIfNeeded();
  await expect(page.locator('.camp-records summary')).toBeVisible();
  expect(await page.locator('.camp-journal').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator('#panel').evaluate(el=>el.scrollTop)).toBe(0);
  expect(await page.locator('#overlay').evaluate(el=>el.scrollTop)).toBe(0);
  await expect(page.locator('#start-game')).toBeInViewport();
  const panel=await page.locator('#panel').boundingBox();expect(panel.y+panel.height).toBeLessThanOrEqual(600);
  await expect(page.getByRole('heading',{name:'잿빛의 숲',exact:true})).toBeInViewport();
});

test('dense combat retains hero and telegraph silhouettes with reduced motion and grayscale',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
  await scenario(page,'stress-expansion');await page.waitForTimeout(1500);
  await page.screenshot({path:'output/playwright/survivor/readability-color.png',animations:'disabled'});
  await page.locator('#world').evaluate(canvas=>{canvas.style.filter='grayscale(1)';});
  await page.screenshot({path:'output/playwright/survivor/readability-gray.png',animations:'disabled'});
  await page.locator('#world').evaluate(canvas=>{canvas.style.filter='';});
  await expect(page.locator('#boss-hud')).toBeVisible();
});

for (const [weapon, first, second] of [['sword','sweep','duelist'],['ember','wildfire','detonation'],['orbit','bulwark','horizon']]) {
  test(`specialization ${weapon} offers a real exclusive choice and records selection in pause`, async ({page})=>{
    await scenario(page,`branch-${weapon}`);
    await expect(page.locator(`[data-upgrade="${first}"]`)).toBeVisible();
    await expect(page.locator(`[data-upgrade="${second}"]`)).toBeVisible();
    const time=(await snapshot(page)).time;await page.waitForTimeout(150);expect((await snapshot(page)).time).toBe(time);
    await page.screenshot({path:`output/playwright/survivor/branch-${weapon}.png`});
    await page.locator(`[data-upgrade="${second}"]`).click();
    expect((await snapshot(page)).ranks[second]).toBe(1);expect((await snapshot(page)).ranks[first]).toBe(0);
    await page.keyboard.press('Escape');await expect(page.locator('.build-summary')).toContainText('이번 판의 전문화');
    await expect(page.locator('.build-summary')).not.toContainText('무기 3단계부터');
    await expect(page.locator('.build-summary')).toContainText({duelist:'재사용 +0.12초',detonation:'발사 간격 1.25초',horizon:'회전 반경 +48'}[second]);
  });
}

for (const [weapon, branch, evolution] of [['sword','duelist','dawn'],['ember','wildfire','comet'],['orbit','horizon','lunar']]) {
  test(`weapon identity ${weapon} shows a chosen fork, its actual evolution combination and fresh retry`, async ({page}) => {
    await page.setViewportSize(weapon === 'sword' ? {width:1280,height:720} : weapon === 'ember' ? {width:320,height:640} : {width:740,height:360});
    await scenario(page, `branch-${weapon}`);
    await expect(page.locator('.upgrade-commitment')).toContainText('한 갈래');
    await expect(page.locator('.upgrade-commitment')).toContainText('진화 후에도 유지');
    await page.locator(`[data-upgrade="${branch}"]`).click();
    const slot = page.locator(`[data-weapon="${weapon}"]`);
    await expect(slot).toHaveAttribute('data-weapon-art', branch);
    await expect(slot).toHaveClass(/is-specialized/);
    await expect(slot.locator('.collection-illustration')).toHaveCount(1);
    await expect(slot.locator('.weapon-state')).toHaveText('전문화');
    await expect(slot).toHaveAttribute('aria-label', new RegExp({duelist:'일점 검법',wildfire:'번지는 불꽃',horizon:'별자리 궤도'}[branch]));
    const bounds = await slot.boundingBox(), viewport = page.viewportSize();
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y+bounds.height).toBeLessThanOrEqual(viewport.height);
    const stateBounds = await slot.locator('.weapon-state').boundingBox(), rankBounds = await slot.locator('span').boundingBox();
    const labelsSeparated = stateBounds.x+stateBounds.width < rankBounds.x || rankBounds.x+rankBounds.width < stateBounds.x || stateBounds.y+stateBounds.height < rankBounds.y || rankBounds.y+rankBounds.height < stateBounds.y;
    expect(labelsSeparated, 'weapon stage and rank must not overlap with any platform font').toBe(true);
    await page.screenshot({path:`output/playwright/survivor/growth-identity-${weapon}.png`,animations:'disabled'});
    // A second fixture supplies earned prerequisites while keeping this same branch.
    // The evolution itself is selected through the real card and chooseUpgrade path.
    await scenario(page, `evolution-specialized-${branch}`);
    expect((await snapshot(page)).ranks[branch]).toBe(1);
    await page.locator(`[data-upgrade="${evolution}"]`).click();
    await expect(slot).toHaveAttribute('data-weapon-art', evolution);
    await expect(slot.locator('.weapon-state')).toHaveText('진화');
    expect((await snapshot(page)).ranks[branch]).toBe(1);
    await expect(slot).toHaveAttribute('aria-label', new RegExp({duelist:'일점 검법',wildfire:'번지는 불꽃',horizon:'별자리 궤도'}[branch]));
    await scenario(page, 'defeat');
    await page.getByRole('button', {name:'다시 숲으로'}).click();
    await expect(page.locator('#weapons .is-specialized, #weapons .is-evolved')).toHaveCount(0);
    await expect(page.locator('[data-weapon="sword"]')).toHaveAttribute('data-weapon-art', 'sword');
  });
}

for (const [art, family, branch] of [['duelist','sword','일점 검법'],['wildfire','ember','번지는 불꽃'],['horizon','orbit','별자리 궤도'],['dawn','sword','일점 검법'],['comet','ember','번지는 불꽃'],['lunar','orbit','별자리 궤도']]) {
  test(`growth card ${art} retains chosen art and specialization when strengthening it`, async ({page}) => {
    await page.setViewportSize(['horizon','lunar'].includes(art) ? {width:740,height:360} : art === 'wildfire' ? {width:320,height:640} : art === 'comet' ? {width:390,height:844} : {width:1280,height:720});
    await scenario(page, `strengthen-${art}`);
    const card = page.locator(`[data-upgrade="${family}"]`);
    await expect(card).toHaveAttribute('data-weapon-art', art);
    await expect(card.locator('.collection-illustration')).toHaveCount(1);
    await expect(card.locator('.upgrade-path')).toHaveText(`${branch} 유지`);
    await expect(card).toContainText('4단계');
    if (art === 'duelist') await expect(card).toContainText('좁은 방향');
    if (art === 'comet') { await expect(card).toContainText('지속 피해'); await expect(card).not.toContainText('터져'); }
    expect(await page.evaluate(()=>document.documentElement.scrollHeight === innerHeight && document.documentElement.scrollWidth === innerWidth)).toBe(true);
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({path:`output/playwright/survivor/growth-upgrade-${art}.png`,animations:'disabled'});
    await page.keyboard.press('1');
    expect((await snapshot(page)).ranks[family]).toBe(4);
    await expect(page.locator(`[data-weapon="${family}"]`)).toHaveAttribute('data-weapon-art', art);
  });
}

test('evolved attacks carry distinct engravings with no simulation changes and freeze while paused', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  const result = await page.evaluate(async () => {
    const {createRenderer, loadArt} = await import('/src/survivor/render.js');
    const {createGame} = await import('/src/survivor/game.js');
    const canvas = document.createElement('canvas'); canvas.style.cssText='width:800px;height:680px;position:absolute;left:0;top:0';
    document.body.append(canvas);
    // Repeated pixel reads must not switch Chrome's canvas between GPU and CPU rasterization.
    const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true}), renderer=createRenderer(canvas, await loadArt('/'));
    const results=[];
    for (const [key,family,kind] of [['dawn','sword','slash'],['comet','ember','ember-burst'],['lunar','orbit','lunar-pulse']]) {
      const game=createGame(42); game.phase='paused'; game.time=60; game.ranks[family]=3;
      game.effects=[{kind,x:130,y:80,range:60,angle:0,halfAngle:1.28,age:.06,life:.3,evolved:false}];
      // Lunar's pulse only exists after evolution; compare to the same scene without that pulse.
      if (key==='lunar') game.effects=[];
      const patch=()=>{const {scale}=renderer.render(game), dpr=canvas.width/800;
        const x=key==='dawn'?169:130, y=key==='lunar'?55:80;
        return [...ctx.getImageData(Math.round((400+x*scale)*dpr)-24,Math.round((680*.53+y*scale)*dpr)-24,48,48).data];};
      const basic=patch(); game.ranks[key]=1;
      game.effects=[{kind,x:130,y:80,range:60,angle:0,halfAngle:1.28,age:.06,life:.3,evolved:true}];
      const before=JSON.stringify(game), evolved=patch(), repeat=patch();
      results.push({key, changed:evolved.some((v,i)=>v!==basic[i]), frozen:JSON.stringify(evolved)===JSON.stringify(repeat), pure:JSON.stringify(game)===before});
    }
    canvas.remove(); return results;
  });
  for (const row of result) { expect(row.changed,row.key).toBe(true); expect(row.frozen,row.key).toBe(true); expect(row.pure,row.key).toBe(true); }
});
test('altar completes through real time, rewards once, and relic choice resumes input',async({page})=>{
  await scenario(page,'event-altar');await expect(page.locator('#encounter-hud')).toContainText('봉인 제단');
  await page.getByRole('button',{name:'보상 후보 살펴보기'}).click();
  const promised=(await snapshot(page)).encounters[0].rewards;
  await expect(page.locator('[data-preview-relic]')).toHaveCount(3);
  await page.getByRole('button',{name:'전장으로 돌아가기'}).click();
  await expect(page.locator('[data-relic]')).toHaveCount(3,{timeout:15000});
  expect(await page.locator('[data-relic]').evaluateAll(nodes=>nodes.map(n=>n.dataset.relic))).toEqual(promised);
  const before=await snapshot(page);expect(before.encounters[0].state).toBe('completed');await page.waitForTimeout(150);expect((await snapshot(page)).time).toBe(before.time);
  await page.screenshot({path:'output/playwright/survivor/relic-desktop.png'});
  await page.keyboard.press('1');expect((await snapshot(page)).relics).toHaveLength(1);
  await page.keyboard.down('d');await expect.poll(async()=>(await snapshot(page)).player.x).toBeGreaterThan(25);await page.keyboard.up('d');
  await page.keyboard.press('Escape');await expect(page.locator('.build-summary')).toContainText('숲의 유물 1/2');
});
test('chest consent can be declined and accepted curse completes in ordinary time',async({page})=>{
  await scenario(page,'event-chest');await page.getByRole('button',{name:'저주 상자 살펴보기'}).click();
  await expect(page.getByRole('heading',{name:'저주를 받아들이겠습니까?'})).toBeVisible();
  await expect(page.locator('[data-preview-relic]')).toHaveCount(3);
  const time=(await snapshot(page)).time;await page.waitForTimeout(150);expect((await snapshot(page)).time).toBe(time);
  await page.keyboard.press('Escape');expect((await snapshot(page)).encounters.find(e=>e.kind==='chest').state).toBe('declined');
  await scenario(page,'event-chest');await page.getByRole('button',{name:'저주 상자 살펴보기'}).click();
  const promised=(await snapshot(page)).encounters.find(e=>e.kind==='chest').rewards;
  await page.getByRole('button',{name:'저주를 받아들인다'}).click();await expect(page.locator('#encounter-hud')).toContainText('접촉 피해 +25%');
  await page.keyboard.press('Escape');const paused=await snapshot(page);await page.waitForTimeout(150);expect((await snapshot(page)).encounters).toEqual(paused.encounters);
  await page.getByRole('button',{name:'전투 계속하기'}).click();await expect(page.locator('[data-relic]')).toHaveCount(3,{timeout:22000});
  expect(await page.locator('[data-relic]').evaluateAll(nodes=>nodes.map(n=>n.dataset.relic))).toEqual(promised);
  expect((await snapshot(page)).encounters.find(e=>e.kind==='chest').state).toBe('completed');
  await page.locator('[data-relic]').nth(2).click();expect((await snapshot(page)).relics).toHaveLength(1);
});
for(const viewport of [{width:390,height:844},{width:320,height:568},{width:740,height:360}]) {
  test(`expansion objectives and choice cards fit ${viewport.width}`,async({page})=>{
    await page.setViewportSize(viewport);await scenario(page,'event-chest');
    const hud=await page.locator('#encounter-hud').boundingBox(),touch=await page.locator('#touch').boundingBox();
    expect(hud.x).toBeGreaterThanOrEqual(0);expect(hud.x+hud.width).toBeLessThanOrEqual(viewport.width);
    if(touch)expect(hud.y+hud.height).toBeLessThan(touch.y);
    await page.screenshot({path:`output/playwright/survivor/event-${viewport.width}.png`});
    await page.getByRole('button',{name:'저주 상자 살펴보기'}).click();await page.getByRole('button',{name:'상자를 두고 간다'}).click();
    await scenario(page,'branch-ember');await page.locator('[data-upgrade="wildfire"]').scrollIntoViewIfNeeded();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`output/playwright/survivor/branch-${viewport.width}.png`});
    await page.locator('[data-upgrade="wildfire"]').click();expect((await snapshot(page)).ranks.wildfire).toBe(1);
  });
}

for (const viewport of [{width:1280,height:720},{width:320,height:568},{width:740,height:360}]) {
 test(`journey reward selection persists and starts a fresh run at ${viewport.width}`,async({page})=>{
  await page.setViewportSize(viewport);
  await page.locator('.camp-tabs [data-camp-section="journal"]').click();
  await page.locator('.journey-board summary').click();
  await page.locator('.camp-tabs [data-camp-section="prepare"]').click();
  await expect(page.locator('[data-keepsake="seed"]')).toBeDisabled();
  await scenario(page,'record-journey');
  await expect(page.locator('.challenge-reward')).toContainText('제단의 씨앗');
  await expect(page.locator('.challenge-reward')).toContainText('갈림길의 리본');
  await page.getByRole('button',{name:'동료 선택',exact:true}).click();
  await page.locator('.camp-tabs [data-camp-section="journal"]').click();
  await page.locator('.journey-board summary').click();
  await page.locator('.camp-tabs [data-camp-section="prepare"]').click();
  await expect(page.locator('[data-challenge="altar"]')).toContainText('완료');
  await page.locator('[data-keepsake="seed"]').click();
  await expect(page.locator('[data-keepsake="seed"]')).toBeFocused();
  await expect(page.locator('[data-keepsake="seed"]')).toBeInViewport();
  await expect(page.locator('[data-keepsake="seed"]')).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`output/playwright/survivor/journey-${viewport.width}.png`,animations:'disabled'});
  await page.reload();await expect(page.locator('.journey-preview')).toContainText('제단의 씨앗');
  expect((await snapshot(page)).profile.runs).toBe(1);
  await page.getByRole('button',{name:'숲에 들어가기'}).click();
  expect((await snapshot(page)).keepsake).toBe('seed');expect((await snapshot(page)).player.maxHp).toBe(90);
  await page.getByRole('button',{name:'일시정지',exact:true}).click();await expect(page.locator('.build-summary')).toContainText('수집 거리 +28');
  await page.getByRole('button',{name:'전투 계속하기'}).click();
  await scenario(page,'defeat');await page.getByRole('button',{name:'다시 숲으로'}).click();
  expect((await snapshot(page)).player.maxHp).toBe(90);expect((await snapshot(page)).relics).toEqual([]);
 });
}

test('legacy earned rewards and storage failure keep optional loadout usable',async({page})=>{
 await page.evaluate(()=>localStorage.setItem('ash-profile-v1',JSON.stringify({version:1,wins:1,buildDiscoveries:['duelist','wildfire']})));
 await page.reload();await page.locator('.camp-tabs [data-camp-section="journal"]').click();await page.locator('.journey-board summary').click();await page.locator('.camp-tabs [data-camp-section="prepare"]').click();
 await expect(page.locator('[data-keepsake="crown"]')).toBeEnabled();
 await expect(page.locator('[data-keepsake="seed"]')).toBeDisabled();
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Quota','QuotaExceededError');};});
 await page.locator('[data-keepsake="crown"]').click();
 await expect(page.locator('.storage-note')).toBeVisible();
 await page.getByRole('button',{name:'숲에 들어가기'}).click();expect((await snapshot(page)).player.maxHp).toBe(115);
});

test('spores warn before damage, freeze on pause and disappear after expiry',async({page})=>{
 await scenario(page,'enemy-spores');expect((await snapshot(page)).player.hp).toBe(100);
 await page.getByRole('button',{name:'일시정지',exact:true}).click();const paused=await snapshot(page);
 await page.waitForTimeout(250);expect((await snapshot(page)).spores).toEqual(paused.spores);
 await page.getByRole('button',{name:'전투 계속하기'}).click();
 await expect.poll(async()=> (await snapshot(page)).damageTaken.spore).toBeGreaterThan(0);
 await page.keyboard.down('d');await expect.poll(async()=> (await snapshot(page)).player.x).toBeGreaterThan(80);await page.keyboard.up('d');
 const hp=(await snapshot(page)).player.hp;await expect.poll(async()=> (await snapshot(page)).spores.length).toBe(0);
 expect((await snapshot(page)).player.hp).toBe(hp);
});
test('hound warning stays fixed while lateral movement dodges the dash',async({page})=>{
 await scenario(page,'enemy-hound');await expect.poll(async()=> (await snapshot(page)).hunts.length).toBe(1);
 const angle=(await snapshot(page)).hunts[0].angle;
 await page.keyboard.down('s');await expect.poll(async()=> (await snapshot(page)).player.y).toBeGreaterThan(100);await page.keyboard.up('s');
 expect((await snapshot(page)).hunts[0].angle).toBe(angle);
 await expect.poll(async()=> (await snapshot(page)).hunts.length).toBe(0);
 expect((await snapshot(page)).damageTaken.hunt).toBe(0);
});
test('ordinary giant warns then deals its distinct slam damage',async({page})=>{
 await scenario(page,'enemy-giant');await expect.poll(async()=> (await snapshot(page)).slams.length).toBe(1);
 expect((await snapshot(page)).slams[0].radius).toBe(62);
 await expect.poll(async()=> (await snapshot(page)).damageTaken.slam).toBe(18);
});
for (const viewport of [{width:1280,height:720},{width:390,height:844},{width:740,height:360}]) {
 test(`new enemy warnings render with reduced motion at ${viewport.width}`,async({page})=>{
  await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:'reduce'});await scenario(page,'enemy-warnings');
  await page.getByRole('button',{name:'전투 계속하기'}).click();await page.getByRole('button',{name:'일시정지',exact:true}).click();
  const state=await snapshot(page);expect(state.spores.length).toBe(1);expect(state.hunts.length).toBe(1);expect(state.slams.length).toBe(1);
  const pixels=await page.locator('#world').evaluate(c=>c.toDataURL());
  await test.info().attach('enemy-warnings.png',{body:Buffer.from(pixels.split(',')[1],'base64'),contentType:'image/png'});
  const {writeFile}=await import('node:fs/promises');await writeFile(`output/playwright/survivor/enemy-warnings-${viewport.width}.png`,Buffer.from(pixels.split(',')[1],'base64'));
 });
}

for (const viewport of [{width:1280,height:720},{width:320,height:568},{width:740,height:360}]) {
 test(`recovery choices show current and resulting health without forcing a selection at ${viewport.width}`,async({page})=>{
  await page.setViewportSize(viewport);await scenario(page,'recovery-choice');
  await expect(page.locator('.upgrade-health')).toContainText('27 / 100');
  await expect(page.locator('.upgrade-health')).toContainText('회복 선택 가능');
  await expect(page.locator('.upgrade-card')).toHaveCount(3);await expect(page.locator('.is-recovery')).toHaveCount(2);
  await expect(page.locator('[data-upgrade="sword"]')).toBeFocused();
  await expect(page.locator('[data-upgrade="vitality"] .upgrade-change')).toHaveText('최대 체력 100 → 120 · 현재 체력 27 → 57');
  await expect(page.locator('[data-upgrade="heal"] .upgrade-change')).toHaveText('체력 27 → 67 / 100');
  const before=await snapshot(page);await page.waitForTimeout(150);expect((await snapshot(page)).time).toBe(before.time);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`output/playwright/survivor/recovery-choice-${viewport.width}.png`,animations:'disabled'});
  await page.locator('[data-upgrade="vitality"]').click();const result=await snapshot(page);expect(result.player.hp).toBe(57);expect(result.player.maxHp).toBe(120);expect(result.phase).toBe('playing');
  await scenario(page,'recovery-choice');await page.keyboard.press('3');expect((await snapshot(page)).player.hp).toBe(67);
  await scenario(page,'recovery-choice-full');await expect(page.locator('.upgrade-health')).toContainText('100 / 100');
  await expect(page.locator('.is-recovery')).toHaveCount(0);await expect(page.locator('[data-upgrade="heal"] .upgrade-change')).toHaveText('체력 100 → 100 / 100');
 });
}

for (const weapon of ['sword','ember','orbit']) test(`basic ${weapon} contact renders and freezes with pause`,async({page})=>{
  await page.getByRole('button',{name:'숲에 들어가기'}).click();
  // Observe actual Web Audio nodes, including the contact transient, after a gesture.
  await page.evaluate(()=>{
    window.__contactAudio=[];
    const proto=AudioBufferSourceNode.prototype, original=proto.start;
    proto.start=function(...args){window.__contactAudio.push(this.context.currentTime);return original.apply(this,args);};
  });
  await scenario(page,`impact-${weapon}`);
  await page.waitForFunction(kind=>window.__ASH_QA__.snapshot().effects.includes(kind),`${weapon}-contact`,{polling:'raf'});
  expect((await snapshot(page)).damageDealt[weapon]).toBeGreaterThan(0);
  // Pause within an actual contact so its presentation must use simulation time.
  await page.evaluate(kind=>new Promise(resolve=>{
    const check=()=>{
      if(window.__ASH_QA__.snapshot().effects.includes(kind)){
        document.querySelector('#pause').click();resolve();
      }else requestAnimationFrame(check);
    };check();
  }),`${weapon}-contact`);
  const paused=await snapshot(page);
  expect(paused.phase).toBe('paused');expect(paused.impacts.length).toBeGreaterThan(0);
  await page.waitForTimeout(220);expect((await snapshot(page)).impacts).toEqual(paused.impacts);
  // Hide only the pause dialog for the visual fixture; simulation stays paused.
  await page.locator('#overlay').evaluate(el=>{el.style.visibility='hidden';});
  await page.screenshot({path:`output/playwright/survivor/impact-${weapon}.png`});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:`output/playwright/survivor/impact-${weapon}-reduced-mobile.png`});
  expect((await snapshot(page)).time).toBe(paused.time);
  await page.locator('#overlay').evaluate(el=>{el.style.visibility='';});
  if(weapon!=='orbit') expect(await page.evaluate(()=>window.__contactAudio.length)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'계속하기'}).click();
  await expect.poll(async()=>(await snapshot(page)).time).toBeGreaterThan(paused.time);
});

test('sword animation reads as windup, strike and recovery while pause and reduced motion stay stable',async({page})=>{
  const poses={};
  for(const stage of ['windup','strike','recovery']){
    await scenario(page,`attack-pose-${stage}`);
    const state=await snapshot(page);expect(state.phase).toBe('paused');poses[stage]=state.attackPose;
    await page.locator('#overlay').evaluate(el=>{el.style.visibility='hidden';});
    await page.screenshot({path:`output/playwright/survivor/weight-${stage}.png`});
    await page.waitForTimeout(100);expect((await snapshot(page)).attackPose).toEqual(state.attackPose);
    await page.locator('#overlay').evaluate(el=>{el.style.visibility='';});
  }
  expect(poses.windup.x).toBeLessThan(0);expect(poses.strike.x).toBeGreaterThan(10);
  expect(poses.recovery.x).toBeLessThan(poses.strike.x*.1);
  await page.emulateMedia({reducedMotion:'reduce'});
  expect((await snapshot(page)).attackPose).toEqual({});
});

for(const [weapon,hz] of [['sword',2200],['ember',65],['orbit',1040]]) test(`evolved ${weapon} adds its contact ornament and sound layer`,async({page})=>{
  await page.getByRole('button',{name:'숲에 들어가기'}).click();
  await page.evaluate(()=>{
    window.__weightNotes=[];const original=AudioParam.prototype.setValueAtTime;
    AudioParam.prototype.setValueAtTime=function(value,...args){window.__weightNotes.push(value);return original.call(this,value,...args);};
  });
  await scenario(page,`impact-evolved-${weapon}`);
  await page.waitForFunction(hz=>window.__weightNotes.includes(hz),hz);
  await page.evaluate(()=>new Promise(resolve=>{
    const check=()=>{
      if(window.__ASH_QA__.snapshot().impacts.some(e=>e.evolved)){document.querySelector('#pause').click();resolve();}
      else requestAnimationFrame(check);
    };check();
  }));
  expect((await snapshot(page)).impacts.some(e=>e.evolved)).toBe(true);
  await page.locator('#overlay').evaluate(el=>{el.style.visibility='hidden';});
  await page.screenshot({path:`output/playwright/survivor/weight-evolved-${weapon}.png`});
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:`output/playwright/survivor/weight-evolved-${weapon}-mobile.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for(const viewport of [{width:1280,height:720},{width:390,height:844}]) test(`elite finish is visible, pause-safe and expires at ${viewport.width}`,async({page})=>{
  await page.setViewportSize(viewport);await scenario(page,'elite-finish');
  await page.evaluate(()=>new Promise(resolve=>{
    const check=()=>{
      if(window.__ASH_QA__.snapshot().eliteFinish){document.querySelector('#pause').click();resolve();}
      else requestAnimationFrame(check);
    };check();
  }));
  const paused=await snapshot(page);expect(paused.phase).toBe('paused');expect(paused.eliteKills).toBe(1);expect(paused.player.hp).toBe(75);
  await page.waitForTimeout(150);expect((await snapshot(page)).eliteFinish).toEqual(paused.eliteFinish);
  await page.locator('#overlay').evaluate(el=>{el.style.visibility='hidden';});
  await page.screenshot({path:`output/playwright/survivor/weight-elite-${viewport.width}.png`});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.screenshot({path:`output/playwright/survivor/weight-elite-${viewport.width}-reduced.png`});
  await page.locator('#overlay').evaluate(el=>{el.style.visibility='';});
  await page.getByRole('button',{name:'계속하기'}).click();
  await expect.poll(async()=>(await snapshot(page)).eliteFinish).toBe(null);
});

for(const viewport of [{width:1280,height:720},{width:390,height:844},{width:320,height:568}]) test(`player damage direction, loss trail and recovery remain readable at ${viewport.width}`,async({page})=>{
  await page.setViewportSize(viewport);
  await scenario(page,'player-hurt');
  await expect(page.locator('#hero-name')).toHaveText('−8 · 접촉');
  expect((await snapshot(page)).hurtFeedback.pose.x).toBeGreaterThan(0);
  expect((await snapshot(page)).player.hp).toBe(92);
  await expect(page.locator('#hp-loss')).toHaveAttribute('style',/100%/);
  await page.locator('#overlay').evaluate(el=>{el.style.visibility='hidden';});
  await page.screenshot({path:`output/playwright/survivor/hurt-${viewport.width}.png`});
  const state=await snapshot(page);await page.waitForTimeout(150);
  expect((await snapshot(page)).hurtFeedback).toEqual(state.hurtFeedback);
  await page.emulateMedia({reducedMotion:'reduce'});
  expect((await snapshot(page)).hurtFeedback.pose).toEqual({});
  await expect(page.locator('#hp-loss')).toHaveAttribute('style',/92%/);
  await page.screenshot({path:`output/playwright/survivor/hurt-reduced-${viewport.width}.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#overlay').evaluate(el=>{el.style.visibility='';});
  await page.getByRole('button',{name:'전투 계속하기'}).click();
  await page.keyboard.down('d');
  await expect.poll(async()=>(await snapshot(page)).player.x).toBeGreaterThan(35);
  await page.keyboard.up('d');
  await expect.poll(async()=>(await snapshot(page)).hurtFeedback).toBeNull();
  await expect(page.locator('#hero-name')).toHaveText('잿빛 검사');
  await scenario(page,'combat');expect((await snapshot(page)).player.impact).toBeNull();
});

test('hurt sound cuts through foreground cooldown and briefly reserves contact audio',async({page})=>{
  await page.getByRole('button',{name:'숲에 들어가기'}).click();
  await page.getByRole('button',{name:'일시정지',exact:true}).click();
  const record=await page.evaluate(async()=>{
    const {createAudio}=await import('/src/survivor/audio.js');
    const notes=[];const original=AudioParam.prototype.setValueAtTime;
    AudioParam.prototype.setValueAtTime=function(value,...args){notes.push(value);return original.call(this,value,...args);};
    const audio=createAudio();audio.unlock();
    for(let i=0;i<20&&audio.state()!=='running';i++)await new Promise(r=>setTimeout(r,20));
    audio.play('level');audio.play('hurt');audio.play('blade-impact');
    const immediate=[...notes];
    await new Promise(r=>setTimeout(r,220));audio.play('blade-impact');
    const resumed=[...notes];audio.suspend();
    AudioParam.prototype.setValueAtTime=original;
    return {immediate,resumed};
  });
  expect(record.immediate).toContain(145);expect(record.immediate).toContain(72);
  expect(record.immediate).not.toContain(150);expect(record.resumed).toContain(150);
});

test('long player damage labels fit the narrow HUD',async({page})=>{
  await page.setViewportSize({width:320,height:568});
  await scenario(page,'enemy-hound');
  await page.waitForFunction(()=>window.__ASH_QA__.snapshot().hurtFeedback?.source==='hunt');
  await page.getByRole('button',{name:'일시정지',exact:true}).click();
  await expect(page.locator('#hero-name')).toHaveText('−12 · 사냥개 돌진');
  const fits=await page.evaluate(()=>{
    const text=document.querySelector('#hero-name').getBoundingClientRect();
    const level=document.querySelector('#level-badge').getBoundingClientRect();
    const pocket=document.querySelector('.health-pocket').getBoundingClientRect();
    return text.right<=level.left&&level.right<=pocket.right;
  });
  expect(fits).toBe(true);
  await page.locator('#overlay').evaluate(el=>{el.style.visibility='hidden';});
  await page.screenshot({path:'output/playwright/survivor/hurt-hound-320.png'});
});

for (const viewport of [{width:1280,height:720},{width:320,height:740},{width:740,height:360}]) {
  test(`combat pacing countdown freezes and stays readable at ${viewport.width}x${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    for (const [name, kind, label] of [['pacing-surge','surge','밀려오는 무리'],['pacing-rest','rest','숨 고르기']]) {
      await scenario(page, name);
      await expect(page.locator('#phase-label')).toContainText(label);
      await expect(page.locator('#phase-label')).toHaveAttribute('data-pacing',kind);
      const bounds = await page.locator('#phase-label').boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('button',{name:'일시정지',exact:true}).click();
      const paused = await snapshot(page);
      await page.waitForTimeout(150);
      expect((await snapshot(page)).pacing.remaining).toBe(paused.pacing.remaining);
      await page.getByRole('button',{name:'전투 계속하기'}).click();
      await expect.poll(async () => (await snapshot(page)).pacing.remaining).toBeLessThan(paused.pacing.remaining);
      await page.screenshot({path:`output/playwright/survivor/${name}-${viewport.width}.png`});
    }
    await scenario(page,'pacing-boss');
    await expect(page.locator('#phase-label')).toHaveText('최후의 대결');
    expect((await snapshot(page)).boss).not.toBeNull();
  });
}

for(const viewport of [{width:1280,height:720},{width:320,height:568},{width:740,height:360}]) {
 test(`reward preview freezes the objective, fits and resumes without a grant at ${viewport.width}`,async({page})=>{
  await page.setViewportSize(viewport);await scenario(page,'event-altar');
  await page.getByRole('button',{name:'보상 후보 살펴보기'}).click();
  await expect(page.getByRole('heading',{name:'봉인 제단의 보상'})).toBeVisible();
  await expect(page.locator('[data-preview-relic]')).toHaveCount(3);
  await expect(page.locator('.relic-context.is-future')).toContainText('무기 필요');
  const before=await snapshot(page);await page.waitForTimeout(150);
  expect((await snapshot(page)).time).toBe(before.time);
  expect((await snapshot(page)).encounters).toEqual(before.encounters);
  await page.keyboard.press('1');expect((await snapshot(page)).phase).toBe('preview');
  expect((await snapshot(page)).relics).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`output/playwright/survivor/reward-preview-${viewport.width}.png`});
  await page.getByRole('button',{name:'전장으로 돌아가기'}).click();
  await expect.poll(async()=>(await snapshot(page)).time).toBeGreaterThan(before.time);
  await page.getByRole('button',{name:'보상 후보 살펴보기'}).click();
  expect((await snapshot(page)).encounters[0].rewards).toEqual(before.encounters[0].rewards);
  await page.keyboard.press('Escape');expect((await snapshot(page)).phase).toBe('playing');
 });
}

for (const viewport of [{width:1280,height:720},{width:1280,height:600},{width:390,height:844},{width:320,height:568},{width:640,height:360},{width:740,height:360}]) {
  test(`departure stays visible across workspaces and scrolling at ${viewport.width}x${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.locator('#panel').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
    const before = await page.locator('#start-game').boundingBox();
    await expect(page.locator('#start-game')).toBeInViewport();
    await page.locator('[data-keepsake="bookmark"]').scrollIntoViewIfNeeded();
    const after = await page.locator('#start-game').boundingBox();
    expect(after).toEqual(before);
    await page.locator('.camp-tabs [data-camp-section="journal"]').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.camp-journal')).toBeVisible(); await expect(page.locator('.camp-controls')).toBeHidden();
    await page.locator('.mastery-board summary').click(); await page.locator('.journey-board summary').click();
    await page.locator('.camp-records summary').scrollIntoViewIfNeeded();
    await expect(page.locator('#start-game')).toBeInViewport();
    await page.locator('[data-open-codex]').click(); await page.keyboard.press('Escape');
    await expect(page.locator('.camp-journal')).toBeVisible(); await expect(page.locator('[data-open-codex]')).toBeFocused();
    await page.locator('.camp-tabs [data-camp-section="prepare"]').click();
    await page.locator('[data-character="ash"]').click();
    await expect(page.locator('[data-character="ash"]')).toBeFocused();
    expect(await page.evaluate(() => ({y:document.documentElement.scrollHeight-innerHeight,x:document.documentElement.scrollWidth-innerWidth,panel:document.querySelector('#panel').scrollTop}))).toEqual({y:0,x:0,panel:0});
    await expect(page.locator('#start-game')).toBeInViewport();
    const roster = page.locator('.companion-roster');
    await expect(roster).toBeInViewport({ratio:1});
    for (const id of ['ash','ember','grove']) await expect(roster.locator(`[data-character="${id}"]`)).toBeInViewport({ratio:1});
    const readable = await page.locator('.companion-signature').evaluate(el => ({size:parseFloat(getComputedStyle(el).fontSize),color:getComputedStyle(el).color}));
    expect(readable.size).toBeGreaterThanOrEqual(12);
    expect(readable.color).toBe('rgb(82, 96, 68)');
    if(viewport.width>680) {
      const hero=await page.locator('.camp-scene .hero-art').boundingBox(),caption=await page.locator('.camp-stage-caption').boundingBox();
      expect(hero.y+hero.height).toBeLessThanOrEqual(caption.y);
    }
    await page.screenshot({path:`output/playwright/survivor/polish-preparation-${viewport.width}x${viewport.height}.png`,animations:'disabled'});
    await page.locator('#start-game').click(); expect((await snapshot(page)).phase).toBe('playing');
  });
}

test('all illustrated companions load, follow selection and keep motion optional', async ({page}) => {
  await page.evaluate(() => localStorage.setItem('ash-profile-v1',JSON.stringify({version:1,bestTime:90,totalKills:230})));
  await page.reload();
  for (const id of ['ash','ember','grove']) {
    await page.locator(`[data-character="${id}"]`).click();
    const portrait = page.locator('.camp-portrait');
    await expect(portrait).toHaveAttribute('src',`/art/survivor/portrait-${id}-v1.webp`);
    await expect.poll(() => portrait.evaluate(img => img.complete && img.naturalWidth === 1024 && img.naturalHeight === 1536)).toBe(true);
    expect((await snapshot(page)).characterId).toBe(id);
    await page.screenshot({path:`output/playwright/survivor/illustrated-${id}.png`,animations:'disabled'});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-character="ash"]').click();
  expect(await page.locator('.camp-portrait').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.locator('.companion-guide summary').click();
  await expect(page.locator('.companion-guide')).toContainText('검 적중 6회마다');
  await page.locator('#start-game').click();expect((await snapshot(page)).characterId).toBe('ash');
});

test('original collection art reveals real discoveries and the result links to the recorded page', async ({page}) => {
  await page.locator('[data-open-codex]').click();
  await expect(page.locator('.collection-illustration.is-silhouette')).toHaveCount(19);
  await page.locator('[data-codex-entry="relic:bell"]').click();
  await expect(page.locator('.codex-detail .collection-illustration')).toHaveClass(/is-silhouette/);
  await page.screenshot({path:'output/playwright/survivor/polish-codex-locked.png',animations:'disabled'});
  await page.keyboard.press('Escape');
  await scenario(page,'record-experiment');
  await expect(page.locator('.discovery-trophy')).toHaveCount(3);
  await expect(page.locator('.discovery-trophy .collection-illustration.is-silhouette')).toHaveCount(0);
  await page.screenshot({path:'output/playwright/survivor/polish-discovery-result.png',animations:'disabled'});
  await page.locator('[data-review-discoveries]').click();
  await expect(page.locator('[data-codex-entry="branch:sweep"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-codex-entry="branch:sweep"]')).toBeFocused();
  await expect(page.locator('.codex-detail .collection-illustration')).not.toHaveClass(/is-silhouette/);
  expect((await snapshot(page)).profile.runs).toBe(1);
  await page.screenshot({path:'output/playwright/survivor/polish-codex-discovered.png',animations:'disabled'});
  await page.keyboard.press('Escape'); await page.locator('#start-game').click();
  expect((await snapshot(page)).ranks.sweep).toBe(0);
});

for (const [name,key] of [['evolution','dawn'],['evolution-comet','comet'],['evolution-lunar','lunar']]) {
  test(`real ${key} choice celebrates without changing pause, reduced motion or retry`, async ({page}) => {
    await scenario(page,name); await page.locator(`[data-upgrade="${key}"]`).click();
    await expect.poll(async()=>(await snapshot(page)).celebration?.key).toBe(key);
    await page.getByRole('button',{name:'일시정지',exact:true}).click();
    const frozen = await snapshot(page);
    await page.waitForTimeout(150); expect((await snapshot(page)).celebration).toEqual(frozen.celebration);
    await page.locator('#overlay').evaluate(el=>el.style.visibility='hidden');
    await page.screenshot({path:`output/playwright/survivor/polish-evolution-${key}.png`});
    await page.emulateMedia({reducedMotion:'reduce'});
    // MediaQueryList updates may reach existing objects on the next frame (WebKit/Firefox).
    await expect.poll(async()=>(await snapshot(page)).celebration?.shards).toBe(0);
    expect((await snapshot(page)).time).toBe(frozen.time);
    await page.locator('#overlay').evaluate(el=>el.style.visibility='');
    await page.getByRole('button',{name:'계속하기'}).click();
    await expect.poll(async()=>(await snapshot(page)).celebration).toBeNull();
    await scenario(page,'defeat'); await page.locator('#restart-game').click();
    expect((await snapshot(page)).celebration).toBeNull();
  });
}

for (const viewport of [{width:1280,height:720},{width:320,height:568},{width:740,height:360}]) {
 test(`new discovery results keep retry and preparation visible at ${viewport.width}px`, async ({page}) => {
  await page.setViewportSize(viewport); await scenario(page,'record-experiment');
  await expect(page.locator('#restart-game')).toBeInViewport(); await expect(page.locator('#camp-game')).toBeInViewport();
  if(viewport.width===1280) expect(await page.locator('#panel').evaluate(el=>el.getBoundingClientRect().width)).toBe(760);
  await page.locator('.battle-record summary').scrollIntoViewIfNeeded();
  await expect(page.locator('#restart-game')).toBeInViewport(); await expect(page.locator('#camp-game')).toBeInViewport();
  expect(await page.locator('#panel').evaluate(el=>el.scrollTop)).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight)).toBe(0);
  await page.locator('[data-review-discoveries]').click();
  if(viewport.width<=680) await expect(page.locator('.codex-detail h2')).toBeFocused();
  else await expect(page.locator('[data-codex-entry="branch:sweep"]')).toBeFocused();
  await page.keyboard.press('Escape'); await page.locator('#start-game').click();
  expect((await snapshot(page)).phase).toBe('playing'); expect((await snapshot(page)).ranks.sweep).toBe(0);
 });
}


test('a saved alternate inheritance yields to a branch goal when switching companions', async ({page}) => {
  await page.evaluate(()=>localStorage.setItem('ash-profile-v1',JSON.stringify({version:1,selected:'ash',bestTime:90,buildDiscoveries:['detonation'],inheritances:{ember:'detonation'}})));
  await page.reload();await page.locator('[data-open-codex]').click();
  await page.locator('[data-codex-entry="branch:wildfire"]').click();await page.locator('[data-codex-goal]').click();
  await page.locator('[data-close-codex]').click();await page.locator('[data-character="ember"]').click();
  const state=await snapshot(page);expect(state.goal).toBe('branch:wildfire');expect(state.inheritance).toBeNull();expect(state.ranks.detonation).toBe(0);
  expect(state.profile.inheritances.ember).toBeNull();
  await page.reload();expect((await snapshot(page)).inheritance).toBeNull();
  await expect(page.locator('[data-inheritance="none"]')).toHaveAttribute('aria-pressed','true');
});
