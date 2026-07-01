import { useMemo, useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { FIELD_ITEM_META, SHRINE_SITES } from '../config/gameData.js';
import { MAX_FIELD_ITEMS, MAX_XP_GEMS, SHRINE_CHANNEL_TIME } from '../config/gameTuning.js';
import { getVisualBudget } from '../hooks/useVisualQuality.js';
import { useVisualFrameGate } from '../hooks/useVisualFrameGate.js';
import { getPlayerTerrainY } from '../systems/terrain.js';

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
      scratch.pos.set(gem.pos.x, gem.pos.y + 0.92, gem.pos.z);
      scratch.matrix.compose(
        scratch.pos,
        scratch.quat,
        scratch.scale.set(0.055 * pulse, 1.2 + gem.value * 0.025, 0.055 * pulse)
      );
      beamMesh.current.setMatrixAt(count, scratch.matrix);
    }
    beamMesh.current.count = gemCount;
    beamMesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={beamMesh} args={[null, null, MAX_XP_GEMS]} frustumCulled={false}>
      <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
      <meshBasicMaterial color="#9ff7ff" transparent opacity={0.28} depthWrite={false} toneMapped={false} />
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

    if (magnetCore.current) {
      magnetCore.current.count = magnetCount;
      magnetCore.current.instanceMatrix.needsUpdate = true;
    }
    if (magnetRing.current) {
      magnetRing.current.count = magnetCount;
      magnetRing.current.instanceMatrix.needsUpdate = true;
    }
    if (purgeCore.current) {
      purgeCore.current.count = purgeCount;
      purgeCore.current.instanceMatrix.needsUpdate = true;
    }
    if (purgeRing.current) {
      purgeRing.current.count = purgeCount;
      purgeRing.current.instanceMatrix.needsUpdate = true;
    }
    if (healCore.current) {
      healCore.current.count = healCount;
      healCore.current.instanceMatrix.needsUpdate = true;
    }
    if (healRing.current) {
      healRing.current.count = healCount;
      healRing.current.instanceMatrix.needsUpdate = true;
    }
    if (overloadCore.current) {
      overloadCore.current.count = overloadCount;
      overloadCore.current.instanceMatrix.needsUpdate = true;
    }
    if (overloadRing.current) {
      overloadRing.current.count = overloadCount;
      overloadRing.current.instanceMatrix.needsUpdate = true;
    }
    if (cacheCore.current) {
      cacheCore.current.count = cacheCount;
      cacheCore.current.instanceMatrix.needsUpdate = true;
    }
    if (cacheRing.current) {
      cacheRing.current.count = cacheCount;
      cacheRing.current.instanceMatrix.needsUpdate = true;
    }
    if (beamMesh.current) {
      beamMesh.current.count = beamCount;
      beamMesh.current.instanceMatrix.needsUpdate = true;
      if (beamMesh.current.instanceColor) beamMesh.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={magnetCore} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false} castShadow>
        <torusKnotGeometry args={[0.5, 0.13, 64, 8]} />
        <meshStandardMaterial color="#8ff5ff" emissive="#2fdcff" emissiveIntensity={2.7} roughness={0.18} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={magnetRing} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <torusGeometry args={[1, 0.035, 8, 52]} />
        <meshBasicMaterial color="#70d6ff" transparent opacity={0.62} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={purgeCore} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false} castShadow>
        <icosahedronGeometry args={[0.78, 0]} />
        <meshStandardMaterial color="#ffdf6e" emissive="#ffb84c" emissiveIntensity={2.8} roughness={0.26} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={purgeRing} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <ringGeometry args={[0.86, 1.08, 5]} />
        <meshBasicMaterial color="#ffdf6e" transparent opacity={0.58} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
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
        <meshStandardMaterial color="#f5c7ff" emissive="#b96dff" emissiveIntensity={3.2} roughness={0.18} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={overloadRing} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <torusGeometry args={[0.92, 0.04, 6, 6]} />
        <meshBasicMaterial color="#f5c7ff" transparent opacity={0.72} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={cacheCore} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false} castShadow>
        <boxGeometry args={[0.92, 0.92, 0.92]} />
        <meshStandardMaterial color="#fff1a6" emissive="#ffdf6e" emissiveIntensity={2.9} roughness={0.2} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={cacheRing} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <torusGeometry args={[0.88, 0.045, 6, 4]} />
        <meshBasicMaterial color="#fff1a6" transparent opacity={0.76} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={beamMesh} args={[null, null, MAX_FIELD_ITEMS]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
        <meshBasicMaterial vertexColors transparent opacity={0.38} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

export function RuneShrineSites({ shrinesRef, visualQuality = 'high' }) {
  const coreMesh = useRef();
  const ringMesh = useRef();
  const chargeMesh = useRef();
  const usedMesh = useRef();
  const beamMesh = useRef();
  const labels = useMemo(() => createInitialShrines(), []);
  const showLabels = visualQuality === 'high';
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
    const spin = performance.now() * 0.0018;
    let activeCount = 0;
    let usedCount = 0;
    let beamCount = 0;
    let chargeCount = 0;

    for (const shrine of shrinesRef.current) {
      const progress = shrine.activated ? 1 : THREE.MathUtils.clamp(shrine.channel / SHRINE_CHANNEL_TIME, 0, 1);
      const pulse = 1 + Math.sin(shrine.pulse) * 0.06;
      const pos = shrine.pos;

      if (shrine.activated) {
        if (usedMesh.current) {
          scratch.euler.set(Math.PI / 2, 0, spin);
          scratch.quat.setFromEuler(scratch.euler);
          scratch.pos.set(pos.x, pos.y + 0.1, pos.z);
          scratch.matrix.compose(
            scratch.pos,
            scratch.quat,
            scratch.scale.setScalar(2.4 * pulse)
          );
          usedMesh.current.setMatrixAt(usedCount, scratch.matrix);
          scratch.color.set(shrine.color);
          usedMesh.current.setColorAt(usedCount, scratch.color);
          usedCount += 1;
        }
        continue;
      }

      if (coreMesh.current) {
        scratch.euler.set(0.38, spin * 1.8, 0.2);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.pos.set(pos.x, pos.y + 0.82 + Math.sin(shrine.pulse) * 0.08, pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(0.62 + progress * 0.26)
        );
        coreMesh.current.setMatrixAt(activeCount, scratch.matrix);
        scratch.color.set(shrine.color);
        coreMesh.current.setColorAt(activeCount, scratch.color);
      }

      if (ringMesh.current) {
        scratch.euler.set(Math.PI / 2, 0, spin);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.pos.set(pos.x, pos.y + 0.08, pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(2.25 * pulse)
        );
        ringMesh.current.setMatrixAt(activeCount, scratch.matrix);
        scratch.color.set(shrine.color);
        ringMesh.current.setColorAt(activeCount, scratch.color);
      }

      if (beamMesh.current) {
        scratch.quat.identity();
        scratch.pos.set(pos.x, pos.y + 1.42, pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.set(0.1 + progress * 0.06, 2.5 + progress * 1.2, 0.1 + progress * 0.06)
        );
        beamMesh.current.setMatrixAt(beamCount, scratch.matrix);
        scratch.color.set(shrine.color);
        beamMesh.current.setColorAt(beamCount, scratch.color);
        beamCount += 1;
      }

      if (chargeMesh.current && progress > 0) {
        scratch.euler.set(Math.PI / 2, 0, -spin * 2.2);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.pos.set(pos.x, pos.y + 0.13, pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(1.0 + progress * 2.2)
        );
        chargeMesh.current.setMatrixAt(chargeCount, scratch.matrix);
        scratch.color.set(shrine.color);
        chargeMesh.current.setColorAt(chargeCount, scratch.color);
        chargeCount += 1;
      }

      activeCount += 1;
    }

    if (coreMesh.current) {
      coreMesh.current.count = activeCount;
      coreMesh.current.instanceMatrix.needsUpdate = true;
      if (coreMesh.current.instanceColor) coreMesh.current.instanceColor.needsUpdate = true;
    }
    if (ringMesh.current) {
      ringMesh.current.count = activeCount;
      ringMesh.current.instanceMatrix.needsUpdate = true;
      if (ringMesh.current.instanceColor) ringMesh.current.instanceColor.needsUpdate = true;
    }
    if (beamMesh.current) {
      beamMesh.current.count = beamCount;
      beamMesh.current.instanceMatrix.needsUpdate = true;
      if (beamMesh.current.instanceColor) beamMesh.current.instanceColor.needsUpdate = true;
    }
    if (chargeMesh.current) {
      chargeMesh.current.count = chargeCount;
      chargeMesh.current.instanceMatrix.needsUpdate = true;
      if (chargeMesh.current.instanceColor) chargeMesh.current.instanceColor.needsUpdate = true;
    }
    if (usedMesh.current) {
      usedMesh.current.count = usedCount;
      usedMesh.current.instanceMatrix.needsUpdate = true;
      if (usedMesh.current.instanceColor) usedMesh.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={beamMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 10, 1, true]} />
        <meshBasicMaterial vertexColors transparent opacity={0.24} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={ringMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false}>
        <torusGeometry args={[1, 0.025, 8, 64]} />
        <meshBasicMaterial vertexColors transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={chargeMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false}>
        <ringGeometry args={[0.8, 1, 64]} />
        <meshBasicMaterial vertexColors transparent opacity={0.44} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={usedMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false}>
        <ringGeometry args={[0.88, 1, 6]} />
        <meshBasicMaterial vertexColors transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={coreMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false} castShadow>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial vertexColors emissive="#ffffff" emissiveIntensity={0.42} roughness={0.18} toneMapped={false} />
      </instancedMesh>
      {showLabels && labels.map(shrine => (
        <Text
          key={`shrine-label-${shrine.id}`}
          position={[shrine.pos.x, shrine.pos.y + 2.35, shrine.pos.z]}
          rotation={[-0.86, 0, 0]}
          fontSize={0.52}
          anchorX="center"
          anchorY="middle"
          color={shrine.color}
          fillOpacity={0.72}
          outlineWidth={0.025}
          outlineColor="#07100f"
        >
          {shrine.label}
        </Text>
      ))}
    </group>
  );
}

export function createInitialShrines() {
  return SHRINE_SITES.map(site => {
    const x = Math.cos(site.angle) * site.radius;
    const z = Math.sin(site.angle) * site.radius;
    return {
      ...site,
      pos: new THREE.Vector3(x, getPlayerTerrainY(x, z) + 0.06, z),
      channel: 0,
      activated: false,
      prompted: false,
      pulse: Math.random() * Math.PI * 2
    };
  });
}
