import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { MAX_ENEMIES } from '../config/gameTuning.js';
import { getRuntimeBudget } from '../hooks/useVisualQuality.js';
import { useVisualFrameGate } from '../hooks/useVisualFrameGate.js';
import { getTerrainHeight } from '../systems/terrain.js';
import { useInstancedModelParts } from './StaticModelInstances.jsx';

export function StylizedEnemyInstances({ enemiesRef, visualQuality = 'balanced' }) {
  const bodyRef = useRef();
  const headRef = useRef();
  const faceRef = useRef();
  const accentRef = useRef();
  const shadowRef = useRef();
  const enemyLimit = getRuntimeBudget(visualQuality).maxEnemies;
  const shouldRenderVisualFrame = useVisualFrameGate(visualQuality, 36, 22);
  const meta = useMemo(() => ({
    runner: { color: '#496fa0', head: '#668bc0', accent: '#a6ddff', face: '#fff1a6', scale: [0.88, 0.68, 1.32], lift: 0.18 },
    golem: { color: '#6f9158', head: '#88a86b', accent: '#dacb7a', face: '#fff0a6', scale: [1.16, 1.04, 0.98], lift: 0.14 },
    brute: { color: '#b85f4b', head: '#d0785f', accent: '#ffd078', face: '#fff0a6', scale: [1.42, 1.14, 1.18], lift: 0.1 },
    elite: { color: '#8264aa', head: '#a486ce', accent: '#ffe78a', face: '#fff1c2', scale: [1.2, 1.28, 1.08], lift: 0.18 },
    boss: { color: '#aa8748', head: '#c79a52', accent: '#fff1a6', face: '#fff4c6', scale: [1.92, 1.56, 1.72], lift: 0.22 }
  }), []);
  const local = useMemo(() => ({
    pos: new THREE.Vector3(),
    headPos: new THREE.Vector3(),
    facePos: new THREE.Vector3(),
    accentPos: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    headScale: new THREE.Vector3(),
    faceScale: new THREE.Vector3(),
    accentScale: new THREE.Vector3(),
    shadowScale: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    headQuat: new THREE.Quaternion(),
    faceQuat: new THREE.Quaternion(),
    accentQuat: new THREE.Quaternion(),
    shadowQuat: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)),
    matrix: new THREE.Matrix4(),
    color: new THREE.Color(),
    flashColor: new THREE.Color('#fff1a6')
  }), []);

  useFrame(state => {
    if (!bodyRef.current || !headRef.current || !faceRef.current || !accentRef.current || !shadowRef.current) return;
    if (!shouldRenderVisualFrame(state.clock.elapsedTime)) return;
    let count = 0;
    for (const enemy of enemiesRef.current) {
      if (count >= enemyLimit) break;
      const kindMeta = meta[enemy.kind] ?? meta.golem;
      const hitReact = THREE.MathUtils.clamp((enemy.flash ?? 0) / 0.18, 0, 1);
      const chargePower = enemy.chargeTimer > 0 ? 1 : 0;
      const guardPower = enemy.bossGuard > 0 ? 1 : 0;
      const motionIntent = enemy.motionIntent ?? 0.55;
      const wobble = enemy.wobble ?? 0;
      const stride = wobble * (enemy.kind === 'runner' ? 2.1 : enemy.kind === 'boss' ? 0.54 : 1.05);
      const step = Math.sin(stride);
      const bob = Math.max(0, step) * kindMeta.lift * (0.66 + motionIntent * 0.28) + hitReact * 0.08 + chargePower * 0.05;
      const squash = 1 + Math.max(0, -step) * 0.06 - hitReact * 0.07 + guardPower * 0.04;
      const widthPulse = 1 + Math.max(0, step) * 0.045 + hitReact * 0.1 + chargePower * 0.08;
      const depthPulse = 1 + motionIntent * 0.035 + chargePower * 0.12;
      const radius = enemy.radius * (enemy.kind === 'boss' ? 2.55 : enemy.kind === 'brute' ? 2.28 : enemy.kind === 'runner' ? 2.05 : 2.08);
      const facing = enemy.facingAngle ?? wobble;

      local.pos.set(enemy.pos.x, enemy.pos.y + bob, enemy.pos.z);
      local.quat.setFromEuler(new THREE.Euler(
        enemy.kind === 'runner' ? -0.2 - chargePower * 0.18 : hitReact * -0.08,
        facing,
        Math.sin(stride * 0.72) * (enemy.kind === 'runner' ? 0.16 : 0.07) + hitReact * 0.08
      ));
      local.scale.set(
        radius * kindMeta.scale[0] * widthPulse,
        radius * kindMeta.scale[1] * squash,
        radius * kindMeta.scale[2] * depthPulse
      );
      local.matrix.compose(local.pos, local.quat, local.scale);
      bodyRef.current.setMatrixAt(count, local.matrix);
      local.color.set(kindMeta.color).lerp(local.flashColor, hitReact * 0.55);
      bodyRef.current.setColorAt(count, local.color);

      const headDistance = radius * (enemy.kind === 'runner' ? 0.58 : enemy.kind === 'boss' ? 0.48 : 0.42);
      const headHeight = radius * (enemy.kind === 'boss' ? 1.2 : enemy.kind === 'brute' ? 0.96 : 0.86);
      local.headPos.set(
        enemy.pos.x + Math.sin(facing) * headDistance,
        enemy.pos.y + bob + headHeight,
        enemy.pos.z + Math.cos(facing) * headDistance
      );
      local.headQuat.setFromEuler(new THREE.Euler(
        enemy.kind === 'runner' ? -0.08 : 0.05,
        facing,
        Math.sin(stride * 0.82) * 0.08 + hitReact * 0.12
      ));
      local.headScale.set(
        radius * (enemy.kind === 'boss' ? 0.44 : enemy.kind === 'brute' ? 0.34 : 0.3),
        radius * (enemy.kind === 'boss' ? 0.44 : 0.32),
        radius * (enemy.kind === 'runner' ? 0.26 : 0.3)
      );
      local.matrix.compose(local.headPos, local.headQuat, local.headScale);
      headRef.current.setMatrixAt(count, local.matrix);
      local.color.set(kindMeta.head).lerp(local.flashColor, hitReact * 0.45);
      headRef.current.setColorAt(count, local.color);

      local.facePos.set(
        enemy.pos.x + Math.sin(facing) * (headDistance + radius * 0.2),
        enemy.pos.y + bob + headHeight + radius * 0.03,
        enemy.pos.z + Math.cos(facing) * (headDistance + radius * 0.2)
      );
      local.faceQuat.setFromEuler(new THREE.Euler(0.03, facing, 0));
      local.faceScale.set(
        radius * (enemy.kind === 'runner' ? 0.22 : enemy.kind === 'boss' ? 0.28 : 0.24),
        radius * 0.07,
        radius * 0.035
      );
      local.matrix.compose(local.facePos, local.faceQuat, local.faceScale);
      faceRef.current.setMatrixAt(count, local.matrix);
      local.color.set(kindMeta.face).lerp(local.flashColor, hitReact * 0.32);
      faceRef.current.setColorAt(count, local.color);

      const accentDistance = radius * (enemy.kind === 'runner' ? 0.62 : 0.42);
      local.accentPos.set(
        enemy.pos.x + Math.sin(facing) * accentDistance,
        enemy.pos.y + bob + radius * (enemy.kind === 'boss' ? 1.12 : 0.82),
        enemy.pos.z + Math.cos(facing) * accentDistance
      );
      local.accentQuat.setFromEuler(new THREE.Euler(0.48, facing, Math.PI / 4 + step * 0.12));
      local.accentScale.set(
        radius * (enemy.kind === 'boss' ? 0.32 : 0.22),
        radius * (enemy.kind === 'runner' ? 0.54 : 0.38),
        radius * 0.22
      );
      local.matrix.compose(local.accentPos, local.accentQuat, local.accentScale);
      accentRef.current.setMatrixAt(count, local.matrix);
      local.color.set(kindMeta.accent).lerp(local.flashColor, hitReact * 0.35);
      accentRef.current.setColorAt(count, local.color);

      local.pos.set(enemy.pos.x, getTerrainHeight(enemy.pos.x, enemy.pos.z) + 0.055, enemy.pos.z);
      const shadowSize = radius * (enemy.kind === 'boss' ? 1.15 : 0.82);
      local.matrix.compose(local.pos, local.shadowQuat, local.shadowScale.set(shadowSize, shadowSize * 0.62, 1));
      shadowRef.current.setMatrixAt(count, local.matrix);

      count += 1;
    }

    [bodyRef.current, headRef.current, faceRef.current, accentRef.current, shadowRef.current].forEach(mesh => {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  });

  return (
    <group>
      <instancedMesh ref={shadowRef} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial color="#2d3d27" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={bodyRef} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={faceRef} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={accentRef} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 4]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export function SourceEnemyInstances({ enemiesRef, kind, url, scaleMultiplier = 1, materialTone, visualQuality = 'high' }) {
  const parts = useInstancedModelParts(url);
  const enemyLimit = getRuntimeBudget(visualQuality).maxEnemies;
  const styledParts = useMemo(() => {
    if (!materialTone) return parts;
    const tone = new THREE.Color(materialTone);
    const warmLift = new THREE.Color('#ffe7a3');
    const tintStrength = visualQuality === 'high' ? 0.62 : 1;
    const liftStrength = visualQuality === 'high' ? 0.03 : 0.08;
    return parts.map(part => {
      const material = Array.isArray(part.material)
        ? part.material.map(item => {
          const clone = item.clone();
          if (clone.color) {
            if (visualQuality === 'high') clone.color.lerp(tone, tintStrength).lerp(warmLift, liftStrength);
            else clone.color.copy(tone).lerp(warmLift, liftStrength);
          }
          if (visualQuality !== 'high' && clone.map) clone.map = null;
          clone.roughness = Math.min(0.98, clone.roughness ?? 0.86);
          clone.metalness = Math.min(0.04, clone.metalness ?? 0.01);
          if ('emissive' in clone) {
            clone.emissive = clone.emissive ?? new THREE.Color('#000000');
            clone.emissive.lerp(tone, visualQuality === 'high' ? 0.2 : 0.36);
            clone.emissiveIntensity = Math.max(clone.emissiveIntensity ?? 0, visualQuality === 'high' ? 0.12 : 0.14);
          }
          return clone;
        })
        : part.material.clone();
      if (!Array.isArray(material)) {
        if (material.color) {
          if (visualQuality === 'high') material.color.lerp(tone, tintStrength).lerp(warmLift, liftStrength);
          else material.color.copy(tone).lerp(warmLift, liftStrength);
        }
        if (visualQuality !== 'high' && material.map) material.map = null;
        material.roughness = Math.min(0.98, material.roughness ?? 0.86);
        material.metalness = Math.min(0.04, material.metalness ?? 0.01);
        if ('emissive' in material) {
          material.emissive = material.emissive ?? new THREE.Color('#000000');
          material.emissive.lerp(tone, visualQuality === 'high' ? 0.2 : 0.36);
          material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, visualQuality === 'high' ? 0.12 : 0.14);
        }
      }
      return { ...part, material };
    });
  }, [materialTone, parts, visualQuality]);
  const meshRefs = useRef([]);
  const local = useMemo(() => ({
    pos: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    euler: new THREE.Euler(),
    base: new THREE.Matrix4(),
    final: new THREE.Matrix4(),
    baseMatrices: Array.from({ length: MAX_ENEMIES }, () => new THREE.Matrix4())
  }), []);

  useFrame(() => {
    let count = 0;
    for (const enemy of enemiesRef.current) {
      if (enemy.kind !== kind) continue;
      if (count >= enemyLimit) break;
      const motionIntent = enemy.motionIntent ?? 0.55;
      const hitReact = THREE.MathUtils.clamp((enemy.flash ?? 0) / 0.18, 0, 1);
      const shockedPower = enemy.shocked > 0 ? 0.18 : 0;
      const stride = enemy.wobble * (kind === 'runner' ? 2.1 : kind === 'brute' ? 0.92 : kind === 'boss' ? 0.48 : 1.1) * (0.82 + motionIntent * 0.26);
      const step = Math.sin(stride);
      const stepLift = Math.max(0, step);
      const chargePower = enemy.chargeTimer > 0 ? 1 : 0;
      const guardPower = enemy.bossGuard > 0 ? 1 : 0;
      const bob = kind === 'runner'
        ? stepLift * (0.2 + motionIntent * 0.18) + chargePower * 0.1
        : kind === 'brute'
          ? Math.abs(step) * (0.032 + motionIntent * 0.035)
          : kind === 'boss'
            ? Math.sin(stride) * 0.045 + guardPower * 0.035
            : kind === 'golem'
              ? Math.abs(step) * (0.032 + motionIntent * 0.025)
              : Math.abs(step) * (0.05 + motionIntent * 0.045);
      const squash = kind === 'runner'
        ? 0.76 + stepLift * (0.16 + motionIntent * 0.08) + chargePower * 0.1 - hitReact * 0.08
        : kind === 'brute'
          ? 0.92 + Math.max(0, -step) * 0.05 - hitReact * 0.04
          : kind === 'elite'
            ? 1.0 + stepLift * 0.045 + chargePower * 0.05 - hitReact * 0.04
            : kind === 'boss'
              ? 1.0 + Math.sin(stride) * 0.025 - guardPower * 0.08 - hitReact * 0.03
              : kind === 'golem'
                ? 1.12 + Math.max(0, -step) * 0.025 - hitReact * 0.035
                : 1.0 + stepLift * 0.045 - hitReact * 0.04;
      const pitch = kind === 'runner'
        ? -0.18 - stepLift * 0.14 - chargePower * 0.3 - hitReact * 0.12
        : kind === 'brute'
          ? -0.01 + Math.max(0, -step) * 0.045 - hitReact * 0.055
          : kind === 'boss'
            ? guardPower * 0.08 - hitReact * 0.04
            : kind === 'golem'
              ? 0.035 + step * 0.018 - hitReact * 0.035
              : -0.045 + step * 0.035 - hitReact * 0.055;
      const roll = kind === 'runner'
        ? Math.sin(stride * 0.5) * (0.17 + motionIntent * 0.1) + hitReact * Math.sin(enemy.wobble * 1.7) * 0.16
        : kind === 'brute'
          ? Math.sin(stride * 0.72) * 0.036 + hitReact * Math.sin(enemy.wobble * 1.3) * 0.07
          : kind === 'elite'
            ? Math.sin(stride * 0.82) * 0.075 + chargePower * 0.08 + hitReact * 0.06
            : kind === 'boss'
              ? Math.sin(stride * 0.62) * 0.035 + hitReact * 0.035
              : kind === 'golem'
                ? Math.sin(stride * 0.5) * 0.028 + hitReact * 0.045
                : Math.sin(stride * 0.74) * 0.06 + hitReact * Math.sin(enemy.wobble * 1.5) * 0.07;
      local.pos.set(enemy.pos.x, enemy.pos.y + bob + hitReact * 0.04 + shockedPower * 0.03, enemy.pos.z);
      local.euler.set(pitch, enemy.facingAngle ?? enemy.wobble, roll);
      local.quat.setFromEuler(local.euler);
      const bossPulse = kind === 'boss' ? 1 + Math.sin(enemy.wobble * 0.72) * 0.035 + hitReact * 0.03 : 1;
      const widthPulse = kind === 'runner'
        ? 0.74 + stepLift * 0.06 + hitReact * 0.08
        : kind === 'brute'
          ? 1.24 + Math.max(0, -step) * 0.035 + hitReact * 0.08
          : kind === 'boss'
            ? 1.0 + guardPower * 0.08
            : kind === 'golem'
              ? 1.02 + Math.max(0, -step) * 0.02 + hitReact * 0.04
              : 1 + hitReact * 0.04;
      const depthPulse = kind === 'runner'
        ? 1.34 + motionIntent * 0.08 + chargePower * 0.24
        : kind === 'brute'
          ? 1.16 + stepLift * 0.02 + hitReact * 0.06
          : kind === 'elite'
            ? 1.0 + chargePower * 0.12 + hitReact * 0.04
            : kind === 'boss'
              ? 1.0 + guardPower * 0.06
              : kind === 'golem'
                ? 0.92 + stepLift * 0.015 + hitReact * 0.035
                : 1.02;
      local.scale.set(
        enemy.radius * scaleMultiplier * widthPulse * bossPulse,
        enemy.radius * scaleMultiplier * squash * bossPulse,
        enemy.radius * scaleMultiplier * depthPulse * bossPulse
      );
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
          args={[part.geometry, part.material, MAX_ENEMIES]}
          frustumCulled={false}
          castShadow={visualQuality === 'high'}
          receiveShadow={visualQuality !== 'low'}
        />
      ))}
    </group>
  );
}
