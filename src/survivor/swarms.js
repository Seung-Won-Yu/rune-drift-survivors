// A breakable front gives movement a purpose: turn into the pack for XP or
// take the open side. These enemies use the ordinary weapons/hit/loot rules.
export const SWARMS = [
  { at: 22, count: 14, speed: 70 },
  { at: 94, count: 20, speed: 76 },
  { at: 154, count: 26, speed: 82 },
  { at: 212, count: 32, speed: 88 }
];
export const SWARM_WINDOW = 26;
// Later packs cross the route instead of collapsing into the same pursuit ball.
export const MARCH_SECONDS = 5;
export const MARCH_SPEED = 140;
export function marchSlot(index, count, angle, gapSide) {
  const columns = Math.ceil(count / 2), column = index % columns;
  const split = Math.floor(columns / 2);
  const lateral = gapSide * 72 + (column < split
    ? -72 - (split - 1 - column) * 34 : 72 + (column - split) * 34);
  const forward = 320 + Math.floor(index / columns) * 46;
  return { x: Math.cos(angle) * forward - Math.sin(angle) * lateral,
    y: Math.sin(angle) * forward + Math.cos(angle) * lateral };
}
export const HARVEST_SECONDS = 5;
export const createSwarms = () => ({ opening: false, pending: null, active: null, cleared: 0, missed: 0, harvestUntil: 0 });

export function spawnOpening(game, spawn) {
  if (game.swarms.opening || game.time > 1) return;
  game.swarms.opening = true;
  const angle = game.flowRng() * Math.PI * 2;
  for (let i = 0; i < 6; i++) {
    const a = angle + (i - 2.5) * .38, radius = 155 + i % 2 * 35;
    const enemy = spawn(game, 0, false, { x: game.player.x + Math.cos(a) * radius, y: game.player.y + Math.sin(a) * radius });
    if (enemy) enemy.xp = 1;
  }
}

export function updateSwarms(game, dt, spawn, limit) {
  const state = game.swarms;
  if (game.bossSpawned) { for (const e of game.enemies) e.march = null; state.pending = state.active = null; state.harvestUntil = 0; return; }
  const beat = SWARMS.find(beat => game.time - dt < beat.at && game.time >= beat.at);
  if (beat) state.pending = beat;
  if (state.active && game.time >= state.active.until) { state.missed++; state.active = null; }
  if (!state.pending || state.active) return;
  if (game.time > state.pending.at + 12) { state.pending = null; return; }
  // Never crowd a champion or replace living enemies to manufacture a wave.
  if (game.enemies.some(e => e.champion && e.hp > 0) || game.championBreatherUntil > game.time || limit - game.enemies.length < state.pending.count) return;
  const { at, count, speed } = state.pending;
  const rolledAngle = game.flowRng() * Math.PI * 2;
  const marching = at >= 154;
  const moving = Math.hypot(game.player.moveX ?? 0, game.player.moveY ?? 0) > .05;
  // Commit once; turning afterwards never rotates a live formation onto the player.
  const angle = marching && moving ? Math.atan2(game.player.moveY, game.player.moveX) : rolledAngle;
  const gapSide = rolledAngle < Math.PI ? -1 : 1;
  for (let i = 0; i < count; i++) {
    const a = angle + (i % 2 ? .58 : -.58) + (game.flowRng() - .5) * .42;
    const radius = 250 + Math.floor(i / 8) * 30 + game.flowRng() * 35;
    const offset = marching ? marchSlot(i, count, angle, gapSide) : {x:Math.cos(a)*radius,y:Math.sin(a)*radius};
    const enemy = spawn(game, 0, false, { x: game.player.x + offset.x, y: game.player.y + offset.y });
    if (marching) enemy.march = {x:-Math.cos(angle),y:-Math.sin(angle),until:game.time+MARCH_SECONDS};
    enemy.swarm = at;
    // One-hit fodder at rank two; a crowd rather than a wall of hit points.
    enemy.hp = enemy.maxHp = (12 + at * .055) * (game.vow === 'mist' ? 1.15 : 1);
    enemy.speed = speed;
  }
  state.active = { id: at, total: count, kills: 0, until: game.time + SWARM_WINDOW, marching };
  state.pending = null;
  game.events.push('swarm-arrival');
}

export function recordSwarmKill(game, enemy) {
  const active = game.swarms.active;
  if (!active || enemy.swarm !== active.id) return;
  active.kills++;
  if (active.kills < active.total) return;
  game.swarms.cleared++;
  game.swarms.active = null;
  game.swarms.harvestUntil = game.time + HARVEST_SECONDS;
  // XP stays earned loot. Recall only the nearby battlefield, never grant levels.
  for (const gem of game.gems) if (Math.hypot(gem.x - game.player.x, gem.y - game.player.y) <= 320) gem.recalled = true;
  game.events.push('swarm-cleared');
}
