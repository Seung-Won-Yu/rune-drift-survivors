import { MAP_CLIFFS } from '../config/gameData.js';
import {
  ARENA_RADIUS,
  STATIC_COLLIDER_GRID_CELL_SIZE,
  STATIC_COLLIDER_GRID_KEY_STRIDE
} from '../config/gameTuning.js';

const STATIC_COLLIDERS = makeOpenFieldColliders();
const STATIC_COLLIDER_GRID = makeStaticColliderGrid(STATIC_COLLIDERS);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getStaticColliderGridCoord(value) {
  return Math.floor(value / STATIC_COLLIDER_GRID_CELL_SIZE);
}

function getStaticColliderGridKey(cellX, cellZ) {
  return cellX * STATIC_COLLIDER_GRID_KEY_STRIDE + cellZ;
}

function makeOpenFieldColliders() {
  const colliders = [];

  MAP_CLIFFS.forEach(cliff => {
    colliders.push({
      type: 'box',
      x: cliff.x,
      z: cliff.z,
      w: cliff.w + 1.2,
      d: cliff.d + 1.2
    });
  });

  Array.from({ length: 18 }, (_, index) => {
    const angle = index * 1.17 + 0.42;
    const radius = 32 + (index % 10) * 5.0;
    colliders.push({
      type: 'circle',
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      radius: 1.55 + (index % 4) * 0.28
    });
    return null;
  });

  Array.from({ length: 12 }, (_, index) => {
    const angle = index * Math.PI * 2 / 12 + 0.12;
    const radius = ARENA_RADIUS - 8.5 + (index % 2) * 2.1;
    colliders.push({
      type: 'circle',
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      radius: 2.2
    });
    return null;
  });

  Array.from({ length: 18 }, (_, index) => {
    const angle = index * 0.67 + (index % 5) * 0.13;
    const radius = 76 + (index % 8) * 4.4;
    colliders.push({
      type: 'circle',
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      radius: 1.75
    });
    return null;
  });

  return colliders;
}

function getStaticColliderBounds(collider, padding = 0) {
  if (collider.type === 'circle') {
    const radius = collider.radius + padding;
    return {
      minX: collider.x - radius,
      maxX: collider.x + radius,
      minZ: collider.z - radius,
      maxZ: collider.z + radius
    };
  }

  const halfW = collider.w / 2 + padding;
  const halfD = collider.d / 2 + padding;
  return {
    minX: collider.x - halfW,
    maxX: collider.x + halfW,
    minZ: collider.z - halfD,
    maxZ: collider.z + halfD
  };
}

function makeStaticColliderGrid(colliders) {
  const cells = new Map();
  colliders.forEach((collider, index) => {
    collider.queryId = 0;
    collider.index = index;
    const bounds = getStaticColliderBounds(collider);
    const minCellX = getStaticColliderGridCoord(bounds.minX);
    const maxCellX = getStaticColliderGridCoord(bounds.maxX);
    const minCellZ = getStaticColliderGridCoord(bounds.minZ);
    const maxCellZ = getStaticColliderGridCoord(bounds.maxZ);
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
        const key = getStaticColliderGridKey(cellX, cellZ);
        let bucket = cells.get(key);
        if (!bucket) {
          bucket = [];
          cells.set(key, bucket);
        }
        bucket.push(collider);
      }
    }
  });
  return { cells, queryId: 0 };
}

function forEachStaticColliderNear(pos, radius, visit) {
  const grid = STATIC_COLLIDER_GRID;
  grid.queryId += 1;
  const bounds = {
    minX: pos.x - radius,
    maxX: pos.x + radius,
    minZ: pos.z - radius,
    maxZ: pos.z + radius
  };
  const minCellX = getStaticColliderGridCoord(bounds.minX);
  const maxCellX = getStaticColliderGridCoord(bounds.maxX);
  const minCellZ = getStaticColliderGridCoord(bounds.minZ);
  const maxCellZ = getStaticColliderGridCoord(bounds.maxZ);

  for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      const bucket = grid.cells.get(getStaticColliderGridKey(cellX, cellZ));
      if (!bucket) continue;
      for (const collider of bucket) {
        if (collider.queryId === grid.queryId) continue;
        collider.queryId = grid.queryId;
        if (visit(collider) === false) return false;
      }
    }
  }
  return true;
}

export function smoothStep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function mound(x, z, centerX, centerZ, radius, height) {
  const distance = Math.hypot(x - centerX, z - centerZ);
  return height * (1 - smoothStep(radius * 0.18, radius, distance));
}

function trench(x, z, centerX, centerZ, radius, depth) {
  const distance = Math.hypot(x - centerX, z - centerZ);
  return -depth * (1 - smoothStep(radius * 0.12, radius, distance));
}

function ringHeightAt(radius) {
  const centralClearing = -0.08 * (1 - smoothStep(0.0, 22.0, radius));
  const midFieldLift = 0.34 * smoothStep(18.0, 54.0, radius) * (1 - smoothStep(84.0, 112.0, radius));
  const outerRidge = 1.86 * smoothStep(84.0, 112.0, radius) * (1 - smoothStep(126.0, 146.0, radius));
  const farDrop = -1.18 * smoothStep(ARENA_RADIUS + 1.0, ARENA_RADIUS + 19.0, radius);
  return centralClearing + midFieldLift + outerRidge + farDrop;
}

