import { RELICS } from './expansion.js';
export const ENCOUNTERS = {
  altar: {
    name: '봉인 제단',
    at: 45,
    radius: 85,
    duration: 10,
    color: '#a9ddc8'
  },
  chest: {
    name: '저주 상자',
    at: 135,
    radius: 65,
    duration: 18,
    color: '#e6abd2'
  }
};
export const encounterDistance = (game, event) => Math.hypot(event.x - game.player.x, event.y - game.player.y);
export const curseActive = game => game.encounters.some(event => event.kind === 'chest' && event.state === 'active');
export function nearbyChest(game) {
  return game.encounters.find(event => event.kind === 'chest' && event.state === 'available' && encounterDistance(game, event) <= ENCOUNTERS.chest.radius);
}
export function openChest(game) {
  if (game.phase !== 'playing' || !nearbyChest(game)) return false;
  game.phase = 'event';
  game.player.moving = false;
  return true;
}
export function chooseCurse(game, accept) {
  const event = nearbyChest(game);
  if (game.phase !== 'event' || !event || typeof accept !== 'boolean') return false;
  event.state = accept ? 'active' : 'declined';
  game.phase = 'playing';
  if (accept) game.events.push('curse');
  return true;
}
export function chooseRelic(game, key) {
  if (game.phase !== 'relic' || !game.relicChoices.includes(key) || !RELICS[key] || game.relics.includes(key)) return false;
  game.relics.push(key);
  game.relicChoices = [];
  game.phase = 'playing';
  game.player.invincible = Math.max(game.player.invincible, .8);
  game.events.push('choose');
  return true;
}
function reward(game, event) {
  event.state = 'completed';
  const pool = Object.keys(RELICS).filter(key => !game.relics.includes(key));
  game.relicChoices = [];
  while (game.relicChoices.length < 3 && pool.length) game.relicChoices.push(pool.splice(Math.floor(game.rng() * pool.length), 1)[0]);
  if (game.relicChoices.length) {
    game.phase = 'relic';
    game.rewardFrom = event.kind;
    game.events.push('relic-ready');
  }
}
export function updateEncounters(game, dt) {
  for (const [kind, meta] of Object.entries(ENCOUNTERS)) {
    if (game.time >= meta.at && !game.encounters.some(event => event.kind === kind)) {
      game.encounters.push({
        kind,
        x: game.player.x + (kind === 'altar' ? 210 : -210),
        y: game.player.y - 80,
        state: 'available',
        progress: 0
      });
      game.events.push('event-ready');
    }
  }
  for (const event of game.encounters) {
    if (event.state === 'completed' || event.state === 'declined' || event.state === 'expired') continue;
    const meta = ENCOUNTERS[event.kind];
    // Unaccepted choices expire before the boss; active challenges keep their contract.
    if (game.time >= 225 && (event.state === 'available' || event.kind === 'altar')) {
      event.state = 'expired';
      continue;
    }
    const inside = encounterDistance(game, event) <= meta.radius;
    if (event.kind === 'altar' && inside) event.state = 'active';
    if (event.state === 'active' && (event.kind === 'chest' || inside)) event.progress += dt;
    if (event.progress + 1e-8 >= meta.duration) {
      reward(game, event);
      break;
    }
  }
}
export function trackedEncounter(game) {
  return game.encounters.filter(event => ['available', 'active'].includes(event.state)).sort((a, b) => Number(b.state === 'active') - Number(a.state === 'active') || encounterDistance(game, a) - encounterDistance(game, b))[0];
}
export function encounterDirection(game, event) {
  const a = Math.atan2(event.y - game.player.y, event.x - game.player.x);
  return ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][(Math.round(a / (Math.PI / 4)) + 8) % 8];
}
