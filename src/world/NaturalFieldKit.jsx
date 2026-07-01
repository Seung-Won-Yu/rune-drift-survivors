import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { NATURE_MODEL_URLS } from '../config/assets.js';
import { ART_TOKENS, SHRINE_SITES } from '../config/gameData.js';
import { ARENA_RADIUS } from '../config/gameTuning.js';
import { getTerrainHeight } from '../systems/terrain.js';
import { StaticModelInstances } from './StaticModelInstances.jsx';

export function NaturalFieldKit({ visualQuality = 'high' }) {
  const transforms = useMemo(() => {
    const density = visualQuality === 'low' ? 0.1 : visualQuality === 'balanced' ? 0.2 : 0.3;
    const treeDensity = visualQuality === 'low' ? 0.035 : visualQuality === 'balanced' ? 0.065 : 0.11;
    const count = base => Math.max(1, Math.round(base * density));
    const countTree = base => Math.max(1, Math.round(base * treeDensity));
    const place = (angle, radius, scale, yOffset = 0.03, tilt = 0) => {
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: new THREE.Vector3(x, getTerrainHeight(x, z) + yOffset, z),
        rotation: -angle + Math.PI / 2 + Math.sin(angle * 2.7) * 0.22,
        scale,
        tilt
      };
    };
    const withModelScale = (transform, width = 1, height = 1, depth = width) => ({
      ...transform,
      modelScale: [transform.scale * width, transform.scale * height, transform.scale * depth]
    });

    const sightlineClear = item => {
      const distance = item.position.length();
      const cameraLane = item.position.z > 8 && Math.abs(item.position.x) < 86;
      const playLane = Math.abs(item.position.z) < 50 && Math.abs(item.position.x) < 58;
      const nearCenter = distance < 72;
      return !nearCenter && !cameraLane && !(playLane && distance < 98);
    };

    const lowCoverClear = item => {
      const lane = item.position.z > 14 && Math.abs(item.position.x) < 58;
      const combatCore = item.position.length() < 20;
      return !lane && !combatCore;
    };

    const rocks = Array.from({ length: count(30) }, (_, index) => {
      const angle = index * 1.17 + 0.42 + Math.sin(index * 0.73) * 0.08;
      const radius = 40 + (index % 18) * 4.1 + Math.sin(index * 1.91) * 1.7;
      const distanceScale = radius > 78 ? 1 : 0.74;
      return place(angle, radius, (1.55 + (index % 5) * 0.34) * distanceScale, 0.02, index % 3 === 0 ? 0.08 : 0);
    }).filter(item => item.position.length() < ARENA_RADIUS - 7 && item.position.length() > 38 && lowCoverClear(item));

    const ringTrees = Array.from({ length: countTree(22) }, (_, index) => {
      const angle = index * 1.37 + (index % 4) * 0.18 + Math.sin(index * 1.13) * 0.1;
      const radius = 109 + (index % 7) * 1.35 + Math.sin(index * 0.81) * 1.25;
      const scale = radius > 113 ? 3.45 + (index % 4) * 0.22 : 2.72 + (index % 4) * 0.16 + Math.sin(index * 1.37) * 0.05;
      const tree = place(angle, radius, scale, -0.04, index % 5 === 0 ? 0.035 : 0);
      return withModelScale(tree, 0.82, radius > 113 ? 0.74 : 0.7, 0.82);
    }).filter(item => item.position.length() < ARENA_RADIUS - 2.8 && sightlineClear(item));

    const groveTrees = SHRINE_SITES.flatMap((site, siteIndex) => Array.from({ length: visualQuality === 'low' ? 1 : 2 }, (_, index) => {
      const offset = index === 0 ? -1 : 1;
      const angle = site.angle + offset * 0.22 + (siteIndex % 2 ? -0.06 : 0.06) + Math.sin(siteIndex * 1.9 + index) * 0.045;
      const radius = site.radius + 22.5 + (index % 2) * 4.8 + Math.cos(siteIndex * 2.2 + index) * 1.35;
      const scale = 2.14 + (index % 2) * 0.18 + siteIndex * 0.035 + Math.sin(siteIndex + index * 2.4) * 0.04;
      const tree = place(angle, radius, scale, -0.04, offset * 0.025);
      return withModelScale(tree, 0.86, 0.78, 0.86);
    })).filter(item => item.position.length() < ARENA_RADIUS - 3.5 && sightlineClear(item));

    const trees = [...ringTrees, ...groveTrees];

    const bushes = Array.from({ length: count(34) }, (_, index) => {
      const angle = index * 0.97 + 0.17 + Math.sin(index * 1.23) * 0.1;
      const radius = 38 + (index % 22) * 3.4 + Math.cos(index * 1.59) * 1.4;
      const bush = place(angle, radius, 1.02 + (index % 4) * 0.13, 0.01, 0);
      return withModelScale(bush, 1.32, 0.7, 1.08);
    }).filter(item => item.position.length() < ARENA_RADIUS - 5.5 && item.position.length() > 36 && lowCoverClear(item));

    const grass = Array.from({ length: count(74) }, (_, index) => {
      const angle = index * 1.61 + (index % 7) * 0.09 + Math.sin(index * 0.97) * 0.07;
      const radius = 20 + (index % 35) * 2.75 + Math.sin(index * 1.41) * 1.25;
      return place(angle, radius, 0.62 + (index % 5) * 0.08, 0.025, 0);
    }).filter(item => item.position.length() < ARENA_RADIUS - 6 && item.position.length() > 18);

    const moss = Array.from({ length: count(40) }, (_, index) => {
      const angle = index * 2.03 + (index % 5) * 0.07 + Math.cos(index * 1.17) * 0.06;
      const radius = 16 + (index % 38) * 2.48 + Math.sin(index * 1.83) * 1.2;
      const transform = place(angle, radius, 1.0 + (index % 6) * 0.18, 0.055, 0);
      transform.width = 1.4 + (index % 5) * 0.32;
      transform.depth = 0.46 + (index % 4) * 0.12;
      transform.color = index % 4 === 0 ? '#b99755' : index % 3 === 0 ? '#6f9659' : '#425d3f';
      transform.opacity = index % 4 === 0 ? 0.06 : 0.095;
      return transform;
    }).filter(item => item.position.length() < ARENA_RADIUS - 8 && lowCoverClear(item));

    const pebbles = Array.from({ length: count(28) }, (_, index) => {
      const angle = index * 2.41 + (index % 7) * 0.11 + Math.sin(index * 0.69) * 0.06;
      const radius = 22 + (index % 42) * 2.2 + Math.cos(index * 1.33) * 1.1;
      const transform = place(angle, radius, 1, 0.09, 0);
      transform.rotation += (index % 2 ? -1 : 1) * 0.24;
      transform.size = 0.22 + (index % 5) * 0.055;
      transform.flatness = 0.09 + (index % 3) * 0.025;
      transform.color = index % 5 === 0 ? '#8a805e' : index % 3 === 0 ? '#778367' : '#68755f';
      return transform;
    }).filter(item => item.position.length() < ARENA_RADIUS - 9 && item.position.length() > 24 && lowCoverClear(item));

    const fallenTrunks = Array.from({ length: count(8) }, (_, index) => {
      const angle = index * 1.49 + 0.34 + Math.sin(index * 1.11) * 0.09;
      const radius = 48 + (index % 14) * 4.5 + Math.cos(index * 1.47) * 1.5;
      const transform = place(angle, radius, 1, 0.28, 0);
      transform.rotation += (index % 2 ? -1 : 1) * (0.72 + (index % 3) * 0.18);
      transform.length = 3.2 + (index % 4) * 0.52;
      transform.radius = 0.18 + (index % 3) * 0.035;
      transform.color = index % 4 === 0 ? '#6f6248' : index % 3 === 0 ? '#4c5b45' : '#684f3f';
      transform.rootColor = index % 3 === 0 ? '#7a7855' : '#5d7049';
      return transform;
    }).filter(item => item.position.length() < ARENA_RADIUS - 9 && item.position.length() > 42 && lowCoverClear(item));

    const leafLitter = Array.from({ length: count(24) }, (_, index) => {
      const angle = index * 1.91 + 0.28 + (index % 6) * 0.05 + Math.sin(index * 1.02) * 0.07;
      const radius = 52 + (index % 25) * 2.45 + Math.cos(index * 1.76) * 1.1;
      const transform = place(angle, radius, 1, 0.066, 0);
      transform.rotation += (index % 4) * 0.27;
      transform.width = 1.15 + (index % 5) * 0.26;
      transform.depth = 0.34 + (index % 4) * 0.11;
      transform.color = index % 5 === 0 ? '#857b58' : index % 3 === 0 ? '#4f744f' : '#676344';
      transform.opacity = 0.09 + (index % 3) * 0.014;
      return transform;
    }).filter(item => item.position.length() < ARENA_RADIUS - 8 && item.position.length() > 48 && lowCoverClear(item));

    const stumps = Array.from({ length: countTree(8) }, (_, index) => {
      const angle = index * 1.73 + 0.62 + Math.sin(index * 1.29) * 0.08;
      const radius = 64 + (index % 13) * 3.8 + Math.cos(index * 0.93) * 1.25;
      const transform = place(angle, radius, 1, 0.23, index % 2 ? 0.06 : -0.04);
      transform.radius = 0.34 + (index % 4) * 0.055;
      transform.height = 0.48 + (index % 3) * 0.1;
      transform.color = index % 3 === 0 ? '#6e5940' : '#554936';
      transform.ringColor = index % 4 === 0 ? '#b99755' : '#2c3b2d';
      return transform;
    }).filter(item => item.position.length() < ARENA_RADIUS - 8 && item.position.length() > 56 && lowCoverClear(item));

    const runeSprouts = Array.from({ length: count(22) }, (_, index) => {
      const site = SHRINE_SITES[index % SHRINE_SITES.length];
      const angle = site.angle + (index % 9 - 4) * 0.045 + Math.sin(index * 1.7) * 0.11;
      const radius = site.radius + 7.5 + (index % 6) * 2.45 + Math.cos(index * 1.4) * 0.9;
      const transform = place(angle, radius, 1, 0.11, 0);
      transform.height = 0.34 + (index % 3) * 0.08;
      transform.width = 0.08 + (index % 2) * 0.02;
      transform.color = index % 3 === 0 ? '#9fbd61' : index % 3 === 1 ? '#7cab5e' : '#d4ae60';
      transform.opacity = 0.28 + (index % 3) * 0.05;
      return transform;
    }).filter(item => item.position.length() < ARENA_RADIUS - 7 && lowCoverClear(item));

    const saplings = Array.from({ length: countTree(16) }, (_, index) => {
      const site = SHRINE_SITES[index % SHRINE_SITES.length];
      const groveBias = index % 2 === 0;
      const angle = groveBias
        ? site.angle + (index % 11 - 5) * 0.095 + Math.sin(index * 1.08) * 0.05
        : index * 1.43 + Math.cos(index * 0.93) * 0.08;
      const radius = groveBias
        ? site.radius + 16 + (index % 7) * 2.7 + Math.sin(index * 1.4) * 1.1
        : 62 + (index % 18) * 2.85 + Math.cos(index * 1.21) * 1.25;
      const transform = place(angle, radius, 1, 0.05, (index % 2 ? -1 : 1) * 0.055);
      transform.trunkRadius = 0.09 + (index % 3) * 0.018;
      transform.height = 0.82 + (index % 5) * 0.14;
      transform.canopyWidth = 0.46 + (index % 4) * 0.09;
      transform.canopyHeight = 0.68 + (index % 3) * 0.11;
      transform.trunkColor = index % 3 === 0 ? '#6b5741' : '#584638';
      transform.canopyColor = index % 5 === 0
        ? '#5aa592'
        : index % 3 === 0
          ? '#3f7b66'
          : '#47745f';
      return transform;
    }).filter(item => item.position.length() < ARENA_RADIUS - 6 && item.position.length() > 54 && lowCoverClear(item));

    const wildflowers = Array.from({ length: count(24) }, (_, index) => {
      const site = SHRINE_SITES[index % SHRINE_SITES.length];
      const groveBias = index % 3 === 0;
      const angle = groveBias
        ? site.angle + (index % 13 - 6) * 0.07 + Math.sin(index * 1.33) * 0.05
        : index * 2.29 + (index % 5) * 0.08 + Math.cos(index * 0.86) * 0.06;
      const radius = groveBias
        ? site.radius + 13 + (index % 8) * 2.8 + Math.cos(index * 1.16) * 0.9
        : 34 + (index % 30) * 2.65 + Math.sin(index * 1.52) * 1.1;
      const transform = place(angle, radius, 1, 0.082, 0);
      transform.size = 0.09 + (index % 4) * 0.022;
      transform.color = index % 5 === 0
        ? ART_TOKENS.wornGold
        : index % 3 === 0
          ? '#bd91c4'
          : index % 2 === 0
            ? '#9cc96d'
            : '#8fb36d';
      transform.opacity = 0.16 + (index % 3) * 0.035;
      return transform;
    }).filter(item => item.position.length() < ARENA_RADIUS - 8 && item.position.length() > 28 && lowCoverClear(item));

    const rockLichen = rocks
      .filter((_, index) => index % 2 === 0)
      .map((rock, index) => {
        const transform = {
          ...rock,
          position: rock.position.clone(),
          rotation: rock.rotation + (index % 3) * 0.34,
          width: 0.44 + (index % 4) * 0.12,
          depth: 0.22 + (index % 3) * 0.08,
          color: index % 4 === 0 ? '#8ea35f' : index % 3 === 0 ? '#8f8658' : '#4d704b'
        };
        transform.position.y += rock.scale * 0.18 + 0.04;
        return transform;
      });

    return { rocks, trees, bushes, grass, moss, pebbles, fallenTrunks, leafLitter, stumps, runeSprouts, saplings, wildflowers, rockLichen };
  }, [visualQuality]);

  const rockLarge = useMemo(() => transforms.rocks.filter((_, index) => index % 3 !== 0), [transforms]);
  const rockTall = useMemo(() => transforms.rocks.filter((_, index) => index % 3 === 0), [transforms]);
  const pineTall = useMemo(() => transforms.trees.filter((_, index) => index % 3 === 0), [transforms]);
  const pineRound = useMemo(() => transforms.trees.filter((_, index) => index % 3 === 1), [transforms]);
  const treeDefault = useMemo(() => transforms.trees.filter((_, index) => index % 3 === 2), [transforms]);
  const castNatureShadows = false;
  const receiveNatureShadows = false;

  return (
    <group>
      {visualQuality === 'high' && (
        <>
          <StaticModelInstances url={NATURE_MODEL_URLS.rockLargeA} transforms={rockLarge} castShadow={castNatureShadows} receiveShadow={receiveNatureShadows} materialColor="#7d9066" />
          <StaticModelInstances url={NATURE_MODEL_URLS.rockTall} transforms={rockTall} castShadow={castNatureShadows} receiveShadow={receiveNatureShadows} materialColor="#81956d" />
          <StaticModelInstances url={NATURE_MODEL_URLS.pineTall} transforms={pineTall} castShadow={castNatureShadows} receiveShadow={receiveNatureShadows} materialColor="#4f9368" />
          <StaticModelInstances url={NATURE_MODEL_URLS.pineRound} transforms={pineRound} castShadow={castNatureShadows} receiveShadow={receiveNatureShadows} materialColor="#5aa56d" />
          <StaticModelInstances url={NATURE_MODEL_URLS.treeDefault} transforms={treeDefault} castShadow={castNatureShadows} receiveShadow={receiveNatureShadows} materialColor="#5f9a64" />
          <StaticModelInstances url={NATURE_MODEL_URLS.bushLarge} transforms={transforms.bushes} castShadow={castNatureShadows} receiveShadow={receiveNatureShadows} materialColor="#6cae62" />
          <StaticModelInstances url={NATURE_MODEL_URLS.grassLarge} transforms={transforms.grass} receiveShadow={receiveNatureShadows} materialColor="#8fbd62" />
        </>
      )}
      <FieldSaplingClusters transforms={transforms.saplings} />
      {visualQuality === 'high' && <FallenTrunkMarks transforms={transforms.fallenTrunks} />}
      {visualQuality === 'high' && <ForestStumpClusters transforms={transforms.stumps} />}
      <FieldMossPatches transforms={transforms.moss} />
      {visualQuality === 'high' && <FieldLeafLitter transforms={transforms.leafLitter} />}
      {visualQuality === 'high' && <FieldPebbleScatter transforms={transforms.pebbles} />}
      {visualQuality !== 'low' && <FieldWildflowerFlecks transforms={transforms.wildflowers} />}
      {visualQuality === 'high' && <RockLichenPatches transforms={transforms.rockLichen} />}
      <ShrineRuneSprouts transforms={transforms.runeSprouts} />
      {visualQuality === 'high' && <TreeCanopyShadows transforms={transforms.trees} />}
      {visualQuality === 'high' && <TreeCanopyHighlights transforms={transforms.trees} />}
      {visualQuality === 'high' && <TreeRootPatches transforms={transforms.trees} />}
    </group>
  );
}

