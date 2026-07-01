import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { IMPORTED_ENV_MODEL_URLS } from '../config/assets.js';
import { MAP_CLIFFS, SHRINE_SITES } from '../config/gameData.js';
import { ARENA_RADIUS } from '../config/gameTuning.js';
import { getTerrainHeight } from '../systems/terrain.js';
import { StaticModelInstances } from './StaticModelInstances.jsx';

export function ImportedForestBattlefield({ visualQuality = 'high' }) {
  const transforms = useMemo(() => {
    const density = visualQuality === 'low' ? 0 : visualQuality === 'balanced' ? 0.3 : 0.56;
    const treeDensity = visualQuality === 'low' ? 0 : visualQuality === 'balanced' ? 0.24 : 0.52;
    const count = base => Math.max(1, Math.round(base * density));
    const countTree = base => Math.max(1, Math.round(base * treeDensity));

    const place = (angle, radius, scale, yOffset = 0.03, rotationJitter = 0.18) => {
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: new THREE.Vector3(x, getTerrainHeight(x, z) + yOffset, z),
        rotation: -angle + Math.PI / 2 + Math.sin(angle * 3.1 + radius * 0.04) * rotationJitter,
        scale
      };
    };

    const withModelScale = (transform, width = 1, height = 1, depth = width) => ({
      ...transform,
      modelScale: [transform.scale * width, transform.scale * height, transform.scale * depth]
    });

    const readableClear = transform => {
      const { x, z } = transform.position;
      const distance = Math.hypot(x, z);
      const centerCombat = distance < 44;
      const foregroundBlock = z < -58 && Math.abs(x) < 76;
      const upperHudLane = z > 66 && x < -18 && Math.abs(x) < 92;
      const shrineLane = SHRINE_SITES.some(site => {
        const sx = Math.cos(site.angle) * site.radius;
        const sz = Math.sin(site.angle) * site.radius;
        return Math.hypot(x - sx, z - sz) < 8.5;
      });
      return !centerCombat && !foregroundBlock && !upperHudLane && !shrineLane;
    };

    const outerBirchCount = countTree(15);
    const outerPineCount = countTree(13);

    const outerBirches = Array.from({ length: outerBirchCount }, (_, index) => {
      const angle = index * Math.PI * 2 / outerBirchCount + 0.14 + Math.sin(index * 1.41) * 0.08;
      const radius = 86 + (index % 5) * 3.0 + Math.cos(index * 0.87) * 1.2;
      const transform = place(angle, radius, 1.12 + (index % 3) * 0.09, -0.04, 0.12);
      transform.shadowWidth = 11.2 + (index % 3) * 1.8;
      transform.shadowDepth = 5.1 + (index % 2) * 0.9;
      return withModelScale(transform, 0.86, 0.94, 0.86);
    }).filter(readableClear);

    const outerPines = Array.from({ length: outerPineCount }, (_, index) => {
      const angle = index * Math.PI * 2 / outerPineCount + 0.42 + Math.sin(index * 0.91) * 0.08;
      const radius = 90 + (index % 4) * 2.8 + Math.sin(index * 1.16) * 1.1;
      const transform = place(angle, radius, 1.02 + (index % 4) * 0.08, -0.06, 0.1);
      transform.shadowWidth = 11.8 + (index % 3) * 1.5;
      transform.shadowDepth = 5.2 + (index % 2) * 0.8;
      return withModelScale(transform, 0.84, 0.92, 0.84);
    }).filter(readableClear);

    const featureGroves = [0.18, 0.74, 1.34, 2.78, 5.58].map((angle, index) => {
      const radius = index % 2 ? 68 : 78;
      const transform = place(angle, radius, 0.96 + index * 0.04, -0.04, 0.08);
      transform.shadowWidth = 7.8 + index * 0.55;
      transform.shadowDepth = 3.6 + (index % 2) * 0.4;
      return withModelScale(transform, 0.74, 0.82, 0.74);
    }).filter(readableClear);

    const shrineGroves = SHRINE_SITES.flatMap((site, siteIndex) => Array.from({ length: visualQuality === 'high' ? 2 : 1 }, (_, index) => {
      const side = index === 0 ? -1 : 1;
      const angle = site.angle + side * (0.25 + siteIndex * 0.01) + Math.sin(siteIndex * 1.8 + index) * 0.04;
      const radius = site.radius + 17.5 + (index % 2) * 3.5;
      const transform = place(angle, radius, 0.54 + siteIndex * 0.025, -0.05, 0.1);
      transform.shadowWidth = 7.6 + siteIndex * 0.35;
      transform.shadowDepth = 3.4 + index * 0.4;
      return withModelScale(transform, 0.54, 0.62, 0.54);
    })).filter(readableClear);

    const rockClusters = Array.from({ length: count(18) }, (_, index) => {
      const angle = index * 1.47 + 0.3 + Math.sin(index * 1.37) * 0.12;
      const radius = 62 + (index % 11) * 4.2 + Math.cos(index * 1.21) * 1.7;
      const transform = place(angle, radius, 0.56 + (index % 5) * 0.08, 0.02, 0.2);
      transform.shadowWidth = 3.7 + (index % 3) * 0.75;
      transform.shadowDepth = 2.0 + (index % 2) * 0.34;
      return withModelScale(transform, 0.58, 0.56, 0.58);
    }).filter(transform => readableClear(transform) && transform.position.length() < ARENA_RADIUS - 11);

    const barrierRocks = MAP_CLIFFS.flatMap((cliff, cliffIndex) => [-0.42, 0.18, 0.52].map((offset, shardIndex) => {
      const x = cliff.x + Math.cos(cliffIndex * 1.7) * offset * cliff.w;
      const z = cliff.z + Math.sin(cliffIndex * 1.3) * offset * cliff.d;
      const transform = {
        position: new THREE.Vector3(x, getTerrainHeight(x, z) + 0.04, z),
        rotation: cliffIndex * 0.72 + shardIndex * 0.56,
        scale: 0.48 + shardIndex * 0.06 + (cliffIndex % 2) * 0.03,
        shadowWidth: 3.2 + shardIndex * 0.4,
        shadowDepth: 1.8 + shardIndex * 0.28
      };
      return withModelScale(transform, 0.5, 0.48, 0.5);
    }));

    const bushes = Array.from({ length: count(24) }, (_, index) => {
      const angle = index * 1.13 + 0.26 + Math.cos(index * 1.4) * 0.1;
      const radius = 50 + (index % 16) * 3.7 + Math.sin(index * 1.9) * 1.5;
      const transform = place(angle, radius, 0.64 + (index % 4) * 0.07, 0.01, 0.22);
      transform.shadowWidth = 2.8 + (index % 3) * 0.35;
      transform.shadowDepth = 1.6 + (index % 2) * 0.25;
      return withModelScale(transform, 0.62, 0.58, 0.62);
    }).filter(transform => readableClear(transform) && transform.position.length() < ARENA_RADIUS - 8);

    const canopies = [...outerBirches, ...outerPines, ...shrineGroves, ...featureGroves];
    const ground = [...canopies, ...rockClusters, ...barrierRocks, ...bushes];

    return { outerBirches, outerPines, shrineGroves, featureGroves, rockClusters, barrierRocks, bushes, canopies, ground };
  }, [visualQuality]);

  return (
    <group>
      <ImportedForestGroundShadows transforms={transforms.ground} />
      <StaticModelInstances url={IMPORTED_ENV_MODEL_URLS.birchTrees} transforms={[...transforms.outerBirches, ...transforms.featureGroves.filter((_, index) => index % 2 === 0), ...transforms.shrineGroves.filter((_, index) => index % 2 === 0)]} normalizeOrigin materialColor="#c8e5a7" />
      <StaticModelInstances url={IMPORTED_ENV_MODEL_URLS.pineTrees} transforms={[...transforms.outerPines, ...transforms.featureGroves.filter((_, index) => index % 2 === 1), ...transforms.shrineGroves.filter((_, index) => index % 2 === 1)]} normalizeOrigin materialColor="#89bd78" />
      <StaticModelInstances url={IMPORTED_ENV_MODEL_URLS.rocks} transforms={[...transforms.rockClusters, ...transforms.barrierRocks]} normalizeOrigin materialColor="#c5b890" />
      <StaticModelInstances url={IMPORTED_ENV_MODEL_URLS.bushes} transforms={transforms.bushes} normalizeOrigin receiveShadow materialColor="#95d071" />
      {visualQuality === 'high' && <ImportedForestLightFlecks transforms={transforms.canopies} />}
    </group>
  );
}

