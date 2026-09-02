import { useMemo } from 'react';
import { ART_TOKENS } from '../config/gameData.js';
import { getTerrainHeight } from '../systems/terrain.js';
import {
  GroundDecalInstances,
  RelicBoxInstances,
  RelicOctahedronInstances
} from './InstancedGeometry.jsx';

export function RuneRelicLandmarks({ visualQuality = 'high' }) {
  const relics = useMemo(() => {
    const obeliskCount = visualQuality === 'high' ? 9 : 0;
    const brokenRingCount = visualQuality === 'high' ? 18 : 0;
    const obelisks = Array.from({ length: obeliskCount }, (_, index) => {
      const angle = index * Math.PI * 2 / Math.max(1, obeliskCount) + 0.22;
      const radius = 58 + (index % 3) * 8.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        x,
        z,
        y: getTerrainHeight(x, z),
        angle,
        height: 3.6 + (index % 4) * 0.58,
        lean: (index % 2 ? -1 : 1) * (0.08 + (index % 3) * 0.025),
        color: index % 2 ? '#89926f' : '#a49a6f'
      };
    });

    const brokenRing = Array.from({ length: brokenRingCount }, (_, index) => {
      const angle = index * Math.PI * 2 / Math.max(1, brokenRingCount) + (index % 3) * 0.025;
      const radius = 24 + (index % 2) * 1.4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        x,
        z,
        y: getTerrainHeight(x, z),
        angle,
        long: 2.8 + (index % 4) * 0.34,
        thick: 0.45 + (index % 3) * 0.08,
        skip: index === 4 || index === 12
      };
    }).filter(part => !part.skip);

    const brokenSlabs = brokenRing.map((part, index) => ({
      position: [part.x, part.y + 0.12, part.z],
      rotation: [0.03, -part.angle + Math.PI / 2, index % 2 ? 0.06 : -0.04],
      scale: [part.long, 0.26, part.thick],
      color: index % 2 ? '#8f946f' : '#787f65'
    }));

    const obeliskColumns = obelisks.map(obelisk => ({
      position: [obelisk.x, obelisk.y + obelisk.height * 0.48, obelisk.z],
      rotation: [obelisk.lean, -obelisk.angle + Math.PI / 2, obelisk.lean * 0.6],
      scale: [0.82, obelisk.height, 0.62],
      color: obelisk.color
    }));

    const obeliskCrystals = obelisks.map((obelisk, index) => ({
      position: [obelisk.x, obelisk.y + obelisk.height + 0.18, obelisk.z],
      rotation: [0.28 + obelisk.lean, -obelisk.angle + Math.PI / 2 + 0.8, 0.2 + obelisk.lean * 0.6],
      scale: [0.34, 0.7, 0.34],
      color: index % 3 === 0 ? ART_TOKENS.wornGold : '#9fc574'
    }));

    const obeliskRings = obelisks.map((obelisk, index) => ({
      position: [obelisk.x, obelisk.y + 0.08, obelisk.z],
      rotation: 0,
      scale: [1.55, 1.55, 1],
      color: index % 3 === 0 ? ART_TOKENS.wornGold : '#91b66f'
    }));

    return {
      brokenSlabs,
      obeliskColumns,
      obeliskCrystals,
      obeliskRings
    };
  }, [visualQuality]);
  const centerY = getTerrainHeight(0, 0);

  return (
    <group>
      <group position={[0, centerY, 0]}>
        <mesh receiveShadow castShadow={visualQuality === 'high'} position={[0, 0.11, 0]} scale={[9.25, 0.22, 9.25]}>
          <cylinderGeometry args={[1, 1, 1, 8]} />
          <meshStandardMaterial color="#263a32" roughness={0.99} metalness={0.01} />
        </mesh>
        <mesh receiveShadow castShadow={visualQuality === 'high'} position={[0, 0.27, 0]} scale={[8.65, 0.16, 8.65]}>
          <cylinderGeometry args={[1, 1, 1, 8]} />
          <meshStandardMaterial color="#4c5b4c" roughness={0.97} metalness={0.01} />
        </mesh>
        <mesh receiveShadow position={[0, 0.38, 0]} scale={[6.4, 0.08, 6.4]}>
          <cylinderGeometry args={[1, 1, 1, 8]} />
          <meshStandardMaterial color="#344b40" roughness={0.94} metalness={0.01} />
        </mesh>
        <mesh position={[0, 0.43, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]} scale={[6.4, 6.4, 1]}>
          <ringGeometry args={[0.76, 0.81, 8]} />
          <meshBasicMaterial color={ART_TOKENS.wornGold} transparent opacity={0.16} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.44, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[3.6, 3.6, 1]}>
          <ringGeometry args={[0.74, 0.79, 8]} />
          <meshBasicMaterial color={ART_TOKENS.runeMint} transparent opacity={0.08} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh castShadow={visualQuality === 'high'} position={[0, 0.86, 0]} rotation={[0.4, 0.22, 0.16]} scale={[0.66, 1.02, 0.66]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#8a7546" emissive={ART_TOKENS.runeMint} emissiveIntensity={0.48} roughness={0.44} toneMapped={false} />
        </mesh>
        {visualQuality === 'high' && <pointLight position={[0, 1.5, 0]} color={ART_TOKENS.wornGold} intensity={0.72} distance={10} />}
      </group>
      <RelicBoxInstances transforms={relics.brokenSlabs} roughness={0.97} />
      <RelicBoxInstances transforms={relics.obeliskColumns} roughness={0.94} />
      <RelicOctahedronInstances transforms={relics.obeliskCrystals} opacity={0.42} />
      <GroundDecalInstances transforms={relics.obeliskRings} shape="ring" ringArgs={[0.56, 0.66, 24]} opacity={0.14} />
    </group>
  );
}
