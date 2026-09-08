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
  await page.getByRole('button',{name:'숲에 들어가기'}).click();
  await page.getByRole('button',{name:'일시정지',exact:true}).click();
  await page.getByRole('button',{name:'전투 계속하기'}).waitFor();
  assert.equal(await page.evaluate(()=>typeof window.__ASH_QA__),'undefined');
  for(const name of ['hero-ash.png','hero-ember.png','hero-grove.png','enemies.png','ash-sovereign.png'])assert.ok(assets.includes(name),name);
  assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({base:'/rune-drift-survivors/',loadedAssets:[...new Set(assets)],qaGlobal:'absent',startAndPause:'passed',failures,errors}));
}finally{await browser?.close();server?.kill();}