function FieldSaplingClusters({ transforms }) {
  const trunkRef = useRef();
  const canopyRef = useRef();
  const shadowRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!trunkRef.current || !canopyRef.current || !shadowRef.current) return;
    transforms.forEach((transform, index) => {
      const groundY = getTerrainHeight(transform.position.x, transform.position.z);
      local.pos.copy(transform.position);
      local.pos.y = groundY + transform.height * 0.42;
      local.quat.setFromEuler(new THREE.Euler(transform.tilt, transform.rotation, transform.tilt * 0.7));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.trunkRadius, transform.height, transform.trunkRadius));
      trunkRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.trunkColor);
      trunkRef.current.setColorAt(index, local.color);

      local.pos.copy(transform.position);
      local.pos.y = groundY + transform.height + transform.canopyHeight * 0.48;
      local.quat.setFromEuler(new THREE.Euler(transform.tilt * 0.8, transform.rotation + index * 0.17, -transform.tilt * 0.5));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.canopyWidth, transform.canopyHeight, transform.canopyWidth * 0.9));
      canopyRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.canopyColor);
      canopyRef.current.setColorAt(index, local.color);

      local.pos.copy(transform.position);
      local.pos.y = groundY + 0.055;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.canopyWidth * 1.35, transform.canopyWidth * 0.82, 1));
      shadowRef.current.setMatrixAt(index, local.matrix);
      local.color.set('#335136');
      shadowRef.current.setColorAt(index, local.color);
    });
    [trunkRef.current, canopyRef.current, shadowRef.current].forEach(mesh => {
      mesh.count = transforms.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [local, transforms]);

  return (
    <group>
      <instancedMesh ref={shadowRef} args={[null, null, transforms.length]} frustumCulled={false}>
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial transparent opacity={0.08} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={trunkRef} args={[null, null, transforms.length]} frustumCulled={false} castShadow receiveShadow>
        <cylinderGeometry args={[1, 0.78, 1, 6]} />
        <meshStandardMaterial vertexColors roughness={0.94} metalness={0.02} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[null, null, transforms.length]} frustumCulled={false} castShadow receiveShadow>
        <coneGeometry args={[1, 1.45, 6]} />
        <meshStandardMaterial vertexColors roughness={0.88} metalness={0.01} />
      </instancedMesh>
    </group>
  );
}

