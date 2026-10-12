// Small root shards follow live projectiles. Decorative fragments never become
// a second warning area or advance the attack clock.
export function drawBossThorn(ctx, thorn, reduced = false) {
  ctx.save(); ctx.translate(thorn.x, thorn.y); ctx.rotate(Math.atan2(thorn.vy, thorn.vx));
  if (!reduced) {
    ctx.strokeStyle = '#f2b38c66'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-22, 0); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-10, -6); ctx.lineTo(-6, 0); ctx.lineTo(-10, 6); ctx.closePath();
  ctx.strokeStyle = '#271e24'; ctx.lineWidth = 5; ctx.stroke();
  ctx.fillStyle = '#ed9276'; ctx.fill();
  ctx.strokeStyle = '#ffe0b0'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(8, 0); ctx.stroke(); ctx.restore();
}

export function drawBossRelease(ctx, effect, reduced = false) {
  const progress = Math.min(1, effect.age / effect.life), travel = reduced ? 0 : progress * 19;
  ctx.save(); ctx.translate(effect.x, effect.y); ctx.rotate(effect.angle ?? 0);
  ctx.globalAlpha *= 1 - progress; ctx.fillStyle = '#f3bc8e'; ctx.strokeStyle = '#2b2424'; ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.save(); ctx.rotate(i * .24); ctx.beginPath();
    ctx.moveTo(10 + travel, -2); ctx.lineTo(17 + travel, 0); ctx.lineTo(10 + travel, 2); ctx.closePath();
    ctx.stroke(); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
