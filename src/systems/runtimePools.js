import * as THREE from 'three';

export function updateTimedPool(pool, dt, limit, onKeep) {
  let write = 0;
  for (const item of pool) {
    item.life -= dt;
    if (item.life <= 0) continue;
    onKeep?.(item, dt);
    if (write < limit) {
      pool[write] = item;
      write += 1;
    }
  }
  pool.length = write;
}

export function isPoolBelowLimit(pool, limit, overflow = 0) {
  return pool.length < limit + overflow;
}

export function pushDamageNumber(pool, {
  pos,
  value,
  color,
  size = 0.56,
  visualQuality,
  budget,
  loadRatio
}) {
  const isPriority = typeof value === 'string' && /[A-Z가-힣]/.test(value);
  if (!isPriority && visualQuality === 'low' && Math.random() < 0.55) return false;
  if (!isPriority && loadRatio > 1.35 && Math.random() < 0.42) return false;
  if (!isPriority && pool.length >= budget + 8) return false;
  if (pool.length >= budget + 14) pool.length = budget + 8;
  pool.push({
    pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.22, 1.05, (Math.random() - 0.5) * 0.22)),
    value,
    color,
    size,
    age: 0,
    life: 0.58,
    maxLife: 0.58
  });
  return true;
}

export function pushXpGem(pool, pos, value, maxCount) {
  if (pool.length < maxCount) {
    pool.push({
      pos,
      value,
      pulse: Math.random() * Math.PI * 2
    });
    return true;
  }

  const target = pool[Math.floor(Math.random() * pool.length)];
  if (!target) return false;
  target.value += value;
  target.pulse = Math.random() * Math.PI * 2;
  target.pos.lerp(pos, 0.28);
  return true;
}