function FallenTrunkMarks({ transforms }) {
  const trunkRef = useRef();
  const rootRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!trunkRef.current || !rootRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.28;
      local.quat.setFromEuler(new THREE.Euler(0, transform.rotation, Math.PI / 2 + (index % 2 ? 0.05 : -0.04)));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.radius, transform.length, transform.radius));
      trunkRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.color);
      trunkRef.current.setColorAt(index, local.color);

      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.058;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.length * 0.92, transform.radius * 3.8, 1));
      rootRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.rootColor);
      rootRef.current.setColorAt(index, local.color);
    });
    trunkRef.current.count = transforms.length;
    trunkRef.current.instanceMatrix.needsUpdate = true;
    if (trunkRef.current.instanceColor) trunkRef.current.instanceColor.needsUpdate = true;
    rootRef.current.count = transforms.length;
    rootRef.current.instanceMatrix.needsUpdate = true;
    if (rootRef.current.instanceColor) rootRef.current.instanceColor.needsUpdate = true;
  }, [local, transforms]);

  return (
    <group>
      <instancedMesh ref={rootRef} args={[null, null, transforms.length]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={trunkRef} args={[null, null, transforms.length]} frustumCulled={false} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial roughness={0.92} metalness={0.02} />
      </instancedMesh>
    </group>
  );
}

