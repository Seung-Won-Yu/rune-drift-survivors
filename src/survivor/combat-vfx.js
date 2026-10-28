// Action marks follow actual attack events and projectile velocities. They are
// shaped like attacks rather than diagrams of damage ranges.
export function actionEffectFrame(effect, game) {
  const age = effect.age + (game.outcome ? game.endAge ?? 0 : 0);
  if (age >= effect.life) return null;
  const displaced = effect.kind === 'ember-launch' && (game.swing || game.player?.hurt > 0 || game.outcome === 'defeat');
  return age === effect.age && !displaced ? effect : { ...effect, age, ...(displaced ? { character: null } : {}) };
}

export function drawLaunch(ctx, effect, reduced = false) {
  const fade = Math.max(0, 1 - effect.age / effect.life);
  if (!fade) return;
  const reach = reduced ? 13 : 12 + fade * (effect.empowered ? 9 : 5);
  ctx.save(); ctx.globalAlpha = fade;
  // A small hand-front flash joins the release pose to the already emitted shot.
  const flask = effect.character === 'ember';
  ctx.translate(effect.x + (flask ? effect.facing * 35 : Math.cos(effect.angle) * 26), effect.y + (flask ? -46 : -32 + Math.sin(effect.angle) * 12));
  ctx.rotate(effect.angle);
  ctx.fillStyle = '#e5a252'; ctx.strokeStyle = '#543723'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(reach, 0); ctx.lineTo(-5, 5); ctx.lineTo(0, 0); ctx.closePath(); ctx.stroke(); ctx.fill();
  ctx.strokeStyle = '#fff4cf'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(reach - 3, 0);
  if (effect.evolved) { ctx.moveTo(-3, -7); ctx.lineTo(5, -4); ctx.moveTo(-3, 7); ctx.lineTo(5, 4); }
  ctx.stroke(); ctx.restore();
}

export function drawRuneTouch(ctx, effect, reduced = false) {
  const fade = Math.max(0, 1 - effect.age / effect.life);
  const reach = reduced ? 10 : 8 + (1 - fade) * 7;
  ctx.save(); ctx.globalAlpha = fade; ctx.translate(effect.x, effect.y - 12); ctx.rotate(effect.angle);
  ctx.strokeStyle = effect.branch === 'horizon' ? '#dceaff' : '#d9fff0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-reach, -4); ctx.lineTo(-3, -7); ctx.lineTo(4, -4);
  ctx.moveTo(-reach + 3, 5); ctx.lineTo(-2, 8); ctx.lineTo(6, 4); ctx.stroke();
  ctx.fillStyle = '#fff6d6'; ctx.fillRect(-2, -2, 4, 4); ctx.restore();
}

