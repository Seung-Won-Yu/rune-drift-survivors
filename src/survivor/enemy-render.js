import { SPORE, HOUND } from './enemies.js';
export function drawEnemyGround(ctx, game) {
  for (const s of game.spores) {
    const active=s.age>=SPORE.windup;
    ctx.fillStyle=active?'#ca95512c':'#c2ab6510';
    ctx.beginPath();ctx.arc(s.x,s.y,SPORE.radius,0,Math.PI*2);ctx.fill();
  }
}
// Draw warning edges above weapon effects so danger remains readable.
export function drawEnemyWarnings(ctx, game, reduced) {
  ctx.save();
  for (const s of game.spores) {
    const active=s.age>=SPORE.windup;
    ctx.strokeStyle=active?'#edc082':'#d7cc96';ctx.lineWidth=2;
    ctx.setLineDash(active?[]:[4,5]);ctx.beginPath();ctx.arc(s.x,s.y,SPORE.radius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    if (!active) {ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x,s.y,SPORE.radius,-Math.PI/2,-Math.PI/2+Math.min(1,s.age/SPORE.windup)*Math.PI*2);ctx.stroke();}
    ctx.fillStyle='#edc082';
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;ctx.beginPath();ctx.arc(s.x+Math.cos(a)*12,s.y+Math.sin(a)*9-(active&&!reduced?Math.sin(game.time*3+i)*2:0),2.5,0,7);ctx.fill();}
    ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#192219';ctx.strokeText(active?'포자':'포자 예고',s.x,s.y-SPORE.radius-8);ctx.fillText(active?'포자':'포자 예고',s.x,s.y-SPORE.radius-8);
  }
  for (const enemy of game.enemies) {
    const h=enemy.hunt;
    if (!h || h.age>=HOUND.windup+HOUND.duration) continue;
    ctx.save();ctx.translate(h.x,h.y);ctx.rotate(h.angle);
    ctx.strokeStyle='#edaa6340';ctx.lineWidth=HOUND.width;ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(HOUND.length,0);ctx.stroke();
    ctx.strokeStyle='#f8c986';ctx.lineWidth=2;ctx.setLineDash(h.age<HOUND.windup?[7,5]:[]);
    ctx.beginPath();ctx.moveTo(0,-HOUND.width/2);ctx.lineTo(HOUND.length,-HOUND.width/2);ctx.moveTo(0,HOUND.width/2);ctx.lineTo(HOUND.length,HOUND.width/2);ctx.stroke();ctx.setLineDash([]);
    const tip=HOUND.length*Math.min(1,h.age/HOUND.windup);
    ctx.beginPath();ctx.moveTo(tip-10,-7);ctx.lineTo(tip,0);ctx.lineTo(tip-10,7);ctx.stroke();ctx.restore();
  }
  ctx.restore();
}
