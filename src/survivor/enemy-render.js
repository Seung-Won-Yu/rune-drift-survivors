import { SPORE, HOUND, GIANT, sporeRule, huntRule } from './enemies.js';
import { BOSS } from './boss.js';
import { SLAM } from './game.js';

function warningStroke(ctx, color, width = 2) {
  ctx.strokeStyle = '#15231fee'; ctx.lineWidth = width + 4; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}

export function drawEnemyGround(ctx, game) {
  ctx.save();
  for (const s of game.spores) {
    const rule = sporeRule(s);
    const active=s.age>=rule.windup;
    ctx.fillStyle=active?'#ca95512c':'#c2ab6510';
    ctx.beginPath();ctx.arc(s.x,s.y,rule.radius,0,Math.PI*2);ctx.fill();
  }
  for (const enemy of game.enemies) {
    const hunt = huntRule(enemy);
    if (enemy.hunt && enemy.hunt.age < hunt.windup + hunt.duration) {
      ctx.save(); ctx.translate(enemy.hunt.x, enemy.hunt.y); ctx.rotate(enemy.hunt.angle);
      ctx.strokeStyle = '#edaa6340'; ctx.lineWidth = hunt.width; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hunt.length, 0); ctx.stroke(); ctx.restore();
    }
    if (enemy.slam && !enemy.slam.hit) {
      const rule = enemy.elite ? SLAM : GIANT;
      ctx.fillStyle = '#d8684430'; ctx.beginPath();
      ctx.arc(enemy.slam.x, enemy.slam.y, rule.radius, 0, Math.PI * 2); ctx.fill();
    }
    const pattern = enemy.boss && enemy.pattern;
    if (pattern?.kind === 'charge' && pattern.age < BOSS.windup) {
      ctx.save(); ctx.translate(pattern.x, pattern.y); ctx.rotate(pattern.angle);
      ctx.strokeStyle = '#cf70443b'; ctx.lineWidth = BOSS.chargeWidth; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(BOSS.chargeLength, 0); ctx.stroke(); ctx.restore();
    }
  }
  ctx.restore();
}
// Every damaging warning is above actors and friendly effects. Area fills remain on the floor.
export function drawEnemyWarnings(ctx, game, reduced, scale = 1) {
  ctx.save();
  for (const enemy of game.enemies) {
    const hunt = huntRule(enemy);
    if (enemy.boss) {
      const pattern = enemy.pattern;
      if (enemy.entrance > 0) {
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, 55 + enemy.entrance / BOSS.entrance * 22, 0, Math.PI * 2);
        warningStroke(ctx, '#e9bd78', 3);
      }
      if (!pattern || pattern.age >= BOSS.windup) continue;
      const progress = pattern.age / BOSS.windup;
      ctx.save(); ctx.translate(pattern.x, pattern.y); ctx.rotate(pattern.angle);
      if (pattern.kind === 'charge') {
        ctx.lineCap = 'butt'; ctx.beginPath();
        ctx.moveTo(0, -BOSS.chargeWidth / 2); ctx.lineTo(BOSS.chargeLength, -BOSS.chargeWidth / 2);
        ctx.moveTo(0, BOSS.chargeWidth / 2); ctx.lineTo(BOSS.chargeLength, BOSS.chargeWidth / 2);
        warningStroke(ctx, '#f4c59a');
        ctx.setLineDash([8, 9]); ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(BOSS.chargeLength * progress, 0); warningStroke(ctx, '#ffb57a', 3); ctx.setLineDash([]);
        ctx.fillStyle = '#ffe4bc'; ctx.beginPath();
        ctx.moveTo(BOSS.chargeLength + 10, 0); ctx.lineTo(BOSS.chargeLength - 8, -9); ctx.lineTo(BOSS.chargeLength - 8, 9);
        ctx.closePath(); warningStroke(ctx, '#15231f', 3); ctx.fill();
      } else {
        const count = enemy.enraged ? 11 : 7;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          const angle = (i - (count - 1) / 2) * .24;
          ctx.moveTo(Math.cos(angle) * 45, Math.sin(angle) * 45);
          ctx.lineTo(Math.cos(angle) * (80 + progress * 70), Math.sin(angle) * (80 + progress * 70));
        }
        warningStroke(ctx, '#eaa389');
      }
      ctx.restore();
    }
    if (enemy.slam && !enemy.slam.hit) {
      const slam = enemy.slam, rule = enemy.elite ? SLAM : GIANT;
      const progress = Math.min(1, slam.age / rule.windup);
      ctx.beginPath(); ctx.arc(slam.x, slam.y, rule.radius, 0, Math.PI * 2); warningStroke(ctx, '#ffc39b');
      ctx.beginPath(); ctx.arc(slam.x, slam.y, rule.radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2); warningStroke(ctx, '#ff9869', 4);
      ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y); ctx.lineTo(slam.x, slam.y); warningStroke(ctx, '#eebda280', 1); ctx.setLineDash([]);
      ctx.font = `bold ${scale < 1 ? 17 : 12}px system-ui`; ctx.textAlign = 'center';
      ctx.strokeStyle = '#281c18'; ctx.lineWidth = 4; ctx.strokeText('내려찍기', slam.x, slam.y - rule.radius - 12);
      ctx.fillStyle = '#ffe0c0'; ctx.fillText('내려찍기', slam.x, slam.y - rule.radius - 12);
      ctx.beginPath(); ctx.moveTo(slam.x - 6, slam.y - 6); ctx.lineTo(slam.x + 6, slam.y + 6);
      ctx.moveTo(slam.x + 6, slam.y - 6); ctx.lineTo(slam.x - 6, slam.y + 6); warningStroke(ctx, '#ffd5ab');
    }
  }
  for (const s of game.spores) {
    const rule = sporeRule(s);
    const active=s.age>=rule.windup;
    ctx.setLineDash(active?[]:[4,5]);ctx.beginPath();ctx.arc(s.x,s.y,rule.radius,0,Math.PI*2);warningStroke(ctx,active?'#edc082':'#d7cc96');ctx.setLineDash([]);
    if (!active) {ctx.beginPath();ctx.arc(s.x,s.y,rule.radius,-Math.PI/2,-Math.PI/2+Math.min(1,s.age/rule.windup)*Math.PI*2);warningStroke(ctx,'#d7cc96',3);}
    ctx.fillStyle='#edc082';
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;ctx.beginPath();ctx.arc(s.x+Math.cos(a)*12,s.y+Math.sin(a)*9-(active&&!reduced?Math.sin(game.time*3+i)*2:0),2.5,0,7);ctx.fill();}
    ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#192219';ctx.strokeText(active?'포자':'포자 예고',s.x,s.y-rule.radius-8);ctx.fillText(active?'포자':'포자 예고',s.x,s.y-rule.radius-8);
  }
  for (const enemy of game.enemies) {
    const hunt = huntRule(enemy);
    const h=enemy.hunt;
    if (!h || h.age>=hunt.windup+hunt.duration) continue;
    ctx.save();ctx.translate(h.x,h.y);ctx.rotate(h.angle);
    ctx.lineCap='butt';
    ctx.setLineDash(h.age<hunt.windup?[7,5]:[]);
    ctx.beginPath();ctx.moveTo(0,-hunt.width/2);ctx.lineTo(hunt.length,-hunt.width/2);ctx.moveTo(0,hunt.width/2);ctx.lineTo(hunt.length,hunt.width/2);warningStroke(ctx,'#f8c986');ctx.setLineDash([]);
    const tip=hunt.length*Math.min(1,h.age/hunt.windup);
    ctx.beginPath();ctx.moveTo(tip-10,-7);ctx.lineTo(tip,0);ctx.lineTo(tip-10,7);warningStroke(ctx,'#f8c986');ctx.restore();
  }
  ctx.restore();
}
