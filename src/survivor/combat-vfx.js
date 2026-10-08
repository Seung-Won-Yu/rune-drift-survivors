// Action marks follow actual attack events and projectile velocities. They are
// deliberately compact; these strokes are not diagrams of damage ranges.
export function drawSlash(ctx, effect, reduced = false) {
  const progress = Math.max(0, Math.min(1, effect.age / effect.life));
  const reach = Math.min(effect.branch === 'duelist' ? 88 : 76, 42 + effect.range * .16);
  ctx.save(); ctx.translate(effect.x, effect.y - 28); ctx.rotate(effect.angle);
  ctx.fillStyle = effect.empowered || effect.evolved ? '#fff0c5' : '#edc17d';
  if (effect.branch === 'duelist') {
    const tip = reach * (reduced ? 1 : .78 + Math.min(1, progress * 3) * .22);
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(tip - 12, -5); ctx.lineTo(tip, 0); ctx.lineTo(tip - 12, 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff9e0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(tip - 4, 0); ctx.stroke();
  } else {
    const spread = effect.branch === 'sweep' ? 1.12 : .88;
    const head = reduced ? .42 : -spread + Math.min(1, progress * 2.5) * spread * 2;
    const tail = head - (effect.branch === 'sweep' ? 1.22 : .95);
    const thickness = (effect.empowered ? 13 : 9) * (1 - progress * .65);
    ctx.beginPath();
    ctx.arc(0, 0, reach, tail, head);
    ctx.quadraticCurveTo(Math.cos(head) * (reach - thickness * 1.8), Math.sin(head) * (reach - thickness * 1.8), Math.cos(tail) * (reach - 2), Math.sin(tail) * (reach - 2));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff8df'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, reach - 1, head - .42, head); ctx.stroke();
  }
  ctx.restore();
}

export function drawProjectile(ctx, shot, reduced = false, evolved = false) {
  const angle = Math.atan2(shot.vy, shot.vx), crescent = shot.kind === 'crescent';
  ctx.save(); ctx.translate(shot.x, shot.y - (crescent ? 8 : 14)); ctx.rotate(angle);
  if (crescent) {
    if (!reduced) {
      ctx.strokeStyle = '#d9b27190'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-25, -9); ctx.lineTo(-3, -15); ctx.moveTo(-21, 10); ctx.lineTo(-2, 15); ctx.stroke();
    }
    ctx.fillStyle = '#f3c983'; ctx.strokeStyle = '#493b28'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-2, -23); ctx.quadraticCurveTo(29, 0, -2, 23);
    ctx.quadraticCurveTo(11, 0, -2, -23); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.strokeStyle = '#fff8de'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(1, -17); ctx.quadraticCurveTo(22, 0, 1, 17); ctx.stroke();
  } else {
    const size = shot.empowered ? 8 : shot.blast ? 7 : 5;
    const tail = reduced ? 12 : shot.blast ? 34 : 24;
    // A tapered flame, bright leading core and dark rim survive grass/crowds.
    ctx.fillStyle = shot.blast ? '#ed824b' : '#df9c50'; ctx.strokeStyle = '#583222'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(size + 2, 0);
    ctx.quadraticCurveTo(0, -size * 1.7, -tail, -size * .5);
    ctx.lineTo(-tail * .64, 0); ctx.lineTo(-tail, size * .55);
    ctx.quadraticCurveTo(0, size * 1.7, size + 2, 0); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.fillStyle = '#ffd587'; ctx.beginPath(); ctx.moveTo(size, 0); ctx.quadraticCurveTo(-1, -size, -tail * .6, 0); ctx.quadraticCurveTo(-1, size, size, 0); ctx.fill();
    ctx.fillStyle = evolved ? '#fffdf0' : '#fff5cc'; ctx.beginPath();
    if (evolved) {
      // The evolved flame has a pointed hot core and a split inner tail.
      ctx.moveTo(size + 3, 0); ctx.lineTo(-1, -size * .8); ctx.lineTo(-tail * .75, -size * .55);
      ctx.lineTo(-tail * .34, 0); ctx.lineTo(-tail * .75, size * .55); ctx.lineTo(-1, size * .8); ctx.closePath();
    } else ctx.ellipse(1, 0, size * .67, size * .48, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawSlamImpact(ctx, effect, reduced = false) {
  const progress = Math.max(0, Math.min(1, effect.age / effect.life));
  ctx.save();
  // The ground break appears at the damage instant, joining the club's source
  // to its locked impact point. It never pretends to be a delayed projectile.
  if (Number.isFinite(effect.fromX) && Number.isFinite(effect.fromY)) {
    const dx = effect.x - effect.fromX, dy = effect.y - effect.fromY, length = Math.hypot(dx, dy) || 1;
    ctx.strokeStyle = '#1b231ddd'; ctx.lineWidth = 6 * (1 - progress) + 1;
    ctx.beginPath(); ctx.moveTo(effect.fromX + dx / length * 18, effect.fromY + dy / length * 18);
    for (let i = 1; i <= 5; i++) {
      const offset = i === 5 ? 0 : (i % 2 ? 5 : -5);
      ctx.lineTo(effect.fromX + dx * i / 5 - dy / length * offset, effect.fromY + dy * i / 5 + dx / length * offset);
    }
    ctx.stroke(); ctx.strokeStyle = '#cbaa71'; ctx.lineWidth = 2 * (1 - progress); ctx.stroke();
  }
  ctx.translate(effect.x, effect.y);
  ctx.fillStyle = '#ad875447'; ctx.beginPath(); ctx.ellipse(0, 0, effect.range * .62, effect.range * .3, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 7; i++) {
    const angle = i * Math.PI * 2 / 7;
    const reach = effect.range * (reduced ? .3 : .16 + progress * .44);
    const lift = reduced ? 0 : Math.sin(progress * Math.PI) * (7 + i % 3 * 4);
    const x = Math.cos(angle) * reach, y = Math.sin(angle) * reach * .58 - lift;
    ctx.fillStyle = i % 2 ? '#b9aa80' : '#d8c28d'; ctx.strokeStyle = '#3e422d'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 1, y - 5); ctx.lineTo(x + 5, y - 2); ctx.lineTo(x + 2, y + 3); ctx.closePath(); ctx.stroke(); ctx.fill();
  }
  if (progress < .3) {
    ctx.strokeStyle = '#ffe6ad'; ctx.lineWidth = 3 * (1 - progress / .3);
    ctx.beginPath(); ctx.moveTo(-12, 4); ctx.lineTo(0, -14); ctx.lineTo(11, 4); ctx.stroke();
  }
  ctx.restore();
}

export function drawEmberBurst(ctx, effect, reduced = false, evolved = false) {
  const progress = Math.max(0, Math.min(1, effect.age / effect.life));
  const reach = Math.min(45, effect.range * .55) * (reduced ? .8 : .45 + progress * .55);
  ctx.save(); ctx.translate(effect.x, effect.y - 12);
  const petals = evolved ? 8 : 6;
  for (let i = 0; i < petals; i++) {
    ctx.save(); ctx.rotate(i * Math.PI * 2 / petals + .2);
    ctx.fillStyle = evolved ? (i % 2 ? '#fff0b1' : '#f4b667') : (i % 2 ? '#f4b667' : '#dc8250');
    ctx.beginPath(); ctx.moveTo(3, -4); ctx.quadraticCurveTo(reach * .5, -12 * (1 - progress), reach, 0);
    ctx.quadraticCurveTo(reach * .6, 8 * (1 - progress), 3, 4); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = evolved ? '#fffdf0' : '#fff0b1'; ctx.beginPath();
  if (evolved) {
    const core = 6 + 15 * (1 - progress);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4, radius = i % 2 ? core * .35 : core;
      if (i) ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.moveTo(radius, 0);
    }
    ctx.closePath();
  } else ctx.ellipse(0, 0, 4 + 11 * (1 - progress), 3 + 8 * (1 - progress), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
