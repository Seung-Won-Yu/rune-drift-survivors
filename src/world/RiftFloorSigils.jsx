import { useMemo } from 'react';
import { getTerrainHeight } from '../systems/terrain.js';

export function RiftFloorSigils() {
  const scars = useMemo(() => [
    { x: -38, z: -18, angle: 0.35, length: 34, width: 1.18, color: '#8fab66', opacity: 0.055 },
    { x: 30, z: 28, angle: -0.55, length: 30, width: 1.0, color: '#b09762', opacity: 0.052 },
    { x: 6, z: -48, angle: 1.08, length: 36, width: 0.92, color: '#d0a95f', opacity: 0.048 },
    { x: -64, z: 44, angle: -0.18, length: 26, width: 0.82, color: '#83af70', opacity: 0.045 },
    { x: 66, z: -34, angle: 0.85, length: 24, width: 0.82, color: '#9aa96e', opacity: 0.048 }
  ], []);

  const runes = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const angle = index * Math.PI * 2 / 14 + (index % 2) * 0.11;
    const radius = 31 + (index % 4) * 7.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return {
      x,
      z,
      angle,
      color: index % 3 === 0 ? '#d8b260' : index % 3 === 1 ? '#8fb86f' : '#9d9966',
      scale: 0.82 + (index % 3) * 0.14
    };
  }), []);

  return (
    <group>
      {scars.map((scar, index) => (
        <group key={`rift-floor-scar-${index}`} position={[scar.x, getTerrainHeight(scar.x, scar.z) + 0.085, scar.z]} rotation={[-Math.PI / 2, 0, scar.angle]}>
          <mesh scale={[scar.length, scar.width, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={scar.color} transparent opacity={scar.opacity} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh scale={[scar.length * 0.38, scar.width * 2.4, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={scar.color} transparent opacity={scar.opacity * 0.32} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {runes.map((rune, index) => (
        <mesh
          key={`field-rune-glyph-${index}`}
          position={[rune.x, getTerrainHeight(rune.x, rune.z) + 0.095, rune.z]}
          rotation={[-Math.PI / 2, 0, -rune.angle + Math.PI / 4]}
          scale={[rune.scale, rune.scale, 1]}
        >
          <ringGeometry args={[0.34, 0.42, 4]} />
          <meshBasicMaterial color={rune.color} transparent opacity={0.075} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
