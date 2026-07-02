import * as THREE from 'three';

import { ARENA_RADIUS } from '../config/gameTuning.js';
import {
  getPlayerTerrainY,
  hitsStaticCollider
} from './terrain.js';

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
