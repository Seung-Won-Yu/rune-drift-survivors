export const emberHops = rank => rank >= 5 ? 2 : rank >= 3 ? 1 : 0;
export const emberGrowth = rank => rank === 3 ? '보조 불씨 1회 도약 · 도약 피해 50%'
  : rank === 5 ? '보조 불씨 도약 1 → 2회 · 매회 피해 50%' : '';

// Reuse the real projectile. Explosions and charged fragments belong to its
// original impact, never the weaker continuation.
export function continueEmber(game, shot) {
  if (!shot.hopsLeft) return false;
  const target = game.enemies.filter(enemy => enemy.hp > 0 && !(enemy.boss && enemy.entrance > 0)
    && !shot.hitIds.includes(enemy.id) && Math.hypot(enemy.x - shot.x, enemy.y - shot.y) <= 180)
    .sort((a,b) => Math.hypot(a.x-shot.x,a.y-shot.y)-Math.hypot(b.x-shot.x,b.y-shot.y))[0];
  if (!target) return false;
  const dx=target.x-shot.x,dy=target.y-shot.y,d=Math.hypot(dx,dy)||1;
  Object.assign(shot,{kind:'ember-hop',targetId:target.id,hopsLeft:shot.hopsLeft-1,
    damage:shot.damage*.5,blast:false,life:.65,vx:dx/d*360,vy:dy/d*360});
  return true;
}
