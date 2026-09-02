import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { MAX_PROJECTILES, SIMULATION_BUDGET } from '../config/gameTuning.js';
import { useVisualFrameGate } from '../hooks/useVisualFrameGate.js';
import { getCombatEffectTextures } from './combatEffectTextures.js';
import { syncInstanceMesh } from './instancedMeshUtils.js';

export function StylizedProjectileInstances({ projectilesRef, visualQuality = 'balanced' }) {
  const orbCoreRef = useRef();
  const stormCoreRef = useRef();
  const trailRef = useRef();
  const motionTrailTexture = useMemo(() => getCombatEffectTextures().motionTrail, []);
  const projectileLimit = SIMULATION_BUDGET.maxProjectiles;
  const axis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const local = useMemo(() => ({
    pos: new THREE.Vector3(),
    trailPos: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    trailScale: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    trailQuat: new THREE.Quaternion(),
    matrix: new THREE.Matrix4(),
    color: new THREE.Color(),
    fallbackOrbColor: new THREE.Color('#76e6ff'),
    fallbackStormColor: new THREE.Color('#c6a64f')
  }), []);
  const shouldRenderVisualFrame = useVisualFrameGate(visualQuality, 36, 20);

  useFrame(state => {
    if (!orbCoreRef.current || !stormCoreRef.current || !trailRef.current) return;
    if (!shouldRenderVisualFrame(state.clock.elapsedTime)) return;
    const spin = performance.now() * 0.006;
    let projectileCount = 0;
    let orbCount = 0;
    let stormCount = 0;
    for (const projectile of projectilesRef.current) {
      if (projectileCount >= projectileLimit) break;
      const isStorm = projectile.type === 'storm';
      const coreMesh = isStorm ? stormCoreRef.current : orbCoreRef.current;
      const coreIndex = isStorm ? stormCount : orbCount;
      const radius = (isStorm ? 0.28 : 0.2) * projectile.visualScale;
      const angle = (projectile.angle ?? 0) + (isStorm ? spin : 0);
      const corePulse = isStorm ? 0.92 + Math.sin(state.clock.elapsedTime * 11 + projectile.angle * 1.7) * 0.08 : 1;
      local.pos.copy(projectile.pos);
      local.pos.y += isStorm ? 0.16 : 0.02;
      local.quat.setFromAxisAngle(axis, angle);
      local.scale.set(
        radius * (isStorm ? 1.08 * corePulse : 1.0),
        radius * (isStorm ? 1.62 : 1.05),
        radius * (isStorm ? 1.08 * corePulse : 1.0)
      );
      local.matrix.compose(local.pos, local.quat, local.scale);
      coreMesh.setMatrixAt(coreIndex, local.matrix);
      local.color.set(projectile.color ?? (isStorm ? local.fallbackStormColor : local.fallbackOrbColor));
      coreMesh.setColorAt(coreIndex, local.color);
      if (isStorm) stormCount += 1;
      else orbCount += 1;

      const trailLength = Math.min(isStorm ? 1.4 : 1.0, projectile.trailLength ?? 1);
      local.trailPos.set(
        projectile.pos.x - Math.sin(projectile.angle ?? 0) * trailLength * (isStorm ? 0.62 : 0.46),
        projectile.pos.y - 0.025,
        projectile.pos.z - Math.cos(projectile.angle ?? 0) * trailLength * (isStorm ? 0.62 : 0.46)
      );
      local.trailQuat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -(projectile.angle ?? 0)));
      local.trailScale.set(isStorm ? 0.42 : 0.26, trailLength * (isStorm ? 1.05 : 0.72), 1);
      local.matrix.compose(local.trailPos, local.trailQuat, local.trailScale);
      trailRef.current.setMatrixAt(projectileCount, local.matrix);
      local.color.set(projectile.color ?? (isStorm ? local.fallbackStormColor : local.fallbackOrbColor));
      trailRef.current.setColorAt(projectileCount, local.color);

      projectileCount += 1;
    }

    syncInstanceMesh(orbCoreRef.current, orbCount);
    syncInstanceMesh(stormCoreRef.current, stormCount);
    syncInstanceMesh(trailRef.current, projectileCount);
  });

  return (
    <group>
      <instancedMesh ref={trailRef} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={motionTrailTexture} color="#ffffff" transparent opacity={visualQuality === 'low' ? 0.28 : 0.44} alphaTest={0.015} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={orbCoreRef} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.88} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={stormCoreRef} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.78} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
