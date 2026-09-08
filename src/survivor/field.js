export const RECOVERY = {
  times: [75, 150, 225],
  amount: 25,
  lifetime: 80,
  reach: 25,
  limit: 3
};
export function healPlayer(game, amount, source) {
  const healed = Math.min(amount, Math.max(0, game.player.maxHp - game.player.hp));
  if (healed <= 0) return 0;
  game.player.hp += healed;
  game.healing[source] += healed;
  game.events.push('heal');
  // Healing feedback remains visible even when the combat effect budget is full.
  game.recoveryFlash = {
    amount: healed,
    age: 0
  };
  return healed;
}
export function updateField(game, dt) {
  const p = game.player;
  if (game.recoveryFlash) {
    game.recoveryFlash.age += dt;
    if (game.recoveryFlash.age > .8) game.recoveryFlash = null;
  }
  while (game.nextRecovery < RECOVERY.times.length && game.time >= RECOVERY.times[game.nextRecovery]) {
    // Use a fixed heading per appearance without consuming the combat RNG stream.
    const angle = game.nextRecovery * 2.4 + .6;
    game.nextRecovery++;
    if (game.supplies.length < RECOVERY.limit) {
      game.supplies.push({
        x: p.x + Math.cos(angle) * 115,
        y: p.y + Math.sin(angle) * 115,
        age: 0
      });
      game.events.push('recovery-ready');
    }
  }
  for (const supply of game.supplies) {
    supply.age += dt;
    if (supply.age < RECOVERY.lifetime && p.hp < p.maxHp && Math.hypot(p.x - supply.x, p.y - supply.y) < RECOVERY.reach) {
      healPlayer(game, RECOVERY.amount, 'field');
      supply.collected = true;
    }
  }
  game.supplies = game.supplies.filter(supply => !supply.collected && supply.age < RECOVERY.lifetime);
}
export function nearestRecovery(game) {
  return game.supplies.reduce((nearest, supply) => {
    const distance = Math.hypot(supply.x - game.player.x, supply.y - game.player.y);
    const direction = ['오른쪽', '오른쪽 아래', '아래쪽', '왼쪽 아래', '왼쪽', '왼쪽 위', '위쪽', '오른쪽 위'][(Math.round(Math.atan2(supply.y - game.player.y, supply.x - game.player.x) / (Math.PI / 4)) + 8) % 8];
    return !nearest || distance < nearest.distance ? {
      ...supply,
      distance,
      direction
    } : nearest;
  }, null);
}
