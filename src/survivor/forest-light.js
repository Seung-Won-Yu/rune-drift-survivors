// Stationary canopy light lives in world space. Bake it once: no per-frame
// filters, random state, particles, or foreground silhouettes hiding danger.
export function createForestLight() {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 1024;
  const ctx = tile.getContext('2d');
  for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
    ctx.save(); ctx.translate(ox, oy);
    for (const [x, y, rx, ry, angle, tone] of [
      [150, 260, 330, 140, -.65, '#e7d99928'],
      [730, 710, 260, 160, -.65, '#b5cf8b24'],
      [510, 330, 285, 190, -.45, '#102d3242'],
      [70, 850, 225, 180, -.3, '#1028253a']
    ]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(rx, ry);
      const light = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      light.addColorStop(0, tone); light.addColorStop(1, 'transparent');
      ctx.fillStyle = light; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    }
    // Soft leaf shadows tie the illustrated outlines to the moss floor.
    ctx.fillStyle = '#112e2814';
    for (const [x, y, angle] of [[470, 140, -.45], [690, 590, .2], [60, 830, -.2]]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      for (let i = 0; i < 6; i++) for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(side * (18 + i * 2), i * 15, 30 - i * 2, 7, side * -.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  return tile;
}
