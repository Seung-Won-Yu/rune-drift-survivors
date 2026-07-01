import { useMemo } from 'react';
import { ART_TOKENS } from '../config/gameData.js';
import { ARENA_RADIUS } from '../config/gameTuning.js';
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
    const shrineAngles = visualQuality === 'high' ? [0.72, 2.62, 4.08, 5.45] : [];
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

    const shrines = shrineAngles.map((angle, index) => {
      const radius = 82 + (index % 2) * 7.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        x,
        z,
        y: getTerrainHeight(x, z),
        angle,
        scale: 1.1 + index * 0.08
      };
    });

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

    const shrineBases = shrines.map(shrine => ({
      position: [shrine.x, shrine.y + 0.36 * shrine.scale, shrine.z],
      rotation: [0, -shrine.angle, 0],
      scale: [2.3 * shrine.scale, 0.72 * shrine.scale, 1.35 * shrine.scale],
      color: '#838c6c'
    }));

    const shrinePillars = shrines.flatMap(shrine => ([-1, 1].map(side => {
      const localX = side * 1.15 * shrine.scale;
      const cos = Math.cos(-shrine.angle);
      const sin = Math.sin(-shrine.angle);
      return {
        position: [
          shrine.x + localX * cos,
          shrine.y + 1.32 * shrine.scale,
          shrine.z - localX * sin
        ],
        rotation: [0, -shrine.angle, 0],
        scale: [0.48 * shrine.scale, 2.25 * shrine.scale, 0.48 * shrine.scale],
        color: '#939975'
      };
    })));

    const shrineCaps = shrines.map(shrine => ({
      position: [shrine.x, shrine.y + 2.55 * shrine.scale, shrine.z],
      rotation: [0, -shrine.angle, 0],
      scale: [1.95 * shrine.scale, 0.34 * shrine.scale, 0.58 * shrine.scale],
      color: '#aaa071'
    }));

    const shrineRunes = shrines.map((shrine, index) => {
      const localZ = -0.7 * shrine.scale;
      const cos = Math.cos(-shrine.angle);
      const sin = Math.sin(-shrine.angle);
      return {
        position: [
          shrine.x + localZ * sin,
          shrine.y + 0.83 * shrine.scale,
          shrine.z + localZ * cos
        ],
        rotation: -shrine.angle,
        scale: [1.1 * shrine.scale, 1.1 * shrine.scale, 1],
        color: index % 2 ? '#9fc574' : ART_TOKENS.wornGold
      };
    });

    return {
      brokenSlabs,
      obeliskColumns,
      obeliskCrystals,
      obeliskRings,
      shrineBases,
      shrinePillars,
      shrineCaps,
      shrineRunes
    };
  }, [visualQuality]);

  return (
    <group>
      <group position={[0, getTerrainHeight(0, 0), 0]}>
        <mesh receiveShadow castShadow={visualQuality === 'high'} position={[0, 0.18, 0]} scale={[8.8, 0.34, 8.8]}>
          <cylinderGeometry args={[1, 1, 1, 8]} />
          <meshStandardMaterial color="#7d8b62" roughness={0.96} />
        </mesh>
        <mesh receiveShadow position={[0, 0.39, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]} scale={[6.2, 6.2, 1]}>
          <ringGeometry args={[0.74, 0.82, 8]} />
          <meshBasicMaterial color={ART_TOKENS.wornGold} transparent opacity={0.24} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh castShadow={visualQuality === 'high'} position={[0, 0.92, 0]} rotation={[0.4, 0.22, 0.16]} scale={[0.8, 1.3, 0.8]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={ART_TOKENS.wornGold} emissive={ART_TOKENS.runeMint} emissiveIntensity={0.72} roughness={0.36} toneMapped={false} />
        </mesh>
        {visualQuality === 'high' && <pointLight position={[0, 1.7, 0]} color={ART_TOKENS.wornGold} intensity={1.35} distance={12} />}
      </group>
      <RelicBoxInstances transforms={relics.brokenSlabs} roughness={0.97} />
      <RelicBoxInstances transforms={relics.obeliskColumns} roughness={0.94} />
      <RelicOctahedronInstances transforms={relics.obeliskCrystals} opacity={0.42} />
      <GroundDecalInstances transforms={relics.obeliskRings} shape="ring" ringArgs={[0.56, 0.66, 24]} opacity={0.14} />
      <RelicBoxInstances transforms={relics.shrineBases} roughness={0.98} />
      <RelicBoxInstances transforms={relics.shrinePillars} roughness={0.96} />
      <RelicBoxInstances transforms={relics.shrineCaps} roughness={0.94} />
      <GroundDecalInstances transforms={relics.shrineRunes} shape="ring" ringArgs={[0.3, 0.38, 4]} opacity={0.18} doubleSide />
    </group>
  );
}

export function TerrainStoryDetails() {
  const details = useMemo(() => {
    const riftThreads = Array.from({ length: 16 }, (_, index) => {
      const angle = index * Math.PI * 2 / 16 + (index % 3) * 0.08;
      const radius = 17 + (index % 5) * 7.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.062, z],
        rotation: -angle + Math.PI / 2 + Math.sin(index * 1.7) * 0.18,
        scale: [5.4 + (index % 4) * 1.25, 0.18 + (index % 3) * 0.04, 1],
        color: index % 4 === 0 ? '#d2aa60' : index % 2 ? '#8ea362' : '#78965f',
        opacity: index % 4 === 0 ? 0.055 : 0.07
      };
    });

    const floorChips = Array.from({ length: 44 }, (_, index) => {
      const angle = index * 1.84 + (index % 5) * 0.12;
      const radius = 18 + (index % 18) * 3.45;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const frontLane = z < -22 && Math.abs(x) < 38;
      return {
        skip: frontLane || radius > ARENA_RADIUS - 10,
        position: [x, getTerrainHeight(x, z) + 0.07, z],
        rotation: -angle + (index % 7) * 0.19,
        scale: [1.15 + (index % 4) * 0.42, 0.34 + (index % 3) * 0.1, 1],
        color: index % 2 ? '#74765e' : '#53664a',
        opacity: 0.16 + (index % 3) * 0.024
      };
    }).filter(item => !item.skip);

    const oldPlazas = [0.52, 2.1, 3.74, 5.18].map((angle, index) => {
      const radius = 48 + (index % 2) * 6.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.054, z],
        rotation: -angle + Math.PI / 2,
        scale: [8.2 + index * 0.9, 2.7 + (index % 2) * 0.5, 1],
        color: index % 2 ? '#7c7754' : '#617047',
        opacity: 0.105
      };
    });

    return { riftThreads, floorChips, oldPlazas };
  }, []);

  return (
    <group>
      <GroundDecalInstances transforms={details.oldPlazas} shape="circle" segments={64} opacity={0.105} />
      <GroundDecalInstances transforms={details.riftThreads} shape="plane" opacity={0.066} />
      <GroundDecalInstances transforms={details.floorChips} shape="ring" ringArgs={[0.42, 0.52, 4]} opacity={0.18} doubleSide />
    </group>
  );
}