export function getTerrainHeight(x, z) {
  const radius = Math.hypot(x, z);
  const angle = Math.atan2(z, x);
  let height = ringHeightAt(radius);

  height += mound(x, z, -45, -20, 36, 1.34);
  height += mound(x, z, 42, 24, 34, 1.16);
  height += mound(x, z, 15, -52, 30, 1.02);
  height += mound(x, z, -18, 51, 32, 0.92);
  height += mound(x, z, 64, -58, 38, 1.08);
  height += mound(x, z, -78, 42, 40, 1.0);
  height += trench(x, z, -10, 44, 38, 0.52);
  height += trench(x, z, 42, -16, 46, 0.42);
  height += trench(x, z, -58, -52, 36, 0.34);

  const northShelf = 0.68 * smoothStep(24.0, 52.0, -z) * (1 - smoothStep(82.0, 112.0, -z)) * (1 - smoothStep(46.0, 84.0, Math.abs(x + 4)));
  const westShoulder = 0.55 * smoothStep(34.0, 64.0, -x) * (1 - smoothStep(92.0, 118.0, -x)) * (1 - smoothStep(48.0, 86.0, Math.abs(z + 9)));
  const windRoll = 0.16 * Math.sin(x * 0.055 + z * 0.032) + 0.12 * Math.cos(z * 0.06 - x * 0.024);
  const radialRidges = 0.22 * smoothStep(28.0, 68.0, radius) * (1 - smoothStep(104.0, 126.0, radius)) * Math.max(0, Math.sin(angle * 3.0 + radius * 0.052));

  return height + northShelf + westShoulder + windRoll + radialRidges;
}

function terrainSurfaceNoise(x, z) {
  const broad = Math.sin(x * 0.12 + z * 0.055) * 0.08;
  const cross = Math.cos(z * 0.16 - x * 0.045) * 0.06;
  const chipped = Math.sin((x + z) * 0.36) * Math.cos((x - z) * 0.24) * 0.022;
  return broad + cross + chipped;
}

export function getVisualTerrainHeight(x, z) {
  const radius = Math.hypot(x, z);
  const angle = Math.atan2(z, x);
  const walkableNoise = terrainSurfaceNoise(x, z) * smoothStep(9.0, 19.0, radius) * (1 - smoothStep(ARENA_RADIUS - 1.5, ARENA_RADIUS + 10.0, radius));
  const erodedEdge = -0.96 * smoothStep(ARENA_RADIUS - 1.0, ARENA_RADIUS + 14.0, radius);
  const broadGameTrail = -0.09 * smoothStep(12.0, 24.0, radius) * (1 - smoothStep(42.0, 60.0, radius)) * smoothStep(0.72, 0.96, Math.abs(Math.sin(angle * 2.0 + radius * 0.038)));
  const drainage = -0.12 * smoothStep(20.0, 36.0, radius) * (1 - smoothStep(55.0, 70.0, radius)) * Math.max(0, Math.cos(angle * 3.0 - 0.65));
  return getTerrainHeight(x, z) + walkableNoise + erodedEdge + broadGameTrail + drainage;
}

export function getPlayerTerrainY(x, z) {
  return 0.55 + getTerrainHeight(x, z);
}

export function getEnemyTerrainY(x, z) {
  return 0.02 + getTerrainHeight(x, z);
}

export function resolveStaticCollisions(pos, radius) {
  forEachStaticColliderNear(pos, radius, collider => {
    if (collider.type === 'circle') {
      const dx = pos.x - collider.x;
      const dz = pos.z - collider.z;
      const minDistance = radius + collider.radius;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq < minDistance * minDistance) {
        const distance = Math.max(0.001, Math.sqrt(distanceSq));
        const push = (minDistance - distance) / distance;
        pos.x += dx * push;
        pos.z += dz * push;
      }
      return;
    }

    const halfW = collider.w / 2 + radius;
    const halfD = collider.d / 2 + radius;
    const dx = pos.x - collider.x;
    const dz = pos.z - collider.z;
    const overlapX = halfW - Math.abs(dx);
    const overlapZ = halfD - Math.abs(dz);
    if (overlapX > 0 && overlapZ > 0) {
      if (overlapX < overlapZ) {
        pos.x += Math.sign(dx || 1) * overlapX;
      } else {
        pos.z += Math.sign(dz || 1) * overlapZ;
      }
    }
  });
}

export function hitsStaticCollider(pos, radius) {
  let hit = false;
  forEachStaticColliderNear(pos, radius, collider => {
    if (collider.type === 'circle') {
      const dx = pos.x - collider.x;
      const dz = pos.z - collider.z;
      const minDistance = radius + collider.radius;
      if (dx * dx + dz * dz < minDistance * minDistance) {
        hit = true;
        return false;
      }
      return true;
    }
    const halfW = collider.w / 2 + radius;
    const halfD = collider.d / 2 + radius;
    if (Math.abs(pos.x - collider.x) < halfW && Math.abs(pos.z - collider.z) < halfD) {
      hit = true;
      return false;
    }
    return true;
  });
  return hit;
}
