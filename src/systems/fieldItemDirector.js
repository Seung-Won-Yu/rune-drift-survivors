import * as THREE from 'three';

import { ARENA_RADIUS } from '../config/gameTuning.js';
import { getNextCircuitSite, getShrineWorldPosition, getWorldDirection } from './runeCircuit.js';
import {
  getPlayerTerrainY,
  hitsStaticCollider
} from './terrain.js';

export function getRouteDetourPosition(playerPos, target) {
  const forward = new THREE.Vector2(target.x - playerPos.x, target.z - playerPos.z);
  if (forward.length() < 24) return null;
  forward.normalize();
  // A visible side trip, outside normal pickup attraction and off the seal route.
  for (const side of [16, -16, 20, -20]) {
    const x = playerPos.x + forward.x * 12 - forward.y * side;
    const z = playerPos.z + forward.y * 12 + forward.x * side;
    if (Math.hypot(x, z) > ARENA_RADIUS - 7) continue;
    const pos = new THREE.Vector3(x, getPlayerTerrainY(x, z) + 0.42, z);
    let clearApproach = true;
    for (let step = 1; step <= 12; step += 1) {
      if (hitsStaticCollider(playerPos.clone().lerp(pos, step / 12), 1.25)) {
        clearApproach = false;
        break;
      }
    }
    if (clearApproach) return pos;
  }
  return null;
}

export function createScheduledFieldItem(scheduled, game, playerPos) {
  if (game.time < scheduled.time) {
    if (scheduled.id !== 'starter-overload' || !game.activatedShrines?.armory || game.activatedShrines?.vital) return null;
    const nextSite = getNextCircuitSite(game.activatedShrines);
    const pos = nextSite && getRouteDetourPosition(playerPos, getShrineWorldPosition(nextSite));
    if (!pos) return null;
    // Relocate this scheduled reward once; do not add another permanent bonus.
    return { ...createFieldItem(scheduled.type, pos), detour: true, life: 24, maxLife: 24 };
  }
  return createFieldItem(scheduled.type, getFieldItemDropPosition(playerPos, scheduled.distance, scheduled.spread ?? 4));
}

export function getFieldDetourState(items, playerPos) {
  const item = items.find(candidate => candidate.detour && candidate.life > 0);
  if (!item) return null;
  return {
    type: item.type,
    distance: Math.round(Math.hypot(item.pos.x - playerPos.x, item.pos.z - playerPos.z)),
    direction: getWorldDirection(playerPos, item.pos),
    remaining: Math.ceil(item.life)
  };
}

export function getFieldItemDropPosition(playerPos, baseDistance = 10, spread = 30) {
  for (let i = 0; i < 12; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = baseDistance + Math.random() * spread;
    const flat = new THREE.Vector2(
      playerPos.x + Math.cos(angle) * distance,
      playerPos.z + Math.sin(angle) * distance
    );
    if (flat.length() > ARENA_RADIUS - 7) flat.setLength(ARENA_RADIUS - 7);
    const pos = new THREE.Vector3(flat.x, getPlayerTerrainY(flat.x, flat.y) + 0.42, flat.y);
    if (!hitsStaticCollider(pos, 1.25)) return pos;
  }

  const fallback = new THREE.Vector2(playerPos.x + 7, playerPos.z - 5);
  if (fallback.length() > ARENA_RADIUS - 7) fallback.setLength(ARENA_RADIUS - 7);
  return new THREE.Vector3(fallback.x, getPlayerTerrainY(fallback.x, fallback.y) + 0.42, fallback.y);
}

export function pickFieldItemType(game) {
  const hpRatio = game.stats.hp / game.stats.maxHp;
  const roll = Math.random();
  if (hpRatio < 0.45 && roll < 0.34) return 'heal';
  if (game.time >= 145 && game.time < 190 && roll < 0.045) return 'cache';
  if (game.time >= 190 && roll < 0.115) return 'cache';
  if (roll < 0.5) return 'magnet';
  if (roll < (game.time < 75 ? 0.58 : 0.68)) return 'overload';
  if (roll < 0.86) return 'purge';
  return hpRatio < 0.82 ? 'heal' : 'magnet';
}

export function createFieldItem(type, pos) {
  const life = type === 'purge' || type === 'overload' ? 58 : type === 'cache' ? 52 : 48;
  return {
    type,
    pos,
    pulse: Math.random() * Math.PI * 2,
    life,
    maxLife: life
  };
}
