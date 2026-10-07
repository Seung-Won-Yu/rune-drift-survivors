import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from '@playwright/test';

// Build first with GITHUB_PAGES=true. An external preview can be provided explicitly.
const origin=process.env.ASH_PREVIEW_URL??'http://127.0.0.1:4174';
const server=process.env.ASH_PREVIEW_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4174','--strictPort'],{env:{...process.env,GITHUB_PAGES:'true'},stdio:'ignore'});
let browser;
try{
  let ready=false;
  for(let i=0;i<50;i++){try{if((await fetch(`${origin}/rune-drift-survivors/survivor/`)).ok){ready=true;break;}}catch{}await delay(100);}
  assert.ok(ready,'Pages preview must become ready');
  browser=await chromium.launch({...(process.env.CI==='true'?{}:{channel:'chrome'}),headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const failures=[],errors=[],assets=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${response.url()}`);if(response.url().includes('/art/survivor/'))assets.push(response.url().split('/').at(-1));});
  await page.goto(`${origin}/rune-drift-survivors/survivor/?qa`);
  await page.locator('.camp-scene').waitFor();
  assert.ok(await page.locator('#start-game').isVisible());
  await page.locator('.camp-tabs [data-camp-section="journal"]').click();
  await page.locator('.camp-tabs [data-camp-section="prepare"]').click();
  await page.locator('[data-open-codex]').click();
  assert.equal(await page.locator('[data-codex-entry]').count(),22);
  await page.locator('[data-codex-entry="keepsake:bookmark"]').click();
  assert.ok((await page.locator('.codex-detail').textContent()).includes('첫 60초 획득 경험치 +20%'));
  assert.ok(await page.evaluate(()=>{
    const panel=document.getElementById('panel'),outer=document.getElementById('overlay'),r=panel.getBoundingClientRect();
    return r.top>=0&&r.bottom<=innerHeight&&outer.scrollHeight===outer.clientHeight&&outer.scrollTop===0&&panel.scrollHeight===panel.clientHeight&&document.querySelector('.codex-grid').scrollTop>0;
  }),'codex stays within the viewport while the collection scrolls internally');
  await page.locator('[data-codex-filter="weapons"]').click();
  assert.equal(await page.locator('[data-codex-entry]').count(),9);
  await page.locator('[data-codex-entry="evolution:dawn"]').click();
  assert.ok((await page.locator('.codex-detail').textContent()).includes('검 3 · 룬 1 · 정예 1'));
  await page.locator('[data-close-codex]').click();
  assert.equal(await page.locator('[data-keepsake="bookmark"]').isDisabled(),true);
  await page.getByRole('button',{name:'숲에 들어가기'}).click();
  await page.getByRole('button',{name:'일시정지',exact:true}).click();
  await page.getByRole('button',{name:'전투 계속하기'}).waitFor();
  assert.equal(await page.evaluate(()=>typeof window.__ASH_QA__),'undefined');
  for(const name of ['hero-ash.png','hero-ember.png','hero-grove.png','enemies.png','ash-sovereign.png','forest-camp-v1.webp'])assert.ok(assets.includes(name),name);
  assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({base:'/rune-drift-survivors/',loadedAssets:[...new Set(assets)],qaGlobal:'absent',codexEntries:22,codexRecipes:'passed',lockedGrowth:'passed',startAndPause:'passed',failures,errors}));
}finally{await browser?.close();server?.kill();}
