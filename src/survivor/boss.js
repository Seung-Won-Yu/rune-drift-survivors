// Boss patterns use world-space geometry shared by combat and rendering.
export const BOSS = {
  arrival: 240,
  hp: 3200,
  radius: 34,
  size: 174,
  speed: 44,
  entrance: 1.4,
  windup: 1,
  recovery: .8,
  cooldown: 2.6,
  chargeLength: 270,
  chargeWidth: 64,
  chargeDuration: .65,
  chargeDamage: 28,
  thornDamage: 16,
  thornSpeed: 150,
  thornRadius: 8,
  maxThorns: 96
};
export function bossAttackLabel(boss) {
  if (!boss) return '';
  if (boss.entrance > 0) return '재의 군주가 깨어납니다';
  if (!boss.pattern) return boss.hp <= boss.maxHp / 2 ? '격노 · 다음 공격 대비' : '다음 공격 대비';
  if (boss.pattern.age >= BOSS.windup) return boss.pattern.kind === 'charge' && boss.pattern.age < BOSS.windup + BOSS.chargeDuration ? '돌진 중 · 경로에서 벗어나세요' : '공격 후 빈틈';
  return boss.pattern.kind === 'charge' ? '돌진 예고 · 선 옆으로 피하세요' : '가시 예고 · 탄 사이로 이동하세요';
}
export function updateBoss(game, boss, dt, hurt, effect) {
  if (boss.entrance > 0) {
    boss.entrance = Math.max(0, boss.entrance - dt);
    return;
  }
  const p = game.player;
  const dx = p.x - boss.x,
    dy = p.y - boss.y,
    distance = Math.hypot(dx, dy) || 1;
  boss.enraged = boss.hp <= boss.maxHp / 2;
  boss.attackClock -= dt;
  if (!boss.pattern && boss.attackClock <= 0 && distance < 430) {
    const kind = boss.attackIndex++ % 2 === 0 ? 'charge' : 'thorns';
    boss.pattern = {
      kind,
      x: boss.x,
      y: boss.y,
      angle: Math.atan2(dy, dx),
      age: 0,
      fired: false
    };
    game.events.push('boss-warning');
  }
  const pattern = boss.pattern;
  if (!pattern) {
    const speed = distance > 180 ? BOSS.speed : 0;
    boss.x += dx / distance * speed * dt;
    boss.y += dy / distance * speed * dt;
    return;
  }
  const previousAge = pattern.age;
  pattern.age += dt;
  if (pattern.age < BOSS.windup) return;
  if (pattern.kind === 'charge') {
    const progress = Math.min(1, (pattern.age - BOSS.windup) / BOSS.chargeDuration);
    boss.x = pattern.x + Math.cos(pattern.angle) * BOSS.chargeLength * progress;
    boss.y = pattern.y + Math.sin(pattern.angle) * BOSS.chargeLength * progress;
    if (previousAge < BOSS.windup + BOSS.chargeDuration && Math.hypot(p.x - boss.x, p.y - boss.y) < BOSS.chargeWidth / 2 + 12) hurt(game, BOSS.chargeDamage, 'charge');
    if (!pattern.fired) {
      pattern.fired = true;
      game.events.push('boss-charge');
    }
  } else if (!pattern.fired) {
    pattern.fired = true;
    const count = boss.enraged ? 11 : 7;
    for (let i = 0; i < count && game.thorns.length < BOSS.maxThorns; i++) {
      const angle = pattern.angle + (i - (count - 1) / 2) * .24;
      game.thorns.push({
        x: boss.x,
        y: boss.y,
        vx: Math.cos(angle) * BOSS.thornSpeed,
        vy: Math.sin(angle) * BOSS.thornSpeed,
        age: 0,
        life: 3.8
      });
    }
    effect(game, {
      kind: 'boss-cast',
      x: boss.x,
      y: boss.y,
      life: .4
    });
    game.events.push('boss-thorns');
  }
  const duration = BOSS.windup + (pattern.kind === 'charge' ? BOSS.chargeDuration : 0) + BOSS.recovery;
  if (pattern.age >= duration) {
    boss.pattern = null;
    boss.attackClock = BOSS.cooldown * (boss.enraged ? .7 : 1);
  }
}
export function updateThorns(game, dt, hurt) {
  for (const thorn of game.thorns) {
    thorn.age += dt;
    thorn.life -= dt;
    thorn.x += thorn.vx * dt;
    thorn.y += thorn.vy * dt;
    if (thorn.life > 0 && Math.hypot(thorn.x - game.player.x, thorn.y - game.player.y) < BOSS.thornRadius + 12) {
      hurt(game, BOSS.thornDamage, 'thorns');
      thorn.life = 0;
      if (game.phase === 'ended') return;
    }
  }
  game.thorns = game.thorns.filter(t => t.life > 0);
}
