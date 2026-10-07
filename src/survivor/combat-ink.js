// Presentation only. All marks read simulation clocks and use bounded geometry.
// Draw before enemy warnings so visual polish cannot hide a damaging telegraph.
export function drawFootfall(ctx, game, reduced) {
  const p = game.player;
  if (reduced || !p.moving || game.swing || p.cast > 0 || p.hurt > 0 || game.outcome) return;
  const step = p.walk * 7, age = step % 1;
  if (age > .55) return;
  const side = Math.floor(step) % 2 ? -1 : 1;
  ctx.save(); ctx.translate(p.x - p.facing * age * 15, p.y + 2);
  ctx.globalAlpha = .48 * (1 - age / .55);
  ctx.strokeStyle = game.characterId === 'grove' ? '#b2c5a0' : '#cbbd87';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(side * 10, 0, 4 + age * 13, 1 + age * 4, -.2 * side, .3, Math.PI * 1.4); ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle;
  for (let i = 0; i < 2; i++) {
    const x = side * (13 + i * 4 + age * 8), y = -age * (7 + i * 3);
    ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x + side * 4, y); ctx.lineTo(x, y + 1); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

export function drawHitCut(ctx, enemy, time, reduced) {
  if (reduced || enemy.boss || !enemy.impact) return;
  const age = time - enemy.impact.at;
  if (age < 0 || age > .13) return;
  const fade = 1 - age / .13, reach = (enemy.elite ? 17 : 12) * fade;
  ctx.save(); ctx.translate(enemy.x, enemy.y - enemy.size * .38); ctx.rotate(enemy.impact.angle + .6);
  ctx.globalAlpha = .8 * fade;
  ctx.beginPath(); ctx.moveTo(-reach, -3); ctx.lineTo(reach, 3);
  ctx.strokeStyle = '#334033'; ctx.lineWidth = 5; ctx.stroke();
  ctx.strokeStyle = '#fff1c8'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
}

export function drawChampionCrest(ctx, enemy) {
  if (!enemy.champion) return;
  const tone = {root:'#c9d990',fang:'#f3b77b',bloom:'#e6b4db'}[enemy.champion] ?? '#f0ce8a';
  ctx.save(); ctx.translate(enemy.x, enemy.y - enemy.size * .69 - 25);
  ctx.fillStyle = tone; ctx.strokeStyle = '#1d3028'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-10, 3); ctx.lineTo(-12, -4); ctx.lineTo(-5, -1); ctx.lineTo(0, -9); ctx.lineTo(5, -1); ctx.lineTo(12, -4); ctx.lineTo(10, 3); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
}

export function drawSwordRibbon(ctx, effect, progress, reduced) {
  // Follow the authored slash inside its existing range; no new hit/range signal.
  const reach = effect.range * (.88 + progress * .12);
  const edge = effect.halfAngle;
  ctx.save(); ctx.lineCap = 'round';
  if (!reduced) {
    ctx.save();
    ctx.globalAlpha *= .55 * (1 - progress);
    ctx.strokeStyle = effect.empowered ? '#ffe5a3' : '#e3b66b'; ctx.lineWidth = effect.empowered ? 5 : 3;
    ctx.beginPath(); ctx.arc(0, 0, reach * .77, -edge * .82, edge * .86); ctx.stroke();
    ctx.restore();
  }
  // Tapered brush tip gives the ring a visible sweep direction.
  ctx.fillStyle = '#fff4d6';
  ctx.beginPath();
  ctx.moveTo(Math.cos(edge) * reach, Math.sin(edge) * reach);
  ctx.lineTo(Math.cos(edge - .28) * (reach + 3), Math.sin(edge - .28) * (reach + 3));
  ctx.lineTo(Math.cos(edge - .22) * (reach - (effect.empowered ? 15 : 9) * (1 - progress)), Math.sin(edge - .22) * (reach - 9 * (1 - progress)));
  ctx.closePath(); ctx.fill(); ctx.restore();
}
