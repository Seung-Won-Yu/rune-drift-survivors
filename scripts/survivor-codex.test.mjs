import test from 'node:test';
import assert from 'node:assert/strict';
import { codexEntries } from '../src/survivor/codex.js';
import { createProfile, normalizeProfile, recordRun } from '../src/survivor/profile.js';
import { createGame } from '../src/survivor/game.js';

test('fresh codex records only the initial companion and never writes or grants discoveries', () => {
 const profile=createProfile(), before=JSON.stringify(profile), entries=codexEntries(profile);
 assert.equal(entries.length,22);assert.equal(new Set(entries.map(e=>e.id)).size,22);
 assert.deepEqual(entries.filter(e=>e.found).map(e=>e.id),['companion:ash']);
 for(const entry of entries) {assert.ok(entry.hint);assert.ok(entry.description);assert.ok(entry.change);}
 assert.equal(JSON.stringify(profile),before);
});
test('legacy saved discoveries and earned rewards fill the codex without inventing missing items', () => {
 const profile=normalizeProfile({version:1,bestTime:60,discoveries:['dawn'],buildDiscoveries:['sweep','wildfire'],relicDiscoveries:['dew']});
 const entries=codexEntries(profile), byId=id=>entries.find(e=>e.id===id);
 assert.equal(byId('companion:ember').found,true);assert.equal(byId('companion:grove').found,false);
 for(const id of ['evolution:dawn','branch:sweep','branch:wildfire','relic:dew','keepsake:bookmark','keepsake:ribbon'])assert.equal(byId(id).found,true);
 for(const id of ['evolution:comet','relic:coal','keepsake:seed','keepsake:crown'])assert.equal(byId(id).found,false);
});
test('real ended-run discoveries fill their pages on defeat and retain known evolution recipes', () => {
 const game=createGame(42);Object.assign(game,{phase:'ended',outcome:'defeat',runId:'codex-defeat'});
 game.ranks.sweep=1;game.ranks.dawn=1;game.relics=['dew'];
 const result=recordRun(createProfile(),game), entries=codexEntries(result.profile);
 assert.deepEqual(result.challenges,['collection']);
 assert.ok(entries.find(e=>e.id==='evolution:dawn').hint.includes('검 3 · 룬 1 · 정예 1'));
 for(const id of ['branch:sweep','evolution:dawn','relic:dew','keepsake:bookmark'])assert.ok(entries.find(e=>e.id===id).found);
});
test('a completed catalog has no phantom pages and invalid stored discovery IDs cannot count', () => {
 const profile=normalizeProfile({version:1,totalKills:200,bestTime:60,wins:1,altarRuns:1,discoveries:['dawn','comet','lunar','fake'],buildDiscoveries:['sweep','duelist','wildfire','detonation','bulwark','horizon'],relicDiscoveries:['coal','fang','bell','sail','dew','briar']});
 assert.equal(codexEntries(profile).filter(e=>e.found).length,22);
 assert.equal(codexEntries(normalizeProfile({version:1,discoveries:['fake'],relicDiscoveries:['fake']})).filter(e=>e.found).length,1);
});
