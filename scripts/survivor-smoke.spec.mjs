import { test, expect } from '@playwright/test';

const pageErrors=new WeakMap();
test.afterEach(async({page})=>{expect(pageErrors.get(page)??[], 'browser runtime errors').toEqual([]);});

const snapshot = page => page.evaluate(() => window.__ASH_QA__.snapshot());
const scenario = (page, name) => page.evaluate(name => window.__ASH_QA__.scenario(name), name);

test.beforeEach(async ({ page }) => {
  const errors=[];pageErrors.set(page,errors);page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/survivor/?qa');
  await expect(page.getByRole('button', { name: '숲에 들어가기' })).toBeVisible();
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
  await expect(page.locator('#weapons .is-evolved')).toHaveAttribute('aria-label','여명의 검 3단계');
  await expect(page.locator('#evolution-hint')).toContainText('월광 고리 진화');
  expect((await snapshot(page)).ranks.dawn).toBe(1);
  await scenario(page, 'evolved');
  await expect.poll(async () => (await snapshot(page)).crescents).toBeGreaterThan(0);
  await page.screenshot({ path: 'output/playwright/survivor/evolved-combat.png', animations: 'disabled' });
  await scenario(page, 'defeat');
  await page.getByRole('button', {name:'다시 숲으로'}).click();
  expect((await snapshot(page)).ranks.dawn).toBe(0);
  await expect(page.locator('#weapons .is-evolved')).toHaveCount(0);
});

for(const [key,name,effect] of [['comet','잿불 혜성','ember-burst'],['lunar','월광 고리','lunar-pulse']]){
  test(`${name} evolution changes the weapon and performs its distinct attack`,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await scenario(page,`evolution-${key}`);
    await expect(page.locator(`[data-upgrade="${key}"]`)).toBeVisible();
    await page.locator(`[data-upgrade="${key}"]`).click();
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

test('a short desktop window can scroll the entire camp without clipping its top',async({page})=>{
  await page.setViewportSize({width:1280,height:600});
  const panel=await page.locator('#panel').boundingBox();expect(panel.y).toBeGreaterThanOrEqual(0);
  await page.locator('.camp-records summary').scrollIntoViewIfNeeded();await expect(page.locator('.camp-records summary')).toBeVisible();
  await page.getByRole('heading',{name:'잿빛의 숲',exact:true}).scrollIntoViewIfNeeded();
  const heading=await page.getByRole('heading',{name:'잿빛의 숲',exact:true}).boundingBox();// Scrolling can round a fractional CSS pixel at the viewport edge.
  expect(heading.y).toBeGreaterThanOrEqual(-.5);
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
test('altar completes through real time, rewards once, and relic choice resumes input',async({page})=>{
  await scenario(page,'event-altar');await expect(page.locator('#encounter-hud')).toContainText('봉인 제단');
  await expect(page.locator('[data-relic]')).toHaveCount(3,{timeout:15000});
  const before=await snapshot(page);expect(before.encounters[0].state).toBe('completed');await page.waitForTimeout(150);expect((await snapshot(page)).time).toBe(before.time);
  await page.screenshot({path:'output/playwright/survivor/relic-desktop.png'});
  await page.keyboard.press('1');expect((await snapshot(page)).relics).toHaveLength(1);
  await page.keyboard.down('d');await expect.poll(async()=>(await snapshot(page)).player.x).toBeGreaterThan(25);await page.keyboard.up('d');
  await page.keyboard.press('Escape');await expect(page.locator('.build-summary')).toContainText('숲의 유물 1/2');
});
test('chest consent can be declined and accepted curse completes in ordinary time',async({page})=>{
  await scenario(page,'event-chest');await page.getByRole('button',{name:'저주 상자 살펴보기'}).click();
  await expect(page.getByRole('heading',{name:'저주를 받아들이겠습니까?'})).toBeVisible();
  const time=(await snapshot(page)).time;await page.waitForTimeout(150);expect((await snapshot(page)).time).toBe(time);
  await page.keyboard.press('Escape');expect((await snapshot(page)).encounters.find(e=>e.kind==='chest').state).toBe('declined');
  await scenario(page,'event-chest');await page.getByRole('button',{name:'저주 상자 살펴보기'}).click();
  await page.getByRole('button',{name:'저주를 받아들인다'}).click();await expect(page.locator('#encounter-hud')).toContainText('접촉 피해 +25%');
  await page.keyboard.press('Escape');const paused=await snapshot(page);await page.waitForTimeout(150);expect((await snapshot(page)).encounters).toEqual(paused.encounters);
  await page.getByRole('button',{name:'전투 계속하기'}).click();await expect(page.locator('[data-relic]')).toHaveCount(3,{timeout:22000});
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
  await page.locator('.journey-board summary').click();
  await expect(page.locator('[data-keepsake="seed"]')).toBeDisabled();
  await scenario(page,'record-journey');
  await expect(page.locator('.challenge-reward')).toContainText('제단의 씨앗');
  await expect(page.locator('.challenge-reward')).toContainText('갈림길의 리본');
  await page.getByRole('button',{name:'동료 선택',exact:true}).click();
  await page.locator('.journey-board summary').click();
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
 await page.reload();await page.locator('.journey-board summary').click();
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
