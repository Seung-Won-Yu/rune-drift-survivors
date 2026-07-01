import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { ART_TOKENS } from '../config/gameData.js';

export function ArenaAtmosphere() {
  const rings = useRef();

  useFrame(() => {
    if (rings.current) rings.current.rotation.z += 0.0011;
  });

  return (
    <group>
      <mesh ref={rings} position={[0, 6.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[20.8, 21.05, 128]} />
        <meshBasicMaterial color="#f0be54" transparent opacity={0.024} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 7.2, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]}>
        <ringGeometry args={[9.2, 9.42, 96]} />
        <meshBasicMaterial color="#91e184" transparent opacity={0.018} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function RiftSkyMotifs({ visualQuality = 'high' }) {
  const dustRef = useRef();
  const tearRef = useRef();
  const dustGeometry = useMemo(() => {
    const dustCount = visualQuality === 'high' ? 150 : 80;
    const positions = [];
    for (let index = 0; index < dustCount; index += 1) {
      const angle = index * 2.399 + (index % 5) * 0.07;
      const radius = 22 + (index % 44) * 2.05;
      const height = 4.8 + (index % 19) * 0.62 + Math.sin(index * 1.7) * 0.45;
      positions.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }, [visualQuality]);

  const tears = useMemo(() => [
    { x: -58, y: 9.4, z: -44, ry: 0.55, s: 4.4, color: ART_TOKENS.riftViolet },
    { x: 62, y: 8.2, z: 30, ry: -0.82, s: 3.3, color: ART_TOKENS.runeCyan },
    { x: 8, y: 11.5, z: -78, ry: 0.12, s: 3.7, color: ART_TOKENS.wornGold }
  ], []);

  useFrame((_, dt) => {
    if (dustRef.current) dustRef.current.rotation.y += dt * 0.018;
    if (tearRef.current) {
      tearRef.current.rotation.y += dt * 0.055;
      tearRef.current.position.y = Math.sin(performance.now() * 0.0011) * 0.24;
    }
  });

  useEffect(() => () => dustGeometry.dispose(), [dustGeometry]);

  return (
    <group>
      <points ref={dustRef} geometry={dustGeometry} frustumCulled={false}>
        <pointsMaterial color={ART_TOKENS.runeMint} size={visualQuality === 'high' ? 0.22 : 0.18} sizeAttenuation transparent opacity={visualQuality === 'high' ? 0.28 : 0.18} depthWrite={false} toneMapped={false} />
      </points>
      <group ref={tearRef}>
        {tears.map((tear, index) => (
          <group key={`sky-rift-tear-${index}`} position={[tear.x, tear.y, tear.z]} rotation={[0.34, tear.ry, 0.08]}>
            <mesh scale={[tear.s * 0.48, tear.s, tear.s * 0.48]}>
              <ringGeometry args={[0.18, 0.28, 5]} />
              <meshBasicMaterial color={tear.color} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            <pointLight color={tear.color} intensity={0.55} distance={18} />
          </group>
        ))}
      </group>
    </group>
  );
}
