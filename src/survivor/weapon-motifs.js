// Fixed, compact engravings on existing attacks. No particles, clocks or randomness.
// The geometry is also static when the player asks for reduced motion.
export function drawWeaponMotif(ctx, key, reach = 14) {
  if (!['dawn', 'comet', 'lunar'].includes(key)) return;
  const r = Number.isFinite(reach) ? Math.max(6, Math.min(24, reach)) : 14;
  ctx.save();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = key === 'dawn' ? '#fff0c0' : key === 'comet' ? '#ffe4b3' : '#e0fff0';
  ctx.beginPath();
  if (key === 'dawn') {
    // A sword point and two short rays; no circle that resembles a danger zone.
    ctx.moveTo(-r * .6, 0); ctx.lineTo(r, 0);
    ctx.moveTo(r * .5, -4); ctx.lineTo(r, 0); ctx.lineTo(r * .5, 4);
    ctx.moveTo(-r * .3, -7); ctx.lineTo(r * .1, -5);
    ctx.moveTo(-r * .3, 7); ctx.lineTo(r * .1, 5);
  } else if (key === 'comet') {
    // A faceted head with a short split tail.
    ctx.moveTo(r * .45, -6); ctx.lineTo(r, 0); ctx.lineTo(r * .45, 6);
    ctx.lineTo(0, 0); ctx.closePath();
    ctx.moveTo(-r, -5); ctx.lineTo(-r * .2, -2);
    ctx.moveTo(-r * .8, 5); ctx.lineTo(-r * .2, 2);
  } else {
    // An open crescent, keeping the chosen guard/star rune silhouette visible.
    ctx.arc(0, 0, r * .6, .7, Math.PI * 2 - .7);
    ctx.moveTo(r * .46, -r * .39);
    ctx.quadraticCurveTo(-r * .35, 0, r * .46, r * .39);
    ctx.moveTo(r * .7, -3); ctx.lineTo(r * .9, 0); ctx.lineTo(r * .7, 3);
  }
  ctx.stroke();
  ctx.restore();
}
