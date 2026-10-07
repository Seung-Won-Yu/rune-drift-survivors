// The same rules drive collision and warning geometry through huntRule/sporeRule.
export const CHAMPIONS = [
  { at: 60, id: 'root', type: 2, name: '뿌리 파수꾼', hp: 580, speed: 40, tip: '찍힐 자리를 벗어난 뒤 접근하세요' },
  { at: 120, id: 'fang', type: 1, name: '가시 송곳니', hp: 730, speed: 82, tip: '돌진선을 옆으로 피하고 빈틈을 노리세요' },
  { at: 180, id: 'bloom', type: 0, name: '포자 왕관', hp: 930, speed: 37, tip: '포자 꽃 사이의 빈 땅으로 이동하세요' }
];
export const CHAMPION_HUNT = { windup: 1, duration: .48, recovery: 1, cooldown: 4, length: 225, width: 42, damage: 21, limit: 2 };
export const CHAMPION_SPORE = { radius: 44, windup: 1.1, active: 1.3, damage: 12 };
export function updateChampionBloom(game, enemy, dt) {
  if (enemy.champion !== 'bloom') return false;
  enemy.bloomClock -= dt;
  if (enemy.bloomClock <= 0 && game.spores.length <= 1 && Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y) < 360 && game.enemies.filter(e => e.hp > 0 && (e.hunt || e.slam)).length < 3) {
    const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x) + Math.PI / 2;
    for (const offset of [-140, 0, 140]) game.spores.push({ x: game.player.x + Math.cos(angle) * offset, y: game.player.y + Math.sin(angle) * offset, age: 0, royal: true });
    enemy.bloomClock = 5; enemy.bloomUntil = game.time + 1.6;
    enemy.knockX = enemy.knockY = 0;
    game.events.push('warning');
  }
  return game.time < enemy.bloomUntil;
}
export function championStatus(game) {
  const active = game.enemies.find(e => e.champion && e.hp > 0);
  if (active) {
    const angle = Math.atan2(active.y - game.player.y, active.x - game.player.x);
    const direction = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][(Math.round(angle / (Math.PI / 4)) + 8) % 8];
    return `${direction} ${active.name}`;
  }
  const next = CHAMPIONS.find(c => c.at >= game.nextElite && c.at - game.time <= 10);
  return next ? `${next.name} · ${Math.max(0, Math.ceil(next.at - game.time))}초` : null;
}
