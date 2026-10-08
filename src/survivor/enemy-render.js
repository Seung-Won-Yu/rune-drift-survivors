import { GIANT, sporeRule, huntRule } from './enemies.js';
import { BOSS } from './boss.js';
import { SLAM } from './game.js';

function warningStroke(ctx, color, width = 2) {
  ctx.strokeStyle = '#15231fee'; ctx.lineWidth = width + 4; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function quietBoundary(ctx, color) {
  ctx.strokeStyle = '#15231f'; ctx.lineWidth = 3.5; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
}

export function drawEnemyGround(ctx, game) {
  ctx.save();
  for (const s of game.spores) {
    const rule = sporeRule(s);
    const active=s.age>=rule.windup;
    ctx.fillStyle=active?'#b8a16b28':'#b6a06d12';
    ctx.beginPath();ctx.arc(s.x,s.y,rule.radius,0,Math.PI*2);ctx.fill();
  }
  for (const enemy of game.enemies) {
    const hunt = huntRule(enemy);
    if (enemy.hunt && enemy.hunt.age < hunt.windup) {
      ctx.save(); ctx.translate(enemy.hunt.x, enemy.hunt.y); ctx.rotate(enemy.hunt.angle);
      ctx.strokeStyle = '#c6a5741c'; ctx.lineWidth = hunt.width; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hunt.length, 0); ctx.stroke(); ctx.restore();
    }
    if (enemy.slam && !enemy.slam.hit) {
      const rule = enemy.elite ? SLAM : GIANT;
      const progress = Math.min(1, enemy.slam.age / rule.windup);
      ctx.fillStyle = `rgba(207, 126, 78, ${.045 + progress * .085})`; ctx.beginPath();
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
export function drawEnemyWarnings(ctx, game, reduced) {
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
      // One honest footprint. The club pose supplies anticipation; the impact
      // itself supplies the connection, without text, crosshair or tether.
      ctx.beginPath(); ctx.arc(slam.x, slam.y, rule.radius, 0, Math.PI * 2); quietBoundary(ctx, '#d8ab86');
    }
  }
  for (const s of game.spores) {
    const rule = sporeRule(s);
    const active=s.age>=rule.windup;
    ctx.beginPath();ctx.arc(s.x,s.y,rule.radius,0,Math.PI*2);quietBoundary(ctx,active?'#9cb786':'#9aab7e');
    ctx.fillStyle=active?'#d3c992':'#9aab7e';
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;ctx.beginPath();ctx.arc(s.x+Math.cos(a)*12,s.y+Math.sin(a)*9-(active&&!reduced?Math.sin(game.time*3+i)*2:0),2.5,0,7);ctx.fill();}
  }
  for (const enemy of game.enemies) {
    const hunt = huntRule(enemy);
    const h=enemy.hunt;
    if (!h || h.age<hunt.windup || h.age>=hunt.windup+hunt.duration || reduced) continue;
    // Once launched, a short wake follows the actual hound. The full lane is
    // no longer painted over the action; its crouch and floor cue warned first.
    ctx.save();ctx.translate(enemy.x,enemy.y-12);ctx.rotate(h.angle);
    ctx.strokeStyle='#ddc397a0';ctx.lineWidth=2;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-30,-5);ctx.lineTo(-10,-5);ctx.moveTo(-25,5);ctx.lineTo(-8,5);ctx.stroke();ctx.restore();
  }
  ctx.restore();
}
