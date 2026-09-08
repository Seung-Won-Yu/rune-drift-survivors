// Deterministic diagnostic bot: gather nearby XP and repel from nearby enemies.
// Useful for pacing regressions; it does not measure human difficulty or fun.
import assert from 'node:assert/strict';
import { createGame, startGame, updateGame, chooseUpgrade, LIMITS, EVOLUTIONS, SLAM } from '../src/survivor/game.js';
import { BOSS } from '../src/survivor/boss.js';

const routes={
  blade:['dawn','sword','orbit','vitality','fleet','magnet','comet','lunar','ember','heal'],
  comet:['comet','ember','fleet','magnet','vitality','orbit','sword','lunar','dawn','heal'],
  lunar:['lunar','orbit','vitality','magnet','fleet','sword','ember','dawn','comet','heal']
};
for(const [route,priorities] of Object.entries(routes)) for (const seed of [12, 42, 99]) {
  const character={blade:'ash',comet:'ember',lunar:'grove'}[route];
  const game = createGame(seed,character);
  startGame(game);
  let peakEnemies = 0, firstKill = null, firstLevel = null, firstEvolution = null;
  const start = performance.now();
  for (let i = 0; i < 19_000 && game.phase !== 'ended'; i++) {
    if (game.phase === 'upgrade') {
      firstLevel ??= game.time;
      chooseUpgrade(game, priorities.find(key => game.choices.includes(key)));
      if(Object.keys(EVOLUTIONS).some(k=>game.ranks[k]))firstEvolution??=game.time;
    }
    let dx = 0, dy = 0;
    const { player } = game;
    const nearest = [...game.gems].sort((a, b) =>
      Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
    if (nearest) {
      dx = nearest.x - player.x;
      dy = nearest.y - player.y;
      const distance = Math.hypot(dx, dy) || 1;
      dx /= distance;
      dy /= distance;
    }
    for (const enemy of game.enemies) {
      const x = player.x - enemy.x, y = player.y - enemy.y, distance = Math.hypot(x, y);
      // The short-range rune route must enter its weapon reach rather than kite outside it.
      const retreatRadius=route==='lunar'?70:95;
      if (distance < retreatRadius) {
        dx += x / (distance || 1) * (retreatRadius - distance) / 35;
        dy += y / (distance || 1) * (retreatRadius - distance) / 35;
      }
    }
    // Use only visible warnings, with a 200ms reaction. Never change HP or damage rules.
    // This makes the close-range route comparison include the evasion its role requires.
    for(const enemy of game.enemies){
      const slam=enemy.slam;
      if(slam&&!slam.hit&&slam.age>=.2&&Math.hypot(player.x-slam.x,player.y-slam.y)<SLAM.radius+26){
        let x=player.x-slam.x,y=player.y-slam.y;
        if(Math.hypot(x,y)<1){x=player.x-enemy.x;y=player.y-enemy.y;}
        const distance=Math.hypot(x,y)||1;dx=x/distance;dy=y/distance;break;
      }
      const pattern=enemy.pattern;
      if(enemy.boss&&pattern?.kind==='charge'&&pattern.age>=.2&&pattern.age<BOSS.windup+BOSS.chargeDuration){
        const x=player.x-pattern.x,y=player.y-pattern.y,c=Math.cos(pattern.angle),s=Math.sin(pattern.angle);
        const along=x*c+y*s,across=-x*s+y*c;
        if(along>-45&&along<BOSS.chargeLength+45&&Math.abs(across)<BOSS.chargeWidth/2+26){const side=across<0?-1:1;dx=-s*side;dy=c*side;break;}
      }
    }
    updateGame(game, 1 / 60, { x: dx, y: dy });
    game.events.length = 0;
    if (game.kills) firstKill ??= game.time;
    peakEnemies = Math.max(peakEnemies, game.enemies.length);
    assert.ok(Number.isFinite(player.x) && Number.isFinite(player.y));
    assert.ok(game.enemies.length <= LIMITS.enemies && game.gems.length <= LIMITS.gems);
  }
  assert.equal(game.phase, 'ended', 'a run must terminate');
  console.log(JSON.stringify({ route, character, seed, outcome: game.outcome, time: Math.round(game.time), kills: game.kills,
    level: game.level, hp: game.player.hp, firstKill: Number(firstKill?.toFixed(2)),
    firstLevel: Number(firstLevel?.toFixed(2)), firstEvolution: firstEvolution===null?null:Number(firstEvolution.toFixed(2)),
    eliteKills:game.eliteKills,evolutions:Object.keys(EVOLUTIONS).filter(k=>game.ranks[k]),damage:game.damageDealt,
    damageTaken:game.damageTaken,lastHurt:game.lastHurt, peakEnemies, simulationMs: Math.round(performance.now() - start) }));
}
