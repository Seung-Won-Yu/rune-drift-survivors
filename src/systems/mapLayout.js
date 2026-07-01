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

export function createBalancedCasualArenaLayout(visualQuality = 'balanced') {
  const density = visualQuality === 'low' ? 0.62 : 1;
  const laneAngles = [-0.22, 1.1, 2.52, 3.86];
  const pathCount = visualQuality === 'low' ? 3 : 4;

  const trailSegments = laneAngles.flatMap((angle, laneIndex) => (
    Array.from({ length: pathCount }, (_, index) => {
      const radius = 17 + index * 19.6;
      const tangent = angle + Math.PI / 2;
      const bend = Math.sin(index * 1.18 + laneIndex * 0.92) * 4.2;
      const x = Math.cos(angle) * radius + Math.cos(tangent) * bend;
      const z = Math.sin(angle) * radius + Math.sin(tangent) * bend;
      return {
        position: [x, getTerrainHeight(x, z) + 0.052, z],
        rotation: -angle + Math.PI / 2 + Math.sin(index + laneIndex) * 0.11,
        scale: [12.8 + index * 1.1, 2.65 + (laneIndex % 2) * 0.32, 1],
        color: laneIndex % 2 ? '#ad9e58' : '#8da95f'
      };
    })
  )).filter(mark => Math.hypot(mark.position[0], mark.position[2]) < ARENA_RADIUS - 18);

  const meadowPatches = [
    { angle: -0.82, radius: 32, sx: 10.5, sz: 4.2, color: '#91b564' },
    { angle: 0.58, radius: 45, sx: 12.0, sz: 4.4, color: '#b9a763' },
    { angle: 1.96, radius: 58, sx: 13.4, sz: 4.7, color: '#86a95e' },
    { angle: 3.12, radius: 50, sx: 11.5, sz: 4.1, color: '#a5bd70' },
    { angle: 4.48, radius: 42, sx: 10.8, sz: 3.9, color: '#b5a160' },
    { angle: 5.44, radius: 64, sx: 13.2, sz: 4.5, color: '#839f5b' },
    { angle: 0.14, radius: 75, sx: 17.4, sz: 5.2, color: '#789f5a' },
    { angle: 3.92, radius: 76, sx: 16.2, sz: 5.0, color: '#9caf66' }
  ].map((patch, index) => {
    const x = Math.cos(patch.angle) * patch.radius;
    const z = Math.sin(patch.angle) * patch.radius;
    return {
      position: [x, getTerrainHeight(x, z) + 0.058, z],
      rotation: -patch.angle + Math.PI / 2 + index * 0.09,
      scale: [patch.sx, patch.sz, 1],
      color: patch.color
    };
  }).filter((_, index) => visualQuality !== 'low' || index < 6);

  const shrinePads = SHRINE_SITES.map((site, index) => {
    const x = Math.cos(site.angle) * site.radius;
    const z = Math.sin(site.angle) * site.radius;
    return {
      position: [x, getTerrainHeight(x, z) + 0.061, z],
      rotation: -site.angle + Math.PI / 2,
      scale: [5.4 + (index % 2) * 0.5, 3.2 + (index % 3) * 0.24, 1],
      color: index % 2 ? '#b9bf71' : '#9eb96a'
    };
  });

  const centralPlaza = [
    { position: [0, getTerrainHeight(0, 0) + 0.066, 0], rotation: 0, scale: [18.5, 18.5, 1], color: '#8e9861' },
    { position: [0, getTerrainHeight(0, 0) + 0.074, 0], rotation: Math.PI / 4, scale: [10.6, 10.6, 1], color: '#c7ae63' },
    { position: [0, getTerrainHeight(0, 0) + 0.083, 0], rotation: Math.PI / 8, scale: [6.1, 6.1, 1], color: '#78a965' }
  ];

  const flowerCount = Math.round((visualQuality === 'low' ? 10 : 24) * density);
  const flowerFlecks = Array.from({ length: flowerCount }, (_, index) => {
    const angle = index * 2.399963 + Math.sin(index * 0.7) * 0.08;
    const radius = 28 + (index % 32) * 2.35 + Math.sin(index * 1.44) * 1.1;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return {
      position: [x, getTerrainHeight(x, z) + 0.09, z],
      rotation: angle,
      scale: [0.24 + (index % 3) * 0.035, 0.18 + (index % 2) * 0.026, 1],
      color: index % 7 === 0 ? '#c9b566' : index % 5 === 0 ? '#9e83b7' : '#75aa61'
    };
  }).filter(mark => {
    const distance = Math.hypot(mark.position[0], mark.position[2]);
    return distance > 24 && distance < ARENA_RADIUS - 18 && !(Math.abs(mark.position[0]) < 16 && Math.abs(mark.position[2]) < 16);
  });

  const place = (angle, radius, yOffset = 0.04) => {
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return new THREE.Vector3(x, getTerrainHeight(x, z) + yOffset, z);
  };

  const treeCount = visualQuality === 'low' ? 10 : 20;
  const trees = Array.from({ length: treeCount }, (_, index) => {
    const cluster = index % 5;
    const baseAngle = cluster * Math.PI * 2 / 5 + 0.36;
    const angle = baseAngle + (Math.floor(index / 5) - 1.5) * 0.09 + Math.sin(index * 1.3) * 0.035;
    const radius = 82 + (index % 4) * 7.8 + Math.cos(index * 0.9) * 2.6;
    const scale = 1.08 + (index % 4) * 0.13;
    return {
      position: place(angle, radius, 0.04),
      rotation: -angle + Math.PI / 2,
      scale,
      trunkColor: index % 2 ? '#6b5238' : '#5f4933',
      canopyColor: index % 3 === 0 ? '#4b805d' : index % 3 === 1 ? '#5f904f' : '#548962'
    };
  }).filter(tree => {
    const distance = tree.position.length();
    const hudLane = tree.position.z > 18 && Math.abs(tree.position.x) < 70;
    return distance > 72 && distance < ARENA_RADIUS - 4 && !hudLane;
  });

  const rockCount = visualQuality === 'low' ? 6 : 13;
  const rocks = Array.from({ length: rockCount }, (_, index) => {
    const angle = index * 1.91 + 0.44;
    const radius = 36 + (index % 9) * 7.2 + Math.sin(index * 1.15) * 1.6;
    return {
      position: place(angle, radius, 0.12),
      rotation: -angle + Math.PI / 2 + (index % 2 ? 0.28 : -0.22),
      scale: [0.62 + (index % 3) * 0.1, 0.22 + (index % 2) * 0.04, 0.48 + (index % 4) * 0.08],
      color: index % 3 === 0 ? '#89916a' : '#758666'
    };
  }).filter(rock => rock.position.length() > 30 && rock.position.length() < ARENA_RADIUS - 14);

  const grassCount = visualQuality === 'low' ? 12 : 26;
  const grassTufts = Array.from({ length: grassCount }, (_, index) => {
    const angle = index * 2.12 + 0.18;
    const radius = 32 + (index % 28) * 2.85 + Math.cos(index * 1.32) * 1.1;
    return {
      position: place(angle, radius, 0.13),
      rotation: -angle + Math.PI / 2 + Math.sin(index) * 0.22,
      scale: [0.22 + (index % 4) * 0.035, 0.44 + (index % 3) * 0.05, 0.22],
      color: index % 5 === 0 ? '#b8aa63' : '#679b59'
    };
  }).filter(tuft => tuft.position.length() > 26 && tuft.position.length() < ARENA_RADIUS - 12);

  const bushes = Array.from({ length: visualQuality === 'low' ? 10 : 20 }, (_, index) => {
    const site = SHRINE_SITES[index % SHRINE_SITES.length];
    const aroundShrine = index % 3 !== 0;
    const angle = aroundShrine
      ? site.angle + (index % 7 - 3) * 0.18 + Math.sin(index * 1.2) * 0.06
      : index * 1.87 + 0.24;
    const radius = aroundShrine
      ? site.radius + 12 + (index % 4) * 3.2
      : 48 + (index % 12) * 4.1;
    return {
      position: place(angle, radius, 0.18),
      rotation: -angle + Math.PI / 2 + Math.sin(index * 0.8) * 0.16,
      scale: 0.58 + (index % 4) * 0.12,
      color: index % 4 === 0 ? '#6d9556' : index % 3 === 0 ? '#527b58' : '#789d5e'
    };
  }).filter(bush => {
    const distance = bush.position.length();
    return distance > 30 && distance < ARENA_RADIUS - 12 && !(Math.abs(bush.position.x) < 18 && Math.abs(bush.position.z) < 18);
  });

  const edgeShadePatches = Array.from({ length: visualQuality === 'low' ? 5 : 10 }, (_, index) => {
    const angle = index * Math.PI * 2 / (visualQuality === 'low' ? 5 : 10) + 0.18;
    const radius = 96 + (index % 2) * 5.4;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return {
      position: [x, getTerrainHeight(x, z) + 0.048, z],
      rotation: -angle + Math.PI / 2 + Math.sin(index * 0.8) * 0.18,
      scale: [22 + (index % 3) * 5.5, 8.4 + (index % 2) * 2.1, 1],
      color: index % 2 ? '#365b36' : '#426b3b'
    };
  });

  const pondSeeds = [
    { angle: -2.62, radius: 68, sx: 5.6, sz: 2.15, color: '#4e947f' },
    { angle: -0.92, radius: 82, sx: 4.8, sz: 1.95, color: '#5b9e90' },
    { angle: 1.14, radius: 72, sx: 5.2, sz: 2.2, color: '#5c9d78' }
  ];
  const pondPatches = pondSeeds.slice(0, visualQuality === 'low' ? 2 : 3).map((pond, index) => {
    const x = Math.cos(pond.angle) * pond.radius;
    const z = Math.sin(pond.angle) * pond.radius;
    return {
      position: [x, getTerrainHeight(x, z) + 0.074, z],
      rotation: -pond.angle + Math.PI / 2 + index * 0.18,
      scale: [pond.sx, pond.sz, 1],
      color: pond.color
    };
  });
  const pondHighlights = pondPatches.map((pond, index) => ({
    ...pond,
    position: [pond.position[0], pond.position[1] + 0.012, pond.position[2]],
    scale: [pond.scale[0] * 0.74, pond.scale[1] * 0.64, 1],
    color: index % 2 ? '#bcd6a0' : '#b7dccd'
  }));

  const ruinSlabs = [
    ...Array.from({ length: visualQuality === 'low' ? 10 : 18 }, (_, index) => {
      const angle = index * 1.73 + 0.38;
      const radius = 24 + (index % 11) * 6.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.08, z],
        rotation: [0.035, -angle + Math.PI / 2 + (index % 3) * 0.16, index % 2 ? 0.03 : -0.035],
        scale: [2.6 + (index % 4) * 0.62, 0.12, 0.34 + (index % 3) * 0.08],
        color: index % 2 ? '#6f7658' : '#8a8763'
      };
    }).filter(slab => {
      const distance = Math.hypot(slab.position[0], slab.position[2]);
      return distance > 19 && distance < ARENA_RADIUS - 18;
    }),
    ...SHRINE_SITES.flatMap((site, siteIndex) => {
      const x = Math.cos(site.angle) * site.radius;
      const z = Math.sin(site.angle) * site.radius;
      const y = getTerrainHeight(x, z);
      const tangent = site.angle + Math.PI / 2;
      return [
        {
          position: [x, y + 0.18, z],
          rotation: [0.02, -site.angle, 0],
          scale: [2.9, 0.28, 1.15],
          color: siteIndex % 2 ? '#828b61' : '#929267'
        },
        {
          position: [x + Math.cos(tangent) * 1.75, y + 0.78, z + Math.sin(tangent) * 1.75],
          rotation: [0.04, -site.angle + 0.12, 0.02],
          scale: [0.42, 1.28, 0.42],
          color: '#6f7858'
        },
        {
          position: [x - Math.cos(tangent) * 1.75, y + 0.72, z - Math.sin(tangent) * 1.75],
          rotation: [-0.03, -site.angle - 0.1, -0.02],
          scale: [0.38, 1.18, 0.38],
          color: '#7f815e'
        }
      ];
    })
  ];

  const runeCrystals = [
    ...SHRINE_SITES.map((site, index) => {
      const x = Math.cos(site.angle) * (site.radius - 2.8);
      const z = Math.sin(site.angle) * (site.radius - 2.8);
      return {
        position: [x, getTerrainHeight(x, z) + 0.72, z],
        rotation: [0.18, -site.angle + index * 0.3, 0.12],
        scale: [0.34, 0.58, 0.34],
        color: index % 2 ? '#c2b36a' : '#82b66f'
      };
    }),
    ...Array.from({ length: visualQuality === 'low' ? 4 : 8 }, (_, index) => {
      const angle = index * Math.PI * 2 / (visualQuality === 'low' ? 4 : 8) + 0.42;
      const radius = 43 + (index % 2) * 8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.42, z],
        rotation: [0.24, -angle, 0.16],
        scale: [0.18 + (index % 2) * 0.05, 0.34 + (index % 3) * 0.08, 0.18 + (index % 2) * 0.05],
        color: index % 3 === 0 ? '#c8b763' : index % 3 === 1 ? '#74b46a' : '#67abb1'
      };
    })
  ];

  const treeShadows = trees.map((tree, index) => ({
    position: [tree.position.x, getTerrainHeight(tree.position.x, tree.position.z) + 0.043, tree.position.z],
    rotation: tree.rotation + 0.14,
    scale: [1.9 * tree.scale, 0.76 * tree.scale, 1],
    color: index % 2 ? '#244328' : '#2f5031'
  }));

  return {
    centralPlaza,
    trailSegments,
    meadowPatches,
    shrinePads,
    flowerFlecks,
    trees,
    bushes,
    rocks,
    grassTufts,
    edgeShadePatches,
    pondPatches,
    pondHighlights,
    ruinSlabs,
    runeCrystals,
    treeShadows
  };
}
