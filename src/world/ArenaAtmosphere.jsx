import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

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
