import { useMemo, useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { getEnemyAccentColor, getEnemyDisplayName } from '../systems/enemyDirector.js';

export function BossNameplates({ enemiesRef }) {
  const bosses = enemiesRef.current.filter(enemy => enemy.kind === 'boss' || enemy.kind === 'elite');
  return (
    <>
      {bosses.map((boss, index) => {
        const pct = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
        const isElite = boss.kind === 'elite';
        const color = getEnemyAccentColor(boss);
        return (
          <group key={`boss-plate-${index}`} position={[boss.pos.x, boss.pos.y + (isElite ? 2.7 : 3.2), boss.pos.z]} rotation={[-0.86, 0, 0]}>
            <Text
              position={[0, 0.28, 0]}
              fontSize={isElite ? 0.43 : 0.5}
              anchorX="center"
              anchorY="middle"
              color={color}
              outlineWidth={0.02}
              outlineColor="#07100f"
            >
              {getEnemyDisplayName(boss)}
            </Text>
            <mesh position={[0, -0.1, 0]} scale={[2.3, 0.12, 1]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color="#07100f" transparent opacity={0.72} />
            </mesh>
            <mesh position={[-1.15 + pct * 1.15, -0.1, 0.01]} scale={[2.24 * pct, 0.075, 1]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color={pct > 0.45 ? color : '#ff7a5e'} transparent opacity={0.92} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

export function BossPresence({ enemiesRef }) {
  const ringMesh = useRef();
  const crownMesh = useRef();
  const beamMesh = useRef();
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    euler: new THREE.Euler()
  }), []);

  useFrame(() => {
    const spin = performance.now() * 0.0018;
    if (ringMesh.current) {
      let count = 0;
      for (const boss of enemiesRef.current) {
        if (boss.kind !== 'boss') continue;
        for (let layer = 0; layer < 2; layer += 1) {
          scratch.euler.set(Math.PI / 2, 0, spin * (layer ? -1.5 : 1));
          scratch.quat.setFromEuler(scratch.euler);
          scratch.pos.set(boss.pos.x, boss.pos.y + 0.08 + layer * 0.08, boss.pos.z);
          scratch.matrix.compose(
            scratch.pos,
            scratch.quat,
            scratch.scale.setScalar(2.6 + layer * 0.72 + Math.sin(boss.wobble + layer) * 0.08)
          );
          ringMesh.current.setMatrixAt(count, scratch.matrix);
          count += 1;
        }
      }
      ringMesh.current.count = count;
      ringMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (crownMesh.current) {
      let count = 0;
      for (const boss of enemiesRef.current) {
        if (boss.kind !== 'boss') continue;
        for (let i = 0; i < 7; i += 1) {
          const angle = spin * 1.6 + i * Math.PI * 2 / 7;
          scratch.euler.set(0.28, -angle, 0.1);
          scratch.quat.setFromEuler(scratch.euler);
          scratch.pos.set(
            boss.pos.x + Math.cos(angle) * 1.15,
            boss.pos.y + 2.55 + Math.sin(boss.wobble + i) * 0.08,
            boss.pos.z + Math.sin(angle) * 1.15
          );
          scratch.matrix.compose(
            scratch.pos,
            scratch.quat,
            scratch.scale.set(0.18, 0.46, 0.18)
          );
          crownMesh.current.setMatrixAt(count, scratch.matrix);
          count += 1;
        }
      }
      crownMesh.current.count = count;
      crownMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (beamMesh.current) {
      let count = 0;
      for (const boss of enemiesRef.current) {
        if (boss.kind !== 'boss') continue;
        scratch.quat.identity();
        scratch.pos.set(boss.pos.x, boss.pos.y + 1.65, boss.pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.set(0.22, 3.4 + Math.sin(boss.wobble) * 0.28, 0.22)
        );
        beamMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      beamMesh.current.count = count;
      beamMesh.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={ringMesh} args={[null, null, 8]} frustumCulled={false}>
        <torusGeometry args={[0.78, 0.018, 8, 64]} />
        <meshBasicMaterial color="#ffdf6e" transparent opacity={0.58} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={crownMesh} args={[null, null, 28]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 4]} />
        <meshBasicMaterial color="#ffdf6e" transparent opacity={0.84} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={beamMesh} args={[null, null, 4]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 16, 1, true]} />
        <meshBasicMaterial color="#ffdf6e" transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </>
  );
}
