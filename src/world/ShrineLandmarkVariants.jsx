import { ART_TOKENS, SHRINE_VISUALS } from '../config/artDirection.js';

function ArmoryLandmark({ castShadow }) {
  return (
    <group>
      {[-1, 1].map(side => (
        <group key={side} position={[side * 1.35, 2.1, 0]} rotation={[0, 0, side * 0.5]}>
          <mesh castShadow={castShadow} scale={[0.28, 3.8, 0.48]}>
            <boxGeometry />
            <meshStandardMaterial color="#6f745f" roughness={0.82} metalness={0.14} />
          </mesh>
          <mesh castShadow={castShadow} position={[0, 2.12, 0]} scale={[0.68, 0.75, 0.62]} rotation={[0, 0, Math.PI / 4]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={ART_TOKENS.wornGold} emissive={ART_TOKENS.wornGold} emissiveIntensity={0.2} roughness={0.48} />
          </mesh>
          <mesh castShadow={castShadow} position={[0, -0.8, 0]} scale={[1.3, 0.2, 0.32]}>
            <boxGeometry />
            <meshStandardMaterial color="#8b7350" roughness={0.75} metalness={0.16} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function VitalLandmark({ castShadow }) {
  return (
    <group>
      <mesh castShadow={castShadow} position={[0, 2, 0]} scale={[0.72, 4, 0.72]}>
        <cylinderGeometry args={[0.72, 1, 1, 7]} />
        <meshStandardMaterial color="#554b38" roughness={0.96} />
      </mesh>
      {[-1, 0, 1].map((side, index) => (
        <mesh
          key={side}
          castShadow={castShadow}
          position={[side * 1.3, 4.15 + (index % 2) * 0.3, side === 0 ? 0 : 0.2]}
          scale={[1.45 - Math.abs(side) * 0.18, 1.15 + (index % 2) * 0.16, 1.35]}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={side === 0 ? '#4c8b60' : '#3b7254'} emissive="#214a36" emissiveIntensity={0.16} roughness={0.9} />
        </mesh>
      ))}
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 2.2, 0.22, 0]} rotation={[0, side * 0.28, side * 0.08]} scale={[2.8, 0.22, 0.42]}>
          <boxGeometry />
          <meshStandardMaterial color="#45634b" roughness={0.98} />
        </mesh>
      ))}
    </group>
  );
}

function PurgeLandmark({ castShadow }) {
  return (
    <group>
      <mesh castShadow={castShadow} position={[0, 1.1, 0]} scale={[1.7, 2.2, 1.7]}>
        <cylinderGeometry args={[0.72, 1, 1, 8]} />
        <meshStandardMaterial color="#5c5748" roughness={0.94} />
      </mesh>
      <mesh castShadow={castShadow} position={[0, 2.45, 0]} scale={[2.25, 0.52, 2.25]}>
        <cylinderGeometry args={[1, 0.7, 1, 8]} />
        <meshStandardMaterial color="#75664a" roughness={0.82} metalness={0.06} />
      </mesh>
      <mesh position={[0, 3.6, 0]} scale={[0.8, 2.25, 0.8]}>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial color="#f4c065" emissive={ART_TOKENS.emberGold} emissiveIntensity={1.7} roughness={0.28} toneMapped={false} />
      </mesh>
      {[-1, 1].map(side => (
        <mesh key={side} castShadow={castShadow} position={[side * 2.25, 1.45, 0]} rotation={[0, 0, side * 0.18]} scale={[0.35, 2.9, 0.5]}>
          <boxGeometry />
          <meshStandardMaterial color="#4b453b" roughness={0.98} />
        </mesh>
      ))}
    </group>
  );
}

function EtchingLandmark({ castShadow }) {
  return (
    <group>
      {[-1, 0, 1].map((side, index) => (
        <group key={side} position={[side * 1.65, 2.2 + (side === 0 ? 0.55 : 0), side === 0 ? 0.2 : 0]} rotation={[side * 0.04, 0, side * 0.07]}>
          <mesh castShadow={castShadow} scale={[1.15, side === 0 ? 5.5 : 4.4, 0.58]}>
            <boxGeometry />
            <meshStandardMaterial color={index === 1 ? '#6e6878' : '#565466'} roughness={0.9} metalness={0.03} />
          </mesh>
          <mesh position={[0, 0.35, 0.62]} rotation={[0, 0, Math.PI / 4]} scale={[0.46, 0.46, 0.16]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={SHRINE_VISUALS.etching.accent} emissive={SHRINE_VISUALS.etching.accent} emissiveIntensity={0.9} roughness={0.28} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const LANDMARK_COMPONENTS = {
  armory: ArmoryLandmark,
  vital: VitalLandmark,
  purge: PurgeLandmark,
  etching: EtchingLandmark
};

export function ShrineLandmarkVariants({ sites, visualQuality = 'balanced' }) {
  const castShadow = visualQuality === 'high';
  return sites.map(site => {
    const Landmark = LANDMARK_COMPONENTS[site.kind];
    return (
      <group key={site.id} position={site.position} rotation={[0, site.rotation, 0]}>
        <Landmark castShadow={castShadow} />
      </group>
    );
  });
}
