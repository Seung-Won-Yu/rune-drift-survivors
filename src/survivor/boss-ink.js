// Small root shards follow live projectiles. Decorative fragments never become
// a second warning area or advance the attack clock.
export function drawBossThorn(ctx, thorn, reduced = false) {
  ctx.save(); ctx.translate(thorn.x, thorn.y); ctx.rotate(Math.atan2(thorn.vy, thorn.vx));
  if (!reduced) {
    // A tapered wake trails the actual collision body; no leading tracer.
    const wake = 24 + Math.sin(thorn.age * 12) * 3;
    ctx.fillStyle = '#da805d40'; ctx.beginPath();
    ctx.moveTo(-5, -3); ctx.quadraticCurveTo(-17, -5, -wake, 0);
    ctx.quadraticCurveTo(-17, 4, -5, 3); ctx.closePath(); ctx.fill();
  }
  // Crooked bark, two barbs and an ember seam connect the shot to the monarch.
  // The solid head stays close to the 8px collision radius in every frame.
  ctx.lineJoin = 'round'; ctx.beginPath();
  ctx.moveTo(13, 0); ctx.lineTo(2, -3); ctx.lineTo(-3, -7);
  ctx.lineTo(-3, -3); ctx.lineTo(-9, -4); ctx.lineTo(-6, 0);
  ctx.lineTo(-9, 6); ctx.lineTo(-1, 3); ctx.lineTo(3, 4); ctx.closePath();
  ctx.strokeStyle = '#211d23'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#ac5d49'; ctx.fill();
  ctx.strokeStyle = '#f3c293'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#ffe3ad'; ctx.beginPath();
  ctx.moveTo(11, 0); ctx.lineTo(-4, -1); ctx.lineTo(1, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#643b36'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-6, 3); ctx.lineTo(0, 1); ctx.stroke(); ctx.restore();
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