function ForestStumpClusters({ transforms }) {
  const stumpRef = useRef();
  const topRef = useRef();
  const rootFlareRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!stumpRef.current || !topRef.current || !rootFlareRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + transform.height * 0.5;
      local.quat.setFromEuler(new THREE.Euler(transform.tilt, transform.rotation, transform.tilt * 0.55));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.radius, transform.height, transform.radius * (0.92 + (index % 3) * 0.06)));
      stumpRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.color);
      stumpRef.current.setColorAt(index, local.color);

      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + transform.height + 0.045;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.radius * 1.1, transform.radius * 0.74, 1));
      topRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.ringColor);
      topRef.current.setColorAt(index, local.color);

      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.06;
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.radius * 2.6, transform.radius * 1.6, 1));
      rootFlareRef.current.setMatrixAt(index, local.matrix);
      local.color.set(index % 3 === 0 ? '#233527' : '#18261d');
      rootFlareRef.current.setColorAt(index, local.color);
    });
    [stumpRef.current, topRef.current, rootFlareRef.current].forEach(mesh => {
      mesh.count = transforms.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [local, transforms]);

  return (
    <group>
      <instancedMesh ref={rootFlareRef} args={[null, null, transforms.length]} frustumCulled={false}>
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial transparent opacity={0.16} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={stumpRef} args={[null, null, transforms.length]} frustumCulled={false} castShadow receiveShadow>
        <cylinderGeometry args={[1, 0.82, 1, 7]} />
        <meshStandardMaterial roughness={0.94} metalness={0.01} />
      </instancedMesh>
      <instancedMesh ref={topRef} args={[null, null, transforms.length]} frustumCulled={false}>
        <ringGeometry args={[0.42, 0.56, 18]} />
        <meshBasicMaterial transparent opacity={0.26} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function FieldMossPatches({ transforms }) {
  const patchRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!patchRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.064;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation));
      local.matrix.compose(
        local.pos,
        local.quat,
        local.scale.set(transform.width * transform.scale, transform.depth * transform.scale, 1)
      );
      patchRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.color);
      patchRef.current.setColorAt(index, local.color);
    });
    patchRef.current.count = transforms.length;
    patchRef.current.instanceMatrix.needsUpdate = true;
    if (patchRef.current.instanceColor) patchRef.current.instanceColor.needsUpdate = true;
  }, [local, transforms]);

  return (
    <instancedMesh ref={patchRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial vertexColors transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}

function FieldLeafLitter({ transforms }) {
  const leafRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!leafRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.066 + (index % 3) * 0.004;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.width, transform.depth, 1));
      leafRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.color);
      leafRef.current.setColorAt(index, local.color);
    });
    leafRef.current.count = transforms.length;
    leafRef.current.instanceMatrix.needsUpdate = true;
    if (leafRef.current.instanceColor) leafRef.current.instanceColor.needsUpdate = true;
  }, [local, transforms]);

  return (
    <instancedMesh ref={leafRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial vertexColors transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}

function FieldPebbleScatter({ transforms }) {
  const pebbleRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!pebbleRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.11;
      local.quat.setFromEuler(new THREE.Euler(0.08, transform.rotation, index % 2 ? 0.1 : -0.06));
      local.matrix.compose(
        local.pos,
        local.quat,
        local.scale.set(transform.size * 1.8, transform.flatness, transform.size * (1.0 + (index % 3) * 0.18))
      );
      pebbleRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.color);
      pebbleRef.current.setColorAt(index, local.color);
    });
    pebbleRef.current.count = transforms.length;
    pebbleRef.current.instanceMatrix.needsUpdate = true;
    if (pebbleRef.current.instanceColor) pebbleRef.current.instanceColor.needsUpdate = true;
  }, [local, transforms]);

  return (
    <instancedMesh ref={pebbleRef} args={[null, null, transforms.length]} frustumCulled={false} receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#ffffff" roughness={0.98} metalness={0.01} />
    </instancedMesh>
  );
}