export function drawFinish(ctx, effect, reduced = false) {
  const progress = Math.max(0, Math.min(1, effect.age / effect.life));
  const motion = reduced ? .45 : progress;
  ctx.save(); ctx.translate(effect.x, effect.y); ctx.rotate(effect.angle);
  ctx.lineCap = 'round'; ctx.lineWidth = 2;
  if (effect.source === 'sword') {
    const reach = 18 + motion * 10;
    ctx.strokeStyle = '#ffe0a0'; ctx.beginPath(); ctx.moveTo(-reach, -reach * .4); ctx.lineTo(reach, reach * .4); ctx.stroke();
    ctx.strokeStyle = '#fff7dc'; ctx.beginPath(); ctx.moveTo(-7, -10); ctx.lineTo(7, 10); ctx.stroke();
  } else if (effect.source === 'ember') {
    for (const sign of [-1, 1]) {
      const x = sign * (7 + motion * 9), y = -motion * 9;
      ctx.fillStyle = '#e59a5c'; ctx.beginPath(); ctx.moveTo(x - 3, y + 3); ctx.quadraticCurveTo(x - 7, y, x + sign * 6, y - 8); ctx.quadraticCurveTo(x + 5, y, x + 3, y + 3); ctx.fill();
      ctx.fillStyle = '#fff0b5'; ctx.fillRect(x - 1, y, 2, 3);
    }
  } else if (effect.source === 'orbit') {
    const r = 16 * (1 - motion * .55);
    ctx.strokeStyle = '#bbefdc'; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(0, -r * .7); ctx.lineTo(r, 0); ctx.lineTo(0, r * .7); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#f0ffe6'; ctx.fillRect(-2, -2, 4, 4);
  }
  // Three directional chips punctuate a confirmed kill; no extra effect slots.
  if (['sword', 'ember', 'orbit'].includes(effect.source)) {
    ctx.fillStyle = effect.source === 'orbit' ? '#c9f7df' : '#ffe0a0';
    for (let i = -1; i <= 1; i++) {
      const x = 12 + motion * (18 - Math.abs(i) * 4), y = i * (8 + motion * 13);
      ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 3, y - 2); ctx.lineTo(x, y + 2); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

export function drawSlash(ctx, effect, reduced = false) {
  const progress = Math.max(0, Math.min(1, effect.age / effect.life));
  const reach = Math.min(270, effect.range * .94);
  ctx.save(); ctx.translate(effect.x, effect.y - 28); ctx.rotate(effect.angle);
  ctx.fillStyle = effect.empowered || effect.evolved ? '#fff0c5' : '#edc17d';
  if (effect.precise) {
    const side = effect.direction ?? 1;
    const tip = reach * (reduced ? 1 : .86 + Math.min(1, progress * 3) * .14);
    ctx.beginPath(); ctx.moveTo(18, -side * 10);
    ctx.quadraticCurveTo(tip * .52, -side * 17, tip, side * 8);
    ctx.lineTo(tip - 12, -side * 2);
    ctx.quadraticCurveTo(tip * .48, -side * 9, 18, -side * 10);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff9e0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tip * .5, -side * 10);
    ctx.quadraticCurveTo(tip * .76, -side * 6, tip - 3, side * 6); ctx.stroke();
  } else if (effect.branch === 'duelist') {
    const tip = reach * (reduced ? 1 : .78 + Math.min(1, progress * 3) * .22);
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(tip - 12, -5); ctx.lineTo(tip, 0); ctx.lineTo(tip - 12, 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff9e0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(tip - 4, 0); ctx.stroke();
  } else {
    const spread = Math.min(2.3, effect.halfAngle ?? (effect.branch === 'sweep' ? 2.3 : 1.28));
    const head = reduced ? .42 : -spread + Math.min(1, progress * 2.5) * spread * 2;
    const tail = head - (effect.branch === 'sweep' ? 1.22 : .95);
    const thickness = (effect.empowered ? 24 : effect.evolved ? 19 : 15) * (1 - progress * .65);
    ctx.beginPath();
    ctx.arc(0, 0, reach, tail, head);
    ctx.quadraticCurveTo(Math.cos(head) * (reach - thickness * 1.8), Math.sin(head) * (reach - thickness * 1.8), Math.cos(tail) * (reach - 2), Math.sin(tail) * (reach - 2));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff8df'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, reach - 1, head - .42, head); ctx.stroke();
    if (!reduced) {
      // Separated cut ribbons have air between them instead of a filled sector.
      ctx.strokeStyle = '#dba655a0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, reach - 13, tail - .12, head - .24); ctx.stroke();
      ctx.strokeStyle = '#fff2c5'; ctx.lineWidth = 3 * (1 - progress) + .5;
      ctx.beginPath(); ctx.arc(0, 0, reach - 7, head - .24, head - .06); ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawProjectile(ctx, shot, reduced = false, evolved = false) {
  const angle = Math.atan2(shot.vy, shot.vx), crescent = shot.kind === 'crescent', rune = shot.kind === 'rune-burst';
  const age = Math.max(0, (rune ? .65 : shot.kind === 'ember-splinter' ? .6 : crescent ? shot.turnAt ? 1.4 : .85 : 2) - shot.life);
  const speed = Math.hypot(shot.vx, shot.vy);
  const wake = Math.min(shot.charged ? 92 : 62, speed * .2, speed * age);
  ctx.save(); ctx.translate(shot.x, shot.y - (crescent ? 8 : 14)); ctx.rotate(angle);
  if (!reduced && wake > 12) {
    ctx.strokeStyle = rune ? '#8eead8b0' : crescent ? '#e9c17c70' : evolved ? '#ffb767b0' : '#edac607d';
    ctx.lineCap = 'round';
    // The shot clock freezes with gameplay. Only the trailing edge flickers.
    for (let i = 0; i < 2; i++) {
      const x = -wake * (1 + i * .32), side = i ? 1 : -1;
      const y = side * (crescent ? 12 : 4) + Math.sin(age * 44 + i * 2) * 1.4;
      ctx.lineWidth = i ? 1.5 : 2.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + wake * .38, y - side * 2); ctx.stroke();
    }
  }
  if (rune) {
    ctx.fillStyle='#93e5d8';ctx.strokeStyle='#244e46';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(0,-12);ctx.lineTo(-14,0);ctx.lineTo(0,12);ctx.closePath();ctx.stroke();ctx.fill();
    ctx.strokeStyle='#ecfff2';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(14,0);ctx.moveTo(0,-7);ctx.lineTo(0,7);ctx.stroke();
  } else if (crescent) {
    const reach = shot.charged ? 34 : 25;
    if (!reduced) {
      ctx.strokeStyle = '#d9b27190'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-25, -9); ctx.lineTo(-3, -15); ctx.moveTo(-21, 10); ctx.lineTo(-2, 15); ctx.stroke();
    }
    ctx.fillStyle = shot.returning ? '#fff0c5' : '#f3c983'; ctx.strokeStyle = '#493b28'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-2, -reach); ctx.quadraticCurveTo(reach * 1.26, 0, -2, reach);
    ctx.quadraticCurveTo(reach * .48, 0, -2, -reach); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.strokeStyle = '#fffbed'; ctx.lineWidth = shot.charged ? 4 : 2.5; ctx.beginPath(); ctx.moveTo(1, -reach * .74); ctx.quadraticCurveTo(reach * .96, 0, 1, reach * .74); ctx.stroke();
  } else {
    const size = shot.kind === 'ember-splinter' ? 6 : shot.empowered ? 13 : shot.blast ? 11 : 8;
    const tail = reduced ? 16 : (shot.blast ? 46 : 34) + Math.sin(age * 44) * 2;
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

// Follow a short section of the actual orbit, always behind its moving head.
// This is a wake for each rune, never a ring around the character.
export function drawOrbitWake(ctx, orb, player, reduced = false, evolved = false, horizon = false) {
  if (reduced) return;
  const dx = orb.x - player.x, dy = orb.y - player.y, radius = Math.hypot(dx, dy);
  if (radius < 1) return;
  const angle = Math.atan2(dy, dx), span = Math.min(.36, (evolved ? 45 : 34) / radius);
  ctx.save(); ctx.translate(player.x, player.y - 12);
  ctx.strokeStyle = horizon ? '#b8daff80' : '#a9eed780'; ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const from = angle - span * (1 + i * .9), to = from + span * .68;
    ctx.lineWidth = (evolved ? 6 : 4) - i * 1.5;
    ctx.beginPath(); ctx.moveTo(Math.cos(from) * radius, Math.sin(from) * radius);
    const middle = (from + to) / 2;
    ctx.quadraticCurveTo(Math.cos(middle) * radius, Math.sin(middle) * radius, Math.cos(to) * radius, Math.sin(to) * radius);
    ctx.stroke();
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
  const motion = reduced ? .45 : progress;
  const expansion = 1 - (1 - motion) ** 3;
  const reach = Math.min(120, effect.range * .9) * (.4 + expansion * .6);
  ctx.save(); ctx.translate(effect.x, effect.y - 12);
  const petals = evolved ? 8 : 6;
  for (let i = 0; i < petals; i++) {
    ctx.save(); ctx.rotate(i * Math.PI * 2 / petals + .2);
    ctx.fillStyle = evolved ? (i % 2 ? '#fff0b1' : '#f4b667') : (i % 2 ? '#f4b667' : '#dc8250');
    const tip = reach * (i % 2 ? .78 : 1);
    ctx.beginPath(); ctx.moveTo(3, -4); ctx.quadraticCurveTo(tip * .5, -12 * (1 - motion), tip, 0);
    ctx.quadraticCurveTo(tip * .6, 8 * (1 - motion), 3, 4); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = evolved ? '#fffdf0' : '#fff0b1'; ctx.beginPath();
  if (evolved) {
    const core = 4 + 17 * (1 - expansion);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4, radius = i % 2 ? core * .35 : core;
      if (i) ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.moveTo(radius, 0);
    }
    ctx.closePath();
  } else ctx.ellipse(0, 0, 3 + 12 * (1 - expansion), 2 + 9 * (1 - expansion), 0, 0, Math.PI * 2);
  ctx.fill();
  // Hot chips outlive the core for a brief burst → breakup rhythm.
  ctx.fillStyle = '#ffd890';
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI * 2 / 3 + .4, distance = reach + 5 + motion * 12;
    const x = Math.cos(angle) * distance, y = Math.sin(angle) * distance - Math.sin(motion * Math.PI) * 10;
    ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x, y - 4); ctx.lineTo(x + 2, y + 2); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
