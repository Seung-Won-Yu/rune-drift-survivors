import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { ART_TOKENS } from '../../config/gameData.js';
import { MAX_ENEMIES } from '../../config/gameTuning.js';
import { getVisualBudget } from '../../hooks/useVisualQuality.js';
import { useVisualFrameGate } from '../../hooks/useVisualFrameGate.js';
import { getCombatEffectTextures } from '../combatEffectTextures.js';
import { syncCommonRoleAccents } from './syncCommonRoleAccents.js';
import { syncEnemyCoreAccents } from './syncEnemyCoreAccents.js';
import { syncThreatAccents } from './syncThreatAccents.js';

export function EnemyAccents({ enemiesRef, visualQuality = 'high' }) {
  const coreMesh = useRef();
  const flashMesh = useRef();
  const hitSparkMesh = useRef();
  const eyeMesh = useRef();
  const runnerTrailMesh = useRef();
  const runnerChevronMesh = useRef();
  const bruteMarkMesh = useRef();
  const brutePlateMesh = useRef();
  const bruteHornMesh = useRef();
  const golemShardMesh = useRef();
  const golemGroundMesh = useRef();
  const eliteCrownMesh = useRef();
  const eliteAuraMesh = useRef();
  const threatRingMesh = useRef();
  const chargeTellMesh = useRef();
  const meshes = useMemo(() => ({
    coreMesh,
    flashMesh,
    hitSparkMesh,
    eyeMesh,
    runnerTrailMesh,
    runnerChevronMesh,
    bruteMarkMesh,
    brutePlateMesh,
    bruteHornMesh,
    golemShardMesh,
    golemGroundMesh,
    eliteCrownMesh,
    eliteAuraMesh,
    threatRingMesh,
    chargeTellMesh
  }), []);
  const motionTrailTexture = useMemo(() => getCombatEffectTextures().motionTrail, []);
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    color: new THREE.Color(),
    pos: new THREE.Vector3(),
    euler: new THREE.Euler(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    yAxis: new THREE.Vector3(0, 1, 0),
    visibleEnemies: [],
    flashingEnemies: [],
    runnerEnemies: [],
    bruteEnemies: [],
    golemEnemies: [],
    eliteEnemies: [],
    threatEnemies: [],
    chargingEnemies: []
  }), []);
  const showDecor = visualQuality !== 'low';
  const shouldRenderVisualFrame = useVisualFrameGate(visualQuality, 30, 18);

  useFrame(state => {
    if (!shouldRenderVisualFrame(state.clock.elapsedTime)) return;
    const budget = getVisualBudget(visualQuality);
    const maxAccents = Math.min(MAX_ENEMIES, budget.enemyAccents);
    const time = state.clock.elapsedTime * 4;
    scratch.visibleEnemies.length = 0;
    scratch.flashingEnemies.length = 0;
    scratch.runnerEnemies.length = 0;
    scratch.bruteEnemies.length = 0;
    scratch.golemEnemies.length = 0;
    scratch.eliteEnemies.length = 0;
    scratch.threatEnemies.length = 0;
    scratch.chargingEnemies.length = 0;

    for (const enemy of enemiesRef.current) {
      const isPriority = enemy.kind === 'boss' || enemy.kind === 'elite';
      if (scratch.visibleEnemies.length < MAX_ENEMIES && (scratch.visibleEnemies.length < maxAccents || isPriority)) {
        scratch.visibleEnemies.push(enemy);
      }
      if (enemy.flash > 0 && scratch.flashingEnemies.length < maxAccents + 6) scratch.flashingEnemies.push(enemy);
      if (enemy.kind === 'runner' && scratch.runnerEnemies.length < maxAccents) scratch.runnerEnemies.push(enemy);
      if (enemy.kind === 'brute' && scratch.bruteEnemies.length < maxAccents) scratch.bruteEnemies.push(enemy);
      if (enemy.kind === 'golem' && scratch.golemEnemies.length < maxAccents) scratch.golemEnemies.push(enemy);
      if (enemy.kind === 'elite' && scratch.eliteEnemies.length < 8) scratch.eliteEnemies.push(enemy);
      if ((enemy.kind === 'boss' || enemy.kind === 'elite' || enemy.chargeTimer > 0) && scratch.threatEnemies.length < 12) {
        scratch.threatEnemies.push(enemy);
      }
      if ((enemy.chargeTimer ?? 0) > 0 && scratch.chargingEnemies.length < 8) scratch.chargingEnemies.push(enemy);
    }


    syncEnemyCoreAccents(meshes, scratch, time);
    syncCommonRoleAccents(meshes, scratch, showDecor, maxAccents);
    syncThreatAccents(meshes, scratch, showDecor, time);
  });

  return (
    <>
      <instancedMesh ref={threatRingMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <ringGeometry args={[0.86, 1, 4]} />
        <meshBasicMaterial transparent opacity={0.72} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={chargeTellMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 3]} />
        <meshBasicMaterial transparent opacity={0.52} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={coreMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial transparent opacity={0.82} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={flashMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <ringGeometry args={[0.62, 0.72, 28]} />
        <meshBasicMaterial vertexColors transparent opacity={0.46} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={hitSparkMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial vertexColors transparent opacity={0.86} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={eyeMesh} args={[null, null, MAX_ENEMIES * 2]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial transparent opacity={0.92} toneMapped={false} />
      </instancedMesh>
      {showDecor && (
        <>
          <instancedMesh ref={runnerTrailMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={motionTrailTexture} color="#58b9d4" transparent opacity={0.38} alphaTest={0.015} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={runnerChevronMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <coneGeometry args={[1, 1, 3]} />
            <meshBasicMaterial color="#7fc9d8" transparent opacity={0.64} depthWrite={false} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={bruteMarkMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <torusGeometry args={[0.68, 0.045, 8, 28]} />
            <meshBasicMaterial color="#d96d58" transparent opacity={0.62} depthWrite={false} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={brutePlateMesh} args={[null, null, MAX_ENEMIES * 2]} frustumCulled={false}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ffc0a4" transparent opacity={0.76} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={bruteHornMesh} args={[null, null, MAX_ENEMIES * 2]} frustumCulled={false}>
            <coneGeometry args={[1, 1, 4]} />
            <meshBasicMaterial color="#ffcf9c" transparent opacity={0.88} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={golemShardMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#70f0b4" transparent opacity={0.86} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={golemGroundMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <ringGeometry args={[0.48, 0.58, 4]} />
            <meshBasicMaterial color="#93f5b8" transparent opacity={0.44} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={eliteAuraMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <ringGeometry args={[0.58, 0.76, 4]} />
            <meshBasicMaterial color={ART_TOKENS.elderViolet} transparent opacity={0.48} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={eliteCrownMesh} args={[null, null, MAX_ENEMIES * 4]} frustumCulled={false}>
            <coneGeometry args={[1, 1, 4]} />
            <meshBasicMaterial color={ART_TOKENS.elderViolet} transparent opacity={0.72} toneMapped={false} />
          </instancedMesh>
        </>
      )}
    </>
  );
}