function ImportedForestGroundShadows({ transforms }) {
  const shadowRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3()
  }), []);

  useEffect(() => {
    if (!shadowRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.052;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation));
      local.matrix.compose(
        local.pos,
        local.quat,
        local.scale.set(transform.shadowWidth ?? 3.5, transform.shadowDepth ?? 1.8, 1)
      );
      shadowRef.current.setMatrixAt(index, local.matrix);
    });
    shadowRef.current.count = transforms.length;
    shadowRef.current.instanceMatrix.needsUpdate = true;
  }, [local, transforms]);

  return (
    <instancedMesh ref={shadowRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <circleGeometry args={[1, 32]} />
      <meshBasicMaterial color="#142316" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

function ImportedForestLightFlecks({ transforms }) {
  const fleckRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!fleckRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.08;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation + (index % 3) * 0.25));
      local.matrix.compose(
        local.pos,
        local.quat,
        local.scale.set((transform.shadowWidth ?? 6) * 0.34, 0.08 + (index % 2) * 0.03, 1)
      );
      fleckRef.current.setMatrixAt(index, local.matrix);
      local.color.set(index % 4 === 0 ? '#d5ae62' : '#92c66d');
      fleckRef.current.setColorAt(index, local.color);
    });
    fleckRef.current.count = transforms.length;
    fleckRef.current.instanceMatrix.needsUpdate = true;
    if (fleckRef.current.instanceColor) fleckRef.current.instanceColor.needsUpdate = true;
  }, [local, transforms]);

  return (
    <instancedMesh ref={fleckRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}
