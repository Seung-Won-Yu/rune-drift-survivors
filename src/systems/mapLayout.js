import * as THREE from 'three';
import { ARENA_RADIUS } from '../config/gameTuning.js';
import { SHRINE_SITES } from '../config/gameData.js';
import { getTerrainHeight } from './terrain.js';

export function createBalancedFieldArenaLayout(visualQuality = 'balanced') {
  const density = visualQuality === 'low' ? 0.62 : 1;
  const laneAngles = [-0.22, 0.72, 1.76, 2.52, 3.86];
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
        scale: [13.6 + index * 1.16, 2.95 + (laneIndex % 2) * 0.36, 1],
        color: laneIndex % 2 ? '#5c5343' : '#355b4d'
      };
    })
  )).filter(mark => Math.hypot(mark.position[0], mark.position[2]) < ARENA_RADIUS - 18);

  const groveFloorPatches = Array.from({ length: visualQuality === 'low' ? 7 : 13 }, (_, index) => {
    const angle = index * Math.PI * 2 / (visualQuality === 'low' ? 7 : 13) + 0.22 + Math.sin(index * 1.3) * 0.08;
    const radius = 76 + (index % 4) * 7.4 + Math.cos(index * 0.83) * 2.0;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return {
      position: [x, getTerrainHeight(x, z) + 0.049, z],
      rotation: -angle + Math.PI / 2 + Math.sin(index * 0.78) * 0.18,
      scale: [14 + (index % 4) * 3.5, 5.8 + (index % 3) * 1.1, 1],
      color: index % 2 ? '#173c31' : '#245144'
    };
  }).filter(mark => {
    const distance = Math.hypot(mark.position[0], mark.position[2]);
    return distance > 62 && distance < ARENA_RADIUS - 6 && !(mark.position[2] < -58 && Math.abs(mark.position[0]) < 72);
  });

  const leafLitter = Array.from({ length: visualQuality === 'low' ? 14 : 32 }, (_, index) => {
    const angle = index * 2.271 + 0.36 + Math.sin(index * 0.71) * 0.08;
    const radius = 42 + (index % 30) * 2.4 + Math.cos(index * 1.17) * 1.2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return {
      position: [x, getTerrainHeight(x, z) + 0.076, z],
      rotation: angle + index * 0.09,
      scale: [0.38 + (index % 4) * 0.09, 0.2 + (index % 3) * 0.04, 1],
      color: index % 5 === 0 ? '#6c5540' : index % 3 === 0 ? '#3b6552' : '#556455'
    };
  }).filter(mark => {
    const distance = Math.hypot(mark.position[0], mark.position[2]);
    return distance > 28 && distance < ARENA_RADIUS - 14 && !(Math.abs(mark.position[0]) < 17 && Math.abs(mark.position[2]) < 17);
  });

  const rootStrips = Array.from({ length: visualQuality === 'low' ? 6 : 14 }, (_, index) => {
    const angle = index * 1.74 + 0.52;
    const radius = 54 + (index % 9) * 5.7 + Math.sin(index * 1.1) * 1.4;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return {
      position: [x, getTerrainHeight(x, z) + 0.086, z],
      rotation: -angle + Math.PI / 2 + (index % 2 ? 0.22 : -0.18),
      scale: [5.8 + (index % 5) * 1.1, 0.34 + (index % 3) * 0.08, 1],
      color: index % 2 ? '#493d32' : '#29473c'
    };
  }).filter(mark => {
    const distance = Math.hypot(mark.position[0], mark.position[2]);
    return distance > 44 && distance < ARENA_RADIUS - 18 && !(mark.position[2] < -56 && Math.abs(mark.position[0]) < 72);
  });

  const meadowPatches = [
    { angle: -0.82, radius: 32, sx: 10.5, sz: 4.2, color: '#365d4d' },
    { angle: 0.58, radius: 45, sx: 12.0, sz: 4.4, color: '#5a5140' },
    { angle: 1.96, radius: 58, sx: 13.4, sz: 4.7, color: '#315647' },
    { angle: 3.12, radius: 50, sx: 11.5, sz: 4.1, color: '#426757' },
    { angle: 4.48, radius: 42, sx: 10.8, sz: 3.9, color: '#574c3d' },
    { angle: 5.44, radius: 64, sx: 13.2, sz: 4.5, color: '#2e5143' },
    { angle: 0.14, radius: 75, sx: 17.4, sz: 5.2, color: '#294b3f' },
    { angle: 3.92, radius: 76, sx: 16.2, sz: 5.0, color: '#3b5b4f' }
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
      color: index % 2 ? '#536453' : '#3e6253'
    };
  });

  const centralPlaza = [
    { position: [0, getTerrainHeight(0, 0) + 0.066, 0], rotation: 0, scale: [13.2, 13.2, 1], color: '#32473f' },
    { position: [0, getTerrainHeight(0, 0) + 0.074, 0], rotation: Math.PI / 4, scale: [7.6, 7.6, 1], color: '#51493a' },
    { position: [0, getTerrainHeight(0, 0) + 0.083, 0], rotation: Math.PI / 8, scale: [4.2, 4.2, 1], color: '#38705e' }
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
      color: index % 7 === 0 ? '#9b7942' : index % 5 === 0 ? '#755f8c' : '#3f715c'
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

  const treeCount = visualQuality === 'low' ? 10 : 24;
  const trees = Array.from({ length: treeCount }, (_, index) => {
    const cluster = index % 5;
    const baseAngle = cluster * Math.PI * 2 / 5 + 0.36;
    const angle = baseAngle + (Math.floor(index / 5) - 1.5) * 0.09 + Math.sin(index * 1.3) * 0.035;
    const radius = 82 + (index % 4) * 7.8 + Math.cos(index * 0.9) * 2.6;
    const scale = 1.08 + (index % 4) * 0.13 + (index % 7 === 0 ? 0.16 : 0);
    return {
      position: place(angle, radius, 0.04),
      rotation: -angle + Math.PI / 2,
      scale,
      trunkColor: index % 2 ? '#40352d' : '#352d28',
      canopyColor: index % 3 === 0 ? '#254f43' : index % 3 === 1 ? '#315b49' : '#2a5548'
    };
  }).filter(tree => {
    const distance = tree.position.length();
    const hudLane = tree.position.z > 18 && Math.abs(tree.position.x) < 70;
    return distance > 72 && distance < ARENA_RADIUS - 4 && !hudLane;
  });

  const rockCount = visualQuality === 'low' ? 6 : 16;
  const rocks = Array.from({ length: rockCount }, (_, index) => {
    const angle = index * 1.91 + 0.44;
    const radius = 36 + (index % 9) * 7.2 + Math.sin(index * 1.15) * 1.6;
    return {
      position: place(angle, radius, 0.12),
      rotation: -angle + Math.PI / 2 + (index % 2 ? 0.28 : -0.22),
      scale: [0.62 + (index % 3) * 0.1, 0.22 + (index % 2) * 0.04, 0.48 + (index % 4) * 0.08],
      color: index % 3 === 0 ? '#647069' : '#53655e'
    };
  }).filter(rock => rock.position.length() > 30 && rock.position.length() < ARENA_RADIUS - 14);

  const grassCount = visualQuality === 'low' ? 12 : 34;
  const grassTufts = Array.from({ length: grassCount }, (_, index) => {
    const angle = index * 2.12 + 0.18;
    const radius = 32 + (index % 28) * 2.85 + Math.cos(index * 1.32) * 1.1;
    return {
      position: place(angle, radius, 0.13),
      rotation: -angle + Math.PI / 2 + Math.sin(index) * 0.22,
      scale: [0.22 + (index % 4) * 0.035, 0.44 + (index % 3) * 0.05, 0.22],
      color: index % 5 === 0 ? '#625941' : '#37644f'
    };
  }).filter(tuft => tuft.position.length() > 26 && tuft.position.length() < ARENA_RADIUS - 12);

  const bushes = Array.from({ length: visualQuality === 'low' ? 10 : 24 }, (_, index) => {
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
      color: index % 4 === 0 ? '#35604d' : index % 3 === 0 ? '#2d5748' : '#3d6552'
    };
  }).filter(bush => {
    const distance = bush.position.length();
    return distance > 30 && distance < ARENA_RADIUS - 12 && !(Math.abs(bush.position.x) < 18 && Math.abs(bush.position.z) < 18);
  });

  const edgeShadePatches = Array.from({ length: visualQuality === 'low' ? 5 : 14 }, (_, index) => {
    const angle = index * Math.PI * 2 / (visualQuality === 'low' ? 5 : 14) + 0.18;
    const radius = 96 + (index % 2) * 5.4;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return {
      position: [x, getTerrainHeight(x, z) + 0.048, z],
      rotation: -angle + Math.PI / 2 + Math.sin(index * 0.8) * 0.18,
      scale: [24 + (index % 3) * 5.5, 9.2 + (index % 2) * 2.1, 1],
      color: index % 2 ? '#28472e' : '#345637'
    };
  });

  const pondSeeds = [
    { angle: -2.62, radius: 68, sx: 5.6, sz: 2.15, color: '#3f7a70' },
    { angle: -0.92, radius: 82, sx: 4.8, sz: 1.95, color: '#487f75' },
    { angle: 1.14, radius: 72, sx: 5.2, sz: 2.2, color: '#4b8065' }
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
    color: index % 2 ? '#8ea879' : '#84aaa2'
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
        color: index % 2 ? '#5f654e' : '#747057'
      };
    }).filter(slab => {
      const distance = Math.hypot(slab.position[0], slab.position[2]);
      return distance > 19 && distance < ARENA_RADIUS - 18;
    })
  ];

  const runeCrystals = [
    ...Array.from({ length: visualQuality === 'low' ? 4 : 8 }, (_, index) => {
      const angle = index * Math.PI * 2 / (visualQuality === 'low' ? 4 : 8) + 0.42;
      const radius = 43 + (index % 2) * 8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.42, z],
        rotation: [0.24, -angle, 0.16],
        scale: [0.18 + (index % 2) * 0.05, 0.34 + (index % 3) * 0.08, 0.18 + (index % 2) * 0.05],
        color: index % 3 === 0 ? '#9f8d4f' : index % 3 === 1 ? '#5f8a56' : '#548c93'
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
    groveFloorPatches,
    leafLitter,
    rootStrips,
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

export function createRuneCircuitLandmarkLayout(visualQuality = 'balanced') {
  const place = (site, radialOffset = 0, lateralOffset = 0, yOffset = 0) => {
    const radius = site.radius + radialOffset;
    const x = Math.cos(site.angle) * radius - Math.sin(site.angle) * lateralOffset;
    const z = Math.sin(site.angle) * radius + Math.cos(site.angle) * lateralOffset;
    return [x, getTerrainHeight(x, z) + yOffset, z];
  };
  const yaw = site => Math.PI / 2 - site.angle;
  const stone = '#46554d';
  const edgeStone = '#667067';
  const accentColor = site => new THREE.Color(site.color).lerp(new THREE.Color('#738078'), 0.58).getStyle();
  const stepCount = visualQuality === 'low' ? 2 : 4;

  const lowerBases = SHRINE_SITES.map(site => ({
    position: place(site, 0, 0, 0.22),
    rotation: [0, yaw(site), 0],
    scale: [6.4, 0.44, 5.2],
    color: stone
  }));
  const upperBases = SHRINE_SITES.map(site => ({
    position: place(site, 0, 0, 0.52),
    rotation: [0, yaw(site) + Math.PI / 4, 0],
    scale: [4.7, 0.28, 4.7],
    color: accentColor(site)
  }));
  const approachSteps = SHRINE_SITES.flatMap(site => Array.from({ length: stepCount }, (_, index) => ({
    position: place(site, -4.2 - index * 2.15, 0, 0.12),
    rotation: [0, yaw(site), 0],
    scale: [3.5 - index * 0.18, 0.2, 1.55],
    color: index % 2 ? '#3d4b45' : edgeStone
  })));
  const pylons = SHRINE_SITES.flatMap(site => [-1, 1].map(side => ({
    position: place(site, 1.05, side * 3.45, 2.45),
    rotation: [0.04, yaw(site), side * 0.055],
    scale: [0.82, 4.4, 0.9],
    color: side > 0 ? edgeStone : '#59655d'
  })));
  const pylonCaps = SHRINE_SITES.flatMap(site => [-1, 1].map(side => ({
    position: place(site, 1.05, side * 3.45, 4.86),
    rotation: [0.18, yaw(site) + Math.PI / 4, side * 0.08],
    scale: [0.92, 0.92, 0.92],
    color: site.color
  })));
  const lintels = SHRINE_SITES.map(site => ({
    position: place(site, 1.05, 0, 4.58),
    rotation: [0, yaw(site), 0],
    scale: [7.35, 0.42, 0.72],
    color: accentColor(site)
  }));
  const rankStones = visualQuality === 'low' ? [] : SHRINE_SITES.flatMap(site => (
    Array.from({ length: site.order }, (_, index) => ({
      position: place(site, -2.25, (index - (site.order - 1) / 2) * 0.72, 0.79),
      rotation: [0.18, yaw(site) + Math.PI / 4, 0.18],
      scale: [0.23, 0.34, 0.23],
      color: site.color
    }))
  ));
  const floorRings = SHRINE_SITES.map(site => ({
    position: place(site, 0, 0, 0.755),
    rotation: yaw(site),
    scale: [5.1, 5.1, 1],
    color: site.color
  }));
  const routeRuneCount = visualQuality === 'low' ? 2 : 5;
  const routeRunes = SHRINE_SITES.flatMap(site => (
    Array.from({ length: routeRuneCount }, (_, index) => {
      const progress = (index + 1) / (routeRuneCount + 1);
      const radius = 17 + (site.radius - 28) * progress;
      return {
        position: place(site, radius - site.radius, 0, 0.085),
        rotation: yaw(site) + Math.PI / 4,
        scale: [0.78, 0.78, 1],
        color: site.color
      };
    })
  ));

  return {
    lowerBases,
    upperBases,
    approachSteps,
    pylons,
    pylonCaps,
    lintels,
    rankStones,
    floorRings,
    routeRunes
  };
}
