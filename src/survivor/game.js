import { BOSS, updateBoss, updateThorns } from './boss.js';
import { getCharacter } from './characters.js';
import { healPlayer, updateField } from './field.js';
export const RUN_SECONDS = 300;
export const LIMITS = {
  enemies: 160,
  gems: 240,
  shots: 80,
  effects: 120,
  remnants: 32
};
export const xpForLevel = level => level === 1 ? 8 : Math.round(8 + level * 3.7 + Math.max(0, level - 3) ** 2 * 1.3);
export const EVOLUTIONS = {
  dawn: {
    weapon: 'sword',
    support: 'orbit',
    requirement: '검 3 · 룬 1 · 정예 1'
  },
  comet: {
    weapon: 'ember',
    support: 'fleet',
    requirement: '불씨 3 · 발걸음 1 · 정예 1'
  },
  lunar: {
    weapon: 'orbit',
    support: 'vitality',
    requirement: '룬 3 · 심장 1 · 정예 1'
  }
};
export const canEvolve = (game, key = 'dawn') => !!EVOLUTIONS[key] && !game.ranks[key] && game.ranks[EVOLUTIONS[key].weapon] >= 3 && game.ranks[EVOLUTIONS[key].support] >= 1 && game.eliteKills >= 1;
export const weaponName = (game, key) => {
  const evolved = Object.keys(EVOLUTIONS).find(e => EVOLUTIONS[e].weapon === key && game.ranks[e]);
  return UPGRADE_META[evolved ?? key].name;
};
export const swordName = game => weaponName(game, 'sword');
export function nextEvolution(game) {
  return Object.keys(EVOLUTIONS).filter(k => !game.ranks[k]).sort((a, b) => {
    const score = k => Math.min(3, game.ranks[EVOLUTIONS[k].weapon]) + Math.min(1, game.ranks[EVOLUTIONS[k].support]);
    const primary = getCharacter(game.characterId).weapon;
    return score(b) - score(a) || Number(EVOLUTIONS[b].weapon === primary) - Number(EVOLUTIONS[a].weapon === primary);
  })[0] ?? null;
}
export const SLAM = {
  radius: 76,
  windup: .95,
  recovery: .65,
  cooldown: 3.8,
  damage: 24
};
export const UPGRADE_META = {
  dawn: {
    name: '여명의 검',
    icon: 'sword',
    color: '#ffe3a1',
    max: 1,
    kind: '무기 진화',
    description: '넓어진 검격 끝에서 관통하는 초승달 검기를 날립니다.'
  },
  comet: {
    name: '잿불 혜성',
    icon: 'ember',
    color: '#ffb48b',
    max: 1,
    kind: '무기 진화',
    description: '적에게 닿은 불씨가 터져 주변 무리까지 휩씁니다.'
  },
  lunar: {
    name: '월광 고리',
    icon: 'orbit',
    color: '#b6f1e4',
    max: 1,
    kind: '무기 진화',
    description: '룬이 늘어나고 주기적인 파동으로 가까운 적을 밀어냅니다.'
  },
  sword: {
    name: '황동 검',
    icon: 'sword',
    color: '#efbb70',
    max: 6,
    kind: '무기 강화',
    description: '더 넓게 베고, 더 많은 적을 쓰러뜨립니다.'
  },
  ember: {
    name: '추적 불씨',
    icon: 'ember',
    color: '#ff9766',
    max: 5,
    kind: '자동 투사체',
    description: '가까운 적에게 불씨를 날려 먼 거리도 공격합니다.'
  },
  orbit: {
    name: '회전 룬',
    icon: 'orbit',
    color: '#79d4bf',
    max: 5,
    kind: '주변 방어',
    description: '몸 주위를 도는 룬이 접근하는 적을 공격합니다.'
  },
  fleet: {
    name: '가벼운 발걸음',
    icon: 'fleet',
    color: '#b5d08b',
    max: 4,
    kind: '이동',
    description: '무리 사이를 빠져나오고 경험치를 더 빨리 찾아갑니다.'
  },
  magnet: {
    name: '영혼의 손길',
    icon: 'magnet',
    color: '#89c6f1',
    max: 4,
    kind: '수집',
    description: '더 멀리 있는 경험치를 끌어당깁니다.'
  },
  vitality: {
    name: '숲의 심장',
    icon: 'heart',
    color: '#e598a0',
    max: 4,
    kind: '생존',
    description: '최대 체력을 늘리고 체력을 회복합니다.'
  },
  heal: {
    name: '생명의 숨결',
    icon: 'heart',
    color: '#e598a0',
    max: Infinity,
    kind: '회복',
    description: '지친 몸을 회복해 전투를 이어갑니다.'
  }
};
const ENEMY = [{
  name: '버섯 정령',
  hp: 15,
  speed: 42,
  radius: 13,
  size: 64,
  xp: 2,
  damage: 8
}, {
  name: '숲 사냥개',
  hp: 24,
  speed: 95,
  radius: 15,
  size: 72,
  xp: 3,
  damage: 10
}, {
  name: '나무 거인',
  hp: 95,
  speed: 33,
  radius: 22,
  size: 86,
  xp: 8,
  damage: 15
}];
export function seededRandom(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function createGame(seed = 1, characterId = 'ash') {
  const character = getCharacter(characterId);
  return {
    phase: 'ready',
    outcome: null,
    characterId: character.id,
    time: 0,
    level: 1,
    xp: 0,
    xpNeed: 8,
    kills: 0,
    eliteKills: 0,
    player: {
      x: 0,
      y: 0,
      hp: character.hp,
      maxHp: character.hp,
      invincible: 0,
      facing: 1,
      moving: false,
      walk: 0,
      hurt: 0,
      cast: 0
    },
    ranks: {
      sword: 0,
      ember: 0,
      orbit: 0,
      fleet: 0,
      magnet: 0,
      vitality: 0,
      heal: 0,
      dawn: 0,
      comet: 0,
      lunar: 0,
      [character.weapon]: 1
    },
    enemies: [],
    gems: [],
    shots: [],
    thorns: [],
    effects: [],
    events: [],
    choices: [],
    swing: null,
    bossSpawned: false,
    bossDefeated: false,
    supplies: [],
    nextRecovery: 0,
    recoveryFlash: null,
    healing: {
      field: 0,
      elite: 0,
      upgrade: 0
    },
    remnants: [],
    damageTaken: {
      contact: 0,
      slam: 0,
      charge: 0,
      thorns: 0
    },
    lastHurt: null,
    swordClock: 0.2,
    emberClock: 0.8,
    pulseClock: 1.2,
    spawnClock: 0.4,
    nextElite: 60,
    id: 0,
    damageDealt: {
      sword: 0,
      ember: 0,
      orbit: 0
    },
    rng: seededRandom(seed),
    spawnRadius: 370
  };
}
export const stats = game => ({
  speed: getCharacter(game.characterId).speed * (1 + game.ranks.fleet * .08),
  magnet: 64 + game.ranks.magnet * 28,
  swordDamage: 19 + (game.ranks.sword - 1) * 9 + (game.ranks.dawn ? 20 : 0),
  swordRange: 96 + (game.ranks.sword - 1) * 14 + (game.ranks.dawn ? 38 : 0),
  swordHalfAngle: game.ranks.dawn ? 1.92 : 1.28,
  swordCooldown: Math.max(.47, .95 - (game.ranks.sword - 1) * .065),
  emberDamage: 15 + game.ranks.ember * 7 + (game.ranks.comet ? 12 : 0),
  emberCount: 1 + Math.floor(game.ranks.ember / 2),
  orbitDamage: 11 + game.ranks.orbit * 6,
  orbitCount: 1 + Number(game.characterId === 'grove') + Math.floor(game.ranks.orbit / 2) + (game.ranks.lunar ? 1 : 0),
  orbitRadius: 53 + game.ranks.orbit * 7 + (game.ranks.lunar ? 12 : 0)
});
export function upgradeChange(game, key) {
  const rank = game.ranks[key],
    s = stats(game);
  switch (key) {
    case 'dawn':
      return '검 피해 +20 · 범위 +38 · 관통 검기 추가';
    case 'comet':
      return '불씨 피해 +12 · 적중 시 반경 56 폭발';
    case 'lunar':
      return '룬 +1 · 2.8초마다 반경 130 밀어내기';
    case 'sword':
      return rank === 0 ? '새 무기 · 자동 검격' : `피해 ${s.swordDamage} → ${s.swordDamage + 9} · 범위 +14`;
    case 'ember':
      return rank === 0 ? '새 무기 · 추적 불씨 1발' : `피해 ${s.emberDamage} → ${s.emberDamage + 7}${(rank + 1) % 2 === 0 ? ' · 투사체 +1' : ''}`;
    case 'orbit':
      return rank === 0 ? '새 무기 · 회전 룬 1개' : `피해 ${s.orbitDamage} → ${s.orbitDamage + 6}${(rank + 1) % 2 === 0 ? ' · 룬 +1' : ' · 회전 반경 +7'}`;
    case 'fleet':
      return `이동 속도 ${Math.round(s.speed)} → ${Math.round(s.speed + getCharacter(game.characterId).speed * .08)}`;
    case 'magnet':
      return `수집 거리 ${s.magnet} → ${s.magnet + 28}`;
    case 'vitality':
      return `최대 체력 ${game.player.maxHp} → ${game.player.maxHp + 20} · 30 회복`;
    default:
      return '체력 40 회복';
  }
}
export function draftUpgrades(game) {
  const available = Object.keys(UPGRADE_META).filter(k => k !== 'heal' && game.ranks[k] < UPGRADE_META[k].max && (!EVOLUTIONS[k] || canEvolve(game, k)));
  const chosen = Object.keys(EVOLUTIONS).filter(k => canEvolve(game, k)).slice(0, 3);
  // Introduce both alternate weapons early, then leave room to grow the chosen build.
  const unowned = ['sword', 'ember', 'orbit'].filter(key => game.ranks[key] === 0);
  const offers = game.level <= 3 ? unowned : unowned.slice(Math.floor(game.rng() * Math.max(1, unowned.length))).slice(0, 1);
  for (const key of offers) if (chosen.length < 3) chosen.push(key);
  const primary = getCharacter(game.characterId).weapon;
  const recipe = Object.values(EVOLUTIONS).find(path => path.weapon === primary);
  const growth = game.ranks[primary] < UPGRADE_META[primary].max ? primary : game.ranks[recipe.support] === 0 ? recipe.support : null;
  if (growth && chosen.length < 3 && !chosen.includes(growth)) chosen.push(growth);
  const remaining = available.filter(k => !chosen.includes(k) && (game.level <= 3 || !unowned.includes(k)));
  while (chosen.length < 3 && remaining.length) chosen.push(remaining.splice(Math.floor(game.rng() * remaining.length), 1)[0]);
  if (chosen.length < 3) chosen.push('heal');
  return chosen;
}
function checkLevel(game) {
  if (game.xp < game.xpNeed) return;
  game.xp -= game.xpNeed;
  game.level++;
  game.xpNeed = xpForLevel(game.level);
  game.phase = 'upgrade';
  game.choices = draftUpgrades(game);
  game.events.push('level');
}
export function chooseUpgrade(game, key) {
  if (game.phase !== 'upgrade' || !game.choices.includes(key) || game.ranks[key] >= UPGRADE_META[key]?.max) return false;
  game.ranks[key]++;
  if (EVOLUTIONS[key]) game.events.push('evolve');
  if (key === 'vitality') {
    game.player.maxHp += 20;
    healPlayer(game, 30, 'upgrade');
  }
  if (key === 'heal') healPlayer(game, 40, 'upgrade');
  game.choices = [];
  game.phase = 'playing';
  game.player.invincible = Math.max(game.player.invincible, .8);
  game.events.push('choose');
  checkLevel(game);
  return true;
}
export function startGame(game) {
  if (game.phase === 'ready') {
    game.phase = 'playing';
    return true;
  }
  return false;
}
export function pauseGame(game) {
  if (game.phase === 'playing') {
    game.phase = 'paused';
    game.player.moving = false;
    return true;
  }
  return false;
}
export function resumeGame(game) {
  if (game.phase === 'paused') {
    game.phase = 'playing';
    return true;
  }
  return false;
}
function effect(game, value) {
  if (game.effects.length < LIMITS.effects) game.effects.push({
    age: 0,
    life: .45,
    ...value
  });
}
export function spawnEnemy(game, type = 0, elite = false, position) {
  if (game.enemies.length >= LIMITS.enemies) return null;
  const meta = ENEMY[type] ?? ENEMY[0],
    angle = game.rng() * Math.PI * 2,
    radius = game.spawnRadius + game.rng() * 80;
  const hp = meta.hp * (1 + game.time / 270) * (elite ? 5 : 1);
  const enemy = {
    ...meta,
    type,
    elite,
    id: game.id++,
    hp,
    maxHp: hp,
    x: position?.x ?? game.player.x + Math.cos(angle) * radius,
    y: position?.y ?? game.player.y + Math.sin(angle) * radius,
    speed: meta.speed * (1 + game.time / 1200),
    size: meta.size * (elite ? 1.45 : 1),
    radius: meta.radius * (elite ? 1.4 : 1),
    xp: meta.xp * (elite ? 6 : 1),
    damage: meta.damage * (elite ? 1.3 : 1),
    hit: 0,
    orbAt: -100,
    knockX: 0,
    knockY: 0,
    slam: null,
    attackClock: 2.2
  };
  game.enemies.push(enemy);
  if (elite) game.events.push('elite');
  return enemy;
}
export function spawnBoss(game) {
  if (game.bossSpawned) return null;
  // The final encounter must not be skipped when the normal enemy budget is full.
  if (game.enemies.length >= LIMITS.enemies) {
    let farthest = 0;
    for (let i = 1; i < game.enemies.length; i++) if (Math.hypot(game.enemies[i].x - game.player.x, game.enemies[i].y - game.player.y) > Math.hypot(game.enemies[farthest].x - game.player.x, game.enemies[farthest].y - game.player.y)) farthest = i;
    game.enemies.splice(farthest, 1);
  }
  const boss = spawnEnemy(game, 2, false, {
    x: game.player.x + 260,
    y: game.player.y - 70
  });
  Object.assign(boss, {
    boss: true,
    name: '재의 군주',
    hp: BOSS.hp,
    maxHp: BOSS.hp,
    radius: BOSS.radius,
    size: BOSS.size,
    speed: BOSS.speed,
    damage: 18,
    entrance: BOSS.entrance,
    pattern: null,
    attackIndex: 0,
    attackClock: .8,
    enraged: false
  });
  game.bossSpawned = true;
  game.events.push('boss-arrival');
  return boss;
}
function addGem(game, x, y, value) {
  if (game.gems.length < LIMITS.gems) game.gems.push({
    x,
    y,
    value,
    age: 0
  });else {
    let nearest = game.gems[0];
    for (const gem of game.gems) if (Math.hypot(gem.x - x, gem.y - y) < Math.hypot(nearest.x - x, nearest.y - y)) nearest = gem;
    nearest.value += value;
  }
}
function hitEnemy(game, enemy, damage, source, nx = 0, ny = 0) {
  if (enemy.hp <= 0 || enemy.boss && enemy.entrance > 0) return;
  const actual = Math.min(enemy.hp, damage);
  enemy.hp -= damage;
  enemy.hit = .13;
  enemy.knockX += nx * 85;
  enemy.knockY += ny * 85;
  game.damageDealt[source] += actual;
  effect(game, {
    kind: 'damage',
    x: enemy.x,
    y: enemy.y - 24,
    text: Math.round(damage),
    tone: source === 'orbit' ? '#8ee6d4' : '#ffe0a0',
    life: .55
  });
  if (enemy.hp <= 0) {
    if (game.remnants.length >= LIMITS.remnants) game.remnants.shift();
    game.remnants.push({
      x: enemy.x,
      y: enemy.y,
      type: enemy.type,
      boss: !!enemy.boss,
      size: enemy.size,
      flip: enemy.x > game.player.x,
      age: 0,
      life: enemy.boss ? .7 : .26
    });
    game.kills++;
    if (enemy.boss) {
      game.bossDefeated = true;
      game.events.push('boss-defeated');
    }
    if (enemy.elite) game.eliteKills++;
    addGem(game, enemy.x, enemy.y, enemy.xp);
    effect(game, {
      kind: 'pop',
      x: enemy.x,
      y: enemy.y,
      tone: enemy.elite || enemy.boss ? '#efba68' : '#b4c990'
    });
    if (enemy.elite) healPlayer(game, 15, 'elite');
    game.events.push('kill');
  }
}
function nearestEnemy(game, maxDistance = Infinity) {
  let nearest = null,
    d = maxDistance;
  for (const enemy of game.enemies) {
    if (enemy.hp <= 0) continue;
    const next = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
    if (next < d) {
      d = next;
      nearest = enemy;
    }
  }
  return nearest;
}
export function orbitPositions(game) {
  if (!game.ranks.orbit) return [];
  const s = stats(game);
  return Array.from({
    length: s.orbitCount
  }, (_, i) => {
    const a = game.time * 2.8 + i * Math.PI * 2 / s.orbitCount;
    return {
      x: game.player.x + Math.cos(a) * s.orbitRadius,
      y: game.player.y + Math.sin(a) * s.orbitRadius
    };
  });
}
function updateWeapons(game, dt, s) {
  const p = game.player;
  game.swordClock -= dt;
  if (game.ranks.sword && !game.swing && game.swordClock <= 0) {
    const target = nearestEnemy(game, s.swordRange + 25);
    if (target) {
      const angle = Math.atan2(target.y - p.y, target.x - p.x);
      p.facing = Math.cos(angle) >= 0 ? 1 : -1;
      game.swing = {
        age: 0,
        angle,
        hit: false
      };
      game.swordClock = s.swordCooldown;
    }
  }
  if (game.swing) {
    const swing = game.swing;
    swing.age += dt;
    if (swing.age >= .18 && !swing.hit) {
      swing.hit = true;
      game.events.push('swing');
      effect(game, {
        kind: 'slash',
        x: p.x,
        y: p.y,
        angle: swing.angle,
        range: s.swordRange,
        halfAngle: s.swordHalfAngle,
        evolved: !!game.ranks.dawn,
        life: .22
      });
      for (const enemy of game.enemies) {
        const dx = enemy.x - p.x,
          dy = enemy.y - p.y,
          d = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) - swing.angle;
        if (d <= s.swordRange + enemy.radius && Math.cos(angle) > Math.cos(s.swordHalfAngle)) {
          hitEnemy(game, enemy, s.swordDamage, 'sword', dx / (d || 1), dy / (d || 1));
        }
      }
      if (game.ranks.dawn && game.shots.length < LIMITS.shots) {
        const vx = Math.cos(swing.angle),
          vy = Math.sin(swing.angle);
        game.shots.push({
          kind: 'crescent',
          x: p.x + vx * 40,
          y: p.y + vy * 40,
          vx: vx * 330,
          vy: vy * 330,
          life: .85,
          damage: Math.round(s.swordDamage * .65),
          hitIds: []
        });
      }
    }
    if (swing.age > .55) game.swing = null;
  }
  if (game.ranks.ember) {
    game.emberClock -= dt;
    if (game.emberClock <= 0) {
      const targets = game.enemies.filter(e => e.hp > 0).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      if (targets.length) {
        game.emberClock = .9;
        game.events.push('ember-shot');
        p.cast = .4;
        if (!p.moving) p.facing = targets[0].x < p.x ? -1 : 1;
        for (let i = 0; i < s.emberCount && game.shots.length < LIMITS.shots; i++) {
          const target = targets[i % targets.length],
            a = Math.atan2(target.y - p.y, target.x - p.x);
          game.shots.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(a) * 290,
            vy: Math.sin(a) * 290,
            targetId: target.id,
            life: 2,
            damage: s.emberDamage,
            blast: !!game.ranks.comet
          });
        }
      }
    }
  }
  for (const shot of game.shots) {
    const target = game.enemies.find(e => e.id === shot.targetId && e.hp > 0);
    if (target) {
      const a = Math.atan2(target.y - shot.y, target.x - shot.x);
      shot.vx = Math.cos(a) * 290;
      shot.vy = Math.sin(a) * 290;
    }
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life <= 0) continue;
    for (const enemy of game.enemies) {
      const wave = shot.kind === 'crescent';
      if (enemy.hp > 0 && (!wave || !shot.hitIds.includes(enemy.id)) && Math.hypot(shot.x - enemy.x, shot.y - enemy.y) < enemy.radius + (wave ? 22 : 7)) {
        if (shot.blast) {
          effect(game, {
            kind: 'ember-burst',
            x: shot.x,
            y: shot.y,
            range: 56,
            life: .3
          });
          for (const other of game.enemies) if (Math.hypot(other.x - shot.x, other.y - shot.y) <= 56 + other.radius) hitEnemy(game, other, shot.damage, 'ember');
        } else hitEnemy(game, enemy, shot.damage, wave ? 'sword' : 'ember', shot.vx / (wave ? 330 : 290), shot.vy / (wave ? 330 : 290));
        if (wave) {
          shot.hitIds.push(enemy.id);
          if (shot.hitIds.length < 8) continue;
        }
        shot.life = 0;
        break;
      }
    }
  }
  for (const orb of orbitPositions(game)) {
    for (const enemy of game.enemies) {
      if (enemy.hp > 0 && game.time - enemy.orbAt > .4 && Math.hypot(orb.x - enemy.x, orb.y - enemy.y) < enemy.radius + 12) {
        const dx = enemy.x - p.x,
          dy = enemy.y - p.y,
          d = Math.hypot(dx, dy) || 1;
        enemy.orbAt = game.time;
        hitEnemy(game, enemy, s.orbitDamage, 'orbit', dx / d * 1.8, dy / d * 1.8);
        game.events.push('rune-hit');
        if (game.characterId === 'grove' && p.cast <= 0) p.cast = .4;
      }
    }
  }
  if (game.ranks.lunar) {
    game.pulseClock -= dt;
    if (game.pulseClock <= 0) {
      game.pulseClock = 2.8;
      p.cast = .4;
      effect(game, {
        kind: 'lunar-pulse',
        x: p.x,
        y: p.y,
        range: 130,
        life: .35
      });
      game.events.push('pulse');
      for (const enemy of game.enemies) {
        const dx = enemy.x - p.x,
          dy = enemy.y - p.y,
          d = Math.hypot(dx, dy);
        if (d <= 130 + enemy.radius) {
          hitEnemy(game, enemy, Math.round(s.orbitDamage * .6), 'orbit', dx / (d || 1) * 3, dy / (d || 1) * 3);
        }
      }
    }
  }
  game.shots = game.shots.filter(s => s.life > 0);
  game.enemies = game.enemies.filter(e => e.hp > 0);
}
function hurtPlayer(game, damage, source = 'contact') {
  const p = game.player;
  if (p.invincible > 0) return;
  damage *= 1 - getCharacter(game.characterId).armor;
  p.hurt = .24;
  game.damageTaken[source] += Math.min(p.hp, damage);
  game.lastHurt = source;
  p.hp = Math.max(0, p.hp - damage);
  p.invincible = .85;
  game.events.push('hurt');
  effect(game, {
    kind: 'hurt',
    x: p.x,
    y: p.y,
    life: .24
  });
  if (p.hp <= 0) {
    game.phase = 'ended';
    game.outcome = 'defeat';
  }
}
function updateSlam(game, enemy, dt, distance) {
  if (!enemy.elite) return false;
  enemy.attackClock -= dt;
  if (!enemy.slam && enemy.attackClock <= 0 && distance < 220) {
    enemy.slam = {
      x: game.player.x,
      y: game.player.y,
      age: 0,
      hit: false
    };
    enemy.knockX = 0;
    enemy.knockY = 0;
    game.events.push('warning');
  }
  if (!enemy.slam) return false;
  const slam = enemy.slam;
  slam.age += dt;
  if (slam.age >= SLAM.windup && !slam.hit) {
    slam.hit = true;
    game.events.push('slam');
    effect(game, {
      kind: 'slam',
      x: slam.x,
      y: slam.y,
      range: SLAM.radius,
      life: .38
    });
    if (Math.hypot(game.player.x - slam.x, game.player.y - slam.y) <= SLAM.radius + 12) hurtPlayer(game, SLAM.damage, 'slam');
  }
  if (slam.age >= SLAM.windup + SLAM.recovery) {
    enemy.slam = null;
    enemy.attackClock = SLAM.cooldown;
  }
  return true;
}
export function updateGame(game, dt, input = {
  x: 0,
  y: 0
}) {
  if (game.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 1 / 30);
  game.time = Math.min(RUN_SECONDS, game.time + dt);
  const p = game.player,
    s = stats(game),
    length = Math.hypot(input.x, input.y) || 1;
  const ix = (Number.isFinite(input.x) ? input.x : 0) / Math.max(1, length),
    iy = (Number.isFinite(input.y) ? input.y : 0) / Math.max(1, length);
  p.x += ix * s.speed * dt;
  p.y += iy * s.speed * dt;
  p.moving = Math.hypot(ix, iy) > .05;
  if (p.moving) p.walk += dt;
  if (Math.abs(ix) > .05 && !game.swing) p.facing = ix > 0 ? 1 : -1;
  p.invincible = Math.max(0, p.invincible - dt);
  p.hurt = Math.max(0, p.hurt - dt);
  p.cast = Math.max(0, p.cast - dt);
  game.spawnClock -= dt;
  if (game.time >= BOSS.arrival && !game.bossSpawned) spawnBoss(game);
  if (game.spawnClock <= 0) {
    game.spawnClock = game.bossSpawned ? 1.6 : Math.max(.18, .82 - game.time * .002);
    const count = game.bossSpawned ? 1 : game.time > 180 ? 3 : game.time > 70 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const roll = game.rng();
      spawnEnemy(game, game.time > 100 && roll > .83 ? 2 : game.time > 28 && roll > .63 ? 1 : 0);
    }
  }
  if (game.time >= game.nextElite && !game.bossSpawned) {
    spawnEnemy(game, 2, true);
    game.nextElite += 60;
  }
  // Repel only neighbors in adjacent spatial buckets; retain individual silhouettes.
  const buckets = new Map();
  for (const e of game.enemies) {
    const k = `${Math.floor(e.x / 56)},${Math.floor(e.y / 56)}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(e);
  }
  for (const e of game.enemies) {
    const dx = p.x - e.x,
      dy = p.y - e.y,
      d = Math.hypot(dx, dy) || 1;
    let pushX = 0,
      pushY = 0;
    if (e.boss) {
      updateBoss(game, e, dt, hurtPlayer, effect);
      e.hit = Math.max(0, e.hit - dt);
      if (game.phase === 'ended') return;
      continue;
    }
    const attacking = updateSlam(game, e, dt, d);
    if (game.phase === 'ended') return;
    const gx = Math.floor(e.x / 56),
      gy = Math.floor(e.y / 56);
    for (let x = gx - 1; x <= gx + 1; x++) for (let y = gy - 1; y <= gy + 1; y++) for (const other of buckets.get(`${x},${y}`) ?? []) {
      if (e === other) continue;
      const ox = e.x - other.x,
        oy = e.y - other.y,
        od = Math.hypot(ox, oy),
        min = (e.radius + other.radius) * .85;
      if (od > 0 && od < min) {
        pushX += ox / od * (min - od) * 3;
        pushY += oy / od * (min - od) * 3;
      }
    }
    if (!attacking) {
      e.x += (dx / d * e.speed + pushX + e.knockX) * dt;
      e.y += (dy / d * e.speed + pushY + e.knockY) * dt;
    }
    e.knockX *= Math.exp(-12 * dt);
    e.knockY *= Math.exp(-12 * dt);
    e.hit = Math.max(0, e.hit - dt);
    // Distant enemies return outside the active ring rather than consuming all slots.
    if (d > 1200) {
      const a = game.rng() * Math.PI * 2;
      e.x = p.x + Math.cos(a) * game.spawnRadius;
      e.y = p.y + Math.sin(a) * game.spawnRadius;
    }
    if (!attacking && Math.hypot(p.x - e.x, p.y - e.y) < e.radius + 12) {
      hurtPlayer(game, e.damage);
      if (game.phase === 'ended') return;
    }
  }
  updateThorns(game, dt, hurtPlayer);
  if (game.phase === 'ended') return;
  updateWeapons(game, dt, s);
  if (game.bossDefeated) {
    game.phase = 'ended';
    game.outcome = 'victory';
    game.thorns = [];
    return;
  }
  updateField(game, dt);
  game.remnants.forEach(remnant => remnant.age += dt);
  game.remnants = game.remnants.filter(remnant => remnant.age < remnant.life);
  for (const gem of game.gems) {
    gem.age += dt;
    const dx = p.x - gem.x,
      dy = p.y - gem.y,
      d = Math.hypot(dx, dy);
    if (d < s.magnet) {
      const step = Math.min(d, (220 + (s.magnet - d) * 5) * dt);
      gem.x += dx / (d || 1) * step;
      gem.y += dy / (d || 1) * step;
    }
    if (Math.hypot(p.x - gem.x, p.y - gem.y) < 16) {
      game.xp += gem.value;
      gem.collected = true;
      game.events.push('xp');
    }
  }
  game.gems = game.gems.filter(g => !g.collected);
  game.effects.forEach(e => e.age += dt);
  game.effects = game.effects.filter(e => e.age < e.life);
  if (game.time >= RUN_SECONDS) {
    game.phase = 'ended';
    game.outcome = 'survived';
    return;
  }
  checkLevel(game);
}