function FieldWildflowerFlecks({ transforms }) {
  const flowerRef = useRef();
  const haloRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!flowerRef.current || !haloRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.105 + (index % 3) * 0.004;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation + index * 0.19));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.size * 1.45, transform.size * 0.9, 1));
      flowerRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.color);
      flowerRef.current.setColorAt(index, local.color);

      local.pos.y -= 0.035;
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.size * 3.0, transform.size * 1.65, 1));
      haloRef.current.setMatrixAt(index, local.matrix);
      haloRef.current.setColorAt(index, local.color);
    });
    [flowerRef.current, haloRef.current].forEach(mesh => {
      mesh.count = transforms.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [local, transforms]);

  return (
    <group>
      <instancedMesh ref={haloRef} args={[null, null, transforms.length]} frustumCulled={false}>
        <circleGeometry args={[1, 10]} />
        <meshBasicMaterial vertexColors transparent opacity={0.08} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={flowerRef} args={[null, null, transforms.length]} frustumCulled={false}>
        <ringGeometry args={[0.4, 0.78, 5]} />
        <meshBasicMaterial vertexColors transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function RockLichenPatches({ transforms }) {
  const lichenRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!lichenRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.quat.setFromEuler(new THREE.Euler(-0.72 + (index % 3) * 0.04, transform.rotation, (index % 2 ? -1 : 1) * 0.08));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.width, transform.depth, 1));
      lichenRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.color);
      lichenRef.current.setColorAt(index, local.color);
    });
    lichenRef.current.count = transforms.length;
    lichenRef.current.instanceMatrix.needsUpdate = true;
    if (lichenRef.current.instanceColor) lichenRef.current.instanceColor.needsUpdate = true;
  }, [local, transforms]);

  return (
    <instancedMesh ref={lichenRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <circleGeometry args={[1, 16]} />
      <meshBasicMaterial transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}

function ShrineRuneSprouts({ transforms }) {
  const sproutRef = useRef();
  const glowRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!sproutRef.current || !glowRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + transform.height * 0.5 + 0.08;
      local.quat.setFromEuler(new THREE.Euler(0.18, transform.rotation + index * 0.13, (index % 2 ? -1 : 1) * 0.18));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.width, transform.height, transform.width));
      sproutRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.color);
      sproutRef.current.setColorAt(index, local.color);

      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.07;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation));
      local.matrix.compose(local.pos, local.quat, local.scale.set(0.42 + (index % 3) * 0.08, 0.42 + (index % 2) * 0.06, 1));
      glowRef.current.setMatrixAt(index, local.matrix);
      glowRef.current.setColorAt(index, local.color);
    });
    [sproutRef.current, glowRef.current].forEach(mesh => {
      mesh.count = transforms.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [local, transforms]);

  return (
    <group>
      <instancedMesh ref={glowRef} args={[null, null, transforms.length]} frustumCulled={false}>
        <ringGeometry args={[0.28, 0.34, 4]} />
        <meshBasicMaterial vertexColors transparent opacity={0.16} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={sproutRef} args={[null, null, transforms.length]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial vertexColors transparent opacity={0.72} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function TreeRootPatches({ transforms }) {
  const rootPatchRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!rootPatchRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y = getTerrainHeight(transform.position.x, transform.position.z) + 0.057;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation + (index % 2 ? 0.2 : -0.16)));
      local.matrix.compose(
        local.pos,
        local.quat,
        local.scale.set(transform.scale * 0.94, transform.scale * 0.62, 1)
      );
      rootPatchRef.current.setMatrixAt(index, local.matrix);
      local.color.set(index % 4 === 0 ? '#6f6849' : index % 3 === 0 ? '#47613e' : '#2f432f');
      rootPatchRef.current.setColorAt(index, local.color);
    });
    rootPatchRef.current.count = transforms.length;
    rootPatchRef.current.instanceMatrix.needsUpdate = true;
    if (rootPatchRef.current.instanceColor) rootPatchRef.current.instanceColor.needsUpdate = true;
  }, [local, transforms]);

  return (
    <instancedMesh ref={rootPatchRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <circleGeometry args={[1, 24]} />
      <meshBasicMaterial color="#2f432f" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

function TreeCanopyHighlights({ transforms }) {
  const highlightRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!highlightRef.current) return;
    transforms.forEach((transform, index) => {
      const side = index % 2 ? -1 : 1;
      local.pos.copy(transform.position);
      local.pos.x += Math.cos(transform.rotation + side * 0.52) * transform.scale * 0.18;
      local.pos.y += transform.scale * (1.22 + (index % 3) * 0.04);
      local.pos.z += Math.sin(transform.rotation + side * 0.52) * transform.scale * 0.18;
      local.quat.setFromEuler(new THREE.Euler(0.55, transform.rotation + side * 0.22, side * 0.18));
      local.matrix.compose(
        local.pos,
        local.quat,
        local.scale.set(transform.scale * 0.22, transform.scale * 0.06, 1)
      );
      highlightRef.current.setMatrixAt(index, local.matrix);
      local.color.set(index % 4 === 0 ? '#a4c477' : index % 5 === 0 ? ART_TOKENS.wornGold : '#9bcf7a');
      highlightRef.current.setColorAt(index, local.color);
    });
    highlightRef.current.count = transforms.length;
    highlightRef.current.instanceMatrix.needsUpdate = true;
    if (highlightRef.current.instanceColor) highlightRef.current.instanceColor.needsUpdate = true;
  }, [local, transforms]);

  return (
    <instancedMesh ref={highlightRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}

function TreeCanopyShadows({ transforms }) {
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
      const shadowScale = Math.max(2.2, transform.scale * 0.72);
      local.matrix.compose(local.pos, local.quat, local.scale.set(shadowScale, shadowScale * 0.68, 1));
      shadowRef.current.setMatrixAt(index, local.matrix);
    });
    shadowRef.current.count = transforms.length;
    shadowRef.current.instanceMatrix.needsUpdate = true;
  }, [local, transforms]);

  return (
    <instancedMesh ref={shadowRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <circleGeometry args={[1, 28]} />
      <meshBasicMaterial color="#335136" transparent opacity={0.08} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}
