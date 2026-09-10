export const SPORE = { radius: 32, windup: .7, active: 1.6, damage: 6, limit: 4, interval: .6 };
export const HOUND = { windup: .8, duration: .4, recovery: .65, cooldown: 4.6, length: 150, width: 30, damage: 12, limit: 2 };
export const GIANT = { radius: 62, windup: 1.15, recovery: .85, cooldown: 5.4, damage: 18 };
export const WAVES = [
  { until: 30, name: '숲의 가장자리', mushroom: 1, hound: 0 },
  { until: 90, name: '사냥개의 발소리', mushroom: .7, hound: .3 },
  { until: 150, name: '거인이 깨어난다', mushroom: .65, hound: .25 },
  { until: 210, name: '숲의 추격', mushroom: .5, hound: .35 },
  { until: 240, name: '거인의 행진', mushroom: .5, hound: .25 },
  { until: Infinity, name: '최후의 대결', mushroom: .7, hound: .25 }
];
export const waveAt = time => WAVES.find(w => time < w.until) ?? WAVES.at(-1);
export function enemyTypeAt(time, roll) {
  const wave = waveAt(time);
  return roll < wave.mushroom ? 0 : roll < wave.mushroom + wave.hound ? 1 : 2;
}
export function teachEnemy(game, kind) {
  if (game.enemyLessons.includes(kind)) return;
  game.enemyLessons.push(kind);
  game.events.push(`learn-${kind}`);
}
export function leaveSpores(game, enemy) {
  if (enemy.type !== 0 || enemy.boss || game.time < 18 || game.time < game.nextSpore || game.spores.length >= SPORE.limit) return;
  if (game.spores.some(s => Math.hypot(s.x-enemy.x,s.y-enemy.y) < SPORE.radius * 2 + 6)) return;
  game.spores.push({ x: enemy.x, y: enemy.y, age: 0 });
  game.nextSpore = game.time + SPORE.interval;
  teachEnemy(game, 'spore');
}
export function updateSpores(game, dt, hurt) {
  for (const s of game.spores) {
    s.age += dt;
    if (s.age >= SPORE.windup && s.age < SPORE.windup + SPORE.active && Math.hypot(game.player.x-s.x,game.player.y-s.y) <= SPORE.radius + 12) {
      hurt(game, SPORE.damage, 'spore');
      if (game.phase === 'ended') return;
    }
  }
  game.spores = game.spores.filter(s => s.age < SPORE.windup + SPORE.active);
}
export const activeThreats = game => game.enemies.filter(e => e.hp > 0 && (e.hunt || e.slam)).length;
export function updateHound(game, enemy, dt, hurt) {
  if (enemy.type !== 1 || enemy.elite) return false;
  enemy.huntClock -= dt;
  if (!enemy.hunt && enemy.huntClock <= 0) {
    const d = Math.hypot(enemy.x-game.player.x,enemy.y-game.player.y);
    if (d > 55 && d < 240 && activeThreats(game) < 3 && game.enemies.filter(e=>e.hp>0 && e.hunt).length < HOUND.limit) {
      enemy.hunt = { x: enemy.x, y: enemy.y, angle: Math.atan2(game.player.y-enemy.y,game.player.x-enemy.x), age: 0, hit: false };
      enemy.knockX = enemy.knockY = 0;
      teachEnemy(game, 'hound');
    }
  }
  const hunt = enemy.hunt;
  if (!hunt) return false;
  const before = hunt.age;
  const charging = before >= HOUND.windup && before < HOUND.windup + HOUND.duration;
  hunt.age += dt * (charging && enemy.slowUntil > game.time ? .7 : 1);
  const dash = age => Math.min(1, Math.max(0, (age-HOUND.windup)/HOUND.duration));
  const from = dash(before)*HOUND.length, to = dash(hunt.age)*HOUND.length;
  const c = Math.cos(hunt.angle), s = Math.sin(hunt.angle);
  enemy.x = hunt.x + c*to; enemy.y = hunt.y + s*to;
  if (!hunt.hit && to > from) {
    // Sweep the travelled segment, so a fast dash cannot tunnel through a player.
    const x=game.player.x-hunt.x, y=game.player.y-hunt.y;
    const along=x*c+y*s, across=-x*s+y*c;
    const nearest=Math.max(from,Math.min(to,along));
    if (Math.hypot(along-nearest,across) <= HOUND.width/2+12) {
      hunt.hit=true; hurt(game,HOUND.damage,'hunt');
    }
  }
  if (hunt.age >= HOUND.windup + HOUND.duration + HOUND.recovery) {
    enemy.hunt=null; enemy.huntClock=HOUND.cooldown;
  }
  return true;
}
