import { useMemo, useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { SHRINE_SITES } from '../../config/gameData.js';
import { SHRINE_CHANNEL_TIME } from '../../config/gameTuning.js';
import { useVisualFrameGate } from '../../hooks/useVisualFrameGate.js';
import { getRuneCircuitState } from '../../systems/runeCircuit.js';
import { getPlayerTerrainY } from '../../systems/terrain.js';
import { syncInstanceMesh } from '../instancedMeshUtils.js';

export function RuneShrineSites({ game, shrinesRef, visualQuality = 'high' }) {
  const coreMesh = useRef();
  const ringMesh = useRef();
  const chargeMesh = useRef();
  const usedMesh = useRef();
  const beamMesh = useRef();
  const labels = useMemo(() => createInitialShrines(), []);
  const showLabels = visualQuality === 'high';
  const circuit = getRuneCircuitState(game);
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
    const circuitTarget = shrinesRef.current.find(shrine => !shrine.activated) ?? null;

    for (const shrine of shrinesRef.current) {
      const isCircuitTarget = shrine === circuitTarget;
      const isReady = isCircuitTarget && game.time >= shrine.unlockAt;
      const progress = shrine.activated ? 1 : THREE.MathUtils.clamp(shrine.channel / SHRINE_CHANNEL_TIME, 0, 1);
      const pulse = 1 + Math.sin(shrine.pulse) * (isCircuitTarget ? 0.08 : 0.025);
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
        scratch.pos.set(pos.x, pos.y + (isCircuitTarget ? 1.08 : 0.72) + Math.sin(shrine.pulse) * 0.08, pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(isCircuitTarget ? (isReady ? 1.06 : 0.74) + progress * 0.28 : 0.34)
        );
        coreMesh.current.setMatrixAt(activeCount, scratch.matrix);
        scratch.color.set(isCircuitTarget ? shrine.color : '#334b45');
        coreMesh.current.setColorAt(activeCount, scratch.color);
      }

      if (ringMesh.current) {
        scratch.euler.set(Math.PI / 2, 0, spin);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.pos.set(pos.x, pos.y + 0.08, pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar((isCircuitTarget ? (isReady ? 3.8 : 2.5) : 1.45) * pulse)
        );
        ringMesh.current.setMatrixAt(activeCount, scratch.matrix);
        scratch.color.set(isCircuitTarget ? shrine.color : '#334b45');
        ringMesh.current.setColorAt(activeCount, scratch.color);
      }

      if (beamMesh.current && isCircuitTarget) {
        scratch.quat.identity();
        scratch.pos.set(pos.x, pos.y + (isReady ? 5.1 : 1.25), pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.set(
            isReady ? 0.34 + progress * 0.08 : 0.18,
            isReady ? 9.4 + progress * 1.6 : 1.9,
            isReady ? 0.34 + progress * 0.08 : 0.18
          )
        );
        beamMesh.current.setMatrixAt(beamCount, scratch.matrix);
        beamCount += 1;
      }

      if (chargeMesh.current && (isReady || progress > 0)) {
        scratch.euler.set(Math.PI / 2, 0, -spin * 2.2);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.pos.set(pos.x, pos.y + 0.13, pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(3.1 + Math.sin(shrine.pulse * 1.4) * 0.18 + progress * 1.9)
        );
        chargeMesh.current.setMatrixAt(chargeCount, scratch.matrix);
        chargeCount += 1;
      }

      activeCount += 1;
    }

    syncInstanceMesh(coreMesh.current, activeCount);
    syncInstanceMesh(ringMesh.current, activeCount);
    syncInstanceMesh(beamMesh.current, beamCount);
    syncInstanceMesh(chargeMesh.current, chargeCount);
    syncInstanceMesh(usedMesh.current, usedCount);
  });

  return (
    <group>
      <instancedMesh ref={beamMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 10, 1, true]} />
        <meshBasicMaterial
          color="#f0b95f"
          transparent
          opacity={0.38}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={ringMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false}>
        <torusGeometry args={[1, 0.025, 8, 64]} />
        <meshBasicMaterial vertexColors transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={chargeMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false}>
        <ringGeometry args={[0.8, 1, 64]} />
        <meshBasicMaterial
          color="#f0b95f"
          transparent
          opacity={0.52}
          depthWrite={false}
          depthTest={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={usedMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false}>
        <ringGeometry args={[0.88, 1, 6]} />
        <meshBasicMaterial vertexColors transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={coreMesh} args={[null, null, SHRINE_SITES.length]} frustumCulled={false} castShadow>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial vertexColors emissive="#ffffff" emissiveIntensity={0.42} roughness={0.18} toneMapped={false} />
      </instancedMesh>
      {showLabels && labels.filter(shrine => shrine.id === circuit.nextSite?.id).map(shrine => (
        <Text
          key={`shrine-label-${shrine.id}`}
          position={[shrine.pos.x, shrine.pos.y + 2.7, shrine.pos.z]}
          rotation={[-0.86, 0, 0]}
          fontSize={0.52}
          anchorX="center"
          anchorY="middle"
          color={shrine.color}
          fillOpacity={0.86}
          outlineWidth={0.025}
          outlineColor="#07100f"
        >
          {circuit.ready ? `NEXT · ${shrine.label}` : `SEALED · ${shrine.label}`}
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

