import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { MAX_PROJECTILES } from '../config/gameTuning.js';
import { getRuntimeBudget } from '../hooks/useVisualQuality.js';
import { useVisualFrameGate } from '../hooks/useVisualFrameGate.js';
import { useInstancedModelParts } from './StaticModelInstances.jsx';

export function SourceProjectileInstances({ projectilesRef, type, url, scaleMultiplier = 1, visualQuality = 'high' }) {
  const parts = useInstancedModelParts(url);
  const projectileLimit = getRuntimeBudget(visualQuality).maxProjectiles;
  const styledParts = useMemo(() => {
    const tone = new THREE.Color(type === 'storm' ? '#f0d86a' : '#7ce8ff');
    return parts.map(part => {
      const material = Array.isArray(part.material)
        ? part.material.map(item => {
          const clone = item.clone();
          if (clone.color) clone.color.lerp(tone, visualQuality === 'high' ? 0.62 : 0.86);
          if (visualQuality !== 'high' && clone.map) clone.map = null;
          clone.roughness = Math.min(0.72, clone.roughness ?? 0.5);
          clone.metalness = Math.min(0.03, clone.metalness ?? 0.01);
          if ('emissive' in clone) {
            clone.emissive = clone.emissive ?? new THREE.Color('#000000');
            clone.emissive.lerp(tone, 0.45);
            clone.emissiveIntensity = Math.max(clone.emissiveIntensity ?? 0, visualQuality === 'high' ? 0.36 : 0.28);
          }
          return clone;
        })
        : part.material.clone();
      if (!Array.isArray(material)) {
        if (material.color) material.color.lerp(tone, visualQuality === 'high' ? 0.62 : 0.86);
        if (visualQuality !== 'high' && material.map) material.map = null;
        material.roughness = Math.min(0.72, material.roughness ?? 0.5);
        material.metalness = Math.min(0.03, material.metalness ?? 0.01);
        if ('emissive' in material) {
          material.emissive = material.emissive ?? new THREE.Color('#000000');
          material.emissive.lerp(tone, 0.45);
          material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, visualQuality === 'high' ? 0.36 : 0.28);
        }
      }
      return { ...part, material };
    });
  }, [parts, type, visualQuality]);
  const meshRefs = useRef([]);
  const axis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const local = useMemo(() => ({
    pos: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    base: new THREE.Matrix4(),
    final: new THREE.Matrix4(),
    baseMatrices: Array.from({ length: MAX_PROJECTILES }, () => new THREE.Matrix4())
  }), []);

  useFrame(() => {
    const timeSpin = performance.now() * 0.006;
    let count = 0;
    for (const projectile of projectilesRef.current) {
      if (projectile.type !== type) continue;
      if (count >= projectileLimit) break;
      const scale = (type === 'storm' ? 1.7 : 1) * projectile.visualScale * scaleMultiplier;
      local.pos.copy(projectile.pos);
      local.quat.setFromAxisAngle(axis, (projectile.angle ?? 0) + (type === 'storm' ? timeSpin : 0));
      local.scale.setScalar(scale);
      local.base.compose(local.pos, local.quat, local.scale);
      local.baseMatrices[count].copy(local.base);
      count += 1;
    }

    styledParts.forEach((part, partIndex) => {
      const mesh = meshRefs.current[partIndex];
      if (!mesh) return;
      for (let index = 0; index < count; index += 1) {
        local.final.multiplyMatrices(local.baseMatrices[index], part.localMatrix);
        mesh.setMatrixAt(index, local.final);
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <group>
      {styledParts.map((part, index) => (
        <instancedMesh
          key={`${url}-${index}`}
          ref={node => {
            meshRefs.current[index] = node;
          }}
          args={[part.geometry, part.material, MAX_PROJECTILES]}
          frustumCulled={false}
          castShadow={visualQuality === 'high'}
        />
      ))}
    </group>
  );
}

export function StylizedProjectileInstances({ projectilesRef, visualQuality = 'balanced' }) {
  const coreRef = useRef();
  const trailRef = useRef();
  const sparkRef = useRef();
  const projectileLimit = getRuntimeBudget(visualQuality).maxProjectiles;
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
    orbColor: new THREE.Color('#76e6ff'),
    stormColor: new THREE.Color('#f0d76a'),
    sparkColor: new THREE.Color('#fff1a6')
  }), []);
  const shouldRenderVisualFrame = useVisualFrameGate(visualQuality, 36, 20);

  useFrame(state => {
    if (!coreRef.current || !trailRef.current || !sparkRef.current) return;
    if (!shouldRenderVisualFrame(state.clock.elapsedTime)) return;
    const spin = performance.now() * 0.006;
    let count = 0;
    for (const projectile of projectilesRef.current) {
      if (count >= projectileLimit) break;
      const isStorm = projectile.type === 'storm';
      const radius = (isStorm ? 0.48 : 0.26) * projectile.visualScale;
      const angle = (projectile.angle ?? 0) + (isStorm ? spin : 0);
      local.pos.copy(projectile.pos);
      local.pos.y += isStorm ? 0.08 : 0.02;
      local.quat.setFromAxisAngle(axis, angle);
      local.scale.set(
        radius * (isStorm ? 1.7 : 1.0),
        radius * (isStorm ? 0.72 : 0.9),
        radius * (isStorm ? 1.28 : 1.0)
      );
      local.matrix.compose(local.pos, local.quat, local.scale);
      coreRef.current.setMatrixAt(count, local.matrix);
      local.color.copy(isStorm ? local.stormColor : local.orbColor);
      coreRef.current.setColorAt(count, local.color);

      const trailLength = Math.min(isStorm ? 1.4 : 1.0, projectile.trailLength ?? 1);
      local.trailPos.set(
        projectile.pos.x - Math.sin(projectile.angle ?? 0) * trailLength * (isStorm ? 0.62 : 0.46),
        projectile.pos.y - 0.025,
        projectile.pos.z - Math.cos(projectile.angle ?? 0) * trailLength * (isStorm ? 0.62 : 0.46)
      );
      local.trailQuat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -(projectile.angle ?? 0)));
      local.trailScale.set(isStorm ? 0.32 : 0.18, trailLength * (isStorm ? 1.15 : 0.82), 1);
      local.matrix.compose(local.trailPos, local.trailQuat, local.trailScale);
      trailRef.current.setMatrixAt(count, local.matrix);
      local.color.copy(isStorm ? local.stormColor : local.orbColor);
      trailRef.current.setColorAt(count, local.color);

      local.pos.copy(projectile.pos);
      local.pos.y += isStorm ? 0.18 : 0.12;
      local.quat.setFromAxisAngle(axis, -angle * 0.72);
      local.scale.setScalar(radius * (isStorm ? 0.36 : 0.28));
      local.matrix.compose(local.pos, local.quat, local.scale);
      sparkRef.current.setMatrixAt(count, local.matrix);
      sparkRef.current.setColorAt(count, local.sparkColor);

      count += 1;
    }

    [coreRef.current, trailRef.current, sparkRef.current].forEach(mesh => {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  });

  return (
    <group>
      <instancedMesh ref={trailRef} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={visualQuality === 'low' ? 0.34 : 0.46} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={coreRef} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={sparkRef} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <ringGeometry args={[0.38, 0.52, 4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={visualQuality === 'low' ? 0.42 : 0.62} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

