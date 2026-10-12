// Presentation only. All marks read simulation clocks and use bounded geometry.
// Draw before enemy warnings so visual polish cannot hide a damaging telegraph.
import { IMPACT_LIFE } from './impact.js';

const MATERIALS = [
  { light: '#f6dfb4', chip: '#b9768b' }, // soft cap and pale spores
  { light: '#e8c2a0', chip: '#a66846' }, // fur and a short scratch
  { light: '#d9c694', chip: '#78834e' }, // bark and moss
  { light: '#f5e6bf', chip: '#b87270' }  // ivory mask and dry mantle leaves
];
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

export function drawMaterialHit(ctx, enemy, time, reduced, detailed = true) {
  if (!enemy.impact) return;
  const age = time - enemy.impact.at;
  if (age < 0 || age >= IMPACT_LIFE) return;
  const kind = enemy.boss ? 3 : enemy.type, material = MATERIALS[kind] ?? MATERIALS[0];
  const progress = age / IMPACT_LIFE, fade = 1 - progress;
  ctx.save(); ctx.translate(enemy.x, enemy.y - enemy.size * (enemy.boss ? .64 : .38));
  ctx.rotate((enemy.impact.angle ?? 0) + .6); ctx.globalAlpha = .85 * fade;
  ctx.strokeStyle = '#253029'; ctx.lineWidth = 4; ctx.beginPath();
  if (kind === 3) { ctx.moveTo(-7, -5); ctx.lineTo(-1, -1); ctx.lineTo(-3, 4); ctx.lineTo(5, 7); }
  else { ctx.moveTo(-10, -3); ctx.lineTo(10, 3); }
  ctx.stroke(); ctx.strokeStyle = material.light; ctx.lineWidth = 1.6; ctx.stroke();
  // Reduced motion retains a brief static glint. Distant crowded actors use
  // the same mark with no fragments, keeping the per-hit work bounded.
  if (reduced || !detailed) { ctx.restore(); return; }
  ctx.strokeStyle = '#263127'; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const angle = (i - 1) * .7, distance = 5 + progress * (11 + i * 3);
    const x = Math.cos(angle) * distance, y = Math.sin(angle) * distance - Math.sin(progress * Math.PI) * 4;
    ctx.save(); ctx.translate(x, y); ctx.rotate(i + progress * 1.8);
    ctx.fillStyle = i === 1 ? material.light : material.chip; ctx.beginPath();
    if (kind === 0 && i === 1) ctx.ellipse(0, 0, 2.4, 1.7, 0, 0, Math.PI * 2);
    else if (kind === 1) { ctx.moveTo(-3, -1); ctx.lineTo(3, 0); ctx.lineTo(-2, 2); }
    else if (kind === 2) { ctx.moveTo(-2, -4); ctx.lineTo(3, -1); ctx.lineTo(1, 4); ctx.lineTo(-3, 1); }
    else { ctx.moveTo(-3, -2); ctx.lineTo(3, 0); ctx.lineTo(-1, 3); }
    ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}

export function drawChampionCrest(ctx, enemy) {
  if (!enemy.champion) return;
  const tone = {root:'#c9d990',fang:'#f3b77b',bloom:'#e6b4db'}[enemy.champion] ?? '#f0ce8a';
  ctx.save(); ctx.translate(enemy.x, enemy.y - enemy.size * .69 - 25);
  ctx.fillStyle = tone; ctx.strokeStyle = '#1d3028'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-10, 3); ctx.lineTo(-12, -4); ctx.lineTo(-5, -1); ctx.lineTo(0, -9); ctx.lineTo(5, -1); ctx.lineTo(12, -4); ctx.lineTo(10, 3); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
}
