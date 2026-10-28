// One deliberate action, measured in the same simulation time as every threat.
export const BURST = Object.freeze({distance:120,duration:.2,cooldown:4.2,invulnerable:.11,width:26,damage:1.2});
export const createBurst = () => ({active:false,age:0,readyAt:0,startedAt:-10,aimX:1,aimY:0,x:1,y:0,fromX:0,fromY:0,toX:0,toY:0,iframesUntil:0,hitIds:[],uses:0,kills:0});
export const canBurst = game => game.phase === 'playing' && !game.burst.active && game.time >= game.burst.readyAt;
export const burstCooldown = game => Math.max(0,game.burst.readyAt-game.time);

export function startBurst(game, direction = {}) {
  if (!canBurst(game)) return false;
  const b=game.burst,p=game.player;
  let x=Number.isFinite(direction.x)?direction.x:0,y=Number.isFinite(direction.y)?direction.y:0;
  if(Math.hypot(x,y)<.01){x=b.aimX;y=b.aimY;}
  const length=Math.hypot(x,y)||1;
  Object.assign(b,{active:true,age:0,x:x/length,y:y/length,fromX:p.x,fromY:p.y,toX:p.x,toY:p.y,
    startedAt:game.time,readyAt:game.time+BURST.cooldown,iframesUntil:game.time+BURST.invulnerable,hitIds:[],uses:b.uses+1});
  game.events.push('burst');
  return true;
}

export function advanceBurst(game,dt) {
  const b=game.burst;
  if(!b.active)return null;
  const distance=Math.min(dt,Math.max(0,BURST.duration-b.age))*BURST.distance/BURST.duration;
  game.player.x+=b.x*distance;game.player.y+=b.y*distance;
  b.toX=game.player.x;b.toY=game.player.y;
  b.age=Math.min(BURST.duration,b.age+dt);
  if(b.age>=BURST.duration-1e-9)b.active=false;
  return {distance,x:b.x,y:b.y};
}

export function burstDistance(b,x,y) {
  const dx=b.toX-b.fromX,dy=b.toY-b.fromY,length=dx*dx+dy*dy;
  const along=length?Math.max(0,Math.min(1,((x-b.fromX)*dx+(y-b.fromY)*dy)/length)):0;
  return Math.hypot(x-b.fromX-dx*along,y-b.fromY-dy*along);
}
