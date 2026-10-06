import {test, expect} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
const output = 'output/playwright/survivor/progression-fullrun';
await mkdir(output, {recursive: true});

for (const [character, route, seed, vow, evolution, viewport] of [
  ['ash', 'blade-alternate', 42, 'mist', 'dawn', {width:1280, height:720}],
  ['ember', 'comet', 101, 'none', 'comet', {width:390, height:844}],
  ['grove', 'lunar-alternate', 42, 'mist', 'lunar', {width:740, height:360}]
]) {
  test(`${character}: tracked collection, reroll, recorded chapter and fresh retry`, async ({page}) => {
    await page.setViewportSize(viewport);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const goal = `evolution:${evolution}`;
    // A prior victory unlocks the opt-in vow. No combat values are changed.
    await page.addInitScript(({character, vow, goal}) => localStorage.setItem('ash-profile-v1', JSON.stringify({version:1, selected:character, runs:1, wins:1, bestTime:280, totalKills:600, vow, goal, characters:{[character]:{runs:1,wins:1}}})), {character, vow, goal});
    await page.goto('/survivor/?qa');
    await expect(page.locator('.experiment-plan')).toBeVisible();
    await page.evaluate(async ({character, route, seed, vow, goal}) => window.__ASH_QA__.prepareRun(character, route, seed, {vow, goal}), {character, route, seed, vow, goal});
    await page.getByRole('button', {name:'숲에 들어가기'}).click();
    await page.evaluate(() => {
      window.__RUN_FRAMES__ = []; let last = 0;
      function sample(now) {if (last) window.__RUN_FRAMES__.push(now-last); last=now; if(window.__ASH_QA__.snapshot().phase!=='ended') requestAnimationFrame(sample);}
      requestAnimationFrame(sample);
    });
    const start = Date.now(); let state, nextLog = 0;
    while (Date.now()-start < 390000) {
      state = await page.evaluate(() => window.__ASH_QA__.snapshot());
      expect(errors).toEqual([]); expect(state.phase).not.toBe('paused');
      if (state.time >= nextLog) {console.log(JSON.stringify({character, time:Math.round(state.time), level:state.level, hp:Math.round(state.player.hp)})); nextLog+=60;}
      if (state.phase === 'ended') break;
      await page.waitForTimeout(1000);
    }
    expect(state.phase).toBe('ended'); expect(state.time).toBeGreaterThanOrEqual(240);
    expect(state.goalProgress.state).toBe('complete'); expect(state.rerollsUsed).toBe(1);
    expect(state.relics).toHaveLength(2); expect(state.encounters.every(e => e.state === 'completed')).toBe(true);
    await page.getByRole('button', {name:'다시 숲으로'}).waitFor();
    const result = await page.evaluate(() => window.__ASH_QA__.snapshot());
    expect(result.profile.runs).toBe(2); expect(result.profile.goal).toBeNull();
    expect(result.profile.discoveries).toContain(evolution);
    expect(result.profile.history[0].vow).toBe(vow);
    expect(result.profile.characters[character].evolved).toBe(true);
    if (state.outcome === 'victory' && vow === 'mist') expect(result.profile.characters[character].vowWins).toBe(1);
    await expect(page.locator('.build-summary')).toContainText('도감 기록 완료');
    await page.screenshot({path:`${output}/${character}-result.png`});
    const timing = await page.evaluate(() => {const f=window.__RUN_FRAMES__.sort((a,b)=>a-b);return {frames:f.length,p50:f[Math.floor(f.length*.5)],p95:f[Math.floor(f.length*.95)]};});
    const record = {character, route, seed, vow, viewport, outcome:state.outcome, time:state.time, level:state.level, kills:state.kills, goal:state.goalProgress, rerollsUsed:state.rerollsUsed, relics:state.relics, timing, errors};
    await writeFile(`${output}/${character}.json`, JSON.stringify(record, null, 2));
    console.log('PROGRESSION FULLRUN', JSON.stringify(record));
    await page.getByRole('button', {name:'다시 숲으로'}).click();
    const retry = await page.evaluate(() => window.__ASH_QA__.snapshot());
    expect(retry.kills).toBe(0); expect(retry.level).toBe(1); expect(retry.goal).toBeNull();
    expect(retry.rerollsUsed).toBe(0); expect(retry.rerolls).toBe(1); expect(retry.vow).toBe(vow);
    expect(retry.relics).toEqual([]); expect(errors).toEqual([]);
  });
}
