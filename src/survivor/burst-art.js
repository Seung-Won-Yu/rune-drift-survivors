import { SIGNATURES } from './signature.js';

// Draw only the distance already travelled. Threat edges are painted afterward.
export function drawBurst(ctx,game,reduced=false) {
  const b=game.burst,age=game.time-(b?.startedAt??-10);
  if(!b||age<0||age>.32)return;
  const tone=SIGNATURES[game.characterId].color;
  ctx.save();ctx.strokeStyle=tone;ctx.lineCap='round';
  if(reduced) {
    ctx.globalAlpha=Math.max(0,1-age/.15)*.65;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(b.toX-7,b.toY-20);ctx.lineTo(b.toX+7,b.toY-12);ctx.stroke();
  } else {
    ctx.globalAlpha=Math.max(0,1-age/.32)*.8;
    for(const offset of [-10,0,10]) {
      ctx.lineWidth=offset?1.5:4;
      const x=-b.y*offset,y=b.x*offset-18;
      ctx.beginPath();ctx.moveTo(b.fromX+x,b.fromY+y);ctx.lineTo(b.toX+x,b.toY+y);ctx.stroke();
    }
  }
  ctx.restore();
}
