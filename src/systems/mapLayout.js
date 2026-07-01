import * as THREE from 'three';
import { ARENA_RADIUS } from '../config/gameTuning.js';
import { SHRINE_SITES } from '../config/gameData.js';
import { getTerrainHeight } from './terrain.js';

function withModelScale(transform, width = 1, height = 1, depth = width) {
  return {
    ...transform,
    modelScale: [transform.scale * width, transform.scale * height, transform.scale * depth]
  };
}

export function createBalancedNatureAssetTransforms() {
  const place = (angle, radius, scale, yOffset = 0.02, tilt = 0) => {
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return {
      position: new THREE.Vector3(x, getTerrainHeight(x, z) + yOffset, z),
      rotation: -angle + Math.PI / 2 + Math.sin(angle * 2.8 + radius * 0.04) * 0.16,
      scale,
      tilt
    };
  };

  const sightlineClear = transform => {
    const { x, z } = transform.position;
    const distance = Math.hypot(x, z);
    const centerCombat = distance < 42;
    const foregroundBlock = z < -54 && Math.abs(x) < 74;
    const hudLane = z > 28 && x < -12 && Math.abs(x) < 92;
    const shrineBlock = SHRINE_SITES.some(site => {
      const sx = Math.cos(site.angle) * site.radius;
      const sz = Math.sin(site.angle) * site.radius;
      return Math.hypot(x - sx, z - sz) < 7.2;
    });
    return !centerCombat && !foregroundBlock && !hudLane && !shrineBlock && distance < ARENA_RADIUS - 5;
  };

  const outerTrees = Array.from({ length: 10 }, (_, index) => {
    const angle = index * Math.PI * 2 / 10 + 0.24 + Math.sin(index * 1.47) * 0.08;
    const radius = 94 + (index % 4) * 4.4 + Math.cos(index * 0.9) * 1.8;
    const tree = place(angle, radius, 2.4 + (index % 3) * 0.18, -0.04, index % 3 === 0 ? 0.04 : 0);
    return withModelScale(tree, 0.72, 0.68, 0.72);
  }).filter(sightlineClear);

  const groveTrees = SHRINE_SITES.map((site, index) => {
    const side = index % 2 ? -1 : 1;
    const angle = site.angle + side * 0.32 + Math.sin(index * 1.8) * 0.05;
    const radius = site.radius + 18 + (index % 2) * 4.5;
    const tree = place(angle, radius, 1.78 + index * 0.06, -0.04, side * 0.035);
    return withModelScale(tree, 0.7, 0.64, 0.7);
  }).filter(sightlineClear);

  const rocks = Array.from({ length: 9 }, (_, index) => {
    const angle = index * 1.76 + 0.38 + Math.sin(index * 1.22) * 0.08;
    const radius = 48 + (index % 9) * 6.6 + Math.cos(index * 0.9) * 1.4;
    const rock = place(angle, radius, 1.25 + (index % 4) * 0.18, 0.04, index % 2 ? 0.06 : -0.04);
    return withModelScale(rock, 0.72, 0.52, 0.72);
  }).filter(sightlineClear);

  const bushes = Array.from({ length: 13 }, (_, index) => {
    const site = SHRINE_SITES[index % SHRINE_SITES.length];
    const angle = site.angle + (index % 5 - 2) * 0.2 + Math.sin(index * 1.11) * 0.08;
    const radius = site.radius + 10 + (index % 4) * 4.2;
    const bush = place(angle, radius, 1.05 + (index % 3) * 0.13, 0.02, 0);
    return withModelScale(bush, 1.12, 0.62, 0.94);
  }).filter(sightlineClear);

  const grass = Array.from({ length: 18 }, (_, index) => {
    const angle = index * 2.17 + 0.16;
    const radius = 34 + (index % 22) * 3.1 + Math.sin(index * 1.3) * 1.1;
    const tuft = place(angle, radius, 0.74 + (index % 4) * 0.08, 0.02, 0);
    return withModelScale(tuft, 0.72, 0.58, 0.72);
  }).filter(transform => {
    const distance = transform.position.length();
    return distance > 28 && distance < ARENA_RADIUS - 9 && !(transform.position.z > 16 && Math.abs(transform.position.x) < 58);
  });

  return {
    pineTall: outerTrees.filter((_, index) => index % 2 === 0),
    treeDefault: [...outerTrees.filter((_, index) => index % 2 === 1), ...groveTrees],
    rocks,
    bushes,
    grass
  };
}
