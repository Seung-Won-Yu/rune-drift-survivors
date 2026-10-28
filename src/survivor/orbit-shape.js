export const ORBIT_IDENTITY = Object.freeze({xx:1,xy:0,yy:1});
export const orbitGrowth = rank => rank === 3 ? '이동 방향으로 궤도 +30% · 옆으로 -25%'
  : rank === 5 ? '이동 궤도 강화 · 앞뒤 +55% · 옆으로 -40%' : '';

export function advanceOrbitShape(game,dt,x,y,burst=false) {
  if (game.ranks.orbit < 3) {
    game.orbitShape={...ORBIT_IDENTITY};
    return;
  }
  if (burst) return;
  const speed=Math.hypot(x,y),amount=speed>.05?Math.min(1,speed):0;
  const major=1+(game.ranks.orbit>=5?.55:.30)*amount;
  const minor=1-(game.ranks.orbit>=5?.40:.25)*amount;
  const ux=speed?x/speed:1,uy=speed?y/speed:0,difference=major-minor;
  const target={xx:minor+difference*ux*ux,xy:difference*ux*uy,yy:minor+difference*uy*uy};
  const shape=game.orbitShape??(game.orbitShape={...ORBIT_IDENTITY}),blend=1-Math.exp(-dt/.18);
  for(const key of ['xx','xy','yy'])shape[key]+=(target[key]-shape[key])*blend;
}

// A symmetric stretch makes opposite travel directions share the same axis.
// Both hit detection and the rendered heads/wakes use this transform.
export function orbitOffset(angle,radius,shape=ORBIT_IDENTITY) {
  const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
  return {x:shape.xx*x+shape.xy*y,y:shape.xy*x+shape.yy*y};
}
