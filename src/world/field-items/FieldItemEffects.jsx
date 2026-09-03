import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { FIELD_ITEM_META } from '../../config/gameData.js';
import { MAX_FIELD_ITEMS, MAX_XP_GEMS } from '../../config/gameTuning.js';
import { getVisualBudget } from '../../hooks/useVisualQuality.js';
import { useVisualFrameGate } from '../../hooks/useVisualFrameGate.js';
import { syncInstanceMesh } from '../instancedMeshUtils.js';

export function GemBeacons({ gemsRef, visualQuality = 'high' }) {
  const beamMesh = useRef();
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3()
  }), []);

  useFrame(() => {
    if (!beamMesh.current) return;
    const budget = getVisualBudget(visualQuality);
    const gemCount = Math.min(gemsRef.current.length, budget.gemBeams);
    const stride = Math.max(1, Math.ceil(gemsRef.current.length / Math.max(1, gemCount)));
    for (let count = 0; count < gemCount; count += 1) {
      const gem = gemsRef.current[count * stride];
      if (!gem) continue;
      const pulse = 0.82 + Math.sin(gem.pulse) * 0.18;
      scratch.pos.set(gem.pos.x, gem.pos.y + 0.72, gem.pos.z);
      scratch.matrix.compose(
        scratch.pos,
        scratch.quat,
        scratch.scale.set(0.032 * pulse, 0.78 + gem.value * 0.018, 0.032 * pulse)
      );
      beamMesh.current.setMatrixAt(count, scratch.matrix);
    }
    syncInstanceMesh(beamMesh.current, gemCount);
  });

  return (
    <instancedMesh ref={beamMesh} args={[null, null, MAX_XP_GEMS]} frustumCulled={false}>
      <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
      <meshBasicMaterial color="#78bac2" transparent opacity={0.14} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

export function FieldPickupItems({ itemsRef, visualQuality = 'high' }) {
  const magnetCore = useRef();
  const magnetRing = useRef();
  const purgeCore = useRef();
  const purgeRing = useRef();
  const healCore = useRef();
  const healRing = useRef();
  const overloadCore = useRef();
  const overloadRing = useRef();
  const cacheCore = useRef();
  const cacheRing = useRef();
  const beamMesh = useRef();
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    euler: new THREE.Euler(),
    color: new THREE.Color()
  }), []);
  const shouldRenderVisualFrame = useVisualFrameGate(visualQuality, 24, 16);

  useFrame(state => {
    if (!shouldRenderVisualFrame(state.clock.elapsedTime)) return;
    const spin = performance.now() * 0.004;
    let magnetCount = 0;
    let purgeCount = 0;
    let healCount = 0;
    let overloadCount = 0;
    let cacheCount = 0;
    let beamCount = 0;

    for (const item of itemsRef.current) {
      const pulse = 1 + Math.sin(item.pulse) * 0.08;
      const lift = Math.sin(item.pulse * 1.2) * 0.12;
      const meta = FIELD_ITEM_META[item.type] ?? FIELD_ITEM_META.magnet;
      let core = magnetCore.current;
      let ring = magnetRing.current;
      let index = magnetCount;
      let coreScale = 0.56;
      let ringScale = 1.22;

      if (item.type === 'purge') {
        core = purgeCore.current;
        ring = purgeRing.current;
        index = purgeCount;
        coreScale = 0.68;
        ringScale = 1.48;
      } else if (item.type === 'heal') {
        core = healCore.current;
        ring = healRing.current;
        index = healCount;
        coreScale = 0.62;
        ringScale = 1.28;
      } else if (item.type === 'overload') {
        core = overloadCore.current;
        ring = overloadRing.current;
        index = overloadCount;
        coreScale = 0.7;
        ringScale = 1.56;
      } else if (item.type === 'cache') {
        core = cacheCore.current;
        ring = cacheRing.current;
        index = cacheCount;
        coreScale = 0.72;
        ringScale = 1.5;
      }

      if (core) {
        scratch.euler.set(0.35, spin + item.pulse * 0.3, 0.18);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.pos.set(item.pos.x, item.pos.y + 0.55 + lift, item.pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(coreScale * pulse)
        );
        core.setMatrixAt(index, scratch.matrix);
      }

      if (ring) {
        scratch.euler.set(Math.PI / 2, 0, spin * (item.type === 'magnet' ? 1 : -1));
        scratch.quat.setFromEuler(scratch.euler);
        scratch.pos.set(item.pos.x, item.pos.y + 0.12, item.pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(ringScale * pulse)
        );
        ring.setMatrixAt(index, scratch.matrix);
      }

      if (beamMesh.current) {
        scratch.quat.identity();
        scratch.pos.set(item.pos.x, item.pos.y + 1.1, item.pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.set(0.07 * pulse, 1.9, 0.07 * pulse)
        );
        beamMesh.current.setMatrixAt(beamCount, scratch.matrix);
        scratch.color.set(meta.color);
        beamMesh.current.setColorAt(beamCount, scratch.color);
        beamCount += 1;
      }

      if (item.type === 'purge') purgeCount += 1;
      else if (item.type === 'heal') healCount += 1;
      else if (item.type === 'overload') overloadCount += 1;
      else if (item.type === 'cache') cacheCount += 1;
      else magnetCount += 1;
    }

    syncInstanceMesh(magnetCore.current, magnetCount);
    syncInstanceMesh(magnetRing.current, magnetCount);
    syncInstanceMesh(purgeCore.current, purgeCount);
    syncInstanceMesh(purgeRing.current, purgeCount);
    syncInstanceMesh(healCore.current, healCount);
    syncInstanceMesh(healRing.current, healCount);
    syncInstanceMesh(overloadCore.current, overloadCount);
    syncInstanceMesh(overloadRing.current, overloadCount);
    syncInstanceMesh(cacheCore.current, cacheCount);
    syncInstanceMesh(cacheRing.current, cacheCount);
    syncInstanceMesh(beamMesh.current, beamCount);
  });

  return (
    <>
      <instancedMesh ref={magnetCore} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false} castShadow>
        <torusKnotGeometry args={[0.5, 0.13, 64, 8]} />
        <meshStandardMaterial color="#8ff5ff" emissive="#2fdcff" emissiveIntensity={2.7} roughness={0.18} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={magnetRing} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <torusGeometry args={[1, 0.035, 8, 52]} />
        <meshBasicMaterial color="#58b9d4" transparent opacity={0.48} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={purgeCore} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false} castShadow>
        <icosahedronGeometry args={[0.78, 0]} />
        <meshStandardMaterial color="#d4a84c" emissive="#b97834" emissiveIntensity={2.0} roughness={0.3} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={purgeRing} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <ringGeometry args={[0.86, 1.08, 5]} />
        <meshBasicMaterial color="#d4a84c" transparent opacity={0.44} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={healCore} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false} castShadow>
        <dodecahedronGeometry args={[0.74, 0]} />
        <meshStandardMaterial color="#79f29a" emissive="#37f27d" emissiveIntensity={2.55} roughness={0.22} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={healRing} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <ringGeometry args={[0.42, 0.56, 4]} />
        <meshBasicMaterial color="#79f29a" transparent opacity={0.64} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={overloadCore} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false} castShadow>
        <octahedronGeometry args={[0.84, 0]} />
        <meshStandardMaterial color="#aa91cf" emissive="#6f56b1" emissiveIntensity={2.15} roughness={0.22} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={overloadRing} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <torusGeometry args={[0.92, 0.04, 6, 6]} />
        <meshBasicMaterial color="#aa91cf" transparent opacity={0.56} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={cacheCore} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false} castShadow>
        <boxGeometry args={[0.92, 0.92, 0.92]} />
        <meshStandardMaterial color="#d4a84c" emissive="#b97834" emissiveIntensity={2.05} roughness={0.24} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={cacheRing} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <torusGeometry args={[0.88, 0.045, 6, 4]} />
        <meshBasicMaterial color="#d4a84c" transparent opacity={0.58} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={beamMesh} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
        <meshBasicMaterial vertexColors transparent opacity={0.38} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </>
  );
}


