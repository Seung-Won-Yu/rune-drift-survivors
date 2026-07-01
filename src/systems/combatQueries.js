export function findNearestEnemies(enemies, origin, limit = 1, maxDistance = Infinity) {
  const maxDistanceSq = maxDistance * maxDistance;
  const best = [];
  for (const enemy of enemies) {
    const distance = enemy.pos.distanceToSquared(origin);
    if (distance > maxDistanceSq) continue;
    let insertAt = best.length;
    while (insertAt > 0 && best[insertAt - 1].distance > distance) insertAt -= 1;
    if (insertAt >= limit) continue;
    best.splice(insertAt, 0, { enemy, distance });
    if (best.length > limit) best.pop();
  }
  return best.map(item => item.enemy);
}
