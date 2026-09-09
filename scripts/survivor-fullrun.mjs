import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const base=process.env.ASH_FULLRUN_URL??'http://127.0.0.1:5173';
const output='output/playwright/survivor/fullrun';await mkdir(output,{recursive:true});
async function run(character,route,viewport){
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${base}/survivor/?qa`);await page.getByRole('button',{name:'숲에 들어가기'}).waitFor();
    await page.evaluate(async({character,route})=>window.__ASH_QA__.prepareRun(character,route,42),{character,route});
    await page.getByRole('button',{name:'숲에 들어가기'}).click();
    const started=Date.now();let nextLog=0,state;
    const frames=await page.evaluate(()=>{window.__RUN_FRAMES__=[];let last=0;function frame(now){if(last)window.__RUN_FRAMES__.push(now-last);last=now;if(window.__ASH_QA__.snapshot().phase!=='ended')requestAnimationFrame(frame);}requestAnimationFrame(frame);return true;});
    assert.ok(frames);
    while(Date.now()-started<390000){
      state=await page.evaluate(()=>window.__ASH_QA__.snapshot());
      assert.notEqual(state.phase,'paused','full run unexpectedly paused');assert.deepEqual(errors,[]);
      if(state.time>=nextLog){console.log(JSON.stringify({character,time:Math.round(state.time),level:state.level,kills:state.kills,hp:state.player.hp}));nextLog+=30;}
      if(state.phase==='ended')break;
      await page.waitForTimeout(1000);
    }
    assert.equal(state.phase,'ended');assert.ok(state.time>=240,'must reach the final encounter through ordinary play');
    assert.equal(state.relics.length,2,'both optional objectives must be completed in this diagnostic route');
    assert.ok(state.encounters.every(e=>e.state==='completed'));
    assert.ok(state.level>=10);assert.ok(state.eliteKills>=1);assert.ok(state.kills>100);
    await page.getByRole('button',{name:'다시 숲으로'}).waitFor();
    assert.equal((await page.evaluate(()=>window.__ASH_QA__.snapshot())).profile.runs,1);
    await page.screenshot({path:`${output}/${character}-result.png`});
    const timing=await page.evaluate(()=>{const list=window.__RUN_FRAMES__.sort((a,b)=>a-b);return {frames:list.length,p50:list[Math.floor(list.length*.5)],p95:list[Math.floor(list.length*.95)],over50:list.filter(n=>n>50).length};});
    const record={character,route,seed:42,viewport,wallSeconds:(Date.now()-started)/1000,time:state.time,outcome:state.outcome,kills:state.kills,level:state.level,eliteKills:state.eliteKills,ranks:state.ranks,damage:state.damageDealt,healing:state.healing,relics:state.relics,encounters:state.encounters,timing,errors};
    await writeFile(`${output}/${character}.json`,JSON.stringify(record,null,2)+'\n');
    console.log('FULLRUN COMPLETE',JSON.stringify(record));
    await page.getByRole('button',{name:'다시 숲으로'}).click();
    const restart=await page.evaluate(()=>window.__ASH_QA__.snapshot());assert.equal(restart.phase,'playing');assert.equal(restart.kills,0);assert.equal(restart.characterId,character);assert.deepEqual(restart.relics,[]);assert.deepEqual(restart.encounters,[]);
    return record;
  }finally{
    if(browser.isConnected()) {
      // A local transport can deliver disconnection before its close reply.
      // Both are terminal browser states; neither skips gameplay assertions.
      const disconnected=new Promise(resolve=>browser.once('disconnected',resolve));
      await Promise.race([browser.close(),disconnected]);
    }
  }
}
const results=await Promise.all([
  run('ash','blade',{width:1280,height:720}),
  run('ember','comet',{width:390,height:844}),
  run('grove','lunar',{width:740,height:360})
]);
await writeFile(`${output}/summary.json`,JSON.stringify(results,null,2)+'\n');
